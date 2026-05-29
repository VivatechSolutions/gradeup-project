"""
pdf_unit_splitter.py  —  UNIVERSAL EDITION
==========================================
Splits ANY textbook PDF into individual unit/chapter PDFs.

Works for ALL subjects and textbook formats:
  • Science      — "Unit - N", "UNIT N", ".indd" stamps
  • Mathematics  — "Chapter N", "# ALGEBRA" (all-caps heading)
  • Social Sci.  — "Unit - N" across multiple parts (History, Geography …)
  • English      — "Unit - N" with prose/poem/supplementary sub-sections
  • Generic      — Roman numerals, numbered-list chapters, any fallback

Detection pipeline (in priority order):
  1. OCR markdown  (content.md)  — richest signal, zero extra API calls
  2. GPT mode      (OpenAI key)  — subject-aware LLM prompt per book
  3. Regex mode    (no API)      — multi-pattern fallback, always works

Usage (CLI):
    python pdf_unit_splitter.py --pdf 10th_Maths.pdf --subject mathematics
    python pdf_unit_splitter.py --pdf 9th_English.pdf --subject english
    python pdf_unit_splitter.py --pdf Social.pdf --subject social_science
    python pdf_unit_splitter.py --pdf Science.pdf --md content.md
    python pdf_unit_splitter.py --pdf any_book.pdf --mode regex

Environment:
    OPENAI_API_KEY or OPENAI_API_KEY_TEXT  — enables GPT detection
"""

from __future__ import annotations

import os
import re
import json
import time
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# Constants

GPT_MODEL = "gpt-4o-mini"

# How many pages to skip at the start when no OCR markdown is available.
# This is the MINIMUM front-matter estimate; the smart detector will
# push it forward automatically to skip the real TOC.
_DEFAULT_SKIP = 3

# Roman numeral mapping (for chapter-numbered books)
_ROMAN: Dict[str, int] = {
    "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6,
    "VII": 7, "VIII": 8, "IX": 9, "X": 10, "XI": 11, "XII": 12,
    "XIII": 13, "XIV": 14, "XV": 15,
}

# Subject-specific boundary-header patterns
# Each tuple: (compiled_regex, group_index_for_number)

# Patterns shared across ALL subjects
_UNIT_PATTERNS: List[Tuple[re.Pattern, int]] = [
    # "Unit - 3", "Unit – 3", "Unit-3", "Unit 3"  (most common TN format)
    (re.compile(r'(?<!\w)Unit\s*[-\u2013\u2014]?\s*(\d+)(?!\s*\.\s*\d)', re.IGNORECASE), 1),
    # "UNIT 6"  (all-caps plain text)
    (re.compile(r'^UNIT\s+(\d+)$', re.MULTILINE), 1),
]

_CHAPTER_PATTERNS: List[Tuple[re.Pattern, int]] = [
    # "Chapter 1", "# Chapter 1", "**Chapter 1**"
    (re.compile(r'(?:^|\n)\s*(?:#+\s*|\*{1,2})?Chapter\s+(\d+)\b', re.IGNORECASE), 1),
    # ".indd" stamp: "10th_Maths_Chapter 3_English.indd 1"
    (re.compile(r'\d+th_Maths_Chapter\s+(\d+)_English\.indd\s+1\b', re.IGNORECASE), 1),
]

_INDD_UNIT_PATTERNS: List[Tuple[re.Pattern, int]] = [
    # Science: "8th_Science_Unit-3_EM.indd 1"
    (re.compile(r'\d+th_Science_Unit-(\d+)_EM\.indd\s+1\b', re.IGNORECASE), 1),
    # English: "9th_English_Unit_2_" or "Class9_English_Unit_2"
    (re.compile(r'(?:\d+th_English|Class\d+_English).*Unit[_\s]?(\d+).*\.indd\s+1\b', re.IGNORECASE), 1),
    # Social Science
    (re.compile(r'\d+th_Social.*Unit[_\s]?(\d+).*\.indd\s+1\b', re.IGNORECASE), 1),
    # Generic indd: any subject
    (re.compile(r'\.indd\s+1\b.*Unit[_\s-]?(\d+)', re.IGNORECASE), 1),
    (re.compile(r'Unit[_\s-]?(\d+).*\.indd\s+1\b', re.IGNORECASE), 1),
]

# Pages that mention "unit/chapter" but are NOT unit starts
_NOISE_RE: List[re.Pattern] = [
    re.compile(r'Contents\s+Unit\s+Page', re.IGNORECASE),
    re.compile(r'Page\s*No\.\s*Month', re.IGNORECASE),
    re.compile(r'Unit\s+Page\s*No', re.IGNORECASE),
    re.compile(r'Unit\s+Contents\s+Page', re.IGNORECASE),
    re.compile(r'Table\s+of\s+Contents', re.IGNORECASE),
    re.compile(r'\|\s*Unit\s*\|', re.IGNORECASE),       # markdown table cell
    re.compile(r'^\|\s*\d+\s*\|', re.MULTILINE),        # TOC table row
]

# Subject → pattern set mapping


def _patterns_for_subject(subject: str) -> Tuple[List, str]:
    """
    Return (patterns_list, boundary_label) for a given subject.
    boundary_label is "chapter" for maths, "unit" for everything else.
    """
    s = subject.lower()
    if s == "mathematics":
        return _CHAPTER_PATTERNS + _UNIT_PATTERNS, "chapter"
    else:
        return _INDD_UNIT_PATTERNS + _UNIT_PATTERNS, "unit"

# 1. OCR Markdown detection  (BEST — uses pre-extracted text from Mistral OCR)

def _detect_from_markdown(
    md_path: str,
    subject: str,
    total_pdf_pages: int,
) -> List[Dict]:
    """
    Reads .indd page stamps which encode the FULL structure including part name:
        NN_Subject_Unit_N_EM.indd  PageNumber

    TN Social Science examples:
        01_History_Unit_1_EM.indd   1    -> History Unit 1  -> Unit_01_History.pdf
        11_Geography_Unit_1_EM.indd 128  -> Geography Unit 1 -> Unit_01_Geography.pdf
        Unit-1 HISTORY.indd 1            -> History Unit 1
        UNIT 1_Civics.indd 217           -> Civics Unit 1
        TN_GOVT_VIII_Std_Geography_Unit I_updated.indd 85 -> Geography Unit 1

    The part name is tracked by searching for top-level headers in content.md
    (e.g., # HISTORY) to handle cases where the indd stamp name is generic.
    """
    with open(md_path, encoding="utf-8") as f:
        content = f.read()
    lines = content.split("\n")

    _, label = _patterns_for_subject(subject)

    # 1. Flexible INDD pattern for Social Science parts and unit numbers
    #   Catches:
    #     01_History_Unit_1_EM.indd 1
    #     Unit-1 HISTORY.indd 1
    #     UNIT 1_Civics.indd 168
    #     Geography_Unit_1.indd 85
    #     TN_GOVT_VIII_Std_Geography_Unit I_updated.indd 85
    #     Univ-8 HISTORY.indd 80
    INDD_FLEXIBLE = re.compile(
        r'\b(?:.*?)'                           # optional prefix
        r'(History|Geography|Civics|Economics)' # Group 1: Part
        r'.*?Unit[_\s-]?([0-9IVXCL]+)'         # Group 2: Unit (supports digits or Roman)
        r'.*?\.indd\s+(\d+)',                  # Group 3: indd page number
        re.IGNORECASE
    )

    # Alternates where Unit comes first: Unit-1 HISTORY.indd 1
    INDD_UNIT_FIRST = re.compile(
        r'\bUnit[_\s-]?([0-9IVXCL]+)'          # Group 1: Unit
        r'.*?(History|Geography|Civics|Economics)' # Group 2: Part
        r'.*?\.indd\s+(\d+)',                  # Group 3: indd page number
        re.IGNORECASE
    )

    # 2. Part headers (e.g. # HISTORY)
    PART_HEADER = re.compile(r'^#\s+(HISTORY|GEOGRAPHY|CIVICS|ECONOMICS)\s*$', re.IGNORECASE)

    # Standard patterns for other subjects
    INDD_MATHS = re.compile(r'\b\d+th_Maths_Chapter\s+(\d+)_English\.indd\s+(\d+)', re.IGNORECASE)
    INDD_SCIENCE = re.compile(r'\b\d+th_Science_Unit-(\d+)_EM\.indd\s+(\d+)', re.IGNORECASE)
    INDD_ENGLISH = re.compile(r'\b(?:\d+th_English|Class\d+_English).*?Unit[_\s]?(\d+).*?\.indd\s+(\d+)', re.IGNORECASE)
    INDD_FRONT = re.compile(r'\b(?:00_Front|Front_Page|Cover|Prelim|Index|Content|TOC).*?\.indd\s+(\d+)', re.IGNORECASE)
    INDD_PLAIN_FRONT = re.compile(r'^PreliminaryT-Combine\.indd\s+(\d+)$', re.IGNORECASE)
    INDD_PLAIN_CHAPTER = re.compile(r'^(\d+)[-\s]([A-Za-z][A-Za-z0-9_ -]*)\.indd\s+(\d+)$', re.IGNORECASE)

    # Find page markers if available
    line_to_page: Dict[int, int] = {}
    current_page = 1
    has_page_markers = False
    for idx, line in enumerate(lines):
        m = re.match(r'^<!--\s*PAGE\s+(\d+)\s*-->', line.strip(), re.IGNORECASE)
        if m:
            current_page = int(m.group(1))
            has_page_markers = True
        line_to_page[idx] = current_page

    toc_end_idx = _find_toc_end_line(lines)

    # State tracking
    current_part = ""  # e.g., History, Geography
    part_unit_first_indd: Dict[tuple, Dict[str, int]] = {}
    front_matter_pages: List[int] = []

    # For Continuous format
    plain_chapter_first: Dict[int, Dict[str, int]] = {}
    plain_front_pages: List[int] = []

    def parse_u_num(s: str) -> int:
        s = s.upper()
        if s in _ROMAN: return _ROMAN[s]
        try: return int(s)
        except: return 1

    for idx, line in enumerate(lines):
        s = line.strip()
        if not s: continue

        # Header check: # HISTORY, # GEOGRAPHY ...
        mh = PART_HEADER.match(s)
        if mh:
            current_part = mh.group(1).capitalize()
            continue

        # Front matter (Patterns A-D style)
        mfm = INDD_FRONT.search(s)
        if mfm:
            front_matter_pages.append(int(mfm.group(1)))
            continue

        # Flexible Social Science / Generic with Part
        mflex = INDD_FLEXIBLE.search(s)
        if mflex:
            p_name  = mflex.group(1).capitalize()
            u_num   = parse_u_num(mflex.group(2))
            indd_pg = int(mflex.group(3))
            key     = (p_name, u_num)
            if key not in part_unit_first_indd:
                part_unit_first_indd[key] = {"indd": indd_pg, "pdf_pg": line_to_page.get(idx, 1)}
            continue

        muf = INDD_UNIT_FIRST.search(s)
        if muf:
            u_num   = parse_u_num(muf.group(1))
            p_name  = muf.group(2).capitalize()
            indd_pg = int(muf.group(3))
            key     = (p_name, u_num)
            if key not in part_unit_first_indd:
                part_unit_first_indd[key] = {"indd": indd_pg, "pdf_pg": line_to_page.get(idx, 1)}
            continue

        # Pattern F: continuous book-page numbering
        mpf = INDD_PLAIN_FRONT.match(s)
        if mpf:
            plain_front_pages.append(int(mpf.group(1)))
            continue

        mpc = INDD_PLAIN_CHAPTER.match(s)
        if mpc:
            ch_num   = int(mpc.group(1))
            book_pg  = int(mpc.group(3))
            if ch_num not in plain_chapter_first:
                plain_chapter_first[ch_num] = {"indd": book_pg, "pdf_pg": line_to_page.get(idx, 1)}
            continue

        # Traditional fixed-format patterns
        mmath = INDD_MATHS.search(s)
        if mmath:
            u_num, indd_pg = int(mmath.group(1)), int(mmath.group(2))
            key = (current_part, u_num)
            if key not in part_unit_first_indd:
                part_unit_first_indd[key] = {"indd": indd_pg, "pdf_pg": line_to_page.get(idx, 1)}
            continue

        msci = INDD_SCIENCE.search(s)
        if msci:
            u_num, indd_pg = int(msci.group(1)), int(msci.group(2))
            key = (current_part, u_num)
            if key not in part_unit_first_indd:
                part_unit_first_indd[key] = {"indd": indd_pg, "pdf_pg": line_to_page.get(idx, 1)}
            continue

        meng = INDD_ENGLISH.search(s)
        if meng:
            u_num, indd_pg = int(meng.group(1)), int(meng.group(2))
            key = (current_part, u_num)
            if key not in part_unit_first_indd:
                part_unit_first_indd[key] = {"indd": indd_pg, "pdf_pg": line_to_page.get(idx, 1)}
            continue

        # Fallback: catch generic "Unit X.indd" and use current_part
        mgen = re.search(r'Unit[_\s-]?([0-9IVX]+).*?\.indd\s+(\d+)', s, re.IGNORECASE)
        if mgen:
            u_num   = parse_u_num(mgen.group(1))
            indd_pg = int(mgen.group(2))
            key     = (current_part, u_num)
            if key not in part_unit_first_indd:
                part_unit_first_indd[key] = {"indd": indd_pg, "pdf_pg": line_to_page.get(idx, 1)}
            continue

    # ── Pattern F result: plain continuous-page-number format ──────────────────
    # Require ≥2 chapters found (to avoid false matches on other book formats)
    if len(plain_chapter_first) >= 2 and plain_front_pages:
        front_matter_pdf = max(plain_front_pages)
        print(f"  \U0001f4d6 [MD-F] Found {len(plain_chapter_first)} chapter(s) "
              f"(plain continuous-page format)")
        print(f"  \U0001f4cb Front matter = {front_matter_pdf} pages (PreliminaryT-Combine)")

        boundaries: List[Dict] = []
        for ch_num, data in sorted(plain_chapter_first.items()):
            book_pg, pdf_pg = data["indd"], data["pdf_pg"]
            if has_page_markers:
                pdf_idx = max(0, min(pdf_pg - 1, total_pdf_pages - 1))
            else:
                pdf_idx = max(0, min(front_matter_pdf + book_pg - 1, total_pdf_pages - 1))
            
            title   = f"{label.capitalize()}_{ch_num}"
            display = f"{label.capitalize()} {ch_num}"
            boundaries.append({
                "page_idx":    pdf_idx,
                "page_number": pdf_idx + 1,
                "unit_number": ch_num,
                "part":        "",
                "title":       title,
                "source":      "md_indd_exact" if has_page_markers else "md_indd",
            })
            if has_page_markers:
                print(f"    {display}: exact PDF page {pdf_idx + 1}")
            else:
                print(f"    {display}: book page {book_pg} \u2192 PDF page {pdf_idx + 1}")

        return boundaries

    # Front matter size = largest indd page number seen in front-matter stamps
    front_matter_pdf = max(front_matter_pages, default=0)

    indd_boundaries: List[Dict] = []
    if part_unit_first_indd:
        parts_found = sorted(set(p for p, _ in part_unit_first_indd if p))
        total_found = len(part_unit_first_indd)
        parts_str   = f" across parts: {parts_found}" if parts_found else ""
        print(f"  📖 [MD] Found {total_found} unit(s) via .indd stamps{parts_str}")
        if not has_page_markers:
            print(f"  📑 Front matter = {front_matter_pdf} indd pages")

        for (part_name, u_num), data in sorted(
            part_unit_first_indd.items(), key=lambda x: x[1]["indd"]
        ):
            indd_pg, pdf_pg = data["indd"], data["pdf_pg"]
            if has_page_markers:
                pdf_idx = max(0, min(pdf_pg - 1, total_pdf_pages - 1))
            else:
                pdf_idx = max(0, min(front_matter_pdf + (indd_pg - 1), total_pdf_pages - 1))

            if part_name:
                title   = f"{part_name}_Unit_{u_num}"
                display = f"{part_name} Unit {u_num}"
            else:
                title   = f"{label.capitalize()}_{u_num}"
                display = f"{label.capitalize()} {u_num}"

            indd_boundaries.append({
                "page_idx":    pdf_idx,
                "page_number": pdf_idx + 1,
                "unit_number": u_num,
                "part":        part_name,
                "title":       title,
                "source":      "md_indd_exact" if has_page_markers else "md_indd",
            })
            if has_page_markers:
                print(f"    {display}: exact PDF page {pdf_idx + 1}  [md_indd_exact]")
            else:
                print(f"    {display}: indd page {indd_pg} → PDF page {pdf_idx + 1}  [md_indd]")

    # Get fallback boundaries from page markers or headers
    fallback_boundaries: List[Dict] = []
    if has_page_markers:
        # Don't print the info message if we already found some indd boundaries
        if not indd_boundaries:
            print("  ℹ️  [MD] No .indd stamps found — using <!-- PAGE N --> markers for exact mapping...")
        fallback_boundaries = _detect_from_markdown_page_markers(content, lines, subject, total_pdf_pages)
    else:
        if not indd_boundaries:
            print("  ℹ️  [MD] No .indd stamps found — scanning markdown headers...")
        fallback_boundaries = _detect_from_markdown_headers(lines, subject, total_pdf_pages)

    if not indd_boundaries:
        return fallback_boundaries

    # Merge: keep all indd_boundaries, and add any fallback boundaries whose unit_number is not in indd_boundaries
    existing_u_nums = {b["unit_number"] for b in indd_boundaries}
    
    merged_boundaries = list(indd_boundaries)
    for fb in fallback_boundaries:
        if fb["unit_number"] not in existing_u_nums:
            fb_copy = dict(fb)
            # Try to inherit 'part' from the nearest previous indd_boundary
            prev_indd = [b for b in indd_boundaries if b["page_idx"] <= fb["page_idx"]]
            if prev_indd and prev_indd[-1].get("part"):
                fb_copy["part"] = prev_indd[-1]["part"]
                fb_copy["title"] = f"{fb_copy['part']}_Unit_{fb_copy['unit_number']}"
            elif fb_copy.get("part") is None:
                fb_copy["part"] = ""
            
            merged_boundaries.append(fb_copy)
            print(f"  ➕ Merged missing unit {fb_copy['unit_number']} from fallback (PDF page {fb_copy['page_number']})")
    
    # Sort by page index
    merged_boundaries.sort(key=lambda x: x["page_idx"])
    return merged_boundaries

def _build_toc_title_map(markdown: str) -> Dict[str, int]:
    """Build {TITLE_UPPER: chapter_number} from the TOC for all-caps math headers."""
    lines = markdown.split("\n")
    result: Dict[str, int] = {}
    toc_start = None
    for i, line in enumerate(lines[:400]):
        s = line.strip().upper()
        if s in ("CONTENT", "CONTENTS", "TABLE OF CONTENTS",
                 "# CONTENT", "# CONTENTS", "## CONTENT", "## CONTENTS"):
            toc_start = i
            break
    if toc_start is None:
        return result
    table_row = re.compile(r"^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|")
    for line in lines[toc_start: toc_start + 200]:
        m = table_row.match(line)
        if m:
            n = int(m.group(1))
            title = m.group(2).strip()
            if 1 <= n <= 50 and title:
                result[title.upper()] = n
    return result


def _detect_from_markdown_page_markers(
    content: str,
    lines: List[str],
    subject: str,
    total_pdf_pages: int,
) -> List[Dict]:
    """
    Exact page detection using <!-- PAGE N --> markers injected by ocr_pipeline.

    When the OCR pipeline writes `<!-- PAGE N -->` at the start of each page,
    we know exactly which PDF page each line belongs to — no estimation needed.
    """
    patterns, label = _patterns_for_subject(subject)

    # Build a line-number → PDF page mapping
    line_to_page: Dict[int, int] = {}
    current_page = 1
    for idx, line in enumerate(lines):
        m = re.match(r'^<!-- PAGE (\d+) -->', line.strip())
        if m:
            current_page = int(m.group(1))
        line_to_page[idx] = current_page

    # Detect the TOC end so we skip it
    toc_end_line = _find_toc_end_line(lines)

    found: Dict[int, Dict] = {}  # u_num → {line_idx, pdf_page}

    for idx, line in enumerate(lines):
        if idx < toc_end_line:
            continue
        s = line.strip()
        if not s or s.startswith('<!--'):
            continue

        for pat, grp in patterns:
            m = pat.search(s)
            if m:
                try:
                    u_num = int(m.group(grp))
                    if 1 <= u_num <= 50 and u_num not in found:
                        found[u_num] = {
                            "line_idx": idx,
                            "pdf_page": line_to_page.get(idx, 1),
                        }
                except (ValueError, IndexError):
                    pass
                break

    if not found:
        return []

    boundaries = []
    prev_pdf_idx = -1
    for u_num in sorted(found):
        pdf_page = found[u_num]["pdf_page"]
        pdf_idx  = max(0, min(pdf_page - 1, total_pdf_pages - 1))
        if pdf_idx <= prev_pdf_idx:
            pdf_idx = prev_pdf_idx + 1
        prev_pdf_idx = pdf_idx
        title = f"{label.capitalize()} {u_num}"
        boundaries.append({
            "page_idx":    pdf_idx,
            "page_number": pdf_idx + 1,
            "unit_number": u_num,
            "title":       title,
            "source":      "md_page_markers",
        })
        print(f"    {label.capitalize()} {u_num}: PDF page {pdf_idx + 1} (exact, from page marker at line {found[u_num]['line_idx']})")

    return boundaries


def _find_toc_end_line(lines: List[str]) -> int:
    """
    Find the last line of the Table of Contents section.

    The TOC typically appears in the first 10% of the markdown and contains
    repeated chapter/unit numbers alongside page numbers. We skip it to avoid
    TOC entries being mistaken for real chapter boundaries.

    Returns the 0-based line index of the first line AFTER the TOC
    (i.e., safe to start scanning from this index).
    """
    total_lines = len(lines)
    # Only look in the first 15% of the document
    search_limit = max(50, int(total_lines * 0.15))

    toc_heading_re = re.compile(
        r'(Table\s+of\s+Contents|Contents|CONTENTS|# Contents|## Contents'
        r'|CONTENT|# CONTENT)',
        re.IGNORECASE,
    )
    toc_row_re = re.compile(
        r'(\bChapter\s+\d+|\bUnit\s*[-\u2013]?\s*\d+).*\d{1,3}\s*$',
        re.IGNORECASE,
    )
    table_row_re = re.compile(r'^\|.*\|')

    toc_start = None
    last_toc_line = 0

    for i, line in enumerate(lines[:search_limit]):
        s = line.strip()
        if toc_heading_re.search(s):
            toc_start = i
            last_toc_line = i
            continue
        if toc_start is not None:
            if toc_row_re.search(s) or table_row_re.match(s):
                last_toc_line = i
            # If we've gone 80 lines past the TOC heading with no more TOC rows,
            # the TOC is definitely over.
            elif i - last_toc_line > 80:
                break

    return last_toc_line + 1 if toc_start is not None else 0


def _detect_from_markdown_headers(
    lines: List[str],
    subject: str,
    total_pdf_pages: int,
) -> List[Dict]:
    """
    Fallback: estimate PDF page positions from markdown header positions.

    KEY FIXES vs. previous version
    ───────────────────────────────
    1. TOC skip: we detect the Table of Contents section and skip it entirely.
       Previously the TOC "Chapter N" entries were matched first (small line
       index → small page estimate) and the real chapter headers were silently
       ignored because of the `u_num not in found` guard.  This caused chapters
       3, 5, etc. to map to wrong (too-early) pages.

    2. Last-occurrence wins within TOC window: after skipping the TOC, we still
       prefer the LAST match for each chapter number among all non-TOC matches,
       because chapter titles sometimes appear in sub-headings just before the
       real splash page.  Actually, we use the FIRST match AFTER the TOC skip
       window, which is the true chapter start.

    3. Monotonicity enforcement: boundaries must be strictly increasing.
       If estimated page N for chapter C+1 is ≤ page N for chapter C (can happen
       with uneven line density), we push it forward by 1 page.
    """
    patterns, label = _patterns_for_subject(subject)
    title_map = {}
    if subject == "mathematics":
        title_map = _build_toc_title_map("\n".join(lines))

    # Also match all-caps H1 for math
    allcaps_re = re.compile(r"^#+\s+([A-Z][A-Z\s\-&,]{3,}[A-Z])$")

    total_lines = len(lines)

    # ── Step 1: find the end of the TOC so we can skip it ────────────────────
    toc_end_line = _find_toc_end_line(lines)
    if toc_end_line > 0:
        print(f"  ℹ️  [MD] Skipping TOC section (lines 0–{toc_end_line - 1})")

    # ── Step 2: scan for chapter/unit headers, TOC-excluded ──────────────────
    # We collect ALL matches per unit_number (list of line indices) so we can
    # choose the best one rather than blindly keeping the first.
    all_matches: Dict[int, List[Dict]] = {}  # u_num → list of {line_idx, title}

    for idx, line in enumerate(lines):
        if idx < toc_end_line:
            continue  # skip TOC
        s = line.strip()
        if not s:
            continue

        # All-caps math chapter heading (e.g. "# SET LANGUAGE")
        if subject == "mathematics":
            m = allcaps_re.match(s)
            if m:
                header = m.group(1).strip()
                num = title_map.get(header)
                if num and 1 <= num <= 50:
                    all_matches.setdefault(num, []).append(
                        {"line_idx": idx, "title": header.title()}
                    )
                    continue

        # Standard chapter / unit patterns
        for pat, grp in patterns:
            m = pat.search(s)
            if m:
                try:
                    u_num = int(m.group(grp))
                    if 1 <= u_num <= 50:
                        # Use the matched text to build a clean title
                        title = f"{label.capitalize()} {u_num}"
                        all_matches.setdefault(u_num, []).append(
                            {"line_idx": idx, "title": title}
                        )
                except (ValueError, IndexError):
                    pass
                break  # stop at first matching pattern per line

    if not all_matches:
        return []

    # ── Step 3: choose the best (first post-TOC) match for each unit ─────────
    # The first match after the TOC is the actual chapter splash header.
    # We intentionally do NOT use the last match because later references
    # (e.g., inside exercises, ICT corners) would push the boundary too far.
    found: Dict[int, Dict] = {}
    for u_num, matches in all_matches.items():
        # Already sorted by line_idx (we iterated top-to-bottom)
        found[u_num] = matches[0]

    # ── Step 4: convert line positions → estimated PDF page indices ───────────
    # Line-fraction → page is imprecise (math pages have few lines, text pages
    # have many). We apply two corrections:
    #   a) Monotonicity: chapter N+1 must start after chapter N
    #   b) Minimum spacing: adjacent chapters must be ≥ 1 page apart
    boundaries = []
    prev_pdf_idx = -1

    for u_num in sorted(found):
        line_frac = found[u_num]["line_idx"] / max(total_lines, 1)
        pdf_idx = int(line_frac * total_pdf_pages)
        pdf_idx = max(0, min(pdf_idx, total_pdf_pages - 1))

        # Enforce monotonicity
        if pdf_idx <= prev_pdf_idx:
            pdf_idx = prev_pdf_idx + 1
        pdf_idx = min(pdf_idx, total_pdf_pages - 1)
        prev_pdf_idx = pdf_idx

        boundaries.append({
            "page_idx":    pdf_idx,
            "page_number": pdf_idx + 1,
            "unit_number": u_num,
            "title":       found[u_num]["title"],
            "source":      "md_headers",
        })
        print(f"    {label.capitalize()} {u_num}: estimated PDF page {pdf_idx + 1} (header at line {found[u_num]['line_idx']})")

    return boundaries


# ─────────────────────────────────────────────────────────────────────────────
# 2. Regex detection  (medium quality — no API)
# ─────────────────────────────────────────────────────────────────────────────

def _is_noise_page(text: str) -> bool:
    """Return True if this page is TOC/front-matter and NOT a unit splash page."""
    return any(p.search(text) for p in _NOISE_RE)


def _find_front_matter_end(page_texts: List[str]) -> int:
    """
    Smartly detect where front matter ends by finding the last page
    that looks like a TOC or introduction (within first 20% of book).
    Returns a 0-based page index (first "real" content page).
    """
    limit = max(_DEFAULT_SKIP, len(page_texts) // 5)
    last_fm = _DEFAULT_SKIP
    toc_re = re.compile(
        r'(Table\s+of\s+Contents|Contents|Preface|Foreword|Introduction'
        r'|Unit\s+Page\s+No|Unit\s+Contents|Page\s+No\.)',
        re.IGNORECASE
    )
    for i in range(min(limit, len(page_texts))):
        text = page_texts[i]
        if toc_re.search(text):
            last_fm = i + 1  # skip past this page
    return last_fm


def regex_detect_boundaries(
    page_texts: List[str],
    subject: str,
    front_matter_pages: Optional[int] = None,
) -> List[Dict]:
    """
    Detect unit/chapter start pages using multi-pattern regex.
    Handles: Unit - N, Chapter N, UNIT N, .indd stamps, Roman numerals.
    """
    patterns, label = _patterns_for_subject(subject)

    if front_matter_pages is None:
        front_matter_pages = _find_front_matter_end(page_texts)

    print(f"  [Regex] Skipping first {front_matter_pages} page(s) as front matter")

    seen: set = set()
    boundaries: List[Dict] = []

    for i in range(front_matter_pages, len(page_texts)):
        text = page_texts[i]
        if not text:
            continue
        if _is_noise_page(text):
            continue

        # Try each pattern
        for pat, grp in patterns:
            m = pat.search(text)
            if m:
                try:
                    u_num = int(m.group(grp))
                except (ValueError, IndexError):
                    continue
                if 1 <= u_num <= 50 and u_num not in seen:
                    # Sanity: a fresh unit splash should have very few lines
                    # OR the pattern match should be near the top of the page
                    line_pos = text.find(m.group(0))
                    page_len = len(text)
                    is_top_of_page = line_pos < page_len * 0.4

                    if is_top_of_page or len(text.split('\n')) < 20:
                        seen.add(u_num)
                        title = f"{label.capitalize()} {u_num}"
                        print(f"    Page {i+1}: ✓ {title.upper()} (regex, pattern={pat.pattern[:30]}…)")
                        boundaries.append({
                            "page_idx":    i,
                            "page_number": i + 1,
                            "unit_number": u_num,
                            "title":       title,
                            "source":      "regex",
                        })
                        break  # stop at first matching pattern for this page

    return sorted(boundaries, key=lambda x: x["page_idx"])


# ─────────────────────────────────────────────────────────────────────────────
# 3. GPT detection  (high quality — requires OpenAI key)
# ─────────────────────────────────────────────────────────────────────────────

def _call_openai(prompt: str, api_key: str, max_tokens: int = 120) -> str:
    try:
        from openai import OpenAI
    except ImportError:
        raise ImportError("openai not installed: pip install openai")
    client = OpenAI(api_key=api_key)
    resp = client.chat.completions.create(
        model=GPT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0,
    )
    return resp.choices[0].message.content.strip()


def _build_gpt_prompt(subject: str, page_num: int, prev_ctx: str, snippet: str) -> str:
    """Build a subject-adaptive GPT prompt for unit/chapter boundary detection."""
    s = subject.lower()

    if s == "mathematics":
        boundary_name = "chapter"
        examples = (
            '"Chapter 1", "# Chapter 2", "**Chapter 3**", '
            '"# ALGEBRA", "# TRIGONOMETRY" (all-caps chapter title as H1)'
        )
        not_examples = (
            "a Table of Contents, an exercise page, a definition box, "
            "a worked example, or any section that is INSIDE a chapter"
        )
    elif s == "english":
        boundary_name = "unit"
        examples = (
            '"Unit - 1", "Unit - 2", "Unit 3" (the splash/cover page of that unit, '
            'may also show a theme image or "Warm Up" section)'
        )
        not_examples = (
            "a Table of Contents, a Prose page, a Poem page, a Grammar exercise, "
            "a Supplementary page, or any page INSIDE a unit"
        )
    elif s == "social_science":
        boundary_name = "unit"
        examples = (
            '"Unit - 1", "Unit 1", "Unit - 12" — the page that opens a new unit, '
            'may also list Learning Objectives or show a part label '
            '(History / Geography / Civics / Economics)'
        )
        not_examples = (
            "a Table of Contents, a timeline, a map, an activity page, "
            "or a page that is clearly inside an existing unit"
        )
    else:  # science / default
        boundary_name = "unit"
        examples = (
            '"Unit - 1", "Unit-2", "UNIT 3" — the splash/opener page of a new unit. '
            'May also show learning objectives or a coloured header band.'
        )
        not_examples = (
            "a Table of Contents, an activity page, a 'Do You Know?' box, "
            "an exercise page, or a page clearly inside a unit"
        )

    return f"""You are analyzing pages from a school textbook (subject: {subject.upper()}).

Does the page below BEGIN a new {boundary_name.upper()} (i.e., is it the opening / splash page of {boundary_name} N)?

Signals that it IS a {boundary_name} start:
  - Contains a clear heading like {examples}
  - This heading is near the TOP of the page (first 40% of content)
  - Very little other content besides the heading and possibly a theme image

Signals that it is NOT a {boundary_name} start:
  - It is {not_examples}
  - The {boundary_name} heading appears only in passing (e.g. "see Unit 3 for…")

Previous page context:
---
{prev_ctx}
---

Current page (PDF page {page_num}):
---
{snippet}
---

Reply ONLY with compact JSON — no extra text:
{{"is_unit_start": true/false, "unit_number": <integer or null>, "title": "<string or null>"}}"""


def gpt_detect_boundaries(
    page_texts: List[str],
    subject: str,
    api_key: str,
    front_matter_pages: Optional[int] = None,
) -> List[Dict]:
    """
    Detect boundaries via GPT — subject-aware prompts, pre-filtered to candidate pages.
    """
    if front_matter_pages is None:
        front_matter_pages = _find_front_matter_end(page_texts)

    patterns, label = _patterns_for_subject(subject)

    # Pre-filter: only call GPT for pages that contain a possible keyword
    _keyword_re = re.compile(r'\b(unit|chapter|chap|chapt|part)\b', re.IGNORECASE)

    seen: set = set()
    boundaries: List[Dict] = []
    print(f"  [GPT] Subject={subject}, skipping {front_matter_pages} front-matter pages…")

    for i in range(front_matter_pages, len(page_texts)):
        text = page_texts[i]
        if not text or not _keyword_re.search(text):
            continue
        if _is_noise_page(text):
            continue

        prev_ctx = page_texts[i - 1][:300] if i > 0 else ""
        snippet = text[:800]

        prompt = _build_gpt_prompt(subject, i + 1, prev_ctx, snippet)

        result = {"is_unit_start": False, "unit_number": None, "title": None}
        for attempt in range(3):
            try:
                raw = _call_openai(prompt, api_key)
                raw = re.sub(r"```[a-z]*\n?", "", raw).strip().rstrip("`")
                result = json.loads(raw)
                break
            except Exception as e:
                if attempt == 2:
                    print(f"    [GPT error page {i+1}]: {e}")
                time.sleep(1)

        if result.get("is_unit_start"):
            u_num = result.get("unit_number")
            if u_num and int(u_num) not in seen:
                u_num = int(u_num)
                seen.add(u_num)
                title = result.get("title") or f"{label.capitalize()} {u_num}"
                print(f"    Page {i+1}: ✓ {label.upper()} {u_num} — \"{title}\" (GPT)")
                boundaries.append({
                    "page_idx":    i,
                    "page_number": i + 1,
                    "unit_number": u_num,
                    "title":       title,
                    "source":      "gpt",
                })
        else:
            pass  # silent for non-boundary pages

        time.sleep(0.05)  # gentle rate limit

    return sorted(boundaries, key=lambda x: x["page_idx"])


# ─────────────────────────────────────────────────────────────────────────────
# PDF text extraction
# ─────────────────────────────────────────────────────────────────────────────

def extract_page_texts(pdf_path: str) -> List[str]:
    """Extract text from every page of a PDF using pdfplumber."""
    try:
        import pdfplumber
    except ImportError:
        raise ImportError("pdfplumber not installed: pip install pdfplumber")
    texts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            texts.append((page.extract_text() or "").strip())
    print(f"  Extracted text from {len(texts)} PDF pages.")
    return texts


# ─────────────────────────────────────────────────────────────────────────────
# PDF splitting
# ─────────────────────────────────────────────────────────────────────────────

def _split_pdf(
    pdf_path: str,
    boundaries: List[Dict],
    output_dir: Path,
    total_pages: int,
    min_pages: int = 3,
    label: str = "unit",
) -> List[Dict]:
    """Write one PDF per unit/chapter based on boundary list."""
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError:
        raise ImportError("pypdf not installed: pip install pypdf")

    reader = PdfReader(pdf_path)
    results: List[Dict] = []

    for i, b in enumerate(boundaries):
        start = b["page_idx"]
        end = (boundaries[i + 1]["page_idx"] - 1) if i + 1 < len(boundaries) else (total_pages - 1)
        end = min(end, total_pages - 1)
        num_pages = end - start + 1

        if num_pages < min_pages:
            print(f"  {b.get('part','') or label.capitalize()} {b['unit_number']:>2}: ⚠️  only {num_pages} pages — skipped")
            continue

        u_num     = b["unit_number"]
        part_name = b.get("part", "")   # "History", "Geography", "" etc.

        # ── Build filename ────────────────────────────────────────────────────
        # If there's only one unit, keep the original filename.
        # Otherwise, use the standard Unit_NN_Title.pdf format.
        if len(boundaries) == 1:
            filename = Path(pdf_path).name
        elif part_name:
            filename = f"Unit_{u_num:02d}_{part_name}.pdf"
        else:
            clean_title = re.sub(r'[^\w\s-]', '', b.get("title", f"{label}_{u_num}")).strip()
            clean_title = re.sub(r'\s+', '_', clean_title)[:40]
            filename = f"{label.capitalize()}_{u_num:02d}_{clean_title}.pdf"

        out_path = output_dir / filename

        writer = PdfWriter()
        for pg_idx in range(start, end + 1):
            writer.add_page(reader.pages[pg_idx])

        with open(out_path, "wb") as f:
            writer.write(f)

        display = f"{part_name} Unit {u_num}" if part_name else f"{label.capitalize()} {u_num}"
        print(f"  ✅ {filename}  ({display}, {num_pages} pages, PDF pp {start+1}–{end+1})")
        results.append({
            "unit_number":      u_num,
            "part":             part_name,
            "title":            b.get("title", display),
            "pdf_start":        start,
            "pdf_end":          end,
            "start_page_label": start + 1,
            "end_page_label":   end + 1,
            "num_pages":        num_pages,
            "filename":         filename,
            "output_path":      str(out_path),
            "source":           b.get("source", "unknown"),
        })

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Post-process: fix boundary ordering and overlapping ranges
# ─────────────────────────────────────────────────────────────────────────────

def _validate_boundaries(boundaries: List[Dict], total_pages: int) -> List[Dict]:
    """
    Remove duplicates, sort by page, and collapse any boundaries that are
    too close together (< 2 pages apart → likely a false positive).
    """
    if not boundaries:
        return []

    # Deduplicate by (part, unit_number) — for social science, History Unit 1
    # and Geography Unit 1 are different boundaries with the same unit_number.
    seen_units: set = set()
    deduped = []
    for b in sorted(boundaries, key=lambda x: x["page_idx"]):
        key = (b.get("part", ""), b["unit_number"])
        if key not in seen_units:
            seen_units.add(key)
            deduped.append(b)

    # Remove boundaries that are suspiciously close to the previous one
    cleaned = [deduped[0]]
    for b in deduped[1:]:
        if b["page_idx"] - cleaned[-1]["page_idx"] >= 2:
            cleaned.append(b)
        else:
            print(f"  ⚠️  Dropping {b['title']} (page {b['page_number']}) — too close to previous boundary")

    return cleaned


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def _refine_boundaries_from_pdf(
    boundaries: List[Dict],
    pdf_path: str,
    total_pages: int,
    subject: str,
    window: int = 8,
) -> List[Dict]:
    """
    Refine md_headers-estimated page boundaries by scanning the actual PDF text.

    For each boundary estimated from line-fraction heuristics, we read PDF pages
    in a ±window range and look for the actual chapter/unit heading text.  If
    found, we replace the estimated page index with the exact one.

    This is the key fix for missing chapters: line-fraction estimation can be
    off by many pages in math textbooks (diagram pages have ~5 lines vs. ~50 for
    text pages), causing chapter starts to overlap and get collapsed by
    _validate_boundaries.
    """
    try:
        from pypdf import PdfReader
    except ImportError:
        return boundaries  # no pypdf → return as-is

    patterns, label = _patterns_for_subject(subject)
    reader = PdfReader(pdf_path)

    def _page_text(idx: int) -> str:
        try:
            return (reader.pages[idx].extract_text() or "").strip()
        except Exception:
            return ""

    def _matches_unit(text: str, u_num: int) -> bool:
        """True if `text` contains a heading for unit/chapter `u_num`."""
        for pat, grp in patterns:
            m = pat.search(text)
            if m:
                try:
                    if int(m.group(grp)) == u_num:
                        return True
                except (ValueError, IndexError):
                    pass
        return False

    refined = []
    for b in boundaries:
        if b.get("source") != "md_headers":
            refined.append(b)
            continue

        u_num    = b["unit_number"]
        est_idx  = b["page_idx"]

        # Search window: est ± window, clamped to valid range
        lo = max(0, est_idx - window)
        hi = min(total_pages - 1, est_idx + window)

        best_idx = None
        for pg in range(lo, hi + 1):
            text = _page_text(pg)
            if _matches_unit(text, u_num):
                best_idx = pg
                break  # take the first (earliest) matching page in the window

        if best_idx is not None and best_idx != est_idx:
            print(f"    ✅ {label.capitalize()} {u_num}: corrected page {est_idx + 1} → {best_idx + 1} (PDF text match)")
            b = dict(b)
            b["page_idx"]    = best_idx
            b["page_number"] = best_idx + 1
            b["source"]      = "md_headers+pdf_verified"
        elif best_idx is None:
            print(f"    ⚠️  {label.capitalize()} {u_num}: no PDF text match in window [{lo+1}–{hi+1}], keeping estimate p{est_idx+1}")

        refined.append(b)

    # Re-sort and enforce monotonicity after corrections
    refined.sort(key=lambda x: x["page_idx"])
    prev = -1
    for b in refined:
        if b["page_idx"] <= prev:
            b["page_idx"]    = prev + 1
            b["page_number"] = prev + 2
        prev = b["page_idx"]

    return refined


def split_pdf_by_units(
    pdf_path: str,
    md_path: Optional[str] = None,
    output_dir: str = "./Unit_split",
    subject: str = "english",
    min_pages: int = 3,
    unit_header_offset: int = 0,   # kept for backward compatibility (unused)
    mode: str = "auto",
) -> List[Dict]:
    """
    Split a textbook PDF into one PDF per unit/chapter.

    Detection priority (mode="auto"):
      1. content.md (Mistral OCR markdown)  — zero API cost, richest signal
      2. GPT-4o-mini                        — if OPENAI_API_KEY[_TEXT] is set
      3. Regex                              — always available, no API needed

    Args:
        pdf_path:    Path to input PDF.
        md_path:     Path to Mistral OCR content.md (highest priority when given).
        output_dir:  Directory to write split PDFs.
        subject:     "science" | "mathematics" | "social_science" | "english" | "auto"
        min_pages:   Skip units with fewer pages (avoids tiny false-positives).
        mode:        "auto" | "gpt" | "regex" | "md"

    Returns:
        List of dicts — one per split unit/chapter — with metadata + output_path.
    """
    try:
        from pypdf import PdfReader
    except ImportError:
        print("❌ pypdf not installed: pip install pypdf")
        return []

    pdf_path_str = str(pdf_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    total_pages = len(PdfReader(pdf_path_str).pages)
    _, label = _patterns_for_subject(subject)

    print(f"\n{'='*62}")
    print(f"  PDF Unit Splitter — UNIVERSAL EDITION")
    print(f"  Subject : {subject.upper()}")
    print(f"  PDF     : {Path(pdf_path_str).name}")
    print(f"  Pages   : {total_pages}")
    print(f"  Mode    : {mode}")
    print(f"{'='*62}")

    api_key = (
        os.environ.get("OPENAI_API_KEY_TEXT") or
        os.environ.get("OPENAI_API_KEY") or
        ""
    )

    boundaries: List[Dict] = []

    # ── Choose detection method ───────────────────────────────────────────────
    if mode == "md" or (md_path and mode == "auto"):
        print(f"\n[Detection] OCR markdown mode (content.md)")
        boundaries = _detect_from_markdown(md_path, subject, total_pages)

        # If markdown detection found nothing, cascade to next method
        if not boundaries:
            print("  ⚠️  Markdown detection found nothing — cascading to next method")
            mode = "auto"
            md_path = None  # prevent infinite loop

    if not boundaries and (mode == "gpt" or (api_key and mode == "auto")):
        print(f"\n[Detection] GPT-4o-mini mode (subject={subject})")
        page_texts = extract_page_texts(pdf_path_str)
        try:
            boundaries = gpt_detect_boundaries(page_texts, subject, api_key)
        except Exception as e:
            print(f"  ⚠️  GPT detection failed ({e}) — falling back to regex")
            boundaries = []

    if not boundaries:
        print(f"\n[Detection] Regex mode (multi-pattern, subject={subject})")
        page_texts = page_texts if "page_texts" in dir() else extract_page_texts(pdf_path_str)
        boundaries = regex_detect_boundaries(page_texts, subject)

    # ── Validate / clean ──────────────────────────────────────────────────────
    boundaries = _validate_boundaries(boundaries, total_pages)

    if not boundaries:
        print("\n  ❌ No unit/chapter boundaries detected!")
        print("  Tips:")
        print("    • Provide --md path/to/content.md  (from Mistral OCR)")
        print("    • Set OPENAI_API_KEY for smarter GPT detection")
        print("    • Try --mode regex")
        print("    • Check that your PDF has readable text (not image-only)")
        return []

    # ── Single unit → no split needed ─────────────────────────────────────────
    # If only 1 boundary is found, the entire PDF is already a single unit.
    # No need to create a split copy — the caller can use the original PDF directly.
    if len(boundaries) == 1:
        print(f"\n  ℹ️  Only 1 {label} boundary detected — PDF is already a single unit, no split needed.")
        return []

    # ── PDF verification pass (for md_headers only) ───────────────────────────
    # When boundaries came from line-fraction estimation (source="md_headers"),
    # scan ±8 pages around each estimate in the real PDF to find the exact page
    # where the chapter heading actually appears.  Fixes drift from uneven line
    # density (math diagram pages have very few lines, inflating the estimate).
    if any(b.get("source") == "md_headers" for b in boundaries):
        print("\n[Verification] Scanning PDF text to refine md_headers page estimates...")
        boundaries = _refine_boundaries_from_pdf(
            boundaries, pdf_path_str, total_pages, subject, window=8
        )

    print(f"\n  Detected {len(boundaries)} {label}(s):")
    for b in boundaries:
        print(f"    {label.capitalize()} {b['unit_number']:>2}: starts at PDF page {b['page_number']}  [{b.get('source','?')}]")

    # ── Split ─────────────────────────────────────────────────────────────────
    print(f"\n[Splitting] Writing to {out_dir}/")
    results = _split_pdf(pdf_path_str, boundaries, out_dir, total_pages, min_pages, label)

    manifest_path = out_dir / "unit_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n  ✅ Done! {len(results)} {label} PDFs → {out_dir}/")
    print(f"  📋 Manifest → unit_manifest.json")
    print(f"{'='*62}\n")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Split a textbook PDF into unit/chapter PDFs — works for ANY subject"
    )
    parser.add_argument("--pdf",      required=True,  help="Path to textbook PDF")
    parser.add_argument("--md",       default=None,   help="Path to Mistral OCR content.md (best accuracy)")
    parser.add_argument("--out",      default="./unit_splits", help="Output directory")
    parser.add_argument("--subject",  default="english",
                        choices=["science", "mathematics", "english", "social_science", "auto"],
                        help="Textbook subject (default: english)")
    parser.add_argument("--min-pages", type=int, default=3,
                        help="Skip units with fewer pages than this (default: 3)")
    parser.add_argument("--mode",     default="auto",
                        choices=["auto", "gpt", "regex", "md"],
                        help="Detection mode (default: auto)")
    args = parser.parse_args()

    results = split_pdf_by_units(
        pdf_path=args.pdf,
        md_path=args.md,
        output_dir=args.out,
        subject=args.subject,
        min_pages=args.min_pages,
        mode=args.mode,
    )

    if results:
        print(f"\nSplit complete — {len(results)} PDF(s):")
        for r in results:
            print(f"  {r['unit_number']:>2} | {r['num_pages']:>3}pp | "
                  f"PDF pp {r['start_page_label']}-{r['end_page_label']} | "
                  f"{r['filename']}  [{r.get('source','?')}]")
    else:
        print("\n⚠️  No splits produced.")