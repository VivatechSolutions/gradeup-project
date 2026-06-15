const fs = require("fs");
const path = require("path");
const DebateTopicCatalog = require("../model/DebateTopicCatalog");
const { getSubjectGroupByKey } = require("./learningContextService");

const DEBATE_TOPIC_SOURCE = path.join(__dirname, "..", "debate_topics.json");

function normalizeKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeTopicId(subjectKey, unitNumber, sectionTitle, topicTitle, index) {
  const slug = [subjectKey, unitNumber, sectionTitle, topicTitle, index]
    .map((part) =>
      String(part || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("--");

  return slug || `topic-${index}`;
}

function normalizeSourcePayload(rawPayload = {}) {
  const subject = String(rawPayload.subject || "").trim();
  const subjectKey = normalizeKey(subject);
  const units = Array.isArray(rawPayload.units) ? rawPayload.units : [];

  const normalizedUnits = units.map((unit) => {
    const unitNumber = Number(unit.unit_number ?? unit.unitNumber ?? 0) || null;
    const unitTitle = String(unit.unit_title || unit.unitTitle || "").trim();
    const sections = Array.isArray(unit.sections) ? unit.sections : [];

    const normalizedSections = sections.map((section) => {
      const sectionTitle = String(section.section_title || section.sectionTitle || "").trim();
      const topics = Array.isArray(section.debate_topics) ? section.debate_topics : [];

      const normalizedTopics = topics.map((topic, index) => {
        const topicTitle = String(topic.topic_title || topic.topicTitle || topic.title || "").trim();
        return {
          topic_id:
            String(topic.topic_id || topic.topicId || "").trim() ||
            normalizeTopicId(subjectKey, unitNumber, sectionTitle, topicTitle, index),
          topic_title: topicTitle,
          topic_description: String(topic.topic_description || topic.topicDescription || "").trim() || null,
          key_concepts: Array.isArray(topic.key_concepts) ? topic.key_concepts.map((value) => String(value).trim()).filter(Boolean) : [],
          source_unit: String(topic.source_unit || unitTitle || "").trim() || null,
          source_section: String(topic.source_section || sectionTitle || "").trim() || null,
          subject: String(topic.subject || subject || "").trim() || null,
          subject_key: subjectKey || null,
          unit_number: unitNumber,
          unit_title: unitTitle || null,
          section_title: sectionTitle || null,
          topic_path: [subject, unitTitle, sectionTitle, topicTitle].filter(Boolean),
        };
      });

      return {
        section_title: sectionTitle,
        topics_count: Number(section.topics_count || normalizedTopics.length || 0),
        debate_topics: normalizedTopics,
      };
    });

    return {
      unit_number: unitNumber,
      unit_title: unitTitle,
      sections: normalizedSections,
    };
  });

  return {
    subject,
    subject_key: subjectKey,
    generated_at: rawPayload.generated_at ? new Date(rawPayload.generated_at) : null,
    total_topics: Number(rawPayload.total_topics || 0),
    total_sections: Number(rawPayload.total_sections || 0),
    units: normalizedUnits,
    source_payload: rawPayload,
    source_file: "debate_topics.json",
    synced_at: new Date(),
  };
}

async function loadSourcePayload() {
  const raw = await fs.promises.readFile(DEBATE_TOPIC_SOURCE, "utf8");
  return JSON.parse(raw);
}

async function syncDebateTopicCatalog() {
  const sourcePayload = await loadSourcePayload();
  const normalized = normalizeSourcePayload(sourcePayload);

  await DebateTopicCatalog.findOneAndUpdate(
    { subject_key: normalized.subject_key },
    { $set: normalized },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return normalized;
}

async function initializeDebateTopicCatalog() {
  try {
    const catalogCount = await DebateTopicCatalog.estimatedDocumentCount().catch(() => 0);
    if (!catalogCount) {
      await syncDebateTopicCatalog();
      return;
    }

    const sourcePayload = await loadSourcePayload();
    const normalized = normalizeSourcePayload(sourcePayload);
    await DebateTopicCatalog.findOneAndUpdate(
      { subject_key: normalized.subject_key },
      { $set: normalized },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    console.warn("[DEBATE_TOPICS] Catalog initialization skipped:", error.message);
  }
}

async function resolveSubjectForCatalog({ subjectGroupKey = null, subject = null } = {}) {
  if (subject) {
    return String(subject).trim();
  }

  if (!subjectGroupKey) {
    return null;
  }

  try {
    const group = await getSubjectGroupByKey(subjectGroupKey);
    return group?.subject || group?.title || null;
  } catch {
    return null;
  }
}

function filterCatalogHierarchy(catalog, { unitNumber = null, sectionTitle = null } = {}) {
  const unitFilter = unitNumber !== null && unitNumber !== undefined && String(unitNumber) !== "";
  const sectionFilter = String(sectionTitle || "").trim().toLowerCase();

  const units = (catalog.units || [])
    .filter((unit) => {
      if (!unitFilter) {
        return true;
      }
      return Number(unit.unit_number) === Number(unitNumber);
    })
    .map((unit) => {
      const sections = (unit.sections || [])
        .filter((section) => {
          if (!sectionFilter) {
            return true;
          }
          return String(section.section_title || "").trim().toLowerCase() === sectionFilter;
        })
        .filter((section) => (section.debate_topics || []).length > 0);

      return {
        unit_number: unit.unit_number,
        unit_title: unit.unit_title,
        sections,
      };
    })
    .filter((unit) => unit.sections.length > 0);

  return {
    success: true,
    generated_at: catalog.generated_at,
    subject: catalog.subject,
    total_topics: units.reduce(
      (count, unit) =>
        count +
        unit.sections.reduce(
          (sectionCount, section) => sectionCount + (section.debate_topics || []).length,
          0,
        ),
      0,
    ),
    total_sections: units.reduce((count, unit) => count + unit.sections.length, 0),
    units,
  };
}

async function getDebateTopicHierarchy(filters = {}) {
  const resolvedSubject = await resolveSubjectForCatalog(filters);
  if (!resolvedSubject) {
    return {
      success: true,
      generated_at: null,
      subject: null,
      total_topics: 0,
      total_sections: 0,
      units: [],
    };
  }

  const catalog = await DebateTopicCatalog.findOne({
    subject_key: normalizeKey(resolvedSubject),
  }).lean();

  if (!catalog) {
    try {
      const syncedCatalog = await syncDebateTopicCatalog();
      if (normalizeKey(syncedCatalog.subject) === normalizeKey(resolvedSubject)) {
        return filterCatalogHierarchy(syncedCatalog, filters);
      }
    } catch (error) {
      console.warn("[DEBATE_TOPICS] Catalog sync failed:", error.message);
    }

    return {
      success: true,
      generated_at: null,
      subject: resolvedSubject,
      total_topics: 0,
      total_sections: 0,
      units: [],
    };
  }

  return filterCatalogHierarchy(catalog, filters);
}

module.exports = {
  getDebateTopicHierarchy,
  initializeDebateTopicCatalog,
  normalizeTopicId,
  normalizeSourcePayload,
  resolveSubjectForCatalog,
  syncDebateTopicCatalog,
};
