"""
Builds the six-phase avatar lesson for a section and stores it section by section.

One call - ``build_document_lessons(document_id)`` - walks a document's
structured.json, and for every section the subject pattern covers:

    LLM 1  lesson plan      four-option hook MCQ with per-option reasons,
                            real world, explore, ONE mystery, explain-back
                            rubric - each with the scene to render
                                                         (avatar_lesson_patterns.LESSON_PLAN_PROMPT)
    LLM 2  teaching script  teaching segments only (no checkpoints, no cards),
                            length set by the section, exactly
                            EXPLANATION_IMAGES "[image: ...]" markers inline,
                            last segment answers the hook
                                                         (enrich_section_avatar_style + AVATAR_TEACH_PROMPT)
    pictures                each spec says "generate" (a 3D render via
                            avatar_images) or "search" (a REAL photo via
                            avatar_visuals.find_visual - the web search + vision
                            gate - for a real source, place or object; the
                            subject's picture_policy decides): the hook (the
                            question scene, plus ONE generated 2x2 picture with
                            a panel per option badged A-D), the explanation's
                            markers, real world, explore (when it asked for
                            one), mystery - at most seven; a search that finds
                            nothing clean falls back to a render; a mystery
                            with no picture is dropped, it IS the picture; an
                            explanation marker with no picture is removed
    narration               every spoken node, in play order, via avatar_tts

English readings (user request 2026-09-23) change the script and add a phase:

    story / supplementary   LLM 2 teaches the reading PART BY PART - the book's
                            own breaks (split_reading_parts), one entry per
                            part, the book's comprehension questions covered
                            (never asked, never stored)
                            (READING_TEACH_PROMPT); ``explanation.parts[]``
    story (first prose)     + a GRAMMAR phase, the next part: the unit's
                            Grammar section, or grammar the lesson decides
                            from its language exercises (GRAMMAR_PROMPT),
                            written alongside the plan
    poem                    + a SING-ALONG phase before the explanation: "Would
                            you like to join me?", the poem's own lines sung
                            one by one (narrated at a slower pace), "sing the
                            missing word" blanks (SING_ALONG_PROMPT)

then writes the section into ``outputs/<document_id>/enriched.json`` before
moving to the next one, so a crash or a gateway timeout keeps every finished
section. Nothing here runs at session time: ``avatar_engine.start_session``
only reads what this stored.

Play order: hook -> [sing_along] -> explanation -> [grammar] -> real_world ->
explore -> mystery -> explain_back.
"""

from __future__ import annotations

import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from logger import get_logger

import avatar_lesson_patterns as patterns
from avatar_lesson_patterns import (
    EXPLANATION_IMAGES, LessonPattern, grammar_prompt, image_prompt_of, iter_spoken_nodes,
    lesson_plan_prompt, normalize_lesson, phase, reading_teach_prompt, sing_along_prompt,
    split_reading_parts, teach_prompt, textbook_activity,
)
from avatar_text_utils import IMAGE_MARKER_RE, parse_picture_marker, tidy_spacing

logger = get_logger(__name__)

ProgressCallback = Callable[[Dict[str, Any]], None]

# Hard ceiling on generated pictures per section (user decisions 2026-09-17/18):
# hook 2 (the question scene + the four-option grid) + explanation
# EXPLANATION_IMAGES (2) + real world 1 + explore 1 + mystery 1. Rendered in
# play order; anything past the ceiling is simply not rendered.
MAX_IMAGES = max(1, int(os.getenv("AVATAR_LESSON_MAX_IMAGES", "7")))
# Appended to the hook's GENERATED question scene so the picture shows the
# set-up, not the answer (the four outcomes are the options grid's job).
NEUTRAL_MOMENT = ("A calm, ordinary moment before the outcome: nothing in the picture shows or "
                  "hints at what happens next.")
# A searched picture: vision checks per query, and how much of the query must
# be words the section itself uses (drift guard - a query the section never
# raised found an off-syllabus picture once; see avatar_visuals).
PICTURE_SEARCH_TRIES = max(1, int(os.getenv("AVATAR_LESSON_PICTURE_TRIES", "4")))
PICTURE_SEARCH_GROUNDING = float(os.getenv("AVATAR_LESSON_PICTURE_GROUNDING", "0.34"))
# Keys a searched picture carries that the lesson does not use (the question
# fields belong to the older enrichment; the spoken line is the writer's job).
_SEARCH_DROP_KEYS = ("walkthrough", "look_prompt", "look_answer", "avatar_line")
# The sing-along's lines are narrated slower than speech - a recitation pace.
SING_PACE = float(os.getenv("AVATAR_SING_PACE", "0.9"))
# A whole story, part by part, is a long JSON reply.
READING_MAX_TOKENS = int(os.getenv("AVATAR_READING_MAX_TOKENS", "12000"))


# ══════════════════════════════════════════════════════════════════════════════
#  LLM plumbing (shares the enricher's client - Gemini goes direct, see
#  enrichment_pipeline._DirectChat)
# ══════════════════════════════════════════════════════════════════════════════

def _lesson_model() -> str:
    from enrichment_pipeline import AVATAR_LESSON_MODEL
    return AVATAR_LESSON_MODEL


def _llm_json(enricher: Any, system_prompt: str, user_prompt: str,
              max_tokens: int = 4000) -> Optional[Dict[str, Any]]:
    """One JSON completion on the lesson model, parsed with the enricher's repairs."""
    raw = enricher._call_llm(system_prompt, user_prompt, max_tokens=max_tokens,
                             llm=enricher._avatar_client(_lesson_model()))
    if not raw:
        return None
    parsed = enricher._parse_json_response(raw)
    return parsed if isinstance(parsed, dict) else None


def _section_context(content: str, section_title: str, unit_title: str,
                     subject: str, class_number: str) -> str:
    head = f"Subject: {subject or 'unknown'} — Class {class_number or '?'}\n" \
           f"Unit: {unit_title}\nSection: {section_title}\n\n"
    return head + f"Content:\n{content[:8000]}"


# ══════════════════════════════════════════════════════════════════════════════
#  The two LLM steps
# ══════════════════════════════════════════════════════════════════════════════

def _plan_user_prompt(ctx: str, section: Dict[str, Any], pattern: LessonPattern) -> str:
    user = ctx
    activity = textbook_activity(section) if pattern.explore_kind == "hands_on_activity" else None
    if activity:
        user += (
            "\n\nTEXTBOOK ACTIVITY (use THIS for the explore phase - its materials and steps, "
            f"not a different activity):\nTitle: {activity['title']}\n"
            + (f"Materials: {', '.join(activity['materials'])}\n" if activity["materials"] else "")
            + "Steps:\n" + "\n".join(f"{i + 1}. {s}" for i, s in enumerate(activity["steps"]))
            + f"\nFull text:\n{activity['text'][:1500]}"
        )
    return user + "\n\nReturn in the JSON format specified."


def _hook_context(hook: Optional[Dict[str, Any]]) -> str:
    """The hook, as the teaching prompt needs to see it."""
    if not hook:
        return ""
    lines = [f"HOOK QUESTION (already asked before this explanation): {hook['question']}"]
    if hook.get("scenario"):
        lines.insert(1, f"Scenario: {hook['scenario']}")
    for k, v in hook["options"].items():
        mark = " (correct)" if k == hook["answer"] else ""
        lines.append(f"  {k}. {v}{mark}")
    lines.append("Your LAST segment must return to this question and answer it plainly "
                 "(role: \"hook_answer\").")
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
#  English: a reading part by part, its grammar, a poem sung
# ══════════════════════════════════════════════════════════════════════════════

def lesson_extras(target: Dict[str, Any]) -> Dict[str, Any]:
    """A target's English-only inputs (eligible_sections) as build_section_lesson kwargs."""
    return {"reading_text": target.get("reading_text") or "",
            "reading_notes": target.get("reading_notes") or "",
            "check_groups": target.get("check_groups") or [],
            "reading_breaks": target.get("reading_breaks") or [],
            "grammar_source": target.get("grammar_source")}


def _reading_user_prompt(section_title: str, unit_title: str, class_number: str, kind: str,
                         notes: str, parts: List[Dict[str, Any]], reading_questions: List[str],
                         hook: Optional[Dict[str, Any]]) -> str:
    lines = [f"Subject: English — Class {class_number or '?'}", f"Unit: {unit_title}",
             f"Reading: {section_title} ({kind})"]
    if notes.strip():
        lines += ["", notes.strip()[:2500]]
    lines += ["", f"THE READING, IN {len(parts)} PART(S):"]
    for p in parts:
        lines += ["", f"=== PART {p['part']} ===", p["text"]]
        if p["questions"]:
            lines.append("Questions the textbook asks about THIS part (your teaching of it must make "
                         "each answer clear; never ask them):")
            lines += [f"- {q}" for q in p["questions"]]
    if reading_questions:
        lines += ["", "Questions the textbook asks about the reading, in story order (each answer "
                      "must be clear from the part whose events answer it; never ask them):"]
        lines += [f"- {q}" for q in reading_questions]
    hook_ctx = _hook_context(hook)
    if hook_ctx:
        lines += ["", hook_ctx.replace("Your LAST segment", "The LAST segment of the LAST part")]
    lines += ["", "Return in the JSON format specified."]
    return "\n".join(lines)


def _reading_teaching(raw: Optional[Dict[str, Any]], parts: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """The writer's parts flattened into one numbered script: every segment
    carries ``part`` and ``explanation.parts[]`` names each part's segments.
    None when a part came back empty (the builder asks again).

    The book's questions steered the writer but are not stored: the
    explanation is spoken straight through, it asks nothing (user decision
    2026-09-23)."""
    from enrichment_pipeline import normalize_avatar_segments
    if not isinstance(raw, dict):
        return None
    exp = raw.get("avatar_explanation") if isinstance(raw.get("avatar_explanation"), dict) else {}
    raw_parts = exp.get("parts") or raw.get("parts") or []
    written: List[Tuple[int, Dict[str, Any], List[Dict[str, Any]]]] = []
    segments: List[Dict[str, Any]] = []
    for rp in raw_parts if isinstance(raw_parts, list) else []:
        if not isinstance(rp, dict):
            continue
        segs = [s for s in rp.get("segments") or [] if isinstance(s, dict) and str(s.get("text") or "").strip()]
        if not segs:
            continue
        n = len(written) + 1
        for s in segs:
            s["part"] = n
            s.setdefault("type", "teaching")
        written.append((n, rp, segs))
        segments.extend(segs)
    if len(written) < len(parts):
        logger.warning(f"[lesson] the reading script covers {len(written)} of {len(parts)} part(s)")
        return None
    normalize_avatar_segments(segments, checkpoints="none")
    kept = {id(s) for s in segments}
    return {
        "concept_overview": raw.get("concept_overview", ""),
        "avatar_explanation": {
            "teaching_style": exp.get("teaching_style") or "storytelling",
            "total_duration_estimate": exp.get("total_duration_estimate", ""),
            "segments": segments,
            "parts": [{"part": n, "title": str(rp.get("title") or "").strip() or f"Part {n}",
                       "summary": str(rp.get("summary") or "").strip(),
                       "segment_ids": [s["segment_id"] for s in segs if id(s) in kept]}
                      for n, rp, segs in written],
        },
        "faqs": raw.get("faqs", []),
        "practice_questions": raw.get("practice_questions", []),
        "doubt_context": raw.get("doubt_context", {}),
    }


def _reading_script(enricher: Any, *, pattern: LessonPattern, section_title: str, unit_title: str,
                    class_number: str, kind: str, notes: str, reading_text: str,
                    check_groups: List[List[str]], reading_breaks: List[str],
                    hook: Optional[Dict[str, Any]], image_count: int,
                    with_grammar: bool) -> Tuple[Optional[Dict[str, Any]], int]:
    """(the part-by-part teaching script or None, how many parts)."""
    parts = split_reading_parts(reading_text, check_groups, breaks=reading_breaks)
    if not parts:
        return None, 0
    # Checks the parts could not claim exactly still steer the writer, for the whole reading.
    reading_questions = [] if any(p["questions"] for p in parts) else [q for g in check_groups for q in g]
    sizes = ", ".join(format(len(p["text"]), ",") for p in parts)
    to_cover = sum(len(p["questions"]) for p in parts) or len(reading_questions)
    logger.info(f"[lesson] '{section_title}': writing the teaching script part by part - "
                f"{len(parts)} part(s) of {sizes} chars"
                + (f", {to_cover} textbook question(s) to cover" if to_cover else ""))
    system = reading_teach_prompt(pattern, class_number, part_count=len(parts),
                                  image_count=image_count, with_grammar=with_grammar)
    user = _reading_user_prompt(section_title, unit_title, class_number, kind, notes, parts,
                                reading_questions, hook)
    for attempt in (1, 2):
        teaching = _reading_teaching(_llm_json(enricher, system, user, max_tokens=READING_MAX_TOKENS), parts)
        if teaching:
            return teaching, len(parts)
        logger.warning(f"[lesson] '{section_title}': part-by-part script unusable (attempt {attempt})")
    return None, len(parts)


def _build_grammar(enricher: Any, *, source: Dict[str, Any], reading_title: str,
                   reading_text: str, class_number: str) -> Optional[Dict[str, Any]]:
    """The grammar phase - the next part after the story (normalize_grammar), or None."""
    kind = str((source or {}).get("source") or "story")
    material = str((source or {}).get("text") or "").strip()
    used = ", ".join((source or {}).get("sections") or [])
    user = (f"Class: {class_number or '?'}\nReading: {reading_title}\n\n"
            f"LANGUAGE MATERIAL - {kind}" + (f" (from: {used})" if used else "") + ":\n"
            + (material or "(none - the unit prints no grammar section and no language exercises)")
            + f"\n\nTHE READING (quote your examples from it):\n{reading_text[:6000]}"
            + "\n\nReturn in the JSON format specified.")
    for attempt in (1, 2):
        grammar = patterns.normalize_grammar(
            _llm_json(enricher, grammar_prompt(reading_title, class_number), user, max_tokens=8000))
        if grammar:
            logger.info(f"[lesson] '{reading_title}': grammar part ready - "
                        f"{[t['title'] for t in grammar['topics']]} from {kind}, "
                        f"{sum(len(t['practice']) for t in grammar['topics'])} practice item(s)")
            return grammar
        logger.warning(f"[lesson] '{reading_title}': grammar part unusable (attempt {attempt})")
    return None


def _build_sing_along(enricher: Any, *, reading_text: str, title: str,
                      class_number: str) -> Optional[Dict[str, Any]]:
    """The sing-along phase (normalize_sing_along), or None for a text with no lines.

    Built from the poem's own lines; only the invite, moods, blanks and
    cheers come from the model - and the line breaks, when extraction lost
    them (checked word for word, see restore_poem_lines)."""
    stanzas, known = patterns.poem_stanzas(reading_text)
    if not stanzas:
        return None
    if known:
        listing = "\n\n".join(f"Stanza {si}:\n" + "\n".join(f"  {li}. {ln}" for li, ln in enumerate(st, 1))
                              for si, st in enumerate(stanzas, 1))
    else:
        listing = "\n\n".join(f"Stanza {si} (line breaks lost):\n{' '.join(st)}"
                              for si, st in enumerate(stanzas, 1))
    user = f"Class: {class_number or '?'}\nPoem: {title}\n\n{listing}\n\nReturn in the JSON format specified."
    raw: Optional[Dict[str, Any]] = None
    for attempt in (1, 2):
        raw = _llm_json(enricher, sing_along_prompt(title, restore_lines=not known), user, max_tokens=4000)
        if raw:
            break
        logger.warning(f"[lesson] '{title}': sing-along reply unusable (attempt {attempt})")
    if not known:
        stanzas = patterns.restore_poem_lines((raw or {}).get("stanzas"), stanzas)
    sing = patterns.normalize_sing_along(raw or {}, stanzas, title=title)
    if sing:
        logger.info(f"[lesson] '{title}': sing-along ready - "
                    f"{sum(len(s['lines']) for s in sing['stanzas'])} line(s) in {len(sing['stanzas'])} "
                    f"stanza(s), {len(sing['blanks'])} missing-word blank(s)")
    return sing


def _sing_speed(speed: Optional[float]) -> float:
    try:
        import avatar_tts
        base = speed if speed else avatar_tts.TTS_SPEED
    except Exception:  # noqa: BLE001
        base = speed or 1.0
    return round(float(base) * SING_PACE, 2)


# ══════════════════════════════════════════════════════════════════════════════
#  Pictures - generated, never searched
# ══════════════════════════════════════════════════════════════════════════════

class _ImageBudget:
    """Counts renders against MAX_IMAGES for one section."""

    def __init__(self, limit: Optional[int] = None):
        self.limit = limit or MAX_IMAGES      # read now, not at import, so tests can cap it
        self.used = 0

    def take(self) -> bool:
        if self.used >= self.limit:
            return False
        self.used += 1
        return True


def _storage_keys(common: Dict[str, Any]) -> Dict[str, Any]:
    """The S3 placement keys of ``common`` - what avatar_images takes. The search
    context (section text, titles, exclude list) rides along in the same dict."""
    return {k: common[k] for k in ("board", "class_number", "subject", "unit_number") if k in common}


def _render(prompt: str, slug: str, budget: _ImageBudget, common: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """One generated picture for a lesson node, or None (never raises)."""
    prompt = (prompt or "").strip()
    if not prompt:
        return None
    if not budget.take():
        logger.info(f"[lesson] image budget ({budget.limit}) spent - '{slug}' not rendered")
        return None
    try:
        import avatar_images
        return avatar_images.generate_image(prompt, slug=slug, **_storage_keys(common))
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[lesson] image generation failed for '{slug}': {e}")
        budget.used -= 1
        return None


def _search(query: str, must_show: str, slug: str, budget: _ImageBudget, common: Dict[str, Any],
            with_walkthrough: bool = False) -> Optional[Dict[str, Any]]:
    """One REAL picture from the web for a lesson node, or None (never raises).

    The same search + vision gate the older enrichment uses
    (avatar_visuals.find_visual), with the query grounded against the section
    text first so a picture can only show something the section raises. The
    result is trimmed to what the lesson stores; ``kind: "photo"`` and the
    provenance fields say where it came from.
    """
    query = (query or "").strip()
    must_show = (must_show or "").strip() or query
    if not query:
        return None
    if not budget.take():
        logger.info(f"[lesson] image budget ({budget.limit}) spent - '{slug}' not searched")
        return None
    try:
        import avatar_visuals
        if not avatar_visuals._query_is_grounded(query, f"{common.get('content', '')}\n{must_show}",
                                                 min_overlap=PICTURE_SEARCH_GROUNDING):
            logger.info(f"[lesson] search '{query}' is not grounded in the section - skipped")
            budget.used -= 1
            return None
        found = avatar_visuals.find_visual(
            query, teaching_text=must_show, section_title=common.get("section_title", ""),
            unit_title=common.get("unit_title", ""), board=common["board"],
            class_number=common["class_number"], subject=common["subject"],
            unit_number=common["unit_number"], exclude_urls=common.setdefault("exclude", []),
            must_show=must_show, max_tries=PICTURE_SEARCH_TRIES, with_walkthrough=with_walkthrough)
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[lesson] picture search failed for '{slug}': {e}")
        budget.used -= 1                    # the slot is for a picture that is stored
        return None
    if not found:
        logger.info(f"[lesson] no clean photo for '{query}' ({slug})")
        budget.used -= 1
        return None
    visual = {k: v for k, v in found.items() if k not in _SEARCH_DROP_KEYS}
    visual.update({"kind": "photo", "source": "web", "prompt": must_show, "query": query})
    if with_walkthrough and found.get("walkthrough"):
        visual["walkthrough"] = found["walkthrough"]
    return visual


def _picture(spec: Dict[str, str], slug: str, budget: _ImageBudget, common: Dict[str, Any],
             with_walkthrough: bool = False) -> Optional[Dict[str, Any]]:
    """The picture a spec asks for: a web photo when it says "search", else a
    render - and a render as the fallback when no clean photo was found, so a
    "let me show you" never points at nothing. ``fallback_from`` marks that."""
    source = (spec.get("image_source") or "generate").lower()
    prompt = (spec.get("image_prompt") or "").strip()
    if source == "search":
        found = _search(spec.get("search_query") or prompt, prompt, slug, budget, common,
                        with_walkthrough=with_walkthrough)
        if found:
            return found
        if not prompt:
            return None
        logger.info(f"[lesson] falling back to a render for '{slug}'")
        found = _render(prompt, slug, budget, common)
        if found:
            found["fallback_from"] = "search"
        return found
    return _render(prompt, slug, budget, common)


def _spec_of(node: Dict[str, Any]) -> Dict[str, str]:
    """Pop a node's picture spec (prompt / source / query) so it is not stored."""
    return {"image_prompt": str(node.pop("image_prompt", "") or ""),
            "image_source": str(node.pop("image_source", "generate") or "generate"),
            "search_query": str(node.pop("search_query", "") or "")}


def _render_option_grid(setting: str, scenes: Dict[str, str], slug: str, budget: _ImageBudget,
                        common: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """The hook's four-panel picture (always a render), or None (never raises)."""
    if not (setting or "").strip() and not any((scenes or {}).values()):
        return None
    if not budget.take():
        logger.info(f"[lesson] image budget ({budget.limit}) spent - '{slug}' not rendered")
        return None
    try:
        import avatar_images
        return avatar_images.generate_option_grid(setting, scenes, slug=slug, **_storage_keys(common))
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[lesson] option grid generation failed for '{slug}': {e}")
        budget.used -= 1
        return None


def _explanation_markers(segments: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], "re.Match[str]"]]:
    """Every "[image: ...]" the writer placed, in script order, one per segment
    (a second marker on the same segment is dropped - a segment shows one picture).
    The hook answer never carries one."""
    found: List[Tuple[Dict[str, Any], "re.Match[str]"]] = []
    for seg in segments:
        if seg.get("type") != "teaching" or seg.get("role") == "hook_answer":
            continue
        matches = list(IMAGE_MARKER_RE.finditer(seg.get("text") or ""))
        if matches:
            found.append((seg, matches[0]))
    return found


def _strip_markers(segments: List[Dict[str, Any]]) -> None:
    """Remove any "[image: ...]" still in the text (over the cap, or not rendered)."""
    for seg in segments:
        text = seg.get("text") or ""
        if IMAGE_MARKER_RE.search(text):
            seg["text"] = tidy_spacing(IMAGE_MARKER_RE.sub("", text))


def _attach_explanation_images(segments: List[Dict[str, Any]], section_slug: str,
                               budget: _ImageBudget, common: Dict[str, Any]) -> int:
    """Render the writer's markers and fold each picture's URL into the text.

    A marker - "[image: <scene>]" (rendered) or "[photo: <query> | <must
    show>]" (a real web photo) - becomes "[<image_url>]" at the same spot, so
    the picture pops up mid-sentence where the avatar says "let me show you";
    the segment also gains ``visual`` (url, prompt, ``char_offset`` of the
    reference in ``text``). A marker that fails to render is removed and the
    sentence closes up. Returns how many pictures were attached.
    """
    attached = 0
    for i, (seg, match) in enumerate(_explanation_markers(segments), 1):
        if attached >= EXPLANATION_IMAGES:
            break
        marker = parse_picture_marker(match.group("kind"), match.group("prompt"))
        spec = {"image_prompt": marker["prompt"], "image_source": marker["source"],
                "search_query": marker["query"]}
        found = _picture(spec, f"{section_slug}_explain_{i}", budget, common)
        text = seg["text"]
        if not found:
            seg["text"] = tidy_spacing(text[:match.start()] + text[match.end():])
            logger.info(f"[lesson] explanation picture {i} not found - marker removed from {seg.get('segment_id')}")
            continue
        reference = f" [{found['image_url']}]"
        before = text[:match.start()].rstrip()
        after = text[match.end():]
        seg["text"] = tidy_spacing(before + reference + after)
        seg["visual"] = {**found, "inline": True,
                         "char_offset": len(before) + 1,
                         "planned_because": "the teaching writer placed it here"}
        attached += 1
    _strip_markers(segments)
    return attached


def _attach_lesson_images(lesson: Dict[str, Any], *, section_slug: str, board: str,
                          class_number: str, subject: str, unit_number: int,
                          section_title: str = "", unit_title: str = "",
                          content: str = "") -> Dict[str, int]:
    """Every picture of the lesson - rendered or searched - in play order, within MAX_IMAGES.

    ``section_title`` / ``unit_title`` / ``content`` feed the search path: the
    vision gate's topic and the grounding check. ``common["exclude"]`` is the
    list of web candidates already judged, shared by every search in the
    section so no slot re-checks another's rejects.
    """
    common: Dict[str, Any] = dict(board=board, class_number=class_number, subject=subject,
                                  unit_number=unit_number)
    search_ctx = dict(section_title=section_title, unit_title=unit_title, content=content, exclude=[])
    budget = _ImageBudget()
    counts = {"hook": 0, "explanation": 0, "real_world": 0, "explore": 0, "mystery": 0}

    hook = phase(lesson, "hook")
    if hook:
        # Two pictures (user decision 2026-09-18): the QUESTION scene on its
        # own (``visual``), then ONE four-panel picture of the options - one
        # panel per option, badged A-D - so the student sees the outcomes side
        # by side and picks (``options_visual``).
        spec = _spec_of(hook)
        setting = spec["image_prompt"]
        scenes = hook.pop("option_scenes", None) or {}
        if not hook.get("visual"):
            # The question picture must not answer the question: the planner is
            # told to describe the calm moment before the event, and a RENDER
            # is told so again, because "as the driver brakes" once came back
            # as the lurch itself (live, 2026-09-18). A searched photo of a
            # real source or place is taken as it is.
            if spec["image_source"] != "search" and setting:
                spec = {**spec, "image_prompt": f"{setting} {NEUTRAL_MOMENT}"}
            found = _picture(spec, f"{section_slug}_hook", budget, {**common, **search_ctx})
            if found:
                hook["visual"] = found
                counts["hook"] += 1
        if not hook.get("options_visual"):
            found = _render_option_grid(setting, scenes, f"{section_slug}_hook_options", budget, common)
            if found:
                hook["options_visual"] = found
                counts["hook"] += 1

    explanation = phase(lesson, "explanation")
    if explanation:
        counts["explanation"] = _attach_explanation_images(
            explanation.get("segments") or [], section_slug, budget, {**common, **search_ctx})
        explanation["pictured_segment_ids"] = [
            s["segment_id"] for s in explanation.get("segments") or []
            if isinstance(s.get("visual"), dict) and s["visual"].get("image_url")]

    rw = phase(lesson, "real_world")
    if rw:
        spec = _spec_of(rw)
        if not rw.get("visual"):
            found = _picture(spec, f"{section_slug}_real_world", budget, {**common, **search_ctx})
            if found:
                rw["visual"] = found
                counts["real_world"] = 1

    explore = phase(lesson, "explore")
    if explore:
        inter = explore.get("interaction") or {}
        explore_spec = _spec_of(explore)
        if inter.get("type") == "picture_walkthrough":
            spec = _spec_of(inter)
            if not inter.get("visual"):
                # The source investigation IS its picture. A searched photo
                # comes with the three guided steps the vision model wrote
                # while looking at it; a render gets them written afterwards.
                found = _picture(spec, f"{section_slug}_explore", budget, {**common, **search_ctx},
                                 with_walkthrough=True)
                if found:
                    steps = found.pop("walkthrough", None)
                    inter["visual"] = found
                    inter["walkthrough"] = steps or _walkthrough_for(found, explore, common)
                    counts["explore"] = 1
                else:
                    _degrade_explore(lesson, explore)
        elif not explore.get("visual"):
            # Optional: the planner wrote a set-up picture only when seeing it
            # helps the student do the activity.
            found = _picture(explore_spec, f"{section_slug}_explore", budget, {**common, **search_ctx})
            if found:
                explore["visual"] = found
                counts["explore"] = 1

    mystery = phase(lesson, "mystery")
    if mystery:
        item = (mystery.get("pool") or [None])[0]
        if item:
            spec = _spec_of(item)
            if not item.get("visual"):
                found = _picture(spec, f"{section_slug}_mystery", budget, {**common, **search_ctx})
                if found:
                    item["visual"] = found
                    counts["mystery"] = 1
        if not (item and item.get("visual")):
            logger.warning("[lesson] mystery has no picture - phase dropped (it IS the picture)")
            lesson["phases"] = [p for p in lesson["phases"] if p is not mystery]

    logger.info(f"[lesson] pictures: {budget.used}/{budget.limit} {counts}")
    return counts


def _walkthrough_for(found: Dict[str, Any], explore: Dict[str, Any],
                     common: Dict[str, Any]) -> List[Dict[str, str]]:
    """Three guided steps over a rendered source picture (one vision call), or
    a one-step tour from the interaction prompt when the model is unavailable."""
    inter = explore.get("interaction") or {}
    fallback = [{"step": 1, "skill": "notice", "ask": inter.get("prompt", ""),
                 "answer": "", "points_at": "", "hint": ""}]
    try:
        import avatar_visuals
        raw = avatar_visuals._fetch_stored(found["image_url"])
        if not raw:
            return fallback
        steps = avatar_visuals.build_walkthrough(
            raw, explore.get("title", ""), shows=found.get("prompt", ""),
            teaching_text=inter.get("prompt", ""),
            class_number=str(common.get("class_number") or ""), subject=common.get("subject", ""))
        return steps or fallback
    except Exception as e:  # noqa: BLE001
        logger.info(f"[lesson] walkthrough unavailable ({e}) - one-step tour kept")
        return fallback


def _degrade_explore(lesson: Dict[str, Any], explore: Dict[str, Any]) -> None:
    """No picture for a source investigation: the challenge becomes the activity,
    or the phase goes. A walkthrough with nothing to look at would strand the student."""
    challenge = explore.get("challenge") or {}
    c_inter = challenge.get("interaction")
    if c_inter and c_inter.get("type") != "picture_walkthrough":
        logger.info("[lesson] explore picture not rendered — the challenge becomes the activity")
        explore["interaction"] = c_inter
        explore.pop("challenge", None)
        explore["kind"] = "apply_it"
        return
    logger.warning("[lesson] explore picture not rendered and no fallback — explore phase dropped")
    lesson["phases"] = [p for p in lesson["phases"] if p is not explore]


def _drop_image_prompts(lesson: Dict[str, Any]) -> None:
    """with_visuals=False: the scene prompts are not stored, and phases that
    only exist as a picture go."""
    for name in ("hook", "real_world", "explore"):
        ph = phase(lesson, name)
        if ph:
            _spec_of(ph)
            ph.pop("option_scenes", None)
            inter = ph.get("interaction") if name == "explore" else None
            if isinstance(inter, dict):
                _spec_of(inter)
    explore = phase(lesson, "explore")
    if explore and (explore.get("interaction") or {}).get("type") == "picture_walkthrough":
        _degrade_explore(lesson, explore)
    mystery = phase(lesson, "mystery")
    if mystery:
        logger.info("[lesson] with_visuals is off — mystery phase dropped")
        lesson["phases"] = [p for p in lesson["phases"] if p is not mystery]
    explanation = phase(lesson, "explanation")
    if explanation:
        _strip_markers(explanation.get("segments") or [])


# ══════════════════════════════════════════════════════════════════════════════
#  One section
# ══════════════════════════════════════════════════════════════════════════════

def build_section_lesson(content: str, section_title: str, *, section: Dict[str, Any],
                         pattern: LessonPattern, enricher: Any,
                         subject: str = "", section_kind: str = "", part: str = "",
                         unit_title: str = "", board: str = "", class_number: str = "",
                         unit_number: int = 0, with_visuals: bool = True,
                         with_audio: bool = True, voices: Optional[List[str]] = None,
                         speed: Optional[float] = None, upload: bool = True,
                         covers: Optional[List[str]] = None,
                         reading_text: str = "", reading_notes: str = "",
                         check_groups: Optional[List[List[str]]] = None,
                         reading_breaks: Optional[List[str]] = None,
                         grammar_source: Optional[Dict[str, Any]] = None
                         ) -> Optional[Dict[str, Any]]:
    """Build one section's enrichment: overview, FAQs, practice questions,
    doubt context and the ordered ``avatar_lesson``. None when even the
    teaching script could not be produced. ``covers`` names the boxes folded
    into ``content`` (eligible_sections' ``folded``) so the doubt path knows
    this lesson is where they are taught.

    English readings pass ``lesson_extras(target)``: ``reading_text`` (the
    reading alone - taught in parts, or sung), ``reading_notes`` (author,
    before-you-read), ``check_groups`` / ``reading_breaks`` (the book's own
    part breaks) and, for the unit's first story, ``grammar_source`` - which
    adds the grammar part. A poem gets the sing-along."""
    started = time.perf_counter()
    report: Dict[str, Any] = {"section_title": section_title, "pattern": pattern.key}
    ctx = _section_context(content, section_title, unit_title, subject, class_number)
    reading_text = (reading_text or "").strip()
    teach_in_parts = pattern.key in ("english.prose", "english.supplementary") and bool(reading_text)
    want_grammar = pattern.key == "english.prose" and grammar_source is not None
    want_sing = pattern.key == "english.poem" and bool(reading_text)

    # The grammar part and the sing-along do not depend on the plan, so they
    # are written while it runs.
    side_pool = ThreadPoolExecutor(max_workers=1) if (want_grammar or want_sing) else None
    side_job = None
    if want_grammar:
        logger.info(f"[lesson] '{section_title}': writing the grammar part alongside "
                    f"(from {grammar_source.get('source') or 'story'})")
        side_job = side_pool.submit(_build_grammar, enricher, source=grammar_source,
                                    reading_title=section_title, reading_text=reading_text or content,
                                    class_number=class_number)
    elif want_sing:
        logger.info(f"[lesson] '{section_title}': writing the sing-along alongside")
        side_job = side_pool.submit(_build_sing_along, enricher, reading_text=reading_text,
                                    title=section_title, class_number=class_number)

    def _side_result() -> Optional[Dict[str, Any]]:
        if side_job is None:
            return None
        try:
            return side_job.result()
        except Exception as e:  # noqa: BLE001 - the story still gets its lesson
            logger.warning(f"[lesson] '{section_title}': {'grammar' if want_grammar else 'sing-along'} "
                           f"failed: {e}")
            return None
        finally:
            side_pool.shutdown(wait=False)

    # ── LLM 1: the interactive phases ────────────────────────────────────────
    # A JSON-mode call occasionally comes back empty or unparseable, and a
    # hook can come back with three options; the hook and the script are the
    # two things a section cannot exist without, so each gets one more attempt
    # before the section is given up on.
    plan_raw: Dict[str, Any] = {}
    hook_preview = None
    best: Optional[Tuple[Dict[str, Any], Dict[str, bool]]] = None
    logger.info(f"[lesson] '{section_title}': planning the lesson on {_lesson_model()} "
                f"(hook, real world, explore, mystery, explain-back)")
    for attempt in (1, 2):
        plan_raw = _llm_json(enricher, lesson_plan_prompt(pattern),
                             _plan_user_prompt(ctx, section, pattern)) or {}
        hook_preview = patterns._normalize_hook(plan_raw.get("hook"), pattern)
        usable = {
            "hook": hook_preview is not None,
            "real_world": patterns._normalize_real_world(plan_raw.get("real_world")) is not None,
            "explore": patterns._normalize_explore(plan_raw.get("explore"), pattern) is not None,
            "mystery": patterns._normalize_mystery(plan_raw.get("mystery")) is not None,
        }
        if best is None or sum(usable.values()) > sum(best[1].values()):
            best = (plan_raw, usable)
        if all(usable.values()):
            break
        logger.warning(f"[lesson] '{section_title}': planner attempt {attempt} unusable for "
                       f"{[k for k, ok in usable.items() if not ok]} — "
                       f"{'retrying' if attempt == 1 else 'keeping the better attempt'}")
    plan_raw, _ = best
    hook_preview = patterns._normalize_hook(plan_raw.get("hook"), pattern)

    # ── LLM 2: the teaching script (text with picture markers) ───────────────
    # Pictures are rendered from the writer's own "[image: ...]" markers below;
    # the general enrichment's search-and-gate planner is not used for lessons.
    teaching = None
    parts_written = 0
    image_count = EXPLANATION_IMAGES if with_visuals else 0
    if teach_in_parts:
        teaching, parts_written = _reading_script(
            enricher, pattern=pattern, section_title=section_title, unit_title=unit_title,
            class_number=class_number, kind=section_kind or pattern.key.split(".")[-1],
            notes=reading_notes, reading_text=reading_text, check_groups=check_groups or [],
            reading_breaks=reading_breaks or [], hook=hook_preview, image_count=image_count,
            with_grammar=want_grammar)
        if not teaching:
            parts_written = 0
            logger.warning(f"[lesson] '{section_title}': no part-by-part script - "
                           f"falling back to one continuous script")
    if not teaching:
        logger.info(f"[lesson] '{section_title}': writing the teaching script "
                    f"({len(content):,} chars of section text)")
    for attempt in (1, 2):
        if teaching:
            break
        teaching = enricher.enrich_section_avatar_style(
            content=content, section_title=section_title, unit_title=unit_title,
            web_context="", board=board, class_number=class_number, subject=subject,
            unit_number=unit_number, with_visuals=False,
            teach_prompt=teach_prompt(pattern, class_number, image_count),
            checkpoints="none",
            extra_context=_hook_context(hook_preview), model=_lesson_model(),
        )
        if not teaching:
            logger.warning(f"[lesson] '{section_title}': teaching script came back empty (attempt {attempt})")
    side = _side_result()
    if not teaching:
        logger.error(f"[lesson] '{section_title}': teaching script failed twice — section skipped")
        return None
    explanation = teaching.get("avatar_explanation") or {}
    segments: List[Dict[str, Any]] = explanation.get("segments") or []
    grammar = side if want_grammar else None
    sing_along = side if want_sing else None
    if want_grammar and not grammar:
        logger.warning(f"[lesson] '{section_title}': no grammar part - the story plays without it")
    if want_sing and not sing_along:
        logger.warning(f"[lesson] '{section_title}': no sing-along - the poem is explained without it")

    # ── Assemble in play order ───────────────────────────────────────────────
    lesson = normalize_lesson(
        plan_raw, pattern, explanation=explanation, sing_along=sing_along, grammar=grammar,
        meta={
            "built_at": datetime.now(timezone.utc).isoformat(),
            "models": {"plan": _lesson_model(), "teach": _lesson_model(),
                       "images": _image_model() if with_visuals else None},
            "section_title": section_title, "section_kind": section_kind,
        },
    )
    image_counts: Dict[str, int] = {}
    if with_visuals:
        logger.info(f"[lesson] '{section_title}': rendering the pictures "
                    f"(at most {MAX_IMAGES}, {_image_model() or 'no image model'})")
        image_counts = _attach_lesson_images(
            lesson, section_slug=_slug(section_title), board=board,
            class_number=class_number, subject=subject, unit_number=unit_number,
            section_title=section_title, unit_title=unit_title, content=content)
    else:
        _drop_image_prompts(lesson)
    segments = (phase(lesson, "explanation") or {}).get("segments") or segments

    # ── Narration ────────────────────────────────────────────────────────────
    audio: Dict[str, Any] = {"skipped": "with_audio was false"}
    if with_audio:
        try:
            import avatar_tts
            ok, reason = avatar_tts.is_available()
            if not ok:
                audio = {"skipped": f"TTS unavailable: {reason}"}
                logger.warning(f"[lesson] '{section_title}': no narration — TTS unavailable: {reason}")
            else:
                nodes = list(iter_spoken_nodes(lesson))
                # The sing-along's lines are sung, not said: a slower pace.
                sung = [n for n in nodes if str(n.get("segment_id") or "").startswith("sing_s")]
                said = [n for n in nodes if not str(n.get("segment_id") or "").startswith("sing_s")]
                logger.info(f"[lesson] '{section_title}': narrating {len(nodes)} spoken node(s) "
                            f"in {', '.join(voices or ['male', 'female'])}"
                            + (f" ({len(sung)} sung line(s) at {_sing_speed(speed)}x)" if sung else ""))
                result = avatar_tts.narrate_segments(
                    said, board=board, class_number=class_number, subject=subject,
                    unit_number=unit_number, voices=voices, speed=speed,
                    upload=upload, attach=True)
                audio = {"engine": result.get("engine"), **(result.get("summary") or {})}
                if sung:
                    sung_result = avatar_tts.narrate_segments(
                        sung, board=board, class_number=class_number, subject=subject,
                        unit_number=unit_number, voices=voices, speed=_sing_speed(speed),
                        upload=upload, attach=True)
                    for key, value in (sung_result.get("summary") or {}).items():
                        if isinstance(value, (int, float)) and isinstance(audio.get(key), (int, float)):
                            audio[key] = round(audio[key] + value, 1) if isinstance(value, float) else audio[key] + value
                    audio["sung_lines"] = len(sung)
                logger.info(f"[lesson] '{section_title}': narration done — "
                            f"{audio.get('files_rendered', 0)} file(s), "
                            f"{audio.get('failures', 0)} failed, {audio.get('seconds')}s "
                            f"({audio.get('engine')})")
        except Exception as e:  # noqa: BLE001
            logger.warning(f"[lesson] narration failed for '{section_title}': {e}")
            audio = {"skipped": f"narration error: {e}"}

    enrichment = {
        "concept_overview": teaching.get("concept_overview", ""),
        "faqs": teaching.get("faqs", []),
        "practice_questions": teaching.get("practice_questions", []),
        "doubt_context": {
            **(teaching.get("doubt_context") or {}),
            "board": board, "class_number": class_number, "subject": subject,
            "unit_number": unit_number, "section_title": section_title,
            "max_rag_chunks": 5, "fallback_to_broader_context": True,
            **({"covers": list(covers)} if covers else {}),
        },
        "avatar_lesson": lesson,
    }
    grammar_phase = phase(lesson, "grammar") or {}
    sing_phase = phase(lesson, "sing_along") or {}
    report.update({
        "phases": [p["phase"] for p in lesson["phases"]],
        "segments": len(segments),
        **({"parts": [p["title"] for p in (phase(lesson, "explanation") or {}).get("parts") or []]}
           if parts_written else {}),
        **({"grammar_topics": [t["title"] for t in grammar_phase.get("topics") or []],
            "grammar_practice": sum(len(t["practice"]) for t in grammar_phase.get("topics") or [])}
           if want_grammar else {}),
        **({"sing_along_lines": sum(len(s["lines"]) for s in sing_phase.get("stanzas") or []),
            "sing_along_blanks": len(sing_phase.get("blanks") or [])} if want_sing else {}),
        "hook_options": len((phase(lesson, "hook") or {}).get("options") or {}),
        "images": sum(image_counts.values()),
        "images_by_phase": image_counts,
        "audio": audio,
        "seconds": round(time.perf_counter() - started, 1),
    })
    enrichment["_build_report"] = report
    return enrichment


def _image_model() -> str:
    try:
        import avatar_images
        return avatar_images.IMAGE_MODEL
    except Exception:  # noqa: BLE001
        return ""


def _slug(value: str, limit: int = 30) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (value or "").lower()).strip("_")[:limit].rstrip("_") or "section"


# ══════════════════════════════════════════════════════════════════════════════
#  Whole document, stored section by section
# ══════════════════════════════════════════════════════════════════════════════

def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _find_unit(enriched: Dict[str, Any], unit_number: Any) -> Optional[Dict[str, Any]]:
    key = "chapters" if "chapters" in enriched else "units"
    for unit in enriched.get(key, []) or []:
        if (unit.get("unit_number") or unit.get("chapter_number")) == unit_number:
            return unit
    return None


def _find_section(unit: Dict[str, Any], title: str) -> Optional[Dict[str, Any]]:
    want = title.strip().lower()
    for sec in unit.get("sections", []) or []:
        if isinstance(sec, dict) and str(sec.get("section_title") or sec.get("title") or "").strip().lower() == want:
            return sec
    return None


def already_built(section_entry: Optional[Dict[str, Any]], is_math: bool) -> bool:
    if not section_entry:
        return False
    holder = section_entry.get("section_enrichment" if is_math else "enrichment") or {}
    return bool(patterns.lesson_of(holder))


def upsert_section(enriched: Dict[str, Any], target: Dict[str, Any],
                   enrichment: Dict[str, Any]) -> Dict[str, Any]:
    """Write one section's enrichment into the enriched document, in place.

    Other sections and units are untouched. A section already present (a
    legacy avatar script, or a previous build) keeps everything it had except
    the keys this build produces - and loses its ``avatar_explanation``, since
    the lesson's explanation phase now holds the segments."""
    key = "chapters" if "chapters" in enriched else "units"
    enriched.setdefault(key, [])
    unit = _find_unit(enriched, target["unit_number"])
    if unit is None:
        unit = {"unit_number": target["unit_number"], "title": target["unit_title"],
                "subject": enriched.get("subject") or "", "sections": []}
        if target.get("part"):
            unit["part"] = target["part"]
        enriched[key].append(unit)
    unit.setdefault("sections", [])

    is_math = target["is_math"]
    holder_key = "section_enrichment" if is_math else "enrichment"
    entry = _find_section(unit, target["section_title"])
    if entry is None:
        raw = target["section"]
        if is_math:
            entry = {
                "section_number": raw.get("section_number") or raw.get("id", ""),
                "section_title": target["section_title"],
                "content": raw.get("content", "") or "",
                "content_context": target["content"],
                "type": raw.get("type", "section"),
                "sub_sections": [],
            }
        elif patterns.normalize_subject(enriched.get("subject")) == "english":
            entry = {"section_title": target["section_title"], "content": target["content"],
                     "subsections": [], "_type": target["section_kind"]}
        else:
            entry = {k: v for k, v in raw.items() if k != "enrichment"}
            entry["section_title"] = target["section_title"]
        unit["sections"].append(entry)

    holder = dict(entry.get(holder_key) or {})
    holder.pop("avatar_explanation", None)
    holder.update({k: v for k, v in enrichment.items() if k != "_build_report"})
    entry[holder_key] = holder
    return entry


def build_document_lessons(document_id: str, *, unit_number: Optional[int] = None,
                           section_title: Optional[str] = None, force: bool = False,
                           with_visuals: bool = True, with_audio: bool = True,
                           voices: Optional[List[str]] = None, speed: Optional[float] = None,
                           upload: bool = True, subject: Optional[str] = None,
                           progress_cb: Optional[ProgressCallback] = None,
                           doc_dir: Optional[Path] = None) -> Dict[str, Any]:
    """Build and store the lesson of every eligible section of a document.

    ``unit_number`` / ``section_title`` narrow the run; ``force`` rebuilds
    sections that already have a lesson. ``progress_cb`` is called after every
    section with the running report, so a background job can expose it.
    ``doc_dir`` reads and writes a folder other than ``outputs/<document_id>``
    (``/enrichment/process`` builds a posted structured.json in a temp folder).
    """
    from config import OUTPUTS_DIR
    from enrichment_pipeline import (EnrichmentOrchestrator, _detect_subject,
                                     load_env, save_json)

    load_env()
    doc_dir = Path(doc_dir) if doc_dir else Path(OUTPUTS_DIR) / document_id
    structured_path = doc_dir / "structured.json"
    if not structured_path.exists():
        raise FileNotFoundError(f"No structured.json for document '{document_id}'")
    structured = _load_json(structured_path) or {}
    metadata = _load_json(doc_dir / "metadata.json") or {}

    subject = subject or metadata.get("subject") or structured.get("subject") \
        or _detect_subject(document_id, structured) or ""
    board = str(metadata.get("board") or structured.get("board") or "")
    class_number = str(metadata.get("class_number") or structured.get("class_number") or "")

    targets = patterns.eligible_sections(structured, subject, unit_number, section_title)
    report: Dict[str, Any] = {
        "document_id": document_id, "subject": subject, "board": board,
        "class_number": class_number, "total": len(targets), "done": 0,
        "built": 0, "skipped": 0, "failed": 0, "current": None,
        "sections": [], "started_at": datetime.now(timezone.utc).isoformat(),
    }
    if not targets:
        report["error"] = ("no eligible sections" + (f" matching '{section_title}'" if section_title else "")
                           + f" for subject '{subject}'")
        return report

    enriched_path = doc_dir / "enriched.json"
    enriched = _load_json(enriched_path) if enriched_path.exists() else None
    if not enriched:
        enriched = {
            "document_id": document_id,
            "enriched_at": datetime.now(timezone.utc).isoformat(),
            "enrichment_model": _lesson_model(),
            "enrichment_style": "avatar_classroom_teaching",
            "subject": subject, "board": board, "class_number": class_number,
            "chapters" if "chapters" in structured else "units": [],
        }
    enriched.setdefault("subject", subject)

    orch = EnrichmentOrchestrator(fast_mode=True, subject=patterns.normalize_subject(subject) or subject,
                                  enrichment_style="avatar_classroom_teaching")
    orch.enricher.reset_web_cache(enabled=False)

    def _notify() -> None:
        if progress_cb:
            try:
                progress_cb(dict(report))
            except Exception:  # noqa: BLE001 - progress must never break the build
                pass

    for i, target in enumerate(targets, 1):
        title = target["section_title"]
        report["current"] = title
        _notify()
        logger.info(f"[lesson] section {i}/{len(targets)}: '{title}' "
                    f"(unit {target['unit_number']}, {target['section_kind']}, "
                    f"{len(target['content']):,} chars)")
        unit = _find_unit(enriched, target["unit_number"])
        existing = _find_section(unit, title) if unit else None
        if not force and already_built(existing, target["is_math"]):
            report["skipped"] += 1
            report["done"] += 1
            report["sections"].append({"section_title": title, "status": "skipped",
                                       "reason": "already built (pass force to rebuild)"})
            continue

        try:
            enrichment = build_section_lesson(
                target["content"], title, section=target["section"], pattern=target["pattern"],
                enricher=orch.enricher, subject=subject, section_kind=target["section_kind"],
                part=target["part"], unit_title=target["unit_title"], board=board,
                class_number=class_number, unit_number=target["unit_number"] or 0,
                with_visuals=with_visuals, with_audio=with_audio, voices=voices,
                speed=speed, upload=upload, covers=target.get("folded"),
                **lesson_extras(target),
            )
        except Exception as e:  # noqa: BLE001 - one bad section must not end the run
            logger.exception(f"[lesson] '{title}' crashed: {e}")
            enrichment = None
            error = str(e)
        else:
            error = ""

        if not enrichment:
            report["failed"] += 1
            report["done"] += 1
            report["sections"].append({"section_title": title, "status": "failed",
                                       "reason": error or "no lesson produced"})
            _notify()
            continue

        upsert_section(enriched, target, enrichment)
        enriched["enriched_at"] = datetime.now(timezone.utc).isoformat()
        save_json(enriched, enriched_path)      # written NOW, before the next section
        section_report = {**enrichment["_build_report"], "status": "built"}
        report["built"] += 1
        report["done"] += 1
        report["sections"].append(section_report)
        logger.info(f"[lesson] stored '{title}' ({section_report['seconds']}s, "
                    f"phases={section_report['phases']})")
        _notify()

    report["current"] = None
    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    report["enriched_path"] = str(enriched_path)
    _notify()
    return report


# ══════════════════════════════════════════════════════════════════════════════
#  Session-time picks (used by avatar_engine.start_session)
# ══════════════════════════════════════════════════════════════════════════════

def pick_for_session(lesson: Dict[str, Any], seed: str) -> Dict[str, Any]:
    """A deep copy of the lesson in the shape the player reads.

    The mystery's one-item ``pool`` becomes ``mysteries`` (the answers and
    explanations stay on the copy; the engine strips them before replying).
    ``seed`` is kept for callers - there is nothing left to sample since the
    card pools and the mystery pool went (user decision 2026-09-17).
    """
    import copy
    reduced = copy.deepcopy(lesson)
    mystery = phase(reduced, "mystery")
    if mystery:
        pool = mystery.get("pool") or mystery.get("mysteries") or []
        mystery["mysteries"] = list(pool[:1])
        mystery["pool_size"] = len(pool)
        mystery.pop("pool", None)
    return reduced
