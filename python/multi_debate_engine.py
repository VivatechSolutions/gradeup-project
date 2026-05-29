"""
Multi-User AI Debate Engine for GradeUp

Manages debate sessions where multiple students debate on a topic:
- AI is the observer/moderator, NOT a participant
- Students select the topic (mandatory, no AI recommendation)
- Topic validated against RAG context
- Even number of participants required, split into Blue/Red teams
- AI presents the topic, announces teams, and moderates
- Off-topic detection with warnings (first offense → warning, repeat → score penalty)
- 18+ content → immediate removal from session
- Per-student + team-based scoring with individual reports
- End-of-session: less active students get a chance to speak, then overall feedback

Storage: debate_data/rooms/ directory (one JSON per session)
"""

import os
import json
import hashlib
import random
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests

ROOM_DATA_DIR = Path("debate_data") / "rooms"
MULTI_DEBATE_MODEL = "gpt-4o-mini"
MULTI_DEBATE_FALLBACK = "gpt-4o"
MULTI_DEBATE_TIMEOUT = 90
MIN_PARTICIPANTS = 2
MAX_PARTICIPANTS = 8
AI_STUDENT_ID = "__ai_student__"
AI_STUDENT_NAME = "AI Student"


class MultiDebateEngine:
    """
    Manages multi-student debate sessions with AI moderation,
    off-topic detection, content safety, and per-student scoring.
    """

    def __init__(self, data_dir: Path = ROOM_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _room_path(self, room_id: str) -> Path:
        return self.data_dir / f"room__{room_id}.json"

    def _load_room(self, room_id: str) -> Optional[Dict[str, Any]]:
        path = self._room_path(room_id)
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return None

    def _save_room(self, room: Dict[str, Any]) -> None:
        path = self._room_path(room["room_id"])
        room["updated_at"] = datetime.now(timezone.utc).isoformat()
        path.write_text(
            json.dumps(room, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    def _generate_room_id(self) -> str:
        seed = f"room_{datetime.now().isoformat()}_{time.time()}"
        return hashlib.md5(seed.encode()).hexdigest()[:12]

    def _call_llm(self, messages: List[Dict], temperature: float = 0.7) -> str:
        api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return "AI is not configured."

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": MULTI_DEBATE_MODEL,
            "messages": messages,
            "max_completion_tokens": 2048,
            "temperature": temperature,
        }

        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers, json=payload, timeout=MULTI_DEBATE_TIMEOUT,
            )
            if not resp.ok:
                payload["model"] = MULTI_DEBATE_FALLBACK
                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers, json=payload, timeout=MULTI_DEBATE_TIMEOUT,
                )
            if resp.ok:
                return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"  ❌ [MultiDebate] Error: {e}")
        return "Something went wrong. Please try again."

    def _call_llm_json(self, messages: List[Dict], temperature: float = 0.3) -> Optional[Any]:
        raw = self._call_llm(messages, temperature)
        try:
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            # Try array first, then object
            start_arr = raw.find("[")
            end_arr = raw.rfind("]")
            start_obj = raw.find("{")
            end_obj = raw.rfind("}")
            if start_arr != -1 and end_arr != -1 and (start_obj == -1 or start_arr < start_obj):
                return json.loads(raw[start_arr:end_arr + 1])
            if start_obj != -1 and end_obj != -1:
                return json.loads(raw[start_obj:end_obj + 1])
        except Exception:
            pass
        return None

    def _check_content_safety(self, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        severe_keywords = [
            "porn", "xxx", "nude", "naked", "sex ", "sexual",
            "kill ", "murder", "suicide", "weapon", "bomb",
            "drugs", "cocaine", "heroin",
        ]
        for kw in severe_keywords:
            if kw in text_lower:
                return {"is_violation": True, "violation_type": "18+_content"}
        return {"is_violation": False}

    def _check_off_topic(self, message: str, topic: str, rag_context: str) -> Dict[str, Any]:
        """Use LLM to check if a message is on-topic."""
        check_prompt = f"""You are a debate moderator. Determine if the following student message is relevant to the debate topic.

Debate Topic: "{topic}"
Student Message: "{message[:500]}"

Respond with ONLY a JSON object:
{{"is_off_topic": true/false, "reason": "brief explanation"}}"""

        result = self._call_llm_json(
            [{"role": "user", "content": check_prompt}], temperature=0.1
        )
        if result and isinstance(result, dict):
            return result
        return {"is_off_topic": False, "reason": ""}

    # ── Public API ────────────────────────────────────────────────────────────

    def create_debate_room(
        self,
        subject: str,
        unit_number: int,
        board: str,
        topic: str,
        class_number: Optional[str] = None,
        unit_name: str = "",
        max_participants: int = 4,
    ) -> Dict[str, Any]:
        """Create a new multi-student debate session.

        Topic is mandatory — students must select it themselves.
        Validated against RAG context. max_participants forced to even.
        """
        import re
        from ai_tutor import retrieve_context, _format_context

        if not topic or not topic.strip():
            return {"error": "topic is required — students must select their debate topic", "success": False}

        topic = re.sub(r'^[\d.]+\s+', '', topic.strip())

        max_participants = min(max_participants, MAX_PARTICIPANTS)

        # Get RAG context and validate topic
        chunks = retrieve_context(
            query=topic, subject=subject, unit_number=unit_number,
            board=board, class_number=class_number, limit=5
        )
        rag_context = _format_context(chunks)

        if not rag_context:
            return {"error": f"topic '{topic}' not found in course material", "success": False}

        room_id = self._generate_room_id()

        room = {
            "room_id": room_id,
            "subject": subject,
            "unit_number": unit_number,
            "unit_name": unit_name,
            "board": board,
            "class_number": class_number,
            "topic": topic,
            "rag_context": rag_context,
            "max_participants": max_participants,
            "status": "waiting",  # waiting → active → ended
            "participants": {},   # candidate_id → {name, status, warnings, ...}
            "teams": {},          # blue_team: [...ids], red_team: [...ids]
            "messages": [],       # All messages in the room
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        self._save_room(room)

        return {
            "session_id": room_id,
            "topic": topic,
            "status": "waiting",
            "max_participants": max_participants,
        }

    def join_debate_room(
        self,
        room_id: str,
        candidate_id: str,
        candidate_name: str,
    ) -> Dict[str, Any]:
        """Student joins a debate room."""
        room = self._load_room(room_id)
        if not room:
            return {"error": "Session not found", "success": False}

        if room["status"] not in ("waiting", "active"):
            return {"error": "Session is no longer accepting participants", "success": False}

        if len(room["participants"]) >= room["max_participants"]:
            return {"error": "Session is full", "success": False}

        if candidate_id in room["participants"]:
            return {"error": "Already in session", "success": False}

        room["participants"][candidate_id] = {
            "candidate_name": candidate_name,
            "status": "active",  # active, warned, removed
            "warning_count": 0,
            "off_topic_warnings": [],
            "joined_at": datetime.now(timezone.utc).isoformat(),
        }

        self._save_room(room)

        return {
            "success": True,
            "session_id": room_id,
            "topic": room["topic"],
            "current_participants": len(room["participants"]),
            "participants": [
                {"name": p["candidate_name"], "id": cid}
                for cid, p in room["participants"].items()
            ],
        }

    def start_room_debate(self, room_id: str) -> Dict[str, Any]:
        """Start the debate in a room. Assign teams, AI announces them.
        If odd number of participants, AI student joins the smaller team."""
        room = self._load_room(room_id)
        if not room:
            return {"error": "Session not found", "success": False}

        num_participants = len(room["participants"])
        if num_participants < MIN_PARTICIPANTS:
            return {"error": f"Need at least {MIN_PARTICIPANTS} participants", "success": False}

        is_odd = num_participants % 2 != 0

        # ── Assign teams randomly ─────────────────────────────────────────
        ids = list(room["participants"].keys())
        random.shuffle(ids)
        half = len(ids) // 2
        blue_ids = ids[:half]
        red_ids = ids[half:]

        # ── If odd, add AI student to the smaller team ────────────────────
        room["has_ai_student"] = is_odd
        if is_odd:
            # blue_ids is the smaller team (half < half+1)
            room["participants"][AI_STUDENT_ID] = {
                "candidate_name": AI_STUDENT_NAME,
                "status": "active",
                "warning_count": 0,
                "off_topic_warnings": [],
                "is_ai_student": True,
                "joined_at": datetime.now(timezone.utc).isoformat(),
            }
            blue_ids.append(AI_STUDENT_ID)
            room["ai_student_team"] = "blue_team"
            room["participants"][AI_STUDENT_ID]["team"] = "blue_team"

        room["teams"] = {"blue_team": blue_ids, "red_team": red_ids}
        for cid in blue_ids:
            room["participants"][cid]["team"] = "blue_team"
        for cid in red_ids:
            room["participants"][cid]["team"] = "red_team"

        # ── Build team name strings ───────────────────────────────────────
        blue_names = [room["participants"][cid]["candidate_name"] for cid in blue_ids]
        red_names = [room["participants"][cid]["candidate_name"] for cid in red_ids]

        # ── AI opening with team announcements + topic briefing ───────────
        rag_snippet = (room.get("rag_context") or "")[:1500]
        opening_prompt = f"""You are an AI debate moderator for school students.

The debate topic is: "{room['topic']}" from {room['subject']}, Unit {room['unit_number']}.

Teams:
🔵 Blue Team: {', '.join(blue_names)}
🔴 Red Team: {', '.join(red_names)}

Topic briefing (use this to set context):
{rag_snippet}

Generate an opening message that:
1. Welcomes everyone
2. Announces the topic clearly
3. Lists both teams with their members (use 🔵 and 🔴 emojis)
4. Gives a brief overview of the topic (2-3 sentences from the briefing above)
5. Explains rules: stay on topic, support with evidence, engage with opposing team
6. Invites Blue Team to present their opening argument first

Keep it under 10 sentences. Be encouraging."""

        ai_opening = self._call_llm([{"role": "user", "content": opening_prompt}])

        room["status"] = "active"
        room["started_at"] = datetime.now(timezone.utc).isoformat()
        room["messages"].append({
            "role": "moderator",
            "content": ai_opening,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        self._save_room(room)

        return {
            "success": True,
            "session_id": room_id,
            "ai_opening": ai_opening,
            "topic": room["topic"],
            "has_ai_student": is_odd,
            "teams": {
                "blue_team": [{"id": cid, "name": room["participants"][cid]["candidate_name"]} for cid in blue_ids],
                "red_team": [{"id": cid, "name": room["participants"][cid]["candidate_name"]} for cid in red_ids],
            },
            "participants": list(room["participants"].keys()),
        }

    def submit_argument(
        self,
        room_id: str,
        candidate_id: str,
        message: str,
    ) -> Dict[str, Any]:
        """Student submits an argument in the debate room."""
        room = self._load_room(room_id)
        if not room:
            return {"error": "Session not found", "success": False}
        if room["status"] != "active":
            return {"error": "Debate is not active", "success": False}

        participant = room["participants"].get(candidate_id)
        if not participant:
            return {"error": "You are not in this session", "success": False}
        if participant["status"] == "removed":
            return {"error": "You have been removed from this debate", "success": False}

        # ── Content Safety ────────────────────────────────────────────────
        safety = self._check_content_safety(message)
        if safety.get("is_violation"):
            participant["status"] = "removed"
            participant["removed_reason"] = "inappropriate_content"
            participant["removed_at"] = datetime.now(timezone.utc).isoformat()

            room["messages"].append({
                "role": "moderator",
                "candidate_id": candidate_id,
                "content": f"⚠️ {participant['candidate_name']} has been removed from the debate for violating content guidelines.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "removal",
            })
            self._save_room(room)

            return {
                "success": False,
                "error": "You have been removed for inappropriate content.",
                "removed": True,
            }

        # ── Off-Topic Detection ───────────────────────────────────────────
        off_topic = self._check_off_topic(message, room["topic"], room.get("rag_context", ""))
        ai_moderation = None

        if off_topic.get("is_off_topic"):
            participant["warning_count"] = participant.get("warning_count", 0) + 1
            participant["off_topic_warnings"].append({
                "message": message[:200],
                "reason": off_topic.get("reason", ""),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            if participant["warning_count"] == 1:
                ai_moderation = (
                    f"⚠️ {participant['candidate_name']}, your response seems off-topic. "
                    f"Please stay focused on: \"{room['topic']}\". "
                    f"This is your first warning — further off-topic responses will affect your score."
                )
                participant["status"] = "warned"
            else:
                ai_moderation = (
                    f"⚠️ {participant['candidate_name']}, this is warning #{participant['warning_count']}. "
                    f"Please discuss only the debate topic. Off-topic responses are being noted and will reduce your score."
                )

        # Record the message
        room["messages"].append({
            "role": "student",
            "candidate_id": candidate_id,
            "candidate_name": participant["candidate_name"],
            "content": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_off_topic": off_topic.get("is_off_topic", False),
        })

        # Add moderation message if needed
        if ai_moderation:
            room["messages"].append({
                "role": "moderator",
                "content": ai_moderation,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "warning",
                "target_candidate": candidate_id,
            })

        self._save_room(room)

        # Count this student's turns
        student_turns = sum(
            1 for m in room["messages"]
            if m.get("role") == "student" and m.get("candidate_id") == candidate_id
        )

        return {
            "success": True,
            "session_id": room_id,
            "your_turn_count": student_turns,
            "warning_count": participant.get("warning_count", 0),
            "ai_moderation": ai_moderation,
            "is_off_topic": off_topic.get("is_off_topic", False),
        }

    # ── AI Student ─────────────────────────────────────────────────────────

    def _ai_student_system_prompt(self, room: Dict[str, Any]) -> str:
        """System prompt that makes the AI behave as an average student."""
        team = room.get("ai_student_team", "blue_team")
        team_label = "🔵 Blue Team" if team == "blue_team" else "🔴 Red Team"
        return f"""You are a school student named "{AI_STUDENT_NAME}" participating in a team debate.
You are on {team_label}.

## YOUR BEHAVIOUR — AVERAGE STUDENT
- You are a C+ / B- grade student. You are NOT an expert.
- Use SIMPLE, everyday language. Avoid fancy academic jargon.
- Make decent but not perfect arguments — sometimes your points are incomplete.
- Show uncertainty naturally: "I think...", "I'm not sure but...", "Maybe..."
- Occasionally miss minor details or have small factual gaps (this is realistic).
- Keep responses SHORT — 2-3 sentences max, like a real student would speak.
- Respond naturally to what other students said — agree, disagree, or add a point.
- Do NOT dominate. Do NOT lecture. Do NOT sound like a teacher or AI.
- Show NO partiality — argue for your team's position but don't be aggressive.

## DEBATE TOPIC
"{room['topic']}" from {room['subject']}, Unit {room['unit_number']}

## TEXTBOOK CONTEXT (use some of this, but don't recite it perfectly)
{(room.get('rag_context') or '')[:2000]}

## RULES
- Stay on topic.
- Support your team's side but be fair.
- Sound like a real student, NOT an AI."""

    def _ai_student_ctx_path(self, room_id: str) -> Path:
        """Path for the AI student's temporary conversation context file."""
        return self.data_dir / f"ai_ctx__{room_id}.json"

    def _load_ai_student_ctx(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Load saved AI student LLM context (messages + last processed index)."""
        path = self._ai_student_ctx_path(room_id)
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return None

    def _save_ai_student_ctx(self, room_id: str, ctx: Dict[str, Any]) -> None:
        """Save AI student LLM context to temp file."""
        path = self._ai_student_ctx_path(room_id)
        path.write_text(json.dumps(ctx, indent=2, ensure_ascii=False), encoding="utf-8")

    def _delete_ai_student_ctx(self, room_id: str) -> None:
        """Delete the AI student temp context file."""
        path = self._ai_student_ctx_path(room_id)
        try:
            if path.exists():
                path.unlink()
                print(f"  🗑️ [MultiDebate] Deleted AI student context: {path.name}")
        except OSError:
            pass

    def trigger_ai_student_response(self, room_id: str) -> Dict[str, Any]:
        """
        Generate ONE AI student response based on the current conversation.

        - Loads saved LLM context from temp file (if exists)
        - Appends any new room messages since the last call
        - Generates a single response
        - Saves updated context back to temp file
        - Call this endpoint again after more students speak for another response
        """
        room = self._load_room(room_id)
        if not room:
            return {"error": "Session not found", "success": False}
        if room["status"] != "active":
            return {"error": "Debate is not active", "success": False}
        if not room.get("has_ai_student"):
            return {"error": "This session has no AI student (even number of participants)", "success": False}

        # ── Load or initialize context ────────────────────────────────────
        ctx = self._load_ai_student_ctx(room_id)
        if ctx:
            llm_messages = ctx.get("llm_messages", [])
            last_processed_idx = ctx.get("last_processed_idx", 0)
        else:
            # First call — build from scratch with system prompt
            system_prompt = self._ai_student_system_prompt(room)
            llm_messages = [{"role": "system", "content": system_prompt}]
            last_processed_idx = 0

        # ── Append new room messages since last call ──────────────────────
        all_messages = room.get("messages", [])
        for msg in all_messages[last_processed_idx:]:
            if msg.get("role") == "student":
                if msg.get("candidate_id") == AI_STUDENT_ID:
                    llm_messages.append({"role": "assistant", "content": msg["content"]})
                else:
                    name = msg.get("candidate_name", "Student")
                    llm_messages.append({"role": "user", "content": f"{name}: {msg['content']}"})
            elif msg.get("role") == "moderator":
                llm_messages.append({"role": "user", "content": f"Moderator: {msg['content']}"})

        # ── Add turn instruction ──────────────────────────────────────────
        turn_instruction = (
            "Now it's your turn to speak. Respond as a student would — "
            "short (2-3 sentences), natural, and relevant to what was just discussed. "
            "Support your team's position."
        )
        llm_messages.append({"role": "user", "content": turn_instruction})

        response = self._call_llm(llm_messages, temperature=0.85)

        # ── Record the AI student's response in the LLM context ───────────
        llm_messages.append({"role": "assistant", "content": response})

        # Remove the turn instruction from saved context (it was temporary)
        # Keep: system + conversation messages + assistant responses
        # The turn_instruction was the second-to-last item, now assistant is last
        # We remove the instruction so it doesn't accumulate
        llm_messages.pop(-2)  # Remove the turn_instruction

        # ── Record in room messages ───────────────────────────────────────
        msg_entry = {
            "role": "student",
            "candidate_id": AI_STUDENT_ID,
            "candidate_name": AI_STUDENT_NAME,
            "content": response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_ai_student": True,
            "is_off_topic": False,
        }
        room["messages"].append(msg_entry)
        self._save_room(room)

        # ── Save updated context ──────────────────────────────────────────
        ai_turn_count = sum(
            1 for m in room["messages"]
            if m.get("candidate_id") == AI_STUDENT_ID and m.get("role") == "student"
        )
        self._save_ai_student_ctx(room_id, {
            "llm_messages": llm_messages,
            "last_processed_idx": len(room["messages"]),
            "ai_turn_count": ai_turn_count,
        })

        return {
            "success": True,
            "session_id": room_id,
            "ai_student_name": AI_STUDENT_NAME,
            "ai_student_team": room.get("ai_student_team", ""),
            "ai_turn_count": ai_turn_count,
            "response": response,
        }

    def end_room_debate(self, room_id: str) -> Dict[str, Any]:
        """End the debate: encourage less active students, generate feedback, score all."""
        room = self._load_room(room_id)
        if not room:
            return {"error": "Session not found", "success": False}
        if room["status"] == "ended":
            return {"error": "Debate already ended", "success": False}

        # ── Identify less interactive students (exclude AI student) ────────
        msg_counts = {}
        for cid in room["participants"]:
            if cid == AI_STUDENT_ID:
                continue  # Skip AI student
            msg_counts[cid] = sum(
                1 for m in room["messages"]
                if m.get("candidate_id") == cid and m.get("role") == "student"
            )
        avg_msgs = sum(msg_counts.values()) / max(len(msg_counts), 1)
        less_active = [cid for cid, cnt in msg_counts.items()
                       if cnt < avg_msgs * 0.6 and room["participants"][cid]["status"] != "removed"]

        # ── Generate encouragement for less active students ───────────────
        encouragement_messages = {}
        for cid in less_active:
            name = room["participants"][cid]["candidate_name"]
            enc_prompt = f"""You are a debate moderator. Before wrapping up, gently encourage {name} who has been less interactive.
Say something like: "Before we wrap up, {name}, is there anything you'd like to add or any final thoughts on '{room['topic']}'?"
Keep it to 1-2 warm, encouraging sentences."""
            enc_msg = self._call_llm([{"role": "user", "content": enc_prompt}])
            encouragement_messages[cid] = {"candidate_name": name, "message": enc_msg}

        room["encouragement_messages"] = encouragement_messages

        # ── Generate overall session feedback ─────────────────────────────
        blue_ids = room.get("teams", {}).get("blue_team", [])
        red_ids = room.get("teams", {}).get("red_team", [])
        blue_names = [room["participants"][c]["candidate_name"] for c in blue_ids if c in room["participants"]]
        red_names = [room["participants"][c]["candidate_name"] for c in red_ids if c in room["participants"]]

        conversation_summary = ""
        for m in room["messages"][-30:]:
            if m.get("role") == "student":
                conversation_summary += f"{m.get('candidate_name', 'Student')}: {m.get('content', '')[:150]}\n"

        feedback_prompt = f"""You are a debate moderator giving a brief overall session feedback.

Topic: "{room['topic']}"
🔵 Blue Team: {', '.join(blue_names)}
🔴 Red Team: {', '.join(red_names)}

Recent conversation:
{conversation_summary[:3000]}

Give a light, constructive feedback (4-6 sentences) that:
1. Comments on both teams' overall performance
2. Highlights any strong arguments made
3. Notes the overall quality of the debate
Be encouraging and positive. Do NOT give scores."""

        session_feedback = self._call_llm([{"role": "user", "content": feedback_prompt}])
        room["session_feedback"] = session_feedback

        # ── Score each participant ────────────────────────────────────────
        scores = {}
        for candidate_id, participant in room["participants"].items():
            # Skip AI student — not scored
            if candidate_id == AI_STUDENT_ID:
                continue

            team_name = participant.get("team", "unknown")
            team_label = "🔵 Blue Team" if team_name == "blue_team" else "🔴 Red Team"

            if participant["status"] == "removed":
                scores[candidate_id] = {
                    "candidate_name": participant["candidate_name"],
                    "team": team_name,
                    "reasoning": 0, "textbook_knowledge": 0,
                    "argumentation": 0, "communication": 0,
                    "engagement": 0, "team_collaboration": 0, "total_score": 0,
                    "overall_feedback": "Removed from session due to inappropriate content.",
                    "strengths": [], "improvements": ["Maintain appropriate discourse."],
                    "off_topic_count": participant.get("warning_count", 0),
                    "removed": True, "removed_reason": participant.get("removed_reason", ""),
                }
                continue

            student_msgs = [
                m for m in room["messages"]
                if m.get("candidate_id") == candidate_id and m.get("role") == "student"
            ]

            if not student_msgs:
                scores[candidate_id] = {
                    "candidate_name": participant["candidate_name"],
                    "team": team_name,
                    "reasoning": 0, "textbook_knowledge": 0,
                    "argumentation": 0, "communication": 0,
                    "engagement": 0, "team_collaboration": 0, "total_score": 0,
                    "overall_feedback": "No arguments submitted.",
                    "strengths": [], "improvements": ["Participate actively in debates."],
                    "off_topic_count": 0, "removed": False,
                }
                continue

            conversation = ""
            for m in room["messages"]:
                if m.get("role") == "student":
                    conversation += f"\n{m.get('candidate_name', 'Student')} ({m.get('candidate_id', '')[:6]}): {m.get('content', '')}\n"
                elif m.get("role") == "moderator" and m.get("type") != "warning":
                    conversation += f"\nModerator: {m.get('content', '')}\n"

            scoring_prompt = f"""Evaluate {participant['candidate_name']}'s performance ({team_label}) in this team debate on "{room['topic']}".

## FULL CONVERSATION
{conversation[:8000]}

## THIS STUDENT'S CONTRIBUTIONS
{chr(10).join(m.get('content', '') for m in student_msgs)}

## OFF-TOPIC WARNINGS: {participant.get('warning_count', 0)}

Score each criterion:
- reasoning (0-25): Logical structure, evidence use
- textbook_knowledge (0-25): Accuracy, subject depth
- argumentation (0-25): Argument strength, rebuttals
- communication (0-25): Clarity, coherence
- engagement (0-10): Responding to others, building on arguments
- team_collaboration (0-10): Supporting teammates, building on team arguments

{'IMPORTANT: Deduct 5 points from total for EACH off-topic warning.' if participant.get('warning_count', 0) > 0 else ''}

Return JSON:
{{"reasoning": 20, "textbook_knowledge": 18, "argumentation": 22, "communication": 19, "engagement": 8, "team_collaboration": 7, "total_score": 94, "overall_feedback": "...", "strengths": ["..."], "improvements": ["..."], "off_topic_count": {participant.get('warning_count', 0)}}}"""

            student_scores = self._call_llm_json(
                [{"role": "user", "content": scoring_prompt}], temperature=0.2
            )

            if student_scores and isinstance(student_scores, dict):
                warning_penalty = participant.get("warning_count", 0) * 5
                student_scores["total_score"] = max(0, student_scores.get("total_score", 0) - warning_penalty)
                if warning_penalty > 0:
                    student_scores.setdefault("improvements", []).append(
                        f"Score reduced by {warning_penalty} points due to {participant['warning_count']} off-topic warning(s)."
                    )
                student_scores["candidate_name"] = participant["candidate_name"]
                student_scores["team"] = team_name
                student_scores["removed"] = False
                student_scores["off_topic_count"] = participant.get("warning_count", 0)
            else:
                student_scores = {
                    "candidate_name": participant["candidate_name"],
                    "team": team_name,
                    "reasoning": 15, "textbook_knowledge": 15,
                    "argumentation": 15, "communication": 15,
                    "engagement": 5, "team_collaboration": 5, "total_score": 70,
                    "overall_feedback": "Participated in the debate.",
                    "strengths": ["Active participation"],
                    "improvements": ["Continue developing argumentation skills"],
                    "off_topic_count": participant.get("warning_count", 0),
                    "removed": False,
                }

            scores[candidate_id] = student_scores

        # ── Team score aggregation ────────────────────────────────────────
        team_scores = {"blue_team": 0, "red_team": 0}
        for team_key in ["blue_team", "red_team"]:
            team_ids = room.get("teams", {}).get(team_key, [])
            team_totals = [scores[cid].get("total_score", 0) for cid in team_ids if cid in scores]
            team_scores[team_key] = round(sum(team_totals) / max(len(team_totals), 1), 1)
        room["team_scores"] = team_scores

        # ── Update room ──────────────────────────────────────────────────
        room["status"] = "ended"
        room["ended_at"] = datetime.now(timezone.utc).isoformat()
        room["scores"] = scores
        self._save_room(room)

        # ── Clean up AI student temp context file ─────────────────────────
        if room.get("has_ai_student"):
            self._delete_ai_student_ctx(room_id)

        # ── Update student performance for each participant (skip AI student) ─
        for candidate_id, score_data in scores.items():
            if candidate_id == AI_STUDENT_ID:
                continue
            try:
                from student_performance import get_performance_tracker
                tracker = get_performance_tracker()
                participant = room["participants"][candidate_id]

                section_scores = {room["topic"]: float(score_data.get("total_score", 0))}
                tracker.record_debate_score(
                    candidate_id=candidate_id,
                    subject=room["subject"],
                    unit_number=room["unit_number"],
                    section_scores=section_scores,
                    total_score=float(score_data.get("total_score", 0)),
                    points=max(0, score_data.get("total_score", 0)),
                    unit_title=room.get("unit_name", ""),
                    candidate_name=participant.get("candidate_name", ""),
                )
            except Exception as e:
                print(f"  ⚠️ [MultiDebate] Performance update failed for {candidate_id}: {e}")

        return {
            "success": True,
            "session_id": room_id,
            "scores": scores,
            "topic": room["topic"],
            "total_participants": len(room["participants"]),
            "teams": room.get("teams", {}),
            "team_scores": team_scores,
            "session_feedback": session_feedback,
            "encouragement_messages": encouragement_messages,
        }

    def get_room(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Get session data (without rag_context to keep response smaller)."""
        room = self._load_room(room_id)
        if room:
            result = {k: v for k, v in room.items() if k != "rag_context"}
            return result
        return None

    def get_room_report_data(self, room_id: str, candidate_id: str) -> Optional[Dict[str, Any]]:
        """Get report data for a specific student in a room."""
        room = self._load_room(room_id)
        if not room or room["status"] != "ended":
            return None

        scores = room.get("scores", {}).get(candidate_id)
        participant = room.get("participants", {}).get(candidate_id)
        if not scores or not participant:
            return None

        # Extract this student's messages
        student_msgs = [
            m for m in room.get("messages", [])
            if m.get("candidate_id") == candidate_id and m.get("role") == "student"
        ]

        return {
            "session_id": room_id,
            "session_type": "multi_debate",
            "candidate_id": candidate_id,
            "candidate_name": participant.get("candidate_name", ""),
            "team": participant.get("team", ""),
            "subject": room["subject"],
            "unit_number": room["unit_number"],
            "unit_name": room.get("unit_name", ""),
            "topic": room["topic"],
            "scores": scores,
            "student_messages": student_msgs,
            "total_participants": len(room["participants"]),
            "teams": room.get("teams", {}),
            "team_scores": room.get("team_scores", {}),
            "session_feedback": room.get("session_feedback", ""),
            "encouragement_messages": room.get("encouragement_messages", {}),
            "warnings": participant.get("off_topic_warnings", []),
            "created_at": room.get("created_at"),
            "ended_at": room.get("ended_at"),
        }


# ── Global singleton ──────────────────────────────────────────────────────

_multi_debate_engine: Optional[MultiDebateEngine] = None


def get_multi_debate_engine() -> MultiDebateEngine:
    global _multi_debate_engine
    if _multi_debate_engine is None:
        _multi_debate_engine = MultiDebateEngine()
    return _multi_debate_engine
