const express = require("express");
const router = express.Router();
const controller = require("../controller/GroupChat");
const { userAuth } = require("../middleware/userAuth");

router.use(userAuth);

router.get("/groups", controller.listGroups);
router.post("/groups", controller.createGroup);
router.get("/groups/:groupId", controller.getGroup);
router.delete("/groups/:groupId", controller.deleteGroup);
router.post("/groups/:groupId/leave", controller.leaveGroup);
router.post("/groups/:groupId/admin", controller.assignAdmin);
router.get("/groups/:groupId/messages", controller.getMessages);
router.post("/groups/:groupId/messages", controller.sendMessage);
router.post("/groups/:groupId/attachments", controller.uploadAttachment);
router.get("/messages/:messageId/attachment", controller.downloadAttachment);

module.exports = router;
