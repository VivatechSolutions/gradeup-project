const express = require("express");
const controller = require("../controller/Exam");
const { requireStudentAuth } = require("../middleware/studentAuth");
const { injectStudentIdentity } = require("../middleware/injectStudentIdentity");

const router = express.Router();
router.use(requireStudentAuth, injectStudentIdentity);

router.post("/prepare", controller.prepare);
router.post("/start", controller.start);
router.get("/attempts", controller.listAttempts);
router.get("/attempts/:examId", controller.getAttempt);
router.patch("/attempts/:examId/progress", controller.saveProgress);
router.post("/attempts/:examId/warnings", controller.addWarning);
router.post("/:examId/answer", controller.saveAnswer);
router.post("/:examId/submit", controller.submit);

module.exports = router;
