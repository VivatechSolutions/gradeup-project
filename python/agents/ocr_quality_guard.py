"""
OCR Quality Guard — Agent 0
============================
Scores every page of content.md for quality issues:
  - Watermark-spam ratio (TN Board / NCERT watermarks)
  - Hash-spam ratio (bare '#' characters from failed OCR)
  - Content character density

Corrupted pages are cleaned / stripped from the markdown before
the extraction pipeline runs. No Vision LLM is used — text-only.

Saves: page_quality_report.json
"""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import orjson
    def _json_dumps(obj): return orjson.dumps(obj, option=orjson.OPT_INDENT_2)
    def _json_loads(data): return orjson.loads(data)
except ImportError:
    import json
    def _json_dumps(obj): return json.dumps(obj, indent=2).encode()
    def _json_loads(data): return json.loads(data)



_TN_WATERMARKS = (
    "tamilaruvi.in",
    "www.tam",
    "www.tami",
    "www.tamil",
    "www.tamila",
)

_NCERT_WATERMARKS = (
    "not to be republished",
    "www.ncert.nic.in",
    "ncert.nic.in",
    "© ncert",
    "copyright ncert",
)

_ALL_WATERMARKS = _TN_WATERMARKS + _NCERT_WATERMARKS

# Page delimiter pattern written by ocr_pipeline
_PAGE_MARKER_RE = re.compile(r"<!-- PAGE (\d+) -->", re.IGNORECASE)



@dataclass
class PageQualityScore:
    """Quality assessment for a single OCR page."""
    page_num: int
    watermark_ratio: float       # fraction of non-empty lines with watermark text
    hash_spam_ratio: float       # fraction of non-empty lines that are bare '#'
    content_chars: int           # non-whitespace characters after stripping watermarks
    is_corrupted: bool
    recommended_action: str      # "keep" | "clean" | "skip"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)



def score_page_quality(page_markdown: str, page_num: int = 0) -> PageQualityScore:
    """
    Score a single page's OCR markdown for quality.

    Returns a PageQualityScore with:
        - watermark_ratio: >0.60 → corrupted
        - hash_spam_ratio: >0.50 → corrupted
        - recommended_action: "keep" | "clean" | "skip"
    """
    if not page_markdown or not page_markdown.strip():
        return PageQualityScore(
            page_num=page_num,
            watermark_ratio=0.0,
            hash_spam_ratio=0.0,
            content_chars=0,
            is_corrupted=True,
            recommended_action="skip",
        )

    lines = [ln for ln in page_markdown.split("\n") if ln.strip()]
    if not lines:
        return PageQualityScore(
            page_num=page_num,
            watermark_ratio=0.0,
            hash_spam_ratio=0.0,
            content_chars=0,
            is_corrupted=True,
            recommended_action="skip",
        )

    total = len(lines)
    wm_count   = sum(1 for ln in lines if any(w in ln.lower() for w in _ALL_WATERMARKS))
    hash_count = sum(1 for ln in lines if ln.strip() == "#")

    wm_ratio   = wm_count   / total
    hash_ratio = hash_count / total

    # Additional: NCERT-specific check at lower density threshold
    ncert_count = sum(1 for ln in lines if any(w in ln.lower() for w in _NCERT_WATERMARKS))
    ncert_ratio = ncert_count / total

    is_corrupted = (
        wm_ratio   >= 0.60
        or hash_ratio >= 0.50
        or (total >= 5 and ncert_ratio >= 0.40)
    )

    # Estimate real content after stripping watermark lines
    clean_lines = [
        ln for ln in lines
        if not any(w in ln.lower() for w in _ALL_WATERMARKS)
        and ln.strip() != "#"
    ]
    content_chars = sum(len(ln.strip()) for ln in clean_lines)

    if is_corrupted:
        action = "skip" if content_chars < 100 else "clean"
    else:
        action = "keep"

    return PageQualityScore(
        page_num=page_num,
        watermark_ratio=round(wm_ratio, 3),
        hash_spam_ratio=round(hash_ratio, 3),
        content_chars=content_chars,
        is_corrupted=is_corrupted,
        recommended_action=action,
    )



def generate_page_quality_report(content_md: str) -> Dict[str, Any]:
    """
    Split content.md by <!-- PAGE N --> markers, score each page,
    and return a summary report dict.

    If no page markers are found, the entire content is treated as one page.
    """
    # Split by PAGE markers
    parts = _PAGE_MARKER_RE.split(content_md)

    scores: List[PageQualityScore] = []

    if len(parts) <= 1:
        # No page markers — score whole doc as page 1
        scores.append(score_page_quality(content_md, page_num=1))
    else:
        # parts alternates: [pre_text, page_num, page_text, page_num, page_text, ...]
        # parts[0] is text before first marker (cover / TOC area)
        i = 1
        while i < len(parts) - 1:
            try:
                pnum = int(parts[i])
                ptext = parts[i + 1]
            except (ValueError, IndexError):
                i += 1
                continue
            scores.append(score_page_quality(ptext, page_num=pnum))
            i += 2

    corrupted = [s for s in scores if s.is_corrupted]
    clean     = [s for s in scores if not s.is_corrupted]

    report = {
        "total_pages": len(scores),
        "corrupted_pages": len(corrupted),
        "clean_pages": len(clean),
        "corruption_pct": round(len(corrupted) / max(len(scores), 1) * 100, 1),
        "pages": [s.to_dict() for s in scores],
        "corrupted_page_nums": sorted(s.page_num for s in corrupted),
        "pages_to_skip":  [s.page_num for s in corrupted if s.recommended_action == "skip"],
        "pages_to_clean": [s.page_num for s in corrupted if s.recommended_action == "clean"],
    }

    if corrupted:
        print(
            f"  ⚠️  [OCRQualityGuard] {len(corrupted)}/{len(scores)} pages corrupted "
            f"(watermark/hash-spam). Pages: {report['corrupted_page_nums'][:10]}"
        )
    else:
        print(f"  ✅ [OCRQualityGuard] All {len(scores)} pages clean.")

    return report



def _clean_single_page(page_text: str) -> str:
    """
    Remove watermark lines and bare '#' lines from a single page's text.
    Returns cleaned text (may be empty if everything was noise).
    """
    lines = page_text.split("\n")
    cleaned = []
    for ln in lines:
        stripped = ln.strip()
        if not stripped:
            cleaned.append(ln)  # preserve blank lines for structure
            continue
        if stripped == "#":
            continue  # drop bare hash-spam
        if any(w in stripped.lower() for w in _ALL_WATERMARKS):
            continue  # drop watermark line
        cleaned.append(ln)
    return "\n".join(cleaned)


def clean_corrupted_pages(content_md: str, quality_report: Dict[str, Any]) -> str:
    """
    Given the full content.md and a page_quality_report, clean or skip
    corrupted pages in-place. Returns cleaned markdown.

    Strategy:
      - "skip" pages  → replaced with a short notice comment
      - "clean" pages → watermark/hash lines stripped, real content preserved
      - "keep" pages  → untouched
    """
    pages_to_skip  = set(quality_report.get("pages_to_skip",  []))
    pages_to_clean = set(quality_report.get("pages_to_clean", []))

    if not pages_to_skip and not pages_to_clean:
        return content_md  # nothing to do

    # Split by markers, rebuild
    parts = _PAGE_MARKER_RE.split(content_md)
    if len(parts) <= 1:
        # No markers — if the whole doc is corrupted, clean it globally
        if quality_report.get("corrupted_pages", 0) > 0:
            return _clean_single_page(content_md)
        return content_md

    rebuilt: List[str] = [parts[0]]  # pre-first-page text unchanged
    i = 1
    while i < len(parts) - 1:
        try:
            pnum = int(parts[i])
            ptext = parts[i + 1]
        except (ValueError, IndexError):
            rebuilt.append(parts[i] if i < len(parts) else "")
            i += 1
            continue

        marker = f"<!-- PAGE {pnum} -->"

        if pnum in pages_to_skip:
            rebuilt.append(f"\n{marker}\n<!-- [OCRGuard] Page {pnum} skipped — watermark corrupted -->\n")
        elif pnum in pages_to_clean:
            cleaned_text = _clean_single_page(ptext)
            rebuilt.append(f"\n{marker}\n{cleaned_text}")
            print(f"  🧹 [OCRQualityGuard] Cleaned page {pnum} "
                  f"({len(ptext)} → {len(cleaned_text)} chars)")
        else:
            rebuilt.append(f"\n{marker}\n{ptext}")

        i += 2

    return "".join(rebuilt)



def save_quality_report(report: Dict[str, Any], output_dir: Path) -> Path:
    """Save page_quality_report.json to output_dir. Returns path."""
    path = output_dir / "page_quality_report.json"
    path.write_bytes(_json_dumps(report))
    print(f"  💾 [OCRQualityGuard] Saved → {path.name}")
    return path
