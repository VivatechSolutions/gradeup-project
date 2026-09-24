"""
Stage 4 — Enrichment Agent (per-unit, runs in parallel fan-out)

Builds the six-phase avatar lesson (hook -> explanation -> real_world ->
explore -> mystery -> explain_back) for every section the subject's lesson
pattern covers — the same build ``/avatar/lesson/section`` runs on one section
and ``/avatar/lesson/build`` runs on a stored document — with generated
pictures and narration, and returns the unit in the enriched.json shape.

Only a SECTION gets a lesson. ``eligible_sections`` decides which (science /
social science: introduction + section, maths: section, English: prose, poem,
supplementary); an exercise, an activity, a definition box or a figure caption
is taught inside the section it belongs to, never enriched on its own.

Every finished section is also written into ``outputs/<doc_id>/enriched.json``
right away, so a crash or a gateway timeout keeps what was built and
``/avatar/lesson/build`` (without ``force``) can finish the rest.
"""

from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from logger import get_logger

logger = get_logger(__name__)

# Units are enriched in parallel and each one checkpoints into the same
# enriched.json; the read-modify-write has to be one step.
_CHECKPOINT_LOCK = threading.Lock()


def _unit_label(unit: Dict[str, Any]) -> str:
    return str(unit.get("title") or unit.get("chapter_name")
               or unit.get("chapter_title") or "").strip()


def _checkpoint(doc_dir: Optional[Path], enriched_head: Dict[str, Any],
                target: Dict[str, Any], enrichment: Dict[str, Any]) -> None:
    """Write one built section into enriched.json now, under the lock."""
    if doc_dir is None:
        return
    from datetime import datetime, timezone

    from avatar_lesson_builder import _load_json, upsert_section
    from enrichment_pipeline import save_json

    path = doc_dir / "enriched.json"
    with _CHECKPOINT_LOCK:
        enriched = (_load_json(path) if path.exists() else None) or {}
        for key, value in enriched_head.items():
            enriched.setdefault(key, value)
        upsert_section(enriched, target, enrichment)
        enriched["enriched_at"] = datetime.now(timezone.utc).isoformat()
        doc_dir.mkdir(parents=True, exist_ok=True)
        save_json(enriched, path)


# ── LangGraph Node ────────────────────────────────────────────────────────────

def enrich_unit_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stage 4 — per-unit lesson build (runs concurrently via Send fan-out).

    Reads from state (fan-out): target_unit, subject, api_key, board,
        class_number, doc_id
    Writes (via reducer):       enriched_data, enrichment_reports,
                                tts_audio_s3_urls
    """
    from datetime import datetime, timezone

    import avatar_lesson_patterns as lesson_patterns
    from avatar_lesson_builder import _lesson_model, build_section_lesson, lesson_extras, upsert_section

    unit         = state["target_unit"]
    subject      = state.get("subject", "unknown")
    api_key      = state.get("api_key", "")
    board        = str(state.get("board", "") or "")
    class_number = str(state.get("class_number", "") or "")
    doc_id       = state.get("doc_id") or ""

    unit_num   = unit.get("unit_number") or unit.get("chapter_number", 1)
    unit_title = _unit_label(unit)
    is_math    = lesson_patterns.normalize_subject(subject) == "mathematics"
    # The same key the extraction stage used, so the reducer merges like with like.
    units_key  = ("chapters" if "chapters" in (state.get("structured_data") or {})
                  else "chapters" if is_math else "units")
    label      = f"Unit {unit_num} '{unit_title}'" if unit_title else f"Unit {unit_num}"

    if not api_key:
        logger.warning(f"{label}: no API key — no avatar lessons built")
        return {
            "enriched_data":     {units_key: [unit]},
            "enrichment_reports": [{"unit_number": unit_num, "skipped": True}],
            "tts_audio_s3_urls": {},
        }

    # ── Which sections get a lesson ──────────────────────────────────────────
    targets = lesson_patterns.eligible_sections({units_key: [unit]}, subject)
    all_sections = [s for s in (unit.get("sections") or []) if isinstance(s, dict)]
    lesson_titles = [t["section_title"] for t in targets]
    chosen = {id(t["section"]) for t in targets}
    passed_over = [
        f"{str(s.get('title') or s.get('id') or s.get('type') or '?')[:36]} ({s.get('type') or 'section'})"
        for s in all_sections if id(s) not in chosen
    ]
    logger.info(
        f"{label}: {len(targets)} of {len(all_sections)} top-level block(s) get an avatar "
        f"lesson (subject={subject}) — {', '.join(lesson_titles) or 'none'}"
    )
    if passed_over:
        logger.info(
            f"{label}: no lesson of their own for {len(passed_over)} block(s) — exercises, "
            f"boxes and figures are taught inside their section — "
            f"{', '.join(passed_over[:8])}{' …' if len(passed_over) > 8 else ''}"
        )

    doc_dir = None
    if doc_id:
        from config import OUTPUTS_DIR
        doc_dir = Path(OUTPUTS_DIR) / doc_id
    enriched_head = {
        "document_id": doc_id,
        "enriched_at": datetime.now(timezone.utc).isoformat(),
        "enrichment_model": _lesson_model(),
        "enrichment_style": "avatar_classroom_teaching",
        "subject": subject, "board": board, "class_number": class_number,
    }
    enriched_doc: Dict[str, Any] = {**enriched_head, units_key: []}
    unit_shell = {"unit_number": unit_num, "title": unit_title, "subject": subject, "sections": []}
    if "chapter_number" in unit:
        unit_shell["chapter_number"] = unit["chapter_number"]
    if unit.get("part"):
        unit_shell["part"] = unit["part"]
    enriched_doc[units_key].append(unit_shell)

    if not targets:
        logger.warning(f"{label}: nothing to teach — no section the lesson pattern covers")
        return {
            "enriched_data":     {units_key: [unit_shell]},
            "enrichment_reports": [{"unit_number": unit_num, "sections_enriched": 0,
                                    "sections_total": 0, "audio_files": 0}],
            "tts_audio_s3_urls": {},
        }

    from enrichment_pipeline import EnrichmentOrchestrator
    try:
        orch = EnrichmentOrchestrator(
            fast_mode=True, subject=lesson_patterns.normalize_subject(subject) or subject,
            enrichment_style="avatar_classroom_teaching", api_key=api_key or None)
        orch.enricher.reset_web_cache(enabled=False)
    except Exception as e:  # noqa: BLE001 - a missing key must not crash the graph
        logger.error(f"{label}: the enricher could not be set up ({e}) — no avatar lessons built")
        return {
            "enriched_data":     {units_key: [unit_shell]},
            "enrichment_reports": [{"unit_number": unit_num, "sections_enriched": 0,
                                    "sections_total": len(targets), "audio_files": 0,
                                    "error": str(e)}],
            "tts_audio_s3_urls": {},
        }

    # ── One section at a time: plan, script, pictures, narration, store ──────
    built: List[Dict[str, Any]] = []
    failed: List[str] = []
    audio_files = 0
    images = 0
    unit_started = time.perf_counter()
    for i, target in enumerate(targets, 1):
        title = target["section_title"]
        tag = f"{label} — section {i}/{len(targets)} '{title}'"
        folded = target.get("folded") or []
        logger.info(
            f"[enrich] {tag}: building the lesson ({target['section_kind']}, "
            f"{len(target['content']):,} chars"
            + (f", teaching {len(folded)} box(es) inside it: "
               f"{', '.join(x[:28] for x in folded[:4])}{' …' if len(folded) > 4 else ''}" if folded else "")
            + ") — plan, teaching script, pictures, then narration"
        )
        try:
            enrichment = build_section_lesson(
                target["content"], title, section=target["section"], pattern=target["pattern"],
                enricher=orch.enricher, subject=subject, section_kind=target["section_kind"],
                part=target["part"], unit_title=target["unit_title"], board=board,
                class_number=class_number, unit_number=target["unit_number"] or 0,
                covers=folded, **lesson_extras(target),
            )
        except Exception as e:  # noqa: BLE001 - one bad section must not end the unit
            logger.exception(f"[enrich] {tag}: crashed — {e}")
            enrichment = None
        if not enrichment:
            failed.append(title)
            logger.error(f"[enrich] {tag}: NO lesson — the teaching script failed twice")
            continue

        report = enrichment.get("_build_report") or {}
        audio = report.get("audio") or {}
        rendered = int(audio.get("files_rendered") or 0)
        audio_files += rendered
        images += int(report.get("images") or 0)
        upsert_section(enriched_doc, target, enrichment)
        try:
            _checkpoint(doc_dir, enriched_head, target, enrichment)
        except Exception as e:  # noqa: BLE001 - the state still carries it
            logger.warning(f"[enrich] {tag}: could not checkpoint enriched.json ({e})")
        built.append({"section_title": title, **{k: v for k, v in report.items() if k != "section_title"}})
        audio_note = (f"{rendered} audio file(s) in {audio.get('seconds', '?')}s"
                      if rendered else f"no audio ({audio.get('skipped') or 'nothing rendered'})")
        logger.info(
            f"[enrich] {tag}: stored — {report.get('seconds')}s, phases={report.get('phases')}, "
            f"{report.get('segments')} segment(s), {report.get('images')} picture(s) "
            f"{report.get('images_by_phase')}, {audio_note}"
        )

    # ── Report ───────────────────────────────────────────────────────────────
    enriched_unit = enriched_doc[units_key][0]
    audio_urls: Dict[str, str] = {}
    for sec in enriched_unit.get("sections", []):
        holder = sec.get("section_enrichment" if is_math else "enrichment") or {}
        lesson = lesson_patterns.lesson_of(holder)
        if not lesson:
            continue
        for node in lesson_patterns.iter_spoken_nodes(lesson):
            for voice, url in (node.get("audio") or {}).items():
                if url:
                    audio_urls[f"{node.get('segment_id') or node.get('card_id') or 'node'}_{voice}"] = url

    if failed:
        logger.error(
            f"{label}: {len(failed)} of {len(targets)} section(s) have NO avatar lesson — "
            f"{', '.join(failed[:6])}{' …' if len(failed) > 6 else ''}"
        )
    logger.info(
        f"{label}: {len(built)} of {len(targets)} section(s) enriched in "
        f"{time.perf_counter() - unit_started:.0f}s — {images} picture(s), "
        f"{audio_files} audio file(s)"
    )

    return {
        "enriched_data": {units_key: [enriched_unit]},
        "enrichment_reports": [{
            "unit_number":       unit_num,
            "sections_enriched": len(built),
            "sections_total":    len(targets),
            "sections_failed":   failed,
            "images":            images,
            "audio_files":       audio_files,
            "sections":          built,
        }],
        "tts_audio_s3_urls": audio_urls,
    }
