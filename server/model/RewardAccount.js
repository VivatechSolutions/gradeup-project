const mongoose = require("mongoose");

const rewardAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
      index: true,
    },
    pointsBalance: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("RewardAccount", rewardAccountSchema);
