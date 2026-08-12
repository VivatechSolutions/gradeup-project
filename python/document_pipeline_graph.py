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
  4:  enrich_unit_node × N     — Avatar enrichment + TTS audio (parallel fan-out)
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

from config import OUTPUTS_DIR


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
    print(f"\n{'='*60}")
    print(f"🤖 Stage 3: Verification Loop")
    print(f"{'='*60}")

    doc_id         = state["doc_id"]
    structured_data = state.get("structured_data", {})
    content_md     = state.get("content_md", "")
    subject        = state.get("subject", "unknown")
    api_key        = state.get("api_key", "")

    if not structured_data or not content_md:
        print("  ⚠️  No structured data — skipping verification")
        return {
            "verification_passed": False,
            "overall_score":       0.0,
            "pass_number":         0,
            "fixes_made":          0,
        }

    # Save structured.json so sub-graph can read it
    doc_dir = OUTPUTS_DIR / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    structured_path = doc_dir / "structured.json"
    content_path    = doc_dir / "content.md"

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
        )
    except Exception as e:
        print(f"  ⚠️  Verification graph failed: {e}")
        report = {}

    # Re-load potentially corrected structured.json
    try:
        corrected = json.loads(structured_path.read_text(encoding="utf-8"))
    except Exception:
        corrected = structured_data

    score   = report.get("overall_score", 0.0)
    passed  = score >= 95.0
    print(f"  📊 Verification score: {score:.1f}%  {'✅ PASSED' if passed else '⚠️  BELOW 95%'}")

    return {
        "structured_data":    corrected,
        "unit_reports":       report.get("unit_reports", []),
        "overall_score":      score,
        "schema_report":      report.get("schema_report"),
        "fixes_made":         report.get("fixes_made", 0),
        "pass_number":        report.get("passes_run", 1),
        "verification_passed": passed,
    }


# ══════════════════════════════════════════════════════════════════════════════
# Stage 6: Final Publish
# ══════════════════════════════════════════════════════════════════════════════

def final_publish_node(state: DocumentPipelineState) -> Dict[str, Any]:
    """
    Saves all artifacts to disk and uploads JSON artifacts to S3.
    Optionally uploads to Qdrant.
    """
    print(f"\n{'='*60}")
    print(f"📤 Stage 6: Final Publish")
    print(f"{'='*60}")

    doc_id      = state["doc_id"]
    subject     = state.get("subject", "unknown")
    doc_dir     = OUTPUTS_DIR / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)

    structured_data  = state.get("structured_data", {})
    enriched_data    = state.get("enriched_data", {})
    debate_results   = state.get("debate_unit_results", [])
    skip_qdrant      = state.get("skip_qdrant", True)

    # ── Save structured.json ──────────────────────────────────────────────
    structured_path = doc_dir / "structured.json"
    if structured_data:
        structured_path.write_bytes(_dumps(structured_data))
        print(f"  💾 Saved structured.json ({structured_path.stat().st_size:,} bytes)")

    # ── Save enriched.json ────────────────────────────────────────────────
    enriched_path = doc_dir / "enriched.json"
    if enriched_data:
        enriched_path.write_bytes(_dumps(enriched_data))
        print(f"  💾 Saved enriched.json ({enriched_path.stat().st_size:,} bytes)")

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
        print(f"  💾 Saved debate_topics.json ({total_topics} topics)")

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
            "passed":        state.get("verification_passed", False),
        },
        "enrichment": {
            "units_enriched": len(state.get("enrichment_reports", [])),
            "audio_files":    len(state.get("tts_audio_s3_urls", {})),
            "reports":        state.get("enrichment_reports", []),
        },
        "debate": {
            "units":        len(debate_results),
            "total_topics": debate_result.get("total_topics", 0),
        },
        "errors": state.get("pipeline_errors", []),
    }
    (doc_dir / "pipeline_report.json").write_bytes(_dumps(pipeline_report))
    print(f"  💾 Saved pipeline_report.json")

    # ── Optional Qdrant upload ─────────────────────────────────────────────
    qdrant_uploaded = False
    if not skip_qdrant and structured_path.exists():
        try:
            from pipeline import get_pipeline
            pip = get_pipeline()
            pip.upload_to_qdrant(
                document_id=doc_id,
                board=state.get("board", ""),
                class_number=state.get("class_number", ""),
                term=state.get("term"),
                # The graph does its own extraction and does not stamp units, so
                # without these the chunks come out with subject/part = None.
                subject=state.get("subject"),
                part=state.get("part"),
            )
            qdrant_uploaded = True
            print(f"  ✅ Qdrant upload complete")
        except Exception as e:
            print(f"  ⚠️  Qdrant upload failed: {e}")

    print(f"\n  ✅ Stage 6 complete — all artifacts saved to {doc_dir}")

    return {
        "debate_topics":   debate_result,
        "qdrant_uploaded": qdrant_uploaded,
        "is_complete":     True,
        "final_report":    pipeline_report,
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
    print(f"\n  🔀 Fan-out extraction: {len(toc_units)} unit(s) in parallel")
    return [Send("extract_unit", {**state, "target_unit": u}) for u in toc_units]


def fan_out_enrichment(state: DocumentPipelineState) -> List[Send]:
    """Fire one enrich_unit_node per unit (all run in parallel)."""
    if state.get("skip_enrichment"):
        print("  ⏭️  Enrichment skipped")
        return [Send("fan_out_debate_collector", state)]

    data     = state.get("structured_data", {})
    key      = "chapters" if "chapters" in data else "units"
    units    = data.get(key, [])

    if not units:
        return [Send("fan_out_debate_collector", state)]

    print(f"\n  🔀 Fan-out enrichment: {len(units)} unit(s) in parallel")
    return [Send("enrich_unit", {**state, "target_unit": u}) for u in units]


def fan_out_debate(state: DocumentPipelineState) -> List[Send]:
    """Fire one debate_unit_node per unit (all run in parallel)."""
    if state.get("skip_debate"):
        print("  ⏭️  Debate topics skipped")
        return [Send("debate_collector", state)]

    # Use enriched_data if available, else structured_data
    data  = state.get("enriched_data") or state.get("structured_data", {})
    key   = "chapters" if "chapters" in data else "units"
    units = data.get(key, [])

    if not units:
        return [Send("debate_collector", state)]

    print(f"\n  🔀 Fan-out debate: {len(units)} unit(s) in parallel")
    return [Send("debate_unit", {**state, "target_unit": u}) for u in units]


# ── collector nodes (no-op nodes needed between fan-out returns and next fan-out)

def extraction_collector_node(state: DocumentPipelineState) -> Dict[str, Any]:
    """No-op: waits for all extract_unit results to merge, then passes to verification."""
    units_key = "chapters" if "chapters" in state.get("structured_data", {}) else "units"
    n = len(state.get("structured_data", {}).get(units_key, []))
    print(f"\n  ✅ Extraction complete — {n} unit(s) merged into structured_data")
    return {}


def enrichment_collector_node(state: DocumentPipelineState) -> Dict[str, Any]:
    """No-op: waits for all enrich_unit results to merge."""
    units_key = "chapters" if "chapters" in state.get("enriched_data", {}) else "units"
    n = len(state.get("enriched_data", {}).get(units_key, []))
    print(f"\n  ✅ Enrichment complete — {n} unit(s) merged into enriched_data")
    return {}


def debate_collector_node(state: DocumentPipelineState) -> Dict[str, Any]:
    """No-op: waits for all debate_unit results to merge."""
    n = len(state.get("debate_unit_results", []))
    print(f"\n  ✅ Debate generation complete — {n} unit(s) processed")
    return {}


# ══════════════════════════════════════════════════════════════════════════════
# Graph builder
# ══════════════════════════════════════════════════════════════════════════════

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
    graph.add_edge("ocr_extraction",    "vision_pass")
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

    # Resolve API keys
    resolved_api_key     = api_key or os.environ.get("OPENAI_API_KEY_TEXT", "")
    resolved_mistral_key = mistral_key or os.environ.get("MISTRAL_API_KEY", "")

    # Build doc_id from PDF stem (mirrors pipeline.py sanitization)
    import re
    from term_utils import normalize_term, term_slug
    canonical_term = normalize_term(term)
    stem   = pdf_path.stem
    # Term is part of the identity: two term books of one subject would otherwise
    # collide whenever their PDF stems match.
    _term_tag = f"_{term_slug(canonical_term)}" if canonical_term else ""
    doc_id = re.sub(r"[^a-zA-Z0-9_\-]", "_", f"{board}_{class_number}_{subject}{_term_tag}_{stem}")[:120]

    print(f"\n{'#'*60}")
    print(f"🚀 Document Pipeline  →  {pdf_path.name}")
    print(f"   Board: {board}  |  Class: {class_number}  |  Subject: {subject}"
          + (f"  |  {canonical_term}" if canonical_term else ""))
    print(f"   doc_id: {doc_id}")
    print(f"{'#'*60}")

    # Build initial state
    initial_state: DocumentPipelineState = {
        # Identity
        "doc_id":           doc_id,
        "pdf_path":         str(pdf_path),
        "board":            board,
        "class_number":     class_number or "unknown",
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

    graph = build_document_pipeline_graph()
    final_state = graph.invoke(initial_state)

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

    print(f"\n{'='*60}")
    print(json.dumps(report, indent=2, default=str))
    sys.exit(0 if report.get("is_complete") else 1)
