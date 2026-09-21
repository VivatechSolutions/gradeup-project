"""
Where configuration comes from, in one place.

    local (default)        .env / .env.local  - AWS is never contacted
    APP_ENV=production     AWS Secrets Manager - .env files are never read

Both modes end with the values in `os.environ`, so the ~56 existing
`os.getenv("OPENAI_API_KEY")` calls across the codebase keep working unchanged.
New code can use `get_setting()` instead, but nothing has to be migrated for the
app to run. That is deliberate: with secrets no longer baked into the image, any
consumer left reading a variable that nobody populated would silently get None
and fail later as a 401 from the provider - only in production, never locally.

Usage:

    from core.secrets_manager import load_secrets, get_setting
    load_secrets()                          # once, as early as possible
    key = get_setting("OPENAI_API_KEY")     # or plain os.getenv, both work

Environment that selects the source:

    APP_ENV=production          switch to AWS Secrets Manager (default: development)
    AWS_SECRET_ID               secret name (default: Gradeup/env/secrets)
    AWS_SECRETS_REGION          region of that secret (default: us-east-1)

`AWS_SECRETS_REGION` is deliberately NOT `AWS_REGION`: config.py already uses
AWS_REGION for the S3 bucket (default ap-south-1), and reusing it would silently
move S3 traffic to another region.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

from logger import get_logger

logger = get_logger("gradeup.config")


APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV == "production"

SECRET_ID = os.getenv("AWS_SECRET_ID", "Gradeup/env/secrets")
SECRETS_REGION = os.getenv("AWS_SECRETS_REGION", "us-east-1")

# Missing one of these means the app cannot serve its core features - fail fast.
REQUIRED_SETTINGS = (
    "OPENAI_API_KEY",
    "OPENAI_API_KEY_TEXT",
    "MISTRAL_API_KEY",
    "QDRANT_URL",
    "QDRANT_API_KEY",
    "QDRANT_COLLECTION_NAME",
)

# Missing one of these disables a feature but must not stop the container:
# TTS audio, OpenRouter fallback, and Langfuse tracing all degrade gracefully.
OPTIONAL_SETTINGS = (
    "OPENAI_API_KEY_TTS",
    "OPENROUTER_API_KEY",
    "LANGFUSE_SECRET_KEY",
    "LANGFUSE_PUBLIC_KEY",
    "LANGFUSE_BASE_URL",
)


class ConfigurationError(RuntimeError):
    """Raised when application configuration cannot be loaded."""


_loaded = False


@lru_cache(maxsize=1)
def _fetch_aws_secrets() -> Dict[str, Any]:
    """
    The secret's JSON payload, or {} when not running in production.

    The short-circuit matters: without it, any lookup that misses would reach for
    AWS from a developer laptop and fail with a credentials error instead of a
    clear "this key is missing from your .env". lru_cache does not cache
    exceptions, so each miss would retry the call and stall startup.
    """

    if not IS_PRODUCTION:
        return {}

    # Imported lazily so local development never needs boto3 configured.
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError

    try:
        client = boto3.client("secretsmanager", region_name=SECRETS_REGION)
        response = client.get_secret_value(SecretId=SECRET_ID)
    except (ClientError, BotoCoreError) as exc:
        # Safe to log: botocore errors carry the operation and error code, never
        # the secret payload.
        logger.error(
            f"[Config] Could not read secret '{SECRET_ID}' from AWS Secrets Manager "
            f"in {SECRETS_REGION}: {type(exc).__name__}: {exc}"
        )
        raise ConfigurationError("Unable to load application configuration") from exc

    secret_string = response.get("SecretString")

    if not secret_string:
        raise ConfigurationError(
            f"Secret '{SECRET_ID}' has no SecretString (binary secrets are not supported)"
        )

    try:
        values = json.loads(secret_string)
    except json.JSONDecodeError as exc:
        raise ConfigurationError(
            f"Secret '{SECRET_ID}' must contain a JSON object"
        ) from exc

    if not isinstance(values, dict):
        raise ConfigurationError(f"Secret '{SECRET_ID}' must contain a JSON object")

    return values


def load_secrets() -> None:
    """
    Populate os.environ from the appropriate source. Idempotent, so every module
    that needs configuration can call it without coordinating.
    """

    global _loaded

    if _loaded:
        return

    if IS_PRODUCTION:
        secrets = _fetch_aws_secrets()
        applied = 0

        for name, value in secrets.items():
            # An explicitly set environment variable always wins, so a value can
            # be overridden for a one-off debug run without touching the secret.
            if not os.environ.get(name):
                os.environ[name] = str(value)
                applied += 1

        logger.info(
            f"[Config] Loaded {applied} setting(s) from AWS Secrets Manager "
            f"('{SECRET_ID}' in {SECRETS_REGION}); .env files are ignored in production"
        )
    else:
        for env_file in (".env.local", ".env"):
            if Path(env_file).exists():
                # override=False: a variable the process was started with always
                # wins over the file. In the container that is what makes the
                # values docker-compose injects (env_file from Secrets Manager)
                # authoritative even if a stale .env slipped into the image -
                # in Sep 2026 a baked file did exactly that and replaced
                # GEMINI_API_KEY in production with the Langfuse URL.
                load_dotenv(dotenv_path=env_file, override=False)
                logger.info(
                    f"[Config] Local mode - loaded {env_file}; AWS is not contacted. "
                    f"Set APP_ENV=production to read from Secrets Manager."
                )
                break
        else:
            logger.warning(
                "[Config] Local mode - no .env or .env.local found; "
                "falling back to the shell environment"
            )

    _loaded = True


def get_setting(
    name: str,
    *,
    required: bool = True,
    default: Optional[str] = None,
) -> Optional[str]:
    """
    Resolve one setting: process environment, then the AWS secret, then `default`.

    Values are never logged.
    """

    load_secrets()

    value = os.environ.get(name)
    if value:
        return value

    # Empty in local mode; in production the secret is already cached.
    secret_value = _fetch_aws_secrets().get(name)
    if secret_value is not None and str(secret_value) != "":
        return str(secret_value)

    if default is not None:
        return default

    if required:
        raise ConfigurationError(f"Required configuration is missing: {name}")

    return None


def validate_required_settings() -> None:
    """
    Check configuration at startup so a missing key surfaces as one clear error
    instead of a provider 401 hours later. Names are logged, never values.
    """

    load_secrets()

    missing_required = [n for n in REQUIRED_SETTINGS if not os.environ.get(n)]
    missing_optional = [n for n in OPTIONAL_SETTINGS if not os.environ.get(n)]

    if missing_optional:
        logger.warning(
            "[Config] Optional settings absent, those features stay disabled: "
            + ", ".join(missing_optional)
        )

    if missing_required:
        raise ConfigurationError(
            "Missing required configuration: " + ", ".join(missing_required)
        )

    logger.info(
        f"[Config] All {len(REQUIRED_SETTINGS)} required settings present "
        f"(APP_ENV={APP_ENV})"
    )


def clear_secret_cache() -> None:
    """Force the next lookup to re-read the secret. For tests and key rotation."""

    global _loaded

    _fetch_aws_secrets.cache_clear()
    _loaded = False
