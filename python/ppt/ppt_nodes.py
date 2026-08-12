"""
Shared node library for the seminar PPT-preparation agents.

These nodes are tool-agnostic and reused by every tool agent (Google Slides now;
PowerPoint / Canva later). Only `read_slide` and `apply_change` / `auto_apply` /
`apply_theme_all_slides` are tool-bound and therefore live in each agent's own
module (e.g. agents/google_slides_agent_nodes.py).

Architecture (agent-driven mode):
  - The agent reads the slide, plans content + theme ops via RAG/LLM.
  - MINOR severity  → auto_apply_node (no student approval needed).
  - SIGNIFICANT severity → propose_change_node → wait_approval_node (HITL).
  - Students have NO manual edit controls; the `edit` body field is gone.

Severity is determined by the agent, not by what the student typed:
  - good        : slide already looks fine → verbal feedback only.
  - minor       : 1-2 small fixes (font nudge, ≤2 bullet tweaks) → auto-apply.
  - significant : content rewrite, empty slide, many bullets changed → HITL approval.
                  ADAPTIVE: downgraded to minor when rejection_count >= 2 (student
                  keeps rejecting → auto-apply to reduce friction).

Upgrades in this version:
  #5  Multi-slide context awareness (duplicate title detection, slide count warning).
  #4  Speaker notes auto-generation (set_speaker_notes op).
  #6  Image/diagram suggestion (verbal only, returned in state.image_suggestion).
  #7  Adaptive severity from session rejection history.
  #9  Spelling check deduplication via text hash cache.
  #10 RAG quality stat forwarding to ppt_session.record_rag_stat.
"""

import re
from typing import List, Literal, Optional, Tuple

from langgraph.types import interrupt

from ppt.ppt_state import PPTAgentState
from ppt.ppt_theme import (
    TITLE_FONT_SIZE_PT, BODY_FONT_SIZE_PT,
    MAX_BULLETS_PER_SLIDE, MIN_TITLE_FONT_SIZE_PT, MAX_WORDS_PER_BULLET,
)

# Threshold: if rejection_count >= this, downgrade significant → minor (adaptive).
_ADAPTIVE_REJECTION_THRESHOLD = 2

# Threshold: flag image suggestion if slide has this many bullets or more.
_IMAGE_SUGGESTION_MIN_BULLETS = 4

# Warn if the deck has more than this many slides.
_MAX_SUGGESTED_SLIDES = 12


# ── analyze / plan ─────────────────────────────────────────────────────────────

def analyze_slide_node(state: PPTAgentState) -> dict:
    """
    Two distinct review modes determined by whether the student asked a question:

    - CONTENT (student asked via /ppt/suggest): LLM answers the question and
      *says* suggested points. These are advisory — never applied to the deck
      (mode="content").

    - DESIGN (student navigated to a slide via /ppt/edit): the agent reads the
      current slide snapshot, uses RAG + LLM to plan the right content and theme
      ops, then classifies severity:
        · good        → verbal praise only.
        · minor       → auto-apply (font tweak, small bullet fix).
        · significant → HITL approval (content rewrite, empty slide, many changes).
                        Downgraded to minor when rejection_count >= threshold (#7).
    """
    slide_op = state.get("slide_op", "")       # "review" | "suggest" | ""
    snapshot = state.get("slide_snapshot") or {}
    coords = {
        "board": state.get("board"), "class_number": state.get("class_number"),
        "subject": state.get("subject"), "unit": state.get("unit"),
        "unit_title": state.get("unit_title"), "term": state.get("term"),
    }
    student_query = (state.get("student_query") or "").strip()
    session_id = state.get("session_id")
    slide_index = state.get("slide_index", 0)
    rejection_count = state.get("rejection_count", 0)
    all_slide_titles: List[str] = state.get("all_slide_titles") or []

    # ── CONTENT mode: student explicitly asked a question ─────────────────────
    if slide_op == "suggest" or student_query:
        query = student_query or snapshot.get("title") or state.get("unit_title") or ""
        rag_chunks: List[dict] = []
        rag_stats: dict = {"hits": 0, "avg_score": 0.0}
        if query:
            try:
                from ppt.ppt_rag import retrieve_context
                rag_chunks, rag_stats = retrieve_context(query, coords, limit=5)
            except Exception as e:
                print(f"  [analyze_slide] RAG retrieval failed: {e}")
        _forward_rag_stats(session_id, rag_stats)
        # Hybrid RAG: augment with free web search when the router chose web/hybrid.
        rag_chunks, source_used = _augment_with_web(
            query, rag_chunks, state.get("web_source") or "rag")
        try:
            from ppt.ppt_review import llm_review_content
            review = llm_review_content(
                snapshot, rag_chunks, state.get("unit_title") or "", student_query)
            return {
                "mode": "content",
                "severity": review["severity"],
                "analysis": review["critique"],
                "suggestions": review["suggested_bullets"],
                "rag_chunks": rag_chunks,
                "source_used": source_used,
                "planned_ops": [],
                "image_suggestion": None,
                "speaker_notes": None,
            }
        except Exception as e:
            print(f"  [analyze_slide] content review failed: {e}")
            return {"mode": "content", "severity": "good",
                    "analysis": "(Content review unavailable.)", "suggestions": [],
                    "rag_chunks": [], "planned_ops": [],
                    "image_suggestion": None, "speaker_notes": None}

    # ── DESIGN mode: agent plans content + theme ops ──────────────────────────
    title = (snapshot.get("title") or "").strip()
    bullets: List[str] = snapshot.get("bullets") or []
    title_fs = snapshot.get("title_font_size")
    unit_title = state.get("unit_title") or ""

    planned_ops: List[dict] = []
    issues: List[str] = []

    # ── Upgrade #5: Multi-slide context checks ─────────────────────────────────
    cross_slide_issues: List[str] = []
    if all_slide_titles:
        # Detect duplicate slide titles.
        current_title_lower = title.lower() if title else ""
        if current_title_lower:
            duplicates = [
                i for i, t in enumerate(all_slide_titles)
                if t.strip().lower() == current_title_lower and i != slide_index
            ]
            if duplicates:
                cross_slide_issues.append(
                    f"Slide title \"{title}\" is the same as slide(s) "
                    f"{[d + 1 for d in duplicates]} — consider making it unique."
                )
        # Warn if deck is very long.
        if len(all_slide_titles) > _MAX_SUGGESTED_SLIDES:
            cross_slide_issues.append(
                f"Your deck has {len(all_slide_titles)} slides — aim for "
                f"{_MAX_SUGGESTED_SLIDES} or fewer for a focused seminar."
            )

    # Detect near-duplicate CONTENT across slides (different titles, same points) so the
    # student is told instead of us silently rebuilding two identical slides.
    dup_slide = _most_overlapping_slide("\n".join(bullets) or snapshot.get("body", ""),
                                        state.get("other_slides") or [])
    if dup_slide:
        cross_slide_issues.append(
            f"This slide's content closely overlaps another slide (\"{dup_slide}\") — "
            "give one a distinct focus (e.g. overview vs. detail) or remove the duplicate."
        )

    # 1. Font size — title too small?
    if title_fs is not None and title_fs < MIN_TITLE_FONT_SIZE_PT:
        planned_ops.append({"op": "font_title_size", "value": TITLE_FONT_SIZE_PT,
                             "text": title or unit_title,
                             "reason": f"Title was {int(title_fs)}pt — too small; set to {int(TITLE_FONT_SIZE_PT)}pt."})
        issues.append(f"title font {int(title_fs)}pt → {int(TITLE_FONT_SIZE_PT)}pt")
    elif title_fs is not None and title_fs < TITLE_FONT_SIZE_PT:
        planned_ops.append({"op": "font_title_size", "value": TITLE_FONT_SIZE_PT,
                             "text": title or unit_title,
                             "reason": f"Title was {int(title_fs)}pt; theme requires {int(TITLE_FONT_SIZE_PT)}pt."})
        issues.append(f"title font {int(title_fs)}pt → {int(TITLE_FONT_SIZE_PT)}pt")

    # 2. Content — empty, overcrowded, OR prose → restructure into point-wise bullets.
    # When the student EXPLICITLY asked to edit (student_instruction present), force a
    # redesign even if the slide already looks fine — a flat bullet list can always be
    # upgraded to a designed layout, and "looks great, no change" is the wrong answer to
    # an explicit edit request. The student still approves/rejects the proposal.
    explicit_edit = bool((state.get("student_instruction") or "").strip())
    is_prose = any(len(line.split()) > MAX_WORDS_PER_BULLET for line in bullets)
    needs_restructure = ((not bullets) or (len(bullets) > MAX_BULLETS_PER_SLIDE)
                         or is_prose or explicit_edit)
    theme_spec: dict = state.get("theme_spec") or {}
    rag_chunks: List[dict] = []
    rag_stats: dict = {"hits": 0, "avg_score": 0.0}
    if needs_restructure:
        query = title or unit_title
        if query:
            try:
                from ppt.ppt_rag import retrieve_context
                rag_chunks, rag_stats = retrieve_context(query, coords, limit=5)
            except Exception as e:
                print(f"  [analyze_slide] RAG retrieval failed: {e}")
        _forward_rag_stats(session_id, rag_stats)
        # Hybrid RAG on the edit path too: pull the open web when the router chose web/hybrid.
        rag_chunks, _ = _augment_with_web(query, rag_chunks, state.get("web_source") or "rag")
        # Preferred output: a designed multi-card layout (not a flat bullet list). Falls back
        # to point-wise bullets when the content can't be split into 2+ themed cards.
        layout_built = False
        try:
            from ppt.ppt_review import llm_build_slide_layout
            # Cross-slide awareness: tell the designer what the OTHER slides cover so this
            # slide stays distinct (avoids two slides ending up with the same content).
            # Prefer the "Title: content" summaries read from the deck; fall back to titles.
            other_slides = state.get("other_slides") or [
                t for i, t in enumerate(all_slide_titles) if i != slide_index]
            # Give each slide a DIFFERENT design: avoid layouts already used on other slides.
            avoid_layouts = state.get("avoid_layouts") or []
            layout = llm_build_slide_layout(snapshot, rag_chunks, unit_title,
                                            other_slides, avoid_layouts)
            if layout.get("layout"):
                kind = layout["layout"]
                if not bullets:
                    reason = f"Slide had no content — built a curriculum-aligned {kind} layout."
                elif is_prose:
                    reason = f"Slide was prose — reorganized it into a {kind} layout."
                elif explicit_edit:
                    reason = f"You asked to edit — upgraded the {len(bullets)} bullets into a designed {kind} layout."
                else:
                    reason = f"Slide had {len(bullets)} bullets — restructured into a {kind} layout."
                planned_ops.append({"op": "set_layout", "value": layout, "reason": reason,
                                    "theme_spec": theme_spec})
                issues.append(f"organized into a {kind} layout")
                layout_built = True
        except Exception as e:
            print(f"  [analyze_slide] slide layout planning failed: {e}")

        if not layout_built:
            try:
                from ppt.ppt_review import llm_restructure_slide
                review = llm_restructure_slide(snapshot, rag_chunks, unit_title)
                suggested = review.get("suggested_bullets") or []
                highlight_terms = review.get("highlight_terms") or []
                if suggested:
                    if not bullets:
                        reason = "Slide had no content — agent generated curriculum-aligned bullets."
                    elif is_prose:
                        reason = "Slide was prose — rewrote it as concise point-wise bullets."
                    else:
                        reason = f"Slide had {len(bullets)} bullets (>{MAX_BULLETS_PER_SLIDE}) — trimmed to key points."
                    planned_ops.append({"op": "set_bullets", "value": suggested[:MAX_BULLETS_PER_SLIDE],
                                        "reason": reason, "theme_spec": theme_spec})
                    issues.append(
                        "added bullets" if not bullets
                        else ("restructured prose into " f"{len(suggested[:MAX_BULLETS_PER_SLIDE])} points"
                              if is_prose else
                              f"trimmed bullets {len(bullets)} → {len(suggested[:MAX_BULLETS_PER_SLIDE])}")
                    )
                    if highlight_terms:
                        planned_ops.append({"op": "highlight_terms", "value": highlight_terms,
                                            "reason": "Bolded the key terms."})
                        issues.append("bolded key terms")
            except Exception as e:
                print(f"  [analyze_slide] LLM content planning failed: {e}")

    # 2b. Spelling — only when we KEEP the existing text; skip if we're rewriting the body
    #     (set_bullets / set_cards) or if text is unchanged (cache).
    if not any(op.get("op") in ("set_bullets", "set_cards", "set_layout") for op in planned_ops):
        try:
            from ppt.ppt_review import llm_check_spelling
            from ppt.ppt_session import get_spell_cache, update_spell_cache, compute_text_hash

            slide_text = "\n".join([title] + bullets)
            current_hash = compute_text_hash(slide_text)
            cached_hash: Optional[str] = None
            if session_id:
                cached_hash = get_spell_cache(session_id, slide_index)

            spell_result = llm_check_spelling(snapshot,
                                              cached_hash=cached_hash,
                                              current_hash=current_hash)
            # Update cache regardless of hit/miss (always store latest hash).
            if session_id and not spell_result.get("cached"):
                update_spell_cache(session_id, slide_index, slide_text)

            corrections = spell_result.get("corrections") or []
            if corrections:
                planned_ops.append({
                    "op": "fix_spelling", "value": corrections,
                    "reason": "Fixed spelling: " + ", ".join(
                        f"{c['wrong']}→{c['right']}" for c in corrections[:5]),
                })
                issues.append(f"{len(corrections)} spelling fix(es)")
        except Exception as e:
            print(f"  [analyze_slide] spelling check failed: {e}")

    # 3. Missing title — structural note (not an op, just verbal).
    if not title:
        issues.append("slide has no title")

    # ── Upgrade #5: Append cross-slide issues as verbal feedback ──────────────
    cross_slide_feedback = " ".join(cross_slide_issues)

    # ── Classify severity ──────────────────────────────────────────────────────
    text_change_ops = ("set_bullets", "add_bullets", "set_cards", "set_layout", "fix_spelling")
    if not planned_ops and not issues:
        severity: Literal["good", "minor", "significant"] = "good"
        analysis = "This slide's content and formatting match the theme — looks great."
    elif any(op.get("op") in text_change_ops for op in planned_ops):
        empty_slide = not bullets
        has_spelling = any(op.get("op") == "fix_spelling" for op in planned_ops)
        severity = ("minor" if (empty_slide and not has_spelling and len(planned_ops) <= 2)
                    else "significant")
        analysis = "; ".join(issues) + "."
    elif planned_ops:
        severity = "minor"
        analysis = "; ".join(issues) + "."
    else:
        severity = "good"
        analysis = "; ".join(issues) + "."

    # ── Upgrade #7: Adaptive severity — downgrade if student keeps rejecting ──
    if severity == "significant" and rejection_count >= _ADAPTIVE_REJECTION_THRESHOLD:
        severity = "minor"
        analysis += (f" (Auto-applying — you've declined {rejection_count} suggestions; "
                     "applying this one automatically.)")

    # Prepend cross-slide feedback to analysis.
    if cross_slide_feedback:
        analysis = cross_slide_feedback + " | " + analysis

    # ── Upgrade #4: Speaker notes ─────────────────────────────────────────────
    speaker_notes: Optional[str] = None
    if severity in ("minor", "significant") or planned_ops:
        # Generate notes based on the *current* slide content (notes for what's there now).
        # If we're also restructuring bullets, use the planned bullets for notes.
        effective_snapshot = dict(snapshot)
        for op in planned_ops:
            if op.get("op") == "set_bullets":
                effective_snapshot = {**snapshot, "bullets": op["value"]}
                break
            if op.get("op") == "set_layout":
                effective_snapshot = {**snapshot, "bullets": _layout_to_bullets(op["value"])}
                break
            if op.get("op") == "set_cards":
                effective_snapshot = {**snapshot, "bullets": _cards_to_bullets(op["value"])}
                break
        try:
            from ppt.ppt_review import llm_generate_speaker_notes
            speaker_notes = llm_generate_speaker_notes(
                effective_snapshot, rag_chunks, unit_title) or None
            if speaker_notes:
                planned_ops.append({"op": "set_speaker_notes", "value": speaker_notes,
                                    "reason": "Generated speaking script for the presenter."})
        except Exception as e:
            print(f"  [analyze_slide] speaker notes generation failed: {e}")

    # ── Upgrade #6: Image suggestion (verbal, ≥4 bullets, no existing image) ──
    image_suggestion: Optional[str] = None
    effective_bullets = (
        next((op["value"] for op in planned_ops if op.get("op") == "set_bullets"), None)
        or next((_layout_to_bullets(op["value"]) for op in planned_ops
                 if op.get("op") == "set_layout"), None)
        or next((_cards_to_bullets(op["value"]) for op in planned_ops
                 if op.get("op") == "set_cards"), None)
        or bullets
    )
    has_existing_image = bool(snapshot.get("has_image"))
    if len(effective_bullets) >= _IMAGE_SUGGESTION_MIN_BULLETS and not has_existing_image:
        try:
            from ppt.ppt_review import llm_suggest_image
            effective_snap = {**snapshot, "bullets": effective_bullets}
            image_suggestion = llm_suggest_image(effective_snap, unit_title)
        except Exception as e:
            print(f"  [analyze_slide] image suggestion failed: {e}")

    return {
        "mode": "design",
        "severity": severity,
        "analysis": analysis,
        "suggestions": [],
        "rag_chunks": rag_chunks,
        "planned_ops": planned_ops,
        "image_suggestion": image_suggestion,
        "speaker_notes": speaker_notes,
    }


def _cards_to_bullets(cards: List[dict]) -> List[str]:
    """Flatten a set_cards value into flat bullet strings (for speaker notes / image checks)."""
    out: List[str] = []
    for card in cards or []:
        for p in (card.get("points") or []):
            if isinstance(p, dict):
                lead = str(p.get("lead", "") or "").strip()
                text = str(p.get("text", "") or "").strip()
                out.append(f"{lead}: {text}".strip(": ").strip() if lead else text)
            elif isinstance(p, str) and p.strip():
                out.append(p.strip())
    return [b for b in out if b]


def _layout_to_bullets(layout: dict) -> List[str]:
    """Flatten any set_layout value (cards/steps/timeline/comparison/accent_list) into flat
    bullet strings — used for speaker-notes and image-suggestion heuristics."""
    if not isinstance(layout, dict):
        return []
    kind = layout.get("layout")
    out: List[str] = []
    if kind == "cards":
        out = _cards_to_bullets(layout.get("cards"))
    elif kind == "comparison":
        out = _cards_to_bullets([layout.get("left") or {}, layout.get("right") or {}])
    elif kind == "steps":
        for s in layout.get("steps") or []:
            t = f"{s.get('title', '')}: {s.get('text', '')}".strip(": ").strip()
            if t:
                out.append(t)
    elif kind == "timeline":
        for e in layout.get("events") or []:
            head = " ".join(x for x in [e.get("when", ""), e.get("title", "")] if x).strip()
            t = f"{head}: {e.get('text', '')}".strip(": ").strip()
            if t:
                out.append(t)
    elif kind in ("accent_list", "icon_grid"):
        for it in layout.get("items") or []:
            lead = str(it.get("label") or it.get("lead") or "").strip()
            text = str(it.get("text", "") or "").strip()
            t = f"{lead}: {text}".strip(": ").strip() if lead else text
            if t:
                out.append(t)
    return [b for b in out if b]


def _forward_rag_stats(session_id: Optional[str], stats: dict) -> None:
    """Forward RAG stats to ppt_session for quality logging (#10)."""
    if not session_id:
        return
    try:
        from ppt.ppt_session import record_rag_stat
        record_rag_stat(session_id, stats.get("hits", 0), stats.get("avg_score", 0.0))
    except Exception as e:
        print(f"  [analyze_slide] rag stat forwarding failed: {e}")


_OVERLAP_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "with", "is", "are",
    "their", "them", "they", "that", "this", "these", "those", "from", "by", "as", "at",
    "it", "its", "into", "can", "help", "helps", "such",
}


def _significant_words(text: str) -> set:
    return {w for w in re.findall(r"[a-zA-Z]+", (text or "").lower())
            if len(w) > 2 and w not in _OVERLAP_STOPWORDS}


def _most_overlapping_slide(current_text: str, other_slides: List[str],
                            threshold: float = 0.5, min_shared: int = 5) -> Optional[str]:
    """Return the title of the other slide whose content most overlaps this one, if enough.

    Uses the overlap coefficient (shared / smaller set) so reworded duplicates still score
    high, and requires at least `min_shared` common significant words to avoid false hits on
    short slides. other_slides are "Title: content" strings. None when nothing overlaps enough.
    """
    cur = _significant_words(current_text)
    if len(cur) < min_shared:
        return None
    best_title, best_score = None, 0.0
    for entry in other_slides:
        title = entry.split(":", 1)[0].strip()
        other = _significant_words(entry)
        if len(other) < min_shared:
            continue
        shared = len(cur & other)
        score = shared / min(len(cur), len(other))
        if shared >= min_shared and score > best_score:
            best_title, best_score = title, score
    return best_title if best_score >= threshold else None


def _augment_with_web(query: str, rag_chunks: List[dict], web_source: str) -> Tuple[List[dict], str]:
    """Hybrid RAG: append free web-search chunks to the Qdrant chunks when the router
    asked for the web ('web' or 'hybrid'). Curriculum (Qdrant) chunks stay first.

    Returns (merged_chunks, source_used) where source_used is 'rag' | 'web' | 'hybrid'.
    Degrades gracefully: any failure or a disabled feature leaves rag_chunks untouched.
    """
    if web_source not in ("web", "hybrid") or not (query or "").strip():
        return rag_chunks, "rag"
    try:
        from ppt.ppt_websearch import web_context, is_enabled
        if not is_enabled():
            return rag_chunks, "rag"
        web_chunks, _ = web_context(query)
    except Exception as e:
        print(f"  [analyze_slide] web augmentation failed: {e}")
        return rag_chunks, "rag"
    if not web_chunks:
        return rag_chunks, ("rag" if rag_chunks else "rag")
    merged = (rag_chunks or []) + web_chunks
    return merged, ("hybrid" if rag_chunks else "web")


def route_analysis(state: PPTAgentState) -> str:
    """Conditional edge out of analyze_slide: content → say points; design → by severity."""
    if state.get("mode") == "content":
        return "content"
    return state.get("severity", "good")


# ── verbal branch (no deck edit) ──────────────────────────────────────────────

def say_suggestions_node(state: PPTAgentState) -> dict:
    """
    CONTENT mode: tell the student the points — the agent does NOT edit the deck.
    The student reads the answer + suggested points.
    """
    return {
        "ai_feedback": state.get("analysis", ""),
        "suggestions": state.get("suggestions", []),
        "skill_delta": {},
        "status": "suggested",
        "applied_ops": [],
        "theme_applied": False,
        "image_suggestion": state.get("image_suggestion"),
        "speaker_notes": None,
    }


def feedback_only_node(state: PPTAgentState) -> dict:
    feedback = state.get("analysis") or "Nice — this slide already looks great."
    # Append cross-slide suggestion if present (from analysis prefix).
    return {
        "ai_feedback": feedback,
        "skill_delta": {"design": 0.1},
        "status": "feedback_only",
        "applied_ops": [],
        "theme_applied": False,
        "image_suggestion": state.get("image_suggestion"),
        "speaker_notes": None,
    }


# ── propose → HITL → apply / explain / skip (significant DESIGN changes) ──────

def propose_change_node(state: PPTAgentState) -> dict:
    """
    Significant DESIGN issue: surface the planned ops as a proposal for the student.
    The first meaningful op becomes the proposed_change shown in the approval pop-up.
    Speaker-notes and image-suggestion ops are excluded from HITL (they are auto or verbal).
    """
    ops = state.get("planned_ops") or []
    # Primary proposed change = first content op (exclude speaker notes / image ops from HITL).
    hitl_ops = [op for op in ops if op.get("op") not in ("set_speaker_notes", "suggest_image")]
    primary = next(
        (op for op in hitl_ops if op.get("op") in ("set_layout", "set_cards", "set_bullets", "add_bullets")),
        hitl_ops[0] if hitl_ops else {}
    )
    primary_with_meta = {
        **primary,
        "slide_index": state.get("slide_index"),
        "reason": primary.get("reason") or state.get("analysis", ""),
        "all_ops": ops,
    }
    return {"proposed_change": primary_with_meta,
            "image_suggestion": state.get("image_suggestion"),
            "speaker_notes": state.get("speaker_notes")}


def wait_approval_node(state: PPTAgentState) -> dict:
    """
    Pause the graph and surface the proposal to the frontend.

    interrupt() returns control to the caller (FastAPI). The run resumes when the
    caller calls graph.invoke(Command(resume=<decision>), config) with the same thread_id.
    The value passed to interrupt() is what /ppt/edit returns as `proposed_change`.
    """
    decision = interrupt({
        "proposed_change": state.get("proposed_change"),
        "analysis": state.get("analysis"),
        "slide_index": state.get("slide_index"),
        "image_suggestion": state.get("image_suggestion"),
    })
    return {"decision": decision}


def route_decision(state: PPTAgentState) -> str:
    """Conditional edge out of wait_approval."""
    decision = state.get("decision")
    if decision in ("approve", "reject", "skip"):
        return decision
    return "skip"


def explain_manual_node(state: PPTAgentState) -> dict:
    """Student rejected the auto-fix → walk them through doing it themselves."""
    proposed = state.get("proposed_change", {}) or {}
    op = proposed.get("op", "")
    if op == "font_title_size":
        how = f"select the title text box, then set the font size to {proposed.get('value', int(TITLE_FONT_SIZE_PT))}pt."
    elif op == "set_layout":
        kind = (proposed.get("value") or {}).get("layout", "structured")
        how = (f"reorganize this slide into a {kind} layout — arrange the points into that "
               "structure using shapes and text boxes in your slide editor.")
    elif op == "set_cards":
        how = ("group your points into two or three themed cards — insert a rounded rectangle "
               "for each, add a heading, and list its points inside.")
    elif op in ("set_bullets", "add_bullets"):
        how = "click the body area and type the bullet points you'd like to show."
    else:
        how = "make the change manually in your slide editor."
    return {
        "ai_feedback": f"No problem — here's how to do it yourself: {how}",
        "skill_delta": {"design": 0.15},
        "status": "explained_manual",
        "applied_ops": [],
        "theme_applied": False,
        "image_suggestion": state.get("image_suggestion"),
        "speaker_notes": None,
    }


def skip_change_node(state: PPTAgentState) -> dict:
    return {
        "ai_feedback": "Skipped for now. We'll revisit this slide before the final review.",
        "skill_delta": {},
        "status": "skipped",
        "applied_ops": [],
        "theme_applied": False,
        "image_suggestion": state.get("image_suggestion"),
        "speaker_notes": None,
    }


# ── score ─────────────────────────────────────────────────────────────────────

def update_score_node(state: PPTAgentState) -> dict:
    """
    Update the design-skill tracker.

    M1: pass the skill_delta through in the final state.
    M6 will persist it via the seminar skill tracker (seminar_engine.py).
    """
    return {"status": "done", "skill_delta": state.get("skill_delta", {})}
