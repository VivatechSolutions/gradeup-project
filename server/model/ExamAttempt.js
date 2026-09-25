const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, trim: true },
    answer: { type: String, default: "" },
    savedAt: { type: Date, default: Date.now },
    syncedAt: { type: Date, default: null },
  },
  { _id: false },
);

const warningSchema = new mongoose.Schema(
  {
    reason: { type: String, required: true, trim: true },
    questionId: { type: String, default: null, trim: true },
    message: { type: String, default: null, trim: true },
    occurredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const examAttemptSchema = new mongoose.Schema(
  {
    examId: { type: String, required: true, unique: true, index: true, trim: true },
    candidateId: { type: String, required: true, index: true, trim: true },
    candidateName: { type: String, default: "GradeUp Learner", trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "SubjectUnit", default: null, index: true },
    subjectGroupKey: { type: String, default: null, trim: true, index: true },
    subject: { type: String, required: true, trim: true, index: true },
    board: { type: String, default: null, trim: true },
    classNumber: { type: String, default: null, trim: true },
    unitNumber: { type: Number, default: null },
    unitName: { type: String, default: null, trim: true },
    examType: { type: String, default: "mixed", trim: true },
    questions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    answers: { type: [answerSchema], default: [] },
    currentQuestionId: { type: String, default: null, trim: true },
    currentQuestionIndex: { type: Number, default: 0, min: 0 },
    reviewQuestionIds: { type: [String], default: [] },
    totalQuestions: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    timerSeconds: { type: Number, default: null, min: 0 },
    startedAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ["in_progress", "evaluating", "completed", "ended"],
      default: "in_progress",
      index: true,
    },
    submissionReason: {
      type: String,
      enum: ["manual", "time_expired", "security_warnings", null],
      default: null,
    },
    warningCount: { type: Number, default: 0, min: 0 },
    warnings: { type: [warningSchema], default: [] },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    submittedAt: { type: Date, default: null },
    submissionStartedAt: { type: Date, default: null },
    submissionError: { type: String, default: null },
    upstream: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

examAttemptSchema.index({ userId: 1, updatedAt: -1 });
examAttemptSchema.index({ status: 1, expiresAt: 1 });
examAttemptSchema.index({ userId: 1, subject: 1, unitNumber: 1, status: 1 });

module.exports = mongoose.model("ExamAttempt", examAttemptSchema);
