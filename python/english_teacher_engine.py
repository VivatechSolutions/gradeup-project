"""
English AI Teacher Session Engine for GradeUp AI

Features:
- 48-session syllabus from Basic to Advanced (12 per level)
- Session 1 of each level: Test discussion (strengths/weaknesses)
  with adaptive syllabus — skip strong topics, focus on weak ones
- 1-hour structured sessions with phase management
- Interactive teaching: topic intro, deep dive, live Q&A with
  teacher asking questions and explaining based on student answers
- Test gate between levels: student must pass level test before
  advancing to next level sessions
- Test failure options: retest or re-attend weak topic sessions
- Student progress tracking through syllabus

Storage:
  - english_session_data/session_{session_id}.json  — per-session messages and state
  - english_session_data/progress_{candidate_id}.json — syllabus progress
"""

import os
import json
import uuid
import time
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests

# ── Constants ─────────────────────────────────────────────────────────────────

SESSION_DATA_DIR = Path("english_session_data")
SESSION_MODEL = "gpt-4o-mini"
SESSION_FALLBACK_MODEL = "gpt-4o"
SESSION_TIMEOUT = 90
SESSION_DURATION_MINUTES = 60
SESSION_MAX_EXTENSION_MINUTES = 10

LEVELS = ["basic", "intermediate", "super_intermediate", "advanced"]

# ── Syllabus ──────────────────────────────────────────────────────────────────

SYLLABUS = {
    "basic": [
        {"session": 1, "topic": "Test Discussion & Level Orientation",
         "type": "test_discussion",
         "description": "Review test results, discuss strengths (+ve) and weaknesses (-ve), identify weak areas, set learning goals for the Basic level."},
        {"session": 2, "topic": "Parts of Speech — Nouns & Pronouns",
         "type": "teaching",
         "description": "Types of nouns (common, proper, abstract, collective), personal/possessive/demonstrative pronouns, exercises."},
        {"session": 3, "topic": "Verbs & Helping Verbs",
         "type": "teaching",
         "description": "Action verbs, linking verbs, auxiliary/helping verbs, verb forms, sentence practice."},
        {"session": 4, "topic": "Adjectives & Adverbs",
         "type": "teaching",
         "description": "Descriptive, comparative, superlative adjectives, adverb types and placement."},
        {"session": 5, "topic": "Simple Tenses (Present, Past, Future)",
         "type": "teaching",
         "description": "Sentence formation in all three simple tenses, regular/irregular verbs, time markers."},
        {"session": 6, "topic": "Articles, Prepositions & Determiners",
         "type": "teaching",
         "description": "A/an/the rules, common prepositions of place/time, this/that/these/those."},
        {"session": 7, "topic": "Basic Sentence Structure (SVO)",
         "type": "teaching",
         "description": "Subject-Verb-Object order, types of sentences, basic punctuation."},
        {"session": 8, "topic": "Basic Reading Comprehension",
         "type": "teaching",
         "description": "Reading simple passages, answering who/what/where/when/why questions."},
        {"session": 9, "topic": "Basic Paragraph Writing",
         "type": "teaching",
         "description": "Topic sentence, supporting sentences, concluding sentence, paragraph unity."},
        {"session": 10, "topic": "Vocabulary Building (Everyday Words)",
         "type": "teaching",
         "description": "Common words, word families, basic synonyms and antonyms, usage in sentences."},
        {"session": 11, "topic": "Speaking: Self-Introduction & Daily Routine",
         "type": "teaching",
         "description": "Structured self-intro, describing daily routines, polite expressions, greetings."},
        {"session": 12, "topic": "Basic Level Assessment",
         "type": "level_test",
         "description": "Complete the Basic level test to advance to Intermediate. You must pass with 80%+ to unlock the next level."},
    ],
    "intermediate": [
        {"session": 1, "topic": "Test Discussion & Level Orientation",
         "type": "test_discussion",
         "description": "Review Basic level test results, discuss progress, set Intermediate goals."},
        {"session": 2, "topic": "Continuous & Perfect Tenses",
         "type": "teaching",
         "description": "Present/past/future continuous and perfect tenses, signal words, usage rules."},
        {"session": 3, "topic": "Active & Passive Voice",
         "type": "teaching",
         "description": "Voice transformation rules across all tenses, when to use passive voice."},
        {"session": 4, "topic": "Direct & Indirect Speech",
         "type": "teaching",
         "description": "Reporting verbs, tense backshift rules, pronoun changes, time expression changes."},
        {"session": 5, "topic": "Conjunctions & Connectors",
         "type": "teaching",
         "description": "Coordinating, subordinating, correlative conjunctions, linking ideas smoothly."},
        {"session": 6, "topic": "Subject-Verb Agreement",
         "type": "teaching",
         "description": "Singular/plural rules, tricky cases, collective nouns, either/neither."},
        {"session": 7, "topic": "Reading Comprehension (Inference)",
         "type": "teaching",
         "description": "Drawing conclusions, identifying main idea, author's purpose, inference skills."},
        {"session": 8, "topic": "Writing: Formal & Informal Letters",
         "type": "teaching",
         "description": "Letter format, tone differences, common phrases, complaint/application letters."},
        {"session": 9, "topic": "Writing: Diary Entry & Story Writing",
         "type": "teaching",
         "description": "Narrative structure, character development, first-person writing, diary format."},
        {"session": 10, "topic": "Speaking: Expressing Opinions & Discussions",
         "type": "teaching",
         "description": "Agree/disagree phrases, giving reasons, turn-taking, discussion etiquette."},
        {"session": 11, "topic": "Vocabulary (Idioms, Phrases, Proverbs)",
         "type": "teaching",
         "description": "Common idioms, phrasal usage, proverbs, contextual meaning, usage practice."},
        {"session": 12, "topic": "Intermediate Level Assessment",
         "type": "level_test",
         "description": "Complete the Intermediate level test to advance to Super Intermediate. You must pass with 80%+ to unlock the next level."},
    ],
    "super_intermediate": [
        {"session": 1, "topic": "Test Discussion & Level Orientation",
         "type": "test_discussion",
         "description": "Review Intermediate test results, identify remaining gaps, set Super Intermediate goals."},
        {"session": 2, "topic": "Complex Sentences & Clauses",
         "type": "teaching",
         "description": "Independent/dependent clauses, relative clauses, noun clauses, clause combining."},
        {"session": 3, "topic": "Conditional Sentences (Types 0-3)",
         "type": "teaching",
         "description": "Real/unreal conditions, mixed conditionals, wish clauses, unless/provided that."},
        {"session": 4, "topic": "Modals & Semi-Modals",
         "type": "teaching",
         "description": "Can/could/may/might/must/shall/should, need to, ought to, had better."},
        {"session": 5, "topic": "Phrasal Verbs & Collocations",
         "type": "teaching",
         "description": "Common phrasal verbs, verb-noun collocations, natural phrasing, practice."},
        {"session": 6, "topic": "Gerunds, Infinitives & Participles",
         "type": "teaching",
         "description": "Verb patterns, -ing vs to-infinitive, participle clauses, common errors."},
        {"session": 7, "topic": "Essay Writing (Argumentative)",
         "type": "teaching",
         "description": "Thesis statement, body paragraphs, counter-arguments, conclusion, transitions."},
        {"session": 8, "topic": "Essay Writing (Descriptive & Narrative)",
         "type": "teaching",
         "description": "Sensory details, show-don't-tell technique, transitions, pacing, imagery."},
        {"session": 9, "topic": "Advanced Reading (Critical Analysis)",
         "type": "teaching",
         "description": "Tone, bias, rhetorical devices, fact vs opinion, evaluating arguments."},
        {"session": 10, "topic": "Speaking: Debates & Presentations",
         "type": "teaching",
         "description": "Structuring arguments, persuasive language, public speaking tips, rebuttals."},
        {"session": 11, "topic": "Listening Comprehension (Nuance & Tone)",
         "type": "teaching",
         "description": "Implied meaning, speaker's attitude, contextual clues, note-taking from audio."},
        {"session": 12, "topic": "Super Intermediate Level Assessment",
         "type": "level_test",
         "description": "Complete the Super Intermediate level test to advance to Advanced. You must pass with 80%+ to unlock the next level."},
    ],
    "advanced": [
        {"session": 1, "topic": "Test Discussion & Level Orientation",
         "type": "test_discussion",
         "description": "Review Super Intermediate results, set mastery goals for Advanced level."},
        {"session": 2, "topic": "Advanced Grammar (Subjunctive, Inversion, Cleft)",
         "type": "teaching",
         "description": "Formal structures, emphasis patterns, exam-level grammar, advanced constructions."},
        {"session": 3, "topic": "Advanced Tense Usage & Aspect",
         "type": "teaching",
         "description": "Perfect continuous nuances, narrative tenses, stative vs dynamic verbs."},
        {"session": 4, "topic": "Sentence Transformation & Paraphrasing",
         "type": "teaching",
         "description": "Rephrasing, key-word transformation, semantic equivalence, exam techniques."},
        {"session": 5, "topic": "Academic Writing (Reports & Reviews)",
         "type": "teaching",
         "description": "Formal register, data description, critical reviews, abstract writing."},
        {"session": 6, "topic": "Advanced Vocabulary (Register & Style)",
         "type": "teaching",
         "description": "Formal/informal register, academic vocabulary, nuanced word choice, collocations."},
        {"session": 7, "topic": "Advanced Reading (Literary Analysis)",
         "type": "teaching",
         "description": "Themes, symbolism, narrative technique, critical commentary, literary devices."},
        {"session": 8, "topic": "Creative Writing (Short Stories & Poetry)",
         "type": "teaching",
         "description": "Plot structure, imagery, metaphor, rhythm, voice, character development."},
        {"session": 9, "topic": "Speaking: Formal Presentations & Impromptu",
         "type": "teaching",
         "description": "Handling Q&A, thinking on feet, structured spontaneous speech, confidence."},
        {"session": 10, "topic": "Listening: Lectures, News & Podcasts",
         "type": "teaching",
         "description": "Academic listening, note-taking techniques, summarizing spoken content."},
        {"session": 11, "topic": "Comprehensive Mock Test & Full Review",
         "type": "revision",
         "description": "Full-length practice covering all skills, timed assessment, detailed review."},
        {"session": 12, "topic": "Final Assessment & Personalized Improvement Plan",
         "type": "final_assessment",
         "description": "Final exam, detailed report, personalized roadmap for continued learning."},
    ],
}


# ── Session Phase Definitions ─────────────────────────────────────────────────

PHASES_TEST_DISCUSSION = [
    {"name": "greeting", "duration_min": 5, "label": "Greeting & Context"},
    {"name": "test_review", "duration_min": 20, "label": "Test Result Review (+ve/-ve)"},
    {"name": "weakness_analysis", "duration_min": 15, "label": "Weakness Analysis"},
    {"name": "goals_setting", "duration_min": 10, "label": "Level & Goals Setting"},
    {"name": "syllabus_preview", "duration_min": 5, "label": "Preview Upcoming Syllabus"},
    {"name": "closing", "duration_min": 5, "label": "Closing & Summary"},
]

PHASES_TEACHING = [
    {"name": "topic_intro", "duration_min": 10, "label": "Topic Introduction"},
    {"name": "deep_dive", "duration_min": 15, "label": "Deep Dive"},
    {"name": "live_qa", "duration_min": 25, "label": "Live Q&A"},
    {"name": "summary", "duration_min": 10, "label": "Summary & Review"},
]


class EnglishTeacherEngine:
    """
    Manages interactive AI English teaching sessions with structured
    1-hour sessions, live Q&A, and test-gated level progression.
    """

    def __init__(self, data_dir: Path = SESSION_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    # ── Path Helpers ──────────────────────────────────────────────────────

    def _session_path(self, session_id: str) -> Path:
        return self.data_dir / f"session_{session_id}.json"



    def _progress_path(self, candidate_id: str) -> Path:
        safe = candidate_id.strip().lower().replace(" ", "_")
        return self.data_dir / f"progress_{safe}.json"

    def _load_json(self, path: Path) -> Optional[Dict]:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return None

    def _save_json(self, path: Path, data: Dict) -> None:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    # ── LLM ───────────────────────────────────────────────────────────────

    def _call_llm(self, messages: List[Dict], temperature: float = 0.8) -> str:
        api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return "AI teacher is not configured. Please contact your administrator."
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": SESSION_MODEL,
            "messages": messages,
            "max_completion_tokens": 2048,
            "temperature": temperature,
        }
        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers, json=payload, timeout=SESSION_TIMEOUT,
            )
            if not resp.ok:
                payload["model"] = SESSION_FALLBACK_MODEL
                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers, json=payload, timeout=SESSION_TIMEOUT,
                )
            if resp.ok:
                return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"  ❌ [EnglishTeacher] LLM error: {e}")
        return "I'm having trouble right now. Let's try again in a moment!"

    def _parse_json_from_llm(self, raw: str) -> Optional[Any]:
        cleaned = re.sub(r'^```[a-z]*\n?', '', raw.strip())
        cleaned = re.sub(r'\n?```$', '', cleaned).strip()
        try:
            return json.loads(cleaned)
        except Exception:
            pass
        for end in range(len(cleaned), 0, -1):
            if cleaned[end - 1] in ('}', ']'):
                try:
                    return json.loads(cleaned[:end])
                except Exception:
                    continue
        return None

    # ── Progress Management ───────────────────────────────────────────────

    def _get_progress(self, candidate_id: str) -> Dict:
        data = self._load_json(self._progress_path(candidate_id))
        if data:
            return data
        return {
            "candidate_id": candidate_id,
            "current_level": "basic",
            "current_session_number": 1,
            "completed_sessions": [],
            "total_sessions_completed": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def _advance_progress(self, candidate_id: str, session_id: str, level: str, session_number: int) -> None:
        progress = self._get_progress(candidate_id)
        progress["completed_sessions"].append({
            "session_id": session_id,
            "level": level,
            "session_number": session_number,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        progress["total_sessions_completed"] = len(progress["completed_sessions"])

        # Determine next session
        level_syllabus = SYLLABUS.get(level, [])
        if session_number < len(level_syllabus):
            next_session = session_number + 1
            # Skip sessions listed in adaptive plan
            adaptive_plan = progress.get("adaptive_plan")
            if adaptive_plan:
                skip_set = set(adaptive_plan.get("skip_sessions", []))
                while next_session in skip_set and next_session < len(level_syllabus):
                    next_session += 1
            progress["current_session_number"] = next_session
            progress["current_level"] = level
        else:
            # Level complete — require test before advancing to next level
            level_idx = LEVELS.index(level) if level in LEVELS else 0
            if level_idx < len(LEVELS) - 1:
                progress["current_level"] = level  # Stay at current level
                progress["current_session_number"] = len(level_syllabus)  # Stay at last session
                progress["requires_test"] = True  # Flag: must pass test to advance
                progress["test_level"] = level  # Which level's test to take
            else:
                progress["current_level"] = "completed"
                progress["current_session_number"] = 0

        self._save_json(self._progress_path(candidate_id), progress)

    # ── Adaptive Plan Logic ───────────────────────────────────────────────

    @staticmethod
    def _classify_topic_category(topic: str) -> Optional[str]:
        """Map a syllabus topic to its skill category (Speaking/Writing/Listening/Grammar/Vocabulary)."""
        t = topic.lower()
        if any(kw in t for kw in ["speaking", "self-intro", "routine", "opinion", "debate", "presentation"]):
            return "Speaking"
        if any(kw in t for kw in ["writing", "paragraph", "letter", "essay", "diary", "creative"]):
            return "Writing"
        if any(kw in t for kw in ["reading", "comprehension", "listening"]):
            return "Listening"
        if any(kw in t for kw in ["vocabulary", "idiom", "phrase", "proverb", "synonym", "antonym", "word"]):
            return "Vocabulary"
        if any(kw in t for kw in [
            "grammar", "tense", "verb", "noun", "pronoun", "adjective", "adverb",
            "article", "preposition", "sentence", "voice", "speech", "conjunction",
            "subject", "modal", "conditional", "clause", "gerund", "phrasal",
            "participle", "infinitive", "determiner",
        ]):
            return "Grammar"
        return None

    def _compute_adaptive_plan(self, candidate_id: str, level: str) -> Optional[Dict]:
        """Compute which sessions to skip based on test scores. Returns None if no test data."""
        try:
            from english_test_engine import get_english_test_engine
            test_engine = get_english_test_engine()
            report = test_engine.get_test_report_for_session(candidate_id)
            if not report:
                return None
        except Exception as e:
            print(f"  ⚠️ [EnglishTeacher] Could not load test for adaptive plan: {e}")
            return None

        cats = report.get("category_scores", {})
        passed = report.get("passed", False)
        rec_level = report.get("recommended_level", level)
        tested_level = report.get("test_level", level)

        # Only build adaptive plan if student passed and is recommended higher
        if not (passed and rec_level != tested_level):
            return None

        # Classify categories as strong (>=80%) or weak (<60%)
        strong_cats = []
        weak_cats = []
        for cat_name, cat_data in cats.items():
            pct = cat_data.get("percentage", 0) if isinstance(cat_data, dict) else 0
            if pct >= 80:
                strong_cats.append(cat_name.title())
            elif pct < 60:
                weak_cats.append(cat_name.title())

        level_syllabus = SYLLABUS.get(level, [])
        skip_sessions = []
        focus_sessions = []
        skip_topics = []
        focus_topics = []

        for s in level_syllabus[1:]:  # skip session 1 (test discussion)
            if s.get("type") in ("level_test", "final_assessment"):
                continue
            cat = self._classify_topic_category(s["topic"])
            if cat and cat in strong_cats:
                skip_sessions.append(s["session"])
                skip_topics.append(s["topic"])
            elif cat and cat in weak_cats:
                focus_sessions.append(s["session"])
                focus_topics.append(s["topic"])
            # Topics that don't map to a strong category are NOT skipped (kept by default)

        return {
            "skip_sessions": skip_sessions,
            "skip_topics": skip_topics,
            "focus_sessions": focus_sessions,
            "focus_topics": focus_topics,
            "strong_categories": strong_cats,
            "weak_categories": weak_cats,
            "recommended_level": rec_level,
            "test_percentage": report.get("percentage", 0),
            "strengths": report.get("strengths", []),
            "weaknesses": report.get("weaknesses", []),
        }

    def _save_adaptive_plan(self, candidate_id: str, level: str, session_type: str) -> None:
        """After test_discussion ends, compute and persist the adaptive plan."""
        if session_type != "test_discussion":
            return
        plan = self._compute_adaptive_plan(candidate_id, level)
        if plan:
            progress = self._get_progress(candidate_id)
            progress["adaptive_plan"] = plan
            # If all teaching sessions are skipped, advance to last non-test session
            level_syllabus = SYLLABUS.get(level, [])
            skip_set = set(plan.get("skip_sessions", []))
            # Find first non-skipped session after session 1
            next_session = None
            for s in level_syllabus[1:]:
                if s["session"] not in skip_set and s.get("type") not in ("level_test", "final_assessment"):
                    next_session = s["session"]
                    break
            if next_session and next_session > progress.get("current_session_number", 2):
                progress["current_session_number"] = next_session
            self._save_json(self._progress_path(candidate_id), progress)
            print(f"  [OK] [EnglishTeacher] Adaptive plan saved for {candidate_id}: skip sessions {plan['skip_sessions']}")

    # ── Test Gate Logic ────────────────────────────────────────────────────

    def _check_level_test_passed(self, candidate_id: str, level: str) -> Dict:
        """Check if the student passed the level test (required to advance)."""
        try:
            from english_test_engine import get_english_test_engine
            test_engine = get_english_test_engine()
            tests = test_engine.get_test_history(candidate_id)
            if not tests:
                return {"passed": False, "has_test": False}

            # Check for a completed + passed test at this level
            for t in reversed(tests):
                if t.get("level") == level and t.get("status") == "completed":
                    if t.get("passed"):
                        return {"passed": True, "percentage": t.get("percentage", 0)}
                    else:
                        return {
                            "passed": False,
                            "has_test": True,
                            "percentage": t.get("percentage", 0),
                            "category_scores": t.get("category_scores", {}),
                            "weaknesses": t.get("weaknesses", []),
                        }
            return {"passed": False, "has_test": False}
        except Exception as e:
            print(f"  ⚠️ [EnglishTeacher] Could not check test: {e}")
            return {"passed": False, "has_test": False}

    def _unlock_next_level(self, candidate_id: str, current_level: str) -> None:
        """Called after test is passed — unlock the next level."""
        progress = self._get_progress(candidate_id)
        level_idx = LEVELS.index(current_level) if current_level in LEVELS else 0
        if level_idx < len(LEVELS) - 1:
            progress["current_level"] = LEVELS[level_idx + 1]
            progress["current_session_number"] = 1
            progress.pop("requires_test", None)
            progress.pop("test_level", None)
            self._save_json(self._progress_path(candidate_id), progress)

    def get_test_failure_options(self, candidate_id: str, level: str) -> Dict:
        """
        After failing a level test, return two options:
        1. Retest — take the test again
        2. Review weak topics — re-attend specific sessions based on weak areas
        """
        test_result = self._check_level_test_passed(candidate_id, level)
        if test_result.get("passed"):
            return {
                "success": True,
                "passed": True,
                "message": "You have already passed this level test!",
            }

        if not test_result.get("has_test"):
            return {
                "success": True,
                "passed": False,
                "message": "No test found for this level. Take the test first.",
                "test_endpoint": "/english/test/start",
            }

        # Map weak categories to syllabus sessions
        weak_cats = test_result.get("weaknesses", [])
        category_scores = test_result.get("category_scores", {})
        level_syllabus = SYLLABUS.get(level, [])

        # Identify weak areas from category scores
        weak_areas = []
        for cat_name, cat_data in category_scores.items():
            pct = cat_data.get("percentage", 0) if isinstance(cat_data, dict) else 0
            if pct < 60:
                weak_areas.append(cat_name.title())

        # Map weak areas to syllabus sessions
        weak_sessions = []
        for s in level_syllabus[1:]:  # Skip session 1 (test discussion)
            if s.get("type") in ("level_test", "final_assessment"):
                continue
            topic_lower = s["topic"].lower()
            matched = False
            if any(kw in topic_lower for kw in ["speaking", "self-intro", "routine", "opinion", "debate", "presentation"]):
                if "Speaking" in weak_areas:
                    matched = True
            if any(kw in topic_lower for kw in ["writing", "paragraph", "letter", "essay", "diary", "creative"]):
                if "Writing" in weak_areas:
                    matched = True
            if any(kw in topic_lower for kw in ["reading", "comprehension", "listening"]):
                if "Listening" in weak_areas:
                    matched = True
            if any(kw in topic_lower for kw in ["grammar", "tense", "verb", "noun", "pronoun", "adjective", "adverb",
                                                  "article", "preposition", "sentence", "voice", "speech", "conjunction",
                                                  "subject", "modal", "conditional", "clause", "gerund", "phrasal"]):
                if "Grammar" in weak_areas:
                    matched = True
            if matched:
                weak_sessions.append({
                    "session_number": s["session"],
                    "topic": s["topic"],
                    "description": s["description"],
                })

        return {
            "success": True,
            "passed": False,
            "percentage": test_result.get("percentage", 0),
            "weak_areas": weak_areas,
            "weaknesses": weak_cats,
            "options": {
                "retest": {
                    "label": "Retake the Test",
                    "description": "Take the test again directly.",
                    "endpoint": "/english/test/start",
                },
                "review_sessions": {
                    "label": "Review Weak Topics",
                    "description": f"Re-attend {len(weak_sessions)} session(s) on your weak areas, then retest.",
                    "sessions": weak_sessions,
                    "endpoint": "/english/session/start",
                },
            },
        }

    # ── System Prompts ────────────────────────────────────────────────────

    def _build_system_prompt_test_discussion(self, candidate_name: str,
                                              level: str, test_report: Optional[Dict]) -> str:
        level_syllabus = SYLLABUS.get(level, [])
        upcoming = [s["topic"] for s in level_syllabus[1:4]]

        test_info = ""
        adaptive_plan = ""
        if test_report:
            cats = test_report.get("category_scores", {})
            rec_level = test_report.get("recommended_level", level)
            tested_level = test_report.get("test_level", level)
            passed = test_report.get("passed", False)

            test_info = f"""
## STUDENT'S TEST RESULTS
- Test Level: {test_report.get('test_level_name', 'N/A')}
- Overall Score: {test_report.get('percentage', 'N/A')}%
- Passed: {'Yes' if passed else 'No'}
- Speaking: {cats.get('speaking', {}).get('score', 'N/A')}/{cats.get('speaking', {}).get('total', 25)} ({cats.get('speaking', {}).get('percentage', 'N/A')}%)
- Listening: {cats.get('listening', {}).get('score', 'N/A')}/{cats.get('listening', {}).get('total', 25)} ({cats.get('listening', {}).get('percentage', 'N/A')}%)
- Writing: {cats.get('writing', {}).get('score', 'N/A')}/{cats.get('writing', {}).get('total', 30)} ({cats.get('writing', {}).get('percentage', 'N/A')}%)
- Grammar: {cats.get('grammar', {}).get('score', 'N/A')}/{cats.get('grammar', {}).get('total', 20)} ({cats.get('grammar', {}).get('percentage', 'N/A')}%)
- Strengths: {', '.join(test_report.get('strengths', []))}
- Weaknesses: {', '.join(test_report.get('weaknesses', []))}
- Recommended Level: {rec_level.replace('_', ' ').title()}
- Feedback: {json.dumps(test_report.get('feedback', {}), indent=2)}
"""

            # Build adaptive plan — if student passed and is recommended for higher level
            if passed and rec_level != tested_level:
                # Identify strong vs weak categories
                strong_cats = []
                weak_cats = []
                for cat_name, cat_data in cats.items():
                    pct = cat_data.get("percentage", 0) if isinstance(cat_data, dict) else 0
                    if pct >= 80:
                        strong_cats.append(cat_name.title())
                    elif pct < 60:
                        weak_cats.append(cat_name.title())

                # Identify which syllabus topics map to strong/weak areas
                strong_topics = []
                weak_topics = []
                for s in level_syllabus[1:]:  # skip session 1 (test discussion)
                    if s.get("type") in ("level_test", "final_assessment"):
                        continue
                    cat = self._classify_topic_category(s["topic"])
                    if cat and cat in strong_cats:
                        strong_topics.append(s["topic"])
                    elif cat and cat in weak_cats:
                        weak_topics.append(s["topic"])

                adaptive_plan = f"""
## ADAPTIVE SYLLABUS PLAN (VERY IMPORTANT)
The student scored {test_report.get('percentage')}% and is recommended for **{rec_level.replace('_', ' ').title()}** level.
They are already STRONG in these {tested_level.replace('_', ' ').title()} concepts: **{', '.join(strong_cats) if strong_cats else 'None identified'}**.

You MUST do the following:
1. **Congratulate** the student warmly — they did great on the test!
2. **Explain** that since they are already strong in {', '.join(strong_cats) if strong_cats else 'several areas'}, we can SKIP those topics in the current level.
3. **Topics we can SKIP** (student is strong): {', '.join(strong_topics) if strong_topics else 'None — cover all topics'}
4. **Topics we MUST COVER** (student is weak): {', '.join(weak_topics) if weak_topics else 'Focus on general improvement'}
5. **Propose the plan**: "Since you are strong in {', '.join(strong_cats) if strong_cats else 'basics'}, we will skip those topics and focus on the areas where you need improvement: {', '.join(weak_cats) if weak_cats else 'specific areas'}. After covering those, we will move to {rec_level.replace('_', ' ').title()} level. Does this plan work for you?"
6. **WAIT for student's confirmation** before finalizing the plan.
7. If student says "yes" or agrees → confirm and set the personalized syllabus.
8. If student wants to cover everything → respect that and proceed with the full syllabus.
"""

        return f"""You are an expert, warm, and encouraging English language teacher at GradeUp Academy.
Your name is "Teacher" and you speak with patience and clarity.

## THIS IS SESSION 1 — TEST DISCUSSION SESSION
This is the FIRST session at the {level.replace('_', ' ').title()} level for {candidate_name}.
Do NOT teach a new topic. This entire session is dedicated to discussing the student's test performance and building a personalized learning plan.

{test_info}

{adaptive_plan}

## YOUR GOALS FOR THIS SESSION
1. **Welcome** the student warmly, introduce yourself, explain what this session is about
2. **Review test results** in detail — go through each category (Speaking, Listening, Writing, Grammar)
3. **Highlight positives (+ve)** — what the student did well, encourage them. Tell them which concepts they are already strong in.
4. **Explain negatives (-ve)** — what went wrong, WHY it went wrong, common mistake patterns
5. **Propose the adaptive plan** — explain which topics we will skip (already strong) and which we will focus on (weak areas). Ask for student's confirmation.
6. **Preview upcoming topics**: {', '.join(upcoming)}
7. **Summarize** key takeaways from this discussion and motivate the student

## INTERACTION STYLE
- Be patient, encouraging, and constructive
- If student asks "explain more" or "why?" — elaborate happily
- Use simple language appropriate for their level
- Give specific examples when explaining mistakes
- Be honest about weaknesses but always frame them as "areas for growth"
- End each response with a question or prompt to keep the conversation going

## PHASE TRACKING
Track which phase you're in and naturally transition:
- Greeting (5 min) → Test Review (20 min) → Weakness Analysis (15 min) → Adaptive Plan & Confirmation (10 min) → Preview (5 min) → Closing (5 min)
"""

    def _build_system_prompt_teaching(self, candidate_name: str, level: str,
                                       session_info: Dict,
                                       adaptive_plan: Optional[Dict] = None) -> str:
        topic = session_info.get("topic", "")
        description = session_info.get("description", "")
        session_num = session_info.get("session", 0)

        # Build student context from adaptive plan (test results & prior sessions)
        student_context = ""
        if adaptive_plan:
            strong = ", ".join(adaptive_plan.get("strong_categories", []))
            weak = ", ".join(adaptive_plan.get("weak_categories", []))
            skipped = ", ".join(adaptive_plan.get("skip_topics", []))
            focus = ", ".join(adaptive_plan.get("focus_topics", []))
            strengths = ", ".join(adaptive_plan.get("strengths", []))
            weaknesses = ", ".join(adaptive_plan.get("weaknesses", []))
            pct = adaptive_plan.get("test_percentage", "N/A")
            rec = adaptive_plan.get("recommended_level", level).replace("_", " ").title()

            student_context = f"""
## STUDENT BACKGROUND (from test & previous sessions)
- Test Score: {pct}% | Recommended Level: {rec}
- Strengths: {strengths if strengths else 'None identified'}
- Weaknesses: {weaknesses if weaknesses else 'None identified'}
- Strong Categories: {strong if strong else 'None'}
- Weak Categories: {weak if weak else 'None'}
- Topics SKIPPED (student already strong): {skipped if skipped else 'None'}
- Topics to FOCUS on: {focus if focus else 'General improvement'}

**IMPORTANT**: This student was placed in this session because they need to work on THIS specific topic.
Some earlier topics were skipped because the student already demonstrated mastery. Acknowledge their
existing knowledge where relevant and focus on deepening their understanding of today's topic.
"""

        return f"""You are an expert, warm, and encouraging English language teacher at GradeUp Academy.
Your name is "Teacher" and you speak with patience, clarity, and enthusiasm.

## SESSION INFO
- Student: {candidate_name}
- Level: {level.replace('_', ' ').title()}
- Session {session_num}: **{topic}**
- Topic Details: {description}
{student_context}
## SESSION STRUCTURE (60 minutes) — FOLLOW THIS EXACTLY

### Phase 1: Topic Introduction (10 min) — START HERE
- Welcome the student briefly and introduce today's topic: **{topic}**
- Start with WHY this topic matters in real life
- Give 2-3 simple examples to illustrate the concept
- Make it relatable — use everyday situations

### Phase 2: Deep Dive (15 min)
- Cover rules, exceptions, and detailed explanations
- Use at least 5 varied examples
- Address common mistakes students make
- Connect to previously learned topics where relevant
- Ask the student if they understand before moving on

### Phase 3: Live Q&A (25 min) — THIS IS THE CORE OF THE SESSION
- **YOU must ask questions to the student ONE AT A TIME**
- Wait for their answer, then respond based on their answer quality:
  - If CORRECT: Praise specifically ("Excellent! That's right because..."), then give a slightly harder question
  - If PARTIALLY CORRECT: Acknowledge what's right, explain what's missing, give the complete answer with an example, then ask a similar question
  - If INCORRECT: Say "Not quite!" then explain WHY it's wrong, give the correct answer with detailed reasoning and an example, then ask a related but simpler question
- Start with easy questions, gradually increase difficulty
- Ask at least 8-10 questions during this phase
- Mix different question types: fill-in-blank, sentence correction, sentence construction, MCQ, short answer
- After each answer, ALWAYS explain the concept behind it — this is teaching through Q&A
- **DO NOT just ask questions without explaining. The explanation after each answer is the most important part.**

### Phase 4: Summary & Review (10 min)
- Recap the key concepts covered today
- Highlight what the student did well in Q&A
- Point out areas that need more practice
- Give 2-3 quick tips or memory aids for the topic
- Motivate the student and preview what's coming next

## INTERACTION RULES
- If student says "explain once more" / "I don't understand" → re-explain with different examples
- If student says "give me more examples" → provide 3-4 new examples
- If student says "explain in detail" → give a thorough, step-by-step explanation
- NEVER refuse to re-explain. Be infinitely patient.
- Use bullet points and numbered lists for clarity
- Give positive reinforcement after correct answers
- For incorrect answers: say "Not quite!" then explain the correct answer with reasoning
- Keep the conversation flowing — end each message with a question or exercise
- Track time mentally and transition between phases naturally

## IMPORTANT RULES
- Stay on topic — this session is about {topic}
- If student goes off-topic, gently redirect
- Be a REAL teacher — not just informational, but pedagogical
- Make learning FUN with relatable examples and occasional humor
- Do NOT assign any homework. All practice happens LIVE in this session.
"""

    # ── Public API ────────────────────────────────────────────────────────

    def start_session(self, candidate_id: str, candidate_name: str,
                      level: Optional[str] = None) -> Dict:
        """Start a new teaching session for a student."""
        progress = self._get_progress(candidate_id)

        # Use provided level or progress level
        actual_level = level.strip().lower() if level else progress.get("current_level", "basic")
        if actual_level not in LEVELS:
            return {"error": f"Invalid level. Must be one of: {LEVELS}", "success": False}

        session_number = progress.get("current_session_number", 1)
        if level and level.strip().lower() != progress.get("current_level"):
            session_number = 1

        level_syllabus = SYLLABUS.get(actual_level, [])
        if session_number < 1 or session_number > len(level_syllabus):
            return {"error": f"Invalid session number {session_number} for {actual_level}", "success": False}

        # ── Adaptive skip logic: skip sessions the student is strong in ───
        adaptive_plan = progress.get("adaptive_plan")
        skip_set = set(adaptive_plan.get("skip_sessions", [])) if adaptive_plan else set()
        if skip_set and session_number in skip_set:
            # Find the next non-skipped teaching session
            original_session = session_number
            while session_number in skip_set and session_number < len(level_syllabus):
                session_number += 1
            # If we hit the level_test, stop there
            if session_number > len(level_syllabus):
                session_number = len(level_syllabus)
            # Update progress to the new position
            progress["current_session_number"] = session_number
            self._save_json(self._progress_path(candidate_id), progress)
            print(f"  [SKIP] [EnglishTeacher] Skipped sessions {original_session}->{session_number} "
                  f"for {candidate_id} (adaptive plan)")

        session_info = level_syllabus[session_number - 1]
        session_type = session_info.get("type", "teaching")

        # Test gate: if progress requires test, block until passed
        if progress.get("requires_test") and session_type == "test_discussion":
            test_level = progress.get("test_level", actual_level)
            test_check = self._check_level_test_passed(candidate_id, test_level)
            if test_check.get("passed"):
                # Test passed! Unlock next level and proceed
                self._unlock_next_level(candidate_id, test_level)
                progress = self._get_progress(candidate_id)
                actual_level = progress.get("current_level", "basic")
                session_number = progress.get("current_session_number", 1)
                level_syllabus = SYLLABUS.get(actual_level, [])
                session_info = level_syllabus[session_number - 1]
                session_type = session_info.get("type", "teaching")
            else:
                return {
                    "success": False,
                    "blocked": True,
                    "reason": "test_required",
                    "message": (
                        f"You must pass the {test_level.replace('_', ' ').title()} level test before "
                        f"advancing to the next level. Take the test at /english/test/start"
                    ),
                    "test_level": test_level,
                    "test_endpoint": "/english/test/start",
                    "failure_options_endpoint": f"/english/test/failure-options/{candidate_id}?level={test_level}",
                }

        # Create session
        session_id = uuid.uuid4().hex[:16]
        now = datetime.now(timezone.utc)

        session_data = {
            "session_id": session_id,
            "candidate_id": candidate_id,
            "candidate_name": candidate_name,
            "level": actual_level,
            "session_number": session_number,
            "session_type": session_type,
            "topic": session_info["topic"],
            "description": session_info["description"],
            "messages": [],
            "current_phase": "greeting" if session_type == "test_discussion" else "topic_intro",
            "phase_index": 0,
            "started_at": now.isoformat(),
            "elapsed_minutes": 0,
            "status": "active",
        }

        # Build system prompt and generate opening
        if session_type == "test_discussion":
            test_report = None
            try:
                from english_test_engine import get_english_test_engine
                test_report = get_english_test_engine().get_test_report_for_session(candidate_id)
            except Exception as e:
                print(f"  ⚠️ [EnglishTeacher] Could not load test report: {e}")

            system_prompt = self._build_system_prompt_test_discussion(
                candidate_name, actual_level, test_report
            )
        else:
            system_prompt = self._build_system_prompt_teaching(
                candidate_name, actual_level, session_info,
                adaptive_plan=progress.get("adaptive_plan"),
            )

        session_data["system_prompt"] = system_prompt

        # Generate AI's opening message
        opening = self._call_llm([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Start the session. Welcome {candidate_name} and begin."},
        ])

        session_data["messages"].append({
            "role": "assistant", "content": opening,
            "timestamp": now.isoformat(), "phase": session_data["current_phase"],
        })

        self._save_json(self._session_path(session_id), session_data)

        return {
            "success": True,
            "session_id": session_id,
            "level": actual_level,
            "level_name": actual_level.replace("_", " ").title(),
            "session_number": session_number,
            "topic": session_info["topic"],
            "session_type": session_type,
            "message": opening,
        }

    def respond(self, session_id: str, student_message: str) -> Dict:
        """Process student message and return AI teacher's response."""
        session = self._load_json(self._session_path(session_id))
        if not session:
            return {"error": "Session not found", "success": False}
        if session.get("status") != "active":
            return {"error": "Session is no longer active", "success": False}

        # Update elapsed time
        started = session.get("started_at", "")
        if started:
            try:
                start_dt = datetime.fromisoformat(started.replace("Z", "+00:00"))
                elapsed = (datetime.now(timezone.utc) - start_dt).total_seconds() / 60
                session["elapsed_minutes"] = round(elapsed, 1)
            except Exception:
                pass

        # Add student message
        session["messages"].append({
            "role": "user", "content": student_message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # Build LLM messages
        llm_messages = [{"role": "system", "content": session.get("system_prompt", "")}]

        # Add time context
        elapsed = session.get("elapsed_minutes", 0)
        max_time = SESSION_DURATION_MINUTES + SESSION_MAX_EXTENSION_MINUTES
        time_note = ""
        if elapsed >= SESSION_DURATION_MINUTES:
            time_note = (
                f"\n[SYSTEM NOTE: We are at {elapsed:.0f} minutes. "
                f"Maximum is {max_time} minutes. Start wrapping up — "
                f"summarize key points and close the session.]"
            )
        elif elapsed >= SESSION_DURATION_MINUTES - 10:
            time_note = (
                f"\n[SYSTEM NOTE: We are at {elapsed:.0f} minutes. "
                f"About 10 minutes left. Move to summary and review phase soon.]"
            )

        # Add conversation history (last 20 messages for context window)
        for msg in session["messages"][-20:]:
            llm_messages.append({"role": msg["role"], "content": msg["content"]})

        if time_note:
            llm_messages.append({"role": "system", "content": time_note})

        # Generate response
        response = self._call_llm(llm_messages)

        session["messages"].append({
            "role": "assistant", "content": response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # Auto-end check
        should_end = elapsed >= max_time
        if should_end:
            session["status"] = "auto_ended"

        self._save_json(self._session_path(session_id), session)

        return {
            "success": True,
            "session_id": session_id,
            "message": response,
            "elapsed_minutes": round(elapsed, 1),
            "max_minutes": max_time,
            "status": session["status"],
        }

    def end_session(self, session_id: str) -> Dict:
        """End a session and update progress."""
        session = self._load_json(self._session_path(session_id))
        if not session:
            return {"error": "Session not found", "success": False}

        session["status"] = "completed"
        session["ended_at"] = datetime.now(timezone.utc).isoformat()

        # Update progress
        self._advance_progress(
            session["candidate_id"],
            session_id,
            session["level"],
            session["session_number"],
        )

        # After test discussion, compute and save the adaptive plan
        self._save_adaptive_plan(
            session["candidate_id"],
            session["level"],
            session.get("session_type", "teaching"),
        )

        self._save_json(self._session_path(session_id), session)

        # Check if this was a level_test session
        session_type = session.get("session_type", "teaching")
        if session_type == "level_test":
            level = session.get("level", "basic")
            return {
                "success": True,
                "session_id": session_id,
                "status": "completed",
                "level_test_required": True,
                "message": (
                    f"Congratulations on completing all {level.replace('_', ' ').title()} sessions! "
                    f"Now take the level test to advance. You need 80%+ to unlock the next level."
                ),
                "test_endpoint": "/english/test/start",
                "test_level": level,
            }

        return {
            "success": True,
            "session_id": session_id,
            "status": "completed",
            "message": "Session completed! Great work today.",
        }

    def get_session_history(self, candidate_id: str) -> List[Dict]:
        """Get all session summaries for a student."""
        sessions = []
        for f in sorted(self.data_dir.glob("session_*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if data.get("candidate_id") == candidate_id:
                    sessions.append({
                        "session_id": data.get("session_id"),
                        "level": data.get("level"),
                        "session_number": data.get("session_number"),
                        "topic": data.get("topic"),
                        "session_type": data.get("session_type"),
                        "status": data.get("status"),
                        "started_at": data.get("started_at"),
                        "ended_at": data.get("ended_at"),
                        "message_count": len(data.get("messages", [])),
                    })
            except Exception:
                continue
        return sessions

    def get_progress(self, candidate_id: str) -> Dict:
        """Get student's overall syllabus progress."""
        progress = self._get_progress(candidate_id)
        current_level = progress.get("current_level", "basic")

        # Calculate completion percentages
        level_completion = {}
        for lvl in LEVELS:
            total = len(SYLLABUS.get(lvl, []))
            done = sum(
                1 for s in progress.get("completed_sessions", [])
                if s.get("level") == lvl
            )
            level_completion[lvl] = {
                "completed": done, "total": total,
                "percentage": round(done / total * 100, 1) if total else 0,
            }

        overall_total = sum(len(SYLLABUS.get(l, [])) for l in LEVELS)
        overall_done = progress.get("total_sessions_completed", 0)

        next_topic = ""
        if current_level in LEVELS:
            sn = progress.get("current_session_number", 1)
            syllabus = SYLLABUS.get(current_level, [])
            if 0 < sn <= len(syllabus):
                next_topic = syllabus[sn - 1]["topic"]

        return {
            "candidate_id": candidate_id,
            "current_level": current_level,
            "current_level_name": current_level.replace("_", " ").title(),
            "current_session_number": progress.get("current_session_number", 1),
            "next_topic": next_topic,
            "level_completion": level_completion,
            "overall_completion": {
                "completed": overall_done, "total": overall_total,
                "percentage": round(overall_done / overall_total * 100, 1) if overall_total else 0,
            },
            "completed_sessions": progress.get("completed_sessions", []),
        }

    def get_syllabus(self, level: Optional[str] = None) -> Dict:
        """Return the full syllabus, optionally filtered by level."""
        if level:
            level = level.strip().lower()
            if level not in LEVELS:
                return {"error": f"Invalid level. Must be one of: {LEVELS}"}
            return {
                "level": level,
                "level_name": level.replace("_", " ").title(),
                "sessions": SYLLABUS.get(level, []),
                "total_sessions": len(SYLLABUS.get(level, [])),
            }
        return {
            "levels": {
                lvl: {
                    "level_name": lvl.replace("_", " ").title(),
                    "sessions": SYLLABUS[lvl],
                    "total_sessions": len(SYLLABUS[lvl]),
                }
                for lvl in LEVELS
            },
            "total_sessions": sum(len(SYLLABUS[l]) for l in LEVELS),
        }


# ── Global singleton ──────────────────────────────────────────────────────────

_engine: Optional[EnglishTeacherEngine] = None


def get_english_teacher_engine() -> EnglishTeacherEngine:
    global _engine
    if _engine is None:
        _engine = EnglishTeacherEngine()
    return _engine
