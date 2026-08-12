"""
Theme constants for the seminar PPT co-pilot.

These values are the single source of truth for every font-size, bullet-style,
and color decision the agent makes. All agent nodes and the slides client import
from here so there is exactly one place to update when the theme changes.

Enforced uniformly across ALL slides by apply_theme_to_deck() in mcp_slides_client.

THEME_CATALOG provides 8 subject-appropriate preset themes. Use pick_theme_by_subject()
to select the right one automatically from the subject/unit_title strings.
"""

from typing import Any, Dict, Optional

# ── Typography constants ────────────────────────────────────────────────────────

# Title placeholder (TITLE / CENTERED_TITLE) font size in points.
TITLE_FONT_SIZE_PT: float = 28.0

# Body / subtitle placeholder font size in points.
BODY_FONT_SIZE_PT: float = 18.0

# Google Slides bulletPreset for body bullets.
# Options: BULLET_DISC_CIRCLE_SQUARE | BULLET_DIAMONDX_ARROW3D_SQUARE |
#          BULLET_CHECKBOX | BULLET_ARROW_DIAMOND_DISC | NUMBERED_DIGIT_ALPHA_ROMAN
BULLET_PRESET: str = "BULLET_DISC_CIRCLE_SQUARE"

# Maximum bullets per slide before the agent flags it as overcrowded.
MAX_BULLETS_PER_SLIDE: int = 6

# Minimum acceptable title font size — anything below this triggers a "significant" fix.
MIN_TITLE_FONT_SIZE_PT: float = 18.0

# A body line longer than this many words is prose, not a concise bullet → triggers a
# restructure into point-wise bullets.
MAX_WORDS_PER_BULLET: int = 14


# ── Theme catalog ──────────────────────────────────────────────────────────────
# 8 predefined, subject-appropriate deck themes. Each entry has exactly the keys
# used by mcp_slides_client (background_hex, title_color_hex, body_color_hex,
# accent_hex, font_family, title_size_pt, body_size_pt, bullet_preset).
# subject_keywords is matched by pick_theme_by_subject() but is not sent to Slides.

THEME_CATALOG: Dict[str, Dict[str, Any]] = {
    "biology": {
        "name": "Biology",
        "subject_keywords": ["bio", "botany", "zoology", "biology", "plant", "animal",
                             "photo", "photosynthesis", "ecology", "genetics", "cell"],
        "background_hex": "#F0FAF4",
        "title_color_hex": "#1B5E20",   # Forest green
        "body_color_hex": "#1E293B",    # Slate black
        "accent_hex": "#2E7D32",        # Vivid green
        "font_family": "Verdana",
        "title_size_pt": 30.0,
        "body_size_pt": 18.0,
        "bullet_preset": "BULLET_CHECKBOX",
    },
    "chemistry_physics": {
        "name": "Chemistry & Physics",
        "subject_keywords": ["chem", "chemistry", "phys", "physics", "atom", "quantum",
                             "molecule", "element", "periodic", "force", "energy",
                             "thermodynamics", "optics", "electricity", "magnetism"],
        "background_hex": "#F0F4FF",
        "title_color_hex": "#0D47A1",   # Deep navy
        "body_color_hex": "#1F2937",    # Charcoal
        "accent_hex": "#0284C7",        # Bright cyan/blue
        "font_family": "Roboto",
        "title_size_pt": 28.0,
        "body_size_pt": 18.0,
        "bullet_preset": "BULLET_ARROW_DIAMOND_DISC",
    },
    "history_social": {
        "name": "History & Social Science",
        "subject_keywords": ["hist", "history", "social", "civics", "civic", "roman",
                             "empire", "civiliz", "revolution", "geography", "politic",
                             "economics", "constitution", "democracy"],
        "background_hex": "#FFFBF5",
        "title_color_hex": "#4A154B",   # Royal purple/warm wine
        "body_color_hex": "#2D3748",    # Charcoal
        "accent_hex": "#C62828",        # Terracotta red
        "font_family": "Georgia",
        "title_size_pt": 32.0,
        "body_size_pt": 18.0,
        "bullet_preset": "BULLET_DIAMONDX_ARROW3D_SQUARE",
    },
    "mathematics": {
        "name": "Mathematics",
        "subject_keywords": ["math", "maths", "algebra", "geometry", "trigon", "calculus",
                             "statistic", "probability", "number", "arithmetic", "theorem",
                             "equation", "polynomial"],
        "background_hex": "#F5F3FF",
        "title_color_hex": "#4C1D95",   # Deep violet
        "body_color_hex": "#1F1F3A",    # Dark navy
        "accent_hex": "#7C3AED",        # Vivid violet
        "font_family": "Calibri",
        "title_size_pt": 28.0,
        "body_size_pt": 18.0,
        "bullet_preset": "NUMBERED_DIGIT_ALPHA_ROMAN",
    },
    "geography": {
        "name": "Geography",
        "subject_keywords": ["geo", "geography", "map", "climate", "continent", "ocean",
                             "river", "mountain", "population", "soil", "weather",
                             "disaster", "resource", "terrain"],
        "background_hex": "#F0FDF4",
        "title_color_hex": "#064E3B",   # Deep teal
        "body_color_hex": "#1C3A2E",    # Dark forest
        "accent_hex": "#059669",        # Emerald
        "font_family": "Arial",
        "title_size_pt": 30.0,
        "body_size_pt": 18.0,
        "bullet_preset": "BULLET_DISC_CIRCLE_SQUARE",
    },
    "literature_languages": {
        "name": "Literature & Languages",
        "subject_keywords": ["english", "literature", "language", "grammar", "poem", "poetry",
                             "prose", "novel", "drama", "essay", "hindi", "kannada",
                             "telugu", "tamil", "marathi", "sanskrit", "author", "writer"],
        "background_hex": "#FEFCE8",
        "title_color_hex": "#78350F",   # Warm amber-brown
        "body_color_hex": "#292524",    # Warm near-black
        "accent_hex": "#D97706",        # Golden amber
        "font_family": "Georgia",
        "title_size_pt": 30.0,
        "body_size_pt": 18.0,
        "bullet_preset": "BULLET_DISC_CIRCLE_SQUARE",
    },
    "computer_science": {
        "name": "Computer Science",
        "subject_keywords": ["computer", "programming", "coding", "algorithm", "software",
                             "hardware", "network", "database", "internet", "artificial",
                             "machine learning", "python", "java", "c++", "binary", "data"],
        "background_hex": "#0F172A",
        "title_color_hex": "#38BDF8",   # Sky blue (on dark bg)
        "body_color_hex": "#CBD5E1",    # Light slate
        "accent_hex": "#34D399",        # Neon green accent
        "font_family": "Roboto",
        "title_size_pt": 28.0,
        "body_size_pt": 17.0,
        "bullet_preset": "BULLET_ARROW_DIAMOND_DISC",
    },
    "general": {
        "name": "General",
        "subject_keywords": [],         # fallback — matches everything
        "background_hex": "#FFFFFF",
        "title_color_hex": "#1A237E",
        "body_color_hex": "#212121",
        "accent_hex": "#1565C0",
        "font_family": "Arial",
        "title_size_pt": TITLE_FONT_SIZE_PT,
        "body_size_pt": BODY_FONT_SIZE_PT,
        "bullet_preset": BULLET_PRESET,
    },
}


# ── House style (fixed) ─────────────────────────────────────────────────────────
# A single professional house style used for EVERY deck — modeled on the reference
# "Mastering Slide Formation" template: clean white, navy titles, indigo accent, slate
# body, Plus Jakarta Sans headings + Inter body, light icon-cards. Extra keys beyond the
# Slides-API set (heading_font/body_font/card_*/icon_*) are read by the icon-grid renderer.
HOUSE_THEME: Dict[str, Any] = {
    "background_hex": "#FFFFFF",   # clean white slide background
    "title_color_hex": "#0F172A",  # near-black navy titles
    "body_color_hex": "#334155",   # slate body text
    "accent_hex": "#4F46E5",       # indigo accent (title tick, labels, icon glyphs)
    "font_family": "Plus Jakarta Sans",   # theme pass styles titles with this
    "heading_font": "Plus Jakarta Sans",
    "body_font": "Inter",
    "card_fill_hex": "#F8FAFC",     # very light card background
    "card_border_hex": "#E2E8F0",   # subtle card border
    "icon_fill_hex": "#E0E7FF",     # light-indigo icon square
    "title_size_pt": 26.0,
    "body_size_pt": 15.0,
    "bullet_preset": "BULLET_DISC_CIRCLE_SQUARE",
}


def pick_theme_by_subject(subject: Optional[str], unit_title: str) -> Dict[str, Any]:
    """
    Return the deck theme spec. The product uses ONE fixed professional house style for
    every deck (see HOUSE_THEME), so subject/topic no longer change the palette — this keeps
    all decks visually consistent with the reference template. The old per-subject
    THEME_CATALOG is retained for reference but no longer selected.
    """
    return dict(HOUSE_THEME)


def _strip_meta(spec: Dict[str, Any]) -> Dict[str, Any]:
    """Return a copy of a catalog entry without internal-only keys."""
    skip = {"name", "subject_keywords"}
    return {k: v for k, v in spec.items() if k not in skip}


# Default spec is now the fixed house style (was the 'general' catalog entry).
DEFAULT_THEME_SPEC = dict(HOUSE_THEME)


# ── Color utilities ─────────────────────────────────────────────────────────────

def hex_to_rgb(hex_color: str) -> dict:
    """'#RRGGBB' → {'red': f, 'green': f, 'blue': f} with 0–1 floats (Slides API rgbColor)."""
    h = (hex_color or "").lstrip("#")
    if len(h) != 6:
        h = "000000"
    try:
        r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    except ValueError:
        r = g = b = 0.0
    return {"red": r, "green": g, "blue": b}


def _tint_rgb(rgb: dict, factor: float = 0.85) -> dict:
    """
    Lighten an rgbColor dict toward white by `factor` (0=original, 1=pure white).
    Used to derive a slightly lighter card background from the slide background.

    Example: factor=0.85 → each channel moves 85% toward 1.0 (white).
    """
    return {
        "red":   min(1.0, rgb["red"]   + factor * (1.0 - rgb["red"])),
        "green": min(1.0, rgb["green"] + factor * (1.0 - rgb["green"])),
        "blue":  min(1.0, rgb["blue"]  + factor * (1.0 - rgb["blue"])),
    }


def luminance(hex_color: str) -> float:
    """
    Relative luminance of a hex color (0=black, 1=white) per WCAG 2.1.
    Used for contrast checking between background and body text.
    """
    rgb = hex_to_rgb(hex_color)
    result = 0.0
    for ch in ("red", "green", "blue"):
        c = rgb[ch]
        c = c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
        result += c * (0.2126 if ch == "red" else (0.7152 if ch == "green" else 0.0722))
    return result


def contrast_ratio(hex1: str, hex2: str) -> float:
    """WCAG contrast ratio between two hex colors. Good readability ≥ 4.5."""
    l1 = luminance(hex1)
    l2 = luminance(hex2)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
