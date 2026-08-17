const { callPython } = require("../services/pythonGateway");
const {
  resolveSubjectUnit,
  getPythonLearningContext,
} = require("../services/learningContextService");

async function resolveAvatarContext(source = {}) {
  const unit = await resolveSubjectUnit({
    unitId: source.unitId || source.subjectUnitId,
    documentId: source.documentId,
    subjectGroupKey: source.subjectGroupKey,
    unitNumber: source.unitNumber || source.unit_number,
    subject: source.subject,
    unitTitle: source.unitTitle || source.unitName,
  });

  return {
    unit,
    context: getPythonLearningContext(unit),
  };
}

function normalizeSessionId(source = {}) {
  return source.sessionId || source.session_id;
}

const controller = {
  async start(req, res) {
    try {
      const { context } = await resolveAvatarContext(req.body);
      const sectionTitle = String(
        req.body.sectionTitle || req.body.section_title || "",
      ).trim();

      if (!sectionTitle) {
        return res.status(400).json({
          status: false,
          message: "Section title is required to start Genius Mode.",
        });
      }

      const data = await callPython({
        method: "post",
        path: "/avatar/start",
        data: {
          candidate_id: req.body.candidate_id || req.body.candidateId,
          candidate_name:
            req.body.candidate_name ||
            req.body.candidateName ||
            "GradeUp Learner",
          board: context.board,
          class_number: context.classNumber,
          subject: context.subject,
          unit_number: context.unitNumber,
          unit_name: context.unitName,
          section_title: sectionTitle,
          segments: req.body.segments ?? null,
          term: req.body.term ?? null,
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to start avatar session",
        details: error.details || null,
      });
    }
  },

  async raiseHand(req, res) {
    try {
      const sessionId = normalizeSessionId(req.body);
      if (!sessionId) {
        return res.status(400).json({
          status: false,
          message: "Session id is required.",
        });
      }

      const data = await callPython({
        method: "post",
        path: "/avatar/raise-hand",
        data: {
          session_id: sessionId,
          student_doubt: req.body.studentDoubt || req.body.student_doubt || null,
          student_response:
            req.body.studentResponse || req.body.student_response || null,
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to raise hand",
        details: error.details || null,
      });
    }
  },

  async generateFlashcard(req, res) {
    try {
      const sessionId = normalizeSessionId(req.body);
      const flashCards = req.body.flashCards || req.body.flash_cards || [];

      if (!sessionId) {
        return res.status(400).json({
          status: false,
          message: "Session id is required.",
        });
      }

      const data = await callPython({
        method: "post",
        path: "/avatar/flashcard/generate",
        data: {
          session_id: sessionId,
          flash_cards: flashCards.map((card) => ({
            flashcard_id: card.flashcard_id || card.flashcardId,
            flashcard_type: card.flashcard_type || card.flashcardType,
            segment_id: card.segment_id || card.segmentId,
          })),
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to generate avatar flashcard",
        details: error.details || null,
      });
    }
  },

  async resume(req, res) {
    try {
      const sessionId = normalizeSessionId(req.body);
      if (!sessionId) {
        return res.status(400).json({
          status: false,
          message: "Session id is required.",
        });
      }

      const data = await callPython({
        method: "post",
        path: "/avatar/resume",
        data: { session_id: sessionId },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to resume avatar session",
        details: error.details || null,
      });
    }
  },

  async end(req, res) {
    try {
      const sessionId = normalizeSessionId(req.body);
      if (!sessionId) {
        return res.status(400).json({
          status: false,
          message: "Session id is required.",
        });
      }

      const data = await callPython({
        method: "post",
        path: "/avatar/end",
        data: { session_id: sessionId },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to end avatar session",
        details: error.details || null,
      });
    }
  },
};

module.exports = controller;
