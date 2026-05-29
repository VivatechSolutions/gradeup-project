const mongoose = require("mongoose");

const subjectUploadSchema = new mongoose.Schema(
  {
    board: { type: String, required: true, trim: true },
    standard: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    subjectGroupKey: { type: String, default: null, trim: true, index: true },
    uploadTitle: { type: String, required: true, trim: true },
    part: { type: String, default: null, trim: true },
    unitOrChapterName: { type: String, default: null, trim: true },
    originalFileName: { type: String, required: true },
    uploadType: {
      type: String,
      enum: ["pdf", "text", "content"],
      default: "pdf",
    },
    processingMode: {
      type: String,
      enum: ["single_unit", "whole_subject"],
      default: "single_unit",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "queued", "processing", "completed", "failed"],
      default: "pending",
    },
    queuePosition: { type: Number, default: null },
    queuedFilePath: { type: String, default: null },
    skipEnrichment: { type: Boolean, default: false },
    skipQdrant: { type: Boolean, default: false },
    skipLlmRefinement: { type: Boolean, default: false },
    progressPercent: { type: Number, default: 0 },
    progressStage: { type: String, default: "queued", trim: true },
    progressMessage: { type: String, default: null, trim: true },
    processedUnits: { type: Number, default: 0 },
    totalUnits: { type: Number, default: 0 },
    pythonResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: mongoose.Schema.Types.Mixed, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SubjectUpload", subjectUploadSchema);
