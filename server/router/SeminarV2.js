const express = require("express");
const controller = require("../controller/SeminarV2");

const router = express.Router();

router.post("/start", controller.start);
router.post("/create-room", controller.createRoom);
router.post("/room/start", controller.startRoom);
router.post("/join", controller.join);
router.post("/remove-participant", controller.removeParticipant);
router.post("/respond", controller.respond);
router.post("/message", controller.message);
router.post("/request-speak", controller.requestSpeak);
router.post("/respond-speak", controller.respondSpeak);
router.post("/guide", controller.guide);
router.post("/end", controller.end);
router.post("/chat/start", controller.chatStart);
router.post("/chat/respond", controller.chatRespond);
router.get("/active", controller.getActive);
router.get("/topics", controller.getTopics);
router.get("/session/:sessionId", controller.getSession);
router.get("/history", controller.getHistory);
router.get("/attended-topics", controller.getAttendedTopics);
router.get("/report/:sessionId", controller.getReport);

module.exports = router;
