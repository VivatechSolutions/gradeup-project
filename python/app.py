"""
GradeUp AI Extraction API

Main application entry point with FastAPI endpoints for all modules.
This file contains all APIs and main controls for the extraction pipeline.
"""

import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any, Optional, List, Literal

# The pipeline logs progress with emoji (580+ print sites across the codebase).
# On a console that is not UTF-8 — the Windows cp1252 default — each of those
# raises UnicodeEncodeError, which in unguarded paths (e.g. question_bank's unit
# discovery) crashes the request rather than just losing a log line. Linux
# containers already default to UTF-8, so this is a no-op in production.
for _stream in (sys.stdout, sys.stderr):
    try:
        if hasattr(_stream, "reconfigure") and (getattr(_stream, "encoding", "") or "").lower() != "utf-8":
            _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass  # non-reconfigurable stream (redirected/captured) — leave it alone

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import OUTPUTS_DIR, TEXTBOOKS_DIR
from pipeline import get_pipeline, DocumentPipeline
from ocr_pipeline import extract_with_mistral_ocr
from guardrails import run_query_guardrail

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("gradeup-api")

app = FastAPI(
    title="GradeUp AI Extraction API",
    description="API for PDF extraction, content enrichment, and semantic search",
    version="1.0.0"
)


@app.exception_handler(RequestValidationError)
async def _validation_error_handler(request, exc: RequestValidationError):
    """Return a clean 422 JSON body instead of FastAPI's default nested structure."""
    details = [
        {"field": " → ".join(str(loc) for loc in err["loc"]), "msg": err["msg"]}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"error": "Validation failed", "details": details},
    )


class ProcessRequest(BaseModel):
    skip_llm_refinement: bool = False
    skip_qdrant: bool = False
    skip_enrichment: bool = False
    filter_qr_codes: bool = False


class EnrichRequest(BaseModel):
    include_sections: bool = True
    include_web: bool = True
    fast_mode: bool = True


class SearchRequest(BaseModel):
    query: str
    limit: int = 5
    unit_filter: Optional[int] = None
    content_type_filter: Optional[str] = None
    class_filter: Optional[str] = None
    subject_filter: Optional[str] = None
    board_filter: Optional[str] = None
    # A term ("2", "Term 2") or a scope of them (["term_1","term_2"], "1,2").
    term_filter: Optional[Any] = None


class QdrantUploadRequest(BaseModel):
    board: str
    class_number: Optional[str] = None
    term: Optional[str] = None


class TutorRequest(BaseModel):
    """Request model for AI Tutor queries"""
    query: Optional[str] = ""
    board: str
    class_number: str
    image_base64: Optional[str] = None
    subject: str
    unit_number: int
    unit_name: str = ""
    candidate_name: str
    candidate_id: str
    limit: int = 5
    # Term-split state books only; omit for CBSE/NCERT.
    term: Optional[str] = None


class EnrichmentAudioRequest(BaseModel):
    """Request model for generating audio on existing enriched JSON"""
    message: dict
# SECTION 1: ADD TO IMPORTS (around line 7-10)

from enum import Enum
from fastapi import Form


# SECTION 2: ADD AFTER YOUR EXISTING MODELS (around line 45)
class SubjectType(str, Enum):
    """Subject types for textbook extraction"""
    SCIENCE = "science"
    BIOLOGY = "biology"
    MATHEMATICS = "mathematics"
    SOCIAL_SCIENCE = "social_science"
    ENGLISH = "english"
    CBSE_ENGLISH = "cbse_english"
    AUTO = "auto"

# SECTION 3: ADD NEW ENDPOINT (after /upload endpoint, around line 130)

@app.post("/upload-subject")
async def upload_with_subject(
    file: UploadFile = File(...),
    subject: str = Form(..., description="Subject name (e.g. Science, Biology, Mathematics, English)"),
    part: Optional[str] = Form(None, description="Book/part name (e.g. 'History', 'Fundamentals of Physical Geography', 'India: Physical Environment')"),
    board: str = Form(..., description="Board name (e.g. 'State Board', 'CBSE')"),
    class_number: Optional[str] = Form(None, alias="class_name", description="Class number/name (e.g. '11', '10')"),
    term: Optional[str] = Form(None, description="Term for term-split state books: '1', '2', '3' or 'Term 1'. Omit for boards whose books are not term-split (CBSE/NCERT)."),
    skip_enrichment: bool = Form(False),
    skip_qdrant: bool = Form(False),
    skip_llm_refinement: bool = Form(False),
    enrichment_style: str = Form("avatar_classroom_teaching", description="Enrichment style (e.g. 'classroom_teaching', 'avatar_classroom_teaching')")
):
    """
    Upload a PDF and process it with subject-aware extraction.
    
    **Subject Types:**
    - `science`: For Science textbooks (units with activities, notes, exercises)
    - `mathematics`: For Math textbooks (chapters with examples, theorems, exercises)
    - `social_science`: For Social Science (History/Geography/Civics/Economics)
    - `auto`: Auto-detect subject from content
    
    **Part (optional):**
    For multi-book subjects, specify the book/part name:
    - Geography: "Fundamentals of Physical Geography", "India: Physical Environment", "Practical Work in Geography"
    - Social Science: "History", "Civics", "Geography", "Economics"
    - If not provided, auto-detected from filename or content.
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:5000/upload-subject" \\
      -F "file=@chapter1.pdf" \\
      -F "subject=social_science" \\
      -F "part=Fundamentals of Physical Geography" \\
      -F "skip_enrichment=false"
    ```
    """
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    logger.info(f"========== /upload-subject START ==========")
    logger.info(f"  File: {file.filename}")
    logger.info(f"  Subject: {subject}, Part: {part}, Board: {board}, Class: {class_number}, Term: {term}")
    logger.info(f"  Flags → skip_enrichment={skip_enrichment}, skip_qdrant={skip_qdrant}, skip_llm_refinement={skip_llm_refinement}")
    logger.info(f"  Enrichment style: {enrichment_style}")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_pdf_path = Path(temp_dir) / file.filename
        
        content = await file.read()
        temp_pdf_path.write_bytes(content)
        logger.info(f"  Saved temp PDF: {temp_pdf_path} ({len(content):,} bytes)")
        
        pipeline = get_pipeline()
        logger.info(f"  Pipeline initialized: {type(pipeline).__name__}")
        
        # ── AUTO-SPLIT LOGIC ──────────────────────────────────────────────────
        import re as _re
        from pdf_unit_splitter import split_pdf_by_units
        out_dir = OUTPUTS_DIR / temp_pdf_path.stem / "Unit_split"
        
        # Skip splitting if the filename clearly indicates a single unit/chapter
        _single_unit_pattern = _re.search(
            r'(?:Unit[_\s-]?\d+|Chapter[_\s-]?\d+)',
            file.filename,
            _re.IGNORECASE
        )
        
        split_units = []
        if _single_unit_pattern:
            logger.info(f"Single unit detected from filename '{file.filename}' — skipping split")
        else:
            # We attempt to split. The robust LLM TOC splitter will safely
            # fail and return [] if this is already just a single unit with no TOC.
            logger.info(f"Checking if {file.filename} is a full textbook that needs splitting...")
            
            try:
                split_units = split_pdf_by_units(
                    pdf_path=str(temp_pdf_path),
                    output_dir=str(out_dir),
                    subject=subject if subject != "auto" else "english" # default
                )
            except Exception as e:
                logger.warning(f"Error during split check: {e}")
                split_units = []
            
            # If splitter found only 1 unit, skip the split path — treat as single PDF
            if len(split_units) == 1:
                logger.info(f"Splitter found only 1 unit — treating as single PDF (no split needed)")
                split_units = []
            
        if split_units and len(split_units) > 1:
            logger.info(f"✅ Split textbook into {len(split_units)} units. Processing each independently...")
            results = []
            for unit_idx, unit in enumerate(split_units):
                unit_pdf_path = Path(unit["output_path"])
                resolved_part = part if part else unit.get("part", "")
                
                logger.info(f"  [SPLIT {unit_idx+1}/{len(split_units)}] Processing: {unit_pdf_path.name}, part={resolved_part}")
                unit_res = pipeline.process_pdf_file_subject_aware(
                    pdf_path=unit_pdf_path,
                    subject=subject,
                    auto_detect_subject=(subject == "auto"),
                    part=resolved_part,
                    skip_llm_refinement=skip_llm_refinement,
                    skip_qdrant=skip_qdrant,
                    skip_enrichment=skip_enrichment,
                    board=board,
                    class_number=class_number,
                    enrichment_style=enrichment_style,
                    term=term,
                )
                logger.info(f"  [SPLIT {unit_idx+1}] Pipeline result → success={unit_res.get('success')}, "
                            f"document_id={unit_res.get('document_id')}, "
                            f"has_structured={unit_res.get('has_structured')}, "
                            f"extraction_method={unit_res.get('extraction_method', 'N/A')}")
                if not unit_res.get('success'):
                    logger.error(f"  [SPLIT {unit_idx+1}] ❌ Pipeline FAILED: {unit_res.get('error', 'unknown error')}")
                results.append(unit_res)

            # ── Generate debate topics for each split unit (independent of enrichment) ──
            logger.info(f"  [DEBATE] Starting debate topic generation for {len(results)} split unit(s)...")
            debate_results = []
            try:
                from debate_topic_generator import generate_and_save_debate_topics
                for unit_res in results:
                    doc_id = unit_res.get("document_id")
                    has_structured = unit_res.get("has_structured")
                    logger.info(f"  [DEBATE] Checking unit → doc_id={doc_id}, has_structured={has_structured}")
                    if not doc_id:
                        logger.warning(f"  [DEBATE] ⚠️ Skipping — no document_id in result")
                        continue
                    if not has_structured:
                        logger.warning(f"  [DEBATE] ⚠️ Skipping {doc_id} — has_structured is False (LLM refinement may have been skipped or extraction returned no sections)")
                        continue
                    structured_path = OUTPUTS_DIR / doc_id / "structured.json"
                    logger.info(f"  [DEBATE] Checking structured.json at: {structured_path}")
                    if not structured_path.exists():
                        logger.error(f"  [DEBATE] ❌ structured.json NOT FOUND at {structured_path} — cannot generate debate topics")
                        # List what files actually exist in the output directory
                        doc_dir = OUTPUTS_DIR / doc_id
                        if doc_dir.exists():
                            existing_files = [f.name for f in doc_dir.iterdir()]
                            logger.error(f"  [DEBATE]    Files in {doc_dir.name}/: {existing_files}")
                        else:
                            logger.error(f"  [DEBATE]    Output directory does not exist: {doc_dir}")
                        continue
                    logger.info(f"  [DEBATE] ✅ structured.json exists ({structured_path.stat().st_size:,} bytes). Generating debate topics for {doc_id}...")
                    dt_result = generate_and_save_debate_topics(
                        structured_path=structured_path,
                        subject=subject if subject != "auto" else None,
                    )
                    logger.info(f"  [DEBATE] Result for {doc_id} → success={dt_result.get('success')}, "
                                f"total_topics={dt_result.get('total_topics', 0)}, "
                                f"error={dt_result.get('error', 'none')}")
                    debate_results.append({
                        "document_id": doc_id,
                        "debate_topics_generated": dt_result.get("total_topics", 0),
                        "success": dt_result.get("success", False),
                    })
            except ImportError as ie:
                logger.warning(f"  [DEBATE] ⚠️ Debate topic generator module not available — skipping (ImportError: {ie})")
            except Exception as e:
                logger.error(f"  [DEBATE] ❌ Debate topic generation failed with exception: {e}", exc_info=True)

            logger.info(f"========== /upload-subject END (split path, {len(results)} units) ==========")
            return {
                "success": True,
                "is_split": True,
                "units_processed": len(results),
                "results": results,
                "debate_topics": debate_results,
                "message": f"Successfully split and processed {len(results)} units from {file.filename}"
            }
        
        # ── SINGLE PDF FALLBACK ───────────────────────────────────────────────
        logger.info(f"  [SINGLE] No chapters detected or already a unit. Processing as single PDF...")
        result = pipeline.process_pdf_file_subject_aware(
            pdf_path=temp_pdf_path,
            subject=subject,
            auto_detect_subject=False,
            part=part,
            skip_llm_refinement=skip_llm_refinement,
            skip_qdrant=skip_qdrant,
            skip_enrichment=skip_enrichment,
            board=board,
            class_number=class_number,
            enrichment_style=enrichment_style,
            term=term,
        )
        logger.info(f"  [SINGLE] Pipeline result → success={result.get('success')}, "
                    f"document_id={result.get('document_id')}, "
                    f"has_structured={result.get('has_structured')}, "
                    f"extraction_method={result.get('extraction_method', 'N/A')}, "
                    f"subject={result.get('subject', 'N/A')}")
    
    if not result.get("success"):
        logger.error(f"  [SINGLE] ❌ Processing FAILED: {result.get('error')}")
        logger.info(f"========== /upload-subject END (FAILED) ==========")
        raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    
    # ── Generate debate topics for single PDF (independent of enrichment) ──
    debate_info = {}
    has_structured = result.get("has_structured")
    doc_id = result.get("document_id")
    logger.info(f"  [DEBATE] Single PDF debate check → doc_id={doc_id}, has_structured={has_structured}")
    
    if not has_structured:
        logger.warning(f"  [DEBATE] ⚠️ Skipping debate topic generation — has_structured is False")
        logger.warning(f"  [DEBATE]    Possible causes: skip_llm_refinement={skip_llm_refinement}, "
                       f"or auto-schema extraction returned no sections, or openai_api_key missing")
    elif not doc_id:
        logger.warning(f"  [DEBATE] ⚠️ Skipping debate topic generation — no document_id in result")
    else:
        try:
            from debate_topic_generator import generate_and_save_debate_topics
            structured_path = OUTPUTS_DIR / doc_id / "structured.json"
            logger.info(f"  [DEBATE] Checking structured.json at: {structured_path}")
            if not structured_path.exists():
                logger.error(f"  [DEBATE] ❌ structured.json NOT FOUND at {structured_path}")
                # List what files actually exist in the output directory
                doc_dir = OUTPUTS_DIR / doc_id
                if doc_dir.exists():
                    existing_files = [f.name for f in doc_dir.iterdir()]
                    logger.error(f"  [DEBATE]    Files in {doc_dir.name}/: {existing_files}")
                else:
                    logger.error(f"  [DEBATE]    Output directory does not exist: {doc_dir}")
            else:
                file_size = structured_path.stat().st_size
                logger.info(f"  [DEBATE] ✅ structured.json exists ({file_size:,} bytes). Generating debate topics...")
                dt_result = generate_and_save_debate_topics(
                    structured_path=structured_path,
                    subject=subject if subject != "auto" else None,
                )
                logger.info(f"  [DEBATE] Result → success={dt_result.get('success')}, "
                            f"total_topics={dt_result.get('total_topics', 0)}, "
                            f"total_sections={dt_result.get('total_sections', 0)}, "
                            f"error={dt_result.get('error', 'none')}")
                debate_info = {
                    "debate_topics_generated": dt_result.get("total_topics", 0),
                    "debate_topics_success": dt_result.get("success", False),
                }
        except ImportError as ie:
            logger.warning(f"  [DEBATE] ⚠️ Debate topic generator module not available — skipping (ImportError: {ie})")
        except Exception as e:
            logger.error(f"  [DEBATE] ❌ Debate topic generation failed: {e}", exc_info=True)
    
    logger.info(f"  Final result: subject={result.get('subject', 'unknown')}, debate_info={debate_info}")
    logger.info(f"========== /upload-subject END (single PDF, success) ==========")
    
    return {
        "success": True,
        **result,
        **debate_info,
        "message": f"Successfully processed {file.filename} as {result.get('subject', 'unknown')} textbook"
    }



@app.post("/upload-agentic")
async def upload_agentic(
    file: UploadFile = File(...),
    subject: str = Form(..., description="Subject name (e.g. Science, Biology, Mathematics, English)"),
    part: Optional[str] = Form(None, description="Book/part name"),
    board: str = Form(..., description="Board name (e.g. 'State Board', 'CBSE')"),
    class_number: Optional[str] = Form(None, alias="class_name", description="Class number/name (e.g. '11', '10')"),
    term: Optional[str] = Form(None, description="Term for term-split state books: '1', '2', '3' or 'Term 1'. Omit for boards whose books are not term-split (CBSE/NCERT)."),
    skip_enrichment: bool = Form(False),
    skip_qdrant: bool = Form(False),
    skip_llm_refinement: bool = Form(False),
    enrichment_style: str = Form("avatar_classroom_teaching")
):
    """
    Upload a PDF and run the COMPLETE agentic extraction workflow:
      Stage 0a: Mistral OCR + watermark clean + OCR quality guard
      Stage 0b: GPT-4o Vision — text-box detection + bad-page re-OCR
      Stage 1:  Structure discovery — TOC parse + section type identification
      Stage 2:  Semantic chunking + LLM extraction (parallel per unit)
      Stage 3:  Verification convergence loop (≥95% score, max 3 passes)
      Stage 4:  Enrichment — avatar scripts + TTS audio (parallel per unit)
      Stage 5:  Debate topic generation (parallel per unit)
      Stage 6:  Final publish — save JSON + S3 + Qdrant
    """
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    logger.info(f"========== /upload-agentic START ==========")
    logger.info(f"  file={file.filename} subject={subject} board={board} "
                f"class={class_number} skip_enrichment={skip_enrichment}")

    # Import new pipeline (lazy so server still starts if not installed yet)
    try:
        from document_pipeline_graph import run_document_pipeline
        PIPELINE_GRAPH_AVAILABLE = True
    except ImportError as ie:
        logger.warning(f"  ⚠️  document_pipeline_graph not available: {ie}")
        PIPELINE_GRAPH_AVAILABLE = False

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_pdf_path = Path(temp_dir) / file.filename
        content = await file.read()
        temp_pdf_path.write_bytes(content)

        # ── Single-unit textbook check  ──────────────────────────────────────
        import re as _re
        _single_unit_pattern = _re.search(
            r'(?:Unit[_\s-]?\d+|Chapter[_\s-]?\d+)',
            file.filename, _re.IGNORECASE
        )

        # ── Multi-unit: split first, then pipeline each unit ─────────────────
        split_units = []
        if not _single_unit_pattern:
            try:
                from pdf_unit_splitter import split_pdf_by_units
                out_dir = OUTPUTS_DIR / temp_pdf_path.stem / "Unit_split"
                split_units = split_pdf_by_units(
                    pdf_path=str(temp_pdf_path),
                    output_dir=str(out_dir),
                    subject=subject if subject != "auto" else "english",
                )
                if len(split_units) == 1:
                    split_units = []   # treat as single
            except Exception as e:
                logger.warning(f"  PDF split check error: {e}")

        resolved_subject = None if subject == "auto" else subject

        if split_units and len(split_units) > 1:
            logger.info(f"  ✅ Split into {len(split_units)} unit(s) — running pipeline on each...")
            results = []
            for unit_info in split_units:
                unit_pdf = Path(unit_info["output_path"])
                resolved_part = part if part else unit_info.get("part", "")

                if PIPELINE_GRAPH_AVAILABLE and not skip_llm_refinement:
                    try:
                        report = run_document_pipeline(
                            pdf_path=unit_pdf,
                            board=board,
                            class_number=class_number,
                            subject=resolved_subject,
                            part=resolved_part,
                            term=term,
                            skip_enrichment=skip_enrichment,
                            skip_debate=False,
                            skip_qdrant=skip_qdrant,
                            enrichment_style=enrichment_style,
                        )
                        results.append({
                            "unit_pdf":              unit_pdf.name,
                            "document_id":           report.get("doc_id"),
                            "subject":               report.get("subject"),
                            "is_complete":           report.get("is_complete", False),
                            "verification_score":    report.get("verification", {}).get("overall_score", 0),
                            "verification_passed":   report.get("verification", {}).get("passed", False),
                            "fixes_made":            report.get("verification", {}).get("fixes_made", 0),
                            "enrichment_units":      report.get("enrichment", {}).get("units_enriched", 0),
                            "audio_files":           report.get("enrichment", {}).get("audio_files", 0),
                            "debate_topics_total":   report.get("debate", {}).get("total_topics", 0),
                            "pipeline_errors":       report.get("errors", []),
                        })
                    except Exception as e:
                        logger.error(f"  ❌ Pipeline failed for {unit_pdf.name}: {e}", exc_info=True)
                        results.append({"unit_pdf": unit_pdf.name, "error": str(e)})
                else:
                    # Fallback: legacy pipeline
                    try:
                        pip_result = pipeline.process_pdf_file_subject_aware(
                            pdf_path=unit_pdf, subject=subject,
                            auto_detect_subject=(subject == "auto"),
                            part=resolved_part,
                            skip_llm_refinement=skip_llm_refinement,
                            skip_qdrant=skip_qdrant, skip_enrichment=skip_enrichment,
                            board=board, class_number=class_number,
                            enrichment_style=enrichment_style,
                            term=term,
                        )
                        results.append(pip_result)
                    except Exception as e:
                        results.append({"unit_pdf": unit_pdf.name, "error": str(e)})

            logger.info(f"========== /upload-agentic END (split path, {len(results)} units) ==========")
            return {
                "success":         True,
                "is_split":        True,
                "units_processed": len(results),
                "results":         results,
            }

        # ── Single PDF path ───────────────────────────────────────────────────
        logger.info(f"  [SINGLE] Processing as single PDF with full agentic pipeline...")

        if PIPELINE_GRAPH_AVAILABLE and not skip_llm_refinement:
            try:
                pipeline_obj = get_pipeline()  # still needed for Qdrant upload helper
                report = run_document_pipeline(
                    pdf_path=temp_pdf_path,
                    board=board,
                    class_number=class_number,
                    subject=resolved_subject,
                    part=part,
                    term=term,
                    skip_enrichment=skip_enrichment,
                    skip_debate=False,
                    skip_qdrant=skip_qdrant,
                    enrichment_style=enrichment_style,
                )
                logger.info(f"========== /upload-agentic END (single PDF) ==========")
                return {
                    "success":              True,
                    "document_id":          report.get("doc_id"),
                    "subject":              report.get("subject"),
                    "is_complete":          report.get("is_complete", False),
                    "verification_score":   report.get("verification", {}).get("overall_score", 0),
                    "verification_passed":  report.get("verification", {}).get("passed", False),
                    "fixes_made":           report.get("verification", {}).get("fixes_made", 0),
                    "enrichment_units":     report.get("enrichment", {}).get("units_enriched", 0),
                    "audio_files":          report.get("enrichment", {}).get("audio_files", 0),
                    "debate_topics_total":  report.get("debate", {}).get("total_topics", 0),
                    "pipeline_errors":      report.get("errors", []),
                    "message":              f"Successfully processed {file.filename} via agentic pipeline",
                }
            except Exception as e:
                logger.error(f"  ❌ Agentic pipeline failed: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Pipeline failed: {e}")

        # Fallback: legacy single-shot pipeline
        pipeline_obj = get_pipeline()
        result = pipeline_obj.process_pdf_file_subject_aware(
            pdf_path=temp_pdf_path, subject=subject,
            auto_detect_subject=False, part=part,
            skip_llm_refinement=skip_llm_refinement,
            skip_qdrant=skip_qdrant, skip_enrichment=skip_enrichment,
            board=board, class_number=class_number,
            enrichment_style=enrichment_style,
            term=term,
        )
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))

        logger.info(f"========== /upload-agentic END (single PDF, legacy fallback) ==========")
        return {"success": True, **result, "message": f"Processed {file.filename} (legacy pipeline)"}


# THAT'S IT! The rest of app.py remains unchanged.
from pdf_unit_splitter import split_pdf_by_units


@app.post("/upload_pdf")
async def split_pdf_endpoint( 
    file: UploadFile = File(...),
    subject: str = Form(..., description="Subject name"),
    part: Optional[str] = Form(None, description="Book/part name (e.g. 'History', 'Fundamentals of Physical Geography')"),
    board: str = Form(..., description="Board name (e.g. 'State Board', 'CBSE')"),
    class_number: Optional[str] = Form(None, alias="class_name", description="Class number/name (e.g. '11', '10')"),
    term: Optional[str] = Form(None, description="Term for term-split state books: '1', '2', '3' or 'Term 1'. Omit for boards whose books are not term-split (CBSE/NCERT)."),
    auto_upload: bool = Form(True, description="Automatically process split units via subject-aware pipeline"),
    skip_enrichment: bool = Form(False),
    skip_qdrant: bool = Form(False),
    skip_llm_refinement: bool = Form(False),
    enrichment_style: str = Form("avatar_classroom_teaching", description="Enrichment style (e.g. 'classroom_teaching', 'avatar_classroom_teaching')")
):
    """
    Upload a textbook PDF → get it split into one PDF per unit.

    Steps internally:
      1. Runs Mistral OCR on the uploaded PDF to get content.md
      2. Reads page stamps from content.md to find exact unit start pages
      3. Splits the original PDF at those boundaries
      4. Returns page ranges + filenames for each unit

    Then upload each unit PDF via POST /upload-subject for
    significantly better extraction quality (single-unit focus).
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted")

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        pdf_path = tmp / file.filename
        pdf_path.write_bytes(await file.read())

        # Step 1: OCR → content.md
        pipeline = get_pipeline()
        
        if not pipeline.mistral_client:
            raise HTTPException(500, "Mistral client not initialized. Check MISTRAL_API_KEY environment variable.")
            
        ocr = extract_with_mistral_ocr(pipeline.mistral_client, pdf_path)
        if not ocr or not ocr.get("success"):
            error_reason = ocr.get("error", "Unknown OCR failure") if ocr else "No response from OCR pipeline"
            raise HTTPException(500, f"OCR failed: {error_reason}")

        md_path = tmp / "content.md"
        md_path.write_text(ocr["markdown"], encoding="utf-8")

        # Step 2: Split
        out_dir = OUTPUTS_DIR / pdf_path.stem / "Unit_split"
        units = split_pdf_by_units(
            pdf_path=str(pdf_path),
            md_path=str(md_path),
            output_dir=str(out_dir),
            subject=subject,
        )

        # If no units detected, treat as single unit
        if not units:
            logger.info(f"No unit boundaries detected in {file.filename}. Treating as single unit.")
            units = [{
                "unit_number": 1,
                "title": pdf_path.stem,
                "filename": file.filename,
                "output_path": str(pdf_path),
                "part": part
            }]

        processing_results = []
        
        if auto_upload:
            logger.info(f"Processing {'single unit' if len(units)==1 else str(len(units)) + ' units'} for {file.filename}")
            for unit in units:
                unit_pdf_path = Path(unit["output_path"])
                
                # Priority logic for part: Request Body > Splitter Output > None
                resolved_part = part if part else unit.get("part")
                
                logger.info(f"Processing split unit: {unit_pdf_path.name} (Part: {resolved_part})")
                
                try:
                    res = pipeline.process_pdf_file_subject_aware(
                        pdf_path=unit_pdf_path,
                        subject=subject,
                        auto_detect_subject=False,
                        part=resolved_part,
                        skip_llm_refinement=skip_llm_refinement,
                        skip_qdrant=skip_qdrant,
                        skip_enrichment=skip_enrichment,
                        filter_qr_codes=False, # Keep fast OCR for units
                        board=board,
                        class_number=class_number,
                        enrichment_style=enrichment_style,
                        term=term,
                    )
                    processing_results.append({
                        "unit_number": unit["unit_number"],
                        "filename": unit["filename"],
                        "success": res.get("success", False),
                        "document_id": res.get("document_id"),
                        "subject": res.get("subject"),
                        "has_enriched": res.get("has_enriched", False),
                        "qdrant_uploaded": res.get("qdrant_uploaded", False),
                        "verification": res.get("verification"),
                        "images_count": res.get("images_count", 0),
                        "error": res.get("error")
                    })
                except Exception as e:
                    logger.error(f"Failed to auto-process {unit_pdf_path.name}: {e}")
                    processing_results.append({
                        "unit_number": unit["unit_number"],
                        "filename": unit["filename"],
                        "success": False,
                        "error": str(e)
                    })

    return {
        "success":     True,
        "total_units": len(units),
        "units":       units,
        "auto_uploaded": auto_upload,
        "processing_results": processing_results if auto_upload else [],
        "tip": "Split units have been auto-processed!" if auto_upload else "Upload each unit PDF via POST /upload-subject for best extraction quality",
    }

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "gradeup-extraction-api"}


@app.get("/check-env")
def check_env():
    """Check if all required keys are present in the .env file."""
    from config import MISTRAL_API_KEY, OPENAI_API_KEY_TEXT
    missing = []
    if not MISTRAL_API_KEY:
        missing.append("MISTRAL_API_KEY")
    if not OPENAI_API_KEY_TEXT:
        missing.append("OPENAI_API_KEY_TEXT")
        
    if missing:
        return {"status": "missing_keys", "missing_keys": missing}
    return {"status": "ok", "message": "All required keys are present."}


@app.post("/validate/{document_id}")
def validate_document(document_id: str):
    """
    Run content validation on a processed document.
    
    Compares content.md against structured.json to find missing content,
    then auto-fills any gaps via targeted LLM re-extraction.
    
    Returns validation report with coverage percentage and gap details.
    """
    content_path = OUTPUTS_DIR / document_id / "content.md"
    structured_path = OUTPUTS_DIR / document_id / "structured.json"
    
    if not content_path.exists():
        raise HTTPException(404, f"content.md not found for {document_id}")
    if not structured_path.exists():
        raise HTTPException(404, f"structured.json not found for {document_id}")
    
    try:
        from content_validator import validate_from_files, fill_gaps_with_llm
        from config import OPENAI_API_KEY_TEXT
        import orjson as _orjson
        
        report = validate_from_files(str(content_path), str(structured_path))
        report_dict = report.to_dict()
        
        # Auto-fill gaps if API key available
        if report.gaps and OPENAI_API_KEY_TEXT:
            content_md = content_path.read_text(encoding="utf-8")
            structured = _orjson.loads(structured_path.read_bytes())
            
            # Get unit data
            unit_data = structured
            if "units" in structured and isinstance(structured["units"], list):
                unit_data = structured["units"][0] if len(structured["units"]) == 1 else structured
            
            updated = fill_gaps_with_llm(
                gaps=report.gaps,
                content_md=content_md,
                existing_data=unit_data,
                api_key=OPENAI_API_KEY_TEXT,
            )
            
            # Save updated structured data
            if "units" in structured and len(structured["units"]) == 1:
                structured["units"][0] = updated
            else:
                structured = updated
            structured_path.write_bytes(_orjson.dumps(structured, option=_orjson.OPT_INDENT_2))
            
            # Re-validate
            report2 = validate_from_files(str(content_path), str(structured_path))
            report_dict = report2.to_dict()
            report_dict["gaps_filled"] = True
        
        # Save validation report
        val_path = OUTPUTS_DIR / document_id / "validation_report.json"
        val_path.write_bytes(_orjson.dumps(report_dict, option=_orjson.OPT_INDENT_2))
        
        return {
            "success": True,
            "document_id": document_id,
            "validation": report_dict,
        }
    except ImportError:
        raise HTTPException(500, "content_validator module not available")
    except Exception as e:
        raise HTTPException(500, f"Validation failed: {str(e)}")


@app.get("/documents")
def list_documents():
    """List all processed documents."""
    pipeline = get_pipeline()
    documents = pipeline.list_documents()
    return {"documents": documents, "count": len(documents)}


@app.get("/documents/{document_id}")
def get_document(document_id: str):
    """Get details of a specific document."""
    pipeline = get_pipeline()
    document = pipeline.get_document(document_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    """Delete a processed document."""
    pipeline = get_pipeline()
    success = pipeline.delete_document(document_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or could not be deleted")
    
    return {"success": True, "message": f"Document {document_id} deleted"}



@app.post("/process/textbooks")
def process_textbooks(
    only: Optional[str] = Query(None, description="Filter by filename substring"),
    limit: int = Query(0, description="Limit number of PDFs to process (0 = all)"),
    skip_llm_refinement: bool = Query(False),
    skip_qdrant: bool = Query(False),
    skip_enrichment: bool = Query(False),
    class_number: Optional[str] = Query(None)
):
    """Process all PDFs in the textbooks directory."""
    pipeline = get_pipeline()
    results = pipeline.process_textbooks_directory(
        only=only,
        limit=limit,
        skip_llm_refinement=skip_llm_refinement,
        skip_qdrant=skip_qdrant,
        skip_enrichment=skip_enrichment,
        class_number=class_number
    )
    
    return {"results": results, "count": len(results)}


@app.post("/ocr/{document_id}")
def run_ocr_only(document_id: str):
    """Run OCR extraction on a document already in the textbooks folder."""
    pdf_path = TEXTBOOKS_DIR / f"{document_id}.pdf"
    
    if not pdf_path.exists():
        for pdf in TEXTBOOKS_DIR.glob("*.pdf"):
            if document_id in pdf.stem:
                pdf_path = pdf
                break
    
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"PDF not found: {document_id}")
    
    pipeline = get_pipeline()
    result = pipeline.process_pdf_file(
        pdf_path=pdf_path,
        skip_llm_refinement=True,
        skip_qdrant=True,
        # skip_qdrant=False, 
        skip_enrichment=True
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "OCR failed"))
    
    return result


@app.post("/enrichment/process")
async def process_enrichment_payload(payload: dict):
    """
    Receives {"message": {<structured.json content>}} in the body and returns the enrichment.json.
    """
    import tempfile
    import json
    from pathlib import Path
    from enrichment_pipeline import enrich_document
    from fastapi import HTTPException
    
    # Extract the structured data from the "message" key
    structured_data = payload.get("message")
    if not structured_data:
        # Fallback in case they send it at the root level anyway
        structured_data = payload

    with tempfile.TemporaryDirectory() as tmp_dir:
        doc_dir = Path(tmp_dir) / "temp_doc"
        doc_dir.mkdir(parents=True, exist_ok=True)
        
        structured_path = doc_dir / "structured.json"
        enriched_path = doc_dir / "enriched.json"
        
        with open(structured_path, "w", encoding="utf-8") as f:
            json.dump(structured_data, f)
            
        try:
            success = enrich_document(
                structured_json_path=structured_path,
                output_path=enriched_path,
                include_sections=True,
                include_web=True,
                fast_mode=True
            )
            if not success:
                raise Exception("enrich_document returned False")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Enrichment pipeline error: {str(e)}")
            
        if not enriched_path.exists():
            raise HTTPException(status_code=500, detail="Enrichment failed to produce output.")
            
        with open(enriched_path, "r", encoding="utf-8") as f:
            enriched_data = json.load(f)
            
        return enriched_data


@app.post("/enrich/{document_id}")
def enrich_document(document_id: str, request: EnrichRequest = EnrichRequest()):
    """Enrich an already-extracted document."""
    pipeline = get_pipeline()
    result = pipeline.enrich_document(
        document_id=document_id,
        include_sections=request.include_sections,
        include_web=request.include_web,
        fast_mode=request.fast_mode
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Enrichment failed"))
    
    return result


@app.post("/verify/{document_id}")
def verify_document(document_id: str):
    """
    Verify and correct structured.json against content.md.
    Fills in missing fields like activities, notes, exercises, and null values.
    """
    pipeline = get_pipeline()
    result = pipeline.verify_document(document_id=document_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Verification failed"))
    
    return result


@app.get("/enrich/{document_id}")
def get_enrichment(document_id: str):
    """Get enrichment data for a document."""
    enriched_path = OUTPUTS_DIR / document_id / "enriched.json"
    
    if not enriched_path.exists():
        raise HTTPException(status_code=404, detail="Enrichment data not found")
    
    import orjson
    enriched_data = orjson.loads(enriched_path.read_bytes())
    
    return {
        "document_id": document_id,
        "enriched_at": enriched_data.get("enriched_at"),
        "model": enriched_data.get("enrichment_model"),
        "units": enriched_data.get("units", [])
    }


@app.post("/qdrant/{document_id}")
def upload_to_qdrant(document_id: str, request: QdrantUploadRequest):
    """Upload document chunks to Qdrant vector database."""
    pipeline = get_pipeline()
    result = pipeline.upload_to_qdrant(
        document_id=document_id,
        board=request.board,
        class_number=request.class_number,
        term=request.term,
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Upload failed"))
    
    return result


@app.post("/search")
def search_documents(request: SearchRequest):
    """Search the vector database."""
    pipeline = get_pipeline()
    results = pipeline.search(
        query=request.query,
        limit=request.limit,
        unit_filter=request.unit_filter,
        content_type_filter=request.content_type_filter,
        class_filter=request.class_filter,
        subject_filter=request.subject_filter,
        board_filter=request.board_filter,
        term_filter=request.term_filter,
    )

    return {"query": request.query, "results": results, "count": len(results)}


@app.get("/search")
def search_documents_get(
    query: str = Query(..., description="Search query"),
    limit: int = Query(5, description="Number of results to return"),
    unit_filter: Optional[int] = Query(None, description="Filter by unit number"),
    content_type_filter: Optional[str] = Query(None, description="Filter by content type"),
    class_filter: Optional[str] = Query(None, description="Filter by class (e.g. '11', '10')"),
    subject_filter: Optional[str] = Query(None, description="Filter by subject"),
    board_filter: Optional[str] = Query(None, description="Filter by board (e.g. 'State Board', 'CBSE')"),
    term_filter: Optional[str] = Query(None, description="Filter by term for term-split state books: '2', 'Term 2', or a scope like '1,2'"),
):
    """Search the vector database (GET method)."""
    pipeline = get_pipeline()
    results = pipeline.search(
        query=query,
        limit=limit,
        unit_filter=unit_filter,
        content_type_filter=content_type_filter,
        class_filter=class_filter,
        subject_filter=subject_filter,
        board_filter=board_filter,
        term_filter=term_filter,
    )
    
    return {"query": query, "results": results, "count": len(results)}

@app.get("/structured/{document_id}")
def get_structured_content(document_id: str):
    """Get structured content for a document."""
    structured_path = OUTPUTS_DIR / document_id / "structured.json"
    
    if not structured_path.exists():
        raise HTTPException(status_code=404, detail="Structured content not found")
    
    import orjson
    structured_data = orjson.loads(structured_path.read_bytes())
    
    return {
        "document_id": document_id,
        "units": structured_data.get("units", [])
    }


@app.get("/debate-topics/{document_id}")
def get_debate_topics(document_id: str):
    """Get generated debate topics for a document."""
    debate_path = OUTPUTS_DIR / document_id / "debate_topics.json"
    
    if not debate_path.exists():
        raise HTTPException(status_code=404, detail="Debate topics not found for this document")
    
    import orjson
    try:
        debate_data = orjson.loads(debate_path.read_bytes())
        return debate_data
    except Exception as e:
        logger.error(f"Error reading debate topics for {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Error reading debate topics")


@app.get("/textbook/structured")
def get_whole_textbook_structured(
    subject: Optional[str] = Query(None, description="Filter by subject and populate at root"),
    board: Optional[str] = Query(None, description="Populate board at root"),
    class_number: Optional[str] = Query(None, description="Filter by class number"),
    term: Optional[str] = Query(None, description="Filter by term for term-split state books: '1', '2', '3' or 'Term 1'")
):
    """Get all extracted units as a single structured textbook."""
    import orjson
    
    all_units = []
    
    if OUTPUTS_DIR.exists():
        for doc_dir in OUTPUTS_DIR.iterdir():
            if not doc_dir.is_dir():
                continue
            
            metadata_path = doc_dir / "metadata.json"
            if metadata_path.exists():
                try:
                    meta = orjson.loads(metadata_path.read_bytes())
                    if subject and str(meta.get("subject", "")).lower() != subject.lower():
                        continue
                        
                    if board:
                        meta_board = str(meta.get("board", "")).lower().replace("_", " ")
                        req_board = board.lower().replace("_", " ")
                        if meta_board != req_board:
                            continue
                            
                    if class_number:
                        meta_class = str(meta.get("class_number", "")).lower().lstrip("0")
                        req_class = str(class_number).lower().lstrip("0")
                        if meta_class != req_class:
                            continue

                    # Term books restart unit numbering — without this filter a
                    # term-split subject returns every term's units interleaved.
                    if term:
                        from term_utils import normalize_term
                        req_term = normalize_term(term)
                        meta_term = normalize_term(meta.get("term"))
                        if req_term and meta_term and req_term != meta_term:
                            continue
                except Exception:
                    pass
                
            structured_path = doc_dir / "structured.json"
            if structured_path.exists():
                try:
                    data = orjson.loads(structured_path.read_bytes())
                    
                    units = []
                    if "units" in data and isinstance(data["units"], list):
                        units = data["units"]
                    elif "title" in data and "sections" in data:
                        units = [data]
                        
                    # Filter units by subject if provided and metadata wasn't used
                    if subject and not metadata_path.exists():
                        units = [u for u in units if str(u.get("subject", "")).lower() == subject.lower()]
                        
                    all_units.extend(units)
                except Exception as e:
                    logger.error(f"Failed to read {structured_path}: {e}")
                    
    def get_unit_num(unit):
        try:
            return int(unit.get("unit_number", 999))
        except (ValueError, TypeError):
            return 999
            
    all_units.sort(key=get_unit_num)
    
    return {
        "success": True,
        "subject": subject or (all_units[0].get("subject") if all_units else None),
        "board": board,
        "class_number": class_number,
        "term": term,
        "total_units": len(all_units),
        "units": all_units
    }


@app.get("/textbook/enrichment")
def get_whole_textbook_enrichment(
    subject: Optional[str] = Query(None, description="Filter by subject and populate at root"),
    board: Optional[str] = Query(None, description="Populate board at root"),
    class_number: Optional[str] = Query(None, description="Filter by class number"),
    term: Optional[str] = Query(None, description="Filter by term for term-split state books: '1', '2', '3' or 'Term 1'")
):
    """Get all enriched units as a single textbook."""
    import orjson
    
    all_units = []
    
    if OUTPUTS_DIR.exists():
        for doc_dir in OUTPUTS_DIR.iterdir():
            if not doc_dir.is_dir():
                continue
                
            metadata_path = doc_dir / "metadata.json"
            if metadata_path.exists():
                try:
                    meta = orjson.loads(metadata_path.read_bytes())
                    if subject and str(meta.get("subject", "")).lower() != subject.lower():
                        continue
                        
                    if board:
                        meta_board = str(meta.get("board", "")).lower().replace("_", " ")
                        req_board = board.lower().replace("_", " ")
                        if meta_board != req_board:
                            continue
                            
                    if class_number:
                        meta_class = str(meta.get("class_number", "")).lower().lstrip("0")
                        req_class = str(class_number).lower().lstrip("0")
                        if meta_class != req_class:
                            continue

                    # Term books restart unit numbering — without this filter a
                    # term-split subject returns every term's units interleaved.
                    if term:
                        from term_utils import normalize_term
                        req_term = normalize_term(term)
                        meta_term = normalize_term(meta.get("term"))
                        if req_term and meta_term and req_term != meta_term:
                            continue
                except Exception:
                    pass
                
            enriched_path = doc_dir / "enriched.json"
            if enriched_path.exists():
                try:
                    data = orjson.loads(enriched_path.read_bytes())
                    
                    units = []
                    if "units" in data and isinstance(data["units"], list):
                        units = data["units"]
                    elif "title" in data and "sections" in data:
                        units = [data]
                        
                    if subject and not metadata_path.exists():
                        units = [u for u in units if str(u.get("subject", "")).lower() == subject.lower()]
                        
                    all_units.extend(units)
                except Exception as e:
                    logger.error(f"Failed to read {enriched_path}: {e}")
                    
    def get_unit_num(unit):
        try:
            return int(unit.get("unit_number", 999))
        except (ValueError, TypeError):
            return 999
            
    all_units.sort(key=get_unit_num)
    
    return {
        "success": True,
        "subject": subject or (all_units[0].get("subject") if all_units else None),
        "board": board,
        "class_number": class_number,
        "term": term,
        "total_units": len(all_units),
        "units": all_units
    }


@app.get("/markdown/{document_id}")
def get_markdown_content(document_id: str):
    """Get markdown content for a document."""
    content_path = OUTPUTS_DIR / document_id / "content.md"
    
    if not content_path.exists():
        raise HTTPException(status_code=404, detail="Markdown content not found")
    
    markdown = content_path.read_text(encoding="utf-8")
    
    return {"document_id": document_id, "markdown": markdown}


@app.get("/pdf/{document_id}")
def get_pdf(document_id: str):
    """Get the original PDF file."""
    doc_dir = OUTPUTS_DIR / document_id
    
    if not doc_dir.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    
    for pdf in doc_dir.glob("*.pdf"):
        return FileResponse(pdf, media_type="application/pdf", filename=pdf.name)
    
    raise HTTPException(status_code=404, detail="PDF file not found")


@app.get("/status")
def get_status():
    """Get system status and available features."""
    from config import (
        MISTRAL_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY_TEXT,
        LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, OPENAI_API_KEY_TEXT
    )
    
    ai_tutor_available = False
    try:
        import ai_tutor
        ai_tutor_available = True
    except ImportError:
        pass

    return {
        "mistral_configured": bool(MISTRAL_API_KEY),
        "openrouter_configured": bool(OPENROUTER_API_KEY),
        "openai_configured": bool(OPENAI_API_KEY_TEXT),
        "ai_tutor_available": ai_tutor_available,
        "embeddings_provider": "openai",
        "langfuse_configured": bool(LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY),
        "textbooks_dir": str(TEXTBOOKS_DIR),
        "outputs_dir": str(OUTPUTS_DIR),
        "textbooks_count": len(list(TEXTBOOKS_DIR.glob("*.pdf"))) if TEXTBOOKS_DIR.exists() else 0,
        "documents_count": len(list(OUTPUTS_DIR.iterdir())) if OUTPUTS_DIR.exists() else 0
    }

# ── AI Tutor Endpoints ────────────────────────────────────────────────────────


@app.post("/tutor/enrichment/generate-audio")
def generate_enrichment_audio(request: EnrichmentAudioRequest):
    """
    Generate audio for an existing enriched JSON provided in the payload.
    Generates missing TTS audio for all segments and returns the fully updated JSON.
    """
    try:
        from enrichment_pipeline import generate_audio_for_enriched_data
        
        enriched_data = request.message
        
        # Extract metadata from JSON if available (used for S3 folder structure)
        board = enriched_data.get("board", "unknown_board")
        class_number = enriched_data.get("class_number", "unknown_class")
        
        # Subject can be at top level or inside first unit
        subject = enriched_data.get("subject")
        if not subject:
            content_key = "chapters" if "chapters" in enriched_data else "units"
            units = enriched_data.get(content_key, [])
            if units and isinstance(units, list):
                subject = units[0].get("subject")
        if not subject:
            subject = "unknown_subject"
            
        is_math = subject.lower() in ("mathematics", "math")
        
        # Generate audio
        updated_data = generate_audio_for_enriched_data(
            enriched_data=enriched_data,
            board=board,
            class_number=str(class_number),
            subject=subject,
            is_math=is_math
        )
        
        return updated_data
        
    except Exception as e:
        logger.error(f"Error generating audio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tutor/ask")
def tutor_ask(request: TutorRequest):
    """
    Ask the AI Tutor a question.
 
    The tutor retrieves relevant content from the Qdrant vector DB,
    generates a study-focused answer using GPT-5-mini, and maintains
    per-student chat history (scoped by subject + unit).
 
    *Rules:*
    - Only answers study-related questions for the given subject/unit.
    - Rejects 18+, harmful, or off-topic content.
    - Uses textbook content as primary source of truth.
    """
    try:
        from ai_tutor import ask_tutor
    except ImportError:
        raise HTTPException(500, "AI Tutor module not available. Ensure ai_tutor.py is present.")
 
    if not request.query and not request.image_base64:
        raise HTTPException(status_code=400, detail="Must provide either a query or an image.")

    actual_query = request.query
    if not actual_query and request.image_base64:
        actual_query = "Please explain the content of this image based on the relevant textbook context."

    # ── Guardrails pre-flight ──────────────────────────────────────────────
    # Intercept homework / external-worksheet requests before they reach the
    # RAG pipeline.  Returns None when the query is safe to pass through.
    guardrail_response = run_query_guardrail(
        query=actual_query,
        subject=request.subject,
        unit_number=request.unit_number,
        candidate_id=request.candidate_id,
        image_description=None,  # image_base64 is handled inside ask_tutor
    )
    if guardrail_response is not None:
        logger.info(
            "[Guardrails] Homework intercepted for candidate=%s subject=%s unit=%s",
            request.candidate_id, request.subject, request.unit_number,
        )
        return {"success": True, **guardrail_response}
    # ── End guardrails ─────────────────────────────────────────────────────

    result = ask_tutor(
        query=actual_query,
        board=request.board,
        class_number=request.class_number or "",
        subject=request.subject,
        unit_number=request.unit_number,
        unit_name=request.unit_name,
        candidate_name=request.candidate_name,
        candidate_id=request.candidate_id,
        limit=request.limit,
        image_base64=request.image_base64,
        term=request.term,
    )

    return {"success": True, **result}

@app.get("/tutor/history")
def tutor_get_history(
    candidate_id: str = Query(..., description="Unique student identifier"),
    subject: str = Query(..., description="Subject name"),
    unit_number: int = Query(..., description="Unit number"),
):
    """
    Retrieve chat history for a student on a specific subject + unit.
    """
    try:
        from ai_tutor import get_history_manager
    except ImportError:
        raise HTTPException(500, "AI Tutor module not available.")

    hm = get_history_manager()
    messages = hm.get_history(candidate_id, subject, unit_number)

    return {
        "success": True,
        "candidate_id": candidate_id,
        "subject": subject,
        "unit_number": unit_number,
        "messages": messages,
        "count": len(messages),
    }


@app.delete("/tutor/history")
def tutor_clear_history(
    candidate_id: str = Query(..., description="Unique student identifier"),
    subject: Optional[str] = Query(None, description="Subject name (omit to clear all subjects)"),
    unit_number: Optional[int] = Query(None, description="Unit number (omit to clear all units)"),
):
    """
    Clear chat history for a student.

    - Provide subject + unit_number to clear one conversation.
    - Provide only subject to clear all units for that subject.
    - Omit both to clear ALL history for this student.
    """
    try:
        from ai_tutor import get_history_manager
    except ImportError:
        raise HTTPException(500, "AI Tutor module not available.")

    hm = get_history_manager()
    deleted = hm.clear_history(candidate_id, subject, unit_number)

    return {
        "success": True,
        "candidate_id": candidate_id,
        "conversations_cleared": deleted,
    }


@app.get("/tutor/conversations")
def tutor_list_conversations(
    candidate_id: str = Query(..., description="Unique student identifier"),
):
    """
    List all conversation sessions for a student.
    """
    try:
        from ai_tutor import get_history_manager
    except ImportError:
        raise HTTPException(500, "AI Tutor module not available.")

    hm = get_history_manager()
    convos = hm.list_conversations(candidate_id)

    return {
        "success": True,
        "candidate_id": candidate_id,
        "conversations": convos,
        "count": len(convos),
    }


# ── AI Tutor Feature Models ──────────────────────────────────────────────────


class QuestionBankUploadRequest(BaseModel):
    """Request model for uploading a question paper."""
    year: str
    exam_name: str
    subject: str
    unit_number: int
    document_id: str
    questions: List[dict]  # [{question, marks, type, options?, correct_answer?}]
    board: Optional[str] = None
    class_number: Optional[str] = None
    # Override the exam -> term mapping; normally derived from exam_name.
    term_scope: Optional[str] = None


class QuizGenerateRequest(BaseModel):
    """Request model for generating a quiz."""
    candidate_id: str
    subject: str
    unit_number: int
    board: str
    unit_name: str = ""
    difficulty: str = "easy"  # easy, medium, hard
    num_questions: int = 5
    candidate_name: str = ""
    # Term-split state books only; omit for CBSE/NCERT.
    term: Optional[str] = None


class QuizSubmitRequest(BaseModel):
    """Request model for submitting quiz answers."""
    quiz_id: str
    candidate_id: str
    answers: List[dict]  # [{question_id, answer}]


class HomeworkAssignRequest(BaseModel):
    """Request model for assigning homework."""
    candidate_id: str
    subject: str
    unit_number: int
    board: str
    unit_name: str = ""
    num_questions: int = 5
    candidate_name: str = ""
    class_number: Optional[str] = None
    # Term-split state books only; omit for CBSE/NCERT.
    term: Optional[str] = None


class HomeworkSubmitRequest(BaseModel):
    """Request model for submitting homework answers."""
    homework_id: str
    candidate_id: str
    answers: List[dict]  # [{question_id, answer}]


class HomeworkChatRequest(BaseModel):
    """Request model for stateful homework helper chat (GradeUp & school assignments)."""
    candidate_id: str
    homework_id: str  # Use "new" or "school" to start a new school homework session
    message: Optional[str] = ""
    image_base64: Optional[str] = None
    subject: Optional[str] = None      # Required if starting a new school homework session
    unit_number: Optional[int] = None  # Required if starting a new school homework session
    board: Optional[str] = None
    class_number: Optional[str] = None
    # Term-split state books only; omit for CBSE/NCERT.
    term: Optional[str] = None


class FAQTrackRequest(BaseModel):
    """Request model for tracking FAQ views."""
    candidate_id: str
    subject: str
    unit_number: int
    section_title: str
    candidate_name: str = ""


# ── FAQ Endpoints ─────────────────────────────────────────────────────────────


@app.get("/tutor/faq/{document_id}")
def get_faqs(
    document_id: str,
    unit_number: Optional[int] = Query(None, description="Filter by unit number"),
):
    """
    Get all FAQs and practice questions from enriched.json for a document.

    Returns section-wise FAQs and practice questions from the enrichment pipeline.
    """
    enriched_path = OUTPUTS_DIR / document_id / "enriched.json"

    if not enriched_path.exists():
        raise HTTPException(404, f"Enriched data not found for document: {document_id}")

    import orjson
    enriched = orjson.loads(enriched_path.read_bytes())

    sections_data = []
    for unit in enriched.get("units", []):
        if unit_number is not None and unit.get("unit_number") != unit_number:
            continue

        for sec in unit.get("sections", []):
            enrichment = sec.get("enrichment", {})
            faqs = enrichment.get("faqs", [])
            practice = enrichment.get("practice_questions", [])

            if faqs or practice:
                sections_data.append({
                    "section_title": sec.get("section_title", ""),
                    "unit_number": unit.get("unit_number"),
                    "unit_title": unit.get("title", ""),
                    "faqs": faqs,
                    "practice_questions": practice,
                })

    return {
        "success": True,
        "document_id": document_id,
        "sections": sections_data,
        "total_faqs": sum(len(s["faqs"]) for s in sections_data),
        "total_practice": sum(len(s["practice_questions"]) for s in sections_data),
    }


@app.get("/tutor/faq/{document_id}/{section_title}")
def get_section_faqs(document_id: str, section_title: str):
    """Get FAQs for a specific section of a document."""
    enriched_path = OUTPUTS_DIR / document_id / "enriched.json"

    if not enriched_path.exists():
        raise HTTPException(404, f"Enriched data not found for document: {document_id}")

    import orjson
    enriched = orjson.loads(enriched_path.read_bytes())

    for unit in enriched.get("units", []):
        for sec in unit.get("sections", []):
            if sec.get("section_title", "").lower() == section_title.lower():
                enrichment = sec.get("enrichment", {})
                return {
                    "success": True,
                    "document_id": document_id,
                    "section_title": sec.get("section_title", ""),
                    "unit_number": unit.get("unit_number"),
                    "faqs": enrichment.get("faqs", []),
                    "practice_questions": enrichment.get("practice_questions", []),
                }

    raise HTTPException(404, f"Section '{section_title}' not found in {document_id}")


@app.post("/tutor/faq/{document_id}/track")
def track_faq_view(document_id: str, request: FAQTrackRequest):
    """Track that a student viewed FAQs for a section (updates performance)."""
    try:
        from student_performance import get_performance_tracker
    except ImportError:
        raise HTTPException(500, "Student performance module not available.")

    tracker = get_performance_tracker()
    tracker.record_faq_view(
        candidate_id=request.candidate_id,
        subject=request.subject,
        unit_number=request.unit_number,
        section_title=request.section_title,
        candidate_name=request.candidate_name,
    )

    return {"success": True, "message": "FAQ view tracked"}


# ── Question Bank Endpoints ───────────────────────────────────────────────────


@app.post("/tutor/question-bank/upload-pdf")
async def upload_question_paper_pdf(
    file: UploadFile = File(...),
    exam_name: str = Form(...),
    year: str = Form(...),
    class_number: str = Form(...),
    board: str = Form(...),
    subject: str = Form(...),
    unit_name: Optional[str] = Form(None),
    unit_number: Optional[int] = Form(None),
    term_scope: Optional[str] = Form(
        None,
        description="Override the terms this exam covers, e.g. '2' or '1,2'. "
                    "Normally left blank — the scope is derived from exam_name "
                    "(quarterly=Term 1, half-yearly=Term 2, annual=all terms). "
                    "Required for unit tests, which map to no fixed term."
    ),
):
    """
    Admin endpoint to upload a PDF question paper.
    Runs Mistral OCR, extracts questions via LLM, and stores via QuestionBankManager.

    **Terms:** you upload by EXAM (quarterly / half-yearly / annual), never by
    term. The backend derives the term scope from `exam_name`, uses it to scope
    RAG retrieval, and then derives a single term per question from the unit it
    maps to. Pass `term_scope` only to override that mapping.
    """
    try:
        from question_bank import get_question_bank_manager
    except ImportError:
        raise HTTPException(500, "Question bank module not available.")

    import tempfile
    import os
    import json
    import requests
    from mistralai import Mistral
    
    # 1. Save PDF temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        pdf_path = Path(tmp.name)
        
    try:
        # 2. Extract OCR with Mistral
        api_key_mistral = os.environ.get("MISTRAL_API_KEY")
        if not api_key_mistral:
            raise HTTPException(500, "MISTRAL_API_KEY is missing")
            
        client = Mistral(api_key=api_key_mistral)
        
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
            
        uploaded_pdf = client.files.upload(
            file={
                "file_name": file.filename,
                "content": pdf_bytes,
            },
            purpose="ocr"
        )
        
        signed_url = client.files.get_signed_url(file_id=uploaded_pdf.id)
        
        ocr_response = client.ocr.process(
            model="mistral-ocr-latest",
            document={"type": "document_url", "document_url": signed_url.url},
            include_image_base64=False,
            image_limit=0
        )
        
        markdown_text = ""
        if hasattr(ocr_response, "pages"):
            for page in ocr_response.pages:
                markdown_text += page.markdown + "\n\n"
                
        with open("raw_ocr_dump.txt", "w", encoding="utf-8") as f:
            f.write(markdown_text)
        
        # 2.5 Pre-process markdown to fix OCR math errors (e.g., 4x6=20 -> 4x5=20)
        import re
        def _fix_ocr_math(match):
            q_count = int(match.group(1))
            marks = int(match.group(2))
            total = int(match.group(3))
            if q_count > 0 and marks > 0 and q_count * marks != total:
                if total % q_count == 0:
                    fixed_marks = total // q_count
                    return f"{q_count}x{fixed_marks}={total}"
            return match.group(0)
            
        markdown_text = re.sub(r'(\d+)\s*[xX*]\s*(\d+)\s*=\s*(\d+)', _fix_ocr_math, markdown_text)
        
        # 3. LLM extraction to List[dict]
        api_key_openai = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key_openai:
            raise HTTPException(500, "OPENAI_API_KEY is missing")
            
        headers = {
            "Authorization": f"Bearer {api_key_openai}",
            "Content-Type": "application/json",
        }
        
        prompt = f'''You are an expert question paper parser. Extract all questions from the following question paper into a JSON array of objects.

=== CRITICAL RULES FOR MARKS EXTRACTION ===

STEP 1: IDENTIFY SECTION STRUCTURE FIRST
Before extracting questions, identify ALL sections/parts of the paper and their marks scheme.
Typical board exam structure:
- PART I / Section A: MCQs (1 mark each) — formula like "10x1=10" or "14x1=14"
- PART II / Section B: Short answers (2 marks each) — formula like "10x2=20"  
- PART III / Section C: Brief answers (4 marks each) — formula like "7x4=28"
- PART IV / Section D: Long answers (5 marks each) — formula like "4x5=20"

STEP 2: ASSIGN MARKS FROM SECTION HEADERS (HIGHEST PRIORITY)
- If a section header says "PART - III (4 marks)" or "Part III 7x4=28", ALL questions in that section are 4 marks each.
- The formula "NxM=T" means N questions, M marks each, T total marks. The marks per question is M (the MIDDLE number).
- DO NOT use fallback defaults if section headers define marks.

STEP 3: EXPLICIT PER-QUESTION MARKS (OVERRIDE)
- If an individual question explicitly states its marks (e.g., "[3]", "(5 marks)"), use that value instead.

STEP 4: FALLBACK (ONLY if no section header or explicit marks exist)
- MCQ / Fill in the blanks / True or False = 1 mark
- Short answer = 2 marks, Long answer / Essay = 5 marks

=== CRITICAL RULES FOR MCQ OPTIONS vs QUESTION NUMBERING ===

⚠️ DO NOT CONFUSE MCQ OPTIONS WITH QUESTION NUMBERS!
- MCQ options are labeled (a), (b), (c), (d) or A), B), C), D) or i), ii), iii), iv). These are CHOICES within ONE question, NOT separate questions!
- Question numbers are labeled 1., 2., 3., etc. or Q1, Q2, etc. or i., ii., iii. at the QUESTION level.
- An MCQ has ONE question stem + multiple options (a/b/c/d). Extract all options into the "options" array. Do NOT create separate question entries for each option.
- Example: If the paper has "1. Light year is the unit of _______ (a) distance (b) time (c) density (d) Both length and time" — this is ONE question with 4 options, NOT 4 separate questions.

=== CRITICAL RULES FOR SUB-QUESTIONS ===

⚠️ MERGE SUB-QUESTIONS INTO THEIR PARENT QUESTION!
- If a main numbered question has sub-parts (e.g., "3. Fill in the Blanks: (i) ... (ii) ... (iii) ..."), you MUST include ALL sub-parts inside the "question" field as a single combined text.
- DO NOT extract the header alone (like "Fill in the Blanks." or "Match the following." or "State True or False.") as a standalone question without its sub-items.
- DO NOT extract each sub-part (i), (ii), (iii) as separate main-level questions. They belong together under the parent question number.
- The parent question text must contain the instruction AND all sub-items concatenated together.
- Example: If the paper says:
    "14. Fill in the Blanks.
     (i) The SI unit of speed is _______
     (ii) 1 kg = _______ g"
  Then extract as ONE question with text: "Fill in the Blanks.\n(i) The SI unit of speed is _______\n(ii) 1 kg = _______ g"
- Similarly for "Match the following", "State True or False", "Write the symbols", "Give reasons" type questions — combine the instruction with ALL its sub-parts.
- The marks for the combined question should be the marks assigned to that question number from the section header, NOT the sum of sub-parts.

=== DO NOT SKIP ANY QUESTIONS (CRITICAL) ===
- Extract EVERY numbered question from the paper. 
- Do not skip analogy questions, true/false questions, fill-in-the-blanks, match-the-following, or any short questions.
- Count your extracted questions against the section totals to verify you haven't missed any.

=== OUTPUT FORMAT ===
Each object must have:
- "question": string (the FULL question text. For questions with sub-parts, include the instruction AND all sub-items in a single string separated by newlines)
- "marks": int (MUST be inferred from section headers / math formulas — NOT always 1. A question in "Part III 7x4=28" section MUST have marks=4)
- "type": string (one of: "mcq", "short_answer", "long_answer", "fill_in_the_blanks", "match_the_following", "true_or_false")
- "options": array of strings (for MCQ only — the answer choices like ["distance", "time", "density", "Both"]. Empty array for all other types)
- "correct_answer": string (if available, otherwise empty string)
- "is_choice_based": boolean (true if the section says "Answer any X out of Y". false if all questions must be answered)
- "questions_to_attempt": int (if section says "Answer any 15 out of 20", this is 15. If no choice is given, this equals the total number of questions in the section)

Question Paper Text:
{markdown_text[:30000]}

Return ONLY the JSON array. No markdown formatting, no explanation.'''

        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_completion_tokens": 12000,
            "temperature": 0.2,
        }
        
        resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=120)
        if not resp.ok:
            raise HTTPException(500, f"LLM Extraction failed: {resp.text}")
            
        content = resp.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        try:
            extracted_questions = json.loads(content)
        except json.JSONDecodeError:
            raise HTTPException(500, "Failed to parse LLM extracted questions as JSON.")
        
        # 3.5 Post-processing: fix common LLM extraction issues
        
        # A) Filter out standalone section headers extracted as questions
        #    (e.g., "Fill in the Blanks." with no actual blanks content)
        header_only_patterns = [
            r'^fill\s+in\s+the\s+blanks\.?\s*$',
            r'^match\s+the\s+following\.?\s*$',
            r'^state\s+true\s+or\s+false.*\.?\s*$',
            r'^write\s+the\s+symbols?\s+for\s+the\s+following.*\.?\s*$',
            r'^answer\s+the\s+following.*\.?\s*$',
            r'^choose\s+the\s+correct\s+answer.*\.?\s*$',
        ]
        
        cleaned_questions = []
        for q in extracted_questions:
            q_text = q.get("question", "").strip()
            # Check if this is just a section header with no actual content
            is_header_only = False
            for pattern in header_only_patterns:
                if re.match(pattern, q_text, re.IGNORECASE):
                    is_header_only = True
                    break
            
            if is_header_only:
                print(f"  ⚠️  [QuestionBank] Filtered out standalone section header: '{q_text}'")
                continue
            
            cleaned_questions.append(q)
        
        extracted_questions = cleaned_questions
        
        # B) Parse section marks structure from OCR text for validation (LOG ONLY)
        #    The N in "NxM=T" is "questions to attempt", NOT total questions printed
        #    (e.g., "Answer any 10 out of 15" → formula says 10x2=20 but 15 questions exist).
        #    So we CANNOT reliably map question indices to section ranges.
        #    Instead, just build the set of valid marks values for sanity-check logging.
        valid_marks_from_ocr = set()
        
        # Find NxM=T formulas  
        for m in re.finditer(r'(\d+)\s*[xX×*]\s*(\d+)\s*=\s*(\d+)', markdown_text[:30000]):
            n_questions = int(m.group(1))
            marks_each = int(m.group(2))
            total = int(m.group(3))
            if n_questions > 0 and marks_each > 0 and n_questions * marks_each == total:
                valid_marks_from_ocr.add(marks_each)
        
        if valid_marks_from_ocr:
            print(f"  📋  [QuestionBank] Detected valid marks from paper: {sorted(valid_marks_from_ocr)}")
            for idx, q in enumerate(extracted_questions):
                q_marks = q.get("marks")
                if q_marks not in valid_marks_from_ocr:
                    print(f"  ⚠️  [QuestionBank] Q{idx+1} has marks={q_marks} which is not in detected marks set {sorted(valid_marks_from_ocr)} — please verify")
        

        # Term scope for this exam. An explicit term_scope always wins; otherwise
        # it comes from the exam name (see term_utils.EXAM_TERM_SCOPE).
        from term_utils import exam_to_terms, term_slug
        terms = exam_to_terms(exam_name, override=term_scope)
        logger.info(f"  [QuestionBank] exam='{exam_name}' term_scope={terms or 'none'}")

        # Class and term belong in the logical document id: without them, Class 6
        # and Class 10 papers for one board+subject shared a single logical
        # document, and Term 1 / Term 2 papers would now collide the same way.
        _qb_parts = [
            "qb_pdf",
            board.strip().replace(' ', '_'),
            str(class_number).strip().replace(' ', '_'),
            subject.strip().replace(' ', '_'),
        ]
        if terms:
            _qb_parts.append(term_slug(terms))
        logical_doc_id = "_".join(p for p in _qb_parts if p)

        manager = get_question_bank_manager()
        result = manager.process_question_paper(
            questions=extracted_questions,
            year=year,
            exam_name=exam_name,
            subject=subject,
            unit_number=unit_number,
            document_id=logical_doc_id,
            terms=terms,
            board=board,
            class_number=class_number,
        )

        return {
            "success": True,
            "extracted_count": len(extracted_questions),
            **result
        }
        
    finally:
        if pdf_path.exists():
            os.unlink(pdf_path)
        # Clean up debug OCR dump file
        try:
            if os.path.exists("raw_ocr_dump.txt"):
                os.remove("raw_ocr_dump.txt")
                print("  🧹 Cleaned up raw_ocr_dump.txt")
        except OSError as e:
            print(f"  ⚠️  Failed to delete raw_ocr_dump.txt: {e}")


@app.post("/tutor/question-bank/upload")
def upload_question_paper(request: QuestionBankUploadRequest):
    """
    Admin uploads a question paper for difficulty scoring.

    Each question goes through the RAG pipeline to:
    1. Score difficulty (easy/medium/hard) using Bloom's taxonomy
    2. Extract features: topic, concept area, question type
    3. Add related textbook sections

    Returns the processed paper with scored questions.
    """
    try:
        from question_bank import get_question_bank_manager
    except ImportError:
        raise HTTPException(500, "Question bank module not available.")

    from term_utils import exam_to_terms
    terms = exam_to_terms(request.exam_name, override=request.term_scope)

    manager = get_question_bank_manager()
    result = manager.process_question_paper(
        questions=request.questions,
        year=request.year,
        exam_name=request.exam_name,
        subject=request.subject,
        unit_number=request.unit_number,
        document_id=request.document_id,
        terms=terms,
        board=request.board,
        class_number=request.class_number,
    )

    return {"success": True, **result}


@app.get("/tutor/question-bank/{document_id}")
def get_question_bank(
    document_id: str,
    year: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    unit_number: Optional[int] = Query(None),
    term: Optional[str] = Query(None, description="Filter by the per-question term: '2' or 'Term 2'"),
):
    """List all questions for a document with optional filters."""
    try:
        from question_bank import get_question_bank_manager
    except ImportError:
        raise HTTPException(500, "Question bank module not available.")

    manager = get_question_bank_manager()
    questions = manager.get_questions(
        document_id=document_id,
        year=year,
        difficulty=difficulty,
        unit_number=unit_number,
        term=term,
    )

    return {
        "success": True,
        "document_id": document_id,
        "questions": questions,
        "count": len(questions),
    }


@app.get("/tutor/question-bank/stats/{document_id}")
def get_question_bank_stats(document_id: str):
    """Get question bank statistics (count by difficulty, topic, year)."""
    try:
        from question_bank import get_question_bank_manager
    except ImportError:
        raise HTTPException(500, "Question bank module not available.")

    manager = get_question_bank_manager()
    stats = manager.get_stats(document_id)

    return {"success": True, **stats}


# ── Quiz Endpoints ────────────────────────────────────────────────────────────


@app.post("/tutor/quiz/generate")
def generate_quiz(request: QuizGenerateRequest):
    """
    Generate a quiz for a student.

    - Choose difficulty: easy, medium, hard
    - Questions are mixed across sections based on weakness priority
    - Cached quizzes are reused for same parameters across students
    - Re-attempts never repeat questions from previous attempts
    """
    try:
        from quiz_engine import get_quiz_engine
        from qdrant_integration import search_qdrant
    except ImportError:
        raise HTTPException(500, "Quiz engine module not available.")

    # Dynamically resolve document_id from Qdrant. The term must be part of this
    # lookup: without it a term-split subject resolves to an arbitrary term's book.
    query_text = request.unit_name if request.unit_name else request.subject
    db_results = search_qdrant(
        query=query_text,
        limit=1,
        board_filter=request.board,
        subject_filter=request.subject,
        term_filter=request.term,
    )
    document_id = db_results[0]["metadata"].get("document_id", "") if db_results else ""
    actual_unit_number = db_results[0]["metadata"].get("unit_number", request.unit_number) if db_results else request.unit_number

    engine = get_quiz_engine()
    result = engine.generate_quiz(
        candidate_id=request.candidate_id,
        subject=request.subject,
        unit_number=actual_unit_number,
        document_id=document_id,
        difficulty=request.difficulty,
        num_questions=request.num_questions,
        unit_title=request.unit_name,
        candidate_name=request.candidate_name,
        term=request.term,
        board=request.board,
    )

    return {"success": True, **result}


@app.post("/tutor/quiz/submit")
def submit_quiz(request: QuizSubmitRequest):
    """
    Submit quiz answers and get scored results.

    Returns:
    - Section-wise score breakdown
    - Points earned
    - Corrections with explanations
    """
    try:
        from quiz_engine import get_quiz_engine
    except ImportError:
        raise HTTPException(500, "Quiz engine module not available.")

    engine = get_quiz_engine()
    result = engine.submit_quiz(
        quiz_id=request.quiz_id,
        candidate_id=request.candidate_id,
        answers=request.answers,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.get("/tutor/quiz/history/{candidate_id}")
def get_quiz_history(
    candidate_id: str,
    subject: Optional[str] = Query(None),
    unit_number: Optional[int] = Query(None),
):
    """Get quiz attempt history for a student."""
    try:
        from quiz_engine import get_quiz_engine
    except ImportError:
        raise HTTPException(500, "Quiz engine module not available.")

    engine = get_quiz_engine()
    history = engine.get_quiz_history(
        candidate_id=candidate_id,
        subject=subject,
        unit_number=unit_number,
    )

    return {
        "success": True,
        "candidate_id": candidate_id,
        "history": history,
        "count": len(history),
    }


# ── Homework Endpoints ────────────────────────────────────────────────────────


@app.post("/tutor/homework/assign")
def assign_homework(request: HomeworkAssignRequest):
    """
    AI assigns homework based on student's weak areas.

    The AI tutor:
    1. Analyzes student's performance across sections
    2. Identifies weak topics
    3. Generates homework targeting those weaknesses
    4. Sets difficulty slightly above current level (progressive)
    """
    try:
        from homework_engine import get_homework_engine
        from qdrant_integration import search_qdrant
    except ImportError:
        raise HTTPException(500, "Homework engine module not available.")

    # Dynamically resolve document_id from Qdrant
    query_text = request.unit_name if request.unit_name else request.subject
    db_results = search_qdrant(
        query=query_text,
        limit=1,
        board_filter=request.board,
        subject_filter=request.subject,
        unit_filter=request.unit_number,
        class_filter=request.class_number,
        term_filter=request.term,
    )
    document_id = db_results[0]["metadata"].get("document_id", "") if db_results else ""
    actual_unit_number = db_results[0]["metadata"].get("unit_number", request.unit_number) if db_results else request.unit_number

    engine = get_homework_engine()
    result = engine.assign_homework(
        candidate_id=request.candidate_id,
        subject=request.subject,
        unit_number=actual_unit_number,
        document_id=document_id,
        num_questions=request.num_questions,
        candidate_name=request.candidate_name,
        unit_title=request.unit_name,
        term=request.term,
        board=request.board,
        class_number=request.class_number,
    )

    return {"success": True, **result}


@app.post("/tutor/homework/submit")
def submit_homework(request: HomeworkSubmitRequest):
    """
    Submit completed homework for scoring.

    Answers are evaluated using LLM against textbook content.
    Points are awarded based on score percentage.
    """
    try:
        from homework_engine import get_homework_engine
    except ImportError:
        raise HTTPException(500, "Homework engine module not available.")

    engine = get_homework_engine()
    result = engine.submit_homework(
        homework_id=request.homework_id,
        candidate_id=request.candidate_id,
        answers=request.answers,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.post("/tutor/homework/chat")
def homework_chat_turn(request: HomeworkChatRequest):
    """
    Unified endpoint for stateful Socratic Homework Helper chat.
    Handles both internal GradeUp homework and external school-assigned worksheets.
    """
    try:
        from homework_engine import get_homework_engine
    except ImportError:
        raise HTTPException(500, "Homework engine module not available.")

    engine = get_homework_engine()
    try:
        result = engine.execute_socratic_chat_turn(
            candidate_id=request.candidate_id,
            homework_id=request.homework_id,
            message=request.message,
            image_base64=request.image_base64,
            subject=request.subject,
            unit_number=request.unit_number,
            board=request.board,
            class_number=request.class_number,
            term=request.term,
        )
        return result
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/tutor/homework/{candidate_id}")
def list_homeworks(
    candidate_id: str,
    subject: Optional[str] = Query(None),
    unit_number: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="Filter: pending or completed"),
):
    """List assigned homework for a student."""
    try:
        from homework_engine import get_homework_engine
    except ImportError:
        raise HTTPException(500, "Homework engine module not available.")

    engine = get_homework_engine()
    homeworks = engine.get_homeworks(
        candidate_id=candidate_id,
        subject=subject,
        unit_number=unit_number,
        status=status,
    )

    return {
        "success": True,
        "candidate_id": candidate_id,
        "homeworks": homeworks,
        "count": len(homeworks),
    }


@app.get("/tutor/homework/{candidate_id}/history")
def get_homework_history(
    candidate_id: str,
    subject: Optional[str] = Query(None),
    unit_number: Optional[int] = Query(None),
):
    """Get completed homework history with scores and points."""
    try:
        from homework_engine import get_homework_engine
    except ImportError:
        raise HTTPException(500, "Homework engine module not available.")

    engine = get_homework_engine()
    history = engine.get_homework_history(
        candidate_id=candidate_id,
        subject=subject,
        unit_number=unit_number,
    )

    return {
        "success": True,
        "candidate_id": candidate_id,
        "history": history,
        "count": len(history),
    }


# ── Student Performance Endpoints ─────────────────────────────────────────────


@app.get("/tutor/performance/{candidate_id}")
def get_performance(
    candidate_id: str,
    subject: Optional[str] = Query(None),
    unit_number: Optional[int] = Query(None),
):
    """
    Get student performance dashboard.

    - No filters: overall summary across all subjects
    - Subject only: all units for that subject
    - Subject + unit: detailed section-level breakdown
    """
    try:
        from student_performance import get_performance_tracker
    except ImportError:
        raise HTTPException(500, "Student performance module not available.")

    tracker = get_performance_tracker()
    performance = tracker.get_performance(
        candidate_id=candidate_id,
        subject=subject,
        unit_number=unit_number,
    )

    return {"success": True, **performance}


@app.get("/tutor/performance/{candidate_id}/points")
def get_points(candidate_id: str):
    """Get student's total accumulated points and points history."""
    try:
        from student_performance import get_performance_tracker
    except ImportError:
        raise HTTPException(500, "Student performance module not available.")

    tracker = get_performance_tracker()
    total = tracker.get_total_points(candidate_id)
    history = tracker.get_points_history(candidate_id)

    return {
        "success": True,
        "candidate_id": candidate_id,
        "total_points": total,
        "points_history": history,
    }


# ── Text Highlighting Endpoints ───────────────────────────────────────────────


class HighlightRequest(BaseModel):
    """Request model for Explain / Summarize highlighted text."""
    highlighted_text: str
    board: str
    class_number: str = ""
    subject: str = ""
    unit_number: Optional[int] = None
    # Term-split state books only; also keys the highlight reuse cache.
    term: Optional[str] = None


class HighlightAskRequest(BaseModel):
    """Request model for Ask AI about highlighted text."""
    highlighted_text: str
    board: str
    class_number: str = ""
    subject: str = ""
    unit_number: Optional[int] = None
    term: Optional[str] = None
    messages: List[dict]  # [{role, content}] — full chat from frontend


class HighlightReadRequest(BaseModel):
    """Request model for generating TTS for a highlight.
    Fetches the response from Qdrant or generates it if missing.
    """
    highlighted_text: str
    action: str = "explain" # "explain" or "summarize"
    board: str
    class_number: str = ""
    subject: str = ""
    unit_number: Optional[int] = None
    term: Optional[str] = None

@app.post("/highlight/explain")
def highlight_explain_endpoint(request: HighlightRequest):
    """
    Explain highlighted text using RAG + LLM.

    - Retrieves relevant textbook content from Qdrant
    - Generates a detailed, student-friendly explanation
    - Stores metadata in Qdrant (audio_url is null initially)
    - Returns: response text, sources, audio_url: null

    **TTS:** Generate audio by calling `/highlight/read` with the returned explanation text.
    """
    try:
        from highlighting import highlight_explain
    except ImportError:
        raise HTTPException(500, "Highlighting module not available.")

    if not request.highlighted_text.strip():
        raise HTTPException(400, "highlighted_text cannot be empty")

    result = highlight_explain(
        highlighted_text=request.highlighted_text,
        board=request.board,
        class_number=request.class_number,
        subject=request.subject,
        unit_number=request.unit_number,
        term=request.term,
    )

    return {"success": True, **result}


@app.post("/highlight/summarize")
def highlight_summarize_endpoint(request: HighlightRequest):
    """
    Summarize highlighted text using RAG + LLM.

    - Retrieves relevant textbook content from Qdrant
    - Generates a concise summary of the highlighted text
    - Stores metadata in Qdrant (audio_url is null initially)
    - Returns: response text, sources, audio_url: null

    **TTS:** Generate audio by calling `/highlight/read` with the returned summary text.
    """
    try:
        from highlighting import highlight_summarize
    except ImportError:
        raise HTTPException(500, "Highlighting module not available.")

    if not request.highlighted_text.strip():
        raise HTTPException(400, "highlighted_text cannot be empty")

    result = highlight_summarize(
        highlighted_text=request.highlighted_text,
        board=request.board,
        class_number=request.class_number,
        subject=request.subject,
        unit_number=request.unit_number,
        term=request.term,
    )

    return {"success": True, **result}


@app.post("/highlight/ask")
def highlight_ask_endpoint(request: HighlightAskRequest):
    """
    Chat with AI about highlighted text using RAG.

    Multi-turn conversation — send the full messages array each time.
    No chat history is stored on the server.
    No TTS audio is generated for Ask AI.
    """
    try:
        from highlighting import highlight_ask_ai
    except ImportError:
        raise HTTPException(500, "Highlighting module not available.")

    if not request.highlighted_text.strip():
        raise HTTPException(400, "highlighted_text cannot be empty")

    if not request.messages:
        raise HTTPException(400, "messages array cannot be empty")

    result = highlight_ask_ai(
        highlighted_text=request.highlighted_text,
        messages_history=request.messages,
        board=request.board,
        class_number=request.class_number,
        subject=request.subject,
        unit_number=request.unit_number,
        term=request.term,
    )

    return {"success": True, **result}


@app.post("/highlight/read")
def highlight_read_endpoint(request: HighlightReadRequest):
    """
    Generate TTS audio for a highlight response on-demand.

    Called when the student presses the "Read" button.
    Reads the 'response_text' (explanation or summary), NOT the highlight.
    Generates audio, uploads to S3, and updates VectorDB record.
    """
    try:
        from highlighting import highlight_read
    except ImportError:
        raise HTTPException(500, "Highlighting module not available.")

    if not request.highlighted_text.strip():
        raise HTTPException(400, "highlighted_text cannot be empty")

    result = highlight_read(
        highlighted_text=request.highlighted_text,
        action=request.action,
        board=request.board,
        class_number=request.class_number,
        subject=request.subject,
        unit_number=request.unit_number,
        term=request.term,
    )

    if not result.get("success"):
        raise HTTPException(500, result.get("error", "TTS generation failed"))

    return result

# ── AI Debate & Seminar — Request Models ──────────────────────────────────────


class DebateStartRequest(BaseModel):
    """Start a 1-on-1 AI debate session."""
    candidate_id: str
    candidate_name: str
    subject: str
    unit_number: int
    board: str
    class_number: str
    unit_name: str = ""
    topic: str  # mandatory — student selects the topic
    student_stance: Optional[str] = None  # optional — the specific argument/stance the student selected
    # Term-split state books only; omit for CBSE/NCERT.
    term: Optional[str] = None


class DebateRespondRequest(BaseModel):
    """Student responds in a debate."""
    session_id: str
    message: str


class DebateEndRequest(BaseModel):
    """End a debate s ession."""
    session_id: str


class MultiDebateCreateRequest(BaseModel):
    """Create a multi-student debate session."""
    candidate_id: str
    candidate_name: str
    subject: str
    unit_number: int
    board: str
    class_number: str
    unit_name: str = ""
    max_participants: int = 4
    topic: str  # mandatory — student selects the topic


class MultiDebateJoinRequest(BaseModel):
    """Join a debate session."""
    session_id: str
    candidate_id: str
    candidate_name: str


class MultiDebateRespondRequest(BaseModel):
    """Submit argument in a multi-user debate."""
    session_id: str
    candidate_id: str
    message: str


class MultiDebateEndRequest(BaseModel):
    """End a multi-user debate."""
    session_id: str


class MultiDebateAIStudentRequest(BaseModel):
    """Trigger AI student response in a multi-user debate."""
    session_id: str


class SeminarStartRequest(BaseModel):
    """Start an AI seminar session (used as fallback for JSON requests)."""
    candidate_id: str
    candidate_name: str
    subject: str
    unit_number: int
    board: str
    class_number: str
    unit_name: str = ""
    topic: str  # mandatory — student selects the topic
    session_mode: str = "main"  # "demo" for hints, "main" for real exam, "practice" for interactive preparation
    # Term-split state books only; omit for CBSE/NCERT.
    term: Optional[str] = None


class SeminarRespondRequest(BaseModel):
    """Student responds in a seminar."""
    session_id: str
    message: str
    silence_seconds: float = 0


class SeminarEndRequest(BaseModel):
    """End a seminar session."""
    session_id: str


class SeminarGuideRequest(BaseModel):
    """Request AI guidance during a demo/practice seminar."""
    session_id: str




class SeminarChatStartRequest(BaseModel):
    """Start a post-session seminar chat."""
    session_id: str


class SeminarChatRespondRequest(BaseModel):
    """Send a message in post-session seminar chat."""
    session_id: str
    message: str


# ── PPT Preparation Co-pilot Models ───────────────────────────────────────────


class PPTSessionStartRequest(BaseModel):
    """Start a PPT co-pilot session: create/connect the deck and wire it to the agent."""
    student_id: str = Field(..., min_length=1, max_length=128,
                            description="Unique student identifier")
    # Curriculum coordinates — used to filter RAG (Qdrant) for scaffolding + analysis.
    board: str = Field(..., min_length=2, max_length=30,
                       description="Education board, e.g. CBSE, ICSE, IGCSE")
    class_number: str = Field(
        ..., pattern=r"^(KG|[1-9]|1[0-2])$",
        description="Class/grade: KG or 1-12")
    chapter: int = Field(..., ge=1, le=50,
                         description="Chapter/unit number (1-50)")
    title: str = Field(..., min_length=3, max_length=200,
                       description="Chapter/unit title used as the deck title")
    subject: Optional[str] = Field(None, max_length=80,
                                   description="Subject name, e.g. Biology, Mathematics")
    term: Optional[str] = Field(None, max_length=20,
                                description="Term for term-split state books: '1', '2', '3' or 'Term 1'. "
                                            "Omit for CBSE/NCERT. Stored on the session, so later turns inherit it.")
    deck_ref: Optional[str] = Field(None, max_length=200,
                                    description="Connect to an existing deck; omit to create new")
    tool: Literal["gslides"] = Field(
        "gslides", description="Slide tool backend (currently only gslides is supported)")


class PPTConnectRequest(BaseModel):
    """Start (or check) the student's Google connection via Scalekit."""
    student_id: str = Field(..., min_length=1, max_length=128)


class PPTSessionEndRequest(BaseModel):
    """End a PPT co-pilot session and get the skill summary."""
    session_id: str = Field(..., min_length=32, max_length=64,
                            description="session_id returned by /ppt/session/start")


class PPTEditRequest(BaseModel):
    """
    Ask the agent to review and improve a slide.

    The agent reads the slide content autonomously, plans the right content
    and theme ops (via RAG + LLM), and either auto-applies minor fixes or
    pauses for approval on significant changes.  Students have no manual
    edit controls — the agent decides everything.
    """
    session_id: str = Field(..., min_length=32, max_length=64,
                            description="session_id from /ppt/session/start")
    slide_index: int = Field(..., ge=0, le=50,
                             description="0-based slide index (0 = first slide, max 50)")


class PPTSuggestRequest(BaseModel):
    """Student asks the co-pilot about a slide (verbal points, never edits the deck)."""
    session_id: str = Field(..., min_length=32, max_length=64)
    slide_index: int = Field(..., ge=0, le=50,
                             description="0-based slide index")
    query: Optional[str] = Field(None, max_length=500,
                                 description="e.g. 'explain pollination', 'add points on grafting'")


class PPTDecideRequest(BaseModel):
    """Resume a paused PPT agent run with the student's approval decision."""
    session_id: str = Field(..., min_length=32, max_length=64)
    decision: Literal["approve", "reject", "skip"] = Field(
        ..., description="Student's response to the proposed change")


class PPTResetThemeRequest(BaseModel):
    """Re-run theme selection and re-apply it to an existing session's deck."""
    session_id: str = Field(..., min_length=32, max_length=64,
                            description="session_id returned by /ppt/session/start")


# ── Avatar Teaching Models ────────────────────────────────────────────────────


class AvatarStartRequest(BaseModel):
    """Start an avatar teaching session."""
    candidate_id: str
    candidate_name: str
    board: str
    class_number: str
    subject: str
    unit_number: int
    unit_name: str = ""
    section_title: str
    segments: Optional[List[dict]] = None  # Segments provided directly in request body
    # Term-split state books only; omit for CBSE/NCERT.
    term: Optional[str] = None


class AvatarRaiseHandRequest(BaseModel):
    """Student raises hand or responds to flashcard offer."""
    session_id: str
    student_doubt: Optional[str] = None
    student_response: Optional[str] = None


class FlashcardItem(BaseModel):
    """Single flashcard request item."""
    flashcard_id: str
    flashcard_type: str
    segment_id: str


class AvatarGenerateFlashcardRequest(BaseModel):
    """Generate flashcards (MCQ and/or informative) in a single batch."""
    session_id: str
    flash_cards: List[FlashcardItem]


class AvatarResumeRequest(BaseModel):
    """Resume avatar from where it paused."""
    session_id: str


class AvatarEndRequest(BaseModel):
    """End the avatar teaching session."""
    session_id: str


# ── Avatar Teaching Endpoints ─────────────────────────────────────────────────


@app.post("/avatar/start")
def avatar_start(request: AvatarStartRequest):
    """
    Start an avatar teaching session for a specific section.

    Segments can be provided directly in the request body via the `segments` field.
    If `segments` is provided, local enrichment data is NOT fetched — the session is
    built entirely from the request body segments.

    Returns session_id, all segments, and an empty session history.
    """
    try:
        from avatar_engine import get_avatar_engine
    except ImportError:
        raise HTTPException(500, "Avatar engine module not available. Ensure avatar_engine.py is present.")

    if request.segments is not None and len(request.segments) == 0:
        raise HTTPException(400, "'segments' list cannot be empty when provided.")

    engine = get_avatar_engine()
    result = engine.start_session(
        candidate_id=request.candidate_id,
        candidate_name=request.candidate_name,
        board=request.board,
        class_number=request.class_number,
        subject=request.subject,
        unit_number=request.unit_number,
        unit_name=request.unit_name,
        section_title=request.section_title,
        segments=request.segments,
        term=request.term,
    )

    if result.get("error"):
        raise HTTPException(404, result["error"])

    return {"success": True, **result}


@app.get("/avatar/enrichment")
def avatar_get_enrichment(
    board: str = Query(..., description="Board name"),
    subject: str = Query(..., description="Subject name"),
    unit_number: int = Query(..., description="Unit number"),
    section_title: str = Query(..., description="Section title"),
    class_number: Optional[str] = Query(None, description="Class number"),
):
    """
    Pre-fetch enrichment data for a section (no session created).

    Returns the avatar explanation segments, FAQs, practice questions,
    and doubt context without starting a teaching session.
    """
    try:
        from avatar_engine import _load_section_enrichment
    except ImportError:
        raise HTTPException(500, "Avatar engine module not available.")

    data = _load_section_enrichment(
        board=board, class_number=class_number or "",
        subject=subject, unit_number=unit_number,
        section_title=section_title,
    )

    if not data:
        raise HTTPException(404, f"Enrichment data not found for section '{section_title}' in unit {unit_number}")

    return {
        "success": True,
        "subject": subject,
        "unit_number": unit_number,
        "unit_title": data.get("unit_title", ""),
        "section_title": data.get("section_title", ""),
        "enrichment": data.get("enrichment", {}),
    }


@app.post("/avatar/raise-hand")
def avatar_raise_hand(request: AvatarRaiseHandRequest):
    """
    Student raises hand during avatar teaching or responds to a flashcard offer.
    """
    try:
        from avatar_engine import get_avatar_engine
    except ImportError:
        raise HTTPException(500, "Avatar engine module not available.")

    engine = get_avatar_engine()
    
    if request.student_response:
        return engine.respond_to_flashcard_offer(
            session_id=request.session_id,
            student_response=request.student_response
        )
    elif request.student_doubt:
        return engine.raise_hand(
            session_id=request.session_id,
            student_doubt=request.student_doubt
        )
    else:
        raise HTTPException(400, "Must provide either student_doubt or student_response")


@app.post("/avatar/flashcard/generate")
def avatar_flashcard_generate(request: AvatarGenerateFlashcardRequest):
    """
    Generate flashcards (MCQ and/or informative) in a single batch.
    Accepts a list of flash_cards, each with flashcard_id, flashcard_type, and segment_id.
    """
    try:
        from avatar_engine import get_avatar_engine
    except ImportError:
        raise HTTPException(500, "Avatar engine module not available.")

    engine = get_avatar_engine()
    results = []

    for fc in request.flash_cards:
        if fc.flashcard_type == "informative":
            result = engine.generate_flashcard_informative(
                session_id=request.session_id,
                flashcard_id=fc.flashcard_id,
                flashcard_type=fc.flashcard_type,
                segment_id=fc.segment_id
            )
        else:
            result = engine.generate_flashcard_mcq(
                session_id=request.session_id,
                flashcard_id=fc.flashcard_id,
                flashcard_type=fc.flashcard_type,
                segment_id=fc.segment_id
            )
        if result.get("error"):
            status = 404 if "not found" in result["error"].lower() else 400
            raise HTTPException(status, result["error"])
        results.append(result)

    return {"success": True, "flash_cards": results}


@app.post("/avatar/resume")
def avatar_resume(request: AvatarResumeRequest):
    """
    Resume avatar from where it paused after doubt is cleared.

    Marks the latest doubt as resolved and returns the remaining
    segments from the pause point onwards.
    """
    try:
        from avatar_engine import get_avatar_engine
    except ImportError:
        raise HTTPException(500, "Avatar engine module not available.")

    engine = get_avatar_engine()
    result = engine.resume_session(session_id=request.session_id)

    if result.get("error"):
        status = 404 if "not found" in result["error"].lower() else 400
        raise HTTPException(status, result["error"])

    return {"success": True, **result}


@app.get("/avatar/session/{session_id}")
def avatar_get_session(session_id: str):
    """Get full avatar session details including temp history."""
    try:
        from avatar_engine import get_avatar_engine
    except ImportError:
        raise HTTPException(500, "Avatar engine module not available.")

    engine = get_avatar_engine()
    session = engine.get_session(session_id)
    if not session:
        raise HTTPException(404, f"Avatar session not found: {session_id}")

    return {"success": True, **session}


@app.get("/avatar/history/{candidate_id}")
def avatar_history(
    candidate_id: str,
    subject: Optional[str] = Query(None, description="Filter by subject"),
    unit_number: Optional[int] = Query(None, description="Filter by unit"),
):
    """List all avatar teaching sessions for a student."""
    try:
        from avatar_engine import get_avatar_engine
    except ImportError:
        raise HTTPException(500, "Avatar engine module not available.")

    engine = get_avatar_engine()
    sessions = engine.get_history(candidate_id, subject, unit_number)

    return {"success": True, "candidate_id": candidate_id, "sessions": sessions, "count": len(sessions)}


@app.post("/avatar/end")
def avatar_end(request: AvatarEndRequest):
    """
    End the avatar teaching session.

    Saves the session summary to student performance and returns
    completion stats (segments completed, doubts raised, flashcards generated).
    """
    try:
        from avatar_engine import get_avatar_engine
    except ImportError:
        raise HTTPException(500, "Avatar engine module not available.")

    engine = get_avatar_engine()
    result = engine.end_session(session_id=request.session_id)

    if result.get("error"):
        status = 404 if "not found" in result["error"].lower() else 400
        raise HTTPException(status, result["error"])

    return {"success": True, **result}


# ── 1-on-1 AI Debate Endpoints ───────────────────────────────────────────────


@app.post("/debate/start")
def debate_start(request: DebateStartRequest):
    """
    Start a 1-on-1 AI Debate session.

    AI greets the student, presents a debate topic from RAG + question bank,
    and invites the student to present their opening argument.

    - Topics are recommended based on previous year question frequency
    - If student scored ≤50 on a topic, AI suggests revisiting it
    """
    try:
        from debate_engine import get_debate_engine
    except ImportError:
        raise HTTPException(500, "Debate engine module not available.")

    engine = get_debate_engine()
    result = engine.start_debate(
        candidate_id=request.candidate_id,
        candidate_name=request.candidate_name,
        subject=request.subject,
        unit_number=request.unit_number,
        board=request.board,
        class_number=request.class_number,
        unit_name=request.unit_name,
        topic=request.topic,
        student_stance=request.student_stance,
        term=request.term,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return {"success": True, **result}


@app.post("/debate/respond")
def debate_respond(request: DebateRespondRequest):
    """
    Student responds in the debate. AI generates a counter-argument.

    - Content safety: 18+ content → immediate session termination, score = 0
    - After 10+ turns, student can end the session
    - AI uses Socratic questioning to challenge the student
    """
    try:
        from debate_engine import get_debate_engine
    except ImportError:
        raise HTTPException(500, "Debate engine module not available.")

    engine = get_debate_engine()
    result = engine.respond_to_debate(
        session_id=request.session_id,
        student_message=request.message,
    )

    if result.get("error"):
        status = 400 if result.get("session_ended") else 404
        raise HTTPException(status, result["error"])

    return result


@app.post("/debate/end")
def debate_end(request: DebateEndRequest):
    """
    End a 1-on-1 debate session and get scored results.

    Requires minimum 10 turns. Scores across:
    - Reasoning (0-25)
    - Textbook Knowledge (0-25)
    - Argumentation (0-25)
    - Communication (0-25)
    """
    try:
        from debate_engine import get_debate_engine
    except ImportError:
        raise HTTPException(500, "Debate engine module not available.")

    engine = get_debate_engine()
    result = engine.end_debate(session_id=request.session_id)

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.get("/debate/session/{session_id}")
def debate_get_session(session_id: str):
    """Get full debate session details."""
    try:
        from debate_engine import get_debate_engine
    except ImportError:
        raise HTTPException(500, "Debate engine module not available.")

    engine = get_debate_engine()
    session = engine.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    # Remove rag_context from response to keep it smaller
    result = {k: v for k, v in session.items() if k != "rag_context"}
    return {"success": True, **result}


@app.get("/debate/history/{candidate_id}")
def debate_history(
    candidate_id: str,
    subject: Optional[str] = Query(None),
):
    """List all debate sessions for a student."""
    try:
        from debate_engine import get_debate_engine
    except ImportError:
        raise HTTPException(500, "Debate engine module not available.")

    engine = get_debate_engine()
    history = engine.get_debate_history(candidate_id, subject)

    return {"success": True, "history": history, "count": len(history)}


@app.get("/debate/report/{session_id}")
def debate_report_download(session_id: str):
    """Download the PDF report for a debate session."""
    try:
        from debate_engine import get_debate_engine
        from report_generator import get_report_generator
    except ImportError:
        raise HTTPException(500, "Required modules not available.")

    engine = get_debate_engine()
    session = engine.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session.get("status") != "ended":
        raise HTTPException(400, "Session must be ended before downloading report")

    report_gen = get_report_generator()
    try:
        filepath = report_gen.generate_debate_report(session)
        return FileResponse(
            filepath,
            media_type="application/pdf",
            filename=filepath.name,
        )
    except Exception as e:
        raise HTTPException(500, f"Report generation failed: {str(e)}")


@app.get("/debate/recommendations/{session_id}")
def debate_recommendations(session_id: str):
    """
    Get post-debate recommendations for a completed session.

    Returns retry suggestions (if score < 50), next topic suggestions,
    and history-based suggestions (if all unit topics are completed).

    Flow:
    - Score < 50 on attempt 1-2 → retry suggestion with context
    - Attempt 3+ → no retry, suggests next topic
    - All topics completed → history-based topic suggestions
    """
    try:
        from debate_engine import get_debate_engine
    except ImportError:
        raise HTTPException(500, "Debate engine module not available.")

    engine = get_debate_engine()
    session = engine.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session.get("status") != "ended":
        raise HTTPException(400, "Session must be ended to get recommendations")
    if not session.get("scores"):
        raise HTTPException(400, "Session has no scores")

    recommendations = engine.get_post_debate_recommendations(
        session_id=session_id,
        candidate_id=session["candidate_id"],
        subject=session["subject"],
        unit_number=session["unit_number"],
        topic=session["topic"],
        score=session["scores"].get("total_score", 0),
    )

    return {"success": True, **recommendations}


# ── Multi-User Debate Endpoints ──────────────────────────────────────────────



@app.post("/debate/room/create")
def multi_debate_create(request: MultiDebateCreateRequest):
    """
    Create a multi-student debate session.

    AI selects a topic from RAG + question bank. Share the session_id with students to join.
    The user creating the session is automatically joined.
    """
    try:
        from multi_debate_engine import get_multi_debate_engine
    except ImportError:
        raise HTTPException(500, "Multi debate engine module not available.")

    engine = get_multi_debate_engine()
    result = engine.create_debate_room(
        subject=request.subject,
        unit_number=request.unit_number,
        board=request.board,
        topic=request.topic,
        class_number=request.class_number,
        unit_name=request.unit_name,
        max_participants=request.max_participants,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    # Automatically join the host
    session_id = result.get("session_id")
    join_result = engine.join_debate_room(
        room_id=session_id,
        candidate_id=request.candidate_id,
        candidate_name=request.candidate_name
    )

    if join_result.get("error"):
        raise HTTPException(400, f"Session created but host failed to join: {join_result['error']}")

    return {"success": True, **result, "participants": join_result.get("participants", [])}


@app.post("/debate/room/join")
def multi_debate_join(request: MultiDebateJoinRequest):
    """Student joins a debate session."""
    try:
        from multi_debate_engine import get_multi_debate_engine
    except ImportError:
        raise HTTPException(500, "Multi debate engine module not available.")

    engine = get_multi_debate_engine()
    result = engine.join_debate_room(
        room_id=request.session_id,
        candidate_id=request.candidate_id,
        candidate_name=request.candidate_name,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.post("/debate/room/start")
def multi_debate_start(request: MultiDebateEndRequest):
    """
    Start the debate in a session. AI presents the opening topic.

    Requires at least 2 participants.
    """
    try:
        from multi_debate_engine import get_multi_debate_engine
    except ImportError:
        raise HTTPException(500, "Multi debate engine module not available.")

    engine = get_multi_debate_engine()
    result = engine.start_room_debate(room_id=request.session_id)

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.post("/debate/room/respond")
def multi_debate_respond(request: MultiDebateRespondRequest):
    """
    Student submits an argument in the multi-user debate.

    - Off-topic: 1st offense → warning, subsequent → score penalty
    - 18+ content: immediate removal from session
    """
    try:
        from multi_debate_engine import get_multi_debate_engine
    except ImportError:
        raise HTTPException(500, "Multi debate engine module not available.")

    engine = get_multi_debate_engine()
    result = engine.submit_argument(
        room_id=request.session_id,
        candidate_id=request.candidate_id,
        message=request.message,
    )

    if result.get("error"):
        status = 403 if result.get("removed") else 400
        raise HTTPException(status, result["error"])

    return result


@app.post("/debate/room/end")
def multi_debate_end(request: MultiDebateEndRequest):
    """
    End the multi-user debate and score all participants.

    Generates individual scores and report data for each student.
    """
    try:
        from multi_debate_engine import get_multi_debate_engine
    except ImportError:
        raise HTTPException(500, "Multi debate engine module not available.")

    engine = get_multi_debate_engine()
    result = engine.end_room_debate(room_id=request.session_id)

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.post("/debate/room/ai-student")
def multi_debate_ai_student(request: MultiDebateAIStudentRequest):
    """
    Trigger AI student response in a multi-user debate.

    When a session has an odd number of participants, an AI student
    joins the smaller team. This endpoint triggers the AI student
    to generate responses. The AI reads the full conversation to
    understand the context, unit, and section being discussed.

    - turns: number of responses to generate (default 4)
    - Only works for sessions with odd participants
    """
    try:
        from multi_debate_engine import get_multi_debate_engine
    except ImportError:
        raise HTTPException(500, "Multi debate engine module not available.")

    engine = get_multi_debate_engine()
    result = engine.trigger_ai_student_response(
        room_id=request.session_id,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.get("/debate/room/{room_id}")
def multi_debate_get_room(room_id: str):
    """Get session status and messages."""
    try:
        from multi_debate_engine import get_multi_debate_engine
    except ImportError:
        raise HTTPException(500, "Multi debate engine module not available.")

    engine = get_multi_debate_engine()
    room = engine.get_room(room_id)
    if not room:
        raise HTTPException(404, "Session not found")

    return {"success": True, **room}


@app.get("/debate/room/report/{room_id}/{candidate_id}")
def multi_debate_report_download(room_id: str, candidate_id: str):
    """Download individual PDF report for a student in a multi-user debate."""
    try:
        from multi_debate_engine import get_multi_debate_engine
        from report_generator import get_report_generator
    except ImportError:
        raise HTTPException(500, "Required modules not available.")

    engine = get_multi_debate_engine()
    room = engine._load_room(room_id)
    if not room:
        raise HTTPException(404, "Session not found")
    if room.get("status") != "ended":
        raise HTTPException(400, "Debate must be ended before downloading report")

    report_gen = get_report_generator()
    try:
        filepath = report_gen.generate_multi_debate_report(room, candidate_id)
        return FileResponse(
            filepath,
            media_type="application/pdf",
            filename=filepath.name,
        )
    except Exception as e:
        raise HTTPException(500, f"Report generation failed: {str(e)}")


# ── AI Seminar Endpoints ─────────────────────────────────────────────────────



@app.post("/seminar/start")
async def seminar_start(
    candidate_id: str = Form(...),
    candidate_name: str = Form(...),
    subject: str = Form(...),
    unit_number: int = Form(...),
    board: str = Form(...),
    class_number: str = Form(...),
    unit_name: str = Form(""),
    topic: str = Form(...),
    session_mode: str = Form("main"),
    term: Optional[str] = Form(None, description="Term for term-split state books: '1', '2', '3'. Omit for CBSE/NCERT."),
    file: Optional[UploadFile] = File(None),
):
    """
    Start an AI Seminar session.

    session_mode:
    - "main" (default): Real exam — AI examines, no guidance. Feedback in /seminar/end.
    - "demo": Practice with AI hints — /seminar/respond returns short AI hints.
    - "practice": Interactive seminar preparation — AI teaches how to prepare and deliver.
      Creates a temp session file in practice_session/ that is deleted on end.

    file (optional): PDF or PPTX file uploaded by the student.
    If provided (main/demo mode only), the session will be based on this file's content
    instead of RAG. A comparison analysis between RAG and uploaded content is included.
    """
    try:
        from seminar_engine import get_seminar_engine
    except ImportError:
        raise HTTPException(500, "Seminar engine module not available.")

    # ── Extract uploaded file content if provided ─────────────────────────
    uploaded_content = None
    if file and file.filename and session_mode in ("main", "demo"):
        fname_lower = file.filename.lower()
        if not (fname_lower.endswith(".pdf") or fname_lower.endswith(".pptx") or fname_lower.endswith(".ppt")):
            raise HTTPException(400, "Only PDF and PPTX files are supported for seminar material upload")

        try:
            file_bytes = await file.read()
            from seminar_engine import extract_uploaded_file_content
            uploaded_content = extract_uploaded_file_content(file.filename, file_bytes)
            if not uploaded_content or len(uploaded_content.strip()) < 50:
                logger.warning(f"Uploaded file {file.filename} has insufficient content — falling back to RAG")
                uploaded_content = None
        except ImportError as ie:
            logger.warning(f"File extraction dependency missing: {ie} — falling back to RAG")
            uploaded_content = None
        except Exception as e:
            logger.warning(f"Failed to extract content from {file.filename}: {e} — falling back to RAG")
            uploaded_content = None

    # ── Enforce mandatory file upload for main/demo sessions ─────────────
    if session_mode in ("main", "demo") and not uploaded_content:
        raise HTTPException(
            400,
            "PDF or PPT file upload is mandatory for demo and main seminar sessions. "
            "Please upload your presentation material (PDF or PPTX) to start the session."
        )

    engine = get_seminar_engine()
    result = engine.start_seminar(
        candidate_id=candidate_id,
        candidate_name=candidate_name,
        subject=subject,
        unit_number=unit_number,
        board=board,
        class_number=class_number,
        unit_name=unit_name,
        topic=topic,
        session_mode=session_mode,
        uploaded_content=uploaded_content,
        term=term,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return {"success": True, **result}


@app.post("/seminar/respond")
def seminar_respond(request: SeminarRespondRequest):
    """
    Student responds in the seminar.

    Behavior depends on session_mode:
    - "main": Records student message only — no AI response returned.
    - "demo": Records + returns a short AI hint (1-2 sentence nudge).
    - "practice": Records + returns a full interactive AI coaching response.
    """
    try:
        from seminar_engine import get_seminar_engine
    except ImportError:
        raise HTTPException(500, "Seminar engine module not available.")

    engine = get_seminar_engine()
    result = engine.seminar_respond(
        session_id=request.session_id,
        student_message=request.message,
        silence_seconds=request.silence_seconds,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result

@app.post("/seminar/guide")
def seminar_guide(request: SeminarGuideRequest):
    """
    Get AI guidance during a DEMO/PRACTICE seminar session.

    The AI analyzes the student's presentation so far (from conversation history)
    and provides structured coaching:
    - What they covered well
    - What's missing (based on RAG/textbook context)
    - What to say next
    - Presentation tips

    Only available for sessions started with session_mode="demo".
    Returns 400 if used on a main session.
    """
    try:
        from seminar_engine import get_seminar_engine
    except ImportError:
        raise HTTPException(500, "Seminar engine module not available.")

    engine = get_seminar_engine()
    result = engine.guide_student(session_id=request.session_id)

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


# ── PPT Preparation Co-pilot ──────────────────────────────────────────────────
# One compiled LangGraph agent per editing tool (Google Slides now; PowerPoint /
# Canva later), fronted by ppt_router.pick_agent(). Each agent owns its own
# MemorySaver checkpoint store, so the two-call approval handshake (/ppt/edit pauses
# at interrupt(), /ppt/decide resumes) shares state via thread_id = session_id.
# See SEMINAR_PPT_AUTOMATION_PLAN.md.

def _ppt_agent(deck_ref: str):
    try:
        from ppt.ppt_router import pick_agent
    except ImportError as e:
        raise HTTPException(500, f"PPT agent modules not available: {e}")
    try:
        return pick_agent(deck_ref)
    except ValueError as e:
        raise HTTPException(400, str(e))


def _ppt_result_payload(result: dict) -> dict:
    """Shape the final graph state into an API response."""
    return {
        "status": result.get("status", "done"),
        "ai_feedback": result.get("ai_feedback", ""),
        "suggestions": result.get("suggestions", []),   # content points to show the student
        "severity": result.get("severity"),
        "mode": result.get("mode"),
        "skill_delta": result.get("skill_delta", {}),
        "applied_ops": result.get("applied_ops", []),   # ops the agent actually applied
        "theme_applied": result.get("theme_applied", False),
        # The deck's agent-chosen design (accent/body/title colors, font, sizes). The frontend
        # should style its own preview/coach panel with THIS so it matches the real deck theme
        # instead of using hardcoded colors.
        "theme_spec": result.get("theme_spec"),
        # Upgrade #4: speaker notes generated for the slide
        "speaker_notes": result.get("speaker_notes"),
        # Upgrade #6: verbal image suggestion (no image inserted, frontend displays as tip)
        "image_suggestion": result.get("image_suggestion"),
        # Hybrid RAG: which source fed the answer ("rag" | "web" | "hybrid").
        "source_used": result.get("source_used"),
        # Web image search results — shown in the CHAT only, never inserted into the deck.
        "images": result.get("image_results", []),
    }


def _ppt_require_session(session_id: str) -> dict:
    from ppt.ppt_session import get_session
    session = get_session(session_id)
    if session is None:
        raise HTTPException(404, "Unknown session_id — call /ppt/session/start first")
    return session


def _ppt_needs_connection_response(student_id: str) -> dict:
    """Body telling the frontend the student must connect Google via Scalekit first."""
    from ppt.ppt_scalekit import get_authorization_link
    return {
        "status": "needs_connection",
        "authorization_url": get_authorization_link(student_id),
        "message": "Connect your Google account to let the co-pilot build your slides.",
    }


def _ppt_auth_provider() -> str:
    """
    Which per-student auth backend to use:
      - "oauth"        : single shared OAuth account (testing; PPT_FORCE_OAUTH).
      - "google_oauth" : per-student Google OAuth we run ourselves (we hold the token).
      - "scalekit"     : per-student via Scalekit connected accounts.
    Set explicitly with PPT_AUTH_PROVIDER; otherwise inferred.
    """
    if os.environ.get("PPT_FORCE_OAUTH", "").lower() in ("1", "true", "yes"):
        return "oauth"
    p = os.environ.get("PPT_AUTH_PROVIDER", "").strip().lower()
    if p in ("oauth", "google_oauth", "scalekit"):
        return p
    from ppt.ppt_scalekit import is_configured as sk_configured
    return "scalekit" if sk_configured() else "oauth"


def _ppt_auth_context(student_id: str):
    """
    Resolve the student's slides auth → (context_manager, needs_connection_body).
    If a token is needed, returns a mcp_slides_client.access_token(...) context; if the student
    isn't connected, returns (None, needs_connection body) for the caller to return.
    """
    from contextlib import nullcontext
    import mcp_slides_client

    provider = _ppt_auth_provider()

    if provider == "oauth":
        return nullcontext(), None   # shared backend OAuth account

    if provider == "google_oauth":
        from ppt import ppt_google_oauth as g
        token = g.get_access_token(student_id)
        if not token:
            return None, {
                "status": "needs_connection",
                "authorization_url": g.auth_url(student_id),
                "message": "Connect your Google account to let the co-pilot build your slides.",
            }
        return mcp_slides_client.access_token(token), None

    # scalekit
    from ppt.ppt_scalekit import resolve_auth
    kind, token = resolve_auth(student_id)
    if kind == "needs_connection":
        return None, _ppt_needs_connection_response(student_id)
    if kind == "token":
        return mcp_slides_client.access_token(token), None
    return nullcontext(), None   # "global"


@app.post("/ppt/connect")
def ppt_connect(request: PPTConnectRequest):
    """
    Begin (or check) the student's Google connection via Scalekit.

    Returns {"connected": true} if the student already authorized Google, otherwise
    {"connected": false, "authorization_url": ...} — the student clicks the URL to connect.
    """
    provider = _ppt_auth_provider()

    if provider == "oauth":
        return {"connected": True,
                "note": "Using the shared backend OAuth account (PPT_FORCE_OAUTH)."}

    if provider == "google_oauth":
        from ppt import ppt_google_oauth as g
        if not g.is_configured():
            raise HTTPException(500, "OAuth client not configured (oauth_client.json missing).")
        if g.is_connected(request.student_id):
            return {"connected": True}
        return {"connected": False, "authorization_url": g.auth_url(request.student_id)}

    # scalekit
    from ppt import ppt_scalekit as sk
    if not sk.is_configured():
        raise HTTPException(500, "Scalekit is not configured (SCALEKIT_* env vars missing).")
    kind, _ = sk.resolve_auth(request.student_id)
    if kind == "token":
        return {"connected": True}

    url = sk.get_authorization_link(request.student_id)
    dbg = sk.connection_debug(request.student_id)
    resp = {"connected": False, "authorization_url": url, "debug": dbg}
    # Distinguish "not linked" from "linked but Scalekit won't return the token".
    if dbg.get("found") and dbg.get("status") == "ACTIVE" and not dbg.get("token_found"):
        resp["account_status"] = "ACTIVE"
        resp["token_available"] = False
        resp["reason"] = (
            "The Google account is CONNECTED in Scalekit (status ACTIVE), but Scalekit is not "
            "returning the OAuth access token to the backend — token export is disabled for the "
            f"'{sk.CONNECTION_NAME}' connection. Re-connecting won't help; enable raw token access "
            "on that Scalekit connection (or ask Scalekit support how to retrieve the access_token)."
        )
    return resp


@app.get("/ppt/auth/callback")
def ppt_auth_callback(code: Optional[str] = Query(None),
                      state: Optional[str] = Query(None),
                      error: Optional[str] = Query(None)):
    """
    Google OAuth redirect target (provider = google_oauth). Google sends the student here after
    they authorize; we exchange `code` for tokens and store them for `state` (the student_id).

    Do NOT open this URL directly — start from POST /ppt/connect and open the authorization_url
    it returns; Google appends `code`/`state` when it redirects here.
    """
    from fastapi.responses import HTMLResponse

    def page(title, msg, status=200):
        return HTMLResponse(
            "<html><body style='font-family:sans-serif;text-align:center;margin-top:60px'>"
            f"<h2>{title}</h2><p>{msg}</p></body></html>", status_code=status)

    if error:
        return page("❌ Authorization was cancelled", f"Google returned: {error}", 400)
    if not code or not state:
        return page("This is the OAuth callback",
                    "Start from <code>POST /ppt/connect</code> and open the "
                    "<code>authorization_url</code> it returns — Google will redirect here "
                    "automatically with the sign-in result.", 400)

    from ppt import ppt_google_oauth as g
    try:
        g.handle_callback(code, state)
    except Exception as e:
        return page("❌ Connection failed", f"OAuth exchange error: {e}", 400)
    return page("✅ Google connected",
                "You can close this tab and return to the app to build your seminar deck.")


@app.get("/ppt/health")
def ppt_health(student_id: Optional[str] = Query(None)):
    """
    Report the co-pilot's Google auth wiring. Pass ?student_id= to check a specific student.

    Once Scalekit is toggled to expose the token, this shows `token_ready: true` /
    `student_auth: "token"` — meaning /ppt/session/start will work for that student.
    """
    import mcp_slides_client
    from ppt import ppt_scalekit as sk

    provider = _ppt_auth_provider()
    out = {
        "auth_provider": provider,                     # oauth | google_oauth | scalekit
        "scalekit_configured": sk.is_configured(),
        "scalekit_connection": sk.CONNECTION_NAME if sk.is_configured() else None,
        "fallback_credential_kind": mcp_slides_client.credential_kind(),   # oauth | service_account | None
    }
    if provider == "google_oauth":
        from ppt import ppt_google_oauth as g
        out["google_oauth_redirect_uri"] = g.REDIRECT_URI      # must match your server port + Google Cloud
        out["oauth_client_present"] = g.is_configured()
    if student_id:
        if provider == "google_oauth":
            from ppt import ppt_google_oauth as g
            out["student_connected"] = g.is_connected(student_id)
            out["token_ready"] = bool(g.get_access_token(student_id))
        elif provider == "scalekit" and sk.is_configured():
            kind, token = sk.resolve_auth(student_id)
            out["student_auth"] = kind                 # "token" once the token is exposed
            out["token_ready"] = bool(token)
            out["debug"] = sk.connection_debug(student_id)
        else:
            out["token_ready"] = True                   # shared oauth account
    return out


@app.post("/ppt/session/start")
def ppt_session_start(request: PPTSessionStartRequest):
    """
    Start a PPT co-pilot session.

    Creates a new deck (or connects to the student's existing one) in the student's Google
    account (accessed via Scalekit), returns its editable link + embeddable URL, and wires the
    deck to its tool-specific agent. If the student hasn't connected Google yet, returns
    {"status": "needs_connection", "authorization_url": ...}.
    """
    try:
        from ppt.ppt_session import start_session
    except ImportError as e:
        raise HTTPException(500, f"PPT session module not available: {e}")

    ctx, needs = _ppt_auth_context(request.student_id)
    if needs:
        return needs

    try:
        with ctx:
            session = start_session(
                student_id=request.student_id,
                board=request.board, class_number=request.class_number,
                unit=request.chapter, title=request.title, subject=request.subject,
                deck_ref=request.deck_ref, tool=request.tool, term=request.term,
            )
    except ValueError as e:
        raise HTTPException(400, str(e))

    _ppt_agent(session["deck_ref"])   # fail fast if no agent exists for this tool

    deck_mode = session.get("deck_mode", "real")
    response = {
        "session_id": session["session_id"],
        "deck_ref": session["deck_ref"],
        "edit_url": session["urls"]["edit_url"],
        "embed_url": session["urls"]["embed_url"],
        "deck_created": session["deck_created"],
        "deck_mode": deck_mode,                    # Upgrade #8: "real" | "stub"
        "theme_spec": session.get("theme_spec"),   # agent-chosen deck design
        "guidance": (
            f"Let's build your seminar deck on \"{request.title}\" "
            f"(Class {request.class_number}, {request.board}). I've set up a starting outline — "
            "keep one idea per slide, and I'll review each change and suggest fixes as you go."
        ),
    }
    # Upgrade #8: surface a notice when running in stub/preview mode
    if deck_mode == "stub":
        response["notice"] = (
            "Preview mode — connect your Google account to create a real Slides deck. "
            "Call POST /ppt/connect to link your account."
        )
    return response


@app.post("/ppt/session/end")
def ppt_session_end(request: PPTSessionEndRequest):
    """End a PPT co-pilot session and return the accumulated design-skill summary."""
    from ppt.ppt_session import end_session
    summary = end_session(request.session_id)
    if summary is None:
        raise HTTPException(404, "Unknown session_id")
    return {"status": "ended", **summary}


@app.post("/ppt/session/reset-theme")
def ppt_session_reset_theme(request: PPTResetThemeRequest):
    """
    Re-run theme selection for an existing session and apply it across the deck.

    Useful when a session was created before the theme catalog was deployed (existing
    sessions retain their original theme_spec). Re-runs llm_choose_theme() with the
    session's stored curriculum coordinates, patches the session in the DB, and calls
    apply_theme_to_deck() to update every slide immediately.

    Returns the refreshed theme_spec and the number of slides updated.
    """
    session = _ppt_require_session(request.session_id)
    if session.get("ended_at"):
        raise HTTPException(400, "Session already ended — cannot reset theme.")

    ctx, needs = _ppt_auth_context(session["student_id"])
    if needs:
        return needs

    # Re-run theme selection.
    try:
        from ppt.ppt_design import llm_choose_theme
        new_theme = llm_choose_theme(
            board=session.get("board", ""),
            class_number=session.get("class_number", ""),
            subject=session.get("subject"),
            unit_title=session.get("unit_title", session.get("title", "")),
        )
    except Exception as e:
        raise HTTPException(500, f"Theme selection failed: {e}")

    # Patch the stored session.
    try:
        from ppt.ppt_session import get_session, _save_session
        sess_data = get_session(request.session_id)
        if sess_data:
            sess_data["theme_spec"] = new_theme
            _save_session(sess_data)
    except Exception as e:
        raise HTTPException(500, f"Session save failed: {e}")

    # Apply the new theme to the real deck.
    slides_updated = 0
    deck_ref = session.get("deck_ref", "")
    if deck_ref and not deck_ref.startswith("gslides:STUB-"):
        try:
            import mcp_slides_client
            with ctx:
                slides_updated = mcp_slides_client.apply_theme_to_deck(deck_ref, new_theme)
        except Exception as e:
            # Non-fatal: theme saved but live deck update failed.
            return {
                "status": "partial",
                "theme_spec": new_theme,
                "slides_updated": 0,
                "warning": f"Theme saved but deck update failed: {e}",
            }

    return {
        "status": "ok",
        "theme_spec": new_theme,
        "slides_updated": slides_updated,
    }


def _ppt_deck_context(deck_ref: str, current_index: int):
    """Read the whole deck once and return (all_titles, other_slide_summaries).

    other_slide_summaries are compact "Title: content" strings for every slide EXCEPT the
    current one — passed to the layout designer so a restructure stays distinct and doesn't
    duplicate another slide. Returns (None, None) on any read failure (caller degrades).
    """
    try:
        import mcp_slides_client
        deck = mcp_slides_client.get_deck_content(deck_ref)
    except Exception as e:
        print(f"  [ppt] deck context read failed: {e}")
        return None, None
    from ppt.ppt_review import _readable_slide_text
    titles, others = [], []
    for i, s in enumerate(deck):
        title = (s.get("title") or "").strip()
        titles.append(title)
        if i == current_index:
            continue
        snippet = " ".join(_readable_slide_text(s).split())[:140]
        others.append(f"{title or 'Untitled'}: {snippet}" if snippet else (title or "Untitled"))
    return titles, others


def _record_applied_layout(session_id: str, slide_index: int, applied_ops) -> None:
    """If a set_layout op was applied, record its kind so other slides pick a different one."""
    for op in applied_ops or []:
        if op.get("op") == "set_layout":
            kind = (op.get("value") or {}).get("layout")
            if kind:
                from ppt.ppt_session import record_layout
                record_layout(session_id, slide_index, kind)
            break


def _ppt_agent_state(session: dict, slide_index: int,
                     slide_op: str = "review",
                     student_query: str = "",
                     web_source: str = "rag",
                     student_instruction: str = "",
                     all_slide_titles: Optional[List[str]] = None,
                     other_slides: Optional[List[str]] = None,
                     avoid_layouts: Optional[List[str]] = None) -> dict:
    """
    Build the agent input state from the session's stored curriculum coordinates.

    slide_op            : "review" (agent decides content+theme) | "suggest" (verbal Q&A only)
    student_query       : the student's question when slide_op == "suggest"
    web_source          : "rag" | "web" | "hybrid" — from ppt_source_router.decide_source()
    student_instruction : the raw student chat message that drove this turn
    """
    return {
        "session_id": session["session_id"],
        "student_id": session["student_id"],
        "deck_ref": session["deck_ref"],
        "slide_index": slide_index,
        "slide_op": slide_op,
        "student_query": student_query,
        # hybrid RAG routing (see ppt_source_router / ppt_websearch)
        "web_source": web_source,
        "student_instruction": student_instruction,
        # curriculum coordinates → RAG filters in analyze_slide
        "board": session.get("board"),
        "class_number": session.get("class_number"),
        "subject": session.get("subject"),
        "unit": session.get("unit"),
        "unit_title": session.get("unit_title"),
        "term": session.get("term"),
        # agent-chosen deck design → apply_theme_all_slides_node
        "theme_spec": session.get("theme_spec"),
        # Upgrade #5: multi-slide context (duplicate detection, deck length warning).
        # Prefer freshly-read deck titles; fall back to whatever the session cached.
        "all_slide_titles": (all_slide_titles if all_slide_titles is not None
                             else (session.get("all_slide_titles") or [])),
        # Cross-slide distinctness: "Title: content" summaries of the other slides.
        "other_slides": other_slides or [],
        # Design variety: layout kinds already used on other slides (avoid repeating).
        "avoid_layouts": avoid_layouts or [],
        # Upgrade #7: adaptive severity — downgrade significant→minor after N rejections
        "rejection_count": session.get("rejection_count", 0),
        # Upgrade #8: deck mode for context
        "deck_mode": session.get("deck_mode", "real"),
    }


@app.post("/ppt/edit")
def ppt_edit(request: PPTEditRequest):
    """
    Agent-driven slide review and improvement.

    The agent autonomously reads the slide, plans content + theme ops via RAG + LLM,
    and acts based on severity:
      - good        → verbal feedback only, no change.
      - minor       → auto-applies the fix (font tweak, small bullet correction) and
                       enforces the uniform theme across all slides — no student input needed.
      - significant → returns {"status": "awaiting_approval", "proposed_change": {...}}
                       (a content rewrite or structural change); call /ppt/decide next.

    Students have no manual edit controls — do NOT send an `edit` field.
    """
    session = _ppt_require_session(request.session_id)
    if session.get("ended_at"):
        raise HTTPException(400, "Session already ended")

    ctx, needs = _ppt_auth_context(session["student_id"])
    if needs:
        return needs

    agent = _ppt_agent(session["deck_ref"])
    config = {"configurable": {"thread_id": request.session_id}}
    with ctx:
        result = agent.invoke(
            _ppt_agent_state(session, request.slide_index, slide_op="review"), config)

    if "__interrupt__" in result:          # paused at wait_approval (significant change)
        return {"status": "awaiting_approval",
                "proposed_change": result["__interrupt__"][0].value}

    from ppt.ppt_session import record_skill
    record_skill(request.session_id, result.get("skill_delta"))
    return _ppt_result_payload(result)


@app.post("/ppt/suggest")
def ppt_suggest(request: PPTSuggestRequest):
    """
    Main conversational endpoint for the PPT co-pilot (hybrid RAG) — the WHOLE loop
    runs through here; no separate edit/approve endpoints are needed.

    - If a change is awaiting the student's yes/no (set on a previous turn), this reply
      is read as the decision (approve / reject / skip) and the paused agent is resumed —
      the student approves the change right in the chat.
    - Otherwise the message is routed by ppt_source_router.decide_source() into:
        · "image"  : web image search — results for the CHAT (nothing touches the deck).
        · "edit"   : the agent reviews the slide; a significant change pauses and returns
                     {"status": "awaiting_approval", ...} — the NEXT chat message decides it.
        · "answer" : answer from the chosen source (RAG / web / both); suggested points to SAY.
    """
    session = _ppt_require_session(request.session_id)
    if session.get("ended_at"):
        raise HTTPException(400, "Session already ended")

    query = request.query or ""
    coords = {"unit_title": session.get("unit_title")}

    # 0) APPROVAL TURN — a change from a previous turn is waiting for the student's yes/no.
    #    Interpret this chat message as the decision and resume the paused agent in place.
    if session.get("awaiting_approval"):
        from ppt.ppt_source_router import parse_decision
        from ppt.ppt_session import clear_pending_approval, record_skill
        dec = parse_decision(query)
        if dec is None:
            # Not a clear yes/no — re-show the pending change and keep waiting.
            return {"status": "awaiting_approval", "intent": "edit",
                    "ai_feedback": "Do you want me to apply this change? Reply approve, reject, or skip.",
                    "proposed_change": session.get("pending_proposal")}

        ctx, needs = _ppt_auth_context(session["student_id"])
        if needs:
            return needs
        from langgraph.types import Command
        agent = _ppt_agent(session["deck_ref"])
        config = {"configurable": {"thread_id": request.session_id}}
        with ctx:
            result = agent.invoke(Command(resume=dec), config)
        clear_pending_approval(request.session_id)
        record_skill(request.session_id, result.get("skill_delta"))
        if dec == "approve":
            _record_applied_layout(request.session_id, request.slide_index, result.get("applied_ops"))
        if dec == "reject":
            try:
                from ppt.ppt_session import record_rejection
                record_rejection(request.session_id)
            except Exception as e:
                print(f"  [ppt_suggest] record_rejection failed: {e}")
        payload = _ppt_result_payload(result)
        payload["intent"] = "edit"
        payload["decision"] = dec
        return payload

    # 1) Route the student's message (intent + source). Never raises.
    try:
        from ppt.ppt_source_router import decide_source
        decision = decide_source(query, coords=coords)
    except Exception as e:
        print(f"  [ppt_suggest] routing failed: {e}")
        decision = {"intent": "answer", "source": "rag", "reason": "router-error"}
    intent, source = decision["intent"], decision["source"]

    # 2) IMAGE intent — return content images for the CHAT (never inserted into the deck).
    #    The query is grounded in the SLIDE'S CONTENT (title + text), not the student's vague
    #    words, so "i need an img for this slide" yields images about the slide's topic.
    if intent == "image":
        ctx, needs = _ppt_auth_context(session["student_id"])
        if needs:
            return needs

        # Read the current slide so the image query reflects what's actually on it.
        slide_title, slide_text = "", ""
        try:
            with ctx:
                import mcp_slides_client
                snap = mcp_slides_client.get_slide_content(session["deck_ref"], request.slide_index)
            slide_title = snap.get("title", "") or ""
            from ppt.ppt_review import _readable_slide_text
            slide_text = _readable_slide_text(snap)
        except Exception as e:
            print(f"  [ppt_suggest] slide read for image query failed: {e}")

        unit_title = session.get("unit_title") or ""
        # Prefer an LLM query grounded in the slide content; fall back to the heuristic.
        llm_q = ""
        try:
            from ppt.ppt_review import llm_image_query
            llm_q = llm_image_query(query, slide_title, slide_text, unit_title)
        except Exception as e:
            print(f"  [ppt_suggest] llm_image_query failed: {e}")

        # Try progressively simpler queries so a flaky/empty result still yields images:
        # the LLM query → a heuristic subject → the chapter topic. First non-empty wins.
        images, img_query = [], (llm_q or "")
        try:
            from ppt.ppt_websearch import image_search, build_image_query, is_enabled
            if is_enabled():
                candidates = [llm_q, build_image_query(query, slide_title or unit_title),
                              slide_title, unit_title]
                seen = set()
                for cand in candidates:
                    cand = (cand or "").strip()
                    if not cand or cand.lower() in seen:
                        continue
                    seen.add(cand.lower())
                    images = image_search(cand)
                    if images:
                        img_query = cand
                        break
        except Exception as e:
            print(f"  [ppt_suggest] image search failed: {e}")
        feedback = (f"Here are some images for “{img_query}” — pick any to use in your slide."
                    if images else "I couldn't find images for that right now.")
        return {"status": "images", "intent": "image", "source": "web",
                "ai_feedback": feedback, "image_query": img_query,
                "images": images, "suggestions": []}

    # 2b) GUIDE intent — the student wants to be TAUGHT how to design this slide (options,
    #     step-by-step, how to match the deck theme). We don't edit the deck; we coach.
    if intent == "guide":
        ctx, needs = _ppt_auth_context(session["student_id"])
        if needs:
            return needs
        slide_title, slide_text = "", ""
        try:
            with ctx:
                import mcp_slides_client
                snap = mcp_slides_client.get_slide_content(session["deck_ref"], request.slide_index)
            slide_title = snap.get("title", "") or ""
            from ppt.ppt_review import _readable_slide_text
            slide_text = _readable_slide_text(snap)
        except Exception as e:
            print(f"  [ppt_suggest] slide read for guidance failed: {e}")
        guide = {"guidance": "(Design guidance unavailable right now.)", "options": [], "theme_guidance": ""}
        try:
            from ppt.ppt_review import llm_design_guidance
            guide = llm_design_guidance(
                slide_title, slide_text, session.get("unit_title") or "",
                session.get("theme_spec") or {}, query)
        except Exception as e:
            print(f"  [ppt_suggest] design guidance failed: {e}")
        return {"status": "guidance", "intent": "guide",
                "ai_feedback": guide["guidance"],
                "options": guide.get("options", []),
                "theme_guidance": guide.get("theme_guidance", ""),
                "theme_spec": session.get("theme_spec"),
                "suggestions": []}

    # 3) EDIT / ANSWER intents both run the agent. Edit uses the review + HITL path;
    #    answer uses the verbal-suggestion path. Both need the student's Google auth.
    ctx, needs = _ppt_auth_context(session["student_id"])
    if needs:
        return needs

    slide_op = "review" if intent == "edit" else "suggest"
    # For EDIT, student_query must stay empty — a truthy student_query forces analyze_slide
    # into CONTENT mode (verbal suggestions) and skips the design → propose → approval path.
    # The raw message still rides along as student_instruction. ANSWER keeps its query.
    student_query = "" if intent == "edit" else query
    agent = _ppt_agent(session["deck_ref"])
    config = {"configurable": {"thread_id": request.session_id}}
    avoid_layouts = None
    with ctx:
        # For an edit, read the whole deck so the redesign stays distinct from other slides
        # (avoids two slides ending up with identical content), and gather the layouts already
        # used elsewhere so this slide gets a DIFFERENT design.
        all_titles, other_slides = (None, None)
        if intent == "edit":
            all_titles, other_slides = _ppt_deck_context(session["deck_ref"], request.slide_index)
            from ppt.ppt_session import layouts_used_elsewhere
            avoid_layouts = layouts_used_elsewhere(request.session_id, request.slide_index)
        result = agent.invoke(
            _ppt_agent_state(
                session, request.slide_index,
                slide_op=slide_op,
                student_query=student_query,
                web_source=source,
                student_instruction=query,
                all_slide_titles=all_titles,
                other_slides=other_slides,
                avoid_layouts=avoid_layouts,
            ), config)

    # Edit path may pause for approval (significant change). Remember the pending change
    # so the student's NEXT chat message (approve/reject/skip) resolves it — no separate
    # endpoint. The prompt tells the student how to respond in the same chat.
    if "__interrupt__" in result:
        proposal = result["__interrupt__"][0].value
        from ppt.ppt_session import set_pending_approval
        set_pending_approval(request.session_id, proposal)
        return {"status": "awaiting_approval", "intent": "edit",
                "ai_feedback": "I'd like to make this change — reply approve, reject, or skip.",
                "proposed_change": proposal}

    from ppt.ppt_session import record_skill
    record_skill(request.session_id, result.get("skill_delta"))
    _record_applied_layout(request.session_id, request.slide_index, result.get("applied_ops"))
    payload = _ppt_result_payload(result)
    payload["intent"] = intent
    return payload


@app.post("/ppt/decide")
def ppt_decide(request: PPTDecideRequest):
    """
    Resume a paused PPT agent run with the student's decision (approve / reject / skip).

    The router resumes the session's agent — the checkpoint lives inside that agent's
    MemorySaver, keyed by session_id.
    """
    if request.decision not in ("approve", "reject", "skip"):
        raise HTTPException(400, "decision must be one of: approve, reject, skip")

    from langgraph.types import Command
    from ppt.ppt_session import record_skill

    session = _ppt_require_session(request.session_id)
    ctx, needs = _ppt_auth_context(session["student_id"])
    if needs:
        return needs

    agent = _ppt_agent(session["deck_ref"])
    config = {"configurable": {"thread_id": request.session_id}}
    with ctx:
        result = agent.invoke(Command(resume=request.decision), config)

    record_skill(request.session_id, result.get("skill_delta"))
    # Upgrade #7: track rejections so adaptive severity can kick in on future edits
    if request.decision == "reject":
        try:
            from ppt.ppt_session import record_rejection
            record_rejection(request.session_id)
        except Exception as e:
            print(f"  [ppt_decide] record_rejection failed: {e}")
    return _ppt_result_payload(result)


@app.get("/sessions/attended-topics/{candidate_id}")
def get_attended_topics(
    candidate_id: str,
    subject: Optional[str] = Query(None),
    unit_number: Optional[int] = Query(None),
):
    """
    Get all attended topics for a student across both seminar and debate sessions.

    Query params:
    - subject: Filter by subject (optional)
    - unit_number: Filter by unit number (optional)
    """
    try:
        from seminar_engine import get_seminar_engine
        from debate_engine import get_debate_engine
    except ImportError:
        raise HTTPException(500, "Session engines not available.")

    seminar_engine = get_seminar_engine()
    debate_engine = get_debate_engine()

    seminar_topics = seminar_engine.get_attended_topics(candidate_id, subject, unit_number)
    debate_topics = debate_engine.get_attended_topics(candidate_id, subject, unit_number)

    return {
        "success": True,
        "candidate_id": candidate_id,
        "seminar_topics": seminar_topics,
        "debate_topics": debate_topics,
        "total_seminar": len(seminar_topics),
        "total_debate": len(debate_topics),
    }


@app.post("/seminar/end")
def seminar_end(request: SeminarEndRequest):
    """
    End a seminar session.

    Behavior depends on session_mode:
    - "main": Scores the student + returns a response_message (AI feedback).
    - "demo": Scores the student but skips performance tracking.
    - "practice": No scoring — deletes the temp session file and confirms deletion.

    Main/Demo scoring criteria:
    - Conceptual Understanding (0-30)
    - Depth of Knowledge (0-25)
    - Presentation Flow (0-20)
    - Engagement (0-15)
    - Hints Used penalty (0-10)
    """
    try:
        from seminar_engine import get_seminar_engine
    except ImportError:
        raise HTTPException(500, "Seminar engine module not available.")

    engine = get_seminar_engine()
    result = engine.end_seminar(session_id=request.session_id)

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.get("/seminar/session/{session_id}")
def seminar_get_session(session_id: str):
    """Get seminar session details."""
    try:
        from seminar_engine import get_seminar_engine
    except ImportError:
        raise HTTPException(500, "Seminar engine module not available.")

    engine = get_seminar_engine()
    session = engine.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    return {"success": True, **session}


@app.get("/seminar/history/{candidate_id}")
def seminar_history(
    candidate_id: str,
    subject: Optional[str] = Query(None),
):
    """List all seminar sessions for a student."""
    try:
        from seminar_engine import get_seminar_engine
    except ImportError:
        raise HTTPException(500, "Seminar engine module not available.")

    engine = get_seminar_engine()
    history = engine.get_seminar_history(candidate_id, subject)

    return {"success": True, "history": history, "count": len(history)}


@app.get("/seminar/report/{session_id}")
def seminar_report_download(session_id: str):
    """Download the PDF report for a seminar session."""
    try:
        from seminar_engine import get_seminar_engine
        from report_generator import get_report_generator
    except ImportError:
        raise HTTPException(500, "Required modules not available.")

    engine = get_seminar_engine()
    session_data = engine._load_session(session_id)
    if not session_data:
        raise HTTPException(404, "Session not found")
    if session_data.get("status") != "ended":
        raise HTTPException(400, "Session must be ended before downloading report")

    report_gen = get_report_generator()
    try:
        filepath = report_gen.generate_seminar_report(session_data)
        return FileResponse(
            filepath,
            media_type="application/pdf",
            filename=filepath.name,
        )
    except Exception as e:
        raise HTTPException(500, f"Report generation failed: {str(e)}")


# ── Seminar Post-Session Chat Endpoints ──────────────────────────────────────


@app.post("/seminar/chat/start")
def seminar_chat_start(request: SeminarChatStartRequest):
    """
    Start a live session chat for an active seminar.

    For PRACTICE sessions: Returns existing session messages. Chat is unified
    with the session — use /seminar/respond for all interactions.
    No separate chat file is created.

    For MAIN/DEMO sessions: Creates a temporary chat in seminar_chat/ folder.
    The AI acts as a seminar teacher. Chat history is automatically deleted
    when the session ends via /seminar/end.
    """
    try:
        from seminar_engine import get_seminar_engine
    except ImportError:
        raise HTTPException(500, "Seminar engine module not available.")

    engine = get_seminar_engine()
    result = engine.start_seminar_chat(session_id=request.session_id)

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.post("/seminar/chat/respond")
def seminar_chat_respond(request: SeminarChatRespondRequest):
    """
    Send a message in the seminar chat.

    For PRACTICE sessions: Automatically delegates to /seminar/respond.
    Chat and session are a single unified endpoint — no separate chat storage.

    For MAIN/DEMO sessions: Uses the separate chat file. The AI responds
    as a seminar teacher — discussing the topic, providing feedback,
    explaining mistakes, and suggesting improvements.
    """
    try:
        from seminar_engine import get_seminar_engine
    except ImportError:
        raise HTTPException(500, "Seminar engine module not available.")

    engine = get_seminar_engine()
    result = engine.seminar_chat_respond(
        session_id=request.session_id,
        student_message=request.message,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


# ── English Level Test & AI Teacher Session Models ────────────────────────────


class EnglishTestStartRequest(BaseModel):
    """Request to start an English level assessment test."""
    level: str  # basic, intermediate, super_intermediate, advanced


class EnglishTestSubmitRequest(BaseModel):
    """Request to submit English test answers."""
    candidate_id: str
    candidate_name: str = ""
    level: str
    answers: List[dict]  # [{question_id, answer}]


class EnglishSpeakingStartRequest(BaseModel):
    """Request to start a speaking assessment."""
    candidate_id: str
    candidate_name: str = ""
    level: str


class EnglishSpeakingRespondRequest(BaseModel):
    """Request to respond in a speaking assessment."""
    candidate_id: str
    level: str
    message: str


class EnglishSpeakingEndRequest(BaseModel):
    """Request to end a speaking assessment and get the score."""
    candidate_id: str
    level: str


class EnglishSessionStartRequest(BaseModel):
    """Request to start an AI teacher session."""
    candidate_id: str
    candidate_name: str = ""
    level: Optional[str] = None  # auto-detect from progress if omitted


class EnglishSessionRespondRequest(BaseModel):
    """Request to send a message in a session."""
    session_id: str
    message: str


class EnglishSessionEndRequest(BaseModel):
    """Request to end a session."""
    session_id: str





# ── English Level Test Endpoints ──────────────────────────────────────────────


@app.post("/english/test/start")
def english_test_start(request: EnglishTestStartRequest):
    """
    Get English level assessment test questions (Grammar, Listening, Writing).

    Returns cached questions if fresh (< 15 days), otherwise generates new ones.
    Levels: basic, intermediate, super_intermediate, advanced.
    Speaking is assessed separately via /english/test/speaking/start.
    Test order: Grammar → Listening → Writing → Speaking (live, last).
    """
    try:
        from english_test_engine import get_english_test_engine
    except ImportError:
        raise HTTPException(500, "English test engine not available.")

    engine = get_english_test_engine()
    result = engine.get_or_generate_test(level=request.level)

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return {"success": True, **result}


@app.post("/english/test/submit")
def english_test_submit(request: EnglishTestSubmitRequest):
    """
    Submit English test answers for scoring.

    Returns category-wise scores, pass/fail status, and recommended level.
    Pass threshold: 80%.
    """
    try:
        from english_test_engine import get_english_test_engine
    except ImportError:
        raise HTTPException(500, "English test engine not available.")

    engine = get_english_test_engine()
    result = engine.submit_test(
        candidate_id=request.candidate_id,
        candidate_name=request.candidate_name,
        level=request.level,
        answers=request.answers,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.get("/english/test/history/{candidate_id}")
def english_test_history(candidate_id: str):
    """Get all past English test results for a student."""
    try:
        from english_test_engine import get_english_test_engine
    except ImportError:
        raise HTTPException(500, "English test engine not available.")

    engine = get_english_test_engine()
    history = engine.get_test_history(candidate_id)

    return {"success": True, "candidate_id": candidate_id,
            "tests": history, "count": len(history)}


@app.get("/english/test/recommended-level/{candidate_id}")
def english_test_recommended_level(candidate_id: str):
    """Get AI-recommended English level based on test performance."""
    try:
        from english_test_engine import get_english_test_engine
    except ImportError:
        raise HTTPException(500, "English test engine not available.")

    engine = get_english_test_engine()
    return {"success": True, **engine.get_recommended_level(candidate_id)}


# ── English Speaking Assessment Endpoints (Live AI Conversation) ──────────────


@app.post("/english/test/speaking/start")
def english_speaking_start(request: EnglishSpeakingStartRequest):
    """
    Start a live speaking assessment.

    Speaking is the LAST section of the test. AI will have a natural conversation
    with the student to assess fluency, vocabulary, grammar, and coherence.
    No predefined questions — AI dynamically assesses through conversation.
    """
    try:
        from english_test_engine import get_english_test_engine
    except ImportError:
        raise HTTPException(500, "English test engine not available.")

    engine = get_english_test_engine()
    result = engine.start_speaking_assessment(
        candidate_id=request.candidate_id,
        candidate_name=request.candidate_name,
        level=request.level,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.post("/english/test/speaking/respond")
def english_speaking_respond(request: EnglishSpeakingRespondRequest):
    """
    Respond in a live speaking assessment.

    The AI will ask follow-up questions based on the student's responses.
    After enough exchanges, the assessment can be ended for scoring.
    """
    try:
        from english_test_engine import get_english_test_engine
    except ImportError:
        raise HTTPException(500, "English test engine not available.")

    engine = get_english_test_engine()
    result = engine.respond_speaking(
        candidate_id=request.candidate_id,
        level=request.level,
        student_message=request.message,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.post("/english/test/speaking/end")
def english_speaking_end(request: EnglishSpeakingEndRequest):
    """
    End the speaking assessment and get the score.

    AI evaluates the conversation transcript and scores on:
    fluency, vocabulary, grammar, pronunciation, and task completion.
    Total: 25 marks.
    """
    try:
        from english_test_engine import get_english_test_engine
    except ImportError:
        raise HTTPException(500, "English test engine not available.")

    engine = get_english_test_engine()
    result = engine.end_speaking_assessment(
        candidate_id=request.candidate_id,
        level=request.level,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


# ── English AI Teacher Session Endpoints ──────────────────────────────────────


@app.post("/english/session/start")
def english_session_start(request: EnglishSessionStartRequest):
    """
    Start an AI English teaching session.

    - Session 1 of each level: Test discussion (no new topic)
    - Sessions 2-11: Interactive teaching with live Q&A
    - Session 12: Level test assignment (must pass to advance)
    - BLOCKS if level test not passed when trying to start next level
    """
    try:
        from english_teacher_engine import get_english_teacher_engine
    except ImportError:
        raise HTTPException(500, "English teacher engine not available.")

    engine = get_english_teacher_engine()
    result = engine.start_session(
        candidate_id=request.candidate_id,
        candidate_name=request.candidate_name,
        level=request.level,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])
    if result.get("blocked"):
        raise HTTPException(403, result)

    return result


@app.post("/english/session/respond")
def english_session_respond(request: EnglishSessionRespondRequest):
    """
    Send a message in an active teaching session.

    The AI teacher responds interactively. Supports:
    - "explain once more" / "explain in detail" → re-explains
    - "give me more examples" → provides additional examples
    - Live exercises with immediate feedback
    """
    try:
        from english_teacher_engine import get_english_teacher_engine
    except ImportError:
        raise HTTPException(500, "English teacher engine not available.")

    engine = get_english_teacher_engine()
    result = engine.respond(
        session_id=request.session_id,
        student_message=request.message,
    )

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.post("/english/session/end")
def english_session_end(request: EnglishSessionEndRequest):
    """
    End a teaching session and update syllabus progress.
    For level_test sessions, provides test info for level advancement.
    """
    try:
        from english_teacher_engine import get_english_teacher_engine
    except ImportError:
        raise HTTPException(500, "English teacher engine not available.")

    engine = get_english_teacher_engine()
    result = engine.end_session(session_id=request.session_id)

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return result


@app.get("/english/session/history/{candidate_id}")
def english_session_history(candidate_id: str):
    """Get all teaching session summaries for a student."""
    try:
        from english_teacher_engine import get_english_teacher_engine
    except ImportError:
        raise HTTPException(500, "English teacher engine not available.")

    engine = get_english_teacher_engine()
    history = engine.get_session_history(candidate_id)

    return {"success": True, "candidate_id": candidate_id,
            "sessions": history, "count": len(history)}


@app.get("/english/test/failure-options/{candidate_id}")
def english_test_failure_options(
    candidate_id: str,
    level: str = Query(..., description="Level to check failure options for"),
):
    """
    Get options after failing a level test.

    Returns two options:
    1. Retest — take the test again directly
    2. Review weak topics — re-attend specific sessions on weak areas, then retest
    """
    try:
        from english_teacher_engine import get_english_teacher_engine
    except ImportError:
        raise HTTPException(500, "English teacher engine not available.")

    engine = get_english_teacher_engine()
    result = engine.get_test_failure_options(candidate_id, level)
    return {"success": True, **result}


@app.get("/english/session/progress/{candidate_id}")
def english_session_progress(candidate_id: str):
    """
    Get student's overall syllabus progress.

    Shows completion per level, current level/session, and next topic.
    """
    try:
        from english_teacher_engine import get_english_teacher_engine
    except ImportError:
        raise HTTPException(500, "English teacher engine not available.")

    engine = get_english_teacher_engine()
    return {"success": True, **engine.get_progress(candidate_id)}


@app.get("/english/syllabus")
def english_syllabus(level: Optional[str] = Query(None, description="Filter by level")):
    """
    Get the full English teaching syllabus.

    48 sessions across 4 levels (12 each):
    Basic → Intermediate → Super Intermediate → Advanced
    """
    try:
        from english_teacher_engine import get_english_teacher_engine
    except ImportError:
        raise HTTPException(500, "English teacher engine not available.")

    engine = get_english_teacher_engine()
    result = engine.get_syllabus(level)

    if result.get("error"):
        raise HTTPException(400, result["error"])

    return {"success": True, **result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
