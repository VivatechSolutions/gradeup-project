const mongoose = require("mongoose");

const homeworkChatMessageSchema = new mongoose.Schema(
  {
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const homeworkChatSessionSchema = new mongoose.Schema(
  {
    candidateId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    candidateName: {
      type: String,
      default: "GradeUp Learner",
      trim: true,
    },
    homeworkId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      default: "Homework chat",
      trim: true,
    },
    subjectGroupKey: { type: String, default: null, trim: true, index: true },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectUnit",
      default: null,
      index: true,
    },
    unitTitle: { type: String, default: null, trim: true },
    subject: { type: String, default: null, trim: true, index: true },
    unitNumber: { type: Number, default: null },
    board: { type: String, default: null, trim: true },
    classNumber: { type: String, default: null, trim: true },
    term: { type: String, default: null, trim: true },
    topicId: { type: String, default: null, trim: true },
    topicLabel: { type: String, default: null, trim: true },
    status: { type: String, default: "pending", trim: true, index: true },
    action: { type: String, default: null, trim: true },
    currentQuestion: { type: String, default: null, trim: true },
    currentQuestionIndex: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    messages: {
      type: [homeworkChatMessageSchema],
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

homeworkChatSessionSchema.index({ candidateId: 1, homeworkId: 1 }, { unique: true });
homeworkChatSessionSchema.index({ candidateId: 1, lastActivityAt: -1 });

module.exports = mongoose.model("HomeworkChatSession", homeworkChatSessionSchema);
