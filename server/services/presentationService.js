const crypto = require('crypto');
const Deck = require('../model/PresentationDeck');
const Share = require('../model/PresentationShare');
const Asset = require('../model/PresentationAsset');
const { fail, validateStart, validateDocument, hashToken } = require('./presentationDocument');
let io;
const room = id => `presentation:${id}`;
function attachPresentationSocket(serverIo) {
  io = serverIo;
  io.on('connection', socket => {
    socket.on('presentation:join', async ({ deckId, shareToken } = {}, ack) => {
      try {
        await access(deckId, socket.authUser.id, shareToken);
        await socket.join(room(deckId));
        ack?.({ status: true });
        io.to(room(deckId)).emit('presentation:presence', { count: io.sockets.adapter.rooms.get(room(deckId))?.size || 0 });
      } catch { ack?.({ status: false }); }
    });
    socket.on('presentation:leave', ({ deckId } = {}) => socket.leave(room(deckId)));
    socket.on('disconnecting', () => {
      for (const key of socket.rooms) if (key.startsWith('presentation:')) socket.to(key).emit('presentation:presence', { count: Math.max(0, (io.sockets.adapter.rooms.get(key)?.size || 1) - 1) });
    });
  });
}
function emitChange(deck) {
  // Broadcast revision only. Clients must reauthorize before fetching content.
  io?.to(room(deck.deckId)).emit('presentation:changed', { deckId: deck.deckId, revision: deck.revision });
}
function revokeRoom(deckId) {
  io?.to(room(deckId)).emit('presentation:access-changed');
  io?.in(room(deckId)).socketsLeave(room(deckId));
}
async function access(deckId, userId, token, needed = 'viewer') {
  const deck = await Deck.findOne({ deckId, deletedAt: null }).lean();
  if (!deck) fail('Presentation not found', 404);
  let role = String(deck.ownerId) === String(userId) ? 'owner' : deck.collaborators.find(v => v.userId === String(userId))?.role;
  if (token && role !== 'owner' && role !== 'editor') {
    const share = await Share.findOne({ deckId, tokenHash: hashToken(token), revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
    if (share) role = share.role;
  }
  if (!role || (needed === 'editor' && !['owner','editor'].includes(role)) || (needed === 'owner' && role !== 'owner')) fail('You do not have permission for this presentation', 403);
  return { deck, role };
}
function publicDeck(deck, role) {
  const { _id, ownerId, aiLock, receipts, history, __v, collaborators, ...data } = deck;
  return { ...data, role, collaborators: role === 'owner' ? collaborators : [], messages: role === 'viewer' ? [] : deck.messages, proposal: role === 'viewer' ? null : deck.proposal };
}
async function validateAssets(deckId, document) {
  const ids = [...new Set(document.slides.flatMap(s => s.elements.filter(e => e.type === 'image').map(e => e.assetId)))];
  if (ids.length && await Asset.countDocuments({ deckId, assetId: { $in: ids } }) !== ids.length) fail('Image asset does not belong to this deck');
}
async function persistPythonDeck(data, payload, userId) {
  validateStart(data);
  const document = { title: data.title || payload.title, slides: data.initial_slides, theme: data.theme_spec || {} };
  validateDocument(document);
  await validateAssets(data.deck_id, document);
  const existing = await Deck.findOne({ deckId: data.deck_id }).lean();
  if (existing) {
    if (existing.ownerId !== String(userId) || existing.pythonSessionId !== data.session_id || existing.deletedAt) fail('Python returned a deck already assigned to another session', 409);
    return existing;
  }
  return Deck.create({
    deckId: data.deck_id, ownerId: String(userId), deckRef: data.deck_ref,
    pythonSessionId: data.session_id, editUrl: data.edit_url, embedUrl: data.embed_url,
    ...document, context: { board: payload.board, class_number: payload.class_number, chapter: payload.chapter, subject: payload.subject, term: payload.term },
    messages: data.guidance ? [{ id: crypto.randomUUID(), role: 'assistant', text: data.guidance }] : [],
  });
}
async function commit(deck, document, userId, mutationId, extra = {}) {
  if (typeof mutationId !== 'string' || mutationId.length > 128 || !mutationId) fail('mutation_id is required');
  if (deck.receipts.includes(mutationId)) return deck;
  validateDocument(document);
  await validateAssets(deck.deckId, document);
  const updated = await Deck.findOneAndUpdate({ deckId: deck.deckId, revision: deck.revision, deletedAt: null }, {
    $set: { ...document, ...extra }, $inc: { revision: 1 },
    $push: { receipts: { $each: [mutationId], $slice: -100 }, history: { $each: [{ revision: deck.revision, by: userId, at: new Date(), title: deck.title, theme: deck.theme, slides: deck.slides }], $slice: -5 } },
  }, { new: true }).lean();
  if (!updated) fail('Presentation changed. Reload the latest version before saving.', 409);
  emitChange(updated);
  return updated;
}
module.exports = { access, publicDeck, commit, persistPythonDeck, attachPresentationSocket, emitChange, revokeRoom };
