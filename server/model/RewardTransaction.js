const mongoose = require("mongoose");

const rewardTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rewardAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RewardAccount",
      required: true,
      index: true,
    },
    points: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    sourceType: { type: String, required: true, trim: true, index: true },
    sourceId: { type: String, default: null, trim: true, index: true },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("RewardTransaction", rewardTransactionSchema);
