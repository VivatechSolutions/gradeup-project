const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { isValidStudentEmail, hasMailDomain, normalizeStudentEmail } = require("../utils/studentEmail");
const { sendVerification } = require("./studentEmailVerificationService");

function secret() {
  const value = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not configured");
  return value;
}
function issuePendingToken(user) {
  return jwt.sign({ userId: String(user._id), email: user.normalizedEmail, purpose: "edit-pending-email" }, secret(), { expiresIn: "15m" });
}

async function updatePendingEmail(token, email) {
  let proof;
  try { proof = jwt.verify(token, secret()); }
  catch { const error = new Error("Your edit session expired. Sign in again to edit your email."); error.statusCode = 401; throw error; }
  if (proof.purpose !== "edit-pending-email") { const error = new Error("Invalid edit session"); error.statusCode = 401; throw error; }
  const normalized = normalizeStudentEmail(email);
  if (!isValidStudentEmail(normalized) || !await hasMailDomain(normalized)) {
    const error = new Error("Please enter a valid email address that can receive mail."); error.statusCode = 400; throw error;
  }
  const user = await User.findOne({ _id: proof.userId, normalizedEmail: proof.email, status: "pending", deletedAt: null });
  if (!user) { const error = new Error("Your edit session is no longer valid."); error.statusCode = 401; throw error; }
  if (normalized === user.normalizedEmail) return { user, pendingToken: issuePendingToken(user), changed: false };
  if (await User.exists({ normalizedEmail: normalized, deletedAt: null })) {
    const error = new Error("This email address is already in use."); error.statusCode = 409; throw error;
  }
  const previous = user.email;
  user.email = normalized; user.normalizedEmail = normalized;
  user.emailVerificationTokenHash = null; user.emailVerificationExpiresAt = null; user.emailVerificationSentAt = null;
  try { await user.save(); } catch (cause) {
    if (cause.code === 11000) { const error = new Error("This email address is already in use."); error.statusCode = 409; throw error; }
    throw cause;
  }
  try { await sendVerification(user); }
  catch (cause) { user.email = previous; user.normalizedEmail = previous; await user.save(); throw cause; }
  return { user, pendingToken: issuePendingToken(user), changed: true };
}
module.exports = { issuePendingToken, updatePendingEmail };
