"""
GradeUp-owned slide editor adapter for the seminar PPT co-pilot (tool="gradeup").

The Google Slides flow needs the student's Google account (Scalekit / OAuth), the Apps
Script add-on and the MCP bridge — none of which can be hosted inside GradeUp. This
adapter keeps the SAME co-pilot brain (theme choice, RAG topics, the analyze_slide_node
planner, the source router, image search) but targets the self-hosted GradeUp editor:

  * /ppt/session/start  -> start_gradeup_session(): builds the initial outline as native
                           editor slides and returns edit/embed URLs on the GradeUp frontend.
  * /ppt/suggest        -> suggest_gradeup(): Node sends the live slide snapshot; we route
                           the message (image / guide / answer / edit) and, for edits,
                           translate the planner's ops into native editor operations that
                           Node applies after approval.
  * /ppt/decide         -> decide_gradeup(): resolves the pending proposal.

Nothing here writes to a deck — Node owns execution ("execution": "node"). Every mutating
call carries a request_id and is idempotent via ppt_session.ppt_idempotency.
"""

import copy
import math
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import HTTPException

from logger import get_logger
from ppt.ppt_nodes import analyze_slide_node
from ppt.ppt_session import (
    create_session_record,
    find_session_by_deck_ref,
    get_idempotent_response,
    get_session,
    record_rejection,
    save_idempotent_response,
    set_last_images,
    update_session_record,
)

logger = get_logger(__name__)

ALLOWED_FONTS = {
    "Arial",
    "Verdana",
    "Georgia",
    "Times New Roman",
    "Courier New",
    "Trebuchet MS",
}


def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _color(value: Any, fallback: str) -> str:
    value = str(value or "")
    return value if re.fullmatch(r"#[0-9A-Fa-f]{6}", value) else fallback


def _font(value: Any) -> str:
    value = str(value or "")
    return value if value in ALLOWED_FONTS else "Arial"


def _theme(raw: Dict[str, Any]) -> Dict[str, Any]:
    raw = raw or {}

    return {
        "background_hex": _color(raw.get("background_hex"), "#FFFFFF"),
        "title_color_hex": _color(raw.get("title_color_hex"), "#17251F"),
        "body_color_hex": _color(raw.get("body_color_hex"), "#263B32"),
        "accent_hex": _color(raw.get("accent_hex"), "#277F60"),
        "font_family": _font(raw.get("font_family")),
        "title_size_pt": min(
            72,
            max(24, float(raw.get("title_size_pt") or 36)),
        ),
        "body_size_pt": min(
            40,
            max(14, float(raw.get("body_size_pt") or 20)),
        ),
    }


def _text_element(
    text: str,
    x: float,
    y: float,
    width: float,
    height: float,
    theme: Dict[str, Any],
    *,
    size: float = None,
    bold: bool = False,
    fill: str = None,
    align: str = "left",
) -> Dict[str, Any]:
    return {
        "id": _uid("text"),
        "type": "text",
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "rotation": 0,
        "opacity": 1,
        "text": str(text or ""),
        "fontFamily": theme["font_family"],
        "fontSize": size or theme["body_size_pt"],
        "bold": bold,
        "italic": False,
        "underline": False,
        "align": align,
        "fill": fill or theme["body_color_hex"],
        "lineHeight": 1.2,
        "list": "none",
    }


def _rect_element(
    x: float,
    y: float,
    width: float,
    height: float,
    theme: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "id": _uid("shape"),
        "type": "rect",
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "rotation": 0,
        "opacity": 1,
        "fill": "#FFFFFF",
        "stroke": theme["accent_hex"],
        "strokeWidth": 2,
        "cornerRadius": 8,
    }


def _title_elements(
    title: str,
    theme: Dict[str, Any],
) -> List[Dict[str, Any]]:
    return [
        _text_element(
            title,
            72,
            42,
            1136,
            80,
            theme,
            size=theme["title_size_pt"],
            bold=True,
            fill=theme["title_color_hex"],
        )
    ]


def _content_slide(
    title: str,
    theme: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "id": _uid("slide"),
        "title": title,
        "background": theme["background_hex"],
        "notes": "",
        "elements": _title_elements(title, theme),
    }


def _title_slide(
    title: str,
    theme: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "id": _uid("slide"),
        "title": title,
        "background": theme["background_hex"],
        "notes": f"Introduce the seminar topic: {title}.",
        "elements": [
            _text_element(
                title,
                100,
                250,
                1080,
                150,
                theme,
                size=max(44, theme["title_size_pt"]),
                bold=True,
                fill=theme["title_color_hex"],
                align="center",
            )
        ],
    }


def _initial_slides(
    title: str,
    topics: List[str],
    theme: Dict[str, Any],
) -> List[Dict[str, Any]]:
    clean_topics = []

    for topic in topics:
        topic = str(topic or "").strip()
        if topic and topic.lower() != title.lower():
            clean_topics.append(topic)

    if not clean_topics:
        clean_topics = [
            "Introduction",
            "Key Concepts",
            "Important Processes",
            "Applications",
            "Summary",
        ]

    slides = [_title_slide(title, theme)]

    for topic in clean_topics[:8]:
        slides.append(_content_slide(topic[:200], theme))

    return slides


def start_gradeup_session(payload: Dict[str, Any]) -> Dict[str, Any]:
    student_id = str(payload.get("student_id") or "")
    request_id = str(payload.get("request_id") or "")

    if not request_id:
        raise HTTPException(422, "request_id is required for GradeUp slides")

    scope = f"gradeup:start:{student_id}"
    cached = get_idempotent_response(scope, request_id)

    if cached:
        return cached

    existing_ref = payload.get("deck_ref")

    if existing_ref:
        session = find_session_by_deck_ref(existing_ref, student_id)

        if not session:
            raise HTTPException(404, "GradeUp deck session was not found")

        response = _start_response(session)
        save_idempotent_response(scope, request_id, response)
        return response

    # Fail fast on missing config before spending an LLM call on the theme.
    editor_base = os.environ.get(
        "GRADEUP_SLIDES_EDITOR_BASE_URL",
        "",
    ).rstrip("/")

    if not editor_base.startswith(("http://", "https://")):
        raise HTTPException(
            503,
            "GRADEUP_SLIDES_EDITOR_BASE_URL is not configured",
        )

    try:
        from ppt.ppt_design import llm_choose_theme

        selected_theme = llm_choose_theme(
            payload["board"],
            payload["class_number"],
            payload.get("subject"),
            payload["title"],
        )
    except Exception as exc:
        logger.error(f"[gradeup:start] theme generation failed: {exc}")
        from ppt.ppt_theme import DEFAULT_THEME_SPEC

        selected_theme = dict(DEFAULT_THEME_SPEC)

    selected_theme = _theme(selected_theme)

    # Same normalisation as ppt_session.start_session: Node sends "No term" for
    # CBSE/NCERT, which must become None (no term filter) before it reaches Qdrant.
    from term_utils import normalize_term

    coords = {
        "board": payload["board"],
        "class_number": payload["class_number"],
        "subject": payload.get("subject"),
        "unit": payload["chapter"],
        "unit_title": payload["title"],
        "term": normalize_term(payload.get("term")),
    }

    try:
        from ppt.ppt_rag import unit_topics

        topics = unit_topics(coords, limit=8)
    except Exception as exc:
        logger.error(f"[gradeup:start] topic retrieval failed: {exc}")
        topics = []

    deck_id = uuid.uuid4().hex[:24]
    session_id = uuid.uuid4().hex
    deck_ref = f"gradeup:{deck_id}"

    edit_url = f"{editor_base}/{deck_id}"
    embed_url = f"{edit_url}/present"
    now = datetime.now(timezone.utc).isoformat()
    slides = _initial_slides(payload["title"], topics, selected_theme)

    session = {
        "session_id": session_id,
        "student_id": student_id,
        "deck_id": deck_id,
        "deck_ref": deck_ref,
        "tool": "gradeup",
        "title": payload["title"],
        "deck_mode": "gradeup",
        **coords,
        "theme_spec": selected_theme,
        "initial_slides": slides,
        "created_at": now,
        "ended_at": None,
        "edits": 0,
        "skill_totals": {},
        "urls": {
            "edit_url": edit_url,
            "embed_url": embed_url,
        },
        "deck_created": True,
        "pending_proposal": None,
        "slide_status": {},
        "rejection_count": 0,
        "spell_cache": {},
        "rag_stats": {
            "hits": 0,
            "misses": 0,
            "total_score": 0.0,
            "calls": 0,
        },
        "all_slide_titles": [slide["title"] for slide in slides],
        "used_layouts": {},
    }

    create_session_record(session)

    response = _start_response(session)
    save_idempotent_response(scope, request_id, response)

    logger.info(
        f"[gradeup:start] session={session_id} deck={deck_id} "
        f"slides={len(slides)}"
    )

    return response


def _start_response(session: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "session_id": session["session_id"],
        "deck_id": session["deck_id"],
        "deck_ref": session["deck_ref"],
        "edit_url": session["urls"]["edit_url"],
        "embed_url": session["urls"]["embed_url"],
        "deck_created": session.get("deck_created", True),
        "deck_mode": "gradeup",
        "title": session["title"],
        "theme_spec": session["theme_spec"],
        "initial_slides": session["initial_slides"],
        "guidance": (
            f'Your outline for "{session["title"]}" is ready. '
            "Select a slide and ask the copilot to add or improve content."
        ),
    }


def _legacy_snapshot(slide: Dict[str, Any]) -> Dict[str, Any]:
    elements = slide.get("elements") or []
    text_elements = [
        element
        for element in elements
        if element.get("type") == "text"
        and str(element.get("text") or "").strip()
    ]

    slide_title = str(slide.get("title") or "").strip()
    body_lines = []

    for element in text_elements:
        text = str(element.get("text") or "").strip()

        if text != slide_title:
            body_lines.extend(
                line.strip()
                for line in text.splitlines()
                if line.strip()
            )

    title_element = next(
        (
            element
            for element in text_elements
            if str(element.get("text") or "").strip() == slide_title
        ),
        None,
    )

    return {
        "title": slide_title,
        "body": "\n".join(body_lines),
        "bullets": body_lines,
        "title_font_size": (
            title_element.get("fontSize")
            if title_element
            else None
        ),
        "has_image": any(
            element.get("type") == "image"
            for element in elements
        ),
        "has_layout": any(
            element.get("type") in {"rect", "ellipse"}
            for element in elements
        ),
        "has_table": False,
        "shapes": [
            {
                "text": element.get("text", ""),
                "placeholder": (
                    "TITLE"
                    if element is title_element
                    else None
                ),
            }
            for element in text_elements
        ],
    }


def _entries_from_layout(layout: Dict[str, Any]) -> List[Dict[str, str]]:
    kind = layout.get("layout")
    entries = []

    if kind in {"icon_grid", "accent_list"}:
        for item in layout.get("items") or []:
            entries.append({
                "heading": " ".join(
                    value
                    for value in [
                        str(item.get("icon") or "").strip(),
                        str(
                            item.get("label")
                            or item.get("lead")
                            or ""
                        ).strip(),
                    ]
                    if value
                ),
                "text": str(item.get("text") or "").strip(),
            })

    elif kind == "steps":
        for index, item in enumerate(layout.get("steps") or [], 1):
            entries.append({
                "heading": f"{index}. {item.get('title', '')}".strip(),
                "text": str(item.get("text") or "").strip(),
            })

    elif kind == "timeline":
        for item in layout.get("events") or []:
            entries.append({
                "heading": " ".join(
                    value
                    for value in [
                        str(item.get("when") or "").strip(),
                        str(item.get("title") or "").strip(),
                    ]
                    if value
                ),
                "text": str(item.get("text") or "").strip(),
            })

    elif kind == "comparison":
        for item in [layout.get("left"), layout.get("right")]:
            if not isinstance(item, dict):
                continue

            points = item.get("points") or []
            text = "\n".join(
                str(
                    point.get("text")
                    if isinstance(point, dict)
                    else point
                ).strip()
                for point in points
                if point
            )

            entries.append({
                "heading": str(
                    item.get("heading")
                    or item.get("title")
                    or ""
                ).strip(),
                "text": text,
            })

    else:
        cards = layout.get("cards") or []

        for card in cards:
            points = card.get("points") or []
            lines = []

            for point in points:
                if isinstance(point, dict):
                    lead = str(point.get("lead") or "").strip()
                    text = str(point.get("text") or "").strip()
                    lines.append(
                        f"{lead}: {text}".strip(": ")
                        if lead
                        else text
                    )
                elif str(point).strip():
                    lines.append(str(point).strip())

            entries.append({
                "heading": str(card.get("heading") or "").strip(),
                "text": "\n".join(lines),
            })

    return [
        entry
        for entry in entries
        if entry["heading"] or entry["text"]
    ]


def _render_entries(
    title: str,
    entries: List[Dict[str, str]],
    theme: Dict[str, Any],
) -> List[Dict[str, Any]]:
    entries = entries[:6]

    if not entries:
        entries = [{"heading": "", "text": "Add slide content here"}]

    columns = 2 if len(entries) > 1 else 1
    rows = math.ceil(len(entries) / columns)
    gap = 24
    left = 72
    top = 150
    total_width = 1136
    total_height = 500

    box_width = (
        total_width
        if columns == 1
        else (total_width - gap) / 2
    )
    box_height = (total_height - gap * (rows - 1)) / rows

    elements = _title_elements(title, theme)

    for index, entry in enumerate(entries):
        column = index % columns
        row = index // columns
        x = left + column * (box_width + gap)
        y = top + row * (box_height + gap)

        elements.append(
            _rect_element(x, y, box_width, box_height, theme)
        )

        elements.append(
            _text_element(
                entry["heading"],
                x + 20,
                y + 16,
                box_width - 40,
                36,
                theme,
                size=min(24, theme["body_size_pt"] + 3),
                bold=True,
                fill=theme["title_color_hex"],
            )
        )

        elements.append(
            _text_element(
                entry["text"],
                x + 20,
                y + 58,
                box_width - 40,
                max(40, box_height - 74),
                theme,
                size=theme["body_size_pt"],
            )
        )

    return elements


def _native_operations(
    slide: Dict[str, Any],
    planned_ops: List[Dict[str, Any]],
    theme: Dict[str, Any],
) -> List[Dict[str, Any]]:
    slide_id = slide["id"]
    title = str(slide.get("title") or "Untitled slide")
    operations = []
    content_operation = None
    notes = None

    for operation in planned_ops:
        if operation.get("op") in {
            "set_layout",
            "set_cards",
            "set_bullets",
            "add_bullets",
        }:
            content_operation = operation

        if operation.get("op") == "set_speaker_notes":
            notes = str(operation.get("value") or "")

    if content_operation:
        kind = content_operation["op"]
        value = content_operation.get("value")

        if kind == "set_layout":
            entries = _entries_from_layout(value or {})
        elif kind == "set_cards":
            entries = _entries_from_layout({
                "layout": "cards",
                "cards": value or [],
            })
        else:
            entries = [
                {"heading": "", "text": str(item)}
                for item in (value or [])
                if str(item).strip()
            ]

        operations.append({
            "op": "update_slide",
            "slide_id": slide_id,
            "changes": {
                "background": theme["background_hex"],
                "elements": _render_entries(title, entries, theme),
            },
        })

    else:
        changed_elements = copy.deepcopy(slide.get("elements") or [])
        changed = False

        for operation in planned_ops:
            if operation.get("op") == "font_title_size":
                for element in changed_elements:
                    if (
                        element.get("type") == "text"
                        and str(element.get("text") or "").strip() == title
                    ):
                        element["fontSize"] = float(operation["value"])
                        changed = True

            if operation.get("op") == "fix_spelling":
                for correction in operation.get("value") or []:
                    wrong = str(correction.get("wrong") or "")
                    right = str(correction.get("right") or "")

                    if not wrong:
                        continue

                    for element in changed_elements:
                        if element.get("type") == "text":
                            original = str(element.get("text") or "")
                            replaced = original.replace(wrong, right)

                            if replaced != original:
                                element["text"] = replaced
                                changed = True

        if changed:
            operations.append({
                "op": "update_slide",
                "slide_id": slide_id,
                "changes": {"elements": changed_elements},
            })

    if notes is not None:
        operations.append({
            "op": "set_speaker_notes",
            "slide_id": slide_id,
            "value": notes,
        })

    return operations


def suggest_gradeup(
    session: Dict[str, Any],
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    request_id = str(payload.get("request_id") or "")
    query = str(payload.get("query") or "").strip()

    if not request_id:
        raise HTTPException(422, "request_id is required")

    if not query:
        raise HTTPException(422, "query is required")

    if payload.get("deck_ref") != session.get("deck_ref"):
        raise HTTPException(409, "deck_ref does not match this session")

    slide = payload.get("slide_snapshot")

    if not isinstance(slide, dict):
        raise HTTPException(422, "slide_snapshot is required")

    if payload.get("slide_id") != slide.get("id"):
        raise HTTPException(422, "slide_id does not match slide_snapshot")

    scope = f"gradeup:suggest:{session['session_id']}"
    cached = get_idempotent_response(scope, request_id)

    if cached:
        return cached

    from ppt.ppt_source_router import decide_source

    decision = decide_source(
        query,
        coords={"unit_title": session.get("unit_title")},
    )

    intent = decision["intent"]
    source = decision["source"]
    legacy_snapshot = _legacy_snapshot(slide)

    if intent == "image":
        from ppt.ppt_review import llm_image_query
        from ppt.ppt_websearch import image_search

        image_query = llm_image_query(
            query,
            legacy_snapshot.get("title", ""),
            legacy_snapshot.get("body", ""),
            session.get("unit_title", ""),
        )

        images = [
            image
            for image in image_search(image_query)
            if str(image.get("url") or "").startswith("https://")
        ][:10]

        set_last_images(session["session_id"], images, image_query)

        response = {
            "status": "images",
            "intent": "image",
            "source": "web",
            "ai_feedback": (
                f'Here are images for "{image_query}". '
                "Select one to add it to this slide."
            ),
            "image_query": image_query,
            "images": images,
            "suggestions": [],
        }

        save_idempotent_response(scope, request_id, response)
        return response

    if intent == "guide":
        from ppt.ppt_review import llm_design_guidance

        guide = llm_design_guidance(
            legacy_snapshot.get("title", ""),
            legacy_snapshot.get("body", ""),
            session.get("unit_title", ""),
            session.get("theme_spec") or {},
            query,
        )

        response = {
            "status": "guidance",
            "intent": "guide",
            "ai_feedback": guide.get("guidance", ""),
            "suggestions": [],
        }

        save_idempotent_response(scope, request_id, response)
        return response

    other_slides = [
        f"{item.get('title', '')}: {item.get('text', '')}"
        for item in payload.get("other_slides") or []
    ]

    state = {
        "session_id": session["session_id"],
        "student_id": session["student_id"],
        "deck_ref": session["deck_ref"],
        "slide_index": payload["slide_index"],
        "slide_op": "review" if intent == "edit" else "suggest",
        "student_query": "" if intent == "edit" else query,
        "student_instruction": query,
        "web_source": source,
        "board": session.get("board"),
        "class_number": session.get("class_number"),
        "subject": session.get("subject"),
        "unit": session.get("unit"),
        "unit_title": session.get("unit_title"),
        "term": session.get("term"),
        "theme_spec": session.get("theme_spec"),
        "slide_snapshot": legacy_snapshot,
        "all_slide_titles": [
            item.get("title", "")
            for item in payload.get("other_slides") or []
        ] + [slide.get("title", "")],
        "other_slides": other_slides,
        "avoid_layouts": [],
        "current_layout": "",
        "rejection_count": session.get("rejection_count", 0),
        "deck_mode": "gradeup",
    }

    result = analyze_slide_node(state)

    if intent != "edit":
        response = {
            "status": "done",
            "intent": "answer",
            "ai_feedback": result.get("analysis", ""),
            "suggestions": result.get("suggestions", []),
            "source_used": result.get("source_used", source),
            "images": [],
        }

        save_idempotent_response(scope, request_id, response)
        return response

    operations = _native_operations(
        slide,
        result.get("planned_ops") or [],
        _theme(session.get("theme_spec") or {}),
    )

    if not operations:
        response = {
            "status": "done",
            "intent": "edit",
            "ai_feedback": result.get(
                "analysis",
                "No slide changes are needed.",
            ),
            "suggestions": [],
            "images": [],
        }

        save_idempotent_response(scope, request_id, response)
        return response

    proposal_id = _uid("proposal")

    response = {
        "status": "awaiting_approval",
        "intent": "edit",
        "proposal_id": proposal_id,
        "ai_feedback": result.get(
            "analysis",
            "Review this proposed slide change.",
        ),
        "operations": operations,
        "suggestions": [],
        "images": [],
    }

    session["pending_proposal"] = {
        "proposal_id": proposal_id,
        "request_id": request_id,
        "slide_id": slide["id"],
        "operations": operations,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    update_session_record(session)
    save_idempotent_response(scope, request_id, response)

    logger.info(
        f"[gradeup:suggest] session={session['session_id']} "
        f"slide={slide['id']} proposal={proposal_id} "
        f"operations={len(operations)}"
    )

    return response


def decide_gradeup(
    session: Dict[str, Any],
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    request_id = str(payload.get("request_id") or "")
    proposal_id = str(payload.get("proposal_id") or "")

    if not request_id or not proposal_id:
        raise HTTPException(
            422,
            "request_id and proposal_id are required",
        )

    scope = f"gradeup:decide:{session['session_id']}"
    cached = get_idempotent_response(scope, request_id)

    if cached:
        return cached

    pending = session.get("pending_proposal")

    if not pending or pending.get("proposal_id") != proposal_id:
        raise HTTPException(
            409,
            "This proposal is no longer pending",
        )

    decision = payload.get("decision")

    if decision not in {"approve", "reject", "skip"}:
        raise HTTPException(422, "Invalid decision")

    if decision == "reject":
        record_rejection(session["session_id"])
        session = get_session(session["session_id"]) or session

    session["pending_proposal"] = None
    update_session_record(session)

    response = {
        "status": "done",
        "proposal_id": proposal_id,
        "decision": decision,
        "operations": pending.get("operations", []),
        "ai_feedback": (
            "The proposal was approved."
            if decision == "approve"
            else "The proposal was dismissed."
        ),
    }

    save_idempotent_response(scope, request_id, response)

    logger.info(
        f"[gradeup:decide] session={session['session_id']} "
        f"proposal={proposal_id} decision={decision}"
    )

    return response
