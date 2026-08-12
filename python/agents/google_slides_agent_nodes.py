"""
Google-Slides-bound nodes for the Google Slides Agent.

Only the tool-touching nodes live here — everything else comes from the shared
ppt_nodes.py library. A future PowerPoint agent will provide its own versions of
these (pptx-bound) and reuse the rest unchanged.

Node catalogue
──────────────
read_slide_node          — reads the current slide snapshot (title, bullets, font sizes).
auto_apply_node          — applies MINOR ops directly (no student approval needed).
apply_change_node        — applies SIGNIFICANT ops after the student approved them.
apply_theme_all_slides_node — enforces the uniform theme across every slide in the deck.
"""

import mcp_slides_client
from ppt.ppt_state import PPTAgentState
from ppt.ppt_theme import DEFAULT_THEME_SPEC


# ── read ───────────────────────────────────────────────────────────────────────

def read_slide_node(state: PPTAgentState) -> dict:
    """
    Pull the current slide snapshot from Google Slides.

    Live: Google Slides `presentations.get` via mcp_slides_client.
    Stub: returns a minimal snapshot when credentials are absent.
    """
    deck_ref = state.get("deck_ref", "")
    slide_index = state.get("slide_index", 0)

    if mcp_slides_client.is_available() and not deck_ref.startswith("gslides:STUB-"):
        try:
            snapshot = mcp_slides_client.get_slide_content(deck_ref, slide_index)
            return {"slide_snapshot": snapshot}
        except Exception as e:
            print(f"  [GoogleSlidesAgent] get_slide_content failed, using stub snapshot: {e}")

    # Stub snapshot for dev environments without credentials.
    snapshot = {
        "slide_index": slide_index,
        "title": "",
        "title_font_size": None,
        "bullets": [],
        "body": "",
        "source": "stub",
    }
    return {"slide_snapshot": snapshot}


# ── auto-apply (minor ops — no student approval) ───────────────────────────────

def auto_apply_node(state: PPTAgentState) -> dict:
    """
    MINOR severity: apply the planned ops directly without asking the student.

    Called when the agent classified the changes as routine (font nudge, ≤2 bullet
    tweaks).  After applying, triggers the whole-deck theme pass.
    """
    ops = state.get("planned_ops") or []
    deck_ref = state.get("deck_ref", "")
    slide_index = state.get("slide_index", 0)
    theme_spec = state.get("theme_spec")

    applied = []
    if mcp_slides_client.is_available() and not deck_ref.startswith("gslides:STUB-"):
        try:
            applied = mcp_slides_client.apply_ops_batch(deck_ref, slide_index, ops, theme_spec)
        except Exception as e:
            print(f"  [GoogleSlidesAgent] auto_apply_node: apply_ops_batch failed: {e}")
    else:
        for op in ops:
            print(f"  [GoogleSlidesAgent] (stub) auto-apply: op={op.get('op')} "
                  f"value={op.get('value')}")
        applied = ops  # treat all as applied in stub mode

    reasons = "; ".join(op.get("reason", op.get("op", "")) for op in applied) or \
              state.get("analysis", "")
    feedback = (
        f"Done — I automatically fixed: {reasons}. "
        "Theme applied across all slides."
    ) if applied else (
        state.get("analysis") or "Slide looks good — no changes needed."
    )

    return {
        "ai_feedback": feedback,
        "applied_ops": applied,
        "skill_delta": {"design": 0.1 * len(applied)},
        "status": "auto_applied",
    }


# ── apply approved change (significant ops — after student approval) ───────────

def apply_change_node(state: PPTAgentState) -> dict:
    """
    SIGNIFICANT severity, approved: apply all ops in proposed_change["all_ops"].

    Uses apply_ops_batch so content + formatting land in one round-trip.
    """
    proposed = state.get("proposed_change", {}) or {}
    all_ops = proposed.get("all_ops") or (
        [proposed] if proposed.get("op") else []
    )
    deck_ref = state.get("deck_ref", "")
    slide_index = state.get("slide_index", 0)
    theme_spec = state.get("theme_spec")
    applied_live = False

    applied = []
    if mcp_slides_client.is_available() and not deck_ref.startswith("gslides:STUB-"):
        try:
            applied = mcp_slides_client.apply_ops_batch(deck_ref, slide_index, all_ops, theme_spec)
            applied_live = bool(applied)
        except Exception as e:
            print(f"  [GoogleSlidesAgent] apply_change_node: apply_ops_batch failed: {e}")
    else:
        for op in all_ops:
            print(f"  [GoogleSlidesAgent] (stub) apply approved: op={op.get('op')} "
                  f"value={op.get('value')}")
        applied = all_ops  # treat all as applied in stub mode

    reason = proposed.get("reason", "")
    n_ops = len(applied)
    feedback = (
        f"Done — applied {n_ops} change{'s' if n_ops != 1 else ''}: {reason} "
        "Theme will be enforced across all slides."
    ) if applied else f"Change applied. {reason}"

    skill_delta: dict = {}
    for op in applied:
        if op.get("op") in ("set_bullets", "add_bullets", "set_cards", "set_layout"):
            skill_delta["content_depth"] = skill_delta.get("content_depth", 0) + 0.2
        elif op.get("op") == "font_title_size":
            skill_delta["design"] = skill_delta.get("design", 0) + 0.2
        else:
            skill_delta["design"] = skill_delta.get("design", 0) + 0.1

    return {
        "ai_feedback": feedback,
        "applied_ops": applied,
        "skill_delta": skill_delta,
        "status": "applied" if applied_live else "applied_stub",
    }


# ── enforce theme across the whole deck ───────────────────────────────────────

def apply_theme_all_slides_node(state: PPTAgentState) -> dict:
    """
    Sweep every slide in the deck and enforce the uniform theme (title + body font sizes).

    Called after any content/format apply so the deck always stays consistent.
    In stub mode it logs the intended action without making API calls.
    """
    deck_ref = state.get("deck_ref", "")
    theme_spec = state.get("theme_spec") or DEFAULT_THEME_SPEC
    title_pt = int(theme_spec.get("title_size_pt", DEFAULT_THEME_SPEC["title_size_pt"]))
    body_pt = int(theme_spec.get("body_size_pt", DEFAULT_THEME_SPEC["body_size_pt"]))
    n_slides = 0

    if mcp_slides_client.is_available() and not deck_ref.startswith("gslides:STUB-"):
        try:
            n_slides = mcp_slides_client.apply_theme_to_deck(deck_ref, theme_spec)
        except Exception as e:
            print(f"  [GoogleSlidesAgent] apply_theme_all_slides failed: {e}")
    else:
        print(f"  [GoogleSlidesAgent] (stub) theme: {title_pt}pt title, "
              f"{body_pt}pt body across all slides")

    existing_feedback = state.get("ai_feedback", "")
    theme_note = (
        f" Design enforced ({title_pt}pt title, {body_pt}pt body) across {n_slides} slide(s)."
        if n_slides else
        f" Design: {title_pt}pt title, {body_pt}pt body."
    )
    return {
        "ai_feedback": existing_feedback + theme_note,
        "theme_applied": True,
    }
