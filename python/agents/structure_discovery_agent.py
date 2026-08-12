"""
Stage 1 — Structure Discovery Agent
Parses the TOC to identify unit/chapter boundaries, then runs
discover_textbook_structure() to find the section types present in the doc.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional


# ── TOC / unit boundary helpers ───────────────────────────────────────────────

# Universal top-level division keywords — covers most textbook conventions
_UNIT_KEYWORDS = r"(?:Unit|Chapter|Lesson|Module|Part|Topic)"


def _parse_toc_units(content_md: str, subject: Optional[str]) -> List[Dict]:
    """
    Extract ordered unit list from markdown.
    Tries: infer_units_or_chapters_from_markdown(), then keyword body scan,
    then bare numbered top-level headings ("# 1. Title").
    """
    # Primary: auto_schema_extractor helper
    try:
        from auto_schema_extractor import infer_units_or_chapters_from_markdown
        units = infer_units_or_chapters_from_markdown(content_md)
        if units:
            return units
    except Exception:
        pass

    # Fallback 1: regex scan for "Unit N" / "Chapter N" / "Lesson N" ... headers
    units: List[Dict] = []
    seen_nums: set = set()
    pattern = re.compile(
        rf"^#+\s*{_UNIT_KEYWORDS}\s+(\d+)[:\.\s]+(.+)$",
        re.MULTILINE | re.IGNORECASE,
    )
    for m in pattern.finditer(content_md):
        num = int(m.group(1))
        if num in seen_nums:
            continue
        seen_nums.add(num)
        units.append({
            "number": num,
            "title":  m.group(2).strip(),
            "type":   "chapter" if subject in ("mathematics", "maths") else "unit",
        })
    if units:
        return units

    # Fallback 2: bare numbered top-level headings, e.g. "# 1. Nutrition in Plants"
    bare = re.compile(r"^#\s*(\d{1,2})[\.\)]\s+(.+)$", re.MULTILINE)
    for m in bare.finditer(content_md):
        num = int(m.group(1))
        if num in seen_nums:
            continue
        seen_nums.add(num)
        units.append({
            "number": num,
            "title":  m.group(2).strip(),
            "type":   "chapter" if subject in ("mathematics", "maths") else "unit",
        })
    return units


def _build_unit_boundaries(content_md: str, toc_units: List[Dict]) -> Dict[int, Dict]:
    """
    Compute start_char / end_char offsets for each unit in the full markdown.
    Returns {unit_num: {start_char, end_char, title}}.
    """
    if not toc_units:
        # Single unit: whole document
        return {1: {"start_char": 0, "end_char": len(content_md), "title": ""}}

    boundaries: Dict[int, Dict] = {}
    unit_nums = {u["number"] for u in toc_units}
    found: Dict[int, int] = {}   # unit_num -> start_char (first occurrence)

    # Pass 1: keyword headers ("## Unit 3", "## Chapter 3", "## Lesson 3", ...)
    header_re = re.compile(
        rf"^#+\s*{_UNIT_KEYWORDS}\s+(\d+)\b",
        re.IGNORECASE | re.MULTILINE,
    )
    for m in header_re.finditer(content_md):
        num = int(m.group(1))
        if num in unit_nums and num not in found:
            found[num] = m.start()

    # Pass 2: bare numbered headings ("# 3. Title")
    bare_re = re.compile(r"^#{1,3}\s*(\d{1,2})[\.\)]\s+\S", re.MULTILINE)
    for m in bare_re.finditer(content_md):
        num = int(m.group(1))
        if num in unit_nums and num not in found:
            found[num] = m.start()

    # Pass 3: locate still-missing units by their TOC title as a heading line
    for u in toc_units:
        num = u["number"]
        title = (u.get("title") or "").strip()
        if num in found or len(title) < 4:
            continue
        title_pat = re.sub(r"\\?\s+", r"\\s+", re.escape(title))
        m = re.search(
            rf"^#{{1,6}}\s*(?:\d+[\.\)]?\s*)?{title_pat}\s*$",
            content_md, re.IGNORECASE | re.MULTILINE,
        )
        if m:
            found[num] = m.start()

    # Pair up positions (sorted by location in the document) → ranges
    positions = sorted(found.items(), key=lambda kv: kv[1])
    for i, (num, start) in enumerate(positions):
        end = positions[i + 1][1] if i + 1 < len(positions) else len(content_md)
        title = next((u["title"] for u in toc_units if u["number"] == num), "")
        boundaries[num] = {"start_char": start, "end_char": end, "title": title}

    # Any unit in toc_units not found in body → assign full doc
    for u in toc_units:
        if u["number"] not in boundaries:
            boundaries[u["number"]] = {
                "start_char": 0,
                "end_char":   len(content_md),
                "title":      u["title"],
            }

    return boundaries


# ── Type discovery ────────────────────────────────────────────────────────────

def _discover_types(content_md: str, api_key: str, model: str) -> List[Dict]:
    """
    Phase 1 LLM call: identify section types present in the document.
    Returns [{"type": str, "title": str}, ...].
    """
    try:
        from auto_schema_extractor import discover_textbook_structure
        return discover_textbook_structure(content_md, api_key, model)
    except Exception as e:
        print(f"  ⚠️  discover_textbook_structure failed: {e}")
        # Heuristic fallback
        try:
            from auto_schema_extractor import _detect_structure_heuristic
            return _detect_structure_heuristic(content_md)
        except Exception:
            return [{"type": "section", "title": "Content"}]


# ── Subject detection fallback ────────────────────────────────────────────────

def _detect_subject(content_md: str) -> Optional[str]:
    try:
        from subject_aware_extraction import detect_subject_from_content
        return detect_subject_from_content(content_md)
    except Exception:
        return None


# ── LangGraph Node ────────────────────────────────────────────────────────────

def structure_discovery_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stage 1 — Section Identification.

    Reads:  content_md, subject, api_key
    Writes: content_md (image tags stripped), toc_units, unit_boundaries,
            discovered_types, subject (if auto-detected)
    """
    content_md = state["content_md"]
    api_key    = state.get("api_key", "")
    subject    = state.get("subject")

    # Strip scanned-image tags once for the whole pipeline (this runs after the
    # vision pass, which is the last stage that needs them). Boundaries below
    # are computed on this stripped text, so downstream slicing stays aligned.
    try:
        from auto_schema_extractor import strip_image_tags
        content_md = strip_image_tags(content_md)
    except Exception:
        pass

    # Model selection mirrors ocr_pipeline.py logic
    model = "gpt-4o" if subject in ("mathematics", "maths") else "gpt-4o-mini"

    print(f"\n{'='*60}")
    print(f"🗂️  Stage 1: Structure Discovery")
    print(f"{'='*60}")

    # Auto-detect subject if not provided
    if not subject or subject == "auto":
        print(f"  🔎 Auto-detecting subject...")
        subject = _detect_subject(content_md) or "unknown"
        print(f"  ✅ Subject: {subject}")

    # Step A: Parse TOC → unit list
    print(f"  📚 Parsing TOC...")
    toc_units = _parse_toc_units(content_md, subject)
    print(f"  ✅ Found {len(toc_units)} unit(s) in TOC")

    # Ensure at least one unit entry
    if not toc_units:
        toc_units = [{"number": 1, "title": "Unit 1", "type": "unit"}]

    # Step B: Compute char boundaries
    unit_boundaries = _build_unit_boundaries(content_md, toc_units)
    print(f"  📐 Unit boundaries: {list(unit_boundaries.keys())}")

    # Step C: LLM structure discovery
    print(f"  🤖 Discovering section types (LLM Phase 1)...")
    sample = content_md[:80_000]   # matches auto_schema_extractor sampling
    discovered_types = _discover_types(sample, api_key, model) if api_key else []
    if not discovered_types:
        discovered_types = [{"type": "section", "title": "Content"}]

    unique_types = list({d["type"] for d in discovered_types})
    print(f"  ✅ Discovered {len(unique_types)} section type(s): {unique_types}")
    print(f"  ✅ Stage 1 complete")

    return {
        "subject":         subject,
        "content_md":      content_md,   # image tags stripped
        "toc_units":       toc_units,
        "unit_boundaries": unit_boundaries,
        "discovered_types": discovered_types,
    }
