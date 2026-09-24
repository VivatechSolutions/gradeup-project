"""
Avatar LLM client - one call site for every model the avatar classroom uses.

Why this module exists
----------------------
avatar_engine.py and avatar_visuals.py each POSTed straight to
api.openai.com with the model hardcoded, so the avatar was the only part of
the pipeline that could not be pointed at a different model. Extraction and
enrichment already run on OpenRouter (Qwen / Llama), and the vision gate is
exactly the kind of narrow, high-volume judgement where an open-weights VL
model is competitive with gpt-4o-mini at a fraction of the price - but there
was no way to try it without editing code.

So model choice moves into configuration. A model slug now selects its own
provider:

    gpt-4o-mini, o3-mini ...        -> OpenAI          (OPENAI_API_KEY_TEXT)
    gemini-3.6-flash, google/gemini-*
                                    -> Google direct   (GEMINI_API_KEY)
    qwen/..., meta-llama/...        -> OpenRouter      (OPENROUTER_API_KEY)

Gemini is NEVER routed through OpenRouter (user decision 2026-09-17): a
"google/gemini-*" slug left in an older .env goes to Google direct as well,
with the vendor prefix dropped on the wire (see wire_model).

All three speak the OpenAI chat-completions wire protocol, so one payload
builder covers them; only the base URL, the key, the auth headers and a few
per-provider quirks differ (see build_payload).

The quirks are the whole reason this is a module and not a lambda:

  * token budget field - OpenAI's newer models reject `max_tokens` and want
    `max_completion_tokens`; OpenRouter and Google want `max_tokens`. Sending
    the wrong one is a 400, not a warning.
  * temperature - the avatar code sent temperature=1 because that is the only
    value gpt-5-mini accepts. On an open-weights model, 1.0 is what produced
    the JSON drift enrichment_pipeline documents; it settled on 0.7. So the
    default is per-provider, not global.
  * JSON mode - response_format is honoured by OpenAI, Google and most
    OpenRouter models, but a model served by a provider that does not support
    it fails the whole request rather than degrading. _JSON_MODE_UNSUPPORTED
    lists the ones to ask in prose instead.

Every call returns an LLMResult rather than a bare string: the benchmark needs
latency, token counts and cost to compare models, and production needs the
error text to log. `.text` is None on any failure, which is the same contract
the old helpers had, so callers keep their `if not raw: return None` shape.

Public API
----------
    chat(...)            -> LLMResult    one completion, optional images
    resolve_provider(m)  -> str          which backend a slug routes to
    estimate_cost(...)   -> float        USD, from OpenRouter's price list
    parse_json(text)     -> dict | None  fence-tolerant JSON parse
"""

from __future__ import annotations

import base64
import json
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

import requests
from dotenv import load_dotenv

from logger import get_logger

logger = get_logger(__name__)

for _env in (".env.local", ".env"):
    if os.path.exists(_env):
        load_dotenv(dotenv_path=_env)
        break

# Imported after load_dotenv so the Langfuse client picks up credentials on
# its first (lazy) build. Tracing is optional: a missing module must not stop
# the avatar from answering, so the fallbacks below make every call site a
# no-op rather than forcing an `if tracing:` guard around each one.
try:
    from langfuse_utils import generation, record_openai_usage, record_error
except Exception:  # pragma: no cover - tracing is never load-bearing
    from contextlib import contextmanager as _contextmanager

    @_contextmanager
    def generation(*_args, **_kwargs):
        yield None

    def record_openai_usage(*_args, **_kwargs):
        pass

    def record_error(*_args, **_kwargs):
        pass


# ==============================================================================
#  PROVIDER ROUTING
# ==============================================================================

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# Google publishes an OpenAI-compatible surface, so the native path needs no
# separate payload shape - only a different URL and key.
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

PROVIDER_OPENAI = "openai"
PROVIDER_OPENROUTER = "openrouter"
PROVIDER_GEMINI = "gemini"

# An OpenAI model slug never contains a vendor prefix; every OpenRouter slug
# does. That single distinction carries the routing, with Gemini as the one
# special case: "gemini-*" AND "google/gemini-*" both mean "go direct to
# Google" - the avatar classroom runs on GEMINI_API_KEY, not OpenRouter credit.
_OPENAI_PREFIXES = ("gpt-", "o1", "o3", "o4", "chatgpt-", "text-embedding-")

# Slugs Google has retired for new users (a 404 "no longer available ... use
# models/<x>" on every call). Mapped to the replacement the 404 names, so an
# old pin keeps working instead of silently failing over to the fallback model.
_RETIRED_GEMINI = {"gemini-2.5-flash": "gemini-3.6-flash",
                   "gemini-2.5-flash-lite": "gemini-flash-lite-latest"}
_RETIRED_WARNED: set = set()

# Gemini 3.x thinks before it answers and, on Google's OpenAI-compatible
# surface, the thinking is charged against max_tokens: with the default effort
# a 400-token lesson call came back finish_reason=length after 11 tokens of
# JSON (measured 2026-09-17). "low" leaves a little reasoning and always
# answered; "none" is faster still. Accepted by gemini-flash-latest too.
GEMINI_REASONING_EFFORT = os.getenv("GEMINI_REASONING_EFFORT", "low").strip().lower()


def resolve_provider(model: str) -> str:
    """Which backend serves this model slug."""
    m = (model or "").strip().lower()
    if m.startswith("gemini-") or m.startswith("google/gemini-"):
        return PROVIDER_GEMINI
    if "/" in m:
        return PROVIDER_OPENROUTER
    if m.startswith(_OPENAI_PREFIXES):
        return PROVIDER_OPENAI
    # An unprefixed slug we do not recognise is far more likely to be an
    # OpenAI model we have not listed than an OpenRouter one, which would
    # have carried a vendor prefix.
    return PROVIDER_OPENAI


def wire_model(model: str, provider: Optional[str] = None) -> str:
    """The slug actually sent to the provider.

    Google direct wants the bare model name, so an OpenRouter-style
    "google/gemini-x" pin loses its prefix here; a retired name is swapped
    for its replacement with one warning per process.
    """
    provider = provider or resolve_provider(model)
    if provider != PROVIDER_GEMINI:
        return model
    m = (model or "").strip()
    if m.lower().startswith("google/"):
        m = m[len("google/"):]
    replacement = _RETIRED_GEMINI.get(m.lower())
    if replacement:
        if m.lower() not in _RETIRED_WARNED:
            _RETIRED_WARNED.add(m.lower())
            logger.warning(f"[llm] Gemini model '{m}' is retired at Google - using "
                           f"'{replacement}'; update the *_MODEL setting")
        m = replacement
    return m


def _first_env(*names: str) -> Optional[str]:
    for n in names:
        v = os.environ.get(n)
        if v and v.strip():
            return v.strip()
    return None


def api_key_for(provider: str) -> Optional[str]:
    if provider == PROVIDER_OPENAI:
        return _first_env("OPENAI_API_KEY_TEXT", "OPENAI_API_KEY")
    if provider == PROVIDER_OPENROUTER:
        return _first_env("OPENROUTER_API_KEY")
    if provider == PROVIDER_GEMINI:
        return _first_env("GEMINI_API_KEY", "GOOGLE_API_KEY")
    return None


def _headers(provider: str, key: str) -> Dict[str, str]:
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if provider == PROVIDER_OPENROUTER:
        # OpenRouter attributes usage to the app that sent it; the same two
        # headers the extraction and enrichment pipelines already send.
        headers["HTTP-Referer"] = os.getenv("OPENROUTER_APP_URL",
                                            "https://gradeupapi.careeriq.ai")
        headers["X-Title"] = os.getenv("OPENROUTER_APP_NAME", "GradeUp-AI")
    return headers


def _endpoint(provider: str) -> str:
    return {
        PROVIDER_OPENAI: OPENAI_URL,
        PROVIDER_OPENROUTER: OPENROUTER_URL,
        PROVIDER_GEMINI: GEMINI_URL,
    }[provider]


def _token_field(provider: str) -> str:
    """OpenAI's current models reject `max_tokens`; everyone else rejects
    (or ignores) `max_completion_tokens`."""
    return "max_completion_tokens" if provider == PROVIDER_OPENAI else "max_tokens"


# gpt-5-mini and the o-series accept only temperature=1, which is why the
# avatar code hardcoded it. Open-weights models drift out of JSON at 1.0 -
# enrichment_pipeline settled on 0.7 for exactly this reason.
_DEFAULT_TEMPERATURE = {
    PROVIDER_OPENAI: 1.0,
    PROVIDER_OPENROUTER: 0.6,
    PROVIDER_GEMINI: 0.6,
}

# Models whose OpenRouter providers do not all honour response_format. Asking
# for it is a hard 400 on those, so the instruction goes in the prompt instead
# - every avatar system prompt already ends with "Return STRICT JSON".
# _JSON_MODE_UNSUPPORTED: Tuple[str, ...] = ()
# llama-4-scout (2026-09-24): with response_format set, OpenRouter answers 404 "No
# endpoints found ... removed during routing: Filter by Parameters" - no host of it
# supports JSON mode any more. Without it the same request is a 200 with valid JSON.
# Scout is the FALLBACK of nearly every engine (seminar, quiz, debate, homework,
# exam, question bank, English, PPT review), so a Gemini 503 had no working fallback
# anywhere: the PPT intent router fell to its keyword default and sent image
# requests down the answer path.
_JSON_MODE_UNSUPPORTED: Tuple[str, ...] = ("meta-llama/llama-4-scout",)


def supports_json_mode(model: str) -> bool:
    m = (model or "").strip().lower()
    return not any(m.startswith(bad) for bad in _JSON_MODE_UNSUPPORTED)


# ==============================================================================
#  RESULT
# ==============================================================================

@dataclass
class LLMResult:
    """One completion attempt, successful or not.

    ``text`` is None on any failure so callers can keep the `if not raw`
    shape the old private helpers had; everything else is for logging,
    benchmarking and cost accounting.
    """
    text: Optional[str] = None
    model: str = ""
    provider: str = ""
    latency_s: float = 0.0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: float = 0.0
    error: str = ""
    status_code: int = 0
    raw_usage: Dict[str, Any] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return bool(self.text)


# ==============================================================================
#  PRICING  (for the benchmark's cost column)
# ==============================================================================

# Fetched once from OpenRouter, which publishes per-token prices for every
# model it serves - including the OpenAI ones, so a single table covers all
# three providers. Cost is a comparison aid, never a control flow input, so
# every failure here degrades to 0.0 rather than raising.
_PRICE_CACHE: Dict[str, Tuple[float, float]] = {}
_PRICE_LOADED = False

# OpenAI slugs as OpenRouter names them, so a direct-to-OpenAI call can still
# be priced from the same table.
_OPENAI_PRICE_ALIAS = {
    "gpt-4o-mini": "openai/gpt-4o-mini",
    "gpt-4o": "openai/gpt-4o",
    "gpt-4.1-mini": "openai/gpt-4.1-mini",
    "gpt-5-mini": "openai/gpt-5-mini",
}


def _load_prices() -> None:
    global _PRICE_LOADED
    if _PRICE_LOADED:
        return
    _PRICE_LOADED = True
    try:
        resp = requests.get("https://openrouter.ai/api/v1/models", timeout=30)
        if not resp.ok:
            return
        for m in resp.json().get("data", []):
            pricing = m.get("pricing") or {}
            try:
                _PRICE_CACHE[m["id"]] = (float(pricing.get("prompt") or 0),
                                         float(pricing.get("completion") or 0))
            except (TypeError, ValueError):
                continue
    except Exception as e:
        logger.debug(f"[avatar_llm] price list unavailable: {e}")


def estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """USD for one call. 0.0 when the model is not in OpenRouter's price list."""
    _load_prices()
    slug = _OPENAI_PRICE_ALIAS.get(model, model)
    price = _PRICE_CACHE.get(slug)
    if not price:
        return 0.0
    return prompt_tokens * price[0] + completion_tokens * price[1]


# ==============================================================================
#  PAYLOAD
# ==============================================================================

def _image_part(image: Any, detail: str) -> Dict[str, Any]:
    """One image content part, from raw bytes or an existing URL/data URL.

    Bytes are inlined as a base64 data URL rather than passed as a link so the
    model sees exactly the bytes we validated and will store, not whatever the
    origin host chooses to serve it.
    """
    if isinstance(image, (bytes, bytearray)):
        b64 = base64.b64encode(bytes(image)).decode("ascii")
        url = f"data:image/jpeg;base64,{b64}"
    else:
        url = str(image)
    part: Dict[str, Any] = {"type": "image_url", "image_url": {"url": url}}
    if detail:
        part["image_url"]["detail"] = detail
    return part


def build_payload(model: str, system_prompt: str = "", user_prompt: str = "",
                  *, messages: Optional[Sequence[Dict[str, Any]]] = None,
                  images: Optional[Sequence[Any]] = None,
                  max_tokens: int = 1500,
                  temperature: Optional[float] = None,
                  force_json: bool = True,
                  image_detail: str = "low",
                  provider: Optional[str] = None) -> Dict[str, Any]:
    """The request body for one completion, with the per-provider quirks applied.

    Exposed separately from ``chat`` so tests can assert on the body without a
    network call.

    ``messages`` is for multi-turn callers (the highlight Ask-AI chat sends the
    whole conversation): when given it is sent verbatim and ``system_prompt``,
    ``user_prompt`` and ``images`` are ignored.
    """
    provider = provider or resolve_provider(model)

    if messages:
        conversation: List[Dict[str, Any]] = [dict(m) for m in messages]
    else:
        if images:
            content: List[Dict[str, Any]] = [{"type": "text", "text": user_prompt}]
            content.extend(_image_part(img, image_detail) for img in images)
            user_message: Dict[str, Any] = {"role": "user", "content": content}
        else:
            user_message = {"role": "user", "content": user_prompt}
        conversation = [
            {"role": "system", "content": system_prompt},
            user_message,
        ]

    temp = _DEFAULT_TEMPERATURE[provider] if temperature is None else temperature

    payload: Dict[str, Any] = {
        "model": wire_model(model, provider),
        "messages": conversation,
        _token_field(provider): max_tokens,
        "temperature": temp,
    }

    if force_json and supports_json_mode(model):
        payload["response_format"] = {"type": "json_object"}

    if provider == PROVIDER_GEMINI and GEMINI_REASONING_EFFORT not in ("", "default"):
        payload["reasoning_effort"] = GEMINI_REASONING_EFFORT

    if provider == PROVIDER_OPENROUTER:
        # Same provider-failover behaviour extraction and enrichment get: a
        # rate-limited upstream falls through instead of burning the retry.
        try:
            from config import openrouter_routing
            payload.update(openrouter_routing(model))
        except Exception:
            pass
        # Ask OpenRouter to report what the call actually cost upstream.
        payload["usage"] = {"include": True}

    return payload


# ==============================================================================
#  CHAT
# ==============================================================================

def chat(model: str, system_prompt: str = "", user_prompt: str = "",
         *, messages: Optional[Sequence[Dict[str, Any]]] = None,
         images: Optional[Sequence[Any]] = None,
         max_tokens: int = 1500,
         temperature: Optional[float] = None,
         force_json: bool = True,
         image_detail: str = "low",
         timeout: int = 90,
         retries: int = 1,
         fallback_model: Optional[str] = None,
         trace_name: str = "avatar-chat-completion") -> LLMResult:
    """One chat completion against whichever provider serves ``model``.

    Never raises: a transport error, a non-200 or an unparseable body all come
    back as an LLMResult whose ``text`` is None and whose ``error`` says why.

    ``fallback_model`` is tried once if the primary fails outright, mirroring
    the gpt-4o-mini -> gpt-4o fallback the avatar engine had. It may live on a
    different provider than the primary.

    ``trace_name`` names the Langfuse generation. Pass the caller's actual
    purpose ("teach-section", "judge-image") rather than leaving the default:
    evaluators and dashboards target observations by name, so a name that says
    what the call was for is worth far more than a generic one.

    ``messages`` sends a whole conversation instead of one system/user pair -
    see build_payload. One of it, ``user_prompt`` or ``images`` must be given.
    """
    provider = resolve_provider(model)
    key = api_key_for(provider)
    if not key:
        return LLMResult(model=model, provider=provider,
                         error=f"no API key configured for provider '{provider}'")
    if not messages and not images and not (user_prompt or "").strip():
        return LLMResult(model=model, provider=provider,
                         error="nothing to send: no messages, images or user_prompt")

    payload = build_payload(model, system_prompt, user_prompt, messages=messages,
                            images=images,
                            max_tokens=max_tokens, temperature=temperature,
                            force_json=force_json, image_detail=image_detail,
                            provider=provider)

    last_error, last_status = "", 0
    for _attempt in range(max(1, retries) + 1):
        started = time.perf_counter()
        # One generation per HTTP attempt rather than one per chat() call: a
        # retry is a second model invocation with its own latency and token
        # spend, and folding them together would hide which attempt actually
        # produced the answer.
        with generation(name=trace_name, model=model,
                        input=payload.get("messages"),
                        model_parameters={
                            "temperature": payload.get("temperature"),
                            _token_field(provider): payload.get(_token_field(provider)),
                        },
                        metadata={"provider": provider, "attempt": _attempt}) as gen:
            try:
                resp = requests.post(_endpoint(provider), headers=_headers(provider, key),
                                     json=payload, timeout=timeout)
            except requests.Timeout:
                last_error = f"timeout after {timeout}s"
                record_error(gen, last_error)
                continue
            except Exception as e:
                last_error = f"transport error: {e}"
                record_error(gen, last_error)
                continue

            elapsed = time.perf_counter() - started
            last_status = resp.status_code

            if not resp.ok:
                last_error = f"HTTP {resp.status_code}: {resp.text[:300]}"
                record_error(gen, last_error)
                # 4xx other than 429 will fail identically on a retry.
                if 400 <= resp.status_code < 500 and resp.status_code != 429:
                    break
                continue

            try:
                body = resp.json()
                text = (body["choices"][0]["message"]["content"] or "").strip()
            except Exception as e:
                last_error = f"unreadable response: {e}: {resp.text[:200]}"
                record_error(gen, last_error)
                continue

            if not text:
                # An empty completion with finish_reason=length means the token
                # budget was spent on reasoning before any content was emitted.
                finish = (body.get("choices") or [{}])[0].get("finish_reason", "")
                last_error = f"empty completion (finish_reason={finish or 'unknown'})"
                record_error(gen, last_error)
                continue

            usage = body.get("usage") or {}
            prompt_tokens = int(usage.get("prompt_tokens") or 0)
            completion_tokens = int(usage.get("completion_tokens") or 0)
            # OpenRouter reports the real upstream charge; everyone else is priced
            # from the published table.
            cost = usage.get("cost")
            cost_usd = (float(cost) if isinstance(cost, (int, float))
                        else estimate_cost(model, prompt_tokens, completion_tokens))

            # Langfuse has no pricing table for most OpenRouter slugs, so the
            # locally computed figure is passed as the fallback.
            record_openai_usage(gen, body, model=model, output=text,
                                fallback_cost_usd=cost_usd)

            return LLMResult(text=text, model=model, provider=provider,
                             latency_s=elapsed, prompt_tokens=prompt_tokens,
                             completion_tokens=completion_tokens, cost_usd=cost_usd,
                             status_code=resp.status_code, raw_usage=usage)

    if fallback_model and fallback_model != model:
        logger.warning(f"[avatar_llm] {model} failed ({last_error[:120]}) - "
                       f"falling back to {fallback_model}")
        result = chat(fallback_model, system_prompt, user_prompt,
                      messages=messages, images=images,
                      max_tokens=max_tokens, temperature=temperature,
                      force_json=force_json, image_detail=image_detail,
                      timeout=timeout, retries=0, trace_name=trace_name)
        if result.ok:
            return result

    return LLMResult(model=model, provider=provider, error=last_error,
                     status_code=last_status)

#  JSON

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.S)


def parse_json(raw: Optional[str]) -> Optional[Dict]:
    """Parse a JSON object out of a completion, tolerating the usual wrappers.

    Handles a markdown fence, prose either side of the object, and the
    missing-outer-braces shape open-weights models emit in JSON mode (which
    enrichment_pipeline documents for Llama 4 Scout).
    """
    if not raw:
        return None
    text = raw.strip()

    fenced = _FENCE_RE.search(text)
    if fenced:
        text = fenced.group(1).strip()

    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass

    # Prose before/after the object: take the outermost braces.
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            parsed = json.loads(text[start:end + 1])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    # Body without its outer braces: '"key": value, ...'
    if text.startswith('"'):
        try:
            parsed = json.loads("{" + text.rstrip().rstrip(",") + "}")
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    return None
