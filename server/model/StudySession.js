const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    activityType: { type: String, required: true, trim: true, index: true },
    subjectGroupKey: { type: String, default: null, trim: true, index: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "BookContent", default: null },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "SubjectUnit", default: null },
    sourceId: { type: String, default: null, trim: true },
    timezone: { type: String, default: "UTC", trim: true },
    status: { type: String, enum: ["active", "completed", "expired"], default: "active", index: true },
    startedAt: { type: Date, default: Date.now },
    lastHeartbeatAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    activeSeconds: { type: Number, default: 0, min: 0 },
    lastSequence: { type: Number, default: 0, min: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

studySessionSchema.index({ userId: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model("StudySession", studySessionSchema);
