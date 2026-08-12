"""
Google Slides Agent — a dedicated LangGraph StateGraph for the seminar PPT co-pilot.

This is one of several per-tool agents (PowerPoint / Canva to follow), each with its own
compiled graph and its own MemorySaver checkpoint store. They share the tool-agnostic node
library in ppt_nodes.py; only read_slide / auto_apply / apply_change /
apply_theme_all_slides are Google-Slides-bound (see agents/google_slides_agent_nodes.py).

Graph topology
──────────────
                            ┌─► say_suggestions ──────────────────────────┐
read_slide ► analyze_slide ─┼─► feedback_only ─────────────────────────── ┤
                            │                                              │
                            ├─► auto_apply ─► apply_theme_all_slides ──── ┤
                            │                                              ▼
                            └─► propose_change ► wait_approval          update_score ► END
                                                    ├─approve─► apply_change ► apply_theme_all_slides ─┘
                                                    ├─reject──► explain_manual ──────────────────────────┘
                                                    └─skip────► skip_change ───────────────────────────┘

Severity is set by the agent, not by the student:
  content     → say_suggestions (verbal only, no deck change)
  good        → feedback_only   (verbal praise, no deck change)
  minor       → auto_apply      (agent auto-applies without asking)
  significant → propose_change  → wait_approval (HITL pop-up)
"""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from ppt.ppt_state import PPTAgentState
from ppt.ppt_nodes import (
    analyze_slide_node,
    say_suggestions_node,
    feedback_only_node,
    propose_change_node,
    wait_approval_node,
    explain_manual_node,
    skip_change_node,
    update_score_node,
    route_analysis,
    route_decision,
)
from agents.google_slides_agent_nodes import (
    read_slide_node,
    auto_apply_node,
    apply_change_node,
    apply_theme_all_slides_node,
)


def build_google_slides_agent():
    """Build and compile the Google Slides Agent graph."""
    g = StateGraph(PPTAgentState)

    # ── nodes ─────────────────────────────────────────────────────────────────
    g.add_node("read_slide",              read_slide_node)              # Slides-bound: read snapshot
    g.add_node("analyze_slide",           analyze_slide_node)           # plan content + theme ops
    g.add_node("say_suggestions",         say_suggestions_node)         # content: verbal, no edit
    g.add_node("feedback_only",           feedback_only_node)           # design: already looks good
    g.add_node("auto_apply",              auto_apply_node)              # minor: apply without asking
    g.add_node("apply_theme_all_slides",  apply_theme_all_slides_node)  # Slides-bound: enforce theme
    g.add_node("propose_change",          propose_change_node)          # significant: build proposal
    g.add_node("wait_approval",           wait_approval_node)           # HITL interrupt()
    g.add_node("apply_change",            apply_change_node)            # Slides-bound: apply approved
    g.add_node("explain_manual",          explain_manual_node)          # student rejected → manual tips
    g.add_node("skip_change",             skip_change_node)             # student skipped
    g.add_node("update_score",            update_score_node)            # accumulate skill_delta

    # ── edges ─────────────────────────────────────────────────────────────────
    g.set_entry_point("read_slide")
    g.add_edge("read_slide", "analyze_slide")

    g.add_conditional_edges("analyze_slide", route_analysis, {
        "content":     "say_suggestions",   # student asked → verbal, no deck edit
        "good":        "feedback_only",      # slide is fine → praise only
        "minor":       "auto_apply",         # small fix → agent auto-applies
        "significant": "propose_change",     # big change → HITL approval
    })

    # minor path: auto-apply → theme sweep → score
    g.add_edge("auto_apply", "apply_theme_all_slides")

    # significant path: propose → HITL → branch
    g.add_edge("propose_change", "wait_approval")
    g.add_conditional_edges("wait_approval", route_decision, {
        "approve": "apply_change",
        "reject":  "explain_manual",
        "skip":    "skip_change",
    })
    # approved: apply change → theme sweep → score
    g.add_edge("apply_change", "apply_theme_all_slides")

    # All paths converge at update_score then END.
    for n in ["say_suggestions", "feedback_only",
              "apply_theme_all_slides",   # reached from auto_apply and apply_change
              "explain_manual", "skip_change"]:
        g.add_edge(n, "update_score")
    g.add_edge("update_score", END)

    # MemorySaver enables interrupt()/Command(resume=...) across the two HTTP calls
    # (/ppt/edit pauses at wait_approval; /ppt/decide resumes with same thread_id).
    return g.compile(checkpointer=MemorySaver())
