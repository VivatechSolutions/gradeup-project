"""
LLM content-review for the seminar PPT co-pilot (M2).

Given a slide's current content and the chapter's authoritative textbook context (RAG chunks),
judge the slide's CONTENT — accuracy, completeness, clarity — and suggest concise bullets the
student can present. Design/fonts are out of scope here (that's the heuristic path).

Matches the repo's LLM convention (seminar_engine._call_llm): POST to OpenAI chat completions
with OPENAI_API_KEY_TEXT / OPENAI_API_KEY, gpt-4o-mini with a gpt-4o fallback, JSON output.
Degrades gracefully: no API key or a failed call → severity "good" with a note (never blocks).

See SEMINAR_PPT_AUTOMATION_PLAN.md §2b / §6 (M2).
"""

import json
import os
import re
from typing import Any, Dict, List, Optional

import requests

REVIEW_MODEL = "gpt-4o-mini"
REVIEW_FALLBACK_MODEL = "gpt-4o"
REVIEW_TIMEOUT = 60


def _call_llm_json(messages: List[Dict[str, str]], temperature: float = 0.2):
    api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": REVIEW_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_completion_tokens": 1024,
        "response_format": {"type": "json_object"},
    }
    try:
        resp = requests.post("https://api.openai.com/v1/chat/completions",
                             headers=headers, json=payload, timeout=REVIEW_TIMEOUT)
        if not resp.ok:
            payload["model"] = REVIEW_FALLBACK_MODEL
            resp = requests.post("https://api.openai.com/v1/chat/completions",
                                 headers=headers, json=payload, timeout=REVIEW_TIMEOUT)
        if resp.ok:
            return json.loads(resp.json()["choices"][0]["message"]["content"])
    except Exception as e:
        print(f"  [ppt_review] LLM call failed: {e}")
    return None


def _readable_slide_text(slide_content: Dict[str, Any]) -> str:
    """
    The slide's presentable text, robust to the card layout.

    Prefers the BODY placeholder bullets/body; when those are empty (e.g. a slide already
    rendered as cards, whose text lives in standalone text boxes and whose BODY placeholder
    was removed), falls back to the non-title text shapes so the reviewer still sees content.
    """
    bullets = slide_content.get("bullets") or []
    if bullets:
        return "\n".join(str(b).strip() for b in bullets if str(b).strip())
    body = (slide_content.get("body") or "").strip()
    if body:
        return body
    parts: List[str] = []
    for sh in slide_content.get("shapes", []) or []:
        if sh.get("placeholder") in ("TITLE", "CENTERED_TITLE"):
            continue   # title is handled separately
        t = (sh.get("text") or "").strip()
        if t:
            parts.append(t)
    return "\n".join(parts)


def _chunks_to_context(rag_chunks: List[Dict[str, Any]], limit: int = 5,
                       max_chars: int = 2500) -> str:
    parts = []
    for c in rag_chunks[:limit]:
        md = c.get("metadata", {}) or {}
        text = (md.get("book_content") or c.get("content")
                or c.get("page_content") or c.get("text") or "")
        if text:
            parts.append(text.strip())
    return "\n\n".join(parts)[:max_chars]


def llm_review_content(slide_content: Dict[str, Any], rag_chunks: List[Dict[str, Any]],
                       unit_title: str, student_query: str = "") -> Dict[str, Any]:
    """
    Review one slide's content against the chapter context.

    If `student_query` is given, the review answers that specific question about the slide
    (e.g. "explain pollination", "is this correct?", "add more on grafting") and tailors the
    critique + suggestions to it. Otherwise it does a general content review.

    Returns {"severity": good|minor|significant, "critique": str, "suggested_bullets": [str]}.
    """
    slide_title = slide_content.get("title", "") or ""
    slide_text = _readable_slide_text(slide_content)

    context = _chunks_to_context(rag_chunks) or "(no textbook context available)"
    query = (student_query or "").strip()

    system = (
        "You are a seminar slide content coach for school students. Review ONLY the CONTENT of "
        "one slide — accuracy, completeness, clarity — against the authoritative textbook context. "
        "Ignore design and fonts. If the student asks a specific question, answer it directly in "
        "the critique and tailor the suggested bullets to it. Suggest concise, correct bullet "
        "points the student can present. Respond in strict JSON."
    )
    query_line = f'\nStudent\'s question about this slide: "{query}"' if query else ""
    user = f"""Chapter: {unit_title}
Slide title: {slide_title or '(none)'}
Current slide content:
{slide_text or '(empty)'}{query_line}

Textbook context:
{context}

Return JSON with exactly these keys:
{{"severity": "good" | "minor" | "significant",
  "critique": "answer the student's question if any, then what to improve (or praise)",
  "suggested_bullets": ["...", "..."]}}

Rules:
- If the student asked a question, the critique MUST address it directly.
- "good": content is accurate and sufficient; suggested_bullets may be [].
- "minor": small gaps; give a short verbal tip; suggested_bullets optional.
- "significant": important content is missing or wrong, or the student asked to add/fix content;
  provide 3-6 improved bullets.
- Bullets must be short (<= 12 words), factual, and grounded in the textbook context above."""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ])
    if not result:
        return {"severity": "good", "critique": "(AI content review unavailable.)",
                "suggested_bullets": []}

    severity = result.get("severity", "good")
    if severity not in ("good", "minor", "significant"):
        severity = "minor"
    bullets_out = result.get("suggested_bullets") or []
    if not isinstance(bullets_out, list):
        bullets_out = []
    return {
        "severity": severity,
        "critique": result.get("critique", "") or "",
        "suggested_bullets": [str(b).strip() for b in bullets_out if str(b).strip()],
    }


def llm_restructure_slide(slide_content: Dict[str, Any], rag_chunks: List[Dict[str, Any]],
                          unit_title: str) -> Dict[str, Any]:
    """
    Rewrite a slide's current content (usually prose) as concise point-wise bullets, and pick the
    key terms to bold. Used by the DESIGN path when a slide is prose / empty / overcrowded.

    Returns {"suggested_bullets": [str], "highlight_terms": [str], "critique": str}.
    highlight_terms are verbatim substrings of the bullets so apply-time offsets are findable.
    """
    slide_title = slide_content.get("title", "") or ""
    current = _readable_slide_text(slide_content)

    context = _chunks_to_context(rag_chunks) or "(no textbook context available)"

    system = (
        "You are a seminar slide designer for school students. Rewrite a slide's content into "
        "concise, presentable POINT-WISE bullets and pick the key terms to bold. Preserve the "
        "original meaning and stay grounded in the textbook context. Respond in strict JSON."
    )
    user = f"""Chapter: {unit_title}
Slide title: {slide_title or '(none)'}
Current slide content (may be prose paragraphs):
{current or '(empty)'}

Textbook context:
{context}

Return JSON with exactly these keys:
{{"suggested_bullets": ["...", "..."],
  "highlight_terms": ["...", "..."],
  "critique": "one sentence on what you changed"}}

Rules:
- 3-6 bullets, each a single idea, <= 12 words, factual, grounded in the context above.
- Convert any prose/paragraphs into crisp bullets — do not copy long sentences verbatim.
- PLAIN TEXT ONLY in the bullets — NO markdown, asterisks (*), underscores, or other formatting.
  Bolding is done separately via highlight_terms; never put ** around words.
- highlight_terms: 3-8 key words/phrases that appear EXACTLY (verbatim substrings) inside the
  bullets above — the important terms a presenter should emphasize."""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ])
    if not result:
        return {"suggested_bullets": [], "highlight_terms": [],
                "critique": "(AI restructure unavailable.)"}

    bullets_out = result.get("suggested_bullets") or []
    terms_out = result.get("highlight_terms") or []
    if not isinstance(bullets_out, list):
        bullets_out = []
    if not isinstance(terms_out, list):
        terms_out = []

    # Strip any stray markdown emphasis markers (*, `) — Slides shows them literally.
    def _plain(s: str) -> str:
        return re.sub(r"[*`]+", "", str(s)).strip()

    bullets_clean = [_plain(b) for b in bullets_out if _plain(b)]
    joined = "\n".join(bullets_clean).lower()
    # Keep only terms that actually appear in the (cleaned) bullets so bold ranges are findable.
    terms_clean = [_plain(t) for t in terms_out
                   if _plain(t) and _plain(t).lower() in joined]
    return {
        "suggested_bullets": bullets_clean,
        "highlight_terms": terms_clean,
        "critique": result.get("critique", "") or "",
    }


def _strip_md(s: Any) -> str:
    """Drop stray markdown emphasis markers — Slides renders them literally."""
    return re.sub(r"[*`_]{1,}", "", str(s or "")).strip()


def _sanitize_points(raw, cap):
    out = []
    for p in (raw or [])[:cap]:
        if isinstance(p, dict):
            lead, text = _strip_md(p.get("lead", "")), _strip_md(p.get("text", ""))
        elif isinstance(p, str):
            lead, text = "", _strip_md(p)
        else:
            continue
        if lead or text:
            out.append({"lead": lead, "text": text})
    return out


def _sanitize_card(c):
    if not isinstance(c, dict):
        return None
    heading = _strip_md(c.get("heading", ""))
    icon = str(c.get("icon", "") or "").strip()[:4]
    pts = _sanitize_points(c.get("points"), 3)
    if heading or pts:
        return {"heading": heading, "icon": icon, "points": pts}
    return None


def llm_build_slide_layout(slide_content: Dict[str, Any], rag_chunks: List[Dict[str, Any]],
                           unit_title: str,
                           other_slides: Optional[List[str]] = None,
                           avoid_layouts: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Choose the layout that best fits a slide's content and return a renderable layout spec.

    The agent (LLM) decides among:
      - "cards"       : 2-3 grouped sub-topics.
      - "steps"       : an ordered process / sequence.
      - "timeline"    : dated / chronological events.
      - "comparison"  : two things contrasted (A vs B).
      - "accent_list" : many short, ungroupable points.

    `other_slides` are short "Title: content" summaries of the deck's OTHER slides — passed
    so the layout stays distinct and doesn't duplicate what another slide already covers.

    Returns a dict: {"layout": <name or "">, plus the layout's own field, "critique": str}.
    On failure / no clear structure returns {"layout": ""} so the caller can fall back.
    """
    slide_title = slide_content.get("title", "") or ""
    current = _readable_slide_text(slide_content)
    context = _chunks_to_context(rag_chunks) or "(no textbook context available)"
    others = [t for t in (other_slides or []) if t and t.strip()]
    others_block = "\n".join(f"  - {o}" for o in others)
    others_line = (
        f"\nThe deck's OTHER slides already cover the following — do NOT repeat these:\n"
        f"{others_block}\n"
        "Keep THIS slide focused on its own title above and make it DISTINCT from the slides "
        "listed — different points, no overlapping sub-topics."
        if others else ""
    )
    _ALL_LAYOUTS = ["icon_grid", "cards", "accent_list", "steps", "timeline", "comparison"]
    avoid = [a for a in (avoid_layouts or []) if a]
    allowed = [l for l in _ALL_LAYOUTS if l not in avoid]
    # Hard constraint, placed as the FINAL instruction (models weight the last line most) so
    # it overrides the "key points -> icon_grid" default. Only while some layout is still free.
    avoid_final = (
        f"\n\nMOST IMPORTANT — THIS OVERRIDES EVERY RULE ABOVE: the layouts "
        f"[{', '.join(avoid)}] are already used on other slides and are FORBIDDEN here. "
        f"Your \"layout\" value MUST be exactly one of: {', '.join(allowed)}. Reshape the "
        f"content to fit whichever of those suits it best — do NOT return a forbidden layout."
        if avoid and allowed else ""
    )

    system = (
        "You are a seminar slide DESIGNER for school students. Read a slide's content and pick the "
        "ONE layout that presents it best, then output the content structured for that layout. "
        "Preserve meaning, stay grounded in the textbook context, keep every piece of text SHORT "
        "so it never overflows, and make the slide DISTINCT from the deck's other slides. "
        "Respond in strict JSON."
    )
    user = f"""Chapter: {unit_title}
Slide title: {slide_title or '(none)'}{others_line}
Current slide content:
{current or '(empty)'}

Textbook context:
{context}

Choose the ONE layout that best fits THIS slide's content and fill ONLY that layout's
field. Different slides should use different layouts — pick by the shape of the content:

- Key points / features / aspects (grid of icon cards):
  {{"layout": "icon_grid", "items": [{{"icon":"one emoji","label":"1-3 word bold label","text":"<= 12 words"}}], "critique":"..."}}
- An ordered process / sequence of stages (numbered steps):
  {{"layout": "steps", "steps": [{{"title":"1-3 words","text":"<= 12 words"}}], "critique":"..."}}
- Dated or chronological events (timeline):
  {{"layout": "timeline", "events": [{{"when":"year/date","title":"1-3 words","text":"<= 12 words"}}], "critique":"..."}}
- Two things contrasted, A vs B (two columns):
  {{"layout": "comparison",
    "left": {{"heading":"1-2 words","icon":"one emoji","points":[{{"lead":"1-2 words","text":"<= 10 words"}}]}},
    "right": {{"heading":"1-2 words","icon":"one emoji","points":[{{"lead":"1-2 words","text":"<= 10 words"}}]}},
    "critique":"..."}}
- 2-3 themed groups, each with its own sub-points (grouped cards):
  {{"layout": "cards", "cards": [{{"heading":"1-2 words","icon":"one emoji","points":[{{"lead":"1-2 words","text":"<= 10 words"}}]}}], "critique":"..."}}
- Many short, ungroupable points (accent list):
  {{"layout": "accent_list", "items": [{{"icon":"one emoji","lead":"1-2 word label","text":"<= 12 words"}}], "critique":"..."}}

Rules:
- Match the layout to the content's structure: a process → steps, real dates → timeline,
  a genuine A-vs-B → comparison, themed groups → cards, a flat set of key points →
  icon_grid or accent_list. Key-point content fits icon_grid, cards, OR accent_list — use
  that freedom to give each slide a DIFFERENT design across the deck.
- "icon_grid": 3-6 items. "cards": 2-3 groups of 3 points. "accent_list": 3-7 items.
- "steps": 3-5 steps. "timeline": 3-5 events. "comparison": exactly two sides, 3 points each.
- Every item/side/card needs a relevant emoji "icon".
- PLAIN TEXT ONLY — no markdown, asterisks, or underscores. Keep text short (fits a small card).
- Every point must be factual and grounded in the context above.{avoid_final}"""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ])
    if not result:
        return {"layout": "", "critique": "(AI layout unavailable.)"}

    layout = str(result.get("layout", "") or "").strip().lower()
    out: Dict[str, Any] = {"layout": "", "critique": _strip_md(result.get("critique", ""))}

    if layout in ("icon_grid", "accent_list"):
        items = []
        for it in (result.get("items") or [])[:8]:
            if isinstance(it, dict):
                label = _strip_md(it.get("label") or it.get("lead") or it.get("heading") or "")
                text = _strip_md(it.get("text", ""))
                icon = str(it.get("icon", "") or "").strip()[:4]
                if label or text:
                    items.append({"icon": icon, "label": label, "text": text})
            elif isinstance(it, str) and _strip_md(it):
                items.append({"icon": "", "label": "", "text": _strip_md(it)})
        if len(items) >= 2:
            out.update(layout="icon_grid", items=items)
    elif layout == "cards":
        cards = [c for c in (_sanitize_card(c) for c in (result.get("cards") or [])) if c][:3]
        if len(cards) >= 2:
            out.update(layout="cards", cards=cards)
    elif layout == "steps":
        steps = []
        for s in (result.get("steps") or [])[:5]:
            if isinstance(s, dict):
                title, text = _strip_md(s.get("title", "")), _strip_md(s.get("text", ""))
                if title or text:
                    steps.append({"title": title, "text": text})
        if len(steps) >= 2:
            out.update(layout="steps", steps=steps)
    elif layout == "timeline":
        events = []
        for e in (result.get("events") or [])[:5]:
            if isinstance(e, dict):
                when, title, text = (_strip_md(e.get("when", "")), _strip_md(e.get("title", "")),
                                     _strip_md(e.get("text", "")))
                if when or title or text:
                    events.append({"when": when, "title": title, "text": text})
        if len(events) >= 2:
            out.update(layout="timeline", events=events)
    elif layout == "comparison":
        left, right = _sanitize_card(result.get("left")), _sanitize_card(result.get("right"))
        if left and right:
            out.update(layout="comparison", left=left, right=right)
    elif layout == "accent_list":
        items = []
        for it in (result.get("items") or [])[:7]:
            if isinstance(it, dict):
                lead, text = _strip_md(it.get("lead", "")), _strip_md(it.get("text", ""))
                icon = str(it.get("icon", "") or "").strip()[:4]
                if lead or text:
                    items.append({"lead": lead, "text": text, "icon": icon})
            elif isinstance(it, str) and _strip_md(it):
                items.append({"lead": "", "text": _strip_md(it), "icon": ""})
        if len(items) >= 2:
            out.update(layout="accent_list", items=items)

    # If the chosen layout didn't validate but cards were provided, salvage as cards.
    if not out["layout"]:
        cards = [c for c in (_sanitize_card(c) for c in (result.get("cards") or [])) if c][:3]
        if len(cards) >= 2:
            out.update(layout="cards", cards=cards)
    return out


def llm_build_card_layout(slide_content: Dict[str, Any], rag_chunks: List[Dict[str, Any]],
                          unit_title: str) -> Dict[str, Any]:
    """
    Organize a slide's content into 2-3 themed CARDS for a designed layout (not a flat
    bullet list). Each card has a heading, one emoji icon, and 2-4 points; each point has a
    short bold lead-in label plus a concise explanation. Grounded in the textbook context.

    Returns {"cards": [{"heading": str, "icon": str,
                        "points": [{"lead": str, "text": str}, ...]}, ...],
             "critique": str}.
    On failure or if no groupable structure, returns {"cards": [], "critique": ...} so the
    caller can fall back to a flat bullet list.
    """
    slide_title = slide_content.get("title", "") or ""
    current = _readable_slide_text(slide_content)

    context = _chunks_to_context(rag_chunks) or "(no textbook context available)"

    system = (
        "You are a seminar slide designer for school students. Organize a slide's content into "
        "2-3 themed CARDS that read cleanly side-by-side. Each card groups one sub-topic. Preserve "
        "the original meaning and stay grounded in the textbook context. Respond in strict JSON."
    )
    user = f"""Chapter: {unit_title}
Slide title: {slide_title or '(none)'}
Current slide content (may be prose or a flat list):
{current or '(empty)'}

Textbook context:
{context}

Return JSON with exactly these keys:
{{"cards": [
   {{"heading": "short card title (1-2 words)",
     "icon": "a single relevant emoji",
     "points": [
        {{"lead": "1-2 word bold label", "text": "concise explanation, <= 10 words"}}
     ]}}
 ],
 "critique": "one sentence on how you organized it"}}

Rules:
- Exactly 2 or 3 cards, each a DISTINCT theme/sub-topic drawn from the content above.
- EXACTLY 3 points per card (never more) — the cards must fit side-by-side on one slide.
- "heading": 1-2 words. "lead": 1-2 word bold label. "text": <= 10 words explaining the lead.
- Keep every point short so it never overflows a narrow card. Prefer brevity over detail.
- "icon": exactly ONE emoji relevant to the card's theme.
- PLAIN TEXT ONLY — NO markdown, asterisks (*), underscores, or other formatting.
- Every point must be factual and grounded in the textbook context above.
- If the content genuinely cannot be split into 2+ themes, return {{"cards": []}}."""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ])
    if not result:
        return {"cards": [], "critique": "(AI card layout unavailable.)"}

    cards_raw = result.get("cards")
    if not isinstance(cards_raw, list):
        cards_raw = []

    cards: List[Dict[str, Any]] = []
    for c in cards_raw[:3]:
        if not isinstance(c, dict):
            continue
        heading = _strip_md(c.get("heading", ""))
        icon = str(c.get("icon", "") or "").strip()[:4]
        points: List[Dict[str, str]] = []
        for p in (c.get("points") or [])[:3]:
            if isinstance(p, dict):
                lead, text = _strip_md(p.get("lead", "")), _strip_md(p.get("text", ""))
            elif isinstance(p, str):
                lead, text = "", _strip_md(p)
            else:
                continue
            if text or lead:
                points.append({"lead": lead, "text": text})
        if heading or points:
            cards.append({"heading": heading, "icon": icon, "points": points})

    # A single card is not worth the card treatment — let the caller fall back to bullets.
    if len(cards) < 2:
        cards = []

    return {"cards": cards, "critique": _strip_md(result.get("critique", ""))}


def llm_check_spelling(slide_content: Dict[str, Any],
                       cached_hash: Optional[str] = None,
                       current_hash: Optional[str] = None) -> Dict[str, Any]:
    """
    Context-aware spelling check of a slide's text (title + bullets/body).

    Uses the LLM so correct scientific/domain terms and proper nouns are NOT flagged.
    Returns {"corrections": [...], "cached": bool}. Each correction has "wrong" and "right".

    Pass cached_hash and current_hash to enable deduplication: if they match, the LLM is
    skipped and {"corrections": [], "cached": True} is returned immediately.

    Degrades to no corrections on any failure.
    """
    # ── spelling cache: skip if text unchanged ────────────────────────────────
    if cached_hash and current_hash and cached_hash == current_hash:
        return {"corrections": [], "cached": True}

    title = slide_content.get("title", "") or ""
    bullets = slide_content.get("bullets") or []
    body = slide_content.get("body", "") or ""
    text = "\n".join([title, *bullets]) if bullets else f"{title}\n{body}"
    if not text.strip():
        return {"corrections": [], "cached": False}

    system = (
        "You are a spelling checker for school seminar slides. Find genuine spelling errors and "
        "typos ONLY. Do NOT flag correct scientific/domain terms, proper nouns, abbreviations, or "
        "grammar. Respond in strict JSON."
    )
    user = f"""Slide text:
{text}

Return JSON: {{"corrections": [{{"wrong": "<misspelled word exactly as written>", "right": "<correct spelling>"}}]}}

Rules:
- Only real misspellings/typos. If there are none, return {{"corrections": []}}.
- "wrong" MUST be the exact substring as it appears above (same spelling and case).
- Do NOT rephrase, translate, or change grammar — spelling only."""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ])
    if not result:
        return {"corrections": [], "cached": False}

    corr = result.get("corrections") or []
    if not isinstance(corr, list):
        return {"corrections": [], "cached": False}
    out = []
    for c in corr:
        if not isinstance(c, dict):
            continue
        w = str(c.get("wrong", "")).strip()
        r = str(c.get("right", "")).strip()
        if w and r and w != r and w in text:
            out.append({"wrong": w, "right": r})
    return {"corrections": out, "cached": False}


def llm_generate_speaker_notes(slide_content: Dict[str, Any],
                                rag_chunks: List[Dict[str, Any]],
                                unit_title: str) -> str:
    """
    Generate 3–4 natural sentences a student can speak aloud while presenting the slide.

    Returns a plain text string (empty string on failure). These are applied to the Google
    Slides speaker notes field via a "set_speaker_notes" op.
    """
    slide_title = slide_content.get("title", "") or ""
    bullets = slide_content.get("bullets") or []
    body = slide_content.get("body", "") or ""
    slide_text = "\n".join(f"- {b}" for b in bullets) if bullets else body

    context = _chunks_to_context(rag_chunks, limit=3, max_chars=1500) or ""

    system = (
        "You are a presentation coach for school students. Write 3-4 short, simple sentences "
        "a student can say aloud while showing this slide. Match the vocabulary to a school "
        "student. Be factual and natural — not robotic. Do NOT use bullet points or lists. "
        "Respond in strict JSON."
    )
    user = f"""Chapter: {unit_title}
Slide title: {slide_title or '(none)'}
Slide content:
{slide_text or '(empty)'}

{f'Textbook context:{chr(10)}{context}' if context else ''}

Return JSON: {{"speaker_notes": "3-4 sentences the student says while presenting this slide."}}

Rules:
- Write as if speaking naturally to an audience.
- 3-4 sentences, each explaining or elaborating on a slide point.
- School-appropriate vocabulary; concise and clear."""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], temperature=0.35)
    if not result:
        return ""
    notes = result.get("speaker_notes", "") or ""
    return str(notes).strip()


def llm_design_guidance(slide_title: str, slide_text: str, unit_title: str,
                        theme_spec: Dict[str, Any], student_query: str = "") -> Dict[str, Any]:
    """Detailed, teaching design guidance for one slide.

    Unlike llm_review_content (terse verbal bullets), this coaches the student step by step:
    how to START, STRUCTURE, and END the slide, concrete layout OPTIONS to choose from, and
    exactly how to match the deck's existing theme (using the real theme values).

    Returns {"guidance": str, "options": [str], "theme_guidance": str}.
    """
    ts = theme_spec or {}
    theme_lines = (
        f"- font: {ts.get('font_family', 'default')}\n"
        f"- title: {ts.get('title_color_hex', '?')} at {ts.get('title_size_pt', '?')}pt\n"
        f"- body: {ts.get('body_color_hex', '?')} at {ts.get('body_size_pt', '?')}pt\n"
        f"- accent: {ts.get('accent_hex', '?')}\n"
        f"- background: {ts.get('background_hex', '?')}\n"
        f"- bullets: {ts.get('bullet_preset', '?')}"
    )
    system = (
        "You are a friendly slide DESIGN COACH for a school student. Teach step by step how to "
        "design THIS slide well — where to start, how to structure the middle, and how to end. "
        "Give concrete layout OPTIONS they can choose from, and explain exactly how to make the "
        "slide match the deck's existing theme using the real values given. Be specific to the "
        "slide's content, encouraging, and clear. Respond in strict JSON."
    )
    user = f"""Chapter: {unit_title or '(unknown)'}
Slide title: {slide_title or '(none)'}
Slide content:
{(slide_text or '(empty)')[:800]}

Deck theme already used on the other slides:
{theme_lines}

Student asked: "{student_query or 'guide me on designing this slide'}"

Return JSON with exactly these keys:
{{"guidance": "a detailed step-by-step guide using numbered steps. Cover (1) how to START — the title and opening point, (2) how to STRUCTURE the middle — how to group these specific points, (3) how to END. Refer to the ACTUAL content above. Teach like a patient tutor.",
  "options": ["2-4 layout choices the student can pick, each one line: a name + when to use it (e.g. 'Two-column cards — good for comparing sexual vs asexual reproduction')"],
  "theme_guidance": "concrete steps to make this slide match the deck theme above, using the EXACT font, colors, sizes and bullet style. End by noting the co-pilot can apply the whole theme automatically if they say 'edit the slide'."}}

Rules:
- Be specific to THIS slide's content — never generic filler.
- In theme_guidance use the exact font/color/size values listed above.
- Encouraging and school-appropriate; richer and more detailed than a quick tip."""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], temperature=0.4)
    if not result:
        return {"guidance": "(Design guidance unavailable right now.)",
                "options": [], "theme_guidance": ""}

    opts = result.get("options") or []
    if not isinstance(opts, list):
        opts = []
    return {
        "guidance": str(result.get("guidance", "") or "").strip(),
        "options": [str(o).strip() for o in opts if str(o).strip()],
        "theme_guidance": str(result.get("theme_guidance", "") or "").strip(),
    }


def llm_image_query(student_msg: str, slide_title: str, slide_text: str,
                    unit_title: str) -> str:
    """Build a short image-search query grounded in the SLIDE'S content.

    The student's message is often vague ("i need an image for this slide"), so we anchor
    the query in the slide title + text + chapter, and drop presentation/command words.
    Returns a 2-5 word subject (e.g. "plant reproduction diagram") or "" on failure.
    """
    system = (
        "You convert a slide's content into a short image-search query for a relevant photo "
        "or diagram. Output ONLY the visual subject (2-5 words). Never include words like "
        "slide, image, picture, presentation, deck, or design. Respond in strict JSON."
    )
    user = f"""Chapter: {unit_title or '(unknown)'}
Slide title: {slide_title or '(none)'}
Slide content:
{(slide_text or '(empty)')[:600]}
Student request: "{student_msg or '(none)'}"

Return JSON: {{"query": "2-5 word image subject grounded in the slide content"}}

Rules:
- Describe the VISUAL that best fits THIS slide's topic (e.g. "vegetative propagation",
  "plant reproduction diagram", "human digestive system").
- If the student named a specific subject, prefer it; otherwise use the slide's main topic.
- No words like slide, image, picture, presentation, deck, design."""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], temperature=0.2)
    if not result:
        return ""
    return _strip_md(result.get("query", ""))


def llm_suggest_image(slide_content: Dict[str, Any], unit_title: str) -> Optional[str]:
    """
    Suggest an appropriate image or diagram for a text-heavy slide.

    Returns a plain-English description string (e.g. "Diagram of the water cycle with
    evaporation, condensation, and precipitation labels") or None if no image is needed.
    This is verbal-only — no image is inserted into the deck.
    """
    slide_title = slide_content.get("title", "") or ""
    bullets = slide_content.get("bullets") or []

    system = (
        "You are a visual design advisor for school seminar presentations. Given a slide's "
        "title and content, decide if an image or diagram would help the audience understand "
        "the topic better. If yes, describe the ideal image in one sentence. If the slide "
        "is already visual or doesn't need an image, return null. Respond in strict JSON."
    )
    user = f"""Chapter: {unit_title}
Slide title: {slide_title or '(none)'}
Slide bullets:
{chr(10).join(f'- {b}' for b in bullets) if bullets else '(empty)'}

Return JSON: {{"image_suggestion": "one-sentence description of the ideal image" | null}}

Rules:
- Only suggest an image when it would genuinely help understanding (e.g. process diagrams,
  maps, charts, scientific illustrations).
- Be specific: mention what the image should show, label, or depict.
- If no image is needed, return {{"image_suggestion": null}}."""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], temperature=0.3)
    if not result:
        return None
    suggestion = result.get("image_suggestion")
    if suggestion and isinstance(suggestion, str) and suggestion.strip():
        return suggestion.strip()
    return None
