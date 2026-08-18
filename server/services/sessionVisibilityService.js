const LiveSession = require("../model/LiveSession");
const StudentProfile = require("../model/StudentProfile");
const User = require("../model/User");

const VISIBILITIES = new Set(["public", "school", "class", "private"]);

function normalizeVisibility(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "all" || raw === "access_to_all") return "public";
  if (raw === "only_to_school" || raw === "school_only") return "school";
  if (raw === "only_to_class" || raw === "class_only") return "class";
  if (raw === "invite" || raw === "invited" || raw === "invited_only") return "private";
  return VISIBILITIES.has(raw) ? raw : "public";
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getProfileSchool(profile) {
  return normalizeText(profile?.schoolContext?.name);
}

function getProfileClass(profile) {
  return normalizeText(profile?.independentLearningContext?.classNumber);
}

async function getRequestStudentContext(req) {
  const user = req.studentUser || null;
  const userId = user?._id ? String(user._id) : req.authUser?.id ? String(req.authUser.id) : "";
  const profile = userId
    ? await StudentProfile.findOne({ userId, status: "active" }).lean().catch(() => null)
    : null;
  return {
    userId,
    email: normalizeEmail(user?.normalizedEmail || user?.email || req.authUser?.user?.email),
    school: getProfileSchool(profile),
    classNumber: getProfileClass(profile),
    profile,
    user,
  };
}

function buildVisibilityPatch({ visibility, context = {}, current = null }) {
  const nextVisibility = normalizeVisibility(visibility || current?.visibility || "public");
  const school = context.school || current?.allowedSchool || "";
  const classNumber = context.classNumber || current?.allowedClass || "";
  return {
    visibility: nextVisibility,
    allowedSchool: nextVisibility === "school" || nextVisibility === "class" ? school || null : null,
    allowedClass: nextVisibility === "class" ? classNumber || null : null,
    visibilityUpdatedAt: new Date(),
  };
}

function isHost(session, context = {}) {
  return (
    context.userId &&
    (String(session?.hostCandidateId || "") === String(context.userId) ||
      String(session?.candidateId || "") === String(context.userId))
  );
}

function isInvited(session, context = {}) {
  const email = normalizeEmail(context.email);
  const userId = String(context.userId || "");
  return (
    (email && (session?.invitedEmails || []).map(normalizeEmail).includes(email)) ||
    (userId && (session?.invitedUserIds || []).map(String).includes(userId))
  );
}

function canAccessSession(session, context = {}) {
  if (!session) return { allowed: false, reason: "Session not found" };
  if (isHost(session, context)) return { allowed: true };

  const visibility = normalizeVisibility(session.visibility);
  if (visibility === "public") return { allowed: true };
  if (visibility === "private") {
    return isInvited(session, context)
      ? { allowed: true }
      : { allowed: false, reason: "This is a private room. You need an invite to join." };
  }

  const userSchool = normalizeText(context.school).toLowerCase();
  const sessionSchool = normalizeText(session.allowedSchool).toLowerCase();
  if (!userSchool || !sessionSchool || userSchool !== sessionSchool) {
    return { allowed: false, reason: "This room is only available inside the school." };
  }

  if (visibility === "class") {
    const userClass = normalizeText(context.classNumber).toLowerCase();
    const sessionClass = normalizeText(session.allowedClass).toLowerCase();
    if (!userClass || !sessionClass || userClass !== sessionClass) {
      return { allowed: false, reason: "This room is only available to the selected class." };
    }
  }

  return { allowed: true };
}

function eventAccessLabel(session, context = {}) {
  const access = canAccessSession(session, context);
  if (access.allowed) return "join";
  return "Private room";
}

async function assertSessionAccess(sessionId, req) {
  const raw = await LiveSession.findOne({ sessionId });
  if (!raw) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }
  const context = await getRequestStudentContext(req);
  const access = canAccessSession(raw, context);
  if (!access.allowed) {
    const error = new Error(access.reason);
    error.statusCode = 403;
    throw error;
  }
  return { raw, context };
}

async function updateSessionVisibility({ sessionId, visibility, req }) {
  const context = await getRequestStudentContext(req);
  const session = await LiveSession.findOne({ sessionId });
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }
  if (!isHost(session, context)) {
    const error = new Error("Only the host can change session visibility.");
    error.statusCode = 403;
    throw error;
  }
  Object.assign(session, buildVisibilityPatch({ visibility, context, current: session }));
  await session.save();
  return session;
}

async function addSessionInvitees({ sessionId, emails = [], userIds = [] }) {
  if (!sessionId) return null;
  const normalizedEmails = Array.from(new Set((emails || []).map(normalizeEmail).filter(Boolean)));
  const normalizedUserIds = Array.from(new Set((userIds || []).map(String).filter(Boolean)));
  if (!normalizedEmails.length && !normalizedUserIds.length) return null;
  return LiveSession.findOneAndUpdate(
    { sessionId },
    {
      $addToSet: {
        ...(normalizedEmails.length ? { invitedEmails: { $each: normalizedEmails } } : {}),
        ...(normalizedUserIds.length ? { invitedUserIds: { $each: normalizedUserIds } } : {}),
      },
    },
    { new: true },
  );
}

async function addGroupInviteesToSession({ sessionId, members = [] }) {
  const emails = [];
  const userIds = [];
  for (const member of members || []) {
    if (member.email) emails.push(member.email);
    if (member.userId) userIds.push(member.userId);
  }
  return addSessionInvitees({ sessionId, emails, userIds });
}

async function findUsersByEmails(emails = []) {
  const normalized = Array.from(new Set((emails || []).map(normalizeEmail).filter(Boolean)));
  if (!normalized.length) return [];
  return User.find({ normalizedEmail: { $in: normalized }, role: "student", status: "active", deletedAt: null }).lean();
}

module.exports = {
  addGroupInviteesToSession,
  addSessionInvitees,
  assertSessionAccess,
  buildVisibilityPatch,
  canAccessSession,
  eventAccessLabel,
  findUsersByEmails,
  getRequestStudentContext,
  isHost,
  normalizeVisibility,
  updateSessionVisibility,
};
