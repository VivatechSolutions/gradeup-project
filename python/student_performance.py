"""
Student Performance Tracker for GradeUp AI Tutor

Tracks student performance across all AI Tutor interactions:
- Quiz scores (per section)
- Homework scores & points
- FAQ engagement
- Weakness detection for adaptive learning

Storage: JSON files in student_data/ directory (one file per student).
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone

STUDENT_DATA_DIR = Path("student_data")


class StudentPerformanceTracker:
    """
    Manages per-student performance data.

    Data structure per student file:
    {
        "candidate_id": "stu_001",
        "candidate_name": "John",
        "total_points": 450,
        "subjects": {
            "biology": {
                "units": {
                    "4": {
                        "unit_title": "Map Projections",
                        "sections": {
                            "MAP PROJECTION": {
                                "quiz_scores": [80, 90],
                                "homework_scores": [70],
                                "faq_views": 3,
                                "weakness_score": 0.35
                            }
                        },
                        "overall_score": 72.5,
                        "total_points": 250,
                        "quiz_count": 3,
                        "homework_count": 1
                    }
                }
            }
        },
        "points_history": [
            {"type": "quiz", "points": 80, "subject": "biology", "unit": 4, "timestamp": "..."},
            {"type": "homework", "points": 100, "subject": "biology", "unit": 4, "timestamp": "..."}
        ]
    }
    """

    def __init__(self, data_dir: Path = STUDENT_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _student_path(self, candidate_id: str) -> Path:
        safe_id = candidate_id.strip().lower().replace(" ", "_")
        return self.data_dir / f"{safe_id}.json"

    def _load(self, candidate_id: str) -> Dict[str, Any]:
        path = self._student_path(candidate_id)
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return {
            "candidate_id": candidate_id,
            "candidate_name": "",
            "total_points": 0,
            "subjects": {},
            "points_history": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def _save(self, candidate_id: str, data: Dict[str, Any]) -> None:
        path = self._student_path(candidate_id)
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _ensure_unit(
        self,
        data: Dict[str, Any],
        subject: str,
        unit_number: int,
        unit_title: str = "",
    ) -> Dict[str, Any]:
        """Ensure the nested subject > unit structure exists."""
        subj = subject.strip().lower()
        unit_key = str(unit_number)

        if subj not in data["subjects"]:
            data["subjects"][subj] = {"units": {}}

        if unit_key not in data["subjects"][subj]["units"]:
            data["subjects"][subj]["units"][unit_key] = {
                "unit_title": unit_title,
                "sections": {},
                "overall_score": 0.0,
                "total_points": 0,
                "quiz_count": 0,
                "homework_count": 0,
            }
        elif unit_title and not data["subjects"][subj]["units"][unit_key].get("unit_title"):
            data["subjects"][subj]["units"][unit_key]["unit_title"] = unit_title

        return data["subjects"][subj]["units"][unit_key]

    def _ensure_section(
        self, unit_data: Dict[str, Any], section_title: str
    ) -> Dict[str, Any]:
        """Ensure a section entry exists in the unit."""
        if section_title not in unit_data["sections"]:
            unit_data["sections"][section_title] = {
                "quiz_scores": [],
                "homework_scores": [],
                "debate_scores": [],
                "seminar_scores": [],
                "faq_views": 0,
                "weakness_score": 0.5,  # default: neutral
            }
        return unit_data["sections"][section_title]

    def _recalculate_weakness(self, section_data: Dict[str, Any]) -> float:
        """
        Calculate weakness score for a section (0.0 = strong, 1.0 = weak).
        Based on average scores; fewer attempts = higher weakness (less confidence).
        """
        all_scores = (
            section_data.get("quiz_scores", []) +
            section_data.get("homework_scores", []) +
            section_data.get("debate_scores", []) +
            section_data.get("seminar_scores", [])
        )
        if not all_scores:
            return 0.7  # No data → assume moderately weak

        avg = sum(all_scores) / len(all_scores)
        # Fewer attempts means less confidence → inflate weakness slightly
        confidence_factor = min(1.0, len(all_scores) / 5.0)
        # weakness = 1 - (normalized_score * confidence)
        weakness = 1.0 - (avg / 100.0) * confidence_factor
        return round(max(0.0, min(1.0, weakness)), 3)

    def _recalculate_unit_overall(self, unit_data: Dict[str, Any]) -> None:
        """Recalculate the unit's overall score from all section scores."""
        all_scores = []
        for sec in unit_data["sections"].values():
            all_scores.extend(sec.get("quiz_scores", []))
            all_scores.extend(sec.get("homework_scores", []))
            all_scores.extend(sec.get("debate_scores", []))
            all_scores.extend(sec.get("seminar_scores", []))
        if all_scores:
            unit_data["overall_score"] = round(sum(all_scores) / len(all_scores), 2)

    # ── Public API ────────────────────────────────────────────────────────────

    def record_quiz_score(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        section_scores: Dict[str, float],
        total_score: float,
        points: int = 0,
        unit_title: str = "",
        candidate_name: str = "",
    ) -> None:
        """
        Record quiz results per section.

        Args:
            section_scores: {"MAP PROJECTION": 80.0, "NEED FOR MAP PROJECTION": 60.0}
            total_score: overall quiz percentage
            points: points earned from this quiz
        """
        data = self._load(candidate_id)
        if candidate_name:
            data["candidate_name"] = candidate_name

        unit_data = self._ensure_unit(data, subject, unit_number, unit_title)
        unit_data["quiz_count"] = unit_data.get("quiz_count", 0) + 1

        for section_title, score in section_scores.items():
            sec = self._ensure_section(unit_data, section_title)
            sec["quiz_scores"].append(round(score, 2))
            sec["weakness_score"] = self._recalculate_weakness(sec)

        if points > 0:
            unit_data["total_points"] = unit_data.get("total_points", 0) + points
            data["total_points"] = data.get("total_points", 0) + points
            data.setdefault("points_history", []).append({
                "type": "quiz",
                "points": points,
                "subject": subject,
                "unit": unit_number,
                "score": total_score,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        self._recalculate_unit_overall(unit_data)
        self._save(candidate_id, data)

    def record_homework_score(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        section_scores: Dict[str, float],
        total_score: float,
        points: int = 0,
        unit_title: str = "",
        candidate_name: str = "",
    ) -> None:
        """Record homework results per section."""
        data = self._load(candidate_id)
        if candidate_name:
            data["candidate_name"] = candidate_name

        unit_data = self._ensure_unit(data, subject, unit_number, unit_title)
        unit_data["homework_count"] = unit_data.get("homework_count", 0) + 1

        for section_title, score in section_scores.items():
            sec = self._ensure_section(unit_data, section_title)
            sec["homework_scores"].append(round(score, 2))
            sec["weakness_score"] = self._recalculate_weakness(sec)

        if points > 0:
            unit_data["total_points"] = unit_data.get("total_points", 0) + points
            data["total_points"] = data.get("total_points", 0) + points
            data.setdefault("points_history", []).append({
                "type": "homework",
                "points": points,
                "subject": subject,
                "unit": unit_number,
                "score": total_score,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        self._recalculate_unit_overall(unit_data)
        self._save(candidate_id, data)

    def record_debate_score(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        section_scores: Dict[str, float],
        total_score: float,
        points: int = 0,
        unit_title: str = "",
        candidate_name: str = "",
    ) -> None:
        """Record debate results per section."""
        data = self._load(candidate_id)
        if candidate_name:
            data["candidate_name"] = candidate_name

        unit_data = self._ensure_unit(data, subject, unit_number, unit_title)
        unit_data["debate_count"] = unit_data.get("debate_count", 0) + 1

        for section_title, score in section_scores.items():
            sec = self._ensure_section(unit_data, section_title)
            if "debate_scores" not in sec:
                sec["debate_scores"] = []
            sec["debate_scores"].append(round(score, 2))
            sec["weakness_score"] = self._recalculate_weakness(sec)

        if points > 0:
            unit_data["total_points"] = unit_data.get("total_points", 0) + points
            data["total_points"] = data.get("total_points", 0) + points
            data.setdefault("points_history", []).append({
                "type": "debate",
                "points": points,
                "subject": subject,
                "unit": unit_number,
                "score": total_score,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        self._recalculate_unit_overall(unit_data)
        self._save(candidate_id, data)

    def record_seminar_score(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        section_scores: Dict[str, float],
        total_score: float,
        points: int = 0,
        unit_title: str = "",
        candidate_name: str = "",
    ) -> None:
        """Record seminar results per section."""
        data = self._load(candidate_id)
        if candidate_name:
            data["candidate_name"] = candidate_name

        unit_data = self._ensure_unit(data, subject, unit_number, unit_title)
        unit_data["seminar_count"] = unit_data.get("seminar_count", 0) + 1

        for section_title, score in section_scores.items():
            sec = self._ensure_section(unit_data, section_title)
            if "seminar_scores" not in sec:
                sec["seminar_scores"] = []
            sec["seminar_scores"].append(round(score, 2))
            sec["weakness_score"] = self._recalculate_weakness(sec)

        if points > 0:
            unit_data["total_points"] = unit_data.get("total_points", 0) + points
            data["total_points"] = data.get("total_points", 0) + points
            data.setdefault("points_history", []).append({
                "type": "seminar",
                "points": points,
                "subject": subject,
                "unit": unit_number,
                "score": total_score,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        self._recalculate_unit_overall(unit_data)
        self._save(candidate_id, data)

    def record_faq_view(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        section_title: str,
        unit_title: str = "",
        candidate_name: str = "",
    ) -> None:
        """Track that a student viewed FAQs for a section."""
        data = self._load(candidate_id)
        if candidate_name:
            data["candidate_name"] = candidate_name

        unit_data = self._ensure_unit(data, subject, unit_number, unit_title)
        sec = self._ensure_section(unit_data, section_title)
        sec["faq_views"] = sec.get("faq_views", 0) + 1
        self._save(candidate_id, data)

    def get_weak_sections(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
    ) -> List[Dict[str, Any]]:
        """
        Return sections sorted by weakness (most weak first).
        Used by homework & quiz engines to prioritize topics.
        """
        data = self._load(candidate_id)
        subj = subject.strip().lower()
        unit_key = str(unit_number)

        unit_data = data.get("subjects", {}).get(subj, {}).get("units", {}).get(unit_key, {})
        sections = unit_data.get("sections", {})

        result = []
        for section_title, sec in sections.items():
            result.append({
                "section_title": section_title,
                "weakness_score": sec.get("weakness_score", 0.5),
                "quiz_scores": sec.get("quiz_scores", []),
                "homework_scores": sec.get("homework_scores", []),
                "debate_scores": sec.get("debate_scores", []),
                "seminar_scores": sec.get("seminar_scores", []),
                "faq_views": sec.get("faq_views", 0),
            })

        # Sort by weakness_score descending (weakest first)
        result.sort(key=lambda x: x["weakness_score"], reverse=True)
        return result

    def get_performance(
        self,
        candidate_id: str,
        subject: Optional[str] = None,
        unit_number: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Get performance data for a student.
        - No filters: full overview
        - subject only: all units for that subject
        - subject + unit: detailed section breakdown
        """
        data = self._load(candidate_id)

        result = {
            "candidate_id": candidate_id,
            "candidate_name": data.get("candidate_name", ""),
            "total_points": data.get("total_points", 0),
        }

        if subject is None:
            # Overview: summarize by subject
            subjects_summary = {}
            for subj, subj_data in data.get("subjects", {}).items():
                units = subj_data.get("units", {})
                total_score = 0
                count = 0
                for u in units.values():
                    if u.get("overall_score", 0) > 0:
                        total_score += u["overall_score"]
                        count += 1
                subjects_summary[subj] = {
                    "units_studied": len(units),
                    "overall_score": round(total_score / count, 2) if count else 0,
                    "total_points": sum(u.get("total_points", 0) for u in units.values()),
                }
            result["subjects"] = subjects_summary
            return result

        subj = subject.strip().lower()
        subj_data = data.get("subjects", {}).get(subj, {"units": {}})

        if unit_number is None:
            # Subject-level: list all units
            units_summary = {}
            for unit_key, unit_data in subj_data.get("units", {}).items():
                units_summary[unit_key] = {
                    "unit_title": unit_data.get("unit_title", ""),
                    "overall_score": unit_data.get("overall_score", 0),
                    "total_points": unit_data.get("total_points", 0),
                    "quiz_count": unit_data.get("quiz_count", 0),
                    "homework_count": unit_data.get("homework_count", 0),
                    "debate_count": unit_data.get("debate_count", 0),
                    "seminar_count": unit_data.get("seminar_count", 0),
                    "sections_count": len(unit_data.get("sections", {})),
                }
            result["subject"] = subj
            result["units"] = units_summary
            return result

        # Unit-level: detailed section breakdown
        unit_key = str(unit_number)
        unit_data = subj_data.get("units", {}).get(unit_key, {})
        result["subject"] = subj
        result["unit_number"] = unit_number
        result["unit_title"] = unit_data.get("unit_title", "")
        result["overall_score"] = unit_data.get("overall_score", 0)
        result["total_points"] = unit_data.get("total_points", 0)
        result["quiz_count"] = unit_data.get("quiz_count", 0)
        result["homework_count"] = unit_data.get("homework_count", 0)
        result["debate_count"] = unit_data.get("debate_count", 0)
        result["seminar_count"] = unit_data.get("seminar_count", 0)
        result["sections"] = unit_data.get("sections", {})
        return result

    # ── Topic Tracking & Interaction History ──────────────────────────────────

    def record_topic_query(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        section_title: str,
        unit_title: str = "",
        candidate_name: str = "",
    ) -> int:
        """
        Track that a student asked about a specific section/topic in the AI Tutor.

        Returns the updated query count for this topic.
        """
        if not section_title or not section_title.strip():
            return 0

        data = self._load(candidate_id)
        if candidate_name:
            data["candidate_name"] = candidate_name

        unit_data = self._ensure_unit(data, subject, unit_number, unit_title)

        # Ensure topic_queries list exists
        if "topic_queries" not in unit_data:
            unit_data["topic_queries"] = []

        # Find existing topic entry or create new one
        normalized = section_title.strip().lower()
        found = False
        count = 0
        for tq in unit_data["topic_queries"]:
            if tq.get("section_title", "").strip().lower() == normalized:
                tq["count"] = tq.get("count", 0) + 1
                tq["last_asked"] = datetime.now(timezone.utc).isoformat()
                count = tq["count"]
                found = True
                break

        if not found:
            count = 1
            unit_data["topic_queries"].append({
                "section_title": section_title.strip(),
                "count": 1,
                "first_asked": datetime.now(timezone.utc).isoformat(),
                "last_asked": datetime.now(timezone.utc).isoformat(),
            })

        # Also bump the section's weakness if it doesn't exist yet (marks it as studied)
        self._ensure_section(unit_data, section_title.strip())

        self._save(candidate_id, data)
        return count

    def get_focus_topics(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        min_count: int = 4,
    ) -> List[Dict[str, Any]]:
        """
        Return topics the student has asked about >= min_count times.

        These are "struggle topics" — the student keeps asking, so homework
        should target them. Sorted by count descending (most repeated first).
        """
        data = self._load(candidate_id)
        subj = subject.strip().lower()
        unit_key = str(unit_number)

        unit_data = (
            data.get("subjects", {})
            .get(subj, {})
            .get("units", {})
            .get(unit_key, {})
        )
        topic_queries = unit_data.get("topic_queries", [])

        focus = [
            tq for tq in topic_queries
            if tq.get("count", 0) >= min_count
        ]
        focus.sort(key=lambda x: x.get("count", 0), reverse=True)
        return focus

    def record_tutor_interaction(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        topic: str,
        query_summary: str = "",
        candidate_name: str = "",
        unit_title: str = "",
    ) -> None:
        """Log an AI Tutor interaction into the unified interaction_history."""
        data = self._load(candidate_id)
        if candidate_name:
            data["candidate_name"] = candidate_name

        data.setdefault("interaction_history", []).append({
            "type": "tutor_query",
            "subject": subject,
            "unit_number": unit_number,
            "unit_title": unit_title,
            "topic": topic,
            "query_summary": query_summary[:120] if query_summary else "",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # Keep the history from growing unbounded (last 200 events)
        if len(data["interaction_history"]) > 200:
            data["interaction_history"] = data["interaction_history"][-200:]

        self._save(candidate_id, data)

    def record_homework_assignment(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        homework_id: str,
        topics: List[str],
        difficulty: str = "",
        unit_title: str = "",
    ) -> None:
        """Log a homework assignment event into the unified interaction_history."""
        data = self._load(candidate_id)

        data.setdefault("interaction_history", []).append({
            "type": "homework_assigned",
            "subject": subject,
            "unit_number": unit_number,
            "unit_title": unit_title,
            "homework_id": homework_id,
            "topics": topics,
            "difficulty": difficulty,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        if len(data["interaction_history"]) > 200:
            data["interaction_history"] = data["interaction_history"][-200:]

        self._save(candidate_id, data)

    def get_total_points(self, candidate_id: str) -> int:
        """Get the student's total accumulated points."""
        data = self._load(candidate_id)
        return data.get("total_points", 0)

    def get_points_history(self, candidate_id: str) -> List[Dict[str, Any]]:
        """Get the student's points earning history."""
        data = self._load(candidate_id)
        return data.get("points_history", [])

    def get_all_section_titles(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
    ) -> List[str]:
        """Get all section titles that the student has performance data for."""
        data = self._load(candidate_id)
        subj = subject.strip().lower()
        unit_key = str(unit_number)
        unit_data = data.get("subjects", {}).get(subj, {}).get("units", {}).get(unit_key, {})
        return list(unit_data.get("sections", {}).keys())


# ── Global singleton ──────────────────────────────────────────────────────────

_tracker: Optional[StudentPerformanceTracker] = None


def get_performance_tracker() -> StudentPerformanceTracker:
    global _tracker
    if _tracker is None:
        _tracker = StudentPerformanceTracker()
    return _tracker
