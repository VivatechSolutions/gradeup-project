const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../model/User");
const PasswordCredential = require("../model/PasswordCredential");
const StudentProfile = require("../model/StudentProfile");
const AuthSession = require("../model/AuthSession");
const RewardAccount = require("../model/RewardAccount");
const { sendEmail } = require("../config/EmailTransporter");
const { getStudentWelcomeEmail } = require("../config/EmailTemplate");

const ACCESS_COOKIE = "gradeup_access";
const REFRESH_COOKIE = "gradeup_refresh";
const DEFAULT_ACCESS_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_REFRESH_TTL_DAYS = 30;
const DEFAULT_REFRESH_ABSOLUTE_DAYS = 90;

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function normalizeClassNumber(value = "") {
  return String(value).trim().replace(/^grade\s*/i, "");
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(48).toString("base64url");
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || null;
}

function cookieOptions(maxAgeSeconds, httpOnly = true) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: maxAgeSeconds * 1000,
    path: "/",
  };
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const accessTtl = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || DEFAULT_ACCESS_TTL_SECONDS);
  const refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || DEFAULT_REFRESH_TTL_DAYS);
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(accessTtl));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(refreshDays * 24 * 60 * 60));
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
}

function signAccessToken(user) {
  const expiresIn = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || DEFAULT_ACCESS_TTL_SECONDS);
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role || "student",
      tokenType: "access",
    },
    getJwtSecret(),
    { expiresIn },
  );
}

async function serializeUser(user) {
  const profile = await StudentProfile.findOne({ userId: user._id }).lean();
  const rewards = await RewardAccount.findOne({ userId: user._id }).lean();
  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    email: user.email,
    username: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role || "student",
    grade: profile?.independentLearningContext?.classNumber || null,
    board: profile?.independentLearningContext?.board || null,
    school: profile?.schoolContext?.name || null,
    schoolStatus: profile?.schoolContext?.status || "none",
    points: rewards?.pointsBalance || 0,
    level: rewards?.level || 1,
    status: user.status,
    profile,
  };
}

async function createSession(user, req) {
  const refreshToken = randomToken();
  const refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || DEFAULT_REFRESH_TTL_DAYS);
  const absoluteDays = Number(process.env.REFRESH_TOKEN_ABSOLUTE_DAYS || DEFAULT_REFRESH_ABSOLUTE_DAYS);
  await AuthSession.create({
    userId: user._id,
    refreshTokenHash: hashToken(refreshToken),
    familyId: crypto.randomUUID(),
    expiresAt: daysFromNow(refreshDays),
    absoluteExpiresAt: daysFromNow(absoluteDays),
    ip: req.ip,
    userAgent: req.get("user-agent") || null,
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

async function registerIndependentStudent(payload, req) {
  const email = normalizeEmail(payload.email);
  if (!email || !payload.password || !payload.firstName || !payload.lastName) {
    const error = new Error("firstName, lastName, email and password are required");
    error.statusCode = 400;
    throw error;
  }
  if (String(payload.password).length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }
  const board = String(payload.board || "").trim();
  const classNumber = normalizeClassNumber(payload.classNumber || payload.grade || payload.class || "");
  if (!payload.schoolName || !board || !classNumber) {
    const error = new Error("schoolName, board and classNumber are required for student signup");
    error.statusCode = 400;
    throw error;
  }

  const existing = await User.findOne({ normalizedEmail: email, deletedAt: null });
  if (existing) {
    const error = new Error("An account already exists for this email");
    error.statusCode = 409;
    throw error;
  }

  const user = await User.create({
    email,
    normalizedEmail: email,
    firstName: String(payload.firstName).trim(),
    lastName: String(payload.lastName).trim(),
    role: "student",
    status: "active",
  });

  const bcryptCost = Number(process.env.BCRYPT_COST || 12);
  await PasswordCredential.create({
    userId: user._id,
    passwordHash: await bcrypt.hash(payload.password, bcryptCost),
    bcryptCost,
  });

  const profile = await StudentProfile.create({
    userId: user._id,
    schoolContext: {
      name: payload.schoolName ? String(payload.schoolName).trim() : null,
      status: payload.schoolName ? "unverified" : "none",
    },
    independentLearningContext: {
      board,
      classNumber,
      subjects: Array.isArray(payload.subjects) ? payload.subjects.map(String) : [],
    },
  });

  await RewardAccount.create({ userId: user._id, studentProfileId: profile._id });

  const appUrl = process.env.FE_URL || process.env.APP_URL || process.env.FRONTEND_URL || "";
  const welcome = getStudentWelcomeEmail({
    name: user.firstName,
    appUrl,
    board: profile.independentLearningContext.board,
    classNumber: profile.independentLearningContext.classNumber,
  });
  await sendEmail({
    to: user.email,
    subject: welcome.subject,
    text: welcome.text,
    html: welcome.html,
  }).catch((error) => {
    console.log("Student welcome email failed", error.message);
  });

  const tokens = await createSession(user, req);
  return { user, tokens };
}

async function loginStudent(payload, req) {
  const email = normalizeEmail(payload.email);
  const user = await User.findOne({ normalizedEmail: email, deletedAt: null });
  if (!user || user.status !== "active") {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const credential = await PasswordCredential.findOne({ userId: user._id });
  if (!credential || (credential.lockedUntil && credential.lockedUntil > new Date())) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const ok = await bcrypt.compare(payload.password || "", credential.passwordHash);
  if (!ok) {
    credential.failedLoginCount += 1;
    if (credential.failedLoginCount >= 5) {
      credential.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await credential.save();
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  credential.failedLoginCount = 0;
  credential.lockedUntil = null;
  user.lastLoginAt = new Date();
  await Promise.all([credential.save(), user.save()]);

  const tokens = await createSession(user, req);
  return { user, tokens };
}

async function resolveAccessUser(req) {
  const token = getCookie(req, ACCESS_COOKIE) || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const decoded = jwt.verify(token, getJwtSecret());
  if (decoded.tokenType !== "access") return null;
  const user = await User.findById(decoded.userId);
  if (!user || user.status !== "active" || user.deletedAt) return null;
  return user;
}

async function rotateRefresh(req) {
  const refreshToken = getCookie(req, REFRESH_COOKIE);
  if (!refreshToken) return null;
  const tokenHash = hashToken(refreshToken);
  const session = await AuthSession.findOne({ refreshTokenHash: tokenHash });
  const now = new Date();
  if (!session || session.status !== "active" || session.expiresAt < now || session.absoluteExpiresAt < now) {
    if (session?.familyId) {
      await AuthSession.updateMany({ familyId: session.familyId }, { $set: { status: "reused", revokedAt: now } });
    }
    return null;
  }

  const user = await User.findById(session.userId);
  if (!user || user.status !== "active" || user.deletedAt) return null;

  const nextRefreshToken = randomToken();
  const refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || DEFAULT_REFRESH_TTL_DAYS);
  session.status = "rotated";
  session.lastUsedAt = now;
  await session.save();
  await AuthSession.create({
    userId: user._id,
    refreshTokenHash: hashToken(nextRefreshToken),
    familyId: session.familyId,
    expiresAt: daysFromNow(refreshDays),
    absoluteExpiresAt: session.absoluteExpiresAt,
    ip: req.ip,
    userAgent: req.get("user-agent") || null,
  });
  return { user, tokens: { accessToken: signAccessToken(user), refreshToken: nextRefreshToken } };
}

async function revokeCurrentSession(req) {
  const refreshToken = getCookie(req, REFRESH_COOKIE);
  if (!refreshToken) return;
  await AuthSession.updateOne(
    { refreshTokenHash: hashToken(refreshToken), status: "active" },
    { $set: { status: "revoked", revokedAt: new Date() } },
  );
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  createSession,
  loginStudent,
  registerIndependentStudent,
  resolveAccessUser,
  revokeCurrentSession,
  rotateRefresh,
  serializeUser,
  setAuthCookies,
};
