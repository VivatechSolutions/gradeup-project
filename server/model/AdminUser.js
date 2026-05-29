const mongoose = require("mongoose");

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "super_admin"],
      default: "admin",
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    mustResetPassword: { type: Boolean, default: true },
    passwordChangedAt: { type: Date, default: null },
    passwordResetIssuedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AdminUser", adminUserSchema);
