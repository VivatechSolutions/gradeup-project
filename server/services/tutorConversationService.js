const TutorConversation = require("../model/TutorConversation");

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
      id: `${conversation.conversationId}-${index + 1}`,
      type: message.role === "assistant" ? "assistant" : "user",
      role: message.role,
      content: message.content,
      timestamp: message.createdAt,
      subject: conversation.subject,
      unit: conversation.unitTitle,
    })),
  };
}

async function appendMessages({
  conversationId,
  candidateId,
  candidateName,
  unit,
  userMessage,
  assistantMessage,
}) {
  const conversation = await TutorConversation.findOneAndUpdate(
    { conversationId },
    {
      $setOnInsert: {
        candidateId,
        createdAt: new Date(),
      },
      $set: {
        candidateName,
        unitId: unit._id,
        documentId: unit.documentId,
        subjectGroupKey: unit.subjectGroupKey || [unit.board, unit.standard, unit.subject].join("::"),
        board: unit.board,
        standard: unit.standard,
        subject: unit.subject,
        unitNumber: unit.unitNumber,
        unitTitle: unit.unitTitle,
        lastMessage: assistantMessage || userMessage,
        lastActivityAt: new Date(),
      },
      $push: {
        messages: {
          $each: [
            {
              role: "user",
              content: userMessage,
              createdAt: new Date(),
            },
            {
              role: "assistant",
              content: assistantMessage,
              createdAt: new Date(),
            },
          ],
        },
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  conversation.title = buildConversationTitle(conversation.messages, unit.unitTitle);
  await conversation.save();

  return normalizeConversation(conversation);
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
  appendMessages,
  listConversations,
  getConversation,
  clearConversations,
  normalizeConversation,
};
