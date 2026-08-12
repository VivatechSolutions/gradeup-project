# Hybrid RAG + Free Web Search (SearXNG + Crawl4AI)

Replaces the need for a paid search API (e.g. Tavily) with a **self-hosted, free**
search + scrape stack, and upgrades the PPT co-pilot from "always Qdrant" retrieval
to an **agent-decided hybrid**: the agent chooses, per student message, whether the
answer comes from the **curriculum RAG (Qdrant)**, the **web**, or an **image search**.

## Goals (from product owner)

1. **Hybrid RAG** — the agent decides RAG vs web per request (not a fixed rule).
2. **Images** — image search results **pop up in the chat**, and are **NOT** inserted
   into the slides. (No `createImage`, no S3 re-upload, no public-URL problem.)
3. **`/ppt/suggest` is the main conversational endpoint**, with human-in-the-loop.
4. **Edit on instruction** — when the student *tells* the agent to edit the PPT, the
   agent routes into the existing HITL apply flow.
5. **Auto-popup** — suggestions appear in the chat automatically (frontend auto-calls
   `/ppt/suggest` on slide-open; true server-push is a later option).

## Architecture

```
/ppt/suggest (main conversational endpoint)
        │
        ▼
  decide_source()  ← Mistral classifies the student's message
        │
   ┌────┼──────────────┬──────────────────┐
   ▼    ▼              ▼                  ▼
 "rag" "web"        "image"            "edit"
Qdrant  SearXNG +   SearXNG images    build ops → wait_approval (HITL)
        Crawl4AI    → chat only            │  resume via /ppt/decide
   └────┴──────────── chunks ──► llm suggest ──► chat bubble
```

All text sources (Qdrant / web) return the **same chunk shape**
(`{"content", "metadata", "score"}`) so `ppt_review.llm_*` is unchanged.

### Maps onto existing code

| Diagram box                 | Code                                             |
|-----------------------------|--------------------------------------------------|
| AI Agent / FastAPI Backend  | `analyze_slide_node` in `ppt/ppt_nodes.py`       |
| Container 1 — SearXNG :8081 | `ppt/ppt_websearch.py::web_context / image_search`|
| Container 2 — Crawl4AI :8001| `ppt/ppt_websearch.py::_crawl`                    |
| LLM Engine / RAG            | `ppt/ppt_review.py` + Mistral (unchanged)        |
| Existing Qdrant RAG         | `ppt/ppt_rag.py::retrieve_context` (unchanged)   |

## Components

### 1. Containers — `docker-compose.yml` (local)
- **SearXNG** `:8081` → JSON + images formats enabled (`searxng/settings.yml`).
- **Crawl4AI** `:8001` → renders JS, strips HTML, returns clean markdown.

### 2. `ppt/ppt_websearch.py` (new)
- `web_context(query, top_k) -> (chunks, stats)` — SearXNG search → top-K URLs →
  Crawl4AI markdown → chunk dicts. Same contract as `ppt_rag.retrieve_context`.
- `image_search(query, top_k) -> [ {url, title, source} ]` — SearXNG images category.
  **Chat display only.**
- Graceful degradation: any failure → `[]`, never crashes the node.

### 3. `ppt/ppt_source_router.py` (new)
- `decide_source(student_msg, snapshot, coords) -> {"intent", "source"}`
  - `intent`: `answer` | `image` | `edit`
  - `source`: `rag` | `web` | `hybrid`
- Cheap heuristics + one Mistral call. "latest/current/real-world" → web;
  "picture/diagram of…" → image; "change/rewrite/make this…" → edit; else rag
  (web fallback when Qdrant hits are thin).

### 4. `analyze_slide_node` (edit) — hybrid retrieval + intent branch
- `answer` → rag/web chunks → `llm_review_content` → suggestions to chat.
- `image` → `image_search` → image candidates in payload (chat renders them).
- `edit`  → build ops → existing `propose_change_node` → `wait_approval_node`
  (`interrupt()`); `/ppt/suggest` returns `{"status":"awaiting_approval", ...}`;
  student confirms via the **existing `/ppt/decide`**.

### 5. State + request models
- `PPTAgentState`: add `student_instruction: str`, `image_results: List[Dict]`,
  `source_used: str`.
- `PPTSuggestRequest`: already has `query`; treat it as the student message.

### 6. Config — `.env`
```
WEB_SEARCH_ENABLED=true
SEARXNG_URL=http://localhost:8081
CRAWL4AI_URL=http://localhost:8001
WEB_SEARCH_TOP_K=3
IMAGE_SEARCH_TOP_K=6
WEB_SEARCH_TIMEOUT=20
CRAWL4AI_API_TOKEN=<token>   # required — see note below
```

## Build order

1. **Containers up** — docker-compose + SearXNG config; verify with curl. *(done first)*
2. **`ppt_websearch.py`** — `web_context()` + `image_search()`, standalone-tested.
3. **`ppt_source_router.py`** — `decide_source()`.
4. **Wire router into `analyze_slide_node`** — hybrid retrieval; suggestions as today.
5. **Edit-on-instruction** — route edit intent into existing HITL branch; add state fields.
6. **Images end-to-end** — return image candidates to chat.
7. **Frontend auto-call `/ppt/suggest`** for the pop-up behavior.

Steps 1–4 are low-risk and independently testable. 5–6 need the most design care.

## Verify the containers

```bash
docker compose up -d
curl "http://localhost:8081/search?q=latest+AI+models&format=json"
curl -X POST "http://localhost:8001/crawl" -H "Content-Type: application/json" \
  -d '{"urls":["https://example.com"]}'
```

## Status (2026-07-29)
- **Steps 1–2 DONE, verified live.** Containers up; `web_context()` / `image_search()`
  return correctly against real SearXNG + Crawl4AI 0.9.2.
- **Step 3 DONE, tested.** `ppt/ppt_source_router.py::decide_source()` — LLM classifier
  (OpenAI gpt-4o-mini) + keyword-heuristic fallback. Classifies intent/source correctly.
- **Steps 4–5 DONE, unit-tested (live endpoint test pending a real session).**
  - `analyze_slide_node` now does hybrid retrieval on both the answer and edit paths
    via `_augment_with_web()`.
  - `/ppt/suggest` is now the conversational main endpoint: routes image → chat images,
    edit → review + HITL (`awaiting_approval`, resume via `/ppt/decide`), answer → verbal
    suggestions from the chosen source. Response adds `intent`, `source_used`, `images`.
  - `PPTAgentState` gained `student_instruction`, `web_source`, `source_used`, `image_results`.
- **Remaining:** step 6 (image chat UX end-to-end with a real deck) and step 7 (frontend
  auto-call). Note: edit-intent currently triggers the agent's review; honoring the exact
  instruction wording in the edit is a follow-up refinement.

## Single-endpoint conversational HITL (2026-07-29)
`/ppt/suggest` is now the ONLY endpoint the student flow needs — ask, edit, and
**approve in the same chat**:
- On each call, if the session is `awaiting_approval` (set on a prior turn), the message
  is read by `ppt_source_router.parse_decision()` → approve / reject / skip, and the paused
  agent is resumed via `Command(resume=...)`. Unclear replies re-show the pending change.
- Otherwise `decide_source()` routes to image / edit / answer. An edit that pauses calls
  `ppt_session.set_pending_approval()` and returns `awaiting_approval`; the NEXT chat
  message resolves it. No `/ppt/edit` or `/ppt/decide` call required (both still exist for
  compatibility but are not part of the primary flow).
- Image results now filter out SVG/icon-CDN noise (`_is_usable_image`).
- **Content-grounded image queries**: the image branch reads the current slide
  (`mcp_slides_client.get_slide_content`) and builds the search query from the SLIDE'S
  content via `ppt_review.llm_image_query` (heuristic `build_image_query` fallback), so a
  vague "i need an img for this slide" → "plant reproduction diagram", not junk.
- **ImgBB re-hosting** (`_upload_to_imgbb`): each kept image is downloaded with a browser
  User-Agent (source hosts 403 ImgBB's own fetcher) then uploaded as base64, giving stable
  `i.ibb.co` chat URLs. Needs `IMGBB_API_KEY` in `.env`; degrades to source URLs without it.
  Each image dict: `{url, origin_url, hosted, title, source}`.

## Standalone project (2026-07-29)
The `PPT` folder was a partial copy of `gradeup_python_2.0` (missing the shared backend
modules), so it could not run on its own. Made it standalone:
- Copied the 32 missing root modules (`config.py`, `pipeline.py`, `qdrant_integration.py`,
  `guardrails.py`, …) and the extra `agents/*.py` from `gradeup_python_2.0`.
- Installed the missing packages into `venv`: `qdrant-client`, `langchain-qdrant`,
  `langchain-openai`, `langchain-experimental`, `langfuse`.
- `requirements.txt` updated to the full set.
- Verified: `app.py` imports, Qdrant connects and returns results, `uvicorn app:app`
  starts cleanly, `/ppt/health` → 200.

Run it:  `python -m uvicorn app:app --host 0.0.0.0 --port 5000 --reload`
(One known minor: `langfuse`/`mistralai` pin a slightly different `opentelemetry` — a
warning only; the co-pilot uses OpenAI via raw requests, not affected.)

## Notes / risks
- **Crawl4AI 0.9.2 needs a token to be reachable.** The image binds gunicorn to
  `127.0.0.1` (loopback-only) UNLESS `CRAWL4AI_API_TOKEN` is set — then it binds
  `[::]` and requires that token as `Authorization: Bearer <token>` on every call.
  Token lives in both `docker-compose.yml` (container env) and `.env` (client). The
  working markdown endpoint is `POST /md {"url": ...}` → `{"markdown", "success"}`.
  `_crawl` tries `/md` then `/crawl`. If the pinned image changes, adjust there only.
- **Search-result noise**: some pages return bot-check/"confirm you're human" text
  instead of content, and image results can include stray icons/SVGs. Acceptable for
  now; can filter later (drop low-content crawls; filter images by resolution/format).
- **Image hotlinks** may be blocked by some sites when rendered in chat (referrer
  checks). Acceptable for now since images are chat-only; if it becomes a problem,
  proxy them through the backend later.
- **Secrets**: `.env` currently holds live keys in plaintext — ensure it is
  git-ignored; rotate anything already pushed.
