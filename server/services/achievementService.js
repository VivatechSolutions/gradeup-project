const StudentAchievement = require("../model/StudentAchievement");
const StudentProgress = require("../model/StudentProgress");
const RewardAccount = require("../model/RewardAccount");
const TutorConversation = require("../model/TutorConversation");
const LiveSession = require("../model/LiveSession");
const StudentDailyActivity = require("../model/StudentDailyActivity");
const StudentProfile = require("../model/StudentProfile");
const { calculateStreak, localDateKey } = require("./activityService");
const { awardPoints } = require("./rewardService");

const DEFINITIONS = [
  { key: "first_steps", title: "First Steps", description: "Start your first learning activity", icon: "BookOpen", tier: "bronze", rewardPoints: 5, metric: "activities", target: 1 },
  { key: "book_explorer", title: "Book Explorer", description: "Complete 5 learning items", icon: "Trophy", tier: "silver", rewardPoints: 20, metric: "completed", target: 5 },
  { key: "debater", title: "Debater", description: "Complete a debate session", icon: "Medal", tier: "gold", rewardPoints: 25, metric: "debates", target: 1 },
  { key: "seminar_starter", title: "Seminar Starter", description: "Complete a seminar session", icon: "Star", tier: "gold", rewardPoints: 25, metric: "seminars", target: 1 },
  { key: "point_collector", title: "Point Collector", description: "Earn 500 XP", icon: "Crown", tier: "gold", rewardPoints: 25, metric: "points", target: 500 },
  { key: "streak_3", title: "Momentum Builder", description: "Maintain a 3-day study streak", icon: "Flame", tier: "bronze", rewardPoints: 10, metric: "streak", target: 3 },
  { key: "streak_7", title: "7-Day Streak Master", description: "Maintain a 7-day study streak", icon: "Flame", tier: "silver", rewardPoints: 30, metric: "streak", target: 7 },
  { key: "streak_14", title: "Fortnight Focus", description: "Maintain a 14-day study streak", icon: "Flame", tier: "gold", rewardPoints: 60, metric: "streak", target: 14 },
  { key: "streak_30", title: "Monthly Momentum", description: "Maintain a 30-day study streak", icon: "Crown", tier: "gold", rewardPoints: 125, metric: "streak", target: 30 },
  { key: "study_60", title: "Focus Master", description: "Study actively for 60 minutes in one day", icon: "Clock", tier: "silver", rewardPoints: 20, metric: "bestDailyMinutes", target: 60 },
  { key: "quiz_90", title: "Quiz Whiz", description: "Score at least 90% on a quiz", icon: "Target", tier: "gold", rewardPoints: 25, metric: "bestQuizScore", target: 90 },
];

async function buildMetrics(userId, timezone = "UTC") {
  const [progress, rewards, conversations, sessions, daily] = await Promise.all([
    StudentProgress.find({ userId }).select("status activityType score").lean(),
    RewardAccount.findOne({ userId }).lean(),
    TutorConversation.countDocuments({ candidateId: userId.toString() }),
    LiveSession.find({ candidateId: userId.toString(), status: "completed" }).select("sessionType").lean(),
    StudentDailyActivity.find({ userId }).select("localDate activeSeconds qualifiesForStudyStreak").lean(),
  ]);
  const streak = calculateStreak(
    daily.filter((row) => row.qualifiesForStudyStreak).map((row) => row.localDate),
    localDateKey(new Date(), timezone),
  );
  return {
    activities: progress.length + conversations + sessions.length,
    completed: progress.filter((row) => row.status === "completed").length,
    debates: sessions.filter((row) => row.sessionType === "debate").length,
    seminars: sessions.filter((row) => row.sessionType === "seminar").length,
    points: rewards?.pointsBalance || 0,
    streak: streak.current,
    bestDailyMinutes: daily.reduce((best, row) => Math.max(best, Math.floor(Number(row.activeSeconds || 0) / 60)), 0),
    bestQuizScore: progress.filter((row) => row.activityType === "quiz" && typeof row.score === "number").reduce((best, row) => Math.max(best, row.score), 0),
  };
}

async function evaluateAchievements(userId, timezone = "UTC") {
  const profile = await StudentProfile.findOne({ userId }).lean();
  if (!profile) return [];
  const metrics = await buildMetrics(userId, timezone);
  for (const definition of DEFINITIONS) {
    const currentValue = Number(metrics[definition.metric] || 0);
    if (currentValue < definition.target) continue;
    const result = await StudentAchievement.updateOne(
      { userId, achievementKey: definition.key, version: 1 },
      {
        $setOnInsert: {
          studentProfileId: profile._id,
          unlockedAt: new Date(),
          rewardPoints: definition.rewardPoints,
          metadata: { currentValue, targetValue: definition.target },
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount && definition.rewardPoints) {
      await awardPoints({
        userId,
        studentProfileId: profile._id,
        points: definition.rewardPoints,
        reason: `Achievement: ${definition.title}`,
        sourceType: "achievement",
        sourceId: definition.key,
        idempotencyKey: `${userId}:reward:achievement:${definition.key}:1`,
      });
    }
  }
  const unlocks = await StudentAchievement.find({ userId }).lean();
  const unlockMap = new Map(unlocks.map((item) => [item.achievementKey, item]));
  return DEFINITIONS.map((definition, index) => {
    const unlock = unlockMap.get(definition.key);
    const currentValue = Number(metrics[definition.metric] || 0);
    return {
      id: definition.key,
      order: index + 1,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      tier: definition.tier,
      unlocked: Boolean(unlock),
      unlockedAt: unlock?.unlockedAt || null,
      date: unlock?.unlockedAt || null,
      currentValue,
      targetValue: definition.target,
      progressPercent: Math.min(100, Math.round((currentValue / definition.target) * 100)),
      rewardPoints: definition.rewardPoints,
    };
  });
}

module.exports = { DEFINITIONS, buildMetrics, evaluateAchievements };
