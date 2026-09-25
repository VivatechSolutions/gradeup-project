const express = require("express");
const controller = require("../controller/Student");
const { requireStudentAuth } = require("../middleware/studentAuth");

const router = express.Router();

router.use(requireStudentAuth);

router.get("/dashboard", controller.dashboard);
router.get("/library/subjects", controller.subjects);
router.get("/library/books", controller.books);
router.get("/progress/summary", controller.progressSummary);
router.post("/progress/content", controller.recordProgress);
router.get("/achievements", controller.achievements);
router.get("/leaderboard", controller.leaderboard);
router.post("/activity/check-in", controller.checkIn);
router.post("/activity-sessions", controller.startStudySession);
router.post("/activity-sessions/:sessionId/heartbeat", controller.heartbeatStudySession);
router.post("/activity-sessions/:sessionId/complete", controller.completeStudySession);
router.get("/calendar/events", controller.calendarEvents);
router.post("/calendar/events", controller.createCalendarEvent);
router.patch("/calendar/events/:eventId", controller.updateCalendarEvent);
router.delete("/calendar/events/:eventId", controller.removeCalendarEvent);
router.get("/today-plan", controller.todayPlan);

module.exports = router;
