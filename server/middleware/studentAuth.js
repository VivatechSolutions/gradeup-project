const {
  resolveAccessUser,
  rotateRefresh,
  setAuthCookies,
  serializeUser,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} = require("../services/studentAuthService");

function hasCookie(req, name) {
  return (req.headers.cookie || "").split(";").some(part => {
    const value = part.trim();
    return value.startsWith(`${name}=`) && value.length > name.length + 1;
  });
}

function logAuthFailure(req, reason, stage) {
  // Use fixed fields only. Do not log headers, tokens, request bodies or error messages.
  if (!req.path?.endsWith("/livekit-token")) return;
  console.warn("[LiveKit][Auth] Request rejected", {
    reason,
    stage,
    accessCookiePresent: hasCookie(req, ACCESS_COOKIE),
    refreshCookiePresent: hasCookie(req, REFRESH_COOKIE),
    bearerPresent: /^Bearer\s+\S+/i.test(req.headers.authorization || ""),
  });
}

async function requireStudentAuth(req, res, next) {
  let stage = "access";
  let accessReason = "access-rejected";
  try {
    let user;
    try {
      user = await resolveAccessUser(req);
    } catch (error) {
      if (!["TokenExpiredError", "JsonWebTokenError", "NotBeforeError"].includes(error.name)) throw error;
      accessReason = error.name === "TokenExpiredError" ? "access-expired" : "access-invalid";
    }
    if (!user) {
      stage = "refresh";
      const refreshed = await rotateRefresh(req);
      if (refreshed) {
        user = refreshed.user;
        setAuthCookies(res, refreshed.tokens);
      }
    }
    if (!user) {
      const noCredentials = !hasCookie(req, ACCESS_COOKIE) && !hasCookie(req, REFRESH_COOKIE) &&
        !/^Bearer\s+\S+/i.test(req.headers.authorization || "");
      logAuthFailure(req, noCredentials ? "credentials-missing" : `${accessReason}-refresh-unavailable`, stage);
      return res.status(401).json({ status: false, message: "Authentication required" });
    }
    stage = "profile";
    req.studentUser = user;
    req.authUser = {
      id: user._id.toString(),
      role: "student",
      user: await serializeUser(user),
    };
    return next();
  } catch (error) {
    logAuthFailure(req, "authentication-service-error", stage);
    return res.status(503).json({ status: false, message: "Authentication is temporarily unavailable. Please try again." });
  }
}

module.exports = { requireStudentAuth };
