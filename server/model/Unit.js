const mongoose = require("mongoose");

const schema = mongoose.Schema;

const unitSchema = new schema(
  {
    unitKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    board: {
      type: String,
      required: true,
      index: true,
    },
    grade: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      index: true,
    },
    part: {
      type: String,
      default: null,
    },
    unitNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: "en",
    },
    coverImageUrl: String,
    status: {
      type: String,
      default: "active",
    },
    metadata: schema.Types.Mixed,
  },
  { timestamps: true },
);

unitSchema.index({ board: 1, grade: 1, subject: 1, part: 1, unitNumber: 1 });

module.exports = mongoose.model("Unit", unitSchema);
