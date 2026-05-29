"""
Topic Recommender for GradeUp AI Debate & Seminar

Intelligently selects topics based on:
- Question bank frequency (most-asked topics across previous year papers)
- Student performance history (weak topics first, skip strong ones)
- RAG context from Qdrant vector DB

Used by: debate_engine.py, multi_debate_engine.py, seminar_engine.py
"""

import os
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from collections import Counter

QUESTION_BANK_DIR = Path("question_bank")
OUTPUTS_DIR = Path("outputs")

# Section types from structured.json that are NOT real curriculum topics
# These should be excluded when building the topic queue
EXCLUDED_SECTION_TYPES = {
    "evaluation", "unit_exercise", "activity", "ict corner",
    "points to remember", "points_to_remember",
}

# Regex to strip leading numbering like "1.1 ", "1.2.3 ", "Unit 1 ", etc.
_NUMBERING_PREFIX_RE = re.compile(
    r'^(?:\d+(?:\.\d+)*\s+|unit\s+\d+\s+)', re.IGNORECASE
)


def _normalize_topic_key(title: str) -> str:
    """Normalize a topic title for deduplication.

    Strips leading numbering prefixes (e.g. '1.1 ', '1.2.3 ') and
    lowercases so that 'Density' and '1.1 Density' are treated as the
    same topic.
    """
    title = title.strip()
    title = _NUMBERING_PREFIX_RE.sub('', title)
    return title.strip().lower()


def _strip_topic_number(title: str) -> str:
    """Strip leading numbering prefix for display purposes.

    '1.2 Area' → 'Area', '1.3 Volume' → 'Volume'
    Preserves original casing (unlike _normalize_topic_key).
    """
    title = title.strip()
    return _NUMBERING_PREFIX_RE.sub('', title).strip()


class TopicRecommender:
    """
    Recommends important topics for Debate/Seminar sessions
    by cross-referencing question bank data with student performance.
    """

    def __init__(self):
        self.question_bank_dir = QUESTION_BANK_DIR

    # ── Question Bank Analysis ────────────────────────────────────────────────

    def get_important_topics(
        self,
        subject: str,
        unit_number: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Analyze question bank to find most frequently asked topics.

        Returns topics ranked by frequency across all previous year papers.
        Each entry: {topic, section_title, unit_number, unit_title, frequency,
                     difficulty_distribution, years_appeared}
        """
        topic_counter: Counter = Counter()
        topic_details: Dict[str, Dict[str, Any]] = {}

        for path in self.question_bank_dir.glob("*.json"):
            try:
                paper = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue

            # Filter by subject
            paper_subject = (paper.get("subject") or "").strip().lower()
            if paper_subject != subject.strip().lower():
                continue

            # Filter by unit if specified
            if unit_number is not None and paper.get("unit_number") is not None:
                if paper.get("unit_number") != unit_number:
                    pass  # Still include for cross-unit frequency

            paper_year = paper.get("year", "unknown")

            for q in paper.get("questions", []):
                q_unit = q.get("unit_number", paper.get("unit_number"))

                # If filtering by unit, only count matching questions
                if unit_number is not None and q_unit != unit_number:
                    continue

                section = q.get("section_title", "General")
                topic = q.get("topic", section)
                difficulty = q.get("difficulty", "medium")

                # ── Filter out non-topic section types ────────────────
                section_lower = section.strip().lower()
                if any(section_lower.startswith(exc) or section_lower == exc
                       for exc in EXCLUDED_SECTION_TYPES):
                    continue

                key = f"{q_unit}::{section}::{topic}".lower()
                topic_counter[key] += 1

                if key not in topic_details:
                    topic_details[key] = {
                        "topic": topic,
                        "section_title": section,
                        "unit_number": q_unit,
                        "unit_title": "",
                        "frequency": 0,
                        "difficulty_distribution": {"easy": 0, "medium": 0, "hard": 0},
                        "years_appeared": set(),
                    }

                topic_details[key]["frequency"] += 1
                topic_details[key]["difficulty_distribution"][difficulty] = (
                    topic_details[key]["difficulty_distribution"].get(difficulty, 0) + 1
                )
                topic_details[key]["years_appeared"].add(paper_year)

        # Build sorted result — deduplicated by section_title
        seen_sections: Set[str] = set()
        result = []
        for key, count in topic_counter.most_common():
            detail = topic_details[key]
            detail["years_appeared"] = sorted(detail["years_appeared"])

            # Deduplicate by section_title (normalized — strips numbering prefixes)
            sec_key = _normalize_topic_key(detail["section_title"])
            if sec_key in seen_sections:
                continue
            seen_sections.add(sec_key)

            result.append(detail)

        return result

    # ── Structured.json Topic Extraction ────────────────────────────────────────

    def get_structured_topics(
        self,
        subject: str,
        unit_number: Optional[int] = None,
        board: Optional[str] = None,
        class_number: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Extract real curriculum section topics from structured.json files.

        Only includes sections with type="section" and meaningful titles
        (skips generic "Introduction" mindmap, "Unit X" header sections, etc.).
        """
        import orjson

        topics: List[Dict[str, Any]] = []
        seen_titles: Set[str] = set()

        if not OUTPUTS_DIR.exists():
            return topics

        for doc_dir in OUTPUTS_DIR.iterdir():
            if not doc_dir.is_dir():
                continue

            # Optional board/class filter via metadata
            metadata_path = doc_dir / "metadata.json"
            if metadata_path.exists():
                try:
                    meta = orjson.loads(metadata_path.read_bytes())
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
                except Exception:
                    pass

            structured_path = doc_dir / "structured.json"
            if not structured_path.exists():
                continue

            try:
                data = orjson.loads(structured_path.read_bytes())
                units = data.get("units", [data]) if "units" in data else [data]

                for unit in units:
                    u_num = unit.get("unit_number")
                    if unit_number is not None and u_num != unit_number:
                        continue

                    for section in unit.get("sections", []):
                        sec_type = (section.get("type") or "").lower()
                        sec_title = (section.get("title") or "").strip()

                        # Only include real "section" type entries
                        if sec_type != "section":
                            continue

                        # Skip generic/header sections
                        title_lower = sec_title.lower()
                        if not sec_title:
                            continue
                        if title_lower.startswith("unit "):
                            continue
                        if title_lower == "introduction":
                            continue
                        if "note on" in title_lower:
                            continue

                        # Deduplicate (normalized — strips numbering prefixes)
                        norm_key = _normalize_topic_key(sec_title)
                        if norm_key in seen_titles:
                            continue
                        seen_titles.add(norm_key)

                        topics.append({
                            "topic": sec_title,
                            "section_title": sec_title,
                            "unit_number": u_num,
                            "unit_title": unit.get("title", ""),
                            "frequency": 0,
                            "difficulty_distribution": {"easy": 0, "medium": 0, "hard": 0},
                            "years_appeared": [],
                            "source": "structured",
                        })
            except Exception:
                continue

        return topics

    # ── Student-Aware Recommendations ─────────────────────────────────────────

    def get_student_topic_recommendations(
        self,
        candidate_id: str,
        subject: str,
        unit_number: Optional[int] = None,
        board: Optional[str] = None,
        class_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cross-reference important topics with student's performance.

        Returns:
        {
            "weak_topics": [...],        # scored <= 50, need revisiting
            "unattempted_topics": [...],  # never attempted (from question bank)
            "structured_only_topics": [...], # from structured.json, lowest priority
            "strong_topics": [...],       # scored > 50, can skip
            "suggestions": [...]          # ordered flow for the session
        }

        Priority order: weak → unattempted QB → structured-only → strong
        """
        from student_performance import get_performance_tracker

        tracker = get_performance_tracker()
        important_topics = self.get_important_topics(subject, unit_number)

        # Get structured.json topics and merge those not already in QB
        structured_topics = self.get_structured_topics(
            subject, unit_number, board, class_number
        )
        qb_section_titles = {
            _normalize_topic_key(t.get("section_title", "")) for t in important_topics
        }
        extra_structured = [
            t for t in structured_topics
            if _normalize_topic_key(t.get("section_title", "")) not in qb_section_titles
        ]

        # Get student's performance data
        student_data = tracker._load(candidate_id)
        subj_key = subject.strip().lower()
        subj_data = student_data.get("subjects", {}).get(subj_key, {})

        weak_topics = []
        unattempted_topics = []
        strong_topics = []

        def _classify_topic(topic_info: Dict) -> None:
            """Classify a topic as weak/unattempted/strong based on student data."""
            t_unit = topic_info.get("unit_number")
            t_section = topic_info.get("section_title", "")
            unit_key = str(t_unit) if t_unit is not None else ""

            unit_data = subj_data.get("units", {}).get(unit_key, {})
            sections = unit_data.get("sections", {})

            matched_section = None
            for sec_key, sec_data in sections.items():
                if sec_key.strip().lower() == t_section.strip().lower():
                    matched_section = sec_data
                    break

            if matched_section is None:
                unattempted_topics.append({
                    **topic_info,
                    "status": "unattempted",
                    "prompt_message": None,
                })
                return

            all_scores = (
                matched_section.get("quiz_scores", [])
                + matched_section.get("homework_scores", [])
            )
            avg_score = sum(all_scores) / len(all_scores) if all_scores else 0

            entry = {
                **topic_info,
                "student_score": round(avg_score, 2),
                "attempts": len(all_scores),
            }

            if avg_score <= 50:
                entry["status"] = "weak"
                entry["prompt_message"] = (
                    f"🌟 High-priority topic: '{t_section}'. "
                    f"You scored {round(avg_score)}% earlier. "
                    f"Would you like to try it again for mastery, or move to the next important thing?"
                )
                weak_topics.append(entry)
            else:
                entry["status"] = "strong"
                entry["prompt_message"] = None
                strong_topics.append(entry)

        # Classify QB-based topics
        for topic_info in important_topics:
            _classify_topic(topic_info)

        # Classify structured-only topics separately (for ordering)
        structured_only_weak = []
        structured_only_unattempted = []
        structured_only_strong = []
        prev_counts = (len(weak_topics), len(unattempted_topics), len(strong_topics))
        for topic_info in extra_structured:
            _classify_topic(topic_info)
        # Separate the newly added ones
        structured_only_weak = weak_topics[prev_counts[0]:]
        structured_only_unattempted = unattempted_topics[prev_counts[1]:]
        structured_only_strong = strong_topics[prev_counts[2]:]
        # Remove them from the main lists — we'll add them back in correct order
        weak_topics = weak_topics[:prev_counts[0]]
        unattempted_topics = unattempted_topics[:prev_counts[1]]
        strong_topics = strong_topics[:prev_counts[2]]

        # Build ordered suggestion flow:
        # 1. Weak QB topics first (most important → least)
        # 2. Unattempted QB topics
        # 3. Structured-only topics (lowest priority, all statuses)
        # 4. Strong topics last
        structured_only_all = structured_only_weak + structured_only_unattempted + structured_only_strong

        suggestions = (
            weak_topics
            + unattempted_topics
            + structured_only_all
            + strong_topics
        )

        return {
            "weak_topics": weak_topics + structured_only_weak,
            "unattempted_topics": unattempted_topics + structured_only_unattempted,
            "strong_topics": strong_topics + structured_only_strong,
            "structured_only_topics": structured_only_all,
            "suggestions": suggestions,
            "total_important_topics": len(important_topics) + len(extra_structured),
        }

    # ── RAG Context Retrieval ─────────────────────────────────────────────────

    def get_topic_rag_context(
        self,
        subject: str,
        unit_number: int,
        section_title: str = "",
        board: Optional[str] = None,
        class_number: Optional[str] = None,
        limit: int = 5,
    ) -> str:
        """
        Retrieve RAG context from Qdrant for a specific topic.
        Used to seed debate/seminar AI responses with textbook content.
        """
        try:
            from qdrant_integration import search_qdrant
        except ImportError:
            return ""

        query = section_title if section_title else subject

        base_collection = os.environ.get("QDRANT_COLLECTION_NAME", "GradeupAI_Books")
        all_results = []

        for collection_name in (base_collection, f"{base_collection}_Enriched"):
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
            except Exception:
                pass

        if not all_results:
            return ""

        # Deduplicate and format
        seen = set()
        parts = []
        for r in all_results:
            text = r.get("text", "").strip()
            fingerprint = text[:200]
            if fingerprint in seen:
                continue
            seen.add(fingerprint)

            meta = r.get("metadata", {})
            source = meta.get("section_title") or meta.get("content_type") or "content"
            unit = meta.get("unit_number", "?")
            parts.append(f"[Unit {unit} — {source}]\n{text}")

        return "\n\n---\n\n".join(parts[:limit])

    def get_debate_topic_from_rag(
        self,
        subject: str,
        unit_number: int,
        section_title: str = "",
        board: Optional[str] = None,
        class_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a specific debate topic from RAG context.
        Returns a structured topic with title and context.
        """
        context = self.get_topic_rag_context(
            subject=subject,
            unit_number=unit_number,
            section_title=section_title,
            board=board,
            class_number=class_number,
            limit=3,
        )

        return {
            "section_title": section_title,
            "unit_number": unit_number,
            "context": context,
        }


# ── Global singleton ──────────────────────────────────────────────────────

_recommender: Optional[TopicRecommender] = None


def get_topic_recommender() -> TopicRecommender:
    global _recommender
    if _recommender is None:
        _recommender = TopicRecommender()
    return _recommender
