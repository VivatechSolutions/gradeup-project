const mongoose = require("mongoose");
const SubjectUnit = require("../model/SubjectUnit");
const Unit = require("../model/Unit");
const BookContent = require("../model/BookContent");
const {
  buildSubjectTitle,
  compareSubjectIdentity,
  getSubjectIdentityKey,
  normalizePart,
  normalizeTerm,
  unitCountLabel,
} = require("../utils/subjectIdentity");

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSubjectGroupLookup(unit) {
  return unit.subjectGroupKey || getSubjectIdentityKey(unit);
}

function buildSubjectGroupKeyFilter(subjectGroupKey) {
  const key = String(subjectGroupKey || "");
  const parts = key.split("::");
  const filters = [
    { subjectGroupKey: key },
    { subjectGroupKey: key.toLowerCase() },
    {
      $expr: {
        $eq: [{ $concat: ["$board", "::", "$standard", "::", "$subject"] }, key],
      },
    },
  ];

  if (parts[0] === "subject" && parts.length >= 6) {
    const [, board, standard, rawTerm, subject, rawPart] = parts;
    filters.push({
      board: new RegExp(`^${escapeRegExp(board)}$`, "i"),
      standard: new RegExp(`^${escapeRegExp(standard)}$`, "i"),
      subject: new RegExp(`^${escapeRegExp(subject)}$`, "i"),
      term: rawTerm === "__none__" ? null : new RegExp(`^${escapeRegExp(rawTerm)}$`, "i"),
      part: rawPart === "__none__" ? null : new RegExp(`^${escapeRegExp(rawPart)}$`, "i"),
    });
  }

  return { $or: filters };
}

function normalizeAssetPath(value = "") {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) {
    return raw;
  }

  if (/^[a-z]:\\/i.test(raw)) {
    const normalized = raw.replace(/\\/g, "/");
    const uploadsIndex = normalized.toLowerCase().lastIndexOf("/uploads/");
    if (uploadsIndex >= 0) {
      return normalized.slice(uploadsIndex);
    }
    return null;
  }

  return `/${raw.replace(/^\/+/, "")}`;
}

function collectImageCandidates(...values) {
  const unique = [];
  const seen = new Set();

  const pushValue = (candidate) => {
    const normalized = normalizeAssetPath(candidate);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    unique.push(normalized);
  };

  values.forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }

    if (value && typeof value === "object") {
      pushValue(value.url);
      pushValue(value.src);
      pushValue(value.image);
      pushValue(value.imageUrl);
      pushValue(value.thumbnail);
      pushValue(value.thumbnailUrl);
      return;
    }

    pushValue(value);
  });

  return unique;
}

const TOPIC_EXCLUDE_PATTERNS = [
  /\bpoints?\s+to\s+remember\b/i,
  /\bproblems?\b/i,
  /\bdo\s+you\s+know\b/i,
  /\bactivit(y|ies)\b/i,
  /\bexercises?\b/i,
  /\bsummary\b/i,
  /\bquestion\s*bank\b/i,
  /\bpractice\s+questions?\b/i,
];

function normalizeTopicLabel(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[\-\u2022•]+\s*/, "")
    .trim();
}

function isEligibleSectionTopic(value = "") {
  const normalized = normalizeTopicLabel(value);
  if (!normalized) {
    return false;
  }

  return !TOPIC_EXCLUDE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function createTopicRecord({
  unit,
  sectionId,
  sectionNumber,
  sectionTitle,
  sectionType,
}) {
  const cleanTitle = normalizeTopicLabel(sectionTitle);
  if (!isEligibleSectionTopic(cleanTitle)) {
    return null;
  }

  const normalizedSectionNumber = normalizeTopicLabel(sectionNumber);
  const normalizedSectionType = normalizeTopicLabel(sectionType).toLowerCase() || null;
  const displayLabel = normalizedSectionNumber
    ? `${normalizedSectionNumber} ${cleanTitle}`.trim()
    : cleanTitle;

  return {
    id: sectionId || `${unit.documentId}:${displayLabel}`,
    subjectGroupKey: getSubjectGroupLookup(unit),
    subject: unit.subject,
    unitId: String(unit._id),
    unitNumber: unit.unitNumber,
    unitTitle: unit.unitTitle,
    documentId: unit.documentId,
    sectionId: sectionId || null,
    sectionNumber: normalizedSectionNumber || null,
    sectionTitle: cleanTitle,
    sectionType: normalizedSectionType,
    label: displayLabel,
  };
}

function normalizeDebateText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStoredDebateTopicItem(topic = {}, unit = {}, section = {}, index = 0) {
  const topicTitle = normalizeDebateText(
    topic.topic_title || topic.topicTitle || topic.title || topic.label,
  );

  if (!topicTitle) {
    return null;
  }

  const sectionTitle = normalizeDebateText(
    topic.section_title || topic.sectionTitle || section.section_title || section.sectionTitle,
  );
  const unitTitle = normalizeDebateText(
    topic.unit_title || topic.unitTitle || unit.unitTitle || unit.unitLabel,
  );
  const unitNumber =
    Number(topic.unit_number ?? topic.unitNumber ?? unit.unitNumber ?? section.unit_number) ||
    null;
  const topicPath = Array.isArray(topic.topic_path) && topic.topic_path.length
    ? topic.topic_path.map((value) => normalizeDebateText(value)).filter(Boolean)
    : [unit.subject, unitTitle, sectionTitle, topicTitle].filter(Boolean);

  return {
    topic_id:
      normalizeDebateText(topic.topic_id || topic.topicId) ||
      `${unit.documentId}:${unitNumber ?? "unit"}:${section.section_id || section.sectionId || sectionTitle || "section"}:${index}`,
    topic_title: topicTitle,
    topic_description:
      normalizeDebateText(topic.topic_description || topic.topicDescription) || null,
    key_concepts: Array.isArray(topic.key_concepts)
      ? topic.key_concepts.map((value) => normalizeDebateText(value)).filter(Boolean)
      : [],
    source_unit: normalizeDebateText(topic.source_unit || unitTitle) || null,
    source_section: sectionTitle || null,
    subject: normalizeDebateText(topic.subject || unit.subject) || null,
    subject_key: getSubjectGroupLookup(unit),
    unit_number: unitNumber,
    unit_title: unitTitle || null,
    section_id: normalizeDebateText(topic.section_id || topic.sectionId || section.section_id || section.sectionId) || null,
    section_title: sectionTitle || null,
    topic_path: topicPath,
  };
}

function normalizeStoredDebateSections(unit, sections = []) {
  return sections
    .map((section, sectionIndex) => {
      const sectionTitle = normalizeDebateText(section.section_title || section.sectionTitle);
      const debateTopics = Array.isArray(section.debate_topics) ? section.debate_topics : [];
      const normalizedTopics = debateTopics
        .map((topic, topicIndex) =>
          normalizeStoredDebateTopicItem(topic, unit, section, topicIndex),
        )
        .filter(Boolean);

      if (!sectionTitle || !normalizedTopics.length) {
        return null;
      }

      return {
        section_id: normalizeDebateText(section.section_id || section.sectionId) || null,
        section_title: sectionTitle,
        topics_count: Number(section.topics_count || normalizedTopics.length || 0),
        debate_topics: normalizedTopics,
        section_index: sectionIndex,
      };
    })
    .filter(Boolean);
}

function buildStoredDebateHierarchy(unit, debateTopicsData, filters = {}) {
  const payload = debateTopicsData?.debateTopics || debateTopicsData;
  const rawUnits = Array.isArray(payload?.units) ? payload.units : [];
  if (!rawUnits.length) {
    return null;
  }

  const unitNumberFilter =
    filters.unitNumber !== undefined &&
    filters.unitNumber !== null &&
    String(filters.unitNumber) !== "";
  const sectionFilter = normalizeDebateText(filters.sectionTitle).toLowerCase();

  const normalizedUnits = rawUnits
    .map((entry, index) => {
      const unitNumber =
        Number(entry.unit_number ?? entry.unitNumber ?? unit.unitNumber ?? index + 1) || null;
      const unitTitle = normalizeDebateText(entry.unit_title || entry.unitTitle || unit.unitTitle);
      const sections = normalizeStoredDebateSections(unit, entry.sections || []);
      const filteredSections = sections.filter((section) => {
        if (!sectionFilter) {
          return true;
        }
        return section.section_title.toLowerCase() === sectionFilter;
      });

      if (unitNumberFilter && Number(unitNumber) !== Number(filters.unitNumber)) {
        return null;
      }

      if (!filteredSections.length) {
        return null;
      }

      return {
        unit_number: unitNumber,
        unit_title: unitTitle || unit.unitTitle || null,
        sections: filteredSections,
      };
    })
    .filter(Boolean);

  if (!normalizedUnits.length) {
    return null;
  }

  return {
    success: true,
    generated_at: payload?.generated_at || null,
    subject: payload?.subject || unit.subject || null,
    total_topics: normalizedUnits.reduce(
      (count, currentUnit) =>
        count +
        currentUnit.sections.reduce(
          (sectionCount, section) => sectionCount + (section.debate_topics || []).length,
          0,
        ),
      0,
    ),
    total_sections: normalizedUnits.reduce(
      (count, currentUnit) => count + currentUnit.sections.length,
      0,
    ),
    units: normalizedUnits,
  };
}

function buildFallbackDebateHierarchy(unit) {
  const fallbackTopics = extractSectionTopicsForUnit(unit);
  if (!fallbackTopics.length) {
    return {
      success: true,
      generated_at: null,
      subject: unit.subject || null,
      total_topics: 0,
      total_sections: 0,
      units: [],
    };
  }

  const sections = [];
  const seenSections = new Set();

  fallbackTopics.forEach((topic, index) => {
    const sectionTitle = normalizeDebateText(topic.sectionTitle || topic.label);
    if (!sectionTitle) {
      return;
    }

    const sectionKey = sectionTitle.toLowerCase();
    if (seenSections.has(sectionKey)) {
      return;
    }
    seenSections.add(sectionKey);

    sections.push({
      section_title: sectionTitle,
      topics_count: 1,
      debate_topics: [
        {
          topic_id: topic.id || `${unit.documentId}:${sectionKey}:${index}`,
          topic_title: sectionTitle,
          topic_description: null,
          key_concepts: [],
          source_unit: unit.unitTitle || unit.unitLabel || null,
          source_section: sectionTitle,
          subject: unit.subject || null,
          subject_key: getSubjectGroupLookup(unit),
          unit_number: unit.unitNumber ?? null,
          unit_title: unit.unitTitle || null,
          section_title: sectionTitle,
          topic_path: [unit.subject, unit.unitTitle, sectionTitle].filter(Boolean),
        },
      ],
    });
  });

  return {
    success: true,
    generated_at: unit.updatedAt || null,
    subject: unit.subject || null,
    total_topics: sections.length,
    total_sections: sections.length,
    units: [
      {
        unit_number: unit.unitNumber ?? null,
        unit_title: unit.unitTitle || unit.unitLabel || null,
        sections,
      },
    ],
  };
}

function buildDebateTopicHierarchyForUnit(unit, filters = {}) {
  if (!unit) {
    return {
      success: true,
      generated_at: null,
      subject: null,
      total_topics: 0,
      total_sections: 0,
      units: [],
    };
  }

  const storedHierarchy = buildStoredDebateHierarchy(unit, unit.debateTopics, filters);
  if (storedHierarchy?.units?.length) {
    return storedHierarchy;
  }

  return buildFallbackDebateHierarchy(unit);
}

function extractTopicsFromValue(value, unit, collected, seen) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => extractTopicsFromValue(item, unit, collected, seen));
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  const directTitle =
    value.section_title ||
    value.sectionTitle ||
    value.topic ||
    value.title ||
    value.heading ||
    value.name;
  const directNumber =
    value.section_number ||
    value.sectionNumber ||
    value.number ||
    value.topic_number ||
    value.topicNumber;

  if (directTitle) {
    const topicRecord = createTopicRecord({
      unit,
      sectionId: value.section_id || value.sectionId || value.id,
      sectionNumber: directNumber,
      sectionTitle: directTitle,
      sectionType: value.type || value.kind || value.section_type || value.sectionType,
    });

    if (topicRecord) {
      const topicKey = `${topicRecord.unitId}:${topicRecord.label.toLowerCase()}`;
      if (!seen.has(topicKey)) {
        seen.add(topicKey);
        collected.push(topicRecord);
      }
    }
  }

  [
    value.units,
    value.sections,
    value.topics,
    value.content,
    value.children,
    value.items,
    value.chapters,
  ].forEach((nested) => extractTopicsFromValue(nested, unit, collected, seen));
}

function extractSectionTopicsForUnit(unit) {
  const collected = [];
  const seen = new Set();

  extractTopicsFromValue(unit.enrichedData, unit, collected, seen);
  extractTopicsFromValue(unit.structuredData, unit, collected, seen);

  return collected.sort((a, b) => {
    const aUnit = a.unitNumber ?? Number.MAX_SAFE_INTEGER;
    const bUnit = b.unitNumber ?? Number.MAX_SAFE_INTEGER;
    if (aUnit !== bUnit) {
      return aUnit - bUnit;
    }

    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
  });
}

function normalizeFaqText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function createFaqRecord({
  unit,
  question,
  answer,
  sectionTitle,
  source,
}) {
  const cleanQuestion = normalizeFaqText(question);
  const cleanAnswer = normalizeFaqText(answer);
  if (!cleanQuestion || !cleanAnswer) {
    return null;
  }

  return {
    id: `${unit.documentId}:${cleanQuestion.toLowerCase()}`,
    subjectGroupKey: getSubjectGroupLookup(unit),
    subject: unit.subject,
    unitId: String(unit._id),
    unitNumber: unit.unitNumber,
    unitTitle: unit.unitTitle,
    documentId: unit.documentId,
    question: cleanQuestion,
    answer: cleanAnswer,
    sectionTitle: normalizeFaqText(sectionTitle) || null,
    source: source || null,
  };
}

function extractFaqsFromValue(value, unit, collected, seen, sectionTitle = null) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => extractFaqsFromValue(item, unit, collected, seen, sectionTitle));
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  const directQuestion =
    value.question ||
    value.q ||
    value.prompt ||
    value.ask ||
    value.title ||
    value.heading;
  const directAnswer =
    value.answer ||
    value.a ||
    value.response ||
    value.reply ||
    value.content ||
    value.summary ||
    value.explanation;

  const nextSectionTitle =
    value.section_title ||
    value.sectionTitle ||
    value.topic ||
    value.title ||
    sectionTitle;

  if (directQuestion && directAnswer) {
    const faqRecord = createFaqRecord({
      unit,
      question: directQuestion,
      answer: directAnswer,
      sectionTitle: nextSectionTitle,
      source: value.source || value.kind || value.type || null,
    });

    if (faqRecord) {
      const faqKey = `${faqRecord.unitId}:${faqRecord.question.toLowerCase()}`;
      if (!seen.has(faqKey)) {
        seen.add(faqKey);
        collected.push(faqRecord);
      }
    }
  }

  [
    value.units,
    value.faq,
    value.faqs,
    value.questions,
    value.qa,
    value.qna,
    value.items,
    value.children,
    value.sections,
    value.topics,
    value.content,
    value.enrichment,
  ].forEach((nested) => extractFaqsFromValue(nested, unit, collected, seen, nextSectionTitle));
}

function extractFaqsForUnit(unit) {
  const collected = [];
  const seen = new Set();

  extractFaqsFromValue(unit.enrichedData, unit, collected, seen);
  extractFaqsFromValue(unit.structuredData, unit, collected, seen);

  return collected;
}

async function resolveSubjectGroupImages(units = []) {
  const firstUnit = units[0];
  if (!firstUnit) {
    return {
      coverImageUrl: null,
      imageCandidates: [],
    };
  }

  const subjectFilter = {
    board: firstUnit.board,
    subject: firstUnit.subject,
  };

  if (firstUnit.standard) {
    subjectFilter.grade = firstUnit.standard;
  }

  const [matchingUnit, matchingBook] = await Promise.all([
    Unit.findOne({
      ...subjectFilter,
      ...(firstUnit.unitNumber ? { unitNumber: firstUnit.unitNumber } : {}),
    })
      .sort({ updatedAt: -1 })
      .select("coverImageUrl metadata"),
    BookContent.findOne(subjectFilter)
      .sort({ updatedAt: -1 })
      .select("coverImageUrl metadata"),
  ]);

  const imageCandidates = collectImageCandidates(
    matchingBook?.coverImageUrl,
    matchingBook?.metadata?.coverImageUrl,
    matchingBook?.metadata?.coverImage,
    matchingBook?.metadata?.thumbnail,
    matchingUnit?.coverImageUrl,
    matchingUnit?.metadata?.coverImageUrl,
    matchingUnit?.metadata?.coverImage,
    matchingUnit?.metadata?.thumbnail,
    firstUnit?.enrichedData?.coverImageUrl,
    firstUnit?.enrichedData?.coverImage,
    firstUnit?.enrichedData?.thumbnail,
    firstUnit?.structuredData?.coverImageUrl,
    firstUnit?.structuredData?.coverImage,
    firstUnit?.structuredData?.thumbnail,
  );

  return {
    coverImageUrl: imageCandidates[0] || null,
    imageCandidates,
  };
}

function toUnitSummary(unit) {
  return {
    id: unit._id,
    subjectGroupKey: getSubjectGroupLookup(unit),
    documentId: unit.documentId,
    board: unit.board,
    standard: unit.standard,
    subject: unit.subject,
    part: unit.part,
    term: unit.term,
    unitNumber: unit.unitNumber,
    unitTitle: unit.unitTitle,
    unitLabel: unit.unitLabel,
    chapterName: unit.chapterName,
    readerIndex: unit.readerIndex,
    hasStructuredData: Boolean(unit.structuredData),
    hasEnrichedData: Boolean(unit.enrichedData),
    debateTopics: unit.debateTopics || null,
    sectionTopics: extractSectionTopicsForUnit(unit),
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
  };
}

function getSubjectVisual(subject = "") {
  const normalized = String(subject).toLowerCase();
  if (normalized.includes("math")) {
    return { iconKey: "calculator", colorKey: "blue" };
  }
  if (normalized.includes("physics")) {
    return { iconKey: "zap", colorKey: "cyan" };
  }
  if (normalized.includes("chem")) {
    return { iconKey: "flask", colorKey: "green" };
  }
  if (normalized.includes("bio") || normalized.includes("science")) {
    return { iconKey: "dna", colorKey: "emerald" };
  }
  if (normalized.includes("history")) {
    return { iconKey: "scroll", colorKey: "amber" };
  }
  if (normalized.includes("english")) {
    return { iconKey: "book-open", colorKey: "rose" };
  }
  return { iconKey: "book-open", colorKey: "slate" };
}

function toSubjectGroup(units = []) {
  const orderedUnits = [...units].sort((a, b) => {
    const aNumber = a.unitNumber ?? Number.MAX_SAFE_INTEGER;
    const bNumber = b.unitNumber ?? Number.MAX_SAFE_INTEGER;
    return aNumber - bNumber || a.unitTitle.localeCompare(b.unitTitle);
  });

  const firstUnit = orderedUnits[0];
  const subjectGroupKey = getSubjectIdentityKey(firstUnit);

  return {
    id: subjectGroupKey,
    subjectGroupKey: firstUnit.subjectGroupKey || subjectGroupKey,
    title: buildSubjectTitle(firstUnit) || firstUnit.subject,
    subject: firstUnit.subject,
    board: firstUnit.board,
    standard: firstUnit.standard,
    class: firstUnit.standard,
    part: firstUnit.part || null,
    term: firstUnit.term || null,
    unitCount: orderedUnits.length,
    unitCountLabel: unitCountLabel(orderedUnits.length),
    visual: getSubjectVisual(firstUnit.subject),
    coverImageUrl: null,
    imageCandidates: [],
    unitNumbers: orderedUnits
      .map((unit) => unit.unitNumber)
      .filter((unitNumber) => unitNumber !== null && unitNumber !== undefined),
    units: orderedUnits.map(toUnitSummary),
    updatedAt: orderedUnits.reduce(
      (latest, current) => (latest > current.updatedAt ? latest : current.updatedAt),
      orderedUnits[0].updatedAt,
    ),
  };
}

async function listSubjectGroups(filters = {}) {
  const query = {
    "processing.status": { $ne: "failed" },
  };

  if (filters.board) {
    query.board = filters.board;
  }
  if (filters.standard) {
    query.standard = filters.standard;
  }
  if (filters.class || filters.classNumber) {
    query.standard = String(filters.class || filters.classNumber);
  }
  if (Object.prototype.hasOwnProperty.call(filters, "term")) {
    query.term = filters.term ? new RegExp(`^${escapeRegExp(normalizeTerm(filters.term))}$`, "i") : null;
  }
  if (Object.prototype.hasOwnProperty.call(filters, "part")) {
    query.part = filters.part ? new RegExp(`^${escapeRegExp(normalizePart(filters.part))}$`, "i") : null;
  }
  if (filters.subject) {
    query.subject = new RegExp(`^${escapeRegExp(filters.subject)}$`, "i");
  }
  if (filters.search) {
    query.$or = [
      { subject: { $regex: filters.search, $options: "i" } },
      { unitTitle: { $regex: filters.search, $options: "i" } },
      { chapterName: { $regex: filters.search, $options: "i" } },
    ];
  }

  const units = await SubjectUnit.find(query).sort({
    board: 1,
    standard: 1,
    termSequence: 1,
    term: 1,
    subject: 1,
    partSequence: 1,
    part: 1,
    unitNumber: 1,
    unitTitle: 1,
  });

  const groups = new Map();

  units.forEach((unit) => {
    const key = getSubjectIdentityKey(unit);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(unit);
  });

  const subjectGroups = [...groups.values()].map(toSubjectGroup).sort(compareSubjectIdentity);

  return Promise.all(
    subjectGroups.map(async (group) => ({
      ...group,
      ...(await resolveSubjectGroupImages(group.units)),
    })),
  );
}

async function getSubjectGroupByKey(subjectGroupKey) {
  const units = await SubjectUnit.find(buildSubjectGroupKeyFilter(subjectGroupKey)).sort({
    termSequence: 1,
    partSequence: 1,
    unitNumber: 1,
    unitTitle: 1,
  });

  if (!units.length) {
    const error = new Error("Subject group not found");
    error.statusCode = 404;
    throw error;
  }

  const group = toSubjectGroup(units);
  return {
    ...group,
    ...(await resolveSubjectGroupImages(group.units)),
  };
}

async function listSectionTopicsForSubjectGroup(subjectGroupKey) {
  const group = await getSubjectGroupByKey(subjectGroupKey);
  const units = await Promise.all(
    (group.units || []).map((summary) => resolveSubjectUnit({ unitId: summary.id })),
  );

  return units.flatMap((unit) => extractSectionTopicsForUnit(unit));
}

async function resolveSubjectUnit({
  unitId,
  documentId,
  subjectGroupKey,
  unitNumber,
  subject,
  unitTitle,
}) {
  if (unitId && mongoose.Types.ObjectId.isValid(unitId)) {
    const unit = await SubjectUnit.findById(unitId);
    if (unit) {
      return unit;
    }
  }

  if (documentId) {
    const unit = await SubjectUnit.findOne({ documentId });
    if (unit) {
      return unit;
    }
  }

  if (subjectGroupKey && unitNumber !== undefined && unitNumber !== null && unitNumber !== "") {
    const unit = await SubjectUnit.findOne({
      ...buildSubjectGroupKeyFilter(subjectGroupKey),
      unitNumber: Number(unitNumber),
    });

    if (unit) {
      return unit;
    }
  }

  const fallbackFilter = {};

  if (subjectGroupKey) {
    Object.assign(fallbackFilter, buildSubjectGroupKeyFilter(subjectGroupKey));
  }

  if (subject) {
    fallbackFilter.subject = new RegExp(`^${escapeRegExp(subject)}$`, "i");
  }

  if (unitNumber !== undefined && unitNumber !== null && unitNumber !== "") {
    fallbackFilter.unitNumber = Number(unitNumber);
  }

  if (unitTitle) {
    fallbackFilter.$or = [
      ...(fallbackFilter.$or || []),
      { unitTitle: new RegExp(`^${escapeRegExp(unitTitle)}$`, "i") },
      { chapterName: new RegExp(`^${escapeRegExp(unitTitle)}$`, "i") },
      { unitLabel: new RegExp(`^${escapeRegExp(unitTitle)}$`, "i") },
    ];
  }

  const unit = await SubjectUnit.findOne(fallbackFilter).sort({
    updatedAt: -1,
  });

  if (!unit) {
    const error = new Error("Subject unit not found");
    error.statusCode = 404;
    throw error;
  }

  return unit;
}

function getPythonLearningContext(unit) {
  return {
    documentId: unit.documentId,
    board: unit.board,
    classNumber: unit.standard,
    subject: unit.subject,
    unitNumber: unit.unitNumber || 1,
    unitName: unit.unitTitle || unit.chapterName || unit.unitLabel || "",
  };
}

module.exports = {
  listSubjectGroups,
  getSubjectGroupByKey,
  listSectionTopicsForSubjectGroup,
  extractSectionTopicsForUnit,
  extractFaqsForUnit,
  resolveSubjectUnit,
  getPythonLearningContext,
  buildDebateTopicHierarchyForUnit,
  toUnitSummary,
  getSubjectVisual,
};
