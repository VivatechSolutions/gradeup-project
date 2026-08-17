const mongoose = require("mongoose");
require("dotenv").config();

const SubjectUnit = require("../model/SubjectUnit");
const { normalizeUnitMetadata } = require("../utils/unitMetadata");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(uri);

  const cursor = SubjectUnit.find({
    $or: [
      { unitNumber: null },
      { unitTitle: /\/| - |:|–|—/ },
      { unitLabel: /\/| - |:|–|—/ },
      { chapterName: /^Unit\s*\d+/i },
    ],
  }).cursor();

  let scanned = 0;
  let updated = 0;

  for await (const unit of cursor) {
    scanned += 1;
    const metadata = normalizeUnitMetadata({
      unitNumber: unit.unitNumber,
      unitTitle: unit.unitTitle,
      unitLabel: unit.unitLabel,
      chapterName: unit.chapterName,
      fallbackTitle: unit.unitTitle || unit.unitLabel || unit.chapterName,
      structuredUnit: unit.structuredData?.units?.[0],
      enrichedUnit: unit.enrichedData?.units?.[0],
      debateTopicsData: unit.debateTopics,
    });

    const next = {
      unitNumber: metadata.unitNumber,
      unitTitle: metadata.unitTitle,
      unitLabel: metadata.unitLabel,
      chapterName: metadata.chapterName,
    };

    const changed =
      unit.unitNumber !== next.unitNumber ||
      unit.unitTitle !== next.unitTitle ||
      unit.unitLabel !== next.unitLabel ||
      unit.chapterName !== next.chapterName;

    if (!changed) {
      continue;
    }

    await SubjectUnit.updateOne({ _id: unit._id }, { $set: next });
    updated += 1;
    console.log(
      `[unit-metadata] ${unit._id}: ${JSON.stringify({
        from: {
          unitNumber: unit.unitNumber,
          unitTitle: unit.unitTitle,
          unitLabel: unit.unitLabel,
          chapterName: unit.chapterName,
        },
        to: next,
      })}`,
    );
  }

  console.log(`[unit-metadata] scanned=${scanned} updated=${updated}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("[unit-metadata] failed:", error);
  await mongoose.disconnect().catch(() => null);
  process.exit(1);
});
