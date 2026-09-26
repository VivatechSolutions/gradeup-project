const assert = require("assert");
const path = require("path");

const modelPath = require.resolve(path.join(__dirname, "../model/TutorConversation"));
let stored = null;

function document(value) {
  return Object.assign(value, {
    async save() {
      stored = this;
      return this;
    },
  });
}

const FakeTutorConversation = {
  async findOneAndUpdate(filter, update) {
    if (update.$setOnInsert && !stored) {
      stored = document({
        ...filter,
        ...update.$setOnInsert,
        ...update.$set,
        messages: update.$setOnInsert.messages || [],
        updatedAt: new Date(),
      });
      return stored;
    }
    if (!stored || stored.candidateId !== filter.candidateId || stored.conversationId !== filter.conversationId) {
      return null;
    }
    const excludedId = filter["messages.messageId"]?.$ne;
    if (excludedId && stored.messages.some((message) => message.messageId === excludedId)) {
      return null;
    }
    if (update.$push?.messages) stored.messages.push(update.$push.messages);
    Object.assign(stored, update.$set || {});
    stored.updatedAt = new Date();
    return stored;
  },
  async updateOne(filter, update) {
    if (!stored || stored.candidateId !== filter.candidateId || stored.conversationId !== filter.conversationId) {
      return { modifiedCount: 0 };
    }
    const message = stored.messages.find(
      (item) => item.messageId === filter["messages.messageId"],
    );
    if (message && update.$set?.["messages.$.status"]) {
      message.status = update.$set["messages.$.status"];
    }
    if (update.$set?.lastActivityAt) stored.lastActivityAt = update.$set.lastActivityAt;
    return { modifiedCount: message ? 1 : 0 };
  },
  async findOne(filter) {
    if (!stored || stored.candidateId !== filter.candidateId || stored.conversationId !== filter.conversationId) {
      return null;
    }
    return stored;
  },
};

require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: FakeTutorConversation };
const service = require("../services/tutorConversationService");

async function run() {
  const unit = {
    _id: "unit-1",
    documentId: "document-1",
    subjectGroupKey: "CBSE::10::Mathematics",
    board: "CBSE",
    standard: "10",
    subject: "Mathematics",
    unitNumber: 1,
    unitTitle: "Real Numbers",
  };

  const created = await service.createConversation({
    candidateId: "student-1",
    candidateName: "Student One",
    unit,
  });
  assert.ok(created.conversationId.startsWith("tutor-"));
  assert.strictEqual(created.messages.length, 0);
  assert.strictEqual(created.subjectGroupKey, unit.subjectGroupKey);

  const afterUser = await service.appendUserMessage({
    candidateId: "student-1",
    conversationId: created.conversationId,
    messageId: "user-message-1",
    content: "Explain real numbers",
  });
  assert.strictEqual(afterUser.messages.length, 1);
  assert.strictEqual(afterUser.messages[0].status, "pending");
  assert.strictEqual(afterUser.title, "Explain real numbers");

  await service.appendUserMessage({
    candidateId: "student-1",
    conversationId: created.conversationId,
    messageId: "user-message-1",
    content: "Explain real numbers",
  });
  assert.strictEqual(stored.messages.length, 1, "duplicate user message IDs must be idempotent");

  const completed = await service.completeTurn({
    candidateId: "student-1",
    conversationId: created.conversationId,
    userMessageId: "user-message-1",
    assistantMessageId: "assistant-message-1",
    assistantMessage: "Real numbers include rational and irrational numbers.",
  });
  assert.strictEqual(completed.messages.length, 2);
  assert.strictEqual(completed.messages[0].status, "completed");
  assert.strictEqual(completed.messages[1].id, "assistant-message-1");

  console.log("tutorConversationService tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
