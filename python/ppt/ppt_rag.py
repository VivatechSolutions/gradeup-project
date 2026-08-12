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

from typing import Any, Dict, List, Optional, Tuple


def _search(query: str, coords: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
    try:
        from qdrant_integration import search_qdrant
    except Exception as e:
        print(f"  [ppt_rag] qdrant import failed: {e}")
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
        print(f"  [ppt_rag] search_qdrant failed: {e}")
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
    """
    title = coords.get("unit_title") or ""
    results = _search(f"key topics and sections of {title}", coords, limit * 3)

    topics: List[str] = []
    seen = set()
    for r in results:
        meta = r.get("metadata", {}) or {}
        heading = (meta.get("section_title") or meta.get("heading")
                   or meta.get("topic") or meta.get("unit_title") or "").strip()
        key = heading.lower()
        if heading and key not in seen:
            seen.add(key)
            topics.append(heading)
        if len(topics) >= limit:
            break
    return topics
