const mongoose = require('mongoose');
module.exports = mongoose.model('PresentationShare', new mongoose.Schema({
  deckId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  role: { type: String, enum: ['viewer', 'editor'], required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true }));
