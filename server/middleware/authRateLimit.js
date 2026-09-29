// Per-process protection; configure a shared gateway limit for multi-instance deployments.
const buckets = new Map();
module.exports = function authRateLimit(req, res, next) {
  const now = Date.now();
  for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
  const key = `${req.ip}:${req.path}`;
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= 10000) return res.status(429).json({ message: "Please try again later" });
    bucket = { count: 0, until: now + 15 * 60 * 1000 };
    buckets.set(key, bucket);
  }
  if (++bucket.count > 20) {
    res.set("Retry-After", String(Math.ceil((bucket.until - now) / 1000)));
    return res.status(429).json({ message: "Too many attempts. Please try again later." });
  }
  next();
};
