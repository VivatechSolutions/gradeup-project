const mongoose = require("mongoose");

const groupInviteSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "GroupChat", required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    invitedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "revoked"],
      default: "pending",
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("GroupInvite", groupInviteSchema);
