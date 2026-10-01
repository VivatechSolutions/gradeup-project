const crypto = require("crypto");
const { validateNewPassword, hashPassword, verifyPassword } = require("../services/studentPassword");
const User = require("../model/User");
const Credential = require("../model/PasswordCredential");
const Session = require("../model/AuthSession");
const { getEmailTransporter, sendEmail } = require("../config/EmailTransporter");
const { getStudentPasswordResetEmail } = require("../config/EmailTemplate");
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
        const result = await sendEmail({ to: user.email, ...getStudentPasswordResetEmail({ name: user.firstName, resetUrl: url.toString() }) });
        if (result?.skipped) throw new Error("Email unavailable");
      } catch (error) {
        await Credential.updateOne({ _id: credential._id, resetTokenHash: tokenHash }, { $unset: { resetTokenHash: 1, resetExpiresAt: 1 } });
        throw error;
      }
    }
    return res.json({ message: "If an account is registered with this email, we’ve sent a reset link. Check your inbox and spam folder." });
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
    if (!validToken(token)) return res.status(400).json({ message: "Invalid or expired reset link" });
    const passwordError = validateNewPassword(newPassword);
    if (passwordError) return res.status(400).json({ message: passwordError, field: "password" });
    const existing = await Credential.findOne(filter(token));
    const user = existing && await User.findOne({ _id: existing.userId, status: "active", deletedAt: null });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset link" });
    if (await verifyPassword(newPassword, existing.passwordHash)) return res.status(400).json({ message: "Choose a password different from your current password.", field: "password" });
    const passwordHash = await hashPassword(newPassword);
    // Conditional update consumes the token exactly once, including concurrent requests.
    const credential = await Credential.findOneAndUpdate({ ...filter(token), passwordHash: existing.passwordHash }, {
      $set: { passwordHash, bcryptCost: 0, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null },
      $unset: { resetTokenHash: 1, resetExpiresAt: 1 },
    });
    if (!credential) return res.status(400).json({ message: "Invalid or expired reset link" });
    await Session.updateMany({ userId: credential.userId, status: { $in: ["active", "rotated"] } }, { $set: { status: "revoked", revokedAt: new Date() } });
    clearAuthCookies(res);
    return res.json({ message: "Password updated. Please sign in again." });
  } catch { return res.status(503).json({ message: "Unable to reset password. Please try again." }); }
};
