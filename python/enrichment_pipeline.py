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
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import orjson
import requests
from dotenv import load_dotenv


try:
    from langfuse_utils import (
        get_langfuse_client, safe_observe, update_trace_safely,
        update_generation_safely, flush_safely, score_trace_safely,
        create_span_context,
    )
    LANGFUSE_AVAILABLE = True
except ImportError:
    LANGFUSE_AVAILABLE = False

    def get_langfuse_client(): return None
    def safe_observe(name=None, **kw):
        def d(fn): return fn
        return d
    def update_trace_safely(*a, **kw): pass
    def update_generation_safely(*a, **kw): pass
    def flush_safely(*a, **kw): pass
    def score_trace_safely(*a, **kw): pass
    def create_span_context(*a, **kw): return None


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
    print("Warning: langchain-openai not installed.")

# ── Model configuration ────────────────────────────────────────────────────────
ENRICHMENT_MODEL_DEFAULT = "gpt-4o-mini"
ENRICHMENT_MODEL_MATH    = "gpt-4o-mini"   # Mathematics uses gpt-4o-mini for enrichment
OPENAI_API_URL           = "https://api.openai.com/v1/chat/completions"

MAX_RETRIES      = 3
RETRY_DELAY      = 5
RATE_LIMIT_DELAY = 0.5


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
For the avatar script: Speak naturally, build concepts step by step. Mark key segments with flashcard_type='mcq' or 'informative'.

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

STYLE:
- Speak naturally as if you're in a live classroom. Use "we", "let's", "notice how".
- Build concepts step by step. Use cause-effect reasoning.
- Mark key teaching segments with "flashcard_type": "mcq" to create MCQ checkpoint moments.
- These checkpoints will quiz the student before they proceed to the next segment.

FLASHCARD CHECKPOINTS:
- Use {"flashcard_id": "fc_XXX", "type": "flashcard", "flashcard_type": "mcq"} when testing is needed, or "informative" when a real-world example clarifies the topic.
- Typically every 2-3 teaching segments should have a flashcard checkpoint.

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
3. Start with an engaging introduction (enthusiastic), end with a confident summary.
4. Each segment should be 2-4 sentences max.
5. Use varied emotions — don't repeat the same emotion consecutively.
6. FAQs: 3-4 Q&A pairs. Practice questions: 3-4 questions. These are UNCHANGED from standard enrichment.
"""


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
    return subject in ("mathematics", "math")

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

# Voice mapping: OpenAI TTS voices for male/female avatars
AVATAR_TTS_MODEL = "gpt-4o-mini-tts"
AVATAR_VOICE_MALE = "echo"        # Deep, warm male voice
AVATAR_VOICE_FEMALE = "shimmer"   # Clear, expressive female voice
AVATAR_TTS_SPEED = 1.0


def _generate_avatar_tts(text: str, voice: str) -> Optional[bytes]:
    """Generate TTS audio bytes using OpenAI TTS API.

    Args:
        text: The text to convert to speech
        voice: OpenAI TTS voice name (e.g. "echo", "shimmer")

    Returns:
        Audio bytes (MP3) or None on failure
    """
    api_key = os.environ.get("OPENAI_API_KEY_TTS") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("  ⚠️  No TTS API key configured — skipping audio generation")
        return None

    # OpenAI TTS has a 4096 char limit
    tts_text = text[:4000] if len(text) > 4000 else text
    if not tts_text.strip():
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": AVATAR_TTS_MODEL,
        "input": tts_text,
        "voice": voice,
        "speed": AVATAR_TTS_SPEED,
        "response_format": "mp3",
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(
                "https://api.openai.com/v1/audio/speech",
                headers=headers,
                json=payload,
                timeout=120,
            )
            if resp.ok:
                return resp.content
            else:
                print(f"  ⚠️  TTS API error ({voice}): {resp.status_code} {resp.text[:200]}")
                # Retry on rate limits and server errors
                if resp.status_code in (429, 500, 502, 503, 504):
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAY * (attempt + 1))
                        continue
                return None
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                print(f"  ⚠️  TTS generation error ({voice}) [Attempt {attempt+1}/{MAX_RETRIES}]: {e}. Retrying...")
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                print(f"  ⚠️  TTS generation error ({voice}) [Final attempt]: {e}")
                return None
    return None


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
    elif seg_type == "flashcard":
        spoken_text = segment.get("avatar_line", "")
    else:
        return {}

    if not spoken_text or not spoken_text.strip():
        return {}

    try:
        from s3_storage import upload_avatar_audio_to_s3
    except ImportError:
        print("  ⚠️  s3_storage not available — skipping audio upload")
        return {}

    audio_urls = {}

    # Generate unique ID to prevent overwriting if segment_id repeats across sections
    unique_id = uuid.uuid4().hex[:8]
    
    # Generate & upload male voice
    male_audio = _generate_avatar_tts(spoken_text, AVATAR_VOICE_MALE)
    if male_audio:
        male_filename = f"{segment_id}_{unique_id}_male.mp3"
        male_url = upload_avatar_audio_to_s3(
            audio_bytes=male_audio,
            filename=male_filename,
            board=board,
            class_number=class_number,
            subject=subject,
            unit_number=unit_number,
        )
        if male_url:
            audio_urls["male"] = male_url

    time.sleep(0.3)  # Rate limit between TTS calls

    # Generate & upload female voice
    female_audio = _generate_avatar_tts(spoken_text, AVATAR_VOICE_FEMALE)
    if female_audio:
        female_filename = f"{segment_id}_{unique_id}_female.mp3"
        female_url = upload_avatar_audio_to_s3(
            audio_bytes=female_audio,
            filename=female_filename,
            board=board,
            class_number=class_number,
            subject=subject,
            unit_number=unit_number,
        )
        if female_url:
            audio_urls["female"] = female_url

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
        
        if is_math:
            # Math: section-level enrichment
            sec_enrich = section.get("section_enrichment", {})
            avatar_exp = sec_enrich.get("avatar_explanation", {})
            segments = avatar_exp.get("segments", [])
            if segments:
                print(f"      -> Audio for section: {sec_title}")
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
                    print(f"      -> Audio for sub-section: {sub_title}")
                    total_audio += _process_segments_audio(
                        sub_segments, board, class_number, subject, unit_number
                    )

        else:
            # Non-math: enrichment.avatar_explanation.segments
            enrichment = section.get("enrichment", {})
            avatar_exp = enrichment.get("avatar_explanation", {})
            segments = avatar_exp.get("segments", [])
            if segments:
                print(f"      -> Audio for section: {sec_title}")
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

    print(f"\n🔊 Generating avatar audio for existing enriched data (male + female voices)...")
    
    for enriched_unit in enriched_data.get(content_key, []):
        unit_num = enriched_unit.get("unit_number") or enriched_unit.get("chapter_number", "?")
        unit_ttl = enriched_unit.get("title", "")
        print(f"   🎙️  Unit {unit_num}: {unit_ttl}")
        
        try:
            count = _generate_unit_audio(
                enriched_unit=enriched_unit,
                board=board,
                class_number=class_number,
                subject=subject,
                is_math=is_math,
            )
            total_audio_segments += count
            print(f"      ✅ {count} segments got audio")
        except Exception as e:
            print(f"      ⚠️  Audio generation error for unit {unit_num}: {e}")
            
    print(f"\n🔊 Audio generation complete: {total_audio_segments} segments processed")
    
    return enriched_data



# ══════════════════════════════════════════════════════════════════════════════
#  CONTENT ENRICHER
# ══════════════════════════════════════════════════════════════════════════════

class ContentEnricher:
    """Generates enrichments using OpenAI with subject-aware prompts."""

    def __init__(self, api_key: Optional[str] = None, timeout: int = 120,
                 subject: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY_TEXT")
        self.timeout = timeout
        self.subject = subject
        self.model   = ENRICHMENT_MODEL_MATH if _is_math(subject) else ENRICHMENT_MODEL_DEFAULT
        self.langfuse = get_langfuse_client() if LANGFUSE_AVAILABLE else None
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY_TEXT not set in environment")
        
        self.llm = ChatOpenAI(
            model=self.model,
            openai_api_key=self.api_key,
            temperature=1.0,  # gpt-5-mini preference
            model_kwargs={"response_format": {"type": "json_object"}},
            timeout=self.timeout
        )

    # ── LLM call ──────────────────────────────────────────────────────────────

    def _call_llm(self, system_prompt: str, user_prompt: str,
                  max_tokens: int = 2048) -> Optional[str]:
        """Call LLM using LangChain."""
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", "{system_msg}"),
                ("user", "{user_msg}")
            ])
            chain = prompt | self.llm
            response = chain.invoke({
                "system_msg": system_prompt,
                "user_msg": user_prompt
            })
            return response.content.strip() or None
        except Exception as e:
            print(f"  ⚠️  LangChain LLM call error: {e}")
            return None

    def _parse_json_response(self, response: str) -> Optional[Dict]:
        if not response:
            return None
        if "```json" in response:
            s = response.find("```json") + 7
            e = response.find("```", s)
            response = response[s:e].strip() if e > s else response
        elif "```" in response:
            s = response.find("```") + 3
            e = response.find("```", s)
            response = response[s:e].strip() if e > s else response
        try:
            return orjson.loads(response)
        except orjson.JSONDecodeError as e:
            print(f"  ⚠️  JSON parse error: {e}")
            return None

    # ── Section enrichment (general / English) ────────────────────────────────

    def enrich_section_classroom_style(self, content: str, section_title: str,
                                        unit_title: str = "") -> Optional[SectionEnrichment]:
        if not content.strip() or len(content) < 50:
            return None
        prompt = ENGLISH_ENRICH_PROMPT if self.subject == "english" else ENRICH_PROMPT
        ctx    = f"Unit: {unit_title}\nSection: {section_title}\n\nContent:\n{content[:8000]}"
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
            print(f"  ⚠️  SectionEnrichment build error: {e}")
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
        return self._parse_json_response(raw) if raw else None

    # ── Math chapter overview ─────────────────────────────────────────────────

    def enrich_math_chapter(self, chapter: Dict) -> Optional[Dict]:
        title    = chapter.get("title", "")
        outcomes = chapter.get("learning_outcomes", [])
        intro    = (chapter.get("introduction", "") or "")[:2000]
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
        return self._parse_json_response(raw) if raw else None

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
        return self._parse_json_response(raw) if raw else None

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
        return self._parse_json_response(raw) if raw else None

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
                    print(f"      -> Skipping duplicate: {title}")
                continue
            seen.add(title)
            # Skip auxiliary sections that do not need enrichment
            lower_title = title.lower()
            if any(skip_word in lower_title for skip_word in ["summary", "glossary", "reference", "student activity", "life skill"]):
                print(f"      -> Skipping (auxiliary section): {title}")
                continue

            # Use pre-built content from section dict if available (set by enrich_unit),
            # otherwise fall back to _build_section_text for backward compatibility.
            content = section.get("content") or _build_section_text(section)
            # BUG FIX: 100 chars is too strict — Social Science do_you_know, timeline
            # entries, and summary points are often shorter but still enrichable.
            # Lower threshold to 50 chars so factboxes and key points are not skipped.
            if len(content.strip()) < 50:
                print(f"      -> Skipping (too short): {title}")
                continue
            print(f"      -> Enriching: {title}")
            enrich = self.enrich_section_classroom_style(content, title, unit_title)
            if enrich:
                enriched.append({"section_title": title, "enrichment": asdict(enrich)})
            else:
                print(f"      -> ⚠️  Failed: {title}")
            time.sleep(RATE_LIMIT_DELAY)
        return enriched

    # ── Avatar section enrichment ─────────────────────────────────────────────

    def enrich_section_avatar_style(self, content: str, section_title: str,
                                     unit_title: str = "") -> Optional[Dict]:
        """Generate avatar-style enrichment with emotion segments + inline flashcards."""
        if not content.strip() or len(content) < 50:
            return None
        ctx = f"Unit: {unit_title}\nSection: {section_title}\n\nContent:\n{content[:8000]}"
        user = (
            f"Create an avatar teaching script for this topic. "
            f"Include teaching segments with emotions AND inline flashcards "
            f"with real-world examples.\n\n{ctx}\n\nReturn in the JSON format specified."
        )
        raw = self._call_llm(AVATAR_ENRICH_PROMPT, user, max_tokens=4000)
        if not raw:
            return None
        parsed = self._parse_json_response(raw)
        if not parsed:
            return None

        # Validate and fix segment IDs — continuous numbering for all segments
        segments = parsed.get("avatar_explanation", {}).get("segments", [])
        seg_counter, fc_counter = 0, 0
        for seg in segments:
            seg_counter += 1
            seg["segment_id"] = f"seg_{seg_counter:03d}"
            if seg.get("type") == "flashcard":
                fc_counter += 1
                if not seg.get("flashcard_id"):
                    seg["flashcard_id"] = f"fc_{fc_counter:03d}"
            else:
                seg["type"] = "teaching"

        # Build enrichment dict with avatar + standard fields
        enrichment = {
            "concept_overview": parsed.get("concept_overview", ""),
            "avatar_explanation": parsed.get("avatar_explanation", {}),
            "faqs": parsed.get("faqs", []),
            "practice_questions": parsed.get("practice_questions", []),
            "doubt_context": parsed.get("doubt_context", {}),
        }
        return enrichment

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
                    print(f"      -> Skipping duplicate: {title}")
                continue
            seen.add(title)
            # Skip auxiliary sections that do not need enrichment
            lower_title = title.lower()
            if any(skip_word in lower_title for skip_word in ["summary", "glossary", "reference", "student activity", "life skill", "learning objective"]):
                print(f"      -> Skipping (auxiliary section): {title}")
                continue

            content = section.get("content") or _build_section_text(section)
            if len(content.strip()) < 50:
                print(f"      -> Skipping (too short): {title}")
                continue
            print(f"      -> Avatar enriching: {title}")
            avatar_enrich = self.enrich_section_avatar_style(content, title, unit_title)
            if avatar_enrich:
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
                print(f"      -> ⚠️  Failed: {title}")
            time.sleep(RATE_LIMIT_DELAY)
        return enriched


# ══════════════════════════════════════════════════════════════════════════════
#  ENRICHMENT ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════════════

class EnrichmentOrchestrator:
    """Orchestrates subject-aware enrichment for a full document."""

    def __init__(self, fast_mode: bool = True, subject: Optional[str] = None, enrichment_style: str = "avatar_classroom_teaching"):
        load_env()
        self.subject   = subject
        self.fast_mode = fast_mode
        self.enrichment_style = enrichment_style
        self.enricher  = ContentEnricher(subject=subject)
        self.web_tools = WebToolsClient() if WEB_TOOLS_AVAILABLE else None
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
                title = (sec.get("title") or sec.get("id")
                         or stype.replace("_", " ").title())
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
            print("      -> Generating chapter overview...")
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

                print(f"      -> Section: {sec_title} ({len(composite_content)} chars)")
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
                        print(f"         -> Example {ex_num}")
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
                        print(f"         -> Illustration {illus_num}")
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
                        print(f"         -> Definition: {term}")
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
                        print(f"         -> {sub_type.capitalize()} {thm_id}")
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
                        print(f"         -> {sub_type.capitalize()} {sub_title}")
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
            _skip_enrich = {"exercise", "multiple_choice", "unit_exercise", "illustration"}
            enriched_sections = []

            # 1. Process main sections list in-place to preserve original schema structure (illustrations, exercises, S3 image URLs)
            for sec in raw_secs:
                stype = sec.get("type", "section")
                enriched_sec = dict(sec)

                if stype not in _skip_enrich:
                    title = (sec.get("section_title") or sec.get("title")
                             or sec.get("id") or stype.replace("_", " ").title())

                    # Skip auxiliary sections
                    lower_title = title.lower()
                    if not any(skip_word in lower_title for skip_word in ["summary", "glossary", "reference", "student activity", "life skill", "learning objective"]):
                        full_content = _build_section_text(sec)

                        if len(full_content.strip()) >= 50:
                            print(f"      -> Avatar enriching: {title}")
                            avatar_enrich = self.enricher.enrich_section_avatar_style(full_content, title, unit_title)
                            if avatar_enrich:
                                # Inject doubt_context metadata
                                dc = avatar_enrich.get("doubt_context", {})
                                dc["board"] = self.board
                                dc["class_number"] = self.class_number
                                dc["subject"] = self.subject or "unknown"
                                dc["unit_number"] = unit_number
                                dc["section_title"] = title
                                dc["max_rag_chunks"] = 5
                                dc["fallback_to_broader_context"] = True
                                avatar_enrich["doubt_context"] = dc

                                enriched_sec["enrichment"] = avatar_enrich
                                time.sleep(RATE_LIMIT_DELAY)
                            else:
                                print(f"      -> ⚠️  Failed: {title}")

                enriched_sections.append(enriched_sec)

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
                print(f"      -> Avatar enriching legacy field: {title}")
                avatar_enrich = self.enricher.enrich_section_avatar_style(content, title, unit_title)
                if avatar_enrich:
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

        # ── Wikipedia (non-math only) 
        # Disabled as per user request to not fetch wikipedia info
        if False and include_web and self.web_tools and not is_math:
            print("      -> Fetching Wikipedia info...")
            try:
                qualifier = {
                    "english": "English literature",
                    "science": "science",
                    "social_science": "social science",
                }.get(self.subject or "", "")
                wiki = self.web_tools.search_wikipedia(f"{unit_title} {qualifier}".strip(), sentences=2)
                if wiki:
                    enrichment["supplementary_info"] = {"wikipedia_summary": wiki}
            except Exception as e:
                print(f"      ⚠️  Web tools error: {e}")

        return enrichment

    # ── Enrich full document 

    @safe_observe(name="enrich-document")
    def enrich_document(self, structured_path: Path, output_path: Optional[Path] = None,
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
                print(f"⚠️ Failed to load metadata: {e}")

        # Subject auto-detection
        detected = _detect_subject(document_id, structured_data) or self.subject
        if detected and detected != self.subject:
            print(f"\n📚 Auto-detected subject: {detected}")
            self.subject  = detected
            self.enricher = ContentEnricher(subject=detected)

        is_math       = _is_math(self.subject)
        effective_web = include_web and not is_math  # disable web for math

        print(f"\n{'='*60}")
        print(f"Document  : {document_id}")
        print(f"Subject   : {self.subject or 'unknown'}")
        print(f"Model     : {self.enricher.model}")
        print(f"Web       : {'disabled (math)' if is_math else effective_web}")
        print(f"{'='*60}")

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
            print(f"\n⚠️  DATA QUALITY: {with_content}/{total} sections have content ({pct:.1f}%)")
            if pct < 50:
                print("   ⚠️  WARNING: <50% content — possible OCR/structuring issue.")

        if self.langfuse:
            update_trace_safely(self.langfuse,
                name="document-enrichment",
                input={"document_id": document_id},
                tags=["enrichment", document_id])

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
            print(f"\n[{idx+1}/{len(units)}] {label} {unit_number}: {unit_title}")
            enriched_data[content_key].append(
                self.enrich_unit(unit, include_web=effective_web)
            )

        # ── Generate TTS audio for all segments (male + female voices) ────────
        total_audio_segments = 0
        if self.enrichment_style == "avatar_classroom_teaching":
            print(f"\n🔊 Generating avatar audio (male + female voices)...")
            for enriched_unit in enriched_data[content_key]:
                unit_num = enriched_unit.get("unit_number", "?")
                unit_ttl = enriched_unit.get("title", "")
                print(f"   🎙️  Unit {unit_num}: {unit_ttl}")
                try:
                    count = _generate_unit_audio(
                        enriched_unit=enriched_unit,
                        board=self.board,
                        class_number=self.class_number,
                        subject=self.subject or "unknown",
                        is_math=is_math,
                    )
                    total_audio_segments += count
                    print(f"      ✅ {count} segments got audio")
                except Exception as e:
                    print(f"      ⚠️  Audio generation error for unit {unit_num}: {e}")
            print(f"\n🔊 Audio generation complete: {total_audio_segments} segments processed")

        if output_path is None:
            output_path = structured_path.parent / "enriched.json"
        save_json(enriched_data, output_path)
        print(f"\n✅ Saved: {output_path}")

        # Summary
        n_ex   = sum(len(u.get("examples", []))      for u in enriched_data[content_key])
        n_il   = sum(len(u.get("illustrations", [])) for u in enriched_data[content_key])
        n_def  = sum(len(u.get("definitions", []))   for u in enriched_data[content_key])
        n_sec  = sum(len(u.get("sections", []))      for u in enriched_data[content_key])
        print(f"\n📊 Summary: {len(enriched_data[content_key])} {label}s | "
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
        print(f"❌ Enrichment failed: {e}")
        import traceback
        traceback.print_exc()
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
        api_key:          OpenAI API key (falls back to env OPENAI_API_KEY_TEXT)
        enrichment_style: "avatar_classroom_teaching" | "classroom_teaching"
        fast_mode:        Use fast mode (gpt-4o-mini) when True

    Returns:
        Enriched unit dict with enrichment fields added to each section.
    """
    import os as _os
    resolved_key = api_key or _os.environ.get("OPENAI_API_KEY_TEXT") or _os.environ.get("OPENAI_API_KEY", "")
    resolved_subject = subject or unit.get("subject")

    try:
        orch = EnrichmentOrchestrator(
            fast_mode=fast_mode,
            subject=resolved_subject,
            enrichment_style=enrichment_style,
        )
        # Inject API key into the underlying ContentEnricher
        if resolved_key and hasattr(orch, "enricher") and hasattr(orch.enricher, "api_key"):
            orch.enricher.api_key = resolved_key

        enriched = orch.enrich_unit(unit, include_web=False)
        return enriched or unit
    except Exception as e:
        print(f"⚠️  enrich_single_unit failed: {e}")
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
