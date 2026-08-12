"""
Stage 0b — Vision Pass Agent
Two sub-steps:
  A) _extract_text_from_images(): GPT-4o Vision classifies each embedded image
     as text-box (Do You Know, sidebar) vs illustration. Text-boxes are injected
     back into markdown as readable text.
  B) _vision_reocr_pages(): bad/watermarked pages are re-OCR'd via GPT-4o Vision.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple


# ── Sub-step A: Text-box detection ───────────────────────────────────────────

def _text_box_pass(
    content_md: str,
    raw_ocr:    Dict,
    api_key:    str,
) -> Tuple[str, int, Dict]:
    """
    Wraps ocr_pipeline._extract_text_from_images().
    Returns (updated_markdown, replacement_count, image_metadata).
    """
    try:
        from ocr_pipeline import _extract_text_from_images
        updated_md, count, img_meta = _extract_text_from_images(
            content_md, raw_ocr, api_key
        )
        return updated_md, count, img_meta
    except Exception as e:
        print(f"  ⚠️  Vision text-box pass failed: {e}")
        return content_md, 0, {}


# ── Sub-step B: Bad-page re-OCR ───────────────────────────────────────────────

def _bad_page_reocr(
    content_md: str,
    pdf_path:   str,
    api_key:    str,
) -> str:
    """
    Detects low-quality pages and re-OCRs them via GPT-4o Vision.
    Returns updated markdown.
    """
    try:
        from ocr_pipeline import (
            _detect_low_quality_pages,
            _vision_reocr_pages,
            _patch_markdown_pages,
        )
        from pathlib import Path

        bad_pages = _detect_low_quality_pages(content_md)
        if not bad_pages:
            return content_md

        print(f"  ⚠️  Detected {len(bad_pages)} low-quality page(s): {bad_pages}")
        vision_results = _vision_reocr_pages(Path(pdf_path), bad_pages, api_key)
        if vision_results:
            content_md = _patch_markdown_pages(content_md, vision_results)
            print(f"  ✅ Re-OCR'd {len(vision_results)} page(s) via GPT-4o Vision")

    except Exception as e:
        print(f"  ⚠️  Bad-page re-OCR failed: {e}")

    return content_md


# ── LangGraph Node ────────────────────────────────────────────────────────────

def vision_pass_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stage 0b — Vision pass (text-box detection + bad-page re-OCR).

    Reads:  content_md, raw_ocr_response, pdf_path, api_key
    Writes: content_md (updated), image_metadata, vision_replacement_count,
            vision_pass_report
    """
    content_md = state["content_md"]
    raw_ocr    = state.get("raw_ocr_response", {})
    pdf_path   = state["pdf_path"]
    api_key    = state.get("api_key", "")

    print(f"\n{'='*60}")
    print(f"👁️  Stage 0b: Vision Pass")
    print(f"{'='*60}")

    if not api_key:
        print("  ⚠️  No OpenAI API key — skipping vision pass")
        return {
            "image_metadata":            {},
            "vision_replacement_count":  0,
            "vision_pass_report": {"skipped": True, "reason": "no_api_key"},
        }

    total_images = len(raw_ocr.get("pages", []))
    print(f"  📷  Processing {total_images} OCR page(s) for embedded images...")

    # Sub-step A: classify images + inject text-boxes into markdown
    content_md, replacement_count, image_metadata = _text_box_pass(
        content_md, raw_ocr, api_key
    )
    print(f"  ✅ Text-box injection: {replacement_count} image(s) replaced with text")

    # Sub-step B: re-OCR bad pages
    content_md = _bad_page_reocr(content_md, pdf_path, api_key)

    # Vision pass summary
    text_boxes  = sum(1 for m in image_metadata.values() if m.get("is_text_box"))
    illust      = sum(1 for m in image_metadata.values() if not m.get("is_text_box"))

    vision_report = {
        "total_images":      len(image_metadata),
        "text_boxes_found":  text_boxes,
        "illustrations":     illust,
        "replacements_made": replacement_count,
    }
    print(f"  📊 Vision report: {text_boxes} text-boxes, {illust} illustrations")
    print(f"  ✅ Stage 0b complete")

    return {
        "content_md":                content_md,
        "image_metadata":            image_metadata,
        "vision_replacement_count":  replacement_count,
        "vision_pass_report":        vision_report,
    }
