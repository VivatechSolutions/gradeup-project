const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const Deck = require('../model/PresentationDeck');
const Share = require('../model/PresentationShare');
const Asset = require('../model/PresentationAsset');
const User = require('../model/User');
const { requireStudentAuth } = require('../middleware/studentAuth');
const { callPython } = require('../services/pythonGateway');
const { access, publicDeck, commit, revokeRoom } = require('../services/presentationService');
const { fail, clone, applyOperations, hashToken } = require('../services/presentationDocument');
const assets = require('../services/presentationAssets');
const router = express.Router();
router.use('/decks', requireStudentAuth);
router.use('/shared', requireStudentAuth);
const wrap = fn => async (req, res) => { try { await fn(req, res); } catch (e) { res.status(e.statusCode || 500).json({ status: false, message: e.statusCode ? e.message : 'Presentation request failed' }); console.error('[presentation]', { path: req.route?.path, code: e.statusCode || 500, message: e.message }); } };
const send = (res, data) => res.json({ status: true, data });
const token = req => req.headers['x-presentation-share'];
const user = req => String(req.studentUser._id);
const auth = (req, needed) => access(req.params.deckId, user(req), token(req), needed);
const documentOf = deck => ({ title: deck.title, slides: clone(deck.slides), theme: clone(deck.theme || {}) });
function checkRevision(req, deck) {
  if (!Number.isInteger(req.body.base_revision) || req.body.base_revision !== deck.revision) fail('Presentation changed. Reload before saving.', 409);
}
router.get('/decks', wrap(async (req, res) => {
  const decks = await Deck.find({ deletedAt: null, $or: [{ ownerId: user(req) }, { 'collaborators.userId': user(req) }] }).select('deckId title editUrl updatedAt').sort({ updatedAt: -1 }).limit(100).lean(); send(res, decks);
}));
router.get('/shared/:token', wrap(async (req, res) => {
  const share = await Share.findOne({ tokenHash: hashToken(req.params.token), revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
  if (!share) fail('This sharing link has expired or was revoked', 404);
  const result = await access(share.deckId, user(req), req.params.token);
  send(res, publicDeck(result.deck, result.role));
}));
router.get('/decks/:deckId', wrap(async (req, res) => { const { deck, role } = await auth(req); send(res, publicDeck(deck, role)); }));
router.patch('/decks/:deckId', wrap(async (req, res) => {
  const { deck, role } = await auth(req, 'editor');
  if (deck.receipts.includes(req.body.mutation_id)) return send(res, publicDeck(deck, role));
  checkRevision(req, deck);
  const next = { title: req.body.title, theme: req.body.theme, slides: req.body.slides };
  send(res, publicDeck(await commit(deck, next, user(req), req.body.mutation_id), role));
}));
router.delete('/decks/:deckId', wrap(async (req, res) => {
  const { deck } = await auth(req, 'owner'); checkRevision(req, deck);
  const result = await Deck.updateOne({ deckId: deck.deckId, revision: deck.revision }, { $set: { deletedAt: new Date() }, $inc: { revision: 1 } });
  if (!result.modifiedCount) fail('Presentation changed', 409);
  revokeRoom(deck.deckId); send(res, { deleted: true });
}));
async function edit(req, res, op) {
  const { deck, role } = await auth(req, 'editor');
  if (deck.receipts.includes(req.body.mutation_id)) return send(res, publicDeck(deck, role));
  checkRevision(req, deck);
  send(res, publicDeck(await commit(deck, applyOperations(documentOf(deck), [op]), user(req), req.body.mutation_id), role));
}
router.post('/decks/:deckId/slides', wrap((req, res) => edit(req, res, { op: 'add_slide', slide: req.body.slide, index: req.body.index })));
router.post('/decks/:deckId/slides/reorder', wrap((req, res) => edit(req, res, { op: 'reorder_slides', ids: req.body.ids })));
router.patch('/decks/:deckId/slides/:slideId', wrap((req, res) => edit(req, res, { op: 'update_slide', slide_id: req.params.slideId, changes: req.body.changes })));
router.delete('/decks/:deckId/slides/:slideId', wrap((req, res) => edit(req, res, { op: 'delete_slide', slide_id: req.params.slideId })));
router.get('/decks/:deckId/revisions', wrap(async (req, res) => { const { deck } = await auth(req, 'editor'); send(res, deck.history.map(({ slides, theme, ...entry }) => entry)); }));
router.post('/decks/:deckId/revisions/:revision/restore', wrap(async (req, res) => {
  const { deck, role } = await auth(req, 'editor'); checkRevision(req, deck);
  const entry = deck.history.find(v => v.revision === Number(req.params.revision));
  if (!entry) fail('Revision no longer retained', 404);
  send(res, publicDeck(await commit(deck, { title: entry.title, slides: entry.slides, theme: entry.theme }, user(req), req.body.mutation_id), role));
}));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }).single('file');
router.post('/decks/:deckId/assets', wrap(async (req, res) => {
  await auth(req, 'editor');
  await new Promise((resolve, reject) => upload(req, res, err => err ? reject(Object.assign(err, { statusCode: 422 })) : resolve()));
  send(res, await assets.upload(req.params.deckId, req.file?.buffer, req.file?.originalname));
}));
router.post('/decks/:deckId/assets/import', wrap(async (req, res) => {
  const { deck } = await auth(req, 'editor');
  const message = deck.messages.find(m => m.id === req.body.message_id);
  const image = message?.images?.[req.body.image_index];
  if (!image?.url) fail('Choose an image from this deck chat');
  send(res, await assets.importImage(deck.deckId, image.url));
}));
router.get('/decks/:deckId/assets/:assetId', wrap(async (req, res) => {
  await auth(req);
  const asset = await Asset.findOne({ deckId: req.params.deckId, assetId: req.params.assetId }).lean();
  if (!asset) fail('Image not found', 404);
  const result = await assets.read(asset);
  res.set({ 'Content-Type': asset.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  res.send(Buffer.from(await result.Body.transformToByteArray()));
}));
router.get('/decks/:deckId/shares', wrap(async (req, res) => { await auth(req, 'owner'); send(res, await Share.find({ deckId: req.params.deckId, revokedAt: null, expiresAt: { $gt: new Date() } }).lean()); }));
router.post('/decks/:deckId/shares', wrap(async (req, res) => {
  const { deck } = await auth(req, 'owner');
  if (!['viewer','editor'].includes(req.body.role)) fail('Choose viewer or editor');
  const value = crypto.randomBytes(32).toString('base64url');
  const share = await Share.create({ deckId: deck.deckId, tokenHash: hashToken(value), role: req.body.role, expiresAt: new Date(Date.now() + 30 * 86400000) });
  const url = new URL(deck.editUrl); url.searchParams.set('share', value);
  send(res, { id: share.id, role: share.role, expiresAt: share.expiresAt, url: url.href });
}));
router.delete('/decks/:deckId/shares/:shareId', wrap(async (req, res) => {
  await auth(req, 'owner');
  await Share.updateOne({ _id: req.params.shareId, deckId: req.params.deckId }, { $set: { revokedAt: new Date() } });
  await Deck.updateOne({ deckId: req.params.deckId, deletedAt: null }, { $inc: { revision: 1 } });
  revokeRoom(req.params.deckId); send(res, { revoked: true });
}));
router.post('/decks/:deckId/collaborators', wrap(async (req, res) => {
  const { deck } = await auth(req, 'owner');
  if (!['viewer','editor','remove'].includes(req.body.role)) fail('Invalid permission');
  const target = await User.findOne({ normalizedEmail: String(req.body.email || '').trim().toLowerCase(), status: 'active', deletedAt: null }).lean();
  if (!target) fail('No active GradeUp account with that email', 404);
  if (String(target._id) === deck.ownerId) fail('Owner permission cannot be changed');
  const collaborators = deck.collaborators.filter(c => c.userId !== String(target._id));
  if (req.body.role !== 'remove') collaborators.push({ userId: String(target._id), email: target.email, role: req.body.role });
  if (collaborators.length > 100) fail('Collaborator limit reached');
  const updated = await Deck.findOneAndUpdate({ deckId: deck.deckId, revision: deck.revision }, { $set: { collaborators }, $inc: { revision: 1 } }, { new: true }).lean();
  if (!updated) fail('Presentation changed', 409);
  revokeRoom(deck.deckId); send(res, publicDeck(updated, 'owner'));
}));
async function withAi(req, res, action, ending = false) {
  const { deck, role } = await auth(req, ending ? 'owner' : 'editor');
  if (ending && deck.sessionEnded) return send(res, publicDeck(deck, role));
  if (deck.receipts.includes(req.body.mutation_id)) return send(res, publicDeck(deck, role));
  if (deck.sessionEnded) fail('This AI session has ended. Manual editing is still available.', 409);
  checkRevision(req, deck);
  if (typeof req.body.mutation_id !== 'string' || !req.body.mutation_id || req.body.mutation_id.length > 128) fail('mutation_id is required');
  const lockId = crypto.randomUUID();
  const locked = await Deck.updateOne({ deckId: deck.deckId, revision: deck.revision, sessionEnded: false, $or: [{ aiLock: null }, { 'aiLock.until': { $lt: new Date() } }] }, { $set: { aiLock: { id: lockId, until: new Date(Date.now() + 360000) } } });
  if (!locked.modifiedCount) fail('Another AI request is in progress', 409);
  try { await action(deck, role); } finally { await Deck.updateOne({ deckId: deck.deckId, 'aiLock.id': lockId }, { $set: { aiLock: null } }); }
}
router.post('/decks/:deckId/ai/suggest', wrap(async (req, res) => withAi(req, res, async (deck, role) => {
  const slide = deck.slides.find(s => s.id === req.body.slide_id);
  const query = String(req.body.query || '').trim();
  if (!slide || !query || query.length > 500) fail('Select a slide and enter a message of 1-500 characters');
  const requestId = req.body.mutation_id;
  const selected = (Array.isArray(req.body.selected_element_ids) ? req.body.selected_element_ids : []).filter(id => slide.elements.some(e => e.id === id));
  const payload = { tool: 'gradeup', session_id: deck.pythonSessionId, deck_ref: deck.deckRef, slide_id: slide.id, slide_index: deck.slides.findIndex(s => s.id === slide.id), base_revision: deck.revision, request_id: requestId, query, slide_snapshot: slide, selected_element_ids: selected, theme_spec: deck.theme, other_slides: deck.slides.filter(s => s.id !== slide.id).map(s => ({ id: s.id, title: s.title, text: s.elements.filter(e => e.type === 'text').map(e => e.text).join('\n').slice(0, 2000) })) };
  console.info('[presentation:suggest] request', { requestId, deckId: deck.deckId, sessionId: deck.pythonSessionId, slideId: slide.id, slideIndex: payload.slide_index, revision: deck.revision, queryLength: query.length });
  const response = await callPython({ method: 'post', path: '/ppt/suggest', data: payload });
  if (Buffer.byteLength(JSON.stringify(response)) > 65536) fail('AI response exceeds editor size limit', 502);
  console.info('[presentation:suggest] response', { requestId, status: response.status, intent: response.intent, operations: response.operations?.length || 0, images: response.images?.length || 0 });
  if (process.env.PRESENTATION_DEBUG_LOGS === 'true') console.info('[presentation:suggest] debug', JSON.stringify({ request: payload, response }).slice(0, 16000));
  if (!['done', 'guidance', 'images', 'awaiting_approval', 'ready_to_apply'].includes(response.status)) fail('Python returned an unsupported editor response', 502);
  if (response.ai_feedback !== undefined && typeof response.ai_feedback !== 'string') fail('Python returned invalid feedback', 502);
  if (response.suggestions !== undefined && (!Array.isArray(response.suggestions) || response.suggestions.some(s => typeof s !== 'string'))) fail('Python returned invalid suggestions', 502);
  if (response.images !== undefined && (!Array.isArray(response.images) || response.images.some(i => !i || typeof i.url !== 'string' || !/^https:\/\//.test(i.url) || (i.title !== undefined && typeof i.title !== 'string')))) fail('Python returned invalid images', 502);
  const operations = response.operations || [];
  if (!Array.isArray(operations)) fail('Python must return an operations array', 502);
  // All writes use a visible proposal, including Python auto-apply requests.
  let proposal = null;
  if (operations.length || response.status === 'awaiting_approval') {
    if (!operations.length || typeof response.proposal_id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(response.proposal_id)) fail('Python must return proposal_id and editor operations', 502);
    applyOperations(documentOf(deck), operations);
    proposal = { id: response.proposal_id, slideId: slide.id, baseRevision: deck.revision + 1, operations, feedback: response.ai_feedback || '', createdBy: user(req) };
  }
  const assistant = { id: crypto.randomUUID(), role: 'assistant', text: String(response.ai_feedback || ''), suggestions: response.suggestions || [], images: (response.images || []).slice(0, 10), slideId: slide.id };
  const messages = [...deck.messages, { id: requestId, role: 'user', text: query, slideId: slide.id }, assistant].slice(-100);
  await auth(req, 'editor');
  const updated = await commit(deck, documentOf(deck), user(req), requestId, { messages, proposal });
  send(res, publicDeck(updated, role));
})));
router.post('/decks/:deckId/ai/decide', wrap(async (req, res) => withAi(req, res, async (deck, role) => {
  const p = deck.proposal;
  if (!p || p.id !== req.body.proposal_id) fail('This proposal is no longer pending', 409);
  if (!['approve','reject','skip'].includes(req.body.decision)) fail('Invalid decision');
  if (req.body.decision === 'approve' && p.baseRevision !== deck.revision) fail('The deck changed after this proposal. Ask AI for a fresh proposal.', 409);
  const response = await callPython({ method: 'post', path: '/ppt/decide', data: { tool: 'gradeup', session_id: deck.pythonSessionId, proposal_id: p.id, decision: req.body.decision, request_id: req.body.mutation_id, base_revision: deck.revision, execution: 'node' } });
  if (response.status !== 'done' || response.proposal_id !== p.id) fail('Python did not acknowledge this proposal', 502);
  await auth(req, 'editor');
  // Commit the exact reviewed operations, never a different set returned on approval.
  const next = req.body.decision === 'approve' ? applyOperations(documentOf(deck), p.operations) : documentOf(deck);
  const messages = [...deck.messages, { id: crypto.randomUUID(), role: 'assistant', text: req.body.decision === 'approve' ? 'Approved changes saved.' : 'Proposal dismissed.', slideId: p.slideId }].slice(-100);
  send(res, publicDeck(await commit(deck, next, user(req), req.body.mutation_id, { messages, proposal: null }), role));
})));
router.post('/decks/:deckId/session/end', wrap(async (req, res) => withAi(req, res, async (deck, role) => {
  const response = await callPython({ method: 'post', path: '/ppt/session/end', data: { session_id: deck.pythonSessionId, tool: 'gradeup', request_id: req.body.mutation_id } });
  if (response.status !== 'ended' || response.session_id !== deck.pythonSessionId) fail('Python did not confirm this session ended', 502);
  send(res, publicDeck(await commit(deck, documentOf(deck), user(req), req.body.mutation_id, { sessionEnded: true, proposal: null }), role));
}, true)));
module.exports = router;
