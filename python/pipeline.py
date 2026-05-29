"""
Pipeline Orchestration for GradeUp Extraction

This module orchestrates all pipeline components:
- OCR extraction
- Content enrichment
- Qdrant vector DB uploads
- Document management

Provides a unified interface for the entire document processing workflow.
"""

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
                print(f"Warning: Could not initialize Qdrant client: {e}")
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
            openai_api_key=OPENAI_API_KEY_TEXT,  # ✅ Pass OpenAI key for GPT-4o-mini structuring
            skip_llm_refinement=skip_llm_refinement,
            llm_timeout=LLM_TIMEOUT,
            llm_max_length=LLM_MAX_CONTENT_LENGTH,
            skip_qdrant=skip_qdrant,
            qdrant_client=self.qdrant_client,
            skip_enrichment=skip_enrichment,
            board=board,
            class_number=class_number,
        )
        
        # ── Run Verification Agent ────────────────────────────────────────────
        # After extraction, verify all TOC units were extracted and fix gaps
        if (result.get("has_structured") and VERIFICATION_AVAILABLE
                and OPENAI_API_KEY_TEXT and not skip_llm_refinement):
            doc_out_dir = OUTPUTS_DIR / pdf_path.stem
            structured_path = doc_out_dir / "structured.json"
            content_path = doc_out_dir / "content.md"
            if structured_path.exists() and content_path.exists():
                # Detect if this is a split unit (e.g. "Unit_01_Geography.pdf")
                expected_units = None
                stem = pdf_path.stem
                unit_match = re.search(r'Unit_(\d+)', stem, re.IGNORECASE)
                if unit_match:
                    try:
                        expected_units = [int(unit_match.group(1))]
                        print(f"  🎯 Detected split unit: {expected_units[0]} (from filename)")
                    except (TypeError, ValueError):
                        pass

                print(f"\n  🔍 Running Verification Agent...")
                try:
                    verify_report = run_verification_agent(
                        structured_json_path=structured_path,
                        content_md_path=content_path,
                        api_key=OPENAI_API_KEY_TEXT,
                        auto_fix=True,
                        max_fixes=10,  # Allow fixing all incomplete units in a book
                        expected_units=expected_units,
                    )
                    result["verification"] = {
                        "is_complete": verify_report.get("is_complete", False),
                        "fixes_made": verify_report.get("fixes_made", 0),
                        "missing_after_fix": verify_report.get("missing_after_fix", []),
                    }
                    # Save verification report
                    vreport_path = doc_out_dir / "verification_report.json"
                    vreport_path.write_bytes(
                        __import__("orjson").dumps(verify_report, option=__import__("orjson").OPT_INDENT_2)
                    )
                except Exception as ve:
                    print(f"  ⚠️  Verification agent error: {ve}")
        
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
        print(f"  Processing PDF with custom user subject: {subject}")
        
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
            )
            
            # ── Run Verification Agent ────────────────────────────────────────
            if (result.get("has_structured") and VERIFICATION_AVAILABLE
                    and OPENAI_API_KEY_TEXT and not skip_llm_refinement):
                doc_out_dir = OUTPUTS_DIR / pdf_path.stem
                structured_path = doc_out_dir / "structured.json"
                content_path = doc_out_dir / "content.md"
                if structured_path.exists() and content_path.exists():
                    # Detect if this is a split unit (e.g. "Unit_01_Geography.pdf")
                    expected_units = None
                    stem = pdf_path.stem
                    unit_match = re.search(r'Unit_(\d+)', stem, re.IGNORECASE)
                    if unit_match:
                        try:
                            expected_units = [int(unit_match.group(1))]
                            print(f"  🎯 Detected split unit: {expected_units[0]} (from filename)")
                        except (TypeError, ValueError):
                            pass

                    print(f"\n  🔍 Running Verification Agent...")
                    try:
                        verify_report = run_verification_agent(
                            structured_json_path=structured_path,
                            content_md_path=content_path,
                            api_key=OPENAI_API_KEY_TEXT,
                            subject=subject,
                            auto_fix=True,
                            max_fixes=10,
                            expected_units=expected_units,
                        )
                        result["verification"] = {
                            "is_complete": verify_report.get("is_complete", False),
                            "fixes_made": verify_report.get("fixes_made", 0),
                            "missing_after_fix": verify_report.get("missing_after_fix", []),
                        }
                        import orjson as _orjson
                        (doc_out_dir / "verification_report.json").write_bytes(
                            _orjson.dumps(verify_report, option=_orjson.OPT_INDENT_2)
                        )
                    except Exception as ve:
                        print(f"  ⚠️  Verification agent error: {ve}")
            
            return {"success": True, **result}
            
        except Exception as e:
            print(f"Error in subject-aware processing: {e}")
            import traceback
            traceback.print_exc()
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
            print(f"Processing: {pdf.name}")
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
        fast_mode: bool = True
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
            fast_mode=fast_mode
        )
        
        if success:
            enriched_data = orjson.loads(output_path.read_bytes())
            return {
                "success": True,
                "document_id": document_id,
                "enriched_at": enriched_data.get("enriched_at"),
                "units_count": len(enriched_data.get("units", []))
            }
        
        return {"success": False, "error": "Enrichment failed"}
    
    def upload_to_qdrant(self, document_id: str, board: str, class_number: Optional[str] = None) -> Dict[str, Any]:
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
                book_content="structured"
            )

        success_enriched = False
        if enriched_path.exists():
            success_enriched = process_and_upload_document(
                structured_json_path=enriched_path,
                document_id=document_id,
                document_name=f"{document_id}.pdf",
                board=board,
                class_number=class_number,
                qdrant_client=self.qdrant_client,
                book_content="enrichment",
                collection_name=os.environ.get("QDRANT_COLLECTION_NAME", "GradeupAI_Books") + "_Enriched"
            )
        
        return {
            "success": success_structured or success_enriched,
            "document_id": document_id,
            "structured_uploaded": success_structured,
            "enriched_uploaded": success_enriched
        }
    
    def search(
        self,
        query: str,
        limit: int = 5,
        unit_filter: Optional[int] = None,
        content_type_filter: Optional[str] = None,
        class_filter: Optional[str] = None,
        subject_filter: Optional[str] = None,
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
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document and all its files."""
        doc_dir = OUTPUTS_DIR / document_id
        if not doc_dir.exists():
            return False
        
        try:
            shutil.rmtree(doc_dir)
            return True
        except Exception as e:
            print(f"Error deleting document {document_id}: {e}")
            return False


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
                print(f"  🔄 Pipeline refreshed with current MISTRAL_API_KEY: {mk}")
            else:
                _pipeline.mistral_client = None
                print("  ⚠️  Mistral library not available - client remains None")
    
    return _pipeline


def main():
    """Test the pipeline."""
    pipeline = get_pipeline()
    
    # Test with a sample PDF
    test_pdf = TEXTBOOKS_DIR / "sample.pdf"
    if test_pdf.exists():
        print(f"Processing: {test_pdf.name}")
        result = pipeline.process_pdf_file(test_pdf)
        print(f"Result: {result}")
    else:
        print(f"No test PDF found at {test_pdf}")
        print("Listing all documents:")
        docs = pipeline.list_documents()
        for doc in docs:
            print(f"  - {doc['id']}: {doc}")


if __name__ == "__main__":
    main()
