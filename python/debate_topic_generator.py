"""
Debate Topic Generator for GradeUp

Generates interactive, high-value debate topics from structured textbook data.

After enrichment completes in the /upload-agentic pipeline:
  1. Reads from a TEMPORARY copy of structured.json (never the main file)
  2. Iterates over units → filters to main content sections only
  3. Generates 3 debate topics per valid section via LLM
  4. Saves debate_topics.json alongside enriched.json
  5. Temp file is deleted after generation

Skipped section types: introduction, learning_objectives, points_to_remember,
exercises, unit_exercise, multiple_choice, ict_corner, activity, note
"""

import os
import json
import re
import shutil
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests
from langfuse_utils import traced_post
from logger import get_logger
from section_types import section_content_kind

logger = get_logger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
# Runs on the same OpenRouter/Llama endpoint as extraction. Previously OpenAI,
# where a dead key produced 13 consecutive "No topics generated" warnings with
# no indication that the API was the problem.
try:
    from config import (
        OPENROUTER_BASE_URL, OPENROUTER_APP_NAME, OPENROUTER_APP_URL, EXTRACTION_MODEL,
        openrouter_routing,
    )
    DEBATE_TOPIC_URL = OPENROUTER_BASE_URL
    _DEBATE_EXTRA_HEADERS = {
        "HTTP-Referer": OPENROUTER_APP_URL,
        "X-Title": OPENROUTER_APP_NAME,
    }
    DEBATE_TOPIC_MODEL = os.getenv("DEBATE_TOPIC_MODEL", EXTRACTION_MODEL)
except Exception:
    DEBATE_TOPIC_URL = "https://openrouter.ai/api/v1/chat/completions"
    _DEBATE_EXTRA_HEADERS = {}
    DEBATE_TOPIC_MODEL = os.getenv("DEBATE_TOPIC_MODEL", "meta-llama/llama-4-scout")

    def openrouter_routing(model=None):
        return {}

DEBATE_TOPIC_TIMEOUT = 120
RATE_LIMIT_DELAY = 0.5

# Section types to SKIP (not main content sections)
_SKIP_SECTION_TYPES = {
    "introduction",
    "learning_objectives",
    "learning_outcomes",
    "points_to_remember",
    "exercise",
    "exercises",
    "unit_exercise",
    "multiple_choice",
    "multiple_choice_questions",
    "ict_corner",
    "activity",
    "note",
    "glossary",
    "summary",
    "evaluation",
}


def _call_llm(messages: List[Dict], temperature: float = 0.7) -> str:
    """Call the topic-generation LLM. Returns '' on failure, having said why."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        logger.error("[DebateTopicGen] OPENROUTER_API_KEY is not set — no topics can be generated")
        return ""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        **_DEBATE_EXTRA_HEADERS,
    }
    payload = {
        "model": DEBATE_TOPIC_MODEL,
        "messages": messages,
        "max_tokens": 4096,
        "temperature": temperature,
        **openrouter_routing(DEBATE_TOPIC_MODEL),
    }

    try:
        resp = traced_post("generate-debate-topics",
            DEBATE_TOPIC_URL,
            headers=headers,
            json=payload,
            timeout=DEBATE_TOPIC_TIMEOUT,
        )
        if resp.ok:
            return resp.json()["choices"][0]["message"]["content"].strip()

        # An empty return here surfaces downstream as "No topics generated",
        # which says nothing about the cause — so name it here.
        logger.error(
            f"[DebateTopicGen] {DEBATE_TOPIC_MODEL} returned {resp.status_code}: {resp.text[:300]}"
        )
    except Exception as e:
        logger.error(f"[DebateTopicGen] LLM error: {e}")
    return ""


def _parse_json_response(raw: str) -> Optional[List[Dict]]:
    """Parse LLM response as JSON array."""
    try:
        # Strip markdown code fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        # Try to find JSON array
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end != -1:
            return json.loads(raw[start:end + 1])
        # Try single object → wrap in array
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1:
            obj = json.loads(raw[start:end + 1])
            if "topics" in obj and isinstance(obj["topics"], list):
                return obj["topics"]
            return [obj]
    except Exception:
        pass
    return None


def _iter_descendants(section: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    ALL nested children of a section (sub-sections, sub-sub-sections, examples,
    activities, theorems...) in depth-first textbook order. Debate topics are
    generated per MAIN (top-level) section only, but the section's context text
    must include everything nested inside it.
    """
    out: List[Dict[str, Any]] = []
    for sub in section.get("sub_sections") or []:
        if not isinstance(sub, dict):
            continue
        out.append(sub)
        out.extend(_iter_descendants(sub))
    return out


def _section_labels(sections: List[Dict[str, Any]]) -> Dict[int, str]:
    """A display title for every section, by position.

    An untitled section is the paragraph that continues after a figure or a
    definition box — the book prints no heading for it, so the JSON carries
    none. Generating its topics under "Untitled" threw away the one thing a
    reader needs to place them; a paragraph after RESOURCE PLANNING is about
    resource planning. It is labelled as a continuation of the nearest titled
    section before it, and only falls back to a positional label at the very
    top of a unit. The JSON itself is not changed: the label is for attribution,
    and a title the book never printed does not belong in structured.json.
    """
    labels: Dict[int, str] = {}
    last_titled = ""
    for idx, sec in enumerate(sections):
        title = str(sec.get("title") or sec.get("section_title") or "").strip()
        if title:
            labels[idx] = title
            # Only a heading that opens running text can be continued. A
            # figure caption, an activity prompt or an exercise block sits
            # BETWEEN paragraphs of the section above it; the paragraph after
            # "Fig. 1.1" is still about resources, not about the figure.
            if not _interrupts_narrative(sec, title):
                last_titled = title
        elif last_titled:
            labels[idx] = f"{last_titled} (continued)"
        else:
            labels[idx] = f"Opening passage {idx + 1}"
    return labels


# Boxed inserts and furniture that sit INSIDE a section's flow. A definition
# box, an example, a figure: the paragraph after them belongs to the heading
# above them, not to the box.
_INTERRUPTING_TYPES = frozenset({
    "illustration", "image", "figure", "table", "other", "activity",
    "exercise", "unit_exercise", "evaluation", "glossary", "note",
    "do_you_know", "ict_corner", "map_work", "project",
    "definition", "example", "theorem",
})
_CAPTION_RE = re.compile(r"^\s*(?:fig(?:ure)?|table|map|chart)\.?\s*\d", re.IGNORECASE)


def _interrupts_narrative(sec: Dict[str, Any], title: str) -> bool:
    if str(sec.get("type") or "").lower() in _INTERRUPTING_TYPES:
        return True
    if _CAPTION_RE.match(title):
        return True
    # A heading with nothing under it (a chart title the extractor kept as a
    # section) has no narrative for the next paragraph to continue.
    if not (sec.get("content") or "").strip() and not (sec.get("sub_items") or []):
        return True
    # A sentence-length title ending in a question or instruction is a prompt,
    # not a heading ("Find out reasons for the low proportion of ...").
    return len(title.split()) > 8 and title.rstrip().endswith((".", "?", "!"))


def _is_main_section(section: Dict[str, Any]) -> bool:
    """Check if a section is a main content section (not intro/exercise/etc)."""
    # Debate topics are generated for real content sections:
    #   - type "section"       → science, maths, social science, etc.
    #   - type "prose"         → English stories / essays / passages
    #   - type "poem"          → English poetry (stanzas in sub_items)
    #   - type "supplementary" → English supplementary readings
    _DEBATABLE_TYPES = {"section", "prose", "poem", "supplementary"}

    # English readings are stored as type="section" with the reading kind in
    # metadata.content_kind — resolve to the kind so either shape is accepted.
    sec_type = (section_content_kind(section) or "section")
    if sec_type not in _DEBATABLE_TYPES:
        return False

    # Also check by title keywords
    title = (section.get("title") or section.get("section_title") or "").lower().strip()
    skip_title_keywords = [
        "introduction", "learning objective", "learning outcome",
        "points to remember", "exercise", "evaluation", "ict corner",
        "glossary", "summary", "multiple choice",
    ]
    for kw in skip_title_keywords:
        if kw in title:
            return False

    # Must have some content
    content_parts = []
    main_content = section.get("content") or ""
    if isinstance(main_content, list):
        main_content = "\n".join(str(c) for c in main_content)
    content_parts.append(main_content)

    for sub in section.get("sub_items", []) or []:
        sub_content = sub.get("content") or ""
        if isinstance(sub_content, list):
            sub_content = "\n".join(str(c) for c in sub_content)
        content_parts.append(sub_content)

    for sub in section.get("subsections", []) or []:
        sub_content = sub.get("content") or ""
        if isinstance(sub_content, list):
            sub_content = "\n".join(str(c) for c in sub_content)
        content_parts.append(sub_content)

    # All nested descendants (sub-sections, sub-sub-sections, examples, ...)
    for sub in _iter_descendants(section):
        sub_content = sub.get("content") or ""
        if isinstance(sub_content, list):
            sub_content = "\n".join(str(c) for c in sub_content)
        content_parts.append(sub_content)

    full_content = "\n".join(content_parts)
    if len(full_content.strip()) < 50:
        return False

    return True


def _build_section_text(section: Dict[str, Any]) -> str:
    """Extract readable text from a section."""
    parts = []
    title = section.get("title") or section.get("section_title") or ""
    if title:
        parts.append(f"Topic: {title}")

    content = section.get("content") or ""
    if isinstance(content, list):
        content = "\n".join(str(c) for c in content)
    if content.strip():
        parts.append(content.strip())

    # Sub-items / subsections
    for sub in section.get("sub_items", []) or []:
        sub_content = sub.get("content") or ""
        if sub_content.strip():
            parts.append(sub_content.strip())

    for sub in section.get("subsections", []) or []:
        sub_title = sub.get("title") or sub.get("section_title") or ""
        sub_content = sub.get("content") or ""
        if sub_title:
            parts.append(f"\n{sub_title}")
        if sub_content.strip():
            parts.append(sub_content.strip())

    # All nested descendants in reading order (sub-sections, sub-sub-sections,
    # examples, activities...) — the main section's debate context must cover
    # everything printed inside it.
    for sub in _iter_descendants(section):
        sub_title = sub.get("title") or sub.get("section_title") or ""
        sub_content = sub.get("content") or ""
        if isinstance(sub_content, list):
            sub_content = "\n".join(str(c) for c in sub_content)
        if sub_title:
            parts.append(f"\n{sub_title}")
        if sub_content.strip():
            parts.append(sub_content.strip())
        for item in sub.get("sub_items", []) or []:
            item_content = item.get("content") or ""
            if isinstance(item_content, list):
                item_content = "\n".join(str(c) for c in item_content)
            if item_content.strip():
                parts.append(item_content.strip())

    return "\n".join(parts)


def _generate_topics_for_section(
    section_text: str,
    section_title: str,
    unit_title: str,
    subject: str,
    section_type: str = "section",
) -> List[Dict[str, Any]]:
    """Generate 2 debate topics for a single section using LLM."""

    is_english = subject.lower().strip() in ("english", "cbse_english")

    if is_english:
        # ── English-specific prompt (prose, poem, supplementary) ──────────
        type_label = section_type.lower().strip() if section_type else "prose"
        if type_label == "poem":
            content_hint = "This is a POEM. Focus on the themes, imagery, emotions, and moral message of the poem."
        elif type_label == "supplementary":
            content_hint = "This is a SUPPLEMENTARY READING (additional story/passage). Focus on the plot, characters, and moral lessons."
        else:
            content_hint = "This is a PROSE section (story/essay/passage). Focus on the plot, characters, themes, and moral dilemmas."

        prompt = f"""You are an expert English literature teacher creating debate topics for school students (ages 12-16).

Generate exactly 2 SIMPLE, ENGAGING debate topics based on the following English textbook section.

## SECTION INFORMATION
- Subject: {subject}
- Unit: {unit_title}
- Section: {section_title}
- Content Type: {type_label}
- {content_hint}

## SECTION CONTENT
{section_text[:6000]}

## CRITICAL RULES — READ CAREFULLY
1. **Keep it SIMPLE** — Use everyday language that students can immediately understand. NO literary jargon or overly complex phrasing.
2. **Focus on THEMES & MORAL DILEMMAS** — Frame debates around the characters' choices, the story's message, or real-life situations inspired by the text. For example, instead of "Analyze the protagonist's internal conflict", ask "Was the main character right to lie to protect their friend?"
3. **NEVER ask about teaching methods or literary analysis techniques** — Do NOT generate topics like "Should prose be taught before poetry?" or "Is symbolism more important than plot?" These are NOT student debates.
4. **Make it RELATABLE** — Connect the topic to students' own lives, friendships, family, school, or daily decisions.
5. **General & Neutral** — The topic must be open-ended so students can argue EITHER side. Do NOT lean towards one answer.
6. **Connected to the text** — The debate must relate to the themes, characters, or moral lessons from this section.
7. **Genuinely Debatable** — Both sides must have valid arguments (not just one obviously correct moral answer).
8. **Keep it light** — These are meant to spark fun, engaging classroom discussions, not exam questions.

## EXAMPLES OF GOOD vs BAD TOPICS (for English)
❌ BAD: "Analyze the use of metaphor in the poem and its effectiveness in conveying the theme."
✅ GOOD: "Is it better to follow your dreams even if it means disappointing your family?"

❌ BAD: "Discuss the narrative technique used by the author to build suspense."
✅ GOOD: "If you found out your best friend did something wrong, would you tell the truth or keep their secret?"

❌ BAD: "Compare and contrast the themes of courage and cowardice in the story."
✅ GOOD: "Is it braver to speak up against something wrong, or to quietly help someone without anyone knowing?"

## OUTPUT FORMAT
Return ONLY a valid JSON array with exactly 2 objects:
```json
[
  {{
    "topic_title": "A simple, clear debate question using everyday language",
    "topic_description": "2-3 sentences explaining the debate in simple words and what students should think about",
    "key_concepts": ["theme1", "theme2", "theme3"]
  }}
]
```

Return ONLY the JSON array. No other text."""

    else:
        # ── Default prompt (science, maths, social science, etc.) ─────────
        prompt = f"""You are an expert educational content designer creating debate topics for school students (ages 12-16).

Generate exactly 2 SIMPLE, GENERAL debate topics based on the following textbook section.

## SECTION INFORMATION
- Subject: {subject}
- Unit: {unit_title}
- Section: {section_title}

## SECTION CONTENT
{section_text[:6000]}

## CRITICAL RULES — READ CAREFULLY
1. **Keep it SIMPLE** — Use everyday language that students can immediately understand. NO jargon-heavy or overly technical phrasing.
2. **Use REAL-LIFE examples** — Frame topics around everyday situations students experience (sports, travel, vehicles, playground, cooking, nature, daily life). For example, instead of "Should displacement be prioritized over distance in physics education?", ask something like "If you walk to school by a shortcut vs. the main road, which matters more — how far you actually walked or how close you got to school?"
3. **NEVER ask about teaching methods or education** — Do NOT generate topics like "Should X be taught before Y?" or "Is it more important to study X or Y?" or "Should teaching focus on theory or experiments?". These are NOT student debates — they are teacher discussions.
4. **Make it RELATABLE** — Students should be able to connect the topic to their own life, things they see, or things they do.
5. **General & Neutral** — The topic must be open-ended so students can argue EITHER side. Do NOT lean towards one answer.
6. **Connected to the section concepts** — The debate must involve the key science concepts from this section, but presented in a way that feels natural and easy to discuss.
7. **Genuinely Debatable** — Both sides must have valid, common-sense arguments (not just one correct scientific answer).
8. **Keep it light** — These are meant to spark fun, engaging classroom discussions, not test-level questions.

## EXAMPLES OF GOOD vs BAD TOPICS
❌ BAD: "Should the teaching of acceleration focus more on its mathematical representation or its physical implications?"
✅ GOOD: "When a car suddenly brakes, is it the speed or the sudden change in speed that makes it dangerous?"

❌ BAD: "Should average speed be prioritized over instantaneous speed in scientific studies?"
✅ GOOD: "If two friends race to school — one runs fast then walks, the other jogs steadily — who is the better runner?"

❌ BAD: "Can the centre of gravity be considered the sole determinant of an object's balance?"
✅ GOOD: "Why are buses more likely to tip over on sharp turns than cars — is it just about height or weight too?"

## OUTPUT FORMAT
Return ONLY a valid JSON array with exactly 3 objects:
```json
[
  {{
    "topic_title": "A simple, clear debate question using everyday language",
    "topic_description": "2-3 sentences explaining the debate in simple words and what students should think about",
    "key_concepts": ["concept1", "concept2", "concept3"]
  }}
]
```

Return ONLY the JSON array. No other text."""

    raw = _call_llm([
        {"role": "system", "content": "You are a precise educational content generator. Always respond with valid JSON only."},
        {"role": "user", "content": prompt},
    ], temperature=0.7)

    if not raw:
        return []

    topics = _parse_json_response(raw)
    if not topics:
        logger.warning(f"Failed to parse debate topics for: {section_title}")
        return []

    # Enrich each topic with metadata
    for topic in topics:
        topic["source_section"] = section_title
        topic["source_unit"] = unit_title
        topic["subject"] = subject

    return topics


def generate_debate_topics(
    structured_data: Dict[str, Any],
    subject: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate debate topics from structured textbook data.

    For each unit, filters to main content sections (skipping intro, exercises, etc.)
    and generates 3 debate topics per valid section.

    Args:
        structured_data: The parsed structured.json data
        subject: Subject name (auto-detected from data if not provided)

    Returns:
        Dict with generated debate topics organized by unit
    """
    content_key = "chapters" if "chapters" in structured_data else "units"
    units = structured_data.get(content_key, [])

    if not units:
        logger.warning("[DebateTopicGen] No units found in structured data")
        return {"success": False, "error": "No units found", "topics": []}

    # Auto-detect subject from first unit if not provided
    if not subject:
        subject = units[0].get("subject") or "unknown"

    logger.info(f"{'='*60}")
    logger.info(f"Generating Debate Topics")
    logger.info(f"Subject   : {subject}")
    logger.info(f"Units     : {len(units)}")
    logger.info(f"{'='*60}")

    all_topics = []
    total_sections_processed = 0

    for idx, unit in enumerate(units):
        unit_number = unit.get("unit_number") or unit.get("chapter_number", idx + 1)
        unit_title = unit.get("title", f"Unit {unit_number}")

        logger.info(f"Unit {unit_number}: {unit_title}")

        # Topics are generated per MAIN (top-level) section only; nested
        # sub-section content is folded into each main section's context text.
        sections = unit.get("sections", [])
        labels = _section_labels(sections)
        main_sections = [(i, s) for i, s in enumerate(sections) if _is_main_section(s)]

        if not main_sections:
            logger.warning(f"No main content sections found — skipping")
            continue

        logger.info(f"Found {len(main_sections)} main section(s) (filtered from {len(sections)} total)")

        unit_topics = {
            "unit_number": unit_number,
            "unit_title": unit_title,
            "sections": [],
        }

        for sec_idx, sec in main_sections:
            sec_title = labels[sec_idx]
            sec_text = _build_section_text(sec)

            if not sec_text.strip():
                continue

            logger.info(f"→ Generating debate topics for: {sec_title}...")
            topics = _generate_topics_for_section(
                section_text=sec_text,
                section_title=sec_title,
                unit_title=unit_title,
                subject=subject,
                section_type=section_content_kind(sec) or "section",
            )

            if topics:
                unit_topics["sections"].append({
                    "section_id": sec.get("id") or None,
                    "section_title": sec_title,
                    "debate_topics": topics,
                    "topics_count": len(topics),
                })
                total_sections_processed += 1
                logger.info(f"Generated {len(topics)} topic(s)")
            else:
                logger.warning(f"No topics generated")

            time.sleep(RATE_LIMIT_DELAY)

        if unit_topics["sections"]:
            all_topics.append(unit_topics)

    total_topics = sum(
        len(s["debate_topics"])
        for u in all_topics
        for s in u["sections"]
    )

    logger.info(f"{'='*60}")
    logger.info(f"Debate Topic Generation Complete")
    logger.info(f"Sections processed: {total_sections_processed}")
    logger.info(f"Total topics generated: {total_topics}")
    logger.info(f"{'='*60}")

    return {
        "success": True,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "subject": subject,
        "total_topics": total_topics,
        "total_sections": total_sections_processed,
        "units": all_topics,
    }


def generate_and_save_debate_topics(
    structured_path: Path,
    output_dir: Optional[Path] = None,
    subject: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main entry point: Generate debate topics from structured.json using a temp copy.

    1. Copies structured.json to a temp file
    2. Reads from the temp file
    3. Generates debate topics
    4. Saves debate_topics.json alongside enriched.json
    5. Deletes the temp file

    Args:
        structured_path: Path to structured.json
        output_dir: Output directory (defaults to structured_path's parent)
        subject: Subject name

    Returns:
        Dict with generation results
    """
    if not structured_path.exists():
        return {"success": False, "error": f"File not found: {structured_path}"}

    if output_dir is None:
        output_dir = structured_path.parent

    # Create temp copy
    temp_path = output_dir / f"temp_structured_{int(time.time())}.json"

    try:
        # Step 1: Copy to temp
        shutil.copy2(structured_path, temp_path)
        logger.info(f"Created temp file: {temp_path.name}")

        # Step 2: Read from temp
        structured_data = json.loads(temp_path.read_text(encoding="utf-8"))

        # Step 3: Generate topics
        result = generate_debate_topics(structured_data, subject=subject)

        # Step 4: Save debate_topics.json
        if result.get("success"):
            debate_path = output_dir / "debate_topics.json"
            debate_path.write_text(
                json.dumps(result, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            logger.info(f"Saved: {debate_path}")
            result["output_path"] = str(debate_path)

        return result

    except Exception as e:
        logger.exception(f"[DebateTopicGen] Error: {e}")
        return {"success": False, "error": str(e)}

    finally:
        # Step 5: Always delete the temp file
        if temp_path.exists():
            try:
                temp_path.unlink()
                logger.info(f"Deleted temp file: {temp_path.name}")
            except OSError as e:
                logger.warning(f"Failed to delete temp file: {e}")


def generate_debate_topics_for_unit(
    unit: Dict[str, Any],
    subject: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate debate topics for a single unit dict in-memory (no file I/O).

    Used by the LangGraph fan-out debate node so each unit can run concurrently.

    Args:
        unit:    A single unit/chapter dict (from structured.json or enriched.json)
        subject: Subject name

    Returns:
        Dict with unit_number, unit_title, sections[{section_title, debate_topics[]}]
    """
    unit_number = unit.get("unit_number") or unit.get("chapter_number", 1)
    unit_title  = unit.get("title", f"Unit {unit_number}")
    resolved_subject = subject or unit.get("subject", "unknown")

    logger.info(f"Unit {unit_number}: {unit_title}")

    # Topics are generated per MAIN (top-level) section only; nested
    # sub-section content is folded into each main section's context text.
    sections      = unit.get("sections", [])
    labels        = _section_labels(sections)
    main_sections = [(i, s) for i, s in enumerate(sections) if _is_main_section(s)]

    if not main_sections:
        logger.warning(f"No main content sections — skipping")
        return {
            "unit_number": unit_number,
            "unit_title":  unit_title,
            "sections":    [],
        }

    logger.info(f"Found {len(main_sections)} main section(s) "
          f"(filtered from {len(sections)} total)")

    unit_result: Dict[str, Any] = {
        "unit_number": unit_number,
        "unit_title":  unit_title,
        "sections":    [],
    }

    for sec_idx, sec in main_sections:
        sec_title = labels[sec_idx]
        sec_text  = _build_section_text(sec)

        if not sec_text.strip():
            continue

        logger.info(f"→ Generating debate topics for: {sec_title}...")
        topics = _generate_topics_for_section(
            section_text=sec_text,
            section_title=sec_title,
            unit_title=unit_title,
            subject=resolved_subject,
            section_type=section_content_kind(sec) or "section",
        )

        if topics:
            unit_result["sections"].append({
                "section_id":    sec.get("id") or None,
                "section_title": sec_title,
                "debate_topics": topics,
                "topics_count":  len(topics),
            })
            logger.info(f"{len(topics)} topic(s) generated")
        else:
            logger.warning(f"No topics generated")

        time.sleep(RATE_LIMIT_DELAY)

    return unit_result

