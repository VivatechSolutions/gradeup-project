"""
LLM-First Structuring Pipeline
================================

WHY THIS EXISTS
---------------
OCR output (content.md) from Mistral is inconsistent across PDFs:
  - Some units start with   "# Unit 3"
  - Some start with         "UNIT 3"   (no markdown #)
  - Some start with         "Unit - 3"
  - CBSE Poorvi uses        "# I", "# II" for story PARTS, not unit numbers
  - Some have no unit marker at all (single-unit PDFs)

This inconsistency makes regex-based boundary detection fragile and
causes extract_unit_content() to return 0 chars → entire unit skipped.

SOLUTION: LLM reads the raw content.md directly and structures it.
No regex. No boundary detection. No unit extraction. The LLM decides
what is a unit, what is a section, and outputs structured.json directly.

FLOW
----
Old flow (regex-first):
  content.md
    → regex finds "UNIT N" / "# Unit N" boundaries
    → extract_unit_content() slices text per unit
    → LLM structures each unit slice
    → merge into structured.json
  ❌ Breaks when OCR uses unexpected header format

New flow (LLM-first):
  content.md
    → LLM reads EVERYTHING in one pass (or semantic chunks for large files)
    → LLM identifies units, lessons, sections from meaning — not regex
    → LLM outputs complete structured.json directly
  ✓ Works regardless of OCR header format

TOKEN BUDGET
------------
gpt-4o / gpt-5-mini context: 128K tokens
Typical single-unit Poorvi PDF: ~15K-25K tokens input → fits in one call
Large multi-unit PDFs (>80K tokens): split by lesson/story titles (semantic)

INTEGRATION
-----------
This module is called from ocr_pipeline.py → structure_content_chunked()
when regex-based unit detection returns 0-char content (extraction failure),
OR when the subject is CBSE_ENGLISH (always use LLM-first for reliability).
"""

import re
import time
from typing import Any, Dict, List, Optional

import orjson
import requests

# ── Limits ────────────────────────────────────────────────────────────────────
# Keep input well under 128K context. At ~4 chars/token:
#   80_000 chars ≈ 20_000 tokens input  → leaves ~12K for output (sections)
# For very large files we split at semantic lesson boundaries (story titles).
#
# BUG FIX: 80_000 chars was too large. A full Poorvi unit (prose + exercises +
# grammar + listening + speaking + writing + exploration) produces a JSON output
# that easily exceeds 16_384 tokens, causing finish_reason=length and — when
# combined with response_format=json_object — content="" (empty string).
#
# Lower to 45_000 chars (~11_250 tokens input) so the JSON output for a single
# lesson/story fits comfortably within the 16_384 token output budget.
# Multi-lesson PDFs are split at lesson title boundaries (handled by _semantic_chunks).
_MAX_CHARS_SINGLE_CALL = 45_000   # was 80_000 — reduced to avoid output truncation
_MAX_COMPLETION_TOKENS = 16_384
_API_TIMEOUT = 600
_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 10


# ══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPT
# The LLM is told exactly what to output. No regex required on its end either —
# it reads the content for *meaning* and structures by pedagogy, not by header.
# ══════════════════════════════════════════════════════════════════════════════

_SYSTEM_PROMPT = """\
You are an expert CBSE/NCERT English textbook content extractor.

You handle ALL NCERT English books: Poorvi (Classes 6-8), Beehive (Class 9),
Honeydew (Class 8), First Flight (Class 10).

You receive raw OCR markdown of ONE unit. Output a SINGLE complete JSON object.
Return ONLY valid JSON. No markdown fences. No explanations.

OUTPUT SCHEMA
=============

{
  "unit_number": <integer -- read from "UNIT N" / numbered lesson "1. Title">,
  "title":       <string -- unit theme OR lesson title>,
  "introduction": <string | null>,
  "learning_objectives": [],
  "sections": [ <Section>, ... ]
}

Section:
{
  "type":      <string -- see SECTION TYPES>,
  "id":        <string -- unique, prefixed with lesson slug>,
  "title":     <string | null>,
  "content":   <string -- full story/poem text; empty string for vocabulary>,
  "metadata":  {},
  "sub_items": [ {"number": <str>, "content": <str>, "options": [], "answer": null} ]
}

SECTION TYPES
=============

warm_up
  Poorvi  : "Let us do these activities before we read."
  Beehive : "Before You Read"

prose
  Main story, essay, biography, narrative reading.
  CRITICAL: "# I", "# II", "# III" = PARTS of the SAME story -> merge into ONE prose section.

  CONTENT FIELD — USE PLACEHOLDER (CRITICAL):
  To avoid copyright/content restrictions, set content = "__EXTRACT__" for prose sections.
  Do NOT reproduce the full story text in the JSON output. Python will inject the
  actual text from the source markdown after generation.
  ✅ CORRECT: "content": "__EXTRACT__"
  ❌ WRONG: "content": "Margie even wrote about it that night..." (full story text)

vocabulary
  Sidebar glossary words (word: meaning). content="", sub_items={number:word, content:meaning}.

poem
  Verse or poetry.
  content = "__EXTRACT__"  (Python will inject the full poem text from source).
  sub_items = one per stanza {number:"stanza_1", content:"lines of that stanza"}.
  author attribution (e.g. "ROBERT FROST") goes in metadata.author, not in content.

drama
  Play/one-act play script. content = full script.

exercise
  Poorvi  : "Let us discuss" / "Let us think and reflect"
  Beehive : "Thinking about the Text" / "Thinking about the Poem"

  CONTENT FIELD — SHORT HEADING ONLY:
  The "content" field must contain ONLY the short section heading as printed
  at the top: "Thinking about the Text" or "Thinking about the Poem" or
  "Let us discuss" etc. Do NOT put group instruction lines (I, II, III)
  in content. They belong as Level-1 sub_items.

  ACTIVITY BOX: If there is a highlighted "Activity" box before the numbered
  groups (e.g. "Activity: Calculate how many years..."), add it as a sub_item
  with number="activity" before the Roman numeral groups.

  SUB_ITEMS — TWO-LEVEL STRUCTURE (CRITICAL):
  Beehive exercises are organised in Roman-numeral groups (I, II, III, IV).
  Each group has an instruction line and numbered individual questions beneath it.

  LEVEL 1 — one sub_item per Roman-numeral group:
    number  : "I", "II", "III", "IV" etc.
    content : the VERBATIM instruction for that group, e.g.
              "Answer these questions in a few words or a couple of sentences each."
              "Answer the following with reference to the story."
              "Answer each of these questions in a short paragraph (about 30 words)."
    options : []
    answer  : null

  LEVEL 2 — one sub_item per individual question within each group:
    number  : "I.1", "I.2", "II.1", "III.1" etc.
    content : FULL verbatim text of that question including ALL sub-parts
              (i)(ii)(iii) and their answer options if any. NEVER split a
              question's sub-parts into separate sub_items.
    options : []
    answer  : null

  EXAMPLE — Beehive "Thinking about the Text":
  sub_items: [
    { "number": "activity", "content": "Calculate how many years and months ahead from now Margie's diary entry is.", ... },
    { "number": "I",   "content": "Answer these questions in a few words or a couple of sentences each.", ... },
    { "number": "I.1", "content": "How old are Margie and Tommy?", ... },
    { "number": "I.2", "content": "What did Margie write in her diary?", ... },
    ...
    { "number": "II",  "content": "Answer the following with reference to the story.", ... },
    { "number": "II.1","content": "\"I wouldn't throw it away.\"\n(i) Who says these words?\n(ii) What does 'it' refer to?\n(iii) What is it being compared with by the speaker?", ... },
    { "number": "II.2","content": "\"Sure they had a teacher...\"\n(i) Who does 'they' refer to?\n(ii) What does 'regular' mean here?\n(iii) What is it contrasted with?", ... },
    { "number": "III", "content": "Answer each of these questions in a short paragraph (about 30 words).", ... },
    { "number": "III.1","content": "What kind of teachers did Margie and Tommy have?", ... },
    ...
  ]

  ⚠️ COMPLETENESS — Every numbered question must be its own sub_item.
  Sub-parts (i)(ii)(iii) within ONE question stay in the SAME sub_item.
  NEVER merge multiple numbered questions together.

grammar
  Poorvi  : "Let us learn"
  Beehive : "Thinking about Language"

  content = "Thinking about Language" (just the heading).
  Same two-level sub_items structure as exercise:
  - One sub_item per Roman-numeral group (I, II, III): number="I", content=group title
    e.g. "I" → "Adverbs", "II" → "If Not and Unless"
  - One sub_item per individual activity within each group: number="I.1", "I.2" etc.
    Keep all sub-parts (i)(ii)(iii) of one activity in the SAME sub_item.
  For Beehive, the group title is often bold/underlined e.g. "I. Adverbs" or
  "II. If Not and Unless" — use just the topic name as content of the Level-1 sub_item.

listening
  Poorvi  : "Let us listen"
  Beehive : no dedicated listening section (omit if absent)

speaking
  Poorvi  : "Let us speak"
  Beehive : "Speaking"

writing_task
  Poorvi  : "Let us write"
  Beehive : "Writing"

exploration
  Poorvi  : "Let us explore"
  Beehive : "Do a Project"

about_the_author
  Italic/shaded introductory paragraph about the author/poet before the story or poem.
  Example Beehive: "This well-known poem is about making choices... Robert Frost is..."

transcript
  Poorvi : "TRANSCRIPTS" block at end of unit (teacher listening scripts).
  Beehive: absent.

other
  Anything not fitting the above.

BOOK AUTO-DETECTION
===================

Detect the book from content and apply matching section names:
- "Poorvi" / "Let us discuss" / "Let us learn"           -> Poorvi style
- "Beehive" / "Thinking about the Text" / "Before You Read" -> Beehive style
- "Honeydew" / "First Flight"                              -> Beehive-like style

UNIT NUMBER RULES
=================

Poorvi   : "UNIT 3" -> unit_number=3
Beehive  : "1. The Fun They Had" -> unit_number=1
Multiple : use the FIRST lesson number; prefix IDs per lesson slug.
Default  : use 1 ONLY if genuinely no number exists in content.

CRITICAL RULES
==============

1. PROSE PARTS: "# I", "# II", "# III" or "Part II" are PART MARKERS, not new sections.
   Always merge into ONE prose section per story. Never split a story.

2. BEEHIVE EXERCISES:
   "Thinking about the Text" and "Thinking about the Poem" both -> type="exercise".
   content = just the heading ("Thinking about the Text").
   Apply TWO-LEVEL sub_items (same as Poorvi exercises):
   - Level 1: one sub_item per Roman-numeral group: number="I", content=verbatim instruction.
   - Level 2: one sub_item per numbered question: number="I.1", "I.2" etc.,
     content = full question text including ALL sub-parts (i)(ii)(iii) in ONE field.
   If an "Activity" box appears before the numbered groups, add number="activity".

3. BEEHIVE VOCABULARY: Sidebar words appear inline alongside prose paragraphs.
   Collect ALL word: meaning pairs into type="vocabulary" with sub_items.

4. ABOUT THE AUTHOR: Italic intro paragraph about the author/poet before reading ->
   type="about_the_author". This appears in Beehive before poems.

5. "Let us read" / "Before You Read" heading -> DO NOT create a separate section.
   Include the narrative/poem that follows in the prose/poem section.

6. COMPLETENESS: Extract EVERY visible section. Never skip warm_up, vocabulary,
   any exercise group, grammar, speaking, writing, exploration, or transcript.

7. UNIQUE IDs: Prefix every id with the lesson slug.
   Poorvi : "my_brothers_invention_prose", "paper_boats_poem"
   Beehive: "fun_they_had_prose", "road_not_taken_poem", "fun_they_had_grammar"

8. PROSE/POEM CONTENT — USE PLACEHOLDER:
   Always set content = "__EXTRACT__" for prose and poem sections.
   Never reproduce story or poem text in the JSON output — this triggers
   content filter restrictions. Python post-processing injects the full text.

9. EXERCISE & GRAMMAR SUB_ITEMS — TWO-LEVEL STRUCTURE:
   Always use the two-level pattern: Level-1 = group header sub_item (number="I"),
   Level-2 = individual question sub_items (number="I.1","I.2"...).
   Keep ALL sub-parts (i)(ii)(iii) of ONE question in the SAME Level-2 sub_item.
   Never merge multiple numbered questions into one sub_item.
"""


# ══════════════════════════════════════════════════════════════════════════════
# USER PROMPT BUILDER
# ══════════════════════════════════════════════════════════════════════════════

def _build_user_prompt(content: str, hint_unit_number: Optional[int] = None,
                       chunk_index: int = 1, total_chunks: int = 1) -> str:
    """Build the user prompt sent to the LLM with the raw OCR content."""

    unit_hint = ""
    if hint_unit_number:
        unit_hint = f"HINT — Unit number detected from file: {hint_unit_number}\n\n"

    continuation = ""
    if chunk_index > 1:
        continuation = (
            f"[CONTINUATION: Chunk {chunk_index}/{total_chunks}. "
            f"Prose/poem for lessons in chunk 1 already extracted. "
            f"Extract ONLY grammar, exercises, listening, speaking, writing, "
            f"exploration, transcripts from THIS chunk. "
            f"Use the same unit_number and title as chunk 1.]\n\n"
        )

    return (
        f"{unit_hint}"
        f"Extract the complete CBSE English unit from the raw OCR content below.\n"
        f"Return ONLY the JSON object — no markdown fences, no commentary.\n\n"
        f"━━━ RAW OCR CONTENT ━━━\n\n"
        f"{continuation}{content}\n\n"
        f"━━━ END OF CONTENT ━━━\n\n"
        f"Output the complete structured JSON now."
    )


# ══════════════════════════════════════════════════════════════════════════════
# SEMANTIC CHUNKER
# Splits ONLY when content is too large for one call.
# Splits at lesson/story title boundaries — not at fixed char offsets.
# ══════════════════════════════════════════════════════════════════════════════

# Lesson title patterns in Poorvi / NCERT books:
#   "# MY BROTHER'S GREAT INVENTION"  (all-caps H1)
#   "# PAPER BOATS"
#   "# NORTH, SOUTH, EAST, WEST"
_LESSON_TITLE_RE = re.compile(
    r'(?:^|\n)(#\s+[A-Z][A-Z ,\'\-]+[A-Z])\s*\n',
    re.MULTILINE
)


def _semantic_chunks(content: str, max_chars: int = _MAX_CHARS_SINGLE_CALL) -> List[str]:
    """
    Split content into chunks at lesson title boundaries.
    Falls back to paragraph-level splitting when no lesson titles are found
    or when a single lesson exceeds max_chars.

    BUG FIX: The old midpoint fallback produced a chunk of ~half the content,
    which could still be too large. The new approach does a proper multi-pass
    paragraph split so every chunk is guaranteed to be under max_chars.
    """
    if len(content) <= max_chars:
        return [content]

    # Find all lesson title positions
    boundaries = [m.start() for m in _LESSON_TITLE_RE.finditer(content)]

    if boundaries:
        # Build chunks that stay under max_chars by grouping lessons
        chunks: List[str] = []
        current_start = 0

        for boundary in boundaries[1:]:  # skip first (it's the document start)
            candidate = content[current_start:boundary]
            if len(candidate) >= max_chars * 0.5:  # chunk is large enough
                # If even a single lesson is too large, sub-split it
                if len(candidate) > max_chars:
                    chunks.extend(_paragraph_split(candidate, max_chars))
                else:
                    chunks.append(candidate)
                current_start = boundary

        # Last chunk
        remaining = content[current_start:]
        if remaining.strip():
            if len(remaining) > max_chars:
                chunks.extend(_paragraph_split(remaining, max_chars))
            else:
                chunks.append(remaining)

        return chunks if chunks else _paragraph_split(content, max_chars)

    # No lesson titles found — do paragraph-level splitting
    return _paragraph_split(content, max_chars)


def _paragraph_split(content: str, max_chars: int) -> List[str]:
    """
    Split content into chunks of at most max_chars, breaking at paragraph
    boundaries (double newline) wherever possible.

    BUG FIX: The old midpoint split only produced 2 chunks and used rfind
    which could still leave the second half oversized. This produces as many
    chunks as needed with proper paragraph-boundary alignment.
    """
    if len(content) <= max_chars:
        return [content]

    chunks: List[str] = []
    remaining = content

    while len(remaining) > max_chars:
        # Try to break at a paragraph boundary within the budget
        candidate = remaining[:max_chars]
        # Find last double-newline within budget
        para_break = candidate.rfind('\n\n')
        if para_break > max_chars * 0.4:
            split_at = para_break + 2
        else:
            # Fall back to last single newline
            line_break = candidate.rfind('\n')
            split_at = line_break + 1 if line_break > max_chars * 0.4 else max_chars

        chunks.append(remaining[:split_at])
        remaining = remaining[split_at:]

    if remaining.strip():
        chunks.append(remaining)

    return chunks if chunks else [content]


# ══════════════════════════════════════════════════════════════════════════════
# JSON PARSING WITH SALVAGE
# ══════════════════════════════════════════════════════════════════════════════

def _parse_json_safe(raw: str) -> Optional[Dict[str, Any]]:
    """
    Parse JSON from LLM output. Handles:
    - Clean JSON
    - JSON wrapped in ```json ... ``` fences
    - Truncated JSON (find largest valid prefix)
    """
    # Strip markdown fences
    cleaned = re.sub(r'^```[a-z]*\n?', '', raw.strip())
    cleaned = re.sub(r'\n?```$', '', cleaned).strip()

    # Try direct parse
    try:
        return orjson.loads(cleaned.encode())
    except Exception:
        pass

    # Salvage: find largest valid JSON prefix
    for end in range(len(cleaned), 0, -1):
        if cleaned[end - 1] in ('}', ']'):
            try:
                result = orjson.loads(cleaned[:end].encode())
                print(f"  ✅ [LLM-First] Salvaged JSON up to char {end}/{len(cleaned)}")
                return result
            except Exception:
                continue

    return None


# ══════════════════════════════════════════════════════════════════════════════
# MERGE CHUNKS
# When content was split into multiple chunks, merge their sections[] together.
# ══════════════════════════════════════════════════════════════════════════════

def _merge_unit_chunks(chunks_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge multiple partial JSON extractions (from chunked content) into one
    complete unit dict. Scalar fields (unit_number, title) from the first chunk
    that has them; sections[] concatenated across all chunks with dedup.
    """
    if len(chunks_data) == 1:
        return chunks_data[0]

    merged: Dict[str, Any] = {}
    scalar_fields = ["unit_number", "title", "introduction", "subject"]
    list_fields = ["sections", "learning_objectives", "points_to_remember", "glossary"]

    # Scalar: first non-null value wins
    for field in scalar_fields:
        for chunk in chunks_data:
            val = chunk.get(field)
            if val is not None and val != "" and val != []:
                merged[field] = val
                break
        if field not in merged:
            merged[field] = chunks_data[0].get(field)

    # Lists: concatenate, dedup sections by type+id
    for field in list_fields:
        seen: set = set()
        combined: list = []
        for chunk in chunks_data:
            for item in chunk.get(field) or []:
                if field == "sections" and isinstance(item, dict):
                    key = f"{item.get('type', '')}::{item.get('id', '') or (item.get('content') or '')[:80]}"
                else:
                    key = str(item)[:200]
                if key not in seen:
                    seen.add(key)
                    combined.append(item)
        merged[field] = combined

    return merged


# ══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def structure_with_llm_first(
    content_md: str,
    api_key: str,
    model: str = "gpt-4o",
    hint_unit_number: Optional[int] = None,
    timeout: int = _API_TIMEOUT,
    max_retries: int = _MAX_RETRIES,
) -> Optional[Dict[str, Any]]:
    """
    LLM-first structuring: send the raw OCR markdown directly to the LLM.
    The LLM identifies the unit number, lesson structure, and all sections
    without any regex pre-processing.

    Args:
        content_md:       Raw markdown from content.md (Mistral OCR output).
        api_key:          OpenAI API key.
        model:            Model to use (default gpt-4o for reliability).
        hint_unit_number: Optional unit number hint from filename or plain-text scan.
        timeout:          API request timeout in seconds.
        max_retries:      Number of retry attempts on failure.

    Returns:
        Structured unit dict matching CBSE_ENGLISH_SCHEMA, or None on failure.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # Split into semantic chunks only if content is very large
    chunks = _semantic_chunks(content_md, _MAX_CHARS_SINGLE_CALL)
    total_chunks = len(chunks)

    if total_chunks > 1:
        print(f"  📦 [LLM-First] Content too large for one call — splitting into "
              f"{total_chunks} semantic chunks")

    chunk_results: List[Dict[str, Any]] = []

    for chunk_idx, chunk_content in enumerate(chunks, 1):
        if total_chunks > 1:
            print(f"  🔀 [LLM-First] Chunk {chunk_idx}/{total_chunks} "
                  f"({len(chunk_content):,} chars)...")

        unit_data = None
        # BUG FIX: Track effective chunk content separately so we can shrink it
        # on retry when empty output is returned (output token budget exceeded).
        # The old code retried with the exact same payload, which always produced
        # the same empty result.
        effective_chunk = chunk_content

        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    wait = _RETRY_BASE_DELAY * (3 ** attempt)
                    print(f"  ⏳ [LLM-First] Retry {attempt+1}/{max_retries} after {wait}s...")
                    time.sleep(wait)

                user_prompt = _build_user_prompt(
                    content=effective_chunk,
                    hint_unit_number=hint_unit_number,
                    chunk_index=chunk_idx,
                    total_chunks=total_chunks,
                )

                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user",   "content": user_prompt},
                    ],
                    "max_completion_tokens": _MAX_COMPLETION_TOKENS,
                    # BUG FIX: Do NOT use response_format=json_object.
                    # When the output JSON is truncated (finish_reason=length), the API
                    # discards the partial invalid JSON and returns content="" (empty string).
                    # Without this constraint, the model still produces JSON (we ask it to in
                    # the prompt) but truncated output is returned as raw text that we can
                    # salvage with _parse_json_safe()'s partial-JSON recovery logic.
                }

                print(f"  🔄 [LLM-First] Calling {model} "
                      f"(attempt {attempt+1}/{max_retries}, "
                      f"{len(effective_chunk):,} chars input)...")
                t0 = time.time()

                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=timeout,
                )

                elapsed = time.time() - t0
                print(f"  ✅ [LLM-First] Response in {elapsed:.1f}s (HTTP {resp.status_code})")

                if not resp.ok:
                    try:
                        err = resp.json()
                        print(f"  ❌ [LLM-First] API error: {err}")
                    except Exception:
                        print(f"  ❌ [LLM-First] API error (raw): {resp.text[:300]}")
                    resp.raise_for_status()

                resp_data = resp.json()
                choice = resp_data["choices"][0]
                raw_content = choice["message"]["content"]
                finish_reason = choice.get("finish_reason", "stop")
                print(f"  📊 [LLM-First] Output: {len(raw_content):,} chars "
                      f"(finish_reason={finish_reason})")

                # Handle content_filter — retry with gpt-4o fallback
                if finish_reason == "content_filter":
                    if model != "gpt-4o":
                        print(f"  ⚠️  [LLM-First] content_filter — retrying with gpt-4o...")
                        fb_payload = {**payload, "model": "gpt-4o"}
                        fb_resp = requests.post(
                            "https://api.openai.com/v1/chat/completions",
                            headers=headers, json=fb_payload, timeout=timeout
                        )
                        if fb_resp.ok:
                            fb_choice = fb_resp.json()["choices"][0]
                            if fb_choice.get("finish_reason") != "content_filter":
                                raw_content = fb_choice["message"]["content"]
                                finish_reason = fb_choice.get("finish_reason", "stop")
                    if finish_reason == "content_filter":
                        print(f"  ❌ [LLM-First] Both models blocked — skipping chunk")
                        break

                # Truncation recovery — raw_content may be partial JSON or empty
                if finish_reason == "length":
                    if not raw_content.strip():
                        # BUG FIX: Empty output after truncation means the JSON output
                        # itself exceeds max_completion_tokens. Retrying with the same
                        # payload produces the same empty result. Instead, reduce the
                        # chunk by 30% and retry — the smaller input produces smaller JSON.
                        reduced_size = int(len(effective_chunk) * 0.7)
                        effective_chunk = effective_chunk[:reduced_size]
                        # Find nearest paragraph boundary to keep content coherent
                        para_break = effective_chunk.rfind('\n\n')
                        if para_break > reduced_size * 0.5:
                            effective_chunk = effective_chunk[:para_break]
                        print(f"  ⚠️  [LLM-First] Empty output — reducing chunk to "
                              f"{len(effective_chunk):,} chars and retrying...")
                        continue  # retry with smaller chunk

                    print(f"  ⚠️  [LLM-First] Output truncated — attempting continuation...")
                    rec_msgs = payload["messages"] + [
                        {"role": "assistant", "content": raw_content},
                        {"role": "user", "content": (
                            "Your JSON was truncated. Continue from exactly where you stopped. "
                            "Output ONLY the remaining JSON — no explanations, no fences."
                        )},
                    ]
                    # BUG FIX: Continuation payload must NOT include response_format,
                    # and give full token budget to close open arrays/objects.
                    rec_payload = {
                        **payload,
                        "messages": rec_msgs,
                        "max_completion_tokens": _MAX_COMPLETION_TOKENS,
                    }
                    try:
                        rec_resp = requests.post(
                            "https://api.openai.com/v1/chat/completions",
                            headers=headers, json=rec_payload, timeout=timeout
                        )
                        if rec_resp.ok:
                            continuation_text = rec_resp.json()["choices"][0]["message"]["content"]
                            if continuation_text.strip():
                                raw_content += continuation_text
                                print(f"  ✅ [LLM-First] Continuation added "
                                      f"{len(continuation_text):,} chars")
                            else:
                                print(f"  ⚠️  [LLM-First] Continuation also empty — "
                                      f"attempting JSON salvage on partial output")
                    except Exception as rec_err:
                        print(f"  ⚠️  [LLM-First] Continuation failed: {rec_err}")

                # Parse JSON
                unit_data = _parse_json_safe(raw_content)
                if unit_data:
                    # If LLM defaulted unit_number to 1 but we have a better hint, fix it
                    if hint_unit_number and unit_data.get("unit_number") in (None, 1):
                        # Only override if the content doesn't actually say "Unit 1"
                        if not re.search(r'\bUNIT\s+1\b', content_md, re.IGNORECASE):
                            unit_data["unit_number"] = hint_unit_number
                            print(f"  🔧 [LLM-First] Corrected unit_number → {hint_unit_number}")
                    break  # success

            except Exception as e:
                print(f"  ❌ [LLM-First] Attempt {attempt+1} error: {e}")
                if attempt == max_retries - 1:
                    print(f"  ❌ [LLM-First] All retries failed for chunk {chunk_idx}")

        if unit_data:
            chunk_results.append(unit_data)
        else:
            print(f"  ⚠️  [LLM-First] Chunk {chunk_idx} failed — no usable output")

    if not chunk_results:
        return None

    merged = _merge_unit_chunks(chunk_results)

    # ── Post-process: inject prose/poem text from source markdown ────────────
    # The LLM outputs content="__EXTRACT__" for prose/poem sections to avoid
    # copyright content filter. Fill in the actual text here from source_md.
    merged = fill_prose_from_source(merged, content_md)

    # Log summary
    section_count = len(merged.get("sections", []))
    section_types = [s.get("type", "?") for s in merged.get("sections", [])]
    type_summary = ", ".join(
        f"{t}:{section_types.count(t)}" for t in sorted(set(section_types))
    )
    print(f"  ✅ [LLM-First] Unit {merged.get('unit_number')}: "
          f"{section_count} sections [{type_summary}]")

    return merged



# ══════════════════════════════════════════════════════════════════════════════
# PROSE/POEM TEXT INJECTOR
# The LLM outputs content="__EXTRACT__" for prose/poem sections to avoid
# triggering copyright content filters when reproducing story/poem text.
# This function fills in the actual text from the source markdown.
# ══════════════════════════════════════════════════════════════════════════════

_PROSE_PLACEHOLDER = "__EXTRACT__"

# Known author attributions that mark the end of a story or poem
_AUTHOR_ATTRIBUTIONS = [
    "ISAAC ASIMOV", "ROBERT FROST", "RABINDRANATH TAGORE", "RUSKIN BOND",
    "R.K. NARAYAN", "MULK RAJ ANAND", "PREMCHAND", "SATYAJIT RAY",
    "MAXIM GORKY", "MARK TWAIN", "O. HENRY", "GUY DE MAUPASSANT",
    "JAMES HERRIOT", "P.G. WODEHOUSE", "WILLIAM SHAKESPEARE",
    "WILLIAM BLAKE", "ALFRED LORD TENNYSON", "WILLIAM WORDSWORTH",
    "JOHN KEATS", "PERCY BYSSHE SHELLEY", "W.B. YEATS", "T.S. ELIOT",
    "OGDEN NASH", "CAROLYN WELLS", "WALT WHITMAN", "EMILY DICKINSON",
    "C.G. SALAMANDER",
]

def _extract_prose_from_markdown(source_md: str, section_title: str,
                                  search_from: int = 0) -> Optional[str]:
    """
    Extract the prose/poem text for a given section from source markdown.

    Looks for the first numbered paragraph or capitalized first word after the
    section title, then reads until the author attribution line.
    Strips page markers, image refs, sidebar vocabulary, and watermarks.

    Returns cleaned text or None if not found.
    """
    # Find start of actual text content (skip section heading and warm-up)
    # Patterns for where prose body begins:
    start_patterns = [
        r'(?m)^1\.\s+[A-Z]',           # "1. MARGIE even wrote..."
        r'(?m)^[A-Z]{3,}\s+[a-z]',     # "MARGIE even wrote..."
        r'(?m)^[A-Z][a-z]+\s+[a-z]',   # "Two roads diverged..."  (poem)
    ]

    best_start = None
    for pat in start_patterns:
        m = re.search(pat, source_md[search_from:])
        if m:
            candidate = search_from + m.start()
            if best_start is None or candidate < best_start:
                best_start = candidate

    if best_start is None:
        return None

    # Find end: author attribution
    best_end = None
    for author in _AUTHOR_ATTRIBUTIONS:
        idx = source_md.find(author, best_start)
        if idx > best_start:
            candidate_end = idx + len(author)
            if best_end is None or idx < best_end:
                best_end = candidate_end

    if best_end is None:
        # Fallback: read until the next major section heading
        m = re.search(r'(?m)^#{1,2}\s+(?:Thinking about|GLOSSARY|Speaking|Writing|Do a Project)',
                      source_md[best_start:])
        if m:
            best_end = best_start + m.start()
        else:
            return None

    raw = source_md[best_start:best_end]

    # Clean: strip OCR artifacts
    raw = re.sub(r'<!--\s*PAGE\s*\d+\s*-->', '', raw)
    raw = re.sub(r'!\[.*?\]\(.*?\)', '', raw)                   # image refs
    raw = re.sub(r'Reprint\s+\d{4}-\d{2}', '', raw)            # reprint lines
    raw = re.sub(r'\d+\s*/\s*Beehive', '', raw)                 # page headers
    raw = re.sub(r'(?m)^POORVI\s*$', '', raw)
    raw = re.sub(r'(?m)^BEEHIVE\s*$', '', raw)
    raw = re.sub(r'(?m)^#{1,3}\s*$', '', raw)                   # standalone # lines
    # Strip sidebar vocabulary gloss lines (italic word: definition pattern)
    raw = re.sub(r'(?m)^\*?[a-z]+\*?\s*(?:\([a-z]+\))?:\s+[a-z].*$', '', raw, flags=re.I)
    # Collapse excess blank lines
    raw = re.sub(r'\n{3,}', '\n\n', raw).strip()

    return raw if len(raw) > 50 else None


def fill_prose_from_source(unit_data: Dict[str, Any], source_md: str) -> Dict[str, Any]:
    """
    Post-processing step: for any prose/poem section whose content is the
    placeholder "__EXTRACT__", extract the actual text from source_md and
    inject it into the content field.

    Also fills poem sub_items (stanzas) if they are empty but content was found.

    Args:
        unit_data:  The structured unit dict from the LLM.
        source_md:  The cleaned source markdown (content.md after watermark strip).

    Returns:
        unit_data with prose/poem content fields populated.
    """
    search_cursor = 0  # advance through source_md as we process sections

    for section in unit_data.get("sections", []):
        stype = section.get("type", "")
        content = section.get("content", "")

        if stype not in ("prose", "poem", "drama"):
            continue

        if content != _PROSE_PLACEHOLDER and content:
            continue  # already has real content, skip

        # Try to extract from source
        title = section.get("title") or ""
        extracted = _extract_prose_from_markdown(source_md, title, search_cursor)

        if extracted:
            section["content"] = extracted
            # Advance cursor past what we extracted so next section doesn't re-find same text
            # Find where the extracted text starts in source_md
            first_line = extracted[:50].strip()
            pos = source_md.find(first_line[:30], search_cursor)
            if pos > 0:
                search_cursor = pos + len(extracted)
            print(f"  ✅ [Fill-Prose] Injected {len(extracted):,} chars into "
                  f"'{section.get('id', stype)}' from source markdown")

            # For poem: if sub_items are empty, fill stanzas from extracted content
            if stype == "poem" and not section.get("sub_items"):
                stanzas = [s.strip() for s in re.split(r'\n{2,}', extracted) if s.strip()]
                section["sub_items"] = [
                    {"number": f"stanza_{i+1}", "content": stanza,
                     "options": [], "answer": None}
                    for i, stanza in enumerate(stanzas)
                    if not re.match(r'^[A-Z\s]+$', stanza)  # skip author line
                ]
        else:
            print(f"  ⚠️  [Fill-Prose] Could not extract text for '{section.get('id', stype)}' "
                  f"— content remains placeholder")

    return unit_data


# Used to give the LLM a hint about the unit number so it does not default to 1.
# Works on the raw markdown before any LLM call.
# ══════════════════════════════════════════════════════════════════════════════

def detect_unit_number_from_markdown(markdown: str) -> Optional[int]:
    """
    Try to detect the unit number from plain-text patterns in the markdown.
    This is a hint only — the LLM will confirm/override from content meaning.

    Handles:
      UNIT 3          (all-caps, no #)
      Unit 3          (mixed case, no #)
      # Unit - 3
      ## UNIT 3
      Unit Three      (word form — limited support 1-10)
    """
    WORD_TO_NUM = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    }

    patterns = [
        # Bare "UNIT N" or "Unit N" as standalone line (most common in Poorvi)
        (re.compile(r'^UNIT\s+(\d+)\s*$', re.MULTILINE), lambda m: int(m.group(1))),
        (re.compile(r'^Unit\s+(\d+)\s*$', re.MULTILINE), lambda m: int(m.group(1))),
        # Markdown header "# Unit - 3" / "## UNIT 3"
        (re.compile(r'^#{1,3}\s*UNIT\s*[-–]?\s*(\d+)', re.MULTILINE | re.IGNORECASE),
         lambda m: int(m.group(1))),
        # Plain "Unit - 3" / "Unit-3"
        (re.compile(r'\bUnit\s*[-–]\s*(\d+)\b', re.IGNORECASE),
         lambda m: int(m.group(1))),
        # Word form "Unit Three"
        (re.compile(r'\bUnit\s+(one|two|three|four|five|six|seven|eight|nine|ten)\b',
                    re.IGNORECASE),
         lambda m: WORD_TO_NUM.get(m.group(1).lower())),
        # Beehive/Honeydew/First Flight: numbered lesson "1. The Fun They Had"
        # Appears as "# 1. Title" or standalone "1. Title" at the start of a page
        (re.compile(r'^(?:#\s*)?(?:\*?\d+\.\s+)?(?:The\s+|A\s+|An\s+)?[A-Z][A-Za-z\s]+$',
                    re.MULTILINE),
         None),  # sentinel — handled separately below
    ]

    for pattern, extractor in patterns:
        if extractor is None:
            continue  # skip sentinel
        m = pattern.search(markdown)
        if m:
            val = extractor(m)
            if val and 1 <= val <= 50:
                print(f"  🔍 [LLM-First] Detected unit number from markdown: {val}")
                return val

    # Beehive/First Flight/Honeydew: numbered lessons like "1. The Fun They Had"
    # Pattern: standalone line starting with a digit followed by period
    beehive_lesson = re.compile(
        r'^(?:#\s*)?(\d+)\.\s+[A-Z][A-Za-z\s,\'\-]+$',
        re.MULTILINE
    )
    m = beehive_lesson.search(markdown)
    if m:
        val = int(m.group(1))
        if 1 <= val <= 30:
            print(f"  🔍 [LLM-First] Detected Beehive lesson number: {val}")
            return val

    return None