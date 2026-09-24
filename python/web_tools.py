"""
Web Tools for Content Enrichment

Provides utilities to fetch supplementary information from:
- Wikipedia API
- Simple English Wikipedia (for simplified explanations)
- SearXNG (self-hosted meta-search, see docker-compose.yml) for the exam
  preparation engine, with Wikipedia as the fallback when it is down
- Custom educational resources
"""

import os
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

import requests
from dotenv import load_dotenv
from logger import get_logger

logger = get_logger(__name__)

load_dotenv()

WIKIPEDIA_API_URL = "https://en.wikipedia.org/api/rest_v1"
SIMPLE_WIKI_API_URL = "https://simple.wikipedia.org/api/rest_v1"
WIKIPEDIA_SEARCH_URL = "https://en.wikipedia.org/w/api.php"
REQUEST_TIMEOUT = 30
RATE_LIMIT_DELAY = 1

# docker-compose publishes the SearXNG container on host port 8081 (container
# port 8080); inside the compose network the app reaches it as
# http://searxng:8080. Both come through SEARXNG_URL, so nothing is hardcoded
# to one side of the boundary.
SEARXNG_URL = os.getenv("SEARXNG_URL", "http://localhost:8081").rstrip("/")
SEARXNG_TIMEOUT = int(os.getenv("WEB_SEARCH_TIMEOUT", "20"))
SEARXNG_PROBE_TIMEOUT = 3
SEARXNG_RETRY_SECONDS = int(os.getenv("SEARXNG_RETRY_SECONDS", "60"))  # re-probe after a miss


class WebToolsClient:
    """Client for fetching supplementary information from web sources."""
    
    def __init__(self):
        load_dotenv()
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "GradeUp-Extraction/1.0 (Educational content enrichment)"
        })
    
    def search_wikipedia(self, query: str, sentences: int = 3) -> Optional[str]:
        """Search Wikipedia and return a summary."""
        try:
            search_params = {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "format": "json",
                "srlimit": 1
            }
            
            response = self.session.get(
                WIKIPEDIA_SEARCH_URL,
                params=search_params,
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            
            results = data.get("query", {}).get("search", [])
            if not results:
                return None
            
            title = results[0].get("title", "")
            if not title:
                return None
            
            time.sleep(RATE_LIMIT_DELAY)
            return self.get_wikipedia_summary(title, sentences)
            
        except Exception as e:
            logger.warning(f"Warning: Wikipedia search error: {e}")
            return None
    
    def get_wikipedia_summary(self, title: str, sentences: int = 3) -> Optional[str]:
        """Get summary of a specific Wikipedia article."""
        try:
            encoded_title = quote_plus(title.replace(" ", "_"))
            
            response = self.session.get(
                f"{WIKIPEDIA_API_URL}/page/summary/{encoded_title}",
                timeout=REQUEST_TIMEOUT
            )
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            data = response.json()
            extract = data.get("extract", "")
            
            if not extract:
                return None
            
            if sentences > 0:
                sentence_pattern = r'(?<=[.!?])\s+'
                parts = re.split(sentence_pattern, extract)
                extract = ". ".join(parts[:sentences])
                if not extract.endswith("."):
                    extract += "."
            
            return extract
            
        except Exception as e:
            logger.warning(f"Warning: Wikipedia summary error: {e}")
            return None
    
    def get_simple_wikipedia_summary(self, title: str, sentences: int = 3) -> Optional[str]:
        """Get summary from Simple English Wikipedia (easier to understand)."""
        try:
            encoded_title = quote_plus(title.replace(" ", "_"))
            
            response = self.session.get(
                f"{SIMPLE_WIKI_API_URL}/page/summary/{encoded_title}",
                timeout=REQUEST_TIMEOUT
            )
            
            if response.status_code == 404:
                return self.get_wikipedia_summary(title, sentences)
            
            response.raise_for_status()
            data = response.json()
            extract = data.get("extract", "")
            
            if not extract:
                return None
            
            if sentences > 0:
                sentence_pattern = r'(?<=[.!?])\s+'
                parts = re.split(sentence_pattern, extract)
                extract = ". ".join(parts[:sentences])
                if not extract.endswith("."):
                    extract += "."
            
            return extract
            
        except Exception as e:
            logger.warning(f"Warning: Simple Wikipedia error: {e}")
            return None
    
    def get_related_wikipedia_topics(self, title: str, limit: int = 5) -> List[str]:
        """Get related topics from Wikipedia."""
        try:
            params = {
                "action": "query",
                "titles": title,
                "prop": "links",
                "pllimit": limit * 2,
                "format": "json"
            }
            
            response = self.session.get(
                WIKIPEDIA_SEARCH_URL,
                params=params,
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            
            pages = data.get("query", {}).get("pages", {})
            
            related = []
            for page_id, page_data in pages.items():
                if page_id == "-1":
                    continue
                
                links = page_data.get("links", [])
                for link in links:
                    link_title = link.get("title", "")
                    if link_title and not link_title.startswith(("Wikipedia:", "Help:", "Category:", "Template:")):
                        related.append(link_title)
                        if len(related) >= limit:
                            break
            
            return related[:limit]
            
        except Exception as e:
            logger.warning(f"Warning: Wikipedia links error: {e}")
            return []
    
    def search_scientist_info(self, name: str) -> Optional[Dict[str, Any]]:
        """Search for information about a scientist."""
        summary = self.get_wikipedia_summary(name, sentences=2)
        if not summary:
            return None
        
        return {
            "name": name,
            "summary": summary,
            "source": "Wikipedia"
        }
    
    def batch_search(self, queries: List[str], delay: float = 1.0) -> Dict[str, Optional[str]]:
        """Batch search multiple queries."""
        results = {}

        for query in queries:
            results[query] = self.search_wikipedia(query)
            if delay > 0:
                time.sleep(delay)

        return results


class SearXNGClient:
    """Educational web search over the self-hosted SearXNG JSON API.

    Used ONLY by the exam preparation engine, and only when the question bank
    is too thin for a unit. The main exam never touches this class: its
    questions and grading come from the textbook (Qdrant) alone.

    Every result carries ``"source": "web"`` so the study guide can label
    web-sourced material apart from question-bank and textbook content.

    Fallback chain when SearXNG is unreachable or returns nothing:
        SearXNG -> WebToolsClient.search_wikipedia()
                -> WebToolsClient.get_simple_wikipedia_summary()

    Reachability is probed rather than discovered per query, because the
    search call swallows its own errors: without a separate probe an
    empty-result day and a missing server look identical and every prep call
    pays the connection timeout again. Unlike avatar_visuals, a negative
    probe is NOT sticky for the whole process - it expires after
    SEARXNG_RETRY_SECONDS, so bringing the docker stack up after the API has
    started takes effect without a restart.
    """

    def __init__(self, base_url: str = SEARXNG_URL,
                 wiki_client: Optional[WebToolsClient] = None):
        self.base_url = (base_url or "").rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "GradeUp-ExamPrep/1.0 (Educational content enrichment)"
        })
        self._wiki = wiki_client or WebToolsClient()
        self._reachable: Optional[bool] = None
        self._probed_at: float = 0.0

    # ── Availability ──────────────────────────────────────────────────────────

    def is_reachable(self) -> bool:
        """Whether SearXNG answers. A positive probe is cached; a negative one
        is re-checked once SEARXNG_RETRY_SECONDS have passed."""
        if self._reachable is True:
            return True
        if self._reachable is False and time.monotonic() - self._probed_at < SEARXNG_RETRY_SECONDS:
            return False
        if not self.base_url:
            self._reachable, self._probed_at = False, time.monotonic()
            return False
        try:
            self.session.get(self.base_url, timeout=SEARXNG_PROBE_TIMEOUT)
            self._reachable = True
            logger.info(f"[SearXNG] reachable at {self.base_url}")
        except Exception:
            logger.info(f"[SearXNG] not reachable at {self.base_url} - falling back to Wikipedia "
                        f"(re-checked in {SEARXNG_RETRY_SECONDS}s)")
            self._reachable = False
        self._probed_at = time.monotonic()
        return self._reachable

    # ── Raw search ────────────────────────────────────────────────────────────

    def _search(self, query: str, top_k: int = 5,
                categories: str = "general") -> List[Dict[str, Any]]:
        """Raw SearXNG results, normalised. [] on any failure.

        Upstream engines intermittently return nothing when rate-limited, so
        an empty page is retried once before giving up (mirrors
        ppt/ppt_websearch._searxng).
        """
        if not query.strip() or not self.is_reachable():
            return []

        for attempt in (1, 2):
            try:
                resp = self.session.get(
                    f"{self.base_url}/search",
                    params={"q": query, "format": "json", "categories": categories},
                    timeout=SEARXNG_TIMEOUT,
                )
                resp.raise_for_status()
                raw = resp.json().get("results", []) or []
                if raw:
                    return [self._normalise(r) for r in raw[:top_k]]
                if attempt == 1:
                    logger.warning(f"[SearXNG] '{query[:60]}' returned 0 results - retrying once")
            except requests.ConnectionError as e:
                # The server went away since the probe: forget the positive
                # probe so the next call re-checks instead of timing out twice.
                logger.warning(f"[SearXNG] connection lost: {e}")
                self._reachable, self._probed_at = False, time.monotonic()
                return []
            except Exception as e:
                logger.warning(f"[SearXNG] query failed (attempt {attempt}): {e}")
        return []

    @staticmethod
    def _normalise(r: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": (r.get("title") or "").strip(),
            "snippet": (r.get("content") or "").strip(),
            "url": r.get("url", ""),
            "engine": r.get("engine", ""),
            "source": "web",
        }

    def _wikipedia_fallback(self, topic: str, subject: str = "") -> List[Dict[str, Any]]:
        """Wikipedia, then Simple Wikipedia, when SearXNG has nothing.

        The search carries the subject: a bare unit title such as "Resources
        and Development" lands on the Human-resources article, while
        "Resources and Development geography" finds the right one.
        """
        query = f"{topic} {subject}".strip() if subject else topic
        summary = self._wiki.search_wikipedia(query, sentences=4)
        title = "Wikipedia"
        if not summary:
            summary = self._wiki.get_simple_wikipedia_summary(topic, sentences=4)
            title = "Simple Wikipedia"
        if not summary:
            return []
        return [{
            "title": f"{title}: {topic}",
            "snippet": summary,
            "url": "",
            "engine": "wikipedia",
            "source": "web",
        }]

    def _search_with_fallback(self, query: str, topic: str, subject: str,
                              top_k: int) -> List[Dict[str, Any]]:
        results = self._search(query, top_k=top_k)
        if results:
            return results
        return self._wikipedia_fallback(topic, subject)

    # ── Public API ────────────────────────────────────────────────────────────

    def search_educational_content(self, query: str, subject: str = "",
                                   grade: str = "", top_k: int = 5) -> List[Dict[str, Any]]:
        """Important topics / explanations for a unit, pitched at the class level."""
        parts = [query]
        if subject:
            parts.append(subject)
        if grade:
            parts.append(f"class {grade}")
        parts.append("important topics notes")
        return self._search_with_fallback(" ".join(parts), query, subject, top_k)

    def search_important_questions(self, topic: str, subject: str = "",
                                   board: str = "", top_k: int = 5) -> List[Dict[str, Any]]:
        """Frequently asked exam questions on a topic."""
        parts = [topic]
        if subject:
            parts.append(subject)
        if board:
            parts.append(board)
        parts.append("important questions exam")
        return self._search_with_fallback(" ".join(parts), topic, subject, top_k)

    def search_formulas_theorems(self, topic: str, subject: str = "",
                                 top_k: int = 5) -> List[Dict[str, Any]]:
        """Formulas, theorems and laws for a topic (maths / physics / chemistry)."""
        parts = [topic]
        if subject:
            parts.append(subject)
        parts.append("formulas theorems laws list")
        return self._search_with_fallback(" ".join(parts), topic, subject, top_k)


def main():
    """Test the web tools."""
    client = WebToolsClient()
    
    logger.info("Testing Wikipedia search...")
    
    test_queries = [
        "Newton's laws of motion",
        "Photosynthesis",
        "Ohm's law"
    ]
    
    for query in test_queries:
        logger.info(f"Query: {query}")
        summary = client.search_wikipedia(query)
        if summary:
            logger.info(f"Summary: {summary[:200]}...")
        else:
            logger.info("No results found")
        time.sleep(1)
    
    logger.info("Testing Simple Wikipedia...")
    simple_summary = client.get_simple_wikipedia_summary("Gravity")
    if simple_summary:
        logger.info(f"Simple summary: {simple_summary}")
    
    logger.info("Testing related topics...")
    related = client.get_related_wikipedia_topics("Physics")
    logger.info(f"Related to Physics: {related}")


if __name__ == "__main__":
    main()
