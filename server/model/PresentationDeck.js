const mongoose = require('mongoose');

// Slides live in the deck document so a revision and its edits commit atomically.
const schema = new mongoose.Schema({
  deckId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true, index: true },
  deckRef: { type: String, required: true },
  pythonSessionId: { type: String, required: true },
  editUrl: { type: String, required: true },
  embedUrl: { type: String, required: true },
  title: { type: String, required: true },
  context: mongoose.Schema.Types.Mixed,
  theme: { type: mongoose.Schema.Types.Mixed, default: {} },
  slides: { type: [mongoose.Schema.Types.Mixed], default: [] },
  revision: { type: Number, default: 0 },
  sessionEnded: { type: Boolean, default: false },
  collaborators: { type: [mongoose.Schema.Types.Mixed], default: [] },
  messages: { type: [mongoose.Schema.Types.Mixed], default: [] },
  proposal: { type: mongoose.Schema.Types.Mixed, default: null },
  aiLock: { type: mongoose.Schema.Types.Mixed, default: null },
  receipts: { type: [String], default: [] },
  history: { type: [mongoose.Schema.Types.Mixed], default: [] },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
module.exports = mongoose.model('PresentationDeck', schema);
