"""
Homework Engine for GradeUp AI Tutor

Features:
- AI assigns homework based on student's weak areas
- Questions focused on textbook content for weak sections
- Progressive difficulty (slightly above student's current level)
- LLM-based answer evaluation with RAG grading
- Points awarded on completion
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
        self, subject: str, unit_number: int, section_titles: List[str]
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
            )
            if results:
                return "\n---\n".join(r.get("text", "")[:600] for r in results)
        except Exception as e:
            print(f"  ⚠️  [HomeworkEngine] RAG retrieval failed: {e}")
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
            resp = requests.post(
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
            print(f"  ⚠️  [HomeworkEngine] LLM generation failed: {e}")

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
            resp = requests.post(
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
            print(f"  ⚠️  [HomeworkEngine] LLM evaluation failed: {e}")

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
                    print(f"  ✅ [HomeworkEngine] Salvaged JSON up to char {end}/{len(cleaned)}")
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
        rag_context = self._get_rag_context_for_sections(subject, unit_number, section_titles)

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
            print(f"  ⚠️  [HomeworkEngine] Failed to log assignment: {e}")

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
            print(f"  ⚠️  [HomeworkEngine] Failed to update performance: {e}")

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


# ── Global singleton ──────────────────────────────────────────────────────────

_hw_engine: Optional[HomeworkEngine] = None


def get_homework_engine() -> HomeworkEngine:
    global _hw_engine
    if _hw_engine is None:
        _hw_engine = HomeworkEngine()
    return _hw_engine
