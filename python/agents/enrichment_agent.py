"""
Stage 4 — Enrichment Agent (per-unit, runs in parallel fan-out)
Calls enrich_single_unit() to add avatar scripts, key points, real-world
examples, then _generate_unit_audio() to create TTS audio and upload to S3.
"""

from __future__ import annotations

from typing import Any, Dict


# ── LangGraph Node ────────────────────────────────────────────────────────────

def enrich_unit_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stage 4 — per-unit enrichment (runs concurrently via Send fan-out).

    Reads from state (fan-out): target_unit, subject, api_key,
        board, class_number, enrichment_style
    Writes (via reducer):       enriched_data, enrichment_reports,
                                tts_audio_s3_urls
    """
    unit           = state["target_unit"]
    subject        = state.get("subject", "unknown")
    api_key        = state.get("api_key", "")
    board          = state.get("board", "unknown")
    class_number   = state.get("class_number", "unknown")
    enrich_style   = state.get("enrichment_style", "avatar_classroom_teaching")

    unit_num = unit.get("unit_number") or unit.get("chapter_number", 1)
    print(f"\n  ✨ Enriching Unit {unit_num}: {unit.get('title', '')}")

    if not api_key:
        print(f"  ⚠️  No API key — skipping enrichment for unit {unit_num}")
        units_key = "chapters" if subject in ("mathematics", "maths") else "units"
        return {
            "enriched_data":     {units_key: [unit]},
            "enrichment_reports": [{"unit_number": unit_num, "skipped": True}],
            "tts_audio_s3_urls": {},
        }

    # Step 1: Enrich the unit (avatar scripts, key points, etc.)
    try:
        from enrichment_pipeline import enrich_single_unit
        enriched_unit = enrich_single_unit(
            unit=unit,
            subject=subject,
            api_key=api_key,
            enrichment_style=enrich_style,
        )
    except Exception as e:
        print(f"  ⚠️  enrich_single_unit failed for unit {unit_num}: {e}")
        enriched_unit = unit

    # Step 2: TTS audio generation + S3 upload
    audio_count = 0
    is_math = subject in ("mathematics", "maths")
    try:
        from enrichment_pipeline import _generate_unit_audio
        audio_count = _generate_unit_audio(
            enriched_unit, board, class_number, subject, is_math
        ) or 0
    except Exception as e:
        print(f"  ⚠️  TTS generation failed for unit {unit_num}: {e}")

    # Collect the generated S3 URLs from enriched_unit into a flat Dict
    audio_urls: Dict[str, str] = {}
    for sec in enriched_unit.get("sections", []):
        # Section-level audio
        for key in ("enrichment", "section_enrichment"):
            avatar_exp = sec.get(key, {}).get("avatar_explanation", {})
            for seg in avatar_exp.get("segments", []):
                audio = seg.get("audio", {})
                for voice, url in audio.items():
                    if url:
                        audio_urls[f"{seg.get('segment_id', 'unknown')}_{voice}"] = url
        # Subsection-level audio
        sub_list = sec.get("subsections") or sec.get("sub_sections") or []
        for sub_sec in sub_list:
            for key in ("enrichment", "section_enrichment"):
                avatar_exp = sub_sec.get(key, {}).get("avatar_explanation", {})
                for seg in avatar_exp.get("segments", []):
                    audio = seg.get("audio", {})
                    for voice, url in audio.items():
                        if url:
                            audio_urls[f"{seg.get('segment_id', 'unknown')}_{voice}"] = url

    sections_enriched = len(enriched_unit.get("sections", []))
    print(f"  ✅ Unit {unit_num}: {sections_enriched} section(s) enriched, "
          f"{audio_count} audio file(s) generated")

    units_key = "chapters" if is_math else "units"

    return {
        "enriched_data": {units_key: [enriched_unit]},
        "enrichment_reports": [{
            "unit_number":      unit_num,
            "sections_enriched": sections_enriched,
            "audio_files":      audio_count,
        }],
        "tts_audio_s3_urls": audio_urls,
    }
