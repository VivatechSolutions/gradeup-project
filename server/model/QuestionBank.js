const mongoose = require("mongoose");

const questionBankSchema = new mongoose.Schema(
  {
    documentId: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true,
      trim: true 
    },
    examName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    year: { 
      type: String, 
      required: true,
      trim: true 
    },
    board: { 
      type: String, 
      required: true, 
      trim: true,
      index: true
    },
    classNumber: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    subject: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
      subjectGroupKey: {
    type: String,
    required: true,
    index: true,  // Index for faster queries by group
  },
    unitName: { 
      type: String, 
      default: null,
      trim: true 
    },
    unitNumber: { 
      type: Number, 
      default: null 
    },
    totalQuestions: { 
      type: Number, 
      default: 0 
    },
    difficultyDistribution: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
    },
    questions: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    originalFileName: { 
      type: String, 
      required: true 
    },
    uploadedBy: {
      type: String,
      ref: "AdminUser",
      // required: true,
    },
    metadataId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectMetadata",
      index: true
    },
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "completed",
    },
    processingError: { 
      type: String, 
      default: null 
    },
    processedAt: { 
      type: Date, 
      default: null 
    },
  },
  { timestamps: true },
);

// Index for common queries
questionBankSchema.index({ board: 1, classNumber: 1, subject: 1 });
questionBankSchema.index({ metadataId: 1 });

module.exports = mongoose.model("QuestionBank", questionBankSchema);