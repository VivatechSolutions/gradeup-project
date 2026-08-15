const {
  resolveAccessUser,
  rotateRefresh,
  setAuthCookies,
  serializeUser,
} = require("../services/studentAuthService");

async function requireStudentAuth(req, res, next) {
  try {
    let user = await resolveAccessUser(req).catch(() => null);
    if (!user) {
      const refreshed = await rotateRefresh(req).catch(() => null);
      if (refreshed) {
        user = refreshed.user;
        setAuthCookies(res, refreshed.tokens);
      }
    }
    if (!user) {
      return res.status(401).json({ status: false, message: "Authentication required" });
    }
    req.studentUser = user;
    req.authUser = {
      id: user._id.toString(),
      role: "student",
      user: await serializeUser(user),
    };
    return next();
  } catch (error) {
    return res.status(401).json({ status: false, message: "Authentication required" });
  }
}

module.exports = { requireStudentAuth };
