import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import {
  BookOpen, Clock, Send, Plus, Award,
  Search, Paperclip, CheckCircle2, X, Sparkles,
  ChevronRight, ArrowRight, ArrowLeft, FileText, HelpCircle,
  Check, AlertCircle, RefreshCw, Layers, Calendar as CalendarIcon,
  Target, Zap, ShieldCheck, Sun, Moon, UploadCloud,
  Shuffle, Play, Pause, Compass,
  Sparkle, BookCheck, Timer, HelpCircle as QuestionIcon
} from "lucide-react";
import robo from "../assets/robo.png";
import { useTheme } from "../hooks/use-theme";

// ─── API ABSTRACTION LAYER ────────────────────────────────────────────────────
export const API = {
  getModules:       () => Promise.resolve(mockModules),
  createModule:     (m: any) => Promise.resolve({ ...m, id: `mod-${Date.now()}` }),
  updateModule:     (m: any) => Promise.resolve(m),
  deleteModule:     (id: string) => Promise.resolve({ id }),
  getChapters:      (moduleId: string) => Promise.resolve(mockModules.find(m => m.id === moduleId)?.chapters || []),
  createChapter:    (c: any) => Promise.resolve({ ...c, id: `chap-${Date.now()}` }),
  updateChapter:    (c: any) => Promise.resolve(c),
  deleteChapter:    (id: string) => Promise.resolve({ id }),
  getLessons:       () => Promise.resolve(initialLessons),
  createLesson:     (l: any) => Promise.resolve({ ...l, id: `les-${Date.now()}` }),
  updateLesson:     (l: any) => Promise.resolve(l),
  deleteLesson:     (id: string) => Promise.resolve({ id }),
  getResources:     () => Promise.resolve(mockResources),
  uploadResource:   (r: any) => Promise.resolve({ ...r, id: `res-${Date.now()}` }),
  deleteResource:   (id: string) => Promise.resolve({ id }),
  publishModule:    (id: string, settings: any) => Promise.resolve({ id, ...settings }),
  getPublishStatus: () => Promise.resolve(mockPublishStatus),
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const mockModules = [
  {
    id: "mod-1", title: "Module 1: Algebra Basics & Functions", subject: "Mathematics",
    dueDate: "2026-09-30", status: "in-progress", completedChapters: 1, totalChapters: 3,
    color: "#10b981", iconName: "calculator",
    chapters: [
      { id: "c1", moduleId: "mod-1", title: "Introduction to Variables & Constants", status: "completed",   duration: 45, type: "lecture",  objectives: "Understand algebraic symbols, variables, and numerical expressions", resources: ["res-1"] },
      { id: "c2", moduleId: "mod-1", title: "Solving Multi-Step Linear Equations",   status: "in-progress", duration: 50, type: "lecture",  objectives: "Solve one-step, two-step, and inverse operations equations",  resources: [] },
      { id: "c3", moduleId: "mod-1", title: "Graphing Coordinates & Linear Slope",   status: "not-started", duration: 55, type: "lab",      objectives: "Plot equations on coordinate plane with slope-intercept form", resources: ["res-2"] },
    ],
  },
  {
    id: "mod-2", title: "Module 2: Euclidean Geometry & Proofs", subject: "Mathematics",
    dueDate: "2026-10-31", status: "not-started", completedChapters: 0, totalChapters: 2,
    color: "#f59e0b", iconName: "shapes",
    chapters: [
      { id: "c4", moduleId: "mod-2", title: "Properties of Triangles & Congruence",  status: "not-started", duration: 45, type: "lecture",  objectives: "Identify triangle types, angles, and Pythagorean theorem proofs", resources: [] },
      { id: "c5", moduleId: "mod-2", title: "Circles, Chords & Arc Circumference",    status: "not-started", duration: 40, type: "activity", objectives: "Calculate circumference, radius, tangents, and sector area", resources: ["res-3"] },
    ],
  },
  {
    id: "mod-3", title: "Module 3: Trigonometric Identities & Radian Circles", subject: "Mathematics",
    dueDate: "2026-11-30", status: "not-started", completedChapters: 0, totalChapters: 3,
    color: "#0ea5e9", iconName: "compass",
    chapters: [
      { id: "c6", moduleId: "mod-3", title: "Sine, Cosine, Tangent Fundamentals",     status: "not-started", duration: 60, type: "lecture", objectives: "Memorize and apply fundamental right-angle trig ratios", resources: [] },
      { id: "c7", moduleId: "mod-3", title: "The Unit Circle & Radian Measures",      status: "not-started", duration: 55, type: "lab",     objectives: "Navigate radian degrees and master coordinates on unit circle", resources: [] },
      { id: "c8", moduleId: "mod-3", title: "Pythagorean Trigonometric Proofs",       status: "not-started", duration: 65, type: "lecture", objectives: "Prove and apply core Pythagorean trigonometric identities", resources: [] },
    ],
  },
];

const initialLessons = [
  { id: "les-1", chapterId: "c1", title: "Lesson 1: Variable Definition & Expressions", duration: 25, difficulty: "easy", status: "completed", questionsCount: 4, xp: 50 },
  { id: "les-2", chapterId: "c1", title: "Lesson 2: Combining Like Terms", duration: 20, difficulty: "easy", status: "completed", questionsCount: 5, xp: 60 },
  { id: "les-3", chapterId: "c2", title: "Lesson 3: Isolating Single Variables", duration: 30, difficulty: "medium", status: "in-progress", questionsCount: 6, xp: 80 },
  { id: "les-4", chapterId: "c2", title: "Lesson 4: Word Problems into Equations", duration: 20, difficulty: "hard", status: "not-started", questionsCount: 5, xp: 100 },
];

const initialQuestions = [
  {
    id: "q-1",
    lessonId: "les-1",
    moduleTitle: "Module 1: Algebra Basics",
    question: "If 3x + 7 = 22, what is the value of 2x - 1?",
    type: "mcq",
    options: ["7", "9", "11", "15"],
    correctAnswer: "9",
    explanation: "Subtract 7 from 22 to get 3x = 15, so x = 5. Then compute 2(5) - 1 = 9.",
    difficulty: "easy",
    points: 5,
    bloomLevel: "Application",
    subject: "Algebra"
  },
  {
    id: "q-2",
    lessonId: "les-2",
    moduleTitle: "Module 1: Algebra Basics",
    question: "Simplify the algebraic expression: 4(2a - 3) - 3(a - 4)",
    type: "mcq",
    options: ["5a", "5a - 24", "5a + 0", "11a"],
    correctAnswer: "5a",
    explanation: "Expand: 8a - 12 - 3a + 12. Combine like terms: (8a - 3a) + (-12 + 12) = 5a.",
    difficulty: "medium",
    points: 10,
    bloomLevel: "Analysis",
    subject: "Algebra"
  },
  {
    id: "q-3",
    lessonId: "les-3",
    moduleTitle: "Module 1: Algebra Basics",
    question: "The graph of the equation y = -3/4 x + 6 has a slope of -3/4 and y-intercept of (0, 6).",
    type: "true_false",
    options: ["True", "False"],
    correctAnswer: "True",
    explanation: "In slope-intercept form y = mx + b, m represents the slope (-3/4) and b is the y-intercept (6).",
    difficulty: "easy",
    points: 5,
    bloomLevel: "Comprehension",
    subject: "Graphing"
  },
  {
    id: "q-4",
    lessonId: "les-4",
    moduleTitle: "Module 2: Geometry",
    question: "In a right triangle with legs of length 6 cm and 8 cm, what is the length of the hypotenuse?",
    type: "mcq",
    options: ["10 cm", "12 cm", "14 cm", "100 cm"],
    correctAnswer: "10 cm",
    explanation: "By Pythagorean theorem: a^2 + b^2 = c^2 -> 36 + 64 = 100 -> c = sqrt(100) = 10 cm.",
    difficulty: "easy",
    points: 5,
    bloomLevel: "Knowledge",
    subject: "Geometry"
  },
  {
    id: "q-5",
    lessonId: "les-4",
    moduleTitle: "Module 3: Trigonometry",
    question: "What is the exact value of sin(30°) + cos(60°)?",
    type: "mcq",
    options: ["1/2", "1", "sqrt(3)/2", "2"],
    correctAnswer: "1",
    explanation: "sin(30°) = 0.5, and cos(60°) = 0.5. 0.5 + 0.5 = 1.",
    difficulty: "hard",
    points: 15,
    bloomLevel: "Evaluation",
    subject: "Trigonometry"
  }
];

const mockResources = [
  { id: "res-1", title: "Algebra Foundations Lecture Deck.pdf", type: "pdf", size: "3.4 MB", uploadDate: "2026-09-12", url: "#", downloads: 42 },
  { id: "res-2", title: "Interactive Coordinate Plotter Sheet.xlsx", type: "sheet", size: "1.2 MB", uploadDate: "2026-09-15", url: "#", downloads: 28 },
  { id: "res-3", title: "Unit Circle Compass Guide.pdf", type: "pdf", size: "5.1 MB", uploadDate: "2026-09-18", url: "#", downloads: 64 },
  { id: "res-4", title: "Pythagorean Theorem Discovery Lab.docx", type: "doc", size: "890 KB", uploadDate: "2026-09-20", url: "#", downloads: 19 },
];

const mockPublishStatus = {
  publishedToStudents: true,
  publishDate: "2026-09-21",
  notifyStudents: true,
  enableDiscussions: true,
};

// ─── STYLES (MATCHES STUDENT DASHBOARD PALETTE - NO PURPLE/BLUE GRADIENT) ────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.sd-root {
  min-height: 100vh;
  padding: 20px 24px 60px;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  color: var(--sd-ink);
  background: radial-gradient(circle at 14% 0%, rgba(16, 185, 129, 0.08), transparent 28%),
              radial-gradient(circle at 88% 5%, rgba(245, 158, 11, 0.08), transparent 28%),
              linear-gradient(180deg, #ffffff 0%, #ffffff 80px, #f8fafc 100%);
  --sd-page: #ffffff;
  --sd-page-2: #f8fafc;
  --sd-card: #ffffff;
  --sd-card-soft: #f8fafc;
  --sd-ink: #071235;
  --sd-muted: #64748b;
  --sd-faint: #94a3b8;
  --sd-line: rgba(15, 23, 42, 0.08);
  --sd-shadow: 0 12px 30px rgba(35, 44, 87, 0.08);
  --sd-shadow-soft: 0 7px 18px rgba(35, 44, 87, 0.06);
  --sd-emerald: #10b981;
  --sd-emerald-dark: #059669;
  --sd-emerald-light: #ecfdf5;
  --sd-amber: #f59e0b;
  --sd-amber-light: #fffbeb;
  --sd-sky: #0ea5e9;
  --sd-sky-light: #f0f9ff;
  position: relative;
  overflow-x: hidden;
  transition: background 0.3s ease, color 0.3s ease;
}

[data-theme="dark"] .sd-root,
.dark .sd-root,
.sd-root.dark,
.sd-root.dark-theme,
.sd-root[data-theme="dark"] {
  --sd-page: #000000 !important;
  --sd-page-2: #08090d !important;
  --sd-card: #0d0e12 !important;
  --sd-card-soft: #14161c !important;
  --sd-ink: #f8fafc !important;
  --sd-muted: #94a3b8 !important;
  --sd-faint: #64748b !important;
  --sd-line: rgba(255, 255, 255, 0.08) !important;
  --sd-shadow: 0 20px 54px rgba(0, 0, 0, 0.65) !important;
  --sd-shadow-soft: 0 12px 30px rgba(0, 0, 0, 0.45) !important;
  --sd-emerald-light: rgba(16, 185, 129, 0.14) !important;
  --sd-amber-light: rgba(245, 158, 11, 0.14) !important;
  --sd-sky-light: rgba(14, 165, 233, 0.14) !important;
  background: radial-gradient(circle at 14% 0%, rgba(16, 185, 129, 0.12), transparent 28%),
              radial-gradient(circle at 88% 5%, rgba(245, 158, 11, 0.10), transparent 28%),
              linear-gradient(180deg, #000000 0%, #000000 80px, #08090d 100%) !important;
  color: #f8fafc !important;
}

/* Animations */
@keyframes cardIn {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes sdBreathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes sdPulseSoft { 0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.25); } 50% { box-shadow: 0 0 0 9px rgba(16, 185, 129, 0); } }
@keyframes sdShine { 0% { transform: translateX(-120%) rotate(20deg); } 45%, 100% { transform: translateX(220%) rotate(20deg); } }
@keyframes sdFloatSlow { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
@keyframes sdGlowPulse {
  0%, 100% { box-shadow: 0 0 16px rgba(16, 185, 129, 0.2); }
  50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.4); }
}

/* Hero Banner */
.sd-hero {
  position: relative;
  overflow: hidden;
  min-height: 220px;
  border-radius: 22px;
  padding: 26px 32px;
  background: linear-gradient(135deg, #e6f9e8 0%, #f0faf2 50%, #ffffff 100%);
  border: 1px solid rgba(16, 185, 129, 0.22);
  box-shadow: var(--sd-shadow);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
  transition: all 0.3s ease;
  animation: cardIn 0.42s both;
}

[data-theme="dark"] .sd-hero,
.dark .sd-hero,
.sd-root.dark .sd-hero {
  background: linear-gradient(135deg, #031c10 0%, #051a24 55%, #07121d 100%) !important;
  border-color: rgba(16, 185, 129, 0.25) !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6) !important;
}

.sd-hero::after {
  content: "";
  position: absolute;
  top: -50px;
  bottom: -50px;
  width: 90px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.32), transparent);
  animation: sdShine 7s ease-in-out infinite;
}

.sd-hero-content {
  position: relative;
  z-index: 2;
  max-width: 620px;
}

.sd-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(16, 185, 129, 0.15);
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.3);
  margin-bottom: 12px;
}

[data-theme="dark"] .sd-chip {
  background: rgba(16, 185, 129, 0.22);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.4);
}

.sd-hero-title {
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 900;
  line-height: 1.15;
  color: var(--sd-ink);
  margin: 0 0 10px;
  letter-spacing: -0.02em;
}

.sd-hero-desc {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--sd-muted);
  margin: 0 0 20px;
}

.sd-hero-btns {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.sd-btn-emerald {
  border: 0;
  border-radius: 14px;
  padding: 11px 20px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.sd-btn-emerald:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 26px rgba(16, 185, 129, 0.42);
}

.sd-btn-subtle {
  border: 1px solid var(--sd-line);
  border-radius: 14px;
  padding: 11px 18px;
  background: var(--sd-card);
  color: var(--sd-ink);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--sd-shadow-soft);
  transition: transform 0.18s ease, background 0.18s ease;
}

.sd-btn-subtle:hover {
  transform: translateY(-2px);
  background: var(--sd-card-soft);
}

/* Hero Mascot */
.sd-hero-robo-wrap {
  position: relative;
  z-index: 2;
  flex: 0 0 260px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sd-hero-robo-glow {
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.28), rgba(245, 158, 11, 0.12), transparent 70%);
  filter: blur(14px);
  animation: sdBreathe 4s ease-in-out infinite;
}

.sd-hero-robo-img {
  width: 190px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 20px 22px rgba(10, 40, 25, 0.25));
  animation: sdFloatSlow 5s ease-in-out infinite;
}

.sd-robo-bubble {
  position: absolute;
  top: 10px;
  right: -10px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  padding: 7px 12px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-ink);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  animation: sdBreathe 4s ease-in-out infinite;
}

/* Metric Launchpad Cards */
.sd-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.sd-stat-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 18px;
  padding: 18px;
  box-shadow: var(--sd-shadow-soft);
  display: flex;
  align-items: center;
  gap: 14px;
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.24s ease, border-color 0.24s ease;
  animation: cardIn 0.42s both;
}
.sd-stat-card:nth-child(1) { animation-delay: 0.05s; }
.sd-stat-card:nth-child(2) { animation-delay: 0.12s; }
.sd-stat-card:nth-child(3) { animation-delay: 0.19s; }
.sd-stat-card:nth-child(4) { animation-delay: 0.26s; }

.sd-stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--sd-shadow);
  border-color: rgba(16, 185, 129, 0.45);
}

.sd-stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  font-size: 22px;
  flex: 0 0 auto;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sd-stat-card:hover .sd-stat-icon {
  transform: scale(1.18) rotate(6deg);
}

.sd-stat-info {
  flex: 1;
  min-width: 0;
}

.sd-stat-num {
  font-size: 22px;
  font-weight: 900;
  line-height: 1.1;
  color: var(--sd-ink);
}

.sd-stat-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--sd-muted);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Tabs Bar */
.sd-tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--sd-line);
  padding-bottom: 12px;
  flex-wrap: wrap;
}

.sd-tabs-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sd-tab-btn {
  border: 0;
  background: transparent;
  padding: 9px 16px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 800;
  color: var(--sd-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  transition: all 0.18s ease;
}

.sd-tab-btn:hover {
  color: var(--sd-ink);
  background: var(--sd-card-soft);
}

.sd-tab-btn.active {
  color: var(--sd-ink);
  background: var(--sd-card);
  box-shadow: var(--sd-shadow-soft);
  border: 1px solid var(--sd-line);
}

.sd-tab-indicator {
  position: absolute;
  bottom: -13px;
  left: 12px;
  right: 12px;
  height: 3px;
  border-radius: 999px;
  background: #10b981;
}

.sd-theme-toggle {
  border: 1px solid var(--sd-line);
  background: var(--sd-card);
  color: var(--sd-ink);
  border-radius: 12px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--sd-shadow-soft);
  transition: transform 0.18s ease, background 0.18s ease;
}

.sd-theme-toggle:hover {
  transform: translateY(-2px);
  background: var(--sd-card-soft);
}

/* Bento Modules Grid */
.sd-bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.sd-module-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 20px;
  padding: 22px;
  box-shadow: var(--sd-shadow-soft);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.24s ease, border-color 0.24s ease;
  animation: cardIn 0.45s both;
}
.sd-module-card:nth-child(1) { animation-delay: 0.06s; }
.sd-module-card:nth-child(2) { animation-delay: 0.12s; }
.sd-module-card:nth-child(3) { animation-delay: 0.18s; }
.sd-module-card:nth-child(4) { animation-delay: 0.24s; }
.sd-module-card:nth-child(5) { animation-delay: 0.30s; }
.sd-module-card:nth-child(6) { animation-delay: 0.36s; }

.sd-module-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--sd-shadow), 0 14px 28px rgba(16, 185, 129, 0.14);
  border-color: rgba(16, 185, 129, 0.45);
}

.sd-module-badge {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.sd-module-title {
  font-size: 17px;
  font-weight: 900;
  color: var(--sd-ink);
  margin: 0 0 10px;
  line-height: 1.3;
}

.sd-module-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--sd-muted);
  margin-bottom: 18px;
}

.sd-chapters-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  flex: 1;
}

.sd-chapter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--sd-ink);
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.sd-chapter-row:hover {
  transform: translateX(4px);
  border-color: rgba(16, 185, 129, 0.5);
  background: var(--sd-card);
}

.sd-chapter-tag {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 6px;
  text-transform: uppercase;
}

.sd-card-footer {
  border-top: 1px solid var(--sd-line);
  padding-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

/* Question Studio & Transitions */
.sd-q-studio-container {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
}

.sd-q-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 22px;
  padding: 28px;
  box-shadow: var(--sd-shadow);
  position: relative;
  overflow: hidden;
}

.sd-q-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--sd-line);
}

.sd-q-number {
  font-size: 13px;
  font-weight: 900;
  color: #10b981;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sd-q-prompt {
  font-size: 19px;
  font-weight: 800;
  line-height: 1.45;
  color: var(--sd-ink);
  margin-bottom: 24px;
}

.sd-options-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.sd-option-btn {
  border: 1.5px solid var(--sd-line);
  border-radius: 16px;
  padding: 14px 18px;
  background: var(--sd-card-soft);
  color: var(--sd-ink);
  font-size: 14.5px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.sd-option-btn:hover {
  transform: translateX(4px);
  border-color: rgba(16, 185, 129, 0.5);
  background: var(--sd-card);
}

.sd-option-btn.selected {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  color: var(--sd-ink);
}

.sd-option-btn.correct {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.2);
  box-shadow: 0 0 0 1px #10b981;
}

.sd-option-indicator {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 900;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  color: var(--sd-muted);
  flex: 0 0 auto;
}

.sd-option-btn.selected .sd-option-indicator {
  background: #10b981;
  color: #ffffff;
  border-color: #10b981;
}

.sd-q-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--sd-line);
  padding-top: 20px;
}

.sd-explanation-box {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 16px;
  padding: 16px;
  margin-top: 20px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--sd-ink);
}

/* Delivery Timer Widget */
.sd-timer-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 22px;
  padding: 24px;
  box-shadow: var(--sd-shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.sd-timer-circle {
  width: 170px;
  height: 170px;
  border-radius: 50%;
  border: 6px solid rgba(16, 185, 129, 0.2);
  border-top-color: #10b981;
  display: grid;
  place-items: center;
  margin: 18px 0;
  position: relative;
}

.sd-timer-digits {
  font-size: 38px;
  font-weight: 900;
  color: var(--sd-ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.sd-timer-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  flex-wrap: wrap;
  justify-content: center;
}

.sd-timer-pill {
  border: 1px solid var(--sd-line);
  background: var(--sd-card-soft);
  color: var(--sd-muted);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sd-timer-pill.active {
  background: #10b981;
  color: #ffffff;
  border-color: #10b981;
}

/* Modals */
.sd-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  z-index: 999;
  display: grid;
  place-items: center;
  padding: 16px;
}

.sd-modal-content {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 24px;
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px;
  box-shadow: var(--sd-shadow);
  color: var(--sd-ink);
}

.sd-modal-input {
  width: 100%;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card-soft);
  color: var(--sd-ink);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13.5px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.18s ease;
  margin-top: 6px;
}

.sd-modal-input:focus {
  border-color: #10b981;
  background: var(--sd-card);
}

/* Responsive */
@media (max-width: 1024px) {
  .sd-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .sd-bento-grid { grid-template-columns: repeat(2, 1fr); }
  .sd-q-studio-container { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .sd-root { padding: 14px 12px 40px; }
  .sd-hero { flex-direction: column; text-align: center; padding: 20px 16px; }
  .sd-hero-robo-wrap { flex: 0 0 auto; margin-top: 10px; }
  .sd-stats-grid { grid-template-columns: 1fr; }
  .sd-bento-grid { grid-template-columns: 1fr; }
  .sd-hero-btns { justify-content: center; }
}
`;

// ─── HELPER NUMBER COUNTER ───────────────────────────────────────────────────
function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      setVal(Math.round((target * Math.min(frame, 35)) / 35));
      if (frame < 35) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{val}{suffix}</>;
}

// ─── QUESTION TRANSITION VARIANTS ────────────────────────────────────────────
const questionVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 320, damping: 28 },
      opacity: { duration: 0.22 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
    scale: 0.96,
    transition: {
      x: { type: "spring", stiffness: 320, damping: 28 },
      opacity: { duration: 0.18 },
    },
  }),
};

// ─── MAIN TEACHER CURRICULUM PLANNER COMPONENT ────────────────────────────────
export default function TeacherCurriculumPlannerPage() {
  const { toggleTheme, isDark } = useTheme();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<"architecture" | "questions" | "delivery" | "roadmap" | "resources" | "calendar">("architecture");

  // Modules & Chapters State
  const [modules, setModules] = useState(mockModules);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("mod-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");

  // Question Studio State
  const [questions, setQuestions] = useState(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);

  // Delivery Timer State
  const [timerStage, setTimerStage] = useState<"lecture" | "practice" | "quiz">("lecture");
  const [timerSeconds, setTimerSeconds] = useState(1200); // 20 mins default
  const [timerRunning, setTimerRunning] = useState(false);

  // Modals & Drawers
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active module
  const activeModule = useMemo(() => {
    return modules.find(m => m.id === selectedModuleId) || modules[0];
  }, [modules, selectedModuleId]);

  // Delivery Timer Hook
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const handleTimerPreset = (stage: "lecture" | "practice" | "quiz", durationSecs: number) => {
    setTimerStage(stage);
    setTimerSeconds(durationSecs);
    setTimerRunning(false);
  };

  const formatTimerDigits = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Toast Trigger
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Question Navigation with directional animation
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setSlideDirection(1);
      setCurrentQuestionIndex(i => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setSlideDirection(-1);
      setCurrentQuestionIndex(i => i - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const shuffleQuestions = () => {
    setSlideDirection(1);
    setCurrentQuestionIndex(Math.floor(Math.random() * questions.length));
    setSelectedAnswer(null);
    setShowExplanation(false);
    triggerToast("Randomized question selection!");
  };

  // Filtered modules
  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = filterSubject === "all" || m.subject.toLowerCase() === filterSubject.toLowerCase();
      return matchesSearch && matchesSubject;
    });
  }, [modules, searchQuery, filterSubject]);

  // Current Question
  const curQ = questions[currentQuestionIndex] || questions[0];

  return (
    <>
      <style>{STYLES}</style>
      <div
        className={`sd-root ${isDark ? "dark dark-theme" : ""}`}
        data-theme={isDark ? "dark" : "light"}
      >
        {/* Floating Sparks */}
        <div style={{ position: "absolute", top: 40, left: "10%", width: 8, height: 8, borderRadius: "50%", background: "#10b981", opacity: 0.6, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 120, right: "12%", width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", opacity: 0.6, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 380, left: "4%", width: 7, height: 7, borderRadius: "50%", background: "#0ea5e9", opacity: 0.5, pointerEvents: "none" }} />

        {/* ─── HERO BANNER WITH ROBO MASCOT & ACTIONS ────────────────────────── */}
        <div className="sd-hero">
          <div className="sd-hero-content">
            <div className="sd-chip">
              <Sparkles size={14} className="text-emerald-500" />
              <span>AI CURRICULUM ARCHITECT & STUDIO</span>
            </div>
            <h1 className="sd-hero-title">
              Orchestrate High-Impact Learning Plans
            </h1>
            <p className="sd-hero-desc">
              Design cohesive syllabi, test interactive questions with live spring transitions, and deliver classroom pacing with real-time analytics.
            </p>
            <div className="sd-hero-btns">
              <button
                className="sd-btn-emerald"
                onClick={() => setShowAddModuleModal(true)}
              >
                <Plus size={16} />
                <span>New Module</span>
              </button>
              <button
                className="sd-btn-subtle"
                onClick={() => setActiveTab("questions")}
              >
                <Zap size={16} className="text-amber-500" />
                <span>Test Question Studio</span>
              </button>
              <button
                className="sd-btn-subtle"
                onClick={() => setActiveTab("delivery")}
              >
                <Timer size={16} className="text-emerald-500" />
                <span>Live Delivery Timer</span>
              </button>
            </div>
          </div>

          <div className="sd-hero-robo-wrap">
            <div className="sd-hero-robo-glow" />
            <img
              src={robo}
              alt="GradeUp Robo Copilot"
              className="sd-hero-robo-img"
            />
            <div className="sd-robo-bubble">
              <Sparkle size={13} color="#10b981" />
              <span>94% Pacing On Track</span>
            </div>
          </div>
        </div>

        {/* ─── METRIC LAUNCHPAD TILES ────────────────────────────────────────── */}
        <div className="sd-stats-grid">
          <div className="sd-stat-card">
            <div className="sd-stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              <BookOpen size={22} />
            </div>
            <div className="sd-stat-info">
              <div className="sd-stat-num">
                <AnimNum target={modules.length} /> Units
              </div>
              <div className="sd-stat-label">Active Modules & Core Curriculum</div>
            </div>
          </div>

          <div className="sd-stat-card">
            <div className="sd-stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
              <Layers size={22} />
            </div>
            <div className="sd-stat-info">
              <div className="sd-stat-num">
                <AnimNum target={modules.reduce((acc, m) => acc + m.chapters.length, 0)} /> Chapters
              </div>
              <div className="sd-stat-label">Structured Learning Objectives</div>
            </div>
          </div>

          <div className="sd-stat-card">
            <div className="sd-stat-icon" style={{ background: "rgba(14, 165, 233, 0.15)", color: "#0ea5e9" }}>
              <HelpCircle size={22} />
            </div>
            <div className="sd-stat-info">
              <div className="sd-stat-num">
                <AnimNum target={questions.length} /> Items
              </div>
              <div className="sd-stat-label">Interactive Question Studio</div>
            </div>
          </div>

          <div className="sd-stat-card">
            <div className="sd-stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              <ShieldCheck size={22} />
            </div>
            <div className="sd-stat-info">
              <div className="sd-stat-num">
                <AnimNum target={88} suffix="%" />
              </div>
              <div className="sd-stat-label">Publishing & Delivery Ready</div>
            </div>
          </div>
        </div>

        {/* ─── WORKSPACE NAVIGATION TABS & THEME TOGGLE ──────────────────────── */}
        <div className="sd-tabs-bar">
          <div className="sd-tabs-group">
            <button
              className={`sd-tab-btn ${activeTab === "architecture" ? "active" : ""}`}
              onClick={() => setActiveTab("architecture")}
            >
              <Layers size={16} />
              <span>Curriculum Architecture</span>
              {activeTab === "architecture" && <div className="sd-tab-indicator" />}
            </button>
            <button
              className={`sd-tab-btn ${activeTab === "questions" ? "active" : ""}`}
              onClick={() => setActiveTab("questions")}
            >
              <QuestionIcon size={16} />
              <span>Question Studio & Transitions</span>
              {activeTab === "questions" && <div className="sd-tab-indicator" />}
            </button>
            <button
              className={`sd-tab-btn ${activeTab === "delivery" ? "active" : ""}`}
              onClick={() => setActiveTab("delivery")}
            >
              <Clock size={16} />
              <span>Live Delivery & Pacing</span>
              {activeTab === "delivery" && <div className="sd-tab-indicator" />}
            </button>
            <button
              className={`sd-tab-btn ${activeTab === "roadmap" ? "active" : ""}`}
              onClick={() => setActiveTab("roadmap")}
            >
              <Compass size={16} />
              <span>Syllabus Roadmap</span>
              {activeTab === "roadmap" && <div className="sd-tab-indicator" />}
            </button>
            <button
              className={`sd-tab-btn ${activeTab === "resources" ? "active" : ""}`}
              onClick={() => setActiveTab("resources")}
            >
              <Paperclip size={16} />
              <span>Materials Vault</span>
              {activeTab === "resources" && <div className="sd-tab-indicator" />}
            </button>
            <button
              className={`sd-tab-btn ${activeTab === "calendar" ? "active" : ""}`}
              onClick={() => setActiveTab("calendar")}
            >
              <CalendarIcon size={16} />
              <span>Calendar</span>
              {activeTab === "calendar" && <div className="sd-tab-indicator" />}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Dark Mode Switcher */}
            <button
              className="sd-theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
            >
              {isDark ? (
                <>
                  <Sun size={15} color="#f59e0b" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={15} color="#0ea5e9" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            <button
              className="sd-btn-emerald"
              style={{ padding: "8px 14px", fontSize: "12.5px" }}
              onClick={() => setShowPublishModal(true)}
            >
              <Send size={14} />
              <span>Publish Sync</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: CURRICULUM ARCHITECTURE (BENTO GRID) ──────────────────── */}
        {activeTab === "architecture" && (
          <div>
            {/* Filter & Search Bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: "1 1 240px" }}>
                <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--sd-muted)" }} />
                <input
                  type="text"
                  placeholder="Search modules, chapters, or concepts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sd-modal-input"
                  style={{ margin: 0, paddingLeft: 38 }}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {["all", "mathematics", "science", "english"].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setFilterSubject(sub)}
                    style={{
                      border: "1px solid var(--sd-line)",
                      borderRadius: 12,
                      padding: "8px 14px",
                      background: filterSubject === sub ? "var(--sd-card)" : "var(--sd-card-soft)",
                      color: filterSubject === sub ? "#10b981" : "var(--sd-muted)",
                      fontWeight: 800,
                      fontSize: "12.5px",
                      cursor: "pointer",
                      textTransform: "capitalize",
                      boxShadow: filterSubject === sub ? "var(--sd-shadow-soft)" : "none",
                    }}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Bento Grid */}
            <div className="sd-bento-grid">
              {filteredModules.map((mod) => {
                const completed = mod.chapters.filter(c => c.status === "completed").length;
                const progressPct = Math.round((completed / Math.max(mod.chapters.length, 1)) * 100);

                return (
                  <div key={mod.id} className="sd-module-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div
                        className="sd-module-badge"
                        style={{
                          background: `${mod.color}20`,
                          color: mod.color,
                        }}
                      >
                        <Award size={12} />
                        <span>{mod.subject}</span>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: mod.status === "in-progress" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: mod.status === "in-progress" ? "#10b981" : "#f59e0b",
                        }}
                      >
                        {mod.status === "in-progress" ? "In Delivery" : "Planned"}
                      </span>
                    </div>

                    <h3 className="sd-module-title">{mod.title}</h3>

                    <div className="sd-module-meta">
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Clock size={14} color="#10b981" />
                        <span>{mod.chapters.reduce((a, c) => a + c.duration, 0)} Mins</span>
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <CalendarIcon size={14} color="#f59e0b" />
                        <span>Due {mod.dueDate}</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", fontWeight: 800, color: "var(--sd-muted)", marginBottom: 6 }}>
                        <span>Pacing Completion</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: "var(--sd-card-soft)", overflow: "hidden", border: "1px solid var(--sd-line)" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${progressPct}%`,
                            background: mod.color,
                            borderRadius: "inherit",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>

                    {/* Chapter Breakdown */}
                    <div className="sd-chapters-list">
                      {mod.chapters.map((chap) => (
                        <div key={chap.id} className="sd-chapter-row">
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "70%" }}>
                            {chap.title}
                          </span>
                          <span
                            className="sd-chapter-tag"
                            style={{
                              background: chap.status === "completed" ? "rgba(16, 185, 129, 0.18)" : "rgba(245, 158, 11, 0.18)",
                              color: chap.status === "completed" ? "#10b981" : "#f59e0b",
                            }}
                          >
                            {chap.status === "completed" ? "Done" : `${chap.duration}m`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Card Actions */}
                    <div className="sd-card-footer">
                      <button
                        className="sd-btn-subtle"
                        style={{ padding: "7px 12px", fontSize: "12px" }}
                        onClick={() => {
                          setSelectedModuleId(mod.id);
                          setShowAddChapterModal(true);
                        }}
                      >
                        <Plus size={13} />
                        <span>Add Chapter</span>
                      </button>

                      <button
                        className="sd-btn-emerald"
                        style={{ padding: "7px 14px", fontSize: "12px" }}
                        onClick={() => {
                          setSelectedModuleId(mod.id);
                          setActiveTab("questions");
                        }}
                      >
                        <span>Open Studio</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 2: QUESTION STUDIO WITH SLICK TRANSITIONS ─────────────────── */}
        {activeTab === "questions" && (
          <div className="sd-q-studio-container">
            <div className="sd-q-card">
              <div className="sd-q-header">
                <div>
                  <div className="sd-q-number">
                    <Zap size={14} />
                    <span>Item {currentQuestionIndex + 1} of {questions.length}</span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--sd-muted)", marginTop: 2 }}>
                    {curQ.moduleTitle} • {curQ.subject}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: "11px",
                      fontWeight: 800,
                      background: curQ.difficulty === "easy" ? "rgba(16, 185, 129, 0.15)" : curQ.difficulty === "medium" ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      color: curQ.difficulty === "easy" ? "#10b981" : curQ.difficulty === "medium" ? "#f59e0b" : "#ef4444",
                      textTransform: "capitalize",
                    }}
                  >
                    {curQ.difficulty} ({curQ.points} pts)
                  </span>

                  <button
                    onClick={shuffleQuestions}
                    title="Random Question"
                    style={{
                      border: "1px solid var(--sd-line)",
                      background: "var(--sd-card-soft)",
                      borderRadius: 10,
                      padding: "4px 8px",
                      cursor: "pointer",
                      color: "var(--sd-ink)",
                    }}
                  >
                    <Shuffle size={14} />
                  </button>
                </div>
              </div>

              {/* Animated Question Content with Spring Directional Transitions */}
              <AnimatePresence mode="wait" custom={slideDirection}>
                <motion.div
                  key={curQ.id}
                  custom={slideDirection}
                  variants={questionVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <h2 className="sd-q-prompt">{curQ.question}</h2>

                  <div className="sd-options-grid">
                    {curQ.options.map((opt, idx) => {
                      const optLabel = String.fromCharCode(65 + idx);
                      const isSelected = selectedAnswer === opt;
                      const isCorrect = isSelected && opt === curQ.correctAnswer;

                      return (
                        <button
                          key={opt}
                          className={`sd-option-btn ${isSelected ? "selected" : ""} ${isCorrect ? "correct" : ""}`}
                          onClick={() => {
                            setSelectedAnswer(opt);
                            setShowExplanation(true);
                          }}
                        >
                          <div className="sd-option-indicator">
                            {isCorrect ? <Check size={14} color="#10b981" /> : optLabel}
                          </div>
                          <span style={{ flex: 1 }}>{opt}</span>
                          {isCorrect && (
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
                              <CheckCircle2 size={14} /> Correct
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Teacher Rubric & Explanation Accordion */}
                  {showExplanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="sd-explanation-box"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "#065f46" }}>
                        <BookCheck size={16} />
                        <strong style={{ fontSize: "13px" }}>Teacher Rubric & Pedagogical Insight:</strong>
                      </div>
                      <p style={{ margin: 0 }}>{curQ.explanation}</p>
                      <div style={{ marginTop: 8, fontSize: "11px", fontWeight: 700, color: "var(--sd-muted)" }}>
                        Cognitive Level: <strong>{curQ.bloomLevel}</strong> • Key competency validated.
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Controls */}
              <div className="sd-q-nav">
                <button
                  className="sd-btn-subtle"
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                  style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1 }}
                >
                  <ArrowLeft size={15} />
                  <span>Previous</span>
                </button>

                <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>
                  Slide Transitions Enabled
                </div>

                <button
                  className="sd-btn-emerald"
                  onClick={nextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                  style={{ opacity: currentQuestionIndex === questions.length - 1 ? 0.5 : 1 }}
                >
                  <span>Next Question</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Sidebar Question Bank Explorer */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  background: "var(--sd-card)",
                  border: "1px solid var(--sd-line)",
                  borderRadius: 20,
                  padding: 20,
                  boxShadow: "var(--sd-shadow-soft)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "var(--sd-ink)" }}>
                    Question Bank Items
                  </h4>
                  <button
                    onClick={() => setShowAddQuestionModal(true)}
                    style={{
                      border: 0,
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      borderRadius: 8,
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Plus size={12} /> Add Item
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      onClick={() => {
                        setSlideDirection(idx > currentQuestionIndex ? 1 : -1);
                        setCurrentQuestionIndex(idx);
                        setSelectedAnswer(null);
                        setShowExplanation(false);
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: idx === currentQuestionIndex ? "rgba(16, 185, 129, 0.12)" : "var(--sd-card-soft)",
                        border: idx === currentQuestionIndex ? "1px solid #10b981" : "1px solid var(--sd-line)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 800, color: idx === currentQuestionIndex ? "#10b981" : "var(--sd-muted)" }}>
                        <span>Item {idx + 1}</span>
                        <span style={{ textTransform: "capitalize" }}>{q.difficulty}</span>
                      </div>
                      <div
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: "var(--sd-ink)",
                          marginTop: 4,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {q.question}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bloom's Taxonomy Distribution */}
              <div
                style={{
                  background: "var(--sd-card)",
                  border: "1px solid var(--sd-line)",
                  borderRadius: 20,
                  padding: 20,
                  boxShadow: "var(--sd-shadow-soft)",
                }}
              >
                <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 900, color: "var(--sd-ink)" }}>
                  Cognitive Depth Metrics
                </h4>
                <div style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Knowledge", count: 2 },
                      { name: "Compreh.", count: 4 },
                      { name: "Applic.", count: 5 },
                      { name: "Analysis", count: 3 },
                    ]}>
                      <CartAxis />
                      <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: LIVE CLASSROOM DELIVERY & PACING ───────────────────────── */}
        {activeTab === "delivery" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div className="sd-timer-card">
              <div className="sd-chip" style={{ margin: "0 0 10px" }}>
                <Timer size={14} className="text-emerald-500" />
                <span>ACTIVE CLASSROOM MONITOR</span>
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "var(--sd-ink)", margin: 0 }}>
                {activeModule.title}
              </h2>
              <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--sd-muted)", marginTop: 4 }}>
                Current Chapter: {activeModule.chapters[0]?.title}
              </div>

              {/* Phase Switchers */}
              <div className="sd-timer-pills" style={{ marginTop: 18 }}>
                <button
                  className={`sd-timer-pill ${timerStage === "lecture" ? "active" : ""}`}
                  onClick={() => handleTimerPreset("lecture", 1200)}
                >
                  Lecture Segment (20m)
                </button>
                <button
                  className={`sd-timer-pill ${timerStage === "practice" ? "active" : ""}`}
                  onClick={() => handleTimerPreset("practice", 900)}
                >
                  Guided Practice (15m)
                </button>
                <button
                  className={`sd-timer-pill ${timerStage === "quiz" ? "active" : ""}`}
                  onClick={() => handleTimerPreset("quiz", 600)}
                >
                  Live Poll & Q&A (10m)
                </button>
              </div>

              {/* Animated Timer Dial */}
              <div className="sd-timer-circle">
                <div className="sd-timer-digits">
                  {formatTimerDigits(timerSeconds)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="sd-btn-emerald"
                  onClick={() => setTimerRunning(!timerRunning)}
                >
                  {timerRunning ? <Pause size={16} /> : <Play size={16} />}
                  <span>{timerRunning ? "Pause Pacing" : "Start Session"}</span>
                </button>
                <button
                  className="sd-btn-subtle"
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSeconds(1200);
                  }}
                >
                  <RefreshCw size={15} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Stage Objectives & Live Prompts */}
            <div
              style={{
                background: "var(--sd-card)",
                border: "1px solid var(--sd-line)",
                borderRadius: 22,
                padding: 24,
                boxShadow: "var(--sd-shadow)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: "var(--sd-ink)" }}>
                Classroom Delivery Checklist
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { text: "Introduce inverse operations with tactile scale balance analogy", done: true },
                  { text: "Display student whiteboard poll for equation 3x + 4 = 19", done: false },
                  { text: "Break students into peer review triads for word problem synthesis", done: false },
                  { text: "Deploy 3-question exit ticket to student dashboard portal", done: false },
                ].map((item, i) => (
                  <label
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: "var(--sd-card-soft)",
                      border: "1px solid var(--sd-line)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--sd-ink)",
                    }}
                  >
                    <input
                      type="checkbox"
                      defaultChecked={item.done}
                      style={{ width: 18, height: 18, accentColor: "#10b981", borderRadius: 4 }}
                    />
                    <span>{item.text}</span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: "auto", padding: 14, borderRadius: 16, background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#b45309", fontSize: "12px", fontWeight: 800 }}>
                  <AlertCircle size={15} />
                  <span>Pedagogical Tip from Copilot:</span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--sd-ink)", marginTop: 4 }}>
                  Students historically exhibit a 18% confusion drop when solving negative coefficient equations like -2x = 8. Reiterate that dividing by negative flips the sign.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: VISUAL SYLLABUS ROADMAP ───────────────────────────────── */}
        {activeTab === "roadmap" && (
          <div
            style={{
              background: "var(--sd-card)",
              border: "1px solid var(--sd-line)",
              borderRadius: 22,
              padding: 28,
              boxShadow: "var(--sd-shadow)",
            }}
          >
            <h3 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 900, color: "var(--sd-ink)" }}>
              Term 1 Milestone Progression Flow
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  top: 20,
                  bottom: 20,
                  width: 3,
                  background: "linear-gradient(180deg, #10b981, #f59e0b, #0ea5e9)",
                  borderRadius: 999,
                }}
              />

              {[
                { title: "Week 1-2: Foundations of Numerical Logic", status: "completed", date: "Sep 1 - Sep 14", icon: CheckCircle2, color: "#10b981" },
                { title: "Week 3-4: Multi-Step Linear Equations & Slope", status: "in-progress", date: "Sep 15 - Sep 28", icon: Target, color: "#10b981" },
                { title: "Week 5: Mid-Term Formative Diagnostics & Exit Exam", status: "upcoming", date: "Oct 1 - Oct 5", icon: Award, color: "#f59e0b" },
                { title: "Week 6-8: Euclidean Triangle Geometry & Proofs", status: "upcoming", date: "Oct 6 - Oct 24", icon: Compass, color: "#0ea5e9" },
              ].map((step, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 20, paddingLeft: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: step.status === "completed" ? "#10b981" : "var(--sd-card)",
                      border: `3px solid ${step.color}`,
                      display: "grid",
                      placeItems: "center",
                      zIndex: 2,
                      color: step.status === "completed" ? "#ffffff" : step.color,
                      boxShadow: "0 0 0 4px var(--sd-card)",
                    }}
                  >
                    <step.icon size={16} />
                  </div>

                  <div
                    style={{
                      flex: 1,
                      background: "var(--sd-card-soft)",
                      border: "1px solid var(--sd-line)",
                      borderRadius: 16,
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--sd-ink)" }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--sd-muted)", marginTop: 4 }}>
                        Scheduled Window: {step.date}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        fontSize: "11px",
                        fontWeight: 800,
                        background: step.status === "completed" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: step.status === "completed" ? "#10b981" : "#f59e0b",
                        textTransform: "uppercase",
                      }}
                    >
                      {step.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 5: MATERIALS VAULT ────────────────────────────────────────── */}
        {activeTab === "resources" && (
          <div
            style={{
              background: "var(--sd-card)",
              border: "1px solid var(--sd-line)",
              borderRadius: 22,
              padding: 24,
              boxShadow: "var(--sd-shadow)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "var(--sd-ink)" }}>
                  Curriculum Asset & Slide Vault
                </h3>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--sd-muted)", marginTop: 2 }}>
                  All attached lesson files, laboratory rubrics, and printable slide decks.
                </div>
              </div>
              <button
                className="sd-btn-emerald"
                onClick={() => triggerToast("File upload dialog opened!")}
              >
                <UploadCloud size={15} />
                <span>Upload Material</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {mockResources.map((res) => (
                <div
                  key={res.id}
                  style={{
                    border: "1px solid var(--sd-line)",
                    borderRadius: 16,
                    padding: 18,
                    background: "var(--sd-card-soft)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                    transition: "transform 0.18s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#10b981",
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--sd-ink)", lineHeight: 1.3 }}>
                        {res.title}
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--sd-muted)", marginTop: 4 }}>
                        {res.size} • {res.downloads} downloads
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--sd-line)", paddingTop: 12 }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--sd-faint)" }}>
                      {res.uploadDate}
                    </span>
                    <button
                      className="sd-btn-subtle"
                      style={{ padding: "5px 12px", fontSize: "11.5px" }}
                      onClick={() => triggerToast(`Downloaded ${res.title}`)}
                    >
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 6: ACADEMIC CALENDAR ──────────────────────────────────────── */}
        {activeTab === "calendar" && (
          <div
            style={{
              background: "var(--sd-card)",
              border: "1px solid var(--sd-line)",
              borderRadius: 22,
              padding: 24,
              boxShadow: "var(--sd-shadow)",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 900, color: "var(--sd-ink)" }}>
              Weekly Academic Schedule
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day, i) => (
                <div
                  key={day}
                  style={{
                    border: "1px solid var(--sd-line)",
                    borderRadius: 16,
                    padding: 14,
                    background: "var(--sd-card-soft)",
                    minHeight: 180,
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--sd-ink)", marginBottom: 12 }}>
                    {day}
                  </div>
                  {i % 2 === 0 ? (
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: 12,
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#065f46",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      <div style={{ color: "#10b981" }}>09:00 AM</div>
                      <div style={{ color: "var(--sd-ink)" }}>Algebra Lecture</div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: 12,
                        background: "rgba(245, 158, 11, 0.15)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        color: "#92400e",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      <div style={{ color: "#f59e0b" }}>11:30 AM</div>
                      <div style={{ color: "var(--sd-ink)" }}>Geometry Lab</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TOAST NOTIFICATION ────────────────────────────────────────────── */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              style={{
                position: "fixed",
                bottom: 24,
                right: 24,
                background: "#10b981",
                color: "#ffffff",
                padding: "12px 20px",
                borderRadius: 16,
                fontWeight: 800,
                fontSize: "13px",
                boxShadow: "0 12px 28px rgba(16, 185, 129, 0.4)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── MODAL: ADD MODULE ─────────────────────────────────────────────── */}
        {showAddModuleModal && (
          <div className="sd-modal-overlay" onClick={() => setShowAddModuleModal(false)}>
            <div className="sd-modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900 }}>Create New Curriculum Module</h3>
                <button onClick={() => setShowAddModuleModal(false)} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--sd-muted)" }}>
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as any;
                  const newMod = {
                    id: `mod-${Date.now()}`,
                    title: form.title.value,
                    subject: form.subject.value,
                    dueDate: form.dueDate.value || "2026-12-15",
                    status: "in-progress",
                    completedChapters: 0,
                    totalChapters: 1,
                    color: "#10b981",
                    iconName: "book",
                    chapters: [
                      {
                        id: `c-${Date.now()}`,
                        moduleId: `mod-${Date.now()}`,
                        title: "Chapter 1: Orientation & Objectives",
                        status: "not-started",
                        duration: 45,
                        type: "lecture",
                        objectives: "Core introductory competencies",
                        resources: [],
                      }
                    ],
                  };
                  setModules([...modules, newMod]);
                  setShowAddModuleModal(false);
                  triggerToast(`Module "${newMod.title}" created!`);
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Module Title</label>
                  <input name="title" required placeholder="e.g. Module 4: Quadratic Equations" className="sd-modal-input" />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Subject</label>
                  <select name="subject" className="sd-modal-input">
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="English">English</option>
                    <option value="History">History</option>
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Target Completion Date</label>
                  <input name="dueDate" type="date" className="sd-modal-input" />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" className="sd-btn-subtle" onClick={() => setShowAddModuleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="sd-btn-emerald">
                    Save Module
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: ADD CHAPTER ────────────────────────────────────────────── */}
        {showAddChapterModal && (
          <div className="sd-modal-overlay" onClick={() => setShowAddChapterModal(false)}>
            <div className="sd-modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900 }}>Add Chapter to {activeModule.title}</h3>
                <button onClick={() => setShowAddChapterModal(false)} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--sd-muted)" }}>
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as any;
                  const newChap = {
                    id: `c-${Date.now()}`,
                    moduleId: activeModule.id,
                    title: form.title.value,
                    status: "not-started",
                    duration: parseInt(form.duration.value) || 45,
                    type: form.type.value,
                    objectives: form.objectives.value,
                    resources: [],
                  };
                  setModules(modules.map(m => {
                    if (m.id === activeModule.id) {
                      return { ...m, chapters: [...m.chapters, newChap], totalChapters: m.totalChapters + 1 };
                    }
                    return m;
                  }));
                  setShowAddChapterModal(false);
                  triggerToast(`Chapter added to ${activeModule.title}!`);
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Chapter Title</label>
                  <input name="title" required placeholder="e.g. Radian Circle Applications" className="sd-modal-input" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Duration (Minutes)</label>
                    <input name="duration" type="number" defaultValue={45} className="sd-modal-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Pedagogical Type</label>
                    <select name="type" className="sd-modal-input">
                      <option value="lecture">Interactive Lecture</option>
                      <option value="lab">Discovery Lab</option>
                      <option value="activity">Group Activity</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Learning Objectives</label>
                  <textarea name="objectives" rows={3} placeholder="Describe expected student outcomes..." className="sd-modal-input" />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" className="sd-btn-subtle" onClick={() => setShowAddChapterModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="sd-btn-emerald">
                    Add Chapter
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: ADD QUESTION ───────────────────────────────────────────── */}
        {showAddQuestionModal && (
          <div className="sd-modal-overlay" onClick={() => setShowAddQuestionModal(false)}>
            <div className="sd-modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900 }}>Create Interactive Question</h3>
                <button onClick={() => setShowAddQuestionModal(false)} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--sd-muted)" }}>
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as any;
                  const newQ = {
                    id: `q-${Date.now()}`,
                    lessonId: "les-new",
                    moduleTitle: activeModule.title,
                    question: form.question.value,
                    type: "mcq",
                    options: [form.optA.value, form.optB.value, form.optC.value, form.optD.value],
                    correctAnswer: form.correct.value,
                    explanation: form.explanation.value,
                    difficulty: form.difficulty.value,
                    points: parseInt(form.points.value) || 10,
                    bloomLevel: form.bloom.value,
                    subject: activeModule.subject,
                  };
                  setQuestions([...questions, newQ]);
                  setCurrentQuestionIndex(questions.length);
                  setShowAddQuestionModal(false);
                  triggerToast("New question added to bank!");
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Question Prompt</label>
                  <input name="question" required placeholder="Type the question..." className="sd-modal-input" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--sd-muted)" }}>Option A</label>
                    <input name="optA" required placeholder="Option A" className="sd-modal-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--sd-muted)" }}>Option B</label>
                    <input name="optB" required placeholder="Option B" className="sd-modal-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--sd-muted)" }}>Option C</label>
                    <input name="optC" required placeholder="Option C" className="sd-modal-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--sd-muted)" }}>Option D</label>
                    <input name="optD" required placeholder="Option D" className="sd-modal-input" />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Correct Option Value</label>
                    <input name="correct" required placeholder="Exact match of correct option text" className="sd-modal-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Bloom's Taxonomy Level</label>
                    <select name="bloom" className="sd-modal-input">
                      <option value="Application">Application</option>
                      <option value="Analysis">Analysis</option>
                      <option value="Evaluation">Evaluation</option>
                      <option value="Comprehension">Comprehension</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--sd-muted)" }}>Explanation & Rubric</label>
                  <textarea name="explanation" rows={2} placeholder="Explain why this answer is correct..." className="sd-modal-input" />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" className="sd-btn-subtle" onClick={() => setShowAddQuestionModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="sd-btn-emerald">
                    Save Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: PUBLISH SYNC ───────────────────────────────────────────── */}
        {showPublishModal && (
          <div className="sd-modal-overlay" onClick={() => setShowPublishModal(false)}>
            <div className="sd-modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900 }}>Publish Syllabi to Student Portal</h3>
                <button onClick={() => setShowPublishModal(false)} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--sd-muted)" }}>
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: "13px", color: "var(--sd-muted)", margin: "0 0 16px" }}>
                Synchronize modules and question bank updates with enrolled classrooms. Students will receive immediate portal notifications.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "13px", fontWeight: 700 }}>
                  <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "#10b981" }} />
                  <span>Notify enrolled students via dashboard alert</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "13px", fontWeight: 700 }}>
                  <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "#10b981" }} />
                  <span>Unlock Question Bank in self-paced quiz mode</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "13px", fontWeight: 700 }}>
                  <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "#10b981" }} />
                  <span>Attach lesson slide PDFs to resource hub</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="sd-btn-subtle" onClick={() => setShowPublishModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="sd-btn-emerald"
                  onClick={() => {
                    setShowPublishModal(false);
                    triggerToast("Curriculum successfully published to students!");
                  }}
                >
                  <Send size={14} />
                  <span>Confirm & Publish</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Sub-helper for Chart axis
function CartAxis() {
  return (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" />
      <XAxis dataKey="name" stroke="var(--sd-muted)" fontSize={10} tickLine={false} />
      <YAxis stroke="var(--sd-muted)" fontSize={10} tickLine={false} />
      <Tooltip
        contentStyle={{
          backgroundColor: "var(--sd-card)",
          borderColor: "var(--sd-line)",
          borderRadius: 10,
          color: "var(--sd-ink)",
          fontWeight: 800,
          fontSize: 12,
        }}
      />
    </>
  );
}