"""
Text helpers shared by the avatar engine and the lesson builder.

These used to be private classmethods on ``AvatarEngine``. The lesson builder
needs the same three things at enrichment time - the teaching a checkpoint
tests, and the repeat-question check that keeps a pool of cards or questions
from re-asking one idea - so they live here and both modules import them
rather than carrying two copies that would drift apart.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Optional

# Question scaffolding that says nothing about the concept being asked. Two
# questions that share only these words are not repeats of each other.
_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "of", "in", "on", "at", "to", "for", "from", "by", "with", "as",
    "and", "or", "but", "if", "then", "than", "that", "this", "these",
    "those", "it", "its", "which", "who", "whom", "whose", "what",
    "when", "where", "why", "how", "do", "does", "did", "can", "could",
    "will", "would", "should", "may", "might", "must", "have", "has",
    "had", "you", "your", "we", "our", "they", "their", "he", "she",
    "following", "best", "describes", "called", "known", "term", "one",
    "correct", "true", "false", "statement", "option", "example",
}


def normalize_question(question: Any) -> str:
    """Loose key for comparing two questions ('Why are leaves green?' == 'why are leaves green')."""
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", str(question or "").lower())).strip()


def content_tokens(question: Any) -> set:
    """Meaning-carrying, crudely stemmed words of a question.

    Comparing raw words makes two questions on DIFFERENT concepts look alike
    ("what is a combination reaction" vs "what is a decomposition reaction"
    share 4 of 5 words) while missing real repeats that swap a verb form
    ("substances combine" vs "substances combining"). Dropping the question
    scaffolding and stemming the rest fixes both directions.
    """
    tokens = set()
    for word in normalize_question(question).split():
        if word in _STOPWORDS or len(word) < 3:
            continue
        for suffix in ("ings", "ing", "ies", "ied", "es", "ed", "s"):
            if word.endswith(suffix) and len(word) - len(suffix) >= 3:
                word = word[: -len(suffix)]
                break
        tokens.add(word)
    return tokens


def is_repeat_question(question: Any, previous: Iterable[Any],
                       threshold: float = 0.6) -> bool:
    """True when ``question`` re-asks something already in ``previous``."""
    norm = normalize_question(question)
    if not norm:
        return True
    tokens = content_tokens(question)
    for earlier in previous:
        if norm == normalize_question(earlier):
            return True
        earlier_tokens = content_tokens(earlier)
        if not tokens or not earlier_tokens:
            continue
        overlap = len(tokens & earlier_tokens) / len(tokens | earlier_tokens)
        if overlap >= threshold:
            return True
    return False


def dedupe_questions(items: List[Dict[str, Any]], key: str = "question",
                     already: Optional[Iterable[Any]] = None,
                     threshold: float = 0.6) -> List[Dict[str, Any]]:
    """Keep the first of every near-duplicate in ``items``, in order.

    ``already`` seeds the comparison with text that is already taken (an
    earlier batch, the hook question), so nothing in the result repeats it.
    """
    seen: List[str] = [str(a) for a in (already or []) if str(a or "").strip()]
    kept: List[Dict[str, Any]] = []
    for item in items:
        text = str((item or {}).get(key) or "").strip()
        if not text or is_repeat_question(text, seen, threshold):
            continue
        seen.append(text)
        kept.append(item)
    return kept


def checkpoint_focus(segments: List[Dict[str, Any]], segment_id: str) -> str:
    """The teaching a checkpoint is meant to test.

    A flashcard segment carries no text of its own - only an id and a type -
    so every checkpoint in a section used to reach the LLM with an identical
    prompt, and the LLM answered it with an identical card. What a checkpoint
    actually covers is the teaching between it and the checkpoint before it,
    so that is what this returns.
    """
    segments = segments or []
    window: List[str] = []
    for seg in segments:
        if seg.get("segment_id") == segment_id:
            break
        if seg.get("type") == "flashcard":
            window = []          # previous checkpoint - start a fresh window
            continue
        text = (seg.get("text") or "").strip()
        if text:
            window.append(f"[{seg.get('segment_id', '')}] {text}")

    if not window:
        # Checkpoint sits before any teaching (or the id was not found) -
        # fall back to the opening segments so there is still something to
        # test, rather than silently handing over the whole lesson.
        window = [f"[{s.get('segment_id', '')}] {s.get('text', '')}"
                  for s in segments[:2] if (s.get("text") or "").strip()]

    return "\n".join(window)


# ── Pictures inside the spoken text ──────────────────────────────────────────
#
# A lesson's explanation carries its pictures INLINE: the teaching writer marks
# the spot with "[image: <scene>]", the builder renders the scene and replaces
# the marker with "[<image_url>]", so the picture pops up mid-sentence exactly
# where the avatar says "let me show you" (user decision 2026-09-17). The URL
# must never be READ ALOUD, so narration strips it with strip_inline_images.

INLINE_IMAGE_RE = re.compile(r"\s*\[\s*(?:image\s*:\s*)?(https?://[^\]\s]+)\s*\]")
# Two kinds of marker: "[image: <scene>]" is rendered as a 3D illustration;
# "[photo: <search query> | <what it must show>]" is a REAL picture found on the
# web (a monument, an inscription, a map) - see avatar_lesson_builder._picture.
IMAGE_MARKER_RE = re.compile(r"\s*\[\s*(?P<kind>image|photo)\s*:\s*(?P<prompt>[^\]]+?)\s*\]", re.IGNORECASE)


def parse_picture_marker(kind: Any, body: Any) -> Dict[str, str]:
    """A marker's body as a picture spec: ``{"source", "prompt", "query"}``.

    ``[image: scene]`` -> generate from the scene. ``[photo: query | must show]``
    -> search with the tag-style query and require the picture to show the
    description; with no "|" the one text is both.
    """
    body = str(body or "").strip()
    if str(kind or "").strip().lower() == "photo":
        query, _, must = body.partition("|")
        query, must = query.strip(), must.strip()
        return {"source": "search", "prompt": must or query, "query": query or must}
    return {"source": "generate", "prompt": body, "query": ""}


def inline_image_urls(text: Any) -> List[str]:
    """The picture URLs folded into a segment's text, in order."""
    return INLINE_IMAGE_RE.findall(str(text or ""))


def tidy_spacing(text: Any) -> str:
    """Collapse the gaps a removed marker leaves ("show you . Look" -> "show you. Look")."""
    out = re.sub(r"\s+([.,;:!?])", r"\1", str(text or ""))
    out = re.sub(r"[ \t]{2,}", " ", out)
    return out.strip()


def strip_inline_images(text: Any) -> str:
    """The segment's text without its inline picture references - what is spoken."""
    return tidy_spacing(INLINE_IMAGE_RE.sub("", str(text or "")))
