const express = require("express");
const router = express.Router();
const controller = require("../controller/GroupChat");
const { requireStudentAuth } = require("../middleware/studentAuth");

router.get("/invites/:token", controller.getInvite);
router.post("/invites/:token/accept", requireStudentAuth, controller.acceptInvite);

router.use(requireStudentAuth);

router.get("/groups", controller.listGroups);
router.post("/groups", controller.createGroup);
router.get("/groups/:groupId", controller.getGroup);
router.delete("/groups/:groupId", controller.deleteGroup);
router.post("/groups/:groupId/leave", controller.leaveGroup);
router.post("/groups/:groupId/admin", controller.assignAdmin);
router.get("/groups/:groupId/search-members", controller.searchMembers);
router.post("/groups/:groupId/members", controller.addMember);
router.post("/groups/:groupId/invites", controller.createInvite);
router.get("/groups/:groupId/messages", controller.getMessages);
router.post("/groups/:groupId/messages", controller.sendMessage);
router.post("/groups/:groupId/attachments", controller.uploadAttachment);
router.post("/groups/:groupId/session-cards", controller.sendSessionCard);
router.post("/session-invites", controller.sendSessionInvites);
router.get("/messages/:messageId/attachment", controller.downloadAttachment);

module.exports = router;
