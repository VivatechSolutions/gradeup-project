# GradeUp Slides: Python integration and rollout

React and Node implement the editor. Python code has intentionally not been changed.
The existing Google tool remains a separate legacy path. GradeUp startup must not
call Google authorization or use stub Google IDs.

## Ownership and startup

Python generates **deck_id, deck_ref, session_id, edit_url, embed_url**.
Node sends `deck_ref: null, tool: "gradeup"` for a new deck. Node never replaces
Python's IDs or URLs. It validates the response, persists the deck and all initial
slides in MongoDB, then returns `{status: true, data: <Python response>}` to React.
React opens the exact edit_url in the current tab (no popup/install required).

Keep POST `/ppt/session/start`, `/ppt/suggest`, `/ppt/decide`, `/ppt/session/end`.
Extend request models with the fields below. Branch by the stored session tool.

Python configuration:

```env
GRADEUP_SLIDES_EDITOR_BASE_URL=https://your-frontend.example/seminar/slides
```

POST /ppt/session/start request:

```json
{"student_id":"authenticated-user-id","board":"CBSE","class_number":"10","chapter":1,"title":"Life Processes","subject":"science","term":null,"deck_ref":null,"tool":"gradeup","request_id":"UUID"}
```

Response (IDs here are examples; Python must generate them):

```json
{
  "session_id": "05384eec3f5d46db88d4d82cc3f87d2f",
  "deck_id": "a810c370d13e4f0e",
  "deck_ref": "gradeup:a810c370d13e4f0e",
  "edit_url": "https://your-frontend.example/seminar/slides/a810c370d13e4f0e",
  "embed_url": "https://your-frontend.example/seminar/slides/a810c370d13e4f0e/present",
  "deck_created": true,
  "deck_mode": "gradeup",
  "title": "Life Processes",
  "theme_spec": {"background_hex":"#ffffff","title_color_hex":"#17251f","body_color_hex":"#263b32","accent_hex":"#277f60"},
  "initial_slides": [{"id":"slide-1","title":"Life Processes","background":"#ffffff","notes":"Opening notes","elements":[{"id":"title-1","type":"text","x":80,"y":70,"width":1100,"height":110,"text":"Life Processes","fontFamily":"Arial","fontSize":48,"bold":true,"fill":"#17251f"}]}],
  "guidance": "Your outline is ready. Select a slide to begin."
}
```

Return 1-50 actual initial slides, not an empty array. Preserve textbook topic
selection and generate a useful curriculum outline. Initial image insertion is
performed through the Node asset upload/import flow; initial_slides must not
contain external image URLs masquerading as owned assets.
IDs: 1-128 ASCII letters, numbers, underscore or hyphen. No slashes or spaces.
URLs must have the configured origin and exact routes above, with no query/hash.
For a resume with deck_ref, reuse the existing session and return the same IDs.
Make request_id idempotent per student: retries must return the same startup result.
Node may retry persistence after Python has already created the session.

## Editable slide schema

Canvas coordinates are fixed 1280 x 720 units, independent of zoom/device pixels.
Each slide: `id, title, background, notes, elements`.
Each element: `id, type, x, y, width, height` and optional:
`rotation, opacity, text, fontFamily, fontSize, bold, italic, underline, align,
fill, stroke, strokeWidth, cornerRadius, lineHeight, list, assetId, crop, groupId`.
Element types: text, image, rect, ellipse, line, arrow. Shapes remain editable.
Colors are six-digit hex or transparent; backgrounds use six-digit hex.
Fonts: Arial, Verdana, Georgia, Times New Roman, Courier New, Trebuchet MS.
Text font sizes: 6-300; opacity 0-1; lineHeight .5-4; text at most 20000 characters.
Lists: none, bullet, number. Alignment: left, center, right, justify.
Image assetId must already belong to the deck. Crop coordinates are normalized
0-1 fractions of the original image. Lines/arrows run from (x,y) to
(x+width,y+height), with element rotation applied about (x,y).
The Node validator `services/presentationDocument.js` is the authoritative schema.

## Suggest

Node supplies the authoritative MongoDB snapshot (not arbitrary browser content):

```json
{"tool":"gradeup","session_id":"...","deck_ref":"gradeup:...","slide_id":"slide-1","slide_index":0,"base_revision":7,"request_id":"UUID","query":"Add key points","slide_snapshot":{"id":"slide-1","title":"Life Processes","background":"#ffffff","notes":"","elements":[]},"selected_element_ids":[],"theme_spec":{},"other_slides":[{"id":"slide-2","title":"Nutrition","text":"..."}]}
```

Support statuses `done`, `guidance`, `images`, `awaiting_approval`, `ready_to_apply`.
Responses contain `ai_feedback`, optional `suggestions` and `images`.
Mutating responses require a **flat operations array** and proposal_id:

```json
{"status":"awaiting_approval","intent":"edit","proposal_id":"proposal-123","ai_feedback":"Add a nutrition point to this slide.","operations":[{"op":"add_element","slide_id":"slide-1","element":{"id":"point-1","type":"text","x":80,"y":220,"width":1000,"height":100,"text":"Nutrition provides materials and energy.","fontSize":32,"fill":"#263b32"}}]}
```

Supported operations:
- add_slide: slide, optional index
- delete_slide: slide_id
- reorder_slides: ids (every slide exactly once)
- update_slide: slide_id, changes (title/background/notes/elements)
- add_element: slide_id, element
- update_element: slide_id, element_id, changes (cannot replace id/type)
- delete_element: slide_id, element_id
- reorder_elements: slide_id, ids (every element exactly once)
- set_theme: theme (theme metadata only; accompany with explicit updates to apply it)
- set_speaker_notes: slide_id, value

Convert existing set_layout/cards/bullets results into these native editable
elements in Python. Do not send Google batchUpdate requests or nested
proposed_change.proposed_change. Node rejects unsupported operations rather than
claiming the slide was changed. Keep the RAG, intent, image query, theme, layout
and notes logic. Register a GradeUp agent whose read node consumes slide_snapshot.
Its write nodes return operations and **never call mcp_slides_client**.

The initial editor requires explicit approval for all AI writes, including
ready_to_apply. Repeated rejections must not cause automatic content writes.
New chat requests replace an outstanding proposal. Persist proposals and
request_id outcomes durably; MemorySaver alone does not survive process restart.

Image search retains the existing images response. Node renders thumbnails,
then rehosts the selected result in S3 and inserts an editable image on the
original request's slide. Return hosted results from configured trusted hosts;
untrusted external URLs must be rehosted by Python before returning them.

## Decide and end

POST /ppt/decide:

```json
{"tool":"gradeup","session_id":"...","proposal_id":"proposal-123","decision":"approve","request_id":"UUID","base_revision":8,"execution":"node"}
```

Return `{status:"done", proposal_id, operations:[...]}` acknowledging the same
proposal. Do not apply it externally. Node commits the exact stored proposal
atomically only when its revision still matches. Retried decisions are idempotent.
Approval acknowledgement is not proof of persistence; report planning/approval
separately from applied edit counts. If precise skill totals require applied
counts, add a service-authenticated commit acknowledgement endpoint and agree
that extension before enabling those totals.

POST /ppt/session/end accepts session_id, tool, request_id. End idempotently.
Manual editing and presentation access continue after AI coaching ends. Sessions
must be resumable/durable for the intended deck lifetime, not deleted silently
after the old 7-day TTL. Expired sessions should return an explicit error.

## Node and deployment configuration

```env
AI_URL=https://your-python-service.example
PRESENTATION_ALLOWED_ORIGINS=https://your-frontend.example
PRESENTATION_S3_BUCKET=your-private-bucket
AWS_REGION=us-east-1
PRESENTATION_IMAGE_HOSTS=gradeup-books-images.s3.us-east-1.amazonaws.com
PRESENTATION_DEBUG_LOGS=false
```

For localhost use a Python editor base of http://localhost:3001/seminar/slides
and Node PRESENTATION_ALLOWED_ORIGINS=http://localhost:3001. Multiple allowed
origins are comma-separated. Configure existing FE_URL/CORS for that frontend.
Never accept the origin from an untrusted request field. Use environment config.
S3 permissions: GetObject and PutObject on presentations/* using the hosting
role or standard AWS credentials. The bucket can stay private: Node checks deck
access and streams assets to the browser. Uploaded images have a 10 MB limit.
Do not configure private/internal servers in PRESENTATION_IMAGE_HOSTS.

Steps:
1. Implement and deploy the Python contract; verify start returns real slides.
2. Configure Node MongoDB, Python URL, origins and S3 permissions.
3. Deploy Node, then React with REACT_APP_API_BASE_URL pointing to Node.
4. Configure SPA rewrites for /seminar/slides/* on the frontend host.
5. Test create -> edit -> reload -> AI proposal -> approve -> present.
6. Test a second account with viewer/editor links, then revoke its link.
7. Test concurrent edits: a stale save must return 409 without losing saved data.

Socket.IO uses the existing authenticated server. It broadcasts revisions only;
clients reauthorize on every read/write. Run one Node instance initially. Multiple
instances need a shared Socket.IO adapter for immediate presence; polling already
refreshes revisions across instances. Collaboration uses conflict detection,
not simultaneous character-level merging. History retains the last five deck
snapshots; browser undo retains forty local steps. Current exports: PNG, PDF,
editable JSON. PDF is rendered, not an editable slide file. Advanced tables,
charts, video, comments, PPTX import/export remain a subsequent milestone.

## Verification

From server: `node --test tests/presentation.test.js tests/presentation-api.test.js`.
API tests exercise the real Express routes with mocked storage, authentication
and Python; they do not substitute for deployment checks against MongoDB/S3/Python.
From react, start the development server on port 3001 and run
`node scripts/slide-editor-smoke.cjs` with Playwright installed. Set
PLAYWRIGHT_MODULE to its module path and EDITOR_BROWSER_PATH to Chrome when
Playwright's bundled browser is unavailable. The browser test mocks network
responses and checks the actual React editor, permissions, slide selection,
approval, text editing, autosave, image upload, exports and responsive rendering.
