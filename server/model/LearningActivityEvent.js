const mongoose = require("mongoose");

const learningActivityEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true, trim: true },
    idempotencyKey: { type: String, required: true, unique: true, index: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    activityType: {
      type: String,
      enum: ["book_view", "unit_view", "tutor", "quiz", "homework", "exam", "debate", "seminar", "avatar", "focus", "daily_visit"],
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["started", "heartbeat", "section_completed", "submitted", "scored", "completed", "check_in"],
      required: true,
      index: true,
    },
    sourceId: { type: String, default: null, trim: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "StudySession", default: null, index: true },
    subjectGroupKey: { type: String, default: null, trim: true, index: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "BookContent", default: null, index: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "SubjectUnit", default: null, index: true },
    sectionId: { type: String, default: null, trim: true },
    rawScore: { type: Number, default: null },
    maximumScore: { type: Number, default: null },
    normalizedScore: { type: Number, default: null, min: 0, max: 100 },
    activeSeconds: { type: Number, default: 0, min: 0 },
    occurredAt: { type: Date, default: Date.now, index: true },
    timezone: { type: String, default: "UTC", trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

learningActivityEventSchema.index({ userId: 1, occurredAt: -1 });
learningActivityEventSchema.index({ userId: 1, subjectGroupKey: 1, occurredAt: -1 });

module.exports = mongoose.model("LearningActivityEvent", learningActivityEventSchema);
