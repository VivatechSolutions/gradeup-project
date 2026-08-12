"""
Shared state schema for the seminar PPT-preparation agents.

Every tool-specific agent (Google Slides now; PowerPoint / Canva later) runs on this
same TypedDict. See SEMINAR_PPT_AUTOMATION_PLAN.md §2.
"""

from typing import TypedDict, List, Dict, Any, Optional, Literal


class PPTAgentState(TypedDict, total=False):
    # ── identity / routing ────────────────────────────────
    session_id: str
    student_id: str
    deck_ref: str                   # "gslides:<presentationId>" | "pptx:<path>" | "canva:<id>"
    slide_index: int
    slide_op: str                   # "review" (agent decides) | "suggest" (verbal Q&A only)
    student_query: str              # the student's question when slide_op == "suggest"

    # ── hybrid RAG routing (see ppt_source_router / ppt_websearch) ────────
    student_instruction: str        # the raw student chat message that drove this turn
    web_source: str                 # "rag" | "web" | "hybrid" — chosen by decide_source()
    source_used: str                # what actually fed the answer: "rag" | "web" | "hybrid"
    image_results: List[Dict[str, Any]]  # web image search results (chat-only, never inserted)

    # ── curriculum coordinates (drive RAG filters) ────────
    board: str                      # -> board_filter
    class_number: str               # -> class_filter
    subject: Optional[str]          # -> subject_filter
    unit: int                       # chapter number -> unit_filter
    unit_title: str                 # chapter title  -> unit_title_filter + deck title
    term: Optional[str]             # -> term_filter (term-split state books only)

    # ── agent-chosen deck design (class/subject/topic aware) ──
    theme_spec: Dict[str, Any]      # background/fonts/colors/bullets — see ppt_theme.DEFAULT_THEME_SPEC

    # ── deck metadata ─────────────────────────────────────
    deck_mode: str                  # "real" | "stub" — whether a live Google Slides deck exists
    all_slide_titles: List[str]     # titles of every slide in the deck (for cross-slide context)

    # short "Title: content" summaries of the OTHER slides (cross-slide distinctness).
    other_slides: List[str]
    # layout kinds already used on other slides — so each slide gets a different design.
    avoid_layouts: List[str]

    # ── session history (adaptive behaviour) ─────────────
    rejection_count: int            # how many HITL proposals the student has rejected so far

    # ── slide snapshot (read from the tool) ───────────────
    slide_snapshot: Dict[str, Any]  # current slide text + design pulled from the tool

    # ── agent-planned operations ──────────────────────────
    # The list of ops the agent decided should be applied (content + theme).
    # Each entry: {"op": str, "value": Any, ...}
    planned_ops: List[Dict[str, Any]]

    # What was actually written to the deck after apply.
    applied_ops: List[Dict[str, Any]]

    # True once the whole-deck theme pass has run for this session turn.
    theme_applied: bool

    # ── analysis output ───────────────────────────────────
    rag_chunks: List[Dict[str, Any]]            # from search_qdrant()
    mode: Literal["content", "design"]          # content = verbal points; design = auto/HITL apply
    severity: Literal["good", "minor", "significant"]
    analysis: str                                # LLM reasoning / critique / answer
    suggestions: List[str]                       # content points to SAY (never auto-applied)

    # ── proposal / HITL (significant changes only) ────────
    proposed_change: Optional[Dict[str, Any]]   # concrete tool op to apply
    decision: Optional[Literal["approve", "reject", "skip"]]

    # ── outputs ───────────────────────────────────────────
    ai_feedback: str
    skill_delta: Dict[str, float]   # {"design": +0.1, "content_depth": +0.2}
    status: str
    image_suggestion: Optional[str]  # plain-English image/diagram suggestion (verbal only)
    speaker_notes: Optional[str]     # generated speaker notes for the slide
