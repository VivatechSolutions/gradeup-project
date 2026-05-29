"""
Premium PDF Report Generator for GradeUp AI Debate & Seminar

Generates attractive, parent-ready PDF reports with:
- Branding header with student info and session details
- Color-coded score cards with progress bars
- Per-criterion breakdown tables
- Detailed analysis (per-turn for debate, topic coverage for seminar)
- Warnings/violations section
- AI-generated recommendations
- Premium navy/gold/white design

Uses reportlab for PDF generation.
"""
from __future__ import annotations

import io
import math
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime


try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm, cm
    from reportlab.lib.colors import (
        HexColor, white, black, Color
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, KeepTogether
    )
    from reportlab.graphics.shapes import Drawing, Rect, String
    from reportlab.graphics import renderPDF
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    print("⚠️  reportlab not installed. PDF reports unavailable. pip install reportlab")

# ── Design Tokens ─────────────────────────────────────────────────────────

NAVY = HexColor("#1B2A4A") if REPORTLAB_AVAILABLE else None
GOLD = HexColor("#C9A84C") if REPORTLAB_AVAILABLE else None
LIGHT_GOLD = HexColor("#F5E6B8") if REPORTLAB_AVAILABLE else None
DARK_BG = HexColor("#0F1C35") if REPORTLAB_AVAILABLE else None
LIGHT_BG = HexColor("#F8F9FC") if REPORTLAB_AVAILABLE else None
SUCCESS_GREEN = HexColor("#27AE60") if REPORTLAB_AVAILABLE else None
WARNING_ORANGE = HexColor("#F39C12") if REPORTLAB_AVAILABLE else None
DANGER_RED = HexColor("#E74C3C") if REPORTLAB_AVAILABLE else None
SOFT_GRAY = HexColor("#BDC3C7") if REPORTLAB_AVAILABLE else None
TEXT_DARK = HexColor("#2C3E50") if REPORTLAB_AVAILABLE else None
TEXT_LIGHT = HexColor("#7F8C8D") if REPORTLAB_AVAILABLE else None

REPORTS_DIR = Path("reports")


def _get_score_color(score: float, max_score: float) -> Any:
    """Return a color based on percentage score."""
    if not REPORTLAB_AVAILABLE:
        return None
    pct = (score / max_score * 100) if max_score > 0 else 0
    if pct >= 70:
        return SUCCESS_GREEN
    elif pct >= 40:
        return WARNING_ORANGE
    return DANGER_RED


def _get_grade(score: float) -> str:
    """Convert score to letter grade."""
    if score >= 90:
        return "A+"
    elif score >= 80:
        return "A"
    elif score >= 70:
        return "B+"
    elif score >= 60:
        return "B"
    elif score >= 50:
        return "C"
    elif score >= 40:
        return "D"
    return "F"


class ReportGenerator:
    """Generates premium PDF reports for debate and seminar sessions."""

    def __init__(self, reports_dir: Path = REPORTS_DIR):
        self.reports_dir = reports_dir
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def _create_styles(self) -> Dict[str, Any]:
        """Create custom paragraph styles."""
        base = getSampleStyleSheet()

        styles = {
            "title": ParagraphStyle(
                "ReportTitle",
                parent=base["Title"],
                fontName="Helvetica-Bold",
                fontSize=22,
                textColor=NAVY,
                spaceAfter=4 * mm,
                alignment=TA_CENTER,
            ),
            "subtitle": ParagraphStyle(
                "ReportSubtitle",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=12,
                textColor=TEXT_LIGHT,
                spaceAfter=6 * mm,
                alignment=TA_CENTER,
            ),
            "section_header": ParagraphStyle(
                "SectionHeader",
                parent=base["Heading2"],
                fontName="Helvetica-Bold",
                fontSize=14,
                textColor=NAVY,
                spaceBefore=8 * mm,
                spaceAfter=4 * mm,
                borderWidth=0,
                borderColor=GOLD,
                borderPadding=0,
            ),
            "body": ParagraphStyle(
                "BodyText",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=10,
                textColor=TEXT_DARK,
                spaceAfter=3 * mm,
                leading=14,
            ),
            "body_bold": ParagraphStyle(
                "BodyBold",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=10,
                textColor=TEXT_DARK,
                spaceAfter=2 * mm,
            ),
            "small": ParagraphStyle(
                "SmallText",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=8,
                textColor=TEXT_LIGHT,
                spaceAfter=2 * mm,
            ),
            "score_big": ParagraphStyle(
                "ScoreBig",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=36,
                textColor=NAVY,
                alignment=TA_CENTER,
            ),
            "grade": ParagraphStyle(
                "Grade",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=18,
                textColor=GOLD,
                alignment=TA_CENTER,
            ),
            "warning": ParagraphStyle(
                "Warning",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=10,
                textColor=DANGER_RED,
                spaceAfter=3 * mm,
                leftIndent=10,
            ),
            "recommendation": ParagraphStyle(
                "Recommendation",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=10,
                textColor=TEXT_DARK,
                spaceAfter=2 * mm,
                leftIndent=10,
                bulletIndent=0,
            ),
        }
        return styles

    def _draw_score_bar(self, score: float, max_score: float, width: float = 120) -> Drawing:
        """Create a visual score bar."""
        height = 12
        d = Drawing(width + 40, height + 4)

        # Background bar
        d.add(Rect(0, 2, width, height, fillColor=HexColor("#ECF0F1"), strokeColor=None))

        # Score bar
        pct = min(1.0, score / max_score) if max_score > 0 else 0
        bar_color = _get_score_color(score, max_score)
        d.add(Rect(0, 2, width * pct, height, fillColor=bar_color, strokeColor=None))

        # Score text
        d.add(String(width + 5, 4, f"{score:.0f}/{max_score:.0f}",
                      fontName="Helvetica-Bold", fontSize=9, fillColor=TEXT_DARK))

        return d

    def _build_info_table(
        self,
        session_type: str,
        candidate_name: str,
        subject: str,
        unit_info: str,
        topic: str,
        date_str: str,
        total_turns: int = 0,
        styles: Dict = None,
    ) -> Table:
        """Build the session info table at the top."""
        s = styles or self._create_styles()

        data = [
            [
                Paragraph(f"<b>Student:</b> {candidate_name}", s["body"]),
                Paragraph(f"<b>Session Type:</b> {session_type}", s["body"]),
            ],
            [
                Paragraph(f"<b>Subject:</b> {subject}", s["body"]),
                Paragraph(f"<b>Unit:</b> {unit_info}", s["body"]),
            ],
            [
                Paragraph(f"<b>Topic:</b> {topic}", s["body"]),
                Paragraph(f"<b>Date:</b> {date_str}", s["body"]),
            ],
        ]

        if total_turns:
            data.append([
                Paragraph(f"<b>Total Turns:</b> {total_turns}", s["body"]),
                Paragraph("", s["body"]),
            ])

        page_width = A4[0] - 40 * mm
        t = Table(data, colWidths=[page_width * 0.5, page_width * 0.5])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_DARK),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("BOX", (0, 0), (-1, -1), 0.5, SOFT_GRAY),
            ("LINEBELOW", (0, 0), (-1, -2), 0.25, SOFT_GRAY),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ]))
        return t

    def _build_score_card(
        self,
        scores: Dict[str, Any],
        criteria: List[Dict[str, Any]],
        styles: Dict,
    ) -> List:
        """Build the score breakdown section with visual bars."""
        elements = []

        # Big score display
        total = scores.get("total_score", 0)
        max_total = sum(c["max"] for c in criteria)
        grade = _get_grade(total / max_total * 100 if max_total else 0)

        score_data = [[
            Paragraph(f"<font size='36' color='{NAVY}'><b>{total}</b></font>", styles["score_big"]),
            Paragraph(f"<font size='14' color='{TEXT_LIGHT}'>/ {max_total}</font>", styles["body"]),
            Paragraph(f"<font size='20' color='{GOLD}'><b>Grade: {grade}</b></font>", styles["grade"]),
        ]]
        score_table = Table(score_data, colWidths=[80, 50, 150])
        score_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(score_table)
        elements.append(Spacer(1, 6 * mm))

        # Per-criterion bars
        bar_data = [
            [
                Paragraph("<b>Criterion</b>", styles["body_bold"]),
                Paragraph("<b>Score</b>", styles["body_bold"]),
                "",
            ]
        ]

        for criterion in criteria:
            name = criterion["label"]
            key = criterion["key"]
            max_val = criterion["max"]
            val = scores.get(key, 0)

            bar_data.append([
                Paragraph(name, styles["body"]),
                Paragraph(f"{val}/{max_val}", styles["body"]),
                self._draw_score_bar(val, max_val),
            ])

        page_width = A4[0] - 40 * mm
        bar_table = Table(
            bar_data,
            colWidths=[page_width * 0.3, page_width * 0.15, page_width * 0.55],
        )
        bar_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("BACKGROUND", (0, 1), (-1, -1), white),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_BG]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("BOX", (0, 0), (-1, -1), 0.5, SOFT_GRAY),
            ("LINEBELOW", (0, 0), (-1, -1), 0.25, SOFT_GRAY),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(bar_table)

        return elements

    # ── Public API ────────────────────────────────────────────────────────────

    def generate_debate_report(self, session_data: Dict[str, Any]) -> Path:
        """Generate a premium PDF report for a 1-on-1 debate session."""
        if not REPORTLAB_AVAILABLE:
            raise ImportError("reportlab is required. pip install reportlab")

        styles = self._create_styles()
        session_id = session_data.get("session_id", "unknown")
        filename = f"debate_report_{session_id}.pdf"
        filepath = self.reports_dir / filename

        doc = SimpleDocTemplate(
            str(filepath), pagesize=A4,
            topMargin=20 * mm, bottomMargin=20 * mm,
            leftMargin=20 * mm, rightMargin=20 * mm,
        )

        elements = []
        scores = session_data.get("scores", {})
        msgs = session_data.get("messages", [])
        student_turns = sum(1 for m in msgs if m.get("role") == "student")

        # ── Header ────────────────────────────────────────────────────────
        elements.append(Paragraph("GradeUp AI", styles["subtitle"]))
        elements.append(Paragraph("📝 Debate Performance Report", styles["title"]))
        elements.append(HRFlowable(
            width="100%", thickness=2, color=GOLD,
            spaceAfter=6 * mm, spaceBefore=2 * mm
        ))

        # ── Session Info ──────────────────────────────────────────────────
        date_str = ""
        if session_data.get("created_at"):
            try:
                dt = datetime.fromisoformat(session_data["created_at"].replace("Z", "+00:00"))
                date_str = dt.strftime("%B %d, %Y")
            except Exception:
                date_str = session_data["created_at"][:10]

        elements.append(self._build_info_table(
            session_type="1-on-1 AI Debate",
            candidate_name=session_data.get("candidate_name", "Student"),
            subject=session_data.get("subject", ""),
            unit_info=f"Unit {session_data.get('unit_number', '?')} — {session_data.get('unit_name', '')}",
            topic=session_data.get("topic", ""),
            date_str=date_str,
            total_turns=student_turns,
            styles=styles,
        ))

        # ── Score Card ────────────────────────────────────────────────────
        elements.append(Paragraph("📊 Score Breakdown", styles["section_header"]))

        criteria = [
            {"key": "reasoning", "label": "🧠 Reasoning & Logic", "max": 25},
            {"key": "textbook_knowledge", "label": "📚 Textbook Knowledge", "max": 25},
            {"key": "argumentation", "label": "⚔️ Argumentation", "max": 25},
            {"key": "communication", "label": "💬 Communication", "max": 25},
        ]

        elements.extend(self._build_score_card(scores, criteria, styles))

        # ── Overall Feedback ──────────────────────────────────────────────
        elements.append(Paragraph("💡 Overall Assessment", styles["section_header"]))
        feedback = scores.get("overall_feedback", "No feedback available.")
        elements.append(Paragraph(feedback, styles["body"]))

        # ── Strengths ─────────────────────────────────────────────────────
        strengths = scores.get("strengths", [])
        if strengths:
            elements.append(Paragraph("✅ Strengths", styles["section_header"]))
            for s in strengths:
                elements.append(Paragraph(f"• {s}", styles["recommendation"]))

        # ── Areas for Improvement ─────────────────────────────────────────
        improvements = scores.get("improvements", [])
        if improvements:
            elements.append(Paragraph("🎯 Areas for Improvement", styles["section_header"]))
            for imp in improvements:
                elements.append(Paragraph(f"• {imp}", styles["recommendation"]))

        # ── Per-Turn Analysis ─────────────────────────────────────────────
        per_turn = scores.get("per_turn_analysis", [])
        if per_turn:
            elements.append(Paragraph("🔍 Turn-by-Turn Analysis", styles["section_header"]))

            turn_data = [[
                Paragraph("<b>Turn</b>", styles["body_bold"]),
                Paragraph("<b>Assessment</b>", styles["body_bold"]),
            ]]
            for turn in per_turn:
                turn_data.append([
                    Paragraph(str(turn.get("turn", "")), styles["body"]),
                    Paragraph(turn.get("assessment", ""), styles["body"]),
                ])

            page_width = A4[0] - 40 * mm
            turn_table = Table(turn_data, colWidths=[page_width * 0.15, page_width * 0.85])
            turn_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_BG]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("BOX", (0, 0), (-1, -1), 0.5, SOFT_GRAY),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, SOFT_GRAY),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            elements.append(turn_table)

        # ── Warnings ──────────────────────────────────────────────────────
        violations = session_data.get("content_violations", [])
        warnings_list = session_data.get("warnings", [])
        if violations or warnings_list:
            elements.append(Paragraph("⚠️ Warnings & Violations", styles["section_header"]))
            for v in violations:
                elements.append(Paragraph(
                    f"🚫 Content Violation: {v.get('type', 'unknown')} — Session terminated.",
                    styles["warning"]
                ))
            for w in warnings_list:
                elements.append(Paragraph(f"⚠️ {w}", styles["warning"]))

        # ── Footer ────────────────────────────────────────────────────────
        elements.append(Spacer(1, 10 * mm))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=SOFT_GRAY,
            spaceAfter=4 * mm, spaceBefore=4 * mm
        ))
        elements.append(Paragraph(
            f"<i>Generated by GradeUp AI · {date_str} · Session ID: {session_id}</i>",
            styles["small"]
        ))

        doc.build(elements)
        return filepath

    def generate_seminar_report(self, session_data: Dict[str, Any]) -> Path:
        """Generate a premium PDF report for a seminar session."""
        if not REPORTLAB_AVAILABLE:
            raise ImportError("reportlab is required. pip install reportlab")

        styles = self._create_styles()
        session_id = session_data.get("session_id", "unknown")
        filename = f"seminar_report_{session_id}.pdf"
        filepath = self.reports_dir / filename

        doc = SimpleDocTemplate(
            str(filepath), pagesize=A4,
            topMargin=20 * mm, bottomMargin=20 * mm,
            leftMargin=20 * mm, rightMargin=20 * mm,
        )

        elements = []
        scores = session_data.get("scores", {})

        # ── Header ────────────────────────────────────────────────────────
        elements.append(Paragraph("GradeUp AI", styles["subtitle"]))
        elements.append(Paragraph("🎓 Seminar Performance Report", styles["title"]))
        elements.append(HRFlowable(
            width="100%", thickness=2, color=GOLD,
            spaceAfter=6 * mm, spaceBefore=2 * mm
        ))

        # ── Session Info ──────────────────────────────────────────────────
        date_str = ""
        if session_data.get("created_at"):
            try:
                dt = datetime.fromisoformat(session_data["created_at"].replace("Z", "+00:00"))
                date_str = dt.strftime("%B %d, %Y")
            except Exception:
                date_str = session_data["created_at"][:10]

        student_turns = sum(
            1 for m in session_data.get("messages", []) if m.get("role") == "student"
        )

        elements.append(self._build_info_table(
            session_type="AI Seminar (Viva/Oral)",
            candidate_name=session_data.get("candidate_name", "Student"),
            subject=session_data.get("subject", ""),
            unit_info=f"Unit {session_data.get('unit_number', '?')} — {session_data.get('unit_name', '')}",
            topic=session_data.get("current_topic", ""),
            date_str=date_str,
            total_turns=student_turns,
            styles=styles,
        ))

        # ── Score Card ────────────────────────────────────────────────────
        elements.append(Paragraph("📊 Score Breakdown", styles["section_header"]))

        criteria = [
            {"key": "conceptual_understanding", "label": "🧠 Conceptual Understanding", "max": 30},
            {"key": "depth_of_knowledge", "label": "📖 Depth of Knowledge", "max": 25},
            {"key": "presentation_flow", "label": "🎤 Presentation Flow", "max": 20},
            {"key": "engagement", "label": "💬 Engagement", "max": 15},
            {"key": "hints_penalty", "label": "💡 Hints Used (10 = none)", "max": 10},
        ]

        elements.extend(self._build_score_card(scores, criteria, styles))

        # ── Topic Coverage ────────────────────────────────────────────────
        completed = session_data.get("completed_topics", [])
        current = session_data.get("current_topic", "")
        skipped = session_data.get("skipped_topics", [])
        all_covered = completed + ([current] if current else [])

        if all_covered or skipped:
            elements.append(Paragraph("📋 Topic Coverage", styles["section_header"]))

            topic_data = [[
                Paragraph("<b>Topic</b>", styles["body_bold"]),
                Paragraph("<b>Status</b>", styles["body_bold"]),
            ]]
            for t in all_covered:
                topic_data.append([
                    Paragraph(t, styles["body"]),
                    Paragraph("✅ Covered", styles["body"]),
                ])
            for t in skipped:
                topic_data.append([
                    Paragraph(t, styles["body"]),
                    Paragraph("⏭️ Skipped", styles["warning"]),
                ])

            page_width = A4[0] - 40 * mm
            topic_table = Table(topic_data, colWidths=[page_width * 0.7, page_width * 0.3])
            topic_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_BG]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("BOX", (0, 0), (-1, -1), 0.5, SOFT_GRAY),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, SOFT_GRAY),
            ]))
            elements.append(topic_table)

        # ── Overall Feedback ──────────────────────────────────────────────
        elements.append(Paragraph("💡 Overall Assessment", styles["section_header"]))
        feedback = scores.get("overall_feedback", "No feedback available.")
        elements.append(Paragraph(feedback, styles["body"]))

        # Hints info
        hints = session_data.get("hints_given", 0)
        if hints > 0:
            elements.append(Paragraph(
                f"📌 You used <b>{hints} hint(s)</b> during this session. "
                f"Fewer hints = higher score. Practice this topic to reduce dependence on hints.",
                styles["body"]
            ))

        # ── Strengths & Improvements ──────────────────────────────────────
        strengths = scores.get("strengths", [])
        if strengths:
            elements.append(Paragraph("✅ Strengths", styles["section_header"]))
            for s in strengths:
                elements.append(Paragraph(f"• {s}", styles["recommendation"]))

        improvements = scores.get("improvements", [])
        if improvements:
            elements.append(Paragraph("🎯 Areas for Improvement", styles["section_header"]))
            for imp in improvements:
                elements.append(Paragraph(f"• {imp}", styles["recommendation"]))

        # Topics mastered / need work
        topics_mastered = scores.get("topics_mastered", [])
        topics_need_work = scores.get("topics_need_work", [])
        if topics_mastered:
            elements.append(Paragraph("🏆 Topics Mastered", styles["section_header"]))
            for t in topics_mastered:
                elements.append(Paragraph(f"✅ {t}", styles["recommendation"]))
        if topics_need_work:
            elements.append(Paragraph("📚 Topics Needing More Work", styles["section_header"]))
            for t in topics_need_work:
                elements.append(Paragraph(f"📖 {t}", styles["recommendation"]))

        # Skipped topic suggestion
        if scores.get("skipped_topic_suggestions"):
            elements.append(Paragraph("📋 Skipped Topic Recommendations", styles["section_header"]))
            elements.append(Paragraph(scores["skipped_topic_suggestions"], styles["body"]))

        # ── Footer ────────────────────────────────────────────────────────
        elements.append(Spacer(1, 10 * mm))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=SOFT_GRAY,
            spaceAfter=4 * mm, spaceBefore=4 * mm
        ))
        elements.append(Paragraph(
            f"<i>Generated by GradeUp AI · {date_str} · Session ID: {session_id}</i>",
            styles["small"]
        ))

        doc.build(elements)
        return filepath

    def generate_multi_debate_report(
        self,
        room_data: Dict[str, Any],
        candidate_id: str,
    ) -> Path:
        """Generate a premium PDF report for a student in a multi-user debate."""
        if not REPORTLAB_AVAILABLE:
            raise ImportError("reportlab is required. pip install reportlab")

        styles = self._create_styles()
        room_id = room_data.get("room_id", "unknown")
        filename = f"multi_debate_report_{room_id}_{candidate_id}.pdf"
        filepath = self.reports_dir / filename

        doc = SimpleDocTemplate(
            str(filepath), pagesize=A4,
            topMargin=20 * mm, bottomMargin=20 * mm,
            leftMargin=20 * mm, rightMargin=20 * mm,
        )

        elements = []
        participant = room_data.get("participants", {}).get(candidate_id, {})
        scores = room_data.get("scores", {}).get(candidate_id, {})
        teams = room_data.get("teams", {})
        team_scores = room_data.get("team_scores", {})

        # Determine this student's team
        student_team = participant.get("team", "")
        team_label = "🔵 Blue Team" if student_team == "blue_team" else "🔴 Red Team"

        # ── Header ────────────────────────────────────────────────────────
        elements.append(Paragraph("GradeUp AI", styles["subtitle"]))
        elements.append(Paragraph("🏛️ Team Debate Performance Report", styles["title"]))
        elements.append(HRFlowable(
            width="100%", thickness=2, color=GOLD,
            spaceAfter=6 * mm, spaceBefore=2 * mm
        ))

        # ── Session Info ──────────────────────────────────────────────────
        date_str = ""
        if room_data.get("created_at"):
            try:
                dt = datetime.fromisoformat(room_data["created_at"].replace("Z", "+00:00"))
                date_str = dt.strftime("%B %d, %Y")
            except Exception:
                date_str = room_data["created_at"][:10]

        student_msgs = [
            m for m in room_data.get("messages", [])
            if m.get("candidate_id") == candidate_id and m.get("role") == "student"
        ]

        elements.append(self._build_info_table(
            session_type=f"Team Debate ({len(room_data.get('participants', {}))} participants)",
            candidate_name=participant.get("candidate_name", "Student"),
            subject=room_data.get("subject", ""),
            unit_info=f"Unit {room_data.get('unit_number', '?')} — {room_data.get('unit_name', '')}",
            topic=room_data.get("topic", ""),
            date_str=date_str,
            total_turns=len(student_msgs),
            styles=styles,
        ))

        # ── Team Assignment ───────────────────────────────────────────────
        elements.append(Paragraph(f"🏷️ Your Team: <b>{team_label}</b>", styles["section_header"]))

        blue_ids = teams.get("blue_team", [])
        red_ids = teams.get("red_team", [])
        blue_names = [room_data.get("participants", {}).get(c, {}).get("candidate_name", "?") for c in blue_ids]
        red_names = [room_data.get("participants", {}).get(c, {}).get("candidate_name", "?") for c in red_ids]

        team_data = [
            ["🔵 Blue Team", "🔴 Red Team"],
            [", ".join(blue_names) if blue_names else "—", ", ".join(red_names) if red_names else "—"],
            [f"Avg Score: {team_scores.get('blue_team', 0)}", f"Avg Score: {team_scores.get('red_team', 0)}"],
        ]
        team_table = Table(team_data, colWidths=[240, 240])
        team_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), HexColor("#2B5797")),
            ('BACKGROUND', (1, 0), (1, 0), HexColor("#C0392B")),
            ('TEXTCOLOR', (0, 0), (1, 0), white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, SOFT_GRAY),
            ('BACKGROUND', (0, 1), (-1, -1), LIGHT_BG),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(team_table)
        elements.append(Spacer(1, 4 * mm))

        # ── Removed notice ────────────────────────────────────────────────
        if scores.get("removed"):
            elements.append(Spacer(1, 6 * mm))
            elements.append(Paragraph(
                f"🚫 <b>REMOVED FROM SESSION</b>: {scores.get('removed_reason', 'Inappropriate content')}",
                styles["warning"]
            ))

        # ── Score Card ────────────────────────────────────────────────────
        elements.append(Paragraph("📊 Score Breakdown", styles["section_header"]))

        criteria = [
            {"key": "reasoning", "label": "🧠 Reasoning & Logic", "max": 25},
            {"key": "textbook_knowledge", "label": "📚 Textbook Knowledge", "max": 25},
            {"key": "argumentation", "label": "⚔️ Argumentation", "max": 25},
            {"key": "communication", "label": "💬 Communication", "max": 25},
            {"key": "engagement", "label": "🤝 Engagement", "max": 10},
            {"key": "team_collaboration", "label": "🤜🤛 Team Collaboration", "max": 10},
        ]

        elements.extend(self._build_score_card(scores, criteria, styles))

        # ── Off-Topic Warnings ────────────────────────────────────────────
        off_topic_count = scores.get("off_topic_count", 0)
        warnings = participant.get("off_topic_warnings", [])
        if off_topic_count > 0 or warnings:
            elements.append(Paragraph("⚠️ Off-Topic Warnings", styles["section_header"]))
            elements.append(Paragraph(
                f"Total warnings: <b>{off_topic_count}</b> (−{off_topic_count * 5} points penalty)",
                styles["body"]
            ))
            for w in warnings:
                elements.append(Paragraph(
                    f"• {w.get('reason', 'Off-topic response')}",
                    styles["warning"]
                ))

        # ── Session Feedback ──────────────────────────────────────────────
        session_feedback = room_data.get("session_feedback", "")
        if session_feedback:
            elements.append(Paragraph("🗣️ Session Feedback", styles["section_header"]))
            elements.append(Paragraph(session_feedback, styles["body"]))

        # ── Encouragement (if student was less active) ────────────────────
        enc_msgs = room_data.get("encouragement_messages", {})
        if candidate_id in enc_msgs:
            elements.append(Spacer(1, 3 * mm))
            elements.append(Paragraph(
                f"💬 <i>{enc_msgs[candidate_id].get('message', '')}</i>",
                styles["body"]
            ))

        # ── Individual Feedback ───────────────────────────────────────────
        elements.append(Paragraph("💡 Overall Assessment", styles["section_header"]))
        elements.append(Paragraph(
            scores.get("overall_feedback", "No feedback available."), styles["body"]
        ))

        strengths = scores.get("strengths", [])
        if strengths:
            elements.append(Paragraph("✅ Strengths", styles["section_header"]))
            for s in strengths:
                elements.append(Paragraph(f"• {s}", styles["recommendation"]))

        improvements = scores.get("improvements", [])
        if improvements:
            elements.append(Paragraph("🎯 Areas for Improvement", styles["section_header"]))
            for imp in improvements:
                elements.append(Paragraph(f"• {imp}", styles["recommendation"]))

        # ── Footer ────────────────────────────────────────────────────────
        elements.append(Spacer(1, 10 * mm))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=SOFT_GRAY,
            spaceAfter=4 * mm, spaceBefore=4 * mm
        ))
        elements.append(Paragraph(
            f"<i>Generated by GradeUp AI · {date_str} · Session: {room_id}</i>",
            styles["small"]
        ))

        doc.build(elements)
        return filepath


# ── Global singleton ──────────────────────────────────────────────────────

_report_gen: Optional[ReportGenerator] = None


def get_report_generator() -> ReportGenerator:
    global _report_gen
    if _report_gen is None:
        _report_gen = ReportGenerator()
    return _report_gen
