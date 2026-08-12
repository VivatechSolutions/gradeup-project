"""
Blueprint Builder
=================
Parses content.md to construct the *expected* section hierarchy for each unit.

The blueprint captures:
  - Numbered sections:   2.1, 2.3, 2.3.1 ...
  - Named sections:      Activity 1, Do You Know, Note, Exercise, Summary, etc.
  - Their parent->child relationships

Output schema
-------------
{
  "unit_number": 2,
  "unit_title":  "Numbers and Sequences",
  "expected_sections": [
    {
      "id":          "2.1",
      "title":       "Euclid's Division Lemma",
      "level":       1,
      "heading_depth": 2,
      "section_type": "section",
      "parent_id":   None,
      "children":    [ ... ]
    },
    ...
  ]
}
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


# Named section type detection
_NAMED_TYPE_RULES: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"^activity\b",              re.I), "activity"),
    (re.compile(r"^do\s+you\s+know",          re.I), "do_you_know"),
    (re.compile(r"^note\b",                  re.I), "note"),
    (re.compile(r"^exercise\b",              re.I), "exercise"),
    (re.compile(r"^exercises?\s+\d",          re.I), "exercise"),
    (re.compile(r"^example\b",               re.I), "example"),
    (re.compile(r"^points?\s+to\s+remember", re.I), "points_to_remember"),
    (re.compile(r"^summary\b",               re.I), "summary"),
    (re.compile(r"^introduction\b",          re.I), "introduction"),
    (re.compile(r"^learning\s+objective",    re.I), "learning_objectives"),
    (re.compile(r"^glossary\b",              re.I), "glossary"),
    (re.compile(r"^evaluation\b",            re.I), "evaluation"),
    (re.compile(r"^theorem\b",               re.I), "theorem"),
    (re.compile(r"^definition\b",            re.I), "definition"),
    (re.compile(r"^ict\s+corner",            re.I), "ict_corner"),
    (re.compile(r"^think\s+about\s+it",      re.I), "think_about_it"),
    (re.compile(r"^proof\b",                 re.I), "theorem"),
    (re.compile(r"^corollary\b",             re.I), "theorem"),
]

_NUMBERED_RE = re.compile(r"^(\d+\.\d+(?:\.\d+)*)\s+(.*)")
_UNIT_HEADING_RE = re.compile(r"^(?:unit|chapter)\s+(\d+)\b", re.I)


def _detect_section_type(heading_text: str) -> str:
    t = heading_text.strip()
    for pattern, stype in _NAMED_TYPE_RULES:
        if pattern.match(t):
            return stype
    m = _NUMBERED_RE.match(t)
    if m:
        return _detect_section_type(m.group(2))
    return "section"


def _parse_section_id(heading_text: str) -> Tuple[Optional[str], str]:
    t = heading_text.strip()
    m = _NUMBERED_RE.match(t)
    if m:
        return m.group(1), m.group(2).strip()
    return None, t


def _dotted_key(sec_id: str) -> List[int]:
    try:
        return [int(x) for x in str(sec_id).split(".") if x.isdigit()]
    except Exception:
        return []


@dataclass
class BlueprintSection:
    id: str
    title: str
    level: int
    heading_depth: int
    section_type: str
    parent_id: Optional[str]
    children: List["BlueprintSection"] = field(default_factory=list)
    is_numbered: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id":            self.id,
            "title":         self.title,
            "level":         self.level,
            "heading_depth": self.heading_depth,
            "section_type":  self.section_type,
            "parent_id":     self.parent_id,
            "is_numbered":   self.is_numbered,
            "children":      [c.to_dict() for c in self.children],
        }


@dataclass
class UnitBlueprint:
    unit_number: int
    unit_title: str
    expected_sections: List[BlueprintSection] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "unit_number":       self.unit_number,
            "unit_title":        self.unit_title,
            "expected_sections": [s.to_dict() for s in self.expected_sections],
        }

    def flat_list(self) -> List[BlueprintSection]:
        result: List[BlueprintSection] = []
        def _walk(sections: List[BlueprintSection]) -> None:
            for s in sections:
                result.append(s)
                _walk(s.children)
        _walk(self.expected_sections)
        return result

    def expected_ids(self) -> List[str]:
        return [s.id for s in self.flat_list()]

    def top_level_sections(self) -> List[BlueprintSection]:
        return self.expected_sections


def build_unit_blueprint(
    unit_md: str,
    unit_number: int,
    unit_title: str = "",
) -> UnitBlueprint:
    blueprint = UnitBlueprint(unit_number=unit_number, unit_title=unit_title)
    lines = unit_md.split("\n")
    auto_title_found = bool(unit_title)
    depth_stack: List[Tuple[int, BlueprintSection]] = []
    unnamed_counter: Dict[str, int] = {}

    for raw_line in lines:
        line = raw_line.rstrip()
        if not line.startswith("#"):
            continue
        depth = 0
        while depth < len(line) and line[depth] == "#":
            depth += 1
        text = line[depth:].strip()
        if not text:
            continue
        if _UNIT_HEADING_RE.match(text):
            if not auto_title_found:
                blueprint.unit_title = text
                auto_title_found = True
            continue
        if depth == 1 and len(text) < 4:
            continue

        sec_id, sec_title = _parse_section_id(text)
        is_numbered = sec_id is not None
        sec_type = _detect_section_type(text)

        if sec_id is None:
            slug = sec_type
            unnamed_counter[slug] = unnamed_counter.get(slug, 0) + 1
            count = unnamed_counter[slug]
            parent_numbered_id = None
            for _, parent_sec in reversed(depth_stack):
                if parent_sec.is_numbered:
                    parent_numbered_id = parent_sec.id
                    break
            if parent_numbered_id:
                sec_id = f"{parent_numbered_id}_{slug}_{count}"
            else:
                sec_id = f"{unit_number}_{slug}_{count}"

        while depth_stack and depth_stack[-1][0] >= depth:
            depth_stack.pop()

        parent_id: Optional[str] = None
        relative_level = 1
        if depth_stack:
            parent_depth, parent_sec = depth_stack[-1]
            parent_id = parent_sec.id
            relative_level = depth_stack[-1][1].level + 1

        section = BlueprintSection(
            id=sec_id,
            title=sec_title,
            level=relative_level,
            heading_depth=depth,
            section_type=sec_type,
            parent_id=parent_id,
            is_numbered=is_numbered,
        )

        if depth_stack:
            depth_stack[-1][1].children.append(section)
        else:
            blueprint.expected_sections.append(section)

        depth_stack.append((depth, section))

    return blueprint


def build_blueprints_from_full_doc(
    content_md: str,
    units: List[Dict[str, Any]],
) -> Dict[int, UnitBlueprint]:
    try:
        from verification_pipeline import extract_unit_markdown
    except ImportError:
        extract_unit_markdown = None

    blueprints: Dict[int, UnitBlueprint] = {}
    for unit in units:
        unit_number = unit.get("unit_number") or unit.get("chapter_number") or 0
        unit_title  = unit.get("title", "")
        unit_md = content_md
        if extract_unit_markdown:
            try:
                extracted = extract_unit_markdown(content_md, unit_number)
                if extracted and len(extracted) >= 100:
                    unit_md = extracted
            except Exception:
                pass
        bp = build_unit_blueprint(unit_md, unit_number, unit_title)
        blueprints[unit_number] = bp
    return blueprints


def sort_sections_by_id(sections: List[Any], id_key: str = "id") -> List[Any]:
    """
    Sort a list of section dicts/objects by their numeric IDs.
    Non-numbered sections preserve their relative original order, placed after numbered ones.
    Terminal sections (exercise, evaluation, points_to_remember, glossary) always go last.
    """
    TERMINAL_TYPES = {"exercise", "evaluation", "points_to_remember", "glossary", "ict_corner"}

    def _get_id(s):
        if isinstance(s, dict):
            return str(s.get(id_key) or s.get("section_number") or "")
        return str(getattr(s, id_key, "") or "")

    def _get_type(s):
        if isinstance(s, dict):
            return str(s.get("type") or s.get("section_type") or "")
        return str(getattr(s, "section_type", "") or "")

    numbered = []
    unnamed  = []
    terminal = []

    for s in sections:
        stype = _get_type(s)
        if stype in TERMINAL_TYPES:
            terminal.append(s)
        elif _dotted_key(_get_id(s)):
            numbered.append(s)
        else:
            unnamed.append(s)

    numbered.sort(key=lambda s: _dotted_key(_get_id(s)))
    return numbered + unnamed + terminal
