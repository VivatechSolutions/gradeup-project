import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area,
} from "recharts";

// ══════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════
type PaperStatus = "pending" | "evaluating" | "corrected" | "finalized";
type QuestionStatus = "correct" | "partial" | "incorrect";

interface AnswerKeyQuestion {
  questionNumber: number;
  questionText: string;
  topic: string;
  maxMarks: number;
  modelAnswer: string;
}

interface AnswerKey {
  id: string;
  examName: string;
  subject: string;
  class: string;
  totalMarks: number;
  createdAt: string;
  questions: AnswerKeyQuestion[];
}

interface QuestionCorrection {
  questionNumber: number;
  questionText: string;
  topic: string;
  maxMarks: number;
  aiMarksAwarded: number;
  finalMarksAwarded: number;
  aiStatus: QuestionStatus;
  aiConfidence: number; // 0-100
  aiFeedback: string;
  teacherFeedback: string;
  adjustedByTeacher: boolean;
}

interface PaperAnalytics {
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  commonMistakes: string[];
  performanceInsight: string;
}

interface ExamPaper {
  id: string;
  studentName: string;
  rollNumber: string;
  subject: string;
  class: string;
  examName: string;
  date: string;
  fileUrl: string;
  fileName: string;
  fileType: "pdf" | "image";
  status: PaperStatus;
  answerKeyId: string | null;
  corrections: QuestionCorrection[];
  analytics: PaperAnalytics | null;
  uploadedAt: string;
  finalizedAt: string | null;
}

type TabId = "papers" | "workspace" | "analytics" | "answerKeys";
type ThemeMode = "light" | "dark";

// ══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════
const STORAGE_KEY = "teacher_exam_correction_v1";
const THEME_KEY = "teacher_exam_correction_theme";

const seedAnswerKeys: AnswerKey[] = [
  {
    id: "AK-MATH-10A",
    examName: "Mid-Term Examination",
    subject: "Mathematics",
    class: "10-A",
    totalMarks: 50,
    createdAt: "2024-07-01",
    questions: [
      { questionNumber: 1, questionText: "Solve for x: 2x + 5 = 17", topic: "Algebra", maxMarks: 5, modelAnswer: "x = 6" },
      { questionNumber: 2, questionText: "Find the roots of x² − 7x + 12 = 0", topic: "Algebra", maxMarks: 10, modelAnswer: "x = 3, x = 4" },
      { questionNumber: 3, questionText: "Prove that the sum of angles in a triangle is 180°", topic: "Geometry", maxMarks: 10, modelAnswer: "Standard proof using parallel line construction" },
      { questionNumber: 4, questionText: "Find sin(30°) + cos(60°)", topic: "Trigonometry", maxMarks: 5, modelAnswer: "1" },
      { questionNumber: 5, questionText: "Differentiate y = 3x² + 2x with respect to x", topic: "Calculus", maxMarks: 10, modelAnswer: "dy/dx = 6x + 2" },
      { questionNumber: 6, questionText: "Find the mean of 4, 8, 15, 16, 23, 42", topic: "Statistics", maxMarks: 10, modelAnswer: "18" },
    ],
  },
  {
    id: "AK-PHY-12B",
    examName: "Unit Test 2",
    subject: "Physics",
    class: "12-B",
    totalMarks: 40,
    createdAt: "2024-07-03",
    questions: [
      { questionNumber: 1, questionText: "State Newton's second law of motion", topic: "Mechanics", maxMarks: 5, modelAnswer: "F = ma" },
      { questionNumber: 2, questionText: "Calculate the force needed to accelerate a 5kg mass at 2m/s²", topic: "Mechanics", maxMarks: 5, modelAnswer: "10 N" },
      { questionNumber: 3, questionText: "Explain Ohm's Law with a diagram", topic: "Electricity", maxMarks: 10, modelAnswer: "V = IR with circuit diagram" },
      { questionNumber: 4, questionText: "Derive the lens formula", topic: "Optics", maxMarks: 10, modelAnswer: "1/v − 1/u = 1/f derivation" },
      { questionNumber: 5, questionText: "Define electromagnetic induction", topic: "Electricity", maxMarks: 10, modelAnswer: "Faraday's law explanation" },
    ],
  },
];

const seedPapers: ExamPaper[] = [
  {
    id: "P001", studentName: "Aarav Sharma", rollNumber: "10A-14", subject: "Mathematics", class: "10-A",
    examName: "Mid-Term Examination", date: "2024-07-15", fileUrl: "", fileName: "aarav_math_midterm.pdf",
    fileType: "pdf", status: "finalized", answerKeyId: "AK-MATH-10A", uploadedAt: "2024-07-15T09:12:00Z",
    finalizedAt: "2024-07-16T10:00:00Z",
    corrections: [],
    analytics: null,
  },
  {
    id: "P002", studentName: "Vivaan Singh", rollNumber: "12B-02", subject: "Physics", class: "12-B",
    examName: "Unit Test 2", date: "2024-07-16", fileUrl: "", fileName: "vivaan_physics_ut2.jpg",
    fileType: "image", status: "pending", answerKeyId: "AK-PHY-12B", uploadedAt: "2024-07-16T11:04:00Z",
    finalizedAt: null, corrections: [], analytics: null,
  },
  {
    id: "P003", studentName: "Diya Gupta", rollNumber: "10A-07", subject: "Mathematics", class: "10-A",
    examName: "Mid-Term Examination", date: "2024-07-17", fileUrl: "", fileName: "diya_math_midterm.pdf",
    fileType: "pdf", status: "corrected", answerKeyId: "AK-MATH-10A", uploadedAt: "2024-07-17T08:40:00Z",
    finalizedAt: null, corrections: [], analytics: null,
  },
];

// ══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════
function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = (Math.imul(h, 48271) + 1) % 2147483647;
    return (h < 0 ? h + 2147483647 : h) / 2147483647;
  };
}

function getGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const AI_FEEDBACK = {
  correct: [
    "Complete and accurate answer with correct method shown.",
    "Well-structured response, all key steps present.",
    "Matches the expected answer precisely.",
    "Clear reasoning and correct final answer.",
  ],
  partial: [
    "Correct approach but final answer has a minor error.",
    "Method is right, but a calculation step was missed.",
    "Partially complete — some key points are missing.",
    "Right direction, but the explanation is incomplete.",
  ],
  incorrect: [
    "Incorrect method used; answer does not match expected result.",
    "Key concept appears to be misunderstood.",
    "No valid working shown for this answer.",
    "Answer does not address the question asked.",
  ],
};

// ══════════════════════════════════════════════════════════════════════════
// API CONFIGURATION — JSON-driven, backend-ready
// 🔌 BACKEND: This is the ONLY block you need to touch to go live.
// Flip USE_MOCK_DATA to false and fill in BASE_URL — every function below
// already targets these exact endpoint paths, methods, and JSON payload
// shapes, so no calling code anywhere else in this file needs to change.
// ══════════════════════════════════════════════════════════════════════════
const API_CONFIG = {
  USE_MOCK_DATA: true,
  BASE_URL: "https://api.yourschoolapp.com/v1",
  ENDPOINTS: {
    listPapers: { method: "GET", path: "/teacher/exam-papers" },
    listAnswerKeys: { method: "GET", path: "/teacher/answer-keys" },
    createAnswerKey: { method: "POST", path: "/teacher/answer-keys" },
    uploadPaper: { method: "POST", path: "/teacher/exam-papers/upload" },
    runAIEvaluation: { method: "POST", path: "/teacher/exam-papers/:id/evaluate" },
    updateCorrection: { method: "PATCH", path: "/teacher/exam-papers/:id/corrections/:questionNumber" },
    finalizePaper: { method: "POST", path: "/teacher/exam-papers/:id/finalize" },
    deletePaper: { method: "DELETE", path: "/teacher/exam-papers/:id" },
  },
} as const;

function buildUrl(path: string, params: Record<string, string | number> = {}) {
  let resolved = path;
  Object.entries(params).forEach(([key, value]) => {
    resolved = resolved.replace(`:${key}`, String(value));
  });
  return `${API_CONFIG.BASE_URL}${resolved}`;
}

// Generic JSON fetch wrapper. Once USE_MOCK_DATA is false, every API method
// below routes through this single function — auth headers, error handling,
// and response parsing only need to be wired up here.
async function apiRequest<T>(
  endpointKey: keyof typeof API_CONFIG.ENDPOINTS,
  options: { params?: Record<string, string | number>; body?: unknown } = {}
): Promise<T> {
  const endpoint = API_CONFIG.ENDPOINTS[endpointKey];
  const url = buildUrl(endpoint.path, options.params);
  const res = await fetch(url, {
    method: endpoint.method,
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(`Request failed: ${endpoint.method} ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

// ══════════════════════════════════════════════════════════════════════════
// MOCK API LAYER
// Every method mirrors the JSON shape and endpoint above under ENDPOINTS so
// swapping USE_MOCK_DATA to false is a drop-in replacement — no UI code
// changes required. All local persistence (localStorage) is mock-only and
// should be deleted once wired to a real backend.
// ══════════════════════════════════════════════════════════════════════════
interface StoreShape {
  papers: ExamPaper[];
  answerKeys: AnswerKey[];
}

function loadStore(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore corrupt storage */
  }
  return { papers: seedPapers, answerKeys: seedAnswerKeys };
}

function saveStore(store: StoreShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage full or unavailable — no-op in mock layer */
  }
}

const examCorrectionAPI = {
  // 🔌 BACKEND: GET /teacher/exam-papers?class=&subject=&status=
  async getPapers(): Promise<ExamPaper[]> {
    if (!API_CONFIG.USE_MOCK_DATA) return apiRequest<ExamPaper[]>("listPapers");
    await new Promise((r) => setTimeout(r, 250));
    return loadStore().papers;
  },

  // 🔌 BACKEND: GET /teacher/answer-keys
  async getAnswerKeys(): Promise<AnswerKey[]> {
    if (!API_CONFIG.USE_MOCK_DATA) return apiRequest<AnswerKey[]>("listAnswerKeys");
    await new Promise((r) => setTimeout(r, 150));
    return loadStore().answerKeys;
  },

  // 🔌 BACKEND: POST /teacher/answer-keys  (JSON body: AnswerKey)
  async createAnswerKey(key: AnswerKey): Promise<AnswerKey> {
    if (!API_CONFIG.USE_MOCK_DATA) return apiRequest<AnswerKey>("createAnswerKey", { body: key });
    await new Promise((r) => setTimeout(r, 200));
    const store = loadStore();
    store.answerKeys = [...store.answerKeys, key];
    saveStore(store);
    return key;
  },

  // 🔌 BACKEND: POST /teacher/exam-papers/upload  (multipart/form-data in production;
  // keep the same field names used in `meta` below when building the FormData)
  async uploadPaper(meta: {
    studentName: string; rollNumber: string; subject: string; class: string;
    examName: string; file: File; answerKeyId: string | null;
  }): Promise<ExamPaper> {
    if (!API_CONFIG.USE_MOCK_DATA) {
      const form = new FormData();
      Object.entries(meta).forEach(([k, v]) => form.append(k, v as string | Blob));
      const res = await fetch(buildUrl(API_CONFIG.ENDPOINTS.uploadPaper.path), { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 400));
    const fileType: "pdf" | "image" = meta.file.type.includes("pdf") ? "pdf" : "image";
    const paper: ExamPaper = {
      id: genId("P"),
      studentName: meta.studentName,
      rollNumber: meta.rollNumber,
      subject: meta.subject,
      class: meta.class,
      examName: meta.examName,
      date: new Date().toISOString().split("T")[0],
      fileUrl: URL.createObjectURL(meta.file), // 🔌 BACKEND: replace with server-hosted URL after upload
      fileName: meta.file.name,
      fileType,
      status: "pending",
      answerKeyId: meta.answerKeyId,
      corrections: [],
      analytics: null,
      uploadedAt: new Date().toISOString(),
      finalizedAt: null,
    };
    const store = loadStore();
    store.papers = [paper, ...store.papers];
    saveStore(store);
    return paper;
  },

  // 🔌 BACKEND: POST /teacher/exam-papers/:id/evaluate
  // Real implementation would call an AI/OCR + evaluation service and
  // return per-question corrections. Here we simulate that response.
  async runAIEvaluation(paperId: string): Promise<ExamPaper> {
    if (!API_CONFIG.USE_MOCK_DATA) return apiRequest<ExamPaper>("runAIEvaluation", { params: { id: paperId } });

    const store = loadStore();
    const paper = store.papers.find((p) => p.id === paperId);
    if (!paper) throw new Error("Paper not found");
    const key = store.answerKeys.find((k) => k.id === paper.answerKeyId);
    if (!key) throw new Error("No answer key linked to this paper");

    await new Promise((r) => setTimeout(r, 1800)); // simulate AI processing time

    const rand = seededRandom(paper.id);
    const corrections: QuestionCorrection[] = key.questions.map((q) => {
      const roll = rand();
      let status: QuestionStatus;
      let marks: number;
      if (roll < 0.62) { status = "correct"; marks = q.maxMarks; }
      else if (roll < 0.85) { status = "partial"; marks = Math.round(q.maxMarks * 0.5); }
      else { status = "incorrect"; marks = 0; }
      const pool = AI_FEEDBACK[status];
      const feedback = pool[Math.floor(rand() * pool.length)];
      return {
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        topic: q.topic,
        maxMarks: q.maxMarks,
        aiMarksAwarded: marks,
        finalMarksAwarded: marks,
        aiStatus: status,
        aiConfidence: Math.round(60 + rand() * 38),
        aiFeedback: feedback,
        teacherFeedback: "",
        adjustedByTeacher: false,
      };
    });

    paper.corrections = corrections;
    paper.status = "corrected";
    paper.analytics = computeAnalytics(paper, corrections);
    saveStore(store);
    return { ...paper };
  },

  // 🔌 BACKEND: PATCH /teacher/exam-papers/:id/corrections/:questionNumber  (JSON body: Partial<QuestionCorrection>)
  async updateCorrection(paperId: string, questionNumber: number, updates: Partial<QuestionCorrection>): Promise<ExamPaper> {
    if (!API_CONFIG.USE_MOCK_DATA) {
      return apiRequest<ExamPaper>("updateCorrection", { params: { id: paperId, questionNumber }, body: updates });
    }
    await new Promise((r) => setTimeout(r, 120));
    const store = loadStore();
    const paper = store.papers.find((p) => p.id === paperId);
    if (!paper) throw new Error("Paper not found");
    paper.corrections = paper.corrections.map((c) =>
      c.questionNumber === questionNumber ? { ...c, ...updates, adjustedByTeacher: true } : c
    );
    paper.analytics = computeAnalytics(paper, paper.corrections);
    saveStore(store);
    return { ...paper };
  },

  // 🔌 BACKEND: POST /teacher/exam-papers/:id/finalize
  async finalizePaper(paperId: string): Promise<ExamPaper> {
    if (!API_CONFIG.USE_MOCK_DATA) return apiRequest<ExamPaper>("finalizePaper", { params: { id: paperId } });
    await new Promise((r) => setTimeout(r, 300));
    const store = loadStore();
    const paper = store.papers.find((p) => p.id === paperId);
    if (!paper) throw new Error("Paper not found");
    paper.status = "finalized";
    paper.finalizedAt = new Date().toISOString();
    paper.analytics = computeAnalytics(paper, paper.corrections);
    saveStore(store);
    return { ...paper };
  },

  // 🔌 BACKEND: DELETE /teacher/exam-papers/:id
  async deletePaper(paperId: string): Promise<void> {
    if (!API_CONFIG.USE_MOCK_DATA) { await apiRequest<void>("deletePaper", { params: { id: paperId } }); return; }
    await new Promise((r) => setTimeout(r, 150));
    const store = loadStore();
    store.papers = store.papers.filter((p) => p.id !== paperId);
    saveStore(store);
  },
};

function computeAnalytics(paper: ExamPaper, corrections: QuestionCorrection[]): PaperAnalytics {
  const totalMarks = corrections.reduce((s, c) => s + c.maxMarks, 0);
  const obtainedMarks = corrections.reduce((s, c) => s + c.finalMarksAwarded, 0);
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 1000) / 10 : 0;

  const topicMap = new Map<string, { obtained: number; max: number }>();
  corrections.forEach((c) => {
    const t = topicMap.get(c.topic) || { obtained: 0, max: 0 };
    t.obtained += c.finalMarksAwarded;
    t.max += c.maxMarks;
    topicMap.set(c.topic, t);
  });

  const topicScores = Array.from(topicMap.entries()).map(([topic, v]) => ({
    topic, pct: v.max > 0 ? (v.obtained / v.max) * 100 : 0,
  }));
  topicScores.sort((a, b) => b.pct - a.pct);

  const strengths = topicScores.filter((t) => t.pct >= 70).map((t) => t.topic);
  const weaknesses = topicScores.filter((t) => t.pct < 50).map((t) => t.topic);

  const commonMistakes = corrections
    .filter((c) => c.finalMarksAwarded < c.maxMarks)
    .slice(0, 4)
    .map((c) => `Q${c.questionNumber} (${c.topic}): ${c.teacherFeedback || c.aiFeedback}`);

  let performanceInsight: string;
  if (percentage >= 85) performanceInsight = "Outstanding performance with strong command across most topics.";
  else if (percentage >= 70) performanceInsight = "Solid performance overall, with a few topics that could use reinforcement.";
  else if (percentage >= 50) performanceInsight = "Moderate performance — targeted practice on weaker topics is recommended.";
  else performanceInsight = "Performance indicates significant gaps; a structured revision plan is recommended.";

  return {
    totalMarks, obtainedMarks, percentage, grade: getGrade(percentage),
    strengths: strengths.length ? strengths : ["Consistent effort across topics"],
    weaknesses: weaknesses.length ? weaknesses : ["No major weak areas identified"],
    commonMistakes: commonMistakes.length ? commonMistakes : ["No recurring mistakes identified"],
    performanceInsight,
  };
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildReportText(paper: ExamPaper): string {
  const a = paper.analytics;
  const lines: string[] = [];
  lines.push(`EXAM CORRECTION REPORT`);
  lines.push(`========================`);
  lines.push(`Student: ${paper.studentName} (${paper.rollNumber})`);
  lines.push(`Class: ${paper.class}   Subject: ${paper.subject}`);
  lines.push(`Exam: ${paper.examName}   Date: ${formatDate(paper.date)}`);
  lines.push(`Status: ${paper.status.toUpperCase()}`);
  lines.push(``);
  if (a) {
    lines.push(`SCORE: ${a.obtainedMarks} / ${a.totalMarks}  (${a.percentage}%)  Grade: ${a.grade}`);
    lines.push(``);
    lines.push(`Strengths: ${a.strengths.join(", ")}`);
    lines.push(`Weaknesses: ${a.weaknesses.join(", ")}`);
    lines.push(``);
    lines.push(`Common Mistakes:`);
    a.commonMistakes.forEach((m) => lines.push(`  - ${m}`));
    lines.push(``);
    lines.push(`Insight: ${a.performanceInsight}`);
    lines.push(``);
  }
  lines.push(`QUESTION-WISE BREAKDOWN`);
  lines.push(`------------------------`);
  paper.corrections.forEach((c) => {
    lines.push(`Q${c.questionNumber}. ${c.questionText}`);
    lines.push(`  Topic: ${c.topic}   Marks: ${c.finalMarksAwarded}/${c.maxMarks}   AI status: ${c.aiStatus}`);
    lines.push(`  AI feedback: ${c.aiFeedback}`);
    if (c.teacherFeedback) lines.push(`  Teacher note: ${c.teacherFeedback}`);
    lines.push(``);
  });
  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════════════════
// STYLES — self-contained light + dark theme tokens (no external CSS needed)
// ══════════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;}

.xcd-root{
  --bg-app:#f6f5fb;
  --bg-panel:#ffffff;
  --bg-hover:#f1eff9;
  --bg-input:#ffffff;
  --text-main:#171625;
  --text-sub:#666479;
  --border:#e7e4f2;
  --border2:#ece9f6;
  --shadow:0 2px 14px rgba(30,20,60,.06);
  --overlay:rgba(20,16,35,.52);
}
.xcd-root[data-theme="dark"]{
  --bg-app:#0e0d15;
  --bg-panel:#17151f;
  --bg-hover:#211f2c;
  --bg-input:#1c1a26;
  --text-main:#f3f2fb;
  --text-sub:#a09eb4;
  --border:#2a2836;
  --border2:#26242f;
  --shadow:0 2px 18px rgba(0,0,0,.45);
  --overlay:rgba(4,3,10,.68);
}

.xcd-root{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--text-main);background:var(--bg-app);min-height:100%;transition:background .2s ease,color .2s ease;}

/* ── Hero ── */
.xcd-hero{margin:20px 28px 0;border-radius:20px;padding:18px 28px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 45%,#ec4899 100%);position:relative;overflow:hidden;color:#fff;box-shadow:0 6px 24px rgba(99,102,241,.26);}
.xcd-hero-glow{position:absolute;width:280px;height:280px;border-radius:50%;background:rgba(255,255,255,.12);top:-140px;right:-60px;filter:blur(10px);}
.xcd-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.xcd-hero-left{display:flex;align-items:center;gap:14px;min-width:0;}
.xcd-hero-icon{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.xcd-hero-title{font-size:clamp(16px,2.2vw,22px);font-weight:800;color:#fff;margin-bottom:2px;letter-spacing:-.2px;line-height:1.2;}
.xcd-hero-sub{font-size:12px;color:rgba(255,255,255,.72);line-height:1.4;}
.xcd-hero-actions{display:flex;gap:8px;flex-shrink:0;align-items:center;}
.xcd-hero-btn{padding:9px 16px;background:#fff;color:#6366f1;border:none;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 3px 12px rgba(0,0,0,.15);white-space:nowrap;display:flex;align-items:center;gap:6px;}
.xcd-hero-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.2);}
.xcd-hero-btn.ghost{background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.4);}
.xcd-theme-toggle{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;}
.xcd-theme-toggle:hover{background:rgba(255,255,255,.3);transform:translateY(-2px);}

/* ── Tabs ── */
.xcd-tabs{display:flex;gap:6px;margin:16px 28px 0;overflow-x:auto;padding-bottom:2px;}
.xcd-tab{padding:9px 16px;border-radius:11px;border:1px solid var(--border);background:var(--bg-panel);color:var(--text-sub);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;transition:all .15s;}
.xcd-tab.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 4px 14px rgba(99,102,241,.3);}
.xcd-tab:hover:not(.active){background:var(--bg-hover);}
.xcd-tab-badge{background:rgba(0,0,0,.12);border-radius:20px;padding:1px 7px;font-size:10.5px;}
.xcd-tab.active .xcd-tab-badge{background:rgba(255,255,255,.25);}

/* ── Body / panels ── */
.xcd-body{padding:18px 28px 80px;display:flex;flex-direction:column;gap:18px;}
.xcd-panel{background:var(--bg-panel);border-radius:20px;border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;}
.xcd-panel-head{padding:18px 22px 14px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.xcd-panel-title{font-size:15px;font-weight:800;color:var(--text-main);}
.xcd-panel-sub{font-size:12.5px;color:var(--text-sub);margin-top:3px;}
.xcd-panel-body{padding:20px 22px;}

/* ── Stat cards ── */
.xcd-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.xcd-stat{background:var(--bg-panel);border:1px solid var(--border);border-radius:16px;padding:16px 18px;box-shadow:var(--shadow);}
.xcd-stat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.xcd-stat-icon{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:16px;}
.xcd-stat-val{font-size:24px;font-weight:800;color:var(--text-main);line-height:1;}
.xcd-stat-label{font-size:11.5px;color:var(--text-sub);margin-top:5px;font-weight:600;}

/* ── Upload area ── */
.xcd-upload-area{border:2px dashed var(--border2);border-radius:16px;padding:36px 20px;text-align:center;cursor:pointer;transition:all .2s;background:var(--bg-app);}
.xcd-upload-area:hover{background:var(--bg-hover);border-color:#8b5cf6;}
.xcd-upload-icon{font-size:36px;margin-bottom:10px;}
.xcd-upload-text{font-size:14px;font-weight:700;color:var(--text-main);}
.xcd-upload-subtext{font-size:12px;color:var(--text-sub);margin-top:4px;}

/* ── Form ── */
.xcd-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.xcd-field{display:flex;flex-direction:column;gap:5px;}
.xcd-field label{font-size:11.5px;font-weight:700;color:var(--text-sub);}
.xcd-field input,.xcd-field select,.xcd-field textarea{font-family:inherit;font-size:13px;padding:9px 11px;border-radius:10px;border:1px solid var(--border2);background:var(--bg-input);color:var(--text-main);outline:none;}
.xcd-field input::placeholder,.xcd-field textarea::placeholder{color:var(--text-sub);opacity:.7;}
.xcd-field input:focus,.xcd-field select:focus,.xcd-field textarea:focus{border-color:#8b5cf6;}
.xcd-select-inline{padding:8px 10px;border-radius:10px;border:1px solid var(--border2);background:var(--bg-input);color:var(--text-main);font-size:12.5px;font-family:inherit;}

/* ── Table ── */
.xcd-table-wrap{overflow-x:auto;}
.xcd-table{width:100%;border-collapse:collapse;font-size:13px;min-width:640px;}
.xcd-table th{text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:var(--text-sub);border-bottom:1px solid var(--border2);white-space:nowrap;background:var(--bg-panel);}
.xcd-table td{padding:12px 14px;border-bottom:1px solid var(--border2);color:var(--text-main);vertical-align:middle;background:var(--bg-panel);}
.xcd-table tr:last-child td{border-bottom:none;}
.xcd-table tr:hover td{background:var(--bg-hover);}
.xcd-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
.xcd-name-cell{display:flex;align-items:center;gap:10px;}
.xcd-sub{font-size:11px;color:var(--text-sub);}

.xcd-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;}
.xcd-badge.pending{background:rgba(148,163,184,.16);color:#64748b;}
.xcd-badge.evaluating{background:rgba(245,158,11,.16);color:#d99024;}
.xcd-badge.corrected{background:rgba(99,102,241,.16);color:#818cf8;}
.xcd-badge.finalized{background:rgba(16,185,129,.16);color:#34d399;}
.xcd-root:not([data-theme="dark"]) .xcd-badge.evaluating{color:#b45309;}
.xcd-root:not([data-theme="dark"]) .xcd-badge.corrected{color:#4f46e5;}
.xcd-root:not([data-theme="dark"]) .xcd-badge.finalized{color:#059669;}

.xcd-icon-btn{width:30px;height:30px;border-radius:9px;border:1px solid var(--border2);background:var(--bg-input);color:var(--text-sub);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;transition:all .15s;}
.xcd-icon-btn:hover{background:var(--bg-hover);color:var(--text-main);}
.xcd-btn{padding:9px 16px;border-radius:11px;border:none;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:6px;}
.xcd-btn.primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,.28);}
.xcd-btn.primary:hover{transform:translateY(-1px);}
.xcd-btn.secondary{background:var(--bg-input);color:var(--text-main);border:1px solid var(--border2);}
.xcd-btn.secondary:hover{background:var(--bg-hover);}
.xcd-btn.success{background:linear-gradient(135deg,#10b981,#059669);color:#fff;}
.xcd-btn:disabled{opacity:.5;cursor:not-allowed;transform:none !important;}

/* ── Empty state ── */
.xcd-empty{text-align:center;padding:50px 20px;color:var(--text-sub);}
.xcd-empty-icon{font-size:38px;margin-bottom:10px;}

/* ── Workspace ── */
.xcd-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:16px;align-items:start;}
.xcd-viewer{background:var(--bg-app);border:1px solid var(--border2);border-radius:14px;min-height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;position:sticky;top:16px;}
.xcd-viewer img{max-width:100%;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);}
.xcd-viewer-icon{font-size:44px;margin-bottom:12px;}
.xcd-score-strip{display:flex;align-items:center;justify-content:space-between;background:var(--bg-panel);border:1px solid var(--border2);border-radius:14px;padding:14px 18px;margin-bottom:14px;flex-wrap:wrap;gap:10px;}
.xcd-score-big{font-size:26px;font-weight:800;background:linear-gradient(135deg,#6366f1,#ec4899);-webkit-background-clip:text;background-clip:text;color:transparent;}
.xcd-qcard{border:1px solid var(--border2);border-radius:14px;padding:14px 16px;margin-bottom:12px;background:var(--bg-app);}
.xcd-qcard.correct{border-left:4px solid #10b981;}
.xcd-qcard.partial{border-left:4px solid #f59e0b;}
.xcd-qcard.incorrect{border-left:4px solid #ef4444;}
.xcd-qcard-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px;}
.xcd-qtitle{font-size:13px;font-weight:700;color:var(--text-main);}
.xcd-qtopic{font-size:10.5px;color:var(--text-sub);font-weight:600;margin-top:2px;}
.xcd-status-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:700;white-space:nowrap;}
.xcd-status-chip.correct{background:rgba(16,185,129,.16);color:#34d399;}
.xcd-status-chip.partial{background:rgba(245,158,11,.16);color:#d99024;}
.xcd-status-chip.incorrect{background:rgba(239,68,68,.16);color:#f87171;}
.xcd-root:not([data-theme="dark"]) .xcd-status-chip.correct{color:#059669;}
.xcd-root:not([data-theme="dark"]) .xcd-status-chip.partial{color:#b45309;}
.xcd-root:not([data-theme="dark"]) .xcd-status-chip.incorrect{color:#dc2626;}
.xcd-qfeedback{font-size:12px;color:var(--text-sub);line-height:1.5;margin:6px 0 10px;}
.xcd-qcontrols{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.xcd-marks-input{width:70px;padding:7px 9px;border-radius:9px;border:1px solid var(--border2);background:var(--bg-input);color:var(--text-main);font-family:inherit;font-size:13px;font-weight:700;text-align:center;}
.xcd-confidence{font-size:10.5px;color:var(--text-sub);}
.xcd-teacher-note{width:100%;margin-top:8px;padding:8px 10px;border-radius:9px;border:1px solid var(--border2);background:var(--bg-input);color:var(--text-main);font-family:inherit;font-size:12px;resize:vertical;min-height:34px;}
.xcd-adjusted-tag{font-size:10px;font-weight:700;color:#a78bfa;background:rgba(139,92,246,.16);padding:2px 8px;border-radius:20px;}
.xcd-root:not([data-theme="dark"]) .xcd-adjusted-tag{color:#8b5cf6;}

/* ── Analytics ── */
.xcd-analytics-grid{display:grid;grid-template-columns:1.1fr 0.9fr;gap:16px;}
.xcd-chart-box{background:var(--bg-app);border:1px solid var(--border2);border-radius:14px;padding:16px;}
.xcd-list{list-style:none;display:flex;flex-direction:column;gap:8px;}
.xcd-list li{font-size:12.5px;color:var(--text-main);padding:9px 12px;border-radius:10px;background:var(--bg-app);border:1px solid var(--border2);display:flex;align-items:flex-start;gap:8px;line-height:1.4;}

/* ── Modal ── */
.xcd-modal-backdrop{position:fixed;inset:0;background:var(--overlay);backdrop-filter:blur(3px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;}
.xcd-modal{background:var(--bg-panel);border-radius:20px;border:1px solid var(--border);width:100%;max-width:560px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.35);}
.xcd-modal-head{padding:18px 22px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg-panel);z-index:1;}
.xcd-modal-title{font-size:15px;font-weight:800;color:var(--text-main);}
.xcd-modal-body{padding:20px 22px;display:flex;flex-direction:column;gap:14px;background:var(--bg-panel);}
.xcd-modal-foot{padding:16px 22px;border-top:1px solid var(--border2);display:flex;justify-content:flex-end;gap:10px;background:var(--bg-panel);position:sticky;bottom:0;}

/* ── Answer key list ── */
.xcd-ak-card{border:1px solid var(--border2);border-radius:14px;padding:16px 18px;background:var(--bg-app);}
.xcd-ak-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.xcd-ak-title{font-size:13.5px;font-weight:800;color:var(--text-main);}
.xcd-ak-meta{font-size:11.5px;color:var(--text-sub);}
.xcd-ak-qrow{display:flex;justify-content:space-between;font-size:12px;color:var(--text-main);padding:6px 0;border-top:1px dashed var(--border2);}

/* ── Progress overlay ── */
.xcd-progress-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 20px;color:var(--text-main);}
.xcd-spinner{width:38px;height:38px;border-radius:50%;border:3px solid var(--border2);border-top-color:#8b5cf6;animation:xcd-spin 0.8s linear infinite;}
@keyframes xcd-spin{to{transform:rotate(360deg);}}

/* ── Responsive ── */
@media (max-width: 1180px){
  .xcd-stats{grid-template-columns:repeat(2,1fr);}
}
@media (max-width: 1024px){
  .xcd-workspace{grid-template-columns:1fr;}
  .xcd-viewer{position:static;min-height:260px;}
  .xcd-analytics-grid{grid-template-columns:1fr;}
}
@media (max-width: 860px){
  .xcd-hero{margin:16px 18px 0;padding:16px 20px;}
  .xcd-tabs{margin:14px 18px 0;}
  .xcd-body{padding:16px 18px 74px;}
}
@media (max-width: 640px){
  .xcd-hero{margin:12px 14px 0;padding:16px 18px;flex-direction:column;align-items:flex-start;}
  .xcd-hero-inner{flex-direction:column;align-items:flex-start;}
  .xcd-tabs{margin:14px 14px 0;}
  .xcd-body{padding:14px 14px 70px;}
  .xcd-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .xcd-form-grid{grid-template-columns:1fr;}
  .xcd-hero-actions{width:100%;}
  .xcd-hero-btn{flex:1;justify-content:center;}
  .xcd-qcontrols{flex-direction:column;align-items:flex-start;}
  .xcd-panel-head{flex-direction:column;align-items:flex-start;}
}
@media (max-width: 420px){
  .xcd-stats{grid-template-columns:1fr;}
}
`;

// ══════════════════════════════════════════════════════════════════════════
// SMALL SUBCOMPONENTS
// ══════════════════════════════════════════════════════════════════════════
const STATUS_LABEL: Record<PaperStatus, string> = {
  pending: "Pending", evaluating: "Evaluating", corrected: "Corrected", finalized: "Finalized",
};
const STATUS_ICON: Record<PaperStatus, string> = {
  pending: "⏳", evaluating: "🤖", corrected: "✏️", finalized: "✅",
};

function StatusBadge({ status }: { status: PaperStatus }) {
  return (
    <span className={`xcd-badge ${status}`}>
      {STATUS_ICON[status]} {STATUS_LABEL[status]}
    </span>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

function useTheme(): [ThemeMode, () => void] {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (saved === "light" || saved === "dark") return saved;
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch {
      /* ignore */
    }
    return "light";
  });

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);
  return [theme, toggle];
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function ExamCorrectionDashboard() {
  const [theme, toggleTheme] = useTheme();
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("papers");
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAKModal, setShowAKModal] = useState(false);
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);

  // ── Initial load ──
  useEffect(() => {
    (async () => {
      const [p, k] = await Promise.all([examCorrectionAPI.getPapers(), examCorrectionAPI.getAnswerKeys()]);
      setPapers(p);
      setAnswerKeys(k);
      setLoading(false);
    })();
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const selectedPaper = useMemo(
    () => papers.find((p) => p.id === selectedPaperId) || null,
    [papers, selectedPaperId]
  );

  const classes = useMemo(() => Array.from(new Set(papers.map((p) => p.class))), [papers]);

  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      if (classFilter !== "all" && p.class !== classFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [papers, classFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = papers.length;
    const pendingCount = papers.filter((p) => p.status === "pending").length;
    const finalizedCount = papers.filter((p) => p.status === "finalized").length;
    const scored = papers.filter((p) => p.analytics);
    const avg = scored.length
      ? Math.round((scored.reduce((s, p) => s + (p.analytics?.percentage || 0), 0) / scored.length) * 10) / 10
      : 0;
    return { total, pendingCount, finalizedCount, avg };
  }, [papers]);

  // ── Actions ──
  const handleUpload = async (meta: {
    studentName: string; rollNumber: string; subject: string; class: string;
    examName: string; file: File; answerKeyId: string | null;
  }) => {
    const paper = await examCorrectionAPI.uploadPaper(meta);
    setPapers((prev) => [paper, ...prev]);
    setShowUploadModal(false);
    setSelectedPaperId(paper.id);
    setActiveTab("workspace");
    showToast("Paper uploaded successfully");
  };

  const handleRunAI = async (paperId: string) => {
    setEvaluatingId(paperId);
    setPapers((prev) => prev.map((p) => (p.id === paperId ? { ...p, status: "evaluating" } : p)));
    try {
      const updated = await examCorrectionAPI.runAIEvaluation(paperId);
      setPapers((prev) => prev.map((p) => (p.id === paperId ? updated : p)));
      showToast("AI correction complete");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "AI evaluation failed");
      setPapers((prev) => prev.map((p) => (p.id === paperId ? { ...p, status: "pending" } : p)));
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleUpdateCorrection = async (paperId: string, questionNumber: number, updates: Partial<QuestionCorrection>) => {
    const updated = await examCorrectionAPI.updateCorrection(paperId, questionNumber, updates);
    setPapers((prev) => prev.map((p) => (p.id === paperId ? updated : p)));
  };

  const handleFinalize = async (paperId: string) => {
    const updated = await examCorrectionAPI.finalizePaper(paperId);
    setPapers((prev) => prev.map((p) => (p.id === paperId ? updated : p)));
    showToast("Result finalized and marks locked");
  };

  const handleDelete = async (paperId: string) => {
    await examCorrectionAPI.deletePaper(paperId);
    setPapers((prev) => prev.filter((p) => p.id !== paperId));
    if (selectedPaperId === paperId) setSelectedPaperId(null);
    showToast("Paper removed");
  };

  const handleCreateAnswerKey = async (key: AnswerKey) => {
    await examCorrectionAPI.createAnswerKey(key);
    setAnswerKeys((prev) => [...prev, key]);
    setShowAKModal(false);
    showToast("Answer key saved");
  };

  const handleExport = (paper: ExamPaper) => {
    downloadTextFile(`${paper.studentName.replace(/\s+/g, "_")}_${paper.examName.replace(/\s+/g, "_")}_report.txt`, buildReportText(paper));
    showToast("Report downloaded");
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="xcd-root" data-theme={theme}>
        {/* ── Hero ── */}
        <div className="xcd-hero">
          <div className="xcd-hero-glow" />
          <div className="xcd-hero-inner">
            <div className="xcd-hero-left">
              <div className="xcd-hero-icon">📝</div>
              <div>
                <div className="xcd-hero-title">AI Exam Correction</div>
                <div className="xcd-hero-sub">Upload, auto-evaluate, and finalize student exam papers with AI-assisted grading.</div>
              </div>
            </div>
            <div className="xcd-hero-actions">
              <button className="xcd-theme-toggle" title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} onClick={toggleTheme}>
                {theme === "light" ? "🌙" : "☀️"}
              </button>
              <button className="xcd-hero-btn ghost" onClick={() => setShowAKModal(true)}>🔑 Answer Key</button>
              <button className="xcd-hero-btn" onClick={() => setShowUploadModal(true)}>📤 Upload Paper</button>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="xcd-tabs">
          {([
            { id: "papers", label: "Papers", icon: "📄", count: papers.length },
            { id: "workspace", label: "Correction Workspace", icon: "🛠️", count: null },
            { id: "analytics", label: "Analytics", icon: "📊", count: null },
            { id: "answerKeys", label: "Answer Keys", icon: "🔑", count: answerKeys.length },
          ] as { id: TabId; label: string; icon: string; count: number | null }[]).map((t) => (
            <button
              key={t.id}
              className={`xcd-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{t.icon}</span>{t.label}
              {t.count !== null && <span className="xcd-tab-badge">{t.count}</span>}
            </button>
          ))}
        </div>

        <div className="xcd-body">
          {loading ? (
            <div className="xcd-panel"><div className="xcd-progress-wrap"><div className="xcd-spinner" /><div>Loading exam papers…</div></div></div>
          ) : (
            <>
              {activeTab === "papers" && (
                <PapersTab
                  papers={filteredPapers}
                  stats={stats}
                  classes={classes}
                  classFilter={classFilter}
                  statusFilter={statusFilter}
                  onClassFilter={setClassFilter}
                  onStatusFilter={setStatusFilter}
                  onOpen={(id) => { setSelectedPaperId(id); setActiveTab("workspace"); }}
                  onUploadClick={() => setShowUploadModal(true)}
                  onDelete={handleDelete}
                  onRunAI={handleRunAI}
                  evaluatingId={evaluatingId}
                />
              )}

              {activeTab === "workspace" && (
                <WorkspaceTab
                  paper={selectedPaper}
                  papers={papers}
                  onSelectPaper={setSelectedPaperId}
                  onRunAI={handleRunAI}
                  evaluating={!!selectedPaper && evaluatingId === selectedPaper.id}
                  onUpdateCorrection={handleUpdateCorrection}
                  onFinalize={handleFinalize}
                  onExport={handleExport}
                  onViewAnalytics={() => setActiveTab("analytics")}
                />
              )}

              {activeTab === "analytics" && (
                <AnalyticsTab
                  paper={selectedPaper}
                  papers={papers}
                  onSelectPaper={setSelectedPaperId}
                  onExport={handleExport}
                />
              )}

              {activeTab === "answerKeys" && (
                <AnswerKeysTab answerKeys={answerKeys} onCreateClick={() => setShowAKModal(true)} />
              )}
            </>
          )}
        </div>

        <AnimatePresence>
          {showUploadModal && (
            <UploadModal
              answerKeys={answerKeys}
              onClose={() => setShowUploadModal(false)}
              onSubmit={handleUpload}
            />
          )}
          {showAKModal && (
            <AnswerKeyModal onClose={() => setShowAKModal(false)} onSubmit={handleCreateAnswerKey} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{
                position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                padding: "11px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                boxShadow: "0 10px 30px rgba(99,102,241,.35)", zIndex: 2000, fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: Papers (list + upload + filters + stats)
// ══════════════════════════════════════════════════════════════════════════
function PapersTab({
  papers, stats, classes, classFilter, statusFilter, onClassFilter, onStatusFilter,
  onOpen, onUploadClick, onDelete, onRunAI, evaluatingId,
}: {
  papers: ExamPaper[]; stats: { total: number; pendingCount: number; finalizedCount: number; avg: number };
  classes: string[]; classFilter: string; statusFilter: string;
  onClassFilter: (v: string) => void; onStatusFilter: (v: string) => void;
  onOpen: (id: string) => void; onUploadClick: () => void; onDelete: (id: string) => void;
  onRunAI: (id: string) => void; evaluatingId: string | null;
}) {
  return (
    <>
      <div className="xcd-stats">
        <div className="xcd-stat">
          <div className="xcd-stat-top"><div className="xcd-stat-icon" style={{ background: "rgba(99,102,241,.14)" }}>📄</div></div>
          <div className="xcd-stat-val">{stats.total}</div>
          <div className="xcd-stat-label">Total Papers</div>
        </div>
        <div className="xcd-stat">
          <div className="xcd-stat-top"><div className="xcd-stat-icon" style={{ background: "rgba(148,163,184,.18)" }}>⏳</div></div>
          <div className="xcd-stat-val">{stats.pendingCount}</div>
          <div className="xcd-stat-label">Pending Review</div>
        </div>
        <div className="xcd-stat">
          <div className="xcd-stat-top"><div className="xcd-stat-icon" style={{ background: "rgba(16,185,129,.16)" }}>✅</div></div>
          <div className="xcd-stat-val">{stats.finalizedCount}</div>
          <div className="xcd-stat-label">Finalized</div>
        </div>
        <div className="xcd-stat">
          <div className="xcd-stat-top"><div className="xcd-stat-icon" style={{ background: "rgba(236,72,153,.16)" }}>📈</div></div>
          <div className="xcd-stat-val">{stats.avg}%</div>
          <div className="xcd-stat-label">Average Score</div>
        </div>
      </div>

      <div className="xcd-panel">
        <div className="xcd-panel-head">
          <div>
            <div className="xcd-panel-title">Exam Papers</div>
            <div className="xcd-panel-sub">Upload new papers or continue correcting existing ones.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="xcd-select-inline" value={classFilter} onChange={(e) => onClassFilter(e.target.value)}>
              <option value="all">All Classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="xcd-select-inline" value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="evaluating">Evaluating</option>
              <option value="corrected">Corrected</option>
              <option value="finalized">Finalized</option>
            </select>
            <button className="xcd-btn primary" onClick={onUploadClick}>📤 Upload Paper</button>
          </div>
        </div>
        <div className="xcd-panel-body">
          {papers.length === 0 ? (
            <div className="xcd-empty">
              <div className="xcd-empty-icon">🗂️</div>
              <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>No exam papers yet</div>
              <div style={{ fontSize: 12.5 }}>Upload a paper to start AI-assisted correction.</div>
            </div>
          ) : (
            <div className="xcd-table-wrap">
              <table className="xcd-table">
                <thead>
                  <tr>
                    <th>Student</th><th>Exam</th><th>Class</th><th>Date</th><th>Score</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="xcd-name-cell">
                          <div className="xcd-avatar">{initials(p.studentName)}</div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{p.studentName}</div>
                            <div className="xcd-sub">{p.rollNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{p.examName}</div>
                        <div className="xcd-sub">{p.subject}</div>
                      </td>
                      <td>{p.class}</td>
                      <td>{formatDate(p.date)}</td>
                      <td>{p.analytics ? `${p.analytics.obtainedMarks}/${p.analytics.totalMarks} (${p.analytics.percentage}%)` : "—"}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {p.status === "pending" && (
                            <button className="xcd-icon-btn" title="Run AI correction" disabled={evaluatingId === p.id} onClick={() => onRunAI(p.id)}>
                              {evaluatingId === p.id ? "…" : "🤖"}
                            </button>
                          )}
                          <button className="xcd-icon-btn" title="Open" onClick={() => onOpen(p.id)}>🔍</button>
                          <button className="xcd-icon-btn" title="Delete" onClick={() => onDelete(p.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: Correction Workspace
// ══════════════════════════════════════════════════════════════════════════
function WorkspaceTab({
  paper, papers, onSelectPaper, onRunAI, evaluating, onUpdateCorrection, onFinalize, onExport, onViewAnalytics,
}: {
  paper: ExamPaper | null; papers: ExamPaper[]; onSelectPaper: (id: string) => void;
  onRunAI: (id: string) => void; evaluating: boolean;
  onUpdateCorrection: (paperId: string, qn: number, updates: Partial<QuestionCorrection>) => void;
  onFinalize: (id: string) => void; onExport: (paper: ExamPaper) => void; onViewAnalytics: () => void;
}) {
  if (!paper) {
    return (
      <div className="xcd-panel">
        <div className="xcd-panel-body">
          <div className="xcd-empty">
            <div className="xcd-empty-icon">🛠️</div>
            <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: 10 }}>Select a paper to start correcting</div>
            <select
              className="xcd-select-inline"
              defaultValue=""
              onChange={(e) => e.target.value && onSelectPaper(e.target.value)}
            >
              <option value="" disabled>Choose a paper…</option>
              {papers.map((p) => <option key={p.id} value={p.id}>{p.studentName} — {p.examName}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  const obtained = paper.corrections.reduce((s, c) => s + c.finalMarksAwarded, 0);
  const total = paper.corrections.reduce((s, c) => s + c.maxMarks, 0);
  const isLocked = paper.status === "finalized";

  return (
    <div>
      <div className="xcd-score-strip">
        <div className="xcd-name-cell">
          <div className="xcd-avatar">{initials(paper.studentName)}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{paper.studentName} <span className="xcd-sub">({paper.rollNumber})</span></div>
            <div className="xcd-sub">{paper.examName} · {paper.subject} · {paper.class}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {paper.corrections.length > 0 && (
            <div style={{ textAlign: "right" }}>
              <div className="xcd-score-big">{obtained}/{total}</div>
              <div className="xcd-sub">{total > 0 ? Math.round((obtained / total) * 1000) / 10 : 0}%</div>
            </div>
          )}
          <StatusBadge status={paper.status} />
        </div>
      </div>

      <div className="xcd-workspace">
        {/* Paper viewer */}
        <div className="xcd-panel">
          <div className="xcd-panel-head">
            <div>
              <div className="xcd-panel-title">Paper Preview</div>
              <div className="xcd-panel-sub">{paper.fileName}</div>
            </div>
          </div>
          <div className="xcd-panel-body">
            <div className="xcd-viewer">
              {paper.fileType === "image" && paper.fileUrl ? (
                <img src={paper.fileUrl} alt={paper.fileName} />
              ) : (
                <>
                  <div className="xcd-viewer-icon">📄</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{paper.fileName}</div>
                  <div className="xcd-sub">
                    {paper.fileUrl
                      ? "PDF preview — open in a new tab to view full document."
                      : "Preview will appear once the file is served from the backend."}
                  </div>
                  {/* 🔌 BACKEND: swap for an embedded PDF viewer (e.g. react-pdf) once files are served from the server */}
                  {paper.fileUrl && (
                    <a href={paper.fileUrl} target="_blank" rel="noreferrer" className="xcd-btn secondary" style={{ marginTop: 14 }}>
                      Open Full Paper
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Corrections */}
        <div className="xcd-panel">
          <div className="xcd-panel-head">
            <div>
              <div className="xcd-panel-title">AI Correction</div>
              <div className="xcd-panel-sub">
                {isLocked ? "Result finalized — marks are locked." : "Review AI-graded answers and adjust marks or feedback as needed."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {paper.corrections.length > 0 && (
                <button className="xcd-btn secondary" onClick={() => onExport(paper)}>⬇️ Export</button>
              )}
              {paper.corrections.length > 0 && (
                <button className="xcd-btn secondary" onClick={onViewAnalytics}>📊 Analytics</button>
              )}
              {!isLocked && paper.corrections.length > 0 && (
                <button className="xcd-btn success" onClick={() => onFinalize(paper.id)}>✅ Finalize</button>
              )}
            </div>
          </div>
          <div className="xcd-panel-body">
            {paper.corrections.length === 0 ? (
              evaluating ? (
                <div className="xcd-progress-wrap">
                  <div className="xcd-spinner" />
                  <div style={{ fontWeight: 700 }}>AI is reading and evaluating the paper…</div>
                  <div className="xcd-sub">This usually takes a few seconds.</div>
                </div>
              ) : (
                <div className="xcd-empty">
                  <div className="xcd-empty-icon">🤖</div>
                  <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
                    {paper.answerKeyId ? "Ready to run AI correction" : "No answer key linked"}
                  </div>
                  <div style={{ fontSize: 12.5, marginBottom: 14 }}>
                    {paper.answerKeyId
                      ? "AI will grade each answer against the linked marking scheme."
                      : "Link an answer key from the Answer Keys tab, then re-upload or reassign this paper."}
                  </div>
                  {paper.answerKeyId && (
                    <button className="xcd-btn primary" onClick={() => onRunAI(paper.id)}>🤖 Run AI Correction</button>
                  )}
                </div>
              )
            ) : (
              paper.corrections.map((c) => (
                <QuestionCard
                  key={c.questionNumber}
                  correction={c}
                  locked={isLocked}
                  onChange={(updates) => onUpdateCorrection(paper.id, c.questionNumber, updates)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  correction, locked, onChange,
}: { correction: QuestionCorrection; locked: boolean; onChange: (u: Partial<QuestionCorrection>) => void }) {
  const [marks, setMarks] = useState(correction.finalMarksAwarded);
  const [note, setNote] = useState(correction.teacherFeedback);

  useEffect(() => { setMarks(correction.finalMarksAwarded); }, [correction.finalMarksAwarded]);
  useEffect(() => { setNote(correction.teacherFeedback); }, [correction.teacherFeedback]);

  const commitMarks = (val: number) => {
    const clamped = Math.max(0, Math.min(correction.maxMarks, val));
    setMarks(clamped);
    onChange({ finalMarksAwarded: clamped });
  };

  const statusLabel = { correct: "✅ Correct", partial: "🟡 Partial", incorrect: "❌ Incorrect" }[correction.aiStatus];

  return (
    <div className={`xcd-qcard ${correction.aiStatus}`}>
      <div className="xcd-qcard-head">
        <div>
          <div className="xcd-qtitle">Q{correction.questionNumber}. {correction.questionText}</div>
          <div className="xcd-qtopic">{correction.topic}</div>
        </div>
        <span className={`xcd-status-chip ${correction.aiStatus}`}>{statusLabel}</span>
      </div>
      <div className="xcd-qfeedback">🤖 {correction.aiFeedback}</div>
      <div className="xcd-qcontrols">
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-sub)", fontWeight: 700 }}>
          Marks:
          <input
            type="number" className="xcd-marks-input" value={marks} min={0} max={correction.maxMarks} disabled={locked}
            onChange={(e) => setMarks(Number(e.target.value))}
            onBlur={(e) => commitMarks(Number(e.target.value))}
          />
          / {correction.maxMarks}
        </label>
        <span className="xcd-confidence">AI confidence: {correction.aiConfidence}%</span>
        {correction.adjustedByTeacher && <span className="xcd-adjusted-tag">Adjusted by teacher</span>}
      </div>
      <textarea
        className="xcd-teacher-note"
        placeholder="Add or override feedback for this answer…"
        value={note}
        disabled={locked}
        onChange={(e) => setNote(e.target.value)}
        onBlur={(e) => onChange({ teacherFeedback: e.target.value })}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: Analytics
// ══════════════════════════════════════════════════════════════════════════
function AnalyticsTab({
  paper, papers, onSelectPaper, onExport,
}: { paper: ExamPaper | null; papers: ExamPaper[]; onSelectPaper: (id: string) => void; onExport: (p: ExamPaper) => void }) {
  const scoredPapers = useMemo(() => papers.filter((p) => p.analytics), [papers]);

  const classAverages = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    scoredPapers.forEach((p) => {
      const cur = map.get(p.class) || { sum: 0, count: 0 };
      cur.sum += p.analytics?.percentage || 0;
      cur.count += 1;
      map.set(p.class, cur);
    });
    return Array.from(map.entries()).map(([cls, v]) => ({ class: cls, avg: Math.round((v.sum / v.count) * 10) / 10 }));
  }, [scoredPapers]);

  if (!paper || !paper.analytics) {
    return (
      <div className="xcd-panel">
        <div className="xcd-panel-body">
          {scoredPapers.length > 0 && (
            <div className="xcd-chart-box" style={{ marginBottom: 20 }}>
              <div className="xcd-panel-title" style={{ marginBottom: 12 }}>Average Score by Class</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={classAverages}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border2)" />
                  <XAxis dataKey="class" tick={{ fontSize: 12, fill: "var(--text-sub)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--text-sub)" }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--bg-panel)", border: "1px solid var(--border2)", borderRadius: 10, color: "var(--text-main)" }} />
                  <Bar dataKey="avg" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="xcd-empty">
            <div className="xcd-empty-icon">📊</div>
            <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: 10 }}>
              Select a corrected paper to see detailed analytics
            </div>
            <select
              className="xcd-select-inline"
              defaultValue=""
              onChange={(e) => e.target.value && onSelectPaper(e.target.value)}
            >
              <option value="" disabled>Choose a corrected paper…</option>
              {scoredPapers.map((p) => <option key={p.id} value={p.id}>{p.studentName} — {p.examName}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  const a = paper.analytics;
  const pieData = [
    { name: "Correct", value: paper.corrections.filter((c) => c.aiStatus === "correct").length },
    { name: "Partial", value: paper.corrections.filter((c) => c.aiStatus === "partial").length },
    { name: "Incorrect", value: paper.corrections.filter((c) => c.aiStatus === "incorrect").length },
  ];
  const barData = paper.corrections.map((c) => ({
    q: `Q${c.questionNumber}`, obtained: c.finalMarksAwarded, max: c.maxMarks,
  }));

  return (
    <div>
      <div className="xcd-panel" style={{ marginBottom: 16 }}>
        <div className="xcd-panel-head">
          <div>
            <div className="xcd-panel-title">{paper.studentName} — {paper.examName}</div>
            <div className="xcd-panel-sub">{paper.subject} · {paper.class} · {formatDate(paper.date)}</div>
          </div>
          <button className="xcd-btn secondary" onClick={() => onExport(paper)}>⬇️ Export Report</button>
        </div>
        <div className="xcd-panel-body">
          <div className="xcd-stats" style={{ marginBottom: 18 }}>
            <div className="xcd-stat">
              <div className="xcd-stat-val">{a.obtainedMarks}/{a.totalMarks}</div>
              <div className="xcd-stat-label">Marks Obtained</div>
            </div>
            <div className="xcd-stat">
              <div className="xcd-stat-val">{a.percentage}%</div>
              <div className="xcd-stat-label">Percentage</div>
            </div>
            <div className="xcd-stat">
              <div className="xcd-stat-val">{a.grade}</div>
              <div className="xcd-stat-label">Grade</div>
            </div>
            <div className="xcd-stat">
              <div className="xcd-stat-val">{paper.corrections.filter((c) => c.adjustedByTeacher).length}</div>
              <div className="xcd-stat-label">Teacher Adjustments</div>
            </div>
          </div>

          <div className="xcd-analytics-grid">
            <div className="xcd-chart-box">
              <div className="xcd-panel-title" style={{ marginBottom: 10 }}>Question-wise Performance</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border2)" />
                  <XAxis dataKey="q" tick={{ fontSize: 11, fill: "var(--text-sub)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-sub)" }} />
                  <Tooltip contentStyle={{ background: "var(--bg-panel)", border: "1px solid var(--border2)", borderRadius: 10, color: "var(--text-main)" }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-sub)" }} />
                  <Bar dataKey="obtained" name="Obtained" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="max" name="Max Marks" fill="#c7d2fe" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="xcd-chart-box">
              <div className="xcd-panel-title" style={{ marginBottom: 10 }}>Answer Breakdown</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--bg-panel)", border: "1px solid var(--border2)", borderRadius: 10, color: "var(--text-main)" }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-sub)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xcd-analytics-grid" style={{ marginTop: 16 }}>
            <div>
              <div className="xcd-panel-title" style={{ marginBottom: 10 }}>💪 Strengths</div>
              <ul className="xcd-list">
                {a.strengths.map((s, i) => <li key={i}>✅ {s}</li>)}
              </ul>
            </div>
            <div>
              <div className="xcd-panel-title" style={{ marginBottom: 10 }}>⚠️ Weaknesses</div>
              <ul className="xcd-list">
                {a.weaknesses.map((s, i) => <li key={i}>⚠️ {s}</li>)}
              </ul>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="xcd-panel-title" style={{ marginBottom: 10 }}>🔁 Common Mistakes</div>
            <ul className="xcd-list">
              {a.commonMistakes.map((m, i) => <li key={i}>🔸 {m}</li>)}
            </ul>
          </div>

          <div className="xcd-chart-box" style={{ marginTop: 16 }}>
            <div className="xcd-panel-title" style={{ marginBottom: 6 }}>🧭 Performance Insight</div>
            <div style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.6 }}>{a.performanceInsight}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: Answer Keys
// ══════════════════════════════════════════════════════════════════════════
function AnswerKeysTab({ answerKeys, onCreateClick }: { answerKeys: AnswerKey[]; onCreateClick: () => void }) {
  return (
    <div className="xcd-panel">
      <div className="xcd-panel-head">
        <div>
          <div className="xcd-panel-title">Answer Keys &amp; Marking Criteria</div>
          <div className="xcd-panel-sub">AI evaluation uses these to grade uploaded papers.</div>
        </div>
        <button className="xcd-btn primary" onClick={onCreateClick}>➕ New Answer Key</button>
      </div>
      <div className="xcd-panel-body">
        {answerKeys.length === 0 ? (
          <div className="xcd-empty">
            <div className="xcd-empty-icon">🔑</div>
            <div style={{ fontWeight: 700, color: "var(--text-main)" }}>No answer keys yet</div>
            <div style={{ fontSize: 12.5 }}>Create one so AI correction has a marking scheme to grade against.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {answerKeys.map((k) => (
              <div className="xcd-ak-card" key={k.id}>
                <div className="xcd-ak-head">
                  <div className="xcd-ak-title">{k.examName}</div>
                  <span className="xcd-badge corrected">{k.totalMarks} marks</span>
                </div>
                <div className="xcd-ak-meta">{k.subject} · {k.class} · {k.questions.length} questions</div>
                {k.questions.map((q) => (
                  <div className="xcd-ak-qrow" key={q.questionNumber}>
                    <span>Q{q.questionNumber}. {q.questionText}</span>
                    <span style={{ fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{q.maxMarks}m</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MODAL: Upload Paper
// ══════════════════════════════════════════════════════════════════════════
function UploadModal({
  answerKeys, onClose, onSubmit,
}: {
  answerKeys: AnswerKey[]; onClose: () => void;
  onSubmit: (meta: { studentName: string; rollNumber: string; subject: string; class: string; examName: string; file: File; answerKeyId: string | null }) => void;
}) {
  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [answerKeyId, setAnswerKeyId] = useState<string>(answerKeys[0]?.id || "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedKey = answerKeys.find((k) => k.id === answerKeyId) || null;
  const canSubmit = studentName.trim() && rollNumber.trim() && file && selectedKey;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedKey || !file) return;
    setSubmitting(true);
    await onSubmit({
      studentName: studentName.trim(), rollNumber: rollNumber.trim(),
      subject: selectedKey.subject, class: selectedKey.class, examName: selectedKey.examName,
      file, answerKeyId: selectedKey.id,
    });
    setSubmitting(false);
  };

  return (
    <motion.div className="xcd-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="xcd-modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="xcd-modal-head">
          <div className="xcd-modal-title">Upload Exam Paper</div>
          <button className="xcd-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="xcd-modal-body">
          <div className="xcd-form-grid">
            <div className="xcd-field">
              <label>Student Name</label>
              <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Aarav Sharma" />
            </div>
            <div className="xcd-field">
              <label>Roll Number</label>
              <input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. 10A-14" />
            </div>
          </div>

          <div className="xcd-field">
            <label>Answer Key / Marking Scheme</label>
            <select value={answerKeyId} onChange={(e) => setAnswerKeyId(e.target.value)}>
              <option value="" disabled>Select an answer key…</option>
              {answerKeys.map((k) => <option key={k.id} value={k.id}>{k.examName} — {k.subject} ({k.class})</option>)}
            </select>
            {answerKeys.length === 0 && (
              <div style={{ fontSize: 11.5, color: "#f87171" }}>No answer keys available — create one first from the Answer Keys tab.</div>
            )}
          </div>

          <div className="xcd-field">
            <label>Exam Paper File</label>
            <label className="xcd-upload-area" style={{ padding: "26px 16px" }}>
              <div className="xcd-upload-icon">📤</div>
              <div className="xcd-upload-text">{file ? file.name : "Click or drag to upload"}</div>
              <div className="xcd-upload-subtext">PDF, PNG, or JPG — up to 10MB</div>
              <input ref={inputRef} type="file" hidden accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
        <div className="xcd-modal-foot">
          <button className="xcd-btn secondary" onClick={onClose}>Cancel</button>
          <button className="xcd-btn primary" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? "Uploading…" : "Upload & Continue"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MODAL: Create Answer Key
// ══════════════════════════════════════════════════════════════════════════
function AnswerKeyModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (key: AnswerKey) => void }) {
  const [examName, setExamName] = useState("");
  const [subject, setSubject] = useState("");
  const [cls, setCls] = useState("");
  const [questions, setQuestions] = useState<AnswerKeyQuestion[]>([
    { questionNumber: 1, questionText: "", topic: "", maxMarks: 5, modelAnswer: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addQuestion = () => {
    setQuestions((qs) => [...qs, { questionNumber: qs.length + 1, questionText: "", topic: "", maxMarks: 5, modelAnswer: "" }]);
  };
  const removeQuestion = (idx: number) => {
    setQuestions((qs) => qs.filter((_, i) => i !== idx).map((q, i) => ({ ...q, questionNumber: i + 1 })));
  };
  const updateQuestion = (idx: number, patch: Partial<AnswerKeyQuestion>) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const totalMarks = questions.reduce((s, q) => s + (Number(q.maxMarks) || 0), 0);
  const canSubmit = examName.trim() && subject.trim() && cls.trim() && questions.every((q) => q.questionText.trim() && q.topic.trim() && q.maxMarks > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const key: AnswerKey = {
      id: genId("AK"), examName: examName.trim(), subject: subject.trim(), class: cls.trim(),
      totalMarks, createdAt: new Date().toISOString().split("T")[0], questions,
    };
    await onSubmit(key);
    setSubmitting(false);
  };

  return (
    <motion.div className="xcd-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="xcd-modal" style={{ maxWidth: 640 }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="xcd-modal-head">
          <div className="xcd-modal-title">Create Answer Key</div>
          <button className="xcd-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="xcd-modal-body">
          <div className="xcd-form-grid">
            <div className="xcd-field">
              <label>Exam Name</label>
              <input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="e.g. Mid-Term Examination" />
            </div>
            <div className="xcd-field">
              <label>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
            </div>
            <div className="xcd-field">
              <label>Class</label>
              <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="e.g. 10-A" />
            </div>
            <div className="xcd-field">
              <label>Total Marks</label>
              <input value={totalMarks} readOnly />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {questions.map((q, idx) => (
              <div key={idx} className="xcd-ak-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <strong style={{ fontSize: 12.5, color: "var(--text-main)" }}>Question {q.questionNumber}</strong>
                  {questions.length > 1 && <button className="xcd-icon-btn" onClick={() => removeQuestion(idx)}>🗑️</button>}
                </div>
                <div className="xcd-field" style={{ marginBottom: 8 }}>
                  <label>Question Text</label>
                  <input value={q.questionText} onChange={(e) => updateQuestion(idx, { questionText: e.target.value })} placeholder="e.g. Solve for x: 2x + 5 = 17" />
                </div>
                <div className="xcd-form-grid">
                  <div className="xcd-field">
                    <label>Topic</label>
                    <input value={q.topic} onChange={(e) => updateQuestion(idx, { topic: e.target.value })} placeholder="e.g. Algebra" />
                  </div>
                  <div className="xcd-field">
                    <label>Max Marks</label>
                    <input type="number" min={1} value={q.maxMarks} onChange={(e) => updateQuestion(idx, { maxMarks: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="xcd-field" style={{ marginTop: 8 }}>
                  <label>Model Answer (used as AI grading reference)</label>
                  <textarea value={q.modelAnswer} onChange={(e) => updateQuestion(idx, { modelAnswer: e.target.value })} placeholder="Expected answer / key points" style={{ minHeight: 44 }} />
                </div>
              </div>
            ))}
            <button className="xcd-btn secondary" onClick={addQuestion}>➕ Add Question</button>
          </div>
        </div>
        <div className="xcd-modal-foot">
          <button className="xcd-btn secondary" onClick={onClose}>Cancel</button>
          <button className="xcd-btn primary" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? "Saving…" : "Save Answer Key"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}