type SubjectLabelSource = { subject?: string; title?: string; term?: string | null; part?: string | null };

export function getSubjectDisplayLabel(subject: SubjectLabelSource) {
  const clean = (value?: string | null) => String(value || "").replace(/\s+/g, " ").trim();
  const name = clean(subject.subject || subject.title)
    .replace(/\bclass\s*\d+\b/gi, "")
    .replace(/[_-]+/g, " ").trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const rawTerm = clean(subject.term);
  const termNumber = rawTerm.match(/^(?:term[\s_-]*)?(\d+)$/i);
  const term = termNumber ? `Term ${Number(termNumber[1])}` : rawTerm;
  const part = clean(subject.part).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return [name, term, part].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
