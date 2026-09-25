const RewardAccount = require("../model/RewardAccount");
const RewardTransaction = require("../model/RewardTransaction");

async function ensureRewardAccount(userId, studentProfileId) {
  return RewardAccount.findOneAndUpdate(
    { userId },
    { $setOnInsert: { studentProfileId, pointsBalance: 0, level: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function awardPoints({ userId, studentProfileId, points, reason, sourceType, sourceId, idempotencyKey, metadata }) {
  const amount = Math.max(0, Math.round(Number(points || 0)));
  const account = await ensureRewardAccount(userId, studentProfileId);
  if (!amount) return { account, awarded: false, transaction: null };

  const key = idempotencyKey || `${userId}:${sourceType}:${sourceId}:${reason}`;
  const result = await RewardTransaction.updateOne(
    { idempotencyKey: key },
    {
      $setOnInsert: {
        userId,
        rewardAccountId: account._id,
        points: amount,
        reason,
        sourceType,
        sourceId: sourceId || null,
        idempotencyKey: key,
        metadata: metadata || null,
      },
    },
    { upsert: true },
  );

  if (!result.upsertedCount) return { account, awarded: false, transaction: null };

  const updated = await RewardAccount.findOneAndUpdate(
    { _id: account._id },
    { $inc: { pointsBalance: amount } },
    { new: true },
  );
  updated.level = Math.max(1, Math.floor(updated.pointsBalance / 500) + 1);
  await updated.save();
  const transaction = await RewardTransaction.findOne({ idempotencyKey: key }).lean();
  return { account: updated, awarded: true, transaction };
}

module.exports = { awardPoints, ensureRewardAccount };
