const jwt = require("jsonwebtoken");
const AdminUser = require("../model/AdminUser");

async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        status: false,
        message: "Authorization token is required",
      });
    }

    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        status: false,
        message: "ADMIN_JWT_SECRET is not configured",
      });
    }

    const decoded = jwt.verify(token, secret);
    const admin = await AdminUser.findById(decoded.adminId).select(
      "_id name email role isActive mustResetPassword passwordChangedAt",
    );

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        status: false,
        message: "Admin account is invalid or inactive",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: "Invalid or expired token",
    });
  }
}

function requirePasswordResetResolved(req, res, next) {
  if (req.admin?.mustResetPassword) {
    return res.status(403).json({
      status: false,
      message: "Password reset required before accessing this resource",
      code: "PASSWORD_RESET_REQUIRED",
    });
  }

  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.admin) {
    return res.status(401).json({
      status: false,
      message: "Authorization required",
    });
  }

  if (req.admin.role !== "super_admin") {
    return res.status(403).json({
      status: false,
      message: "Super admin access required",
    });
  }

  next();
}

module.exports = { requireAdminAuth, requirePasswordResetResolved, requireSuperAdmin };
