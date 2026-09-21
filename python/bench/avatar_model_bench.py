"""
Avatar model benchmark - Gemini vs Llama vs Qwen, on the jobs the avatar does.

Two suites, both driven by the REAL production prompts imported from
avatar_visuals and enrichment_pipeline. Nothing here is a paraphrase: if a
model wins this, it wins the job it will actually be given.

  vision    the picture gate. 14 hand-verified cases (see
            avatar_bench_fixtures) - the model must accept clean English
            teaching diagrams and reject watermarked, off-topic, foreign-
            labelled and unlabelled ones, then write the avatar's spoken line
            for the ones it accepts.

  teaching  the lesson script. Real textbook section text -> an avatar
            teaching script, scored against the structural contract
            enrichment_pipeline depends on (segment counts, flashcard
            placement and types, the ten permitted emotions, the checkpoint
            hand-over) plus how plainly it actually speaks.

Scoring principles
------------------
* A FALSE ACCEPT costs more than a false reject. Letting a watermarked or
  off-topic picture reach a student is the failure the whole gate exists to
  prevent; rejecting a usable image only costs us a picture. So accuracy is
  reported alongside a separately weighted gate score.
* Structure is scored deterministically, not by an LLM judge. The avatar
  player and the enrichment pipeline consume these fields; a script that
  parses and satisfies the contract is worth more than one that reads nicely
  and drops flashcard_type.
* Every model is asked the identical prompt with the identical token budget,
  and cost/latency are reported next to quality, because the vision gate runs
  several times per picture and per section.

Usage
-----
    venv/Scripts/python.exe bench/avatar_model_bench.py --suite vision
    venv/Scripts/python.exe bench/avatar_model_bench.py --suite teaching
    venv/Scripts/python.exe bench/avatar_model_bench.py --suite all --repeat 2
"""

from __future__ import annotations

import argparse
import concurrent.futures as futures
import json
import re
import statistics
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import avatar_llm  # noqa: E402
import avatar_visuals  # noqa: E402
from bench import avatar_bench_fixtures as fixtures  # noqa: E402

RESULTS_DIR = Path(__file__).resolve().parent / "results"

# ── Candidates ───────────────────────────────────────────────────────────────
# One model per family, chosen as the family's practical flash/instruct tier -
# the tier a per-picture, per-section workload can actually afford.
#
# OpenAI is deliberately ABSENT. gpt-4o-mini was the incumbent for both avatar
# modules and was carried here as the baseline to beat, but every call returned
# HTTP 429 credit_balance_exhausted - the account is out of credits, so the
# avatar was failing in production, not merely scoring badly. The project has
# moved off OpenAI entirely; adding it back would only measure a dead key.

VISION_MODELS = [
    ("gemini", "google/gemini-2.5-flash"),
    ("llama", "meta-llama/llama-4-scout"),
    ("qwen", "qwen/qwen3-vl-235b-a22b-instruct"),
]

# Qwen's 235B text model is TEXT-ONLY (it is already this repo's
# EXTRACTION_MODEL), so the teaching suite uses it while the vision suite uses
# the VL variant above. Same family, different modality.
TEACHING_MODELS = [
    ("gemini", "google/gemini-2.5-flash"),
    ("llama", "meta-llama/llama-4-scout"),
    ("qwen", "qwen/qwen3-235b-a22b-2507"),
]


# ==============================================================================
#  VISION SUITE
# ==============================================================================

def _vision_prompt(case: Dict[str, Any]) -> str:
    """Rebuild the exact user prompt avatar_visuals._vision_review sends."""
    who = f"Class {case['class_number']}" if case.get("class_number") else "school"
    prompt = (
        f"STUDENT: a {who} student"
        + (f" studying {case['subject']}" if case.get("subject") else "")
        + f"\nTOPIC BEING TAUGHT: {case['topic']}\n"
    )
    if case.get("teaching_text"):
        prompt += (f"WHAT THE AVATAR IS SAYING AROUND THIS POINT:\n"
                   f"{case['teaching_text'][:900]}\n")
    prompt += "\nJudge the image against the rules, then return the JSON."
    return prompt


# A "look_prompt" is meant to make the student THINK. These ask them to read
# off a surface fact instead, which the production prompt explicitly forbids.
_LAZY_PROMPT_RE = re.compile(
    r"\b(what colou?r|how many|what does the label|which label|what is written|"
    r"can you see|do you see|is there a|what shape is)\b", re.I)

_MARKDOWN_RE = re.compile(r"[*_#`]|^\s*[-•]\s", re.M)
_EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF☀-➿]")


def _score_teaching_lines(verdict: Dict[str, Any]) -> Tuple[float, List[str]]:
    """Quality of the spoken lines a model wrote for an image it accepted.

    Only meaningful on an ACCEPT: these fields are what the avatar says while
    the picture is on screen, so an accept that writes nothing usable is a
    hollow win.
    """
    notes: List[str] = []
    score, possible = 0.0, 5.0

    line = (verdict.get("avatar_line") or "").strip()
    if line:
        score += 1
        sentences = [s for s in re.split(r"(?<=[.!?])\s+", line) if s.strip()]
        if 2 <= len(sentences) <= 4:
            score += 1
        else:
            notes.append(f"avatar_line {len(sentences)} sentences (want 2-4)")
        if _MARKDOWN_RE.search(line) or _EMOJI_RE.search(line):
            notes.append("markdown/emoji in spoken line")
        else:
            score += 1
    else:
        notes.append("no avatar_line")

    look = (verdict.get("look_prompt") or "").strip()
    if look:
        if _LAZY_PROMPT_RE.search(look):
            notes.append(f"lazy look_prompt: {look[:60]!r}")
        else:
            score += 1
    else:
        notes.append("no look_prompt")

    if (verdict.get("look_answer") or "").strip():
        score += 1
    else:
        notes.append("no look_answer")

    return score / possible, notes


def run_vision_case(model: str, case: Dict[str, Any],
                    image: bytes) -> Dict[str, Any]:
    """One gate judgement, scored against the case's verified label."""
    result = avatar_llm.chat(
        model,
        avatar_visuals._VISION_REVIEW_PROMPT,
        _vision_prompt(case),
        images=[image],
        max_tokens=900,
        image_detail=avatar_visuals.VISION_DETAIL,
        timeout=90,
        retries=1,
    )

    row: Dict[str, Any] = {
        "case_id": case["case_id"],
        "kind": case["kind"],
        "model": model,
        "latency_s": round(result.latency_s, 2),
        "cost_usd": result.cost_usd,
        "prompt_tokens": result.prompt_tokens,
        "completion_tokens": result.completion_tokens,
        "error": result.error,
        "parsed": False,
        "correct": False,
        "false_accept": False,
        "false_reject": False,
        "line_quality": 0.0,
        "notes": [],
    }

    if not result.ok:
        row["notes"].append(f"call failed: {result.error[:120]}")
        return row

    verdict = avatar_llm.parse_json(result.text)
    if not isinstance(verdict, dict) or "usable" not in verdict:
        row["notes"].append("unparseable or missing 'usable'")
        return row

    row["parsed"] = True
    usable = bool(verdict.get("usable"))
    expected = bool(case["expect_usable"])
    row["usable"] = usable
    row["reject_reason"] = (verdict.get("reject_reason") or "")[:120]
    row["correct"] = usable == expected
    row["false_accept"] = usable and not expected
    row["false_reject"] = (not usable) and expected

    # Did it reject a watermarked image FOR the watermark, or by luck?
    if case["kind"] == "WATERMARK":
        row["watermark_flagged"] = bool(verdict.get("has_watermark"))

    if usable:
        quality, notes = _score_teaching_lines(verdict)
        row["line_quality"] = round(quality, 3)
        row["notes"].extend(notes)

    return row


def run_vision_suite(models: List[Tuple[str, str]], repeat: int,
                     workers: int) -> List[Dict[str, Any]]:
    cases = fixtures.load()
    images = {c["case_id"]: fixtures.image_bytes(c) for c in cases}

    jobs: List[Tuple[str, Dict[str, Any]]] = []
    for _ in range(repeat):
        for _family, model in models:
            for case in cases:
                jobs.append((model, case))

    rows: List[Dict[str, Any]] = []
    print(f"[vision] {len(jobs)} judgement(s): {len(cases)} cases x "
          f"{len(models)} models x {repeat} repeat(s)")

    with futures.ThreadPoolExecutor(max_workers=workers) as pool:
        pending = {pool.submit(run_vision_case, m, c, images[c["case_id"]]): (m, c)
                   for m, c in jobs}
        for i, fut in enumerate(futures.as_completed(pending), 1):
            model, case = pending[fut]
            try:
                row = fut.result()
            except Exception as e:
                row = {"case_id": case["case_id"], "kind": case["kind"],
                       "model": model, "error": f"crashed: {e}",
                       "parsed": False, "correct": False,
                       "false_accept": False, "false_reject": False,
                       "line_quality": 0.0, "notes": ["crashed"]}
            rows.append(row)
            mark = "OK " if row.get("correct") else "XX "
            print(f"  [{i:3d}/{len(jobs)}] {mark} {row['model'][:34]:36s} "
                  f"{row['case_id']}", flush=True)
    return rows


# ==============================================================================
#  TEACHING SUITE
# ==============================================================================

VALID_EMOTIONS = {
    "enthusiastic", "curious", "encouraging", "surprised", "thoughtful",
    "playful", "empathetic", "confident", "warm", "inspiring",
}

# The teaching segment before a checkpoint has to hand over to it in the
# avatar's own voice. Mirrors enrichment_pipeline._LEAD_IN_RE.
_HANDOVER_RE = re.compile(
    r"\b(question|quiz|quick|test|flash\s?card|card|try|ready|shall\s+we|"
    r"check|have\s+a\s+go|show\s+you)\b", re.I)


def load_section_texts(limit: int = 3) -> List[Dict[str, str]]:
    """Real textbook sections from outputs/, so the input is what ships."""
    picked: List[Dict[str, str]] = []
    root = Path(__file__).resolve().parent.parent / "outputs"
    for structured in sorted(root.glob("*/structured.json")):
        try:
            data = json.loads(structured.read_text(encoding="utf-8"))
        except Exception:
            continue
        for unit in data.get("units", []) or []:
            for section in unit.get("sections", []) or []:
                content = section.get("content")
                title = section.get("title") or section.get("section_title") or ""
                if not isinstance(content, str) or not title:
                    continue
                if not (900 <= len(content) <= 6000):
                    continue
                picked.append({
                    "id": f"{structured.parent.name[:34]}::{title[:40]}",
                    "section_title": title,
                    "unit_title": unit.get("title") or "",
                    "subject": unit.get("subject") or data.get("subject") or "science",
                    "content": content,
                })
                break            # one section per unit keeps the set varied
        if len(picked) >= limit:
            break
    return picked[:limit]


def score_teaching(parsed: Optional[Dict[str, Any]]) -> Tuple[float, List[str]]:
    """Score an avatar script against the contract the pipeline depends on."""
    notes: List[str] = []
    if not isinstance(parsed, dict):
        return 0.0, ["unparseable JSON"]

    avatar = parsed.get("avatar_explanation")
    if not isinstance(avatar, dict):
        return 0.0, ["no avatar_explanation object"]
    segments = avatar.get("segments")
    if not isinstance(segments, list) or not segments:
        return 0.0, ["no segments"]

    checks: List[Tuple[str, bool]] = []

    teaching = [s for s in segments
                if isinstance(s, dict) and s.get("type") == "teaching"]
    cards = [s for s in segments
             if isinstance(s, dict) and s.get("type") == "flashcard"]

    checks.append(("6-10 teaching segments", 6 <= len(teaching) <= 10))
    checks.append(("2-4 flashcards", 2 <= len(cards) <= 4))

    # Every flashcard must carry a valid flashcard_type - the field whose
    # absence silently broke every math checkpoint once already.
    checks.append(("all flashcards typed",
                   bool(cards) and all(c.get("flashcard_type") in ("mcq", "informative")
                                       for c in cards)))
    checks.append(("mostly mcq checkpoints",
                   bool(cards) and sum(1 for c in cards
                                       if c.get("flashcard_type") == "informative") <= 1))

    # Never first or last.
    checks.append(("no card at either end",
                   bool(segments) and segments[0].get("type") != "flashcard"
                   and segments[-1].get("type") != "flashcard"))

    emotions = [s.get("emotion") for s in teaching]
    checks.append(("emotions all valid",
                   bool(emotions) and all(e in VALID_EMOTIONS for e in emotions)))
    consecutive = sum(1 for a, b in zip(emotions, emotions[1:]) if a and a == b)
    checks.append(("no repeated emotion in a row", consecutive == 0))

    # Segment length: 2-4 sentences, spoken aloud.
    lengths = []
    for s in teaching:
        text = (s.get("text") or "").strip()
        lengths.append(len([x for x in re.split(r"(?<=[.!?])\s+", text) if x.strip()]))
    in_range = sum(1 for n in lengths if 2 <= n <= 5)
    checks.append(("segments 2-5 sentences",
                   bool(lengths) and in_range / len(lengths) >= 0.7))

    # Spoken text must not carry markdown or emoji.
    dirty = sum(1 for s in teaching
                if _MARKDOWN_RE.search(s.get("text") or "")
                or _EMOJI_RE.search(s.get("text") or ""))
    checks.append(("no markdown/emoji in speech", dirty == 0))

    # The segment before each checkpoint hands over to it.
    handovers, opportunities = 0, 0
    for prev, cur in zip(segments, segments[1:]):
        if (isinstance(cur, dict) and cur.get("type") == "flashcard"
                and isinstance(prev, dict) and prev.get("type") == "teaching"):
            opportunities += 1
            if _HANDOVER_RE.search(prev.get("text") or ""):
                handovers += 1
    checks.append(("checkpoints handed over",
                   opportunities > 0 and handovers / opportunities >= 0.6))

    checks.append(("3-4 faqs", 3 <= len(parsed.get("faqs") or []) <= 5))
    checks.append(("3-4 practice questions",
                   3 <= len(parsed.get("practice_questions") or []) <= 5))
    checks.append(("has concept_overview",
                   bool((parsed.get("concept_overview") or "").strip())))

    for label, passed in checks:
        if not passed:
            notes.append(f"FAIL {label}")
    return sum(1 for _, p in checks if p) / len(checks), notes


def run_teaching_case(model: str, section: Dict[str, str]) -> Dict[str, Any]:
    from enrichment_pipeline import AVATAR_ENRICH_PROMPT

    ctx = (f"Unit: {section['unit_title']}\nSection: {section['section_title']}"
           f"\n\nContent:\n{section['content'][:8000]}")
    user = (f"Create an avatar teaching script for this topic. "
            f"Include teaching segments with emotions AND inline flashcards "
            f"with real-world examples.\n\n{ctx}\n\n"
            f"Return in the JSON format specified.")

    result = avatar_llm.chat(model, AVATAR_ENRICH_PROMPT, user,
                             max_tokens=4000, timeout=180, retries=1)

    row: Dict[str, Any] = {
        "section_id": section["id"],
        "model": model,
        "latency_s": round(result.latency_s, 2),
        "cost_usd": result.cost_usd,
        "prompt_tokens": result.prompt_tokens,
        "completion_tokens": result.completion_tokens,
        "error": result.error,
        "parsed": False,
        "score": 0.0,
        "notes": [],
    }
    if not result.ok:
        row["notes"].append(f"call failed: {result.error[:140]}")
        return row

    parsed = avatar_llm.parse_json(result.text)
    row["parsed"] = isinstance(parsed, dict)
    score, notes = score_teaching(parsed)
    row["score"] = round(score, 3)
    row["notes"] = notes
    return row


def run_teaching_suite(models: List[Tuple[str, str]], repeat: int,
                       workers: int) -> List[Dict[str, Any]]:
    sections = load_section_texts(limit=3)
    if not sections:
        print("[teaching] no usable sections found in outputs/ - suite skipped")
        return []

    print(f"[teaching] sections: " + ", ".join(s["id"][:44] for s in sections))
    jobs = [(m, s) for _ in range(repeat) for _f, m in models for s in sections]
    rows: List[Dict[str, Any]] = []
    print(f"[teaching] {len(jobs)} script(s)")

    with futures.ThreadPoolExecutor(max_workers=workers) as pool:
        pending = {pool.submit(run_teaching_case, m, s): (m, s) for m, s in jobs}
        for i, fut in enumerate(futures.as_completed(pending), 1):
            model, section = pending[fut]
            try:
                row = fut.result()
            except Exception as e:
                row = {"section_id": section["id"], "model": model,
                       "error": f"crashed: {e}", "parsed": False,
                       "score": 0.0, "notes": ["crashed"]}
            rows.append(row)
            print(f"  [{i:3d}/{len(jobs)}] {row['score']:.2f}  "
                  f"{row['model'][:34]:36s} {row['section_id'][:44]}", flush=True)
    return rows


# ==============================================================================
#  REPORTING
# ==============================================================================

def _mean(values: List[float]) -> float:
    return statistics.fmean(values) if values else 0.0


def summarize_vision(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for model in dict.fromkeys(r["model"] for r in rows):
        mine = [r for r in rows if r["model"] == model]
        graded = [r for r in mine if r.get("parsed")]
        clean = [r for r in mine if r["kind"] == "CLEAN"]
        wm = [r for r in mine if r["kind"] == "WATERMARK"]
        accepts = [r for r in mine if r.get("usable")]

        false_accepts = sum(1 for r in mine if r.get("false_accept"))
        false_rejects = sum(1 for r in mine if r.get("false_reject"))

        # Per-case credit, averaged. A false ACCEPT is actively harmful - it
        # puts a watermarked or off-topic picture in front of a student - so it
        # scores NEGATIVE rather than merely zero. A false reject, or a call
        # that failed outright, just costs us a picture: zero, not negative.
        #
        # Scoring failures as zero is the point: the first version of this
        # subtracted penalties from 1.0, which handed a model whose every call
        # 429'd a perfect 1.00 because it had committed no errors of either
        # kind. A model that never answers must score at the bottom, not the
        # top.
        def _credit(r: Dict[str, Any]) -> float:
            if r.get("false_accept"):
                return -2.0
            return 1.0 if r.get("correct") else 0.0

        out.append({
            "model": model,
            "n": len(mine),
            "parse_rate": _mean([1.0 if r.get("parsed") else 0.0 for r in mine]),
            "accuracy": _mean([1.0 if r.get("correct") else 0.0 for r in mine]),
            "gate_score": max(0.0, _mean([_credit(r) for r in mine])),
            "false_accepts": false_accepts,
            "false_rejects": false_rejects,
            "clean_accept_rate": _mean([1.0 if r.get("usable") else 0.0 for r in clean]),
            "watermark_caught": _mean(
                [1.0 if r.get("watermark_flagged") else 0.0 for r in wm]),
            "line_quality": _mean([r["line_quality"] for r in accepts]),
            "latency_s": _mean([r.get("latency_s", 0) for r in graded]),
            "cost_per_call": _mean([r.get("cost_usd", 0) for r in graded]),
        })
    return sorted(out, key=lambda r: (-r["gate_score"], -r["accuracy"]))


def summarize_teaching(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for model in dict.fromkeys(r["model"] for r in rows):
        mine = [r for r in rows if r["model"] == model]
        ok = [r for r in mine if r.get("parsed")]
        out.append({
            "model": model,
            "n": len(mine),
            "parse_rate": _mean([1.0 if r.get("parsed") else 0.0 for r in mine]),
            "score": _mean([r["score"] for r in mine]),
            "latency_s": _mean([r.get("latency_s", 0) for r in ok]),
            "cost_per_call": _mean([r.get("cost_usd", 0) for r in ok]),
        })
    return sorted(out, key=lambda r: -r["score"])


def print_vision_table(summary: List[Dict[str, Any]]) -> None:
    print("\n" + "=" * 108)
    print("VISION GATE - higher is better except false accepts/rejects, latency, cost")
    print("=" * 108)
    print(f"{'model':38s} {'gate':>6s} {'acc':>6s} {'FA':>3s} {'FR':>3s} "
          f"{'clean+':>7s} {'wm':>5s} {'line':>6s} {'sec':>6s} {'$/call':>9s}")
    print("-" * 108)
    for r in summary:
        print(f"{r['model'][:38]:38s} {r['gate_score']:6.2f} {r['accuracy']:6.2f} "
              f"{r['false_accepts']:3d} {r['false_rejects']:3d} "
              f"{r['clean_accept_rate']:7.2f} {r['watermark_caught']:5.2f} "
              f"{r['line_quality']:6.2f} {r['latency_s']:6.2f} "
              f"{r['cost_per_call']:9.6f}")
    print("-" * 108)
    print("gate = mean per-case credit: correct +1, false reject or failed call 0, FALSE ACCEPT -2.")
    print("wm = watermarks explicitly flagged. line = quality of the spoken teaching lines.")


def print_teaching_table(summary: List[Dict[str, Any]]) -> None:
    print("\n" + "=" * 84)
    print("TEACHING SCRIPT - structural contract + spoken-style compliance")
    print("=" * 84)
    print(f"{'model':38s} {'score':>7s} {'parse':>7s} {'sec':>8s} {'$/call':>10s}")
    print("-" * 84)
    for r in summary:
        print(f"{r['model'][:38]:38s} {r['score']:7.2f} {r['parse_rate']:7.2f} "
              f"{r['latency_s']:8.2f} {r['cost_per_call']:10.6f}")
    print("-" * 84)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--suite", choices=("vision", "teaching", "all"), default="all")
    ap.add_argument("--repeat", type=int, default=1)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--models", default="",
                    help="comma-separated model slugs, overriding the defaults")
    args = ap.parse_args()

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d_%H%M%S")
    payload: Dict[str, Any] = {"generated_at": stamp}

    override = [("custom", m.strip()) for m in args.models.split(",") if m.strip()]

    if args.suite in ("vision", "all"):
        rows = run_vision_suite(override or VISION_MODELS, args.repeat, args.workers)
        summary = summarize_vision(rows)
        print_vision_table(summary)
        payload["vision"] = {"rows": rows, "summary": summary}

    if args.suite in ("teaching", "all"):
        rows = run_teaching_suite(override or TEACHING_MODELS, args.repeat, args.workers)
        if rows:
            summary = summarize_teaching(rows)
            print_teaching_table(summary)
            payload["teaching"] = {"rows": rows, "summary": summary}

    out = RESULTS_DIR / f"bench_{stamp}.json"
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"\n[bench] full results -> {out}")


if __name__ == "__main__":
    main()
