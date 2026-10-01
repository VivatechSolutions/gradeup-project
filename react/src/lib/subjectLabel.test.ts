import { getSubjectDisplayLabel } from "./subjectLabel";

test.each([
  [{ subject: "english", standard: "10", term: null }, "English"],
  [{ subject: "English Class10", term: "term_1" }, "English Term 1"],
  [{ subject: "social", term: "1", part: "history" }, "Social Term 1 History"],
  [{ subject: "social", term: null, part: "history" }, "Social History"],
])("formats subject context without class", (subject, expected) => {
  expect(getSubjectDisplayLabel(subject)).toBe(expected);
});
