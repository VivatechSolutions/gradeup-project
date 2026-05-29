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

# Optional: Langfuse Observability
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=         # Default: https://cloud.langfuse.com

# Optional: AWS S3 for Audio Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=                # Default: ap-south-1
S3_BUCKET_NAME=
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
| POST   | `/upload-subject`      | Upload a PDF with subject-aware extraction           |
| POST   | `/process/textbooks`   | Batch-process all PDFs in the `textbooks/` directory |
| POST   | `/ocr/{id}`            | Run OCR only on an existing document                 |

#### `/split-pdf` Parameters
- `file`: PDF file to split.
- `subject`: Subject name (helps in boundary detection).

#### `/upload-subject` Form Parameters

| Parameter             | Type        | Description                                                  |
|-----------------------|-------------|--------------------------------------------------------------|
| `file`                | File        | The PDF file to upload                                       |
| `subject`             | string      | Subject name (e.g. "Science", "Mathematics", "English")      |
| `part`                | string      | Optional: Book/part name (e.g. "History", "Civics")          |
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
    │
    ▼
Verification Agent      →  Identifies and fills extraction gaps
    │
    ▼
Content Enrichment      →  enriched.json (FAQs, pedagogy, teaching hooks)
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
| `DEFAULT_OCR_MODEL`      | `mistral-ocr-latest`       | Mistral OCR model                |
| `ENRICHMENT_MODEL`       | `gpt-4o-mini`              | OpenAI model for enrichment      |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small`   | Embedding model for Qdrant       |
| `SIMILARITY_THRESHOLD`   | `0.8`                      | Qdrant similarity cutoff         |

---

## Observability

The pipeline automatically traces all operations via **Langfuse** if keys are provided, allowing monitoring of token usage, latency, and LLM output quality.

---

## License

This project is proprietary to GradeUp. All rights reserved.
