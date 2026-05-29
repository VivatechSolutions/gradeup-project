const bcrypt = require("bcrypt");
const AdminUser = require("../model/AdminUser");
const { sendEmail } = require("../config/EmailTransporter");
const { getPasswordResetEmail } = require("../config/EmailTemplate");
const {
  signAdminToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
} = require("../utils/adminAuthTokens");

function getAdminAppUrl() {
  return process.env.ADMIN_APP_URL || "http://localhost:5174";
}

const controller = {
  async login(req, res) {
    try {
      const email = req.body?.email?.toLowerCase()?.trim();
      const password = req.body?.password;

      if (!email || !password) {
        return res.status(400).json({
          status: false,
          message: "email and password are required",
        });
      }

      const admin = await AdminUser.findOne({ email });
      if (!admin || !admin.isActive) {
        return res.status(401).json({
          status: false,
          message: "Invalid credentials",
        });
      }

      const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
      if (!passwordMatches) {
        return res.status(401).json({
          status: false,
          message: "Invalid credentials",
        });
      }

      admin.lastLoginAt = new Date();
      await admin.save();

      return res.status(200).json({
        status: true,
        message: "Login successful",
        data: {
          token: signAdminToken(admin),
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            mustResetPassword: admin.mustResetPassword,
          },
        },
      });
    } catch (error) {
      console.log("Error in admin login", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async me(req, res) {
    return res.status(200).json({
      status: true,
      data: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role,
        mustResetPassword: req.admin.mustResetPassword,
      },
    });
  },

  async changePassword(req, res) {
    try {
      const currentPassword = req.body?.currentPassword;
      const newPassword = req.body?.newPassword;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          status: false,
          message: "newPassword must be at least 8 characters",
        });
      }

      const admin = await AdminUser.findById(req.admin._id);
      if (!admin || !admin.isActive) {
        return res.status(404).json({
          status: false,
          message: "Admin account not found",
        });
      }

      if (!admin.mustResetPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            status: false,
            message: "currentPassword is required",
          });
        }

        const passwordMatches = await bcrypt.compare(
          currentPassword,
          admin.passwordHash,
        );
        if (!passwordMatches) {
          return res.status(401).json({
            status: false,
            message: "Current password is incorrect",
          });
        }
      }

      const saltRounds = Number(process.env.ADMIN_BCRYPT_ROUNDS || 10);
      admin.passwordHash = await bcrypt.hash(newPassword, saltRounds);
      admin.mustResetPassword = false;
      admin.passwordChangedAt = new Date();
      admin.passwordResetIssuedAt = null;
      await admin.save();

      return res.status(200).json({
        status: true,
        message: "Password updated successfully",
        data: {
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            mustResetPassword: admin.mustResetPassword,
          },
        },
      });
    } catch (error) {
      console.log("Error in admin change password", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async forgotPassword(req, res) {
    try {
      const email = req.body?.email?.toLowerCase()?.trim();

      if (!email) {
        return res.status(400).json({
          status: false,
          message: "email is required",
        });
      }

      const admin = await AdminUser.findOne({ email, isActive: true });
      if (admin) {
        const issuedAt = Date.now();
        admin.passwordResetIssuedAt = new Date(issuedAt);
        await admin.save();

        const resetToken = signPasswordResetToken(admin, issuedAt);
        const appUrl = getAdminAppUrl();
        const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
        const emailContent = getPasswordResetEmail({
          name: admin.name,
          resetUrl,
          appUrl,
        });

        await sendEmail({
          to: admin.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      }

      return res.status(200).json({
        status: true,
        message: "If that email exists, a reset link has been sent",
      });
    } catch (error) {
      console.log("Error in admin forgot password", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async verifyResetToken(req, res) {
    try {
      const token = req.query?.token;
      if (!token) {
        return res.status(400).json({
          status: false,
          message: "token is required",
        });
      }

      const decoded = verifyPasswordResetToken(token);
      const admin = await AdminUser.findById(decoded.adminId).select(
        "_id name email isActive passwordResetIssuedAt",
      );

      if (!admin || !admin.isActive) {
        return res.status(400).json({
          status: false,
          message: "Reset link is invalid",
        });
      }

      const issuedAt = admin.passwordResetIssuedAt?.getTime();
      if (!issuedAt || issuedAt !== decoded.issuedAt) {
        return res.status(400).json({
          status: false,
          message: "Reset link is expired or has already been used",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Reset token is valid",
        data: {
          email: admin.email,
          name: admin.name,
        },
      });
    } catch (error) {
      return res.status(400).json({
        status: false,
        message: "Reset link is invalid or expired",
      });
    }
  },

  async resetPassword(req, res) {
    try {
      const token = req.body?.token;
      const newPassword = req.body?.newPassword;

      if (!token || !newPassword) {
        return res.status(400).json({
          status: false,
          message: "token and newPassword are required",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          status: false,
          message: "newPassword must be at least 8 characters",
        });
      }

      const decoded = verifyPasswordResetToken(token);
      const admin = await AdminUser.findById(decoded.adminId);

      if (!admin || !admin.isActive) {
        return res.status(400).json({
          status: false,
          message: "Reset link is invalid",
        });
      }

      const issuedAt = admin.passwordResetIssuedAt?.getTime();
      if (!issuedAt || issuedAt !== decoded.issuedAt) {
        return res.status(400).json({
          status: false,
          message: "Reset link is expired or has already been used",
        });
      }

      const saltRounds = Number(process.env.ADMIN_BCRYPT_ROUNDS || 10);
      admin.passwordHash = await bcrypt.hash(newPassword, saltRounds);
      admin.mustResetPassword = false;
      admin.passwordChangedAt = new Date();
      admin.passwordResetIssuedAt = null;
      await admin.save();

      return res.status(200).json({
        status: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      return res.status(400).json({
        status: false,
        message: "Reset link is invalid or expired",
      });
    }
  },

  async logout(req, res) {
    return res.status(200).json({
      status: true,
      message: "Logout successful",
    });
  },
};

module.exports = controller;
