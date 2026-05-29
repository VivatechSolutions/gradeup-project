"""
Web Tools for Content Enrichment

Provides utilities to fetch supplementary information from:
- Wikipedia API
- Simple English Wikipedia (for simplified explanations)
- Custom educational resources
"""

import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

import requests
from dotenv import load_dotenv

WIKIPEDIA_API_URL = "https://en.wikipedia.org/api/rest_v1"
SIMPLE_WIKI_API_URL = "https://simple.wikipedia.org/api/rest_v1"
WIKIPEDIA_SEARCH_URL = "https://en.wikipedia.org/w/api.php"
REQUEST_TIMEOUT = 30
RATE_LIMIT_DELAY = 1


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
            print(f"  Warning: Wikipedia search error: {e}")
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
            print(f"  Warning: Wikipedia summary error: {e}")
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
            print(f"  Warning: Simple Wikipedia error: {e}")
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
            print(f"  Warning: Wikipedia links error: {e}")
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


def main():
    """Test the web tools."""
    client = WebToolsClient()
    
    print("Testing Wikipedia search...")
    
    test_queries = [
        "Newton's laws of motion",
        "Photosynthesis",
        "Ohm's law"
    ]
    
    for query in test_queries:
        print(f"\nQuery: {query}")
        summary = client.search_wikipedia(query)
        if summary:
            print(f"Summary: {summary[:200]}...")
        else:
            print("No results found")
        time.sleep(1)
    
    print("\n\nTesting Simple Wikipedia...")
    simple_summary = client.get_simple_wikipedia_summary("Gravity")
    if simple_summary:
        print(f"Simple summary: {simple_summary}")
    
    print("\n\nTesting related topics...")
    related = client.get_related_wikipedia_topics("Physics")
    print(f"Related to Physics: {related}")


if __name__ == "__main__":
    main()
