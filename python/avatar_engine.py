"""
Avatar Teaching Engine — Interactive AI Avatar for GradeUp

Features:
- Session-based avatar teaching with emotion-annotated segments
- Inline flashcards interleaved within teaching flow
- RAG-powered doubt clearing (student raises hand → AI explains from book content)
- Auto-generated flashcards during doubt clarification
- Temp session history tracking (progress, doubts, emotion timeline)
- Saves session summary to student performance on end

Flow:
  start_session → play segments → (raise_hand → clarify + auto_flashcard → resume) → end_session
"""

import os
import json
import time
import uuid
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

# ── Configuration ─────────────────────────────────────────────────────────────

AVATAR_MODEL = "gpt-4o-mini"
AVATAR_FALLBACK_MODEL = "gpt-4o"
AVATAR_RAG_TOP_K = 5
AVATAR_TIMEOUT = 90
AVATAR_DATA_DIR = Path("avatar_data")

# ── Load environment ──────────────────────────────────────────────────────────

for _env in (".env.local", ".env"):
    if Path(_env).exists():
        load_dotenv(dotenv_path=_env)
        break


# ══════════════════════════════════════════════════════════════════════════════
#  SESSION STORAGE
# ══════════════════════════════════════════════════════════════════════════════

class AvatarSessionStore:
    """Stores avatar sessions as JSON files in avatar_data/."""

    def __init__(self, data_dir: Path = AVATAR_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, session_id: str) -> Path:
        return self.data_dir / f"{session_id}.json"

    def save(self, session: Dict) -> None:
        session["last_updated_at"] = datetime.now(timezone.utc).isoformat()
        self._path(session["session_id"]).write_text(
            json.dumps(session, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    def delete(self, session_id: str) -> None:
        path = self._path(session_id)
        if path.exists():
            path.unlink()

    def load(self, session_id: str) -> Optional[Dict]:
        path = self._path(session_id)
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None

    def list_by_candidate(self, candidate_id: str,
                           subject: Optional[str] = None,
                           unit_number: Optional[int] = None) -> List[Dict]:
        results = []
        for f in sorted(self.data_dir.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if data.get("student", {}).get("candidate_id") != candidate_id:
                    continue
                if subject and data.get("topic", {}).get("subject") != subject:
                    continue
                if unit_number is not None and data.get("topic", {}).get("unit_number") != unit_number:
                    continue
                results.append({
                    "session_id": data.get("session_id"),
                    "subject": data.get("topic", {}).get("subject"),
                    "unit_number": data.get("topic", {}).get("unit_number"),
                    "unit_title": data.get("topic", {}).get("unit_title"),
                    "section_title": data.get("topic", {}).get("section_title"),
                    "status": data.get("avatar_session_history", {}).get("progress", {}).get("status", "unknown"),
                    "started_at": data.get("avatar_session_history", {}).get("started_at"),
                    "ended_at": data.get("ended_at"),
                    "total_segments": data.get("avatar_session_history", {}).get("progress", {}).get("total_segments", 0),
                    "completed_segments": len(data.get("avatar_session_history", {}).get("progress", {}).get("completed_segments", [])),
                    "doubts_raised": len(data.get("avatar_session_history", {}).get("doubts_raised", [])),
                    "auto_flashcards_generated": sum(
                        1 for d in data.get("avatar_session_history", {}).get("doubts_raised", [])
                        if d.get("flashcard_auto_generated")
                    ),
                    "percent_complete": data.get("avatar_session_history", {}).get("progress", {}).get("percent_complete", 0),
                })
            except Exception:
                continue
        return results





# ══════════════════════════════════════════════════════════════════════════════
#  LLM CALLS
# ══════════════════════════════════════════════════════════════════════════════

_DOUBT_SYSTEM_PROMPT = """You are GradeUp AI Avatar — a friendly, expressive school teacher explaining concepts to a student.

The student raised a doubt during your lesson. You must:
1. Answer the doubt using ONLY the textbook context provided.
2. Be warm, encouraging, and use simple language.
3. If you provide a full explanation of a concept, your LAST segment text MUST end by asking the student: "For better understanding, can I provide a flashcard?"
4. Return your clarification as JSON with EXACTLY this structure:

{
  "clarification_segments": [
    {
      "text": "What you say to the student",
      "emotion": "one of: enthusiastic, curious, encouraging, surprised, thoughtful, playful, empathetic, confident, warm, inspiring"
    }
  ]
}

RULES:
- If the student's doubt is vague, incomplete, or just an announcement (e.g., "I have a doubt", "Wait", "Explain please"), DO NOT explain the concept. Instead, reply with a single empathetic segment asking them to clarify what their specific doubt is (e.g., "I'm here to help! What exactly is your doubt about this topic?"). Do NOT ask if they want a flashcard in this specific case.
- Otherwise, the clarification should be 2-4 segments, each with a different emotion. Start empathetic, then explain, then ask if they want a flashcard.
- Use the textbook context as primary source. Do NOT hallucinate.
- Do NOT include any "auto_flashcard" field. ONLY return "clarification_segments".
- The JSON must contain ONLY the "clarification_segments" key. Nothing else.
"""

_FLASHCARD_SYSTEM_PROMPT = """You are GradeUp AI Avatar. The student agreed to see a flashcard for their recent doubt.
Generate a flashcard based on the textbook context and their doubt.

IMPORTANT — You must DECIDE which visual style fits best for the front content:
- If the concept involves a PROCESS, FLOW, CLASSIFICATION, LIFECYCLE, or RELATIONSHIP → include a UML/Mermaid diagram in the front with explanation below it.
- If the concept is a FACT, DEFINITION, FORMULA, or REAL-WORLD APPLICATION → include a real-world example in the front instead.
- NEVER include both. Pick the ONE that helps the student understand best.

Return EXACTLY this JSON structure:

{
  "auto_flashcard": {
    "card_id": "fc_auto_XXX",
    "card_title": "Short title for the flashcard",
    "front": "Single-side flashcard content — the key concept explained simply. If you chose UML, include the Mermaid diagram code block followed by a clear explanation. If you chose real-world, include a relatable real-world scenario with connection to student's life.",
    "front_style": "uml_diagram or real_world_example",
    "avatar_line": "What the avatar says while showing the flashcard. IMPORTANT: You MUST end this line by asking: 'Shall we continue the segment?'",
    "avatar_emotion": "one of: enthusiastic, curious, encouraging, surprised, thoughtful, playful, empathetic, confident, warm, inspiring"
  }
}
"""

_MCQ_FLASHCARD_SYSTEM_PROMPT = """You are GradeUp AI Avatar generating an interactive multiple-choice flashcard.
Based on the textbook context, generate ONE multiple-choice question to test the student's understanding.

IMPORTANT — For each option, provide a simple, educational explanation:
- For the CORRECT option: Start with a congratulatory message like "Yeah, you got the right answer!" followed by why it's correct.
- For WRONG options: Provide a valid explanation of why it's incorrect and what the correct concept is.

Return EXACTLY this JSON structure:
{
  "question": "The question text",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text"
  },
  "answer": "B",
  "option_explanations": {
    "A": "This is incorrect because... The correct concept is...",
    "B": "Yeah, you got the right answer! This is correct because...",
    "C": "This is incorrect because... The actual fact is...",
    "D": "This is incorrect because... Remember that..."
  }
}
"""



_INFORMATIVE_FLASHCARD_SYSTEM_PROMPT = """You are GradeUp AI Avatar generating an informative flashcard popup.
Based on the textbook context, generate a real-world example and an easy-to-understand explanation of the concept.

Return EXACTLY this JSON structure:
{
  "flashcard_id": "fc_info_XXX",
  "card_title": "Short title for the flashcard",
  "front": "The real-world example or easy-to-understand explanation of the concept. Keep it concise, engaging, and relatable.",
  "avatar_line": "What the avatar says while showing this flashcard.",
  "avatar_emotion": "one of: enthusiastic, curious, encouraging, surprised, thoughtful, playful, empathetic, confident, warm, inspiring"
}
"""


def _call_llm(system_prompt: str, user_prompt: str,
              model: str = AVATAR_MODEL, max_tokens: int = 3000,
              force_json: bool = True) -> Optional[str]:
    """Call OpenAI LLM."""
    api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("  ❌ [Avatar] No API key configured")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_completion_tokens": max_tokens,
        "temperature": 1,
    }
    if force_json:
        payload["response_format"] = {"type": "json_object"}

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers, json=payload, timeout=AVATAR_TIMEOUT,
        )
        if not resp.ok:
            # Fallback model
            payload["model"] = AVATAR_FALLBACK_MODEL
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers, json=payload, timeout=AVATAR_TIMEOUT,
            )
        if resp.ok:
            return resp.json()["choices"][0]["message"]["content"].strip()
        else:
            print(f"  ❌ [Avatar] API error: {resp.status_code} {resp.text[:300]}")
            return None
    except requests.Timeout:
        print("  ❌ [Avatar] LLM timeout")
        return None
    except Exception as e:
        print(f"  ❌ [Avatar] LLM error: {e}")
        return None


def _parse_json(raw: str) -> Optional[Dict]:
    """Parse JSON from LLM response."""
    if not raw:
        return None
    # Strip markdown fences
    if "```json" in raw:
        s = raw.find("```json") + 7
        e = raw.find("```", s)
        raw = raw[s:e].strip() if e > s else raw
    elif "```" in raw:
        s = raw.find("```") + 3
        e = raw.find("```", s)
        raw = raw[s:e].strip() if e > s else raw
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  ⚠️  [Avatar] JSON parse error: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
#  ENRICHMENT LOADER
# ══════════════════════════════════════════════════════════════════════════════

def _load_section_enrichment(board: str, class_number: str, subject: str,
                              unit_number: int, section_title: str,
                              term: Optional[Any] = None) -> Optional[Dict]:
    """Load enrichment data for a specific section from enriched.json files."""
    from config import OUTPUTS_DIR

    try:
        import orjson
    except ImportError:
        import json as orjson
        orjson.loads = json.loads

    if not OUTPUTS_DIR.exists():
        return None

    for doc_dir in OUTPUTS_DIR.iterdir():
        if not doc_dir.is_dir():
            continue

        # Check metadata match
        metadata_path = doc_dir / "metadata.json"
        if metadata_path.exists():
            try:
                meta = json.loads(metadata_path.read_text(encoding="utf-8"))
                if subject and str(meta.get("subject", "")).lower() != subject.lower():
                    continue
                if board:
                    meta_board = str(meta.get("board", "")).lower().replace("_", " ")
                    if meta_board != board.lower().replace("_", " "):
                        continue
                if class_number:
                    meta_class = str(meta.get("class_number", "")).lower().lstrip("0")
                    if meta_class != str(class_number).lower().lstrip("0"):
                        continue
                # Term books restart unit numbering, so without this a Term 2
                # unit 1 section can be served from the Term 1 book.
                if term:
                    from term_utils import normalize_term
                    want = normalize_term(term)
                    have = normalize_term(meta.get("term"))
                    if want and have and want != have:
                        continue
            except Exception:
                pass

        enriched_path = doc_dir / "enriched.json"
        if not enriched_path.exists():
            continue

        try:
            data = orjson.loads(enriched_path.read_bytes()) if hasattr(orjson, 'loads') and hasattr(enriched_path, 'read_bytes') else json.loads(enriched_path.read_text(encoding="utf-8"))
        except Exception:
            continue

        content_key = "chapters" if "chapters" in data else "units"
        for unit in data.get(content_key, []):
            if unit.get("unit_number") != unit_number:
                continue
            for sec in unit.get("sections", []):
                sec_title = sec.get("section_title", "")
                if sec_title.lower() == section_title.lower():
                    return {
                        "unit_title": unit.get("title", ""),
                        "section_title": sec_title,
                        "enrichment": sec.get("enrichment", {}),
                        "document_id": data.get("document_id", doc_dir.name),
                    }

    return None


# ══════════════════════════════════════════════════════════════════════════════
#  AVATAR ENGINE
# ══════════════════════════════════════════════════════════════════════════════

class AvatarEngine:
    """Orchestrates avatar teaching sessions."""

    def __init__(self):
        self.store = AvatarSessionStore()

    # ── Knowledge Context Builder ─────────────────────────────────────────────

    def _build_knowledge_context(self, session: Dict, current_segment_id: str) -> str:
        """Build a combined knowledge context from ALL segments in the session.

        Instead of providing only the single paused segment as context,
        this combines all segments (teaching + flashcard) into a knowledge
        window so the LLM has full section understanding when answering doubts.
        """
        parts = []

        # 1. Include concept overview from enrichment
        concept_overview = session.get("enrichment", {}).get("concept_overview", "")
        if not concept_overview:
            concept_overview = session.get("avatar_explanation", {}).get("concept_overview", "")
        if concept_overview:
            parts.append(f"=== CONCEPT OVERVIEW ===\n{concept_overview}")

        # 2. Collect ALL segment texts as knowledge base
        segments = session.get("avatar_explanation", {}).get("segments", [])
        knowledge_lines = []
        current_text = ""
        for seg in segments:
            seg_id = seg.get("segment_id", "")
            if seg.get("type") == "flashcard":
                card_title = seg.get("card_title", "")
                front = seg.get("front", "")
                line = f"[{seg_id}] Flashcard: {card_title} — {front}"
            else:
                line = f"[{seg_id}] {seg.get('text', '')}"

            knowledge_lines.append(line)

            # Track the current segment separately
            if seg_id == current_segment_id:
                if seg.get("type") == "flashcard":
                    current_text = f"Flashcard Title: {seg.get('card_title', '')}\nText: {seg.get('front', '')}"
                else:
                    current_text = seg.get("text", "")

        if knowledge_lines:
            parts.append(f"=== TEACHING SEGMENTS (Knowledge Base) ===\n" + "\n".join(knowledge_lines))

        if current_text:
            parts.append(f"=== CURRENT SEGMENT (Student paused here) ===\n[{current_segment_id}] {current_text}")

        return "\n\n".join(parts) if parts else "General topic context."

    # ── Start Session ─────────────────────────────────────────────────────────

    def start_session(self, candidate_id: str, candidate_name: str,
                      board: str, class_number: str, subject: str,
                      unit_number: int, unit_name: str = "",
                      section_title: str = "",
                      segments: Optional[List[Dict]] = None,
                      term: Optional[Any] = None) -> Dict:
        """Start a new avatar teaching session.

        If ``segments`` is provided (from the request body), the local enrichment
        file is NOT fetched. The session is built directly from the supplied segments.
        Otherwise, enrichment data is loaded from the local file system as before.
        """

        if segments is not None:
            # ── Segments supplied directly from the request body ──────────────
            avatar_explanation = {"segments": segments}
            enrichment = {"avatar_explanation": avatar_explanation}
            enrichment_data = {
                "unit_title": unit_name,
                "section_title": section_title,
                "enrichment": enrichment,
                "document_id": "",
            }
            dc = {}
        else:
            # ── Load enrichment data from local file system (legacy path) ─────
            enrichment_data = _load_section_enrichment(
                board=board, class_number=class_number,
                subject=subject, unit_number=unit_number,
                section_title=section_title, term=term,
            )

            if not enrichment_data:
                return {"error": f"Enrichment data not found for section '{section_title}' in unit {unit_number}"}

            enrichment = enrichment_data["enrichment"]
            avatar_explanation = enrichment.get("avatar_explanation", {})
            segments = avatar_explanation.get("segments", [])

            if not segments:
                return {"error": f"No avatar segments found for section '{section_title}'. Enrichment may not have avatar data."}

            # Strip legacy RAG metadata from doubt_context
            dc = enrichment.get("doubt_context", {})

        # 2. Create session
        session_id = f"avatar_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        session = {
            "session_id": session_id,
            "student": {
                "candidate_id": candidate_id,
                "candidate_name": candidate_name,
            },
            "topic": {
                "board": board,
                "class_number": class_number,
                "subject": subject,
                "unit_number": unit_number,
                "unit_title": enrichment_data.get("unit_title", unit_name),
                "section_title": section_title,
            },
            "document_id": enrichment_data.get("document_id", ""),
            "avatar_explanation": avatar_explanation,
            "enrichment": enrichment,
            "avatar_session_history": {
                "session_id": session_id,
                "started_at": now,
                "progress": {
                    "current_segment_id": segments[0]["segment_id"] if segments else None,
                    "total_segments": len(segments),
                    "completed_segments": [],
                    "completed_teaching_segments": 0,
                    "completed_flashcards": 0,
                    "status": "in_progress",
                    "percent_complete": 0,
                },
                "doubts_raised": [],
                "emotion_timeline": [],
                "last_updated_at": now,
            },
            "ended_at": None,
        }

        self.store.save(session)

        # 3. Return response (without full enrichment to keep response clean)
        return {
            "session_id": session_id,
            "message": "Avatar teaching session started",
            "student": session["student"],
            "topic": session["topic"],
            "avatar_explanation": avatar_explanation,
            "avatar_session_history": session["avatar_session_history"],
        }

    # ── Raise Hand (Doubt Clearing + Auto Flashcard) ──────────────────────────

    def raise_hand(self, session_id: str, student_doubt: str) -> Dict:
        """Student raises hand — pause, extract context, generate clarification."""

        session = self.store.load(session_id)
        if not session:
            return {"error": f"Avatar session not found: {session_id}"}

        history = session["avatar_session_history"]
        progress = history["progress"]

        if progress["status"] == "completed":
            return {"error": "Session already completed"}
        if progress["status"] == "ended":
            return {"error": "Session already ended"}

        # 1. Pause at current segment
        paused_at = progress["current_segment_id"]
        progress["status"] = "paused_for_doubt"

        # 2. Build combined knowledge context from ALL segments
        topic = session["topic"]
        segment_context = self._build_knowledge_context(session, paused_at)

        # 3. Generate clarification via LLM
        section_title = topic.get("section_title", "")
        user_prompt = (
            f"SECTION: {section_title}\n"
            f"STUDENT DOUBT: {student_doubt}\n\n"
            f"TEXTBOOK CONTEXT:\n{segment_context}\n\n"
            f"Generate clarification segments with emotions to help the student understand. "
            f"Return in the JSON format specified."
        )

        raw = _call_llm(_DOUBT_SYSTEM_PROMPT, user_prompt)
        parsed = _parse_json(raw)

        # Fallback if LLM fails
        if not parsed:
            parsed = {
                "clarification_segments": [
                    {
                        "text": f"Let me explain that differently. {student_doubt.rstrip('?')} — this is covered in your textbook. For better understanding, can I provide a flashcard?",
                        "emotion": "empathetic"
                    }
                ]
            }

        clarification_segments = parsed.get("clarification_segments", [])

        # 4. Find resume point
        resume_segment_id = None
        segments = topic.get("segments", [])
        for i, seg in enumerate(segments):
            if seg["segment_id"] == paused_at and i + 1 < len(segments):
                resume_segment_id = segments[i + 1]["segment_id"]
                break

        # 5. Log doubt in history
        doubt_id = f"doubt_{len(history['doubts_raised']) + 1:03d}"
        now = datetime.now(timezone.utc).isoformat()

        doubt_entry = {
            "doubt_id": doubt_id,
            "raised_at": now,
            "paused_at_segment_id": paused_at,
            "student_question": student_doubt,
            "clarification_segments": clarification_segments,
            "rag_sources_used": [],
            "flashcard_auto_generated": False,
            "auto_flashcard": None,
            "resolved": False,
        }
        history["doubts_raised"].append(doubt_entry)

        # Add doubt to emotion timeline
        history["emotion_timeline"].append({
            "doubt": doubt_id,
            "emotion": "empathetic",
            "timestamp": now,
        })

        self.store.save(session)

        return {
            "action": "doubt_clarification",
            "doubt_id": doubt_id,
            "paused_at_segment_id": paused_at,
            "clarification": {
                "segments": clarification_segments,
                "sources_used": [],
            },
            "auto_flashcard": None,
            "resume_from_segment_id": resume_segment_id,
            "avatar_session_history": {
                "progress": progress,
                "doubts_raised": history["doubts_raised"],
            },
        }

    # ── Respond to Flashcard Offer ────────────────────────────────────────────

    def respond_to_flashcard_offer(self, session_id: str, student_response: str) -> Dict:
        """Handle student response to the flashcard offer — fully interactive."""
        session = self.store.load(session_id)
        if not session:
            return {"error": f"Avatar session not found: {session_id}"}
            
        history = session["avatar_session_history"]
        progress = history["progress"]
        
        if progress["status"] != "paused_for_doubt":
            return {"error": "Session is not paused for a doubt"}
            
        doubts = history.get("doubts_raised", [])
        if not doubts:
            return {"error": "No doubts found"}
            
        latest_doubt = doubts[-1]

        # Use LLM to classify the student's intent
        classify_prompt = (
            "You are an AI assistant helping a teacher avatar.\n"
            "The teacher just asked the student: 'For better understanding, can I provide a flashcard?'\n"
            f"The student replied: '{student_response}'\n\n"
            "Classify the student's response into exactly ONE of these categories:\n"
            "- YES_FLASHCARD (Student agrees to the flashcard offer)\n"
            "- QUESTION (Student is asking a question, requesting an explanation, or has a new doubt — even if they also decline the flashcard)\n"
            "- RESUME (Student wants to continue or resume the teaching segment, e.g. 'continue', 'let's move on', 'next')\n"
            "- NO_FLASHCARD (Student simply declines the flashcard with no further question)\n\n"
            "IMPORTANT: If the student declines the flashcard BUT also asks a question or requests explanation, classify as QUESTION.\n"
            "Return ONLY the category name as a single word."
        )
        
        intent_raw = _call_llm(classify_prompt, "Classify the response.", max_tokens=15, force_json=False)
        if intent_raw:
            intent = intent_raw.strip().upper().replace(" ", "_")
        else:
            # Fallback classification
            lower = student_response.strip().lower()
            if lower in ["yes", "yeah", "yep", "sure", "ok", "okay", "please", "yes please", "y"]:
                intent = "YES_FLASHCARD"
            elif lower in ["continue", "resume", "next", "move on", "let's continue", "go ahead"]:
                intent = "RESUME"
            elif any(q in lower for q in ["explain", "what", "how", "why", "difference", "can you", "tell me"]):
                intent = "QUESTION"
            else:
                intent = "NO_FLASHCARD"
        
        # ── QUESTION: Student has a new doubt → clarify it ──
        if "QUESTION" in intent:
            return self.raise_hand(session_id, student_response)
        
        # ── RESUME: Student wants to continue the teaching ──
        if "RESUME" in intent:
            return self.resume_session(session_id)
        
        # ── YES_FLASHCARD: Generate the flashcard ──
        if "YES" in intent:
            if latest_doubt.get("flashcard_auto_generated"):
                return {"error": "Flashcard already generated for this doubt"}
                
            topic = session["topic"]
            section_title = topic.get("section_title", "")
            student_question = latest_doubt.get("student_question", "")
            
            paused_at = latest_doubt.get("paused_at_segment_id")
            segment_context = self._build_knowledge_context(session, paused_at)
                    
            user_prompt = (
                f"SECTION: {section_title}\n"
                f"STUDENT DOUBT: {student_question}\n\n"
                f"TEXTBOOK CONTEXT:\n{segment_context}\n\n"
            )
            
            raw = _call_llm(_FLASHCARD_SYSTEM_PROMPT, user_prompt)
            parsed = _parse_json(raw)
            
            auto_flashcard = None
            if parsed:
                auto_flashcard = parsed.get("auto_flashcard")
                
            if auto_flashcard:
                latest_doubt["flashcard_auto_generated"] = True
                latest_doubt["auto_flashcard"] = auto_flashcard
                self.store.save(session)
                
            return {
                "action": "flashcard_generated",
                "auto_flashcard": auto_flashcard
            }
        
        # ── NO_FLASHCARD: Decline, then auto-resume ──
        return self.resume_session(session_id)

    # ── MCQ Flashcards ────────────────────────────────────────────────────────

    def generate_flashcard_mcq(self, session_id: str, flashcard_id: str,
                                flashcard_type: str, segment_id: str) -> Dict:
        """Generate an MCQ flashcard with per-option explanations."""
        session = self.store.load(session_id)
        if not session:
            return {"error": f"Avatar session not found: {session_id}"}
            
        topic = session.get("topic", {})
        section_title = topic.get("section_title", "")
        
        segment_context = self._build_knowledge_context(session, segment_id)
        
        user_prompt = (
            f"SECTION: {section_title}\n"
            f"TEXTBOOK CONTEXT:\n{segment_context}\n\n"
        )
        
        raw = _call_llm(_MCQ_FLASHCARD_SYSTEM_PROMPT, user_prompt)
        parsed = _parse_json(raw)
        
        if not parsed:
            return {"error": "Failed to generate flashcard"}
        
        # Use the provided flashcard_id and segment_id
        parsed["flashcard_id"] = flashcard_id
        parsed["segment_id"] = segment_id
        parsed["flashcard_type"] = flashcard_type
        
        # Save to session history
        history = session["avatar_session_history"]
        if "generated_mcqs" not in history:
            history["generated_mcqs"] = []
        history["generated_mcqs"].append(parsed)
        
        self.store.save(session)
        
        return {
            "flashcard_id": flashcard_id,
            "segment_id": segment_id,
            "flashcard_type": flashcard_type,
            "question": parsed.get("question", ""),
            "options": parsed.get("options", {}),
            "answer": parsed.get("answer", ""),
            "option_explanations": parsed.get("option_explanations", {})
        }

    def generate_flashcard_informative(self, session_id: str, flashcard_id: str,
                                        flashcard_type: str, segment_id: str) -> Dict:
        """Generate an informative flashcard popup with a real-world example."""
        session = self.store.load(session_id)
        if not session:
            return {"error": f"Avatar session not found: {session_id}"}
            
        topic = session.get("topic", {})
        section_title = topic.get("section_title", "")
        
        segment_context = self._build_knowledge_context(session, segment_id)
        
        user_prompt = (
            f"SECTION: {section_title}\n"
            f"TEXTBOOK CONTEXT:\n{segment_context}\n\n"
        )
        
        raw = _call_llm(_INFORMATIVE_FLASHCARD_SYSTEM_PROMPT, user_prompt)
        parsed = _parse_json(raw)
        
        if not parsed:
            return {"error": "Failed to generate informative flashcard"}
        
        # Use the provided flashcard_id and segment_id
        parsed["flashcard_id"] = flashcard_id
        parsed["segment_id"] = segment_id
        parsed["flashcard_type"] = flashcard_type
        
        return parsed

    # ── Resume Session ────────────────────────────────────────────────────────

    def resume_session(self, session_id: str) -> Dict:
        """Resume avatar from where it paused after doubt clearing."""

        session = self.store.load(session_id)
        if not session:
            return {"error": f"Avatar session not found: {session_id}"}

        history = session["avatar_session_history"]
        progress = history["progress"]

        if progress["status"] != "paused_for_doubt":
            return {"error": "Session is not paused. Nothing to resume."}

        # Mark latest doubt as resolved
        if history["doubts_raised"]:
            latest_doubt = history["doubts_raised"][-1]
            latest_doubt["resolved"] = True
            latest_doubt["resolved_at"] = datetime.now(timezone.utc).isoformat()

            # Find resume segment
            paused_at = latest_doubt["paused_at_segment_id"]
            segments = session.get("avatar_explanation", {}).get("segments", [])

            resume_idx = 0
            for i, seg in enumerate(segments):
                if seg["segment_id"] == paused_at:
                    resume_idx = i + 1
                    latest_doubt["resumed_at_segment_id"] = segments[resume_idx]["segment_id"] if resume_idx < len(segments) else None
                    break

            # Add completed segments up to pause point
            for seg in segments[:resume_idx]:
                if seg["segment_id"] not in progress["completed_segments"]:
                    progress["completed_segments"].append(seg["segment_id"])

            # Update progress
            progress["status"] = "in_progress"
            if resume_idx < len(segments):
                progress["current_segment_id"] = segments[resume_idx]["segment_id"]
            progress["percent_complete"] = round(
                len(progress["completed_segments"]) / progress["total_segments"] * 100, 1
            ) if progress["total_segments"] > 0 else 0

            # Remaining segments
            remaining = segments[resume_idx:]

            self.store.save(session)

            return {
                "action": "resumed",
                "resumed_from_segment_id": segments[resume_idx]["segment_id"] if resume_idx < len(segments) else None,
                "remaining_segments": remaining,
                "avatar_session_history": {
                    "progress": progress,
                },
            }

        return {"error": "No doubts to resolve"}

    # ── Get Session ───────────────────────────────────────────────────────────

    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get full session details."""
        session = self.store.load(session_id)
        if not session:
            return None
        # Remove raw enrichment from response to keep it smaller
        result = {k: v for k, v in session.items() if k != "enrichment"}
        return result

    # ── Get History ───────────────────────────────────────────────────────────

    def get_history(self, candidate_id: str,
                    subject: Optional[str] = None,
                    unit_number: Optional[int] = None) -> List[Dict]:
        """List all avatar sessions for a student."""
        return self.store.list_by_candidate(candidate_id, subject, unit_number)

    # ── End Session ───────────────────────────────────────────────────────────

    def end_session(self, session_id: str) -> Dict:
        """End session and save summary to student performance."""

        session = self.store.load(session_id)
        if not session:
            return {"error": f"Avatar session not found: {session_id}"}

        history = session["avatar_session_history"]
        progress = history["progress"]

        if progress["status"] == "ended":
            return {"error": "Session already ended"}

        now = datetime.now(timezone.utc).isoformat()
        started_at = history.get("started_at", now)

        # Calculate duration
        try:
            start_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(now.replace("Z", "+00:00"))
            duration_seconds = int((end_dt - start_dt).total_seconds())
        except Exception:
            duration_seconds = 0

        # Mark all segments as completed if they're not already
        segments = session.get("avatar_explanation", {}).get("segments", [])
        all_seg_ids = [s["segment_id"] for s in segments]

        # Count types
        teaching_count = sum(1 for s in segments if s.get("type") == "teaching")
        flashcard_count = sum(1 for s in segments if s.get("type") == "flashcard")
        completed_teaching = sum(
            1 for sid in progress["completed_segments"]
            if any(s["segment_id"] == sid and s.get("type") == "teaching" for s in segments)
        )
        completed_flashcards = sum(
            1 for sid in progress["completed_segments"]
            if any(s["segment_id"] == sid and s.get("type") == "flashcard" for s in segments)
        )

        doubts = history.get("doubts_raised", [])
        auto_fc_count = sum(1 for d in doubts if d.get("flashcard_auto_generated"))

        # Update progress
        progress["status"] = "completed" if len(progress["completed_segments"]) >= len(segments) else "ended"
        progress["completed_teaching_segments"] = completed_teaching
        progress["completed_flashcards"] = completed_flashcards
        progress["percent_complete"] = round(
            len(progress["completed_segments"]) / progress["total_segments"] * 100, 1
        ) if progress["total_segments"] > 0 else 0

        session["ended_at"] = now
        self.store.save(session)

        # Save to student performance
        self._save_to_performance(session)

        # Delete session data from avatar_data after completion
        self.store.delete(session_id)

        summary = {
            "section_title": session.get("topic", {}).get("section_title", ""),
            "total_segments": len(segments),
            "completed_segments": len(progress["completed_segments"]),
            "teaching_segments_completed": completed_teaching,
            "inline_flashcards_shown": completed_flashcards,
            "doubts_raised": len(doubts),
            "doubts_resolved": sum(1 for d in doubts if d.get("resolved")),
            "auto_flashcards_generated": auto_fc_count,
            "percent_complete": progress["percent_complete"],
            "duration_seconds": duration_seconds,
            "status": progress["status"],
        }

        return {
            "session_id": session_id,
            "message": "Avatar session ended and saved to performance",
            "summary": summary,
            "performance_updated": True,
        }

    # ── Save to Performance Tracker ───────────────────────────────────────────

    def _save_to_performance(self, session: Dict) -> None:
        """Record the avatar session in the student performance tracker."""
        try:
            from student_performance import get_performance_tracker
            tracker = get_performance_tracker()
            topic = session.get("topic", {})
            student = session.get("student", {})

            tracker.record_tutor_interaction(
                candidate_id=student.get("candidate_id", ""),
                subject=topic.get("subject", ""),
                unit_number=topic.get("unit_number", 0),
                topic=topic.get("section_title", "avatar_session"),
                query_summary=f"Avatar session: {topic.get('section_title', '')}",
                candidate_name=student.get("candidate_name", ""),
                unit_title=topic.get("unit_title", ""),
            )
        except Exception as e:
            print(f"  ⚠️  [Avatar] Failed to save to performance: {e}")


# ══════════════════════════════════════════════════════════════════════════════
#  SINGLETON
# ══════════════════════════════════════════════════════════════════════════════

_avatar_engine: Optional[AvatarEngine] = None


def get_avatar_engine() -> AvatarEngine:
    global _avatar_engine
    if _avatar_engine is None:
        _avatar_engine = AvatarEngine()
    return _avatar_engine
