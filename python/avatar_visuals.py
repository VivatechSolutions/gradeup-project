"""
Avatar Visuals — clean, watermark-free teaching pictures for the avatar classroom.

The avatar teaches a section as a list of spoken segments. This module finds a
real picture for the ideas that are worth SEEING, proves the picture is clean,
re-hosts it on S3, and writes the line the avatar speaks while showing it.

Why the sourcing is tiered rather than a plain image search
-----------------------------------------------------------
A raw image search for a school topic returns mostly coaching-platform
screenshots (Byju's, Vedantu, Toppr, Doubtnut ...) and stock-photo previews with
a diagonal watermark stamped across them. Neither is usable in a lesson. So:

  Tier 1  Wikimedia Commons  - freely licensed, watermark-free by policy, and
                               rich in exactly the labelled diagrams a textbook
                               section needs. This is the preferred source.
  Tier 2  SearXNG images, restricted to a TRUSTED host allowlist (.gov, .edu,
                               NASA, NIH, OpenStax, Unsplash ...).
  Tier 3  SearXNG images, open web, blocklist-only - off by default, enabled
                               with AVATAR_VISUALS_OPEN_WEB=true.

Every candidate then passes three independent gates before it can be used:

  1. HOST      - coaching platforms and stock-photo hosts are rejected outright,
                 as are URLs/titles carrying watermark tells ("watermark",
                 "royalty-free", "preview", "-wm.", "/comp/").
  2. PIXELS    - decoded with Pillow, rejected if too small, absurdly wide/tall,
                 or near-blank. Survivors are re-encoded to clean JPEG, which
                 also strips EXIF and any embedded metadata.
  3. VISION    - a vision model actually LOOKS at the image and must confirm it
                 is on-topic, is a real photo/diagram, and carries no watermark,
                 stamped logo, or site branding. This is the gate that catches
                 watermarks the URL never advertised.

Only an image that clears all three is uploaded to S3. The same vision call that
clears it also writes the avatar's spoken explanation, so the picture never
appears without the teacher saying what the student is looking at.

Public API
----------
  is_enabled()                     feature flag (AVATAR_VISUALS_ENABLED)
  build_visual_query(...)          teaching text -> image search query
  find_visual(...)                 query -> S3-hosted, vision-cleared visual
  explain_visual(...)              answer a student's question about a picture
  review_student_observation(...)  respond to what the student says they see

Config (.env)
-------------
  AVATAR_VISUALS_ENABLED     default "true"
  AVATAR_VISUALS_OPEN_WEB    default "false"  (allow tier 3)
  AVATAR_VISUALS_MAX_TRIES   default "4"      (vision calls per image slot)
  AVATAR_VISUALS_MIN_WIDTH   default "320"
  AVATAR_VISUALS_MIN_HEIGHT  default "240"
  AVATAR_VISION_MODEL        default "gemini-3.6-flash" - Google direct on
                             GEMINI_API_KEY (Gemini is never routed through
                             OpenRouter); benchmarked as gemini-2.5-flash
  AWS_* / S3_BUCKET_NAME
"""

import hashlib
import html
import io
import json
import os
import re
from typing import Tuple, Any, Dict, List, Optional
from urllib.parse import urlparse

import requests

import avatar_llm
from dotenv import load_dotenv

from logger import get_logger

logger = get_logger(__name__)

for _env in (".env.local", ".env"):
    if os.path.exists(_env):
        load_dotenv(dotenv_path=_env)
        break

# --- Configuration -----------------------------------------------------------

# The vision gate model. NOT OpenAI: the account's credits are exhausted
# (credit_balance_exhausted on every call), so the gate that gpt-4o-mini used
# to run was failing closed and every section was shipping without a picture.
#
# Gemini 2.5 Flash is the measured pick, not a guess. On 14 hand-verified cases
# (bench/avatar_model_bench.py --suite vision) it was the ONLY candidate to
# catch both failure modes that matter:
#
#   model                gate  acc   false-accepts  watermarks  foreign  sec
#   gemini-2.5-flash     0.79  0.93       1            4/4        1/1    3.8
#   llama-4-scout        0.57  0.86       2            4/4        0/1    4.9
#   qwen3-vl-235b        0.57  0.86       2            3/4        1/1   10.8
#
# Qwen ACCEPTED a Shutterstock-stamped diagram and is 3x slower; Llama passed a
# Romanian-labelled one. Gemini costs ~4x Llama per call ($0.0011 vs $0.0003),
# which is the right trade for the gate specifically: a false accept puts a
# watermarked picture in front of a student, and a missed picture only costs a
# picture.
VISION_MODEL = os.getenv("AVATAR_VISION_MODEL", "gemini-3.6-flash")
# Same family fallback if Gemini's providers are all down. Llama scored equally
# on the clean/off-topic/watermark classes and is the cheapest of the three.
VISION_FALLBACK_MODEL = os.getenv("AVATAR_VISION_FALLBACK_MODEL",
                                  "meta-llama/llama-4-scout")
# The vision gate rejects hard by design, so a small budget gets used up on
# near-misses before a good candidate is ever reached.
MAX_TRIES = int(os.getenv("AVATAR_VISUALS_MAX_TRIES", "6"))
MIN_WIDTH = int(os.getenv("AVATAR_VISUALS_MIN_WIDTH", "320"))
MIN_HEIGHT = int(os.getenv("AVATAR_VISUALS_MIN_HEIGHT", "240"))
REQUEST_TIMEOUT = int(os.getenv("AVATAR_VISUALS_TIMEOUT", "25"))
VISION_TIMEOUT = int(os.getenv("AVATAR_VISION_TIMEOUT", "60"))
# How closely the vision model looks. "low" downsamples to 512px for a flat ~85
# tokens; "high" tiles the image and reads fine print at several times the cost.
# "low" is the default because it measurably works here - it caught watermarks
# on Unsplash and blogspot images and spotted non-English diagram labels - but
# raise it to "high" or "auto" if watermark-heavy sources start slipping past.
VISION_DETAIL = os.getenv("AVATAR_VISION_DETAIL", "low").strip().lower()

# Re-encode target - big enough for a classroom screen, small enough to ship.
MAX_EDGE = 1280
JPEG_QUALITY = 85
MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024

COMMONS_API = "https://commons.wikimedia.org/w/api.php"

# Many image hosts 403 a non-browser fetcher.
_BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
               "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
_API_UA = ("GradeUp-Avatar/1.0 (educational content enrichment; "
           "https://gradeup.co) python-requests")


def is_enabled() -> bool:
    """Feature flag - callers gate all network work on this."""
    return os.getenv("AVATAR_VISUALS_ENABLED", "true").strip().lower() in ("1", "true", "yes")


def _open_web_allowed() -> bool:
    return os.getenv("AVATAR_VISUALS_OPEN_WEB", "false").strip().lower() in ("1", "true", "yes")


def _await_observation_enabled() -> bool:
    """Whether a picture segment marks itself as waiting for the student.

    Set false when the front end cannot answer a picture question, so the
    lesson never pauses on an interaction it has no way to complete.
    """
    return os.getenv("AVATAR_VISUALS_AWAIT_OBSERVATION", "true").strip().lower() in ("1", "true", "yes")


def _walkthrough_enabled() -> bool:
    """Whether accepted pictures also get a 3-step guided tour.

    One extra vision call per ACCEPTED picture (not per candidate), so the cost
    is bounded by AVATAR_VISUALS_PER_SECTION, not by how many images the gate
    had to reject.
    """
    return os.getenv("AVATAR_VISUALS_WALKTHROUGH", "true").strip().lower() in ("1", "true", "yes")


# ==============================================================================
#  HOST GATE
# ==============================================================================

# Coaching / answer-scraper platforms. Their images are watermarked screenshots
# of someone else's textbook and carry the platform's own branding, so they are
# never acceptable in a lesson no matter how well they match the query.
_BLOCKED_EDTECH = (
    "byjus", "vedantu", "toppr", "unacademy", "doubtnut", "shaalaa",
    "meritnation", "learncbse", "topperlearning", "extramarks", "embibe",
    "aakash", "allen.ac.in", "physicswallah", "pw.live", "careers360",
    "tiwariacademy", "ncertsolutions", "cbsetuts", "studyrankers",
    "jagranjosh", "testbook", "adda247", "oswaalbooks", "selfstudys",
    "dronstudy", "teachoo", "cuemath", "brainly", "chegg", "coursehero",
    "quizlet", "scribd", "slideshare", "studocu", "sarthaks", "ncerthelp",
    "vidyakul", "magnetbrains", "infinitylearn", "vidyasetu", "successcds",
    "entrancei", "askiitians", "esaral", "gradeup.co", "studyadda",
    "examfear", "nextgurukul", "lidolearning", "praadis", "homeworkhelp",
    "toppersbulletin", "learninsta", "samacheerkalvi", "guidefortamil",
    "kseebsolutions", "apboardsolutions", "tsboardsolutions",
)

# Stock-photo hosts. Their public previews are watermarked as a business model,
# so a hit here is a watermark hit even when the URL says nothing about it.
_BLOCKED_STOCK = (
    "shutterstock", "alamy", "dreamstime", "istockphoto", "gettyimages",
    "123rf", "depositphotos", "bigstockphoto", "canstockphoto", "vectorstock",
    "stock.adobe", "fotolia", "agefotostock", "zoonar", "imago-images",
    "mediastorehouse", "sciencephoto", "superstock", "dissolve.com", "pond5",
    "colourbox", "picfair", "stockfresh", "crushpixel", "featurepics",
    "clipartof", "storyblocks", "photostock", "lookphotos", "westend61",
    "robertharding", "naturepl", "mindenpictures", "photoshelter", "smugmug",
    "fineartamerica", "pixels.com", "zazzle", "redbubble", "etsystatic",
    "dreamstime", "stockphotosecrets", "vecteezy", "freepik",
)

# Watermark / preview tells that show up in the URL path or the result title.
_WATERMARK_TOKENS_RE = re.compile(
    r"(watermark|watermarked|-wm\.|_wm\.|/wm/|/comp/|royalty[-_ ]?free|"
    r"stock[-_ ]?photo|stock[-_ ]?image|preview[-_ ]?image|sample[-_ ]?image|"
    r"with[-_ ]?logo|logo[-_ ]?overlay|copyrighted|for[-_ ]?sale|buy[-_ ]?this)",
    re.I,
)

# UI chrome rather than teaching content.
_ICON_HOST_RX = re.compile(
    r"(jsdelivr\.net|devicons?|lucide|iconify|fontawesome|simpleicons|"
    r"unpkg\.com|githubassets|shields\.io|/icons?/|/sprites?/|/avatars?/|"
    r"gravatar|/logos?/|favicon)", re.I)

# Hosts whose images are reliably clean and freely usable in a classroom.
_TRUSTED_HOSTS = (
    "upload.wikimedia.org", "commons.wikimedia.org", "wikimedia.org",
    "wikipedia.org", "wikibooks.org", "wikiversity.org",
    "nasa.gov", "noaa.gov", "usgs.gov", "nih.gov", "nlm.nih.gov", "cdc.gov",
    "esa.int", "europa.eu", "energy.gov", "epa.gov", "nps.gov", "noirlab.edu",
    "si.edu", "loc.gov", "archive.org", "biodiversitylibrary.org",
    "openstax.org", "cnx.org", "libretexts.org", "phet.colorado.edu",
    "pixabay.com", "unsplash.com", "pexels.com", "publicdomainpictures.net",
    "openclipart.org", "ncbi.nlm.nih.gov", "jpl.nasa.gov", "hubblesite.org",
    "webbtelescope.org", "bhl.si.edu",
)

# A .gov / .edu style public-institution domain, optionally country-suffixed
# (nasa.gov, mit.edu, ox.ac.uk, iitb.ac.in).
_PUBLIC_INSTITUTION_RE = re.compile(r"\.(gov|edu|ac)(\.[a-z]{2})?$", re.I)


def _host_of(url: str) -> str:
    try:
        return (urlparse(url).netloc or "").lower()
    except Exception:
        return ""


def _is_blocked(image_url: str, page_url: str = "", title: str = "") -> Optional[str]:
    """Return a rejection reason when any host/URL gate trips, else None."""
    if not image_url:
        return "empty url"

    haystack = f"{image_url} {page_url} {title}".lower()

    for bad in _BLOCKED_EDTECH:
        if bad in haystack:
            return f"coaching/ed-tech platform ({bad})"
    for bad in _BLOCKED_STOCK:
        if bad in haystack:
            return f"stock-photo host ({bad})"
    if _WATERMARK_TOKENS_RE.search(haystack):
        return "watermark/preview marker in url or title"
    if _ICON_HOST_RX.search(image_url):
        return "icon/logo asset"

    path = image_url.lower().split("?", 1)[0]
    if path.endswith((".svg", ".gif", ".ico", ".tif", ".tiff", ".pdf", ".webm", ".mp4")):
        return "unsupported image format"
    return None


def _is_trusted(image_url: str, page_url: str = "") -> bool:
    """True when the image comes from a host known to publish clean images."""
    for host in (_host_of(image_url), _host_of(page_url)):
        if not host:
            continue
        if any(t in host for t in _TRUSTED_HOSTS):
            return True
        if _PUBLIC_INSTITUTION_RE.search(host.split(":", 1)[0]):
            return True
    return False


# ==============================================================================
#  QUERY BUILDING
# ==============================================================================

# Classroom-speak that steers image search away from the subject. Words that
# actually describe a picture (diagram, labelled, structure, cross-section ...)
# are deliberately KEPT.
_QUERY_STOPWORDS = {
    "let", "lets", "us", "we", "our", "you", "your", "i", "me", "my",
    "notice", "observe", "see", "look", "think", "imagine", "remember",
    "now", "next", "then", "so", "because", "very", "really", "quite",
    "today", "class", "student", "students", "lesson", "chapter", "section",
    "topic", "textbook", "book", "study", "learn", "learning", "teach",
    "understand", "understanding", "explain", "explanation", "question",
    "answer", "example", "examples", "segment", "avatar", "shall", "ready",
    "the", "and", "for", "are", "was", "were", "been", "this", "that",
    "these", "those", "its", "with", "from", "about", "into", "will", "can",
    "could", "would", "should", "have", "has", "had", "does", "did", "just",
    "also", "but", "when", "how", "what", "why", "which", "who", "some",
    "any", "all", "more", "most", "much", "many", "one", "two", "there",
    "here", "out", "over", "than", "quick", "quickly", "simple", "simply",
    "important", "interesting", "great", "good", "well", "sure", "okay",
}


def build_visual_query(text: str, section_title: str = "", unit_title: str = "") -> str:
    """Turn a teaching segment into a CONTENT image query.

    Strips classroom filler so we search for the subject rather than for the act
    of teaching it, and falls back to the section/unit title when a segment is
    pure narration with no subject of its own.
    """
    words = re.findall(r"[A-Za-z][A-Za-z0-9-]+", text or "")
    subject = [w for w in words if w.lower() not in _QUERY_STOPWORDS]
    # The first handful of content words carry the segment's topic; beyond that
    # the search engine starts matching noise.
    query = " ".join(subject[:6]).strip()
    if len(query) >= 8:
        return query
    return (section_title or unit_title or "").strip()


# ==============================================================================
#  GROUNDING GATE - a picture may only illustrate what the SECTION says
# ==============================================================================

# The planner is told to swap an abstract idea for the "real-world anchor it
# mentions" - which is what makes a picture findable at all ("calcium carbonate
# decomposes" -> "limestone rock"). But "it mentions" is a phrase in a prompt,
# not a constraint, and models override it: a section introducing the SOURCES
# of medieval Indian history produced queries for "Eran" and "the Arab conquest
# of Sindh", neither of which appears anywhere in the section. The lesson then
# showed a map of Sindh and a signboard at Eran, and the avatar taught them as
# though the section had raised them.
#
# That is the dangerous failure for an educational tool: it does not look like
# a bug. The lesson is fluent, the picture is clean, the gate passed it - and
# the student is being taught material the textbook never set. So grounding is
# enforced HERE, in code, against the section's own words, rather than asked
# for in a prompt.
_GROUNDING_MIN_OVERLAP = float(os.getenv("AVATAR_VISUALS_GROUNDING", "0.5"))

# Words that describe the PICTURE rather than the subject. They carry no
# grounding information, so requiring them to appear in the textbook would
# reject almost every legitimate query.
_QUERY_FORMAT_WORDS = {
    "diagram", "labelled", "labeled", "chart", "map", "schematic", "drawing",
    "illustration", "photo", "photograph", "picture", "image", "cross",
    "section", "structure", "parts", "types", "model", "example", "infographic",
    "view", "close", "up", "detail", "overview",
}


def _content_words(text: str) -> set:
    """Lower-cased words that carry subject meaning.

    Three-letter words count: "bus", "car", "fan", "ice", "map" are the whole
    subject of many everyday-scene queries, and dropping them used to leave
    "person standing in braking bus" with nothing that could ground it.
    """
    return {w for w in re.findall(r"[a-z]+", (text or "").lower())
            if len(w) >= 3 and w not in _QUERY_STOPWORDS
            and w not in _QUERY_FORMAT_WORDS}


def _word_stem(word: str) -> str:
    """Crude stem so "braking" grounds "brakes" and "shaking" grounds "shake"."""
    for suffix in ("ings", "ing", "ies", "ied", "es", "ed", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    return word


def _words_match(query_word: str, source_word: str) -> bool:
    if query_word in source_word or source_word in query_word:
        return True
    qs, ss = _word_stem(query_word), _word_stem(source_word)
    return qs == ss or (len(qs) >= 4 and (qs in ss or ss in qs))


def _query_is_grounded(query: str, source_text: str,
                       min_overlap: float = _GROUNDING_MIN_OVERLAP) -> bool:
    """True when a visual query is about something the SECTION actually raises.

    Compares the query's subject words against the section text, ignoring the
    format words ("diagram", "labelled") that describe the picture rather than
    the topic. A query whose subject words are largely absent from the section
    is asking for a picture of something the student was never taught.

    Deliberately a WORD test rather than a semantic one: a semantic check would
    happily rate "Arab conquest of Sindh" as related to "medieval Indian
    history" - which is exactly the drift being prevented. The section's own
    vocabulary is the specification.

    An empty source is treated as grounded, so callers that genuinely have no
    section text (the runtime doubt path) keep working unchanged.
    """
    if not source_text or not source_text.strip():
        return True

    wanted = _content_words(query)
    if not wanted:
        # Nothing but format words - build_visual_query would not have produced
        # this, and there is nothing to verify.
        return False

    available = _content_words(source_text)
    # Substring match, not equality, so "chronicles" grounds "chronicler" and
    # "inscription" grounds "inscriptions"; plus a crude stem so "braking"
    # grounds "brakes" - without one, a section that says "sudden brake is
    # applied" could not ground a picture of a braking bus.
    hits = sum(1 for w in wanted
               if any(_words_match(w, a) for a in available))
    return (hits / len(wanted)) >= min_overlap


def _dedupe_key(url: str) -> str:
    """Collapse Wikimedia thumbnail variants of one file onto a single key."""
    base = url.lower().split("?", 1)[0]
    base = base.replace("/thumb/", "/")
    base = re.sub(r"/\d+px-[^/]+$", "", base)
    return base


def _slugify(value: str, limit: int = 40) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", (value or "").lower()).strip("_")
    return (slug[:limit] or "visual").strip("_")


# ==============================================================================
#  TIER 1 - WIKIMEDIA COMMONS
# ==============================================================================

def _commons_search(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    """Search Wikimedia Commons for freely licensed images. [] on any failure.

    Commons is the preferred source: everything on it is freely licensed and
    watermark-free by site policy, and it holds the labelled scientific diagrams
    a textbook section actually needs.
    """
    if not query.strip():
        return []
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"{query} filetype:bitmap",
        "gsrnamespace": "6",          # File: namespace
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": str(MAX_EDGE),
    }
    try:
        resp = requests.get(COMMONS_API, params=params,
                            headers={"User-Agent": _API_UA},
                            timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        pages = (resp.json().get("query", {}) or {}).get("pages", {}) or {}
    except Exception as e:
        logger.warning(f"[visuals] Commons search failed for '{query}': {e}")
        return []

    out: List[Dict[str, Any]] = []
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        # Prefer the scaled thumburl - full-resolution Commons originals can be
        # tens of megabytes and we only ever ship MAX_EDGE anyway.
        url = info.get("thumburl") or info.get("url")
        if not url:
            continue
        meta = info.get("extmetadata") or {}

        def _meta(key: str) -> str:
            raw = (meta.get(key) or {}).get("value") or ""
            return re.sub(r"<[^>]+>", "", str(raw)).strip()

        out.append({
            "image_url": url,
            "page_url": info.get("descriptionurl") or "",
            "source_name": "Wikimedia Commons",
            "title": (page.get("title") or "").replace("File:", "").rsplit(".", 1)[0],
            "license": _meta("LicenseShortName") or "See Commons file page",
            "attribution": _meta("Artist")[:200],
            "description": _meta("ImageDescription")[:400],
            "width": info.get("thumbwidth") or info.get("width") or 0,
            "height": info.get("thumbheight") or info.get("height") or 0,
            "tier": 1,
        })
    return out


# ==============================================================================
#  TIER 1b - WIKIPEDIA ARTICLE IMAGES
# ==============================================================================

WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"

# Wikipedia pages carry maintenance and UI graphics alongside their real
# figures. These never teach anything.
_WIKI_CHROME_RE = re.compile(
    r"(commons-logo|wiki[a-z]*-logo|wikimedia|wiktionary|wikiquote|wikisource|"
    r"question_book|ambox|edit-clear|folder_hexagonal|symbol_|padlock|"
    r"red_pencil|nuvola|crystal_clear|magnify-clip|disambig|portal|"
    r"increase2?\.|decrease2?\.|yes_check|x_mark|star_full|flag_of)", re.I)


def _wikipedia_article_images(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    """Images used INSIDE the best-matching English Wikipedia articles.

    Complements the Commons file search, which matches on file NAMES and so
    misses the canonical figure whenever it is not literally titled after the
    query. An article's own images are curated by editors to explain that
    article's subject, which is much closer to what a lesson needs: searching
    "respiration reaction" finds nothing useful by filename, while the
    Cellular respiration article contains exactly the diagram a teacher wants.
    """
    if not query.strip():
        return []

    headers = {"User-Agent": _API_UA}
    try:
        # 1. Which articles are actually about this?
        resp = requests.get(WIKIPEDIA_API, headers=headers, timeout=REQUEST_TIMEOUT,
                            params={"action": "query", "format": "json",
                                    "list": "search", "srsearch": query,
                                    "srlimit": "2", "srnamespace": "0"})
        resp.raise_for_status()
        titles = [r.get("title") for r in
                  (resp.json().get("query", {}) or {}).get("search", []) if r.get("title")]
        if not titles:
            return []

        # 2. Every image those articles use, with real URLs and sizes.
        resp = requests.get(WIKIPEDIA_API, headers=headers, timeout=REQUEST_TIMEOUT,
                            params={"action": "query", "format": "json",
                                    "titles": "|".join(titles),
                                    "generator": "images", "gimlimit": str(limit * 3),
                                    "prop": "imageinfo",
                                    "iiprop": "url|size|mime|extmetadata",
                                    "iiurlwidth": str(MAX_EDGE)})
        resp.raise_for_status()
        pages = (resp.json().get("query", {}) or {}).get("pages", {}) or {}
    except Exception as e:
        logger.warning(f"[visuals] Wikipedia image lookup failed for '{query}': {e}")
        return []

    out: List[Dict[str, Any]] = []
    for page in pages.values():
        name = page.get("title") or ""
        if _WIKI_CHROME_RE.search(name):
            continue
        info = (page.get("imageinfo") or [{}])[0]
        url = info.get("thumburl") or info.get("url")
        if not url:
            continue
        meta = info.get("extmetadata") or {}

        def _meta(key: str) -> str:
            raw = (meta.get(key) or {}).get("value") or ""
            return re.sub(r"<[^>]+>", "", str(raw)).strip()

        out.append({
            "image_url": url,
            "page_url": info.get("descriptionurl") or "",
            "source_name": "Wikipedia",
            "title": name.replace("File:", "").rsplit(".", 1)[0],
            "license": _meta("LicenseShortName") or "See Commons file page",
            "attribution": _meta("Artist")[:200],
            # The article that uses it says more about the topic than the
            # filename does, so it feeds relevance scoring.
            "description": (f"used in Wikipedia articles: {', '.join(titles)}. "
                            f"{_meta('ImageDescription')}")[:400],
            "width": info.get("thumbwidth") or info.get("width") or 0,
            "height": info.get("thumbheight") or info.get("height") or 0,
            "tier": 1,
        })
        if len(out) >= limit:
            break
    return out


# ==============================================================================
#  TIER 2/3 - SEARXNG IMAGES
# ==============================================================================

# SearXNG is optional infrastructure and is NOT running in the main
# deployment, where its absence used to cost ~8 s of connection retries on
# every single image lookup plus two ERROR lines in the log - per query, per
# variant, forever. One failure is enough to know it is not there, so the
# first miss disables it for the life of the process. Nothing to configure,
# and it comes back on its own the next time the app starts with SearXNG up.
#   None = not yet probed, True/False = what the probe found.
#
# The check has to be its own request: ppt_websearch._searxng SWALLOWS its
# exceptions and returns [], so "no results" and "no server" are indistinguish-
# able from the outside, and an empty-result day would otherwise disable a
# perfectly healthy SearXNG for the whole process.
_SEARXNG_AVAILABLE: Optional[bool] = None
_SEARXNG_PROBE_TIMEOUT = 3


def _searxng_reachable() -> bool:
    """Whether the configured SearXNG answers at all. Probed once per process."""
    global _SEARXNG_AVAILABLE
    if _SEARXNG_AVAILABLE is not None:
        return _SEARXNG_AVAILABLE

    url = os.getenv("SEARXNG_URL", "").strip()
    if not url:
        _SEARXNG_AVAILABLE = False
        return False
    try:
        requests.get(url, timeout=_SEARXNG_PROBE_TIMEOUT)
        _SEARXNG_AVAILABLE = True
    except Exception:
        logger.info("[visuals] SearXNG not reachable - skipping that tier "
                    "(Commons, Openverse, NASA and the web scrape still run)")
        _SEARXNG_AVAILABLE = False
    return _SEARXNG_AVAILABLE


def _searxng_images(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Image results from the self-hosted SearXNG. [] when it is unavailable.

    Reuses ppt_websearch's SearXNG entry point rather than re-implementing the
    call, so the empty-result retry tuned there applies here too.
    """
    if not query.strip() or not _searxng_reachable():
        return []
    try:
        from ppt.ppt_websearch import _searxng
    except Exception as e:
        logger.info(f"[visuals] SearXNG tier unavailable ({e}) - using Commons only")
        return []

    try:
        results = _searxng(query, limit, categories="images") or []
    except Exception as e:
        logger.warning(f"[visuals] SearXNG image search failed: {e}")
        return []

    out: List[Dict[str, Any]] = []
    for r in results:
        url = r.get("img_src") or r.get("url")
        if not url:
            continue
        out.append({
            "image_url": url,
            "page_url": r.get("url") or "",
            "source_name": r.get("source") or _host_of(url),
            "title": r.get("title") or "",
            "license": "",
            "attribution": "",
            "description": (r.get("content") or "")[:400],
            "width": r.get("img_width") or 0,
            "height": r.get("img_height") or 0,
            "tier": 2,
        })
    return out


# ==============================================================================
#  TIER 2b - OPENVERSE  (CC-licensed aggregator, public API)
# ==============================================================================

OPENVERSE_API = "https://api.openverse.org/v1/images/"
# Openverse's search endpoint read-times-out on this network - measured at 30s+
# for real queries, returning only when a query has zero results. Left at the
# 25s default it burned ~25-75s of dead wait PER SECTION and contributed nothing
# the other sources did not (its hits are Wikimedia-hosted, which Commons
# already returns). So: a short own timeout, and a one-strike circuit breaker,
# exactly like SearXNG. It comes back on its own next process start if the
# service recovers.
OPENVERSE_TIMEOUT = int(os.getenv("AVATAR_VISUALS_OPENVERSE_TIMEOUT", "8"))
_OPENVERSE_AVAILABLE: Optional[bool] = None


def _openverse_images(query: str, limit: int = 12) -> List[Dict[str, Any]]:
    """Openly-licensed images from Openverse. [] on any failure.

    Openverse indexes Commons alongside museums, Flickr commons and science
    archives, and - crucially - ranks them differently. A measured example:
    for "human heart labelled diagram" the Commons API's own search never
    surfaced the plain English file "Heart labelled large", while Openverse
    returned it in the top five. Same corpus, better ordering, so it earns its
    round trip even though the two overlap heavily.

    Everything here is CC or public domain, so it is watermark-free by licence
    the way Commons is - which is why it sits in tier 2 rather than the open
    web tier that is off by default.
    """
    global _OPENVERSE_AVAILABLE
    if not query.strip() or _OPENVERSE_AVAILABLE is False:
        return []
    try:
        resp = requests.get(
            OPENVERSE_API,
            params={"q": query, "page_size": limit,
                    "license_type": "all-cc", "mature": "false"},
            headers={"User-Agent": _API_UA}, timeout=OPENVERSE_TIMEOUT)
        resp.raise_for_status()
        results = resp.json().get("results", []) or []
        _OPENVERSE_AVAILABLE = True
    except requests.Timeout:
        # A timeout means the service is unhealthy for the rest of this run;
        # a 30s wait repeated per section is far worse than losing one source.
        _OPENVERSE_AVAILABLE = False
        logger.info("[visuals] Openverse timed out - disabling it for this run "
                    "(Commons, Wikipedia, NASA and the web scrape still run)")
        return []
    except Exception as e:
        logger.info(f"[visuals] Openverse unavailable for '{query}': {e}")
        return []

    out: List[Dict[str, Any]] = []
    for item in results:
        url = item.get("url")
        if not url:
            continue
        out.append({
            "image_url": url,
            "page_url": item.get("foreign_landing_url") or "",
            "source_name": item.get("source") or "Openverse",
            "title": (item.get("title") or "").strip(),
            "license": (item.get("license") or "").upper(),
            "attribution": (item.get("creator") or "")[:200],
            "description": "",
            "width": item.get("width") or 0,
            "height": item.get("height") or 0,
            "tier": 2,
        })
    return out


# ==============================================================================
#  TIER 2c - NASA IMAGE LIBRARY  (public domain)
# ==============================================================================

NASA_API = "https://images-api.nasa.gov/search"

# NASA holds nothing about the human heart or the Mughal empire, so the call is
# only worth making for the topics it actually covers. Guarding on the query
# saves a round trip on every other lookup.
_NASA_TOPIC_RE = re.compile(
    r"\b(planet|solar system|sun|moon|lunar|mars|venus|jupiter|saturn|uranus|"
    r"neptune|mercury|earth|space|orbit|satellite|galaxy|star|comet|asteroid|"
    r"meteor|eclipse|astronaut|rocket|telescope|atmosphere|cloud|weather|"
    r"hurricane|climate|ocean current|volcano|glacier|erosion|crater|"
    r"constellation|nebula|universe|gravity)\b", re.I)


# NASA's search ANDs every term, and its corpus is photographs and mission
# visualisations - it holds no "diagrams". Measured: "solar system planets"
# returns 100 items, and "solar system planets order diagram" returns ZERO. The
# picture-format words that help on Commons are exactly what zeroes it out
# here, so they are stripped for this source only.
_NASA_STRIP_RE = re.compile(
    r"\b(diagram|labell?ed|labels?|chart|schematic|cross[- ]section|"
    r"illustration|drawing|order|structure|parts?|types?|infographic)\b", re.I)


def _nasa_images(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    """Public-domain images from the NASA library, for space/earth topics."""
    if not query.strip() or not _NASA_TOPIC_RE.search(query):
        return []
    nasa_query = _NASA_STRIP_RE.sub(" ", query)
    nasa_query = re.sub(r"\s+", " ", nasa_query).strip()
    if not nasa_query:
        return []
    try:
        resp = requests.get(NASA_API,
                            params={"q": nasa_query, "media_type": "image"},
                            headers={"User-Agent": _API_UA},
                            timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        items = (resp.json().get("collection", {}) or {}).get("items", []) or []
    except Exception as e:
        logger.info(f"[visuals] NASA library unavailable for '{query}': {e}")
        return []

    out: List[Dict[str, Any]] = []
    for item in items[:limit]:
        data = (item.get("data") or [{}])[0]
        links = item.get("links") or []
        url = next((l.get("href") for l in links if l.get("href")), None)
        if not url:
            continue
        out.append({
            "image_url": url,
            "page_url": data.get("nasa_id") and
            f"https://images.nasa.gov/details/{data['nasa_id']}" or "",
            "source_name": data.get("center") or "NASA",
            "title": (data.get("title") or "").strip(),
            "license": "Public domain (NASA)",
            "attribution": (data.get("photographer") or data.get("center") or "")[:200],
            "description": (data.get("description") or "")[:400],
            "width": 0,
            "height": 0,
            "tier": 2,
        })
    return out


# ==============================================================================
#  TIER 2d / 3 - OPEN-WEB IMAGE SCRAPE
# ==============================================================================

# The self-hosted SearXNG that tiers 2 and 3 were built on is not running in
# the main deployment, so both tiers have always returned []. Every picture the
# avatar has ever shown came from Commons alone - and Commons alone is a narrow
# net: across eight school topics it offered a Kurdish heart, a Russian plant
# cell, a French regional volcano section, a moons poster for "planet order"
# and an unlabelled worksheet for the digestive system.
#
# So the open web is reached directly instead. Bing is scraped rather than
# queried because its image search needs no key and embeds the result metadata
# as JSON in the markup, which is far more stable to parse than a rendered
# grid.
#
# What comes back is mostly unusable - freepik, pngtree, vectorstock, clipart
# farms - and that is expected and fine: this feeds the SAME host gate as
# everything else, which blocks stock and coaching hosts outright, and results
# from untrusted hosts stay behind AVATAR_VISUALS_OPEN_WEB. In practice this
# source earns its place by reaching .edu / .gov / museum diagrams that Commons
# does not index, not by widening what is accepted.
BING_IMAGE_SEARCH = "https://www.bing.com/images/search"

_BING_META_RE = re.compile(r'class="iusc"[^>]*\sm="([^"]+)"', re.I)


def _scrape_allowed() -> bool:
    return os.getenv("AVATAR_VISUALS_SCRAPE", "true").strip().lower() in ("1", "true", "yes")


def _bing_images(query: str, limit: int = 25) -> List[Dict[str, Any]]:
    """Scrape Bing image search. [] on any failure or when disabled.

    Tier is decided per result: a trusted host (.edu, .gov, NASA, OpenStax ...)
    is tier 2 and usable now, anything else is tier 3 and stays gated behind
    AVATAR_VISUALS_OPEN_WEB.
    """
    if not query.strip() or not _scrape_allowed():
        return []
    try:
        resp = requests.get(
            BING_IMAGE_SEARCH,
            params={"q": query, "form": "HDRSC2", "first": "1"},
            headers={"User-Agent": _BROWSER_UA,
                     "Accept-Language": "en-US,en;q=0.9"},
            timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        blocks = _BING_META_RE.findall(resp.text)
    except Exception as e:
        logger.info(f"[visuals] Bing image scrape failed for '{query}': {e}")
        return []

    out: List[Dict[str, Any]] = []
    for block in blocks[:limit]:
        try:
            meta = json.loads(html.unescape(block))
        except (json.JSONDecodeError, TypeError):
            continue
        url = meta.get("murl")
        if not url:
            continue
        page_url = meta.get("purl") or ""
        out.append({
            "image_url": url,
            "page_url": page_url,
            "source_name": _host_of(page_url) or _host_of(url),
            "title": (meta.get("t") or "").strip(),
            "license": "",
            "attribution": "",
            "description": (meta.get("desc") or "")[:400],
            "width": 0,
            "height": 0,
            "tier": 2 if _is_trusted(url, page_url) else 3,
        })
    return out


# A labelled diagram teaches a concept; a pretty photo of bubbling test tubes
# decorates it. When both match the query we want the diagram, so these words in
# a candidate's title earn it a ranking bonus.
_TEACHING_IMAGE_WORDS = (
    "diagram", "labelled", "labeled", "schematic", "chart", "illustration",
    "structure", "anatomy", "cross section", "cross-section", "types",
    "classification", "cycle", "process", "map", "graph", "model", "scheme",
)

# How much each source tier is worth when ranking against relevance.
# Deliberately modest: tier 1 is licence-clean but its topical coverage is
# patchy, and weighting it heavily buried strongly-matching .edu/.gov diagrams
# below Commons files that merely shared a word with the query.
_TIER_BONUS = {1: 1.0, 2: 0.5, 3: 0.0}

# Commons hosts the same diagram translated into dozens of languages, named
# "Diagram of the human heart (cropped) fr.svg" and so on. The vision gate does
# reject a diagram labelled in another language, but only after paying for a
# download and a vision call - and four of them in a row can exhaust the try
# budget before an English version is ever reached. Demoting them by name is
# free, so the budget gets spent on candidates that can actually win.
# Commons localises a file by SUFFIXING its language, never by mentioning it
# mid-title: "Diagram of the human heart (cropped) fr", "heart es.svg",
# "Plant cell structure-ru-v1". Anchoring the two-letter codes to that trailing
# position is what makes them safe to match at all - unanchored, a bare code is
# indistinguishable from an English word ("This IS the human heart"), a
# chemical symbol ("HE balloon", "PT catalyst", "CA channel diagram") or a unit
# ("100 ML beaker"), and demoting one of those costs us a perfectly good
# English picture. That is the expensive direction of this filter, so it errs
# toward keeping.
_NON_ENGLISH_CODE_RE = re.compile(
    r"(?:[-_ (]|^)("
    r"af|ar|az|be|bg|bn|bs|ca|cs|cy|da|de|el|es|et|eu|fa|fi|fr|ga|gl|gu|he|"
    r"hi|hr|hu|hy|id|is|it|ja|ka|kk|km|kn|ko|la|lo|lt|lv|mk|ml|mn|mr|ms|my|"
    r"nb|ne|nl|nn|pa|pl|pt|ro|ru|si|sk|sl|sq|sr|sv|sw|ta|te|th|tr|uk|ur|uz|"
    r"vi|zh|zh[-_ ]?t|zh[-_ ]?s"
    # Second wave, added after a Commons-only harvest put a KURDISH heart
    # ("Blausen 0451 Heart Anterior ku") top of the pool for eight straight
    # school topics.
    r"|eo|fo|gd|ha|ig|jv|ku|ky|lb|mg|mt|oc|ps|sd|su|tg|tk|tt|ug|yi|yo|zu"
    # African and other Commons localisations the first two passes missed
    # ("Digestive system diagram ln" is Lingala).
    r"|ak|ay|bm|ee|ff|gn|ht|iu|kg|ki|lg|ln|nd|nr|ny|om|qu|rw|ss|st|tn|ts|tw|"
    r"ve|wo|xh"
    r")"
    # optional "-v1" / " 2" sequence marker, optional file extension, then END
    r"(?:[-_ ]?v?\d+)?(?:\.[a-z]{3,4})?\)?\s*$", re.I)

# A language NAMED in full is unambiguous wherever it appears, so these match
# anywhere. "Plant cell structure Icelandic text" ranked FIRST for 'plant cell
# labelled diagram' purely because "icelandic" was missing from this list.
_NON_ENGLISH_NAME_RE = re.compile(
    r"(?:[-_ (]|^)("
    r"arabic|bengali|bulgarian|catalan|chinese|croatian|czech|danish|dutch|"
    r"finnish|french|galician|german|greek|hebrew|hindi|hungarian|indonesian|"
    r"italian|japanese|korean|latvian|lithuanian|malay|malayalam|norwegian|"
    r"persian|polish|portuguese|romanian|russian|serbian|slovak|slovenian|"
    r"spanish|swedish|tamil|telugu|thai|turkish|ukrainian|vietnamese"
    r"|afrikaans|albanian|armenian|azerbaijani|basque|belarusian|bosnian|"
    r"burmese|estonian|filipino|georgian|gujarati|hausa|icelandic|javanese|"
    r"kannada|kazakh|khmer|kurdish|lao|luxembourgish|macedonian|"
    r"maltese|marathi|mongolian|nepali|punjabi|sinhala|swahili|tagalog|"
    r"urdu|uzbek|welsh|yiddish|yoruba|zulu"
    r")(?:[-_ ).]|$)", re.I)


def _looks_non_english(title: str) -> bool:
    """True when a candidate's own title says it is a localised version."""
    title = title or ""
    return bool(_NON_ENGLISH_CODE_RE.search(title)
                or _NON_ENGLISH_NAME_RE.search(title))


def _relevance(cand: Dict[str, Any], query: str) -> float:
    """Score how well a candidate's own title/description matches the query.

    Tier alone is too blunt an ordering: Commons returns its whole search page,
    so a file literally titled "Types of Chemical Reactions" can sit below three
    obscure reaction schematics. Matching the query against the title pulls the
    on-topic file to the front, where the try budget can actually reach it.
    """
    terms = {w for w in re.findall(r"[a-z0-9]+", query.lower()) if len(w) > 2}
    if not terms:
        return 0.0

    title = (cand.get("title") or "").lower()
    description = (cand.get("description") or "").lower()

    title_hits = sum(1 for t in terms if t in title)
    desc_hits = sum(1 for t in terms if t in description)
    # The title is the file's own claim about itself, so it counts for more.
    score = (title_hits / len(terms)) * 2.0 + (desc_hits / len(terms)) * 0.5

    if any(w in title for w in _TEACHING_IMAGE_WORDS):
        score += 0.75
    if _looks_non_english(cand.get("title") or ""):
        score -= 1.0
    return score


# The picture search runs in STAGES, each a separate search + vision-gate
# round; the first stage that yields a clean picture wins and the later ones
# are never contacted. Order (AVATAR_VISUALS_SOURCE_ORDER, comma-separated):
#   searxng  - the self-hosted SearXNG in Docker (SEARXNG_URL): free, ours,
#              so it is asked first
#   others   - Commons, Wikipedia, Openverse, NASA, Bing scrape
# (Pixabay and Pexels were sources until 2026-09-18 and were removed at the
# user's request; a stale "pixabay" in the env order is ignored.)
SOURCE_STAGES = [st.strip().lower() for st in
                 os.getenv("AVATAR_VISUALS_SOURCE_ORDER", "searxng,others").split(",")
                 if st.strip() and st.strip().lower() != "pixabay"]
# SearXNG results come from anywhere on the web. With this on (default) they
# only have to clear the BLOCK list (stock sites, coaching sites); the vision
# gate catches watermarks. Off = the old rule, trusted hosts only unless
# AVATAR_VISUALS_OPEN_WEB.
SEARXNG_OPEN = os.getenv("AVATAR_VISUALS_SEARXNG_OPEN", "true").strip().lower() in ("1", "true", "yes")


def _stage_sources(stage: str, query: str, prefer_illustration: bool) -> List[Dict[str, Any]]:
    """Raw candidates of one stage, before the host gate."""
    open_web = _open_web_allowed()
    out: List[Dict[str, Any]] = []
    if stage == "searxng":
        for cand in _searxng_images(query):
            trusted = _is_trusted(cand["image_url"], cand.get("page_url", ""))
            if not trusted and not (open_web or SEARXNG_OPEN):
                continue
            cand["tier"] = 2 if trusted else 3
            out.append(cand)
    elif stage == "others":
        out = (_commons_search(query)
               + _wikipedia_article_images(query)
               + _openverse_images(query)
               + _nasa_images(query))
        for cand in _bing_images(query):
            trusted = _is_trusted(cand["image_url"], cand.get("page_url", ""))
            if not trusted and not open_web:
                continue
            cand["tier"] = 2 if trusted else 3
            out.append(cand)
    return out


def gather_candidates(query: str, prefer_illustration: bool = False,
                      stage: Optional[str] = None) -> List[Dict[str, Any]]:
    """Candidates of one stage (or of every stage), host-gated, de-duplicated, best-first.

    Ranking is relevance plus a source bonus, not source alone. Commons is
    licence-clean by construction so it gets the biggest bonus, but a clearly
    on-topic image from a trusted host still outranks an obscure Commons file
    that merely happens to be tier 1.

    ``prefer_illustration`` ranks drawings above photographs and
    vectors before photos and marks them so ranking can favour them - a
    scenario ("standing in a bus that brakes") is far more often found as a
    cartoon than as a photograph.
    """
    stages = [stage] if stage else SOURCE_STAGES
    candidates: List[Dict[str, Any]] = []
    for st in stages:
        candidates += _stage_sources(st, query, prefer_illustration)

    seen: set = set()
    kept: List[Dict[str, Any]] = []
    for cand in candidates:
        reason = _is_blocked(cand["image_url"], cand.get("page_url", ""), cand.get("title", ""))
        if reason:
            logger.debug(f"[visuals] dropped {cand['image_url'][:70]} - {reason}")
            continue
        key = _dedupe_key(cand["image_url"])
        if key in seen:
            continue
        seen.add(key)
        cand["rank_score"] = _relevance(cand, query) + _TIER_BONUS.get(cand.get("tier", 3), 0.0)
        kept.append(cand)

    kept.sort(key=lambda c: -c["rank_score"])
    return kept


# ==============================================================================
#  PIXEL GATE
# ==============================================================================

def _download_ua(url: str) -> str:
    """The User-Agent this host wants to be asked with.

    Most image hosts 403 anything that does not look like a browser. Wikimedia
    is the exact opposite: its User-Agent policy requires a descriptive agent,
    and its on-demand thumbnail service answers a generic browser string with
    429. Sending the wrong one costs us the best-ranked images on every lookup,
    so the choice is made per host rather than globally.
    """
    host = _host_of(url)
    if "wikimedia.org" in host or "wikipedia.org" in host:
        return _API_UA
    return _BROWSER_UA


def _download(url: str) -> Optional[bytes]:
    """Fetch image bytes. None on any failure.

    A 429 is retried once after a short pause: thumbnail services throttle
    bursts, and enrichment fetches several images back to back.
    """
    for attempt in (1, 2):
        try:
            resp = requests.get(url, headers={"User-Agent": _download_ua(url)},
                                timeout=REQUEST_TIMEOUT, stream=True)
            if resp.status_code == 429 and attempt == 1:
                import time
                time.sleep(1.5)
                continue
            if resp.status_code != 200:
                logger.debug(f"[visuals] fetch {resp.status_code} for {url[:80]}")
                return None
            # Guard against a multi-hundred-megabyte original slipping through.
            chunks, total = [], 0
            for chunk in resp.iter_content(65536):
                chunks.append(chunk)
                total += len(chunk)
                if total > MAX_DOWNLOAD_BYTES:
                    logger.debug(f"[visuals] image too large, skipping {url[:80]}")
                    return None
            return b"".join(chunks) or None
        except Exception as e:
            logger.debug(f"[visuals] fetch failed for {url[:80]}: {e}")
            return None
    return None


def _normalize_image(raw: bytes) -> Optional[Dict[str, Any]]:
    """Decode, sanity-check and re-encode an image to clean JPEG.

    Rejects anything too small to teach from, absurdly elongated (banners and
    sliced sprites), or near-uniform (placeholder / 'image unavailable' tiles).
    Re-encoding is what makes the stored copy clean: it drops EXIF, colour
    profiles and any other metadata riding along with the original file.
    """
    try:
        from PIL import Image, ImageStat
    except ImportError:
        logger.warning("[visuals] Pillow not installed - pixel gate skipped")
        return {"bytes": raw, "width": 0, "height": 0, "content_type": "image/jpeg"}

    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception as e:
        logger.debug(f"[visuals] undecodable image: {e}")
        return None

    width, height = img.size
    if width < MIN_WIDTH or height < MIN_HEIGHT:
        logger.debug(f"[visuals] too small ({width}x{height})")
        return None

    ratio = width / float(height or 1)
    if ratio > 3.5 or ratio < 0.28:
        logger.debug(f"[visuals] extreme aspect ratio ({ratio:.2f})")
        return None

    # Flatten transparency onto white so a PNG diagram does not become a black
    # rectangle when it is re-encoded as JPEG.
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        canvas = Image.new("RGB", img.size, (255, 255, 255))
        canvas.paste(img, mask=img.split()[-1])
        img = canvas
    else:
        img = img.convert("RGB")

    # A near-uniform image carries no information - almost always a placeholder.
    try:
        stddev = sum(ImageStat.Stat(img).stddev) / 3.0
        if stddev < 8.0:
            logger.debug(f"[visuals] near-blank image (stddev {stddev:.1f})")
            return None
    except Exception:
        pass

    if max(img.size) > MAX_EDGE:
        img.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return {
        "bytes": buf.getvalue(),
        "width": img.size[0],
        "height": img.size[1],
        "content_type": "image/jpeg",
    }


# ==============================================================================
#  VISION GATE + AVATAR LINE
# ==============================================================================

_VISION_REVIEW_PROMPT = """You are helping a school teaching avatar choose a picture to show a student mid-lesson, and then writing what the avatar SAYS while it is on screen.

You are looking at ONE candidate image. Judge it honestly - a bad picture is worse than no picture.

REJECT the image (usable = false) if ANY of these are true:
- It carries a WATERMARK of any kind: tiled or diagonal text, a translucent
  logo, a stock-agency stamp, a website name/URL printed across it, a signature
  bar, or a "sample"/"preview" overlay.
- It shows the branding, logo, header or watermark of a coaching or homework
  website (Byju's, Vedantu, Toppr, Doubtnut, Chegg and the like), or it is a
  screenshot of such a site, a PDF page, a slide, or a worksheet.
- It is a photo of a textbook page, a scanned answer key, or a page of text.
- It is a meme, a video thumbnail with a face and arrows, or an advertisement.
- It stitches together unrelated photos that have nothing to do with each other.
- It does not actually show the TOPIC, or it would confuse a student rather
  than help.
- It belongs to the WRONG PLACE OR PERIOD. When the topic names a country,
  civilisation or era, an image from a different one is off-topic even if the
  kind of object matches. For "the sources of medieval Indian history", a photo
  of an American cemetery's headstones is NOT an acceptable "stone inscription",
  and a European medieval castle is NOT an acceptable "monument" - they teach a
  student the wrong picture of the very thing being studied. Match the subject's
  place and period, not just the shape of the object.
- It is a chart or diagram whose labels are unreadable or in another language.
- It is a BLANK WORKSHEET: a diagram drawn with pointer lines, arrows or boxes
  that lead to EMPTY space, with the names left off for a student to fill in.
  Look at where each pointer line ENDS - if there is no word there, the picture
  teaches nothing and must be rejected, however clean and well drawn it is.
  This is easy to mistake for a good labelled diagram, so check the labels are
  actually WRITTEN, not merely pointed at.
- It is a diagram of one narrow specialist case when the topic is the general
  idea (a single named enzyme mechanism for "types of chemical reactions").
- It is merely DECORATIVE: it shows the general subject AREA but nothing about
  the specific topic. A photo of bubbling test tubes for "types of chemical
  reactions", or of a stethoscope for "the human heart", is decoration, not
  teaching. Accept a plain photograph only when the topic genuinely is a
  real-world object, organism or scene the student should learn to recognise.
- It is a POSTER OF WORDS: it names the parts of the topic in decorative fonts
  but does not actually illustrate them - styled headings, clip-art and emoji
  scattered on a background, with no real diagram for most of the items it
  names. It looks like a lesson but teaches nothing. Reject it.
- Any of its text is cut off at the edge of the image.

ACCEPT a clean photograph, a labelled scientific or technical diagram, an
educational infographic, a map, or a plain illustration that a teacher would be
happy to project. When the topic is a concept, a process or a classification, a
labelled diagram or infographic is exactly what you are looking for.

Do NOT reject an otherwise good teaching image for being colourful, for using
several colours of text, for being hand-drawn or cartoon-styled, for having a
title heading, or for showing several labelled panels side by side. Those are
normal features of a classroom diagram. Judge it on whether a student would
LEARN the topic from it - not on how decorated it is.

If you ACCEPT, also write the teaching lines. The student is in the class given
in the prompt, so:
- Use short, plain sentences. Everyday words. No jargon unless the lesson uses
  the term, and if you use it, explain it in the same breath.
- Describe what is actually visible in THIS image, and tie it to the idea being
  taught. Never describe something that is not in the picture.
- It is spoken aloud, so no markdown, no bullet points, no emoji, no "as you
  can see in figure 1".
- "avatar_line": 4 to 6 short sentences that actually TEACH the picture. This
  is the avatar's spoken explanation while the image is on screen, and it is
  usually the only description a student gets, so do not settle for naming
  what the picture is. Walk them through it in this order:
    1. Point them at the picture and say what they are looking at.
    2. Describe the SPECIFIC things that are visible - the parts, where they
       sit relative to each other, what they look like, what state they are
       in. Be concrete: "the carving runs down the left face in three rows",
       not "there are some markings".
    3. Explain what those details MEAN for the idea being taught - why this
       part is shaped that way, what it does, what it tells us.
    4. Finish on the one thing they should carry away from having seen it.
  Weak, and the most common failure: "This picture shows an ancient stone
  inscription. You can see letters carved into it, even though it is old."
  That names the object and stops. Strong: it says where the letters are, how
  deep and how worn they look, what surviving on stone for centuries means for
  a historian, and why that makes it a source at all.
  Describe only what is genuinely in THIS image - never invent a detail.
- "look_prompt": ONE short question that makes the student THINK about the
  topic using the picture. It must be answerable from what is visible, but it
  must test understanding, not eyesight. Asking what colour something is, how
  many objects there are, or what an obvious label says does NOT count - ask
  why something looks the way it does, what a part is doing, or what the
  picture tells us about the idea being taught. Never rhetorical, never
  answerable with just yes or no.
- "look_answer": the answer you would accept for look_prompt, in one sentence.

Return STRICT JSON and nothing else:
{
  "usable": true,
  "has_watermark": false,
  "is_on_topic": true,
  "reject_reason": "",
  "shows": "one plain sentence describing what the picture shows",
  "avatar_line": "",
  "look_prompt": "",
  "look_answer": ""
}
"""


def _call_vision(prompt: str, image_bytes: bytes,
                 system_prompt: str = _VISION_REVIEW_PROMPT,
                 max_tokens: int = 900,
                 force_json: bool = True) -> Optional[str]:
    """One vision completion over inline image bytes. None on any failure.

    The image is sent as a base64 data URL rather than a link so the model sees
    exactly the bytes we validated and will store - not whatever the origin host
    decides to serve the provider.

    Routing is avatar_llm's job now, so VISION_MODEL may name any provider.
    """
    result = avatar_llm.chat(
        VISION_MODEL, system_prompt, prompt,
        images=[image_bytes],
        max_tokens=max_tokens,
        force_json=force_json,
        image_detail=VISION_DETAIL,
        timeout=VISION_TIMEOUT,
        fallback_model=VISION_FALLBACK_MODEL,
        trace_name="judge-image",
    )
    if not result.ok:
        logger.warning(f"[visuals] vision call failed ({VISION_MODEL}): "
                       f"{result.error[:200]}")
        return None
    return result.text


def _parse_json(raw: Optional[str]) -> Optional[Dict]:
    """Parse a JSON object out of an LLM reply, tolerating markdown fences."""
    if not raw:
        return None
    text = raw.strip()
    if "```" in text:
        start = text.find("```")
        start = text.find("\n", start) + 1
        end = text.find("```", start)
        text = text[start:end].strip() if end > start else text
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


# A section title alone is a poor context signal for the gate: real books title
# sections "Introduction", "Overview", "Let us recall" and the like, and a gate
# told only "Introduction: - stone inscription" accepted a photo of an American
# Amish cemetery for a lesson on the sources of MEDIEVAL INDIAN history - stones
# with carvings, technically, but the wrong country, era and kind of object
# entirely. The gate has to know the SUBJECT the section sits in to catch that.
_GENERIC_SECTION_TITLES = {
    "introduction", "overview", "summary", "conclusion", "recap",
    "let us recall", "exercises", "activity", "preface", "contents",
    "review", "revision", "warm up", "warm-up",
}


def _gate_topic(section_title: str, unit_title: str, subject: str,
                query: str) -> str:
    """The topical context handed to the vision gate.

    Stacks every signal we have - the unit, the section (unless it is a generic
    word like "Introduction"), and the subject - so the gate can reject an image
    that matches the QUERY's words but belongs to the wrong subject, place or
    period. Using ``section_title or unit_title or query`` instead, as this once
    did, threw the unit and subject away the moment a section had any title at
    all, which is why a medieval-India lesson could show an Amish graveyard.
    """
    parts: List[str] = []
    if unit_title and unit_title.strip():
        parts.append(unit_title.strip())
    st = (section_title or "").strip().rstrip(":").strip()
    if st and st.lower() not in _GENERIC_SECTION_TITLES:
        parts.append(st)
    if subject and subject.strip():
        parts.append(subject.strip())
    context = ", ".join(dict.fromkeys(parts))     # de-duped, order kept
    return f"{context} — {query}".strip(" —") if context else query


def _vision_review(image_bytes: bytes, topic: str, teaching_text: str = "",
                   class_number: str = "", subject: str = "",
                   must_show: str = "") -> Optional[Dict]:
    """Run the vision gate. Returns the parsed verdict, or None if it errored.

    ``must_show`` is a scene the picture has to actually depict. The hook of
    a lesson is a question ABOUT its picture ("you are standing in a bus that
    brakes - what happens to you?"), so a picture of an empty bus interior is
    on-topic and still useless; with the scene stated, the gate rejects it.
    """
    who = f"Class {class_number}" if class_number else "school"
    prompt = (
        f"STUDENT: a {who} student"
        + (f" studying {subject}" if subject else "")
        + f"\nTOPIC BEING TAUGHT: {topic}\n"
    )
    if must_show:
        prompt += (f"REQUIRED SUBJECT AND SETTING: {must_show[:500]}\n"
                   f"This is a hard requirement on top of the rules, and it is ONLY about the kind "
                   f"of subject and the kind of setting: accept the picture if it shows that sort of "
                   f"subject in that sort of place (people riding inside a bus; a coin on a card on "
                   f"a glass). Do NOT reject because the exact action, posture, direction or moment "
                   f"differs - ignore any verb in the description; 'passengers in a bus' is satisfied "
                   f"by ANY picture of people inside a bus, seated or standing, leaning or not. DO "
                   f"reject when the subject or the setting is missing altogether - an empty bus, a "
                   f"person with no bus, a coin with no glass - even if the image is clean and "
                   f"broadly related. A drawing or cartoon is as good as a photograph.\n")
    if teaching_text:
        prompt += f"WHAT THE AVATAR IS SAYING AROUND THIS POINT:\n{teaching_text[:900]}\n"
    prompt += "\nJudge the image against the rules, then return the JSON."

    return _parse_json(_call_vision(prompt, image_bytes))


# ==============================================================================
#  MAIN ENTRY POINT
# ==============================================================================

def _candidate_pool(query: str, section_title: str = "",
                    prefer_illustration: bool = False,
                    stage: Optional[str] = None) -> List[Dict[str, Any]]:
    """Candidates for a topic, widened with a couple of query variants.

    One phrasing is a narrow net. Asking for the topic plainly, asking for it as
    a diagram, and asking for the section title surface noticeably different
    files on Commons, and the vision gate rejects enough candidates that the
    extra breadth is what decides between a good picture and no picture at all.

    Everything is re-scored against the PRIMARY query, never against the variant
    that happened to find it. Scoring each candidate against its own variant
    looks reasonable and is badly wrong: a broad section title like "TYPES OF
    CHEMICAL REACTIONS" matches a generic overview poster almost perfectly, so
    that poster outranks the genuinely relevant hits for "respiration reaction"
    and swallows the whole try budget on a picture that cannot answer the
    segment. The primary query is the specific one, so it decides the order.
    """
    variants = [query]
    if prefer_illustration:
        # A scene is drawn far more often than photographed; ask for it that way too.
        if not re.search(r"\b(cartoon|illustration|drawing|clipart)\b", query, re.I):
            variants.append(f"{query} cartoon illustration")
    elif not re.search(r"\b(diagram|chart|map|structure|labelled|labeled)\b", query, re.I):
        variants.append(f"{query} diagram")
    section_title = (section_title or "").strip()
    if section_title and section_title.lower() not in query.lower() and not prefer_illustration:
        variants.append(section_title)

    pool: List[Dict[str, Any]] = []
    seen: set = set()
    for depth, variant in enumerate(variants):
        for cand in gather_candidates(variant, prefer_illustration=prefer_illustration, stage=stage):
            key = _dedupe_key(cand["image_url"])
            if key in seen:
                continue
            seen.add(key)
            # Earlier variants are the more specific ones, so a hit found there
            # breaks ties in its favour.
            cand["rank_score"] = (_relevance(cand, query)
                                  + _TIER_BONUS.get(cand.get("tier", 3), 0.0)
                                  + 1.0 / (depth + 1)
                                  + (0.75 if prefer_illustration and cand.get("kind") == "illustration" else 0.0))
            pool.append(cand)

    pool.sort(key=lambda c: -c["rank_score"])
    return pool


def find_visual(query: str,
                *,
                teaching_text: str = "",
                section_title: str = "",
                unit_title: str = "",
                board: str = "",
                class_number: str = "",
                subject: str = "",
                unit_number: int = 0,
                max_tries: Optional[int] = None,
                exclude_urls: Optional[List[str]] = None,
                record_tried: bool = True,
                must_show: str = "",
                prefer_illustration: bool = False,
                with_walkthrough: bool = True) -> Optional[Dict[str, Any]]:
    """Find one clean, watermark-free picture for a topic and host it on S3.

    ``must_show`` makes the vision gate require a specific scene (see
    _vision_review); ``prefer_illustration`` searches for drawings first and
    ranks them above photographs. Both are what a lesson's hook picture needs.
    ``with_walkthrough=False`` skips the 3-step guided tour (one vision call
    per accepted picture) for a picture the avatar only talks over - the
    lesson's explanation, hook, mystery and real-world pictures.

    Walks the ranked candidates and returns the FIRST that survives the pixel
    gate and the vision gate, so a watermarked or off-topic hit costs one
    rejection rather than the whole slot. Returns None when nothing clears -
    callers must treat a visual as optional and teach without it.

    Returns:
        {
          "image_url":    S3 URL of the stored, re-encoded image,
          "origin_url":   where it came from,
          "page_url":     the source's description page,
          "source_name":  e.g. "Wikimedia Commons",
          "license":      licence short name when the source declares one,
          "attribution":  creator credit when the source declares one,
          "width", "height",
          "shows":        one-sentence description of the picture,
          "avatar_line":  what the avatar SAYS while showing it,
          "look_prompt":  a question inviting the student to look and answer,
          "look_answer":  the expected answer to look_prompt,
          "query":        the search query that found it,
        }
    """
    if not is_enabled():
        return None
    query = (query or "").strip()
    if not query:
        return None

    topic = _gate_topic(section_title, unit_title, subject, query)
    tries = max_tries or MAX_TRIES
    skip = {_dedupe_key(u) for u in (exclude_urls or [])}

    # Stage by stage: SearXNG first, the rest only if SearXNG had nothing that
    # satisfied the gate. Each stage gets the full try budget; a later stage is
    # never searched when an earlier one wins.
    total_attempted = 0
    for stage in SOURCE_STAGES:
        candidates = _candidate_pool(query, section_title,
                                     prefer_illustration=prefer_illustration, stage=stage)
        if not candidates:
            logger.info(f"[visuals] {stage}: no clean candidates for '{query}'")
            continue
        found, attempted = _judge_candidates(
            candidates, query=query, tries=tries, skip=skip, topic=topic,
            teaching_text=teaching_text, class_number=class_number, subject=subject,
            must_show=must_show, board=board, unit_number=unit_number,
            exclude_urls=exclude_urls, record_tried=record_tried, stage=stage,
            with_walkthrough=with_walkthrough)
        total_attempted += attempted
        if found:
            return found
        logger.info(f"[visuals] {stage}: nothing satisfied the gate for '{query}' "
                    f"after {attempted} check(s) - trying the next source")

    logger.info(f"[visuals] nothing clean found for '{query}' after {total_attempted} check(s)")
    return None


def _judge_candidates(candidates: List[Dict[str, Any]], *, query: str, tries: int, skip: set,
                      topic: str, teaching_text: str, class_number: str, subject: str,
                      must_show: str, board: str, unit_number: int,
                      exclude_urls: Optional[List[str]], record_tried: bool,
                      stage: str = "", with_walkthrough: bool = True
                      ) -> Tuple[Optional[Dict[str, Any]], int]:
    """Walk one stage's candidates through the pixel + vision gates.

    Returns ``(visual, attempts)`` - the first candidate that clears both and
    is stored on S3, or None with how many vision checks were spent.
    """
    attempted = 0
    for cand in candidates:
        if attempted >= tries:
            break
        if _dedupe_key(cand["image_url"]) in skip:
            continue

        raw = _download(cand["image_url"])
        if not raw:
            continue
        normalized = _normalize_image(raw)
        if not normalized:
            continue

        # Every vision call costs money, so it runs only on images that already
        # passed the free host and pixel gates.
        attempted += 1
        # Record the attempt on the caller's list, so a later slot in the same
        # section does not pay to download and re-judge an image this one has
        # already ruled on. Two slots sharing a candidate pool is the normal
        # case, not the exception.
        if record_tried and exclude_urls is not None:
            exclude_urls.append(cand["image_url"])
        verdict = _vision_review(
            normalized["bytes"], topic=topic,
            teaching_text=teaching_text,
            class_number=class_number, subject=subject,
            must_show=must_show,
        )
        if not verdict:
            logger.info(f"[visuals] vision gate unavailable - skipping {cand['image_url'][:70]}")
            continue
        if not verdict.get("usable") or verdict.get("has_watermark") or not verdict.get("is_on_topic", True):
            logger.info(f"[visuals] rejected {cand['image_url'][:70]} - "
                        f"{verdict.get('reject_reason') or 'failed vision gate'}")
            continue
        avatar_line = (verdict.get("avatar_line") or "").strip()
        if not avatar_line:
            logger.info(f"[visuals] no avatar line written for {cand['image_url'][:70]} - skipping")
            continue

        s3_url = _store(normalized, cand, query, board, class_number, subject, unit_number)
        if not s3_url:
            # Without S3 the picture has no durable home; the origin host may
            # block hotlinking or rotate the URL, so we do not ship it.
            logger.warning(f"[visuals] S3 upload failed for '{query}' - dropping visual")
            continue

        # The guided tour is a bonus on top of a picture that has already
        # earned its place, so it is built last and never blocks the visual.
        walkthrough = []
        if with_walkthrough and _walkthrough_enabled():
            walkthrough = build_walkthrough(
                normalized["bytes"], query,
                shows=(verdict.get("shows") or "").strip(),
                teaching_text=teaching_text,
                class_number=class_number, subject=subject)

        logger.info(f"[visuals] {cand['source_name']} -> {query} (tier {cand.get('tier')}"
                    f"{', via ' + stage if stage else ''})"
                    + (f" +{len(walkthrough)}-step walkthrough" if walkthrough else ""))
        return {
            "image_url": s3_url,
            "walkthrough": walkthrough,
            "origin_url": cand["image_url"],
            "page_url": cand.get("page_url", ""),
            "source_name": cand.get("source_name", ""),
            "stage": stage,
            "kind": cand.get("kind", "photo"),
            "license": cand.get("license", ""),
            "attribution": cand.get("attribution", ""),
            "width": normalized["width"],
            "height": normalized["height"],
            "shows": (verdict.get("shows") or "").strip(),
            "avatar_line": avatar_line,
            "look_prompt": (verdict.get("look_prompt") or "").strip(),
            "look_answer": (verdict.get("look_answer") or "").strip(),
            "query": query,
        }, attempted

    return None, attempted


_WALKTHROUGH_PROMPT = """You are GradeUp AI Avatar, a warm school teacher, and the picture on screen is about to be WALKED THROUGH with the student instead of just shown to them.

Write a short guided sequence of EXACTLY 3 steps that takes the student through
this picture. The student answers each one out loud before the next is asked,
so each step must stand on its own and must be answerable from what is VISIBLE.

The three steps escalate, and that order is the whole point:
  1. NOTICE  - point them at one specific part and ask what it is doing, where
               it sits, or how it is arranged. Concrete and findable.
  2. EXPLAIN - ask WHY it is like that, or what its shape/position/size tells
               us. This is where the picture starts teaching the concept.
  3. APPLY   - ask them to predict, compare, or reason one step beyond the
               picture using what they have just worked out. Still anchored to
               the image, but it should make them think.

EVERY STEP MUST TEST THE LESSON, NOT THE PICTURE.
The picture is the way in; the CONCEPT is what is being examined. A question
the student could answer without having learned anything - one that is only
about this particular image - is a wasted step.

  BAD  "What does this sign tell us about the importance of the Eran site?"
       (tests the signboard; the student learns nothing about the topic)
  GOOD "What kind of historical source is shown here, and what could a
       historian learn from it?"
       (uses the image to examine the idea the section is teaching)

Ask yourself for each step: if the student answers this well, have they
understood the TOPIC, or just described a photograph? If it is the latter,
rewrite it so the answer requires the idea being taught.

RULES:
- Never ask what colour something is, how many there are, or what a label says
  word for word. Reading is not understanding.
- Never ask a yes/no question, and never ask something the previous step
  already answered.
- Never ask about a place, person or event by name unless the TOPIC given to
  you names it. The picture may show more than the lesson covers; teach only
  the lesson.
- Every "ask" is SPOKEN aloud: one or two short plain sentences, no markdown,
  no bullets, no emoji, no "as you can see in figure 1".
- "answer" is the answer you would accept, in one sentence.
- "hint" is what you say if they are stuck - it nudges toward the part of the
  picture to look at, and never gives the answer away.
- "points_at" names the part of the image the step is about, so the player can
  highlight it. Use plain words a student would use, not coordinates.

Return STRICT JSON and nothing else:
{
  "steps": [
    {"skill": "notice",  "ask": "", "answer": "", "hint": "", "points_at": ""},
    {"skill": "explain", "ask": "", "answer": "", "hint": "", "points_at": ""},
    {"skill": "apply",   "ask": "", "answer": "", "hint": "", "points_at": ""}
  ]
}
"""

_VALID_SKILLS = ("notice", "explain", "apply")


def build_walkthrough(image_bytes: bytes, topic: str, *, shows: str = "",
                      teaching_text: str = "", class_number: str = "",
                      subject: str = "") -> List[Dict[str, str]]:
    """A 3-step guided tour of one picture. [] when unavailable.

    This is what turns a picture from something the student LOOKS at into
    something they are walked through: notice a part, work out why it is like
    that, then reason one step past it. The single ``look_prompt`` the gate
    already writes stays as the opening beat for players that do not support
    stepping, so this degrades to the old one-question behaviour rather than
    breaking.

    Generated at enrichment time from the bytes already in hand - no extra
    download - and stored on the visual, so the live classroom spends nothing
    to run it.
    """
    who = f"Class {class_number}" if class_number else "school"
    prompt = (
        f"STUDENT: a {who} student"
        + (f" studying {subject}" if subject else "")
        + f"\nTOPIC BEING TAUGHT: {topic}\n"
    )
    if shows:
        prompt += f"WHAT THE PICTURE SHOWS: {shows}\n"
    if teaching_text:
        prompt += f"WHAT THE AVATAR JUST SAID:\n{teaching_text[:700]}\n"
    prompt += "\nLook at the picture and write the three steps."

    parsed = _parse_json(_call_vision(prompt, image_bytes,
                                      system_prompt=_WALKTHROUGH_PROMPT,
                                      max_tokens=900))
    if not parsed:
        return []

    steps: List[Dict[str, str]] = []
    for index, raw in enumerate(parsed.get("steps") or []):
        if not isinstance(raw, dict):
            continue
        ask = (raw.get("ask") or "").strip()
        if not ask:
            continue
        skill = (raw.get("skill") or "").strip().lower()
        steps.append({
            "step": len(steps) + 1,
            # Position is the reliable signal when the model mislabels a skill;
            # the prompt fixes the order, so fall back to it rather than
            # shipping an empty skill the player has to handle.
            "skill": skill if skill in _VALID_SKILLS else _VALID_SKILLS[
                min(index, len(_VALID_SKILLS) - 1)],
            "ask": ask,
            "answer": (raw.get("answer") or "").strip(),
            "hint": (raw.get("hint") or "").strip(),
            "points_at": (raw.get("points_at") or "").strip(),
        })
        if len(steps) == 3:
            break
    return steps


def _store(normalized: Dict[str, Any], cand: Dict[str, Any], query: str,
           board: str, class_number: str, subject: str,
           unit_number: int) -> Optional[str]:
    """Upload the cleaned bytes to S3 under the avatar-visuals prefix."""
    try:
        from s3_storage import upload_avatar_visual_to_s3
    except Exception as e:
        logger.warning(f"[visuals] S3 module unavailable: {e}")
        return None

    # Content hash in the name means re-running enrichment for the same section
    # overwrites the same object instead of littering the bucket with copies.
    digest = hashlib.sha1(normalized["bytes"]).hexdigest()[:10]
    filename = f"{_slugify(query)}_{digest}.jpg"

    return upload_avatar_visual_to_s3(
        image_bytes=normalized["bytes"],
        filename=filename,
        board=board,
        class_number=class_number,
        subject=subject,
        unit_number=unit_number,
        content_type=normalized.get("content_type", "image/jpeg"),
    )


# ==============================================================================
#  RUNTIME INTERACTION - the student talks about the picture
# ==============================================================================

_VISUAL_QA_PROMPT = """You are GradeUp AI Avatar, a warm school teacher. The student is looking at the picture you just put on screen and has asked you about it.

Answer from what is ACTUALLY VISIBLE in the image plus the lesson context given.
If the picture does not show what they are asking about, say so plainly and
answer from the lesson instead - never invent detail that is not in the image.

IF THE QUESTION IS NOT A REAL QUESTION - it is vague, incomplete, or just an
announcement ("I have a doubt", "wait", "explain please") - do NOT guess what
they meant and do NOT start explaining. Ask them warmly what exactly they want
to know, and set "answer" to that.

HOW TO SPEAK:
- Short, plain sentences a school student follows on the first listen.
- Explain any term you use in the same breath.
- It is spoken aloud: no markdown, no bullets, no emoji, no "see figure 1".
- 2 to 4 sentences, then one short encouraging closing line.

Return STRICT JSON and nothing else:
{
  "answer": "what the avatar says",
  "emotion": "one of: enthusiastic, curious, encouraging, surprised, thoughtful, playful, empathetic, confident, warm, inspiring",
  "points_at": "the part of the picture the student should look at, or empty"
}
"""

_OBSERVATION_PROMPT = """You are GradeUp AI Avatar, a warm school teacher. You asked the student to look at the picture on screen and answer a question about it. They have just answered.

Judge their answer generously - they are learning, and a partly right answer is
progress. Never make them feel wrong for trying.

- If they are right: confirm it warmly, then add ONE thing the picture shows
  that they did not mention.
- If they are partly right: say which part they got, then gently fill the gap.
- If they are wrong or say they do not know: no criticism. Point them at the
  exact part of the picture and walk them to the answer in one or two steps.

HOW TO SPEAK: short plain sentences, spoken aloud, no markdown, no emoji,
2 to 4 sentences, always ending on something encouraging.

Return STRICT JSON and nothing else:
{
  "verdict": "correct or partial or incorrect or unsure",
  "response": "what the avatar says back",
  "emotion": "one of: enthusiastic, curious, encouraging, surprised, thoughtful, playful, empathetic, confident, warm, inspiring"
}
"""


def _fetch_stored(image_url: str) -> Optional[bytes]:
    """Read back a stored visual so the vision model can look at it again."""
    try:
        resp = requests.get(image_url, headers={"User-Agent": _BROWSER_UA},
                            timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200 and resp.content:
            return resp.content
    except Exception as e:
        logger.warning(f"[visuals] could not re-read {image_url[:80]}: {e}")
    return None


def explain_visual(image_url: str, student_question: str,
                   *, shows: str = "", lesson_context: str = "",
                   class_number: str = "", subject: str = "") -> Optional[Dict[str, str]]:
    """Answer a student's question about the picture currently on screen.

    The model is shown the real image, so the answer is grounded in what the
    student can actually see rather than in a description of it.
    """
    if not image_url or not (student_question or "").strip():
        return None

    image_bytes = _fetch_stored(image_url)
    if not image_bytes:
        return None

    who = f"Class {class_number}" if class_number else "school"
    prompt = (
        f"STUDENT: a {who} student"
        + (f" studying {subject}" if subject else "")
        + f"\nSTUDENT'S QUESTION ABOUT THE PICTURE: {student_question}\n"
    )
    if shows:
        prompt += f"WHAT THE PICTURE SHOWS: {shows}\n"
    if lesson_context:
        prompt += f"\nLESSON CONTEXT:\n{lesson_context[:1500]}\n"

    parsed = _parse_json(_call_vision(prompt, image_bytes,
                                      system_prompt=_VISUAL_QA_PROMPT,
                                      max_tokens=600))
    if not parsed or not (parsed.get("answer") or "").strip():
        return None
    return {
        "answer": parsed["answer"].strip(),
        "emotion": (parsed.get("emotion") or "warm").strip(),
        "points_at": (parsed.get("points_at") or "").strip(),
    }


def review_student_observation(image_url: str, look_prompt: str,
                               student_answer: str,
                               *, expected_answer: str = "", shows: str = "",
                               class_number: str = "",
                               subject: str = "") -> Optional[Dict[str, str]]:
    """Respond to what the student says they can see in the picture.

    This is the half that makes the visual two-way: the avatar asked them to
    look, and this reacts to the answer instead of moving on regardless.
    """
    if not image_url or not (student_answer or "").strip():
        return None

    image_bytes = _fetch_stored(image_url)
    if not image_bytes:
        return None

    who = f"Class {class_number}" if class_number else "school"
    prompt = (
        f"STUDENT: a {who} student"
        + (f" studying {subject}" if subject else "")
        + f"\nYOU ASKED: {look_prompt}\n"
        f"THEY ANSWERED: {student_answer}\n"
    )
    if expected_answer:
        prompt += f"THE ANSWER YOU WERE LOOKING FOR: {expected_answer}\n"
    if shows:
        prompt += f"WHAT THE PICTURE SHOWS: {shows}\n"
    prompt += "\nLook at the picture and respond to them."

    parsed = _parse_json(_call_vision(prompt, image_bytes,
                                      system_prompt=_OBSERVATION_PROMPT,
                                      max_tokens=600))
    if not parsed or not (parsed.get("response") or "").strip():
        return None
    return {
        "verdict": (parsed.get("verdict") or "partial").strip().lower(),
        "response": parsed["response"].strip(),
        "emotion": (parsed.get("emotion") or "encouraging").strip(),
    }


# ==============================================================================
#  ENRICHMENT-TIME ATTACHMENT
# ==============================================================================

_VISUAL_PLAN_PROMPT = """You are choosing where a PICTURE would genuinely help in a lesson an AI avatar speaks aloud to a student.

You are given the lesson's teaching segments. Pick only the segments where
SEEING something changes whether the student understands it:
- a structure and its parts (an organ, a cell, a machine, a leaf)
- a process or cycle laid out in steps
- a real object, organism, place or event the student should recognise
- a comparison that is obvious side by side but wordy to describe
- anything the segment describes in spatial terms (shape, layers, position)

Do NOT pick:
- the opening greeting, the recap, or the closing summary
- a segment that is a pure definition, a formula, or a rule
- a segment where a picture would only decorate the words
- more segments than you are asked for

THE QUERY MUST NAME SOMETHING THAT CAN ACTUALLY BE PHOTOGRAPHED OR DRAWN.
This is the rule that decides whether a picture is found at all. A real image
exists of an OBJECT, an ORGANISM, a PLACE, a PIECE OF APPARATUS, or a standard
labelled diagram. No image exists of an abstract reaction, an equation, or a
definition - searching for one returns nothing usable and the segment ends up
with no picture at all.

GROUND EVERY QUERY IN THE SECTION'S OWN WORDS.
Build the query out of terms that appear in the SEGMENTS you were given. You
may generalise a term ("inscriptions" -> "stone inscription") but you may NOT
introduce a place, person, event, dynasty or artefact the section never names.

This is the rule that is broken most often, and it is the most damaging one,
because nothing downstream looks wrong. A section introducing the SOURCES of
medieval Indian history - inscriptions, monuments, coins, chroniclers, bias -
produced queries for "Arab conquest of Sindh" and "Eran ancient site". Both
found clean, on-topic, watermark-free pictures, and the avatar then taught a
map of Sindh and a signboard at Eran as if the textbook had set them. The
student cannot tell the difference; only the syllabus can.

So: if the specific thing you want to picture is not named in the segments, ask
for the GENERAL form of what IS named, or return nothing for that segment.
A query naming anything absent from the section is discarded before it is
searched, so it costs the segment its picture entirely.

When a segment teaches something abstract, ask for the REAL-WORLD ANCHOR IT
NAMES ITSELF:
- "water is formed when hydrogen burns"  -> NOT "water formation reaction
  diagram". There is no such picture. Skip the segment, or ask for the
  apparatus: "hydrogen combustion experiment".
- "calcium carbonate decomposes when heated, used in cement"
  -> NOT "calcium carbonate decomposition diagram"
  -> YES "limestone rock" or "cement kiln"
- "respiration releases energy from glucose"
  -> NOT "respiration reaction diagram"
  -> YES "cellular respiration mitochondria diagram"
- "burning of natural gas is exothermic" -> YES "natural gas stove flame"
- "vegetable matter decomposes into compost" -> YES "compost heap"

If a segment teaches only equations or definitions and mentions no real object,
place or standard diagram, LEAVE IT OUT. Returning an empty list is a correct
and useful answer - a lesson with no picture is much better than a lesson with
a picture that does not match what is being said.

Write "query" as 2 to 6 words naming the thing. Say "diagram", "labelled" or
"cross section" when a diagram is what is wanted. Never include words like
lesson, class, student, explain or textbook.

NEVER list the same segment_id twice. A segment shows exactly one picture. If
one segment mentions two picturable things, choose the single better one, or
put the other on a different segment that also mentions it.

Return STRICT JSON and nothing else:
{
  "visuals": [
    {"segment_id": "seg_002", "query": "human heart labelled diagram", "why": "the student must see the chambers"}
  ]
}
"""


def _call_text_llm(system_prompt: str, user_prompt: str,
                   max_tokens: int = 800) -> Optional[str]:
    """A plain (no image) completion, used for planning where visuals go."""
    result = avatar_llm.chat(
        VISION_MODEL, system_prompt, user_prompt,
        max_tokens=max_tokens,
        timeout=VISION_TIMEOUT,
        fallback_model=VISION_FALLBACK_MODEL,
        trace_name="plan-visuals",
    )
    if not result.ok:
        logger.warning(f"[visuals] plan call failed ({VISION_MODEL}): "
                       f"{result.error[:200]}")
        return None
    return result.text


# Mirrors enrichment_pipeline._LEAD_IN_RE. A teaching segment that ends by
# offering the checkpoint after it must KEEP that offer as its last words, so
# anything we add has to go in front of it.
_LEAD_IN_TAIL_RE = re.compile(
    r"\b(question|quiz|quick|test|flash\s?card|card|try|ready|shall\s+(?:we|i)|"
    r"show\s+you|example|check|have\s+a\s+go)\b", re.I)


def _insert_spoken(text: str, addition: str) -> str:
    """Add spoken words to a segment without stepping on its closing hand-over.

    Most segments simply gain the new sentences at the end. A segment that ends
    by offering the next flashcard is different: that offer has to stay last, or
    the avatar invites the student to a question and then carries on talking.
    """
    text = (text or "").strip()
    addition = (addition or "").strip()
    if not addition:
        return text
    if not text:
        return addition

    sentences = re.split(r"(?<=[.!?])\s+", text)
    last = sentences[-1]
    if last.endswith("?") and _LEAD_IN_TAIL_RE.search(last):
        body = " ".join(sentences[:-1]).strip()
        return f"{body} {addition} {last}".strip()
    return f"{text} {addition}"


def plan_segment_visuals(segments: List[Dict[str, Any]],
                         section_title: str = "",
                         unit_title: str = "",
                         subject: str = "",
                         class_number: str = "",
                         max_visuals: int = 2,
                         source_text: str = "") -> List[Dict[str, str]]:
    """Ask which teaching segments deserve a picture, and what to search for.

    ``source_text`` is the section's own textbook content. When supplied, every
    query is checked against it and an ungrounded one is DROPPED - see
    _query_is_grounded. Without that check the planner's licence to substitute
    a "real-world anchor" lets it wander off the section entirely.

    Falls back to the longest teaching segment when the planner is unavailable,
    so a lesson still gets one visual rather than none.
    """
    teaching = [s for s in segments
                if isinstance(s, dict) and s.get("type") != "flashcard"
                and (s.get("text") or "").strip()]
    if not teaching:
        return []

    listing = "\n".join(
        f"[{s.get('segment_id') or f'seg_{i:03d}'}] {(s.get('text') or '')[:400]}"
        for i, s in enumerate(teaching, start=1)
    )
    who = f"Class {class_number}" if class_number else "school"
    user = (
        f"STUDENT: a {who} student"
        + (f" studying {subject}" if subject else "")
        + f"\nUNIT: {unit_title}\nSECTION: {section_title}\n\n"
        f"TEACHING SEGMENTS:\n{listing}\n\n"
        f"Choose AT MOST {max_visuals} segment(s) that need a picture. "
        f"Fewer is fine. Return the JSON."
    )

    raw = _call_text_llm(_VISUAL_PLAN_PROMPT, user)
    parsed = _parse_json(raw)
    plan: List[Dict[str, str]] = []
    valid_ids = {s.get("segment_id") for s in teaching}
    chosen: set = set()

    for item in (parsed or {}).get("visuals", []) or []:
        if not isinstance(item, dict):
            continue
        seg_id = str(item.get("segment_id") or "").strip()
        query = str(item.get("query") or "").strip()
        if not query or seg_id not in valid_ids:
            continue
        # The grounding gate. A section is checked against its own text plus
        # its titles, because a section legitimately illustrates what its
        # heading names even when the body does not repeat it.
        if not _query_is_grounded(query, f"{source_text}\n{section_title}\n{unit_title}"):
            logger.info(f"[visuals] dropped ungrounded query {query!r} for {seg_id} "
                        f"- not raised by section '{section_title}'")
            continue
        # One picture per segment. A segment can only display one image, so two
        # plan entries for the same id means the second overwrites the first
        # while BOTH spoken explanations get appended - the avatar then says
        # "look at this compost heap" over a picture of a cement kiln.
        if seg_id in chosen:
            logger.info(f"[visuals] planner picked {seg_id} twice - keeping the "
                        f"first query and dropping '{query}'")
            continue
        chosen.add(seg_id)
        plan.append({"segment_id": seg_id, "query": query,
                     "why": str(item.get("why") or "").strip()})
        if len(plan) >= max_visuals:
            break

    # An empty plan from a planner that ANSWERED is a real decision: this
    # section teaches equations and definitions with nothing photographable in
    # it. Overriding that with a guess is how a chemistry lesson ends up
    # searching for "water formation reaction diagram" and finding nothing.
    # Only guess when the planner never answered at all.
    if not plan and parsed is None:
        longest = max(teaching, key=lambda s: len(s.get("text") or ""))
        query = build_visual_query(longest.get("text", ""), section_title, unit_title)
        if query:
            plan.append({"segment_id": longest.get("segment_id", ""),
                         "query": query, "why": "fallback: planner unavailable"})
    elif not plan:
        logger.info(f"[visuals] planner found nothing worth picturing in "
                    f"'{section_title}' — teaching text only")
    return plan


def attach_visuals_to_segments(segments: List[Dict[str, Any]],
                               *,
                               section_title: str = "",
                               unit_title: str = "",
                               board: str = "",
                               class_number: str = "",
                               subject: str = "",
                               unit_number: int = 0,
                               max_visuals: Optional[int] = None,
                               source_text: str = "") -> int:
    """Give an avatar lesson its pictures. Mutates ``segments``. Returns the count.

    Each chosen segment gains:
      * ``visual``  - the S3 image and its provenance, for the player to show
      * spoken text - the avatar's explanation of the picture, appended to the
                      segment's own ``text``

    The explanation goes INTO ``text`` rather than into a field of its own for
    the same reason the checkpoint hand-over does: ``text`` is what the player
    speaks and what enrichment-time TTS already voices, so the avatar explains
    the picture for free. A separate field would need a live TTS call at play
    time and would silently stay unspoken on any client that only reads ``text``.

    Every step degrades to "no picture": a lesson without visuals is fine, a
    lesson with a wrong or watermarked picture is not.
    """
    if not is_enabled() or not segments:
        return 0

    limit = max_visuals if max_visuals is not None else int(
        os.getenv("AVATAR_VISUALS_PER_SECTION", "2"))
    if limit <= 0:
        return 0

    by_id = {s.get("segment_id"): s for s in segments if isinstance(s, dict)}
    plan = plan_segment_visuals(segments, section_title, unit_title,
                                subject, class_number, limit,
                                source_text=source_text)

    # One list shared by every slot: find_visual appends what it judged, so the
    # second picture never re-checks the first one's rejects.
    attached, used_origins = 0, []
    for item in plan:
        segment = by_id.get(item["segment_id"])
        if segment is None:
            continue
        # Belt and braces on the planner's de-duplication: a segment that
        # already has a picture must never be given a second one, or its text
        # ends up narrating an image the student cannot see.
        if segment.get("visual"):
            continue
        visual = find_visual(
            item["query"],
            teaching_text=segment.get("text", ""),
            section_title=section_title,
            unit_title=unit_title,
            board=board,
            class_number=class_number,
            subject=subject,
            unit_number=unit_number,
            exclude_urls=used_origins,
        )
        if not visual:
            continue

        # find_visual already recorded this one on used_origins as it judged it.
        visual["planned_because"] = item.get("why", "")
        segment["visual"] = visual

        spoken = visual["avatar_line"]
        if visual.get("look_prompt"):
            spoken = f"{spoken} {visual['look_prompt']}"
        segment["text"] = _insert_spoken(segment.get("text", ""), spoken)
        # Tells the player the avatar has ASKED the student something here and
        # is waiting. A player that implements /avatar/visual/observe (or the
        # walkthrough endpoints) pauses; one that does not can ignore the flag
        # and read straight on, because the question is already inside `text`
        # and gets spoken either way.
        #
        # It is configurable because that only holds for a player that treats
        # the flag as advisory. A client that BLOCKS on it without offering any
        # way to answer would strand the lesson mid-section, so a deployment
        # whose front end cannot answer should set
        # AVATAR_VISUALS_AWAIT_OBSERVATION=false and get non-blocking pictures.
        segment["awaits_observation"] = (bool(visual.get("look_prompt"))
                                         and _await_observation_enabled())
        attached += 1

    if attached:
        logger.info(f"[visuals] attached {attached} picture(s) to '{section_title}'")
    return attached
