"""
Shared helpers for section ``type`` labels.

English readings — prose, poem and supplementary — are stored with
``type="section"`` so every subject uses the same section label in
structured.json.  The specific English reading kind is preserved in
``metadata.content_kind`` so downstream consumers (schema validation,
enrichment, debate topics, gap filling) can still tell a poem from a story.

Use :func:`section_content_kind` instead of reading ``section["type"]``
directly whenever behaviour depends on prose / poem / supplementary.
"""

import re
from typing import Any, Dict, List, Optional

# English reading types that are collapsed into the generic "section" label.
ENGLISH_READING_TYPES = frozenset({"prose", "poem", "supplementary"})

# Exercise headings NCERT prints *inside* a reading.  They interrupt the story
# for a couple of questions and then the story carries on, so extraction emits
# the one reading as two or three prose sections with the checks wedged between
# them.  Bridging across these headings is what puts the reading back together.
_MID_READING_CHECK_RES = (
    re.compile(r"^\s*(?:[ivx]+\s*[.)]\s*)?(?:oral\s+|reading\s+)?comprehension\s+check\b",
               re.IGNORECASE),
    re.compile(r"^\s*check\s+your\s+understanding\b", re.IGNORECASE),
)

# Names for a reading the book prints with no heading of its own.  The unit
# title is preferred; these are the fallback when it is already taken.
_READING_KIND_TITLES = {
    "prose":         "The Story",
    "poem":          "The Poem",
    "supplementary": "Supplementary Reading",
}


def is_english_subject(subject: Optional[Any]) -> bool:
    """True for 'english', 'cbse_english', '<board>_english', etc."""
    if not subject:
        return False
    return "english" in str(subject).strip().lower()


def section_content_kind(section: Dict[str, Any]) -> str:
    """
    Effective content kind of a section.

    Returns ``metadata.content_kind`` for a collapsed English reading
    (prose / poem / supplementary), otherwise the plain ``type``.
    """
    if not isinstance(section, dict):
        return ""
    meta = section.get("metadata")
    if isinstance(meta, dict):
        kind = str(meta.get("content_kind") or "").strip().lower()
        if kind:
            return kind
    return str(section.get("type") or "").strip().lower()


def strip_english_section_ids(sections: List[Dict[str, Any]],
                              subject: Optional[Any] = "") -> List[Dict[str, Any]]:
    """
    Clear invented section ids on English units.

    English textbooks are organised by titled parts — a reading, a poem, a
    grammar topic, exercises lettered A/B/C — and print no section numbers.
    Extraction still emits an ``id`` for them, so units end up carrying
    fabricated dotted numbers ("1.1" for a story), duplicated exercise letters
    ("G" twice in one unit) and titles copied into the id field ("Grammar",
    "Sample Report"). None of those identify anything, and a fabricated dotted
    id is actively harmful: the hierarchy nester nests by dotted id and the
    blueprint judge checks numbered sections are in order.

    Mutates in place and returns the list. Walks nested children too.
    """
    if not sections or not is_english_subject(subject):
        return sections

    cleared = 0

    def _walk(nodes: List[Dict[str, Any]]) -> None:
        nonlocal cleared
        for sec in nodes:
            if not isinstance(sec, dict):
                continue
            # Subject-specific schemas key off section_number — leave them alone
            if "type" not in sec and "section_number" in sec:
                continue
            if str(sec.get("id") or "").strip():
                sec["id"] = ""
                cleared += 1
            for child_key in ("sub_sections", "subsections"):
                children = sec.get(child_key)
                if isinstance(children, list):
                    _walk(children)

    _walk(sections)

    if cleared:
        try:
            from logger import get_logger
            get_logger(__name__).info(
                f"Cleared {cleared} invented section id(s) — English units are "
                f"organised by title, not by section number"
            )
        except Exception:
            pass

    return sections


def collapse_english_reading_types(sections: List[Dict[str, Any]],
                                   subject: Optional[Any] = "") -> List[Dict[str, Any]]:
    """
    Rewrite prose / poem / supplementary sections to ``type="section"``.

    Only applies to English subjects.  The original label is kept in
    ``metadata.content_kind``.  Idempotent — already-collapsed sections
    pass through unchanged.  Sections without a ``type`` (subject-specific
    schemas that use section_number/section_title) are left alone.
    """
    if not sections or not is_english_subject(subject):
        return sections

    result: List[Dict[str, Any]] = []
    collapsed = 0
    for sec in sections:
        if not isinstance(sec, dict):
            result.append(sec)
            continue

        stype = str(sec.get("type") or "").strip().lower()
        if stype not in ENGLISH_READING_TYPES:
            result.append(sec)
            continue

        sec = dict(sec)
        meta = dict(sec.get("metadata") or {})
        meta.setdefault("content_kind", stype)
        sec["metadata"] = meta
        sec["type"] = "section"
        result.append(sec)
        collapsed += 1

    if collapsed:
        try:
            from logger import get_logger
            get_logger(__name__).info(
                f"Collapsed {collapsed} English reading section(s) to type='section' "
                f"(kind kept in metadata.content_kind)"
            )
        except Exception:
            pass

    return result


def _reading_kind(section: Dict[str, Any]) -> str:
    """``prose`` / ``poem`` / ``supplementary`` for a reading, ``""`` otherwise.

    Works before and after :func:`collapse_english_reading_types` — the kind is
    read from ``type`` while it is still raw, and from ``metadata.content_kind``
    once the section has been collapsed to ``type="section"``.
    """
    kind = section_content_kind(section)
    return kind if kind in ENGLISH_READING_TYPES else ""


def _section_title(section: Dict[str, Any]) -> str:
    """The section's display title, falling back to ``metadata.title``."""
    if not isinstance(section, dict):
        return ""
    title = str(section.get("title") or "").strip()
    if title:
        return title
    meta = section.get("metadata")
    if isinstance(meta, dict):
        return str(meta.get("title") or "").strip()
    return ""


def _norm_title(title: Optional[str]) -> str:
    return re.sub(r"\s+", " ", str(title or "")).strip().lower()


def is_mid_reading_check(section: Dict[str, Any]) -> bool:
    """True for an 'Oral Comprehension Check' style exercise inside a reading."""
    if not isinstance(section, dict):
        return False
    if str(section.get("type") or "").strip().lower() != "exercise":
        return False
    label = str(section.get("title") or section.get("id") or "").strip()
    return bool(label) and any(p.search(label) for p in _MID_READING_CHECK_RES)


def merge_split_english_readings(sections: List[Dict[str, Any]],
                                 subject: Optional[Any] = "") -> List[Dict[str, Any]]:
    """
    Rejoin one reading that extraction split at its comprehension checks.

    NCERT English prints 'Oral Comprehension Check' two or three times *in the
    middle* of a story.  Extraction treats each heading as a section boundary,
    so a single story comes out as prose / check / prose / check / prose — three
    part-sections in the UI where the book has one continuous reading.

    This bridges the check exercises: consecutive reading sections of the same
    kind separated *only* by mid-reading checks are merged into one section, and
    the checks are re-emitted straight after it, so nothing is lost and reading
    order still runs story-then-questions.

    Only bridges when a check actually sits between two halves — plain adjacent
    readings are left alone (two untitled poems in a row are two poems).  Titled
    readings with *different* titles are never merged.  Idempotent.
    """
    if not sections or not is_english_subject(subject):
        return sections

    result: List[Dict[str, Any]] = []
    merged_parts = 0
    i, n = 0, len(sections)

    while i < n:
        sec = sections[i]
        kind = _reading_kind(sec) if isinstance(sec, dict) else ""
        if not kind:
            result.append(sec)
            i += 1
            continue

        base_title = _section_title(sec)
        parts = [sec]
        bridged: List[Dict[str, Any]] = []   # checks proven to sit inside the reading
        pending: List[Dict[str, Any]] = []   # checks seen since the last confirmed part
        j = i + 1

        while j < n:
            nxt = sections[j]
            if is_mid_reading_check(nxt):
                pending.append(nxt)
                j += 1
                continue
            if not pending or not isinstance(nxt, dict):
                break
            nxt_title = _section_title(nxt)
            same_reading = (
                _reading_kind(nxt) == kind
                and (not nxt_title or not base_title or nxt_title == base_title)
            )
            if not same_reading:
                break
            # A check exercise sat between two halves of the same reading.
            bridged.extend(pending)
            pending = []
            parts.append(nxt)
            base_title = base_title or nxt_title
            j += 1

        if len(parts) == 1:
            result.append(sec)
        else:
            merged = dict(parts[0])
            chunks = [str(p.get("content") or "").strip() for p in parts]
            merged["content"] = "\n\n".join(c for c in chunks if c)
            sub_items: List[Any] = []
            for p in parts:
                sub_items.extend(p.get("sub_items") or [])
            if sub_items:
                merged["sub_items"] = sub_items
            meta = dict(parts[0].get("metadata") or {})
            for p in parts[1:]:
                for key, val in (p.get("metadata") or {}).items():
                    if val and not meta.get(key):
                        meta[key] = val
            merged["metadata"] = meta
            if base_title and not str(merged.get("title") or "").strip():
                merged["title"] = base_title
            result.append(merged)
            merged_parts += len(parts) - 1

        result.extend(bridged)
        result.extend(pending)
        i = j

    if merged_parts:
        try:
            from logger import get_logger
            get_logger(__name__).info(
                f"Rejoined {merged_parts} reading part(s) split by "
                f"'Oral Comprehension Check' — the reading is one section again"
            )
        except Exception:
            pass

    return result


def title_untitled_english_readings(sections: List[Dict[str, Any]],
                                    subject: Optional[Any] = "",
                                    unit_title: Optional[str] = "") -> List[Dict[str, Any]]:
    """
    Name an English reading that the book prints without a heading.

    A story usually carries no heading of its own — the chapter title *is* its
    title — so extraction leaves ``title`` null and the UI has nothing to label
    the section with (the schema validator also fails it: title is required on a
    reading).  The unit title is used for the first such reading; any further
    untitled reading falls back to a kind label ('The Poem', 'The Story', …),
    numbered if that is taken too.

    Never overwrites a title the book actually printed, and never reuses a title
    another section already holds.  ``metadata.title_generated`` marks the ones
    invented here.  Mutates in place and returns the list.
    """
    if not sections or not is_english_subject(subject):
        return sections

    used = {_norm_title(_section_title(s)) for s in sections if isinstance(s, dict)}
    used.discard("")

    unit_title = str(unit_title or "").strip()
    named: List[str] = []

    for sec in sections:
        if not isinstance(sec, dict):
            continue
        kind = _reading_kind(sec)
        if not kind or _section_title(sec):
            continue
        # An empty shell is a job for the gap-filler, not something to name.
        if not str(sec.get("content") or "").strip() and not sec.get("sub_items"):
            continue

        if unit_title and _norm_title(unit_title) not in used:
            title = unit_title
        else:
            base = _READING_KIND_TITLES.get(kind, "Reading")
            title = base
            suffix = 2
            while _norm_title(title) in used:
                title = f"{base} ({suffix})"
                suffix += 1

        sec["title"] = title
        used.add(_norm_title(title))
        meta = sec.get("metadata")
        if not isinstance(meta, dict):
            meta = {}
        meta["title"] = title
        # Bool, not str — enrichment folds string metadata into RAG chunk text.
        meta["title_generated"] = True
        sec["metadata"] = meta
        named.append(title)

    if named:
        try:
            from logger import get_logger
            get_logger(__name__).info(
                f"Named {len(named)} untitled English reading(s): {named} "
                f"(the book prints no heading for them)"
            )
        except Exception:
            pass

    return sections


def finalize_english_sections(sections: List[Dict[str, Any]],
                              subject: Optional[Any] = "",
                              unit_title: Optional[str] = "") -> List[Dict[str, Any]]:
    """Run every English section invariant, in the order they depend on."""
    sections = merge_split_english_readings(sections, subject)
    sections = collapse_english_reading_types(sections, subject)
    sections = title_untitled_english_readings(sections, subject, unit_title)
    strip_english_section_ids(sections, subject)
    return sections
