const assert = require("node:assert/strict");
const { extractFaqsForUnit } = require("../services/learningContextService");
const base = { _id: "unit-1", documentId: "book", unitNumber: 1, subject: "English", board: "State", standard: "10" };
const qa = { question: "What is a noun?", answer: "A naming word." };
const unit = { ...base, structuredData: { question: "Structured question", answer: "Excluded" }, enrichedData: {
  faqs: [{ question: "Root question", answer: "Excluded" }],
  units: [
    { unit_number: 1, title: "Unit title", content: "Unit content", sections: [
      { title: "Section title", content: "Section content", enrichment: { faqs: [qa, { title: "Not FAQ", content: "Excluded" }, { question: " ", answer: "Invalid" }, { question: "Missing answer" }] } },
      { title: "Second section", enrichment: { faqs: [qa, { question: "What is a verb?", answer: "An action word." }] } },
    ] },
    { unit_number: 2, sections: [{ enrichment: { faqs: [{ question: "Another unit", answer: "Excluded" }] } }] },
  ],
} };
const result = extractFaqsForUnit(unit);
assert.deepEqual(result.map(({ question, answer }) => ({ question, answer })), [qa, { question: "What is a verb?", answer: "An action word." }]);
assert.equal(result[0].sectionTitle, "Section title");
assert.deepEqual(extractFaqsForUnit({ ...base, enrichedData: { units: [{ unit_number: 1, sections: [{ title: "Only prose", content: "No QA" }] }] } }), []);
assert.equal(extractFaqsForUnit({ ...base, enrichedData: { units: [{ sections: [{ enrichment: { faqs: [qa] } }] }] } }).length, 1);
assert.deepEqual(extractFaqsForUnit({ ...base, enrichedData: null }), []);
console.log("Strict FAQ extraction checks passed");
