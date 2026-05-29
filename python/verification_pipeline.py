"""
Verification Agent for GradeUp Extraction Pipeline
===================================================

A dedicated verification agent that:
1. Reads the Table of Contents from the PDF markdown
2. Compares extracted units against TOC to find missing/incomplete units
3. For each missing or incomplete unit, triggers LLM re-extraction
4. Validates section coverage (prose, poetry, grammar, vocabulary, etc.) for English
5. Produces a verification report saved as verification_report.json

Works for ALL subjects: English, Science, Mathematics, Social Science
Also fully backwards-compatible with the old verification_pipeline interface.
"""

import re
import orjson
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import requests
import time

try:
    from config import OPENAI_API_KEY_TEXT
except ImportError:
    import os
    OPENAI_API_KEY_TEXT = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")


# =============================================================================
# TOC EXTRACTOR — reads TOC from markdown to get expected unit list
# =============================================================================

def extract_toc_units_from_markdown(markdown: str) -> List[Dict[str, Any]]:
    """
    Read the Table of Contents from the markdown and return the expected list
    of units/chapters with their numbers and titles.

    Handles all TN Board textbook formats:
    - Pipe table:  | 1 | Learning the Game | Prose | Page |
    - Numbered list: 1. Title
    - Chapter keyword: Chapter 1: Title

    Returns: [{"number": 1, "title": "...", "type": "unit"}, ...]
    """
    lines = markdown.split('\n')

    # Find TOC section (first 500 lines)
    toc_start = None
    for i, line in enumerate(lines[:500]):
        s = line.strip().upper()
        if s in ('CONTENT', 'CONTENTS', 'TABLE OF CONTENTS',
                 '# CONTENT', '# CONTENTS', '## CONTENT', '## CONTENTS'):
            toc_start = i
            break
        # English: header row like "| Unit | Contents | Page |"
        if 'UNIT' in s and ('CONTENT' in s or 'PAGE' in s) and line.strip().startswith('|'):
            toc_start = i
            break
        # Numbered-list TOC must appear in the first 100 lines (cover/TOC area).
        # Chapter titles are typically short (<80 chars); exercise questions are long.
        # This prevents exercise question lists from being misidentified as a chapter TOC.
        if re.match(r'^\s*1[.)]\s+[A-Z]', line) and i < 100:
            subs = [l for l in lines[i+1:i+5] if l.strip()]
            if (any(re.match(r'^\s*[2-9][.)]\s+[A-Z]', l) for l in subs)
                    and len(line.strip()) < 80):
                toc_start = i
                break

    if toc_start is None:
        print("  ⚠️  [VerifyAgent] TOC not found in markdown")
        return []

    toc_end = min(toc_start + 400, len(lines))
    units = []
    seen_numbers: Set[int] = set()

    # Regex patterns
    eng_row = re.compile(
        r'^\|\s*(\d+)\s*\|\s*(?:Prose|Poem\*?|Drama|Supplementary|Fiction|Non-fiction)\s*\|([^|]*)\|',
        re.IGNORECASE
    )
    std_row = re.compile(r'^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|')
    list_row = re.compile(r'^\s*(\d+)[.)]\s+(.+?)(?:\s+\d+\s*$|\s*$)')

    in_table = False
    consec_non = 0

    for line in lines[toc_start:toc_end]:
        s = line.strip()
        if not s:
            continue

        if s.startswith('|'):
            in_table = True
            consec_non = 0
        else:
            if in_table:
                consec_non += 1
                if consec_non >= 3:
                    break
            m = list_row.match(s)
            if m:
                n = int(m.group(1))
                title = m.group(2).strip()
                if 1 <= n <= 50 and n not in seen_numbers and title:
                    seen_numbers.add(n)
                    units.append({"number": n, "title": title, "type": "unit"})
            continue

        if re.match(r'^\|[\s\-|]+\|', s):
            continue  # separator row

        # English-style table row
        m = eng_row.match(s)
        if m:
            n = int(m.group(1))
            if 1 <= n <= 50 and n not in seen_numbers:
                seen_numbers.add(n)
                title = m.group(2).strip() if len(m.groups()) > 1 else f"Unit {n}"
                units.append({"number": n, "title": title or f"Unit {n}", "type": "unit"})
            continue

        # Standard table row
        m = std_row.match(s)
        if m:
            n = int(m.group(1))
            title = m.group(2).strip()
            skip = ('unit', 'chapter', 'sl', 'no', 's.no', 'page', 'month')
            if (1 <= n <= 50 and n not in seen_numbers
                    and title and not re.match(r'^[\-\s]+$', title)
                    and title.lower() not in skip):
                seen_numbers.add(n)
                units.append({"number": n, "title": title, "type": "unit"})

    units.sort(key=lambda x: x["number"])

    if units:
        print(f"  📖 [VerifyAgent] TOC: {len(units)} units {[u['number'] for u in units]}")
    else:
        print("  ⚠️  [VerifyAgent] Could not extract unit list from TOC")
    return units


# =============================================================================
# UNIT CONTENT EXTRACTOR
# =============================================================================

def extract_unit_markdown(markdown: str, unit_number: int) -> str:
    """
    Extract the raw OCR markdown for a specific unit number.
    Handles # Unit - N, # Unit N, plain 'Unit - N', etc.
    Skips the first 150 lines (cover + TOC area).
    """
    lines = markdown.split('\n')

    unit_re = re.compile(
        r'^(?:#+\s*)?(?:Unit\s*[-\u2013:]?\s*{n}(?:\s|$|:)|UNIT\s*[-\u2013:]?\s*{n}(?:\s|$|:))'.format(n=unit_number),
        re.IGNORECASE
    )
    next_re = re.compile(
        r'^(?:#+\s*)?(?:Unit\s*[-\u2013:]?\s*{n}(?:\s|$|:)|UNIT\s*[-\u2013:]?\s*{n}(?:\s|$|:))'.format(n=unit_number + 1),
        re.IGNORECASE
    )

    unit_lines: List[str] = []
    in_unit = False

    for idx, line in enumerate(lines):
        s = line.strip()
        if not in_unit:
            if idx < 150:
                continue
            if unit_re.match(s):
                # Verify real content follows
                following = [lines[ci].strip() for ci in range(idx+1, min(idx+15, len(lines))) if lines[ci].strip()]
                if following and any(len(f) > 10 for f in following[:5]):
                    in_unit = True
                    unit_lines.append(line)
        else:
            if next_re.match(s):
                # Next sequential unit - definitely done
                break
            # If a DIFFERENT (non-next) unit header appears, pause but keep scanning.
            # This handles out-of-order PDF pages (e.g. Unit 5 Poem appears before
            # Unit 3 Supplementary in the OCR output).
            other_unit_re = re.compile(
                r'^(?:#+\s*)?(?:Unit\s*[-\u2013:]?\s*(\d+)(?:\s|$|:))',
                re.IGNORECASE
            )
            m = other_unit_re.match(s)
            if m:
                found_num = int(m.group(1))
                if found_num != unit_number:
                    in_unit = False
                    continue
            unit_lines.append(line)

    return '\n'.join(unit_lines)



# =============================================================================
# EMPTY SECTION CONTENT FILLER — fetches content from content.md via regex
# =============================================================================

def _fetch_section_content_from_md(
    markdown: str,
    section_type: str,
    section_title: Optional[str],
    unit_number: int,
) -> Optional[str]:
    """
    Try to extract content for a specific section type/title from content.md.
    Uses regex patterns to find the section text.
    Returns the extracted content or None.
    """
    unit_md = extract_unit_markdown(markdown, unit_number)
    if not unit_md:
        return None

    search_title = re.escape(section_title.strip()) if section_title else None

    # Patterns based on section type
    if section_type == "poem" and search_title:
        # Look for the poem title, then capture lines until the next heading
        pat = re.compile(
            r'(?:^|\n)(?:#+\s*)?' + search_title + r'[\s\S]*?(?=\n#+|\Z)',
            re.IGNORECASE | re.MULTILINE
        )
        m = pat.search(unit_md)
        if m:
            return m.group(0).strip()

    elif section_type in ("prose", "supplementary") and search_title:
        # Look for the title heading, capture content until next major heading
        pat = re.compile(
            r'(?:^|\n)(?:#+\s*)?' + search_title + r'[\s\S]{200,}?(?=\n##\s|\Z)',
            re.IGNORECASE | re.MULTILINE
        )
        m = pat.search(unit_md)
        if m:
            text = m.group(0).strip()
            if len(text) > 100:
                return text

    elif section_type == "supplementary" and not search_title:
        # Generic supplementary search
        pat = re.compile(
            r'(?:Supplementary\s+Reading|A\s+Japanese\s+Folk\s+Tale|Folk\s+Tale|The\s+Envious)'
            r'[\s\S]{200,}?(?=\n##\s|\n#\s|\Z)',
            re.IGNORECASE | re.MULTILINE
        )
        m = pat.search(unit_md)
        if m:
            text = m.group(0).strip()
            if len(text) > 100:
                return text

    elif section_type in ("section", "introduction", "activity"):
        # Look for the title heading
        if search_title:
            pat = re.compile(
                r'(?:^|\n)(?:#+\s*)?' + search_title + r'[\s\S]{50,}?(?=\n##?\s|\Z)',
                re.IGNORECASE | re.MULTILINE
            )
            m = pat.search(unit_md)
            if m:
                return m.group(0).strip()

    return None


def _fill_empty_sections_in_unit(
    unit: Dict[str, Any],
    markdown: str,
) -> Tuple[Dict[str, Any], int]:
    """
    For each section in the unit that has empty content, try to fill it
    from the content.md markdown. Returns (updated_unit, fill_count).
    """
    unit_number = unit.get("unit_number") or unit.get("chapter_number") or 0
    fill_count = 0

    for sec in unit.get("sections", []):
        sec_type = sec.get("type", "")
        sec_content = sec.get("content") or ""
        sec_sub_items = sec.get("sub_items") or []

        must_have_content = {
            "prose", "poem", "supplementary", "section", "introduction",
            "activity", "example", "definition", "theorem"
        }

        if sec_type not in must_have_content:
            continue
        if sec_content.strip() or sec_sub_items:
            continue  # Already has content

        # Try to fetch from content.md
        sec_title = sec.get("title") or sec.get("id")
        fetched = _fetch_section_content_from_md(markdown, sec_type, sec_title, unit_number)
        if fetched and len(fetched) > 50:
            sec["content"] = fetched
            fill_count += 1
            print(f"  📥 Filled empty {sec_type} '{sec_title}' from content.md ({len(fetched)} chars)")

    return unit, fill_count


# =============================================================================
# SECTION COMPLETENESS CHECKER
# =============================================================================

def _get_present_types(unit: Dict[str, Any]) -> Set[str]:
    """Collect all section types present in a unit dict."""
    types: Set[str] = set()
    for sec in unit.get("sections", []):
        t = sec.get("type")
        if t:
            types.add(t)
    # Old-style top-level arrays
    legacy = {
        "exercises": "exercise", "activities": "activity", "notes": "note",
        "examples": "example", "prose": "prose", "poetry": "poem",
        "supplementary": "supplementary", "grammar": "grammar",
        "vocabulary": "vocabulary", "writing_tasks": "writing_task",
        "speaking_listening": "speaking",
    }
    for key, tname in legacy.items():
        if unit.get(key):
            types.add(tname)
    return types


def check_unit_completeness(
    unit: Dict[str, Any],
    unit_md: str,
    subject: str,
) -> Dict[str, Any]:
    """
    Analyse a unit's extracted data for completeness gaps.

    Returns a dict with:
      - issues: list of definite problems (will trigger re-extraction)
      - warnings: list of potential issues (informational)
      - is_complete: bool
      - present_types: list of section types found
    """
    issues: List[str] = []
    warnings: List[str] = []
    present = _get_present_types(unit)

    sections = unit.get("sections", [])
    unit_num = unit.get("unit_number") or unit.get("chapter_number")

    # ── Empty unit check ──────────────────────────────────────────────────────
    if not sections and not unit.get("learning_objectives") and not unit.get("prose"):
        issues.append("Unit is empty — no sections extracted at all")
        return {
            "unit_number": unit_num,
            "title": unit.get("title", "Unknown"),
            "issues": issues,
            "warnings": warnings,
            "is_complete": False,
            "present_types": [],
        }

    # ── Empty section check (ALL subjects) ───────────────────────────────────
    # Check for sections that exist but have empty/null content fields
    empty_sections = []
    for sec in sections:
        sec_type = sec.get("type", "")
        sec_content = sec.get("content") or ""
        sec_sub_items = sec.get("sub_items") or []
        # Critical types that MUST have content
        must_have_content = {
            "prose", "poem", "supplementary", "section", "introduction",
            "activity", "example", "definition", "theorem"
        }
        if sec_type in must_have_content and not sec_content.strip() and not sec_sub_items:
            empty_sections.append({
                "type": sec_type,
                "title": sec.get("title") or sec.get("id") or sec_type,
            })
    if empty_sections:
        for es in empty_sections:
            issues.append(
                f"Section type='{es['type']}' title='{es['title']}' has empty content "
                f"— needs to be fetched from content.md"
            )

    # ── Poem stanza check ─────────────────────────────────────────────────────
    poem_secs = [s for s in sections if s.get("type") == "poem"]
    for ps in poem_secs:
        stanzas = ps.get("sub_items") or []
        if not stanzas:
            issues.append(
                f"Poem '{ps.get('title') or 'unknown'}' has no stanzas in sub_items"
            )
        poem_content = ps.get("content") or ""
        if len(poem_content) < 30 and not stanzas:
            issues.append(
                f"Poem '{ps.get('title') or 'unknown'}' has empty content AND no stanzas"
            )

    if subject == "english":
        # ── Prose check ───────────────────────────────────────────────────────
        # Check sections[] for prose (new schema) OR legacy prose[] key
        prose_secs = [s for s in sections if s.get("type") == "prose"]
        has_legacy_prose = bool(unit.get("prose"))
        if prose_secs:
            short = [s for s in prose_secs if len(s.get("content") or "") < 300]
            if len(short) > len(prose_secs) / 2:
                issues.append(
                    f"Most prose sections have very short content — "
                    f"paragraphs may not be merged into one section"
                )
        elif not has_legacy_prose:
            # Check if there's actually prose in the MD
            if re.search(r'(?:About the Author|About the Poet)', unit_md, re.IGNORECASE):
                issues.append("Prose/story content expected (About the Author found) but no prose section extracted")

        # ── Supplementary check ───────────────────────────────────────────────
        # Detect supplementary content using multiple patterns:
        # - Explicit "Supplementary Reading" heading
        # - Folk tale patterns (Japanese, Indian folk tales)
        # - Story titles that appear after exercises (The Envious Neighbour, etc.)
        # Check for ACTUAL supplementary sections - not TOC-style headings
        # A real supplementary has: 'Unit N Supplementary' label OR specific folk-tale markers
        # followed by actual prose content (not just bullet lists of titles)
        supp_found_in_md = False
        
        # Primary check: actual 'Unit N Supplementary' section label
        if re.search(
            r'Unit\s+' + str(unit_num) + r'\s+Supplementary',
            unit_md, re.IGNORECASE
        ):
            supp_found_in_md = True
        
        # Secondary check: folk-tale / secondary reading patterns with actual prose content
        folk_patterns = [
            r'A\s+Japanese\s+Folk\s+Tale',
            r'Folk\s+Culture\s+and\s+Folklore',
            r'The\s+Envious\s+Neighbour',
            r'In\s+the\s+old,\s+old\s+days',
        ]
        for fp in folk_patterns:
            m = re.search(fp, unit_md, re.IGNORECASE)
            if m:
                # Verify it's actual prose, not just a bullet-list title reference
                # (TOC entries are short lines starting with '-')
                context = unit_md[m.start()-50:m.start()+200]
                if not re.match(r'\s*-\s+', unit_md[m.start()-10:m.start()].lstrip('\n')):
                    supp_found_in_md = True
                    break
        
        if supp_found_in_md and "supplementary" not in present:
            issues.append("Supplementary section found in markdown but NOT extracted")
        elif supp_found_in_md and "supplementary" in present:
            # Check that supplementary has actual content (not truncated)
            supp_secs = [s for s in sections if s.get("type") == "supplementary"]
            total_supp_content = sum(len(s.get("content") or "") for s in supp_secs)
            if total_supp_content < 500:
                issues.append(
                    f"Supplementary extracted but appears truncated ({total_supp_content} chars) "
                    "— expected at least 500 chars"
                )

        # ── Grammar check ─────────────────────────────────────────────────────
        if re.search(r'(?:^|\n)#{1,3}\s*Grammar\b|(?:^|\n)\*\*Grammar\*\*',
                     unit_md, re.IGNORECASE | re.MULTILINE):
            if "grammar" not in present:
                issues.append("Grammar section found in markdown but NOT extracted")

        # ── Writing task check ────────────────────────────────────────────────
        if re.search(r'(?:^|\n)[A-Z]\.\s+(?:Prepare|Write|Draft|Compose|Describe)\s',
                     unit_md, re.MULTILINE):
            if "writing_task" not in present and "writing" not in present:
                warnings.append("Writing task prompts found in markdown but no writing_task sections extracted")

        # ── Exercise count sanity ─────────────────────────────────────────────
        ex_in_md = len(re.findall(
            r'(?:^|\n)[A-Z]\.\s+(?:Answer|Choose|Match|Fill|Complete|Read|Look|Listen|Work|Pick)',
            unit_md, re.MULTILINE
        ))
        ex_extracted = len([s for s in sections if s.get("type") in
                            ("exercise", "writing_task", "listening", "speaking", "activity")])
        if ex_in_md > ex_extracted + 3:
            warnings.append(
                f"Markdown has ~{ex_in_md} exercise/activity blocks, "
                f"only {ex_extracted} captured"
            )

    elif subject == "science":
        if re.search(r'(?:^|\n)#+\s*Activity\s*\d+', unit_md, re.IGNORECASE | re.MULTILINE):
            if "activity" not in present:
                issues.append("Activity sections found in markdown but NOT extracted")

    elif subject == "mathematics":
        ex_in_md = len(re.findall(r'Example\s+\d+\.\d+', unit_md))
        ex_extracted = len([s for s in sections if s.get("type") == "example"])
        if ex_in_md > max(ex_extracted * 2, 3) and ex_in_md > 5:
            warnings.append(f"~{ex_in_md} example refs in markdown, only {ex_extracted} extracted")

    # ── Subsection coverage check (ALL subjects) ──────────────────────────────
    # Scans content.md for ALL heading levels (#/##/###) under each N.M section and
    # compares against extracted subsections[]. Catches the chunk-split bug where
    # H1-level subsections (e.g. '# Takeover by the Bolshevik Party') are silently
    # dropped because the continuation note said the section was already "done".
    # Skip subsection coverage for auto-schema units — auto-schema stores
    # content in sub_items[].number/content, not subsections[].subsection_title.
    # The check produces 100% false positives and triggers unnecessary repair.
    if unit_md and not _is_auto_schema_unit(unit):
        sub_issues = _check_subsection_coverage(unit, unit_md, unit_num, subject=subject)
        issues.extend(sub_issues)

    # ── Section number gap check (ALL subjects) ────────────────────────────────
    # Detects jumps in section numbering (e.g. 1.1, 1.2, 1.4 — missing 1.3).
    # This catches the case where the PDF author omitted a section number, causing
    # that section's content to be merged into the preceding section by the LLM.
    if unit_md:
        gap_issues = _check_section_number_gaps(unit, unit_md)
        issues.extend(gap_issues)

    return {
        "unit_number": unit_num,
        "title": unit.get("title", "Unknown"),
        "issues": issues,
        "warnings": warnings,
        "is_complete": len(issues) == 0,
        "present_types": sorted(present),
    }



# =============================================================================
# SECTION GAP DETECTOR
# =============================================================================

def _check_section_number_gaps(
    unit: Dict[str, Any],
    unit_md: str,
) -> List[str]:
    """
    Detect gaps in the section numbering sequence (e.g. 1.1, 1.2, 1.4 — missing 1.3).

    Two causes:
    A) The PDF author genuinely omitted the section number (common OCR artefact).
       The content exists in the markdown but has no "## N.M" prefix.
    B) The LLM skipped a section during extraction.

    Returns issue strings that will trigger targeted repair for each gap.
    Each issue includes whether content was found in the markdown between the
    surrounding sections (so the repair LLM knows what raw text to process).
    """
    issues: List[str] = []
    if not unit_md:
        return issues

    # Collect section numbers present in the extracted data
    section_nums: List[tuple] = []
    for sec in unit.get("sections", []):
        snum = sec.get("section_number", "")
        if not snum:
            continue
        m = re.match(r"(\d+)\.(\d+)", snum)
        if m:
            section_nums.append((int(m.group(1)), int(m.group(2)), snum))
    if len(section_nums) < 2:
        return issues

    section_nums.sort()

    # Collect section headings actually present in the markdown
    section_re = re.compile(r"^#+\s*(\d+\.\d+)(?:\s|\.|$)", re.IGNORECASE | re.MULTILINE)
    md_sections = {m.group(1) for m in section_re.finditer(unit_md)}

    for i in range(len(section_nums) - 1):
        curr_major, curr_minor, curr_snum = section_nums[i]
        next_major, next_minor, next_snum = section_nums[i + 1]

        if curr_major != next_major:
            continue  # different units — skip

        for missing_minor in range(curr_minor + 1, next_minor):
            missing_snum = f"{curr_major}.{missing_minor}"

            # Check if missing section exists in markdown (PDF just forgot to number it)
            # by looking for unnumbered content between curr and next
            in_markdown = missing_snum in md_sections
            has_unnumbered_content = _has_unnumbered_content_between(
                unit_md, curr_snum, next_snum
            )

            cause = (
                "OCR heading has no section number — content exists but was merged into "
                f"section {curr_snum}. The PDF author omitted the '{missing_snum}' label."
                if has_unnumbered_content
                else "Section appears to have been skipped entirely during extraction."
            )
            issues.append(
                f"Section {missing_snum} is MISSING (gap: {curr_snum} → {next_snum}). "
                f"{cause} — needs targeted extraction with section_number='{missing_snum}'."
            )

    return issues


def _has_unnumbered_content_between(unit_md: str, sec_a: str, sec_b: str) -> bool:
    """
    Return True if there are non-trivial heading(s) in the markdown BETWEEN
    sec_a and sec_b that are NOT themselves numbered sections.
    This indicates a section whose number was omitted by the PDF author.
    """
    lines = unit_md.split("\n")
    sec_a_re  = re.compile(r"^#+\s*" + re.escape(sec_a) + r"(?:\s|$)", re.IGNORECASE)
    sec_b_re  = re.compile(r"^#+\s*" + re.escape(sec_b) + r"(?:\s|$)", re.IGNORECASE)
    any_sec_re = re.compile(r"^#+\s*\d+\.\d+(?:\s|$)", re.IGNORECASE)
    heading_re = re.compile(r"^#+\s+(.+)")

    collecting = False
    for line in lines:
        s = line.strip()
        if not s:
            continue
        if sec_a_re.match(s):
            collecting = True
            continue
        if collecting:
            if sec_b_re.match(s):
                break
            if any_sec_re.match(s):
                break
            m = heading_re.match(s)
            if m:
                title = m.group(1).strip()
                # A non-trivial heading means there IS content between the numbered sections
                if len(title) > 5 and not title.startswith("!"):
                    return True
    return False


def _extract_unnumbered_section_raw(
    unit_md: str,
    after_section: str,
    before_section: str,
) -> str:
    """
    Extract the raw markdown that falls BETWEEN two numbered sections.
    This is the content of the unnumbered/mislabelled section that needs to be
    re-extracted with the correct section number assigned.
    """
    lines = unit_md.split("\n")
    after_re  = re.compile(r"^#+\s*" + re.escape(after_section) + r"(?:\s|$)", re.IGNORECASE)
    before_re = re.compile(r"^#+\s*" + re.escape(before_section) + r"(?:\s|$)", re.IGNORECASE)

    collecting = False
    collected: List[str] = []
    for line in lines:
        s = line.strip()
        if not collecting:
            if after_re.match(s):
                collecting = True
            continue
        if before_re.match(s):
            break
        collected.append(line)

    return "\n".join(collected).strip()

# =============================================================================
# SUBSECTION COVERAGE CHECKER
# =============================================================================

# Headings that belong in exercises[], do_you_know[], etc. — NOT in subsections[]
_SKIP_HEADING_RE = re.compile(
    r'^(?:'
    # Exercise headers: Roman numeral + verb
    r'[IVX]+\s*(?:Choose|Fill|Match|Answer|Activity|Map|Reference|Write|Discuss|Explain|'
    r'Assess|Analyse|Estimate|Highlight|Evaluate|Name|List|State|Describe|Note|Mention|Give|Project)'
    # Back-matter section titles (exact)
    r'|EXERCISE|SUMMARY|GLOSSARY|M\s*GLOSSARY|REFERENCE\s*BOOKS?|ICT\s*CORNER'
    r'|EVALUATION|INTERNET\s*RESOURCES?'
    # Exercise type headers
    r'|Choose\s+the\s+correct|Fill\s+in\s+the|Match\s+the|Answer\s+briefly|Answer\s+the\s+following'
    r'|Give\s+short|Write\s+in\s+detail|Short\s+answer|Long\s+answer'
    r'|Map\s+Work|(?:VII|VIII|IX|X)\s+\w'
    # ICT corner sub-headings
    r'|Steps?$|Website\s+URL'
    # Unit title repeated in ICT footer (only exact known patterns)
    r'|Outbreak\s+of\s+World\s+War'
    r'|\([a-z]\)\s'            # structural dividers like "(a) Causes", "(b) Course"
    # ── MATHEMATICS inline markers ────────────────────────────────────────────
    # These OCR headings appear in math chapters but belong to top-level arrays
    # (examples[], notes[], activities[]), NOT to sections[].subsections[].
    # Flagging them as "missing subsections" is always a false positive.
    r'|Example\s+\d+[\.-]\d+'     # Example 1.1, Example 1.23, Example 1-1
    r'|Solution$|Proof$|Construction$'  # follow-on to an Example
    r'|Activity\s*[-–]?\s*\d+'       # Activity - 1, Activity-3, Activity 2
    r'|Activity$'                        # bare "Activity" heading
    r'|Note$|Notes$'                     # Note callout boxes
    r'|Thinking\s+Corner'               # Thinking Corner boxes
    r'|Progress\s+Check'                # Progress Check boxes
    r'|Notation$'                        # Notation section (part of definition prose)
    r'|For\s+example[,.]?\s*$'         # "For example," inline signpost
    r'|Illustration\s+\d+'             # Illustration 1, Illustration 2 …
    r'|Definition$'                      # bare Definition box
    r'|Theorem\s+\d*|Corollary\s+\d*' # Theorem 1, Corollary
    r'|ICT\s+Corner$|ICT\s+CORNER$'    # ICT corners inside math sections
    r')',
    re.IGNORECASE,
)

# Once we see these headings, everything after is back-matter — stop collecting subsections
_BACK_MATTER_SENTINEL_RE = re.compile(
    r'^(?:SUMMARY|GLOSSARY|M\s*GLOSSARY|EVALUATION|REFERENCE\s*BOOKS?'
    r'|ICT\s*CORNER|INTERNET\s*RESOURCES?|EXERCISE)$',
    re.IGNORECASE,
)


def _scan_subsection_headings(unit_md: str) -> Dict[str, List[str]]:
    """
    Scan unit markdown and return {section_number: [sub_heading_title, ...]} for every
    N.M section found.

    CRITICAL: Handles ALL heading levels (H1/#, H2/##, H3/###) because OCR output uses
    them inconsistently within a single section. Any heading that does NOT start a new
    N.M numbered section is treated as a subsection of the current N.M parent.

    Stops collecting once back-matter (SUMMARY/GLOSSARY/EVALUATION/ICT CORNER) is hit —
    those headings belong to top-level unit fields, not section subsections.
    """
    lines = unit_md.split('\n')
    expected: Dict[str, List[str]] = {}
    current_section: Optional[str] = None
    in_back_matter = False

    section_re     = re.compile(r'^#+\s*(\d+\.\d+)(?:\.\d+)?\s+(.+)', re.IGNORECASE)
    any_heading_re = re.compile(r'^(#+)\s+(.+)')

    for line in lines:
        s = line.strip()
        if not s:
            continue

        m_sec = section_re.match(s)
        if m_sec:
            current_section = m_sec.group(1)
            in_back_matter = False          # reset on each new numbered section
            if current_section not in expected:
                expected[current_section] = []
            continue

        if current_section:
            m_h = any_heading_re.match(s)
            if m_h:
                title = m_h.group(2).strip()

                # Once back-matter sentinel is hit, stop collecting for this section
                if _BACK_MATTER_SENTINEL_RE.match(title):
                    in_back_matter = True
                if in_back_matter:
                    continue

                if (len(title) > 4
                        and not title.startswith('!')
                        and not re.match(r'^\d+$', title)
                        and not re.match(r'^#+\s*$', title)  # skip bare # OCR spacer lines
                        and title.strip('#').strip()
                        and not _SKIP_HEADING_RE.match(title)):
                    if title not in expected[current_section]:
                        expected[current_section].append(title)

    return expected


def _check_subsection_coverage(
    unit: Dict[str, Any],
    unit_md: str,
    unit_num: Optional[int],
    subject: str = "",
) -> List[str]:
    """
    Compare sub-headings found in content.md against subsections[] in the extracted unit.
    Returns a list of issue strings that will trigger targeted repair.

    Catches the classic chunk-split bug: section 1.4 is split across two chunks,
    chunk 1 extracts 1.4.1-1.4.4, the continuation note says "1.4 done", chunk 2
    skips all remaining 1.4 subsections (including H1-level ones like
    '# Takeover by the Bolshevik Party').

    Subject-aware: for mathematics, examples/notes/activities are stored in top-level
    arrays, not in subsections[], so those headings are never flagged as missing.
    """
    issues: List[str] = []
    if not unit_md or not unit_num:
        return issues

    # Mathematics uses top-level arrays for examples/notes/activities/thinking_corners.
    # The subsection coverage check is NOT meaningful for math chapters because
    # virtually all inline # headings (Example 1.1, Solution, Note, Activity-1 etc.)
    # belong to those top-level arrays, not to sections[].subsections[].
    # Running the check on math produces 100% false positives.
    if subject == "mathematics":
        return issues

    expected_by_section = _scan_subsection_headings(unit_md)

    # Build extracted subsection titles per section
    extracted_by_section: Dict[str, List[str]] = {}
    for sec in unit.get("sections", []):
        # Support both legacy (section_number) and auto-schema (id) formats
        snum = sec.get("section_number") or sec.get("id", "")
        if not snum or not re.match(r'^\d+\.\d+', str(snum)):
            continue
        # Extract N.M portion from id like "1.2" or "1.2_examples"
        m = re.match(r'(\d+\.\d+)', str(snum))
        if m:
            snum = m.group(1)
        extracted_by_section[snum] = [
            (sub.get("subsection_title") or sub.get("title") or "").strip()
            for sub in sec.get("subsections", sec.get("sub_items", []))
        ]

    def _norm(t: str) -> str:
        return re.sub(r'[^\w\s]', '', t.lower()).strip()

    for sec_num, expected_subs in expected_by_section.items():
        if len(expected_subs) < 2:
            continue  # too few sub-headings to be meaningful

        extracted_subs = extracted_by_section.get(sec_num, [])
        extracted_norm = {_norm(t) for t in extracted_subs}
        missing = [t for t in expected_subs if _norm(t) not in extracted_norm]

        if not missing:
            continue

        pct_present = int((len(expected_subs) - len(missing)) / len(expected_subs) * 100)
        if pct_present < 75:
            issues.append(
                f"Section {sec_num} is INCOMPLETE: {len(missing)}/{len(expected_subs)} "
                f"subsections missing. Missing: "
                + ", ".join(f"'{t}'" for t in missing[:6])
                + (" ..." if len(missing) > 6 else "")
                + " — likely caused by chunk-split or inconsistent OCR heading levels (#/##/###)."
            )

    return issues


# =============================================================================
# TARGETED SECTION REPAIR
# =============================================================================

def _extract_section_raw(unit_md: str, section_number: str) -> str:
    """
    Extract raw markdown for a specific N.M section: from its heading to the next N.M heading.
    Works even when internal sub-headings use H1 (#).
    """
    lines = unit_md.split('\n')
    sec_esc      = re.escape(section_number)
    sec_start_re = re.compile(r'^#+\s*' + sec_esc + r'(?:\s|$)', re.IGNORECASE)
    next_sec_re  = re.compile(r'^#+\s*\d+\.\d+(?:\s|$)', re.IGNORECASE)

    collecting = False
    collected: List[str] = []
    for line in lines:
        s = line.strip()
        if not collecting:
            if sec_start_re.match(s):
                collecting = True
                collected.append(line)
        else:
            if next_sec_re.match(s) and not sec_start_re.match(s):
                break
            collected.append(line)

    return '\n'.join(collected).strip()


def _re_extract_section(
    section_content: str,
    section_number: str,
    unit_number: int,
    subject: str,
    api_key: str,
    missing_subsections: Optional[List[str]] = None,
    model: str = "gpt-5-mini",
    timeout: int = 180,
) -> Optional[Dict[str, Any]]:
    """
    Re-extract a single N.M section via LLM, returning a clean JSON object with
    section_number, section_title, content, and subsections[].

    The system prompt explicitly handles mixed OCR heading levels and names the
    specific missing subsections so the LLM knows what it must include.
    """
    missing_hint = ""
    if missing_subsections:
        missing_hint = (
            f"\n⚠️  THESE SUBSECTIONS WERE MISSED PREVIOUSLY — they MUST appear in subsections[]:\n"
            + "\n".join(f"  - {t}" for t in missing_subsections)
            + "\n"
        )

    system_prompt = f"""You are an expert educational content extractor.

Extract section {section_number} from the textbook content below into a JSON object.

OUTPUT FORMAT:
{{
  "section_number": "{section_number}",
  "section_title": "<exact title from the {section_number} heading>",
  "content": "<any prose directly under the {section_number} heading before sub-headings>",
  "subsections": [
    {{
      "subsection_number": "{section_number}.1",
      "subsection_title": "<title from sub-heading>",
      "content": "<ALL paragraphs, lists, poems, quotes under this sub-heading>"
    }}
  ]
}}

CRITICAL RULES:
1. The OCR uses INCONSISTENT heading levels. Sub-headings may be #, ##, or ### — ALL of them
   are subsections of {section_number}. Do NOT stop at a sub-heading just because it uses #
   (H1) instead of ## (H2). Any heading that is NOT a new N.M numbered section (like 1.5,
   2.1, etc.) is a subsection of {section_number} — extract it.
2. Number subsections sequentially: {section_number}.1, {section_number}.2, etc.
3. The content of each subsection = ALL text under that heading until the NEXT heading.
4. Do NOT skip any heading. Do NOT merge headings. Every distinct heading → one subsection.
5. Return ONLY valid JSON. No markdown fences."""

    user_prompt = (
        f"Extract section {section_number} completely.\n"
        f"{missing_hint}\n"
        f"Remember: # (H1) headings inside this section are subsections too.\n\n"
        f"CONTENT:\n{section_content}"
    )

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "max_completion_tokens": 8192,
        "response_format": {"type": "json_object"},
    }

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers, json=payload, timeout=timeout
        )
        resp.raise_for_status()
        raw     = resp.json()["choices"][0]["message"]["content"]
        cleaned = re.sub(r'^```[a-z]*\n?', '', raw).strip().rstrip('`')
        result  = orjson.loads(cleaned.encode() if isinstance(cleaned, str) else cleaned)
        n_subs  = len(result.get("subsections", []))
        print(f"    📦 Repair got {n_subs} subsections for section {section_number}")
        return result
    except Exception as e:
        print(f"  ❌ [VerifyAgent] Section repair error: {e}")
        return None


def _is_auto_schema_unit(unit: Dict[str, Any]) -> bool:
    """Detect if unit uses auto-schema format (type/id) vs legacy (section_number)."""
    for sec in unit.get("sections", [])[:5]:
        if "type" in sec and "id" in sec:
            return True
    return False


def _legacy_to_auto_schema(repaired: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a legacy-format repaired section to auto-schema format."""
    section = {
        "type": "section",
        "id": repaired.get("section_number", ""),
        "title": repaired.get("section_title", ""),
        "content": repaired.get("content", ""),
        "metadata": {},
        "sub_items": [],
    }
    for sub in repaired.get("subsections", []):
        section["sub_items"].append({
            "number": sub.get("subsection_number", ""),
            "content": sub.get("content", ""),
        })
    return section


def _match_section_by_id(sections: List[Dict], section_number: str) -> int:
    """Find a section index matching section_number in either legacy or auto-schema format."""
    for i, sec in enumerate(sections):
        # Legacy format
        if sec.get("section_number") == section_number:
            return i
        # Auto-schema format: id might be "1.3" or "1.3_something"
        sec_id = str(sec.get("id", ""))
        if sec_id == section_number or sec_id.startswith(section_number + "_"):
            return i
        # Also check title for "1.3 Title" pattern
        sec_title = sec.get("title", "")
        if sec_title and sec_title.startswith(section_number + " "):
            return i
    return -1


def _merge_repaired_section(
    unit: Dict[str, Any],
    section_number: str,
    repaired: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Merge the repaired N.M section into the unit WITHOUT regressing existing data.

    Format-aware: handles both legacy (section_number/subsections) and
    auto-schema (type/id/sub_items) formats.

    Strategy:
    - Keep all existing subsections that already have good content.
    - Add subsections from the repair that are NOT already present (by normalized title).
    - Only upgrade an existing subsection if the repair has substantially more content (>20%).
    - Never replace a good subsection with an empty/shorter one.
    - Re-number sequentially after merge.
    """
    is_auto = _is_auto_schema_unit(unit)

    def _norm_title(t: str) -> str:
        t = re.sub(r"^\d+\.\s*", "", (t or "").lower())
        return re.sub(r"[^\w\s]", "", t).strip()

    repair_subs = repaired.get("subsections", [])
    sections = unit.get("sections", [])

    idx = _match_section_by_id(sections, section_number)

    if idx >= 0:
        sec = sections[idx]

        if is_auto:
            # Auto-schema: subsections go in sub_items
            existing_subs = sec.get("sub_items", [])
        else:
            existing_subs = sec.get("subsections", [])

        existing_norm = {
            _norm_title(s.get("subsection_title") or s.get("title") or s.get("content", "")[:40]): eidx
            for eidx, s in enumerate(existing_subs)
        }

        # Also build content fingerprint set — catches duplicates with different titles
        def _content_fp(c: str) -> str:
            c = re.sub(r'<!--.*?-->', '', (c or "")[:200]).strip()
            return re.sub(r'\s+', ' ', c)[:150]

        existing_fps = {
            _content_fp(s.get("content", ""))
            for s in existing_subs
            if (s.get("content") or "").strip()
        }

        additions: List[Dict[str, Any]] = []
        for rsub in repair_subs:
            rtitle_norm = _norm_title(rsub.get("subsection_title", ""))
            if not rtitle_norm:
                continue
            if rtitle_norm not in existing_norm:
                # Also check if the content already exists (different title, same text)
                repair_fp = _content_fp(rsub.get("content", ""))
                if repair_fp and repair_fp in existing_fps:
                    continue  # content already present, skip duplicate
                if is_auto:
                    additions.append({
                        "number": rsub.get("subsection_number", ""),
                        "content": rsub.get("content", ""),
                    })
                else:
                    additions.append(rsub)
                # Track the new content fingerprint too
                if repair_fp:
                    existing_fps.add(repair_fp)
            else:
                existing_idx = existing_norm[rtitle_norm]
                existing_content = existing_subs[existing_idx].get("content") or ""
                repair_content = rsub.get("content") or ""
                if len(repair_content) > len(existing_content) * 1.2:
                    if is_auto:
                        existing_subs[existing_idx] = {
                            "number": rsub.get("subsection_number", ""),
                            "content": repair_content,
                        }
                    else:
                        existing_subs[existing_idx] = rsub

        merged_subs = existing_subs + additions

        if is_auto:
            sec["sub_items"] = merged_subs
        else:
            for j, sub in enumerate(merged_subs, 1):
                sub["subsection_number"] = f"{section_number}.{j}"
            sec["subsections"] = merged_subs

        # Update title/content only if currently missing
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

    # Section not found — insert in sorted position
    if is_auto:
        new_section = _legacy_to_auto_schema(repaired)
    else:
        repair_subs_renum = repaired.get("subsections", [])
        for j, sub in enumerate(repair_subs_renum, 1):
            sub["subsection_number"] = f"{section_number}.{j}"
        repaired["subsections"] = repair_subs_renum
        new_section = repaired

    # Insert in sorted order by section_number/id
    inserted = False
    for i, sec in enumerate(sections):
        existing_snum = sec.get("section_number") or sec.get("id", "")
        try:
            if existing_snum and str(existing_snum) > section_number:
                sections.insert(i, new_section)
                inserted = True
                break
        except TypeError:
            pass
    if not inserted:
        sections.append(new_section)
    unit["sections"] = sections
    return unit


# =============================================================================
# LLM RE-EXTRACTION (full unit)
# =============================================================================

def _re_extract_unit(
    unit_content: str,
    unit_number: int,
    subject: str,
    api_key: str,
    issue_hint: str = "",
    model: str = "gpt-5-mini",
    timeout: int = 300,
) -> Optional[Dict[str, Any]]:
    """Use LLM to (re-)extract a full unit using the subject-specific extraction path."""
    if subject == "english" and api_key:
        try:
            from ocr_pipeline import (
                structure_unit_with_llm_chunked, Subject as PipelineSubject
            )
            result = structure_unit_with_llm_chunked(
                unit_content=unit_content,
                unit_number=unit_number,
                api_key=api_key,
                subject=PipelineSubject.ENGLISH,
                model=model,
                timeout=timeout,
            )
            if result:
                return result
        except Exception as e:
            print(f"  ⚠️  English re-extraction path failed: {e}, falling back to universal")

    system_prompt = (
        "You are an expert educational content extractor. "
        "Extract ALL content from this textbook unit into structured JSON."
    )
    user_prompt = f"Extract unit {unit_number}:\n\n{unit_content[:40000]}"

    if issue_hint:
        user_prompt = (
            f"⚠️  KNOWN ISSUES WITH PREVIOUS EXTRACTION — please fix:\n{issue_hint}\n\n"
        ) + user_prompt

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "max_completion_tokens": 16384,
        "response_format": {"type": "json_object"},
    }

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers, json=payload, timeout=timeout
        )
        resp.raise_for_status()
        raw     = resp.json()["choices"][0]["message"]["content"]
        cleaned = re.sub(r'^```[a-z]*\n?', '', raw).strip().rstrip('`')
        return orjson.loads(cleaned.encode() if isinstance(cleaned, str) else cleaned)
    except Exception as e:
        print(f"  ❌ [VerifyAgent] Re-extraction error: {e}")
        return None


# =============================================================================
# MAIN VERIFICATION AGENT
# =============================================================================

def run_verification_agent(
    structured_json_path: Path,
    content_md_path: Path,
    output_path: Optional[Path] = None,
    api_key: Optional[str] = None,
    subject: Optional[str] = None,
    auto_fix: bool = True,
    max_fixes: int = 5,
    expected_units: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """
    Main verification + correction agent.

    1. Loads structured.json + content.md
    2. Reads TOC to find expected units
    3. Identifies missing/incomplete units
    4. Optionally re-extracts them via LLM
    5. Saves corrected structured.json
    6. Returns a full verification report

    Args:
        structured_json_path: Path to structured.json
        content_md_path: Path to content.md (OCR output)
        output_path: Save target (defaults to overwriting structured.json)
        api_key: OpenAI API key
        subject: Subject hint ("english", "science", etc.)
        auto_fix: Whether to re-extract missing/broken units
        max_fixes: Max LLM calls for re-extraction
        expected_units: Optional list of unit numbers expected in this file.
                       If provided, TOC units NOT in this list are ignored.

    Returns:
        Report dict with success, unit coverage, issues found, fixes made
    """
    if not api_key:
        api_key = OPENAI_API_KEY_TEXT

    print(f"\n{'='*60}")
    print("  🔍 VERIFICATION AGENT — Checking extraction completeness")
    print(f"{'='*60}\n")

    # ── Load ───────────────────────────────────────────────────────────────────
    if not structured_json_path.exists():
        return {"error": f"structured.json not found: {structured_json_path}", "success": False}
    if not content_md_path.exists():
        return {"error": f"content.md not found: {content_md_path}", "success": False}

    structured_data = orjson.loads(structured_json_path.read_bytes())
    markdown = content_md_path.read_text(encoding="utf-8")

    units_key = "chapters" if "chapters" in structured_data else "units"
    extracted_units: List[Dict] = structured_data.get(units_key, [])

    # Detect subject
    if not subject:
        for u in extracted_units[:3]:
            s = u.get("subject")
            if s:
                subject = s
                break
    subject = subject or "unknown"

    print(f"  Subject : {subject}")
    print(f"  Extracted units: {len(extracted_units)}")

    # ── TOC comparison ─────────────────────────────────────────────────────────
    toc_units = extract_toc_units_from_markdown(markdown)

    # If this is a split-unit extraction (expected_units provided), filter the TOC.
    # This prevents the agent from flagging units that aren't in this specific file.
    if expected_units:
        # 1. Filter existing TOC units to only those in the expected list
        original_toc_len = len(toc_units)
        toc_units = [u for u in toc_units if u["number"] in expected_units]
        
        # 2. If TOC was not found or expected units were not in it, synthesize them
        # so we at least verify the internal completeness of what we expect.
        found_nums = {u["number"] for u in toc_units}
        for en in expected_units:
            if en not in found_nums:
                toc_units.append({"number": en, "title": f"Unit {en}", "type": "unit"})
        
        toc_units.sort(key=lambda x: x["number"])
        
        if original_toc_len > len(toc_units):
            print(f"  ℹ️  [VerifyAgent] Split-unit mode: filtering TOC to expected units {expected_units}")

    # ── Stamp-based sanity check ─────────────────────────────────────────────
    # PDFs carry indd printer stamps that encode the exact unit/chapter number.
    # Two formats:
    #   Format A (Geography/Science): "11_Geography_Unit_1_EM.indd" → unit 1
    #   Format B (Mathematics):       "1-SET LANGUAGE.indd 2"       → chapter 1
    # If the TOC parser returned multiple units but the stamp shows only one,
    # the TOC result is a false positive from a body-content numbered list.
    _stamp_unit = None

    # Format A: explicit Unit_N stamp
    _indd_unit_m = re.search(
        r'\d+_[A-Za-z]+_Unit_(\d+)_EM\.indd',
        markdown[:3000], re.IGNORECASE
    )
    if _indd_unit_m:
        _stamp_unit = int(_indd_unit_m.group(1))

    # Format B: chapter stamp  "N-CHAPTER TITLE.indd ..."
    if _stamp_unit is None:
        _ch_stamp_m = re.search(
            r'(?:^|\n)(\d+)-[A-Z][A-Z ]+\.indd\s+\d',
            markdown[:3000], re.MULTILINE
        )
        if _ch_stamp_m:
            _stamp_unit = int(_ch_stamp_m.group(1))

    # Body-text title quality check (subject-independent):
    # Real TOC titles are concise proper nouns. Exercise/body sentences contain
    # stop-words like "of", "the", "all", "in", "a", "an" or are lowercase.
    if toc_units and len(toc_units) > 1:
        _stop_re = re.compile(r'\b(of|the|in|a|an|all|from|for|by|to|at|on)\b', re.IGNORECASE)
        _body_like_count = sum(
            1 for u in toc_units
            if (len(u["title"]) > 50 or               # very long = body text
                u["title"][:1].islower() or            # lowercase start
                _stop_re.search(u["title"]))           # stop-word = body sentence
        )
        _body_like_ratio = _body_like_count / len(toc_units)
        if _body_like_ratio >= 0.5:
            # More than half the "TOC titles" look like body sentences
            # → this is not a real TOC, it's a numbered list in body text
            _real_sec_m = re.findall(r'(?:^|\n)#+\s*\d+\.\d+', markdown, re.MULTILINE)
            def __unit_num_inner(u): return u.get("unit_number") or u.get("chapter_number")
            _override_num = _stamp_unit or (
                __unit_num_inner(extracted_units[0]) if len(extracted_units) == 1 else None
            )
            if _override_num:
                toc_set = {u["number"] for u in toc_units}
                print(f"  ⚠️  [VerifyAgent] TOC list {sorted(toc_set)} looks like body-text "
                      f"sentences (stop-word ratio={_body_like_ratio:.0%}) — "
                      f"overriding TOC with chapter/unit {_override_num}")
                toc_units = [{"number": _override_num,
                              "title": f"Chapter/Unit {_override_num}",
                              "type": "unit"}]

    if _stamp_unit is not None and len(toc_units) > 1:
        real_unit_headers = set(int(m) for m in re.findall(
            r'(?:^|\n)#{1,3}\s*[Uu]nit\s*[-–]?\s*(\d+)', markdown
        ))
        toc_set = {u["number"] for u in toc_units}
        # If stamp unit is missing from TOC, or TOC has multiple numbers but
        # body only has one real unit/chapter header → TOC is wrong, override
        if _stamp_unit not in toc_set or len(real_unit_headers) <= 1:
            print(f"  ⚠️  [VerifyAgent] TOC list {sorted(toc_set)} appears to be a "
                  f"body-content list (stamp=Chapter/Unit {_stamp_unit}, "
                  f"real unit headers={real_unit_headers or {_stamp_unit}}) — "
                  f"overriding TOC with stamp")
            toc_units = [{"number": _stamp_unit,
                          "title": f"Chapter/Unit {_stamp_unit}",
                          "type": "unit"}]

    expected = {u["number"] for u in toc_units}

    def _unit_num(u: Dict) -> Optional[int]:
        return u.get("unit_number") or u.get("chapter_number")

    extracted_nums = {_unit_num(u) for u in extracted_units if _unit_num(u)}
    missing = expected - extracted_nums
    extra   = extracted_nums - expected

    toc_found = len(toc_units) > 0
    if missing:
        print(f"  ❌ MISSING units: {sorted(missing)}")
    if extra and toc_found:
        # Only warn about extra units when a real TOC was parsed.
        # No TOC → every extracted unit looks "extra" — that's a false positive.
        print(f"  ⚠️  Extra units (not in TOC): {sorted(extra)}")
    if not missing and (not extra or not toc_found):
        print(f"  ✅ All TOC units accounted for")

    # ── Section completeness ───────────────────────────────────────────────────
    unit_reports: List[Dict] = []
    for unit in extracted_units:
        n = _unit_num(unit)
        unit_md = extract_unit_markdown(markdown, n) if n else ""
        # Single-unit PDFs: "# Unit - 1" may appear before line-150 skip guard,
        # making extract_unit_markdown return empty. Fall back to full markdown.
        if not unit_md or len(unit_md) < 500:
            unit_md = markdown
        rpt = check_unit_completeness(unit, unit_md, subject)
        unit_reports.append(rpt)
        if rpt["issues"]:
            print(f"  ⚠️  Unit {n} — {len(rpt['issues'])} issue(s):")
            for issue in rpt["issues"]:
                print(f"       • {issue}")
        if rpt["warnings"]:
            for w in rpt["warnings"]:
                print(f"  ℹ️   Unit {n} — {w}")

    # ── Auto-fix ───────────────────────────────────────────────────────────────
    fixes = 0
    fixed_nums: List[int] = []

    # ── Step 0: Fill empty sections from content.md (cheap, no LLM needed) ──
    total_fills = 0
    if auto_fix:
        for i, unit in enumerate(extracted_units):
            updated_unit, fill_count = _fill_empty_sections_in_unit(unit, markdown)
            if fill_count > 0:
                extracted_units[i] = updated_unit
                total_fills += fill_count
        if total_fills > 0:
            print(f"  📥 Filled {total_fills} empty section(s) from content.md")

    if auto_fix and api_key:
        # 1. Re-extract completely missing units
        for toc_u in toc_units:
            n = toc_u["number"]
            if n not in extracted_nums and fixes < max_fixes:
                print(f"\n  🔧 Re-extracting missing Unit {n}: {toc_u['title']}")
                unit_md = extract_unit_markdown(markdown, n)
                if not unit_md or len(unit_md) < 500:
                    unit_md = markdown
                if len(unit_md) < 200:
                    print(f"  ⚠️  Not enough markdown for Unit {n} — skipping")
                    continue
                new_data = _re_extract_unit(unit_md, n, subject, api_key,
                                            issue_hint="This unit was completely missing.")
                if new_data:
                    inserted = False
                    for i, ex in enumerate(extracted_units):
                        if (_unit_num(ex) or 0) > n:
                            extracted_units.insert(i, new_data)
                            inserted = True
                            break
                    if not inserted:
                        extracted_units.append(new_data)
                    extracted_nums.add(n)
                    fixes += 1
                    fixed_nums.append(n)
                    print(f"  ✅ Unit {n} re-extracted")
                else:
                    print(f"  ❌ Failed to re-extract Unit {n}")

        # 2. Fix incomplete units — prefer targeted section repair over full re-extraction
        for i, rpt in enumerate(unit_reports):
            n = rpt["unit_number"]
            if not rpt["is_complete"] and fixes < max_fixes and n not in fixed_nums:
                print(f"\n  🔧 Fixing incomplete Unit {n}: {rpt['title'][:50]}")
                unit_md = extract_unit_markdown(markdown, n)
                if not unit_md or len(unit_md) < 500:
                    unit_md = markdown
                if len(unit_md) < 200:
                    continue

                # ── Targeted section repair ───────────────────────────────────
                # For each "Section N.M is INCOMPLETE" issue, re-extract just that
                # section's raw markdown and merge the missing subsections back in.
                # This is surgical — it preserves all other correctly extracted data.
                section_repaired = False
                for issue in rpt["issues"]:

                    # ── Handle MISSING gap sections ──────────────────────────────────────
                    # e.g. "Section 1.3 is MISSING (gap: 1.2 → 1.4). OCR heading has no..."
                    gap_match = re.search(
                        r'Section (\d+\.\d+) is MISSING \(gap: (\d+\.\d+) → (\d+\.\d+)\)',
                        issue
                    )
                    if gap_match:
                        missing_sec = gap_match.group(1)
                        after_sec   = gap_match.group(2)
                        before_sec  = gap_match.group(3)
                        gap_raw = _extract_unnumbered_section_raw(unit_md, after_sec, before_sec)
                        if not gap_raw or len(gap_raw) < 100:
                            print(f"    ⚠️  No content between {after_sec} and {before_sec} — skipping gap")
                            continue
                        print(f"    🔎 Gap repair: section {missing_sec} ")
                        print(f"      ({len(gap_raw):,} chars of unnumbered content between {after_sec}→{before_sec})")
                        repaired = _re_extract_section(
                            section_content=gap_raw,
                            section_number=missing_sec,
                            unit_number=n,
                            subject=subject,
                            api_key=api_key,
                            missing_subsections=None,
                        )
                        if repaired:
                            for j, ex in enumerate(extracted_units):
                                if _unit_num(ex) == n:
                                    original_part = ex.get("part")
                                    extracted_units[j] = _merge_repaired_section(
                                        extracted_units[j], missing_sec, repaired
                                    )
                                    if original_part and not extracted_units[j].get("part"):
                                        extracted_units[j]["part"] = original_part
                                    section_repaired = True
                                    subs_count = len(repaired.get("subsections", []))
                                    print(f"    ✅ Section {missing_sec} created ({subs_count} subs) in Unit {n}")
                                    break
                            fixes += 1
                            if n not in fixed_nums:
                                fixed_nums.append(n)
                        else:
                            print(f"    ❌ Gap repair for {missing_sec} returned no result")
                        if fixes >= max_fixes:
                            break
                        continue  # done with this issue

                    # ── Handle INCOMPLETE sections (original logic) ───────────────────────
                    sec_match = re.search(
                        r'Section (\d+\.\d+) is INCOMPLETE.*?Missing: (.+?)(?:\s\.\.\.|\s—|$)',
                        issue
                    )
                    if not sec_match:
                        continue
                    broken_sec    = sec_match.group(1)
                    missing_titles = re.findall(r"'([^']+)'", sec_match.group(2))

                    sec_raw = _extract_section_raw(unit_md, broken_sec)
                    if not sec_raw or len(sec_raw) < 100:
                        print(f"    ⚠️  No raw content for section {broken_sec} — skipping")
                        continue

                    print(f"    🔎 Targeted repair: section {broken_sec} "
                          f"({len(sec_raw):,} chars, {len(missing_titles)} known missing subs)")
                    repaired = _re_extract_section(
                        section_content=sec_raw,
                        section_number=broken_sec,
                        unit_number=n,
                        subject=subject,
                        api_key=api_key,
                        missing_subsections=missing_titles,
                    )
                    if repaired:
                        for j, ex in enumerate(extracted_units):
                            if _unit_num(ex) == n:
                                original_part = ex.get("part")
                                extracted_units[j] = _merge_repaired_section(
                                    extracted_units[j], broken_sec, repaired
                                )
                                if original_part and not extracted_units[j].get("part"):
                                    extracted_units[j]["part"] = original_part
                                section_repaired = True
                                print(f"    ✅ Section {broken_sec} repaired in Unit {n}")
                                break
                        fixes += 1
                        if n not in fixed_nums:
                            fixed_nums.append(n)
                    else:
                        print(f"    ❌ Section {broken_sec} repair returned no result")
                    if fixes >= max_fixes:
                        break

                if section_repaired:
                    # Re-evaluate completeness on the freshly repaired unit
                    repaired_unit = next(
                        (u for u in extracted_units if _unit_num(u) == n), None
                    )
                    if repaired_unit:
                        unit_reports[i] = check_unit_completeness(repaired_unit, unit_md, subject)
                    continue

                # ── Full unit re-extraction fallback ──────────────────────────
                hint     = '\n'.join(rpt["issues"])
                new_data = _re_extract_unit(unit_md, n, subject, api_key, issue_hint=hint)
                if new_data:
                    for j, ex in enumerate(extracted_units):
                        if _unit_num(ex) == n:
                            original_part = ex.get("part")
                            if original_part and not new_data.get("part"):
                                new_data["part"] = original_part
                            elif original_part and new_data.get("part") != original_part:
                                print(f"  ⚠️  Correcting re-extracted part "
                                      f"'{new_data.get('part')}' → '{original_part}'")
                                new_data["part"] = original_part
                            extracted_units[j] = new_data
                            fixes += 1
                            fixed_nums.append(n)
                            print(f"  ✅ Unit {n} fixed")
                            break

    # ── Sort + save ────────────────────────────────────────────────────────────
    extracted_units.sort(key=lambda u: _unit_num(u) or 999)
    structured_data[units_key] = extracted_units

    if output_path is None:
        output_path = structured_json_path

    output_path.write_bytes(orjson.dumps(structured_data, option=orjson.OPT_INDENT_2))
    print(f"\n  💾 [VerifyAgent] Saved → {output_path.name}")

    # ── Final report ───────────────────────────────────────────────────────────
    final_nums = {_unit_num(u) for u in structured_data.get(units_key, []) if _unit_num(u)}
    still_missing = expected - final_nums

    report = {
        "success": True,
        "subject": subject,
        "empty_sections_filled": total_fills,
        "toc_units_expected": sorted(expected),
        "extracted_before_fix": sorted(extracted_nums - set(fixed_nums)),
        "extracted_after_fix": sorted(final_nums),
        "missing_after_fix": sorted(still_missing),
        "fixes_made": fixes,
        "fixed_units": sorted(fixed_nums),
        "unit_reports": unit_reports,
        "is_complete": (len(still_missing) == 0
                        and all(r["is_complete"] for r in unit_reports
                                if r["unit_number"] in final_nums)
                        and (not extra or not toc_found)),
    }

    print(f"\n  📊 [VerifyAgent] FINAL SUMMARY")
    print(f"     TOC expected  : {sorted(expected)}")
    print(f"     After fix     : {sorted(final_nums)}")
    print(f"     Still missing : {sorted(still_missing) or 'none ✅'}")
    print(f"     Fixes made    : {fixes}")
    print(f"     Complete      : {'✅ YES' if report['is_complete'] else '⚠️  NO (check issues above)'}")

    return report


# =============================================================================
# LEGACY COMPATIBILITY
# =============================================================================

def detect_available_fields_in_markdown(unit_content: str) -> Set[str]:
    """Legacy: detect standard fields present in unit markdown."""
    available: Set[str] = set()
    checks = {
        "activities":          [r'(?:^|\n)#+\s*Activity[- ]?\d+'],
        "notes":               [r'(?:^|\n)#+\s*Note[:\s]', r'(?:^|\n)\*\*Note'],
        "exercises":           [r'(?:^|\n)#+\s*Exercise[- ]?\d+'],
        "learning_objectives": [r'(?:^|\n)#+\s*Learning\s+Objectives?'],
        "points_to_remember":  [r'(?:^|\n)#+\s*Points?\s+to\s+Remember',
                                r'(?:^|\n)#+\s*Summary'],
    }
    for field, patterns in checks.items():
        for p in patterns:
            if re.search(p, unit_content, re.IGNORECASE | re.MULTILINE):
                available.add(field)
                break
    return available


def check_for_missing_fields(unit: Dict, available: Set[str]) -> List[str]:
    """Legacy: check which available fields are missing in unit data."""
    field_checks = {
        "learning_objectives": lambda u: not u.get("learning_objectives"),
        "activities":          lambda u: not u.get("activities"),
        "notes":               lambda u: not u.get("notes"),
        "exercises":           lambda u: not u.get("exercises"),
        "points_to_remember":  lambda u: not u.get("points_to_remember"),
    }
    return [f for f, check in field_checks.items() if f in available and check(unit)]


def extract_activities_from_markdown(unit_content: str) -> List[Dict]:
    """Legacy: extract activities from markdown."""
    activities = []
    pat = re.compile(
        r'(?:^|\n)#+\s*Activity[- ]?(\d+)(.*?)(?=(?:^|\n)#+\s*Activity[- ]?\d+|\Z)',
        re.IGNORECASE | re.MULTILINE | re.DOTALL
    )
    for m in pat.finditer(unit_content):
        activities.append({
            "activity_number": int(m.group(1)),
            "title": None,
            "content": m.group(2).strip()[:2000],
        })
    return activities


def extract_notes_from_markdown(unit_content: str) -> List[Dict]:
    """Legacy: extract notes from markdown."""
    notes = []
    pat = re.compile(
        r'(?:^|\n)(?:#+\s*|\*\*)Note[:\s](.*?)(?=(?:^|\n)#+\s|\Z)',
        re.IGNORECASE | re.MULTILINE | re.DOTALL
    )
    for m in pat.finditer(unit_content):
        c = m.group(1).strip()
        if c:
            notes.append({"content": c[:1000]})
    return notes


def extract_exercises_from_markdown(unit_content: str) -> List[Dict]:
    """Legacy: extract exercises from markdown."""
    exercises = []
    pat = re.compile(
        r'(?:^|\n)#+\s*Exercise[- ]?(\d+\.?\d*)(.*?)(?=(?:^|\n)#+\s*Exercise|\Z)',
        re.IGNORECASE | re.MULTILINE | re.DOTALL
    )
    for m in pat.finditer(unit_content):
        exercises.append({"exercise_id": m.group(1).strip(), "title": None, "questions": []})
    return exercises


def merge_extracted_content(unit: Dict, extracted: Dict) -> Dict:
    """Legacy: merge extracted content into unit dict."""
    for field, value in extracted.items():
        if value is not None:
            if isinstance(value, list):
                if not unit.get(field):
                    unit[field] = value
            else:
                if not unit.get(field):
                    unit[field] = value
    return unit


def extract_unit_content_from_markdown(markdown: str, unit_number: int) -> Dict:
    """Legacy wrapper."""
    return {"unit_content": extract_unit_markdown(markdown, unit_number)}


def verify_and_extract_missing_content_with_llm(
    unit_content: str,
    missing_fields: List[str],
    unit_number: int,
    unit_title: str,
    api_key: str,
    model: str = "gpt-5-mini",
) -> Optional[Dict]:
    """Legacy: LLM extraction for specific missing fields."""
    if not api_key or not missing_fields:
        return None

    prompt = (
        f"From this textbook content (Unit {unit_number}: {unit_title}), "
        f"extract ONLY these fields: {', '.join(missing_fields)}.\n"
        f"Return JSON with those field names as keys.\n\n"
        f"Content:\n{unit_content[:15000]}\n\nReturn ONLY valid JSON."
    )
    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                
                "max_completion_tokens": 2000,
                "response_format": {"type": "json_object"},
            },
            timeout=120,
        )
        if resp.ok:
            raw = resp.json()["choices"][0]["message"]["content"]
            raw = re.sub(r'^```json\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
            raw_stripped = raw.strip()
            return orjson.loads(raw_stripped.encode() if isinstance(raw_stripped, str) else raw_stripped)
    except Exception as e:
        print(f"  ❌ [VerifyAgent legacy] LLM error: {e}")
    return None


def verify_and_correct_structured_json(
    structured_json_path: Path,
    content_md_path: Path,
    output_path: Optional[Path] = None,
    api_key: Optional[str] = None,
) -> bool:
    """Legacy-compatible wrapper. Calls run_verification_agent and returns bool."""
    result = run_verification_agent(
        structured_json_path=structured_json_path,
        content_md_path=content_md_path,
        output_path=output_path,
        api_key=api_key,
        auto_fix=True,
    )
    return result.get("success", False)


# =============================================================================
# STANDALONE ENTRY POINT
# =============================================================================

def main():
    """CLI entry point for the verification agent."""
    import argparse, sys
    parser = argparse.ArgumentParser(description="GradeUp Verification Agent")
    parser.add_argument("document_id", help="Document ID (folder name in outputs/)")
    parser.add_argument("--no-fix", action="store_true", help="Report only, don't re-extract")
    parser.add_argument("--max-fixes", type=int, default=5)
    parser.add_argument("--subject", default=None)
    args = parser.parse_args()

    try:
        from config import OUTPUTS_DIR, OPENAI_API_KEY_TEXT as KEY
    except ImportError:
        import os
        OUTPUTS_DIR = Path("outputs")
        KEY = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")

    doc_dir = Path(OUTPUTS_DIR) / args.document_id
    s_path = doc_dir / "structured.json"
    c_path = doc_dir / "content.md"

    if not s_path.exists() or not c_path.exists():
        print(f"Error: Missing files for '{args.document_id}' in {OUTPUTS_DIR}")
        sys.exit(1)

    report = run_verification_agent(
        structured_json_path=s_path,
        content_md_path=c_path,
        api_key=KEY,
        subject=args.subject,
        auto_fix=not args.no_fix,
        max_fixes=args.max_fixes,
    )

    rpt_path = doc_dir / "verification_report.json"
    rpt_path.write_bytes(orjson.dumps(report, option=orjson.OPT_INDENT_2))
    print(f"\n  📄 Report saved: {rpt_path}")
    sys.exit(0 if report.get("is_complete") else 1)


if __name__ == "__main__":
    main()