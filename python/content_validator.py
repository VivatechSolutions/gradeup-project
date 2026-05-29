"""
Content Validator — Deterministic Extraction Completeness Checker
=================================================================

No-LLM validation that compares content.md against structured.json
to find missing content. Acts as the safety net after extraction.

Phase 3 in the pipeline:
  Phase 1: Discover structure → Phase 2: Extract → Phase 3: VALIDATE → Phase 4: Fill gaps
"""

import re
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Set
from dataclasses import dataclass, field

try:
    import orjson
    _USE_ORJSON = True
except ImportError:
    _USE_ORJSON = False


# DATA TYPES

@dataclass
class ContentBlock:
    """A block of content from content.md"""
    heading: str
    text: str
    line_start: int
    line_end: int
    heading_level: int = 0  # 0 = paragraph, 1-6 = heading level

    @property
    def full_text(self) -> str:
        return f"{self.heading}\n{self.text}".strip()

    @property
    def word_count(self) -> int:
        return len(self.full_text.split())


@dataclass
class GapItem:
    """A content block that was not found in structured.json"""
    block: ContentBlock
    similarity: float  # best similarity score found (0-1)
    closest_section: Optional[str] = None  # title of closest match
    reason: str = ""


@dataclass
class ValidationReport:
    """Report from content validation"""
    is_complete: bool
    total_blocks: int
    matched_blocks: int
    unmatched_blocks: int
    gaps: List[GapItem] = field(default_factory=list)
    coverage_pct: float = 0.0
    section_types_found: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_complete": self.is_complete,
            "total_blocks": self.total_blocks,
            "matched_blocks": self.matched_blocks,
            "unmatched_blocks": self.unmatched_blocks,
            "coverage_pct": round(self.coverage_pct, 1),
            "section_types_found": self.section_types_found,
            "gaps": [
                {
                    "heading": g.block.heading,
                    "text_preview": g.block.text[:200].strip(),
                    "line_start": g.block.line_start,
                    "line_end": g.block.line_end,
                    "word_count": g.block.word_count,
                    "similarity": round(g.similarity, 2),
                    "closest_section": g.closest_section,
                    "reason": g.reason,
                }
                for g in self.gaps
            ],
            "warnings": self.warnings,
        }


# CONTENT PARSING
# Lines to skip during parsing (OCR noise, not real content)
_SKIP_PATTERNS = [
    re.compile(r'\.indd\s+\d+'),                         # page stamps
    re.compile(r'^\d{2}-\d{2}-\d{4}\s+\d{2}[:.]\d{2}'),  # timestamps
    re.compile(r'^!\[.*\]\(.*\)\s*$'),                    # image-only lines
    re.compile(r'^\d{2,3}\s*$'),                          # bare page numbers
    re.compile(r'^---+\s*$'),                             # horizontal rules
    re.compile(r'^\|\s*[-:]+'),                           # table separator rows
    re.compile(r'^<!--\s*PAGE\s+\d+\s*-->\s*$'),          # OCR page markers
]

# Blocks that are just unit/chapter titles — not real content to validate
_TRIVIAL_BLOCK_PATTERNS = [
    re.compile(r'^(unit|chapter|lesson)\s*[-–:]?\s*\d+$', re.IGNORECASE),
    re.compile(r'^(unit|chapter|lesson)\s*[-–:]?\s*\d+\s*[-–:]?\s*$', re.IGNORECASE),
    re.compile(r'^\d+\.\s*(unit|chapter|lesson)\s*$', re.IGNORECASE),
    re.compile(r'^(prose|poem|supplementary)\s*$', re.IGNORECASE),
]


def parse_content_md(content_md: str) -> List[ContentBlock]:
    """
    Parse content.md into a list of ContentBlocks.
    Each block is a heading + its following paragraphs until the next heading.
    """
    lines = content_md.split('\n')
    blocks: List[ContentBlock] = []
    current_heading = ""
    current_heading_level = 0
    current_text_lines: List[str] = []
    block_start = 0

    def _flush(i):
        nonlocal current_heading, current_text_lines, block_start
        text = '\n'.join(current_text_lines).strip()
        if current_heading or (text and len(text) > 20):
            blocks.append(ContentBlock(
                heading=current_heading,
                text=text,
                line_start=block_start,
                line_end=i - 1 if i > 0 else 0,
                heading_level=current_heading_level,
            ))
        current_heading = ""
        current_text_lines = []

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Skip noise lines
        if any(pat.search(stripped) for pat in _SKIP_PATTERNS):
            continue

        # Check for heading
        heading_match = re.match(r'^(#{1,6})\s+(.+)', stripped)
        if heading_match:
            _flush(i)
            current_heading = heading_match.group(2).strip()
            current_heading_level = len(heading_match.group(1))
            block_start = i
            continue

        # Check for bold heading (e.g. **Exercises**)
        bold_match = re.match(r'^\*\*(.+?)\*\*\s*$', stripped)
        if bold_match and len(bold_match.group(1)) < 80:
            _flush(i)
            current_heading = bold_match.group(1).strip()
            current_heading_level = 2
            block_start = i
            continue

        # Regular text line
        if stripped:
            current_text_lines.append(stripped)

    _flush(len(lines))

    return blocks


def parse_structured_json(structured: Dict[str, Any]) -> Tuple[List[str], Set[str]]:
    """
    Extract all text content and all section titles/IDs from structured.json.
    Returns (texts, titles).
    """
    texts: List[str] = []
    titles: Set[str] = set()

    def _extract_text(obj: Any, path: str = ""):
        if isinstance(obj, str) and len(obj.strip()) > 10:
            texts.append(obj.strip())
        elif isinstance(obj, list):
            for item in obj:
                _extract_text(item, path)
        elif isinstance(obj, dict):
            # Extract titles and IDs for structural validation
            for key in ("title", "id", "section_title", "subsection_title", "subsection_number"):
                val = obj.get(key)
                if isinstance(val, str) and val.strip():
                    titles.add(_normalize_text(val))

            # Extract content, title, and text fields for overlap validation
            for key in ("content", "title", "text", "explanation", "passage",
                        "instructions", "definition", "description", "aim",
                        "procedure", "observation", "meaning", "format_hints",
                        "model_answer"):
                val = obj.get(key)
                if isinstance(val, str) and len(val.strip()) > 10:
                    texts.append(val.strip())

            # Recurse into sub-structures
            for key in ("sections", "sub_items", "subsections", "questions",
                        "exercises", "activities", "stanzas", "words",
                        "glossary", "notes", "prose", "poetry", "grammar",
                        "vocabulary", "writing_tasks", "speaking_listening",
                        "reading_comprehension"):
                val = obj.get(key)
                if val:
                    _extract_text(val, f"{path}.{key}")

    _extract_text(structured)
    return texts, titles

# SIMILARITY MATCHING

def _normalize_text(text: str) -> str:
    """Normalize text for comparison."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)  # remove punctuation
    text = re.sub(r'\s+', ' ', text)      # collapse whitespace
    return text.strip()


def _word_set(text: str) -> set:
    """Convert text to a set of significant words (>2 chars)."""
    words = _normalize_text(text).split()
    return {w for w in words if len(w) > 2}


def _similarity(text1: str, text2: str) -> float:
    """
    Compute word-overlap similarity between two texts.
    Returns 0-1 where 1 = perfect match.
    """
    words1 = _word_set(text1)
    words2 = _word_set(text2)

    if not words1 or not words2:
        return 0.0

    intersection = words1 & words2
    # Use the smaller set as denominator (block should be contained in extracted)
    smaller = min(len(words1), len(words2))
    if smaller == 0:
        return 0.0

    return len(intersection) / smaller


def _find_best_match(block_text: str, extracted_texts: List[str]) -> Tuple[float, str]:
    """Find the best matching extracted text for a content block."""
    best_sim = 0.0
    best_text = ""

    block_words = _word_set(block_text)
    if len(block_words) < 3:
        return 0.0, ""

    for ext_text in extracted_texts:
        sim = _similarity(block_text, ext_text)
        if sim > best_sim:
            best_sim = sim
            best_text = ext_text[:100]

    return best_sim, best_text

# MAIN VALIDATION

_MATCH_THRESHOLD = 0.50  # 50% word overlap = considered matched
_MIN_BLOCK_WORDS = 5     # Blocks with fewer words are skipped (likely headers/labels)


def validate_extraction(
    content_md: str,
    structured_json: Dict[str, Any],
    match_threshold: float = _MATCH_THRESHOLD,
) -> ValidationReport:
    """
    Validate extraction completeness by comparing content.md against structured.json.
    
    No LLM involved — pure deterministic text comparison.
    
    Returns a ValidationReport with:
    - coverage percentage
    - list of unmatched content blocks (gaps)
    - warnings
    """
    # Parse both sources
    blocks = parse_content_md(content_md)
    extracted_texts, extracted_titles = parse_structured_json(structured_json)

    # Get section types from structured JSON
    section_types = []
    for section in structured_json.get("sections", []):
        stype = section.get("type", "unknown")
        if stype not in section_types:
            section_types.append(stype)

    # Check units[] wrapper if present
    for unit in structured_json.get("units", []):
        for section in unit.get("sections", []):
            stype = section.get("type", "unknown")
            if stype not in section_types:
                section_types.append(stype)

    matched = 0
    unmatched = 0
    gaps: List[GapItem] = []
    warnings: List[str] = []

    significant_blocks = [b for b in blocks if b.word_count >= _MIN_BLOCK_WORDS]

    # Filter out trivial blocks (unit/chapter title pages, page markers)
    def _is_trivial(block: ContentBlock) -> bool:
        full = block.full_text.strip()
        # Remove page markers before checking
        full = re.sub(r'<!--\s*PAGE\s+\d+\s*-->', '', full).strip()
        if not full or len(full) < 15:
            return True  # Too short to be real content
        # Check against known trivial patterns
        for pat in _TRIVIAL_BLOCK_PATTERNS:
            if pat.match(full):
                return True
        return False

    significant_blocks = [b for b in significant_blocks if not _is_trivial(b)]

    for block in significant_blocks:
        block_text = block.full_text
        best_sim, closest = _find_best_match(block_text, extracted_texts)

        # Structural Check: If the block has a heading, it MUST match an extracted title/ID
        is_heading_missing = False
        if block.heading_level > 0:
            norm_heading = _normalize_text(block.heading)
            # Check if norm_heading exactly exists in titles, or is a substantial prefix
            # (e.g. "1.7.1 One-one" in content.md vs "1.7.1" in JSON)
            if not any(norm_heading in t or t in norm_heading for t in extracted_titles if len(t) > 3):
                is_heading_missing = True

        if best_sim >= match_threshold and not is_heading_missing:
            matched += 1
        else:
            unmatched += 1
            # Determine reason for gap
            if is_heading_missing:
                reason = f"Structural Merge Error: Heading '{block.heading}' found in content but not as a section title/ID"
            elif block.heading_level > 0:
                reason = f"Section heading '{block.heading}' not found in extraction"
            else:
                reason = f"Content block ({block.word_count} words) not matched"

            gaps.append(GapItem(
                block=block,
                similarity=best_sim,
                closest_section=closest[:100] if closest else None,
                reason=reason,
            ))

    total = matched + unmatched
    coverage = (matched / total * 100) if total > 0 else 100.0

    # Warnings
    if coverage < 70:
        warnings.append(f"Low coverage ({coverage:.0f}%) — significant content may be missing")
    if not section_types:
        warnings.append("No section types found in structured.json")

    # Check for common missing section types
    block_headings_lower = [b.heading.lower() for b in blocks if b.heading]
    _expected_checks = {
        "grammar": ["grammar", "tense", "tenses", "modals", "active and passive",
                     "preposition", "prepositions", "parts of speech", "sentence",
                     "clause", "voice", "subject", "verb"],
        "vocabulary": ["vocabulary", "glossary", "homophones", "homophone",
                       "synonyms", "antonyms", "prefix", "suffix", "word",
                       "words and expressions"],
        "exercise": ["exercise", "exercises", "comprehension", "questions",
                     "fill in", "match the", "choose the", "answer the"],
        "writing_task": ["writing", "letter", "report", "advertisement",
                         "diary", "essay", "paragraph writing"],
    }
    for section_type, keywords in _expected_checks.items():
        if any(kw in h for h in block_headings_lower for kw in keywords):
            if section_type not in section_types:
                warnings.append(f"Content contains '{section_type}' headings but type not found in extraction")

    report = ValidationReport(
        is_complete=unmatched == 0,
        total_blocks=total,
        matched_blocks=matched,
        unmatched_blocks=unmatched,
        gaps=gaps,
        coverage_pct=coverage,
        section_types_found=section_types,
        warnings=warnings,
    )

    # Log summary
    status = "✅ COMPLETE" if report.is_complete else f"⚠️  {unmatched} GAPS"
    print(f"  📊 [Validator] {status} — {matched}/{total} blocks matched ({coverage:.0f}%)")
    if warnings:
        for w in warnings:
            print(f"  ⚠️  [Validator] {w}")
    if gaps:
        for g in gaps[:5]:  # Show first 5 gaps
            print(f"  📋 [Gap] L{g.block.line_start}: {g.reason} (sim={g.similarity:.2f})")
        if len(gaps) > 5:
            print(f"  📋 [Gap] ... and {len(gaps)-5} more gaps")

    return report

# GAP FILLER — Phase 4: targeted re-extraction for missing blocks

def fill_gaps_with_llm(
    gaps: List[GapItem],
    content_md: str,
    existing_data: Dict[str, Any],
    api_key: str,
    subject: str = "unknown",
    model: str = "gpt-5-mini",
    timeout: int = 300,
) -> Dict[str, Any]:
    """
    Phase 4: Fill gaps by re-extracting missing content blocks.
    
    Subject-aware: adjusts extraction types and prompts based on the textbook subject.
    Groups nearby gaps and sends them to the LLM for targeted extraction.
    Returns the updated structured data with gaps filled.
    """
    import requests
    import time

    if not gaps:
        return existing_data

    # Filter to only significant gaps (>10 words, similarity < threshold)
    significant_gaps = [g for g in gaps if g.block.word_count > 10 and g.similarity < 0.40]
    if not significant_gaps:
        print(f"  ℹ️  [Gap Filler] {len(gaps)} gaps but none significant enough to re-extract")
        return existing_data

    print(f"  🔧 [Gap Filler] Re-extracting {len(significant_gaps)} significant gap(s)...")

    # Group nearby gaps to minimize LLM calls
    # Collect the raw text for gaps (expand to surrounding context)
    lines = content_md.split('\n')
    gap_texts: List[str] = []
    for gap in significant_gaps:
        start = max(0, gap.block.line_start - 2)
        end = min(len(lines), gap.block.line_end + 5)
        gap_text = '\n'.join(lines[start:end])
        gap_texts.append(gap_text)

    combined_gap_text = "\n\n---\n\n".join(gap_texts)

    # Limit to 30K chars
    if len(combined_gap_text) > 30_000:
        combined_gap_text = combined_gap_text[:30_000]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # Subject-aware labels and system prompt
    is_math = str(subject).lower() == "mathematics"
    if is_math:
        type_labels = "definition, illustration, example, note, thinking_corner, activity, progress_check, exercise, unit_exercise, points_to_remember, ict_corner, other"
        subject_hint = "This is a MATHEMATICS textbook. Use specialized types: definition, illustration, example, thinking_corner, exercise."
    else:
        type_labels = "grammar, vocabulary, exercise, writing_task, speaking, listening, prose, poem, supplementary, about_the_author, activity, note, do_you_know, other"
        subject_hint = "Use standard textbook types: grammar, vocabulary, prose, exercise."

    gap_prompt = (
        f"The following textbook content was MISSED in the initial extraction. "
        f"Extract it into the sections[] format.\n\n"
        f"Return JSON: {{\"sections\": [{{ \"type\": \"...\", \"id\": null, \"title\": \"...\", "
        f"\"content\": \"...\", \"metadata\": {{}}, \"sub_items\": [] }}]}}\n\n"
        f"CRITICAL: Extract EVERYTHING below. {subject_hint}\n\n"
        f"Missing content:\n{combined_gap_text}"
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": (
                "You are an expert textbook content extractor. "
                "Extract the missing content into structured sections. "
                f"Use type labels: {type_labels}. "
                "For Mathematics, ensure 'example' includes the solution in metadata."
                if is_math else
                "Grammar sections must include BOTH explanation AND exercises as sub_items."
            )},
            {"role": "user", "content": gap_prompt},
        ],
        "max_completion_tokens": 8192,
        "response_format": {"type": "json_object"},
    }

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers, json=payload, timeout=timeout,
        )
        if resp.ok:
            raw = resp.json()["choices"][0]["message"]["content"]
            # Parse JSON
            cleaned = re.sub(r'^```[a-z]*\n?', '', raw.strip()).rstrip('`').strip()
            try:
                if _USE_ORJSON:
                    gap_data = orjson.loads(cleaned.encode() if isinstance(cleaned, str) else cleaned)
                else:
                    gap_data = json.loads(cleaned)
            except Exception:
                print(f"  ⚠️  [Gap Filler] Failed to parse gap extraction JSON")
                return existing_data

            new_sections = gap_data.get("sections", [])
            if new_sections:
                existing_data.setdefault("sections", []).extend(new_sections)
                types_added = [s.get("type", "?") for s in new_sections]
                print(f"  ✅ [Gap Filler] Added {len(new_sections)} missing section(s): {types_added}")
            else:
                print(f"  ℹ️  [Gap Filler] No additional sections extracted from gaps")
        else:
            print(f"  ⚠️  [Gap Filler] API returned {resp.status_code}")
    except Exception as e:
        print(f"  ❌ [Gap Filler] Error: {e}")

    return existing_data

# FILE-BASED VALIDATION (for existing outputs)

def validate_from_files(
    content_md_path: str,
    structured_json_path: str,
) -> ValidationReport:
    """
    Validate extraction by reading content.md and structured.json from disk.
    Convenience function for testing existing outputs.
    """
    with open(content_md_path, 'r', encoding='utf-8') as f:
        content_md = f.read()

    with open(structured_json_path, 'r', encoding='utf-8') as f:
        if _USE_ORJSON:
            structured = orjson.loads(f.read().encode())
        else:
            structured = json.load(f)

    # Handle units[] wrapper
    if "units" in structured and isinstance(structured["units"], list):
        results = []
        for unit in structured["units"]:
            results.append(validate_extraction(content_md, unit))
        # Combine reports
        if len(results) == 1:
            return results[0]
        combined = ValidationReport(
            is_complete=all(r.is_complete for r in results),
            total_blocks=sum(r.total_blocks for r in results),
            matched_blocks=sum(r.matched_blocks for r in results),
            unmatched_blocks=sum(r.unmatched_blocks for r in results),
            gaps=[g for r in results for g in r.gaps],
            coverage_pct=sum(r.coverage_pct * r.total_blocks for r in results) / max(1, sum(r.total_blocks for r in results)),
            section_types_found=list(set(t for r in results for t in r.section_types_found)),
            warnings=[w for r in results for w in r.warnings],
        )
        return combined

    return validate_extraction(content_md, structured)

# CLI — validate existing outputs

if __name__ == "__main__":
    import sys
    from pathlib import Path

    outputs_dir = Path("outputs")
    if not outputs_dir.exists():
        print("No outputs/ directory found")
        sys.exit(1)

    total_gaps = 0
    total_blocks = 0

    for unit_dir in sorted(outputs_dir.iterdir()):
        if not unit_dir.is_dir():
            continue

        content_path = unit_dir / "content.md"
        structured_path = unit_dir / "structured.json"

        if not content_path.exists() or not structured_path.exists():
            continue

        print(f"\n{'='*60}")
        print(f"  Validating: {unit_dir.name}")
        print(f"{'='*60}")

        report = validate_from_files(str(content_path), str(structured_path))
        total_gaps += report.unmatched_blocks
        total_blocks += report.total_blocks

    print(f"\n{'='*60}")
    print(f"  SUMMARY: {total_blocks - total_gaps}/{total_blocks} blocks matched "
          f"({(total_blocks - total_gaps) / max(1, total_blocks) * 100:.0f}% coverage)")
    if total_gaps > 0:
        print(f"  ⚠️  {total_gaps} total gaps across all units")
    else:
        print(f"  ✅ All content matched!")
