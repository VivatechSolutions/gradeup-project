const mongoose = require("mongoose");

const authSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: { type: String, required: true, unique: true, index: true },
    familyId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["active", "rotated", "revoked", "reused"],
      default: "active",
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    absoluteExpiresAt: { type: Date, required: true, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    lastUsedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ userId: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model("AuthSession", authSessionSchema);
