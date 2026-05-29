"""
Subject-Aware Extraction — Stub Module
=======================================

This module was previously the main extraction engine but has been superseded
by auto_schema_extractor.py.  The functions below are retained as thin stubs
so that legacy call-sites in ocr_pipeline.py (e.g. _verify_and_fill_gaps,
structure_unit_universal) continue to work without ImportError.

The universal system prompt re-uses the dynamic prompt builder from
auto_schema_extractor when available; otherwise it falls back to a
minimal built-in prompt.
"""

from typing import Any, Dict, List, Optional


# ─── Try to delegate to auto_schema_extractor for real implementations ────────
try:
    from auto_schema_extractor import (
        _build_dynamic_system_prompt as _auto_system_prompt,
        _build_user_prompt as _auto_user_prompt,
        TYPE_CATALOG,
    )
    _HAS_AUTO_SCHEMA = True
except ImportError:
    _HAS_AUTO_SCHEMA = False
    TYPE_CATALOG = {}


# ─── Universal System Prompt ──────────────────────────────────────────────────

_FALLBACK_SYSTEM_PROMPT = """You are an expert textbook content extractor. Extract ALL content from the textbook unit into structured JSON.

OUTPUT JSON FORMAT:
{
  "unit_number": <integer or null>,
  "title": "<unit/chapter title>",
  "introduction": "<intro text or null>",
  "learning_objectives": ["<objective 1>", ...],
  "sections": [
    {
      "type": "<section type>",
      "id": "<identifier>",
      "title": "<heading text or null>",
      "content": "<FULL text — NEVER truncate>",
      "metadata": {},
      "image_urls": [],
      "sub_items": [
        {"number": "<item number>", "content": "<item text>", "options": []}
      ]
    }
  ]
}

RULES:
1. EXTRACT EVERYTHING — every paragraph, every question, every word.
2. Missing content is the WORST error.
3. Return ONLY valid JSON. No markdown fences. No commentary.
"""


def get_universal_system_prompt() -> str:
    """Return the universal system prompt for textbook extraction."""
    if _HAS_AUTO_SCHEMA:
        # Build a comprehensive prompt covering all known types
        all_types = [{"type": t, "title": ""} for t in TYPE_CATALOG.keys()]
        return _auto_system_prompt(all_types)
    return _FALLBACK_SYSTEM_PROMPT


# ─── Universal User Prompt ────────────────────────────────────────────────────

def create_universal_user_prompt(
    unit_content: str,
    unit_number: Optional[int] = None,
    subject: str = "",
    part_name: Optional[str] = None,
    chunk_index: int = 1,
    total_chunks: int = 1,
) -> str:
    """Build a user prompt for universal extraction."""
    if _HAS_AUTO_SCHEMA:
        return _auto_user_prompt(
            content=unit_content,
            unit_number=unit_number,
            chunk_index=chunk_index,
            total_chunks=total_chunks,
        )

    unit_hint = f"\nUNIT/CHAPTER NUMBER: {unit_number}" if unit_number else ""
    part_hint = f"\nPART/BOOK: {part_name}" if part_name else ""
    chunk_note = ""
    if total_chunks > 1:
        chunk_note = (
            f"\n[CHUNK {chunk_index}/{total_chunks}] "
            f"Extract ALL content in this chunk."
        )

    return (
        f"Extract ALL content from this textbook unit into structured JSON."
        f"{unit_hint}{part_hint}{chunk_note}\n\n"
        f"━━━ CONTENT ━━━\n{unit_content}\n\nReturn the complete JSON now."
    )


# ─── Merge Chunks ─────────────────────────────────────────────────────────────

def merge_universal_chunks(chunk_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge multiple chunk extraction results into a single unit dict.

    Takes the metadata (unit_number, title, etc.) from the first chunk and
    concatenates all sections from every chunk, deduplicating by (type, id, title).
    """
    if not chunk_results:
        return {}
    if len(chunk_results) == 1:
        return chunk_results[0]

    merged = dict(chunk_results[0])
    all_sections: List[Dict[str, Any]] = list(merged.get("sections", []))

    seen = set()
    for sec in all_sections:
        key = (sec.get("type"), sec.get("id"), sec.get("title"))
        seen.add(key)

    for chunk in chunk_results[1:]:
        for sec in chunk.get("sections", []):
            key = (sec.get("type"), sec.get("id"), sec.get("title"))
            if key not in seen:
                all_sections.append(sec)
                seen.add(key)

        # Merge top-level scalar fields if missing in first chunk
        for field in ("unit_number", "title", "introduction", "part"):
            if not merged.get(field) and chunk.get(field):
                merged[field] = chunk[field]

        # Merge learning_objectives
        existing_lo = set(merged.get("learning_objectives") or [])
        for lo in chunk.get("learning_objectives") or []:
            if lo not in existing_lo:
                merged.setdefault("learning_objectives", []).append(lo)
                existing_lo.add(lo)

    merged["sections"] = all_sections
    return merged


# ─── Validate Structure ───────────────────────────────────────────────────────

def validate_universal_structure(data: Dict[str, Any]) -> bool:
    """
    Basic validation: checks the extracted data has required top-level fields
    and at least one section.
    """
    if not isinstance(data, dict):
        return False
    if not data.get("sections"):
        return False
    if not data.get("title"):
        return False
    return True
