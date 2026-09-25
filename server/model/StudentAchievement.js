const mongoose = require("mongoose");

const studentAchievementSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    achievementKey: { type: String, required: true, trim: true, index: true },
    version: { type: Number, default: 1 },
    unlockedAt: { type: Date, required: true, default: Date.now },
    rewardPoints: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

studentAchievementSchema.index({ userId: 1, achievementKey: 1, version: 1 }, { unique: true });

module.exports = mongoose.model("StudentAchievement", studentAchievementSchema);
