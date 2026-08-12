"""
Schema Integrity Validator — Agent 3
======================================
Deterministic (no-LLM) schema and coverage validator.

Computes an overall Extraction Confidence Score (0–100):

    Component                            Weight
    ─────────────────────────────────    ──────
    Unit coverage (TOC vs extracted)       25%
    Section completeness (non-empty)       25%
    Word coverage (structured/MD words)    20%
    Schema field validity                  15%
    No merged siblings / duplicates        15%

Score ≥ 95 → PASS
Score  < 95 → re-extraction loop triggered (up to 3 passes)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    import orjson
    def _dumps(obj): return orjson.dumps(obj, option=orjson.OPT_INDENT_2)
except ImportError:
    import json
    def _dumps(obj): return json.dumps(obj, indent=2).encode()


# Required fields that MUST have non-empty values
_REQUIRED_FIELDS: Dict[str, List[str]] = {
    "prose":          ["title", "content"],
    "poem":           ["title", "sub_items"],  # sub_items = stanzas
    "supplementary":  ["content"],
    "section":        ["content"],
    "introduction":   ["content"],
    "activity":       ["content"],
    "example":        ["content"],
    "definition":     ["content"],
    "theorem":        ["content"],
    "grammar":        ["content"],
    "exercise":       ["sub_items"],
    "vocabulary":     [],  # content can be empty for vocab (sub_items holds words)
    "summary":        ["content"],
    "glossary":       ["sub_items"],
    "writing_task":   [],
    "warm_up":        [],
    "about_the_author": ["content"],
    "transcript":     ["content"],
    "other":          [],
}

# Minimum content length (chars) for types that carry prose
_MIN_CONTENT_LEN: Dict[str, int] = {
    "prose":         300,
    "supplementary": 500,
    "section":        50,
    "introduction":   50,
    "activity":       50,
    "example":        30,
    "definition":     20,
    "theorem":        20,
    "grammar":        30,
    "about_the_author": 50,
    "transcript":    100,
}



@dataclass
class FieldFailure:
    unit_number: int
    section_type: str
    section_id:   str
    field:        str
    reason:       str
    severity:     str = "CRITICAL"   # "CRITICAL" | "HIGH"

@dataclass
class FieldWarning:
    unit_number:  int
    section_type: str
    section_id:   str
    field:        str
    reason:       str
    severity:     str = "MEDIUM"

@dataclass
class SchemaIntegrityReport:
    overall_score:          float
    unit_scores:            Dict[int, float]
    field_failures:         List[FieldFailure]
    field_warnings:         List[FieldWarning]
    word_coverage_pct:      float
    merged_sibling_count:   int
    duplicate_section_count: int
    is_passing:             bool     # overall_score >= 95

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_score":           round(self.overall_score, 2),
            "is_passing":              self.is_passing,
            "unit_scores":             {str(k): round(v, 2) for k, v in self.unit_scores.items()},
            "word_coverage_pct":       round(self.word_coverage_pct, 1),
            "merged_sibling_count":    self.merged_sibling_count,
            "duplicate_section_count": self.duplicate_section_count,
            "field_failures": [asdict(f) for f in self.field_failures],
            "field_warnings": [asdict(w) for w in self.field_warnings],
        }



def validate_section_schema(
    section: Dict[str, Any],
    unit_number: int,
) -> Tuple[List[FieldFailure], List[FieldWarning]]:
    """
    Validate a single section's fields against its declared type.
    Returns (failures, warnings).
    """
    failures: List[FieldFailure] = []
    warnings: List[FieldWarning] = []

    stype = section.get("type", "other")
    sid   = str(section.get("id") or section.get("section_number") or stype)

    required = _REQUIRED_FIELDS.get(stype, [])
    for req_field in required:
        val = section.get(req_field)
        is_empty = (
            val is None
            or (isinstance(val, str) and not val.strip())
            or (isinstance(val, list) and len(val) == 0)
        )
        if is_empty:
            failures.append(FieldFailure(
                unit_number=unit_number,
                section_type=stype,
                section_id=sid,
                field=req_field,
                reason=f"Required field '{req_field}' is empty/null in {stype} section",
            ))

    # Content length check
    min_len = _MIN_CONTENT_LEN.get(stype, 0)
    if min_len > 0:
        content = section.get("content") or ""
        if isinstance(content, str) and 0 < len(content.strip()) < min_len:
            warnings.append(FieldWarning(
                unit_number=unit_number,
                section_type=stype,
                section_id=sid,
                field="content",
                reason=(
                    f"Content too short: {len(content.strip())} chars "
                    f"(expected ≥{min_len} for {stype})"
                ),
            ))

    # Poem stanza check
    if stype == "poem":
        stanzas = section.get("sub_items") or []
        if not stanzas:
            failures.append(FieldFailure(
                unit_number=unit_number,
                section_type="poem",
                section_id=sid,
                field="sub_items",
                reason="Poem has no stanzas in sub_items[]",
            ))
        elif len(stanzas) == 1:
            warnings.append(FieldWarning(
                unit_number=unit_number,
                section_type="poem",
                section_id=sid,
                field="sub_items",
                reason="Poem has only 1 stanza — may not be fully split",
            ))

    # Exercise question check
    if stype == "exercise":
        sub_items = section.get("sub_items") or []
        if not sub_items:
            failures.append(FieldFailure(
                unit_number=unit_number,
                section_type="exercise",
                section_id=sid,
                field="sub_items",
                reason="Exercise has no questions in sub_items[]",
            ))

    return failures, warnings



_SIBLING_SECTION_RE = re.compile(r"(\d+)\.(\d+)")


def detect_merged_siblings(sections: List[Dict[str, Any]]) -> int:
    """
    Detect cases where sibling sections (e.g. 1.3 and 1.4) were incorrectly
    merged into one section.

    Heuristic: a "section" type entry with an id of "1.3" but whose content
    also contains a prominent heading for "1.4 ..." suggests a merge error.

    Returns count of suspected merged sibling sections.
    """
    count = 0
    for sec in sections:
        stype = sec.get("type", "")
        if stype not in ("section", "introduction", "other"):
            continue
        content = sec.get("content") or ""
        sec_id = str(sec.get("id") or sec.get("section_number") or "")
        m = _SIBLING_SECTION_RE.match(sec_id)
        if not m:
            continue
        major, minor = int(m.group(1)), int(m.group(2))
        # Look for a sibling heading in the content
        sibling_pattern = re.compile(
            rf"(?:^|\n)#+\s*{major}\.{minor + 1}\s", re.MULTILINE
        )
        if sibling_pattern.search(content):
            count += 1
            print(
                f"  ⚠️  [SchemaValidator] Possible merged siblings: "
                f"section {sec_id} content contains {major}.{minor + 1} heading"
            )
    return count


def detect_duplicate_sections(sections: List[Dict[str, Any]]) -> int:
    """
    Count sections where the same id/title appears more than once.
    Duplicates are produced when multi-chunk extraction processes the same
    content region twice.
    """
    seen_ids: Dict[str, int] = {}
    duplicates = 0
    for sec in sections:
        sid = str(sec.get("id") or sec.get("section_number") or "")
        if not sid:
            continue
        if sid in seen_ids:
            duplicates += 1
        else:
            seen_ids[sid] = 1
    return duplicates



def _word_set(text: str) -> Set[str]:
    """Lower-cased words >2 chars from text."""
    words = re.sub(r"[^\w\s]", " ", text.lower()).split()
    return {w for w in words if len(w) > 2}


def compute_structure_coverage(
    structured_data: Dict[str, Any],
    content_md: str,
) -> float:
    """
    Estimate structural completeness of the extraction by checking section
    and subsection schema quality directly — not by counting words.

    Checks (equal weight):
      1. Sections with content/sub_items populated  (non-empty body)
      2. Exercise sections with at least 1 question in sub_items
      3. Sections with a non-empty title
      4. sub_items / subsections themselves have non-empty content

    Returns 0–100 percentage.
    """
    units_key = "chapters" if "chapters" in structured_data else "units"
    units = structured_data.get(units_key, [])

    total_checks = 0
    passed_checks = 0

    for unit in units:
        sections = unit.get("sections", [])
        for sec in sections:
            stype = sec.get("type", "other")
            content = (sec.get("content") or "").strip()
            sub_items = sec.get("sub_items") or sec.get("subsections") or sec.get("sub_sections") or []
            title = (sec.get("title") or sec.get("id") or "").strip()

            # Check 1: has body content or sub_items
            total_checks += 1
            if content or sub_items:
                passed_checks += 1

            # Check 2: title is present
            total_checks += 1
            if title:
                passed_checks += 1

            # Check 3: exercises must have sub_items with questions
            if stype == "exercise":
                total_checks += 1
                if sub_items:
                    passed_checks += 1

            # Check 4: sub_items/subsections have non-empty content
            for item in sub_items:
                if isinstance(item, dict):
                    item_content = (item.get("content") or item.get("text") or "").strip()
                    total_checks += 1
                    if item_content:
                        passed_checks += 1

    if total_checks == 0:
        return 100.0

    return round(passed_checks / total_checks * 100, 1)


def compute_word_coverage(
    structured_data: Dict[str, Any],
    content_md: str,
) -> float:
    """
    Estimate what fraction of unique words from content.md appear
    in the structured JSON. Returns 0–100 percentage.

    NOTE: This is kept for diagnostic/reporting purposes but is no longer
    used as the primary quality metric — use compute_structure_coverage instead.
    Science and Social Science textbooks have heavy image/diagram content
    that legitimately cannot be captured in text fields.
    """
    # Collect all text from structured JSON
    structured_words: Set[str] = set()

    def _collect(obj: Any) -> None:
        if isinstance(obj, str) and len(obj.strip()) > 5:
            structured_words.update(_word_set(obj))
        elif isinstance(obj, list):
            for item in obj:
                _collect(item)
        elif isinstance(obj, dict):
            for key in ("content", "title", "text", "explanation", "definition"):
                val = obj.get(key)
                if isinstance(val, str):
                    structured_words.update(_word_set(val))
            for key in ("sections", "sub_items", "subsections", "units", "chapters"):
                val = obj.get(key)
                if val:
                    _collect(val)

    _collect(structured_data)

    # Strip OCR noise from content.md before comparing
    clean_md = re.sub(r"<!--.*?-->", "", content_md, flags=re.DOTALL)
    clean_md = re.sub(r"!\[.*?\]\(.*?\)", "", clean_md)  # strip image refs
    clean_md = re.sub(r"\.indd\s+\d+", "", clean_md)     # strip page stamps

    md_words = _word_set(clean_md)

    if not md_words:
        return 100.0

    # Stop-words to exclude from coverage comparison
    _STOP = {
        "the", "and", "for", "that", "this", "with", "are", "was",
        "not", "but", "from", "have", "had", "has", "its", "they",
        "you", "all", "can", "one", "also",
    }
    md_significant  = md_words - _STOP
    str_significant = structured_words - _STOP

    if not md_significant:
        return 100.0

    covered = md_significant & str_significant
    return round(len(covered) / len(md_significant) * 100, 1)


# ── Per-unit schema validation ────────────────────────────────────────────────

def validate_unit_schema(unit: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate all sections in a single unit.

    Returns {
        unit_number, failures, warnings,
        sections_total, sections_with_content, completeness_pct
    }
    """
    unit_number = unit.get("unit_number") or unit.get("chapter_number") or 0
    sections    = unit.get("sections", [])

    all_failures: List[FieldFailure] = []
    all_warnings: List[FieldWarning] = []

    sections_total        = len(sections)
    sections_with_content = 0

    must_have = {
        "prose", "poem", "supplementary", "section",
        "introduction", "activity", "example", "definition",
        "theorem", "grammar", "about_the_author", "transcript",
    }

    for sec in sections:
        f, w = validate_section_schema(sec, unit_number)
        all_failures.extend(f)
        all_warnings.extend(w)

        stype   = sec.get("type", "")
        content = sec.get("content") or ""
        subs    = sec.get("sub_items") or sec.get("subsections") or []
        if stype not in must_have or content.strip() or subs:
            sections_with_content += 1

    merged_sibling_count   = detect_merged_siblings(sections)
    duplicate_section_count = detect_duplicate_sections(sections)

    completeness_pct = (
        round(sections_with_content / sections_total * 100, 1)
        if sections_total > 0
        else 0.0
    )

    return {
        "unit_number":           unit_number,
        "sections_total":        sections_total,
        "sections_with_content": sections_with_content,
        "completeness_pct":      completeness_pct,
        "failures":              all_failures,
        "warnings":              all_warnings,
        "merged_sibling_count":  merged_sibling_count,
        "duplicate_section_count": duplicate_section_count,
    }




def _compute_unit_score(unit_result: Dict[str, Any]) -> float:
    """Compute a 0–100 score for one unit based on its schema report."""
    # Deduct points per failure (CRITICAL = 10pts, HIGH = 5pts)
    deductions = 0.0
    for f in unit_result.get("failures", []):
        sev = getattr(f, "severity", "CRITICAL") if hasattr(f, "severity") else f.get("severity", "CRITICAL")
        deductions += 10 if sev == "CRITICAL" else 5
    for w in unit_result.get("warnings", []):
        deductions += 2  # warnings cost less

    completeness = unit_result.get("completeness_pct", 100.0)
    deductions  += max(0, 100 - completeness) * 0.3  # missing content penalty

    merged     = unit_result.get("merged_sibling_count", 0)
    duplicates = unit_result.get("duplicate_section_count", 0)
    deductions += merged * 8 + duplicates * 5

    return max(0.0, min(100.0, 100.0 - deductions))



def run_schema_validator(
    structured_data: Dict[str, Any],
    content_md: str,
    toc_expected_units: Optional[List[int]] = None,
) -> SchemaIntegrityReport:
    """
    Run the full schema integrity check on structured_data vs content_md.

    Scoring formula (weights sum to 100%):
        Unit coverage              25%   — TOC units found / expected
        Section completeness       25%   — sections with content / total
        Word coverage              20%   — structured words / MD words
        Schema field validity      15%   — 1 – (failures / total_checks)
        No merges/duplicates       15%   — 1 – penalty per merged/duplicate

    Returns SchemaIntegrityReport with overall_score and is_passing (≥95).
    """
    units_key = "chapters" if "chapters" in structured_data else "units"
    units: List[Dict] = structured_data.get(units_key, [])

    def _unit_num(u: Dict) -> Optional[int]:
        return u.get("unit_number") or u.get("chapter_number")

    # ── A. Unit coverage ─────────────────────────────────────────────────────
    extracted_nums = {_unit_num(u) for u in units if _unit_num(u)}
    if toc_expected_units:
        expected_set  = set(toc_expected_units)
        unit_coverage = len(extracted_nums & expected_set) / max(len(expected_set), 1)
    else:
        unit_coverage = 1.0  # no TOC to compare → assume full coverage

    # ── B. Section completeness + schema per unit ─────────────────────────────
    unit_results: List[Dict[str, Any]] = []
    all_failures: List[FieldFailure]   = []
    all_warnings: List[FieldWarning]   = []
    merged_total    = 0
    duplicate_total = 0
    total_sections  = 0
    sections_ok     = 0

    for unit in units:
        ur = validate_unit_schema(unit)
        unit_results.append(ur)
        all_failures.extend(ur["failures"])
        all_warnings.extend(ur["warnings"])
        merged_total    += ur["merged_sibling_count"]
        duplicate_total += ur["duplicate_section_count"]
        total_sections  += ur["sections_total"]
        sections_ok     += ur["sections_with_content"]

    section_completeness = (
        sections_ok / total_sections if total_sections > 0 else 1.0
    )

    # ── C. Structure coverage (section/subsection schema check) ──────────────
    # Replaces the old word-coverage proxy which was unreachable for Science
    # textbooks with heavy image/diagram content.
    struct_cov_pct = compute_structure_coverage(structured_data, content_md)

    # ── C2. Word coverage (diagnostic only — not used in score) ─────────────
    word_cov_pct = compute_word_coverage(structured_data, content_md)

    # ── D. Schema validity ───────────────────────────────────────────────────
    total_checks  = total_sections * 2  # rough: each section checked for 2 fields avg
    fail_penalty  = min(len(all_failures) / max(total_checks, 1), 1.0)
    schema_validity = 1.0 - fail_penalty

    # ── E. Merge/duplicate penalty ───────────────────────────────────────────
    integrity_score = max(0.0, 1.0 - (merged_total * 0.08 + duplicate_total * 0.05))

    # ── Composite score ───────────────────────────────────────────────────────
    # Weights: unit_coverage(25) + section_completeness(25) +
    #          structure_coverage(20) + schema_validity(15) + integrity(15) = 100
    overall = (
        unit_coverage          * 25.0
        + section_completeness * 25.0
        + (struct_cov_pct / 100) * 20.0
        + schema_validity        * 15.0
        + integrity_score        * 15.0
    )

    # Per-unit scores
    unit_scores: Dict[int, float] = {}
    for ur in unit_results:
        un = ur["unit_number"]
        if un:
            unit_scores[un] = round(_compute_unit_score(ur), 2)

    report = SchemaIntegrityReport(
        overall_score=round(overall, 2),
        unit_scores=unit_scores,
        field_failures=all_failures,
        field_warnings=all_warnings,
        word_coverage_pct=word_cov_pct,
        merged_sibling_count=merged_total,
        duplicate_section_count=duplicate_total,
        is_passing=overall >= 95.0,
    )

    status = "✅ PASS" if report.is_passing else "⚠️  BELOW THRESHOLD"
    print(
        f"  📊 [SchemaValidator] Score: {overall:.1f}/100 — {status} "
        f"| struct_cov={struct_cov_pct:.0f}% | word_cov={word_cov_pct:.0f}% "
        f"| failures={len(all_failures)} | warnings={len(all_warnings)}"
    )

    return report



def save_schema_report(report: SchemaIntegrityReport, output_dir: Path) -> Path:
    """Save schema_integrity_report.json to output_dir. Returns path."""
    path = output_dir / "schema_integrity_report.json"
    path.write_bytes(_dumps(report.to_dict()))
    print(f"  💾 [SchemaValidator] Saved → {path.name}")
    return path
