"""
OCR Pipeline - TRULY UNIVERSAL SOLUTION
========================================

NO HARDCODED PART NAMES!

Instead of looking for "History", "Geography", "Civics", "Economics",
this system:
1. READS the Table of Contents
2. DISCOVERS which parts/subjects exist
3. EXTRACTS the structure automatically
4. WORKS FOR ANY TEXTBOOK from ANY board/class/country

Example TOC structures it handles:
- Class 10: History, Geography, Civics, Economics
- Class 8: History, Geography, Social & Political Life, Economic Life
- State Board: Historical Geography, Political Economy, etc.
- International: World History, Human Geography, Government, etc.

COMPLETELY ADAPTIVE - NO MANUAL CONFIGURATION NEEDED!
"""

import argparse
import base64
import os
import re
import sys
import shutil
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import orjson
import requests
from dotenv import load_dotenv
try:
    from mistralai import Mistral
except ImportError:
    # mistralai v2.x moved Mistral to mistralai.client
    from mistralai.client import Mistral

SUBJECT_AWARE_AVAILABLE = False

if not SUBJECT_AWARE_AVAILABLE:
    # Dummy stubs to prevent NameError and satisfy IDE type checker
    # since subject_aware_extraction.py was removed.
    def get_system_prompt_for_subject(*args, **kwargs): return ""
    def create_user_prompt(*args, **kwargs): return ""
    def validate_structure(*args, **kwargs): return True
    def strip_ncert_watermarks(text: str, *args, **kwargs) -> str: return text
    def is_ncert_book(*args, **kwargs) -> bool: return False
    def detect_subject_from_content(*args, **kwargs) -> str: return "science"

try:
    from auto_schema_extractor import (
        extract_with_auto_schema,
        discover_textbook_structure,
        detect_unit_number as auto_detect_unit_number,
        clean_content_for_extraction,
    )
    AUTO_SCHEMA_AVAILABLE = True
except ImportError:
    AUTO_SCHEMA_AVAILABLE = False

try:
    from content_validator import (
        validate_extraction,
        fill_gaps_with_llm,
        ValidationReport,
    )
    CONTENT_VALIDATOR_AVAILABLE = True
except ImportError:
    CONTENT_VALIDATOR_AVAILABLE = False

try:
    from langfuse_utils import (
        get_langfuse_client, safe_observe, update_trace_safely,
        update_generation_safely, flush_safely, score_trace_safely,
        create_span_context, link_to_parent_trace
    )
    LANGFUSE_AVAILABLE = True
except ImportError:
    LANGFUSE_AVAILABLE = False

try:
    from qdrant_integration import (
        process_and_upload_document,
        initialize_qdrant_client
    )
    QDRANT_INTEGRATION_AVAILABLE = True
except ImportError:
    QDRANT_INTEGRATION_AVAILABLE = False

try:
    from enrichment_pipeline import enrich_document as run_enrichment
    ENRICHMENT_AVAILABLE = True
except ImportError:
    ENRICHMENT_AVAILABLE = False

try:
    from s3_storage import (
        upload_images_to_s3,
        upload_single_image_to_s3,
        S3_AVAILABLE as S3_STORAGE_AVAILABLE,
    )
except ImportError:
    S3_STORAGE_AVAILABLE = False
    def upload_images_to_s3(*args, **kwargs): return {}
    def upload_single_image_to_s3(*args, **kwargs): return None

try:
    from llm_first_pipeline import structure_with_llm_first, detect_unit_number_from_markdown
    LLM_FIRST_AVAILABLE = True
except ImportError:
    LLM_FIRST_AVAILABLE = False

DEFAULT_MODEL = "mistral-ocr-latest"




# POST-EXTRACTION NORMALIZER
# Fixes type label inconsistencies produced by the LLM — runs deterministically
# after extraction, before saving to structured.json.
# Handles: image-only sections, vocabulary-vs-definition, writing vs writing_task,
#          prose merging, supplementary detection.


import re as _re

_IMAGE_ONLY_RE = _re.compile(r'^\s*!\[.*?\]\(.*?\)\s*$')

_MD_IMAGE_RE = _re.compile(r'!\[.*?\]\(.*?\)')

def _normalize_section_types(sections: list, subject: str = "") -> list:
    """
    Post-process sections[] to fix type inconsistencies.
    Returns cleaned list of sections.

    NOTE: Only operates on Universal-schema sections (those with a 'type' field).
    Subject-specific schema sections (section_number / section_title / subsections)
    are passed through unchanged so content is never silently dropped.
    """
    if not sections:
        return sections

    # ── For CBSE English: remove social-science schema fields that don't belong ──
    _SOCIAL_SCIENCE_FIELDS = {
        'do_you_know', 'map_work', 'timeline', 'reference_books', 'ict_corner'
    }

    result = []
    for sec in sections:
        # ── GUARD: pass subject-specific schema sections through unchanged ────
        # These use section_number/section_title/subsections (no 'type' key).
        # Normalizing them would wrongly default stype to "other" and may drop content.
        if "type" not in sec and "section_number" in sec:
            result.append(sec)
            continue

        stype = sec.get("type", "other")
        content = sec.get("content") or ""
        title = sec.get("title") or ""
        sec_id = sec.get("id") or ""

        # ── Fix 8: strip markdown image references from content ───────────────
        # e.g. "![img-17.jpeg](img-17.jpeg)" in writing_task/exploration sections
        if content and _MD_IMAGE_RE.search(content):
            stripped = _MD_IMAGE_RE.sub('', content).strip()
            # Only drop the whole section if image refs were ALL that was there
            if not stripped:
                continue
            sec = dict(sec)
            sec['content'] = stripped
            content = stripped

        # ── Fix 10: remove social-science schema fields from English sections ─
        if subject in ('english', 'cbse_english'):
            has_ss_fields = any(k in sec for k in _SOCIAL_SCIENCE_FIELDS)
            if has_ss_fields:
                sec = {k: v for k, v in sec.items() if k not in _SOCIAL_SCIENCE_FIELDS}

        # ── Fix 7: vocabulary content must be "" not null ─────────────────────
        if stype == 'vocabulary' and sec.get('content') is None:
            sec = dict(sec)
            sec['content'] = ""
            content = ""

        # ── AUTO-POPULATE poem stanzas if sub_items is empty ─────────────────
        # When LLM puts all poem text in content but leaves sub_items=[],
        # split by double-newline to create stanzas automatically.
        if stype == "poem" and content and not sec.get("sub_items"):
            import re as _re2
            raw_stanzas = [s.strip() for s in _re2.split(r'\n\s*\n', content) if s.strip()]
            if len(raw_stanzas) >= 2:
                sec = dict(sec)
                sec["sub_items"] = [
                    {"number": f"stanza_{i+1}", "content": stanza, "options": []}
                    for i, stanza in enumerate(raw_stanzas)
                ]
                print(f"  🎵 Auto-split poem '{title or sec_id}' into {len(raw_stanzas)} stanzas")

        # ── SKIP image-only sections ─────────────────────────────────────────
        if _IMAGE_ONLY_RE.match(content) and not sec.get("sub_items"):
            continue  # drop entirely

        # ── Normalize 'writing' → 'writing_task' ─────────────────────────────
        if stype == "writing":
            sec = dict(sec); sec["type"] = "writing_task"
            stype = "writing_task"

        # ── Normalize 'image_placeholder' → skip ─────────────────────────────
        if stype == "image_placeholder":
            continue

        # ── vocabulary vs definition (English textbooks) ─────────────────────
        # "word (pos) - meaning" pattern = vocabulary, not definition
        if stype == "definition" and subject == "english":
            vocab_pat = _re.compile(r"^[a-zA-Z\-' ]+\s*(?:\([a-z\.]+\))?\s*[-\u2013]\s*.{10,}", _re.MULTILINE)
            if vocab_pat.match(content.strip()):
                sec = dict(sec); sec["type"] = "vocabulary"
                stype = "vocabulary"

        # ── supplementary: detect from title or content (English) ──────────────
        if subject == "english":
            # Detect supplementary from title
            if stype in ("other", "prose", "reading") and title and "supplementary" in title.lower():
                sec = dict(sec); sec["type"] = "supplementary"
                stype = "supplementary"
            # Detect folk tales / supplementary content from content text
            if stype in ("other", "prose") and content:
                folk_signals = [
                    "a japanese folk tale",
                    "folk tale",
                    "folk culture and folklore",
                    "the envious neighbour",
                    "in the old, old days",
                    "supplementary reading",
                ]
                if any(sig in content.lower() for sig in folk_signals):
                    sec = dict(sec); sec["type"] = "supplementary"
                    stype = "supplementary"
        elif stype == "other" and title and "supplementary" in title.lower():
            sec = dict(sec); sec["type"] = "supplementary"
            stype = "supplementary"

        # ── about_the_author: detect from title or id ─────────────────────────
        if stype == "other" and (title or sec_id):
            lower_title = (title or sec_id).lower()
            if any(k in lower_title for k in ("about the author", "about the poet",
                                               "about the writer", "the author",
                                               "about the playwright")):
                sec = dict(sec); sec["type"] = "about_the_author"
                stype = "about_the_author"

        # ── warm_up: detect from title/id ────────────────────────────────────
        if stype == "other" and (title or sec_id):
            lower_title = (title or sec_id).lower()
            if any(k in lower_title for k in ("warm up", "warm-up", "warming up")):
                sec = dict(sec); sec["type"] = "warm_up"
                stype = "warm_up"

        # ── glossary sections within English units: type="vocabulary" ────────
        if stype == "other" and subject == "english" and (title or sec_id):
            lower_title = (title or sec_id).lower()
            if lower_title == "glossary" or lower_title.startswith("glossary"):
                sec = dict(sec); sec["type"] = "vocabulary"
                meta = dict(sec.get("metadata") or {})
                meta["section_title"] = "Glossary"
                sec["metadata"] = meta
                stype = "vocabulary"

        result.append(sec)

    # ── Merge consecutive prose sections (same story) ────────────────────────
    result = _merge_consecutive_prose(result)

    return result


def _merge_consecutive_prose(sections: list) -> list:
    """
    Merge consecutive prose sections that belong to the SAME story.
    For English textbooks: keeps separate prose sections if they have different titles
    (different stories/passages), but merges split paragraphs of the same story.

    Fix F-2: When a prose section has a title but empty content, and is immediately
    followed by a prose section with content but null title, they are from the same
    story — merge them (title from first, content from second).

    NOTE: Subject-specific schema sections (section_number / no type field) are
    passed through unchanged — no merging is attempted for them.
    """
    if not sections:
        return sections

    # ── Pass 1: Fix F-2 — fuse title-only + content-only consecutive prose pairs ──
    # Pattern: sec[i] has title + no content, sec[i+1] has content + no title
    fused = []
    i = 0
    while i < len(sections):
        sec = sections[i]
        if (sec.get("type") == "prose"
                and (sec.get("title") or sec.get("metadata", {}).get("title"))
                and not (sec.get("content") or "").strip()
                and i + 1 < len(sections)):
            next_sec = sections[i + 1]
            if (next_sec.get("type") == "prose"
                    and not next_sec.get("title")
                    and (next_sec.get("content") or "").strip()):
                # Merge: take title/id from current, content from next
                merged = dict(next_sec)
                merged["title"] = sec.get("title") or merged.get("title")
                merged["id"] = sec.get("id") or merged.get("id")
                # Merge metadata
                merged_meta = dict(sec.get("metadata") or {})
                merged_meta.update({k: v for k, v in (next_sec.get("metadata") or {}).items() if v})
                merged["metadata"] = merged_meta
                fused.append(merged)
                i += 2
                continue
        fused.append(sec)
        i += 1

    # ── Pass 2: Standard consecutive-prose merging (same title or both null) ─
    merged_result = []
    i = 0
    while i < len(fused):
        sec = fused[i]
        # Pass subject-specific schema sections through unchanged
        if "type" not in sec and "section_number" in sec:
            merged_result.append(sec)
            i += 1
            continue
        if sec.get("type") != "prose":
            merged_result.append(sec)
            i += 1
            continue

        # Collect consecutive prose sections with same title (or null title)
        prose_group = [sec]
        j = i + 1
        base_title = sec.get("title") or sec.get("id")
        while j < len(fused):
            next_sec = fused[j]
            if next_sec.get("type") != "prose":
                break
            next_title = next_sec.get("title") or next_sec.get("id")
            # Only merge if titles are the same (or both None)
            # Don't merge if one has a title and the other has a different title
            if base_title and next_title and base_title != next_title:
                break
            prose_group.append(next_sec)
            j += 1

        if len(prose_group) == 1:
            merged_result.append(prose_group[0])
        else:
            # Merge: use first section's title/id, concatenate all content
            combined = dict(prose_group[0])
            all_content = [p.get("content") or "" for p in prose_group if (p.get("content") or "").strip()]
            combined["content"] = "\n\n".join(all_content)
            # Keep sub_items from all (stanzas etc)
            all_sub_items = []
            for p in prose_group:
                all_sub_items.extend(p.get("sub_items") or [])
            if all_sub_items:
                combined["sub_items"] = all_sub_items
            merged_result.append(combined)

        i = j

    return merged_result


LLM_CONFIG = {
    "timeout": 600,
    "max_retries": 3,
    "base_delay": 10,
    "max_completion_tokens": 16384,   # gpt-5-mini requires max_completion_tokens (not max_tokens)
    
}


@dataclass
class Paths:
    workspace: Path
    textbooks: Path
    outputs: Path


def load_env() -> None:
    for env_file in (".env.local", ".env"):
        if (candidate := Path(env_file)).exists():
            load_dotenv(dotenv_path=candidate)
            break


def ensure_outputs_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_json(data: dict, path: Path) -> None:
    path.write_bytes(orjson.dumps(data, option=orjson.OPT_INDENT_2))


def save_text(text: str, path: Path) -> None:
    path.write_text(text, encoding="utf-8")


def b64_encode_pdf(pdf_path: Path) -> str:
    return base64.b64encode(pdf_path.read_bytes()).decode("utf-8")



# MISTRAL OCR EXTRACTION



def _response_to_dict(response: Any) -> Dict[str, Any]:
    if hasattr(response, "model_dump"):
        return response.model_dump()
    elif hasattr(response, "dict"):
        return response.dict()
    return {}


def _is_watermark_corrupted(page_markdown: str) -> bool:
    """Return True when a page's OCR output is dominated by watermark spam.

    Root cause: PDFs with dense text-layer watermarks (e.g. 'www.tamilaruvi.in'
    repeated hundreds of times per page, or NCERT 'not to be republished' repeated
    across every page) cause Mistral OCR to read the watermark layer and output
    garbage instead of the real educational content.

    Signals detected:
      • TN Board watermarks: tamilaruvi.in domain repeated on every line
      • NCERT / CBSE watermarks: 'not to be republished', 'www.ncert.nic.in',
        'ncert.nic.in', '© ncert' repeated across lines
      • Bare '#' spam (Mistral's fallback for unparseable text)
      • Page where >60% of lines are watermark strings
      • Page where >50% of lines are bare '#'
    """
    if not page_markdown or not page_markdown.strip():
        return True
    lines = [l for l in page_markdown.split('\n') if l.strip()]
    if not lines:
        return True

    # ── TN Board watermark patterns ──────────────────────────────────────────
    TN_WATERMARKS = ('tamilaruvi.in', 'www.tam', 'www.tami', 'www.tamil', 'www.tamila')

    # ── NCERT / CBSE watermark patterns ──────────────────────────────────────
    NCERT_WATERMARKS = (
        'not to be republished',
        'www.ncert.nic.in',
        'ncert.nic.in',
        '© ncert',
        'copyright ncert',
    )

    all_watermark_patterns = TN_WATERMARKS + NCERT_WATERMARKS

    wm  = sum(1 for l in lines if any(w in l.lower() for w in all_watermark_patterns))
    hsh = sum(1 for l in lines if l.strip() == '#')

    # Heuristic: if >60% of non-empty lines are watermark text, the page is corrupted
    if (wm / len(lines)) >= 0.60:
        return True
    # Heuristic: if >50% are bare '#' characters, Mistral failed to parse the page
    if (hsh / len(lines)) >= 0.50:
        return True

    # Additional NCERT signal: page content is almost entirely repeated watermark phrases
    # (even at lower density, these destroy readability)
    ncert_wm = sum(1 for l in lines if any(w in l.lower() for w in NCERT_WATERMARKS))
    if len(lines) >= 5 and (ncert_wm / len(lines)) >= 0.40:
        return True

    return False


def _render_pdf_page_to_b64(pdf_path: Path, page_num: int, dpi: int = 200) -> str:
    """Render a single PDF page to a JPEG base64 string using pdf2image/pdftoppm.

    This is the fallback when Mistral did not embed a page image in its response
    (which happens for watermark-heavy pages it could not parse).  We render the
    page ourselves at 200 DPI — high enough for Mistral OCR to read clearly,
    low enough to stay within the API image-size limit.

    Args:
        pdf_path: Path to the original PDF file.
        page_num: 1-based page number to render.
        dpi:      Render resolution (200 DPI is a good default).

    Returns:
        Base64-encoded JPEG string, or "" on failure.
    """
    try:
        from pdf2image import convert_from_path
        import io
        images = convert_from_path(
            str(pdf_path),
            dpi=dpi,
            first_page=page_num,
            last_page=page_num,
        )
        if not images:
            return ""
        buf = io.BytesIO()
        images[0].save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        print(f"    ⚠️  pdf2image render failed for page {page_num}: {e}")
        return ""


def _reocr_page_via_image(client: Any, page: dict, page_num: int,
                           model: str, pdf_path: Optional[Path] = None) -> str:
    """Re-OCR a single corrupted page by sending a bitmap image to Mistral OCR.

    Strategy (in priority order):
    1. Use the image already embedded in the Mistral response (page["images"]).
       This is fastest — no extra rendering needed.
    2. If the response has no embedded image (happens for watermark-heavy pages
       that Mistral failed to parse), render the page from the original PDF using
       pdf2image and send that bitmap instead.

    Sending a bitmap bypasses the watermark text layer entirely: Mistral OCR
    reads what is visually printed on the page, not the hidden spam URL layer.
    """
    # ── Strategy 1: use embedded image from Mistral response ──────────────────
    page_images = page.get("images", [])
    if not page_images and "image_base64" in page:
        page_images = [page]

    b64 = ""
    if page_images and isinstance(page_images[0], dict):
        img = page_images[0]
        b64 = (
            img.get("image_base64") or
            img.get("image_data")   or
            img.get("data")         or
            img.get("base64")       or
            page.get("image_base64", "")
        )

    # ── Strategy 2: render from original PDF if no embedded image ─────────────
    if not b64:
        if pdf_path is None:
            print(f"    ⚠️  Page {page_num}: no embedded image and no pdf_path — cannot re-OCR")
            return ""
        print(f"    ℹ️  Page {page_num}: no embedded image — rendering from PDF at 200 DPI...")
        b64 = _render_pdf_page_to_b64(pdf_path, page_num)
        if not b64:
            print(f"    ⚠️  Page {page_num}: PDF render failed — cannot re-OCR")
            return ""
        print(f"    ✅  Page {page_num}: rendered from PDF ({len(b64):,} bytes b64)")

    # Send image to Mistral OCR
    # Strip data URI prefix if present (Mistral returns full data URIs in image_base64)
    if b64.startswith("data:"):
        b64 = b64.split(",", 1)[1] if "," in b64 else b64
    try:
        resp = client.ocr.process(
            model=model,
            document={"type": "image_url",
                      "image_url": f"data:image/jpeg;base64,{b64}"},
            include_image_base64=False,
        )
        r = _response_to_dict(resp)
        if hasattr(resp, "content") and resp.content:
            return resp.content
        if "pages" in r:
            return "\n\n".join(
                p["markdown"] for p in r["pages"]
                if isinstance(p, dict) and p.get("markdown", "").strip()
            )
        return ""
    except Exception as e:
        print(f"    ⚠️  Page {page_num}: Mistral image OCR call failed: {e}")
        return ""


def _extract_markdown(ocr_response: Any, raw: Dict[str, Any],
                      client: Any = None, model: str = DEFAULT_MODEL,
                      pdf_path: Optional[Path] = None) -> str:
    """Extract text from OCR response, recovering watermark-corrupted pages.

    For each page, checks whether Mistral's text output is dominated by
    watermark spam.  If so, and a client is available, re-submits the page's
    bitmap image (embedded or rendered from the PDF) to Mistral OCR to obtain
    the real content.
    """
    if hasattr(ocr_response, "content") and ocr_response.content:
        return ocr_response.content

    if "pages" not in raw:
        return ""

    pages_content = []
    corrupted = []

    for idx, page in enumerate(raw["pages"]):
        if not isinstance(page, dict):
            continue
        md       = page.get("markdown", "")
        page_num = idx + 1

        if not _is_watermark_corrupted(md):
            # ── Inject page marker so pdf_unit_splitter can map lines → pages exactly ──
            pages_content.append(f"<!-- PAGE {page_num} -->\n{md}")
            continue

        # Page is corrupted — attempt recovery
        corrupted.append(page_num)
        print(f"  ⚠️  Page {page_num}: watermark corruption detected — re-OCRing via page image...")
        recovered = ""
        if client is not None:
            recovered = _reocr_page_via_image(client, page, page_num, model, pdf_path)

        if recovered and not _is_watermark_corrupted(recovered):
            print(f"  ✅  Page {page_num}: recovered {len(recovered):,} chars via image re-OCR")
            pages_content.append(f"<!-- PAGE {page_num} -->\n{recovered}")
        else:
            print(f"  ❌  Page {page_num}: recovery failed — content will be missing from output")
            pages_content.append(f"<!-- PAGE {page_num} -->")  # placeholder keeps page count correct

    if corrupted:
        print(f"  📊 {len(corrupted)} corrupted page(s) detected: {corrupted}")

    return "\n\n".join(pages_content)


# ═══════════════════════════════════════════════════════════════════════════════
# Vision OCR Fallback — for pages where Mistral OCR produces garbled output
# ═══════════════════════════════════════════════════════════════════════════════

def _detect_low_quality_pages(markdown: str) -> List[int]:
    """
    Scan OCR output for pages with garbled/incomplete text.
    Returns list of 1-indexed page numbers that need re-OCR.
    
    Heuristics:
    - Very high blank-line ratio (>70%) with images present but little text
    - Fragmented text: many short non-empty lines mixed with blank lines
    - Content significantly shorter than expected for a full page
    """
    import re as _re
    pages = _re.split(r'<!-- PAGE (\d+) -->', markdown)
    bad_pages = []
    
    for i in range(1, len(pages) - 1, 2):
        page_num = int(pages[i])
        page_text = pages[i + 1]
        lines = page_text.split('\n')
        non_empty = [l for l in lines if l.strip()]
        total = len(lines)
        
        if total < 3:
            continue  # Skip mostly-empty pages (e.g. blank separators)
        
        # Count meaningful text (excluding image refs and page headers)
        text_lines = [l for l in non_empty 
                      if not l.strip().startswith('![') 
                      and not l.strip().startswith('<!-- ')
                      and len(l.strip()) > 5]
        text_chars = sum(len(l) for l in text_lines)
        has_images = any('img-' in l or '![' in l for l in non_empty)
        blank_ratio = 1 - (len(non_empty) / max(total, 1))
        avg_line_len = sum(len(l) for l in text_lines) / max(len(text_lines), 1)
        
        # Heuristic 1: Mostly blank with images but very little text
        # (typical for scrapbook/postcard pages)
        if blank_ratio > 0.5 and text_chars < 800 and has_images:
            bad_pages.append(page_num)
            continue
        
        # Heuristic 2: Fragmented text — many very short lines indicate garbled OCR
        if len(text_lines) > 5 and avg_line_len < 40 and text_chars < 800:
            bad_pages.append(page_num)
            continue
            
        # Heuristic 3: Page has significant content gaps (lots of blank runs)
        blank_runs = len(_re.findall(r'\n{4,}', page_text))
        if blank_runs >= 2 and text_chars < 1200 and has_images:
            bad_pages.append(page_num)
            continue
    
    return bad_pages


def _vision_reocr_pages(
    pdf_path: Path, 
    page_numbers: List[int], 
    api_key: str,
    model: str = "gpt-4o"
) -> Dict[int, str]:
    """
    Re-OCR specific pages using GPT-4o Vision.
    
    Args:
        pdf_path: Path to the PDF file
        page_numbers: 1-indexed page numbers to re-OCR
        api_key: OpenAI API key
        model: Vision model to use (default: gpt-4o)
    
    Returns:
        Dict mapping page_number -> extracted markdown text
    """
    try:
        import fitz  # PyMuPDF
        has_fitz = True
    except ImportError:
        has_fitz = False
        try:
            import pypdfium2 as pdfium
            has_pdfium = True
        except ImportError:
            has_pdfium = False
            print("    ❌ Neither PyMuPDF (fitz) nor pypdfium2 installed. Required for Vision re-OCR.")
            print("    Run: pip install pymupdf  (or: pip install pypdfium2)")
            return results

    import base64
    import httpx
    
    results = {}
    
    try:
        if has_fitz:
            doc = fitz.open(str(pdf_path))
        else:
            doc = pdfium.PdfDocument(str(pdf_path))
    except Exception as e:
        print(f"    ❌ Failed to open PDF for vision re-OCR: {e}")
        return results
    
    for page_num in page_numbers:
        page_idx = page_num - 1  # 0-indexed
        
        try:
            num_pages = len(doc) if has_fitz else len(doc)
            if page_idx < 0 or page_idx >= num_pages:
                print(f"    ⚠️  Page {page_num} out of range (PDF has {num_pages} pages)")
                continue

            if has_fitz:
                # Render with PyMuPDF
                page = doc[page_idx]
                mat = fitz.Matrix(200 / 72, 200 / 72)  # 200 DPI
                pix = page.get_pixmap(matrix=mat)
                img_bytes = pix.tobytes("png")
            else:
                # Render with pypdfium2
                page = doc[page_idx]
                bitmap = page.render(scale=200/72) # scale from 72 DPI to 200 DPI
                pil_image = bitmap.to_pil()
                import io
                buf = io.BytesIO()
                pil_image.save(buf, format="PNG")
                img_bytes = buf.getvalue()

            img_b64 = base64.b64encode(img_bytes).decode("utf-8")
            
            # Call GPT-4o Vision
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are an expert OCR system. Extract ALL text from this textbook page "
                            "exactly as it appears. Preserve the structure: headings, paragraphs, lists, "
                            "dates, signatures, and any handwritten-style text. Output in clean markdown. "
                            "For images/illustrations, use ![description](image) placeholder. "
                            "Do NOT skip any text, even decorative or small text."
                        )
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Extract ALL text from this textbook page. Include every word, date, salutation, and signature. Output as clean markdown."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{img_b64}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 4096,
                "temperature": 0.1
            }
            
            with httpx.Client(timeout=60) as http_client:
                resp = http_client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
                resp.raise_for_status()
                data = resp.json()
            
            extracted = data["choices"][0]["message"]["content"]
            results[page_num] = extracted
            print(f"    ✅ Page {page_num}: Vision re-OCR extracted {len(extracted)} chars")
            
        except Exception as e:
            print(f"    ❌ Vision re-OCR failed for page {page_num}: {e}")
    
    doc.close()
    return results


def _patch_markdown_pages(markdown: str, vision_results: Dict[int, str]) -> str:
    """
    Replace specific page content in the markdown with vision-extracted text.
    
    Args:
        markdown: Original OCR markdown with <!-- PAGE N --> markers
        vision_results: Dict mapping page_number -> new text from vision OCR
    
    Returns:
        Patched markdown with vision-extracted pages replacing original bad pages
    """
    import re as _re
    
    if not vision_results:
        return markdown
    
    pages = _re.split(r'(<!-- PAGE \d+ -->)', markdown)
    result_parts = []
    
    for i, part in enumerate(pages):
        m = _re.match(r'<!-- PAGE (\d+) -->', part)
        if m:
            page_num = int(m.group(1))
            result_parts.append(part)  # Keep the marker
            if page_num in vision_results:
                # Replace next content block with vision text
                if i + 1 < len(pages):
                    pages[i + 1] = "\n" + vision_results[page_num] + "\n"
        else:
            result_parts.append(part)
    
    return "".join(result_parts)


def _extract_text_from_images(markdown: str, raw_ocr_response: Dict[str, Any], api_key: str, model: str = "gpt-4o-mini") -> Tuple[str, int, Dict[str, Dict[str, str]]]:
    """
    Finds isolated image references in markdown, looks up their base64 in the OCR response,
    and uses a Vision LLM to see if they are text boxes (like 'DO YOU KNOW').
    If they are, replaces the image reference with the extracted text.
    Also returns a rich dictionary of image descriptions.
    """
    import re as _re
    import httpx
    import json
    
    # 1. Map all image filenames to their base64 in raw_ocr_response
    image_b64_map = {}
    for page in raw_ocr_response.get("pages", []):
        for img in page.get("images", []):
            img_id = img.get("id")
            b64 = img.get("image_base64")
            if img_id and b64:
                # Strip data URI prefix if present (Mistral returns full data URIs)
                # e.g. "data:image/jpeg;base64,/9j/..." -> "/9j/..."
                if b64.startswith("data:"):
                    b64 = b64.split(",", 1)[1] if "," in b64 else b64
                # Add .jpeg if missing to match Mistral output conventions
                filename = img_id if '.' in img_id else f"{img_id}.jpeg"
                image_b64_map[filename] = b64
                # Also index without extension
                image_b64_map[img_id] = b64

    # 2. Find all markdown image tags: ![caption](filename)
    pattern = _re.compile(r'!\[.*?\]\((img-[^\)]+)\)')
    matches = list(pattern.finditer(markdown))
    image_metadata = {}
    if not matches:
        return markdown, 0, image_metadata

    replacements = 0
    new_markdown = markdown
    
    print(f"  🔍 Vision Pass: Checking {len(matches)} images using {model}...")

    # Set up HTTP client for OpenAI
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt = (
        "You are an expert OCR vision model. The user has provided an image cropped from a textbook. "
        "Your task is to analyze the image and return ONLY a valid JSON object with the following schema:\n"
        "{\n"
        "  \"is_text_box\": <boolean>,\n"
        "  \"extracted_text\": <string or null>,\n"
        "  \"description\": <string or null>\n"
        "}\n\n"
        "Rules:\n"
        "1. If the image is PRIMARILY a text box (like 'Do you know', 'Fact' box, text snippet, or a table of text), set 'is_text_box' to true, "
        "and provide the exact markdown text in 'extracted_text'. The 'description' can be null.\n"
        "2. If the image is primarily an illustration, photograph, or diagram, set 'is_text_box' to false, "
        "extract any minor label text into 'extracted_text' (if applicable), and provide a concise, descriptive caption in 'description'.\n"
        "Do not include any markdown formatting around the JSON (e.g., no ```json)."
    )

    # Use httpx to call OpenAI API for each image
    with httpx.Client(timeout=60) as http_client:
        for match in matches:
            filename = match.group(1).strip()
            basename = filename.split('/')[-1]
            b64 = image_b64_map.get(basename) or image_b64_map.get(basename.split('.')[0])
            
            if not b64:
                continue
                
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Analyze the image and return the JSON object."},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "high"}}
                        ]
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0.0
            }

            try:
                resp = http_client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                resp.raise_for_status()
                raw_out = resp.json()["choices"][0]["message"]["content"].strip()
                
                # Parse JSON
                if raw_out.startswith("```json"):
                    raw_out = raw_out[7:]
                if raw_out.endswith("```"):
                    raw_out = raw_out[:-3]
                
                output = json.loads(raw_out.strip())
                is_text_box = output.get("is_text_box", False)
                extracted_text = output.get("extracted_text", "")
                
                # Save metadata for S3 schema
                image_metadata[filename] = output
                
                if is_text_box and extracted_text:
                    # Replace in markdown
                    original_tag = match.group(0)
                    new_markdown = new_markdown.replace(original_tag, f"\n\n{extracted_text}\n\n")
                    replacements += 1
                    print(f"    ✨ Recovered text box from {filename} ({len(extracted_text)} chars)")
                else:
                    print(f"    🖼️  Processed illustration {filename}")
            except Exception as e:
                print(f"    ❌ Failed to evaluate {filename} with Vision: {e}")

    return new_markdown, replacements, image_metadata


def extract_with_mistral_ocr(
    client: Mistral,
    pdf_path: Path,
    model: str = DEFAULT_MODEL,
    use_upload_flow: bool = True
) -> Optional[Dict[str, Any]]:
    langfuse = get_langfuse_client() if LANGFUSE_AVAILABLE else None
    
    file_size_mb = pdf_path.stat().st_size / (1024 * 1024)
    
    # Get key from environment directly for logging verification
    actual_key = os.getenv("MISTRAL_API_KEY", "UNKNOWN")
    masked_key = f"{actual_key[:4]}...{actual_key[-4:]}" if len(actual_key) > 8 else (actual_key[:2] + "***" if len(actual_key) > 2 else "***")
    
    print(f"  Extracting PDF with Mistral OCR ({pdf_path.name}, {file_size_mb:.2f} MB)...")
    print(f"  🔑 Using API Key: {masked_key}")
    
    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            if use_upload_flow:
                with pdf_path.open("rb") as f:
                    uploaded = client.files.upload(
                        file={"file_name": pdf_path.name, "content": f},
                        purpose="ocr"
                    )
                signed = client.files.get_signed_url(file_id=uploaded.id)
                document = {"type": "document_url", "document_url": signed.url}
            else:
                pdf_b64 = b64_encode_pdf(pdf_path)
                document = {"type": "document_url", "document_url": f"data:application/pdf;base64,{pdf_b64}"}
            
            ocr_response = client.ocr.process(
                model=model,
                document=document,
                include_image_base64=True
            )
            
            raw = _response_to_dict(ocr_response)
            markdown = _extract_markdown(ocr_response, raw, client=client, model=model, pdf_path=pdf_path)
            
            if langfuse:
                update_generation_safely(langfuse,
                    model=model,
                    output={"extracted_length": len(markdown)}
                )
            
            return {
                "success": True,
                "raw": raw,
                "markdown": markdown,
                "model": model
            }
        except Exception as e:
            error_msg = str(e)
            # Try to get more detail from Mistral SDKError
            if hasattr(e, "http_res") and hasattr(e.http_res, "text"):
                try:
                    error_msg += f" | Body: {e.http_res.text}"
                except: pass

            if attempt < max_retries - 1:
                print(f"  ⚠️  Mistral API error (Attempt {attempt+1}/{max_retries}): {error_msg}")
                print(f"      Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                print(f"  ❌ Mistral API error after {max_retries} attempts: {error_msg}")
                import traceback
                traceback.print_exc()
                return {"success": False, "error": error_msg}
                
    return {"success": False, "error": "Maximum retries exceeded"}



def extract_toc_structure(markdown: str) -> Dict[str, List[int]]:
    """
    SMART: Only extracts actual subject parts from TOC.
    
    Identifies parts by the pattern:
    | PartName |   |   |   |  (all other columns empty)
    
    Ignores:
    - Table headers
    - Page numbers  
    - Random text
    - Country names
    - Image captions
    
    Returns: {"History": [1,2,3,...], "Geography": [1,2,...], ...}
    """
    lines = markdown.split('\n')
    
    print(f"\n  📖 Analyzing Table of Contents...")
    
    # Find TOC section
    toc_start = None
    for i, line in enumerate(lines):
        if 'table of contents' in line.lower():
            toc_start = i
            print(f"  ✅ Found TOC at line {i}")
            break
    
    if not toc_start:
        print(f"  ⚠️  No TOC found")
        return {}
    
    # Extract TOC region
    toc_end = min(toc_start + 200, len(lines))
    toc_lines = lines[toc_start:toc_end]
    
    parts_structure = {}
    current_part = None
    
    for line_idx, line in enumerate(toc_lines):
        line_stripped = line.strip()
        
        # Skip non-table lines
        if not line_stripped or not line_stripped.startswith('|'):
            continue
        
        # Parse table row
        columns = [c.strip() for c in line_stripped.split('|')]
        
        # Need at least 4 columns: | col1 | col2 | col3 | col4 |
        # Actual split gives: ['', 'col1', 'col2', 'col3', 'col4', '']
        if len(columns) < 4:
            continue
        
        # columns[0] is empty (before first |)
        # columns[-1] is empty (after last |)
        # Real columns are columns[1:-1]
        real_columns = columns[1:-1]
        
        if len(real_columns) < 4:
            continue
        
        first_col = real_columns[0]
        other_cols = real_columns[1:]
        
        # CRITICAL RULE: Part header = name in first column, ALL other columns EMPTY
        # Example: | History  |   |   |   |
        if first_col and all(not col or col == '' for col in other_cols):
            # Additional validation: 
            # - Not a separator line (---)
            # - Not a single letter/number (IV, VI)
            # - Reasonable length (2-20 chars)
            # - Starts with capital letter
            if (first_col != '---' and 
                not first_col.isdigit() and 
                2 <= len(first_col) <= 20 and 
                first_col[0].isupper() and
                not first_col.startswith('Unit')):
                
                # Verify this is followed by unit entries
                has_units_after = False
                for check_idx in range(line_idx + 1, min(line_idx + 15, len(toc_lines))):
                    check_line = toc_lines[check_idx].strip()
                    if check_line.startswith('|'):
                        check_cols = [c.strip() for c in check_line.split('|')]
                        if len(check_cols) > 2 and check_cols[1].isdigit():
                            has_units_after = True
                            break
                
                if has_units_after:
                    current_part = first_col
                    parts_structure[current_part] = []
                    print(f"  📚 Discovered part: {current_part}")
                    continue
        
        # Extract unit number if we're in a part
        if current_part and first_col.isdigit():
            unit_num = int(first_col)
            if unit_num not in parts_structure[current_part]:
                parts_structure[current_part].append(unit_num)
    
    # Sort unit numbers
    for part in parts_structure:
        parts_structure[part].sort()
    
    print(f"\n  📊 TOC Structure:")
    for part, units in parts_structure.items():
        print(f"     {part}: {len(units)} units {units}")
    
    return parts_structure


def find_part_in_content(markdown: str, part_name: str, toc_structure: Dict[str, List[int]]) -> Tuple[int, int]:
    """
    Find where a specific part starts and ends in the content.
    
    FIXED: Properly searches for explicit headers like "# CIVICS" and "# ECONOMICS"
    
    Uses multiple strategies:
    1. Look for part name as markdown header (e.g., "# CIVICS")
    2. Look for part name as standalone text (e.g., "HISTORY")
    3. Look for first unit of this part by counting occurrences
    
    Returns: (start_line, end_line)
    """
    lines = markdown.split('\n')
    
    print(f"\n  🔍 Searching for {part_name} section in content...")
    
    # Strategy 1: Find part name in content
    part_start = None
    part_upper = part_name.upper()
    
    for line_idx, line in enumerate(lines):
        # Skip TOC area
        if line_idx < 300:
            if 'table of contents' in line.lower():
                continue
        
        line_stripped = line.strip()
        line_upper = line_stripped.upper()
        
        # Check for markdown header: "# CIVICS", "## Geography"
        if line_stripped.startswith('#'):
            # Remove all # symbols and whitespace
            header_text = re.sub(r'^#+\s*', '', line_stripped).upper()
            if header_text == part_upper:
                part_start = line_idx
                print(f"  ✅ Found {part_name} (markdown header) at line {line_idx}: {line[:60]}")
                break
        
        # Check for plain text: "HISTORY", "GEOGRAPHY"
        elif line_upper == part_upper:
            # Verify this is not in TOC by checking for units after it
            has_units = False
            for check_idx in range(line_idx + 1, min(line_idx + 50, len(lines))):
                check_line = lines[check_idx].strip()
                if re.match(r'^#+ Unit', check_line, re.IGNORECASE) or 'Unit - 1' in check_line:
                    has_units = True
                    break
            
            if has_units:
                part_start = line_idx
                print(f"  ✅ Found {part_name} (plain text) at line {line_idx}: {line[:60]}")
                break
    
    # Strategy 2: If not found by name, find by counting Unit 1 occurrences
    if part_start is None and part_name in toc_structure:
        first_unit = toc_structure[part_name][0] if toc_structure[part_name] else 1
        print(f"  🔍 Looking for Unit {first_unit} to locate {part_name}...")
        
        # Find all Unit headers
        unit_positions = []
        for line_idx, line in enumerate(lines):
            if line_idx < 300:  # Skip TOC
                continue
            if re.match(r'^#+ Unit\s*-?\s*\d+', line, re.IGNORECASE):
                # Extract unit number
                match = re.search(r'Unit\s*-?\s*(\d+)', line, re.IGNORECASE)
                if match:
                    unit_num = int(match.group(1))
                    unit_positions.append((unit_num, line_idx))
        
        # FIXED: Find the Nth occurrence of "Unit 1" based on part order
        # If this is the 3rd part with Unit 1, find the 3rd "Unit 1" in content
        
        # Count how many parts before this one also start with Unit 1
        parts_before = list(toc_structure.keys())[:list(toc_structure.keys()).index(part_name)]
        unit_1_count_before = sum(1 for p in parts_before if toc_structure[p] and toc_structure[p][0] == 1)
        
        # Find the (unit_1_count_before + 1)th occurrence of Unit 1
        unit_1_occurrences = [idx for num, idx in unit_positions if num == 1]
        
        if len(unit_1_occurrences) > unit_1_count_before:
            part_start = unit_1_occurrences[unit_1_count_before]
            print(f"  ✅ Found {part_name} at occurrence #{unit_1_count_before + 1} of Unit 1, line {part_start}")
        else:
            # Fallback: look for any unit from this part
            for expected_unit in toc_structure[part_name][:3]:  # Check first 3 units
                for unit_num, line_idx in unit_positions:
                    if unit_num == expected_unit and line_idx > (part_start or 0):
                        part_start = line_idx
                        print(f"  ✅ Found {part_name} by locating Unit {expected_unit} at line {line_idx}")
                        break
                if part_start:
                    break
    
    if part_start is None:
        print(f"  ❌ Could not locate {part_name} section")
        return (0, 0)
    
    return (part_start, -1)  # End will be determined by next part or EOF


def detect_parts_from_toc_universal(markdown: str) -> List[Tuple[str, int, int]]:
    """
    TRULY UNIVERSAL: Automatically discovers parts from TOC and locates them.
    
    Returns: [(part_name, start_line, end_line), ...]
    
    Works for ANY textbook structure!
    """
    # Step 1: Read TOC to discover structure
    toc_structure = extract_toc_structure(markdown)
    
    if not toc_structure:
        print(f"  ⚠️  Could not extract TOC structure, using fallback")
        return []
    
    # Step 2: Find each part in the actual content
    part_boundaries = []
    
    for part_name in toc_structure.keys():
        start_line, _ = find_part_in_content(markdown, part_name, toc_structure)
        if start_line > 0:
            part_boundaries.append((part_name, start_line, toc_structure[part_name]))
    
    # Sort by start line
    part_boundaries.sort(key=lambda x: x[1])
    
    # Step 3: Determine end boundaries
    final_boundaries = []
    lines = markdown.split('\n')
    
    for i, (part_name, start_line, units) in enumerate(part_boundaries):
        if i < len(part_boundaries) - 1:
            end_line = part_boundaries[i + 1][1]
        else:
            end_line = len(lines)
        
        final_boundaries.append((part_name, start_line, end_line, units))
    
    print(f"\n  📏 Final part boundaries:")
    for part_name, start, end, units in final_boundaries:
        print(f"     {part_name}: lines {start:,} to {end:,} ({len(units)} units: {units})")
    
    return [(name, start, end) for name, start, end, _ in final_boundaries]



# REST OF THE CODE (UNCHANGED FROM PREVIOUS VERSION)


def extract_part_content(markdown: str, part_name: str, start_line: int, end_line: int) -> str:
    lines = markdown.split('\n')
    part_lines = lines[start_line:end_line]
    content = '\n'.join(part_lines)
    print(f"  📄 Extracted {len(part_lines):,} lines for {part_name} ({len(content):,} chars)")
    return content


def _print_markdown_sample(markdown: str, label: str = "markdown sample") -> None:
    """Print a diagnostic sample from the markdown to help debug header format issues."""
    lines = markdown.split('\n')
    # Find first non-empty, non-TOC-looking line after line 50 (skip cover/TOC pages)
    sample_start = 0
    for i, line in enumerate(lines):
        if i > 50 and line.strip() and not line.strip().startswith('|'):
            sample_start = i
            break
    sample_lines = [l for l in lines[sample_start:sample_start + 80] if l.strip()][:30]
    print(f"\n  📋 {label} (lines {sample_start}–{sample_start+80}, non-empty):")
    for l in sample_lines:
        print(f"     {repr(l)}")
    print()


def _build_chapter_title_map(markdown: str) -> Dict[int, str]:
    """
    Build {chapter_number -> ALL_CAPS_TITLE} from the TOC for math books.
    e.g. {1: 'RELATIONS AND FUNCTIONS', 2: 'NUMBERS AND SEQUENCES', ...}
    Used so _match_header can map '# RELATIONS AND FUNCTIONS' → chapter 1.
    Also handles science/soc-sci unit name lists.
    """
    lines = markdown.split('\n')
    result: Dict[int, str] = {}

    toc_start = None
    for i, line in enumerate(lines[:400]):
        s = line.strip().upper()
        if s in ('CONTENT', 'CONTENTS', 'TABLE OF CONTENTS',
                 '# CONTENT', '# CONTENTS', '## CONTENT', '## CONTENTS'):
            toc_start = i
            break

    if toc_start is None:
        return result

    toc_end = min(toc_start + 300, len(lines))
    table_row_re = re.compile(r'^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|')

    for line in lines[toc_start:toc_end]:
        m = table_row_re.match(line)
        if m:
            n = int(m.group(1))
            title = m.group(2).strip()
            # Only accept clean chapter/unit titles (no sub-section like "1.1")
            if 1 <= n <= 50 and title and not re.match(r'^\d+\.\d+', title):
                result[n] = title.upper()

    return result


def _find_chapter_numbers_from_body(markdown: str) -> List[int]:
    """
    Scan the body (skip first 200 lines = cover/TOC) for ANY of the chapter header
    formats that Mistral OCR commonly produces for Indian state-board textbooks.

    Supported formats (most → least common):
      A  # RELATIONS AND FUNCTIONS    (ALL-CAPS title H1 — primary TN math format)
      B  10th_Maths_Chapter N_English.indd 1  (page stamp at chapter start)
      C  # Chapter 1 Relations        (markdown H1)
      D  ## Chapter 1                 (markdown H2)
      E  **Chapter 1**  or  **Chapter 1 –**  (bold, standalone line)
      F  # 1. Relations               (numbered markdown header)
      G  ## 1.1                       (section → implies chapter)
    """
    lines = markdown.split('\n')
    body_lines = lines[200:]

    found = set()

    # Build title→number mapping from the TOC so we can decode ALL-CAPS titles
    title_map = _build_chapter_title_map(markdown)   # {number -> TITLE}
    title_to_num = {v: k for k, v in title_map.items()}  # {TITLE -> number}

    for line in body_lines:
        s = line.strip()
        if not s:
            continue

        # A: ALL-CAPS H1 title — e.g. "# RELATIONS AND FUNCTIONS"
        if s.startswith('#'):
            header_text = re.sub(r'^#+\s*', '', s).strip()
            if header_text.isupper() and len(header_text) >= 4:
                num = title_to_num.get(header_text)
                if num is not None:
                    found.add(num)
                    continue

        # B: page stamp "10th_Maths_Chapter N_English.indd 1"
        m = re.match(r'10th_Maths_Chapter\s+(\d+)_English\.indd\s+1\b', s)
        if m:
            found.add(int(m.group(1)))
            continue

        # C & D: markdown heading with "Chapter N"
        m = re.match(r'^#{1,3}\s*Chapter\s+(\d+)', s, re.IGNORECASE)
        if m:
            found.add(int(m.group(1)))
            continue

        # E: bold "Chapter N" (with optional dash/title after)
        m = re.match(r'^\*{1,2}Chapter\s+(\d+)\b', s, re.IGNORECASE)
        if m:
            found.add(int(m.group(1)))
            continue

        # F: "# N.M Title" section header (H1-H4) → implies chapter N
        m = re.match(r'^#{1,4}\s*(\d+)\.(\d+)', s)
        if m:
            n = int(m.group(1))
            if 1 <= n <= 20:
                found.add(n)
            continue

    return sorted(found)


def _extract_chapters_from_toc(markdown: str) -> List[int]:
    """
    PRIMARY strategy: read the Table of Contents to get the definitive
    list of chapter/unit numbers for ANY subject.

    Handles both table-style TOC (math):
        | 1 | Relations and Functions | 1-35 |
        | 2 | Numbers and Sequences  | 36-84|
    And list-style TOC (science/soc-sci):
        1. Measurement
        2. Force and Motion
        ...

    Returns sorted list of chapter/unit numbers, empty list if no TOC found.
    """
    lines = markdown.split('\n')

    # Find the TOC section — look for "CONTENT" or "TABLE OF CONTENTS" header
    toc_start = None
    for i, line in enumerate(lines[:400]):
        s = line.strip().upper()
        if s in ('CONTENT', 'CONTENTS', 'TABLE OF CONTENTS', '# CONTENT',
                 '# CONTENTS', '## CONTENT', '## CONTENTS'):
            toc_start = i
            print(f"  📖 Found TOC at line {i}: {repr(line.strip())}")
            break
        # English textbooks: TOC is a Markdown table with "Unit | Contents | Page..." header
        if ('UNIT' in s and 'CONTENT' in s and line.strip().startswith('|')):
            toc_start = i
            print(f"  📖 Found English TOC table at line {i}: {repr(line.strip()[:60])}")
            break

    if toc_start is None:
        print(f"  ℹ️  No TOC header found — falling back to body scan")
        return []

    # Scan up to 300 lines of TOC, but stop as soon as the TOC table ends
    toc_end = min(toc_start + 300, len(lines))
    numbers: set = set()

    # Pattern A: table row  | N | Title | pages |  (chapter/unit number in col 1)
    table_row_re = re.compile(r'^\|\s*(\d+)\s*\|[^|]+\|')
    # Pattern B: numbered list  "1. Title" or "1 Title"
    list_row_re  = re.compile(r'^\s*(\d+)[.\)]\s+[A-Z]')
    # Pattern C: "Chapter N" or "Unit N" in table  | Chapter 1 | ...
    chapter_col_re = re.compile(r'^\|\s*(?:Chapter|Unit)\s+(\d+)\s*\|', re.IGNORECASE)
    # For English books: col 2 must be a known content type (not a word or page number)
    english_unit_re = re.compile(
        r'^\|\s*(\d+)\s*\|\s*(Prose|Poem\*?|Drama|Supplementary|Fiction|Non-fiction)\s*\|',
        re.IGNORECASE
    )

    in_table = False  # Track whether we are inside a markdown table
    consecutive_non_table = 0

    for line in lines[toc_start:toc_end]:
        stripped = line.strip()

        # Detect table presence / exit
        if stripped.startswith('|'):
            in_table = True
            consecutive_non_table = 0
        else:
            if in_table:
                consecutive_non_table += 1
                # Two consecutive non-empty, non-table lines after a table = TOC ended
                if consecutive_non_table >= 2 and stripped:
                    break
            continue

        # Skip separator rows
        if re.match(r'^\s*\|[\s\-|]+\|', line):
            continue

        # For English-style TOC (Unit | ContentType | Title | Page | Month),
        # only accept rows where col 2 is a known content type to avoid
        # matching numbered vocabulary/exercise tables in the body.
        m_eng = english_unit_re.match(stripped)
        if m_eng:
            n = int(m_eng.group(1))
            if 1 <= n <= 50:
                numbers.add(n)
            continue  # Don't fall through to generic patterns for this line

        m = table_row_re.match(line) or chapter_col_re.match(line) or list_row_re.match(line)
        if m:
            n = int(m.group(1))
            # Sanity: chapter/unit numbers are almost always 1-50
            if 1 <= n <= 50:
                numbers.add(n)

    result = sorted(numbers)
    if result:
        print(f"  📚 TOC-derived chapter/unit list: {result}")
    else:
        print(f"  ⚠️  TOC found but no numbers extracted")
    return result


def infer_units_or_chapters_from_markdown(markdown: str, subject: str) -> List[int]:
    """
    ALWAYS read the TOC first to get the authoritative chapter/unit list.
    Body scan is used only as a fallback when TOC parsing yields nothing.
    This fixes:
      • Science Unit 15 missing (was relying on '## 15.x' subsection headers)
      • Math chapters being miscounted or skipped
      • Any unit whose content uses a non-standard header format
    """
    # ── Step 0: .indd stamp unit number (highest priority) ───────────────────
    # Single-unit PDFs produced by Tamil Nadu Board press always carry a stamp
    # like "11_Geography_Unit_1_EM.indd" that encodes the exact unit number.
    # This is the ground truth — if found, it takes priority over any TOC parse.
    # We extract it first so we can sanity-check any TOC result against it.
    _indd_unit_m = re.search(
        r'\d+_[A-Za-z]+_Unit_(\d+)_EM\.indd',
        markdown[:3000], re.IGNORECASE
    )
    _stamp_unit = int(_indd_unit_m.group(1)) if _indd_unit_m else None
    if _stamp_unit:
        print(f"  🔖 .indd stamp says this is Unit {_stamp_unit}")

    # ── Step 1: TOC-first (works for ALL subjects) ────────────────────────────
    # FIX 3: Try robust multi-format parser first, fall back to original
    toc_numbers = _extract_chapters_from_toc_robust(markdown)
    if not toc_numbers:
        toc_numbers = _extract_chapters_from_toc(markdown)
    if toc_numbers:
        # Sanity-check: if the stamp says single-unit but TOC returned multiple,
        # the TOC parser likely picked up a body-content numbered list.
        # Override with stamp when:
        #   • stamp unit is not in the TOC list at all (clear false positive), OR
        #   • TOC list has > 3 numbers but stamp says it's a single-unit file
        #     AND none of the TOC numbers correspond to real "# Unit - N" headers.
        if _stamp_unit is not None:
            real_unit_headers = set(int(m) for m in re.findall(
                r'(?:^|\n)#{1,3}\s*[Uu]nit\s*[-–]?\s*(\d+)', markdown
            ))
            toc_set = set(toc_numbers)
            # If stamp unit not in TOC list → TOC is wrong
            if _stamp_unit not in toc_set:
                print(f"  ⚠️  TOC list {toc_numbers} does not include stamp unit "
                      f"{_stamp_unit} — overriding with stamp")
                return [_stamp_unit]
            # If TOC has multiple units but real unit headers only show one,
            # the extras came from a body list, not a real TOC
            if len(toc_numbers) > 1 and len(real_unit_headers) <= 1:
                print(f"  ⚠️  TOC returned {toc_numbers} but only {real_unit_headers or {_stamp_unit}} "
                      f"unit header(s) found in body — overriding with stamp [{_stamp_unit}]")
                return [_stamp_unit]
        return toc_numbers

    # ── Step 2: Body scan fallback ────────────────────────────────────────────
    if subject == "mathematics":
        numbers = _find_chapter_numbers_from_body(markdown)
        if numbers:
            print(f"  🔍 Detected chapters from body scan: {numbers}")
            return numbers

        # Diagnostic when nothing is found
        print(f"  ⚠️  Body scan found no chapters — dumping sample for diagnosis:")
        _print_markdown_sample(markdown, "body chapter header sample")

        # Last-resort: simple numbered list in TOC area
        toc_chapter_pattern = r'^\s*(\d+)\.\s+[A-Z][A-Za-z\s\-]+\s*$'
        toc_matches = re.findall(toc_chapter_pattern, markdown, re.MULTILINE)
        numbers = sorted(set(int(m) for m in toc_matches if 1 <= int(m) <= 15))
        if 1 <= len(numbers) <= 15:
            print(f"  🔍 Detected chapters from TOC pattern (last-resort): {numbers}")
            return numbers

        print(f"  ℹ️  No chapter markers found at all")
        return []

    # Science / Social Science body scan
    # Try subsection numbering first  "## 2.1"
    pattern = r'^#{2,6}\s*(\d+)\.(\d+)'
    matches = re.findall(pattern, markdown, re.MULTILINE)
    if matches:
        numbers = sorted(set(int(m[0]) for m in matches))
        print(f"  🔍 Detected units from subsection headers: {numbers}")
        return numbers

    # Try explicit Unit headers  "# Unit - 3"
    unit_pattern = r'^#{1,3}\s*(?:unit|UNIT)\s+[:\-]?\s*(\d+)'
    unit_matches = re.findall(unit_pattern, markdown, re.MULTILINE | re.IGNORECASE)
    numbers = sorted(set(int(m) for m in unit_matches))
    if numbers:
        print(f"  🔍 Detected units from headers: {numbers}")
        return numbers

    print(f"  ℹ️  No unit/chapter markers found, treating as single unit")
    return [1]


def extract_unit_content(markdown: str, unit_num: int, subject: Optional[str] = None) -> str:
    """
    Extract ALL content for a specific unit/chapter number.

    Handles every chapter-header format Mistral OCR produces for Indian state-board books:
      A  # CHAPTER_TITLE (all-caps)  — primary format for TN math books
      B  10th_Maths_Chapter N_English.indd 1  — page stamp boundary
      C  # Chapter N ...             (markdown H1/H2/H3 with "Chapter")
      D  **Chapter N**               (bold standalone line)
      E  # N.M Title                 (section-style — implies chapter N)
      F  # Unit - N / Unit - N       (science / social science)
      G  Unit - N                    (plain text, no #)

    Stops at the start of the next chapter/unit.
    """
    is_math = (subject == "mathematics") if subject else False
    lines = markdown.split('\n')
    unit_lines: List[str] = []
    in_unit = False

    # For math: build a title→number map from the TOC so we can detect
    # "# RELATIONS AND FUNCTIONS" as chapter 1, etc.
    _chapter_title_to_number: Dict[str, int] = {}
    if is_math:
        title_map = _build_chapter_title_map(markdown)
        # Invert: {TITLE -> number}
        _chapter_title_to_number = {v: k for k, v in title_map.items()}

    def _match_header(s: str) -> Optional[int]:
        """Return chapter/unit number if this line is a chapter/unit header, else None."""
        if not s:
            return None

        if is_math:
            # A: "# Chapter N" / "## Chapter N"
            m = re.match(r'^#+\s*Chapter\s+(\d+)\b', s, re.IGNORECASE)
            if m:
                return int(m.group(1))

            # B: "**Chapter N**" or "**Chapter N –"
            m = re.match(r'^\*{1,2}Chapter\s+(\d+)\b', s, re.IGNORECASE)
            if m:
                return int(m.group(1))

            # C: "# N.M Title" — section-style header where N = chapter number
            # e.g. "# 1.1 Introduction", "# 4.2 Similarity"
            m = re.match(r'^#+\s*(\d+)\.(\d+)', s)
            if m:
                n = int(m.group(1))
                if 1 <= n <= 20:
                    return n

            # NEW D: All-caps chapter title as H1/H2 — primary format for TN math books
            # e.g. "# RELATIONS AND FUNCTIONS", "# ALGEBRA", "# GEOMETRY"
            # These are the actual chapter dividers in the OCR output
            if s.startswith('#'):
                header_text = re.sub(r'^#+\s*', '', s).strip()
                # All-caps heading with 2+ words (avoids page markers)
                if (header_text.isupper() and len(header_text) >= 4
                        and not re.match(r'^[\d\s\.\-]+$', header_text)
                        and not any(skip in header_text for skip in
                                    ('INDD', 'STANDARD', 'MATHEMATICS', 'GOVERNMENT'))):
                    # Map known chapter titles to numbers
                    # These come from the TOC — we look up chapter_num_for_title
                    num = _chapter_title_to_number.get(header_text)
                    if num is not None:
                        return num

            # NEW E: Page-stamp format "10th_Maths_Chapter N_English.indd 1" — chapter boundary
            m = re.match(r'10th_Maths_Chapter\s+(\d+)_English\.indd\s+1\b', s)
            if m:
                return int(m.group(1))

        # D: "# Unit - N" / "## Unit - N" / "# Unit N: Prose" / "# Unit N Title"
        if s.startswith('#'):
            m = re.match(r'^#+\s*Unit\s*[-\u2013:]?\s*(\d+)', s, re.IGNORECASE)
            if m:
                return int(m.group(1))

        # E: plain-text "Unit - N", "Unit N", "Unit N: Title", "Unit N Title" (English format)
        m = re.match(r'^Unit\s*[-\u2013]?\s*(\d+)(?:\s*[:.]|\s*$|\s+\D)', s, re.IGNORECASE)
        if m:
            return int(m.group(1))

        # E2: bare all-caps "UNIT N" plain text (TN science/social science books)
        # e.g. "UNIT 6", "UNIT 15" — no markdown # prefix, just a standalone line
        m = re.match(r'^UNIT\s+(\d+)$', s)
        if m:
            return int(m.group(1))

        # E3: science book page stamp "8th_Science_Unit-N_EM.indd P" — reliable boundary
        # This is the MOST reliable unit marker in TN science books — always present
        m = re.match(r'^\d+th_Science_Unit-(\d+)_EM\.indd\s+\d+', s, re.IGNORECASE)
        if m:
            return int(m.group(1))

        # F: English book page stamp "9th_English_Unit_N" or "Class9_English_Unit_N"
        m = re.match(r'^(?:\d+th_English|Class\d+_English).*Unit[_\s]?(\d+)', s, re.IGNORECASE)
        if m:
            return int(m.group(1))

        if is_math and len(s) < 25:
            m = re.match(r'^Chapter\s+(\d+)\s*$', s, re.IGNORECASE)
            if m:
                return int(m.group(1))

        return None

    for line_idx, line in enumerate(lines):
        s = line.strip()
        found_num = _match_header(s)

        if found_num is not None:
            if found_num == unit_num:
                if not in_unit:
                    # Confirm it has actual content following it
                    has_content = any(
                        lines[ci].strip() and len(lines[ci].strip()) > 10
                        for ci in range(line_idx + 1, min(line_idx + 20, len(lines)))
                    )
                    if has_content:
                        in_unit = True
                        print(f"  ✅ Unit {unit_num} start found at line {line_idx}: {repr(s[:60])}")
                        unit_lines.append(line)
                        continue
                    # else: false positive, keep scanning for the real header
                else:
                    # We're already in the unit — this may be a repeated page
                    # stamp for the same chapter (e.g. indd page 2, 3...) — keep collecting
                    unit_lines.append(line)
                    continue
            elif in_unit:
                # Hit a DIFFERENT unit number while collecting target unit.
                # PDF page layout can scatter a unit's sections non-contiguously
                # (e.g. Unit 5 Poem appears before Unit 3 Supplementary in OCR output,
                # so Unit 5 Prose ends up physically AFTER Unit 3 Supplementary).
                # Fix: only stop definitively when we see the NEXT sequential unit
                # (unit_num+1), which guarantees we are past all of this unit's content.
                # For any other foreign unit number: pause collection and keep scanning.
                if found_num == unit_num + 1:
                    break  # Definitely done - next sequential unit started
                # Pause (don't collect this line) but keep scanning for more of our unit
                in_unit = False
                continue

        if in_unit:
            unit_lines.append(line)

    content = '\n'.join(unit_lines)

    if len(content) < 500:
        label = "Chapter" if is_math else "Unit"
        print(f"  ⚠️  Warning: {label} {unit_num} content seems short ({len(content)} chars)")
        if len(content) == 0:
            # Dump surrounding context so we can see the actual format
            print(f"  📋 Scanning for any line containing '{unit_num}' to diagnose format:")
            for i, l in enumerate(lines):
                if str(unit_num) in l and i > 100:
                    print(f"     line {i}: {repr(l)}")
                    if i > 110 + 50:
                        break

    return content



def _inject_missing_section_numbers(text: str) -> str:
    """
    Pre-processing step run BEFORE the markdown is sent to the LLM.

    Problem: Some PDF authors forget to print the section number label (e.g.
    they write the heading "Composition of GDP" but omit "## 1.3" in front of
    it).  The OCR faithfully reproduces what's on the page, so the markdown
    contains a gap: numbered section 1.2 jumps straight to numbered section 1.4
    with a cluster of unnumbered headings in between that actually constitute
    section 1.3.

    The extraction prompt (Rule 4b) correctly says "unnumbered heading →
    subsection of the most recent numbered section", so the LLM puts that entire
    cluster inside 1.2 — perfectly following the rule, but producing the wrong
    structure.

    This function detects such gaps and inserts the missing section number
    directly into the heading line so the LLM sees the correct structure on the
    first pass:

        ## Composition of Gross Domestic Product (GDP)
        →
        ## 1.3 Composition of Gross Domestic Product (GDP)

    Algorithm:
      1. Find all N.M numbered section headings and their line positions.
      2. For each consecutive pair where minor numbers skip (e.g. 1.2 → 1.4),
         scan the lines between them for unnumbered headings.
      3. Find the LAST level-1/2 heading in the gap that has at least one
         deeper heading (level 3+) immediately following it — this is the
         section-starting heading of the missing section.
      4. Rewrite that line to include the missing section number prefix.

    Gaps with multiple missing numbers (e.g. 1.2 → 1.5) are handled: each
    missing number gets its own injection using the same heuristic (the next
    unnumbered major-heading cluster after the previous injection point).
    """
    import re as _re

    lines = text.split("\n")

    # Collect (major, minor, line_index) for every numbered section heading
    _SEC_RE = _re.compile(r"^#+\s+(\d+)\.(\d+)\b")
    sections: list = []
    for i, line in enumerate(lines):
        m = _SEC_RE.match(line.strip())
        if m:
            sections.append((int(m.group(1)), int(m.group(2)), i))

    if len(sections) < 2:
        return text  # nothing to check

    _HEADING_RE = _re.compile(r"^(#+)\s+(.+)")

    # Collect all injections (line_index → new_line) so we can apply in one pass
    injections: dict = {}

    for idx in range(len(sections) - 1):
        cm, cn, ci = sections[idx]      # current: major, minor, line_index
        nm, nn, ni = sections[idx + 1]  # next:    major, minor, line_index

        if cm != nm:
            # Different major section — gap would be across chapter boundaries, skip
            continue

        if nn <= cn + 1:
            # No gap
            continue

        # There are missing minor numbers: cn+1 … nn-1
        # We search for unnumbered major headings starting from just after ci.
        # For each missing number, we find the next unnumbered cluster.
        search_from = ci + 1

        for missing_minor in range(cn + 1, nn):
            missing_snum = f"{cm}.{missing_minor}"

            # Gather gap headings between search_from and ni
            gap_headings: list = []  # (line_index, level, title)
            for j in range(search_from, ni):
                s = lines[j].strip()
                m2 = _HEADING_RE.match(s)
                if m2:
                    lvl = len(m2.group(1))
                    title = m2.group(2).strip()
                    if len(title) > 4 and not title.startswith("!"):
                        gap_headings.append((j, lvl, title))

            # Find the LAST level<=2 heading that has deeper headings after it
            # (before the next same-or-higher-level heading) — this marks the
            # start of the unnumbered section.
            best_line: int | None = None
            best_title: str = ""
            for h_idx, (lineno, lvl, title) in enumerate(gap_headings):
                if lvl > 2:
                    continue
                # next heading at same or higher structural level
                next_peer = next(
                    (j for j, (_, lv, _) in enumerate(gap_headings[h_idx + 1:], h_idx + 1)
                     if lv <= lvl),
                    len(gap_headings),
                )
                has_deeper = any(
                    lv > lvl for _, lv, _ in gap_headings[h_idx + 1 : next_peer]
                )
                if has_deeper:
                    best_line = lineno
                    best_title = title

            if best_line is None or not best_title:
                # Could not identify an unnumbered section start — leave as-is.
                # The verification agent will catch it if the gap is real.
                print(f"  ℹ️  Section gap {missing_snum}: no clear unnumbered section heading found — skipping injection")
                continue

            # Rewrite the heading line to include the missing section number.
            # Always use ## (level-2) for top-level sections.
            new_line = f"## {missing_snum} {best_title}"
            old_line = lines[best_line].strip()
            injections[best_line] = new_line
            print(f"  🔧 Injecting missing section number: '{old_line}' → '{new_line}'")

            # Next missing minor: search from just after this injection point
            search_from = best_line + 1

    if not injections:
        return text

    for line_idx, new_line in injections.items():
        lines[line_idx] = new_line

    return "\n".join(lines)

def _clean_content_for_api(text: str) -> str:
    """
    Strip OCR noise and injected sidebar content that can falsely trigger content filters.
    - Removes page stamp lines  e.g. "9th English Unit 2 Supplementary Pages 043-049.indd 43"
    - Removes garbled OCR tokens e.g. "MRBSX" (all-caps 3-8 char noise)
    - Removes bare timestamp lines e.g. "28-11-2022 17:23:36"
    - Removes injected factbox/sidebar paragraphs (off-topic OCR inserts mid-content)
    - Collapses 3+ consecutive blank lines into 2
    """
    import re
    COMMON_WORDS = {
        'A','B','C','D','OR','AND','NOT','THE','FOR','ARE','BUT','YOU','ALL',
        'CAN','HER','HIM','HIS','HOW','ITS','OUR','OUT','WHO','YES','USE',
        'SAY','NEW','ONE','TWO','GET','MAY','NOW','OLD','OWN','SEE','WAY',
        'BOY','DAY','MAN','MEN','PUT','RUN','SHE','TOO','TRY','WAS','HAD','HAS'
    }
    # Running print headers for CBSE/NCERT books (book title repeated on every page)
    _RUNNING_HEADER_RE = re.compile(
        r'^(?:POORVI|LEARNING\s+TOGETHER|BEEHIVE|HONEYDEW|FIRST\s+FLIGHT|MARIGOLD|RAINDROPS)\s*$',
        re.IGNORECASE
    )

    # Transcript page-reference stubs — these must NOT be passed to the LLM because
    # they cause the LLM to emit stub content like "(Transcript for the teacher on pg. 39)".
    # Instead we detect the pattern and signal the LLM to skip it.
    # The actual transcript text is located at the end of the book/unit.
    _TRANSCRIPT_STUB_RE = re.compile(
        r'^\(?Transcript\s+for\s+the\s+teacher\s+on\s+pg\.\s*\d+\)?\s*$',
        re.IGNORECASE
    )

    # Patterns that indicate injected sidebar/factbox text which should be stripped
    SIDEBAR_TRIGGERS = [
        r'the robot became a saudi arabian citizen',
        r'sophia was named the united nations',
        r'first non-human to be given any united nations',
        r'first robot to receive citizenship',
        r'innovation champion',
    ]
    # ── Step 1: inject missing section numbers before any other cleaning ─────
    # Must run on the ORIGINAL text so line indices are valid.
    text = _inject_missing_section_numbers(text)

    lines = text.split('\n')
    cleaned = []
    i = 0
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        # Drop .indd page stamp lines
        if re.search(r'\.indd\s+\d+', s):
            i += 1
            continue
        # Drop bare timestamp lines — both colon form (17:23:36) and dot form (11.07.35 AM)
        if re.match(r'^\d{2}-\d{2}-\d{4}\s+\d{2}[:.:]\d{2}[:.:]\d{2}', s):
            i += 1
            continue
        # Drop bare page numbers (standalone 2-4 digit lines that are just page labels)
        if re.match(r'^\d{2,4}$', s):
            i += 1
            continue
        # Drop standalone garbled OCR tokens
        if re.match(r'^[A-Z]{3,8}$', s) and s not in COMMON_WORDS:
            i += 1
            continue
        # Drop running print headers for CBSE/NCERT books (Fix M-3)
        # e.g. "POORVI", "LEARNING TOGETHER" repeated as page headers
        if _RUNNING_HEADER_RE.match(s):
            i += 1
            continue
        # Transform transcript page-reference stubs (Fix F-3 / M-3) rather than drop them.
        # e.g. "(Transcript for the teacher on pg. 39)"
        # IMPORTANT: Keep this line so the LLM knows the transcript is on a DIFFERENT page
        # and should NOT be fabricated. We replace it with a clearer instruction comment.
        if _TRANSCRIPT_STUB_RE.match(s):
            cleaned.append(f"[NOTE: Transcript is on a separate page — DO NOT FABRICATE. Leave content empty for listening sub-items.]")
            i += 1
            continue
        # Drop injected sidebar/factbox paragraphs
        lower_s = s.lower()
        if any(re.search(pat, lower_s) for pat in SIDEBAR_TRIGGERS):
            i += 1
            while i < len(lines) and lines[i].strip():
                i += 1
            continue
        cleaned.append(line)
        i += 1
    result = re.sub(r'\n{3,}', '\n\n', '\n'.join(cleaned))
    return result.strip()


def structure_unit_with_llm(
    unit_content: str,
    unit_number: int,
    api_key: str,
    subject: str,
    part_name: Optional[str] = None,
    model: str = "gpt-5-mini",
    timeout: int = 600,
    max_retries: int = 3
) -> Optional[Dict[str, Any]]:
    
    if not SUBJECT_AWARE_AVAILABLE:
        subject = "science"

    content_type = "chapter" if subject == "mathematics" else "unit"
    unit_content = _clean_content_for_api(unit_content)  # strip OCR noise before API call
    content_size = len(unit_content)
    tokens_estimate = content_size // 4
    part_info = f" ({part_name})" if part_name else ""
    print(f"  Sending {content_size:,} chars (~{tokens_estimate:,} tokens) to {model}{part_info}")

    # ── System prompt: comes fully formed from subject_aware_extraction ────────
    system_prompt = get_system_prompt_for_subject(subject)

    # For Social Science, add the part-name reminder to the system prompt
    if subject == "social_science" and part_name:
        system_prompt += (
            f"\n\n⚠️  This content belongs to the '{part_name}' section. "
            f"Set the 'part' field to exactly '{part_name}'."
        )

    # ── User prompt: created by create_user_prompt in subject_aware_extraction ─
    user_prompt = create_user_prompt(unit_content, unit_number, subject)

    # For Social Science, inject the part header at the top of the user prompt
    if subject == "social_science" and part_name:
        user_prompt = (
            f"PART: {part_name}\n"
            f"UNIT NUMBER: {unit_number}\n\n"
        ) + user_prompt

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        
        "max_completion_tokens": LLM_CONFIG["max_completion_tokens"],
        "response_format": {"type": "json_object"}
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                wait_time = LLM_CONFIG["base_delay"] * (3 ** attempt)
                print(f"  ⏳ Retry {attempt + 1}/{max_retries} after {wait_time}s...")
                time.sleep(wait_time)
            
            print(f"  🔄 Calling OpenAI API (attempt {attempt + 1}/{max_retries})...")
            start_time = time.time()
            
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=timeout
            )
            
            elapsed = time.time() - start_time
            print(f"  ✅ API responded in {elapsed:.1f}s (status {response.status_code})")
            
            if not response.ok:
                # Log the actual API error body before raising so we can diagnose it
                try:
                    err_body = response.json()
                    print(f"  ❌ API error body: {err_body}")
                except Exception:
                    print(f"  ❌ API error body (raw): {response.text[:500]}")
                response.raise_for_status()
            response_data = response.json()
            
            if "choices" not in response_data or not response_data["choices"]:
                if attempt < max_retries - 1:
                    continue
                return None

            choice = response_data["choices"][0]
            content = choice["message"]["content"]
            finish_reason = choice.get("finish_reason", "stop")
            print(f"  📊 Response size: {len(content):,} chars (finish_reason={finish_reason})")

            # content_filter: gpt-5-mini blocked this content — retry once with gpt-4o fallback
            if finish_reason == "content_filter":
                if model != "gpt-4o":
                    print(f"  ⚠️  content_filter: gpt-5-mini blocked — retrying with gpt-4o fallback...")
                    fallback_payload = {**payload, "model": "gpt-4o"}
                    try:
                        fb_resp = requests.post(
                            "https://api.openai.com/v1/chat/completions",
                            headers=headers,
                            json=fallback_payload,
                            timeout=timeout,
                        )
                        fb_data = fb_resp.json()
                        if fb_data.get("choices"):
                            fb_choice = fb_data["choices"][0]
                            fb_content = fb_choice["message"]["content"]
                            fb_reason = fb_choice.get("finish_reason", "stop")
                            print(f"  📊 Fallback response: {len(fb_content):,} chars (finish_reason={fb_reason})")
                            if fb_reason != "content_filter" and fb_content:
                                # BUG FIX: must parse JSON, not return raw string
                                try:
                                    cleaned_fb = re.sub(r'^```[a-z]*\n?', '', fb_content.strip()).rstrip('`').strip()
                                    return orjson.loads(cleaned_fb.encode() if isinstance(cleaned_fb, str) else cleaned_fb)
                                except Exception:
                                    pass
                    except Exception as fb_err:
                        print(f"  ⚠️  gpt-4o fallback failed: {fb_err}")
                print(f"  ⚠️  content_filter: Both gpt-5-mini and gpt-4o blocked this section — skipping")
                return None

            # FIX 4: Truncation recovery — if GPT hit the token limit, JSON is incomplete
            if finish_reason == "length":
                print(f"  ⚠️  [Fix4] Output truncated — attempting JSON continuation recovery...")
                recovery_messages = payload["messages"] + [
                    {"role": "assistant", "content": content},
                    {"role": "user", "content": (
                        "Your JSON response was cut off because you hit the output token limit. "
                        "Continue from EXACTLY where you stopped and complete the JSON object. "
                        "Output ONLY the remaining JSON text — no explanation, no markdown fences."
                    )}
                ]
                recovery_payload = {**payload, "messages": recovery_messages, "max_completion_tokens": 8192}
                try:
                    rec_resp = requests.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers=headers,
                        json=recovery_payload,
                        timeout=timeout
                    )
                    if rec_resp.ok:
                        continuation = rec_resp.json()["choices"][0]["message"]["content"]
                        content = content + continuation
                        print(f"  ✅ [Fix4] Recovery appended {len(continuation):,} chars")
                    else:
                        print(f"  ⚠️  [Fix4] Recovery request failed: {rec_resp.status_code}")
                except Exception as rec_err:
                    print(f"  ⚠️  [Fix4] Recovery exception: {rec_err}")

            try:
                if content.startswith("```"):
                    content = re.sub(r'^```[a-z]*\n?', '', content)
                    content = re.sub(r'\n?```$', '', content)
                    content = content.strip()

                # FIX 4b: Try to salvage partial JSON by finding largest valid object
                unit_data = None
                try:
                    unit_data = orjson.loads(content.encode() if isinstance(content, str) else content)
                except Exception:
                    # Find last complete JSON object in potentially truncated string
                    for end in range(len(content), 0, -1):
                        if content[end-1] in ('}', ']'):
                            try:
                                unit_data = orjson.loads(content[:end].encode() if isinstance(content[:end], str) else content[:end])
                                print(f"  ✅ [Fix4b] Salvaged JSON up to char {end}")
                                break
                            except Exception:
                                continue
                if unit_data is None:
                    raise orjson.JSONDecodeError("Could not parse or salvage JSON", b"", 0)

                if subject == "social_science" and part_name:
                    if "part" not in unit_data or unit_data["part"] != part_name:
                        print(f"  ⚠️  Correcting part to {part_name}")
                        unit_data["part"] = part_name
                
                if not validate_structure(unit_data, subject):
                    print(f"  ⚠️  Structure validation warning")
                
                print(f"  ✅ Unit {unit_number}{part_info} structured successfully")
                return unit_data
                
            except orjson.JSONDecodeError as e:
                print(f"  ❌ JSON parse error: {e}")
                if attempt < max_retries - 1:
                    continue
                return None
        
        except Exception as e:
            print(f"  ❌ Error: {e}")
            if attempt < max_retries - 1:
                continue
            return None
    
    return None


# ── Chunk size limit for a single LLM call ────────────────────────────────────
# gpt-5-mini max OUTPUT = 16 384 tokens.
# We keep INPUT ≤ 40 000 chars (~10 000 tokens) + system prompt (~2 000 tokens)
# so total input stays well under 128 K context and output fits in 16 K tokens.
_CHUNK_MAX_CHARS = 40_000


# FIX 2: Semantic chunk splitter — breaks BEFORE section headers
_SECTION_BOUNDARY_RE = re.compile(
    r"^(?:"
    r"#{1,4}\s+"
    r"|\*{1,2}(?:Example|Exercise|Theorem|Illustration|Activity)\b"
    r"|(?:Example|Exercise|Activity|Illustration)\s+[\d.]"
    r"|(?:Note|Do You Know|More to Know|Try This|Thinking Corner)"
    r"|(?:Progress Check|ICT Corner|Unit Exercise|Fun with History)"
    r"|(?:Definition|Theorem|Proof|Construction)\b"
    r"|(?:Vocabulary|Grammar|Writing|Speaking|Listening)\s*$"
    r"|(?:Summary|Points to Remember|Glossary|Timeline|Map Work)\s*$"
    r")",
    re.IGNORECASE
)


def _split_into_chunks_semantic(text: str, max_chars: int = _CHUNK_MAX_CHARS) -> List[str]:
    """
    FIX 2: Semantic chunk splitter.
    Breaks BEFORE section headers so GPT never receives orphaned mid-section
    content. Falls back to hard break only when a section exceeds max_chars.
    Replaces the old blank-line-only splitter that caused content to be dropped.
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
            current_lines = []
            current_len = 0

        # Hard fallback: flush before exceeding limit
        if current_len + line_len > max_chars and current_lines:
            chunks.append('\n'.join(current_lines))
            current_lines = []
            current_len = 0

        current_lines.append(line)
        current_len += line_len

    if current_lines:
        chunks.append('\n'.join(current_lines))

    return chunks


# Keep old name as alias for any external callers
_split_into_chunks = _split_into_chunks_semantic


# FIX 3: Robust multi-format TOC parser
_ROMAN_TO_INT = {
    "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6,
    "VII": 7, "VIII": 8, "IX": 9, "X": 10, "XI": 11, "XII": 12,
    "XIII": 13, "XIV": 14, "XV": 15,
}


def _extract_chapters_from_toc_robust(markdown: str) -> List[int]:
    """
    FIX 3: Robust multi-format TOC parser supporting:
      Format A — Markdown pipe table  | N | Title | pages |
      Format B — Numbered list        1. Title  or  1) Title
      Format C — Chapter/Unit keyword  Chapter 3 Name
      Format D — Roman numerals        I. Title   II. Title
    Always reads TOC first; body scan is only used as fallback.
    """
    lines = markdown.split('\n')
    toc_start = None

    for i, line in enumerate(lines[:500]):
        s = line.strip().upper()
        if s in ('CONTENT', 'CONTENTS', 'TABLE OF CONTENTS',
                 '# CONTENT', '# CONTENTS', '## CONTENT', '## CONTENTS'):
            toc_start = i
            print(f"  📖 [Robust TOC] Found TOC at line {i}: {repr(line.strip())}")
            break
        if 'UNIT' in s and 'CONTENT' in s and line.strip().startswith('|'):
            toc_start = i
            print(f"  📖 [Robust TOC] Found English TOC table at line {i}")
            break
        # Numbered-list TOC must appear in the first 60 lines (cover/TOC area only).
        # Guards against false positives from body-content numbered lists:
        #   (a) Reject if any N.M section header (## 1.1, ## 2.3 etc.) already
        #       appears before this line — means we are already inside body text.
        #   (b) Require ≥ 5 subsequent numbered items — a real subject TOC has
        #       6-15 chapters. A 5-item physiographic division list is NOT a TOC.
        if re.match(r"^\s*1[.)]\s+[A-Z]", line) and i < 60:
            pre_body = "\n".join(lines[:i])
            if re.search(r'^#{1,4}\s+\d+\.\d+', pre_body, re.MULTILINE):
                continue  # already past intro into body text — not a TOC
            subsequent = [l for l in lines[i+1:i+15] if l.strip()]
            numbered = [l for l in subsequent if re.match(r"^\s*[2-9][.)]\s+[A-Z]", l)]
            if len(numbered) >= 5 and len(line.strip()) < 80:
                toc_start = i
                print(f"  📖 [Robust TOC] Found numbered-list TOC at line {i}")
                break

    if toc_start is None:
        return []

    toc_end = min(toc_start + 400, len(lines))
    numbers: set = set()

    fmt_a_table  = re.compile(r"^\|\s*(\d+)\s*\|[^|]+\|")
    fmt_a_ch_col = re.compile(r"^\|\s*(?:Chapter|Unit)\s+(\d+)\s*\|", re.IGNORECASE)
    fmt_b_list   = re.compile(r"^\s*(\d+)[.)]\s+[A-Za-z\u0900-\u097F]")
    fmt_c_word   = re.compile(r"(?:Chapter|Unit)\s+(\d+)", re.IGNORECASE)
    fmt_d_roman  = re.compile(r"^\s*(I{1,3}|IV|VI{0,3}|IX|X[IVX]*)[.)]\s+\S", re.IGNORECASE)
    fmt_a_eng    = re.compile(
        r"^\|\s*(\d+)\s*\|\s*(?:Prose|Poem\*?|Drama|Supplementary|Fiction|Non-fiction)\s*\|",
        re.IGNORECASE
    )

    in_table = False
    consecutive_non_table = 0

    for line in lines[toc_start:toc_end]:
        stripped = line.strip()
        if not stripped:
            continue

        if stripped.startswith('|'):
            in_table = True
            consecutive_non_table = 0
        else:
            if in_table:
                consecutive_non_table += 1
                if consecutive_non_table >= 3 and stripped:
                    break

        if re.match(r"^\|[\s\-|]+\|", stripped):
            continue

        m = fmt_a_eng.match(stripped)
        if m and 1 <= int(m.group(1)) <= 50:
            numbers.add(int(m.group(1)))
            continue

        m = fmt_a_table.match(stripped) or fmt_a_ch_col.match(stripped)
        if m and 1 <= int(m.group(1)) <= 50:
            numbers.add(int(m.group(1)))
            continue

        m = fmt_b_list.match(stripped)
        if m and 1 <= int(m.group(1)) <= 50:
            numbers.add(int(m.group(1)))
            continue

        for m in fmt_c_word.finditer(stripped):
            n = int(m.group(1))
            if 1 <= n <= 50:
                numbers.add(n)

        m = fmt_d_roman.match(stripped)
        if m:
            roman = m.group(1).upper()
            if roman in _ROMAN_TO_INT:
                numbers.add(_ROMAN_TO_INT[roman])

    result = sorted(numbers)
    if result:
        print(f"  📚 [Robust TOC] Unit list: {result}")
    else:
        print(f"  ⚠️  [Robust TOC] TOC found but no numbers extracted")
    return result


def _merge_chapter_chunks(chunks_data: List[Dict[str, Any]], subject: str) -> Dict[str, Any]:
    """
    Merge multiple partial extraction dicts (from different content chunks of the
    same chapter) into one complete chapter dict.

    Strategy: take scalar fields (chapter_number, title, introduction) from the
    first chunk that has them; concatenate all list fields across all chunks.
    """
    if len(chunks_data) == 1:
        return chunks_data[0]

    # List fields that should be concatenated across chunks
    if subject == "mathematics":
        list_fields = [
            "learning_outcomes", "sections", "definitions", "theorems",
            "illustrations", "examples", "exercises", "multiple_choice_questions",
            "thinking_corners", "progress_checks", "notes", "ict_corner",
            "points_to_remember",
        ]
        scalar_fields = ["chapter_number", "title", "introduction", "unit_exercise"]
    elif subject == "science":
        list_fields = [
            "learning_objectives", "sections", "activities", "do_you_know",
            "more_to_know", "notes", "try_this", "exercises", "points_to_remember",
        ]
        scalar_fields = ["unit_number", "title", "introduction"]
    elif subject == "english":
        # English uses sections[] format (universal schema) as defined in ENGLISH_SYSTEM_PROMPT.
        # All content types (prose, poem, grammar, vocabulary, writing_task, etc.)
        # are stored as typed entries in sections[].
        list_fields = [
            "learning_objectives", "sections",
            "glossary", "notes", "points_to_remember",
        ]
        scalar_fields = ["unit_number", "title", "introduction"]
    else:  # SOCIAL_SCIENCE
        list_fields = [
            "learning_objectives", "sections", "do_you_know", "activities",
            "map_work", "exercises", "summary", "glossary", "timeline",
            "reference_books", "ict_corner",
        ]
        scalar_fields = ["part", "unit_number", "title", "introduction"]

    merged: Dict[str, Any] = {}

    # Scalar fields: first non-null/non-empty value wins
    for field in scalar_fields:
        for chunk in chunks_data:
            val = chunk.get(field)
            if val is not None and val != "" and val != [] and val != {}:
                merged[field] = val
                break
        if field not in merged:
            merged[field] = chunks_data[0].get(field)

    # List fields: concatenate, deduplicating by string representation
    for field in list_fields:
        seen: set = set()
        combined: list = []
        for chunk in chunks_data:
            for item in chunk.get(field) or []:
                # For sections[], use type+title as dedup key for major content types
                # to prevent duplicate prose/poem/supplementary from re-extraction
                if field == "sections" and isinstance(item, dict):
                    stype = item.get("type", "")
                    stitle = (item.get("title") or item.get("id") or "").strip()
                    scontent_start = (item.get("content") or "")[:100]
                    if stype in ("prose", "poem", "supplementary"):
                        # English: one entry per title
                        key = f"{stype}::{stitle or scontent_start[:50]}"
                    elif "section_number" in item:
                        # Social Science / Science / Maths: dedup by section_number+title
                        # Avoids false-dropping short sections with similar content starts
                        key = f"sec::{item.get('section_number', '')}::{stitle}"
                    else:
                        key = str(item)[:200]
                else:
                    key = str(item)
                if key not in seen:
                    seen.add(key)
                    combined.append(item)
        merged[field] = combined

    return merged



def _split_cbse_english_natural_sections(unit_content: str, unit_number: int) -> List[Dict[str, Any]]:
    """
    Split a CBSE/NCERT English unit (Poorvi, Beehive, Honeydew, etc.) into natural
    pedagogical sections so each LLM call handles a coherent block.

    CBSE English units follow a fixed pedagogical order:
      1. Pre-reading warm-up   ("Let us do these activities before we read")
      2. Prose / Folk tale / Essay / Biography / Drama
      3. Poem  (may be absent)
      4. Supplementary / Second reading (may be absent)
      5. Activity sections ("Let us discuss", "Let us think and reflect", ...)
      6. Let us learn  (grammar / vocabulary)
      7. Let us listen
      8. Let us speak
      9. Let us write
     10. Let us explore
     11. Transcripts (for the teacher, printed at end)

    The function splits at these boundaries and returns a list of
    {"type": <section_name>, "content": <text>} dicts in order.

    If no boundaries are detected the full content is returned as a
    single {"type": "Prose", "content": unit_content} dict.
    """
    import re as _re

    # Ordered list of (section_type_label, regex_pattern)
    # Patterns are written to match typical OCR output from Poorvi/Beehive
    BOUNDARY_PATTERNS: List[tuple] = [
        ("PreReading",   _re.compile(r'(?:^|\n)(?:##?\s*)?let\s+us\s+do\s+these\s+activities\s+before\s+we\s+read', _re.IGNORECASE)),
        ("PreReading",   _re.compile(r'(?:^|\n)(?:##?\s*)?pre[- ]?reading', _re.IGNORECASE)),
        ("Poem",         _re.compile(r'(?:^|\n)(?:##?\s*)?(?:the\s+)?poem\b', _re.IGNORECASE)),
        ("Supplementary",_re.compile(r'(?:^|\n)(?:##?\s*)?supplementary\b', _re.IGNORECASE)),
        ("LetUsDiscuss", _re.compile(r'(?:^|\n)(?:##?\s*)?let\s+us\s+discuss', _re.IGNORECASE)),
        ("LetUsThink",   _re.compile(r'(?:^|\n)(?:##?\s*)?let\s+us\s+think\s+and\s+reflect', _re.IGNORECASE)),
        ("LetUsRead",    _re.compile(r'(?:^|\n)(?:##?\s*)?let\s+us\s+read', _re.IGNORECASE)),
        ("LetUsLearn",   _re.compile(r'(?:^|\n)(?:##?\s*)?let\s+us\s+learn', _re.IGNORECASE)),
        ("LetUsListen",  _re.compile(r'(?:^|\n)(?:##?\s*)?let\s+us\s+listen', _re.IGNORECASE)),
        ("LetUsSpeak",   _re.compile(r'(?:^|\n)(?:##?\s*)?let\s+us\s+speak', _re.IGNORECASE)),
        ("LetUsWrite",   _re.compile(r'(?:^|\n)(?:##?\s*)?let\s+us\s+write', _re.IGNORECASE)),
        ("LetUsExplore", _re.compile(r'(?:^|\n)(?:##?\s*)?let\s+us\s+explore', _re.IGNORECASE)),
        ("Transcripts",  _re.compile(r'(?:^|\n)(?:##?\s*)?transcript\s+for\s+the\s+teacher', _re.IGNORECASE)),
        ("Transcripts",  _re.compile(r'(?:^|\n)(?:##?\s*)?transcripts?\b', _re.IGNORECASE)),
    ]

    # Collect all boundary hits as (position, section_type)
    hits: List[tuple] = []
    for stype, pat in BOUNDARY_PATTERNS:
        for m in pat.finditer(unit_content):
            hits.append((m.start(), stype, m.group(0)))

    if not hits:
        return [{"type": "Prose", "content": unit_content}]

    # Sort by position; resolve ties by BOUNDARY_PATTERNS order (first match wins)
    order_map = {stype: i for i, (stype, _) in enumerate(BOUNDARY_PATTERNS)}
    hits.sort(key=lambda h: (h[0], order_map.get(h[1], 99)))

    # Remove duplicate section types at similar positions (within 200 chars)
    deduped: List[tuple] = []
    for pos, stype, raw in hits:
        if deduped and abs(pos - deduped[-1][0]) < 200 and stype == deduped[-1][1]:
            continue
        deduped.append((pos, stype, raw))

    # Build sections: everything before first hit is "Prose"
    sections: List[Dict[str, Any]] = []
    first_pos = deduped[0][0]
    if first_pos > 200:  # there's real prose before the first boundary
        sections.append({"type": "Prose", "content": unit_content[:first_pos]})

    for idx, (pos, stype, _) in enumerate(deduped):
        end = deduped[idx + 1][0] if idx + 1 < len(deduped) else len(unit_content)
        content = unit_content[pos:end]
        if len(content.strip()) < 50:
            continue  # skip empty/near-empty sections

        # Merge consecutive sections of the same type (e.g., two LetUsLearn hits)
        if sections and sections[-1]["type"] == stype:
            sections[-1]["content"] += "\n" + content
        else:
            sections.append({"type": stype, "content": content})

    # ── BUG FIX: Re-attach mid-story discussion sections ──────────────────────
    # In Poorvi books, "Let us discuss" sometimes appears IN THE MIDDLE of the
    # story (between Part I "# I" and Part II "# II") because the exercise block
    # is physically interleaved with the narrative in the printed book layout.
    # When we split here and mark the second prose chunk as a "continuation",
    # the LLM continuation note says "skip prose" — causing Part II of the story
    # to never be extracted.
    #
    # Detection: if a Prose chunk follows immediately after a LetUsDiscuss/
    # LetUsThink section AND the total Prose+Discussion content fits comfortably
    # in one LLM call, merge them back into a single Prose chunk. The LLM will
    # correctly identify the discussion questions within the prose context.
    #
    # A "Prose chunk after discussion" is detected by the presence of story
    # part markers ("# II", "# III", "Part II") within what we tagged as
    # LetUsDiscuss content — meaning the prose continued after the questions.
    _PROSE_PART_MARKER = _re.compile(r'(?:^|\n)#\s+(?:I{1,3}|IV|V?I{0,3})\s*\n', _re.MULTILINE)
    _DISCUSSION_TYPES = {"LetUsDiscuss", "LetUsThink"}

    merged_sections: List[Dict[str, Any]] = []
    i = 0
    while i < len(sections):
        sec = sections[i]
        # Check: is this a discussion section that contains a prose part marker?
        # That means the story continued inside the "discussion" block.
        if sec["type"] in _DISCUSSION_TYPES:
            content_of_sec = sec["content"]
            part_marker_match = _PROSE_PART_MARKER.search(content_of_sec)
            if part_marker_match:
                # Split at the FIRST part marker: everything before it is the
                # discussion; everything from the marker onward is prose.
                split_pos = part_marker_match.start()
                discussion_part = content_of_sec[:split_pos].strip()
                prose_continuation = content_of_sec[split_pos:].strip()
                print(f"  🔧 [SplitFix] Found prose Part II inside {sec['type']} section — "
                      f"re-attaching {len(prose_continuation):,} chars to Prose")

                # Keep the discussion part
                if discussion_part:
                    if merged_sections and merged_sections[-1]["type"] in _DISCUSSION_TYPES:
                        merged_sections[-1]["content"] += "\n\n" + discussion_part
                    else:
                        merged_sections.append({**sec, "content": discussion_part})

                # Attach the prose continuation to the PRECEDING Prose section
                if merged_sections and merged_sections[-1]["type"] == "Prose":
                    merged_sections[-1]["content"] += "\n\n" + prose_continuation
                else:
                    merged_sections.append({"type": "Prose", "content": prose_continuation})
                i += 1
                continue

        merged_sections.append(sec)
        i += 1

    sections = merged_sections

    # Collapse all "Let us *" activity sections into a single "Activities" chunk
    # if the unit is small enough to fit in one LLM call
    ACTIVITY_TYPES = {"LetUsDiscuss", "LetUsThink", "LetUsRead", "LetUsLearn",
                      "LetUsListen", "LetUsSpeak", "LetUsWrite", "LetUsExplore"}
    total_activity_chars = sum(
        len(s["content"]) for s in sections if s["type"] in ACTIVITY_TYPES
    )
    if total_activity_chars < 28_000:
        # Merge all activity sections into one
        activity_combined = "\n\n".join(
            s["content"] for s in sections if s["type"] in ACTIVITY_TYPES
        )
        non_activity = [s for s in sections if s["type"] not in ACTIVITY_TYPES]
        if activity_combined.strip():
            non_activity.append({"type": "Activities", "content": activity_combined})
        sections = non_activity

    # Always keep Transcripts separate (they're noisy and long)
    return sections if sections else [{"type": "Prose", "content": unit_content}]


def _split_english_natural_sections(unit_content: str, unit_number: int) -> List[Dict[str, Any]]:
    """
    Split English unit content into natural sub-sections:
    "Unit N Prose", "Unit N Poem", "Unit N Supplementary", "Unit N Drama"

    Each section is returned as {"type": "Prose"|"Poem"|"Supplementary"|"Drama", "content": str}
    Sections are returned in the order they appear in the content.

    If no natural section boundaries are found, returns the full content as a single "Prose" section.
    """
    import re as _re
    # Match 'Unit N Prose/Poem/Supplementary/Drama' with optional whitespace/newlines
    pat = _re.compile(
        r'(?:^|\n)(Unit\s+' + str(unit_number) + r'\s+(Prose|Poem|Supplementary|Drama))',
        _re.IGNORECASE
    )
    matches = list(pat.finditer(unit_content))

    if not matches:
        # No natural boundaries found — return full content as single section
        return [{"type": "Prose", "content": unit_content}]

    # Also find ALL section markers globally to know where each section ends
    all_pat = _re.compile(
        r'(?:^|\n)(Unit\s+\d+\s+(?:Prose|Poem|Supplementary|Drama))',
        _re.IGNORECASE
    )
    all_global = list(all_pat.finditer(unit_content))
    all_starts = [m.start() for m in all_global] + [len(unit_content)]

    # Collect unique section types in order of appearance
    seen_types: list = []
    type_content: dict = {}
    for m in matches:
        stype = m.group(2).capitalize()
        pos = m.start()
        # End = next ANY unit section boundary in content
        end = next((p for p in all_starts if p > pos), len(unit_content))
        chunk = unit_content[pos:end]
        if stype not in type_content:
            seen_types.append(stype)
            type_content[stype] = chunk
        else:
            type_content[stype] += chunk

    result_sections = []
    for t in seen_types:
        sec_content = type_content[t]
        # Truncate any section that bleeds into end-of-book material
        # (listening passages for OTHER units or book-wide TOCs)
        noise_patterns = [
            "## WATER THE ELIXIR OF LIFE",
            "## WATER – THE ELIXIR",
            "English – Class IX\nList of Aut",
            "9th English Introduction Pages",
        ]
        for noise in noise_patterns:
            noise_idx = sec_content.find(noise)
            if noise_idx > 2000:  # only truncate if there's real content before it
                print(f"  ✂️  Truncating {t} section at end-of-book noise (offset {noise_idx})")
                sec_content = sec_content[:noise_idx]
                break
        result_sections.append({"type": t, "content": sec_content})
    return result_sections

def structure_unit_with_llm_chunked(
    unit_content: str,
    unit_number: int,
    api_key: str,
    subject: str,
    part_name: Optional[str] = None,
    model: str = "gpt-5-mini",
    timeout: int = 600,
    max_retries: int = 3,
    use_universal: bool = True,
) -> Optional[Dict[str, Any]]:
    """
    Wrapper around structure_unit_with_llm that automatically splits oversized
    chapters into chunks, processes each separately, then merges results.

    When use_universal=True (default), uses the universal schema extractor which:
    - Captures ANY element type (not just pre-defined subject-specific ones)
    - Uses semantic chunk splitting (Fix 2)
    - Includes truncation recovery (Fix 4)
    - Includes completeness check (Fix 5)
    """
    # ROUTING: When subject is explicitly defined, use subject-specific schema.
    # Only use universal schema when subject is unknown/unrecognized.
    KNOWN_SUBJECTS = {"english", "mathematics", "science",
                      "social_science", "cbse_english"}
    if use_universal and subject not in KNOWN_SUBJECTS:
        return structure_unit_universal(
            unit_content=unit_content,
            unit_number=unit_number,
            api_key=api_key,
            subject=subject,
            part_name=part_name,
            model=model,
            timeout=timeout,
            max_retries=max_retries,
            enable_completeness_check=True,
        )

    # Subject-specific schema path (for English, Maths, Science, Social Science, CBSE English)
    content_type = "chapter" if subject == "mathematics" else "unit"

    # ── CBSE ENGLISH: Split by natural section boundaries ────────────────────
    # Poorvi/Beehive units have distinct sub-sections: warm_up, prose, poem,
    # Let us discuss, Let us learn, listening, speaking, writing, explore, transcripts.
    # Splitting naively causes poem/transcripts to land in chunk 2+ where the
    # continuation note skips them. Split by natural boundaries instead.
    if subject == "cbse_english":
        natural_sections = _split_cbse_english_natural_sections(unit_content, unit_number)
        if len(natural_sections) > 1:
            print(f"  📚 CBSE Unit {unit_number}: {len(natural_sections)} natural sections: "
                  f"{[s['type'] for s in natural_sections]}")
            chunk_results_cbse: List[Dict[str, Any]] = []
            for ns in natural_sections:
                ns_type = ns['type']
                ns_content = ns['content']
                ns_chunks = _split_into_chunks_semantic(ns_content, 30_000)
                print(f"  📖 CBSE {ns_type} section ({len(ns_content):,} chars, "
                      f"{len(ns_chunks)} chunk(s))")
                for ci, chunk in enumerate(ns_chunks, 1):
                    effective_chunk = chunk
                    # Add continuation note for multi-chunk sections (not for Prose —
                    # prose continuation chunks still need to extract story content)
                    if len(ns_chunks) > 1 and ci > 1 and ns_type == 'Grammar':
                        effective_chunk = (
                            f"[CONTINUATION: Chunk {ci}/{len(ns_chunks)} of CBSE Unit {unit_number} Grammar.\n"
                            f"Extract ONLY: grammar, vocabulary, exercise, listening, speaking,\n"
                            f"writing_task, exploration, transcript from THIS chunk.\n"
                            f"Set unit_number={unit_number}, title=null for continuation.]\n\n"
                        ) + chunk
                    elif len(ns_chunks) > 1 and ci > 1 and ns_type == 'Prose':
                        # BUG FIX: For prose continuation chunks, DO NOT say "prose already extracted"
                        # because this chunk contains the REMAINING parts of the story (# II, # III etc.)
                        # which MUST be merged into the same prose section.
                        effective_chunk = (
                            f"[CONTINUATION: Chunk {ci}/{len(ns_chunks)} of CBSE Unit {unit_number} Prose.\n"
                            f"This chunk contains additional story parts (# II, # III etc.) that belong\n"
                            f"to the SAME prose section as chunk 1. Merge them into the SAME prose section.\n"
                            f"Also extract any vocabulary words (word: meaning) found in this chunk.\n"
                            f"Set unit_number={unit_number}, title=null for continuation.]\n\n"
                        ) + chunk
                    result = structure_unit_with_llm(
                        unit_content=effective_chunk,
                        unit_number=unit_number,
                        api_key=api_key,
                        subject=subject,
                        part_name=part_name,
                        model=model,
                        timeout=timeout,
                        max_retries=max_retries,
                    )
                    if result:
                        chunk_results_cbse.append(result)
                    else:
                        print(f"  ⚠️  CBSE {ns_type} chunk {ci}/{len(ns_chunks)} failed")
            if not chunk_results_cbse:
                return None
            merged = _merge_chapter_chunks(chunk_results_cbse, subject)
            section_count = len(merged.get('sections', []))
            section_types = [s.get('type', '?') for s in merged.get('sections', [])]
            type_summary = ', '.join(
                f"{t}:{section_types.count(t)}" for t in sorted(set(section_types))
            )
            print(f"  ✅ CBSE Merged {len(chunk_results_cbse)} section-chunks → "
                  f"{section_count} sections [{type_summary}]")
            return merged
    # English textbooks have distinct sub-sections per unit:
    #   "Unit N Prose", "Unit N Poem", "Unit N Supplementary", "Unit N Drama"
    # Splitting by fixed chunk size causes poem/supplementary to land in chunk 2+
    # where the continuation note SKIPS them. Instead, extract each natural section
    # as a separate LLM call so poem and supplementary are ALWAYS fully extracted.
    if subject == "english":
        natural_sections = _split_english_natural_sections(unit_content, unit_number)
        if len(natural_sections) > 1:
            print(f"  📚 Unit {unit_number}: {len(natural_sections)} natural sections: "
                  f"{[s['type'] for s in natural_sections]}")
            chunk_results: List[Dict[str, Any]] = []
            for ns in natural_sections:
                ns_type = ns['type']   # 'Prose', 'Poem', 'Supplementary', 'Drama'
                ns_content = ns['content']
                # Sub-chunk large prose/drama sections (>25k) using continuation note
                # for grammar/exercises, but NOT for poem/supplementary sections
                ns_chunks = _split_into_chunks_semantic(ns_content, 25_000)
                print(f"  📖 Processing {ns_type} section ({len(ns_content):,} chars, "
                      f"{len(ns_chunks)} chunk(s))")
                for ci, chunk in enumerate(ns_chunks, 1):
                    effective_chunk = chunk
                    # Only add continuation note for prose/drama sub-chunks (not poem/supplementary)
                    if len(ns_chunks) > 1 and ci > 1 and ns_type in ('Prose', 'Drama'):
                        effective_chunk = (
                            f"[CONTINUATION: Chunk {ci}/{len(ns_chunks)} of Unit {unit_number} {ns_type}.\n"
                            f"The main {ns_type.lower()} text was extracted in chunk 1.\n"
                            f"Extract ONLY: grammar, vocabulary, writing_task, listening, speaking,\n"
                            f"exercise, notes, ict_corner from THIS chunk.\n"
                            f"Do NOT re-extract prose text. Set unit_number={unit_number}.]\n\n"
                        ) + chunk
                    result = structure_unit_with_llm(
                        unit_content=effective_chunk,
                        unit_number=unit_number,
                        api_key=api_key,
                        subject=subject,
                        part_name=part_name,
                        model=model,
                        timeout=timeout,
                        max_retries=max_retries,
                    )
                    if result:
                        chunk_results.append(result)
                    else:
                        print(f"  ⚠️  {ns_type} chunk {ci}/{len(ns_chunks)} failed")
            if not chunk_results:
                return None
            merged = _merge_chapter_chunks(chunk_results, subject)
            section_count = len(merged.get('sections', []))
            section_types = [s.get('type', '?') for s in merged.get('sections', [])]
            type_summary = ', '.join(
                f"{t}:{section_types.count(t)}" for t in sorted(set(section_types))
            )
            print(f"  ✅ Merged {len(chunk_results)} section-chunks → {section_count} sections [{type_summary}]")
            return merged

    # ── NON-ENGLISH: Fixed chunk size splitting ────────────────────────────────
    chunk_size = _CHUNK_MAX_CHARS
    chunks = _split_into_chunks_semantic(unit_content, chunk_size)

    if len(chunks) == 1:
        # Fast path — no splitting needed
        return structure_unit_with_llm(
            unit_content=unit_content,
            unit_number=unit_number,
            api_key=api_key,
            subject=subject,
            part_name=part_name,
            model=model,
            timeout=timeout,
            max_retries=max_retries,
        )

    print(f"  📦 {content_type.capitalize()} {unit_number} is large "
          f"({len(unit_content):,} chars) → splitting into {len(chunks)} chunks")

    chunk_results: List[Dict[str, Any]] = []
    extracted_section_numbers: List[str] = []

    for idx, chunk in enumerate(chunks, 1):
        print(f"  🔀 Processing chunk {idx}/{len(chunks)} "
              f"({len(chunk):,} chars)...")

        # Add continuation note for chunks 2+ so the LLM does not re-number
        # sections from scratch when it sees a mid-document fragment.
        #
        # KEY BUG FIX: The LAST section seen in chunk N-1 is almost always SPLIT —
        # its first subsections were extracted in chunk N-1 but the remaining ones
        # (including any using # H1 headings) are in chunk N.
        # We must NOT tell the LLM that section is "done" — we mark it PARTIAL so
        # the LLM continues extracting its remaining subsections from this chunk.
        # We also warn that OCR uses mixed heading levels (#/##/###) within one section.
        effective_chunk = chunk
        if idx > 1 and subject in ("social_science", "science"):
            # All sections except the last are truly complete
            fully_done  = extracted_section_numbers[:-1]
            partial_sec = extracted_section_numbers[-1] if extracted_section_numbers else None

            done_str = ", ".join(fully_done) if fully_done else "none"
            partial_note = (
                f"\n⚠️  CRITICAL: Section {partial_sec} was only PARTIALLY extracted in the "
                f"previous chunk (the chunk boundary cut it mid-way). This chunk contains its "
                f"REMAINING subsections — extract them all. Do NOT skip section {partial_sec}.\n"
                f"⚠️  The OCR uses MIXED heading levels (#, ##, ###) inside one section. "
                f"ALL headings that do not start a new N.M numbered section (like 1.5, 2.1) "
                f"are subsections of {partial_sec} — extract them regardless of heading level."
            ) if partial_sec else ""

            effective_chunk = (
                f"[CONTINUATION NOTE: Chunk {idx}/{len(chunks)} of Unit {unit_number}.\n"
                f"Sections FULLY extracted in previous chunks (skip these entirely): {done_str}.{partial_note}\n"
                f"Extract ONLY content present in THIS chunk. Do NOT restart numbering at 1.1.\n"
                f"Set title=null, introduction=null, learning_objectives=[] for this continuation.]\n\n"
            ) + chunk

        result = structure_unit_with_llm(
            unit_content=effective_chunk,
            unit_number=unit_number,
            api_key=api_key,
            subject=subject,
            part_name=part_name,
            model=model,
            timeout=timeout,
            max_retries=max_retries,
        )
        if result:
            chunk_results.append(result)
            for sec in result.get("sections", []):
                snum = sec.get("section_number", "")
                if snum and snum not in extracted_section_numbers:
                    extracted_section_numbers.append(snum)
        else:
            print(f"  ⚠️  Chunk {idx}/{len(chunks)} failed — continuing with remaining chunks")

    if not chunk_results:
        return None

    merged = _merge_chapter_chunks(chunk_results, subject)
    content_type_plural = "sections" if subject != "mathematics" else "sections"
    # Log summary based on schema type
    if subject == "english":
        section_count = len(merged.get('sections', []))
        section_types = [s.get('type','?') for s in merged.get('sections', [])]
        type_summary = ', '.join(f"{t}:{section_types.count(t)}" for t in sorted(set(section_types)))
        print(f"  ✅ Merged {len(chunks)} chunks → {section_count} sections [{type_summary}]")
    else:
        print(f"  ✅ Merged {len(chunks)} chunks → "
              f"{len(merged.get('examples', []))} examples, "
              f"{len(merged.get('sections', []))} sections, "
              f"{len(merged.get('exercises', []))} exercises")
    return merged



# FIX 5: TWO-PASS COMPLETENESS CHECK
# After extraction, verify no section types were missed and re-extract gaps.


def _verify_and_fill_gaps(
    unit_content: str,
    extracted_data: Dict[str, Any],
    unit_number: int,
    api_key: str,
    subject: str,
    model: str = "gpt-5-mini",
    timeout: int = 300,
) -> Dict[str, Any]:
    """
    FIX 5: Two-pass completeness verification.
    Pass 1: Ask LLM to inventory all section types present in raw content (cheap call).
    Pass 2: Compare against what was extracted. Re-extract any missing types.
    Returns the updated extracted_data with gaps filled.
    """
    from subject_aware_extraction import get_universal_system_prompt, create_universal_user_prompt

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # Pass 1: cheap inventory (first 8000 chars is enough to detect all types)
    inventory_sample = unit_content[:8000]
    # Subject-aware type list — only ask about types that can actually appear
    _inv_type_sets = {
        "mathematics":    ("example, exercise, unit_exercise, multiple_choice, thinking_corner, "
                          "progress_check, note, illustration, definition, theorem, proof, "
                          "construction, ict_corner, points_to_remember"),
        "science":        ("exercise, activity, note, do_you_know, more_to_know, try_this, "
                          "multiple_choice, ict_corner, points_to_remember"),
        "social_science": ("exercise, activity, do_you_know, map_work, glossary, "
                          "timeline, summary, multiple_choice"),
        "english":        ("prose, poem, supplementary, grammar, vocabulary, writing_task, "
                          "speaking, listening, exercise, multiple_choice, ict_corner"),
    }
    subject_val = str(subject) if subject else ""
    inv_type_list = _inv_type_sets.get(subject_val,
        "example, exercise, activity, note, definition, vocabulary, grammar, "
        "writing_task, speaking, listening, points_to_remember, glossary, summary")

    inventory_prompt = (
        "List ALL distinct section types ACTUALLY PRESENT in this textbook content. "
        "Only include a type if you can clearly see it in the text - do not guess. "
        'Return ONLY a JSON object: {"types": ["type1", "type2", ...]} '
        f"using ONLY these allowed labels: [{inv_type_list}]. "
        f"Content:\n{inventory_sample}"
    )
    inv_payload = {
        "model": model,
        "messages": [{"role": "user", "content": inventory_prompt}],
        
        "max_completion_tokens": 256,
        "response_format": {"type": "json_object"},
    }

    try:
        inv_resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers, json=inv_payload, timeout=60
        )
        if not inv_resp.ok:
            return extracted_data
        inv_data = inv_resp.json()
        inv_content = inv_data["choices"][0]["message"]["content"]
        inv_parsed = orjson.loads(inv_content)
        # Handle both {"types": [...]} and direct array wrapped in object
        if isinstance(inv_parsed, list):
            expected_types = set(inv_parsed)
        elif isinstance(inv_parsed, dict):
            for v in inv_parsed.values():
                if isinstance(v, list):
                    expected_types = set(str(x) for x in v)
                    break
            else:
                expected_types = set()
        else:
            expected_types = set()
    except Exception as e:
        print(f"  ⚠️  [Fix5] Inventory call failed: {e}")
        return extracted_data

    if not expected_types:
        return extracted_data

    # What do we already have?
    existing_sections = extracted_data.get("sections", [])
    extracted_types = set(s.get("type", "") for s in existing_sections)

    # Also check legacy per-subject top-level keys
    legacy_key_map = {
        "example": "examples", "exercise": "exercises",
        "activity": "activities", "note": "notes",
        "do_you_know": "do_you_know", "more_to_know": "more_to_know",
        "try_this": "try_this", "thinking_corner": "thinking_corners",
        "progress_check": "progress_checks", "theorem": "theorems",
        "illustration": "illustrations", "multiple_choice": "multiple_choice_questions",
        "unit_exercise": "unit_exercise",
    }
    for stype, key in legacy_key_map.items():
        if extracted_data.get(key):
            extracted_types.add(stype)

    missing = expected_types - extracted_types
    # Filter out types that are always implicitly present or too generic
    skip_always = {"introduction", "section", "subsection", "learning_objectives", "other"}
    missing = missing - skip_always

    # FIX: Subject-aware filtering — don't chase types that don't exist in this subject
    subject_irrelevant = {
        "mathematics": {"prose", "poem", "supplementary", "speaking", "listening",
                        "map_work", "timeline", "fun_fact"},
        "science":     {"prose", "poem", "supplementary", "speaking", "listening",
                        "map_work", "timeline", "theorem", "proof", "illustration"},
        "social_science": {"prose", "poem", "supplementary", "theorem", "proof",
                           "illustration", "progress_check", "thinking_corner"},
        "english":     {"theorem", "proof", "illustration", "map_work", "timeline",
                        "thinking_corner", "progress_check", "construction",
                        "do_you_know", "more_to_know", "try_this"},
    }
    subject_val = str(subject) if subject else ""
    if subject_val in subject_irrelevant:
        missing = missing - subject_irrelevant[subject_val]

    if not missing:
        print(f"  ✅ [Fix5] Completeness check passed — all {len(expected_types)} types present")
        return extracted_data

    print(f"  ⚠️  [Fix5] Missing types detected: {missing} — running targeted re-extraction...")

    # Pass 2: targeted extraction for each missing type
    for missing_type in sorted(missing):
        targeted_content = unit_content[:30000]  # Use first 30k chars for targeted scan
        targeted_prompt = (
            "From the textbook content below, extract ONLY the '" + missing_type + "' sections. "
            "Return JSON: {\"sections\": [{\"type\": \"" + missing_type + "\", \"id\": null, "
            "\"title\": null, \"content\": \"...\", \"metadata\": {}, \"sub_items\": []}]}\n\n"
            "Content:\n" + targeted_content
        )
        gap_payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": get_universal_system_prompt()},
                {"role": "user", "content": targeted_prompt},
            ],
            
            "max_completion_tokens": 8192,
            "response_format": {"type": "json_object"},
        }
        try:
            gap_resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers, json=gap_payload, timeout=timeout
            )
            if gap_resp.ok:
                gap_raw = gap_resp.json()["choices"][0]["message"]["content"]
                gap_data = orjson.loads(gap_raw)
                new_sections = gap_data.get("sections", [])
                if new_sections:
                    extracted_data.setdefault("sections", []).extend(new_sections)
                    print(f"  ✅ [Fix5] Recovered {len(new_sections)} '{missing_type}' section(s)")
                else:
                    print(f"  ℹ️  [Fix5] No '{missing_type}' found in targeted pass (may be false positive)")
        except Exception as e:
            print(f"  ⚠️  [Fix5] Targeted extraction for '{missing_type}' failed: {e}")

    return extracted_data



# UNIVERSAL EXTRACTOR — wraps structure_unit_with_llm_chunked with universal schema


def structure_unit_universal(
    unit_content: str,
    unit_number: int,
    api_key: str,
    subject: str,
    part_name: Optional[str] = None,
    model: str = "gpt-5-mini",
    timeout: int = 600,
    max_retries: int = 3,
    enable_completeness_check: bool = True,
) -> Optional[Dict[str, Any]]:
    """
    Universal extractor: uses the universal schema and system prompt so that
    ANY element type found in the content is captured — not just those in
    pre-defined subject-specific schemas.

    Integrates Fix 2 (semantic chunking), Fix 4 (truncation recovery), and
    Fix 5 (completeness check). Compatible with Social Science part_name.
    """
    if not SUBJECT_AWARE_AVAILABLE:
        # Fall back to old subject-specific extractor
        return structure_unit_with_llm_chunked(
            unit_content=unit_content,
            unit_number=unit_number,
            api_key=api_key,
            subject=subject,
            part_name=part_name,
            model=model,
            timeout=timeout,
            max_retries=max_retries,
        )

    from subject_aware_extraction import (
        get_universal_system_prompt, create_universal_user_prompt,
        merge_universal_chunks, validate_universal_structure
    )

    content_type = "chapter" if subject == "mathematics" else "unit"
    english_chunk_size = 25_000   # Increased: English units need large chunks to capture full stories
    chunk_size = english_chunk_size if subject == "english" else _CHUNK_MAX_CHARS
    chunks = _split_into_chunks_semantic(unit_content, chunk_size)

    # structure_unit_universal is only reached for UNKNOWN subjects now.
    # Known subjects (English, Maths, Science, SocialScience) are handled
    # by the subject-specific path in structure_unit_with_llm_chunked.
    system_prompt = get_universal_system_prompt()

    if subject == "social_science" and part_name:
        system_prompt += (
            f"\n\n⚠️  This content belongs to the '{part_name}' section. "
            f"Set the 'part' field to exactly '{part_name}'."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    chunk_results: List[Dict[str, Any]] = []

    for chunk_idx, chunk in enumerate(chunks, 1):
        user_prompt = create_universal_user_prompt(
            unit_content=chunk,
            unit_number=unit_number,
            subject=subject,
            part_name=part_name,
            chunk_index=chunk_idx,
            total_chunks=len(chunks),
        )

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            
            "max_completion_tokens": 16384,
            "response_format": {"type": "json_object"},
        }

        if len(chunks) > 1:
            print(f"  🔀 Universal chunk {chunk_idx}/{len(chunks)} ({len(chunk):,} chars)...")

        unit_data = None
        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    wait_time = LLM_CONFIG["base_delay"] * (3 ** attempt)
                    print(f"  ⏳ Retry {attempt+1}/{max_retries} after {wait_time}s...")
                    time.sleep(wait_time)

                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers, json=payload, timeout=timeout
                )
                resp.raise_for_status()
                resp_data = resp.json()

                choice = resp_data["choices"][0]
                raw_content = choice["message"]["content"]
                finish_reason = choice.get("finish_reason", "stop")

                # content_filter: gpt-5-mini blocked — retry once with gpt-4o fallback
                if finish_reason == "content_filter":
                    if payload.get("model") != "gpt-4o":
                        print(f"  ⚠️  content_filter: gpt-5-mini blocked — retrying with gpt-4o fallback...")
                        fb_payload = {**payload, "model": "gpt-4o"}
                        try:
                            fb_resp = requests.post(
                                "https://api.openai.com/v1/chat/completions",
                                headers=headers, json=fb_payload, timeout=timeout
                            )
                            fb_resp.raise_for_status()
                            fb_data = fb_resp.json()
                            if fb_data.get("choices"):
                                fb_choice = fb_data["choices"][0]
                                fb_content = fb_choice["message"]["content"]
                                fb_reason = fb_choice.get("finish_reason", "stop")
                                print(f"  📊 Fallback response: {len(fb_content):,} chars (finish_reason={fb_reason})")
                                if fb_reason != "content_filter" and fb_content:
                                    # BUG FIX: parse JSON before using — returning raw string caused downstream KeyError
                                    try:
                                        cleaned_fb = re.sub(r'^```[a-z]*\n?', '', fb_content.strip()).rstrip('`').strip()
                                        unit_data = orjson.loads(cleaned_fb.encode() if isinstance(cleaned_fb, str) else cleaned_fb)
                                        break
                                    except Exception:
                                        pass
                        except Exception as fb_err:
                            print(f"  ⚠️  gpt-4o fallback failed: {fb_err}")
                    print(f"  ⚠️  content_filter: Both gpt-5-mini and gpt-4o blocked this section — skipping")
                    return None

                # Fix 4: truncation recovery
                if finish_reason == "length":
                    print(f"  ⚠️  [Fix4/Universal] Truncated — recovering...")
                    rec_msgs = payload["messages"] + [
                        {"role": "assistant", "content": raw_content},
                        {"role": "user", "content": (
                            "Your JSON was cut off. Continue from exactly where you stopped. "
                            "Output ONLY the remaining JSON — no explanations."
                        )}
                    ]
                    rec_payload = {**payload, "messages": rec_msgs, "max_completion_tokens": 8192}
                    rec_resp = requests.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers=headers, json=rec_payload, timeout=timeout
                    )
                    if rec_resp.ok:
                        raw_content += rec_resp.json()["choices"][0]["message"]["content"]

                # Parse with salvage fallback (Fix 4b)
                try:
                    cleaned = re.sub(r'^```[a-z]*\n?', '', raw_content).strip().rstrip('`')
                    unit_data = orjson.loads(cleaned.encode() if isinstance(cleaned, str) else cleaned)
                except Exception:
                    for end in range(len(raw_content), 0, -1):
                        if raw_content[end-1] in ('}', ']'):
                            try:
                                unit_data = orjson.loads(raw_content[:end].encode() if isinstance(raw_content[:end], str) else raw_content[:end])
                                print(f"  ✅ [Fix4b] Salvaged JSON to char {end}")
                                break
                            except Exception:
                                continue

                if unit_data:
                    if subject == "social_science" and part_name:
                        if unit_data.get("part") != part_name:
                            unit_data["part"] = part_name
                    break

            except Exception as e:
                print(f"  ❌ [Universal] Attempt {attempt+1} error: {e}")
                if attempt == max_retries - 1:
                    print(f"  ❌ [Universal] All retries failed for chunk {chunk_idx}")

        if unit_data:
            chunk_results.append(unit_data)
        else:
            print(f"  ⚠️  [Universal] Chunk {chunk_idx} failed — continuing")

    if not chunk_results:
        return None

    merged = merge_universal_chunks(chunk_results)

    # Fix 5: completeness check (optional, adds one LLM call per unit)
    if enable_completeness_check and len(unit_content) > 2000:
        merged = _verify_and_fill_gaps(
            unit_content=unit_content,
            extracted_data=merged,
            unit_number=unit_number,
            api_key=api_key,
            subject=subject,
            model=model,
            timeout=min(timeout, 120),
        )

    section_count = len(merged.get("sections", []))
    print(f"  ✅ [Universal] {content_type} {unit_number}: {section_count} sections extracted")
    # Post-extraction normalization: fix type labels, drop image-only, merge prose
    subject_str = str(subject) if subject else ""
    merged["sections"] = _normalize_section_types(merged.get("sections", []), subject_str)

    return merged


def structure_content_chunked(
    markdown: str,
    api_key: str,
    subject: str,
    model: str = "gpt-5-mini"
) -> Optional[Dict[str, Any]]:
    """TRULY UNIVERSAL: Works with ANY textbook structure!"""

    content_type = "chapter" if subject == "mathematics" else "unit"

    # Auto-upgrade to gpt-4o for Mathematics: illustrations, theorems,
    # gpt-5-mini handles most subjects; gpt-4o kept for complex math visuals
    # proofs, and LaTeX-heavy content need higher reasoning capacity.
    effective_model = model
    if subject == "mathematics" and model == "gpt-5-mini":
        effective_model = "gpt-4o"  # keep gpt-4o for math diagrams/theorems
        print(f"  🔼 Auto-upgrading to {effective_model} for Mathematics (better illustration/theorem capture)")

    print(f"  Structuring {str(subject)} content with {effective_model}...")
    
    results = []
    failed_units = []
    
    if subject == "social_science":
        # UNIVERSAL detection from TOC
        part_boundaries = detect_parts_from_toc_universal(markdown)

        if not part_boundaries:
            # ── SINGLE-UNIT FALLBACK ─────────────────────────────────────────
            # No multi-part TOC found. This is a single-unit PDF (e.g. Unit_01_History.pdf).
            # Detect unit number from content, detect part name from keywords, then
            # treat the whole markdown as one unit — no part-splitting needed.
            print(f"  ℹ️  No multi-part TOC — treating as single-unit social science PDF")

            # Step 1: find unit number
            unit_numbers = infer_units_or_chapters_from_markdown(markdown, subject)
            if not unit_numbers:
                _hits = re.findall(r'Unit\s*[-–]?\s*(\d+)', markdown, re.IGNORECASE)
                unit_numbers = sorted(set(int(n) for n in _hits if 1 <= int(n) <= 50))
            if not unit_numbers:
                print(f"  ⚠️  No unit number detected — defaulting to 1")
                unit_numbers = [1]

            # Step 2: detect part name from content keywords
            _part_keywords = {
                "History":    ["history", "historical", "world war", "revolution", "nationalism",
                                "colonialism", "imperialism"],
                "Geography":  ["geography", "geographical", "drainage", "climate", "vegetation",
                                "agriculture", "population", "transport"],
                "Civics":     ["civics", "civic", "constitution", "government", "parliament",
                                "political", "foreign policy", "central government"],
                "Economics":  ["economics", "economic", "gdp", "globalization", "food security",
                                "taxes", "industrial", "trade"],
            }
            _md_lower = markdown[:15000].lower()   # widened: single-unit PDFs may have cover/TOC pages
            detected_part = None
            for _pname, _kws in _part_keywords.items():
                if sum(1 for kw in _kws if kw in _md_lower) >= 2:
                    detected_part = _pname
                    print(f"  🔍 Detected part from content: {detected_part}")
                    break
            if not detected_part:
                # Fallback: look for part name in .indd filename stamps
                _indd_m = re.search(
                    r'\d+_([A-Za-z]+)_Unit_\d+_EM\.indd',
                    markdown, re.IGNORECASE
                )
                if _indd_m:
                    detected_part = _indd_m.group(1).capitalize()
                    print(f"  🔍 Detected part from .indd stamp: {detected_part}")

            for unit_num in unit_numbers:
                print(f"  📄 Processing Unit {unit_num}"
                      + (f" ({detected_part})" if detected_part else "") + " ...")

                # For a single-unit PDF the whole markdown IS the unit content
                if len(unit_numbers) > 1:
                    _uc = extract_unit_content(markdown, unit_num, subject=subject)
                    unit_content = _uc if len(_uc) >= 200 else markdown
                else:
                    unit_content = markdown

                unit_data = structure_unit_with_llm_chunked(
                    unit_content=unit_content,
                    unit_number=unit_num,
                    api_key=api_key,
                    subject=subject,
                    part_name=detected_part,
                    model=effective_model,
                    timeout=LLM_CONFIG["timeout"],
                    max_retries=LLM_CONFIG["max_retries"]
                )
                if unit_data:
                    results.append(unit_data)
                else:
                    failed_units.append(f"Unit {unit_num}")

        else:
            for part_name, start_line, end_line in part_boundaries:
                print(f"\n  📚 Processing {part_name} section...")

                part_content = extract_part_content(markdown, part_name, start_line, end_line)

                if len(part_content) < 500:
                    print(f"  ⚠️  Insufficient content for {part_name}")
                    continue

                numbers = infer_units_or_chapters_from_markdown(part_content, subject)
                print(f"  Found {len(numbers)} unit(s) in {part_name}")

                for unit_num in numbers:
                    print(f"  Processing {part_name} Unit {unit_num}...")

                    unit_content = extract_unit_content(part_content, unit_num, subject=subject)

                    if len(unit_content) < 200:
                        print(f"  ⚠️  Insufficient content for Unit {unit_num}")
                        continue

                    unit_data = structure_unit_with_llm_chunked(
                        unit_content=unit_content,
                        unit_number=unit_num,
                        api_key=api_key,
                        subject=subject,
                        part_name=part_name,
                        model=effective_model,
                        timeout=LLM_CONFIG["timeout"],
                        max_retries=LLM_CONFIG["max_retries"]
                    )

                    if unit_data:
                        results.append(unit_data)
                    else:
                        failed_units.append(f"{part_name} Unit {unit_num}")

    else:
        # ── CBSE ENGLISH: LLM-FIRST ──────────────────────────────────────────
        # OCR header format is inconsistent across PDFs — regex boundary detection
        # breaks when "UNIT N" has no # prefix, or story parts use "# I"/"# II".
        # Solution: for CBSE English, send the full content.md directly to the LLM.
        # The LLM reads for *meaning* and structures the unit without any regex.
        if subject == "cbse_english" and LLM_FIRST_AVAILABLE:
            print(f"  🤖 [LLM-First] Using LLM-first structuring for CBSE English")
            print(f"  📄 [LLM-First] Sending {len(markdown):,} chars directly to LLM")

            # Strip NCERT watermarks before sending
            clean_markdown = markdown
            if SUBJECT_AWARE_AVAILABLE:
                clean_markdown = strip_ncert_watermarks(markdown)

            # Strip "Notes for the Teacher" section that Beehive PDFs include at the start.
            # This teacher-only meta-content (pages 1-4) describes story summaries, hints
            # about plot content (burglar alarms, murder stories, etc.) and triggers the
            # OpenAI content filter, causing finish_reason=content_filter and empty output.
            # Strategy: find the first student-facing content marker and drop everything before it.
            # Student content markers (in order of preference):
            #   1. "BEFORE YOU READ" / "Before You Read" section heading
            #   2. "# N. Title" lesson heading in mixed-case (not ALL CAPS — those are teacher notes)
            _teacher_notes_stripped = False
            _student_start_patterns = [
                r'(?m)^##?\s*BEFORE YOU READ\b',         # Beehive: "## BEFORE YOU READ"
                r'(?m)^#+\s*Before You Read\b',           # alternate casing
                r'(?m)^BEFORE YOU READ\s*$',              # no heading marker
                r'(?m)^#+\s*\d+\.\s+[A-Z][a-z]',         # "# 1. The Fun They Had" (mixed case = student content)
            ]
            for _pat in _student_start_patterns:
                _m = re.search(_pat, clean_markdown)
                if _m and _m.start() > 500:  # only strip if teacher notes are substantial (>500 chars)
                    # Find the nearest paragraph break just before this match
                    _strip_from = clean_markdown.rfind('\n\n', 0, _m.start())
                    if _strip_from > 0:
                        _stripped = clean_markdown[_strip_from:].lstrip('\n')
                        print(f"  ✂️  [LLM-First] Stripped {_strip_from:,} chars of teacher-only content "
                              f"(avoids content filter). Student content starts: "
                              f"{repr(_stripped[:60])}")
                        clean_markdown = _stripped
                        _teacher_notes_stripped = True
                        break

            # Detect unit number as a hint — LLM will confirm from content meaning
            hint_num = detect_unit_number_from_markdown(clean_markdown)

            unit_data = structure_with_llm_first(
                content_md=clean_markdown,
                api_key=api_key,
                model=effective_model,
                hint_unit_number=hint_num,
                timeout=LLM_CONFIG["timeout"],
                max_retries=LLM_CONFIG["max_retries"],
            )

            if unit_data:
                # Normalize section type labels (fixes minor LLM label inconsistencies)
                if SUBJECT_AWARE_AVAILABLE:
                    unit_data["sections"] = _normalize_section_types(
                        unit_data.get("sections", []), "cbse_english"
                    )
                results.append(unit_data)
                print(f"  ✅ [LLM-First] Unit {unit_data.get('unit_number')} extracted successfully")
            else:
                print(f"  ❌ [LLM-First] LLM-first extraction failed")
                failed_units.append(hint_num or 1)

        else:
            # ── ALL OTHER SUBJECTS: Regex-based boundary detection ────────────
            numbers = infer_units_or_chapters_from_markdown(markdown, subject)
            if not numbers:
                print(f"  ℹ️  No {content_type} markers found — treating as single-{content_type} PDF")
                _pat = (r'\bChapter\s+(\d+)\b' if subject == "mathematics"
                        else r'\bUnit\s*[-–]?\s*(\d+)\b')
                _hits = re.findall(_pat, markdown, re.IGNORECASE)
                numbers = sorted(set(int(n) for n in _hits if 1 <= int(n) <= 50))
                if not numbers:
                    print(f"  ⚠️  Defaulting to {content_type} 1")
                    numbers = [1]
                _unit_data = structure_unit_with_llm_chunked(
                    unit_content=markdown,
                    unit_number=numbers[0],
                    api_key=api_key,
                    subject=subject,
                    model=effective_model,
                    timeout=LLM_CONFIG["timeout"],
                    max_retries=LLM_CONFIG["max_retries"]
                )
                if _unit_data:
                    results.append(_unit_data)
                else:
                    failed_units.append(numbers[0])
                print(f"  📊 Summary: {len(results)} successful, {len(failed_units)} failed")
                if not results:
                    return None
                key = "chapters" if subject == "mathematics" else "units"
                return {key: results}

            numbers = sorted(set(numbers))
            print(f"  Found {len(numbers)} {content_type}(s) in book-wise order: {numbers}")

            body_markdown = markdown
            if subject == "mathematics":
                lines_all = markdown.split('\n')
                body_start = 0
                for i, l in enumerate(lines_all[:400]):
                    if re.search(r'Chapter\s+1_English\.indd\s+1', l):
                        body_start = i
                        break
                if body_start > 0:
                    body_markdown = '\n'.join(lines_all[body_start:])
                    print(f"  ✂️  Stripped {body_start} preliminary lines; body starts at line {body_start}")

            for num in numbers:
                unit_content = extract_unit_content(body_markdown, num, subject=subject)
                if not unit_content.strip():
                    if len(numbers) == 1:
                        print(f"  ℹ️  Unit {num} 0 chars — using full markdown (single-unit PDF)")
                        unit_content = body_markdown
                    else:
                        print(f"  ⚠️  Skipping {content_type} {num} — no content extracted")
                        continue

                if SUBJECT_AWARE_AVAILABLE and is_ncert_book(unit_content):
                    unit_content = strip_ncert_watermarks(unit_content)

                unit_data = structure_unit_with_llm_chunked(
                    unit_content=unit_content,
                    unit_number=num,
                    api_key=api_key,
                    subject=subject,
                    model=effective_model,
                    timeout=LLM_CONFIG["timeout"],
                    max_retries=LLM_CONFIG["max_retries"]
                )

                if unit_data:
                    results.append(unit_data)
                else:
                    failed_units.append(num)
    
    if not results:
        return None
    
    print(f"\n  📊 Summary: {len(results)} successful, {len(failed_units)} failed")
    
    return {"chapters" if subject == "mathematics" else "units": results}



# UNIVERSAL IMAGE EXTRACTION FOR ALL SUBJECTS


def _build_page_to_unit_map(
    raw_ocr_response: Dict[str, Any],
    markdown: str,
    subject,
    valid_unit_numbers: Optional[List[int]] = None,
) -> Dict[int, int]:
    """
    Build {page_index → unit_number} using text-position of unit/chapter headers
    inside the combined markdown (which is assembled page-by-page with \n\n).

    Algorithm:
      1. Reconstruct the char-offset at which each page's markdown starts.
      2. Find every unit/chapter header position in the combined markdown.
      3. Filter out TOC clusters (multiple headers close together).
      4. Assign each page to the most-recently-seen unit header before it.
    """
    pages = raw_ocr_response.get("pages", [])
    if not pages:
        return {}

    # ── Step 1: cumulative char-offset for each page ─────────────────────────
    page_offsets: List[int] = []
    offset = 0
    for page in pages:
        page_offsets.append(offset)
        page_md = page.get("markdown", "") if isinstance(page, dict) else ""
        offset += len(page_md) + 2   # +2 for the \n\n separator

    # ── Step 2: locate every unit/chapter header in the markdown ─────────────
    unit_header_re = re.compile(
        r'(?:^|\n)(?:'
        r'#+\s*Unit\s*[-\u2013]?\s*(\d+)'           # '# Unit - 1', '## Unit-2'
        r'|(?<!\w)Unit\s*[-\u2013]\s*(\d+)(?!\d)'   # plain 'Unit - 1' (no # needed)
        r'|#+\s*Chapter\s+(\d+)'                   # '# Chapter 1'
        r'|\*{1,2}Chapter\s+(\d+)'                 # '**Chapter 1'
        r')',
        re.IGNORECASE,
    )

    all_raw_positions: List[Tuple[int, int]] = []  # (char_offset, unit_num)
    for m in unit_header_re.finditer(markdown):
        raw_num = m.group(1) or m.group(2) or m.group(3) or m.group(4)
        if raw_num:
            u_num = int(raw_num)
            # If we know which units were actually extracted, ignore headers for others
            if valid_unit_numbers is not None and u_num not in valid_unit_numbers:
                continue
            all_raw_positions.append((m.start(), u_num))

    if not all_raw_positions:
        # Fallback to the first valid unit if available
        default_unit = valid_unit_numbers[0] if valid_unit_numbers else 1
        return {i: default_unit for i in range(len(pages))}

    all_raw_positions.sort(key=lambda x: x[0])

    # ── Step 3: TOC filtering ────────────────────────────────────────────────
    # If multiple unit headers appear very close together (e.g. within 2500 chars),
    # they are likely part of a Table of Contents and should NOT be used for mapping.
    # Exception: if the entire document is very short, be less aggressive.
    toc_threshold = 2500
    filtered_positions: List[Tuple[int, int]] = []
    
    for i, (off, num) in enumerate(all_raw_positions):
        is_toc = False
        # Check if next header is very close
        if i + 1 < len(all_raw_positions):
            next_off = all_raw_positions[i+1][0]
            if next_off - off < toc_threshold:
                is_toc = True
        
        # Check if previous header was very close
        if i > 0:
            prev_off = all_raw_positions[i-1][0]
            if off - prev_off < toc_threshold:
                is_toc = True
        
        # If it's the ONLY mention of a unit, it's less likely to be TOC-spawned 
        # but in kebo101, page 1 has "Unit 1", "Chapter 1", "Chapter 4" etc.
        # We prefer the one that is NOT in a cluster.
        if not is_toc:
            filtered_positions.append((off, num))

    # If TOC filtering removed EVERYTHING (which happens if the units themselves are short),
    # fall back to the earliest mention of each unit.
    if not filtered_positions:
        _seen = set()
        for off, num in all_raw_positions:
            if num not in _seen:
                filtered_positions.append((off, num))
                _seen.add(num)
        filtered_positions.sort(key=lambda x: x[0])

    # Ensure we only keep the FIRST occurrence of each unit number among survivors
    _seen_final = set()
    unit_positions: List[Tuple[int, int]] = []
    for off, num in filtered_positions:
        if num not in _seen_final:
            _seen_final.add(num)
            unit_positions.append((off, num))

    # ── Step 4: assign each page to the active unit at its start offset ───────
    page_to_unit: Dict[int, int] = {}
    u_idx = 0
    for page_idx, page_start in enumerate(page_offsets):
        while (u_idx + 1 < len(unit_positions) and
               unit_positions[u_idx + 1][0] <= page_start):
            u_idx += 1
        
        # Assign to unit if we have any positions, else default
        if unit_positions:
            page_to_unit[page_idx] = unit_positions[u_idx][1]
        else:
            page_to_unit[page_idx] = valid_unit_numbers[0] if valid_unit_numbers else 1

    return page_to_unit


def extract_images_from_markdown(markdown: str) -> List[str]:
    """Extract all image references from markdown."""
    return re.findall(r'!\[.*?\]\((.*?)\)', markdown)


def organize_images_by_unit(
    raw_ocr_response: Dict[str, Any],
    markdown: str,
    structured_data: Dict[str, Any],
    subject,
    image_metadata: Dict[str, Any] = None,
) -> Dict[int, List[Tuple[str, bytes]]]:
    """
    Organize images by unit/chapter number using PAGE POSITION mapping.
    """
    if "pages" not in raw_ocr_response:
        print("  ℹ️  No pages key in OCR response — nothing to extract")
        return {}

    # Extract valid unit numbers from structured data
    units_key = "chapters" if subject == "mathematics" else "units"
    extracted_units = structured_data.get(units_key, [])
    valid_unit_numbers = []
    for u in extracted_units:
        num = u.get("unit_number") or u.get("chapter_number")
        if num is None and "unit" in u and isinstance(u["unit"], dict):
            num = u["unit"].get("number") or u["unit"].get("chapter")
        if num is not None:
            valid_unit_numbers.append(int(num))

    # ── SPECIAL CASE: Single-unit extraction ─────────────────────────────────
    # If the user only uploaded one unit, then ALL images in this PDF 
    # MUST belong to that unit, regardless of what's in the TOC.
    if len(valid_unit_numbers) == 1:
        forced_unit = valid_unit_numbers[0]
        print(f"  🎯 Single-unit extraction detected (Unit {forced_unit}) — forcing all images to this unit")
        images_by_unit: Dict[int, List[Tuple[str, bytes]]] = {forced_unit: []}
        for page in raw_ocr_response.get("pages", []):
            if not isinstance(page, dict): continue
            page_images = page.get("images", [])
            if not page_images and "image_base64" in page:
                page_images = [page]
            for img in page_images:
                if not isinstance(img, dict): continue
                img_data_b64 = img.get("image_base64") or img.get("image_data") or img.get("data")
                if img_data_b64:
                    # Strip data URI prefix if present
                    if "," in img_data_b64:
                        img_data_b64 = img_data_b64.split(",", 1)[1]
                    images_by_unit[forced_unit].append((img.get("id") or "image", base64.b64decode(img_data_b64)))
        
        print(f"  📸 Found {len(images_by_unit[forced_unit])} images across 1 unit(s)")
        return images_by_unit

    # ── MULTI-UNIT CASE: Use page-to-unit mapping ────────────────────────────
    page_to_unit = _build_page_to_unit_map(raw_ocr_response, markdown, subject, valid_unit_numbers)
    print(f"  🗺️  Page→unit map: {len(page_to_unit)} pages → "
          f"{len(set(page_to_unit.values()))} distinct units/chapters")

    images_by_unit: Dict[int, List[Tuple[str, bytes]]] = {}
    total_found = 0
    
    for page_idx, page in enumerate(raw_ocr_response.get("pages", [])):
        if not isinstance(page, dict):
            continue

        page_images = page.get("images", [])
        if not page_images and "image_base64" in page:
            page_images = [page]

        unit_num = page_to_unit.get(page_idx)
        if unit_num is None:
            continue

        for img_idx, img in enumerate(page_images):
            if not isinstance(img, dict):
                continue

            # Mistral OCR SDK model_dump() uses "image_base64" and "id".
            # Fallbacks cover older SDK versions or alternative response shapes.
            img_data_b64 = (
                img.get("image_base64") or   # ← canonical Mistral field
                img.get("image_data") or
                img.get("data") or
                img.get("base64") or
                img.get("base64_data")
            )

            img_name = (
                img.get("id") or             # ← canonical Mistral field
                img.get("image_name") or
                img.get("name") or
                img.get("filename") or
                f"img-{page_idx}-{img_idx}.jpeg"
            )

            img_lookup = img_name if '.' in img_name else f"{img_name}.jpeg"
            # Skip images that the Vision model classified as text boxes
            if image_metadata and img_lookup in image_metadata:
                if image_metadata[img_lookup].get("is_text_box", False):
                    continue
            # Fallback: also check without extension
            elif image_metadata:
                bare_name = img_name.split('.')[0] if '.' in img_name else img_name
                if bare_name in image_metadata and image_metadata[bare_name].get("is_text_box", False):
                    continue

            if not img_data_b64:
                continue

            # Strip data URI prefix if present
            if "," in img_data_b64:
                img_data_b64 = img_data_b64.split(",", 1)[1]

            try:
                img_bytes = base64.b64decode(img_data_b64)
                images_by_unit.setdefault(unit_num, []).append((img_name, img_bytes))
                total_found += 1
            except Exception as e:
                print(f"  ⚠️  Failed to decode image {img_name} (page {page_idx}): {e}")

    print(f"  📸 Found {total_found} images across {len(images_by_unit)} unit(s)")
    return images_by_unit




def _remove_ncert_watermark(img_bytes: bytes) -> bytes:
    """Pass-through function since LaMa watermark removal was disabled."""
    return img_bytes


def _patch_structured_json_with_s3_urls(
    structured_data: Dict[str, Any],
    s3_url_map: Dict[int, Dict[str, str]],
    image_metadata: Dict[str, Dict[str, str]] = None,
) -> None:
    """Walk structured_data in-place and replace image references with S3 URLs.

    Replaces markdown image patterns like ![img-0.jpeg](img-0.jpeg)
    with ![img-0.jpeg](https://s3-bucket-url/...) in all string values.
    Adds a 'media.images' schema to each unit.
    """
    if image_metadata is None:
        image_metadata = {}
        
    if not s3_url_map:
        return

    # Build flat lookup: filename → s3_url (across all units)
    flat_map: Dict[str, str] = {}
    for unit_urls in s3_url_map.values():
        flat_map.update(unit_urls)

    def _replace_in_string(text: str) -> str:
        """Replace image refs in a string."""
        if not isinstance(text, str):
            return text
            
        # Fast path exact match for isolated filenames (e.g. inside image_urls array)
        text_norm = text.strip()
        if text_norm in flat_map:
            return flat_map[text_norm]
            
        # Also try bare name exact match
        bare_text = text_norm.rsplit(".", 1)[0] if "." in text_norm else text_norm
        for filename, s3_url in flat_map.items():
            bare_f = filename.rsplit(".", 1)[0] if "." in filename else filename
            if bare_text == bare_f:
                return s3_url
                
        # Regex replacement for markdown patterns
        for filename, s3_url in flat_map.items():
            # Replace markdown image patterns: ![...](filename) → ![...](s3_url)
            # Use regex for more precise matching to avoid over-collateral damage
            # Matches ](filename.ext) or ](filename)
            bare_name = filename.rsplit(".", 1)[0] if "." in filename else filename
            pattern = re.compile(rf'\]\((?:{re.escape(filename)}|{re.escape(bare_name)})\)')
            text = pattern.sub(f']({s3_url})', text)
        return text

    def _walk_and_replace(obj: Any) -> Any:
        """Recursively replace image refs in all strings and specific keys."""
        if isinstance(obj, str):
            return _replace_in_string(obj)
        elif isinstance(obj, dict):
            new_obj = {}
            for k, v in obj.items():
                # Special case: if this is an image object with a specific image pointer key
                if k in ("file", "src", "path", "filename", "image_name") and isinstance(v, str):
                    # Check if the value matches any of our filenames
                    v_norm = v.strip()
                    if v_norm in flat_map:
                        new_obj[k] = flat_map[v_norm]
                    else:
                        # Try without extension
                        bare_v = v_norm.rsplit(".", 1)[0] if "." in v_norm else v_norm
                        found = False
                        for f, u in flat_map.items():
                            if bare_v == (f.rsplit(".", 1)[0] if "." in f else f):
                                new_obj[k] = u
                                found = True
                                break
                        if not found:
                            new_obj[k] = _walk_and_replace(v)
                else:
                    new_obj[k] = _walk_and_replace(v)
            return new_obj
        elif isinstance(obj, list):
            return [_walk_and_replace(item) for item in obj]
        return obj

    # Patch each unit and add image_urls field
    for units_key in ("units", "chapters"):
        units = structured_data.get(units_key, [])
        for i, unit in enumerate(units):
            unit_num = unit.get("unit_number") or unit.get("chapter_number")
            if unit_num is None and "unit" in unit and isinstance(unit["unit"], dict):
                unit_num = unit["unit"].get("number") or unit["unit"].get("chapter")
            if unit_num is None:
                unit_num = i + 1
            try:
                unit_num = int(unit_num)
            except (ValueError, TypeError):
                unit_num = i + 1

            # Replace image refs in all text content
            structured_data[units_key][i] = _walk_and_replace(unit)

            # ── Cleanup: strip bare "image" placeholders from image_urls in sections ──
            # If the LLM extracted "image" as a literal string (from OCR's ![...](image)),
            # remove it since it's not a valid URL or filename.
            def _clean_image_urls(obj):
                if isinstance(obj, dict):
                    if "image_urls" in obj and isinstance(obj["image_urls"], list):
                        obj["image_urls"] = [
                            url for url in obj["image_urls"]
                            if isinstance(url, str) and url.strip().lower() != "image"
                        ]
                    for v in obj.values():
                        _clean_image_urls(v)
                elif isinstance(obj, list):
                    for item in obj:
                        _clean_image_urls(item)
            _clean_image_urls(structured_data[units_key][i])

            # Add media schema for AI Tutor UI and lookup
            if unit_num in s3_url_map and s3_url_map[unit_num]:
                media_images = {}
                for filename, s3_url in s3_url_map[unit_num].items():
                    # get metadata for this image if it exists
                    meta = image_metadata.get(filename, {})
                    # Skip text-box images — their content was already extracted as text
                    if meta.get("is_text_box", False):
                        continue
                    media_images[filename] = {
                        "url": s3_url,
                        "description": meta.get("description") or "",
                        "extracted_text": meta.get("extracted_text") or ""
                    }
                
                # Assign media object
                structured_data[units_key][i]["media"] = {
                    "images": media_images
                }
                # Keep legacy image_urls for compatibility (also filter text-box images)
                filtered_urls = {
                    fname: url for fname, url in s3_url_map[unit_num].items()
                    if not image_metadata.get(fname, {}).get("is_text_box", False)
                }
                structured_data[units_key][i]["image_urls"] = filtered_urls


def save_images_universal(
    raw_ocr_response: Dict[str, Any],
    markdown: str,
    structured_data: Dict[str, Any],
    doc_out_dir: Path,
    subject,
    board: str,
    class_number: Optional[str] = None,
    image_metadata: Dict[str, Any] = None,
) -> Tuple[int, Dict[int, Dict[str, str]]]:
    """
    UNIVERSAL IMAGE EXTRACTION for ALL subjects.
    
    Saves images locally AND uploads to S3.
    
    Local structure:
    - Science: images/unit_1/img-1.jpg, img-2.jpg, ...
    - Mathematics: images/chapter_1/img-1.jpg, img-2.jpg, ...
    - Social Science: images/unit_1/img-1.jpg, ... unit_27/... (ALL parts together)
    
    S3 structure:
    - structured-content/{board}/{class}/{subject}/unit-{n}/{filename}
    
    Returns: (number_of_images_saved, {unit_num: {filename: s3_url}})
    """
    print(f"\n  📸 Extracting and organizing images...")
    
    # Organize images by unit
    images_by_unit = organize_images_by_unit(
        raw_ocr_response, 
        markdown, 
        structured_data, 
        subject,
        image_metadata
    )
    
    if not images_by_unit:
        print(f"  ℹ️  No images found in OCR response")
        return 0, {}
    
    # Process images (watermark removal) and upload to S3 directly
    total_processed = 0
    content_type = "chapter" if subject == "mathematics" else "unit"
    
    processed_images_by_unit: Dict[int, List[Tuple[str, bytes]]] = {}
    
    for unit_num in sorted(images_by_unit.keys()):
        images = images_by_unit[unit_num]
        processed_images: List[Tuple[str, bytes]] = []
        
        # Use Mistral's original IDs to maintain parity with the markdown tags
        for original_name, img_bytes in images:
            # Mistral IDs are usually like 'img-0.jpeg'. 
            # If it doesn't have an extension, default to .jpeg
            if '.' not in original_name:
                img_filename = f"{original_name}.jpeg"
            else:
                img_filename = original_name
            
            try:
                # Remove NCERT watermark if present
                img_bytes = _remove_ncert_watermark(img_bytes)
                processed_images.append((img_filename, img_bytes))
                total_processed += 1
            except Exception as e:
                print(f"  ⚠️  Failed to process {img_filename} in {content_type} {unit_num}: {e}")
        
        processed_images_by_unit[unit_num] = processed_images
        print(f"  ✅ Processed {len(images)} images for {content_type} {unit_num}")
    
    print(f"  ✅ Total: {total_processed} images processed in {len(images_by_unit)} {content_type}(s)")
    
    # ── Upload to S3 ──
    s3_url_map: Dict[int, Dict[str, str]] = {}
    if S3_STORAGE_AVAILABLE and processed_images_by_unit:
        subject_str = str(subject) if hasattr(subject, 'value') else str(subject) if subject else 'unknown'
        print(f"  ☁️  Uploading {total_processed} images to S3...")
        s3_url_map = upload_images_to_s3(
            images_by_unit=processed_images_by_unit,
            board=board,
            class_number=class_number or "unknown",
            subject=subject_str,
            content_category="structured",
        )
    elif not S3_STORAGE_AVAILABLE:
        print(f"  ℹ️  S3 storage not configured — images processed but NOT uploaded")
    
    return total_processed, s3_url_map





def _fix_image_placeholders(markdown: str, raw_ocr: Dict[str, Any]) -> str:
    """Replace bare ![...](image) placeholders with actual image filenames from OCR.

    Mistral OCR sometimes produces ``![alt text](image)`` instead of
    ``![alt text](img-0.jpeg)`` for pages where images are embedded as
    separate objects rather than inline references.  This function maps
    each ``(image)`` placeholder on a given page to the real image ID
    from the OCR response's ``pages[].images[]`` data.

    Algorithm:
      1. Split markdown by ``<!-- PAGE N -->`` markers.
      2. For each page, count how many ``![...](image)`` patterns exist.
      3. Look up the same page's images in ``raw_ocr["pages"]``.
      4. Replace each placeholder sequentially with the image's ``id`` field
         (e.g. ``img-0.jpeg``).
    """
    if not raw_ocr or "pages" not in raw_ocr:
        return markdown

    pages_data = raw_ocr.get("pages", [])
    if not pages_data:
        return markdown

    # Split markdown into segments by page markers
    # Pattern: <!-- PAGE N -->
    page_marker_re = re.compile(r'(<!-- PAGE (\d+) -->)')
    parts = page_marker_re.split(markdown)

    # parts will be: [before_first_marker, marker1, page_num1, content1, marker2, page_num2, content2, ...]
    # Group them: iterate in groups of 3 after the first element
    if len(parts) < 4:
        return markdown  # No page markers found

    result_parts = [parts[0]]  # Text before first page marker (if any)
    total_fixed = 0

    for i in range(1, len(parts), 3):
        if i + 2 >= len(parts):
            # Remaining parts that don't form a complete group
            result_parts.extend(parts[i:])
            break

        marker = parts[i]          # <!-- PAGE N -->
        page_num_str = parts[i+1]  # N
        content = parts[i+2]       # page content

        page_num = int(page_num_str)
        page_idx = page_num - 1  # 0-indexed

        # Count ![...](image) placeholders on this page
        placeholder_re = re.compile(r'!\[([^\]]*)\]\(image\)')
        placeholders = list(placeholder_re.finditer(content))

        if placeholders and page_idx < len(pages_data):
            page_data = pages_data[page_idx]
            if isinstance(page_data, dict):
                page_images = page_data.get("images", [])

                # Map each placeholder to an image ID
                new_content = content
                offset_adjust = 0  # Track string length changes from replacements

                for ph_idx, match in enumerate(placeholders):
                    if ph_idx < len(page_images):
                        img = page_images[ph_idx]
                        if isinstance(img, dict):
                            img_id = img.get("id", "")
                            if img_id and img_id != "image":
                                # Ensure it has an extension
                                if '.' not in img_id:
                                    img_id = f"{img_id}.jpeg"

                                old_text = match.group(0)
                                alt_text = match.group(1)
                                new_text = f"![{alt_text}]({img_id})"

                                # Replace at the correct position accounting for prior replacements
                                start = match.start() + offset_adjust
                                end = match.end() + offset_adjust
                                new_content = new_content[:start] + new_text + new_content[end:]
                                offset_adjust += len(new_text) - len(old_text)
                                total_fixed += 1

                content = new_content

        result_parts.append(marker)
        result_parts.append(content)

    if total_fixed > 0:
        print(f"  🔗 Fixed {total_fixed} bare '![...](image)' placeholder(s) with actual image filenames")

    return "".join(result_parts)


def process_pdf(
    client: Mistral,
    pdf_path: Path,
    outputs_dir: Path,
    board: str,
    openai_api_key: Optional[str] = None,
    subject: Optional[str] = None,
    auto_detect_subject: bool = False,
    use_upload_flow: bool = True,
    filter_qr_codes: bool = False,
    skip_llm_refinement: bool = False,
    skip_qdrant: bool = False,
    qdrant_client: Optional[Any] = None,
    skip_enrichment: bool = False,
    model: str = DEFAULT_MODEL,
    llm_timeout: int = 300,
    llm_max_length: int = 100000,
    part: Optional[str] = None,
    class_number: Optional[str] = None,
) -> Dict[str, Any]:
    """TRULY UNIVERSAL: Works with ANY textbook!"""
    
    langfuse = get_langfuse_client() if LANGFUSE_AVAILABLE else None
    
    # Clean up names for directory creation
    safe_board = "".join([c if c.isalnum() else "_" for c in board]) if board else "Unknown_Board"
    safe_class = "".join([c if c.isalnum() else "_" for c in class_number]) if class_number else "Unknown_Class"
    safe_subject = "".join([c if c.isalnum() else "_" for c in (subject if isinstance(subject, str) else str(subject))]) if subject else "Unknown_Subject"
    
    prefix = f"{safe_board}_{safe_class}_{safe_subject}".replace("__", "_")
    doc_out_dir = outputs_dir / f"{prefix}_{pdf_path.stem}"
    ensure_outputs_dir(doc_out_dir)
    
    pdf_dest = doc_out_dir / pdf_path.name
    if not pdf_dest.exists():
        shutil.copy2(pdf_path, pdf_dest)
    
    ocr_result = extract_with_mistral_ocr(client, pdf_path, model, use_upload_flow)
    
    if not ocr_result or not ocr_result.get("success"):
        return {"success": False, "error": "OCR failed"}
    
    markdown = ocr_result["markdown"]
    
    # Normalize excessive newlines: replace 3+ newlines with exactly 2 (max 1 blank line gap)
    import re
    markdown = re.sub(r'\n{3,}', '\n\n', markdown)
    
    # ── FIX: Replace bare ![...](image) placeholders with actual image filenames ──
    # Mistral OCR sometimes produces ![alt](image) instead of ![alt](img-N.jpeg).
    # We fix this by mapping each page's placeholder images to actual image IDs
    # from the OCR response.
    markdown = _fix_image_placeholders(markdown, ocr_result.get("raw", {}))
    
    image_metadata = {}
    
    # ── VISION FALLBACK: Extract text from DO YOU KNOW boxes hallucinated as images ──
    if openai_api_key:
        markdown, reps, image_metadata = _extract_text_from_images(markdown, ocr_result["raw"], openai_api_key)
        if reps > 0:
            markdown = re.sub(r'\n{3,}', '\n\n', markdown)
            
    ocr_result["markdown"] = markdown
    
    save_json(ocr_result["raw"], doc_out_dir / "response.json")
    save_text(markdown, doc_out_dir / "content.md")
    
    # Save a global metadata artifact for this document
    metadata_json = {
        "board": board,
        "class_number": class_number,
        "subject": subject if isinstance(subject, str) else str(subject) if subject else None,
        "document_name": pdf_path.name,
        "timestamp": time.time()
    }
    save_json(metadata_json, doc_out_dir / "metadata.json")
    print(f"  ✅ Saved markdown ({len(markdown):,} chars) and metadata")
    
    # ── VISION FALLBACK: Re-OCR garbled/scrapbook pages using GPT-4o Vision ──
    bad_pages = _detect_low_quality_pages(markdown)
    if bad_pages and openai_api_key:
        print(f"  ⚠️  Detected {len(bad_pages)} low-quality page(s) {bad_pages} — triggering Vision re-OCR...")
        vision_results = _vision_reocr_pages(pdf_path, bad_pages, openai_api_key)
        
        if vision_results:
            # Patch the markdown with the much-better vision text
            markdown = _patch_markdown_pages(markdown, vision_results)
            # Re-normalize newlines after patching
            markdown = re.sub(r'\n{3,}', '\n\n', markdown)
            # Re-save the fixed markdown
            save_text(markdown, doc_out_dir / "content.md")
            print(f"  ✅ Patched markdown with Vision OCR ({len(markdown):,} chars total)")

    # ── Diagnostic: show what chapter/unit headers actually look like in this book ──
    if subject == "mathematics" or (not subject):
        _print_markdown_sample(markdown, "OCR header format diagnostic")
    
    if not subject:
        if auto_detect_subject and SUBJECT_AWARE_AVAILABLE:
            subject = detect_subject_from_content(markdown)
        else:
            # Auto-detect by default using keyword scoring — better than defaulting to SCIENCE
            if SUBJECT_AWARE_AVAILABLE:
                subject = detect_subject_from_content(markdown)
                print(f"  🔍 Auto-detected subject: {str(subject)}")
            else:
                subject = "science"
    
    if skip_llm_refinement or not openai_api_key:
        return {
            "success": True,
            "document_id": doc_out_dir.name,
            "has_structured": False
        }
    subject_label = str(subject) if hasattr(subject, "value") else str(subject)
    
    # Select LLM model based on subject
    schema_model = "gpt-4o" if subject_label.lower().strip() == "mathematics" else "gpt-5-mini"
    
    print(f"\n  🤖 Structuring with {schema_model} ({subject_label})...")    
    # ── PRIMARY PATH: Auto-schema extraction (universal, no hardcoded schemas) ──
    structured_data = None
    extraction_method = "legacy"
    
    if AUTO_SCHEMA_AVAILABLE and openai_api_key:
        print(f"  🔍 Using auto-schema extraction (universal)...")
        try:
            # Detect unit number from content
            hint_unit = auto_detect_unit_number(markdown)
            
            auto_result = extract_with_auto_schema(
                content_md=markdown,
                api_key=openai_api_key,
                model=schema_model,
                unit_number=hint_unit,
            )
            
            if auto_result and auto_result.get("sections"):
                # Wrap in units[] format for compatibility with downstream pipeline
                structured_data = {"units": [auto_result]}
                extraction_method = "auto_schema"
                print(f"  ✅ Auto-schema extraction successful")
            else:
                print(f"  ⚠️  Auto-schema returned no sections — falling back to legacy")
        except Exception as auto_err:
            print(f"  ⚠️  Auto-schema extraction failed: {auto_err} — falling back to legacy")
            import traceback
            traceback.print_exc()
    
    # ── FALLBACK: Legacy subject-specific extraction ──
    if structured_data is None:
        if hasattr(subject, "value"):
            print(f"  📋 Using legacy subject-specific extraction...")
            structured_data = structure_content_chunked(markdown, openai_api_key, subject)
            extraction_method = "legacy"
        else:
            print(f"  ❌ Auto-schema extraction failed and no legacy schema available for custom subject '{subject}'")

    if not structured_data:
        return {
            "success": True,
            "document_id": doc_out_dir.name,
            "has_structured": False
        }
    
    structured_path = doc_out_dir / "structured.json"

    # ── Detect "part" field (e.g. History, Civics, Geography, Economics) ──
    # Step 1: Try to extract from filename (most reliable)
    #   Patterns: Unit_01_History, Unit_01_Civics, 01_History_Unit_1
    detected_part = None
    filename_stem = pdf_path.stem  # e.g. "Unit_01_History"

    # Known subject parts for social science and other multi-part textbooks
    _KNOWN_PARTS = {
        "history": "History",
        "civics": "Civics",
        "geography": "Geography",
        "economics": "Economics",
        "political_science": "Political Science",
        "political science": "Political Science",
        "sociology": "Sociology",
        "physics": "Physics",
        "chemistry": "Chemistry",
        "biology": "Biology",
        "botany": "Botany",
        "zoology": "Zoology",
        "accountancy": "Accountancy",
        "commerce": "Commerce",
    }

    # Pattern 1: Unit_NN_PartName (e.g. Unit_01_History, Unit_03_Civics)
    part_match = re.search(r'Unit[_\s]*\d+[_\s]+([A-Za-z_]+)', filename_stem, re.IGNORECASE)
    if part_match:
        raw_part = part_match.group(1).replace('_', ' ').strip()
        # Don't use "Unit" itself as part
        if raw_part.lower() not in ('unit', ''):
            detected_part = _KNOWN_PARTS.get(raw_part.lower(), raw_part.title())

    # Pattern 2: NN_PartName_Unit (e.g. 01_History_Unit_1_EM)
    if not detected_part:
        part_match = re.search(r'^\d+[_\s]+([A-Za-z]+)[_\s]+Unit', filename_stem, re.IGNORECASE)
        if part_match:
            raw_part = part_match.group(1).strip()
            detected_part = _KNOWN_PARTS.get(raw_part.lower(), raw_part.title())

    # Step 2: Try to extract from .indd page stamps in content
    if not detected_part and markdown:
        indd_match = re.search(r'(\d+)[_\s]+([A-Za-z]+)[_\s]+Unit.*?\.indd', markdown, re.IGNORECASE)
        if indd_match:
            raw_part = indd_match.group(2).strip()
            if raw_part.lower() in _KNOWN_PARTS:
                detected_part = _KNOWN_PARTS[raw_part.lower()]

    # Step 3: Content-based detection REMOVED
    # Previously scanned content for keywords like "history", "geography" etc.,
    # but this caused false positives — e.g. biology books mentioning
    # "history and philosophy of biology" would incorrectly get part="History".
    # Filename patterns and .indd stamps are sufficient for multi-part books.

    # Apply detected part and subject to all units in structured data
    # User-provided part/subject (from endpoint) takes priority over auto-detected
    final_part = part or detected_part
    units_key_part = "chapters" if subject == "mathematics" else "units"
    for i, unit in enumerate(structured_data.get(units_key_part, [])):
        if final_part and (not unit.get("part") or part):  # Override if user explicitly set part
            unit["part"] = final_part
        if subject:  # Override LLM subject guess with user-provided subject
            unit["subject"] = subject if isinstance(subject, str) else str(subject)
            # Reorder so part appears right after title
            preferred_order = [
                "unit_number", "chapter_number", "title", "part", "subject",
                "introduction", "learning_objectives", "points_to_remember",
                "sections", "glossary",
            ]
            reordered = {}
            for key in preferred_order:
                if key in unit:
                    reordered[key] = unit[key]
            # Add any remaining keys not in preferred_order
            for key in unit:
                if key not in reordered:
                    reordered[key] = unit[key]
            structured_data[units_key_part][i] = reordered
        print(f"  📋 Part: {final_part}" + (" (user-specified)" if part else " (auto-detected)"))

    save_json(structured_data, structured_path)
    
    # ── AUTO-VALIDATION: Run content validator to catch missing content ──
    validation_report = None
    if CONTENT_VALIDATOR_AVAILABLE and openai_api_key:
        print(f"\n  🔍 Running content validator...")
        try:
            # Get the unit data for validation
            units_key = "chapters" if subject == "mathematics" else "units"
            unit_list = structured_data.get(units_key, [])
            if unit_list:
                unit_data = unit_list[0] if len(unit_list) == 1 else structured_data
                report = validate_extraction(markdown, unit_data)
                validation_report = report.to_dict()
                
                # Auto-fill gaps if any significant ones found
                if report.gaps and len(report.gaps) > 0:
                    print(f"  🔧 Found {len(report.gaps)} gap(s) — auto-filling...")
                    updated_data = fill_gaps_with_llm(
                        gaps=report.gaps,
                        content_md=markdown,
                        existing_data=unit_data,
                        api_key=openai_api_key,
                        subject=subject,
                    )
                    # Update structured data with filled gaps
                    if len(unit_list) == 1:
                        structured_data[units_key][0] = updated_data
                    else:
                        structured_data = updated_data
                    
                    # Re-save with gaps filled
                    save_json(structured_data, structured_path)
                    print(f"  ✅ Gaps filled and structured.json updated")
                    
                    # Re-validate after filling
                    report2 = validate_extraction(markdown, updated_data)
                    validation_report = report2.to_dict()
                
                # Save validation report
                save_json(validation_report, doc_out_dir / "validation_report.json")
        except Exception as val_err:
            print(f"  ⚠️  Validation failed: {val_err}")
            import traceback
            traceback.print_exc()
    
    # Extract and save images (universal for all subjects) + upload to S3
    raw = ocr_result.get("raw")
    s3_url_map: Dict[int, Dict[str, str]] = {}
    if raw and structured_data:
        try:
            image_count, s3_url_map = save_images_universal(
                raw_ocr_response=raw,
                markdown=markdown,
                structured_data=structured_data,
                doc_out_dir=doc_out_dir,
                subject=subject,
                board=board,
                class_number=class_number,
                image_metadata=image_metadata,
            )
        except Exception as e:
            print(f"  ⚠️  Image extraction failed: {e}")
            import traceback
            traceback.print_exc()
            image_count = 0
    else:
        image_count = 0
    
    # ── Patch structured.json with S3 image URLs & Media Schema ──
    if s3_url_map and structured_data:
        print(f"  🔗 Patching structured.json with S3 image URLs and Media Schema...")
        _patch_structured_json_with_s3_urls(structured_data, s3_url_map, image_metadata)
        save_json(structured_data, structured_path)
        print(f"  ✅ structured.json updated with Media Schema")
    
    units_key = "chapters" if subject == "mathematics" else "units"
    units = structured_data.get(units_key, [])
    
    subject_label_out = str(subject) if hasattr(subject, "value") else str(subject) if subject else "unknown"

    summary = {
        "file": pdf_path.name,
        "document_id": doc_out_dir.name,
        "subject": subject_label_out,
        "has_structured": True,
        "extraction_method": extraction_method,
        f"{units_key}_count": len(units),
        "images_count": image_count,
    }
    
    # Include validation results if available
    if validation_report:
        summary["validation"] = {
            "coverage_pct": validation_report.get("coverage_pct", 0),
            "is_complete": validation_report.get("is_complete", False),
            "total_blocks": validation_report.get("total_blocks", 0),
            "matched_blocks": validation_report.get("matched_blocks", 0),
            "gaps_count": validation_report.get("unmatched_blocks", 0),
        }
    
    if subject == "social_science":
        parts_summary = {}
        for unit in units:
            part = unit.get("part") or "Unknown"
            parts_summary[part] = parts_summary.get(part, 0) + 1
        summary["parts_summary"] = parts_summary
        print(f"\n  📊 Parts Summary:")
        for part, count in parts_summary.items():
            print(f"     {part}: {count} unit(s)")
    
    save_json(summary, doc_out_dir / "summary.json")
    
    print(f"\n  ✅ Complete! {len(units)} units extracted, {image_count} images saved")

    # ── Enrichment ────────────────────────────────────────────────────────────
    # skip_enrichment=False (default) means enrichment SHOULD run.
    if not skip_enrichment and ENRICHMENT_AVAILABLE and openai_api_key:
        print(f"\n  🧠 Running subject-aware enrichment ({str(subject)})...")
        try:
            enriched_path = doc_out_dir / "enriched.json"
            enrichment_ok = run_enrichment(
                structured_json_path=structured_path,
                output_path=enriched_path,
            )
            summary["has_enriched"] = enrichment_ok
            if enrichment_ok:
                print(f"  ✅ Enrichment complete → {enriched_path.name}")
            else:
                print(f"  ⚠️  Enrichment finished with errors — check enriched.json")
        except Exception as e:
            print(f"  ⚠️  Enrichment failed: {e}")
            import traceback
            traceback.print_exc()
            summary["has_enriched"] = False
    elif skip_enrichment:
        print(f"\n  ⏭️  Enrichment skipped (skip_enrichment=True)")
        summary["has_enriched"] = False
    else:
        if not ENRICHMENT_AVAILABLE:
            print(f"\n  ⚠️  Enrichment module not available — skipping")
        summary["has_enriched"] = False

    # Re-save summary with enrichment status
    save_json(summary, doc_out_dir / "summary.json")

    # ── Qdrant upload ─────────────────────────────────────────────────────────
    # skip_qdrant=False (default) means upload SHOULD happen.
    # We upload enriched.json if it exists, otherwise fall back to structured.json.
    if not skip_qdrant and QDRANT_INTEGRATION_AVAILABLE:
        print(f"\n  📦 Uploading to Qdrant vector DB...")
        try:
            _q_client = qdrant_client
            if _q_client is None:
                from qdrant_integration import initialize_qdrant_client as _init_q
                _q_client = _init_q()

            if _q_client is None:
                print(f"  ⚠️  Qdrant upload skipped — could not connect to Qdrant")
                summary["qdrant_uploaded"] = False
            else:
                _doc_id   = doc_out_dir.name
                _doc_name = pdf_path.name
                _uploaded = False

                if structured_path.exists():
                    print(f"  📤 Uploading structured.json to Qdrant...")
                    _uploaded = process_and_upload_document(
                        structured_json_path=structured_path,
                        document_id=_doc_id,
                        document_name=_doc_name,
                        board=board,
                        class_number=class_number,
                        qdrant_client=_q_client
                        # process_and_upload_document now uses ChunkMetadata(book_content="structured") by default
                    )
                else:
                    print(f"  ⚠️  No structured.json found to upload")

                # Also upload explicitly to an enriched collection if enriched data exists and not skipped
                enriched_path = doc_out_dir / "enriched.json"
                if not skip_enrichment and enriched_path.exists():
                    print(f"  📤 Uploading enriched.json to Qdrant...")
                    # We can use the same function, but we need a way to pass book_content="enrichment"
                    # However, process_and_upload_document doesn't accept book_content explicitly yet
                    # For now, we'll upload it. We need to modify process_and_upload_document in qdrant_integration.py to accept book_content.
                    _uploaded_enriched = process_and_upload_document(
                        structured_json_path=enriched_path,
                        document_id=_doc_id,
                        document_name=_doc_name,
                        board=board,
                        class_number=class_number,
                        qdrant_client=_q_client,
                        book_content="enrichment",
                        collection_name=os.environ.get("QDRANT_COLLECTION_NAME", "GradeupAI_Books") + "_Enriched"
                    )
                    if _uploaded_enriched:
                        print(f"  ✅ Qdrant upload complete for enriched data")
                    else:
                        print(f"  ⚠️  Qdrant upload failed for enriched data")

                summary["qdrant_uploaded"] = _uploaded
                if _uploaded:
                    print(f"  ✅ Qdrant upload complete (document_id={_doc_id})")
                else:
                    print(f"  ⚠️  Qdrant upload failed for structured data — check Qdrant connection and logs")
        except Exception as _qe:
            print(f"  ⚠️  Qdrant upload error: {_qe}")
            import traceback as _tb
            _tb.print_exc()
            summary["qdrant_uploaded"] = False
    elif skip_qdrant:
        print(f"\n  ⏭️  Qdrant upload skipped (skip_qdrant=True)")
        summary["qdrant_uploaded"] = False
    else:
        if not QDRANT_INTEGRATION_AVAILABLE:
            print(f"\n  ⚠️  Qdrant module not available — skipping upload")
        summary["qdrant_uploaded"] = False

    # Re-save summary including Qdrant upload status
    save_json(summary, doc_out_dir / "summary.json")

    return {"success": True, **summary}


def find_pdfs(directory: Path) -> List[Path]:
    return sorted(directory.glob("*.pdf"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path", type=Path)
    parser.add_argument("--subject", choices=["science", "mathematics", "social_science"])
    parser.add_argument("--auto-detect", action="store_true")
    
    args = parser.parse_args()
    load_env()
    
    mistral_key = os.getenv("MISTRAL_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY_TEXT")
    
    if not mistral_key:
        return 1
    
    client = Mistral(api_key=mistral_key)
    subject = str(args.subject) if args.subject else None
    
    result = process_pdf(
        client=client,
        pdf_path=args.pdf_path,
        outputs_dir=Path("outputs"),
        openai_api_key=openai_key,
        subject=subject,
        auto_detect_subject=args.auto_detect
    )
    
    print("\n" + "="*60)
    print(orjson.dumps(result, option=orjson.OPT_INDENT_2).decode())
    
    return 0 if result.get("success") else 1


if __name__ == "__main__":
    sys.exit(main())
