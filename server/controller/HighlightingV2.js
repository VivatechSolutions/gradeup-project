const { callPython } = require("../services/pythonGateway");
const {
  resolveSubjectUnit,
  getPythonLearningContext,
} = require("../services/learningContextService");

async function resolveHighlightPayload(source = {}) {
  const unit = await resolveSubjectUnit({
    unitId: source.unitId || source.subjectUnitId,
    documentId: source.documentId,
    subjectGroupKey: source.subjectGroupKey,
    unitNumber: source.unitNumber || source.unit_number,
    subject: source.subject,
    unitTitle: source.unitTitle || source.unitName,
  });

  return getPythonLearningContext(unit);
}

async function forwardHighlight(res, req, path, extra = {}) {
  try {
    const context = await resolveHighlightPayload(req.body);
    const data = await callPython({
      method: "post",
      path,
      data: {
        highlighted_text: req.body.highlightedText || req.body.text,
        board: context.board,
        class_number: context.classNumber,
        subject: context.subject,
        unit_number: context.unitNumber,
        ...extra,
      },
    });

    return res.status(200).json({ status: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || "Failed to process highlight request",
      details: error.details || null,
    });
  }
}

const controller = {
  explain(req, res) {
    return forwardHighlight(res, req, "/highlight/explain");
  },

  summarize(req, res) {
    return forwardHighlight(res, req, "/highlight/summarize");
  },

  ask(req, res) {
    return forwardHighlight(res, req, "/highlight/ask", {
      messages: req.body.messages || [],
    });
  },

  read(req, res) {
    return forwardHighlight(res, req, "/highlight/read", {
      action: req.body.action || "explain",
    });
  },
};

module.exports = controller;
