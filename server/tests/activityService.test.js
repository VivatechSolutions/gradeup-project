const assert = require("assert");
const { calculateStreak, localDateKey, normalizeScore, safeTimezone } = require("../services/activityService");

assert.deepStrictEqual(calculateStreak([], "2026-09-25"), { current: 0, longest: 0 });
assert.deepStrictEqual(
  calculateStreak(["2026-09-20", "2026-09-21", "2026-09-23", "2026-09-24", "2026-09-25"], "2026-09-25"),
  { current: 3, longest: 3 },
);
assert.deepStrictEqual(calculateStreak(["2026-09-20", "2026-09-21"], "2026-09-25"), { current: 0, longest: 2 });
assert.strictEqual(normalizeScore(8, 10), 80);
assert.strictEqual(normalizeScore(12, 10), 100);
assert.strictEqual(normalizeScore(1, 0), null);
assert.strictEqual(safeTimezone("not/a-zone"), "UTC");
assert.strictEqual(localDateKey(new Date("2026-09-24T20:00:00.000Z"), "Asia/Calcutta"), "2026-09-25");

console.log("activityService tests passed");
