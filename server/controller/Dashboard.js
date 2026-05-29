const Student = require("../model/Student");
const Teacher = require("../model/Teacher");
const SubjectUnit = require("../model/SubjectUnit");
const TutorConversation = require("../model/TutorConversation");
const LiveSession = require("../model/LiveSession");

const controller = {
  async getStudentStats(req, res) {
    try {
      const candidateId = String(req.query.candidateId || req.query.userId || "guest-user");
      const [lessonCount, tutorConversations, debateSessions, seminarSessions] = await Promise.all([
        SubjectUnit.countDocuments({ "processing.status": { $ne: "failed" } }),
        TutorConversation.find({ candidateId }).sort({ lastActivityAt: -1 }).limit(50),
        LiveSession.countDocuments({ candidateId, sessionType: "debate" }),
        LiveSession.countDocuments({ candidateId, sessionType: "seminar" }),
      ]);

      const studyMinutes = tutorConversations.reduce(
        (total, conversation) => total + Math.max((conversation.messages || []).length * 3, 0),
        0,
      );

      return res.status(200).json({
        lessonsCompleted: lessonCount,
        averageScore: 0,
        totalTimeSpent: Math.round(studyMinutes / 60),
        badgesEarned: debateSessions + seminarSessions,
        recentActivity: tutorConversations.slice(0, 5).map((conversation) => ({
          title: conversation.title,
          subject: conversation.subject,
          unit: conversation.unitTitle,
          lastUpdated: conversation.lastActivityAt,
        })),
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message || "Failed to fetch student stats",
      });
    }
  },

  async getStudentStreak(req, res) {
    try {
      const candidateId = String(req.query.candidateId || req.query.userId || "guest-user");
      const conversations = await TutorConversation.find({ candidateId })
        .sort({ lastActivityAt: -1 })
        .limit(30)
        .select("lastActivityAt");

      const uniqueDays = new Set(
        conversations.map((item) => new Date(item.lastActivityAt).toISOString().slice(0, 10)),
      );

      return res.status(200).json({
        currentStreak: uniqueDays.size,
        longestStreak: uniqueDays.size,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message || "Failed to fetch student streak",
      });
    }
  },

  async getTeacherStats(req, res) {
    try {
      const [totalStudents, totalTeachers, coursesCreated, pendingUploads, activeSessions] = await Promise.all([
        Student.countDocuments(),
        Teacher.countDocuments(),
        SubjectUnit.distinct("subjectGroupKey"),
        SubjectUnit.countDocuments({ "processing.status": { $in: ["pending", "processing"] } }),
        LiveSession.countDocuments({ status: "active" }),
      ]);

      return res.status(200).json({
        totalStudents,
        totalTeachers,
        coursesCreated: coursesCreated.filter(Boolean).length,
        pendingAssignments: pendingUploads,
        classAverage: 0,
        activeSessions,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message || "Failed to fetch teacher stats",
      });
    }
  },
};

module.exports = controller;
