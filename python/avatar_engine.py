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

Six-phase lessons (sections built by avatar_lesson_builder) add, in order:
  start_session → submit_hook → play explanation (pictures inline in the text)
               → reveal_real_world → submit_explore → submit_mystery
               → submit_explanation → end_session
Everything those phases show was generated and stored at build time; the only
live LLM calls are raise-hand doubts, free-text judging and explain-back feedback.
"""

import os
import re
import json
import time
import uuid
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests

import avatar_llm
from dotenv import load_dotenv

import avatar_lesson_patterns as lesson_patterns
from avatar_lesson_builder import pick_for_session
from avatar_text_utils import (checkpoint_focus, content_tokens, is_repeat_question,
                               normalize_question)
from class_utils import class_matches
from logger import get_logger

logger = get_logger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

# NOT OpenAI. The account's credits are exhausted - every call returned
# credit_balance_exhausted - so the live classroom (doubt clearing, MCQ
# checkpoints, suggested questions) was failing on every request.
#
# Gemini 2.5 Flash is chosen here for LATENCY as much as quality: this model
# answers a student who is sitting there waiting, and in the teaching-script
# benchmark it was ~3x faster than the alternatives (8.7s vs 25.3s Llama,
# 39.7s Qwen) at a near-identical structural score (0.90 vs 0.92 / 0.85).
# Enrichment, which generates scripts offline in batch, keeps Llama - see
# ENRICHMENT_MODEL - because there the cost matters and the wait does not.
AVATAR_MODEL = os.getenv("AVATAR_MODEL", "gemini-3.6-flash")   # Google direct, never OpenRouter
AVATAR_FALLBACK_MODEL = os.getenv("AVATAR_FALLBACK_MODEL",
                                  "meta-llama/llama-4-scout")
AVATAR_RAG_TOP_K = 5
AVATAR_SEGMENT_SUGGESTION_COUNT = 3   # doubt-popup questions prepared per segment
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
3. Return your clarification as JSON with EXACTLY this structure:

{
  "clarification_segments": [
    {
      "text": "What you say to the student",
      "emotion": "one of: enthusiastic, curious, encouraging, surprised, thoughtful, playful, empathetic, confident, warm, inspiring"
    }
  ]
}

RULES:
- If the student's doubt is vague, incomplete, or just an announcement (e.g., "I have a doubt", "Wait", "Explain please"), DO NOT explain the concept. Instead, reply with a single empathetic segment asking them to clarify what their specific doubt is (e.g., "I'm here to help! What exactly is your doubt about this topic?").
- Otherwise, the clarification should be 2-4 segments, each with a different emotion. Start empathetic, then explain, then end with an encouraging closing statement.
- Use the textbook context as primary source. Do NOT hallucinate.
- Do NOT include any "auto_flashcard" field. ONLY return "clarification_segments".
- The JSON must contain ONLY the "clarification_segments" key. Nothing else.
- Do NOT suggest or mention flashcards at any point.
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
Generate ONE multiple-choice question to test the student's understanding.

WHAT TO ASK ABOUT — this is the most important rule:
- A checkpoint tests what the student has JUST been taught. Ask about the
  CHECKPOINT FOCUS section of the prompt, not about the lesson as a whole.
- The wider TEXTBOOK CONTEXT is background only. Never build the question from a
  part of the lesson the student has not reached yet.
- If ALREADY ASKED questions are listed, your question must test a DIFFERENT
  concept from every one of them. Rewording an earlier question, or asking about
  the same definition from another angle, counts as a repeat and is not allowed.
  A section that teaches several ideas has several things worth testing — pick
  one that has not been used.

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
Generate a real-world example and an easy-to-understand explanation of the concept.

Build the card from the CHECKPOINT FOCUS section of the prompt — that is what the
student has just been taught. The wider TEXTBOOK CONTEXT is background only.

Return EXACTLY this JSON structure:
{
  "flashcard_id": "fc_info_XXX",
  "card_title": "Short title for the flashcard",
  "front": "The real-world example or easy-to-understand explanation of the concept. Keep it concise, engaging, and relatable.",
  "avatar_line": "What the avatar says while showing this flashcard.",
  "avatar_emotion": "one of: enthusiastic, curious, encouraging, surprised, thoughtful, playful, empathetic, confident, warm, inspiring"
}
"""


_SUGGESTED_QUESTIONS_SYSTEM_PROMPT = """You are GradeUp AI Avatar — a school teacher who knows exactly where students get stuck.

The lesson is about to start. The student can pause at ANY segment and open the "ask a doubt"
popup, so prepare a set of questions for each individual segment up front, ready to show the
moment they raise their hand there.

RULES:
- Write every question in the STUDENT'S own voice, the way they would say it out loud
  ("Why does the water rise in the tube?" — NOT "Explain the principle of capillary action").
- Keep each question under 14 words: simple, specific, and answerable from the content taught.
- Base them ONLY on the teaching content provided. Never invent material that is not there.
- A segment's questions must be about what THAT segment teaches. Never point a student at a later
  segment they have not reached yet.
- No yes/no questions, no numbering, no duplicates, no questions about the lesson format.
- Cover EVERY segment id listed, with exactly the number of questions asked for.

Return EXACTLY this JSON structure:
{
  "segment_questions": {
    "<segment_id>": ["...", "...", "..."]
  }
}
"""


def _call_llm(system_prompt: str, user_prompt: str,
              model: str = AVATAR_MODEL, max_tokens: int = 3000,
              force_json: bool = True,
              trace_name: str = "avatar-generate") -> Optional[str]:
    """One completion for the live classroom. None on any failure.

    Provider routing, the token-budget field and the JSON mode quirks all live
    in avatar_llm, so ``model`` may name any provider.

    ``trace_name`` is what the call is called in Langfuse. Every caller passes
    its own, because "which step regressed" is only answerable if the steps are
    told apart - one shared name would collapse doubt answering, intent
    classification and flashcard generation into a single undifferentiated bar.
    """
    result = avatar_llm.chat(
        model, system_prompt, user_prompt,
        max_tokens=max_tokens,
        force_json=force_json,
        timeout=AVATAR_TIMEOUT,
        fallback_model=AVATAR_FALLBACK_MODEL,
        trace_name=trace_name,
    )
    if not result.ok:
        logger.error(f"[Avatar] LLM call failed ({model}): {result.error[:250]}")
        return None
    return result.text


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
        logger.warning(f"[Avatar] JSON parse error: {e}")
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
                if class_number and not class_matches(meta.get("class_number"), class_number):
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
                    # Maths sections keep their avatar material under
                    # section_enrichment; everything else under enrichment.
                    enrichment = sec.get("enrichment") or sec.get("section_enrichment") or {}
                    return {
                        "unit_title": unit.get("title", ""),
                        "section_title": sec_title,
                        "enrichment": enrichment,
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

            # A segment may be showing a picture. The student can see it, so a
            # doubt raised here may well be about the picture rather than the
            # words — without this the answer talks past what is on screen.
            visual = seg.get("visual") or {}
            if visual.get("shows"):
                line += f"\n    (picture on screen: {visual['shows']})"

            knowledge_lines.append(line)

            # Track the current segment separately
            if seg_id == current_segment_id:
                if seg.get("type") == "flashcard":
                    current_text = f"Flashcard Title: {seg.get('card_title', '')}\nText: {seg.get('front', '')}"
                else:
                    current_text = seg.get("text", "")

        if knowledge_lines:
            parts.append(f"=== TEACHING SEGMENTS (Knowledge Base) ===\n" + "\n".join(knowledge_lines))

        # A seven-phase lesson asked a hook question before teaching and will
        # show a real-world example after it; a doubt raised in either phase
        # is about those, so they are part of what the answer can draw on.
        lesson = session.get("avatar_lesson") or {}
        hook = lesson_patterns.phase(lesson, "hook")
        if hook:
            opts = "; ".join(f"{k}. {v}" for k, v in (hook.get("options") or {}).items())
            parts.append(f"=== HOOK QUESTION (asked before the lesson) ===\n"
                         f"{hook.get('scenario', '')} {hook.get('question', '')}\n"
                         f"Options: {opts}\nCorrect: {hook.get('answer')} — "
                         f"{(hook.get('option_explanations') or {}).get(hook.get('answer'), '')}")
        real_world = lesson_patterns.phase(lesson, "real_world")
        if real_world:
            parts.append(f"=== REAL-WORLD EXAMPLE ===\n{real_world.get('question', '')}\n"
                         f"{(real_world.get('reveal') or {}).get('text', '')}")

        if current_text:
            parts.append(f"=== CURRENT SEGMENT (Student paused here) ===\n[{current_segment_id}] {current_text}")

        return "\n\n".join(parts) if parts else "General topic context."

    @staticmethod
    def _checkpoint_focus(session: Dict, segment_id: str) -> str:
        """The teaching this checkpoint is meant to test (avatar_text_utils.checkpoint_focus).

        Shared with the lesson builder, which needs the same window at build
        time to write a checkpoint's card pool.
        """
        segments = session.get("avatar_explanation", {}).get("segments", []) or []
        return checkpoint_focus(segments, segment_id)

    @staticmethod
    def _previous_mcq_questions(session: Dict) -> List[str]:
        """Questions already asked in this session, oldest first."""
        history = session.get("avatar_session_history") or {}
        return [
            str(m.get("question") or "").strip()
            for m in (history.get("generated_mcqs") or [])
            if str(m.get("question") or "").strip()
        ]

    # ── Suggested Doubt Questions (popup) ─────────────────────────────────────

    @staticmethod
    def _normalize_question(question: str) -> str:
        """Loose key for comparing two questions ('Why are leaves green?' == 'why are leaves green')."""
        return normalize_question(question)

    @classmethod
    def _content_tokens(cls, question: str) -> set:
        """Meaning-carrying, crudely stemmed words of a question (avatar_text_utils)."""
        return content_tokens(question)

    @classmethod
    def _is_repeat_question(cls, question: str, previous: List[str],
                            threshold: float = 0.6) -> bool:
        """True when `question` re-asks something already in `previous`."""
        return is_repeat_question(question, previous, threshold)

    @classmethod
    def _already_asked(cls, question: str, asked_norms: List[str]) -> bool:
        """True when the student has already asked this — or near enough."""
        norm = cls._normalize_question(question)
        if not norm:
            return True
        if norm in asked_norms:
            return True

        tokens = set(norm.split())
        if not tokens:
            return True
        for asked in asked_norms:
            asked_tokens = set(asked.split())
            if not asked_tokens:
                continue
            # Jaccard overlap catches rewordings the LLM produces on a re-run
            if len(tokens & asked_tokens) / len(tokens | asked_tokens) >= 0.8:
                return True
        return False

    @classmethod
    def _asked_norms(cls, session: Dict) -> List[str]:
        return [cls._normalize_question(q)
                for q in session.get("asked_suggested_questions", []) or []]

    @classmethod
    def _record_asked_question(cls, session: Dict, question: str) -> None:
        """
        Remember a question the student has asked and retire it from the popup.

        Also drops it from every cached per-segment list, so reopening the popup
        never offers a question they already used.
        """
        question = (question or "").strip()
        if not question:
            return

        asked = session.setdefault("asked_suggested_questions", [])
        if not any(cls._normalize_question(question) == cls._normalize_question(a)
                   for a in asked):
            asked.append(question)

        asked_norms = cls._asked_norms(session)
        cache = session.get("suggested_questions_by_segment") or {}
        for seg_key, questions in list(cache.items()):
            cache[seg_key] = [q for q in questions
                              if not cls._already_asked(q, asked_norms)]
        session["suggested_questions"] = [
            q for q in session.get("suggested_questions", []) or []
            if not cls._already_asked(q, asked_norms)
        ]

    @classmethod
    def _fallback_suggested_questions(cls, session: Dict, segment_id: Optional[str] = None,
                                      count: int = AVATAR_SEGMENT_SUGGESTION_COUNT) -> List[str]:
        """Deterministic suggestions used when the LLM is unavailable."""
        topic = session.get("topic", {})
        section = (topic.get("section_title") or topic.get("unit_title")
                   or "this topic").strip()
        segments = session.get("avatar_explanation", {}).get("segments", []) or []
        asked_norms = cls._asked_norms(session)

        questions: List[str] = []
        seen: set = set()

        def _add(q: str) -> None:
            key = q.lower()
            if q and key not in seen and not cls._already_asked(q, asked_norms):
                seen.add(key)
                questions.append(q)

        # The paused segment is what the student is actually looking at
        current_idx = next((i for i, s in enumerate(segments)
                            if s.get("segment_id") == segment_id), None)
        if current_idx is not None and segments[current_idx].get("card_title"):
            _add(f"Can you explain {segments[current_idx]['card_title']} again?")

        # Only what the student has already been taught — never spoil a segment
        # they have not reached yet.
        taught = segments if current_idx is None else segments[:current_idx + 1]
        for seg in reversed(taught):
            if len(questions) >= count:
                break
            card_title = (seg.get("card_title") or "").strip()
            if card_title:
                _add(f"What does {card_title} mean?")

        for generic in (
            f"Can you explain {section} in a simpler way?",
            f"Why is {section} important?",
            f"Can you give a real-life example of {section}?",
            f"What is the most important point in {section}?",
            f"Where do we see {section} in daily life?",
            f"Which part of {section} do students find hardest?",
            f"What should I remember about {section} for my exam?",
            f"How does {section} connect to what we learnt before?",
        ):
            if len(questions) >= count:
                break
            _add(generic)

        return questions[:count]

    def _build_start_suggestions(
        self, session: Dict,
        per_segment_count: int = AVATAR_SEGMENT_SUGGESTION_COUNT,
    ) -> Dict[str, List[str]]:
        """
        Prepare every doubt-popup question for the whole session in ONE LLM call.

        Returns ``{segment_id: [questions]}``. Doing this at start_session means
        raising a hand mid-lesson costs no extra round trip — the questions for
        that segment are already on the session.
        """
        topic = session.get("topic", {})
        segments = session.get("avatar_explanation", {}).get("segments", []) or []

        segment_lines = []
        for seg in segments:
            seg_id = seg.get("segment_id", "")
            if seg.get("type") == "flashcard":
                body = f"Flashcard: {seg.get('card_title', '')} — {seg.get('front', '')}"
            else:
                body = seg.get("text", "")
            segment_lines.append(f"[{seg_id}] {body}")

        concept_overview = (session.get("enrichment", {}).get("concept_overview")
                            or session.get("avatar_explanation", {}).get("concept_overview", ""))

        user_prompt = (
            f"SECTION: {topic.get('section_title', '')}\n"
            f"SUBJECT: {topic.get('subject', '')} — Class {topic.get('class_number', '')}\n"
            f"QUESTIONS PER SEGMENT: {per_segment_count}\n\n"
        )
        if concept_overview:
            user_prompt += f"CONCEPT OVERVIEW:\n{concept_overview}\n\n"
        user_prompt += (
            "SEGMENTS (generate one set per id, about that segment only):\n"
            + "\n".join(segment_lines)
            + f"\n\nReturn 'segment_questions' with exactly {per_segment_count} questions "
              f"for EVERY segment id above."
        )

        raw = _call_llm(
            _SUGGESTED_QUESTIONS_SYSTEM_PROMPT, user_prompt,
            max_tokens=min(4000, 400 + 150 * len(segments)),
            trace_name="suggest-questions",
        )
        parsed = _parse_json(raw) if raw else None
        raw_by_segment = (parsed or {}).get("segment_questions") or {}

        if not raw_by_segment:
            logger.warning("[Avatar] Suggested questions unavailable — using fallback")

        by_segment: Dict[str, List[str]] = {}
        for seg in segments:
            seg_id = seg.get("segment_id", "")
            if not seg_id:
                continue

            questions: List[str] = []
            seen: set = set()
            for q in raw_by_segment.get(seg_id) or []:
                q = str(q).strip()
                if q and q.lower() not in seen:
                    seen.add(q.lower())
                    questions.append(q)
                if len(questions) >= per_segment_count:
                    break

            # Any segment the model skipped falls back to the deterministic set
            for q in self._fallback_suggested_questions(session, seg_id, per_segment_count):
                if len(questions) >= per_segment_count:
                    break
                if q.lower() not in seen:
                    seen.add(q.lower())
                    questions.append(q)

            by_segment[seg_id] = questions

        return by_segment

    def _suggestions_for_segment(
        self, session: Dict, segment_id: Optional[str],
        count: int = AVATAR_SEGMENT_SUGGESTION_COUNT,
    ) -> List[str]:
        """
        The questions to show for one segment, served from what start_session
        already generated — minus anything the student has used.

        If this segment's set runs dry, the gap is filled from the segments they
        have already been taught (nearest first), then from the deterministic
        set — never from a segment they have not reached yet.
        """
        asked_norms = self._asked_norms(session)
        by_segment = session.get("suggested_questions_by_segment") or {}
        segments = session.get("avatar_explanation", {}).get("segments", []) or []

        questions: List[str] = []
        seen: set = set()

        def _take(candidates: List[str]) -> None:
            for q in candidates or []:
                if len(questions) >= count:
                    return
                if q.lower() in seen or self._already_asked(q, asked_norms):
                    continue
                seen.add(q.lower())
                questions.append(q)

        _take(by_segment.get(segment_id or "", []))

        if len(questions) < count:
            current_idx = next((i for i, s in enumerate(segments)
                                if s.get("segment_id") == segment_id), None)
            taught = segments if current_idx is None else segments[:current_idx + 1]
            for seg in reversed(taught):
                if len(questions) >= count:
                    break
                _take(by_segment.get(seg.get("segment_id", ""), []))

        _take(self._fallback_suggested_questions(session, segment_id, count))

        return questions[:count]

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

            # Strip legacy RAG metadata from doubt_context
            dc = enrichment.get("doubt_context", {})

        # 2. Create session
        session_id = f"avatar_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        # A six-phase lesson (built and stored by avatar_lesson_builder): shape
        # it for the player (the one mystery under mysteries[]) and take the
        # teaching segments - pictures inline in their text - from the
        # explanation phase. Everything the phases show is already on disk with
        # audio - no generation happens here.
        lesson = None
        stored_lesson = lesson_patterns.lesson_of(enrichment)
        if stored_lesson:
            lesson = pick_for_session(stored_lesson, session_id)
            explanation = lesson_patterns.phase(lesson, "explanation") or {}
            segments = explanation.get("segments") or segments
            avatar_explanation = {
                "teaching_style": explanation.get("teaching_style", ""),
                "total_duration_estimate": explanation.get("total_duration_estimate", ""),
                "segments": segments,
            }

        if not segments:
            return {"error": f"No avatar segments found for section '{section_title}'. Enrichment may not have avatar data."}

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
        if lesson:
            session["avatar_lesson"] = lesson
            session["avatar_session_history"]["progress"]["phase"] = "hook"
            session["avatar_session_history"]["progress"]["phase_index"] = 0
            session["phase_state"] = {}

        # 3. Pre-generate a doubt-popup question set for every segment now, so
        #    raising a hand mid-lesson needs no extra call.
        by_segment = self._build_start_suggestions(session)
        session["suggested_questions_by_segment"] = by_segment
        # Questions the student has used — never suggested twice
        session["asked_suggested_questions"] = []

        self.store.save(session)

        # 4. Return response (without full enrichment to keep response clean)
        response = {
            "session_id": session_id,
            "message": "Avatar teaching session started",
            "student": session["student"],
            "topic": session["topic"],
            "avatar_explanation": avatar_explanation,
            "suggested_questions_by_segment": by_segment,
            "avatar_session_history": session["avatar_session_history"],
        }
        if lesson:
            # The phases in play order, minus the marking keys the client
            # must not see mid-lesson (hook answer, mystery answers, explore keys).
            response["avatar_lesson"] = self._client_lesson(lesson)
        return response

    # ── Raise Hand (Doubt Clearing + Auto Flashcard) ──────────────────────────

    def raise_hand(self, session_id: str, student_doubt: str,
                   segment_id: Optional[str] = None) -> Dict:
        """Student raises hand — pause, extract context, generate clarification.

        ``segment_id`` says where the student is (defaults to the session's
        current segment). If that segment - or the last one before it - has a
        picture on screen, the doubt is answered by a vision model looking at
        the actual image; this is the one doubt endpoint, there is no separate
        "ask about the picture" call.
        """

        session = self.store.load(session_id)
        if not session:
            return {"error": f"Avatar session not found: {session_id}"}

        history = session["avatar_session_history"]
        progress = history["progress"]

        if progress["status"] == "completed":
            return {"error": "Session already completed"}
        if progress["status"] == "ended":
            return {"error": "Session already ended"}

        # 1. Pause at the segment the student is on. A client that passes the
        #    segment it is showing keeps the session's own pointer in step.
        if segment_id:
            progress["current_segment_id"] = segment_id
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

        # 3a. If a picture is on screen, answer from the picture itself.
        #     The student is looking at it, so "what is the thick red one?" only
        #     has an answer if we look too. This is why raising a hand does not
        #     need a separate picture endpoint — it routes here automatically.
        visual_reply, visual_used = self._visual_clarification(
            session, paused_at, student_doubt
        )

        if visual_reply:
            clarification_segments = visual_reply
        else:
            raw = _call_llm(_DOUBT_SYSTEM_PROMPT, user_prompt,
                            trace_name="answer-doubt")
            parsed = _parse_json(raw)

            # Fallback if LLM fails
            if not parsed:
                parsed = {
                    "clarification_segments": [
                        {
                            "text": f"Let me explain that differently. {student_doubt.rstrip('?')} — this is covered in your textbook. I hope that helps clarify things for you!",
                            "emotion": "empathetic"
                        }
                    ]
                }

            clarification_segments = parsed.get("clarification_segments", [])

        # 4. Find resume point
        # Segments live on avatar_explanation, not on topic — reading them from
        # topic left resume_from_segment_id permanently null.
        resume_segment_id = None
        segments = session.get("avatar_explanation", {}).get("segments", [])
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
            "answered_from_visual": bool(visual_used),
            "visual_image_url": visual_used.get("image_url") if visual_used else None,
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

        # Retire the question the student just used — tapped or typed, it must not
        # be offered again — then serve the next set for this segment from what
        # start_session already prepared.
        self._record_asked_question(session, student_doubt)
        follow_ups = self._suggestions_for_segment(session, paused_at)
        session["suggested_questions"] = follow_ups

        self.store.save(session)

        return {
            "action": "doubt_clarification",
            "doubt_id": doubt_id,
            "paused_at_segment_id": paused_at,
            "clarification": {
                "segments": clarification_segments,
                "sources_used": [],
            },
            # Present only when the answer was read off the picture on screen,
            # so the client can highlight what the avatar is pointing at.
            "answered_from_visual": bool(visual_used),
            "visual_context": ({
                "segment_id": visual_used.get("segment_id"),
                "image_url": visual_used.get("image_url"),
                "shows": visual_used.get("shows", ""),
                "points_at": visual_used.get("points_at", ""),
            } if visual_used else None),
            "auto_flashcard": None,
            "suggested_questions": follow_ups,
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
        
        intent_raw = _call_llm(classify_prompt, "Classify the response.", max_tokens=15,
                               force_json=False, trace_name="classify-intent")
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
            
            raw = _call_llm(_FLASHCARD_SYSTEM_PROMPT, user_prompt,
                            trace_name="generate-flashcard")
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
        focus = self._checkpoint_focus(session, segment_id)
        previous = self._previous_mcq_questions(session)

        def _prompt(extra: str = "") -> str:
            body = (
                f"SECTION: {section_title}\n"
                f"TEXTBOOK CONTEXT (background — do NOT question from here alone):\n"
                f"{segment_context}\n\n"
                f"CHECKPOINT FOCUS (what this checkpoint must test):\n{focus}\n\n"
            )
            if previous:
                body += (
                    "ALREADY ASKED in this lesson — do NOT repeat or reword any "
                    "of these, and do NOT test the same concept again:\n"
                    + "\n".join(f"- {q}" for q in previous) + "\n\n"
                )
            return body + extra

        raw = _call_llm(_MCQ_FLASHCARD_SYSTEM_PROMPT, _prompt(),
                        trace_name="generate-mcq-flashcard")
        parsed = _parse_json(raw)

        # One retry when the model repeats itself anyway — the checkpoints in a
        # section share most of their context, so the same "obvious" question
        # wins unless we name it and rule it out.
        if parsed and self._is_repeat_question(parsed.get("question", ""), previous):
            logger.info(
                f"[Avatar] MCQ {flashcard_id} repeated an earlier question — "
                f"regenerating: {parsed.get('question', '')[:80]}"
            )
            retry_raw = _call_llm(_MCQ_FLASHCARD_SYSTEM_PROMPT, _prompt(
                f"Your previous attempt was REJECTED as a repeat:\n"
                f"\"{parsed.get('question', '')}\"\n"
                f"Ask about a different idea taught in the CHECKPOINT FOCUS above.\n"
            ), trace_name="generate-mcq-flashcard")
            retry_parsed = _parse_json(retry_raw)
            if retry_parsed and retry_parsed.get("question"):
                if self._is_repeat_question(retry_parsed.get("question", ""), previous):
                    logger.warning(
                        f"[Avatar] MCQ {flashcard_id} still repeats after retry — "
                        f"serving it rather than failing the checkpoint"
                    )
                parsed = retry_parsed

        if not parsed:
            return {"error": "Failed to generate flashcard"}

        # Use the provided flashcard_id and segment_id
        parsed["flashcard_id"] = flashcard_id
        parsed["segment_id"] = segment_id
        parsed["flashcard_type"] = flashcard_type

        # Save to session history. The batch endpoint generates a section's
        # checkpoints one after another, so this is what the NEXT card in the
        # same batch reads as its "already asked" list.
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
        """Generate an informative flashcard popup with a real-world example.

        A seven-phase lesson already holds this session's card for the
        checkpoint (picked from the stored pool at start), so that is served
        as-is; only legacy sessions still generate one live.
        """
        session = self.store.load(session_id)
        if not session:
            return {"error": f"Avatar session not found: {session_id}"}

        for seg in session.get("avatar_explanation", {}).get("segments", []) or []:
            if seg.get("segment_id") == segment_id and seg.get("card"):
                card = seg["card"]
                return {
                    "flashcard_id": flashcard_id,
                    "segment_id": segment_id,
                    "flashcard_type": "informative",
                    "card_id": card.get("card_id"),
                    "card_title": card.get("card_title", ""),
                    "front": card.get("front", ""),
                    "avatar_line": card.get("avatar_line", ""),
                    "avatar_emotion": card.get("avatar_emotion", "warm"),
                    "audio": card.get("audio", {}),
                    "source": "stored",
                }

        topic = session.get("topic", {})
        section_title = topic.get("section_title", "")

        segment_context = self._build_knowledge_context(session, segment_id)
        # Same reason as the MCQ path: without a per-checkpoint focus every
        # informative card in a section is generated from an identical prompt.
        focus = self._checkpoint_focus(session, segment_id)

        user_prompt = (
            f"SECTION: {section_title}\n"
            f"TEXTBOOK CONTEXT (background):\n{segment_context}\n\n"
            f"CHECKPOINT FOCUS (what this card must illustrate):\n{focus}\n\n"
        )

        raw = _call_llm(_INFORMATIVE_FLASHCARD_SYSTEM_PROMPT, user_prompt,
                        trace_name="generate-informative-flashcard")
        parsed = _parse_json(raw)
        
        if not parsed:
            return {"error": "Failed to generate informative flashcard"}
        
        # Use the provided flashcard_id and segment_id
        parsed["flashcard_id"] = flashcard_id
        parsed["segment_id"] = segment_id
        parsed["flashcard_type"] = flashcard_type

        return parsed

    # ── Teaching Visuals (the picture on screen) ──────────────────────────────
    # Doubts about a picture go through raise_hand, which looks at the image.
    # The explore phase's picture walkthrough is judged in _explore_walkthrough.

    def _segment_visual(self, session: Dict,
                        segment_id: Optional[str] = None) -> tuple:
        """The picture attached to a segment, as ``(segment, visual)``.

        With no ``segment_id`` this falls back to whichever segment the lesson
        is currently on, so a student can just ask "what is this picture?"
        without the client having to tell us which one they mean.
        """
        segments = session.get("avatar_explanation", {}).get("segments", [])
        if not segment_id:
            segment_id = session.get("avatar_session_history", {}) \
                                .get("progress", {}).get("current_segment_id")

        for seg in segments:
            if seg.get("segment_id") == segment_id and seg.get("visual"):
                return seg, seg["visual"]

        # The student may have moved on a segment or two before asking. The most
        # recent visual at or before the current point is the one on screen.
        last = None
        for seg in segments:
            if seg.get("visual"):
                last = seg
            if seg.get("segment_id") == segment_id:
                break
        return (last, last["visual"]) if last else (None, None)

    def _visual_lesson_context(self, session: Dict, segment: Optional[Dict]) -> str:
        """Lesson text around a picture, for grounding an answer about it."""
        parts = []
        overview = session.get("enrichment", {}).get("concept_overview", "")
        if overview:
            parts.append(overview)
        if segment and segment.get("text"):
            parts.append(segment["text"])
        return "\n\n".join(parts)

    def _visual_clarification(self, session: Dict, segment_id: Optional[str],
                              student_doubt: str) -> tuple:
        """Answer a doubt from the picture on screen, if there is one.

        Returns ``(clarification_segments, visual)`` — or ``(None, None)`` when
        there is no picture, the visuals module is unavailable, or the image
        cannot be read, in which case the caller falls back to the ordinary
        text-only clarification. Shaped exactly like the text path's segments so
        ``/avatar/raise-hand`` keeps one response contract either way.
        """
        segment, visual = self._segment_visual(session, segment_id)
        if not visual:
            return None, None

        try:
            import avatar_visuals
        except Exception as e:
            logger.info(f"[Avatar] visuals unavailable for doubt ({e})")
            return None, None

        topic = session.get("topic", {})
        answer = avatar_visuals.explain_visual(
            visual["image_url"], student_doubt,
            shows=visual.get("shows", ""),
            lesson_context=self._visual_lesson_context(session, segment),
            class_number=str(topic.get("class_number") or ""),
            subject=topic.get("subject", ""),
        )
        if not answer:
            return None, None

        return ([{"text": answer["answer"], "emotion": answer["emotion"]}],
                {**visual, "points_at": answer.get("points_at", ""),
                 "segment_id": segment.get("segment_id") if segment else None})

    # ══════════════════════════════════════════════════════════════════════
    #  SIX-PHASE LESSON: hook → explanation → real_world → explore → mystery
    #                    → explain_back
    #  (everything shown here was built and stored by avatar_lesson_builder)
    # ══════════════════════════════════════════════════════════════════════

    _EXPLAIN_BACK_PROMPT = """You are GradeUp AI Avatar, a warm school teacher. The student has just explained the
topic of the lesson in their OWN words. Judge the explanation against the KEY POINTS and
the MODEL EXPLANATION - generously on wording, strictly on ideas: a point counts as covered
when the idea is there in any words, and a wrong statement counts against them.

Return EXACTLY this JSON:
{
  "level": 1-5 (5 = every key point covered and nothing wrong; 4 = most points, nothing wrong;
                3 = about half, or one slip; 2 = one or two points, or a real misconception; 1 = off topic),
  "covered": ["the key points the student got, quoted from the KEY POINTS list"],
  "missing": ["the key points they did not cover"],
  "misconceptions": ["anything they said that is wrong, in one short line each - empty if none"],
  "feedback": "3-5 sentences in the avatar's voice: first what they got right (be specific), then the one or two most important things to add or fix, then an encouraging close",
  "emotion": "one of: enthusiastic, curious, encouraging, surprised, thoughtful, playful, empathetic, confident, warm, inspiring"
}
"""

    _FREE_TEXT_JUDGE_PROMPT = """You are GradeUp AI Avatar, a warm school teacher. The student did an activity and
answered an open question. Judge their answer against the MODEL ANSWER generously - a
student who has the idea in their own words is right even if the wording differs.

Return EXACTLY this JSON:
{
  "verdict": "correct" | "partial" | "incorrect",
  "feedback": "2-3 sentences in the avatar's voice: acknowledge what they got, add what they missed, end warmly",
  "emotion": "one of: enthusiastic, curious, encouraging, surprised, thoughtful, playful, empathetic, confident, warm, inspiring"
}
"""

    @staticmethod
    def _client_lesson(lesson: Dict) -> Dict:
        """The lesson as the client may see it: play order kept, marking keys removed."""
        import copy
        safe = copy.deepcopy(lesson)
        for ph in safe.get("phases") or []:
            name = ph.get("phase")
            if name == "hook":
                ph.pop("answer", None)
                ph.pop("option_explanations", None)
                ph.pop("resolutions", None)
            elif name == "explore":
                for holder in (ph.get("interaction"), (ph.get("challenge") or {}).get("interaction")):
                    if isinstance(holder, dict):
                        holder.pop("answer", None)
                        holder.pop("model_answer", None)
                        holder.pop("feedback_correct", None)
                        holder.pop("feedback_incorrect", None)
                        for opt in holder.get("options") or []:
                            opt.pop("feedback", None)
                        for step in holder.get("walkthrough") or []:
                            step.pop("answer", None)
                            step.pop("hint", None)
                if isinstance(ph.get("interaction"), dict) and ph["interaction"].get("visual"):
                    ph["interaction"]["visual"].pop("look_answer", None)
            elif name == "mystery":
                for item in ph.get("mysteries") or ph.get("pool") or []:
                    item.pop("answer", None)
                    item.pop("option_explanations", None)
                    item.pop("reveal", None)
                    if isinstance(item.get("visual"), dict):
                        item["visual"].pop("look_answer", None)
                        # the picture's description would give the game away
                        item["visual"].pop("shows", None)
                        item["visual"].pop("prompt", None)
            elif name == "real_world":
                pass    # the reveal is fetched through reveal_real_world
            elif name == "explain_back":
                ph.pop("key_points", None)
                ph.pop("model_explanation", None)
                ph.pop("guidance", None)
        return safe

    def _lesson_session(self, session_id: str):
        session = self.store.load(session_id)
        if not session:
            return None, {"error": f"Avatar session not found: {session_id}"}
        if not session.get("avatar_lesson"):
            return None, {"error": "This session has no seven-phase lesson (section built before "
                                   "/avatar/lesson/build, or segments supplied directly)"}
        status = session["avatar_session_history"]["progress"].get("status")
        if status in ("completed", "ended"):
            return None, {"error": f"Session already {status}"}
        return session, None

    @staticmethod
    def _set_phase(session: Dict, name: str) -> None:
        progress = session["avatar_session_history"]["progress"]
        progress["phase"] = name
        order = lesson_patterns.PHASE_ORDER
        progress["phase_index"] = order.index(name) if name in order else len(order)

    @staticmethod
    def _next_phase(session: Dict, after: str) -> Optional[str]:
        names = [p.get("phase") for p in session["avatar_lesson"].get("phases") or []]
        if after not in names:
            return None
        idx = names.index(after)
        return names[idx + 1] if idx + 1 < len(names) else "done"

    # ── 1. Hook ─────────────────────────────────────────────────────────────

    def submit_hook(self, session_id: str, option_id: str) -> Dict:
        """The student answers the hook MCQ. Stores the choice and returns the
        stored reason for it - spoken when the explanation returns to the
        question - plus the bridge line into the topic. No LLM."""
        session, err = self._lesson_session(session_id)
        if err:
            return err
        hook = lesson_patterns.phase(session["avatar_lesson"], "hook")
        if not hook:
            return {"error": "This lesson has no hook phase"}
        option_id = str(option_id or "").strip().upper()
        if option_id not in (hook.get("options") or {}):
            return {"error": f"option_id must be one of {list(hook.get('options', {}).keys())}"}

        is_correct = option_id == hook.get("answer")
        resolution = (hook.get("resolutions") or {}).get(option_id) or {
            "segment_id": f"hook_res_{option_id}", "type": "teaching",
            "emotion": "encouraging" if is_correct else "empathetic",
            "text": (hook.get("option_explanations") or {}).get(option_id, ""),
        }
        now = datetime.now(timezone.utc).isoformat()
        session.setdefault("phase_state", {})["hook"] = {
            "option_id": option_id, "option_label": hook["options"][option_id],
            "is_correct": is_correct, "answered_at": now,
        }
        self._set_phase(session, "explanation")
        session["avatar_session_history"].setdefault("emotion_timeline", []).append(
            {"phase": "hook", "emotion": resolution.get("emotion", "warm"), "timestamp": now})
        self.store.save(session)
        return {
            "action": "hook_answered",
            "option_id": option_id,
            "is_correct": is_correct,
            "correct_option": hook.get("answer"),
            "explanation": (hook.get("option_explanations") or {}).get(option_id, ""),
            "resolution": resolution,                      # play after the hook_answer segment
            "bridge": hook.get("bridge"),
            "closing_segment_id": (lesson_patterns.phase(session["avatar_lesson"], "explanation") or {}).get("closing_segment_id"),
            "next_phase": "explanation",
        }

    # ── 3. Explore ──────────────────────────────────────────────────────────

    def submit_explore(self, session_id: str, response: Any,
                       part: str = "interaction", step: Optional[int] = None) -> Dict:
        """Grade the explore activity (``part="interaction"``) or its challenge
        (``part="challenge"``). Choice / order / match / numeric are graded from
        the stored keys; free text is judged by the model against the stored
        model answer; a picture walkthrough is judged step by step by the vision
        model, exactly like the segment walkthroughs."""
        session, err = self._lesson_session(session_id)
        if err:
            return err
        explore = lesson_patterns.phase(session["avatar_lesson"], "explore")
        if not explore:
            return {"error": "This lesson has no explore phase"}
        if part == "challenge":
            interaction = (explore.get("challenge") or {}).get("interaction")
        else:
            part = "interaction"
            interaction = explore.get("interaction")
        if not interaction:
            return {"error": f"This explore phase has no {part}"}

        state = session.setdefault("phase_state", {}).setdefault("explore", {})
        now = datetime.now(timezone.utc).isoformat()
        result: Dict[str, Any]

        if interaction.get("type") == "picture_walkthrough":
            result = self._explore_walkthrough(session, interaction, state, response, step)
        else:
            graded = lesson_patterns.grade_interaction(interaction, response)
            if graded.get("needs_llm"):
                graded = self._judge_free_text(session, interaction, response)
            result = {"verdict": graded["verdict"], "feedback": graded.get("feedback", ""),
                      "emotion": graded.get("emotion", "encouraging" if graded["verdict"] == "correct" else "empathetic"),
                      "finished": True}
            if graded["verdict"] != "correct" and graded.get("expected") is not None \
                    and interaction.get("type") in ("choice", "numeric", "order", "match"):
                result["expected"] = graded["expected"]

        state[part] = {"response": response, "verdict": result["verdict"],
                       "feedback": result.get("feedback", ""), "answered_at": now}
        if interaction.get("type") == "picture_walkthrough":
            # Multi-step: the tour's progress survives across calls.
            state[part]["walkthrough"] = result.get("walkthrough_state")

        finished_activity = part == "interaction" and result.get("finished", True)
        has_challenge = bool((explore.get("challenge") or {}).get("interaction"))
        if finished_activity and not has_challenge:
            self._set_phase(session, self._next_phase(session, "explore") or "mystery")
        elif part == "challenge" and result.get("finished", True):
            self._set_phase(session, self._next_phase(session, "explore") or "mystery")
        session["avatar_session_history"].setdefault("emotion_timeline", []).append(
            {"phase": "explore", "emotion": result.get("emotion", "encouraging"), "timestamp": now})
        self.store.save(session)

        out = {"action": "explore_graded", "part": part, "interaction_type": interaction.get("type"), **result}
        out.pop("walkthrough_state", None)
        if finished_activity and has_challenge:
            out["challenge"] = self._client_lesson({"phases": [explore]})["phases"][0].get("challenge")
            out["next_phase"] = "explore"
        elif result.get("finished", True):
            out["wrap_up"] = explore.get("wrap_up")
            out["next_phase"] = session["avatar_session_history"]["progress"].get("phase")
        else:
            out["next_phase"] = "explore"
        return out

    def _judge_free_text(self, session: Dict, interaction: Dict, response: Any) -> Dict:
        topic = session.get("topic", {})
        user_prompt = (
            f"SECTION: {topic.get('section_title', '')}\n"
            f"QUESTION: {interaction.get('prompt', '')}\n"
            f"MODEL ANSWER: {interaction.get('model_answer', '')}\n"
            f"STUDENT ANSWER: {str(response or '').strip()}\n\n"
            "Judge it and reply in the JSON format specified."
        )
        raw = _call_llm(self._FREE_TEXT_JUDGE_PROMPT, user_prompt, max_tokens=600,
                        trace_name="explore-judge")
        parsed = _parse_json(raw) or {}
        verdict = str(parsed.get("verdict") or "").lower()
        if verdict not in ("correct", "partial", "incorrect"):
            verdict = "partial"
        return {
            "verdict": verdict,
            "feedback": parsed.get("feedback") or (
                "Good thinking - putting it in your own words is exactly the point. "
                f"Here is the idea in full: {interaction.get('model_answer', '')}"),
            "emotion": parsed.get("emotion") or "encouraging",
            "expected": interaction.get("model_answer"),
        }

    def _explore_walkthrough(self, session: Dict, interaction: Dict, state: Dict,
                             response: Any, step: Optional[int]) -> Dict:
        """One step of the explore picture walkthrough, judged on the real image."""
        steps = interaction.get("walkthrough") or []
        visual = interaction.get("visual") or {}
        if not steps or not visual.get("image_url"):
            return {"verdict": "incorrect", "feedback": "This activity has no picture to look at.",
                    "finished": True}
        wt = state.get("interaction", {}).get("walkthrough") or {"completed_steps": 0, "answers": []}
        index = (step - 1) if isinstance(step, int) else wt["completed_steps"]
        if index < 0 or index >= len(steps):
            return {"verdict": "incorrect", "feedback": f"Walkthrough step {index + 1} is out of range.",
                    "finished": wt["completed_steps"] >= len(steps), "walkthrough_state": wt}
        current = steps[index]
        review = None
        try:
            import avatar_visuals
            topic = session.get("topic", {})
            review = avatar_visuals.review_student_observation(
                visual["image_url"], current["ask"], str(response or ""),
                expected_answer=current.get("answer", ""), shows=visual.get("shows", ""),
                class_number=str(topic.get("class_number") or ""), subject=topic.get("subject", ""))
        except Exception as e:  # noqa: BLE001
            logger.info(f"[Avatar] walkthrough review unavailable ({e})")
        if not review:
            review = {"verdict": "partial", "emotion": "encouraging",
                      "response": "Good - looking carefully at the picture is exactly how to work this out. Let's carry on."}
        wt["answers"].append({"step": current.get("step", index + 1), "ask": current["ask"],
                              "student_answer": response, "verdict": review["verdict"],
                              "avatar_response": review["response"]})
        wt["completed_steps"] = max(wt["completed_steps"], index + 1)
        done = wt["completed_steps"]
        finished = done >= len(steps)
        out = {
            "verdict": review["verdict"], "feedback": review["response"],
            "emotion": review.get("emotion", "encouraging"),
            "answered_step": current.get("step", index + 1),
            "completed_steps": done, "total_steps": len(steps), "finished": finished,
            "walkthrough_state": wt,
        }
        if not finished:
            nxt = steps[done]
            out["next_step"] = {"step": nxt.get("step", done + 1), "skill": nxt.get("skill", ""),
                                "ask": nxt.get("ask", ""), "points_at": nxt.get("points_at", "")}
            if review["verdict"] in ("incorrect", "unsure"):
                out["hint"] = current.get("hint", "")
        return out

    # ── 3. Real world ───────────────────────────────────────────────────────

    def reveal_real_world(self, session_id: str) -> Dict:
        """The student taps to see the real-world example: returns the stored
        reveal (text + audio) and its picture. No LLM."""
        session, err = self._lesson_session(session_id)
        if err:
            return err
        rw = lesson_patterns.phase(session["avatar_lesson"], "real_world")
        if not rw:
            return {"error": "This lesson has no real-world phase"}
        now = datetime.now(timezone.utc).isoformat()
        session.setdefault("phase_state", {})["real_world"] = {"revealed": True, "revealed_at": now}
        self._set_phase(session, self._next_phase(session, "real_world") or "explore")
        self.store.save(session)
        return {
            "action": "real_world_revealed",
            "question": rw.get("question", ""),
            "reveal": rw.get("reveal"),
            "why_it_matters": rw.get("why_it_matters", ""),
            "visual": rw.get("visual"),
            "next_phase": session["avatar_session_history"]["progress"].get("phase"),
        }

    # ── 5. Mystery ──────────────────────────────────────────────────────────

    def submit_mystery(self, session_id: str, mystery_id: str, option_id: str) -> Dict:
        """The student says what is going on in the mystery picture. Graded from
        the stored key; returns the stored reason and the spoken reveal. No LLM."""
        session, err = self._lesson_session(session_id)
        if err:
            return err
        mystery = lesson_patterns.phase(session["avatar_lesson"], "mystery")
        if not mystery:
            return {"error": "This lesson has no mystery phase"}
        items = mystery.get("mysteries") or []
        item = next((m for m in items if m.get("mystery_id") == mystery_id), None)
        if not item:
            return {"error": f"mystery_id must be one of {[m.get('mystery_id') for m in items]}"}
        option_id = str(option_id or "").strip().upper()
        if option_id not in (item.get("options") or {}):
            return {"error": f"option_id must be one of {list(item.get('options', {}).keys())}"}

        state = session.setdefault("phase_state", {}).setdefault(
            "mystery", {"answers": {}, "correct": 0, "total": len(items)})
        first_attempt = mystery_id not in state["answers"]
        is_correct = option_id == item.get("answer")
        now = datetime.now(timezone.utc).isoformat()
        state["answers"][mystery_id] = {"option_id": option_id, "is_correct": is_correct,
                                        "answered_at": now}
        state["correct"] = sum(1 for a in state["answers"].values() if a.get("is_correct"))
        finished = len(state["answers"]) >= len(items)
        out: Dict[str, Any] = {
            "action": "mystery_answered",
            "mystery_id": mystery_id,
            "option_id": option_id,
            "is_correct": is_correct,
            "correct_option": item.get("answer"),
            "explanation": (item.get("option_explanations") or {}).get(option_id, ""),
            "reveal": item.get("reveal"),                  # spoken, pre-narrated
            "visual": item.get("visual"),
            "first_attempt": first_attempt,
            "answered": len(state["answers"]),
            "total": len(items),
            "finished": finished,
        }
        if finished:
            out["outro"] = mystery.get("outro")
            self._set_phase(session, self._next_phase(session, "mystery") or "explain_back")
            out["next_phase"] = session["avatar_session_history"]["progress"].get("phase")
        else:
            out["next_phase"] = "mystery"
        session["avatar_session_history"].setdefault("emotion_timeline", []).append(
            {"phase": "mystery", "emotion": (item.get("reveal") or {}).get("emotion", "confident"),
             "timestamp": now})
        self.store.save(session)
        return out

    # ── 6. Explain back (last phase) ─────────────────────────────────────────────────────

    def submit_explanation(self, session_id: str, explanation: str) -> Dict:
        """The student explains the topic in their own words; the model judges
        it against the stored key points and replies with feedback and a level."""
        session, err = self._lesson_session(session_id)
        if err:
            return err
        explanation = str(explanation or "").strip()
        if not explanation:
            return {"error": "explanation is required"}
        lesson = session["avatar_lesson"]
        eb = lesson_patterns.phase(lesson, "explain_back")
        if not eb:
            return {"error": "This lesson has no explain-back phase"}
        topic = session.get("topic", {})
        key_points = eb.get("key_points") or []
        overview = session.get("enrichment", {}).get("concept_overview", "")

        user_prompt = (
            f"SECTION: {topic.get('section_title', '')} ({topic.get('subject', '')}, "
            f"Class {topic.get('class_number', '')})\n"
            f"CONCEPT OVERVIEW: {overview}\n"
            f"TASK SHOWN TO THE STUDENT: {eb.get('prompt', '')}\n"
            f"KEY POINTS a good explanation covers:\n"
            + "\n".join(f"- {k}" for k in key_points)
            + f"\nMODEL EXPLANATION: {eb.get('model_explanation', '')}\n"
            f"WHAT A GOOD EXPLANATION LOOKS LIKE: {eb.get('guidance', '')}\n\n"
            f"STUDENT'S EXPLANATION:\n{explanation}\n\n"
            "Judge it and reply in the JSON format specified."
        )
        raw = _call_llm(self._EXPLAIN_BACK_PROMPT, user_prompt, max_tokens=900,
                        trace_name="explain-back-feedback")
        parsed = _parse_json(raw) or {}
        try:
            level = max(1, min(5, int(parsed.get("level"))))
        except (TypeError, ValueError):
            level = 3
        feedback = {
            "text": parsed.get("feedback") or (
                "Thank you for explaining it in your own words - that is the hardest and most "
                "useful thing you can do with a new idea. Compare what you wrote with these "
                "key points and add anything you left out: " + "; ".join(key_points)),
            "emotion": parsed.get("emotion") or "encouraging",
        }
        now = datetime.now(timezone.utc).isoformat()
        session.setdefault("phase_state", {})["explain_back"] = {
            "explanation": explanation, "level": level,
            "covered": parsed.get("covered") or [], "missing": parsed.get("missing") or [],
            "misconceptions": parsed.get("misconceptions") or [],
            "feedback": feedback["text"], "answered_at": now,
        }
        self._set_phase(session, self._next_phase(session, "explain_back") or "done")
        session["avatar_session_history"].setdefault("emotion_timeline", []).append(
            {"phase": "explain_back", "emotion": feedback["emotion"], "timestamp": now})
        self.store.save(session)
        return {
            "action": "explanation_reviewed",
            "level": level,
            "covered": parsed.get("covered") or [],
            "missing": parsed.get("missing") or [],
            "misconceptions": parsed.get("misconceptions") or [],
            "feedback": feedback,
            "key_points": key_points,                      # shown after judging, as the answer key
            "closing": eb.get("closing"),
            "next_phase": session["avatar_session_history"]["progress"].get("phase"),
        }

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
        if session.get("avatar_lesson"):
            ps = session.get("phase_state") or {}
            mystery_state = ps.get("mystery") or {}
            explain_state = ps.get("explain_back") or {}
            summary["lesson"] = {
                "pattern": session["avatar_lesson"].get("pattern"),
                "phases_reached": progress.get("phase"),
                "hook_option": (ps.get("hook") or {}).get("option_id"),
                "hook_correct": (ps.get("hook") or {}).get("is_correct"),
                "explore_verdict": ((ps.get("explore") or {}).get("interaction") or {}).get("verdict"),
                "challenge_verdict": ((ps.get("explore") or {}).get("challenge") or {}).get("verdict"),
                "mystery_correct": mystery_state.get("correct"),
                "mystery_total": mystery_state.get("total"),
                "real_world_revealed": bool((ps.get("real_world") or {}).get("revealed")),
                "explain_level": explain_state.get("level"),
                "explain_missing": explain_state.get("missing"),
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
            logger.warning(f"[Avatar] Failed to save to performance: {e}")


# ══════════════════════════════════════════════════════════════════════════════
#  SINGLETON
# ══════════════════════════════════════════════════════════════════════════════

_avatar_engine: Optional[AvatarEngine] = None


def get_avatar_engine() -> AvatarEngine:
    global _avatar_engine
    if _avatar_engine is None:
        _avatar_engine = AvatarEngine()
    return _avatar_engine
