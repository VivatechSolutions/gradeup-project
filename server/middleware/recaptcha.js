const axios = require("axios");

async function requireRecaptcha(req, res, next) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return res.status(503).json({ message: "Security verification is not configured" });
  const token = req.body?.recaptchaToken;
  if (typeof token !== "string" || !token || token.length > 8192) {
    return res.status(400).json({ message: "Please complete Google reCAPTCHA" });
  }
  try {
    const { data } = await axios.post("https://www.google.com/recaptcha/api/siteverify",
      new URLSearchParams({ secret, response: token }).toString(),
      { timeout: 10000, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    const hosts = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES || "").split(",").map(v => v.trim()).filter(Boolean);
    if (!data.success || (hosts.length && !hosts.includes(data.hostname))) {
      return res.status(400).json({ message: "Security verification expired or failed. Please try again." });
    }
    return next();
  } catch {
    return res.status(503).json({ message: "Security verification is unavailable. Please try again." });
  }
}
module.exports = { requireRecaptcha };
