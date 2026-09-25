const CalendarEvent = require("../model/CalendarEvent");
const StudentProfile = require("../model/StudentProfile");
const StudentProgress = require("../model/StudentProgress");
const LiveSession = require("../model/LiveSession");
const SubjectUnit = require("../model/SubjectUnit");
const { localDateKey, safeTimezone } = require("./activityService");

function zonedMidnight(dateKey, timezone) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const desired = Date.UTC(year, month - 1, day);
  let guess = new Date(desired);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone(timezone), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(guess).reduce((out, part) => ({ ...out, [part.type]: part.value }), {});
  const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  guess = new Date(guess.getTime() + (desired - represented));
  return guess;
}

async function profileFor(userId) {
  const profile = await StudentProfile.findOne({ userId });
  if (!profile) {
    const error = new Error("Student profile not found");
    error.statusCode = 404;
    throw error;
  }
  return profile;
}

async function listEvents(userId, { from, to } = {}) {
  const query = { userId, status: { $ne: "cancelled" } };
  if (from || to) {
    query.startsAt = {};
    if (from) query.startsAt.$gte = new Date(from);
    if (to) query.startsAt.$lte = new Date(to);
  }
  return CalendarEvent.find(query).sort({ startsAt: 1 }).lean();
}

async function createEvent(userId, payload) {
  const profile = await profileFor(userId);
  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);
  if (Number.isNaN(startsAt.valueOf()) || Number.isNaN(endsAt.valueOf()) || endsAt <= startsAt) {
    const error = new Error("A valid start and end time are required");
    error.statusCode = 400;
    throw error;
  }
  return CalendarEvent.create({
    userId,
    studentProfileId: profile._id,
    title: payload.title,
    type: payload.type || "study",
    startsAt,
    endsAt,
    timezone: payload.timezone || "UTC",
    description: payload.description || "",
    location: payload.location || "",
    subjectGroupKey: payload.subjectGroupKey || null,
    unitId: payload.unitId || null,
    sourceType: "student",
    reminderMinutes: Array.isArray(payload.reminderMinutes) ? payload.reminderMinutes : [],
    metadata: payload.metadata || null,
  });
}

async function updateEvent(userId, eventId, payload) {
  const allowed = ["title", "type", "startsAt", "endsAt", "timezone", "description", "location", "subjectGroupKey", "unitId", "status", "reminderMinutes", "metadata"];
  const updates = {};
  allowed.forEach((key) => {
    if (payload[key] !== undefined) updates[key] = payload[key];
  });
  const event = await CalendarEvent.findOneAndUpdate({ _id: eventId, userId }, { $set: updates }, { new: true, runValidators: true });
  if (!event) {
    const error = new Error("Calendar event not found");
    error.statusCode = 404;
    throw error;
  }
  return event;
}

async function removeEvent(userId, eventId) {
  const event = await CalendarEvent.findOneAndUpdate({ _id: eventId, userId }, { $set: { status: "cancelled" } }, { new: true });
  if (!event) {
    const error = new Error("Calendar event not found");
    error.statusCode = 404;
    throw error;
  }
  return event;
}

async function todayPlan(userId, timezone = "UTC") {
  const profile = await profileFor(userId);
  const zone = safeTimezone(timezone);
  const dateKey = localDateKey(new Date(), zone);
  const start = zonedMidnight(dateKey, zone);
  const nextKeyDate = new Date(`${dateKey}T00:00:00Z`);
  nextKeyDate.setUTCDate(nextKeyDate.getUTCDate() + 1);
  const end = zonedMidnight(nextKeyDate.toISOString().slice(0, 10), zone);
  const classNumber = String(profile.independentLearningContext?.classNumber || "").replace(/^(grade|class)\s*/i, "").replace(/^0+(?=\d)/, "");
  const [events, progress, sessions, units] = await Promise.all([
    listEvents(userId, { from: start, to: end }),
    StudentProgress.find({ userId }).sort({ lastActivityAt: -1 }).limit(100).lean(),
    LiveSession.find({ candidateId: userId.toString(), updatedAt: { $gte: start, $lt: end } }).sort({ updatedAt: 1 }).lean(),
    SubjectUnit.find({
      board: profile.independentLearningContext?.board,
      standard: classNumber ? new RegExp(`^(?:0*${classNumber}|(?:grade|class)\\s*0*${classNumber})$`, "i") : profile.independentLearningContext?.classNumber,
      "processing.status": { $ne: "failed" },
    }).sort({ subject: 1, unitNumber: 1 }).limit(100).lean(),
  ]);
  const items = events.map((event) => ({
    id: event._id.toString(),
    source: "calendar",
    type: event.type,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    route: "/calendar",
    completed: event.status === "completed",
  }));
  sessions.forEach((session) => items.push({
    id: session._id.toString(),
    source: "live_session",
    type: session.sessionType,
    title: session.topic || `${session.sessionType} session`,
    startsAt: session.createdAt,
    route: session.sessionType === "debate" ? "/debatePage" : "/seminarPage",
    completed: session.status === "completed",
  }));

  if (!items.length) {
    const incomplete = progress.find((row) => row.status !== "completed");
    const unit = incomplete?.unitId ? units.find((candidate) => candidate._id.toString() === incomplete.unitId.toString()) : units[0];
    if (unit) items.push({
      id: `recommended:${unit._id}`,
      source: "recommendation",
      type: "study",
      title: `Continue ${unit.unitTitle || unit.unitLabel}`,
      subject: unit.subject,
      unitId: unit._id.toString(),
      subjectGroupKey: unit.subjectGroupKey,
      route: `/bookRewamp?unit=${encodeURIComponent(unit._id.toString())}`,
      completed: false,
    });
  }
  return { date: dateKey, timezone: zone, items };
}

module.exports = { createEvent, listEvents, removeEvent, todayPlan, updateEvent };
