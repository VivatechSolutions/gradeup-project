const HomeworkChatSession = require("../model/HomeworkChatSession");

function buildTitle(message, fallback = "Homework chat") {
  const value = String(message || "").trim();
  return value ? value.slice(0, 80) : fallback;
}

function normalizeSession(session) {
  return {
    homework_id: session.homeworkId,
    title: session.title,
    subject: session.subject,
    unit_number: session.unitNumber,
    board: session.board,
    class_number: session.classNumber,
    term: session.term,
    status: session.status,
    action: session.action,
    message_count: session.messages?.length || 0,
    current_question: session.currentQuestion,
    current_question_index: session.currentQuestionIndex,
    total_questions: session.totalQuestions,
    assigned_at: session.createdAt,
    updated_at: session.lastActivityAt || session.updatedAt,
  };
}

function normalizeSessionDetail(session) {
  return {
    ...normalizeSession(session),
    candidate_id: session.candidateId,
    chat_history: (session.messages || []).map((message) => ({
      role: message.role,
      content: message.content,
      timestamp: message.createdAt,
    })),
  };
}

async function recordHomeworkChatTurn({
  candidateId,
  candidateName,
  request,
  response,
}) {
  const homeworkId = response.homework_id;
  const now = new Date();
  const userContent =
    request.message ||
    (request.image_base64 ? "[Student uploaded image of homework]" : "");
  const assistantContent = response.response || "";
  const existing = await HomeworkChatSession.findOne({ candidateId, homeworkId });
  const title = existing?.title || buildTitle(userContent || response.current_question);

  const update = {
    $setOnInsert: {
      candidateId,
      homeworkId,
      createdAt: now,
    },
    $set: {
      candidateName,
      title,
      subject: request.subject || existing?.subject || null,
      unitNumber:
        request.unit_number !== undefined && request.unit_number !== null
          ? Number(request.unit_number)
          : existing?.unitNumber || null,
      board: request.board || existing?.board || null,
      classNumber: request.class_number || existing?.classNumber || null,
      term: request.term || existing?.term || null,
      status: response.status || existing?.status || "pending",
      action: response.action || existing?.action || null,
      currentQuestion: response.current_question || existing?.currentQuestion || null,
      currentQuestionIndex:
        response.current_question_index !== undefined
          ? Number(response.current_question_index)
          : existing?.currentQuestionIndex || 0,
      totalQuestions:
        response.total_questions !== undefined
          ? Number(response.total_questions)
          : existing?.totalQuestions || 0,
      lastMessage: assistantContent || userContent,
      lastActivityAt: now,
    },
    $push: {
      messages: {
        $each: [
          ...(userContent
            ? [{ role: "user", content: userContent, createdAt: now }]
            : []),
          ...(assistantContent
            ? [{ role: "assistant", content: assistantContent, createdAt: now }]
            : []),
        ],
      },
    },
  };

  const session = await HomeworkChatSession.findOneAndUpdate(
    { candidateId, homeworkId },
    update,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return normalizeSessionDetail(session);
}

async function listHomeworkChatSessions({ candidateId, limit = 50 }) {
  const sessions = await HomeworkChatSession.find({ candidateId })
    .sort({ lastActivityAt: -1, updatedAt: -1 })
    .limit(limit);

  return sessions.map(normalizeSession);
}

async function getHomeworkChatSession({ candidateId, homeworkId }) {
  const session = await HomeworkChatSession.findOne({ candidateId, homeworkId });
  return session ? normalizeSessionDetail(session) : null;
}

module.exports = {
  recordHomeworkChatTurn,
  listHomeworkChatSessions,
  getHomeworkChatSession,
};
