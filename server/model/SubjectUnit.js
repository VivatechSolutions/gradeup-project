const mongoose = require("mongoose");

const subjectUnitSchema = new mongoose.Schema(
  {
    uploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectUpload",
      required: true,
      index: true,
    },
    documentId: { type: String, required: true, unique: true, index: true },
    sourceDocumentId: { type: String, default: null, trim: true, index: true },
    board: { type: String, required: true, trim: true },
    standard: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    subjectGroupKey: { type: String, default: null, trim: true, index: true },
    part: { type: String, default: null, trim: true, index: true },
    term: { type: String, default: null, trim: true, index: true },
    partSequence: { type: Number, default: null },
    termSequence: { type: Number, default: null },
    unitNumber: { type: Number, default: null },
    unitTitle: { type: String, required: true, trim: true },
    unitLabel: { type: String, required: true, trim: true },
    chapterName: { type: String, default: null, trim: true },
    originalFileName: { type: String, required: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
    processing: {
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "completed",
      },
      message: { type: String, default: null },
      pythonResponse: { type: mongoose.Schema.Types.Mixed, default: null },
      processedAt: { type: Date, default: null },
    },
    structuredData: { type: mongoose.Schema.Types.Mixed, default: null },
    enrichedData: { type: mongoose.Schema.Types.Mixed, default: null },
    debateTopics: { type: mongoose.Schema.Types.Mixed, default: null },
    readerIndex: {
      sections: { type: [String], default: [] },
      hasGlossary: { type: Boolean, default: false },
      hasSummary: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

// Index for part-wise & term-wise grouping
subjectUnitSchema.index({ subjectGroupKey: 1, part: 1, term: 1, unitNumber: 1 });
subjectUnitSchema.index({ board: 1, standard: 1, subject: 1, part: 1, term: 1 });

module.exports = mongoose.model("SubjectUnit", subjectUnitSchema);
