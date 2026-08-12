"""
Free web-search + scrape source for the PPT co-pilot.

Self-hosted alternative to a paid search API (Tavily etc.):
  - SearXNG  (Docker, :8081) meta-searches Google/Bing/DDG and returns JSON.
  - Crawl4AI (Docker, :8001) renders JS and returns clean markdown per URL.

Two entry points, both degrade gracefully (any failure -> [] / empty, never raises):

  web_context(query, top_k) -> (chunks, stats)
      SearXNG search -> top-K result URLs -> Crawl4AI markdown -> chunk dicts.
      Chunk shape matches ppt_rag.retrieve_context() so it drops into the same
      ppt_review.llm_* calls:  {"content", "metadata": {...}, "score"}.

  image_search(query, top_k) -> [ {"url", "title", "source"} ]
      SearXNG image category. Results are shown in the CHAT only — never inserted
      into the deck.

Config (see .env / docker-compose.yml):
  WEB_SEARCH_ENABLED, SEARXNG_URL, CRAWL4AI_URL,
  WEB_SEARCH_TOP_K, IMAGE_SEARCH_TOP_K, WEB_SEARCH_TIMEOUT,
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME, AWS_REGION
"""

import uuid
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import requests

# ── config ────────────────────────────────────────────────────────────────────
SEARXNG_URL = os.getenv("SEARXNG_URL", "http://localhost:8081").rstrip("/")
CRAWL4AI_URL = os.getenv("CRAWL4AI_URL", "http://localhost:8001").rstrip("/")
# Crawl4AI 0.9.x binds loopback-only until a token is set; the token is then required
# on every request AND unlocks external binding (see docker-compose.yml).
CRAWL4AI_TOKEN = os.getenv("CRAWL4AI_API_TOKEN", "")
WEB_SEARCH_TOP_K = int(os.getenv("WEB_SEARCH_TOP_K", "3"))
IMAGE_SEARCH_TOP_K = int(os.getenv("IMAGE_SEARCH_TOP_K", "6"))
WEB_SEARCH_TIMEOUT = int(os.getenv("WEB_SEARCH_TIMEOUT", "20"))
# Optional: re-host found images on S3 so the chat gets stable URLs (SearXNG hotlinks
# can break on referrer checks). Falls back to the original source URL when S3 is not
# configured. Images are stored under  ppt-search/{uuid}.{ext}  in the existing bucket.
try:
    import sys as _sys
    import os as _os
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
    from s3_storage import upload_image_to_s3, S3_AVAILABLE as _S3_AVAILABLE
except Exception:
    _S3_AVAILABLE = False
    def upload_image_to_s3(*a, **kw): return None  # type: ignore

# Cap per-page markdown so a single long article can't blow the LLM context budget.
_MAX_CHARS_PER_PAGE = 4000


def is_enabled() -> bool:
    """Feature flag — callers should gate web calls on this."""
    return os.getenv("WEB_SEARCH_ENABLED", "false").strip().lower() in ("1", "true", "yes")


# ── SearXNG ───────────────────────────────────────────────────────────────────
def _searxng(query: str, top_k: int, categories: str = "general") -> List[Dict[str, Any]]:
    """Return raw SearXNG result dicts (already sliced to top_k). [] on any failure.

    SearXNG's upstream engines (Bing/Google/DDG) intermittently return nothing when
    rate-limited, so an empty result is retried once before giving up.
    """
    for attempt in (1, 2):
        try:
            resp = requests.get(
                f"{SEARXNG_URL}/search",
                params={"q": query, "format": "json", "categories": categories},
                timeout=WEB_SEARCH_TIMEOUT,
            )
            resp.raise_for_status()
            results = resp.json().get("results", []) or []
            if results:
                return results[:top_k]
            if attempt == 1:
                print(f"  [ppt_websearch] SearXNG '{categories}' returned 0 — retrying once")
        except Exception as e:
            print(f"  [ppt_websearch] SearXNG '{categories}' query failed (attempt {attempt}): {e}")
    return []


# ── Crawl4AI ──────────────────────────────────────────────────────────────────
def _crawl_headers() -> Dict[str, str]:
    h = {"Content-Type": "application/json"}
    if CRAWL4AI_TOKEN:
        h["Authorization"] = f"Bearer {CRAWL4AI_TOKEN}"
    return h


def _extract_markdown(payload: Any) -> str:
    """Pull markdown out of a Crawl4AI response, tolerating a few schema shapes."""
    if isinstance(payload, dict):
        # /md endpoint: {"markdown": "..."} ; some builds nest under "result".
        for key in ("markdown", "markdown_v2", "cleaned_html", "extracted_content"):
            val = payload.get(key)
            if isinstance(val, str) and val.strip():
                return val
        # /crawl endpoint: {"results": [ {"markdown": "..."} ]}
        results = payload.get("results")
        if isinstance(results, list) and results:
            return _extract_markdown(results[0])
        if isinstance(payload.get("result"), dict):
            return _extract_markdown(payload["result"])
    return ""


def _crawl(url: str) -> str:
    """Fetch clean markdown for one URL via Crawl4AI. '' on any failure.

    Tries the lightweight /md endpoint first, then falls back to /crawl. The exact
    API differs across Crawl4AI image versions — adjust here if the pinned image
    changes its contract.
    """
    # Attempt 1: /md (single-URL markdown, newer builds).
    try:
        resp = requests.post(
            f"{CRAWL4AI_URL}/md",
            json={"url": url},
            headers=_crawl_headers(),
            timeout=WEB_SEARCH_TIMEOUT,
        )
        if resp.status_code == 200:
            md = _extract_markdown(resp.json())
            if md:
                return md[:_MAX_CHARS_PER_PAGE]
    except Exception as e:
        print(f"  [ppt_websearch] Crawl4AI /md failed for {url}: {e}")

    # Attempt 2: /crawl (batch endpoint).
    try:
        resp = requests.post(
            f"{CRAWL4AI_URL}/crawl",
            json={"urls": [url]},
            headers=_crawl_headers(),
            timeout=WEB_SEARCH_TIMEOUT,
        )
        resp.raise_for_status()
        md = _extract_markdown(resp.json())
        return md[:_MAX_CHARS_PER_PAGE] if md else ""
    except Exception as e:
        print(f"  [ppt_websearch] Crawl4AI /crawl failed for {url}: {e}")
        return ""


# ── public API ────────────────────────────────────────────────────────────────
def web_context(query: str, top_k: int = None) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Web search -> scrape -> chunk dicts, matching ppt_rag.retrieve_context().

    Returns (chunks, stats) where each chunk is
        {"content": <markdown>, "metadata": {"source_url", "title", "origin": "web"}, "score": float}
    and stats = {"hits": int, "avg_score": float, "source": "web"}.
    """
    top_k = top_k or WEB_SEARCH_TOP_K
    if not query.strip():
        return [], {"hits": 0, "avg_score": 0.0, "source": "web"}

    results = _searxng(query, top_k, categories="general")
    chunks: List[Dict[str, Any]] = []
    for r in results:
        url = r.get("url")
        if not url:
            continue
        md = _crawl(url)
        if not md:
            # Fall back to SearXNG's own snippet so a failed crawl still contributes.
            md = (r.get("content") or "").strip()
        if md:
            chunks.append({
                "content": md,
                "metadata": {
                    "source_url": url,
                    "title": r.get("title") or "",
                    "origin": "web",
                },
                "score": 1.0,
            })

    stats = {"hits": len(chunks), "avg_score": 1.0 if chunks else 0.0, "source": "web"}
    return chunks, stats


# Hosts / patterns that serve UI icons rather than real photos/diagrams — filtered out.
_ICON_HOST_RX = re.compile(
    r"(jsdelivr\.net|devicons?|lucide|iconify|fontawesome|simpleicons|"
    r"unpkg\.com|githubassets|shields\.io|/icons?/)", re.I)


def _is_usable_image(url: str) -> bool:
    """Drop SVGs and known icon CDNs — keep real photos/diagrams for the chat."""
    if not url:
        return False
    low = url.lower().split("?", 1)[0]
    if low.endswith(".svg"):
        return False
    if _ICON_HOST_RX.search(low):
        return False
    return True


# Words that steer image search toward presentation software / commands instead of the
# slide's actual subject — stripped when building an image query. Content-descriptive
# words (diagram, chart, map, structure, labeled, process...) are deliberately KEPT.
_IMG_STOPWORDS = {
    "slide", "slides", "presentation", "presentations", "deck", "ppt", "pptx",
    "powerpoint", "google", "design", "designs", "template", "templates",
    "show", "me", "add", "insert", "put", "give", "want", "need", "please",
    "can", "could", "you", "i", "a", "an", "the", "to", "for", "of", "my",
    "in", "into", "this", "that", "on", "with", "some", "find", "get", "here",
    "picture", "pictures", "pic", "pics", "image", "images", "photo", "photos",
    "about", "regarding", "related", "relating", "and", "or", "is", "are", "it",
    "img", "imgs", "regrading", "regard", "concerning", "relevant", "relevent",
    "fit", "fits", "would", "like", "based", "content", "topic", "good",
}


def s3_configured() -> bool:
    return bool(_S3_AVAILABLE)


# A browser User-Agent — many image hosts 403 non-browser fetchers. We download with
# this User-Agent ourselves, then upload the bytes directly to S3.
_BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
               "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")


def _upload_to_s3(image_url: str) -> Optional[str]:
    """Re-host one image on S3 and return the stable public URL.

    Downloads the image with a browser User-Agent (many hosts block bot fetchers),
    then uploads the raw bytes to S3 under  ppt-search/{uuid}.{ext}.  UUID hex
    guarantees no filename collisions. Returns None on any failure or when S3 is
    not configured, so callers fall back to the original source URL.
    """
    if not _S3_AVAILABLE or not image_url:
        return None
    try:
        img = requests.get(image_url, headers={"User-Agent": _BROWSER_UA},
                           timeout=WEB_SEARCH_TIMEOUT)
        if img.status_code != 200 or not img.content:
            print(f"  [ppt_websearch] S3: source fetch {img.status_code} for {image_url}")
            return None
        # Detect extension from URL (strip query params); default to jpg.
        raw_ext = image_url.rsplit(".", 1)[-1].split("?")[0].lower()
        ext = raw_ext if raw_ext in ("jpg", "jpeg", "png", "webp", "gif") else "jpg"
        s3_key = f"ppt-search/{uuid.uuid4().hex}.{ext}"
        url = upload_image_to_s3(img.content, s3_key)
        if not url:
            print(f"  [ppt_websearch] S3 upload returned None for {image_url}")
        return url
    except Exception as e:
        print(f"  [ppt_websearch] S3 upload failed for {image_url}: {e}")
    return None


def build_image_query(student_msg: str, topic: str = "") -> str:
    """Turn a chat message into a CONTENT image query.

    Strips presentation/command words (so we don't get 'how to add images in Google
    Slides' results) and keeps the subject. Falls back to the chapter `topic` when the
    message has no subject of its own (e.g. 'add a picture' -> the chapter title).
    """
    words = re.findall(r"[a-zA-Z0-9]+", (student_msg or "").lower())
    subject = [w for w in words if w not in _IMG_STOPWORDS]
    if subject:
        return " ".join(subject)
    return (topic or "").strip()


def image_search(query: str, top_k: int = None) -> List[Dict[str, Any]]:
    """Image search for the CHAT (never inserted into the deck).

    Returns [ {"url", "title", "source"} ]. [] on failure / no query. SVG icons and
    known icon-CDN results are filtered out so only real photos/diagrams come back.
    """
    top_k = top_k or IMAGE_SEARCH_TOP_K
    if not query.strip():
        return []

    # Over-fetch so we still have enough after filtering out icon/SVG noise.
    results = _searxng(query, top_k * 3, categories="images")
    images: List[Dict[str, Any]] = []
    for r in results:
        # SearXNG images expose the full-size image under img_src (thumbnail_src for the thumb).
        url = r.get("img_src") or r.get("url")
        if not _is_usable_image(url):
            continue
        # Re-host on S3 (if configured) so the chat gets a stable URL. Only done for the
        # images we actually keep, to limit API calls. Falls back to the source URL.
        hosted = _upload_to_s3(url)
        images.append({
            "url": hosted or url,
            "origin_url": url,
            "hosted": bool(hosted),
            "title": r.get("title") or "",
            "source": r.get("source") or r.get("url") or "",
        })
        if len(images) >= top_k:
            break
    return images
