const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");
const User = require("../model/User");
const AuthIdentity = require("../model/AuthIdentity");
const StudentProfile = require("../model/StudentProfile");
const RewardAccount = require("../model/RewardAccount");
const { sendEmail } = require("../config/EmailTransporter");
const { getStudentWelcomeEmail } = require("../config/EmailTemplate");
const { createSession } = require("./studentAuthService");

const microsoftJwksCache = new Map();

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function normalizeClassNumber(value = "") {
  return String(value).trim().replace(/^(grade|class)\s*/i, "");
}

function requireClientId(provider) {
  const value =
    provider === "google"
      ? process.env.GOOGLE_CLIENT_ID
      : process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID;
  if (!value) {
    const error = new Error(`${provider} OAuth client id is not configured`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

async function verifyGoogleToken({ idToken, accessToken }) {
  const clientId = requireClientId("google");
  const client = new OAuth2Client(clientId);

  if (idToken) {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    return {
      providerSubject: payload.sub,
      email: normalizeEmail(payload.email),
      emailVerified: Boolean(payload.email_verified),
      firstName: payload.given_name || "",
      lastName: payload.family_name || "",
    };
  }

  if (!accessToken) {
    const error = new Error("Google token is required");
    error.statusCode = 400;
    throw error;
  }

  const tokenInfo = await client.getTokenInfo(accessToken);
  if (tokenInfo.aud !== clientId) {
    const error = new Error("Invalid Google token audience");
    error.statusCode = 401;
    throw error;
  }
  const { data } = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return {
    providerSubject: data.sub,
    email: normalizeEmail(data.email || tokenInfo.email),
    emailVerified: Boolean(data.email_verified || tokenInfo.email_verified),
    firstName: data.given_name || "",
    lastName: data.family_name || "",
  };
}

async function getMicrosoftSigningKey(kid, tenantId = "common") {
  const cacheKey = `${tenantId}:${kid}`;
  if (microsoftJwksCache.has(cacheKey)) return microsoftJwksCache.get(cacheKey);

  const metadataUrl = `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
  const { data: metadata } = await axios.get(metadataUrl);
  const { data: jwks } = await axios.get(metadata.jwks_uri);
  const jwk = jwks.keys.find((key) => key.kid === kid);
  if (!jwk) {
    const error = new Error("Microsoft signing key not found");
    error.statusCode = 401;
    throw error;
  }

  const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
  microsoftJwksCache.set(cacheKey, key);
  return key;
}

async function verifyMicrosoftToken({ idToken }) {
  if (!idToken) {
    const error = new Error("Microsoft id token is required");
    error.statusCode = 400;
    throw error;
  }

  const clientId = requireClientId("microsoft");
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid || !decoded?.payload?.tid) {
    const error = new Error("Invalid Microsoft token");
    error.statusCode = 401;
    throw error;
  }

  const key = await getMicrosoftSigningKey(decoded.header.kid, decoded.payload.tid);
  const payload = jwt.verify(idToken, key, {
    algorithms: ["RS256"],
    audience: clientId,
    issuer: `https://login.microsoftonline.com/${decoded.payload.tid}/v2.0`,
  });

  return {
    providerSubject: payload.sub || payload.oid,
    email: normalizeEmail(payload.preferred_username || payload.email),
    emailVerified: true,
    firstName: payload.given_name || "",
    lastName: payload.family_name || "",
  };
}

function validateProfileContext(profileContext = {}) {
  const board = String(profileContext.board || "").trim();
  const classNumber = normalizeClassNumber(profileContext.classNumber || profileContext.grade || "");
  const schoolName = String(profileContext.schoolName || "").trim();
  if (!board || !classNumber || !schoolName) {
    const error = new Error("schoolName, board and classNumber are required for OAuth signup");
    error.statusCode = 400;
    throw error;
  }
  return { board, classNumber, schoolName };
}

async function sendWelcomeEmail(user, profile) {
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
}

async function authenticateStudentWithOAuth({ provider, idToken, accessToken, profileContext }, req) {
  if (!["google", "microsoft"].includes(provider)) {
    const error = new Error("Unsupported OAuth provider");
    error.statusCode = 400;
    throw error;
  }

  const verified =
    provider === "google"
      ? await verifyGoogleToken({ idToken, accessToken })
      : await verifyMicrosoftToken({ idToken });

  if (!verified.providerSubject || !verified.email) {
    const error = new Error("OAuth account email could not be verified");
    error.statusCode = 401;
    throw error;
  }

  let identity = await AuthIdentity.findOne({
    provider,
    providerSubject: verified.providerSubject,
    status: "active",
  });
  let user = identity ? await User.findById(identity.userId) : null;

  if (!user) {
    user = await User.findOne({ normalizedEmail: verified.email, deletedAt: null });
  }

  let created = false;
  let profile = user ? await StudentProfile.findOne({ userId: user._id }) : null;

  if (!user) {
    const context = validateProfileContext(profileContext);
    const [firstFromEmail] = verified.email.split("@");
    user = await User.create({
      email: verified.email,
      normalizedEmail: verified.email,
      firstName: String(profileContext?.firstName || verified.firstName || firstFromEmail || "Student").trim(),
      lastName: String(profileContext?.lastName || verified.lastName || "Learner").trim(),
      role: "student",
      status: "active",
      emailVerifiedAt: verified.emailVerified ? new Date() : null,
    });
    profile = await StudentProfile.create({
      userId: user._id,
      schoolContext: {
        name: context.schoolName,
        status: "unverified",
      },
      independentLearningContext: {
        board: context.board,
        classNumber: context.classNumber,
        subjects: [],
      },
    });
    await RewardAccount.create({ userId: user._id, studentProfileId: profile._id });
    created = true;
  }

  if (!profile && profileContext) {
    const context = validateProfileContext(profileContext);
    profile = await StudentProfile.create({
      userId: user._id,
      schoolContext: {
        name: context.schoolName,
        status: "unverified",
      },
      independentLearningContext: {
        board: context.board,
        classNumber: context.classNumber,
        subjects: [],
      },
    });
    await RewardAccount.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { studentProfileId: profile._id } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  if (!identity) {
    identity = await AuthIdentity.findOneAndUpdate(
      { provider, providerSubject: verified.providerSubject },
      {
        $setOnInsert: {
          userId: user._id,
          provider,
          providerSubject: verified.providerSubject,
          providerEmail: verified.email,
          providerEmailVerified: verified.emailVerified,
          status: "active",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  if (!profile) {
    const error = new Error("Complete student signup before using OAuth login");
    error.statusCode = 409;
    throw error;
  }

  if (verified.emailVerified && !user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
  }
  user.lastLoginAt = new Date();
  await user.save();

  if (created) {
    await sendWelcomeEmail(user, profile);
  }

  const tokens = await createSession(user, req);
  return { user, tokens, created };
}

module.exports = {
  authenticateStudentWithOAuth,
};
