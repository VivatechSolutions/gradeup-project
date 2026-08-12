"""
Agent-decided deck design/template for the seminar PPT co-pilot.

The agent picks the deck's design ONCE at session start, tailored to the class level, subject,
and topic — instead of using the fixed constants in ppt_theme.py. This module wraps an LLM call
(reusing ppt_review._call_llm_json) that returns a `theme_spec` of the shape defined by
ppt_theme.DEFAULT_THEME_SPEC.

Feasibility note: the Google Slides API cannot swap Google's built-in master themes, so the
"design" is a custom spec (background fill + fonts + colors + bullet style) applied uniformly
across every slide by mcp_slides_client.apply_theme_to_deck().

Degrades gracefully: no API key / failed call / bad output → subject-appropriate preset from
THEME_CATALOG in ppt_theme.py (pick_theme_by_subject), then DEFAULT_THEME_SPEC as last resort.
"""

from typing import Any, Dict, Optional

from ppt.ppt_theme import (
    DEFAULT_THEME_SPEC, THEME_CATALOG, pick_theme_by_subject,
    contrast_ratio,
)

_HEX_KEYS = ("background_hex", "title_color_hex", "body_color_hex", "accent_hex")
_VALID_BULLET_PRESETS = {
    "BULLET_DISC_CIRCLE_SQUARE", "BULLET_DIAMONDX_ARROW3D_SQUARE", "BULLET_CHECKBOX",
    "BULLET_ARROW_DIAMOND_DISC", "NUMBERED_DIGIT_ALPHA_ROMAN",
}

# Minimum WCAG contrast ratio between background and body text for the theme to be accepted.
_MIN_CONTRAST_RATIO = 3.5


def _is_hex(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    h = value.lstrip("#")
    return len(h) == 6 and all(c in "0123456789abcdefABCDEF" for c in h)


def _sanitize(spec: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge the LLM spec onto `fallback`, keeping only valid values.

    Extra step vs. the old version: reject the entire LLM color palette if the
    body text contrast ratio on the background is below _MIN_CONTRAST_RATIO (poor
    readability). In that case, we keep the fallback's colors but accept any
    non-color keys (font_family, sizes, bullet_preset) that are valid.
    """
    out = dict(fallback)

    if not isinstance(spec, dict):
        return out

    # If the LLM chose a catalog preset by name, load it directly.
    preset_name = (spec.get("preset_name") or "").lower().replace(" ", "_")
    if preset_name and preset_name in THEME_CATALOG:
        from ppt.ppt_theme import _strip_meta
        catalog_theme = _strip_meta(THEME_CATALOG[preset_name])
        # Still apply any explicit overrides from the LLM on top.
        out = dict(catalog_theme)

    # Apply individual hex keys if valid and not already handled by preset.
    color_keys_valid = True
    candidate_colors: Dict[str, str] = {}
    for k in _HEX_KEYS:
        v = spec.get(k)
        if _is_hex(v):
            candidate_colors[k] = v if str(v).startswith("#") else f"#{v}"
        elif v is not None:
            color_keys_valid = False  # LLM tried to set a color but got it wrong

    if candidate_colors and color_keys_valid:
        # Contrast check: body text on background.
        bg = candidate_colors.get("background_hex", out.get("background_hex", "#FFFFFF"))
        body = candidate_colors.get("body_color_hex", out.get("body_color_hex", "#212121"))
        if contrast_ratio(bg, body) >= _MIN_CONTRAST_RATIO:
            out.update(candidate_colors)
        else:
            print(
                f"  [ppt_design] LLM theme rejected (contrast {contrast_ratio(bg, body):.2f} "
                f"< {_MIN_CONTRAST_RATIO}) — keeping fallback colors."
            )

    # Non-color keys.
    if isinstance(spec.get("font_family"), str) and spec["font_family"].strip():
        out["font_family"] = spec["font_family"].strip()
    for k in ("title_size_pt", "body_size_pt"):
        v = spec.get(k)
        if isinstance(v, (int, float)) and 8 <= v <= 96:
            out[k] = float(v)
    if spec.get("bullet_preset") in _VALID_BULLET_PRESETS:
        out["bullet_preset"] = spec["bullet_preset"]

    return out


def llm_choose_theme(board: str, class_number: str, subject: Optional[str],
                     unit_title: str) -> Dict[str, Any]:
    """
    Pick a class/subject/topic-appropriate design spec. Returns a validated theme_spec
    (falls back to subject-tailored theme from THEME_CATALOG on any problem).
    """
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass

    # Subject-aware fallback from catalog.
    fallback = pick_theme_by_subject(subject, unit_title)

    try:
        from ppt.ppt_review import _call_llm_json
    except Exception:
        return fallback

    # List available preset names so the LLM can pick by name (simpler than specifying
    # every hex code from scratch, and avoids low-contrast inventions).
    preset_options = ", ".join(k for k in THEME_CATALOG if k != "general")

    system = (
        "You are a presentation designer for school students. Choose a clean, readable, "
        "age-appropriate slide design for a seminar deck. Younger classes get larger fonts and "
        "friendlier colors; match the subject and topic mood. Ensure STRONG text-on-background "
        "contrast (WCAG AA, minimum 4.5:1 for body text). "
        "Respond in strict JSON."
    )
    user = f"""Board: {board}
Class: {class_number}
Subject: {subject or '(unspecified)'}
Topic / chapter: {unit_title}

Option A (preferred): pick a preset by name. Return JSON with:
{{"preset_name": "<one of: {preset_options}, general>"}}

Option B (custom): specify all colors explicitly. Return JSON with:
{{"background_hex": "#RRGGBB", "title_color_hex": "#RRGGBB", "body_color_hex": "#RRGGBB",
  "accent_hex": "#RRGGBB", "font_family": "Arial|Roboto|Georgia|Verdana|Calibri|...",
  "title_size_pt": 28, "body_size_pt": 18,
  "bullet_preset": "BULLET_DISC_CIRCLE_SQUARE"}}

Rules:
- Body text MUST be clearly readable on the background (high contrast, avoid similar lightness).
- title_size_pt 24-40; body_size_pt 14-22 (larger for lower classes).
- bullet_preset must be one of: BULLET_DISC_CIRCLE_SQUARE, BULLET_DIAMONDX_ARROW3D_SQUARE,
  BULLET_CHECKBOX, BULLET_ARROW_DIAMOND_DISC, NUMBERED_DIGIT_ALPHA_ROMAN."""

    result = _call_llm_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], temperature=0.4)
    if not result:
        return fallback
    return _sanitize(result, fallback)
