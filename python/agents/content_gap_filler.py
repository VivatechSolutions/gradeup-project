"""
Content Gap Filler — Agent 2 (text-only)
=========================================
Fills gaps identified by the Structural Verification agent using
text-only approaches — NO Vision LLM or image embedding is used.

Fill strategy (in priority order):
    1. Regex extraction from content.md (fast, deterministic)
    2. Multi-window LLM re-extraction (wider 20K char window)
    3. Targeted section repair (LLM on just the broken N.M section)
    4. Full unit re-extraction (last resort)

Called inside `verify_unit_node` in the LangGraph graph.
"""

from __future__ import annotations

import re
import time
import unicodedata
from typing import Any, Dict, List, Optional, Set, Tuple

import requests

try:
    import orjson
    def _loads(b): return orjson.loads(b)
    def _dumps(obj): return orjson.dumps(obj, option=orjson.OPT_INDENT_2)
except ImportError:
    import json
    def _loads(b): return json.loads(b)
    def _dumps(obj): return json.dumps(obj, indent=2).encode()



def _is_critical_or_high(issue: str) -> bool:
    """Return True if an issue is CRITICAL or HIGH severity."""
    return issue.startswith(("[CRITICAL]", "[HIGH]"))


# LLM "I couldn't find it" filler text — must never be stored as section content
_JUNK_FILL_RE = re.compile(
    r"(?i)\b(?:"
    r"not\s+(?:found|present|available|included)"
    r"|no\s+(?:such\s+)?section"
    r"|could\s*not\s+(?:be\s+)?(?:found|locate)"
    r"|does\s+not\s+(?:exist|appear)"
    r"|not\s+in\s+the\s+provided"
    r")\b"
)


def _is_junk_fill(repaired: Dict[str, Any]) -> bool:
    """
    True when an LLM gap-fill response carries no real content — empty, or a
    short apology like "Section 2.14 not found in the provided text." Such
    fills must be discarded, never merged as sections.
    """
    subsections = repaired.get("subsections") or []
    if any((s.get("content") or "").strip() for s in subsections if isinstance(s, dict)):
        return False
    content = (repaired.get("content") or "").strip()
    if not content:
        return not subsections
    if len(content) < 200 and _JUNK_FILL_RE.search(content):
        return True
    return False


def _heading_exists_in_md(section_number: str, unit_md: str) -> bool:
    """True if `section_number` appears as a real heading in the markdown."""
    if not unit_md:
        return False
    pat = re.compile(
        r"^#*\s*\**\s*" + re.escape(section_number) + r"(?:\s|\.|\*|$)",
        re.MULTILINE,
    )
    return bool(pat.search(unit_md))


def _fetch_section_text(
    content_md: str,
    section_type: str,
    section_title: Optional[str],
    unit_number: int,
) -> Optional[str]:
    """
    Attempt to extract content for a specific section from content.md
    using regex patterns. Returns extracted text or None.
    """
    # Extract just the unit's portion of the markdown first
    unit_re = re.compile(
        r"^(?:#+\s*)?(?:Unit\s*[-–:]?\s*{n}(?:\s|$|:)|UNIT\s*[-–:]?\s*{n}(?:\s|$|:))".format(
            n=unit_number
        ),
        re.IGNORECASE,
    )
    next_unit_re = re.compile(
        r"^(?:#+\s*)?(?:Unit\s*[-–:]?\s*{n}(?:\s|$|:)|UNIT\s*[-–:]?\s*{n}(?:\s|$|:))".format(
            n=unit_number + 1
        ),
        re.IGNORECASE,
    )

    lines = content_md.split("\n")
    unit_lines: List[str] = []
    in_unit = False
    for idx, line in enumerate(lines):
        s = line.strip()
        if not in_unit:
            if idx < 150:
                continue
            if unit_re.match(s):
                in_unit = True
                unit_lines.append(line)
        else:
            if next_unit_re.match(s):
                break
            unit_lines.append(line)

    unit_md = "\n".join(unit_lines) if unit_lines else content_md

    search_title = re.escape(section_title.strip()) if section_title else None

    # Pattern selection by type
    if section_type in ("prose", "supplementary") and search_title:
        pat = re.compile(
            r"(?:^|\n)(?:#+\s*)?" + search_title + r"[\s\S]{200,}?(?=\n##\s|\Z)",
            re.IGNORECASE | re.MULTILINE,
        )
        m = pat.search(unit_md)
        if m and len(m.group(0).strip()) > 100:
            return m.group(0).strip()

    elif section_type == "poem" and search_title:
        pat = re.compile(
            r"(?:^|\n)(?:#+\s*)?" + search_title + r"[\s\S]*?(?=\n#+|\Z)",
            re.IGNORECASE | re.MULTILINE,
        )
        m = pat.search(unit_md)
        if m:
            return m.group(0).strip()

    elif section_type in ("section", "introduction", "activity"):
        if search_title:
            pat = re.compile(
                r"(?:^|\n)(?:#+\s*)?" + search_title + r"[\s\S]{50,}?(?=\n##?\s|\Z)",
                re.IGNORECASE | re.MULTILINE,
            )
            m = pat.search(unit_md)
            if m:
                return m.group(0).strip()

    elif section_type == "grammar":
        pat = re.compile(
            r"(?:^|\n)(?:#+\s*)?Grammar\b[\s\S]{100,}?(?=\n##\s|\Z)",
            re.IGNORECASE | re.MULTILINE,
        )
        m = pat.search(unit_md)
        if m and len(m.group(0).strip()) > 100:
            return m.group(0).strip()

    return None


def fill_empty_sections_regex(
    unit: Dict[str, Any],
    content_md: str,
) -> Tuple[Dict[str, Any], int]:
    """
    Pass 1 (no LLM): Try to fill empty section content fields
    using regex extraction from content.md.

    Returns (updated_unit, num_filled).
    """
    unit_number = unit.get("unit_number") or unit.get("chapter_number") or 0
    must_have_content = {
        "prose", "poem", "supplementary", "section", "introduction",
        "activity", "example", "definition", "theorem", "grammar",
    }
    fill_count = 0

    for sec in unit.get("sections", []):
        sec_type = sec.get("type", "")
        if sec_type not in must_have_content:
            continue
        if (sec.get("content") or "").strip() or sec.get("sub_items"):
            continue  # already has content

        sec_title = sec.get("title") or sec.get("id")
        fetched = _fetch_section_text(content_md, sec_type, sec_title, unit_number)
        if fetched and len(fetched) > 50:
            sec["content"] = fetched
            fill_count += 1
            print(
                f"  📥 [GapFiller] Regex-filled {sec_type} '{sec_title}' "
                f"in unit {unit_number} ({len(fetched)} chars)"
            )

    return unit, fill_count



_OPENAI_URL = "https://api.openai.com/v1/chat/completions"


def _call_openai(
    system_prompt: str,
    user_prompt: str,
    api_key: str,
    model: str = "gpt-5-mini",
    max_tokens: int = 8192,
    timeout: int = 300,
) -> Optional[Dict[str, Any]]:
    """Helper: single OpenAI JSON-mode call with retry."""
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
        "max_completion_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }

    for attempt in range(3):
        try:
            resp = requests.post(_OPENAI_URL, headers=headers, json=payload, timeout=timeout)
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"]
            cleaned = re.sub(r"^```[a-z]*\n?", "", raw).strip().rstrip("`")
            return _loads(cleaned.encode() if isinstance(cleaned, str) else cleaned)
        except Exception as exc:
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
                continue
            print(f"  ❌ [GapFiller] OpenAI error: {exc}")
            return None
    return None


def fill_chunk_split_section(
    section_raw_md: str,
    section_number: str,
    unit_number: int,
    subject: str,
    api_key: str,
    missing_subsections: Optional[List[str]] = None,
    model: str = "gpt-5-mini",
) -> Optional[Dict[str, Any]]:
    """
    Re-extract a single N.M section that was split across LLM context windows.
    Uses a wider 20K char window to avoid the chunk-split issue.

    Returns a section dict {section_number, section_title, content, subsections[]}.
    """
    missing_hint = ""
    if missing_subsections:
        missing_hint = (
            "\n⚠️  THESE SUBSECTIONS WERE MISSED — they MUST appear in subsections[]:\n"
            + "\n".join(f"  - {t}" for t in missing_subsections)
            + "\n"
        )

    system_prompt = f"""You are an expert educational content extractor.

Extract section {section_number} from the textbook content below into a JSON object.

OUTPUT FORMAT:
{{
  "section_number": "{section_number}",
  "section_title": "<exact title from the {section_number} heading>",
  "content": "<prose directly under the {section_number} heading before sub-headings>",
  "subsections": [
    {{
      "subsection_number": "<EXACT number printed in the sub-heading (e.g. '{section_number}.1'), or null if the heading has NO printed number>",
      "subsection_title": "<exact title from sub-heading (e.g. 'Theorem 2', 'Activity 1', or the sub-section name)>",
      "content": "<ALL text under this sub-heading>"
    }}
  ]
}}

CRITICAL RULES:
1. OCR uses INCONSISTENT heading levels. Sub-headings may be #, ##, or ### — ALL are subsections.
2. NEVER invent or renumber subsection numbers. Copy the number EXACTLY as printed in the
   heading. Theorems, Notes, Activities, Illustrations, Progress Checks etc. usually have
   NO printed N.M.K number — for those, subsection_number MUST be null.
3. EVERY distinct heading is ONE subsection — do NOT merge or skip any.
4. Return ONLY valid JSON. No markdown fences."""

    user_prompt = (
        f"Extract section {section_number} completely.\n"
        f"{missing_hint}"
        f"Remember: # (H1) headings inside this section are subsections too.\n\n"
        f"CONTENT (up to 20K chars):\n{section_raw_md[:20000]}"
    )

    result = _call_openai(system_prompt, user_prompt, api_key, model=model)
    if result:
        n_subs = len(result.get("subsections", []))
        print(f"  📦 [GapFiller] Section {section_number} re-extracted: {n_subs} subsections")
    return result


def fill_missing_unit(
    unit_number: int,
    unit_md: str,
    subject: str,
    api_key: str,
    issue_hint: str = "",
    model: str = "gpt-5-mini",
) -> Optional[Dict[str, Any]]:
    """
    Full unit re-extraction when a unit is completely missing or broken.
    Uses up to 40K chars of the unit markdown.
    """
    system_prompt = (
        "You are an expert educational content extractor. "
        "Extract ALL content from this textbook unit into structured JSON with 'sections' array."
    )
    user_prompt = f"Extract unit {unit_number} (subject: {subject}):\n\n{unit_md[:40000]}"
    if issue_hint:
        user_prompt = (
            f"⚠️  KNOWN ISSUES WITH PREVIOUS EXTRACTION — please fix:\n{issue_hint}\n\n"
        ) + user_prompt

    return _call_openai(system_prompt, user_prompt, api_key, model=model, max_tokens=16384)


# ── Missing-type targeted extraction ─────────────────────────────────────────

# Type-specific extraction prompts
_TYPE_PROMPTS: Dict[str, str] = {
    "activity": (
        "Extract ALL 'Activity' sections (numbered or titled Activity N).\n"
        "For each one return:\n"
        "  {\"type\": \"activity\", \"id\": \"Activity <N>\", \"title\": \"Activity <N>\", "
        "\"content\": \"<full text of the activity including steps, materials, observation, conclusion>\"}"
    ),
    "example": (
        "Extract ALL worked examples.\n"
        "For each one return:\n"
        "  {\"type\": \"example\", \"id\": \"Example <N>\", \"title\": \"Example <N> <subtitle if any>\", "
        "\"content\": \"<full worked example with problem, solution, all steps>\"}"
    ),
    "do_you_know": (
        "Extract ALL 'Do You Know' / 'Did You Know' / 'Fun Fact' information boxes.\n"
        "For each one return:\n"
        "  {\"type\": \"do_you_know\", \"id\": \"do_you_know_<N>\", \"title\": \"Do You Know\", "
        "\"content\": \"<full text of the box>\"}"
    ),
    "ict_corner": (
        "Extract the ICT Corner section if present.\n"
        "Return: {\"type\": \"ict_corner\", \"id\": \"ict_corner\", \"title\": \"ICT Corner\", "
        "\"content\": \"<full ICT corner instructions>\"}"
    ),
}

_TYPE_FALLBACK_PROMPT = (
    "Extract ALL sections of type '{stype}'.\n"
    "For each one return:\n"
    "  {{\"type\": \"{stype}\", \"id\": \"<id>\", \"title\": \"<title>\", \"content\": \"<content>\"}}"
)


def extract_missing_type_sections(
    section_type: str,
    unit_md: str,
    unit_number: int,
    subject: str,
    api_key: str,
    model: str = "gpt-5-mini",
) -> List[Dict[str, Any]]:
    """
    Targeted re-extraction for a section type that was entirely missed.

    Sends the unit markdown to the LLM with instructions to find and return
    all sections of `section_type`. Returns a list of section dicts.
    """
    type_instruction = _TYPE_PROMPTS.get(
        section_type,
        _TYPE_FALLBACK_PROMPT.format(stype=section_type),
    )

    system_prompt = f"""You are an expert educational content extractor for {subject} textbooks.

{type_instruction}

OUTPUT FORMAT — return ONLY a JSON object with a single key "sections" containing an array:
{{
  "sections": [
    {{
      "type": "{section_type}",
      "id": "<unique identifier>",
      "title": "<exact heading from textbook>",
      "content": "<ALL text content, complete and verbatim>"
    }}
  ]
}}

RULES:
1. Include EVERY occurrence of this section type — do NOT skip any.
2. Include the FULL content of each section — do NOT truncate.
3. If none are found, return: {{"sections": []}}
4. Return ONLY valid JSON, no markdown fences."""

    user_prompt = (
        f"Extract all '{section_type}' sections from this Unit {unit_number} content "
        f"(up to 20K chars shown):\n\n{unit_md[:20000]}"
    )

    result = _call_openai(system_prompt, user_prompt, api_key, model=model, max_tokens=8192)
    if not result:
        return []

    sections = result.get("sections", [])
    if not isinstance(sections, list):
        # Handle single-section response wrapped at top level
        if isinstance(result, dict) and result.get("type") == section_type:
            sections = [result]
        else:
            sections = []

    # Filter: keep only entries that have at least some content
    valid = [
        s for s in sections
        if isinstance(s, dict)
        and (s.get("content") or "").strip()
    ]
    print(
        f"  🔍 [GapFiller] extract_missing_type '{section_type}': "
        f"{len(valid)} valid section(s) found"
    )
    return valid


# ─── Section sort & de-dup helpers ────────────────────────────────────────────

_TERMINAL_TYPES: Set[str] = {
    "exercise", "evaluation", "points_to_remember",
    "glossary", "ict_corner",
}

# Entity/box types that carry their OWN numbering ("Exercise 2.4",
# "Example 2.54", "Activity 3") or legitimately repeat the same title
# ("Progress Check"). They must never be deduplicated against numbered
# sections or against each other by title.
_ENTITY_TYPES: Set[str] = {
    "activity", "example", "exercise", "problem", "illustration",
    "theorem", "proof", "corollary", "definition",
    "do_you_know", "note", "try_this", "thinking_corner",
    "progress_check", "more_to_know",
}

_ENTITY_LABEL_RE = re.compile(
    r"^(Exercise|Example|Activity|Theorem|Illustration|Problem)s?\s+\d+(?:\.\d+)*\s*$",
    re.IGNORECASE,
)


_LABEL_TYPE_MAP = {
    "exercise": "exercise", "example": "example", "activity": "activity",
    "theorem": "theorem", "illustration": "illustration", "problem": "example",
}


def _rekey_entity_ids(unit: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize entity sections against their printed label:

    - They must not hold a bare dotted number as id — a section titled
      "Exercise 2.4" with id "2.4" collides with the REAL section 2.4 and
      corrupts gap detection and dedup. Re-key such ids to the full label.
    - The label word decides the type: LLMs regularly emit "Example 2.7" as
      type='exercise', which blocks nesting under its parent section.
    """
    for sec in unit.get("sections") or []:
        stype = str(sec.get("type") or "").strip().lower()
        if stype not in _ENTITY_TYPES and stype not in ("", "section", "prose", "other"):
            continue
        sid = str(sec.get("section_number") or sec.get("id") or "").strip()
        title = str(sec.get("title") or sec.get("section_title") or "").strip()
        m = _ENTITY_LABEL_RE.match(title) or _ENTITY_LABEL_RE.match(sid)
        if not m:
            continue
        label_type = _LABEL_TYPE_MAP.get(m.group(1).lower())
        if label_type and stype != label_type:
            sec["type"] = label_type
        if re.match(r"^\d+(?:\.\d+)*$", sid) and _ENTITY_LABEL_RE.match(title):
            if "section_number" in sec:
                sec["section_number"] = title
            if "id" in sec or "section_number" not in sec:
                sec["id"] = title
    return unit


def _merge_duplicate_entity_sections(unit: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge duplicate sections that carry the SAME specific numbered label
    ("Exercise 2.9" × 7, "Unit Exercise - 2" × 10, "Example 2.44" × 2).

    Chunked extraction often emits one section per question — they all name
    the same entity, so they collapse into the first occurrence:
      - exercises: each duplicate's content becomes a sub_item (a question)
      - other entities: keep the richer content, merge metadata + sub_items

    Generic un-numbered titles ("Note", "Progress Check") are left alone —
    those are distinct boxes.
    """
    sections = unit.get("sections") or []
    if not sections:
        return unit

    out: List[Dict[str, Any]] = []
    seen: Dict[str, Dict[str, Any]] = {}
    merged = 0

    for sec in sections:
        stype = str(sec.get("type") or "").strip().lower()
        title = str(sec.get("title") or sec.get("section_title") or "").strip()
        label = title or str(sec.get("id") or "").strip()
        key = re.sub(r"\s+", " ", label.lower()).strip()

        if stype in _ENTITY_TYPES and key and re.search(r"\d", key):
            if key in seen:
                first = seen[key]
                dup_content = (sec.get("content") or "").strip()
                dup_items = sec.get("sub_items") or []
                if stype in ("exercise", "problem"):
                    items = first.get("sub_items") or []
                    if dup_content:
                        items.append({
                            "number":  str(len(items) + 1),
                            "content": dup_content,
                        })
                    items.extend(dup_items)
                    first["sub_items"] = items
                else:
                    if len(dup_content) > len((first.get("content") or "")):
                        first["content"] = dup_content
                    first_meta = first.get("metadata") or {}
                    for k, v in (sec.get("metadata") or {}).items():
                        if v and not first_meta.get(k):
                            first_meta[k] = v
                    first["metadata"] = first_meta
                    if dup_items:
                        items = first.get("sub_items") or []
                        items.extend(dup_items)
                        first["sub_items"] = items
                merged += 1
                continue
            seen[key] = sec
        out.append(sec)

    if merged:
        unit["sections"] = out
        print(f"  🔗 [GapFiller] Merged {merged} duplicate entity section(s) "
              f"into their canonical sections")
    return unit


# Types that belong INSIDE the numbered section they appear under — mirrors
# Filter 10 of auto_schema_extractor so verification passes repair flat output.
_NESTABLE_CLEANUP_TYPES: Set[str] = {
    "activity", "example", "illustration", "definition",
    "theorem", "proof", "corollary", "construction",
    "do_you_know", "thinking_corner", "progress_check",
    "note", "more_to_know", "try_this",
}

# Back-matter that closes the current section — entities after these stay top-level
_CLEANUP_RESET_TYPES: Set[str] = {
    "summary", "glossary", "unit_exercise", "multiple_choice",
    "points_to_remember", "evaluation", "ict_corner",
}


def _nest_inline_entities(unit: Dict[str, Any]) -> Dict[str, Any]:
    """
    Re-home top-level content into its parent section (document order):

    - Entity/box sections (examples, theorems, notes, progress checks ...)
      move into the sub_sections of the numbered section preceding them.
    - Orphan numbered subsections (2.7.1 sitting top-level) move under their
      numeric parent (2.7) when that parent section exists.

    Exercises stay top-level by design.
    """
    sections = unit.get("sections") or []
    if not sections:
        return unit

    def _sec_nums(sec):
        return _parse_dotted_version(
            str(sec.get("section_number") or sec.get("id") or "")
        )

    top: List[Dict[str, Any]] = []
    open_numbered: Optional[Dict[str, Any]] = None
    moved = 0

    for sec in sections:
        stype = str(sec.get("type") or "").strip().lower()
        title = str(sec.get("title") or "").lower()
        nums = _sec_nums(sec)

        if stype in _CLEANUP_RESET_TYPES or "unit exercise" in title or "points to remember" in title:
            open_numbered = None
            top.append(sec)
            continue

        if stype in ("section", "introduction") and nums:
            # Orphan subsection? Nest under the closest top-level numeric parent.
            parent = None
            for cand in reversed(top):
                cnums = _sec_nums(cand)
                if (cnums and len(cnums) < len(nums)
                        and nums[:len(cnums)] == cnums
                        and str(cand.get("type") or "").lower() in ("section", "introduction")):
                    parent = cand
                    break
            if parent is not None:
                parent.setdefault("sub_sections", []).append(sec)
                moved += 1
            else:
                top.append(sec)
            open_numbered = sec
            continue

        if stype in _NESTABLE_CLEANUP_TYPES and open_numbered is not None:
            open_numbered.setdefault("sub_sections", []).append(sec)
            moved += 1
            continue

        top.append(sec)

    if moved:
        unit["sections"] = top
        print(f"  🧭 [GapFiller] Nested {moved} inline/orphan section(s) "
              f"under their parent sections")
    return unit


def _norm_for_dedup(t: str) -> str:
    """Normalize a title for duplicate detection (case, punctuation, spaces)."""
    t = unicodedata.normalize("NFKC", t or "").lower()
    return re.sub(r"[^a-z0-9]", "", t)


def _sort_unit_sections(unit: Dict[str, Any]) -> Dict[str, Any]:
    """
    Re-sort sections[] after all gap-fills complete.

    Preferred: respect the extraction's textbook `order` indices (assigned by
    auto_schema_extractor._postprocess_sections as a pre-order walk). This
    keeps prose / learning_objectives at the top and exercises interleaved
    exactly as printed. Gap-filled sections lack `order` — each is slotted
    before the first ordered section whose numeric id is greater.

    Fallback (no `order` fields): numeric-id sort with terminal types last.
    """
    sections = list(unit.get("sections", []))
    if not sections:
        return unit

    def _sid_nums(sec):
        return _parse_dotted_version(
            str(sec.get("section_number") or sec.get("id") or "")
        )

    if any(isinstance(s.get("order"), int) for s in sections):
        ordered = sorted(
            [s for s in sections if isinstance(s.get("order"), int)],
            key=lambda s: s["order"],
        )
        pending = [s for s in sections if not isinstance(s.get("order"), int)]
        for sec in pending:
            snum = _sid_nums(sec)
            pos = len(ordered)
            if snum:
                for i, osec in enumerate(ordered):
                    onum = _sid_nums(osec)
                    if onum and onum > snum:
                        pos = i
                        break
            ordered.insert(pos, sec)
        unit["sections"] = ordered
        return unit

    numbered: List[Dict[str, Any]] = []
    unnamed:  List[Dict[str, Any]] = []
    terminal: List[Dict[str, Any]] = []

    for sec in sections:
        stype = sec.get("type", "")
        if stype in _TERMINAL_TYPES:
            terminal.append(sec)
        elif _sid_nums(sec):
            numbered.append(sec)
        else:
            unnamed.append(sec)

    numbered.sort(key=lambda s: _sid_nums(s) or [])

    unit["sections"] = numbered + unnamed + terminal
    return unit


def _dedup_sections_by_title(unit: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove duplicate sections that share the same normalized title.

    When two sections have the same title:
      - Keep the one with more content / more subsections (the "populated" copy).
      - Remove the "hollow" duplicate (no content + no sub_items/subsections).

    Also de-duplicates by numeric ID (catches same-number sections from different chunks).
    """
    sections = list(unit.get("sections", []))
    if not sections:
        return unit

    def _is_hollow(sec: Dict[str, Any]) -> bool:
        has_content = bool((sec.get("content") or "").strip())
        has_items   = bool(sec.get("sub_items") or sec.get("subsections") or sec.get("sub_sections"))
        return not has_content and not has_items

    # ── Phase 1: De-dup by numeric section ID ────────────────────────────────
    # Keyed on the PARSED numeric prefix so "2.4" and a mangled
    # "2.4 Fundamental Theorem of Arithmetic" are recognized as duplicates.
    id_seen: Dict[str, int] = {}   # numeric_id -> index in sections
    to_remove_idx: Set[int] = set()
    for i, sec in enumerate(sections):
        # Entity types (exercise/example/activity...) carry their own numbering
        # — never dedup them against numbered sections by numeric id.
        if str(sec.get("type") or "").strip().lower() in _ENTITY_TYPES:
            continue
        nums = _parse_dotted_version(
            str(sec.get("section_number") or sec.get("id") or "")
        )
        if not nums:
            continue
        sid = ".".join(map(str, nums))
        if sid in id_seen:
            prev_idx = id_seen[sid]
            prev_sec = sections[prev_idx]
            if _is_hollow(sec):
                to_remove_idx.add(i)
            elif _is_hollow(prev_sec):
                to_remove_idx.add(prev_idx)
                id_seen[sid] = i
            else:
                # Both populated — keep the copy with more content, merge the
                # other's children into it, remove the smaller one
                def _clen(s):
                    return len((s.get("content") or ""))
                keep_idx, drop_idx = (
                    (i, prev_idx) if _clen(sec) > _clen(prev_sec) else (prev_idx, i)
                )
                keep, drop = sections[keep_idx], sections[drop_idx]
                for key in ("sub_items", "sub_sections", "subsections"):
                    drop_items = list(drop.get(key) or [])
                    if not drop_items:
                        continue
                    keep_items = list(keep.get(key) or [])
                    for item in drop_items:
                        if item not in keep_items:
                            keep_items.append(item)
                    keep[key] = keep_items
                sections[keep_idx] = keep
                to_remove_idx.add(drop_idx)
                id_seen[sid] = keep_idx
        else:
            id_seen[sid] = i

    sections = [s for i, s in enumerate(sections) if i not in to_remove_idx]
    to_remove_idx.clear()

    # ── Phase 2: De-dup by normalized title ──────────────────────────────────
    # Entity/box types legitimately repeat the same title ("Progress Check",
    # "Thinking Corner", "Note", "Activity" ...) for DISTINCT content — they
    # must never be collapsed by title.
    title_seen: Dict[str, int] = {}  # norm_title -> index in sections
    for i, sec in enumerate(sections):
        if str(sec.get("type") or "").strip().lower() in _ENTITY_TYPES:
            continue
        title = str(sec.get("title") or sec.get("section_title") or "")
        if not title:
            continue
        norm_t = _norm_for_dedup(title)
        if not norm_t:
            continue
        if norm_t in title_seen:
            prev_idx  = title_seen[norm_t]
            prev_sec  = sections[prev_idx]
            if _is_hollow(sec):
                to_remove_idx.add(i)
            elif _is_hollow(prev_sec):
                to_remove_idx.add(prev_idx)
                title_seen[norm_t] = i
            else:
                # Both populated — keep the one with longer content
                prev_len = len(prev_sec.get("content") or "")
                new_len  = len(sec.get("content") or "")
                if new_len > prev_len:
                    to_remove_idx.add(prev_idx)
                    title_seen[norm_t] = i
                else:
                    to_remove_idx.add(i)
        else:
            title_seen[norm_t] = i

    sections = [s for i, s in enumerate(sections) if i not in to_remove_idx]
    unit["sections"] = sections
    return unit


def _drop_phantom_numbered_sections(
    unit: Dict[str, Any],
    unit_md: str,
) -> Dict[str, Any]:
    """
    Remove numbered sections that the textbook does not actually contain.

    A section is a phantom when its dotted id (e.g. "2.14") never appears as a
    heading in the source markdown AND it carries no real content (empty, or a
    junk "not found" filler, with no subsections). Real sections whose heading
    exists — or that hold substantive content — are always kept.
    """
    sections = unit.get("sections") or []
    if not sections or not unit_md:
        return unit

    kept: List[Dict[str, Any]] = []
    dropped: List[str] = []
    for sec in sections:
        stype = str(sec.get("type") or "").strip().lower()
        nums = _parse_dotted_version(
            str(sec.get("section_number") or sec.get("id") or "")
        )
        if nums and stype in ("", "section", "prose", "other"):
            sid_norm = ".".join(map(str, nums))
            content = (sec.get("content") or "").strip()
            has_children = bool(
                sec.get("sub_items") or sec.get("subsections") or sec.get("sub_sections")
            )
            is_junk = not has_children and (
                not content
                or (len(content) < 200 and _JUNK_FILL_RE.search(content))
            )
            if is_junk and not _heading_exists_in_md(sid_norm, unit_md):
                dropped.append(sid_norm)
                continue
        kept.append(sec)

    if dropped:
        unit["sections"] = kept
        print(
            f"  🗑️  [GapFiller] Dropped {len(dropped)} phantom section(s) "
            f"not present in the textbook: {dropped}"
        )
    return unit


def run_gap_filler(
    unit: Dict[str, Any],
    issues: List[str],
    unit_md: str,
    content_md: str,
    api_key: str,
    subject: str = "unknown",
    model: str = "gpt-5-mini",
) -> Tuple[Dict[str, Any], List[str]]:
    """
    Main entry point for content gap filling.

    Processes CRITICAL and HIGH severity issues for a single unit.
    Returns (updated_unit, list_of_fixes_applied).

    Strategy per issue type:
        - Empty section content → regex fill first, then LLM targeted fill
        - Section N.M INCOMPLETE (missing subsections) → chunk-split repair
        - Section N.M MISSING (gap in numbering) → targeted LLM extraction
        - Unit completely empty → full unit re-extraction
    """
    fixes_applied: List[str] = []
    unit_number = unit.get("unit_number") or unit.get("chapter_number") or 0


    # ── Step 1: Cheap regex fill for empty sections ──────────────────────────
    unit, regex_fills = fill_empty_sections_regex(unit, content_md)
    if regex_fills > 0:
        fixes_applied.append(f"regex_fill:{regex_fills}_sections")

    # ── Step 2: Process CRITICAL/HIGH issues via LLM ─────────────────────────
    sections = unit.get("sections", [])

    for issue in issues:
        if not _is_critical_or_high(issue):
            continue

        # ── CASE A: Section N.M INCOMPLETE ───────────────────────────────────
        # "[CRITICAL] Section 1.3 is INCOMPLETE: 3/5 subsections missing. Missing: 'X', 'Y'"
        incomplete_m = re.search(
            r"Section (\d+\.\d+) is INCOMPLETE.*?Missing: (.+?)(?:\s\.\.\.|—|$)",
            issue,
        )
        if incomplete_m:
            broken_sec = incomplete_m.group(1)
            missing_titles = re.findall(r"'([^']+)'", incomplete_m.group(2))

            # Extract just that section's raw markdown
            sec_esc = re.escape(broken_sec)
            sec_re  = re.compile(r"^#+\s*" + sec_esc + r"(?:\s|$)", re.IGNORECASE | re.MULTILINE)
            next_re = re.compile(r"^#+\s*\d+\.\d+(?:\s|$)", re.IGNORECASE | re.MULTILINE)

            collecting = False
            sec_lines: List[str] = []
            for line in unit_md.split("\n"):
                if not collecting:
                    if sec_re.match(line.strip()):
                        collecting = True
                        sec_lines.append(line)
                else:
                    if next_re.match(line.strip()) and not sec_re.match(line.strip()):
                        break
                    sec_lines.append(line)

            sec_raw = "\n".join(sec_lines).strip()
            if sec_raw and len(sec_raw) >= 100:
                repaired = fill_chunk_split_section(
                    section_raw_md=sec_raw,
                    section_number=broken_sec,
                    unit_number=unit_number,
                    subject=subject,
                    api_key=api_key,
                    missing_subsections=missing_titles,
                    model=model,
                )
                if repaired:
                    # Only apply if repair actually restored real content
                    if not _is_junk_fill(repaired):
                        unit = _merge_repaired_section(unit, broken_sec, repaired)
                        fixes_applied.append(f"section_repair:{broken_sec}")
                    else:
                        print(
                            f"  ⚠️  [GapFiller] Skipped empty/junk section_repair for {broken_sec} "
                            f"— LLM returned no usable content"
                        )
            continue

        # ── CASE B: Section N.M MISSING (gap in numbering) ───────────────────
        # "[CRITICAL] Section 1.3 is MISSING (gap: 1.2 → 1.4)."
        gap_m = re.search(
            r"Section (\d+\.\d+(?:\.\d+)*) is MISSING \(gap: (\d+\.\d+(?:\.\d+)*) → (\d+\.\d+(?:\.\d+)*|END)\)",
            issue,
        )
        if gap_m:
            missing_sec = gap_m.group(1)
            after_sec   = gap_m.group(2)
            before_sec  = gap_m.group(3)

            # NEVER create a section the textbook doesn't have: the missing
            # number must appear as a real heading in the markdown. Arithmetic
            # gaps without markdown evidence (e.g. jumps caused by example
            # numbers like "Example 2.54" leaking into section ids) would
            # otherwise spawn phantom sections (2.12 … 2.53) with junk content.
            if not _heading_exists_in_md(missing_sec, unit_md):
                print(
                    f"  ⏭️  [GapFiller] Skipped gap_fill for {missing_sec} — "
                    f"no such heading in the source markdown (phantom gap)"
                )
                continue

            # Extract content between after_sec and before_sec headings
            after_re  = re.compile(r"^#+\s*" + re.escape(after_sec)  + r"(?:\s|$)", re.IGNORECASE)
            before_re = re.compile(r"^#+\s*" + re.escape(before_sec) + r"(?:\s|$)", re.IGNORECASE)
            collecting = False
            gap_lines: List[str] = []
            for line in unit_md.split("\n"):
                s = line.strip()
                if not collecting:
                    if after_re.match(s):
                        collecting = True
                    continue
                if before_re.match(s):
                    break
                gap_lines.append(line)

            gap_raw = "\n".join(gap_lines).strip()
            if gap_raw and len(gap_raw) >= 100:
                repaired = fill_chunk_split_section(
                    section_raw_md=gap_raw,
                    section_number=missing_sec,
                    unit_number=unit_number,
                    subject=subject,
                    api_key=api_key,
                    model=model,
                )
                if repaired:
                    # Only count as a successful fix if LLM actually returned
                    # real content. An empty or "not found" apology repair must
                    # never be merged — it would create a junk section AND
                    # leave the same gap on the next pass.
                    if not _is_junk_fill(repaired):
                        unit = _merge_repaired_section(unit, missing_sec, repaired)
                        fixes_applied.append(f"gap_fill:{missing_sec}")
                    else:
                        print(
                            f"  ⚠️  [GapFiller] Skipped empty/junk gap_fill for {missing_sec} "
                            f"— LLM returned no usable content"
                        )
            continue

        # ── CASE C: Unit completely empty ─────────────────────────────────────
        if "Unit is empty" in issue or "no sections extracted" in issue:
            new_data = fill_missing_unit(
                unit_number=unit_number,
                unit_md=unit_md,
                subject=subject,
                api_key=api_key,
                issue_hint=issue,
                model=model,
            )
            if new_data:
                # Preserve identity fields
                for key in ("unit_number", "chapter_number", "title", "subject", "part"):
                    if unit.get(key) and not new_data.get(key):
                        new_data[key] = unit[key]
                unit = new_data
                fixes_applied.append(f"full_unit_reextract:{unit_number}")
            continue

        # ── CASE D: Missing section type — targeted re-extraction ─────────────
        # "[MISSING_TYPE:activity] Activity sections found in markdown headings ..."
        missing_type_m = re.match(r"\[MISSING_TYPE:(\w+)\]", issue)
        if missing_type_m:
            missing_type = missing_type_m.group(1)
            extracted = extract_missing_type_sections(
                section_type=missing_type,
                unit_md=unit_md,
                unit_number=unit_number,
                subject=subject,
                api_key=api_key,
                model=model,
            )
            if extracted:
                # Merge only sections whose id/title isn't already present
                existing_ids = {
                    str(s.get("id") or s.get("title") or "").lower()
                    for s in unit.get("sections", [])
                }
                added = 0
                sections_list = list(unit.get("sections", []))
                for new_sec in extracted:
                    sec_key = str(new_sec.get("id") or new_sec.get("title") or "").lower()
                    if sec_key and sec_key in existing_ids:
                        continue  # already extracted — skip
                    # Insert before points_to_remember / exercise at the end
                    inserted = False
                    for idx in range(len(sections_list) - 1, -1, -1):
                        if sections_list[idx].get("type") not in (
                            "points_to_remember", "exercise", "evaluation", "ict_corner"
                        ):
                            sections_list.insert(idx + 1, new_sec)
                            inserted = True
                            break
                    if not inserted:
                        sections_list.append(new_sec)
                    existing_ids.add(sec_key)
                    added += 1

                if added:
                    unit = {**unit, "sections": sections_list}
                    fixes_applied.append(f"missing_type_added:{missing_type}:{added}_sections")
                    print(
                        f"  ✅ [GapFiller] Added {added} missing '{missing_type}' "
                        f"section(s) to unit {unit_number}"
                    )
                else:
                    print(
                        f"  ℹ️  [GapFiller] All '{missing_type}' sections already present "
                        f"— no new sections added"
                    )
            continue

        # ── CASE E: Duplicate section — remove hollow copies ──────────────────
        # "[DUPLICATE_SECTION:exercise] Type 'exercise' has 2 copies but 1 hollow ..."
        dup_m = re.match(r"\[DUPLICATE_SECTION:(\w+)\]", issue)
        if dup_m:
            dup_type = dup_m.group(1)
            sections_list = list(unit.get("sections", []))
            same_type = [s for s in sections_list if s.get("type") == dup_type]
            if len(same_type) < 2:
                continue  # nothing to remove

            # Identify hollow copies (no content AND no sub_items/subsections)
            hollow = [
                s for s in same_type
                if not (s.get("content") or "").strip()
                and not (s.get("sub_items") or s.get("subsections") or [])
            ]
            populated = [s for s in same_type if s not in hollow]

            if hollow and populated:
                # Remove hollow copies — keep all populated ones
                removed_ids = [
                    str(s.get("id") or s.get("title") or dup_type) for s in hollow
                ]
                sections_list = [s for s in sections_list if s not in hollow]
                unit = {**unit, "sections": sections_list}
                fixes_applied.append(
                    f"duplicate_removed:{dup_type}:{len(hollow)}_hollow"
                )
                print(
                    f"  🗑️  [GapFiller] Removed {len(hollow)} hollow '{dup_type}' "
                    f"duplicate(s) from unit {unit_number}: {removed_ids}"
                )
            continue

    # ── Final cleanup: drop phantoms, de-duplicate and re-sort sections ──────
    # ALWAYS runs (not just when fixes were applied) so phantom/duplicate
    # sections left over from an earlier corrupted pass are removed too.
    before_count = len(unit.get("sections", []))
    unit = _rekey_entity_ids(unit)
    unit = _merge_duplicate_entity_sections(unit)
    unit = _drop_phantom_numbered_sections(unit, unit_md)
    unit = _dedup_sections_by_title(unit)
    unit = _sort_unit_sections(unit)
    unit = _nest_inline_entities(unit)
    after_count = len(unit.get("sections", []))
    if fixes_applied or after_count != before_count:
        print(
            f"  📐 [GapFiller] Unit {unit_number}: sections cleaned, re-sorted and "
            f"de-duplicated ({after_count} sections total)"
        )

    return unit, fixes_applied




def _norm_title(t: str) -> str:
    t = re.sub(r"^\d+\.\s*", "", (t or "").lower())
    return re.sub(r"[^\w\s]", "", t).strip()


def _parse_dotted_version(s: str):
    s = str(s).strip()
    m = re.match(r"^(\d+(?:\.\d+)+)", s)
    if m:
        return [int(x) for x in m.group(1).split(".")]
    return None


def _is_less_than(snum_a, snum_b) -> bool:
    val_a = _parse_dotted_version(snum_a)
    val_b = _parse_dotted_version(snum_b)
    
    if val_a is not None and val_b is not None:
        return val_a < val_b
        
    name_a = str(snum_a).lower()
    name_b = str(snum_b).lower()
    
    if "intro" in name_a:
        return True
    if "intro" in name_b:
        return False
    if "exercise" in name_a or "summary" in name_a or "glossary" in name_a:
        return False
    if "exercise" in name_b or "summary" in name_b or "glossary" in name_b:
        return True
        
    return name_a < name_b


def _merge_repaired_section(
    unit: Dict[str, Any],
    section_number: str,
    repaired: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Merge a repaired section dict back into the unit without
    regressing existing content.
    If section_number is a subsection (e.g. 2.5.3), it merges it inside the parent section (2.5)'s sub_sections array.
    """
    sections = unit.get("sections", [])

    def _find_idx(snum: str, target_list=sections) -> int:
        for i, sec in enumerate(target_list):
            sid = str(sec.get("section_number") or sec.get("id", ""))
            if sid == snum or sid.startswith(snum + "_"):
                return i
            title_field = sec.get("title") or sec.get("section_title") or ""
            if title_field.startswith(snum + " "):
                return i
        return -1

    is_auto = any("type" in s and "id" in s for s in sections[:5])

    # ── Handle Level 2 subsection (e.g. 2.5.3) ──────────────────────────────────
    parts = section_number.split(".")
    if len(parts) > 2:
        parent_num = ".".join(parts[:-1]) # e.g. "2.5"
        parent_idx = _find_idx(parent_num)
        if parent_idx >= 0:
            parent_sec = sections[parent_idx]
            sub_sections = parent_sec.setdefault("sub_sections", [])
            
            sub_idx = _find_idx(section_number, sub_sections)
            if is_auto:
                new_sub = {
                    "type":     "section",
                    "id":       repaired.get("section_number", section_number),
                    "title":    repaired.get("section_title", ""),
                    "content":  repaired.get("content", ""),
                    "metadata": {},
                    "sub_items": [
                        {"number": s.get("subsection_number", ""), "content": s.get("content", "")}
                        for s in repaired.get("subsections", [])
                    ],
                }
            else:
                new_sub = repaired
                
            if sub_idx >= 0:
                existing_sub = sub_sections[sub_idx]
                if not (existing_sub.get("content") or "").strip() and (new_sub.get("content") or "").strip():
                    existing_sub["content"] = new_sub["content"]
                
                new_items = new_sub.get("sub_items") or new_sub.get("subsections") or []
                existing_items = existing_sub.get("sub_items") or existing_sub.get("subsections") or []
                for item in new_items:
                    if item not in existing_items:
                        existing_items.append(item)
                if existing_items:
                    existing_sub["sub_items" if is_auto else "subsections"] = existing_items
                sub_sections[sub_idx] = existing_sub
            else:
                inserted = False
                for i, sub in enumerate(sub_sections):
                    sub_id = sub.get("id") or sub.get("section_number") or ""
                    try:
                        if sub_id and _is_less_than(section_number, sub_id):
                            sub_sections.insert(i, new_sub)
                            inserted = True
                            break
                    except TypeError:
                        pass
                if not inserted:
                    sub_sections.append(new_sub)
            
            parent_sec["sub_sections"] = sub_sections
            sections[parent_idx] = parent_sec
            unit["sections"] = sections
            return unit

    repair_subs = repaired.get("subsections", [])
    idx = _find_idx(section_number)

    if idx >= 0:
        sec = sections[idx]
        existing_subs = sec.get("sub_items" if is_auto else "subsections", [])

        existing_norm = {
            _norm_title(
                s.get("subsection_title") or s.get("title") or s.get("content", "")[:40]
            ): i
            for i, s in enumerate(existing_subs)
        }

        additions: List[Dict] = []
        for rsub in repair_subs:
            rn = _norm_title(rsub.get("subsection_title", ""))
            if not rn:
                continue
            if rn not in existing_norm:
                if is_auto:
                    additions.append({
                        "number":  rsub.get("subsection_number", ""),
                        "content": rsub.get("content", ""),
                    })
                else:
                    additions.append(rsub)
            else:
                ei = existing_norm[rn]
                old_len = len(existing_subs[ei].get("content") or "")
                new_len = len(rsub.get("content") or "")
                if new_len > old_len * 1.2:
                    if is_auto:
                        existing_subs[ei] = {
                            "number":  rsub.get("subsection_number", ""),
                            "content": rsub.get("content", ""),
                        }
                    else:
                        existing_subs[ei] = rsub

        merged = existing_subs + additions
        if is_auto:
            sec["sub_items"] = merged
        else:
            for j, sub in enumerate(merged, 1):
                sub["subsection_number"] = f"{section_number}.{j}"
            sec["subsections"] = merged

        # Fill title/content only if missing
        if is_auto:
            if not (sec.get("title") or "").strip() and repaired.get("section_title"):
                sec["title"] = repaired["section_title"]
        else:
            if not sec.get("section_title") and repaired.get("section_title"):
                sec["section_title"] = repaired["section_title"]
        if not (sec.get("content") or "").strip() and (repaired.get("content") or "").strip():
            sec["content"] = repaired["content"]

        sections[idx] = sec
        unit["sections"] = sections
        return unit

    # Section not found — insert in sorted order
    if is_auto:
        new_sec: Dict[str, Any] = {
            "type":     "section",
            "id":       repaired.get("section_number", section_number),
            "title":    repaired.get("section_title", ""),
            "content":  repaired.get("content", ""),
            "metadata": {},
            "sub_items": [
                {"number": s.get("subsection_number", ""), "content": s.get("content", "")}
                for s in repair_subs
            ],
        }
    else:
        repair_subs_renum = repair_subs[:]
        for j, sub in enumerate(repair_subs_renum, 1):
            sub["subsection_number"] = f"{section_number}.{j}"
        new_sec = {**repaired, "subsections": repair_subs_renum}

    inserted = False
    for i, sec in enumerate(sections):
        sid = str(sec.get("section_number") or sec.get("id", ""))
        try:
            if sid and _is_less_than(section_number, sid):
                sections.insert(i, new_sec)
                inserted = True
                break
        except TypeError:
            pass
    if not inserted:
        sections.append(new_sec)

    unit["sections"] = sections
    return unit
