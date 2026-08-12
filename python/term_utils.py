"""
Term handling for term-split state-board textbooks.

State boards (e.g. Tamil Nadu) ship a subject as several term books — Term I,
Term II, Term III — and each book RESTARTS its unit numbering. That makes
`unit_number` ambiguous on its own, so `term` is a required disambiguator
wherever a unit is filtered.

Two axes meet here:
  - content axis     — which term book a chunk came from  ("term_2")
  - assessment axis  — what an exam covers                ("half_yearly")

They are joined by EXAM_TERM_SCOPE: an exam maps to a *list* of terms, so
question papers are never tagged with a single term.

Canonicalize on write, normalize on read. Everything stored in Qdrant /
metadata.json uses the canonical `term_N` form, so filters can use one exact
match instead of the casing-variant fan-out used for board/subject.

Boards without term-split books (CBSE/NCERT) carry term=None and keep working
unchanged — every term parameter in the stack is optional.
"""

import os
import json
import re
from typing import Any, Dict, List, Optional, Union

CANONICAL_TERMS = ["term_1", "term_2", "term_3"]

# Roman numerals and word forms seen in real filenames / admin input.
_WORD_TO_NUM = {
    "i": 1, "ii": 2, "iii": 3,
    "one": 1, "two": 2, "three": 3,
    "first": 1, "second": 2, "third": 3,
}

# Values that explicitly mean "no term scoping", not "unparseable".
_EMPTY_VALUES = {"", "none", "null", "all", "na", "n/a", "-"}

# Default exam -> term scope. A None value means the caller MUST supply an
# explicit scope (unit tests / formative assessments aren't tied to a term).
#
# Each periodic exam covers ONLY the term that preceded it: quarterly -> Term I,
# half_yearly -> Term II (not cumulative — confirmed by the product owner,
# 2026-08-10). The year-end exams stay comprehensive.
# Override without touching code via the EXAM_TERM_SCOPE_JSON env var, e.g.
# '{"half_yearly": ["term_1", "term_2"]}' for boards that examine cumulatively.
_DEFAULT_EXAM_TERM_SCOPE: Dict[str, Optional[List[str]]] = {
    "quarterly": ["term_1"],
    "half_yearly": ["term_2"],
    "annual": ["term_1", "term_2", "term_3"],
    "public": ["term_1", "term_2", "term_3"],
    "revision": ["term_1", "term_2", "term_3"],
    "model": ["term_1", "term_2", "term_3"],
    "unit_test": None,
    "monthly": None,
    "slip_test": None,
}

# Aliases -> canonical exam key. Matched after _slug() normalization.
_EXAM_ALIASES = {
    "quarter": "quarterly",
    "q1": "quarterly",
    "first_term_exam": "quarterly",
    "halfyearly": "half_yearly",
    "half_year": "half_yearly",
    "halfyear": "half_yearly",
    "mid_term": "half_yearly",
    "midterm": "half_yearly",
    "second_term_exam": "half_yearly",
    "annually": "annual",
    "final": "annual",
    "public_exam": "annual",
    "board_exam": "annual",
    "third_term_exam": "annual",
    "unit": "unit_test",
    "fa": "unit_test",
    "formative": "unit_test",
}


def _slug(raw: Any) -> str:
    """Lowercase, collapse any non-alphanumeric run to a single underscore."""
    return re.sub(r"[^a-z0-9]+", "_", str(raw).strip().lower()).strip("_")


def normalize_term(raw: Any) -> Optional[str]:
    """Coerce any term spelling to canonical `term_N`.

    Accepts 1, "1", "I", "Term 1", "term-1", "TERM_1", "Term I", "term one".
    Returns None for empty / explicit "all" / unparseable input, which callers
    treat as "no term filter".
    """
    if raw is None:
        return None

    slug = _slug(raw)
    if slug in _EMPTY_VALUES:
        return None

    # Strip a leading "term" prefix if present: "term_1" -> "1", "term_i" -> "i"
    body = slug[5:] if slug.startswith("term_") else (slug[4:] if slug.startswith("term") else slug)
    body = body.strip("_")
    if not body:
        return None

    num = _WORD_TO_NUM.get(body)
    if num is None:
        try:
            num = int(body)
        except (TypeError, ValueError):
            return None

    canonical = f"term_{num}"
    return canonical if canonical in CANONICAL_TERMS else None


def normalize_terms(raw: Any) -> List[str]:
    """Normalize a scalar, a list, or a "1,2" style string into canonical terms.

    Order-preserving and de-duplicated. Unparseable entries are dropped, so an
    all-junk input yields [] (= no term filter) rather than raising.
    """
    if raw is None:
        return []

    if isinstance(raw, (list, tuple, set)):
        candidates: List[Any] = list(raw)
    elif isinstance(raw, str) and ("," in raw or "|" in raw):
        candidates = re.split(r"[,|]", raw)
    else:
        candidates = [raw]

    out: List[str] = []
    for c in candidates:
        t = normalize_term(c)
        if t and t not in out:
            out.append(t)
    return out


def term_label(term: Any) -> str:
    """Human-readable form for prompts and chunk context headers.

    "term_2" -> "Term 2". Unparseable input is returned as-is so a header never
    silently loses information.
    """
    canonical = normalize_term(term)
    if not canonical:
        return "" if term is None else str(term)
    return f"Term {canonical.rsplit('_', 1)[1]}"


def _load_exam_term_scope() -> Dict[str, Optional[List[str]]]:
    """Default scope map, overlaid with the EXAM_TERM_SCOPE_JSON env override."""
    scope = dict(_DEFAULT_EXAM_TERM_SCOPE)

    raw = os.environ.get("EXAM_TERM_SCOPE_JSON")
    if not raw:
        return scope

    try:
        override = json.loads(raw)
        if not isinstance(override, dict):
            raise ValueError("EXAM_TERM_SCOPE_JSON must be a JSON object")
    except Exception as e:
        print(f"  [term_utils] WARNING: ignoring invalid EXAM_TERM_SCOPE_JSON: {e}")
        return scope

    for exam, terms in override.items():
        key = _slug(exam)
        scope[key] = None if terms is None else normalize_terms(terms)
    return scope


EXAM_TERM_SCOPE = _load_exam_term_scope()


def canonical_exam(exam_name: Any) -> Optional[str]:
    """Map any exam spelling to a key in EXAM_TERM_SCOPE, or None if unknown."""
    if exam_name is None:
        return None
    slug = _slug(exam_name)
    if not slug:
        return None
    if slug in EXAM_TERM_SCOPE:
        return slug
    aliased = _EXAM_ALIASES.get(slug)
    if aliased:
        return aliased
    # Tolerate decorated names like "half_yearly_exam_2025" / "annual_examination".
    for key in list(EXAM_TERM_SCOPE) + list(_EXAM_ALIASES):
        if key in slug:
            return _EXAM_ALIASES.get(key, key)
    return None


def exam_to_terms(
    exam_name: Any,
    override: Any = None,
) -> List[str]:
    """Term scope an exam covers.

    An explicit `override` (a request's term_scope) always wins. Otherwise the
    exam name is mapped via EXAM_TERM_SCOPE. Returns [] when the scope cannot be
    determined — callers treat that as "no term filter" and should log it, since
    an unscoped question paper is retrieved against every term.
    """
    explicit = normalize_terms(override)
    if explicit:
        return explicit

    key = canonical_exam(exam_name)
    if key is None:
        print(f"  [term_utils] WARNING: unknown exam '{exam_name}' - no term scope applied")
        return []

    terms = EXAM_TERM_SCOPE.get(key)
    if terms is None:
        print(
            f"  [term_utils] WARNING: exam '{exam_name}' ({key}) has no fixed term scope - "
            f"supply term_scope explicitly"
        )
        return []
    return list(terms)


def term_slug(terms: Union[str, List[str], None]) -> str:
    """Compact tag for ids and directory names: ["term_1","term_2"] -> "t1-t2".

    Returns "" when there is no term, so callers can build ids that stay
    byte-identical to the pre-term form for non-term boards.
    """
    normalized = normalize_terms(terms)
    if not normalized:
        return ""
    return "-".join(f"t{t.rsplit('_', 1)[1]}" for t in normalized)
