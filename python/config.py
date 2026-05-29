"""
Configuration for GradeUp AI Extraction Pipeline
All settings consolidated in one place
"""

import os
from pathlib import Path
from dotenv import load_dotenv

for env_file in (".env.local", ".env"):
    if Path(env_file).exists():
        load_dotenv(dotenv_path=env_file, override=True)
        break

WORKSPACE_ROOT = Path.cwd()
TEXTBOOKS_DIR = WORKSPACE_ROOT / "textbooks"
OUTPUTS_DIR = WORKSPACE_ROOT / "outputs"

# API Keys
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
OPENAI_API_KEY_TEXT = os.getenv("OPENAI_API_KEY_TEXT")
OPENAI_API_KEY_TTS = os.getenv("OPENAI_API_KEY_TTS")

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

# Model Configuration
DEFAULT_OCR_MODEL = "mistral-ocr-latest"  # Mistral OCR for PDF extraction
ENRICHMENT_MODEL = "gpt-4o-mini"          # GPT-4o-mini — stable extraction & safer completions
FALLBACK_MODEL = "gpt-4o"                 # Fallback when content_filter fires on gpt-4o-mini
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
