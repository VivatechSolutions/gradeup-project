"""
RAG helpers for the seminar PPT co-pilot (M2).

Thin wrapper over qdrant_integration.search_qdrant that takes the session's curriculum
coordinates (board / class / subject / chapter / title) and returns:
  - retrieve_context(): raw chunks + stats for analyzing a slide's content, and
  - unit_topics(): a short outline of the chapter's important topics for scaffolding a new deck.

Everything degrades gracefully: if Qdrant is unavailable or unpopulated, search_qdrant returns
[] and callers fall back to generic behavior (no crash).

Coordinates dict shape (see PPTAgentState / ppt_session):
    {"board", "class_number", "subject", "unit", "unit_title"}

Upgrade (RAG quality logging):
  retrieve_context() now returns (chunks, stats) where
  stats = {"hits": int, "avg_score": float}.
  Callers (ppt_nodes) pass stats to ppt_session.record_rag_stat() so per-session
  RAG hit rate is tracked and surfaced in /ppt/session/end.
"""

import re
from typing import Any, Dict, List, Optional, Tuple
from logger import get_logger

logger = get_logger(__name__)

# ── outline hygiene ──────────────────────────────────────────────────────────────
# Section headings come straight from the textbook extraction, which faithfully keeps
# the book's furniture: "What you have learnt", "EXERCISES", "Q U E S T I O N S". Those
# are not topics, and a deck whose second slide is "Exercises" is the first thing a
# student sees. Everything below is applied by unit_topics() before a heading becomes
# a slide title.

# Headings that are page/chapter furniture, compared after _clean_heading (lowercase,
# letter-spacing collapsed, punctuation trimmed).
_FURNITURE_HEADINGS = frozenset({
    "what you have learnt", "what you have learned", "what have you learnt",
    "summary", "points to remember", "key points", "keywords", "key words",
    "glossary", "exercise", "exercises", "question", "questions",
    "practice questions", "review questions", "additional questions",
    "multiple choice questions", "mcq", "mcqs", "objective questions",
    "very short answer questions", "short answer questions",
    "long answer questions", "answer the following", "answer the following questions",
    "fill in the blanks", "match the following", "choose the correct answer",
    "true or false", "assessment", "evaluation", "self assessment",
    "check your progress", "check your understanding", "test yourself",
    "activity", "activities", "group activity", "project", "projects",
    "project work", "do you know", "did you know", "think and discuss",
    "think and answer", "let us recall", "let us discuss", "let us think",
    "try this", "try these", "recall", "learning outcomes", "learning objectives",
    "objectives", "contents", "chapter", "unit", "note", "notes", "references",
    "further reading", "extended learning", "more to know", "ict corner",
})
# Headings that START with these words are furniture too: "Activity 2.3", "Exercise 1",
# "Question 4", "Table 2.1", "Fig. 3", "Reprint 2025-26".
_FURNITURE_PREFIX_RE = re.compile(
    r"^(?:activity|exercise|question|table|fig\.?|figure|reprint|chapter|unit|lesson)"
    r"\s*[\d.\-:]*\s*$", re.I)
# Numbered captions keep their text: "Table 2.3 Some naturally occurring acids",
# "Figure 1.1 Magnesium ribbon burning" -- a caption is not a topic.
_CAPTION_RE = re.compile(r"^(?:table|fig\.?|figure)\s*\d", re.I)
# Activity boxes, wherever the word sits: "Recall Activity 1.1", "Carry out the following
# Activity", "Group Activity". NCERT section headings never use the word for a topic.
_ACTIVITY_RE = re.compile(r"\bactivit(?:y|ies)\b", re.I)
# An instruction to the student, not a heading: "Prepare your own indicator",
# "Carry out the following", "Let us recall". Same idea as extraction_audit._TO_STUDENT_RE,
# limited to imperative openers so "Preparation of Salts" (a noun) still passes.
_INSTRUCTION_RE = re.compile(
    r"^(?:prepare|preparing|carry out|perform|recall|observe|collect|take|make|draw|"
    r"write|find out|let us|let's|try|discuss|list|compare|identify|answer|record|"
    r"measure|note down|look at|think about|can you|do you|what do you think)\b", re.I)
# "E X E R C I S E S": single letters separated by single spaces.
_LETTER_SPACED_RE = re.compile(r"^(?:[A-Za-z] )+[A-Za-z]$")
# Words that stay lowercase when a SHOUTING heading is re-cased (except in first place).
_SMALL_WORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "nor", "of", "in", "on", "at", "to",
    "for", "with", "by", "from", "as", "vs", "via", "into", "onto", "than",
})
_MAX_HEADING_CHARS = 120


def _clean_heading(raw: str) -> str:
    """Normalise one extracted heading: collapse "E X E R C I S E S", trim stray
    punctuation and whitespace. Case is preserved here; _display_heading recases."""
    text = str(raw or "").strip()
    if _LETTER_SPACED_RE.match(text):
        text = text.replace(" ", "")
    text = re.sub(r"\s+", " ", text)
    # Leading numbering ("2.1 Acids", "1. Introduction") and list markers ("(I) Prepare",
    # "(a) Washing soda", "ii) ..."), then trailing colons/dashes.
    text = re.sub(r"^\s*\d+(?:\.\d+)*\s*[.):\-]?\s+", "", text)
    text = re.sub(r"^\s*\(?(?:[ivxIVX]{1,4}|[a-hA-H])\)\s+", "", text)
    return text.strip(" :-.–—")


def _is_furniture(clean: str, unit_title: str) -> bool:
    # Compare without a trailing "?"/"!" so "Do You Know?" matches; display keeps it.
    key = clean.lower().rstrip("?!").strip()
    if not key or len(clean) > _MAX_HEADING_CHARS:
        return True
    if key == (unit_title or "").strip().lower():
        return True             # the chapter title already IS the title slide
    if key in _FURNITURE_HEADINGS or _FURNITURE_PREFIX_RE.match(clean):
        return True
    if _CAPTION_RE.match(clean) or _ACTIVITY_RE.search(clean) or _INSTRUCTION_RE.match(clean):
        return True
    if not re.search(r"[A-Za-z]", clean):
        return True             # page numbers, bare figure refs
    return False


def _display_heading(clean: str) -> str:
    """Re-case an ALL-CAPS heading as a title; leave mixed-case headings alone."""
    if not clean.isupper():
        return clean
    words = clean.lower().split(" ")
    out = []
    for i, w in enumerate(words):
        if i and w in _SMALL_WORDS:
            out.append(w)
        else:
            out.append(w[:1].upper() + w[1:])
    return " ".join(out)


def _search(query: str, coords: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
    try:
        from qdrant_integration import search_qdrant
    except Exception as e:
        logger.error(f"[ppt_rag] qdrant import failed: {e}")
        return []
    try:
        return search_qdrant(
            query=query,
            limit=limit,
            board_filter=coords.get("board"),
            class_filter=coords.get("class_number"),
            subject_filter=coords.get("subject"),
            unit_filter=coords.get("unit"),
            unit_title_filter=coords.get("unit_title"),
            term_filter=coords.get("term"),
        )
    except Exception as e:
        logger.error(f"[ppt_rag] search_qdrant failed: {e}")
        return []


def _compute_stats(chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute hit count and average relevance score from search results."""
    if not chunks:
        return {"hits": 0, "avg_score": 0.0}
    scores = []
    for c in chunks:
        # Qdrant results may carry score under different keys depending on the integration.
        score = (c.get("score") or c.get("relevance_score")
                 or (c.get("metadata") or {}).get("score") or 0.0)
        try:
            scores.append(float(score))
        except (TypeError, ValueError):
            scores.append(0.0)
    avg = sum(scores) / len(scores) if scores else 0.0
    return {"hits": len(chunks), "avg_score": round(avg, 4)}


def retrieve_context(
    query: str,
    coords: Dict[str, Any],
    limit: int = 5,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Chunks relevant to a slide's content, for analyze_slide.

    Returns (chunks, stats) where stats = {"hits": int, "avg_score": float}.
    Pass stats to ppt_session.record_rag_stat() to accumulate per-session quality metrics.
    """
    chunks = _search(query, coords, limit)
    stats = _compute_stats(chunks)
    return chunks, stats


def unit_topics(coords: Dict[str, Any], limit: int = 6) -> List[str]:
    """
    A de-duplicated list of section headings for the chapter, to scaffold a new deck.

    Pulls chunks for the chapter and lifts their section/heading metadata. Returns [] when
    Qdrant has nothing — the caller then uses a generic outline.

    Headings are cleaned before they become slide titles: textbook furniture
    ("What you have learnt", "EXERCISES", "Q U E S T I O N S", "Activity 2.3"), the
    chapter title itself, and non-text headings are dropped; ALL-CAPS headings are
    re-cased; duplicates are collapsed on the cleaned form.
    """
    title = coords.get("unit_title") or ""
    # Over-fetch: furniture is dropped below, so ask for more than `limit` chunks.
    results = _search(f"key topics and sections of {title}", coords, limit * 4)

    topics: List[str] = []
    seen = set()
    dropped: List[str] = []
    for r in results:
        meta = r.get("metadata", {}) or {}
        heading = (meta.get("section_title") or meta.get("heading")
                   or meta.get("topic") or meta.get("unit_title") or "").strip()
        if not heading:
            continue
        clean = _clean_heading(heading)
        if _is_furniture(clean, title):
            dropped.append(heading)
            continue
        key = clean.lower()
        if key in seen:
            continue
        seen.add(key)
        topics.append(_display_heading(clean))
        if len(topics) >= limit:
            break
    if dropped:
        logger.info(f"[ppt_rag] unit_topics dropped {len(dropped)} furniture heading(s): "
                    f"{dropped[:6]}")
    return topics
