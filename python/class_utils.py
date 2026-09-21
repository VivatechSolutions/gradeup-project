"""
Class-number handling for board/class/subject scoped retrieval.

A student types "7". The corpus was ingested as "07". Qdrant matches payload
values exactly, so those two never meet and a perfectly good filter returns
nothing. Every class number therefore has ONE canonical form — a zero-padded
two-digit string — and it is applied at the API boundary, so the rest of the
stack only ever sees "07".

Canonicalize on write, normalize on read — the same rule `term_utils` applies
to terms.

    "7"  "07"  7  "Class 7"  "class-07"  "7th"  "VII"   ->  "07"
    "10" "Class X"                                      ->  "10"
    "LKG"                                               ->  "LKG"  (kept as-is)
    ""   None  "unknown"                                ->  None   (no filter)

Data ingested BEFORE this rule still carries "7" / "Class 7" in its metadata,
which is why read paths fan out over `class_number_variants()` instead of
matching the canonical form alone.
"""

import re
from typing import Any, List, Optional

try:  # pydantic is always present in the API process; keep the module importable without it
    from pydantic import BeforeValidator
    from typing import Annotated
    _PYDANTIC = True
except ImportError:  # pragma: no cover
    _PYDANTIC = False

# "Class 7", "Grade-7", "Std. 7", "CLASS_07" -> "7" / "07".
# A lookahead rather than \b, because "_" is itself a word character and
# "CLASS_07" would otherwise keep its prefix.
_PREFIX_RE = re.compile(r"^(?:class|grade|std|standard)(?![a-zA-Z0-9])[\s._\-]*", re.IGNORECASE)

# "7th", "1st", "3rd"
_ORDINAL_RE = re.compile(r"^(\d{1,3})(?:st|nd|rd|th)$", re.IGNORECASE)

# Indian schools write "Class IX" as often as "Class 9".
_ROMAN = {
    "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6,
    "vii": 7, "viii": 8, "ix": 9, "x": 10, "xi": 11, "xii": 12,
}

# Values that mean "no class scoping", not "unparseable".
_EMPTY_VALUES = {"", "none", "null", "all", "na", "n/a", "-", "unknown", "unknown_class"}


def normalize_class_number(raw: Any) -> Optional[str]:
    """Coerce any class spelling to the canonical zero-padded form.

    Returns None for empty / explicit "unknown" input, which callers treat as
    "no class filter". Non-numeric labels (LKG, UKG, Nursery) are passed
    through whitespace-normalized, since there is nothing to pad.
    """
    if raw is None:
        return None

    text = str(raw).strip()
    if not text:
        return None

    body = _PREFIX_RE.sub("", text).strip().strip(".")
    if body.lower() in _EMPTY_VALUES:
        return None

    num: Optional[int] = None
    if body.isdigit():
        num = int(body)
    else:
        ordinal = _ORDINAL_RE.match(body)
        if ordinal:
            num = int(ordinal.group(1))
        else:
            num = _ROMAN.get(body.lower())

    if num is None:
        # Not a number at all — a named class. Keep it, just tidy the spacing.
        return re.sub(r"\s+", " ", body)

    # Two digits is the whole point; anything larger is left alone rather than
    # truncated, so a bad input stays visible instead of silently becoming "99".
    return f"{num:02d}" if num < 100 else str(num)


def class_label(raw: Any) -> str:
    """Human-readable form for prompts and chunk context headers: "Class 7".

    Deliberately UNpadded — "Class 07" reads like a typo in generated text, and
    the label is prose, not a filter key.
    """
    display = class_display(raw)
    return f"Class {display}" if display else ""


def class_display(raw: Any) -> str:
    """Bare unpadded form for prompts: "07" -> "7", "LKG" -> "LKG", None -> "".

    Prompts and student-facing text should never show the padding — it is a
    storage detail, and "Class: 07" invites the model to echo it back.
    """
    canonical = normalize_class_number(raw)
    if not canonical:
        return ""
    return str(int(canonical)) if canonical.isdigit() else canonical


def class_number_variants(raw: Any) -> List[str]:
    """Every spelling of one class that may sit in stored metadata.

    Read paths fan these out because the corpus predates canonicalization:
    "07" (current), "7" (older ingests), and both "Class N" forms.
    """
    canonical = normalize_class_number(raw)
    if not canonical:
        return []

    plain = str(int(canonical)) if canonical.isdigit() else canonical
    out: List[str] = []
    for v in (canonical, plain, f"Class {canonical}", f"Class {plain}",
              (str(raw).strip() if raw is not None else "")):
        if v and v not in out:
            out.append(v)
    return out


def class_matches(stored: Any, requested: Any) -> bool:
    """True when a stored metadata value refers to the requested class.

    Used by the manual-filter fallbacks that run when a Qdrant payload index is
    missing. An unparseable `requested` means "no filter" and matches anything.
    """
    want = normalize_class_number(requested)
    if want is None:
        return True
    have = normalize_class_number(stored)
    if have is None:
        return False
    return have.casefold() == want.casefold()


# ── Ingestion validation ──────────────────────────────────────────────────────
# normalize_class_number is deliberately permissive: read paths call it on
# whatever a student typed, and an unparseable filter should return nothing
# rather than raise. Ingestion is the opposite case. A textbook was uploaded as
# class "23" — the operator had typed a serial number into the class field — and
# it was accepted, stamped into the doc_id, and written into every Qdrant
# payload, where no class filter will ever match it again.
#
# There is no class 23. Anything outside the range a school actually teaches is
# a typo, and the only place to catch it is before the document is ingested.
MIN_CLASS = 1
MAX_CLASS = 12

# Pre-primary years carry names rather than numbers.
NAMED_CLASSES = {
    "lkg", "ukg", "kg", "nursery", "playgroup", "pre kg", "pre-kg", "prekg",
    "pp1", "pp2", "prep", "montessori",
}


def class_number_error(raw: Any) -> Optional[str]:
    """Why this value cannot be a class, or None if it can.

    Used at the ingestion boundary. Read paths keep using
    normalize_class_number, which never raises.
    """
    if raw is None or str(raw).strip() == "":
        return None                      # absent is allowed; wrong is not

    canonical = normalize_class_number(raw)
    if canonical is None:
        return None                      # explicit "unknown"/"all" — no scoping

    if canonical.isdigit():
        num = int(canonical)
        if not (MIN_CLASS <= num <= MAX_CLASS):
            return (f"class {raw!r} is out of range — classes run "
                    f"{MIN_CLASS}-{MAX_CLASS}")
        return None

    if canonical.strip().lower() in NAMED_CLASSES:
        return None

    return (f"class {raw!r} is not a class this system recognises — use "
            f"{MIN_CLASS}-{MAX_CLASS} or one of: "
            f"{', '.join(sorted(NAMED_CLASSES))}")


def validate_class_number(raw: Any) -> Optional[str]:
    """Canonical class for ingestion. Raises ValueError on an impossible one."""
    problem = class_number_error(raw)
    if problem:
        raise ValueError(problem)
    return normalize_class_number(raw)


# "Class_7_Science_term_2_unit6" -> "07". Used to cross-check what the upload
# declared against what the file itself says it is.
_CLASS_HINT_RE = re.compile(
    r"(?:^|[^a-z0-9])(?:class|grade|std|standard)[_\s\-]*(\d{1,2})(?![0-9])",
    re.IGNORECASE,
)


def class_hint_from_text(text: Any) -> Optional[str]:
    """The class a filename states outright, canonicalized, else None."""
    matches = {m.group(1) for m in _CLASS_HINT_RE.finditer(str(text or ""))}
    if len(matches) != 1:
        return None                      # absent, or ambiguous — no claim made
    return normalize_class_number(matches.pop())


def _to_str(raw: Any) -> str:
    """Validator body for required `class_number: str` fields."""
    return normalize_class_number(raw) or ""


if _PYDANTIC:
    # Request-model field types. Annotating with these is what makes "the
    # backend receives 07" true no matter what the client sent.
    ClassNumber = Annotated[str, BeforeValidator(_to_str)]
    OptionalClassNumber = Annotated[Optional[str], BeforeValidator(normalize_class_number)]
    # Ingestion only. Rejects an impossible class with a 422 instead of filing
    # the textbook under it. Query/filter fields keep the lenient types above:
    # a search for class 23 should return nothing, not fail the request.
    IngestClassNumber = Annotated[Optional[str], BeforeValidator(validate_class_number)]
