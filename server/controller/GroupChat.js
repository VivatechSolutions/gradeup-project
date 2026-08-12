const fs = require("fs");
const path = require("path");
const formidable = require("formidable");
const GroupChat = require("../model/GroupChat");
const GroupMessage = require("../model/GroupMessage");
const {
  displayName,
  findActiveMember,
  isGroupAdmin,
  serializeGroup,
  serializeMessage,
} = require("../services/groupChatSerializer");
const {
  emitGroupMembers,
  emitToGroup,
  getOnlineUserKeys,
} = require("../services/groupChatRealtime");

const uploadDir = path.join(__dirname, "..", "uploads", "group-chat");
fs.mkdirSync(uploadDir, { recursive: true });

function parseMultipart(req) {
  const form = formidable({
    uploadDir,
    keepExtensions: true,
    multiples: false,
    maxFileSize: Number(process.env.GROUP_CHAT_MAX_FILE_SIZE || 25 * 1024 * 1024),
    filename: (name, ext, part) => `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(part.originalFilename || "") || ext}`,
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) reject(error);
      else resolve({ fields, files });
    });
  });
}

function getField(fields, key) {
  const value = fields?.[key];
  return Array.isArray(value) ? value[0] : value;
}

async function requireGroupMember(groupId, authUser) {
  const group = await GroupChat.findOne({ _id: groupId, deletedAt: null });
  if (!group) {
    const error = new Error("Group not found");
    error.statusCode = 404;
    throw error;
  }
  const member = findActiveMember(group, authUser);
  if (!member) {
    const error = new Error("Forbidden");
    error.statusCode = 403;
    throw error;
  }
  return { group, member };
}

function handleError(res, error) {
  const status = error.statusCode || 500;
  return res.status(status).json({ status: false, message: error.message || "Internal Server Error" });
}

async function createSystemMessage(group, authUser, text, metadata = {}) {
  const message = await GroupMessage.create({
    groupId: group._id,
    senderId: authUser.id,
    senderRole: authUser.role,
    senderName: "System",
    text,
    type: "system",
    metadata,
  });
  emitToGroup(group._id.toString(), "group:message", serializeMessage(message));
  return message;
}

const controller = {
  async listGroups(req, res) {
    try {
      const groups = await GroupChat.find({
        deletedAt: null,
        members: { $elemMatch: { userId: req.authUser.id, userRole: req.authUser.role, status: "active" } },
      }).sort({ updatedAt: -1 });
      return res.status(200).json({
        status: true,
        data: groups.map((group) => serializeGroup(group, getOnlineUserKeys())),
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async createGroup(req, res) {
    try {
      const user = req.authUser.user;
      const name = String(req.body?.name || "").trim();
      if (!name) return res.status(400).json({ status: false, message: "Group name is required" });
      const group = await GroupChat.create({
        name,
        description: req.body?.description || "",
        category: req.body?.category || "Community",
        icon: req.body?.icon || "#",
        createdBy: req.authUser.id,
        createdByRole: req.authUser.role,
        adminId: req.authUser.id,
        adminRole: req.authUser.role,
        members: [
          {
            userId: req.authUser.id,
            userRole: req.authUser.role,
            name: displayName(user),
            email: user.email,
            role: "admin",
          },
        ],
        actionLog: [{ type: "created", actorId: req.authUser.id, actorRole: req.authUser.role }],
      });
      return res.status(201).json({ status: true, data: serializeGroup(group, getOnlineUserKeys()) });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getGroup(req, res) {
    try {
      const { group } = await requireGroupMember(req.params.groupId, req.authUser);
      return res.status(200).json({ status: true, data: serializeGroup(group, getOnlineUserKeys()) });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getMessages(req, res) {
    try {
      await requireGroupMember(req.params.groupId, req.authUser);
      const messages = await GroupMessage.find({ groupId: req.params.groupId, deletedAt: null }).sort({ createdAt: 1 }).limit(300);
      return res.status(200).json({ status: true, data: messages.map(serializeMessage) });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async sendMessage(req, res) {
    try {
      const text = String(req.body?.text || "").trim();
      if (!text) return res.status(400).json({ status: false, message: "Message text is required" });
      const { group, member } = await requireGroupMember(req.params.groupId, req.authUser);
      const message = await GroupMessage.create({
        groupId: group._id,
        senderId: req.authUser.id,
        senderRole: req.authUser.role,
        senderName: member.name || displayName(req.authUser.user),
        text,
        type: "message",
        metadata: { memberRole: member.role },
      });
      const payload = serializeMessage(message);
      emitToGroup(group._id.toString(), "group:message", payload);
      return res.status(201).json({ status: true, data: payload });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async uploadAttachment(req, res) {
    try {
      const { group, member } = await requireGroupMember(req.params.groupId, req.authUser);
      const { fields, files } = await parseMultipart(req);
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) return res.status(400).json({ status: false, message: "Attachment file is required" });
      const message = await GroupMessage.create({
        groupId: group._id,
        senderId: req.authUser.id,
        senderRole: req.authUser.role,
        senderName: member.name || displayName(req.authUser.user),
        text: getField(fields, "text") || "",
        type: "attachment",
        attachment: {
          originalName: file.originalFilename || "attachment",
          storedName: path.basename(file.filepath),
          mimeType: file.mimetype || "application/octet-stream",
          size: file.size || 0,
          path: file.filepath,
        },
        metadata: { memberRole: member.role },
      });
      const payload = serializeMessage(message);
      emitToGroup(group._id.toString(), "group:message", payload);
      return res.status(201).json({ status: true, data: payload });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async downloadAttachment(req, res) {
    try {
      const message = await GroupMessage.findOne({ _id: req.params.messageId, deletedAt: null, type: "attachment" });
      if (!message?.attachment) return res.status(404).json({ status: false, message: "Attachment not found" });
      await requireGroupMember(message.groupId, req.authUser);
      return res.download(message.attachment.path, message.attachment.originalName);
    } catch (error) {
      return handleError(res, error);
    }
  },

  async assignAdmin(req, res) {
    try {
      const { group } = await requireGroupMember(req.params.groupId, req.authUser);
      if (!isGroupAdmin(group, req.authUser)) return res.status(403).json({ status: false, message: "Admin access required" });
      const target = findActiveMember(group, { id: req.body?.memberId, role: req.body?.memberRole || "student" });
      if (!target) return res.status(404).json({ status: false, message: "Member not found" });
      group.members.forEach((member) => {
        member.role = member.userId.toString() === target.userId.toString() && member.userRole === target.userRole ? "admin" : "member";
      });
      group.adminId = target.userId;
      group.adminRole = target.userRole;
      group.actionLog.push({
        type: "admin_assigned",
        actorId: req.authUser.id,
        actorRole: req.authUser.role,
        targetId: target.userId,
        targetRole: target.userRole,
      });
      await group.save();
      await createSystemMessage(group, req.authUser, `${target.name} is now the group admin.`, { action: "admin_assigned" });
      emitToGroup(group._id.toString(), "group:updated", serializeGroup(group, getOnlineUserKeys()));
      await emitGroupMembers(group._id.toString());
      return res.status(200).json({ status: true, data: serializeGroup(group, getOnlineUserKeys()) });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async leaveGroup(req, res) {
    try {
      const { group, member } = await requireGroupMember(req.params.groupId, req.authUser);
      if (member.role === "admin") return res.status(400).json({ status: false, message: "Assign another admin before leaving the group" });
      member.status = "left";
      member.leftAt = new Date();
      group.actionLog.push({ type: "left", actorId: req.authUser.id, actorRole: req.authUser.role });
      await group.save();
      await createSystemMessage(group, req.authUser, `${member.name} left the group.`, { action: "left" });
      emitToGroup(group._id.toString(), "group:member-left", { groupId: group._id.toString(), memberId: req.authUser.id, memberRole: req.authUser.role });
      await emitGroupMembers(group._id.toString());
      return res.status(200).json({ status: true });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async deleteGroup(req, res) {
    try {
      const { group } = await requireGroupMember(req.params.groupId, req.authUser);
      if (!isGroupAdmin(group, req.authUser)) return res.status(403).json({ status: false, message: "Admin access required" });
      group.deletedAt = new Date();
      group.actionLog.push({ type: "deleted", actorId: req.authUser.id, actorRole: req.authUser.role });
      await group.save();
      emitToGroup(group._id.toString(), "group:deleted", { groupId: group._id.toString() });
      return res.status(200).json({ status: true });
    } catch (error) {
      return handleError(res, error);
    }
  },
};

module.exports = controller;
