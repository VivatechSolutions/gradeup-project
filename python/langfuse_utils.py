"""
Langfuse tracing for GradeUp (Langfuse Python SDK v4).

Every LLM path in this codebase talks to an OpenAI-compatible endpoint over
raw ``requests.post`` (OpenRouter, OpenAI, Gemini) or through LangChain, so
there is no drop-in framework integration that covers all of it. This module
is the shared instrumentation layer instead:

    from langfuse_utils import trace_context, generation, record_openai_usage

    with trace_context(trace_name="ai-tutor-answer", session_id=sid, user_id=uid):
        with generation(name="answer-question", model=model, input=messages) as gen:
            body = requests.post(...).json()
            record_openai_usage(gen, body, model=model)

Design notes
------------
*   **Never raises.** Tracing is observability, not business logic. Every entry
    point degrades to a no-op if Langfuse is unconfigured, uninstalled or
    erroring, so a Langfuse outage can never take an extraction run down.
*   **Import order matters.** The client is built lazily on first use, not at
    import time, so callers that ``load_dotenv()`` after importing this module
    still get credentials.
*   **v4 API.** ``update_current_trace``, ``start_span`` and
    ``start_generation`` were removed in v4. Correlating attributes
    (user/session/tags/trace name) now propagate via ``propagate_attributes()``
    rather than being set imperatively on the trace.
"""

from __future__ import annotations

import os
import re
import contextvars
import threading
from contextlib import contextmanager, nullcontext
from functools import wraps
from typing import Any, Dict, Iterator, Optional, Sequence, Tuple

from logger import get_logger

logger = get_logger(__name__)

try:
    from langfuse import Langfuse, observe, propagate_attributes
    from langfuse.types import (
        MaskOtelSpansParams,
        MaskOtelSpansResult,
        OtelSpanPatch,
    )
    LANGFUSE_AVAILABLE = True
except ImportError:  # langfuse not installed - every helper below no-ops
    LANGFUSE_AVAILABLE = False
    logger.info("langfuse not installed; tracing disabled "
                "(pip install langfuse>=4,<5 to enable)")


# ==============================================================================
#  MASKING
# ==============================================================================
# GradeUp traces carry student homework, chat turns and teacher prompts. The
# structured identifiers below are redacted at export time so they never reach
# Langfuse, while the surrounding prompt text stays intact and debuggable.
#
# NOTE: this catches *structured* PII (contact details, credentials, long digit
# runs). It cannot catch a student's name in free prose - treat the Langfuse
# project as holding student-authored text and scope access accordingly.

_MASK_PATTERNS: Sequence[Tuple[Any, str]] = (
    # Credentials first: these must never survive, and they are unambiguous.
    (re.compile(r"\bsk-[A-Za-z0-9_\-]{16,}"),              "[REDACTED_API_KEY]"),
    (re.compile(r"\bpk-lf-[A-Za-z0-9_\-]{8,}"),            "[REDACTED_API_KEY]"),
    (re.compile(r"\bAIza[A-Za-z0-9_\-]{20,}"),             "[REDACTED_API_KEY]"),
    (re.compile(r"\bBearer\s+[A-Za-z0-9._\-]{16,}"),       "[REDACTED_TOKEN]"),
    (re.compile(r"\bey[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]+"),
                                                           "[REDACTED_JWT]"),
    # Contact details.
    (re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"),          "[REDACTED_EMAIL]"),
    (re.compile(r"(?<!\d)(?:\+91[-\s]?)?[6-9]\d{9}(?!\d)"), "[REDACTED_PHONE]"),
    # Aadhaar-shaped 12-digit runs (Indian student records).
    (re.compile(r"(?<!\d)\d{4}[-\s]?\d{4}[-\s]?\d{4}(?!\d)"), "[REDACTED_ID]"),
)

# Attribute keys whose *entire* value is dropped rather than pattern-scrubbed.
_MASK_KEY_SUBSTRINGS = ("api_key", "apikey", "authorization", "secret",
                        "password", "access_token", "refresh_token")


def _mask_text(value: str) -> str:
    for pattern, replacement in _MASK_PATTERNS:
        value = pattern.sub(replacement, value)
    return value


def _mask_otel_spans(*, params: "MaskOtelSpansParams") -> Optional["MaskOtelSpansResult"]:
    """Redact structured PII/credentials from span attributes before export.

    Runs on the OTel batch-export worker thread, so it stays pure and cheap:
    regex only, no I/O. A raise here would drop the whole export batch, hence
    the blanket except.
    """
    try:
        patches: Dict[Any, Any] = {}
        for identifier, span in params.spans.items():
            replacements: Dict[str, Any] = {}
            for key, value in span.attributes.items():
                if not isinstance(value, str):
                    continue
                lowered = key.lower()
                if any(s in lowered for s in _MASK_KEY_SUBSTRINGS):
                    replacements[key] = "[REDACTED]"
                    continue
                masked = _mask_text(value)
                if masked != value:
                    replacements[key] = masked
            if replacements:
                patches[identifier] = OtelSpanPatch(set_attributes=replacements)
        return MaskOtelSpansResult(span_patches=patches) if patches else None
    except Exception as e:  # never break the export pipeline
        logger.warning(f"[langfuse] masking failed, batch exported unmasked: {e}")
        return None


# ==============================================================================
#  CLIENT
# ==============================================================================

_client: Optional[Any] = None
_client_lock = threading.Lock()
_init_attempted = False


def _build_client() -> Optional[Any]:
    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
    # The rest of the codebase standardised on LANGFUSE_BASE_URL; the SDK also
    # reads LANGFUSE_HOST. Accept either so a single .env entry is enough.
    base_url = (os.environ.get("LANGFUSE_BASE_URL")
                or os.environ.get("LANGFUSE_HOST")
                or "https://cloud.langfuse.com")

    if not (public_key and secret_key):
        logger.info("[langfuse] LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY not set; "
                    "tracing disabled")
        return None

    try:
        client = Langfuse(
            public_key=public_key,
            secret_key=secret_key,
            base_url=base_url,
            # Keeps dev/staging traces out of production dashboards.
            environment=os.environ.get("LANGFUSE_TRACING_ENVIRONMENT",
                                       os.environ.get("APP_ENV", "development")),
            release=os.environ.get("LANGFUSE_RELEASE"),
            mask_otel_spans=_mask_otel_spans,
        )
        logger.info(f"[langfuse] tracing enabled -> {base_url}")
        return client
    except Exception as e:
        logger.warning(f"[langfuse] client init failed, tracing disabled: {e}")
        return None


def get_langfuse_client() -> Optional[Any]:
    """The process-wide Langfuse client, or None when tracing is off.

    Built on first call rather than at import so that callers which
    ``load_dotenv()`` after importing this module still get credentials.
    """
    global _client, _init_attempted
    if not LANGFUSE_AVAILABLE:
        return None
    if _init_attempted:
        return _client
    with _client_lock:
        if not _init_attempted:
            _client = _build_client()
            _init_attempted = True
    return _client


def tracing_enabled() -> bool:
    return get_langfuse_client() is not None


# ==============================================================================
#  CORE INSTRUMENTATION
# ==============================================================================

def _clean_metadata(metadata: Optional[Dict[str, Any]]) -> Optional[Dict[str, str]]:
    """v4 propagated metadata is dict[str, str] with values capped at 200 chars.

    Longer values are dropped by the SDK with a warning, so truncate here to
    keep the useful prefix instead of losing the key entirely.
    """
    if not metadata:
        return None
    cleaned: Dict[str, str] = {}
    for key, value in metadata.items():
        if value is None:
            continue
        text = value if isinstance(value, str) else str(value)
        cleaned[str(key)] = (text[:197] + "...") if len(text) > 200 else text
    return cleaned or None


def _clean_id(value: Optional[str]) -> Optional[str]:
    """user_id / session_id are validated as <=200-char strings in v4."""
    if value is None:
        return None
    text = str(value)
    return text[:200] if text else None


@contextmanager
def trace_context(*, trace_name: Optional[str] = None,
                  user_id: Optional[str] = None,
                  session_id: Optional[str] = None,
                  tags: Optional[Sequence[str]] = None,
                  metadata: Optional[Dict[str, Any]] = None,
                  version: Optional[str] = None) -> Iterator[None]:
    """Propagate correlating attributes to every observation created inside.

    This is the v4 replacement for ``update_current_trace()``: attributes live
    on each observation rather than only on the trace, so they must be
    established *before* the observations that should inherit them.
    """
    client = get_langfuse_client()
    if client is None:
        yield
        return
    # Only entering the context is guarded. Wrapping the caller's block in the
    # try would swallow its exceptions and yield twice out of one generator.
    try:
        scope = propagate_attributes(
            trace_name=trace_name,
            user_id=_clean_id(user_id),
            session_id=_clean_id(session_id),
            tags=list(tags) if tags else None,
            metadata=_clean_metadata(metadata),
            version=version,
        )
    except Exception as e:
        logger.warning(f"[langfuse] trace_context failed, continuing untraced: {e}")
        yield
        return
    with scope:
        yield


@contextmanager
def observation(name: str, *, as_type: str = "span", **kwargs: Any) -> Iterator[Any]:
    """Start an observation and make it the active parent for its block.

    ``as_type`` should be the most specific type that fits - ``generation`` for
    a model call, ``retriever`` for a lookup, ``tool`` for a tool call,
    ``agent`` for a subagent - because Langfuse's analytics and agent graph key
    off it. Yields the observation handle, or None when tracing is off.
    """
    client = get_langfuse_client()
    if client is None:
        yield None
        return
    # Only starting the observation is guarded. Wrapping the caller's block in
    # the try would swallow its exceptions and yield twice out of one
    # generator; letting them propagate also lets the SDK mark the span failed.
    try:
        scope = client.start_as_current_observation(name=name, as_type=as_type,
                                                    **kwargs)
    except Exception as e:
        logger.warning(f"[langfuse] observation '{name}' failed, continuing "
                       f"untraced: {e}")
        yield None
        return
    with scope as obs:
        yield obs


def generation(name: str, **kwargs: Any):
    """``observation(..., as_type='generation')`` - one model invocation."""
    return observation(name, as_type="generation", **kwargs)


def with_student_context(*, trace_name: Optional[str] = None,
                         user_arg: str = "candidate_id",
                         session_arg: Optional[str] = None,
                         tags: Optional[Sequence[str]] = None) -> Any:
    """Decorate an engine entry point so its LLM calls carry the student's id.

    The API takes ``candidate_id`` in the request body, which the tracing
    middleware cannot read without draining the stream, so identity is attached
    here instead - at the function that already receives it. Without it the
    generations are anonymous and per-user cost and quality are unanswerable.

    A decorator rather than a ``with`` block so the function body is untouched:

        @with_student_context(trace_name="ask-tutor")
        def ask_tutor(query, ..., candidate_id, ...):
    """
    def decorator(func: Any) -> Any:
        try:
            import inspect
            signature = inspect.signature(func)
        except (TypeError, ValueError):  # builtins / C functions
            signature = None

        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            user_id = session_id = None
            if signature is not None:
                try:
                    bound = signature.bind_partial(*args, **kwargs)
                    bound.apply_defaults()
                    user_id = bound.arguments.get(user_arg)
                    if session_arg:
                        session_id = bound.arguments.get(session_arg)
                except TypeError:
                    pass  # odd call shape - trace it without identity
            with trace_context(trace_name=trace_name, user_id=user_id,
                               session_id=session_id, tags=tags):
                return func(*args, **kwargs)

        return wrapper

    return decorator


def in_current_context(func: Any) -> Any:
    """Bind ``func`` to the caller's context so a worker thread keeps the trace.

    ``ThreadPoolExecutor.submit`` and ``threading.Thread`` start the worker with
    a fresh, empty context. OpenTelemetry keeps the active span in a contextvar,
    so without this an observation created inside the worker has no parent and
    becomes the root of its own trace - the fan-out shows up as N orphan traces
    instead of N children of the step that dispatched them.

        pool.submit(in_current_context(work), item)

    Call it once per submission: the returned callable owns a single context
    snapshot and cannot be run twice concurrently.
    """
    ctx = contextvars.copy_context()

    @wraps(func)
    def runner(*args: Any, **kwargs: Any) -> Any:
        return ctx.run(func, *args, **kwargs)

    return runner


def langchain_callbacks() -> list:
    """Callbacks that trace a LangChain/LangGraph run, or [] when tracing is off.

    Attach at client construction (``ChatOpenAI(callbacks=...)``) so every
    invocation is covered without touching each call site. The handler nests
    under whatever observation is active and captures model, tokens and cost
    itself, so LangChain calls need no manual generation.
    """
    if get_langfuse_client() is None:
        return []
    try:
        from langfuse.langchain import CallbackHandler
        return [CallbackHandler()]
    except Exception as e:
        logger.warning(f"[langfuse] LangChain callback unavailable: {e}")
        return []


def update_current_observation(**kwargs: Any) -> None:
    """Set fields on whatever observation is active, without holding a handle.

    Mainly for ``@observe``-decorated functions: the decorator captures every
    argument as input by default, which for a method means ``self`` and any
    config or credentials it carries. Setting input explicitly replaces that.
    """
    client = get_langfuse_client()
    if client is None:
        return
    try:
        client.update_current_span(**kwargs)
    except Exception as e:
        logger.warning(f"[langfuse] update_current_observation failed: {e}")


def update_observation(obs: Optional[Any], **kwargs: Any) -> None:
    """Set fields on an observation handle; no-op when tracing is off."""
    if obs is None:
        return
    try:
        obs.update(**kwargs)
    except Exception as e:
        logger.warning(f"[langfuse] observation update failed: {e}")


# ==============================================================================
#  USAGE / COST
# ==============================================================================

def _exclusive_usage(prompt_tokens: int, completion_tokens: int,
                     cached_tokens: int = 0,
                     reasoning_tokens: int = 0) -> Dict[str, int]:
    """Build mutually exclusive usage buckets.

    Langfuse treats every ``usage_details`` key as a non-overlapping bucket,
    but OpenAI-style responses report *inclusive* counts: ``prompt_tokens``
    already contains cached tokens and ``completion_tokens`` already contains
    reasoning tokens. Passing them through unchanged double-counts and
    overstates cost, so the nested counts are subtracted out here.
    """
    usage: Dict[str, int] = {}
    net_input = max(prompt_tokens - cached_tokens, 0)
    net_output = max(completion_tokens - reasoning_tokens, 0)
    if net_input:
        usage["input"] = net_input
    if cached_tokens:
        usage["input_cached_tokens"] = cached_tokens
    if net_output:
        usage["output"] = net_output
    if reasoning_tokens:
        usage["output_reasoning_tokens"] = reasoning_tokens
    return usage


def record_openai_usage(obs: Optional[Any], body: Optional[Dict[str, Any]], *,
                        model: Optional[str] = None,
                        output: Optional[Any] = None,
                        fallback_cost_usd: Optional[float] = None) -> None:
    """Attach model, token usage and cost from an OpenAI-compatible response.

    Covers OpenAI, OpenRouter and Gemini's OpenAI-compatible surface, which all
    return the same ``usage`` shape. OpenRouter additionally reports the real
    upstream charge as ``usage.cost``; when present it is ingested directly and
    overrides Langfuse's table-based inference.

    ``fallback_cost_usd`` is used only when the provider reported no cost.
    Langfuse infers cost from its own model-pricing table, which does not cover
    most OpenRouter slugs, so callers that already price a call locally should
    pass that figure rather than leave the generation costless.
    """
    if obs is None:
        return
    try:
        usage = (body or {}).get("usage") or {}
        prompt_tokens = int(usage.get("prompt_tokens") or 0)
        completion_tokens = int(usage.get("completion_tokens") or 0)

        details = usage.get("prompt_tokens_details") or {}
        cached = int(details.get("cached_tokens") or 0)
        out_details = usage.get("completion_tokens_details") or {}
        reasoning = int(out_details.get("reasoning_tokens") or 0)

        fields: Dict[str, Any] = {}
        if model:
            # Report the served model when the provider substituted one.
            fields["model"] = (body or {}).get("model") or model
        if output is not None:
            fields["output"] = output
        usage_details = _exclusive_usage(prompt_tokens, completion_tokens,
                                         cached, reasoning)
        if usage_details:
            fields["usage_details"] = usage_details
        cost = usage.get("cost")
        if isinstance(cost, (int, float)) and cost > 0:
            fields["cost_details"] = {"total": float(cost)}
        elif fallback_cost_usd and fallback_cost_usd > 0:
            fields["cost_details"] = {"total": float(fallback_cost_usd)}
        if fields:
            obs.update(**fields)
    except Exception as e:
        logger.warning(f"[langfuse] usage capture failed: {e}")


# Chat-completion payload keys worth recording as model parameters. The token
# budget has two spellings because OpenAI's newer models rejected the old one.
_MODEL_PARAM_KEYS = ("temperature", "max_tokens", "max_completion_tokens",
                     "top_p", "frequency_penalty", "presence_penalty", "seed")


def traced_post(name: str, url: str, *, metadata: Optional[Dict[str, Any]] = None,
                **kwargs: Any) -> Any:
    """``requests.post`` to an OpenAI-compatible endpoint, as a generation.

    A drop-in for ``requests.post``: same arguments, same return value, same
    exceptions - so instrumenting an existing call site is a one-word change
    plus a name. The model, the messages and the sampling parameters are read
    off the request payload; tokens and cost off the response.

    Two posts in a row (a primary and a fallback model, the pattern most of
    the engines use) therefore produce two generations, which is what you want:
    the fallback's cost and latency are its own, and it is visible that the
    primary was tried first.
    """
    import requests

    payload = kwargs.get("json") or {}
    model = payload.get("model") if isinstance(payload, dict) else None
    params = {k: payload[k] for k in _MODEL_PARAM_KEYS
              if isinstance(payload, dict) and k in payload}

    with generation(name=name, model=model,
                    input=payload.get("messages") if isinstance(payload, dict) else None,
                    model_parameters=params or None,
                    metadata=metadata) as gen:
        response = requests.post(url, **kwargs)

        if not response.ok:
            record_error(gen, f"HTTP {response.status_code}: {response.text[:300]}")
            return response

        try:
            body = response.json()
            text = body["choices"][0]["message"]["content"]
        except Exception:
            # Not a chat-completion body (or an error shape). Record what is
            # there rather than losing the generation entirely.
            body, text = None, None
        record_openai_usage(gen, body, model=model, output=text)
        return response


def record_error(obs: Optional[Any], message: str, *,
                 level: str = "ERROR") -> None:
    """Mark an observation as failed so it is filterable in the UI."""
    if obs is None:
        return
    try:
        obs.update(level=level, status_message=str(message)[:2000])
    except Exception as e:
        logger.warning(f"[langfuse] error capture failed: {e}")


# ==============================================================================
#  SCORING / LIFECYCLE
# ==============================================================================

def score_trace_safely(client: Optional[Any], name: str, value: float,
                       **kwargs: Any) -> None:
    """Attach a score to the active trace."""
    client = client or get_langfuse_client()
    if client is None:
        return
    try:
        client.score_current_trace(name=name, value=value, **kwargs)
    except Exception as e:
        logger.warning(f"[langfuse] failed to score trace '{name}': {e}")


def score_observation_safely(client: Optional[Any], name: str, value: float,
                             **kwargs: Any) -> None:
    """Attach a score to the active observation."""
    client = client or get_langfuse_client()
    if client is None:
        return
    try:
        client.score_current_span(name=name, value=value, **kwargs)
    except Exception as e:
        logger.warning(f"[langfuse] failed to score observation '{name}': {e}")


def flush_safely(client: Optional[Any] = None) -> None:
    """Force-send buffered spans. Required before a short-lived process exits."""
    client = client or get_langfuse_client()
    if client is None:
        return
    try:
        client.flush()
    except Exception as e:
        logger.warning(f"[langfuse] flush failed: {e}")


def observe_safely(*args: Any, **kwargs: Any):
    """``@observe`` that degrades to a plain passthrough when tracing is off."""
    def decorator(func):
        if LANGFUSE_AVAILABLE:
            try:
                return observe(*args, **kwargs)(func)
            except Exception as e:
                logger.warning(f"[langfuse] @observe failed on "
                               f"{getattr(func, '__name__', '?')}: {e}")
        @wraps(func)
        def passthrough(*func_args, **func_kwargs):
            return func(*func_args, **func_kwargs)
        return passthrough
    return decorator


# ==============================================================================
#  BACK-COMPAT SHIMS
# ==============================================================================
# Names kept so existing importers (ocr_pipeline, enrichment_pipeline) do not
# break. New code should use the v4 API above.

safe_observe = observe_safely

_warned: set = set()


def _warn_once(key: str, message: str) -> None:
    if key not in _warned:
        _warned.add(key)
        logger.warning(f"[langfuse] {message}")


def update_trace_safely(client: Optional[Any], **kwargs: Any) -> None:
    """Deprecated. ``update_current_trace()`` was removed in Langfuse v4.

    Correlating attributes are no longer settable after the fact - they must
    propagate from a ``trace_context()`` that encloses the observations. Only
    input/output can still be applied imperatively, so that is all this does.
    """
    client = client or get_langfuse_client()
    if client is None:
        return
    io = {k: kwargs[k] for k in ("input", "output") if k in kwargs}
    dropped = [k for k in kwargs if k not in ("input", "output")]
    if dropped:
        _warn_once("update_trace_safely",
                   f"update_trace_safely({', '.join(sorted(dropped))}) is a no-op "
                   f"on SDK v4 - wrap the call in trace_context(...) instead")
    if io:
        try:
            client.set_current_trace_io(**io)
        except Exception as e:
            logger.warning(f"[langfuse] set_current_trace_io failed: {e}")


def update_generation_safely(client: Optional[Any], **kwargs: Any) -> None:
    """Update the active generation observation in place."""
    client = client or get_langfuse_client()
    if client is None:
        return
    try:
        client.update_current_generation(**kwargs)
    except Exception as e:
        logger.warning(f"[langfuse] failed to update generation: {e}")


def create_span_context(client: Optional[Any], name: str, **kwargs: Any):
    """Deprecated alias for ``observation(name, as_type='span')``."""
    client = client or get_langfuse_client()
    if client is None:
        return nullcontext()
    return observation(name, as_type="span", **kwargs)


def extract_usage_from_mistral_response(response: Any) -> Optional[Dict[str, int]]:
    """Token usage from a Mistral SDK response, in Langfuse bucket form."""
    try:
        usage = getattr(response, "usage", None)
        if usage is None:
            return None
        return _exclusive_usage(int(getattr(usage, "prompt_tokens", 0) or 0),
                                int(getattr(usage, "completion_tokens", 0) or 0))
    except Exception:
        return None


def extract_usage_from_openrouter_response(response_data: Dict[str, Any]) -> Optional[Dict[str, int]]:
    """Token usage from an OpenAI-compatible JSON body, in Langfuse bucket form."""
    try:
        usage = (response_data or {}).get("usage")
        if not usage:
            return None
        details = usage.get("prompt_tokens_details") or {}
        return _exclusive_usage(int(usage.get("prompt_tokens") or 0),
                                int(usage.get("completion_tokens") or 0),
                                int(details.get("cached_tokens") or 0))
    except Exception:
        return None


def link_to_parent_trace(parent_trace_id: Optional[str] = None) -> Optional[Dict[str, str]]:
    """A ``trace_context`` dict for attaching work to a trace started elsewhere."""
    trace_id = parent_trace_id or os.environ.get("LANGFUSE_TRACE_ID")
    return {"trace_id": trace_id} if trace_id else None
