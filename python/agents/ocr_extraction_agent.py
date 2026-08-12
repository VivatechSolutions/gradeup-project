"""
Stage 0a — OCR Extraction Agent
Runs Mistral OCR on the PDF, strips watermarks, fixes image placeholders,
and runs the OCR quality guard to score and clean corrupted pages.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict


# ── Lazy helpers ──────────────────────────────────────────────────────────────

def _get_mistral_client(mistral_key: str):
    from mistralai import Mistral
    return Mistral(api_key=mistral_key)


def _fix_placeholders(markdown: str, raw_ocr: Dict) -> str:
    try:
        from ocr_pipeline import _fix_image_placeholders
        return _fix_image_placeholders(markdown, raw_ocr)
    except Exception:
        return markdown


def _strip_watermarks(markdown: str) -> str:
    try:
        from subject_aware_extraction import strip_ncert_watermarks
        return strip_ncert_watermarks(markdown)
    except Exception:
        pass
    markdown = re.sub(r"<!-- PAGE \d+ -->\s*", "", markdown)
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    return markdown


def _inject_section_numbers(markdown: str) -> str:
    try:
        from ocr_pipeline import _inject_missing_section_numbers
        return _inject_missing_section_numbers(markdown)
    except Exception:
        return markdown


def _build_page_list(raw_ocr: Dict) -> list:
    pages = []
    for i, page in enumerate(raw_ocr.get("pages", [])):
        pages.append({
            "page_num": i + 1,
            "markdown": page.get("markdown", ""),
            "images": [
                {"id": img.get("id", ""), "base64": img.get("image_base64", "")}
                for img in page.get("images", [])
            ],
        })
    return pages


def _run_quality_guard(content_md: str):
    """Run OCR quality guard; returns (cleaned_md, report)."""
    try:
        from agents.ocr_quality_guard import score_page_quality, clean_corrupted_pages
        report  = score_page_quality(content_md)
        cleaned = clean_corrupted_pages(content_md, report)
        return cleaned, report
    except Exception as e:
        return content_md, {"error": str(e), "pages_cleaned": 0}


# ── LangGraph Node ────────────────────────────────────────────────────────────

def ocr_extraction_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stage 0a — Mistral OCR + quality guard.

    Reads:  pdf_path, mistral_key, subject
    Writes: raw_ocr_response, raw_markdown, content_md,
            page_list, page_quality_report
    """
    pdf_path    = Path(state["pdf_path"])
    mistral_key = state["mistral_key"]

    print(f"\n{'='*60}")
    print(f"🔍 Stage 0a: Mistral OCR  →  {pdf_path.name}")
    print(f"{'='*60}")

    # Step 1: Mistral OCR
    client     = _get_mistral_client(mistral_key)
    from ocr_pipeline import extract_with_mistral_ocr
    ocr_result = extract_with_mistral_ocr(client, pdf_path, use_upload_flow=True)

    if not ocr_result.get("success"):
        return {
            "pipeline_errors":    [f"Mistral OCR failed: {ocr_result.get('error', 'unknown')}"],
            "raw_markdown":       "",
            "content_md":         "",
            "raw_ocr_response":   {},
            "page_list":          [],
            "page_quality_report": {},
        }

    raw_markdown = ocr_result.get("markdown", "")
    raw_ocr      = ocr_result.get("raw", {})
    print(f"  ✅ OCR complete — {len(raw_markdown):,} chars, "
          f"{len(raw_ocr.get('pages', []))} pages")

    # Step 2-5: Normalize → fix placeholders → strip watermarks → section numbers
    md = re.sub(r"\n{3,}", "\n\n", raw_markdown)
    md = _fix_placeholders(md, raw_ocr)
    md = _strip_watermarks(md)
    md = _inject_section_numbers(md)

    # Step 6: Build page list
    page_list = _build_page_list(raw_ocr)

    # Step 7: OCR quality guard
    print(f"  🛡️  Running OCR quality guard...")
    cleaned_md, quality_report = _run_quality_guard(md)
    pages_cleaned = quality_report.get("pages_cleaned", 0)
    if pages_cleaned:
        print(f"  🧹 Cleaned {pages_cleaned} corrupted page(s)")

    print(f"  ✅ Stage 0a complete — {len(cleaned_md):,} chars ready")

    return {
        "raw_ocr_response":    raw_ocr,
        "raw_markdown":        raw_markdown,
        "content_md":          cleaned_md,
        "page_list":           page_list,
        "page_quality_report": quality_report,
    }
