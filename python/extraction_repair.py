"""
Targeted repair for audited extractions.

The audit names the sections at fault and the span of source text each one owns,
so a failure is fixed by re-extracting THAT SECTION — not by re-running the
textbook. A missing 2.11.3 costs one call over ~600 characters instead of a
twelve-minute re-extraction of the chapter.

Two classes of repair:

  deterministic — duplicates, ordering and schema faults are fixed in-process
                  with no model call at all
  targeted      — a missing or empty section is re-extracted from its own span

Both are driven by AuditFailure records, so the repair can never wander outside
what the audit actually complained about.
"""

from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional, Tuple

import requests
from langfuse_utils import traced_post

from json_repair import parse_llm_json
from logger import get_logger

logger = get_logger(__name__)

try:
    from config import (OPENROUTER_BASE_URL, OPENROUTER_APP_NAME,
                        OPENROUTER_APP_URL, EXTRACTION_MODEL, openrouter_routing)
    _URL = OPENROUTER_BASE_URL
    _MODEL = EXTRACTION_MODEL
    _HEADERS = {"HTTP-Referer": OPENROUTER_APP_URL, "X-Title": OPENROUTER_APP_NAME}
except Exception:                                    # pragma: no cover
    _URL = "https://openrouter.ai/api/v1/chat/completions"
    _MODEL = "qwen/qwen3-235b-a22b-2507"
    _HEADERS = {}

    def openrouter_routing(model=None):
        return {}

_TIMEOUT = int(os.getenv("REPAIR_TIMEOUT", "180"))
_MAX_SPAN_CHARS = int(os.getenv("REPAIR_MAX_SPAN_CHARS", "12000"))

_SYSTEM = """You are repairing ONE section of a textbook extraction.

You are given a heading and the exact text printed underneath it. Return that
section as JSON. Do not summarise, do not invent, do not add neighbouring
sections — reproduce the content that is there.

Return STRICT JSON, exactly this shape:
{
  "type": "<one of: section, prose, example, theorem, definition, activity, exercise, note, summary, glossary, vocabulary, grammar, writing_task, listening, speaking, introduction, learning_objectives, other>",
  "title": "<the heading, without its number>",
  "content": "<the FULL text under this heading>",
  "sub_items": [{"number": "<label or question number>", "content": "<text>"}]
}
Use "sub_items" only for numbered questions or labelled parts; otherwise omit it."""


def _call(system: str, user: str, api_key: str, model: str) -> Optional[str]:
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "max_tokens": 4096,
        "response_format": {"type": "json_object"},
        **openrouter_routing(model),
    }
    headers = {"Authorization": f"Bearer {api_key}",
               "Content-Type": "application/json", **_HEADERS}
    try:
        resp = traced_post("repair-extraction", _URL, headers=headers, json=payload, timeout=_TIMEOUT)
    except Exception as e:
        logger.warning(f"[Repair] request failed: {type(e).__name__}: {e}")
        return None
    if not resp.ok:
        logger.warning(f"[Repair] {resp.status_code}: {resp.text[:180]}")
        return None
    try:
        return resp.json()["choices"][0]["message"].get("content") or ""
    except Exception:
        return None


def targeted_extract(
    source_md: str,
    failure,
    api_key: str,
    model: str = _MODEL,
) -> Optional[Dict[str, Any]]:
    """Re-extract the single section a failure names, from its own span."""
    if failure.span_start is None or failure.span_end is None:
        return None
    span = source_md[failure.span_start:failure.span_end].strip()
    if not span:
        return None
    if len(span) > _MAX_SPAN_CHARS:
        span = span[:_MAX_SPAN_CHARS]

    label = f"{failure.section_id} {failure.title}".strip() or failure.title
    user = f"Heading: {label}\n\nText printed under this heading:\n\n{span}"
    raw = _call(_SYSTEM, user, api_key, model)
    if not raw:
        return None
    parsed = parse_llm_json(raw)
    if not isinstance(parsed, dict):
        logger.warning(f"[Repair] unparseable reply for {label[:40]!r}")
        return None

    content = str(parsed.get("content") or "").strip()
    if not content:
        # The model gave us nothing usable; the source span is better than a
        # section that stays empty.
        content = span
    # The AUDIT's heading is authoritative, not the model's paraphrase of it.
    # Letting the model name the section meant a repaired "Theorem 1: Euclid's
    # Division Lemma" came back titled "Euclid's Division Lemma", so the next
    # audit still reported the heading missing and the loop stalled on a
    # section it had already fixed.
    section: Dict[str, Any] = {
        "type": str(parsed.get("type") or "section"),
        "id": failure.section_id or "",
        "title": (failure.title or str(parsed.get("title") or "")).strip(),
        "content": content,
    }
    subs = parsed.get("sub_items")
    if isinstance(subs, list) and subs:
        section["sub_items"] = [s for s in subs if isinstance(s, dict)]
    return section


_SPLIT_SYSTEM = """You are separating ONE textbook box from the exposition printed after it.

You are given the heading of a box (an Activity, Do You Know, Thinking Corner ...) and
the exact text printed from that heading up to the next heading. The box itself is
short: its instruction, steps, questions and its own observation or explanation. Often
the book's regular exposition RESUMES after the box, before the next heading, and the
two have been run together.

Return STRICT JSON, exactly this shape:
{
  "box": "<the box's own text, verbatim>",
  "continuation": "<the exposition that resumes after the box, verbatim, or empty>"
}
Rules: copy text VERBATIM, never paraphrase or summarise; every sentence goes in exactly
one of the two; a box speaks TO the student (try, find out, observe, what do you notice,
you will see) while exposition explains the topic in the third person; a second short
instruction later in the text ("Find out reasons for ...") is a box too and stays in "box"
in its place. WHEN IN DOUBT, KEEP TEXT IN "box"."""


def split_overfull_box(
    source_md: str,
    failure,
    api_key: str,
    model: str = _MODEL,
) -> Optional[Tuple[str, str]]:
    """Ask the model where the box ends. (box_text, continuation) or None."""
    if failure.span_start is None or failure.span_end is None:
        return None
    span = source_md[failure.span_start:failure.span_end].strip()
    if not span:
        return None
    if len(span) > _MAX_SPAN_CHARS:
        span = span[:_MAX_SPAN_CHARS]
    user = f"Box heading: {failure.title}\n\nText printed from this heading to the next:\n\n{span}"
    raw = _call(_SPLIT_SYSTEM, user, api_key, model)
    if not raw:
        return None
    parsed = parse_llm_json(raw)
    if not isinstance(parsed, dict):
        return None
    box = str(parsed.get("box") or "").strip()
    cont = str(parsed.get("continuation") or "").strip()
    if not box:
        return None
    return box, cont


def _find_box(sections: List[Dict[str, Any]], failure):
    """The one box whose content opens with the failure's content_head."""
    head = (failure.content_head or "").strip()
    if not head:
        return None
    from extraction_audit import iter_sections
    for _d, sec in iter_sections(sections):
        if str(sec.get("content") or "").strip().startswith(head):
            return sec
    return None


def _strip_heading_line(text: str) -> str:
    """The model sometimes copies the '### Activity' line into its answer."""
    head, sep, rest = text.partition("\n")
    if sep and head.lstrip().startswith("#"):
        return rest.lstrip("\n")
    return text


def _drop_empty_furniture(sections: List[Dict[str, Any]], failures) -> Tuple[List[Dict[str, Any]], int]:
    doomed = {(str(f.section_id or ""), str(f.title or "")[:80]) for f in failures}
    kept = [sec for sec in sections
            if (str(sec.get("id") or ""), str(sec.get("title") or "")[:80]) not in doomed]
    return kept, len(sections) - len(kept)


_IMAGE_TAG = re.compile(r"!\[[^\]]*\]\([^)]*\)|\[Image:[^\]]*\]")
# Opening words of a heading's printed text that a section must hold, in order,
# to count as that heading's section. Eight words tell "(i) Constant function"
# (f: A -> B, range has one element) from "1.10.6 Constant Function"
# (f: R -> R, f(x) = c) - both open "A function f".
_PROBE_WORDS = 8


def _words(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", _IMAGE_TAG.sub(" ", text or "").lower())


def _find_misnumbered(sections: List[Dict[str, Any]], failure, source_md: str):
    """The section that already holds a numbered heading's text under another id.

    The audit counts a numbered heading present by its NUMBER only. A section
    carrying the right title and text under a wrong or empty id is therefore
    "missing", and re-extracting it would store the text twice - renumbering it
    is the repair. Title alone does not prove identity: the book can print one
    title twice ("(i) Constant function" under 1.8, "1.10.6 Constant Function"),
    so the section must also hold the opening words printed under THIS heading.
    """
    from auto_schema_extractor import _SECNUM
    from extraction_audit import _norm_key, iter_sections
    if not failure.section_id or failure.span_start is None or failure.span_end is None:
        return None
    probe = _words(source_md[failure.span_start:failure.span_end])[:_PROBE_WORDS]
    if len(probe) < _PROBE_WORDS:
        return None                       # too little printed text to prove identity
    needle = f" {' '.join(probe)} "
    want = _norm_key(failure.title)
    for _d, sec in iter_sections(sections):
        title = re.sub(r"^\s*" + _SECNUM + r"\s*", "", str(sec.get("title") or ""))
        if _norm_key(title) != want:
            continue
        own = [str(sec.get("content") or "")] + [
            str(item.get("content") or "") for item in (sec.get("sub_items") or [])
            if isinstance(item, dict)]
        if needle in f" {' '.join(_words(' '.join(own)))} ":
            return sec
    return None


def _find_section(sections: List[Dict[str, Any]], section_id: str, title: str):
    """Locate a section by id, else by title, anywhere in the tree."""
    want_id = (section_id or "").strip()
    want_title = re.sub(r"[^a-z0-9]+", "", (title or "").lower())
    from extraction_audit import iter_sections
    for _depth, sec in iter_sections(sections):
        if want_id and str(sec.get("id") or "").strip() == want_id:
            return sec
        if want_title and re.sub(r"[^a-z0-9]+", "",
                                 str(sec.get("title") or "").lower()) == want_title:
            return sec
    return None


def _repair_unit_fields(unit: Dict[str, Any], source_md: str,
                        declared: Optional[Dict[str, Any]]) -> int:
    """Fix the unit's own fields. No model call — the source has the answers."""
    from auto_schema_extractor import derive_unit_title, is_placeholder_unit_title
    from extraction_audit import _DECLARED_FIELDS, grounded_in_source

    fixed = 0
    number = unit.get("unit_number") or unit.get("chapter_number")

    title = str(unit.get("title") or "").strip()
    stripped = title.strip("*# ").strip()
    if stripped != title:
        unit["title"] = title = stripped
        fixed += 1
    if is_placeholder_unit_title(title):
        printed = derive_unit_title(source_md, number)
        if printed:
            logger.info(f"[Repair] unit title {title!r} → {printed!r} (from the source)")
            unit["title"] = printed
            fixed += 1

    # Metadata the pipeline never declared AND the book never prints is the
    # model's invention, not a reading — drop it rather than let it reach
    # Qdrant's filters. A value the source does print stays: a Social Science
    # unit's part really is "History".
    for field_name in _DECLARED_FIELDS:
        got = unit.get(field_name)
        if got in (None, ""):
            continue
        want = (declared or {}).get(field_name)
        if want not in (None, ""):
            if str(got).strip().lower() != str(want).strip().lower():
                logger.info(f"[Repair] {field_name} {got!r} → declared {want!r}")
                unit[field_name] = want
                fixed += 1
        elif not grounded_in_source(got, source_md):
            logger.info(f"[Repair] dropping invented {field_name}={got!r}")
            unit.pop(field_name, None)
            fixed += 1
    return fixed


def _promote_adopted_headings(
    sections: List[Dict[str, Any]],
    failures,
    source_md: str,
) -> Tuple[List[Dict[str, Any]], int]:
    """Lift printed headings out of a parent the book never printed."""
    from auto_schema_extractor import iter_source_headings
    printed = {re.sub(r"[^a-z0-9]+", "", t.lower())
               for _s, _e, t in iter_source_headings(source_md or "")}

    def _key(sec: Dict[str, Any]) -> str:
        return re.sub(r"[^a-z0-9]+", "", str(sec.get("title") or "").lower())

    doomed_parents = {(str(f.section_id or ""), str(f.title or "")[:80]) for f in failures}
    out: List[Dict[str, Any]] = []
    promoted = 0
    for sec in sections:
        out.append(sec)
        ident = (str(sec.get("id") or ""), str(sec.get("title") or "")[:80])
        if ident not in doomed_parents:
            continue
        for key in ("sub_sections", "subsections", "sections"):
            kids = sec.get(key) or []
            keep, lift = [], []
            for kid in kids:
                (lift if isinstance(kid, dict) and _key(kid) in printed else keep).append(kid)
            if lift:
                sec[key] = keep
                if not keep:
                    sec.pop(key, None)
                out.extend(lift)                 # right after the parent; sort fixes order
                promoted += len(lift)
    if promoted:
        logger.info(f"[Repair] promoted {promoted} printed heading(s) out of an unprinted parent")
    return out, promoted


def _drop_backmatter(sections: List[Dict[str, Any]],
                     failures) -> Tuple[List[Dict[str, Any]], int]:
    """Remove the sections the audit identified as publisher credits."""
    doomed = {(str(f.section_id or ""), str(f.title or "")) for f in failures}
    kept = [sec for sec in sections
            if (str(sec.get("id") or ""), str(sec.get("title") or "")[:80]) not in doomed]
    return kept, len(sections) - len(kept)


def repair_from_audit(
    structured_data: Dict[str, Any],
    source_md: str,
    audit_result,
    api_key: str = "",
    model: str = _MODEL,
    max_llm_repairs: int = 40,
    declared: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], Dict[str, int]]:
    """Apply the repairs an audit asked for. Returns (data, counts)."""
    from extraction_audit import (MISSING_HEADING, EMPTY_SECTION, DUPLICATE,
                                  OUT_OF_ORDER, SCHEMA_INVALID, UNIT_INVALID,
                                  BACKMATTER_SECTION, ORPHAN_PROSE, MIS_NESTED,
                                  BOX_OVERFULL, EMPTY_FURNITURE)
    import auto_schema_extractor as ase

    units = structured_data.get("units") or structured_data.get("chapters") or []
    if not units:
        return structured_data, {}
    counts = {"deterministic": 0, "targeted": 0, "failed": 0,
              "unit_fields": 0, "backmatter_dropped": 0, "reattached": 0,
              "promoted": 0, "boxes_split": 0, "furniture_dropped": 0,
              "renumbered": 0}

    # ── deterministic first: they are free, and they change what is missing ──
    kinds = {f.kind for f in audit_result.failures}
    backmatter_failures = [f for f in audit_result.failures
                           if f.kind == BACKMATTER_SECTION]
    for unit in units:
        secs = unit.get("sections") or []
        if UNIT_INVALID in kinds:
            counts["unit_fields"] += _repair_unit_fields(unit, source_md, declared)
        if backmatter_failures:
            secs, dropped = _drop_backmatter(secs, backmatter_failures)
            counts["backmatter_dropped"] += dropped
        if ORPHAN_PROSE in kinds:
            before_n = len(secs)
            secs = ase.reattach_orphan_prose(secs, source_md,
                                             unit_title=str(unit.get("title") or ""))
            counts["reattached"] += before_n - len(secs)
        if EMPTY_FURNITURE in kinds:
            secs, dropped = _drop_empty_furniture(
                secs, [f for f in audit_result.failures if f.kind == EMPTY_FURNITURE])
            counts["furniture_dropped"] += dropped
        if MIS_NESTED in kinds:
            # A section the book never printed as a heading must not own
            # sections that it did. This kind had NO repair, so one such fault
            # rejected a 99.6-score document outright: enrichment, debate and
            # Qdrant all skipped over a PROJECT/ACTIVITY the gap filler had
            # tucked under an EXERCISES line. Promote the adopted headings back
            # to the top level and let the source order them.
            mis = [f for f in audit_result.failures if f.kind == MIS_NESTED]
            secs, promoted = _promote_adopted_headings(secs, mis, source_md)
            counts["promoted"] += promoted
        if DUPLICATE in kinds:
            secs = ase.resolve_duplicate_sections(secs, source_md)
            counts["deterministic"] += 1
        if SCHEMA_INVALID in kinds:
            for _d, sec in _iter(secs):
                sec.setdefault("type", "other")
                for key in ("title", "content"):
                    if not isinstance(sec.get(key), str):
                        sec[key] = "" if sec.get(key) is None else str(sec[key])
            counts["deterministic"] += 1
        if OUT_OF_ORDER in kinds:
            secs = ase.sort_sections_by_source(secs, source_md)
            counts["deterministic"] += 1
        unit["sections"] = secs

    # ── mis-numbered: the text is there, filed under another id ─────────────
    renumbered = set()
    for failure in audit_result.failures:
        if failure.kind != MISSING_HEADING or not failure.section_id:
            continue
        for unit in units:
            twin = _find_misnumbered(unit.get("sections") or [], failure, source_md)
            if twin is None:
                continue
            logger.info(f"[Repair] {failure.section_id} {failure.title[:40]!r} was extracted "
                        f"as id={str(twin.get('id') or '')!r} - renumbered")
            twin["id"] = failure.section_id
            twin["title"] = re.sub(r"^\s*" + ase._SECNUM + r"\s*[\.\):]?\s*", "",
                                   str(twin.get("title") or "")).strip() or failure.title
            renumbered.add(id(failure))
            counts["renumbered"] += 1
            break

    # ── overfull boxes: the model says where the box ends ───────────────────
    # The box keeps its own text; the continuation becomes an untitled prose
    # section right after it, which the next pass's reattach re-joins to the
    # enclosing section. Whatever the model decides, the box is marked checked
    # so a long-but-legitimate activity is asked about once, not every pass.
    box_failures = [f for f in audit_result.failures
                    if f.kind == BOX_OVERFULL and f.span_start is not None]
    if box_failures and api_key:
        for unit in units:
            for failure in box_failures:
                box = _find_box(unit.get("sections") or [], failure)
                if box is None:
                    continue
                verdict = split_overfull_box(source_md, failure, api_key, model)
                box.setdefault("metadata", {})["box_checked"] = True
                if not verdict:
                    counts["failed"] += 1
                    continue
                box_text, continuation = verdict
                box_text = _strip_heading_line(box_text).strip()
                continuation = _strip_heading_line(continuation).strip()
                if not continuation or len(continuation) < 80:
                    logger.info(f"[Repair] {failure.title[:40]!r}: model kept it whole")
                    continue
                box["content"] = box_text
                secs = unit.get("sections") or []
                # Insert the continuation after the box's top-level position.
                at = len(secs)
                for i, top in enumerate(secs):
                    if top is box or any(k is box for key in ("sub_sections", "subsections", "sections")
                                         for k in (top.get(key) or [])):
                        at = i + 1
                        break
                secs.insert(at, {"type": "prose", "id": "", "title": "",
                                 "content": continuation})
                unit["sections"] = secs
                counts["boxes_split"] += 1
                logger.info(f"[Repair] {failure.title[:40]!r}: {len(continuation)} chars "
                            f"of exposition moved out of the box")
    elif box_failures:
        logger.info(f"[Repair] {len(box_failures)} overfull box(es) noted — no API key "
                    f"to ask the model (advisory, does not block)")

    # ── targeted: one call per failing section, nothing more ────────────────
    llm_failures = [f for f in audit_result.failures
                    if f.kind in (MISSING_HEADING, EMPTY_SECTION)
                    and f.span_start is not None and id(f) not in renumbered]
    if llm_failures and not api_key:
        logger.warning("[Repair] no API key — skipping targeted re-extraction")
        llm_failures = []

    if llm_failures:
        logger.info(
            f"[Repair] Re-extracting {min(len(llm_failures), max_llm_repairs)} "
            f"failing section(s) individually (not the whole unit)"
        )

    target_unit = units[0]
    for failure in llm_failures[:max_llm_repairs]:
        section = targeted_extract(source_md, failure, api_key, model)
        if not section:
            counts["failed"] += 1
            continue
        existing = None
        if failure.kind == EMPTY_SECTION:
            existing = _find_section(target_unit.get("sections") or [],
                                     failure.section_id, failure.title)
        if existing is not None:
            existing["content"] = section["content"]
            if section.get("sub_items"):
                existing["sub_items"] = section["sub_items"]
        else:
            # A MISSING heading is added, never skipped as "already there": the
            # audit has already looked by its own rule. Skipping on a looser
            # id-or-title match dead-ended the loop on a title the book prints
            # twice - "1.10.6 Constant Function" was judged present because
            # "(i) Constant function" under 1.8 was, and the document was
            # rejected for missing_heading x1 after every pass.
            target_unit.setdefault("sections", []).append(section)
        counts["targeted"] += 1

    # Re-sort so anything appended lands in reading order.
    for unit in units:
        unit["sections"] = ase.sort_sections_by_source(
            unit.get("sections") or [], source_md)

    logger.info(
        f"[Repair] {counts['targeted']} section(s) re-extracted, "
        f"{counts['renumbered']} renumbered, "
        f"{counts['deterministic']} deterministic pass(es), {counts['failed']} failed, "
        f"{counts['unit_fields']} unit field(s) corrected, "
        f"{counts['backmatter_dropped']} colophon section(s) dropped, "
        f"{counts['reattached']} paragraph(s) re-joined, "
        f"{counts['promoted']} heading(s) un-nested, "
        f"{counts['boxes_split']} box(es) split, {counts['furniture_dropped']} empty furniture dropped"
    )
    return structured_data, counts


def _iter(sections):
    from extraction_audit import iter_sections
    return iter_sections(sections)


def audit_repair_loop(
    structured_data: Dict[str, Any],
    source_md: str,
    api_key: str = "",
    model: str = _MODEL,
    max_passes: int = 3,
    declared: Optional[Dict[str, Any]] = None,
):
    """Audit, repair only what failed, re-audit. Returns (data, final_audit, history).

    Each pass fixes the sections the previous audit named and nothing else, so
    the cost scales with the number of faults rather than the size of the book.
    Stops early the moment the audit passes, or when a pass stops making
    progress — looping on a fault the repair cannot fix just burns tokens.
    """
    from extraction_audit import audit_extraction

    history: List[Dict[str, Any]] = []
    result = audit_extraction(structured_data, source_md, declared=declared)
    history.append({"pass": 0, "summary": result.summary(), "stats": dict(result.stats)})

    for attempt in range(1, max_passes + 1):
        if result.passed:
            break
        before = len(result.failures)
        structured_data, counts = repair_from_audit(
            structured_data, source_md, result, api_key=api_key, model=model,
            declared=declared)
        result = audit_extraction(structured_data, source_md, declared=declared)
        history.append({
            "pass": attempt, "summary": result.summary(),
            "stats": dict(result.stats), "repairs": counts,
        })
        logger.info(f"[AuditLoop] pass {attempt}: {before} → {len(result.failures)} failure(s)")
        # A split box turns one advisory into one orphan for the next pass to
        # re-join; that is progress, not a stall.
        if len(result.failures) >= before and not counts.get("boxes_split"):
            logger.warning(
                f"[AuditLoop] pass {attempt} made no progress "
                f"({before} → {len(result.failures)}) — stopping"
            )
            break

    return structured_data, result, history
