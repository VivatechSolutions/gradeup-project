function displayName(user) {
  return user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Member";
}

function activeMembers(group) {
  return (group.members || []).filter((member) => member.status === "active");
}

function findActiveMember(group, authUser) {
  return activeMembers(group).find(
    (member) =>
      member.userId?.toString() === authUser.id &&
      member.userRole === authUser.role,
  );
}

function isGroupAdmin(group, authUser) {
  const member = findActiveMember(group, authUser);
  return Boolean(member && member.role === "admin" && group.adminId?.toString() === authUser.id);
}

function serializeGroup(group, onlineUserKeys = new Set()) {
  const members = activeMembers(group).map((member) => {
    const key = `${member.userRole}:${member.userId.toString()}`;
    return {
      id: member.userId.toString(),
      userRole: member.userRole,
      name: member.name,
      email: member.email,
      role: member.role === "admin" ? "Admin" : "Member",
      status: onlineUserKeys.has(key) ? "Online" : "Away",
      joined: member.joinedAt,
      lastSeenAt: member.lastSeenAt,
    };
  });

  return {
    id: group._id.toString(),
    name: group.name,
    description: group.description,
    category: group.category,
    icon: group.icon,
    memberCount: members.length,
    adminId: group.adminId?.toString(),
    adminRole: group.adminRole,
    createdBy: group.createdBy?.toString(),
    members,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

function serializeMessage(message) {
  const attachment = message.attachment
    ? {
        fileName: message.attachment.originalName,
        mimeType: message.attachment.mimeType,
        size: message.attachment.size,
        downloadUrl: `/api/v1/group-chat/messages/${message._id.toString()}/attachment`,
      }
    : null;

  return {
    id: message._id.toString(),
    groupId: message.groupId.toString(),
    senderId: message.senderId.toString(),
    senderRole: message.senderRole,
    user: message.senderName || "Member",
    role: message.metadata?.memberRole === "admin" ? "Admin" : "Member",
    text: message.text,
    type: message.type,
    isFile: message.type === "attachment",
    isSessionCard: message.type === "session_card",
    fileName: attachment?.fileName,
    attachment,
    timestamp: message.createdAt,
    createdAt: message.createdAt,
    metadata: message.metadata || {},
  };
}

module.exports = {
  activeMembers,
  displayName,
  findActiveMember,
  isGroupAdmin,
  serializeGroup,
  serializeMessage,
};
