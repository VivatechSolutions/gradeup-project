"""
Generated 3D pictures for the avatar lesson - Gemini image model, Google direct.

Every picture in a lesson is GENERATED from a one-sentence scene prompt that
the planner or the teaching writer wrote: one for the hook, two inside the
explanation, one for explore when the activity wants one, one for the real
world example, one for the mystery - at most six a section (user decision
2026-09-17). This replaced the image search + vision gate that avatar_visuals
runs for the older enrichment: a rendered scene shows exactly the moment the
lesson describes (a passenger mid-lurch, a coin over a glass), which photo
libraries rarely have, and it needs no watermark, licence or grounding gate.

The look is fixed - a soft-lit 3D render, Pixar / Blender style, with NO text
in the picture (the avatar's words carry the labels) - and is prepended to
every prompt; AVATAR_IMAGE_STYLE overrides it.

The HOOK is different (user decision 2026-09-18): ONE picture made of a 2x2
grid, one panel per option, so the student sees all four possible outcomes
side by side and picks. ``generate_option_grid`` renders the four panels as
one image (same character, same setting, four different outcomes) and then
DRAWS the A / B / C / D badge into the corner of each panel with Pillow -
deterministic, rather than trusting the image model to spell and place
letters. ``visual.panels`` says which corner is which option.

    AVATAR_IMAGE_MODEL    default gemini-3.1-flash-image, on GEMINI_API_KEY
                          (Gemini is never routed through OpenRouter)
    AVATAR_IMAGE_STYLE    the style sentence prepended to every scene prompt
    AVATAR_IMAGE_ASPECT   16:9
    AVATAR_IMAGES_ENABLED false turns generation off (lessons play text-only)

    generate_image(prompt, slug=..., board=..., class_number=..., subject=...,
                   unit_number=...)
        -> {"image_url", "prompt", "model", "kind": "generated_3d",
            "width", "height"}  or None (never raises)
    generate_option_grid(setting, {"A": scene, ...}, slug=..., ...)
        -> the same plus {"layout": "option_grid", "panels": {"A": "top-left", ...},
            "option_scenes": {...}}  or None

Rendered images are re-encoded to JPEG and stored on S3 under the same
avatar-visuals/{board}/{class}/{subject}/unit-{n}/ prefix as searched pictures.
"""

from __future__ import annotations

import base64
import hashlib
import io
import os
import re
import time
from typing import Any, Dict, Optional, Sequence

import requests
from dotenv import load_dotenv

from logger import get_logger

logger = get_logger(__name__)

for _env in (".env.local", ".env"):
    if os.path.exists(_env):
        load_dotenv(dotenv_path=_env)
        break

# Imported after load_dotenv, like avatar_llm; tracing is never load-bearing.
try:
    from langfuse_utils import generation, record_error
except Exception:  # pragma: no cover
    from contextlib import contextmanager as _contextmanager

    @_contextmanager
    def generation(*_args, **_kwargs):
        yield None

    def record_error(*_args, **_kwargs):
        pass


IMAGE_MODEL = os.getenv("AVATAR_IMAGE_MODEL", "gemini-3.1-flash-image").strip()
IMAGE_ASPECT = os.getenv("AVATAR_IMAGE_ASPECT", "16:9").strip()
IMAGE_TIMEOUT = int(os.getenv("AVATAR_IMAGE_TIMEOUT", "120"))
IMAGE_STYLE = os.getenv(
    "AVATAR_IMAGE_STYLE",
    "A high-quality 3D rendered illustration in a friendly Pixar-like style: soft studio "
    "lighting, clean composition, realistic proportions, gentle colours, suitable for a "
    "school lesson. Absolutely no text, letters, numbers, labels, arrows, captions or "
    "watermarks anywhere in the image. Scene:",
).strip()
MAX_EDGE = 1280
JPEG_QUALITY = 85

# The hook's four-panel picture. Panels read left-to-right, top-to-bottom in
# option order; the badge letters are drawn afterwards, so the model is asked
# for NO text just like every other render.
GRID_ASPECT = os.getenv("AVATAR_IMAGE_GRID_ASPECT", "1:1").strip()
GRID_STYLE = os.getenv(
    "AVATAR_IMAGE_GRID_STYLE",
    "One single image made of a 2 by 2 grid of four EQUAL rectangular panels separated by thin "
    "white borders - top-left, top-right, bottom-left, bottom-right. Every panel is a high-quality "
    "3D rendered illustration in the same friendly Pixar-like style: soft studio lighting, clean "
    "composition, realistic proportions, gentle colours. All four panels show the SAME character in "
    "the SAME setting from the SAME viewpoint; only the outcome differs, and each panel's outcome "
    "must be clearly different from the other three at a glance. Absolutely no text, letters, "
    "numbers, labels, arrows, captions or watermarks anywhere in the image.",
).strip()
PANEL_POSITIONS = {"A": "top-left", "B": "top-right", "C": "bottom-left", "D": "bottom-right"}

GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def is_enabled() -> bool:
    return os.getenv("AVATAR_IMAGES_ENABLED", "true").strip().lower() in ("1", "true", "yes")


def _api_key() -> Optional[str]:
    import avatar_llm
    return avatar_llm.api_key_for(avatar_llm.PROVIDER_GEMINI)


def _slugify(value: str, limit: int = 40) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", (value or "").lower()).strip("_")
    return slug[:limit].rstrip("_") or "image"


# ==============================================================================
#  RENDER
# ==============================================================================

def render(prompt: str, *, aspect: Optional[str] = None, style: Optional[str] = None,
           timeout: int = IMAGE_TIMEOUT, retries: int = 1) -> Optional[bytes]:
    """The raw image bytes for one scene prompt, or None.

    ``style`` replaces the default IMAGE_STYLE sentence in front of the prompt
    (the hook grid brings its own). One retry: the image endpoint occasionally
    answers with no image part (a filtered prompt, a transient 5xx). The retry
    also allows a text part, which some refusals need in order to say why -
    the text is logged, the picture is still what is returned.
    """
    key = _api_key()
    if not key:
        logger.warning("[images] no GEMINI_API_KEY - cannot render")
        return None
    prompt = (prompt or "").strip()
    if not prompt:
        return None
    full_prompt = f"{IMAGE_STYLE if style is None else style} {prompt}".strip()
    url = GEMINI_GENERATE_URL.format(model=IMAGE_MODEL)
    last_error = ""
    for attempt in range(max(1, retries) + 1):
        body: Dict[str, Any] = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "responseModalities": ["IMAGE"] if attempt == 0 else ["TEXT", "IMAGE"],
                "imageConfig": {"aspectRatio": aspect or IMAGE_ASPECT},
            },
        }
        started = time.perf_counter()
        with generation(name="lesson-image", model=IMAGE_MODEL, input=full_prompt,
                        metadata={"provider": "gemini", "attempt": attempt}) as gen:
            try:
                resp = requests.post(url, headers={"x-goog-api-key": key,
                                                   "Content-Type": "application/json"},
                                     json=body, timeout=timeout)
            except requests.Timeout:
                last_error = f"timeout after {timeout}s"
                record_error(gen, last_error)
                continue
            except Exception as e:  # noqa: BLE001
                last_error = f"transport error: {e}"
                record_error(gen, last_error)
                continue
            if not resp.ok:
                last_error = f"HTTP {resp.status_code}: {resp.text[:300]}"
                record_error(gen, last_error)
                if 400 <= resp.status_code < 500 and resp.status_code != 429:
                    break
                continue
            try:
                parts = resp.json()["candidates"][0]["content"]["parts"]
            except Exception as e:  # noqa: BLE001
                last_error = f"unreadable response: {e}: {resp.text[:200]}"
                record_error(gen, last_error)
                continue
            for part in parts:
                data = (part.get("inlineData") or {}).get("data")
                if data:
                    logger.info(f"[images] {IMAGE_MODEL} rendered '{prompt[:60]}' "
                                f"in {time.perf_counter() - started:.1f}s")
                    return base64.b64decode(data)
            said = " ".join(p.get("text", "") for p in parts if p.get("text")).strip()
            last_error = f"no image part{': ' + said[:200] if said else ''}"
            record_error(gen, last_error)
    logger.warning(f"[images] render failed for '{prompt[:60]}': {last_error}")
    return None


def _normalize(raw: bytes) -> Optional[Dict[str, Any]]:
    """Re-encode to a bounded JPEG (strips metadata; one format for the client)."""
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(raw))
        im.load()
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.thumbnail((MAX_EDGE, MAX_EDGE))
        out = io.BytesIO()
        im.convert("RGB").save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        return {"bytes": out.getvalue(), "width": im.width, "height": im.height}
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[images] could not decode rendered image: {e}")
        return None


def _store(image_bytes: bytes, slug: str, *, board: str, class_number: str,
           subject: str, unit_number: int) -> Optional[str]:
    try:
        from s3_storage import upload_avatar_visual_to_s3
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[images] S3 module unavailable: {e}")
        return None
    # Content hash in the name: a rebuild that renders the same bytes overwrites
    # the same object instead of littering the bucket.
    digest = hashlib.sha1(image_bytes).hexdigest()[:10]
    return upload_avatar_visual_to_s3(
        image_bytes=image_bytes, filename=f"{_slugify(slug)}_{digest}.jpg",
        board=board, class_number=class_number, subject=subject,
        unit_number=unit_number, content_type="image/jpeg")


# ==============================================================================
#  THE HOOK'S OPTION GRID
# ==============================================================================

def option_grid_prompt(setting: str, scenes: Dict[str, str]) -> str:
    """The scene text for the four-panel render: the shared setting, then what
    each panel shows, in option order."""
    setting = setting.strip().rstrip(".")
    lines = [f"Setting shared by all four panels: {setting}." if setting else ""]
    for letter, position in PANEL_POSITIONS.items():
        scene = (scenes.get(letter) or "").strip().rstrip(".")
        if scene:
            lines.append(f"{position.capitalize()} panel: {scene}.")
    return " ".join(line for line in lines if line)


def _badge_font(size: int):
    from PIL import ImageFont
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:  # noqa: BLE001
            continue
    try:
        return ImageFont.load_default(size=size)        # Pillow >= 10.1 bundles a font
    except Exception:  # noqa: BLE001
        return ImageFont.load_default()


def label_panels(jpeg_bytes: bytes, letters: Sequence[str] = ("A", "B", "C", "D")) -> bytes:
    """Draw one letter badge into the corner of each quadrant of a 2x2 image.

    Badges go top-left of each quadrant (A top-left, B top-right, C bottom-left,
    D bottom-right), sized to the image so they read on a phone: a white disc
    with a dark ring and a bold dark letter.
    """
    from PIL import Image, ImageDraw
    im = Image.open(io.BytesIO(jpeg_bytes)).convert("RGB")
    w, h = im.size
    draw = ImageDraw.Draw(im)
    radius = max(18, int(min(w, h) * 0.045))
    pad = int(radius * 0.6)
    font = _badge_font(int(radius * 1.35))
    quadrants = [(0, 0), (w // 2, 0), (0, h // 2), (w // 2, h // 2)]
    for letter, (x0, y0) in zip(letters, quadrants):
        cx, cy = x0 + pad + radius, y0 + pad + radius
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius),
                     fill=(255, 255, 255), outline=(30, 30, 30), width=max(2, radius // 8))
        draw.text((cx, cy), letter, fill=(20, 20, 20), font=font, anchor="mm")
    out = io.BytesIO()
    im.save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return out.getvalue()


def generate_option_grid(setting: str, scenes: Dict[str, str], *, slug: str, board: str = "",
                         class_number: str = "", subject: str = "", unit_number: int = 0
                         ) -> Optional[Dict[str, Any]]:
    """The hook picture: four outcomes in one 2x2 image, badged A-D. None on any failure."""
    if not is_enabled():
        return None
    scenes = {k: str(v or "").strip() for k, v in (scenes or {}).items() if k in PANEL_POSITIONS}
    if len(scenes) < len(PANEL_POSITIONS):
        logger.warning(f"[images] option grid needs {len(PANEL_POSITIONS)} scenes, got {len(scenes)}")
        return None
    prompt = option_grid_prompt(setting, scenes)
    raw = render(prompt, aspect=GRID_ASPECT, style=GRID_STYLE)
    if not raw:
        return None
    normalized = _normalize(raw)
    if not normalized:
        return None
    try:
        labelled = label_panels(normalized["bytes"], list(PANEL_POSITIONS))
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[images] could not badge the option grid ({e}) - shipping it unlabelled")
        labelled = normalized["bytes"]
    url = _store(labelled, slug, board=board, class_number=class_number,
                 subject=subject, unit_number=unit_number)
    if not url:
        logger.warning(f"[images] S3 upload failed for '{slug}' - picture dropped")
        return None
    return {
        "image_url": url,
        "prompt": prompt,
        "model": IMAGE_MODEL,
        "kind": "generated_3d",
        "layout": "option_grid",
        "panels": dict(PANEL_POSITIONS),
        "option_scenes": scenes,
        "width": normalized["width"],
        "height": normalized["height"],
    }


# ==============================================================================
#  PUBLIC
# ==============================================================================

def generate_image(prompt: str, *, slug: str, board: str = "", class_number: str = "",
                   subject: str = "", unit_number: int = 0,
                   aspect: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Render one scene, host it on S3 and describe it for the lesson. None on any failure.

    ``slug`` names the object (the phase and section it belongs to); the
    prompt is stored on the visual so raise-hand and a rebuild know what the
    picture was meant to show.
    """
    if not is_enabled():
        return None
    prompt = (prompt or "").strip()
    if not prompt:
        return None
    raw = render(prompt, aspect=aspect)
    if not raw:
        return None
    normalized = _normalize(raw)
    if not normalized:
        return None
    url = _store(normalized["bytes"], slug, board=board, class_number=class_number,
                 subject=subject, unit_number=unit_number)
    if not url:
        logger.warning(f"[images] S3 upload failed for '{slug}' - picture dropped")
        return None
    return {
        "image_url": url,
        "prompt": prompt,
        "model": IMAGE_MODEL,
        "kind": "generated_3d",
        "width": normalized["width"],
        "height": normalized["height"],
    }
