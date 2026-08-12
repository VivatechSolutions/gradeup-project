"""
Router for the seminar PPT-preparation agents.

Picks the tool-specific agent from the deck reference. Each agent is a separate compiled
StateGraph with its own checkpoint store; this keeps the Google Slides API path fully
isolated from the (future) PowerPoint and Canva paths.

deck_ref format: "<tool>:<id>", e.g.
    "gslides:1AbCd..."   → Google Slides Agent
    "pptx:/path/deck.pptx" → PowerPoint Agent (later)
    "canva:DAF123"       → Canva Agent (later)

See SEMINAR_PPT_AUTOMATION_PLAN.md §2a.
"""

from functools import lru_cache


def tool_of(deck_ref: str) -> str:
    """Return the tool key ('gslides' | 'pptx' | 'canva') from a deck_ref."""
    return (deck_ref or "").split(":", 1)[0]


@lru_cache(maxsize=None)
def _build(tool: str):
    if tool == "gslides":
        from agents.google_slides_agent import build_google_slides_agent
        return build_google_slides_agent()
    # M4: pptx / canva agents
    raise ValueError(f"No agent registered for tool '{tool}' (deck_ref prefix)")


def pick_agent(deck_ref: str):
    """Return the compiled agent for this deck (cached per tool)."""
    return _build(tool_of(deck_ref))
