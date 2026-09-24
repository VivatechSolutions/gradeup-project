"""
Exam Session Engine for GradeUp AI Tutor

Creates, records and evaluates a full exam over one or more units.

Question source
    Question Bank first, hardest first (hard -> medium -> easy). When the bank
    holds fewer than QB_SPARSE_THRESHOLD questions for a unit - or simply not
    enough to fill that unit's share of the paper - the gap is filled with
    questions the LLM writes from the textbook: Qdrant context is the ONLY
    source, and with no context there is no generation. Nothing here ever
    reads web content; that tier belongs to exam_prep_engine.

Timer
    None. There is no countdown and no auto-submit; the exam stays
    "in_progress" until the student submits it.

Scope
    `unit_numbers` may be one unit or several. The paper is split
    proportionally across them and the result reports per-unit and
    per-section scores.

Grading
    Each question's textbook context is fetched once, at creation, and stored
    on the question (internal - never sent to the student). At evaluation the
    LLM grades every answer against that context and returns the score, the
    model answer, an explanation and the passage it relied on. MCQs with a
    stored correct option are graded by rule. Results feed
    StudentPerformanceTracker.record_exam_score per unit.

Storage: exam_data/exam__{candidate_id}__{exam_id}.json
"""

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

import avatar_llm
from langfuse_utils import with_student_context
from logger import get_logger

load_dotenv()
logger = get_logger(__name__)

EXAM_DATA_DIR = Path("exam_data")

EXAM_MODEL = os.getenv("EXAM_MODEL", "gemini-3.6-flash")
EXAM_FALLBACK_MODEL = os.getenv("EXAM_FALLBACK_MODEL", "meta-llama/llama-4-scout")
EXAM_LLM_TIMEOUT = int(os.getenv("EXAM_LLM_TIMEOUT", "90"))

EXAM_MAX_POINTS = 100          # points for a 100% exam, split across its units
QB_SPARSE_THRESHOLD = 5        # fewer bank questions than this -> AI gap-fill
RAG_CONTEXT_PER_QUESTION = 3   # chunks pre-fetched per question for grading
RAG_CHARS_PER_QUESTION = 1800  # context handed to the grader per question
EVAL_BATCH_SIZE = 6            # questions per grading call
GENERATION_BATCH_MAX = 12      # questions per generation call

DIFFICULTY_ORDER = {"hard": 0, "medium": 1, "easy": 2}
DEFAULT_MARKS = {
    "mcq": 1, "fill_in_the_blanks": 1, "one_word": 1, "true_false": 1,
    "short_answer": 3, "numerical": 3, "diagram": 3, "compare_contrast": 3,
    "long_answer": 5,
}
EXAM_TYPES = ("mixed", "mcq", "short_answer", "long_answer")
# Which refined question types satisfy each exam_type.
EXAM_TYPE_FAMILIES = {
    "mcq": {"mcq", "true_false"},
    "short_answer": {"short_answer", "fill_in_the_blanks", "one_word", "numerical"},
    "long_answer": {"long_answer", "compare_contrast", "diagram"},
}
STATUS_IN_PROGRESS = "in_progress"
STATUS_SUBMITTED = "submitted"
STATUS_EVALUATED = "evaluated"

# Fields that never leave the server.
_INTERNAL_FIELDS = ("rag_context", "correct_answer", "expected_answer", "explanation")


def _safe_id(value: str) -> str:
    return re.sub(r"[^a-z0-9_.-]+", "_", (value or "").strip().lower()).strip("_") or "anon"


def _marks_of(q: Dict[str, Any]) -> float:
    try:
        m = float(q.get("marks") or 0)
    except (TypeError, ValueError):
        m = 0
    if m <= 0:
        m = DEFAULT_MARKS.get(str(q.get("type", "")).lower(), 3)
    return m


class ExamSessionEngine:
    """Creates exams from the question bank + textbook, records answers, grades with RAG."""

    def __init__(self, data_dir: Path = EXAM_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    # ── Storage ───────────────────────────────────────────────────────────────

    def _exam_path(self, candidate_id: str, exam_id: str) -> Path:
        return self.data_dir / f"exam__{_safe_id(candidate_id)}__{_safe_id(exam_id)}.json"

    def _load_json(self, path: Path) -> Optional[Dict[str, Any]]:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"[ExamEngine] Could not read {path.name}: {e}")
        return None

    def _save_json(self, path: Path, data: Dict[str, Any]) -> None:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _load_exam(self, candidate_id: str, exam_id: str) -> Optional[Dict[str, Any]]:
        return self._load_json(self._exam_path(candidate_id, exam_id))

    # ── RAG ───────────────────────────────────────────────────────────────────

    def _rag_search(self, query: str, subject: str, unit_number: Optional[int],
                    board: Optional[str], class_number: Optional[str],
                    term: Optional[Any], limit: int,
                    part: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            from qdrant_integration import search_qdrant
            return search_qdrant(
                query=query,
                limit=limit,
                unit_filter=unit_number,
                subject_filter=subject,
                board_filter=board,
                class_filter=class_number,
                term_filter=term,
                part_filter=part,
            ) or []
        except Exception as e:
            logger.warning(f"[ExamEngine] RAG retrieval failed: {e}")
            return []

    @staticmethod
    def _format_chunks(results: List[Dict[str, Any]], per_chunk: int = 600) -> str:
        parts = []
        for r in results:
            meta = r.get("metadata", {}) or {}
            header = f"[Unit {meta.get('unit_number', '?')}: {meta.get('unit_title', '')}"
            if meta.get("section_title"):
                header += f" | Section: {meta['section_title']}"
            header += "]"
            parts.append(f"{header}\n{(r.get('text') or '')[:per_chunk]}")
        return "\n---\n".join(parts)

    def _unit_rag_context(self, subject: str, unit_number: int, board: Optional[str],
                          class_number: Optional[str], term: Optional[Any],
                          hints: Optional[List[str]] = None,
                          part: Optional[str] = None) -> Tuple[str, str]:
        """(unit_title, textbook context) broad enough to write questions from."""
        queries = [
            f"{subject} unit {unit_number} important concepts",
            f"{subject} unit {unit_number} definitions and examples",
        ] + [h for h in (hints or [])[:3] if h]
        seen, collected, unit_title = set(), [], ""
        for q in queries:
            for r in self._rag_search(q, subject, unit_number, board, class_number, term, limit=5, part=part):
                text = (r.get("text") or "").strip()
                if not text or text[:100] in seen:
                    continue
                seen.add(text[:100])
                collected.append(r)
                meta = r.get("metadata", {}) or {}
                if not unit_title and meta.get("unit_title"):
                    unit_title = meta["unit_title"]
        return unit_title, self._format_chunks(collected, per_chunk=900)[:12000]

    def _fetch_rag_context_per_q(self, questions: List[Dict[str, Any]], subject: str,
                                 board: Optional[str], class_number: Optional[str],
                                 term: Optional[Any], part: Optional[str] = None) -> None:
        """Pre-fetch each question's grading context and store it on the question."""
        for q in questions:
            query = q.get("question", "")
            if q.get("topic"):
                query = f"{q['topic']}: {query}"
            results = self._rag_search(
                query, subject, q.get("unit_number"), board, class_number, term,
                limit=RAG_CONTEXT_PER_QUESTION, part=part,
            )
            q["rag_context"] = self._format_chunks(results)[:RAG_CHARS_PER_QUESTION]

    # ── LLM ───────────────────────────────────────────────────────────────────

    def _llm_json(self, system_prompt: str, user_prompt: str, *, max_tokens: int,
                  trace_name: str) -> Optional[Dict[str, Any]]:
        """One JSON-mode completion through avatar_llm. None on any failure."""
        result = avatar_llm.chat(
            EXAM_MODEL,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=max_tokens,
            force_json=True,
            timeout=EXAM_LLM_TIMEOUT,
            fallback_model=EXAM_FALLBACK_MODEL,
            trace_name=trace_name,
        )
        if not result.ok:
            logger.warning(f"[ExamEngine] LLM call failed ({EXAM_MODEL}): {(result.error or '')[:300]}")
            return None
        parsed = avatar_llm.parse_json(result.text)
        if parsed is None:
            logger.warning(f"[ExamEngine] LLM returned unparseable JSON ({len(result.text)} chars)")
        return parsed

    # ── Question selection ────────────────────────────────────────────────────

    @staticmethod
    def _normalise_qb_question(q: Dict[str, Any], unit_number: int) -> Dict[str, Any]:
        qtype = str(q.get("question_type_refined") or q.get("type") or "short_answer").lower()
        item = {
            "question_id": q.get("question_id") or hashlib.md5(q.get("question", "").encode()).hexdigest()[:12],
            "question": q.get("question", ""),
            "type": qtype,
            "marks": None,
            "difficulty": q.get("difficulty", "medium"),
            "bloom_level": q.get("bloom_level", "understand"),
            "unit_number": unit_number,
            "section_title": q.get("section_title") or "General",
            "topic": q.get("topic") or q.get("section_title") or "general",
            "options": q.get("options") or [],
            "correct_answer": q.get("correct_answer") or "",
            "expected_answer": q.get("correct_answer") or "",
            "source": "question_bank",
            "year": q.get("year"),
            "exam_name": q.get("exam_name"),
            "rag_context": "",
            "student_answer": None,
            "evaluation": None,
        }
        item["marks"] = _marks_of({"marks": q.get("marks"), "type": qtype})
        return item

    def _qb_questions_for_unit(self, document_ids: List[str], unit_number: int,
                               term: Optional[Any], exam_type: str) -> List[Dict[str, Any]]:
        """Bank questions for one unit, hard -> medium -> easy, deduplicated.

        `document_ids` are every id the bank may hold this book under (see
        QuestionBankManager.get_questions_for_ids).
        """
        try:
            from question_bank import get_question_bank_manager
            raw = get_question_bank_manager().get_questions_for_ids(
                document_ids, unit_number=unit_number, term=term,
            )
        except Exception as e:
            logger.warning(f"[ExamEngine] Question bank lookup failed: {e}")
            raw = []

        allowed = EXAM_TYPE_FAMILIES.get(exam_type)
        out, seen = [], set()
        for q in raw:
            item = self._normalise_qb_question(q, unit_number)
            if not item["question"].strip() or item["question_id"] in seen:
                continue
            if allowed and item["type"] not in allowed:
                continue
            seen.add(item["question_id"])
            out.append(item)

        out.sort(key=lambda x: (
            DIFFICULTY_ORDER.get(x["difficulty"], 1),
            -x["marks"],
        ))
        return out

    def _generate_rag_questions(
        self, subject: str, unit_number: int, unit_title: str, needed: int,
        exam_type: str, rag_context: str, existing: List[Dict[str, Any]],
        class_number: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """LLM-written gap-fill questions grounded in the textbook context ONLY.

        No context -> no questions: an ungrounded question cannot be graded
        against the textbook, so it is better to ship a shorter paper.
        """
        if needed <= 0:
            return []
        if not rag_context.strip():
            logger.warning(f"[ExamEngine] No textbook context for unit {unit_number} - skipping AI gap-fill")
            return []

        type_rule = {
            "mcq": 'Every question is "mcq" with exactly 4 options and one correct option.',
            "short_answer": 'Use "short_answer" (2-3 marks) and "numerical" where the context has calculations.',
            "long_answer": 'Use "long_answer" (5 marks) and "compare_contrast" questions needing a developed answer.',
        }.get(exam_type, 'Mix "mcq" (1 mark), "short_answer" (3 marks) and "long_answer" (5 marks), '
                         'roughly 40% / 40% / 20%.')

        avoid = "\n".join(f"- {q['question'][:150]}" for q in existing[:15]) or "(none)"
        system_prompt = (
            "You are an experienced examiner writing board-exam questions. You write ONLY "
            "questions that can be answered from the textbook passages you are given, and you "
            "answer ONLY with a JSON object."
        )
        user_prompt = f"""Subject: {subject}
Class: {class_number or 'unspecified'}
Unit {unit_number}: {unit_title or ''}

=== TEXTBOOK PASSAGES (the ONLY permitted source) ===
{rag_context}

Write exactly {min(needed, GENERATION_BATCH_MAX)} exam questions.
{type_rule}
Difficulty mix: mostly "hard" and "medium" (analysis, application, explanation), a few "easy".

Do NOT repeat or paraphrase any of these questions already on the paper:
{avoid}

Return JSON with EXACTLY this shape:
{{
  "questions": [
    {{
      "question": "<the question as it would appear on the paper>",
      "type": "mcq | short_answer | long_answer | numerical | compare_contrast",
      "marks": 3,
      "difficulty": "easy | medium | hard",
      "section_title": "<the [Section: ...] header the question is drawn from>",
      "topic": "<2-4 word topic name>",
      "options": ["<only for mcq: 4 options>"],
      "correct_answer": "<the mcq option text, or empty>",
      "expected_answer": "<a model answer of the length the marks deserve, in textbook wording>"
    }}
  ]
}}

Rules:
- Every question and every expected_answer must be answerable from the passages above. No outside facts.
- section_title must be one of the section headers in the passages.
- No question may depend on a diagram or figure the student cannot see.
"""
        parsed = self._llm_json(system_prompt, user_prompt, max_tokens=4000,
                                trace_name="exam-generate-questions")
        raw = parsed.get("questions") if isinstance(parsed, dict) else None
        if not isinstance(raw, list):
            return []

        existing_ids = {q["question_id"] for q in existing}
        out: List[Dict[str, Any]] = []
        allowed = EXAM_TYPE_FAMILIES.get(exam_type)
        for item in raw:
            if not isinstance(item, dict):
                continue
            text = str(item.get("question", "")).strip()
            if not text:
                continue
            qid = hashlib.md5(text.lower().encode()).hexdigest()[:12]
            if qid in existing_ids:
                continue
            qtype = str(item.get("type", "short_answer")).lower().strip()
            if allowed and qtype not in allowed:
                continue
            options = item.get("options") if qtype == "mcq" else []
            if qtype == "mcq" and (not isinstance(options, list) or len(options) < 2):
                continue
            existing_ids.add(qid)
            out.append({
                "question_id": qid,
                "question": text,
                "type": qtype,
                "marks": _marks_of({"marks": item.get("marks"), "type": qtype}),
                "difficulty": str(item.get("difficulty", "medium")).lower(),
                "bloom_level": item.get("bloom_level", "apply"),
                "unit_number": unit_number,
                "section_title": str(item.get("section_title") or "General"),
                "topic": str(item.get("topic") or item.get("section_title") or "general"),
                "options": [str(o) for o in options] if isinstance(options, list) else [],
                "correct_answer": str(item.get("correct_answer") or ""),
                "expected_answer": str(item.get("expected_answer") or ""),
                "source": "ai_generated",
                "context": "textbook",
                "rag_context": "",
                "student_answer": None,
                "evaluation": None,
            })
            if len(out) >= needed:
                break
        return out

    def _select_questions(
        self, document_ids: List[str], subject: str, unit_numbers: List[int],
        num_questions: int, exam_type: str, board: Optional[str],
        class_number: Optional[str], term: Optional[Any],
        unit_titles: Optional[Dict[int, str]] = None,
        part: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[int, str]]:
        """Fill each unit's share of the paper from the bank, then from the textbook.

        Returns (questions, per-unit selection report, resolved unit titles).
        """
        units = list(dict.fromkeys(int(u) for u in unit_numbers))
        base, extra = divmod(max(num_questions, len(units)), len(units))
        quotas = {u: base + (1 if i < extra else 0) for i, u in enumerate(units)}

        questions: List[Dict[str, Any]] = []
        report: List[Dict[str, Any]] = []
        titles: Dict[int, str] = dict(unit_titles or {})

        for unit in units:
            quota = quotas[unit]
            bank = self._qb_questions_for_unit(document_ids, unit, term, exam_type)
            chosen = bank[:quota]
            sparse = len(bank) < QB_SPARSE_THRESHOLD
            gap = quota - len(chosen)

            generated: List[Dict[str, Any]] = []
            if gap > 0:
                hints = [q["topic"] for q in bank[:3]]
                title, ctx = self._unit_rag_context(subject, unit, board, class_number, term, hints, part=part)
                if title and not titles.get(unit):
                    titles[unit] = title
                generated = self._generate_rag_questions(
                    subject, unit, titles.get(unit, ""), gap, exam_type, ctx,
                    existing=questions + chosen, class_number=class_number,
                )
                if sparse:
                    logger.info(f"[ExamEngine] Unit {unit}: bank sparse ({len(bank)} < "
                                f"{QB_SPARSE_THRESHOLD}), generated {len(generated)} from textbook")

            questions.extend(chosen)
            questions.extend(generated)
            report.append({
                "unit_number": unit,
                "quota": quota,
                "qb_available": len(bank),
                "qb_used": len(chosen),
                "ai_generated": len(generated),
                "qb_sparse": sparse,
                "shortfall": max(0, quota - len(chosen) - len(generated)),
            })

        return questions, report, titles

    # ── Views ─────────────────────────────────────────────────────────────────

    @staticmethod
    def _student_question(q: Dict[str, Any], include_evaluation: bool) -> Dict[str, Any]:
        view = {k: v for k, v in q.items() if k not in _INTERNAL_FIELDS}
        if not include_evaluation:
            view.pop("evaluation", None)
        return view

    def _student_view(self, exam: Dict[str, Any]) -> Dict[str, Any]:
        evaluated = exam.get("status") == STATUS_EVALUATED
        view = {k: v for k, v in exam.items() if k != "questions"}
        view["questions"] = [self._student_question(q, evaluated) for q in exam.get("questions", [])]
        view["answered_count"] = sum(1 for q in exam.get("questions", [])
                                     if (q.get("student_answer") or "").strip())
        return view

    # ── Grading ───────────────────────────────────────────────────────────────

    @staticmethod
    def _resolve_mcq_answer(answer: str, options: List[str]) -> str:
        """Map "B" / "2" / "(c)" onto the option text; otherwise return as given."""
        a = (answer or "").strip()
        if not a or not options:
            return a
        m = re.fullmatch(r"\(?([a-dA-D]|[1-4])\)?\.?", a)
        if m:
            token = m.group(1).lower()
            idx = ord(token) - ord("a") if token.isalpha() else int(token) - 1
            if 0 <= idx < len(options):
                return str(options[idx])
        return a

    def _rule_grade_mcq(self, q: Dict[str, Any], answer: str) -> Optional[Dict[str, Any]]:
        """Deterministic grading for an MCQ with a stored correct option."""
        correct = (q.get("correct_answer") or "").strip()
        if q.get("type") != "mcq" or not correct:
            return None
        given = self._resolve_mcq_answer(answer, q.get("options") or [])
        correct_resolved = self._resolve_mcq_answer(correct, q.get("options") or [])
        is_correct = bool(given) and given.strip().lower() == correct_resolved.strip().lower()
        pct = 100 if is_correct else 0
        return {
            "score_percentage": pct,
            "is_correct": is_correct,
            "correct_answer": correct_resolved,
            "explanation": "Matches the stored answer key." if is_correct
                           else f"The correct option is: {correct_resolved}",
            "feedback": "Correct." if is_correct else ("No answer given." if not given else "Incorrect option."),
            "textbook_reference": "",
            "graded_by": "rule",
        }

    @staticmethod
    def _heuristic_grade(q: Dict[str, Any], answer: str) -> Dict[str, Any]:
        """Keyword-overlap fallback when the grader LLM is unavailable."""
        a = (answer or "").strip()
        if not a:
            return {
                "score_percentage": 0, "is_correct": False,
                "correct_answer": q.get("expected_answer") or "",
                "explanation": "", "feedback": "No answer provided.",
                "textbook_reference": "", "graded_by": "heuristic",
            }
        reference = q.get("expected_answer") or q.get("rag_context") or ""
        stop = {"the", "a", "an", "is", "are", "was", "were", "of", "in", "to", "and", "or", "it", "that", "this"}
        ref_words = {w for w in re.findall(r"[a-z0-9]+", reference.lower()) if w not in stop and len(w) > 2}
        ans_words = {w for w in re.findall(r"[a-z0-9]+", a.lower()) if w not in stop and len(w) > 2}
        if ref_words:
            overlap = len(ref_words & ans_words) / max(1, min(len(ref_words), 25))
            pct = int(max(0, min(100, round(overlap * 100))))
        else:
            pct = min(60, len(a.split()) * 4)
        return {
            "score_percentage": pct, "is_correct": pct >= 50,
            "correct_answer": q.get("expected_answer") or "",
            "explanation": "Scored on overlap with the textbook's key terms (grader unavailable).",
            "feedback": "Answer recorded.", "textbook_reference": "",
            "graded_by": "heuristic",
        }

    def _evaluate_answer_with_rag(self, batch: List[Dict[str, Any]], subject: str,
                                  class_number: Optional[str]) -> Dict[int, Dict[str, Any]]:
        """Grade a batch of answers against their pre-fetched textbook context.

        Returns {question_index (1-based within batch): evaluation}. Missing
        entries mean the LLM did not answer for that question; the caller
        falls back per question.
        """
        blocks = []
        for i, q in enumerate(batch, 1):
            options = ""
            if q.get("options"):
                options = "\n   Options: " + " | ".join(str(o) for o in q["options"])
            reference = q.get("expected_answer") or q.get("correct_answer") or ""
            blocks.append(f"""--- Question {i} [{q.get('type')}, {q.get('marks')} marks, unit {q.get('unit_number')}] ---
   {q.get('question')}{options}
   Reference answer (may be empty): {reference or '(none - grade from the textbook context)'}
   Textbook context:
   {q.get('rag_context') or '(no context retrieved - grade on subject knowledge, cite nothing)'}
   Student's answer: {(q.get('student_answer') or '').strip() or '(no answer provided)'}""")

        system_prompt = (
            f"You are a fair, rigorous {subject} examiner. You grade each answer against the "
            "textbook context provided for it, award partial credit for partial understanding, "
            "and you answer ONLY with a JSON object."
        )
        user_prompt = f"""Class: {class_number or 'unspecified'}

{chr(10).join(blocks)}

Return JSON with EXACTLY this shape:
{{
  "evaluations": [
    {{
      "question_index": 1,
      "score_percentage": 0-100,
      "is_correct": true|false,
      "correct_answer": "<the model answer, in textbook wording, sized to the marks>",
      "explanation": "<why the student's answer earned this score - what was right, what was missing>",
      "feedback": "<one or two encouraging, specific sentences on how to improve>",
      "textbook_reference": "<the exact phrase or sentence from the textbook context that decides the answer, or empty>"
    }}
  ]
}}

Scoring rules:
- score_percentage is the share of the marks earned; is_correct is true at 50% or above.
- No answer provided -> 0.
- MCQ: 100 if the chosen option is right, else 0; name the right option in correct_answer.
- Numericals: full marks needs the right value AND unit; method with a slip earns partial credit.
- Ground the correct_answer and textbook_reference in the context; do not invent facts.
- Return exactly one evaluation per question, in order.
"""
        parsed = self._llm_json(system_prompt, user_prompt, max_tokens=3500, trace_name="exam-grade-answers")
        raw = parsed.get("evaluations") if isinstance(parsed, dict) else None
        out: Dict[int, Dict[str, Any]] = {}
        if not isinstance(raw, list):
            return out
        for pos, item in enumerate(raw, 1):
            if not isinstance(item, dict):
                continue
            try:
                idx = int(item.get("question_index", pos))
            except (TypeError, ValueError):
                idx = pos
            try:
                pct = float(item.get("score_percentage", 0))
            except (TypeError, ValueError):
                pct = 0.0
            pct = max(0.0, min(100.0, pct))
            out[idx] = {
                "score_percentage": round(pct, 1),
                "is_correct": bool(item.get("is_correct", pct >= 50)),
                "correct_answer": str(item.get("correct_answer") or ""),
                "explanation": str(item.get("explanation") or ""),
                "feedback": str(item.get("feedback") or ""),
                "textbook_reference": str(item.get("textbook_reference") or ""),
                "graded_by": "llm",
            }
        return out

    def _grade_all(self, exam: Dict[str, Any]) -> None:
        """Attach an `evaluation` to every question in the exam (in place)."""
        subject = exam.get("subject", "")
        class_number = exam.get("class_number")
        pending: List[Dict[str, Any]] = []

        for q in exam.get("questions", []):
            answer = q.get("student_answer") or ""
            ruled = self._rule_grade_mcq(q, answer)
            if ruled is not None:
                q["evaluation"] = ruled
            elif not answer.strip():
                q["evaluation"] = self._heuristic_grade(q, "")
            else:
                pending.append(q)

        for start in range(0, len(pending), EVAL_BATCH_SIZE):
            batch = pending[start:start + EVAL_BATCH_SIZE]
            graded = self._evaluate_answer_with_rag(batch, subject, class_number)
            for i, q in enumerate(batch, 1):
                q["evaluation"] = graded.get(i) or self._heuristic_grade(q, q.get("student_answer") or "")

        for q in exam.get("questions", []):
            ev = q["evaluation"]
            max_score = _marks_of(q)
            ev["max_score"] = max_score
            ev["score"] = round(max_score * ev.get("score_percentage", 0) / 100.0, 2)

    @staticmethod
    def _compute_section_scores(questions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Per-unit and per-section (within unit) breakdown."""
        by_unit: Dict[str, Dict[str, Any]] = {}
        by_section: Dict[str, Dict[str, Any]] = {}

        def _bump(bucket: Dict[str, Any], q: Dict[str, Any]) -> None:
            ev = q.get("evaluation") or {}
            bucket["obtained"] += ev.get("score", 0)
            bucket["total"] += ev.get("max_score", _marks_of(q))
            bucket["questions"] += 1
            if ev.get("is_correct"):
                bucket["correct"] += 1

        for q in questions:
            unit_key = str(q.get("unit_number"))
            unit = by_unit.setdefault(unit_key, {"obtained": 0.0, "total": 0.0, "questions": 0, "correct": 0,
                                                 "sections": {}})
            _bump(unit, q)
            section = q.get("section_title") or "General"
            sec = unit["sections"].setdefault(section, {"obtained": 0.0, "total": 0.0, "questions": 0, "correct": 0})
            _bump(sec, q)
            flat = by_section.setdefault(f"Unit {unit_key} / {section}",
                                         {"unit_number": q.get("unit_number"), "section_title": section,
                                          "obtained": 0.0, "total": 0.0, "questions": 0, "correct": 0})
            _bump(flat, q)

        def _finish(bucket: Dict[str, Any]) -> None:
            bucket["obtained"] = round(bucket["obtained"], 2)
            bucket["total"] = round(bucket["total"], 2)
            bucket["percentage"] = round(bucket["obtained"] / bucket["total"] * 100, 2) if bucket["total"] else 0.0

        for unit in by_unit.values():
            _finish(unit)
            for sec in unit["sections"].values():
                _finish(sec)
        for sec in by_section.values():
            _finish(sec)
        return {"by_unit": by_unit, "by_section": by_section}

    def _generate_overall_feedback(self, exam: Dict[str, Any]) -> Dict[str, Any]:
        """Strengths, weak areas and revision suggestions for the whole paper."""
        sections = exam.get("section_scores", {}).get("by_section", {})
        ranked = sorted(sections.values(), key=lambda s: s.get("percentage", 0))
        weak = [s for s in ranked if s.get("percentage", 0) < 50]
        strong = [s for s in reversed(ranked) if s.get("percentage", 0) >= 70]

        fallback = {
            "summary": f"You scored {exam.get('percentage', 0)}% ({exam.get('obtained_marks', 0)}/{exam.get('total_marks', 0)}).",
            "strengths": [f"{s['section_title']} (Unit {s['unit_number']}): {s['percentage']}%" for s in strong[:4]],
            "weak_areas": [f"{s['section_title']} (Unit {s['unit_number']}): {s['percentage']}%" for s in weak[:4]],
            "revision_suggestions": [f"Revise {s['section_title']} from Unit {s['unit_number']} and re-attempt its questions."
                                     for s in weak[:4]],
            "generated_by": "heuristic",
        }

        lines = []
        for q in exam.get("questions", []):
            ev = q.get("evaluation") or {}
            lines.append(f"- Unit {q.get('unit_number')} / {q.get('section_title')} / {q.get('topic')}: "
                         f"{ev.get('score', 0)}/{ev.get('max_score', 0)} - {ev.get('explanation', '')[:160]}")
        system_prompt = ("You are a supportive tutor writing the summary page of an exam report. "
                         "You answer ONLY with a JSON object.")
        user_prompt = f"""Subject: {exam.get('subject')}
Units: {exam.get('unit_numbers')}
Overall: {exam.get('obtained_marks')}/{exam.get('total_marks')} ({exam.get('percentage')}%)

Per-question outcomes:
{chr(10).join(lines)}

Return JSON with EXACTLY this shape:
{{
  "summary": "<2 sentences on overall performance>",
  "strengths": ["<topic or skill the student clearly has, with evidence>", "..."],
  "weak_areas": ["<topic or skill to work on, with what went wrong>", "..."],
  "revision_suggestions": ["<concrete next step: what to revise, how, and what to practise>", "..."]
}}
Rules: 2-4 items per list, specific to the outcomes above, no generic advice."""
        parsed = self._llm_json(system_prompt, user_prompt, max_tokens=1200, trace_name="exam-overall-feedback")
        if not isinstance(parsed, dict) or not parsed.get("summary"):
            return fallback
        return {
            "summary": str(parsed.get("summary", "")),
            "strengths": [str(x) for x in (parsed.get("strengths") or [])][:5],
            "weak_areas": [str(x) for x in (parsed.get("weak_areas") or [])][:5],
            "revision_suggestions": [str(x) for x in (parsed.get("revision_suggestions") or [])][:5],
            "generated_by": "llm",
        }

    def _update_student_performance(self, exam: Dict[str, Any]) -> None:
        """One record_exam_score per unit; points split by each unit's share of the marks."""
        try:
            from student_performance import get_performance_tracker
            tracker = get_performance_tracker()
        except Exception as e:
            logger.warning(f"[ExamEngine] Performance tracker unavailable: {e}")
            return

        total_marks = float(exam.get("total_marks") or 0)
        points_total = int(exam.get("points_earned") or 0)
        titles = exam.get("unit_titles") or {}  # keyed by str(unit_number)
        for unit_key, unit in exam.get("section_scores", {}).get("by_unit", {}).items():
            section_scores = {name: sec["percentage"] for name, sec in unit.get("sections", {}).items()}
            share = (unit["total"] / total_marks) if total_marks else 0
            try:
                tracker.record_exam_score(
                    candidate_id=exam["candidate_id"],
                    subject=exam.get("subject", ""),
                    unit_number=int(unit_key),
                    section_scores=section_scores,
                    total_score=exam.get("percentage", 0),
                    points=int(round(points_total * share)),
                    unit_title=titles.get(str(unit_key), ""),
                    candidate_name=exam.get("candidate_name", ""),
                    exam_id=exam.get("exam_id", ""),
                )
            except Exception as e:
                logger.warning(f"[ExamEngine] Failed to record unit {unit_key} score: {e}")

        try:
            data = tracker._load(exam["candidate_id"])
            data.setdefault("interaction_history", []).append({
                "type": "exam_evaluated",
                "subject": exam.get("subject"),
                "unit_numbers": exam.get("unit_numbers"),
                "exam_id": exam.get("exam_id"),
                "score": exam.get("percentage"),
                "points_earned": points_total,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            if len(data["interaction_history"]) > 200:
                data["interaction_history"] = data["interaction_history"][-200:]
            tracker._save(exam["candidate_id"], data)
        except Exception as e:
            logger.warning(f"[ExamEngine] Failed to log exam in history: {e}")

    # ── Public API ────────────────────────────────────────────────────────────

    @with_student_context(trace_name="exam-create")
    def create_exam(
        self,
        candidate_id: str,
        subject: str,
        unit_numbers: List[int],
        document_id: str,
        board: Optional[str] = None,
        class_number: Optional[str] = None,
        term: Optional[Any] = None,
        num_questions: int = 10,
        exam_type: str = "mixed",
        candidate_name: str = "",
        unit_titles: Optional[Dict[int, str]] = None,
        part: Optional[str] = None,
        qb_document_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Build and persist a new exam session. Returns the student view.

        `part` is the book inside a multi-book subject ("Contemporary India"
        under Social). It scopes every textbook lookup - generation and
        grading - so unit 1 of the geography book never grades against unit 1
        of the history book. `qb_document_ids` are the ids to read the
        question bank under (defaults to `[document_id]`).
        """
        units = [int(u) for u in (unit_numbers or []) if u is not None]
        if not units:
            return {"error": "At least one unit_number is required", "success": False}
        exam_type = (exam_type or "mixed").lower()
        if exam_type not in EXAM_TYPES:
            return {"error": f"exam_type must be one of {list(EXAM_TYPES)}", "success": False}
        num_questions = max(1, min(int(num_questions or 10), 60))

        qb_ids = qb_document_ids or [document_id]
        questions, report, titles = self._select_questions(
            qb_ids, subject, units, num_questions, exam_type,
            board, class_number, term, unit_titles, part=part,
        )
        if not questions:
            return {
                "error": "No questions available: the question bank is empty for these units and no "
                         "textbook content was found to generate from.",
                "success": False,
                "selection": report,
            }

        self._fetch_rag_context_per_q(questions, subject, board, class_number, term, part=part)

        exam_id = hashlib.md5(
            f"{candidate_id}|{subject}|{units}|{datetime.now(timezone.utc).isoformat()}".encode()
        ).hexdigest()[:16]

        exam = {
            "exam_id": exam_id,
            "candidate_id": candidate_id,
            "candidate_name": candidate_name,
            "subject": subject,
            "part": part,
            "document_id": document_id,
            "qb_document_ids": qb_ids,
            "board": board,
            "class_number": class_number,
            "term": term,
            "unit_numbers": units,
            "unit_titles": {str(k): v for k, v in titles.items()},
            "exam_type": exam_type,
            "status": STATUS_IN_PROGRESS,
            "timer": None,  # by design: no countdown, no auto-submit
            "questions": questions,
            "total_questions": len(questions),
            "total_marks": round(sum(_marks_of(q) for q in questions), 2),
            "obtained_marks": None,
            "percentage": None,
            "points_earned": None,
            "section_scores": {},
            "overall_feedback": None,
            "selection": report,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "submitted_at": None,
            "evaluated_at": None,
        }
        self._save_json(self._exam_path(candidate_id, exam_id), exam)
        logger.info(f"[ExamEngine] Exam {exam_id} created: {len(questions)} questions over units {units} "
                    f"({sum(r['ai_generated'] for r in report)} AI-generated)")
        return {"success": True, **self._student_view(exam)}

    def get_exam(self, candidate_id: str, exam_id: str) -> Dict[str, Any]:
        exam = self._load_exam(candidate_id, exam_id)
        if not exam:
            return {"error": "Exam not found", "success": False}
        return {"success": True, **self._student_view(exam)}

    def submit_answer(self, candidate_id: str, exam_id: str, question_id: str,
                      answer: str) -> Dict[str, Any]:
        """Record (or overwrite) one answer while the exam is in progress."""
        exam = self._load_exam(candidate_id, exam_id)
        if not exam:
            return {"error": "Exam not found", "success": False}
        if exam.get("status") != STATUS_IN_PROGRESS:
            return {"error": f"Exam is {exam.get('status')}; answers can no longer be changed", "success": False}
        for q in exam.get("questions", []):
            if q.get("question_id") == question_id:
                q["student_answer"] = answer if answer is not None else ""
                break
        else:
            return {"error": "Question not found in this exam", "success": False}
        self._save_json(self._exam_path(candidate_id, exam_id), exam)
        answered = sum(1 for q in exam["questions"] if (q.get("student_answer") or "").strip())
        return {
            "success": True,
            "exam_id": exam_id,
            "question_id": question_id,
            "answered_count": answered,
            "total_questions": len(exam["questions"]),
        }

    @with_student_context(trace_name="exam-evaluate")
    def evaluate_exam(self, candidate_id: str, exam_id: str,
                      answers: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """Submit the exam and grade every answer against its textbook context.

        `answers` ([{question_id, answer}]) may carry the whole paper in one
        go; anything already recorded through submit_answer is kept unless
        overwritten here.
        """
        exam = self._load_exam(candidate_id, exam_id)
        if not exam:
            return {"error": "Exam not found", "success": False}
        if exam.get("status") == STATUS_EVALUATED:
            return self.get_result(candidate_id, exam_id)

        if answers:
            answer_map = {a.get("question_id", ""): a.get("answer", "") for a in answers if isinstance(a, dict)}
            for q in exam.get("questions", []):
                if q.get("question_id") in answer_map:
                    q["student_answer"] = answer_map[q["question_id"]] or ""

        exam["status"] = STATUS_SUBMITTED
        exam["submitted_at"] = datetime.now(timezone.utc).isoformat()
        self._save_json(self._exam_path(candidate_id, exam_id), exam)

        self._grade_all(exam)

        total = round(sum(_marks_of(q) for q in exam["questions"]), 2)
        obtained = round(sum((q.get("evaluation") or {}).get("score", 0) for q in exam["questions"]), 2)
        percentage = round(obtained / total * 100, 2) if total else 0.0
        exam["total_marks"] = total
        exam["obtained_marks"] = obtained
        exam["percentage"] = percentage
        exam["points_earned"] = int(round(percentage / 100 * EXAM_MAX_POINTS))
        exam["section_scores"] = self._compute_section_scores(exam["questions"])
        exam["overall_feedback"] = self._generate_overall_feedback(exam)
        exam["status"] = STATUS_EVALUATED
        exam["evaluated_at"] = datetime.now(timezone.utc).isoformat()
        self._save_json(self._exam_path(candidate_id, exam_id), exam)

        self._update_student_performance(exam)
        logger.info(f"[ExamEngine] Exam {exam_id} evaluated: {obtained}/{total} ({percentage}%)")
        return self.get_result(candidate_id, exam_id)

    def get_result(self, candidate_id: str, exam_id: str) -> Dict[str, Any]:
        """Score, per-question feedback and section analysis for an evaluated exam."""
        exam = self._load_exam(candidate_id, exam_id)
        if not exam:
            return {"error": "Exam not found", "success": False}
        if exam.get("status") != STATUS_EVALUATED:
            return {"error": f"Exam not evaluated yet (status: {exam.get('status')})",
                    "success": False, "status": exam.get("status")}

        feedback = []
        for q in exam.get("questions", []):
            ev = q.get("evaluation") or {}
            feedback.append({
                "question_id": q.get("question_id"),
                "question": q.get("question"),
                "type": q.get("type"),
                "unit_number": q.get("unit_number"),
                "section_title": q.get("section_title"),
                "topic": q.get("topic"),
                "source": q.get("source"),
                "options": q.get("options") or [],
                "student_answer": q.get("student_answer") or "",
                "score": ev.get("score", 0),
                "max_score": ev.get("max_score", _marks_of(q)),
                "score_percentage": ev.get("score_percentage", 0),
                "is_correct": ev.get("is_correct", False),
                "correct_answer": ev.get("correct_answer", ""),
                "explanation": ev.get("explanation", ""),
                "feedback": ev.get("feedback", ""),
                "textbook_reference": ev.get("textbook_reference", ""),
                "graded_by": ev.get("graded_by", ""),
            })

        try:
            from student_performance import get_performance_tracker
            total_points = get_performance_tracker().get_total_points(candidate_id)
        except Exception:
            total_points = exam.get("points_earned") or 0

        return {
            "success": True,
            "exam_id": exam_id,
            "candidate_id": candidate_id,
            "subject": exam.get("subject"),
            "part": exam.get("part"),
            "unit_numbers": exam.get("unit_numbers"),
            "unit_titles": exam.get("unit_titles", {}),
            "exam_type": exam.get("exam_type"),
            "status": exam.get("status"),
            "total_questions": exam.get("total_questions"),
            "total_marks": exam.get("total_marks"),
            "obtained_marks": exam.get("obtained_marks"),
            "percentage": exam.get("percentage"),
            "points_earned": exam.get("points_earned"),
            "total_points_accumulated": total_points,
            "section_scores": exam.get("section_scores", {}),
            "overall_feedback": exam.get("overall_feedback"),
            "questions": feedback,
            "submitted_at": exam.get("submitted_at"),
            "evaluated_at": exam.get("evaluated_at"),
        }

    def list_exams(self, candidate_id: str, subject: Optional[str] = None) -> List[Dict[str, Any]]:
        """Summaries of a student's exams, newest first."""
        out = []
        for path in self.data_dir.glob(f"exam__{_safe_id(candidate_id)}__*.json"):
            exam = self._load_json(path)
            if not exam:
                continue
            if subject and (exam.get("subject") or "").strip().lower() != subject.strip().lower():
                continue
            out.append({
                "exam_id": exam.get("exam_id"),
                "subject": exam.get("subject"),
                "part": exam.get("part"),
                "unit_numbers": exam.get("unit_numbers"),
                "exam_type": exam.get("exam_type"),
                "status": exam.get("status"),
                "total_questions": exam.get("total_questions"),
                "total_marks": exam.get("total_marks"),
                "obtained_marks": exam.get("obtained_marks"),
                "percentage": exam.get("percentage"),
                "created_at": exam.get("created_at"),
                "evaluated_at": exam.get("evaluated_at"),
            })
        out.sort(key=lambda e: e.get("created_at") or "", reverse=True)
        return out


# ── Global singleton ──────────────────────────────────────────────────────────

_exam_engine: Optional[ExamSessionEngine] = None


def get_exam_engine() -> ExamSessionEngine:
    global _exam_engine
    if _exam_engine is None:
        _exam_engine = ExamSessionEngine()
    return _exam_engine
