const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../model/User");
const Credential = require("../model/PasswordCredential");
const Session = require("../model/AuthSession");
const { getEmailTransporter, sendEmail } = require("../config/EmailTransporter");
const { clearAuthCookies } = require("../services/studentAuthService");
const digest = token => crypto.createHash("sha256").update(token).digest("hex");
const validToken = token => typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
const filter = token => ({ resetTokenHash: digest(token), resetExpiresAt: { $gt: new Date() } });

exports.forgot = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });
    const appUrl = process.env.FE_URL || process.env.APP_URL || process.env.FRONTEND_URL;
    if (!appUrl || !getEmailTransporter()) return res.status(503).json({ message: "Password reset email is not configured" });
    const user = await User.findOne({ normalizedEmail: email, deletedAt: null, status: "active" });
    const credential = user && await Credential.findOne({ userId: user._id });
    if (credential) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = digest(token);
      await Credential.updateOne({ _id: credential._id }, { $set: { resetTokenHash: tokenHash, resetExpiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
      const url = new URL("/reset-password", appUrl);
      url.searchParams.set("token", token);
      try {
        const result = await sendEmail({ to: user.email, subject: "Reset your GradeUp password", text: `Reset your password using this link within 15 minutes: ${url.toString()}\nIf you did not request this, ignore this email.` });
        if (result?.skipped) throw new Error("Email unavailable");
      } catch (error) {
        await Credential.updateOne({ _id: credential._id, resetTokenHash: tokenHash }, { $unset: { resetTokenHash: 1, resetExpiresAt: 1 } });
        throw error;
      }
    }
    return res.json({ message: "If an eligible account exists, a reset link has been sent. For Google or Microsoft accounts, sign in with that provider." });
  } catch {
    return res.status(503).json({ message: "Unable to send reset instructions. Please try again later." });
  }
};
exports.verify = async (req, res) => {
  try {
    const valid = validToken(req.query.token) && Boolean(await Credential.exists(filter(req.query.token)));
    return res.json({ valid });
  } catch { return res.status(503).json({ message: "Unable to verify reset link" }); }
};
exports.reset = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!validToken(token) || typeof newPassword !== "string" || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) {
      return res.status(400).json({ message: "A valid reset link and password of 8–72 bytes are required" });
    }
    const existing = await Credential.findOne(filter(token));
    const user = existing && await User.findOne({ _id: existing.userId, status: "active", deletedAt: null });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset link" });
    const bcryptCost = Number(process.env.BCRYPT_COST || 12);
    const passwordHash = await bcrypt.hash(newPassword, bcryptCost);
    // Conditional update consumes the token exactly once, including concurrent requests.
    const credential = await Credential.findOneAndUpdate(filter(token), {
      $set: { passwordHash, bcryptCost, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null },
      $unset: { resetTokenHash: 1, resetExpiresAt: 1 },
    });
    if (!credential) return res.status(400).json({ message: "Invalid or expired reset link" });
    await Session.updateMany({ userId: credential.userId, status: { $in: ["active", "rotated"] } }, { $set: { status: "revoked", revokedAt: new Date() } });
    clearAuthCookies(res);
    return res.json({ message: "Password updated. Please sign in again." });
  } catch { return res.status(503).json({ message: "Unable to reset password. Please try again." }); }
};
