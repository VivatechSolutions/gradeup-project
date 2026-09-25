const {
  getDashboard,
  listStudentBooks,
  listStudentSubjects,
  recordProgress,
} = require("../services/studentDataService");
const {
  checkIn,
  completeSession,
  heartbeatSession,
  startSession,
} = require("../services/activityService");
const {
  createEvent,
  listEvents,
  removeEvent,
  todayPlan,
  updateEvent,
} = require("../services/calendarService");
const { getLeaderboard } = require("../services/leaderboardService");

function timezoneFrom(req) {
  return req.body?.timezone || req.query?.timezone || req.get("x-timezone") || "UTC";
}

function sendError(res, error, fallback) {
  return res.status(error.statusCode || 500).json({ status: false, message: error.message || fallback });
}

const controller = {
  async dashboard(req, res) {
    try {
      const data = await getDashboard(req.studentUser._id, timezoneFrom(req));
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
      const data = await getDashboard(req.studentUser._id, timezoneFrom(req));
      return res.status(200).json({
        status: true,
        data: {
          stats: data.stats,
          achievements: data.achievements,
          progress: data.progress,
          subjectDistribution: data.subjectDistribution,
          subjects: data.subjects,
          leaderboard: data.leaderboard,
          dailyActivity: data.dailyActivity,
          todayPlan: data.todayPlan,
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
      const data = await getDashboard(req.studentUser._id, timezoneFrom(req));
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
        metadata: req.body.metadata,
        timezone: timezoneFrom(req),
      });
      return res.status(200).json({ status: true, data: progress });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to save progress",
      });
    }
  },

  async checkIn(req, res) {
    try {
      const data = await checkIn({ userId: req.studentUser._id, timezone: timezoneFrom(req) });
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return sendError(res, error, "Failed to record daily visit");
    }
  },

  async startStudySession(req, res) {
    try {
      const data = await startSession({
        userId: req.studentUser._id,
        activityType: req.body.activityType,
        subjectGroupKey: req.body.subjectGroupKey,
        bookId: req.body.bookId,
        unitId: req.body.unitId,
        sourceId: req.body.sourceId,
        timezone: timezoneFrom(req),
        metadata: req.body.metadata,
      });
      return res.status(201).json({ status: true, data });
    } catch (error) {
      return sendError(res, error, "Failed to start study session");
    }
  },

  async heartbeatStudySession(req, res) {
    try {
      const data = await heartbeatSession({
        userId: req.studentUser._id,
        sessionId: req.params.sessionId,
        sequence: req.body.sequence,
        active: req.body.active === true,
        visible: req.body.visible === true,
      });
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return sendError(res, error, "Failed to record study activity");
    }
  },

  async completeStudySession(req, res) {
    try {
      const data = await completeSession({
        userId: req.studentUser._id,
        sessionId: req.params.sessionId,
        status: req.body.status,
        metadata: req.body.metadata,
      });
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return sendError(res, error, "Failed to complete study session");
    }
  },

  async leaderboard(req, res) {
    try {
      const data = await getLeaderboard(req.studentUser._id, { period: req.query.period, batchId: req.query.batchId });
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return sendError(res, error, "Failed to load leaderboard");
    }
  },

  async calendarEvents(req, res) {
    try {
      const data = await listEvents(req.studentUser._id, { from: req.query.from, to: req.query.to });
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return sendError(res, error, "Failed to load calendar events");
    }
  },

  async createCalendarEvent(req, res) {
    try {
      const data = await createEvent(req.studentUser._id, req.body);
      return res.status(201).json({ status: true, data });
    } catch (error) {
      return sendError(res, error, "Failed to create calendar event");
    }
  },

  async updateCalendarEvent(req, res) {
    try {
      const data = await updateEvent(req.studentUser._id, req.params.eventId, req.body);
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return sendError(res, error, "Failed to update calendar event");
    }
  },

  async removeCalendarEvent(req, res) {
    try {
      await removeEvent(req.studentUser._id, req.params.eventId);
      return res.status(200).json({ status: true });
    } catch (error) {
      return sendError(res, error, "Failed to remove calendar event");
    }
  },

  async todayPlan(req, res) {
    try {
      const data = await todayPlan(req.studentUser._id, timezoneFrom(req));
      return res.status(200).json({ status: true, data });
    } catch (error) {
      return sendError(res, error, "Failed to load today's plan");
    }
  },
};

module.exports = controller;
