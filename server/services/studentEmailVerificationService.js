const crypto = require("crypto");
const User = require("../model/User");
const StudentProfile = require("../model/StudentProfile");
const { getEmailTransporter, sendEmail } = require("../config/EmailTransporter");
const { getStudentVerificationEmail, getStudentWelcomeEmail } = require("../config/EmailTemplate");
const { normalizeStudentEmail, isValidStudentEmail } = require("../utils/studentEmail");

const EXPIRY_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const digest = token => crypto.createHash("sha256").update(token).digest("hex");

function frontendUrl() {
  const value = process.env.FE_URL || process.env.APP_URL || process.env.FRONTEND_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    return url;
  } catch { return null; }
}

function requireVerificationConfiguration() {
  const appUrl = frontendUrl();
  if (!appUrl || !getEmailTransporter()) {
    const error = new Error("Verification email is unavailable. Please try again later.");
    error.statusCode = 503;
    throw error;
  }
  return appUrl;
}

async function sendVerification(user, { enforceCooldown = false } = {}) {
  const appUrl = requireVerificationConfiguration();
  const token = crypto.randomBytes(32).toString("hex");
  const hash = digest(token);
  const now = new Date();
  const conditions = { _id: user._id, status: "pending", deletedAt: null };
  if (enforceCooldown) conditions.$or = [
    { emailVerificationSentAt: null },
    { emailVerificationSentAt: { $lte: new Date(now.getTime() - RESEND_COOLDOWN_MS) } },
  ];
  const updated = await User.findOneAndUpdate(conditions, { $set: {
    emailVerificationTokenHash: hash,
    emailVerificationExpiresAt: new Date(now.getTime() + EXPIRY_MS),
    emailVerificationSentAt: now,
  } }, { new: true });
  if (!updated) return false;
  const url = new URL("/verify-email", appUrl);
  url.searchParams.set("token", token);
  const email = getStudentVerificationEmail({ name: user.firstName, verifyUrl: url.toString() });
  try {
    const result = await sendEmail({ to: user.email, ...email });
    if (result?.skipped) throw new Error("Email unavailable");
  } catch (cause) {
    await User.updateOne({ _id: user._id, emailVerificationTokenHash: hash }, { $set: {
      emailVerificationTokenHash: null, emailVerificationExpiresAt: null, emailVerificationSentAt: null,
    } });
    const error = new Error("Verification email could not be sent. Please try again later.");
    error.statusCode = 503;
    error.cause = cause;
    throw error;
  }
  return true;
}

async function resendVerification(email) {
  if (!isValidStudentEmail(email)) return;
  const user = await User.findOne({ normalizedEmail: normalizeStudentEmail(email), status: "pending", deletedAt: null });
  if (user) await sendVerification(user, { enforceCooldown: true });
}

async function verifyStudentEmail(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  const user = await User.findOneAndUpdate({
    emailVerificationTokenHash: digest(token), emailVerificationExpiresAt: { $gt: new Date() }, status: "pending", deletedAt: null,
  }, { $set: { status: "active", emailVerifiedAt: new Date(), emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null, emailVerificationSentAt: null } }, { new: true });
  if (!user) return false;
  StudentProfile.findOne({ userId: user._id }).lean().then(profile => {
    const welcome = getStudentWelcomeEmail({ name: user.firstName, appUrl: frontendUrl()?.toString(),
      board: profile?.independentLearningContext?.board,
      classNumber: profile?.independentLearningContext?.classNumber });
    return sendEmail({ to: user.email, ...welcome });
  }).catch(error => console.error("Student welcome email failed", error.message));
  return true;
}

module.exports = { requireVerificationConfiguration, sendVerification, resendVerification, verifyStudentEmail };
