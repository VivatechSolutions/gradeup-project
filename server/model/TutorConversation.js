const mongoose = require("mongoose");

const tutorMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: {
      type: [new mongoose.Schema({
        id: { type: String, required: true },
        key: { type: String, required: true },
        bucket: { type: String, required: true },
        name: String,
        type: String,
        size: Number,
      }, { _id: false })],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
  },
  { _id: false },
);

const tutorConversationSchema = new mongoose.Schema(
  {
    candidateId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    studentProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile", default: null, index: true },
    candidateName: {
      type: String,
      default: "GradeUp Learner",
      trim: true,
    },
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectUnit",
      default: null,
      index: true,
    },
    documentId: {
      type: String,
      default: null,
      trim: true,
    },
    subjectGroupKey: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    board: { type: String, default: null, trim: true },
    standard: { type: String, default: null, trim: true },
    subject: { type: String, default: null, trim: true, index: true },
    unitNumber: { type: Number, default: null },
    unitTitle: { type: String, default: null, trim: true },
    title: { type: String, default: "New Chat", trim: true },
    messages: {
      type: [tutorMessageSchema],
      default: [],
    },
    lastMessage: { type: String, default: null, trim: true },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

tutorConversationSchema.index({ candidateId: 1, lastActivityAt: -1 });
tutorConversationSchema.index({ candidateId: 1, conversationId: 1 });

module.exports = mongoose.model("TutorConversation", tutorConversationSchema);
