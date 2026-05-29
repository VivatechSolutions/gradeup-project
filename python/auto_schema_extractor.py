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
from dotenv import load_dotenv

load_dotenv()


# CONFIGURATION


_DEFAULT_MODEL = "gpt-5-mini"
_FALLBACK_MODEL = "gpt-4o"
_MAX_COMPLETION_TOKENS = 32_768
_DISCOVERY_MAX_TOKENS = 2048
_API_TIMEOUT = 600
_MAX_RETRIES = 3
_BASE_DELAY = 10
_CHUNK_MAX_CHARS = 40_000
_CHUNK_OVERLAP_CHARS = 2_000


# TYPE CATALOG — rules for each section type, used to build dynamic prompts


TYPE_CATALOG = {
    # --- Universal types (any subject) ---
    "introduction": {
        "description": "Opening paragraph(s) of a chapter/unit",
        "extract_rule": "Extract the full introductory text before the first numbered section.",
        "fields": "content"
    },
    "learning_objectives": {
        "description": "Goals/outcomes listed at the start (bullet points)",
        "extract_rule": "Extract every bullet point as a separate string.",
        "fields": "content as list of strings"
    },
    "section": {
        "description": "A numbered/named content section (e.g. 1.1, 1.2, Chapter 3)",
        "extract_rule": "Extract the COMPLETE prose into 'content'. Do NOT create subsections. Merge ALL text, including nested subsection headings (e.g. 1.3.1) and their content, directly into the main section's 'content' field as inline text. Merge Illustrations directly into section 'content'.",
        "fields": "id (number), title, content"
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
        "description": "Illustrated explanation with figures (Merge if part of a section)",
        "extract_rule": "Usually merged into the parent section's 'content'. If standalone, extract full text.",
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
2. For hierarchical text sections, DO NOT list deep subsections (like 1.3.1) as separate entries. They should just be considered part of their parent main section (e.g. 1.3).
3. Only main sections (N.M) should be separate "section" entries.
4. Illustrations should be part of the preceding section's content.
5. A story/essay followed by questions = at MINIMUM two entries: prose + exercise.

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
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _DISCOVERY_SYSTEM_PROMPT},
            {"role": "user", "content": f"Analyze this textbook unit and list ALL section types present:\n\n{sample}"},
        ],
        "max_completion_tokens": _DISCOVERY_MAX_TOKENS,
        "response_format": {"type": "json_object"},
    }

    # Try with primary model first, then fallback model
    models_to_try = [model]
    if _FALLBACK_MODEL != model:
        models_to_try.append(_FALLBACK_MODEL)

    for current_model in models_to_try:
        for attempt in range(_MAX_RETRIES):
            try:
                if attempt > 0:
                    time.sleep(_BASE_DELAY * (2 ** attempt))

                current_payload = {**payload, "model": current_model}
                print(f"  🔄 [Phase 1] Calling {current_model} (attempt {attempt+1})...")
                
                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers, json=current_payload, timeout=120,
                )
                resp.raise_for_status()
                data = resp.json()
                choice = data["choices"][0]
                raw = choice["message"].get("content") or ""
                finish_reason = choice.get("finish_reason", "stop")

                # Handle content_filter — empty response
                if finish_reason == "content_filter" or not raw.strip():
                    print(f"  ⚠️  [Phase 1] content_filter / empty response from {current_model}")
                    if current_model == model and _FALLBACK_MODEL != model:
                        print(f"  🔄 [Phase 1] Will retry with {_FALLBACK_MODEL}...")
                        break  # break inner loop to try fallback model
                    continue  # retry same model

                parsed = orjson.loads(raw)

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
                    print(f"  📋 [Phase 1] Discovered {len(result)} sections: {types_found}")
                    return result
                else:
                    print(f"  ⚠️  [Phase 1] Discovery returned empty sections — attempt {attempt+1}")

            except Exception as e:
                print(f"  ❌ [Phase 1] Discovery attempt {attempt+1} ({current_model}) failed: {e}")

    # Fallback: use heuristic-based structure detection (no LLM)
    print(f"  ⚠️  [Phase 1] All LLM attempts failed — using heuristic detection")
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
        r'(?:^|\n)#{1,4}\s*(\d+\.\d+(?:\.\d+)*)\s+(.+)',
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
    print(f"  📋 [Phase 1 Heuristic] Detected {len(result)} sections: {types_found}")
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
  "introduction": "<intro text or null>",
  "learning_objectives": ["<objective 1>", ...],
  "sections": [
    {{
      "type": "<type from list above>",
      "id": "<identifier if any — e.g. 'A', 'Example 1.3', 'Exercise 2'>",
      "title": "<heading text or null>",
      "content": "<FULL text — NEVER truncate>",
      "metadata": {{}},
      "image_urls": ["<image.jpg or null>", ...],
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

2. HIERARCHICAL SECTIONS — NEVER dump multiple N.M main sections into one entry.
   Nested subsections (e.g. 1.7.1, 1.7.3) should be merged smoothly into the "content"
   field of their main parent section (e.g. 1.7).

3. ILLUSTRATIONS and IMAGES — Extract any image sources (like img-4. SECTION CONTENT — For type="section", put the text directly under the main heading into "content". Include any nested numbering (like 1.1.1) within the "content" field BUT NEVER INLINE standalone entities like Activity, Problem, Example, or Exercise.

5. INLINE BOXES: Activities, Examples, Problems, Exercises, and 'Do You Know' boxes MUST ALWAYS be extracted as their own separate top-level sections. NEVER merge them into a parent section's 'content', even if they appear in the middle of a section.

6. GRAMMAR is CRITICAL — extract BOTH the explanation AND all exercises.
   Grammar sections often have sub-exercises (A, B, C, D...) — each becomes a sub_item.

7. EXERCISES — each numbered question is a sub_item with {{"number", "content", "options"}}.
   NEVER merge multiple questions into one sub_item. Include ALL options for MCQs.

8. PROSE/POEM/SUPPLEMENTARY — include the COMPLETE text. Never truncate or summarize.
   For poems: content="" and stanzas go in sub_items[{{"number":"stanza_1", "content":"lines"}}].

9. VOCABULARY — each word-meaning pair is a sub_item: {{"number": "word", "content": "meaning"}}.

10. IGNORE: Page stamps (.indd lines), timestamps, page numbers, Reprint lines,
    page/book stamps (e.g. '2 / Moments', 'The Lost Child / 3'), QR codes.

11. DO NOT USE PAGES ARRAY: Never output a "pages" array. If the content spans multiple pages, merge them into the appropriate hierarchical "sections". The top-level structure MUST be: unit_number, title, introduction, learning_objectives, sections[].

12. Return ONLY valid JSON. No markdown fences. No commentary.

13. EXAMPLES (for maths/science) — For sections with type="example":
    - "content" must contain ONLY the problem statement / question.
    - The solution MUST go in "metadata": {{"solution": "full solution text here"}}.
    - NEVER merge the solution into the content field.
    Example: {{"type":"example", "title":"Example 1", "content":"Find 5 rational numbers...",
              "metadata":{{"solution":"Solution 1: ... Solution 2: ..."}} }}

    However, ALWAYS create sections for numbered headings (e.g. '2.1', '2.2') even if they follow the title.

15. CHUNK OVERLAPS: If a text chunk starts in the middle of a paragraph with NO heading visible, skip that partial text. However, if a sub-section heading IS clearly visible (e.g. "## 2.3.3 Uniform acceleration"), you MUST extract it — even if the parent section (2.3) was in a previous chunk. NEVER skip content that has a visible heading. Missing content is the WORST error.
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


def _split_into_chunks(text: str, max_chars: int = 15000, overlap_chars: int = 1500) -> List[str]:
    """
    Split text into chunks with overlap, breaking at section boundaries.
    The overlap ensures sections at chunk boundaries are captured in both chunks.
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

        # Flush before a new section if chunk is large enough
        if is_boundary and current_len >= max_chars * 0.65 and current_lines:
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


def clean_content_for_extraction(text: str) -> str:
    """
    Clean OCR artifacts while preserving all educational content.
    More conservative than the old _clean_content_for_api to avoid losing grammar sections.
    """
    # Normalize line endings (handles \r\n from Windows files)
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    lines = text.split('\n')
    cleaned = []

    for line in lines:
        s = line.strip()

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

def _postprocess_sections(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Clean up common LLM extraction issues:
    1. Remove empty chapter/unit title-only sections
    2. Split 'Solution:' from example content into metadata.solution
    """
    cleaned = []

    for section in sections:
        stype = section.get("type", "")
        title = (section.get("title") or "").strip()
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

        # --- Filter 2: Split interleaved Examples/Theorems from Section content ---
        # Sometimes LLMs dump an example into the 'content' of a 'section' type.
        if stype == "section" and content:
            # Pattern: matches "Example X", "Theorem X", "Exercise X", "Activity X", "Problem X" at start of line or string
            split_pat = r'(?:\n\s*|\A)((?:Example|Theorem|Exercise|Activity|Problem)\s+\d+(?:\.\d+)*[:.]?\s*)'
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
                             "activity" if "activity" in h_lower else "exercise"
                    
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
                        sol_m = re.search(r'\n\s*Solution\s*[:]\s*', c_text, re.IGNORECASE)
                        if sol_m:
                            new_sec["content"] = c_text[:sol_m.start()].strip()
                            new_sec["metadata"]["solution"] = c_text[sol_m.end():].strip()
                    
                    cleaned.append(new_sec)
                continue # Skip the default append for this section

        # --- Filter 3: Split Solution from example content ---
        if stype == "example":
            metadata = section.get("metadata") or {}
            # Check if solution is already properly separated
            if not metadata.get("solution"):
                # Look for "Solution" in the content
                sol_match = re.search(
                    r'\n\s*Solution\s*[:]\s*', content, re.IGNORECASE
                )
                if sol_match:
                    question_part = content[:sol_match.start()].strip()
                    solution_part = content[sol_match.end():].strip()
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
                '',
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

        cleaned.append(section)

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
        if sid and re.match(r'^(?:\d+\s+)?\d+(?:\.\d+)+$', sid.split()[0]):
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
        elif stype == "section" and level > 1:
            # It's a nested subsection (like 1.1.1). Inline merge into its parent (Level 1, e.g., 1.1)
            parent_level = level - 1
            parent = active_parents.get(parent_level)
            
            if parent:
                title = (section.get("title") or sid).strip()
                content = (section.get("content") or "").strip()
                addition = f"{title}\n{content}".strip() if title else content
                
                if addition:
                    parent_content = str(parent.get("content", "")).strip()
                    fingerprint = re.sub(r'\s+', ' ', addition).lower()[:150]
                    parent_normalized = re.sub(r'\s+', ' ', parent_content).lower()
                    
                    if fingerprint and fingerprint not in parent_normalized:
                        if parent_content:
                            parent["content"] = f"{parent_content}\n\n{addition}"
                        else:
                            parent["content"] = addition
                    else:
                        # Content already exists in parent — skip this duplicate subsection
                        active_parents[level] = parent
                        continue
                
                if section.get("sub_items"):
                    parent_subs = parent.get("sub_items", [])
                    parent_subs.extend(section.get("sub_items", []))
                    parent["sub_items"] = parent_subs

                # Deeper sections (1.1.1.1) will also map to this parent
                active_parents[level] = parent
                continue
            else:
                # No parent found, keep it top-level
                merged.append(section)
                active_parents[level] = section
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


    # --- Filter 9: Deduplicate sections with the same title ---
    # When content is chunked, overlapping chunks can produce duplicate sections.
    # We only want to merge them if they represent the same section. If they are disjoint
    # running headers, we should discard the fake header and append the orphaned text to the previous section.
    deduped = []
    title_index = {}  # normalized title -> index in deduped list
    id_index = {}     # section id -> index in deduped list
    for section in merged:
        title_raw = (section.get("title") or "").strip()
        title_norm = re.sub(r'\s+', ' ', title_raw).lower()
        section_id = (section.get("id") or "").strip()
        
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
                    if stype in {"activity", "example", "exercise", "problem", "do_you_know", "note", "try_this", "thinking_corner"}:
                        # Distinct entities with the same generic title (e.g. "Activity"). Keep as separate section!
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
    _NESTABLE_TYPES = {
        "activity", "example", "exercise", "note", "do_you_know", "more_to_know",
        "try_this", "thinking_corner", "progress_check", "illustration",
    }
    _BACK_MATTER_RESET = {
        "summary", "glossary", "unit_exercise", "multiple_choice",
        "reference_books", "ict_corner", "map_work", "timeline",
        "points_to_remember",
    }
    _NUMBERED_SECTION_RE = re.compile(r'^(\d+\.\d+)(?:\s|$)')

    # Build an ordered list: for each item, determine whether it's a parent section,
    # an inline item to nest, or a standalone top-level item.
    # We use index-based tracking so we know which parent each inline item belongs to.
    current_parent_idx = None   # index into deduped list
    current_parent_id = None

    # Map: parent index in deduped → list of inline items to nest
    parent_children: Dict[int, List[Dict]] = {}
    items_to_remove: set = set()  # indices of inline items that will be nested

    for idx, section in enumerate(deduped):
        stype = section.get("type", "")
        sid = str(section.get("id", "")).strip()

        # Update current parent when we see a numbered main section
        if stype == "section":
            m = _NUMBERED_SECTION_RE.match(sid)
            if m:
                current_parent_idx = idx
                current_parent_id = m.group(1)
                continue

        # Back-matter types reset the parent
        if stype in _BACK_MATTER_RESET:
            current_parent_idx = None
            current_parent_id = None
            continue

        # Nest inline types inside their parent
        if stype in _NESTABLE_TYPES and current_parent_idx is not None:
            parent_children.setdefault(current_parent_idx, []).append(section)
            items_to_remove.add(idx)

    # Now rebuild the final list: keep only non-nested items, and add sub_sections
    final = []
    for idx, section in enumerate(deduped):
        if idx in items_to_remove:
            continue  # This item is nested inside a parent — skip it at top level
        # If this section has children, add them as sub_sections
        if idx in parent_children:
            section["sub_sections"] = parent_children[idx]
        final.append(section)

    return final


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
        print("  ⚠️  [Schema Normalization] Unwrapping nested 'unit' wrapper...")
        inner = data.pop("unit")
        for k, v in inner.items():
            if k not in data:
                data[k] = v
    
    # ── Unwrap nested "content" wrapper for sections ──
    if "content" in data and isinstance(data["content"], dict) and "sections" in data["content"]:
        print("  ⚠️  [Schema Normalization] Unwrapping nested 'content' wrapper...")
        data["sections"] = data.pop("content")["sections"]

    # ── CASE 1: Page-based schema {"pages": [{"content": [...]}]} ──
    if "pages" in data and not data.get("sections"):
        print("  ⚠️  [Schema Normalization] Detected page-based schema — converting to sections...")
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
                        # Preserve image filename in content for S3 patching
                        # Check "filename" first (kegy304 pattern), then "file"/"src"
                        img_file = (element.get("filename")
                                    or element.get("file")
                                    or element.get("src") or "")
                        img_text = f"![image]({img_file})" if img_file else "[image]"
                        if new_sections:
                            new_sections[-1]["content"] += f"\n\n{img_text}"
                        else:
                            new_sections.append({"type": "other", "content": img_text})
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


def merge_extracted_chunks(chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge multiple chunk extraction results into one complete result.
    Uses safe deduplication that won't drop distinct sections.
    """
    if not chunks:
        return {}

    if len(chunks) == 1:
        merged = chunks[0]
    else:
        merged: Dict[str, Any] = {}

        # Scalar fields: first non-null value wins
        scalar_fields = ["unit_number", "chapter_number", "title", "subject",
                         "part", "introduction"]
        for field in scalar_fields:
            for chunk in chunks:
                val = chunk.get(field)
                if val is not None and val != "" and val != []:
                    merged[field] = val
                    break
            if field not in merged:
                merged[field] = chunks[0].get(field)

        # List fields: concatenate with dedup
        for field in ["learning_objectives", "points_to_remember"]:
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
        all_sections = []
        for chunk in chunks:
            for section in chunk.get("sections") or []:
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

    # ── Post-processing: clean up common LLM issues ──
    if "sections" in merged:
        merged["sections"] = _postprocess_sections(merged["sections"])

        # ── Rename chapter-title/introduction sections to Section/Introduction ──
        unit_title_norm = re.sub(r'\s+', ' ', (merged.get("title") or "")).strip().lower()
        for idx, section in enumerate(merged.get("sections", [])):
            sec_title_norm = re.sub(r'\s+', ' ', (section.get("title") or "")).strip().lower()
            sec_type = section.get("type", "").strip().lower()
            # If a section's title perfectly matches the main unit title, or its type was marked introduction
            if (unit_title_norm and sec_title_norm == unit_title_norm) or sec_type == "introduction":
                section["title"] = "Introduction"
                section["type"] = "section"

    return merged



# TRUNCATION RECOVERY


def _recover_truncated_json(
    raw_content: str,
    payload: dict,
    headers: dict,
    timeout: int = _API_TIMEOUT,
) -> str:
    """Attempt to recover truncated JSON by asking the LLM to continue."""
    print(f"  ⚠️  [Truncation Recovery] Output truncated — requesting continuation...")
    recovery_messages = payload["messages"] + [
        {"role": "assistant", "content": raw_content},
        {"role": "user", "content": (
            "Your JSON was cut off because of the output token limit. "
            "Continue from EXACTLY where you stopped. "
            "Output ONLY the remaining JSON — no explanation, no markdown fences."
        )}
    ]
    recovery_payload = {**payload, "messages": recovery_messages, "max_completion_tokens": 8192}
    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers, json=recovery_payload, timeout=timeout,
        )
        if resp.ok:
            continuation = resp.json()["choices"][0]["message"]["content"]
            print(f"  ✅ [Truncation Recovery] Appended {len(continuation):,} chars")
            return raw_content + continuation
    except Exception as e:
        print(f"  ⚠️  [Truncation Recovery] Failed: {e}")
    return raw_content


def _parse_json_robust(raw: str) -> Optional[Dict[str, Any]]:
    """Parse JSON with fallback for truncated responses."""
    # Strip markdown fences
    cleaned = re.sub(r'^```[a-z]*\n?', '', raw.strip()).rstrip('`').strip()
    try:
        return orjson.loads(cleaned.encode() if isinstance(cleaned, str) else cleaned)
    except Exception:
        # Try to salvage partial JSON
        for end in range(len(cleaned), 0, -1):
            if cleaned[end-1] in ('}', ']'):
                try:
                    result = orjson.loads(cleaned[:end].encode())
                    print(f"  ✅ [JSON Salvage] Recovered JSON up to char {end}")
                    return result
                except Exception:
                    continue
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
    print(f"\n  🔍 [Auto-Schema] Starting extraction ({len(content_md):,} chars)...")

    # Clean content
    cleaned_content = clean_content_for_extraction(content_md)
    print(f"  🧹 Cleaned: {len(content_md):,} → {len(cleaned_content):,} chars")

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
    }

    # Split into chunks with overlap
    chunks = _split_into_chunks(cleaned_content, max_chars=_CHUNK_MAX_CHARS, overlap_chars=_CHUNK_OVERLAP_CHARS)
    print(f"  📦 Split into {len(chunks)} chunk(s)")

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
            "max_completion_tokens": _MAX_COMPLETION_TOKENS,
            "response_format": {"type": "json_object"},
        }

        if len(chunks) > 1:
            print(f"  🔀 Chunk {chunk_idx}/{len(chunks)} ({len(chunk):,} chars)...")

        unit_data = None
        for attempt in range(_MAX_RETRIES):
            try:
                if attempt > 0:
                    wait_time = _BASE_DELAY * (3 ** attempt)
                    print(f"  ⏳ Retry {attempt+1}/{_MAX_RETRIES} after {wait_time}s...")
                    time.sleep(wait_time)

                print(f"  🔄 Calling API (attempt {attempt+1}/{_MAX_RETRIES})...")
                start_time = time.time()

                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers, json=payload, timeout=timeout,
                )

                elapsed = time.time() - start_time
                print(f"  ✅ API responded in {elapsed:.1f}s (status {resp.status_code})")

                if not resp.ok:
                    try:
                        err = resp.json()
                        print(f"  ❌ API error: {err}")
                    except Exception:
                        print(f"  ❌ API error: {resp.text[:300]}")
                    resp.raise_for_status()

                data = resp.json()
                choice = data["choices"][0]
                raw_content = choice["message"].get("content") or ""
                finish_reason = choice.get("finish_reason", "stop")
                print(f"  📊 Response: {len(raw_content):,} chars (finish_reason={finish_reason})")

                # Handle content_filter or empty response
                if finish_reason == "content_filter" or not raw_content.strip():
                    if model != _FALLBACK_MODEL:
                        print(f"  ⚠️  {finish_reason or 'empty response'}: trying {_FALLBACK_MODEL} fallback...")
                        fb_payload = {**payload, "model": _FALLBACK_MODEL}
                        try:
                            fb_resp = requests.post(
                                "https://api.openai.com/v1/chat/completions",
                                headers=headers, json=fb_payload, timeout=timeout,
                            )
                            if fb_resp.ok:
                                fb_data = fb_resp.json()
                                if fb_data.get("choices"):
                                    fb_raw = fb_data["choices"][0]["message"]["content"]
                                    fb_reason = fb_data["choices"][0].get("finish_reason", "stop")
                                    if fb_reason != "content_filter" and fb_raw:
                                        if fb_reason == "length":
                                            fb_raw = _recover_truncated_json(
                                                fb_raw, fb_payload, headers, timeout
                                            )
                                        unit_data = _parse_json_robust(fb_raw)
                                        if unit_data:
                                            break
                        except Exception as fb_err:
                            print(f"  ⚠️  Fallback failed: {fb_err}")
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
                print(f"  ❌ Attempt {attempt+1} error: {e}")

        if unit_data:
            # Inject part name if needed
            if part_name and unit_data.get("part") != part_name:
                unit_data["part"] = part_name
            chunk_results.append(unit_data)
        else:
            print(f"  ⚠️  Chunk {chunk_idx} failed — continuing with remaining chunks")

    if not chunk_results:
        print(f"  ❌ [Auto-Schema] All chunks failed")
        return None

    # Merge chunks
    merged = merge_extracted_chunks(chunk_results)

    section_count = len(merged.get("sections", []))
    section_types = [s.get("type", "?") for s in merged.get("sections", [])]
    type_summary = ", ".join(
        f"{t}:{section_types.count(t)}" for t in sorted(set(section_types))
    )
    print(f"  ✅ [Auto-Schema] Extracted {section_count} sections [{type_summary}]")

    # Verify discovered types are all present in extraction
    extracted_types = set(section_types)
    expected_types = set(discovered_types) - {"introduction", "learning_objectives", "points_to_remember"}
    missing_types = expected_types - extracted_types
    if missing_types:
        print(f"  ⚠️  [Auto-Schema] Types in discovery but not extraction: {missing_types}")

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
