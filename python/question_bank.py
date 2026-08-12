"""
Question Bank Manager for GradeUp AI Tutor

Features:
- Admin uploads question papers with year & exam metadata
- RAG pipeline scores difficulty of each question (easy/medium/hard)
- LLM extracts features: topic, Bloom's level, question type
- Stores processed questions as JSON in question_bank/ directory
"""

import os
import json
import hashlib
import time
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import requests

QUESTION_BANK_DIR = Path("question_bank")

# Bloom's taxonomy levels for difficulty mapping
BLOOM_LEVELS = {
    "remember": "easy",
    "understand": "easy",
    "apply": "medium",
    "analyze": "medium",
    "evaluate": "hard",
    "create": "hard",
}


class QuestionBankManager:
    """
    Manages question papers uploaded by admins.
    Each question is scored for difficulty using LLM + RAG context.
    """

    def __init__(self, data_dir: Path = QUESTION_BANK_DIR):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _paper_path(self, document_id: str, year: str, exam_name: str) -> Path:
        safe_exam = exam_name.strip().lower().replace(" ", "_")
        return self.data_dir / f"{document_id}__{year}__{safe_exam}.json"

    def _question_id(self, question_text: str) -> str:
        """Generate a deterministic ID for a question."""
        return hashlib.md5(question_text.strip().lower().encode()).hexdigest()[:12]

    def _load_paper(self, path: Path) -> Dict[str, Any]:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return None

    def _save_paper(self, path: Path, data: Dict[str, Any]) -> None:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _get_available_units(
        self,
        subject: str,
        terms: Optional[List[str]] = None,
        board: Optional[str] = None,
        class_number: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Discover the (term, unit_number, unit_title) triples available in the vector DB.

        Unit numbers restart in every term book, so a unit number alone does not
        identify a unit — the term is part of the key. `terms` restricts
        discovery to the exam's scope so an LLM scoring a half-yearly paper is
        never offered Term I or Term III units.
        """
        try:
            from qdrant_integration import initialize_qdrant_client, DEFAULT_COLLECTION_NAME
            import os
            from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny

            client = initialize_qdrant_client()
            if not client:
                return []

            collection = os.environ.get("QDRANT_COLLECTION_NAME", DEFAULT_COLLECTION_NAME)

            # Using native Qdrant scroll to get all payloads matching the subject
            # This avoids semantic similarity clustering dropping obscure units
            conditions = [
                Filter(should=[
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject)),
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject.lower())),
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject.capitalize())),
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject.title())),
                    FieldCondition(key="metadata.subject", match=MatchValue(value=subject.upper())),
                ])
            ]
            if board:
                conditions.append(
                    Filter(should=[
                        FieldCondition(key="metadata.board", match=MatchValue(value=board)),
                        FieldCondition(key="metadata.board", match=MatchValue(value=board.lower())),
                        FieldCondition(key="metadata.board", match=MatchValue(value=board.upper())),
                        FieldCondition(key="metadata.board", match=MatchValue(value=board.title())),
                    ])
                )
            if class_number:
                c_num = str(class_number).replace("Class ", "").replace("class ", "").strip()
                conditions.append(
                    Filter(should=[
                        FieldCondition(key="metadata.class_number", match=MatchValue(value=str(class_number))),
                        FieldCondition(key="metadata.class_number", match=MatchValue(value=f"Class {c_num}")),
                        FieldCondition(key="metadata.class_number", match=MatchValue(value=c_num)),
                    ])
                )
            if terms:
                conditions.append(
                    FieldCondition(key="metadata.term", match=MatchAny(any=list(terms)))
                )

            qdrant_filter = Filter(must=conditions)

            units_map = {}
            offset = None

            while True:
                records, next_offset = client.scroll(
                    collection_name=collection,
                    scroll_filter=qdrant_filter,
                    limit=200,
                    with_payload=True,
                    with_vectors=False,
                    offset=offset
                )

                for record in records:
                    meta = record.payload.get("metadata", {})
                    un = meta.get("unit_number")
                    ut = meta.get("unit_title", "")
                    tm = meta.get("term")
                    if un is None:
                        continue
                    key = (tm, un)
                    if key not in units_map:
                        units_map[key] = ut

                if next_offset is None:
                    break
                offset = next_offset

            # Sort by term then unit number (term=None sorts first)
            return sorted(
                [{"term": k[0], "unit_number": k[1], "unit_title": v}
                 for k, v in units_map.items()],
                key=lambda x: (x["term"] or "", x["unit_number"])
            )
        except Exception as e:
            print(f"  ⚠️  [QuestionBank] Unit discovery failed: {e}")
        return []

    def _get_rag_context(self, question: str, subject: str, unit_number: Optional[int] = None,
                         limit: int = 3, terms: Optional[List[str]] = None,
                         board: Optional[str] = None, class_number: Optional[str] = None) -> str:
        """Retrieve relevant textbook context from Qdrant for difficulty assessment."""
        try:
            from qdrant_integration import search_qdrant
            from term_utils import term_label
            results = search_qdrant(
                query=question,
                limit=limit,
                unit_filter=unit_number,
                subject_filter=subject,
                board_filter=board,
                class_filter=class_number,
                term_filter=terms,
            )
            if results:
                context_parts = []
                for r in results:
                    meta = r.get("metadata", {})
                    unit_num = meta.get("unit_number", "?")
                    unit_title = meta.get("unit_title", "")
                    section = meta.get("section_title", "")
                    text = r.get("text", "")[:500]
                    # The term goes in the header because the LLM maps questions
                    # to units by reading these headers — without it, unit 1 of
                    # two term books is indistinguishable in the context.
                    tm = term_label(meta.get("term"))
                    header = ("[" + (f"{tm} | " if tm else "")
                              + f"Unit {unit_num}: {unit_title}"
                              + (f" | Section: {section}" if section else "") + "]")
                    context_parts.append(f"{header}\n{text}")
                return "\n---\n".join(context_parts)
        except Exception as e:
            print(f"  ⚠️  [QuestionBank] RAG retrieval failed: {e}")
        return ""

    def _score_difficulty_with_llm(
        self,
        questions: List[Dict[str, Any]],
        subject: str,
        unit_number: Optional[int],
        rag_context: str,
        start_idx: int = 1,
        terms: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Use LLM to score difficulty and extract features for each question.

        Returns enhanced questions with: difficulty, bloom_level, topic, question_type

        When the exam spans MORE THAN ONE term the model must also say which term
        each question belongs to, because a unit number alone is ambiguous. For a
        single-term exam the term is already known and is not asked for at all.
        """
        api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            # Fallback: use simple heuristic scoring
            return self._heuristic_scoring(questions, start_idx=start_idx, terms=terms)

        # Build the prompt with all questions
        questions_text = ""
        for i, q in enumerate(questions, start_idx):
            q_text = q.get("question", "")
            q_type = q.get("type", "unknown")
            q_marks = q.get("marks", "N/A")
            options = q.get("options", [])
            options_str = f"\n  Options: {', '.join(options)}" if options else ""
            questions_text += f"\n{i}. [{q_type}, {q_marks} marks] {q_text}{options_str}"

        from term_utils import term_label

        scope = list(terms or [])
        multi_term = len(scope) > 1
        scope_labels = ", ".join(term_label(t) for t in scope)

        if multi_term:
            term_header = (
                f"This exam spans MULTIPLE TERMS ({scope_labels}). Unit numbers RESTART in "
                f"each term, so a unit number ALONE is ambiguous — you MUST report BOTH the "
                f"term and the unit_number for every question."
            )
            term_field = '\n    "term": "<one of: ' + " | ".join(scope) + '>",'
            term_rules = (
                f"\n- CRITICAL: `term` MUST be one of {scope} and the (term, unit_number) pair "
                f"MUST appear in the available-units list above. Unit 1 of {scope[0]} is a "
                f"DIFFERENT unit from unit 1 of {scope[1]} — read the [Term N | Unit X: ...] "
                f"headers in the context to tell them apart."
            )
        elif scope:
            term_header = (
                f"Every question in this exam belongs to {scope_labels}; the units listed "
                f"below are already restricted to it. Do not report a term."
            )
            term_field = ""
            term_rules = ""
        else:
            term_header = ""
            term_field = ""
            term_rules = ""

        prompt = f"""You are an expert educational assessment specialist.
Analyze each question and provide difficulty scoring based on Bloom's Taxonomy.

Subject: {subject}
{f"Unit: {unit_number}" if unit_number else "This is a FULL EXAM paper covering MULTIPLE units. You MUST identify which unit each question belongs to."}
{term_header}

=== AVAILABLE UNITS IN THIS TEXTBOOK ===
{self._available_units_text}

=== IMPORTANT: The above list is the COMPLETE set of units available for this exam. ===
=== You MUST ONLY use unit_number values from this list. Do NOT invent unit numbers outside this range. ===

Relevant textbook context (use the [Term N | Unit X: Title | Section: ...] headers to determine which unit each question maps to):
{rag_context[:20000] if rag_context else "(No context available)"}

Questions to analyze:
{questions_text}

For EACH question, respond in valid JSON array format:
[
  {{
    "question_index": {start_idx},
    "unit_number": <integer — MUST be one of the unit numbers listed above>,{term_field}
    "section_title": "Section Title from the textbook context",
    "difficulty": "easy|medium|hard",
    "bloom_level": "remember|understand|apply|analyze|evaluate|create",
    "topic": "main topic/concept tested",
    "related_sections": ["section names from textbook"],
    "question_type_refined": "mcq|short_answer|long_answer|numerical|diagram|compare_contrast|fill_in_the_blanks",
    "cognitive_demand": "low|medium|high",
    "estimated_time_minutes": 2
  }}
]

Rules:
- CRITICAL: The `unit_number` MUST be one of: {self._valid_unit_numbers}. Do NOT use any number outside this set.{term_rules}
- Identify the correct `unit_number` by matching the question topic to the textbook context headers. Use the context to determine the best match.
- If a question could belong to multiple units, pick the MOST SPECIFIC match based on the retrieved context.
- MCQs testing recall = easy, MCQs requiring analysis = medium
- Short answers (2-3 marks) requiring definitions = easy, explanations = medium
- Long answers (5+ marks) requiring critical thinking = hard
- Questions involving multiple concepts or real-world application = hard
- Return ONLY the JSON array, no other text.
- Ensure all property names and string values use double quotes.
- Do not include any trailing commas.
- Do not wrap the JSON in markdown code blocks.
"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_completion_tokens": 8000,
            "temperature": 0.2,
        }

        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=120,
            )
            if resp.ok:
                content = resp.json()["choices"][0]["message"]["content"].strip()
                scored = self._parse_json_safe(content)
                if scored:
                    return scored
            else:
                print(f"  ⚠️  [QuestionBank] LLM scoring failed: {resp.status_code}")
        except Exception as e:
            print(f"  ⚠️  [QuestionBank] LLM scoring error: {e}")

        return self._heuristic_scoring(questions, start_idx=start_idx, terms=terms)

    def _parse_json_safe(self, raw: str) -> Optional[Any]:
        """
        Parse JSON from LLM output aggressively finding the array.
        """
        # Find exactly the bounds of the JSON array
        start = raw.find('[')
        end = raw.rfind(']')
        
        if start != -1 and end != -1 and end > start:
            cleaned = raw[start:end+1]
            try:
                return json.loads(cleaned)
            except Exception:
                pass

        # Try direct parse as fallback
        try:
            cleaned = re.sub(r'^```[a-z]*\n?', '', raw.strip())
            cleaned = re.sub(r'\n?```$', '', cleaned).strip()
            return json.loads(cleaned)
        except Exception:
            pass
            
        return None

    def _heuristic_scoring(self, questions: List[Dict[str, Any]], start_idx: int = 1,
                           terms: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Fallback heuristic-based difficulty scoring.

        Inherits the term only when the exam scope is a single term — with a
        multi-term scope there is no signal here to pick between them, so the
        term is left unset rather than guessed.
        """
        sole_term = terms[0] if terms and len(terms) == 1 else None
        scored = []
        for i, q in enumerate(questions, start_idx):
            marks = q.get("marks", 2)
            q_type = q.get("type", "").lower()
            q_text = q.get("question", "").lower()

            # Heuristic rules
            if q_type == "mcq" or marks <= 1:
                difficulty = "easy"
                bloom = "remember"
            elif marks <= 3:
                difficulty = "medium" if any(w in q_text for w in ["explain", "describe", "why", "how"]) else "easy"
                bloom = "understand" if difficulty == "medium" else "remember"
            else:
                difficulty = "hard" if any(w in q_text for w in ["discuss", "analyze", "evaluate", "compare", "critically"]) else "medium"
                bloom = "analyze" if difficulty == "hard" else "apply"

            scored.append({
                "question_index": i,
                "difficulty": difficulty,
                "bloom_level": bloom,
                "term": sole_term,
                "topic": "general",
                "related_sections": [],
                "question_type_refined": q_type or "unknown",
                "cognitive_demand": "low" if difficulty == "easy" else ("medium" if difficulty == "medium" else "high"),
                "estimated_time_minutes": marks * 2,
            })
        return scored

    # ── Public API ────────────────────────────────────────────────────────────

    def process_question_paper(
        self,
        questions: List[Dict[str, Any]],
        year: str,
        exam_name: str,
        subject: str,
        unit_number: Optional[int],
        document_id: str,
        terms: Optional[List[str]] = None,
        board: Optional[str] = None,
        class_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process a question paper: score difficulty, extract features.

        Args:
            questions: [{"question": "...", "marks": 5, "type": "long_answer", "options": [...]}]
            year: "2025"
            exam_name: "Mid-Term"
            subject: "biology"
            unit_number: 4
            document_id: "kegy304"
            terms: term scope the exam covers, from term_utils.exam_to_terms().
                   A paper is scoped to a LIST of terms; each question then gets
                   a single derived term.

        Returns: processed paper with scored questions
        """
        from term_utils import normalize_term, term_label

        terms = [t for t in (terms or []) if t]

        # Discover available units from vector DB to constrain LLM. Scoped to the
        # exam's terms so out-of-syllabus units are never offered as candidates.
        available_units = self._get_available_units(
            subject, terms=terms, board=board, class_number=class_number
        )
        if available_units:
            self._available_units_text = "\n".join(
                ("  " + (f"{term_label(u['term'])} | " if u.get("term") else "")
                 + f"Unit {u['unit_number']}: {u['unit_title']}")
                for u in available_units
            )
            self._valid_unit_numbers = sorted({u["unit_number"] for u in available_units})
            print(f"  📚  [QuestionBank] Found {len(available_units)} units "
                  f"(terms={terms or 'any'}): {self._valid_unit_numbers}")
        else:
            self._available_units_text = "(No unit information available)"
            self._valid_unit_numbers = []
            print(f"  ⚠️  [QuestionBank] No units discovered from vector DB")

        # unit_number -> the terms it exists in, within this exam's scope.
        # Drives the reverse mapping that gives each question its own term.
        unit_to_terms: Dict[int, List[str]] = {}
        for u in available_units:
            if u.get("term"):
                unit_to_terms.setdefault(u["unit_number"], [])
                if u["term"] not in unit_to_terms[u["unit_number"]]:
                    unit_to_terms[u["unit_number"]].append(u["term"])

        sole_term = terms[0] if len(terms) == 1 else None

        def _resolve_term(item: Dict[str, Any]) -> Optional[str]:
            """Derive one term for a scored question.

            1. Single-term exam -> that term, no ambiguity to resolve.
            2. Otherwise trust the model's `term` when it is inside the scope.
            3. Otherwise fall back to the unit's term when that unit exists in
               exactly one term of the scope.
            4. Otherwise unknown — left None rather than guessed.
            """
            if sole_term:
                return sole_term
            llm_term = normalize_term(item.get("term"))
            if llm_term and (not terms or llm_term in terms):
                return llm_term
            candidates = unit_to_terms.get(item.get("unit_number"), [])
            if len(candidates) == 1:
                return candidates[0]
            return None

        # Process in batches to ensure accurate context and avoiding token limits
        scored_questions = []
        batch_size = 10
        for i in range(0, len(questions), batch_size):
            batch = questions[i:i+batch_size]
            
            # Get RAG context per question in this batch
            context_parts = []
            for j, q in enumerate(batch):
                real_idx = i + j + 1
                q_text = q.get("question", "")
                q_ctx = self._get_rag_context(
                    q_text, subject, unit_number, limit=3,
                    terms=terms, board=board, class_number=class_number,
                )
                if q_ctx:
                    context_parts.append(f"--- Context for Question {real_idx} ---\n{q_ctx}")

            rag_context = "\n".join(context_parts)

            # Score this batch
            batch_scored = self._score_difficulty_with_llm(
                batch, subject, unit_number, rag_context, start_idx=i+1, terms=terms
            )

            # Post-process: clamp unit_numbers to valid range, then derive the term
            for item in batch_scored:
                if self._valid_unit_numbers:
                    un = item.get("unit_number")
                    if un not in self._valid_unit_numbers:
                        # Find closest valid unit number
                        closest = min(self._valid_unit_numbers, key=lambda x: abs(x - un) if isinstance(un, int) else 999)
                        print(f"  ⚠️  [QuestionBank] Clamped invalid unit {un} -> {closest} for Q{item.get('question_index')}")
                        item["unit_number"] = closest
                item["term"] = _resolve_term(item)

            scored_questions.extend(batch_scored)

        # Merge scored data back into questions
        processed_questions = []
        for i, q in enumerate(questions):
            q_id = self._question_id(q.get("question", ""))

            # Find corresponding scoring data
            scoring = {}
            for s in scored_questions:
                if s.get("question_index") == i + 1:
                    scoring = s
                    break

            processed_q = {
                "question_id": q_id,
                "question": q.get("question", ""),
                "marks": q.get("marks"),
                "type": q.get("type", "unknown"),
                "options": q.get("options", []),
                "correct_answer": q.get("correct_answer"),
                "is_choice_based": q.get("is_choice_based", False),
                "questions_to_attempt": q.get("questions_to_attempt", 1),
                # Scored features
                "unit_number": scoring.get("unit_number", unit_number),
                # Derived per question: one half-yearly upload can still carry
                # questions from more than one term when the scope spans terms.
                "term": scoring.get("term", sole_term),
                "section_title": scoring.get("section_title", "General"),
                "difficulty": scoring.get("difficulty", "medium"),
                "bloom_level": scoring.get("bloom_level", "understand"),
                "topic": scoring.get("topic", "general"),
                "related_sections": scoring.get("related_sections", []),
                "question_type_refined": scoring.get("question_type_refined", q.get("type", "unknown")),
                "cognitive_demand": scoring.get("cognitive_demand", "medium"),
                "estimated_time_minutes": scoring.get("estimated_time_minutes", 5),
            }
            processed_questions.append(processed_q)

        # Build paper document
        paper = {
            "document_id": document_id,
            "year": year,
            "exam_name": exam_name,
            "subject": subject,
            "unit_number": unit_number,
            "board": board,
            "class_number": class_number,
            # Paper-level scope (a list) vs per-question term (a single value).
            "term_scope": terms,
            "total_questions": len(processed_questions),
            "difficulty_distribution": {
                "easy": sum(1 for q in processed_questions if q["difficulty"] == "easy"),
                "medium": sum(1 for q in processed_questions if q["difficulty"] == "medium"),
                "hard": sum(1 for q in processed_questions if q["difficulty"] == "hard"),
            },
            "term_distribution": {
                (q.get("term") or "unknown"): sum(
                    1 for x in processed_questions if (x.get("term") or "unknown") == (q.get("term") or "unknown")
                )
                for q in processed_questions
            },
            "questions": processed_questions,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # Save
        path = self._paper_path(document_id, year, exam_name)
        self._save_paper(path, paper)

        return paper

    def get_questions(
        self,
        document_id: str,
        year: Optional[str] = None,
        difficulty: Optional[str] = None,
        unit_number: Optional[int] = None,
        term: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve questions with optional filters.

        `term` filters on the PER-QUESTION term, not the paper's scope — so a
        Term II revision session pulls only its own questions out of a paper
        that happened to span several terms.
        """
        from term_utils import normalize_term
        want_term = normalize_term(term)

        all_questions = []

        for path in self.data_dir.glob(f"{document_id}__*.json"):
            paper = self._load_paper(path)
            if not paper:
                continue

            # Apply filters
            if year and paper.get("year") != year:
                continue
            if unit_number is not None and paper.get("unit_number") != unit_number:
                continue
            # Skip papers whose scope cannot contain the requested term.
            scope = paper.get("term_scope") or []
            if want_term and scope and want_term not in scope:
                continue

            for q in paper.get("questions", []):
                if difficulty and q.get("difficulty") != difficulty:
                    continue
                if want_term:
                    q_term = normalize_term(q.get("term"))
                    # Only questions explicitly tagged with a DIFFERENT term are
                    # dropped. A term-less question is either from a legacy paper
                    # or one whose term could not be resolved (an ambiguous unit
                    # in a multi-term exam); it therefore shows up under every
                    # term rather than disappearing from the bank entirely.
                    # Favours recall over precision — deliberate for revision use.
                    if q_term and q_term != want_term:
                        continue

                q_with_meta = {
                    **q,
                    "year": paper.get("year"),
                    "exam_name": paper.get("exam_name"),
                    "subject": paper.get("subject"),
                    "unit_number": paper.get("unit_number"),
                    "term_scope": paper.get("term_scope"),
                }
                all_questions.append(q_with_meta)

        return all_questions

    def get_stats(self, document_id: str) -> Dict[str, Any]:
        """Get question bank statistics for a document."""
        stats = {
            "document_id": document_id,
            "total_papers": 0,
            "total_questions": 0,
            "by_difficulty": {"easy": 0, "medium": 0, "hard": 0},
            "by_year": {},
            "by_topic": {},
            "by_type": {},
            "by_term": {},
        }

        for path in self.data_dir.glob(f"{document_id}__*.json"):
            paper = self._load_paper(path)
            if not paper:
                continue

            stats["total_papers"] += 1
            year = paper.get("year", "unknown")
            stats["by_year"].setdefault(year, 0)

            for q in paper.get("questions", []):
                stats["total_questions"] += 1
                stats["by_year"][year] += 1

                diff = q.get("difficulty", "medium")
                stats["by_difficulty"][diff] = stats["by_difficulty"].get(diff, 0) + 1

                topic = q.get("topic", "general")
                stats["by_topic"][topic] = stats["by_topic"].get(topic, 0) + 1

                qtype = q.get("question_type_refined", "unknown")
                stats["by_type"][qtype] = stats["by_type"].get(qtype, 0) + 1

                qterm = q.get("term") or "unknown"
                stats["by_term"][qterm] = stats["by_term"].get(qterm, 0) + 1

        return stats

    def list_papers(self, document_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all question papers, optionally filtered by document."""
        papers = []
        pattern = f"{document_id}__*.json" if document_id else "*.json"

        for path in sorted(self.data_dir.glob(pattern)):
            paper = self._load_paper(path)
            if paper:
                papers.append({
                    "document_id": paper.get("document_id"),
                    "year": paper.get("year"),
                    "exam_name": paper.get("exam_name"),
                    "subject": paper.get("subject"),
                    "unit_number": paper.get("unit_number"),
                    "total_questions": paper.get("total_questions", 0),
                    "difficulty_distribution": paper.get("difficulty_distribution", {}),
                    "created_at": paper.get("created_at"),
                })
        return papers


# ── Global singleton ──────────────────────────────────────────────────────────

_qb_manager: Optional[QuestionBankManager] = None


def get_question_bank_manager() -> QuestionBankManager:
    global _qb_manager
    if _qb_manager is None:
        _qb_manager = QuestionBankManager()
    return _qb_manager
