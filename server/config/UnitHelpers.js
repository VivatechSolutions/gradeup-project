const toKeyPart = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildUnitKey = (payload = {}) => {
  if (payload.unitKey) {
    return payload.unitKey
      .toString()
      .split(/(?:\||--)/)
      .map(toKeyPart)
      .filter(Boolean)
      .join("--");
  }

  const board = payload.board || payload.boardCode;
  const grade = payload.grade || payload.standard || payload.className;
  const subject = payload.subject;
  const part = payload.part || payload.bookPart || "general";
  const unitNumber = payload.unitNumber || payload.unit_number;

  if (!board || !grade || !subject || !unitNumber) {
    return "";
  }

  return [board, grade, subject, part, `unit-${unitNumber}`]
    .map(toKeyPart)
    .filter(Boolean)
    .join("--");
};

const getPrimaryUnit = (content = {}) => {
  if (Array.isArray(content.units) && content.units.length > 0) {
    return content.units[0];
  }

  return null;
};

const getSectionCount = (content = {}) => {
  if (!Array.isArray(content.units)) {
    return 0;
  }

  return content.units.reduce((count, unit) => {
    const sections = Array.isArray(unit.sections) ? unit.sections.length : 0;
    return count + sections;
  }, 0);
};

const extractUnitMetadata = (payload = {}, content = {}) => {
  const primaryUnit = getPrimaryUnit(content) || {};

  return {
    unitKey: buildUnitKey({
      unitKey: payload.unitKey,
      board: payload.board,
      grade: payload.grade,
      subject: payload.subject || primaryUnit.subject,
      part: payload.part || primaryUnit.part,
      unitNumber: payload.unitNumber || primaryUnit.unit_number,
    }),
    board: payload.board || payload.boardCode || null,
    grade: payload.grade || payload.standard || payload.className || null,
    subject: payload.subject || primaryUnit.subject || null,
    part: payload.part || payload.bookPart || primaryUnit.part || null,
    unitNumber: payload.unitNumber || primaryUnit.unit_number || null,
    title: payload.title || primaryUnit.title || null,
    language: payload.language || "en",
    coverImageUrl: payload.coverImageUrl || payload.coverImage || null,
    metadata: payload.unitMetadata || payload.metadata || null,
  };
};

module.exports = {
  buildUnitKey,
  extractUnitMetadata,
  getPrimaryUnit,
  getSectionCount,
};
