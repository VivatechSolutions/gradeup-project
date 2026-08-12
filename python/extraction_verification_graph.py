"""
Extraction Verification Graph — LangGraph Orchestrator
========================================================

Multi-agent agentic verification workflow built on LangGraph.

Agents / Nodes:
    Node 0 — ocr_quality_guard_node   : Page-level OCR quality scoring + cleaning
    Node 1 — verify_unit_node          : Per-unit structural check + gap filling
                                         (runs in PARALLEL across all units via Send API)
    Node 2 — schema_validator_node     : Full schema integrity scoring (0–100)
    Node 3 — convergence_check_node    : Decides pass (≥95) or retry (loop ≤3)
    Node 4 — save_and_report_node      : S3 upload + final report

Usage:
    from extraction_verification_graph import run_verification_graph

    report = run_verification_graph(
        doc_id="TN_Class10_English_Unit1",
        structured_json_path=Path("outputs/TN.../structured.json"),
        content_md_path=Path("outputs/TN.../content.md"),
        subject="english",
        api_key="sk-...",
    )
"""

from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import orjson
    def _loads(b): return orjson.loads(b)
    def _dumps(obj): return orjson.dumps(obj, option=orjson.OPT_INDENT_2)
except ImportError:
    import json
    def _loads(b): return json.loads(b)
    def _dumps(obj): return json.dumps(obj, indent=2).encode()

# ── LangGraph imports ─────────────────────────────────────────────────────────
try:
    from typing import Annotated
    import operator
    from langgraph.graph import StateGraph, END
    from langgraph.constants import Send
    from typing_extensions import TypedDict
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    # Fallback stubs so the file still imports
    class TypedDict:  # type: ignore
        pass
    class Send:       # type: ignore
        def __init__(self, *a, **kw): pass

# ── Agent imports ─────────────────────────────────────────────────────────────
from agents.ocr_quality_guard import (
    generate_page_quality_report,
    clean_corrupted_pages,
    save_quality_report,
)
from agents.content_gap_filler import run_gap_filler
from agents.schema_integrity_validator import (
    run_schema_validator,
    save_schema_report,
    SchemaIntegrityReport,
)

# ── Blueprint verification (new) ────────────────────────────────────────────
try:
    from agents.blueprint_builder import build_unit_blueprint
    from agents.blueprint_judge import run_blueprint_judge
    BLUEPRINT_AVAILABLE = True
except ImportError:
    BLUEPRINT_AVAILABLE = False
    def build_unit_blueprint(*a, **kw): return None  # type: ignore
    def run_blueprint_judge(*a, **kw): return None   # type: ignore

# ── Verification pipeline (existing) ──────────────────────────────────────────
try:
    from verification_pipeline import (
        check_unit_completeness,
        extract_unit_markdown,
        extract_toc_units_from_markdown,
    )
    VERIFY_PIPELINE_AVAILABLE = True
except ImportError:
    VERIFY_PIPELINE_AVAILABLE = False

# ── S3 storage (existing) ────────────────────────────────────────────────────
try:
    from s3_storage import upload_single_image_to_s3, S3_AVAILABLE
except ImportError:
    S3_AVAILABLE = False
    def upload_single_image_to_s3(*a, **kw): return None  # type: ignore

# ── Config ────────────────────────────────────────────────────────────────────
try:
    from config import OPENAI_API_KEY_TEXT, OUTPUTS_DIR
except ImportError:
    import os
    OPENAI_API_KEY_TEXT = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
    OUTPUTS_DIR = Path("outputs")

_PASS_THRESHOLD   = 95.0   # overall score required to exit loop
_MAX_PASSES       = 3      # maximum verification+fix passes


# LANGGRAPH STATE


class UnitReport(TypedDict):
    unit_number:        int
    title:              str
    issues:             List[str]       # severity-prefixed strings
    warnings:           List[str]
    confidence_score:   float           # 0–100
    is_complete:        bool
    present_types:      List[str]
    fixes_applied:      List[str]
    blueprint_verdict:  str             # "PASS" | "FAIL" | "N/A"
    blueprint_coverage: float           # % of expected sections captured


class VerificationState(TypedDict):
    # ── Input ──────────────────────────────────────────────────────────────
    doc_id:               str
    structured_json_path: str
    content_md_path:      str
    subject:              str
    api_key:              str

    # ── Mutable pipeline data ──────────────────────────────────────────────
    content_md:       str
    structured_data:  Dict[str, Any]

    # ── Inter-agent data ───────────────────────────────────────────────────
    page_quality_report: Dict[str, Any]

    # ── Fan-out results (reducers merge from parallel verify_unit nodes) ───
    unit_reports: Annotated[List[UnitReport], operator.add]
    fixes_made:   Annotated[int, operator.add]

    # ── Pass control ───────────────────────────────────────────────────────
    pass_number:   int
    overall_score: float

    # ── Schema validation ──────────────────────────────────────────────────
    schema_report: Optional[Dict[str, Any]]

    # ── Output ─────────────────────────────────────────────────────────────
    s3_upload_complete:  bool
    final_report_path:   str
    is_complete:         bool



# NODE 0: OCR Quality Guard


def ocr_quality_guard_node(state: VerificationState) -> Dict[str, Any]:
    """
    Node 0 — Score all pages in content.md for quality.
    Clean watermark/hash-spam corrupted pages (no Vision LLM).
    Writes page_quality_report.json.
    Updates state["content_md"] with cleaned version.
    """
    print(f"\n{'='*60}")
    print(f"  🛡️  OCR QUALITY GUARD — Pass {state['pass_number'] + 1}")
    print(f"{'='*60}")

    content_md = state["content_md"]
    quality_report = generate_page_quality_report(content_md)

    # Clean corrupted pages
    cleaned_md = clean_corrupted_pages(content_md, quality_report)

    # Save report to disk
    doc_dir = Path(OUTPUTS_DIR) / state["doc_id"]
    doc_dir.mkdir(parents=True, exist_ok=True)
    save_quality_report(quality_report, doc_dir)

    return {
        "content_md":          cleaned_md,
        "page_quality_report": quality_report,
    }



# FAN-OUT FUNCTION: one verify_unit_node per unit


def fan_out_to_units(state: VerificationState) -> List[Send]:
    """
    Called after ocr_quality_guard_node.
    Returns a list of Send objects — one per extracted unit.
    LangGraph runs all of them CONCURRENTLY and merges results via reducers.

    Multiple units (e.g. 8 units in a book) are all processed in parallel.
    """
    units = (
        state["structured_data"].get("units")
        or state["structured_data"].get("chapters")
        or []
    )

    if not units:
        print("  ⚠️  [Orchestrator] No units found in structured data — skipping fan-out")
        return []

    print(
        f"\n  🚀 [Orchestrator] Launching {len(units)} parallel verify_unit nodes "
        f"(pass {state['pass_number'] + 1})"
    )

    return [
        Send("verify_unit", {**state, "target_unit": unit})
        for unit in units
    ]



# NODE 1: Per-unit Structural Verifier + Gap Filler
# (runs in PARALLEL for each unit via LangGraph Send API)


def verify_unit_node(state: VerificationState) -> Dict[str, Any]:
    """
    Node 1 — Per-unit verification and gap filling.

    For each unit (all run concurrently):
        1. check_unit_completeness() → severity-tagged issues
        2. run_gap_filler() → fill CRITICAL/HIGH issues (text-only)
        3. Re-run check_unit_completeness() on the fixed unit
        4. Return UnitReport (merged via operator.add reducer)

    The state["structured_data"] unit list is updated in-place via
    reducer — LangGraph merges all concurrent write results.
    """
    unit         = state["target_unit"]
    content_md   = state["content_md"]
    subject      = state["subject"]
    api_key      = state["api_key"]
    structured   = state["structured_data"]

    unit_number = unit.get("unit_number") or unit.get("chapter_number") or 0

    print(f"\n  🔍 [VerifyUnit] Unit {unit_number}: {unit.get('title', '')[:50]}")

    # ── Extract this unit's markdown slice ───────────────────────────────────
    if VERIFY_PIPELINE_AVAILABLE:
        unit_md = extract_unit_markdown(content_md, unit_number)
        if not unit_md or len(unit_md) < 500:
            unit_md = content_md  # fallback: use full doc for single-unit PDFs
    else:
        unit_md = content_md

    # ── Step 0: Build structural blueprint from content.md ────────────────────
    blueprint = None
    bp_verdict_initial = "N/A"
    bp_coverage_initial = 100.0
    blueprint_issues: List[str] = []

    if BLUEPRINT_AVAILABLE and unit_md:
        try:
            blueprint = build_unit_blueprint(
                unit_md=unit_md,
                unit_number=unit_number,
                unit_title=unit.get("title", ""),
            )
            bp_verdict_obj = run_blueprint_judge(blueprint, unit)
            bp_verdict_initial = bp_verdict_obj.verdict
            bp_coverage_initial = bp_verdict_obj.coverage_pct
            blueprint_issues = bp_verdict_obj.issues  # severity-prefixed
            if bp_verdict_obj.verdict == "FAIL":
                print(
                    f"  🗓️  [Blueprint] Unit {unit_number}: "
                    f"FAIL ({bp_coverage_initial:.0f}% coverage) — "
                    f"{len(bp_verdict_obj.missing)} missing, "
                    f"{len(bp_verdict_obj.duplicates)} duplicate(s)"
                )
            else:
                print(
                    f"  ✅ [Blueprint] Unit {unit_number}: "
                    f"PASS ({bp_coverage_initial:.0f}% coverage)"
                )
        except Exception as bp_exc:
            print(f"  ⚠️  [Blueprint] Unit {unit_number}: error building blueprint — {bp_exc}")

    # ── Step 1: Check completeness ───────────────────────────────────────────
    if VERIFY_PIPELINE_AVAILABLE:
        report = check_unit_completeness(unit, unit_md, subject)
    else:
        report = {
            "unit_number":  unit_number,
            "title":        unit.get("title", ""),
            "issues":       [],
            "warnings":     [],
            "is_complete":  True,
            "present_types": [],
        }

    issues   = report.get("issues", [])
    warnings = report.get("warnings", [])

    # ── Step 2: Tag severity ─────────────────────────────────────────────────
    tagged_issues = _tag_severity(issues)

    # Merge blueprint issues into tagged_issues (they are already severity-prefixed)
    if blueprint_issues:
        # Only add blueprint issues not already covered by completeness checks
        existing_texts = {i.split("'")[1] for i in tagged_issues if "'" in i}
        for bi in blueprint_issues:
            # Don't double-add issues about sections already flagged
            tagged_issues.append(bi)

    has_critical  = any(i.startswith("[CRITICAL]") for i in tagged_issues)
    has_high      = any(i.startswith("[HIGH]") for i in tagged_issues)

    fixes_applied: List[str] = []
    updated_unit = unit
    bp_verdict_label  = bp_verdict_initial   # default: no fixes needed
    bp_coverage_final = bp_coverage_initial


    # ── Step 3: Gap filling (only if there are critical/high issues) ─────────
    if (has_critical or has_high) and api_key:
        updated_unit, fixes_applied = run_gap_filler(
            unit=unit,
            issues=tagged_issues,
            unit_md=unit_md,
            content_md=content_md,
            api_key=api_key,
            subject=subject,
        )

        if fixes_applied:
            print(
                f"  🔧 [VerifyUnit] Unit {unit_number}: "
                f"{len(fixes_applied)} fix(es) applied → {fixes_applied}"
            )
            # Re-run completeness check on the fixed unit
            if VERIFY_PIPELINE_AVAILABLE:
                report = check_unit_completeness(updated_unit, unit_md, subject)
                tagged_issues = _tag_severity(report.get("issues", []))
                warnings      = report.get("warnings", [])

            # Re-run blueprint judge after fixes to get accurate post-fix verdict
            if BLUEPRINT_AVAILABLE and blueprint:
                try:
                    bp_verdict_post = run_blueprint_judge(blueprint, updated_unit)
                    bp_verdict_label  = bp_verdict_post.verdict
                    bp_coverage_final = bp_verdict_post.coverage_pct
                    if bp_verdict_post.verdict == "PASS":
                        print(
                            f"  ✅ [Blueprint] Unit {unit_number} after fixes: "
                            f"PASS ({bp_coverage_final:.0f}% coverage)"
                        )
                    else:
                        print(
                            f"  ⚠️  [Blueprint] Unit {unit_number} after fixes: "
                            f"STILL FAIL ({bp_coverage_final:.0f}% coverage) — "
                            f"{len(bp_verdict_post.missing)} section(s) still missing"
                        )
                        # Merge remaining blueprint issues for the report
                        for bi in bp_verdict_post.issues:
                            if bi not in tagged_issues:
                                tagged_issues.append(bi)
                except Exception as bp_exc:
                    print(f"  ⚠️  [Blueprint] post-fix judge error: {bp_exc}")
                    bp_verdict_label  = bp_verdict_initial
                    bp_coverage_final = bp_coverage_initial
            else:
                bp_verdict_label  = bp_verdict_initial
                bp_coverage_final = bp_coverage_initial
        else:
            bp_verdict_label  = bp_verdict_initial
            bp_coverage_final = bp_coverage_initial

    is_complete = not any(
        i.startswith(("[CRITICAL]", "[HIGH]")) for i in tagged_issues
    )

    # ── Step 4: Compute per-unit confidence score ────────────────────────────
    confidence = _unit_confidence_score(updated_unit, tagged_issues, warnings)
    print(
        f"  {'✅' if is_complete else '⚠️ '} [VerifyUnit] Unit {unit_number} "
        f"— confidence: {confidence:.0f}% | "
        f"{'COMPLETE' if is_complete else f'{len(tagged_issues)} issue(s)'} | "
        f"Blueprint: {bp_verdict_label} ({bp_coverage_final:.0f}%)"
    )

    unit_report: UnitReport = {
        "unit_number":       unit_number,
        "title":             unit.get("title", ""),
        "issues":            tagged_issues,
        "warnings":          warnings,
        "confidence_score":  confidence,
        "is_complete":       is_complete,
        "present_types":     report.get("present_types", []),
        "fixes_applied":     fixes_applied,
        "blueprint_verdict":  bp_verdict_label,
        "blueprint_coverage": bp_coverage_final,
    }

    # ── Update the unit in structured_data ───────────────────────────────────
    # We need to return a copy of structured_data with this unit replaced.
    units_key = "chapters" if "chapters" in structured else "units"
    units = list(structured.get(units_key, []))
    for i, u in enumerate(units):
        un = u.get("unit_number") or u.get("chapter_number")
        if un == unit_number:
            units[i] = updated_unit
            break

    new_structured = {**structured, units_key: units}

    return {
        "unit_reports":   [unit_report],
        "fixes_made":     len(fixes_applied),
        "structured_data": new_structured,
    }


# NODE 2: Schema Integrity Validator


def schema_validator_node(state: VerificationState) -> Dict[str, Any]:
    """
    Node 2 — Run the full schema integrity validator on all units (post-fix).
    Computes overall_score (0–100) and individual unit scores.
    Writes schema_integrity_report.json.
    """
    print(f"\n{'='*60}")
    print(f"  📐 SCHEMA INTEGRITY VALIDATOR — Pass {state['pass_number'] + 1}")
    print(f"{'='*60}")

    # Extract expected TOC units for unit coverage scoring
    toc_expected: Optional[List[int]] = None
    if VERIFY_PIPELINE_AVAILABLE:
        toc_units = extract_toc_units_from_markdown(state["content_md"])
        toc_expected = [u["number"] for u in toc_units] if toc_units else None

    schema_report = run_schema_validator(
        structured_data=state["structured_data"],
        content_md=state["content_md"],
        toc_expected_units=toc_expected,
    )

    # Save to disk
    doc_dir = Path(OUTPUTS_DIR) / state["doc_id"]
    save_schema_report(schema_report, doc_dir)

    return {
        "overall_score": schema_report.overall_score,
        "schema_report": schema_report.to_dict(),
    }



# NODE 3: Convergence Check


def convergence_check_node(state: VerificationState) -> Dict[str, Any]:
    """
    Node 3 — Increment pass counter. Routing decision is in convergence_router.
    """
    new_pass = state["pass_number"] + 1
    score    = state["overall_score"]

    print(f"\n  🔄 [Convergence] Pass {new_pass} complete. Score: {score:.1f}/100")
    if score >= _PASS_THRESHOLD:
        print(f"  ✅ [Convergence] Threshold {_PASS_THRESHOLD} reached — DONE")
    elif new_pass >= _MAX_PASSES:
        print(f"  ⚠️  [Convergence] Max passes ({_MAX_PASSES}) reached — exiting with score {score:.1f}")
    else:
        print(f"  🔁 [Convergence] Score below {_PASS_THRESHOLD} — running pass {new_pass + 1}")

    return {"pass_number": new_pass}


def convergence_router(state: VerificationState) -> str:
    """
    Edge function: determines next node after convergence_check.
        "pass"       → score ≥ 95 → save_and_report
        "max_passes" → tried 3 times → save_and_report anyway
        "retry"      → try again → back to ocr_quality_guard
    """
    if state["overall_score"] >= _PASS_THRESHOLD:
        return "pass"
    if state["pass_number"] >= _MAX_PASSES:
        return "max_passes"
    return "retry"



# NODE 4: Save & Report


def save_and_report_node(state: VerificationState) -> Dict[str, Any]:
    """
    Node 4 — Final node:
        1. Save corrected structured.json to disk
        2. Upload structured.json + page images to S3
        3. Emit agentic_verification_report.json
        4. Set state["is_complete"]
    """
    print(f"\n{'='*60}")
    print(f"  💾 SAVE & REPORT")
    print(f"{'='*60}")

    doc_dir     = Path(OUTPUTS_DIR) / state["doc_id"]
    s_path      = Path(state["structured_json_path"])
    is_complete = state["overall_score"] >= _PASS_THRESHOLD

    # ── 1. Save corrected structured.json ────────────────────────────────────
    s_path.write_bytes(_dumps(state["structured_data"]))
    print(f"  💾 Saved corrected structured.json → {s_path.name}")

    # ── 2. S3 upload ──────────────────────────────────────────────────────────
    s3_ok = False
    if S3_AVAILABLE:
        try:
            _upload_doc_to_s3(state["doc_id"], doc_dir, state["structured_data"])
            s3_ok = True
            print(f"  ☁️  S3 upload complete for doc_id={state['doc_id']}")
        except Exception as exc:
            print(f"  ⚠️  S3 upload failed: {exc}")
    else:
        print("  ℹ️  S3 not configured — skipping S3 upload")

    # ── 3. Compile and save final report ─────────────────────────────────────
    unit_reports = state.get("unit_reports", [])
    final_report = {
        "doc_id":          state["doc_id"],
        "subject":         state["subject"],
        "passes_run":      state["pass_number"],
        "overall_score":   round(state["overall_score"], 2),
        "is_complete":     is_complete,
        "fixes_made":      state.get("fixes_made", 0),
        "s3_uploaded":     s3_ok,
        "schema_report":   state.get("schema_report"),
        "page_quality_report": {
            "corrupted_pages": state.get("page_quality_report", {}).get("corrupted_pages", 0),
            "total_pages":     state.get("page_quality_report", {}).get("total_pages", 0),
        },
        "unit_reports": [
            {
                "unit_number":       ur["unit_number"],
                "title":             ur["title"],
                "confidence_score":  ur["confidence_score"],
                "is_complete":       ur["is_complete"],
                "issues_count":      len(ur["issues"]),
                "fixes_applied":     ur["fixes_applied"],
                "present_types":     ur["present_types"],
                "blueprint_verdict":  ur.get("blueprint_verdict", "N/A"),
                "blueprint_coverage": ur.get("blueprint_coverage", 100.0),
            }
            for ur in unit_reports
        ],
    }

    report_path = doc_dir / "agentic_verification_report.json"
    report_path.write_bytes(_dumps(final_report))
    print(f"   Report saved → {report_path.name}")

    status = " COMPLETE" if is_complete else f"⚠️  PARTIAL (score={state['overall_score']:.1f})"
    print(f"\n   FINAL STATUS: {status}")
    print(f"     Score        : {state['overall_score']:.1f}/100")
    print(f"     Passes run   : {state['pass_number']}")
    print(f"     Fixes made   : {state.get('fixes_made', 0)}")
    print(f"     Units done   : {len(unit_reports)}")

    return {
        "s3_upload_complete": s3_ok,
        "final_report_path":  str(report_path),
        "is_complete":        is_complete,
    }


# S3 UPLOAD HELPERS


def _upload_doc_to_s3(doc_id: str, doc_dir: Path, structured_data: Dict[str, Any]) -> None:
    """
    Upload structured.json and any page images to S3.
    Page images are stored at:  documents/<doc_id>/page_images/page_NNN.jpg
    structured.json is stored at: documents/<doc_id>/structured.json
    """
    import boto3  # type: ignore

    s3 = boto3.client("s3")
    try:
        from config import S3_BUCKET_NAME as bucket
    except ImportError:
        import os
        bucket = os.environ.get("S3_BUCKET_NAME", "gradeup-documents")

    prefix = f"documents/{doc_id}"

    # Upload structured.json
    s_path = doc_dir / "structured.json"
    if s_path.exists():
        s3.upload_file(
            str(s_path),
            bucket,
            f"{prefix}/structured.json",
            ExtraArgs={"ContentType": "application/json"},
        )
        print(f"    ☁️  Uploaded structured.json → s3://{bucket}/{prefix}/structured.json")

    # Upload page images (if any, produced by ocr_pipeline)
    page_img_dir = doc_dir / "page_images"
    if page_img_dir.exists():
        for img_file in sorted(page_img_dir.glob("*.jpg")):
            s3.upload_file(
                str(img_file),
                bucket,
                f"{prefix}/page_images/{img_file.name}",
                ExtraArgs={"ContentType": "image/jpeg"},
            )
        img_count = len(list(page_img_dir.glob("*.jpg")))
        if img_count:
            print(f"    ☁️  Uploaded {img_count} page image(s) → s3://{bucket}/{prefix}/page_images/")

    # Upload the verification report
    rpt_path = doc_dir / "agentic_verification_report.json"
    if rpt_path.exists():
        s3.upload_file(
            str(rpt_path),
            bucket,
            f"{prefix}/reports/agentic_verification_report.json",
            ExtraArgs={"ContentType": "application/json"},
        )



# HELPER FUNCTIONS

_CRITICAL_PATTERNS = [
    "Unit is empty",
    "is MISSING",
    "is INCOMPLETE",
    "has empty content",
    "no sections extracted",
    "Supplementary section found",
    "Grammar section found",
    "Prose/story content expected",
    "[MISSING_TYPE:",       # missing entire section type — CASE D
    "[DUPLICATE_SECTION:",  # hollow duplicate — CASE E
]

_HIGH_PATTERNS = [
    "has no stanzas",
    "appears truncated",
    "paragraphs may not be merged",
]


def _tag_severity(issues: List[str]) -> List[str]:
    """
    Prefix issues with severity tags: [CRITICAL], [HIGH], [MEDIUM].
    Rules:
        CRITICAL — unit empty, section missing entirely, content-less required section
        HIGH     — truncated content, structural errors
        MEDIUM   — warnings about potential issues
    """
    tagged: List[str] = []
    for issue in issues:
        is_critical = any(p in issue for p in _CRITICAL_PATTERNS)
        is_high     = any(p in issue for p in _HIGH_PATTERNS)
        if is_critical:
            tagged.append(f"[CRITICAL] {issue}")
        elif is_high:
            tagged.append(f"[HIGH] {issue}")
        else:
            tagged.append(f"[MEDIUM] {issue}")
    return tagged


def _unit_confidence_score(
    unit: Dict[str, Any],
    tagged_issues: List[str],
    warnings: List[str],
) -> float:
    """
    Compute a 0–100 confidence score for a single unit.
    CRITICAL issues = -15 pts, HIGH = -8 pts, MEDIUM = -3 pts, warnings = -1 pt.
    """
    score = 100.0
    for issue in tagged_issues:
        if issue.startswith("[CRITICAL]"):
            score -= 15
        elif issue.startswith("[HIGH]"):
            score -= 8
        else:
            score -= 3
    score -= len(warnings) * 1
    # Section completeness bonus/penalty
    sections = unit.get("sections", [])
    if sections:
        must = {"prose", "poem", "supplementary", "section", "introduction",
                "activity", "example", "definition", "grammar"}
        empty = sum(
            1 for s in sections
            if s.get("type") in must
            and not (s.get("content") or "").strip()
            and not s.get("sub_items")
        )
        score -= empty * 5
    return max(0.0, min(100.0, score))



# GRAPH BUILDER

def build_verification_graph():
    """
    Build and compile the LangGraph StateGraph.

    Graph topology:
        ocr_quality_guard
          ↓ (fan-out via Send)
        verify_unit × N  (parallel, one per unit)
          ↓ (reducers merge: unit_reports, fixes_made, structured_data)
        schema_validator
          ↓
        convergence_check
          ├─ "pass" / "max_passes"  → save_and_report → END
          └─ "retry"               → ocr_quality_guard (loop)
    """
    if not LANGGRAPH_AVAILABLE:
        raise ImportError(
            "langgraph is not installed. Run: pip install langgraph langchain-core"
        )

    graph = StateGraph(VerificationState)

    graph.add_node("ocr_quality_guard", ocr_quality_guard_node)
    graph.add_node("verify_unit",       verify_unit_node)
    graph.add_node("schema_validator",  schema_validator_node)
    graph.add_node("convergence_check", convergence_check_node)
    graph.add_node("save_and_report",   save_and_report_node)

    graph.set_entry_point("ocr_quality_guard")

    # After OCR guard: fan-out to one verify_unit per unit (parallel)
    graph.add_conditional_edges(
        "ocr_quality_guard",
        fan_out_to_units,
        ["verify_unit"],
    )

    # After ALL verify_unit nodes complete (reducers fired): go to schema validator
    graph.add_edge("verify_unit",      "schema_validator")
    graph.add_edge("schema_validator", "convergence_check")

    # Convergence routing
    graph.add_conditional_edges(
        "convergence_check",
        convergence_router,
        {
            "pass":       "save_and_report",
            "max_passes": "save_and_report",
            "retry":      "ocr_quality_guard",
        },
    )

    graph.add_edge("save_and_report", END)

    return graph.compile()


# PUBLIC ENTRY POINT

def run_verification_graph(
    doc_id: str,
    structured_json_path: Path,
    content_md_path: Path,
    subject: str,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main entry point for the agentic verification workflow.

    Replaces the old single-shot `run_verification_agent()` call.

    Args:
        doc_id:               Document ID (folder name under outputs/)
        structured_json_path: Path to structured.json
        content_md_path:      Path to content.md
        subject:              "english" | "science" | "mathematics" | etc.
        api_key:              OpenAI API key (uses config if None)

    Returns:
        Final agentic_verification_report dict, with keys:
            is_complete, overall_score, passes_run, fixes_made,
            unit_reports, schema_report, s3_uploaded, final_report_path
    """
    if not api_key:
        api_key = OPENAI_API_KEY_TEXT

    # Load inputs
    if not structured_json_path.exists():
        return {"error": f"structured.json not found: {structured_json_path}", "success": False}
    if not content_md_path.exists():
        return {"error": f"content.md not found: {content_md_path}", "success": False}

    structured_data = _loads(structured_json_path.read_bytes())
    content_md      = content_md_path.read_text(encoding="utf-8")

    # Auto-detect subject if not provided
    if not subject:
        units = structured_data.get("units") or structured_data.get("chapters", [])
        for u in units[:3]:
            s = u.get("subject")
            if s:
                subject = s
                break
    subject = subject or "unknown"

    # Build initial state
    initial_state: VerificationState = {
        "doc_id":               doc_id,
        "structured_json_path": str(structured_json_path),
        "content_md_path":      str(content_md_path),
        "subject":              subject,
        "api_key":              api_key or "",
        "content_md":           content_md,
        "structured_data":      structured_data,
        "page_quality_report":  {},
        "unit_reports":         [],
        "fixes_made":           0,
        "pass_number":          0,
        "overall_score":        0.0,
        "schema_report":        None,
        "s3_upload_complete":   False,
        "final_report_path":    "",
        "is_complete":          False,
    }

    print(f"\n{'='*60}")
    print(f"  🤖 AGENTIC VERIFICATION WORKFLOW")
    print(f"     doc_id  : {doc_id}")
    print(f"     subject : {subject}")
    print(f"     units   : "
          f"{len(structured_data.get('units') or structured_data.get('chapters', []))}")
    print(f"     threshold: {_PASS_THRESHOLD}% | max_passes: {_MAX_PASSES}")
    print(f"{'='*60}\n")

    # Build and run graph
    app = build_verification_graph()
    final_state = app.invoke(initial_state)

    # Return the final report
    report_path = final_state.get("final_report_path", "")
    if report_path and Path(report_path).exists():
        return _loads(Path(report_path).read_bytes())

    return {
        "is_complete":   final_state.get("is_complete", False),
        "overall_score": final_state.get("overall_score", 0.0),
        "passes_run":    final_state.get("pass_number", 0),
        "fixes_made":    final_state.get("fixes_made", 0),
    }


# ═════════════════════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═════════════════════════════════════════════════════════════════════════════

def main():
    import argparse, sys

    parser = argparse.ArgumentParser(
        description="GradeUp Agentic Verification Workflow (LangGraph)"
    )
    parser.add_argument("document_id", help="Document ID (folder name in outputs/)")
    parser.add_argument("--subject", default=None, help="Subject hint")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without LLM calls (quality guard + schema only)")
    args = parser.parse_args()

    doc_dir = Path(OUTPUTS_DIR) / args.document_id
    s_path  = doc_dir / "structured.json"
    c_path  = doc_dir / "content.md"

    if not s_path.exists() or not c_path.exists():
        print(f"Error: Missing files for '{args.document_id}' in {OUTPUTS_DIR}")
        sys.exit(1)

    report = run_verification_graph(
        doc_id=args.document_id,
        structured_json_path=s_path,
        content_md_path=c_path,
        subject=args.subject or "unknown",
        api_key="" if args.dry_run else None,
    )

    print(f"\n  ✅ Done. is_complete={report.get('is_complete')} "
          f"score={report.get('overall_score')}")
    sys.exit(0 if report.get("is_complete") else 1)


if __name__ == "__main__":
    main()
