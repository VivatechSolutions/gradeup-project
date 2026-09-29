const express = require("express");
const router = express.Router();
const authController = require("../controller/Auth.js");
const { requireStudentAuth } = require("../middleware/studentAuth");


router.post("/student/register", authController.StudentRegister);
router.post("/register", authController.StudentRegister);
const { requireRecaptcha } = require("../middleware/recaptcha");
const reset = require("../controller/StudentPasswordReset");
const authRateLimit = require("../middleware/authRateLimit");
router.post("/login", authRateLimit, requireRecaptcha, authController.StudentLogin);
router.post("/forgot-password", authRateLimit, requireRecaptcha, reset.forgot);
router.get("/reset-password/verify", authRateLimit, reset.verify);
router.post("/reset-password", authRateLimit, requireRecaptcha, reset.reset);
router.post("/student/oauth/google", authController.studentGoogleLogin);
router.post("/student/oauth/microsoft", authController.studentMicrosoftLogin);
router.get("/me", requireStudentAuth, authController.me);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

module.exports = router;
