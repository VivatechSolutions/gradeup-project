const mongoose = require("mongoose");

const studentProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
      index: true,
    },
    subjectGroupKey: { type: String, default: null, trim: true, index: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "BookContent", default: null, index: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "SubjectUnit", default: null, index: true },
    activityType: {
      type: String,
      enum: ["book_view", "unit_view", "tutor", "quiz", "homework", "debate", "seminar"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["started", "in_progress", "completed"],
      default: "in_progress",
      index: true,
    },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    score: { type: Number, default: null },
    timeSpentMinutes: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

studentProgressSchema.index({
  userId: 1,
  activityType: 1,
  subjectGroupKey: 1,
  unitId: 1,
});

module.exports = mongoose.model("StudentProgress", studentProgressSchema);
