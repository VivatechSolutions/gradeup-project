const mongoose = require("mongoose");
require("dotenv").config();

const SubjectUnit = require("../model/SubjectUnit");

function buildReaderIndex(unit) {
  const structuredUnit = unit.structuredData?.units?.[0] || unit.structuredData || {};
  const enrichedUnit = unit.enrichedData?.units?.[0] || unit.enrichedData || {};
  const sections = Array.isArray(structuredUnit.sections)
    ? structuredUnit.sections
        .map((section) => section?.title || section?.section_title)
        .filter(Boolean)
    : [];
  const avatarSections = (Array.isArray(enrichedUnit.sections) ? enrichedUnit.sections : [])
    .filter((section) => Array.isArray(section?.enrichment?.avatar_lesson?.phases))
    .map((section, index) => ({
      sectionId: section.id || section.section_id || null,
      sectionTitle: section.section_title || section.title,
      order: Number(section.order ?? index + 1),
      hasAvatarLesson: true,
    }))
    .filter((section) => section.sectionTitle);

  return {
    sections,
    avatarSections,
    hasGlossary: Boolean(structuredUnit?.glossary?.sub_items?.length),
    hasSummary: Boolean(structuredUnit?.summary?.content?.length),
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  const shouldApply = process.argv.includes("--apply");
  await mongoose.connect(uri);
  if (shouldApply) {
    await SubjectUnit.createIndexes();
  }

  let scanned = 0;
  let updated = 0;
  let subjectMismatches = 0;
  const cursor = SubjectUnit.find({})
    .select("_id documentId subject structuredData enrichedData")
    .lean()
    .cursor();

  for await (const unit of cursor) {
    scanned += 1;
    const embeddedSubject = unit.enrichedData?.units?.[0]?.subject || unit.structuredData?.subject;
    if (embeddedSubject && String(embeddedSubject).trim().toLowerCase() !== String(unit.subject || "").trim().toLowerCase()) {
      subjectMismatches += 1;
      console.warn(`[subject-unit-index] subject mismatch unit=${unit._id} document=${unit.documentId} top=${unit.subject} embedded=${embeddedSubject}`);
    }
    const update = {
      readerIndex: buildReaderIndex(unit),
      contentFlags: {
        hasStructuredData: Boolean(unit.structuredData),
        hasEnrichedData: Boolean(unit.enrichedData),
      },
    };
    if (shouldApply) {
      await SubjectUnit.updateOne({ _id: unit._id }, { $set: update });
      updated += 1;
    }
  }

  console.log(`[subject-unit-index] mode=${shouldApply ? "apply" : "dry-run"} scanned=${scanned} updated=${updated} subjectMismatches=${subjectMismatches}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("[subject-unit-index] failed:", error);
  await mongoose.disconnect().catch(() => null);
  process.exit(1);
});
