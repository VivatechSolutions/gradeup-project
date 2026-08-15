const BookContent = require("../model/BookContent");
const SubjectUnit = require("../model/SubjectUnit");
const TutorConversation = require("../model/TutorConversation");
const LiveSession = require("../model/LiveSession");
const StudentProfile = require("../model/StudentProfile");
const StudentProgress = require("../model/StudentProgress");
const RewardAccount = require("../model/RewardAccount");
const RewardTransaction = require("../model/RewardTransaction");

function normalize(value = "") {
  return String(value || "").trim();
}

async function getStudentProfile(userId) {
  const profile = await StudentProfile.findOne({ userId });
  if (!profile) {
    const error = new Error("Student profile not found");
    error.statusCode = 404;
    throw error;
  }
  return profile;
}

function studentContentFilter(profile) {
  const ctx = profile.independentLearningContext || {};
  const board = normalize(ctx.board);
  const classNumber = normalize(ctx.classNumber);
  return {
    board,
    classNumber,
    unitQuery: {
      ...(board ? { board } : {}),
      ...(classNumber ? { standard: classNumber } : {}),
      "processing.status": { $ne: "failed" },
    },
    bookQuery: {
      ...(board ? { board } : {}),
      ...(classNumber ? { grade: classNumber } : {}),
      importStatus: { $ne: "failed" },
    },
  };
}

function buildSubjectGroupKey(unit) {
  return unit.subjectGroupKey || [unit.board, unit.standard, unit.subject].filter(Boolean).join("::");
}

async function listStudentSubjects(userId) {
  const profile = await getStudentProfile(userId);
  const { unitQuery } = studentContentFilter(profile);
  const units = await SubjectUnit.find(unitQuery)
    .sort({ subject: 1, part: 1, term: 1, unitNumber: 1 })
    .lean();

  const groups = new Map();
  units.forEach((unit) => {
    const key = buildSubjectGroupKey(unit);
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        subjectGroupKey: key,
        title: `${unit.subject} ${unit.standard ? `Class ${unit.standard}` : ""}`.trim(),
        subject: unit.subject,
        board: unit.board,
        standard: unit.standard,
        class: unit.standard,
        part: unit.part || null,
        term: unit.term || null,
        unitCount: 0,
        units: [],
        updatedAt: unit.updatedAt,
      });
    }
    const group = groups.get(key);
    group.unitCount += 1;
    group.units.push({
      id: unit._id.toString(),
      subjectGroupKey: key,
      documentId: unit.documentId,
      board: unit.board,
      standard: unit.standard,
      subject: unit.subject,
      unitNumber: unit.unitNumber,
      unitTitle: unit.unitTitle,
      unitLabel: unit.unitLabel,
    });
  });
  return Array.from(groups.values());
}

async function listStudentBooks(userId) {
  const profile = await getStudentProfile(userId);
  const { bookQuery } = studentContentFilter(profile);
  const [books, progressRows] = await Promise.all([
    BookContent.find(bookQuery).select("-rawContent -pages.raw").sort({ subject: 1, title: 1 }).lean(),
    StudentProgress.find({ userId, activityType: { $in: ["book_view", "unit_view"] } }).lean(),
  ]);

  const bySubject = new Map();
  progressRows.forEach((row) => {
    if (!row.subjectGroupKey) return;
    const current = bySubject.get(row.subjectGroupKey) || { total: 0, count: 0 };
    current.total += Number(row.progressPercent || 0);
    current.count += 1;
    bySubject.set(row.subjectGroupKey, current);
  });

  return books.map((book) => {
    const key = [book.board, book.grade, book.subject].filter(Boolean).join("::");
    const p = bySubject.get(key);
    return {
      ...book,
      id: book._id.toString(),
      subjectGroupKey: key,
      progressPercent: p ? Math.round(p.total / p.count) : 0,
    };
  });
}

async function awardPoints({ userId, studentProfileId, points, reason, sourceType, sourceId, metadata }) {
  if (!points) return null;
  const idempotencyKey = `${userId}:${sourceType}:${sourceId}:${reason}`;
  const existingTransaction = await RewardTransaction.findOne({ idempotencyKey }).lean();
  if (existingTransaction) {
    return RewardAccount.findOne({ userId });
  }
  const account = await RewardAccount.findOneAndUpdate(
    { userId },
    { $setOnInsert: { studentProfileId }, $inc: { pointsBalance: points } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  account.level = Math.max(1, Math.floor(account.pointsBalance / 500) + 1);
  await account.save();
  await RewardTransaction.create({
    userId,
    rewardAccountId: account._id,
    points,
    reason,
    sourceType,
    sourceId,
    idempotencyKey,
    metadata,
  });
  return account;
}

async function recordProgress({ userId, activityType, subjectGroupKey, bookId, unitId, status, progressPercent, score, timeSpentMinutes, metadata }) {
  const profile = await getStudentProfile(userId);
  const points = status === "completed" ? 25 : activityType === "book_view" ? 5 : 10;
  const progress = await StudentProgress.findOneAndUpdate(
    {
      userId,
      activityType,
      subjectGroupKey: subjectGroupKey || null,
      unitId: unitId || null,
      bookId: bookId || null,
    },
    {
      $set: {
        studentProfileId: profile._id,
        status: status || "in_progress",
        progressPercent: Math.max(0, Math.min(100, Number(progressPercent || 0))),
        score: score ?? null,
        timeSpentMinutes: Number(timeSpentMinutes || 0),
        metadata: metadata || null,
        lastActivityAt: new Date(),
      },
      $max: { pointsEarned: points },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  await awardPoints({
    userId,
    studentProfileId: profile._id,
    points,
    reason: activityType,
    sourceType: activityType,
    sourceId: progress._id.toString(),
    metadata,
  });
  return progress;
}

async function getDashboard(userId) {
  const [profile, rewards, progressRows, conversations, sessions] = await Promise.all([
    getStudentProfile(userId),
    RewardAccount.findOne({ userId }).lean(),
    StudentProgress.find({ userId }).sort({ lastActivityAt: -1 }).limit(100).lean(),
    TutorConversation.find({ candidateId: userId.toString() }).sort({ lastActivityAt: -1 }).limit(20).lean(),
    LiveSession.find({ candidateId: userId.toString() }).sort({ updatedAt: -1 }).limit(30).lean(),
  ]);

  const completed = progressRows.filter((row) => row.status === "completed").length;
  const averageScoreRows = progressRows.filter((row) => typeof row.score === "number");
  const averageScore = averageScoreRows.length
    ? Math.round(averageScoreRows.reduce((sum, row) => sum + row.score, 0) / averageScoreRows.length)
    : 0;
  const activityDates = new Set(
    [...progressRows.map((row) => row.lastActivityAt), ...conversations.map((row) => row.lastActivityAt), ...sessions.map((row) => row.updatedAt)]
      .filter(Boolean)
      .map((date) => new Date(date).toISOString().slice(0, 10)),
  );

  const achievements = buildAchievements({ completed, sessions, rewards, conversations });
  const recentActivity = [
    ...progressRows.slice(0, 5).map((row) => ({
      type: row.activityType,
      title: row.metadata?.title || row.subjectGroupKey || row.activityType,
      subject: row.metadata?.subject || null,
      lastUpdated: row.lastActivityAt,
    })),
    ...sessions.slice(0, 5).map((session) => ({
      type: session.sessionType,
      title: session.topic,
      subject: session.subject,
      lastUpdated: session.updatedAt,
    })),
  ].sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)).slice(0, 8);

  return {
    profile,
    stats: {
      lessonsCompleted: completed,
      averageScore,
      totalTimeSpent: Math.round(progressRows.reduce((sum, row) => sum + Number(row.timeSpentMinutes || 0), 0) / 60),
      badgesEarned: achievements.filter((item) => item.unlocked).length,
      currentStreak: activityDates.size,
      longestStreak: activityDates.size,
      totalPoints: rewards?.pointsBalance || 0,
      currentLevel: rewards?.level || 1,
      pointsToNextLevel: 500 - ((rewards?.pointsBalance || 0) % 500),
      totalLessonsCompleted: completed,
      streakDays: activityDates.size,
      weeklyProgress: 0,
      monthlyGoal: 0,
      completionRate: progressRows.length ? Math.round(progressRows.reduce((sum, row) => sum + Number(row.progressPercent || 0), 0) / progressRows.length) : 0,
      studyTimeMinutes: progressRows.reduce((sum, row) => sum + Number(row.timeSpentMinutes || 0), 0),
      rank: 1,
      totalUsers: 1,
    },
    achievements,
    recentActivity,
    sessions,
    progress: progressRows,
    subjectDistribution: buildSubjectDistribution(progressRows),
  };
}

function buildSubjectDistribution(progressRows) {
  const counts = new Map();
  progressRows.forEach((row) => {
    const subject = row.metadata?.subject || row.subjectGroupKey || "Learning";
    counts.set(subject, (counts.get(subject) || 0) + Math.max(1, Number(row.timeSpentMinutes || 1)));
  });
  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0) || 1;
  return Array.from(counts.entries()).map(([name, value]) => ({
    name,
    value: Math.round((value / total) * 100),
  }));
}

function buildAchievements({ completed, sessions, rewards, conversations }) {
  return [
    { id: 1, title: "First Steps", description: "Start your first learning activity", icon: "BookOpen", unlocked: completed > 0 || conversations.length > 0, tier: "bronze", date: null },
    { id: 2, title: "Book Explorer", description: "Complete 5 learning items", icon: "Trophy", unlocked: completed >= 5, tier: "silver", date: null },
    { id: 3, title: "Debater", description: "Complete a debate session", icon: "Medal", unlocked: sessions.some((s) => s.sessionType === "debate" && s.status === "completed"), tier: "gold", date: null },
    { id: 4, title: "Seminar Starter", description: "Complete a seminar session", icon: "Star", unlocked: sessions.some((s) => s.sessionType === "seminar" && s.status === "completed"), tier: "gold", date: null },
    { id: 5, title: "Point Collector", description: "Earn 500 XP", icon: "Crown", unlocked: (rewards?.pointsBalance || 0) >= 500, tier: "gold", date: null },
  ];
}

module.exports = {
  getDashboard,
  getStudentProfile,
  listStudentBooks,
  listStudentSubjects,
  recordProgress,
};
