const mongoose = require("mongoose");

const subjectUploadSchema = new mongoose.Schema(
  {
    board: { type: String, required: true, trim: true },
    standard: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    subjectGroupKey: { type: String, default: null, trim: true, index: true },
    uploadTitle: { type: String, required: true, trim: true },
    part: { type: String, default: null, trim: true, index: true },
    term: { type: String, default: null, trim: true, index: true },
    unitOrChapterName: { type: String, default: null, trim: true },
    originalFileName: { type: String, required: true },
    uploadType: {
      type: String,
      enum: ["pdf", "text", "content"],
      default: "pdf",
    },
    processingMode: {
      type: String,
      enum: ["single_unit", "multiple_units"],
      default: "single_unit",
    },
    multiFileUpload: {
      isMultiFile: { type: Boolean, default: false },
      totalFiles: { type: Number, default: 1 },
      queuedFilePaths: { type: [String], default: [] },
      fileMetadata: { type: mongoose.Schema.Types.Mixed, default: null },
      processedFiles: { type: Number, default: 0 },
      failedFiles: { type: [String], default: [] },
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
    transactionId: { type: String, default: null, index: true },
    lastProcessAttempt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Indices for queue processing
subjectUploadSchema.index({ status: 1, createdAt: 1 });
subjectUploadSchema.index({ transactionId: 1 });
subjectUploadSchema.index({ subjectGroupKey: 1, part: 1, term: 1 });

module.exports = mongoose.model("SubjectUpload", subjectUploadSchema);
