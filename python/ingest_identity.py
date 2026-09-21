"""
Identity checks for uploads: is this really the class, term and part claimed?

`class_utils` and `term_utils` canonicalize a value — "7" becomes "07", "Term II"
becomes "term_2". Neither asks whether the value is TRUE of the document, and
that is the gap this module closes.

It exists because of one upload. A Tamil Nadu Class 7 Science Term 2 unit was
posted with class "23" (a serial number typed into the class field) and term 1,
against a file named `Class_7_Science_term_2_unit6.pdf`. Every layer accepted
it: normalize_class_number returned "23" because it only pads, normalize_term
returned term_1 because 1 is a real term, and both were stamped into the doc_id
and into every Qdrant payload. Nothing was corrupt, nothing errored, and the
unit is simply unreachable — a Class 7 Term 2 query will never match it.

Wrong identity is worse than a failed ingest: a failed ingest is visible.

Checks, in order of how sure they are:

  range        class outside 1-12 (or a named pre-primary year) cannot be real
  format       a term outside 1-3 cannot be real
  contradiction the filename states a class or term and the upload disagrees
  grounding    a declared `part` the book never once mentions

The filename is treated as authoritative for the contradiction check because
these files come from our own splitter, which names them from the book's own
page stamps. When a declaration disagrees with it, one of the two is a typo and
neither is safe to ingest silently.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, List, Optional, Tuple

from class_utils import class_hint_from_text, validate_class_number
from logger import get_logger
from term_utils import term_hint_from_text, validate_term

logger = get_logger(__name__)


def identity_problems(
    filename: Any,
    class_number: Any = None,
    term: Any = None,
) -> List[str]:
    """Every reason this upload's identity looks wrong. Empty means it is fine.

    Returns messages rather than raising so a caller can decide the status code,
    and so all the problems are reported at once instead of one per attempt.
    """
    problems: List[str] = []

    # ── Values that cannot be real, whatever the file is ─────────────────────
    canonical_class: Optional[str] = None
    canonical_term: Optional[str] = None
    for check, value in ((validate_class_number, class_number),
                         (validate_term, term)):
        try:
            resolved = check(value)
        except ValueError as e:
            problems.append(str(e))
            continue
        if check is validate_class_number:
            canonical_class = resolved
        else:
            canonical_term = resolved

    # ── Values that contradict the file they were posted with ────────────────
    stem = Path(str(filename or "")).stem
    for label, declared, hint, field in (
        ("class", canonical_class, class_hint_from_text(stem), "class_name"),
        ("term", canonical_term, term_hint_from_text(stem), "term"),
    ):
        if not declared or not hint:
            continue          # nothing declared, or the file makes no claim
        if str(declared).strip().lower() != str(hint).strip().lower():
            problems.append(
                f"declared {label} {declared!r} contradicts the file "
                f"{Path(str(filename)).name!r}, which says {hint!r}. Correct the "
                f"{field!r} field or rename the file — ingesting either value "
                f"would file this book where the other will never find it."
            )

    return problems


def resolve_identity(
    filename: Any,
    class_number: Any = None,
    term: Any = None,
) -> Tuple[Optional[str], Optional[str]]:
    """Canonical (class, term) for an upload. Raises ValueError if it is wrong."""
    problems = identity_problems(filename, class_number, term)
    if problems:
        raise ValueError(" ".join(problems))
    return validate_class_number(class_number), validate_term(term)


def part_problem(part: Any, source_md: str) -> Optional[str]:
    """Why a declared part does not belong to this book, or None if it does.

    A part in the request body is an operator's claim, not a fact. The same
    wrong answer the extraction model produced on its own — part="History" on a
    unit about Tux Paint — is just as wrong when a human types it, and `part` is
    the field that quietly misfiles a unit in Qdrant. The book has to say it.

    Only meaningful once the document has been OCR'd, so this is checked in the
    audit rather than at the endpoint.
    """
    from extraction_audit import grounded_in_source

    text = str(part or "").strip()
    if not text or not source_md:
        return None
    if grounded_in_source(text, source_md):
        return None
    return (f"the declared part {text!r} is not mentioned anywhere in this "
            f"book — check the upload's part field")
