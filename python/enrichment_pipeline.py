"""
Content Enrichment Pipeline for GradeUp Extraction

Enriches extracted textbook content with subject-aware teaching explanations.

KEY IMPROVEMENTS IN THIS VERSION:
- Mathematics gets its own rich schema:
    * chapter_enrichment block (big_picture, misconceptions, real_world_connections)
    * section_enrichment per section (summary, key_idea, analogy, properties)
    * subsection_enrichment per subsection
    * illustration step-by-step walkthrough
    * example: step-by-step with action/working/explanation per step
    * points_to_remember_enriched with memory hooks
- BUG FIXES:
    * Wikipedia query was returning wrong topic (e.g. Fourier Analysis for Relations chapter)
      → Fixed: web enrichment DISABLED for mathematics entirely
    * enrichment_model not propagated to output JSON → fixed
    * enrich_unit had no subject key in output → fixed
    * subject auto-detection checked wrong keys → fixed
    * MATH_EXAMPLE_ENRICH_PROMPT produced flat text → now produces structured steps array
    * EnrichmentOrchestrator used a duplicate _build_section_content → unified into
      module-level _build_section_text() helper
"""

import os
import sys
from logger import get_logger
from section_types import section_content_kind

logger = get_logger(__name__)

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import orjson

from json_repair import parse_llm_json
import requests
from dotenv import load_dotenv

# Load .env BEFORE any module-level os.getenv below.
#
# This was missing, and it silently disabled every ENRICHMENT_* override in
# .env: the model constants are read at import time (line ~115), while the only
# load_dotenv call sat inside a function that runs much later. Setting
# AVATAR_ENRICHMENT_MODEL=qwen/... in .env therefore did nothing at all - the
# code default won every time, with no warning and no log line to explain it.
# Other modules (avatar_llm, avatar_tts, avatar_visuals) already do this at
# import; this file simply never did.
for _env_file in (".env.local", ".env"):
    if os.path.exists(_env_file):
        load_dotenv(dotenv_path=_env_file)
        break


try:
    from langfuse_utils import (
        get_langfuse_client, safe_observe, update_trace_safely,
        update_generation_safely, flush_safely, score_trace_safely,
        create_span_context, trace_context, langchain_callbacks,
        update_current_observation,
    )
    LANGFUSE_AVAILABLE = True
except ImportError:
    LANGFUSE_AVAILABLE = False

    from contextlib import contextmanager as _contextmanager

    def get_langfuse_client(): return None
    def safe_observe(name=None, **kw):
        def d(fn): return fn
        return d
    def update_trace_safely(*a, **kw): pass
    def update_generation_safely(*a, **kw): pass
    def flush_safely(*a, **kw): pass
    def score_trace_safely(*a, **kw): pass
    def create_span_context(*a, **kw): return None
    def langchain_callbacks(): return []
    def update_current_observation(**kw): pass

    @_contextmanager
    def trace_context(**kw):
        yield


try:
    from web_tools import WebToolsClient
    WEB_TOOLS_AVAILABLE = True
except ImportError:
    WEB_TOOLS_AVAILABLE = False


try:
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logger.warning("Warning: langchain-openai not installed.")

# ── Model configuration ────────────────────────────────────────────────────────
# Enrichment runs on OpenRouter's Llama 4 Scout, the same model the extraction
# pipeline and the AI tutor use — except the AVATAR teaching script, which has
# its own model (see AVATAR_ENRICHMENT_MODEL).
# TTS is no longer an API call at all: avatar narration runs on Kokoro locally,
# in-process, with no key and no quota — see avatar_tts.py.
#
#   ENRICHMENT_MODEL        primary model for every subject
#   ENRICHMENT_MODEL_MATH   override for mathematics only
#   ENRICHMENT_TEMPERATURE  0.7 keeps the teaching voice natural without the
#                           JSON drift 1.0 produced on an open-weights model
ENRICHMENT_MODEL_DEFAULT = os.getenv("ENRICHMENT_MODEL", "meta-llama/llama-4-scout")
ENRICHMENT_MODEL_MATH    = os.getenv("ENRICHMENT_MODEL_MATH", ENRICHMENT_MODEL_DEFAULT)
# The AVATAR script gets its own model, separate from the rest of enrichment.
#
# It is a different job: classroom/math enrichment produces reference prose,
# while the avatar script is spoken aloud to a child and carries a structural
# contract the player depends on (segment counts, checkpoint placement,
# flashcard_type, the ten permitted emotions). Gemini 2.5 Flash is ~3x faster
# on it at an equivalent structural score - 0.90 vs Llama's 0.92 in
# bench/avatar_model_bench.py --suite teaching - and it is already the model
# running the live engine and the picture gate, so an avatar lesson is now
# written and judged by one voice instead of three.
#
# Scoped deliberately: leaving ENRICHMENT_MODEL alone keeps the maths and
# English paths on the model they were tuned against.
# Gemini slugs go DIRECT to Google on GEMINI_API_KEY, never through OpenRouter
# (user decision 2026-09-17): _avatar_client hands a Gemini model to
# avatar_llm.chat instead of building an OpenRouter ChatOpenAI client.
AVATAR_ENRICHMENT_MODEL  = os.getenv("AVATAR_ENRICHMENT_MODEL", "gemini-3.6-flash")
# The seven-phase lesson (hook MCQ, explore, mystery, real world, card pools) is
# four to six calls per section on top of the teaching script. Gemini 2.5
# Flash answers each in ~8 s; a .env that pins AVATAR_ENRICHMENT_MODEL to Qwen
# (~74 s a call) would make one section take most of ten minutes, so the lesson
# calls get their own knob and default to Gemini regardless.
AVATAR_LESSON_MODEL      = os.getenv("AVATAR_LESSON_MODEL", "gemini-3.6-flash")
ENRICHMENT_TEMPERATURE   = float(os.getenv("ENRICHMENT_TEMPERATURE", "0.7"))
# The completion budget every enrichment call carries unless it asks for its
# own. The clients used to send NO max_tokens, and a provider that reads an
# absent budget as "the whole context window" (GMICloud, for Qwen3-235B)
# rejected the request before it started: "132,669 tokens: 1,597 from the
# input and 131,072 for the completion". Six of fifteen sections in one run
# lost their avatar lesson to that, silently.
ENRICHMENT_MAX_COMPLETION_TOKENS = int(os.getenv("ENRICHMENT_MAX_COMPLETION_TOKENS", "4096"))
# ChatOpenAI wants the API root, not the chat/completions path config.py holds.
ENRICHMENT_BASE_URL      = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")
OPENAI_API_URL           = "https://api.openai.com/v1/chat/completions"

MAX_RETRIES      = 3
RETRY_DELAY      = 5
RATE_LIMIT_DELAY = 0.5

# ── Web (Wikipedia) grounding ─────────────────────────────────────────────────
# Lookups are per SECTION but cached per UNIT: a unit's sections name the same
# people and terms over and over (Aristotle, Galileo, inertia), and every miss
# costs two HTTP round trips plus the 1 s rate-limit sleep inside WebToolsClient.
# The budget caps a unit's worst case; math units skip web entirely.
WEB_ENRICHMENT_ENABLED = os.environ.get(
    "WEB_ENRICHMENT_ENABLED", "true"
).strip().lower() not in ("0", "false", "no", "off")
WEB_MAX_ENTITIES_PER_SECTION = int(os.environ.get("WEB_MAX_ENTITIES_PER_SECTION", "3"))
WEB_MAX_LOOKUPS_PER_UNIT     = int(os.environ.get("WEB_MAX_LOOKUPS_PER_UNIT", "12"))
WEB_SUMMARY_SENTENCES        = int(os.environ.get("WEB_SUMMARY_SENTENCES", "2"))
# Back-to-back requests earn a 429 from Wikipedia; pace the misses.
WEB_LOOKUP_DELAY             = float(os.environ.get("WEB_LOOKUP_DELAY", "1.0"))


# ══════════════════════════════════════════════════════════════════════════════
#  PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

ENRICH_PROMPT = """
You are an experienced school teacher explaining a topic inside a classroom.
You are NOT writing notes or listing definitions. You are teaching naturally.

STYLE: Explain using reasoning and cause-effect. Use phrases like
"This happens because...", "If we observe carefully...", "This leads to..."
Build logically. Connect ideas with small inline examples.

STRUCTURE:
1. concept_overview   — ONE short paragraph introducing the idea.
2. detailed_explanation — Strong classroom-style explanation.
3. real_world_connections — 2-3 meaningful real-life examples (array of strings).
4. faqs — 3-4 conceptual Q&A pairs.
5. practice_questions — 3-4 questions (short + descriptive mix).

Return STRICT JSON:
{
  "section_title": "",
  "concept_overview": "",
  "detailed_explanation": "",
  "real_world_connections": [""],
  "faqs": [{"question": "", "answer": ""}],
  "practice_questions": [{"question": ""}]
}
"""

MATH_SECTION_ENRICH_PROMPT = """
You are an expert Class 10 mathematics teacher.
Given a math section/subsection, produce an avatar teaching script.

STYLE: Lead with intuition. State the core point plainly. Give a memorable analogy.
List important properties. Flag common misconceptions.
For the avatar script: Speak naturally, build concepts step by step.
Every flashcard segment MUST carry "flashcard_type" — "mcq" (the default, a
checkpoint is there to test) or "informative". Never omit the field.
Each checkpoint tests the segments immediately before it, so no two checkpoints
in a section may test the same idea.
The teaching segment right before a flashcard must END by offering it in the
avatar's own voice ("...Let's try a quick question on this, shall we?"), so the
card is never dropped on the student unannounced. Put it at the end of that
segment's "text" — do not add a new field for it.

Return STRICT JSON containing ONLY the avatar explanation:
{
  "avatar_explanation": {
    "teaching_style": "socratic or visual_analogy",
    "total_duration_estimate": "X minutes",
    "segments": [
      {
        "segment_id": "seg_001",
        "type": "teaching",
        "text": "What the avatar says",
        "emotion": "enthusiastic"
      },
      {
        "segment_id": "seg_002",
        "type": "teaching",
        "text": "Key concept to test...",
        "emotion": "confident"
      },
      {
        "segment_id": "seg_003",
        "flashcard_id": "fc_001",
        "type": "flashcard",
        "flashcard_type": "mcq"
      }
    ]
  }
}
"""

MATH_EXAMPLE_ENRICH_PROMPT = """
You are an expert Class 10 mathematics teacher explaining a solved example.

For EVERY step: explain WHAT was done, show the WORKING, and explain WHY.
Create an avatar teaching script where the avatar walks the student through the problem step-by-step.

Return STRICT JSON containing ONLY the avatar explanation:
{
  "avatar_explanation": {
    "teaching_style": "step_by_step",
    "total_duration_estimate": "X minutes",
    "segments": [
      {
        "segment_id": "seg_001",
        "type": "teaching",
        "text": "What the avatar says",
        "emotion": "enthusiastic"
      },
      {
        "segment_id": "seg_002",
        "type": "teaching",
        "text": "Key concept to test...",
        "emotion": "confident"
      },
      {
        "segment_id": "seg_003",
        "flashcard_id": "fc_001",
        "type": "flashcard",
        "flashcard_type": "mcq"
      }
    ]
  }
}
"""

MATH_ILLUSTRATION_ENRICH_PROMPT = """
You are an expert Class 10 mathematics teacher explaining an illustration.
An Illustration in a TN math textbook is a short numeric worked example.

Create an avatar teaching script walking the student through the illustration.

Return STRICT JSON containing ONLY the avatar explanation:
{
  "avatar_explanation": {
    "teaching_style": "visual_walkthrough",
    "total_duration_estimate": "X minutes",
    "segments": [
      {
        "segment_id": "seg_001",
        "type": "teaching",
        "text": "What the avatar says",
        "emotion": "enthusiastic"
      },
      {
        "segment_id": "seg_002",
        "type": "teaching",
        "text": "Key concept to test...",
        "emotion": "confident"
      },
      {
        "segment_id": "seg_003",
        "flashcard_id": "fc_001",
        "type": "flashcard",
        "flashcard_type": "mcq"
      }
    ]
  }
}
"""

MATH_DEFINITION_ENRICH_PROMPT = """
You are an expert Class 10 mathematics teacher making a formal definition or
theorem accessible to students.

Start with WHY this definition exists. Rephrase in plain language first.
Give a concrete example that SATISFIES it and one that does NOT.

Create an avatar teaching script to explain this concept to the student.

Return STRICT JSON containing ONLY the avatar explanation:
{
  "avatar_explanation": {
    "teaching_style": "concept_builder",
    "total_duration_estimate": "X minutes",
    "segments": [
      {
        "segment_id": "seg_001",
        "type": "teaching",
        "text": "What the avatar says",
        "emotion": "enthusiastic"
      },
      {
        "segment_id": "seg_002",
        "type": "teaching",
        "text": "Key concept to test...",
        "emotion": "confident"
      },
      {
        "segment_id": "seg_003",
        "flashcard_id": "fc_001",
        "type": "flashcard",
        "flashcard_type": "mcq"
      }
    ]
  }
}
"""

MATH_CHAPTER_ENRICH_PROMPT = """
You are an expert Class 10 mathematics teacher giving students a bird's-eye view
of an entire chapter before they begin studying.

Return STRICT JSON:
{
  "big_picture": "",
  "prerequisite_concepts": [""],
  "real_world_connections": [""],
  "common_misconceptions": [""]
}
"""

ENGLISH_ENRICH_PROMPT = """
You are an experienced English teacher enriching a Class 10 English textbook section.
Discuss literary themes, language use, grammar rules, or writing formats naturally.

Return STRICT JSON:
{
  "section_title": "",
  "concept_overview": "",
  "detailed_explanation": "",
  "real_world_connections": [""],
  "faqs": [{"question": "", "answer": ""}],
  "practice_questions": [{"question": ""}]
}
"""

AVATAR_ENRICH_PROMPT = """
You are an experienced, expressive school teacher preparing a lesson for an AI avatar.
The avatar will SPEAK each segment aloud to a student, with emotions.

Your job: Convert the textbook content into an engaging, elaborated teaching script.

STAY INSIDE THE SECTION. This is a textbook lesson, not a general talk on the
subject. Teach what the supplied content says, using the terms it uses:
- Do NOT introduce a place, person, event, dynasty, date or example the content
  does not contain, however apt it seems. The student is examined on this
  section, and cannot tell your additions from the textbook's.
- Keep the textbook's own framing for anything it explicitly states. If the
  content says a period "is classified as Early Medieval and Later Medieval",
  say that - do not upgrade it to "historians typically divide it into...",
  which presents one classification as a universal rule the textbook never
  claimed.
- Explaining, re-wording and giving an everyday analogy for what IS there is
  exactly what you should do. Adding new facts is not.

STYLE:
- Speak naturally as if you're in a live classroom. Use "we", "let's", "notice how".
- Build concepts step by step. Use cause-effect reasoning.
- Mark key teaching segments with "flashcard_type": "mcq" to create MCQ checkpoint moments.
- These checkpoints will quiz the student before they proceed to the next segment.

FLASHCARD CHECKPOINTS:
- Shape: {"flashcard_id": "fc_XXX", "type": "flashcard", "flashcard_type": "mcq"}
- "flashcard_type" is REQUIRED on every flashcard segment. Never omit it.
- EVERY SECTION MUST HAVE EXACTLY ONE "informative" CHECKPOINT, and all the
  rest "mcq". Not zero. A section that only ever quizzes the student tests
  recall and never shows them where the idea actually turns up in life.
- Make the LAST checkpoint the informative one, so the section tests the
  concepts first and then closes on a real-world example of them.
- Every other checkpoint is "mcq" — those are there to TEST what was just
  taught.
- Typically every 2-3 teaching segments should have a flashcard checkpoint.
- Each checkpoint tests the segments immediately BEFORE it, so place them where
  a distinct idea has just finished. A section that teaches three ideas must not
  end up with three checkpoints on the same one.
- HAND OVER TO IT. The teaching segment immediately before a flashcard must END
  by offering the checkpoint in the avatar's own voice, so the card never just
  pops up on the student:
    * before an "mcq"         — "...Let's try a quick question on this, shall we?"
    * before an "informative" — "...Let me show you where this turns up in real life?"
  Tie the line to the idea just taught so it does not sound generic, and never
  hint at the answer. This goes at the END of that segment's "text" — do NOT add
  any new field for it.

EMOTIONS (use ONLY these 10 values — no sad, angry, or negative emotions):
  enthusiastic, curious, encouraging, surprised, thoughtful, playful, empathetic, confident, warm, inspiring

STRUCTURE — Return STRICT JSON:
{
  "concept_overview": "One short paragraph introducing the topic",
  "avatar_explanation": {
    "teaching_style": "storytelling or socratic or visual_analogy",
    "total_duration_estimate": "X minutes",
    "segments": [
      {
        "segment_id": "seg_001",
        "type": "teaching",
        "text": "What the avatar says",
        "emotion": "enthusiastic"
      },
      {
        "segment_id": "seg_002",
        "type": "teaching",
        "text": "Key concept to test...",
        "emotion": "confident"
      },
      {
        "segment_id": "seg_003",
        "flashcard_id": "fc_001",
        "type": "flashcard",
        "flashcard_type": "mcq"
      }
    ]
  },
  "faqs": [{"question": "", "answer": ""}],
  "practice_questions": [{"question": ""}],
  "doubt_context": {
    "related_sections": ["list of related section titles"]
  }
}

RULES:
1. Generate 6-10 teaching segments. Insert 2-4 dedicated flashcard segments among them.
2. Flashcard triggers should be spaced every 2-3 segments. Do NOT place them on the first or last segment.
   Every flashcard segment MUST carry "flashcard_type" — default to "mcq".
3. Start with an engaging introduction (enthusiastic), end with a confident summary.
4. Each segment should be 2-4 sentences max.
5. Use varied emotions — don't repeat the same emotion consecutively.
6. FAQs: 3-4 Q&A pairs. Practice questions: 3-4 questions. These are UNCHANGED from standard enrichment.
"""


#  AVATAR SEGMENT NORMALIZATION

VALID_FLASHCARD_TYPES = ("mcq", "informative")

# A checkpoint that just pops up reads as an interruption. The teaching segment
# before it ends by offering the card instead, so the avatar hands over to it in
# its own voice — no extra field, no extra TTS call, since segment text is what
# the player already speaks. Used only when the LLM did not write one itself.
_CHECKPOINT_LEAD_INS = {
    "mcq": (
        "Let's try a quick question on this — ready?",
        "Before we move on, shall we test that quickly?",
        "Let's check you've got this. Ready for a quick question?",
        "Quick question on this before we continue — shall we?",
    ),
    "informative": (
        "Let me show you where this turns up in real life — shall I?",
        "Want to see a quick example of this?",
        "Shall I give you a flashcard on this one?",
    ),
}

# Words that mark a sentence as already handing over to a checkpoint.
_LEAD_IN_RE = re.compile(
    r"\b(question|quiz|quick|test|flash\s?card|card|try|ready|shall\s+(?:we|i)|"
    r"show\s+you|example|check|have\s+a\s+go)\b",
    re.IGNORECASE,
)


def _ends_with_lead_in(text: str) -> bool:
    """True when a teaching segment already invites the checkpoint that follows."""
    tail = (text or "").strip()
    if not tail.endswith("?"):
        return False
    last_sentence = re.split(r"(?<=[.!?])\s+", tail)[-1]
    return bool(_LEAD_IN_RE.search(last_sentence))


def _strip_lead_in(text: str) -> str:
    """Remove a trailing checkpoint invitation from a teaching segment.

    Needed when a segment stops being followed by a checkpoint: otherwise the
    lesson's closing words are "Let's try a quick question on this - ready?"
    and then nothing happens, which reads as a bug to the student.
    """
    tail = (text or "").strip()
    if not _ends_with_lead_in(tail):
        return tail
    sentences = re.split(r"(?<=[.!?])\s+", tail)
    return " ".join(sentences[:-1]).strip() or tail


def _relocate_edge_flashcards(segments: List[Dict]) -> int:
    """Ensure the lesson opens and closes on TEACHING, never on a checkpoint.

    The prompt says checkpoints must not sit first or last, and both Gemini and
    Qwen ignore it in the same way: they end the script with a flashcard, so the
    section has no closing summary and simply stops on a quiz. Since a prompt
    rule is not a constraint, it is enforced here.

    A trailing checkpoint is moved back one teaching segment rather than being
    dropped - the checkpoint is still worth having, it just must not be the last
    word. The teaching segment it used to follow then has its now-dangling
    hand-over line stripped, and the segment that ends up before it will get a
    fresh one from the hand-over pass that runs after this.

    Returns how many segments were moved.
    """
    def is_card(seg: Any) -> bool:
        return isinstance(seg, dict) and seg.get("type") == "flashcard"

    def is_teaching(seg: Any) -> bool:
        return isinstance(seg, dict) and seg.get("type") == "teaching"

    def slot_between_teaching(from_end: bool) -> Optional[int]:
        """An index where inserting a card lands it BETWEEN two teaching segments.

        Checkpoints must be spaced, so a slot that would put two of them side by
        side does not count - swapping "ends on a quiz" for "two quizzes in a
        row" is not a fix.
        """
        candidates = [i for i in range(1, len(segments))
                      if is_teaching(segments[i - 1]) and is_teaching(segments[i])]
        if not candidates:
            return None
        return candidates[-1] if from_end else candidates[0]

    moved = dropped = 0
    # A script with no teaching segment at all cannot be repaired this way.
    if not any(is_teaching(s) for s in segments):
        return 0

    # ── Trailing checkpoints ────────────────────────────────────────────────
    # Loop, because a script can end with two checkpoints in a row.
    while segments and is_card(segments[-1]):
        card = segments.pop()
        slot = slot_between_teaching(from_end=True)
        if slot is None:
            # Nowhere to put it without crowding another checkpoint. The script
            # already has the rest of them, so losing this one costs less than
            # a double quiz or a lesson that stops on a question.
            dropped += 1
            continue
        segments.insert(slot, card)
        moved += 1

    # ── Leading checkpoints ─────────────────────────────────────────────────
    while segments and is_card(segments[0]):
        card = segments.pop(0)
        slot = slot_between_teaching(from_end=False)
        if slot is None:
            dropped += 1
            continue
        segments.insert(slot, card)
        moved += 1

    if dropped:
        logger.info(f"Dropped {dropped} edge checkpoint(s) with no spaced slot "
                    f"to move to — the section keeps its remaining checkpoints")

    # Any teaching segment no longer followed by a checkpoint must not still be
    # offering one.
    for idx, seg in enumerate(segments):
        if not is_teaching(seg):
            continue
        following = segments[idx + 1] if idx + 1 < len(segments) else None
        if not is_card(following) and _ends_with_lead_in(seg.get("text", "")):
            seg["text"] = _strip_lead_in(seg["text"])

    return moved


def normalize_avatar_segments(segments: List[Dict],
                              checkpoints: str = "mixed") -> List[Dict]:
    """Make an avatar script's segments well-formed, whatever the LLM returned.

    Guarantees, in place:
      * continuous ``segment_id`` / ``flashcard_id`` numbering
      * ``type`` is exactly "teaching" or "flashcard"
      * every flashcard carries a valid ``flashcard_type``

    ``checkpoints`` is what the lesson wants inside the explanation:
      * ``"mixed"``       - today's rule: mcq by default, one informative (legacy)
      * ``"informative"`` - every card is informative; MCQs live in the lesson's
                            hook and quiz phases instead, so none may sit here
      * ``"none"``        - no cards at all (hand-over lines stripped)

    That last one is the reason this exists.  ``flashcard_type`` is optional as
    far as the LLM is concerned and it drops the field most of the time, which
    leaves the player with a checkpoint it cannot classify — it falls back to the
    informative popup, so a lesson that should quiz the student just shows them
    more text.  A checkpoint exists to TEST, so a missing or unrecognised value
    becomes "mcq", and a section whose checkpoints are all informative gets its
    first one promoted so there is always at least one real question.
    """
    if not segments:
        return segments

    if checkpoints == "none":
        segments[:] = [s for s in segments
                       if isinstance(s, dict) and s.get("type") != "flashcard"]
        for seg in segments:
            seg["type"] = "teaching"
            seg["text"] = _strip_lead_in(seg.get("text", ""))
        for i, seg in enumerate(segments, 1):
            seg["segment_id"] = f"seg_{i:03d}"
        return segments

    informative_only = checkpoints == "informative"
    default_type = "informative" if informative_only else "mcq"

    seg_counter = fc_counter = 0
    flashcards: List[Dict] = []
    defaulted = 0

    for seg in segments:
        if not isinstance(seg, dict):
            continue
        seg_counter += 1
        seg["segment_id"] = f"seg_{seg_counter:03d}"

        if seg.get("type") == "flashcard":
            fc_counter += 1
            if not seg.get("flashcard_id"):
                seg["flashcard_id"] = f"fc_{fc_counter:03d}"
            fc_type = str(seg.get("flashcard_type") or "").strip().lower()
            if informative_only:
                # The quiz is a later phase of the lesson: a card inside the
                # explanation only ever illustrates, never tests.
                seg["flashcard_type"] = "informative"
            elif fc_type not in VALID_FLASHCARD_TYPES:
                seg["flashcard_type"] = default_type
                defaulted += 1
            else:
                seg["flashcard_type"] = fc_type
            flashcards.append(seg)
        else:
            seg["type"] = "teaching"

    # A checkpoint must never open or close the lesson. Runs BEFORE the
    # promotion rules below, because both of them pick a card by position
    # (first / last) and this is what settles the order.
    relocated = _relocate_edge_flashcards(segments)
    if relocated:
        # Order changed, so ids have to be reissued or they no longer read in
        # sequence, and rebuild the flashcard list the rules below index into.
        seg_counter = fc_counter = 0
        flashcards = []
        for seg in segments:
            if not isinstance(seg, dict):
                continue
            seg_counter += 1
            seg["segment_id"] = f"seg_{seg_counter:03d}"
            if seg.get("type") == "flashcard":
                fc_counter += 1
                seg["flashcard_id"] = f"fc_{fc_counter:03d}"
                flashcards.append(seg)
        logger.info(f"Moved {relocated} checkpoint(s) away from the start/end "
                    f"so the lesson opens and closes on teaching")

    if (not informative_only and flashcards
            and not any(s["flashcard_type"] == "mcq" for s in flashcards)):
        flashcards[0]["flashcard_type"] = "mcq"
        logger.info("All checkpoints came back 'informative' — promoted the "
                    "first one to 'mcq' so the section still tests the student")

    # ...and the mirror rule: every section should also SHOW the student where
    # the idea turns up in real life, not only quiz them on it. The prompt asks
    # for one informative checkpoint, but "flashcard_type" is the field models
    # drop or default hardest — the observed output was three checkpoints, all
    # mcq — so the guarantee is made here rather than hoped for upstream.
    #
    # The LAST checkpoint is the one converted: by then the concepts have been
    # taught and tested, which is exactly where a real-world example lands
    # best, and it leaves the earlier checkpoints doing the testing.
    #
    # Only when there are two or more. A section with a single checkpoint keeps
    # it as an mcq, because testing matters more than illustrating when there
    # is only room for one.
    if (not informative_only and len(flashcards) >= 2 and not any(
            s["flashcard_type"] == "informative" for s in flashcards)):
        flashcards[-1]["flashcard_type"] = "informative"
        logger.info("No 'informative' checkpoint in this section — converted "
                    "the last one, so the lesson ends on a real-world example")

    if defaulted:
        logger.info(f"{defaulted}/{len(flashcards)} checkpoint(s) had no valid "
                    f"flashcard_type — defaulted to 'mcq'")

    # Hand over to each checkpoint from the teaching segment before it. Runs
    # last, so the wording matches the flashcard_type finally settled on above.
    added = 0
    for idx, seg in enumerate(segments):
        if not isinstance(seg, dict) or seg.get("type") != "flashcard":
            continue
        previous = next(
            (s for s in reversed(segments[:idx])
             if isinstance(s, dict) and s.get("type") == "teaching"
             and (s.get("text") or "").strip()),
            None,
        )
        if previous is None:
            continue
        text = previous["text"].strip()
        if _ends_with_lead_in(text):
            continue
        choices = _CHECKPOINT_LEAD_INS.get(seg["flashcard_type"],
                                           _CHECKPOINT_LEAD_INS["mcq"])
        previous["text"] = f"{text} {choices[added % len(choices)]}"
        added += 1

    if added:
        logger.info(f"Added a hand-over line to {added} segment(s) so the "
                    f"avatar offers the checkpoint instead of it just popping up")

    return segments


@dataclass
class FAQ:
    question: str
    answer: str

@dataclass
class PracticeQuestion:
    question: str

@dataclass
class SectionEnrichment:
    concept_overview: str = ""
    detailed_explanation: str = ""
    real_world_connections: List[str] = field(default_factory=list)
    faqs: List[FAQ] = field(default_factory=list)
    practice_questions: List[PracticeQuestion] = field(default_factory=list)


#  HELPERS

def load_env() -> None:
    for env_file in (".env.local", ".env"):
        if Path(env_file).exists():
            load_dotenv(dotenv_path=env_file)
            break

def save_json(data: dict, path: Path) -> None:
    path.write_bytes(orjson.dumps(data, option=orjson.OPT_INDENT_2))

def load_json(path: Path) -> dict:
    return orjson.loads(path.read_bytes())

def _is_math(subject: Optional[str]) -> bool:
    # "maths" is what the upload form actually sends for TN state books; without
    # it those units took the general path (and would now fetch web references).
    return subject in ("mathematics", "math", "maths")

def _build_section_text(section: Dict) -> str:
    """Build plain-text from a section dict.
    Handles UNIVERSAL schema (type/title/content/sub_items/metadata)
    and LEGACY schema (section_title/content/subsections).
    """
    parts = []
    title = (section.get("title") or section.get("section_title")
             or section.get("subsection_title") or section.get("id", ""))
    if title:
        parts.append(f"# {title}")
    if content := section.get("content"):
        if isinstance(content, str) and content.strip():
            parts.append(content)
    # Universal: sub_items (exercises, MCQ, poem stanzas)
    for item in section.get("sub_items", []):
        num = item.get("number", "")
        c = item.get("content", "") or ""
        opts = item.get("options", [])
        if c:
            line = f"{num}. {c}" if num else c
            if opts:
                line += "\n" + "\n".join(f"  {o}" for o in opts)
            parts.append(line)
    # Universal: metadata fields (aim, materials, solution, etc.)
    meta = section.get("metadata", {})
    if isinstance(meta, dict):
        for mk, mv in meta.items():
            if isinstance(mv, str) and mv.strip() and mk not in ("section_context", "order_in_chapter"):
                parts.append(f"{mk}: {mv}")
    # Legacy/Universal subsections
    sub_list = section.get("subsections") or section.get("sub_sections") or []
    for sub in sub_list:
        sub_title = sub.get("subsection_title") or sub.get("title") or sub.get("id", "")
        if sub_title:
            parts.append(f"\n## {sub_title}")
        if sub_content := sub.get("content"):
            if isinstance(sub_content, str) and sub_content.strip():
                parts.append(sub_content)
    return "\n\n".join(parts)

# ── Lesson planning: one avatar lesson per SECTION, boxes explained inside it ─
#
# A textbook section is a heading, its running text, and the boxes printed
# alongside it: a definition, a figure, a Thinking Corner, a Warm-up. The
# extractor files nested boxes under the section (folded into the lesson by
# _build_section_text) but just as often files them FLAT, as siblings - and
# the enrichment loop enriched every top-level entry that was not an exercise
# or an illustration. So "Definition of Resource" (200 chars), "Thinking
# Corner" and "Warm-up" each got a full lesson, a visuals search and two audio
# files of their own, and the section they belong to taught without them.
#
# A lesson is the section plus every box that follows it up to the next
# section. Back matter closes the run: a box after the exercises (a
# PROJECT/ACTIVITY) is its own teaching block, not part of the last section.

# Types that anchor a lesson of their own.
_LESSON_ANCHOR_TYPES = frozenset({"section", "introduction", "supplementary"})

# Never enriched, and never folded either: questions are the player's job.
_LESSON_SKIP_TYPES = frozenset({"exercise", "multiple_choice", "unit_exercise",
                                "evaluation"})

# After one of these, boxes no longer belong to the section above.
_LESSON_CLOSE_TYPES = frozenset({"exercise", "multiple_choice", "unit_exercise",
                                 "evaluation", "summary", "glossary",
                                 "points_to_remember"})

_AUXILIARY_TITLE_WORDS = ("summary", "glossary", "reference", "student activity",
                          "life skill", "learning objective", "puzzle", "crossword",
                          "word search", "answer grid")


def _section_label(sec: Dict) -> str:
    stype = str(sec.get("type") or "section")
    return (sec.get("section_title") or sec.get("title") or sec.get("id")
            or stype.replace("_", " ").title())


def _plan_lessons(sections: List[Dict]) -> List[Dict[str, Any]]:
    """Group top-level sections into lessons: [{anchor, members}], by index.

    `anchor` is the section that gets the lesson; `members` are the boxes
    explained inside it. A box with no section to belong to (before the first
    heading, or after the back matter) becomes a lesson of its own so nothing
    teachable is dropped - that is the old behaviour, kept for exactly the
    cases where it was right.
    """
    lessons: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None
    preamble: List[int] = []                 # boxes before the first section

    for idx, sec in enumerate(sections):
        stype = str(sec.get("type") or "section").lower()
        if stype in _LESSON_SKIP_TYPES:
            current = None                    # back matter: close the lesson
            continue
        if stype in _LESSON_CLOSE_TYPES:
            current = None
            continue
        if stype in _LESSON_ANCHOR_TYPES:
            current = {"anchor": idx, "members": list(preamble)}
            preamble = []
            lessons.append(current)
            continue
        # A box. Fold it into the open lesson, hold it for the first one, or
        # let it stand alone when there is no section for it to belong to.
        if current is not None:
            current["members"].append(idx)
        elif not lessons:
            preamble.append(idx)
        else:
            lessons.append({"anchor": idx, "members": []})

    for idx in preamble:                      # a unit with no section at all
        lessons.append({"anchor": idx, "members": []})
    return lessons


def _lesson_text(sections: List[Dict], anchor: int, members: List[int]) -> str:
    """The section's own text, then each box under its own sub-heading so the
    script can teach it in place. Figures contribute their caption, which is
    what the avatar can actually talk about and what the visuals gate grounds
    against."""
    parts = [_build_section_text(sections[anchor])]
    for idx in members:
        sec = sections[idx]
        stype = str(sec.get("type") or "").lower()
        label = _section_label(sec)
        if stype == "illustration":
            parts.append(f"## Figure: {label}")
            continue
        body = _build_section_text(sec)
        head, sep, rest = body.partition("\n")
        if sep and head.lstrip().startswith("#"):
            body = rest.lstrip("\n")         # the label is added below, once
        kind = stype.replace("_", " ").title() if stype not in ("prose", "other", "") else ""
        parts.append(f"## {label}{f' ({kind})' if kind and kind.lower() not in label.lower() else ''}\n\n{body}")
    return "\n\n".join(p for p in parts if p.strip())


def _detect_subject(document_id: str, structured_data: Dict) -> Optional[str]:
    """Detect subject from metadata or document_id keywords.

    BUG FIX: structured_data["subject"] is checked first (top-level), but the
    Social Science pipeline puts "subject" inside each unit dict, not at the top.
    We now also check the first unit's "subject" key as a fallback.
    """
    # Top-level subject key (set by some pipelines)
    if subj := structured_data.get("subject"):
        return subj.lower()

    # BUG FIX: Subject stored inside first unit (Social Science / Science pipeline)
    content_key = "chapters" if "chapters" in structured_data else "units"
    units = structured_data.get(content_key, [])
    if units and (subj := units[0].get("subject")):
        return subj.lower()

    # Keyword matching on document_id (filename)
    doc = document_id.lower()
    if any(k in doc for k in ("math", "maths", "mathematics")):
        return "mathematics"
    if any(k in doc for k in ("science", "sci", "physics", "chemistry", "biology")):
        return "science"
    if any(k in doc for k in ("english", "eng", "prose", "grammar")):
        return "english"
    if any(k in doc for k in ("social", "history", "geography", "civics", "economics")):
        return "social_science"
    return None


# ══════════════════════════════════════════════════════════════════════════════
#  AVATAR TTS AUDIO GENERATION
# ══════════════════════════════════════════════════════════════════════════════

# Avatar narration runs on KOKORO, locally - see avatar_tts.py.
#
# This used to call OpenAI's gpt-4o-mini-tts with the voices "echo" and
# "shimmer". That account is out of credits (credit_balance_exhausted on every
# request), so the enrichment audio pass was failing on every segment, silently
# producing enrichment with no audio at all.
#
# Kokoro needs no key and has no quota, which also removes the retry/backoff
# and the inter-call sleep this function used to need: there is no rate limit
# to respect when the model is running in-process.
#
# Voices come from avatar_tts so there is ONE place that decides how the avatar
# sounds, shared with the /avatar/section route. Defaults are af_heart (the
# model's only grade-A voice) and am_michael.
AVATAR_TTS_ENGINE = "kokoro"


def _avatar_audio_ext() -> str:
    """The container avatar_tts is producing RIGHT NOW - mp3 from the hosted
    service, wav from local Kokoro. Read per call, not at import, because a
    remote outage mid-run switches it."""
    try:
        import avatar_tts
        return avatar_tts.output_format()
    except Exception:
        return "wav"


def _avatar_voices() -> Tuple[str, str]:
    """(male, female) voice names, resolved from avatar_tts at call time."""
    try:
        import avatar_tts
        return avatar_tts.VOICE_MALE, avatar_tts.VOICE_FEMALE
    except Exception:
        return "am_michael", "af_heart"


def _generate_avatar_tts(text: str, voice: str) -> Optional[bytes]:
    """Generate TTS audio bytes with Kokoro, locally.

    Args:
        text: The text to convert to speech
        voice: A Kokoro voice name (e.g. "am_michael", "af_heart")

    Returns:
        Audio bytes (WAV) or None on failure
    """
    if not (text or "").strip():
        return None
    try:
        import avatar_tts
    except ImportError as e:
        logger.warning(f"avatar_tts unavailable ({e}) — skipping audio generation")
        return None

    available, reason = avatar_tts.is_available()
    if not available:
        # Once. This fired for every segment and voice after the circuit
        # tripped - 130 identical lines in one run - and buried the one
        # message that mattered: why.
        global _tts_unavailable_reported
        if reason != _tts_unavailable_reported:
            _tts_unavailable_reported = reason
            logger.warning(f"Avatar TTS unavailable ({reason}) — audio will be "
                           f"skipped for the rest of this run")
        return None

    return avatar_tts.synthesize(text, voice)


_tts_unavailable_reported: Optional[str] = None


def _generate_segment_audio(
    segment: Dict,
    board: str,
    class_number: str,
    subject: str,
    unit_number: int,
) -> Dict:
    """Generate male & female TTS audio for a single segment and upload to S3.

    For teaching segments: reads the "text" field.
    For flashcard segments: reads the "avatar_line" field.

    Returns:
        {"male": "<s3_url>", "female": "<s3_url>"} or {} on failure
    """
    seg_type = segment.get("type", "")
    segment_id = segment.get("segment_id", "unknown")

    # Determine the spoken text based on segment type
    if seg_type == "teaching":
        spoken_text = segment.get("text", "")
    elif seg_type == "flashcard" or segment.get("card_id"):
        # A flashcard, or one card of a lesson's informative pool
        spoken_text = segment.get("avatar_line", "")
        segment_id = segment.get("card_id") or segment_id
    else:
        return {}

    if not spoken_text or not spoken_text.strip():
        return {}

    try:
        from s3_storage import upload_avatar_audio_to_s3
    except ImportError:
        logger.warning("s3_storage not available — skipping audio upload")
        return {}

    audio_urls = {}

    # Generate unique ID to prevent overwriting if segment_id repeats across sections
    unique_id = uuid.uuid4().hex[:8]
    voice_male, voice_female = _avatar_voices()

    # Kokoro runs in-process, so there is no rate limit to sleep between calls.
    for gender, voice in (("male", voice_male), ("female", voice_female)):
        audio = _generate_avatar_tts(spoken_text, voice)
        if not audio:
            continue
        # Extension read AFTER synthesis - see _avatar_audio_ext.
        ext = _avatar_audio_ext()
        url = upload_avatar_audio_to_s3(
            audio_bytes=audio,
            filename=f"{segment_id}_{unique_id}_{gender}.{ext}",
            board=board,
            class_number=class_number,
            subject=subject,
            unit_number=unit_number,
        )
        if url:
            audio_urls[gender] = url

    return audio_urls


def _process_segments_audio(
    segments: List[Dict],
    board: str,
    class_number: str,
    subject: str,
    unit_number: int,
) -> int:
    """Generate audio for all segments in a list. Modifies segments in-place.

    Adds an "audio" dict with "male" and "female" S3 URLs to each segment.

    Returns:
        Number of segments that got audio successfully
    """
    audio_count = 0
    for seg in segments:
        audio_urls = _generate_segment_audio(
            segment=seg,
            board=board,
            class_number=class_number,
            subject=subject,
            unit_number=unit_number,
        )
        if audio_urls:
            seg["audio"] = audio_urls
            audio_count += 1
        time.sleep(RATE_LIMIT_DELAY)  # Rate limit between segments
    return audio_count


def _section_lesson(section: Dict, is_math: bool) -> Optional[Dict]:
    """The seven-phase lesson stored on a section, in either enrichment shape."""
    holder = section.get("section_enrichment" if is_math else "enrichment") or {}
    lesson = holder.get("avatar_lesson") if isinstance(holder, dict) else None
    return lesson if isinstance(lesson, dict) and lesson.get("phases") else None


def _lesson_spoken_nodes(lesson: Dict) -> List[Dict]:
    from avatar_lesson_patterns import iter_spoken_nodes
    return list(iter_spoken_nodes(lesson))


def _generate_unit_audio(
    enriched_unit: Dict,
    board: str,
    class_number: str,
    subject: str,
    is_math: bool,
) -> int:
    """Generate TTS audio for all segments in an enriched unit.

    Handles both math and non-math enrichment structures:
    - Non-math: sections[].enrichment.avatar_explanation.segments[]
    - Math: sections[].section_enrichment.avatar_explanation.segments[]
            sections[].sub_sections[].enrichment.avatar_explanation.segments[]

    Modifies the enriched_unit dict in-place.

    Returns:
        Total number of segments that got audio
    """
    unit_number = enriched_unit.get("unit_number", 0)
    total_audio = 0

    for section in enriched_unit.get("sections", []):
        sec_title = section.get("section_title") or section.get("title", "Unknown Section")

        # A seven-phase lesson carries its own spoken nodes (hook, option
        # reasons, card lines, explore, real world, quiz frame, reflect) in
        # play order; narrate those instead of a legacy segments list.
        lesson = _section_lesson(section, is_math)
        if lesson:
            logger.info(f"-> Audio for lesson: {sec_title}")
            total_audio += _process_segments_audio(
                _lesson_spoken_nodes(lesson), board, class_number, subject, unit_number
            )
            continue

        if is_math:
            # Math: section-level enrichment
            sec_enrich = section.get("section_enrichment", {})
            avatar_exp = sec_enrich.get("avatar_explanation", {})
            segments = avatar_exp.get("segments", [])
            if segments:
                logger.info(f"-> Audio for section: {sec_title}")
                total_audio += _process_segments_audio(
                    segments, board, class_number, subject, unit_number
                )

            # Math: sub_section-level enrichments
            for sub_sec in section.get("sub_sections", []):
                sub_title = sub_sec.get("title") or sub_sec.get("id", "Unknown Subsection")
                sub_enrich = sub_sec.get("enrichment", {})
                sub_avatar = sub_enrich.get("avatar_explanation", {})
                sub_segments = sub_avatar.get("segments", [])
                if sub_segments:
                    logger.info(f"-> Audio for sub-section: {sub_title}")
                    total_audio += _process_segments_audio(
                        sub_segments, board, class_number, subject, unit_number
                    )

        else:
            # Non-math: enrichment.avatar_explanation.segments
            enrichment = section.get("enrichment", {})
            avatar_exp = enrichment.get("avatar_explanation", {})
            segments = avatar_exp.get("segments", [])
            if segments:
                logger.info(f"-> Audio for section: {sec_title}")
                total_audio += _process_segments_audio(
                    segments, board, class_number, subject, unit_number
                )

    return total_audio


def generate_audio_for_enriched_data(
    enriched_data: Dict, 
    board: str, 
    class_number: str, 
    subject: str, 
    is_math: bool
) -> Dict:
    """Iterates over an already-enriched JSON dictionary and adds TTS audio URLs to segments.
    
    Modifies enriched_data in-place and returns it.
    """
    content_key = "chapters" if "chapters" in enriched_data else "units"
    total_audio_segments = 0

    logger.info(f"Generating avatar audio for existing enriched data (male + female voices)...")
    
    for enriched_unit in enriched_data.get(content_key, []):
        unit_num = enriched_unit.get("unit_number") or enriched_unit.get("chapter_number", "?")
        unit_ttl = enriched_unit.get("title", "")
        logger.info(f"Unit {unit_num}: {unit_ttl}")
        
        try:
            count = _generate_unit_audio(
                enriched_unit=enriched_unit,
                board=board,
                class_number=class_number,
                subject=subject,
                is_math=is_math,
            )
            total_audio_segments += count
            logger.info(f"{count} segments got audio")
        except Exception as e:
            logger.warning(f"Audio generation error for unit {unit_num}: {e}")
            
    logger.info(f"Audio generation complete: {total_audio_segments} segments processed")
    
    return enriched_data



# ══════════════════════════════════════════════════════════════════════════════
#  CONTENT ENRICHER
# ══════════════════════════════════════════════════════════════════════════════

# ── Lookup-entity extraction (no LLM) ─────────────────────────────────────────
# Picking what to look up must not cost an OpenAI call — that would double the
# per-section spend for a background fact. Two cheap signals carry most of the
# value: what the textbook chose to emphasise, and the proper nouns it names.

# "*Aristotle*", "**violent motion**"
_EMPHASIS_RE = re.compile(r"\*{1,2}([^*\n]{3,60}?)\*{1,2}")

# "Aristotle", "Leaning Tower of Pisa", "Isaac Newton"
_PROPER_NOUN_RE = re.compile(
    r"\b[A-Z][a-z]{2,}(?:\s+(?:of|the|de|van|von)\s+[A-Z][a-z]{2,}|\s+[A-Z][a-z]{2,}){0,3}\b"
)

# Sentence-initial words and textbook furniture that look like proper nouns.
_ENTITY_STOPWORDS = {
    "the", "this", "that", "these", "those", "there", "then", "thus", "such",
    "when", "where", "while", "with", "without", "what", "which", "who", "why",
    "how", "here", "his", "her", "him", "she", "they", "their", "them", "its",
    "and", "but", "for", "from", "further", "furthermore", "according", "also",
    "after", "before", "because", "both", "each", "every", "hence", "however",
    "let", "now", "once", "only", "since", "some", "still", "than", "therefore",
    "you", "your", "our", "one", "two", "three", "first", "second", "third",
    "figure", "fig", "table", "activity", "example", "exercise", "note", "unit",
    "chapter", "section", "class", "student", "students", "teacher", "answer",
    "question", "questions", "solution", "summary", "glossary", "reference",
    "observe", "notice", "consider", "define", "explain", "state", "write",
    "aim", "materials", "procedure", "result", "conclusion", "caution",
}


# Role and common nouns that pass the proper-noun regex but are worthless as
# lookups — "Scientist" returns "a person who studies science", which teaches
# nobody anything and burns a request. A role phrase ends with the role, so
# "Greek Philosopher" is dropped while "Isaac Newton" survives.
_GENERIC_TERMS = {
    "scientist", "scientists", "philosopher", "philosophers", "mathematician",
    "physicist", "chemist", "biologist", "astronomer", "author", "poet",
    "writer", "teacher", "student", "researcher", "inventor", "explorer",
    "king", "queen", "emperor", "ruler", "leader", "minister", "president",
    "people", "person", "man", "woman", "child", "body", "bodies", "thing",
    "things", "world", "nature", "state", "states", "way", "ways", "part",
    "parts", "kind", "kinds", "type", "types", "case", "cases", "point",
    "points", "book", "books", "page", "pages", "line", "lines", "word",
    "words", "term", "terms", "name", "names", "day", "days", "year", "years",
    "time", "times", "place", "places", "group", "groups", "number", "numbers",
}


def _clean_entity(raw: str) -> str:
    """Trim punctuation/markup off a candidate and normalize its whitespace."""
    text = re.sub(r"\s+", " ", (raw or "").strip())
    text = text.strip("*_`'\"()[]{}.,;:!?-—–")
    return text.strip()


def _is_name_like(entity: str) -> bool:
    """Every word capitalised — "Galileo", "Mughal Empire", "O. Henry".

    Distinguishes a name the book italicised from jargon it bolded
    ("Force independent"), which is worth trying but far less likely to resolve.
    """
    words = [w for w in entity.split() if w.casefold() not in {"of", "the", "de", "van", "von"}]
    return bool(words) and all(w[:1].isupper() for w in words)


_IMAGE_MD_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_URL_RE = re.compile(r"https?://\S+")


def _has_teachable_prose(content: str, minimum: int = 50) -> bool:
    """True when a section still has real text once images and URLs are removed.

    An image-only section ("![img-0.jpeg](https://…)") is longer than any
    character threshold but contains nothing to teach: enriching it burns an
    LLM call and two TTS calls to narrate a URL.
    """
    stripped = _URL_RE.sub("", _IMAGE_MD_RE.sub("", content or ""))
    return len(stripped.strip()) >= minimum


def _opens_sentence(body: str, idx: int) -> bool:
    """True when the match at `idx` sits at the start of a sentence, line or list item."""
    i = idx - 1
    while i >= 0 and body[i] in " \t":
        i -= 1
    if i < 0:
        return True
    return body[i] in ".!?:;\n\r*•-–—()"


def _is_lookup_worthy(entity: str) -> bool:
    if len(entity) < 4 or len(entity) > 60:
        return False
    words = entity.split()
    if not words or len(words) > 5:
        return False
    if not any(c.isalpha() for c in entity):
        return False
    # A single stopword, or a phrase built only from stopwords, is furniture.
    if all(w.casefold() in _ENTITY_STOPWORDS for w in words):
        return False
    if words[0].casefold() in _ENTITY_STOPWORDS:
        return False
    # "Scientist"; "Greek Philosopher" — the head noun is the giveaway.
    if words[-1].casefold() in _GENERIC_TERMS:
        return False
    return True


def _summary_matches(entity: str, summary: str) -> bool:
    """Guard against a search resolving to an unrelated article.

    Wikipedia search never returns nothing — ask it for "natural motion" and it
    hands back a video-game company. Require the entity's own significant words
    to appear as words in the summary before trusting it.
    """
    text = (summary or "").casefold()
    significant = [
        w for w in re.findall(r"[a-z]{4,}", entity.casefold())
        if w not in _ENTITY_STOPWORDS
    ]
    if not significant:
        return True
    return all(re.search(r"\b" + re.escape(w) + r"\w*", text) for w in significant)


def _extract_lookup_entities(
    section_title: str,
    content: str,
    limit: int = WEB_MAX_ENTITIES_PER_SECTION,
) -> List[Tuple[str, bool]]:
    """Pick the few names/terms in a section worth a reference lookup.

    Returns (entity, allow_search) pairs, best first: the proper nouns the
    section names — encyclopedias are strongest on people, places and laws —
    then the terms the textbook emphasised. The section title is a fallback only
    when nothing else survived, since a heading like "Inertia and its Types"
    resolves to nothing and still costs a request.

    `allow_search` is True only for candidates that read as names in the prose.
    Emphasised jargon ("natural motion", "Force independent") is looked up by
    exact article title and dropped when there is no such article — searching
    for it returns a confidently wrong page instead of nothing.
    """
    if limit <= 0:
        return []

    body = content or ""

    # A single capitalised word that ONLY ever opens a sentence is almost always
    # ordinary prose — "Green plants…", "Study the sentences…", "Adjectives have…".
    # A real name shows up mid-sentence at least once, or is multi-word.
    display: Dict[str, str] = {}
    mid_sentence: Dict[str, bool] = {}
    for m in _PROPER_NOUN_RE.finditer(body):
        candidate = _clean_entity(m.group(0))
        if not candidate:
            continue
        key = candidate.casefold()
        display.setdefault(key, candidate)
        mid_sentence[key] = mid_sentence.get(key, False) or not _opens_sentence(body, m.start())

    proper = [
        display[k] for k in display
        if mid_sentence[k] or len(display[k].split()) > 1
    ]
    emphasised = [_clean_entity(m.group(1)) for m in _EMPHASIS_RE.finditer(body)]
    # A name the book italicised (Galileo) beats a term it bolded ("violent
    # motion"): the first almost always has an article, the second rarely does.
    emphasised.sort(key=lambda c: not _is_name_like(c))

    name_keys = {c.casefold() for c in proper} | {
        c.casefold() for c in emphasised if _is_name_like(c)
    }

    out: List[Tuple[str, bool]] = []
    seen: set = set()
    for candidate in proper + emphasised:
        if not _is_lookup_worthy(candidate):
            continue
        key = candidate.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append((candidate, key in name_keys))
        if len(out) >= limit:
            break

    if not out:
        title = _clean_entity(section_title or "")
        if title.isupper():
            title = title.capitalize()   # "FORCE AND MOTION" -> "Force and motion"
        if _is_lookup_worthy(title):
            out.append((title, False))
    return out


try:
    from config import openrouter_routing as _enrichment_routing
except Exception:                                    # config not importable in tests
    def _enrichment_routing(model=None):
        return {}


# JSON repair lives in json_repair.py — shared with the extraction pipeline,
# which hits the same malformed-reply shapes.


class _DirectChat:
    """A stand-in for the LangChain client: one model served by avatar_llm.chat.

    Gemini goes direct to Google on GEMINI_API_KEY (user decision 2026-09-17),
    and avatar_llm is the one place that knows the wire quirks (token field,
    JSON mode, retired slugs), so a Gemini avatar / lesson call never touches
    the OpenRouter ChatOpenAI client at all.
    """

    def __init__(self, model: str, timeout: int = 120):
        self.model = model
        self.timeout = int(timeout or 120)

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int) -> Optional[str]:
        import avatar_llm
        result = avatar_llm.chat(self.model, system_prompt, user_prompt,
                                 max_tokens=max_tokens, temperature=ENRICHMENT_TEMPERATURE,
                                 force_json=True, timeout=self.timeout,
                                 trace_name="enrich-avatar")
        if not result.ok:
            logger.warning(f"{self.model} call failed: {result.error[:200]}")
            return None
        return result.text


class ContentEnricher:
    """Generates enrichments via OpenRouter / Llama 4 Scout with subject-aware prompts."""

    def __init__(self, api_key: Optional[str] = None, timeout: int = 120,
                 subject: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY")
        self.timeout = timeout
        self.subject = subject
        self.model   = ENRICHMENT_MODEL_MATH if _is_math(subject) else ENRICHMENT_MODEL_DEFAULT
        self.langfuse = get_langfuse_client() if LANGFUSE_AVAILABLE else None
        if not self.api_key:
            raise ValueError(
                "OPENROUTER_API_KEY not set in environment — enrichment runs on "
                "OpenRouter (Llama 4 Scout)"
            )

        # OpenRouter speaks the OpenAI wire protocol, so ChatOpenAI drives it
        # unchanged; only the base URL, key and the attribution headers differ.
        # Routing rides in extra_body — "provider" is an OpenRouter body field,
        # not an OpenAI one, so the SDK would reject it as a named argument.
        self.llm = ChatOpenAI(
            model=self.model,
            openai_api_key=self.api_key,
            base_url=ENRICHMENT_BASE_URL,
            temperature=ENRICHMENT_TEMPERATURE,
            max_tokens=ENRICHMENT_MAX_COMPLETION_TOKENS,
            model_kwargs={"response_format": {"type": "json_object"}},
            extra_body=_enrichment_routing(self.model),
            default_headers={
                "HTTP-Referer": os.getenv("OPENROUTER_APP_URL", "https://gradeupapi.careeriq.ai"),
                "X-Title": os.getenv("OPENROUTER_APP_NAME", "GradeUp-AI"),
            },
            timeout=self.timeout,
            # Attached here rather than at each .invoke(): the handler records
            # model, tokens and cost for every enrichment call on its own.
            callbacks=langchain_callbacks(),
        )

        # The avatar script's own client(s), built on first use so a run that
        # never touches the avatar path pays nothing for it. Keyed by model:
        # the lesson builder's calls may run on a different one.
        self._avatar_llms: Dict[str, ChatOpenAI] = {}

        # Web grounding state — reset once per unit via reset_web_cache().
        self.web_tools = (
            WebToolsClient()
            if (WEB_TOOLS_AVAILABLE and WEB_ENRICHMENT_ENABLED)
            else None
        )
        # casefolded entity -> (summary or None, search fallback already tried)
        self._web_cache: Dict[str, Tuple[Optional[str], bool]] = {}
        self._web_sources: List[Dict[str, str]] = []     # unique hits, original casing
        self._web_lookups_left = 0

    # ── Web grounding (Wikipedia, per-unit cache) ─────────────────────────────

    def reset_web_cache(self, enabled: bool = True, budget: Optional[int] = None) -> None:
        """Start a fresh cache for one unit.

        Call once per unit: the cache is what stops five sections that all
        mention Galileo from making five identical Wikipedia round trips.
        Passing enabled=False (math, or include_web=False) sets the budget to
        zero, so every later lookup short-circuits without a request.
        """
        self._web_cache = {}
        self._web_sources = []

        self._web_lookups_left = (
            (WEB_MAX_LOOKUPS_PER_UNIT if budget is None else budget) if enabled else 0
        )

    def _web_lookup(self, entity: str, allow_search: bool = False) -> Optional[str]:
        """Cached Wikipedia summary for one entity. Misses are cached too.

        A cached miss is retried once if the entity later turns up in a context
        that permits the search fallback.
        """
        key = entity.casefold()
        cached = self._web_cache.get(key)
        if cached is not None:
            summary, searched = cached
            if summary or not allow_search or searched:
                return summary

        if not self.web_tools or self._web_lookups_left <= 0:
            return None

        self._web_lookups_left -= 1
        summary = None
        if WEB_LOOKUP_DELAY > 0:
            time.sleep(WEB_LOOKUP_DELAY)   # Wikipedia 429s on back-to-back requests
        try:
            # Exact article title first, on Simple English — class-appropriate
            # wording, and it already falls back to en.wikipedia on a 404.
            summary = self.web_tools.get_simple_wikipedia_summary(
                entity, sentences=WEB_SUMMARY_SENTENCES
            )
            if not summary and allow_search:
                # No such article. Only a name earns a search, and only if the
                # result actually talks about the thing we asked for.
                candidate = self.web_tools.search_wikipedia(
                    entity, sentences=WEB_SUMMARY_SENTENCES
                )
                if candidate and _summary_matches(entity, candidate):
                    summary = candidate
                elif candidate:
                    logger.info(f"-> [Web] {entity}: search hit rejected as unrelated")
        except Exception as e:
            logger.warning(f"[Web] lookup failed for '{entity}': {e}")

        self._web_cache[key] = (summary, allow_search)
        if summary:
            self._web_sources.append({"topic": entity, "source": "Wikipedia"})
        logger.info(f"-> [Web] {entity}: {'fetched' if summary else 'no result'}")
        return summary

    def build_web_context(
        self, section_title: str, content: str
    ) -> Tuple[str, List[Dict[str, str]]]:
        """Background facts for one section: (prompt block, source list).

        Returns ("", []) when web grounding is off or nothing resolved, so
        callers can pass the result through unconditionally.
        """
        if not self.web_tools or self._web_lookups_left <= 0:
            return "", []

        lines: List[str] = []
        sources: List[Dict[str, str]] = []
        # One spare candidate beyond the hit target: a term with no article
        # ("natural motion") should not cost a section its remaining slots, but
        # a section of pure jargon must not drain the unit's budget either.
        candidates = _extract_lookup_entities(
            section_title, content, limit=WEB_MAX_ENTITIES_PER_SECTION + 1
        )
        for entity, allow_search in candidates:
            if len(lines) >= WEB_MAX_ENTITIES_PER_SECTION or self._web_lookups_left <= 0:
                break
            summary = self._web_lookup(entity, allow_search=allow_search)
            if not summary:
                continue
            # WebToolsClient rejoins clipped sentences with ". ", which doubles
            # the full stop that was already there.
            summary = re.sub(r"\.\s*\.+", ".", summary).strip()
            lines.append(f"- {entity}: {summary}")
            sources.append({"topic": entity, "source": "Wikipedia"})

        if not lines:
            return "", []

        block = (
            "\n\nBACKGROUND FACTS (verified reference material, NOT from the textbook). "
            "Use these only to add context, fix a date or name, or supply a real-world "
            "hook. Do not quote them verbatim, do not contradict the textbook, and do "
            "not introduce material beyond the section's level:\n" + "\n".join(lines)
        )
        return block, sources

    def web_cache_summary(self) -> Dict[str, Any]:
        """What this unit's cache actually fetched — recorded on the unit."""
        return {
            "source": "Wikipedia",
            "topics_fetched": [s["topic"] for s in self._web_sources],
            "lookups_attempted": len(self._web_cache),
            "lookups_remaining": self._web_lookups_left,
        }

    # ── LLM call ──────────────────────────────────────────────────────────────

    def _avatar_client(self, model: Optional[str] = None) -> Any:
        """The avatar script's model, built once per enricher (and per model).

        A Gemini slug gets a ``_DirectChat`` - avatar_llm.chat straight to
        Google on GEMINI_API_KEY. Anything else gets the same OpenRouter
        wiring as self.llm - only the model differs - so the routing,
        attribution headers and JSON mode all behave identically. ``model``
        lets the lesson builder run its own calls on AVATAR_LESSON_MODEL
        without touching the teaching script's model.
        """
        model = model or AVATAR_ENRICHMENT_MODEL
        if model not in self._avatar_llms:
            import avatar_llm
            if avatar_llm.resolve_provider(model) == avatar_llm.PROVIDER_GEMINI:
                self._avatar_llms[model] = _DirectChat(model, self.timeout)
                logger.info(f"Avatar enrichment model: {model} (Google direct)")
                return self._avatar_llms[model]
            self._avatar_llms[model] = ChatOpenAI(
                model=model,
                openai_api_key=self.api_key,
                base_url=ENRICHMENT_BASE_URL,
                temperature=ENRICHMENT_TEMPERATURE,
                max_tokens=ENRICHMENT_MAX_COMPLETION_TOKENS,
                model_kwargs={"response_format": {"type": "json_object"}},
                extra_body=_enrichment_routing(model),
                default_headers={
                    "HTTP-Referer": os.getenv("OPENROUTER_APP_URL",
                                              "https://gradeupapi.careeriq.ai"),
                    "X-Title": os.getenv("OPENROUTER_APP_NAME", "GradeUp-AI"),
                },
                timeout=self.timeout,
                callbacks=langchain_callbacks(),
            )
            logger.info(f"Avatar enrichment model: {model}")
        return self._avatar_llms[model]

    def _call_llm(self, system_prompt: str, user_prompt: str,
                  max_tokens: int = 2048,
                  llm: Optional[Any] = None) -> Optional[str]:
        """Call LLM using LangChain. ``llm`` overrides the enricher's default.

        ``max_tokens`` is bound onto the call. It was accepted and ignored — the
        chain invoked with whatever the client was built with, which was
        nothing — so the 4000 the avatar script asked for never reached the
        provider. A ``_DirectChat`` (Gemini) answers through avatar_llm instead.
        """
        if isinstance(llm, _DirectChat):
            return llm.complete(system_prompt, user_prompt, int(max_tokens))
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", "{system_msg}"),
                ("user", "{user_msg}")
            ])
            chain = prompt | (llm or self.llm).bind(max_tokens=int(max_tokens))
            response = chain.invoke({
                "system_msg": system_prompt,
                "user_msg": user_prompt
            })
            return response.content.strip() or None
        except Exception as e:
            logger.warning(f"LangChain LLM call error: {e}")
            return None

    def _parse_json_response(self, response: str) -> Optional[Dict]:
        """Parse an LLM JSON reply, repairing the shapes models actually emit.

        Llama 4 Scout in OpenRouter's JSON mode intermittently returns the
        object BODY with the outer braces missing ('"section_title": ...'), and
        any model can wrap its answer in a fence or trail a sentence after it.
        Each of those used to drop a whole section's enrichment, so try the
        repairs in order rather than failing on the first parse.
        """
        if not response:
            return None

        parsed = parse_llm_json(response)
        if parsed is not None:
            return parsed

        logger.warning(
            f"JSON parse error — no valid object in a {len(response)}-char "
            f"response starting {response[:80]!r}"
        )
        return None

    @staticmethod
    def _normalized(parsed: Optional[Dict]) -> Optional[Dict]:
        """Apply the avatar-segment invariants to an LLM enrichment result.

        The math prompts return an ``avatar_explanation`` exactly like the
        general one does, but their results used to be handed back raw — which
        is why every math checkpoint shipped without a ``flashcard_type``.
        """
        if isinstance(parsed, dict):
            avatar = parsed.get("avatar_explanation")
            if isinstance(avatar, dict):
                normalize_avatar_segments(avatar.get("segments") or [])
        return parsed

    # ── Section enrichment (general / English) ────────────────────────────────

    def enrich_section_classroom_style(self, content: str, section_title: str,
                                        unit_title: str = "",
                                        web_context: str = "") -> Optional[SectionEnrichment]:
        if not content.strip() or len(content) < 50:
            return None
        prompt = ENGLISH_ENRICH_PROMPT if self.subject == "english" else ENRICH_PROMPT
        ctx    = f"Unit: {unit_title}\nSection: {section_title}\n\nContent:\n{content[:8000]}"
        ctx   += web_context
        user   = (f"Teach this topic as if explaining to students in a classroom:\n\n"
                  f"{ctx}\n\nReturn in the JSON format specified.")
        raw = self._call_llm(prompt, user, max_tokens=3000)
        if not raw:
            return None
        parsed = self._parse_json_response(raw)
        if not parsed:
            return None
        try:
            return SectionEnrichment(
                concept_overview=parsed.get("concept_overview", ""),
                detailed_explanation=parsed.get("detailed_explanation", ""),
                real_world_connections=parsed.get("real_world_connections", []),
                faqs=[FAQ(**faq) for faq in parsed.get("faqs", []) if isinstance(faq, dict)],
                practice_questions=[
                    PracticeQuestion(question=q["question"])
                    for q in parsed.get("practice_questions", [])
                    if isinstance(q, dict) and q.get("question")
                ],
            )
        except Exception as e:
            logger.warning(f"SectionEnrichment build error: {e}")
            return None

    # ── Math section enrichment ────────────────────────────────────────────────

    def enrich_math_section(self, section: Dict, chapter_title: str = "") -> Optional[Dict]:
        full_content = _build_section_text(section)
        if len(full_content.strip()) < 80:
            return None
        title = section.get("section_title") or section.get("subsection_title", "")
        ctx   = f"Chapter: {chapter_title}\nSection: {title}\n\nContent:\n{full_content[:8000]}"
        user  = f"Explain this math section to a Class 10 student.\n\n{ctx}\n\nReturn in the JSON format specified."
        raw   = self._call_llm(MATH_SECTION_ENRICH_PROMPT, user, max_tokens=3000)
        return self._normalized(self._parse_json_response(raw)) if raw else None

    # ── Math chapter overview ─────────────────────────────────────────────────

    def enrich_math_chapter(self, chapter: Dict) -> Optional[Dict]:
        title    = chapter.get("title", "")
        outcomes = chapter.get("learning_outcomes", [])
        # Introduction now lives as an "introduction" section (no longer a
        # top-level scalar). Fall back to the legacy top-level key for old data.
        intro = chapter.get("introduction") or ""
        if not intro:
            for _s in chapter.get("sections", []) or []:
                if isinstance(_s, dict) and str(_s.get("type") or "").strip().lower() == "introduction":
                    intro = _s.get("content") or ""
                    break
        intro = (intro or "")[:2000]
        ctx = (
            f"Chapter: {title}\n\nLearning Outcomes:\n"
            + "\n".join(f"- {o}" for o in outcomes)
            + f"\n\nIntroduction:\n{intro}"
        )
        user = f"Produce a chapter overview for this Class 10 Maths chapter.\n\n{ctx}\n\nReturn in the JSON format specified."
        raw  = self._call_llm(MATH_CHAPTER_ENRICH_PROMPT, user, max_tokens=1500)
        return self._parse_json_response(raw) if raw else None

    # ── Math example enrichment ───────────────────────────────────────────────

    def enrich_math_example(self, example: Dict, chapter_title: str = "") -> Optional[Dict]:
        problem  = example.get("problem") or example.get("text") or example.get("content", "")
        solution = example.get("solution") or example.get("metadata", {}).get("solution", "")
        ex_num   = example.get("example_number") or example.get("label") or example.get("title") or example.get("id", "")
        if not problem or not solution:
            return None
        ctx = (
            f"Chapter: {chapter_title}\nExample {ex_num}\n\n"
            f"PROBLEM:\n{problem}\n\nTEXTBOOK SOLUTION:\n{solution}"
        )
        user = f"Explain this solved maths example step by step to a Class 10 student.\n\n{ctx}\n\nReturn in the JSON format specified."
        raw  = self._call_llm(MATH_EXAMPLE_ENRICH_PROMPT, user, max_tokens=4000)
        return self._normalized(self._parse_json_response(raw)) if raw else None

    # ── Math illustration enrichment ──────────────────────────────────────────

    def enrich_math_illustration(self, illustration: Dict, chapter_title: str = "") -> Optional[Dict]:
        content  = illustration.get("content") or illustration.get("text", "")
        if not content or len(content) < 30:
            return None
        illus_num   = illustration.get("illustration_number") or illustration.get("label") or illustration.get("title") or illustration.get("id", "")
        section_ctx = illustration.get("section_context", "")
        ctx = (
            f"Chapter: {chapter_title}\nIllustration {illus_num}"
            + (f" (Section {section_ctx})" if section_ctx else "")
            + f"\n\nCONTENT:\n{content[:6000]}"
        )
        user = f"Explain this maths illustration to a Class 10 student.\n\n{ctx}\n\nReturn in the JSON format specified."
        raw  = self._call_llm(MATH_ILLUSTRATION_ENRICH_PROMPT, user, max_tokens=3000)
        return self._normalized(self._parse_json_response(raw)) if raw else None

    # ── Math definition/theorem enrichment ───────────────────────────────────

    def enrich_math_definition(self, definition: Dict, chapter_title: str = "") -> Optional[Dict]:
        term      = definition.get("term") or definition.get("theorem_number") or definition.get("label") or definition.get("title") or definition.get("id") or "Concept"
        defn_text = definition.get("definition") or definition.get("statement") or definition.get("text") or definition.get("content", "")
        proof     = definition.get("proof", "")
        if not defn_text:
            return None
        parts = [f"TERM/THEOREM: {term}", f"STATEMENT:\n{defn_text}"]
        if proof:
            parts.append(f"PROOF:\n{proof}")
        ctx  = f"Chapter: {chapter_title}\n\n" + "\n\n".join(parts)
        user = f"Explain this maths definition/theorem to a Class 10 student.\n\n{ctx}\n\nReturn in the JSON format specified."
        raw  = self._call_llm(MATH_DEFINITION_ENRICH_PROMPT, user, max_tokens=2000)
        return self._normalized(self._parse_json_response(raw)) if raw else None

    # ── Points to remember ───────────────────────────────────────────────────

    def enrich_points_to_remember(self, points: List[str], chapter_title: str = "") -> List[Dict]:
        if not points:
            return []
        numbered = "\n".join(f"{i+1}. {p}" for i, p in enumerate(points))
        system = (
            "You are a Class 10 maths teacher. For each key point, add:\n"
            "- 'why_it_matters': one sentence on importance\n"
            "- 'memory_hook': a short memorable phrase or analogy\n\n"
            'Return STRICT JSON: {"points": [{"point": "", "why_it_matters": "", "memory_hook": ""}]}'
        )
        user = f"Chapter: {chapter_title}\n\nPoints:\n{numbered}\n\nReturn in the JSON format specified."
        raw  = self._call_llm(system, user, max_tokens=2000)
        if not raw:
            return [{"point": p} for p in points]
        parsed = self._parse_json_response(raw)
        if parsed and "points" in parsed:
            return parsed["points"]
        return [{"point": p} for p in points]

    # ── Batch section enrichment (non-math) ──────────────────────────────────

    def batch_enrich_unit_sections(self, sections: List[Dict], unit_title: str) -> List[Dict]:
        enriched: List[Dict] = []
        seen: set = set()
        for section in sections:
            title = section.get("section_title", "")
            if not title or title in seen:
                if title in seen:
                    logger.warning(f"-> Skipping duplicate: {title}")
                continue
            seen.add(title)
            # Skip auxiliary sections that do not need enrichment
            lower_title = title.lower()
            if any(skip_word in lower_title for skip_word in ["summary", "glossary", "reference", "student activity", "life skill"]):
                logger.warning(f"-> Skipping (auxiliary section): {title}")
                continue

            # Use pre-built content from section dict if available (set by enrich_unit),
            # otherwise fall back to _build_section_text for backward compatibility.
            content = section.get("content") or _build_section_text(section)
            if not _has_teachable_prose(content):
                logger.warning(f"-> Skipping (image/URL only): {title}")
                continue
            # BUG FIX: 100 chars is too strict — Social Science do_you_know, timeline
            # entries, and summary points are often shorter but still enrichable.
            # Lower threshold to 50 chars so factboxes and key points are not skipped.
            if len(content.strip()) < 50:
                logger.warning(f"-> Skipping (too short): {title}")
                continue
            logger.info(f"-> Enriching: {title}")
            web_block, web_sources = self.build_web_context(title, content)
            enrich = self.enrich_section_classroom_style(
                content, title, unit_title, web_context=web_block
            )
            if enrich:
                record = {"section_title": title, "enrichment": asdict(enrich)}
                if web_sources:
                    record["supplementary_sources"] = web_sources
                enriched.append(record)
            else:
                logger.warning(f"-> Failed: {title}")
            time.sleep(RATE_LIMIT_DELAY)
        return enriched

    # ── Avatar section enrichment ─────────────────────────────────────────────

    def enrich_section_avatar_style(self, content: str, section_title: str,
                                     unit_title: str = "",
                                     web_context: str = "",
                                     board: str = "", class_number: str = "",
                                     subject: str = "", unit_number: int = 0,
                                     with_visuals: bool = True,
                                     teach_prompt: Optional[str] = None,
                                     checkpoints: str = "mixed",
                                     extra_context: str = "",
                                     model: Optional[str] = None,
                                     max_visuals: Optional[int] = None) -> Optional[Dict]:
        """Generate avatar-style enrichment with emotion segments + inline flashcards.

        When ``with_visuals`` is set, the segments that are genuinely clearer
        with a picture also get one: a clean, watermark-free image sourced from
        Wikimedia Commons (or another trusted host), re-hosted on S3, with the
        avatar's spoken explanation of it folded into that segment's text. See
        avatar_visuals.attach_visuals_to_segments.

        The seven-phase lesson builder calls this for its explanation phase with
        its own ``teach_prompt`` (informative checkpoints only, last segment
        answers the hook), ``checkpoints="informative"``, the hook question as
        ``extra_context`` and ``with_visuals=False`` - its pictures are its own
        pass, one per segment with no question folded in (see
        avatar_lesson_builder._attach_explanation_pictures); every other caller
        gets today's behaviour.
        """
        if not content.strip() or len(content) < 50:
            return None
        ctx = f"Unit: {unit_title}\nSection: {section_title}\n\nContent:\n{content[:8000]}"
        ctx += web_context
        if extra_context:
            ctx += f"\n\n{extra_context}"
        if teach_prompt:
            user = (
                f"Create the avatar teaching script (the explanation phase) for this "
                f"topic.\n\n{ctx}\n\nReturn in the JSON format specified."
            )
        else:
            user = (
                f"Create an avatar teaching script for this topic. "
                f"Include teaching segments with emotions AND inline flashcards "
                f"with real-world examples.\n\n{ctx}\n\nReturn in the JSON format specified."
            )
        raw = self._call_llm(teach_prompt or AVATAR_ENRICH_PROMPT, user, max_tokens=4000,
                             llm=self._avatar_client(model))
        if not raw:
            return None
        parsed = self._parse_json_response(raw)
        if not parsed:
            return None

        segments = parsed.get("avatar_explanation", {}).get("segments", [])

        # Continuous ids, clean types, and a guaranteed flashcard_type
        normalize_avatar_segments(segments, checkpoints=checkpoints)

        # Pictures come after normalization so the planner works with the final
        # segment ids, and _insert_spoken keeps any checkpoint hand-over last.
        if with_visuals and segments:
            # The section's own text goes with them: every visual query is
            # checked against it, so a picture can only illustrate something
            # this section actually raises.
            self._attach_visuals(segments, section_title, unit_title, board,
                                 class_number, subject or self.subject or "",
                                 unit_number, source_text=content,
                                 max_visuals=max_visuals)

        # Build enrichment dict with avatar + standard fields
        enrichment = {
            "concept_overview": parsed.get("concept_overview", ""),
            "avatar_explanation": parsed.get("avatar_explanation", {}),
            "faqs": parsed.get("faqs", []),
            "practice_questions": parsed.get("practice_questions", []),
            "doubt_context": parsed.get("doubt_context", {}),
        }
        return enrichment

    @staticmethod
    def _attach_visuals(segments: List[Dict], section_title: str, unit_title: str,
                        board: str, class_number: str, subject: str,
                        unit_number: int, source_text: str = "",
                        max_visuals: Optional[int] = None) -> None:
        """Attach teaching pictures to an avatar script, never failing the enrichment.

        Visuals are a bonus on top of the lesson: the network, the image hosts
        and S3 are all outside our control, so anything that goes wrong here
        must leave a working text-only lesson behind rather than lose the
        section that was already generated.
        """
        try:
            import avatar_visuals
        except Exception as e:
            logger.info(f"Avatar visuals unavailable ({e}) — teaching text only")
            return

        try:
            avatar_visuals.attach_visuals_to_segments(
                segments,
                section_title=section_title,
                unit_title=unit_title,
                board=board,
                class_number=class_number,
                subject=subject,
                unit_number=unit_number,
                source_text=source_text,
                max_visuals=max_visuals,
            )
        except Exception as e:
            logger.warning(f"Avatar visual attachment failed for '{section_title}': {e}")

    # ── Batch avatar enrichment ───────────────────────────────────────────────

    def batch_enrich_avatar_sections(self, sections: List[Dict], unit_title: str,
                                      board: str = "", class_number: str = "",
                                      subject: str = "", unit_number: int = 0) -> List[Dict]:
        """Batch enrich sections with avatar-style teaching."""
        enriched: List[Dict] = []
        seen: set = set()
        for section in sections:
            title = section.get("section_title", "")
            if not title or title in seen:
                if title in seen:
                    logger.warning(f"-> Skipping duplicate: {title}")
                continue
            seen.add(title)
            # Skip auxiliary sections that do not need enrichment
            lower_title = title.lower()
            if any(skip_word in lower_title for skip_word in ["summary", "glossary", "reference", "student activity", "life skill", "learning objective"]):
                logger.warning(f"-> Skipping (auxiliary section): {title}")
                continue

            content = section.get("content") or _build_section_text(section)
            if len(content.strip()) < 50:
                logger.warning(f"-> Skipping (too short): {title}")
                continue
            if not _has_teachable_prose(content):
                logger.warning(f"-> Skipping (image/URL only): {title}")
                continue
            logger.info(f"-> Avatar enriching: {title}")
            web_block, web_sources = self.build_web_context(title, content)
            avatar_enrich = self.enrich_section_avatar_style(
                content, title, unit_title, web_context=web_block,
                board=board, class_number=class_number,
                subject=subject, unit_number=unit_number,
            )
            if avatar_enrich:
                if web_sources:
                    avatar_enrich["supplementary_sources"] = web_sources
                # Inject full doubt_context metadata
                dc = avatar_enrich.get("doubt_context", {})
                dc["board"] = board
                dc["class_number"] = class_number
                dc["subject"] = subject
                dc["unit_number"] = unit_number
                dc["section_title"] = title
                dc["max_rag_chunks"] = 5
                dc["fallback_to_broader_context"] = True
                avatar_enrich["doubt_context"] = dc

                enriched.append({"section_title": title, "enrichment": avatar_enrich})
            else:
                logger.warning(f"-> Failed: {title}")
            time.sleep(RATE_LIMIT_DELAY)
        return enriched


# ══════════════════════════════════════════════════════════════════════════════
#  ENRICHMENT ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════════════

class EnrichmentOrchestrator:
    """Orchestrates subject-aware enrichment for a full document."""

    def __init__(self, fast_mode: bool = True, subject: Optional[str] = None,
                 enrichment_style: str = "avatar_classroom_teaching",
                 api_key: Optional[str] = None):
        load_env()
        self.subject   = subject
        self.fast_mode = fast_mode
        self.enrichment_style = enrichment_style
        # Held so the enricher can be rebuilt with the same key when subject
        # auto-detection swaps the prompt set mid-document.
        self.api_key   = api_key
        self.enricher  = ContentEnricher(subject=subject, api_key=api_key)
        # One shared client: the enricher owns the session and the per-unit cache.
        self.web_tools = self.enricher.web_tools
        self.langfuse  = get_langfuse_client() if LANGFUSE_AVAILABLE else None
        self.board     = ""
        self.class_number = ""

    # ── Build English virtual sections ───────────────────────────────────────

    def _build_english_sections(self, unit: Dict) -> List[Dict]:
        """Build virtual sections for enrichment.
        UNIVERSAL schema (new): reads from sections[] with type field.
        LEGACY schema (old): reads from prose/poetry/grammar/vocabulary keys.
        Both paths produce {section_title, content, subsections} dicts.
        """
        virtual: List[Dict] = []

        # ── UNIVERSAL SCHEMA PATH ─────────────────────────────────────────────
        # New pipeline stores everything in sections[] with a type field
        raw_sections = unit.get("sections", [])
        if raw_sections:
            enrich_types = {
                "prose", "poem", "supplementary", "grammar", "vocabulary",
                "writing_task", "speaking", "listening", "section", "other",
                "do_you_know", "ict_corner", "warm_up", "introduction",
                "about_the_author", "activity", "note", "definition",
                "question", "thinking_corner",
            }
            for sec in raw_sections:
                stype = sec.get("type", "other")
                if stype not in enrich_types:
                    continue
                # Untitled English readings keep a meaningful label ("Poem",
                # "Supplementary") even though their type is now "section".
                label = section_content_kind(sec) or stype
                title = (sec.get("title") or sec.get("id")
                         or label.replace("_", " ").title())
                content = sec.get("content") or ""
                # Flatten sub_items into content when content is empty
                sub_items = sec.get("sub_items", [])
                if sub_items and not content.strip():
                    parts = []
                    for it in sub_items:
                        num = it.get("number", "")
                        c = it.get("content", "") or ""
                        opts = it.get("options", [])
                        if c:
                            line = f"{num}. {c}" if num else c
                            if opts:
                                line += "\n" + "\n".join(f"  {o}" for o in opts)
                            parts.append(line)
                    content = "\n".join(parts)
                # Pull metadata into content
                meta = sec.get("metadata", {})
                if isinstance(meta, dict):
                    extra = [f"{mk}: {mv}" for mk, mv in meta.items()
                             if isinstance(mv, str) and mv.strip()
                             and mk not in ("section_context", "order_in_chapter")]
                    if extra:
                        content = (content + "\n\n" + "\n".join(extra)
                                   if content else "\n".join(extra))
                if content.strip():
                    virtual.append({
                        "section_title": title,
                        "content": content,
                        "subsections": [],
                        "_type": stype,
                    })
            return virtual

        # ── LEGACY SCHEMA PATH (backwards compat) ────────────────────────────
        for item in unit.get("prose", []):
            body = "\n\n".join(filter(None, [
                item.get("about_author"), item.get("summary"), item.get("content", ""),
            ]))
            virtual.append({"section_title": item.get("title", "Prose"), "content": body, "subsections": []})

        for item in unit.get("poetry", []):
            stanzas_raw = item.get("stanzas", [])
            stanza_parts = []
            for s in stanzas_raw:
                if isinstance(s, dict):
                    stanza_parts.append("\n".join(s.get("lines", [])))
                elif isinstance(s, list):
                    flat = []
                    for entry in s:
                        flat.extend(entry if isinstance(entry, list) else [str(entry)])
                    stanza_parts.append("\n".join(flat))
                else:
                    stanza_parts.append(str(s))
            body = "\n\n".join(filter(None, [
                item.get("about_poet"), "\n\n".join(stanza_parts),
                item.get("paraphrase"), item.get("central_idea"),
            ]))
            virtual.append({"section_title": item.get("title", "Poem"), "content": body, "subsections": []})

        for item in unit.get("supplementary", []):
            virtual.append({"section_title": item.get("title", "Supplementary"),
                             "content": item.get("content", ""), "subsections": []})

        for item in unit.get("grammar", []):
            body = item.get("explanation", "")
            if rules := item.get("rules"):
                body += "\n\nRules:\n" + "\n".join(f"- {r}" for r in rules)
            if examples := item.get("examples"):
                body += "\n\nExamples:\n" + "\n".join(f"- {e}" for e in examples)
            virtual.append({"section_title": item.get("topic", "Grammar"), "content": body, "subsections": []})

        for item in unit.get("vocabulary", []):
            lines = [
                f"{w.get('word','')}: {w.get('meaning') or w.get('definition','')} ({w.get('example','')})"
                for w in item.get("words", [])
                if isinstance(w, dict) and (w.get("meaning") or w.get("definition"))
            ]
            if lines:
                virtual.append({"section_title": item.get("section_title", "Vocabulary"),
                                 "content": "\n".join(lines), "subsections": []})

        for item in unit.get("writing_tasks", []):
            task_type = item.get("task_type", "Writing Task")
            t = item.get("title")
            title = f"{task_type}: {t}" if t else task_type
            body = "\n\n".join(filter(None, [
                str(item.get("instructions", "") or ""),
                str(item.get("format_hints", "") or ""),
                str(item.get("model_answer", "") or ""),
            ]))
            if body:
                virtual.append({"section_title": title, "content": body, "subsections": []})

        return virtual

    # ── Enrich one unit 

    @safe_observe(name="enrich-unit")
    def enrich_unit(self, unit: Dict, include_web: bool = True) -> Dict:
        unit_number = unit.get("unit_number") or unit.get("chapter_number", 0)
        unit_title  = unit.get("chapter_name") or unit.get("chapter_title") or unit.get("title", "")
        is_math     = _is_math(self.subject)

        # Web grounding is per-section but budgeted and cached per unit — start
        # a clean cache here so one unit's lookups never leak into the next.
        web_enabled = bool(include_web and not is_math and WEB_ENRICHMENT_ENABLED)
        self.enricher.reset_web_cache(enabled=web_enabled)

        enrichment: Dict[str, Any] = {
            "unit_number": unit_number,
            "title":       unit_title,
            "subject":     self.subject or "unknown",
            "sections":    [],
        }
        
        if "unit_number" in unit:
            enrichment["unit_number"] = unit["unit_number"]
        if "chapter_number" in unit:
            enrichment["chapter_number"] = unit["chapter_number"]

        # BUG FIX: Social Science units have a "part" field (History/Geography/Civics/Economics)
        # that was being silently dropped from the enrichment output.
        if part := unit.get("part"):
            enrichment["part"] = part

        # ── MATHEMATICS 
        if is_math:
            # 0. Chapter overview
            logger.info("-> Generating chapter overview...")
            chapter_enrich = self.enricher.enrich_math_chapter(unit)
            if chapter_enrich:
                enrichment["chapter_enrichment"] = chapter_enrich

            # Types we skip entirely (already removed from extraction)
            _math_discard_types = {
                "do_you_know", "thinking_corner", "progress_check",
                "note", "ict_corner", "more_to_know", "try_this",
                "multiple_choice", "unit_exercise", "points_to_remember",
            }
            
            _math_discard_titles = {
                "summary", "references", "student activity", "glossary"
            }

            # 1. Process each section — enrich it AND its sub_sections inline
            enriched_sections = []
            for section in unit.get("sections", []):
                stype = section.get("type", "section")
                if stype in _math_discard_types:
                    continue
                # Non-section top-level items (stray definitions, etc.) — skip
                if stype != "section":
                    continue

                sec_title = (section.get("section_title") or section.get("title")
                             or section.get("id", ""))
                
                if sec_title.lower().strip() in _math_discard_titles:
                    continue

                sec_content = section.get("content", "") or ""

                # ── Build composite content for LLM context ──
                # If the section body is empty but has sub_sections with content,
                # combine all sub_section text to give the LLM full context.
                sub_items = section.get("sub_sections", section.get("subsections", []))
                composite_parts = []
                if sec_content.strip():
                    composite_parts.append(sec_content)
                for sub in sub_items:
                    sub_c = sub.get("content", "") or ""
                    sub_t = sub.get("title", "") or sub.get("id", "") or ""
                    if sub_c.strip():
                        composite_parts.append(f"{sub_t}\n{sub_c}" if sub_t else sub_c)
                    # Also include solution text if present
                    sol = (sub.get("metadata") or {}).get("solution", "")
                    if sol:
                        composite_parts.append(f"Solution:\n{sol}")
                composite_content = "\n\n".join(composite_parts)

                # Create a temporary section dict with composite content for enrichment
                section_for_enrich = dict(section)
                section_for_enrich["content"] = composite_content

                logger.info(f"-> Section: {sec_title} ({len(composite_content)} chars)")
                sec_enrich = self.enricher.enrich_math_section(section_for_enrich, unit_title)

                enriched_sec: Dict[str, Any] = {
                    "section_number":     section.get("section_number") or section.get("id", ""),
                    "section_title":      sec_title,
                    "content":            sec_content,
                    "content_context":    composite_content,
                    "type":               stype,
                    "section_enrichment": sec_enrich or {},
                    "sub_sections":       [],
                }

                # ── Process sub_sections ──
                for sub in sub_items:
                    sub_type = sub.get("type", "section")
                    sub_title = sub.get("subsection_title") or sub.get("title") or sub.get("id", "")

                    # Skip discarded types
                    if sub_type in _math_discard_types or sub_title.lower().strip() in _math_discard_titles:
                        continue

                    if sub_type == "example":
                        ex_num = sub.get("example_number") or sub.get("id", "?")
                        logger.info(f"-> Example {ex_num}")
                        ex_enrich = self.enricher.enrich_math_example(sub, unit_title)
                        enriched_ex = {
                            "type":             "example",
                            "id":               ex_num,
                            "title":            sub.get("title", ""),
                            "content":          sub.get("content", ""),
                            "content_context":  sub.get("content", ""),
                            "enrichment":       ex_enrich or {},
                        }
                        enriched_sec["sub_sections"].append(enriched_ex)
                        time.sleep(RATE_LIMIT_DELAY)

                    elif sub_type == "illustration":
                        illus_num = sub.get("illustration_number") or sub.get("id", "?")
                        logger.info(f"-> Illustration {illus_num}")
                        illus_enrich = self.enricher.enrich_math_illustration(sub, unit_title)
                        enriched_illus = {
                            "type":             "illustration",
                            "id":               illus_num,
                            "title":            sub.get("title", ""),
                            "content":          sub.get("content", ""),
                            "content_context":  sub.get("content", ""),
                            "enrichment":       illus_enrich or {},
                        }
                        enriched_sec["sub_sections"].append(enriched_illus)
                        time.sleep(RATE_LIMIT_DELAY)

                    elif sub_type == "definition":
                        term = sub.get("term") or sub.get("title") or sub.get("id", "?")
                        logger.info(f"-> Definition: {term}")
                        defn_enrich = self.enricher.enrich_math_definition(sub, unit_title)
                        enriched_defn = {
                            "type":             "definition",
                            "id":               term,
                            "title":            sub.get("title", ""),
                            "content":          sub.get("content", ""),
                            "content_context":  sub.get("content", ""),
                            "enrichment":       defn_enrich or {},
                        }
                        enriched_sec["sub_sections"].append(enriched_defn)
                        time.sleep(RATE_LIMIT_DELAY)

                    elif sub_type in ("theorem", "proof", "corollary"):
                        thm_id = sub.get("theorem_number") or sub.get("id", "?")
                        logger.info(f"-> {sub_type.capitalize()} {thm_id}")
                        thm_enrich = self.enricher.enrich_math_definition(sub, unit_title)
                        enriched_thm = {
                            "type":             sub_type,
                            "id":               thm_id,
                            "title":            sub.get("title", ""),
                            "content":          sub.get("content", ""),
                            "content_context":  sub.get("content", ""),
                            "enrichment":       thm_enrich or {},
                        }
                        enriched_sec["sub_sections"].append(enriched_thm)
                        time.sleep(RATE_LIMIT_DELAY)

                    elif sub_type == "exercise":
                        # Pass-through exercises without enrichment
                        enriched_sec["sub_sections"].append({
                            "type":     "exercise",
                            "id":       sub.get("id", ""),
                            "title":    sub.get("title", ""),
                            "content":  sub.get("content", ""),
                            "sub_items": sub.get("sub_items", []),
                        })

                    elif sub_type == "activity":
                        enriched_sec["sub_sections"].append({
                            "type":     "activity",
                            "id":       sub.get("id", ""),
                            "title":    sub.get("title", ""),
                            "content":  sub.get("content", ""),
                        })

                    else:
                        # Any other type — pass through
                        logger.info(f"-> {sub_type.capitalize()} {sub_title}")
                        enriched_sec["sub_sections"].append({
                            "type":     sub_type,
                            "id":       sub.get("id", ""),
                            "title":    sub.get("title", ""),
                            "content":  sub.get("content", ""),
                        })

                enriched_sections.append(enriched_sec)
                time.sleep(RATE_LIMIT_DELAY)

            if enriched_sections:
                enrichment["sections"] = enriched_sections

            # 2. Pass-through fields that remain at top-level
            for key in ("exercises", "unit_exercise", "multiple_choice_questions",
                        "points_to_remember", "learning_outcomes"):
                if (val := unit.get(key)) is not None:
                    enrichment[key] = val

        # ── ENGLISH 
        elif self.subject == "english":
            sections = self._build_english_sections(unit)
            if sections:
                if self.enrichment_style == "avatar_classroom_teaching":
                    enrichment["sections"] = self.enricher.batch_enrich_avatar_sections(
                        sections=sections,
                        unit_title=unit_title,
                        board=self.board,
                        class_number=self.class_number,
                        subject=self.subject,
                        unit_number=unit_number
                    )
                else:
                    enrichment["sections"] = self.enricher.batch_enrich_unit_sections(sections, unit_title)

        # ── GENERAL (Science / Social Science)
        else:
            raw_secs = unit.get("sections", [])
            # The original list is preserved in place (illustrations, exercises,
            # S3 URLs); lessons are attached onto it.
            enriched_sections = [dict(sec) for sec in raw_secs]

            # 1. One lesson per SECTION, with its boxes taught inside it. A
            #    stand-alone illustration is a caption, not a lesson.
            for lesson in _plan_lessons(raw_secs):
                anchor, members = lesson["anchor"], lesson["members"]
                sec = raw_secs[anchor]
                if str(sec.get("type") or "").lower() == "illustration" and not members:
                    continue
                title = _section_label(sec)
                if any(w in title.lower() for w in _AUXILIARY_TITLE_WORDS):
                    continue

                full_content = _lesson_text(raw_secs, anchor, members)
                folded = [_section_label(raw_secs[i]) for i in members]

                if len(full_content.strip()) >= 50 and not _has_teachable_prose(full_content):
                    logger.warning(f"-> Skipping (image/URL only): {title}")
                    continue
                if len(full_content.strip()) < 50:
                    continue

                logger.info(f"-> Avatar enriching: {title}"
                            + (f"  (with {len(folded)} box(es): "
                               f"{', '.join(x[:28] for x in folded[:5])}"
                               f"{' …' if len(folded) > 5 else ''})" if folded else ""))
                web_block, web_sources = self.enricher.build_web_context(title, full_content)
                avatar_enrich = self.enricher.enrich_section_avatar_style(
                    full_content, title, unit_title, web_context=web_block,
                    board=self.board, class_number=self.class_number,
                    subject=self.subject or "", unit_number=unit_number,
                )
                if not avatar_enrich:
                    logger.warning(f"-> Failed: {title}")
                    continue
                if web_sources:
                    avatar_enrich["supplementary_sources"] = web_sources
                # Inject doubt_context metadata
                dc = avatar_enrich.get("doubt_context", {})
                dc["board"] = self.board
                dc["class_number"] = self.class_number
                dc["subject"] = self.subject or "unknown"
                dc["unit_number"] = unit_number
                dc["section_title"] = title
                dc["max_rag_chunks"] = 5
                dc["fallback_to_broader_context"] = True
                if folded:
                    dc["covers"] = folded
                avatar_enrich["doubt_context"] = dc

                enriched_sections[anchor]["enrichment"] = avatar_enrich
                for i in members:
                    # No lesson of its own: the player and the doubt path
                    # find it through the section that teaches it.
                    enriched_sections[i]["enriched_in"] = title
                time.sleep(RATE_LIMIT_DELAY)

            # 2. Build virtual sections from legacy Social Science specific top-level fields (if present)
            legacy_sections = []
            ss_field_map = [
                ("do_you_know",  "Do You Know"),
                ("more_to_know", "More to Know"),
                ("activities",   "Activity"),
                ("map_work",     "Map Work"),
            ]
            for field_key, field_label in ss_field_map:
                for idx, item in enumerate(unit.get(field_key, []) or [], 1):
                    item_title = item.get("title") or f"{field_label} {idx}"
                    item_content = item.get("content") or item.get("instruction", "")
                    if isinstance(item_content, list):
                        item_content = "\n".join(str(x) for x in item_content)
                    if item_content and item_content.strip():
                        legacy_sections.append({
                            "section_title": item_title,
                            "content": item_content.strip(),
                            "subsections": [],
                        })

            summary_points = unit.get("summary", []) or []
            if summary_points:
                summary_text = "\n".join(f"• {p}" for p in summary_points if isinstance(p, str) and p.strip())
                if summary_text.strip():
                    legacy_sections.append({
                        "section_title": "Summary",
                        "content": summary_text,
                        "subsections": [],
                    })

            for sec in legacy_sections:
                title = sec.get("section_title")
                content = sec.get("content")
                logger.info(f"-> Avatar enriching legacy field: {title}")
                web_block, web_sources = self.enricher.build_web_context(title, content)
                avatar_enrich = self.enricher.enrich_section_avatar_style(
                    content, title, unit_title, web_context=web_block,
                    board=self.board, class_number=self.class_number,
                    subject=self.subject or "", unit_number=unit_number,
                )
                if avatar_enrich:
                    if web_sources:
                        avatar_enrich["supplementary_sources"] = web_sources
                    dc = avatar_enrich.get("doubt_context", {})
                    dc["board"] = self.board
                    dc["class_number"] = self.class_number
                    dc["subject"] = self.subject or "unknown"
                    dc["unit_number"] = unit_number
                    dc["section_title"] = title
                    dc["max_rag_chunks"] = 5
                    dc["fallback_to_broader_context"] = True
                    avatar_enrich["doubt_context"] = dc

                    enriched_sections.append({
                        "type": "section",
                        "title": title,
                        "content": content,
                        "enrichment": avatar_enrich,
                    })
                    time.sleep(RATE_LIMIT_DELAY)

            if enriched_sections:
                enrichment["sections"] = enriched_sections

            # Preservation of legacy Social Science top-level fields
            for key in ("exercises", "do_you_know", "more_to_know", "activities",
                        "map_work", "timeline", "glossary", "summary",
                        "learning_objectives", "points_to_remember",
                        "reference_books", "ict_corner"):
                if (val := unit.get(key)) is not None:
                    enrichment[key] = val

        # ── Wikipedia grounding record (non-math only) ────────────────────────
        # The fetching itself already happened per section, through the shared
        # per-unit cache. What lands here is the audit trail: which topics this
        # unit actually pulled, and how much of the budget it spent.
        if web_enabled:
            web_summary = self.enricher.web_cache_summary()
            if web_summary["topics_fetched"]:
                enrichment["supplementary_info"] = web_summary
                logger.info(
                    f"-> [Web] Unit {unit_number}: "
                    f"{len(web_summary['topics_fetched'])} topic(s) fetched, "
                    f"{web_summary['lookups_attempted']} lookup(s) attempted, "
                    f"{web_summary['lookups_remaining']} left in budget"
                )

        return enrichment

    # ── Enrich full document 

    @safe_observe(name="enrich-document")
    def enrich_document(self, structured_path: Path, output_path: Optional[Path] = None,
                        include_sections: bool = True, include_web: bool = True) -> Dict:
        """Enrich a document, with the whole run under one propagated context.

        The attributes have to be established *before* the work rather than
        patched on afterwards: on SDK v4 they propagate to the observations
        created inside this scope, so anything set later would land on nothing.
        """
        document_id = structured_path.parent.name
        # @safe_observe would otherwise record every argument - including
        # ``self``, with the enricher's API key on it - as the trace input.
        update_current_observation(input={"document_id": document_id,
                                          "structured_path": str(structured_path)})
        with trace_context(trace_name="enrich-document",
                           tags=["enrichment", self.subject or "unknown"],
                           metadata={"document_id": document_id,
                                     "model": self.enricher.model,
                                     "enrichment_style": self.enrichment_style,
                                     "subject": self.subject or "unknown"}):
            return self._enrich_document(structured_path, output_path,
                                         include_sections, include_web)

    def _enrich_document(self, structured_path: Path, output_path: Optional[Path] = None,
                         include_sections: bool = True, include_web: bool = True) -> Dict:
        if not structured_path.exists():
            raise FileNotFoundError(f"Not found: {structured_path}")

        structured_data = load_json(structured_path)
        document_id     = structured_path.parent.name

        # Load metadata if available
        metadata_path = structured_path.parent / "metadata.json"
        if metadata_path.exists():
            try:
                meta = load_json(metadata_path)
                self.board = meta.get("board", "")
                self.class_number = meta.get("class_number", "")
                if meta.get("subject") and not self.subject:
                    self.subject = meta.get("subject")
            except Exception as e:
                logger.warning(f"Failed to load metadata: {e}")

        # Subject auto-detection
        detected = _detect_subject(document_id, structured_data) or self.subject
        if detected and detected != self.subject:
            logger.info(f"Auto-detected subject: {detected}")
            self.subject  = detected
            self.enricher = ContentEnricher(subject=detected, api_key=self.api_key)

        is_math       = _is_math(self.subject)
        effective_web = include_web and not is_math  # disable web for math

        logger.info(f"{'='*60}")
        logger.info(f"Document  : {document_id}")
        logger.info(f"Subject   : {self.subject or 'unknown'}")
        logger.info(f"Model     : {self.enricher.model}")
        logger.info(f"Web       : {'disabled (math)' if is_math else effective_web}")
        logger.info(f"{'='*60}")

        content_key = "chapters" if "chapters" in structured_data else "units"

        # Data quality check — counts sections that have any extractable content.
        # BUG FIX: old check only looked at section.get("content") and subsections[].content
        # but Social Science legacy schema stores content inside subsections[], and
        # universal schema may store it in sub_items[]. Use _build_section_text() which
        # handles all schema variants so we don't false-alarm with "<50% content" warnings.
        total, with_content = 0, 0
        for unit in structured_data.get(content_key, []):
            for section in unit.get("sections", []):
                total += 1
                if _build_section_text(section).strip():
                    with_content += 1
        if total > 0:
            pct = with_content / total * 100
            logger.warning(f"DATA QUALITY: {with_content}/{total} sections have content ({pct:.1f}%)")
            if pct < 50:
                logger.warning("WARNING: <50% content — possible OCR/structuring issue.")

        # Trace name, tags and document_id are established by the
        # trace_context() in enrich_document() above - on SDK v4 they propagate
        # into the observations from there and cannot be attached after the
        # fact. document_id stays in metadata rather than tags: one tag per
        # document would make the tag list unusable for filtering.

        enriched_data: Dict[str, Any] = {
            "document_id":      document_id,
            "enriched_at":      datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "enrichment_model": self.enricher.model,
            "enrichment_style": self.enrichment_style,
            "subject":          self.subject or "unknown",
        }
        if self.board:
            enriched_data["board"] = self.board
        if self.class_number:
            enriched_data["class_number"] = self.class_number
        enriched_data[content_key] = []

        units  = structured_data.get(content_key, [])
        label  = "Chapter" if content_key == "chapters" else "Unit"

        for idx, unit in enumerate(units):
            unit_number = unit.get("unit_number") or unit.get("chapter_number", idx + 1)
            unit_title  = unit.get("title", "")
            has_content = (
                unit.get("sections") or unit.get("examples") or
                unit.get("illustrations") or unit.get("definitions") or
                unit.get("theorems") or unit_title
            )
            if not has_content:
                continue
            logger.info(f"[{idx+1}/{len(units)}] {label} {unit_number}: {unit_title}")
            enriched_data[content_key].append(
                self.enrich_unit(unit, include_web=effective_web)
            )

        # ── Generate TTS audio for all segments (male + female voices) ────────
        total_audio_segments = 0
        if self.enrichment_style == "avatar_classroom_teaching":
            logger.info(f"Generating avatar audio (male + female voices)...")
            for enriched_unit in enriched_data[content_key]:
                unit_num = enriched_unit.get("unit_number", "?")
                unit_ttl = enriched_unit.get("title", "")
                logger.info(f"Unit {unit_num}: {unit_ttl}")
                try:
                    count = _generate_unit_audio(
                        enriched_unit=enriched_unit,
                        board=self.board,
                        class_number=self.class_number,
                        subject=self.subject or "unknown",
                        is_math=is_math,
                    )
                    total_audio_segments += count
                    logger.info(f"{count} segments got audio")
                except Exception as e:
                    logger.warning(f"Audio generation error for unit {unit_num}: {e}")
            logger.info(f"Audio generation complete: {total_audio_segments} segments processed")

        if output_path is None:
            output_path = structured_path.parent / "enriched.json"
        save_json(enriched_data, output_path)
        logger.info(f"Saved: {output_path}")

        # Summary
        n_ex   = sum(len(u.get("examples", []))      for u in enriched_data[content_key])
        n_il   = sum(len(u.get("illustrations", [])) for u in enriched_data[content_key])
        n_def  = sum(len(u.get("definitions", []))   for u in enriched_data[content_key])
        n_sec  = sum(len(u.get("sections", []))      for u in enriched_data[content_key])
        logger.info(f"Summary: {len(enriched_data[content_key])} {label}s | "
              f"{n_sec} sections | {n_ex} examples | {n_il} illustrations | {n_def} definitions"
              f" | {total_audio_segments} audio segments")

        if self.langfuse:
            score_trace_safely(self.langfuse, name="enrichment-success", value=1.0,
                               data_type="NUMERIC",
                               comment=f"Enriched {len(enriched_data[content_key])} {content_key}")
            flush_safely(self.langfuse)

        return enriched_data



def enrich_document(structured_json_path: Path, output_path: Optional[Path] = None,
                    include_sections: bool = True, include_web: bool = True,
                    fast_mode: bool = True, subject: Optional[str] = None,
                    enrichment_style: str = "avatar_classroom_teaching") -> bool:
    """Main entry point to enrich a document."""
    try:
        orch = EnrichmentOrchestrator(fast_mode=fast_mode, subject=subject, enrichment_style=enrichment_style)
        orch.enrich_document(
            structured_path=structured_json_path,
            output_path=output_path,
            include_sections=include_sections,
            include_web=include_web,
        )
        return True
    except Exception as e:
        logger.exception(f"Enrichment failed: {e}")
        return False


def enrich_single_unit(
    unit: Dict,
    subject: Optional[str] = None,
    api_key: Optional[str] = None,
    enrichment_style: str = "avatar_classroom_teaching",
    fast_mode: bool = True,
) -> Dict:
    """
    Enrich a single unit dict in-memory (no file I/O).

    Used by the LangGraph fan-out enrichment node so each unit can be
    enriched concurrently without re-reading structured.json from disk.

    Args:
        unit:             A single unit/chapter dict from structured.json
        subject:          Subject name (auto-detected from unit data if None)
        api_key:          OpenRouter API key (falls back to env OPENROUTER_API_KEY)
        enrichment_style: "avatar_classroom_teaching" | "classroom_teaching"
        fast_mode:        Reserved flag; the model comes from ENRICHMENT_MODEL

    Returns:
        Enriched unit dict with enrichment fields added to each section.
    """
    import os as _os
    resolved_key = api_key or _os.environ.get("OPENROUTER_API_KEY", "")
    resolved_subject = subject or unit.get("subject")

    try:
        # Passed at construction, not assigned afterwards: the enricher builds
        # its ChatOpenAI client in __init__, so a key set on the instance later
        # never reached the model that actually runs.
        orch = EnrichmentOrchestrator(
            fast_mode=fast_mode,
            subject=resolved_subject,
            enrichment_style=enrichment_style,
            api_key=resolved_key or None,
        )

        enriched = orch.enrich_unit(unit, include_web=False)
        return enriched or unit
    except Exception as e:
        logger.warning(f"enrich_single_unit failed: {e}")
        return unit



def main():
    import argparse
    parser = argparse.ArgumentParser(description="Enrich extracted textbook content")
    parser.add_argument("structured_json")
    parser.add_argument("--output", "-o")
    parser.add_argument("--subject", "-s",
                        choices=["mathematics", "science", "english", "social_science"])
    parser.add_argument("--no-sections", action="store_true")
    parser.add_argument("--no-web",      action="store_true")
    parser.add_argument("--slow",        action="store_true")
    parser.add_argument("--style",       default="classroom_teaching", choices=["classroom_teaching", "avatar_classroom_teaching"])
    args = parser.parse_args()

    return 0 if enrich_document(
        structured_json_path=Path(args.structured_json),
        output_path=Path(args.output) if args.output else None,
        include_sections=not args.no_sections,
        include_web=not args.no_web,
        fast_mode=not args.slow,
        subject=args.subject,
        enrichment_style=args.style,
    ) else 1


if __name__ == "__main__":
    sys.exit(main())
