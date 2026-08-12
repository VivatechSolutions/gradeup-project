"""
Session lifecycle for the seminar PPT co-pilot.

A session ties a student + unit + a specific deck (Google Slides now) to a running agent
thread. Start creates/connects the deck and returns its shareable link; per-edit calls
(/ppt/edit) look the session up for identity so the frontend only sends the change; end
summarizes the accumulated design-skill progress.

Persistence: SQLite (ppt_sessions.db in the project root). Sessions survive server
restarts. TTL is 7 days; stale sessions are cleaned up lazily on start_session calls.
"""

import hashlib
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

# ── SQLite setup ────────────────────────────────────────────────────────────────
_DB_PATH = os.environ.get(
    "PPT_SESSION_DB",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "ppt_sessions.db"),
)
_SESSION_TTL_DAYS = 7


@contextmanager
def _db():
    """Thread-safe SQLite connection with WAL mode."""
    conn = sqlite3.connect(_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _init_db():
    with _db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ppt_sessions (
                session_id     TEXT PRIMARY KEY,
                student_id     TEXT NOT NULL,
                data           TEXT NOT NULL,   -- JSON blob of the whole session dict
                created_at     TEXT NOT NULL,
                updated_at     TEXT NOT NULL
            )
        """)


_init_db()


# ── serialisation helpers ───────────────────────────────────────────────────────

def _load(row) -> Dict[str, Any]:
    return json.loads(row["data"])


def _dump(session: Dict[str, Any]) -> str:
    return json.dumps(session, default=str)


# ── URL helpers ─────────────────────────────────────────────────────────────────

def _slides_urls(presentation_id: str) -> Dict[str, str]:
    base = f"https://docs.google.com/presentation/d/{presentation_id}"
    return {
        "edit_url": f"{base}/edit",
        "embed_url": f"{base}/embed?start=false&loop=false&delayms=3000",
    }


# ── deck creation ───────────────────────────────────────────────────────────────

def create_or_connect_deck(tool: str, deck_ref: Optional[str], title: Optional[str],
                           coords: Optional[Dict[str, Any]] = None,
                           theme_spec: Optional[Dict[str, Any]] = None
                           ) -> Tuple[str, Dict[str, str], str]:
    """
    Return (deck_ref, urls, deck_mode).

    deck_mode is "real" when a live Google Slides deck was created/connected,
    or "stub" when OAuth is unavailable and we synthesise a placeholder ID.
    """
    if tool != "gslides":
        raise ValueError(f"Unsupported tool '{tool}' — supports 'gslides' only")
    coords = coords or {}

    if deck_ref:
        presentation_id = deck_ref.split(":", 1)[1] if ":" in deck_ref else deck_ref
        return f"gslides:{presentation_id}", _slides_urls(presentation_id), "real"

    # Create a new deck.
    try:
        import mcp_slides_client
        if mcp_slides_client.can_create_decks():
            sections = None
            try:
                from ppt.ppt_rag import unit_topics
                sections = unit_topics(coords) or None
            except Exception as e:
                print(f"  [ppt_session] unit_topics failed, generic outline: {e}")
            presentation_id = mcp_slides_client.create_and_scaffold(
                title, coords.get("unit"), sections, theme_spec)
            return f"gslides:{presentation_id}", _slides_urls(presentation_id), "real"
    except Exception as e:
        print(f"  [ppt_session] deck creation failed, using stub id: {e}")

    presentation_id = "STUB-" + uuid.uuid4().hex[:12]
    return f"gslides:{presentation_id}", _slides_urls(presentation_id), "stub"


# ── session lifecycle ───────────────────────────────────────────────────────────

def _cleanup_stale():
    """Delete sessions older than TTL (called lazily)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=_SESSION_TTL_DAYS)).isoformat()
    try:
        with _db() as conn:
            conn.execute("DELETE FROM ppt_sessions WHERE created_at < ?", (cutoff,))
    except Exception as e:
        print(f"  [ppt_session] stale-session cleanup failed: {e}")


def start_session(student_id: str, board: str, class_number: str, unit: int, title: str,
                  subject: Optional[str] = None, deck_ref: Optional[str] = None,
                  tool: str = "gslides", term: Optional[str] = None) -> Dict[str, Any]:
    """Create a co-pilot session and its deck link."""
    _cleanup_stale()

    session_id = uuid.uuid4().hex
    # `term` joins the coords so every later turn of this session inherits the
    # same RAG scope without the frontend resending it.
    from term_utils import normalize_term
    coords = {
        "board": board, "class_number": class_number, "subject": subject,
        "unit": unit, "unit_title": title, "term": normalize_term(term),
    }

    # Agent chooses deck design once, from class + subject + topic.
    try:
        from ppt.ppt_design import llm_choose_theme
        theme_spec = llm_choose_theme(board, class_number, subject, title)
    except Exception as e:
        print(f"  [ppt_session] llm_choose_theme failed, using default: {e}")
        from ppt.ppt_theme import DEFAULT_THEME_SPEC
        theme_spec = dict(DEFAULT_THEME_SPEC)

    full_ref, urls, deck_mode = create_or_connect_deck(tool, deck_ref, title, coords, theme_spec)

    now = datetime.now(timezone.utc).isoformat()
    session: Dict[str, Any] = {
        "session_id": session_id,
        "student_id": student_id,
        "deck_ref": full_ref,
        "tool": tool,
        "title": title,
        "deck_mode": deck_mode,                 # "real" | "stub"
        **coords,                               # board, class_number, subject, unit, unit_title, term
        "theme_spec": theme_spec,
        "created_at": now,
        "ended_at": None,
        "edits": 0,
        "skill_totals": {},
        "urls": urls,
        "deck_created": deck_ref is None,       # True when we made a fresh deck
        # ── upgrade fields ─────────────────────────────────────────────────────
        "slide_status": {},                     # {str(slide_index): "pending"|"reviewed"|"approved"|"skipped"}
        "rejection_count": 0,                   # cumulative HITL rejections this session
        "spell_cache": {},                      # {str(slide_index): md5_of_text}
        "rag_stats": {"hits": 0, "misses": 0, "total_score": 0.0, "calls": 0},
        "all_slide_titles": [],                 # populated after deck creation by the agent
        "used_layouts": {},                     # {str(slide_index): layout_kind} for design variety
    }

    with _db() as conn:
        conn.execute(
            "INSERT INTO ppt_sessions (session_id, student_id, data, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (session_id, student_id, _dump(session), now, now),
        )
    return session


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    with _db() as conn:
        row = conn.execute(
            "SELECT data FROM ppt_sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
    return json.loads(row["data"]) if row else None


def _save_session(session: Dict[str, Any]) -> None:
    """Persist a mutated session dict back to SQLite."""
    now = datetime.now(timezone.utc).isoformat()
    with _db() as conn:
        conn.execute(
            "UPDATE ppt_sessions SET data = ?, updated_at = ? WHERE session_id = ?",
            (_dump(session), now, session["session_id"]),
        )


# ── skill / edit tracking ───────────────────────────────────────────────────────

def record_skill(session_id: str, skill_delta: Optional[Dict[str, float]]) -> None:
    """Accumulate one edit's skill_delta into the session running totals."""
    session = get_session(session_id)
    if not session:
        return
    session["edits"] += 1
    for skill, delta in (skill_delta or {}).items():
        session["skill_totals"][skill] = round(
            session["skill_totals"].get(skill, 0.0) + delta, 3)
    _save_session(session)


def update_slide_status(session_id: str, slide_index: int, status: str) -> None:
    """
    Mark a slide's review status.
    status must be one of: "pending", "reviewed", "approved", "skipped".
    """
    session = get_session(session_id)
    if not session:
        return
    session["slide_status"][str(slide_index)] = status
    _save_session(session)


def record_rejection(session_id: str) -> None:
    """Increment the cumulative HITL rejection counter for the session."""
    session = get_session(session_id)
    if not session:
        return
    session["rejection_count"] = session.get("rejection_count", 0) + 1
    _save_session(session)


# ── pending approval (single-endpoint HITL: approve in the same chat) ─────────

def set_pending_approval(session_id: str, proposal: Dict[str, Any]) -> None:
    """Mark that this session paused awaiting the student's approval, and remember
    the proposed change so the next chat turn can re-show it if the reply is unclear."""
    session = get_session(session_id)
    if not session:
        return
    session["awaiting_approval"] = True
    session["pending_proposal"] = proposal
    _save_session(session)


def clear_pending_approval(session_id: str) -> None:
    """Clear the awaiting-approval flag once the student has decided."""
    session = get_session(session_id)
    if not session:
        return
    session["awaiting_approval"] = False
    session["pending_proposal"] = None
    _save_session(session)


# ── spelling cache ───────────────────────────────────────────────────────────────

def _text_hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8", errors="replace")).hexdigest()


def get_spell_cache(session_id: str, slide_index: int) -> Optional[str]:
    """Return the cached MD5 hash of the last spell-checked text for this slide, or None."""
    session = get_session(session_id)
    if not session:
        return None
    return session.get("spell_cache", {}).get(str(slide_index))


def update_spell_cache(session_id: str, slide_index: int, text: str) -> None:
    """Store the MD5 of the slide's current text so future identical calls can be skipped."""
    session = get_session(session_id)
    if not session:
        return
    session.setdefault("spell_cache", {})[str(slide_index)] = _text_hash(text)
    _save_session(session)


def compute_text_hash(text: str) -> str:
    """Public helper: compute MD5 of a slide's text for cache comparison."""
    return _text_hash(text)


# ── RAG quality logging ──────────────────────────────────────────────────────────

def record_rag_stat(session_id: str, hits: int, avg_score: float) -> None:
    """Accumulate one retrieve_context call's stats into the session rag_stats."""
    session = get_session(session_id)
    if not session:
        return
    stats = session.setdefault("rag_stats", {"hits": 0, "misses": 0, "total_score": 0.0, "calls": 0})
    stats["calls"] += 1
    if hits > 0:
        stats["hits"] += hits
        stats["total_score"] += avg_score * hits
    else:
        stats["misses"] += 1
    _save_session(session)


def record_layout(session_id: str, slide_index: int, kind: str) -> None:
    """Remember which layout kind a slide now uses, so other slides pick a different design."""
    if not kind:
        return
    session = get_session(session_id)
    if not session:
        return
    session.setdefault("used_layouts", {})[str(slide_index)] = kind
    _save_session(session)


def layouts_used_elsewhere(session_id: str, slide_index: int) -> List[str]:
    """Distinct layout kinds used on slides OTHER than slide_index (for design variety)."""
    session = get_session(session_id) or {}
    used = session.get("used_layouts", {}) or {}
    return sorted({k for idx, k in used.items() if idx != str(slide_index) and k})


def update_slide_titles(session_id: str, titles: List[str]) -> None:
    """Store the full list of slide titles for cross-slide context awareness."""
    session = get_session(session_id)
    if not session:
        return
    session["all_slide_titles"] = titles
    _save_session(session)


# ── session end ──────────────────────────────────────────────────────────────────

def end_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Finalize the session and return its summary (None if unknown)."""
    session = get_session(session_id)
    if not session:
        return None
    session["ended_at"] = datetime.now(timezone.utc).isoformat()
    _save_session(session)

    # Compute average RAG score for the summary.
    rs = session.get("rag_stats", {})
    total_hits = rs.get("hits", 0)
    avg_rag_score = round(rs["total_score"] / total_hits, 3) if total_hits else 0.0

    # Slide progress summary.
    slide_status = session.get("slide_status", {})
    reviewed_count = sum(1 for s in slide_status.values() if s in ("reviewed", "approved"))

    return {
        "session_id": session_id,
        "student_id": session["student_id"],
        "unit": session["unit"],
        "deck_ref": session["deck_ref"],
        "deck_mode": session.get("deck_mode", "real"),
        "title": session["title"],
        "edits": session["edits"],
        "skill_totals": session["skill_totals"],
        "urls": session["urls"],
        "created_at": session["created_at"],
        "ended_at": session["ended_at"],
        # ── upgrade summaries ─────────────────────────────────────────────
        "slide_status": slide_status,
        "slides_reviewed": reviewed_count,
        "rejection_count": session.get("rejection_count", 0),
        "rag_stats": {
            "total_hits": total_hits,
            "total_misses": rs.get("misses", 0),
            "avg_score": avg_rag_score,
            "calls": rs.get("calls", 0),
        },
    }
