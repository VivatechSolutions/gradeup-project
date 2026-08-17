const express = require("express");
const router = express.Router();
const authController = require("../controller/Auth.js");
const { requireStudentAuth } = require("../middleware/studentAuth");


router.post("/student/register", authController.StudentRegister);
router.post("/register", authController.StudentRegister);
router.post("/login", authController.StudentLogin);
router.post("/student/oauth/google", authController.studentGoogleLogin);
router.post("/student/oauth/microsoft", authController.studentMicrosoftLogin);
router.get("/me", requireStudentAuth, authController.me);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

module.exports = router;
