const ExamAttempt = require("../model/ExamAttempt");
const { callPython } = require("./pythonGateway");
const { recordTrustedResult } = require("./activityService");

const SUBMISSION_RETRY_MS = 30000;

function timerDeadline(timer, startedAt = new Date()) {
  if (timer === null || timer === undefined || timer === "") return { timerSeconds: null, expiresAt: null };
  const numeric = Number(timer?.duration_seconds ?? timer?.seconds ?? timer);
  if (Number.isFinite(numeric) && numeric > 0) {
    return { timerSeconds: Math.floor(numeric), expiresAt: new Date(startedAt.getTime() + numeric * 1000) };
  }
  const parsed = new Date(timer?.expires_at || timer);
  if (!Number.isNaN(parsed.valueOf()) && parsed > startedAt) {
    return { timerSeconds: Math.floor((parsed.getTime() - startedAt.getTime()) / 1000), expiresAt: parsed };
  }
  return { timerSeconds: null, expiresAt: null };
}

function answerPayload(attempt) {
  const saved = new Map((attempt.answers || []).map((entry) => [String(entry.questionId), String(entry.answer || "")]));
  return (attempt.questions || []).map((question) => ({
    question_id: String(question.question_id || question.id),
    answer: saved.get(String(question.question_id || question.id)) || "",
  }));
}

function serializeAttempt(attempt) {
  const value = typeof attempt.toObject === "function" ? attempt.toObject() : { ...attempt };
  delete value.userId;
  delete value.__v;
  const remainingSeconds = value.expiresAt
    ? Math.max(0, Math.ceil((new Date(value.expiresAt).getTime() - Date.now()) / 1000))
    : null;
  return { ...value, id: value.examId, remainingSeconds, serverNow: new Date().toISOString() };
}

async function recordExamResult(attempt, result) {
  if (!attempt.userId) return;
  const startedAt = new Date(attempt.startedAt || Date.now());
  const endedAt = new Date(attempt.submittedAt || Date.now());
  await recordTrustedResult({
    userId: attempt.userId,
    activityType: "exam",
    sourceId: attempt.examId,
    subjectGroupKey: attempt.subjectGroupKey || null,
    unitId: attempt.unitId || null,
    rawScore: result?.obtained_marks,
    maximumScore: result?.total_marks,
    normalizedScore: result?.percentage,
    timeSpentMinutes: Math.max(0, Math.round((endedAt - startedAt) / 60000)),
    metadata: {
      title: `${attempt.subject} · ${attempt.unitName || `Unit ${attempt.unitNumber || ""}`}`,
      subject: attempt.subject,
      submissionReason: attempt.submissionReason,
      result,
    },
  }).catch(() => null);
}

async function acquireSubmission(examId, userId, reason) {
  const retryBefore = new Date(Date.now() - SUBMISSION_RETRY_MS);
  return ExamAttempt.findOneAndUpdate(
    {
      examId,
      ...(userId ? { userId } : {}),
      $or: [
        { status: "in_progress" },
        { status: "evaluating", submissionStartedAt: { $lte: retryBefore } },
        { status: "evaluating", submissionStartedAt: null },
      ],
    },
    {
      $set: {
        status: "evaluating",
        submissionReason: reason,
        submissionStartedAt: new Date(),
        submissionError: null,
      },
    },
    { new: true },
  );
}

async function finalizeAttempt({ examId, userId = null, reason = "manual" }) {
  let attempt = await acquireSubmission(examId, userId, reason);
  if (!attempt) {
    const existing = await ExamAttempt.findOne({ examId, ...(userId ? { userId } : {}) });
    if (!existing) {
      const error = new Error("Exam attempt not found");
      error.statusCode = 404;
      throw error;
    }
    return existing;
  }

  try {
    const result = await callPython({
      method: "post",
      path: `/api/exam/${encodeURIComponent(attempt.examId)}/submit`,
      data: { candidate_id: attempt.candidateId, answers: answerPayload(attempt) },
    });
    attempt.status = reason === "manual" ? "completed" : "ended";
    attempt.result = result;
    attempt.submittedAt = new Date();
    attempt.submissionError = null;
    await attempt.save();
    await recordExamResult(attempt, result);
    return attempt;
  } catch (error) {
    attempt.submissionError = error.message || "Evaluation failed";
    await attempt.save();
    throw error;
  }
}

async function expireDueAttempts(limit = 20) {
  const due = await ExamAttempt.find({
    $or: [
      { status: "in_progress", expiresAt: { $ne: null, $lte: new Date() } },
      { status: "evaluating", submissionStartedAt: { $lte: new Date(Date.now() - SUBMISSION_RETRY_MS) } },
    ],
  })
    .sort({ expiresAt: 1 })
    .limit(limit)
    .select("examId submissionReason");
  await Promise.allSettled(
    due.map((attempt) => finalizeAttempt({
      examId: attempt.examId,
      reason: attempt.submissionReason || "time_expired",
    })),
  );
  return due.length;
}

let expiryTimer = null;
function initializeExamExpiryWorker() {
  if (expiryTimer) return;
  void expireDueAttempts().catch((error) => console.error("Exam expiry check failed:", error.message));
  expiryTimer = setInterval(() => {
    void expireDueAttempts().catch((error) => console.error("Exam expiry check failed:", error.message));
  }, 30000);
  expiryTimer.unref?.();
}

module.exports = {
  answerPayload,
  expireDueAttempts,
  finalizeAttempt,
  initializeExamExpiryWorker,
  serializeAttempt,
  timerDeadline,
};
