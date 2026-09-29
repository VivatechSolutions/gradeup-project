const mongoose = require("mongoose");

const passwordCredentialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    resetTokenHash: { type: String, index: true },
    resetExpiresAt: { type: Date },
    passwordHash: { type: String, required: true },
    bcryptCost: { type: Number, required: true },
    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date, default: Date.now },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PasswordCredential", passwordCredentialSchema);
