const express = require("express");
const controller = require("../controller/Dashboard");

const router = express.Router();

router.get("/student/stats", controller.getStudentStats);
router.get("/student/streak", controller.getStudentStreak);
router.get("/teacher/stats", controller.getTeacherStats);

module.exports = router;
