"""
Quiz Engine for GradeUp AI Tutor

Features:
- Generate quizzes by difficulty (easy/medium/hard) with mixed sections
- Priority-based section selection (weak sections get more questions)
- VectorDB caching: reuse quizzes for same parameters across students
- Re-attempt logic: no question repeats from previous attempts
- Scoring with section-wise breakdown and points
"""

import os
import json
import hashlib
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from datetime import datetime, timezone

import requests

QUIZ_DATA_DIR = Path("quiz_data")

# Points awarded per quiz based on difficulty
QUIZ_POINTS = {"easy": 50, "medium": 75, "hard": 100}


class QuizEngine:
    """
    Generates quizzes based on difficulty level, caches in VectorDB,
    and handles re-attempt logic to avoid question repetition.
    """

    def __init__(self, data_dir: Path = QUIZ_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    # ── Internal Helpers ──────────────────────────────────────────────────────

    def _quiz_cache_id(
        self, document_id: str, unit_number: int, difficulty: str, num_questions: int
    ) -> str:
        """Deterministic cache key for a quiz configuration."""
        key = f"{document_id}__unit{unit_number}__{difficulty}__{num_questions}"
        return hashlib.md5(key.encode()).hexdigest()[:16]

    def _quiz_path(self, quiz_id: str) -> Path:
        return self.data_dir / f"quiz__{quiz_id}.json"

    def _attempts_path(self, candidate_id: str, subject: str, unit_number: int) -> Path:
        safe_id = candidate_id.strip().lower().replace(" ", "_")
        safe_subj = subject.strip().lower().replace(" ", "_")
        return self.data_dir / f"attempts__{safe_id}__{safe_subj}__unit_{unit_number}.json"

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

    def _get_attempted_question_ids(
        self, candidate_id: str, subject: str, unit_number: int
    ) -> Set[str]:
        """Get all question IDs previously seen by this student for this unit."""
        path = self._attempts_path(candidate_id, subject, unit_number)
        data = self._load_json(path)
        if data:
            return set(data.get("attempted_question_ids", []))
        return set()

    def _record_attempt(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        quiz_id: str,
        question_ids: List[str],
        score: Optional[float] = None,
    ) -> int:
        """Record a quiz attempt and return the attempt number."""
        path = self._attempts_path(candidate_id, subject, unit_number)
        data = self._load_json(path) or {
            "candidate_id": candidate_id,
            "subject": subject,
            "unit_number": unit_number,
            "attempted_question_ids": [],
            "attempts": [],
        }

        # Add question IDs to the global set
        existing_ids = set(data.get("attempted_question_ids", []))
        existing_ids.update(question_ids)
        data["attempted_question_ids"] = list(existing_ids)

        # Record the attempt
        attempt_number = len(data.get("attempts", [])) + 1
        data.setdefault("attempts", []).append({
            "attempt_number": attempt_number,
            "quiz_id": quiz_id,
            "question_ids": question_ids,
            "score": score,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        self._save_json(path, data)
        return attempt_number

    def _update_attempt_score(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        quiz_id: str,
        score: float,
    ) -> None:
        """Update the score for a specific attempt."""
        path = self._attempts_path(candidate_id, subject, unit_number)
        data = self._load_json(path)
        if not data:
            return

        for attempt in data.get("attempts", []):
            if attempt.get("quiz_id") == quiz_id and attempt.get("score") is None:
                attempt["score"] = score
                break

        self._save_json(path, data)

    def _get_section_priorities(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        document_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Get section priorities based on student weaknesses.
        Weak sections get higher priority for quiz questions.
        Falls back to enriched.json sections if no performance data.
        """
        from student_performance import get_performance_tracker

        tracker = get_performance_tracker()
        weak_sections = tracker.get_weak_sections(candidate_id, subject, unit_number)

        if weak_sections:
            return weak_sections

        # Fallback: get all sections from enriched.json
        from config import OUTPUTS_DIR
        enriched_path = OUTPUTS_DIR / document_id / "enriched.json"
        if enriched_path.exists():
            try:
                import orjson
                enriched = orjson.loads(enriched_path.read_bytes())
                sections = []
                for unit in enriched.get("units", []):
                    if unit.get("unit_number") == unit_number:
                        for sec in unit.get("sections", []):
                            sections.append({
                                "section_title": sec.get("section_title", ""),
                                "weakness_score": 0.5,  # Neutral weight
                            })
                return sections
            except Exception:
                pass

        return [{"section_title": "general", "weakness_score": 0.5}]

    def _try_cache_lookup(
        self,
        document_id: str,
        unit_number: int,
        difficulty: str,
        num_questions: int,
        exclude_ids: Set[str],
    ) -> Optional[Dict[str, Any]]:
        """
        Check if a cached quiz exists in local storage.
        If all questions have been seen by the student, return None (force new generation).
        """
        cache_id = self._quiz_cache_id(document_id, unit_number, difficulty, num_questions)
        path = self._quiz_path(cache_id)
        cached = self._load_json(path)

        if not cached:
            return None

        # Filter out already-seen questions
        questions = cached.get("questions", [])
        fresh_questions = [q for q in questions if q.get("question_id") not in exclude_ids]

        if len(fresh_questions) >= num_questions:
            cached["questions"] = fresh_questions[:num_questions]
            cached["is_cached"] = True
            return cached

        # Not enough fresh questions — need new generation
        return None

    def _store_quiz_cache(
        self,
        quiz_id: str,
        document_id: str,
        unit_number: int,
        difficulty: str,
        questions: List[Dict[str, Any]],
        subject: str,
        unit_title: str = "",
        candidate_name: str = "",
    ) -> None:
        """Store generated quiz in local cache."""
        quiz_data = {
            "quiz_id": quiz_id,
            "document_id": document_id,
            "unit_number": unit_number,
            "unit_title": unit_title,
            "candidate_name": candidate_name,
            "difficulty": difficulty,
            "subject": subject,
            "questions": questions,
            "total_questions": len(questions),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_cached": False,
        }
        path = self._quiz_path(quiz_id)
        self._save_json(path, quiz_data)

    def _generate_questions_with_llm(
        self,
        difficulty: str,
        num_questions: int,
        sections: List[Dict[str, Any]],
        subject: str,
        unit_number: int,
        document_id: str,
        exclude_ids: Set[str],
    ) -> List[Dict[str, Any]]:
        """
        Generate quiz questions using LLM + RAG.
        Mixes questions across sections based on priority weights.
        """
        api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return self._fallback_from_enriched(
                document_id, unit_number, difficulty, num_questions, exclude_ids
            )

        # Get RAG context from textbook
        rag_context = self._get_rag_context(subject, unit_number, sections)

        # Build sections + weights for the prompt
        section_info = ""
        for sec in sections[:10]:  # Limit scope
            title = sec.get("section_title", "general")
            weight = sec.get("weakness_score", 0.5)
            section_info += f"  - {title} (priority: {'HIGH' if weight > 0.6 else 'MEDIUM' if weight > 0.3 else 'LOW'})\n"

        difficulty_guidance = {
            "easy": "Focus on recall, definitions, basic concepts. MCQ or fill-in-the-blank style.",
            "medium": "Focus on understanding and application. Short answer questions that require explanation.",
            "hard": "Focus on analysis, evaluation, and synthesis. Questions requiring critical thinking and connecting multiple concepts.",
        }

        prompt = f"""You are an expert quiz master for educational assessment.
Generate exactly {num_questions} quiz questions for the following:

Subject: {subject}
Unit: {unit_number}
Difficulty: {difficulty.upper()}
Guidance: {difficulty_guidance.get(difficulty, '')}

Topic sections (prioritize HIGH priority topics):
{section_info}

Textbook context:
{rag_context[:3000]}

Generate a JSON array of questions. Mix EXACTLY these question types: "mcq", "one_word", and "fill_in_the_blanks".
For MCQ questions, always include 4 options and mark the correct one.
For fill-in-the-blanks, use a blank line like "_________" in the question text.

Format:
[
  {{
    "question": "What is the purpose of map projections?",
    "type": "mcq",
    "options": ["To distort the Earth", "To transfer spherical surface to flat plane", "To draw circles", "To measure area"],
    "correct_answer": "To transfer spherical surface to flat plane",
    "section_title": "MAP PROJECTION",
    "explanation": "Map projection transfers the graticule from the curved globe surface onto a flat plane.",
    "difficulty": "{difficulty}"
  }},
  {{
    "question": "Distortion is _________ in map projections because the Earth is a sphere.",
    "type": "fill_in_the_blanks",
    "correct_answer": "inevitable",
    "section_title": "NEED FOR MAP PROJECTION",
    "explanation": "A sphere cannot be unfolded without deformation.",
    "difficulty": "{difficulty}"
  }},
  {{
    "question": "What is the shape of the Earth?",
    "type": "one_word",
    "correct_answer": "Sphere",
    "section_title": "INTRODUCTION",
    "explanation": "The Earth is roughly a sphere.",
    "difficulty": "{difficulty}"
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

                # Add question IDs
                for q in questions:
                    q_id = hashlib.md5(q.get("question", "").encode()).hexdigest()[:12]
                    q["question_id"] = q_id

                # Filter out previously seen questions
                fresh = [q for q in questions if q["question_id"] not in exclude_ids]
                return fresh[:num_questions]
        except Exception as e:
            print(f"  ⚠️  [QuizEngine] LLM generation failed: {e}")

        # Fallback to enriched.json
        return self._fallback_from_enriched(
            document_id, unit_number, difficulty, num_questions, exclude_ids
        )

    def _get_rag_context(
        self, subject: str, unit_number: int, sections: List[Dict[str, Any]]
    ) -> str:
        """Retrieve textbook context from Qdrant for quiz generation."""
        try:
            from qdrant_integration import search_qdrant

            # Search for the top-priority section topics
            queries = [s.get("section_title", "") for s in sections[:5] if s.get("section_title")]
            combined_query = " ".join(queries) if queries else subject

            results = search_qdrant(
                query=combined_query,
                limit=5,
                unit_filter=unit_number,
                subject_filter=subject,
            )
            if results:
                return "\n---\n".join(r.get("text", "")[:600] for r in results)
        except Exception as e:
            print(f"  ⚠️  [QuizEngine] RAG context retrieval failed: {e}")
        return ""

    def _fallback_from_enriched(
        self,
        document_id: str,
        unit_number: int,
        difficulty: str,
        num_questions: int,
        exclude_ids: Set[str],
    ) -> List[Dict[str, Any]]:
        """
        Fallback: pull practice questions from enriched.json and map to difficulty.
        """
        from config import OUTPUTS_DIR
        enriched_path = OUTPUTS_DIR / document_id / "enriched.json"

        if not enriched_path.exists():
            return []

        try:
            import orjson
            enriched = orjson.loads(enriched_path.read_bytes())
        except Exception:
            return []

        questions = []
        for unit in enriched.get("units", []):
            if unit.get("unit_number") != unit_number:
                continue

            for sec in unit.get("sections", []):
                section_title = sec.get("section_title", "")
                enrichment = sec.get("enrichment", {})

                # Pull FAQs as quiz questions (easier difficulty)
                if difficulty in ("easy", "medium"):
                    for faq in enrichment.get("faqs", []):
                        q_id = hashlib.md5(faq.get("question", "").encode()).hexdigest()[:12]
                        if q_id not in exclude_ids:
                            questions.append({
                                "question_id": q_id,
                                "question": faq.get("question", ""),
                                "type": "short_answer",
                                "correct_answer": faq.get("answer", ""),
                                "section_title": section_title,
                                "explanation": faq.get("answer", ""),
                                "difficulty": difficulty,
                            })

                # Pull practice questions (medium/hard difficulty)
                if difficulty in ("medium", "hard"):
                    for pq in enrichment.get("practice_questions", []):
                        q_id = hashlib.md5(pq.get("question", "").encode()).hexdigest()[:12]
                        if q_id not in exclude_ids:
                            questions.append({
                                "question_id": q_id,
                                "question": pq.get("question", ""),
                                "type": "long_answer",
                                "correct_answer": "",
                                "section_title": section_title,
                                "explanation": "",
                                "difficulty": difficulty,
                            })

        # Limit to requested number
        return questions[:num_questions]

    # ── Public API ────────────────────────────────────────────────────────────

    def generate_quiz(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        document_id: str,
        difficulty: str = "easy",
        num_questions: int = 5,
        unit_title: str = "",
        candidate_name: str = "",
    ) -> Dict[str, Any]:
        """
        Generate a quiz for a student.

        1. Check VectorDB/cache for existing quiz with same params
        2. If cached and student hasn't seen all questions → serve from cache
        3. Otherwise, generate new questions via LLM + RAG
        4. Track student's attempted question IDs for re-attempt logic
        """
        difficulty = difficulty.lower()
        if difficulty not in ("easy", "medium", "hard"):
            difficulty = "easy"

        # Get previously attempted question IDs
        exclude_ids = self._get_attempted_question_ids(candidate_id, subject, unit_number)

        # Try cache lookup
        cached_quiz = self._try_cache_lookup(
            document_id, unit_number, difficulty, num_questions, exclude_ids
        )

        if cached_quiz:
            quiz_id = cached_quiz["quiz_id"]
            questions = cached_quiz["questions"][:num_questions]
            is_cached = True
        else:
            # Get section priorities for question distribution
            sections = self._get_section_priorities(
                candidate_id, subject, unit_number, document_id
            )

            # Generate new questions
            questions = self._generate_questions_with_llm(
                difficulty=difficulty,
                num_questions=num_questions,
                sections=sections,
                subject=subject,
                unit_number=unit_number,
                document_id=document_id,
                exclude_ids=exclude_ids,
            )

            # Create quiz ID and cache
            quiz_id = hashlib.md5(
                f"{document_id}_{unit_number}_{difficulty}_{num_questions}_{datetime.now().isoformat()}_{candidate_id}".encode()
            ).hexdigest()[:16]

            self._store_quiz_cache(
                quiz_id, document_id, unit_number, difficulty, questions, subject, 
                unit_title=unit_title, candidate_name=candidate_name
            )

            # Also cache with the standard cache ID for other students
            cache_id = self._quiz_cache_id(document_id, unit_number, difficulty, num_questions)
            cache_path = self._quiz_path(cache_id)
            if cache_path.exists():
                existing_cache = self._load_json(cache_path)
                if existing_cache:
                    existing_q_ids = {q.get("question_id") for q in existing_cache.get("questions", [])}
                    new_unique = [q for q in questions if q.get("question_id") not in existing_q_ids]
                    if new_unique:
                        existing_cache.setdefault("questions", []).extend(new_unique)
                        existing_cache["total_questions"] = len(existing_cache["questions"])
                        self._save_json(cache_path, existing_cache)
            else:
                self._store_quiz_cache(
                    cache_id, document_id, unit_number, difficulty, questions, subject, 
                    unit_title=unit_title, candidate_name=candidate_name
                )

            is_cached = False

        # Record the attempt
        question_ids = [q.get("question_id", "") for q in questions]
        attempt_number = self._record_attempt(
            candidate_id, subject, unit_number, quiz_id, question_ids
        )

        # Build response (hide correct answers from student)
        student_questions = []
        for q in questions:
            sq = {
                "question_id": q.get("question_id"),
                "question": q.get("question"),
                "type": q.get("type"),
                "section_title": q.get("section_title"),
                "difficulty": q.get("difficulty", difficulty),
            }
            if q.get("options"):
                sq["options"] = q["options"]
            student_questions.append(sq)

        return {
            "quiz_id": quiz_id,
            "document_id": document_id,
            "subject": subject,
            "unit_number": unit_number,
            "difficulty": difficulty,
            "total_questions": len(student_questions),
            "questions": student_questions,
            "is_cached": is_cached,
            "attempt_number": attempt_number,
            "max_points": QUIZ_POINTS.get(difficulty, 50),
        }

    def submit_quiz(
        self,
        quiz_id: str,
        candidate_id: str,
        answers: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Score a submitted quiz.

        Args:
            answers: [{"question_id": "abc123", "answer": "..."}]

        Returns:
            Score breakdown with corrections and points earned.
        """
        # Load the quiz
        quiz_path = self._quiz_path(quiz_id)
        quiz_data = self._load_json(quiz_path)

        if not quiz_data:
            return {"error": "Quiz not found", "success": False}

        questions = quiz_data.get("questions", [])
        difficulty = quiz_data.get("difficulty", "easy")
        subject = quiz_data.get("subject", "")
        unit_number = quiz_data.get("unit_number", 0)

        # Build answer lookup
        answer_map = {a["question_id"]: a["answer"] for a in answers if "question_id" in a}

        # Score each question
        correct_count = 0
        total = len(questions)
        corrections = []
        section_scores_raw: Dict[str, List[float]] = {}

        for q in questions:
            q_id = q.get("question_id", "")
            student_answer = answer_map.get(q_id, "")
            correct_answer = q.get("correct_answer", "")
            section = q.get("section_title", "general")

            section_scores_raw.setdefault(section, [])

            # Scoring logic
            is_correct = False
            if q.get("type") == "mcq":
                # MCQ: exact match (case-insensitive)
                is_correct = student_answer.strip().lower() == correct_answer.strip().lower()
            elif student_answer and correct_answer:
                # Short/long answer: check if key concepts are present
                is_correct = self._evaluate_answer(student_answer, correct_answer)
            elif student_answer:
                # No correct answer stored (e.g., from practice questions) → give partial credit
                is_correct = len(student_answer.strip()) > 20  # Minimum effort check

            score = 100.0 if is_correct else 0.0
            section_scores_raw[section].append(score)

            if is_correct:
                correct_count += 1

            corrections.append({
                "question_id": q_id,
                "question": q.get("question", ""),
                "student_answer": student_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "explanation": q.get("explanation", ""),
            })

        # Calculate scores
        percentage = round((correct_count / total * 100) if total > 0 else 0, 2)
        max_points = QUIZ_POINTS.get(difficulty, 50)
        points_earned = round(percentage / 100 * max_points)

        # Section-wise scores
        section_scores = {}
        for section, scores in section_scores_raw.items():
            section_scores[section] = round(sum(scores) / len(scores), 2) if scores else 0

        # Update attempt with score
        self._update_attempt_score(candidate_id, subject, unit_number, quiz_id, percentage)

        # Update student performance
        try:
            from student_performance import get_performance_tracker
            tracker = get_performance_tracker()
            tracker.record_quiz_score(
                candidate_id=candidate_id,
                subject=subject,
                unit_number=unit_number,
                section_scores=section_scores,
                total_score=percentage,
                points=points_earned,
                unit_title=quiz_data.get("unit_title", ""),
                candidate_name=quiz_data.get("candidate_name", ""),
            )

            # Log quiz attempt in unified interaction_history
            data = tracker._load(candidate_id)
            data.setdefault("interaction_history", []).append({
                "type": "quiz_attempt",
                "subject": subject,
                "unit_number": unit_number,
                "unit_title": quiz_data.get("unit_title", ""),
                "quiz_id": quiz_id,
                "score": percentage,
                "points_earned": points_earned,
                "sections": list(section_scores.keys()),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            if len(data["interaction_history"]) > 200:
                data["interaction_history"] = data["interaction_history"][-200:]
            tracker._save(candidate_id, data)
        except Exception as e:
            print(f"  ⚠️  [QuizEngine] Failed to update performance: {e}")

        return {
            "success": True,
            "quiz_id": quiz_id,
            "score": correct_count,
            "total": total,
            "percentage": percentage,
            "section_scores": section_scores,
            "points_earned": points_earned,
            "max_points": max_points,
            "corrections": corrections,
        }

    def _evaluate_answer(self, student_answer: str, correct_answer: str) -> bool:
        """Simple keyword-based answer evaluation for non-MCQ questions."""
        student_lower = student_answer.strip().lower()
        correct_lower = correct_answer.strip().lower()

        if not correct_lower:
            return len(student_lower) > 20

        # Check if key words from correct answer appear in student's answer
        correct_words = set(correct_lower.split())
        # Remove common stop words
        stop_words = {"the", "a", "an", "is", "are", "was", "were", "be", "been",
                      "being", "have", "has", "had", "do", "does", "did", "will",
                      "shall", "should", "may", "might", "must", "can", "could",
                      "of", "in", "to", "for", "with", "on", "at", "by", "from",
                      "it", "its", "this", "that", "and", "or", "but", "not"}
        key_words = correct_words - stop_words
        if not key_words:
            key_words = correct_words

        # Count matching key words
        matches = sum(1 for w in key_words if w in student_lower)
        match_ratio = matches / len(key_words) if key_words else 0

        return match_ratio >= 0.4  # At least 40% keyword match

    def get_quiz_history(
        self,
        candidate_id: str,
        subject: Optional[str] = None,
        unit_number: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Get quiz attempt history for a student."""
        pattern = f"attempts__{candidate_id.strip().lower().replace(' ', '_')}__"

        if subject:
            pattern += f"{subject.strip().lower().replace(' ', '_')}__"
            if unit_number is not None:
                pattern += f"unit_{unit_number}.json"
            else:
                pattern += "*.json"
        else:
            pattern += "*.json"

        history = []
        for path in sorted(self.data_dir.glob(pattern)):
            data = self._load_json(path)
            if data:
                for attempt in data.get("attempts", []):
                    history.append({
                        "subject": data.get("subject", ""),
                        "unit_number": data.get("unit_number"),
                        "quiz_id": attempt.get("quiz_id"),
                        "attempt_number": attempt.get("attempt_number"),
                        "score": attempt.get("score"),
                        "question_count": len(attempt.get("question_ids", [])),
                        "timestamp": attempt.get("timestamp"),
                    })

        # Sort by timestamp descending (newest first)
        history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return history


# ── Global singleton ──────────────────────────────────────────────────────────

_quiz_engine: Optional[QuizEngine] = None


def get_quiz_engine() -> QuizEngine:
    global _quiz_engine
    if _quiz_engine is None:
        _quiz_engine = QuizEngine()
    return _quiz_engine
