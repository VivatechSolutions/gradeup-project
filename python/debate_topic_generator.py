"""
Debate Topic Generator for GradeUp

Generates interactive, high-value debate topics from structured textbook data.

After enrichment completes in the /upload-subject pipeline:
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
import shutil
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests

# ── Config ────────────────────────────────────────────────────────────────────
DEBATE_TOPIC_MODEL = "gpt-4o-mini"
DEBATE_TOPIC_FALLBACK_MODEL = "gpt-4o"
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
    """Call OpenAI LLM."""
    api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return ""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEBATE_TOPIC_MODEL,
        "messages": messages,
        "max_completion_tokens": 4096,
        "temperature": temperature,
    }

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=DEBATE_TOPIC_TIMEOUT,
        )
        if not resp.ok:
            payload["model"] = DEBATE_TOPIC_FALLBACK_MODEL
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=DEBATE_TOPIC_TIMEOUT,
            )
        if resp.ok:
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"  ❌ [DebateTopicGen] LLM error: {e}")
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


def _is_main_section(section: Dict[str, Any]) -> bool:
    """Check if a section is a main content section (not intro/exercise/etc)."""
    sec_type = (section.get("type") or "section").lower().strip()
    if sec_type in _SKIP_SECTION_TYPES:
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
    content = section.get("content") or ""
    if isinstance(content, list):
        content = "\n".join(str(c) for c in content)
    if len(content.strip()) < 50:
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

    return "\n".join(parts)


def _generate_topics_for_section(
    section_text: str,
    section_title: str,
    unit_title: str,
    subject: str,
) -> List[Dict[str, Any]]:
    """Generate 3 debate topics for a single section using LLM."""

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
        print(f"    ⚠️  Failed to parse debate topics for: {section_title}")
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
        print("  ⚠️ [DebateTopicGen] No units found in structured data")
        return {"success": False, "error": "No units found", "topics": []}

    # Auto-detect subject from first unit if not provided
    if not subject:
        subject = units[0].get("subject") or "unknown"

    print(f"\n{'='*60}")
    print(f"🎯 Generating Debate Topics")
    print(f"Subject   : {subject}")
    print(f"Units     : {len(units)}")
    print(f"{'='*60}")

    all_topics = []
    total_sections_processed = 0

    for idx, unit in enumerate(units):
        unit_number = unit.get("unit_number") or unit.get("chapter_number", idx + 1)
        unit_title = unit.get("title", f"Unit {unit_number}")

        print(f"\n  📚 Unit {unit_number}: {unit_title}")

        sections = unit.get("sections", [])
        main_sections = [s for s in sections if _is_main_section(s)]

        if not main_sections:
            print(f"    ⚠️  No main content sections found — skipping")
            continue

        print(f"    Found {len(main_sections)} main section(s) (filtered from {len(sections)} total)")

        unit_topics = {
            "unit_number": unit_number,
            "unit_title": unit_title,
            "sections": [],
        }

        for sec in main_sections:
            sec_title = sec.get("title") or sec.get("section_title") or "Untitled"
            sec_text = _build_section_text(sec)

            if not sec_text.strip():
                continue

            print(f"    → Generating 3 debate topics for: {sec_title}...")
            topics = _generate_topics_for_section(
                section_text=sec_text,
                section_title=sec_title,
                unit_title=unit_title,
                subject=subject,
            )

            if topics:
                unit_topics["sections"].append({
                    "section_title": sec_title,
                    "debate_topics": topics,
                    "topics_count": len(topics),
                })
                total_sections_processed += 1
                print(f"      ✅ Generated {len(topics)} topic(s)")
            else:
                print(f"      ⚠️  No topics generated")

            time.sleep(RATE_LIMIT_DELAY)

        if unit_topics["sections"]:
            all_topics.append(unit_topics)

    total_topics = sum(
        len(s["debate_topics"])
        for u in all_topics
        for s in u["sections"]
    )

    print(f"\n{'='*60}")
    print(f"✅ Debate Topic Generation Complete")
    print(f"   Sections processed: {total_sections_processed}")
    print(f"   Total topics generated: {total_topics}")
    print(f"{'='*60}")

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
        print(f"  📋 Created temp file: {temp_path.name}")

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
            print(f"  💾 Saved: {debate_path}")
            result["output_path"] = str(debate_path)

        return result

    except Exception as e:
        print(f"  ❌ [DebateTopicGen] Error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

    finally:
        # Step 5: Always delete the temp file
        if temp_path.exists():
            try:
                temp_path.unlink()
                print(f"  🗑️  Deleted temp file: {temp_path.name}")
            except OSError as e:
                print(f"  ⚠️  Failed to delete temp file: {e}")
