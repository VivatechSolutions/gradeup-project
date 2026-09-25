const BookContent = require("../model/BookContent");
const SubjectUnit = require("../model/SubjectUnit");
const TutorConversation = require("../model/TutorConversation");
const LiveSession = require("../model/LiveSession");
const StudentProfile = require("../model/StudentProfile");
const StudentProgress = require("../model/StudentProgress");
const RewardAccount = require("../model/RewardAccount");
const StudentDailyActivity = require("../model/StudentDailyActivity");
const { evaluateAchievements } = require("./achievementService");
const { getStreak, localDateKey } = require("./activityService");
const { getLeaderboard } = require("./leaderboardService");
const { todayPlan } = require("./calendarService");
const { awardPoints } = require("./rewardService");

function normalize(value = "") {
  return String(value || "").trim();
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactText(value) {
  const cleaned = normalize(value);
  return cleaned ? new RegExp(`^${escapeRegex(cleaned)}$`, "i") : null;
}

function classVariants(value) {
  const cleaned = normalize(value);
  if (!cleaned) return [];
  const numeric = cleaned.replace(/^(grade|class)\s*/i, "").trim();
  const numberValue = Number.parseInt(numeric, 10);
  const paddedNumeric = Number.isNaN(numberValue) ? "" : String(numberValue).padStart(2, "0");
  return Array.from(new Set([
    cleaned,
    numeric,
    paddedNumeric,
    `Grade ${numeric}`,
    paddedNumeric ? `Grade ${paddedNumeric}` : "",
    `Class ${numeric}`,
    paddedNumeric ? `Class ${paddedNumeric}` : "",
    `grade ${numeric}`,
    paddedNumeric ? `grade ${paddedNumeric}` : "",
    `class ${numeric}`,
    paddedNumeric ? `class ${paddedNumeric}` : "",
  ].filter(Boolean)));
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
  const boardMatcher = exactText(board);
  const classMatchers = classVariants(classNumber).map(exactText).filter(Boolean);
  return {
    board,
    classNumber,
    unitQuery: {
      ...(boardMatcher ? { board: boardMatcher } : {}),
      ...(classMatchers.length ? { standard: { $in: classMatchers } } : {}),
      "processing.status": { $ne: "failed" },
    },
    bookQuery: {
      ...(boardMatcher ? { board: boardMatcher } : {}),
      ...(classMatchers.length ? { grade: { $in: classMatchers } } : {}),
      importStatus: { $ne: "failed" },
    },
  };
}

function buildSubjectGroupKey(unit) {
  return unit.subjectGroupKey || [unit.board, unit.standard, unit.subject].filter(Boolean).join("::");
}

function getIndexedSectionTopics(unit) {
  const indexedSections = unit.readerIndex?.avatarSections?.length
    ? unit.readerIndex.avatarSections
    : (unit.readerIndex?.sections || []).map((sectionTitle, index) => ({
        sectionTitle,
        order: index + 1,
      }));

  return indexedSections
    .map((section, index) => {
      const sectionTitle = normalize(section.sectionTitle);
      if (!sectionTitle) return null;
      const sectionNumber = section.order ?? index + 1;
      return {
        id: section.sectionId || `${unit._id}:${sectionNumber}`,
        sectionId: section.sectionId || null,
        sectionNumber: String(sectionNumber),
        sectionTitle,
        sectionType: "section",
        label: `${sectionNumber} ${sectionTitle}`.trim(),
      };
    })
    .filter(Boolean);
}

async function listStudentSubjects(userId) {
  const profile = await getStudentProfile(userId);
  const { unitQuery, board, classNumber } = studentContentFilter(profile);
  const projection = [
      "_id",
      "documentId",
      "board",
      "standard",
      "subject",
      "subjectGroupKey",
      "part",
      "term",
      "partSequence",
      "termSequence",
      "unitNumber",
      "unitTitle",
      "unitLabel",
      "chapterName",
      "readerIndex",
      "createdAt",
      "updatedAt",
    ].join(" ");
  const normalizedStandard = normalize(classNumber).replace(/^(grade|class)\s*/i, "").replace(/^0+(?=\d)/, "");
  const exactQuery = {
    ...(board ? { board } : {}),
    ...(normalizedStandard ? { standard: normalizedStandard } : {}),
    "processing.status": { $ne: "failed" },
  };
  let units = await SubjectUnit.find(exactQuery)
    .select(projection)
    .sort({ subject: 1, part: 1, term: 1, unitNumber: 1 })
    .lean();
  if (!units.length && (board || classNumber)) {
    units = await SubjectUnit.find(unitQuery)
      .select(projection)
      .sort({ subject: 1, part: 1, term: 1, unitNumber: 1 })
      .lean();
  }

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
      part: unit.part || null,
      term: unit.term || null,
      unitNumber: unit.unitNumber,
      unitTitle: unit.unitTitle,
      unitLabel: unit.unitLabel,
      chapterName: unit.chapterName || null,
      readerIndex: unit.readerIndex || null,
      sectionTopics: getIndexedSectionTopics(unit),
    });
  });
  const progressRows = await StudentProgress.find({ userId, subjectGroupKey: { $in: Array.from(groups.keys()) } }).lean();
  const progressBySubject = new Map();
  progressRows.forEach((row) => {
    const current = progressBySubject.get(row.subjectGroupKey) || { total: 0, count: 0, completed: 0, scores: [] };
    current.total += Number(row.progressPercent || 0);
    current.count += 1;
    if (row.status === "completed") current.completed += 1;
    if (typeof row.score === "number") current.scores.push(row.score);
    progressBySubject.set(row.subjectGroupKey, current);
  });
  return Array.from(groups.values()).map((group) => {
    const summary = progressBySubject.get(group.subjectGroupKey);
    return {
      ...group,
      progressPercent: summary ? Math.round(summary.total / summary.count) : 0,
      completedActivities: summary?.completed || 0,
      averageScore: summary?.scores?.length
        ? Math.round(summary.scores.reduce((sum, value) => sum + value, 0) / summary.scores.length)
        : null,
    };
  });
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

async function recordProgress({ userId, activityType, subjectGroupKey, bookId, unitId, status, progressPercent, metadata, timezone = "UTC" }) {
  const profile = await getStudentProfile(userId);
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
        ...(status === "completed" ? { status: "completed" } : {}),
        metadata: metadata || null,
        lastActivityAt: new Date(),
      },
      ...(status === "completed" ? {} : { $setOnInsert: { status: status || "in_progress" } }),
      $max: { progressPercent: Math.max(0, Math.min(100, Number(progressPercent || 0))) },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  if (status === "completed" && ["book_view", "unit_view"].includes(activityType)) {
    const reward = await awardPoints({
      userId,
      studentProfileId: profile._id,
      points: 25,
      reason: `${activityType} completion`,
      sourceType: activityType,
      sourceId: progress._id.toString(),
      idempotencyKey: `${userId}:reward:${activityType}:${progress._id}:completion`,
      metadata,
    });
    if (reward.awarded) {
      const today = localDateKey(new Date(), timezone);
      await StudentDailyActivity.findOneAndUpdate(
        { userId, localDate: today },
        {
          $setOnInsert: { studentProfileId: profile._id, timezone },
          $inc: { completedActivities: 1, earnedPoints: 25 },
          $set: { qualifiesForStudyStreak: true, visited: true, lastActivityAt: new Date() },
        },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
  }
  return progress;
}

async function getDashboard(userId, timezone = "UTC") {
  const [profile, progressRows, conversations, sessions, dailyRows, subjects] = await Promise.all([
    getStudentProfile(userId),
    StudentProgress.find({ userId }).sort({ lastActivityAt: -1 }).lean(),
    TutorConversation.find({ candidateId: userId.toString() }).sort({ lastActivityAt: -1 }).limit(20).lean(),
    LiveSession.find({ candidateId: userId.toString() }).sort({ updatedAt: -1 }).limit(30).lean(),
    StudentDailyActivity.find({ userId }).sort({ localDate: -1 }).limit(370).lean(),
    listStudentSubjects(userId),
  ]);

  const completed = progressRows.filter((row) => row.status === "completed").length;
  const averageScoreRows = progressRows.filter((row) => typeof row.score === "number");
  const averageScore = averageScoreRows.length
    ? Math.round(averageScoreRows.reduce((sum, row) => sum + row.score, 0) / averageScoreRows.length)
    : 0;
  const [achievements, streak, plan] = await Promise.all([
    evaluateAchievements(userId, timezone),
    getStreak(userId, timezone),
    todayPlan(userId, timezone),
  ]);
  const [currentRewards, leaderboard] = await Promise.all([
    RewardAccount.findOne({ userId }).lean(),
    getLeaderboard(userId, { period: "week" }),
  ]);
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

  const studySeconds = dailyRows.reduce((sum, row) => sum + Number(row.activeSeconds || 0), 0);
  const todayKey = localDateKey(new Date(), timezone);
  const weekStart = new Date(`${todayKey}T00:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const monthStart = todayKey.slice(0, 7);
  const weekSeconds = dailyRows.filter((row) => row.localDate >= weekStart.toISOString().slice(0, 10)).reduce((sum, row) => sum + Number(row.activeSeconds || 0), 0);
  const monthSeconds = dailyRows.filter((row) => row.localDate.startsWith(monthStart)).reduce((sum, row) => sum + Number(row.activeSeconds || 0), 0);
  const weekPoints = dailyRows.filter((row) => row.localDate >= weekStart.toISOString().slice(0, 10)).reduce((sum, row) => sum + Number(row.earnedPoints || 0), 0);
  const currentRank = leaderboard.currentUser?.rank || null;
  return {
    profile,
    stats: {
      lessonsCompleted: completed,
      averageScore,
      totalTimeSpent: Math.round(studySeconds / 3600),
      badgesEarned: achievements.filter((item) => item.unlocked).length,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      totalPoints: currentRewards?.pointsBalance || 0,
      currentLevel: currentRewards?.level || 1,
      pointsToNextLevel: 500 - ((currentRewards?.pointsBalance || 0) % 500),
      totalLessonsCompleted: completed,
      streakDays: streak.current,
      weeklyProgress: weekPoints,
      monthlyGoal: (currentRewards?.level || 1) * 500,
      weeklyStudyMinutes: Math.round(weekSeconds / 60),
      monthlyStudyMinutes: Math.round(monthSeconds / 60),
      completionRate: progressRows.length ? Math.round(progressRows.reduce((sum, row) => sum + Number(row.progressPercent || 0), 0) / progressRows.length) : 0,
      studyTimeMinutes: Math.round(studySeconds / 60),
      rank: currentRank,
      totalUsers: leaderboard.totalUsers,
    },
    achievements,
    recentActivity,
    sessions,
    progress: progressRows,
    subjectDistribution: buildSubjectDistribution(progressRows, subjects),
    subjects,
    leaderboard,
    todayPlan: plan,
    dailyActivity: dailyRows,
  };
}

function buildSubjectDistribution(progressRows, subjects = []) {
  const counts = new Map();
  progressRows.forEach((row) => {
    const subject = row.metadata?.subject || row.subjectGroupKey || "Learning";
    counts.set(subject, (counts.get(subject) || 0) + Math.max(1, Number(row.timeSpentMinutes || 1)));
  });
  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0) || 1;
  const result = Array.from(counts.entries()).map(([name, value]) => ({
    name,
    value: Math.round((value / total) * 100),
  }));
  if (result.length) return result;
  return subjects.map((subject) => ({ name: subject.subject, value: 0 }));
}

module.exports = {
  getDashboard,
  getStudentProfile,
  listStudentBooks,
  listStudentSubjects,
  recordProgress,
};
