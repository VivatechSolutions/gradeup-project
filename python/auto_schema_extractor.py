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
_MAX_COMPLETION_TOKENS = 15000
_DISCOVERY_MAX_TOKENS = 2048
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


def _split_into_chunks(text: str, max_chars: int = 15000, overlap_chars: int = 1500) -> List[str]:
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


def clean_content_for_extraction(text: str) -> str:
    """
    Clean OCR artifacts while preserving all educational content.
    More conservative than the old _clean_content_for_api to avoid losing grammar sections.
    """
    # Normalize line endings (handles \r\n from Windows files)
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # Drop scanned-image tags entirely — images are never stored or embedded
    text = strip_image_tags(text)

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
        print(f"  🪝 [Hoist] Rescued {hoist_count} section(s) trapped inside sibling dicts")
    return out


# SECTION-ID REALIGNMENT — trust the textbook headings, not the LLM
#
# LLMs sometimes INVENT a section number for an unnumbered heading (e.g. the
# textbook prints "## Highest Common Factor of three numbers" with no number
# between 2.3 and 2.4, and the LLM assigns it "2.4") and then renumber every
# following real section to keep their sequence consistent. This corrupts the
# whole hierarchy. The fix is deterministic: match each extracted section
# title against the ACTUAL headings in the source markdown and take the
# number (or absence of one) from the textbook.

_SRC_HEADING_RE = re.compile(
    r'^#{1,6}\s*\**\s*(?:(\d+(?:\.\d+)+)\s*[\.\):]*\s*)?(.*?)[\s\*]*$'
)

# Standalone bold lines that carry a section number act as headings in some
# OCR outputs (e.g. "**2.2.1 Generalised form of Euclid's division lemma**")
_BOLD_HEADING_RE = re.compile(
    r'^\*\*\s*(\d+(?:\.\d+)+)\s*[\.\):]*\s*([^*]+?)\s*\*\*$'
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
    _NUM_RE = re.compile(r'^(\d+(?:\.\d+)+)')
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
        if sec.get("type") != "section":
            continue
        sid = str(sec.get("id") or "").strip()
        title = str(sec.get("title") or "").strip()

        m_id = _NUM_RE.match(sid)
        m_title = re.match(r'^\s*(\d+(?:\.\d+)+)\s*[\.\):]?\s*(.*)$', title)
        claimed = m_id.group(1) if m_id else (m_title.group(1) if m_title else None)
        bare_title = m_title.group(2).strip() if m_title else title
        if not bare_title:
            # Mangled id like "2.4 Fundamental Theorem of Arithmetic" with an
            # empty title — recover the title text from the id itself
            m_id_full = re.match(r'^(\d+(?:\.\d+)+)\s+(\S.*)$', sid)
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
        print(f"  🔧 [ID Realign] {fixed} id(s) corrected from source headings, "
              f"{cleared} invented id(s) cleared")
    return sections


def _postprocess_sections(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Clean up common LLM extraction issues:
    1. Remove empty chapter/unit title-only sections
    2. Split 'Solution:' from example content into metadata.solution
    """
    cleaned = []

    # Rescue any sections still trapped inside sibling dicts (idempotent —
    # merge_extracted_chunks already hoists, this covers direct callers)
    sections = _hoist_nested_sections(sections)

    for section in sections:
        stype = section.get("type", "")
        title = (section.get("title") or "").strip()

        # Normalize mangled ids like "2.4 Fundamental Theorem of Arithmetic":
        # numeric part -> id, text part -> title (when title is empty)
        sid_raw = str(section.get("id") or "").strip()
        m_idtext = re.match(r'^(\d+\.\d+(?:\.\d+)*)\s+(\S.*)$', sid_raw)
        if m_idtext:
            section["id"] = m_idtext.group(1)
            if not title:
                title = m_idtext.group(2).strip()
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
            r'^(Exercise|Example|Activity|Theorem|Illustration|Problem)s?\s+(\d+(?:\.\d+)*)\s*$',
            title, re.IGNORECASE,
        )
        if m_label:
            label_word = m_label.group(1).lower()
            label_type = _LABEL_TYPE_MAP[label_word]
            sid_now = str(section.get("id") or "").strip()
            if re.match(r'^\d+(?:\.\d+)*$', sid_now) or not sid_now:
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

        # Strip section number prefixes (e.g. "2.1 Introduction" -> "Introduction")
        if title:
            # Before stripping, recover the section number into "id" if the LLM
            # left it only in the title — the hierarchy builder keys off "id".
            m_num = re.match(r'^\s*(\d+\.\d+(?:\.\d+)*)\b', title)
            existing_id = str(section.get("id") or "").strip()
            if m_num and not re.match(r'^\d+\.\d+(?:\.\d+)*', existing_id):
                section["id"] = m_num.group(1)
            title = re.sub(r'^\s*\d+\.\d+(?:\.\d+)*\s*[-–:]?\s*', '', title).strip()
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
    _NUMBERED_SECTION_RE = re.compile(r'^(\d+\.\d+(?:\.\d+)*)(?:\s|$)')

    # Deterministic hierarchy builder — nests numbered sections at ANY depth
    # (1.3 → 1.3.1 → 1.3.1.2) purely from their "id" numbers, preserving
    # document order. A stack holds the currently-open section path; a new
    # numbered section pops the stack until the top is its numeric parent
    # prefix, then attaches there (or at top level).
    final: List[Dict[str, Any]] = []
    stack: List[tuple] = []   # [(number_str, section_dict), ...] open path

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
                        print(f"  ⚠️  Filter 11: Detected missing sections: {missing}")
                        print(f"       (gap between {ch}.{sec_nums[i]} and {ch}.{sec_nums[i+1]})")

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

    # --- Filter 14: Deduplicate content of standalone sections from parent sections ---
    has_standalone_lo = any(s.get("type") == "learning_objectives" for s in merged_final)
    has_standalone_intro = any(s.get("type") == "introduction" for s in merged_final)

    if has_standalone_lo or has_standalone_intro:
        for section in merged_final:
            if section.get("type") == "section":
                content = section.get("content") or ""
                if isinstance(content, str) and content:
                    if has_standalone_lo:
                        content = re.sub(
                            r'(?i)(?:^|\n)#+\s*Learning\s+Objectives?.*?(?=\n#+|\Z)',
                            '\n',
                            content,
                            flags=re.DOTALL
                        )
                    if has_standalone_intro:
                        content = re.sub(
                            r'(?i)(?:^|\n)#+\s*Introduction:?.*?(?=\n#+|\Z)',
                            '\n',
                            content,
                            flags=re.DOTALL
                        )
                    content = re.sub(r'\n{3,}', '\n\n', content).strip()
                    section["content"] = content

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
            print(f"  🧹 [Normalize] Dropped duplicate exercise: {sec.get('id') or sec.get('title')}")
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
    m = re.search(r'(?m)^\**\s*Solution\s*\**\s*[:.]?\s*$|\*\*Solution\*\*|(?<=\n)Solution[:.]',
                  body)
    if m:
        problem = body[:m.start()].strip()
        solution = body[m.end():].strip()
    else:
        problem, solution = body, ""
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

    if not missing and not deficient:
        print("  ✅ [Reconcile] All printed Exercises/Examples present in extraction")
        return merged

    print(f"  🔎 [Reconcile] missing: {[a['id'] for a in missing]} | "
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
            print(f"  ♻️  [Reconcile] Refilled empty {a['id']} "
                  f"({len(recovered.get('sub_items') or [])} questions)")

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
            print(f"  ⚠️  [Reconcile] Could not recover {a['id']}")
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
                print(f"  ➕ [Reconcile] Recovered {a['id']} under section {owner_num}")
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
        print(f"  ➕ [Reconcile] Recovered {a['id']} at position {insert_at} ({n_q} questions)")

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
            for section in chunk.get("sections") or []:
                stype = str(section.get("type") or "").strip().lower()
                if stype in SINGLETON_SECTION_TYPES:
                    if stype in seen_singletons:
                        title = (section.get("title") or "(untitled)").strip()
                        print(f"  [merge] Dropped duplicate '{stype}' section "
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
        merged["sections"] = _postprocess_sections(merged["sections"])

        # ── Filter: Remove redundant unit title section and merge its content ──
        unit_title_norm = re.sub(r'\s+', ' ', (merged.get("title") or "")).strip().lower()
        sections = merged.get("sections", [])
        if len(sections) > 1:
            first_sec = sections[0]
            first_title_norm = re.sub(r'\s+', ' ', (first_sec.get("title") or "")).strip().lower()
            if unit_title_norm and first_title_norm == unit_title_norm:
                print(f"  ✨ [Filter] Found redundant unit title section: '{first_sec.get('title')}'")
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

    # Enforce strict schema ordering before returning
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



# PER-CHUNK LLM CALL (used by extraction_agent.py)


def _call_llm_for_extraction(
    system_prompt: str,
    user_prompt: str,
    model: str,
    api_key: str,
    timeout: int = _API_TIMEOUT,
) -> Optional[str]:
    """
    Make a single OpenAI chat-completions call for extraction.

    Returns the raw string content from the model response, or None on failure.
    Handles retries, truncation recovery, and content_filter fallback.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "max_completion_tokens": _MAX_COMPLETION_TOKENS,
        "response_format": {"type": "json_object"},
    }

    for attempt in range(_MAX_RETRIES):
        try:
            if attempt > 0:
                wait_time = _BASE_DELAY * (3 ** attempt)
                print(f"  ⏳ Retry {attempt+1}/{_MAX_RETRIES} after {wait_time}s...")
                time.sleep(wait_time)

            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers, json=payload, timeout=timeout,
            )

            if not resp.ok:
                try:
                    print(f"  ❌ API error: {resp.json()}")
                except Exception:
                    print(f"  ❌ API error: {resp.text[:300]}")
                resp.raise_for_status()

            data         = resp.json()
            choice       = data["choices"][0]
            raw_content  = choice["message"].get("content") or ""
            finish_reason = choice.get("finish_reason", "stop")

            # content_filter / empty — try fallback model once
            if finish_reason == "content_filter" or not raw_content.strip():
                if model != _FALLBACK_MODEL:
                    print(f"  ⚠️  {finish_reason or 'empty'}: trying {_FALLBACK_MODEL} fallback...")
                    fb_payload = {**payload, "model": _FALLBACK_MODEL}
                    try:
                        fb_resp = requests.post(
                            "https://api.openai.com/v1/chat/completions",
                            headers=headers, json=fb_payload, timeout=timeout,
                        )
                        if fb_resp.ok:
                            fb_data = fb_resp.json()
                            if fb_data.get("choices"):
                                fb_raw    = fb_data["choices"][0]["message"]["content"]
                                fb_reason = fb_data["choices"][0].get("finish_reason", "stop")
                                if fb_reason != "content_filter" and fb_raw:
                                    if fb_reason == "length":
                                        fb_raw = _recover_truncated_json(fb_raw, fb_payload, headers, timeout)
                                    return fb_raw
                    except Exception as fb_err:
                        print(f"  ⚠️  Fallback failed: {fb_err}")
                continue

            # Handle truncation
            if finish_reason == "length":
                raw_content = _recover_truncated_json(raw_content, payload, headers, timeout)

            return raw_content

        except Exception as e:
            print(f"  ❌ Attempt {attempt+1} error: {e}")

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

    # Merge chunks (realigning section ids against the cleaned source headings)
    merged = merge_extracted_chunks(chunk_results, source_md=cleaned_content)

    # Guarantee every printed Exercise/Example made it into the extraction
    try:
        merged = reconcile_missing_entities(merged, cleaned_content, api_key, model)
    except Exception as rec_err:
        print(f"  ⚠️  [Reconcile] failed (continuing with unreconciled result): {rec_err}")

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
