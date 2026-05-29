const bcrypt = require("bcrypt");
const AdminUser = require("../model/AdminUser");
const { sendEmail } = require("../config/EmailTransporter");
const { getAdminWelcomeEmail } = require("../config/EmailTemplate");

function sanitizeAdmin(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

async function countSuperAdmins(excludeId) {
  const filter = { role: "super_admin" };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return AdminUser.countDocuments(filter);
}

const controller = {
  async list(req, res) {
    try {
      const admins = await AdminUser.find({})
        .sort({ createdAt: -1 })
        .select("_id name email role isActive lastLoginAt createdAt updatedAt");

      return res.status(200).json({
        status: true,
        data: admins.map(sanitizeAdmin),
      });
    } catch (error) {
      console.log("Error in admin user list", error);
      return res.status(500).json({
        status: false,
        message: "Failed to fetch admin users",
      });
    }
  },

  async create(req, res) {
    try {
      const name = req.body?.name?.trim();
      const email = req.body?.email?.toLowerCase()?.trim();
      const password = req.body?.password;
      const role = req.body?.role === "super_admin" ? "super_admin" : "admin";
      const isActive = req.body?.isActive !== false;

      if (!name || !email || !password) {
        return res.status(400).json({
          status: false,
          message: "name, email and password are required",
        });
      }

      const existingAdmin = await AdminUser.findOne({ email });
      if (existingAdmin) {
        return res.status(409).json({
          status: false,
          message: "Admin user already exists with this email",
        });
      }

      const saltRounds = Number(process.env.ADMIN_BCRYPT_ROUNDS || 10);
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const admin = await AdminUser.create({
        name,
        email,
        passwordHash,
        role,
        isActive,
        mustResetPassword: true,
        passwordChangedAt: null,
      });

      const appUrl = process.env.ADMIN_APP_URL || "http://localhost:5174";
      const emailContent = getAdminWelcomeEmail({
        name,
        email,
        password,
        appUrl,
      });

      await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      return res.status(201).json({
        status: true,
        message: "Admin user created successfully",
        data: sanitizeAdmin(admin),
      });
    } catch (error) {
      console.log("Error in admin user create", error);
      return res.status(500).json({
        status: false,
        message: "Failed to create admin user",
      });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const admin = await AdminUser.findById(id);

      if (!admin) {
        return res.status(404).json({
          status: false,
          message: "Admin user not found",
        });
      }

      const name = req.body?.name?.trim();
      const email = req.body?.email?.toLowerCase()?.trim();
      const password = req.body?.password;
      const role = req.body?.role;
      const isActive = req.body?.isActive;

      if (name) {
        admin.name = name;
      }

      if (email && email !== admin.email) {
        const existingAdmin = await AdminUser.findOne({ email, _id: { $ne: id } });
        if (existingAdmin) {
          return res.status(409).json({
            status: false,
            message: "Another admin user already uses this email",
          });
        }

        admin.email = email;
      }

      if (role === "admin" || role === "super_admin") {
        if (
          admin.role === "super_admin" &&
          role !== "super_admin" &&
          (await countSuperAdmins(id)) === 0
        ) {
          return res.status(400).json({
            status: false,
            message: "At least one super admin must remain active",
          });
        }

        admin.role = role;
      }

      if (typeof isActive === "boolean") {
        if (
          admin.role === "super_admin" &&
          isActive === false &&
          (await countSuperAdmins(id)) === 0
        ) {
          return res.status(400).json({
            status: false,
            message: "At least one super admin must remain active",
          });
        }

        admin.isActive = isActive;
      }

      if (password) {
        const saltRounds = Number(process.env.ADMIN_BCRYPT_ROUNDS || 10);
        admin.passwordHash = await bcrypt.hash(password, saltRounds);
        admin.mustResetPassword = true;
        admin.passwordChangedAt = null;
      }

      await admin.save();

      return res.status(200).json({
        status: true,
        message: "Admin user updated successfully",
        data: sanitizeAdmin(admin),
      });
    } catch (error) {
      console.log("Error in admin user update", error);
      return res.status(500).json({
        status: false,
        message: "Failed to update admin user",
      });
    }
  },

  async remove(req, res) {
    try {
      const { id } = req.params;

      if (req.admin._id.toString() === id) {
        return res.status(400).json({
          status: false,
          message: "You cannot delete your own account",
        });
      }

      const admin = await AdminUser.findById(id);
      if (!admin) {
        return res.status(404).json({
          status: false,
          message: "Admin user not found",
        });
      }

      if (
        admin.role === "super_admin" &&
        admin.isActive &&
        (await countSuperAdmins(id)) === 0
      ) {
        return res.status(400).json({
          status: false,
          message: "At least one super admin must remain active",
        });
      }

      await admin.deleteOne();

      return res.status(200).json({
        status: true,
        message: "Admin user deleted successfully",
      });
    } catch (error) {
      console.log("Error in admin user delete", error);
      return res.status(500).json({
        status: false,
        message: "Failed to delete admin user",
      });
    }
  },
};

module.exports = controller;
