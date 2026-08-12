const { Server } = require("socket.io");
const GroupChat = require("../model/GroupChat");
const { resolveUserFromToken } = require("../middleware/userAuth");
const { findActiveMember, serializeGroup } = require("./groupChatSerializer");

let io;
const socketsByUser = new Map();
const onlineUserKeys = new Set();

function userKey(authUser) {
  return `${authUser.role}:${authUser.id}`;
}

function groupRoom(groupId) {
  return `group:${groupId}`;
}

async function emitGroupMembers(groupId) {
  if (!io) return;
  const group = await GroupChat.findOne({ _id: groupId, deletedAt: null });
  if (group) io.to(groupRoom(groupId)).emit("group:members", serializeGroup(group, onlineUserKeys));
}

function getOnlineUserKeys() {
  return onlineUserKeys;
}

function emitToGroup(groupId, event, payload) {
  if (io) io.to(groupRoom(groupId)).emit(event, payload);
}

function setupGroupChatSocket(server, allowedOrigins) {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) return next(new Error("Unauthorized"));
      const authUser = await resolveUserFromToken(token);
      if (!authUser) return next(new Error("Unauthorized"));
      socket.authUser = authUser;
      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const key = userKey(socket.authUser);
    const joinedGroupIds = new Set();
    if (!socketsByUser.has(key)) socketsByUser.set(key, new Set());
    socketsByUser.get(key).add(socket.id);
    onlineUserKeys.add(key);

    socket.on("group:join", async ({ groupId } = {}, ack) => {
      try {
        const group = await GroupChat.findOne({ _id: groupId, deletedAt: null });
        if (!group || !findActiveMember(group, socket.authUser)) throw new Error("Forbidden");
        await socket.join(groupRoom(groupId));
        joinedGroupIds.add(groupId);
        await emitGroupMembers(groupId);
        if (ack) ack({ status: true });
      } catch (error) {
        if (ack) ack({ status: false, message: "Unable to join group" });
      }
    });

    socket.on("group:leave-room", async ({ groupId } = {}, ack) => {
      await socket.leave(groupRoom(groupId));
      joinedGroupIds.delete(groupId);
      if (ack) ack({ status: true });
    });

    socket.on("disconnect", async () => {
      const userSockets = socketsByUser.get(key);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          socketsByUser.delete(key);
          onlineUserKeys.delete(key);
        }
      }
      await Promise.all([...joinedGroupIds].map((groupId) => emitGroupMembers(groupId)));
    });
  });

  return io;
}

module.exports = {
  emitGroupMembers,
  emitToGroup,
  getOnlineUserKeys,
  setupGroupChatSocket,
};
