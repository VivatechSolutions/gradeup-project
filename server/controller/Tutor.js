const { callPython } = require("../services/pythonGateway");
const {
  resolveSubjectUnit,
  getPythonLearningContext,
} = require("../services/learningContextService");
const {
  appendMessages,
  listConversations,
  getConversation,
  clearConversations,
} = require("../services/tutorConversationService");
const { createRealtimeSession } = require("../services/speechService");
const compression = require('compression');

const QuestionBank = require("../model/QuestionBank");
const SubjectMetadata = require("../model/SubjectMetadata");
async function getQuestionBankByFilters(board, classNumber, subject, year, difficulty) {
  try {
    const filter = {
      board: board.trim(),
      classNumber: String(classNumber).trim(),
      subject: subject.trim(),
    };

    if (year) {
      filter.year = year;
    }

    const questionBank = await QuestionBank.findOne(filter)
      .populate("metadataId", "board classNumber subject")
      .lean();

    if (!questionBank) {
      return null;
    }

    // If difficulty filter is requested, filter questions
    if (difficulty && Array.isArray(questionBank.questions)) {
      return {
        ...questionBank,
        questions: questionBank.questions.filter(
          q => q.difficulty === difficulty
        ),
      };
    }

    return questionBank;
  } catch (error) {
    console.error("Error fetching question bank:", error);
    throw error;
  }
}

function getCandidatePayload(source = {}) {
  return {
    candidate_id: source.candidateId || source.candidate_id || source.userId || "guest-user",
    candidate_name:
      source.candidateName || source.candidate_name || source.userName || "GradeUp Learner",
  };
}

async function resolveLearningPayload(source = {}) {
  const unit = await resolveSubjectUnit({
    unitId: source.unitId || source.subjectUnitId,
    documentId: source.documentId,
    subjectGroupKey: source.subjectGroupKey,
    unitNumber: source.unitNumber || source.unit_number,
    subject: source.subject,
    unitTitle: source.unitTitle || source.unit_name || source.unitName,
  });

  return {
    unit,
    context: getPythonLearningContext(unit),
  };
}

const controller = {
  async askTutor(req, res) {
    try {
      const { unit, context } = await resolveLearningPayload(req.body);
      const candidate = getCandidatePayload(req.body);
      const pythonPayload = {
        query: req.body.query || req.body.message,
        board: context.board,
        class_number: context.classNumber,
        subject: context.subject,
        unit_number: context.unitNumber,
        unit_name: context.unitName,
        ...candidate,
        limit: Number(req.body.limit || 5),
      };
      
      // Add image data if present
      if (req.body.image_base64) {
        pythonPayload.image_base64 = req.body.image_base64;
        pythonPayload.image_mime_type = req.body.image_mime_type || "image/jpeg";
      }
      
      const data = await callPython({
        method: "post",
        path: "/tutor/ask",
        data: pythonPayload,
      });
      const assistantText =
        data?.answer ||
        data?.response ||
        data?.reply ||
        data?.content ||
        "I could not generate a response for that question.";

      const conversation = await appendMessages({
        conversationId:
          req.body.conversationId ||
          req.body.chatId ||
          req.body.sessionId ||
          `tutor-${candidate.candidate_id}-${Date.now()}`,
        candidateId: candidate.candidate_id,
        candidateName: candidate.candidate_name,
        unit,
        userMessage: req.body.query || req.body.message,
        assistantMessage: assistantText,
      });

      return res.status(200).json({
        status: true,
        data: {
          ...data,
          answer: assistantText,
        },
        meta: {
          unitId: unit._id,
          documentId: context.documentId,
          conversation,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to ask tutor",
        details: error.details || null,
      });
    }
  },

  async getTutorHistory(req, res) {
    try {
      const candidate = getCandidatePayload(req.query);
      const conversationId = req.query.conversationId || req.query.chatId;

      if (conversationId) {
        const conversation = await getConversation({
          candidateId: candidate.candidate_id,
          conversationId,
        });

        return res.status(200).json({
          status: true,
          data: conversation ? conversation.messages : [],
          meta: {
            conversation,
          },
        });
      }

      const data = await listConversations({
        candidateId: candidate.candidate_id,
        subjectGroupKey: req.query.subjectGroupKey,
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch tutor history",
      });
    }
  },

  async clearTutorHistory(req, res) {
    try {
      const candidate = getCandidatePayload(req.body);
      const deleted = await clearConversations({
        candidateId: candidate.candidate_id,
        conversationId: req.body.conversationId || req.body.chatId,
      });

      return res.status(200).json({ status: true, data: { deleted } });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to clear tutor history",
      });
    }
  },

  async getTutorConversations(req, res) {
    try {
      const candidate = getCandidatePayload(req.query);
      const data = await listConversations({
        candidateId: candidate.candidate_id,
        subjectGroupKey: req.query.subjectGroupKey,
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch tutor conversations",
      });
    }
  },

  async getTutorConversation(req, res) {
    try {
      const candidate = getCandidatePayload(req.query);
      const conversation = await getConversation({
        candidateId: candidate.candidate_id,
        conversationId: req.params.conversationId,
      });

      if (!conversation) {
        return res.status(404).json({
          status: false,
          message: "Conversation not found",
        });
      }

      return res.status(200).json({ status: true, data: conversation });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch tutor conversation",
      });
    }
  },

  async getFaq(req, res) {
    try {
      const { context } = await resolveLearningPayload(req.query);
      const data = await callPython({
        path: `/tutor/faq/${context.documentId}`,
        params: { unit_number: context.unitNumber },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch FAQs",
      });
    }
  },

  async getFaqSection(req, res) {
    try {
      const { context } = await resolveLearningPayload(req.query);
      const data = await callPython({
        path: `/tutor/faq/${context.documentId}/${encodeURIComponent(req.query.sectionTitle || "")}`,
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch FAQ section",
      });
    }
  },

  async trackFaq(req, res) {
    try {
      const { context } = await resolveLearningPayload(req.body);
      const candidate = getCandidatePayload(req.body);
      const data = await callPython({
        method: "post",
        path: `/tutor/faq/${context.documentId}/track`,
        data: {
          ...candidate,
          subject: context.subject,
          unit_number: context.unitNumber,
          section_title: req.body.sectionTitle || req.body.section_title,
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to track FAQ",
      });
    }
  },


  async generateQuiz(req, res) {
    try {
      const { context } = await resolveLearningPayload(req.body);
      const candidate = getCandidatePayload(req.body);
      const data = await callPython({
        method: "post",
        path: "/tutor/quiz/generate",
        data: {
          ...candidate,
          subject: context.subject,
          unit_number: context.unitNumber,
          board: context.board,
          unit_name: context.unitName,
          difficulty: req.body.difficulty || "easy",
          num_questions: Number(req.body.numQuestions || req.body.num_questions || 5),
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to generate quiz",
      });
    }
  },

  async submitQuiz(req, res) {
    try {
      const candidate = getCandidatePayload(req.body);
      const data = await callPython({
        method: "post",
        path: "/tutor/quiz/submit",
        data: {
          quiz_id: req.body.quizId || req.body.quiz_id,
          candidate_id: candidate.candidate_id,
          answers: req.body.answers || [],
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to submit quiz",
      });
    }
  },

  async getQuizHistory(req, res) {
    try {
      const candidate = getCandidatePayload(req.query);
      const context =
        req.query.unitId || req.query.subjectGroupKey || req.query.documentId
          ? (await resolveLearningPayload(req.query)).context
          : null;
      const data = await callPython({
        path: `/tutor/quiz/history/${candidate.candidate_id}`,
        params: {
          subject: context?.subject,
          unit_number: context?.unitNumber,
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch quiz history",
      });
    }
  },

  async assignHomework(req, res) {
    try {
      const { context } = await resolveLearningPayload(req.body);
      const candidate = getCandidatePayload(req.body);
      const data = await callPython({
        method: "post",
        path: "/tutor/homework/assign",
        data: {
          ...candidate,
          subject: context.subject,
          unit_number: context.unitNumber,
          board: context.board,
          unit_name: context.unitName,
          num_questions: Number(req.body.numQuestions || req.body.num_questions || 5),
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to assign homework",
      });
    }
  },

  async submitHomework(req, res) {
    try {
      const candidate = getCandidatePayload(req.body);
      const data = await callPython({
        method: "post",
        path: "/tutor/homework/submit",
        data: {
          homework_id: req.body.homeworkId || req.body.homework_id,
          candidate_id: candidate.candidate_id,
          answers: req.body.answers || [],
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to submit homework",
      });
    }
  },

  async getHomework(req, res) {
    try {
      const candidate = getCandidatePayload(req.query);
      const context =
        req.query.unitId || req.query.subjectGroupKey || req.query.documentId
          ? (await resolveLearningPayload(req.query)).context
          : null;
      const data = await callPython({
        path: `/tutor/homework/${candidate.candidate_id}`,
        params: {
          subject: context?.subject,
          unit_number: context?.unitNumber,
          status: req.query.status,
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch homework",
      });
    }
  },

  async getHomeworkHistory(req, res) {
    try {
      const candidate = getCandidatePayload(req.query);
      const context =
        req.query.unitId || req.query.subjectGroupKey || req.query.documentId
          ? (await resolveLearningPayload(req.query)).context
          : null;
      const data = await callPython({
        path: `/tutor/homework/${candidate.candidate_id}/history`,
        params: {
          subject: context?.subject,
          unit_number: context?.unitNumber,
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch homework history",
      });
    }
  },

  async getPerformance(req, res) {
    try {
      const candidate = getCandidatePayload(req.query);
      const context =
        req.query.unitId || req.query.subjectGroupKey || req.query.documentId
          ? (await resolveLearningPayload(req.query)).context
          : null;
      const data = await callPython({
        path: `/tutor/performance/${candidate.candidate_id}`,
        params: {
          subject: context?.subject,
          unit_number: context?.unitNumber,
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch performance",
      });
    }
  },

  async getPerformancePoints(req, res) {
    try {
      const candidate = getCandidatePayload(req.query);
      const data = await callPython({
        path: `/tutor/performance/${candidate.candidate_id}/points`,
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch performance points",
      });
    }
  },
async getQuestionBank(req, res) {
  try {
    const { 
      board, 
      classNumber, 
      subject, 
      year, 
      difficulty,
      subjectGroupKey  // NEW: Optional parameter for filtering by group
    } = req.query;
 
    // Validate required parameters
    if (!board || !classNumber || !subject ||!subjectGroupKey) {
      return res.status(400).json({
        status: false,
        message: "Missing required query parameters: board, classNumber, subject",
      });
    }
 
    // Build filter object
    const filter = {
      board,
      classNumber,
      subject,
    };
 
    // NEW: Add subjectGroupKey to filter if provided
    if (subjectGroupKey) {
      filter.subjectGroupKey = subjectGroupKey;
    }
 
    // Add year filter if provided
    if (year) {
      filter.year = year;
    }
 
    // Get question bank with filters
    // OPTION 1: Get all matching question banks (if you want all versions)
    const questionBanks = await QuestionBank.find(filter)
      // .select("-questions") // Exclude full questions array initially
      .sort({ processedAt: -1 })
      .lean();
 
    if (!questionBanks || questionBanks.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Question bank not found for the given parameters",
      });
    }
 
    // OPTION 2: Return single latest version (if preferred)
    // const questionBank = questionBanks[0];
 
    // If difficulty filter is provided, get the full questions
    let response = questionBanks.map((qb) => ({
      documentId: qb.documentId,
      examName: qb.examName,
      year: qb.year,
      board: qb.board,
      classNumber: qb.classNumber,
      subject: qb.subject,
      subjectGroupKey: qb.subjectGroupKey,  // NEW: Include in response
      unitName: qb.unitName || null,
      unitNumber: qb.unitNumber || null,
      totalQuestions: qb.totalQuestions,
      difficultyDistribution: qb.difficultyDistribution,
      metadata: qb.metadataId || null,
      processedAt: qb.processedAt,
      questions:qb.questions || null, // Include questions if difficulty filter is not applied, otherwise fetch separately
    }));
 
    // If difficulty filter is requested, fetch full questions and filter
    // if (difficulty && response.length > 0) {
    //   const qbWithQuestions = await QuestionBank.findById(questionBanks[0]._id);
      
    //   if (qbWithQuestions && qbWithQuestions.questions) {
    //     const filteredQuestions = qbWithQuestions.questions.filter(
    //       (q) => q.difficulty === difficulty
    //     );
        
    //     response[0].questions = filteredQuestions;
    //   }
    // }
 
    return res.status(200).json({
      status: true,
      data: response.length === 1 ? response[0] : response,
    });
 
  } catch (error) {
    console.error("Get question bank error:", error);
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || "Failed to fetch question bank",
      details: error.details || null,
    });
  }
},
  async getQuestionBankStats(req, res) {
    try {
      const { board, classNumber, subject, year } = req.query;

      // Validate required parameters
      if (!board || !classNumber || !subject) {
        return res.status(400).json({
          status: false,
          message: "Missing required query parameters: board, classNumber, subject",
        });
      }

      const filter = {
        board: board.trim(),
        classNumber: String(classNumber).trim(),
        subject: subject.trim(),
      };

      if (year) {
        filter.year = year;
      }

      const questionBank = await QuestionBank.findOne(filter).lean();

      if (!questionBank) {
        return res.status(404).json({
          status: false,
          message: "Question bank not found",
        });
      }

      return res.status(200).json({
        status: true,
        data: {
          documentId: questionBank.documentId,
          examName: questionBank.examName,
          year: questionBank.year,
          board: questionBank.board,
          classNumber: questionBank.classNumber,
          subject: questionBank.subject,
          totalQuestions: questionBank.totalQuestions,
          difficultyDistribution: questionBank.difficultyDistribution,
          processedAt: questionBank.processedAt,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch question bank stats",
      });
    }
  },
  async listSubjectMetadata(req, res) {
    try {
      const { board, classNumber } = req.query;

      const filter = {};

      if (board) {
        filter.board = board.trim();
      }

      if (classNumber) {
        filter.classNumber = String(classNumber).trim();
      }

      const metadata = await SubjectMetadata.find(filter)
        .select("board classNumber subject createdAt")
        .lean()
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: true,
        data: metadata,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch subject metadata",
      });
    }
  },

async getRealtimeSessionToken(req, res) {
  try {
    const session = await createRealtimeSession();

    return res.status(200).json({
      status: true,
      data: {
        clientSecret: session.clientSecret,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("Realtime token endpoint error:", error);
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || "Failed to create realtime session",
    });
  }
}
};

module.exports = controller;
  // async getQuestionBank(req, res) {
  //   try {
  //     const { context } = await resolveLearningPayload(req.query);
  //     const data = await callPython({
  //       path: `/tutor/question-bank/${context.documentId}`,
  //       params: {
  //         year: req.query.year,
  //         difficulty: req.query.difficulty,
  //         unit_number: context.unitNumber,
  //       },
  //     });

  //     return res.status(200).json({ status: true, data });
  //   } catch (error) {
  //     return res.status(error.statusCode || 500).json({
  //       status: false,
  //       message: error.message || "Failed to fetch question bank",
  //     });
  //   }
  // },

  // async getQuestionBankStats(req, res) {
  //   try {
  //     const { context } = await resolveLearningPayload(req.query);
  //     const data = await callPython({
  //       path: `/tutor/question-bank/stats/${context.documentId}`,
  //     });

  //     return res.status(200).json({ status: true, data });
  //   } catch (error) {
  //     return res.status(error.statusCode || 500).json({
  //       status: false,
  //       message: error.message || "Failed to fetch question bank stats",
  //     });
  //   }
  // },
