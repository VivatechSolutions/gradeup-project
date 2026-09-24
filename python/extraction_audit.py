"""
Extraction audit — the gate that decides whether structured.json may be stored.

The verification agent used to compute a verdict and save regardless: a run
could log FINAL STATUS: PARTIAL with 49 sections missing and still write
structured.json to disk and upload it to S3. This module replaces the advisory
score with a pass/fail audit whose failures are ACTIONABLE — each one names the
section at fault and the span of source text needed to repair it, so the fix is
one small re-extraction rather than re-running the whole textbook.

Criteria (all must hold):
  - every heading printed in the source exists as a section
  - no section is empty
  - no two sections share an id while carrying identical content
  - sections are in textbook order
  - the schema is intact: required keys present and correctly typed
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Set, Tuple

from logger import get_logger

logger = get_logger(__name__)


def _lazy():
    """auto_schema_extractor is heavy; import on first use, not at module load."""
    from auto_schema_extractor import _SECNUM, backmatter_offset
    return _SECNUM, backmatter_offset

# Failure kinds. The first two need the model; the rest are deterministic.
MISSING_HEADING = "missing_heading"
EMPTY_SECTION = "empty_section"
DUPLICATE = "duplicate"
OUT_OF_ORDER = "out_of_order"
SCHEMA_INVALID = "schema_invalid"
MIS_NESTED = "mis_nested"
# The unit's own fields — title, number, subject, part. The audit used to walk
# unit["sections"] and never look at the unit itself, so a unit titled "Unit 6"
# with a hallucinated part of "History" passed a 45-section audit cleanly.
UNIT_INVALID = "unit_invalid"
# A section that is really the publisher's colophon (author list, EMIS team).
BACKMATTER_SECTION = "backmatter_section"
# An untitled paragraph filed as its own section when the book prints it as the
# continuation of a titled section (after an Activity / definition box).
ORPHAN_PROSE = "orphan_prose"
# A box (Activity, Do You Know, ...) that appears to have swallowed the section
# exposition that resumes after it. A SUSPICION, judged by the model: it is
# reported and repaired when a model is available, and never blocks storage on
# its own - a long activity that really is all activity must not be rejected.
BOX_OVERFULL = "box_overfull"
# A heading the book prints with nothing beneath it (a pie-chart caption) kept
# as a section with no content, no items and no children.
EMPTY_FURNITURE = "empty_furniture"

_NEEDS_LLM = {MISSING_HEADING, EMPTY_SECTION, BOX_OVERFULL}
# Reported, repaired if possible, but not a reason to reject the document.
_ADVISORY = {BOX_OVERFULL}

# Box types that speak to the student and are short by nature.
_BOX_TYPES = frozenset({
    "activity", "do_you_know", "thinking_corner", "more_to_know", "try_this",
    "progress_check", "note", "ict_corner", "fact", "case_study",
})
# Text addressed to the student, or an instruction: what a box is made of.
_TO_STUDENT_RE = re.compile(
    r"\b(you|your|we|us|our|let us|observe|notice|record|take a|find out|try|"
    r"discuss|collect|list|draw|make|imagine|write|compare|identify|answer|why|"
    r"how|what|which|do you|can you)\b", re.I)
_PAGE_FURNITURE_RE = re.compile(r"^(?:\d{1,3}|Reprint \d{4}-\d{2}|[A-Z][A-Z \-\u2013]{6,}(?: [IVX]+)?)$")
_BOX_MIN_CHARS = 600
_BOX_MIN_EXPOSITION_PARAS = 2
_BOX_MIN_EXPOSITION_CHARS = 400


def _paragraphs(text: str) -> List[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", text or "")
            if p.strip() and not p.strip().startswith("![")]


def _is_exposition(p: str) -> bool:
    """A paragraph that reads as textbook exposition, not as a box speaking to
    the student: long, declarative, no instruction or question, not a list
    item, not page furniture."""
    return (len(p) >= 150 and not _TO_STUDENT_RE.search(p)
            and not re.match(r"^[\(\d\u2022\-\*|\\]", p)
            and not _PAGE_FURNITURE_RE.match(p))


def _box_span(sec: Dict[str, Any], source_md: str) -> Optional[Tuple[int, int]]:
    """The source text this box's content came from: from the heading just
    before its first words to the next heading of any level."""
    from auto_schema_extractor import _locate_text, iter_source_headings
    pos = _locate_text(str(sec.get("content") or ""), source_md)
    if pos is None:
        return None
    heads = [h[0] for h in iter_source_headings(source_md)]
    start = max([h for h in heads if h <= pos], default=0)
    end = min([h for h in heads if h > pos], default=len(source_md))
    return start, end


def box_looks_overfull(sec: Dict[str, Any]) -> bool:
    """Trigger for the model's judgement, calibrated on the corpus: four boxes
    matched and every one had swallowed the section after it (the land-use
    narrative, the oxidation exposition after a copper-heating activity, the
    definition of density after a density activity); every legitimately long
    activity - tables, procedures, equations - did not."""
    if str(sec.get("type") or "").lower() not in _BOX_TYPES:
        return False
    if (sec.get("metadata") or {}).get("box_checked"):
        return False                      # the model already judged this one
    content = str(sec.get("content") or "")
    if len(content) < _BOX_MIN_CHARS:
        return False
    paras = _paragraphs(content)
    if len(paras) < 3:
        return False
    expo = [p for p in paras[1:] if _is_exposition(p)]
    return (len(expo) >= _BOX_MIN_EXPOSITION_PARAS
            and sum(len(p) for p in expo) >= _BOX_MIN_EXPOSITION_CHARS)

# Minimum prose printed under a heading for it to count as a content section. A
# heading with less than this beneath it is structural furniture (a chapter
# number, a QR/ICT box, a portrait caption) — neither REQUIRED when absent nor a
# FAILURE when empty. Both the missing-heading and empty-section checks use it.
_MIN_SECTION_BODY = 25

# A section must carry these, with these types.
_REQUIRED_KEYS = {"type": str, "title": str, "content": str}

# A unit must carry these. "sections" is checked separately because an empty
# list is a failure while an empty string title is caught by the title rules.
_REQUIRED_UNIT_KEYS = {"title": str, "sections": list}

# Unit fields the pipeline declares. Anything the JSON carries here that
# contradicts what was passed in is the model inventing metadata, which is how a
# Class 7 Science unit ended up filed under part "History".
_DECLARED_FIELDS = ("subject", "part", "term")


def grounded_in_source(value: Any, source_md: str) -> bool:
    """True when the book itself prints this value.

    The dividing line for undeclared metadata. A Social Science unit really does
    belong to a "History" part and says so fourteen times in its own pages; the
    Tux Paint unit that came back tagged part="History" never says it once.
    """
    text = str(value or "").strip()
    if not text or not source_md:
        return False
    return re.search(rf"\b{re.escape(text)}\b", source_md, re.IGNORECASE) is not None

_CHILD_KEYS = ("sub_sections", "subsections", "sections")

# Worked examples and their kin are printed as a BOLD LABEL WITH TEXT FOLLOWING
# on the same line -- "**Example 2.19** Find the next three terms..." --  which
# iter_source_headings cannot see: its bold pattern requires the bold run to be
# alone on the line. So none of these counted as headings, and a run that lost
# Examples 2.19 through 2.28 still audited as PASS with 119/119 headings.
# Matched here, in the audit only, rather than by widening iter_source_headings:
# recovery and stub-filling also consume that function, and making it report
# every bold label would have them synthesise sections the book never had.
# Matched STRUCTURALLY, not by vocabulary: one to three capitalised words
# followed by a number, in bold, at the start of a line. A list of maths words
# would only ever fit maths books - this same shape carries "Example 2.19",
# "Activity 4", "Experiment 1.2", "Case Study 3", "Q 5", "Task 2" and whatever
# a board invents next, in any subject. Caption furniture ("Fig 2.3",
# "Table 1.1", "Page 4") is removed further down by _is_noise_heading, which
# already knows those shapes.
_LABEL_BODY = (r'(?:[A-Z][A-Za-z\'.\-]*(?:[ \t]+[A-Za-z\'.\-]+){0,2})'
               r'[ \t]*[0-9][0-9.\-]*')
_LABEL_RE = re.compile(
    r'(?m)^[ \t]{0,3}\*\*[ \t]*(' + _LABEL_BODY + r')[ \t]*[:.]?[ \t]*\*\*'
)

# The same label at the START of a section's id or title, where the rest is the
# question text ("Example 2.19 Find the next terms...").
_LABEL_PREFIX_RE = re.compile(r'^\s*(' + _LABEL_BODY + r')', re.I)


# Numbered bold labels that are NOT sections. Three families, all found by
# running this over every book on disk rather than guessed at:
#   procedure   "**Step 1:**"      - a step INSIDE a section, not a section
#   dialogue    "**Student 2:**"   - a speaker label in a conversation
#   caption /   "**Figure 1**",    - furniture, or a heading already counted
#   structure   "**Chapter 3**"      through the normal heading scan
_LABEL_EXCLUDE = frozenset("""
step student teacher speaker narrator voice person man woman boy girl
fig figure table chart graph map photo image picture plate diagram
chapter unit part volume page section lesson period
column row day week month year class std level marks time score
""".split())


def iter_source_labels(source_md: str) -> List[Tuple[int, int, str]]:
    """Numbered labelled blocks in the source, as (start, end, text).

    Structural, not subject-specific: any 1-3 capitalised words followed by a
    number, in bold, at the start of a line — minus the kinds above that are
    never standalone sections.
    """
    out: List[Tuple[int, int, str]] = []
    for m in _LABEL_RE.finditer(source_md or ""):
        text = re.sub(r"\s+", " ", m.group(1)).strip()
        head = re.sub(r"[\d.\-:]+$", "", text).strip().lower()
        if not head or head.split()[0] in _LABEL_EXCLUDE:
            continue
        out.append((m.start(), m.end(), text))
    return out


@dataclass
class AuditFailure:
    """One actionable problem, with everything a repair node needs."""
    kind: str
    detail: str
    section_id: str = ""
    title: str = ""
    # Source span carrying the text this section should hold. Present for the
    # failures a targeted re-extraction can fix.
    span_start: Optional[int] = None
    span_end: Optional[int] = None
    # The section's own opening words. A chapter prints "Activity" three times
    # over, so id and title cannot say WHICH box a failure means - a repair
    # that looked one up by title overwrote the wrong activity's content.
    content_head: str = ""

    @property
    def needs_llm(self) -> bool:
        return self.kind in _NEEDS_LLM

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class AuditResult:
    passed: bool
    failures: List[AuditFailure] = field(default_factory=list)
    stats: Dict[str, Any] = field(default_factory=dict)

    def by_kind(self, kind: str) -> List[AuditFailure]:
        return [f for f in self.failures if f.kind == kind]

    @property
    def llm_failures(self) -> List[AuditFailure]:
        return [f for f in self.failures if f.needs_llm]

    @property
    def deterministic_failures(self) -> List[AuditFailure]:
        return [f for f in self.failures if not f.needs_llm]

    def to_dict(self) -> Dict[str, Any]:
        counts: Dict[str, int] = {}
        for f in self.failures:
            counts[f.kind] = counts.get(f.kind, 0) + 1
        return {
            "passed": self.passed,
            "failure_count": len(self.failures),
            "failures_by_kind": counts,
            "stats": self.stats,
            "failures": [f.to_dict() for f in self.failures],
        }

    def summary(self) -> str:
        if self.passed:
            return "PASS"
        counts: Dict[str, int] = {}
        for f in self.failures:
            counts[f.kind] = counts.get(f.kind, 0) + 1
        return "FAIL — " + ", ".join(f"{k}×{v}" for k, v in sorted(counts.items()))


# ── helpers ───────────────────────────────────────────────────────────────────

def _norm_key(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (text or "").lower())


def iter_sections(sections: Any, depth: int = 0):
    """Every section node in the tree, with its depth."""
    for sec in sections or []:
        if not isinstance(sec, dict):
            continue
        yield depth, sec
        for key in _CHILD_KEYS:
            yield from iter_sections(sec.get(key), depth + 1)


def _section_payload(sec: Dict[str, Any]) -> int:
    """Characters of real content, counting children and question lists."""
    from auto_schema_extractor import _section_text_volume
    total = len(str(sec.get("content") or ""))
    for key in ("sub_items", "questions", "metadata", *_CHILD_KEYS):
        total += _section_text_volume(sec.get(key))
    return total


def _is_empty(sec: Dict[str, Any]) -> bool:
    from auto_schema_extractor import _section_is_empty
    if any(sec.get(k) for k in (*_CHILD_KEYS, "sub_items")):
        return False
    return _section_is_empty(sec)


# ── source facts shared with the schema validator ─────────────────────────────

def _heading_body_lengths(source_md: str) -> List[Tuple[str, int]]:
    """(heading key, chars printed beneath it) for every real heading the book
    prints before its back matter. Shared by furniture_headings and
    substantive_headings so the two sets are complements of one census."""
    from auto_schema_extractor import iter_source_headings, _is_noise_heading
    if not source_md:
        return []
    anchors = sorted(
        {a[0]: a for a in iter_source_headings(source_md) + iter_source_labels(source_md)}.values(),
        key=lambda a: a[0],
    )
    _SECNUM, backmatter_offset = _lazy()
    cutoff = backmatter_offset(source_md)
    if cutoff is not None:
        anchors = [a for a in anchors if a[0] < cutoff]
    out: List[Tuple[str, int]] = []
    for i, (_start, h_end, text) in enumerate(anchors):
        if _is_noise_heading(text):
            continue
        end = anchors[i + 1][0] if i + 1 < len(anchors) else len(source_md)
        key = _norm_key(re.sub(r'^\s*' + _SECNUM + r'\s*', '', text))
        out.append((key, len(source_md[h_end:end].strip())))
    return out


def furniture_headings(source_md: str) -> Set[str]:
    """Headings the book prints with (almost) nothing beneath them, as keys.

    A chart title, a chapter-number line, a QR box: the audit already treats
    these as structural furniture — neither required when absent nor a failure
    when empty — because re-extracting a heading with no printed body can never
    converge. The schema validator had no way to know that, so it kept failing
    "General land use categories-1960-61" (a pie-chart caption) as an empty
    section and vetoing a document the audit had passed. Same rule, same
    threshold, one source of truth.
    """
    return {key for key, body in _heading_body_lengths(source_md)
            if body < _MIN_SECTION_BODY}


def substantive_headings(source_md: str) -> Set[str]:
    """Headings the book prints real text beneath, as keys — the only headings
    under which an EMPTY section is content loss.

    This is the audit's own rule (check 2 below skips an empty section whose
    heading it cannot place in the source, or whose printed body is under
    _MIN_SECTION_BODY). The schema validator applied it to `content` only, so
    an empty EXERCISE under a heading the book prints no questions beneath —
    required field `sub_items` — stayed CRITICAL, twice, and vetoed a Class 10
    Science chapter the audit had passed at 60/60 headings. Nothing could
    repair it: the repair loop acts on audit failures, and the audit had none.
    """
    return {key for key, body in _heading_body_lengths(source_md)
            if body >= _MIN_SECTION_BODY}


# ── unit-level audit ──────────────────────────────────────────────────────────

def _audit_unit(
    unit: Dict[str, Any],
    source_md: str,
    declared: Optional[Dict[str, Any]] = None,
) -> List[AuditFailure]:
    """Everything about a unit that is not one of its sections.

    The section checks below are thorough and the unit itself was unexamined,
    so an extraction could be perfect section-by-section and still ship with no
    name, no number, and a subject it invented.
    """
    from auto_schema_extractor import derive_unit_title, is_placeholder_unit_title

    out: List[AuditFailure] = []
    number = unit.get("unit_number") or unit.get("chapter_number")
    label = f"unit {number}" if number not in (None, "") else "unit"

    def fail(detail: str, title: str = "") -> None:
        out.append(AuditFailure(kind=UNIT_INVALID, detail=detail,
                                section_id=str(number or ""), title=title))

    # ── required keys, present and correctly typed ───────────────────────────
    for key, expected in _REQUIRED_UNIT_KEYS.items():
        if key not in unit or unit[key] is None:
            fail(f"{label}: required key {key!r} is missing or null")
        elif not isinstance(unit[key], expected):
            fail(f"{label}: key {key!r} is {type(unit[key]).__name__}, "
                 f"expected {expected.__name__}")

    if number in (None, ""):
        fail(f"{label}: no unit_number or chapter_number")

    if not (unit.get("sections") or []):
        fail(f"{label}: has no sections")

    # ── the title ────────────────────────────────────────────────────────────
    raw_title = unit.get("title")
    title = str(raw_title or "").strip()
    if title != title.strip("*# "):
        fail(f"{label}: title carries markdown ({title!r})", title)
    clean = title.strip("*# ").strip()

    if not clean:
        # Always a failure, even where the book prints no name: a null unit
        # title is what produced debate topics generated against "Untitled".
        fail(f"{label}: title is empty")
    elif is_placeholder_unit_title(clean):
        # A placeholder is only a failure when the book actually prints a name
        # to use. A unit whose title page is a scanned image has none, and
        # demanding one would never converge.
        printed = derive_unit_title(source_md, number)
        if printed:
            fail(f"{label}: title is {clean!r}, but the book prints "
                 f"{printed!r} — the unit name was dropped", printed)
        else:
            logger.info(
                f"[Audit] {label}: title {clean!r} is a placeholder, but the "
                f"source prints no unit name in text — accepted"
            )

    # ── the declared part must itself be right ───────────────────────────────
    # A part supplied in the request body is an operator's claim about the
    # book, not a fact — and it is the one field that silently misfiles a unit
    # in Qdrant. Checking only that the JSON agrees with it would wave through
    # part="History" typed onto a Tux Paint unit, which is the same wrong answer
    # the model produced on its own. The book has to back it up.
    declared_part = (declared or {}).get("part")
    if declared_part and not grounded_in_source(declared_part, source_md):
        fail(f"{label}: the declared part {str(declared_part)!r} is not mentioned "
             f"anywhere in this book — check the upload's part field")

    # ── declared identity ────────────────────────────────────────────────────
    for field_name in _DECLARED_FIELDS:
        got = unit.get(field_name)
        if got in (None, ""):
            continue
        want = (declared or {}).get(field_name)
        if want not in (None, ""):
            if str(got).strip().lower() != str(want).strip().lower():
                fail(f"{label}: {field_name}={got!r} contradicts the declared "
                     f"{field_name}={want!r}")
        elif not grounded_in_source(got, source_md):
            fail(f"{label}: carries {field_name}={got!r}, which the pipeline "
                 f"never declared and the book never mentions — invented metadata")

    return out


# ── the audit ─────────────────────────────────────────────────────────────────

def audit_extraction(
    structured_data: Dict[str, Any],
    source_md: str,
    *,
    require_all_headings: bool = True,
    declared: Optional[Dict[str, Any]] = None,
) -> AuditResult:
    """Audit one document. Strict by design: any failure means do not store.

    `declared` carries the identity the pipeline was given (subject, part,
    term). Unit fields are checked against it, so metadata the model invented
    is a failure rather than something that reaches Qdrant unnoticed.
    """
    from auto_schema_extractor import (iter_source_headings, _SECNUM,
                                       _is_noise_heading, backmatter_offset,
                                       is_credits_heading)

    units = structured_data.get("units") or structured_data.get("chapters") or []
    sections: List[Dict[str, Any]] = []
    for unit in units:
        if isinstance(unit, dict):
            sections.extend(unit.get("sections") or [])

    failures: List[AuditFailure] = []
    nodes = [sec for _, sec in iter_sections(sections)]

    # ── 0. the units themselves ──────────────────────────────────────────────
    if not units:
        failures.append(AuditFailure(
            kind=UNIT_INVALID, detail="the extraction contains no units"))
    for unit in units:
        if isinstance(unit, dict):
            failures.extend(_audit_unit(unit, source_md, declared))

    # Every anchor the book prints: markdown/bold headings PLUS numbered
    # labelled blocks ("**Example 2.19** ..."). They are merged and sorted so a
    # label ends the preceding heading's span and owns the text beneath itself —
    # without that, an example's body counted as part of the section above it.
    #
    # Anchors stop at the publisher's colophon. The author list, advisory
    # committee and EMIS pages that close a book print every person's name in
    # bold on its own line, so iter_source_headings reports 48 "headings" that
    # are really printing credits — and this audit then failed the unit for not
    # having a section called "Dr. G. Ramesh". The repair loop obliged, and half
    # the sections in the unit became the colophon.
    anchors: List[Tuple[int, int, str]] = []
    backmatter_at = backmatter_offset(source_md) if source_md else None
    if source_md:
        anchors.extend(iter_source_headings(source_md))
        anchors.extend(iter_source_labels(source_md))
    if backmatter_at is not None:
        dropped = len([a for a in anchors if a[0] >= backmatter_at])
        anchors = [a for a in anchors if a[0] < backmatter_at]
        logger.info(
            f"[Audit] publisher colophon starts at char {backmatter_at} — "
            f"{dropped} credit heading(s) excluded from the heading census"
        )
    seen_starts = set()
    ordered: List[Tuple[int, int, str]] = []
    for a in sorted(anchors, key=lambda x: x[0]):
        if a[0] in seen_starts:
            continue
        seen_starts.add(a[0])
        ordered.append(a)

    spans: List[Tuple[str, str, int, int]] = []   # (number, title, body_start, body_end)
    for i, (h_start, h_end, text) in enumerate(ordered):
        if _is_noise_heading(text):
            continue
        end = ordered[i + 1][0] if i + 1 < len(ordered) else len(source_md)
        m = re.match(r'^(' + _SECNUM + r')\s*(.*)$', text)
        number = m.group(1) if m else ""
        title = (m.group(2).strip() if m else text) or text
        spans.append((number, title, h_end, end))

    # ── 1. every source heading present ──────────────────────────────────────
    present_numbers = set()
    present_titles = set()
    for sec in nodes:
        sid = str(sec.get("id") or "").strip()
        m = re.match(r'^(' + _SECNUM + r')\b', sid)
        if m:
            present_numbers.add(m.group(1))
        # A labelled block is usually carried as the ID ("Example 2.19") while
        # the title holds the question text, so the id has to be a lookup key in
        # its own right or every example would read as missing.
        if sid:
            present_titles.add(_norm_key(sid))
            lp = _LABEL_PREFIX_RE.match(sid)
            if lp:
                present_titles.add(_norm_key(lp.group(1)))
        title = str(sec.get("title") or "")
        lpt = _LABEL_PREFIX_RE.match(title)
        if lpt:
            present_titles.add(_norm_key(lpt.group(1)))
        mt = re.match(r'^\s*(' + _SECNUM + r')\b', title)
        if mt:
            present_numbers.add(mt.group(1))
        if title.strip():
            present_titles.add(_norm_key(re.sub(r'^\s*' + _SECNUM + r'\s*', '', title)))
        for item in sec.get("sub_items") or []:
            if isinstance(item, dict):
                present_titles.add(_norm_key(str(item.get("number") or "")))

    # The chapter heading names the UNIT, and the text beneath it is the
    # unit's "Introduction" section (name_unit_intro), so that heading is
    # accounted for by an Introduction just as well as by a section carrying
    # the chapter's name. Without this the repair loop re-extracted the opening
    # text as a section named after the chapter every pass.
    intro_units = {
        _norm_key(str(u.get("title") or "")) for u in units
        if isinstance(u, dict) and any(
            isinstance(sec, dict) and _norm_key(str(sec.get("title") or "")) == "introduction"
            for sec in (u.get("sections") or []))
    }
    intro_units.discard("")

    if require_all_headings:
        for number, title, b_start, b_end in spans:
            if number:
                if number in present_numbers:
                    continue
            elif _norm_key(title) in present_titles:
                continue
            elif _norm_key(title) in intro_units:
                continue          # the chapter heading: its text is the Introduction
            body = source_md[b_start:b_end].strip()
            if len(body) < _MIN_SECTION_BODY:
                continue          # a heading with no text under it is not a section
            failures.append(AuditFailure(
                kind=MISSING_HEADING,
                detail=f"heading printed in the source has no section",
                section_id=number,
                title=title,
                span_start=b_start,
                span_end=b_end,
            ))

    # ── 2. no empty sections ─────────────────────────────────────────────────
    span_by_number = {n: (s, e) for n, _t, s, e in spans if n}
    span_by_title = {}
    for n, t, s, e in spans:
        span_by_title.setdefault(_norm_key(t), (s, e))

    for sec in nodes:
        if not _is_empty(sec):
            continue
        sid = str(sec.get("id") or "").strip()
        title = str(sec.get("title") or "").strip()
        span = span_by_number.get(sid) or span_by_title.get(_norm_key(title))
        # An empty section is only a content-loss FAILURE when the book actually
        # prints prose under it. Structural furniture — a chapter-number heading,
        # a QR/ICT box, an author portrait caption — has no body to extract, so
        # demanding one can never converge (re-extraction of nothing returns
        # nothing). This mirrors the MISSING_HEADING check above, which already
        # skips headings with under _MIN_SECTION_BODY chars of text beneath them;
        # applying it here too removes the asymmetry that failed those sections.
        source_body = source_md[span[0]:span[1]].strip() if span else ""
        if len(source_body) < _MIN_SECTION_BODY:
            continue
        failures.append(AuditFailure(
            kind=EMPTY_SECTION,
            detail="section carries no content anywhere",
            section_id=sid,
            title=title,
            span_start=span[0] if span else None,
            span_end=span[1] if span else None,
        ))

    # ── 2b. no publisher colophon masquerading as content ────────────────────
    # The credits pages are excluded from the heading census above, but an
    # extraction can still have picked them up on its own — the good run of the
    # Class 7 Science unit carried nine of them. They are the book's imprint,
    # not the unit's content, and they pollute both RAG and the avatar.
    #
    # `spans` holds only the headings the book prints BEFORE the colophon, so a
    # section that follows the first credits heading and matches none of them is
    # a credit line ("Dr. G. Ramesh") rather than something the unit teaches.
    if backmatter_at is not None:
        real_titles = {_norm_key(t) for _n, t, _s, _e in spans}
        real_numbers = {n for n, _t, _s, _e in spans if n}
        in_block = False
        for sec in sections:
            title = str(sec.get("title") or "").strip()
            sid = str(sec.get("id") or "").strip()
            if is_credits_heading(title):
                in_block = True
            if not in_block:
                continue
            if sid in real_numbers or _norm_key(title) in real_titles:
                in_block = False          # back inside content the book prints
                continue
            failures.append(AuditFailure(
                kind=BACKMATTER_SECTION,
                detail="section is publisher credits, not unit content",
                section_id=sid,
                title=title[:80],
            ))

    # ── 2c. no section cut in half by a box ──────────────────────────────────
    # The model sees that the paragraph after an Activity box is not part of
    # the Activity — correctly — and then files it as a new, untitled section.
    # The section it resumes is left holding only what it said BEFORE the box.
    # reattach_orphan_prose knows how to return it; this check makes the fault
    # visible, and lets the repair loop apply it to documents already on disk.
    if source_md:
        from auto_schema_extractor import reattach_orphan_prose
        import copy as _copy
        for unit in units:
            if not isinstance(unit, dict):
                continue
            unit_secs = unit.get("sections") or []
            probe = reattach_orphan_prose(_copy.deepcopy(unit_secs), source_md,
                                          unit_title=str(unit.get("title") or ""))
            if len(probe) >= len(unit_secs):
                continue
            for sec in unit_secs:
                body = str(sec.get("content") or "").strip()
                if str(sec.get("title") or "").strip() or not body:
                    continue
                # Absorbed = its opening now appears inside another section.
                head = body[:60]
                if any(head in str(p.get("content") or "")
                       and str(p.get("title") or "").strip() for p in probe):
                    failures.append(AuditFailure(
                        kind=ORPHAN_PROSE,
                        detail="untitled paragraph is the continuation of a titled "
                               "section (printed after a box) but was filed on its own",
                        section_id=str(sec.get("id") or ""),
                        title=head,
                    ))

    # ── 2d. no box that swallowed the section after it ───────────────────────
    # "### Activity" followed by 1,200 chars before the next heading: the model
    # applied "up to the next heading" to the box and the section's own
    # narrative ended up inside an activity. Flagged for the model to split;
    # advisory, so a genuinely long activity is never a rejection.
    for sec in nodes:
        if not box_looks_overfull(sec):
            continue
        title = str(sec.get("title") or "")
        # By CONTENT, not title: a chapter prints "Activity" several times, and
        # the title lookup handed the repair the first one's text - the model
        # would have been asked to split the wrong activity.
        span = _box_span(sec, source_md) if source_md else None
        failures.append(AuditFailure(
            kind=BOX_OVERFULL,
            detail="box appears to hold the section exposition that resumes after it",
            section_id=str(sec.get("id") or ""),
            title=title[:80],
            span_start=span[0] if span else None,
            span_end=span[1] if span else None,
            content_head=str(sec.get("content") or "").strip()[:80],
        ))

    # ── 2e. no empty furniture kept as a section ─────────────────────────────
    # A pie-chart caption the OCR promoted to a heading, with nothing beneath
    # it in the book, was stored as {"title": ..., "content": ""}. It carries
    # nothing and it is not content loss (the check above already skips such
    # headings); it is dropped rather than shipped as an empty section.
    # Any type: an empty "exercise" under a heading the book prints no
    # questions beneath is as much a stub as an empty "section" under a chart
    # title, and while it was kept the schema validator failed it (see
    # substantive_headings) after this audit had passed.
    furniture = furniture_headings(source_md) if source_md else set()
    for sec in sections:
        if not _is_empty(sec):
            continue
        key = _norm_key(re.sub(r'^\s*' + _SECNUM + r'\s*', '', str(sec.get("title") or "")))
        if key and key in furniture:
            failures.append(AuditFailure(
                kind=EMPTY_FURNITURE,
                detail="empty section under a heading the book prints nothing beneath",
                section_id=str(sec.get("id") or ""),
                title=str(sec.get("title") or "")[:80],
            ))

    # ── 3. no duplicate id carrying identical content ────────────────────────
    seen: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for sec in nodes:
        sid = str(sec.get("id") or "").strip()
        if not sid:
            continue
        body = re.sub(r"[^a-z0-9]+", "", str(sec.get("content") or "").lower())[:150]
        if len(body) < 9:
            continue
        key = (sid, body)
        if key in seen:
            failures.append(AuditFailure(
                kind=DUPLICATE,
                detail="two sections share an id and identical content",
                section_id=sid,
                title=str(sec.get("title") or ""),
            ))
        else:
            seen[key] = sec

    # ── 4. textbook order ────────────────────────────────────────────────────
    # Positions come from section NUMBERS where a book has them and from TITLES
    # where it does not. Keying on numbers alone made this check a no-op for
    # every unnumbered book — a Social Science chapter has zero numbered
    # headings, so nothing was ever compared and out_of_order could not be
    # reported at all, whatever order the sections were actually in.
    position = {n: s for n, _t, s, _e in spans if n}
    position_by_title: Dict[str, int] = {}
    for _n, t, s, _e in spans:
        position_by_title.setdefault(_norm_key(t), s)

    def _source_pos(sec: Dict[str, Any]) -> Optional[int]:
        sid = str(sec.get("id") or "").strip()
        if sid in position:
            return position[sid]
        title = str(sec.get("title") or "")
        key = _norm_key(re.sub(r'^\s*' + _SECNUM + r'\s*', '', title))
        return position_by_title.get(key)

    ordered: List[Tuple[str, int]] = []
    for sec in sections:
        pos = _source_pos(sec)
        if pos is not None:
            label = (str(sec.get("id") or "").strip()
                     or str(sec.get("title") or "")[:40])
            ordered.append((label, pos))
    for i in range(1, len(ordered)):
        if ordered[i][1] < ordered[i - 1][1]:
            failures.append(AuditFailure(
                kind=OUT_OF_ORDER,
                detail=f"{ordered[i][0]} appears after {ordered[i-1][0]} "
                       f"but comes before it in the book",
                section_id=ordered[i][0],
            ))

    # ── 4b. parentage: a section the book never printed must not own sections
    # that it did. A sentence promoted to a section used to adopt every heading
    # after it — one Social Science unit had "Various types of lands gifted by
    # the Chola kings..." holding Monuments, Coins and three more that belong
    # under "Sources". Order alone cannot see this: the top level stayed
    # perfectly ascending while the tree underneath was wrong.
    def _is_source_heading(sec: Dict[str, Any]) -> bool:
        return _source_pos(sec) is not None

    for sec in nodes:
        kids = [k for key in _CHILD_KEYS for k in (sec.get(key) or [])
                if isinstance(k, dict)]
        if not kids or _is_source_heading(sec):
            continue
        adopted = [k for k in kids if _is_source_heading(k)]
        if adopted:
            names = ", ".join(str(k.get("title") or k.get("id") or "?")[:24]
                              for k in adopted[:4])
            failures.append(AuditFailure(
                kind=MIS_NESTED,
                detail=f"section is not a heading in the book yet owns "
                       f"{len(adopted)} that are ({names})",
                section_id=str(sec.get("id") or ""),
                title=str(sec.get("title") or "")[:80],
            ))

    # ── 5. schema conformance ────────────────────────────────────────────────
    for sec in nodes:
        for key, expected in _REQUIRED_KEYS.items():
            if key not in sec:
                failures.append(AuditFailure(
                    kind=SCHEMA_INVALID,
                    detail=f"missing required key {key!r}",
                    section_id=str(sec.get("id") or ""),
                    title=str(sec.get("title") or ""),
                ))
            elif sec[key] is None:
                # None is not "absent but fine": a null title is what produced
                # debate topics generated against "Untitled".
                failures.append(AuditFailure(
                    kind=SCHEMA_INVALID,
                    detail=f"key {key!r} is null",
                    section_id=str(sec.get("id") or ""),
                    title=str(sec.get("title") or ""),
                ))
            elif not isinstance(sec[key], expected):
                failures.append(AuditFailure(
                    kind=SCHEMA_INVALID,
                    detail=f"key {key!r} is {type(sec[key]).__name__}, expected {expected.__name__}",
                    section_id=str(sec.get("id") or ""),
                    title=str(sec.get("title") or ""),
                ))

    stats = {
        "sections_total": len(nodes),
        "top_level_sections": len(sections),
        "source_headings": len(spans),
        "headings_captured": len(spans) - len([f for f in failures if f.kind == MISSING_HEADING]),
        "empty_sections": len([f for f in failures if f.kind == EMPTY_SECTION]),
        "duplicates": len([f for f in failures if f.kind == DUPLICATE]),
        "order_violations": len([f for f in failures if f.kind == OUT_OF_ORDER]),
        "schema_errors": len([f for f in failures if f.kind == SCHEMA_INVALID]),
        "mis_nested": len([f for f in failures if f.kind == MIS_NESTED]),
        "unit_errors": len([f for f in failures if f.kind == UNIT_INVALID]),
        "backmatter_sections": len([f for f in failures if f.kind == BACKMATTER_SECTION]),
        "orphan_prose": len([f for f in failures if f.kind == ORPHAN_PROSE]),
        "box_overfull": len([f for f in failures if f.kind == BOX_OVERFULL]),
        "empty_furniture": len([f for f in failures if f.kind == EMPTY_FURNITURE]),
    }

    blocking = [f for f in failures if f.kind not in _ADVISORY]
    result = AuditResult(passed=not blocking, failures=failures, stats=stats)
    level = logger.info if result.passed else logger.warning
    level(
        f"[Audit] {result.summary()} — {stats['headings_captured']}/{stats['source_headings']} "
        f"headings, {stats['empty_sections']} empty, {stats['duplicates']} duplicate, "
        f"{stats['order_violations']} misordered, {stats['mis_nested']} mis-nested, "
        f"{stats['schema_errors']} schema, {stats['unit_errors']} unit-level, "
        f"{stats['backmatter_sections']} colophon, {stats['orphan_prose']} orphan, "
        f"{stats['box_overfull']} overfull box, {stats['empty_furniture']} empty furniture"
    )
    return result
