"""
Source router for the hybrid-RAG PPT co-pilot.

Given the student's chat message, decide TWO things:

  intent  — what the student wants:
      "answer" : explain / discuss a topic (verbal suggestions, no deck change)
      "image"  : wants a picture / diagram  -> web image search, shown in CHAT only
      "edit"   : wants the SLIDE changed     -> agent's review + HITL apply path

  source  — where the text answer should come from:
      "rag"    : curriculum textbook (Qdrant) is enough
      "web"    : needs the open web (latest / real-world / not in the textbook)
      "hybrid" : use both, merge the chunks

The classification uses the house LLM convention (ppt_review._call_llm_json,
OpenAI gpt-4o-mini, strict JSON). If the LLM is unavailable it falls back to
keyword heuristics, and finally to the safe default {"answer","rag"}.

This module is pure decision-making: it performs NO search itself. The caller
(/ppt/suggest, analyze_slide_node) acts on the returned intent/source.
"""

import re
from typing import Any, Dict, Optional

INTENTS = ("answer", "image", "edit", "guide")
SOURCES = ("rag", "web", "hybrid")

# ── approval-reply parsing (when a change is awaiting the student's yes/no) ────
_APPROVE_RX = re.compile(
    r"\b(approve|approved|yes|yeah|yep|yup|ok|okay|sure|apply|accept|accepted|"
    r"confirm|confirmed|do it|go ahead|looks good|sounds good|perfect|great|"
    r"make the change|please do|proceed)\b", re.I)
_SKIP_RX = re.compile(
    r"\b(skip|later|not now|maybe later|move on|next|leave it for now)\b", re.I)
_REJECT_RX = re.compile(
    r"\b(no|nope|nah|reject|rejected|cancel|don'?t|do not|keep it|leave it|"
    r"i'?ll do it myself|not that)\b", re.I)


def parse_decision(msg: str) -> Optional[str]:
    """Map a chat reply to an approval decision when a change is pending.

    Returns "approve" | "reject" | "skip", or None when the reply isn't a clear
    yes/no (so the caller can re-prompt instead of guessing). Skip is checked before
    reject because phrases like "not now" also contain "no".
    """
    m = (msg or "").strip()
    if not m:
        return None
    if _SKIP_RX.search(m):
        return "skip"
    if _APPROVE_RX.search(m):
        return "approve"
    if _REJECT_RX.search(m):
        return "reject"
    return None

_DEFAULT = {"intent": "answer", "source": "rag", "reason": "default"}

# ── keyword heuristics (fallback when the LLM is unavailable) ──────────────────
_IMAGE_RX = re.compile(
    r"\b(image|images|picture|pic|photo|photos|diagram|illustration|visual|"
    r"figure|graphic|drawing|infographic)\b", re.I)
_EDIT_RX = re.compile(
    r"\b(edit|change|rewrite|rephrase|reword|fix|update|replace|remove|delete|"
    r"shorten|expand|restructure|reformat|make (?:it|this|the)|bold|bigger|"
    r"smaller|apply|insert into (?:the )?slide|add .* to (?:the )?slide)\b", re.I)
# The student wants to be TAUGHT/guided (options + steps), not have the agent just do it.
_GUIDE_RX = re.compile(
    r"\b(guide me|walk me through|step by step|step-by-step|teach me|show me how|"
    r"how (?:do|can|should) i|how to|in detail|guidelines|give me options|"
    r"what are my options|help me design|suggest .* design)\b", re.I)
_WEB_RX = re.compile(
    r"\b(latest|newest|recent|current|today|nowadays|this year|20\d\d|news|"
    r"real[- ]world|real life|statistic|statistics|example from|who is|who won|"
    r"when did|market|trend|trending|up[- ]to[- ]date)\b", re.I)


def _heuristic(msg: str) -> Dict[str, Any]:
    """Cheap keyword classification — order matters (image > guide > edit > web > rag)."""
    if _IMAGE_RX.search(msg):
        return {"intent": "image", "source": "web", "reason": "heuristic:image"}
    # Guide is checked before edit: "guide me on how to design/change this" is teaching,
    # not a command to change the deck.
    if _GUIDE_RX.search(msg):
        return {"intent": "guide", "source": "rag", "reason": "heuristic:guide"}
    if _EDIT_RX.search(msg):
        return {"intent": "edit", "source": "rag", "reason": "heuristic:edit"}
    if _WEB_RX.search(msg):
        return {"intent": "answer", "source": "web", "reason": "heuristic:web"}
    return dict(_DEFAULT, reason="heuristic:default")


# ── LLM classifier (primary) ──────────────────────────────────────────────────
def _llm_classify(msg: str, unit_title: str) -> Optional[Dict[str, Any]]:
    try:
        from ppt.ppt_review import _call_llm_json
    except Exception:
        return None

    system = (
        "You route a student's message in a slide-building co-pilot. Decide the INTENT "
        "and the best SOURCE for the answer. Respond in strict JSON only."
    )
    user = f"""Chapter/topic: {unit_title or '(unknown)'}
Student message: "{msg}"

Return JSON with exactly:
{{"intent": "answer" | "image" | "edit" | "guide",
  "source": "rag" | "web" | "hybrid"}}

intent:
- "image": the student wants a picture / diagram / illustration to look at.
- "edit": the student wants THIS slide CHANGED for them (rewrite, restructure, fix,
  add/remove content, make bigger/bold, apply the theme — the agent does the change).
- "guide": the student wants to be TAUGHT how to design/format the slide — they want
  step-by-step guidance, options to choose from, or how to match the theme like other
  slides. They want instructions, NOT for the agent to do it.
- "answer": the student wants an explanation or discussion of the topic (no slide change).

source (for the text answer; ignore for image):
- "rag": a school textbook chapter can answer it.
- "web": needs the open web — latest/current facts, real-world examples, or things a
  textbook chapter would not contain.
- "hybrid": both the textbook and the web help."""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], temperature=0.0)
    if not isinstance(result, dict):
        return None

    intent = str(result.get("intent", "")).strip().lower()
    source = str(result.get("source", "")).strip().lower()
    if intent not in INTENTS:
        return None
    if source not in SOURCES:
        source = "web" if intent == "image" else "rag"
    return {"intent": intent, "source": source, "reason": "llm"}


# ── public API ────────────────────────────────────────────────────────────────
def decide_source(student_msg: str,
                  snapshot: Optional[Dict[str, Any]] = None,
                  coords: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Classify the student's message.

    Returns {"intent": ..., "source": ..., "reason": ...}. Never raises — degrades
    to the heuristic, then to the safe default {"answer","rag"}.
    """
    msg = (student_msg or "").strip()
    if not msg:
        return dict(_DEFAULT, reason="empty")

    unit_title = (coords or {}).get("unit_title") or ""
    llm = _llm_classify(msg, unit_title)
    if llm:
        # image intent always searches the web regardless of the model's source guess.
        if llm["intent"] == "image":
            llm["source"] = "web"
        return llm
    return _heuristic(msg)
