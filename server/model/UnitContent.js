const mongoose = require("mongoose");

const schema = mongoose.Schema;

const unitContentSchema = new schema(
  {
    unitKey: {
      type: String,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      required: true,
      enum: ["structured", "enriched"],
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    language: {
      type: String,
      default: "en",
    },
    title: String,
    source: {
      type: String,
      default: "python_pipeline",
    },
    documentId: String,
    content: {
      type: schema.Types.Mixed,
      required: true,
    },
    rawPayload: schema.Types.Mixed,
    metadata: schema.Types.Mixed,
    stats: {
      unitCount: Number,
      sectionCount: Number,
    },
  },
  { timestamps: true },
);

unitContentSchema.index({ unitKey: 1, contentType: 1, version: 1 }, { unique: true });
unitContentSchema.index({ unitKey: 1, contentType: 1, isActive: 1 });

module.exports = mongoose.model("UnitContent", unitContentSchema);
