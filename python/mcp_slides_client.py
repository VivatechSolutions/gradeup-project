"""
Google Slides client for the Google Slides Agent (M3 apply layer).

This is the tool binding the Google Slides Agent uses to READ a slide and WRITE approved
changes to the real deck. It talks to the Google Slides + Drive REST APIs directly via a
service account (simpler and more reliable for a backend than running an npx MCP server).

Two credential modes, checked in order:

  1. OAuth "as yourself" (RECOMMENDED for personal Gmail) — decks are created in and owned by
     your own Google Drive. Run authorize_google.py once to produce google_token.json.
       env GOOGLE_OAUTH_TOKEN_JSON  = path to the saved user token (default ./google_token.json)

  2. Service account — only usable on Google Workspace (Shared Drive / domain-wide delegation);
     on a personal account it can EDIT existing decks but CANNOT create them (0 Drive storage).
       env GOOGLE_SERVICE_ACCOUNT_JSON  = path to the key file
       env GOOGLE_SERVICE_ACCOUNT_INFO  = the key JSON inline (string)

Enable on the Google Cloud project: **Google Slides API** and **Google Drive API**.
When neither is configured, is_available() returns False and callers fall back to the M1 stub.

See SEMINAR_PPT_AUTOMATION_PLAN.md §4 and §8.
"""

import contextvars
import json
import os
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

# OAuth scopes. drive.file = manage only files this app creates (non-sensitive, no app
# verification needed for personal use). Keep in sync with authorize_google.py.
OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/drive.file",
]
# Service accounts request full drive (they can only edit already-shared decks anyway).
_SA_SCOPES = [
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/drive",
]

# Placeholder types that count as the slide's title.
_TITLE_PLACEHOLDERS = {"TITLE", "CENTERED_TITLE"}

_slides_service = None
_drive_service = None
_creds_checked = False
_creds = None
_cred_kind = None   # "oauth" | "service_account" | None

# Per-request Google access token (e.g. a student's token fetched from Scalekit). When set,
# _services() builds a client from it instead of the module-global OAuth/service-account creds.
_ACCESS_TOKEN: "contextvars.ContextVar[Optional[str]]" = contextvars.ContextVar(
    "mcp_slides_access_token", default=None)
# Cache of (slides, drive) service pairs keyed by access token, to avoid rebuilding per call.
_token_services: Dict[str, tuple] = {}


@contextmanager
def access_token(token: Optional[str]):
    """
    Run a block of slides calls under a specific Google access token (per-student).

        with mcp_slides_client.access_token(student_token):
            create_and_scaffold(...)   # uses the student's Google account

    Passing None is a no-op (falls back to the module-global credentials).
    """
    reset = _ACCESS_TOKEN.set(token) if token else None
    try:
        yield
    finally:
        if reset is not None:
            _ACCESS_TOKEN.reset(reset)


def _services_for_token(token: str):
    cached = _token_services.get(token)
    if cached is not None:
        return cached
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    creds = Credentials(token=token)   # bearer token; Scalekit handles refresh server-side
    slides = build("slides", "v1", credentials=creds, cache_discovery=False)
    drive = build("drive", "v3", credentials=creds, cache_discovery=False)
    _token_services[token] = (slides, drive)
    return slides, drive


# ── credentials / services ────────────────────────────────────────────────────

def _load_oauth_creds():
    """Load the saved OAuth user token (google_token.json), refreshing if needed."""
    token_path = os.environ.get("GOOGLE_OAUTH_TOKEN_JSON", "./google_token.json")
    if not os.path.exists(token_path):
        return None
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        creds = Credentials.from_authorized_user_file(token_path, OAUTH_SCOPES)
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(token_path, "w") as f:
                f.write(creds.to_json())
        return creds
    except Exception as e:
        print(f"  [mcp_slides_client] OAuth token load failed: {e}")
        return None


def _load_service_account_creds():
    """Load a service-account key (Workspace only for creation)."""
    try:
        from google.oauth2 import service_account
    except ImportError:
        return None
    info_inline = os.environ.get("GOOGLE_SERVICE_ACCOUNT_INFO")
    path = (os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
            or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))
    try:
        if info_inline:
            return service_account.Credentials.from_service_account_info(
                json.loads(info_inline), scopes=_SA_SCOPES)
        if path and os.path.exists(path):
            return service_account.Credentials.from_service_account_file(
                path, scopes=_SA_SCOPES)
    except Exception as e:
        print(f"  [mcp_slides_client] service-account load failed: {e}")
    return None


def _load_credentials():
    """Return usable credentials (OAuth preferred), or None. Result is cached."""
    global _creds, _creds_checked, _cred_kind
    if _creds_checked:
        return _creds
    _creds_checked = True

    _creds = _load_oauth_creds()
    if _creds is not None:
        _cred_kind = "oauth"
    else:
        _creds = _load_service_account_creds()
        _cred_kind = "service_account" if _creds is not None else None
    return _creds


def credential_kind() -> Optional[str]:
    """Which credential mode is active: 'oauth', 'service_account', or None."""
    _load_credentials()
    return _cred_kind


def can_create_decks() -> bool:
    """
    Deck creation needs a real user account. A per-student Scalekit token is a real Google
    user (can create), as is our own OAuth. Service accounts can't (no Drive storage).
    """
    if _ACCESS_TOKEN.get():
        return True
    return credential_kind() == "oauth"


def is_available() -> bool:
    """True when a per-request token is set OR module-global credentials are configured."""
    if _ACCESS_TOKEN.get():
        return True
    return _load_credentials() is not None


def _services():
    """
    Return (slides, drive) clients.

    Uses the per-request access token (student's, from Scalekit) when one is set; otherwise the
    module-global OAuth/service-account credentials.
    """
    token = _ACCESS_TOKEN.get()
    if token:
        return _services_for_token(token)

    global _slides_service, _drive_service
    if _slides_service is not None and _drive_service is not None:
        return _slides_service, _drive_service

    creds = _load_credentials()
    if creds is None:
        raise RuntimeError("Google Slides credentials are not configured")

    from googleapiclient.discovery import build
    _slides_service = build("slides", "v1", credentials=creds, cache_discovery=False)
    _drive_service = build("drive", "v3", credentials=creds, cache_discovery=False)
    return _slides_service, _drive_service


# ── helpers ───────────────────────────────────────────────────────────────────

def presentation_id_of(deck_ref: str) -> str:
    """'gslides:1AbC' -> '1AbC'. Accepts a bare id too."""
    return deck_ref.split(":", 1)[1] if ":" in deck_ref else deck_ref


def _title_element(slide: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return the title placeholder pageElement of a slide, if any."""
    for el in slide.get("pageElements", []):
        placeholder = el.get("shape", {}).get("placeholder", {})
        if placeholder.get("type") in _TITLE_PLACEHOLDERS:
            return el
    return None


def _extract_title_text(el: Dict[str, Any]) -> str:
    parts = []
    for te in el.get("shape", {}).get("text", {}).get("textElements", []):
        run = te.get("textRun")
        if run and run.get("content"):
            parts.append(run["content"])
    return "".join(parts).strip()


def _placeholder_element(slide: Dict[str, Any], types: set) -> Optional[Dict[str, Any]]:
    for el in slide.get("pageElements", []):
        ph = el.get("shape", {}).get("placeholder", {})
        if ph.get("type") in types:
            return el
    return None


def _paragraphs(el: Optional[Dict[str, Any]]) -> List[str]:
    """Non-empty lines of a text shape — a slide's bullets/body live here."""
    if not el:
        return []
    content = "".join(
        te.get("textRun", {}).get("content", "")
        for te in el.get("shape", {}).get("text", {}).get("textElements", [])
    )
    return [line.strip() for line in content.split("\n") if line.strip()]


def _extract_notes(slide: Dict[str, Any]) -> str:
    notes_page = slide.get("slideProperties", {}).get("notesPage", {})
    body = _placeholder_element(notes_page, {"BODY"})
    return "\n".join(_paragraphs(body))


# ── public API used by the agent nodes ────────────────────────────────────────

def create_presentation(title: str) -> str:
    """
    Create a real Google Slides deck and share it 'anyone with the link can edit'.
    Returns the presentationId. Requires OAuth creds (a service account cannot create decks
    on a personal Google account — 0 Drive storage).
    """
    if not can_create_decks():
        raise RuntimeError(
            "Deck creation needs OAuth credentials — run authorize_google.py. "
            "(A service account has no Drive storage on personal Gmail and cannot create files.)"
        )
    slides, drive = _services()
    pres = slides.presentations().create(body={"title": title or "Seminar Deck"}).execute()
    presentation_id = pres["presentationId"]

    # Make it openable by anyone with the link (so the frontend iframe works without login).
    try:
        drive.permissions().create(
            fileId=presentation_id,
            body={"type": "anyone", "role": "writer"},
            fields="id",
        ).execute()
    except Exception as e:
        print(f"  [mcp_slides_client] link-sharing failed (deck still created): {e}")
    return presentation_id


def get_slide(deck_ref: str, slide_index: int) -> Dict[str, Any]:
    """Fetch a slide snapshot: title text, title font size, and object ids for editing."""
    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    pres = slides.presentations().get(presentationId=pid).execute()
    pages = pres.get("slides", [])

    if slide_index < 0 or slide_index >= len(pages):
        return {"slide_index": slide_index, "exists": False, "source": "google_slides"}

    slide = pages[slide_index]
    title_el = _title_element(slide)
    font_size = None
    if title_el:
        style = (title_el.get("shape", {}).get("text", {})
                 .get("textElements", [{}]))
        for te in style:
            fs = te.get("textRun", {}).get("style", {}).get("fontSize")
            if fs and fs.get("magnitude"):
                font_size = fs["magnitude"]
                break

    return {
        "slide_index": slide_index,
        "exists": True,
        "slide_object_id": slide.get("objectId"),
        "title_object_id": title_el.get("objectId") if title_el else None,
        "title": _extract_title_text(title_el) if title_el else "",
        "title_font_size": font_size,
        "source": "google_slides",
    }


def get_slide_content(deck_ref: str, slide_index: int) -> Dict[str, Any]:
    """
    Connect to one slide and return its FULL content so the agent can help with what's on it.

    Unlike get_slide (title/font only), this returns title, body bullets, every text shape
    (with object ids for editing), and speaker notes. This is the "connect to the slide" helper
    the content-review flow reads from.
    """
    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    pres = slides.presentations().get(presentationId=pid).execute()
    pages = pres.get("slides", [])
    if slide_index < 0 or slide_index >= len(pages):
        return {"slide_index": slide_index, "exists": False, "source": "google_slides"}

    slide = pages[slide_index]
    title_el = _title_element(slide)
    body_el = _placeholder_element(slide, {"BODY", "SUBTITLE"})

    title_font_size = None
    if title_el:
        for te in title_el.get("shape", {}).get("text", {}).get("textElements", []):
            fs = te.get("textRun", {}).get("style", {}).get("fontSize")
            if fs and fs.get("magnitude"):
                title_font_size = fs["magnitude"]
                break

    shapes = []
    for el in slide.get("pageElements", []):
        shape = el.get("shape")
        if not shape or "text" not in shape:
            continue
        lines = _paragraphs(el)
        if not lines:
            continue
        shapes.append({
            "object_id": el.get("objectId"),
            "placeholder": shape.get("placeholder", {}).get("type"),
            "lines": lines,
            "text": "\n".join(lines),
        })

    return {
        "slide_index": slide_index,
        "exists": True,
        "slide_object_id": slide.get("objectId"),
        "title": _extract_title_text(title_el) if title_el else "",
        "title_object_id": title_el.get("objectId") if title_el else None,
        "title_font_size": title_font_size,
        "body": "\n".join(_paragraphs(body_el)),
        "body_object_id": body_el.get("objectId") if body_el else None,
        "bullets": _paragraphs(body_el),
        "shapes": shapes,
        "notes": _extract_notes(slide),
        "source": "google_slides",
    }


def get_deck_content(deck_ref: str) -> List[Dict[str, Any]]:
    """Full content of every slide — for guiding the student across the whole deck."""
    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    pres = slides.presentations().get(presentationId=pid).execute()
    n = len(pres.get("slides", []))
    return [get_slide_content(deck_ref, i) for i in range(n)]


def set_body_bullets(deck_ref: str, slide_index: int, bullets: List[str],
                     object_id: Optional[str] = None,
                     theme_spec: Optional[Dict[str, Any]] = None) -> bool:
    """
    Help with a slide's content: replace its body with a clean bulleted list.

    Targets the slide's BODY placeholder (or an explicit object_id). Clears any existing
    body text, inserts the new lines, and formats them as bullets using the session's
    theme_spec (font family, body color, bullet preset). Returns True.
    """
    from ppt.ppt_theme import DEFAULT_THEME_SPEC, hex_to_rgb

    spec = {**DEFAULT_THEME_SPEC, **(theme_spec or {})}
    bullet_preset = spec.get("bullet_preset", "BULLET_DISC_CIRCLE_SQUARE")
    font_family = spec.get("font_family", "Arial")
    body_color = hex_to_rgb(spec.get("body_color_hex", "#212121"))
    body_size_pt = float(spec.get("body_size_pt", 18.0))

    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    content = get_slide_content(deck_ref, slide_index)
    target = object_id or content.get("body_object_id")
    if not target:
        raise RuntimeError(f"Slide {slide_index} has no body placeholder for bullets")

    requests = []
    if (content.get("body") or "").strip():
        requests.append({"deleteText": {"objectId": target, "textRange": {"type": "ALL"}}})
    requests.append({
        "insertText": {"objectId": target, "text": "\n".join(bullets), "insertionIndex": 0}
    })
    requests.append({
        "createParagraphBullets": {
            "objectId": target,
            "textRange": {"type": "ALL"},
            "bulletPreset": bullet_preset,
        }
    })
    # Apply session theme colors and font to the new text.
    style: Dict[str, Any] = {
        "fontFamily": font_family,
        "fontSize": {"magnitude": body_size_pt, "unit": "PT"},
        "foregroundColor": {"opaqueColor": {"rgbColor": body_color}},
    }
    requests.append({
        "updateTextStyle": {
            "objectId": target,
            "style": style,
            "textRange": {"type": "ALL"},
            "fields": "fontFamily,fontSize,foregroundColor",
        }
    })
    slides.presentations().batchUpdate(
        presentationId=pid, body={"requests": requests}).execute()
    return True


def _body_text_and_id(deck_ref: str, slide_index: int):
    """Return (body_object_id, raw_text) for a slide's BODY/SUBTITLE placeholder.

    raw_text concatenates textRun.content in order, so string offsets match the API's
    startIndex (needed for FIXED_RANGE text styling).
    """
    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    pres = slides.presentations().get(presentationId=pid).execute()
    pages = pres.get("slides", [])
    if slide_index < 0 or slide_index >= len(pages):
        return None, ""
    body_el = _placeholder_element(pages[slide_index], {"BODY", "SUBTITLE"})
    if not body_el:
        return None, ""
    text = "".join(
        te.get("textRun", {}).get("content", "")
        for te in body_el.get("shape", {}).get("text", {}).get("textElements", [])
    )
    return body_el.get("objectId"), text


def apply_highlight_terms(deck_ref: str, slide_index: int, terms: List[str]) -> bool:
    """
    Bold the given key terms wherever they appear in a slide's body text.

    Finds each term (case-insensitive) in the body's raw text and emits a FIXED_RANGE
    updateTextStyle(bold=true). Terms not found are skipped. Returns True if anything was bolded.
    Run this AFTER set_bullets so it indexes the final text.
    """
    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    obj_id, text = _body_text_and_id(deck_ref, slide_index)
    if not obj_id or not text:
        return False

    low = text.lower()
    requests = []
    seen = set()
    for term in terms or []:
        t = str(term).strip()
        if not t:
            continue
        tl = t.lower()
        start = 0
        while True:
            idx = low.find(tl, start)
            if idx == -1:
                break
            s, e = idx, idx + len(t)
            if (s, e) not in seen:
                seen.add((s, e))
                requests.append({
                    "updateTextStyle": {
                        "objectId": obj_id,
                        "textRange": {"type": "FIXED_RANGE", "startIndex": s, "endIndex": e},
                        "style": {"bold": True},
                        "fields": "bold",
                    }
                })
            start = idx + len(t)

    if requests:
        slides.presentations().batchUpdate(
            presentationId=pid, body={"requests": requests}).execute()
    return bool(requests)


def apply_spelling_fixes(deck_ref: str, slide_index: int,
                         corrections: List[Dict[str, str]]) -> bool:
    """
    Fix spelling on one slide via replaceAllText, scoped to that slide's page.

    Each correction is {"wrong": <exact text>, "right": <fix>}. Replacement is scoped to the
    slide's pageObjectId so it never touches other slides. Returns True if anything was replaced.
    """
    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    content = get_slide_content(deck_ref, slide_index)
    slide_obj = content.get("slide_object_id")

    requests = []
    for c in corrections or []:
        wrong = str((c or {}).get("wrong", "")).strip()
        right = str((c or {}).get("right", "")).strip()
        if not wrong or not right or wrong == right:
            continue
        req = {"replaceAllText": {
            "containsText": {"text": wrong, "matchCase": False},
            "replaceText": right,
        }}
        if slide_obj:
            req["replaceAllText"]["pageObjectIds"] = [slide_obj]
        requests.append(req)

    if requests:
        slides.presentations().batchUpdate(
            presentationId=pid, body={"requests": requests}).execute()
    return bool(requests)


def apply_font_title_size(deck_ref: str, slide_index: int, size: float,
                          text: Optional[str] = None) -> bool:
    """
    Set the title font size on a slide via batchUpdate(updateTextStyle).

    You can only style text that exists. If the title placeholder is empty, we first
    insertText (the student's title if given, else a placeholder) so the size sticks.
    Returns True if applied. Raises if the slide has no title placeholder.
    """
    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    snapshot = get_slide(deck_ref, slide_index)
    title_object_id = snapshot.get("title_object_id")
    if not title_object_id:
        raise RuntimeError(f"Slide {slide_index} has no title placeholder to resize")

    requests = []
    if not (snapshot.get("title") or "").strip():   # empty box → insert text first
        requests.append({
            "insertText": {
                "objectId": title_object_id,
                "text": text or "Title",
                "insertionIndex": 0,
            }
        })
    requests.append({
        "updateTextStyle": {
            "objectId": title_object_id,
            "style": {"fontSize": {"magnitude": size, "unit": "PT"}},
            "textRange": {"type": "ALL"},
            "fields": "fontSize",
        }
    })
    slides.presentations().batchUpdate(
        presentationId=pid, body={"requests": requests}).execute()
    return True


def _placeholder_id(slide: Dict[str, Any], types: set) -> Optional[str]:
    for el in slide.get("pageElements", []):
        ph = el.get("shape", {}).get("placeholder", {})
        if ph.get("type") in types:
            return el.get("objectId")
    return None


def create_and_scaffold(title: str, unit: Optional[int] = None,
                        sections: Optional[list] = None,
                        theme_spec: Optional[Dict[str, Any]] = None) -> str:
    """
    Create a real deck AND give it a usable starting structure so the student doesn't
    open a blank page: a filled title slide + one slide per starter section.

    `sections` defaults to a generic seminar outline. In M2 these come from RAG (the unit's
    important topics). Returns the presentationId.
    """
    pid = create_presentation(title)   # creates empty deck + link-shares it
    slides, _ = _services()

    pres = slides.presentations().get(presentationId=pid).execute()
    slide0 = pres["slides"][0]
    requests = []

    # 1) Fill the title slide.
    title_id = _placeholder_id(slide0, {"TITLE", "CENTERED_TITLE"})
    if title_id:
        requests.append({"insertText": {"objectId": title_id, "text": title,
                                         "insertionIndex": 0}})
    subtitle_id = _placeholder_id(slide0, {"SUBTITLE", "BODY"})
    if subtitle_id:
        sub = f"Seminar • Unit {unit}" if unit is not None else "Seminar"
        requests.append({"insertText": {"objectId": subtitle_id, "text": sub,
                                        "insertionIndex": 0}})

    # 2) Add a titled slide per starter section (one batch; later requests can
    #    reference placeholder ids created by earlier createSlide requests).
    sections = sections or ["Introduction", "Key Concepts", "Examples", "Summary"]
    for i, name in enumerate(sections):
        slide_obj = f"sec_{i}"
        title_ph = f"sec_{i}_title"
        requests.append({
            "createSlide": {
                "objectId": slide_obj,
                "slideLayoutReference": {"predefinedLayout": "TITLE_AND_BODY"},
                "placeholderIdMappings": [{
                    "layoutPlaceholder": {"type": "TITLE", "index": 0},
                    "objectId": title_ph,
                }],
            }
        })
        requests.append({"insertText": {"objectId": title_ph, "text": name,
                                        "insertionIndex": 0}})

    if requests:
        slides.presentations().batchUpdate(
            presentationId=pid, body={"requests": requests}).execute()

    # 3) Apply the agent-chosen design (background + fonts + colors) across all slides.
    if theme_spec:
        try:
            apply_theme_to_deck(f"gslides:{pid}", theme_spec)
        except Exception as e:
            print(f"  [mcp_slides_client] create_and_scaffold: theme apply failed: {e}")
    return pid


# ── card layout (designed multi-card slide) ───────────────────────────────────

# Object-id prefix for shapes this module creates for the card layout. Used to find and
# delete a slide's previous cards so re-rendering is idempotent (no stacking).
CARD_SHAPE_PREFIX = "semcard"


def _emu_to_pt(magnitude: float) -> float:
    """Google returns page/element geometry in EMU; 1 pt = 12700 EMU."""
    return float(magnitude) / 12700.0


def _u16len(s: str) -> int:
    """Length of a string in UTF-16 code units — the unit Slides uses for text indices.
    (Emoji outside the BMP count as 2, so this keeps FIXED_RANGE offsets correct.)"""
    return len((s or "").encode("utf-16-le")) // 2


def _page_size_pt(pres: Dict[str, Any]) -> tuple:
    """Presentation page size as (width_pt, height_pt). Defaults to 16:9 (720x405)."""
    def _dim(d: Dict[str, Any], default: float) -> float:
        mag = (d or {}).get("magnitude")
        if mag is None:
            return default
        return _emu_to_pt(mag) if (d.get("unit") == "EMU") else float(mag)
    ps = pres.get("pageSize", {}) or {}
    return _dim(ps.get("width", {}), 720.0), _dim(ps.get("height", {}), 405.0)


def render_card_layout(deck_ref: str, slide_index: int, cards: List[Dict[str, Any]],
                       theme_spec: Optional[Dict[str, Any]] = None) -> bool:
    """
    Render a slide as 2-3 designed CARDS (rounded rectangles), each with an emoji icon,
    a themed heading, and grouped bullet points with bold lead-ins — reproducing the
    seminar card design instead of a flat bullet list.

    cards: [{"heading": str, "icon": str(optional emoji),
             "points": [{"lead": str(optional), "text": str} | str, ...]}, ...]

    Idempotent: deletes any cards this module previously drew on the slide, then redraws.
    Colours come from theme_spec (accent for headings/lead-ins, body colour for text).
    Returns True if anything was drawn.
    """
    import uuid
    from ppt.ppt_theme import DEFAULT_THEME_SPEC, hex_to_rgb

    spec = {**DEFAULT_THEME_SPEC, **(theme_spec or {})}
    accent = hex_to_rgb(spec.get("accent_hex", "#1565C0"))
    body_color = hex_to_rgb(spec.get("body_color_hex", "#212121"))
    font_family = spec.get("font_family", "Arial")
    # Tinted card fill: lighten the slide background toward white (85%) to make cards
    # subtly distinctive per subject rather than always using a flat white.
    from ppt.ppt_theme import _tint_rgb
    bg_rgb = hex_to_rgb(spec.get("background_hex", "#FFFFFF"))
    card_fill = _tint_rgb(bg_rgb, factor=0.75)
    border = hex_to_rgb("#D0D7DE")

    # Normalize: keep cards with a heading or at least one point; cap to 3 for readability.
    clean_cards = [c for c in (cards or []) if c and (c.get("heading") or c.get("points"))][:3]
    if not clean_cards:
        return False

    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    pres = slides.presentations().get(presentationId=pid).execute()
    pages = pres.get("slides", [])
    if slide_index < 0 or slide_index >= len(pages):
        raise RuntimeError(f"Slide {slide_index} out of range for card layout")
    slide = pages[slide_index]
    slide_obj = slide.get("objectId")
    page_w, page_h = _page_size_pt(pres)

    requests: List[Dict[str, Any]] = []

    # 0) Remove cards drawn on a previous pass so re-rendering doesn't stack shapes.
    for el in slide.get("pageElements", []):
        oid = el.get("objectId", "")
        if oid.startswith(CARD_SHAPE_PREFIX):
            requests.append({"deleteObject": {"objectId": oid}})

    # 0b) Remove the flat BODY placeholder entirely so neither its old bullets nor the
    #     editor's "Click to add text" prompt shows behind the cards. (Leave the title alone.)
    body_el = _placeholder_element(slide, {"BODY"})
    if body_el and body_el.get("objectId"):
        requests.append({"deleteObject": {"objectId": body_el.get("objectId")}})

    # Layout geometry (all PT). Cards sit in a row below the title.
    n = len(clean_cards)
    margin_x = 26.0
    gap = 20.0
    top = page_h * 0.22
    bottom_margin = 34.0
    card_h = max(page_h - top - bottom_margin, 120.0)
    card_w = (page_w - 2 * margin_x - (n - 1) * gap) / n
    pad = 18.0

    # Content-count-aware spacing: fewer points → more space between them so the card fills.
    max_points = max((len(c.get("points") or []) for c in clean_cards), default=3)
    point_gap = 22.0 if max_points <= 2 else (16.0 if max_points == 3 else 10.0)

    # Dynamic font sizes based on available card height to prevent overflow.
    # Formula: available_body_px ÷ (lines * approx_line_height_ratio).
    # heading_height estimate: 24pt rendered line + 14pt spaceBelow.
    heading_rendered_pt = 38.0
    body_lines_per_card = 2 if n == 3 else 3   # fewer lines per card when 3 cards
    available_body_pt = max(card_h - 2 * pad - heading_rendered_pt, 40.0)
    body_font_pt_raw = available_body_pt / max(body_lines_per_card, 1) / 1.8
    body_font_pt = round(max(9.0, min(14.0, body_font_pt_raw)), 1)
    heading_font_pt = 16.0 if n >= 3 else 18.0

    # Per-card point cap: 2 points for 3-card layouts, 3 for 2-card layouts.
    points_cap = 2 if n >= 3 else 3

    run = uuid.uuid4().hex[:8]

    for i, card in enumerate(clean_cards):
        x = margin_x + i * (card_w + gap)
        bg_id = f"{CARD_SHAPE_PREFIX}{run}_{i}_bg"
        content_id = f"{CARD_SHAPE_PREFIX}{run}_{i}_ct"

        # Card background (rounded rectangle): white fill, subtle border.
        requests.append({"createShape": {
            "objectId": bg_id, "shapeType": "ROUND_RECTANGLE",
            "elementProperties": {
                "pageObjectId": slide_obj,
                "size": {"width": {"magnitude": card_w, "unit": "PT"},
                         "height": {"magnitude": card_h, "unit": "PT"}},
                "transform": {"scaleX": 1, "scaleY": 1,
                              "translateX": x, "translateY": top, "unit": "PT"},
            }}})
        requests.append({"updateShapeProperties": {
            "objectId": bg_id,
            "shapeProperties": {
                "shapeBackgroundFill": {"solidFill": {"color": {"rgbColor": card_fill}}},
                "outline": {"outlineFill": {"solidFill": {"color": {"rgbColor": border}}},
                            "weight": {"magnitude": 1.0, "unit": "PT"}, "dashStyle": "SOLID"},
            },
            "fields": ("shapeBackgroundFill.solidFill.color,outline.outlineFill.solidFill.color,"
                       "outline.weight,outline.dashStyle"),
        }})

        # Normalize points → [(lead, text)]. Cap based on number of cards to prevent overflow.
        norm: List[tuple] = []
        for p in (card.get("points") or []):
            if isinstance(p, str):
                t = p.strip()
                if t:
                    norm.append(("", t))
            elif isinstance(p, dict):
                lead = str(p.get("lead", "") or "").strip()
                text = str(p.get("text", "") or "").strip()
                if lead or text:
                    norm.append((lead, text))
        norm = norm[:points_cap]

        # One content box per card: heading line + bullet lines, vertically CENTERED so the
        # card is filled evenly (no big empty band at the bottom).
        heading_txt = (card.get("heading") or "").strip() or f"Section {i + 1}"
        icon = (card.get("icon") or "").strip()
        heading_full = f"{icon}  {heading_txt}" if icon else heading_txt

        point_lines = [f"{lead}: {text}".rstrip(": ").rstrip() if lead else text
                       for lead, text in norm]
        display_lines = [heading_full] + point_lines
        content_text = "\n".join(display_lines)

        # UTF-16 offsets for every line (Slides indexes text in UTF-16 code units).
        line_ranges = []
        cur = 0
        for dl in display_lines:
            start = cur
            end = cur + _u16len(dl)
            line_ranges.append((start, end))
            cur = end + 1   # +1 for the '\n' separator
        heading_start, heading_end = line_ranges[0]
        bullets_start = line_ranges[1][0] if len(line_ranges) > 1 else heading_end
        bullets_end = line_ranges[-1][1]

        requests.append({"createShape": {
            "objectId": content_id, "shapeType": "TEXT_BOX",
            "elementProperties": {
                "pageObjectId": slide_obj,
                "size": {"width": {"magnitude": card_w - 2 * pad, "unit": "PT"},
                         "height": {"magnitude": card_h - 2 * pad, "unit": "PT"}},
                "transform": {"scaleX": 1, "scaleY": 1,
                              "translateX": x + pad, "translateY": top + pad, "unit": "PT"},
            }}})
        # Vertically centre the whole content block inside the card.
        requests.append({"updateShapeProperties": {
            "objectId": content_id,
            "shapeProperties": {"contentAlignment": "MIDDLE"},
            "fields": "contentAlignment",
        }})
        requests.append({"insertText": {"objectId": content_id, "text": content_text,
                                        "insertionIndex": 0}})

        # Heading: bold, accent, larger; a little breathing room before the points.
        requests.append({"updateTextStyle": {
            "objectId": content_id,
            "textRange": {"type": "FIXED_RANGE", "startIndex": heading_start, "endIndex": heading_end},
            "style": {"bold": True, "fontSize": {"magnitude": heading_font_pt, "unit": "PT"},
                      "fontFamily": font_family,
                      "foregroundColor": {"opaqueColor": {"rgbColor": accent}}},
            "fields": "bold,fontSize,fontFamily,foregroundColor",
        }})
        requests.append({"updateParagraphStyle": {
            "objectId": content_id,
            "textRange": {"type": "FIXED_RANGE", "startIndex": heading_start, "endIndex": heading_end},
            "style": {"spaceBelow": {"magnitude": 14.0, "unit": "PT"}},
            "fields": "spaceBelow",
        }})

        if norm:
            # Points: dynamically-sized body font to prevent overflow; spread with paragraph spacing.
            requests.append({"updateTextStyle": {
                "objectId": content_id,
                "textRange": {"type": "FIXED_RANGE",
                              "startIndex": bullets_start, "endIndex": bullets_end},
                "style": {"fontSize": {"magnitude": body_font_pt, "unit": "PT"}, "fontFamily": font_family,
                          "foregroundColor": {"opaqueColor": {"rgbColor": body_color}}},
                "fields": "fontSize,fontFamily,foregroundColor",
            }})
            requests.append({"createParagraphBullets": {
                "objectId": content_id,
                "textRange": {"type": "FIXED_RANGE",
                              "startIndex": bullets_start, "endIndex": bullets_end},
                "bulletPreset": "BULLET_DISC_CIRCLE_SQUARE",
            }})
            requests.append({"updateParagraphStyle": {
                "objectId": content_id,
                "textRange": {"type": "FIXED_RANGE",
                              "startIndex": bullets_start, "endIndex": bullets_end},
                "style": {"spaceAbove": {"magnitude": point_gap, "unit": "PT"},
                          "lineSpacing": 115},
                "fields": "spaceAbove,lineSpacing",
            }})

            # Bold + accent the lead-in label of each point.
            for k, (lead, _text) in enumerate(norm):
                if not lead:
                    continue
                s = line_ranges[k + 1][0]
                e = min(s + _u16len(lead) + 1, line_ranges[k + 1][1])   # lead + trailing ':'
                requests.append({"updateTextStyle": {
                    "objectId": content_id,
                    "textRange": {"type": "FIXED_RANGE", "startIndex": s, "endIndex": e},
                    "style": {"bold": True,
                              "foregroundColor": {"opaqueColor": {"rgbColor": accent}}},
                    "fields": "bold,foregroundColor",
                }})

    slides.presentations().batchUpdate(
        presentationId=pid, body={"requests": requests}).execute()
    return True


# ── dynamic layout library (agent picks a layout per slide) ────────────────────
# All layout renderers reuse CARD_SHAPE_PREFIX for their shapes so switching a slide's
# layout cleans up the previous one (idempotent). Colours always come from theme_spec.

_WHITE = {"red": 1.0, "green": 1.0, "blue": 1.0}


def _theme_colors(theme_spec: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    from ppt.ppt_theme import DEFAULT_THEME_SPEC, hex_to_rgb, _tint_rgb
    spec = {**DEFAULT_THEME_SPEC, **(theme_spec or {})}
    bg = hex_to_rgb(spec.get("background_hex", "#FFFFFF"))
    return {
        "accent": hex_to_rgb(spec.get("accent_hex", "#1565C0")),
        "body": hex_to_rgb(spec.get("body_color_hex", "#212121")),
        "title": hex_to_rgb(spec.get("title_color_hex", "#1A237E")),
        "font": spec.get("font_family", "Arial"),
        "bg": bg,
        "card_fill": _tint_rgb(bg, factor=0.75),
        "border": hex_to_rgb("#D0D7DE"),
        "white": _WHITE,
    }


def _mk_shape(obj_id, slide_obj, shape_type, x, y, w, h):
    return {"createShape": {
        "objectId": obj_id, "shapeType": shape_type,
        "elementProperties": {
            "pageObjectId": slide_obj,
            "size": {"width": {"magnitude": w, "unit": "PT"}, "height": {"magnitude": h, "unit": "PT"}},
            "transform": {"scaleX": 1, "scaleY": 1, "translateX": x, "translateY": y, "unit": "PT"}}}}


def _fill(obj_id, fill_rgb, border_rgb, weight=1.0):
    return {"updateShapeProperties": {
        "objectId": obj_id,
        "shapeProperties": {
            "shapeBackgroundFill": {"solidFill": {"color": {"rgbColor": fill_rgb}}},
            "outline": {"outlineFill": {"solidFill": {"color": {"rgbColor": border_rgb}}},
                        "weight": {"magnitude": weight, "unit": "PT"}, "dashStyle": "SOLID"}},
        "fields": ("shapeBackgroundFill.solidFill.color,outline.outlineFill.solidFill.color,"
                   "outline.weight,outline.dashStyle")}}


def _valign(obj_id, align="MIDDLE"):
    return {"updateShapeProperties": {"objectId": obj_id,
            "shapeProperties": {"contentAlignment": align}, "fields": "contentAlignment"}}


def _ins(obj_id, text):
    return {"insertText": {"objectId": obj_id, "text": text, "insertionIndex": 0}}


def _txt(obj_id, start=None, end=None, size=None, color=None, bold=None, font=None):
    tr = {"type": "ALL"} if start is None else {"type": "FIXED_RANGE", "startIndex": start, "endIndex": end}
    style, fields = {}, []
    if size is not None:
        style["fontSize"] = {"magnitude": float(size), "unit": "PT"}; fields.append("fontSize")
    if color is not None:
        style["foregroundColor"] = {"opaqueColor": {"rgbColor": color}}; fields.append("foregroundColor")
    if bold is not None:
        style["bold"] = bool(bold); fields.append("bold")
    if font is not None:
        style["fontFamily"] = font; fields.append("fontFamily")
    return {"updateTextStyle": {"objectId": obj_id, "textRange": tr, "style": style,
                                "fields": ",".join(fields)}}


def _para(obj_id, start=None, end=None, align=None, space_above=None, space_below=None,
          line_spacing=None):
    tr = {"type": "ALL"} if start is None else {"type": "FIXED_RANGE", "startIndex": start, "endIndex": end}
    style, fields = {}, []
    if align is not None:
        style["alignment"] = align; fields.append("alignment")
    if space_above is not None:
        style["spaceAbove"] = {"magnitude": space_above, "unit": "PT"}; fields.append("spaceAbove")
    if space_below is not None:
        style["spaceBelow"] = {"magnitude": space_below, "unit": "PT"}; fields.append("spaceBelow")
    if line_spacing is not None:
        style["lineSpacing"] = line_spacing; fields.append("lineSpacing")
    return {"updateParagraphStyle": {"objectId": obj_id, "textRange": tr, "style": style,
                                     "fields": ",".join(fields)}}


def _bullets_req(obj_id, start=None, end=None):
    tr = {"type": "ALL"} if start is None else {"type": "FIXED_RANGE", "startIndex": start, "endIndex": end}
    return {"createParagraphBullets": {"objectId": obj_id, "textRange": tr,
                                       "bulletPreset": "BULLET_DISC_CIRCLE_SQUARE"}}


def _layout_context(deck_ref: str, slide_index: int):
    """Shared prelude for every layout renderer: fetch slide, page size, and the cleanup
    requests (delete previous layout shapes + the flat BODY placeholder)."""
    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    pres = slides.presentations().get(presentationId=pid).execute()
    pages = pres.get("slides", [])
    if slide_index < 0 or slide_index >= len(pages):
        raise RuntimeError(f"Slide {slide_index} out of range for layout")
    slide = pages[slide_index]
    slide_obj = slide.get("objectId")
    page_w, page_h = _page_size_pt(pres)
    reqs: List[Dict[str, Any]] = []
    for el in slide.get("pageElements", []):
        oid = el.get("objectId", "")
        if oid.startswith(CARD_SHAPE_PREFIX):
            reqs.append({"deleteObject": {"objectId": oid}})
    body_el = _placeholder_element(slide, {"BODY"})
    if body_el and body_el.get("objectId"):
        reqs.append({"deleteObject": {"objectId": body_el.get("objectId")}})
    return slides, pid, slide_obj, page_w, page_h, reqs


def _norm_points(raw, cap):
    out = []
    for p in (raw or []):
        if isinstance(p, str):
            if p.strip():
                out.append(("", p.strip()))
        elif isinstance(p, dict):
            lead = str(p.get("lead", "") or "").strip()
            text = str(p.get("text", "") or "").strip()
            if lead or text:
                out.append((lead, text))
    return out[:cap]


def _append_card_column(reqs, slide_obj, x, top, card_w, card_h, card, colors, uid,
                        heading_pt=17.0, body_pt=12.5, points_cap=3):
    """Draw one card column (rounded rect + centred heading + bulleted points with bold
    accent lead-ins). Used by the comparison layout; the cards layout has its own renderer."""
    bg = f"{CARD_SHAPE_PREFIX}{uid}_bg"
    ct = f"{CARD_SHAPE_PREFIX}{uid}_ct"
    pad = 16.0
    reqs.append(_mk_shape(bg, slide_obj, "ROUND_RECTANGLE", x, top, card_w, card_h))
    reqs.append(_fill(bg, colors["card_fill"], colors["border"]))

    norm = _norm_points(card.get("points"), points_cap)
    heading = (card.get("heading") or "").strip() or "Item"
    icon = (card.get("icon") or "").strip()
    heading_full = f"{icon}  {heading}" if icon else heading
    point_lines = [f"{lead}: {text}".rstrip(": ").rstrip() if lead else text for lead, text in norm]
    display = [heading_full] + point_lines
    content = "\n".join(display)

    ranges, cur = [], 0
    for dl in display:
        ranges.append((cur, cur + _u16len(dl)))
        cur += _u16len(dl) + 1

    reqs.append(_mk_shape(ct, slide_obj, "TEXT_BOX", x + pad, top + pad, card_w - 2 * pad, card_h - 2 * pad))
    reqs.append(_valign(ct, "MIDDLE"))
    reqs.append(_ins(ct, content))
    hs, he = ranges[0]
    reqs.append(_txt(ct, hs, he, size=heading_pt, bold=True, color=colors["accent"], font=colors["font"]))
    reqs.append(_para(ct, hs, he, space_below=12.0))
    if norm:
        bs, be = ranges[1][0], ranges[-1][1]
        reqs.append(_txt(ct, bs, be, size=body_pt, color=colors["body"], font=colors["font"]))
        reqs.append(_bullets_req(ct, bs, be))
        reqs.append(_para(ct, bs, be, space_above=12.0, line_spacing=115))
        for k, (lead, _t) in enumerate(norm):
            if not lead:
                continue
            s = ranges[k + 1][0]
            e = min(s + _u16len(lead) + 1, ranges[k + 1][1])
            reqs.append(_txt(ct, s, e, bold=True, color=colors["accent"], font=colors["font"]))


def _render_steps(deck_ref, slide_index, steps, theme_spec=None):
    """Numbered vertical steps — for processes / sequences."""
    import uuid
    steps = [s for s in (steps or []) if isinstance(s, dict) and (s.get("title") or s.get("text"))][:5]
    if len(steps) < 2:
        return False
    c = _theme_colors(theme_spec)
    slides, pid, slide_obj, page_w, page_h, reqs = _layout_context(deck_ref, slide_index)
    x0 = 48.0
    area_top, area_bottom = page_h * 0.24, page_h - 28.0
    rowh = (area_bottom - area_top) / len(steps)
    diam = min(rowh * 0.6, 44.0)
    run = uuid.uuid4().hex[:8]
    for i, st in enumerate(steps):
        y = area_top + i * rowh
        circ = f"{CARD_SHAPE_PREFIX}{run}_{i}_c"
        tb = f"{CARD_SHAPE_PREFIX}{run}_{i}_t"
        reqs.append(_mk_shape(circ, slide_obj, "ELLIPSE", x0, y + (rowh - diam) / 2, diam, diam))
        reqs.append(_fill(circ, c["accent"], c["accent"]))
        reqs.append(_valign(circ, "MIDDLE"))
        reqs.append(_ins(circ, str(i + 1)))
        reqs.append(_txt(circ, size=16, bold=True, color=c["white"], font=c["font"]))
        reqs.append(_para(circ, align="CENTER"))
        title = (st.get("title") or "").strip() or f"Step {i + 1}"
        text = (st.get("text") or "").strip()
        full = f"{title}\n{text}" if text else title
        tb_x = x0 + diam + 18
        reqs.append(_mk_shape(tb, slide_obj, "TEXT_BOX", tb_x, y, page_w - tb_x - 44, rowh))
        reqs.append(_valign(tb, "MIDDLE"))
        reqs.append(_ins(tb, full))
        te = _u16len(title)
        reqs.append(_txt(tb, 0, te, size=15, bold=True, color=c["accent"], font=c["font"]))
        if text:
            reqs.append(_txt(tb, te + 1, te + 1 + _u16len(text), size=12, color=c["body"], font=c["font"]))
    slides.presentations().batchUpdate(presentationId=pid, body={"requests": reqs}).execute()
    return True


def _render_timeline(deck_ref, slide_index, events, theme_spec=None):
    """Vertical timeline (accent rail + dots) — for chronologies / histories."""
    import uuid
    events = [e for e in (events or []) if isinstance(e, dict)
              and (e.get("title") or e.get("text") or e.get("when"))][:5]
    if len(events) < 2:
        return False
    c = _theme_colors(theme_spec)
    slides, pid, slide_obj, page_w, page_h, reqs = _layout_context(deck_ref, slide_index)
    rail_x = 74.0
    area_top, area_bottom = page_h * 0.24, page_h - 28.0
    area_h = area_bottom - area_top
    rowh = area_h / len(events)
    run = uuid.uuid4().hex[:8]
    rail = f"{CARD_SHAPE_PREFIX}{run}_rail"
    reqs.append(_mk_shape(rail, slide_obj, "RECTANGLE", rail_x, area_top, 3.0, area_h))
    reqs.append(_fill(rail, c["accent"], c["accent"]))
    for i, ev in enumerate(events):
        y = area_top + i * rowh
        dot_d = 13.0
        dot = f"{CARD_SHAPE_PREFIX}{run}_{i}_d"
        tb = f"{CARD_SHAPE_PREFIX}{run}_{i}_t"
        reqs.append(_mk_shape(dot, slide_obj, "ELLIPSE",
                              rail_x + 1.5 - dot_d / 2, y + rowh * 0.30, dot_d, dot_d))
        reqs.append(_fill(dot, c["accent"], c["white"], weight=2.0))
        when = (ev.get("when") or "").strip()
        title = (ev.get("title") or "").strip()
        text = (ev.get("text") or "").strip()
        head = " · ".join([p for p in [when, title] if p]) or f"Event {i + 1}"
        full = f"{head}\n{text}" if text else head
        tb_x = rail_x + 26
        reqs.append(_mk_shape(tb, slide_obj, "TEXT_BOX", tb_x, y, page_w - tb_x - 40, rowh))
        reqs.append(_valign(tb, "MIDDLE"))
        reqs.append(_ins(tb, full))
        he = _u16len(head)
        reqs.append(_txt(tb, 0, he, size=14, bold=True, color=c["accent"], font=c["font"]))
        if text:
            reqs.append(_txt(tb, he + 1, he + 1 + _u16len(text), size=12, color=c["body"], font=c["font"]))
    slides.presentations().batchUpdate(presentationId=pid, body={"requests": reqs}).execute()
    return True


def _render_comparison(deck_ref, slide_index, layout_spec, theme_spec=None):
    """Two columns with a centre divider — for contrasts (A vs B)."""
    import uuid
    cols = [col for col in (layout_spec.get("left"), layout_spec.get("right"))
            if isinstance(col, dict) and (col.get("heading") or col.get("points"))]
    if len(cols) < 2:
        cards = layout_spec.get("cards")
        return render_card_layout(deck_ref, slide_index, cards, theme_spec) if cards else False
    c = _theme_colors(theme_spec)
    slides, pid, slide_obj, page_w, page_h, reqs = _layout_context(deck_ref, slide_index)
    margin_x, gap = 30.0, 46.0
    top, bottom = page_h * 0.22, page_h - 32.0
    card_h = bottom - top
    card_w = (page_w - 2 * margin_x - gap) / 2
    run = uuid.uuid4().hex[:8]
    div = f"{CARD_SHAPE_PREFIX}{run}_div"
    reqs.append(_mk_shape(div, slide_obj, "RECTANGLE", page_w / 2 - 1.0, top + 12, 2.0, card_h - 24))
    reqs.append(_fill(div, c["border"], c["border"]))
    for i, col in enumerate(cols[:2]):
        x = margin_x + i * (card_w + gap)
        _append_card_column(reqs, slide_obj, x, top, card_w, card_h, col, c, f"{run}_{i}")
    slides.presentations().batchUpdate(presentationId=pid, body={"requests": reqs}).execute()
    return True


def _render_accent_list(deck_ref, slide_index, items, theme_spec=None):
    """Single-column accent list (left accent bar + bold leads) — for many short points."""
    import uuid
    norm = []
    for it in (items or []):
        if isinstance(it, str) and it.strip():
            norm.append(("", it.strip(), ""))
        elif isinstance(it, dict):
            lead = str(it.get("lead", "") or "").strip()
            text = str(it.get("text", "") or "").strip()
            icon = str(it.get("icon", "") or "").strip()
            if lead or text:
                norm.append((lead, text, icon))
    norm = norm[:7]
    if len(norm) < 2:
        return False
    c = _theme_colors(theme_spec)
    slides, pid, slide_obj, page_w, page_h, reqs = _layout_context(deck_ref, slide_index)
    x0 = 54.0
    area_top, area_bottom = page_h * 0.22, page_h - 26.0
    area_h = area_bottom - area_top
    run = uuid.uuid4().hex[:8]
    bar = f"{CARD_SHAPE_PREFIX}{run}_bar"
    reqs.append(_mk_shape(bar, slide_obj, "RECTANGLE", x0 - 16, area_top, 5.0, area_h))
    reqs.append(_fill(bar, c["accent"], c["accent"]))
    tb = f"{CARD_SHAPE_PREFIX}{run}_tb"
    lines = []
    for lead, text, icon in norm:
        prefix = f"{icon} " if icon else ""
        lines.append(f"{prefix}{lead}: {text}".rstrip(": ").rstrip() if lead else f"{prefix}{text}")
    content = "\n".join(lines)
    reqs.append(_mk_shape(tb, slide_obj, "TEXT_BOX", x0, area_top, page_w - x0 - 50, area_h))
    reqs.append(_valign(tb, "MIDDLE"))
    reqs.append(_ins(tb, content))
    body_pt = round(max(11.0, min(15.0, (area_h / len(norm)) / 2.0)), 1)
    reqs.append(_txt(tb, size=body_pt, color=c["body"], font=c["font"]))
    reqs.append(_bullets_req(tb))
    reqs.append(_para(tb, space_above=8.0, space_below=8.0, line_spacing=115))
    cur = 0
    for lead, text, icon in norm:
        prefix = f"{icon} " if icon else ""
        line = f"{prefix}{lead}: {text}".rstrip(": ").rstrip() if lead else f"{prefix}{text}"
        if lead:
            s = cur + _u16len(prefix)
            e = s + _u16len(lead) + 1
            reqs.append(_txt(tb, s, e, bold=True, color=c["accent"], font=c["font"]))
        cur += _u16len(line) + 1
    slides.presentations().batchUpdate(presentationId=pid, body={"requests": reqs}).execute()
    return True


def render_icon_grid(deck_ref, slide_index, items, theme_spec=None):
    """
    House-style ICON-CARD GRID (the reference "Mastering Slide Formation" look):
    a clean white slide, a top-left title with a small indigo tick, and a grid of light
    cards — each an icon-in-rounded-square, a bold navy label, and slate body text.

    items: [{"icon": emoji, "label"/"lead"/"heading": str, "text": str} | str, ...]
    """
    import uuid, math
    from ppt.ppt_theme import DEFAULT_THEME_SPEC, hex_to_rgb

    spec = {**DEFAULT_THEME_SPEC, **(theme_spec or {})}
    navy = hex_to_rgb(spec.get("title_color_hex", "#0F172A"))
    slate = hex_to_rgb(spec.get("body_color_hex", "#334155"))
    indigo = hex_to_rgb(spec.get("accent_hex", "#4F46E5"))
    card_fill = hex_to_rgb(spec.get("card_fill_hex", "#F8FAFC"))
    card_border = hex_to_rgb(spec.get("card_border_hex", "#E2E8F0"))
    icon_fill = hex_to_rgb(spec.get("icon_fill_hex", "#E0E7FF"))
    head_font = spec.get("heading_font") or spec.get("font_family", "Arial")
    body_font = spec.get("body_font") or spec.get("font_family", "Arial")

    norm = []
    for it in (items or []):
        if isinstance(it, str) and it.strip():
            norm.append(("", it.strip(), ""))
        elif isinstance(it, dict):
            label = str(it.get("label") or it.get("lead") or it.get("heading") or "").strip()
            text = str(it.get("text", "") or "").strip()
            icon = str(it.get("icon", "") or "").strip()
            if label or text:
                norm.append((label, text, icon))
    norm = norm[:8]
    if not norm:
        return False

    slides, pid, slide_obj, page_w, page_h, reqs = _layout_context(deck_ref, slide_index)
    run = uuid.uuid4().hex[:8]
    mx = 40.0

    # ── Title: move top-left, restyle navy/bold, add the indigo tick ──
    try:
        snap = get_slide(deck_ref, slide_index)
        title_oid = snap.get("title_object_id")
        title_txt = (snap.get("title") or "").strip()
        if title_oid:
            reqs.append({"updatePageElementTransform": {
                "objectId": title_oid, "applyMode": "ABSOLUTE",
                "transform": {"scaleX": 1, "scaleY": 1, "translateX": mx + 14,
                              "translateY": 28, "unit": "PT"}}})
            if title_txt:
                reqs.append(_txt(title_oid, size=26, bold=True, color=navy, font=head_font))
                reqs.append(_para(title_oid, align="START"))
            tick = f"{CARD_SHAPE_PREFIX}{run}_tick"
            reqs.append(_mk_shape(tick, slide_obj, "RECTANGLE", mx, 33, 5, 26))
            reqs.append(_fill(tick, indigo, indigo))
    except Exception as e:
        print(f"  [mcp_slides_client] icon_grid title styling skipped: {e}")

    # ── Grid geometry ──
    n = len(norm)
    cols = n if n <= 3 else (2 if n == 4 else (3 if n <= 6 else 4))
    rows = math.ceil(n / cols)
    top = page_h * 0.26
    bottom = page_h - 26.0
    gap = 16.0
    area_w = page_w - 2 * mx
    area_h = bottom - top
    card_w = (area_w - (cols - 1) * gap) / cols
    card_h = (area_h - (rows - 1) * gap) / rows
    iconsz = 30.0 if rows == 1 else 26.0
    pad = 13.0
    label_pt = 13.0 if rows == 1 else 11.5
    body_pt = 10.5 if rows == 1 else 9.5

    for i, (label, text, icon) in enumerate(norm):
        r, c = divmod(i, cols)
        in_row = cols if r < rows - 1 else (n - cols * (rows - 1))
        row_w = in_row * card_w + (in_row - 1) * gap
        x = mx + (area_w - row_w) / 2 + c * (card_w + gap)
        y = top + r * (card_h + gap)
        bg = f"{CARD_SHAPE_PREFIX}{run}_{i}_bg"
        ic = f"{CARD_SHAPE_PREFIX}{run}_{i}_ic"
        tb = f"{CARD_SHAPE_PREFIX}{run}_{i}_tb"

        reqs.append(_mk_shape(bg, slide_obj, "ROUND_RECTANGLE", x, y, card_w, card_h))
        reqs.append(_fill(bg, card_fill, card_border))

        if icon:
            # Rounded square background (no text — autoshapes don't render emoji reliably)...
            reqs.append(_mk_shape(ic, slide_obj, "ROUND_RECTANGLE", x + pad, y + pad, iconsz, iconsz))
            reqs.append(_fill(ic, icon_fill, icon_fill))
            # ...with a transparent TEXT_BOX overlaid to hold the emoji (renders reliably).
            iem = f"{CARD_SHAPE_PREFIX}{run}_{i}_em"
            # The emoji box must be a good bit LARGER than the visual square — a small text
            # box clips the emoji's tall line-height and it renders blank. Center a 46pt box
            # on the square's centre so the glyph sits inside the square.
            eb = 46.0
            cx = x + pad + iconsz / 2
            cy = y + pad + iconsz / 2
            reqs.append(_mk_shape(iem, slide_obj, "TEXT_BOX", cx - eb / 2, cy - eb / 2, eb, eb))
            reqs.append(_valign(iem, "MIDDLE"))
            reqs.append(_ins(iem, icon))
            # NB: do NOT set fontFamily on a lone emoji — forcing a text font (e.g. Inter)
            # drops the glyph. Size only; Google supplies the emoji font.
            reqs.append(_txt(iem, size=round(iconsz * 0.55, 1)))
            reqs.append(_para(iem, align="CENTER"))
            text_y = y + pad + iconsz + 8
        else:
            text_y = y + pad

        full = (label + "\n" + text) if (label and text) else (label or text)
        tb_w = card_w - 2 * pad
        tb_h = max(card_h - (text_y - y) - pad, 24.0)
        reqs.append(_mk_shape(tb, slide_obj, "TEXT_BOX", x + pad, text_y, tb_w, tb_h))
        reqs.append(_ins(tb, full))
        if label and text:
            le = _u16len(label)
            reqs.append(_txt(tb, 0, le, size=label_pt, bold=True, color=navy, font=head_font))
            reqs.append(_para(tb, 0, le, space_below=4.0))
            reqs.append(_txt(tb, le + 1, le + 1 + _u16len(text), size=body_pt, color=slate, font=body_font))
        elif label:
            reqs.append(_txt(tb, size=label_pt, bold=True, color=navy, font=head_font))
        else:
            reqs.append(_txt(tb, size=body_pt, color=slate, font=body_font))

    slides.presentations().batchUpdate(presentationId=pid, body={"requests": reqs}).execute()
    return True


def render_layout(deck_ref: str, slide_index: int, layout_spec: Dict[str, Any],
                  theme_spec: Optional[Dict[str, Any]] = None) -> bool:
    """
    Dispatch to the right layout renderer based on layout_spec["layout"].

    Supported layouts (the agent picks one per slide):
      - "cards"       : 2-3 grouped cards            (grouped sub-topics)
      - "steps"       : numbered vertical steps       (processes / sequences)
      - "timeline"    : vertical accent-rail timeline (chronologies / history)
      - "comparison"  : two columns + divider         (A vs B contrasts)
      - "accent_list" : single accent-bar list        (many short points)

    Falls back to cards when the chosen layout is empty/unknown but cards are present.
    """
    if not isinstance(layout_spec, dict):
        return False
    layout = (layout_spec.get("layout") or "").strip().lower()
    try:
        if layout == "icon_grid":
            return render_icon_grid(deck_ref, slide_index, layout_spec.get("items"), theme_spec)
        if layout == "steps":
            return _render_steps(deck_ref, slide_index, layout_spec.get("steps"), theme_spec)
        if layout == "timeline":
            return _render_timeline(deck_ref, slide_index, layout_spec.get("events"), theme_spec)
        if layout == "comparison":
            return _render_comparison(deck_ref, slide_index, layout_spec, theme_spec)
        if layout == "accent_list":
            return _render_accent_list(deck_ref, slide_index, layout_spec.get("items"), theme_spec)
        if layout == "cards":
            return render_card_layout(deck_ref, slide_index, layout_spec.get("cards") or [], theme_spec)
    except Exception as e:
        print(f"  [mcp_slides_client] render_layout '{layout}' failed: {e}")
    # Fallback: if a cards payload exists, use it.
    if layout_spec.get("cards"):
        return render_card_layout(deck_ref, slide_index, layout_spec["cards"], theme_spec)
    return False


def set_speaker_notes(deck_ref: str, slide_index: int, notes_text: str) -> bool:
    """
    Write the presenter's speaking script to a slide's speaker-notes field.

    Targets the notes page BODY placeholder, clearing any existing note text first.
    Returns True if the notes shape was found and updated.
    """
    slides, _ = _services()
    pid = presentation_id_of(deck_ref)
    pres = slides.presentations().get(presentationId=pid).execute()
    pages = pres.get("slides", [])
    if slide_index < 0 or slide_index >= len(pages):
        return False

    notes_page = pages[slide_index].get("slideProperties", {}).get("notesPage", {})
    notes_el = _placeholder_element(notes_page, {"BODY"})
    if not notes_el or not notes_el.get("objectId"):
        return False
    obj_id = notes_el.get("objectId")

    requests: List[Dict[str, Any]] = []
    has_text = any(
        te.get("textRun", {}).get("content", "").strip()
        for te in notes_el.get("shape", {}).get("text", {}).get("textElements", [])
    )
    if has_text:
        requests.append({"deleteText": {"objectId": obj_id, "textRange": {"type": "ALL"}}})

    text = str(notes_text or "").strip()
    if text:
        requests.append({"insertText": {"objectId": obj_id, "text": text, "insertionIndex": 0}})

    if requests:
        slides.presentations().batchUpdate(
            presentationId=pid, body={"requests": requests}).execute()
    return True


def apply_ops_batch(deck_ref: str, slide_index: int,
                    ops: List[Dict[str, Any]],
                    theme_spec: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Apply a list of agent-planned ops to one slide atomically.

    Each op dict must have an "op" key.  Supported ops:
      - font_title_size : {"op": "font_title_size", "value": <pt>}
      - set_bullets     : {"op": "set_bullets",      "value": [str, ...]}
      - add_bullets     : {"op": "add_bullets",       "value": [str, ...]}
      - set_cards       : {"op": "set_cards",         "value": [card, ...]}  (designed layout)

    theme_spec colours the card layout. Returns the list of ops that were successfully
    applied. Errors in individual ops are logged but do not abort the batch.
    """
    applied = []
    for op_dict in ops or []:
        op = (op_dict or {}).get("op")
        try:
            if op == "font_title_size":
                apply_font_title_size(
                    deck_ref, slide_index,
                    op_dict["value"], op_dict.get("text"))
                applied.append(op_dict)
            elif op == "set_layout":
                # Op-level theme_spec (set by ppt_nodes) takes priority over the batch-level one.
                op_theme = op_dict.get("theme_spec") or theme_spec
                if render_layout(deck_ref, slide_index, op_dict["value"], op_theme):
                    applied.append(op_dict)
            elif op == "set_cards":
                # Op-level theme_spec (set by ppt_nodes) takes priority over the batch-level one.
                op_theme = op_dict.get("theme_spec") or theme_spec
                if render_card_layout(deck_ref, slide_index, op_dict["value"], op_theme):
                    applied.append(op_dict)
            elif op in ("set_bullets", "add_bullets"):
                op_theme = op_dict.get("theme_spec") or theme_spec
                set_body_bullets(deck_ref, slide_index, op_dict["value"], theme_spec=op_theme)
                applied.append(op_dict)
            elif op == "set_speaker_notes":
                if set_speaker_notes(deck_ref, slide_index, op_dict["value"]):
                    applied.append(op_dict)
            elif op == "highlight_terms":
                if apply_highlight_terms(deck_ref, slide_index, op_dict["value"]):
                    applied.append(op_dict)
            elif op == "fix_spelling":
                if apply_spelling_fixes(deck_ref, slide_index, op_dict["value"]):
                    applied.append(op_dict)
            else:
                print(f"  [mcp_slides_client] apply_ops_batch: unknown op '{op}', skipping")
        except Exception as e:
            print(f"  [mcp_slides_client] apply_ops_batch: op '{op}' failed: {e}")
    return applied


def _theme_requests_for_slide(slide: Dict[str, Any], spec: Dict[str, Any]) -> List[Dict[str, Any]]:
    """batchUpdate requests to apply a theme_spec (background + fonts + colors) to one slide."""
    from ppt.ppt_theme import hex_to_rgb

    reqs: List[Dict[str, Any]] = []
    slide_id = slide.get("objectId")

    # Slide background fill.
    if slide_id and spec.get("background_hex"):
        reqs.append({
            "updatePageProperties": {
                "objectId": slide_id,
                "pageProperties": {
                    "pageBackgroundFill": {
                        "solidFill": {"color": {"rgbColor": hex_to_rgb(spec["background_hex"])}}
                    }
                },
                "fields": "pageBackgroundFill.solidFill.color",
            }
        })

    # Title / body text: font family, size, color.
    for el in slide.get("pageElements", []):
        shape = el.get("shape", {})
        ph_type = shape.get("placeholder", {}).get("type", "")
        obj_id = el.get("objectId")
        if not obj_id:
            continue
        # updateTextStyle errors on a box with no text — skip empty placeholders.
        has_text = any(
            te.get("textRun", {}).get("content", "").strip()
            for te in shape.get("text", {}).get("textElements", [])
        )
        if not has_text:
            continue
        if ph_type in ("TITLE", "CENTERED_TITLE"):
            size, color_hex = spec.get("title_size_pt"), spec.get("title_color_hex")
        elif ph_type in ("BODY", "SUBTITLE"):
            size, color_hex = spec.get("body_size_pt"), spec.get("body_color_hex")
        else:
            continue

        style: Dict[str, Any] = {}
        fields = []
        if size:
            style["fontSize"] = {"magnitude": float(size), "unit": "PT"}
            fields.append("fontSize")
        if spec.get("font_family"):
            style["fontFamily"] = spec["font_family"]
            fields.append("fontFamily")
        if color_hex:
            style["foregroundColor"] = {"opaqueColor": {"rgbColor": hex_to_rgb(color_hex)}}
            fields.append("foregroundColor")
        if style:
            reqs.append({
                "updateTextStyle": {
                    "objectId": obj_id,
                    "style": style,
                    "textRange": {"type": "ALL"},
                    "fields": ",".join(fields),
                }
            })
    return reqs


def apply_theme_to_deck(deck_ref: str, theme_spec: Dict[str, Any]) -> int:
    """
    Enforce the agent-chosen design across EVERY slide in the deck in one batchUpdate:
    slide background fill + title/body font family, size, and color.

    Returns the number of slides processed. Falls back gracefully when the service is
    unavailable or the deck is a stub.
    """
    if not is_available() or deck_ref.startswith("gslides:STUB-"):
        print(f"  [mcp_slides_client] apply_theme_to_deck: stub deck — skipping live call")
        return 0

    from ppt.ppt_theme import DEFAULT_THEME_SPEC
    spec = {**DEFAULT_THEME_SPEC, **(theme_spec or {})}

    slides_svc, _ = _services()
    pid = presentation_id_of(deck_ref)
    pres = slides_svc.presentations().get(presentationId=pid).execute()
    pages = pres.get("slides", [])

    requests: List[Dict[str, Any]] = []
    for slide in pages:
        requests.extend(_theme_requests_for_slide(slide, spec))

    if requests:
        slides_svc.presentations().batchUpdate(
            presentationId=pid, body={"requests": requests}).execute()

    return len(pages)


def export_pptx(deck_ref: str, output_path: str) -> str:
    """
    Export a Google Presentation deck to a local .pptx file via the Google Drive API.
    """
    if not is_available():
        raise RuntimeError("Google Slides/Drive client is not available")
    if deck_ref.startswith("gslides:STUB-"):
        raise RuntimeError("Cannot export a STUB deck")
    
    _, drive_svc = _services()
    pid = presentation_id_of(deck_ref)
    request = drive_svc.files().export_media(
        fileId=pid,
        mimeType="application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )
    content = request.execute()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(content)
    return output_path


def export_pdf(deck_ref: str, output_path: str) -> str:
    """
    Export a Google Presentation deck to a local .pdf file via the Google Drive API.
    """
    if not is_available():
        raise RuntimeError("Google Slides/Drive client is not available")
    if deck_ref.startswith("gslides:STUB-"):
        raise RuntimeError("Cannot export a STUB deck")
    
    _, drive_svc = _services()
    pid = presentation_id_of(deck_ref)
    request = drive_svc.files().export_media(
        fileId=pid,
        mimeType="application/pdf"
    )
    content = request.execute()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(content)
    return output_path


# Dispatch table: proposed_change["op"] → applier. Extend as ops are added.
def apply_op(deck_ref: str, slide_index: int, proposed_change: Dict[str, Any],
             theme_spec: Optional[Dict[str, Any]] = None) -> bool:
    op = (proposed_change or {}).get("op")
    # Op may carry its own theme_spec (injected by ppt_nodes from session state).
    effective_theme = proposed_change.get("theme_spec") or theme_spec
    if op == "font_title_size":
        return apply_font_title_size(
            deck_ref, slide_index, proposed_change["value"], proposed_change.get("text"))
    if op == "set_layout":
        return render_layout(deck_ref, slide_index, proposed_change["value"], effective_theme)
    if op == "set_cards":
        return render_card_layout(deck_ref, slide_index, proposed_change["value"], effective_theme)
    if op in ("set_bullets", "add_bullets"):
        return set_body_bullets(deck_ref, slide_index, proposed_change["value"],
                                theme_spec=effective_theme)
    if op == "set_speaker_notes":
        return set_speaker_notes(deck_ref, slide_index, proposed_change["value"])
    if op == "highlight_terms":
        return apply_highlight_terms(deck_ref, slide_index, proposed_change["value"])
    if op == "fix_spelling":
        return apply_spelling_fixes(deck_ref, slide_index, proposed_change["value"])
    raise RuntimeError(f"No Google Slides applier for op '{op}' yet")

