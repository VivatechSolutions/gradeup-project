"""
Exam Preparation Engine for GradeUp AI Tutor

Builds a smart study guide for ONE unit and caches it, so the LLM runs once
per unit rather than once per student:

1. Qdrant (RAG) supplies the textbook's key concepts, formulas, theorems and
   definitions for the unit.
2. The Question Bank says which topics actually get asked - a topic that
   recurs across years, or that carries hard / high-Bloom questions, ranks
   first.
3. When the Question Bank holds fewer than QB_SPARSE_THRESHOLD questions for
   the unit, SearXNG (web_tools.SearXNGClient) fills in with supplementary
   material, labelled "source": "web". SearXNG down -> Wikipedia fallback,
   handled inside the client.
4. Topics are ranked: the student's weak sections first, then exam frequency,
   then difficulty. The cached guide holds the impersonal order (frequency,
   difficulty); the weak-section re-ordering is applied per request, without
   another LLM call, so one guide serves every student.
5. Subject-aware extraction: formulas for maths/physics, reactions for
   chemistry, definitions and processes for biology, dates and figures for
   history, articles for civics, grammar and literary devices for English.
6. The guide is persisted with generated_once=true in exam_data/; later
   requests for the same unit come back from disk.

The exam itself (exam_engine.py) never reads web content - the web tier is
preparation-only.
"""

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

import avatar_llm
from langfuse_utils import with_student_context
from logger import get_logger

load_dotenv()
logger = get_logger(__name__)

EXAM_DATA_DIR = Path("exam_data")

# Same routing as the avatar / highlight modules: a bare gemini-* slug goes
# direct to Google on GEMINI_API_KEY, a vendor/model slug to OpenRouter. The
# OpenAI key is exhausted, so nothing here posts to api.openai.com.
EXAM_MODEL = os.getenv("EXAM_MODEL", "gemini-3.6-flash")
EXAM_FALLBACK_MODEL = os.getenv("EXAM_FALLBACK_MODEL", "meta-llama/llama-4-scout")
EXAM_LLM_TIMEOUT = int(os.getenv("EXAM_LLM_TIMEOUT", "90"))

# Fewer question-bank questions than this for a unit -> the bank is "sparse":
# the prep engine adds web material, the exam engine generates gap-fill
# questions from the textbook.
QB_SPARSE_THRESHOLD = 5

PREP_RAG_LIMIT = 6            # chunks per RAG query
PREP_RAG_CHARS = 9000         # textbook context handed to the LLM
PREP_WEB_CHARS = 3000         # web snippets handed to the LLM
PREP_MAX_TOPICS = 10
PREP_MAX_PREVIEW_QUESTIONS = 8
PREP_MAX_WEB_RESULTS = 8
PREP_MAX_ITEMS_PER_KEY = 15   # cap on each subject_specifics list

DIFFICULTY_WEIGHT = {"hard": 3, "medium": 2, "easy": 1}
BLOOM_WEIGHT = {"create": 6, "evaluate": 5, "analyze": 4, "apply": 3, "understand": 2, "remember": 1}

# ── Subject-aware extraction ──────────────────────────────────────────────────

# Every guide carries every key (empty when not relevant) so the frontend can
# render one fixed layout; `focus` says which ones the LLM is told to fill.
SUBJECT_SPECIFIC_KEYS = [
    "formulas", "theorems", "laws", "definitions", "reactions", "processes",
    "key_dates", "key_figures", "articles", "grammar_rules", "literary_devices",
]

SUBJECT_FAMILIES: Dict[str, Dict[str, Any]] = {
    "mathematics": {
        "aliases": ["math", "maths", "mathematics", "algebra", "geometry", "trigonometry",
                    "calculus", "statistics", "arithmetic"],
        "focus": ["formulas", "theorems", "definitions"],
        "guidance": "Formulas, theorems, solved-example patterns and the common problem types "
                    "that get asked. Write every formula in plain text (x = (-b ± √(b²-4ac)) / 2a).",
    },
    "physics": {
        "aliases": ["physics"],
        "focus": ["laws", "formulas", "definitions", "processes"],
        "guidance": "Laws, formulas with SI units, derivations to remember, numerical problem "
                    "types and the standard values students must know.",
    },
    "chemistry": {
        "aliases": ["chemistry"],
        "focus": ["reactions", "formulas", "definitions", "laws"],
        "guidance": "Balanced chemical reactions and equations, periodic-table facts, valency "
                    "rules, named processes and laws.",
    },
    "biology": {
        "aliases": ["biology", "botany", "zoology", "life science"],
        "focus": ["definitions", "processes", "laws"],
        "guidance": "Definitions, labelled-diagram topics, life cycles, classification keys and "
                    "step-by-step processes (photosynthesis, digestion, ...).",
    },
    "science": {
        "aliases": ["science", "general science", "evs", "environmental science"],
        "focus": ["formulas", "laws", "definitions", "reactions", "processes"],
        "guidance": "Whichever of these the unit actually contains: laws and formulas (physics "
                    "units), reactions (chemistry units), definitions and processes (biology units).",
    },
    "history": {
        "aliases": ["history"],
        "focus": ["key_dates", "key_figures", "definitions", "processes"],
        "guidance": "Dates, events in order, causes and effects, key figures and what each is "
                    "remembered for, timelines.",
    },
    "geography": {
        "aliases": ["geography"],
        "focus": ["definitions", "processes", "key_figures"],
        "guidance": "Geographic terms, phenomena and how they work, map-based topics, statistics "
                    "and locations that get asked.",
    },
    "civics": {
        "aliases": ["civics", "political science", "polity", "politics", "constitution"],
        "focus": ["articles", "definitions", "key_dates", "key_figures"],
        "guidance": "Constitutional articles and amendments, fundamental rights and duties, "
                    "institutions and their roles, key terms.",
    },
    "economics": {
        "aliases": ["economics", "economy", "commerce", "accountancy", "business studies"],
        "focus": ["definitions", "formulas", "processes"],
        "guidance": "Definitions of economic terms, formulas (GDP, growth rate, ...), processes "
                    "and the standard comparisons that get asked.",
    },
    "social_science": {
        "aliases": ["social", "social science", "social studies", "sst"],
        "focus": ["key_dates", "key_figures", "definitions", "articles", "processes"],
        "guidance": "Dates and figures (history units), articles and institutions (civics units), "
                    "terms and phenomena (geography units).",
    },
    "english": {
        "aliases": ["english", "grammar", "literature", "language"],
        "focus": ["grammar_rules", "literary_devices", "definitions"],
        "guidance": "Grammar rules with an example each, literary devices used in the prose / "
                    "poem, character and theme notes, comprehension strategies.",
    },
}

_GENERAL_FAMILY = {
    "focus": ["definitions", "formulas", "processes", "key_dates"],
    "guidance": "Whatever the textbook context emphasises: definitions, formulas, processes, dates.",
}

_STOPWORDS = {
    "the", "a", "an", "of", "in", "on", "and", "or", "to", "for", "with", "by", "its",
    "is", "are", "was", "were", "be", "as", "at", "from", "into", "that", "this", "unit",
    "chapter", "introduction", "general",
}


def detect_subject_family(subject: str) -> str:
    """Map a free-text subject ("Maths", "Social Science", "Class 9 Physics") to a family key."""
    s = (subject or "").strip().lower()
    if not s:
        return "general"
    # Longest alias first so "social science" beats "science".
    candidates = sorted(
        ((alias, family) for family, spec in SUBJECT_FAMILIES.items() for alias in spec["aliases"]),
        key=lambda pair: -len(pair[0]),
    )
    for alias, family in candidates:
        if re.search(rf"\b{re.escape(alias)}\b", s):
            return family
    return "general"


def subject_focus(family: str) -> Tuple[List[str], str]:
    """(keys the LLM should fill, guidance sentence) for a family."""
    spec = SUBJECT_FAMILIES.get(family, _GENERAL_FAMILY)
    return list(spec["focus"]), spec["guidance"]


def _tokens(text: str) -> set:
    return {t for t in re.findall(r"[a-z0-9]+", (text or "").lower()) if t not in _STOPWORDS and len(t) > 1}


def topics_match(a: str, b: str) -> bool:
    """Loose topic-name equality: token Jaccard >= 0.5 or one contains the other."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return False
    if ta <= tb or tb <= ta:
        return True
    return len(ta & tb) / len(ta | tb) >= 0.5


# ── Engine ────────────────────────────────────────────────────────────────────


class ExamPrepEngine:
    """Generates and caches one study guide per (subject, unit, document, term)."""

    def __init__(self, data_dir: Path = EXAM_DATA_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._searx = None  # built lazily; only needed when the bank is sparse

    # ── Storage ───────────────────────────────────────────────────────────────

    @staticmethod
    def _slug(value: Any) -> str:
        return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_") or "none"

    def _prep_key(self, subject: str, unit_number: int, document_id: str,
                  term: Optional[Any] = None, part: Optional[str] = None) -> str:
        from term_utils import normalize_term
        t = normalize_term(term) or ""
        return f"{self._slug(subject)}|{self._slug(part) if part else ''}|{unit_number}|{document_id}|{t}"

    def _prep_id(self, subject: str, unit_number: int, document_id: str,
                 term: Optional[Any] = None, part: Optional[str] = None) -> str:
        return hashlib.md5(self._prep_key(subject, unit_number, document_id, term, part).encode()).hexdigest()[:12]

    def _prep_path(self, subject: str, unit_number: int, document_id: str,
                   term: Optional[Any] = None, part: Optional[str] = None) -> Path:
        from term_utils import normalize_term
        t = normalize_term(term)
        # Unit numbers restart per term book AND per part (a Social subject's
        # geography and history books both have a unit 1), so both are keys.
        part_slug = f"__{self._slug(part)}" if part else ""
        suffix = f"__{self._slug(t)}" if t else ""
        return self.data_dir / (
            f"prep__{self._slug(subject)}{part_slug}__unit{unit_number}__{self._slug(document_id)}{suffix}.json"
        )

    def _load_json(self, path: Path) -> Optional[Dict[str, Any]]:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"[ExamPrep] Could not read {path.name}: {e}")
        return None

    def _save_json(self, path: Path, data: Dict[str, Any]) -> None:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _qb_fingerprint(self, document_ids: List[str], unit_number: int,
                        term: Optional[Any] = None) -> str:
        """A short hash of the bank's questions for this unit.

        Stored on the guide at build time and compared on every read: an
        uploaded or re-scored paper changes it, and the guide rebuilds on the
        next request instead of serving pre-upload content forever.
        """
        try:
            from question_bank import get_question_bank_manager
            questions = get_question_bank_manager().get_questions_for_ids(
                document_ids, unit_number=unit_number, term=term,
            )
        except Exception:
            return ""
        keys = sorted(
            f"{q.get('question_id')}|{q.get('year')}|{q.get('exam_name')}|{q.get('topic')}|{q.get('difficulty')}"
            for q in questions
        )
        return hashlib.md5("\n".join(keys).encode()).hexdigest()[:12] if keys else "empty"

    def _is_cached(self, subject: str, unit_number: int, document_id: str,
                   term: Optional[Any] = None, part: Optional[str] = None,
                   qb_document_ids: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
        """The stored guide for this unit, or None when it must be (re)built.

        None when nothing was generated yet, and also when the question bank
        for the unit has changed since the guide was built.
        """
        guide = self._load_json(self._prep_path(subject, unit_number, document_id, term, part))
        if not (guide and guide.get("generated_once") and guide.get("priority_topics") is not None):
            return None
        current = self._qb_fingerprint(qb_document_ids or [document_id], unit_number, term)
        if guide.get("qb_fingerprint") not in (None, current):
            logger.info(f"[ExamPrep] Question bank changed for {subject} unit {unit_number} - rebuilding guide")
            return None
        return guide

    # ── Sources ───────────────────────────────────────────────────────────────

    def _fetch_rag_concepts(
        self, subject: str, unit_number: int, board: Optional[str] = None,
        class_number: Optional[str] = None, term: Optional[Any] = None,
        topic_hints: Optional[List[str]] = None, part: Optional[str] = None,
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Textbook chunks for the unit's concepts, formulas, theorems and definitions.

        Returns (unit_title, chunks). Several angled queries rather than one,
        because a single "key concepts" query clusters on the introduction and
        misses the formula box three sections later.
        """
        queries = [
            f"{subject} unit {unit_number} key concepts and definitions",
            f"{subject} unit {unit_number} important formulas theorems laws",
            f"{subject} unit {unit_number} summary main points to remember",
        ]
        for hint in (topic_hints or [])[:4]:
            if hint and hint.lower() != "general":
                queries.append(f"{hint} {subject}")

        chunks: List[Dict[str, Any]] = []
        seen = set()
        unit_title = ""
        try:
            from qdrant_integration import search_qdrant
            for query in queries:
                results = search_qdrant(
                    query=query,
                    limit=PREP_RAG_LIMIT,
                    unit_filter=unit_number,
                    subject_filter=subject,
                    board_filter=board,
                    class_filter=class_number,
                    term_filter=term,
                    part_filter=part,
                )
                for r in results or []:
                    text = (r.get("text") or "").strip()
                    if not text:
                        continue
                    key = text[:120]
                    if key in seen:
                        continue
                    seen.add(key)
                    meta = r.get("metadata", {}) or {}
                    if not unit_title and meta.get("unit_title"):
                        unit_title = meta["unit_title"]
                    chunks.append({
                        "text": text[:1200],
                        "section_title": meta.get("section_title", ""),
                        "unit_title": meta.get("unit_title", ""),
                        "score": r.get("score"),
                    })
        except Exception as e:
            logger.warning(f"[ExamPrep] RAG retrieval failed: {e}")
        return unit_title, chunks

    def _fetch_qb_important_topics(
        self, document_ids: List[str], unit_number: int, term: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Topic frequency / difficulty stats from the question bank for this unit.

        frequency = how many questions test the topic across every uploaded
        paper; years = the distinct exam years it appeared in; hard_count and
        the Bloom weight say how demanding those questions were.

        `document_ids` are every id the bank may hold this book under (see
        QuestionBankManager.get_questions_for_ids).
        """
        try:
            from question_bank import get_question_bank_manager
            questions = get_question_bank_manager().get_questions_for_ids(
                document_ids, unit_number=unit_number, term=term,
            )
        except Exception as e:
            logger.warning(f"[ExamPrep] Question bank lookup failed: {e}")
            questions = []

        topics: Dict[str, Dict[str, Any]] = {}
        for q in questions:
            name = (q.get("topic") or q.get("section_title") or "general").strip()
            key = name.lower()
            entry = topics.setdefault(key, {
                "topic": name,
                "frequency": 0,
                "years": set(),
                "hard_count": 0,
                "bloom_weight": 0,
                "marks_total": 0,
                "sample_questions": [],
            })
            entry["frequency"] += 1
            if q.get("year"):
                entry["years"].add(str(q["year"]))
            if q.get("difficulty") == "hard":
                entry["hard_count"] += 1
            entry["bloom_weight"] += BLOOM_WEIGHT.get(str(q.get("bloom_level", "")).lower(), 2)
            try:
                entry["marks_total"] += float(q.get("marks") or 0)
            except (TypeError, ValueError):
                pass
            if len(entry["sample_questions"]) < 3:
                entry["sample_questions"].append(q.get("question", "")[:200])

        ranked = []
        for entry in topics.values():
            freq = entry["frequency"]
            ranked.append({
                "topic": entry["topic"],
                "frequency": freq,
                "years": sorted(entry["years"]),
                "hard_count": entry["hard_count"],
                "avg_bloom": round(entry["bloom_weight"] / freq, 2) if freq else 0,
                "avg_marks": round(entry["marks_total"] / freq, 2) if freq else 0,
                "sample_questions": entry["sample_questions"],
            })
        ranked.sort(key=lambda t: (-t["frequency"], -t["hard_count"], -len(t["years"]), -t["avg_marks"]))

        # Preview: the questions most worth practising - frequent topic first,
        # then harder, then higher marks.
        freq_by_topic = {t["topic"].lower(): t["frequency"] for t in ranked}

        def _preview_key(q: Dict[str, Any]):
            topic = (q.get("topic") or q.get("section_title") or "general").lower()
            marks = q.get("marks") or 0
            try:
                marks = float(marks)
            except (TypeError, ValueError):
                marks = 0
            return (-freq_by_topic.get(topic, 0), -DIFFICULTY_WEIGHT.get(q.get("difficulty", "medium"), 2), -marks)

        preview = []
        seen_q = set()
        for q in sorted(questions, key=_preview_key):
            qid = q.get("question_id") or q.get("question", "")[:60]
            if qid in seen_q:
                continue
            seen_q.add(qid)
            topic = q.get("topic") or q.get("section_title") or "general"
            preview.append({
                "question": q.get("question", ""),
                "marks": q.get("marks"),
                "frequency": freq_by_topic.get(topic.lower(), 1),
                "difficulty": q.get("difficulty", "medium"),
                "topic": topic,
                "year": q.get("year"),
                "exam_name": q.get("exam_name"),
                "type": q.get("question_type_refined") or q.get("type"),
            })
            if len(preview) >= PREP_MAX_PREVIEW_QUESTIONS:
                break

        return {"question_count": len(questions), "topics": ranked, "preview": preview}

    def _searx_client(self):
        if self._searx is None:
            from web_tools import SearXNGClient
            self._searx = SearXNGClient()
        return self._searx

    def _fetch_web_content(
        self, subject: str, unit_title: str, family: str,
        class_number: Optional[str] = None, board: Optional[str] = None,
        topic_hints: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Supplementary web material, only when the question bank is sparse.

        SearXNG first; the client falls back to Wikipedia on its own. Every
        result is labelled "source": "web".
        """
        topic = unit_title or f"{subject} unit"
        results: List[Dict[str, Any]] = []
        try:
            client = self._searx_client()
            results.extend(client.search_educational_content(
                topic, subject=subject, grade=str(class_number or ""), top_k=4))
            results.extend(client.search_important_questions(
                topic, subject=subject, board=board or "", top_k=3))
            # Not for the generic "science" family: a biology or (mislabelled)
            # geography unit turns "formulas theorems laws" into Newton's laws.
            if family in ("mathematics", "physics", "chemistry"):
                results.extend(client.search_formulas_theorems(topic, subject=subject, top_k=3))
            for hint in (topic_hints or [])[:2]:
                results.extend(client.search_educational_content(
                    hint, subject=subject, grade=str(class_number or ""), top_k=2))
        except Exception as e:
            logger.warning(f"[ExamPrep] Web search failed: {e}")

        deduped: List[Dict[str, Any]] = []
        seen = set()
        for r in results:
            key = r.get("url") or r.get("title", "").lower()
            if not key or key in seen or not (r.get("snippet") or "").strip():
                continue
            seen.add(key)
            r["source"] = "web"
            deduped.append(r)
            if len(deduped) >= PREP_MAX_WEB_RESULTS:
                break
        return deduped

    # ── Ranking & extraction ──────────────────────────────────────────────────

    @staticmethod
    def _rank_topics_by_priority(
        topics: List[Dict[str, Any]],
        weak_sections: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """Weak sections first, then exam frequency, then difficulty.

        Pure and idempotent: called at build time with no weak sections (the
        impersonal cached order) and again per request with the student's
        weak sections. Re-numbers `priority` from 1.
        """
        weak_scores: Dict[str, float] = {}
        for ws in weak_sections or []:
            title = (ws.get("section_title") or "").strip()
            if title and title.lower() != "general":
                weak_scores[title] = float(ws.get("weakness_score", 0.5))

        def _weakness(topic: Dict[str, Any]) -> float:
            name = topic.get("topic", "")
            best = 0.0
            for title, score in weak_scores.items():
                if topics_match(name, title):
                    best = max(best, score)
            return best

        def _key(topic: Dict[str, Any]):
            return (
                -_weakness(topic),
                -int(topic.get("frequency") or 0),
                -int(topic.get("hard_count") or 0),
                -float(topic.get("avg_bloom") or 0),
            )

        ranked = sorted(topics, key=_key)
        out = []
        for i, t in enumerate(ranked, 1):
            item = dict(t)
            item["priority"] = i
            w = _weakness(t)
            if w > 0:
                item["weakness_score"] = round(w, 3)
            out.append(item)
        return out

    @staticmethod
    def _clean_list(values: Any, cap: int = PREP_MAX_ITEMS_PER_KEY) -> List[str]:
        out: List[str] = []
        seen = set()
        if isinstance(values, str):
            values = [values]
        for v in values or []:
            if isinstance(v, dict):
                # {"name": ..., "formula": ...} shapes: flatten to "name: formula"
                parts = [str(x).strip() for x in v.values() if isinstance(x, (str, int, float)) and str(x).strip()]
                v = ": ".join(parts[:2])
            s = str(v).strip()
            if not s or s.lower() in seen:
                continue
            seen.add(s.lower())
            out.append(s)
            if len(out) >= cap:
                break
        return out

    def _extract_subject_specifics(
        self, family: str, llm_specifics: Optional[Dict[str, Any]],
        rag_chunks: List[Dict[str, Any]],
    ) -> Dict[str, List[str]]:
        """Normalise the LLM's subject_specifics to the fixed key set.

        Without an LLM answer, a light heuristic pass over the textbook
        chunks fills the family's focus keys so the guide is never empty.
        """
        specifics: Dict[str, List[str]] = {k: [] for k in SUBJECT_SPECIFIC_KEYS}
        if isinstance(llm_specifics, dict):
            for key, values in llm_specifics.items():
                k = str(key).strip().lower()
                if k in specifics:
                    specifics[k] = self._clean_list(values)

        if any(specifics.values()):
            return specifics

        focus, _ = subject_focus(family)
        text = "\n".join(c.get("text", "") for c in rag_chunks)
        sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
        formulas, definitions, dates, laws = [], [], [], []
        for s in sentences:
            s = s.strip()
            if not s or len(s) > 220:
                continue
            # A definition may well contain "=" ("...is defined as ax² + bx + c = 0"),
            # so the wording test runs before the formula test.
            if re.search(r"\b(is defined as|is called|refers to|is known as|means)\b", s, re.I):
                definitions.append(s)
            elif "=" in s and re.search(r"[a-zA-Z]", s) and len(s) < 120:
                formulas.append(s)
            elif re.search(r"\b(law|principle|theorem)\b", s, re.I):
                laws.append(s)
            if re.search(r"\b(1[0-9]{3}|20[0-2][0-9])\b", s) and "key_dates" in focus:
                dates.append(s)
        if "formulas" in focus:
            specifics["formulas"] = self._clean_list(formulas)
        if "definitions" in focus:
            specifics["definitions"] = self._clean_list(definitions)
        if "laws" in focus or "theorems" in focus:
            specifics["laws" if "laws" in focus else "theorems"] = self._clean_list(laws)
        if "key_dates" in focus:
            specifics["key_dates"] = self._clean_list(dates)
        return specifics

    # ── LLM ───────────────────────────────────────────────────────────────────

    def _llm_json(self, system_prompt: str, user_prompt: str, *, max_tokens: int,
                  trace_name: str) -> Optional[Dict[str, Any]]:
        """One JSON-mode completion through avatar_llm. None on any failure."""
        result = avatar_llm.chat(
            EXAM_MODEL,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=max_tokens,
            force_json=True,
            timeout=EXAM_LLM_TIMEOUT,
            fallback_model=EXAM_FALLBACK_MODEL,
            trace_name=trace_name,
        )
        if not result.ok:
            logger.warning(f"[ExamPrep] LLM call failed ({EXAM_MODEL}): {(result.error or '')[:300]}")
            return None
        parsed = avatar_llm.parse_json(result.text)
        if parsed is None:
            logger.warning(f"[ExamPrep] LLM returned unparseable JSON ({len(result.text)} chars)")
        return parsed

    def _compose_study_guide_with_llm(
        self, subject: str, family: str, unit_number: int, unit_title: str,
        class_number: Optional[str], rag_chunks: List[Dict[str, Any]],
        qb_stats: Dict[str, Any], web_results: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """Ask the model to structure everything into topics + takeaways + specifics."""
        focus, guidance = subject_focus(family)

        context_parts = []
        for c in rag_chunks:
            header = f"[{c.get('section_title') or 'Section'}]"
            context_parts.append(f"{header}\n{c['text']}")
        rag_text = "\n---\n".join(context_parts)[:PREP_RAG_CHARS] or "(no textbook context retrieved)"

        qb_lines = []
        for t in qb_stats.get("topics", [])[:15]:
            years = ", ".join(t["years"]) if t["years"] else "n/a"
            qb_lines.append(
                f"- {t['topic']}: asked {t['frequency']}x (years: {years}), hard questions: {t['hard_count']}, "
                f"avg marks: {t['avg_marks']}. e.g. \"{t['sample_questions'][0] if t['sample_questions'] else ''}\""
            )
        qb_text = "\n".join(qb_lines) or "(no past-paper questions for this unit)"

        web_text = ""
        if web_results:
            web_lines = [f"- {r.get('title', '')}: {r.get('snippet', '')[:400]}" for r in web_results]
            web_text = "\n".join(web_lines)[:PREP_WEB_CHARS]

        system_prompt = (
            "You are an expert exam coach who turns a textbook unit and past-paper statistics "
            "into a compact, high-yield study guide. You answer ONLY with a JSON object."
        )
        user_prompt = f"""Subject: {subject} (family: {family})
Class: {class_number or 'unspecified'}
Unit {unit_number}: {unit_title or '(title unknown - infer it from the context)'}

=== TEXTBOOK CONTEXT (primary source - every takeaway must be grounded here) ===
{rag_text}

=== PAST-PAPER STATISTICS (which topics examiners actually ask) ===
{qb_text}
{f'''
=== SUPPLEMENTARY WEB NOTES (secondary - use only for topics the textbook context is thin on) ===
{web_text}''' if web_text else ''}

Subject-specific extraction for this family: {guidance}
Fill these subject_specifics keys: {', '.join(focus)}. Leave the other keys as empty lists.

Return JSON with EXACTLY this shape:
{{
  "unit_title": "<the unit's title>",
  "priority_topics": [
    {{
      "topic": "<topic name, matching the past-paper topic names where they exist>",
      "why_important": "<one line: asked N times / carries 5 marks / foundation for X>",
      "key_takeaways": ["<crisp bullet a student can revise from>", "..."]
    }}
  ],
  "subject_specifics": {{
    {', '.join(f'"{k}": []' for k in SUBJECT_SPECIFIC_KEYS)}
  }}
}}

Rules:
- 5 to {PREP_MAX_TOPICS} topics, MOST important first. Every past-paper topic above must appear.
- 3 to 6 key_takeaways per topic. Each is a complete, self-contained revision point
  (a definition, a formula, a step, a date, a comparison) - never a heading or a question.
- Prefer exact textbook wording for definitions and formulas.
- Do not invent facts that are in neither the textbook context nor the web notes.
"""
        return self._llm_json(system_prompt, user_prompt, max_tokens=4000, trace_name="exam-prep-study-guide")

    def _heuristic_topics(
        self, qb_stats: Dict[str, Any], rag_chunks: List[Dict[str, Any]],
        web_results: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Topics without an LLM: past-paper topics, then textbook sections, then web titles."""
        topics: List[Dict[str, Any]] = []
        for t in qb_stats.get("topics", [])[:PREP_MAX_TOPICS]:
            topics.append({
                "topic": t["topic"],
                "why_important": f"Asked {t['frequency']} time(s) in past papers",
                "key_takeaways": [q for q in t["sample_questions"] if q],
            })
        if len(topics) < PREP_MAX_TOPICS:
            seen = {t["topic"].lower() for t in topics}
            for c in rag_chunks:
                title = (c.get("section_title") or "").strip()
                if not title or title.lower() in seen:
                    continue
                seen.add(title.lower())
                first = re.split(r"(?<=[.!?])\s+", c.get("text", ""))[:3]
                topics.append({
                    "topic": title,
                    "why_important": "Textbook section for this unit",
                    "key_takeaways": [s.strip() for s in first if s.strip()],
                })
                if len(topics) >= PREP_MAX_TOPICS:
                    break
        if len(topics) < PREP_MAX_TOPICS:
            for r in web_results:
                topics.append({
                    "topic": r.get("title", "")[:80],
                    "why_important": "Supplementary web material",
                    "key_takeaways": [r.get("snippet", "")[:300]],
                })
                if len(topics) >= PREP_MAX_TOPICS:
                    break
        return topics

    # ── Assembly ──────────────────────────────────────────────────────────────

    def _label_topics(
        self, topics: List[Dict[str, Any]], qb_stats: Dict[str, Any],
        web_results: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Attach source / frequency / hard_count to each topic from the QB stats.

        A topic the bank knows is "question_bank"; one that only the web notes
        mention is "web"; anything else came from the textbook.
        """
        qb_topics = qb_stats.get("topics", [])
        labelled = []
        for t in topics:
            name = str(t.get("topic", "")).strip()
            if not name:
                continue
            item = {
                "topic": name,
                "source": "textbook",
                "frequency": 0,
                "hard_count": 0,
                "avg_bloom": 0,
                "years": [],
                "why_important": str(t.get("why_important", "")).strip(),
                "key_takeaways": self._clean_list(t.get("key_takeaways"), cap=8),
            }
            for qt in qb_topics:
                if topics_match(name, qt["topic"]):
                    item.update({
                        "source": "question_bank",
                        "frequency": qt["frequency"],
                        "hard_count": qt["hard_count"],
                        "avg_bloom": qt["avg_bloom"],
                        "years": qt["years"],
                    })
                    break
            else:
                for r in web_results:
                    if topics_match(name, r.get("title", "")):
                        item["source"] = "web"
                        break
            labelled.append(item)
        return labelled

    def _build_and_cache_study_guide(
        self, subject: str, unit_number: int, document_id: str,
        board: Optional[str], class_number: Optional[str], term: Optional[Any],
        unit_title_hint: str = "", part: Optional[str] = None,
        qb_document_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        family = detect_subject_family(subject)
        qb_ids = qb_document_ids or [document_id]

        qb_stats = self._fetch_qb_important_topics(qb_ids, unit_number, term)
        topic_hints = [t["topic"] for t in qb_stats["topics"][:4]]
        unit_title, rag_chunks = self._fetch_rag_concepts(
            subject, unit_number, board=board, class_number=class_number,
            term=term, topic_hints=topic_hints, part=part,
        )
        unit_title = unit_title or unit_title_hint

        web_results: List[Dict[str, Any]] = []
        qb_sparse = qb_stats["question_count"] < QB_SPARSE_THRESHOLD
        if qb_sparse:
            logger.info(f"[ExamPrep] Question bank sparse for unit {unit_number} "
                        f"({qb_stats['question_count']} < {QB_SPARSE_THRESHOLD}) - adding web content")
            web_results = self._fetch_web_content(
                subject, unit_title, family, class_number=class_number,
                board=board, topic_hints=topic_hints,
            )

        llm_out = self._compose_study_guide_with_llm(
            subject, family, unit_number, unit_title, class_number,
            rag_chunks, qb_stats, web_results,
        )
        used_llm = bool(llm_out and isinstance(llm_out.get("priority_topics"), list) and llm_out["priority_topics"])

        if used_llm:
            raw_topics = llm_out["priority_topics"]
            unit_title = unit_title or str(llm_out.get("unit_title") or "").strip()
            specifics = self._extract_subject_specifics(family, llm_out.get("subject_specifics"), rag_chunks)
        else:
            raw_topics = self._heuristic_topics(qb_stats, rag_chunks, web_results)
            specifics = self._extract_subject_specifics(family, None, rag_chunks)

        labelled = self._label_topics(raw_topics, qb_stats, web_results)[:PREP_MAX_TOPICS]
        ranked = self._rank_topics_by_priority(labelled)

        guide = {
            "prep_id": self._prep_id(subject, unit_number, document_id, term, part),
            "subject": subject,
            "subject_family": family,
            "part": part,
            "unit_number": unit_number,
            "unit_title": unit_title,
            "document_id": document_id,
            "board": board,
            "class_number": class_number,
            "term": term,
            "generated_once": True,
            "qb_document_ids": qb_ids,
            "qb_fingerprint": self._qb_fingerprint(qb_ids, unit_number, term),
            "priority_topics": ranked,
            "subject_specifics": specifics,
            "important_questions_preview": qb_stats["preview"],
            "web_content": web_results,
            "sources": {
                "question_bank_questions": qb_stats["question_count"],
                "question_bank_sparse": qb_sparse,
                "textbook_chunks": len(rag_chunks),
                "web_results": len(web_results),
                "llm_model": EXAM_MODEL if used_llm else None,
                "composed_by": "llm" if used_llm else "heuristic",
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._save_json(self._prep_path(subject, unit_number, document_id, term, part), guide)
        logger.info(f"[ExamPrep] Study guide built for {subject} unit {unit_number} "
                    f"({len(ranked)} topics, {guide['sources']['composed_by']})")
        return guide

    # ── Public API ────────────────────────────────────────────────────────────

    @with_student_context(trace_name="exam-prepare")
    def get_study_guide(
        self,
        candidate_id: str,
        subject: str,
        unit_number: int,
        document_id: str,
        board: Optional[str] = None,
        class_number: Optional[str] = None,
        term: Optional[Any] = None,
        unit_title: str = "",
        force_regenerate: bool = False,
        part: Optional[str] = None,
        qb_document_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """The study guide for a unit, personalised for this student.

        The guide is generated once per unit and cached; only the topic order
        is student-specific (their weak sections float to the top), which is
        computed here from StudentPerformanceTracker without an LLM call.

        `part` names the book inside a multi-book subject ("Contemporary
        India" under Social); it scopes the textbook retrieval and the cache.
        `qb_document_ids` are the ids to read the question bank under (the
        Qdrant document id plus the logical `qb_pdf_...*` prefix); it
        defaults to `[document_id]`.
        """
        guide = None if force_regenerate else self._is_cached(
            subject, unit_number, document_id, term, part, qb_document_ids=qb_document_ids,
        )
        from_cache = guide is not None
        if guide is None:
            guide = self._build_and_cache_study_guide(
                subject, unit_number, document_id, board, class_number, term,
                unit_title_hint=unit_title, part=part, qb_document_ids=qb_document_ids,
            )

        weak_sections: List[Dict[str, Any]] = []
        try:
            from student_performance import get_performance_tracker
            weak_sections = [
                ws for ws in get_performance_tracker().get_weak_sections(candidate_id, subject, unit_number)
                if ws.get("weakness_score", 0) > 0.4
            ]
        except Exception as e:
            logger.warning(f"[ExamPrep] Could not load weak sections: {e}")

        personalised = dict(guide)
        personalised["priority_topics"] = self._rank_topics_by_priority(
            guide.get("priority_topics", []), weak_sections,
        )
        personalised["from_cache"] = from_cache
        personalised["personalized"] = {
            "candidate_id": candidate_id,
            "weak_sections_used": [ws.get("section_title") for ws in weak_sections][:10],
        }
        return personalised

    def get_prep_session(
        self,
        prep_id: Optional[str] = None,
        subject: Optional[str] = None,
        unit_number: Optional[int] = None,
        document_id: Optional[str] = None,
        term: Optional[Any] = None,
        part: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Load a cached guide by prep_id, or by (subject, part, unit, document, term)."""
        if subject and unit_number is not None and document_id:
            return self._is_cached(subject, unit_number, document_id, term, part)
        if prep_id:
            for path in self.data_dir.glob("prep__*.json"):
                guide = self._load_json(path)
                if guide and guide.get("prep_id") == prep_id:
                    return guide
        return None

    def list_prep_sessions(self, subject: Optional[str] = None,
                           document_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Summaries of every cached guide, optionally filtered."""
        out = []
        for path in sorted(self.data_dir.glob("prep__*.json")):
            guide = self._load_json(path)
            if not guide:
                continue
            if subject and self._slug(guide.get("subject")) != self._slug(subject):
                continue
            if document_id and guide.get("document_id") != document_id:
                continue
            out.append({
                "prep_id": guide.get("prep_id"),
                "subject": guide.get("subject"),
                "part": guide.get("part"),
                "unit_number": guide.get("unit_number"),
                "unit_title": guide.get("unit_title"),
                "document_id": guide.get("document_id"),
                "term": guide.get("term"),
                "topics": len(guide.get("priority_topics", [])),
                "created_at": guide.get("created_at"),
            })
        return out


# ── Global singleton ──────────────────────────────────────────────────────────

_prep_engine: Optional[ExamPrepEngine] = None


def get_exam_prep_engine() -> ExamPrepEngine:
    global _prep_engine
    if _prep_engine is None:
        _prep_engine = ExamPrepEngine()
    return _prep_engine
