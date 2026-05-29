"""
AI Debate Engine (1-on-1) for GradeUp

A structured debate session between AI and a single student:
- AI greets, presents topic from RAG + question bank
- Student argues, AI counter-argues (Socratic questioning)
- After 10+ turns, student can end the session
- Scoring: Reasoning, Textbook Knowledge, Argumentation, Communication
- Generates detailed session data for PDF report

Storage: debate_data/ directory (one JSON per session)
"""

import os
import json
import hashlib
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests

DEBATE_DATA_DIR = Path("debate_data")
DEBATE_MODEL = "gpt-4o-mini"
DEBATE_FALLBACK_MODEL = "gpt-4o"
DEBATE_TIMEOUT = 90
MIN_TURNS_TO_END = 0


class DebateSession:
    """Represents a single 1-on-1 debate session."""

    def __init__(self, data: Dict[str, Any]):
        self.data = data

    @property
    def session_id(self) -> str:
        return self.data.get("session_id", "")

    @property
    def turn_count(self) -> int:
        """Count only student turns."""
        return sum(
            1 for m in self.data.get("messages", []) if m.get("role") == "student"
        )

    @property
    def can_end(self) -> bool:
        return self.turn_count >= MIN_TURNS_TO_END

    @property
    def is_ended(self) -> bool:
        return self.data.get("status") == "ended"


class DebateEngine:
    """
    Manages 1-on-1 AI Debate sessions with RAG-powered content,
    per-turn scoring, and session lifecycle management.
    """

    def __init__(self, data_dir: Path = DEBATE_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _session_path(self, session_id: str) -> Path:
        return self.data_dir / f"debate__{session_id}.json"

    def _load_session(self, session_id: str) -> Optional[DebateSession]:
        path = self._session_path(session_id)
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                return DebateSession(data)
            except (json.JSONDecodeError, OSError):
                pass
        return None

    def _save_session(self, session: DebateSession) -> None:
        path = self._session_path(session.session_id)
        session.data["updated_at"] = datetime.now(timezone.utc).isoformat()
        path.write_text(
            json.dumps(session.data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    def _generate_session_id(self, candidate_id: str) -> str:
        seed = f"{candidate_id}_{datetime.now().isoformat()}_{time.time()}"
        return hashlib.md5(seed.encode()).hexdigest()[:16]

    def _call_llm(self, messages: List[Dict], temperature: float = 0.8) -> str:
        """Call OpenAI LLM with messages."""
        api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get(
            "OPENAI_API_KEY"
        )
        if not api_key:
            return "AI Debate engine is not configured. Please contact administrator."

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": DEBATE_MODEL,
            "messages": messages,
            "max_completion_tokens": 2048,
            "temperature": temperature,
        }

        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=DEBATE_TIMEOUT,
            )
            if not resp.ok:
                payload["model"] = DEBATE_FALLBACK_MODEL
                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=DEBATE_TIMEOUT,
                )
            if resp.ok:
                return resp.json()["choices"][0]["message"]["content"].strip()
            else:
                print(f"  ❌ [DebateEngine] API error: {resp.status_code}")
                return "I'm having trouble right now. Please try again."
        except Exception as e:
            print(f"  ❌ [DebateEngine] Error: {e}")
            return "Something went wrong. Please try again."

    def _call_llm_json(self, messages: List[Dict], temperature: float = 0.3) -> Optional[Dict]:
        """Call LLM and parse the response as JSON."""
        raw = self._call_llm(messages, temperature)
        try:
            # Try to extract JSON from the response
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            start = raw.find("{")
            end = raw.rfind("}")
            if start != -1 and end != -1:
                return json.loads(raw[start : end + 1])
        except Exception:
            pass
        return None

    # ── System Prompts ────────────────────────────────────────────────────────

    def _debate_system_prompt(
        self,
        subject: str,
        unit_number: int,
        topic: str,
        candidate_name: str,
        rag_context: str,
        student_stance: Optional[str] = None,
    ) -> str:
        stance_str = f'\n## STUDENT STANCE\nThe student has selected the following argument/stance: "{student_stance}"' if student_stance else ""
        return f"""You are GradeUp AI Debate Master — an expert academic debater and assessor for school students.

## YOUR ROLE
You are debating with {candidate_name} on the topic: "{topic}" from {subject}, Unit {unit_number}.{stance_str}
You take the OPPOSING stance to challenge the student's thinking. Use Socratic questioning.

## DEBATE RULES
1. In each response, COUNTER the student's argument with evidence from the textbook.
2. Ask probing questions that push the student to think deeper.
3. Stay strictly on the debate topic. If the student goes off-topic, firmly redirect:
   "That's an interesting point, but let's stay focused on our debate topic: {topic}. How would you counter..."
4. NEVER agree too easily — always challenge, even if the student is correct. Play devil's advocate.
5. Use textbook facts from the context below to strengthen your arguments.
6. Keep your responses concise but substantive (3-5 sentences max).

## CONTENT SAFETY — ABSOLUTE ZERO TOLERANCE
- NEVER produce 18+, sexual, violent, harmful, or abusive content.
- If student sends inappropriate content, respond with: "CONTENT_VIOLATION"
- Do NOT engage with harmful messages.

## TEXTBOOK CONTEXT (use this as your evidence)
{rag_context if rag_context else "(No context available — use general knowledge)"}

## RESPONSE FORMAT
Respond naturally as a debater. Be challenging but respectful. Address the student by name occasionally."""

    def _scoring_prompt(self, topic: str, messages: List[Dict]) -> str:
        conversation = ""
        for m in messages:
            role_label = "Student" if m.get("role") == "student" else "AI"
            conversation += f"\n{role_label}: {m.get('content', '')}\n"

        return f"""You are a STRICT and RIGOROUS educational assessor. Evaluate this debate session on the topic: "{topic}".

## CONVERSATION
{conversation}

## SCORING CRITERIA — STRICT ANCHORING (follow these EXACTLY)
Score each criterion from 0 to 25 (total 100). Use the anchoring scale below:

### 1. reasoning (0-25): Logical structure, use of evidence, cause-effect analysis
- **0-3**: Student shows ZERO logical reasoning. All responses are nonsensical, off-topic, or completely unrelated to the debate. Student refuses to engage intellectually.
- **4-7**: Student makes minimal attempts at reasoning but with fundamental logical errors. Mostly off-topic with rare glimpses of relevance.
- **8-12**: Student shows SOME logical thinking but with significant gaps. Arguments are weak, poorly structured, or only partially relevant.
- **13-18**: Student demonstrates moderate reasoning with decent logical connections. Some evidence used, but room for improvement.
- **19-25**: Student demonstrates strong logical reasoning with well-structured arguments and clear cause-effect analysis.

### 2. textbook_knowledge (0-25): Accuracy of facts, use of textbook concepts
- **0-3**: Student demonstrates ZERO knowledge of the topic. No textbook concepts mentioned. Responses show complete ignorance of the subject matter — student may state scientifically incorrect "facts" or make up information.
- **4-7**: Student shows vague awareness of the topic but cannot cite any specific facts, formulas, or concepts from the textbook.
- **8-12**: Student mentions some relevant concepts but with notable inaccuracies or shallow understanding.
- **13-18**: Student demonstrates good knowledge of textbook content with minor gaps.
- **19-25**: Student shows excellent command of textbook content with accurate facts and deep understanding.

### 3. argumentation (0-25): Strength of arguments, quality of rebuttals
- **0-3**: Student makes NO actual arguments related to the topic. Responses are irrelevant, nonsensical, or the student explicitly refuses to participate (e.g., "I don't care", "just give me a score").
- **4-7**: Student attempts arguments but they are extremely weak, unsupported, or mostly off-topic.
- **8-12**: Student makes some relevant arguments but they lack depth, evidence, or ability to respond to counterarguments.
- **13-18**: Student presents decent arguments with some ability to rebut and defend positions.
- **19-25**: Student presents strong, well-supported arguments with effective rebuttals.

### 4. communication (0-25): Coherence, clarity, vocabulary, RELEVANCE of responses
- **0-3**: Student's responses are completely incoherent, irrelevant to the topic, or consist of nonsense/jokes/off-topic remarks. Student may express desire to stop, sleep, or discuss unrelated subjects.
- **4-7**: Student communicates minimally. Responses are mostly irrelevant with poor vocabulary and lack of focus.
- **8-12**: Student communicates with basic clarity but responses often drift off-topic.
- **13-18**: Student communicates clearly and mostly stays on topic with decent vocabulary.
- **19-25**: Student communicates excellently — clear, coherent, relevant, and uses appropriate academic vocabulary.

## CRITICAL SCORING RULES
- If a student goes off-topic 3+ times, NO category should score above 10.
- If a student goes off-topic 5+ times, NO category should score above 5.
- If a student refuses to engage (says things like "I don't care", "just give me a score", "I want to stop"), score reasoning and argumentation at 0-3.
- If a student makes up unscientific claims (e.g., "the sun is made of cheese"), textbook_knowledge MUST be 0-3.
- DO NOT give sympathy scores. A student who participates but shows ZERO knowledge deserves 0-5 in textbook_knowledge.
- "Willingness to participate" or "creativity" do NOT count as academic strengths if the content is completely wrong or off-topic.

Also provide:
- **overall_feedback**: 2-3 sentences of overall assessment
- **strengths**: List of 2-3 specific ACADEMIC strengths shown (NOT things like "creative thinking" or "willingness to try" if student was off-topic)
- **improvements**: List of 2-3 specific areas for improvement
- **off_topic_count**: Number of times student went off-topic or gave irrelevant responses. Count EVERY response that does not directly address the debate topic.
- **per_turn_analysis**: For each student turn, a brief (1 sentence) assessment

Return ONLY valid JSON:
{{
    "reasoning": 5,
    "textbook_knowledge": 3,
    "argumentation": 4,
    "communication": 6,
    "total_score": 18,
    "overall_feedback": "...",
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "off_topic_count": 7,
    "per_turn_analysis": [
        {{"turn": 1, "assessment": "..."}},
        {{"turn": 2, "assessment": "..."}}
    ]
}}"""

    # ── Public API ────────────────────────────────────────────────────────────

    def _get_cross_session_history(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        topic: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Check if the student has completed this topic in a seminar session.
        Returns the latest seminar session info (score, session_id) or None.
        """
        seminar_dir = Path("seminar_data")
        if not seminar_dir.exists():
            return None

        best_match = None
        for path in seminar_dir.glob("seminar__*.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                if (
                    data.get("candidate_id") == candidate_id
                    and (data.get("subject") or "").lower() == subject.lower()
                    and data.get("unit_number") == unit_number
                    and data.get("status") == "ended"
                    and data.get("scores")
                ):
                    # Check current_topic or completed_topics
                    topics_covered = (
                        data.get("completed_topics", []) + [data.get("current_topic", "")]
                    )
                    if not any(t.lower() == topic.lower() for t in topics_covered if t):
                        continue

                    score = data["scores"].get("total_score", 0)
                    created = data.get("created_at", "")
                    if best_match is None or created > best_match["created_at"]:
                        best_match = {
                            "session_id": data.get("session_id"),
                            "topic": topic,
                            "score": score,
                            "created_at": created,
                            "session_type": "seminar",
                        }
            except (json.JSONDecodeError, OSError):
                continue
        return best_match

    def start_debate(
        self,
        candidate_id: str,
        candidate_name: str,
        subject: str,
        unit_number: int,
        board: str,
        class_number: str,
        unit_name: str = "",
        topic: Optional[str] = None,
        student_stance: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Start a new 1-on-1 debate session.

        Topic is mandatory — student must select it. Validated against RAG.
        """
        import re
        from ai_tutor import retrieve_context, _format_context

        if not topic or not topic.strip():
            return {"error": "topic is required — students must select their debate topic", "success": False}

        topic = re.sub(r'^[\d.]+\s+', '', topic.strip())

        session_id = self._generate_session_id(candidate_id)

        # Get RAG context and validate topic
        chunks = retrieve_context(
            query=topic, subject=subject, unit_number=unit_number,
            board=board, class_number=class_number, limit=5
        )
        rag_context = _format_context(chunks)

        if not rag_context:
            return {"error": f"topic '{topic}' not found in course material", "success": False}

        # Generate AI greeting
        system_prompt = self._debate_system_prompt(
            subject, unit_number, topic, candidate_name, rag_context, student_stance
        )

        if student_stance:
            greeting_prompt = f"""Start the debate session. Greet {candidate_name}, introduce the debate topic "{topic}" from {subject} Unit {unit_number}.
The student has selected the following stance/argument: "{student_stance}".
Briefly acknowledge their stance, explain your opposing stance, and invite them to present their opening argument.
Keep it engaging and under 5 sentences."""
        else:
            greeting_prompt = f"""Start the debate session. Greet {candidate_name}, introduce the debate topic "{topic}" from {subject} Unit {unit_number}.
Briefly set up the debate — explain your stance (you take the opposing side) and invite the student to present their opening argument.
Keep it engaging and under 5 sentences."""

        ai_greeting = self._call_llm([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": greeting_prompt},
        ])

        # Create session
        session_data = {
            "session_id": session_id,
            "candidate_id": candidate_id,
            "candidate_name": candidate_name,
            "subject": subject,
            "unit_number": unit_number,
            "unit_name": unit_name,
            "board": board,
            "class_number": class_number,
            "topic": topic,
            "student_stance": student_stance,
            "rag_context": rag_context,
            "status": "active",
            "messages": [
                {
                    "role": "ai",
                    "content": ai_greeting,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            ],
            "warnings": [],
            "content_violations": [],
            "scores": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        session = DebateSession(session_data)
        self._save_session(session)

        return {
            "session_id": session_id,
            "topic": topic,
            "ai_greeting": ai_greeting,
            "min_turns_required": MIN_TURNS_TO_END,
        }

    def respond_to_debate(
        self,
        session_id: str,
        student_message: str,
    ) -> Dict[str, Any]:
        """
        Process a student's debate response.

        1. Check for content violations
        2. Check for off-topic deviation
        3. AI generates counter-argument
        4. Returns response with turn info
        """
        session = self._load_session(session_id)
        if not session:
            return {"error": "Session not found", "success": False}
        if session.is_ended:
            return {"error": "Session has already ended", "success": False}

        # ── Content Safety Check ──────────────────────────────────────────
        safety_check = self._check_content_safety(student_message)
        if safety_check.get("is_violation"):
            # Immediate session end
            session.data["status"] = "ended"
            session.data["end_reason"] = "content_violation"
            session.data["content_violations"].append({
                "message": student_message[:200],
                "type": safety_check.get("violation_type", "18+_content"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            session.data["scores"] = {
                "reasoning": 0,
                "textbook_knowledge": 0,
                "argumentation": 0,
                "communication": 0,
                "total_score": 0,
                "overall_feedback": "Session terminated due to inappropriate content.",
                "strengths": [],
                "improvements": ["Maintain appropriate and respectful discourse."],
                "off_topic_count": 0,
                "per_turn_analysis": [],
            }
            self._save_session(session)
            return {
                "success": False,
                "error": "Session terminated due to inappropriate content.",
                "session_ended": True,
                "reason": "content_violation",
            }

        # Record student message
        session.data["messages"].append({
            "role": "student",
            "content": student_message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # ── Generate AI counter-argument ──────────────────────────────────
        system_prompt = self._debate_system_prompt(
            session.data["subject"],
            session.data["unit_number"],
            session.data["topic"],
            session.data["candidate_name"],
            session.data.get("rag_context", ""),
            session.data.get("student_stance"),
        )

        # Build conversation history for LLM
        llm_messages = [{"role": "system", "content": system_prompt}]
        for msg in session.data["messages"][-12:]:  # Last 12 messages
            role = "assistant" if msg["role"] == "ai" else "user"
            llm_messages.append({"role": role, "content": msg["content"]})

        ai_response = self._call_llm(llm_messages)

        # Check if AI detected content violation
        if "CONTENT_VIOLATION" in ai_response:
            session.data["status"] = "ended"
            session.data["end_reason"] = "content_violation"
            session.data["content_violations"].append({
                "message": student_message[:200],
                "type": "detected_by_ai",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            session.data["scores"] = {
                "reasoning": 0, "textbook_knowledge": 0,
                "argumentation": 0, "communication": 0,
                "total_score": 0,
                "overall_feedback": "Session terminated due to inappropriate content.",
                "strengths": [], "improvements": ["Maintain appropriate discourse."],
                "off_topic_count": 0, "per_turn_analysis": [],
            }
            self._save_session(session)
            return {
                "success": False,
                "error": "Session terminated due to inappropriate content.",
                "session_ended": True,
                "reason": "content_violation",
            }

        # Record AI response
        session.data["messages"].append({
            "role": "ai",
            "content": ai_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        self._save_session(session)

        turn_number = session.turn_count
        can_end = session.can_end

        return {
            "success": True,
            "ai_response": ai_response,
            "turn_number": turn_number,
            "can_end": can_end,
            "turns_remaining": max(0, MIN_TURNS_TO_END - turn_number),
            "session_id": session_id,
        }

    def end_debate(self, session_id: str) -> Dict[str, Any]:
        """
        End the debate session, score the student, and generate report data.
        """
        session = self._load_session(session_id)
        if not session:
            return {"error": "Session not found", "success": False}
        if session.is_ended:
            return {"error": "Session already ended", "success": False}

        # ── Score the debate ──────────────────────────────────────────────
        scoring_messages = [
            {"role": "user", "content": self._scoring_prompt(
                session.data["topic"], session.data["messages"]
            )}
        ]
        scores = self._call_llm_json(scoring_messages, temperature=0.2)

        if not scores:
            # Fallback scoring
            scores = {
                "reasoning": 15,
                "textbook_knowledge": 15,
                "argumentation": 15,
                "communication": 15,
                "total_score": 60,
                "overall_feedback": "Session completed. Detailed scoring unavailable.",
                "strengths": ["Participated in the debate"],
                "improvements": ["Continue practicing argumentation skills"],
                "off_topic_count": 0,
                "per_turn_analysis": [],
            }

        # Ensure total_score is calculated correctly
        scores["total_score"] = (
            scores.get("reasoning", 0)
            + scores.get("textbook_knowledge", 0)
            + scores.get("argumentation", 0)
            + scores.get("communication", 0)
        )

        # ── Programmatic off-topic penalty caps ───────────────────────────
        off_topic = scores.get("off_topic_count", 0)
        if off_topic >= 5:
            # Severe disengagement: cap each category at 5, max total 20
            cap = 5
            for key in ("reasoning", "textbook_knowledge", "argumentation", "communication"):
                scores[key] = min(scores.get(key, 0), cap)
            scores["total_score"] = sum(
                scores.get(k, 0) for k in ("reasoning", "textbook_knowledge", "argumentation", "communication")
            )
            print(f"  ⚠️ [DebateEngine] Off-topic cap applied (5+ off-topic): total={scores['total_score']}")
        elif off_topic >= 3:
            # Moderate disengagement: cap each category at 10, max total 40
            cap = 10
            for key in ("reasoning", "textbook_knowledge", "argumentation", "communication"):
                scores[key] = min(scores.get(key, 0), cap)
            scores["total_score"] = sum(
                scores.get(k, 0) for k in ("reasoning", "textbook_knowledge", "argumentation", "communication")
            )
            print(f"  ⚠️ [DebateEngine] Off-topic cap applied (3-4 off-topic): total={scores['total_score']}")

        session.data["status"] = "ended"
        session.data["end_reason"] = "completed"
        session.data["scores"] = scores
        session.data["ended_at"] = datetime.now(timezone.utc).isoformat()
        self._save_session(session)

        # ── Update student performance ────────────────────────────────────
        try:
            from student_performance import get_performance_tracker

            tracker = get_performance_tracker()
            section_scores = {
                session.data["topic"]: float(scores["total_score"])
            }
            tracker.record_debate_score(
                candidate_id=session.data["candidate_id"],
                subject=session.data["subject"],
                unit_number=session.data["unit_number"],
                section_scores=section_scores,
                total_score=float(scores["total_score"]),
                points=max(0, scores["total_score"]),
                unit_title=session.data.get("unit_name", ""),
                candidate_name=session.data.get("candidate_name", ""),
            )

            # Log in interaction history
            tracker.record_tutor_interaction(
                candidate_id=session.data["candidate_id"],
                subject=session.data["subject"],
                unit_number=session.data["unit_number"],
                topic=session.data["topic"],
                query_summary=f"Debate session completed. Score: {scores['total_score']}/100",
                candidate_name=session.data.get("candidate_name", ""),
                unit_title=session.data.get("unit_name", ""),
            )
        except Exception as e:
            print(f"  ⚠️ [DebateEngine] Failed to update performance: {e}")

        # ── Post-debate recommendations ───────────────────────────────────
        recommendations = self.get_post_debate_recommendations(
            session_id=session_id,
            candidate_id=session.data["candidate_id"],
            subject=session.data["subject"],
            unit_number=session.data["unit_number"],
            topic=session.data["topic"],
            score=scores["total_score"],
        )

        return {
            "success": True,
            "session_id": session_id,
            "scores": scores,
            "total_turns": session.turn_count,
            "topic": session.data["topic"],
            "recommendations": recommendations,
        }



    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get full session data."""
        session = self._load_session(session_id)
        if session:
            return session.data
        return None

    def get_debate_history(
        self,
        candidate_id: str,
        subject: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List all debate sessions for a student."""
        history = []
        for path in sorted(self.data_dir.glob("debate__*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                if data.get("candidate_id") != candidate_id:
                    continue
                if subject and data.get("subject", "").lower() != subject.lower():
                    continue
                history.append({
                    "session_id": data.get("session_id"),
                    "topic": data.get("topic"),
                    "subject": data.get("subject"),
                    "unit_number": data.get("unit_number"),
                    "status": data.get("status"),
                    "total_turns": sum(
                        1 for m in data.get("messages", []) if m.get("role") == "student"
                    ),
                    "total_score": data.get("scores", {}).get("total_score") if data.get("scores") else None,
                    "created_at": data.get("created_at"),
                    "ended_at": data.get("ended_at"),
                })
            except (json.JSONDecodeError, OSError):
                continue

        history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return history

    # ── Post-Debate Recommendations ─────────────────────────────────────────

    def _count_topic_attempts(
        self, candidate_id: str, subject: str, topic: str
    ) -> int:
        """Count how many completed debate sessions this student has on this topic."""
        count = 0
        for path in self.data_dir.glob("debate__*.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                if (
                    data.get("candidate_id") == candidate_id
                    and (data.get("subject") or "").lower() == subject.lower()
                    and (data.get("topic") or "").lower() == topic.lower()
                    and data.get("status") == "ended"
                ):
                    count += 1
            except (json.JSONDecodeError, OSError):
                continue
        return count

    def _get_all_debated_topics(
        self, candidate_id: str, subject: str, unit_number: int
    ) -> Dict[str, Dict[str, Any]]:
        """Get all topics this student has debated in a specific unit, with best scores."""
        topics: Dict[str, Dict[str, Any]] = {}
        for path in self.data_dir.glob("debate__*.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                if (
                    data.get("candidate_id") == candidate_id
                    and (data.get("subject") or "").lower() == subject.lower()
                    and data.get("unit_number") == unit_number
                    and data.get("status") == "ended"
                    and data.get("scores")
                ):
                    topic = data.get("topic", "")
                    score = data["scores"].get("total_score", 0)
                    t_lower = topic.lower()
                    if t_lower not in topics:
                        topics[t_lower] = {
                            "topic": topic,
                            "best_score": score,
                            "attempts": 1,
                            "last_score": score,
                        }
                    else:
                        topics[t_lower]["attempts"] += 1
                        topics[t_lower]["last_score"] = score
                        topics[t_lower]["best_score"] = max(
                            topics[t_lower]["best_score"], score
                        )
            except (json.JSONDecodeError, OSError):
                continue
        return topics

    def get_post_debate_recommendations(
        self,
        session_id: str,
        candidate_id: str,
        subject: str,
        unit_number: int,
        topic: str,
        score: float,
    ) -> Dict[str, Any]:
        """
        Post-debate recommendations based on student's selected topic.
        (Topic recommendation feature has been removed).
        """
        attempt_count = self._count_topic_attempts(candidate_id, subject, topic)
        
        return {
            "current_score": score,
            "attempt_number": attempt_count,
            "topic": topic,
            "needs_retry": False,
            "retry_suggestion": None,
            "next_topic_suggestion": None,
            "all_topics_completed": False,
            "history_based_suggestions": [],
        }

    # ── Content Safety ────────────────────────────────────────────────────────

    def _check_content_safety(self, text: str) -> Dict[str, Any]:
        """Quick content safety check using keyword + LLM fallback."""
        text_lower = text.lower()

        # Keyword-based quick check for severe violations
        severe_keywords = [
            "porn", "xxx", "nude", "naked", "sex ", "sexual",
            "kill ", "murder", "suicide", "weapon", "bomb",
            "drugs", "cocaine", "heroin",
        ]
        for kw in severe_keywords:
            if kw in text_lower:
                return {
                    "is_violation": True,
                    "violation_type": "18+_content",
                    "confidence": "high",
                }

        return {"is_violation": False}

    def get_attended_topics(
        self,
        candidate_id: str,
        subject: Optional[str] = None,
        unit_number: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Get all topics this student has attended in debate sessions."""
        attended = []
        for path in sorted(self.data_dir.glob("debate__*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                if data.get("candidate_id") != candidate_id:
                    continue
                if subject and data.get("subject", "").lower() != subject.lower():
                    continue
                if unit_number is not None and data.get("unit_number") != unit_number:
                    continue
                if data.get("status") != "ended":
                    continue

                topic = data.get("topic", "")
                score = data.get("scores", {}).get("total_score") if data.get("scores") else None

                if topic:
                    attended.append({
                        "topic": topic,
                        "score": score,
                        "session_id": data.get("session_id"),
                        "status": data.get("status"),
                        "unit_number": data.get("unit_number"),
                        "subject": data.get("subject"),
                        "date": data.get("ended_at") or data.get("created_at"),
                    })
            except (json.JSONDecodeError, OSError):
                continue

        return attended


# ── Global singleton ──────────────────────────────────────────────────────

_debate_engine: Optional[DebateEngine] = None


def get_debate_engine() -> DebateEngine:
    global _debate_engine
    if _debate_engine is None:
        _debate_engine = DebateEngine()
    return _debate_engine
