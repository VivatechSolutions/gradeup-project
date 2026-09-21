"""
Homework Engine for GradeUp AI Tutor

Features:
- AI assigns homework based on student's weak areas
- Questions focused on textbook content for weak sections
- Progressive difficulty (slightly above student's current level)
- LLM-based answer evaluation with RAG grading
- Points awarded on completion
- Interactive Socratic chat: the student can attempt answers, ask the tutor to
  teach a concept, request hints or move between questions, and every turn comes
  back with tappable suggested follow-up questions
"""

import os
import json
import hashlib
import time
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests
from langfuse_utils import traced_post
from langfuse_utils import with_student_context
from logger import get_logger

logger = get_logger(__name__)

HOMEWORK_DATA_DIR = Path("homework_data")
HOMEWORK_MAX_POINTS = 100  # Points per homework assignment


class HomeworkEngine:
    """
    Assigns homework based on student weaknesses and scores submissions.
    """

    def __init__(self, data_dir: Path = HOMEWORK_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    # ── Internal Helpers ──────────────────────────────────────────────────────

    def _homework_path(self, candidate_id: str, homework_id: str) -> Path:
        safe_id = candidate_id.strip().lower().replace(" ", "_")
        return self.data_dir / f"{safe_id}__{homework_id}.json"

    def _candidate_index_path(self, candidate_id: str) -> Path:
        safe_id = candidate_id.strip().lower().replace(" ", "_")
        return self.data_dir / f"index__{safe_id}.json"

    def _load_json(self, path: Path) -> Optional[Dict[str, Any]]:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return None

    def _save_json(self, path: Path, data: Dict[str, Any]) -> None:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _add_to_index(
        self,
        candidate_id: str,
        homework_id: str,
        subject: str,
        unit_number: int,
        num_questions: int,
    ) -> None:
        """Track homework in a per-student index for fast listing."""
        path = self._candidate_index_path(candidate_id)
        index = self._load_json(path) or {"candidate_id": candidate_id, "homeworks": []}

        index["homeworks"].append({
            "homework_id": homework_id,
            "subject": subject,
            "unit_number": unit_number,
            "num_questions": num_questions,
            "status": "pending",
            "assigned_at": datetime.now(timezone.utc).isoformat(),
        })
        self._save_json(path, index)

    def _update_index_status(
        self,
        candidate_id: str,
        homework_id: str,
        status: str,
        score: Optional[float] = None,
        points: Optional[int] = None,
    ) -> None:
        """Update homework status in the index."""
        path = self._candidate_index_path(candidate_id)
        index = self._load_json(path)
        if not index:
            return

        for hw in index.get("homeworks", []):
            if hw.get("homework_id") == homework_id:
                hw["status"] = status
                if score is not None:
                    hw["score"] = score
                if points is not None:
                    hw["points_earned"] = points
                hw["completed_at"] = datetime.now(timezone.utc).isoformat()
                break

        self._save_json(path, index)

    def _determine_homework_difficulty(
        self, weak_sections: List[Dict[str, Any]]
    ) -> str:
        """
        Determine homework difficulty based on student's weakness profile.
        Progressive: slightly above current level.
        """
        if not weak_sections:
            return "medium"

        avg_weakness = sum(s.get("weakness_score", 0.5) for s in weak_sections) / len(weak_sections)

        # Very weak → easy homework to build foundation
        if avg_weakness > 0.7:
            return "easy"
        # Moderately weak → medium to challenge
        elif avg_weakness > 0.4:
            return "medium"
        # Strong → hard to push further
        else:
            return "hard"

    def _get_rag_context_for_sections(
        self, subject: str, unit_number: int, section_titles: List[str],
        term: Optional[Any] = None, board: Optional[str] = None,
        class_number: Optional[str] = None,
    ) -> str:
        """Get textbook content for weak sections from Qdrant."""
        try:
            from qdrant_integration import search_qdrant
            combined_query = " ".join(section_titles[:5])
            results = search_qdrant(
                query=combined_query,
                limit=5,
                unit_filter=unit_number,
                subject_filter=subject,
                board_filter=board,
                class_filter=class_number,
                term_filter=term,
            )
            if results:
                return "\n---\n".join(r.get("text", "")[:600] for r in results)
        except Exception as e:
            logger.warning(f"[HomeworkEngine] RAG retrieval failed: {e}")
        return ""

    def _generate_homework_with_llm(
        self,
        num_questions: int,
        difficulty: str,
        weak_sections: List[Dict[str, Any]],
        rag_context: str,
        subject: str,
        unit_number: int,
    ) -> List[Dict[str, Any]]:
        """Generate homework questions using LLM focused on weak areas."""
        api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return self._fallback_homework(subject, unit_number, num_questions)

        # Build weak sections description
        sections_desc = ""
        for sec in weak_sections[:8]:
            title = sec.get("section_title", "")
            weakness = sec.get("weakness_score", 0.5)
            avg_scores = sec.get("quiz_scores", []) + sec.get("homework_scores", [])
            avg = round(sum(avg_scores) / len(avg_scores), 1) if avg_scores else "N/A"
            sections_desc += f"  - {title}: weakness={weakness:.2f}, avg_score={avg}\n"

        difficulty_desc = {
            "easy": "Focus on fundamentals: definitions, basic concepts, recall questions. Help the student build a strong base.",
            "medium": "Focus on understanding: explanations, short applications, 'why' questions. Push beyond memorization.",
            "hard": "Focus on critical thinking: analysis, comparison, real-world application, synthesis across topics.",
        }

        prompt = f"""You are an expert AI tutor assigning homework to improve a student's understanding.

Subject: {subject}
Unit: {unit_number}
Difficulty Level: {difficulty.upper()}
Assignment Goal: {difficulty_desc.get(difficulty, '')}

Student's WEAK areas (higher weakness = needs more work):
{sections_desc}

Textbook context for these sections:
{rag_context[:3000]}

Generate exactly {num_questions} homework questions that:
1. Target the student's WEAKEST sections primarily
2. Mix question types: conceptual, application, analysis
3. Include clear instructions for each question
4. Are based on the textbook content provided

Format as JSON array:
[
  {{
    "question": "Explain why the cylindrical equal area projection distorts shapes near the poles. Use a real-world example.",
    "type": "conceptual",
    "section_title": "Cylindrical Equal Area Projection",
    "expected_answer": "The projection preserves area by adjusting parallel spacing using sin(latitude), but this forces horizontal stretching at high latitudes since all parallels equal the equator's length. Example: On this projection, Antarctica appears as a thin strip...",
    "marks": 5,
    "difficulty": "{difficulty}",
    "hints": ["Think about what happens to parallels near the poles", "Consider the trade-off between area and shape"]
  }}
]

Return ONLY the JSON array."""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_completion_tokens": 3000,
            "temperature": 1,
        }

        try:
            resp = traced_post("generate-homework",
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60,
            )
            if resp.ok:
                content = resp.json()["choices"][0]["message"]["content"].strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                questions = json.loads(content)

                # Add IDs
                for q in questions:
                    q["question_id"] = hashlib.md5(
                        q.get("question", "").encode()
                    ).hexdigest()[:12]

                return questions[:num_questions]
        except Exception as e:
            logger.warning(f"[HomeworkEngine] LLM generation failed: {e}")

        return self._fallback_homework(subject, unit_number, num_questions)

    def _fallback_homework(
        self, subject: str, unit_number: int, num_questions: int
    ) -> List[Dict[str, Any]]:
        """Fallback: pull practice questions from enriched.json."""
        from config import OUTPUTS_DIR

        questions = []
        # Search all document outputs for matching subject/unit
        for doc_dir in OUTPUTS_DIR.iterdir():
            enriched_path = doc_dir / "enriched.json"
            if not enriched_path.exists():
                continue

            try:
                import orjson
                enriched = orjson.loads(enriched_path.read_bytes())
                for unit in enriched.get("units", []):
                    if unit.get("unit_number") != unit_number:
                        continue
                    for sec in unit.get("sections", []):
                        enrichment = sec.get("enrichment", {})
                        for pq in enrichment.get("practice_questions", []):
                            q_text = pq.get("question", "")
                            if q_text:
                                questions.append({
                                    "question_id": hashlib.md5(q_text.encode()).hexdigest()[:12],
                                    "question": q_text,
                                    "type": "practice",
                                    "section_title": sec.get("section_title", ""),
                                    "expected_answer": "",
                                    "marks": 5,
                                    "difficulty": "medium",
                                    "hints": [],
                                })
            except Exception:
                continue

        return questions[:num_questions]

    def _evaluate_answers_with_llm(
        self,
        questions: List[Dict[str, Any]],
        answers: Dict[str, str],
        subject: str,
    ) -> List[Dict[str, Any]]:
        """Use LLM to evaluate homework answers against expected answers."""
        api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return self._simple_evaluate(questions, answers)

        # Build evaluation prompt
        qa_text = ""
        for i, q in enumerate(questions, 1):
            q_id = q.get("question_id", "")
            student_answer = answers.get(q_id, "(No answer provided)")
            expected = q.get("expected_answer", "")
            marks = q.get("marks", 5)
            qa_text += f"""
Q{i}. [{marks} marks] {q.get('question', '')}
Expected Answer: {expected}
Student's Answer: {student_answer}
"""

        prompt = f"""You are a teacher grading homework for {subject}.

Evaluate each answer and provide scores and feedback.

Questions and Answers:
{qa_text}

For each question, respond in JSON array:
[
  {{
    "question_index": 1,
    "score_percentage": 80,
    "is_correct": true,
    "feedback": "Good understanding of the concept. You correctly identified..."
  }}
]

Scoring rules:
- Score as a percentage (0-100)
- Be fair but encouraging
- Give partial credit for partial understanding
- If no answer provided, score 0
- Provide constructive feedback to help the student improve

Return ONLY the JSON array."""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_completion_tokens": 2000,
            "temperature": 0.2,
        }

        try:
            resp = traced_post("evaluate-homework-answers",
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60,
            )
            if resp.ok:
                content = resp.json()["choices"][0]["message"]["content"].strip()
                evals = self._parse_json_safe(content)
                if evals:
                    return evals
        except Exception as e:
            logger.warning(f"[HomeworkEngine] LLM evaluation failed: {e}")

        return self._simple_evaluate(questions, answers)

    def _parse_json_safe(self, raw: str) -> Optional[Any]:
        """
        Parse JSON from LLM output. Handles:
        - Clean JSON
        - JSON wrapped in ```json ... ``` fences
        - Truncated JSON (find largest valid prefix)
        """
        # Strip markdown fences
        cleaned = re.sub(r'^```[a-z]*\n?', '', raw.strip())
        cleaned = re.sub(r'\n?```$', '', cleaned).strip()

        # Try direct parse
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # Salvage: find largest valid JSON prefix
        for end in range(len(cleaned), 0, -1):
            if cleaned[end - 1] in ('}', ']'):
                try:
                    result = json.loads(cleaned[:end])
                    logger.info(f"[HomeworkEngine] Salvaged JSON up to char {end}/{len(cleaned)}")
                    return result
                except Exception:
                    continue

        return None

    def _simple_evaluate(
        self,
        questions: List[Dict[str, Any]],
        answers: Dict[str, str],
    ) -> List[Dict[str, Any]]:
        """Simple fallback evaluation based on answer length and keyword matching."""
        evaluations = []
        for i, q in enumerate(questions, 1):
            q_id = q.get("question_id", "")
            student_answer = answers.get(q_id, "")
            expected = q.get("expected_answer", "")

            if not student_answer.strip():
                score = 0
                feedback = "No answer provided. Please attempt all questions."
            elif expected:
                # Simple keyword match
                expected_words = set(expected.lower().split())
                student_words = set(student_answer.lower().split())
                stop = {"the", "a", "an", "is", "are", "was", "were", "of", "in", "to", "and", "or", "it"}
                key_expected = expected_words - stop
                matches = len(key_expected & student_words)
                score = min(100, round(matches / max(len(key_expected), 1) * 100))
                feedback = f"Matched {matches}/{len(key_expected)} key concepts." if key_expected else "Answer noted."
            else:
                # No expected answer: score based on effort
                score = min(70, len(student_answer.split()) * 3)
                feedback = "Answer recorded. Good effort!"

            evaluations.append({
                "question_index": i,
                "score_percentage": score,
                "is_correct": score >= 50,
                "feedback": feedback,
            })

        return evaluations

    # ── Public API ────────────────────────────────────────────────────────────

    @with_student_context()
    def assign_homework(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        document_id: str,
        num_questions: int = 5,
        candidate_name: str = "",
        unit_title: str = "",
        specific_topic: str = "",
        term: Optional[Any] = None,
        board: Optional[str] = None,
        class_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        AI assigns homework based on the student's weak areas.

        Priority order for topic selection:
        0. Specific topic — if explicitly requested by AI Tutor auto-assignment
        1. Focus topics — sections student asked about 4+ times in AI Tutor
        2. Weak sections — sections with low quiz/homework scores
        3. General sections — from enriched.json if no performance data exists
        """
        from student_performance import get_performance_tracker
        tracker = get_performance_tracker()
        weak_sections = []

        # ── Priority 0: Explicit specific topic ──
        if specific_topic:
            weak_sections.append({
                "section_title": specific_topic,
                "weakness_score": 1.0,  # Max weakness to guarantee focus
                "quiz_scores": [],
                "homework_scores": [],
                "faq_views": 10,  # Simulating high interaction
            })

        # ── Priority 1: Focus topics from AI Tutor conversations ──
        focus_topics = []
        if not specific_topic:
            focus_topics = tracker.get_focus_topics(candidate_id, subject, unit_number)

        if focus_topics:
            # Convert focus topics to the weak_sections format
            for ft in focus_topics:
                title = ft.get("section_title", "").strip().lower()
                if title == "general":
                    continue
                weak_sections.append({
                    "section_title": ft.get("section_title", ""),
                    "weakness_score": 0.9,  # Treat as very weak (student keeps asking)
                    "quiz_scores": [],
                    "homework_scores": [],
                    "faq_views": ft.get("count", 0),
                })

        # ── Priority 2: Weak sections from performance data ──
        perf_weak = tracker.get_weak_sections(candidate_id, subject, unit_number)
        if perf_weak:
            # Merge — focus topics first, then performance-based weak sections
            existing_titles = {s["section_title"].strip().lower() for s in weak_sections}
            for pw in perf_weak:
                title = pw.get("section_title", "").strip().lower()
                if title != "general" and title not in existing_titles and pw.get("weakness_score", 0.0) > 0.4:
                    weak_sections.append(pw)

        # ── If no specific topic or weaknesses exist, skip homework ──
        if not weak_sections:
            return {
                "success": True,
                "message": "You are doing good! There is no need to do any homework right now.",
                "homework_id": None,
                "questions": [],
                "total_questions": 0,
                "difficulty": "none",
                "max_points": 0,
                "weak_sections_targeted": [],
            }

        # Determine difficulty
        difficulty = self._determine_homework_difficulty(weak_sections)

        # Get RAG context
        section_titles = [s.get("section_title", "") for s in weak_sections[:5]]
        rag_context = self._get_rag_context_for_sections(
            subject, unit_number, section_titles,
            term=term, board=board, class_number=class_number,
        )

        # Generate questions
        questions = self._generate_homework_with_llm(
            num_questions=num_questions,
            difficulty=difficulty,
            weak_sections=weak_sections,
            rag_context=rag_context,
            subject=subject,
            unit_number=unit_number,
        )

        # Create homework ID
        homework_id = hashlib.md5(
            f"{candidate_id}_{subject}_{unit_number}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]

        # Build homework document
        weak_sections_targeted = [s.get("section_title", "") for s in weak_sections[:5]]
        homework = {
            "homework_id": homework_id,
            "candidate_id": candidate_id,
            "candidate_name": candidate_name,
            "document_id": document_id,
            "subject": subject,
            "unit_number": unit_number,
            "unit_title": unit_title,
            # Persisted so the homework chat can reproduce the same RAG scope.
            # The chat path already read these keys; nothing wrote them before.
            "board": board,
            "class_number": class_number,
            "term": term,
            "difficulty": difficulty,
            "status": "pending",
            "questions": questions,
            "total_questions": len(questions),
            "max_points": HOMEWORK_MAX_POINTS,
            "weak_sections_targeted": weak_sections_targeted,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
        }

        # Save
        path = self._homework_path(candidate_id, homework_id)
        self._save_json(path, homework)
        self._add_to_index(candidate_id, homework_id, subject, unit_number, len(questions))

        # Log assignment in unified student history
        try:
            tracker.record_homework_assignment(
                candidate_id=candidate_id,
                subject=subject,
                unit_number=unit_number,
                homework_id=homework_id,
                topics=weak_sections_targeted,
                difficulty=difficulty,
                unit_title=unit_title,
            )
        except Exception as e:
            logger.warning(f"[HomeworkEngine] Failed to log assignment: {e}")

        # Return (hide expected answers from student)
        student_questions = []
        for q in questions:
            sq = {
                "question_id": q.get("question_id"),
                "question": q.get("question"),
                "type": q.get("type"),
                "section_title": q.get("section_title"),
                "marks": q.get("marks"),
                "difficulty": q.get("difficulty"),
                "hints": q.get("hints", []),
            }
            student_questions.append(sq)

        return {
            "homework_id": homework_id,
            "subject": subject,
            "unit_number": unit_number,
            "difficulty": difficulty,
            "total_questions": len(student_questions),
            "questions": student_questions,
            "max_points": HOMEWORK_MAX_POINTS,
            "weak_sections_targeted": weak_sections_targeted,
        }

    @with_student_context()
    def submit_homework(
        self,
        homework_id: str,
        candidate_id: str,
        answers: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Score submitted homework using LLM evaluation.

        Args:
            answers: [{"question_id": "abc123", "answer": "..."}]
        """
        path = self._homework_path(candidate_id, homework_id)
        homework = self._load_json(path)

        if not homework:
            return {"error": "Homework not found", "success": False}

        if homework.get("status") == "completed":
            return {"error": "Homework already submitted", "success": False}

        questions = homework.get("questions", [])
        subject = homework.get("subject", "")
        unit_number = homework.get("unit_number", 0)

        # Build answer map
        answer_map = {a.get("question_id", ""): a.get("answer", "") for a in answers}

        # Evaluate with LLM
        evaluations = self._evaluate_answers_with_llm(questions, answer_map, subject)

        # Calculate scores
        total_score = 0
        total_marks = 0
        section_scores_raw: Dict[str, List[float]] = {}
        feedback = []

        for i, q in enumerate(questions):
            q_id = q.get("question_id", "")
            marks = q.get("marks", 5)
            section = q.get("section_title", "general")
            student_answer = answer_map.get(q_id, "")

            # Find evaluation
            eval_data = {}
            for e in evaluations:
                if e.get("question_index") == i + 1:
                    eval_data = e
                    break

            score_pct = eval_data.get("score_percentage", 0)
            q_score = round(marks * score_pct / 100, 2)
            total_score += q_score
            total_marks += marks

            section_scores_raw.setdefault(section, [])
            section_scores_raw[section].append(score_pct)

            feedback.append({
                "question_id": q_id,
                "question": q.get("question", ""),
                "student_answer": student_answer,
                "score": q_score,
                "max_marks": marks,
                "score_percentage": score_pct,
                "is_correct": eval_data.get("is_correct", False),
                "feedback": eval_data.get("feedback", ""),
            })

        percentage = round(total_score / total_marks * 100, 2) if total_marks > 0 else 0
        points_earned = round(percentage / 100 * HOMEWORK_MAX_POINTS)

        # Section-wise scores
        section_scores = {}
        for section, scores in section_scores_raw.items():
            section_scores[section] = round(sum(scores) / len(scores), 2) if scores else 0

        # Update homework status
        homework["status"] = "completed"
        homework["submission"] = {
            "answers": answer_map,
            "score": total_score,
            "total_marks": total_marks,
            "percentage": percentage,
            "points_earned": points_earned,
            "section_scores": section_scores,
            "feedback": feedback,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        }
        self._save_json(path, homework)
        self._update_index_status(candidate_id, homework_id, "completed", percentage, points_earned)

        # Update student performance
        try:
            from student_performance import get_performance_tracker
            tracker = get_performance_tracker()
            tracker.record_homework_score(
                candidate_id=candidate_id,
                subject=subject,
                unit_number=unit_number,
                section_scores=section_scores,
                total_score=percentage,
                points=points_earned,
                unit_title=homework.get("unit_title", ""),
                candidate_name=homework.get("candidate_name", ""),
            )

            # Log homework submission in unified interaction_history
            data = tracker._load(candidate_id)
            data.setdefault("interaction_history", []).append({
                "type": "homework_submitted",
                "subject": subject,
                "unit_number": unit_number,
                "unit_title": homework.get("unit_title", ""),
                "homework_id": homework_id,
                "score": percentage,
                "points_earned": points_earned,
                "sections": list(section_scores.keys()),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            if len(data["interaction_history"]) > 200:
                data["interaction_history"] = data["interaction_history"][-200:]
            tracker._save(candidate_id, data)
        except Exception as e:
            logger.warning(f"[HomeworkEngine] Failed to update performance: {e}")

        # Get updated total points
        try:
            from student_performance import get_performance_tracker
            total_points = get_performance_tracker().get_total_points(candidate_id)
        except Exception:
            total_points = points_earned

        return {
            "success": True,
            "homework_id": homework_id,
            "score": total_score,
            "total_marks": total_marks,
            "percentage": percentage,
            "points_earned": points_earned,
            "total_points_accumulated": total_points,
            "section_scores": section_scores,
            "feedback": feedback,
        }

    def get_homeworks(
        self,
        candidate_id: str,
        subject: Optional[str] = None,
        unit_number: Optional[int] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List homework assignments for a student."""
        path = self._candidate_index_path(candidate_id)
        index = self._load_json(path)

        if not index:
            return []

        homeworks = index.get("homeworks", [])

        # Apply filters
        if subject:
            homeworks = [h for h in homeworks if h.get("subject") == subject]
        if unit_number is not None:
            homeworks = [h for h in homeworks if h.get("unit_number") == unit_number]
        if status:
            homeworks = [h for h in homeworks if h.get("status") == status]

        return homeworks

    def get_homework_detail(
        self, candidate_id: str, homework_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get full homework detail including submission if completed."""
        path = self._homework_path(candidate_id, homework_id)
        return self._load_json(path)

    def get_homework_history(
        self,
        candidate_id: str,
        subject: Optional[str] = None,
        unit_number: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Get completed homework history with scores."""
        homeworks = self.get_homeworks(candidate_id, subject, unit_number, status="completed")

        history = []
        for hw in homeworks:
            detail = self.get_homework_detail(candidate_id, hw.get("homework_id", ""))
            if detail and detail.get("submission"):
                sub = detail["submission"]
                history.append({
                    "homework_id": hw.get("homework_id"),
                    "subject": hw.get("subject"),
                    "unit_number": hw.get("unit_number"),
                    "score": sub.get("score"),
                    "total_marks": sub.get("total_marks"),
                    "percentage": sub.get("percentage"),
                    "points_earned": sub.get("points_earned"),
                    "assigned_at": hw.get("assigned_at"),
                    "completed_at": hw.get("completed_at"),
                })

        return history

    def get_homework_session_path(self, candidate_id: str, homework_id: str) -> Path:
        safe_id = candidate_id.strip().lower().replace(" ", "_")
        return self.data_dir / f"session_{safe_id}__{homework_id}.json"

    def get_or_create_homework_session(
        self, candidate_id: str, homework_id: str, homework_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        path = self.get_homework_session_path(candidate_id, homework_id)
        session = self._load_json(path)
        if not session:
            first_q = homework_details["questions"][0]
            first_topic = (first_q.get("section_title")
                           or homework_details.get("unit_title")
                           or homework_details.get("subject") or "this topic")
            session = {
                "homework_id": homework_id,
                "candidate_id": candidate_id,
                "current_question_index": 0,
                "attempts_count": 0,
                "hints_used": 0,
                "concepts_explored": 0,
                "status": "pending",
                "pending_offer": first_topic,
                "suggested_questions": self._offer_suggestions(
                    first_topic, self._greeting_suggestions(first_topic)
                ),
                "chat_history": [
                    {
                        "role": "assistant",
                        "content": self._greeting(homework_details, first_q, first_topic),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                ]
            }
            self._save_json(path, session)
        else:
            # Backfill interactive-chat fields on sessions created before the
            # helper became conversational.
            session.setdefault("hints_used", 0)
            session.setdefault("concepts_explored", 0)
            session.setdefault("suggested_questions", [])
            session.setdefault("pending_offer", "")
        return session

    # ── Interactive chat helpers ──────────────────────────────────────────────

    @staticmethod
    def _greeting(homework: Dict[str, Any], first_q: Dict[str, Any],
                  topic: str) -> str:
        """
        Opening message: greet the student, show the question has been read,
        put it on screen, and hand them the choice of being taught the concept
        or diving straight in.
        """
        lines = [
            "Hey buddy! I'm here to help with your homework — let's work through this together.",
            "",
            "I've analysed your question.",
            "",
            "**Question:**",
            first_q.get("question", ""),
        ]
        if topic and topic != "this topic":
            lines += ["", f"This one is really about **{topic}**."]
        lines += [
            "",
            "So, where would you like to begin — should I explain the concept behind this "
            "question first, or would you rather take a shot at it and I'll help from there?",
        ]
        return "\n".join(lines)

    @staticmethod
    def _greeting_suggestions(topic: str) -> List[str]:
        """The two paths the greeting offers, plus one way in for a stuck student."""
        return [
            "I'll try it myself first",
            "What is this question asking me to do?",
        ]

    @staticmethod
    def _starter_suggestions(
        question: Dict[str, Any], homework: Dict[str, Any]
    ) -> List[str]:
        """Fallback follow-ups offered when the LLM returns none of its own."""
        topic = (question.get("section_title")
                 or homework.get("unit_title")
                 or homework.get("subject") or "this topic")
        return [
            f"Can you explain {topic} with a simple example?",
            "What is this question asking me to do?",
            "Can you give me a hint to get started?",
        ]

    @staticmethod
    def _offer_suggestions(offer: str, suggestions: List[str]) -> List[str]:
        """
        Put a one-tap acceptance at the top of the suggestion chips whenever the
        tutor has offered to explain something ("Would you like me to explain X?").
        """
        if not offer:
            return suggestions[:3]
        accept = f"Yes, explain {offer}"
        rest = [q for q in suggestions if q.strip().lower() != accept.lower()]
        return [accept] + rest[:2]

    def _retrieve_textbook_context(
        self,
        queries: List[str],
        homework: Dict[str, Any],
        per_query: int = 3,
        max_chunks: int = 4,
    ) -> str:
        """
        Pull textbook passages from Qdrant for each query, deduplicated.

        The student's own message is searched alongside the homework question, so
        a "teach me this concept" turn retrieves the concept itself and not only
        the question it was asked from.
        """
        try:
            from qdrant_integration import search_qdrant
        except ImportError:
            return ""

        seen: set = set()
        chunks: List[str] = []
        for query in queries:
            if not query or not query.strip():
                continue
            try:
                results = search_qdrant(
                    query=query,
                    limit=per_query,
                    unit_filter=homework.get("unit_number"),
                    subject_filter=homework.get("subject"),
                    board_filter=homework.get("board"),
                    class_filter=homework.get("class_number"),
                    term_filter=homework.get("term"),
                )
            except Exception as q_err:
                logger.error(f"[HomeworkEngine] RAG retrieval failed: {q_err}")
                continue

            for r in results or []:
                text = (r.get("text") or "").strip()
                if not text:
                    continue
                key = text[:120].lower()
                if key in seen:
                    continue
                seen.add(key)
                chunks.append(text[:600])
                if len(chunks) >= max_chunks:
                    return "\n---\n".join(chunks)

        return "\n---\n".join(chunks)

    def get_chat_transcript(
        self, candidate_id: str, homework_id: str
    ) -> Optional[Dict[str, Any]]:
        """Full chat transcript plus live progress for a helper session."""
        session = self._load_json(
            self.get_homework_session_path(candidate_id, homework_id)
        )
        if not session:
            return None

        homework = self.get_homework_detail(candidate_id, homework_id) or {}
        questions = homework.get("questions", [])
        idx = session.get("current_question_index", 0)

        return {
            "homework_id": homework_id,
            "candidate_id": candidate_id,
            "subject": homework.get("subject"),
            "unit_number": homework.get("unit_number"),
            "status": session.get("status", "pending"),
            "chat_history": session.get("chat_history", []),
            "current_question": questions[idx]["question"] if idx < len(questions) else "",
            "current_question_index": idx,
            "total_questions": len(questions),
            "attempts_count": session.get("attempts_count", 0),
            "hints_used": session.get("hints_used", 0),
            "concepts_explored": session.get("concepts_explored", 0),
            "suggested_questions": session.get("suggested_questions", []),
            "pending_offer": session.get("pending_offer", ""),
            "awaiting_offer_reply": bool(session.get("pending_offer")),
        }

    def save_homework_session(
        self, candidate_id: str, homework_id: str, session: Dict[str, Any]
    ) -> None:
        path = self.get_homework_session_path(candidate_id, homework_id)
        self._save_json(path, session)

    @with_student_context()
    def ingest_school_homework(
        self,
        candidate_id: str,
        image_base64: Optional[str],
        text_content: Optional[str],
        subject: str,
        unit_number: int,
        board: Optional[str] = None,
        class_number: Optional[str] = None,
        term: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Parses a school homework sheet (via OCR image or text content) into a structured JSON
        homework assignment, generating expected answer rubrics and progressive hints.
        """
        api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise Exception("OpenAI API Key is missing.")

        # System prompt for structured parsing
        system_prompt = (
            "You are an educational assistant that processes raw school homework worksheets or text.\n"
            "Your goal is to extract the individual questions and structure them into a JSON array.\n\n"
            "For each question, you MUST generate:\n"
            "1. 'question': The text of the question.\n"
            "2. 'type': 'conceptual' | 'numerical' | 'application'.\n"
            "3. 'section_title': A short title for the specific subtopic/concept (e.g. 'Photosynthesis Rate').\n"
            "4. 'expected_answer': A detailed, confidential grading rubric/reference answer key.\n"
            "5. 'marks': Default to 10.\n"
            "6. 'hints': A JSON list of 2 progressive hints:\n"
            "   - Hint 1: A high-level conceptual hint or general formula.\n"
            "   - Hint 2: A more specific, step-by-step guidance hint (but without giving the final answer).\n"
            "7. 'question_id': A unique 12-character hex ID (generate randomly).\n\n"
            "Respond ONLY with a JSON object of this structure:\n"
            "{\n"
            "  \"questions\": [\n"
            "    { ... },\n"
            "    { ... }\n"
            "  ]\n"
            "}"
        )

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        if image_base64:
            user_content = [
                {"type": "text", "text": f"Extract and structure the questions from this homework sheet. Subject is {subject}, Unit is {unit_number}"},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                }
            ]
            model = "gpt-4o"
        else:
            user_content = f"Subject: {subject}\nUnit Number: {unit_number}\nText Content:\n{text_content or 'Please explain how to solve my homework'}"
            model = "gpt-4o-mini"

        messages.append({"role": "user", "content": user_content})

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        resp = traced_post("ingest-school-homework",
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=45
        )

        if not resp.ok:
            raise Exception(f"Failed to ingest homework via OpenAI: {resp.text}")

        result_data = json.loads(resp.json()["choices"][0]["message"]["content"])
        questions = result_data.get("questions", [])

        if not questions:
            raise Exception("No questions could be extracted from the uploaded content.")

        # Create homework ID
        homework_id = "school_" + hashlib.md5(
            f"{candidate_id}_{subject}_{unit_number}_{time.time()}".encode()
        ).hexdigest()[:16]

        # Build homework document
        weak_sections_targeted = list(set(q.get("section_title", "general") for q in questions))
        homework = {
            "homework_id": homework_id,
            "candidate_id": candidate_id,
            "candidate_name": "Student",
            "document_id": "school_upload",
            "subject": subject,
            "unit_number": unit_number,
            "unit_title": "School Homework",
            "board": board,
            "class_number": class_number,
            "term": term,
            "difficulty": "medium",
            "status": "pending",
            "questions": questions,
            "total_questions": len(questions),
            "max_points": 100,
            "weak_sections_targeted": weak_sections_targeted,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
        }

        # Save homework assignment
        path = self._homework_path(candidate_id, homework_id)
        self._save_json(path, homework)
        self._add_to_index(candidate_id, homework_id, subject, unit_number, len(questions))

        return homework

    @with_student_context(session_arg="homework_id")
    def execute_socratic_chat_turn(
        self,
        candidate_id: str,
        homework_id: str,
        message: str,
        image_base64: Optional[str] = None,
        subject: Optional[str] = None,
        unit_number: Optional[int] = None,
        board: Optional[str] = None,
        class_number: Optional[str] = None,
        term: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Executes one interactive tutoring turn.

        If homework_id is 'new' or 'school', it will first ingest the school homework sheet.
        Otherwise it loads the existing session, works out what the student is actually
        doing — attempting the answer, asking to be taught a concept, asking for a hint,
        or moving between questions — and responds accordingly. Every turn also returns
        suggested follow-up questions the student can tap to keep exploring the topic.
        """
        # Load homework assignment
        homework = None
        if homework_id in ("new", "school"):
            if not subject or unit_number is None:
                raise Exception("Subject and unit_number are required to start a new school homework session.")
            # Ingest image or text as new homework
            homework = self.ingest_school_homework(
                candidate_id=candidate_id,
                image_base64=image_base64,
                text_content=message,
                subject=subject,
                unit_number=unit_number,
                board=board,
                class_number=class_number,
                term=term,
            )
            homework_id = homework["homework_id"]
            # Clear message since the ingestion creates the first question prompt
            message = ""
            image_base64 = None
        else:
            homework = self.get_homework_detail(candidate_id, homework_id)
            if not homework:
                raise Exception(f"Homework assignment '{homework_id}' not found.")

        # Load or initialize stateful session
        session = self.get_or_create_homework_session(candidate_id, homework_id, homework)

        # If starting a new ingested school session (where message was cleared), return the initial welcome message
        if not message and not image_base64:
            first_msg = session["chat_history"][0]
            return {
                "success": True,
                "homework_id": homework_id,
                "response": first_msg["content"],
                "current_question": homework["questions"][0]["question"],
                "current_question_index": 0,
                "total_questions": len(homework["questions"]),
                "action": "provide_hint",
                "intent": "session_start",
                "suggested_questions": session.get("suggested_questions", []),
                "pending_offer": session.get("pending_offer", ""),
                "awaiting_offer_reply": bool(session.get("pending_offer")),
                "attempts_count": 0,
                "hints_used": 0,
                "status": "pending"
            }

        # Current question context
        idx = session["current_question_index"]
        questions = homework["questions"]
        
        if idx >= len(questions):
            return {
                "success": True,
                "homework_id": homework_id,
                "response": "This homework assignment is already completed! Nice job! 🎉",
                "current_question": "",
                "current_question_index": idx,
                "total_questions": len(questions),
                "action": "complete_homework",
                "intent": "completed",
                "suggested_questions": [],
                "pending_offer": "",
                "awaiting_offer_reply": False,
                "attempts_count": session.get("attempts_count", 0),
                "hints_used": session.get("hints_used", 0),
                "status": "completed"
            }

        current_q = questions[idx]

        # Append student message to history
        session["chat_history"].append({
            "role": "user",
            "content": message if message else "[Student uploaded image of work]",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        # Retrieve textbook context from Qdrant (RAG integration). The student's own
        # words are searched first so a "teach me X" turn pulls X, not just the question.
        rag_queries = [current_q["question"]]
        if message and len(message.split()) >= 3:
            rag_queries.insert(0, message)
        textbook_context = self._retrieve_textbook_context(rag_queries, homework)

        # Call OpenAI to run Socratic feedback
        api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise Exception("OpenAI API Key is missing.")

        pending_offer = (session.get("pending_offer") or "").strip()
        offer_block = (
            f"## YOUR PREVIOUS OFFER (the student is replying to this):\n"
            f"You offered to explain the concept behind the question — {pending_offer} — and asked whether\n"
            f"they wanted that or would rather attempt it themselves.\n"
            f"- If the student ACCEPTS in any form (\"yes\", \"yes please\", \"sure\", \"ok\", \"go on\", \"explain\",\n"
            f"  or they tap 'Yes, explain {pending_offer}') → intent \"accept_offer\": now TEACH {pending_offer}\n"
            f"  properly, then bring them back to the question.\n"
            f"- If the student would rather START (\"no\", \"not now\", \"I'll try it myself first\", \"let's begin\",\n"
            f"  \"where do I start?\") → intent \"decline_offer\": cheer them on in a line, do NOT explain the\n"
            f"  concept, and ask the one opening question that gets them into the problem.\n\n"
            if pending_offer else ""
        )

        system_prompt = (
            "You are the GradeUp Homework Helper — a warm, friendly teacher sitting beside a school student.\n"
            "The student is working through a homework assignment, but this is a real conversation: they may\n"
            "attempt the question, ask you to TEACH them a concept they don't understand, ask for a hint, or\n"
            "want to move around the assignment. Handle whichever they do.\n\n"
            "## THIS IS NOT A TEST — THERE IS NO PENALTY:\n"
            "- Nothing the student says costs them marks. A wrong answer is just a step on the way.\n"
            "- NEVER scold, mark them down, or say things like \"that's wrong\", \"incorrect\", \"you failed\",\n"
            "  \"you should already know this\", or \"this is your third try\".\n"
            "- NEVER mention attempt counts, scores, or how many hints they have used.\n"
            "- NEVER number the questions out loud (\"Question 3 of 5\") — just talk about \"this question\".\n"
            "- Asking questions is the BEST thing they can do — praise curiosity every time it shows up.\n"
            "- Always keep the conversation going: end with something they can reply to, never a dead end.\n\n"
            "## CURRENT ACTIVE QUESTION INFO:\n"
            f"- Question {idx + 1} of {len(questions)}: {current_q['question']}\n"
            f"- Topic: {current_q.get('section_title', homework.get('unit_title', ''))}\n"
            f"- Hints: {current_q.get('hints', [])}\n"
            f"- Confidential Rubric/Expected Answer (NEVER REVEAL): {current_q.get('expected_answer', '')}\n"
            f"- Exchanges on this question so far (for YOUR pacing only — never mention it): {session['attempts_count']}\n"
            f"- Hints already given on this question (never mention it): {session.get('hints_used', 0)}\n\n"
            + offer_block +
            "## STEP 1 — CLASSIFY the student's message into 'intent':\n"
            "- \"answer_attempt\"     — they are trying to answer the active question\n"
            "- \"concept_question\"   — they want to LEARN or understand something (a definition, a formula,\n"
            "  'why does...', 'what is...', 'explain...', 'I don't understand...')\n"
            "- \"accept_offer\"       — a plain yes to the explanation you just offered\n"
            "- \"decline_offer\"      — a plain no to the explanation you just offered\n"
            "- \"hint_request\"       — they explicitly want a hint or say they are stuck with no attempt\n"
            "- \"next_question\"      — skip ahead / 'next question'\n"
            "- \"previous_question\"  — go back to the previous question\n"
            "- \"repeat_question\"    — read the current question again\n"
            "- \"smalltalk\"          — greeting, thanks, or off-topic chat\n"
            "A bare \"yes\"/\"no\" is ONLY accept_offer/decline_offer when you actually made an offer above;\n"
            "otherwise treat it as an answer_attempt.\n\n"
            "## STEP 2 — RESPOND according to the intent:\n"
            "- answer_attempt: evaluate their reasoning. If correct → 'correct': true, congratulate, briefly say\n"
            "  WHY it is right, 'action': 'advance_question'. If not yet right → 'correct': false, first name the\n"
            "  part they DID get right, then gently open up the step that needs another look WITHOUT revealing\n"
            "  the answer, give the next unused hint, and end with a guiding question, 'action': 'provide_hint'.\n"
            "- concept_question / accept_offer: TEACH them. Explain the concept clearly from the textbook context\n"
            "  with a short everyday example, then tie it back to what the question is asking. You may fully\n"
            "  explain the CONCEPT — that is how they learn — but NEVER the specific answer to the active\n"
            "  homework question. 'correct': false, 'action': 'explain_concept'.\n"
            "- decline_offer: one encouraging line pointing them back at the question. 'action': 'chat'.\n"
            "- hint_request: give exactly ONE next hint, never the answer. 'action': 'provide_hint'.\n"
            "- next_question / previous_question / repeat_question: acknowledge in one line and set 'action' to\n"
            "  the matching value.\n"
            "- smalltalk: reply warmly in a line or two and steer back to the work. 'action': 'chat'.\n\n"
            "## ALWAYS:\n"
            "1. Be encouraging and age-appropriate (school level). 2-5 sentences, except when teaching a concept.\n"
            "2. Use LaTeX inline \\( ... \\) or display \\[ ... \\] for formulas where helpful.\n"
            "3. Ground every explanation in the TEXTBOOK REFERENCE CONTEXT when it is provided. Do not invent facts.\n"
            "4. OFFER TO TEACH. Unless the student just finished the last question, end 'assistant_response' by\n"
            "   naming ONE specific concept they need and asking: \"Would you like me to explain <concept>?\"\n"
            "   Put that exact concept name — and nothing else — in 'offer_concept'. Pick a concept the student\n"
            "   has not just had explained; when you have run out of useful offers, use \"\" instead.\n"
            "5. Give exactly 3 'suggested_questions' that CONTINUE THIS CONVERSATION. Read the messages above and\n"
            "   build them on what you and the student have just been discussing — the idea you just explained,\n"
            "   the step they got stuck on, the word they used. Make the three DIFFERENT in kind, e.g. one that\n"
            "   digs into the 'why' behind what was just said, one that asks for a concrete example or a worked\n"
            "   step, and one that links it to something the student already knows or sees in daily life.\n"
            "   Rules: written in the STUDENT'S voice ('Why does the rate slow down at night?'), under 14 words,\n"
            "   naming the actual concept rather than saying 'this' or 'it', never a vague opener like 'tell me\n"
            "   more', never repeating a question already asked in this conversation, and NEVER a question that\n"
            "   asks you for the answer to the homework question.\n\n"
            "Respond ONLY with a JSON object matching this structure:\n"
            "{\n"
            "  \"intent\": \"answer_attempt\" | \"concept_question\" | \"accept_offer\" | \"decline_offer\" | \"hint_request\" | \"next_question\" | \"previous_question\" | \"repeat_question\" | \"smalltalk\",\n"
            "  \"correct\": true | false,\n"
            "  \"assistant_response\": \"Your reply to the student here, ending with the offer...\",\n"
            "  \"offer_concept\": \"the concept you just offered to explain, or \\\"\\\"\",\n"
            "  \"action\": \"advance_question\" | \"provide_hint\" | \"explain_concept\" | \"next_question\" | \"previous_question\" | \"repeat_question\" | \"chat\",\n"
            "  \"suggested_questions\": [\"...\", \"...\", \"...\"]\n"
            "}"
        )

        # Construct payload with RAG context
        user_prompt = f"Student Message: {message}\n\n"
        if textbook_context:
            user_prompt += f"--- TEXTBOOK REFERENCE CONTEXT ---\n{textbook_context}\n----------------------------------\n\n"
        user_prompt += (
            "Classify what the student is doing, then reply as instructed. "
            "Remember: teaching a concept is encouraged, revealing the homework answer is not, "
            "and nothing here is graded. Base your suggested_questions on the conversation above."
        )

        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Replay recent turns so the tutor answers in the flow of the conversation
        # and can build its follow-up suggestions on what was actually discussed.
        for msg in session["chat_history"][-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

        if image_base64:
            user_content = [
                {"type": "text", "text": user_prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                }
            ]
            model = "gpt-4o"
        else:
            user_content = user_prompt
            model = "gpt-4o-mini"

        messages.append({"role": "user", "content": user_content})

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.3,
        }

        resp = traced_post("socratic-chat-turn",
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=40
        )

        if not resp.ok:
            raise Exception(f"Socratic LLM request failed: {resp.text}")

        eval_result = json.loads(resp.json()["choices"][0]["message"]["content"])
        intent = str(eval_result.get("intent") or "answer_attempt").strip().lower()
        is_correct = bool(eval_result.get("correct", False))
        assistant_resp = eval_result.get("assistant_response", "Let's keep trying! What do you think is the next step?")
        new_offer = str(eval_result.get("offer_concept") or "").strip()
        suggested = [
            str(q).strip() for q in (eval_result.get("suggested_questions") or [])
            if str(q).strip()
        ][:3]
        if not suggested:
            suggested = self._starter_suggestions(current_q, homework)

        # A bare yes/no only means accept/decline when an offer was actually open.
        if intent in ("accept_offer", "decline_offer") and not pending_offer:
            intent = "answer_attempt"

        # ── Update state from the intent ──────────────────────────────────────
        # Only a real answer attempt costs an attempt; asking to be taught a
        # concept or requesting a hint never counts against the student.
        if intent in ("concept_question", "accept_offer"):
            action = "explain_concept"
            session["concepts_explored"] = session.get("concepts_explored", 0) + 1
        elif intent == "decline_offer":
            action = "chat"
        elif intent == "hint_request":
            action = "provide_hint"
            session["hints_used"] = session.get("hints_used", 0) + 1
        elif intent == "next_question":
            action = "next_question"
            if idx + 1 < len(questions):
                session["current_question_index"] = idx + 1
                session["attempts_count"] = 0
                session["hints_used"] = 0
            else:
                assistant_resp += "\n\nThat was the last question — we can go back to any earlier one if you'd like."
        elif intent == "previous_question":
            action = "previous_question"
            if idx > 0:
                session["current_question_index"] = idx - 1
                session["attempts_count"] = 0
                session["hints_used"] = 0
            else:
                assistant_resp += "\n\nWe're already on the first question."
        elif intent == "repeat_question":
            action = "repeat_question"
        elif intent == "smalltalk":
            action = "chat"
        elif is_correct:
            # Correct answer — advance
            session["current_question_index"] = idx + 1
            session["attempts_count"] = 0
            session["hints_used"] = 0
            action = "advance_question"

            # If all questions are now complete
            if session["current_question_index"] >= len(questions):
                session["status"] = "completed"
                # Update status in general index
                self._update_index_status(candidate_id, homework_id, "completed", score=100.0, points=100)
                action = "complete_homework"
                suggested = []
                new_offer = ""
                assistant_resp += "\n\n🎉 **Congratulations! You have completed all questions in this homework assignment!**"
        else:
            action = "provide_hint"
            session["attempts_count"] += 1

        # Keep the open offer so the next bare "yes" / "no" resolves against it.
        # Repeating the concept just declined would be pestering, so drop it.
        if intent == "decline_offer" and new_offer.lower() == pending_offer.lower():
            new_offer = ""
        session["pending_offer"] = new_offer
        if new_offer:
            suggested = self._offer_suggestions(new_offer, suggested)

        current_idx = session["current_question_index"]

        # When the active question changed, put it in the reply so the chat reads
        # as one continuous conversation.
        if current_idx != idx and current_idx < len(questions):
            assistant_resp += f"\n\n**Question:**\n{questions[current_idx]['question']}"
        elif action == "repeat_question":
            assistant_resp += f"\n\n**Question:**\n{current_q['question']}"

        # Append assistant feedback to session history
        session["chat_history"].append({
            "role": "assistant",
            "content": assistant_resp,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        session["suggested_questions"] = suggested

        # Save session
        self.save_homework_session(candidate_id, homework_id, session)

        next_q = ""
        if current_idx < len(questions):
            next_q = questions[current_idx]["question"]

        return {
            "success": True,
            "homework_id": homework_id,
            "response": assistant_resp,
            "current_question": next_q or "Homework Completed!",
            "current_question_index": current_idx,
            "total_questions": len(questions),
            "action": action,
            "intent": intent,
            "suggested_questions": suggested,
            "pending_offer": new_offer,
            "awaiting_offer_reply": bool(new_offer),
            "attempts_count": session["attempts_count"],
            "hints_used": session.get("hints_used", 0),
            "concepts_explored": session.get("concepts_explored", 0),
            "status": session["status"]
        }


# ── Global singleton ──────────────────────────────────────────────────────────

_hw_engine: Optional[HomeworkEngine] = None


def get_homework_engine() -> HomeworkEngine:
    global _hw_engine
    if _hw_engine is None:
        _hw_engine = HomeworkEngine()
    return _hw_engine
