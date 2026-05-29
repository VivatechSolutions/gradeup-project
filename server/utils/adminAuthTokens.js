const jwt = require("jsonwebtoken");

function getAdminJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;

  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET is not configured");
  }

  return secret;
}

function signAdminToken(admin) {
  const expiresIn = process.env.ADMIN_JWT_EXPIRES_IN || "1d";

  return jwt.sign(
    {
      adminId: admin._id.toString(),
      role: admin.role,
    },
    getAdminJwtSecret(),
    { expiresIn },
  );
}

function signPasswordResetToken(admin, issuedAt) {
  return jwt.sign(
    {
      adminId: admin._id.toString(),
      purpose: "admin_password_reset",
      issuedAt,
    },
    getAdminJwtSecret(),
    { expiresIn: process.env.ADMIN_PASSWORD_RESET_EXPIRES_IN || "1h" },
  );
}

function verifyPasswordResetToken(token) {
  const decoded = jwt.verify(token, getAdminJwtSecret());

  if (decoded.purpose !== "admin_password_reset") {
    throw new Error("Invalid password reset token");
  }

  return decoded;
}

module.exports = {
  getAdminJwtSecret,
  signAdminToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
};
