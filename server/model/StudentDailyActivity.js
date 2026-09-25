const mongoose = require("mongoose");

const studentDailyActivitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    localDate: { type: String, required: true, trim: true, index: true },
    timezone: { type: String, default: "UTC", trim: true },
    visited: { type: Boolean, default: false },
    activeSeconds: { type: Number, default: 0, min: 0 },
    completedActivities: { type: Number, default: 0, min: 0 },
    assessedActivities: { type: Number, default: 0, min: 0 },
    earnedPoints: { type: Number, default: 0 },
    qualifiesForStudyStreak: { type: Boolean, default: false, index: true },
    milestoneMinutes: { type: [Number], default: [] },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

studentDailyActivitySchema.index({ userId: 1, localDate: 1 }, { unique: true });

module.exports = mongoose.model("StudentDailyActivity", studentDailyActivitySchema);
