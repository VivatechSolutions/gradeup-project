"""
Blueprint Judge
===============
Rule-based comparator that verifies a UnitBlueprint against actual structured.json data.
Returns a structured PASS/FAIL verdict with specific, actionable fix targets.

The Judge does NOT call any LLM — it is deterministic and fast.
The LLM gap-filler is invoked ONLY when the Judge says FAIL.

Verdict schema
--------------
{
  "unit_number":  2,
  "verdict":      "PASS" | "FAIL",
  "coverage_pct": 93.5,           # % of expected sections captured
  "missing":      [...],          # sections in blueprint but NOT in JSON
  "duplicates":   [...],          # sections appearing more than once in JSON
  "out_of_order": [...],          # sections whose position differs from blueprint order
  "wrong_type":   [...],          # sections with mismatched section_type
  "issues":       [...],          # human-readable issue strings (severity-prefixed)
}
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

from agents.blueprint_builder import BlueprintSection, UnitBlueprint


# PASS requires 100% of expected numbered sections captured
_REQUIRED_COVERAGE_PCT = 100.0

# Section types that are always optional (their absence is a WARNING not FAIL)
_OPTIONAL_TYPES: Set[str] = {
    "learning_objectives",
    "do_you_know",
    "think_about_it",
    "ict_corner",
    "note",
}

# Section types that must be present if they appear in the blueprint
_REQUIRED_TYPES: Set[str] = {
    "section",
    "introduction",
    "activity",
    "exercise",
    "example",
    "theorem",
    "definition",
    "points_to_remember",
    "summary",
    "evaluation",
}


def _normalize_title(t: str) -> str:
    """Lowercase, remove punctuation/spaces for fuzzy title matching."""
    t = unicodedata.normalize("NFKC", t or "").lower()
    t = re.sub(r"[^a-z0-9]", "", t)
    return t


def _get_json_sections(unit: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Return the flat sections list from a unit dict."""
    return unit.get("sections") or unit.get("subsections") or []


def _extract_all_json_ids(sections: List[Dict[str, Any]]) -> List[str]:
    """Collect all section IDs (including sub_sections) in document order."""
    ids: List[str] = []
    for sec in sections:
        sid = str(sec.get("id") or sec.get("section_number") or "").strip()
        if sid:
            ids.append(sid)
        for sub in sec.get("sub_sections") or sec.get("subsections") or []:
            sub_id = str(sub.get("id") or sub.get("section_number") or "").strip()
            if sub_id:
                ids.append(sub_id)
    return ids


def _extract_all_json_titles(sections: List[Dict[str, Any]]) -> Dict[str, str]:
    """Map normalized_title -> id for all sections in JSON."""
    result: Dict[str, str] = {}
    for sec in sections:
        sid = str(sec.get("id") or sec.get("section_number") or sec.get("title") or "")
        title = str(sec.get("title") or sec.get("section_title") or "")
        if title:
            result[_normalize_title(title)] = sid
        for sub in sec.get("sub_sections") or sec.get("subsections") or []:
            sub_id = str(sub.get("id") or sub.get("section_number") or sub.get("title") or "")
            sub_title = str(sub.get("title") or sub.get("section_title") or "")
            if sub_title:
                result[_normalize_title(sub_title)] = sub_id
    return result


def _find_duplicates(ids: List[str]) -> List[str]:
    """Find IDs that appear more than once."""
    seen: Dict[str, int] = {}
    for sid in ids:
        seen[sid] = seen.get(sid, 0) + 1
    return [sid for sid, count in seen.items() if count > 1]


@dataclass
class JudgeVerdict:
    unit_number:  int
    verdict:      str                   # "PASS" | "FAIL"
    coverage_pct: float                 # % of required sections captured
    missing:      List[Dict[str, Any]]  # {id, title, section_type, required}
    duplicates:   List[str]             # duplicate section IDs
    out_of_order: List[Dict[str, Any]]  # sections whose order differs
    wrong_type:   List[Dict[str, Any]]  # {id, expected_type, actual_type}
    issues:       List[str]             # severity-prefixed issue strings

    def to_dict(self) -> Dict[str, Any]:
        return {
            "unit_number":  self.unit_number,
            "verdict":      self.verdict,
            "coverage_pct": round(self.coverage_pct, 1),
            "missing":      self.missing,
            "duplicates":   self.duplicates,
            "out_of_order": self.out_of_order,
            "wrong_type":   self.wrong_type,
            "issues":       self.issues,
        }

    def summary(self) -> str:
        lines = [
            f"Unit {self.unit_number} — {self.verdict} "
            f"({self.coverage_pct:.0f}% coverage)"
        ]
        if self.missing:
            lines.append(f"  Missing ({len(self.missing)}): "
                         + ", ".join(m["id"] for m in self.missing))
        if self.duplicates:
            lines.append(f"  Duplicates ({len(self.duplicates)}): "
                         + ", ".join(self.duplicates))
        if self.out_of_order:
            lines.append(f"  Out-of-order ({len(self.out_of_order)}): "
                         + ", ".join(o["id"] for o in self.out_of_order))
        return "\n".join(lines)


def run_blueprint_judge(
    blueprint: UnitBlueprint,
    unit: Dict[str, Any],
) -> JudgeVerdict:
    """
    Compare a UnitBlueprint against the actual unit data from structured.json.

    Args:
        blueprint:  Built by blueprint_builder.build_unit_blueprint()
        unit:       Single unit dict from structured.json

    Returns:
        JudgeVerdict with PASS/FAIL, coverage%, missing, duplicates, out_of_order
    """
    unit_number = blueprint.unit_number
    sections    = _get_json_sections(unit)
    json_ids    = _extract_all_json_ids(sections)
    json_titles = _extract_all_json_titles(sections)
    json_id_set = set(json_ids)

    issues: List[str] = []
    missing: List[Dict[str, Any]] = []
    wrong_type: List[Dict[str, Any]] = []

    # ── 1. Check each expected section is present ─────────────────────────────
    expected_numbered = [s for s in blueprint.flat_list() if s.is_numbered]
    expected_named    = [s for s in blueprint.flat_list() if not s.is_numbered
                         and s.section_type in _REQUIRED_TYPES]

    required_sections = expected_numbered + expected_named

    captured_count = 0
    total_required = len(required_sections)

    for exp in required_sections:
        is_optional = exp.section_type in _OPTIONAL_TYPES

        # Match by ID first
        found_by_id = exp.id in json_id_set

        # Fuzzy match by normalized title if ID not found
        found_by_title = False
        if not found_by_id:
            norm_exp = _normalize_title(exp.title)
            if norm_exp and norm_exp in json_titles:
                found_by_title = True

        if found_by_id or found_by_title:
            captured_count += 1
        else:
            severity = "[WARNING]" if is_optional else "[CRITICAL]"
            missing.append({
                "id":           exp.id,
                "title":        exp.title,
                "section_type": exp.section_type,
                "parent_id":    exp.parent_id,
                "required":     not is_optional,
            })
            issues.append(
                f"{severity} Blueprint section '{exp.id}: {exp.title}' "
                f"(type={exp.section_type}) is NOT present in structured.json"
            )

    coverage_pct = (captured_count / total_required * 100.0) if total_required > 0 else 100.0

    # ── 2. Check for duplicates in JSON ───────────────────────────────────────
    duplicates = _find_duplicates(json_ids)
    for dup in duplicates:
        issues.append(
            f"[CRITICAL] Section '{dup}' appears MULTIPLE TIMES in structured.json — "
            "remove hollow duplicate copies"
        )

    # ── 3. Check section order against blueprint ──────────────────────────────
    out_of_order: List[Dict[str, Any]] = []
    expected_numbered_ids = [s.id for s in expected_numbered]
    actual_numbered_ids   = [sid for sid in json_ids
                              if re.match(r"^\d+\.\d+", sid)]

    # Find the longest common subsequence order — sections NOT in LCS are out of order
    expected_in_actual = [sid for sid in expected_numbered_ids if sid in json_id_set]
    if expected_in_actual:
        # Simple check: are they in the same relative order?
        actual_positions = {sid: i for i, sid in enumerate(actual_numbered_ids)}
        prev_pos = -1
        for sid in expected_in_actual:
            pos = actual_positions.get(sid, -1)
            if pos >= 0:
                if pos < prev_pos:
                    out_of_order.append({"id": sid, "expected_after": expected_in_actual[expected_in_actual.index(sid) - 1] if expected_in_actual.index(sid) > 0 else None})
                    issues.append(f"[HIGH] Section '{sid}' is OUT OF ORDER in structured.json — should come after previous section")
                prev_pos = pos

    # ── 4. Determine overall verdict ─────────────────────────────────────────
    required_missing = [m for m in missing if m["required"]]
    verdict = "PASS" if (
        len(required_missing) == 0 and
        len(duplicates) == 0 and
        coverage_pct >= _REQUIRED_COVERAGE_PCT
    ) else "FAIL"

    return JudgeVerdict(
        unit_number=unit_number,
        verdict=verdict,
        coverage_pct=coverage_pct,
        missing=missing,
        duplicates=duplicates,
        out_of_order=out_of_order,
        wrong_type=wrong_type,
        issues=issues,
    )


def run_blueprint_judge_for_all_units(
    blueprints: Dict[int, UnitBlueprint],
    units: List[Dict[str, Any]],
) -> Tuple[str, List[JudgeVerdict]]:
    """
    Run the judge for all units. Returns (overall_verdict, list_of_verdicts).
    overall_verdict is "PASS" only if ALL units pass.
    """
    verdicts: List[JudgeVerdict] = []
    unit_map: Dict[int, Dict[str, Any]] = {}
    for u in units:
        num = u.get("unit_number") or u.get("chapter_number") or 0
        unit_map[num] = u

    for unit_num, bp in blueprints.items():
        unit = unit_map.get(unit_num)
        if unit is None:
            continue
        verdict = run_blueprint_judge(bp, unit)
        verdicts.append(verdict)
        print(verdict.summary())

    overall = "PASS" if all(v.verdict == "PASS" for v in verdicts) else "FAIL"
    return overall, verdicts
