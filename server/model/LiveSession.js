const mongoose = require("mongoose");

const sessionParticipantSchema = new mongoose.Schema(
  {
    participantId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: "participant", trim: true },
    isAi: { type: Boolean, default: false },
    isHost: { type: Boolean, default: false },
    team: { type: String, enum: ["A", "B", null], default: null },
    teamOrder: { type: Number, default: null },
    status: { type: String, default: "waiting", trim: true },
    warningCount: { type: Number, default: 0 },
    warnings: { type: [String], default: [] },
    joinedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const sessionTurnSchema = new mongoose.Schema(
  {
    turnId: { type: String, required: true, trim: true },
    speakerId: { type: String, default: null, trim: true },
    speakerName: { type: String, default: null, trim: true },
    role: { type: String, enum: ["user", "assistant", "moderator", "team_a", "team_b"], default: "user" },
    team: { type: String, enum: ["A", "B", null], default: null },
    turnType: { type: String, default: "message", trim: true },
    message: { type: String, default: null, trim: true },
    transcript: { type: String, default: null, trim: true },
    roundNumber: { type: Number, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const liveSessionSchema = new mongoose.Schema(
  {
    sessionType: {
      type: String,
      enum: ["debate", "seminar"],
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    candidateId: { type: String, required: true, trim: true, index: true },
    candidateName: { type: String, default: "GradeUp Learner", trim: true },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectUnit",
      default: null,
      index: true,
    },
    documentId: { type: String, default: null, trim: true },
    subjectGroupKey: { type: String, default: null, trim: true, index: true },
    board: { type: String, default: null, trim: true },
    standard: { type: String, default: null, trim: true },
    subject: { type: String, default: null, trim: true, index: true },
    unitNumber: { type: Number, default: null },
    unitTitle: { type: String, default: null, trim: true },
    topic: { type: String, required: true, trim: true, index: true },
    debateType: {
      type: String,
      default: "1_vs_ai",
      trim: true,
    },
    hostCandidateId: { type: String, default: null, trim: true, index: true },
    hostCandidateName: { type: String, default: null, trim: true },
    roomCode: { type: String, default: null, trim: true, index: true },
    shareLink: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ["created", "waiting", "active", "waiting_for_ai", "ending", "completed", "end_error"],
      default: "active",
      index: true,
    },
    participants: {
      type: [sessionParticipantSchema],
      default: [],
    },
    teams: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    currentRound: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    warnings: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    turns: {
      type: [sessionTurnSchema],
      default: [],
    },
    feedback: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    scores: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    results: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

liveSessionSchema.index({ sessionType: 1, subjectGroupKey: 1, status: 1 });
liveSessionSchema.index({ candidateId: 1, sessionType: 1, updatedAt: -1 });

module.exports = mongoose.model("LiveSession", liveSessionSchema);
