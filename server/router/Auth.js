const express = require("express");
const router = express.Router();
const authController = require("../controller/Auth.js");

router.post("/student/register", authController.StudentRegister);
router.post("/register", authController.StudentRegister);
router.post("/student/login", authController.StudentLogin);
router.post("/login", (req, res) => {
  if (req.body?.role === "teacher") {
    return authController.teacherLogin(req, res);
  }
  return authController.StudentLogin(req, res);
});
router.post("/teacher/login", authController.teacherLogin);
router.post("/teacher/register", authController.teacherRegister);
router.post("/forgot-password", authController.forgotPassword);
router.get("/reset-password/verify", authController.verifyResetToken);
router.post("/reset-password", authController.resetPassword);
router.post("/student/google", authController.studentGoogleLogin);
router.post("/google", authController.studentGoogleLogin);
router.post("/teacher/google", authController.TeacherGoogleLogin);
router.get("/me", authController.me);
router.post("/logout", (req, res) => res.status(200).json({ status: true, message: "Logout successful" }));

module.exports = router;
