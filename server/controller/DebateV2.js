const { callPython } = require("../services/pythonGateway");
const { sendEmail } = require("../config/EmailTransporter");
const { getDebateInviteEmail } = require("../config/EmailTemplate");
const {
  resolveSubjectUnit,
  getPythonLearningContext,
  buildDebateTopicHierarchyForUnit,
} = require("../services/learningContextService");
const { getDebateTopicHierarchy } = require("../services/debateTopicService");
const {
  createRoomSession,
  upsertSession,
  appendTurn,
  touchParticipant,
  completeSession,
  getSession,
  saveFeedback,
  startRoomSession,
  saveRoomAiStudentResponse,
  saveRoomRoundSubmission,
  updateRoomState,
  normalizeTeamKey,
  normalizeTeams,
} = require("../services/liveSessionService");
const { recordProgress } = require("../services/studentDataService");
const {
  assertSessionAccess,
  getRequestStudentContext,
  updateSessionVisibility,
} = require("../services/sessionVisibilityService");

function getCandidate(source = {}) {
  return {
    candidate_id: source.candidateId || source.candidate_id || "guest-user",
    candidate_name:
      source.candidateName || source.candidate_name || "GradeUp Learner",
  };
}

async function getContext(source = {}) {
  const unit = await resolveSubjectUnit({
    unitId: source.unitId || source.subjectUnitId,
    documentId: source.documentId,
    subjectGroupKey: source.subjectGroupKey,
    unitNumber: source.unitNumber || source.unit_number,
    subject: source.subject,
    unitTitle: source.unitTitle || source.unitName,
  });

  return { unit, context: getPythonLearningContext(unit) };
}

function isTeamDebateRequest(source = {}, liveSession = null) {
  return (
    source.debateType === "team" ||
    source.subMode === "multi" ||
    liveSession?.debateType === "team"
  );
}

function buildJoinCode(sessionId) {
  return String(sessionId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase();
}

function flattenTopicHierarchy(hierarchy = {}) {
  return (hierarchy.units || []).flatMap((unit) =>
    (unit.sections || []).flatMap((section) =>
      (section.debate_topics || []).map((topic, index) => {
        const topicTitle =
          topic.topic_title || topic.label || topic.title || topic.name || "";

        return {
          id:
            topic.topic_id ||
            `${unit.unit_number || "unit"}-${section.section_id || section.section_title || "section"}-${index}`,
          label: topicTitle,
          topic: topicTitle,
          title: topicTitle,
          name: topicTitle,
          topicDescription: topic.topic_description || null,
          keyConcepts: topic.key_concepts || [],
          subject: hierarchy.subject || topic.subject || null,
          unitNumber: unit.unit_number ?? null,
          unitTitle: unit.unit_title || null,
          sectionId: section.section_id || topic.section_id || null,
          sectionTitle: section.section_title || null,
          topicPath: topic.topic_path || [],
        };
      }),
    ),
  );
}

function normalizeRoomWarnings(room = {}, respondData = null) {
  const warnings = [];

  if (respondData?.ai_moderation) {
    warnings.push(String(respondData.ai_moderation));
  }

  (room.messages || [])
    .filter(
      (message) => message.type === "warning" || message.type === "removal",
    )
    .slice(-5)
    .forEach((message) => {
      const text = message.content || message.message || "Warning";
      warnings.push(String(text));
    });

  return warnings;
}

function toTeamList(team = [], teamKey) {
  return (team || []).map((participant, index) => ({
    id: String(participant.id),
    name: participant.name || "Participant",
    team: teamKey,
    teamOrder: index + 1,
    isAi: participant.id === "__ai_student__",
    isHost: false,
    status: "active",
  }));
}

function mapRoomTeams(data = {}) {
  const normalized = normalizeTeams(data.teams || {});
  const teamA = normalized.A.length
    ? normalized.A
    : toTeamList(data.teams?.blue_team || [], "A");
  const teamB = normalized.B.length
    ? normalized.B
    : toTeamList(data.teams?.red_team || [], "B");
  return { A: teamA, B: teamB };
}

function ensureBalancedTeamsForRoom(baseTeams = {}, liveSession = null) {
  const humans = (liveSession?.participants || [])
    .filter(
      (participant) =>
        participant.role !== "observer" &&
        !participant.isAi &&
        participant.status !== "removed",
    )
    .map((participant) => ({
      id: String(participant.id || participant.participantId),
      name: participant.name || "Participant",
      isHost: Boolean(participant.isHost),
      status: participant.status || "active",
    }))
    .sort((left, right) => {
      if (Boolean(left.isHost) !== Boolean(right.isHost)) {
        return left.isHost ? -1 : 1;
      }
      return String(left.name || "").localeCompare(String(right.name || ""));
    });

  const teamA = [];
  const teamB = [];
  humans.forEach((participant, index) => {
    const targetTeam = index % 2 === 0 ? "A" : "B";
    const target = targetTeam === "A" ? teamA : teamB;
    target.push({
      ...participant,
      team: targetTeam,
      teamOrder: target.length + 1,
      isAi: false,
    });
  });

  if (teamA.length !== teamB.length) {
    const target = teamA.length < teamB.length ? teamA : teamB;
    const teamKey = target === teamA ? "A" : "B";
    target.push({
      id: "__ai_student__",
      name: "AI Participant",
      team: teamKey,
      teamOrder: target.length + 1,
      isAi: true,
      isHost: false,
      status: "active",
    });
  }

  if (teamA.length || teamB.length) {
    return { A: teamA, B: teamB };
  }

  return baseTeams;
}

function getSpeakerProgress(turns = [], team, participantId) {
  return turns.filter(
    (turn) =>
      turn.turnType === "submission" &&
      normalizeTeamKey(turn.team) === team &&
      String(turn.speakerId) === String(participantId),
  ).length;
}

function pickNextSpeaker(liveSession, team) {
  const normalizedTeam = normalizeTeamKey(team) || "A";
  const teamParticipants = (liveSession?.participants || [])
    .filter(
      (participant) =>
        normalizeTeamKey(participant.team) === normalizedTeam &&
        !participant.isAi &&
        participant.status !== "removed",
    )
    .sort((a, b) => {
      const aTurns = getSpeakerProgress(
        liveSession?.turns || [],
        normalizedTeam,
        a.id || a.participantId,
      );
      const bTurns = getSpeakerProgress(
        liveSession?.turns || [],
        normalizedTeam,
        b.id || b.participantId,
      );
      if (aTurns !== bTurns) return aTurns - bTurns;
      const aOrder = Number.isFinite(a.teamOrder) ? a.teamOrder : 999;
      const bOrder = Number.isFinite(b.teamOrder) ? b.teamOrder : 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

  return teamParticipants[0] || null;
}

function resolveRoomParticipant(participants = [], participantId, fallback = {}) {
  if (!participantId) {
    return null;
  }

  const id = String(participantId);
  const participant = (participants || []).find(
    (item) =>
      String(item.id || item.participantId || item.candidateId || "") === id,
  );

  if (participant) {
    return {
      id,
      name: participant.name || participant.candidateName || fallback.name || "Participant",
      team: normalizeTeamKey(participant.team) || participant.team || fallback.team || null,
      isAi: Boolean(participant.isAi || id === "__ai_student__"),
    };
  }

  if (id === "__ai_student__") {
    return {
      id,
      name: fallback.name || "AI Student",
      team: fallback.team || null,
      isAi: true,
    };
  }

  return {
    id,
    name: fallback.name || "Unknown participant",
    team: fallback.team || null,
    isAi: Boolean(fallback.isAi),
  };
}

function buildRoomSnapshot(pythonRoom, liveSession) {
  const participantCount =
    liveSession?.participants?.filter((participant) => !participant.isAi)
      .length || 0;
  return {
    ...(pythonRoom || {}),
    liveSession,
    participantCount,
    waitingForHost: liveSession?.status === "waiting",
    currentSpeakerId: liveSession?.currentRound?.currentSpeakerId || null,
    activeTeam: liveSession?.currentRound?.activeTeam || null,
  };
}

async function fetchRoomState(sessionId) {
  const [pythonRoom, liveSession] = await Promise.all([
    callPython({
      path: `/debate/room/${encodeURIComponent(sessionId)}`,
    }).catch(() => null),
    getSession(sessionId),
  ]);

  return buildRoomSnapshot(pythonRoom, liveSession);
}

async function syncRoomParticipantsFromPython(sessionId, pythonRoom) {
  const participants = pythonRoom?.participants || {};
  const entries = Array.isArray(participants)
    ? participants.map((item) => [item.id, item])
    : Object.entries(participants);

  for (const [candidateId, participant] of entries) {
    await touchParticipant({
      sessionId,
      candidateId,
      candidateName: participant.candidate_name || participant.name,
      role: participant.is_ai_student ? "assistant" : "participant",
      isAi: Boolean(participant.is_ai_student),
      status: participant.status || "active",
      team: participant.team,
      warningCount: participant.warning_count || 0,
      warnings: participant.off_topic_warnings || [],
    });
  }
}

const controller = {
  async start(req, res) {
    try {
      const candidate = getCandidate(req.body);
      const { unit, context } = await getContext(req.body);
      const isTeamDebate = isTeamDebateRequest(req.body);
      const visibilityContext = await getRequestStudentContext(req);

      if (isTeamDebate) {
        const roomData = await callPython({
          method: "post",
          path: "/debate/room/create",
          data: {
            ...candidate,
            subject: context.subject,
            unit_number: context.unitNumber,
            board: context.board,
            class_number: context.classNumber,
            unit_name: context.unitName,
            topic: req.body.topic,
            max_participants: Number(req.body.maxParticipants || 8),
          },
        });

        const sessionId =
          roomData?.session_id ||
          roomData?.sessionId ||
          `debate-room-${candidate.candidate_id}-${Date.now()}`;
        const roomCode = buildJoinCode(sessionId);
        const liveSession = await createRoomSession({
          sessionId,
          candidateId: candidate.candidate_id,
          candidateName: candidate.candidate_name,
          topic: req.body.topic,
          topicId: req.body.topicId || null,
          topicUnitNumber: req.body.topicUnitNumber ?? null,
          topicSectionTitle: req.body.topicSectionTitle || null,
          topicPath: Array.isArray(req.body.topicPath)
            ? req.body.topicPath
            : [],
          unit,
          metadata: roomData,
          roomCode,
          shareLink: req.body.roomLink || null,
          visibility: req.body.visibility,
          visibilityContext,
        });

        return res.status(200).json({
          status: true,
          data: {
            ...roomData,
            session_id: sessionId,
            sessionId,
            roomCode,
            liveSession,
          },
        });
      }

      const data = await callPython({
        method: "post",
        path: "/debate/start",
        data: {
          ...candidate,
          subject: context.subject,
          unit_number: context.unitNumber,
          board: context.board,
          class_number: context.classNumber,
          unit_name: context.unitName,
          topic: req.body.topic,
        },
      });

      const storedSession = await upsertSession({
        sessionType: "debate",
        sessionId:
          data?.session_id ||
          data?.sessionId ||
          `debate-${candidate.candidate_id}-${Date.now()}`,
        candidateId: candidate.candidate_id,
        candidateName: candidate.candidate_name,
        topic: req.body.topic,
        topicId: req.body.topicId || null,
        topicUnitNumber: req.body.topicUnitNumber ?? null,
        topicSectionTitle: req.body.topicSectionTitle || null,
        topicPath: Array.isArray(req.body.topicPath) ? req.body.topicPath : [],
        unit,
        metadata: data,
        debateType: req.body.debateType || "1_vs_ai",
        visibility: req.body.visibility,
        visibilityContext,
      });

      return res
        .status(200)
        .json({ status: true, data: { ...data, liveSession: storedSession } });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to start debate",
      });
    }
  },

  async createRoom(req, res) {
    return controller.start(req, res);
  },

  async respond(req, res) {
    try {
      const liveSession = await getSession(
        req.body.sessionId || req.body.session_id,
      );
      if (isTeamDebateRequest(req.body, liveSession)) {
        return controller.submitRoomTurn(req, res);
      }

      const candidate = getCandidate(req.body);
      const data = await callPython({
        method: "post",
        path: "/debate/respond",
        data: {
          session_id: req.body.sessionId || req.body.session_id,
          message: req.body.message,
        },
      });
     console.log(`[DEBATE] ${candidate.candidate_name} submitted a message in session ${req.body.sessionId || req.body.session_id}:`, req.body.message);
      const touchedSession = await touchParticipant({
        sessionId: req.body.sessionId || req.body.session_id,
        candidateId: candidate.candidate_id,
        candidateName: candidate.candidate_name,
        status: "active",
      });
 console.log(`[DEBATE] ${candidate.candidate_name} touched session ${touchedSession} ${req.body.sessionId || req.body.session_id}`);
      const updatedSession = await appendTurn({
        sessionId: req.body.sessionId || req.body.session_id,
        speakerId: candidate.candidate_id,
        speakerName: candidate.candidate_name,
        role: req.body.role || "user",
        message: req.body.message,
        transcript: req.body.transcript || req.body.message,
      });
console.log(`[DEBATE] ${candidate.candidate_name} updated session ${updatedSession} ${req.body.sessionId || req.body.session_id}`);
      const aiReply =
        data?.ai_response ||
        data?.ai_greeting ||
        data?.response ||
        data?.reply ||
        data?.message ||
        data?.answer;

      if (aiReply) {
        await appendTurn({
          sessionId: req.body.sessionId || req.body.session_id,
          speakerId: "ai-debater",
          speakerName: "AI Debater",
          role: "assistant",
          message: aiReply,
          transcript: aiReply,
        });
      }
console.log
      return res.status(200).json({
        status: true,
        data: { ...data, liveSession: updatedSession || touchedSession },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to send debate response",
      });
    }
  },

  async join(req, res) {
    try {
      const candidate = getCandidate(req.body);
      await assertSessionAccess(req.body.sessionId || req.body.session_id, req);
      const liveSession = await getSession(
        req.body.sessionId || req.body.session_id,
      );

      if (isTeamDebateRequest(req.body, liveSession)) {
        const existingParticipant = (liveSession?.participants || []).find(
          (participant) =>
            String(participant.id) === String(candidate.candidate_id),
        );
        const roomStatus = liveSession?.status;
        const hasStarted =
          roomStatus === "active" ||
          roomStatus === "waiting_for_ai" ||
          roomStatus === "completed";

        if (hasStarted && !existingParticipant) {
          return res.status(403).json({
            status: false,
            message:
              roomStatus === "completed"
                ? "This debate has already ended."
                : "This debate has already started. New participants cannot join now.",
          });
        }

        if (existingParticipant) {
          const refreshedSession = await touchParticipant({
            sessionId: req.body.sessionId || req.body.session_id,
            candidateId: candidate.candidate_id,
            candidateName: candidate.candidate_name,
            status: hasStarted ? "active" : "waiting",
          });

          return res.status(200).json({
            status: true,
            data: {
              liveSession: refreshedSession,
            },
          });
        }

        const roomData = await callPython({
          method: "post",
          path: "/debate/room/join",
          data: {
            session_id: req.body.sessionId || req.body.session_id,
            candidate_id: candidate.candidate_id,
            candidate_name: candidate.candidate_name,
          },
        });

        await touchParticipant({
          sessionId: req.body.sessionId || req.body.session_id,
          candidateId: candidate.candidate_id,
          candidateName: candidate.candidate_name,
          status: hasStarted ? "active" : "waiting",
        });

        const updatedSession = await getSession(
          req.body.sessionId || req.body.session_id,
        );
        return res.status(200).json({
          status: true,
          data: {
            ...roomData,
            liveSession: updatedSession,
          },
        });
      }

      const updatedSession = await touchParticipant({
        sessionId: req.body.sessionId || req.body.session_id,
        candidateId: candidate.candidate_id,
        candidateName: candidate.candidate_name,
        status: "active",
      });

      return res
        .status(200)
        .json({ status: true, data: { liveSession: updatedSession } });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to join debate session",
      });
    }
  },

  async joinRoom(req, res) {
    return controller.join(req, res);
  },

  async updateRoomVisibility(req, res) {
    try {
      const session = await updateSessionVisibility({
        sessionId: req.params.sessionId || req.body.sessionId || req.body.session_id,
        visibility: req.body.visibility,
        req,
      });
      const normalized = await getSession(session.sessionId);
      return res.status(200).json({ status: true, data: normalized });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to update debate visibility",
      });
    }
  },

  async startRoom(req, res) {
    try {
      const sessionId = req.body.sessionId || req.body.session_id;
      const candidate = getCandidate(req.body);
      const liveSession = await getSession(sessionId);

      if (!liveSession) {
        return res
          .status(404)
          .json({ status: false, message: "Debate session not found" });
      }

      if (
        String(liveSession.hostCandidateId) !== String(candidate.candidate_id)
      ) {
        return res.status(403).json({
          status: false,
          message: "Only the host can start the debate.",
        });
      }

      const data = await callPython({
        method: "post",
        path: "/debate/room/start",
        data: { session_id: sessionId },
      });

      const teams = mapRoomTeams(data);
      console.log("teams:", JSON.stringify(teams, null, 2));
      console.log("Map teams:", JSON.stringify(mapRoomTeams(data), null, 2));
      const startingTeamKey = Math.random() < 0.5 ? "A" : "B";
      const startingTeam = teams[startingTeamKey] || [];
      const firstSpeaker =
        startingTeam
          .filter((p) => !p.isAi)
          .sort((a, b) => (a.teamOrder || 0) - (b.teamOrder || 0))[0] || null;

      // Fallback to Team A if chosen team has no humans
      const resolvedFirstSpeaker =
        firstSpeaker ||
        (teams["A"] || [])
          .filter((p) => !p.isAi)
          .sort((a, b) => (a.teamOrder || 0) - (b.teamOrder || 0))[0] ||
        null;
      const resolvedTeam = resolvedFirstSpeaker
        ? teams["A"].find((p) => p.id === resolvedFirstSpeaker.id)
          ? "A"
          : "B"
        : "A";

      // Build AI greeting that names the first speaker
      const basePythonGreeting = data.ai_opening || "";
      const firstSpeakerName = resolvedFirstSpeaker?.name || "first speaker";
      const greetingWithSpeaker = basePythonGreeting
        ? `${basePythonGreeting} ${firstSpeakerName} from Team ${resolvedTeam}, you have the floor first.`
        : `Welcome everyone! The debate on "${liveSession.topic || "today's topic"}" is now starting. ${firstSpeakerName} from Team ${resolvedTeam}, you have the floor first. State your opening argument.`;

      const updatedSession = await startRoomSession({
        sessionId,
        teams,
        aiOpening: greetingWithSpeaker,
        firstSpeakerId: resolvedFirstSpeaker?.id || null,
        firstSpeakerTeam: resolvedTeam,
        metadata: {
          ...(liveSession.metadata || {}),
          ...data,
          hasAiStudent: Boolean(data.has_ai_student),
          firstSpeakerId: resolvedFirstSpeaker?.id || null,
          firstSpeakerTeam: resolvedTeam,
        },
      });

      return res.status(200).json({
        status: true,
        data: {
          ...data,
          firstSpeakerId: resolvedFirstSpeaker?.id || null,
          firstSpeakerTeam: resolvedTeam,
          aiGreeting: greetingWithSpeaker,
          liveSession: updatedSession,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to start debate room",
      });
    }
  },

  async submitRoomTurn(req, res) {
    try {
      const sessionId = req.body.sessionId || req.body.session_id;
      const candidate = getCandidate(req.body);
      console.log(`${JSON.stringify(req.body)} submitted a turn in session ${sessionId}:`, req.body.message);
      const liveSession = await getSession(sessionId);
      if (!liveSession) {
        return res
          .status(404)
          .json({ status: false, message: "Debate session not found" });
      }

      const team =
        normalizeTeamKey(req.body.team) ||
        normalizeTeamKey(req.body.role) ||
        normalizeTeamKey(
          liveSession.participants.find(
            (participant) =>
              String(participant.id) === String(candidate.candidate_id),
          )?.team,
        );

      if (!team) {
        return res.status(400).json({
          status: false,
          message: "Participant team is not assigned yet.",
        });
      }

      const currentRound = liveSession.currentRound || {};
      const activeTeam = normalizeTeamKey(currentRound.activeTeam) || "A";
      const currentSpeakerId = String(currentRound.currentSpeakerId || "");
      const submittingUserId = String(candidate.candidate_id);

      // CRITICAL: Only exact speaker ID match can submit when the server has one.
      if (currentSpeakerId && currentSpeakerId !== submittingUserId) {
        return res.status(409).json({
          status: false,
          message: `It is not your turn. Current speaker: ${currentSpeakerId}, You: ${submittingUserId}`,
        });
      }

      if (!currentSpeakerId && activeTeam && activeTeam !== team) {
        return res.status(409).json({
          status: false,
          message: `It is Team ${activeTeam}'s turn right now.`,
        });
      }

      // Wrap Python respond in try/catch so a 500 (e.g. Qdrant timeout,
      // OpenAI error) does NOT abort the turn. The message is always saved
      // and the next speaker is always picked — Python failure surfaces as a
      // visible warning, not a frozen turn.
      let pythonRespond = null;
      let pythonRespondWarning = null;
      try {
        pythonRespond = await callPython({
          method: "post",
          path: "/debate/room/respond",
          data: {
            session_id: sessionId,
            candidate_id: candidate.candidate_id,
            message: req.body.message,
          },
        });
      } catch (pythonErr) {
        pythonRespondWarning =
          pythonErr?.message || "AI moderation temporarily unavailable.";
        console.warn(
          "[DEBATE] Python respond failed (non-fatal):",
          pythonRespondWarning,
        );
      }
      console.log(pythonRespond);
      const nextTurnCandidateId =
        pythonRespond?.current_turn_candidate_id || "";
      const isNextTurnAiParticipant =
        String(nextTurnCandidateId).startsWith("__ai_student__");
      const roomParticipants = liveSession?.participants || [];
      const submittedSpeaker = resolveRoomParticipant(
        roomParticipants,
        currentSpeakerId || submittingUserId,
        {
          name: candidate.candidate_name,
          team,
        },
      );
      const pythonNextSpeaker = resolveRoomParticipant(
        roomParticipants,
        nextTurnCandidateId,
      );

      console.log("[TURN-TRACE][BACKEND] Python submit response", {
        sessionId,
        submittedById: submittingUserId,
        submittedByName: candidate.candidate_name,
        currentSpeakerId: submittedSpeaker?.id || currentSpeakerId || null,
        currentSpeakerName: submittedSpeaker?.name || null,
        currentSpeakerTeam: submittedSpeaker?.team || team || null,
        nextSpeakerIdFromPython: nextTurnCandidateId || null,
        nextSpeakerNameFromPython: pythonNextSpeaker?.name || null,
        nextSpeakerTeamFromPython: pythonNextSpeaker?.team || null,
        isAiParticipant: isNextTurnAiParticipant,
        responseCurrentTurnCandidateId:
          pythonRespond?.current_turn_candidate_id || null,
      });
      const pythonRoom = await callPython({
        path: `/debate/room/${encodeURIComponent(sessionId)}`,
      }).catch(() => null);
      const warnings = normalizeRoomWarnings(pythonRoom, {
        ...pythonRespond,
        candidate_id: candidate.candidate_id,
      });

      // Wrap saveRoomRoundSubmission so a Mongoose validation error (e.g. the
      // [String] cast error when Python returns warning objects) never aborts the
      // turn. The turn message is always saved and the next speaker always advances.
      let updatedAfterTurn;
      let saveWarning = null;
      try {
        updatedAfterTurn = await saveRoomRoundSubmission({
          sessionId,
          candidateId: candidate.candidate_id,
          candidateName: candidate.candidate_name,
          team,
          message: req.body.message,
          roundNumber: currentRound.roundNumber || 1,
          metadata: pythonRespond,
          warnings,
        });
      } catch (saveErr) {
        // Log for debugging but continue — fetch the latest session state so
        // we can still advance to the next speaker
        console.warn(
          "[DEBATE] saveRoomRoundSubmission failed (non-fatal):",
          saveErr?.message,
        );
        saveWarning = saveErr?.message || "Session save partially failed.";
        updatedAfterTurn = await getSession(sessionId).catch(() => null);
      }

      const remainingTeamsForFallback = updatedAfterTurn?.currentRound?.awaitingTeams || [];
      const fallbackTeam =
        remainingTeamsForFallback[0] || normalizeTeamKey(activeTeam) || "A";
      const fallbackSpeaker = pickNextSpeaker(updatedAfterTurn, fallbackTeam);
      const fallbackSpeakerId = fallbackSpeaker?.id || null;
      const resolvedNextSpeakerId = nextTurnCandidateId || fallbackSpeakerId;
      const resolvedNextSpeaker = resolveRoomParticipant(
        updatedAfterTurn?.participants || roomParticipants,
        resolvedNextSpeakerId,
        {
          name: fallbackSpeaker?.name,
          team: fallbackSpeaker?.team || fallbackTeam,
        },
      );

      console.log("[TURN-TRACE][BACKEND] Resolved next speaker", {
        sessionId,
        currentSpeakerId: submittedSpeaker?.id || currentSpeakerId || null,
        currentSpeakerName: submittedSpeaker?.name || null,
        nextSpeakerId: resolvedNextSpeakerId || null,
        nextSpeakerName: resolvedNextSpeaker?.name || null,
        nextSpeakerTeam: resolvedNextSpeaker?.team || null,
        source: nextTurnCandidateId ? "python" : "fallback",
        isAiParticipant: isNextTurnAiParticipant,
      });

      if (isNextTurnAiParticipant) {
        let aiPayload = null;
        let aiStudentWarning = null;

        console.log("[AI-STUDENT] Calling API - Python returned AI participant indicator");

        try {
          aiPayload = await callPython({
            method: "post",
            path: "/debate/room/ai-student",
            data: { session_id: sessionId },
          });
        } catch (aiErr) {
          aiStudentWarning =
            aiErr?.message || "AI student response temporarily unavailable.";
          console.warn("[AI-STUDENT] API call failed:", aiStudentWarning);
        }

        const aiResponse =
          aiPayload?.response ||
          aiPayload?.ai_response ||
          aiPayload?.message ||
          aiStudentWarning ||
          "AI student response unavailable.";
        const nextSpeakerAfterAi =
          aiPayload?.current_turn_candidate_id || fallbackSpeakerId;
        const aiStudentSpeaker = resolveRoomParticipant(
          updatedAfterTurn?.participants || roomParticipants,
          "__ai_student__",
          { name: aiPayload?.ai_student_name || "AI Student" },
        );
        const nextSpeakerAfterAiParticipant = resolveRoomParticipant(
          updatedAfterTurn?.participants || roomParticipants,
          nextSpeakerAfterAi,
          {
            name: fallbackSpeaker?.name,
            team: fallbackSpeaker?.team || fallbackTeam,
          },
        );

        console.log("[TURN-TRACE][BACKEND] AI student API response", {
          sessionId,
          aiSpeakerId: aiStudentSpeaker?.id || "__ai_student__",
          aiSpeakerName: aiStudentSpeaker?.name || "AI Student",
          aiSpeakerTeam:
            aiStudentSpeaker?.team || aiPayload?.ai_student_team || null,
          nextSpeakerIdAfterAi: nextSpeakerAfterAi || null,
          nextSpeakerNameAfterAi: nextSpeakerAfterAiParticipant?.name || null,
          nextSpeakerTeamAfterAi: nextSpeakerAfterAiParticipant?.team || null,
          aiResponseLength: String(aiResponse || "").length,
          aiPayloadCurrentTurnCandidateId:
            aiPayload?.current_turn_candidate_id || null,
        });

        const finalSession = await saveRoomAiStudentResponse({
          sessionId,
          message: aiResponse,
          roundNumber: currentRound.roundNumber || 1,
          metadata: aiPayload || { warning: aiStudentWarning },
          nextSpeakerAfterAi,
        });

        return res.status(200).json({
          status: true,
          data: {
            ...(pythonRespond || {}),
            success: Boolean(aiPayload?.success !== false && aiResponse),
            session_id: sessionId,
            warnings,
            pythonWarning: pythonRespondWarning || saveWarning || aiStudentWarning || null,
            current_turn_candidate_id: nextTurnCandidateId,
            currentSpeakerId: submittedSpeaker?.id || currentSpeakerId || null,
            currentSpeakerName: submittedSpeaker?.name || null,
            nextSpeakerId: "__ai_student__",
            nextSpeakerName: aiStudentSpeaker?.name || "AI Student",
            next_speaker_is_ai: true,
            aiResponse,
            ai_speaking_id: "__ai_student__",
            aiStudent: aiPayload,
            nextSpeakerAfterAi,
            nextSpeakerAfterAiName: nextSpeakerAfterAiParticipant?.name || null,
            waitingForAi: false,
            liveSession: finalSession,
          },
        });
      }

      const nextParticipant = (updatedAfterTurn?.participants || []).find(
        (participant) => String(participant.id) === String(resolvedNextSpeakerId),
      );
      const nextTeam =
        normalizeTeamKey(nextParticipant?.team) ||
        normalizeTeamKey(fallbackSpeaker?.team) ||
        fallbackTeam;

      const finalSession = await updateRoomState(sessionId, {
        status: "active",
        currentRound: {
          ...(updatedAfterTurn?.currentRound || {}),
          phase: "team_turn",
          activeTeam: nextTeam,
          currentSpeakerId: resolvedNextSpeakerId,
          aiStudentPendingNextSpeakerId: null,
        },
      });

      return res.status(200).json({
        status: true,
        data: {
          ...(pythonRespond || {}),
          success: true,
          session_id: sessionId,
          warnings,
          pythonWarning: pythonRespondWarning || saveWarning || null,
          current_turn_candidate_id: resolvedNextSpeakerId,
          currentSpeakerId: submittedSpeaker?.id || currentSpeakerId || null,
          currentSpeakerName: submittedSpeaker?.name || null,
          nextSpeakerId: resolvedNextSpeakerId,
          nextSpeakerName: resolvedNextSpeaker?.name || null,
          next_speaker_is_ai: false,
          aiResponse: null,
          ai_speaking_id: null,
          nextSpeakerAfterAi: null,
          waitingForAi: false,
          liveSession: finalSession,
        },
      });

    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to submit debate turn",
      });
    }
  },
  async completeRoomOpening(req, res) {
    try {
      const sessionId = req.body.sessionId || req.body.session_id;
      const candidate = getCandidate(req.body);
      const liveSession = await getSession(sessionId);

      if (!liveSession) {
        return res
          .status(404)
          .json({ status: false, message: "Debate session not found" });
      }

      const isHost =
        String(liveSession.hostCandidateId) === String(candidate.candidate_id);
      const isAssignedSpeaker =
        liveSession.currentRound?.currentSpeakerId &&
        String(liveSession.currentRound.currentSpeakerId) ===
          String(candidate.candidate_id);

      if (!isHost && !isAssignedSpeaker) {
        return res.status(403).json({
          status: false,
          message:
            "Only the host or assigned first speaker can complete the opening.",
        });
      }

      if (liveSession.status !== "active") {
        return res.status(409).json({
          status: false,
          message: "Debate room is not active.",
        });
      }

      if (liveSession.currentRound?.phase !== "ai_opening") {
        return res.status(200).json({
          status: true,
          data: { liveSession },
        });
      }

      const updatedSession = await updateRoomState(sessionId, {
        currentRound: {
          ...(liveSession.currentRound || {}),
          phase: "team_turn",
        },
      });

      return res.status(200).json({
        status: true,
        data: { liveSession: updatedSession },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to complete debate opening",
      });
    }
  },
  async completeAiStudentTurn(req, res) {
    try {
      const sessionId = req.body.sessionId || req.body.session_id;
      const requestedNextSpeakerId =
        req.body.nextSpeakerId ||
        req.body.next_speaker_id ||
        req.body.current_turn_candidate_id ||
        null;

      if (!sessionId) {
        return res.status(400).json({
          status: false,
          message: "sessionId is required",
        });
      }

      const liveSession = await getSession(sessionId);
      if (!liveSession) {
        return res
          .status(404)
          .json({ status: false, message: "Debate session not found" });
      }

      const currentRound = liveSession.currentRound || {};
      if (String(currentRound.currentSpeakerId || "") !== "__ai_student__") {
        const currentParticipant = resolveRoomParticipant(
          liveSession.participants || [],
          currentRound.currentSpeakerId,
        );
        console.log("[TURN-TRACE][BACKEND] AI student complete skipped", {
          sessionId,
          currentSpeakerId: currentParticipant?.id || currentRound.currentSpeakerId || null,
          currentSpeakerName: currentParticipant?.name || null,
          requestedNextSpeakerId: requestedNextSpeakerId || null,
        });
        return res.status(200).json({
          status: true,
          data: { liveSession },
        });
      }

      const nextSpeakerId =
        requestedNextSpeakerId || currentRound.aiStudentPendingNextSpeakerId || null;
      const aiStudentSpeaker = resolveRoomParticipant(
        liveSession.participants || [],
        "__ai_student__",
        { name: "AI Student", team: currentRound.activeTeam },
      );
      const nextParticipant = (liveSession.participants || []).find(
        (participant) => String(participant.id) === String(nextSpeakerId),
      );
      const nextSpeaker = resolveRoomParticipant(
        liveSession.participants || [],
        nextSpeakerId,
      );
      const nextTeam =
        normalizeTeamKey(nextParticipant?.team) ||
        normalizeTeamKey(currentRound.activeTeam) ||
        "A";

      console.log("[TURN-TRACE][BACKEND] AI student complete", {
        sessionId,
        currentSpeakerId: aiStudentSpeaker?.id || "__ai_student__",
        currentSpeakerName: aiStudentSpeaker?.name || "AI Student",
        currentSpeakerTeam: aiStudentSpeaker?.team || currentRound.activeTeam || null,
        nextSpeakerId: nextSpeakerId || null,
        nextSpeakerName: nextSpeaker?.name || null,
        nextSpeakerTeam: nextSpeaker?.team || nextTeam,
        requestedNextSpeakerId: requestedNextSpeakerId || null,
        pendingNextSpeakerId: currentRound.aiStudentPendingNextSpeakerId || null,
      });

      const updatedSession = await updateRoomState(sessionId, {
        status: "active",
        currentRound: {
          ...currentRound,
          phase: "team_turn",
          activeTeam: nextTeam,
          currentSpeakerId: nextSpeakerId,
          aiStudentPendingNextSpeakerId: null,
        },
      });

      return res.status(200).json({
        status: true,
        data: {
          liveSession: updatedSession,
          nextSpeakerId,
          nextSpeakerName: nextSpeaker?.name || null,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to complete AI student turn",
      });
    }
  },
  async getLivekitToken(req, res) {
    try {
      const sessionId = req.body.sessionId || req.body.session_id;
      const candidateId = req.body.candidateId || req.body.candidate_id;
      const candidateName =
        req.body.candidateName || req.body.candidate_name || "Participant";

      if (!sessionId || !candidateId) {
        return res.status(400).json({
          status: false,
          message: "sessionId and candidateId are required",
        });
      }

      const liveSession = await getSession(sessionId);
      if (!liveSession) {
        return res
          .status(404)
          .json({ status: false, message: "Session not found" });
      }

      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;

      if (!apiKey || !apiSecret) {
        return res.status(500).json({
          status: false,
          message: "Livekit is not configured on the server",
        });
      }

      const { AccessToken } = require("livekit-server-sdk");
      const token = new AccessToken(apiKey, apiSecret, {
        identity: String(candidateId),
        name: candidateName,
        ttl: "4h",
      });

      token.addGrant({
        roomJoin: true,
        room: sessionId,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const jwt = await token.toJwt();

      return res.status(200).json({
        status: true,
        data: {
          token: jwt,
          livekitUrl: process.env.LIVEKIT_URL,
          room: sessionId,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message || "Failed to generate Livekit token",
      });
    }
  },
  async end(req, res) {
    try {
      const sessionId = req.body.sessionId || req.body.session_id;
      const liveSession = await getSession(sessionId);
      if (isTeamDebateRequest(req.body, liveSession)) {
        return controller.endRoom(req, res);
      }

      const data = await callPython({
        method: "post",
        path: "/debate/end",
        data: {
          session_id: sessionId,
        },
      });

      await saveFeedback(sessionId, data, data);
      const updatedSession = await completeSession(sessionId);
      if (req.studentUser?._id) {
        await recordProgress({
          userId: req.studentUser._id,
          activityType: "debate",
          subjectGroupKey: liveSession?.subjectGroupKey || null,
          unitId: liveSession?.unitId || null,
          status: "completed",
          progressPercent: 100,
          score: updatedSession?.scores?.overall || updatedSession?.scores?.student || null,
          timeSpentMinutes: 15,
          metadata: {
            title: liveSession?.topic || "Debate",
            subject: liveSession?.subject,
            sessionId,
            result: data,
          },
        }).catch(() => null);
      }
      return res
        .status(200)
        .json({ status: true, data: { ...data, liveSession: updatedSession } });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to end debate",
      });
    }
  },

  async endRoom(req, res) {
    try {
      const sessionId = req.body.sessionId || req.body.session_id;
      await updateRoomState(sessionId, { status: "ending" });
      const data = await callPython({
        method: "post",
        path: "/debate/room/end",
        data: { session_id: sessionId },
      });

      await saveFeedback(sessionId, data, data);
      const updatedSession = await completeSession(sessionId, {
        results: data,
        teams: normalizeTeams(data.teams || {}),
      });
      const liveSession = await getSession(sessionId);
      if (req.studentUser?._id) {
        await recordProgress({
          userId: req.studentUser._id,
          activityType: "debate",
          subjectGroupKey: liveSession?.subjectGroupKey || null,
          unitId: liveSession?.unitId || null,
          status: "completed",
          progressPercent: 100,
          score: updatedSession?.scores?.overall || updatedSession?.scores?.student || null,
          timeSpentMinutes: 20,
          metadata: {
            title: liveSession?.topic || "Team debate",
            subject: liveSession?.subject,
            sessionId,
            result: data,
          },
        }).catch(() => null);
      }
      return res.status(200).json({
        status: true,
        data: {
          ...data,
          liveSession: updatedSession,
        },
      });
    } catch (error) {
      const sessionId = req.body.sessionId || req.body.session_id;
      if (sessionId) {
        await updateRoomState(sessionId, { status: "end_error" }).catch(
          () => null,
        );
      }
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to end debate room",
      });
    }
  },

  async retryEndRoom(req, res) {
    return controller.endRoom(req, res);
  },

  async getSession(req, res) {
    try {
      await assertSessionAccess(req.params.sessionId, req);
      const liveSession = await getSession(req.params.sessionId);
      if (liveSession?.debateType === "team") {
        const snapshot = await fetchRoomState(req.params.sessionId);
        return res.status(200).json({ status: true, data: snapshot });
      }

      const [pythonSession, storedSession] = await Promise.all([
        callPython({
          path: `/debate/session/${encodeURIComponent(req.params.sessionId)}`,
        }).catch(() => null),
        getSession(req.params.sessionId),
      ]);

      return res.status(200).json({
        status: true,
        data: { ...(pythonSession || {}), liveSession: storedSession },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch debate session",
      });
    }
  },

  async getRoom(req, res) {
    try {
      await assertSessionAccess(req.params.sessionId, req);
      const snapshot = await fetchRoomState(req.params.sessionId);
      return res.status(200).json({ status: true, data: snapshot });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch debate room",
      });
    }
  },

  async getHistory(req, res) {
    try {
      const data = await callPython({
        path: `/debate/history/${encodeURIComponent(req.query.candidateId || req.query.candidate_id)}`,
        params: {
          subject: req.query.subject,
        },
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch debate history",
      });
    }
  },

  async getRecommendations(req, res) {
    try {
      const data = await callPython({
        path: `/debate/recommendations/${encodeURIComponent(req.params.sessionId)}`,
      });

      return res.status(200).json({ status: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to fetch debate recommendations",
      });
    }
  },

  async getTopics(req, res) {
    try {
      const filters = {
        subjectGroupKey: req.query.subjectGroupKey,
        subject: req.query.subject,
        unitNumber: req.query.unitNumber,
        sectionTitle: req.query.sectionTitle,
      };
      const hierarchy = await getDebateTopicHierarchy({
        ...filters,
      });
      const hasCatalogTopics = (hierarchy.units || []).some((unit) =>
        (unit.sections || []).some(
          (section) => (section.debate_topics || []).length > 0,
        ),
      );

      let resolvedHierarchy = hierarchy;

      if (
        !hasCatalogTopics &&
        (filters.subjectGroupKey ||
          filters.subject ||
          filters.unitNumber !== undefined ||
          filters.sectionTitle)
      ) {
        try {
          const unit = await resolveSubjectUnit({
            subjectGroupKey: filters.subjectGroupKey,
            subject: filters.subject,
            unitNumber: filters.unitNumber,
          });
          const fallbackHierarchy = buildDebateTopicHierarchyForUnit(
            unit,
            filters,
          );
          if (fallbackHierarchy?.units?.length) {
            resolvedHierarchy = fallbackHierarchy;
          }
        } catch {
          // Leave the catalog result in place when the textbook fallback cannot be resolved.
        }
      }

      if (req.query.flat === "true") {
        const data = flattenTopicHierarchy(resolvedHierarchy);

        return res.status(200).json({ status: true, data });
      }

      return res.status(200).json({ status: true, data: resolvedHierarchy });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message || "Failed to fetch debate topics",
      });
    }
  },

  async invite(req, res) {
    try {
      const emails = Array.isArray(req.body.emails)
        ? req.body.emails
        : String(req.body.emails || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

      if (!emails.length) {
        return res.status(400).json({
          status: false,
          message: "At least one email address is required",
        });
      }

      const invite = getDebateInviteEmail({
        senderName: req.body.senderName,
        debateTopic: req.body.topic,
        debateType: req.body.debateType,
        joinUrl:
          req.body.joinUrl ||
          process.env.APP_URL ||
          process.env.ADMIN_APP_URL ||
          "",
      });

      await Promise.all(
        emails.map((email) =>
          sendEmail({
            to: email,
            subject: invite.subject,
            text: invite.text,
            html: invite.html,
          }),
        ),
      );

      return res.status(200).json({
        status: true,
        data: {
          sent: emails.length,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Failed to send debate invites",
      });
    }
  },
};

module.exports = controller;

// async startRoom(req, res) {
//   try {
//     const sessionId = req.body.sessionId || req.body.session_id;
//     const candidate = getCandidate(req.body);
//     const liveSession = await getSession(sessionId);

//     if (!liveSession) {
//       return res.status(404).json({ status: false, message: "Debate session not found" });
//     }

//     if (String(liveSession.hostCandidateId) !== String(candidate.candidate_id)) {
//       return res.status(403).json({
//         status: false,
//         message: "Only the host can start the debate.",
//       });
//     }

//     const data = await callPython({
//       method: "post",
//       path: "/debate/room/start",
//       data: { session_id: sessionId },
//     });

//     const teams = ensureBalancedTeamsForRoom(mapRoomTeams(data), liveSession);
//     const updatedSession = await startRoomSession({
//       sessionId,
//       teams,
//       aiOpening: data.ai_opening,
//       metadata: {
//         ...(liveSession.metadata || {}),
//         ...data,
//         hasAiStudent: Boolean(data.has_ai_student),
//       },
//     });

//     return res.status(200).json({
//       status: true,
//       data: {
//         ...data,
//         liveSession: updatedSession,
//       },
//     });
//   } catch (error) {
//     return res.status(error.statusCode || 500).json({
//       status: false,
//       message: error.message || "Failed to start debate room",
//     });
//   }
// },
