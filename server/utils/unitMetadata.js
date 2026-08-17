function cleanUnitText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseUnitNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function formatUnitLabel(unitNumber) {
  const parsed = parseUnitNumber(unitNumber);
  if (!parsed) {
    return "Unit";
  }

  return `Unit ${String(parsed).padStart(2, "0")}`;
}

function splitCombinedUnitChapter(value = "") {
  const text = cleanUnitText(value);
  if (!text) {
    return {};
  }

  const match = text.match(/^(unit|chapter)\s*0*(\d+)\s*(?:\/|-|:|–|—)\s*(.+)$/i);
  if (!match) {
    return { chapterName: text };
  }

  const unitNumber = Number(match[2]);
  const chapterName = cleanUnitText(match[3]);
  return {
    unitNumber,
    unitTitle: formatUnitLabel(unitNumber),
    unitLabel: formatUnitLabel(unitNumber),
    chapterName,
  };
}

function normalizeUnitMetadata({
  unitNumber,
  unitTitle,
  unitLabel,
  chapterName,
  fallbackTitle,
  structuredUnit,
  enrichedUnit,
  debateTopicsData,
} = {}) {
  const debateUnit = Array.isArray(debateTopicsData?.units)
    ? debateTopicsData.units[0]
    : null;
  const parsedCombined = splitCombinedUnitChapter(
    chapterName || fallbackTitle || unitTitle || unitLabel,
  );
  const resolvedUnitNumber =
    parseUnitNumber(unitNumber) ||
    parseUnitNumber(structuredUnit?.unit_number ?? structuredUnit?.unitNumber) ||
    parseUnitNumber(enrichedUnit?.unit_number ?? enrichedUnit?.unitNumber) ||
    parseUnitNumber(debateUnit?.unit_number ?? debateUnit?.unitNumber) ||
    parseUnitNumber(unitTitle) ||
    parseUnitNumber(unitLabel) ||
    parsedCombined.unitNumber ||
    null;

  const resolvedUnitLabel = resolvedUnitNumber
    ? formatUnitLabel(resolvedUnitNumber)
    : cleanUnitText(unitLabel || unitTitle || parsedCombined.unitLabel || "Unit");

  const resolvedChapterName =
    parsedCombined.chapterName ||
    cleanUnitText(chapterName) ||
    cleanUnitText(structuredUnit?.title || structuredUnit?.unit_title || structuredUnit?.unitTitle) ||
    cleanUnitText(enrichedUnit?.title || enrichedUnit?.unit_title || enrichedUnit?.unitTitle) ||
    cleanUnitText(debateUnit?.unit_title || debateUnit?.unitTitle) ||
    cleanUnitText(fallbackTitle) ||
    null;

  return {
    unitNumber: resolvedUnitNumber,
    unitTitle: resolvedUnitLabel,
    unitLabel: resolvedUnitLabel,
    chapterName: resolvedChapterName,
  };
}

module.exports = {
  cleanUnitText,
  formatUnitLabel,
  normalizeUnitMetadata,
  parseUnitNumber,
  splitCombinedUnitChapter,
};
