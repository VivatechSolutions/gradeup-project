const TutorConversation = require("../model/TutorConversation");
const crypto = require("crypto");

function buildConversationTitle(messages = [], unitTitle) {
  const firstUser = messages.find((message) => message.role === "user" && message.content);
  if (firstUser) {
    return firstUser.content.trim().slice(0, 72);
  }
  return unitTitle ? `${unitTitle}` : "New Chat";
}

function normalizeConversation(conversation) {
  return {
    id: conversation.conversationId,
    conversationId: conversation.conversationId,
    title: conversation.title,
    candidateId: conversation.candidateId,
    candidateName: conversation.candidateName,
    subject: conversation.subject,
    unit: conversation.unitTitle,
    unitId: conversation.unitId,
    subjectGroupKey: conversation.subjectGroupKey,
    documentId: conversation.documentId,
    createdAt: conversation.createdAt,
    lastUpdated: conversation.lastActivityAt || conversation.updatedAt,
    messages: (conversation.messages || []).map((message, index) => ({
      id: message.messageId || `${conversation.conversationId}-${index + 1}`,
      type: message.role === "assistant" ? "assistant" : "user",
      role: message.role,
      content: message.content,
      timestamp: message.createdAt,
      status: message.status || "completed",
      subject: conversation.subject,
      unit: conversation.unitTitle,
    })),
  };
}

function conversationFields({ candidateId, candidateName, unit }) {
  return {
    candidateId,
    candidateName,
    unitId: unit._id,
    documentId: unit.documentId,
    subjectGroupKey: unit.subjectGroupKey || [unit.board, unit.standard, unit.subject].join("::"),
    board: unit.board,
    standard: unit.standard,
    subject: unit.subject,
    unitNumber: unit.unitNumber,
    unitTitle: unit.unitTitle,
  };
}

async function createConversation({ conversationId, candidateId, candidateName, unit }) {
  const id = conversationId || `tutor-${crypto.randomUUID()}`;
  const fields = conversationFields({ candidateId, candidateName, unit });
  const conversation = await TutorConversation.findOneAndUpdate(
    { candidateId, conversationId: id },
    {
      $setOnInsert: {
        conversationId: id,
        title: unit.unitTitle || "New Chat",
        messages: [],
        createdAt: new Date(),
      },
      $set: {
        ...fields,
        lastActivityAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return normalizeConversation(conversation);
}

async function appendUserMessage({ conversationId, candidateId, messageId, content }) {
  const id = messageId || crypto.randomUUID();
  const conversation = await TutorConversation.findOneAndUpdate(
    {
      candidateId,
      conversationId,
      "messages.messageId": { $ne: id },
    },
    {
      $push: {
        messages: {
          messageId: id,
          role: "user",
          content,
          status: "pending",
          createdAt: new Date(),
        },
      },
      $set: { lastMessage: content, lastActivityAt: new Date() },
    },
    { new: true },
  );
  if (!conversation) {
    return getConversation({ candidateId, conversationId });
  }
  conversation.title = buildConversationTitle(conversation.messages, conversation.unitTitle);
  await conversation.save();
  return normalizeConversation(conversation);
}

async function completeTurn({
  conversationId,
  candidateId,
  userMessageId,
  assistantMessageId,
  assistantMessage,
}) {
  const assistantId = assistantMessageId || crypto.randomUUID();
  await TutorConversation.updateOne(
    { candidateId, conversationId, "messages.messageId": userMessageId },
    { $set: { "messages.$.status": "completed" } },
  );
  const conversation = await TutorConversation.findOneAndUpdate(
    {
      candidateId,
      conversationId,
      "messages.messageId": { $ne: assistantId },
    },
    {
      $push: {
        messages: {
          messageId: assistantId,
          role: "assistant",
          content: assistantMessage,
          status: "completed",
          createdAt: new Date(),
        },
      },
      $set: { lastMessage: assistantMessage, lastActivityAt: new Date() },
    },
    { new: true },
  );
  return conversation
    ? normalizeConversation(conversation)
    : getConversation({ candidateId, conversationId });
}

async function failUserMessage({ conversationId, candidateId, userMessageId }) {
  if (!conversationId || !candidateId || !userMessageId) return;
  await TutorConversation.updateOne(
    { candidateId, conversationId, "messages.messageId": userMessageId },
    {
      $set: {
        "messages.$.status": "failed",
        lastActivityAt: new Date(),
      },
    },
  );
}

async function listConversations({ candidateId, subjectGroupKey, limit = 50 }) {
  const query = { candidateId };
  if (subjectGroupKey) {
    query.subjectGroupKey = subjectGroupKey;
  }

  const conversations = await TutorConversation.find(query)
    .sort({ lastActivityAt: -1, updatedAt: -1 })
    .limit(limit);

  return conversations.map(normalizeConversation);
}

async function getConversation({ candidateId, conversationId }) {
  const conversation = await TutorConversation.findOne({ candidateId, conversationId });
  if (!conversation) {
    return null;
  }
  return normalizeConversation(conversation);
}

async function clearConversations({ candidateId, conversationId }) {
  if (conversationId) {
    const result = await TutorConversation.deleteOne({ candidateId, conversationId });
    return result.deletedCount > 0;
  }

  await TutorConversation.deleteMany({ candidateId });
  return true;
}

module.exports = {
  createConversation,
  appendUserMessage,
  completeTurn,
  failUserMessage,
  listConversations,
  getConversation,
  clearConversations,
  normalizeConversation,
};
