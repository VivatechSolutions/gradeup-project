# GradeUp AI Extraction Pipeline

A Python-based REST API for intelligent textbook PDF processing — extracting, enriching, and semantically indexing educational content using Mistral OCR, GPT-4o-mini, and Qdrant vector search.

---

## Features

- **PDF OCR Extraction** — Uses Mistral OCR to extract structured content from textbook PDFs.
- **Adaptive Subject Extraction** — Dynamic extraction that handles ANY subject (Science, Maths, Social Science, English) without hardcoded schemas.
- **Content Enrichment** — AI-generated FAQs, key terms, and classroom-style teaching explanations via GPT-4o-mini.
- **Vector Search** — Semantic search powered by OpenAI embeddings stored in Qdrant.
- **Vision Correction** — Automatic fallback to GPT-4o Vision for low-quality OCR pages.
- **Content Validation & Gap Filling** — Integrated verification agent that compares OCR output with structured JSON to auto-fill missing content.
- **PDF Unit Splitting** — Pre-processing tool to split large textbooks into unit-level PDFs for higher extraction accuracy.
- **Observability** — Full pipeline tracing via Langfuse.
- **Audio Storage** — TTS audio files stored on AWS S3 for interactive learning applications.
- **AI Tutor (Interactive Learning)** — Real-time conversational tutor with RAG-based context retrieval from textbooks.
- **Topic-Aware Homework** — Automatically tracks student struggles and assigns targeted homework based on 10+ repeated queries or specific topic requests.
- **Unified Interaction History** — Consolidated student timeline tracking tutor queries, quiz scores, and homework performance in a single JSON record.
- **Question Bank Support** — Admin-uploadable question papers are structured via OCR and indexed for AI-driven practice.

---

## Project Structure

```
/
├── app.py                        # FastAPI application — all REST endpoints
├── pipeline.py                   # Pipeline orchestrator
├── config.py                     # Centralized configuration
├── ocr_pipeline.py               # Mistral OCR extraction & image organization
├── enrichment_pipeline.py        # AI content enrichment
├── qdrant_integration.py         # Vector DB operations
├── verification_pipeline.py      # Verification agent for content correction
├── content_validator.py          # Logic for finding gaps in extraction
├── auto_schema_extractor.py      # UNIVERSAL extraction logic (Adaptive)
├── pdf_unit_splitter.py          # Tool to split PDFs by unit boundaries
├── ai_tutor.py                   # Conversational AI Tutor logic
├── quiz_engine.py                # Quiz generation and grading engine
├── homework_engine.py            # Topic-aware homework assignment logic
├── student_performance.py        # Unified student data & history tracking
├── history_manager.py            # AI Tutor chat history storage
├── langfuse_utils.py             # Observability helpers
├── web_tools.py                  # Wikipedia/web API integration
├── requirements.txt              # Python dependencies
├── textbooks/                    # Input PDF files
├── student_data/                 # Consolidated student JSON performance records
├── quiz_data/                    # Cached and completed quiz assignments
├── homework_data/                # Assigned and submitted homework files
└── outputs/                      # Processed document outputs
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- A running [Qdrant](https://qdrant.tech/) instance (local or cloud)
- API keys for Mistral, OpenAI, and optionally Langfuse and AWS

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd gradeup-extraction

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env.local` or `.env` file in the project root:

```env
# Required
MISTRAL_API_KEY=           # Mistral OCR for PDF extraction
OPENAI_API_KEY_TEXT=       # GPT-4o-mini for enrichment & structuring
OPENAI_API_KEY_TTS=        # OpenAI TTS for audio generation

# Qdrant Vector Database
QDRANT_URL=                # e.g., http://localhost:6333
QDRANT_API_KEY=            # Required for Qdrant Cloud
QDRANT_COLLECTION_NAME=    # e.g., gradeup_collection

# Optional: Langfuse Observability (see "Observability" below)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=              # Default: https://cloud.langfuse.com (US: https://us.cloud.langfuse.com)
LANGFUSE_TRACING_ENVIRONMENT=   # production | staging | development (default: $APP_ENV, else development)
LANGFUSE_RELEASE=               # Optional build/commit marker, for comparing versions

# Optional: AWS S3 for Audio Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=                # Default: ap-south-1
S3_BUCKET_NAME=

# Optional: Avatar teaching visuals (clean web images shown mid-lesson)
AVATAR_VISUALS_ENABLED=true      # Off switch for the whole feature
AVATAR_VISUALS_PER_SECTION=2     # Max pictures attached per section
AVATAR_VISUALS_OPEN_WEB=false    # Allow untrusted hosts (blocklist-only)
AVATAR_VISUALS_MAX_TRIES=6       # Vision checks per picture slot
AVATAR_VISION_MODEL=gemini-3.6-flash  # Must support image input; Google direct on GEMINI_API_KEY

# Gemini is NEVER routed through OpenRouter: any gemini-* / google/gemini-* slug
# (AVATAR_MODEL, AVATAR_LESSON_MODEL, AVATAR_VISION_MODEL, HIGHLIGHT_MODEL,
# AVATAR_IMAGE_MODEL) goes straight to generativelanguage.googleapis.com with
# GEMINI_API_KEY. gemini-2.5-flash is retired there and is mapped to
# gemini-3.6-flash with a warning.
GEMINI_API_KEY=
GEMINI_REASONING_EFFORT=low      # Gemini 3.x thinking is charged against max_tokens; "low" keeps JSON calls answering

# Picture sources are searched in STAGES; the first stage with a picture that
# passes the vision gate wins: the self-hosted SearXNG (SEARXNG_URL, Docker)
# first, then everything else (Commons,
# Wikipedia, Openverse, NASA). Keys are free; a keyed source is skipped when
# its key is empty.
AVATAR_VISUALS_SOURCE_ORDER=searxng,others
AVATAR_VISUALS_SEARXNG_OPEN=true  # SearXNG hits only need to clear the block list

# Avatar lesson pictures (POST /avatar/lesson/build, /avatar/lesson/section)
# Lesson pictures are GENERATED, not searched: 3D renders from the scene the
# planner / teaching writer wrote - hook 2 (question scene + options grid),
# explanation 2 (inline in the text), real world 1, explore 0-1, mystery 1 -
# at most seven a section.
AVATAR_IMAGE_MODEL=gemini-3.1-flash-image   # Google direct on GEMINI_API_KEY
AVATAR_IMAGE_STYLE=                         # override the 3D style sentence prepended to every scene
AVATAR_IMAGE_ASPECT=16:9
AVATAR_IMAGE_GRID_ASPECT=1:1                # the hook's 2x2 option grid
AVATAR_IMAGE_GRID_STYLE=                    # override the grid's style sentence
AVATAR_IMAGES_ENABLED=true
AVATAR_LESSON_EXPLANATION_IMAGES=2          # "[image: ...]" markers the writer places inside the explanation
AVATAR_LESSON_MAX_IMAGES=7                  # hard ceiling on pictures (renders + photos) per section
AVATAR_LESSON_PICTURE_TRIES=4               # vision checks per query for a searched photo
AVATAR_LESSON_PICTURE_GROUNDING=0.34        # share of a search query's words the section must contain
AVATAR_LESSON_MODEL=gemini-3.6-flash        # plan + teaching script
```

### Running the Server

```bash
python app.py
# or
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

The API will be available at `http://localhost:5000`. Interactive docs at `http://localhost:5000/docs`.

---

## API Reference

### System

| Method | Endpoint  | Description                        |
|--------|-----------|------------------------------------|
| GET    | `/health`    | Health check                       |
| GET    | `/status`    | System status and config overview  |
| GET    | `/check-env` | Verify all required keys in .env   |

### Document Management

| Method | Endpoint               | Description                    |
|--------|------------------------|--------------------------------|
| GET    | `/documents`           | List all processed documents   |
| GET    | `/documents/{id}`      | Get details for a document     |
| DELETE | `/documents/{id}`      | Delete a document and its data |

### Processing

| Method | Endpoint               | Description                                          |
|--------|------------------------|------------------------------------------------------|
| POST   | `/split-pdf`           | Split a textbook PDF into unit-level PDFs            |
| POST   | `/upload`              | Upload a PDF and run the full pipeline               |
| POST   | `/upload-agentic`      | Upload a PDF and run the LangGraph pipeline: OCR, vision pass, extraction, audit, then the six-phase avatar lesson per section (pictures + narration), debate topics, Qdrant |
| POST   | `/process/textbooks`   | Batch-process all PDFs in the `textbooks/` directory |
| POST   | `/ocr/{id}`            | Run OCR only on an existing document                 |

#### `/split-pdf` Parameters
- `file`: PDF file to split.
- `subject`: Subject name (helps in boundary detection).

#### `/upload-agentic` Form Parameters

| Parameter             | Type        | Description                                                  |
|-----------------------|-------------|--------------------------------------------------------------|
| `file`                | File        | The PDF file to upload                                       |
| `subject`             | string      | Subject name (e.g. "Science", "Mathematics", "English")      |
| `part`                | string      | Optional: Book/part name (e.g. "History", "Civics")          |
| `board`               | string      | Board name (e.g. "CBSE", "State Board")                      |
| `class_name`          | string      | Optional: class 1-12 or LKG/UKG/Nursery; stored as two digits |
| `term`                | string      | Optional: "1", "2" or "3" for term-split books; omit for CBSE/NCERT |
| `skip_enrichment`     | boolean     | Skip enrichment step                                         |
| `skip_qdrant`         | boolean     | Skip Qdrant upload                                           |
| `skip_llm_refinement` | boolean     | Skip LLM verification                                        |

### Enrichment & Validation

| Method | Endpoint               | Description                                      |
|--------|------------------------|--------------------------------------------------|
| POST   | `/enrich/{id}`         | Run AI enrichment on an extracted document       |
| GET    | `/enrich/{id}`         | Retrieve enrichment data for a document          |
| POST   | `/verify/{id}`         | Verify and correct structured JSON against OCR   |
| POST   | `/validate/{id}`       | Run automated gap-filling validation             |
| POST   | `/enrichment/section`  | Enrich one section (avatar script + visuals), no audio |

### Avatar Teaching Visuals

Avatar lessons attach real teaching pictures to the segments that are clearer
with one. Images are sourced from Wikimedia Commons first, then a trusted-host
allowlist (`.gov`, `.edu`, NASA, NIH, OpenStax, Unsplash), and
every candidate must clear three gates before it is used:

1. **Host** — coaching platforms (Byju's, Vedantu, Toppr, Doubtnut …) and
   stock-photo hosts are rejected outright, along with watermark markers in the
   URL or title.
2. **Pixels** — decoded with Pillow, rejected if too small, extremely
   elongated, or near-blank; survivors are re-encoded to JPEG, which strips
   EXIF and embedded metadata.
3. **Vision** — a vision model looks at the image and must confirm it is
   on-topic, is a real photo or diagram, and carries no watermark, stamped logo
   or site branding.

Only images clearing all three are uploaded to
`avatar-visuals/{board}/{class}/{subject}/unit-{n}/` on S3. The same vision call
writes the avatar's spoken explanation, which is folded into that segment's
`text` — so enrichment-time TTS voices it with no extra call — plus a
`look_prompt` question that makes the segment two-way. When nothing clean is
found, the lesson simply plays without a picture.

**Raising a hand is picture-aware.** `/avatar/raise-hand` needs no change from
the client: when the paused segment is showing a picture, the doubt is answered
by a model that is looking at that image, so "what is the thick red one on the
left?" gets a real answer. The response keeps its usual
`clarification.segments` shape and simply gains `answered_from_visual: true` and
a `visual_context` block (`image_url`, `shows`, `points_at`). With no picture on
screen — or if the image cannot be read — it falls back to the normal
text-only clarification.

| Method | Endpoint                  | Description                                        |
|--------|---------------------------|----------------------------------------------------|
| POST   | `/avatar/raise-hand`      | Doubts; answered from the picture automatically when one is on screen |

### The six-phase lesson (`/avatar/lesson/build`, `/avatar/lesson/section`)

Play order: **hook → explanation → real_world → explore → mystery → explain_back**.

- **hook** — a four-option MCQ (`A`–`D`) with a stored reason and a spoken
  resolution per option, with TWO pictures: `visual` is the question scene
  (the calm moment before anything happens, never an outcome) and
  `options_visual` is ONE picture made of four panels, each showing one
  option's outcome and badged A/B/C/D in its corner (`layout: "option_grid"`,
  `panels` → corner per option), so the student compares the outcomes
  visually and picks.
- **explanation** — teaching segments only, spoken straight through (no
  checkpoints, cards or questions), as long as the section warrants. Two
  pictures sit *inside* the text: a segment's `text` carries `[<image_url>]`
  at the exact spot where the avatar says "let me show you", so the client
  pops the picture up there and keeps reading; the segment also carries
  `visual` (`image_url`, `prompt`, `char_offset`). Narration never reads the
  URL (`avatar_text_utils.strip_inline_images`).
- **real_world** — question, tap-to-reveal example, picture.
- **explore** — the activity (the textbook's own when it has one), optional
  challenge, and a picture of the set-up when the planner asked for one.
- **mystery** — one picture, "what is going on here?", three options.
- **explain_back** — the student's own explanation, judged live.

Every picture is either a **generated 3D render** (`avatar_images.py`,
`AVATAR_IMAGE_MODEL` on `GEMINI_API_KEY`) of a scene the planner or writer
wrote, or — where the subject's `picture_policy` says the real thing matters
(history and geography: inscriptions, grants, coins, monuments, maps) — a
**real photo** found by the web search + vision gate (`avatar_visuals.find_visual`,
`visual.kind: "photo"` with `source_name` / `page_url` / `license`). The planner
marks each picture `image_source: "generate" | "search"`; inside the
explanation the writer uses `[image: scene]` or `[photo: query | must show]`.
A search that finds nothing clean falls back to a render marked
`fallback_from: "search"`. At most seven pictures a section. The teaching
voice is per subject (`teach_guidance`): a historian telling a story for
history, a geographer reading a map, a scientist predicting and observing.
Nothing inside the lesson waits for, or has to judge, a picture answer;
answers are taken in the hook, explore, mystery and explain-back phases.

`/upload-agentic` builds the same lesson: its enrichment stage
(`agents/enrichment_agent.py`) runs `build_section_lesson` on every section
`eligible_sections` covers — science / social science: the Introduction and
each section, maths: each section, English: prose / poem / supplementary —
and nothing else. An exercise, an activity, a definition box or a figure
caption never gets a lesson of its own: a box the extractor filed next to a
section is folded into that section's lesson text (`folded` in the target,
`doubt_context.covers` in the stored enrichment). Each section is logged as
it goes (`[enrich] Unit 1 'X' — section 2/7 'Y': building the lesson …`,
then `[lesson] 'Y': planning … / writing the teaching script … / rendering
the pictures … / narrating N spoken node(s) … / narration done …`, then
`stored — 212s, phases=[…], 6 picture(s), 44 audio file(s)`) and written into
`enriched.json` the moment it is finished, so a crash keeps every finished
section and `/avatar/lesson/build` (without `force`) can complete the rest.

| Method | Endpoint                          | Description                                   |
|--------|-----------------------------------|-----------------------------------------------|
| POST   | `/avatar/phase/hook`              | Phase 1 — answer the hook MCQ                 |
| POST   | `/avatar/phase/real-world/reveal` | Phase 3 — reveal the real-world example       |
| POST   | `/avatar/phase/explore`           | Phase 4 — the activity / challenge response   |
| POST   | `/avatar/phase/mystery`           | Phase 5 — answer the mystery picture          |
| POST   | `/avatar/phase/explain`           | Phase 6 — the student's own explanation       |

### Vector Search

| Method | Endpoint        | Description                                  |
|--------|-----------------|----------------------------------------------|
| POST   | `/qdrant/{id}`  | Upload document embeddings to Qdrant         |
| POST   | `/search`       | Semantic search (POST body)                  |
| GET    | `/search`       | Semantic search (query params)               |

### AI Tutor & Performance

| Method | Endpoint                    | Description                                         |
|--------|-----------------------------|-----------------------------------------------------|
| POST   | `/tutor/ask`                | Ask the AI Tutor a question (RAG + History)         |
| POST   | `/tutor/quiz/generate`      | Generate a topic-aware quiz for a student           |
| POST   | `/tutor/quiz/submit`        | Submit quiz answers and record scores               |
| POST   | `/tutor/homework/assign`    | Manually assign weakest-area homework               |
| POST   | `/tutor/homework/submit`    | Submit homework for AI-based grading                |
| POST   | `/tutor/homework/chat`      | Interactive homework helper chat turn               |
| GET    | `/tutor/homework/chat/{stu_id}/{hw_id}` | Reopen a helper chat with its full transcript |
| GET    | `/tutor/history/{stu_id}`   | Get unified interaction history for a student       |
| POST   | `/admin/question_bank/upload`| Admin PDF upload for Past Paper indexing           |

---

## AI Tutor Intelligent Logic

### 1. Topic Tracking & Focus Detection
The system tracks every question asked in the AI Tutor. If a student asks **4+ questions** about the same section, it is flagged as a "Focus Topic".

### 2. 10-Conversation Auto-Homework Rule
The AI Tutor enforces a strict academic rigor:
- If a student explicitly asks for homework but has asked **< 10 questions** on the topic, the AI will refuse: *"We are doing well! Keep asking questions if you have doubts."*
- Upon the **10th question** on a specific topic, the system **automatically triggers** a background homework assignment targeting that exact concept.

### 3. Unified Interaction History
All student data is stored in `student_data/<candidate_id>.json`. This file acts as the single source of truth for the student dashboard, containing:
- **`topic_queries`**: Counters for every textbook section investigated.
- **`interaction_history`**: A chronological timeline of all tutor chats, quizzes, and homework.

---

## Processing Pipeline

```
PDF Upload / Split
    │
    ▼
Mistral OCR Extraction  →  content.md (raw markdown)
    │
    ▼
Adaptive Structuring    →  structured.json (units, chapters, exercises)
    │                        The text under the chapter heading is the unit's
    │                        "Introduction" section — never a section named
    │                        after the chapter (auto_schema_extractor.name_unit_intro)
    ▼
Verification Agent      →  Identifies and fills extraction gaps
    │
    ▼
Content Enrichment      →  enriched.json — the six-phase avatar lesson per
    │                        SECTION (hook → explanation → real_world → explore
    │                        → mystery → explain_back) with pictures, narration,
    │                        FAQs and practice questions; stored section by section
    │
    ▼
Qdrant Embedding Upload →  Semantic search index
```

---

## Output Structure

Processed documents are stored under `outputs/<document_id>/`:

```
outputs/
└── <document_id>/
    ├── content.md        # Raw OCR markdown
    ├── structured.json   # Structured units/chapters
    ├── enriched.json     # AI-enriched content
    ├── validation_report.json # Report on extraction coverage
    ├── metadata.json     # Processing metadata
    ├── images/           # Extracted images sorted by unit
    │   └── unit_1/       # Images appearing in Unit 1
    └── <original>.pdf    # Copy of original PDF
```

---
## Configuration Reference

Key settings in `config.py`:

| Setting                  | Default                    | Description                      |
|--------------------------|----------------------------|----------------------------------|
| `DEFAULT_OCR_MODEL`      | `mistral-ocr-4-1`          | Mistral OCR model (`MISTRAL_OCR_MODEL`) |
| `ENRICHMENT_MODEL`       | `gpt-4o-mini`              | OpenAI model for enrichment      |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small`   | Embedding model for Qdrant       |
| `SIMILARITY_THRESHOLD`   | `0.8`                      | Qdrant similarity cutoff         |

---

## Observability

Tracing runs on **Langfuse** (Python SDK v4) and turns itself on when
`LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` are set. With no keys, every
helper degrades to a no-op — tracing is never load-bearing, and a Langfuse
outage cannot fail a request.

**What is traced**

Every LLM call in the codebase is instrumented. Model, token usage and cost
land on each `generation`, so per-feature and per-user spend is answerable.

| Surface | What you get |
| --- | --- |
| Every API request | One trace per request, named for the route template (`POST /tutor/ask`). Health, docs and unmatched paths (404s, scanner probes) are excluded. |
| Tutor, homework, quiz, debate, seminar, English, highlighting, guardrails, question bank, PPT review | One `generation` per call via `traced_post`, named for the step (`answer-tutor-question`, `evaluate-homework-answers`, `classify-intent`…). |
| Extraction, verification, gap filling, schema discovery, repair | Same, named per step (`extract-with-schema`, `re-extract-unit`, `fill-content-gap`…). |
| Avatar classroom (`avatar_llm.chat`) | One `generation` per HTTP attempt. Retries and model fallbacks appear as their own generations, so a fallback's cost is its own. |
| Enrichment (LangChain) | Langfuse callback handler on the `ChatOpenAI` clients. |
| Unit splitting | Langfuse's OpenAI drop-in client. |
| Mistral OCR / TTS | `generation` with page count / audio size. |
| Document + verification pipelines | A `chain` root observation, so a whole run is one trace instead of one trace per model call. |

`session_id` and `student_id` are picked up from the query string or the
`X-Session-Id` / `X-Student-Id` headers. Handlers that read them from a JSON
body should add them with a nested `trace_context(...)`.

**Instrumenting a new LLM call**

For an OpenAI-compatible endpoint, swap `requests.post` for `traced_post` and
give it a name — nothing else changes, including the return value:

```python
from langfuse_utils import traced_post

resp = traced_post("grade-answer", url, headers=headers, json=payload, timeout=60)
```

For anything else, wrap it by hand:

```python
from langfuse_utils import trace_context, generation, record_openai_usage

with trace_context(trace_name="grade-homework", session_id=sid, user_id=student_id,
                   tags=["homework"], metadata={"subject": subject}):
    with generation(name="grade-answer", model=model, input=messages) as gen:
        body = call_model(payload)
        record_openai_usage(gen, body, model=model, output=text)
```

**Two things that silently break a trace**

*Threads.* `ThreadPoolExecutor.submit` and `threading.Thread` start the worker
with an empty context, so a span created inside one detaches into a trace of
its own. Wrap the callable — once per submission:

```python
from langfuse_utils import in_current_context

pool.submit(in_current_context(work), item)      # not: pool.submit(work, item)
```

*Identity in a request body.* The middleware cannot read `candidate_id` out of
a POST body without draining the stream, so engine entry points declare it:

```python
from langfuse_utils import with_student_context

@with_student_context(session_arg="homework_id")
def execute_socratic_chat_turn(self, candidate_id, homework_id, ...):
```

**Two rules worth knowing**

- **Name the call after what it does**, verb first (`classify-intent`, not
  `gpt-4o-call`). Evaluators and dashboards target observations by name, and
  names that contain a model or an ID stop matching the moment either changes.
- **Attributes propagate forward, not backward.** On SDK v4 `user_id`,
  `session_id`, `tags` and the trace name reach observations created *inside*
  `trace_context(...)`. Setting them after the work has run records nothing —
  this is why the old `update_trace_safely(name=...)` calls were silently
  no-ops.

**Privacy.** Structured PII — emails, phone numbers, Aadhaar-shaped digit runs
— and any API key or bearer token are redacted from span attributes before
export. Free-text student names in prompts are *not* detectable by pattern, so
treat the Langfuse project as holding student-authored content and scope
access accordingly.

---

## License

This project is proprietary to GradeUp. All rights reserved.
