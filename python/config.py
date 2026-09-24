"""
Configuration for GradeUp AI Extraction Pipeline
All settings consolidated in one place
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.secrets_manager import load_secrets

# Fills os.environ - from .env locally, from AWS Secrets Manager when
# APP_ENV=production. Must run before the os.getenv() calls below, which are
# evaluated at import time.
load_secrets()

WORKSPACE_ROOT = Path.cwd()
TEXTBOOKS_DIR = WORKSPACE_ROOT / "textbooks"
OUTPUTS_DIR = WORKSPACE_ROOT / "outputs"

# API Keys
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
OPENAI_API_KEY_TEXT = os.getenv("OPENAI_API_KEY_TEXT")
OPENAI_API_KEY_TTS = os.getenv("OPENAI_API_KEY_TTS")

# OpenRouter API Key — used for LLM extraction (Llama 4 Scout)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Qdrant Vector Database
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "gradeup_collection")

# Langfuse Observability
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
LANGFUSE_BASE_URL = os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")

# AWS S3 for Image & Audio Storage
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# ── Extraction LLM — OpenRouter / Qwen3-235B ──────────────────────────────────
# Qwen3-235B (text-only) via OpenRouter for structure discovery + chunked
# extraction + gap fill. It replaced Llama 4 Scout: Scout has a single OpenRouter
# provider that serves JSON mode with a >=16k output budget, and that pool 429s
# under load (now 404 "No endpoints found"), losing whole chunks. Qwen3-235B has
# ~11 such providers. Production runs with no .env in the image, so this default
# is what runs unless EXTRACTION_MODEL is set in the deploy secrets. TTS and
# embeddings still use OpenAI.
OPENROUTER_BASE_URL   = "https://openrouter.ai/api/v1/chat/completions"
EXTRACTION_MODEL      = os.getenv("EXTRACTION_MODEL", "qwen/qwen3-235b-a22b-2507")
EXTRACTION_MODEL_MATH = os.getenv("EXTRACTION_MODEL_MATH", "qwen/qwen3-235b-a22b-2507")
OPENROUTER_APP_NAME   = "GradeUp-AI"
OPENROUTER_APP_URL    = "https://gradeupapi.careeriq.ai"

# The vision pass (text box or illustration?) needs a model that accepts image
# input, which the text-only extraction model does not — so this is its own
# setting, not an alias of EXTRACTION_MODEL. Default to a multimodal model
# rather than inheriting a text-only one and breaking the pass.
VISION_MODEL          = os.getenv("VISION_MODEL", "qwen/qwen3-vl-235b-a22b-instruct")

# Model-level fallback for the vision pass ONLY. OPENROUTER_FALLBACK_MODELS is
# global and would also swap the extraction model mid-run.
VISION_FALLBACK_MODELS: List[str] = [
    m.strip() for m in os.getenv("VISION_FALLBACK_MODELS", "").split(",") if m.strip()
]

# One unit per request. The old 15,000-char chunking existed only for
# gpt-4o-mini's window and was actively harmful: a unit split mid-exercise loses
# whole question blocks at the merge.
#
# Sized by OUTPUT tokens, which is the binding limit — not the context window.
# Extraction echoes the unit back as JSON, so a chunk of N chars costs roughly
# 1.2N chars of completion. Providers cap output far below their context:
# DeepInfra 16,384 tokens, Novita 117,964, Google Vertex only 8,192. A 100k-char
# unit needs ~30k output tokens, so a single-chunk call hit finish_reason=length
# and lost the whole tail of every long unit silently.
#
# 35k chars (~9k tokens in, ~11k out) completes inside every provider's cap.
# _split_into_chunks flushes on section boundaries and hard-flushes on exercise
# headings, so the mid-exercise splits that motivated the old 300k value do not
# come back at this size.
EXTRACTION_MAX_CHUNK_CHARS = int(os.getenv("EXTRACTION_MAX_CHUNK_CHARS", "35000"))
EXTRACTION_CHUNK_OVERLAP   = int(os.getenv("EXTRACTION_CHUNK_OVERLAP", "2000"))

# ── OpenRouter provider routing ───────────────────────────────────────────────
# One model is served by several upstream providers, and OpenRouter's shared
# pool for any one of them runs out independently — "temporarily rate-limited
# upstream", provider_error_code=engine_overloaded. Retrying the same request
# then hits the same wall, which is how a whole extraction burned all three
# attempts against DeepInfra without ever trying the other two providers.
#
# Measured behaviour, not the docs' promise: pinning "order" to a provider
# routes there almost every time (5/5 in testing) — so ordering DeepInfra first
# because it is cheapest sends every request straight back into the overloaded
# pool. Leaving the block off entirely lets OpenRouter load balance, which
# measurably spread across all three providers. So routing is OFF by default;
# these knobs exist to steer around a provider that is having a bad day, and to
# pin extraction to one with the output headroom it needs.
#
# Slugs come from https://openrouter.ai/api/v1/providers.
#
#   OPENROUTER_PROVIDER_ORDER   comma-separated slugs to prefer; blank = balance
#   OPENROUTER_PROVIDER_IGNORE  comma-separated slugs to exclude outright — the
#                               lever for an overloaded provider, e.g. deepinfra
#   OPENROUTER_PROVIDER_SORT    "price" | "throughput" | "latency" (optional)
#   OPENROUTER_FALLBACK_MODELS  comma-separated models to try when every
#                               provider for the primary is unavailable
OPENROUTER_PROVIDER_ORDER: List[str] = [
    p.strip()
    for p in os.getenv("OPENROUTER_PROVIDER_ORDER", "").split(",")
    if p.strip()
]
OPENROUTER_PROVIDER_IGNORE: List[str] = [
    p.strip()
    for p in os.getenv("OPENROUTER_PROVIDER_IGNORE", "").split(",")
    if p.strip()
]
OPENROUTER_PROVIDER_SORT = os.getenv("OPENROUTER_PROVIDER_SORT", "").strip()
OPENROUTER_FALLBACK_MODELS: List[str] = [
    m.strip() for m in os.getenv("OPENROUTER_FALLBACK_MODELS", "").split(",") if m.strip()
]


def openrouter_routing(model: Optional[str] = None) -> Dict[str, Any]:
    """Request-body fields that let a rate-limited provider fall through.

    Merge into any OpenRouter chat payload. Returns {} when routing is turned
    off, so callers can splat it unconditionally.
    """
    routing: Dict[str, Any] = {}

    provider: Dict[str, Any] = {}
    if OPENROUTER_PROVIDER_ORDER:
        provider["order"] = OPENROUTER_PROVIDER_ORDER
    if OPENROUTER_PROVIDER_IGNORE:
        provider["ignore"] = OPENROUTER_PROVIDER_IGNORE
    if OPENROUTER_PROVIDER_SORT:
        provider["sort"] = OPENROUTER_PROVIDER_SORT
    if provider:
        # Always on: a preference that cannot fall back is a single point of
        # failure, and "no endpoints found" is a worse error than a slow one.
        provider["allow_fallbacks"] = True
        routing["provider"] = provider

    # Model-level fallback is a second line of defence, for when every provider
    # serving the primary is down. Off unless configured, because swapping the
    # model silently changes extraction quality.
    if model and OPENROUTER_FALLBACK_MODELS:
        routing["models"] = [model, *OPENROUTER_FALLBACK_MODELS]

    return routing


# ── Other Model Configuration ─────────────────────────────────────────────────
# Mistral OCR for PDF extraction. Pinned to the current release instead of the
# "-latest" alias (which resolved to this id on 2026-09-22) so extraction
# quality does not shift under an upstream upgrade. Live value is
# DEFAULT_MODEL in ocr_pipeline.py; both read MISTRAL_OCR_MODEL.
DEFAULT_OCR_MODEL = os.getenv("MISTRAL_OCR_MODEL", "mistral-ocr-4-1")
# Enrichment now runs on OpenRouter / Llama 4 Scout; the live setting is
# ENRICHMENT_MODEL_DEFAULT in enrichment_pipeline.py, read from the
# ENRICHMENT_MODEL env var. This constant is unused and kept for reference.
ENRICHMENT_MODEL = os.getenv("ENRICHMENT_MODEL", EXTRACTION_MODEL)
FALLBACK_MODEL = "gpt-4o"                 # OpenAI fallback (TTS + vision path)
OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"  # OpenAI embeddings for Qdrant
VECTOR_SIZE = 1536

# Search & Retrieval
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.6"))
TOP_K = int(os.getenv("TOP_K", "3"))
AUDIO_TEMP_DIR = os.getenv("AUDIO_TEMP_DIR", "./audio_files")

# Pipeline Settings
BATCH_SIZE = 10
MAX_RETRIES = 3
RETRY_DELAY = 5
RATE_LIMIT_DELAY = 0.5
REQUEST_TIMEOUT = 30
LLM_TIMEOUT = 300
LLM_MAX_CONTENT_LENGTH = 100000

# Ensure directories exist
# TEXTBOOKS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
# Path(AUDIO_TEMP_DIR).mkdir(parents=True, exist_ok=True)
