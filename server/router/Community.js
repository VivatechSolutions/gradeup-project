const express = require("express");
const router = express.Router();
const controller = require("../controller/Community");
const { requireStudentAuth } = require("../middleware/studentAuth");

router.use(requireStudentAuth);

router.get("/posts", controller.listPosts);
router.post("/posts", controller.createPost);
router.post("/posts/:postId/like", controller.toggleLike);
router.post("/posts/:postId/comments", controller.addComment);
router.get("/polls", controller.listPolls);
router.post("/polls", controller.createPoll);
router.post("/polls/:pollId/options/:optionId/vote", controller.votePoll);
router.get("/trending-topics", controller.getTrendingTopics);
router.get("/points", controller.getPoints);
router.get("/badges", controller.getBadges);
router.get("/leaderboard", controller.getLeaderboard);
router.get("/classmates", controller.getClassmates);
router.get("/messages", controller.listMessages);
router.post("/messages", controller.createMessage);
router.post("/group-messages", controller.createMessage);

module.exports = router;
