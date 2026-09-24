const {
  getDashboard,
  listStudentBooks,
  listStudentSubjects,
  recordProgress,
} = require("../services/studentDataService");

const controller = {
  async dashboard(req, res) {
    try {
      const data = await getDashboard(req.studentUser._id);
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to load dashboard",
      });
    }
  },

  async subjects(req, res) {
    const startedAt = process.hrtime.bigint();
    try {
      const data = await listStudentSubjects(req.studentUser._id);
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      res.set("Server-Timing", `student-subjects;dur=${durationMs.toFixed(1)}`);
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to load subjects",
      });
    }
  },

  async books(req, res) {
    try {
      const data = await listStudentBooks(req.studentUser._id);
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to load books",
      });
    }
  },

  async progressSummary(req, res) {
    try {
      const data = await getDashboard(req.studentUser._id);
      return res.status(200).json({
        status: true,
        data: {
          stats: data.stats,
          achievements: data.achievements,
          progress: data.progress,
          subjectDistribution: data.subjectDistribution,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to load progress",
      });
    }
  },

  async achievements(req, res) {
    try {
      const data = await getDashboard(req.studentUser._id);
      return res.status(200).json({ status: true, data: data.achievements });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to load achievements",
      });
    }
  },

  async recordProgress(req, res) {
    try {
      const progress = await recordProgress({
        userId: req.studentUser._id,
        activityType: req.body.activityType || "unit_view",
        subjectGroupKey: req.body.subjectGroupKey,
        bookId: req.body.bookId || null,
        unitId: req.body.unitId || null,
        status: req.body.status,
        progressPercent: req.body.progressPercent,
        score: req.body.score,
        timeSpentMinutes: req.body.timeSpentMinutes,
        metadata: req.body.metadata,
      });
      return res.status(200).json({ status: true, data: progress });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to save progress",
      });
    }
  },
};

module.exports = controller;
