const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const formidable = require("formidable");
const GroupChat = require("../model/GroupChat");
const GroupInvite = require("../model/GroupInvite");
const GroupMessage = require("../model/GroupMessage");
const User = require("../model/User");
const StudentProfile = require("../model/StudentProfile");
const { sendEmail } = require("../config/EmailTransporter");
const { getGroupInviteEmail, getSessionInviteEmail } = require("../config/EmailTemplate");
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
const {
  addGroupInviteesToSession,
  addSessionInvitees,
  findUsersByEmails,
} = require("../services/sessionVisibilityService");

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

function hashInviteToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeSessionCard(input = {}) {
  const sessionType = String(input.sessionType || input.type || "").toLowerCase() === "seminar" ? "seminar" : "debate";
  const topic = normalizeText(input.topic || input.title || "Live session");
  const status = normalizeText(input.status || "waiting") || "waiting";
  const joinUrl = normalizeText(input.joinUrl || input.roomLink || input.link || "");
  return {
    sessionType,
    sessionId: normalizeText(input.sessionId || input.id || ""),
    topic,
    title: normalizeText(input.title || topic),
    createdBy: normalizeText(input.createdBy || ""),
    joinUrl,
    status,
    participantCount: Number(input.participantCount || 0),
    createdAt: input.createdAt || new Date().toISOString(),
    source: normalizeText(input.source || "group_chat"),
  };
}

function sessionCardText(card, groupName) {
  const label = card.sessionType === "seminar" ? "seminar session" : "team debate";
  return `${card.createdBy || "A GradeUp learner"} invited you to join a ${label} in #${groupName}: ${card.topic}`;
}

function sameText(left, right) {
  return normalizeText(left).toLowerCase() === normalizeText(right).toLowerCase();
}

async function getUserProfile(userId) {
  return StudentProfile.findOne({ userId }).lean();
}

function getSchool(profile) {
  return normalizeText(profile?.schoolContext?.name);
}

function getClassNumber(profile) {
  return normalizeText(profile?.independentLearningContext?.classNumber);
}

function profileContext(profile) {
  return {
    schoolName: getSchool(profile),
    classNumber: getClassNumber(profile),
    board: normalizeText(profile?.independentLearningContext?.board),
  };
}

function studentName(user) {
  return displayName({
    name: user?.name,
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.email,
  });
}

async function serializeStudentSearchResult(user, requesterProfile) {
  const profile = await getUserProfile(user._id);
  const requesterSchool = getSchool(requesterProfile);
  const requesterClass = getClassNumber(requesterProfile);
  const targetSchool = getSchool(profile);
  const targetClass = getClassNumber(profile);
  const isSameSchool = Boolean(requesterSchool && targetSchool && sameText(requesterSchool, targetSchool));
  const isSameClass = Boolean(isSameSchool && requesterClass && targetClass && sameText(requesterClass, targetClass));
  return {
    id: user._id.toString(),
    name: studentName(user),
    email: user.email,
    schoolName: targetSchool || null,
    classNumber: targetClass || null,
    isSameSchool,
    isSameClass,
    canDirectAdd: isSameSchool && isSameClass,
    tag: !isSameSchool
      ? [targetSchool, targetClass && `Class ${targetClass}`].filter(Boolean).join(" - ")
      : !isSameClass
        ? targetClass
          ? `Class ${targetClass}`
          : "Different class"
        : null,
  };
}

function addMemberToGroup(group, user, profile, role = "member") {
  const existing = (group.members || []).find(
    (member) => member.userId?.toString() === user._id.toString() && member.userRole === "student",
  );
  if (existing) {
    existing.status = "active";
    existing.leftAt = undefined;
    existing.name = studentName(user);
    existing.email = user.email;
    return existing;
  }
  const member = {
    userId: user._id,
    userRole: "student",
    name: studentName(user),
    email: user.email,
    role,
    status: "active",
    joinedAt: new Date(),
    metadata: profileContext(profile),
  };
  group.members.push(member);
  return member;
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
      const profile = await getUserProfile(req.authUser.id);
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
            metadata: profileContext(profile),
          },
        ],
        actionLog: [{ type: "created", actorId: req.authUser.id, actorRole: req.authUser.role }],
      });
      return res.status(201).json({ status: true, data: serializeGroup(group, getOnlineUserKeys()) });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async searchMembers(req, res) {
    try {
      const { group } = await requireGroupMember(req.params.groupId, req.authUser);
      if (!isGroupAdmin(group, req.authUser)) return res.status(403).json({ status: false, message: "Admin access required" });
      const query = normalizeText(req.query?.q);
      if (query.length < 3) return res.status(400).json({ status: false, message: "Search at least 3 characters" });
      const requesterProfile = await getUserProfile(req.authUser.id);
      const users = await User.find({
        role: "student",
        status: "active",
        deletedAt: null,
        $or: [
          { email: { $regex: query, $options: "i" } },
          { firstName: { $regex: query, $options: "i" } },
          { lastName: { $regex: query, $options: "i" } },
        ],
      })
        .limit(12)
        .lean();
      const activeMemberIds = new Set((group.members || []).filter((m) => m.status === "active").map((m) => m.userId.toString()));
      const results = await Promise.all(
        users
          .filter((user) => user._id.toString() !== req.authUser.id && !activeMemberIds.has(user._id.toString()))
          .map((user) => serializeStudentSearchResult(user, requesterProfile)),
      );
      return res.status(200).json({ status: true, data: results });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async addMember(req, res) {
    try {
      const { group } = await requireGroupMember(req.params.groupId, req.authUser);
      if (!isGroupAdmin(group, req.authUser)) return res.status(403).json({ status: false, message: "Admin access required" });
      const user = await User.findOne({ _id: req.body?.userId, role: "student", status: "active", deletedAt: null });
      if (!user) return res.status(404).json({ status: false, message: "Student not found" });
      const [requesterProfile, targetProfile] = await Promise.all([getUserProfile(req.authUser.id), getUserProfile(user._id)]);
      const canDirectAdd = sameText(getSchool(requesterProfile), getSchool(targetProfile)) && sameText(getClassNumber(requesterProfile), getClassNumber(targetProfile));
      if (!canDirectAdd) {
        return res.status(403).json({ status: false, message: "Only same school and same class students can be added directly. Send an invite instead." });
      }
      const member = addMemberToGroup(group, user, targetProfile);
      group.actionLog.push({ type: "joined", actorId: req.authUser.id, actorRole: req.authUser.role, targetId: user._id, targetRole: "student" });
      await group.save();
      await createSystemMessage(group, req.authUser, `${member.name} joined the group.`, { action: "joined" });
      emitToGroup(group._id.toString(), "group:updated", serializeGroup(group, getOnlineUserKeys()));
      await emitGroupMembers(group._id.toString());
      return res.status(200).json({ status: true, data: serializeGroup(group, getOnlineUserKeys()) });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async createInvite(req, res) {
    try {
      const { group } = await requireGroupMember(req.params.groupId, req.authUser);
      if (!isGroupAdmin(group, req.authUser)) return res.status(403).json({ status: false, message: "Admin access required" });
      const email = normalizeEmail(req.body?.email);
      if (!email) return res.status(400).json({ status: false, message: "Email is required" });
      const invitedUser = await User.findOne({ normalizedEmail: email, role: "student", status: "active", deletedAt: null });
      if (!invitedUser) return res.status(404).json({ status: false, message: "No registered student found for this email" });
      const existingMember = findActiveMember(group, { id: invitedUser._id.toString(), role: "student" });
      if (existingMember) return res.status(409).json({ status: false, message: "Student is already in this group" });
      const token = crypto.randomBytes(32).toString("base64url");
      const invite = await GroupInvite.create({
        groupId: group._id,
        email,
        invitedUserId: invitedUser._id,
        invitedBy: req.authUser.id,
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + Number(process.env.GROUP_INVITE_TTL_HOURS || 72) * 60 * 60 * 1000),
      });
      const appUrl = (process.env.FE_URL || process.env.APP_URL || process.env.FRONTEND_URL || "").replace(/\/+$/, "");
      const joinUrl = `${appUrl || ""}/group-chat/join/${token}`;
      const emailPayload = getGroupInviteEmail({
        inviterName: displayName(req.authUser.user),
        groupName: group.name,
        joinUrl,
      });
      const emailResult = await sendEmail({ to: email, ...emailPayload }).catch((error) => ({ error: error.message }));
      group.actionLog.push({ type: "joined", actorId: req.authUser.id, actorRole: req.authUser.role, targetId: invitedUser._id, targetRole: "student", metadata: { inviteId: invite._id } });
      await group.save();
      return res.status(201).json({
        status: true,
        data: {
          id: invite._id.toString(),
          email,
          expiresAt: invite.expiresAt,
          emailSkipped: Boolean(emailResult?.skipped),
          joinUrl: emailResult?.skipped ? joinUrl : undefined,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getInvite(req, res) {
    try {
      const invite = await GroupInvite.findOne({ tokenHash: hashInviteToken(req.params.token), status: "pending" });
      if (!invite || invite.expiresAt < new Date()) return res.status(404).json({ status: false, message: "Invite is invalid or expired" });
      const group = await GroupChat.findOne({ _id: invite.groupId, deletedAt: null });
      if (!group) return res.status(404).json({ status: false, message: "Group not found" });
      return res.status(200).json({
        status: true,
        data: {
          email: invite.email,
          group: serializeGroup(group, getOnlineUserKeys()),
          expiresAt: invite.expiresAt,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async acceptInvite(req, res) {
    try {
      const invite = await GroupInvite.findOne({ tokenHash: hashInviteToken(req.params.token), status: "pending" });
      if (!invite || invite.expiresAt < new Date()) return res.status(404).json({ status: false, message: "Invite is invalid or expired" });
      if (invite.invitedUserId?.toString() !== req.authUser.id) {
        return res.status(403).json({ status: false, message: "This invite belongs to another registered student" });
      }
      const group = await GroupChat.findOne({ _id: invite.groupId, deletedAt: null });
      if (!group) return res.status(404).json({ status: false, message: "Group not found" });
      const user = await User.findById(req.authUser.id);
      const profile = await getUserProfile(req.authUser.id);
      const member = addMemberToGroup(group, user, profile);
      invite.status = "accepted";
      invite.acceptedAt = new Date();
      group.actionLog.push({ type: "joined", actorId: req.authUser.id, actorRole: req.authUser.role, metadata: { inviteId: invite._id } });
      await Promise.all([group.save(), invite.save()]);
      await createSystemMessage(group, req.authUser, `${member.name} joined the group.`, { action: "invite_accepted" });
      emitToGroup(group._id.toString(), "group:updated", serializeGroup(group, getOnlineUserKeys()));
      await emitGroupMembers(group._id.toString());
      return res.status(200).json({ status: true, data: serializeGroup(group, getOnlineUserKeys()) });
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

  async deleteMessage(req, res) {
    try {
      const { group } = await requireGroupMember(req.params.groupId, req.authUser);
      const message = await GroupMessage.findOne({
        _id: req.params.messageId,
        groupId: req.params.groupId,
        deletedAt: null,
      });
      if (!message) return res.status(404).json({ status: false, message: "Message not found" });
      const canDelete =
        message.senderId.toString() === req.authUser.id ||
        isGroupAdmin(group, req.authUser);
      if (!canDelete) {
        return res.status(403).json({ status: false, message: "You can delete only your own messages." });
      }
      message.deletedAt = new Date();
      await message.save();
      const payload = { groupId: group._id.toString(), messageId: message._id.toString() };
      emitToGroup(group._id.toString(), "group:message:deleted", payload);
      return res.status(200).json({ status: true, data: payload });
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
      if (req.query?.preview === "1") {
        res.setHeader("Content-Type", message.attachment.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(message.attachment.originalName)}"`);
        return fs.createReadStream(message.attachment.path).pipe(res);
      }
      return res.download(message.attachment.path, message.attachment.originalName);
    } catch (error) {
      return handleError(res, error);
    }
  },

  async sendSessionCard(req, res) {
    try {
      const { group, member } = await requireGroupMember(req.params.groupId, req.authUser);
      const card = normalizeSessionCard({
        ...(req.body || {}),
        createdBy: req.body?.createdBy || member.name || displayName(req.authUser.user),
      });
      if (!card.sessionId) return res.status(400).json({ status: false, message: "Session id is required" });
      if (!card.joinUrl) return res.status(400).json({ status: false, message: "Session join URL is required" });
      await addGroupInviteesToSession({ sessionId: card.sessionId, members: group.members });

      const message = await GroupMessage.create({
        groupId: group._id,
        senderId: req.authUser.id,
        senderRole: req.authUser.role,
        senderName: member.name || displayName(req.authUser.user),
        text: sessionCardText(card, group.name),
        type: "session_card",
        metadata: { memberRole: member.role, sessionCard: card },
      });
      const payload = serializeMessage(message);
      emitToGroup(group._id.toString(), "group:message", payload);
      return res.status(201).json({ status: true, data: payload });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async sendSessionInvites(req, res) {
    try {
      const emails = Array.isArray(req.body?.emails)
        ? req.body.emails.map(normalizeEmail).filter(Boolean)
        : String(req.body?.emails || "")
            .split(/[\s,;]+/)
            .map(normalizeEmail)
            .filter(Boolean);
      const uniqueEmails = Array.from(new Set(emails));
      if (!uniqueEmails.length) return res.status(400).json({ status: false, message: "At least one email is required" });

      const card = normalizeSessionCard(req.body || {});
      if (!card.sessionId) return res.status(400).json({ status: false, message: "Session id is required" });
      if (!card.joinUrl) return res.status(400).json({ status: false, message: "Session join URL is required" });
      const invitedUsers = await findUsersByEmails(uniqueEmails);
      await addSessionInvitees({
        sessionId: card.sessionId,
        emails: uniqueEmails,
        userIds: invitedUsers.map((user) => user._id),
      });
      const senderName = displayName(req.authUser.user);
      const email = getSessionInviteEmail({
        senderName,
        sessionType: card.sessionType,
        topic: card.topic,
        joinUrl: card.joinUrl,
      });

      await Promise.all(
        uniqueEmails.map((to) =>
          sendEmail({
            to,
            subject: email.subject,
            text: email.text,
            html: email.html,
          }),
        ),
      );
      return res.status(200).json({ status: true, data: { sent: uniqueEmails.length } });
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
