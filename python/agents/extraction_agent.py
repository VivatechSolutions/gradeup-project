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

import os
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional

from langfuse_utils import in_current_context
from logger import get_logger

logger = get_logger(__name__)

# Seconds to wait before re-trying chunks that produced nothing. Sized for a
# per-minute provider quota to refill, not for a network blip.
_CHUNK_RETRY_DELAY = int(os.getenv("EXTRACTION_CHUNK_RETRY_DELAY", "30"))

# How many chunk-extraction LLM calls to run at once. Chunks are independent, so
# the old sequential loop spent ~22 min running six ~3-6 min Qwen calls end to
# end; firing them together collapses that toward the slowest single call. Kept
# bounded so a burst does not trip one provider's per-minute rate limit — the
# per-call 429 re-route (auto_schema_extractor) still spreads load across
# providers on top of this.
_EXTRACTION_CONCURRENCY = max(1, int(os.getenv("EXTRACTION_CONCURRENCY", "6")))


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
    """
    Split a unit for extraction — normally into exactly one chunk.

    Sized from EXTRACTION_MAX_CHUNK_CHARS (default 300k) rather than the old
    hard-coded 15k, which was a gpt-4o-mini-era limit. Splitting a unit mid-way
    loses content at the merge: a 17.7k-char unit became two chunks and its
    exercise block was dropped entirely.
    """
    try:
        from config import EXTRACTION_MAX_CHUNK_CHARS, EXTRACTION_CHUNK_OVERLAP
        max_chars, overlap = EXTRACTION_MAX_CHUNK_CHARS, EXTRACTION_CHUNK_OVERLAP
    except Exception:
        max_chars, overlap = 300_000, 2_000

    try:
        from auto_schema_extractor import _split_into_chunks
        return _split_into_chunks(text, max_chars=max_chars, overlap_chars=overlap)
    except Exception:
        # Fallback: naive split
        chunks, start = [], 0
        while start < len(text):
            end = min(start + max_chars, len(text))
            chunks.append(text[start:end])
            start = end - overlap if end < len(text) else end
        return chunks


def _build_prompt(discovered: List[Dict]) -> str:
    """Build the type-aware extraction prompt from the discovery result.

    Normalises the shape first. _build_dynamic_system_prompt indexes both
    s["type"] and s["title"], so a list of bare type strings — the shape the
    pipeline report stores — raises TypeError. That used to fall through to the
    one-line fallback below, and a 64-character prompt against a 100k-char unit
    returns a handful of wrong-schema sections while still reporting success.
    """
    normalised: List[Dict[str, str]] = []
    for item in discovered or []:
        if isinstance(item, str):
            normalised.append({"type": item, "title": ""})
        elif isinstance(item, dict) and item.get("type"):
            normalised.append({"type": item["type"], "title": item.get("title") or ""})

    try:
        from auto_schema_extractor import _build_dynamic_system_prompt
        return _build_dynamic_system_prompt(normalised)
    except Exception as e:
        # Loud: the generic prompt extracts almost nothing, and silence here is
        # indistinguishable from the model simply doing badly.
        logger.error(
            f"Failed to build the type-aware prompt from {len(normalised)} "
            f"discovered section(s): {type(e).__name__}: {e}. Falling back to the "
            f"generic prompt — extraction quality will be far worse."
        )
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
        # Distinguish the two ways a chunk comes back empty. Both used to return
        # None with no log of their own, so a rate-limited chunk and a malformed
        # reply were indistinguishable — and both vanished into a run that still
        # reported success.
        if not raw:
            logger.error(
                f"Chunk {chunk_idx+1}/{total} of unit {unit_number}: no response "
                f"from {model} after retries — this chunk's content is LOST"
            )
            return None
        parsed = _parse_json_robust(raw)
        if isinstance(parsed, dict) and parsed.get("sections"):
            # Normalise here, before anything downstream touches it. The model
            # returns a worked example's content as {"solution": "..."} often
            # enough that the un-normalised shape crashed the chunk merge and
            # cost five of six chunks.
            try:
                from auto_schema_extractor import coerce_section_content
                coerce_section_content(parsed["sections"])
            except Exception as ce:
                logger.warning(f"content coercion skipped: {type(ce).__name__}: {ce}")
        if parsed is None:
            logger.error(
                f"Chunk {chunk_idx+1}/{total} of unit {unit_number}: unparseable "
                f"reply ({len(raw)} chars) — this chunk's content is LOST"
            )
        return parsed
    except Exception as e:
        logger.error(
            f"Chunk {chunk_idx+1}/{total} of unit {unit_number} failed: "
            f"{type(e).__name__}: {e} — this chunk's content is LOST"
        )
        return None


def _merge(chunk_results: List[Dict], source_md: Optional[str] = None) -> Dict:
    """Combine per-chunk extractions, reporting what the merge absorbed.

    Chunks overlap by design, so the raw section count is always higher than the
    merged one and a large drop is expected. The numbers matter because a merge
    that also eats CONTENT looks identical to one that only removes duplicates —
    the reduction from 79 raw sections to 18 happens here, not in postprocess.
    """
    try:
        from auto_schema_extractor import merge_extracted_chunks, _section_text_volume
    except Exception:
        for r in chunk_results:
            if r:
                return r
        return {}

    raw_sections = [s for r in chunk_results for s in (r.get("sections") or [])]
    raw_n, raw_v = len(raw_sections), _section_text_volume(raw_sections)

    try:
        merged = merge_extracted_chunks(chunk_results, source_md=source_md)
    except Exception as e:
        # This fallback throws away every chunk but the first, so it must never
        # be a one-line warning again: a dict-valued `content` field silently
        # cost 5 of 6 chunks on a real run.
        logger.error(
            f"[Merge] FAILED ({type(e).__name__}: {e}) — falling back to CHUNK 1 "
            f"ONLY. {len(chunk_results) - 1} chunk(s) will be DISCARDED.",
            exc_info=True,
        )
        for r in chunk_results:
            if r:
                return r
        return {}

    out_sections = merged.get("sections") or []
    out_n, out_v = len(out_sections), _section_text_volume(out_sections)
    kept = (100.0 * out_v / raw_v) if raw_v else 100.0
    logger.info(
        f"[Merge] {len(chunk_results)} chunk(s): {raw_n} raw section(s)/{raw_v:,} chars "
        f"-> {out_n}/{out_v:,} ({kept:.0f}% of text kept)"
    )
    if raw_v and kept < 70.0:
        logger.warning(
            f"[Merge] dropped {100 - kept:.0f}% of extracted text while merging "
            f"chunks — more than overlap dedup should account for"
        )
    return merged


def _derive_title(unit_md: str, unit_num: Any) -> Optional[str]:
    try:
        from auto_schema_extractor import derive_unit_title
        return derive_unit_title(unit_md, unit_num)
    except Exception:
        return None


def _grounded(value: Any, source_md: str) -> bool:
    try:
        from extraction_audit import grounded_in_source
        return grounded_in_source(value, source_md)
    except Exception:
        return True          # cannot check — leave the value alone


def _is_placeholder_title(title: str) -> bool:
    try:
        from auto_schema_extractor import is_placeholder_unit_title
        return is_placeholder_unit_title(title)
    except Exception:
        return not (title or "").strip()


def _postprocess(sections: List[Dict], source_md: str = "") -> List[Dict]:
    try:
        from auto_schema_extractor import _postprocess_sections
        # source_md is what lets the unnumbered-book passes run: without it the
        # hierarchy stays flat and OCR'd diagram labels stay top-level sections.
        return _postprocess_sections(sections, source_md or None)
    except Exception:
        return sections


def _validate_and_fill(unit_md: str, unit_data: Dict,
                        api_key: str, subject: str) -> Dict:
    try:
        from content_validator import validate_extraction
        from ocr_pipeline import fill_gaps_with_llm
        report = validate_extraction(unit_md, unit_data)
        if report and report.gaps:
            logger.info(f"Filling {len(report.gaps)} content gap(s)...")
            unit_data = fill_gaps_with_llm(
                gaps=report.gaps,
                content_md=unit_md,
                existing_data=unit_data,
                api_key=api_key,
                subject=subject,
            )
        return unit_data
    except Exception as e:
        logger.warning(f"Validation/gap-fill failed: {e}")
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
        logger.warning(f"Illustration image storage failed: {e}")
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
    part          = state.get("part")
    api_key       = state.get("api_key", "")
    raw_ocr       = state.get("raw_ocr_response", {})
    image_meta    = state.get("image_metadata", {})
    doc_id        = state.get("doc_id", "doc")
    board         = state.get("board", "unknown")
    class_number  = state.get("class_number", "unknown")

    # Model selection: EXTRACTION_MODEL (Qwen3-235B) for all subjects via OpenRouter
    try:
        from config import EXTRACTION_MODEL
        model = EXTRACTION_MODEL   # qwen/qwen3-235b-a22b-2507
    except Exception:
        model = "qwen/qwen3-235b-a22b-2507"

    logger.info(f"Extracting Unit {unit_num}: {unit.get('title', '')}")

    # Step 1: Slice unit markdown
    bounds  = boundaries.get(unit_num, {"start_char": 0, "end_char": len(content_md)})
    unit_md = content_md[bounds["start_char"]: bounds["end_char"]]

    if not unit_md.strip():
        logger.warning(f"Unit {unit_num}: empty markdown slice — skipping")
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
    logger.info(f"Unit {unit_num}: {len(chunks)} chunk(s) — {len(cleaned):,} chars")

    # Step 5: Extract chunks CONCURRENTLY. They are independent of one another,
    # so running them one at a time only ever cost wall time: six sequential
    # ~3-6 min calls were ~22 min of a 32 min run. Fired together the stage costs
    # roughly the slowest single chunk instead of their sum.
    results_by_idx: Dict[int, Optional[Dict]] = {}

    def _run(idx_chunk) -> None:
        i, chunk = idx_chunk
        result = _extract_chunk(chunk, system_prompt, model,
                                unit_num, i, len(chunks), api_key)
        # Retry once IN THIS THREAD, so a re-run overlaps the chunks still in
        # flight instead of waiting for the whole batch and then running alone.
        # A math-dense chunk here occasionally runs away - generating 45-70k
        # chars until it hits the token cap and truncates mid-JSON - and the
        # fresh retry has succeeded every time it was needed, while the
        # truncation-recovery continuation it replaces succeeded 0 of 3 times.
        if not result:
            logger.warning(
                f"↻ Unit {unit_num}: chunk {i+1}/{len(chunks)} produced nothing "
                f"— retrying immediately (in parallel with the rest)"
            )
            result = _extract_chunk(chunk, system_prompt, model,
                                    unit_num, i, len(chunks), api_key)
            if result:
                logger.info(f"Unit {unit_num}: chunk {i+1} recovered on immediate retry")
        results_by_idx[i] = result

    def _extract_all(work: List) -> None:
        """Run a batch of (index, chunk) pairs, bounded. Never raises: an
        individual chunk failure is already logged and recorded as None."""
        if not work:
            return
        with ThreadPoolExecutor(
            max_workers=min(len(work), _EXTRACTION_CONCURRENCY)
        ) as pool:
            # submit(), not map(): in_current_context has to be applied once per
            # item from this thread. It snapshots the caller's context so each
            # chunk's extraction span stays a child of the unit being extracted
            # instead of starting its own trace, and one snapshot cannot be
            # entered by two workers at once.
            futures = [pool.submit(in_current_context(_run), item) for item in work]
            for future in futures:
                future.result()

    logger.info(
        f"Unit {unit_num}: extracting {len(chunks)} chunk(s), "
        f"up to {min(len(chunks), _EXTRACTION_CONCURRENCY)} in parallel"
    )
    _extract_all(list(enumerate(chunks)))

    pending_retry = [(i, chunks[i]) for i in range(len(chunks))
                     if not results_by_idx.get(i)]
    failed_chunks = [i + 1 for i, _c in pending_retry]

    # Second pass. A failed chunk is permanent content loss, and the usual cause
    # is a transient upstream 429 on OpenRouter's shared pool - one run lost five
    # of six chunks and shipped a chapter containing only section 2.1. The pause
    # lets a per-minute quota refill instead of retrying straight into it.
    if pending_retry:
        logger.warning(
            f"Unit {unit_num}: retrying {len(pending_retry)} failed chunk(s) "
            f"after {_CHUNK_RETRY_DELAY}s"
        )
        time.sleep(_CHUNK_RETRY_DELAY)
        _extract_all(pending_retry)
        for idx, _pending in pending_retry:
            if results_by_idx.get(idx):
                failed_chunks.remove(idx + 1)
                logger.info(f"Unit {unit_num}: chunk {idx+1} recovered on retry")

    # Gather in TEXTBOOK ORDER. The merge's overlap dedup assumes chunks arrive
    # in document order, so results are collected by index rather than in the
    # order the threads happened to finish.
    chunk_results = [results_by_idx[i] for i in range(len(chunks))
                     if results_by_idx.get(i)]

    if not chunk_results:
        logger.error(f"Unit {unit_num}: all chunks failed")
        return {
            "structured_data":    {"units": []},
            "extraction_reports": [{"unit_number": unit_num, "success": False,
                                    "error": "all_chunks_failed"}],
        }

    # Step 6: Merge chunks (section ids realigned against the cleaned markdown)
    merged = _merge(chunk_results, source_md=cleaned)

    # Step 7: Post-process (14 filters)
    if "sections" in merged:
        merged["sections"] = _postprocess(merged["sections"], cleaned)

    # Step 7a: Ensure unit metadata. The multi-chunk merge injects None placeholders for
    # scalars the LLM chunks didn't carry (subject/part/unit_number), so
    # setdefault — which won't replace an existing None — leaves them null.
    # Stamp identity fields authoritatively from the pipeline params instead.
    merged["unit_number"] = merged.get("unit_number") or unit_num

    # The title is READ from the book, not asked for. A textbook prints the unit
    # number and the unit name as two separate headings —
    #
    #     # Unit 6
    #     ## Digital Painting
    #
    # — and the model reliably takes the first: one Class 7 Science unit shipped
    # as "Unit 6" with "Digital Painting" demoted to sections[0]. Only a
    # placeholder is replaced, because where a book DOES print the name on one
    # line the model's reading of it is the better one, and a unit whose title
    # page is a scanned image has no name in the text to find.
    _title = str(merged.get("title") or "").strip().strip("*# ").strip()
    if _is_placeholder_title(_title):
        _printed = _derive_title(unit_md, unit_num)
        if _printed:
            logger.info(f"Unit {unit_num}: title {_title or '(none)'!r} → {_printed!r} (from the source)")
            _title = _printed
        else:
            _title = _title or str(unit.get("title") or "").strip().strip("*# ").strip()
    merged["title"] = _title or f"Unit {unit_num}"

    # Step 7b: Repair passes, in order. Each runs independently: sharing one
    # try/except meant a failure in the first step silently skipped every later
    # one, so an upload could lose recovery, stub-filling AND de-duplication and
    # report nothing but a single warning.
    #
    #   recover  - headings the model never emitted (it stops covering a chunk
    #              before the end: one chunk held 2.10 through 2.11.4 and came
    #              back with 2.10 six times and no 2.11)
    #   fill     - sections present but carrying only their own heading
    #   phantoms - empty shells with no counterpart in the book
    #   dedupe   - the same block extracted twice by overlapping chunks, and
    #              one section's text filed under another's number
    #   split    - a parent that swallowed its subsections, so 1.1.1 keeps its
    #              text but loses the boundary that makes it retrievable
    #   reattach - the paragraph that resumes a section after an Activity or a
    #              definition box, which the model files as a NEW untitled
    #              section: DEVELOPMENT OF RESOURCES lost everything it said
    #              after its Activity to a title-less "prose" sibling
    from auto_schema_extractor import (recover_missing_sections, fill_stub_sections,
                                       drop_phantom_sections, resolve_duplicate_sections,
                                       split_lumped_subsections, reattach_orphan_prose,
                                       name_unit_intro)

    for _label, _step in (
        ("recover",  recover_missing_sections),
        ("fill",     fill_stub_sections),
        ("phantoms", drop_phantom_sections),
        ("dedupe",   resolve_duplicate_sections),
        ("split",    split_lumped_subsections),
        ("reattach", lambda secs, md: reattach_orphan_prose(secs, md, unit_title=merged["title"])),
    ):
        try:
            merged["sections"] = _step(merged.get("sections") or [], cleaned)
        except Exception as e:
            logger.error(
                f"Unit {unit_num}: repair step '{_label}' failed "
                f"({type(e).__name__}: {e}) — continuing with the remaining steps"
            )

    try:
        merged["sections"] = _postprocess(merged.get("sections") or [], cleaned)
    except Exception as e:
        logger.error(f"Unit {unit_num}: final post-process failed: {type(e).__name__}: {e}")

    # The opening text under the chapter heading is the unit's Introduction —
    # the recovery pass above files it as a section named after the chapter.
    try:
        merged["sections"] = name_unit_intro(merged.get("sections") or [], merged["title"], subject)
    except Exception as e:
        logger.error(f"Unit {unit_num}: intro naming failed: {type(e).__name__}: {e}")

    if subject:                       # user-selected subject overrides LLM guess
        merged["subject"] = subject
    if part:                          # only override when a part was provided
        merged["part"] = part
    elif merged.get("part") and not _grounded(merged["part"], unit_md):
        # No part was declared and the book never prints this one, so the model
        # invented it — a Tux Paint unit came back tagged part="History". "part"
        # is not in the extraction schema, yet it reaches Qdrant as a filter key.
        # A part the source DOES print stays: a Social Science unit really does
        # belong to History, and says so throughout its own pages.
        logger.warning(
            f"Unit {unit_num}: dropping part={merged['part']!r} — not declared "
            f"for this upload and not mentioned anywhere in the unit"
        )
        merged.pop("part", None)

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
    logger.info(
        f"Unit {unit_num}: {sections_found} section(s), "
        f"{img_count} illustration image(s) stored"
    )

    # Determine units key (chapters for math)
    units_key = "chapters" if subject in ("mathematics", "maths") else "units"

    # A unit whose chunks partly failed is NOT a success: the surviving chunks
    # cover only part of the unit, and "chunks_used: 6" counted chunks CREATED,
    # so a run that lost five of six looked identical to a clean one.
    if failed_chunks:
        logger.error(
            f"Unit {unit_num}: PARTIAL extraction — chunk(s) "
            f"{', '.join(map(str, failed_chunks))} of {len(chunks)} produced nothing. "
            f"That portion of the unit is missing from structured.json."
        )

    return {
        "structured_data": {units_key: [merged]},
        "extraction_reports": [{
            "unit_number":    unit_num,
            "success":        not failed_chunks,
            "partial":        bool(failed_chunks),
            "sections_found": sections_found,
            "chunks_total":   len(chunks),
            "chunks_ok":      len(chunk_results),
            "chunks_failed":  failed_chunks,
            "chunks_used":    len(chunks),   # kept: existing report consumers
            "illustration_images": img_count,
        }],
    }
