const assert = require("assert");
const {
  compareSubjectIdentity,
  getSubjectIdentityKey,
  normalizePart,
  normalizeTerm,
  unitCountLabel,
} = require("../utils/subjectIdentity");

function groupUnits(units, filters = {}) {
  const filtered = units.filter((unit) => {
    if (filters.board && unit.board !== filters.board) return false;
    if (filters.standard && unit.standard !== filters.standard) return false;
    if (filters.term && normalizeTerm(unit.term) !== normalizeTerm(filters.term)) return false;
    if (filters.subject && unit.subject !== filters.subject) return false;
    if (Object.prototype.hasOwnProperty.call(filters, "part")) {
      if (normalizePart(unit.part) !== normalizePart(filters.part)) return false;
    }
    return true;
  });

  const grouped = new Map();
  filtered.forEach((unit) => {
    const key = getSubjectIdentityKey(unit);
    grouped.set(key, [...(grouped.get(key) || []), unit]);
  });

  return Array.from(grouped.entries())
    .map(([id, items]) => ({
      id,
      board: items[0].board,
      standard: items[0].standard,
      term: normalizeTerm(items[0].term),
      subject: items[0].subject,
      part: normalizePart(items[0].part),
      unitCount: items.length,
    }))
    .sort(compareSubjectIdentity);
}

const units = [
  { board: "State Board", standard: "Class 10", term: "Term 1", subject: "English", part: "", unit: 1 },
  { board: "State Board", standard: "Class 10", term: "Term 1", subject: "English", part: null, unit: 2 },
  { board: "State Board", standard: "Class 10", term: "Term 2", subject: "English", part: null, unit: 1 },
  { board: "State Board", standard: "Class 10", term: "Term 1", subject: "Social Science", part: "History", unit: 1 },
  { board: "State Board", standard: "Class 10", term: "Term 1", subject: "Social Science", part: "History", unit: 2 },
  { board: "State Board", standard: "Class 10", term: "Term 1", subject: "Social Science", part: "Geography", unit: 1 },
  { board: "State Board", standard: "Class 10", term: "Term 10", subject: "English", part: null, unit: 1 },
  { board: "CBSE", standard: "Class 10", term: "Term 1", subject: "English", part: null, unit: 1 },
];

const groups = groupUnits(units);

assert.strictEqual(
  getSubjectIdentityKey(units[0]),
  getSubjectIdentityKey(units[1]),
  "empty and missing part should normalize to the same group",
);

assert.notStrictEqual(
  getSubjectIdentityKey(units[0]),
  getSubjectIdentityKey(units[2]),
  "same subject in different terms must not merge",
);

assert.notStrictEqual(
  getSubjectIdentityKey(units[3]),
  getSubjectIdentityKey(units[5]),
  "same subject and term in different parts must not merge",
);

assert.strictEqual(
  groups.find((group) => group.subject === "English" && group.term === "Term 1" && group.board === "State Board").unitCount,
  2,
  "unit count must use only the exact board/class/term/subject/part group",
);

assert.strictEqual(
  groupUnits(units, {
    board: "State Board",
    standard: "Class 10",
    term: "Term 1",
    subject: "Social Science",
    part: "History",
  })[0].unitCount,
  2,
  "filtering by board, class, term, subject, and part should return the exact group",
);

const termOrder = groupUnits(units, {
  board: "State Board",
  standard: "Class 10",
  subject: "English",
}).map((group) => group.term);

assert.deepStrictEqual(
  termOrder,
  ["Term 1", "Term 2", "Term 10"],
  "natural term sorting should place Term 2 before Term 10",
);

assert.strictEqual(unitCountLabel(1), "1 unit");
assert.strictEqual(unitCountLabel(3), "3 units");

console.log("subjectIdentity tests passed");
