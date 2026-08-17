const express = require("express");
const controller = require("../controller/Tutor");
const { requireStudentAuth } = require("../middleware/studentAuth");
const { injectStudentIdentity } = require("../middleware/injectStudentIdentity");

const router = express.Router();

router.use(requireStudentAuth, injectStudentIdentity);

router.post("/ask", controller.askTutor);
router.get("/history", controller.getTutorHistory);
router.delete("/history", controller.clearTutorHistory);
router.post("/speech/realtime-token", controller.getRealtimeSessionToken);
router.get("/conversations", controller.getTutorConversations);
router.get("/conversations/:conversationId", controller.getTutorConversation);
router.get("/faq", controller.getFaq);
router.get("/faq/section", controller.getFaqSection);
router.post("/faq/track", controller.trackFaq);
// router.get("/question-bank", controller.getQuestionBank);
// router.get("/question-bank/stats", controller.getQuestionBankStats);
router.post("/quiz/generate", controller.generateQuiz);
router.post("/quiz/submit", controller.submitQuiz);
router.get("/quiz/history", controller.getQuizHistory);
router.post("/homework/assign", controller.assignHomework);
router.post("/homework/submit", controller.submitHomework);
router.post("/homework/chat", controller.homeworkChat);
router.get("/homework/chat/history", controller.getHomeworkChatHistory);
router.get("/homework/chat/:homeworkId", controller.getHomeworkChatSession);
router.get("/homework", controller.getHomework);
router.get("/homework/history", controller.getHomeworkHistory);
router.get("/performance", controller.getPerformance);
router.get("/performance/points", controller.getPerformancePoints);
router.get(
  "/tutor/question-bank",
  controller.getQuestionBank
);

// Get Question Bank Stats
router.get(
  "/tutor/question-bank/stats",
  controller.getQuestionBankStats
);

// List Subject Metadata
router.get(
  "/tutor/subject-metadata",
  controller.listSubjectMetadata
);

module.exports = router;
