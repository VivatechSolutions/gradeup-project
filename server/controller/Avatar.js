const { callPython } = require("../services/pythonGateway");
const SubjectUnit = require("../model/SubjectUnit");
const {
  resolveSubjectUnit,
  getPythonLearningContext,
} = require("../services/learningContextService");
const { normalizeTerm } = require("../utils/subjectIdentity");

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function exactText(value) {
  const text = cleanText(value);
  return text ? new RegExp(`^${escapeRegExp(text)}$`, "i") : null;
}

function normalizeSectionValue(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/^[\s.:#-]*\d+(?:\.\d+)*[\s.:#-]+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function classNumberVariants(value) {
  const raw = cleanText(value);
  if (!raw) return [];
  const number = raw.match(/\d+/)?.[0] || raw;
  const padded = /^\d$/.test(number) ? `0${number}` : number;
  return [...new Set([raw, number, padded, `Class ${Number(number) || number}`, `Class ${padded}`])].filter(Boolean);
}

function getSegments(payload) {
  const segments =
    payload?.avatar_explanation?.segments ||
    payload?.remaining_segments ||
    payload?.segments ||
    [];
  return Array.isArray(segments) ? segments : [];
}

function sectionIdCandidates(section = {}) {
  return [
    section?.id,
    section?.section_id,
    section?.sectionId,
    section?.number,
    section?.sectionNumber,
  ].map(cleanText).filter(Boolean);
}

function sectionTitleCandidates(section = {}) {
  return [
    section?.section_title,
    section?.sectionTitle,
    section?.title,
    section?.heading,
    section?.label,
  ].map(cleanText).filter(Boolean);
}

function getSectionAvatarExplanation(section = {}) {
  const enrichment = section?.section_enrichment || section?.enrichment || section;
  const explanation = enrichment?.avatar_explanation;
  return Array.isArray(explanation?.segments) && explanation.segments.length
    ? explanation
    : null;
}

function describeMatchedSection(section = {}, matchType = "") {
  return {
    match_type: matchType,
    id: cleanText(section?.id || section?.section_id || section?.sectionId) || null,
    type: cleanText(section?.type || section?.kind || section?.section_type) || null,
    title:
      cleanText(
        section?.section_title ||
          section?.sectionTitle ||
          section?.title ||
          section?.heading ||
          section?.label,
      ) || null,
  };
}

function findAvatarExplanationForSection(enrichedData, sectionTitle, sectionId = "") {
  const target = normalizeSectionValue(sectionTitle);
  const targetId = cleanText(sectionId);
  if (!enrichedData || (!target && !targetId)) return null;

  const units = Array.isArray(enrichedData?.units)
    ? enrichedData.units
    : Array.isArray(enrichedData)
      ? enrichedData
      : [enrichedData];

  const sectionMatches = [];
  for (const unit of units) {
    const sections = Array.isArray(unit?.sections) ? unit.sections : [];
    for (const section of sections) {
      const sectionType = normalizeSectionValue(section?.type || section?.kind || section?.section_type);
      if (sectionType && sectionType !== "section") continue;

      const explanation = getSectionAvatarExplanation(section);
      if (!explanation) continue;

      const ids = sectionIdCandidates(section);
      const titles = sectionTitleCandidates(section);
      const normalizedTitles = titles.map(normalizeSectionValue).filter(Boolean);
      sectionMatches.push({ section, explanation, ids, titles, normalizedTitles });
    }
  }

  if (targetId) {
    const idMatch = sectionMatches.find(({ ids }) =>
      ids.some((candidate) => candidate.toLowerCase() === targetId.toLowerCase()),
    );
    if (idMatch) {
      return {
        explanation: idMatch.explanation,
        matched_section: describeMatchedSection(idMatch.section, "exact_id"),
      };
    }
  }

  if (target) {
    const exactMatch = sectionMatches.find(({ normalizedTitles }) =>
      normalizedTitles.some((candidate) => candidate === target),
    );
    if (exactMatch) {
      return {
        explanation: exactMatch.explanation,
        matched_section: describeMatchedSection(exactMatch.section, "exact_title"),
      };
    }

    const fallbackMatches = sectionMatches
      .filter(({ normalizedTitles }) =>
        normalizedTitles.some((candidate) => candidate.includes(target)),
      )
      .sort((left, right) => {
        const leftLength = Math.min(...left.normalizedTitles.map((title) => title.length));
        const rightLength = Math.min(...right.normalizedTitles.map((title) => title.length));
        return leftLength - rightLength;
      });

    if (fallbackMatches.length) {
      const fallbackMatch = fallbackMatches[0];
      return {
        explanation: fallbackMatch.explanation,
        matched_section: describeMatchedSection(fallbackMatch.section, "fallback_contains_requested_title"),
      };
    }
  }

  return { explanation: null, matched_section: null };
}

async function resolveAvatarUnitFromBody(source = {}) {
  const query = { "processing.status": { $ne: "failed" } };
  const board = exactText(source.board);
  const subject = exactText(source.subject);
  const unitNumber = source.unit_number ?? source.unitNumber;
  const unitName = cleanText(source.unit_name || source.unitName);
  const term = Object.prototype.hasOwnProperty.call(source, "term")
    ? normalizeTerm(source.term)
    : undefined;
  const classNumber = source.class_number || source.classNumber || source.standard || source.class;
  const standardVariants = classNumberVariants(classNumber);

  if (board) query.board = board;
  if (subject) query.subject = subject;
  if (standardVariants.length) {
    query.standard = { $in: standardVariants.map((item) => new RegExp(`^${escapeRegExp(item)}$`, "i")) };
  }
  if (term !== undefined) {
    query.term = term ? new RegExp(`^${escapeRegExp(term)}$`, "i") : null;
  }
  if (unitNumber !== undefined && unitNumber !== null && unitNumber !== "") {
    query.unitNumber = Number(unitNumber);
  }
  if (unitName) {
    query.$or = [
      { unitTitle: new RegExp(`^${escapeRegExp(unitName)}$`, "i") },
      { chapterName: new RegExp(`^${escapeRegExp(unitName)}$`, "i") },
      { unitLabel: new RegExp(`^${escapeRegExp(unitName)}$`, "i") },
    ];
  }

  const hasBodyLookup =
    board || subject || standardVariants.length || term !== undefined || query.unitNumber !== undefined || unitName;
  if (hasBodyLookup) {
    const unit = await SubjectUnit.findOne(query).sort({ updatedAt: -1 });
    if (unit) return unit;
  }

  return resolveSubjectUnit({
    unitId: source.unitId || source.subjectUnitId,
    documentId: source.documentId,
    subjectGroupKey: source.subjectGroupKey,
    unitNumber: source.unitNumber || source.unit_number,
    subject: source.subject,
    unitTitle: source.unitTitle || source.unitName || source.unit_name,
  });
}

function buildFlashcardRequests(segments = []) {
  return segments
    .filter((segment) => String(segment?.type || "").toLowerCase() === "flashcard")
    .map((segment) => {
      const flashcardId = cleanText(segment.flashcard_id || segment.flashcardId || segment.segment_id);
      const segmentId = cleanText(segment.segment_id || segment.segmentId || flashcardId);
      return {
        flashcard_id: flashcardId,
        flashcard_type:
          segment.flashcard_type ||
          segment.flashcardType ||
          (segment.question || segment.options ? "mcq" : "informative"),
        segment_id: segmentId,
      };
    })
    .filter((card) => card.flashcard_id && card.segment_id);
}

function mergeGeneratedFlashcards(segments = [], flashcardResponse = {}) {
  const cards = Array.isArray(flashcardResponse?.flash_cards)
    ? flashcardResponse.flash_cards
    : [];
  if (!cards.length) return segments;

  const byFlashcardId = new Map();
  const bySegmentId = new Map();
  cards.forEach((card) => {
    const flashcardId = cleanText(card.flashcard_id || card.flashcardId);
    const segmentId = cleanText(card.segment_id || card.segmentId);
    if (flashcardId) byFlashcardId.set(flashcardId, card);
    if (segmentId) bySegmentId.set(segmentId, card);
  });

  return segments.map((segment) => {
    if (String(segment?.type || "").toLowerCase() !== "flashcard") return segment;
    const flashcardId = cleanText(segment.flashcard_id || segment.flashcardId || segment.segment_id);
    const segmentId = cleanText(segment.segment_id || segment.segmentId);
    const generated = byFlashcardId.get(flashcardId) || bySegmentId.get(segmentId);
    return generated ? { ...segment, ...generated, type: "flashcard" } : segment;
  });
}

async function resolveAvatarContext(source = {}) {
  const unit = await resolveAvatarUnitFromBody(source);

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
      const { unit, context } = await resolveAvatarContext(req.body);
      const sectionTitle = String(
        req.body.sectionTitle || req.body.section_title || "",
      ).trim();

      if (!sectionTitle) {
        return res.status(400).json({
          status: false,
          message: "Section title is required to start Genius Mode.",
        });
      }

      const avatarSectionMatch = findAvatarExplanationForSection(
        unit.enrichedData,
        sectionTitle,
        req.body.sectionId || req.body.section_id,
      );
      const avatarExplanation = avatarSectionMatch?.explanation;
      const matchedSection = avatarSectionMatch?.matched_section || null;
      const dbFilteredSegments = Array.isArray(avatarExplanation?.segments)
        ? avatarExplanation.segments
        : [];
      const pythonStartRequestBody = {
        candidate_id: req.body.candidate_id || req.body.candidateId,
        candidate_name:
          req.body.candidate_name ||
          req.body.candidateName ||
          "GradeUp Learner",
        board: req.body.board || context.board,
        class_number:
          req.body.class_number ||
          req.body.classNumber ||
          context.classNumber,
        subject: req.body.subject || context.subject,
        unit_number:
          req.body.unit_number ||
          req.body.unitNumber ||
          context.unitNumber,
        unit_name:
          req.body.unit_name ||
          req.body.unitName ||
          context.unitName,
        section_title: sectionTitle,
        segments: dbFilteredSegments.length ? dbFilteredSegments : null,
        term: req.body.term ?? unit.term ?? null,
      };

      const data = await callPython({
        method: "post",
        path: "/avatar/start",
        data: pythonStartRequestBody,
      });

      const pythonResponseSegments = getSegments(data);
      const sessionId = normalizeSessionId(data);
      const flashCards = buildFlashcardRequests(pythonResponseSegments);
      let flashcardGenerateRequestBody = null;
      let flashcardGenerateResponse = null;
      let flashcardGenerateError = null;
      let mergedSegments = pythonResponseSegments;

      if (sessionId && flashCards.length) {
        flashcardGenerateRequestBody = {
          session_id: sessionId,
          flash_cards: flashCards,
        };
        try {
          flashcardGenerateResponse = await callPython({
            method: "post",
            path: "/avatar/flashcard/generate",
            data: flashcardGenerateRequestBody,
          });
          mergedSegments = mergeGeneratedFlashcards(
            pythonResponseSegments,
            flashcardGenerateResponse,
          );
        } catch (flashcardError) {
          flashcardGenerateError = {
            message:
              flashcardError.message ||
              "Failed to generate avatar flashcards after start.",
            details: flashcardError.details || null,
          };
        }
      }

      const finalData = {
        ...data,
        avatar_explanation: {
          ...(data?.avatar_explanation || {}),
          ...(avatarExplanation?.teaching_style && !data?.avatar_explanation?.teaching_style
            ? { teaching_style: avatarExplanation.teaching_style }
            : {}),
          ...(avatarExplanation?.total_duration_estimate &&
          !data?.avatar_explanation?.total_duration_estimate
            ? {
                total_duration_estimate:
                  avatarExplanation.total_duration_estimate,
              }
            : {}),
          segments: mergedSegments,
        },
        avatar_debug: {
          frontend_request_body: req.body,
          db_lookup: {
            unit_id: String(unit._id),
            document_id: unit.documentId,
            board: unit.board,
            class_number: unit.standard,
            subject: unit.subject,
            term: unit.term || null,
            unit_number: unit.unitNumber || null,
            unit_name: unit.unitTitle || unit.chapterName || unit.unitLabel,
            section_title: sectionTitle,
            matched_section: matchedSection,
          },
          db_matched_section: matchedSection,
          db_filtered_segments: dbFilteredSegments,
          python_start_request_body: pythonStartRequestBody,
          python_response_segments: pythonResponseSegments,
          flashcard_generate_request_body: flashcardGenerateRequestBody,
          flashcard_generate_response: flashcardGenerateResponse,
          flashcard_generate_error: flashcardGenerateError,
          merged_segments: mergedSegments,
        },
      };
      console.log(
        "Avatar Start frontend_request_body:",
        JSON.stringify(finalData.avatar_debug.frontend_request_body, null, 2),
      );

      console.log(
        "Avatar Start db_lookup:",
        JSON.stringify(finalData.avatar_debug.db_lookup, null, 2),
      );
      console.log(
        "Avatar Start db_filtered_segments:",
        JSON.stringify(finalData.avatar_debug.db_filtered_segments, null, 2),
      );

    console.log(
        "Avatar Start python_response_segments:",
        JSON.stringify(finalData.avatar_debug.python_response_segments, null, 2),
      );
      return res.status(200).json({ status: true, data: finalData });
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
