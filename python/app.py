"""
GradeUp AI Extraction API

Main application entry point with FastAPI endpoints for all modules.
This file contains all APIs and main controls for the extraction pipeline.
"""

import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

from config import OUTPUTS_DIR, TEXTBOOKS_DIR
from pipeline import get_pipeline, DocumentPipeline
from ocr_pipeline import extract_with_mistral_ocr

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


class QdrantUploadRequest(BaseModel):
    board: str
    class_number: Optional[str] = None


class TutorRequest(BaseModel):
    """Request model for AI Tutor queries"""
    query: str
    board: str
    class_number: Optional[str] = None
    subject: str
    unit_number: int
    unit_name: str = ""
    candidate_name: str
    candidate_id: str
    limit: int = 5


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
    skip_enrichment: bool = Form(False),
    skip_qdrant: bool = Form(False),
    skip_llm_refinement: bool = Form(False)
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
    
    logger.info(f"Subject-aware upload: {file.filename}, subject={subject}")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_pdf_path = Path(temp_dir) / file.filename
        
        content = await file.read()
        temp_pdf_path.write_bytes(content)
        
        pipeline = get_pipeline()
        
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
            for unit in split_units:
                unit_pdf_path = Path(unit["output_path"])
                resolved_part = part if part else unit.get("part", "")
                
                logger.info(f"Processing split unit: {unit_pdf_path.name}")
                unit_res = pipeline.process_pdf_file_subject_aware(
                    pdf_path=unit_pdf_path,
                    subject=subject,
                    auto_detect_subject=(subject == "auto"),
                    part=resolved_part,
                    skip_llm_refinement=skip_llm_refinement,
                    skip_qdrant=skip_qdrant,
                    skip_enrichment=skip_enrichment,
                    board=board,
                    class_number=class_number
                )
                results.append(unit_res)

            # ── Generate debate topics for each split unit (independent of enrichment) ──
            debate_results = []
            try:
                from debate_topic_generator import generate_and_save_debate_topics
                for unit_res in results:
                    doc_id = unit_res.get("document_id")
                    if doc_id and unit_res.get("has_structured"):
                        structured_path = OUTPUTS_DIR / doc_id / "structured.json"
                        if structured_path.exists():
                            logger.info(f"Generating debate topics for {doc_id}...")
                            dt_result = generate_and_save_debate_topics(
                                structured_path=structured_path,
                                subject=subject if subject != "auto" else None,
                            )
                            debate_results.append({
                                "document_id": doc_id,
                                "debate_topics_generated": dt_result.get("total_topics", 0),
                                "success": dt_result.get("success", False),
                            })
            except ImportError:
                logger.warning("Debate topic generator module not available — skipping")
            except Exception as e:
                logger.warning(f"Debate topic generation failed: {e}")

            return {
                "success": True,
                "is_split": True,
                "units_processed": len(results),
                "results": results,
                "debate_topics": debate_results,
                "message": f"Successfully split and processed {len(results)} units from {file.filename}"
            }
        
        # ── SINGLE PDF FALLBACK ───────────────────────────────────────────────
        logger.info(f"No chapters detected or already a unit. Processing as a single PDF...")
        result = pipeline.process_pdf_file_subject_aware(
            pdf_path=temp_pdf_path,
            subject=subject,
            auto_detect_subject=False,
            part=part,
            skip_llm_refinement=skip_llm_refinement,
            skip_qdrant=skip_qdrant,
            skip_enrichment=skip_enrichment,
            board=board,
            class_number=class_number
        )
    
    if not result.get("success"):
        logger.error(f"Processing failed: {result.get('error')}")
        raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    
    # ── Generate debate topics for single PDF (independent of enrichment) ──
    debate_info = {}
    if result.get("has_structured"):
        try:
            from debate_topic_generator import generate_and_save_debate_topics
            doc_id = result.get("document_id")
            if doc_id:
                structured_path = OUTPUTS_DIR / doc_id / "structured.json"
                if structured_path.exists():
                    logger.info(f"Generating debate topics for {doc_id}...")
                    dt_result = generate_and_save_debate_topics(
                        structured_path=structured_path,
                        subject=subject if subject != "auto" else None,
                    )
                    debate_info = {
                        "debate_topics_generated": dt_result.get("total_topics", 0),
                        "debate_topics_success": dt_result.get("success", False),
                    }
        except ImportError:
            logger.warning("Debate topic generator module not available — skipping")
        except Exception as e:
            logger.warning(f"Debate topic generation failed: {e}")
    
    logger.info(f"Successfully processed as {result.get('subject', 'unknown')} textbook")
    
    return {
        "success": True,
        **result,
        **debate_info,
        "message": f"Successfully processed {file.filename} as {result.get('subject', 'unknown')} textbook"
    }


# THAT'S IT! The rest of app.py remains unchanged.
from pdf_unit_splitter import split_pdf_by_units

@app.post("/upload_pdf")
async def split_pdf_endpoint(
    file: UploadFile = File(...),
    subject: str = Form(..., description="Subject name"),
    part: Optional[str] = Form(None, description="Book/part name (e.g. 'History', 'Fundamentals of Physical Geography')"),
    board: str = Form(..., description="Board name (e.g. 'State Board', 'CBSE')"),
    class_number: Optional[str] = Form(None, alias="class_name", description="Class number/name (e.g. '11', '10')"),
    auto_upload: bool = Form(True, description="Automatically process split units via subject-aware pipeline"),
    skip_enrichment: bool = Form(False),
    skip_qdrant: bool = Form(False),
    skip_llm_refinement: bool = Form(False)
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
                        class_number=class_number
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


@app.get("/textbook/structured")
def get_whole_textbook_structured(
    subject: Optional[str] = Query(None, description="Filter by subject and populate at root"),
    board: Optional[str] = Query(None, description="Populate board at root"),
    class_number: Optional[str] = Query(None, description="Filter by class number")
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
        "total_units": len(all_units),
        "units": all_units
    }


@app.get("/textbook/enrichment")
def get_whole_textbook_enrichment(
    subject: Optional[str] = Query(None, description="Filter by subject and populate at root"),
    board: Optional[str] = Query(None, description="Populate board at root"),
    class_number: Optional[str] = Query(None, description="Filter by class number")
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


@app.post("/tutor/ask")
def tutor_ask(request: TutorRequest):
    """
    Ask the AI Tutor a question.

    The tutor retrieves relevant content from the Qdrant vector DB,
    generates a study-focused answer using GPT-5-mini, and maintains
    per-student chat history (scoped by subject + unit).

    **Rules:**
    - Only answers study-related questions for the given subject/unit.
    - Rejects 18+, harmful, or off-topic content.
    - Uses textbook content as primary source of truth.
    """
    try:
        from ai_tutor import ask_tutor
    except ImportError:
        raise HTTPException(500, "AI Tutor module not available. Ensure ai_tutor.py is present.")

    result = ask_tutor(
        query=request.query,
        board=request.board,
        class_number=request.class_number or "",
        subject=request.subject,
        unit_number=request.unit_number,
        unit_name=request.unit_name,
        candidate_name=request.candidate_name,
        candidate_id=request.candidate_id,
        limit=request.limit,
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


class HomeworkSubmitRequest(BaseModel):
    """Request model for submitting homework answers."""
    homework_id: str
    candidate_id: str
    answers: List[dict]  # [{question_id, answer}]


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
    unit_number: Optional[int] = Form(None)
):
    """
    Admin endpoint to upload a PDF question paper.
    Runs Mistral OCR, extracts questions via LLM, and stores via QuestionBankManager.
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
        
        # 3. LLM extraction to List[dict]
        api_key_openai = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key_openai:
            raise HTTPException(500, "OPENAI_API_KEY is missing")
            
        headers = {
            "Authorization": f"Bearer {api_key_openai}",
            "Content-Type": "application/json",
        }
        
        prompt = f'''Extract all questions from the following text into a JSON array of objects.
Each object must have:
- "question": string
- "marks": int (default 1 if not specified)
- "type": string (e.g., "mcq", "short_answer", "long_answer", "fill_in_the_blanks")
- "options": array of strings (for MCQ only)
- "correct_answer": string (if available, otherwise empty)

Text:
{markdown_text[:30000]}

Return ONLY the JSON array.'''

        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_completion_tokens": 3000,
            "temperature": 1,
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
            
        # 4. Pass to QuestionBankManager
        logical_doc_id = f"qb_pdf_{board.strip().replace(' ', '_')}_{subject.strip().replace(' ', '_')}"
        
        manager = get_question_bank_manager()
        result = manager.process_question_paper(
            questions=extracted_questions,
            year=year,
            exam_name=exam_name,
            subject=subject,
            unit_number=unit_number,
            document_id=logical_doc_id,
        )
        
        return {
            "success": True, 
            "extracted_count": len(extracted_questions),
            **result
        }
        
    finally:
        if pdf_path.exists():
            os.unlink(pdf_path)


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

    manager = get_question_bank_manager()
    result = manager.process_question_paper(
        questions=request.questions,
        year=request.year,
        exam_name=request.exam_name,
        subject=request.subject,
        unit_number=request.unit_number,
        document_id=request.document_id,
    )

    return {"success": True, **result}


@app.get("/tutor/question-bank/{document_id}")
def get_question_bank(
    document_id: str,
    year: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    unit_number: Optional[int] = Query(None),
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

    # Dynamically resolve document_id from Qdrant
    query_text = request.unit_name if request.unit_name else request.subject
    db_results = search_qdrant(
        query=query_text,
        limit=1,
        board_filter=request.board,
        subject_filter=request.subject,
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


class HighlightAskRequest(BaseModel):
    """Request model for Ask AI about highlighted text."""
    highlighted_text: str
    board: str
    class_number: str = ""
    subject: str = ""
    unit_number: Optional[int] = None
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


class SeminarIntroRequest(BaseModel):
    """Request predefined seminar introduction/guidance before starting."""
    candidate_name: str = "Student"


class SeminarChatStartRequest(BaseModel):
    """Start a post-session seminar chat."""
    session_id: str


class SeminarChatRespondRequest(BaseModel):
    """Send a message in post-session seminar chat."""
    session_id: str
    message: str


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


@app.post("/seminar/intro")
def seminar_intro(request: SeminarIntroRequest):
    """
    Get predefined seminar introduction and guidance.

    Returns static, curated content that every student should see before
    starting their seminar session. Includes:
    - Warm greeting
    - Step-by-step guide on how to deliver a seminar
    - Camera and posture tips for presentation
    - Important tips for a successful seminar

    This is NOT an AI call — it returns instantly with predefined content.
    Call this BEFORE /seminar/start to prepare the student.
    """
    try:
        from seminar_engine import get_seminar_engine
    except ImportError:
        raise HTTPException(500, "Seminar engine module not available.")

    engine = get_seminar_engine()
    return engine.get_seminar_intro(candidate_name=request.candidate_name)


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
request_body = {
    "candidate_id": candidate_id,
    "candidate_name": candidate_name,
    "subject": subject,
    "unit_number": unit_number,
    "board": board,
    "class_number": class_number,
    "unit_name": unit_name,
    "topic": topic,
    "session_mode": session_mode,
    "file_name": file.filename if file else None,
    "uploaded_content_available": bool(uploaded_content),
    "uploaded_content_length": len(uploaded_content) if uploaded_content else 0,
}

print("Seminar start request body:", request_body)
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
