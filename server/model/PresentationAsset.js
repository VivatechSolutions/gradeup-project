const mongoose = require('mongoose');
module.exports = mongoose.model('PresentationAsset', new mongoose.Schema({
  assetId: { type: String, required: true, unique: true },
  deckId: { type: String, required: true, index: true },
  key: { type: String, required: true },
  mime: { type: String, required: true },
  bytes: Number,
  name: String,
  sourceUrl: String,
}, { timestamps: true }));
