"""
Stage 2 — Extraction Agent (per-unit, runs in parallel fan-out)
For each unit:
  1. Slices markdown by unit_boundaries
  2. Cleans (strips scanned-image tags) + injects section numbers
  3. Splits into semantic chunks (15K chars, 1500-char overlap)
  4. Builds dynamic LLM prompt from discovered_types
  5. Extracts each chunk via LLM
  6. Merges + applies post-processing filters (builds section hierarchy)
  7. Validates coverage + fills gaps
  8. Stores REAL illustration images in S3 + links their URLs into the unit

Image policy:
  • Scanner / text-box images (OCR'd into text by the vision pass) are NEVER
    stored — organize_images_by_unit and the S3 patch both skip is_text_box.
  • Real illustrations ARE stored in S3 and linked at the unit level under
    "media.images" / "image_urls".
  • No image reference is ever placed on a section, so nothing image-related
    is embedded into Qdrant vectors (section text stays clean).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean(text: str) -> str:
    try:
        from auto_schema_extractor import clean_content_for_extraction
        return clean_content_for_extraction(text)
    except Exception:
        return text


def _inject_numbers(text: str) -> str:
    try:
        from ocr_pipeline import _inject_missing_section_numbers
        return _inject_missing_section_numbers(text)
    except Exception:
        return text


def _chunk(text: str) -> List[str]:
    """Split text into 15K-char chunks with 1500-char overlap."""
    try:
        from auto_schema_extractor import _split_into_chunks
        return _split_into_chunks(text, max_chars=15_000, overlap_chars=1_500)
    except Exception:
        # Fallback: naive split
        chunks, start = [], 0
        while start < len(text):
            end = min(start + 15_000, len(text))
            chunks.append(text[start:end])
            start = end - 1_500 if end < len(text) else end
        return chunks


def _build_prompt(discovered: List[Dict]) -> str:
    try:
        from auto_schema_extractor import _build_dynamic_system_prompt
        return _build_dynamic_system_prompt(discovered)
    except Exception:
        return "Extract the textbook content into structured JSON with sections."


def _extract_chunk(chunk: str, system_prompt: str, model: str,
                   unit_number: int, chunk_idx: int, total: int,
                   api_key: str, timeout: int = 600) -> Optional[Dict]:
    """Extract a single chunk via LLM."""
    try:
        from auto_schema_extractor import (
            _build_user_prompt,
            _call_llm_for_extraction,
            _parse_json_robust,
        )
        user_prompt = _build_user_prompt(chunk, unit_number, chunk_idx, total)
        raw = _call_llm_for_extraction(
            system_prompt, user_prompt, model, api_key, timeout=timeout
        )
        return _parse_json_robust(raw)
    except Exception as e:
        print(f"    ⚠️  Chunk {chunk_idx+1}/{total} extraction failed: {e}")
        return None


def _merge(chunk_results: List[Dict], source_md: Optional[str] = None) -> Dict:
    try:
        from auto_schema_extractor import merge_extracted_chunks
        return merge_extracted_chunks(chunk_results, source_md=source_md)
    except Exception:
        # Naive merge: return first non-empty
        for r in chunk_results:
            if r:
                return r
        return {}


def _postprocess(sections: List[Dict]) -> List[Dict]:
    try:
        from auto_schema_extractor import _postprocess_sections
        return _postprocess_sections(sections)
    except Exception:
        return sections


def _validate_and_fill(unit_md: str, unit_data: Dict,
                        api_key: str, subject: str) -> Dict:
    try:
        from content_validator import validate_extraction
        from ocr_pipeline import fill_gaps_with_llm
        report = validate_extraction(unit_md, unit_data)
        if report and report.gaps:
            print(f"    🔧 Filling {len(report.gaps)} content gap(s)...")
            unit_data = fill_gaps_with_llm(
                gaps=report.gaps,
                content_md=unit_md,
                existing_data=unit_data,
                api_key=api_key,
                subject=subject,
            )
        return unit_data
    except Exception as e:
        print(f"    ⚠️  Validation/gap-fill failed: {e}")
        return unit_data


def _store_illustration_images(
    raw_ocr:        Dict,
    unit_md:        str,
    unit_data:      Dict,
    doc_out_dir:    Path,
    subject:        str,
    board:          str,
    class_number:   str,
    image_metadata: Dict,
) -> tuple:
    """
    Save REAL illustration images (never text-boxes) to S3 and link their URLs
    into the unit at the unit level. Both save_images_universal and the S3 patch
    skip images flagged is_text_box, so scanner images are excluded.

    URLs land in unit_data["media"]["images"] / unit_data["image_urls"] — the
    section text is left untouched, so nothing image-related is embedded in
    Qdrant. Returns (illustration_count, patched_unit_data).
    """
    try:
        from ocr_pipeline import (
            save_images_universal,
            _patch_structured_json_with_s3_urls,
        )
        count, s3_url_map = save_images_universal(
            raw_ocr_response=raw_ocr,
            markdown=unit_md,
            structured_data={"units": [unit_data]},
            doc_out_dir=doc_out_dir,
            subject=subject,
            board=board,
            class_number=class_number,
            image_metadata=image_metadata,
        )
        # Patch works in-place on the wrapper; read the unit back out.
        wrapper = {"units": [unit_data]}
        _patch_structured_json_with_s3_urls(wrapper, s3_url_map, image_metadata)
        unit_data = wrapper.get("units", [unit_data])[0]
        return count, unit_data
    except Exception as e:
        print(f"    ⚠️  Illustration image storage failed: {e}")
        return 0, unit_data


# ── LangGraph Node ────────────────────────────────────────────────────────────

def extract_unit_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stage 2 — per-unit extraction (runs concurrently for each unit via Send).

    Reads from state (fan-out): target_unit, content_md, unit_boundaries,
        discovered_types, subject, api_key, raw_ocr_response, image_metadata,
        doc_id, board, class_number
    Writes (via reducer):       structured_data, extraction_reports
    """
    unit          = state["target_unit"]
    unit_num      = unit.get("number", 1)
    content_md    = state["content_md"]
    boundaries    = state.get("unit_boundaries", {})
    discovered    = state.get("discovered_types", [])
    subject       = state.get("subject", "unknown")
    api_key       = state.get("api_key", "")
    raw_ocr       = state.get("raw_ocr_response", {})
    image_meta    = state.get("image_metadata", {})
    doc_id        = state.get("doc_id", "doc")
    board         = state.get("board", "unknown")
    class_number  = state.get("class_number", "unknown")

    model = "gpt-4o" if subject in ("mathematics", "maths") else "gpt-4o-mini"

    print(f"\n  📖 Extracting Unit {unit_num}: {unit.get('title', '')}")

    # Step 1: Slice unit markdown
    bounds  = boundaries.get(unit_num, {"start_char": 0, "end_char": len(content_md)})
    unit_md = content_md[bounds["start_char"]: bounds["end_char"]]

    if not unit_md.strip():
        print(f"  ⚠️  Unit {unit_num}: empty markdown slice — skipping")
        return {
            "structured_data":    {"units": []},
            "extraction_reports": [{"unit_number": unit_num, "success": False,
                                    "error": "empty slice"}],
        }

    # Step 2: Clean + inject section numbers
    cleaned = _clean(unit_md)
    cleaned = _inject_numbers(cleaned)

    # Step 3: Build dynamic prompt
    system_prompt = _build_prompt(discovered)

    # Step 4: Chunk
    chunks = _chunk(cleaned)
    print(f"    📄 {len(chunks)} chunk(s) — {len(cleaned):,} chars")

    # Step 5: Extract each chunk
    chunk_results = []
    for i, chunk in enumerate(chunks):
        print(f"    🔄 Chunk {i+1}/{len(chunks)}...")
        result = _extract_chunk(chunk, system_prompt, model,
                                unit_num, i, len(chunks), api_key)
        if result:
            chunk_results.append(result)

    if not chunk_results:
        print(f"  ❌ Unit {unit_num}: all chunks failed")
        return {
            "structured_data":    {"units": []},
            "extraction_reports": [{"unit_number": unit_num, "success": False,
                                    "error": "all_chunks_failed"}],
        }

    # Step 6: Merge chunks (section ids realigned against the cleaned markdown)
    merged = _merge(chunk_results, source_md=cleaned)

    # Step 7: Post-process (14 filters)
    if "sections" in merged:
        merged["sections"] = _postprocess(merged["sections"])

    # Ensure unit metadata
    merged.setdefault("unit_number", unit_num)
    merged.setdefault("title", unit.get("title", f"Unit {unit_num}"))
    merged.setdefault("subject", subject)

    # Step 8: Validate + gap fill
    # Validate against the CLEANED markdown (image tags stripped) so the gap
    # filler never re-injects scanned-image references into the output.
    merged = _validate_and_fill(cleaned, merged, api_key, subject)

    # Step 9: Store REAL illustration images in S3 (text-boxes excluded) and
    # link their URLs at the unit level. Section text stays clean, so no image
    # reference is ever embedded into Qdrant.
    from config import OUTPUTS_DIR
    doc_out_dir = OUTPUTS_DIR / doc_id
    doc_out_dir.mkdir(parents=True, exist_ok=True)

    img_count, merged = _store_illustration_images(
        raw_ocr, unit_md, merged, doc_out_dir,
        subject, board, class_number, image_meta,
    )

    sections_found = len(merged.get("sections", []))
    print(f"  ✅ Unit {unit_num}: {sections_found} section(s), "
          f"{img_count} illustration image(s) stored")

    # Determine units key (chapters for math)
    units_key = "chapters" if subject in ("mathematics", "maths") else "units"

    return {
        "structured_data": {units_key: [merged]},
        "extraction_reports": [{
            "unit_number":    unit_num,
            "success":        True,
            "sections_found": sections_found,
            "chunks_used":    len(chunks),
            "illustration_images": img_count,
        }],
    }
