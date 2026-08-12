"""
Stage 5 — Debate Agent (per-unit, runs in parallel fan-out)
Generates debate topics for each main content section of one unit.
"""

from __future__ import annotations

from typing import Any, Dict


# ── LangGraph Node ────────────────────────────────────────────────────────────

def debate_unit_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stage 5 — per-unit debate topic generation (parallel via Send fan-out).

    Reads from state (fan-out): target_unit, subject
    Writes (via reducer):       debate_unit_results
    """
    unit    = state["target_unit"]
    subject = state.get("subject", "unknown")

    unit_num   = unit.get("unit_number") or unit.get("chapter_number", 1)
    unit_title = unit.get("title", f"Unit {unit_num}")

    print(f"\n  🎯 Generating debate topics — Unit {unit_num}: {unit_title}")

    try:
        from debate_topic_generator import generate_debate_topics_for_unit
        result = generate_debate_topics_for_unit(unit=unit, subject=subject)
    except Exception as e:
        print(f"  ⚠️  Debate generation failed for unit {unit_num}: {e}")
        result = {
            "unit_number": unit_num,
            "unit_title":  unit_title,
            "sections":    [],
            "error":       str(e),
        }

    topics_count = sum(
        len(s.get("debate_topics", []))
        for s in result.get("sections", [])
    )
    print(f"  ✅ Unit {unit_num}: {topics_count} debate topic(s) generated")

    return {
        "debate_unit_results": [result],
    }
