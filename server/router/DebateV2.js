const express = require("express");
const controller = require("../controller/DebateV2");

const router = express.Router();

router.post("/start", controller.start);
router.post("/room/create", controller.createRoom);
router.post("/join", controller.join);
router.post("/room/join", controller.joinRoom);
router.post("/invite", controller.invite);
router.post("/respond", controller.respond);
router.post("/room/submit", controller.submitRoomTurn);
router.post("/end", controller.end);
router.post("/room/start", controller.startRoom);
router.post("/room/end", controller.endRoom);
router.post("/room/end/retry", controller.retryEndRoom);
router.get("/topics", controller.getTopics);
router.get("/session/:sessionId", controller.getSession);
router.get("/room/:sessionId", controller.getRoom);
router.get("/history", controller.getHistory);
router.get("/recommendations/:sessionId", controller.getRecommendations);
router.post("/room/livekit-token", controller.getLivekitToken);

module.exports = router;
