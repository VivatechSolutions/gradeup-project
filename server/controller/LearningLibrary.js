const {
  listSubjectGroups,
  getSubjectGroupByKey,
  resolveSubjectUnit,
  toUnitSummary,
  extractSectionTopicsForUnit,
  extractFaqsForUnit,
} = require("../services/learningContextService");

const controller = {
  async listSubjects(req, res) {
    try {
      const data = await listSubjectGroups(req.query);
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to list subjects",
      });
    }
  },

  async getSubjectDetail(req, res) {
    const startedAt = process.hrtime.bigint();
    try {
      const data = await getSubjectGroupByKey(req.params.subjectGroupKey, {
        summary: req.query.summary === "true" || req.query.summary === "1",
      });
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      res.set("Server-Timing", `library-subject-detail;dur=${durationMs.toFixed(1)}`);
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch subject detail",
      });
    }
  },

  async getUnit(req, res) {
    try {
      const unit = await resolveSubjectUnit({ unitId: req.params.unitId });
      return res.status(200).json({ status: true, data: toUnitSummary(unit) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch unit",
      });
    }
  },

  async getUnitContent(req, res) {
    const startedAt = process.hrtime.bigint();
    try {
      const requestedFormat = String(req.query.format || "enriched").toLowerCase();
      const format = ["structured", "both"].includes(requestedFormat)
        ? requestedFormat
        : "enriched";
      const unit = await resolveSubjectUnit({ unitId: req.params.unitId });
      const content = format === "both"
        ? {
            structured: unit.structuredData || null,
            enriched: unit.enrichedData || null,
          }
        : format === "structured"
          ? unit.structuredData || unit.enrichedData
          : unit.enrichedData || null;

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      res.set("Server-Timing", `library-unit-content;dur=${durationMs.toFixed(1)}`);
      return res.status(200).json({
        status: true,
        data: {
          unit: toUnitSummary(unit, {
            lightweight: req.query.summary === "true" || req.query.summary === "1",
          }),
          format,
          content,
          sectionTopics:
            req.query.summary === "true" || req.query.summary === "1"
              ? unit.readerIndex?.avatarSections || unit.readerIndex?.sections || []
              : extractSectionTopicsForUnit(unit),
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch unit content",
      });
    }
  },

  async getUnitFaq(req, res) {
    try {
      const unit = await resolveSubjectUnit({ unitId: req.params.unitId });
      const faqs = extractFaqsForUnit(unit);

      return res.status(200).json({
        status: true,
        data: {
          unit: toUnitSummary(unit),
          faqs,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch unit FAQs",
      });
    }
  },
};

module.exports = controller;
