"""
Text Highlighting Feature — Explain, Summarize & Ask AI

RAG-powered highlighting actions for GradeUp:
- Explain: Detailed explanation of highlighted text using textbook context + TTS audio
- Summarize: Concise summary of highlighted text using textbook context + TTS audio
- Ask AI: Multi-turn chat about highlighted text (stateless, no history stored)

All responses are generated using RAG (retrieval-augmented generation) from Qdrant.
TTS audio is generated via OpenAI TTS API and stored in S3.
Highlight metadata is stored in Qdrant for future reference.

Content Safety: All prompts enforce study-only content for school students up to 12th class.
"""

import os
import time
import uuid
import hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ─────────────────────────────────────────────────────────────

HIGHLIGHT_MODEL = "gpt-4o-mini"
HIGHLIGHT_FALLBACK_MODEL = "gpt-4o"
HIGHLIGHT_TIMEOUT = 60
HIGHLIGHT_RAG_TOP_K = 5

TTS_MODEL = "tts-1"
TTS_VOICE = "alloy"
TTS_SPEED = 1.0

import logging

logger = logging.getLogger("gradeup-highlight")


# ── RAG Context Retrieval ─────────────────────────────────────────────────────


def _retrieve_rag_context(
    query: str,
    board: Optional[str] = None,
    class_number: Optional[str] = None,
    subject: Optional[str] = None,
    unit_number: Optional[int] = None,
    limit: int = HIGHLIGHT_RAG_TOP_K,
) -> List[Dict[str, Any]]:
    """Retrieve relevant chunks from Qdrant for the highlighted text."""
    try:
        from ai_tutor import retrieve_context
        return retrieve_context(
            query=query,
            board=board,
            class_number=class_number,
            subject=subject,
            unit_number=unit_number,
            limit=limit,
        )
    except ImportError:
        logger.warning("ai_tutor module not available for RAG retrieval")
        return []


def _format_context(chunks: List[Dict[str, Any]]) -> str:
    """Format retrieved chunks into a context block for the LLM."""
    if not chunks:
        return ""

    parts = []
    for i, chunk in enumerate(chunks, 1):
        text = chunk.get("text", "").strip()
        meta = chunk.get("metadata", {})
        source = meta.get("section_title") or meta.get("content_type") or "content"
        unit = meta.get("unit_number", "?")
        parts.append(f"[Source {i} — Unit {unit}, {source}]\n{text}")

    return "\n\n---\n\n".join(parts)


# ── System Prompts ────────────────────────────────────────────────────────────


_EXPLAIN_SYSTEM_PROMPT = """You are GradeUp Study Assistant — a friendly, knowledgeable tutor for school students (up to 12th class).

## YOUR TASK
The student has highlighted a piece of text from their textbook and wants you to EXPLAIN it clearly.

## INSTRUCTIONS
- Use the RETRIEVED CONTEXT from the student's textbook as your primary source of truth.
- Provide a clear, detailed, and easy-to-understand explanation of the highlighted text.
- Break down complex concepts into simpler parts.
- Use examples, analogies, or real-world connections that school students can relate to.
- If the highlighted text contains a definition, explain the key terms.
- If it's a formula or equation, explain each variable and how it works.
- Keep the language simple and encouraging.
- Structure your response with bullet points or numbered steps when helpful.

## STRICT SAFETY RULES — ABSOLUTE ZERO TOLERANCE
- You are a STUDY assistant. You ONLY provide academic/educational content.
- NEVER produce 18+, sexual, violent, harmful, abusive, or inappropriate content.
- NEVER help with cheating, plagiarism, or academic dishonesty.
- If the highlighted text contains inappropriate content, respond with:
  "I can only help with study-related content! Please highlight something from your textbook."
- Do NOT engage with or acknowledge harmful content — just redirect to studies.

## CONTEXT
Subject: {subject}
Board: {board}
Class: {class_number}
"""

_SUMMARIZE_SYSTEM_PROMPT = """You are GradeUp Study Assistant — a friendly, knowledgeable tutor for school students (up to 12th class).

## YOUR TASK
The student has highlighted a piece of text from their textbook and wants you to SUMMARIZE it concisely.

## INSTRUCTIONS
- Use the RETRIEVED CONTEXT from the student's textbook as your primary source of truth.
- Provide a concise, clear summary of the highlighted text.
- Capture all the key points and essential information.
- Remove unnecessary details while keeping the core meaning intact.
- Use simple language appropriate for school students.
- Keep the summary brief — ideally 3-5 bullet points or a short paragraph.
- Highlight the most important takeaway.

## STRICT SAFETY RULES — ABSOLUTE ZERO TOLERANCE
- You are a STUDY assistant. You ONLY provide academic/educational content.
- NEVER produce 18+, sexual, violent, harmful, abusive, or inappropriate content.
- NEVER help with cheating, plagiarism, or academic dishonesty.
- If the highlighted text contains inappropriate content, respond with:
  "I can only help with study-related content! Please highlight something from your textbook."
- Do NOT engage with or acknowledge harmful content — just redirect to studies.

## CONTEXT
Subject: {subject}
Board: {board}
Class: {class_number}
"""

_ASK_AI_SYSTEM_PROMPT = """You are GradeUp Study Assistant — a friendly, knowledgeable tutor for school students (up to 12th class).

## YOUR TASK
The student has highlighted a piece of text from their textbook and wants to ask questions about it.
You are having a conversation with the student about the highlighted text.

## INSTRUCTIONS
- Use the RETRIEVED CONTEXT from the student's textbook as your primary source of truth.
- Answer the student's questions about the highlighted text clearly and accurately.
- If the context contains the answer, use it. You may rephrase or simplify for the student.
- If the context does not cover the question, say so honestly — do NOT make up facts.
- Be conversational and supportive — like a great teacher having a discussion.
- Use examples and analogies to make concepts relatable.
- Keep responses focused on the highlighted text and related academic topics.

## STRICT SAFETY RULES — ABSOLUTE ZERO TOLERANCE
- You are a STUDY assistant. You ONLY answer questions related to academics and education.
- ✅ Answer: textbook topics, concepts, definitions, explanations, study tips
- ❌ Refuse: personal advice, entertainment, gossip, jokes unrelated to studies, coding, recipes, games
- NEVER produce 18+, sexual, violent, harmful, abusive, or inappropriate content.
- NEVER help with cheating, plagiarism, or academic dishonesty.
- If the student sends inappropriate content, respond with:
  "I'm here to help you study! Let's focus on your textbook. What would you like to learn about the highlighted text?"
- Do NOT engage with or acknowledge harmful content — just redirect to studies.

## CONTEXT
Subject: {subject}
Board: {board}
Class: {class_number}

## HIGHLIGHTED TEXT
\"\"\"{highlighted_text}\"\"\"
"""


# ── LLM Call ──────────────────────────────────────────────────────────────────


def _call_llm(
    messages: List[Dict[str, str]],
    model: str = HIGHLIGHT_MODEL,
    max_tokens: int = 2048,
    temperature: float = 0.7,
) -> str:
    """Call OpenAI chat completion API."""
    api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return "Sorry, the AI service is not configured correctly. Please contact your administrator."

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "max_completion_tokens": max_tokens,
        "temperature": temperature,
    }

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=HIGHLIGHT_TIMEOUT,
        )

        if not resp.ok:
            # Try fallback model
            payload["model"] = HIGHLIGHT_FALLBACK_MODEL
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=HIGHLIGHT_TIMEOUT,
            )

        if resp.ok:
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
        else:
            logger.error(f"LLM API error: {resp.status_code} {resp.text[:300]}")
            return "I'm having trouble generating a response right now. Please try again!"

    except requests.Timeout:
        return "The response is taking too long. Please try again with a shorter text!"
    except Exception as e:
        logger.error(f"LLM call error: {e}")
        return "Something went wrong. Please try again!"


# ── TTS Audio Generation ─────────────────────────────────────────────────────


def _generate_tts_audio(text: str) -> Optional[bytes]:
    """Generate TTS audio using OpenAI TTS API.

    Returns audio bytes (MP3) or None on failure.
    """
    api_key = os.environ.get("OPENAI_API_KEY_TTS") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.error("No TTS API key configured")
        return None

    # Truncate very long text for TTS (OpenAI TTS has a 4096 char limit)
    tts_text = text[:4000] if len(text) > 4000 else text

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": TTS_MODEL,
        "input": tts_text,
        "voice": TTS_VOICE,
        "speed": TTS_SPEED,
        "response_format": "mp3",
    }

    try:
        resp = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers=headers,
            json=payload,
            timeout=120,
        )

        if resp.ok:
            logger.info(f"TTS generated: {len(resp.content)} bytes")
            return resp.content
        else:
            logger.error(f"TTS API error: {resp.status_code} {resp.text[:300]}")
            return None

    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        return None


# ── S3 Audio Upload ──────────────────────────────────────────────────────────


def _upload_audio_to_s3(
    audio_bytes: bytes,
    board: str,
    class_number: str,
    subject: str,
    action: str,
) -> Optional[str]:
    """Upload TTS audio to S3 and return the public URL."""
    try:
        from s3_storage import upload_audio_to_s3
        filename = f"{action}_{uuid.uuid4().hex[:12]}.mp3"
        return upload_audio_to_s3(
            audio_bytes=audio_bytes,
            filename=filename,
            board=board,
            class_number=class_number,
            subject=subject,
        )
    except ImportError:
        logger.error("s3_storage module not available")
        return None
    except Exception as e:
        logger.error(f"S3 audio upload error: {e}")
        return None


# ── Qdrant Storage ───────────────────────────────────────────────────────────


def _store_highlight_in_qdrant(
    highlighted_text: str,
    response: str,
    action: str,
    audio_url: Optional[str],
    board: str,
    class_number: str,
    subject: str,
    unit_number: Optional[int] = None,
) -> bool:
    """Store highlight metadata as a point in Qdrant.

    Uses a nested 'metadata' structure to support 'metadata.' filters.
    Embeds ONLY the highlighted_text to enable reuse search.
    """
    try:
        from qdrant_integration import (
            initialize_qdrant_client,
            create_collection_if_not_exists,
            get_embeddings_model,
        )
        from qdrant_client.models import PointStruct
        import uuid
        from datetime import datetime, timezone

        client = initialize_qdrant_client()
        if not client:
            return False

        collection = "Gradeup_Highlights"
        create_collection_if_not_exists(client, collection)

        embeddings_model = get_embeddings_model()
        if not embeddings_model:
            return False

        # Build the vector from the highlighted_text ONLY
        vector = embeddings_model.embed_query(highlighted_text)

        # Build a deterministic ID based on the context to avoid duplicates
        # hashing: board, class, subject, text, action
        id_seed = f"{board}:{class_number}:{subject}:{highlighted_text}:{action}"
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, id_seed))

        # Build the payload
        # Structure payload to match what search_qdrant expects (nested metadata)
        payload = {
            "highlighted_text": highlighted_text,
            "response": response,
            "action": action,
            "audio_url": audio_url or "",
            "metadata": {
                "board": board,
                "class_number": class_number,
                "subject": subject,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        if unit_number is not None:
            payload["metadata"]["unit_number"] = unit_number

        # Use raw client to ensure exact payload structure (no LangChain flattening)
        client.upsert(
            collection_name=collection,
            points=[
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload
                )
            ]
        )

        logger.info(f"Stored/Updated highlight in Qdrant (action={action})")
        return True

    except Exception as e:
        logger.error(f"Failed to store highlight in Qdrant: {e}")
        return False


def _search_existing_highlight(
    text: str,
    action: str,
    board: str,
    class_number: str,
    subject: str,
    threshold: float = 0.80,
) -> Optional[Dict[str, Any]]:
    """Search for an existing highlight match to reuse the response."""
    try:
        from qdrant_integration import (
            initialize_qdrant_client,
            get_embeddings_model,
        )
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        client = initialize_qdrant_client()
        if not client: return None

        collection = "Gradeup_Highlights"
        embeddings_model = get_embeddings_model()
        if not embeddings_model: return None

        vector = embeddings_model.embed_query(text)

        results = client.query_points(
            collection_name=collection,
            query=vector,
            query_filter=Filter(
                must=[
                    FieldCondition(key="metadata.board", match=MatchValue(value=board)),
                    FieldCondition(key="metadata.class_number", match=MatchValue(value=class_number)),
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject)),
                    FieldCondition(key="action", match=MatchValue(value=action)),
                ]
            ),
            limit=1,
            score_threshold=threshold,
        ).points

        if results:
            match = results[0]
            logger.info(f"Reusing existing highlight (score={match.score:.4f})")
            return match.payload

        return None
    except Exception as e:
        logger.error(f"Error searching for existing highlight: {e}")
        return None


# ── Main Functions ────────────────────────────────────────────────────────────


def highlight_explain(
    highlighted_text: str,
    board: str = "CBSE",
    class_number: str = "",
    subject: str = "",
    unit_number: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Explain highlighted text using RAG + LLM + TTS.

    1. Checks for similar existing highlight in Qdrant (Reuse)
    2. Retrieves relevant context from Qdrant if no reuse
    3. Generates a detailed explanation via LLM
    4. Stores metadata in Qdrant
    5. Returns response + audio_url (generated on-demand via /read)
    """
    start_time = time.time()

    # 0. Check for existing similar highlight to reuse (Cosine Similarity Reuse)
    existing = _search_existing_highlight(
        text=highlighted_text,
        action="explain",
        board=board,
        class_number=class_number,
        subject=subject,
    )
    if existing:
        return {
            "highlighted_text": highlighted_text,
            "response": existing.get("response"),
            "action": "explain",
            "audio_url": existing.get("audio_url") or None,
            "reused": True,
            "response_time_seconds": round(time.time() - start_time, 2),
        }

    # 1. Retrieve RAG context
    chunks = _retrieve_rag_context(
        query=highlighted_text,
        board=board,
        class_number=class_number,
        subject=subject,
        unit_number=unit_number,
    )
    context_text = _format_context(chunks)

    # 2. Generate explanation
    system_prompt = _EXPLAIN_SYSTEM_PROMPT.format(
        subject=subject or "General",
        board=board,
        class_number=class_number or "Not specified",
    )

    user_message = ""
    if context_text:
        user_message = (
            f"Here is relevant content from the textbook:\n\n"
            f"---BEGIN TEXTBOOK CONTEXT---\n{context_text}\n---END TEXTBOOK CONTEXT---\n\n"
            f"Please explain the following highlighted text:\n\"\"\"{highlighted_text}\"\"\""
        )
    else:
        user_message = (
            f"(No relevant textbook content was found for this text.)\n\n"
            f"Please explain the following highlighted text:\n\"\"\"{highlighted_text}\"\"\""
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    response = _call_llm(messages)

    # 3. Store in Qdrant (without audio_url yet)
    _store_highlight_in_qdrant(
        highlighted_text=highlighted_text,
        response=response,
        action="explain",
        audio_url=None,
        board=board,
        class_number=class_number,
        subject=subject,
        unit_number=unit_number,
    )

    elapsed = time.time() - start_time

    # 4. Build sources
    sources = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        sources.append({
            "section_title": meta.get("section_title", ""),
            "content_type": meta.get("content_type", ""),
            "unit_number": meta.get("unit_number"),
            "unit_title": meta.get("unit_title", ""),
        })

    return {
        "highlighted_text": highlighted_text,
        "response": response,
        "action": "explain",
        "audio_url": None, # Will be generated on-demand via /highlight/read
        "sources": sources,
        "context_chunks_used": len(chunks),
        "response_time_seconds": round(elapsed, 2),
        "reused": False,
        "generated": True,
    }


def highlight_summarize(
    highlighted_text: str,
    board: str = "CBSE",
    class_number: str = "",
    subject: str = "",
    unit_number: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Summarize highlighted text using RAG + LLM + TTS.

    Same flow as explain but generates a concise summary instead.
    """
    start_time = time.time()

    # 0. Check for existing similar highlight to reuse (Cosine Similarity Reuse)
    existing = _search_existing_highlight(
        text=highlighted_text,
        action="summarize",
        board=board,
        class_number=class_number,
        subject=subject,
    )
    if existing:
        return {
            "highlighted_text": highlighted_text,
            "response": existing.get("response"),
            "action": "summarize",
            "audio_url": existing.get("audio_url") or None,
            "reused": True,
            "response_time_seconds": round(time.time() - start_time, 2),
        }

    # 1. Retrieve RAG context
    chunks = _retrieve_rag_context(
        query=highlighted_text,
        board=board,
        class_number=class_number,
        subject=subject,
        unit_number=unit_number,
    )
    context_text = _format_context(chunks)

    # 2. Generate summary
    system_prompt = _SUMMARIZE_SYSTEM_PROMPT.format(
        subject=subject or "General",
        board=board,
        class_number=class_number or "Not specified",
    )

    user_message = ""
    if context_text:
        user_message = (
            f"Here is relevant content from the textbook:\n\n"
            f"---BEGIN TEXTBOOK CONTEXT---\n{context_text}\n---END TEXTBOOK CONTEXT---\n\n"
            f"Please summarize the following highlighted text:\n\"\"\"{highlighted_text}\"\"\""
        )
    else:
        user_message = (
            f"(No relevant textbook content was found for this text.)\n\n"
            f"Please summarize the following highlighted text:\n\"\"\"{highlighted_text}\"\"\""
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    response = _call_llm(messages)

    # 3. Store in Qdrant (without audio_url yet)
    _store_highlight_in_qdrant(
        highlighted_text=highlighted_text,
        response=response,
        action="summarize",
        audio_url=None,
        board=board,
        class_number=class_number,
        subject=subject,
        unit_number=unit_number,
    )

    elapsed = time.time() - start_time

    # 4. Build sources
    sources = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        sources.append({
            "section_title": meta.get("section_title", ""),
            "content_type": meta.get("content_type", ""),
            "unit_number": meta.get("unit_number"),
            "unit_title": meta.get("unit_title", ""),
        })

    return {
        "highlighted_text": highlighted_text,
        "response": response,
        "action": "summarize",
        "audio_url": None, # Will be generated on-demand via /highlight/read
        "sources": sources,
        "context_chunks_used": len(chunks),
        "response_time_seconds": round(elapsed, 2),
        "reused": False,
        "generated": True,
    }


def highlight_ask_ai(
    highlighted_text: str,
    messages_history: List[Dict[str, str]],
    board: str = "CBSE",
    class_number: str = "",
    subject: str = "",
    unit_number: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Chat with AI about highlighted text using RAG.

    Stateless: the frontend sends the full messages array each call.
    No server-side history is stored.
    No TTS audio is generated.
    """
    start_time = time.time()

    # 1. Retrieve RAG context using the latest user message + highlighted text
    latest_user_message = ""
    for msg in reversed(messages_history):
        if msg.get("role") == "user":
            latest_user_message = msg.get("content", "")
            break

    search_query = f"{highlighted_text} {latest_user_message}".strip()

    chunks = _retrieve_rag_context(
        query=search_query,
        board=board,
        class_number=class_number,
        subject=subject,
        unit_number=unit_number,
    )
    context_text = _format_context(chunks)

    # 2. Build conversation messages
    system_prompt = _ASK_AI_SYSTEM_PROMPT.format(
        subject=subject or "General",
        board=board,
        class_number=class_number or "Not specified",
        highlighted_text=highlighted_text,
    )

    llm_messages = [{"role": "system", "content": system_prompt}]

    # Add RAG context as a system-level injection before the conversation
    if context_text:
        llm_messages.append({
            "role": "system",
            "content": (
                f"Here is relevant content from the student's textbook:\n\n"
                f"---BEGIN TEXTBOOK CONTEXT---\n{context_text}\n---END TEXTBOOK CONTEXT---\n\n"
                f"Use this context to answer the student's questions accurately."
            ),
        })

    # Add conversation history (last 20 messages to stay within context window)
    for msg in messages_history[-20:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content:
            llm_messages.append({"role": role, "content": content})

    # 3. Generate response
    response = _call_llm(llm_messages)

    elapsed = time.time() - start_time

    # 4. Build sources
    sources = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        sources.append({
            "section_title": meta.get("section_title", ""),
            "content_type": meta.get("content_type", ""),
            "unit_number": meta.get("unit_number"),
            "unit_title": meta.get("unit_title", ""),
        })

    return {
        "highlighted_text": highlighted_text,
        "response": response,
        "action": "ask_ai",
        "sources": sources,
        "context_chunks_used": len(chunks),
        "response_time_seconds": round(elapsed, 2),
    }


def highlight_read(
    highlighted_text: str,
    action: str = "explain",
    board: str = "CBSE",
    class_number: str = "",
    subject: str = "",
    unit_number: Optional[int] = None,
    response_text: Optional[str] = None, # Optional for backward compatibility/manual overrides
) -> Dict[str, Any]:
    """
    Generate TTS audio for a highlight.
    Autonomous: Fetches response from Qdrant or generates it if missing.

    1. Search Qdrant for the highlight (Reuse)
    2. If found with audio_url -> Reuse audio
    3. If found with response only -> Generate TTS for that response
    4. If not found -> Generate response first, then TTS
    """
    start_time = time.time()

    # 1. Search for existing highlight
    # (High threshold for exact match)
    existing = _search_existing_highlight(
        text=highlighted_text,
        action=action,
        board=board,
        class_number=class_number,
        subject=subject,
        threshold=0.80,
    )

    final_response_text = response_text
    audio_url = None
    was_generated = False

    if existing:
        final_response_text = existing.get("response")
        audio_url = existing.get("audio_url")
        logger.info("Found existing highlight record in Qdrant")

    # 2. Fallback: If no response exists in Qdrant and none was passed, generate it
    if not final_response_text:
        logger.info(f"No existing response found for highlight. Generating via {action}...")
        was_generated = True
        if action == "summarize":
            gen_result = highlight_summarize(highlighted_text, board, class_number, subject, unit_number)
        else:
            gen_result = highlight_explain(highlighted_text, board, class_number, subject, unit_number)
        
        final_response_text = gen_result.get("response")

    if not final_response_text:
        return {"success": False, "error": "Could not fetch or generate response text for audio."}

    # 3. If audio already exists, return it immediately
    if audio_url:
        logger.info("Reusing existing audio URL")
        return {
            "success": True,
            "audio_url": audio_url,
            "response_text": final_response_text,
            "reused": True,
            "generated": False,
            "fallback_generated": was_generated,
            "response_time_seconds": round(time.time() - start_time, 2),
        }

    # 4. Generate TTS audio (Read the response text)
    audio_bytes = _generate_tts_audio(final_response_text)
    if not audio_bytes:
        return {"success": False, "error": "TTS generation failed"}

    # 5. Upload to S3
    audio_url = _upload_audio_to_s3(
        audio_bytes=audio_bytes,
        board=board,
        class_number=class_number,
        subject=subject,
        action=action,
    )

    if not audio_url:
        return {"success": False, "error": "S3 upload failed"}

    # 6. Update the Qdrant record with the new audio_url
    _store_highlight_in_qdrant(
        highlighted_text=highlighted_text,
        response=final_response_text,
        action=action,
        audio_url=audio_url,
        board=board,
        class_number=class_number,
        subject=subject,
        unit_number=unit_number,
    )

    return {
        "success": True,
        "audio_url": audio_url,
        "response_text": final_response_text,
        "fallback_generated": was_generated,
        "reused": False,
        "generated": True,
        "response_time_seconds": round(time.time() - start_time, 2),
    }
