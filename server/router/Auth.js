const express = require("express");
const router = express.Router();
const authController = require("../controller/Auth.js");
const { requireStudentAuth } = require("../middleware/studentAuth");
const authRateLimit = require("../middleware/authRateLimit");


router.post("/student/register", authRateLimit, authController.StudentRegister);
router.post("/register", authRateLimit, authController.StudentRegister);
router.post("/student/email/check", authRateLimit, authController.checkStudentEmail);
const { requireRecaptcha } = require("../middleware/recaptcha");
const reset = require("../controller/StudentPasswordReset");
router.post("/student/verification/resend", authRateLimit, requireRecaptcha, authController.resendStudentVerification);
router.post("/student/verification/verify", authRateLimit, authController.verifyStudentEmail);
router.post("/login", authRateLimit, requireRecaptcha, authController.StudentLogin);
router.post("/forgot-password", authRateLimit, requireRecaptcha, reset.forgot);
router.get("/reset-password/verify", authRateLimit, reset.verify);
router.post("/reset-password", authRateLimit, requireRecaptcha, reset.reset);
router.post("/student/oauth/google", authRateLimit, authController.studentGoogleLogin);
router.post("/student/oauth/microsoft", authRateLimit, authController.studentMicrosoftLogin);
router.get("/me", requireStudentAuth, authController.me);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

module.exports = router;
