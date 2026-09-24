"""
Pipeline Orchestration for GradeUp Extraction

This module orchestrates all pipeline components:
- OCR extraction
- Content enrichment
- Qdrant vector DB uploads
- Document management

Provides a unified interface for the entire document processing workflow.
"""

import json
import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import re
import orjson
from dotenv import load_dotenv

from config import (
    WORKSPACE_ROOT, TEXTBOOKS_DIR, OUTPUTS_DIR,
    MISTRAL_API_KEY, OPENAI_API_KEY_TEXT,
    LLM_TIMEOUT, LLM_MAX_CONTENT_LENGTH
)
from logger import get_logger

logger = get_logger(__name__)

SUBJECT_AWARE_AVAILABLE = False
try:
    from mistralai import Mistral
    MISTRAL_AVAILABLE = True
except ImportError:
    try:
        # mistralai v2.x moved Mistral to mistralai.client
        from mistralai.client import Mistral
        MISTRAL_AVAILABLE = True
    except ImportError:
        MISTRAL_AVAILABLE = False

try:
    from ocr_pipeline import process_pdf, find_pdfs, ensure_outputs_dir, extract_with_mistral_ocr
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

try:
    from enrichment_pipeline import enrich_document
    ENRICHMENT_AVAILABLE = True
except ImportError:
    ENRICHMENT_AVAILABLE = False

try:
    from qdrant_integration import (
        initialize_qdrant_client, process_and_upload_document,
        search_qdrant
    )
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False

try:
    from verification_pipeline import run_verification_agent
    VERIFICATION_AVAILABLE = True
except ImportError:
    VERIFICATION_AVAILABLE = False

try:
    from extraction_verification_graph import run_verification_graph
    AGENTIC_VERIFICATION_AVAILABLE = True
except ImportError:
    AGENTIC_VERIFICATION_AVAILABLE = False


def load_env() -> None:
    for env_file in (".env.local", ".env"):
        if Path(env_file).exists():
            load_dotenv(dotenv_path=env_file, override=True)
            break


class DocumentPipeline:
    """Main pipeline orchestrator for document processing."""
    
    def __init__(self):
        load_env()
        self.mistral_client = None
        self._qdrant_client = None
        self._qdrant_initialized = False
        
        # Use os.getenv directly to pick up changes from load_env()
        api_key = os.getenv("MISTRAL_API_KEY")
        if MISTRAL_AVAILABLE and api_key:
            self.mistral_client = Mistral(api_key=api_key)
    
    @property
    def qdrant_client(self):
        """Lazy initialization of Qdrant client."""
        if not self._qdrant_initialized and QDRANT_AVAILABLE:
            self._qdrant_initialized = True
            try:
                self._qdrant_client = initialize_qdrant_client()
            except Exception as e:
                logger.warning(f"Warning: Could not initialize Qdrant client: {e}")
                self._qdrant_client = None
        return self._qdrant_client
    
    @qdrant_client.setter
    def qdrant_client(self, value):
        self._qdrant_client = value
        self._qdrant_initialized = True
    
    def process_pdf_file(
        self,
        pdf_path: Path,
        board: str,
        class_number: Optional[str] = None,
        skip_llm_refinement: bool = False,
        skip_qdrant: bool = False,
        skip_enrichment: bool = False,
        filter_qr_codes: bool = False,
        enrichment_style: str = "avatar_classroom_teaching",
        term: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process a single PDF through the entire pipeline."""
        if not OCR_AVAILABLE:
            return {"success": False, "error": "OCR module not available"}
        
        if not self.mistral_client:
            return {"success": False, "error": "Mistral client not initialized. Check MISTRAL_API_KEY."}
        
        ensure_outputs_dir(OUTPUTS_DIR)
        
        # FIXED: Removed openrouter_api_key parameter
        result = process_pdf(
            client=self.mistral_client,
            pdf_path=pdf_path,
            outputs_dir=OUTPUTS_DIR,
            use_upload_flow=True,
            filter_qr_codes=filter_qr_codes,
            openai_api_key=OPENAI_API_KEY_TEXT,  # Pass OpenAI key for GPT-4o-mini structuring
            skip_llm_refinement=skip_llm_refinement,
            llm_timeout=LLM_TIMEOUT,
            llm_max_length=LLM_MAX_CONTENT_LENGTH,
            skip_qdrant=skip_qdrant,
            qdrant_client=self.qdrant_client,
            skip_enrichment=skip_enrichment,
            board=board,
            class_number=class_number,
            enrichment_style=enrichment_style,
            term=term,
        )

        # ── Run Agentic Verification Graph (LangGraph) ──────────────────────────
        # Multi-pass: OCR quality guard → parallel unit verify → schema scoring
        # Loops up to 3 times until overall score ≥ 95% or max passes reached.
        if (result.get("has_structured")
                and OPENAI_API_KEY_TEXT and not skip_llm_refinement):
            doc_out_dir = OUTPUTS_DIR / result["document_id"]
            structured_path = doc_out_dir / "structured.json"
            content_path = doc_out_dir / "content.md"
            if structured_path.exists() and content_path.exists():
                logger.info(f"Running Agentic Verification Workflow (LangGraph)...")
                try:
                    if AGENTIC_VERIFICATION_AVAILABLE:
                        verify_report = run_verification_graph(
                            doc_id=result["document_id"],
                            structured_json_path=structured_path,
                            content_md_path=content_path,
                            subject=result.get("subject", "unknown"),
                            api_key=OPENAI_API_KEY_TEXT,
                            # What the upload declared. The audit checks the
                            # unit fields against it, so a subject or part the
                            # model invented is caught rather than indexed.
                            declared={
                                "subject": result.get("subject"),
                                "part":    result.get("part"),
                                "term":    result.get("term"),
                            },
                        )
                    elif VERIFICATION_AVAILABLE:
                        # Fallback to legacy single-pass agent
                        logger.warning("LangGraph not available — falling back to legacy verifier")
                        verify_report = run_verification_agent(
                            structured_json_path=structured_path,
                            content_md_path=content_path,
                            api_key=OPENAI_API_KEY_TEXT,
                            auto_fix=True,
                            max_fixes=10,
                        )
                    else:
                        verify_report = {}
                    result["verification"] = {
                        "is_complete":    verify_report.get("is_complete", False),
                        "overall_score":  verify_report.get("overall_score", 0),
                        "fixes_made":     verify_report.get("fixes_made", 0),
                        "passes_run":     verify_report.get("passes_run", 1),
                        "s3_uploaded":    verify_report.get("s3_uploaded", False),
                    }
                except Exception as ve:
                    logger.warning(f"Verification workflow error: {ve}")

        # ── Enrichment & Qdrant Upload (Moved here to run AFTER Verification) ──
        if result.get("has_structured"):
            doc_out_dir = OUTPUTS_DIR / result["document_id"]
            structured_path = doc_out_dir / "structured.json"
            
            # Enrichment
            if not skip_enrichment and ENRICHMENT_AVAILABLE:
                logger.info(f"Running subject-aware enrichment...")
                try:
                    enriched_path = doc_out_dir / "enriched.json"
                    enrichment_ok = enrich_document(
                        structured_json_path=structured_path,
                        output_path=enriched_path,
                        subject=result.get("subject"),
                        enrichment_style=enrichment_style,
                    )
                    result["has_enriched"] = enrichment_ok
                    if enrichment_ok:
                        logger.info(f"Enrichment complete → {enriched_path.name}")
                    else:
                        logger.warning(f"Enrichment finished with errors — check enriched.json")
                except Exception as e:
                    logger.exception(f"Enrichment failed: {e}")
                    result["has_enriched"] = False
            
            # Qdrant Upload
            if not skip_qdrant and QDRANT_AVAILABLE:
                logger.info(f"Uploading to Qdrant vector DB...")
                try:
                    _q_client = self.qdrant_client
                    if _q_client is None:
                        logger.warning(f"Qdrant upload skipped — could not connect to Qdrant")
                        result["qdrant_uploaded"] = False
                    else:
                        _doc_id = result["document_id"]
                        _doc_name = pdf_path.name
                        _uploaded = False
                        if structured_path.exists():
                            logger.info(f"Uploading structured.json to Qdrant...")
                            _uploaded = process_and_upload_document(
                                structured_json_path=structured_path,
                                document_id=_doc_id,
                                document_name=_doc_name,
                                board=board,
                                class_number=class_number,
                                qdrant_client=_q_client,
                                term=term,
                                subject=result.get("subject"),
                            )
                        result["qdrant_uploaded"] = _uploaded
                        if _uploaded:
                            logger.info(f"Qdrant upload complete (document_id={_doc_id})")
                        else:
                            logger.warning(f"Qdrant upload failed for structured data")
                except Exception as _qe:
                    logger.exception(f"Qdrant upload error: {_qe}")
                    result["qdrant_uploaded"] = False
            
            # Re-save summary.json with updated has_enriched and qdrant_uploaded
            try:
                summary_path = doc_out_dir / "summary.json"
                if summary_path.exists():
                    import orjson as _orjson
                    summary_data = _orjson.loads(summary_path.read_bytes())
                    summary_data["has_enriched"] = result.get("has_enriched", False)
                    summary_data["qdrant_uploaded"] = result.get("qdrant_uploaded", False)
                    summary_path.write_bytes(_orjson.dumps(summary_data, option=_orjson.OPT_INDENT_2))
            except Exception as e:
                logger.warning(f"Failed to update summary.json: {e}")
        
        return {"success": True, **result}
    

    
    def process_pdf_file_subject_aware(
        self,
        pdf_path: Path,
        board: str,
        subject: Optional[str] = None,
        auto_detect_subject: bool = False,
        part: Optional[str] = None,
        class_number: Optional[str] = None,
        skip_llm_refinement: bool = False,
        skip_qdrant: bool = False,
        skip_enrichment: bool = False,
        filter_qr_codes: bool = False,
        enrichment_style: str = "avatar_classroom_teaching",
        term: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process a single PDF through the pipeline with subject-aware extraction.
        
        This method uses subject-specific schemas for better extraction quality:
        - Science: Activities, Notes, Do You Know boxes
        - Mathematics: Examples with solutions, Theorems with proofs
        - Social Science: Part identification (History/Geography/Civics/Economics)
        
        Args:
            pdf_path: Path to PDF file
            subject: Subject type ("science", "mathematics", "social_science") or None
            auto_detect_subject: If True, automatically detect subject from content
            skip_llm_refinement: Skip verification step
            skip_qdrant: Skip Qdrant upload
            skip_enrichment: Skip enrichment
            filter_qr_codes: Filter QR codes during OCR
        
        Returns:
            Dict with success status, subject type, and processing details
        """
        if not OCR_AVAILABLE:
            return {"success": False, "error": "OCR module not available"}
        
        if not self.mistral_client:
            return {"success": False, "error": "Mistral client not initialized. Check MISTRAL_API_KEY."}
        
        ensure_outputs_dir(OUTPUTS_DIR)
        
        # Accept any arbitrary subject from the user.
        logger.info(f"Processing PDF with custom user subject: {subject}")
        
        # Call process_pdf directly
        # The ocr_pipeline.py will use the auto schema extractor
        try:
            result = process_pdf(
                client=self.mistral_client,
                pdf_path=pdf_path,
                outputs_dir=OUTPUTS_DIR,
                openai_api_key=OPENAI_API_KEY_TEXT,
                subject=subject,
                auto_detect_subject=auto_detect_subject,
                use_upload_flow=True,
                filter_qr_codes=filter_qr_codes,
                skip_llm_refinement=skip_llm_refinement,
                skip_qdrant=skip_qdrant,
                qdrant_client=self.qdrant_client if not skip_qdrant else None,
                skip_enrichment=skip_enrichment,
                part=part,
                board=board,
                class_number=class_number,
                enrichment_style=enrichment_style,
                term=term,
            )
            
            # NOTE: Agentic verification is intentionally NOT run here.
            # The /upload-agentic endpoint in app.py runs run_verification_graph()
            # after this method returns, so running it here too would cause a
            # double execution (two full 3-pass verification runs).


            # ── Enrichment & Qdrant Upload (Moved here to run AFTER Verification) ──
            if result.get("has_structured"):
                doc_out_dir = OUTPUTS_DIR / result["document_id"]
                structured_path = doc_out_dir / "structured.json"
                
                # Enrichment
                if not skip_enrichment and ENRICHMENT_AVAILABLE:
                    logger.info(f"Running subject-aware enrichment...")
                    try:
                        enriched_path = doc_out_dir / "enriched.json"
                        enrichment_ok = enrich_document(
                            structured_json_path=structured_path,
                            output_path=enriched_path,
                            subject=result.get("subject"),
                            enrichment_style=enrichment_style,
                        )
                        result["has_enriched"] = enrichment_ok
                        if enrichment_ok:
                            logger.info(f"Enrichment complete → {enriched_path.name}")
                        else:
                            logger.warning(f"Enrichment finished with errors — check enriched.json")
                    except Exception as e:
                        logger.exception(f"Enrichment failed: {e}")
                        result["has_enriched"] = False
                
                # Qdrant Upload
                if not skip_qdrant and QDRANT_AVAILABLE:
                    logger.info(f"Uploading to Qdrant vector DB...")
                    try:
                        _q_client = self.qdrant_client
                        if _q_client is None:
                            logger.warning(f"Qdrant upload skipped — could not connect to Qdrant")
                            result["qdrant_uploaded"] = False
                        else:
                            _doc_id = result["document_id"]
                            _doc_name = pdf_path.name
                            _uploaded = False
                            if structured_path.exists():
                                logger.info(f"Uploading structured.json to Qdrant...")
                                _uploaded = process_and_upload_document(
                                    structured_json_path=structured_path,
                                    document_id=_doc_id,
                                    document_name=_doc_name,
                                    board=board,
                                    class_number=class_number,
                                    qdrant_client=_q_client,
                                    term=term,
                                    # Fallback for units the extractor did not stamp;
                                    # prefer the detected subject over the requested one.
                                    subject=result.get("subject") or subject,
                                    part=part,
                                )
                            result["qdrant_uploaded"] = _uploaded
                            if _uploaded:
                                logger.info(f"Qdrant upload complete (document_id={_doc_id})")
                            else:
                                logger.warning(f"Qdrant upload failed for structured data")
                    except Exception as _qe:
                        logger.exception(f"Qdrant upload error: {_qe}")
                        result["qdrant_uploaded"] = False
                
                # Re-save summary.json with updated has_enriched and qdrant_uploaded
                try:
                    summary_path = doc_out_dir / "summary.json"
                    if summary_path.exists():
                        import orjson as _orjson
                        summary_data = _orjson.loads(summary_path.read_bytes())
                        summary_data["has_enriched"] = result.get("has_enriched", False)
                        summary_data["qdrant_uploaded"] = result.get("qdrant_uploaded", False)
                        summary_path.write_bytes(_orjson.dumps(summary_data, option=_orjson.OPT_INDENT_2))
                except Exception as e:
                    logger.warning(f"Failed to update summary.json: {e}")
            
            return {"success": True, **result}
            
        except Exception as e:
            logger.exception(f"Error in subject-aware processing: {e}")
            return {"success": False, "error": f"Subject-aware processing failed: {str(e)}"}
    
    def process_textbooks_directory(
        self,
        only: Optional[str] = None,
        limit: int = 0,
        skip_llm_refinement: bool = False,
        skip_qdrant: bool = False,
        skip_enrichment: bool = False,
        class_number: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Process all PDFs in the textbooks directory."""
        if not OCR_AVAILABLE:
            return [{"success": False, "error": "OCR module not available"}]
        
        if not self.mistral_client:
            return [{"success": False, "error": "Mistral client not initialized"}]
        
        pdfs = find_pdfs(TEXTBOOKS_DIR)
        
        if only:
            pdfs = [p for p in pdfs if only in p.name]
        if limit > 0:
            pdfs = pdfs[:limit]
        
        if not pdfs:
            return [{"success": False, "error": "No PDFs found to process"}]
        
        results = []
        for pdf in pdfs:
            logger.info(f"Processing: {pdf.name}")
            result = self.process_pdf_file(
                pdf_path=pdf,
                skip_llm_refinement=skip_llm_refinement,
                skip_qdrant=skip_qdrant,
                skip_enrichment=skip_enrichment,
                class_number=class_number
            )
            results.append(result)
        
        return results
    
    def enrich_document(
        self,
        document_id: str,
        include_sections: bool = True,
        include_web: bool = True,
        fast_mode: bool = True,
        enrichment_style: str = "avatar_classroom_teaching"
    ) -> Dict[str, Any]:
        """Enrich an already-extracted document."""
        if not ENRICHMENT_AVAILABLE:
            return {"success": False, "error": "Enrichment module not available"}
        
        structured_path = OUTPUTS_DIR / document_id / "structured.json"
        if not structured_path.exists():
            return {"success": False, "error": f"Document {document_id} not found or not extracted"}
        
        output_path = OUTPUTS_DIR / document_id / "enriched.json"
        
        success = enrich_document(
            structured_json_path=structured_path,
            output_path=output_path,
            include_sections=include_sections,
            include_web=include_web,
            fast_mode=fast_mode,
            enrichment_style=enrichment_style
        )
        
        if success:
            enriched_data = orjson.loads(output_path.read_bytes())
            return {
                "success": True,
                "document_id": document_id,
                "enriched_at": enriched_data.get("enriched_at"),
                "units_count": len(enriched_data.get("units", []) or enriched_data.get("chapters", []))
            }
        
        return {"success": False, "error": "Enrichment failed"}
    
    def upload_to_qdrant(self, document_id: str, board: str, class_number: Optional[str] = None,
                         term: Optional[str] = None, subject: Optional[str] = None,
                         part: Optional[str] = None) -> Dict[str, Any]:
        """Upload document chunks to Qdrant."""
        if not QDRANT_AVAILABLE:
            return {"success": False, "error": "Qdrant module not available"}
        
        if not self.qdrant_client:
            self.qdrant_client = initialize_qdrant_client()
            if not self.qdrant_client:
                return {"success": False, "error": "Could not connect to Qdrant"}
        
        structured_path = OUTPUTS_DIR / document_id / "structured.json"
        enriched_path = OUTPUTS_DIR / document_id / "enriched.json"
        
        if not structured_path.exists() and not enriched_path.exists():
            return {"success": False, "error": f"Document {document_id} not found."}
        
        success_structured = False
        if structured_path.exists():
            success_structured = process_and_upload_document(
                structured_json_path=structured_path,
                document_id=document_id,
                document_name=f"{document_id}.pdf",
                board=board,
                class_number=class_number,
                qdrant_client=self.qdrant_client,
                book_content="structured",
                term=term,
                subject=subject,
                part=part,
            )

        return {
            "success": success_structured,
            "document_id": document_id,
            "structured_uploaded": success_structured,
            "enriched_uploaded": False
        }
    
    def search(
        self,
        query: str,
        limit: int = 5,
        unit_filter: Optional[int] = None,
        content_type_filter: Optional[str] = None,
        class_filter: Optional[str] = None,
        subject_filter: Optional[str] = None,
        board_filter: Optional[str] = None,
        term_filter: Optional[Any] = None,
        part_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Search the vector database."""
        if not QDRANT_AVAILABLE:
            return []

        return search_qdrant(
            query=query,
            limit=limit,
            unit_filter=unit_filter,
            content_type_filter=content_type_filter,
            class_filter=class_filter,
            subject_filter=subject_filter,
            board_filter=board_filter,
            term_filter=term_filter,
            part_filter=part_filter,
            qdrant_client=self.qdrant_client
        )
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """List all processed documents."""
        if not OUTPUTS_DIR.exists():
            return []
        
        documents = []
        for doc_dir in OUTPUTS_DIR.iterdir():
            if not doc_dir.is_dir():
                continue
            
            doc_info = {
                "id": doc_dir.name,
                "path": str(doc_dir),
                "has_markdown": (doc_dir / "content.md").exists(),
                "has_structured": (doc_dir / "structured.json").exists(),
                "has_enriched": (doc_dir / "enriched.json").exists(),
            }
            
            # Load metadata if available
            metadata_path = doc_dir / "metadata.json"
            if metadata_path.exists():
                try:
                    metadata = orjson.loads(metadata_path.read_bytes())
                    doc_info.update(metadata)
                except Exception:
                    pass
            
            documents.append(doc_info)
        
        return documents
    
    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get details for a specific document."""
        doc_dir = OUTPUTS_DIR / document_id
        if not doc_dir.exists():
            return None
        
        doc_info = {
            "id": document_id,
            "path": str(doc_dir),
            "has_markdown": (doc_dir / "content.md").exists(),
            "has_structured": (doc_dir / "structured.json").exists(),
            "has_enriched": (doc_dir / "enriched.json").exists(),
        }
        
        # Load all available data
        for filename in ["metadata.json", "summary.json"]:
            filepath = doc_dir / filename
            if filepath.exists():
                try:
                    data = orjson.loads(filepath.read_bytes())
                    doc_info.update(data)
                except Exception:
                    pass
        
        return doc_info
    
    def delete_document(self, document_id: str, purge_vectors: bool = True) -> Dict[str, Any]:
        """Delete a document's files and, by default, its chunks in Qdrant.

        Returns {"deleted": bool, "files_deleted": bool, "vectors_deleted": int}.
        `deleted` is True when either side had something to remove: the two
        can disagree because outputs/ is per machine while the vectors are
        shared, and a delete that only clears the local folder leaves orphan
        chunks answering searches for a subject that no longer exists.
        """
        doc_dir = OUTPUTS_DIR / document_id
        files_deleted = False
        if doc_dir.exists():
            try:
                shutil.rmtree(doc_dir)
                files_deleted = True
            except Exception as e:
                logger.error(f"Error deleting document {document_id}: {e}")

        vectors_deleted = 0
        if purge_vectors and QDRANT_AVAILABLE:
            try:
                from qdrant_integration import delete_document_chunks
                vectors_deleted = delete_document_chunks(document_id, qdrant_client=self.qdrant_client)
            except Exception as e:
                logger.error(f"Error purging vectors for {document_id}: {e}")

        return {
            "deleted": files_deleted or vectors_deleted > 0,
            "files_deleted": files_deleted,
            "vectors_deleted": vectors_deleted,
        }

    # Local JSON files that carry the book's identity labels. Each is patched
    # at the top level and inside every unit/chapter dict, but only where the
    # key already exists - the files have different shapes and a label a file
    # never had is not added to it.
    _LABELLED_OUTPUT_FILES = ("structured.json", "enriched.json", "pipeline_report.json")

    def update_document_metadata(self, document_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Relabel a book after ingestion: subject / board / class_number / term / part.

        Applies to the Qdrant chunks (all of them, in place, no re-embedding)
        and to the local outputs/ JSON, so both a wrong upload label and the
        search filters that depend on it are fixed by one call. Either side
        may be absent on this machine; the counts say which were touched.
        """
        from qdrant_integration import RELABELABLE_METADATA_FIELDS
        clean = {k: v for k, v in (updates or {}).items() if k in RELABELABLE_METADATA_FIELDS}
        if not clean:
            raise ValueError(f"nothing to update; allowed fields: {RELABELABLE_METADATA_FIELDS}")

        files_patched: List[str] = []
        doc_dir = OUTPUTS_DIR / document_id
        for name in self._LABELLED_OUTPUT_FILES:
            path = doc_dir / name
            if not path.exists():
                continue
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"Skipping unreadable {path.name}: {e}")
                continue
            changed = False
            targets = [data] if isinstance(data, dict) else []
            if isinstance(data, dict):
                targets += [u for u in (data.get("units") or data.get("chapters") or []) if isinstance(u, dict)]
            for target in targets:
                for key, value in clean.items():
                    if key in target and target[key] != value:
                        target[key] = value
                        changed = True
            if changed:
                path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
                files_patched.append(name)

        vectors_updated = 0
        if QDRANT_AVAILABLE:
            from qdrant_integration import update_document_metadata
            vectors_updated = update_document_metadata(document_id, clean, qdrant_client=self.qdrant_client)

        return {
            "document_id": document_id,
            "updates": clean,
            "files_patched": files_patched,
            "vectors_updated": vectors_updated,
        }


# Global pipeline instance
_pipeline: Optional[DocumentPipeline] = None


def get_pipeline() -> DocumentPipeline:
    """Get or create the global pipeline instance (refreshes if key changes)."""
    global _pipeline
    
    # Reload environment to check for key changes (uses override=True)
    load_env()
    current_key = os.getenv("MISTRAL_API_KEY")
    
    if _pipeline is None:
        _pipeline = DocumentPipeline()
    else:
        # Refresh the client with the latest key from environment
        if current_key:
            if MISTRAL_AVAILABLE:
                _pipeline.mistral_client = Mistral(api_key=current_key)
                # Mask key for logging
                mk = f"{current_key[:4]}...{current_key[-4:]}" if len(current_key) > 8 else "***"
                logger.info(f"Pipeline refreshed with current MISTRAL_API_KEY: {mk}")
            else:
                _pipeline.mistral_client = None
                logger.warning("Mistral library not available - client remains None")
    
    return _pipeline


def main():
    """Test the pipeline."""
    pipeline = get_pipeline()
    
    # Test with a sample PDF
    test_pdf = TEXTBOOKS_DIR / "sample.pdf"
    if test_pdf.exists():
        logger.info(f"Processing: {test_pdf.name}")
        result = pipeline.process_pdf_file(test_pdf)
        logger.info(f"Result: {result}")
    else:
        logger.info(f"No test PDF found at {test_pdf}")
        logger.info("Listing all documents:")
        docs = pipeline.list_documents()
        for doc in docs:
            logger.info(f"- {doc['id']}: {doc}")


if __name__ == "__main__":
    main()
