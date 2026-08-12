# Term-Wise RAG — Implementation Plan

State-board textbooks ship **split by term** (Term I / II / III). Today the whole
retrieval stack is keyed on `board + class + subject + unit_number`, which is
ambiguous the moment a subject has more than one term book.

---

## 1. Why this is needed (the real bug, not just a nice-to-have)

Term books **restart their unit numbering**. TN State Board Class 6 Science has a
Unit 1 in Term I, *another* Unit 1 in Term II, and *another* in Term III.

Every RAG call in the codebase filters like this:

```python
search_qdrant(query=..., unit_filter=1, subject_filter="Science", class_filter="6")
```

`qdrant_integration.py:930-938` matches `metadata.unit_number == 1` — which today
returns **chunks from all three term books mixed together**. Consequences already
live in the code:

| Where | What breaks |
|---|---|
| `ai_tutor.py:197` | Tutor answers a Term II question using Term I content |
| `quiz_engine.py:373` | Quiz generated from the wrong term's sections |
| `homework_engine.py:135` | Homework questions off-syllabus for the current term |
| `question_bank.py:65` `_get_available_units()` | Unit list has duplicate unit numbers → `_valid_unit_numbers` (line 340) is `[1,1,1,2,2,2,...]`, so the LLM's unit mapping is unrecoverable |
| `app.py:1963` | `document_id` resolution picks an arbitrary term's book |
| `ocr_pipeline.py:4351` | Output dir prefix is `{board}_{class}_{subject}_{stem}` — two term books of the same subject only stay separate by PDF filename |

So `term` is not cosmetic metadata. It is a **required disambiguator** wherever
`unit_number` is used.

### Why a new field, not `part`

`part` (`qdrant_integration.py:68`) already means *sub-book within a subject* —
History / Geography / Civics inside Social Science. Term I Social Science
contains all three parts. The two axes are orthogonal; `term` must be its own
field.

---

## 2. Your doubt, answered: exam papers are on a *different axis* than book terms

> "we are fetching based on term-wise for the RAG connect, but we upload question
> papers halfyearly / quarterly / annually — then how are we connecting to RAG?"

There are two independent axes, and they are related by a **deterministic
mapping**, not by a shared field:

```
CONTENT AXIS  (what the book is)          ASSESSMENT AXIS (what the exam covers)
─────────────────────────────────         ──────────────────────────────────────
term_1  ── units 1..n  ──┐                quarterly    →  [term_1]
term_2  ── units 1..n  ──┼── Qdrant       half_yearly  →  [term_1, term_2]
term_3  ── units 1..n  ──┘   metadata     annual       →  [term_1, term_2, term_3]
                                          revision     →  [term_1, term_2, term_3]
```

**The question-paper upload does NOT take a `term`.** It keeps taking
`exam_name`, and the backend derives a **term scope** — a *list* of terms — from
it. Everything downstream then filters with `MatchAny(term IN scope)` instead of
`MatchValue(term == x)`.

This gives us both directions:

**Forward — scoping retrieval.** A half-yearly paper is scored against
`terms=[term_1, term_2]`. RAG returns only those two books' chunks; Term III
content can never leak into the difficulty scoring or unit mapping.

**Reverse — labelling each question.** `question_bank.py` already asks the LLM to
map every question to a `unit_number` (`question_bank.py:198-212`). Since
`unit → term` is known from the Qdrant unit index, we **derive** each question's
term after scoring and stamp it onto the stored question. That is how one
half-yearly paper ends up with per-question term labels while being uploaded as a
single paper.

So:
- **Upload payload:** `exam_name` (unchanged) `+ class_number, board` (already there)
  `+ optional term_scope` override for schools that deviate.
- **Storage:** paper-level `term_scope: ["term_1","term_2"]`, question-level
  `term: "term_2"` (derived).
- **No admin ever types a term for a question paper.**

### Exam scope (settled 2026-08-10)

Each periodic exam covers **only the term that preceded it** — confirmed with
the product owner:

| Exam | Terms |
|---|---|
| Quarterly | Term 1 |
| Half-yearly | **Term 2 only** (not cumulative) |
| Annual / Public / Revision | Term 1 + 2 + 3 |
| Unit test / monthly | no fixed scope — caller must pass `term_scope` |

Overridable per deployment via `EXAM_TERM_SCOPE_JSON`.

---

## 3. New module: `term_utils.py`

Single source of truth. Nothing else hardcodes term strings.

```python
CANONICAL_TERMS = ["term_1", "term_2", "term_3"]

def normalize_term(raw) -> Optional[str]
    # "1" | 1 | "I" | "Term 1" | "term-1" | "TERM_1" | "Term I"  ->  "term_1"
    # None | "" | "all" | "none"                                 ->  None

def term_label(t) -> str            # "term_1" -> "Term 1"   (for prompts/headers)

EXAM_TERM_SCOPE = {
    "quarterly":   ["term_1"],
    "half_yearly": ["term_1", "term_2"],   # ← the cumulative assumption
    "annual":      ["term_1", "term_2", "term_3"],
    "public":      ["term_1", "term_2", "term_3"],
    "revision":    ["term_1", "term_2", "term_3"],
    "unit_test":   None,                   # caller must supply term explicitly
}

def exam_to_terms(exam_name, override=None) -> Optional[List[str]]
    # fuzzy-normalizes "Half Yearly" / "half-yearly" / "HALFYEARLY" -> half_yearly
    # override (explicit term_scope from the request) always wins
    # unknown exam name -> None (= no term filter, log a warning)
```

**Canonicalize on write, normalize on read.** This deliberately avoids the
`should`-clause explosion that `board_filter` / `subject_filter` currently use
(`qdrant_integration.py:956-975`), where every casing variant gets its own
`FieldCondition`.

---

## 4. Data-model changes (write path)

| File | Change |
|---|---|
| `qdrant_integration.py:57` `ChunkMetadata` | add `term: Optional[str] = None` |
| `qdrant_integration.py:119` `_INDEXES` | add `("metadata.term", "keyword")` |
| `qdrant_integration.py:796` optional-attr loop | add `"term"` to the tuple so it lands in the payload |
| `qdrant_integration.py:214` `_build_context_header` | add `term` → header becomes `State Board \| Class 6 \| Science \| Term 1 \| Unit 1: ...`. **This matters** — the header is embedded with the chunk text, so the term also improves *semantic* recall, not just filtering |
| `qdrant_integration.py:481` `chunk_structured_content` | new `term` param; `_make_meta` (line 523) sets it; per-unit fallback `unit.get("term")` like `part` at line 514 |
| `qdrant_integration.py:820` `process_and_upload_document` | new `term` param, threaded to `chunk_structured_content` |
| `ocr_pipeline.py:4320` `process_pdf` | new `term` param |
| `ocr_pipeline.py:4351` doc-dir prefix | `{board}_{class}_{subject}_{term}_{stem}` — otherwise Term I and Term II books of one subject can collide in `outputs/` |
| `ocr_pipeline.py:4395` `metadata_json` | add `"term"` — needed by the file-based endpoints in §6 |
| `ocr_pipeline.py:~2230` | stamp `term` onto each unit dict in `structured.json`, mirroring the existing `part` correction |
| `pipeline.py:113/269/500` | `process_pdf_file`, `process_pdf_file_subject_aware`, `upload_to_qdrant` all gain `term` |

### Upload endpoints

| Endpoint | Line | Change |
|---|---|---|
| `POST /upload-subject` | `app.py:116` | `term: Optional[str] = Form(None, description="Term for term-split state books: 1/2/3 or 'Term 1'. Omit for non-term boards (CBSE/NCERT).")` |
| `POST /upload-agentic` | `app.py:372` | same |
| `POST /upload_pdf` | `app.py:557` | same |
| `POST /qdrant/{document_id}` | `app.py:956` | `QdrantUploadRequest` (`app.py:75`) gains `term` |

`term` stays **optional everywhere**. CBSE/NCERT books are not term-split and
must keep working with `term=None`.

---

## 5. Search-layer change

`qdrant_integration.py:893` `search_qdrant()` gains:

```python
term_filter: Optional[Union[str, List[str]]] = None,
term_strict: bool = False,
```

Behaviour:

```python
terms = [normalize_term(t) for t in (term_filter if isinstance(term_filter, list) else [term_filter])]
terms = [t for t in terms if t]
if terms:
    if term_strict:
        conditions.append(FieldCondition(key="metadata.term", match=MatchAny(any=terms)))
    else:
        # lenient: also match chunks that carry no term (CBSE books + not-yet-backfilled data)
        conditions.append(Filter(should=[
            FieldCondition(key="metadata.term", match=MatchAny(any=terms)),
            IsEmptyCondition(is_empty=PayloadField(key="metadata.term")),
        ]))
```

**Lenient is the default and this is load-bearing.** A strict `must` on
`metadata.term` would make every existing chunk in the collection invisible the
moment the filter is passed, because none of them have the field yet. Strict
mode gets switched on only after the backfill in §8.

The manual-filter fallback path (`qdrant_integration.py:993-1019`, used when a
Qdrant index is missing) needs the matching term check added, or the fallback
silently ignores the term.

---

## 6. Read endpoints — payload updates

Every one of these takes an optional `term`. Where the caller knows an exam
instead of a term, it passes `exam_name` and the endpoint derives the scope.

| # | Endpoint | Model / line | Downstream to thread through |
|---|---|---|---|
| 1 | `POST /search` | `SearchRequest` `app.py:66` | also missing `board_filter` today — add both |
| 2 | `GET /search` | `app.py:988` | `term` query param |
| 3 | `POST /tutor/ask` | `TutorRequest` `app.py:80` | `ai_tutor.retrieve_context()` `:172` and `ask_tutor()` — both passes, incl. the relaxed fallback at `ai_tutor.py:215` (drop `unit_filter`, **keep** `term_filter`) |
| 4 | `POST /tutor/quiz/generate` | `QuizGenerateRequest` `app.py:1442` | doc-id resolution search `app.py:1957` + `quiz_engine._get_rag_context()` `:362` |
| 5 | `POST /tutor/homework/assign` | `HomeworkAssignRequest` `app.py:1461` | `homework_engine._get_rag_context_for_sections()` `:128` |
| 6 | `POST /tutor/homework/chat` | `HomeworkChatRequest` `app.py:1479` | `homework_engine.py:1045` |
| 7 | `POST /highlight/{explain,summarize,ask,read}` | `app.py:2246/2255/2265` | see note below |
| 8 | `POST /avatar/start` | `AvatarStartRequest` `app.py:2584` | `avatar_engine.py:303` metadata.json filter |
| 9 | `POST /seminar/start` | `SeminarStartRequest` `app.py:2465` | seminar RAG coords |
| 10 | `POST /debate/start` | `DebateStartRequest` `app.py:2404` | |
| 11 | `POST /ppt/session/start` | `PPTSessionStartRequest` `app.py:2511` | store `term` in session coords → `ppt/ppt_rag.py:32` `_search()` |
| 12 | `GET /textbook/structured` | `app.py:1044` | `term` query param, filtered off `metadata.json` (same shape as the `class_number` check at `:1073`) |
| 13 | `GET /textbook/enrichment` | `app.py:1118` | same |
| 14 | `GET /tutor/faq/{document_id}` | `app.py:1503` | |

**Highlight needs one extra fix.** `highlighting.py:362` builds a dedupe id from
`board:class:subject:text:action`. Two terms containing the same sentence would
collide onto one cached point. `term` must go into both the `id_seed` and the
payload `metadata` block at `:372`.

---

## 7. Question-bank flow (the §2 design, concretely)

### `POST /tutor/question-bank/upload-pdf` — `app.py:1599`

```python
exam_name:  str            = Form(...)      # unchanged — "Half Yearly"
term_scope: Optional[str]  = Form(None)     # NEW, override: "1,2"
```

1. `terms = exam_to_terms(exam_name, override=term_scope)`
2. Fix `logical_doc_id` at `app.py:1833`. Today:
   `f"qb_pdf_{board}_{subject}"` — **no class, no term**. Class 6 and Class 10
   Science papers for the same board already share one logical document. Change to:
   `f"qb_pdf_{board}_{class_number}_{subject}_{'-'.join(terms)}"`.
   (`_paper_path()` `question_bank.py:45` already appends `year` + `exam`, so
   papers stay separate per exam once the doc id is correct.)
3. Pass `terms`, `board`, `class_number` into `process_question_paper()`.

### `question_bank.py`

| Method | Line | Change |
|---|---|---|
| `_get_available_units()` | `:65` | new `terms`/`board`/`class_number` args; add `MatchAny` on `metadata.term` to the scroll filter at `:80`. **Return `(unit_number, term, unit_title)` triples**, since unit numbers are no longer unique |
| `_get_rag_context()` | `:123` | pass `term_filter=terms` (plus `board`/`class`, also missing today) |
| `_score_difficulty_with_llm()` | `:148` | unit list in the prompt becomes `Term 1 · Unit 3: Heat` etc.; JSON schema gains `"term"`; `_valid_unit_numbers` (`:211`) becomes a valid `(term, unit)` pair set |
| `process_question_paper()` | `:312` | after scoring, **reverse-map** each question's `unit_number` → `term` from the unit index and stamp it. Store paper-level `term_scope` + `exam_name` |
| `_heuristic_scoring()` fallback | | inherit the paper's term when the scope is a single term; else leave `None` |

### `GET /tutor/question-bank/{document_id}` — `app.py:1893`

Add a `term` query filter, so a Term II revision session can pull only Term II
questions out of a half-yearly paper.

**Net effect:** admin uploads one half-yearly paper → questions land tagged
`term_1` / `term_2` individually → a Term II quiz pulls only its own questions,
and RAG scoring never saw Term III.

---

## 8. Migration / backfill

Existing points have no `metadata.term`. Plan:

1. `scripts/backfill_terms.py` — scroll the collection, group by
   `document_id`, and `client.set_payload()` a term from an operator-supplied
   map (`{document_id: "term_1"}` or `{board/class/subject/unit_range: term}`).
   Dry-run flag first; report how many points are still term-less.
2. Non-term boards (CBSE/NCERT) are **left `None` on purpose** — lenient mode
   keeps matching them.
3. Only after backfill: flip `term_strict` on for state-board callers via
   `TERM_FILTER_STRICT=true`.

**Pin the collection name before running this.** `DEFAULT_COLLECTION_NAME` is
`"gradeup_collection"` (`qdrant_integration.py:43`) but `ai_tutor.py:192` falls
back to `"GradeupAI_Books"`. They disagree, so a backfill run against the wrong
default would silently do nothing. Resolve `QDRANT_COLLECTION_NAME` explicitly
and pass it in. (Worth fixing that inconsistency separately.)

---

## 9. Build order

| Phase | Scope | Risk | Status |
|---|---|---|---|
| **P0** | `term_utils.py`; `ChunkMetadata.term`; payload index; upsert + context header | none — additive, no behaviour change | **DONE** |
| **P1** | Write path: upload endpoints → pipeline → ocr_pipeline → `metadata.json`, doc-dir prefix | low; re-upload one term book to verify payloads | **DONE** |
| **P2** | `search_qdrant(term_filter, term_strict)` + manual-fallback branch | low; lenient default is a no-op when `term=None` | **DONE** |
| **P3** | The 14 read endpoints in §6 | mechanical; all params optional → backward compatible | **DONE** |
| **P4** | Question bank: exam→scope, unit index, reverse term labelling, doc-id fix | **highest** — prompt + LLM contract change, needs a real half-yearly paper to validate | **DONE** |
| **P5** | Backfill script, then flip strict mode | operational | **script DONE; not yet run on prod** |

P0–P3 are independently shippable and additive. P4 is where the design care is
needed and should be validated against an actual quarterly *and* half-yearly
paper before it goes out.

### P0–P2 as built (2026-08-10)

Files: `term_utils.py` (new), `qdrant_integration.py`, `pipeline.py`,
`ocr_pipeline.py`, `document_pipeline_graph.py`, `app.py`.

Endpoints now accepting a term: `/upload-subject`, `/upload-agentic`,
`/upload_pdf` (`term` form field), `/qdrant/{document_id}` (`term` body field),
`GET|POST /search` (`term_filter`, plus the previously missing `board_filter`).

Verified against the live cloud Qdrant on a throwaway collection (deleted
after; `GradeupAI_Books` untouched at 2166 points): no-filter returns
everything; lenient `term_2` returns term_2 + term-less; strict `term_2`
returns term_2 only; scope `["term_1","term_2"]` and `"1,2"` agree; and
`term=3 + unit=1` isolates one book where `unit=1` alone still returns all
three — the collision this whole change exists to fix.

**Two bugs found and fixed while building:**

1. `chunk_structured_content`'s tiny-chunk merger (`qdrant_integration.py:722`)
   merged sub-200-char chunks into the *previous* chunk **across unit
   boundaries**, relabelling them with the earlier unit's metadata — 3 short
   units collapsed into 1 chunk labelled Unit 1. Pre-existing, but it would
   have corrupted `term` too. Merging is now blocked across a unit/term
   boundary; size-merging within a unit is unchanged.
2. The missing-index recovery path in `search_qdrant` printed an emoji, which
   raises `UnicodeEncodeError` on a cp1252 Windows console. The outer handler
   swallowed it, turning a *recoverable* missing index into a silent empty
   result — and passing a term filter is exactly what triggers that path. Those
   prints are now ASCII.

`metadata.term` has been created on `GradeupAI_Books` (the retry did it during
verification), so live term queries no longer hit the recovery path.

Not yet done, by design: no consumer passes a term yet (that's P3), and no
existing chunk carries one (P5). Until the backfill runs, keep `term_strict`
off — strict mode against today's data returns zero, as the verification shows.

### P3 as built (2026-08-10)

Files: `ai_tutor.py`, `quiz_engine.py`, `homework_engine.py`, `highlighting.py`,
`avatar_engine.py`, `seminar_engine.py`, `debate_engine.py`,
`ppt/{ppt_session,ppt_state,ppt_rag,ppt_nodes}.py`, `app.py`.

All 14 endpoints take an optional `term`. Verified by intercepting the real
`search_qdrant` and asserting the `term_filter` it actually received — 8/8
checks passed, including the backward-compatible case (no `term` → `None`, not
a crash). Test artifacts were removed afterwards; `Gradeup_Highlights` is back
at 20 points.

Decisions worth knowing:

- **`ai_tutor`'s relaxed fallback keeps the term.** That second pass drops
  `unit_filter` when the first finds nothing. Dropping the term there too would
  pull in other term books' units — precisely the bleed being filtered out — so
  only the unit is relaxed.
- **The PPT term lives on the session.** `/ppt/session/start` stores it in the
  session coords, so every later `/ppt/suggest` turn inherits the same scope
  without the frontend resending it.
- **The highlight reuse cache is keyed on term.** `id_seed` and the stored
  payload both carry it, and the cache *read* requires an exact term match when
  one is requested. Without this the same sentence appearing in two term books
  collapses onto one cached answer. When no term is requested the filter is
  omitted entirely, so non-term boards are byte-for-byte unchanged.
- **`/tutor/faq/{document_id}` deliberately unchanged.** It is keyed on
  `document_id`, which is already term-unique after P1; a `term` param there
  would be dead weight.

**One more pre-existing bug fixed:** `homework_engine`'s chat path read
`homework.get("board")` / `get("class_number")` for its RAG filter, but
`assign_homework` never wrote those keys — so homework-chat retrieval had
silently never filtered by board or class. Both are now persisted alongside
`term`.

Note: the first term-filtered query against `Gradeup_Highlights` returned a
400 (no `metadata.term` index yet). It degraded exactly as designed — cache
miss, answer regenerated, no user-facing error — and self-healed on the next
store via `ensure_payload_indexes`. Both collections now carry the index.

### P4 as built (2026-08-10)

Files: `question_bank.py`, `app.py`, `term_utils.py`.

The admin still uploads by **exam**, never by term. `exam_to_terms()` derives
the scope; a `term_scope` form field overrides it (and is required for unit
tests, which map to no fixed term).

**Term resolution, in order:**

1. **Single-term exam** (quarterly, half-yearly) → the term is *known*. Every
   question is stamped with it and the model is never asked — the common case
   is fully deterministic.
2. **Multi-term exam** (annual) → the prompt lists `Term N | Unit X: Title`
   pairs, the RAG context headers carry the term, and the model returns a
   `term` alongside `unit_number`. A returned term is honoured only if it is
   inside the scope.
3. **Reverse map** — if the model's term is missing or invalid, and the chosen
   unit exists in exactly one term of the scope, that term is used.
4. **Unresolved** → left `None`. Never guessed.

Other changes: unit discovery is scoped by term (and now also by board and
class, which it never filtered on before); `logical_doc_id` gained class and
term; papers store `term_scope` + `term_distribution`; questions store their
own `term`; `get_questions(term=…)` and `get_stats().by_term` were added.

Verified against a live throwaway Qdrant collection built so unit 1 exists in
**all three** terms — **17/17 checks passed**, including: half-yearly discovery
sees only Term 2 units; unit 2 → term_2 and unit 3 → term_3 by reverse map; an
ambiguous unit 1 resolves to `None` rather than a guess; an out-of-scope model
term is rejected. Collection deleted after; production untouched.

**Deliberate behaviour:** `get_questions(term=X)` drops only questions tagged
with a *different* term. Term-less ones — legacy papers, or the unresolved case
above — appear under every term rather than vanishing from the bank. Recall
over precision, which suits revision use.

**Two more pre-existing bugs fixed:**

1. `_score_difficulty_with_llm`'s final fallback called
   `_heuristic_scoring(questions)` without `start_idx`, so an LLM failure on
   batch 2+ produced `question_index` restarting at 1 and the scores merged
   onto the wrong questions.
2. Emoji in `print()` crashed on a cp1252 (Windows) console. In
   `question_bank`'s unit discovery this is *not* inside a try/except, so it
   would 500 the upload endpoint. There are **581 such print sites across 35
   files**, so rather than edit them all, `app.py` now reconfigures
   stdout/stderr to UTF-8 at import (guarded, no-op on Linux where containers
   already default to UTF-8).

### P5 as built (2026-08-10)

`scripts/backfill_terms.py`. Dry-run is the default; `--apply` is required to
write anything.

```
--report              per-document inventory (full ids, board/class/subject/units/term)
--emit-map PATH       skeleton map listing every unlabelled document
--map PATH            preview the mapping (dry run)
--map PATH --apply    commit
--overwrite           also relabel points that already carry a term
```

The map takes exact `document_id` entries and/or rules matching on
board/class/subject/unit-range. Board and class matching is case- and
format-insensitive because the live data is inconsistent (`State Board` vs
`STATE BOARD`, `07` vs `Class 7` vs `None`).

Verified with a full apply cycle on a throwaway collection — **13/13 checks**,
including that **every non-term metadata field survives the write**. That last
one matters: Qdrant's `set_payload` merges at the *top* level, so the obvious
`payload={"metadata": {"term": …}}` would have replaced the whole metadata
object and destroyed `document_id`, `unit_number`, `subject` on every point.
The script passes `key="metadata"` with `payload={"term": …}` instead. Also
verified: dry run writes nothing, non-term boards are left alone, re-running is
idempotent, and strict filtering works correctly once labelled.

**Not run against production.** `--report` shows 43 documents, **2166/2166
points with no term**, and only 1 document id hints at its term
(`…English_Medium-Term_1-20`). Which book is which term is operator knowledge,
so the mapping has to come from you:

```bash
python scripts/backfill_terms.py --emit-map terms.json   # fill in the 43 entries
python scripts/backfill_terms.py --map terms.json        # preview
python scripts/backfill_terms.py --map terms.json --apply
```

Leave `TERM_FILTER_STRICT` off until the script reports 0 unlabelled points.
Note it does **not** make any API field mandatory — it only stops term-less
chunks matching term-scoped queries.

**Migration note — question-bank document ids changed.** They were
`qb_pdf_{board}_{subject}`, which meant Class 6 and Class 10 papers for one
board+subject already shared a logical document. They are now
`qb_pdf_{board}_{class}_{subject}[_{term_slug}]`. Existing papers stay readable
at their old id (nothing outside `app.py` resolves these ids), but new uploads
land under the new id and will not merge with pre-existing papers. The one
paper currently on disk — `qb_pdf_State_Board_science`, 34 questions — was
re-read through the new code and behaves unchanged.

---

## 10. Verification

- Upload TN Class 6 Science Term I and Term II. Confirm two distinct
  `outputs/` dirs and that Qdrant has `metadata.term` on both sets.
- `search_qdrant(query="heat", unit_filter=1, subject_filter="Science",
  class_filter="6", term_filter="term_2")` → **only** Term II chunks.
- Same call with `term_filter=None` → both terms (backward compatible).
- `/tutor/ask` with `term=2, unit_number=1` → answer cites the Term II unit.
- Upload a half-yearly paper → paper JSON has
  `term_scope: ["term_1","term_2"]` and questions carry a mix of both terms,
  none from Term III.
- Re-run one CBSE upload with no `term` → unchanged behaviour end to end.

---

## 11. Open items

1. **Half-yearly = cumulative or Term II only?** Defaulted to cumulative,
   config-driven. Confirm.
2. **Unit-test / FA papers** map to no fixed term — the upload will require an
   explicit `term_scope` for those. Confirm that's acceptable for admins.
3. Do any state books restart unit numbering *and* reuse unit titles? If yes,
   `unit_title_filter` (`ppt/ppt_rag.py:39`) needs the term filter too — it's
   already in the plan, just noting it's the same failure mode.
