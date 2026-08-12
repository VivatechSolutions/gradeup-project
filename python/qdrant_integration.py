"""
Advanced Qdrant Vector Database Integration for GradeUp

Features:
- Intelligent hierarchical chunking (merges sub_items into parent sections)
- Smart chunk sizing with semantic splitting
- Contextual enrichment (unit > section > subsection hierarchy in each chunk)
- Deduplication on re-processing (deletes old chunks before uploading)
- Class-based filtering for multi-grade support
- Uses OpenAI for generating embeddings
"""

import os
import re
import time
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

import orjson
from dotenv import load_dotenv

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import (
        Distance, VectorParams, PointStruct,
        Filter, FieldCondition, MatchValue, MatchAny,
        IsEmptyCondition, PayloadField,
    )
    from langchain_qdrant import QdrantVectorStore
    from langchain_openai import OpenAIEmbeddings
    from langchain_core.documents import Document
    from langchain_experimental.text_splitter import SemanticChunker
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False
    print("Warning: qdrant-client or langchain-qdrant not installed. "
          "Install with: pip install qdrant-client langchain-qdrant langchain-openai")




DEFAULT_COLLECTION_NAME = "gradeup_collection"
DEFAULT_QDRANT_URL = "http://localhost:6333"

OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
VECTOR_SIZE = 1536
BATCH_SIZE = 10

# Smart chunk sizing
CHUNK_TARGET_SIZE = 1500     # Target chars per chunk (optimal for embeddings)
CHUNK_MIN_SIZE = 200         # Minimum — smaller content merges with adjacent
CHUNK_MAX_SIZE = 3000        # Maximum — larger content gets split with overlap
CHUNK_OVERLAP_SIZE = 200     # Overlap when splitting large sections


@dataclass
class ChunkMetadata:
    """Metadata for a text chunk."""
    document_id: str
    document_name: str
    unit_number: int
    unit_title: str
    content_type: str
    board: str
    subject: Optional[str] = None
    class_number: Optional[str] = None
    part: Optional[str] = None
    # Canonical "term_N" for term-split state books; None for non-term boards
    # (CBSE/NCERT). Disambiguates unit_number, which restarts in each term book.
    term: Optional[str] = None
    section_title: Optional[str] = None
    subsection_title: Optional[str] = None
    table_number: Optional[str] = None
    chunk_index: int = 0
    enrichment_type: Optional[str] = None
    difficulty: Optional[str] = None
    book_content: str = "structured"


@dataclass
class TextChunk:
    """Represents a chunk of text with metadata."""
    text: str
    metadata: ChunkMetadata



_global_qdrant_client = None

def initialize_qdrant_client(qdrant_url: Optional[str] = None) -> Optional["QdrantClient"]:
    """Initialize and return a Qdrant client."""
    global _global_qdrant_client
    if _global_qdrant_client is not None:
        return _global_qdrant_client

    if not QDRANT_AVAILABLE:
        print("Error: Qdrant client not available. Please install qdrant-client.")
        return None

    url = qdrant_url or os.environ.get("QDRANT_URL", DEFAULT_QDRANT_URL)

    try:
        client = QdrantClient(
            url=url,
            api_key=os.getenv("QDRANT_API_KEY"),
            check_compatibility=False,
            timeout=120
        )
        client.get_collections()
        print(f"Connected to Qdrant at {url}")
        _global_qdrant_client = client
        return client
    except Exception as e:
        print(f"Failed to connect to Qdrant at {url}: {e}")
        print(f"  Make sure Qdrant is running: docker run -p 6333:6333 qdrant/qdrant")
        return None


def ensure_payload_indexes(client: "QdrantClient", collection: str):
    """Ensure all required payload indexes exist (with 'metadata.' prefix)."""
    _INDEXES = [
        ("metadata.document_id", "keyword"),
        ("metadata.board", "keyword"),
        ("metadata.subject", "keyword"),
        ("metadata.class_number", "keyword"),
        ("metadata.part", "keyword"),
        ("metadata.term", "keyword"),
        ("metadata.unit_number", "integer"),
        ("metadata.unit_title", "keyword"),
        ("metadata.content_type", "keyword"),
        ("metadata.enrichment_type", "keyword"),
        ("metadata.difficulty", "keyword"),
        ("metadata.book_content", "keyword"),
        ("action", "keyword"),
    ]
    for field_name, schema in _INDEXES:
        try:
            client.create_payload_index(
                collection_name=collection,
                field_name=field_name,
                field_schema=schema,
            )
        except Exception:
            pass

def create_collection_if_not_exists(
    client: "QdrantClient",
    collection_name: Optional[str] = None,
) -> bool:
    """Create Qdrant collection with all payload indexes if it doesn't exist."""
    if not client:
        return False

    collection = collection_name or os.environ.get(
        "QDRANT_COLLECTION_NAME", DEFAULT_COLLECTION_NAME
    )

    try:
        try:
            client.get_collection(collection)
            print(f"Collection '{collection}' already exists")
            ensure_payload_indexes(client, collection)
            return True
        except Exception:
            pass

        client.create_collection(
            collection_name=collection,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )
        print(f"Created collection '{collection}' with vector size {VECTOR_SIZE}")

        ensure_payload_indexes(client, collection)
        print(f"Created payload indexes for efficient filtering")

        return True

    except Exception as e:
        error_str = str(e)
        if "already exists" in error_str.lower():
            print(f"Collection '{collection}' already exists (found in storage)")
            ensure_payload_indexes(client, collection)
            return True
        print(f"Failed to create collection '{collection}': {e}")
        return False



def get_embeddings_model(api_key: Optional[str] = None):
    """Return a LangChain OpenAIEmbeddings model."""
    key = api_key or os.environ.get("OPENAI_API_KEY")
    if not key:
        print("Error: OPENAI_API_KEY not set.")
        return None
    return OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL, openai_api_key=key)


def generate_embeddings(
    texts: List[str],
    api_key: Optional[str] = None,
) -> Optional[List[List[float]]]:
    """Generate OpenAI embeddings (backward compatibility wrapper)."""
    embeddings_model = get_embeddings_model(api_key)
    if not embeddings_model:
        return None
    try:
        return embeddings_model.embed_documents(texts)
    except Exception as e:
        print(f"Failed to generate embeddings: {e}")
        return None



def _build_context_header(
    unit_number: int,
    unit_title: str,
    section_title: str = "",
    subsection_title: str = "",
    subject: Optional[str] = None,
    class_number: Optional[str] = None,
    part: Optional[str] = None,
    board: Optional[str] = None,
    term: Optional[str] = None,
) -> str:
    """Build a rich hierarchical context header for a chunk.

    Hierarchy: Board > Class > Subject > Part > Term > Unit > Section
    Example:  CBSE | Class 11 | Geography | Fundamentals of Physical Geography | Unit 1: Geography as a Discipline | Section: Branches of Geography

    The header is embedded along with the chunk text, so including the term
    also improves semantic recall for term-split books — not just filtering.
    """
    parts = []
    if board:
        parts.append(board)
    if class_number:
        parts.append(f"Class {class_number}")
    if subject:
        parts.append(subject)
    if part:
        parts.append(part)
    if term:
        from term_utils import term_label
        parts.append(term_label(term))
    parts.append(f"Unit {unit_number}: {unit_title}")
    if section_title:
        parts.append(f"Section: {section_title}")
    if subsection_title:
        parts.append(f"Sub: {subsection_title}")
    return " | ".join(parts)


def _smart_split_text(
    text: str,
    max_size: int = CHUNK_MAX_SIZE,
    overlap: int = CHUNK_OVERLAP_SIZE,
) -> List[str]:
    """Split long text using Langchain's SemanticChunker."""
    if len(text) <= max_size:
        return [text]

    try:
        embeddings_model = get_embeddings_model()
        if not embeddings_model:
            raise Exception("No embeddings model available for semantic chunker")
            
        text_splitter = SemanticChunker(
            embeddings_model, 
            breakpoint_threshold_type="percentile"
        )
        docs = text_splitter.create_documents([text])
        return [doc.page_content for doc in docs]
    except Exception as e:
        print(f"    ⚠️  SemanticChunker failed: {e}. Falling back to basic chunking.")
        # Fallback to basic newline splitting
        paragraphs = re.split(r'\n\n+', text)
        chunks = []
        current = ""

        for para in paragraphs:
            if not para.strip():
                continue

            if len(current) + len(para) + 2 > max_size and current:
                chunks.append(current.strip())
                overlap_text = current[-overlap:] if len(current) > overlap else current
                current = overlap_text + "\n\n" + para
            else:
                current = (current + "\n\n" + para) if current else para

        if current.strip():
            chunks.append(current.strip())

        return chunks


def _serialize_content(content: Any) -> str:
    """Serialize varied content formats into a readable string.

    Handles:
    - str: returned as-is
    - list: items joined with newlines; dict items are rendered with key/value pairs
    - dict: rendered as key-value sections
    - other: converted to str
    """
    if content is None:
        return ""
    if isinstance(content, str):
        # Remove Markdown image syntax: ![alt text](url)
        content = re.sub(r'!\[.*?\]\([^)]+\)', '', content)
        # Remove standalone http/https URLs that might be floating around
        content = re.sub(r'(?i)\bhttps?://[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|/))', '', content)
        return content.strip()
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                # Exercise question format: {question, options, ...}
                q = item.get("question") or item.get("task") or item.get("quote") or ""
                line = ""
                item_id = item.get("id", "")
                if item_id:
                    line = f"{item_id}. {q}"
                elif q:
                    line = q
                # Add options
                opts = item.get("options", [])
                if opts:
                    line += "\n" + "\n".join(f"  {opt}" for opt in opts)
                # Add attribution for quotes
                attr = item.get("attribution", "")
                if attr:
                    line += f" — {attr}"
                # Add task (project work)
                task = item.get("task", "")
                if task and not q:
                    line = f"{item_id}: {task}" if item_id else task
                if line:
                    parts.append(line)
            else:
                parts.append(str(item))
        return "\n".join(parts)
    if isinstance(content, dict):
        parts = []
        for key, value in content.items():
            key_label = key.replace("_", " ")
            if isinstance(value, list):
                items_text = _serialize_content(value)
                parts.append(f"{key_label}:\n{items_text}")
            elif isinstance(value, str):
                parts.append(f"{key_label}: {value}")
            else:
                parts.append(f"{key_label}: {str(value)}")
        return "\n\n".join(parts)
    return str(content)


def _merge_sub_items_into_content(section: Dict[str, Any], global_media_map: Dict[str, Any] = None) -> str:
    """Merge a section's sub_items into a single content string.

    Exercises: each sub_item becomes a numbered question with options.
    Prose/sections: sub_items are appended as sub-content.
    Enrichment: appends concept_overview, detailed_explanation, faqs, etc.
    """
    raw_content = section.get("content")
    content = _serialize_content(raw_content).strip()
    sub_items = section.get("sub_items") or []
    stype = section.get("type", "")

    merged_parts = [content] if content else []

    # Handle Enrichment blocks (if processing enriched.json)
    enrichment = section.get("enrichment") or section.get("section_enrichment")
    if enrichment and isinstance(enrichment, dict):
        if e_overview := enrichment.get("concept_overview"):
            merged_parts.append(f"Overview: {e_overview}")
        if e_detail := enrichment.get("detailed_explanation"):
            merged_parts.append(f"Explanation: {e_detail}")
        if e_rw := enrichment.get("real_world_connections"):
            if isinstance(e_rw, list):
                merged_parts.append("Real World Connections:\n" + "\n".join(f"- {c}" for c in e_rw))
            else:
                merged_parts.append(f"Real World Connections: {e_rw}")
        if e_faqs := enrichment.get("faqs"):
            if isinstance(e_faqs, list):
                merged_parts.append("FAQs:\n" + "\n".join(f"Q: {q.get('question','')}\nA: {q.get('answer','')}" for q in e_faqs if isinstance(q, dict)))
        if e_prac := enrichment.get("practice_questions"):
            if isinstance(e_prac, list):
                merged_parts.append("Practice Questions:\n" + "\n".join(f"- {q.get('question','')}" for q in e_prac if isinstance(q, dict)))
                
        # Handle math specific enrichments
        if m_summary := enrichment.get("summary"):
            merged_parts.append(f"Summary: {m_summary}")
        if m_key := enrichment.get("key_idea"):
            merged_parts.append(f"Key Idea: {m_key}")
        if m_analogy := enrichment.get("analogy"):
            merged_parts.append(f"Analogy: {m_analogy}")
        if m_props := enrichment.get("important_properties"):
            if isinstance(m_props, list):
                merged_parts.append("Important Properties:\n" + "\n".join(f"- {p}" for p in m_props))
        if m_misc := enrichment.get("common_misconceptions"):
            if isinstance(m_misc, list):
                merged_parts.append("Common Misconceptions:\n" + "\n".join(f"- {m}" for m in m_misc))

    if sub_items:
        for sub in sub_items:
            sub_num = sub.get("number", "")
            sub_title = sub.get("title", "")
            sub_content = _serialize_content(sub.get("content")).strip()
            options = sub.get("options") or []

            if not sub_content and not options:
                continue

            # Build sub_item text
            sub_text_parts = []
            label = f"{sub_num}" if sub_num else ""
            if sub_title and sub_title != sub_num:
                label = f"{label} {sub_title}".strip() if label else sub_title

            if label:
                sub_text_parts.append(f"{label}: {sub_content}" if sub_content else label)
            elif sub_content:
                sub_text_parts.append(sub_content)

            if options:
                sub_text_parts.append("\n".join(f"  {opt}" for opt in options))

            if sub_text_parts:
                merged_parts.append("\n".join(sub_text_parts))

    # Also include metadata like solution for examples
    metadata = section.get("metadata") or {}
    if metadata.get("solution"):
        merged_parts.append(f"Solution: {metadata['solution']}")
    if metadata.get("author"):
        merged_parts.append(f"Author: {metadata['author']}")

    image_urls = []
    if isinstance(section.get("image_urls"), list):
        image_urls.extend(section["image_urls"])
    if isinstance(section.get("images"), list):
        for img in section["images"]:
            if isinstance(img, dict) and img.get("url"):
                image_urls.append(img["url"])
            elif isinstance(img, str):
                image_urls.append(img)

    sub_items_image_urls = []
    if sub_items:
        for sub in sub_items:
            sub_image_urls = []
            if isinstance(sub.get("image_urls"), list):
                sub_image_urls.extend(sub["image_urls"])
            if isinstance(sub.get("images"), list):
                for img in sub["images"]:
                    if isinstance(img, dict) and img.get("url"):
                        sub_image_urls.append(img["url"])
                    elif isinstance(img, str):
                        sub_image_urls.append(img)
            sub_items_image_urls.extend(sub_image_urls)
            
    all_image_urls = []
    seen_urls = set()
    for url in (image_urls + sub_items_image_urls):
        if url not in seen_urls:
            seen_urls.add(url)
            all_image_urls.append(url)
    
    if all_image_urls and global_media_map:
        for url in all_image_urls:
            img_data = global_media_map.get(url)
            if img_data:
                desc = img_data.get("description")
                ext_text = img_data.get("extracted_text")
                if desc or ext_text:
                    merged_parts.append("--- Associated Image Context ---")
                    if desc:
                        merged_parts.append(f"Image Description: {desc}")
                    if ext_text:
                        merged_parts.append(f"Text in Image: {ext_text}")

    return "\n\n".join(merged_parts)


def chunk_structured_content(
    structured_data: Dict[str, Any],
    document_id: str,
    document_name: str,
    board: str,
    class_number: Optional[str] = None,
    book_content: str = "structured",
    term: Optional[str] = None,
    subject: Optional[str] = None,
    part: Optional[str] = None,
) -> List[TextChunk]:
    """Semantic chunking: merge sub_items, add context headers, smart-split long content.

    This produces far fewer, higher-quality chunks than naive per-sub_item chunking.

    `term`, `subject` and `part` are document-level defaults. A per-unit value in
    the structured JSON wins over them; the default fills in when the extractor
    did not stamp the unit — which is what the agentic pipeline does, and why
    subject used to land as None on every chunk it produced.
    """
    from term_utils import normalize_term

    doc_term = normalize_term(term)
    doc_subject = subject
    doc_part = part
    chunks: List[TextChunk] = []
    chunk_index = 0

    units = structured_data.get("units", [])
    
    fallback_unit_idx = 1

    for unit in units:
        unit_number = unit.get("unit_number")
        if unit_number is None or str(unit_number).strip() == "":
            unit_number = fallback_unit_idx
        else:
            try:
                unit_number = int(unit_number)
            except ValueError:
                unit_number = fallback_unit_idx
                
        fallback_unit_idx = unit_number + 1
        
        unit_title = unit.get("unit_title") or unit.get("title", "")
        subject = unit.get("subject") or doc_subject
        part = unit.get("part") or doc_part
        unit_term = normalize_term(unit.get("term")) or doc_term

        url_to_media = {}
        media_images = unit.get("media", {}).get("images", {})
        for img_id, img_data in media_images.items():
            if isinstance(img_data, dict) and img_data.get("url"):
                url_to_media[img_data["url"]] = img_data

        # Common metadata for this unit
        def _make_meta(**overrides) -> ChunkMetadata:
            nonlocal chunk_index
            meta = ChunkMetadata(
                document_id=document_id,
                document_name=document_name,
                unit_number=unit_number,
                unit_title=unit_title,
                board=board,
                subject=subject,
                class_number=class_number,
                part=part,
                term=unit_term,
                chunk_index=chunk_index,
                book_content=book_content,
                **overrides,
            )
            chunk_index += 1
            return meta

        # The same slot can be present BOTH as a unit-level field and as a
        # section of that type. Emitting both puts two chunks for one slot into
        # the collection, so the section wins (it carries section metadata) and
        # the unit-level field is only used when no such section exists.
        _section_types = {str(s.get("type") or "").strip().lower()
                          for s in unit.get("sections", [])}

        # ── Introduction ──
        if unit.get("introduction") and "introduction" not in _section_types:
            header = _build_context_header(
                unit_number, unit_title, "Introduction",
                subject=subject, class_number=class_number, part=part,
                board=board, term=unit_term,
            )
            chunks.append(TextChunk(
                text=f"{header}\n\n{unit['introduction']}",
                metadata=_make_meta(content_type="introduction"),
            ))

        # ── Learning Objectives ──
        if unit.get("learning_objectives") and "learning_objectives" not in _section_types:
            obj_text = unit["learning_objectives"]
            if isinstance(obj_text, list):
                obj_text = "\n".join(f"• {o}" for o in obj_text)
            header = _build_context_header(
                unit_number, unit_title, "Learning Objectives",
                subject=subject, class_number=class_number, part=part,
                board=board, term=unit_term,
            )
            chunks.append(TextChunk(
                text=f"{header}\n\n{obj_text}",
                metadata=_make_meta(content_type="learning_objectives"),
            ))

        # ── Points to Remember ──
        if unit.get("points_to_remember"):
            ptr_text = unit["points_to_remember"]
            if isinstance(ptr_text, list):
                ptr_text = "\n".join(f"• {p}" for p in ptr_text)
            header = _build_context_header(
                unit_number, unit_title, "Points to Remember",
                subject=subject, class_number=class_number, part=part,
                board=board, term=unit_term,
            )
            chunks.append(TextChunk(
                text=f"{header}\n\n{ptr_text}",
                metadata=_make_meta(content_type="points_to_remember"),
            ))

        # ── Tables ──
        for table in unit.get("tables", []):
            table_content = table.get("table_content", "")
            if not table_content.strip():
                continue
            table_number = table.get("table_number", "")
            header = _build_context_header(
                unit_number, unit_title,
                f"Table {table_number}" if table_number else "Table",
                subject=subject, class_number=class_number, part=part,
                board=board, term=unit_term,
            )
            chunks.append(TextChunk(
                text=f"{header}\n\n{table_content}",
                metadata=_make_meta(
                    content_type="table",
                    table_number=table_number,
                ),
            ))

        # ── Sections (main content) ──
        for section in unit.get("sections", []):
            section_title = (
                section.get("section_title")
                or section.get("title")
                or section.get("id")
                or ""
            )
            section_type = section.get("type", "section")

            # Merge sub_items into the section content
            merged_content = _merge_sub_items_into_content(section, url_to_media)
            if not merged_content.strip():
                continue

            # Build context header
            header = _build_context_header(
                unit_number, unit_title, section_title,
                subject=subject, class_number=class_number, part=part,
                board=board, term=unit_term,
            )

            # Smart-split if too large, or keep as single chunk
            text_with_context = f"{header}\n\n{merged_content}"

            if len(text_with_context) <= CHUNK_MAX_SIZE:
                # Single chunk — ideal case
                chunks.append(TextChunk(
                    text=text_with_context,
                    metadata=_make_meta(
                        content_type=section_type,
                        section_title=section_title,
                    ),
                ))
            else:
                # Split into multiple chunks, each with context header
                content_parts = _smart_split_text(merged_content)
                for part_idx, part_text in enumerate(content_parts):
                    part_header = header
                    if len(content_parts) > 1:
                        part_header += f" (Part {part_idx + 1}/{len(content_parts)})"
                    chunks.append(TextChunk(
                        text=f"{part_header}\n\n{part_text}",
                        metadata=_make_meta(
                            content_type=section_type,
                            section_title=section_title,
                        ),
                    ))

            # ── Sub-sections (nested inline items: examples, activities, etc.) ──
            # These were moved from top-level sections into parent's sub_sections
            for sub_sec in section.get("sub_sections", []):
                sub_sec_title = (
                    sub_sec.get("title")
                    or sub_sec.get("id")
                    or ""
                )
                sub_sec_type = sub_sec.get("type", "other")

                sub_merged = _merge_sub_items_into_content(sub_sec, url_to_media)
                if not sub_merged.strip():
                    continue

                # Include parent section in context for better search relevance
                sub_header = _build_context_header(
                    unit_number, unit_title, section_title,
                    subsection_title=sub_sec_title,
                    subject=subject, class_number=class_number, part=part,
                    board=board, term=unit_term,
                )

                sub_text = f"{sub_header}\n\n{sub_merged}"

                if len(sub_text) <= CHUNK_MAX_SIZE:
                    chunks.append(TextChunk(
                        text=sub_text,
                        metadata=_make_meta(
                            content_type=sub_sec_type,
                            section_title=section_title,
                            subsection_title=sub_sec_title,
                        ),
                    ))
                else:
                    sub_parts = _smart_split_text(sub_merged)
                    for sp_idx, sp_text in enumerate(sub_parts):
                        sp_header = sub_header
                        if len(sub_parts) > 1:
                            sp_header += f" (Part {sp_idx + 1}/{len(sub_parts)})"
                        chunks.append(TextChunk(
                            text=f"{sp_header}\n\n{sp_text}",
                            metadata=_make_meta(
                                content_type=sub_sec_type,
                                section_title=section_title,
                                subsection_title=sub_sec_title,
                            ),
                        ))

    # ── Filter out tiny chunks ──
    # Merge chunks below minimum size with adjacent content.
    # Merging keeps the EARLIER chunk's metadata, so it must never cross a unit
    # or term boundary — otherwise a short Unit 2 / Term 2 chunk gets served
    # under Unit 1 / Term 1's label and term filtering silently returns it.
    def _mergeable(prev_meta: ChunkMetadata, meta: ChunkMetadata) -> bool:
        return prev_meta.unit_number == meta.unit_number and prev_meta.term == meta.term

    if chunks:
        final_chunks = []
        pending_text = ""
        pending_meta = None

        for chunk in chunks:
            too_small = len(chunk.text) < CHUNK_MIN_SIZE
            if too_small and pending_meta is not None and _mergeable(pending_meta, chunk.metadata):
                # Merge small chunk with pending
                pending_text += "\n\n" + chunk.text
            elif too_small and final_chunks and _mergeable(final_chunks[-1].metadata, chunk.metadata):
                # Merge small chunk with previous
                final_chunks[-1] = TextChunk(
                    text=final_chunks[-1].text + "\n\n" + chunk.text,
                    metadata=final_chunks[-1].metadata,
                )
            else:
                if pending_text and pending_meta:
                    final_chunks.append(TextChunk(text=pending_text, metadata=pending_meta))
                pending_text = chunk.text
                pending_meta = chunk.metadata

        if pending_text and pending_meta:
            final_chunks.append(TextChunk(text=pending_text, metadata=pending_meta))

        chunks = final_chunks

    return chunks



# DEDUPLICATION — delete old chunks before re-uploading


def _delete_existing_chunks(
    client: "QdrantClient",
    document_id: str,
    collection_name: str,
) -> int:
    """Delete all existing chunks for a document before re-uploading.

    Returns the number of deleted points.
    """
    try:
        # Use scroll to find all points with this document_id
        deleted = client.delete(
            collection_name=collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            ),
        )
        print(f"  🗑️  Deleted existing chunks for document '{document_id}'")
        return 1  # Qdrant batch delete doesn't return count
    except Exception as e:
        print(f"  ⚠️  Could not delete old chunks: {e}")
        return 0



# UPLOAD TO QDRANT


def upsert_chunks_to_qdrant(
    client: "QdrantClient",
    chunks: List[TextChunk],
    embeddings_model: Any,
    collection_name: Optional[str] = None,
) -> bool:
    """Upload chunks with embeddings to Qdrant using LangChain."""
    if not client or not chunks or not embeddings_model:
        return False

    collection = collection_name or os.environ.get(
        "QDRANT_COLLECTION_NAME", DEFAULT_COLLECTION_NAME
    )

    try:
        documents = []
        for chunk in chunks:
            metadata = {
                "document_id": chunk.metadata.document_id,
                "document_name": chunk.metadata.document_name,
                "unit_number": chunk.metadata.unit_number,
                "unit_title": chunk.metadata.unit_title,
                "content_type": chunk.metadata.content_type,
                "board": chunk.metadata.board,
                "chunk_index": chunk.metadata.chunk_index,
                "book_content": chunk.metadata.book_content,
            }
            # Optional fields — only include if present
            for attr in ("subject", "class_number", "part", "term", "section_title",
                         "subsection_title", "table_number", "enrichment_type",
                         "difficulty"):
                val = getattr(chunk.metadata, attr, None)
                if val:
                    metadata[attr] = val

            documents.append(Document(page_content=chunk.text, metadata=metadata))

        vector_store = QdrantVectorStore(
            client=client,
            collection_name=collection,
            embedding=embeddings_model,
        )

        vector_store.add_documents(documents)
        print(f"Successfully uploaded {len(documents)} chunks to '{collection}'")
        return True

    except Exception as e:
        print(f"Failed to upload chunks to Qdrant: {e}")
        return False


def process_and_upload_document(
    structured_json_path: Path,
    document_id: str,
    document_name: str,
    board: str,
    class_number: Optional[str] = None,
    book_content: str = "structured",
    qdrant_client: Optional["QdrantClient"] = None,
    collection_name: Optional[str] = None,
    term: Optional[str] = None,
    subject: Optional[str] = None,
    part: Optional[str] = None,
) -> bool:
    """Process a structured.json file and upload chunks to Qdrant.

    Advanced features:
    - Deduplicates by deleting old chunks for the same document_id
    - Uses intelligent chunking (merged sub_items, context headers)
    - Supports class_number metadata for multi-grade filtering
    - Supports term metadata for term-split state books
    """
    if not QDRANT_AVAILABLE:
        print("Warning: Qdrant integration skipped: missing dependencies")
        return False

    if not qdrant_client:
        qdrant_client = initialize_qdrant_client()
        if not qdrant_client:
            return False

    collection = collection_name or os.environ.get(
        "QDRANT_COLLECTION_NAME", DEFAULT_COLLECTION_NAME
    )

    if not create_collection_if_not_exists(qdrant_client, collection):
        return False

    try:
        with open(structured_json_path, 'rb') as f:
            structured_data = orjson.loads(f.read())
    except Exception as e:
        print(f"Failed to load {structured_json_path}: {e}")
        return False

    # ── Deduplication: delete old chunks first ──
    _delete_existing_chunks(qdrant_client, document_id, collection)

    # ── Chunk with advanced engine ──
    print(f"  Chunking document: {document_name} (board={board}, class={class_number}, "
          f"subject={subject or 'from-units'}, term={term or 'n/a'}, book_content={book_content})")
    chunks = chunk_structured_content(
        structured_data, document_id, document_name, board,
        class_number=class_number, book_content=book_content, term=term,
        subject=subject, part=part,
    )

    # Loud warning: a chunk without a subject is invisible to every
    # subject-filtered query, which is most of the retrieval surface.
    if chunks:
        missing = sum(1 for c in chunks if not c.metadata.subject)
        if missing:
            print(f"  WARNING: {missing}/{len(chunks)} chunks have no subject - "
                  f"they will not match subject-filtered searches")

    if not chunks:
        print(f"Warning: No chunks generated from {document_name}")
        return False

    print(f"  Generated {len(chunks)} chunks (semantic chunking)")

    # ── Generate embeddings & upload ──
    print(f"  Generating embeddings...")
    embeddings_model = get_embeddings_model()
    if not embeddings_model:
        return False

    print(f"  Uploading to Qdrant...")
    success = upsert_chunks_to_qdrant(
        qdrant_client, chunks, embeddings_model, collection
    )
    return success



# SEARCH


def search_qdrant(
    query: str,
    collection_name: Optional[str] = None,
    limit: int = 5,
    unit_filter: Optional[int] = None,
    unit_title_filter: Optional[str] = None,
    content_type_filter: Optional[str] = None,
    class_filter: Optional[str] = None,
    subject_filter: Optional[str] = None,
    board_filter: Optional[str] = None,
    qdrant_client: Optional["QdrantClient"] = None,
    term_filter: Optional[Any] = None,
    term_strict: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    """Search Qdrant with optional filters for unit, content_type, class, subject and term.

    `term_filter` accepts a single term or a list of them ("2", "Term 2",
    ["term_1", "term_2"], "1,2"). A list is the normal case for exams, which
    span a scope of terms rather than one — see term_utils.exam_to_terms.

    `term_strict` controls what happens to chunks that carry NO term:
      - False (default): they still match. Required while the collection holds
        pre-term chunks, and permanently correct for non-term boards
        (CBSE/NCERT), whose books are never term-split.
      - True: only chunks carrying one of the requested terms match.
    Defaults to the TERM_FILTER_STRICT env var, else False. Do not turn this on
    globally until the term backfill has run, or every legacy chunk in the
    collection becomes invisible the moment a term is passed.
    """
    if not QDRANT_AVAILABLE:
        return []

    collection = collection_name or os.environ.get(
        "QDRANT_COLLECTION_NAME", DEFAULT_COLLECTION_NAME
    )

    from term_utils import normalize_term, normalize_terms

    terms = normalize_terms(term_filter)
    if term_strict is None:
        strict_terms = os.environ.get("TERM_FILTER_STRICT", "").strip().lower() in ("1", "true", "yes")
    else:
        strict_terms = bool(term_strict)

    try:
        client = qdrant_client or initialize_qdrant_client()
        if not client:
            return []

        embeddings_model = get_embeddings_model()
        if not embeddings_model:
            return []

        vector_store = QdrantVectorStore(
            client=client,
            collection_name=collection,
            embedding=embeddings_model,
        )

        # Build filter from all criteria
        conditions = []
        if unit_filter is not None:
            try:
                # Must be int since the Qdrant index is created as 'integer' on metadata.unit_number
                unit_val = int(unit_filter)
                conditions.append(
                    FieldCondition(key="metadata.unit_number", match=MatchValue(value=unit_val))
                )
            except (ValueError, TypeError):
                pass
        if unit_title_filter is not None:
            conditions.append(
                FieldCondition(key="metadata.unit_title", match=MatchValue(value=unit_title_filter))
            )
        if content_type_filter is not None:
            conditions.append(
                FieldCondition(key="metadata.content_type", match=MatchValue(value=content_type_filter))
            )
        if class_filter is not None:
            class_num_str = str(class_filter).replace("Class ", "").replace("class ", "").strip()
            conditions.append(
                Filter(should=[
                    FieldCondition(key="metadata.class_number", match=MatchValue(value=class_filter)),
                    FieldCondition(key="metadata.class_number", match=MatchValue(value=f"Class {class_num_str}")),
                    FieldCondition(key="metadata.class_number", match=MatchValue(value=class_num_str)),
                ])
            )
        if subject_filter is not None:
            conditions.append(
                Filter(should=[
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject_filter)),
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject_filter.lower())),
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject_filter.capitalize())),
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject_filter.title())),
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject_filter.upper())),
                ])
            )
        if board_filter is not None:
            conditions.append(
                Filter(should=[
                    FieldCondition(key="metadata.board", match=MatchValue(value=board_filter)),
                    FieldCondition(key="metadata.board", match=MatchValue(value=board_filter.lower())),
                    FieldCondition(key="metadata.board", match=MatchValue(value=board_filter.upper())),
                    FieldCondition(key="metadata.board", match=MatchValue(value=board_filter.title())),
                    # "State Board".capitalize() -> "State board", which is how the
                    # agentic upload path actually stores it. Without this variant a
                    # correctly-spelled board filter matches nothing.
                    FieldCondition(key="metadata.board", match=MatchValue(value=board_filter.capitalize())),
                    FieldCondition(key="metadata.board", match=MatchValue(value="State Board" if "state" in board_filter.lower() else board_filter)),
                ])
            )
        # Terms are canonicalized on write, so one exact MatchAny covers the
        # scope — no casing fan-out needed like board/subject above.
        if terms:
            term_match = FieldCondition(key="metadata.term", match=MatchAny(any=terms))
            if strict_terms:
                conditions.append(term_match)
            else:
                conditions.append(
                    Filter(should=[
                        term_match,
                        IsEmptyCondition(is_empty=PayloadField(key="metadata.term")),
                    ])
                )

        filter_qdrant = Filter(must=conditions) if conditions else None

        try:
            results = vector_store.similarity_search(
                query, k=limit, filter=filter_qdrant
            )
        except Exception as e:
            err_str = str(e)
            if "Index required but not found" in err_str or "Bad Request" in err_str:
                # ASCII only: this recovery path runs on a console that may be
                # cp1252 (Windows). A UnicodeEncodeError here would be caught by
                # the outer handler and silently turn a recoverable missing-index
                # into an empty result set.
                print("  [Qdrant] WARNING: missing index detected. Attempting to create indexes...")
                try:
                    ensure_payload_indexes(client, collection)
                    time.sleep(1) # Wait briefly for background indexing to start
                    results = vector_store.similarity_search(query, k=limit, filter=filter_qdrant)
                except Exception as retry_e:
                    print(f"  [Qdrant] WARNING: index retry failed: {retry_e}. Falling back to manual filtering.")
                    raw_results = vector_store.similarity_search(query, k=limit * 10, filter=None)
                    
                    results = []
                    for r in raw_results:
                        meta = r.metadata
                        
                        if unit_filter is not None:
                            try:
                                if meta.get("unit_number") != int(unit_filter): continue
                            except (ValueError, TypeError): pass
                            
                        if unit_title_filter is not None and meta.get("unit_title") != unit_title_filter: continue
                        if class_filter is not None:
                            meta_class = str(meta.get("class_number", ""))
                            c_num = str(class_filter).replace("Class ", "").replace("class ", "").strip()
                            if meta_class != class_filter and meta_class != f"Class {c_num}" and meta_class != c_num: continue
                            
                        if subject_filter is not None and str(meta.get("subject", "")).lower() != str(subject_filter).lower(): continue
                        
                        if board_filter is not None:
                            meta_board = str(meta.get("board", "")).lower()
                            b_f = str(board_filter).lower()
                            if meta_board != b_f and not (b_f == "state board" and "state" in meta_board) and not ("state board" in b_f and "state" in meta_board): continue

                        if terms:
                            # Mirror the Qdrant-side rule: term-less chunks pass unless strict.
                            meta_term = normalize_term(meta.get("term"))
                            if meta_term is None:
                                if strict_terms: continue
                            elif meta_term not in terms: continue

                        results.append(r)
                        if len(results) >= limit:
                            break
            else:
                raise e

        return [
            {"text": doc.page_content, "metadata": doc.metadata}
            for doc in results
        ]

    except Exception as e:
        print(f"Error searching Qdrant: {e}")
        return []



# ENV HELPER


def load_env():
    """Load environment variables from .env files."""
    for env_file in (".env.local", ".env"):
        if Path(env_file).exists():
            load_dotenv(dotenv_path=env_file)
            break
