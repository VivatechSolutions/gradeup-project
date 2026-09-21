"""
Avatar TTS - Kokoro voices for the avatar classroom.

Why Kokoro, and why not the old path
------------------------------------
The avatar's audio ran on OpenAI's `gpt-4o-mini-tts` (see
enrichment_pipeline._generate_avatar_tts). That account is out of credits -
every call returns `credit_balance_exhausted` - so avatar audio has been
failing exactly the way the teaching and vision calls were before they moved
to OpenRouter. Kokoro is an 82M-parameter open-weights model that runs LOCALLY
on CPU: no key, no per-character billing, no quota to exhaust, and no network
round trip per segment.

ONNX rather than the `kokoro` PyTorch package: the latter pulls ~2.5 GB of
torch, and this box had no torch, no onnxruntime and no espeak-ng installed.
`kokoro-onnx` needs onnxruntime and two model files (~336 MB total) and is
otherwise self-contained.

Voice choice
------------
Kokoro publishes per-voice quality grades, and they are not close - the
difference between an A and a D voice is audible immediately, so the default is
the top-graded voice of each gender rather than a name that sounds nice:

    female  af_heart     grade A     the highest-graded voice in the model
    male    am_michael   grade C+    joint-best male alongside am_fenrir/am_puck

Kokoro's male voices are all graded well below its best female ones; that is a
property of the model's training data, not a configuration mistake. If the male
voice is not good enough for production, the realistic options are am_fenrir /
am_puck (same grade, different timbre) or bm_george for a British male - all
switchable by env var, no code change.

Indian voices
-------------
Kokoro ships FOUR Hindi voices - hf_alpha, hf_beta (female), hm_omega, hm_psi
(male) - and NO Indian-English voice. That distinction matters for a platform
teaching Indian students in English: the h* voices are trained on HINDI, so
asking them to read an English lesson runs English words through the Hindi
phonemizer. The accent lands closer to an Indian speaker, but English
pronunciation gets less reliable, and neither Kokoro nor its grade table rates
these voices at all.

So this is a judgement to make by ear on real lesson text, not from the voice
list. If Indian-accented ENGLISH turns out to be a hard requirement, Kokoro is
the wrong model for it and the honest options are a different engine -
AI4Bharat's Indic-Parler-TTS, Sarvam, or a cloud voice such as Azure en-IN or
Google en-IN - rather than a Kokoro setting.

Language follows the voice automatically (see lang_for_voice): setting
AVATAR_TTS_VOICE_FEMALE=hf_alpha switches that voice to the Hindi phonemizer
without a second env var to remember.

Two backends, one call
----------------------
The SAME Kokoro model is also hosted as a shared service (TTS-Model-Package,
one instance for every Vivatech project). When TTS_SERVICE_URL and a token are
configured, synthesis goes there: this process needs no weights or CPU time,
and the service returns MP3 - roughly 10x smaller than the WAV the local ONNX
path is limited to. Local Kokoro stays as the fallback when the service is
down, so an outage degrades to slower audio, not no audio.

The circuit trips on the first failure per process (unreachable, or a 401)
and every later call goes local immediately. A 400 - the service rejecting
one specific input - does NOT trip it, and does NOT fall back either: that
would quietly write WAV bytes under an .mp3 name. See synthesize().

Because the backend can change mid-run, output_format() must be read AFTER
each synthesize() call, never assumed.

Config (.env)
-------------
  TTS_SERVICE_URL            hosted service, e.g. http://44.194.232.104:5002
  TTS_SERVICE_TOKEN          gradeup's OWN token - one is issued per project
                             and the service rejects other projects' tokens
  AVATAR_TTS_BACKEND         "auto" (default) | "remote" | "local"
  AVATAR_TTS_FORMAT          remote only: mp3 (default) | wav | flac | ogg
  TTS_SERVICE_TIMEOUT        default "120"
  AVATAR_TTS_ENABLED         default "true"
  AVATAR_TTS_VOICE_FEMALE    default "af_heart"
  AVATAR_TTS_VOICE_MALE      default "am_michael"
  AVATAR_TTS_SPEED           default "1.0"   (0.5-2.0; 0.9 suits young learners)
  AVATAR_TTS_LANG            fallback only - lang normally follows the voice
  KOKORO_MODEL_DIR           default "models/kokoro"  (local fallback weights)

  NB: secrets_manager loads .env with override=True, so an EMPTY
  `TTS_SERVICE_TOKEN=` line wipes a token exported in the shell or CI. Set a
  value or leave the key out entirely.

Public API
----------
  is_available()                     -> bool, and why not if False
  active_backend()                   -> "remote" | "local", after probing
  output_format() / media_type()     -> what synthesize() is producing now
  list_voices()                      -> voices the active backend exposes
  synthesize(text, voice, speed)     -> audio bytes in output_format()
  synthesize_both(text)              -> {"male": bytes, "female": bytes}
  narrate_segments(segments, ...)    -> whole-section narration, shared by routes
"""

from __future__ import annotations

import io
import os
import threading
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

from logger import get_logger

logger = get_logger(__name__)

for _env in (".env.local", ".env"):
    if os.path.exists(_env):
        load_dotenv(dotenv_path=_env)
        break


# ==============================================================================
#  CONFIGURATION
# ==============================================================================

MODEL_DIR = Path(os.getenv("KOKORO_MODEL_DIR", "models/kokoro"))
MODEL_FILE = MODEL_DIR / "kokoro-v1.0.onnx"
VOICES_FILE = MODEL_DIR / "voices-v1.0.bin"

# Where the weights come from if they are missing. Pinned to a release tag so a
# new upstream release cannot silently change the voices mid-deployment.
_MODEL_BASE_URL = ("https://github.com/thewh1teagle/kokoro-onnx/releases/"
                   "download/model-files-v1.0")

VOICE_FEMALE = os.getenv("AVATAR_TTS_VOICE_FEMALE", "af_heart")
VOICE_MALE = os.getenv("AVATAR_TTS_VOICE_MALE", "am_michael")
TTS_SPEED = float(os.getenv("AVATAR_TTS_SPEED", "1.0"))
TTS_LANG = os.getenv("AVATAR_TTS_LANG", "en-us")

# ── Remote service (TTS-Model-Package) ────────────────────────────────────────
# The same Kokoro model, hosted once on its own instance and shared by every
# Vivatech project. Consuming it means this process needs no weights, no
# onnxruntime and no CPU time for synthesis - the enrichment box was spending
# ~160 s per section on narration alone, at ~1x realtime, and every one of
# those seconds moves to the TTS instance instead.
#
# It also returns MP3, which the local ONNX path cannot (no codec installed).
# MP3 is ~10x smaller over the wire than the WAV we were uploading, and the
# audio's whole purpose is to reach a browser.
#
# Auth is one token PER PROJECT, deliberately: the service's secret holds every
# project's token, and each consumer holds only its own, so no project can read
# another's. That means gradeup needs ITS OWN entry in the service's
# TTS_SERVICE_TOKENS - the tokens in the package's local .env belong to other
# projects and the hosted instance rejects them (verified: 401).
TTS_SERVICE_URL = os.getenv("TTS_SERVICE_URL", "").strip().rstrip("/")
TTS_SERVICE_TOKEN = os.getenv("TTS_SERVICE_TOKEN", "").strip()
# Read timeout per request. Raised from 120: on a serial queue, giving up early
# does not save time - it abandons a job the server will still run and queues a
# duplicate behind it. Waiting is cheaper than resubmitting.
TTS_SERVICE_TIMEOUT = int(os.getenv("TTS_SERVICE_TIMEOUT", "300"))

# The hosted service is ONE Kokoro worker, serial, shared by every project, at
# roughly 12 characters a second, and it drops a request after about two
# minutes. Measured, not assumed: four parallel requests queued behind each
# other (72s wall for 25s of work), and a 1,031-char segment took 83s alone.
# A whole segment in one request is therefore a coin toss whenever another
# tenant is on the queue - one run lost its first request that way and then
# every one of 46 files went to local Kokoro. So:
#   - text goes over in sentence-sized pieces (TTS_SERVICE_CHUNK_CHARS), each
#     well inside the cut-off even with a queue ahead of it
#   - a dropped request is retried, with a pause for the queue to drain
#   - the circuit trips only after several failures IN A ROW, not one
TTS_SERVICE_CHUNK_CHARS = int(os.getenv("TTS_SERVICE_CHUNK_CHARS", "350"))
TTS_SERVICE_RETRIES = int(os.getenv("TTS_SERVICE_RETRIES", "3"))
TTS_SERVICE_RETRY_DELAY = float(os.getenv("TTS_SERVICE_RETRY_DELAY", "30"))
TTS_SERVICE_STRIKES = int(os.getenv("TTS_SERVICE_STRIKES", "3"))

# What a timed-out request means on a serial service: the server is STILL
# working on it. Resubmitting 5s later - which is what this client did - queues
# a duplicate behind the original, which then times out too, and each retry
# deepens the backlog until three strikes declare a perfectly healthy service
# "down". So after a read timeout the client first waits for the service to
# answer /health again (on a single-threaded server that is exactly the moment
# the queue has drained), then adds a grace period for the case where the
# server is concurrent and the abandoned job is still finishing invisibly.
TTS_SERVICE_DRAIN_WAIT = int(os.getenv("TTS_SERVICE_DRAIN_WAIT", "300"))
TTS_SERVICE_DRAIN_GRACE = int(os.getenv("TTS_SERVICE_DRAIN_GRACE", "45"))

# Three strikes used to mean "down for the rest of the run", and with the
# hosted voice forced that meant no audio for everything after. An overloaded
# service is not a dead one. Now: cool down, re-probe, carry on - and only a
# service that no longer answers its health check at all is given up on.
TTS_SERVICE_COOLDOWN = int(os.getenv("TTS_SERVICE_COOLDOWN", "180"))
TTS_SERVICE_MAX_COOLDOWNS = int(os.getenv("TTS_SERVICE_MAX_COOLDOWNS", "3"))

# Which backend synthesizes. "auto" uses the service when a URL is configured
# and local Kokoro otherwise; "remote" / "local" force one. Local stays wired
# as the fallback when the service is unreachable, so a TTS outage degrades to
# slower audio rather than no audio - provided the weights are on disk.
TTS_BACKEND = os.getenv("AVATAR_TTS_BACKEND", "auto").strip().lower()

# Output container. Remote defaults to mp3 for the size win; local can only do
# wav. The filename extension and S3 content type both follow this.
_FORMAT_ENV = os.getenv("AVATAR_TTS_FORMAT", "").strip().lower()

_MEDIA_TYPES = {"mp3": "audio/mpeg", "wav": "audio/wav",
                "flac": "audio/flac", "ogg": "audio/ogg"}


def backend() -> str:
    """'remote' or 'local' - the backend the next synthesis will use."""
    if TTS_BACKEND in ("remote", "local"):
        return TTS_BACKEND
    return "remote" if TTS_SERVICE_URL else "local"


def output_format() -> str:
    """The audio container synthesize() produces ('mp3' or 'wav').

    Follows the backend that is ACTUALLY serving, not the configured one: when
    the remote circuit trips mid-run and calls fall back to local Kokoro, the
    bytes become WAV, and an '.mp3' extension on a WAV file is exactly the
    silent mismatch this function exists to prevent.
    """
    if active_backend() == "local":
        return "wav"                       # the ONNX path has no MP3 codec
    return _FORMAT_ENV if _FORMAT_ENV in _MEDIA_TYPES else "mp3"


def media_type() -> str:
    return _MEDIA_TYPES.get(output_format(), "audio/wav")

# Kokoro's own published grades, kept here so a future voice change is an
# informed one rather than a guess. A/B are clearly better than C/D by ear.
VOICE_GRADES = {
    "af_heart": "A", "af_bella": "A-", "af_nicole": "B-", "bf_emma": "B-",
    "af_aoede": "C+", "af_kore": "C+", "af_sarah": "C+", "am_fenrir": "C+",
    "am_michael": "C+", "am_puck": "C+", "af_nova": "C", "bf_isabella": "C",
    "bm_george": "C", "bm_fable": "C", "af_alloy": "C", "af_jessica": "C-",
    "af_river": "D", "am_echo": "D", "am_eric": "D", "am_liam": "D",
    "am_onyx": "D", "bm_daniel": "D", "bf_alice": "D", "bm_lewis": "D-",
}


def is_enabled() -> bool:
    return os.getenv("AVATAR_TTS_ENABLED", "true").strip().lower() in ("1", "true", "yes")


# ==============================================================================
#  MODEL LOADING
# ==============================================================================

# Kokoro holds an ONNX session; building it takes a few seconds and it is
# thread-safe to reuse but NOT to build twice concurrently, so the first caller
# builds it under a lock and everyone else waits.
_kokoro = None
_load_lock = threading.Lock()
_load_error = ""


def _download(url: str, dest: Path) -> bool:
    """Fetch one model file, streaming so a 310 MB download is not held in RAM."""
    import requests
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    try:
        logger.info(f"[TTS] downloading {dest.name} (this happens once) ...")
        with requests.get(url, stream=True, timeout=600) as resp:
            resp.raise_for_status()
            with open(tmp, "wb") as fh:
                for chunk in resp.iter_content(chunk_size=1 << 20):
                    if chunk:
                        fh.write(chunk)
        # Rename only after a complete download, so an interrupted fetch cannot
        # leave a truncated file that loads and then fails cryptically.
        tmp.replace(dest)
        logger.info(f"[TTS] {dest.name} ready ({dest.stat().st_size / 1e6:.0f} MB)")
        return True
    except Exception as e:
        logger.error(f"[TTS] failed to download {dest.name}: {e}")
        tmp.unlink(missing_ok=True)
        return False


def ensure_model(download: bool = True) -> bool:
    """True when both weight files are present, fetching them if allowed."""
    have = MODEL_FILE.exists() and VOICES_FILE.exists()
    if have or not download:
        return have
    ok = _download(f"{_MODEL_BASE_URL}/kokoro-v1.0.onnx", MODEL_FILE)
    ok = _download(f"{_MODEL_BASE_URL}/voices-v1.0.bin", VOICES_FILE) and ok
    return ok


def _load() -> Optional[Any]:
    """The shared Kokoro session, built on first use. None if unavailable."""
    global _kokoro, _load_error
    if _kokoro is not None:
        return _kokoro

    with _load_lock:
        if _kokoro is not None:            # another thread won the race
            return _kokoro
        try:
            from kokoro_onnx import Kokoro
        except ImportError as e:
            _load_error = (f"kokoro-onnx is not installed ({e}). "
                           f"pip install kokoro-onnx soundfile")
            logger.warning(f"[TTS] {_load_error}")
            return None

        if not ensure_model():
            _load_error = (f"Kokoro weights missing under {MODEL_DIR} and could "
                           f"not be downloaded")
            return None

        try:
            started = time.perf_counter()
            _kokoro = Kokoro(str(MODEL_FILE), str(VOICES_FILE))
            logger.info(f"[TTS] Kokoro loaded in "
                        f"{time.perf_counter() - started:.1f}s "
                        f"(female={VOICE_FEMALE}, male={VOICE_MALE})")
        except Exception as e:
            _load_error = f"Kokoro failed to load: {e}"
            logger.error(f"[TTS] {_load_error}")
            return None
    return _kokoro


# ==============================================================================
#  REMOTE SERVICE CLIENT
# ==============================================================================

# One strike and the service is considered down for the rest of the process,
# the same pattern SearXNG and Openverse use in avatar_visuals: a narration
# pass is dozens of calls, and paying a connect timeout on every one of them
# is far worse than falling back to local after the first. A 401 is also a
# strike - a bad token will not fix itself mid-run.
#   None = not yet tried, True/False = what the first attempt found.
_REMOTE_AVAILABLE: Optional[bool] = None
_remote_error = ""


def _remote_headers() -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if TTS_SERVICE_TOKEN:
        headers["X-TTS-Token"] = TTS_SERVICE_TOKEN
    return headers


def _remote_probe() -> bool:
    """Whether the service is reachable AND accepts our token. Once per process.

    /health needs no token, so a healthy service with a wrong token would pass
    a health-only check and then 401 on every synthesis. /voices needs the
    token, which makes it the honest probe.
    """
    global _REMOTE_AVAILABLE, _remote_error
    if _REMOTE_AVAILABLE is not None:
        return _REMOTE_AVAILABLE

    import requests

    resp = None
    if not TTS_SERVICE_URL:
        _remote_error = "TTS_SERVICE_URL is not set"
        _REMOTE_AVAILABLE = False
    elif not TTS_SERVICE_TOKEN:
        _remote_error = ("TTS_SERVICE_TOKEN is not set - gradeup needs its own "
                         "entry in the service's TTS_SERVICE_TOKENS; using "
                         "local Kokoro until then")
        _REMOTE_AVAILABLE = False
    else:
        try:
            resp = requests.get(f"{TTS_SERVICE_URL}/voices",
                                headers=_remote_headers(), timeout=15)
        except Exception as e:
            _remote_error = f"TTS service unreachable at {TTS_SERVICE_URL}: {e}"
            _REMOTE_AVAILABLE = False
            resp = None
    if _REMOTE_AVAILABLE is None and resp is not None:
        if resp.status_code == 401:
            _remote_error = (f"TTS service at {TTS_SERVICE_URL} rejected the "
                             f"token (401) - is gradeup registered in "
                             f"TTS_SERVICE_TOKENS?")
            _REMOTE_AVAILABLE = False
        elif not resp.ok:
            _remote_error = f"TTS service returned {resp.status_code} on /voices"
            _REMOTE_AVAILABLE = False
        else:
            _REMOTE_AVAILABLE = True
            logger.info(f"[TTS] using hosted service at {TTS_SERVICE_URL} "
                        f"(format={output_format()}, female={VOICE_FEMALE}, "
                        f"male={VOICE_MALE})")
    if not _REMOTE_AVAILABLE:
        logger.warning(f"[TTS] {_remote_error}")
    return _REMOTE_AVAILABLE


# Consecutive transient failures. Reset by any success; the circuit trips when
# it reaches TTS_SERVICE_STRIKES. A 401 trips it at once - a bad token will not
# fix itself mid-run.
_remote_strikes = 0

_SENTENCE_END_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(\[])")


def _chunk_text(text: str, limit: int) -> List[str]:
    """Sentence-sized pieces no longer than `limit`, never splitting a word.

    Kokoro's prosody works a sentence at a time, so cutting at sentence ends
    costs nothing audible; the join is where the pause already was.
    """
    text = " ".join((text or "").split())
    if len(text) <= limit:
        return [text] if text else []
    out: List[str] = []
    buf = ""
    for sentence in _SENTENCE_END_RE.split(text):
        if not sentence:
            continue
        while len(sentence) > limit:                 # one very long sentence
            cut = sentence.rfind(" ", 0, limit)
            cut = cut if cut > 0 else limit
            piece, sentence = sentence[:cut].strip(), sentence[cut:].strip()
            if buf:
                out.append(buf); buf = ""
            out.append(piece)
        if buf and len(buf) + 1 + len(sentence) > limit:
            out.append(buf); buf = sentence
        else:
            buf = f"{buf} {sentence}".strip()
    if buf:
        out.append(buf)
    return out


# MPEG audio frame geometry, enough to measure the first frame of a chunk.
_MP3_BITRATES = {                      # kbps by index 1..14, Layer III
    1: (32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320),   # MPEG-1
    2: (8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160),       # MPEG-2 / 2.5
}
_MP3_SAMPLE_RATES = {3: (44100, 48000, 32000),      # version bits -> rates
                     2: (22050, 24000, 16000),
                     0: (11025, 12000, 8000)}


def _first_frame_length(mp3: bytes, at: int) -> int:
    """Byte length of the Layer III frame whose header starts at `at`, or 0."""
    if len(mp3) < at + 4:
        return 0
    h = mp3[at:at + 4]
    if h[0] != 0xFF or (h[1] & 0xE0) != 0xE0:
        return 0
    version = (h[1] >> 3) & 3
    layer = (h[1] >> 1) & 3
    br_idx = (h[2] >> 4) & 0xF
    sr_idx = (h[2] >> 2) & 3
    padding = (h[2] >> 1) & 1
    if version == 1 or layer != 1 or br_idx in (0, 15) or sr_idx == 3:
        return 0                                   # reserved / not Layer III
    kbps = _MP3_BITRATES[1 if version == 3 else 2][br_idx - 1]
    rate = _MP3_SAMPLE_RATES[version][sr_idx]
    per_frame = 144000 if version == 3 else 72000  # 1152 vs 576 samples
    return per_frame * kbps // rate + padding


def _strip_stream_headers(mp3: bytes) -> bytes:
    """Make one chunk safe to concatenate: drop its ID3v2 tag and its Xing /
    Info frame.

    Each response from the service is a complete file. Its Xing (VBR) or Info
    (CBR) frame declares the length of THAT file, and a decoder that meets it
    at the head of a longer stream trusts it and stops: a three-piece
    narration decoded as 16 seconds of its 45 - exactly the first piece.
    Without the frame there is no length claim and decoders read to the end.
    The frame is silent, so nothing audible is lost.
    """
    at = 0
    if len(mp3) >= 10 and mp3[:3] == b"ID3":
        at = 10 + ((mp3[6] & 0x7F) << 21 | (mp3[7] & 0x7F) << 14
                   | (mp3[8] & 0x7F) << 7 | (mp3[9] & 0x7F))
    length = _first_frame_length(mp3, at)
    if length and (b"Xing" in mp3[at:at + length] or b"Info" in mp3[at:at + length]):
        return mp3[at + length:]
    return mp3[at:]


_remote_cooldowns = 0


def _health_answers(timeout: float = 10.0) -> bool:
    """One cheap probe. /health needs no token."""
    import requests
    try:
        return requests.get(f"{TTS_SERVICE_URL}/health", timeout=timeout).ok
    except Exception:
        return False


def _wait_for_drain(reason: str) -> None:
    """After a read timeout: wait until the service answers again, then a grace.

    On a single-threaded server /health blocks behind the running synthesis,
    so it answering means our abandoned job (and whatever was queued ahead of
    it) is done. On a concurrent server it answers at once, and the grace
    period covers the abandoned chunk finishing on its own - a chunk is ~30s
    of work, so 45s is enough. Either way nothing is resubmitted while the
    original may still be running.
    """
    deadline = time.monotonic() + TTS_SERVICE_DRAIN_WAIT
    logger.info(f"[TTS] {reason} - the server is still on that job; waiting for "
                f"it to drain before resubmitting (up to {TTS_SERVICE_DRAIN_WAIT}s)")
    while time.monotonic() < deadline:
        if _health_answers():
            break
        time.sleep(15)
    time.sleep(TTS_SERVICE_DRAIN_GRACE)


def _cool_down() -> bool:
    """Three strikes: pause, re-probe, decide. True = carry on hosted."""
    global _REMOTE_AVAILABLE, _remote_error, _remote_strikes, _remote_cooldowns
    _remote_cooldowns += 1
    if _remote_cooldowns > TTS_SERVICE_MAX_COOLDOWNS:
        _REMOTE_AVAILABLE = False
        _remote_error = (f"TTS service still failing after {TTS_SERVICE_MAX_COOLDOWNS} "
                         f"cool-down(s) - giving up on it for this run")
        logger.warning(f"[TTS] {_remote_error}")
        return False
    logger.warning(f"[TTS] {TTS_SERVICE_STRIKES} segment(s) failed in a row - "
                   f"cooling down {TTS_SERVICE_COOLDOWN}s, then re-probing "
                   f"(cool-down {_remote_cooldowns}/{TTS_SERVICE_MAX_COOLDOWNS})")
    time.sleep(TTS_SERVICE_COOLDOWN)
    if _health_answers(timeout=20):
        _remote_strikes = 0
        logger.info("[TTS] service answered after the cool-down - resuming hosted narration")
        return True
    _REMOTE_AVAILABLE = False
    _remote_error = f"TTS service at {TTS_SERVICE_URL} no longer answers /health"
    logger.warning(f"[TTS] {_remote_error}")
    return False


def _remote_post(payload: Dict[str, Any], voice: str) -> Optional[bytes]:
    """One /tts request with retries. None when it finally fails.

    Failure kinds are treated differently because they MEAN different things:
      read timeout      the server is still on our job  -> wait for it to drain
      connection reset  the worker died mid-request     -> a real pause, then retry
      5xx / 429         overloaded                       -> a real pause, then retry
      401               bad token                        -> stop, it will not fix itself
      400               our input                        -> stop, do not strike
    """
    global _REMOTE_AVAILABLE, _remote_error, _remote_strikes
    import requests

    last = ""
    for attempt in range(1, TTS_SERVICE_RETRIES + 1):
        timed_out = False
        try:
            resp = requests.post(f"{TTS_SERVICE_URL}/tts", json=payload,
                                 headers=_remote_headers(),
                                 timeout=TTS_SERVICE_TIMEOUT)
        except requests.exceptions.ReadTimeout as e:
            last = f"ReadTimeout after {TTS_SERVICE_TIMEOUT}s"
            timed_out = True
            resp = None
        except Exception as e:
            last = f"{type(e).__name__}: {e}"
            resp = None
        if resp is not None:
            if resp.status_code == 401:
                _remote_error = "TTS service rejected the token (401)"
                _REMOTE_AVAILABLE = False
                logger.warning(f"[TTS] {_remote_error}")
                return None
            if resp.status_code == 400:
                # Our input, not the service - do not retry, do not strike.
                logger.warning(f"[TTS] service rejected input for voice "
                               f"{voice!r}: {resp.text[:160]}")
                return None
            if resp.ok and resp.content:
                _remote_strikes = 0
                return resp.content
            last = f"HTTP {resp.status_code}: {resp.text[:120]}"
        if attempt < TTS_SERVICE_RETRIES:
            if timed_out:
                _wait_for_drain(last)
            else:
                wait = TTS_SERVICE_RETRY_DELAY * attempt
                logger.info(f"[TTS] {last} - retry {attempt + 1}/{TTS_SERVICE_RETRIES} "
                            f"after {wait:.0f}s")
                time.sleep(wait)

    _remote_strikes += 1
    _remote_error = f"TTS service call failed after {TTS_SERVICE_RETRIES} attempts: {last}"
    if _remote_strikes >= TTS_SERVICE_STRIKES:
        _cool_down()
    else:
        logger.warning(f"[TTS] {_remote_error} (strike {_remote_strikes}/"
                       f"{TTS_SERVICE_STRIKES})")
    return None


def _remote_synthesize(text: str, voice: str, speed: Optional[float],
                       fmt: str) -> Optional[bytes]:
    """Synthesize `text` on the hosted service, in sentence-sized requests.

    None when any piece finally fails: a narration with a hole in it is worse
    than one the caller knows is missing."""
    pieces = _chunk_text(text, TTS_SERVICE_CHUNK_CHARS)
    if not pieces:
        return None
    speed = speed if speed is not None else TTS_SPEED
    parts: List[bytes] = []
    for i, piece in enumerate(pieces):
        if _REMOTE_AVAILABLE is False:
            return None
        audio = _remote_post({"text": piece, "voice": voice, "format": fmt,
                              "speed": speed}, voice)
        if not audio:
            if len(pieces) > 1:
                logger.warning(f"[TTS] piece {i + 1}/{len(pieces)} failed - "
                               f"dropping the whole segment rather than leave a gap")
            return None
        parts.append(_strip_stream_headers(audio) if fmt == "mp3" else audio)
    if len(parts) > 1 and fmt != "mp3":
        # WAV/FLAC/OGG have per-file headers that do not concatenate. The
        # hosted path is MP3 by design; anything else goes over in one piece.
        logger.warning(f"[TTS] format {fmt!r} cannot be chunked - sending whole")
        return _remote_post({"text": " ".join(pieces), "voice": voice,
                             "format": fmt, "speed": speed}, voice)
    return b"".join(parts)


def _remote_voices() -> List[str]:
    import requests
    try:
        resp = requests.get(f"{TTS_SERVICE_URL}/voices",
                            headers=_remote_headers(), timeout=15)
        resp.raise_for_status()
        body = resp.json()
        raw = body.get("voices", body) if isinstance(body, dict) else body
        if isinstance(raw, dict):
            raw = list(raw.keys())
        return sorted(str(v) for v in raw)
    except Exception as e:
        logger.warning(f"[TTS] could not list service voices: {e}")
        return []


# ==============================================================================
#  AVAILABILITY
# ==============================================================================

def is_available() -> Tuple[bool, str]:
    """Whether TTS can actually run, and the reason when it cannot.

    Remote is tried first when configured; a dead or unauthorised service
    falls through to local Kokoro, so the answer is 'unavailable' only when
    BOTH paths are.
    """
    if not is_enabled():
        return False, "AVATAR_TTS_ENABLED is false"
    if backend() == "remote":
        if _remote_probe():
            return True, ""
        if TTS_BACKEND == "remote":
            return False, _remote_error            # forced remote, no fallback
        # auto: fall through to local
    if _load() is None:
        remote_note = f" (remote: {_remote_error})" if _remote_error else ""
        return False, (_load_error or "Kokoro unavailable") + remote_note
    return True, ""


def active_backend() -> str:
    """The backend that will actually serve the next call, after probing."""
    if backend() == "remote" and _remote_probe():
        return "remote"
    return "local"


def list_voices() -> List[Dict[str, str]]:
    """Every voice the active backend exposes, with its published grade."""
    if active_backend() == "remote":
        names = _remote_voices()
    else:
        kokoro = _load()
        if kokoro is None:
            return []
        try:
            names = sorted(kokoro.get_voices())
        except Exception:
            return []
    return [{"voice": n,
             "gender": "female" if n[1:2] == "f" else "male",
             "accent": {"a": "American", "b": "British", "h": "Hindi (India)",
                        "e": "Spanish", "f": "French", "i": "Italian",
                        "j": "Japanese", "p": "Portuguese (BR)",
                        "z": "Mandarin"}.get(n[:1], "other"),
             "lang": lang_for_voice(n),
             "grade": VOICE_GRADES.get(n, "?"),
             "role": ("default female" if n == VOICE_FEMALE else
                      "default male" if n == VOICE_MALE else "")}
            for n in names]


# ==============================================================================
#  SYNTHESIS
# ==============================================================================

# A Kokoro voice's first letter IS its language, and the phonemizer must match
# it: feeding a Hindi voice (hf_/hm_) through the en-us phonemizer, or an
# American voice through the Hindi one, produces audio that sounds subtly wrong
# rather than failing outright - the worst kind of bug to notice. So the
# language is derived from the voice unless a caller overrides it explicitly.
_VOICE_LANG = {
    "a": "en-us",    # American English
    "b": "en-gb",    # British English
    "e": "es",       # Spanish
    "f": "fr-fr",    # French
    "h": "hi",       # Hindi
    "i": "it",       # Italian
    "j": "ja",       # Japanese
    "p": "pt-br",    # Brazilian Portuguese
    "z": "cmn",      # Mandarin
}


def lang_for_voice(voice: str) -> str:
    """The phonemizer language a voice expects, from its name prefix."""
    return _VOICE_LANG.get((voice or "")[:1].lower(), TTS_LANG)


def synthesize(text: str, voice: str, speed: Optional[float] = None,
               lang: Optional[str] = None) -> Optional[bytes]:
    """One utterance as audio bytes, in output_format(). None on any failure.

    Remote first when configured: the hosted service returns MP3 and takes the
    CPU cost off this box. If it is down or rejects our token, the call falls
    through to local Kokoro (WAV) - callers must therefore read the extension
    from output_format() AFTER the call rather than assuming it, because a
    mid-run fallback changes it.
    """
    text = (text or "").strip()
    if not text:
        return None

    if backend() == "remote":
        if _remote_probe():
            audio = _remote_synthesize(text, voice, speed, output_format())
            if audio:
                return audio
        if TTS_BACKEND == "remote" or _REMOTE_AVAILABLE:
            # Forced remote, OR the service is still healthy and rejected just
            # this input (a 400 - typically a voice it does not offer, e.g. a
            # Hindi voice against the English-only hosted list). Falling back
            # to local would quietly produce WAV bytes under an .mp3 name, and
            # with AVATAR_TTS_BACKEND=remote the operator has said the hosted
            # voice is the product: a missing file is reported, a local one
            # is not. (This used to skip the whole block when the probe had
            # failed and land in local Kokoro anyway - "forced" was not.)
            return None
        # auto and the circuit actually tripped: carry on locally, and
        # output_format() now reports wav to match.

    # ── Local Kokoro (WAV) ──────────────────────────────────────────────────
    # WAV because the ONNX path emits raw float samples and MP3 would need a
    # codec (lameenc/ffmpeg) that is not installed. The remote path is how you
    # get MP3.
    kokoro = _load()
    if kokoro is None:
        return None

    try:
        import soundfile as sf
    except ImportError as e:
        logger.warning(f"[TTS] soundfile is not installed ({e})")
        return None

    try:
        samples, sample_rate = kokoro.create(
            text, voice=voice,
            speed=speed if speed is not None else TTS_SPEED,
            lang=lang or lang_for_voice(voice),
        )
    except Exception as e:
        logger.warning(f"[TTS] synthesis failed for voice {voice!r}: {e}")
        return None

    buf = io.BytesIO()
    try:
        sf.write(buf, samples, sample_rate, format="WAV", subtype="PCM_16")
    except Exception as e:
        logger.warning(f"[TTS] WAV encode failed: {e}")
        return None
    return buf.getvalue()


def synthesize_both(text: str, speed: Optional[float] = None
                    ) -> Dict[str, Optional[bytes]]:
    """The same line in both avatar voices, as ``{"male":…, "female":…}``.

    Matches the shape enrichment_pipeline._generate_segment_audio already
    produces, so this is a drop-in replacement for the OpenAI TTS path.
    """
    return {
        "male": synthesize(text, VOICE_MALE, speed),
        "female": synthesize(text, VOICE_FEMALE, speed),
    }


def narrate_segments(segments: List[Dict[str, Any]], *,
                     board: str = "", class_number: str = "",
                     subject: str = "", unit_number: int = 0,
                     voices: Optional[List[str]] = None,
                     speed: Optional[float] = None,
                     upload: bool = True,
                     attach: bool = False) -> Dict[str, Any]:
    """Narrate every segment in both voices. Shared by both avatar routes.

    ``attach=True`` also writes the URLs onto each segment as ``audio``, which
    is what the enrich-and-narrate route needs so the caller gets one document
    with the lesson and its audio together.

    Uploads to S3 when it can and falls back to a local file under
    ``avatar_audio/`` otherwise - never discarding audio that has already been
    generated just because the bucket was unreachable.
    """
    import uuid

    voices = [v for v in (voices or ["male", "female"]) if v in ("male", "female")]
    voice_names = {"male": VOICE_MALE, "female": VOICE_FEMALE}
    out_dir = Path("avatar_audio")

    results: List[Dict[str, Any]] = []
    rendered = skipped = failed = 0
    started = time.perf_counter()

    for index, segment in enumerate(segments):
        spoken = spoken_text_for(segment)
        seg_id = (segment.get("segment_id") or segment.get("card_id")
                  or f"seg_{index + 1:03d}")
        if not spoken:
            # A flashcard with no avatar_line has nothing to say. Normal, not
            # an error - MCQ checkpoints are rendered by the player, not voiced.
            skipped += 1
            results.append({"segment_id": seg_id, "type": segment.get("type"),
                            "skipped": "no spoken text", "audio": {}})
            continue

        audio: Dict[str, str] = {}
        for gender in voices:
            audio_bytes = synthesize(spoken, voice_names[gender], speed)
            if not audio_bytes:
                failed += 1
                continue
            # Read the format AFTER synthesis: a remote failure mid-run falls
            # back to local WAV, and the extension has to say what is inside.
            ext = output_format()
            filename = f"{seg_id}_{uuid.uuid4().hex[:8]}_{gender}.{ext}"
            url = None
            if upload:
                try:
                    from s3_storage import upload_avatar_audio_to_s3
                    url = upload_avatar_audio_to_s3(
                        audio_bytes=audio_bytes, filename=filename, board=board,
                        class_number=class_number, subject=subject,
                        unit_number=unit_number, content_type=media_type())
                except Exception as e:
                    logger.warning(f"[TTS] S3 upload failed for {filename}: {e}")
            if not url:
                out_dir.mkdir(parents=True, exist_ok=True)
                path = out_dir / filename
                path.write_bytes(audio_bytes)
                url = str(path)
            audio[gender] = url
            rendered += 1

        if attach and audio:
            segment["audio"] = audio

        results.append({"segment_id": seg_id, "type": segment.get("type"),
                        "text": spoken[:160], "characters": len(spoken),
                        "audio": audio})

    return {
        "engine": ("kokoro (hosted service)" if active_backend() == "remote"
                   else "kokoro-onnx (local)"),
        "format": output_format(),
        "voices_used": {g: voice_names[g] for g in voices},
        "speed": speed if speed is not None else TTS_SPEED,
        "storage": "s3" if upload else "local",
        "summary": {
            "segments": len(segments),
            "files_rendered": rendered,
            "segments_skipped": skipped,
            "failures": failed,
            "seconds": round(time.perf_counter() - started, 1),
        },
        "segments": results,
    }


def spoken_text_for(segment: Dict[str, Any]) -> str:
    """What the avatar actually says for a segment.

    Teaching segments speak ``text``; a flashcard speaks its ``avatar_line``.
    Mirrors _generate_segment_audio so both paths voice the same thing - and
    note that a picture's spoken explanation is folded INTO ``text`` at
    enrichment time, so it is covered here for free.
    """
    seg_type = segment.get("type", "")
    if seg_type == "teaching":
        # A lesson segment can carry its picture's URL inline ("[https://...]")
        # at the spot where it pops up; the URL is shown, never spoken.
        from avatar_text_utils import strip_inline_images
        return strip_inline_images(segment.get("text") or "")
    if seg_type == "flashcard" or segment.get("card_id"):
        # A legacy flashcard checkpoint (the six-phase lesson has none; older
        # enriched files and the /avatar/section/enrich preview still do).
        return (segment.get("avatar_line") or "").strip()
    return ""
