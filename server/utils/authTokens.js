const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || "gradeup-dev-secret";
}

function signUserToken(user, role) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

function signStudentPasswordResetToken(student, issuedAt) {
  return jwt.sign(
    {
      studentId: student._id.toString(),
      purpose: "student_password_reset",
      issuedAt,
    },
    getJwtSecret(),
    { expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || "1h" },
  );
}

function verifyStudentPasswordResetToken(token) {
  const decoded = jwt.verify(token, getJwtSecret());
  if (decoded.purpose !== "student_password_reset") {
    throw new Error("Invalid password reset token");
  }
  return decoded;
}

module.exports = {
  signUserToken,
  signStudentPasswordResetToken,
  verifyStudentPasswordResetToken,
};
