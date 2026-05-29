"""
English Level Assessment Test Engine for GradeUp AI

Features:
- 4 levels: basic, intermediate, super_intermediate, advanced
- 15 written questions per test: Listening (5), Writing (3), Grammar (7)
- Speaking assessed separately via live AI conversation (25 marks)
- JSON caching with 15-day auto-refresh
- 80% pass threshold to advance to next level
- AI-recommended starting level based on diagnostic performance
- Per-student test history with category-wise scoring

Storage: english_test_data/ directory
  - questions_{level}.json      — cached questions (shared across students)
  - results_{candidate_id}.json — per-student test history
"""

import os
import json
import hashlib
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone, timedelta

import requests

# ── Constants ─────────────────────────────────────────────────────────────────

ENGLISH_TEST_DATA_DIR = Path("english_test_data")
QUESTION_REFRESH_DAYS = 15
PASS_THRESHOLD = 80  # percentage
TEST_MODEL = "gpt-4o-mini"
TEST_FALLBACK_MODEL = "gpt-4o"
TEST_TIMEOUT = 120

LEVELS = ["basic", "intermediate", "super_intermediate", "advanced"]
LEVEL_ORDER = {level: idx for idx, level in enumerate(LEVELS)}

# Written test categories (pre-generated questions)
WRITTEN_CATEGORY_CONFIG = {
    "grammar": {"count": 7, "marks_each": 2 + 6/7, "total": 20},  # ~2.86 each
    "listening": {"count": 5, "marks_each": 5, "total": 25},
    "writing": {"count": 3, "marks_each": 10, "total": 30},
}
WRITTEN_MARKS = 75  # Grammar(20) + Listening(25) + Writing(30)

# Speaking assessment (live AI conversation — NOT pre-generated)
SPEAKING_MARKS = 25
SPEAKING_MIN_TURNS = 5   # Minimum AI-student exchanges
SPEAKING_MAX_TURNS = 10  # Maximum exchanges before scoring

# Combined
CATEGORY_CONFIG = {
    "grammar": {"count": 7, "marks_each": 2 + 6/7, "total": 20},
    "listening": {"count": 5, "marks_each": 5, "total": 25},
    "writing": {"count": 3, "marks_each": 10, "total": 30},
    "speaking": {"count": 0, "marks_each": 0, "total": 25},  # Live assessment
}
TOTAL_MARKS = 100  # 75 written + 25 speaking


# ── Level Descriptions (used in LLM prompts) ─────────────────────────────────

LEVEL_DESCRIPTIONS = {
    "basic": {
        "name": "Basic",
        "cefr": "A1-A2",
        "description": "Beginner level. Student knows basic words, simple sentences, "
                       "present tense, common greetings. Limited vocabulary.",
        "speaking_guidance": "Simple self-introduction, describing objects, daily routine. "
                            "Use present tense only. Short 2-3 sentence responses expected.",
        "listening_guidance": "Very simple passages (50-80 words). Clear, slow language. "
                             "Questions about who/what/where. Fill-in-the-blank with common words.",
        "writing_guidance": "Write 3-5 sentences on familiar topics. Simple paragraph. "
                           "Describe a picture or a daily activity.",
        "grammar_guidance": "Nouns, pronouns, simple present/past/future tense, articles (a/an/the), "
                           "prepositions (in/on/at), basic sentence structure (SVO), plural forms.",
    },
    "intermediate": {
        "name": "Intermediate",
        "cefr": "B1",
        "description": "Student can form compound sentences, use multiple tenses, "
                       "express opinions, understand moderately complex texts.",
        "speaking_guidance": "Express opinions on familiar topics, describe experiences, "
                            "narrate a short story. 5-8 sentence responses expected.",
        "listening_guidance": "Moderate passages (100-150 words). Standard pace. "
                             "Inference questions, identifying main idea, author's purpose.",
        "writing_guidance": "Write a short letter (formal/informal), a diary entry, "
                           "or a paragraph expressing an opinion with reasons.",
        "grammar_guidance": "Continuous and perfect tenses, active/passive voice, "
                           "direct/indirect speech, conjunctions, subject-verb agreement, "
                           "comparative and superlative forms.",
    },
    "super_intermediate": {
        "name": "Super Intermediate",
        "cefr": "B2",
        "description": "Student can handle complex sentences, understand nuance, "
                       "write structured essays, debate topics with reasoning.",
        "speaking_guidance": "Present arguments for/against a topic, describe complex processes, "
                            "give a short presentation outline. Detailed responses expected.",
        "listening_guidance": "Complex passages (150-200 words). Natural pace with some idioms. "
                             "Questions on tone, implied meaning, speaker's attitude.",
        "writing_guidance": "Write an argumentative or descriptive essay (150-200 words), "
                           "a formal report summary, or a creative narrative paragraph.",
        "grammar_guidance": "Complex/compound sentences, conditional sentences (types 0-3), "
                           "modals, phrasal verbs, gerunds/infinitives, relative clauses, "
                           "participle clauses.",
    },
    "advanced": {
        "name": "Advanced",
        "cefr": "C1-C2",
        "description": "Near-native proficiency. Student understands subtle grammar, "
                       "writes academic-quality text, analyzes literature.",
        "speaking_guidance": "Deliver a structured argument on abstract topics, analyze a quote, "
                            "discuss literary themes. Nuanced, well-organized responses expected.",
        "listening_guidance": "Academic/literary passages (200-250 words). Fast natural pace. "
                             "Questions on rhetorical devices, bias, critical analysis.",
        "writing_guidance": "Write an academic review, a critical analysis paragraph, "
                           "or a creative piece (short story opening or poem interpretation).",
        "grammar_guidance": "Subjunctive mood, inversion, cleft sentences, advanced tense usage, "
                           "sentence transformation, formal register, collocations, "
                           "ellipsis, substitution.",
    },
}


class EnglishTestEngine:
    """
    Manages English level assessment tests with JSON caching,
    auto-refresh, LLM-based scoring, and level recommendation.
    """

    def __init__(self, data_dir: Path = ENGLISH_TEST_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    # ── Path Helpers ──────────────────────────────────────────────────────────

    def _questions_path(self, level: str) -> Path:
        return self.data_dir / f"questions_{level}.json"

    def _results_path(self, candidate_id: str) -> Path:
        safe_id = candidate_id.strip().lower().replace(" ", "_")
        return self.data_dir / f"results_{safe_id}.json"

    def _load_json(self, path: Path) -> Optional[Dict[str, Any]]:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return None

    def _save_json(self, path: Path, data: Dict[str, Any]) -> None:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    # ── LLM Helpers ───────────────────────────────────────────────────────────

    def _call_llm(self, messages: List[Dict], temperature: float = 0.9) -> str:
        """Call OpenAI LLM."""
        api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return ""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": TEST_MODEL,
            "messages": messages,
            "max_completion_tokens": 4096,
            "temperature": temperature,
        }

        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers, json=payload, timeout=TEST_TIMEOUT,
            )
            if not resp.ok:
                payload["model"] = TEST_FALLBACK_MODEL
                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers, json=payload, timeout=TEST_TIMEOUT,
                )
            if resp.ok:
                return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"  ❌ [EnglishTestEngine] LLM error: {e}")
        return ""

    def _parse_json_from_llm(self, raw: str) -> Optional[Any]:
        """Parse JSON from LLM output, handling markdown fences."""
        cleaned = re.sub(r'^```[a-z]*\n?', '', raw.strip())
        cleaned = re.sub(r'\n?```$', '', cleaned).strip()
        try:
            return json.loads(cleaned)
        except Exception:
            pass
        # Salvage: find largest valid JSON
        for end in range(len(cleaned), 0, -1):
            if cleaned[end - 1] in ('}', ']'):
                try:
                    return json.loads(cleaned[:end])
                except Exception:
                    continue
        return None

    # ── Question Generation ───────────────────────────────────────────────────

    def _is_stale(self, questions_data: Dict[str, Any]) -> bool:
        """Check if cached questions are older than QUESTION_REFRESH_DAYS."""
        generated_at = questions_data.get("generated_at")
        if not generated_at:
            return True
        try:
            gen_dt = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
            age = datetime.now(timezone.utc) - gen_dt
            return age.days >= QUESTION_REFRESH_DAYS
        except Exception:
            return True

    def _generate_questions_for_level(self, level: str) -> Dict[str, Any]:
        """Generate written test questions for a level (Grammar, Listening, Writing only).
        Speaking is assessed separately via live AI conversation."""
        level_info = LEVEL_DESCRIPTIONS.get(level, LEVEL_DESCRIPTIONS["basic"])

        prompt = f"""You are an expert English language test designer. Generate written test questions for **{level_info['name']} level** ({level_info['cefr']}).

Student Profile: {level_info['description']}

Generate questions in these 3 categories ONLY. There is NO speaking section — speaking is assessed separately via live conversation.
Return ONLY a valid JSON object.

## CATEGORIES (Order: Grammar → Listening → Writing)

### 1. GRAMMAR (7 questions, ~3 marks each ≈ 20 marks)
{level_info['grammar_guidance']}
- Mix: 3 MCQs (with 4 options each), 2 fill-in-the-blanks, 2 error correction/sentence transformation
- Include correct_answer for each

### 2. LISTENING (5 questions, 5 marks each = 25 marks)
{level_info['listening_guidance']}
- Provide a short PASSAGE (the "listening" text) and then questions about it
- Mix: 2 comprehension MCQs, 2 fill-in-the-blanks, 1 short answer
- Include the passage text in a "passage" field

### 3. WRITING (3 questions, 10 marks each = 30 marks)
{level_info['writing_guidance']}
- Questions should test: organization, grammar accuracy, vocabulary, coherence, task completion
- Include word count expectations and clear rubric

## OUTPUT FORMAT (JSON) — NO SPEAKING SECTION
{{
  "grammar": [
    {{
      "question_id": "gr_001",
      "question": "...",
      "type": "mcq|fill_in_the_blank|error_correction",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "...",
      "marks": 3
    }}
  ],
  "listening": [
    {{
      "passage": "The morning sun rose over the quiet village...",
      "question_id": "ls_001",
      "question": "...",
      "type": "mcq|fill_in_the_blank|short_answer",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "...",
      "marks": 5
    }}
  ],
  "writing": [
    {{
      "question_id": "wr_001",
      "question": "...",
      "type": "writing",
      "marks": 10,
      "word_limit": "50-80 words",
      "rubric": "..."
    }}
  ]
}}

Return ONLY valid JSON. No markdown fences, no commentary. Do NOT include a speaking section."""

        raw = self._call_llm([{"role": "user", "content": prompt}])
        questions = self._parse_json_from_llm(raw)

        if not questions:
            print(f"  ❌ [EnglishTestEngine] Failed to generate questions for {level}")
            return self._fallback_questions(level)

        # Safety: strip speaking if LLM included it despite instructions
        questions.pop("speaking", None)

        return questions

    def _fallback_questions(self, level: str) -> Dict[str, Any]:
        """Minimal fallback questions when LLM fails (no speaking — that's live)."""
        return {
            "grammar": [
                {
                    "question_id": f"gr_{i:03d}",
                    "question": f"Fill in the blank: She ___ to school every day.",
                    "type": "fill_in_the_blank",
                    "correct_answer": "goes",
                    "marks": 3,
                }
                for i in range(1, 8)
            ],
            "listening": [
                {
                    "passage": "The sun rises in the east and sets in the west. "
                               "Birds sing in the morning. People go to work.",
                    "question_id": f"ls_{i:03d}",
                    "question": f"Question {i} about the passage above.",
                    "type": "short_answer",
                    "correct_answer": "",
                    "marks": 5,
                }
                for i in range(1, 6)
            ],
            "writing": [
                {
                    "question_id": f"wr_{i:03d}",
                    "question": f"Write a short paragraph about your favorite hobby.",
                    "type": "writing",
                    "marks": 10,
                    "word_limit": "50-100 words",
                    "rubric": "Content, grammar, vocabulary, organization",
                }
                for i in range(1, 4)
            ],
        }

    # ── Public API ────────────────────────────────────────────────────────────

    def cleanup_stale_questions(self) -> List[str]:
        """
        Explicitly delete question files that are older than QUESTION_REFRESH_DAYS (15 days).
        Returns list of deleted file names.
        """
        deleted = []
        for level in LEVELS:
            path = self._questions_path(level)
            cached = self._load_json(path)
            if cached and self._is_stale(cached):
                try:
                    path.unlink()
                    deleted.append(path.name)
                    print(f"  [EnglishTestEngine] Deleted stale questions: {path.name}")
                except OSError as e:
                    print(f"  [EnglishTestEngine] Failed to delete {path.name}: {e}")
        return deleted

    def get_or_generate_test(self, level: str) -> Dict[str, Any]:
        """
        Get test questions for a level. Uses cached version if fresh,
        otherwise generates new questions and caches them.

        Returns:
            {
                "level": "basic",
                "questions": { "speaking": [...], "listening": [...], ... },
                "total_marks": 100,
                "generated_at": "...",
                "is_cached": true/false
            }
        """
        level = level.strip().lower()
        if level not in LEVELS:
            return {"error": f"Invalid level. Must be one of: {LEVELS}"}

        path = self._questions_path(level)
        cached = self._load_json(path)

        # Auto-delete stale file before checking
        if cached and self._is_stale(cached):
            try:
                path.unlink()
                print(f"  [EnglishTestEngine] Auto-deleted stale questions: {path.name}")
            except OSError:
                pass
            cached = None  # Force regeneration

        if cached:
            # Serve cached written questions (fresh, <15 days old)
            # _strip_answers also filters out any speaking questions from old caches
            student_questions = self._strip_answers(cached.get("questions", {}))
            return {
                "level": level,
                "level_name": LEVEL_DESCRIPTIONS[level]["name"],
                "questions": student_questions,
                "question_count": sum(len(qs) for qs in student_questions.values()),
                "written_marks": WRITTEN_MARKS,
                "speaking_marks": SPEAKING_MARKS,
                "total_marks": TOTAL_MARKS,
                "test_order": ["grammar", "listening", "writing"],
                "speaking_info": {
                    "note": "Speaking is assessed LAST via a live AI conversation. Complete the written sections first, then start the speaking assessment.",
                    "endpoint": "/english/test/speaking/start",
                    "marks": SPEAKING_MARKS,
                },
                "generated_at": cached.get("generated_at"),
                "expires_at": cached.get("expires_at"),
                "is_cached": True,
            }

        # Generate fresh questions (grammar, listening, writing only)
        print(f"  [EnglishTestEngine] Generating fresh questions for level: {level}")
        questions = self._generate_questions_for_level(level)

        now = datetime.now(timezone.utc)
        cache_data = {
            "level": level,
            "generated_at": now.isoformat(),
            "expires_at": (now + timedelta(days=QUESTION_REFRESH_DAYS)).isoformat(),
            "questions": questions,
            "total_marks": TOTAL_MARKS,
        }
        self._save_json(path, cache_data)

        student_questions = self._strip_answers(questions)
        return {
            "level": level,
            "level_name": LEVEL_DESCRIPTIONS[level]["name"],
            "questions": student_questions,
            "question_count": sum(len(qs) for qs in student_questions.values()),
            "written_marks": WRITTEN_MARKS,
            "speaking_marks": SPEAKING_MARKS,
            "total_marks": TOTAL_MARKS,
            "test_order": ["grammar", "listening", "writing"],
            "speaking_info": {
                "note": "Speaking is assessed LAST via a live AI conversation. Complete the written sections first, then start the speaking assessment.",
                "endpoint": "/english/test/speaking/start",
                "marks": SPEAKING_MARKS,
            },
            "generated_at": cache_data["generated_at"],
            "expires_at": cache_data["expires_at"],
            "is_cached": False,
        }

    def _strip_answers(self, questions: Dict[str, List]) -> Dict[str, List]:
        """Remove correct_answer from questions for student view.
        Also excludes the 'speaking' category — speaking is assessed live via AI conversation,
        NOT via pre-generated questions."""
        # Written-only categories (speaking is live, never pre-generated)
        written_categories = {"grammar", "listening", "writing"}
        stripped = {}
        for category, q_list in questions.items():
            if category not in written_categories:
                continue  # Skip speaking or any unexpected categories
            stripped[category] = []
            for q in q_list:
                sq = {k: v for k, v in q.items() if k != "correct_answer"}
                stripped[category].append(sq)
        return stripped

    def submit_test(
        self,
        candidate_id: str,
        candidate_name: str,
        level: str,
        answers: List[Dict[str, str]],
        speaking_score: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Score a submitted written test using LLM evaluation.
        Saves written scores immediately. Final total score, percentage, pass/fail,
        and recommended level are only calculated AFTER speaking is also completed.

        Args:
            answers: [{"question_id": "gr_001", "answer": "..."}, ...]
            speaking_score: Optional score from speaking assessment (if already done)

        Returns:
            Written score breakdown. Final scores only if speaking is also complete.
        """
        level = level.strip().lower()
        if level not in LEVELS:
            return {"error": f"Invalid level: {level}", "success": False}

        # Load the cached questions (with correct answers)
        path = self._questions_path(level)
        cached = self._load_json(path)
        if not cached:
            return {"error": "No test found for this level. Generate a test first.", "success": False}

        questions = cached.get("questions", {})
        answer_map = {a["question_id"]: a.get("answer", "") for a in answers if "question_id" in a}

        # Evaluate written sections with LLM
        evaluation = self._evaluate_test_with_llm(level, questions, answer_map)

        # Calculate written scores
        category_scores = evaluation.get("category_scores", {})
        written_total = sum(category_scores.values())
        written_percentage = round(written_total / WRITTEN_MARKS * 100, 2) if WRITTEN_MARKS > 0 else 0

        # Check if speaking was already completed before written submission
        sp_score = 0
        sp_feedback = ""
        speaking_completed = False
        if speaking_score and isinstance(speaking_score, dict):
            sp_score = speaking_score.get("score", 0)
            sp_feedback = speaking_score.get("feedback", "")
            speaking_completed = True

        if not speaking_completed:
            sp_path = self._speaking_path(candidate_id, level)
            sp_data = self._load_json(sp_path)
            if sp_data and sp_data.get("status") == "scored":
                sp_score = sp_data.get("score", {}).get("total_score", 0)
                sp_feedback = sp_data.get("score", {}).get("overall_feedback", "")
                speaking_completed = True

        # Build result data — final scores only when ALL sections are complete
        test_id = hashlib.md5(
            f"{candidate_id}_{level}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]

        result_data = {
            "test_id": test_id,
            "candidate_id": candidate_id,
            "candidate_name": candidate_name,
            "level": level,
            "level_name": LEVEL_DESCRIPTIONS[level]["name"],
            "written_score": round(written_total, 2),
            "written_marks": WRITTEN_MARKS,
            "written_percentage": written_percentage,
            "speaking_marks": SPEAKING_MARKS,
            "total_marks": TOTAL_MARKS,
            "pass_threshold": PASS_THRESHOLD,
            "category_scores": {
                cat: {
                    "score": round(category_scores.get(cat, 0), 2),
                    "total": CATEGORY_CONFIG[cat]["total"],
                    "percentage": round(
                        category_scores.get(cat, 0) / CATEGORY_CONFIG[cat]["total"] * 100, 2
                    ) if CATEGORY_CONFIG[cat]["total"] > 0 else 0,
                }
                for cat in ["grammar", "listening", "writing"]
            },
            "feedback": evaluation.get("feedback", {}),
            "strengths": evaluation.get("strengths", []),
            "weaknesses": evaluation.get("weaknesses", []),
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        }

        if speaking_completed:
            # Both sections done — calculate final scores
            result_data["status"] = "completed"
            result_data["speaking_completed"] = True
            result_data["speaking_score"] = round(sp_score, 2)
            result_data["speaking_assessment"] = {
                "score": round(sp_score, 2),
                "total": SPEAKING_MARKS,
                "percentage": round(sp_score / SPEAKING_MARKS * 100, 2) if SPEAKING_MARKS > 0 else 0,
                "completed": True,
                "feedback": sp_feedback,
            }
            total_score = written_total + sp_score
            percentage = round(total_score / TOTAL_MARKS * 100, 2) if TOTAL_MARKS > 0 else 0
            passed = percentage >= PASS_THRESHOLD
            recommended_level = self._calculate_recommended_level(level, percentage, category_scores)

            result_data["total_score"] = round(total_score, 2)
            result_data["percentage"] = percentage
            result_data["passed"] = passed
            result_data["recommended_level"] = recommended_level
        else:
            # Speaking not done yet — save written only, defer final scoring
            result_data["status"] = "pending_speaking"
            result_data["speaking_completed"] = False
            result_data["speaking_score"] = 0
            result_data["speaking_assessment"] = {
                "score": 0,
                "total": SPEAKING_MARKS,
                "percentage": 0,
                "completed": False,
                "feedback": "Speaking assessment not yet completed. Complete speaking to get your final score.",
            }
            # Do NOT set total_score, percentage, passed, recommended_level
            # These will be calculated when speaking is completed
            result_data["total_score"] = None
            result_data["percentage"] = None
            result_data["passed"] = None
            result_data["recommended_level"] = None
            result_data["note"] = (
                f"Written section scored: {round(written_total, 2)}/{WRITTEN_MARKS} "
                f"({written_percentage}%). Complete the speaking assessment at "
                f"/english/test/speaking/start to get your final score and level recommendation."
            )

        # Append to student's result history
        results_path = self._results_path(candidate_id)
        results = self._load_json(results_path) or {
            "candidate_id": candidate_id,
            "candidate_name": candidate_name,
            "tests": [],
        }
        if candidate_name:
            results["candidate_name"] = candidate_name
        results["tests"].append(result_data)
        self._save_json(results_path, results)

        return {
            "success": True,
            **result_data,
        }

    def _evaluate_test_with_llm(
        self,
        level: str,
        questions: Dict[str, List],
        answer_map: Dict[str, str],
    ) -> Dict[str, Any]:
        """Use LLM to evaluate written test answers (Grammar, Listening, Writing only)."""
        level_info = LEVEL_DESCRIPTIONS.get(level, LEVEL_DESCRIPTIONS["basic"])

        # Build QA text for evaluation — written sections only
        qa_sections = ""
        for category in ["grammar", "listening", "writing"]:
            qa_sections += f"\n\n### {category.upper()} SECTION\n"
            for q in questions.get(category, []):
                q_id = q.get("question_id", "")
                student_answer = answer_map.get(q_id, "(No answer provided)")
                correct = q.get("correct_answer", "")
                marks = q.get("marks", 5)

                qa_sections += f"\nQ [{q_id}] ({marks} marks): {q.get('question', '')}\n"
                if q.get("passage"):
                    qa_sections += f"Passage: {q['passage'][:300]}\n"
                if q.get("options"):
                    qa_sections += f"Options: {q['options']}\n"
                if correct:
                    qa_sections += f"Correct Answer: {correct}\n"
                if q.get("rubric"):
                    qa_sections += f"Rubric: {q['rubric']}\n"
                qa_sections += f"Student's Answer: {student_answer}\n"

        prompt = f"""You are an expert English language assessor. Evaluate this {level_info['name']} level ({level_info['cefr']}) English proficiency test.

NOTE: This is the WRITTEN portion only. Speaking is assessed separately.

{qa_sections}

## SCORING INSTRUCTIONS
Score each category out of its total marks:
- Grammar: out of 20 (evaluate correctness — for MCQ and fill-in-blank, check against correct_answer)
- Listening: out of 25 (evaluate comprehension accuracy, inference skills)
- Writing: out of 30 (evaluate content, organization, grammar, vocabulary, task completion)

Be STRICT but FAIR. A {level_info['name']} level student should demonstrate {level_info['cefr']} competency.

For grammar MCQs/fill-in-the-blanks: if the answer matches the correct_answer exactly → full marks.
For writing: evaluate quality based on the rubric.

Return ONLY valid JSON:
{{
    "category_scores": {{
        "grammar": 15,
        "listening": 20,
        "writing": 22
    }},
    "feedback": {{
        "grammar": "Solid understanding of tenses but struggles with...",
        "listening": "Strong comprehension skills...",
        "writing": "Well-organized but some grammar errors..."
    }},
    "strengths": [
        "Strong reading comprehension",
        "Good sentence structure"
    ],
    "weaknesses": [
        "Limited vocabulary",
        "Tense consistency issues"
    ],
    "per_question": [
        {{"question_id": "gr_001", "score": 3, "max": 3, "comment": "..."}},
        {{"question_id": "ls_001", "score": 4, "max": 5, "comment": "..."}}
    ]
}}"""

        raw = self._call_llm(
            [{"role": "user", "content": prompt}],
            temperature=0.2
        )
        result = self._parse_json_from_llm(raw)

        if result:
            return result

        # Fallback: simple scoring (written only)
        return {
            "category_scores": {
                "grammar": 10,
                "listening": 12.5,
                "writing": 15,
            },
            "feedback": {
                "grammar": "Evaluation unavailable. Please try again.",
                "listening": "Evaluation unavailable.",
                "writing": "Evaluation unavailable.",
            },
            "strengths": ["Participated in the test"],
            "weaknesses": ["Detailed evaluation unavailable"],
        }

    # ── Speaking Assessment (Live Interactive) ────────────────────────────────

    def _speaking_path(self, candidate_id: str, level: str) -> Path:
        safe_id = candidate_id.strip().lower().replace(" ", "_")
        return self.data_dir / f"speaking_{safe_id}_{level}.json"

    def start_speaking_assessment(
        self,
        candidate_id: str,
        candidate_name: str,
        level: str,
    ) -> Dict[str, Any]:
        """
        Start an interactive speaking assessment.
        AI will converse with the student to evaluate their speaking level.
        No predefined questions — AI dynamically assesses fluency, vocabulary,
        grammar, and coherence through natural conversation.
        """
        level = level.strip().lower()
        if level not in LEVELS:
            return {"error": f"Invalid level: {level}", "success": False}

        level_info = LEVEL_DESCRIPTIONS.get(level, LEVEL_DESCRIPTIONS["basic"])
        session_id = hashlib.md5(
            f"speaking_{candidate_id}_{level}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]

        system_prompt = f"""You are an expert English language speaking assessor at GradeUp Academy.
You are conducting a LIVE speaking assessment for a student at the **{level_info['name']} level** ({level_info['cefr']}).

## YOUR ROLE
You are NOT asking predefined questions. You are having a natural conversation to assess the student's English speaking ability.
You must evaluate: fluency, vocabulary range, grammar accuracy, coherence, and pronunciation awareness.

## ASSESSMENT APPROACH
1. Start with a warm, friendly greeting and a simple opening question
2. Based on the student's response, ask follow-up questions that probe deeper
3. Gradually increase complexity based on the student's demonstrated level
4. Cover different topics: personal life, opinions, hypothetical scenarios, descriptions
5. If the student struggles, simplify. If they're strong, challenge them more.
6. After {SPEAKING_MIN_TURNS}-{SPEAKING_MAX_TURNS} exchanges, you'll have enough data to score.

## EXPECTED LEVEL: {level_info['name']} ({level_info['cefr']})
{level_info['speaking_guidance']}

## INTERACTION RULES
- Be warm, encouraging, but professionally assessing
- Ask ONE question at a time
- React naturally to the student's answer before asking the next question
- Vary question types: describe, explain, compare, imagine, narrate
- Do NOT tell the student their score during the conversation
- Do NOT correct their mistakes during the assessment — just note them mentally
- Keep responses concise (2-3 sentences max before asking the next question)

## SCORING CRITERIA (25 marks total)
- Fluency & Coherence: 7 marks (natural flow, logical connections)
- Vocabulary Range: 6 marks (variety, appropriateness, level-appropriate words)
- Grammar Accuracy: 6 marks (correct tense usage, sentence structure)
- Pronunciation & Clarity: 3 marks (clear communication, word stress awareness)
- Task Completion: 3 marks (relevance, completeness of responses)"""

        speaking_data = {
            "session_id": session_id,
            "candidate_id": candidate_id,
            "candidate_name": candidate_name,
            "level": level,
            "system_prompt": system_prompt,
            "messages": [],
            "turn_count": 0,
            "status": "active",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }

        # Generate AI's opening question
        opening = self._call_llm([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Start the speaking assessment. Greet {candidate_name} warmly and ask your first question."},
        ])

        speaking_data["messages"].append({
            "role": "assistant", "content": opening,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        speaking_data["turn_count"] = 1

        self._save_json(self._speaking_path(candidate_id, level), speaking_data)

        return {
            "success": True,
            "session_id": session_id,
            "level": level,
            "level_name": level_info["name"],
            "message": opening,
            "turn": 1,
            "min_turns": SPEAKING_MIN_TURNS,
            "max_turns": SPEAKING_MAX_TURNS,
            "note": "Respond naturally. The AI will assess your speaking through conversation.",
        }

    def respond_speaking(
        self,
        candidate_id: str,
        level: str,
        student_message: str,
    ) -> Dict[str, Any]:
        """Process student's speaking response and return AI's next question."""
        level = level.strip().lower()
        sp_path = self._speaking_path(candidate_id, level)
        sp_data = self._load_json(sp_path)

        if not sp_data:
            return {"error": "Speaking assessment not found. Start one first.", "success": False}
        if sp_data.get("status") != "active":
            return {"error": "Speaking assessment is no longer active.", "success": False}

        # Add student message
        sp_data["messages"].append({
            "role": "user", "content": student_message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        sp_data["turn_count"] = sp_data.get("turn_count", 0) + 1
        turn = sp_data["turn_count"]

        # Check if we should wrap up
        if turn >= SPEAKING_MAX_TURNS:
            # Auto-score
            self._save_json(sp_path, sp_data)
            return self.end_speaking_assessment(candidate_id, level)

        # Build context for next question
        llm_messages = [{"role": "system", "content": sp_data.get("system_prompt", "")}]

        # Add turn tracking note
        remaining = SPEAKING_MAX_TURNS - turn
        if turn >= SPEAKING_MIN_TURNS:
            llm_messages[0]["content"] += f"\n\n[NOTE: Turn {turn}/{SPEAKING_MAX_TURNS}. You have enough data to assess. You may wrap up naturally in the next 1-2 turns.]"

        for msg in sp_data["messages"]:
            llm_messages.append({"role": msg["role"], "content": msg["content"]})

        # Generate next question
        response = self._call_llm(llm_messages)

        sp_data["messages"].append({
            "role": "assistant", "content": response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        self._save_json(sp_path, sp_data)

        can_end = turn >= SPEAKING_MIN_TURNS

        return {
            "success": True,
            "session_id": sp_data.get("session_id"),
            "message": response,
            "turn": turn,
            "min_turns": SPEAKING_MIN_TURNS,
            "max_turns": SPEAKING_MAX_TURNS,
            "can_end": can_end,
            "note": f"Turn {turn}/{SPEAKING_MAX_TURNS}." + (" You can end the assessment now if ready." if can_end else ""),
        }

    def end_speaking_assessment(
        self,
        candidate_id: str,
        level: str,
    ) -> Dict[str, Any]:
        """End speaking assessment and score the conversation."""
        level = level.strip().lower()
        sp_path = self._speaking_path(candidate_id, level)
        sp_data = self._load_json(sp_path)

        if not sp_data:
            return {"error": "Speaking assessment not found.", "success": False}
        if sp_data.get("status") == "scored":
            return {"error": "Speaking assessment already scored.", "success": False,
                    "score": sp_data.get("score")}

        level_info = LEVEL_DESCRIPTIONS.get(level, LEVEL_DESCRIPTIONS["basic"])

        # Build conversation transcript for scoring
        transcript = ""
        for msg in sp_data.get("messages", []):
            role = "Assessor" if msg["role"] == "assistant" else "Student"
            transcript += f"\n{role}: {msg['content']}\n"

        score_prompt = f"""You are an expert English speaking assessor. Score this speaking assessment conversation.

Level: {level_info['name']} ({level_info['cefr']})
Expected: {level_info['speaking_guidance']}

## CONVERSATION TRANSCRIPT
{transcript}

## SCORING (out of 25 marks total)
Evaluate the STUDENT's responses only. Score on these criteria:
- Fluency & Coherence (out of 7): Natural flow, logical connections, hesitation
- Vocabulary Range (out of 6): Variety, appropriateness, level-appropriate words
- Grammar Accuracy (out of 6): Correct tense usage, sentence structure, agreement
- Pronunciation & Clarity (out of 3): Clear communication, appropriate word choice
- Task Completion (out of 3): Relevance, completeness, engagement with questions

Return ONLY valid JSON:
{{
    "total_score": 18.5,
    "max_score": 25,
    "percentage": 74.0,
    "criteria": {{
        "fluency_coherence": {{"score": 5, "max": 7, "comment": "..."}},
        "vocabulary_range": {{"score": 4, "max": 6, "comment": "..."}},
        "grammar_accuracy": {{"score": 4.5, "max": 6, "comment": "..."}},
        "pronunciation_clarity": {{"score": 2.5, "max": 3, "comment": "..."}},
        "task_completion": {{"score": 2.5, "max": 3, "comment": "..."}}
    }},
    "overall_feedback": "The student demonstrated...",
    "strengths": ["Good vocabulary", "Clear responses"],
    "areas_for_improvement": ["Tense consistency", "More complex sentences"]
}}"""

        raw = self._call_llm(
            [{"role": "user", "content": score_prompt}],
            temperature=0.2
        )
        score = self._parse_json_from_llm(raw)

        if not score:
            score = {
                "total_score": 12.5, "max_score": 25, "percentage": 50.0,
                "criteria": {},
                "overall_feedback": "Scoring unavailable. Please try again.",
                "strengths": [], "areas_for_improvement": [],
            }

        sp_data["status"] = "scored"
        sp_data["score"] = score
        sp_data["scored_at"] = datetime.now(timezone.utc).isoformat()
        self._save_json(sp_path, sp_data)

        # ── Finalize the test result ──────────────────────────────────────────
        # Find the pending written test result and merge speaking score
        sp_total = score.get("total_score", 0)
        finalized_result = self._finalize_test_with_speaking(
            candidate_id, level, sp_total, score
        )

        response = {
            "success": True,
            "session_id": sp_data.get("session_id"),
            "level": level,
            "speaking_score": score,
            "message": f"Speaking assessment complete! You scored {sp_total}/{score.get('max_score', 25)}.",
        }

        if finalized_result:
            response["test_finalized"] = True
            response["final_result"] = finalized_result
            response["message"] += (
                f" Final score: {finalized_result['total_score']}/{finalized_result['total_marks']} "
                f"({finalized_result['percentage']}%). "
                f"Recommended level: {finalized_result['recommended_level']}."
            )
        else:
            response["test_finalized"] = False
            response["note"] = "Speaking scored, but no pending written test found to finalize. Submit the written test to get your complete result."

        return response

    def _finalize_test_with_speaking(
        self,
        candidate_id: str,
        level: str,
        speaking_total: float,
        speaking_score_data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Find the most recent pending_speaking test result for this candidate+level,
        merge speaking score, and recalculate final totals.
        Returns the finalized result data, or None if no pending test found.
        """
        results_path = self._results_path(candidate_id)
        results = self._load_json(results_path)
        if not results:
            return None

        tests = results.get("tests", [])

        # Find the most recent pending_speaking test for this level
        pending_idx = None
        for i in range(len(tests) - 1, -1, -1):
            t = tests[i]
            if t.get("level") == level and t.get("status") == "pending_speaking":
                pending_idx = i
                break

        if pending_idx is None:
            return None

        test = tests[pending_idx]

        # Merge speaking score
        written_total = test.get("written_score", 0)
        total_score = written_total + speaking_total
        percentage = round(total_score / TOTAL_MARKS * 100, 2) if TOTAL_MARKS > 0 else 0
        passed = percentage >= PASS_THRESHOLD

        # Rebuild category_scores dict for recommendation calculation
        raw_category_scores = {}
        for cat in ["grammar", "listening", "writing"]:
            cat_data = test.get("category_scores", {}).get(cat, {})
            raw_category_scores[cat] = cat_data.get("score", 0) if isinstance(cat_data, dict) else 0

        recommended_level = self._calculate_recommended_level(level, percentage, raw_category_scores)

        # Update the test record
        test["status"] = "completed"
        test["speaking_completed"] = True
        test["speaking_score"] = round(speaking_total, 2)
        test["speaking_assessment"] = {
            "score": round(speaking_total, 2),
            "total": SPEAKING_MARKS,
            "percentage": round(speaking_total / SPEAKING_MARKS * 100, 2) if SPEAKING_MARKS > 0 else 0,
            "completed": True,
            "feedback": speaking_score_data.get("overall_feedback", ""),
            "criteria": speaking_score_data.get("criteria", {}),
        }
        test["total_score"] = round(total_score, 2)
        test["percentage"] = percentage
        test["passed"] = passed
        test["recommended_level"] = recommended_level
        test["completed_at"] = datetime.now(timezone.utc).isoformat()
        test.pop("note", None)  # Remove the pending note

        # Save updated results
        tests[pending_idx] = test
        results["tests"] = tests
        self._save_json(results_path, results)

        print(f"  ✅ [EnglishTestEngine] Test finalized for {candidate_id}: "
              f"{total_score}/{TOTAL_MARKS} ({percentage}%) → {recommended_level}")

        return {
            "total_score": round(total_score, 2),
            "total_marks": TOTAL_MARKS,
            "written_score": round(written_total, 2),
            "speaking_score": round(speaking_total, 2),
            "percentage": percentage,
            "passed": passed,
            "recommended_level": recommended_level,
        }

    def _calculate_recommended_level(
        self,
        tested_level: str,
        percentage: float,
        category_scores: Dict[str, float],
    ) -> str:
        """Recommend the appropriate level based on test performance."""
        current_idx = LEVEL_ORDER.get(tested_level, 0)

        if percentage >= PASS_THRESHOLD:
            # Passed — recommend next level
            next_idx = min(current_idx + 1, len(LEVELS) - 1)
            return LEVELS[next_idx]
        elif percentage >= 60:
            # Close to passing — stay at same level
            return tested_level
        elif percentage >= 40:
            # Moderate performance — might need to step down one level
            prev_idx = max(current_idx - 1, 0)
            return LEVELS[prev_idx] if current_idx > 0 else tested_level
        else:
            # Very poor — recommend going back further
            prev_idx = max(current_idx - 2, 0)
            return LEVELS[prev_idx]

    def get_test_history(self, candidate_id: str) -> List[Dict[str, Any]]:
        """Get all past test results for a student."""
        results = self._load_json(self._results_path(candidate_id))
        if not results:
            return []
        return results.get("tests", [])

    def get_recommended_level(self, candidate_id: str) -> Dict[str, Any]:
        """Get AI-recommended level based on the student's latest COMPLETED test performance.
        Only considers tests where both written and speaking sections are done."""
        tests = self.get_test_history(candidate_id)
        if not tests:
            return {
                "candidate_id": candidate_id,
                "recommended_level": "basic",
                "recommended_level_name": "Basic",
                "reason": "No test history found. Starting at Basic level.",
                "has_test_history": False,
            }

        # Find the latest COMPLETED test (not pending_speaking)
        latest_completed = None
        latest_pending = None
        for t in reversed(tests):
            if t.get("status") == "completed" and latest_completed is None:
                latest_completed = t
            if t.get("status") == "pending_speaking" and latest_pending is None:
                latest_pending = t

        # If there's a pending test but no completed one
        if not latest_completed and latest_pending:
            tested_level = latest_pending.get("level", "basic")
            return {
                "candidate_id": candidate_id,
                "recommended_level": None,
                "recommended_level_name": None,
                "reason": (
                    f"Your {LEVEL_DESCRIPTIONS[tested_level]['name']} written test is scored "
                    f"({latest_pending.get('written_percentage', 0)}%), but the speaking assessment "
                    f"is still pending. Complete the speaking assessment to get your level recommendation."
                ),
                "has_test_history": True,
                "pending_speaking": True,
                "latest_test": {
                    "level": tested_level,
                    "status": "pending_speaking",
                    "written_score": latest_pending.get("written_score"),
                    "written_marks": latest_pending.get("written_marks"),
                    "written_percentage": latest_pending.get("written_percentage"),
                    "submitted_at": latest_pending.get("submitted_at"),
                },
            }

        if not latest_completed:
            return {
                "candidate_id": candidate_id,
                "recommended_level": "basic",
                "recommended_level_name": "Basic",
                "reason": "No completed test found. Starting at Basic level.",
                "has_test_history": False,
            }

        latest = latest_completed
        rec_level = latest.get("recommended_level", "basic")
        percentage = latest.get("percentage", 0)
        tested_level = latest.get("level", "basic")
        passed = latest.get("passed", False)

        if passed:
            reason = (
                f"You scored {percentage}% on the {LEVEL_DESCRIPTIONS[tested_level]['name']} test "
                f"(pass threshold: {PASS_THRESHOLD}%). You're ready for "
                f"{LEVEL_DESCRIPTIONS[rec_level]['name']} level!"
            )
        else:
            reason = (
                f"You scored {percentage}% on the {LEVEL_DESCRIPTIONS[tested_level]['name']} test "
                f"(pass threshold: {PASS_THRESHOLD}%). Based on your performance, "
                f"we recommend starting at {LEVEL_DESCRIPTIONS[rec_level]['name']} level "
                f"to strengthen your foundation."
            )

        return {
            "candidate_id": candidate_id,
            "recommended_level": rec_level,
            "recommended_level_name": LEVEL_DESCRIPTIONS[rec_level]["name"],
            "reason": reason,
            "has_test_history": True,
            "latest_test": {
                "level": tested_level,
                "percentage": percentage,
                "passed": passed,
                "category_scores": latest.get("category_scores", {}),
                "submitted_at": latest.get("submitted_at"),
            },
        }

    def get_test_report_for_session(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        """
        Get formatted test report for the AI teacher's first session discussion.
        Returns detailed analysis of strengths and weaknesses.
        """
        tests = self.get_test_history(candidate_id)
        if not tests:
            return None

        # Use the latest completed test (not pending_speaking)
        latest = None
        for t in reversed(tests):
            if t.get("status") == "completed":
                latest = t
                break
        if not latest:
            # Fallback to the latest test regardless of status
            latest = tests[-1]
        category_scores = latest.get("category_scores", {})

        # Identify strongest and weakest categories
        sorted_cats = sorted(
            category_scores.items(),
            key=lambda x: x[1].get("percentage", 0) if isinstance(x[1], dict) else 0,
            reverse=True,
        )

        return {
            "test_level": latest.get("level"),
            "test_level_name": latest.get("level_name"),
            "percentage": latest.get("percentage"),
            "passed": latest.get("passed"),
            "category_scores": category_scores,
            "speaking_assessment": latest.get("speaking_assessment", {}),
            "strengths": latest.get("strengths", []),
            "weaknesses": latest.get("weaknesses", []),
            "feedback": latest.get("feedback", {}),
            "per_question": latest.get("per_question", []),
            "recommended_level": latest.get("recommended_level"),
            "strongest_category": sorted_cats[0][0] if sorted_cats else None,
            "weakest_category": sorted_cats[-1][0] if sorted_cats else None,
            "submitted_at": latest.get("submitted_at"),
        }


# ── Global singleton ──────────────────────────────────────────────────────────

_engine: Optional[EnglishTestEngine] = None


def get_english_test_engine() -> EnglishTestEngine:
    global _engine
    if _engine is None:
        _engine = EnglishTestEngine()
    return _engine
