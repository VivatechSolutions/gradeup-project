const mongoose = require("mongoose");
const Batch = require("../model/Batch");
const BatchMembership = require("../model/BatchMembership");
const RewardAccount = require("../model/RewardAccount");
const RewardTransaction = require("../model/RewardTransaction");
const StudentProfile = require("../model/StudentProfile");
const User = require("../model/User");

function periodStart(period) {
  const now = new Date();
  if (period === "all") return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "month") start.setDate(1);
  else start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

async function resolveCohort(userId, requestedBatchId) {
  const profile = await StudentProfile.findOne({ userId }).lean();
  if (!profile) {
    const error = new Error("Student profile not found");
    error.statusCode = 404;
    throw error;
  }
  const membershipQuery = { userId, status: "active" };
  if (requestedBatchId && mongoose.isValidObjectId(requestedBatchId)) membershipQuery.batchId = requestedBatchId;
  const membership = await BatchMembership.findOne(membershipQuery).lean();
  if (membership) {
    const batch = await Batch.findOne({ _id: membership.batchId, status: "active" }).lean();
    if (batch) {
      const members = await BatchMembership.find({ batchId: batch._id, status: "active" }).select("userId").lean();
      return { id: batch._id.toString(), name: batch.name, type: "batch", userIds: members.map((item) => item.userId) };
    }
  }
  const context = profile.independentLearningContext || {};
  const peers = await StudentProfile.find({
    status: "active",
    "independentLearningContext.board": context.board,
    "independentLearningContext.classNumber": context.classNumber,
  }).select("userId").lean();
  return {
    id: `${context.board || "board"}:${context.classNumber || "class"}`,
    name: [context.board, context.classNumber ? `Class ${context.classNumber}` : null].filter(Boolean).join(" · ") || "My cohort",
    type: "cohort",
    userIds: peers.map((item) => item.userId),
  };
}

async function getLeaderboard(userId, { period = "week", batchId } = {}) {
  const safePeriod = ["week", "month", "all"].includes(period) ? period : "week";
  const cohort = await resolveCohort(userId, batchId);
  const start = periodStart(safePeriod);
  let pointRows;
  if (!start) {
    pointRows = await RewardAccount.find({ userId: { $in: cohort.userIds } }).select("userId pointsBalance").lean();
    pointRows = pointRows.map((row) => ({ userId: row.userId, points: row.pointsBalance }));
  } else {
    pointRows = await RewardTransaction.aggregate([
      { $match: { userId: { $in: cohort.userIds }, createdAt: { $gte: start } } },
      { $group: { _id: "$userId", points: { $sum: "$points" } } },
    ]);
    pointRows = pointRows.map((row) => ({ userId: row._id, points: row.points }));
  }
  const pointsByUser = new Map(pointRows.map((row) => [row.userId.toString(), Number(row.points || 0)]));
  const users = await User.find({ _id: { $in: cohort.userIds }, status: "active", deletedAt: null }).select("firstName lastName").lean();
  const entries = users
    .map((user) => ({
      userId: user._id.toString(),
      name: `${user.firstName} ${user.lastName}`.trim(),
      points: pointsByUser.get(user._id.toString()) || 0,
      isCurrentUser: user._id.toString() === userId.toString(),
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  return {
    period: safePeriod,
    cohort: { id: cohort.id, name: cohort.name, type: cohort.type },
    entries,
    currentUser: entries.find((entry) => entry.isCurrentUser) || null,
    totalUsers: entries.length,
  };
}

module.exports = { getLeaderboard };
