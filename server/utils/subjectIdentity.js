const NONE_KEY = "__none__";

function cleanText(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || null;
}

function normalizeTerm(value) {
  const text = cleanText(value);
  if (!text) return null;
  const numberMatch = text.match(/^(?:term\s*)?(\d+)$/i);
  if (numberMatch) return `Term ${Number(numberMatch[1])}`;
  const termNumberMatch = text.match(/^term\s*(\d+)$/i);
  if (termNumberMatch) return `Term ${Number(termNumberMatch[1])}`;
  return text;
}

function normalizePart(value) {
  return cleanText(value);
}

function normalizeKeyText(value, { none = NONE_KEY } = {}) {
  const text = cleanText(value);
  return text ? text.toLowerCase() : none;
}

function subjectIdentityParts({ board, standard, classNumber, subject, part, term }) {
  return {
    board: cleanText(board),
    standard: cleanText(standard ?? classNumber),
    subject: cleanText(subject),
    part: normalizePart(part),
    term: normalizeTerm(term),
  };
}

function subjectIdentityKey(input = {}) {
  const identity = subjectIdentityParts(input);
  return [
    "subject",
    normalizeKeyText(identity.board),
    normalizeKeyText(identity.standard),
    normalizeKeyText(identity.term),
    normalizeKeyText(identity.subject),
    normalizeKeyText(identity.part),
  ].join("::");
}

function getSubjectIdentityKey(unit = {}) {
  return subjectIdentityKey({
    board: unit.board,
    standard: unit.standard,
    subject: unit.subject,
    part: unit.part,
    term: unit.term,
  });
}

function getTermSortValue(term) {
  const normalized = normalizeTerm(term);
  if (!normalized) return Number.MAX_SAFE_INTEGER;
  const match = normalized.match(/^term\s*(\d+)$/i);
  if (match) return Number(match[1]);
  return Number.MAX_SAFE_INTEGER - 1;
}

function compareSubjectIdentity(left = {}, right = {}) {
  const leftIdentity = subjectIdentityParts(left);
  const rightIdentity = subjectIdentityParts(right);
  const textCompare =
    String(leftIdentity.board || "").localeCompare(String(rightIdentity.board || ""), undefined, { numeric: true, sensitivity: "base" }) ||
    String(leftIdentity.standard || "").localeCompare(String(rightIdentity.standard || ""), undefined, { numeric: true, sensitivity: "base" });

  if (textCompare) return textCompare;

  const termCompare = getTermSortValue(leftIdentity.term) - getTermSortValue(rightIdentity.term);
  if (termCompare) return termCompare;

  return (
    String(leftIdentity.term || "").localeCompare(String(rightIdentity.term || ""), undefined, { numeric: true, sensitivity: "base" }) ||
    String(leftIdentity.subject || "").localeCompare(String(rightIdentity.subject || ""), undefined, { numeric: true, sensitivity: "base" }) ||
    String(leftIdentity.part || "").localeCompare(String(rightIdentity.part || ""), undefined, { numeric: true, sensitivity: "base" })
  );
}

function buildSubjectTitle({ subject, term, part }) {
  const pieces = [cleanText(subject), normalizeTerm(term), normalizePart(part)].filter(Boolean);
  return pieces.join(" - ");
}

function unitCountLabel(count) {
  return `${count} ${Number(count) === 1 ? "unit" : "units"}`;
}

module.exports = {
  NONE_KEY,
  cleanText,
  normalizeTerm,
  normalizePart,
  subjectIdentityParts,
  subjectIdentityKey,
  getSubjectIdentityKey,
  compareSubjectIdentity,
  buildSubjectTitle,
  unitCountLabel,
};
