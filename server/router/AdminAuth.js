const express = require("express");
const adminAuthController = require("../controller/AdminAuth");
const { requireAdminAuth } = require("../middleware/adminAuth");

const router = express.Router();

router.post("/login", adminAuthController.login);
router.post("/forgot-password", adminAuthController.forgotPassword);
router.get("/reset-password/verify", adminAuthController.verifyResetToken);
router.post("/reset-password", adminAuthController.resetPassword);
router.get("/me", requireAdminAuth, adminAuthController.me);
router.post("/change-password", requireAdminAuth, adminAuthController.changePassword);
router.post("/logout", requireAdminAuth, adminAuthController.logout);

module.exports = router;
