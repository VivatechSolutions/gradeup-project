"""
Auto-Schema Textbook Extractor
===============================

Replaces hardcoded per-subject schemas with a 2-phase LLM approach:
  Phase 1: DISCOVER — LLM scans content and identifies section types + order
  Phase 2: EXTRACT  — Dynamically-built prompt extracts all content

Works with ANY textbook — TN English, CBSE English, Science, Math, Social Science —
without any book-specific configuration.
"""

import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import orjson
import requests
from langfuse_utils import traced_post
from dotenv import load_dotenv
from json_repair import parse_llm_json, strip_code_fences
from logger import get_logger

logger = get_logger(__name__)

load_dotenv()


# CONFIGURATION


# ── Provider config (loaded from config.py / env) ─────────────────────────────
try:
    from config import (
        OPENROUTER_BASE_URL,
        OPENROUTER_API_KEY,
        EXTRACTION_MODEL,
        OPENROUTER_APP_NAME,
        OPENROUTER_APP_URL,
        openrouter_routing,
    )
    _LLM_BASE_URL    = OPENROUTER_BASE_URL
    _LLM_API_KEY_ENV = "OPENROUTER_API_KEY"
    _DEFAULT_MODEL   = EXTRACTION_MODEL            # qwen/qwen3-235b-a22b-2507
    _FALLBACK_MODEL  = EXTRACTION_MODEL            # same model — no OpenAI fallback
    _OPENROUTER_HEADERS = {
        "HTTP-Referer": OPENROUTER_APP_URL,
        "X-Title":      OPENROUTER_APP_NAME,
    }
except Exception:
    # Graceful fallback if config not importable during tests
    _LLM_BASE_URL    = "https://openrouter.ai/api/v1/chat/completions"
    _DEFAULT_MODEL   = "qwen/qwen3-235b-a22b-2507"
    _FALLBACK_MODEL  = "qwen/qwen3-235b-a22b-2507"
    _LLM_API_KEY_ENV = "OPENROUTER_API_KEY"
    _OPENROUTER_HEADERS = {}

    def openrouter_routing(model=None):
        return {}

# Just under DeepInfra's 16,384 output cap — the tightest of the providers
# that reliably serve Scout. Chunks are sized (EXTRACTION_MAX_CHUNK_CHARS) so
# a chunk's JSON finishes well inside this.
_MAX_COMPLETION_TOKENS = int(os.getenv("EXTRACTION_MAX_COMPLETION_TOKENS", "16000"))

# Asking the model to continue a truncated JSON reply. Costs a full extra call
# (~3.5 min on a large chunk) and on math-dense content has never yet produced
# parseable output - a fresh retry of the chunk does. Set to 0 to skip it.
_TRUNCATION_RECOVERY_ENABLED = os.getenv(
    "EXTRACTION_TRUNCATION_RECOVERY", "1").strip().lower() not in ("0", "false", "no")
# Discovery lists every section in the unit; a 56-section maths chapter needs
# well over 2,048 tokens and used to truncate mid-array, burning an attempt.
_DISCOVERY_MAX_TOKENS = int(os.getenv("DISCOVERY_MAX_TOKENS", "8192"))
_API_TIMEOUT = 600
_MAX_RETRIES = 3
_BASE_DELAY = 10
_CHUNK_MAX_CHARS = 15_000
_CHUNK_OVERLAP_CHARS = 1_500


# TYPE CATALOG — rules for each section type, used to build dynamic prompts


TYPE_CATALOG = {
    # --- Universal types (any subject) ---
    "introduction": {
        "description": "Opening paragraph(s) of a chapter/unit",
        "extract_rule": "Extract the full introductory text before the first numbered section.",
        "fields": "content"
    },
    "learning_objectives": {
        "description": "Goals/outcomes listed at the start of the chapter",
        "extract_rule": "Extract the heading and the list of objectives/outcomes exactly as formatted in the textbook into 'content'.",
        "fields": "title, content"
    },
    "section": {
        "description": "A numbered/named content section (e.g. 1.1, 1.2, Chapter 3)",
        "extract_rule": "Every numbered heading at ANY depth (1.3, 1.3.1, 1.3.1.2) is its OWN separate section entry with its EXACT number in 'id'. 'content' holds ONLY the text between this heading and the next heading of any depth. NEVER merge a subsection's text into its parent, and NEVER merge SIBLING sections (1.4 is separate from 1.3). Do NOT merge Examples or Illustrations.",
        "fields": "id (exact section number, e.g. '1.3.1'), title, content"
    },
    "exercise": {
        "description": "Questions, comprehension, fill-in-the-blanks, MCQs, match-the-following",
        "extract_rule": "Extract EVERY question as a sub_item with number, content, and options[]. Group by exercise heading (A, B, C, I, II, III). Never merge separate exercises.",
        "fields": "title, content (heading text), sub_items[{number, content, options[]}]"
    },
    "activity": {
        "description": "Hands-on activity, experiment, or lab work",
        "extract_rule": "Extract full activity text including aim, materials, procedure, observation if present. CRITICAL: Extract EVERY activity. DO NOT MISS ANY ACTIVITY.",
        "fields": "title, content"
    },
    "summary": {
        "description": "Summary or points-to-remember section near end of unit",
        "extract_rule": "Extract each bullet/point as separate string.",
        "fields": "content as list or single text block"
    },
    "glossary": {
        "description": "Term-definition list (may include translations)",
        "extract_rule": "Extract each term-definition pair as a sub_item: {number: term, content: definition}.",
        "fields": "sub_items[{number: word, content: definition}]"
    },
    "vocabulary": {
        "description": "Word lists, homophones, synonyms, antonyms, word meanings",
        "extract_rule": "Extract each word/meaning pair. Include the vocabulary topic as title (e.g. 'Homophones', 'Synonyms', 'Glossary').",
        "fields": "title, content (explanation if any), sub_items[{number: word, content: meaning}]"
    },

    # --- English-specific types ---
    "warm_up": {
        "description": "Opening warm-up activity/discussion before the main reading",
        "extract_rule": "Extract the full warm-up text including all discussion points.",
        "fields": "title, content"
    },
    "prose": {
        "description": "Main reading passage — story, essay, autobiography, drama",
        "extract_rule": "Extract the COMPLETE text. Combine ALL paragraphs into ONE content field. Include inline questions. metadata: {title, author, genre}.",
        "fields": "title, content (FULL text), metadata{title, author, genre, about_author}"
    },
    "poem": {
        "description": "Verse/poetry",
        "extract_rule": "Extract content='', put each stanza in sub_items[{number: 'stanza_1', content: 'lines'}]. metadata: {title, poet, paraphrase, central_idea, rhyme_scheme}.",
        "fields": "title, content='', sub_items[stanzas], metadata{title, poet, about_poet, paraphrase, central_idea, rhyme_scheme}"
    },
    "supplementary": {
        "description": "Supplementary/additional reading passage, folk tales, secondary stories",
        "extract_rule": "Extract the COMPLETE supplementary text. metadata: {title, author}.",
        "fields": "title, content (FULL text), metadata{title, author}"
    },
    "about_the_author": {
        "description": "Biographical note about the author or poet",
        "extract_rule": "Extract full bio text. metadata: {person_name, works}.",
        "fields": "title, content, metadata{person_name, works}"
    },
    "grammar": {
        "description": "Grammar topics — tenses, modals, active/passive, prepositions, etc.",
        "extract_rule": "Extract the grammar EXPLANATION as content, and ALL exercises as sub_items[{number, content, options[]}]. CRITICAL: grammar sections often contain BOTH explanation AND exercises — extract BOTH.",
        "fields": "title (topic name), content (explanation + rules), sub_items[{number, content, options[]}]"
    },
    "listening": {
        "description": "Listening comprehension activity",
        "extract_rule": "Extract full instructions and all questions.",
        "fields": "title, content"
    },
    "speaking": {
        "description": "Speaking/role-play activity",
        "extract_rule": "Extract full activity text including dialogue prompts.",
        "fields": "title, content"
    },
    "writing_task": {
        "description": "Writing task — letter, essay, report, advertisement, diary entry, paragraph",
        "extract_rule": "Extract full task prompt and instructions. metadata: {task_type}.",
        "fields": "title, content, metadata{task_type}"
    },
    "reading": {
        "description": "Reading comprehension passage with questions",
        "extract_rule": "Extract passage + all questions as sub_items.",
        "fields": "title, content (passage), sub_items[{number, content, options[]}]"
    },
    "transcript": {
        "description": "Listening transcript (for teachers)",
        "extract_rule": "Extract the full transcript text.",
        "fields": "title, content"
    },

    # --- Math-specific types ---
    "example": {
        "description": "Solved mathematical example or illustrative problem",
        "extract_rule": "Extract the problem statement into 'content'. Extract the full STEP-BY-STEP solution into 'metadata': {'solution': '...'}. NEVER merge them.",
        "fields": "id, title, content (question only), metadata{solution}"
    },
    "theorem": {
        "description": "Mathematical theorem statement and proof",
        "extract_rule": "Extract theorem statement, proof, and any corollaries.",
        "fields": "id, title, content (statement + proof)"
    },
    "definition": {
        "description": "Mathematical/scientific definition",
        "extract_rule": "Extract the complete definition text.",
        "fields": "title, content"
    },
    "illustration": {
        "description": "Illustrated explanation or worked illustration with figures",
        "extract_rule": "Extract full text of the worked illustration. Do not merge into parent section's content. Do not create separate section/sub-section entries for simple figure images/captions (like 'Fig 1.1'); embed their image tags inline in the parent section's content.",
        "fields": "id, title, content"
    },
    "construction": {
        "description": "Geometric construction steps",
        "extract_rule": "Extract all construction steps in order.",
        "fields": "title, content"
    },
    "unit_exercise": {
        "description": "End-of-chapter/unit comprehensive exercise",
        "extract_rule": "Extract ALL questions with numbers and options.",
        "fields": "title, sub_items[{number, content, options[]}]"
    },
    "multiple_choice": {
        "description": "MCQ section (separate from regular exercises)",
        "extract_rule": "Extract each question with all options and answer if shown.",
        "fields": "sub_items[{number, content, options[], answer}]"
    },

    # --- Science-specific types ---
    "do_you_know": {
        "description": "'Do You Know?' / 'Did You Know?' information box",
        "extract_rule": "Extract the full box content.",
        "fields": "title, content"
    },
    "more_to_know": {
        "description": "'More to Know' sidebar",
        "extract_rule": "Extract the full sidebar content.",
        "fields": "title, content"
    },
    "try_this": {
        "description": "Quick experiment or try-it-out prompt",
        "extract_rule": "Extract the full prompt/experiment text.",
        "fields": "content"
    },
    "note": {
        "description": "Important note callout box",
        "extract_rule": "Extract the full note text.",
        "fields": "content"
    },
    "thinking_corner": {
        "description": "Thinking corner / thought-provoking question",
        "extract_rule": "Extract the question/prompt text.",
        "fields": "content"
    },
    "progress_check": {
        "description": "Mid-section progress check questions",
        "extract_rule": "Extract all questions.",
        "fields": "sub_items[{number, content}]"
    },
    "ict_corner": {
        "description": "ICT/technology integration section",
        "extract_rule": "Extract title, description, URL, and steps.",
        "fields": "title, content, metadata{url, steps[]}"
    },
    "points_to_remember": {
        "description": "Key points summary near end of chapter",
        "extract_rule": "Extract each point as a separate item.",
        "fields": "sub_items[{content}]"
    },

    # --- Social Science-specific types ---
    "map_work": {
        "description": "Map work / geography exercise",
        "extract_rule": "Extract each map instruction.",
        "fields": "sub_items[{content}]"
    },
    "timeline": {
        "description": "Chronological timeline of events",
        "extract_rule": "Extract each year-event pair.",
        "fields": "sub_items[{number: year, content: event}]"
    },
    "fun_with_history": {
        "description": "Fun with History activity section",
        "extract_rule": "Extract full activity text.",
        "fields": "title, content"
    },
    "reference_books": {
        "description": "Suggested reading / reference books list",
        "extract_rule": "Extract each book with title, author, publisher.",
        "fields": "sub_items[{content: 'title by author, publisher'}]"
    },

    # --- Catch-all ---
    "other": {
        "description": "Any content that doesn't fit other types",
        "extract_rule": "Extract the full content. Missing content is worse than wrong label.",
        "fields": "title, content"
    },
}



# PHASE 1: DISCOVER TEXTBOOK STRUCTURE


_DISCOVERY_SYSTEM_PROMPT = """You are an expert at analyzing textbook structure. Given a textbook unit's content, identify every distinct section type present, in order of first appearance.

IMPORTANT RULES:
1. Every distinct block of content MUST be its own entry in the list.
2. HIERARCHY: every numbered heading at EVERY depth is its own "section" entry —
   parent sections (1.3), sub-sections (1.3.1) AND sub-sub-sections (1.3.1.2).
   List them in the exact order they appear in the document, with the full
   number kept in the title (e.g. "1.3.1 Cell Wall").
3. This applies to ANY textbook numbering style (1.1 / 1.1.1 / 2.4.3.1 etc.).
   NEVER invent a number for a heading that has none printed — keep its title as-is.
4. Illustrations should be part of the preceding section's content.
5. A story/essay followed by questions = at MINIMUM two entries: prose + exercise.
6. IGNORE scanned images, figures and figure captions — never create entries for them.

COMMON STRUCTURES YOU MUST DETECT:
- Story/essay text → type="prose" (even if it has no explicit heading)
- Author name on its own line (e.g. MULK RAJ ANAND) → type="about_the_author"
- "THINK ABOUT IT" / "Comprehension" / numbered questions → type="exercise"
- "TALK ABOUT IT" / "DISCUSS" → type="exercise" or "speaking"
- "SUGGESTED READING" / "REFERENCE BOOKS" → type="reference_books"
- Grammar explanations + exercises → type="grammar"
- Word lists / glossary / meanings → type="vocabulary"
- Writing prompts (letters, reports) → type="writing_task"
- Listening / Speaking activities → type="listening" / "speaking"
- Poems with stanzas → type="poem"
- Supplementary reading → type="supplementary"

- "Example 1:" / "Exercise 1.1" / "Theorem 2.3" / "Activity 1" / "Problem 1.2" → MUST be separate sections.
- "Solution:" text inside an Example → KEEP in the same section as the example (metadata).

Return ONLY valid JSON: {"sections": [{"type": "...", "title": "..."}, ...]}

Use ONLY these type labels:
introduction, learning_objectives, section, exercise, activity, summary, glossary,
vocabulary, warm_up, prose, poem, supplementary, about_the_author, grammar,
listening, speaking, writing_task, reading, transcript, example, theorem,
definition, illustration, construction, unit_exercise, multiple_choice,
do_you_know, more_to_know, try_this, note, thinking_corner, progress_check,
ict_corner, points_to_remember, map_work, timeline, fun_with_history,
reference_books, other

For "title", use the actual heading/title text from the content.
List EVERY section you can find. Missing a section is WORSE than adding an extra one."""


def discover_textbook_structure(
    content_md: str,
    api_key: str,
    model: str = _DEFAULT_MODEL,
) -> List[Dict[str, str]]:
    """
    Phase 1: Discover textbook structure.

    Sends the content to LLM to identify all section types present in the textbook.
    Returns list of {type, title} dicts in order of appearance.

    Uses a generous sample size to ensure grammar and later sections aren't missed.
    """
    # For structure analysis, use more comprehensive sampling for large units.
    # We want to see the middle of the book too!
    if len(content_md) <= 80_000:
        sample = content_md
    else:
        # Sample start, middle, and end
        mid = len(content_md) // 2
        sample = (
            content_md[:20_000] + 
            "\n\n[... middle portion ...]\n\n" + 
            content_md[mid-10_000:mid+10_000] + 
            "\n\n[... end portion ...]\n\n" + 
            content_md[-20_000:]
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        **_OPENROUTER_HEADERS,
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _DISCOVERY_SYSTEM_PROMPT},
            {"role": "user", "content": f"Analyze this textbook unit and list ALL section types present:\n\n{sample}"},
        ],
        "max_tokens": _DISCOVERY_MAX_TOKENS,
        "response_format": {"type": "json_object"},
    }

    # Providers that rate-limited us during THIS discovery; excluded from the
    # retries so the attempts spread out instead of stacking on one pool.
    _blocked_providers: List[str] = []

    # Try with primary model first, then fallback model
    models_to_try = [model]
    if _FALLBACK_MODEL != model:
        models_to_try.append(_FALLBACK_MODEL)

    for current_model in models_to_try:
        for attempt in range(_MAX_RETRIES):
            try:
                if attempt > 0:
                    time.sleep(_BASE_DELAY * (2 ** attempt))

                # Routing is applied here, not on the base payload, because
                # only now is the model this attempt will actually use known.
                current_payload = {
                    **payload,
                    "model": current_model,
                    **openrouter_routing(current_model),
                }
                # Carry forward providers that already refused us this run.
                for slug in _blocked_providers:
                    current_payload = _exclude_provider(current_payload, slug)
                logger.info(f"[Phase 1] Calling {current_model} via OpenRouter (attempt {attempt+1})...")

                resp = traced_post("discover-textbook-structure",
                    _LLM_BASE_URL,
                    headers=headers, json=current_payload, timeout=120,
                )
                if resp.status_code == 429:
                    culprit = _provider_from_error(resp)
                    if culprit and culprit not in _blocked_providers:
                        _blocked_providers.append(culprit)
                        logger.warning(
                            f"[Route] {culprit} is rate-limited — excluding it "
                            f"for the remaining discovery attempts"
                        )
                resp.raise_for_status()
                data = resp.json()
                choice = data["choices"][0]
                raw = choice["message"].get("content") or ""
                finish_reason = choice.get("finish_reason", "stop")

                # Handle content_filter — empty response
                if finish_reason == "content_filter" or not raw.strip():
                    logger.warning(f"[Phase 1] content_filter / empty response from {current_model}")
                    if current_model == model and _FALLBACK_MODEL != model:
                        logger.info(f"[Phase 1] Will retry with {_FALLBACK_MODEL}...")
                        break  # break inner loop to try fallback model
                    continue  # retry same model

                # Repaired, not bare: discovery replies arrive truncated or
                # missing their opening brace often enough that a bare parse
                # spent two of three attempts on recoverable responses.
                parsed = parse_llm_json(raw)
                if parsed is None:
                    logger.warning(
                        f"[Phase 1] Unparseable response from {current_model} "
                        f"({len(raw)} chars) — attempt {attempt+1}"
                    )
                    continue

                # Handle both {"sections": [...]} and direct list
                if isinstance(parsed, list):
                    sections = parsed
                elif isinstance(parsed, dict):
                    sections = parsed.get("sections", [])
                else:
                    sections = []

                # Validate and normalize
                valid_types = set(TYPE_CATALOG.keys())
                result = []
                for s in sections:
                    if isinstance(s, dict):
                        stype = s.get("type", "other").lower().strip()
                        if stype not in valid_types:
                            stype = "other"
                        result.append({
                            "type": stype,
                            "title": s.get("title", "") or ""
                        })
                    elif isinstance(s, str):
                        stype = s.lower().strip()
                        if stype not in valid_types:
                            stype = "other"
                        result.append({"type": stype, "title": ""})

                if result:
                    types_found = [s["type"] for s in result]
                    logger.info(f"[Phase 1] Discovered {len(result)} sections: {types_found}")
                    return result
                else:
                    logger.warning(f"[Phase 1] Discovery returned empty sections — attempt {attempt+1}")

            except Exception as e:
                logger.error(f"[Phase 1] Discovery attempt {attempt+1} ({current_model}) failed: {e}")

    # Fallback: use heuristic-based structure detection (no LLM)
    logger.warning(f"[Phase 1] All LLM attempts failed — using heuristic detection")
    return _detect_structure_heuristic(content_md)


def _detect_structure_heuristic(content_md: str) -> List[Dict[str, str]]:
    """
    Heuristic-based structure detection — no LLM needed.
    Scans for markdown headings, keywords, and patterns to identify sections.
    Used as fallback when API is blocked (content_filter, rate limit, etc.).
    """
    result = []
    seen_types = set()
    text_lower = content_md.lower()

    # ── Detect numbered sections (e.g. ## 1.1 Introduction, ## 1.2 Title) ──
    # This is critical for social science / science textbooks with N.M structure
    numbered_sections = re.findall(
        r'(?:^|\n)#{1,4}\s*(' + _SECNUM + r')\s+(.+)',
        content_md
    )
    if numbered_sections:
        for sec_num, sec_title in numbered_sections:
            sec_title = sec_title.strip().rstrip('#').strip()
            # Skip exercise/evaluation headings
            if re.match(r'(?:exercise|evaluation|summary|glossary)', sec_title, re.IGNORECASE):
                continue
            result.append({"type": "section", "title": f"{sec_num} {sec_title}"})
        seen_types.add("section")

    # ── Detect introduction section ──
    if re.search(r'(?:^|\n)#{1,4}\s*(?:\d+\.\d+\s+)?introduction', content_md, re.IGNORECASE):
        if "introduction" not in seen_types:
            result.append({"type": "introduction", "title": ""})
            seen_types.add("introduction")

    # Check if there's substantial prose text (story/essay/passage)
    # Only add generic prose if no numbered sections were found
    heading_count = len(re.findall(r'^#{1,4}\s+', content_md, re.MULTILINE))
    if len(content_md) > 2000 and "section" not in seen_types:
        result.append({"type": "prose", "title": ""})
        seen_types.add("prose")

    # Keyword patterns to search for in headings and content
    _HEURISTIC_PATTERNS = [
        # (regex pattern for heading/keyword, section type)
        (r'(?:^|\n)#{1,4}\s*(?:think\s*about\s*it|comprehension|questions?)', "exercise"),
        (r'(?:^|\n)#{1,4}\s*(?:talk\s*about\s*it|discuss)', "speaking"),
        (r'(?:^|\n)#{1,4}\s*(?:suggested\s*reading|reference\s*books)', "reference_books"),
        (r'(?:^|\n)#{1,4}\s*(?:grammar|modals?|tense|active\s*and\s*passive|preposition|reported\s*speech|conditional|subject.verb)', "grammar"),
        (r'(?:^|\n)#{1,4}\s*(?:vocabulary|word\s*meanings?|glossary|homophones?|synonyms?|antonyms?)', "vocabulary"),
        (r'(?:^|\n)#{1,4}\s*(?:writing|write\s*a|letter\s*writing|paragraph\s*writing|report\s*writing|advertisement)', "writing_task"),
        (r'(?:^|\n)#{1,4}\s*(?:listening)', "listening"),
        (r'(?:^|\n)#{1,4}\s*(?:speaking)', "speaking"),
        (r'(?:^|\n)#{1,4}\s*(?:exercise|practice|assignment|worksheet)', "exercise"),
        (r'(?:^|\n)#{1,4}\s*(?:summary|points\s*to\s*remember)', "summary"),
        (r'(?:^|\n)#{1,4}\s*(?:activity|experiment|lab\s*work)', "activity"),
        (r'(?:^|\n)#{1,4}\s*(?:map\s*work)', "map_work"),
        (r'(?:^|\n)#{1,4}\s*(?:timeline)', "timeline"),
        (r'(?:^|\n)#{1,4}\s*(?:evaluation)', "exercise"),
        # Non-heading keywords  
        (r'\bTHINK\s+ABOUT\s+IT\b', "exercise"),
        (r'\bTALK\s+ABOUT\s+IT\b', "speaking"),
        (r'\bSUGGESTED\s+READING\b', "reference_books"),
        (r'\bREFERENCE\s+BOOKS\b', "reference_books"),
        (r'\bEVALUATION\b', "exercise"),
    ]

    for pattern, stype in _HEURISTIC_PATTERNS:
        if stype not in seen_types and re.search(pattern, content_md, re.IGNORECASE):
            result.append({"type": stype, "title": ""})
            seen_types.add(stype)

    # Detect numbered questions (exercise pattern)
    question_lines = re.findall(r'^\s*\d+\.\s+\w', content_md, re.MULTILINE)
    if len(question_lines) >= 2 and "exercise" not in seen_types:
        result.append({"type": "exercise", "title": ""})
        seen_types.add("exercise")

    # If no structure detected at all, return generic
    if not result:
        result = [{"type": "other", "title": ""}]

    types_found = [s["type"] for s in result]
    logger.info(f"[Phase 1 Heuristic] Detected {len(result)} sections: {types_found}")
    return result



# PHASE 2: BUILD DYNAMIC EXTRACTION PROMPT + EXTRACT


def _build_dynamic_system_prompt(discovered_types: List[Dict[str, str]]) -> str:
    """
    Build a system prompt dynamically from the discovered section types.
    Only includes extraction rules for types actually found in the content.
    """
    # Deduplicate types while preserving order
    seen = set()
    unique_types = []
    for s in discovered_types:
        if s["type"] not in seen:
            seen.add(s["type"])
            unique_types.append(s["type"])

    # Build type-specific rules
    type_rules = []
    for stype in unique_types:
        info = TYPE_CATALOG.get(stype, TYPE_CATALOG["other"])
        type_rules.append(
            f"  {stype:25s} — {info['description']}\n"
            f"                            Rule: {info['extract_rule']}\n"
            f"                            Fields: {info['fields']}"
        )

    type_rules_text = "\n".join(type_rules)

    # Build the expected structure preview from discovery
    structure_preview = []
    for s in discovered_types:
        title = f' — "{s["title"]}"' if s["title"] else ""
        structure_preview.append(f"  {s['type']}{title}")
    structure_text = "\n".join(structure_preview)

    return f"""You are an expert textbook content extractor. Extract ALL content from the textbook unit into structured JSON.

━━━ DISCOVERED STRUCTURE ━━━
The textbook unit contains these sections (in order):
{structure_text}

━━━ SECTION TYPE RULES ━━━
{type_rules_text}

━━━ OUTPUT JSON FORMAT ━━━
{{
  "unit_number": <integer or null>,
  "chapter_number": <integer or null>,
  "title": "<unit/chapter title>",
  "sections": [
    {{
      "type": "<type from list above>",
      "id": "<identifier — EXACT section number for numbered headings (e.g. '1.3', '1.3.1'), or 'A', 'Example 1.3', 'Exercise 2'>",
      "title": "<heading text or null>",
      "content": "<FULL text — NEVER truncate>",
      "metadata": {{}},
      "sub_items": [
        {{
          "number": "<item number/label>",
          "content": "<item text>",
          "options": ["a) ...", "b) ..."]
        }}
      ]
    }}
  ]
}}

━━━ CRITICAL RULES ━━━
1. EXTRACT EVERYTHING — every paragraph, every question, every word definition.
   Missing content is the WORST error. When in doubt, extract with type="other".

2. HIERARCHICAL SECTIONS — Every numbered heading at EVERY depth is its own separate
   section entry: parent sections (1.3), sub-sections (1.3.1) and sub-sub-sections (1.3.1.2)
   are ALL separate entries with type="section" and the EXACT number in "id".
   Output them FLAT, in the exact order they appear in the textbook — the parent/child
   hierarchy is rebuilt later from the "id" numbers.
   NEVER INVENT OR RENUMBER SECTION NUMBERS: copy the number EXACTLY as printed in the
   heading. If a heading has NO number printed in the source text, set "id" to null —
   do NOT assign it the next number in sequence, and do NOT renumber later sections.
   NEVER merge a subsection's text into its parent's "content".
   NEVER merge SIBLINGS: 1.4, 1.5 are siblings of 1.3 — NOT children; 1.3.2 is a sibling
   of 1.3.1. Each numbered heading MUST be its own entry.

2b. SYMBOLS — copy bullet glyphs and typographic symbols EXACTLY as they appear
   (❖, •, ‣, →, ✓ ...). Do NOT substitute a "nicer" or more familiar character:
   turning the textbook's ❖ bullets into ✅ changes what the printed page says.

3. IMAGES — the text contains inline image reference markers like "[Image: img-5.jpeg]".
   PRESERVE every marker VERBATIM, in place, inside the "content" of the section or
   subsection where it appears — the marker tells the reader which stored image belongs
   there. Do NOT invent markers, do NOT move them, do NOT output raw image markdown/URLs
   or any "image_urls"/"images" field. Keep figure captions (e.g. "Fig. 1.18") as plain
   text next to their marker.

16. UNNUMBERED SUB-HEADINGS — A sub-topic heading WITHOUT a number (e.g. "Violent Forms
    of Nationalism", "Immediate Cause") that appears under a numbered section should be
    MERGED into that section's "content" field (keep the heading text inline as markdown).
    Only NUMBERED headings become separate section entries.

4. SECTION CONTENT — For type="section", "content" holds ONLY the text between this heading
   and the NEXT heading of ANY depth. Do NOT copy child subsection text into the parent, and
   NEVER INLINE standalone entities like Activity, Problem, Example, Illustration, or Exercise.

5. INLINE BOXES: Activities, Examples, Illustrations, Problems, Exercises, Theorems,
   Definitions, and pedagogy boxes ('Do You Know', 'Thinking Corner', 'Progress Check',
   'Note') MUST ALWAYS be extracted as their own separate top-level sections — NEVER
   merged into a parent section's 'content', even if they appear mid-section.
   Give each box its printed heading as "title" (e.g. "Thinking Corner", "Progress Check",
   "Theorem 2", "Do You Know") and the matching "type" (thinking_corner, progress_check,
   do_you_know, note, theorem, illustration, activity, example, exercise).
   The label word decides the type: "Example 2.7" is ALWAYS type='example' (never
   'exercise'); "Exercise 2.4" is ALWAYS type='exercise'. ALL questions of one exercise
   (e.g. every question of "Exercise 2.9") go into ONE exercise section as sub_items —
   NEVER output the same exercise number as multiple separate sections.
   Do NOT create separate sections for standalone figure captions (like 'Fig. 1.18');
   keep them inline in the parent section's content. For Mathematics: 'Illustration N'
   blocks are worked illustrations, so extract them as type='illustration' (never 'example').

5b. A BOX HOLDS ONLY ITS OWN TEXT. An Activity / Do You Know / Thinking Corner box
   contains its instruction, steps, questions and its own observation or explanation —
   and nothing else. The regular textbook exposition that RESUMES after a box (before the
   next heading) belongs to the enclosing section, NOT to the box. Rule 4's "up to the
   next heading" is for sections; it does NOT apply to boxes. Emit that resumed
   exposition as its own section with type="prose" and title=null, placed after the box;
   it will be re-joined to its section. Example — the book prints:
       ### Activity
       Try to do a comparison between the two pie charts and find out why ...
       The land under permanent pasture has also decreased. Most of the other fallow
       lands are of poor quality ... (three more paragraphs of exposition)
   Correct: the activity section holds ONLY the "Try to do a comparison..." paragraph;
   the exposition is a separate untitled prose section. Wrong: all of it in the activity.
   Tell them apart by who is being addressed: a box speaks TO the student ("try", "find
   out", "observe", "what do you notice", "you will see"); exposition explains the topic.

6. GRAMMAR is CRITICAL — extract BOTH the explanation AND all exercises.
   Grammar sections often have sub-exercises (A, B, C, D...) — each becomes a sub_item.

7. EXERCISES — each numbered question is a sub_item with {{"number", "content", "options"}}.
   NEVER merge multiple questions into one sub_item. Include ALL options for MCQs.

8. PROSE/POEM/SUPPLEMENTARY — include the COMPLETE text. Never truncate or summarize.
   For poems: content="" and stanzas go in sub_items[{{"number":"stanza_1", "content":"lines"}}].

9. VOCABULARY — each word-meaning pair is a sub_item: {{"number": "word", "content": "meaning"}}.

10. IGNORE: Page stamps (.indd lines), timestamps, page numbers, Reprint lines,
    page/book stamps (e.g. '2 / Moments', 'The Lost Child / 3'), QR codes.

11. DO NOT USE PAGES ARRAY: Never output a "pages" array. If the content spans multiple pages, merge them into the appropriate hierarchical "sections". The top-level structure MUST be: unit_number, title, sections[].

12. Return ONLY valid JSON. No markdown fences. No commentary.

13. EXAMPLES (for maths/science) — For sections with type="example":
    - "content" must contain ONLY the problem statement / question.
    - The solution MUST go in "metadata": {{"solution": "full solution text here"}}.
    - NEVER merge the solution into the content field.
    Example: {{"type":"example", "title":"Example 1", "content":"Find 5 rational numbers...",
              "metadata":{{"solution":"Solution 1: ... Solution 2: ..."}} }}

    However, ALWAYS create sections for numbered headings (e.g. '2.1', '2.2') even if they follow the title.

14. SIBLING SECTIONS: Sections like 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 are ALL siblings at the same level.
    NEVER merge 1.4 into 1.3 even if 1.4 appears immediately after 1.3.1. Each numbered heading
    at each depth (X.Y, X.Y.Z, X.Y.Z.W) MUST be a separate section entry in document order.


15. CHUNK OVERLAPS: If a text chunk starts in the middle of a paragraph with NO heading visible, skip that partial text. However, if a sub-section heading IS clearly visible (e.g. "## 2.3.3 Uniform acceleration"), you MUST extract it — even if the parent section (2.3) was in a previous chunk. NEVER skip content that has a visible heading. Missing content is the WORST error.

17. UNNUMBERED SOCIAL SCIENCE / HISTORY / GEOGRAPHY TEXTBOOKS:
    When the textbook uses markdown heading levels instead of numbered sections (e.g., "# Sources",
    "## Inscriptions", "## Monuments"), the heading DEPTH (H1/H2/H3) indicates the hierarchy.
    DO NOT output these as flat siblings — USE sub_sections[]:

    - H1 (#) heading  → top-level entry in sections[]
    - H2 (##) heading → sub_sections[] entry inside the immediately preceding H1 section
    - H3 (###) heading → sub_sections[] entry inside the immediately preceding H2 section

    CORRECT (nested):
    {{
      "type": "section", "title": "Sources", "content": "...",
      "sub_sections": [
        {{"type": "section", "title": "Inscriptions", "content": "..."}},
        {{"type": "section", "title": "Monuments", "content": "..."}},
        {{"type": "section", "title": "Coins", "content": "..."}}
      ]
    }}

    WRONG (flat):
    [{{"title": "Sources"}}, {{"title": "Inscriptions"}}, {{"title": "Monuments"}}]

    This applies to all textbooks where headings carry NO section numbers (e.g. 1.1, 1.2).

18. EVALUATION / UNIT EXERCISE WITH ROMAN-NUMERAL GROUPS (State Board Social Science / History):
    Tamil Nadu State Board textbooks have an "Evaluation" section whose sub-exercises are labeled
    I, II, III, IV … (Roman numerals). Due to OCR heading-level inconsistency these may appear as
    ## or ### headings in the source, but they BELONG to the Evaluation section, NOT as sibling
    top-level sections.

    Capture them as sub_items of the Evaluation/exercise section:
      number  : Arabic "1", "2", "3", … (matching the Roman numeral order)
      content : FULL verbatim text of that exercise group — include the Roman-numeral heading
                (e.g. "I. Choose the correct answer") AND every question numbered beneath it.
      options : []

    EXAMPLE (correct):
    {{
      "type": "exercise", "title": "Evaluation",
      "sub_items": [
        {{"number":"1","content":"I. Choose the correct answer\\n\\n1. _____ are writings engraved ...\\na) Chronicles\\nb) Travelogues\\nc) Coins\\nd) Inscriptions\\n\\n2. ...","options":[]}},
        {{"number":"2","content":"II. Fill in the Blanks\\n\\n1. ________ inscriptions...","options":[]}},
        {{"number":"3","content":"III. Match the following\\n\\n1. Khajuraho - Odisha\\n...","options":[]}},
        ...
      ]
    }}

    NEVER split each Roman-numeral group into its own separate top-level section.
    ALL exercises (I through XI, or however many exist) MUST appear as sub_items of ONE
    Evaluation/exercise entry.

19. PAGE-BREAK TEXT JOINS:
    The OCR output may split a single sentence across two pages, leaving a double newline (\\n\\n)
    mid-sentence. Detect and join these: if the text before \\n\\n does not end with a sentence-ending
    punctuation (., !, ?, :) and the text after \\n\\n continues the sentence (starts with a lowercase
    letter or continues a phrase), merge them with a single space.
    Example: "considered reliable than the exaggerated account\\n\\nof Abul Fazal"
           → "considered reliable than the exaggerated account of Abul Fazal"

20. REFERENCES / BIBLIOGRAPHY — EXTRACT ALL ENTRIES:
    The References section at the end of a chapter lists all source books. Extract EVERY entry.
    Do NOT stop after the first 1 or 2 entries. A reference entry typically has the format:
    "N. Author, Title, Publisher, Year." — count them and include all of them in content.

21. DO YOU KNOW / SIDEBAR BOXES AT TOP-LEVEL HEADING:
    In Social Science textbooks, "Do you know?" or "Did you know?" boxes sometimes appear at the
    same heading level (H1) as main sections like "Introduction" and "Sources". These are SIBLINGS,
    NOT children of Introduction. Extract them as a separate top-level section with type="do_you_know".
    Do NOT nest them inside the preceding section as a sub_section.
"""



def _build_user_prompt(
    content: str,
    unit_number: Optional[int] = None,
    chunk_index: int = 1,
    total_chunks: int = 1,
) -> str:
    """Build the user prompt for extraction."""
    unit_hint = f"\nUNIT/CHAPTER NUMBER: {unit_number}" if unit_number else ""
    chunk_note = ""
    if total_chunks > 1:
        chunk_note = (
            f"\n[CHUNK {chunk_index}/{total_chunks}] "
            f"Extract ALL content in this chunk. "
            f"Content overlaps with adjacent chunks — DO NOT extract partial sections that started in a previous chunk."
        )

    return f"""Extract ALL content from this textbook unit into the JSON structure defined above.
{unit_hint}{chunk_note}

━━━ CONTENT ━━━
{content}

Return the complete JSON now."""


_SECTION_BOUNDARY_RE = re.compile(
    r"^(?:"
    r"#{1,4}\s+"
    r"|\*{1,2}(?:Example|Exercise|Theorem|Illustration|Activity|Problem)\b"
    r"|(?:Example|Exercise|Activity|Illustration|Problem)\s+\d+(?:\.\d+)*"
    r"|(?:Note|Do You Know|More to Know|Try This|Thinking Corner)"
    r"|(?:Progress Check|ICT Corner|Unit Exercise|Fun with History)"
    r"|(?:Definition|Theorem|Proof|Construction)\b"
    r"|(?:Vocabulary|Grammar|Writing|Speaking|Listening)\s*$"
    r"|(?:Summary|Points to Remember|Glossary|Timeline|Map Work)\s*$"
    r")",
    re.IGNORECASE,
)


# Exercise headings are HARD chunk boundaries: an exercise block must always
# start a fresh chunk so it can never straddle two chunks (the "skip partial
# sections" prompt rule would make both chunks drop it).
_HARD_BOUNDARY_RE = re.compile(
    r'^#{0,4}\s*\**\s*(?:Unit\s+)?Exercise\s*[-–—]?\s*\d+(?:\.\d+)*\**\s*$',
    re.IGNORECASE,
)


def _split_into_chunks(text: str, max_chars: int = 300000, overlap_chars: int = 2000) -> List[str]:
    """
    Split text into chunks with overlap, breaking at section boundaries.
    The overlap ensures sections at chunk boundaries are captured in both chunks.
    Exercise headings force a flush (no overlap) so each exercise block lands
    whole inside exactly one chunk.
    """
    if len(text) <= max_chars:
        return [text]

    lines = text.split('\n')
    chunks: List[str] = []
    current_lines: List[str] = []
    current_len = 0

    for line in lines:
        line_len = len(line) + 1
        stripped = line.strip()
        is_boundary = bool(stripped and _SECTION_BOUNDARY_RE.match(stripped))
        is_hard_boundary = bool(stripped and _HARD_BOUNDARY_RE.match(stripped))

        # Hard flush at exercise headings: new chunk starts exactly at the
        # heading, no overlap needed (the heading opens a fresh section).
        if is_hard_boundary and current_len >= max_chars * 0.3 and current_lines:
            chunks.append('\n'.join(current_lines))
            current_lines = []
            current_len = 0

        # Flush before a new section if chunk is large enough
        elif is_boundary and current_len >= max_chars * 0.65 and current_lines:
            chunks.append('\n'.join(current_lines))
            # Keep overlap: take the last N chars worth of lines
            overlap_lines = []
            overlap_len = 0
            for prev_line in reversed(current_lines):
                if overlap_len + len(prev_line) + 1 > overlap_chars:
                    break
                overlap_lines.insert(0, prev_line)
                overlap_len += len(prev_line) + 1
            current_lines = overlap_lines
            current_len = overlap_len

        # Hard fallback: flush before exceeding limit
        if current_len + line_len > max_chars and current_lines:
            chunks.append('\n'.join(current_lines))
            overlap_lines = []
            overlap_len = 0
            for prev_line in reversed(current_lines):
                if overlap_len + len(prev_line) + 1 > overlap_chars:
                    break
                overlap_lines.insert(0, prev_line)
                overlap_len += len(prev_line) + 1
            current_lines = overlap_lines
            current_len = overlap_len

        current_lines.append(line)
        current_len += line_len

    if current_lines:
        chunks.append('\n'.join(current_lines))

    return chunks



# CONTENT CLEANING


# Expanded whitelist for abbreviations that should NOT be stripped
_ABBREVIATION_WHITELIST = {
    'A', 'B', 'C', 'D', 'OR', 'AND', 'NOT', 'THE', 'FOR', 'ARE', 'BUT', 'YOU',
    'ALL', 'CAN', 'HER', 'HIM', 'HIS', 'HOW', 'ITS', 'OUR', 'OUT', 'WHO',
    'YES', 'USE', 'SAY', 'NEW', 'ONE', 'TWO', 'GET', 'MAY', 'NOW', 'OLD',
    'OWN', 'SEE', 'WAY', 'BOY', 'DAY', 'MAN', 'MEN', 'PUT', 'RUN', 'SHE',
    'TOO', 'TRY', 'WAS', 'HAD', 'HAS',
    # Educational abbreviations
    'GDP', 'UNESCO', 'ASEAN', 'NATO', 'WHO', 'AIDS', 'HIV', 'DNA', 'RNA',
    'USA', 'USSR', 'UNO', 'IMF', 'WTO', 'OPEC', 'ICT', 'MCQ', 'LCM', 'HCF',
    'GCD', 'RHS', 'LHS', 'SSS', 'SAS', 'ASA', 'AAS', 'AAA',
    'AC', 'DC', 'LED', 'LCD', 'CPU', 'RAM', 'ROM',
    'NGO', 'PIL', 'FIR', 'IPC', 'CBI', 'NRI',
    'BCE', 'CE', 'AD', 'BC',
}


_IMG_MD_RE   = re.compile(r'!\[[^\]]*\]\(([^)\s]+)[^)]*\)')
_IMG_HTML_RE = re.compile(r'<img\b[^>]*?src=["\']?([^"\'\s>]+)["\']?[^>]*>', re.IGNORECASE)
_IMG_MARKER_RE = re.compile(r'\[Image:\s*([^\]]+)\]')


def strip_image_tags(text: str, keep_reference: bool = True) -> str:
    """
    Replace markdown/HTML image tags with a lightweight inline reference marker
    `[Image: <filename>]` so the section/subsection content records WHICH image
    belongs there (the binary is stored in S3 at the unit level, never embedded).

    Pass keep_reference=False to drop the tags entirely (legacy behaviour).
    """
    if not text:
        return text

    def _md_marker(m: "re.Match") -> str:
        if not keep_reference:
            return ''
        name = m.group(1).strip().split('/')[-1]
        return f"[Image: {name}]"

    text = _IMG_MD_RE.sub(_md_marker, text)
    text = _IMG_HTML_RE.sub(_md_marker, text)
    return text


_EXERCISE_HEADING_RE = re.compile(
    r'^(#{1,6})\s+((?:[IVX]+|\d+)[.)]?\s+\S.*)$',
    re.IGNORECASE,
)
_EVALUATION_HEADING_RE = re.compile(r'^(#{1,6})\s+(evaluation|exercises?)\s*$', re.IGNORECASE)


def normalize_exercise_heading_levels(text: str) -> str:
    """
    Put every numbered exercise one level below its Evaluation heading.

    Textbook OCR is inconsistent about depth: this chapter emits

        ### Evaluation                        (H3)
        #### I. Choose the correct answer     (H4 - nested correctly)
        ## II Fill in the Blanks              (H2 - a SIBLING of Evaluation)

    so the hierarchy parser sees only exercise I under Evaluation and treats
    II onward as top-level sections. Re-stamping each numbered exercise to
    Evaluation's depth + 1 makes the grouping fall out of the existing nesting
    logic instead of needing a special case downstream.
    """
    out = []
    eval_depth = None

    for line in text.split('\n'):
        m_eval = _EVALUATION_HEADING_RE.match(line.strip())
        if m_eval:
            eval_depth = len(m_eval.group(1))
            out.append(line)
            continue

        if eval_depth is not None:
            m_ex = _EXERCISE_HEADING_RE.match(line.strip())
            if m_ex:
                out.append('#' * (eval_depth + 1) + ' ' + m_ex.group(2))
                continue

        out.append(line)

    return '\n'.join(out)


def clean_content_for_extraction(text: str) -> str:
    """
    Clean OCR artifacts while preserving all educational content.
    More conservative than the old _clean_content_for_api to avoid losing grammar sections.
    """
    # Normalize line endings (handles \r\n from Windows files)
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # Give exercises a consistent depth under Evaluation before anything parses
    # the hierarchy.
    text = normalize_exercise_heading_levels(text)

    # Drop scanned-image tags entirely — images are never stored or embedded
    text = strip_image_tags(text)

    lines = text.split('\n')
    cleaned = []

    for line in lines:
        s = line.strip()

        # Drop Lorem ipsum placeholder text. Some printed textbooks ship pages
        # with unreplaced filler, and the OCR faithfully captures it — it then
        # lands in a real section's content as if it were curriculum material.
        if re.match(r'^lorem\s+ipsum\b', s, re.IGNORECASE):
            continue

        # Drop .indd page stamp lines
        if re.search(r'\.indd\s+\d+', s):
            continue

        # Drop bare timestamp lines
        if re.match(r'^\d{2}-\d{2}-\d{4}\s+\d{2}[:.]\d{2}[:.]\d{2}', s):
            continue

        # Drop bare page numbers (2-4 digits only)
        if re.match(r'^\d{2,4}$', s):
            continue

        # Drop NCERT Reprint stamps
        if re.match(r'^Reprint\s+\d{4}[-–]\d{2,4}$', s, re.IGNORECASE):
            continue

        # Drop page/book stamps like '2 / Moments', 'The Lost Child / 3',
        # '4 / Moments', '6 / Beehive' etc.
        if re.match(r'^(?:\d+\s*/\s*[A-Z][a-z]+|[A-Za-z\s]+/\s*\d+)$', s):
            continue

        # Drop <!-- PAGE N --> markers
        if re.match(r'^<!--\s*PAGE\s+\d+\s*-->$', s):
            continue

        # Drop chapter code stamps like '0960CH01'
        if re.match(r'^\d{4}[A-Z]{2}\d{2}$', s):
            continue

        # Drop Garbled/Common footer URLs
        if re.match(r'^www\.[a-zA-Z0-9-]+\.(net|in|com)$', s, re.IGNORECASE) or 'www.tntextbooks.net' in s:
            continue

        # Drop common PDF timestamp footers (e.g. 1/5/2022 6:28:39 PM)
        if re.match(r'^\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(AM|PM)$', s, re.IGNORECASE):
            continue

        # Drop Garbled OCR tokens — but be more conservative
        if re.match(r'^[A-Z]{3,8}$', s) and s not in _ABBREVIATION_WHITELIST:
            continue

        cleaned.append(line)

    result = re.sub(r'\n{3,}', '\n\n', '\n'.join(cleaned))
    return result.strip()



# POST-PROCESSING — fix common LLM output issues


_CHAPTER_HEADER_RE = re.compile(
    r'^(chapter|unit|lesson)\s*[-–:]?\s*\d+\s*$', re.IGNORECASE
)

# NESTED-SECTION HOISTING — rescue content trapped inside sibling dicts
#
# Some LLM chunks return a section dict with EXTRA type-keyed objects stuffed
# inside it, e.g. {"type": "example", "id": "Example 2.3", ..., "section":
# {...2.3 content...}, "theorem": {...}, "note": {...}}. Without hoisting,
# that trapped content (an entire main section in the observed CBSE Maths
# run) silently disappears from the output.

_STANDARD_SECTION_KEYS = {
    "type", "id", "title", "content", "metadata", "sub_items",
    "sub_sections", "subsections", "image_urls", "images", "order",
    "number", "options",
}


def _hoist_nested_sections(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Pop type-keyed nested dicts out of section dicts into sibling sections."""
    out: List[Dict[str, Any]] = []
    hoist_count = 0
    for sec in sections:
        if not isinstance(sec, dict):
            continue
        out.append(sec)
        for key in list(sec.keys()):
            if key in _STANDARD_SECTION_KEYS or key not in TYPE_CATALOG:
                continue
            val = sec.pop(key)
            vals = val if isinstance(val, list) else [val]
            for v in vals:
                if not isinstance(v, dict):
                    continue
                if not (v.get("content") or v.get("sub_items") or v.get("title")):
                    continue
                v.setdefault("type", key)
                v.setdefault("title", v.get("id") or "")
                out.append(v)
                hoist_count += 1
    if hoist_count:
        logger.info(f"[Hoist] Rescued {hoist_count} section(s) trapped inside sibling dicts")
    return out


# ─────────────────────────────────────────────────────────────────────────────
# HEADING-LEVEL HIERARCHY — re-nest unnumbered Social Science textbooks
#
# For textbooks that have NO section numbers (Social Science, History, Geography)
# the only nesting signal is the markdown heading level in source_md:
#   # (H1) = top-level section
#   ## (H2) = sub-section of the immediately preceding H1
#   ### (H3) = sub-section of the immediately preceding H2
#
# The LLM is told to use sub_sections[] for these (Rule 17), but sometimes
# outputs a flat list. This post-processor rebuilds the correct nesting from
# source_md heading levels as a safety net.
# ─────────────────────────────────────────────────────────────────────────────

def _build_heading_level_map(source_md: str) -> Dict[str, int]:
    """
    Scan source_md and return a dict: {normalised_heading_title -> heading_level (1/2/3)}.
    Only considers H1/H2/H3 headings. H4+ are too granular to nest automatically.
    Skips headings that carry a section number (those are handled by id-based nesting).
    """
    level_map: Dict[str, int] = {}
    for line in source_md.splitlines():
        m = re.match(r'^(#{1,3})\s+(.*)', line.strip())
        if not m:
            continue
        hashes, raw_title = m.group(1), m.group(2).strip()
        level = len(hashes)
        # Skip if the title starts with a section number (already handled by id-nesting)
        if re.match(r'^[A-Za-z]?\d+[\.\d]*\s', raw_title):
            continue
        # Strip bold/italic markdown around the title
        clean = re.sub(r'[*_`]', '', raw_title).strip()
        if clean:
            level_map[_norm_heading_text(clean)] = level
    return level_map


# Section types that should NEVER be nested as children of another section
# (they are always top-level regardless of heading level)
_ALWAYS_TOP_LEVEL_TYPES = {
    "learning_objectives", "summary", "glossary", "exercise", "unit_exercise",
    "reference_books", "ict_corner", "do_you_know", "activity",
}

# Section types that ARE safe to nest as sub_sections
_NESTABLE_TYPES = {"section", "other", None, ""}


def _nest_sections_by_heading_level(
    sections: List[Dict[str, Any]],
    source_md: str,
) -> List[Dict[str, Any]]:
    """
    For unnumbered textbooks (Social Science / History / Geography), rebuild
    the H1→H2→H3 hierarchy from source_md heading levels.

    Only runs when:
      - source_md is provided
      - The section list is mostly FLAT (≥ 2 consecutive H2 titles with no nesting)
      - The heading level map has mixed H1/H2 headings

    Safe for numbered textbooks: if all sections have numeric ids the level_map
    will be empty and this function is a no-op.
    """
    if not source_md or not sections:
        return sections

    level_map = _build_heading_level_map(source_md)
    if not level_map:
        return sections

    # Check how many H2 titles exist in the flat list (signals unnumbered book)
    h2_titles_in_list = sum(
        1 for s in sections
        if level_map.get(_norm_heading_text(str(s.get("title") or ""))) == 2
    )
    if h2_titles_in_list < 2:
        return sections  # nothing to nest

    # Also skip if sections already have sub_sections (LLM did nest correctly)
    already_nested = sum(1 for s in sections if s.get("sub_sections"))
    if already_nested >= h2_titles_in_list // 2:
        return sections

    logger.info(
        f"[HeadingNest] Re-nesting {h2_titles_in_list} H2 section(s) "
        f"under their H1 parents (unnumbered textbook)"
    )

    result: List[Dict[str, Any]] = []
    h1_parent: Optional[Dict[str, Any]] = None  # current open H1
    h2_parent: Optional[Dict[str, Any]] = None  # current open H2

    for sec in sections:
        stype = sec.get("type") or ""
        title = str(sec.get("title") or "")
        norm = _norm_heading_text(title)
        level = level_map.get(norm)

        # Always-top-level types skip nesting regardless of heading level
        if stype in _ALWAYS_TOP_LEVEL_TYPES:
            result.append(sec)
            h1_parent = None
            h2_parent = None
            continue

        if level == 1 or level is None:
            # H1 or unrecognised → top-level.
            # Exception: Roman-numeral exercise sub-groups (I., II., III. …) should
            # be kept top-level but must NOT become h1_parent — they will be merged
            # into the Evaluation section's sub_items by _collapse_orphan_exercise_groups.
            result.append(sec)
            # ONLY a real H1 may adopt the H2s that follow. A title the source
            # never printed as a heading (level is None) is usually a sentence
            # the model promoted to a section — and letting it open a parent made
            # it swallow the real sections after it: in one Social Science unit
            # the line "Various types of lands gifted by the Chola kings..."
            # became a top-level section and took Monuments, Coins, Religious
            # Literature, Secular Literature and Books/Biographies with it, all
            # of which belong under "Sources". Leaving the open H1 alone keeps
            # those attached to their real parent.
            if level == 1 and not _ROMAN_SUB_EXERCISE_RE.match(str(sec.get("title") or "")):
                h1_parent = sec
                h2_parent = None

        elif level == 2:
            # H2 → child of the current H1 parent (if there is one)
            if h1_parent is not None and stype in _NESTABLE_TYPES:
                h1_parent.setdefault("sub_sections", []).append(sec)
                h2_parent = sec
            else:
                # No open H1 → fall back to top-level
                result.append(sec)
                h2_parent = sec

        elif level == 3:
            # H3 → child of the current H2 parent
            if h2_parent is not None and stype in _NESTABLE_TYPES:
                h2_parent.setdefault("sub_sections", []).append(sec)
            elif h1_parent is not None and stype in _NESTABLE_TYPES:
                # No H2 open → attach to H1
                h1_parent.setdefault("sub_sections", []).append(sec)
            else:
                result.append(sec)

    return result


_ROMAN_SUB_EXERCISE_RE = re.compile(
    r'^(?:[IVXLC]+)\s*[.\-:]\s+',   # "I.", "II.", "III." etc. at the start of title
    re.IGNORECASE,
)


def _collapse_orphan_exercise_groups(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    When the LLM emitted Evaluation / Unit Exercise sub-exercises (I, II, III…)
    as separate top-level sections instead of sub_items of the Evaluation section,
    this function merges them back.

    Detection heuristic: if there is an exercise/unit_exercise section whose
    sub_items are empty (or missing), AND it is immediately followed by sections
    whose titles match "I. …", "II. …", "III. …" — pull those siblings into the
    exercise section's sub_items.
    """
    if not sections:
        return sections

    result: List[Dict[str, Any]] = []
    i = 0
    while i < len(sections):
        sec = sections[i]
        stype = sec.get("type", "")

        # Look for an evaluation/exercise section with empty sub_items
        is_eval = stype in ("exercise", "unit_exercise") or (
            re.sub(r'[^a-z]', '', (sec.get("title") or "").lower()) == "evaluation"
        )
        sub_items = sec.get("sub_items") or []
        all_empty = all(not (si.get("content") or "").strip() for si in sub_items)

        if is_eval and (not sub_items or all_empty):
            # Peek ahead: collect consecutive Roman-numeral exercise headings
            orphans: List[Dict[str, Any]] = []
            j = i + 1
            while j < len(sections):
                candidate = sections[j]
                c_title = str(candidate.get("title") or "")
                if _ROMAN_SUB_EXERCISE_RE.match(c_title):
                    orphans.append(candidate)
                    j += 1
                else:
                    break

            if orphans:
                logger.info(
                    f"[ExerciseCollapse] Merging {len(orphans)} orphan exercise group(s) "
                    f"into '{sec.get('title')}' sub_items"
                )
                new_sub_items = []
                for idx, orphan in enumerate(orphans, 1):
                    # Combine orphan heading text + its own sub_items content
                    orphan_content = orphan.get("content") or ""
                    orphan_title = orphan.get("title") or ""
                    # Merge orphan's own sub_items into the content text
                    orphan_sub = orphan.get("sub_items") or []
                    if orphan_sub:
                        sub_text = "\n".join(
                            f"{si.get('number', '')}. {si.get('content', '')}"
                            for si in orphan_sub
                        )
                        orphan_content = (orphan_content + "\n\n" + sub_text).strip()
                    full_content = (
                        (orphan_title + "\n\n" + orphan_content).strip()
                        if orphan_title and orphan_content != orphan_title
                        else (orphan_title or orphan_content)
                    )
                    new_sub_items.append({
                        "number": str(idx),
                        "content": full_content,
                        "options": [],
                    })
                sec["sub_items"] = new_sub_items
                result.append(sec)
                i = j  # skip the orphans we just consumed
                continue

        result.append(sec)
        i += 1

    return result




# SECTION-ID REALIGNMENT — trust the textbook headings, not the LLM
#
# LLMs sometimes INVENT a section number for an unnumbered heading (e.g. the
# textbook prints "## Highest Common Factor of three numbers" with no number
# between 2.3 and 2.4, and the LLM assigns it "2.4") and then renumber every
# following real section to keep their sequence consistent. This corrupts the
# whole hierarchy. The fix is deterministic: match each extracted section
# title against the ACTUAL headings in the source markdown and take the
# number (or absence of one) from the textbook.

# A printed section number is normally dotted digits ("2.4", "2.4.1"), but the
# NCERT appendix chapters number every heading with a letter prefix instead
# ("A2.1 Introduction", "A2.3 Some Illustrations", "A1.3.2"). Both forms must be
# recognised here: an unrecognised number is cleared by realign_section_ids,
# which leaves the whole appendix id-less and the hierarchy builder with nothing
# to nest by, so every example falls into whichever section opened first.
_SECNUM = r'[A-Za-z]?\d+(?:\.\d+)+'

_SRC_HEADING_RE = re.compile(
    r'^#{1,6}\s*\**\s*(?:(' + _SECNUM + r')\s*[\.\):]*\s*)?(.*?)[\s\*]*$'
)

# Standalone bold lines that carry a section number act as headings in some
# OCR outputs (e.g. "**2.2.1 Generalised form of Euclid's division lemma**")
_BOLD_HEADING_RE = re.compile(
    r'^\*\*\s*(' + _SECNUM + r')\s*[\.\):]*\s*([^*]+?)\s*\*\*$'
)


def _norm_heading_text(text: str) -> str:
    """Normalize a heading/title for fuzzy comparison."""
    text = text.replace('$', '').lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def parse_source_headings(source_md: str) -> List[Tuple[Optional[str], str]]:
    """Ordered (section_number_or_None, normalized_title) for every md heading."""
    headings: List[Tuple[Optional[str], str]] = []
    for line in source_md.split('\n'):
        s = line.strip()
        if not s.startswith('#'):
            m_b = _BOLD_HEADING_RE.match(s)
            if m_b:
                headings.append((m_b.group(1), _norm_heading_text(m_b.group(2))))
            continue
        m = _SRC_HEADING_RE.match(s)
        if not m:
            continue
        num = m.group(1)
        title = _norm_heading_text(m.group(2) or "")
        if not title and not num:
            continue
        headings.append((num, title))
    return headings


def realign_section_ids(
    sections: List[Dict[str, Any]],
    source_md: str,
) -> List[Dict[str, Any]]:
    """
    Fix LLM-invented / renumbered section ids on a FLAT section list (run
    before hierarchy building):

    - Title matches a NUMBERED textbook heading   → id forced to that number.
    - Title matches an UNNUMBERED textbook heading → id cleared, so the
      section is merged/nested under its parent exactly as printed.
    - Claimed number that doesn't exist anywhere in the source → id cleared.

    Matching walks the source headings with a forward cursor so repeated
    titles resolve in textbook order.
    """
    if not source_md or not sections:
        return sections

    headings = parse_source_headings(source_md)
    if not headings:
        return sections

    valid_nums = {num for num, _ in headings if num}

    # Exact title -> number, but only for titles that name exactly ONE numbered
    # heading. A repeated title ("Glossary", "Thinking about the Poem") tells us
    # nothing about which section a block belongs to.
    _title_hits: Dict[str, set] = {}
    for _num, _t in headings:
        if _num and _t:
            _title_hits.setdefault(_t, set()).add(_num)
    _unique_title_num = {t: next(iter(n)) for t, n in _title_hits.items() if len(n) == 1}
    _NUM_RE = re.compile(r'^(' + _SECNUM + r')')
    cursor = 0
    fixed = cleared = 0

    def _contains(idx: int, title_norm: str) -> bool:
        # Containment fallback with a length-ratio guard, so a short generic
        # heading (e.g. a "Points to Remember" recap line) can never swallow
        # a longer unrelated title and derail the cursor.
        h_title = headings[idx][1]
        if not h_title or len(h_title) < 9 or len(title_norm) < 9:
            return False
        shorter, longer = sorted((h_title, title_norm), key=len)
        return shorter in longer and len(shorter) / len(longer) >= 0.7

    def _find_heading(title_norm: str) -> Optional[int]:
        if not title_norm or len(title_norm) < 3:
            return None
        # Pass 1: EXACT title matches always win (forward-first, then wrap)
        for rng in (range(cursor, len(headings)), range(0, cursor)):
            for j in rng:
                if headings[j][1] == title_norm:
                    return j
        # Pass 2: guarded containment (forward-first, then wrap)
        for rng in (range(cursor, len(headings)), range(0, cursor)):
            for j in rng:
                if _contains(j, title_norm):
                    return j
        return None

    for sec in sections:
        sid = str(sec.get("id") or "").strip()
        title = str(sec.get("title") or "").strip()

        # Only type=="section" gets title-based realignment: a number on an
        # "Example 2.4" is an example number, not a section number, and
        # rewriting it from a heading match would corrupt it.
        #
        # But EVERY type gets its claimed number validated. Skipping non-section
        # types entirely is why fabricated numbers survived: the LLM emits
        # subsections as type="other", so invented ids like "2.6.2" and "2.7.2"
        # — numbers that appear nowhere in the textbook — were never checked,
        # and neither were the real ones.
        if sec.get("type") != "section":
            m_other = _NUM_RE.match(sid)
            claimed_other = m_other.group(1) if m_other else None

            # An UNAMBIGUOUS exact title match outranks the model's own number.
            # It labelled "Modulo operations" 2.5.2 when the textbook prints it
            # as 2.5.3 — which both mislabels that section and makes the real
            # 2.5.3 look missing to every downstream check.
            other_title = re.sub(r'^\s*' + _SECNUM + r'\s*', '', title)
            exact_num = _unique_title_num.get(_norm_heading_text(other_title))
            if exact_num and exact_num != claimed_other:
                sec["id"] = exact_num
                fixed += 1
            elif claimed_other and claimed_other not in valid_nums:
                sec["id"] = ""
                cleared += 1
            continue

        m_id = _NUM_RE.match(sid)
        m_title = re.match(r'^\s*(' + _SECNUM + r')\s*[\.\):]?\s*(.*)$', title)
        claimed = m_id.group(1) if m_id else (m_title.group(1) if m_title else None)
        bare_title = m_title.group(2).strip() if m_title else title
        if not bare_title:
            # Mangled id like "2.4 Fundamental Theorem of Arithmetic" with an
            # empty title — recover the title text from the id itself
            m_id_full = re.match(r'^(' + _SECNUM + r')\s+(\S.*)$', sid)
            if m_id_full:
                bare_title = m_id_full.group(2).strip()
        title_norm = _norm_heading_text(bare_title)

        j = _find_heading(title_norm)
        if j is not None:
            src_num = headings[j][0]
            if src_num:
                if claimed != src_num:
                    fixed += 1
                sec["id"] = src_num
                if not (sec.get("title") or "").strip() and bare_title:
                    sec["title"] = bare_title
            else:
                # Unnumbered in the textbook — never give it a number
                if claimed:
                    cleared += 1
                sec["id"] = ""
                sec["title"] = bare_title
            if j >= cursor:
                cursor = j + 1
            continue

        # Title not found in source headings — number can't be verified.
        # Clear ids whose number doesn't exist anywhere in the textbook.
        if claimed and claimed not in valid_nums:
            sec["id"] = ""
            sec["title"] = bare_title
            cleared += 1
        elif claimed:
            # Number is real but title unverifiable — keep it, normalized to
            # the bare number so dedup and hierarchy building work
            sec["id"] = claimed
            if not (sec.get("title") or "").strip() and bare_title:
                sec["title"] = bare_title

    if fixed or cleared:
        logger.info(f"[ID Realign] {fixed} id(s) corrected from source headings, "
              f"{cleared} invented id(s) cleared")
    return sections


# Body types that carry a book's narrative. Back matter (summary, glossary,
# exercise, ict_corner, …) is never nested under a content section — it belongs
# to the unit, not to whichever section happened to precede it.
_NESTABLE_TYPES = {"section", "other"}


def _source_heading_depths(source_md: str) -> Dict[str, int]:
    """normalized heading title -> markdown depth (# = 1, ## = 2, …).

    First occurrence wins. Used to rebuild a hierarchy for books whose headings
    carry no section numbers, where the numeric builder has nothing to work with.
    """
    depths: Dict[str, int] = {}
    for line in source_md.split('\n'):
        s = line.strip()
        if not s.startswith('#'):
            continue
        m = re.match(r'^(#{1,6})\s+(.*)$', s)
        if not m:
            continue
        title = _norm_heading_text(
            re.sub(r'^\s*[A-Za-z]?\d+(?:\.\d+)*\s*[\.\):]?\s*', '', m.group(2)))
        if title and title not in depths:
            depths[title] = len(m.group(1))
    return depths


def _source_label_lines(source_md: str) -> set:
    """Normalized short lines that stand alone in the source but are NOT headings.

    This is the signature of a diagram label the OCR lifted out of an image
    ("Classification of Sources" / "Primary Sources" / "Secondary Sources"),
    which the extractor then mistakes for a section heading.
    """
    labels = set()
    for line in source_md.split('\n'):
        s = line.strip()
        if not s or s.startswith('#') or s.startswith('|') or s.startswith('!['):
            continue
        if len(s) > 60 or s.endswith(('.', ':', ';', ',', '?', '!')):
            continue          # a sentence, not a label
        norm = _norm_heading_text(s)
        if norm and 1 <= len(norm.split()) <= 6:
            labels.add(norm)
    return labels


def fold_non_heading_sections(
    sections: List[Dict[str, Any]],
    source_md: str,
) -> List[Dict[str, Any]]:
    """Demote invented sections to sub_items of the real section above them.

    A label the OCR lifted out of a diagram ("Classification of Sources",
    "Primary Sources") is not a heading in the textbook, but the extractor
    happily turns it into a top-level section — which then claims the text that
    follows it. Folding the label into its real parent keeps the text and
    removes the phantom sibling.
    """
    if not source_md or not sections:
        return sections

    depths = _source_heading_depths(source_md)
    if not depths:
        return sections

    labels = _source_label_lines(source_md)

    result: List[Dict[str, Any]] = []
    folded = 0
    for sec in sections:
        stype = sec.get("type", "")
        sid = str(sec.get("id") or "").strip()
        title = str(sec.get("title") or "").strip()
        norm_title = _norm_heading_text(title)
        is_heading = norm_title in depths
        # Positive evidence required: the title must actually appear in the book
        # as a bare label. A title the model invented (present nowhere in the
        # source) stays a section — demoting it would be a guess.
        is_label = norm_title in labels

        # A numbered id means the textbook really numbered it — leave it alone.
        # Prose in `id` is the phantom's own signature (the extractor copies the
        # label into both fields), so it must not disqualify the fold.
        numbered = bool(re.match(r'^[A-Za-z]?\d', sid))

        if (result and stype in _NESTABLE_TYPES and title and not numbered
                and not is_heading and is_label
                and result[-1].get("type") in _NESTABLE_TYPES):
            parent = result[-1]
            content = (sec.get("content") or "").strip()
            item = {"number": title, "content": content}
            parent.setdefault("sub_items", []).append(item)

            # Carry the label's own nested payload across. Reducing the section
            # to {number, content} threw away its sub_items and sub_sections —
            # on one Social Science unit that silently lost 9,523 of 17,063
            # characters, because those three labels held their text in nested
            # question lists rather than in `content`.
            for child_item in sec.get("sub_items") or []:
                parent["sub_items"].append(child_item)
            child_secs = sec.get("sub_sections") or sec.get("subsections") or []
            if child_secs:
                parent.setdefault("sub_sections", []).extend(child_secs)
            for url in sec.get("image_urls") or []:
                parent.setdefault("image_urls", [])
                if url not in parent["image_urls"]:
                    parent["image_urls"].append(url)
            folded += 1
            continue

        result.append(sec)

    if folded:
        logger.info(f"[Hierarchy] Folded {folded} non-heading label(s) into their parent section")
    return result


def nest_unnumbered_sections(
    sections: List[Dict[str, Any]],
    source_md: str,
) -> List[Dict[str, Any]]:
    """Nest body sections by markdown heading depth (# > ## > ###).

    Only runs for books with no numbered headings at all — where the numeric
    builder leaves everything flat. A section attaches to the nearest preceding
    section of smaller depth, so "## Inscriptions" lands under "# Sources".
    """
    if not source_md or not sections:
        return sections

    if any(re.match(r'^' + _SECNUM + r'$', str(s.get("id") or "").strip()) for s in sections):
        return sections   # numbered book — the numeric builder owns the tree

    depths = _source_heading_depths(source_md)
    if not depths:
        return sections

    result: List[Dict[str, Any]] = []
    stack: List[Tuple[int, Dict[str, Any]]] = []
    nested = 0

    for sec in sections:
        depth = depths.get(_norm_heading_text((sec.get("title") or "").strip()))

        if sec.get("type") not in _NESTABLE_TYPES:
            # Back matter belongs to the unit: it goes top level and closes the
            # open path, so nothing after it nests under a stale parent.
            stack = []
            result.append(sec)
            continue

        if depth is None:
            # Body content with no matching heading (a gap fill, say). Keep it
            # where the book put it — inside whatever section is open — but do
            # not disturb the path, or the next real heading loses its parent.
            if stack:
                stack[-1][1].setdefault("sub_sections", []).append(sec)
                nested += 1
            else:
                result.append(sec)
            continue

        while stack and stack[-1][0] >= depth:
            stack.pop()

        if stack:
            stack[-1][1].setdefault("sub_sections", []).append(sec)
            nested += 1
        else:
            result.append(sec)
        stack.append((depth, sec))

    if nested:
        logger.info(f"[Hierarchy] Nested {nested} unnumbered section(s) by heading depth")
    return result


def _raw_source_heading_titles(source_md: str) -> Dict[str, str]:
    """number -> RAW (original-cased) heading title, first occurrence wins.

    Parallel to parse_source_headings(), but keeps the un-normalized title text
    so a recovered parent shows the real textbook heading (e.g. "NEWTON'S LAWS
    OF MOTION") rather than the lower-cased comparison form.
    """
    raw: Dict[str, str] = {}
    for line in source_md.split('\n'):
        s = line.strip()
        num = title = None
        if s.startswith('#'):
            m = _SRC_HEADING_RE.match(s)
            if m and m.group(1):
                num, title = m.group(1), (m.group(2) or "")
        else:
            m_b = _BOLD_HEADING_RE.match(s)
            if m_b:
                num, title = m_b.group(1), (m_b.group(2) or "")
        if num and num not in raw:
            raw[num] = title.strip()
    return raw


def insert_missing_parent_sections(
    sections: List[Dict[str, Any]],
    source_md: str,
) -> List[Dict[str, Any]]:
    """Recover numbered PARENT sections the LLM dropped while keeping children.

    The textbook prints '1.4 NEWTON'S LAWS OF MOTION' with sub-sections
    1.4.1..1.4.8, but the LLM sometimes emits only 1.4.1..1.4.8. Without a '1.4'
    parent the deterministic hierarchy builder has nothing to nest them under,
    so every child surfaces as a top-level section.

    We scan the flat, id-realigned list; whenever a numbered section's ancestor
    prefix (e.g. '1.4' for '1.4.1', or both '1.4' and '1.4.2' for '1.4.2.1') is
    absent from the list but present as a real heading in the source markdown,
    we synthesize a placeholder parent (empty content, source title) and insert
    it just before its first child. Parents with no evidence in the source are
    never invented.

    Must run on the cleaned/deduped list right before the hierarchy builder —
    after the empty-section filters (which would otherwise delete a title-only
    parent) and before nesting (which will populate its sub_sections).
    """
    if not source_md or not sections:
        return sections

    raw_titles = _raw_source_heading_titles(source_md)
    if not raw_titles:
        return sections

    _num_only = re.compile(r'^(' + _SECNUM + r')$')

    def _ancestors(num: str) -> List[str]:
        parts = num.split('.')
        # A section prefix has >= 2 components; the bare chapter number is not one.
        return ['.'.join(parts[:i]) for i in range(2, len(parts))]

    present = {
        m.group(1)
        for sec in sections
        if sec.get("type") == "section"
        and (m := _num_only.match(str(sec.get("id") or "").strip()))
    }

    result: List[Dict[str, Any]] = []
    synthesized: set = set()
    for sec in sections:
        if sec.get("type") == "section":
            m = _num_only.match(str(sec.get("id") or "").strip())
            if m:
                for anc in _ancestors(m.group(1)):
                    if anc in present or anc in synthesized or anc not in raw_titles:
                        continue
                    result.append({
                        "type": "section",
                        "id": anc,
                        "title": raw_titles[anc],
                        "content": "",
                        "metadata": {"synthesized_parent": True},
                    })
                    synthesized.add(anc)
        result.append(sec)

    if synthesized:
        logger.info(f"[Parent Recovery] Inserted {len(synthesized)} missing numbered "
              f"parent section(s) from source headings: {sorted(synthesized)}")
    return result


# A sub_item whose "number" is a dotted section number ("1.4.1") rather than a
# plain list index ("1.", "2.") — i.e. a subsection the LLM trapped in a flat
# sub_items list instead of emitting as a nested section.
_SUBITEM_SECNUM_RE = re.compile(r'^\s*(' + _SECNUM + r')\s*\.?\s*$')


def promote_numbered_subitems_to_sections(
    sections: List[Dict[str, Any]],
    source_md: str,
) -> List[Dict[str, Any]]:
    """Promote dotted-numbered sub_items into proper child `section` objects.

    The LLM sometimes returns a numbered parent (e.g. 1.4 NEWTON'S LAWS OF
    MOTION) whose subsections it captured as a flat ``sub_items`` list keyed by
    section number ({"number": "1.4.1", "content": ...}) instead of as nested
    sections. Left alone, that prose stays trapped as bare {number, content}
    list items and never appears in the section hierarchy.

    For every numbered section, each sub_item whose ``number`` is a descendant
    section number (starts with the parent's number) is pulled out as a sibling
    section inserted right after the parent in the flat list — so the hierarchy
    builder nests it correctly. Plain list items ("1.", "2.", bullets) that
    follow a promoted subsection are folded into that subsection's content (they
    are the printed list under it, e.g. the applications under "Application of
    Torque"). Titles are recovered from the source headings when available.

    Runs on the flat list right before the hierarchy builder.
    """
    if not sections:
        return sections

    raw_titles = _raw_source_heading_titles(source_md) if source_md else {}
    result: List[Dict[str, Any]] = []
    promoted_total = 0

    for sec in sections:
        result.append(sec)
        if sec.get("type") != "section":
            continue
        m = re.match(r'^(' + _SECNUM + r')', str(sec.get("id") or "").strip())
        if not m:
            continue
        parent_num = m.group(1)
        subs = sec.get("sub_items") or []
        if not subs:
            continue

        def _is_descendant(si: Dict[str, Any]) -> Optional[str]:
            mm = _SUBITEM_SECNUM_RE.match(str(si.get("number") or ""))
            if mm and mm.group(1).startswith(parent_num + "."):
                return mm.group(1)
            return None

        if not any(isinstance(si, dict) and _is_descendant(si) for si in subs):
            continue

        kept_items: List[Any] = []      # sub_items that remain on the parent
        new_children: List[Dict[str, Any]] = []
        current_child: Optional[Dict[str, Any]] = None

        for si in subs:
            if not isinstance(si, dict):
                kept_items.append(si)
                continue
            num = _is_descendant(si)
            content = (si.get("content") or "").strip()
            if num:
                current_child = {
                    "type": "section",
                    "id": num,
                    "title": raw_titles.get(num, ""),
                    "content": content,
                    "metadata": {"recovered": "subitem_promotion"},
                }
                new_children.append(current_child)
                promoted_total += 1
            elif current_child is not None and content:
                # Plain list item belongs to the subsection it appears under.
                label = str(si.get("number") or "").strip()
                line = f"{label} {content}".strip() if label else content
                current_child["content"] = (
                    (current_child["content"] + "\n\n" + line).strip()
                    if current_child["content"] else line
                )
            else:
                kept_items.append(si)

        if kept_items:
            sec["sub_items"] = kept_items
        else:
            sec.pop("sub_items", None)
        result.extend(new_children)

    if promoted_total:
        logger.info(f"[Subitem Promotion] Promoted {promoted_total} numbered "
              f"sub_item(s) into proper child sections")
    return result


def _promote_subitems_in_place(
    sec: Dict[str, Any],
    raw_titles: Dict[str, str],
    promoted_texts: List[str],
) -> None:
    """Promote a numbered section's dotted-number sub_items into nested
    sub_sections, in place, recursing through the whole subtree.

    Unlike promote_numbered_subitems_to_sections (which emits flat siblings for
    the hierarchy builder), this attaches the promoted children directly under
    the section they belong to — for use on an already-nested, finished tree.
    """
    if not isinstance(sec, dict):
        return

    m = re.match(r'^(' + _SECNUM + r')', str(sec.get("id") or "").strip())
    subs = sec.get("sub_items") or []
    if m and subs:
        parent_num = m.group(1)

        def _desc(si: Dict[str, Any]) -> Optional[str]:
            mm = _SUBITEM_SECNUM_RE.match(str(si.get("number") or ""))
            return mm.group(1) if (mm and mm.group(1).startswith(parent_num + ".")) else None

        if any(isinstance(si, dict) and _desc(si) for si in subs):
            kept: List[Any] = []
            children: List[Dict[str, Any]] = []
            cur: Optional[Dict[str, Any]] = None
            for si in subs:
                if not isinstance(si, dict):
                    kept.append(si)
                    continue
                num = _desc(si)
                content = (si.get("content") or "").strip()
                if num:
                    cur = {
                        "type": "section",
                        "id": num,
                        "title": raw_titles.get(num, ""),
                        "content": content,
                        "metadata": {"recovered": "subitem_promotion"},
                    }
                    children.append(cur)
                    promoted_texts.append(content)
                elif cur is not None and content:
                    label = str(si.get("number") or "").strip()
                    line = f"{label} {content}".strip() if label else content
                    cur["content"] = (
                        (cur["content"] + "\n\n" + line).strip()
                        if cur["content"] else line
                    )
                    promoted_texts.append(content)
                else:
                    kept.append(si)

            # Nest promoted children by dotted prefix (usually all direct).
            nested: List[Dict[str, Any]] = []
            stack: List[Dict[str, Any]] = []
            for ch in children:
                n = ch["id"]
                while stack and not n.startswith(stack[-1]["id"] + "."):
                    stack.pop()
                if stack:
                    stack[-1].setdefault("sub_sections", []).append(ch)
                else:
                    nested.append(ch)
                stack.append(ch)

            sec["sub_sections"] = (sec.get("sub_sections") or []) + nested
            if kept:
                sec["sub_items"] = kept
            else:
                sec.pop("sub_items", None)

    for child in sec.get("sub_sections") or []:
        _promote_subitems_in_place(child, raw_titles, promoted_texts)


# Human-readable default titles for non-numbered front/back-matter section
# types that the LLM often emits with a null/empty title.
_DEFAULT_TYPE_TITLES = {
    "introduction":        "Introduction",
    "learning_objectives": "Learning Objectives",
    "learning_outcomes":   "Learning Outcomes",
    "points_to_remember":  "Points to Remember",
    "summary":             "Summary",
    "glossary":            "Glossary",
    "reference_books":     "Reference Books",
}


def _fill_default_titles(nodes: List[Dict[str, Any]]) -> int:
    """Give known front/back-matter section types a title when it's missing.

    Only fills blanks — an existing title is never overwritten. Recurses so
    nested nodes are covered too.
    """
    filled = 0
    for n in nodes:
        if isinstance(n, dict):
            stype = str(n.get("type") or "").strip().lower()
            if stype in _DEFAULT_TYPE_TITLES and not (n.get("title") or "").strip():
                n["title"] = _DEFAULT_TYPE_TITLES[stype]
                filled += 1
            if n.get("sub_sections"):
                filled += _fill_default_titles(n["sub_sections"])
    return filled


def normalize_section_hierarchy(
    structured_data: Dict[str, Any],
    source_md: str = "",
) -> Dict[str, Any]:
    """Final, idempotent guarantee that numbered subsections are nested.

    Later pipeline stages (verification re-extraction, gap-fill) can re-attach a
    numbered section's children as a flat ``sub_items`` list keyed by section
    number ({"number": "1.4.1", ...}) instead of nested sections — undoing the
    promotion done during initial structuring. Run this on the FINISHED tree
    (after verification, before enrichment/publish) to re-promote them into
    proper child sections and drop the duplicate top-level orphans that carry
    the same content. Safe to run repeatedly.
    """
    if not isinstance(structured_data, dict):
        return structured_data

    raw_titles = _raw_source_heading_titles(source_md) if source_md else {}
    key = "chapters" if structured_data.get("chapters") else "units"

    for unit in structured_data.get(key, []) or []:
        secs = unit.get("sections")
        if not isinstance(secs, list):
            continue

        promoted_texts: List[str] = []
        for s in secs:
            _promote_subitems_in_place(s, raw_titles, promoted_texts)

        # Give introduction / learning_objectives / other front-matter types a
        # human-readable title when the LLM left it null.
        titled = _fill_default_titles(secs)
        if titled:
            logger.info(f"[Hierarchy Normalize] Filled {titled} missing section title(s)")

        # Drop id-less top-level orphans whose content now lives in a promoted
        # child (e.g. the "Seesaw"/"Steering Wheel"/"1.4.8 …" duplicates that a
        # gap-filler emitted alongside the sub_items).
        if promoted_texts:
            blob = re.sub(r'\s+', ' ', "\n".join(promoted_texts)).lower()
            kept_secs = []
            dropped = 0
            for s in secs:
                sid = str(s.get("id") or "").strip()
                content = re.sub(r'\s+', ' ', str(s.get("content") or "")).strip().lower()
                if (not sid) and len(content) > 40 and content[:60] in blob:
                    dropped += 1
                    continue
                kept_secs.append(s)
            if dropped:
                secs = kept_secs
                unit["sections"] = secs
                logger.info(f"[Hierarchy Normalize] Dropped {dropped} duplicate orphan section(s)")

        # This is the LAST stage that writes section ids, so it is also where the
        # English invariants have to be re-applied — verification re-extraction
        # can split a story back apart at its 'Oral Comprehension Check'
        # headings and drop the title off it, and _promote_subitems /
        # _fill_default_titles above can put a number or a title back into id.
        try:
            from section_types import (merge_split_english_readings,
                                       strip_english_section_ids,
                                       title_untitled_english_readings)
            subject = unit.get("subject") or structured_data.get("subject")
            secs = merge_split_english_readings(secs, subject)
            unit["sections"] = secs
            title_untitled_english_readings(secs, subject, unit.get("title"))
            strip_english_section_ids(secs, subject)
        except ImportError:
            subject = unit.get("subject") or structured_data.get("subject")

        # The opening text under the chapter heading is the Introduction, not a
        # section named after the unit (see name_unit_intro).
        secs = name_unit_intro(secs, str(unit.get("title") or ""), subject)
        unit["sections"] = secs

        # Re-assign reading-order indices across the whole tree (pre-order).
        counter = [0]

        def _order(nodes: List[Dict[str, Any]]) -> None:
            for n in nodes:
                counter[0] += 1
                n["order"] = counter[0]
                if n.get("sub_sections"):
                    _order(n["sub_sections"])

        _order(secs)

    return structured_data


_SOLUTION_LABEL_RE = re.compile(
    r'(?im)^\s*(?:#{1,6}\s*)?\*{0,2}solutions?\*{0,2}\s*[:.]?\s*'
)


def _split_example_solution(content: str) -> Tuple[str, str]:
    """Separate a labelled worked solution from an example's question text.

    OCR emits both ``**Solution** text`` and ``# **Solutions**``.  The
    extractor must retain either form rather than treating the solution as a
    new, unrelated section or dropping it during cleanup.
    """
    match = _SOLUTION_LABEL_RE.search(content)
    if not match:
        return content.strip(), ""
    return content[:match.start()].strip(), content[match.end():].strip()


# ── Discovery reconciliation (source-grounded) ────────────────────────────────

# A markdown heading of any depth. Every OCR'd textbook produces these, whether
# its sections are numbered (maths/science) or named (English literature).
_ANY_HEADING_RE = re.compile(r'(?m)^[ \t]{0,3}#{1,6}[ \t]*(\S[^\n]*?)[ \t]*#*[ \t]*$')
# A numbered heading, e.g. "## 2.5 Modular Arithmetic". Absent by design in
# English readers and in many CBSE/NCERT chapters — never require it.
_NUMBERED_HEADING_RE = re.compile(
    r'(?m)^[ \t]{0,3}#{1,6}[ \t]*\**[ \t]*(' + _SECNUM + r')[ \t]+([^\n]*?)[ \t]*\**[ \t]*$'
)


# Heading text -> section type, for books that name their sections instead of
# numbering them. Ordered: the first match wins, so specific patterns precede
# generic ones. Types must exist in TYPE_CATALOG or the prompt rule is dropped.
_HEADING_TYPE_RULES = [
    (r"glossar|word\s*meaning|vocabular|homophone|synonym|antonym", "vocabulary"),
    (r"thinking\s+about\s+(the\s+)?(text|poem)|comprehension|question|exercise"
     r"|think\s+about\s+it|evaluation|assessment", "exercise"),
    (r"thinking\s+about\s+language|grammar|tense|clause|preposition|negative"
     r"|metaphor|reported\s+speech|active\s+and\s+passive", "grammar"),
    (r"^writing\b|letter\s*writing|paragraph\s*writing|report\s*writing", "writing_task"),
    (r"^listening\b", "listening"),
    (r"^speaking\b|talk\s+about", "speaking"),
    (r"^activity\b|experiment|lab\s*work|project", "activity"),
    (r"summary|points\s+to\s+remember|what\s+we\s+have\s+done", "summary"),
    (r"suggested\s+reading|reference\s+book|further\s+reading", "reference_books"),
    (r"^introduction\b|before\s+you\s+read|in\s+this\s+lesson", "introduction"),
    (r"map\s*work", "map_work"),
    (r"timeline", "timeline"),
    (r"do\s+you\s+know|more\s+to\s+know", "do_you_know"),
    (r"^example\b", "example"),
    (r"^theorem\b", "theorem"),
    (r"^definition\b", "definition"),
]

# Headings that carry no structure: figure captions, page furniture, stray numbers.
_HEADING_NOISE_RE = re.compile(
    r"(?i)^\s*(fig\.?\s*\d|table\s*\d|page\s*\d|\d+\s*$|[ivxlc]+\s*$|[^\w]*$)"
)


# ── Publisher back matter ─────────────────────────────────────────────────────
# The last unit of a split textbook carries the pages the publisher appends to
# the book: the author list, the advisory committee, the reviewers, the art and
# EMIS teams. Every one of those pages prints a person's name in bold on its own
# line, which iter_source_headings reports as a heading and the audit then
# DEMANDS as a section — a Class 7 Science unit failed its audit on 23 headings
# named "Dr. G. Ramesh", "N. Balusamy", "S. Surenthiran", and the repair loop
# dutifully created a section for each. Half the unit's sections were the
# printing credits.
#
# This is not pedagogical back matter (Glossary, Summary, References — those are
# real sections with real types). It is the colophon, and it belongs to the BOOK
# rather than to any unit, so it is excluded from the audit's heading census and
# dropped from the extraction.
# Colophon headings that can OPEN the credits block. Strong phrases only: the
# first one found in the tail of the document marks where the book's own
# content stops, so a false positive here would truncate real teaching content.
_CREDITS_ANCHORS = (
    "authors list", "author list", "authors", "author",
    "advisory committee", "academic advisor", "chairperson",
    "reviewers", "reviewer", "subject experts", "subject expert",
    "domain experts", "domain expert", "academic experts",
    "content readers", "content reader",
    "ict coordinators", "ict coordinator",
    "art and design team", "art design team",
    "experts and coordinators", "experts coordinators",
    "emis technology team", "qr code management team",
    "textbook printing", "book printing",
    "this book has been printed on",
)

# Headings that are credits only INSIDE the block. Each is a real word a
# textbook may also use for teaching content ("Illustration", "Typing"), so
# they are never allowed to open the block — only to be recognised once an
# anchor above already has.
_CREDITS_INNER = (
    "illustration", "illustrations", "layout design", "layout",
    "wrapper design", "info graph", "in house qc", "qc",
    "co ordination", "coordination", "typing", "typist", "typists",
    "quality control",
)


def _credits_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (title or "").lower()).strip()


# Top-level types that can carry the opening text of a chapter.
_INTRO_CANDIDATE_TYPES = frozenset({"section", "prose", "other", "introduction", ""})


def _is_intro_title(sec: Dict[str, Any]) -> bool:
    return (_credits_key(str(sec.get("title") or "")) == "introduction"
            or str(sec.get("type") or "").strip().lower() == "introduction")


def name_unit_intro(
    sections: List[Dict[str, Any]],
    unit_title: str,
    subject: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """The text printed under the chapter heading is the unit's Introduction.

    A chapter opens with its name as the first heading and its opening
    paragraphs straight beneath it; the first real section heading comes
    after. The recovery pass (and now and then the model) files that opening
    text as a section NAMED AFTER THE CHAPTER, so a unit shipped with a
    section "RESOURCES AND DEVELOPMENT" inside the unit "RESOURCES AND
    DEVELOPMENT". Everywhere else in the corpus that text is a section titled
    "Introduction" - the avatar lesson, RAG and the frontend all key off it -
    so that is what it becomes here. One that carries nothing (the heading
    alone) is dropped; when the unit already has an Introduction, the opening
    text is folded into it, first, as printed. English is left alone: there
    the section named after the unit IS the reading ("A Letter to God").
    Idempotent.
    """
    if not isinstance(sections, list) or not sections:
        return sections
    if "english" in str(subject or "").lower():
        return sections
    title = str(unit_title or "").strip().strip("*# ").strip()
    key = _credits_key(title)
    if not key or is_placeholder_unit_title(title):
        return sections

    intro = next((sec for sec in sections if isinstance(sec, dict) and _is_intro_title(sec)), None)
    out: List[Dict[str, Any]] = []
    renamed = folded = dropped = 0
    for sec in sections:
        if not isinstance(sec, dict):
            out.append(sec)
            continue
        stype = str(sec.get("type") or "").strip().lower()
        if _credits_key(str(sec.get("title") or "")) != key or stype not in _INTRO_CANDIDATE_TYPES:
            out.append(sec)
            continue

        body = str(sec.get("content") or "").strip()
        children = [c for k in ("sub_sections", "subsections", "sections")
                    for c in (sec.get(k) or []) if isinstance(c, dict)]
        sub_items = list(sec.get("sub_items") or [])
        if not body and not children and not sub_items:
            dropped += 1               # the chapter heading alone - the unit already has it
            continue
        if intro is None:
            sec["title"] = "Introduction"
            sec["type"] = "section"
            intro = sec
            out.append(sec)
            renamed += 1
            continue
        # Fold into the Introduction the unit already has. The chapter's own
        # opening is printed before the "Introduction" heading, so it goes first.
        existing = str(intro.get("content") or "").strip()
        intro["content"] = f"{body}\n\n{existing}" if body and existing else (body or existing)
        if children:
            child_key = next((k for k in ("sub_sections", "subsections", "sections") if intro.get(k)), "sub_sections")
            intro[child_key] = children + list(intro.get(child_key) or [])
        if sub_items:
            intro["sub_items"] = sub_items + list(intro.get("sub_items") or [])
        folded += 1

    if renamed or folded or dropped:
        parts = []
        if renamed:
            parts.append("the opening text under the chapter heading is now the 'Introduction' section")
        if folded:
            parts.append(f"{folded} block(s) named after the chapter folded into the Introduction")
        if dropped:
            parts.append(f"{dropped} empty block(s) named after the chapter dropped")
        logger.info(f"[Intro] {title!r}: " + "; ".join(parts))
    return out


def _credits_match(key: str, phrases) -> bool:
    # Prefix match, so "Authors List - VII Science" and "Advisory Committee &
    # Chairperson" are recognised along with the bare heading.
    return any(key == p or key.startswith(p + " ") for p in phrases)


def is_credits_heading(title: str, *, inside_block: bool = False) -> bool:
    """True for a publisher colophon heading (author list, EMIS team, ...).

    `inside_block` widens the match to the weaker phrases that are only
    credits when they follow an anchor.
    """
    key = _credits_key(title)
    if not key:
        return False
    if _credits_match(key, _CREDITS_ANCHORS):
        return True
    return inside_block and _credits_match(key, _CREDITS_INNER)


# A credits page prints one person per line: "Dr. T.V. Venkateswaran",
# "R. Arun Maruthi Selvan", "N. Kalpana,". Recognised by SHAPE — honorific,
# initials, two to four capitalised words — because a name list cannot be
# enumerated. On its own this is far too loose to mean anything ("Digital
# Painting" matches it); it is only ever used to measure how credit-like a
# region already anchored by a real colophon heading is.
_PERSON_NAME_RE = re.compile(
    r"^(?:Dr|Mr|Mrs|Ms|Prof|Thiru|Tmt|Selvi)?\.?\s*"
    r"(?:[A-Z]\.\s*){0,3}"
    r"[A-Z][A-Za-z'\-]+(?:[\s,]+[A-Z][A-Za-z'\-]+){0,3}[.,]?$"
)


def _looks_like_person(text: str) -> bool:
    t = (text or "").strip().strip("*#").strip()
    return bool(t) and len(t) <= 48 and bool(_PERSON_NAME_RE.match(t))


# The colophon is a RUN of credit headings that reaches the end of the book, so
# that is what is measured. An earlier version simply required the block to
# start past 55% of the document, which is a guess about layout rather than
# evidence: a short unit whose credits began at 54% slipped straight past it.
_CREDITS_MIN_BLOCK = 3       # headings; fewer is not a credits section
_CREDITS_MIN_DENSITY = 0.8   # of them must be credit headings or names


def backmatter_offset(source_md: str) -> Optional[int]:
    """Character offset where the publisher's credits pages begin, else None.

    Returns the start of the EARLIEST colophon heading whose run to the end of
    the document is overwhelmingly credits. Everything from there on is
    printing furniture: neither required to appear as a section, nor allowed to
    stay in one.
    """
    if not source_md:
        return None
    headings = iter_source_headings(source_md)
    for i, (start, _end, text) in enumerate(headings):
        if not is_credits_heading(text):
            continue                      # only a strong anchor may open a block
        tail = headings[i:]
        if len(tail) < _CREDITS_MIN_BLOCK:
            continue
        credit_like = sum(
            1 for _s, _e, t in tail
            if is_credits_heading(t, inside_block=True) or _looks_like_person(t)
        )
        if credit_like / len(tail) >= _CREDITS_MIN_DENSITY:
            return start
    return None


# ── Unit title ────────────────────────────────────────────────────────────────
# A textbook prints the unit NUMBER and the unit NAME as two separate headings:
#
#     # Unit 6
#     ## Digital Painting
#
# Left to itself the extraction model takes the first one and the unit ships as
# "Unit 6" with its real name demoted to sections[0]. The name is right there in
# the source, so it is derived here rather than asked for.

_UNIT_NUMBER_HEADING_RE = re.compile(
    r"^\s*(?:Unit|Chapter|Lesson|Module)\s*[-–:.]?\s*(\d+|[IVXLC]+)\s*[-–:.]?\s*(.*)$",
    re.IGNORECASE,
)

# A bare unit-number heading with nothing else on the line: "Unit 6", "Unit - 1".
_BARE_UNIT_TITLE_RE = re.compile(
    r"^\s*(?:Unit|Chapter|Lesson|Module)\s*[-–:.]?\s*(?:\d+|[IVXLC]+)"
    r"(?:\s+(?:Prose|Poem|Drama|Supplementary))?\s*[-–:.]?\s*$",
    re.IGNORECASE,
)

# Headings that open a unit but are never its name.
_NOT_A_UNIT_NAME = frozenset({
    "warm up", "warmup", "warm-up", "let us begin", "let us start",
    "let us learn", "learning objectives", "objectives", "lesson objectives",
    "introduction", "before you read", "in this lesson", "in this chapter",
    "contents", "index", "syllabus", "overview", "prose", "poem", "drama",
    "supplementary", "glossary", "evaluation", "exercise", "exercises",
})


# A heading that ends on a function word was wrapped by the OCR and is only
# half a title ("Sources of" / "Sources of Medieval India"). Never use one.
_DANGLING_TAIL = frozenset(
    "of the a an and or in on at to for with from by into "
    "its his her their our your my is are was were".split()
)


def _is_partial_heading(text: str) -> bool:
    words = _credits_key(text).split()
    return bool(words) and words[-1] in _DANGLING_TAIL


def is_placeholder_unit_title(title: str) -> bool:
    """True when a unit title says only which unit it is, not what it is about."""
    text = (title or "").strip().strip("*#").strip()
    return not text or bool(_BARE_UNIT_TITLE_RE.match(text))


def derive_unit_title(source_md: str, unit_number: Any = None) -> Optional[str]:
    """The unit's printed name, read from the source markdown.

    Handles both layouts: the name on the same line as the number
    ("# Unit 6: Digital Painting") and the name as the heading that follows it.
    Returns None when the book does not print one in text — a unit title page
    that is a single scanned image has no name to find here.
    """
    if not source_md:
        return None
    headings = [(start, text) for start, _end, text in iter_source_headings(source_md)]
    want = str(unit_number).strip() if unit_number not in (None, "") else None

    for idx, (_start, raw) in enumerate(headings):
        text = (raw or "").strip().strip("*#").strip()
        m = _UNIT_NUMBER_HEADING_RE.match(text)
        if not m:
            continue
        if want and m.group(1).lstrip("0").upper() != want.lstrip("0").upper():
            continue

        # Same line: "# Unit 6: Digital Painting". A genre word trailing the
        # number ("Unit 1 Prose") names the SECTION of the book, not the
        # lesson — fall through to the heading below it, which does.
        inline = (m.group(2) or "").strip(" -–:.")
        if (inline and not _is_noise_heading(inline)
                and not _is_partial_heading(inline)
                and _credits_key(inline) not in _NOT_A_UNIT_NAME):
            return inline

        # Next line: the following heading, unless it is section furniture.
        for _next_start, next_raw in headings[idx + 1: idx + 3]:
            cand = (next_raw or "").strip().strip("*#").strip()
            if not cand or _is_noise_heading(cand) or is_credits_heading(cand):
                continue
            if _credits_key(cand) in _NOT_A_UNIT_NAME:
                return None      # unit opens straight into a section — no name printed
            if _UNIT_NUMBER_HEADING_RE.match(cand):
                continue
            if _classify_heading(cand) != "section":
                return None      # ditto: a typed section, not the unit's name
            if _is_partial_heading(cand) or _HEADING_NOISE_RE.match(cand):
                return None      # a wrapped or furniture line, not a name
            return cand
        return None
    return None


def _classify_heading(title: str) -> str:
    """Best-effort section type for a named heading."""
    text = (title or "").strip().lower()
    for pattern, stype in _HEADING_TYPE_RULES:
        if re.search(pattern, text):
            return stype
    return "section"


def _is_noise_heading(title: str) -> bool:
    text = (title or "").strip()
    if len(text) < 3 or len(text) > 120:
        return True
    return bool(_HEADING_NOISE_RE.match(text))


# A bold line used as a heading: "**1.1.1 Measuring Length**". Distinct from
# _BOLD_LABEL_RE, which also matches a label with text trailing after it.
_BOLD_HEADING_LINE_RE = re.compile(r'(?m)^[ \t]{0,3}\*\*[ \t]*([^*\n]{2,120}?)[ \t]*\*\*[ \t]*$')


def iter_source_headings(source_md: str):
    """Every heading in the document, in order, as (start, end, text).

    Covers BOTH markdown headings and bold-only lines. They have to be gathered
    together: parse_source_headings — which every completeness check uses —
    counts bold headings, so a recovery pass walking only "#" lines skips them
    silently. That alone accounted for ~112 missing third-level headings such
    as "1.1.1" and "2.3.3" across the corpus.
    """
    events = []
    for m in _ANY_HEADING_RE.finditer(source_md or ""):
        events.append((m.start(), m.end(), m.group(1).strip().strip("*#").strip()))
    for m in _BOLD_HEADING_LINE_RE.finditer(source_md or ""):
        events.append((m.start(), m.end(), m.group(1).strip().strip("*#").strip()))
    events.sort(key=lambda e: e[0])
    out, seen = [], set()
    for start, end, text in events:
        if start in seen or not text:
            continue
        seen.add(start)
        out.append((start, end, text))
    return out


def source_structure_signals(content_md: str) -> Dict[str, Any]:
    """Deterministic structure facts about a document, independent of any LLM.

    Deliberately style-agnostic: it reports what IS there rather than assuming a
    numbering scheme, so an English reader with named sections and a maths
    chapter with 2.1/2.2/2.3 both produce usable signals.
    """
    headings = [
        h.strip().strip("*#").strip() for h in _ANY_HEADING_RE.findall(content_md or "")
    ]
    # Numbered headings come from parse_source_headings, the parser the rest of
    # the pipeline already trusts. A "#"-only regex misses bold pseudo-headings
    # ("**1.6.1.1 Domain and Range**"), and that disagreement made realign_section_ids
    # assign perfectly real ids that this function then reported as invented.
    raw_titles = _raw_source_heading_titles(content_md or "")
    seen_nums = set()
    unique_numbered = []
    for num, _norm_title in parse_source_headings(content_md or ""):
        if num and num not in seen_nums:
            seen_nums.add(num)
            unique_numbered.append((num, raw_titles.get(num, "").strip()))
    return {
        "headings": headings,
        "heading_count": len(headings),
        "numbered": unique_numbered,
        "numbered_count": len(unique_numbered),
    }


# A structure preview longer than this stops helping and starts crowding out the
# type rules in the prompt.
_MAX_RECOVERED_HEADINGS = int(os.getenv("DISCOVERY_MAX_RECOVERED_HEADINGS", "60"))


def reconcile_discovery(
    discovered: List[Dict[str, str]],
    content_md: str,
) -> List[Dict[str, str]]:
    """Fill the gaps in an LLM discovery using the source itself.

    Phase 1 is the single biggest lever on extraction quality — the prompt only
    carries rules for the types it names — and it is wildly unstable: the same
    chapter returned 24, 29, 32, 49, 51, 52, 56 and 69 sections across runs. A
    thin discovery silently produces a thin extraction.

    Two deterministic corrections, neither of which removes anything the LLM
    found:

    1. Numbered headings in the source are ground truth. Any the LLM missed are
       added as 'section' entries with their real titles. Skipped entirely for
       books that do not number their headings.
    2. Section TYPES the heuristic detector finds but the LLM missed are added,
       so no extraction rule is absent from the prompt. This is what carries
       English/CBSE/unnumbered books, where signal 1 contributes nothing.
    """
    discovered = [d for d in (discovered or []) if isinstance(d, dict) and d.get("type")]
    signals = source_structure_signals(content_md)

    known_types = {d.get("type") for d in discovered}
    # Compare on the number alone; the LLM rarely reproduces a title verbatim.
    known_numbers = set()
    for d in discovered:
        m = re.match(r'\s*(' + _SECNUM + r')\b', str(d.get("title") or ""))
        if m:
            known_numbers.add(m.group(1))

    added_sections, added_types = [], []
    added_named = 0        # from named headings (unnumbered books)

    # (1) Numbered headings the LLM did not account for.
    for num, title in signals["numbered"]:
        if num in known_numbers:
            continue
        if re.match(r'(?i)\s*(exercise|evaluation|summary|glossary)', title or ""):
            continue
        added_sections.append({"type": "section", "title": f"{num} {title}".strip()})

    # (1b) Books that NAME their sections instead of numbering them — English
    # readers, many CBSE chapters — get the same treatment, because their
    # headings are the only structural ground truth available. Restricted to
    # unnumbered books on purpose: a maths chapter's 118 headings are mostly
    # "Example 2.4" and "Fig 2.5", and injecting those would bury the prompt.
    if not signals["numbered_count"]:
        known_titles = {
            re.sub(r"[^a-z0-9]+", "", str(d.get("title") or "").lower())
            for d in discovered
        }
        known_titles.discard("")
        seen_titles = set()
        for title in signals["headings"]:
            if _is_noise_heading(title):
                continue
            key = re.sub(r"[^a-z0-9]+", "", title.lower())
            if not key or key in known_titles or key in seen_titles:
                continue
            seen_titles.add(key)
            added_sections.append({"type": _classify_heading(title), "title": title.strip()})
            added_named += 1
            if len(added_sections) >= _MAX_RECOVERED_HEADINGS:
                logger.warning(
                    f"[Discovery] capping recovered headings at "
                    f"{_MAX_RECOVERED_HEADINGS}"
                )
                break

    # (2) Types the heuristic sees that the LLM did not name.
    try:
        heuristic = _detect_structure_heuristic(content_md) or []
    except Exception as e:
        logger.warning(f"[Discovery] heuristic pass failed: {e}")
        heuristic = []
    for entry in heuristic:
        stype = entry.get("type")
        if stype and stype not in known_types and stype != "section":
            known_types.add(stype)
            added_types.append({"type": stype, "title": entry.get("title") or ""})

    if signals["numbered_count"] and len(known_numbers) < signals["numbered_count"]:
        logger.warning(
            f"[Discovery] LLM named {len(known_numbers)}/{signals['numbered_count']} "
            f"numbered headings present in the source — recovering the rest from the text"
        )
    if added_sections or added_types:
        # Name the path that fired: "numbered" on a book with no numbers was a
        # confusing thing to print.
        added_numbered = len(added_sections) - added_named
        parts = []
        if added_numbered:
            parts.append(f"+{added_numbered} numbered heading(s)")
        if added_named:
            parts.append(f"+{added_named} named heading(s)")
        if added_types:
            parts.append(f"+{len(added_types)} type(s) {[t['type'] for t in added_types]}")
        logger.info(f"[Discovery] Reconciled with source: {', '.join(parts)}")
    else:
        logger.info(
            f"[Discovery] Source agrees with the LLM "
            f"({signals['heading_count']} heading(s), {signals['numbered_count']} numbered)"
        )

    return discovered + added_sections + added_types


def _nest_numbered_subsections(
    sections: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Move "2.5.1" inside "2.5" as a sub_section.

    Filter 6's comment claims to do this ("Convert sequential subsections into
    nested subsections of their parent") but its implementation only tracked
    parents and appended everything flat, so every subsection stayed top-level.
    That matters downstream, not just cosmetically: qdrant_integration and
    enrichment_pipeline both read section["sub_sections"], and nothing was ever
    putting anything there.

    Only exact prefix parents count, and only when the parent is present — an
    orphan subsection stays where it is rather than being attached to a guess.
    """
    if not sections:
        return sections

    by_number: Dict[str, Dict[str, Any]] = {}
    for sec in sections:
        sid = str(sec.get("id") or "").strip()
        if re.fullmatch(r'\d+(?:\.\d+)+', sid):
            by_number.setdefault(sid, sec)

    out: List[Dict[str, Any]] = []
    nested = 0
    for sec in sections:
        sid = str(sec.get("id") or "").strip()
        parent = None
        if re.fullmatch(r'\d+(?:\.\d+){2,}', sid):      # depth 3+, e.g. 2.5.1
            parent_id = sid.rsplit(".", 1)[0]
            candidate = by_number.get(parent_id)
            # Never nest into itself, and never nest a parent into its child.
            if candidate is not None and candidate is not sec:
                parent = candidate
        if parent is None:
            out.append(sec)
            continue
        parent.setdefault("sub_sections", []).append(sec)
        nested += 1

    if nested:
        logger.info(
            f"[Nest] Moved {nested} numbered subsection(s) into "
            f"their parent's sub_sections"
        )
    return out


def recover_missing_sections(
    sections: List[Dict[str, Any]],
    source_md: str,
    min_content_chars: int = 25,   # a short body is still a section:
                                   # "2.7 Arithmetic Progression" has 50 chars
) -> List[Dict[str, Any]]:
    """Insert headings present in the source but absent from the extraction.

    The model reliably runs out of attention before the end of a chunk. On a
    real chapter, chunk 5 contained 2.10, 2.10.1, 2.11, 2.11.1-2.11.4; the reply
    covered 2.10 six times over and never emitted 2.11 or any of its four
    subsections. Prompting does not fix that — the headings were already listed
    in the prompt — so recover them from the text deterministically.

    Body text is sliced from the end of the heading line to the start of the
    next heading, so a recovered section carries real content rather than a
    title placeholder. Anything whose text is already present in the extraction
    is skipped, which also makes this idempotent.

    Style-agnostic: numbered headings are matched by number, named headings
    (English readers, unnumbered CBSE chapters) by normalised title.
    """
    if not source_md:
        return sections

    matches = iter_source_headings(source_md)
    if not matches:
        return sections

    # Numbers must come from the SAME detector the rest of the pipeline trusts.
    # Parsing them straight off a heading line is looser than
    # _NUMBERED_HEADING_RE, so recovery was minting ids that the source-signal
    # check then flagged as invented — 20 of them on one book.
    valid_numbers = {n for n, _ in source_structure_signals(source_md)["numbered"]}

    def _key(text: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", (text or "").lower())

    # What the extraction already accounts for.
    have_numbers, have_titles = set(), set()

    def _absorb(secs):
        for sec in secs or []:
            if not isinstance(sec, dict):
                continue
            sid = str(sec.get("id") or "").strip()
            m = re.match(r'^(' + _SECNUM + r')\b', sid)
            if m:
                have_numbers.add(m.group(1))
            title = str(sec.get("title") or "")
            mt = re.match(r'^\s*(' + _SECNUM + r')\b', title)
            if mt:
                have_numbers.add(mt.group(1))
            if title.strip():
                have_titles.add(_key(re.sub(r'^\s*' + _SECNUM + r'\s*', '', title)))
            # A folded label lives in sub_items[].number, not .title. Missing it
            # made recovery re-insert the same block on every later pass.
            label = str(sec.get("number") or "")
            if label.strip():
                have_titles.add(_key(re.sub(r'^\s*' + _SECNUM + r'\s*', '', label)))
                m_lbl = re.match(r'^\s*(' + _SECNUM + r')\b', label)
                if m_lbl:
                    have_numbers.add(m_lbl.group(1))
            for child_key in ("sub_sections", "subsections", "sections", "sub_items"):
                _absorb(sec.get(child_key))

    _absorb(sections)

    existing_text = _norm_ws(" ".join(
        str(v) for v in _iter_section_strings(sections)
    )).lower()

    recovered: List[Tuple[int, Dict[str, Any]]] = []
    for i, (h_start, h_end, heading) in enumerate(matches):
        # iter_source_headings already strips the bold/hash markup: left in
        # place the asterisks block number parsing, so a section reads as
        # unnumbered and is silently skipped.
        if _is_noise_heading(heading):
            continue

        num_m = re.match(r'^(' + _SECNUM + r')\s*(.*)$', heading)
        number = num_m.group(1) if num_m else ""
        title = (num_m.group(2).strip() if num_m else heading) or heading
        if number and number not in valid_numbers:
            # Looks numbered but the canonical detector disagrees — keep the
            # text, drop the number rather than fabricate one.
            title = heading
            number = ""

        if number and number in have_numbers:
            continue
        if not number and _key(title) in have_titles:
            continue

        body_start = h_end
        body_end = matches[i + 1][0] if i + 1 < len(matches) else len(source_md)
        body = source_md[body_start:body_end].strip()
        if len(body) < min_content_chars:
            continue

        # Already extracted under some other id/title — don't duplicate it.
        probe = _norm_ws(body[:150]).lower()
        if len(probe) > 40 and probe in existing_text:
            continue
        # Paragraph by paragraph too: the chapter's opening figure line was
        # never extracted, so the whole opening was recovered — including the
        # definition and the paragraph the model HAD filed as boxes of their
        # own, which the unit then carried twice.
        kept_paragraphs = []
        for para in re.split(r"\n\s*\n", body):
            key_p = _norm_ws(para).lower()
            if len(key_p) > 40 and key_p in existing_text:
                continue
            kept_paragraphs.append(para.strip())
        body = "\n\n".join(par for par in kept_paragraphs if par)
        if len(body) < min_content_chars:
            continue

        entry: Dict[str, Any] = {
            "type": _classify_heading(title),
            "title": title,
            "content": body,
            "metadata": {"recovered_from_source": True},
        }
        if number:
            entry["id"] = number
        recovered.append((h_start, entry))

    if not recovered:
        return sections

    logger.warning(
        f"[Recovery] {len(recovered)} heading(s) present in the source but "
        f"missing from the extraction — recovered from the text: "
        f"{[e.get('id') or e['title'][:24] for _, e in recovered[:12]]}"
    )
    return list(sections) + [entry for _, entry in recovered]


def _iter_section_strings(node: Any):
    """Yield every content-bearing string in a section tree."""
    if isinstance(node, dict):
        for key, value in node.items():
            if isinstance(value, str) and key in (
                "content", "text", "question", "answer", "solution"
            ):
                yield value
            else:
                yield from _iter_section_strings(value)
    elif isinstance(node, list):
        for item in node:
            yield from _iter_section_strings(item)


def _norm_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


_BOLD_LABEL_RE = re.compile(r'(?m)^[ \t]{0,3}\*\*[ \t]*([^*\n]{2,60}?)[ \t]*\*\*[ \t]*')


def _content_is_headings_only(content: str, threshold: int = 40) -> bool:
    """True when a section carries no body beyond heading lines.

    The model regularly emits {"id": "Example 2.4", "content": "## Example 2.4"}
    — the heading echoed back with the worked example missing — and sometimes a
    run of heading lines with nothing between them. Both look like sections and
    chunk into useless RAG entries.
    """
    if not content or not content.strip():
        return True
    body = []
    for line in content.split("\n"):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        body.append(stripped.strip("*").strip())
    joined = " ".join(body)
    # Short AND word-poor: an echoed heading ("## Example 2.4") or a run of
    # heading lines has near-zero words and is genuinely empty. But a terse real
    # prompt — a Thinking Corner's "The value of n must be positive. Why?" is 39
    # chars yet 8 words — is content, and flagging it empty sent the audit
    # chasing a section it could never fill (there was nothing missing).
    return len(joined) < threshold and len(joined.split()) < 6


# Types that carry no prose by design - a figure reference has nothing to fill.
_NO_BODY_TYPES = {"illustration", "image", "figure", "table"}


def _section_is_empty(sec: Dict[str, Any]) -> bool:
    """True when a section carries no content ANYWHERE, not just in `content`.

    Checking `content` alone misreads the common case badly: an exercise keeps
    its questions in sub_items and an example keeps its solution in metadata,
    so both look empty while holding hundreds of characters. Filling those from
    the source would duplicate content the section already has - 128 of 172
    flagged sections on this corpus were exactly that.
    """
    if str(sec.get("type") or "") in _NO_BODY_TYPES:
        return False
    if not _content_is_headings_only(str(sec.get("content") or "")):
        return False
    payload = 0
    for key in ("sub_items", "sub_sections", "subsections", "questions", "metadata"):
        payload += _section_text_volume(sec.get(key))
        if payload > 60:
            return False
    return True


def fill_stub_sections(
    sections: List[Dict[str, Any]],
    source_md: str,
    min_fill_chars: int = 40,
) -> List[Dict[str, Any]]:
    """Give heading-only sections their body text back, from the source.

    recover_missing_sections only handles headings with no section at all. A
    section that EXISTS but whose content is just its own heading passes every
    presence check while carrying nothing — 11 of 38 sections on one chapter,
    including worked examples and theorems.

    Matched by section number where there is one, else by normalised title, so
    it works for numbered and named textbooks alike.
    """
    if not source_md or not sections:
        return sections

    matches = list(_ANY_HEADING_RE.finditer(source_md))
    labels = list(_BOLD_LABEL_RE.finditer(source_md))
    if not matches and not labels:
        return sections

    def _key(text: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", (text or "").lower())

    # Anchors are collected in document order and keyed by every spelling a
    # section might carry, so a repeated heading ("Evaluation", "Match the
    # following") is disambiguated by POSITION rather than skipped. Skipping
    # ambiguous keys left 10 of 24 empty sections unfillable.
    boundaries = sorted([m.start() for m in matches] + [m.start() for m in labels])

    def _body_after(end: int) -> str:
        nxt = next((b for b in boundaries if b > end), len(source_md))
        return source_md[end:nxt].strip()

    _anchor_bodies: Dict[str, List[str]] = {}

    def _add(keys, body: str) -> None:
        if not body:
            return
        for k in keys:
            if k:
                _anchor_bodies.setdefault(k, []).append(body)

    events = []
    for m in matches:
        events.append((m.start(), m.end(), m.group(1).strip().strip("*#").strip()))
    for m in labels:
        events.append((m.start(), m.end(), m.group(1).strip()))
    events.sort()

    for start, end, text in events:
        if not text:
            continue
        body = _body_after(end)
        keys = {_key(text)}
        num_m = re.match(r'^(' + _SECNUM + r')\s*(.*)$', text)
        if num_m:
            keys.add("num:" + num_m.group(1))
            keys.add(_key(num_m.group(2)))
        _add(keys, body)

    # Plain, unmarked lines that the OCR never marked up. Matched only by exact
    # title equality at lookup time, so ordinary prose cannot be mistaken for a
    # heading; the body still runs to the next real heading or label.
    for line_m in re.finditer(r'(?m)^[ \t]{0,3}(\S[^\n]{0,78})[ \t]*$', source_md):
        text = line_m.group(1).strip().strip("*#:").strip()
        if not text or text.startswith("#") or text.startswith("**"):
            continue
        body = _body_after(line_m.end())
        if body:
            _add({_key(text)}, body)

    used: Dict[str, int] = {}

    def _lookup(*candidates: str) -> Optional[str]:
        """Next unused body for the first candidate key that has one."""
        for cand in candidates:
            if not cand:
                continue
            bodies = _anchor_bodies.get(cand)
            if not bodies:
                continue
            i = used.get(cand, 0)
            if i >= len(bodies):
                i = len(bodies) - 1        # reuse the last rather than give up
            used[cand] = i + 1
            return bodies[i]
        return None

    filled = [0]

    def _walk(secs: List[Dict[str, Any]]) -> None:
        for sec in secs or []:
            if not isinstance(sec, dict):
                continue
            if _section_is_empty(sec):
                sid = str(sec.get("id") or "").strip()
                title = str(sec.get("title") or "").strip()

                num_m = (re.match(r'^(' + _SECNUM + r')\b', sid)
                         or re.match(r'^\s*(' + _SECNUM + r')\b', title))
                body = _lookup(
                    ("num:" + num_m.group(1)) if num_m else "",
                    _key(sid),
                    _key(title),
                    _key(re.sub(r'^\s*' + _SECNUM + r'\s*', '', title)),
                )

                if body and len(body) >= min_fill_chars and not _content_is_headings_only(body):
                    sec["content"] = body
                    meta = sec.get("metadata")
                    if not isinstance(meta, dict):
                        meta = {}
                        sec["metadata"] = meta
                    meta["filled_from_source"] = True
                    filled[0] += 1

            for child_key in ("sub_sections", "subsections", "sections"):
                _walk(sec.get(child_key))

    _walk(sections)

    if filled[0]:
        logger.warning(
            f"[Stubs] Filled {filled[0]} section(s) whose content was only a "
            f"heading — body text recovered from the source"
        )
    return sections


def drop_phantom_sections(
    sections: List[Dict[str, Any]],
    source_md: str,
) -> List[Dict[str, Any]]:
    """Remove empty sections the textbook never had.

    After filling, two kinds of empty section remain. One is real: the heading
    is printed in the book but carries no body ("Evaluation", "Vocabulary") —
    those stay, because the structure itself is information. The other is a
    shell the model invented ("Calculation", "Page marker", a title of "0"),
    which has no content, no children, and no counterpart anywhere in the
    source. Those ship as titles with nothing attached and become dead RAG
    chunks, so drop them.
    """
    if not sections or not source_md:
        return sections

    haystack = re.sub(r"[^a-z0-9]+", "", source_md.lower())
    dropped: List[str] = []

    def _prune(secs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        kept = []
        for sec in secs or []:
            if not isinstance(sec, dict):
                continue
            for child_key in ("sub_sections", "subsections", "sections"):
                if isinstance(sec.get(child_key), list):
                    sec[child_key] = _prune(sec[child_key])

            has_children = any(
                sec.get(k) for k in ("sub_sections", "subsections", "sections", "sub_items")
            )
            if has_children or not _section_is_empty(sec):
                kept.append(sec)
                continue

            anchor = str(sec.get("title") or "").strip() or str(sec.get("id") or "").strip()
            key = re.sub(r"[^a-z0-9]+", "", anchor.lower())
            # No anchor at all, or an anchor the book never prints -> phantom.
            if not key or key not in haystack:
                dropped.append(anchor or "(untitled)")
                continue
            kept.append(sec)
        return kept

    out = _prune(sections)
    if dropped:
        logger.warning(
            f"[Phantoms] Dropped {len(dropped)} empty section(s) with no "
            f"counterpart in the source: {dropped[:8]}"
        )
    return out


def _content_fingerprint(sec: Dict[str, Any]) -> str:
    text = re.sub(r"\s+", " ", str(sec.get("content") or "")).strip().lower()
    return text[:400]


def resolve_duplicate_sections(
    sections: List[Dict[str, Any]],
    source_md: str,
) -> List[Dict[str, Any]]:
    """Collapse repeated sections and give a contested id to its rightful owner.

    Three distinct faults show up together in real output, all from the model
    and the chunk merge rather than from any single filter:

    1. The same block extracted twice by overlapping chunks - identical id and
       identical content, side by side.
    2. Two different sections claiming one id, where only one of them holds that
       heading's text. On a real chapter, "2.5 Modular Arithmetic" appeared
       twice: once with the clock/modulo passage (correct) and once carrying
       section 2.6's text about sequences (wrong on both id and title).
    3. A child repeating its parent's section id, so "2.2" named both the
       section and the theorem nested inside it.

    Ownership is decided by the source: whichever claimant's text actually
    follows that heading keeps the id. The loser is relabelled from the heading
    its content DOES match, or has its id cleared - never deleted, because its
    content is real even when its label is not.
    """
    if not sections:
        return sections

    heading_bodies: Dict[str, str] = {}
    heading_titles: Dict[str, str] = {}
    if source_md:
        matches = list(_ANY_HEADING_RE.finditer(source_md))
        for i, m in enumerate(matches):
            text = m.group(1).strip().strip("*#").strip()
            num_m = re.match(r'^(' + _SECNUM + r')\s*(.*)$', text)
            if not num_m:
                continue
            num = num_m.group(1)
            if num in heading_bodies:
                continue
            end = matches[i + 1].start() if i + 1 < len(matches) else len(source_md)
            heading_bodies[num] = re.sub(r"\s+", " ", source_md[m.end():end]).strip().lower()
            heading_titles[num] = num_m.group(2).strip()

    def _overlap(content: str, body: str) -> float:
        """Crude but sufficient: how much of the section's opening is in the body."""
        probe = re.sub(r"\s+", " ", content or "").strip().lower()[:160]
        if not probe or not body:
            return 0.0
        return 1.0 if probe in body else 0.0

    removed = [0]
    relabelled = [0]
    cleared = [0]

    def _prune(secs: List[Dict[str, Any]], ancestor_ids: set) -> List[Dict[str, Any]]:
        seen_here: Dict[str, Dict[str, Any]] = {}     # fingerprint -> kept section
        claims: Dict[str, Dict[str, Any]] = {}        # id -> first claimant
        kept: List[Dict[str, Any]] = []

        for sec in secs or []:
            if not isinstance(sec, dict):
                continue
            sid = str(sec.get("id") or "").strip()

            # (1) exact duplicate of a sibling already kept
            fp = _content_fingerprint(sec)
            if fp and len(fp) > 30 and fp in seen_here:
                twin = seen_here[fp]
                if str(twin.get("id") or "").strip() == sid:
                    for key in ("sub_sections", "subsections", "sections", "sub_items"):
                        extra = sec.get(key)
                        if extra:
                            twin.setdefault(key, []).extend(extra)
                    removed[0] += 1
                    continue

            # (3) a child must not wear an ancestor's section id
            if sid and sid in ancestor_ids:
                sec["id"] = ""
                cleared[0] += 1
                sid = ""

            # (2) two siblings claiming the same id
            if sid and sid in claims:
                other = claims[sid]
                body = heading_bodies.get(sid, "")
                mine = _overlap(str(sec.get("content") or ""), body)
                theirs = _overlap(str(other.get("content") or ""), body)
                loser = sec if mine <= theirs else other
                winner = other if loser is sec else sec
                claims[sid] = winner
                # Re-label the loser from the heading its text really matches.
                loser_probe = str(loser.get("content") or "")
                match_num = next(
                    (n for n, b in heading_bodies.items() if _overlap(loser_probe, b) > 0),
                    None,
                )
                if match_num and match_num not in claims:
                    loser["id"] = match_num
                    if heading_titles.get(match_num):
                        loser["title"] = heading_titles[match_num]
                    claims[match_num] = loser
                    relabelled[0] += 1
                else:
                    loser["id"] = ""
                    cleared[0] += 1
            elif sid:
                claims[sid] = sec

            seen_here[fp] = sec
            kept.append(sec)

        for sec in kept:
            child_ancestors = ancestor_ids | ({str(sec.get("id") or "").strip()}
                                              if sec.get("id") else set())
            for key in ("sub_sections", "subsections", "sections"):
                if isinstance(sec.get(key), list):
                    sec[key] = _prune(sec[key], child_ancestors)
        return kept

    out = _prune(sections, set())

    # Sibling-level dedupe misses the commonest case: overlapping chunks file
    # the SAME example under two different parents, so the twins are never
    # siblings. Sweep the whole tree for identical (id, text) pairs.
    seen_global: set = set()

    def _sweep(secs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        kept = []
        for sec in secs or []:
            fp = _content_fingerprint(sec)
            # A shorter key on purpose: the same example re-extracted by two
            # chunks often differs by a trailing character ("Example 2.48" came
            # back at 67 and 68 chars), which an exact comparison treats as two
            # distinct sections.
            # Alphanumeric-only key: two extractions of one example differ by
            # punctuation far more often than by words ("... -27..." vs
            # "... -27."), and a literal comparison keeps both.
            akey = re.sub(r"[^a-z0-9]+", "", fp)[:150]
            sig = (str(sec.get("id") or "").strip(), str(sec.get("title") or "").strip(), akey)
            # The signature already pins id AND title, so a short body is still
            # conclusive: "Example 2.49" twice with the same 22-character
            # question is one example, not two.
            if akey and len(akey) > 8 and sig in seen_global:
                removed[0] += 1
                continue
            if akey and len(akey) > 8:
                seen_global.add(sig)
            for key in ("sub_sections", "subsections", "sections"):
                if isinstance(sec.get(key), list):
                    sec[key] = _sweep(sec[key])
            kept.append(sec)
        return kept

    out = _sweep(out)

    if removed[0] or relabelled[0] or cleared[0]:
        logger.info(
            f"[Dedupe] removed {removed[0]} duplicate section(s), "
            f"re-labelled {relabelled[0]} mislabelled id(s), cleared {cleared[0]} "
            f"conflicting id(s)"
        )
    return out


# ── Orphan prose: the paragraph that resumes after a box ──────────────────────
#
# A textbook section is routinely interrupted by a box — an Activity, a
# definition, a figure — and then carries on:
#
#     ## DEVELOPMENT OF RESOURCES
#     Resources are vital for human survival ...
#     ### Activity
#     1. Imagine, if the oil supply gets exhausted ...
#     An equitable distribution of resources has become essential ...   <- resumes
#     ### Sustainable development
#
# The model sees that the resuming paragraph is not part of the Activity, which
# is right, and then files it as a NEW top-level section with no title, which
# is not: the section it belongs to is now cut in half, and the half after the
# box can no longer be retrieved, enriched or cited as DEVELOPMENT OF RESOURCES.
#
# The source settles it. Every heading owns a span — from itself to the next
# heading of the same or a higher level — and a paragraph is attached to the
# nearest preceding titled section whose span contains it. A box is never that
# section: it interrupts a narrative, it does not own what follows it.

_LEVEL_HEADING_RE = re.compile(r'(?m)^[ \t]{0,3}(#{1,6})[ \t]*(\S[^\n]*?)[ \t]*#*[ \t]*$')

# Section types that sit INSIDE another section's flow rather than owning one.
_BOX_TYPES = frozenset({
    "activity", "illustration", "image", "figure", "table", "definition",
    "example", "theorem", "note", "do_you_know", "ict_corner", "map_work",
    "exercise", "unit_exercise", "evaluation", "glossary", "other", "project",
})

# Untitled sections that are candidates for re-attachment. An untitled
# exercise or glossary is a different kind of thing and is left alone.
_ORPHAN_TYPES = frozenset({"prose", "section", "paragraph", "text", "content", ""})


def _heading_spans(source_md: str) -> List[Tuple[str, int, int]]:
    """(normalized title, span_start, span_end) for every '#' heading.

    A heading's span runs to the next heading of the same or a higher level, so
    a '##' owns every '###' beneath it and the prose between them.
    """
    found = [(len(m.group(1)), m.start(), m.group(2).strip().strip("*").strip())
             for m in _LEVEL_HEADING_RE.finditer(source_md or "")]
    out: List[Tuple[str, int, int]] = []
    for i, (level, start, title) in enumerate(found):
        end = len(source_md)
        for lvl2, start2, _t in found[i + 1:]:
            if lvl2 <= level:
                end = start2
                break
        out.append((re.sub(r"[^a-z0-9]+", "", title.lower()), start, end))
    return out


_IMAGE_REF_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)|\[Image:[^\]]*\]|<img\b[^>]*>", re.IGNORECASE)


def _locate_text(needle: str, source_md: str) -> Optional[int]:
    """Where the first words of a paragraph appear in the source, else None.

    A figure reference is skipped: a paragraph that opens with
    ``![img-2.jpeg](https://...)`` used to hand its S3 URL over as its "first
    words", which the source never contains, so the paragraph after the
    chapter's opening figure was never re-joined to its section."""
    words = re.findall(r"[A-Za-z0-9]+", _IMAGE_REF_RE.sub(" ", needle or ""))[:8]
    if len(words) < 4:
        return None
    pattern = r"\W*".join(re.escape(w) for w in words)
    m = re.search(pattern, source_md or "", re.IGNORECASE)
    return m.start() if m else None


def reattach_orphan_prose(
    sections: List[Dict[str, Any]],
    source_md: str,
    unit_title: str = "",
) -> List[Dict[str, Any]]:
    """Return the untitled paragraph that resumes after a box to its section.

    ``unit_title`` lets an "Introduction" section stand for the chapter
    heading (name_unit_intro renamed it), so the paragraph after the
    chapter's opening figure or definition box still finds its way home."""
    if not sections or not source_md:
        return sections

    spans = _heading_spans(source_md)
    if not spans:
        return sections
    span_by_title: Dict[str, Tuple[int, int]] = {}
    for key, start, end in spans:
        span_by_title.setdefault(key, (start, end))
    unit_key = re.sub(r"[^a-z0-9]+", "", str(unit_title or "").lower())
    if unit_key and unit_key in span_by_title and "introduction" not in span_by_title:
        span_by_title["introduction"] = span_by_title[unit_key]

    def _key(sec: Dict[str, Any]) -> str:
        title = re.sub(r"^\s*\d+(?:\.\d+)*\.?\s*", "", str(sec.get("title") or ""))
        return re.sub(r"[^a-z0-9]+", "", title.lower())

    out: List[Dict[str, Any]] = []
    reattached = 0
    for sec in sections:
        title = str(sec.get("title") or "").strip()
        stype = str(sec.get("type") or "").lower()
        body = str(sec.get("content") or "").strip()
        has_children = any(sec.get(k) for k in ("sub_sections", "subsections", "sections"))

        if title or stype not in _ORPHAN_TYPES or not body or has_children:
            out.append(sec)
            continue

        pos = _locate_text(body, source_md)
        if pos is None:
            out.append(sec)               # cannot place it — do not guess
            continue

        # Nearest preceding titled section that owns this position and is not a box.
        # A section whose title the book never printed has no span and cannot
        # own anything - the model's invented "Changes in Land Use" used to
        # stop the walk here and leave the paragraph behind it stranded.
        home = None
        for prev in reversed(out):
            if not str(prev.get("title") or "").strip():
                continue
            if str(prev.get("type") or "").lower() in _BOX_TYPES:
                continue
            span = span_by_title.get(_key(prev))
            if span is None:
                continue                   # not a printed heading: keep looking
            if span[0] <= pos < span[1]:
                home = prev
            break                          # the nearest PRINTED heading decides
        if home is None:
            out.append(sec)
            continue

        existing = str(home.get("content") or "").rstrip()
        if _norm_ws(body).lower() in _norm_ws(existing).lower():
            # The section already carries this paragraph (a recovery pass
            # sliced the whole span); joining it again would print it twice.
            reattached += 1
            logger.info(
                f"[Reattach] untitled paragraph ({len(body)} chars) is already inside "
                f"{str(home.get('title'))[:50]!r} — duplicate dropped"
            )
            continue
        home["content"] = f"{existing}\n\n{body}" if existing else body
        if sec.get("sub_items"):
            home["sub_items"] = list(home.get("sub_items") or []) + list(sec["sub_items"])
        reattached += 1
        logger.info(
            f"[Reattach] untitled paragraph ({len(body)} chars) returned to "
            f"{str(home.get('title'))[:50]!r}"
        )

    if reattached:
        logger.info(f"[Reattach] {reattached} continuation paragraph(s) re-joined to their sections")
    return out


def split_lumped_subsections(
    sections: List[Dict[str, Any]],
    source_md: str,
) -> List[Dict[str, Any]]:
    """Give a numbered subsection its own section when the parent swallowed it.

    The model routinely emits "1.1" holding the text of 1.1.1 and 1.1.2 as one
    blob. Nothing is lost — recover_missing_sections correctly refuses to add
    those headings, because their text IS present — but the boundaries are
    gone, so 1.1.1 cannot be retrieved, enriched or cited on its own. Across the
    corpus that is most of the 25% "missing" headings.

    The source decides the split: a parent keeps the text above its first child
    heading, and each child gets the span under its own heading. Only parents
    that actually swallowed the text are touched, so a correctly-split document
    passes through untouched.
    """
    if not sections or not source_md:
        return sections

    headings = iter_source_headings(source_md)
    if not headings:
        return sections

    # number -> (title, body_start, body_end, heading_start, depth)
    spans: Dict[str, Any] = {}
    for i, (h_start, h_end, text) in enumerate(headings):
        m = re.match(r'^(' + _SECNUM + r')\s*(.*)$', text)
        if not m:
            continue
        num = m.group(1)
        if num in spans:
            continue
        end = headings[i + 1][0] if i + 1 < len(headings) else len(source_md)
        spans[num] = (m.group(2).strip(), h_end, end, h_start, num.count("."))

    def _norm(t: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", (t or "").lower())

    present: set = set()

    def _collect(secs):
        for sec in secs or []:
            sid = str(sec.get("id") or "").strip()
            mm = re.match(r'^(' + _SECNUM + r')\b', sid)
            if mm:
                present.add(mm.group(1))
            for k in ("sub_sections", "subsections", "sections"):
                _collect(sec.get(k))
    _collect(sections)

    split_count = [0]

    def _walk(secs):
        for sec in secs or []:
            if not isinstance(sec, dict):
                continue
            sid = str(sec.get("id") or "").strip()
            mm = re.match(r'^(' + _SECNUM + r')$', sid)
            if mm and mm.group(1) in spans:
                parent_num = mm.group(1)
                kids = sorted(
                    (n for n in spans
                     if n.startswith(parent_num + ".")
                     and n.count(".") == parent_num.count(".") + 1
                     and n not in present),
                    key=lambda n: spans[n][3],
                )
                if kids:
                    content = str(sec.get("content") or "")
                    norm_content = _norm(content)
                    # Only split when the parent really is holding the children.
                    holding = [
                        n for n in kids
                        if _norm(source_md[spans[n][1]:spans[n][2]])[:80]
                        and _norm(source_md[spans[n][1]:spans[n][2]])[:80] in norm_content
                    ]
                    if holding:
                        first_start = min(spans[n][3] for n in holding)
                        parent_body = source_md[spans[parent_num][1]:first_start].strip()
                        if parent_body:
                            sec["content"] = parent_body
                        children = sec.setdefault("sub_sections", [])
                        for n in holding:
                            title, b_start, b_end, _, _ = spans[n]
                            body = source_md[b_start:b_end].strip()
                            if not body:
                                continue
                            children.append({
                                "type": _classify_heading(title),
                                "id": n,
                                "title": title,
                                "content": body,
                                "metadata": {"split_from_parent": True},
                            })
                            present.add(n)
                            split_count[0] += 1
            for k in ("sub_sections", "subsections", "sections"):
                _walk(sec.get(k))

    _walk(sections)

    if split_count[0]:
        logger.info(
            f"\u2702\ufe0f  [Split] Separated {split_count[0]} subsection(s) whose text "
            f"the parent section had absorbed"
        )
    return sections


def sort_sections_by_source(
    sections: List[Dict[str, Any]],
    source_md: str,
) -> List[Dict[str, Any]]:
    """Put sections back into the order the textbook prints them.

    The chunk merge appends each chunk's sections as they arrive and the repair
    passes append at the end, so the array order drifts from the book: one
    chapter came out 2.1 2.2 2.3 2.4 2.5 2.6 **2.8 2.7** 2.9 2.10 2.11. Filter
    15 then stamps `order` from the array, so the field recorded the wrong
    sequence too, and every consumer that trusts it - enrichment, the avatar,
    RAG citations - inherited the mistake.

    Position is resolved from the source three ways, in order of reliability:
    the section's numbered heading, its title as a heading, then where its
    content actually appears. A section that matches none of them keeps its
    place relative to the section before it, so nothing is shuffled blindly.
    """
    if not sections or not source_md:
        return sections

    headings = iter_source_headings(source_md)
    by_number: Dict[str, int] = {}
    by_title: Dict[str, int] = {}
    for start, _end, text in headings:
        m = re.match(r'^(' + _SECNUM + r')\s*(.*)$', text)
        if m:
            by_number.setdefault(m.group(1), start)
            key = re.sub(r"[^a-z0-9]+", "", m.group(2).lower())
        else:
            key = re.sub(r"[^a-z0-9]+", "", text.lower())
        if key:
            by_title.setdefault(key, start)

    norm_src = re.sub(r"\s+", " ", source_md).lower()

    def _position(sec: Dict[str, Any]) -> Optional[int]:
        sid = str(sec.get("id") or "").strip()
        m = re.match(r'^(' + _SECNUM + r')\b', sid)
        if m and m.group(1) in by_number:
            return by_number[m.group(1)]
        title = str(sec.get("title") or "").strip()
        m2 = re.match(r'^\s*(' + _SECNUM + r')\b', title)
        if m2 and m2.group(1) in by_number:
            return by_number[m2.group(1)]
        key = re.sub(r"[^a-z0-9]+", "",
                     re.sub(r'^\s*' + _SECNUM + r'\s*', '', title).lower())
        if key and key in by_title:
            return by_title[key]
        probe = re.sub(r"\s+", " ", str(sec.get("content") or "")).strip().lower()[:80]
        if len(probe) > 30:
            found = norm_src.find(probe)
            if found >= 0:
                return found
        return None

    def _sort(secs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not secs:
            return secs
        decorated = []
        last = -1
        for i, sec in enumerate(secs):
            pos = _position(sec) if isinstance(sec, dict) else None
            if pos is None:
                pos = last          # unknown: stay with the section before it
            else:
                last = pos
            decorated.append((pos, i, sec))
        decorated.sort(key=lambda t: (t[0], t[1]))     # stable on ties
        ordered = [sec for _, _, sec in decorated]
        for sec in ordered:
            if isinstance(sec, dict):
                for key in ("sub_sections", "subsections", "sections"):
                    if isinstance(sec.get(key), list):
                        sec[key] = _sort(sec[key])
        return ordered

    before = [id(x) for x in sections]
    out = _sort(sections)
    if [id(x) for x in out] != before:
        logger.info("[Order] Sections re-sorted into textbook order")
    return out


def coerce_section_content(sections: Any) -> Any:
    """Force every section's scalar fields to strings, in place.

    The model returns a worked example's content as an OBJECT rather than text:
    {"content": {"solution": "We see that 6 boxes are required..."}}. Every
    consumer downstream assumes a string, so this one shape took out the whole
    run - re.sub() raised "expected string or bytes-like object, got 'dict'" in
    the chunk merge, which fell back to CHUNK 1 ONLY and silently discarded five
    of six chunks, and then the verification graph died on .strip().

    Nothing is thrown away: a dict's values are flattened into the text, and a
    recognised "solution" is preserved in metadata where the rest of the
    pipeline already looks for it.
    """
    def _flatten(value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        if isinstance(value, (int, float, bool)):
            return str(value)
        if isinstance(value, list):
            return "\n\n".join(_flatten(v) for v in value if v is not None).strip()
        if isinstance(value, dict):
            parts = []
            for key, val in value.items():
                text = _flatten(val)
                if not text:
                    continue
                # A bare wrapper key adds nothing; a labelled one keeps its label.
                if key in ("content", "text", "value"):
                    parts.append(text)
                else:
                    parts.append(f"{str(key).replace('_', ' ').title()}: {text}")
            return "\n\n".join(parts).strip()
        return str(value)

    fixed = [0]

    def _walk(secs: Any) -> None:
        if not isinstance(secs, list):
            return
        for i, sec in enumerate(secs):
            if not isinstance(sec, dict):
                # A section that is a bare string (or number) crashes the chunk
                # merge on section.get(), and the merge then falls back to CHUNK
                # 1 ONLY - one run lost 3 of 6 chunks and audited 19/119
                # headings because of a single stray string. Keep the text; give
                # it the shape the rest of the pipeline requires.
                text = _flatten(sec)
                secs[i] = {"type": "other", "title": "", "content": text} if text.strip() else None
                fixed[0] += 1
                if secs[i] is None:
                    continue
                sec = secs[i]
            raw = sec.get("content")
            if raw is not None and not isinstance(raw, str):
                if isinstance(raw, dict) and isinstance(raw.get("solution"), str):
                    meta = sec.get("metadata")
                    if not isinstance(meta, dict):
                        meta = {}
                        sec["metadata"] = meta
                    meta.setdefault("solution", raw["solution"])
                sec["content"] = _flatten(raw)
                fixed[0] += 1
            for key in ("title", "type", "id"):
                val = sec.get(key)
                if val is not None and not isinstance(val, str):
                    sec[key] = _flatten(val)
                    fixed[0] += 1
            for child in ("sub_sections", "subsections", "sections"):
                _walk(sec.get(child))
        if any(s is None for s in secs):
            secs[:] = [s for s in secs if s is not None]

    _walk(sections)
    if fixed[0]:
        logger.warning(
            f"[Schema] Coerced {fixed[0]} non-string field(s) to text — the model "
            f"returned an object where the schema requires a string"
        )
    return sections


# OpenRouter reports a provider by DISPLAY NAME in errors ("Google") but routes
# by SLUG ("google-vertex"). Excluding the display name is silently a no-op —
# it matches nothing — so a rate-limited Google was never actually excluded.
_PROVIDER_SLUG_FALLBACK = {
    "google": "google-vertex",
    "google ai studio": "google-ai-studio",
    "google vertex": "google-vertex",
    "amazon bedrock": "amazon-bedrock",
    "azure": "azure",
}
_provider_slug_cache: Dict[str, str] = {}


def _provider_slug(display_name: str) -> str:
    """Routing slug for a provider's display name, from OpenRouter itself."""
    key = (display_name or "").strip().lower()
    if not key:
        return ""
    if _provider_slug_cache:
        return _provider_slug_cache.get(key, _PROVIDER_SLUG_FALLBACK.get(key, key))
    try:
        data = requests.get("https://openrouter.ai/api/v1/providers", timeout=15).json()
        for entry in data.get("data", []):
            name = str(entry.get("name") or "").strip().lower()
            slug = str(entry.get("slug") or "").strip()
            if name and slug:
                _provider_slug_cache[name] = slug
    except Exception as e:
        logger.debug(f"provider slug lookup failed ({type(e).__name__}: {e}) — using fallback map")
    return _provider_slug_cache.get(key, _PROVIDER_SLUG_FALLBACK.get(key, key))


def _provider_from_error(resp) -> Optional[str]:
    """The upstream provider named in an OpenRouter error, if it named one.

    A 429 from OpenRouter carries the culprit in
    error.metadata.provider_name ("DeepInfra"). Retrying without using that is
    how a run burned all three attempts against the same overloaded pool while
    two other providers sat idle.
    """
    try:
        meta = (resp.json().get("error") or {}).get("metadata") or {}
    except Exception:
        return None
    name = meta.get("provider_name")
    if not name:
        return None
    slug = _provider_slug(str(name))
    if slug and slug != str(name).strip().lower():
        logger.debug(f"provider {name!r} -> routing slug {slug!r}")
    return slug or None


_model_provider_count_cache: Dict[str, int] = {}


def _provider_count(model: str) -> int:
    """How many providers serve this model. 0 when unknown."""
    if model in _model_provider_count_cache:
        return _model_provider_count_cache[model]
    count = 0
    try:
        url = f"https://openrouter.ai/api/v1/models/{model}/endpoints"
        data = requests.get(url, timeout=15).json().get("data") or {}
        count = len(data.get("endpoints") or [])
    except Exception as e:
        logger.debug(f"provider count lookup failed for {model}: {type(e).__name__}: {e}")
    _model_provider_count_cache[model] = count
    return count


def _exclude_provider(payload: Dict[str, Any], provider_slug: str) -> Dict[str, Any]:
    """Route around `provider_slug` — unless that would leave nothing serving.

    Llama 4 Scout has only three providers. Excluding one on every 429 empties
    the pool fast, and an empty pool is a hard failure rather than a slow one:
    excluding both DeepInfra and Google left Novita alone, and 3 of 4 probe
    calls then returned 429 instead of being served by someone else. So keep at
    least one provider in play and let backoff handle the rest.
    """
    provider = dict(payload.get("provider") or {})
    ignore = list(provider.get("ignore") or [])
    if provider_slug in ignore:
        return payload

    total = _provider_count(str(payload.get("model") or ""))
    if total and len(ignore) + 1 >= total:
        logger.warning(
            f"[Route] not excluding {provider_slug} — it is the last of "
            f"{total} provider(s) still in play; backing off instead"
        )
        return payload

    ignore.append(provider_slug)
    provider["ignore"] = ignore
    provider["allow_fallbacks"] = True
    # An explicit order would fight the exclusion, so drop it for the retry.
    provider.pop("order", None)
    return {**payload, "provider": provider}


def _merge_untitled_continuations(
    sections: List[Dict[str, Any]],
    source_md: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fold untitled prose/other blocks into the section they continue.

    The LLM emits body text that runs on after a heading as its OWN top-level
    entry with no title. A maths derivation came back as six orphans of 23-124
    chars ("$S_n(r-1) = a(r^n - 1)$"), cut off from the section that gives them
    meaning. Downstream that produces titleless RAG chunks and debate topics
    generated against "Untitled".

    Parenting is by position in the SOURCE markdown, not array order: the
    multi-chunk merge reorders sections, so the entry preceding an orphan in the
    list is often not the one preceding it in the book. Without source_md the
    array order is all there is, so fall back to it.

    A titled prose section is left alone — in English books that is the reading
    passage itself, not a continuation.
    """
    if not sections:
        return sections

    _MERGEABLE = {"prose", "other"}
    # _NUMBERED_SECTION_RE lives inside _postprocess_sections; rebuild it here
    # from the shared _SECNUM so this helper stands on its own.
    numbered_re = re.compile(r'^(' + _SECNUM + r')(?:\s|$)')

    def _is_orphan(sec: Dict[str, Any]) -> bool:
        return (
            sec.get("type") in _MERGEABLE
            and not (sec.get("title") or "").strip()
            and not numbered_re.match(str(sec.get("id") or "").strip())
            and not sec.get("metadata")          # English prose carries author/genre
            and bool((sec.get("content") or "").strip())
        )

    def _norm(text: str) -> str:
        return re.sub(r"\s+", " ", text or "").strip().lower()

    # Whitespace-collapsed source plus a map back to real offsets, so a block's
    # text can be located regardless of how the OCR wrapped it.
    norm_src = ""
    norm_to_src: List[int] = []
    if source_md:
        buf: List[str] = []
        prev_space = False
        for idx, ch in enumerate(source_md):
            if ch.isspace():
                if not prev_space:
                    buf.append(" ")
                    norm_to_src.append(idx)
                prev_space = True
            else:
                buf.append(ch.lower())
                norm_to_src.append(idx)
                prev_space = False
        norm_src = "".join(buf)

    def _source_pos(text: str) -> int:
        """Offset of `text` in the original markdown, or -1."""
        needle = _norm(text)[:60]
        if not norm_src or not needle:
            return -1
        found = norm_src.find(needle)
        return norm_to_src[found] if found >= 0 else -1

    # Parent headings are located by their NUMBER on a markdown heading line —
    # "## 2.5 Modular Arithmetic". Searching the bare title instead matched its
    # first mention anywhere (a learning outcome, or "...and Modular Arithmetic"
    # inside a deeper heading), which parented blocks to the wrong section.
    heading_pos: Dict[str, int] = {}
    if source_md:
        for m in re.finditer(
            r'(?m)^[ 	]{0,3}#{1,6}[ 	]*\**[ 	]*(' + _SECNUM + r')\b', source_md
        ):
            heading_pos.setdefault(m.group(1), m.start())

    # Position every candidate parent once.
    parents: List[Dict[str, Any]] = []
    for sec in sections:
        if sec.get("type") == "section" and numbered_re.match(
            str(sec.get("id") or "").strip()
        ):
            parents.append(sec)
    if not parents:
        return sections

    parent_pos: Dict[int, int] = {}
    for parent in parents:
        raw_id = str(parent.get("id") or "").strip()
        pid = raw_id.split()[0] if raw_id else ""
        pos = heading_pos.get(pid, -1)
        if pos < 0:                       # heading not in source — fall back to title
            pos = _source_pos(parent.get("title") or "")
        parent_pos[id(parent)] = pos

    out: List[Dict[str, Any]] = []
    last_parent_seen: Optional[Dict[str, Any]] = None
    merged_count = 0

    for sec in sections:
        if sec is not None and sec.get("type") == "section" and numbered_re.match(
            str(sec.get("id") or "").strip()
        ):
            last_parent_seen = sec

        if not _is_orphan(sec):
            out.append(sec)
            continue

        content = (sec.get("content") or "").strip()
        target = None

        pos = _source_pos(_norm(content))
        if pos >= 0:
            # Nearest heading that starts before this text in the book.
            best = -1
            for parent in parents:
                ppos = parent_pos[id(parent)]
                if 0 <= ppos < pos and ppos > best:
                    best, target = ppos, parent
        if target is None:
            target = last_parent_seen

        if target is None:
            out.append(sec)               # nothing to attach to — keep standalone
            continue

        parent_content = (target.get("content") or "").strip()
        snippet = _norm(content)[:200]
        already_there = len(snippet) > 20 and snippet in _norm(parent_content)
        if not already_there:
            target["content"] = (parent_content + "\n\n" + content).strip()

        for url in sec.get("image_urls") or []:
            urls = target.setdefault("image_urls", [])
            if url not in urls:
                urls.append(url)
        merged_count += 1

    if merged_count:
        logger.info(
            f"[Continuations] Folded {merged_count} untitled block(s) into the "
            f"section they continue"
        )
    return out


def _section_text_volume(sections: Any) -> int:
    """Characters of real content in a section tree, sub_items included."""
    total = 0
    if isinstance(sections, dict):
        for key, value in sections.items():
            if isinstance(value, str) and key in (
                "content", "text", "title", "question", "answer", "solution"
            ):
                total += len(value)
            else:
                total += _section_text_volume(value)
    elif isinstance(sections, list):
        for item in sections:
            total += _section_text_volume(item)
    return total


def _stage_stats(label: str, sections: Any, trace: List[Tuple[str, int, int]]) -> None:
    """Record section count and text volume at one post-processing stage.

    The filters between them reduced 79 extracted sections to 18 on a real
    chapter. Some of that is legitimate overlap dedup and some may not be, and
    with no per-stage numbers the two are indistinguishable.
    """
    trace.append((label, len(sections or []), _section_text_volume(sections or [])))


def _log_stage_trace(trace: List[Tuple[str, int, int]]) -> None:
    """Report the per-stage trace, loudly when the pipeline ate the content."""
    if len(trace) < 2:
        return
    first_n, first_v = trace[0][1], trace[0][2]
    last_n, last_v = trace[-1][1], trace[-1][2]
    if first_v <= 0:
        return
    kept = 100.0 * last_v / first_v
    line = "  ".join(f"{lbl}:{n}/{v:,}" for lbl, n, v in trace)
    logger.info(f"[Postprocess] sections/chars by stage - {line}")
    if kept < 80.0:
        worst, drop = None, 0
        for i in range(1, len(trace)):
            lost = trace[i - 1][2] - trace[i][2]
            if lost > drop:
                worst, drop = trace[i][0], lost
        logger.warning(
            f"[Postprocess] WARNING: kept {kept:.0f}% of extracted text "
            f"({first_v:,} -> {last_v:,} chars, {first_n} -> {last_n} sections); "
            f"largest single drop at '{worst}' (-{drop:,} chars)"
        )


def _strip_duplicated_heading_block(
    content: str,
    heading_pattern: str,
    reference: str,
) -> str:
    """Remove a heading block from `content` only if it duplicates `reference`.

    The previous form was an unbounded ``re.sub`` with DOTALL and a
    ``(?=\\n#+|\\Z)`` lookahead: when the block was the LAST heading in the
    section, ``.*?`` ran to the end of the string and deleted every remaining
    character. On one Social Science unit that silently destroyed 9,523 of
    17,063 characters — content that appeared nowhere else in the output.

    Now each candidate span is checked against the standalone section that is
    supposed to already hold it, and only a genuine duplicate is dropped.
    """
    if not content or not reference:
        return content

    ref_norm = re.sub(r"\s+", " ", reference).strip().lower()
    if not ref_norm:
        return content

    pattern = re.compile(heading_pattern + r"(.*?)(?=\n#+|\Z)", re.IGNORECASE | re.DOTALL)

    out, cursor, removed = [], 0, 0
    for m in pattern.finditer(content):
        body = re.sub(r"\s+", " ", m.group(1) or "").strip().lower()
        # Short bodies are headings with nothing under them - safe to drop.
        # Longer ones must actually appear in the standalone section.
        probe = body[:120]
        duplicate = (not body) or (len(probe) > 20 and probe in ref_norm)
        if not duplicate:
            continue
        out.append(content[cursor:m.start()])
        cursor = m.end()
        removed += 1
    if not removed:
        return content
    out.append(content[cursor:])
    return "\n".join(part for part in out if part is not None)


def _postprocess_sections(
    sections: List[Dict[str, Any]],
    source_md: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Clean up common LLM extraction issues:
    1. Remove empty chapter/unit title-only sections
    2. Split 'Solution:' from example content into metadata.solution
    """
    _trace: List[Tuple[str, int, int]] = []
    _stage_stats("extracted", sections, _trace)

    cleaned = []

    # Rescue any sections still trapped inside sibling dicts (idempotent —
    # merge_extracted_chunks already hoists, this covers direct callers)
    sections = _hoist_nested_sections(sections)

    # Merge orphan Roman-numeral exercise groups (I., II., III.) back into the
    # Evaluation section's sub_items BEFORE heading-level nesting, so these
    # sections don't accidentally become h1_parent placeholders for siblings.
    sections = _collapse_orphan_exercise_groups(sections)

    # For unnumbered textbooks (Social Science/History/Geography), re-nest
    # H2 sections under their H1 parent using source_md heading levels.
    # Safe no-op for numbered textbooks (level_map will be empty).
    if source_md:
        sections = _nest_sections_by_heading_level(sections, source_md)

    for section in sections:
        stype = section.get("type", "")
        title = (section.get("title") or "").strip()


        # Normalize mangled ids like "2.4 Fundamental Theorem of Arithmetic":
        # numeric part -> id, text part -> title (when title is empty)
        sid_raw = str(section.get("id") or "").strip()
        m_idtext = re.match(r'^(' + _SECNUM + r')\s+(\S.*)$', sid_raw)
        if m_idtext:
            section["id"] = m_idtext.group(1)
            if not title:
                title = m_idtext.group(2).strip()
                section["title"] = title

        # Unnumbered headings ("Summary", "Glossary", "Evaluation") routinely
        # come back with the heading text in `id` and title left null — the
        # section then renders untitled, and prose in `id` corrupts the dedup
        # and hierarchy keys, which are numeric. The heading text is the title.
        elif not title and sid_raw and not re.match(r'^[A-Za-z]?\d', sid_raw) and len(sid_raw) <= 80:
            title = sid_raw
            section["title"] = title
            section["id"] = ""

        # Some types (prose, poem) carry their heading in metadata instead.
        # Without this the section reaches the avatar and the TTS pass as an
        # untitled block — the "Audio for section: None" lines in the log.
        if not title:
            meta_title = str((section.get("metadata") or {}).get("title") or "").strip()
            if meta_title and len(meta_title) <= 120:
                title = meta_title
                section["title"] = title

        # Labelled entities (Exercise 2.4, Example 2.54, Activity 3, Theorem 5,
        # Illustration 2) must NEVER hold a bare dotted number as their id —
        # that number belongs to the real section 2.4/2.54 and corrupts gap
        # detection, dedup and hierarchy building. Re-key them to their label.
        # The label word also decides the TYPE: LLMs regularly emit
        # "Example 2.7" as type='exercise' (which blocks nesting) — the printed
        # label always wins over a wrong/generic type.
        _LABEL_TYPE_MAP = {
            "exercise": "exercise", "example": "example", "activity": "activity",
            "theorem": "theorem", "illustration": "illustration", "problem": "example",
        }
        _RETYPABLE = {"", "section", "prose", "other",
                      "exercise", "example", "activity", "theorem", "illustration"}
        m_label = re.match(
            r'^(Exercise|Example|Activity|Theorem|Illustration|Problem)s?\s+([A-Za-z]?\d+(?:\.\d+)*)\s*$',
            title, re.IGNORECASE,
        )
        if m_label:
            label_word = m_label.group(1).lower()
            label_type = _LABEL_TYPE_MAP[label_word]
            sid_now = str(section.get("id") or "").strip()
            if re.match(r'^[A-Za-z]?\d+(?:\.\d+)*$', sid_now) or not sid_now:
                section["id"] = title
            if stype in _RETYPABLE and stype != label_type:
                section["type"] = label_type
                stype = label_type

        # Pedagogy boxes: retype by title so they nest under their parent
        # section with a proper display title (user-visible: "Do You Know",
        # "Thinking Corner", "Progress Check", ...).
        _BOX_TITLE_TYPES = {
            "progress check":  "progress_check",
            "thinking corner": "thinking_corner",
            "do you know":     "do_you_know",
            "more to know":    "more_to_know",
            "try this":        "try_this",
            "note":            "note",
        }
        _BOX_DISPLAY_TITLES = {
            "progress_check":  "Progress Check",
            "thinking_corner": "Thinking Corner",
            "do_you_know":     "Do You Know",
            "more_to_know":    "More to Know",
            "try_this":        "Try This",
            "note":            "Note",
        }
        t_norm_box = re.sub(r'[^a-z\s]', '', title.lower()).strip()
        # 'exercise'/'example' included: LLMs regularly mistype pedagogy boxes
        # (e.g. "Thinking Corner" as type='exercise') — the printed title wins.
        if t_norm_box in _BOX_TITLE_TYPES and stype in (
                "", "section", "prose", "other", "exercise", "example"):
            stype = _BOX_TITLE_TYPES[t_norm_box]
            section["type"] = stype
        if stype in _BOX_DISPLAY_TITLES and not title:
            title = _BOX_DISPLAY_TITLES[stype]
            section["title"] = title

        # Back matter: a heading the whole book uses the same way. LLMs often
        # emit these as a plain 'section', which drops them out of every
        # type-based filter (enrichment skips, exercise rendering, RAG
        # content_type). The printed heading is unambiguous — let it decide.
        _BACKMATTER_TITLE_TYPES = {
            "summary":             "summary",
            "points to remember":  "summary",
            "glossary":            "glossary",
            "evaluation":          "exercise",
            "references":          "reference_books",
            "reference books":     "reference_books",
            "suggested reading":   "reference_books",
            "ict corner":          "ict_corner",
        }
        t_norm_back = re.sub(r'[^a-z\s]', '', title.lower()).strip()
        if t_norm_back in _BACKMATTER_TITLE_TYPES and stype in ("", "section", "prose", "other"):
            stype = _BACKMATTER_TITLE_TYPES[t_norm_back]
            section["type"] = stype

        # The introduction is ordinary body content — the title already says
        # what it is, and a separate type drops it out of every section-based
        # filter downstream (RAG content_type, section rendering). Validation
        # treats the two identically (same required fields, same min length).
        if stype == "introduction":
            stype = "section"
            section["type"] = stype
            if not title:
                title = "Introduction"
                section["title"] = title

        # Strip section number prefixes (e.g. "2.1 Introduction" -> "Introduction")
        if title:
            # Before stripping, recover the section number into "id" if the LLM
            # left it only in the title — the hierarchy builder keys off "id".
            m_num = re.match(r'^\s*(' + _SECNUM + r')\b', title)
            existing_id = str(section.get("id") or "").strip()
            if m_num and not re.match(r'^' + _SECNUM, existing_id):
                section["id"] = m_num.group(1)
            title = re.sub(r'^\s*' + _SECNUM + r'\s*[-–:]?\s*', '', title).strip()
            section["title"] = title
        raw_content = section.get("content") or ""
        if isinstance(raw_content, list):
            raw_content = " ".join(str(item) for item in raw_content)
        content = str(raw_content).strip()

        # --- Filter 1: Remove empty chapter/unit header sections ---
        if not content and not section.get("sub_items"):
            # Check if title is just "CHAPTER 1" or "NUMBER SYSTEMS" with no content
            if _CHAPTER_HEADER_RE.match(title):
                continue
            # Also skip if title exactly matches the unit/chapter title (duplicate)
            # These have empty content and no sub_items
            if stype == "section" and not content and len(title.split()) <= 4:
                # Check for bare titles like "NUMBER SYSTEMS", "ALGEBRA", etc.
                # that are just chapter name repeated
                if title.isupper() or _CHAPTER_HEADER_RE.match(title):
                    continue

        # --- Filter 2: Split interleaved Examples/Theorems/boxes from Section content ---
        # Sometimes LLMs dump an example into the 'content' of a 'section' type.
        if stype == "section" and content:
            # Matches numbered entities ("Example X", "Theorem X", "Exercise X",
            # "Activity X", "Problem X", "Illustration X") and un-numbered pedagogy
            # boxes ("Progress Check", "Thinking Corner", "Do You Know") at the
            # start of a line — with optional markdown #/** wrappers from OCR.
            split_pat = (
                r'(?:\n\s*|\A)(?:#{1,6}\s*)?\*{0,2}'
                r'((?:Example|Theorem|Exercise|Activity|Problem|Illustration)\s+\d+(?:\.\d+)*'
                r'|Progress\s+Check|Thinking\s+Corner|Do\s+You\s+Know'
                r')\*{0,2}[:.]?[ \t]*'
            )
            parts = re.split(split_pat, content, flags=re.IGNORECASE)

            if len(parts) > 1:
                # Part 0: Text before the first interleaved heading
                first_part = parts[0].strip()
                if first_part or section.get("sub_items"):
                    section["content"] = first_part
                    cleaned.append(section)

                # Parts 1, 2, 3... are h_text, c_text pairs
                for i in range(1, len(parts), 2):
                    h_text = parts[i].strip()
                    c_text = parts[i+1].strip()
                    h_lower = h_text.lower()
                    h_type = "example" if "example" in h_lower or "problem" in h_lower else \
                             "theorem" if "theorem" in h_lower else \
                             "activity" if "activity" in h_lower else \
                             "illustration" if "illustration" in h_lower else \
                             "progress_check" if "progress" in h_lower else \
                             "thinking_corner" if "thinking" in h_lower else \
                             "do_you_know" if "do you know" in h_lower else "exercise"

                    new_sec = {
                        "type": h_type,
                        "id": h_text,
                        "title": h_text,
                        "content": c_text,
                        "metadata": {},
                        "sub_items": []
                    }
                    # Apply solution split (Filter 3 logic) manually here for examples
                    if h_type == "example":
                        question, solution = _split_example_solution(c_text)
                        if solution:
                            new_sec["content"] = question
                            new_sec["metadata"]["solution"] = solution
                    
                    cleaned.append(new_sec)
                continue # Skip the default append for this section

        # --- Filter 3: Split Solution from example content ---
        if stype == "example":
            metadata = section.get("metadata") or {}
            # Check if solution is already properly separated
            if not metadata.get("solution"):
                question_part, solution_part = _split_example_solution(content)
                if question_part and solution_part:
                    section["content"] = question_part
                    metadata["solution"] = solution_part
                    section["metadata"] = metadata

        # --- Filter 4: Deduplicate sub_items by content ---
        sub_items = section.get("sub_items", [])
        if sub_items and len(sub_items) > 1:
            seen_content = {}
            deduped = []
            for sub in sub_items:
                sub_content = (sub.get("content") or "")[:200].strip()
                if not sub_content:
                    deduped.append(sub)
                    continue
                # Normalize: strip page markers and whitespace for comparison
                fingerprint = re.sub(r'<!--.*?-->', '', sub_content).strip()
                fingerprint = re.sub(r'\s+', ' ', fingerprint)[:150]
                if fingerprint not in seen_content:
                    seen_content[fingerprint] = len(deduped)
                    deduped.append(sub)
                # else: skip duplicate
            if len(deduped) < len(sub_items):
                section["sub_items"] = deduped

        # --- Filter 5: Convert list content to string ---
        if isinstance(section.get("content"), list):
            section["content"] = "\n".join(str(item) for item in section["content"])

        # --- Filter 7: Strip embedded blueprint/chapter headers from content ---
        # OCR sometimes leaves ALL-CAPS book/section headers inline in content text
        # e.g. "GEOGRAPHY AS A DISCIPLINE", "FUNDAMENTALS OF PHYSICAL GEOGRAPHY"
        # These are navigation headers, not actual content.
        section_content = section.get("content") or ""
        if section_content:
            # Match standalone ALL-CAPS lines (3+ words) surrounded by paragraph breaks
            # Preserves ALL-CAPS abbreviations (1-2 words) and inline caps
            cleaned_content = re.sub(
                r'(?:^|\n\n)\s*([A-Z][A-Z\s]{8,}[A-Z])\s*(?:\n\n|$)',
                '\n\n',
                section_content
            )
            # Also strip ```markdown ... ``` fenced blocks that wrap bare headers
            cleaned_content = re.sub(
                r'```markdown\s*\n(?:[A-Z][A-Z\s:]+\n)+(?:.*?\n)*?```',
                '\n\n',
                cleaned_content,
                flags=re.DOTALL
            )
            cleaned_content = re.sub(r'\n{3,}', '\n\n', cleaned_content).strip()
            if cleaned_content != section_content.strip():
                section["content"] = cleaned_content

        # --- Filter 8: Deduplicate sub_items against parent content ---
        # If a sub_item's content already appears as a substring of the parent
        # section's content field, remove it to prevent duplication.
        sub_items = section.get("sub_items", [])
        parent_content = (section.get("content") or "").strip()
        if sub_items and parent_content:
            # Normalize parent content for fuzzy matching
            parent_normalized = re.sub(r'\s+', ' ', parent_content).lower()
            filtered_subs = []
            for sub in sub_items:
                sub_content = (sub.get("content") or "").strip()
                if not sub_content:
                    filtered_subs.append(sub)
                    continue
                # Normalize sub content
                sub_normalized = re.sub(r'\s+', ' ', sub_content).lower()
                # Check if the sub_item content is a substantial substring of parent
                # Use first 100 chars to avoid false negatives from minor differences
                sub_snippet = sub_normalized[:100]
                if len(sub_snippet) > 20 and sub_snippet in parent_normalized:
                    # This sub_item's content is already in the parent — skip it
                    continue
                filtered_subs.append(sub)
            if len(filtered_subs) < len(sub_items):
                section["sub_items"] = filtered_subs

        # --- Filter 9: Clean Learning Objectives content ---
        if stype == "learning_objectives" and content:
            # Strip unrelated text, formulas, or images that precede the actual objectives heading/list.
            lines = content.split('\n')
            start_idx = -1
            for idx, line in enumerate(lines):
                s = line.strip()
                # Check for explicit heading
                if re.search(r'(?i)(?:^|#+\s*)Learning\s+Objectives?', s):
                    start_idx = idx
                    break
                # Check for intro phrase
                if re.search(r'(?i)After\s+(?:studying|completing|learning)\s+this\s+(?:unit|lesson|chapter|topic|book)', s):
                    start_idx = idx
                    break
            # If not found by heading/intro phrase, look for the first bullet point
            if start_idx == -1:
                for idx, line in enumerate(lines):
                    s = line.strip()
                    # Must be a list item starting with a bullet/number and space (e.g. '- ', '* ', '1. ')
                    if re.match(r'^\s*[-*•]\s+', s) or re.match(r'^\s*\d+\.\s+', s):
                        start_idx = idx
                        break
            if start_idx > 0:
                cleaned_lines = lines[start_idx:]
                section["content"] = "\n".join(cleaned_lines).strip()
                content = section["content"]

        cleaned.append(section)

    _stage_stats("cleaned", cleaned, _trace)

    # --- Filter 6: Merge orphan sections and build hierarchy ---
    # Convert sequential subsections (e.g. 1.1.1) into nested subsections of their parent (1.1).
    _BACK_MATTER_TYPES = {
        "summary", "glossary", "unit_exercise", "multiple_choice",
        "reference_books", "ict_corner", "map_work", "timeline",
    }
    
    merged = []
    # Keeps track of the last seen section at each level: {1: section_dict, 2: section_dict, ...}
    # Level 1: "1.1", Level 2: "1.1.1", etc.
    active_parents = {}
    
    for section in cleaned:
        sid = str(section.get("id", "")).strip()
        stype = section.get("type", "")

        # Determine level based on the count of dots in the ID (e.g., "1.1" -> 1 dot -> Level 1 main section. "1.1.1" -> 2 dots -> Level 2)
        # If it's a chapter word or pure number, it's Level 0.
        level = 0
        if sid and re.match(r'^(?:\d+\s+)?' + _SECNUM + r'$', sid.split()[0]):
            level = sid.split()[0].count('.')
        elif _CHAPTER_HEADER_RE.match(sid):
            level = 0
            
        # Types that appear inline between sections and should NOT reset the hierarchy
        _INLINE_TYPES = {
            "activity", "example", "exercise", "note", "do_you_know", "more_to_know",
            "try_this", "thinking_corner", "progress_check", "illustration",
        }

        if stype in _BACK_MATTER_TYPES:
            active_parents = {} # Reset
            merged.append(section)
        elif stype in _INLINE_TYPES:
            # Inline content: append but do NOT modify active_parents hierarchy
            merged.append(section)

        else:
            # Top-level main section (like 1.1) or non-numbered section
            merged.append(section)
            if level > 0:
                # Only numbered sections (N.M pattern) register as parents
                # and clear deeper active parents
                active_parents[level] = section
                keys_to_remove = [k for k in active_parents if k > level]
                for k in keys_to_remove:
                    del active_parents[k]
            # Non-numbered sections (level=0) like "Problem 1.3", "ACTIVITY 2"
            # do NOT modify active_parents — they are inline content that
            # should not break the parent-child hierarchy for numbered sections


    _stage_stats("hierarchy", merged, _trace)

    # --- Filter 9: Deduplicate sections with the same title ---
    # When content is chunked, overlapping chunks can produce duplicate sections.
    # We only want to merge them if they represent the same section. If they are disjoint
    # running headers, we should discard the fake header and append the orphaned text to the previous section.
    deduped = []
    title_index = {}  # normalized title -> index in deduped list
    id_index = {}     # section id -> index in deduped list
    for section in merged:
        # str(): an LLM occasionally returns a bare integer id (id: 3), and the
        # AttributeError it raised here was swallowed by the caller's blanket
        # except — silently skipping every filter in this pass for that unit.
        title_raw = str(section.get("title") or "").strip()
        title_norm = re.sub(r'\s+', ' ', title_raw).lower()
        section_id = str(section.get("id") or "").strip()
        
        if not title_norm and not section_id:
            deduped.append(section)
            continue

        # Check for ID-based or title-based duplicate
        is_id_dup = section_id and section_id in id_index
        is_title_dup = title_norm and title_norm in title_index

        if not is_id_dup and not is_title_dup:
            # First occurrence -- keep it
            if title_norm:
                title_index[title_norm] = len(deduped)
            if section_id:
                id_index[section_id] = len(deduped)
            deduped.append(section)
        else:
            # Duplicate occurrence (by id or title)
            first_idx = id_index.get(section_id) if is_id_dup else title_index.get(title_norm)
            first_sec = deduped[first_idx]
            
            first_content = (first_sec.get("content") or "").strip()
            dup_content = (section.get("content") or "").strip()
            dup_subs = section.get("sub_items") or []
            
            if dup_content:
                # Check for overlap
                dup_first_100 = re.sub(r'\s+', ' ', dup_content[:100]).strip()
                first_normalized = re.sub(r'\s+', ' ', first_content)
                
                if dup_first_100 in first_normalized:
                    # It's an overlap! The dup_content is just a continuation or repeating
                    # We only append what wasn't already in first_content.
                    # As a safe heuristic, if the duplicate adds significant new text at the end, append it
                    if len(dup_content) > len(first_content) * 0.8:
                        pass # too complex to safely merge without duplicating
                    
                    # Merge sub_items into the first occurrence
                    if dup_subs:
                        first_subs = first_sec.get("sub_items") or []
                        first_subs.extend(dup_subs)
                        first_sec["sub_items"] = first_subs
                else:
                    # It's disjoint text.
                    stype = section.get("type", "")
                    # A SPECIFIC numbered label ("Exercise 2.9", "Example 2.44",
                    # "Unit Exercise - 2") names ONE entity — duplicates are the
                    # same exercise split across chunks (often one section per
                    # question). Merge them back into the first occurrence.
                    has_number = bool(re.search(r'\d', title_raw))
                    if stype in {"activity", "example", "exercise", "problem", "do_you_know",
                                 "note", "try_this", "thinking_corner", "progress_check",
                                 "illustration", "theorem"} and has_number:
                        if stype in ("exercise", "problem"):
                            # Each duplicate usually carries ONE question — file it
                            # as a sub_item of the canonical exercise section.
                            first_subs = first_sec.get("sub_items") or []
                            first_subs.append({
                                "number":  str(len(first_subs) + 1),
                                "content": dup_content,
                            })
                            if dup_subs:
                                first_subs.extend(dup_subs)
                            first_sec["sub_items"] = first_subs
                        else:
                            # Same-numbered example/theorem/illustration: keep the
                            # richer copy's content, merge metadata + sub_items.
                            if len(dup_content) > len(first_content):
                                first_sec["content"] = dup_content
                            dup_meta = section.get("metadata") or {}
                            first_meta = first_sec.get("metadata") or {}
                            for k, v in dup_meta.items():
                                if v and not first_meta.get(k):
                                    first_meta[k] = v
                            first_sec["metadata"] = first_meta
                            if dup_subs:
                                first_subs = first_sec.get("sub_items") or []
                                first_subs.extend(dup_subs)
                                first_sec["sub_items"] = first_subs
                    elif stype in {"activity", "example", "exercise", "problem", "do_you_know",
                                   "note", "try_this", "thinking_corner", "progress_check",
                                   "illustration", "theorem"}:
                        # Generic un-numbered box title ("Note", "Progress Check") —
                        # distinct content, keep as separate section.
                        deduped.append(section)
                    else:
                        # This means the LLM probably mistook a running header for a section.
                        # The content actually belongs to the section immediately preceding THIS duplicate!
                        if deduped:
                            prev_sec = deduped[-1]
                            # Append the orphaned text to the previous section's content
                            prev_content = (prev_sec.get("content") or "").strip()
                            prev_sec["content"] = prev_content + "\n\n" + dup_content if prev_content else dup_content
                            
                            # Merge sub_items into the previous section as well
                            if dup_subs:
                                prev_subs = prev_sec.get("sub_items") or []
                                prev_subs.extend(dup_subs)
                                prev_sec["sub_items"] = prev_subs
            else:
                # No dup_content, just merge sub_items into the first occurrence
                if dup_subs:
                    first_subs = first_sec.get("sub_items") or []
                    first_subs.extend(dup_subs)
                    first_sec["sub_items"] = first_subs

    # --- Filter 10: Nest inline items inside their parent numbered section ---
    # Activities, Problems, Examples, Notes, Do-You-Know boxes etc. that appear
    # between two numbered sections (e.g. between 1.2 and 1.3) belong to the
    # preceding section. We physically nest them inside the parent section's
    # "sub_sections" array so the UI can map section-by-section and get all
    # related content grouped together.
    # --- Filter 10: Nest inline items inside their parent numbered section ---
    # Pedagogy boxes (do_you_know, thinking_corner, progress_check, note, ...)
    # are KEPT and nested as titled sub_sections of the section they appear in
    # — they are real textbook content the UI must show.
    _DISCARD_TYPES: set = set()

    # NOTE: 'exercise' is intentionally excluded — exercises are always top-level
    # standalone sections and must never be nested as sub_sections of a numbered parent.
    _NESTABLE_TYPES = {
        "activity", "example", "illustration", "definition",
        "theorem", "proof", "corollary", "construction",
        "do_you_know", "thinking_corner", "progress_check",
        "note", "more_to_know", "try_this",
    }
    _BACK_MATTER_RESET = {
        "summary", "glossary", "unit_exercise", "multiple_choice",
        "reference_books", "ict_corner", "map_work", "timeline",
        "points_to_remember",
    }
    _NUMBERED_SECTION_RE = re.compile(r'^(' + _SECNUM + r')(?:\s|$)')

    # Promote subsections the LLM trapped as bare {number, content} sub_items
    # (e.g. 1.4's sub_items numbered 1.4.1..1.4.8) into proper child sections so
    # they nest instead of staying hidden inside the parent's sub_items list.
    deduped = promote_numbered_subitems_to_sections(deduped, source_md)

    # Recover numbered parents the LLM dropped (e.g. '1.4' kept only as
    # 1.4.1..1.4.8) so the builder below has something to nest the orphans
    # under, instead of surfacing every child as a top-level section.
    deduped = insert_missing_parent_sections(deduped, source_md)

    # Deterministic hierarchy builder — nests numbered sections at ANY depth
    # (1.3 → 1.3.1 → 1.3.1.2) purely from their "id" numbers, preserving
    # document order. A stack holds the currently-open section path; a new
    # numbered section pops the stack until the top is its numeric parent
    # prefix, then attaches there (or at top level).
    final: List[Dict[str, Any]] = []
    stack: List[tuple] = []   # [(number_str, section_dict), ...] open path
    # Sentinel prefix for a non-numbered container scope (e.g. "SOLVED
    # PROBLEMS"): never prefix-matches a real section number, so any following
    # numbered section pops it off cleanly.
    _CONTAINER = "\x00"

    def _attach_to_open(child: Dict[str, Any]) -> None:
        parent = stack[-1][1]
        parent.setdefault("sub_sections", []).append(child)

    for section in deduped:
        stype = section.get("type", "")
        sid = str(section.get("id", "")).strip()

        if stype == "section":
            m = _NUMBERED_SECTION_RE.match(sid)
            if m:
                num = m.group(1)
                # Pop until the open section is this number's parent prefix
                while stack and not num.startswith(stack[-1][0] + "."):
                    stack.pop()
                if stack:
                    _attach_to_open(section)
                else:
                    final.append(section)
                stack.append((num, section))
                continue

        if stype in _BACK_MATTER_RESET:
            stack = []
            final.append(section)
            continue

        # A non-numbered container section standing on its own (no numbered
        # scope open) — e.g. "SOLVED PROBLEMS" after "Points to Remember" —
        # opens a scope so the Problems/Examples printed under it nest inside
        # instead of floating up as sibling sections.
        #
        # The next non-numbered section CLOSES that scope: it is printed as a
        # sibling (it lands in `final` either way), so the examples that follow
        # it belong to IT, not to the container opened pages earlier. Leaving
        # the stale scope on the stack made every later example in a book with
        # no recognised numbering attach to the chapter's first section.
        if stype == "section":
            while stack and stack[-1][0] == _CONTAINER:
                stack.pop()
            if not stack:
                final.append(section)
                stack.append((_CONTAINER, section))
                continue

        # Inline entities (activities, examples, theorems...) belong to the
        # deepest section currently open — keeps textbook reading order.
        if stype in _NESTABLE_TYPES and stack:
            _attach_to_open(section)
            continue

        final.append(section)

    # Strip discarded types that arrived pre-nested from the LLM
    def _strip_discarded(secs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        kept = []
        for s in secs:
            if s.get("type", "") in _DISCARD_TYPES:
                continue
            if s.get("sub_sections"):
                s["sub_sections"] = _strip_discarded(s["sub_sections"])
            kept.append(s)
        return kept

    final = _strip_discarded(final)
    _stage_stats("deduped", final, _trace)

    # --- Filter 11: Recover missing sibling sections from bloated parent sections ---
    # If a section like 1.3 has sub_sections containing examples/illustrations that
    # belong to 1.4 or 1.5, we attempt to detect this by checking for sequential gaps.
    # E.g., if we see 1.3, then 1.6, we know 1.4 and 1.5 are missing.
    _SEC_NUM_RE = re.compile(r'^(\d+)\.(\d+)$')
    section_ids_in_final = []
    for s in final:
        if s.get("type") == "section":
            m = _SEC_NUM_RE.match(str(s.get("id", "")).strip())
            if m:
                section_ids_in_final.append((int(m.group(1)), int(m.group(2)), s))

    if section_ids_in_final:
        # Group by chapter prefix
        from collections import defaultdict
        by_chapter: Dict[int, List] = defaultdict(list)
        for ch, sec, s in section_ids_in_final:
            by_chapter[ch].append((sec, s))

        for ch, sec_list in by_chapter.items():
            sec_list.sort(key=lambda x: x[0])
            sec_nums = [s[0] for s in sec_list]
            # Find gaps
            if len(sec_nums) >= 2:
                for i in range(len(sec_nums) - 1):
                    gap_start = sec_nums[i] + 1
                    gap_end = sec_nums[i + 1]
                    if gap_end - gap_start > 0:
                        # There are missing sections between sec_nums[i] and sec_nums[i+1]
                        # Log the gap for debugging
                        missing = [f"{ch}.{n}" for n in range(gap_start, gap_end)]
                        logger.warning(f"Filter 11: Detected missing sections: {missing}")
                        logger.info(f"(gap between {ch}.{sec_nums[i]} and {ch}.{sec_nums[i+1]})")

    # --- Filter 12: Normalize image references ---
    # Raw markdown/HTML image tags are converted to inline "[Image: <name>]"
    # markers so each section/subsection's content records which stored image
    # belongs to it (binaries live in S3 at the unit level, never embedded).
    def _purge_images(sec: Dict[str, Any]) -> None:
        sec.pop('images', None)
        sec.pop('image_urls', None)
        content = sec.get('content')
        if isinstance(content, str) and ('![' in content or '<img' in content.lower()):
            content = strip_image_tags(content, keep_reference=True)
            sec['content'] = re.sub(r'\n{3,}', '\n\n', content).strip()
        for sub in sec.get('sub_sections') or []:
            if isinstance(sub, dict):
                _purge_images(sub)
        for item in sec.get('sub_items') or []:
            if isinstance(item, dict):
                item.pop('images', None)
                item.pop('image_urls', None)

    for section in final:
        _purge_images(section)

    # --- Filter 13: Merge non-numbered sub-heading sections into parent ---
    # For Social Science (and similar subjects), sub-headings under a main
    # numbered section (e.g. "Violent Forms of Nationalism" under 1.3) should
    # be merged into the parent section's content — not left as standalone
    # duplicate entries.
    _BACK_MATTER_MERGE = {
        "summary", "glossary", "unit_exercise", "multiple_choice",
        "reference_books", "ict_corner", "map_work", "timeline",
        "points_to_remember",
        # NOTE: 'exercise' removed — exercises are always standalone top-level sections
    }
    _STANDALONE_MERGE = {"introduction", "learning_objectives"} | _BACK_MATTER_MERGE

    merged_final = []
    current_numbered_parent = None

    for section in final:
        stype = section.get("type", "")
        sid = str(section.get("id", "")).strip()

        # Check if this is a numbered parent section (e.g. "1.1", "2.3")
        if stype == "section" and _NUMBERED_SECTION_RE.match(sid):
            current_numbered_parent = section
            merged_final.append(section)
            continue

        # Back-matter / standalone types reset parent tracking
        if stype in _STANDALONE_MERGE:
            current_numbered_parent = None
            merged_final.append(section)
            continue

        # Non-numbered section between two numbered parents → merge into parent
        if (current_numbered_parent is not None
                and stype == "section"
                and not _NUMBERED_SECTION_RE.match(sid)):
            child_content = (section.get("content") or "").strip()
            parent_content = (current_numbered_parent.get("content") or "").strip()
            child_title = (section.get("title") or "").strip()

            # Check if content is already in parent (duplicate from chunking)
            is_dup = False
            if child_content:
                child_snippet = re.sub(r'\s+', ' ', child_content[:200]).strip().lower()
                parent_norm = re.sub(r'\s+', ' ', parent_content).strip().lower()
                is_dup = len(child_snippet) > 20 and child_snippet in parent_norm

            if not is_dup and child_content:
                # Append content with sub-heading as markdown header
                if child_title:
                    addition = f"\n\n{child_title}\n\n{child_content}"
                else:
                    addition = f"\n\n{child_content}"
                current_numbered_parent["content"] = parent_content + addition

            # Always merge image_urls (child may have images parent doesn't)
            child_urls = section.get("image_urls", [])
            if child_urls:
                parent_urls = current_numbered_parent.get("image_urls", [])
                for url in child_urls:
                    if url not in parent_urls:
                        parent_urls.append(url)
                current_numbered_parent["image_urls"] = parent_urls

            # Merge sub_items if child has any
            child_subs = section.get("sub_items", [])
            if child_subs:
                parent_subs = current_numbered_parent.get("sub_items", [])
                parent_subs.extend(child_subs)
                current_numbered_parent["sub_items"] = parent_subs

            continue

        # Everything else: keep as-is
        merged_final.append(section)

    _stage_stats("nested", merged_final, _trace)

    # --- Filter 13b: Fold untitled continuation prose into its section ---
    merged_final = _merge_untitled_continuations(merged_final, source_md)

    _stage_stats("folded", merged_final, _trace)

    # --- Filter 14: Deduplicate content of standalone sections from parent sections ---
    has_standalone_lo = any(s.get("type") == "learning_objectives" for s in merged_final)
    has_standalone_intro = any(s.get("type") == "introduction" for s in merged_final)

    if has_standalone_lo or has_standalone_intro:
        lo_ref = " ".join(
            str(s.get("content") or "")
            for s in merged_final if s.get("type") == "learning_objectives"
        )
        intro_ref = " ".join(
            str(s.get("content") or "")
            for s in merged_final if s.get("type") == "introduction"
        )
        for section in merged_final:
            if section.get("type") == "section":
                content = section.get("content") or ""
                if isinstance(content, str) and content:
                    before_len = len(content)
                    if has_standalone_lo:
                        content = _strip_duplicated_heading_block(
                            content, r'(?:^|\n)#+[ \t]*Learning[ \t]+Objectives?:?', lo_ref)
                    if has_standalone_intro:
                        content = _strip_duplicated_heading_block(
                            content, r'(?:^|\n)#+[ \t]*Introduction:?', intro_ref)
                    content = re.sub(r'\n{3,}', '\n\n', content).strip()
                    if before_len and len(content) < before_len * 0.5:
                        # Belt and braces: never let this filter halve a section.
                        logger.warning(
                            f"[Filter 14] refusing to drop "
                            f"{before_len - len(content):,} chars from "
                            f"{str(section.get('title'))[:40]!r} - keeping the original"
                        )
                    else:
                        section["content"] = content

    # --- Unnumbered books: fold invented labels, then nest by heading depth ---
    # Filter 13 only merges into a NUMBERED parent, so a textbook whose headings
    # carry no numbers (most Social Science units) came out entirely flat.
    _stage_stats("filter14", merged_final, _trace)

    if source_md:
        merged_final = fold_non_heading_sections(merged_final, source_md)
        _stage_stats("foldlabels", merged_final, _trace)
        merged_final = nest_unnumbered_sections(merged_final, source_md)
        _stage_stats("nestunnum", merged_final, _trace)

    # --- Filter 15: Assign textbook-order indices (pre-order walk) ---
    # Guarantees consumers can always sort sections back into reading order,
    # at every nesting depth.
    _order_counter = [0]

    def _assign_order(secs: List[Dict[str, Any]]) -> None:
        for s in secs:
            _order_counter[0] += 1
            s["order"] = _order_counter[0]
            if s.get("sub_sections"):
                _assign_order(s["sub_sections"])

    # --- Filter 13c: Nest numbered subsections under their parent ---
    merged_final = _nest_numbered_subsections(merged_final)

    # Order must be settled BEFORE Filter 15 stamps it.
    if source_md:
        merged_final = sort_sections_by_source(merged_final, source_md)

    _stage_stats("final", merged_final, _trace)
    _log_stage_trace(_trace)

    _assign_order(merged_final)

    return merged_final


# CANONICAL EXERCISE SCHEMA + FINAL SECTION NORMALIZATION


_EXERCISE_ID_RE = re.compile(
    r'^(?:Unit\s+)?Exercise(?:s)?(?:\s*[-–—:]?\s*\d+(?:\.\d+)*)?\s*$', re.IGNORECASE
)
_MCQ_TITLE_RE = re.compile(
    r'^(?:multiple\s+choice(?:\s+questions?)?|choose\s+the\s+(?:correct|best)\s+answer)s?\s*[.:]?\s*$',
    re.IGNORECASE,
)
_QUESTION_START_RE = re.compile(r'(?m)^\s*(\d{1,2})[\.\)]\s+')
_OPTION_MARK_RE = re.compile(r'(?m)(?:^|\s)\(([A-Da-d1-4])\)\s+')
_ONLY_IMAGE_MARKERS_RE = re.compile(r'^(?:\s*\[Image:\s*[^\]]+\]\s*)+$')


def _split_content_into_questions(text: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Deterministically split an exercise content blob into numbered questions.
    Returns (preamble, sub_items). If fewer than 2 sequential question starts
    are found, returns (text, []) unchanged — better to keep a blob than to
    mis-split maths decimals or list items.
    """
    matches = list(_QUESTION_START_RE.finditer(text))
    if len(matches) < 2:
        return text, []

    # Require an ascending 1, 2, 3... sequence to avoid splitting on decimals
    # or numbered formulas inside prose.
    numbers = [int(m.group(1)) for m in matches]
    starts: List[int] = []
    expected = 1
    for i, n in enumerate(numbers):
        if n == expected:
            starts.append(i)
            expected += 1
    if len(starts) < 2:
        return text, []

    kept = [matches[i] for i in starts]
    preamble = text[:kept[0].start()].strip()
    sub_items: List[Dict[str, Any]] = []
    for j, m in enumerate(kept):
        seg_end = kept[j + 1].start() if j + 1 < len(kept) else len(text)
        body = text[m.end():seg_end].strip()
        sub_items.append({"number": m.group(1), "content": body, "options": []})
    return preamble, sub_items


def _extract_options_from_question(item: Dict[str, Any]) -> None:
    """If a question's content embeds 3+ MCQ option markers, split them out."""
    content = item.get("content") or ""
    if item.get("options"):
        return
    marks = list(_OPTION_MARK_RE.finditer(content))
    if len(marks) < 3:
        return
    stem = content[:marks[0].start()].strip()
    options = []
    for j, m in enumerate(marks):
        end = marks[j + 1].start() if j + 1 < len(marks) else len(content)
        opt_text = content[m.end():end].strip()
        options.append(f"({m.group(1)}) {opt_text}")
    if stem and all(o.split(') ', 1)[-1].strip() for o in options):
        item["content"] = stem
        item["options"] = options


def _normalize_sub_item(item: Any, index: int) -> Dict[str, Any]:
    """Coerce any sub_item shape into {number, content, options[]}."""
    if isinstance(item, str):
        return {"number": str(index + 1), "content": item.strip(), "options": []}
    if not isinstance(item, dict):
        return {"number": str(index + 1), "content": str(item), "options": []}
    number = str(item.get("number") or index + 1).strip().rstrip('.')
    raw_content = item.get("content") or item.get("question") or item.get("text") or ""
    if isinstance(raw_content, list):
        raw_content = " ".join(str(x) for x in raw_content)
    options = item.get("options") or item.get("choices") or []
    if not isinstance(options, list):
        options = [str(options)]
    options = [str(o).strip() for o in options if str(o).strip()]
    normalized = {"number": number, "content": str(raw_content).strip(), "options": options}
    # Preserve answer/solution info if the LLM emitted it
    for extra_key in ("answer", "solution"):
        if item.get(extra_key):
            normalized.setdefault("metadata", {})[extra_key] = item[extra_key]
    return normalized


def normalize_exercise_sections(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Enforce ONE canonical schema for every exercise across all books/subjects:

        {type: "exercise", id, title, content, metadata,
         sub_items: [{number, content, options: []}]}

    Also:
      - merges orphan "Multiple choice questions" sections into a preceding
        empty exercise (TN/CBSE books print MCQs under the exercise heading);
      - flags sections whose content is only image markers with
        metadata.content_source = "image_only" so the verifier can catch them.
    """
    # ── Pass 1: merge MCQ orphans into the preceding empty exercise ──
    merged: List[Dict[str, Any]] = []
    for section in sections:
        title = (section.get("title") or section.get("id") or "").strip()
        prev = merged[-1] if merged else None
        is_mcq_orphan = (
            _MCQ_TITLE_RE.match(title)
            and section.get("type") in ("other", "multiple_choice", "exercise", "section", "prose")
        )
        if is_mcq_orphan and prev is not None and prev.get("type") == "exercise" \
                and not prev.get("sub_items"):
            body = (section.get("content") or "").strip()
            prev_content = (prev.get("content") or "").strip()
            note = title  # keep "Multiple choice questions" as instruction line
            prev["content"] = "\n\n".join(x for x in (prev_content, note, body) if x)
            if section.get("sub_items"):
                prev["sub_items"] = (prev.get("sub_items") or []) + section["sub_items"]
            continue
        merged.append(section)

    # ── Pass 2: canonicalize every exercise + flag image-only sections ──
    def _canonicalize(sec: Dict[str, Any]) -> None:
        stype = sec.get("type", "")
        content = sec.get("content") or ""
        if isinstance(content, list):
            content = " ".join(str(x) for x in content)
        content = str(content)

        # image-only flag (any section type)
        stripped = _IMG_MARKER_RE.sub("", content).strip()
        if not stripped and not sec.get("sub_items") and not sec.get("sub_sections"):
            if _IMG_MARKER_RE.search(content):
                sec.setdefault("metadata", {})["content_source"] = "image_only"

        if stype in ("exercise", "unit_exercise", "multiple_choice"):
            # id/title sync
            sid = str(sec.get("id") or "").strip()
            title = (sec.get("title") or "").strip()
            if not sid and title:
                sec["id"] = title
            elif sid and not title:
                sec["title"] = sid

            # normalize existing sub_items
            sub_items = [
                _normalize_sub_item(item, i)
                for i, item in enumerate(sec.get("sub_items") or [])
            ]

            # split a content blob into questions when sub_items are missing
            if not sub_items and stripped:
                preamble, split_items = _split_content_into_questions(content)
                if split_items:
                    content = preamble
                    sub_items = split_items

            for item in sub_items:
                _extract_options_from_question(item)

            sec["content"] = content.strip()
            sec["sub_items"] = sub_items
            sec.setdefault("metadata", {})

            # rebuild in canonical key order
            canonical = {
                "type": stype,
                "id": sec.get("id"),
                "title": sec.get("title"),
                "content": sec.get("content", ""),
                "metadata": sec.get("metadata", {}),
                "sub_items": sec.get("sub_items", []),
            }
            for k, v in sec.items():
                if k not in canonical:
                    canonical[k] = v
            sec.clear()
            sec.update(canonical)

        for sub in sec.get("sub_sections") or []:
            if isinstance(sub, dict):
                _canonicalize(sub)

    for section in merged:
        _canonicalize(section)

    # ── Pass 3: drop duplicate exercises (same printed label) ──
    # Keeps the richer copy (more questions). Duplicates arise when the LLM
    # and the reconciliation pass both emit the same exercise under different
    # types (e.g. 'exercise' vs 'unit_exercise').
    def _exercise_label(sec: Dict[str, Any]) -> Optional[str]:
        if sec.get("type") not in ("exercise", "unit_exercise", "multiple_choice"):
            return None
        label = f"{sec.get('id') or ''} {sec.get('title') or ''}"
        m_ux = re.search(r'Unit\s+Exercise\s*[-–—]?\s*(\d+)', label, re.IGNORECASE)
        if m_ux:
            return f"unit_exercise::{m_ux.group(1)}"
        m_ex = re.search(r'Exercise\s+(\d+\.\d+)', label, re.IGNORECASE)
        if m_ex:
            return f"exercise::{m_ex.group(1)}"
        return None

    best_by_label: Dict[str, Dict[str, Any]] = {}
    for sec in merged:
        label = _exercise_label(sec)
        if label is None:
            continue
        prev_best = best_by_label.get(label)
        if prev_best is None:
            best_by_label[label] = sec
        elif len(sec.get("sub_items") or []) > len(prev_best.get("sub_items") or []):
            best_by_label[label] = sec

    deduped_out: List[Dict[str, Any]] = []
    for sec in merged:
        label = _exercise_label(sec)
        if label is not None and best_by_label.get(label) is not sec:
            logger.info(f"[Normalize] Dropped duplicate exercise: {sec.get('id') or sec.get('title')}")
            continue
        deduped_out.append(sec)
    merged = deduped_out

    # Re-assign reading order after merges
    counter = [0]

    def _assign(secs: List[Dict[str, Any]]) -> None:
        for s in secs:
            counter[0] += 1
            s["order"] = counter[0]
            if s.get("sub_sections"):
                _assign(s["sub_sections"])

    _assign(merged)
    return merged


# COMPLETENESS RECONCILIATION — recover Exercises/Examples the LLM dropped


_INV_EXERCISE_RE = re.compile(
    r'^#{1,6}\s*\**\s*Exercise\s+(\d+\.\d+)\s*\**\s*$', re.IGNORECASE | re.MULTILINE
)
_INV_UNIT_EXERCISE_RE = re.compile(
    r'^#{1,6}\s*\**\s*Unit\s+Exercise\s*[-–—]?\s*(\d+)\s*\**\s*$', re.IGNORECASE | re.MULTILINE
)
_INV_EXAMPLE_RE = re.compile(
    r'^(?:#{1,6}\s*)?\**Example\s+(\d+\.\d+)\**(?=[\s:.])', re.IGNORECASE | re.MULTILINE
)
_INV_SECTION_RE = re.compile(
    r'^#{1,6}\s*\**\s*(\d+\.\d+(?:\.\d+)*)\b', re.MULTILINE
)
_INV_BACKMATTER_RE = re.compile(
    r'^#{1,6}\s*\**\s*(Points\s+to\s+Remember|Summary|Glossary|ICT\s+Corner|Answers?)\b',
    re.IGNORECASE | re.MULTILINE,
)
_MCQ_HEADING_LINE_RE = re.compile(
    r'^#{1,6}\s*\**\s*(?:Multiple\s+choice(?:\s+questions?)?|Choose\s+the\s+(?:correct|best)\s+answer)s?\s*\**\s*[.:]?\s*$',
    re.IGNORECASE,
)


def _inventory_entities(cleaned_md: str) -> List[Dict[str, Any]]:
    """List every Exercise/Example/section/back-matter anchor with its offset."""
    anchors: List[Dict[str, Any]] = []
    for m in _INV_EXERCISE_RE.finditer(cleaned_md):
        anchors.append({"kind": "exercise", "num": m.group(1), "start": m.start(),
                        "id": f"Exercise {m.group(1)}"})
    for m in _INV_UNIT_EXERCISE_RE.finditer(cleaned_md):
        anchors.append({"kind": "unit_exercise", "num": m.group(1), "start": m.start(),
                        "id": f"Unit Exercise - {m.group(1)}"})
    for m in _INV_EXAMPLE_RE.finditer(cleaned_md):
        anchors.append({"kind": "example", "num": m.group(1), "start": m.start(),
                        "id": f"Example {m.group(1)}"})
    for m in _INV_SECTION_RE.finditer(cleaned_md):
        anchors.append({"kind": "section", "num": m.group(1), "start": m.start(),
                        "id": m.group(1)})
    for m in _INV_BACKMATTER_RE.finditer(cleaned_md):
        anchors.append({"kind": "backmatter", "num": "", "start": m.start(),
                        "id": m.group(1)})
    anchors.sort(key=lambda a: a["start"])
    return anchors


def _entity_key(kind: str, num: str) -> str:
    return f"{kind}::{num}"


def _collect_extracted_keys(sections: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Map entity keys ('exercise::2.1', 'example::2.44') → section dict."""
    found: Dict[str, Dict[str, Any]] = {}

    def _walk(secs: List[Dict[str, Any]]) -> None:
        for s in secs:
            label = f"{s.get('id') or ''} {s.get('title') or ''}"
            stype = s.get("type", "")
            m_ex = re.search(r'Exercise\s+(\d+\.\d+)', label, re.IGNORECASE)
            m_ux = re.search(r'Unit\s+Exercise\s*[-–—]?\s*(\d+)', label, re.IGNORECASE)
            m_eg = re.search(r'Example\s+(\d+\.\d+)', label, re.IGNORECASE)
            if stype in ("exercise", "unit_exercise", "multiple_choice") and m_ux:
                found.setdefault(_entity_key("unit_exercise", m_ux.group(1)), s)
            elif stype in ("exercise", "unit_exercise", "multiple_choice") and m_ex:
                found.setdefault(_entity_key("exercise", m_ex.group(1)), s)
            elif stype == "example" and m_eg:
                found.setdefault(_entity_key("example", m_eg.group(1)), s)
            _walk(s.get("sub_sections") or [])

    _walk(sections)
    return found


def _slice_entity_span(cleaned_md: str, anchors: List[Dict[str, Any]],
                       anchor: Dict[str, Any], max_span: int = 20000) -> str:
    """Cut the markdown from an entity heading to the next boundary anchor.

    For exercises, MCQ-ish headings inside the span are skipped over — the
    'Multiple choice questions' block belongs to the exercise above it.
    """
    start = anchor["start"]
    end = len(cleaned_md)
    for a in anchors:
        if a["start"] <= start:
            continue
        if anchor["kind"] in ("exercise", "unit_exercise"):
            # Peek at the heading line — skip through MCQ instruction headings
            line_end = cleaned_md.find("\n", a["start"])
            line = cleaned_md[a["start"]:line_end if line_end != -1 else len(cleaned_md)]
            if _MCQ_HEADING_LINE_RE.match(line.strip()):
                continue
        end = a["start"]
        break
    return cleaned_md[start:min(end, start + max_span)].strip()


def _parse_exercise_span(span: str, entity_id: str) -> Optional[Dict[str, Any]]:
    """Deterministically parse an exercise span into a canonical section."""
    lines = span.split("\n")
    body = "\n".join(lines[1:]).strip()   # drop the heading line
    # Keep MCQ instruction headings as a plain instruction line
    body = re.sub(r'(?m)^#{1,6}\s*\**\s*(Multiple\s+choice\s+questions?)\s*\**\s*$',
                  r'\1', body, flags=re.IGNORECASE)
    preamble, sub_items = _split_content_into_questions(body)
    if not sub_items:
        return None
    for item in sub_items:
        _extract_options_from_question(item)
    return {
        "type": "exercise",
        "id": entity_id,
        "title": entity_id,
        "content": preamble,
        "metadata": {"recovered": "reconciliation"},
        "sub_items": sub_items,
    }


def _parse_example_span(span: str, entity_id: str) -> Optional[Dict[str, Any]]:
    """Deterministically parse an example span into problem + solution."""
    body = re.sub(r'^(?:#{1,6}\s*)?\**Example\s+\d+\.\d+\**[\s:.]*', '', span,
                  count=1, flags=re.IGNORECASE).strip()
    if not body:
        return None
    problem, solution = _split_example_solution(body)
    section = {
        "type": "example",
        "id": entity_id,
        "title": entity_id,
        "content": problem,
        "metadata": {"recovered": "reconciliation"},
        "sub_items": [],
    }
    if solution:
        section["metadata"]["solution"] = solution
    return section


def _llm_extract_entity(span: str, entity_id: str, kind: str,
                        api_key: str, model: str) -> Optional[Dict[str, Any]]:
    """Focused single-entity LLM extraction (fallback when regex parse fails)."""
    if kind in ("exercise", "unit_exercise"):
        schema_hint = ('{"type":"exercise","id":"' + entity_id + '","title":"' + entity_id +
                       '","content":"<instruction text if any>","metadata":{},'
                       '"sub_items":[{"number":"1","content":"<question>","options":["(A) ...","(B) ..."]}]}')
    else:
        schema_hint = ('{"type":"example","id":"' + entity_id + '","title":"' + entity_id +
                       '","content":"<problem statement ONLY>",'
                       '"metadata":{"solution":"<full solution>"},"sub_items":[]}')
    system_prompt = (
        "You extract ONE textbook entity into JSON. Extract EVERY question/word — never "
        "truncate. Preserve inline [Image: ...] markers verbatim. Return ONLY the JSON object:\n"
        + schema_hint
    )
    raw = _call_llm_for_extraction(
        system_prompt, f"Extract '{entity_id}' from:\n\n{span}", model, api_key
    )
    if not raw:
        return None
    data = _parse_json_robust(raw)
    if not data:
        return None
    # Some models wrap the entity in {"sections": [...]}
    if "sections" in data and isinstance(data["sections"], list) and data["sections"]:
        data = data["sections"][0]
    if not (data.get("sub_items") or (data.get("content") or "").strip()):
        return None
    data.setdefault("metadata", {})["recovered"] = "reconciliation_llm"
    return data


def reconcile_missing_entities(
    merged: Dict[str, Any],
    cleaned_md: str,
    api_key: str,
    model: str,
) -> Dict[str, Any]:
    """
    Guarantee every Exercise/Example printed in the source appears in the
    extraction. Inventories entity headings in the cleaned markdown, diffs
    against the extracted tree, then recovers each missing/empty entity from
    its exact source span — deterministically when possible, with a focused
    LLM call as fallback.
    """
    sections = merged.get("sections") or []
    # The document pipeline writes a single unit as {"units": [{...}]}.  The
    # previous reconciler only inspected a top-level ``sections`` key, silently
    # bypassing recovery for that normal output shape.
    if not sections and isinstance(merged.get("units"), list):
        units = [unit for unit in merged["units"] if isinstance(unit, dict)]
        if len(units) == 1:
            reconcile_missing_entities(units[0], cleaned_md, api_key, model)
        elif len(units) > 1:
            logger.warning(
                "[Reconcile] Skipped multi-unit wrapper; reconcile each unit with its own source markdown"
            )
        return merged
    if not sections:
        return merged

    anchors = _inventory_entities(cleaned_md)
    entity_anchors = [a for a in anchors if a["kind"] in ("exercise", "unit_exercise", "example")]
    if not entity_anchors:
        return merged

    extracted = _collect_extracted_keys(sections)

    def _is_deficient(sec: Dict[str, Any]) -> bool:
        content = _IMG_MARKER_RE.sub("", str(sec.get("content") or "")).strip()
        return not sec.get("sub_items") and not content

    missing, deficient = [], []
    for a in entity_anchors:
        key = _entity_key(a["kind"], a["num"])
        sec = extracted.get(key)
        if sec is None:
            missing.append(a)
        elif sec.get("type") == "exercise" and _is_deficient(sec):
            deficient.append((a, sec))
        elif a["kind"] == "example":
            metadata = sec.get("metadata") or {}
            source_span = _slice_entity_span(cleaned_md, anchors, a)
            _, source_solution = _split_example_solution(source_span)
            if source_solution and not metadata.get("solution"):
                deficient.append((a, sec))

    if not missing and not deficient:
        logger.info("[Reconcile] All printed Exercises/Examples present in extraction")
        return merged

    logger.info(f"[Reconcile] missing: {[a['id'] for a in missing]} | "
          f"empty: {[a['id'] for a, _ in deficient]}")

    def _recover(a: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        span = _slice_entity_span(cleaned_md, anchors, a)
        if not span:
            return None
        if a["kind"] in ("exercise", "unit_exercise"):
            section = _parse_exercise_span(span, a["id"])
        else:
            section = _parse_example_span(span, a["id"])
        if section is None and api_key:
            section = _llm_extract_entity(span, a["id"], a["kind"], api_key, model)
        return section

    # ── Refill empty exercises in place ──
    for a, sec in deficient:
        recovered = _recover(a)
        if recovered:
            sec.update({k: v for k, v in recovered.items() if k != "type"})
            detail = (f"{len(recovered.get('sub_items') or [])} questions"
                      if a["kind"] in ("exercise", "unit_exercise") else "solution restored")
            logger.info(f"[Reconcile] Refilled {a['id']} ({detail})")

    # ── Insert missing entities at the right position ──
    def _find_top_level_index(entity_key_str: str) -> Optional[int]:
        for idx, s in enumerate(sections):
            label = f"{s.get('id') or ''} {s.get('title') or ''}"
            m_ex = re.search(r'Exercise\s+(\d+\.\d+)', label, re.IGNORECASE)
            m_ux = re.search(r'Unit\s+Exercise\s*[-–—]?\s*(\d+)', label, re.IGNORECASE)
            if s.get("type") == "exercise" and m_ux and \
                    _entity_key("unit_exercise", m_ux.group(1)) == entity_key_str:
                return idx
            if s.get("type") == "exercise" and m_ex and \
                    _entity_key("exercise", m_ex.group(1)) == entity_key_str:
                return idx
            if s.get("type") == "section" and \
                    _entity_key("section", str(s.get("id") or "").strip()) == entity_key_str:
                return idx
        return None

    def _find_section_by_number(secs: List[Dict[str, Any]], num: str) -> Optional[Dict[str, Any]]:
        for s in secs:
            if s.get("type") == "section" and str(s.get("id") or "").strip() == num:
                return s
            hit = _find_section_by_number(s.get("sub_sections") or [], num)
            if hit is not None:
                return hit
        return None

    for a in missing:
        recovered = _recover(a)
        if not recovered:
            logger.warning(f"[Reconcile] Could not recover {a['id']}")
            continue

        if a["kind"] == "example":
            # Attach under the numbered section owning this source position
            owner_num = None
            for anc in anchors:
                if anc["start"] >= a["start"]:
                    break
                if anc["kind"] == "section":
                    owner_num = anc["num"]
            owner = _find_section_by_number(sections, owner_num) if owner_num else None
            if owner is not None:
                owner.setdefault("sub_sections", []).append(recovered)
                logger.info(f"[Reconcile] Recovered {a['id']} under section {owner_num}")
                continue

        # Top-level insert: before the first later anchor that exists top-level
        insert_at = None
        for anc in anchors:
            if anc["start"] <= a["start"] or anc["kind"] == "example":
                continue
            key = _entity_key(anc["kind"], anc["num"])
            idx = _find_top_level_index(key)
            if idx is not None:
                insert_at = idx
                break
        if insert_at is None:
            # After the nearest earlier top-level anchor
            for anc in reversed(anchors):
                if anc["start"] >= a["start"] or anc["kind"] == "example":
                    continue
                key = _entity_key(anc["kind"], anc["num"])
                idx = _find_top_level_index(key)
                if idx is not None:
                    insert_at = idx + 1
                    break
        if insert_at is None:
            insert_at = len(sections)
        sections.insert(insert_at, recovered)
        n_q = len(recovered.get("sub_items") or [])
        logger.info(f"[Reconcile] Recovered {a['id']} at position {insert_at} ({n_q} questions)")

    # Re-canonicalize + re-number reading order after insertions
    merged["sections"] = normalize_exercise_sections(sections)
    return merged


def _normalize_schema(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ensure the data follows the standard section-based schema.
    If it's in a page-based format (produced by some LLMs), convert it.

    Handles several LLM output quirks:
    - Nested {"unit": {...}} wrapper (kegy304 pattern)
    - Page-based {"pages": [...]} instead of {"sections": [...]}
    - "chapter" key used instead of "unit_number"
    - "filename" attribute on image elements (instead of "file"/"src")
    - Non-standard keys like "source_notes"
    """
    if not isinstance(data, dict):
        return data

    # If already has units/chapters top-level, normalize each
    for key in ("units", "chapters"):
        if key in data and isinstance(data[key], list):
            data[key] = [_normalize_schema(u) for u in data[key]]
            return data

    # ── Unwrap nested "unit" wrapper ──
    # Some LLMs return {"unit": {"chapter": 4, "title": "..."}, "content": {"sections": [...]}}
    # instead of flat {"unit_number": 4, "sections": [...]}
    if "unit" in data and isinstance(data["unit"], dict):
        logger.warning("[Schema Normalization] Unwrapping nested 'unit' wrapper...")
        inner = data.pop("unit")
        for k, v in inner.items():
            if k not in data:
                data[k] = v
    
    # ── Unwrap nested "content" wrapper for sections ──
    if "content" in data and isinstance(data["content"], dict) and "sections" in data["content"]:
        logger.warning("[Schema Normalization] Unwrapping nested 'content' wrapper...")
        data["sections"] = data.pop("content")["sections"]

    # ── CASE 1: Page-based schema {"pages": [{"content": [...]}]} ──
    if "pages" in data and not data.get("sections"):
        logger.warning("[Schema Normalization] Detected page-based schema — converting to sections...")
        new_sections = []
        
        for page in data["pages"]:
            if not isinstance(page, dict):
                continue
            
            # Content might be a list of elements or a string
            page_content = page.get("content")
            if isinstance(page_content, list):
                for element in page_content:
                    if not isinstance(element, dict):
                        continue
                    
                    # Convert element to section
                    el_type = element.get("type", "other")
                    el_text = element.get("text") or element.get("content") or ""
                    
                    if el_type == "heading":
                        new_sections.append({
                            "type": "section",
                            "title": el_text,
                            "content": "",
                            "sub_items": []
                        })
                    elif el_type == "image":
                        # Scanned images are ignored — never stored or embedded
                        continue
                    else:
                        if new_sections:
                            new_sections[-1]["content"] += f"\n\n{el_text}"
                        else:
                            new_sections.append({"type": "other", "content": el_text})
            elif isinstance(page_content, str):
                new_sections.append({"type": "section", "content": page_content})

        data["sections"] = new_sections
        del data["pages"]

    # ── CASE 2: Flat list of sections at top level ──
    if "sections" not in data and any(k in data for k in ("introduction", "title", "unit_number")):
        # It's a unit-like object but missing sections key? 
        # Check if sections are flattened at top level (unlikely but possible)
        pass

    # ── Normalize unit_number from chapter/chapter_number aliases ──
    if "unit_number" not in data:
        for alias in ("chapter", "chapter_number"):
            if data.get(alias) is not None:
                data["unit_number"] = data[alias]
                break

    # ── Remove non-standard keys that downstream code doesn't expect ──
    for remove_key in ("source_notes", "pages"):
        data.pop(remove_key, None)

    return data



# MERGE CHUNKS — safe deduplication


# Section types a unit can only have ONE of. Chunked extraction runs the LLM
# independently per chunk, and a later chunk will happily synthesize its own
# "Introduction"/"Learning Objectives" for the slice it can see. Those are not
# duplicates by content, so _section_dedup_key cannot catch them — they must be
# collapsed by type. The first occurrence wins: it comes from the chunk holding
# the real chapter opening, whereas later ones are the model inventing a summary.
SINGLETON_SECTION_TYPES = {"introduction", "learning_objectives"}


def demote_top_level_introduction(unit: Dict[str, Any]) -> Dict[str, Any]:
    """Introduction belongs in sections[], never as a top-level scalar.

    Historically a unit could carry both a top-level ``introduction`` string
    AND an ``introduction`` section, which forced every consumer (frontend,
    enrichment, RAG) to special-case two sources for the same content. This
    normalizes the schema: if a non-empty top-level ``introduction`` exists and
    the unit has no ``introduction`` section yet, the text is folded into a new
    leading ``introduction`` section (no content is lost); the top-level key is
    then always removed. Mutates and returns ``unit``.
    """
    if not isinstance(unit, dict) or "introduction" not in unit:
        return unit

    intro = unit.pop("introduction", None)
    intro_text = str(intro).strip() if intro is not None else ""
    if not intro_text:
        return unit

    sections = unit.get("sections")
    if not isinstance(sections, list):
        sections = []
        unit["sections"] = sections

    has_intro_section = any(
        isinstance(s, dict) and str(s.get("type") or "").strip().lower() == "introduction"
        for s in sections
    )
    if not has_intro_section:
        sections.insert(0, {"type": "introduction", "title": "", "content": intro_text})

    return unit


def _section_dedup_key(section: Dict[str, Any]) -> str:
    """
    Generate a dedup key for a section that avoids false-positive merges.
    Uses type + title + first 80 chars of content hash.
    """
    stype = section.get("type", "")
    stitle = (section.get("title") or "").strip().lower()
    raw_content = section.get("content") or ""
    # Handle content being a list (e.g. math examples with sub-items)
    if isinstance(raw_content, list):
        raw_content = " ".join(str(item) for item in raw_content)
    scontent = str(raw_content)[:80].strip().lower()
    return f"{stype}::{stitle}::{scontent}"


def merge_extracted_chunks(
    chunks: List[Dict[str, Any]],
    source_md: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Merge multiple chunk extraction results into one complete result.
    Uses safe deduplication that won't drop distinct sections.

    If source_md is provided, section ids are realigned against the actual
    textbook headings before hierarchy building (fixes LLM-invented numbers).
    """
    if not chunks:
        return {}

    if len(chunks) == 1:
        merged = chunks[0]
    else:
        merged: Dict[str, Any] = {}

        # Scalar fields: first non-null value wins.
        # NOTE: "introduction" is intentionally excluded — it lives in
        # sections[] as an "introduction" section, never as a top-level scalar.
        scalar_fields = ["unit_number", "chapter_number", "title", "subject",
                         "part"]
        for field in scalar_fields:
            for chunk in chunks:
                val = chunk.get(field)
                if val is not None and val != "" and val != []:
                    merged[field] = val
                    break
            if field not in merged:
                merged[field] = chunks[0].get(field)

        # List fields: concatenate with dedup
        for field in ["points_to_remember"]:
            seen = set()
            combined = []
            for chunk in chunks:
                for item in chunk.get(field) or []:
                    key = str(item).strip()
                    if key not in seen:
                        seen.add(key)
                        combined.append(item)
            merged[field] = combined

        # Sections: merge with type-aware dedup
        seen_keys = set()
        seen_singletons = set()
        all_sections = []
        for chunk in chunks:
            sections_in = chunk.get("sections") or []
            if any(not isinstance(x, dict) for x in sections_in):
                # Defence in depth: callers run coerce_section_content first,
                # but never let one malformed entry abort the whole merge - the
                # except-branch below falls back to CHUNK 1 ONLY and throws the
                # rest of the book away.
                sections_in = coerce_section_content(list(sections_in))
            for section in sections_in:
                if not isinstance(section, dict):
                    continue
                stype = str(section.get("type") or "").strip().lower()
                if stype in SINGLETON_SECTION_TYPES:
                    if stype in seen_singletons:
                        title = (section.get("title") or "(untitled)").strip()
                        logger.info(f"[merge] Dropped duplicate '{stype}' section "
                              f"({title}) - a unit has only one")
                        continue
                    seen_singletons.add(stype)
                key = _section_dedup_key(section)
                if key not in seen_keys:
                    seen_keys.add(key)
                    all_sections.append(section)
        merged["sections"] = all_sections

        # Glossary
        seen_terms = set()
        all_glossary = []
        for chunk in chunks:
            for item in chunk.get("glossary") or []:
                term = (item.get("term") or item.get("number") or "").strip().lower()
                if term and term not in seen_terms:
                    seen_terms.add(term)
                    all_glossary.append(item)
        merged["glossary"] = all_glossary

    # ── Normalize Schema (converts page-based to section-based if needed) ──
    merged = _normalize_schema(merged)

    # ── Hoist sections trapped as nested keys inside sibling dicts ──
    if merged.get("sections"):
        merged["sections"] = _hoist_nested_sections(merged["sections"])

    # ── Realign section ids against the actual textbook headings ──
    if source_md and merged.get("sections"):
        merged["sections"] = realign_section_ids(merged["sections"], source_md)

    # ── Post-processing: clean up common LLM issues ──
    if "sections" in merged:
        merged["sections"] = _postprocess_sections(merged["sections"], source_md)

        # ── Filter: Remove redundant unit title section and merge its content ──
        unit_title_norm = re.sub(r'\s+', ' ', (merged.get("title") or "")).strip().lower()
        sections = merged.get("sections", [])
        if len(sections) > 1:
            first_sec = sections[0]
            first_title_norm = re.sub(r'\s+', ' ', (first_sec.get("title") or "")).strip().lower()
            if unit_title_norm and first_title_norm == unit_title_norm:
                logger.info(f"[Filter] Found redundant unit title section: '{first_sec.get('title')}'")
                next_sec = sections[1]
                
                # Prepend content
                first_content = (first_sec.get("content") or "").strip()
                next_content = (next_sec.get("content") or "").strip()
                if first_content:
                    if next_content:
                        next_sec["content"] = f"{first_content}\n\n{next_content}"
                    else:
                        next_sec["content"] = first_content
                
                # Merge image_urls
                first_urls = first_sec.get("image_urls", [])
                if first_urls:
                    next_urls = next_sec.get("image_urls", []) or []
                    for url in first_urls:
                        if url not in next_urls:
                            next_urls.append(url)
                    next_sec["image_urls"] = next_urls
                    
                # Merge sub_items
                first_subs = first_sec.get("sub_items", [])
                if first_subs:
                    next_subs = next_sec.get("sub_items", []) or []
                    next_subs.extend(first_subs)
                    next_sec["sub_items"] = next_subs
                    
                # Remove the first section
                merged["sections"] = sections[1:]

    # ── Canonical exercise schema + MCQ-orphan merge + image-only flags ──
    if merged.get("sections"):
        merged["sections"] = normalize_exercise_sections(merged["sections"])

    # Introduction must live as a section, never as a top-level scalar field.
    merged = demote_top_level_introduction(merged)

    # Enforce strict schema ordering before returning
    return merged



# TRUNCATION RECOVERY


def _is_complete_json(text: str) -> bool:
    """True only if the text is a COMPLETE JSON document.

    Deliberately strict: parse_llm_json balances brackets, so it accepts a
    truncated reply and silently drops whatever came after the cut. Only a plain
    json.loads can distinguish a finished document from a salvaged fragment.
    """
    try:
        # orjson, not json: this module never imports stdlib json, and the
        # NameError from using it was swallowed by this except - which made the
        # check answer False for every input, including valid JSON.
        orjson.loads(strip_code_fences(text))
        return True
    except Exception:
        return False


def _recover_truncated_json(
    raw_content: str,
    payload: dict,
    headers: dict,
    timeout: int = _API_TIMEOUT,
) -> str:
    """Attempt to recover truncated JSON by asking the LLM to continue.

    Only worth doing when it actually works. On a math-dense chunk this path
    ran four times, spent ~3.5 min per attempt, and produced unparseable output
    every single time - while a plain fresh retry of the chunk succeeded. It
    used to log " Appended N chars" regardless of whether the result parsed,
    so that failure was invisible. It now verifies its own output and says so,
    and EXTRACTION_TRUNCATION_RECOVERY=0 skips it entirely.
    """
    if not _TRUNCATION_RECOVERY_ENABLED:
        logger.warning(
            "[Truncation Recovery] Output truncated — recovery disabled "
            "(EXTRACTION_TRUNCATION_RECOVERY=0); discarding the truncated reply "
            "so the chunk is re-extracted from scratch"
        )
        return ""
    logger.warning(f"[Truncation Recovery] Output truncated — requesting continuation...")
    recovery_messages = payload["messages"] + [
        {"role": "assistant", "content": raw_content},
        {"role": "user", "content": (
            "Your JSON was cut off because of the output token limit. "
            "Continue from EXACTLY where you stopped. "
            "Output ONLY the remaining JSON — no explanation, no markdown fences."
        )}
    ]
    recovery_payload = {**payload, "messages": recovery_messages, "max_tokens": 8192}
    # Remove max_completion_tokens if it accidentally exists (OpenAI param)
    recovery_payload.pop("max_completion_tokens", None)
    try:
        resp = traced_post("recover-truncated-json",
            _LLM_BASE_URL,
            headers=headers, json=recovery_payload, timeout=timeout,
        )
        if resp.ok:
            continuation = resp.json()["choices"][0]["message"]["content"]
            combined = raw_content + continuation
            # Appending characters is not success - and neither is "it parses".
            # The repair chain BALANCES BRACKETS, so a truncated reply always
            # parses, just with its tail missing; checking with it reported
            # success on output that was still cut off. Completeness has to be
            # judged by STRICT json, which is the only thing that can tell a
            # finished document from a salvaged fragment.
            if _is_complete_json(combined):
                logger.info(
                    f"[Truncation Recovery] Appended {len(continuation):,} chars "
                    f"— result parses"
                )
                return combined
            logger.warning(
                f"[Truncation Recovery] Appended {len(continuation):,} chars but "
                f"the result STILL does not parse — discarding this reply so the "
                f"chunk is re-extracted from scratch"
            )
            # Return NOTHING, not the truncated text. Handing back a truncated
            # reply is worse than failing: bracket-balancing salvages it into a
            # VALID but PARTIAL parse, so the chunk counts as a success while its
            # tail is silently gone. That is exactly how 10 worked examples
            # (2.19-2.28) vanished from a run the audit still passed. An empty
            # reply trips the normal "no response" path, which retries the chunk.
            return ""
    except Exception as e:
        logger.warning(f"[Truncation Recovery] Failed: {e}")
    # Every remaining path here means recovery did not produce parseable JSON.
    # Discard rather than return the truncated reply, for the reason above.
    return ""


def _looks_like_section(obj: Any) -> bool:
    """A dict carrying section-shaped fields."""
    return isinstance(obj, dict) and (
        "title" in obj or "content" in obj or "type" in obj
    )


def unwrap_wrapped_sections(data: Any) -> Any:
    """
    Repair sections the model returned as a keyed object instead of list entries.

    Llama sometimes emits an entry like

        { "N/A (not a valid section type ... but 'Monuments' is a valid section
           title in the original text.)": { "type": "section",
                                            "title": "Monuments", ... },
          "N/A (... 'Coins' ...)":        { "title": "Coins", ... } }

    in place of a plain section object. Every real section is present, just
    trapped one level down under a chatty key — so the parser sees a single
    entry with no title (an "(untitled)" 0-char section) and the headings look
    like they vanished. Hoisting the values back into the list recovers them
    instead of discarding a whole run's worth of content.

    Recurses into sub_sections so nested occurrences are repaired too.
    """
    if isinstance(data, list):
        return [unwrap_wrapped_sections(v) for v in data]

    if not isinstance(data, dict):
        return data

    for key in ("sections", "sub_sections"):
        entries = data.get(key)
        if not isinstance(entries, list):
            continue

        repaired: List[Any] = []
        hoisted = 0

        # Titles already present as proper entries. The model often emits a
        # section BOTH correctly and inside the wrapper, so hoisting blindly
        # would duplicate half the back matter.
        def _key(sec: Any) -> str:
            return re.sub(r"[^a-z0-9]+", "", str((sec or {}).get("title") or "").lower())

        existing = {
            _key(e) for e in entries
            if isinstance(e, dict) and _looks_like_section(e) and _key(e)
        }

        for entry in entries:
            # A wrapper is a dict that is not itself section-shaped but holds
            # section-shaped values. Bookkeeping keys like "order" sit alongside
            # them, so match on "has section-shaped values" rather than
            # requiring every value to be one.
            inner_sections = (
                [v for v in entry.values() if _looks_like_section(v)]
                if isinstance(entry, dict) and not _looks_like_section(entry)
                else []
            )

            if inner_sections:
                for inner in inner_sections:
                    k = _key(inner)
                    if k and k in existing:
                        continue        # already present as a proper entry
                    if k:
                        existing.add(k)
                    repaired.append(unwrap_wrapped_sections(inner))
                    hoisted += 1
                continue

            repaired.append(unwrap_wrapped_sections(entry))

        if hoisted:
            logger.warning(
                f"[JSON Repair] Hoisted {hoisted} section(s) the model nested "
                f"under descriptive keys instead of listing them"
            )
        data[key] = repaired

    return data


def _parse_json_robust(raw: str) -> Optional[Dict[str, Any]]:
    """Parse JSON with fallback for truncated responses."""
    parsed = parse_llm_json(raw)
    if parsed is not None:
        return unwrap_wrapped_sections(parsed)

    # Last resort: walk back from the end for a prefix that parses. parse_llm_json
    # already closes open brackets, so this only catches replies broken in a way
    # structural repair cannot reach.
    cleaned = strip_code_fences(raw or "")
    for stop in range(len(cleaned), 0, -1):
        if cleaned[stop-1] in ('}', ']'):
            try:
                result = orjson.loads(cleaned[:stop].encode())
                logger.info(f"[JSON Salvage] Recovered JSON up to char {stop}")
                return unwrap_wrapped_sections(result)
            except Exception:
                continue
    return None



# PER-CHUNK LLM CALL (used by extraction_agent.py)


def _call_llm_for_extraction(
    system_prompt: str,
    user_prompt: str,
    model: str,
    api_key: str,
    timeout: int = _API_TIMEOUT,
) -> Optional[str]:
    """
    Make a single LLM chat-completions call for extraction via OpenRouter.

    Returns the raw string content from the model response, or None on failure.
    Handles retries, truncation recovery, and empty-response retry.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        **_OPENROUTER_HEADERS,
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "max_tokens": _MAX_COMPLETION_TOKENS,
        "response_format": {"type": "json_object"},
        **openrouter_routing(model),
    }

    for attempt in range(_MAX_RETRIES):
        try:
            if attempt > 0:
                wait_time = _BASE_DELAY * (3 ** attempt)
                logger.info(f"Retry {attempt+1}/{_MAX_RETRIES} after {wait_time}s...")
                time.sleep(wait_time)

            resp = traced_post("extract-with-schema",
                _LLM_BASE_URL,
                headers=headers, json=payload, timeout=timeout,
            )

            if not resp.ok:
                try:
                    logger.error(f"API error: {resp.json()}")
                except Exception:
                    logger.error(f"API error: {resp.text[:300]}")
                # Rate limited: take the provider out of the running for the
                # remaining attempts instead of retrying into the same wall.
                if resp.status_code == 429:
                    culprit = _provider_from_error(resp)
                    if culprit:
                        payload = _exclude_provider(payload, culprit)
                        logger.warning(
                            f"[Route] {culprit} is rate-limited — excluding it "
                            f"and retrying on another provider"
                        )
                resp.raise_for_status()

            data         = resp.json()
            choice       = data["choices"][0]
            raw_content  = choice["message"].get("content") or ""
            finish_reason = choice.get("finish_reason", "stop")

            # empty response — retry
            if not raw_content.strip():
                logger.warning(f"Empty response from {model} (attempt {attempt+1}) — retrying...")
                continue

            # Handle truncation
            if finish_reason == "length":
                raw_content = _recover_truncated_json(raw_content, payload, headers, timeout)
                # Recovery gives back nothing when it could not produce parseable
                # JSON. Retry here rather than returning empty: this loop still
                # has attempts left, and a fresh generation has consistently
                # succeeded where continuing a truncated one has not.
                if not raw_content.strip():
                    logger.warning(
                        f"Truncated reply discarded (attempt {attempt+1}) — "
                        f"re-generating this chunk"
                    )
                    continue

            return raw_content

        except Exception as e:
            logger.error(f"Attempt {attempt+1} error: {e}")

    return None


# MAIN EXTRACTION FUNCTION


def extract_with_auto_schema(
    content_md: str,
    api_key: str,
    model: str = _DEFAULT_MODEL,
    unit_number: Optional[int] = None,
    part_name: Optional[str] = None,
    timeout: int = _API_TIMEOUT,
) -> Optional[Dict[str, Any]]:
    """
    Full auto-schema extraction pipeline:
      Phase 1: Discover textbook structure
      Phase 2: Extract content with dynamic schema

    Works with ANY textbook — no subject configuration needed.
    """
    logger.info(f"[Auto-Schema] Starting extraction ({len(content_md):,} chars)...")

    # Clean content
    cleaned_content = clean_content_for_extraction(content_md)
    logger.info(f"Cleaned: {len(content_md):,} → {len(cleaned_content):,} chars")

    # ── Phase 1: Discover structure ──────────────────────────────────
    discovered = discover_textbook_structure(cleaned_content, api_key, model)
    discovered_types = [s["type"] for s in discovered]

    # ── Phase 2: Build dynamic prompt + extract ──────────────────────
    system_prompt = _build_dynamic_system_prompt(discovered)

    if part_name:
        system_prompt += (
            f"\n\n⚠️  This content belongs to the '{part_name}' section. "
            f"Set a 'part' field to exactly '{part_name}' in the output."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        **_OPENROUTER_HEADERS,
    }

    # Split into chunks with overlap
    chunks = _split_into_chunks(cleaned_content, max_chars=_CHUNK_MAX_CHARS, overlap_chars=_CHUNK_OVERLAP_CHARS)
    logger.info(f"Split into {len(chunks)} chunk(s)")

    chunk_results: List[Dict[str, Any]] = []

    for chunk_idx, chunk in enumerate(chunks, 1):
        user_prompt = _build_user_prompt(
            content=chunk,
            unit_number=unit_number,
            chunk_index=chunk_idx,
            total_chunks=len(chunks),
        )

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": _MAX_COMPLETION_TOKENS,
            "response_format": {"type": "json_object"},
            **openrouter_routing(model),
        }

        if len(chunks) > 1:
            logger.info(f"Chunk {chunk_idx}/{len(chunks)} ({len(chunk):,} chars)...")

        unit_data = None
        for attempt in range(_MAX_RETRIES):
            try:
                if attempt > 0:
                    wait_time = _BASE_DELAY * (3 ** attempt)
                    logger.info(f"Retry {attempt+1}/{_MAX_RETRIES} after {wait_time}s...")
                    time.sleep(wait_time)

                logger.info(f"Calling OpenRouter (attempt {attempt+1}/{_MAX_RETRIES})...")
                start_time = time.time()

                resp = traced_post("extract-auto-schema",
                    _LLM_BASE_URL,
                    headers=headers, json=payload, timeout=timeout,
                )

                elapsed = time.time() - start_time
                logger.info(f"API responded in {elapsed:.1f}s (status {resp.status_code})")

                if not resp.ok:
                    try:
                        err = resp.json()
                        logger.error(f"API error: {err}")
                    except Exception:
                        logger.error(f"API error: {resp.text[:300]}")
                    resp.raise_for_status()

                data = resp.json()
                choice = data["choices"][0]
                raw_content = choice["message"].get("content") or ""
                finish_reason = choice.get("finish_reason", "stop")
                logger.info(f"Response: {len(raw_content):,} chars (finish_reason={finish_reason})")

                # Handle empty response — retry
                if not raw_content.strip():
                    logger.warning(f"Empty response (attempt {attempt+1}) — retrying...")
                    continue

                # Handle truncation
                if finish_reason == "length":
                    raw_content = _recover_truncated_json(
                        raw_content, payload, headers, timeout
                    )

                unit_data = _parse_json_robust(raw_content)
                if unit_data:
                    break

            except Exception as e:
                logger.error(f"Attempt {attempt+1} error: {e}")

        if unit_data:
            # Inject part name if needed
            if part_name and unit_data.get("part") != part_name:
                unit_data["part"] = part_name
            chunk_results.append(unit_data)
        else:
            logger.warning(f"Chunk {chunk_idx} failed — continuing with remaining chunks")

    if not chunk_results:
        logger.error(f"[Auto-Schema] All chunks failed")
        return None

    # Merge chunks (realigning section ids against the cleaned source headings)
    merged = merge_extracted_chunks(chunk_results, source_md=cleaned_content)

    # Guarantee every printed Exercise/Example made it into the extraction
    try:
        merged = reconcile_missing_entities(merged, cleaned_content, api_key, model)
    except Exception as rec_err:
        logger.warning(f"[Reconcile] failed (continuing with unreconciled result): {rec_err}")

    section_count = len(merged.get("sections", []))
    section_types = [s.get("type", "?") for s in merged.get("sections", [])]
    type_summary = ", ".join(
        f"{t}:{section_types.count(t)}" for t in sorted(set(section_types))
    )
    logger.info(f"[Auto-Schema] Extracted {section_count} sections [{type_summary}]")

    # Verify discovered types are all present in extraction
    extracted_types = set(section_types)
    expected_types = set(discovered_types) - {"introduction", "learning_objectives", "points_to_remember"}
    missing_types = expected_types - extracted_types
    if missing_types:
        logger.warning(f"[Auto-Schema] Types in discovery but not extraction: {missing_types}")

    return merged



# CONVENIENCE: Detect unit number from content


def detect_unit_number(content_md: str) -> Optional[int]:
    """Try to detect unit/chapter number from the content."""
    patterns = [
        r'(?:^|\n)\s*(?:#\s*)?Unit\s*[-–]?\s*(\d+)',
        r'(?:^|\n)\s*(?:#\s*)?Chapter\s+(\d+)',
        r'(?:^|\n)\s*(?:#\s*)?UNIT\s+(\d+)',
        r'(?:^|\n)\s*(\d+)\s*$',  # bare number at start
    ]
    for pat in patterns:
        m = re.search(pat, content_md[:2000], re.IGNORECASE)
        if m:
            num = int(m.group(1))
            if 1 <= num <= 50:
                return num
    return None
