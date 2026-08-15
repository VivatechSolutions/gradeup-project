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

module.exports = router;
