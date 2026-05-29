const express = require("express");
const controller = require("../controller/Tutor");

const router = express.Router();

router.post("/ask", controller.askTutor);
router.get("/history", controller.getTutorHistory);
router.delete("/history", controller.clearTutorHistory);
router.get("/conversations", controller.getTutorConversations);
router.get("/conversations/:conversationId", controller.getTutorConversation);
router.get("/faq", controller.getFaq);
router.get("/faq/section", controller.getFaqSection);
router.post("/faq/track", controller.trackFaq);
router.get("/question-bank", controller.getQuestionBank);
router.get("/question-bank/stats", controller.getQuestionBankStats);
router.post("/quiz/generate", controller.generateQuiz);
router.post("/quiz/submit", controller.submitQuiz);
router.get("/quiz/history", controller.getQuizHistory);
router.post("/homework/assign", controller.assignHomework);
router.post("/homework/submit", controller.submitHomework);
router.get("/homework", controller.getHomework);
router.get("/homework/history", controller.getHomeworkHistory);
router.get("/performance", controller.getPerformance);
router.get("/performance/points", controller.getPerformancePoints);

module.exports = router;
