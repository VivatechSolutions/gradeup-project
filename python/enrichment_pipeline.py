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
import time
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
ENRICHMENT_MODEL_MATH    = "gpt-4o"        # Mathematics uses gpt-4o for better logic processing
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
Given a math section/subsection, produce a teaching block for deep understanding.

STYLE: Lead with intuition. State the core point plainly. Give a memorable analogy.
List important properties. Flag common misconceptions.

Return STRICT JSON:
{
  "summary": "",
  "key_idea": "",
  "analogy": "",
  "important_properties": [""],
  "common_misconceptions": [""]
}
"""

MATH_EXAMPLE_ENRICH_PROMPT = """
You are an expert Class 10 mathematics teacher explaining a solved example.

For EVERY step: explain WHAT was done, show the WORKING, and explain WHY.

Return STRICT JSON:
{
  "concept_being_tested": "",
  "approach": "",
  "steps": [
    {
      "step_number": 1,
      "part": "",
      "action": "",
      "working": "",
      "explanation": ""
    }
  ],
  "key_takeaway": "",
  "exam_tip": "",
  "common_mistakes": [""],
  "similar_problem": ""
}
"""

MATH_ILLUSTRATION_ENRICH_PROMPT = """
You are an expert Class 10 mathematics teacher explaining an illustration.
An Illustration in a TN math textbook is a short numeric worked example
that demonstrates a concept immediately after its introduction.

Return STRICT JSON:
{
  "concept_being_illustrated": "",
  "walkthrough": [
    {"step": 1, "explanation": ""}
  ],
  "key_insight": "",
  "connection_to_theory": "",
  "try_it_yourself": ""
}
"""

MATH_DEFINITION_ENRICH_PROMPT = """
You are an expert Class 10 mathematics teacher making a formal definition or
theorem accessible to students.

Start with WHY this definition exists. Rephrase in plain language first.
Give a concrete example that SATISFIES it and one that does NOT.

Return STRICT JSON:
{
  "intuitive_explanation": "",
  "formal_statement_explained": "",
  "example_satisfying": "",
  "example_not_satisfying": "",
  "why_it_matters": ""
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


# ══════════════════════════════════════════════════════════════════════════════
#  DATACLASSES
# ══════════════════════════════════════════════════════════════════════════════

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


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

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
    # Legacy: subsections
    for sub in section.get("subsections", []):
        sub_title = sub.get("subsection_title") or sub.get("title", "")
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
        raw   = self._call_llm(MATH_SECTION_ENRICH_PROMPT, user, max_tokens=2000)
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
        raw  = self._call_llm(MATH_EXAMPLE_ENRICH_PROMPT, user, max_tokens=3000)
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
        raw  = self._call_llm(MATH_ILLUSTRATION_ENRICH_PROMPT, user, max_tokens=2000)
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


# ══════════════════════════════════════════════════════════════════════════════
#  ENRICHMENT ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════════════

class EnrichmentOrchestrator:
    """Orchestrates subject-aware enrichment for a full document."""

    def __init__(self, fast_mode: bool = True, subject: Optional[str] = None):
        load_env()
        self.subject   = subject
        self.fast_mode = fast_mode
        self.enricher  = ContentEnricher(subject=subject)
        self.web_tools = WebToolsClient() if WEB_TOOLS_AVAILABLE else None
        self.langfuse  = get_langfuse_client() if LANGFUSE_AVAILABLE else None

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
        unit_title  = unit.get("title", "")
        is_math     = _is_math(self.subject)

        enrichment: Dict[str, Any] = {
            "unit_number": unit_number,
            "title":       unit_title,
            "subject":     self.subject or "unknown",
            "sections":    [],
        }

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

            # 1. Sections + subsections
            enriched_sections = []
            # Universal: type field; Legacy: section_title field
            _math_skip_types = {"example", "exercise", "illustration", "definition",
                                 "theorem", "proof", "corollary", "construction",
                                 "multiple_choice", "unit_exercise", "thinking_corner",
                                 "progress_check", "note", "ict_corner", "points_to_remember"}
            for section in unit.get("sections", []):
                stype = section.get("type", "section")
                if stype in _math_skip_types:
                    continue
                sec_title = (section.get("section_title") or section.get("title")
                             or section.get("id", ""))
                print(f"      -> Section: {sec_title}")
                sec_enrich = self.enricher.enrich_math_section(section, unit_title)
                enriched_sec: Dict[str, Any] = {
                    "section_number":     section.get("section_number") or section.get("id", ""),
                    "section_title":      sec_title,
                    "content":            section.get("content", ""),
                    "type":               stype,
                    "section_enrichment": sec_enrich or {},
                    "subsections":        [],
                }
                for sub in section.get("subsections", []):
                    sub_title = sub.get("subsection_title") or sub.get("title", "")
                    print(f"         -> Subsection: {sub_title}")
                    sub_enrich = self.enricher.enrich_math_section(sub, unit_title)
                    enriched_sec["subsections"].append({
                        "subsection_number":  sub.get("subsection_number") or sub.get("id", ""),
                        "subsection_title":   sub_title,
                        "content":            sub.get("content", ""),
                        "section_enrichment": sub_enrich or {},
                    })
                    time.sleep(RATE_LIMIT_DELAY)
                enriched_sections.append(enriched_sec)
                time.sleep(RATE_LIMIT_DELAY)

            if enriched_sections:
                enrichment["sections"] = enriched_sections

            # Helper: pull items by type from universal sections[] or legacy top-level key
            def _by_type(u, types):
                if isinstance(types, str): types = [types]
                results = []
                for s in u.get("sections", []):
                    # Check if section itself matches (legacy)
                    if s.get("type") in types:
                        results.append(s)
                    # Check if items inside content array match (universal)
                    if isinstance(s.get("content"), list):
                        for item in s["content"]:
                            if isinstance(item, dict) and item.get("type") in types:
                                results.append(item)
                return results

            # 2. Examples
            examples = unit.get("examples", []) or _by_type(unit, ["example"])
            if examples:
                print(f"      -> Enriching {len(examples)} examples...")
                enriched_examples = []
                for ex in examples:
                    ex_num = ex.get("example_number") or ex.get("id", "?")
                    print(f"         Example {ex_num}...")
                    ex_enrich = self.enricher.enrich_math_example(ex, unit_title)
                    enriched_ex = dict(ex)
                    if ex_enrich:
                        enriched_ex["enrichment"] = ex_enrich
                    else:
                        print(f"         ⚠️  Failed: Example {ex_num}")
                    enriched_examples.append(enriched_ex)
                    time.sleep(RATE_LIMIT_DELAY)
                enrichment["examples"] = enriched_examples

            # 3. Illustrations
            illustrations = unit.get("illustrations", []) or _by_type(unit, ["illustration"])
            if illustrations:
                sorted_illus = sorted(illustrations, key=lambda x: x.get("order_in_chapter") or 999)
                print(f"      -> Enriching {len(sorted_illus)} illustrations...")
                enriched_illustrations = []
                for illus in sorted_illus:
                    illus_num = illus.get("illustration_number") or illus.get("id", "?")
                    print(f"         Illustration {illus_num}...")
                    illus_enrich = self.enricher.enrich_math_illustration(illus, unit_title)
                    enriched_illus = dict(illus)
                    if illus_enrich:
                        enriched_illus["enrichment"] = illus_enrich
                    else:
                        print(f"         ⚠️  Failed: Illustration {illus_num}")
                    enriched_illustrations.append(enriched_illus)
                    time.sleep(RATE_LIMIT_DELAY)
                enrichment["illustrations"] = enriched_illustrations

            # 4. Definitions
            definitions = unit.get("definitions", []) or _by_type(unit, ["definition"])
            if definitions:
                print(f"      -> Enriching {len(definitions)} definitions...")
                enriched_defs = []
                for defn in definitions:
                    term = defn.get("term") or defn.get("title") or defn.get("id", "?")
                    print(f"         Definition: {term}...")
                    defn_enrich = self.enricher.enrich_math_definition(defn, unit_title)
                    enriched_defn = dict(defn)
                    if defn_enrich:
                        enriched_defn["enrichment"] = defn_enrich
                    enriched_defs.append(enriched_defn)
                    time.sleep(RATE_LIMIT_DELAY)
                enrichment["definitions"] = enriched_defs

            # 5. Theorems
            theorems = unit.get("theorems", []) or _by_type(unit, ["theorem", "proof", "corollary"])
            if theorems:
                print(f"      -> Enriching {len(theorems)} theorems...")
                enriched_theorems = []
                for thm in theorems:
                    thm_num = thm.get("theorem_number") or thm.get("id", "?")
                    print(f"         Theorem {thm_num}...")
                    thm_enrich = self.enricher.enrich_math_definition(thm, unit_title)
                    enriched_thm = dict(thm)
                    if thm_enrich:
                        enriched_thm["enrichment"] = thm_enrich
                    enriched_theorems.append(enriched_thm)
                    time.sleep(RATE_LIMIT_DELAY)
                enrichment["theorems"] = enriched_theorems

            # 6. Points to remember
            ptr = unit.get("points_to_remember", [])
            if ptr:
                print(f"      -> Enriching {len(ptr)} points to remember...")
                enrichment["points_to_remember_enriched"] = (
                    self.enricher.enrich_points_to_remember(ptr, unit_title)
                )

            # 7. Pass-through fields
            for key in ("exercises", "unit_exercise", "multiple_choice_questions",
                        "thinking_corners", "progress_checks", "notes",
                        "points_to_remember", "ict_corner", "learning_outcomes"):
                if (val := unit.get(key)) is not None:
                    enrichment[key] = val

        # ── ENGLISH 
        elif self.subject == "english":
            sections = self._build_english_sections(unit)
            if sections:
                enrichment["sections"] = self.enricher.batch_enrich_unit_sections(sections, unit_title)

        # ── GENERAL (Science / Social Science)
        else:
            raw_secs = unit.get("sections", [])
            # Normalize both universal schema (type/title/content/sub_items) and
            # legacy schema (section_number/section_title/content/subsections)
            _skip_enrich = {"exercise", "multiple_choice", "unit_exercise"}
            sections = []
            for sec in raw_secs:
                stype = sec.get("type", "section")
                if stype in _skip_enrich:
                    continue
                title = (sec.get("section_title") or sec.get("title")
                         or sec.get("id") or stype.replace("_", " ").title())

                # BUG FIX 1: Use _build_section_text() which correctly handles BOTH:
                #   - Universal schema: content + sub_items[]
                #   - Legacy schema (Social Science): content may be empty but
                #     subsections[] hold the real content.
                # Previously, we only checked sec.get("content") and sub_items,
                # completely missing subsections[] → all social science sections
                # with content only in subsections were silently dropped.
                full_content = _build_section_text(sec)

                if full_content.strip():
                    sections.append({
                        "section_title": title,
                        "content": full_content,
                        "subsections": sec.get("subsections", []),
                    })

            # BUG FIX 2: Also build virtual sections from Social Science specific
            # top-level fields that are completely ignored by the old GENERAL branch:
            # do_you_know, activities, map_work, summary, glossary, timeline.
            # These are rich content that should be enriched but were being silently dropped.
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
                        sections.append({
                            "section_title": item_title,
                            "content": item_content.strip(),
                            "subsections": [],
                        })

            # summary[] → one combined section (it's a bullet list; join for enrichment)
            summary_points = unit.get("summary", []) or []
            if summary_points:
                summary_text = "\n".join(f"• {p}" for p in summary_points if isinstance(p, str) and p.strip())
                if summary_text.strip():
                    sections.append({
                        "section_title": "Summary",
                        "content": summary_text,
                        "subsections": [],
                    })

            if sections:
                enrichment["sections"] = self.enricher.batch_enrich_unit_sections(sections, unit_title)

            # BUG FIX 3: Pass through Social Science specific fields to output so they
            # are not silently dropped. These are preserved as-is (not enriched further).
            for key in ("exercises", "do_you_know", "more_to_know", "activities",
                        "map_work", "timeline", "glossary", "summary",
                        "learning_objectives", "points_to_remember",
                        "reference_books", "ict_corner"):
                if (val := unit.get(key)) is not None:
                    enrichment[key] = val

        # ── Wikipedia (non-math only) 
        # FIX: math chapter titles return irrelevant Wikipedia articles so we skip for math
        if include_web and self.web_tools and not is_math:
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
            "enrichment_style": "classroom_teaching",
            "subject":          self.subject or "unknown",
            content_key:        [],
        }

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
              f"{n_sec} sections | {n_ex} examples | {n_il} illustrations | {n_def} definitions")

        if self.langfuse:
            score_trace_safely(self.langfuse, name="enrichment-success", value=1.0,
                               data_type="NUMERIC",
                               comment=f"Enriched {len(enriched_data[content_key])} {content_key}")
            flush_safely(self.langfuse)

        return enriched_data



def enrich_document(structured_json_path: Path, output_path: Optional[Path] = None,
                    include_sections: bool = True, include_web: bool = True,
                    fast_mode: bool = True, subject: Optional[str] = None) -> bool:
    """Main entry point to enrich a document."""
    try:
        orch = EnrichmentOrchestrator(fast_mode=fast_mode, subject=subject)
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
    args = parser.parse_args()

    return 0 if enrich_document(
        structured_json_path=Path(args.structured_json),
        output_path=Path(args.output) if args.output else None,
        include_sections=not args.no_sections,
        include_web=not args.no_web,
        fast_mode=not args.slow,
        subject=args.subject,
    ) else 1


if __name__ == "__main__":
    sys.exit(main())
