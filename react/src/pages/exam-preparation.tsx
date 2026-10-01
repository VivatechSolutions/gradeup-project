import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Flame,
  Home,
  Layers,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Zap,
  GraduationCap,
} from "lucide-react";
import Navigation from "../components/navigation";
import { useAuth } from "../hooks/use-auth";
import {
  ExamPreparation,
  ExamSetup,
  getLibrarySubjects,
  getLibraryUnitContentTitle,
  getLibraryUnitDisplayLabel,
  LibrarySubject,
  prepareExam,
} from "../lib/gradeupApi";
import roboImg from "../assets/robo.png";
import robotWaving from "../assets/dashboard/15_robot_waving.png";
import tamilSubject from "../assets/dashboard/subject-tamil.png";
import englishSubject from "../assets/dashboard/subject-english.png";
import scienceSubject from "../assets/dashboard/subject-science.png";
import socialSubject from "../assets/dashboard/subject-social.png";
import mathsSubject from "../assets/dashboard/subject-maths.png";
import "./exam-preparation.css";

export const EXAM_SETUP_STORAGE_KEY = "gradeup_exam_setup";

function setupFrom(
  subject: LibrarySubject,
  unit: LibrarySubject["units"][number]
): ExamSetup | null {
  if (unit.unitNumber == null) return null;
  return {
    unitId: unit.id,
    subjectGroupKey: subject.subjectGroupKey,
    subject: subject.subject,
    board: subject.board,
    classNumber: subject.standard,
    unitNumber: unit.unitNumber,
    unitName: getLibraryUnitContentTitle(unit),
  };
}

// ─── Theme palettes for colourful subject cards (aligned with student dashboard) ─────
function getSubjectTheme(subjectName: string) {
  const s = (subjectName || "").toLowerCase();
  if (
    s.includes("science") ||
    s.includes("physics") ||
    s.includes("chemistry") ||
    s.includes("biology")
  ) {
    return {
      color: "#10b981",
      lightBg: "linear-gradient(145deg, #ecfdf5, #d1fae5)",
      darkBg: "linear-gradient(145deg, rgba(6, 78, 59, 0.35), rgba(4, 120, 87, 0.2))",
      border: "rgba(16, 185, 129, 0.35)",
      image: scienceSubject,
      emoji: "🔬",
      badge: "Science",
    };
  }
  if (
    s.includes("math") ||
    s.includes("algebra") ||
    s.includes("geometry") ||
    s.includes("calc")
  ) {
    return {
      color: "#0284c7",
      lightBg: "linear-gradient(145deg, #f0f9ff, #e0f2fe)",
      darkBg: "linear-gradient(145deg, rgba(12, 74, 110, 0.35), rgba(3, 105, 161, 0.2))",
      border: "rgba(2, 132, 199, 0.35)",
      image: mathsSubject,
      emoji: "📐",
      badge: "Maths",
    };
  }
  if (
    s.includes("social") ||
    s.includes("history") ||
    s.includes("geography") ||
    s.includes("civics")
  ) {
    return {
      color: "#f97316",
      lightBg: "linear-gradient(145deg, #fff7ed, #ffedd5)",
      darkBg: "linear-gradient(145deg, rgba(124, 45, 18, 0.35), rgba(194, 65, 12, 0.2))",
      border: "rgba(249, 115, 22, 0.35)",
      image: socialSubject,
      emoji: "🌍",
      badge: "Social Studies",
    };
  }
  if (
    s.includes("english") ||
    s.includes("literature") ||
    s.includes("grammar")
  ) {
    return {
      color: "#f43f5e",
      lightBg: "linear-gradient(145deg, #fff1f2, #ffe4e6)",
      darkBg: "linear-gradient(145deg, rgba(136, 19, 55, 0.35), rgba(190, 18, 60, 0.2))",
      border: "rgba(244, 63, 94, 0.35)",
      image: englishSubject,
      emoji: "📖",
      badge: "English",
    };
  }
  if (
    s.includes("tamil") ||
    s.includes("hindi") ||
    s.includes("language")
  ) {
    return {
      color: "#0d9488",
      lightBg: "linear-gradient(145deg, #f0fdfa, #ccfbf1)",
      darkBg: "linear-gradient(145deg, rgba(19, 78, 74, 0.35), rgba(15, 118, 110, 0.2))",
      border: "rgba(13, 148, 136, 0.35)",
      image: tamilSubject,
      emoji: "📜",
      badge: "Language",
    };
  }
  return {
    color: "#eab308",
    lightBg: "linear-gradient(145deg, #fefce8, #fef9c3)",
    darkBg: "linear-gradient(145deg, rgba(113, 63, 18, 0.35), rgba(161, 98, 7, 0.2))",
    border: "rgba(234, 179, 8, 0.35)",
    image: null,
    emoji: "💡",
    badge: "Subject Unit",
  };
}

// ─── Priority Topic Ranking Palette ──────────────────────────────────────────
const RANK_CONFIGS = [
  { color: "#eab308", bg: "rgba(234, 179, 8, 0.15)", icon: Star, label: "Top Priority" },
  { color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", icon: Zap, label: "High Yield" },
  { color: "#0284c7", bg: "rgba(2, 132, 199, 0.15)", icon: Target, label: "Essential" },
  { color: "#f97316", bg: "rgba(249, 115, 22, 0.15)", icon: Flame, label: "Important" },
  { color: "#f43f5e", bg: "rgba(244, 63, 94, 0.15)", icon: Layers, label: "Key Concept" },
];

export default function ExamPreparationPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentRole, setCurrentRole] = useState("student");
  const [subjectKey, setSubjectKey] = useState("");
  const [unitId, setUnitId] = useState("");
  const [preparation, setPreparation] = useState<ExamPreparation | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");

  const subjectsQuery = useQuery<LibrarySubject[]>({
    queryKey: ["/api/v1/student/library/subjects", "exam-preparation"],
    queryFn: () => getLibrarySubjects(),
    staleTime: 5 * 60 * 1000,
  });

  const subjects = useMemo(() => subjectsQuery.data || [], [subjectsQuery.data]);
  const selectedSubject =
    subjects.find((subject) => subject.subjectGroupKey === subjectKey) || subjects[0];
  const eligibleUnits = useMemo(
    () => (selectedSubject?.units || []).filter((unit) => unit.unitNumber != null),
    [selectedSubject]
  );
  const selectedUnit =
    eligibleUnits.find((unit) => unit.id === unitId) || eligibleUnits[0];
  const selectedSetup =
    selectedSubject && selectedUnit ? setupFrom(selectedSubject, selectedUnit) : null;

  useEffect(() => {
    if (!subjectKey && subjects[0]) {
      setSubjectKey(subjects[0].subjectGroupKey);
    }
  }, [subjectKey, subjects]);

  useEffect(() => {
    if (selectedUnit && !eligibleUnits.some((unit) => unit.id === unitId)) {
      setUnitId(selectedUnit.id);
    }
  }, [eligibleUnits, selectedUnit, unitId]);

  const generatePreparation = async () => {
    if (!selectedSetup) return;
    setPreparing(true);
    setError("");
    try {
      const result = await prepareExam(selectedSetup);
      setPreparation(result);
      sessionStorage.setItem(EXAM_SETUP_STORAGE_KEY, JSON.stringify(selectedSetup));
    } catch (requestError: any) {
      setError(requestError?.message || "Preparation could not be generated. Please try again.");
    } finally {
      setPreparing(false);
    }
  };

  const openMainExam = () => {
    if (selectedSetup) {
      sessionStorage.setItem(EXAM_SETUP_STORAGE_KEY, JSON.stringify(selectedSetup));
    }
    setLocation("/main-exam");
  };

  const specifics = Object.entries(preparation?.subject_specifics || {}).filter(
    ([, items]) => items?.length
  );

  const firstName = user?.firstName || "Student";

  // Speech bubble text for the mascot robot
  const robotDialogue = useMemo(() => {
    if (preparing) {
      return "Analyzing past question patterns and assembling your high-yield revision pack... ⏳";
    }
    if (preparation) {
      return `Hurray ${firstName}! 🎉 Your ${preparation.subject} revision blueprint is ready. Focus on the #1 priority topic first!`;
    }
    if (selectedSubject && selectedUnit) {
      return `Awesome pick! Unit ${selectedUnit.unitNumber}: "${getLibraryUnitContentTitle(selectedUnit)}" is queued. Tap generate to create your plan! 🚀`;
    }
    return `Hi ${firstName}! 🎯 Choose your subject & chapter below. I'll build your personalized exam power pack!`;
  }, [preparing, preparation, selectedSubject, selectedUnit, firstName]);

  return (
    <div className="xp-page">
      {/* Floating playful sparkles (student dashboard style) */}
      <div className="xp-bg-spark s1" />
      <div className="xp-bg-spark s2" />
      <div className="xp-bg-spark s3" />

      <Navigation currentRole={currentRole as any} onRoleChange={setCurrentRole as any} />

      <main className="xp-shell">
        {/* Top Header / Bar */}
        <div className="xp-top-bar">
          <button className="xp-back-dash-btn" onClick={() => setLocation("/dashboard")}>
            <Home size={15} /> Dashboard
          </button>
          <span className="xp-role-badge">
            <GraduationCap size={15} /> Student Exam Mode
          </span>
        </div>

        {/* ── Hero Banner with Mascot Robot (Warm Sunshine & Emerald Mint) ── */}
        <motion.section
          className="xp-hero"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="xp-hero-content">
            <div className="xp-hero-eyebrow">
              <Sparkles size={14} /> AI Exam Preparation Engine
            </div>
            <h1 className="xp-hero-title">
              {preparation
                ? `${preparation.unit_title} Master Plan`
                : `Targeted Exam Readiness, ${firstName}!`}
            </h1>
            <p className="xp-hero-desc">
              {preparation
                ? "Customized revision guide derived directly from your textbook syllabus, Bloom levels, and verified question banks."
                : "Select an enrolled subject and chapter. We identify the highest-yield topics, formulas, and actual exam questions so you revise with maximum efficiency."}
            </p>
            <div className="xp-hero-pills">
              <span className="xp-hero-pill">
                <Target size={13} style={{ color: "#10b981" }} /> High-Yield Focus
              </span>
              <span className="xp-hero-pill">
                <BookOpen size={13} style={{ color: "#f59e0b" }} /> Syllabus Grounded
              </span>
              <span className="xp-hero-pill">
                <Zap size={13} style={{ color: "#0ea5e9" }} /> Bloom's Taxonomy
              </span>
            </div>
          </div>

          {/* Robot Mascot Stage with Speech Bubble */}
          <div className="xp-hero-robot-stage">
            <motion.div
              className="xp-robo-speech-bubble"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="xp-robo-bubble-badge">
                <Sparkles size={12} /> Study Robo · AI Companion
              </div>
              <p className="xp-robo-bubble-text">{robotDialogue}</p>
            </motion.div>
            <div className="xp-hero-robo-wrap">
              <div className="xp-hero-robo-glow" />
              <img
                src={preparation ? robotWaving : roboImg}
                alt="GradeUp AI Study Robot Mascot"
                className="xp-hero-robo-img"
              />
            </div>
          </div>
        </motion.section>

        {/* ── Main Workspace: Setup Mode or Result View ── */}
        <AnimatePresence mode="wait">
          {!preparation ? (
            <motion.section
              key="setup"
              className="xp-setup-grid"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
            >
              {/* Left Column: Steps 1 & 2 */}
              <div className="xp-setup-main">
                {/* Step 1: Choose Subject */}
                <div className="xp-card">
                  <div className="xp-step-header">
                    <div className="xp-step-num green">1</div>
                    <div>
                      <h2>Choose a Subject</h2>
                      <p>Pick from your enrolled library courses</p>
                    </div>
                  </div>

                  {subjectsQuery.isLoading ? (
                    <div className="xp-empty-box">
                      <RefreshCw size={20} className="spin" style={{ margin: "0 auto 8px" }} />
                      Loading your library courses…
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="xp-empty-box">
                      No uploaded subjects are currently available for exam preparation.
                    </div>
                  ) : (
                    <div className="xp-subjects-grid">
                      {subjects.map((subject) => {
                        const theme = getSubjectTheme(subject.subject);
                        const isSelected =
                          subject.subjectGroupKey === selectedSubject?.subjectGroupKey;
                        const cardStyles: CSSProperties & Record<string, string> = {
                          "--subject-color": theme.color,
                          "--subject-light-bg": theme.lightBg,
                          "--subject-dark-bg": theme.darkBg,
                          "--subject-border": theme.border,
                        };

                        return (
                          <motion.button
                            key={subject.subjectGroupKey}
                            style={cardStyles}
                            className={`xp-subject-card ${isSelected ? "active" : ""}`}
                            onClick={() => {
                              setSubjectKey(subject.subjectGroupKey);
                              setUnitId("");
                            }}
                            whileHover={{ y: -3, scale: 1.015 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="xp-subject-thumb">
                              {theme.image ? (
                                <img src={theme.image} alt={subject.subject} />
                              ) : (
                                <span className="xp-subject-thumb-emoji">{theme.emoji}</span>
                              )}
                            </div>
                            <div className="xp-subject-info">
                              <h3 className="xp-subject-name">{subject.subject}</h3>
                              <div className="xp-subject-meta">
                                <span className="xp-subject-pill">
                                  {subject.board} · Class {subject.standard}
                                </span>
                                <span className="xp-subject-pill">
                                  {subject.unitCount} {subject.unitCount === 1 ? "Unit" : "Units"}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="xp-subject-check">
                                <Check size={16} strokeWidth={3} />
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 2: Choose Unit */}
                <div className="xp-card">
                  <div className="xp-step-header">
                    <div className="xp-step-num amber">2</div>
                    <div>
                      <h2>Choose One Chapter / Unit</h2>
                      <p>
                        The preparation engine specializes in one comprehensive unit at a time
                      </p>
                    </div>
                  </div>

                  {eligibleUnits.length === 0 ? (
                    <div className="xp-empty-box">
                      This subject has no numbered units supported by the exam API.
                    </div>
                  ) : (
                    <div className="xp-units-grid">
                      {eligibleUnits.map((unit) => {
                        const isSelected = unit.id === selectedUnit?.id;
                        return (
                          <motion.button
                            key={unit.id}
                            className={`xp-unit-card ${isSelected ? "active" : ""}`}
                            onClick={() => setUnitId(unit.id)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="xp-unit-badge">
                              {String(unit.unitNumber).padStart(2, "0")}
                            </div>
                            <div className="xp-unit-info">
                              <h3 className="xp-unit-title">
                                {getLibraryUnitContentTitle(unit)}
                              </h3>
                              <p className="xp-unit-subtitle">
                                {getLibraryUnitDisplayLabel(unit)}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 size={18} className="xp-unit-check" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {error && <div className="xp-alert-error">{error}</div>}

                  {/* Primary Action Button (Vibrant Emerald / Teal) */}
                  <motion.button
                    className="xp-btn-primary"
                    disabled={!selectedSetup || preparing}
                    onClick={generatePreparation}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {preparing ? (
                      <>
                        <RefreshCw className="spin" size={18} />
                        Building Your Personalized Plan…
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Generate Revision Power Pack
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Right Column: Sticky Plan Summary */}
              <aside className="xp-setup-aside">
                <div className="xp-card xp-summary-card">
                  <div className="xp-summary-header">
                    <div className="xp-summary-icon">
                      <BrainCircuit size={26} />
                    </div>
                    <div>
                      <h2>Your Revision Blueprint</h2>
                      <p>Syllabus Grounded & Exam Ready</p>
                    </div>
                  </div>

                  <div className="xp-summary-rows">
                    <div className="xp-summary-row">
                      <span>Subject</span>
                      <b style={{ color: "#10b981" }}>{selectedSetup?.subject || "—"}</b>
                    </div>
                    <div className="xp-summary-row">
                      <span>Target Chapter</span>
                      <b style={{ color: "#f59e0b" }}>{selectedSetup?.unitName || "—"}</b>
                    </div>
                    <div className="xp-summary-row">
                      <span>Class & Board</span>
                      <b>
                        {selectedSetup
                          ? `${selectedSetup.board} · Class ${selectedSetup.classNumber}`
                          : "—"}
                      </b>
                    </div>
                  </div>

                  <div className="xp-summary-features">
                    <div className="xp-summary-feat">
                      <span className="xp-feat-icon gold">
                        <Star size={12} />
                      </span>
                      <span>Priority Topics Ranked by Frequency</span>
                    </div>
                    <div className="xp-summary-feat">
                      <span className="xp-feat-icon emerald">
                        <Check size={12} />
                      </span>
                      <span>Key Takeaways & Core Concepts</span>
                    </div>
                    <div className="xp-summary-feat">
                      <span className="xp-feat-icon teal">
                        <FileQuestion size={12} />
                      </span>
                      <span>Important Exam Questions Preview</span>
                    </div>
                    <div className="xp-summary-feat">
                      <span className="xp-feat-icon rose">
                        <Sparkles size={12} />
                      </span>
                      <span>Formulas & Subject-Specific Notes</span>
                    </div>
                  </div>

                  {/* Mascot Study Tip */}
                  <div className="xp-companion-tip">
                    <div className="xp-companion-tip-icon">💡</div>
                    <p>
                      <strong>Smart Study Tip:</strong> Focus on 80/20 topics first to maximize
                      retention before unit exams.
                      <small>GradeUp Study Companion</small>
                    </p>
                  </div>
                </div>
              </aside>
            </motion.section>
          ) : (
            /* ── Results Workspace: Preparation Ready ── */
            <motion.div
              key="results"
              className="xp-results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              {/* Results Top Banner */}
              <section className="xp-result-hero">
                <div>
                  <span className="xp-hero-eyebrow">
                    <Target size={14} /> Blueprint Generated
                  </span>
                  <h2 className="xp-result-hero-title">
                    {preparation.subject} · Unit {preparation.unit_number}
                  </h2>
                  <p className="xp-result-hero-sub">{preparation.unit_title}</p>
                </div>
                <div className="xp-result-stat-group">
                  <div className="xp-stat-pill">
                    <BarChart3 size={18} style={{ color: "#10b981" }} />
                    <div>
                      <b>{preparation.priority_topics?.length || 0} Topics</b>
                      <span>Ranked by frequency</span>
                    </div>
                  </div>
                  <div className="xp-stat-pill">
                    <FileQuestion size={18} style={{ color: "#f59e0b" }} />
                    <div>
                      <b>{preparation.important_questions_preview?.length || 0} Questions</b>
                      <span>Past paper previews</span>
                    </div>
                  </div>
                  <div className="xp-stat-pill">
                    <Clock3 size={18} style={{ color: "#0ea5e9" }} />
                    <div>
                      <b>{preparation.from_cache ? "Instant Cache" : "Freshly Generated"}</b>
                      <span>Verified syllabus</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 01: Priority Topics */}
              <section className="xp-card">
                <div className="xp-section-title">
                  <div className="xp-section-title-left">
                    <div className="xp-section-index gold">01</div>
                    <div>
                      <h2>Priority Topics for Revision</h2>
                      <p>Ranked strictly from highest weightage to lowest. Start at the top!</p>
                    </div>
                  </div>
                </div>

                <div className="xp-topics-list">
                  {(preparation.priority_topics || []).map((topic, index) => {
                    const rankConfig =
                      RANK_CONFIGS[index % RANK_CONFIGS.length] || RANK_CONFIGS[0];
                    const RankIcon = rankConfig.icon;

                    return (
                      <details
                        className="xp-topic-item"
                        key={`${topic.topic}-${index}`}
                        open={index === 0}
                      >
                        <summary className="xp-topic-summary">
                          <div
                            className="xp-topic-rank"
                            style={{ background: rankConfig.bg, color: rankConfig.color }}
                          >
                            #{topic.priority || index + 1}
                          </div>
                          <div className="xp-topic-header">
                            <h3 className="xp-topic-title">{topic.topic}</h3>
                            <p className="xp-topic-sub">
                              {topic.why_important || "Essential unit concept for revision"}
                            </p>
                          </div>
                          <div className="xp-topic-badges">
                            <span className="xp-badge-freq">
                              <Flame size={13} /> Asked {topic.frequency || 0}×
                            </span>
                          </div>
                        </summary>

                        <div className="xp-topic-body">
                          <div className="xp-chips-row">
                            {topic.avg_bloom != null && (
                              <span className="xp-chip-bloom">
                                🧠 Bloom Level {topic.avg_bloom}
                              </span>
                            )}
                            {topic.years?.map((year) => (
                              <span key={year} className="xp-chip-year">
                                📅 {year}
                              </span>
                            ))}
                          </div>

                          <ul className="xp-takeaways-list">
                            {(topic.key_takeaways || []).map((takeaway, tIndex) => (
                              <li key={tIndex} className="xp-takeaway-item">
                                <span className="xp-takeaway-dot">
                                  <Check size={12} strokeWidth={3} />
                                </span>
                                <span>{takeaway}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>

              {/* 02: Revision Notebook (Specifics) */}
              {specifics.length > 0 && (
                <section className="xp-card">
                  <div className="xp-section-title">
                    <div className="xp-section-title-left">
                      <div className="xp-section-index emerald">02</div>
                      <div>
                        <h2>Revision Notebook & Key Facts</h2>
                        <p>High-yield subject notes, formulas, and terminology from this chapter</p>
                      </div>
                    </div>
                  </div>

                  <div className="xp-specifics-grid">
                    {specifics.map(([categoryName, items], catIndex) => {
                      const colors = [
                        { color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" },
                        { color: "#0284c7", bg: "rgba(2, 132, 199, 0.15)", border: "rgba(2, 132, 199, 0.3)" },
                        { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)" },
                        { color: "#f43f5e", bg: "rgba(244, 63, 94, 0.15)", border: "rgba(244, 63, 94, 0.3)" },
                      ];
                      const current = colors[catIndex % colors.length];
                      const styleVars: CSSProperties & Record<string, string> = {
                        "--cat-color": current.color,
                        "--cat-bg": current.bg,
                        "--cat-border": current.border,
                      };

                      return (
                        <article key={categoryName} className="xp-specific-card" style={styleVars}>
                          <div className="xp-specific-head">
                            <div className="xp-specific-icon">
                              <Lightbulb size={16} />
                            </div>
                            <h3>{categoryName.replace(/_/g, " ")}</h3>
                          </div>
                          <ul>
                            {items.map((item, iIndex) => (
                              <li key={iIndex}>{item}</li>
                            ))}
                          </ul>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 03: Important Questions Preview */}
              <section className="xp-card">
                <div className="xp-section-title">
                  <div className="xp-section-title-left">
                    <div className="xp-section-index teal">03</div>
                    <div>
                      <h2>Important Questions Preview</h2>
                      <p>
                        Real exam-calibrated questions representative of actual paper weightage
                      </p>
                    </div>
                  </div>
                </div>

                <div className="xp-questions-grid">
                  {(preparation.important_questions_preview || []).map((q, index) => {
                    const marks = q.marks || 1;
                    const markClass = marks <= 2 ? "teal" : marks <= 4 ? "gold" : "coral";
                    const diff = (q.difficulty || "medium").toLowerCase();

                    return (
                      <article key={`${q.question}-${index}`} className="xp-question-card">
                        <div className="xp-qnum-badge">Q{index + 1}</div>
                        <div className="xp-question-content">
                          <p className="xp-question-text">{q.question}</p>
                          <div className="xp-question-chips">
                            <span className={`xp-mark-chip ${markClass}`}>
                              {marks} {marks === 1 ? "Mark" : "Marks"}
                            </span>
                            {q.difficulty && (
                              <span className={`xp-diff-chip ${diff}`}>
                                {q.difficulty}
                              </span>
                            )}
                            {q.topic && (
                              <span className="xp-chip-year">📌 {q.topic}</span>
                            )}
                            {q.year && (
                              <span className="xp-chip-year">📅 {q.year}</span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* 04: Bottom Completion Card / Launch Exam (Warm Coral & Emerald) */}
              <section className="xp-next-card">
                <div className="xp-next-card-content">
                  <span className="xp-hero-eyebrow">
                    <CheckCircle2 size={14} /> Ready For Action
                  </span>
                  <h2>Ready to Test What You Learned?</h2>
                  <p>
                    Take the timed Main Exam directly on this unit or return to setup for another chapter.
                  </p>
                </div>
                <div className="xp-next-actions">
                  <motion.button
                    className="xp-btn-coral"
                    onClick={openMainExam}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Start Main Exam <ArrowRight size={17} />
                  </motion.button>
                  <motion.button
                    className="xp-btn-outline"
                    onClick={() => {
                      setPreparation(null);
                      setError("");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowLeft size={16} /> Back to Setup
                  </motion.button>
                  <button className="xp-btn-ghost" onClick={() => setLocation("/dashboard")}>
                    <Home size={16} /> Dashboard
                  </button>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}