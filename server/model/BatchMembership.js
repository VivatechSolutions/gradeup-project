const mongoose = require("mongoose");

const batchMembershipSchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

batchMembershipSchema.index({ batchId: 1, studentProfileId: 1 }, { unique: true });

module.exports = mongoose.model("BatchMembership", batchMembershipSchema);
