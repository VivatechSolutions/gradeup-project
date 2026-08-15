const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    normalizedEmail: { type: String, required: true, trim: true, lowercase: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ["student"], default: "student", index: true },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "disabled"],
      default: "active",
      index: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

userSchema.index(
  { normalizedEmail: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

module.exports = mongoose.model("User", userSchema);
