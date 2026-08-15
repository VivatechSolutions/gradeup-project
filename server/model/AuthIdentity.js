const mongoose = require("mongoose");

const authIdentitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["google", "microsoft"], required: true },
    providerSubject: { type: String, required: true, trim: true },
    providerEmail: { type: String, default: null, lowercase: true, trim: true },
    providerEmailVerified: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    linkedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

authIdentitySchema.index({ provider: 1, providerSubject: 1 }, { unique: true });

module.exports = mongoose.model("AuthIdentity", authIdentitySchema);
