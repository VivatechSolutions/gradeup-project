const crypto = require("crypto");
const LearningActivityEvent = require("../model/LearningActivityEvent");
const StudySession = require("../model/StudySession");
const StudentDailyActivity = require("../model/StudentDailyActivity");
const StudentProgress = require("../model/StudentProgress");
const StudentProfile = require("../model/StudentProfile");
const { awardPoints } = require("./rewardService");

const ALLOWED_ACTIVITY_TYPES = new Set([
  "book_view", "unit_view", "tutor", "quiz", "homework", "exam", "debate", "seminar", "avatar", "focus", "daily_visit",
]);
const STUDY_MINUTES_FOR_STREAK = 15;
const MAX_HEARTBEAT_SECONDS = 60;

function safeTimezone(value) {
  const timezone = String(value || "UTC").trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return "UTC";
  }
}

function localDateKey(date = new Date(), timezone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function calculateStreak(dateKeys = [], todayKey = localDateKey()) {
  const unique = Array.from(new Set(dateKeys.filter(Boolean))).sort();
  if (!unique.length) return { current: 0, longest: 0 };
  let longest = 1;
  let run = 1;
  for (let index = 1; index < unique.length; index += 1) {
    const previous = new Date(`${unique[index - 1]}T00:00:00Z`);
    const current = new Date(`${unique[index]}T00:00:00Z`);
    const days = Math.round((current - previous) / 86400000);
    run = days === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  let current = 0;
  const latest = unique[unique.length - 1];
  const latestDate = new Date(`${latest}T00:00:00Z`);
  const todayDate = new Date(`${todayKey}T00:00:00Z`);
  const distance = Math.round((todayDate - latestDate) / 86400000);
  if (distance <= 1 && distance >= 0) {
    current = 1;
    for (let index = unique.length - 1; index > 0; index -= 1) {
      const newer = new Date(`${unique[index]}T00:00:00Z`);
      const older = new Date(`${unique[index - 1]}T00:00:00Z`);
      if (Math.round((newer - older) / 86400000) !== 1) break;
      current += 1;
    }
  }
  return { current, longest };
}

async function getProfile(userId) {
  const profile = await StudentProfile.findOne({ userId });
  if (!profile) {
    const error = new Error("Student profile not found");
    error.statusCode = 404;
    throw error;
  }
  return profile;
}

async function appendEvent(payload) {
  const eventId = payload.eventId || crypto.randomUUID();
  const idempotencyKey = payload.idempotencyKey || eventId;
  return LearningActivityEvent.findOneAndUpdate(
    { idempotencyKey },
    { $setOnInsert: { ...payload, eventId, idempotencyKey } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function checkIn({ userId, timezone }) {
  const profile = await getProfile(userId);
  const zone = safeTimezone(timezone);
  const localDate = localDateKey(new Date(), zone);
  const daily = await StudentDailyActivity.findOneAndUpdate(
    { userId, localDate },
    {
      $setOnInsert: { studentProfileId: profile._id, timezone: zone },
      $set: { visited: true, lastActivityAt: new Date() },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  await appendEvent({
    userId,
    studentProfileId: profile._id,
    activityType: "daily_visit",
    eventType: "check_in",
    sourceId: localDate,
    timezone: zone,
    idempotencyKey: `${userId}:daily_visit:${localDate}`,
  });
  const reward = await awardPoints({
    userId,
    studentProfileId: profile._id,
    points: 5,
    reason: "Daily qualified visit",
    sourceType: "daily_visit",
    sourceId: localDate,
    idempotencyKey: `${userId}:reward:daily_visit:${localDate}`,
  });
  if (reward.awarded) {
    await StudentDailyActivity.updateOne({ _id: daily._id }, { $inc: { earnedPoints: 5 } });
  }
  return { daily, awardedPoints: reward.awarded ? 5 : 0 };
}

async function startSession({ userId, activityType, subjectGroupKey, bookId, unitId, sourceId, timezone, metadata }) {
  if (!ALLOWED_ACTIVITY_TYPES.has(activityType) || activityType === "daily_visit") {
    const error = new Error("Unsupported study activity type");
    error.statusCode = 400;
    throw error;
  }
  const profile = await getProfile(userId);
  const zone = safeTimezone(timezone);
  const session = await StudySession.create({
    userId,
    studentProfileId: profile._id,
    activityType,
    subjectGroupKey: subjectGroupKey || null,
    bookId: bookId || null,
    unitId: unitId || null,
    sourceId: sourceId || null,
    timezone: zone,
    metadata: metadata || null,
  });
  await appendEvent({
    userId,
    studentProfileId: profile._id,
    activityType,
    eventType: "started",
    sourceId: sourceId || session._id.toString(),
    sessionId: session._id,
    subjectGroupKey: subjectGroupKey || null,
    bookId: bookId || null,
    unitId: unitId || null,
    timezone: zone,
    idempotencyKey: `${userId}:session:${session._id}:started`,
    metadata: metadata || null,
  });
  return session;
}

async function applyMinuteMilestones(session, daily) {
  const totalMinutes = Math.floor(Number(daily.activeSeconds || 0) / 60);
  const milestones = [15, 30, 60];
  const awards = { 15: 10, 30: 10, 60: 20 };
  const newlyReached = milestones.filter((minute) => totalMinutes >= minute && !(daily.milestoneMinutes || []).includes(minute));
  for (const minute of newlyReached) {
    const reward = await awardPoints({
      userId: session.userId,
      studentProfileId: session.studentProfileId,
      points: awards[minute],
      reason: `${minute} verified study minutes`,
      sourceType: "study_time",
      sourceId: `${daily.localDate}:${minute}`,
      idempotencyKey: `${session.userId}:reward:study_time:${daily.localDate}:${minute}`,
    });
    if (reward.awarded) daily.earnedPoints += awards[minute];
    daily.milestoneMinutes.addToSet(minute);
  }
}

async function heartbeatSession({ userId, sessionId, sequence, active, visible }) {
  const session = await StudySession.findOne({ _id: sessionId, userId });
  if (!session || session.status !== "active") {
    const error = new Error("Active study session not found");
    error.statusCode = 404;
    throw error;
  }
  const nextSequence = Number(sequence || 0);
  if (!Number.isInteger(nextSequence) || nextSequence <= session.lastSequence) {
    const error = new Error("Heartbeat sequence must increase");
    error.statusCode = 409;
    throw error;
  }

  const now = new Date();
  const elapsed = Math.max(0, Math.floor((now - session.lastHeartbeatAt) / 1000));
  const credited = active && visible ? Math.min(elapsed, MAX_HEARTBEAT_SECONDS) : 0;
  session.lastSequence = nextSequence;
  session.lastHeartbeatAt = now;
  session.activeSeconds += credited;
  await session.save();

  const localDate = localDateKey(now, session.timezone);
  const daily = await StudentDailyActivity.findOneAndUpdate(
    { userId, localDate },
    {
      $setOnInsert: { studentProfileId: session.studentProfileId, timezone: session.timezone },
      $inc: { activeSeconds: credited },
      $set: { visited: true, lastActivityAt: now },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  if (daily.activeSeconds >= STUDY_MINUTES_FOR_STREAK * 60 && !daily.qualifiesForStudyStreak) {
    daily.qualifiesForStudyStreak = true;
  }
  await applyMinuteMilestones(session, daily);
  await daily.save();

  await appendEvent({
    userId,
    studentProfileId: session.studentProfileId,
    activityType: session.activityType,
    eventType: "heartbeat",
    sourceId: session.sourceId || session._id.toString(),
    sessionId: session._id,
    subjectGroupKey: session.subjectGroupKey,
    bookId: session.bookId,
    unitId: session.unitId,
    activeSeconds: credited,
    timezone: session.timezone,
    idempotencyKey: `${userId}:session:${session._id}:heartbeat:${nextSequence}`,
  });
  return { session, creditedSeconds: credited, daily };
}

async function completeSession({ userId, sessionId, status = "completed", metadata }) {
  const session = await StudySession.findOne({ _id: sessionId, userId });
  if (!session) {
    const error = new Error("Study session not found");
    error.statusCode = 404;
    throw error;
  }
  if (session.status === "active") {
    session.status = status === "expired" ? "expired" : "completed";
    session.completedAt = new Date();
    if (metadata) session.metadata = { ...(session.metadata || {}), ...metadata };
    await session.save();
  }
  await appendEvent({
    userId,
    studentProfileId: session.studentProfileId,
    activityType: session.activityType,
    eventType: "completed",
    sourceId: session.sourceId || session._id.toString(),
    sessionId: session._id,
    subjectGroupKey: session.subjectGroupKey,
    bookId: session.bookId,
    unitId: session.unitId,
    activeSeconds: session.activeSeconds,
    timezone: session.timezone,
    idempotencyKey: `${userId}:session:${session._id}:completed`,
    metadata: session.metadata,
  });
  return session;
}

function normalizeScore(rawScore, maximumScore) {
  const raw = Number(rawScore);
  const maximum = Number(maximumScore);
  if (!Number.isFinite(raw) || !Number.isFinite(maximum) || maximum <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((raw / maximum) * 10000) / 100));
}

async function recordTrustedResult({ userId, activityType, sourceId, subjectGroupKey, unitId, rawScore, maximumScore, normalizedScore, progressPercent = 100, metadata, timeSpentMinutes = 0, timezone = "UTC" }) {
  const profile = await getProfile(userId);
  const score = normalizedScore == null ? normalizeScore(rawScore, maximumScore) : Math.max(0, Math.min(100, Number(normalizedScore)));
  const event = await appendEvent({
    userId,
    studentProfileId: profile._id,
    activityType,
    eventType: score == null ? "completed" : "scored",
    sourceId,
    subjectGroupKey: subjectGroupKey || null,
    unitId: unitId || null,
    rawScore: Number.isFinite(Number(rawScore)) ? Number(rawScore) : null,
    maximumScore: Number.isFinite(Number(maximumScore)) ? Number(maximumScore) : null,
    normalizedScore: score,
    activeSeconds: Math.max(0, Number(timeSpentMinutes || 0) * 60),
    idempotencyKey: `${userId}:${activityType}:${sourceId}:result`,
    metadata: metadata || null,
  });

  const progress = await StudentProgress.findOneAndUpdate(
    { userId, activityType, subjectGroupKey: subjectGroupKey || null, unitId: unitId || null, "metadata.sourceId": sourceId },
    {
      $set: {
        studentProfileId: profile._id,
        status: "completed",
        progressPercent: Math.max(0, Math.min(100, Number(progressPercent || 0))),
        score,
        metadata: { ...(metadata || {}), sourceId },
        lastActivityAt: new Date(),
      },
      $max: { timeSpentMinutes: Math.max(0, Number(timeSpentMinutes || 0)) },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const basePoints = { quiz: 15, homework: 20, exam: 30, debate: 25, seminar: 25, avatar: 15, unit_view: 25, book_view: 25 }[activityType] || 10;
  const scoreBonus = score == null ? 0 : score >= 100 ? 25 : score >= 90 ? 15 : score >= 80 ? 10 : score >= 60 ? 5 : 0;
  const reward = await awardPoints({
    userId,
    studentProfileId: profile._id,
    points: basePoints + scoreBonus,
    reason: `${activityType} completion`,
    sourceType: activityType,
    sourceId,
    idempotencyKey: `${userId}:reward:${activityType}:${sourceId}:completion`,
    metadata: { score },
  });
  if (reward.awarded) {
    const zone = safeTimezone(timezone);
    const today = localDateKey(new Date(), zone);
    await StudentDailyActivity.findOneAndUpdate(
      { userId, localDate: today },
      {
        $setOnInsert: { studentProfileId: profile._id, timezone: zone },
        $inc: { completedActivities: 1, assessedActivities: score == null ? 0 : 1, earnedPoints: basePoints + scoreBonus },
        $set: { qualifiesForStudyStreak: true, visited: true, lastActivityAt: new Date() },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }
  return { event, progress, rewardAccount: reward.account, awardedPoints: reward.awarded ? basePoints + scoreBonus : 0 };
}

async function getStreak(userId, timezone = "UTC") {
  const rows = await StudentDailyActivity.find({ userId, qualifiesForStudyStreak: true }).select("localDate").sort({ localDate: 1 }).lean();
  return calculateStreak(rows.map((row) => row.localDate), localDateKey(new Date(), timezone));
}

module.exports = {
  STUDY_MINUTES_FOR_STREAK,
  appendEvent,
  calculateStreak,
  checkIn,
  completeSession,
  getStreak,
  heartbeatSession,
  localDateKey,
  normalizeScore,
  recordTrustedResult,
  safeTimezone,
  startSession,
};
