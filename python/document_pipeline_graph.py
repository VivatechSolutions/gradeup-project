"""
document_pipeline_graph.py
━━━━━━━━━━━━━━━━━━━━━━━━━━
Complete end-to-end agentic extraction pipeline built on LangGraph.

Pipeline stages:
  0a: ocr_extraction_node      — Mistral OCR + watermark clean + quality guard
  0b: vision_pass_node         — GPT-4o Vision: text-box detect + bad-page re-OCR
  1:  structure_discovery_node — TOC parse + unit boundaries + section type discovery
  2:  extract_unit_node × N    — Semantic chunk + LLM extract (parallel fan-out)
  3:  verification_node        — Convergence loop: score ≥ 95%, max 3 passes
  4:  enrich_unit_node × N     — Six-phase avatar lesson per SECTION, with pictures
                                and narration (parallel fan-out; same build as
                                /avatar/lesson/section)
  5:  debate_unit_node × N     — Debate topic generation (parallel fan-out)
  6:  final_publish_node       — Save JSON artifacts + upload to S3 + Qdrant

Entry point:
    run_document_pipeline(pdf_path, board, class_number, subject, ...)
"""

from __future__ import annotations

import operator
import os
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any, Dict, List, Optional

try:
    import orjson as _orjson
    def _dumps(obj) -> bytes:
        return _orjson.dumps(obj, option=_orjson.OPT_INDENT_2)
except ImportError:
    def _dumps(obj) -> bytes:
        return json.dumps(obj, indent=2, ensure_ascii=False).encode()

from typing_extensions import TypedDict
from langgraph.graph import END, StateGraph
from langgraph.types import Send

from class_utils import normalize_class_number
from config import OUTPUTS_DIR
from langfuse_utils import (
    observation as _lf_observation,
    trace_context as _lf_trace_context,
    update_observation as _lf_update_observation,
    flush_safely as _lf_flush,
)
from logger import get_logger

logger = get_logger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# State reducers
# ══════════════════════════════════════════════════════════════════════════════

def _merge_structured(a: Dict, b: Dict) -> Dict:
    """
    Merge two {units: [...]} or {chapters: [...]} dicts.
    Units are keyed by unit_number / chapter_number; b wins on conflict.
    """
    if not a:
        return b or {}
    if not b:
        return a
    # detect key
    key = "chapters" if ("chapters" in b or "chapters" in a) else "units"
    num_key = "chapter_number" if key == "chapters" else "unit_number"
    existing = {
        u.get(num_key) or u.get("unit_number") or u.get("chapter_number"): u
        for u in a.get(key, [])
    }
    for u in b.get(key, []):
        k = u.get(num_key) or u.get("unit_number") or u.get("chapter_number")
        existing[k] = u
    return {key: sorted(existing.values(), key=lambda u: u.get(num_key, 0))}


def _merge_dicts(a: Dict, b: Dict) -> Dict:
    return {**a, **b}


# ══════════════════════════════════════════════════════════════════════════════
# Shared State
# ══════════════════════════════════════════════════════════════════════════════

class DocumentPipelineState(TypedDict):
    # ── Pipeline identity ──────────────────────────────────────────────────
    doc_id:           str
    pdf_path:         str
    board:            str
    class_number:     str
    subject:          Optional[str]
    api_key:          str
    mistral_key:      str
    part:             Optional[str]
    term:             Optional[str]
    enrichment_style: str
    skip_enrichment:  bool
    skip_debate:      bool
    skip_qdrant:      bool

    # ── Stage 0a: Mistral OCR ──────────────────────────────────────────────
    raw_ocr_response:    Dict[str, Any]
    raw_markdown:        str
    content_md:          str
    page_list:           List[Dict]
    page_quality_report: Dict[str, Any]

    # ── Stage 0b: Vision Pass ──────────────────────────────────────────────
    image_metadata:           Dict[str, Dict]
    vision_replacement_count: int
    vision_pass_report:       Dict[str, Any]

    # ── Stage 1: Structure Discovery ──────────────────────────────────────
    toc_units:        List[Dict]
    unit_boundaries:  Dict[int, Dict]
    discovered_types: List[Dict]

    # ── Stage 2: Extraction (fan-out results) ─────────────────────────────
    structured_data:    Annotated[Dict[str, Any], _merge_structured]
    extraction_reports: Annotated[List[Dict], operator.add]

    # ── Stage 3: Verification (sub-graph) ────────────────────────────────
    unit_reports:        Annotated[List[Dict], operator.add]
    overall_score:       float
    schema_report:       Optional[Dict]
    fixes_made:          Annotated[int, operator.add]
    pass_number:         int
    verification_passed: bool
    rejection_reason:    str   # why the gate refused to store; "" when it passed

    # ── Stage 4: Enrichment (fan-out results) ────────────────────────────
    enriched_data:      Annotated[Dict[str, Any], _merge_structured]
    enrichment_reports: Annotated[List[Dict], operator.add]
    tts_audio_s3_urls:  Annotated[Dict[str, str], _merge_dicts]

    # ── Stage 5: Debate Topics (fan-out results) ─────────────────────────
    debate_unit_results: Annotated[List[Dict], operator.add]
    debate_topics:       Dict[str, Any]

    # ── Stage 6: Final Publish ────────────────────────────────────────────
    s3_artifact_urls: Dict[str, str]
    qdrant_uploaded:  bool
    is_complete:      bool
    final_report:     Dict[str, Any]
    pipeline_errors:  Annotated[List[str], operator.add]


# ══════════════════════════════════════════════════════════════════════════════
# Node imports (lazy, per-node)
# ══════════════════════════════════════════════════════════════════════════════

def ocr_extraction_node(state: DocumentPipelineState) -> Dict[str, Any]:
    from agents.ocr_extraction_agent import ocr_extraction_node as _node
    return _node(state)


def vision_pass_node(state: DocumentPipelineState) -> Dict[str, Any]:
    from agents.vision_pass_agent import vision_pass_node as _node
    return _node(state)


def structure_discovery_node(state: DocumentPipelineState) -> Dict[str, Any]:
    from agents.structure_discovery_agent import structure_discovery_node as _node
    return _node(state)


def extract_unit_node(state: DocumentPipelineState) -> Dict[str, Any]:
    from agents.extraction_agent import extract_unit_node as _node
    return _node(state)


def enrich_unit_node(state: DocumentPipelineState) -> Dict[str, Any]:
    from agents.enrichment_agent import enrich_unit_node as _node
    return _node(state)


def debate_unit_node(state: DocumentPipelineState) -> Dict[str, Any]:
    from agents.debate_agent import debate_unit_node as _node
    return _node(state)


# ══════════════════════════════════════════════════════════════════════════════
# Stage 3: Verification node (embeds existing sub-graph)
# ══════════════════════════════════════════════════════════════════════════════

def verification_node(state: DocumentPipelineState) -> Dict[str, Any]:
    """
    Runs the existing extraction_verification_graph as a function call.
    Maps parent state fields → sub-graph inputs → reads outputs back.
    """
    logger.info("Stage 3: Verification Loop")

    doc_id         = state["doc_id"]
    structured_data = state.get("structured_data", {})
    content_md     = state.get("content_md", "")
    subject        = state.get("subject", "unknown")
    api_key        = state.get("api_key", "")

    if not structured_data or not content_md:
        logger.warning("No structured data — skipping verification")
        return {
            "verification_passed": False,
            "rejection_reason":    "the extraction produced no content",
            "overall_score":       0.0,
            "pass_number":         0,
            "fixes_made":          0,
        }

    # Save structured.json so sub-graph can read it. What was there before is
    # the last extraction that PASSED the gate; it is kept so a rejected re-run
    # puts it back rather than leaving this unverified copy on disk (and
    # has_structured reading true for a document the audit just refused).
    doc_dir = OUTPUTS_DIR / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    structured_path = doc_dir / "structured.json"
    content_path    = doc_dir / "content.md"
    previous_good   = structured_path.read_bytes() if structured_path.exists() else None

    structured_path.write_bytes(_dumps(structured_data))
    content_path.write_text(content_md, encoding="utf-8")

    try:
        from extraction_verification_graph import run_verification_graph
        report = run_verification_graph(
            doc_id=doc_id,
            structured_json_path=structured_path,
            content_md_path=content_path,
            subject=subject,
            api_key=api_key,
            # What the upload declared this document to be. The audit compares
            # the unit fields against it, so a `part` or `subject` the model
            # invented is a failure rather than something Qdrant files under.
            declared={
                "subject": subject,
                "part":    state.get("part"),
                "term":    state.get("term"),
            },
        )
    except Exception as e:
        # A crash here used to surface as one line with no traceback, so the
        # real cause (a dict where a string was required) was invisible and the
        # document was rejected for reasons nobody could see.
        logger.error(
            f"Verification graph CRASHED ({type(e).__name__}: {e}) — the audit "
            f"never ran, so this document cannot be verified or stored.",
            exc_info=True,
        )
        report = {}

    # Re-load potentially corrected structured.json
    try:
        corrected = json.loads(structured_path.read_text(encoding="utf-8"))
    except Exception:
        corrected = structured_data

    # Final, idempotent section-hierarchy normalization: the verification
    # sub-graph can re-attach a numbered section's children as a flat sub_items
    # list ({"number": "1.4.1", ...}) rather than nested sections. Re-promote
    # them so structured/enriched/debate all consume the proper nested shape.
    try:
        from auto_schema_extractor import normalize_section_hierarchy
        corrected = normalize_section_hierarchy(corrected, content_md)
    except Exception as e:
        logger.warning(f"Section-hierarchy normalization skipped: {e}")

    # The score alone is not the verdict. The verification graph refuses to
    # converge while the schema report still lists CRITICAL failures, and it
    # says so in is_complete — a run can log "FINAL STATUS: PARTIAL" with 49
    # sections missing and still score 96. Recomputing passed from the score
    # alone threw that verdict away and wrote success:true over it.
    # The audit inside the verification graph is the authority now: it decides
    # whether structured.json was stored at all. A document it rejected must not
    # be enriched, turned into debate topics, or indexed — that was how partial
    # extractions reached Qdrant and the avatar in the first place.
    score     = report.get("overall_score", 0.0)
    converged = bool(report.get("is_complete", False))
    stored    = bool(report.get("stored", converged))
    audit     = report.get("audit") or {}
    passed    = converged and stored

    reason = ""
    if passed:
        logger.info(f"Verification: PASSED audit (score {score:.1f}%) — stored")
    else:
        # Carried to the API response, so a rejection says why instead of
        # reading as a completed upload.
        counts = audit.get("failures_by_kind") or {}
        if not report:
            reason = "the verification step crashed, so the audit never ran"
        elif audit and not audit.get("passed"):
            reason = "audit failed: " + ", ".join(f"{k}×{v}" for k, v in sorted(counts.items()))
        else:
            reason = ("the schema validator failed the document "
                      "(see schema_integrity_report.json)")
        logger.error(
            f"Verification: REJECTED — {counts or 'quality gate failed'} "
            f"(score {score:.1f}%). structured.json was NOT stored; enrichment, "
            f"debate generation and Qdrant indexing are skipped for this document. "
            f"See audit_report.json"
        )
        # The unverified copy written above must not outlive the rejection.
        try:
            if previous_good is not None:
                structured_path.write_bytes(previous_good)
                logger.info("Restored the previously verified structured.json — the rejected "
                            "extraction is in structured.rejected.json")
            elif structured_path.exists():
                structured_path.unlink()
                logger.info("Removed the unverified structured.json — this document has no "
                            "stored extraction (see structured.rejected.json)")
        except OSError as e:
            logger.warning(f"Could not tidy structured.json after the rejection: {e}")

    return {
        "structured_data":    corrected,
        "unit_reports":       report.get("unit_reports", []),
        "overall_score":      score,
        "schema_report":      report.get("schema_report"),
        "fixes_made":         report.get("fixes_made", 0),
        "pass_number":        report.get("passes_run", 1),
        "verification_passed": passed,
        "rejection_reason":   reason,
    }


# ══════════════════════════════════════════════════════════════════════════════
# Stage 6: Final Publish
# ══════════════════════════════════════════════════════════════════════════════

def final_publish_node(state: DocumentPipelineState) -> Dict[str, Any]:
    """
    Saves all artifacts to disk and uploads JSON artifacts to S3.
    Optionally uploads to Qdrant.
    """
    logger.info("Stage 6: Final Publish")

    doc_id      = state["doc_id"]
    subject     = state.get("subject", "unknown")
    doc_dir     = OUTPUTS_DIR / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)

    structured_data  = state.get("structured_data", {})
    enriched_data    = state.get("enriched_data", {})
    debate_results   = state.get("debate_unit_results", [])
    skip_qdrant      = state.get("skip_qdrant", True)

    # ── Save structured.json ──────────────────────────────────────────────
    # {"units": []} is truthy, so a run that extracted nothing used to still
    # write a 17-byte file — and every has_structured check keys off the file
    # merely existing, so a total failure reported as a successful extraction.
    structured_path = doc_dir / "structured.json"
    _has_content = bool(
        structured_data
        and (structured_data.get("units") or structured_data.get("chapters"))
    )
    # The audit is the gate. Stage 6 used to write structured.json regardless,
    # which quietly undid the rejection: the log said "NOT stored" and then
    # saved 212,813 bytes of rejected extraction one line later.
    _verified = bool(state.get("verification_passed", False))
    if _has_content and _verified:
        structured_path.write_bytes(_dumps(structured_data))
        logger.info(f"Saved structured.json ({structured_path.stat().st_size:,} bytes)")
    elif _has_content:
        # The verification gate has already quarantined the document it
        # rejected. On a rejection the graph does not write structured.json, so
        # what THIS node holds is the pre-verification copy re-read from disk —
        # overwriting the gate's file with it replaced the evidence with a
        # version that passes the audit, and a rejection could not be diagnosed
        # from its own artifacts.
        rejected_path = doc_dir / "structured.rejected.json"
        if rejected_path.exists():
            logger.error(
                f"structured.json NOT written — the extraction did not pass the "
                f"audit. The rejected document is in {rejected_path.name} "
                f"({rejected_path.stat().st_size:,} bytes, written by the gate); "
                f"see audit_report.json for the failing sections."
            )
        else:
            rejected_path.write_bytes(_dumps(structured_data))
            logger.error(
                f"structured.json NOT written — the extraction did not pass the audit. "
                f"Rejected copy saved to {rejected_path.name} "
                f"({rejected_path.stat().st_size:,} bytes); see audit_report.json for the "
                f"failing sections."
            )
    elif structured_data:
        logger.error(
            "Not writing structured.json — extraction produced zero units"
        )

    # ── Save enriched.json ────────────────────────────────────────────────
    # The same shape /avatar/lesson/build writes: the document's identity on
    # top, then the units whose sections carry their avatar_lesson. The
    # enrichment nodes checkpointed each finished section into this file as
    # they went; this is the complete, merged copy.
    enriched_path = doc_dir / "enriched.json"
    if enriched_data:
        units_key = "chapters" if "chapters" in enriched_data else "units"
        lesson_model = ""
        try:
            from avatar_lesson_builder import _lesson_model
            lesson_model = _lesson_model()
        except Exception:  # noqa: BLE001
            pass
        enriched_doc = {
            "document_id":      doc_id,
            "enriched_at":      datetime.now(timezone.utc).isoformat(),
            "enrichment_model": lesson_model,
            "enrichment_style": state.get("enrichment_style", "avatar_classroom_teaching"),
            "subject":          subject,
            "board":            state.get("board"),
            "class_number":     state.get("class_number"),
            units_key:          enriched_data.get(units_key, []),
        }
        enriched_path.write_bytes(_dumps(enriched_doc))
        n_lessons = sum(
            1 for u in enriched_doc[units_key] for sec in (u.get("sections") or [])
            if ((sec.get("enrichment") or sec.get("section_enrichment") or {}).get("avatar_lesson"))
        )
        logger.info(f"Saved enriched.json ({enriched_path.stat().st_size:,} bytes, "
                    f"{n_lessons} section lesson(s))")

    # ── Assemble + save debate_topics.json ────────────────────────────────
    debate_result: Dict[str, Any] = {}
    if debate_results:
        total_topics = sum(
            len(s.get("debate_topics", []))
            for u in debate_results
            for s in u.get("sections", [])
        )
        debate_result = {
            "success":      True,
            "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "subject":      subject,
            "total_topics": total_topics,
            "total_sections": sum(len(u.get("sections", [])) for u in debate_results),
            "units":        debate_results,
        }
        (doc_dir / "debate_topics.json").write_bytes(_dumps(debate_result))
        logger.info(f"Saved debate_topics.json ({total_topics} topics)")

    # ── Build pipeline report ─────────────────────────────────────────────
    pipeline_report = {
        "doc_id":   doc_id,
        "subject":  subject,
        "board":    state.get("board"),
        "class":    state.get("class_number"),
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "vision": {
            "text_boxes_replaced": state.get("vision_replacement_count", 0),
            "report":              state.get("vision_pass_report", {}),
        },
        "structure": {
            "toc_units":       len(state.get("toc_units", [])),
            "discovered_types": [d["type"] for d in state.get("discovered_types", [])],
        },
        "extraction": {
            "units_extracted": len(state.get("extraction_reports", [])),
            "reports":         state.get("extraction_reports", []),
        },
        "verification": {
            "passes_run":    state.get("pass_number", 0),
            "overall_score": state.get("overall_score", 0),
            "fixes_made":    state.get("fixes_made", 0),
            "passed":        _verified,
            "rejection_reason": "" if _verified else (
                state.get("rejection_reason") or "the extraction did not pass the audit"),
        },
        "enrichment": {
            "units_enriched":    len(state.get("enrichment_reports", [])),
            # Lessons actually built, so the caller can tell "enrichment ran on
            # one unit" from "one unit has lessons".
            "sections_enriched": sum(int(r.get("sections_enriched") or 0)
                                     for r in state.get("enrichment_reports", []) if isinstance(r, dict)),
            "sections_failed":   [t for r in state.get("enrichment_reports", []) if isinstance(r, dict)
                                  for t in (r.get("sections_failed") or [])],
            "audio_files":       len(state.get("tts_audio_s3_urls", {})),
            "reports":           state.get("enrichment_reports", []),
        },
        "debate": {
            "units":        len(debate_results),
            "total_topics": debate_result.get("total_topics", 0),
        },
        "errors": state.get("pipeline_errors", []),
        # Authoritative machine-readable verdict for callers: a run that
        # errored, produced no units, or was REJECTED by the audit gate is NOT
        # a success, whatever the score. The gate used to be left out, so a
        # rejected document (nothing stored, enriched or indexed) answered
        # success=true / units_published=1 and the dashboard showed "completed".
        "units_published": len(
            (structured_data or {}).get("units")
            or (structured_data or {}).get("chapters")
            or []
        ) if _verified else 0,
        "success": bool(_has_content) and _verified and not state.get("pipeline_errors"),
    }
    (doc_dir / "pipeline_report.json").write_bytes(_dumps(pipeline_report))
    logger.info("Saved pipeline_report.json")

    # ── Optional Qdrant upload ─────────────────────────────────────────────
    qdrant_uploaded = False
    qdrant_errors: List[str] = []
    if not skip_qdrant and not state.get("verification_passed", False):
        logger.error(
            "Qdrant upload skipped — the extraction did not pass the audit. "
            "Indexing a rejected extraction is how partial content reached RAG."
        )
    elif not skip_qdrant and structured_path.exists():
        try:
            from pipeline import get_pipeline
            pip = get_pipeline()
            result = pip.upload_to_qdrant(
                document_id=doc_id,
                board=state.get("board", ""),
                class_number=state.get("class_number", ""),
                term=state.get("term"),
                # The graph does its own extraction and does not stamp units, so
                # without these the chunks come out with subject/part = None.
                subject=state.get("subject"),
                part=state.get("part"),
            )
            # upload_to_qdrant reports failure in its return value, not by
            # raising: an embedding quota error or a rejected batch comes back
            # as success=False. Ignoring it printed "upload complete" over a
            # document whose chunks never reached the collection.
            qdrant_uploaded = bool(result and result.get("success"))
            if qdrant_uploaded:
                logger.info("Qdrant upload complete")
            else:
                reason = (result or {}).get("error") or "see the Qdrant errors above"
                logger.error(
                    f"Qdrant upload FAILED for {doc_id} — the document is not "
                    f"searchable: {reason}"
                )
                qdrant_errors.append(f"qdrant_upload_failed: {reason}")
        except Exception as e:
            logger.error(f"Qdrant upload failed for {doc_id}: {type(e).__name__}: {e}")
            qdrant_errors.append(f"qdrant_upload_failed: {type(e).__name__}: {e}")

    logger.info(f"Stage 6 complete — all artifacts saved to {doc_dir}")

    return {
        "debate_topics":   debate_result,
        "qdrant_uploaded": qdrant_uploaded,
        "is_complete":     True,
        "final_report":    pipeline_report,
        # pipeline_errors is an accumulating channel, so the node returns its
        # own errors rather than mutating the shared list in place.
        "pipeline_errors": qdrant_errors,
    }


# ══════════════════════════════════════════════════════════════════════════════
# Fan-out functions (conditional edges → List[Send])
# ══════════════════════════════════════════════════════════════════════════════

def fan_out_extraction(state: DocumentPipelineState) -> List[Send]:
    """Fire one extract_unit_node per TOC unit (all run in parallel)."""
    toc_units = state.get("toc_units", [])
    if not toc_units:
        # Nothing to extract — skip to verification
        return [Send("verification", state)]
    logger.info(f"Fan-out extraction: {len(toc_units)} unit(s) in parallel")
    return [Send("extract_unit", {**state, "target_unit": u}) for u in toc_units]


def fan_out_enrichment(state: DocumentPipelineState) -> List[Send]:
    """Fire one enrich_unit_node per unit (all run in parallel)."""
    if state.get("skip_enrichment"):
        logger.info("Enrichment skipped")
        return [Send("fan_out_debate_collector", state)]

    # A document the audit rejected has sections missing, empty or duplicated.
    # Enriching it spends model budget on text that will not be stored.
    if not state.get("verification_passed", False):
        logger.error("Enrichment skipped — the extraction did not pass the audit")
        return [Send("fan_out_debate_collector", state)]

    data     = state.get("structured_data", {})
    key      = "chapters" if "chapters" in data else "units"
    units    = data.get(key, [])

    if not units:
        return [Send("fan_out_debate_collector", state)]

    # A fresh upload is a fresh build. The enrichment nodes checkpoint every
    # finished section into enriched.json as they go, so a copy left by an
    # earlier run of this document has to go first or its stale sections
    # would be merged in with the new ones.
    stale = OUTPUTS_DIR / state["doc_id"] / "enriched.json"
    if stale.exists():
        try:
            stale.unlink()
            logger.info(f"Removed the previous enriched.json for {state['doc_id']} — rebuilding every lesson")
        except OSError as e:
            logger.warning(f"Could not remove the previous enriched.json ({e}) — its sections will be replaced one by one")

    logger.info(f"Fan-out enrichment: {len(units)} unit(s) in parallel — six-phase avatar "
                f"lesson per section, with pictures and narration")
    return [Send("enrich_unit", {**state, "target_unit": u}) for u in units]


def fan_out_debate(state: DocumentPipelineState) -> List[Send]:
    """Fire one debate_unit_node per unit (all run in parallel)."""
    if state.get("skip_debate"):
        logger.info("Debate topics skipped")
        return [Send("debate_collector", state)]

    if not state.get("verification_passed", False):
        logger.error("Debate topics skipped — the extraction did not pass the audit")
        return [Send("debate_collector", state)]

    # Use enriched_data if available, else structured_data
    data  = state.get("enriched_data") or state.get("structured_data", {})
    key   = "chapters" if "chapters" in data else "units"
    units = data.get(key, [])

    if not units:
        return [Send("debate_collector", state)]

    logger.info(f"Fan-out debate: {len(units)} unit(s) in parallel")
    return [Send("debate_unit", {**state, "target_unit": u}) for u in units]


# ── collector nodes (no-op nodes needed between fan-out returns and next fan-out)

def extraction_collector_node(state: DocumentPipelineState) -> Dict[str, Any]:
    """No-op: waits for all extract_unit results to merge, then passes to verification."""
    units_key = "chapters" if "chapters" in state.get("structured_data", {}) else "units"
    n = len(state.get("structured_data", {}).get(units_key, []))
    logger.info(f"Extraction complete — {n} unit(s) merged into structured_data")
    return {}


def enrichment_collector_node(state: DocumentPipelineState) -> Dict[str, Any]:
    """No-op: waits for all enrich_unit results to merge."""
    units_key = "chapters" if "chapters" in state.get("enriched_data", {}) else "units"
    n = len(state.get("enriched_data", {}).get(units_key, []))
    logger.info(f"Enrichment complete — {n} unit(s) merged into enriched_data")
    return {}


def debate_collector_node(state: DocumentPipelineState) -> Dict[str, Any]:
    """No-op: waits for all debate_unit results to merge."""
    n = len(state.get("debate_unit_results", []))
    logger.info(f"Debate generation complete — {n} unit(s) processed")
    return {}


# ══════════════════════════════════════════════════════════════════════════════
# Graph builder
# ══════════════════════════════════════════════════════════════════════════════

def route_after_ocr(state: DocumentPipelineState) -> str:
    """Skip straight to publish when OCR produced no text.

    Without this the graph walks the whole pipeline on an empty string: structure
    discovery burns six LLM calls (3x gpt-4o-mini + 3x gpt-4o, ~2.5 min with
    backoff) discovering nothing, extraction reports "empty slice", verification
    is skipped for lack of data, and the run still publishes. Going straight to
    final_publish keeps the error report and the artifacts directory, minus the
    wasted spend.
    """
    if not (state.get("content_md") or "").strip():
        logger.error(
            "OCR produced no text — skipping extraction pipeline "
            "(see pipeline_report.json errors[])"
        )
        return "final_publish"
    return "vision_pass"


def build_document_pipeline_graph():
    """Compile and return the full LangGraph StateGraph."""
    graph = StateGraph(DocumentPipelineState)

    # ── Nodes ──────────────────────────────────────────────────────────────
    graph.add_node("ocr_extraction",        ocr_extraction_node)
    graph.add_node("vision_pass",           vision_pass_node)
    graph.add_node("structure_discovery",   structure_discovery_node)

    # Stage 2 fan-out target
    graph.add_node("extract_unit",          extract_unit_node)
    graph.add_node("extraction_collector",  extraction_collector_node)

    # Stage 3 verification
    graph.add_node("verification",          verification_node)

    # Stage 4 fan-out target
    graph.add_node("enrich_unit",              enrich_unit_node)
    graph.add_node("fan_out_debate_collector", enrichment_collector_node)

    # Stage 5 fan-out target
    graph.add_node("debate_unit",          debate_unit_node)
    graph.add_node("debate_collector",     debate_collector_node)

    # Stage 6
    graph.add_node("final_publish",        final_publish_node)

    # ── Edges ──────────────────────────────────────────────────────────────
    graph.set_entry_point("ocr_extraction")
    graph.add_conditional_edges(
        "ocr_extraction",
        route_after_ocr,
        ["vision_pass", "final_publish"],
    )
    graph.add_edge("vision_pass",       "structure_discovery")

    # Stage 2 fan-out: structure_discovery → [extract_unit × N]
    graph.add_conditional_edges(
        "structure_discovery",
        fan_out_extraction,
        ["extract_unit", "verification"],   # possible target nodes
    )
    graph.add_edge("extract_unit",          "extraction_collector")
    graph.add_edge("extraction_collector",  "verification")

    # Stage 3 → Stage 4 & Stage 5 parallel fan-out (runs concurrently)
    graph.add_conditional_edges(
        "verification",
        fan_out_enrichment,
        ["enrich_unit", "fan_out_debate_collector"],
    )
    graph.add_edge("enrich_unit",              "fan_out_debate_collector")
    graph.add_edge("fan_out_debate_collector", "final_publish")

    graph.add_conditional_edges(
        "verification",
        fan_out_debate,
        ["debate_unit", "debate_collector"],
    )
    graph.add_edge("debate_unit",     "debate_collector")
    graph.add_edge("debate_collector", "final_publish")
    graph.add_edge("final_publish",   END)

    return graph.compile()


# ══════════════════════════════════════════════════════════════════════════════
# Public entry point
# ══════════════════════════════════════════════════════════════════════════════

def _validate_identity(pdf_path: Path, class_number: Optional[str],
                       term: Optional[str]) -> tuple:
    """Canonical (class, term), or ValueError with an actionable message.

    The endpoints validate first, so reaching here with a bad identity means a
    caller went straight to the pipeline. Kept as the last line of defence
    because what is wrong here is stamped into every Qdrant payload.
    """
    from ingest_identity import resolve_identity
    return resolve_identity(pdf_path.name, class_number, term)


def run_document_pipeline(
    pdf_path:         Path,
    board:            str,
    class_number:     Optional[str] = None,
    subject:          Optional[str] = None,
    part:             Optional[str] = None,
    term:             Optional[str] = None,
    skip_enrichment:  bool = False,
    skip_debate:      bool = False,
    skip_qdrant:      bool = False,
    enrichment_style: str = "avatar_classroom_teaching",
    api_key:          Optional[str] = None,
    mistral_key:      Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main entry point — replaces process_pdf_file() + enrich_document()
    + generate_and_save_debate_topics() with a unified LangGraph run.

    Returns:
        final_report dict containing:
            is_complete, doc_id, subject,
            verification.overall_score, verification.passes_run,
            enrichment.units_enriched, debate.total_topics,
            pipeline_errors[]
    """
    pdf_path = Path(pdf_path)

    # ── Identity validation ───────────────────────────────────────────────────
    # Everything below is stamped into the doc_id and into every Qdrant payload,
    # so a wrong value here is not a cosmetic problem: it files the book where
    # no filter will ever find it again. One upload declared class "23" (a
    # serial number typed into the class field) and term 1 for a file named
    # "Class_7_Science_term_2_unit6", and the pipeline accepted all of it.
    class_number, term = _validate_identity(pdf_path, class_number, term)

    # Resolve API keys
    # Extraction LLM (Llama 4 Scout) uses OpenRouter key
    # TTS / Vision / Embeddings still use OpenAI key (not changed here)
    resolved_api_key     = api_key or os.environ.get("OPENROUTER_API_KEY", "") or os.environ.get("OPENAI_API_KEY_TEXT", "")
    resolved_mistral_key = mistral_key or os.environ.get("MISTRAL_API_KEY", "")

    # Build doc_id from PDF stem (mirrors pipeline.py sanitization)
    import re
    from term_utils import normalize_term, term_slug
    canonical_term = normalize_term(term)
    stem   = pdf_path.stem
    # Term is part of the identity: two term books of one subject would otherwise
    # collide whenever their PDF stems match.
    _term_tag = f"_{term_slug(canonical_term)}" if canonical_term else ""
    # doc_id and chunk metadata must agree with what the API now hands out,
    # which is the canonical two-digit form ("7" -> "07").
    _raw_cn = normalize_class_number(class_number) or ""
    doc_id = re.sub(r"[^a-zA-Z0-9_\-]", "_", f"{board}_{_raw_cn}_{subject}{_term_tag}_{stem}")[:120]

    logger.info(f"Document Pipeline  →  {pdf_path.name}")
    logger.info(
        f"Board: {board}  |  Class: {_raw_cn or class_number}  |  Subject: {subject}"
        + (f"  |  {canonical_term}" if canonical_term else "")
    )
    logger.info(f"doc_id: {doc_id}")

    # Build initial state
    initial_state: DocumentPipelineState = {
        # Identity
        "doc_id":           doc_id,
        "pdf_path":         str(pdf_path),
        "board":            board,
        "class_number":     _raw_cn or "unknown",
        "subject":          subject,
        "api_key":          resolved_api_key,
        "mistral_key":      resolved_mistral_key,
        "part":             part,
        "term":             canonical_term,
        "enrichment_style": enrichment_style,
        "skip_enrichment":  skip_enrichment,
        "skip_debate":      skip_debate,
        "skip_qdrant":      skip_qdrant,
        # Stage outputs — empty defaults
        "raw_ocr_response":      {},
        "raw_markdown":          "",
        "content_md":            "",
        "page_list":             [],
        "page_quality_report":   {},
        "image_metadata":        {},
        "vision_replacement_count": 0,
        "vision_pass_report":    {},
        "toc_units":             [],
        "unit_boundaries":       {},
        "discovered_types":      [],
        "structured_data":       {},
        "extraction_reports":    [],
        "unit_reports":          [],
        "overall_score":         0.0,
        "schema_report":         None,
        "fixes_made":            0,
        "pass_number":           0,
        "verification_passed":   False,
        "rejection_reason":      "",
        "enriched_data":         {},
        "enrichment_reports":    [],
        "tts_audio_s3_urls":     {},
        "debate_unit_results":   [],
        "debate_topics":         {},
        "s3_artifact_urls":      {},
        "qdrant_uploaded":       False,
        "is_complete":           False,
        "final_report":          {},
        "pipeline_errors":       [],
    }

    # One trace for the whole document run - OCR, extraction, verification,
    # enrichment and debate generation all nest under this rather than each
    # model call starting a trace of its own.
    graph = build_document_pipeline_graph()
    with _lf_observation("process-document-pipeline", as_type="chain",
                         input={"doc_id": doc_id, "subject": subject}) as _root:
        with _lf_trace_context(trace_name="process-document-pipeline",
                               tags=["pipeline", subject or "unknown"],
                               metadata={"doc_id": doc_id,
                                         "subject": subject or "unknown"}):
            final_state = graph.invoke(initial_state)
        _lf_update_observation(_root, output={
            "is_complete": final_state.get("is_complete", False),
            "errors":      len(final_state.get("pipeline_errors", []) or []),
        })
    # A pipeline run is usually a script or a worker; without this the buffered
    # spans die with the process.
    _lf_flush()

    return final_state.get("final_report", {
        "is_complete": final_state.get("is_complete", False),
        "doc_id":      doc_id,
        "subject":     final_state.get("subject", subject),
        "errors":      final_state.get("pipeline_errors", []),
    })


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse, sys

    parser = argparse.ArgumentParser(
        description="Run the complete agentic extraction pipeline"
    )
    parser.add_argument("pdf_path",        help="Path to the PDF file")
    parser.add_argument("--board",         default="State Board")
    parser.add_argument("--class",         dest="class_number", default="10")
    parser.add_argument("--subject",       default="auto")
    parser.add_argument("--part",          default=None)
    parser.add_argument("--skip-enrichment", action="store_true")
    parser.add_argument("--skip-debate",     action="store_true")
    parser.add_argument("--skip-qdrant",     action="store_true")
    parser.add_argument("--style",
                        default="avatar_classroom_teaching",
                        choices=["avatar_classroom_teaching", "classroom_teaching"])
    args = parser.parse_args()

    report = run_document_pipeline(
        pdf_path=Path(args.pdf_path),
        board=args.board,
        class_number=args.class_number,
        subject=None if args.subject == "auto" else args.subject,
        part=args.part,
        skip_enrichment=args.skip_enrichment,
        skip_debate=args.skip_debate,
        skip_qdrant=args.skip_qdrant,
        enrichment_style=args.style,
    )

    logger.info(f"{'='*60}")
    logger.info(json.dumps(report, indent=2, default=str))
    sys.exit(0 if report.get("is_complete") else 1)
