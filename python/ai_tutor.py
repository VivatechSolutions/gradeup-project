"""
AI Tutor — RAG-powered Study Assistant for GradeUp

Features:
- Retrieves relevant content from Qdrant (structured + enriched collections)
- Uses GPT-5-mini to generate study-focused answers
- Maintains per-student chat history (subject + unit scoped) in JSON files
- Strict content safety: study-only, no 18+/harmful content, topic-bound
"""

import os
import re
import time
import json
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

# ── Configuration ─────────────────────────────────────────────────────────────

TUTOR_MODEL = "gpt-4o-mini"
TUTOR_FALLBACK_MODEL = "gpt-4o"
TUTOR_MAX_HISTORY = 20          # Max messages kept per conversation
TUTOR_RAG_TOP_K = 5             # Number of RAG chunks to retrieve
TUTOR_TIMEOUT = 60              # API call timeout in seconds
HISTORY_DIR = Path("chat_history")  # Where JSON history files are stored


# ── Chat History Manager (JSON file–based) ────────────────────────────────────


class ChatHistoryManager:
    """
    Manages per-student chat history, scoped by (candidate_id, subject, unit).
    Each conversation is stored as a separate JSON file on disk.
    """

    def __init__(self, history_dir: Path = HISTORY_DIR):
        self.history_dir = history_dir
        self.history_dir.mkdir(parents=True, exist_ok=True)

    def _history_path(self, candidate_id: str, subject: str, unit_number: int) -> Path:
        """Deterministic file path for a conversation."""
        safe_id = candidate_id.strip().lower().replace(" ", "_")
        safe_subj = subject.strip().lower().replace(" ", "_")
        return self.history_dir / f"{safe_id}__{safe_subj}__unit_{unit_number}.json"

    def _load(self, path: Path) -> Dict[str, Any]:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                return {"messages": [], "created_at": datetime.now(timezone.utc).isoformat()}
        return {"messages": [], "created_at": datetime.now(timezone.utc).isoformat()}

    def _save(self, path: Path, data: Dict[str, Any]) -> None:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def get_history(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
    ) -> List[Dict[str, str]]:
        """Return the chat messages for a conversation."""
        path = self._history_path(candidate_id, subject, unit_number)
        data = self._load(path)
        return data.get("messages", [])

    def add_message(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        role: str,
        content: str,
        candidate_name: Optional[str] = None,
    ) -> None:
        """Append a message (role=user|assistant) and trim to max history."""
        path = self._history_path(candidate_id, subject, unit_number)
        data = self._load(path)

        if candidate_name and not data.get("candidate_name"):
            data["candidate_name"] = candidate_name
        data["subject"] = subject
        data["unit_number"] = unit_number

        data["messages"].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # Trim oldest messages if over budget
        if len(data["messages"]) > TUTOR_MAX_HISTORY:
            data["messages"] = data["messages"][-TUTOR_MAX_HISTORY:]

        self._save(path, data)

    def clear_history(
        self,
        candidate_id: str,
        subject: Optional[str] = None,
        unit_number: Optional[int] = None,
    ) -> int:
        """
        Clear conversation history.
        - If subject + unit given → clear that single conversation.
        - If only subject → clear all units for that subject.
        - If neither → clear ALL conversations for this candidate.
        Returns the number of files deleted.
        """
        safe_id = candidate_id.strip().lower().replace(" ", "_")
        deleted = 0

        if subject and unit_number is not None:
            path = self._history_path(candidate_id, subject, unit_number)
            if path.exists():
                path.unlink()
                deleted = 1
        else:
            pattern = f"{safe_id}__"
            if subject:
                safe_subj = subject.strip().lower().replace(" ", "_")
                pattern += f"{safe_subj}__"
            for f in self.history_dir.glob(f"{pattern}*.json"):
                f.unlink()
                deleted += 1

        return deleted

    def list_conversations(self, candidate_id: str) -> List[Dict[str, Any]]:
        """List all conversation sessions for a candidate."""
        safe_id = candidate_id.strip().lower().replace(" ", "_")
        convos = []
        for f in sorted(self.history_dir.glob(f"{safe_id}__*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                convos.append({
                    "subject": data.get("subject", ""),
                    "unit_number": data.get("unit_number"),
                    "candidate_name": data.get("candidate_name", ""),
                    "message_count": len(data.get("messages", [])),
                    "updated_at": data.get("updated_at", ""),
                })
            except Exception:
                continue
        return convos


# ── Global singleton ──────────────────────────────────────────────────────────

_history_manager: Optional[ChatHistoryManager] = None


def get_history_manager() -> ChatHistoryManager:
    global _history_manager
    if _history_manager is None:
        _history_manager = ChatHistoryManager()
    return _history_manager


# ── RAG Retrieval ─────────────────────────────────────────────────────────────


def retrieve_context(
    query: str,
    board: Optional[str] = None,
    class_number: Optional[str] = None,
    subject: Optional[str] = None,
    unit_number: Optional[int] = None,
    limit: int = TUTOR_RAG_TOP_K,
) -> List[Dict[str, Any]]:
    """
    Retrieve top-K relevant chunks from Qdrant for the student's query.
    Searches BOTH structured and enriched collections.
    """
    try:
        from qdrant_integration import search_qdrant, initialize_qdrant_client
    except ImportError:
        print("  ⚠️  [AI Tutor] qdrant_integration not available")
        return []

    all_results: List[Dict[str, Any]] = []

    base_collection = os.environ.get("QDRANT_COLLECTION_NAME", "GradeupAI_Books")

    # Pass 1: Strict search with unit_filter
    for collection_name in (base_collection,):
        try:
            results = search_qdrant(
                query=query,
                collection_name=collection_name,
                limit=limit,
                unit_filter=unit_number,
                subject_filter=subject,
                class_filter=class_number,
                board_filter=board,
            )
            all_results.extend(results)
        except Exception as e:
            print(f"  ⚠️  [AI Tutor] Search failed on {collection_name}: {e}")

    # Pass 2: Fallback search if nothing found (relax unit_number but keep subject + class filters)
    if not all_results and unit_number is not None:
        print(f"  ⚠️  [AI Tutor] No chunks found for unit {unit_number}. Retrying without unit filter...")
        for collection_name in (base_collection,):
            try:
                results = search_qdrant(
                    query=query,
                    collection_name=collection_name,
                    limit=limit,
                    unit_filter=None,
                    subject_filter=subject,
                    class_filter=class_number,
                    board_filter=board,
                )
                all_results.extend(results)
            except Exception as e:
                print(f"  ⚠️  [AI Tutor] Fallback search failed on {collection_name}: {e}")

    # Deduplicate by content (first 200 chars)
    seen = set()
    unique = []
    for r in all_results:
        fingerprint = r.get("text", "")[:200].strip()
        if fingerprint not in seen:
            seen.add(fingerprint)
            unique.append(r)

    # Sort by relevance (score if available, else order preserved)
    return unique[:limit]


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


def _extract_suggested_questions(answer: str) -> List[str]:
    """Parse follow-up question suggestions from the LLM response text."""
    suggestions = []

    # Look for the suggestions section (💡 **You could ask next:** or similar)
    # Match numbered lines (1. ..., 2. ..., 3. ...) after the marker
    marker_pattern = re.compile(
        r"(?:💡|\*\*You could ask next\*\*|You could ask next)[:\s]*",
        re.IGNORECASE,
    )
    marker_match = marker_pattern.search(answer)

    if marker_match:
        after_marker = answer[marker_match.end():]
        # Extract numbered items: 1. Question text
        numbered = re.findall(r"^\s*\d+\.\s*(.+)$", after_marker, re.MULTILINE)
        for q in numbered:
            cleaned = q.strip().strip("?.").strip() + "?"
            if len(cleaned) > 5:  # skip tiny/empty entries
                suggestions.append(cleaned)

    return suggestions[:3]  # Return at most 3 suggestions


def _build_fallback_suggestions(
    chunks: List[Dict[str, Any]],
    subject: str,
    unit_name: str,
    unit_number: int,
) -> List[str]:
    """
    Build fallback follow-up question suggestions when the LLM doesn't include them.
    Uses section_titles from retrieved context, or falls back to unit/subject info.
    """
    suggestions = []

    # Try to build suggestions from context chunk section_titles
    seen_sections = set()
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        section = meta.get("section_title", "").strip()
        if section and section.lower() not in seen_sections:
            seen_sections.add(section.lower())
            suggestions.append(f"Can you explain '{section}' from this unit?")
            if len(suggestions) >= 3:
                break

    # If we still don't have enough, add unit/subject-based generic suggestions
    if len(suggestions) < 2:
        topic_label = unit_name if unit_name else f"Unit {unit_number}"
        fallback_options = [
            f"What are the key concepts in {topic_label}?",
            f"Can you explain the main topics in {topic_label}?",
            f"What are the important definitions in {subject} - {topic_label}?",
            f"Can you give me a summary of {topic_label}?",
            f"What should I focus on while studying {topic_label}?",
        ]
        for fb in fallback_options:
            if fb not in suggestions:
                suggestions.append(fb)
                if len(suggestions) >= 3:
                    break

    return suggestions[:3]


# ── System Prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are GradeUp AI Tutor — a friendly, knowledgeable study assistant for school students.

## YOUR ROLE
- Help students understand their textbook content by answering questions clearly and accurately.
- Use the RETRIEVED CONTEXT (from the student's textbook) as your **ONLY** source of truth.
- If the retrieved context contains the answer, use it. You may rephrase or simplify it for the student.
- If the context does not cover the question, say so honestly — do NOT make up facts.

## STRICT RULES — YOU MUST FOLLOW THESE:

### 1. ABSOLUTELY NO HALLUCINATION — CRITICAL
- You MUST answer ONLY based on the RETRIEVED CONTEXT provided below the student's question.
- NEVER fabricate, invent, or guess unit names, topic lists, chapter contents, or any textbook information.
- If the student asks "what are the topics in this lesson/unit?" and the retrieved context does not clearly list them, say: "Let me help you with what I have from your textbook. Based on the content available, here are the topics I can see: [list only what's actually in the context]." If no context is available, say: "I don't have the full topic list for this unit right now. Could you ask me about a specific concept and I'll help explain it?"
- NEVER invent unit titles like "Health and Hygiene" or any other name that is not explicitly present in the retrieved context.
- When the retrieved context is empty or marked as "No relevant textbook content was found", do NOT attempt to answer from your own knowledge. Instead say you don't have the specific textbook content and ask the student to try a more specific question.
- If you are unsure, say "I'm not sure about this based on your textbook. Can you ask about a specific topic?" — this is ALWAYS better than guessing.

### 2. STUDY-ONLY MODE
You are a STUDY assistant. You ONLY answer questions related to academics, education, and the student's textbook content.
- ✅ Answer: textbook topics, concepts, definitions, explanations, practice questions, study tips
- ❌ Refuse: personal advice, entertainment, gossip, jokes unrelated to studies, coding, recipes, games

### 3. TOPIC ENFORCEMENT
- **Greetings & pleasantries**: If the student says greetings like "hi", "hello", "hey", "good morning", "good afternoon", "welcome", "thank you", "thanks", "thankyou", "bye", "goodbye", or any other casual greeting or pleasantry, respond warmly and naturally. These are NOT off-topic — they are normal conversational exchanges. Greet them back friendly, acknowledge their message, and then gently invite them to ask a study question. For example: "Hello! 😊 Great to see you! What would you like to learn about today?" or "You're welcome! Happy to help. Do you have any more questions about {subject}?"
- If the question is clearly UNRELATED to this subject ({subject}) AND is NOT a greeting/pleasantry, respond with:
  "This question doesn't seem related to {subject}. I can only help with questions about your textbook. Please ask something related to your current study material!"
- If the question is about the subject but not strictly in the current Unit topic "{unit_name}", you should still TRY to answer it if it's found in the retrieved context. Only refuse if it's completely out of the academic scope.
- Be helpful: students often ask about real-world applications of what they are learning. Always try to provide these examples if the context supports it.

### 4. CONTENT SAFETY — ABSOLUTE ZERO TOLERANCE
- NEVER produce 18+, sexual, violent, harmful, or abusive content.
- NEVER help with cheating, plagiarism, or academic dishonesty.
- If a student sends inappropriate content, redirect them to studies AND still include follow-up question suggestions about their current unit/subject. Example:
  "I'm here to help you study! Let's focus on your {subject} textbook. What would you like to learn about?
  
  💡 **You could ask next:**
  1. [A question related to the current unit topic]
  2. [Another relevant study question]
  3. [A concept from the textbook]"
- Do NOT engage with or acknowledge harmful messages — just redirect to studies with helpful suggestions.

### 5. RESPONSE STYLE
- Be encouraging, patient, and supportive — like a great teacher.
- Use simple language appropriate for school students.
- Use bullet points, numbered steps, or examples to make explanations clear.
- Keep answers concise but thorough. If a topic is complex, break it into parts.
- When relevant, relate concepts to everyday examples students can understand.

### 6. FOLLOW-UP QUESTION SUGGESTIONS — MANDATORY IN EVERY RESPONSE
- You MUST include 2-3 follow-up questions at the END of EVERY response — this includes:
  - Normal study answers
  - Safety/content redirects
  - Greetings and pleasantries
  - Off-topic redirects
  - "I don't have the content" responses
- There is NO exception — every single response MUST end with suggestions.
- These suggestions should be related to the student's current subject ({subject}) and unit ({unit_name}).
- Base them on the RETRIEVED CONTEXT when available. If no context is available, suggest general questions about the current unit/subject.
- Format them EXACTLY like this:
  
  💡 **You could ask next:**
  1. [A relevant question based on the current topic/unit]
  2. [Another related question from the textbook content]
  3. [A deeper question about something in the subject]

- Make the suggestions specific and helpful, not generic. They should guide the student into studying their actual textbook material.

### 7. HOMEWORK REQUESTS
- If the student explicitly asks you to assign them homework:
  - If the "Conversation count on this topic" (below) is less than 10, politely decline: "We are doing well! You don't need to do any homework right now, just keep asking questions if you have any doubts."
  - If the count is 10 or more, respond: "It looks like you've been practicing this topic thoroughly! I have assigned some homework to your portal based on our conversation." (The system automatically generates it).

## CURRENT CONTEXT
Subject: {subject}
Unit: {unit_number} — {unit_name}
Student: {candidate_name}
Conversation count on this topic: {topic_count} messages
"""


# ── LLM Call ──────────────────────────────────────────────────────────────────


def generate_tutor_response(
    query: str,
    context: str,
    chat_history: List[Dict[str, str]],
    subject: str,
    unit_number: int,
    unit_name: str = "",
    candidate_name: str = "Student",
    topic_count: int = 0,
) -> str:
    """Call OpenAI to generate the tutor response."""
    api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return "Sorry, the AI tutor is not configured correctly. Please contact your administrator."

    # Build system prompt
    system_prompt = _SYSTEM_PROMPT.format(
        subject=subject,
        unit_number=unit_number,
        unit_name=unit_name or "(not specified)",
        candidate_name=candidate_name,
        topic_count=topic_count,
    )

    # Build messages
    messages = [{"role": "system", "content": system_prompt}]

    # Add chat history (only role + content, skip timestamps)
    for msg in chat_history[-10:]:  # Last 10 messages for context window efficiency
        messages.append({
            "role": msg["role"],
            "content": msg["content"],
        })

    # Add current user query with RAG context
    if context:
        user_message = (
            f"Here is relevant content from the textbook:\n\n"
            f"---BEGIN TEXTBOOK CONTEXT---\n{context}\n---END TEXTBOOK CONTEXT---\n\n"
            f"IMPORTANT REMINDER: Answer ONLY using the textbook context above. Do NOT invent or fabricate any information that is not present in the context.\n\n"
            f"Student's question: {query}"
        )
    else:
        user_message = (
            f"(No relevant textbook content was found for this question. "
            f"You MUST NOT make up an answer. Tell the student you don't have the specific content "
            f"and ask them to try a more specific question about a particular concept.)\n\n"
            f"Student's question: {query}"
        )

    messages.append({"role": "user", "content": user_message})

    # Call OpenAI
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": TUTOR_MODEL,
        "messages": messages,
        "max_completion_tokens": 2048,
        "temperature": 0.4,
    }

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=TUTOR_TIMEOUT,
        )

        if not resp.ok:
            # Try fallback model
            payload["model"] = TUTOR_FALLBACK_MODEL
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=TUTOR_TIMEOUT,
            )

        if resp.ok:
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
        else:
            print(f"  ❌ [AI Tutor] API error: {resp.status_code} {resp.text[:300]}")
            return "I'm having trouble connecting right now. Please try again in a moment!"

    except requests.Timeout:
        return "The response is taking too long. Please try a shorter question!"
    except Exception as e:
        print(f"  ❌ [AI Tutor] Error: {e}")
        return "Something went wrong. Please try again!"


# ── Main Orchestrator ─────────────────────────────────────────────────────────


def ask_tutor(
    query: str,
    board: str,
    class_number: str,
    subject: str,
    unit_number: int,
    candidate_name: str,
    candidate_id: str,
    unit_name: str = "",
    limit: int = TUTOR_RAG_TOP_K,
) -> Dict[str, Any]:
    """
    Main entry point for the AI Tutor.

    1. Retrieves relevant context from Qdrant
    2. Loads chat history for this student + subject + unit
    3. Generates a study-focused answer via LLM
    4. Saves the conversation turn to history
    5. Returns the answer + sources
    """
    start_time = time.time()
    hm = get_history_manager()

    # 1. Retrieve RAG context
    chunks = retrieve_context(
        query=query,
        board=board,
        class_number=class_number,
        subject=subject,
        unit_number=unit_number,
        limit=limit,
    )
    context_text = _format_context(chunks)

    # 1.5 Extract topic and get conversation count BEFORE LLM call
    top_section = ""
    topic_count = 0
    document_id = ""
    try:
        from student_performance import get_performance_tracker
        tracker = get_performance_tracker()

        for chunk in chunks:
            meta = chunk.get("metadata", {})
            sec = meta.get("section_title", "")
            if not document_id:
                document_id = meta.get("document_id", "")
            if sec and sec.strip() and not top_section:
                top_section = sec.strip()

        if top_section:
            topic_count = tracker.record_topic_query(
                candidate_id=candidate_id,
                subject=subject,
                unit_number=unit_number,
                section_title=top_section,
                unit_title=unit_name,
                candidate_name=candidate_name,
            )

            # Auto-Trigger Homework at exactly 10 queries
            if topic_count == 10:
                try:
                    import threading
                    from homework_engine import get_homework_engine
                    hw_engine = get_homework_engine()
                    print(f"  🚀 [AI Tutor] Auto-triggering homework for {candidate_id} on '{top_section}'")

                    def _auto_assign():
                        try:
                            hw_engine.assign_homework(
                                candidate_id=candidate_id,
                                subject=subject,
                                unit_number=unit_number,
                                document_id=document_id,
                                num_questions=5,
                                candidate_name=candidate_name,
                                unit_title=unit_name,
                                specific_topic=top_section,
                            )
                            print(f"  ✅ [AI Tutor] Auto-homework assigned for {candidate_id}")
                        except Exception as bg_err:
                            print(f"  ❌ [AI Tutor] Background homework failed: {bg_err}")

                    threading.Thread(target=_auto_assign).start()
                except Exception as ex:
                    print(f"  ⚠️  [AI Tutor] Failed to auto-trigger homework: {ex}")

        # Log interaction in unified history
        tracker.record_tutor_interaction(
            candidate_id=candidate_id,
            subject=subject,
            unit_number=unit_number,
            topic=top_section or "general",
            query_summary=query[:120],
            candidate_name=candidate_name,
            unit_title=unit_name,
        )
    except Exception as e:
        print(f"  ⚠️  [AI Tutor] Failed to track interaction: {e}")

    # 2. Load chat history
    history = hm.get_history(candidate_id, subject, unit_number)

    # 3. Generate response
    answer = generate_tutor_response(
        query=query,
        context=context_text,
        chat_history=history,
        subject=subject,
        unit_number=unit_number,
        unit_name=unit_name,
        candidate_name=candidate_name,
        topic_count=topic_count,
    )

    # 4. Save conversation turn
    hm.add_message(candidate_id, subject, unit_number, "user", query, candidate_name)
    hm.add_message(candidate_id, subject, unit_number, "assistant", answer, candidate_name)

    # 5. Build sources list
    sources = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        sources.append({
            "section_title": meta.get("section_title", ""),
            "content_type": meta.get("content_type", ""),
            "unit_number": meta.get("unit_number"),
            "unit_title": meta.get("unit_title", ""),
            "document_id": meta.get("document_id", ""),
        })

    elapsed = time.time() - start_time

    # 6. Extract suggested follow-up questions from the answer
    suggested_questions = _extract_suggested_questions(answer)

    # 7. Fallback: generate suggestions from context/unit metadata if LLM didn't include them
    if not suggested_questions:
        suggested_questions = _build_fallback_suggestions(chunks, subject, unit_name, unit_number)

    return {
        "answer": answer,
        "suggested_questions": suggested_questions,
        "sources": sources,
        "context_chunks_used": len(chunks),
        "is_relevant": True,
        "response_time_seconds": round(elapsed, 2),
        "candidate_id": candidate_id,
        "candidate_name": candidate_name,
        "subject": subject,
        "unit_number": unit_number,
        "unit_name": unit_name,
        "history_length": len(history) + 2,  # +2 for the new user+assistant messages
    }

