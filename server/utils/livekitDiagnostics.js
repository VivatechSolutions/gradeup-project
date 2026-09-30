function getLivekitConfig(env = process.env) {
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  const livekitUrl = env.LIVEKIT_URL?.trim();
  const missing = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"].filter(key => !env[key]?.trim());
  let invalidUrl = false;
  if (livekitUrl) {
    try {
      const url = new URL(livekitUrl);
      invalidUrl = !["ws:", "wss:"].includes(url.protocol) || !url.hostname || Boolean(url.username || url.password);
    } catch { invalidUrl = true; }
  }
  return { apiKey, apiSecret, livekitUrl, missing, invalidUrl, configured: missing.length === 0 && !invalidUrl };
}

function logLivekitConfig(context, config = getLivekitConfig()) {
  // Never serialize the config: it contains credentials.
  const details = { context, missing: config.missing, invalidUrl: config.invalidUrl };
  if (config.configured) console.info("[LiveKit] Configuration present (connectivity not checked)", details);
  else console.error("[LiveKit] Configuration unavailable", details);
}

module.exports = { getLivekitConfig, logLivekitConfig };
