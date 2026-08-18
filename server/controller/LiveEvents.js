const LiveSession = require("../model/LiveSession");
const {
  canAccessSession,
  eventAccessLabel,
  getRequestStudentContext,
  normalizeVisibility,
} = require("../services/sessionVisibilityService");

function statusLabel(session) {
  const status = String(session.status || "waiting").toLowerCase();
  if (status === "completed" || status === "ending" || status === "end_error") return "Ended";
  if (status === "active" || status === "waiting_for_ai") return "In Progress";
  return "Waiting";
}

function participantCount(session) {
  return (session.participants || []).filter((participant) => !participant.isAi).length;
}

function serializeEvent(session, context) {
  const visibility = normalizeVisibility(session.visibility);
  const access = canAccessSession(session, context);
  const status = String(session.status || "waiting").toLowerCase();
  const type = session.sessionType;
  const isEnded = status === "completed" || status === "ending" || status === "end_error";
  const isStarted = status === "active" || status === "waiting_for_ai";
  const canJoinByStatus = type === "seminar" ? !isEnded : !isEnded && !isStarted;
  return {
    id: session.sessionId,
    sessionId: session.sessionId,
    sessionType: type,
    title: session.topic,
    topic: session.topic,
    createdBy: session.hostCandidateName || session.candidateName || "GradeUp learner",
    subject: session.subject || null,
    unit: session.unitTitle || null,
    status,
    statusLabel: statusLabel(session),
    visibility,
    visibilityLabel:
      visibility === "public"
        ? "Access to all"
        : visibility === "school"
          ? "Only to school"
          : visibility === "class"
            ? "Only to class"
            : "Private",
    participantCount: participantCount(session),
    canAccess: Boolean(access.allowed),
    accessLabel: eventAccessLabel(session, context),
    canJoin: Boolean(access.allowed && canJoinByStatus),
    joinUrl:
      session.shareLink ||
      (type === "seminar"
        ? `/seminar?sessionId=${encodeURIComponent(session.sessionId)}`
        : `/debate?sessionId=${encodeURIComponent(session.sessionId)}`),
    updatedAt: session.updatedAt || session.startedAt || session.createdAt,
  };
}

async function listLiveEvents(req, res) {
  try {
    const context = await getRequestStudentContext(req);
    const requestedType = String(req.query.type || "").toLowerCase();
    const sessionType = requestedType === "debate" || requestedType === "seminar" ? requestedType : null;
    const sessions = await LiveSession.find({
      ...(sessionType ? { sessionType } : {}),
      visibility: { $ne: "private" },
      status: { $in: ["waiting", "active", "waiting_for_ai", "ending", "completed", "end_error"] },
    })
      .sort({ updatedAt: -1 })
      .limit(100);

    return res.status(200).json({
      status: true,
      data: sessions.map((session) => serializeEvent(session, context)),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || "Failed to load live events",
    });
  }
}

module.exports = { listLiveEvents };
