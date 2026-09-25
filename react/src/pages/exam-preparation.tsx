import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, BrainCircuit, CheckCircle2, Clock3, FileQuestion, Home, RefreshCw, Sparkles, Target } from "lucide-react";
import Navigation from "../components/navigation";
import { useAuth } from "../hooks/use-auth";
import { ExamPreparation, ExamSetup, getLibrarySubjects, LibrarySubject, LibraryUnit, prepareExam } from "../lib/gradeupApi";
import "./exam-preparation.css";

export const EXAM_SETUP_STORAGE_KEY = "gradeup_exam_setup";

function unitLabel(unit: LibraryUnit) {
  const number = unit.unitNumber == null ? "" : `Unit ${unit.unitNumber}`;
  return [number, unit.unitTitle || unit.chapterName].filter(Boolean).join(" · ");
}

function setupFrom(subject: LibrarySubject, unit: LibraryUnit): ExamSetup | null {
  if (unit.unitNumber == null) return null;
  return { unitId: unit.id, subjectGroupKey: subject.subjectGroupKey, subject: subject.subject, board: subject.board, classNumber: subject.standard, unitNumber: unit.unitNumber, unitName: unit.unitTitle || unit.chapterName || unit.unitLabel };
}

export default function ExamPreparationPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentRole, setCurrentRole] = useState("student");
  const [subjectKey, setSubjectKey] = useState("");
  const [unitId, setUnitId] = useState("");
  const [preparation, setPreparation] = useState<ExamPreparation | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const subjectsQuery = useQuery<LibrarySubject[]>({ queryKey: ["/api/v1/student/library/subjects", "exam-preparation"], queryFn: () => getLibrarySubjects(), staleTime: 5 * 60 * 1000 });
  const subjects = useMemo(() => subjectsQuery.data || [], [subjectsQuery.data]);
  const selectedSubject = subjects.find((subject) => subject.subjectGroupKey === subjectKey) || subjects[0];
  const eligibleUnits = useMemo(() => (selectedSubject?.units || []).filter((unit) => unit.unitNumber != null), [selectedSubject]);
  const selectedUnit = eligibleUnits.find((unit) => unit.id === unitId) || eligibleUnits[0];
  const selectedSetup = selectedSubject && selectedUnit ? setupFrom(selectedSubject, selectedUnit) : null;

  useEffect(() => { if (!subjectKey && subjects[0]) setSubjectKey(subjects[0].subjectGroupKey); }, [subjectKey, subjects]);
  useEffect(() => { if (selectedUnit && !eligibleUnits.some((unit) => unit.id === unitId)) setUnitId(selectedUnit.id); }, [eligibleUnits, selectedUnit, unitId]);

  const generatePreparation = async () => {
    if (!selectedSetup) return;
    setPreparing(true); setError("");
    try {
      const result = await prepareExam(selectedSetup);
      setPreparation(result);
      sessionStorage.setItem(EXAM_SETUP_STORAGE_KEY, JSON.stringify(selectedSetup));
    } catch (requestError: any) {
      setError(requestError?.message || "Preparation could not be generated. Please try again.");
    } finally { setPreparing(false); }
  };

  const openMainExam = () => {
    if (selectedSetup) sessionStorage.setItem(EXAM_SETUP_STORAGE_KEY, JSON.stringify(selectedSetup));
    setLocation("/main-exam");
  };
  const specifics = Object.entries(preparation?.subject_specifics || {}).filter(([, items]) => items?.length);

  return <div className="xp-page">
    <Navigation currentRole={currentRole as any} onRoleChange={setCurrentRole as any} />
    <main className="xp-shell">
      <header className="xp-heading"><div><span className="xp-eyebrow"><Sparkles size={15}/> AI exam preparation</span><h1>{preparation ? `${preparation.unit_title} study plan` : `Prepare with purpose, ${user?.firstName || "Student"}`}</h1><p>{preparation ? "Built from your textbook and question bank." : "Choose one uploaded unit and generate a focused, evidence-based revision plan."}</p></div><button className="xp-ghost" onClick={() => setLocation("/dashboard")}><Home size={16}/> Dashboard</button></header>
      {!preparation ? <section className="xp-setup-grid">
        <div className="xp-card xp-setup-card">
          <div className="xp-step"><span>1</span><div><b>Choose a subject</b><small>Only subjects available in your library are shown.</small></div></div>
          {subjectsQuery.isLoading ? <div className="xp-loading-line">Loading your subjects…</div> : subjects.length === 0 ? <div className="xp-empty">No uploaded subjects are available for exam preparation.</div> : <div className="xp-subjects">{subjects.map((subject) => <button key={subject.subjectGroupKey} className={subject.subjectGroupKey === selectedSubject?.subjectGroupKey ? "active" : ""} onClick={() => { setSubjectKey(subject.subjectGroupKey); setUnitId(""); }}><BookOpen size={18}/><span><b>{subject.subject}</b><small>{subject.board} · Class {subject.standard} · {subject.unitCount} units</small></span>{subject.subjectGroupKey === selectedSubject?.subjectGroupKey && <CheckCircle2 size={18}/>}</button>)}</div>}
          <div className="xp-divider"/><div className="xp-step"><span>2</span><div><b>Choose one unit</b><small>The preparation API currently builds one unit at a time.</small></div></div>
          <div className="xp-units">{eligibleUnits.map((unit) => <button key={unit.id} className={unit.id === selectedUnit?.id ? "active" : ""} onClick={() => setUnitId(unit.id)}><span className="xp-unit-number">{unit.unitNumber}</span><span><b>{unit.unitTitle || unit.chapterName}</b><small>{unitLabel(unit)}</small></span>{unit.id === selectedUnit?.id && <CheckCircle2 size={18}/>}</button>)}</div>
          {selectedSubject && eligibleUnits.length === 0 && <div className="xp-empty">This subject has no numbered units supported by the exam API.</div>}{error && <div className="xp-error">{error}</div>}
          <button className="xp-primary" disabled={!selectedSetup || preparing} onClick={generatePreparation}>{preparing ? <><RefreshCw className="spin" size={18}/> Building preparation…</> : <><Sparkles size={18}/> Generate preparation</>}</button>
        </div>
        <aside className="xp-card xp-summary"><div className="xp-summary-icon"><BrainCircuit size={30}/></div><h2>Your focused plan</h2><p>The response is organized around the real API—not fixed FAQs or invented exam parts.</p><div className="xp-summary-row"><span>Subject</span><b>{selectedSetup?.subject || "—"}</b></div><div className="xp-summary-row"><span>Unit</span><b>{selectedSetup?.unitName || "—"}</b></div><div className="xp-summary-row"><span>Board / Class</span><b>{selectedSetup ? `${selectedSetup.board} · ${selectedSetup.classNumber}` : "—"}</b></div><ul><li>Priority topics</li><li>Key takeaways</li><li>Important questions</li><li>Subject-specific revision notes</li></ul></aside>
      </section> : <div className="xp-results">
        <section className="xp-result-hero"><div><span className="xp-eyebrow"><Target size={15}/> Preparation ready</span><h2>{preparation.subject} · Unit {preparation.unit_number}</h2><p>{preparation.unit_title}</p></div><div className="xp-result-meta"><span><BarChart3 size={16}/> {preparation.priority_topics?.length || 0} priority topics</span><span><FileQuestion size={16}/> {preparation.important_questions_preview?.length || 0} question previews</span><span><Clock3 size={16}/> {preparation.from_cache ? "Loaded from cache" : "Freshly generated"}</span></div></section>
        <section className="xp-section"><div className="xp-section-title"><div><span>01</span><h2>Priority topics</h2></div><p>Start at the top and work down.</p></div><div className="xp-topic-grid">{(preparation.priority_topics || []).map((topic, index) => <details className="xp-topic" key={`${topic.topic}-${index}`} open={index === 0}><summary><span className="xp-rank">#{topic.priority || index + 1}</span><div><h3>{topic.topic}</h3><p>{topic.why_important || "Recommended for revision"}</p></div><span className="xp-frequency">Asked {topic.frequency || 0}×</span></summary><div className="xp-topic-body"><div className="xp-chips">{topic.avg_bloom != null && <span>Bloom {topic.avg_bloom}</span>}{topic.years?.map((year) => <span key={year}>{year}</span>)}</div><ul>{(topic.key_takeaways || []).map((takeaway) => <li key={takeaway}>{takeaway}</li>)}</ul></div></details>)}</div></section>
        {specifics.length > 0 && <section className="xp-section"><div className="xp-section-title"><div><span>02</span><h2>Revision notebook</h2></div><p>Key subject-specific facts from the selected unit.</p></div><div className="xp-specifics">{specifics.map(([name, items]) => <article key={name}><h3>{name.replace(/_/g, " ")}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></section>}
        <section className="xp-section"><div className="xp-section-title"><div><span>03</span><h2>Important question preview</h2></div><p>Questions are previews for revision, not a fabricated paper.</p></div><div className="xp-questions">{(preparation.important_questions_preview || []).map((question, index) => <article key={`${question.question}-${index}`}><div className="xp-qnum">Q{index + 1}</div><div><p>{question.question}</p><div className="xp-chips"><span>{question.marks || 0} marks</span>{question.difficulty && <span>{question.difficulty}</span>}{question.topic && <span>{question.topic}</span>}{question.year && <span>{question.year}</span>}</div></div></article>)}</div></section>
        <section className="xp-next-card"><div><span className="xp-eyebrow"><CheckCircle2 size={15}/> Preparation complete</span><h2>Ready to test what you learned?</h2><p>Start now, return to setup, or begin later from the Main Exam page.</p></div><div className="xp-actions"><button className="xp-primary" onClick={openMainExam}>Start Main Exam <ArrowRight size={18}/></button><button className="xp-secondary" onClick={() => { setPreparation(null); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ArrowLeft size={17}/> Back to setup</button><button className="xp-ghost" onClick={() => setLocation("/dashboard")}><Home size={17}/> Not now</button></div></section>
      </div>}
    </main>
  </div>;
}
