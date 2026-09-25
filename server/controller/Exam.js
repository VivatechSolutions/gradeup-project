const mongoose = require("mongoose");
const ExamAttempt = require("../model/ExamAttempt");
const { callPython } = require("../services/pythonGateway");
const {
  expireDueAttempts,
  finalizeAttempt,
  serializeAttempt,
  timerDeadline,
} = require("../services/examAttemptService");

function candidate(req) {
  return {
    candidate_id: String(req.authUser?.id || ""),
    candidate_name:
      req.authUser?.user?.firstName || req.authUser?.user?.email || "GradeUp Learner",
  };
}

function required(value, label) {
  if (value === undefined || value === null || String(value).trim() === "") {
    const error = new Error(`${label} is required`);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function examContext(body = {}) {
  return {
    subject: String(required(body.subject, "Subject")).trim(),
    unit_number: Number(required(body.unit_number ?? body.unitNumber, "Unit number")),
    board: String(required(body.board, "Board")).trim(),
    class_number: String(required(body.class_number ?? body.classNumber, "Class number")).trim(),
    unit_name: String(required(body.unit_name ?? body.unitName, "Unit name")).trim(),
  };
}

function objectIdOrNull(value) {
  return value && mongoose.Types.ObjectId.isValid(value) ? value : null;
}

function upsertAnswer(attempt, questionId, answer, syncedAt = null) {
  const existing = attempt.answers.find((entry) => String(entry.questionId) === questionId);
  if (existing) {
    existing.answer = answer;
    existing.savedAt = new Date();
    existing.syncedAt = syncedAt;
  } else {
    attempt.answers.push({ questionId, answer, savedAt: new Date(), syncedAt });
  }
}

function errorResponse(res, error, fallback) {
  return res.status(error.statusCode || 500).json({
    status: false,
    message: error.message || fallback,
    details: error.details || null,
  });
}

const controller = {
  async prepare(req, res) {
    try {
      const context = examContext(req.body);
      const data = await callPython({
        method: "post",
        path: "/api/exam/prepare",
        data: { ...candidate(req), ...context },
      });
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return errorResponse(res, error, "Failed to prepare exam");
    }
  },

  async start(req, res) {
    try {
      const context = examContext(req.body);
      const identity = candidate(req);
      const active = await ExamAttempt.findOne({
        userId: req.studentUser._id,
        subject: context.subject,
        unitNumber: context.unit_number,
        status: "in_progress",
      }).sort({ createdAt: -1 });
      if (active && (!active.expiresAt || active.expiresAt > new Date())) {
        return res.status(200).json({ status: true, data: serializeAttempt(active), resumed: true });
      }
      if (active) await finalizeAttempt({ examId: active.examId, userId: req.studentUser._id, reason: "time_expired" }).catch(() => null);

      const data = await callPython({
        method: "post",
        path: "/api/exam/start",
        data: { ...identity, ...context },
      });
      const startedAt = data?.created_at && !Number.isNaN(new Date(data.created_at).valueOf())
        ? new Date(data.created_at)
        : new Date();
      const deadline = timerDeadline(data?.timer, startedAt);
      const questions = Array.isArray(data?.questions) ? data.questions : [];
      const attempt = await ExamAttempt.findOneAndUpdate(
        { examId: String(required(data?.exam_id, "Exam ID")) },
        {
          $setOnInsert: {
            examId: String(data.exam_id),
            candidateId: identity.candidate_id,
            candidateName: identity.candidate_name,
            userId: req.studentUser._id,
          },
          $set: {
            unitId: objectIdOrNull(req.body.unitId),
            subjectGroupKey: req.body.subjectGroupKey || null,
            subject: data.subject || context.subject,
            board: data.board || context.board,
            classNumber: String(data.class_number || context.class_number),
            unitNumber: Number(data.unit_numbers?.[0] ?? context.unit_number),
            unitName: context.unit_name,
            examType: data.exam_type || "mixed",
            questions,
            totalQuestions: Number(data.total_questions ?? questions.length),
            totalMarks: Number(data.total_marks || 0),
            timerSeconds: deadline.timerSeconds,
            startedAt,
            expiresAt: deadline.expiresAt,
            status: "in_progress",
            upstream: data,
            currentQuestionId: questions[0]?.question_id || null,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      return res.status(200).json({ status: true, data: serializeAttempt(attempt), resumed: false });
    } catch (error) {
      return errorResponse(res, error, "Failed to start exam");
    }
  },

  async listAttempts(req, res) {
    try {
      await expireDueAttempts().catch(() => null);
      const attempts = await ExamAttempt.find({ userId: req.studentUser._id })
        .sort({ updatedAt: -1 })
        .limit(100);
      return res.status(200).json({ status: true, data: attempts.map(serializeAttempt) });
    } catch (error) {
      return errorResponse(res, error, "Failed to load exam attempts");
    }
  },

  async getAttempt(req, res) {
    try {
      let attempt = await ExamAttempt.findOne({ examId: req.params.examId, userId: req.studentUser._id });
      if (!attempt) return res.status(404).json({ status: false, message: "Exam attempt not found" });
      if (attempt.status === "in_progress" && attempt.expiresAt && attempt.expiresAt <= new Date()) {
        attempt = await finalizeAttempt({ examId: attempt.examId, userId: req.studentUser._id, reason: "time_expired" });
      }
      return res.status(200).json({ status: true, data: serializeAttempt(attempt) });
    } catch (error) {
      return errorResponse(res, error, "Failed to load exam attempt");
    }
  },

  async saveAnswer(req, res) {
    try {
      const questionId = String(required(req.body.question_id ?? req.body.questionId, "Question ID"));
      const answer = String(req.body.answer ?? "");
      const attempt = await ExamAttempt.findOne({ examId: req.params.examId, userId: req.studentUser._id });
      if (!attempt) return res.status(404).json({ status: false, message: "Exam attempt not found" });
      if (attempt.status !== "in_progress") return res.status(409).json({ status: false, message: "This exam can no longer be changed", data: serializeAttempt(attempt) });
      if (attempt.expiresAt && attempt.expiresAt <= new Date()) {
        const ended = await finalizeAttempt({ examId: attempt.examId, userId: req.studentUser._id, reason: "time_expired" });
        return res.status(409).json({ status: false, message: "Exam time has ended", data: serializeAttempt(ended) });
      }
      if (!(attempt.questions || []).some((question) => String(question.question_id || question.id) === questionId)) {
        return res.status(400).json({ status: false, message: "Question does not belong to this exam" });
      }
      upsertAnswer(attempt, questionId, answer, null);
      attempt.currentQuestionId = questionId;
      await attempt.save();
      const data = await callPython({
        method: "post",
        path: `/api/exam/${encodeURIComponent(attempt.examId)}/answer`,
        data: { candidate_id: attempt.candidateId, question_id: questionId, answer },
      });
      upsertAnswer(attempt, questionId, answer, new Date());
      await attempt.save();
      return res.status(200).json({ status: true, data: { ...data, attempt: serializeAttempt(attempt) } });
    } catch (error) {
      return errorResponse(res, error, "Failed to save answer");
    }
  },

  async saveProgress(req, res) {
    try {
      const attempt = await ExamAttempt.findOne({ examId: req.params.examId, userId: req.studentUser._id });
      if (!attempt) return res.status(404).json({ status: false, message: "Exam attempt not found" });
      if (attempt.status !== "in_progress") return res.status(409).json({ status: false, message: "This exam can no longer be changed", data: serializeAttempt(attempt) });
      const index = Number(req.body.currentQuestionIndex);
      if (Number.isInteger(index) && index >= 0 && index < attempt.questions.length) {
        attempt.currentQuestionIndex = index;
        attempt.currentQuestionId = String(attempt.questions[index]?.question_id || attempt.questions[index]?.id || "") || null;
      }
      if (Array.isArray(req.body.reviewQuestionIds)) {
        const allowed = new Set(attempt.questions.map((question) => String(question.question_id || question.id)));
        attempt.reviewQuestionIds = req.body.reviewQuestionIds.map(String).filter((id) => allowed.has(id));
      }
      await attempt.save();
      return res.status(200).json({ status: true, data: serializeAttempt(attempt) });
    } catch (error) {
      return errorResponse(res, error, "Failed to save exam progress");
    }
  },

  async addWarning(req, res) {
    try {
      const reason = String(required(req.body.reason, "Warning reason"));
      const allowedReasons = new Set(["no_face", "multiple_faces", "camera_stopped", "camera_blocked"]);
      if (!allowedReasons.has(reason)) return res.status(400).json({ status: false, message: "Unsupported warning reason" });
      const attempt = await ExamAttempt.findOne({ examId: req.params.examId, userId: req.studentUser._id });
      if (!attempt) return res.status(404).json({ status: false, message: "Exam attempt not found" });
      if (attempt.status !== "in_progress") return res.status(200).json({ status: true, data: serializeAttempt(attempt) });
      attempt.warningCount = Math.min(3, Number(attempt.warningCount || 0) + 1);
      attempt.warnings.push({
        reason,
        questionId: req.body.questionId || attempt.currentQuestionId || null,
        message: req.body.message || null,
        occurredAt: new Date(),
      });
      await attempt.save();
      if (attempt.warningCount >= 3) {
        const ended = await finalizeAttempt({ examId: attempt.examId, userId: req.studentUser._id, reason: "security_warnings" });
        return res.status(200).json({ status: true, data: { ...serializeAttempt(ended), examEnded: true } });
      }
      return res.status(200).json({ status: true, data: { ...serializeAttempt(attempt), examEnded: false } });
    } catch (error) {
      return errorResponse(res, error, "Failed to record security warning");
    }
  },

  async submit(req, res) {
    try {
      const current = await ExamAttempt.findOne({ examId: req.params.examId, userId: req.studentUser._id });
      if (!current) return res.status(404).json({ status: false, message: "Exam attempt not found" });
      const reason = current.expiresAt && current.expiresAt <= new Date() ? "time_expired" : "manual";
      const attempt = await finalizeAttempt({ examId: req.params.examId, userId: req.studentUser._id, reason });
      return res.status(200).json({ status: true, data: serializeAttempt(attempt) });
    } catch (error) {
      return errorResponse(res, error, "Failed to submit exam");
    }
  },
};

module.exports = controller;
