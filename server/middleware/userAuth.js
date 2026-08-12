const jwt = require("jsonwebtoken");
const Student = require("../model/Student");
const Teacher = require("../model/Teacher");

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || "gradeup-dev-secret";
}

function readBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

async function resolveUserFromToken(token) {
  const decoded = jwt.verify(token, getJwtSecret());
  const role = decoded.role === "teacher" ? "teacher" : "student";
  const Model = role === "teacher" ? Teacher : Student;
  const user = await Model.findById(decoded.userId).select("-password");
  if (!user) return null;
  return { id: user._id.toString(), role, user };
}

async function userAuth(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) return res.status(401).json({ status: false, message: "Authorization token is required" });
    const resolved = await resolveUserFromToken(token);
    if (!resolved) return res.status(401).json({ status: false, message: "Unauthorized" });
    req.authUser = resolved;
    next();
  } catch (error) {
    return res.status(401).json({ status: false, message: "Unauthorized" });
  }
}

module.exports = { userAuth, readBearerToken, resolveUserFromToken };
