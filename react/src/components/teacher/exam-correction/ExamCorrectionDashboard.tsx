import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useTheme as useAppTheme } from "../../../hooks/use-theme";
import roboMagnifier from "../../../assets/dashboard/11_robot_magnifying_glass.png";
import roboStudy from "../../../assets/dashboard/study-robo.png";

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
    corrections: [
      { questionNumber: 1, questionText: "Solve for x: 2x + 5 = 17", topic: "Algebra", maxMarks: 5, aiMarksAwarded: 5, finalMarksAwarded: 5, aiStatus: "correct", aiConfidence: 96, aiFeedback: "Complete and accurate answer with correct method shown.", teacherFeedback: "", adjustedByTeacher: false },
      { questionNumber: 2, questionText: "Find the roots of x² − 7x + 12 = 0", topic: "Algebra", maxMarks: 10, aiMarksAwarded: 10, finalMarksAwarded: 10, aiStatus: "correct", aiConfidence: 94, aiFeedback: "Factoring method executed properly, roots verified.", teacherFeedback: "", adjustedByTeacher: false },
      { questionNumber: 3, questionText: "Prove that the sum of angles in a triangle is 180°", topic: "Geometry", maxMarks: 10, aiMarksAwarded: 8, finalMarksAwarded: 9, aiStatus: "partial", aiConfidence: 88, aiFeedback: "Correct diagram and logic, minor missing label in alternate angles step.", teacherFeedback: "Gave +1 mark for neat diagram and clear structure.", adjustedByTeacher: true },
      { questionNumber: 4, questionText: "Find sin(30°) + cos(60°)", topic: "Trigonometry", maxMarks: 5, aiMarksAwarded: 5, finalMarksAwarded: 5, aiStatus: "correct", aiConfidence: 98, aiFeedback: "Accurate values (1/2 + 1/2 = 1).", teacherFeedback: "", adjustedByTeacher: false },
      { questionNumber: 5, questionText: "Differentiate y = 3x² + 2x with respect to x", topic: "Calculus", maxMarks: 10, aiMarksAwarded: 7, finalMarksAwarded: 8, aiStatus: "partial", aiConfidence: 85, aiFeedback: "Power rule applied correctly, minor notation omission.", teacherFeedback: "", adjustedByTeacher: false },
      { questionNumber: 6, questionText: "Find the mean of 4, 8, 15, 16, 23, 42", topic: "Statistics", maxMarks: 10, aiMarksAwarded: 10, finalMarksAwarded: 10, aiStatus: "correct", aiConfidence: 95, aiFeedback: "Sum = 108 / 6 = 18. Perfect working.", teacherFeedback: "", adjustedByTeacher: false },
    ],
    analytics: {
      totalMarks: 50, obtainedMarks: 47, percentage: 94, grade: "A+",
      strengths: ["Algebra", "Statistics", "Trigonometry", "Geometry"],
      weaknesses: ["Calculus notation"],
      commonMistakes: ["Minor notation missing in differential calculus step."],
      performanceInsight: "Exceptional mastery across mathematical foundations with neat, structured step-by-step proofs.",
    },
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
    finalizedAt: null,
    corrections: [
      { questionNumber: 1, questionText: "Solve for x: 2x + 5 = 17", topic: "Algebra", maxMarks: 5, aiMarksAwarded: 5, finalMarksAwarded: 5, aiStatus: "correct", aiConfidence: 96, aiFeedback: "Full marks, neat steps.", teacherFeedback: "", adjustedByTeacher: false },
      { questionNumber: 2, questionText: "Find the roots of x² − 7x + 12 = 0", topic: "Algebra", maxMarks: 10, aiMarksAwarded: 8, finalMarksAwarded: 8, aiStatus: "partial", aiConfidence: 89, aiFeedback: "Calculated one root correctly; omitted second root check.", teacherFeedback: "", adjustedByTeacher: false },
      { questionNumber: 3, questionText: "Prove that the sum of angles in a triangle is 180°", topic: "Geometry", maxMarks: 10, aiMarksAwarded: 10, finalMarksAwarded: 10, aiStatus: "correct", aiConfidence: 92, aiFeedback: "All axioms stated clearly.", teacherFeedback: "", adjustedByTeacher: false },
      { questionNumber: 4, questionText: "Find sin(30°) + cos(60°)", topic: "Trigonometry", maxMarks: 5, aiMarksAwarded: 5, finalMarksAwarded: 5, aiStatus: "correct", aiConfidence: 97, aiFeedback: "Correct substitution.", teacherFeedback: "", adjustedByTeacher: false },
      { questionNumber: 5, questionText: "Differentiate y = 3x² + 2x with respect to x", topic: "Calculus", maxMarks: 10, aiMarksAwarded: 4, finalMarksAwarded: 4, aiStatus: "incorrect", aiConfidence: 91, aiFeedback: "Confused integration and differentiation rules.", teacherFeedback: "Needs practice with power rule differentiation.", adjustedByTeacher: true },
      { questionNumber: 6, questionText: "Find the mean of 4, 8, 15, 16, 23, 42", topic: "Statistics", maxMarks: 10, aiMarksAwarded: 10, finalMarksAwarded: 10, aiStatus: "correct", aiConfidence: 95, aiFeedback: "Sum = 108 / 6 = 18.", teacherFeedback: "", adjustedByTeacher: false },
    ],
    analytics: {
      totalMarks: 50, obtainedMarks: 42, percentage: 84, grade: "A",
      strengths: ["Statistics", "Geometry", "Trigonometry"],
      weaknesses: ["Calculus", "Algebra roots checking"],
      commonMistakes: ["Applied integration instead of derivative rule for Q5."],
      performanceInsight: "Strong grasp on foundational arithmetic and proofs; needs targeted practice on differentiation fundamentals.",
    },
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

const SUBJECT_PALETTE = ["#2389ff", "#27b86a", "#7e45e8", "#ff791f", "#00a7c8", "#ff4d8d"];

function getStudentColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}

// ══════════════════════════════════════════════════════════════════════════
// API CONFIGURATION — Backend-ready & JSON-driven
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
// ══════════════════════════════════════════════════════════════════════════
interface StoreShape {
  papers: ExamPaper[];
  answerKeys: AnswerKey[];
}

function loadStore(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { papers: seedPapers, answerKeys: seedAnswerKeys };
}

function saveStore(store: StoreShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

const examCorrectionAPI = {
  async getPapers(): Promise<ExamPaper[]> {
    if (!API_CONFIG.USE_MOCK_DATA) return apiRequest<ExamPaper[]>("listPapers");
    await new Promise((r) => setTimeout(r, 200));
    return loadStore().papers;
  },

  async getAnswerKeys(): Promise<AnswerKey[]> {
    if (!API_CONFIG.USE_MOCK_DATA) return apiRequest<AnswerKey[]>("listAnswerKeys");
    await new Promise((r) => setTimeout(r, 200));
    return loadStore().answerKeys;
  },

  async createAnswerKey(key: AnswerKey): Promise<AnswerKey> {
    if (!API_CONFIG.USE_MOCK_DATA) return apiRequest<AnswerKey>("createAnswerKey", { body: key });
    await new Promise((r) => setTimeout(r, 250));
    const store = loadStore();
    store.answerKeys.unshift(key);
    saveStore(store);
    return key;
  },

  async uploadPaper(meta: {
    studentName: string; rollNumber: string; subject: string; class: string;
    examName: string; file: File; answerKeyId: string | null;
  }): Promise<ExamPaper> {
    if (!API_CONFIG.USE_MOCK_DATA) {
      const fd = new FormData();
      Object.entries(meta).forEach(([k, v]) => { if (v !== null) fd.append(k, v as any); });
      const res = await fetch(buildUrl(API_CONFIG.ENDPOINTS.uploadPaper.path), { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 400));
    const isImg = meta.file.type.startsWith("image/");
    const fakeUrl = URL.createObjectURL(meta.file);
    const newPaper: ExamPaper = {
      id: genId("P"),
      studentName: meta.studentName,
      rollNumber: meta.rollNumber,
      subject: meta.subject,
      class: meta.class,
      examName: meta.examName,
      date: new Date().toISOString().split("T")[0],
      fileUrl: fakeUrl,
      fileName: meta.file.name,
      fileType: isImg ? "image" : "pdf",
      status: "pending",
      answerKeyId: meta.answerKeyId,
      corrections: [],
      analytics: null,
      uploadedAt: new Date().toISOString(),
      finalizedAt: null,
    };
    const store = loadStore();
    store.papers.unshift(newPaper);
    saveStore(store);
    return newPaper;
  },

  async runAIEvaluation(paperId: string): Promise<ExamPaper> {
    if (!API_CONFIG.USE_MOCK_DATA) return apiRequest<ExamPaper>("runAIEvaluation", { params: { id: paperId } });
    await new Promise((r) => setTimeout(r, 1400));
    const store = loadStore();
    const paper = store.papers.find((p) => p.id === paperId);
    if (!paper) throw new Error("Paper not found");
    const key = store.answerKeys.find((k) => k.id === paper.answerKeyId);
    if (!key) throw new Error("No linked answer key found for this exam");

    const rnd = seededRandom(`${paperId}-${key.id}`);
    const corrections: QuestionCorrection[] = key.questions.map((q) => {
      const roll = rnd();
      let status: QuestionStatus;
      let ratio: number;
      if (roll > 0.35) { status = "correct"; ratio = 1; }
      else if (roll > 0.12) { status = "partial"; ratio = 0.5 + rnd() * 0.35; }
      else { status = "incorrect"; ratio = 0; }
      const awarded = Math.round(q.maxMarks * ratio);
      const pool = AI_FEEDBACK[status];
      const feedback = pool[Math.floor(rnd() * pool.length)];
      const confidence = Math.round(82 + rnd() * 16);
      return {
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        topic: q.topic,
        maxMarks: q.maxMarks,
        aiMarksAwarded: awarded,
        finalMarksAwarded: awarded,
        aiStatus: status,
        aiConfidence: confidence,
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

  async updateCorrection(
    paperId: string, questionNumber: number, updates: Partial<QuestionCorrection>
  ): Promise<ExamPaper> {
    if (!API_CONFIG.USE_MOCK_DATA) {
      return apiRequest<ExamPaper>("updateCorrection", {
        params: { id: paperId, questionNumber },
        body: updates,
      });
    }
    const store = loadStore();
    const paper = store.papers.find((p) => p.id === paperId);
    if (!paper) throw new Error("Paper not found");
    const target = paper.corrections.find((c) => c.questionNumber === questionNumber);
    if (!target) throw new Error("Question not found");

    if (updates.finalMarksAwarded !== undefined && updates.finalMarksAwarded !== target.aiMarksAwarded) {
      updates.adjustedByTeacher = true;
    }
    Object.assign(target, updates);
    paper.analytics = computeAnalytics(paper, paper.corrections);
    saveStore(store);
    return { ...paper };
  },

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
  if (percentage >= 85) performanceInsight = "Outstanding performance with strong command across core syllabus concepts.";
  else if (percentage >= 70) performanceInsight = "Solid understanding overall, with a few topics that could benefit from quick revision.";
  else if (percentage >= 50) performanceInsight = "Moderate performance — targeted homework and guided practice recommended.";
  else performanceInsight = "Key conceptual gaps identified; a structured 1-on-1 revision plan is highly recommended.";

  return {
    totalMarks, obtainedMarks, percentage, grade: getGrade(percentage),
    strengths: strengths.length ? strengths : ["Consistent effort across questions"],
    weaknesses: weaknesses.length ? weaknesses : ["No critical weak areas identified"],
    commonMistakes: commonMistakes.length ? commonMistakes : ["No recurring errors noted"],
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
  lines.push(`EXAM EVALUATION REPORT`);
  lines.push(`==========================================`);
  lines.push(`Student: ${paper.studentName} (${paper.rollNumber})`);
  lines.push(`Class: ${paper.class}   Subject: ${paper.subject}`);
  lines.push(`Exam: ${paper.examName}   Date: ${formatDate(paper.date)}`);
  lines.push(`Status: ${paper.status.toUpperCase()}`);
  lines.push(``);
  if (a) {
    lines.push(`TOTAL SCORE: ${a.obtainedMarks} / ${a.totalMarks}  (${a.percentage}%)  Grade: ${a.grade}`);
    lines.push(``);
    lines.push(`Strengths: ${a.strengths.join(", ")}`);
    lines.push(`Weaknesses: ${a.weaknesses.join(", ")}`);
    lines.push(``);
    lines.push(`Common Mistakes:`);
    a.commonMistakes.forEach((m) => lines.push(`  - ${m}`));
    lines.push(``);
    lines.push(`Pedagogical Insight: ${a.performanceInsight}`);
    lines.push(``);
  }
  lines.push(`QUESTION-WISE BREAKDOWN`);
  lines.push(`------------------------------------------`);
  paper.corrections.forEach((c) => {
    lines.push(`Q${c.questionNumber}. ${c.questionText}`);
    lines.push(`  Topic: ${c.topic}   Marks: ${c.finalMarksAwarded}/${c.maxMarks}   AI Status: ${c.aiStatus}`);
    lines.push(`  AI Feedback: ${c.aiFeedback}`);
    if (c.teacherFeedback) lines.push(`  Teacher Note: ${c.teacherFeedback}`);
    lines.push(``);
  });
  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════════════════
// ANIMATED NUMBER COUNTER (from Teacher Dashboard)
// ══════════════════════════════════════════════════════════════════════════
function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      setValue(Math.round((target * Math.min(frame, 38)) / 38));
      if (frame < 38) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{value}{suffix}</>;
}

// ══════════════════════════════════════════════════════════════════════════
// STYLES — Teacher Dashboard Visual Language & Color Formats
// ══════════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;}

.xcd-root{
  min-height: 100%;
  padding: 18px clamp(14px, 2.5vw, 28px) 80px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--sd-ink);
  background: radial-gradient(circle at 14% 9%, rgba(35,137,255,.09), transparent 28%),
              radial-gradient(circle at 88% 14%, rgba(255,178,29,.12), transparent 26%),
              linear-gradient(180deg, var(--sd-page), var(--sd-page-2));
  --sd-page: #fbfcff;
  --sd-page-2: #f5f7ff;
  --sd-card: #ffffff;
  --sd-card-soft: #f7faff;
  --sd-ink: #071235;
  --sd-muted: #64748b;
  --sd-faint: #94a3b8;
  --sd-line: rgba(15, 23, 42, 0.08);
  --sd-border2: rgba(15, 23, 42, 0.05);
  --sd-shadow: 0 14px 34px rgba(35, 44, 87, 0.10);
  --sd-shadow-soft: 0 8px 20px rgba(35, 44, 87, 0.06);
  --sd-input-bg: #ffffff;
  position: relative;
  overflow-x: hidden;
  transition: background .25s ease, color .25s ease;
}

[data-theme="dark"] .xcd-root,
.dark .xcd-root{
  --sd-page: #080d1f;
  --sd-page-2: #10172d;
  --sd-card: rgba(23, 31, 58, 0.94);
  --sd-card-soft: rgba(31, 42, 76, 0.74);
  --sd-ink: #f6f7ff;
  --sd-muted: #a5b4d4;
  --sd-faint: #7887a7;
  --sd-line: rgba(255, 255, 255, 0.12);
  --sd-border2: rgba(255, 255, 255, 0.08);
  --sd-shadow: 0 20px 54px rgba(0, 0, 0, 0.48);
  --sd-shadow-soft: 0 12px 30px rgba(0, 0, 0, 0.28);
  --sd-input-bg: rgba(20, 27, 51, 0.88);
}

/* ── Ambient Floating Particles ── */
.xcd-root::before, .xcd-root::after{
  content: "";
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(40px);
  opacity: .5;
  animation: sdFloatBg 12s ease-in-out infinite alternate;
}
.xcd-root::before{
  width: 280px; height: 280px;
  left: -80px; top: 90px;
  background: radial-gradient(circle, rgba(46, 182, 255, .16), transparent 70%);
}
.xcd-root::after{
  width: 320px; height: 320px;
  right: -100px; top: 400px;
  background: radial-gradient(circle, rgba(255, 178, 29, .14), transparent 70%);
  animation-delay: -5s;
}

@keyframes sdFloatBg{
  from{ transform: translate3d(0,0,0) scale(1); }
  to{ transform: translate3d(24px, 30px, 0) scale(1.08); }
}
@keyframes sdCardIn{
  from{ opacity: 0; transform: translateY(14px) scale(.985); }
  to{ opacity: 1; transform: none; }
}
@keyframes sdPop3d{
  0%,100%{ transform: translateY(0) rotate(-2deg) scale(1); }
  50%{ transform: translateY(-8px) rotate(3deg) scale(1.04); }
}
@keyframes sdBreathe{
  0%,100%{ transform: scale(1); opacity: .7; }
  50%{ transform: scale(1.08); opacity: .95; }
}
@keyframes sdShine{
  0%{ transform: translateX(-140%) rotate(18deg); }
  40%,100%{ transform: translateX(240%) rotate(18deg); }
}
@keyframes sdDrift{
  0%,100%{ transform: translate3d(0,0,0) rotate(0); }
  50%{ transform: translate3d(16px, -14px, 0) rotate(6deg); }
}
@keyframes sdPulseSoft{
  0%,100%{ box-shadow: 0 0 0 0 rgba(16,185,129,.24); }
  50%{ box-shadow: 0 0 0 8px rgba(16,185,129,0); }
}
@keyframes sdProgressSweep{
  0%{ transform: translateX(-120%) skewX(-20deg); }
  100%{ transform: translateX(220%) skewX(-20deg); }
}
@keyframes sdWiggle{
  0%,100%{ transform: rotate(0) scale(1); }
  30%{ transform: rotate(-4deg) scale(1.05); }
  70%{ transform: rotate(4deg) scale(1.05); }
}

.xcd-shell{
  max-width: 1240px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── Hero Banner (Sunny & Midnight teacher aesthetic) ── */
.xcd-hero{
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  padding: 22px 26px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  align-items: center;
  gap: 20px;
  background: linear-gradient(118deg, #dff5ff 0%, #eef2ff 48%, #fff1d6 100%);
  border: 1px solid rgba(35, 137, 255, 0.22);
  box-shadow: 0 16px 36px rgba(35, 44, 87, 0.10);
  animation: sdCardIn .45s both;
}
.xcd-hero::before{
  content: "";
  position: absolute;
  inset: -60px auto auto -60px;
  width: 220px; height: 220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  animation: sdBreathe 5.5s ease-in-out infinite;
  pointer-events: none;
}
.xcd-hero::after{
  content: "";
  position: absolute;
  top: -50px; bottom: -50px;
  width: 80px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  animation: sdShine 7.5s ease-in-out infinite;
  pointer-events: none;
}
[data-theme="dark"] .xcd-hero,
.dark .xcd-hero{
  background: linear-gradient(118deg, #0e1e38 0%, #17224d 50%, #2e2316 100%);
  border-color: rgba(56, 189, 248, 0.28);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55);
}
[data-theme="dark"] .xcd-hero::before,
.dark .xcd-hero::before{
  background: rgba(56, 189, 248, 0.08);
}

.xcd-hero-content{
  position: relative;
  z-index: 2;
  max-width: 660px;
}
.xcd-chip{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 800;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.14);
  color: #10734c;
  border: 1px solid rgba(16, 185, 129, 0.25);
  backdrop-filter: blur(8px);
}
[data-theme="dark"] .xcd-chip,
.dark .xcd-chip{
  background: rgba(16, 185, 129, 0.22);
  color: #6ee7b7;
  border-color: rgba(110, 231, 183, 0.32);
}
.xcd-hero-title{
  font-size: clamp(22px, 2.5vw, 29px);
  line-height: 1.18;
  font-weight: 900;
  letter-spacing: -0.02em;
  margin: 10px 0 8px;
  color: var(--sd-ink);
}
.xcd-hero-sub{
  font-size: 12.5px;
  line-height: 1.5;
  font-weight: 600;
  color: var(--sd-muted);
  max-width: 580px;
}
.xcd-hero-actions{
  display: flex;
  gap: 10px;
  margin-top: 16px;
  align-items: center;
  flex-wrap: wrap;
}

/* ── Hero Buttons (NO purple AI gradients!) ── */
.xcd-btn-emerald{
  border: 0;
  border-radius: 14px;
  padding: 10px 18px;
  min-height: 40px;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #ffffff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(16, 185, 129, 0.32);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: transform .18s ease, box-shadow .18s ease;
}
.xcd-btn-emerald:hover{
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 12px 28px rgba(16, 185, 129, 0.44);
}
.xcd-btn-glass{
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 14px;
  padding: 9px 16px;
  min-height: 40px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  color: var(--sd-ink);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  box-shadow: 0 4px 14px rgba(35, 44, 87, 0.06);
  transition: transform .18s ease, background .18s ease, border-color .18s ease;
}
.xcd-btn-glass:hover{
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.98);
  border-color: rgba(35, 137, 255, 0.35);
}
[data-theme="dark"] .xcd-btn-glass,
.dark .xcd-btn-glass{
  background: rgba(255, 255, 255, 0.10);
  border-color: rgba(255, 255, 255, 0.18);
  color: #f6f7ff;
}
[data-theme="dark"] .xcd-btn-glass:hover,
.dark .xcd-btn-glass:hover{
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(56, 189, 248, 0.4);
}

.xcd-theme-btn{
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  color: var(--sd-ink);
  font-size: 16px;
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 12px rgba(35, 44, 87, 0.08);
  transition: transform .18s ease, background .18s ease;
}
.xcd-theme-btn:hover{
  transform: translateY(-2px) rotate(15deg);
}
[data-theme="dark"] .xcd-theme-btn,
.dark .xcd-theme-btn{
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.20);
  color: #f6f7ff;
}

/* ── Hero Mascot Panel (Robot 3D Art & Live Status) ── */
.xcd-hero-panel{
  position: relative;
  z-index: 2;
  border-radius: 20px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.8), 0 18px 36px rgba(38,57,116,.14);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
[data-theme="dark"] .xcd-hero-panel,
.dark .xcd-hero-panel{
  background: rgba(15, 23, 42, 0.42);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 20px 40px rgba(0,0,0,.45);
}
.xcd-hero-panel::before{
  content: "";
  position: absolute;
  right: -24px; top: -24px;
  width: 110px; height: 110px;
  border-radius: 50%;
  background: rgba(35, 137, 255, 0.2);
  animation: sdBreathe 4.8s ease-in-out infinite;
}
.xcd-hero-panel::after{
  content: "";
  position: absolute;
  left: -28px; bottom: -32px;
  width: 120px; height: 120px;
  border-radius: 50%;
  background: rgba(255, 178, 29, 0.22);
  animation: sdDrift 7.5s ease-in-out infinite;
}
.xcd-robo-art-wrap{
  position: relative;
  z-index: 2;
  width: 120px;
  height: 120px;
  display: grid;
  place-items: center;
}
.xcd-robo-art{
  width: 115px;
  height: 115px;
  object-fit: contain;
  filter: drop-shadow(0 14px 18px rgba(38, 57, 116, 0.24));
  animation: sdPop3d 4.2s ease-in-out infinite;
}
.xcd-hero-mini-status{
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  margin-top: 8px;
}
.xcd-mini-status-chip{
  border-radius: 10px;
  padding: 5px 9px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(15, 23, 42, 0.08);
  font-size: 10.5px;
  font-weight: 800;
  color: var(--sd-ink);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
[data-theme="dark"] .xcd-mini-status-chip,
.dark .xcd-mini-status-chip{
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  color: #f6f7ff;
}

/* ── Colorful Stat Cards (Teacher Dashboard Style) ── */
.xcd-stats{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.xcd-stat-card{
  border-radius: 18px;
  padding: 16px 18px;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--stat-border, var(--sd-line));
  background: var(--stat-bg, var(--sd-card));
  box-shadow: var(--sd-shadow-soft);
  animation: sdCardIn .45s both;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  cursor: default;
}
.xcd-stat-card:hover{
  transform: translateY(-4px) scale(1.015);
  box-shadow: var(--sd-shadow);
}
.xcd-stat-card::after{
  content: "";
  position: absolute;
  right: -24px; bottom: -28px;
  width: 90px; height: 90px;
  border-radius: 50%;
  background: var(--stat-glow, rgba(35,137,255,.12));
  pointer-events: none;
}
.xcd-stat-head{
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  position: relative;
  z-index: 1;
}
.xcd-stat-icon{
  width: 40px; height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 20px;
  background: var(--stat-ico-bg, rgba(255,255,255,.9));
  box-shadow: 0 6px 14px rgba(35,44,87,.08);
  animation: sdPop3d 4.4s ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}
.xcd-stat-card:hover .xcd-stat-icon{
  animation: sdWiggle .65s ease both;
}
.xcd-stat-badge{
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--stat-badge-bg, rgba(255,255,255,.8));
  color: var(--stat-badge-color, var(--sd-ink));
}
.xcd-stat-val{
  font-size: 28px;
  font-weight: 900;
  line-height: 1.1;
  color: var(--sd-ink);
  letter-spacing: -0.02em;
  position: relative;
  z-index: 1;
}
.xcd-stat-label{
  font-size: 12px;
  font-weight: 800;
  color: var(--sd-muted);
  margin-top: 4px;
  position: relative;
  z-index: 1;
}

/* ── Specific card themes ── */
.stat-azure{
  --stat-bg: linear-gradient(145deg, #f0f9ff, #e0f2fe);
  --stat-border: rgba(2, 132, 199, 0.22);
  --stat-glow: rgba(2, 132, 199, 0.16);
  --stat-ico-bg: #bae6fd;
  --stat-badge-bg: rgba(2, 132, 199, 0.14);
  --stat-badge-color: #0284c7;
}
[data-theme="dark"] .stat-azure,
.dark .stat-azure{
  --stat-bg: linear-gradient(145deg, rgba(14, 46, 80, 0.72), rgba(12, 30, 55, 0.9));
  --stat-border: rgba(56, 189, 248, 0.28);
  --stat-glow: rgba(56, 189, 248, 0.22);
  --stat-ico-bg: rgba(56, 189, 248, 0.22);
  --stat-badge-bg: rgba(56, 189, 248, 0.2);
  --stat-badge-color: #7dd3fc;
}

.stat-amber{
  --stat-bg: linear-gradient(145deg, #fffbeb, #fef3c7);
  --stat-border: rgba(245, 158, 11, 0.22);
  --stat-glow: rgba(245, 158, 11, 0.18);
  --stat-ico-bg: #fde68a;
  --stat-badge-bg: rgba(245, 158, 11, 0.16);
  --stat-badge-color: #b45309;
}
[data-theme="dark"] .stat-amber,
.dark .stat-amber{
  --stat-bg: linear-gradient(145deg, rgba(80, 50, 15, 0.72), rgba(50, 30, 10, 0.9));
  --stat-border: rgba(251, 191, 36, 0.28);
  --stat-glow: rgba(251, 191, 36, 0.22);
  --stat-ico-bg: rgba(251, 191, 36, 0.22);
  --stat-badge-bg: rgba(251, 191, 36, 0.2);
  --stat-badge-color: #fde68a;
}

.stat-emerald{
  --stat-bg: linear-gradient(145deg, #f0fdf4, #dcfce7);
  --stat-border: rgba(34, 197, 94, 0.22);
  --stat-glow: rgba(34, 197, 94, 0.18);
  --stat-ico-bg: #bbf7d0;
  --stat-badge-bg: rgba(34, 197, 94, 0.16);
  --stat-badge-color: #15803d;
}
[data-theme="dark"] .stat-emerald,
.dark .stat-emerald{
  --stat-bg: linear-gradient(145deg, rgba(15, 65, 35, 0.72), rgba(10, 45, 25, 0.9));
  --stat-border: rgba(74, 222, 128, 0.28);
  --stat-glow: rgba(74, 222, 128, 0.22);
  --stat-ico-bg: rgba(74, 222, 128, 0.22);
  --stat-badge-bg: rgba(74, 222, 128, 0.2);
  --stat-badge-color: #86efac;
}

.stat-rose{
  --stat-bg: linear-gradient(145deg, #fff1f2, #ffe4e6);
  --stat-border: rgba(244, 63, 94, 0.22);
  --stat-glow: rgba(244, 63, 94, 0.18);
  --stat-ico-bg: #fecdd3;
  --stat-badge-bg: rgba(244, 63, 94, 0.16);
  --stat-badge-color: #be123c;
}
[data-theme="dark"] .stat-rose,
.dark .stat-rose{
  --stat-bg: linear-gradient(145deg, rgba(75, 20, 35, 0.72), rgba(50, 12, 25, 0.9));
  --stat-border: rgba(251, 113, 133, 0.28);
  --stat-glow: rgba(251, 113, 133, 0.22);
  --stat-ico-bg: rgba(251, 113, 133, 0.22);
  --stat-badge-bg: rgba(251, 113, 133, 0.2);
  --stat-badge-color: #fda4af;
}

/* ── Tabs (Teacher Style Pills) ── */
.xcd-tabs{
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px;
  scrollbar-width: none;
}
.xcd-tabs::-webkit-scrollbar{ display: none; }
.xcd-tab{
  padding: 10px 18px;
  border-radius: 14px;
  border: 1px solid var(--sd-line);
  background: var(--sd-card);
  backdrop-filter: blur(12px);
  color: var(--sd-muted);
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--sd-shadow-soft);
  transition: all .18s ease;
}
.xcd-tab:hover:not(.active){
  transform: translateY(-2px);
  color: var(--sd-ink);
  background: var(--sd-card-soft);
  border-color: rgba(35, 137, 255, 0.25);
}
.xcd-tab.active{
  background: linear-gradient(135deg, #0284c7, #0ea5e9);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 8px 22px rgba(14, 165, 233, 0.35);
  transform: translateY(-2px);
}
.xcd-tab-badge{
  background: rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 800;
}
.xcd-tab.active .xcd-tab-badge{
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
}

/* ── Main Panel Shell ── */
.xcd-panel{
  background: var(--sd-card);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  border: 1px solid var(--sd-line);
  box-shadow: var(--sd-shadow-soft);
  overflow: hidden;
  animation: sdCardIn .45s both;
  transition: box-shadow .2s ease, border-color .2s ease;
}
.xcd-panel:hover{
  box-shadow: var(--sd-shadow);
}
.xcd-panel-head{
  padding: 18px 22px;
  border-bottom: 1px solid var(--sd-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  background: var(--sd-card-soft);
}
.xcd-panel-title{
  font-size: 16px;
  font-weight: 900;
  color: var(--sd-ink);
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
}
.xcd-panel-sub{
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 3px;
}
.xcd-panel-body{
  padding: 20px 22px;
}

/* ── Search & Filter Controls ── */
.xcd-select-inline, .xcd-search-input{
  padding: 9px 13px;
  border-radius: 12px;
  border: 1px solid var(--sd-line);
  background: var(--sd-input-bg);
  color: var(--sd-ink);
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  outline: none;
  box-shadow: 0 2px 8px rgba(35,44,87,.04);
  transition: border-color .18s, box-shadow .18s;
}
.xcd-select-inline:focus, .xcd-search-input:focus{
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

/* ── Table & List Views ── */
.xcd-table-wrap{
  overflow-x: auto;
  border-radius: 14px;
  border: 1px solid var(--sd-line);
}
.xcd-table{
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 680px;
}
.xcd-table th{
  text-align: left;
  padding: 12px 14px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--sd-muted);
  border-bottom: 1px solid var(--sd-line);
  background: var(--sd-card-soft);
  white-space: nowrap;
}
.xcd-table td{
  padding: 13px 14px;
  border-bottom: 1px solid var(--sd-line);
  color: var(--sd-ink);
  vertical-align: middle;
  background: var(--sd-card);
  transition: background .15s ease;
}
.xcd-table tr:last-child td{ border-bottom: none; }
.xcd-table tr:hover td{
  background: var(--sd-card-soft);
}

.xcd-avatar{
  width: 36px; height: 36px;
  border-radius: 12px;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 900;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(35, 44, 87, 0.15);
}
.xcd-name-cell{
  display: flex;
  align-items: center;
  gap: 12px;
}
.xcd-sub{
  font-size: 11px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 1px;
}

/* ── Badges ── */
.xcd-badge{
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.xcd-badge.pending{
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.28);
}
.xcd-badge.evaluating{
  background: rgba(14, 165, 233, 0.15);
  color: #0284c7;
  border: 1px solid rgba(14, 165, 233, 0.3);
  animation: sdPulseSoft 2s infinite;
}
.xcd-badge.corrected{
  background: rgba(99, 102, 241, 0.15);
  color: #4f46e5;
  border: 1px solid rgba(99, 102, 241, 0.28);
}
.xcd-badge.finalized{
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.28);
}
[data-theme="dark"] .xcd-badge.pending,
.dark .xcd-badge.pending{
  background: rgba(245, 158, 11, 0.22);
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.32);
}
[data-theme="dark"] .xcd-badge.evaluating,
.dark .xcd-badge.evaluating{
  background: rgba(14, 165, 233, 0.24);
  color: #7dd3fc;
  border-color: rgba(56, 189, 248, 0.35);
}
[data-theme="dark"] .xcd-badge.corrected,
.dark .xcd-badge.corrected{
  background: rgba(99, 102, 241, 0.22);
  color: #a5b4fc;
  border-color: rgba(129, 140, 248, 0.32);
}
[data-theme="dark"] .xcd-badge.finalized,
.dark .xcd-badge.finalized{
  background: rgba(16, 185, 129, 0.22);
  color: #86efac;
  border-color: rgba(74, 222, 128, 0.32);
}

/* ── Action Buttons ── */
.xcd-icon-btn{
  width: 34px; height: 34px;
  border-radius: 10px;
  border: 1px solid var(--sd-line);
  background: var(--sd-card);
  color: var(--sd-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(35,44,87,.04);
  transition: transform .15s ease, background .15s ease, color .15s ease, border-color .15s ease;
}
.xcd-icon-btn:hover{
  transform: translateY(-2px);
  background: var(--sd-card-soft);
  color: var(--sd-ink);
  border-color: rgba(35, 137, 255, 0.3);
}
.xcd-icon-btn.ai-btn{
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  border: 0;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.32);
}
.xcd-icon-btn.ai-btn:hover{
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.45);
}

.xcd-btn{
  padding: 9px 16px;
  border-radius: 12px;
  border: 0;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: transform .18s ease, box-shadow .18s ease;
}
.xcd-btn.primary{
  background: linear-gradient(135deg, #0284c7, #0ea5e9);
  color: #ffffff;
  box-shadow: 0 6px 18px rgba(14, 165, 233, 0.3);
}
.xcd-btn.primary:hover{
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(14, 165, 233, 0.42);
}
.xcd-btn.emerald{
  background: linear-gradient(135deg, #059669, #10b981);
  color: #ffffff;
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.3);
}
.xcd-btn.emerald:hover{
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(16, 185, 129, 0.42);
}
.xcd-btn.secondary{
  background: var(--sd-card-soft);
  color: var(--sd-ink);
  border: 1px solid var(--sd-line);
}
.xcd-btn.secondary:hover{
  transform: translateY(-2px);
  border-color: rgba(35, 137, 255, 0.35);
}
.xcd-btn:disabled{
  opacity: .55;
  cursor: not-allowed;
  transform: none !important;
}

/* ── Workspace & Paper Preview ── */
.xcd-workspace{
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: 18px;
  align-items: start;
}
.xcd-score-strip{
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 18px;
  padding: 16px 20px;
  margin-bottom: 16px;
  gap: 14px;
  flex-wrap: wrap;
  background: linear-gradient(118deg, #ecfdf5 0%, #eff6ff 48%, #fffbeb 100%);
  border: 1px solid rgba(16, 185, 129, 0.25);
  box-shadow: var(--sd-shadow-soft);
}
[data-theme="dark"] .xcd-score-strip,
.dark .xcd-score-strip{
  background: linear-gradient(118deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 165, 233, 0.12) 48%, rgba(245, 158, 11, 0.12) 100%);
  border-color: rgba(255, 255, 255, 0.14);
}
.xcd-score-big{
  font-size: 28px;
  font-weight: 900;
  color: var(--sd-ink);
  line-height: 1;
}
.xcd-grade-pill{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px; height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ffb21d, #ff791f);
  color: #fff;
  font-size: 19px;
  font-weight: 900;
  box-shadow: 0 8px 18px rgba(255, 121, 31, 0.32);
  animation: sdPop3d 4s ease-in-out infinite;
}

.xcd-viewer{
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 16px;
  min-height: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 26px;
  text-align: center;
  position: sticky;
  top: 18px;
}
.xcd-viewer img{
  max-width: 100%;
  max-height: 520px;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(35, 44, 87, 0.14);
}

/* ── Question Card (Rich Colorful Accents) ── */
.xcd-qcard{
  border: 1px solid var(--sd-line);
  border-radius: 16px;
  padding: 16px 18px;
  margin-bottom: 14px;
  background: var(--sd-card);
  box-shadow: 0 4px 14px rgba(35, 44, 87, 0.04);
  transition: transform .18s, box-shadow .18s, border-color .18s;
  position: relative;
}
.xcd-qcard:hover{
  transform: translateY(-2px);
  box-shadow: var(--sd-shadow-soft);
}
.xcd-qcard.correct{
  border-left: 5px solid #10b981;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.04) 0%, var(--sd-card) 20%);
}
.xcd-qcard.partial{
  border-left: 5px solid #f59e0b;
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.04) 0%, var(--sd-card) 20%);
}
.xcd-qcard.incorrect{
  border-left: 5px solid #ef4444;
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.04) 0%, var(--sd-card) 20%);
}
.xcd-qcard-head{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.xcd-qtitle{
  font-size: 13.5px;
  font-weight: 800;
  color: var(--sd-ink);
  line-height: 1.35;
}
.xcd-qtopic{
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: var(--sd-muted);
  background: var(--sd-card-soft);
  padding: 2px 8px;
  border-radius: 6px;
  margin-top: 4px;
}
.xcd-status-chip{
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.xcd-status-chip.correct{
  background: rgba(16, 185, 129, 0.16);
  color: #059669;
}
.xcd-status-chip.partial{
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}
.xcd-status-chip.incorrect{
  background: rgba(239, 68, 68, 0.16);
  color: #dc2626;
}
[data-theme="dark"] .xcd-status-chip.correct,
.dark .xcd-status-chip.correct{
  background: rgba(16, 185, 129, 0.24);
  color: #86efac;
}
[data-theme="dark"] .xcd-status-chip.partial,
.dark .xcd-status-chip.partial{
  background: rgba(245, 158, 11, 0.24);
  color: #fde68a;
}
[data-theme="dark"] .xcd-status-chip.incorrect,
.dark .xcd-status-chip.incorrect{
  background: rgba(239, 68, 68, 0.24);
  color: #fca5a5;
}

.xcd-qfeedback{
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--sd-ink);
  background: var(--sd-card-soft);
  border-radius: 10px;
  padding: 10px 12px;
  margin: 10px 0 12px;
  border: 1px dashed var(--sd-line);
}
.xcd-qcontrols{
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.xcd-marks-input{
  width: 68px;
  padding: 7px 8px;
  border-radius: 10px;
  border: 1px solid var(--sd-line);
  background: var(--sd-input-bg);
  color: var(--sd-ink);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 800;
  text-align: center;
  outline: none;
}
.xcd-marks-input:focus{
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}
.xcd-teacher-note{
  width: 100%;
  margin-top: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--sd-line);
  background: var(--sd-input-bg);
  color: var(--sd-ink);
  font-family: inherit;
  font-size: 12.5px;
  resize: vertical;
  min-height: 40px;
  outline: none;
}
.xcd-teacher-note:focus{
  border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.14);
}

/* ── Analytics Grid ── */
.xcd-analytics-grid{
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 18px;
}
.xcd-chart-box{
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 16px;
  padding: 18px;
}
.xcd-list{
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.xcd-list li{
  font-size: 12.5px;
  font-weight: 700;
  color: var(--sd-ink);
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  display: flex;
  align-items: flex-start;
  gap: 9px;
  line-height: 1.45;
}

/* ── Tip Card with Robo (from Teacher Dashboard) ── */
.xcd-tip-card{
  background: linear-gradient(135deg, #fff7df, #e8f5ff);
  border: 1px solid rgba(255, 178, 29, 0.25);
  border-radius: 18px;
  position: relative;
  overflow: hidden;
  min-height: 140px;
  padding: 18px 120px 18px 20px;
  box-shadow: var(--sd-shadow-soft);
}
[data-theme="dark"] .xcd-tip-card,
.dark .xcd-tip-card{
  background: linear-gradient(135deg, rgba(58, 45, 22, 0.82), rgba(22, 35, 63, 0.92));
  border-color: rgba(251, 191, 36, 0.3);
}
.xcd-tip-card h4{
  font-size: 14px;
  font-weight: 900;
  color: var(--sd-ink);
  margin: 0 0 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.xcd-tip-card p{
  font-size: 12px;
  line-height: 1.55;
  font-weight: 600;
  color: var(--sd-ink);
  margin: 0;
}
.xcd-tip-art{
  position: absolute;
  right: 14px;
  bottom: 8px;
  width: 95px;
  height: 95px;
  display: grid;
  place-items: center;
}
.xcd-tip-art img{
  width: 90px;
  height: 90px;
  object-fit: contain;
  filter: drop-shadow(0 10px 14px rgba(35, 44, 87, 0.2));
  animation: sdPop3d 4.4s ease-in-out infinite;
}

/* ── Modals ── */
.xcd-modal-backdrop{
  position: fixed;
  inset: 0;
  background: rgba(7, 18, 53, 0.65);
  backdrop-filter: blur(6px);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.xcd-modal{
  background: var(--sd-card);
  border-radius: 22px;
  border: 1px solid var(--sd-line);
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.38);
}
.xcd-modal-head{
  padding: 18px 22px;
  border-bottom: 1px solid var(--sd-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--sd-card-soft);
  position: sticky;
  top: 0;
  z-index: 2;
}
.xcd-modal-title{
  font-size: 16px;
  font-weight: 900;
  color: var(--sd-ink);
}
.xcd-modal-body{
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.xcd-modal-foot{
  padding: 16px 22px;
  border-top: 1px solid var(--sd-line);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: var(--sd-card-soft);
  position: sticky;
  bottom: 0;
  z-index: 2;
}
.xcd-form-grid{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.xcd-field{
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.xcd-field label{
  font-size: 11.5px;
  font-weight: 800;
  color: var(--sd-muted);
}
.xcd-field input, .xcd-field select, .xcd-field textarea{
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--sd-line);
  background: var(--sd-input-bg);
  color: var(--sd-ink);
  outline: none;
}
.xcd-field input:focus, .xcd-field select:focus, .xcd-field textarea:focus{
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.xcd-upload-area{
  border: 2px dashed rgba(35, 137, 255, 0.35);
  border-radius: 16px;
  padding: 32px 18px;
  text-align: center;
  cursor: pointer;
  background: var(--sd-card-soft);
  transition: all .2s ease;
}
.xcd-upload-area:hover{
  border-color: #059669;
  background: rgba(16, 185, 129, 0.06);
}

/* ── Progress & Empty States ── */
.xcd-progress-wrap{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 44px 20px;
  color: var(--sd-ink);
  text-align: center;
}
.xcd-spinner{
  width: 44px; height: 44px;
  border-radius: 50%;
  border: 3px solid var(--sd-line);
  border-top-color: #059669;
  animation: xcd-spin 0.8s linear infinite;
}
@keyframes xcd-spin{ to{ transform: rotate(360deg); } }

.xcd-empty{
  text-align: center;
  padding: 48px 20px;
  color: var(--sd-muted);
}
.xcd-empty-icon{
  font-size: 44px;
  margin-bottom: 12px;
  animation: sdPop3d 4.4s ease-in-out infinite;
}

/* ── Responsive Queries ── */
@media (max-width: 1180px){
  .xcd-stats{ grid-template-columns: repeat(2, 1fr); }
  .xcd-hero{ grid-template-columns: 1fr; }
  .xcd-hero-panel{ display: none; }
}
@media (max-width: 1024px){
  .xcd-workspace{ grid-template-columns: 1fr; }
  .xcd-viewer{ position: static; min-height: 280px; }
  .xcd-analytics-grid{ grid-template-columns: 1fr; }
}
@media (max-width: 768px){
  .xcd-root{ padding: 14px 12px 76px; }
  .xcd-hero{ padding: 18px 20px; }
  .xcd-hero-title{ font-size: 21px; }
  .xcd-hero-actions{ width: 100%; }
  .xcd-btn-emerald, .xcd-btn-glass{ flex: 1; justify-content: center; }
  .xcd-stats{ grid-template-columns: 1fr 1fr; gap: 10px; }
  .xcd-stat-card{ padding: 13px 14px; }
  .xcd-stat-val{ font-size: 24px; }
  .xcd-form-grid{ grid-template-columns: 1fr; }
  .xcd-panel-head{ flex-direction: column; align-items: flex-start; }
  .xcd-qcontrols{ flex-direction: column; align-items: flex-start; }
  .xcd-tip-card{ padding-right: 20px; }
  .xcd-tip-art{ display: none; }
}
@media (max-width: 480px){
  .xcd-stats{ grid-template-columns: 1fr; }
}
`;

// ══════════════════════════════════════════════════════════════════════════
// STATUS BADGES & HELPERS
// ══════════════════════════════════════════════════════════════════════════
const STATUS_LABEL: Record<PaperStatus, string> = {
  pending: "Pending Review",
  evaluating: "AI Evaluating…",
  corrected: "Graded & Reviewed",
  finalized: "Marks Finalized",
};

const STATUS_ICON: Record<PaperStatus, string> = {
  pending: "⏳",
  evaluating: "🤖",
  corrected: "✏️",
  finalized: "✅",
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

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function ExamCorrectionDashboard() {
  const { theme, toggleTheme } = useAppTheme();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Sync theme with document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Initial load
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
    setTimeout(() => setToast(null), 2800);
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.studentName.toLowerCase().includes(q);
        const matchRoll = p.rollNumber.toLowerCase().includes(q);
        const matchExam = p.examName.toLowerCase().includes(q);
        const matchSubject = p.subject.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchExam && !matchSubject) return false;
      }
      return true;
    });
  }, [papers, classFilter, statusFilter, searchQuery]);

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
    showToast("Exam paper uploaded successfully");
  };

  const handleRunAI = async (paperId: string) => {
    setEvaluatingId(paperId);
    setPapers((prev) => prev.map((p) => (p.id === paperId ? { ...p, status: "evaluating" } : p)));
    try {
      const updated = await examCorrectionAPI.runAIEvaluation(paperId);
      setPapers((prev) => prev.map((p) => (p.id === paperId ? updated : p)));
      showToast("✨ AI evaluation completed successfully");
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
    showToast("✅ Marks locked and result finalized!");
  };

  const handleDelete = async (paperId: string) => {
    await examCorrectionAPI.deletePaper(paperId);
    setPapers((prev) => prev.filter((p) => p.id !== paperId));
    if (selectedPaperId === paperId) setSelectedPaperId(null);
    showToast("Paper removed from dashboard");
  };

  const handleCreateAnswerKey = async (key: AnswerKey) => {
    await examCorrectionAPI.createAnswerKey(key);
    setAnswerKeys((prev) => [...prev, key]);
    setShowAKModal(false);
    showToast("Marking scheme / answer key saved");
  };

  const handleExport = (paper: ExamPaper) => {
    downloadTextFile(`${paper.studentName.replace(/\s+/g, "_")}_${paper.examName.replace(/\s+/g, "_")}_report.txt`, buildReportText(paper));
    showToast("📄 Evaluation report downloaded");
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="xcd-root" data-theme={theme}>
        <div className="xcd-shell">

          {/* ── Sunny / Midnight Teacher Hero Banner with Robo ── */}
          <div className="xcd-hero">
            <div className="xcd-hero-content">
              <span className="xcd-chip">
                <span>✨</span> Teacher Grading &amp; Assessment Hub
              </span>
              <h1 className="xcd-hero-title">Exam Correction Dashboard</h1>
              <p className="xcd-hero-sub">
                Upload student answer sheets, run automated evaluations, adjust marks &amp; notes,
                and generate comprehensive student performance reports with ease.
              </p>
              <div className="xcd-hero-actions">
                <button className="xcd-btn-emerald" onClick={() => setShowUploadModal(true)}>
                  <span>📤</span> Upload Exam Paper
                </button>
                <button className="xcd-btn-glass" onClick={() => setShowAKModal(true)}>
                  <span>🔑</span> Answer Keys &amp; Criteria
                </button>
                <button
                  className="xcd-theme-btn"
                  title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                  onClick={toggleTheme}
                >
                  {theme === "light" ? "🌙" : "☀️"}
                </button>
              </div>
            </div>

            {/* 3D Robot Mascot Panel */}
            <div className="xcd-hero-panel">
              <div className="xcd-robo-art-wrap">
                <img src={roboMagnifier} alt="Grading Robot" className="xcd-robo-art" />
              </div>
              <div className="xcd-hero-mini-status">
                <div className="xcd-mini-status-chip">
                  <span>⚡ Auto-Grading</span>
                  <span style={{ color: "#10b981" }}>Active</span>
                </div>
                <div className="xcd-mini-status-chip">
                  <span>🎯 Accuracy</span>
                  <span style={{ color: "#0284c7" }}>99.2%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4 Colorful Stat Cards (Teacher Dashboard Visual Format) ── */}
          <div className="xcd-stats">
            <div className="xcd-stat-card stat-azure">
              <div className="xcd-stat-head">
                <div className="xcd-stat-icon" style={{ ["--delay" as any]: "0s" }}>📑</div>
                <span className="xcd-stat-badge">Total</span>
              </div>
              <div className="xcd-stat-val">
                <AnimNum target={stats.total} />
              </div>
              <div className="xcd-stat-label">Total Exam Papers</div>
            </div>

            <div className="xcd-stat-card stat-amber">
              <div className="xcd-stat-head">
                <div className="xcd-stat-icon" style={{ ["--delay" as any]: "0.3s" }}>⏳</div>
                <span className="xcd-stat-badge">Review</span>
              </div>
              <div className="xcd-stat-val">
                <AnimNum target={stats.pendingCount} />
              </div>
              <div className="xcd-stat-label">Pending Correction</div>
            </div>

            <div className="xcd-stat-card stat-emerald">
              <div className="xcd-stat-head">
                <div className="xcd-stat-icon" style={{ ["--delay" as any]: "0.6s" }}>🎯</div>
                <span className="xcd-stat-badge">Scored</span>
              </div>
              <div className="xcd-stat-val">
                <AnimNum target={stats.finalizedCount} />
              </div>
              <div className="xcd-stat-label">Finalized Papers</div>
            </div>

            <div className="xcd-stat-card stat-rose">
              <div className="xcd-stat-head">
                <div className="xcd-stat-icon" style={{ ["--delay" as any]: "0.9s" }}>🏆</div>
                <span className="xcd-stat-badge">Average</span>
              </div>
              <div className="xcd-stat-val">
                <AnimNum target={stats.avg} suffix="%" />
              </div>
              <div className="xcd-stat-label">Class Average Score</div>
            </div>
          </div>

          {/* ── Tabs (Teacher Style Nav Pills) ── */}
          <div className="xcd-tabs">
            {([
              { id: "papers", label: "Papers List", icon: "📑", count: papers.length },
              { id: "workspace", label: "Correction Workspace", icon: "✍️", count: null },
              { id: "analytics", label: "Class Analytics", icon: "📊", count: null },
              { id: "answerKeys", label: "Answer Keys", icon: "🔑", count: answerKeys.length },
            ] as { id: TabId; label: string; icon: string; count: number | null }[]).map((t) => (
              <button
                key={t.id}
                className={`xcd-tab ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span>{t.icon}</span>
                {t.label}
                {t.count !== null && <span className="xcd-tab-badge">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* ── Tab Content Panels ── */}
          <div>
            {loading ? (
              <div className="xcd-panel">
                <div className="xcd-progress-wrap">
                  <div className="xcd-spinner" />
                  <div style={{ fontWeight: 800 }}>Loading exam papers &amp; grading criteria…</div>
                </div>
              </div>
            ) : (
              <>
                {activeTab === "papers" && (
                  <PapersTab
                    papers={filteredPapers}
                    classes={classes}
                    classFilter={classFilter}
                    statusFilter={statusFilter}
                    searchQuery={searchQuery}
                    onClassFilter={setClassFilter}
                    onStatusFilter={setStatusFilter}
                    onSearchQuery={setSearchQuery}
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
        </div>

        {/* ── Modals ── */}
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

        {/* ── Toast Notification ── */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              style={{
                position: "fixed",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                background: "linear-gradient(135deg, #059669, #0284c7)",
                color: "#ffffff",
                padding: "12px 22px",
                borderRadius: 16,
                fontSize: 13,
                fontWeight: 800,
                boxShadow: "0 14px 34px rgba(2, 132, 199, 0.35)",
                zIndex: 2200,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🔔</span> {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: Papers List
// ══════════════════════════════════════════════════════════════════════════
function PapersTab({
  papers, classes, classFilter, statusFilter, searchQuery,
  onClassFilter, onStatusFilter, onSearchQuery,
  onOpen, onUploadClick, onDelete, onRunAI, evaluatingId,
}: {
  papers: ExamPaper[]; classes: string[]; classFilter: string; statusFilter: string; searchQuery: string;
  onClassFilter: (v: string) => void; onStatusFilter: (v: string) => void; onSearchQuery: (v: string) => void;
  onOpen: (id: string) => void; onUploadClick: () => void; onDelete: (id: string) => void;
  onRunAI: (id: string) => void; evaluatingId: string | null;
}) {
  return (
    <div className="xcd-panel">
      <div className="xcd-panel-head">
        <div>
          <div className="xcd-panel-title">
            <span>📚</span> Student Exam Papers
          </div>
          <div className="xcd-panel-sub">Manage uploaded answer sheets, evaluate with AI, and track scoring progress.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            className="xcd-search-input"
            placeholder="Search student or exam…"
            value={searchQuery}
            onChange={(e) => onSearchQuery(e.target.value)}
            style={{ minWidth: 180 }}
          />
          <select className="xcd-select-inline" value={classFilter} onChange={(e) => onClassFilter(e.target.value)}>
            <option value="all">All Classes</option>
            {classes.map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <select className="xcd-select-inline" value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="evaluating">Evaluating</option>
            <option value="corrected">Corrected</option>
            <option value="finalized">Finalized</option>
          </select>
          <button className="xcd-btn emerald" onClick={onUploadClick}>
            <span>📤</span> Upload Paper
          </button>
        </div>
      </div>

      <div className="xcd-panel-body">
        {papers.length === 0 ? (
          <div className="xcd-empty">
            <div className="xcd-empty-icon">📂</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--sd-ink)", marginBottom: 4 }}>
              No exam papers found
            </div>
            <div style={{ fontSize: 12.5, color: "var(--sd-muted)", marginBottom: 14 }}>
              Try adjusting your filter or upload a new student exam sheet.
            </div>
            <button className="xcd-btn emerald" onClick={onUploadClick}>
              <span>📤</span> Upload Exam Paper
            </button>
          </div>
        ) : (
          <div className="xcd-table-wrap">
            <table className="xcd-table">
              <thead>
                <tr>
                  <th>Student Details</th>
                  <th>Exam &amp; Subject</th>
                  <th>Class</th>
                  <th>Upload Date</th>
                  <th>Score / Percentage</th>
                  <th>Correction Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((p) => {
                  const avatarBg = getStudentColor(p.studentName);
                  const isEvaluating = evaluatingId === p.id || p.status === "evaluating";
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="xcd-name-cell">
                          <div className="xcd-avatar" style={{ background: avatarBg }}>
                            {initials(p.studentName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--sd-ink)" }}>{p.studentName}</div>
                            <div className="xcd-sub">Roll No: {p.rollNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800 }}>{p.examName}</div>
                        <div className="xcd-sub">{p.subject}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "var(--sd-card-soft)", border: "1px solid var(--sd-line)" }}>
                          {p.class}
                        </span>
                      </td>
                      <td style={{ color: "var(--sd-muted)", fontWeight: 600 }}>{formatDate(p.date)}</td>
                      <td>
                        {p.analytics ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{
                              fontWeight: 900,
                              color: p.analytics.percentage >= 75 ? "#059669" : p.analytics.percentage >= 50 ? "#d97706" : "#dc2626",
                            }}>
                              {p.analytics.obtainedMarks}/{p.analytics.totalMarks}
                            </span>
                            <span style={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: "2px 6px",
                              borderRadius: 6,
                              background: p.analytics.percentage >= 75 ? "rgba(16,185,129,.14)" : p.analytics.percentage >= 50 ? "rgba(245,158,11,.14)" : "rgba(239,68,68,.14)",
                              color: p.analytics.percentage >= 75 ? "#059669" : p.analytics.percentage >= 50 ? "#b45309" : "#dc2626",
                            }}>
                              {p.analytics.grade} ({p.analytics.percentage}%)
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--sd-faint)", fontWeight: 700 }}>Not Evaluated</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {p.status === "pending" && (
                            <button
                              className="xcd-icon-btn ai-btn"
                              title="Run automated AI evaluation"
                              disabled={isEvaluating}
                              onClick={() => onRunAI(p.id)}
                            >
                              {isEvaluating ? "…" : "🤖"}
                            </button>
                          )}
                          <button className="xcd-icon-btn" title="Open in Workspace" onClick={() => onOpen(p.id)}>
                            ✍️
                          </button>
                          <button className="xcd-icon-btn" title="Delete Paper" onClick={() => onDelete(p.id)}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
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
            <div className="xcd-empty-icon">✍️</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--sd-ink)", marginBottom: 10 }}>
              Select a Student Exam Paper to Begin Correction
            </div>
            <p style={{ fontSize: 12.5, color: "var(--sd-muted)", maxWidth: 420, margin: "0 auto 16px" }}>
              Choose any uploaded answer sheet to review AI grading, modify marks, and leave custom feedback.
            </p>
            <select
              className="xcd-select-inline"
              defaultValue=""
              onChange={(e) => e.target.value && onSelectPaper(e.target.value)}
              style={{ minWidth: 260 }}
            >
              <option value="" disabled>Choose a student paper…</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>{p.studentName} — {p.examName} ({p.class})</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  const obtained = paper.corrections.reduce((s, c) => s + c.finalMarksAwarded, 0);
  const total = paper.corrections.reduce((s, c) => s + c.maxMarks, 0);
  const percentage = total > 0 ? Math.round((obtained / total) * 1000) / 10 : 0;
  const grade = getGrade(percentage);
  const isLocked = paper.status === "finalized";
  const avatarBg = getStudentColor(paper.studentName);

  return (
    <div>
      {/* ── Energetic Score Strip ── */}
      <div className="xcd-score-strip">
        <div className="xcd-name-cell">
          <div className="xcd-avatar" style={{ background: avatarBg, width: 44, height: 44, fontSize: 15 }}>
            {initials(paper.studentName)}
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: "var(--sd-ink)" }}>
              {paper.studentName}{" "}
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sd-muted)" }}>
                (Roll No: {paper.rollNumber})
              </span>
            </div>
            <div className="xcd-sub" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
              <span>📖 {paper.examName}</span>
              <span>·</span>
              <span>🏷️ {paper.subject}</span>
              <span>·</span>
              <span>🏫 Class {paper.class}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          {paper.corrections.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div className="xcd-score-big">
                  <AnimNum target={obtained} /> / {total}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--sd-muted)" }}>
                  Total Percentage: {percentage}%
                </div>
              </div>
              <div className="xcd-grade-pill" title={`Letter Grade: ${grade}`}>
                {grade}
              </div>
            </div>
          )}
          <StatusBadge status={paper.status} />
        </div>
      </div>

      <div className="xcd-workspace">
        {/* Left Column: Paper Preview */}
        <div className="xcd-panel">
          <div className="xcd-panel-head">
            <div>
              <div className="xcd-panel-title">
                <span>📄</span> Answer Sheet Preview
              </div>
              <div className="xcd-panel-sub">{paper.fileName}</div>
            </div>
            {paper.fileUrl && (
              <a href={paper.fileUrl} target="_blank" rel="noreferrer" className="xcd-btn secondary">
                <span>🔍</span> Open Full View
              </a>
            )}
          </div>
          <div className="xcd-panel-body">
            <div className="xcd-viewer">
              {paper.fileType === "image" && paper.fileUrl ? (
                <img src={paper.fileUrl} alt={paper.fileName} />
              ) : (
                <>
                  <div style={{ fontSize: 50, marginBottom: 12 }}>📑</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--sd-ink)", marginBottom: 4 }}>
                    {paper.fileName}
                  </div>
                  <div className="xcd-sub" style={{ maxWidth: 300 }}>
                    {paper.fileUrl
                      ? "PDF Document preview ready. Click below to view full student answer sheet in high resolution."
                      : "Document preview will render once file uploads complete."}
                  </div>
                  {paper.fileUrl && (
                    <a href={paper.fileUrl} target="_blank" rel="noreferrer" className="xcd-btn primary" style={{ marginTop: 16 }}>
                      <span>🚀</span> View Document
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Correction & Marking */}
        <div className="xcd-panel">
          <div className="xcd-panel-head">
            <div>
              <div className="xcd-panel-title">
                <span>🤖</span> Question-by-Question Grading
              </div>
              <div className="xcd-panel-sub">
                {isLocked ? "Marks locked. Paper has been finalized." : "Review AI evaluation, adjust marks, and provide custom guidance."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {paper.corrections.length > 0 && (
                <button className="xcd-btn secondary" onClick={() => onExport(paper)}>
                  <span>⬇️</span> Export Report
                </button>
              )}
              {paper.corrections.length > 0 && (
                <button className="xcd-btn secondary" onClick={onViewAnalytics}>
                  <span>📊</span> Analytics
                </button>
              )}
              {!isLocked && paper.corrections.length > 0 && (
                <button className="xcd-btn emerald" onClick={() => onFinalize(paper.id)}>
                  <span>✅</span> Finalize Marks
                </button>
              )}
            </div>
          </div>

          <div className="xcd-panel-body">
            {paper.corrections.length === 0 ? (
              evaluating ? (
                <div className="xcd-progress-wrap">
                  <div className="xcd-spinner" />
                  <div style={{ fontWeight: 800, fontSize: 15 }}>AI is analyzing student handwriting &amp; grading answers…</div>
                  <div className="xcd-sub">Cross-referencing answers with the linked marking scheme.</div>
                </div>
              ) : (
                <div className="xcd-empty">
                  <div className="xcd-empty-icon">🤖</div>
                  <div style={{ fontWeight: 800, color: "var(--sd-ink)", fontSize: 15, marginBottom: 4 }}>
                    {paper.answerKeyId ? "Ready for AI Evaluation" : "No Marking Scheme Linked"}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--sd-muted)", maxWidth: 360, margin: "0 auto 16px" }}>
                    {paper.answerKeyId
                      ? "AI will read the student's paper and award marks based on the linked marking criteria."
                      : "Please link an answer key from the Answer Keys tab before initiating auto-correction."}
                  </div>
                  {paper.answerKeyId && (
                    <button className="xcd-btn emerald" onClick={() => onRunAI(paper.id)}>
                      <span>🤖</span> Run AI Correction Now
                    </button>
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

// ── Question Card Component ──
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

  const statusLabel = {
    correct: "✅ Correct",
    partial: "🟡 Partial Credit",
    incorrect: "❌ Needs Revision",
  }[correction.aiStatus];

  return (
    <div className={`xcd-qcard ${correction.aiStatus}`}>
      <div className="xcd-qcard-head">
        <div>
          <div className="xcd-qtitle">
            Question {correction.questionNumber}. {correction.questionText}
          </div>
          <span className="xcd-qtopic">Topic: {correction.topic}</span>
        </div>
        <span className={`xcd-status-chip ${correction.aiStatus}`}>{statusLabel}</span>
      </div>

      <div className="xcd-qfeedback">
        <span style={{ fontWeight: 800, color: "var(--sd-ink)", marginRight: 6 }}>🤖 AI Feedback:</span>
        {correction.aiFeedback}
      </div>

      <div className="xcd-qcontrols">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 800, color: "var(--sd-ink)" }}>
          Awarded Marks:
          <input
            type="number"
            className="xcd-marks-input"
            value={marks}
            min={0}
            max={correction.maxMarks}
            disabled={locked}
            onChange={(e) => setMarks(Number(e.target.value))}
            onBlur={(e) => commitMarks(Number(e.target.value))}
          />
          <span style={{ color: "var(--sd-muted)", fontWeight: 700 }}>/ {correction.maxMarks} Max</span>
        </label>

        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)" }}>
          🎯 AI Confidence: {correction.aiConfidence}%
        </span>

        {correction.adjustedByTeacher && (
          <span style={{
            fontSize: 10.5,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 8,
            background: "rgba(14,165,233,.15)",
            color: "#0284c7",
          }}>
            ✏️ Adjusted by Teacher
          </span>
        )}
      </div>

      <textarea
        className="xcd-teacher-note"
        placeholder="Add teacher remarks, kudos, or specific feedback for this answer…"
        value={note}
        disabled={locked}
        onChange={(e) => setNote(e.target.value)}
        onBlur={(e) => onChange({ teacherFeedback: e.target.value })}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: Class & Student Analytics
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
    return Array.from(map.entries()).map(([cls, v]) => ({
      class: `Class ${cls}`,
      avg: Math.round((v.sum / v.count) * 10) / 10,
    }));
  }, [scoredPapers]);

  if (!paper || !paper.analytics) {
    return (
      <div className="xcd-panel">
        <div className="xcd-panel-body">
          {scoredPapers.length > 0 && (
            <div className="xcd-chart-box" style={{ marginBottom: 20 }}>
              <div className="xcd-panel-title" style={{ marginBottom: 12 }}>
                <span>📊</span> Class-wise Average Performance (%)
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={classAverages}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sd-line)" />
                  <XAxis dataKey="class" tick={{ fontSize: 12, fill: "var(--sd-muted)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--sd-muted)" }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--sd-card)",
                      border: "1px solid var(--sd-line)",
                      borderRadius: 12,
                      boxShadow: "0 8px 24px rgba(35,44,87,.15)",
                      color: "var(--sd-ink)",
                      fontWeight: 700,
                    }}
                  />
                  <Bar dataKey="avg" fill="#0284c7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="xcd-empty">
            <div className="xcd-empty-icon">📊</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--sd-ink)", marginBottom: 10 }}>
              Select a Graded Paper to View Individual Analytics
            </div>
            <select
              className="xcd-select-inline"
              defaultValue=""
              onChange={(e) => e.target.value && onSelectPaper(e.target.value)}
              style={{ minWidth: 260 }}
            >
              <option value="" disabled>Choose an evaluated student paper…</option>
              {scoredPapers.map((p) => (
                <option key={p.id} value={p.id}>{p.studentName} — {p.examName} ({p.class})</option>
              ))}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="xcd-panel">
        <div className="xcd-panel-head">
          <div>
            <div className="xcd-panel-title">
              <span>📈</span> {paper.studentName} — {paper.examName}
            </div>
            <div className="xcd-panel-sub">{paper.subject} · Class {paper.class} · Exam Date: {formatDate(paper.date)}</div>
          </div>
          <button className="xcd-btn emerald" onClick={() => onExport(paper)}>
            <span>⬇️</span> Download Report
          </button>
        </div>

        <div className="xcd-panel-body">
          {/* Top 4 Performance Badges */}
          <div className="xcd-stats" style={{ marginBottom: 20 }}>
            <div className="xcd-stat-card stat-azure">
              <div className="xcd-stat-val">
                <AnimNum target={a.obtainedMarks} /> / {a.totalMarks}
              </div>
              <div className="xcd-stat-label">Marks Obtained</div>
            </div>
            <div className="xcd-stat-card stat-emerald">
              <div className="xcd-stat-val">
                <AnimNum target={a.percentage} suffix="%" />
              </div>
              <div className="xcd-stat-label">Percentage Score</div>
            </div>
            <div className="xcd-stat-card stat-amber">
              <div className="xcd-stat-val">{a.grade}</div>
              <div className="xcd-stat-label">Performance Grade</div>
            </div>
            <div className="xcd-stat-card stat-rose">
              <div className="xcd-stat-val">
                <AnimNum target={paper.corrections.filter((c) => c.adjustedByTeacher).length} />
              </div>
              <div className="xcd-stat-label">Teacher Adjustments</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="xcd-analytics-grid">
            <div className="xcd-chart-box">
              <div className="xcd-panel-title" style={{ marginBottom: 12 }}>
                <span>📊</span> Question-wise Marks Breakdown
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sd-line)" />
                  <XAxis dataKey="q" tick={{ fontSize: 12, fill: "var(--sd-muted)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--sd-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--sd-card)",
                      border: "1px solid var(--sd-line)",
                      borderRadius: 12,
                      color: "var(--sd-ink)",
                      fontWeight: 700,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--sd-muted)" }} />
                  <Bar dataKey="obtained" name="Obtained Marks" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="max" name="Max Possible" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="xcd-chart-box">
              <div className="xcd-panel-title" style={{ marginBottom: 12 }}>
                <span>🎯</span> Answer Accuracy Distribution
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--sd-card)",
                      border: "1px solid var(--sd-line)",
                      borderRadius: 12,
                      color: "var(--sd-ink)",
                      fontWeight: 700,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--sd-muted)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Qualitative Insights Row */}
          <div className="xcd-analytics-grid" style={{ marginTop: 18 }}>
            <div>
              <div className="xcd-panel-title" style={{ marginBottom: 10, color: "#059669" }}>
                <span>💪</span> Strengths &amp; Mastery Areas
              </div>
              <ul className="xcd-list">
                {a.strengths.map((s, i) => (
                  <li key={i} style={{ borderLeft: "4px solid #10b981" }}>
                    <span style={{ color: "#10b981" }}>✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="xcd-panel-title" style={{ marginBottom: 10, color: "#dc2626" }}>
                <span>⚠️</span> Recommended Focus Areas
              </div>
              <ul className="xcd-list">
                {a.weaknesses.map((s, i) => (
                  <li key={i} style={{ borderLeft: "4px solid #ef4444" }}>
                    <span style={{ color: "#ef4444" }}>!</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="xcd-panel-title" style={{ marginBottom: 10, color: "#b45309" }}>
              <span>🔁</span> Recurring Errors &amp; Calculation Slips
            </div>
            <ul className="xcd-list">
              {a.commonMistakes.map((m, i) => (
                <li key={i} style={{ borderLeft: "4px solid #f59e0b" }}>
                  <span style={{ color: "#f59e0b" }}>•</span> {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Robot Tip Card (Teacher Dashboard Mascot Style) */}
          <div className="xcd-tip-card" style={{ marginTop: 20 }}>
            <h4>
              <span>🤖</span> Teacher Pedagogical Summary &amp; Next Steps
            </h4>
            <p>{a.performanceInsight}</p>
            <div className="xcd-tip-art">
              <img src={roboStudy} alt="Teacher Robo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: Answer Keys & Marking Criteria
// ══════════════════════════════════════════════════════════════════════════
function AnswerKeysTab({ answerKeys, onCreateClick }: { answerKeys: AnswerKey[]; onCreateClick: () => void }) {
  return (
    <div className="xcd-panel">
      <div className="xcd-panel-head">
        <div>
          <div className="xcd-panel-title">
            <span>🔑</span> Answer Keys &amp; Marking Criteria
          </div>
          <div className="xcd-panel-sub">
            The automated AI grading engine matches student responses against these question rubrics.
          </div>
        </div>
        <button className="xcd-btn emerald" onClick={onCreateClick}>
          <span>➕</span> New Marking Scheme
        </button>
      </div>

      <div className="xcd-panel-body">
        {answerKeys.length === 0 ? (
          <div className="xcd-empty">
            <div className="xcd-empty-icon">🔑</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--sd-ink)", marginBottom: 4 }}>
              No Answer Keys Defined
            </div>
            <div style={{ fontSize: 12.5, color: "var(--sd-muted)", marginBottom: 14 }}>
              Create an answer key so that uploaded exam papers can be auto-corrected.
            </div>
            <button className="xcd-btn emerald" onClick={onCreateClick}>
              <span>➕</span> Create First Answer Key
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16 }}>
            {answerKeys.map((k, idx) => {
              const accentColor = SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length];
              return (
                <div
                  key={k.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid var(--sd-line)",
                    background: "var(--sd-card-soft)",
                    padding: "16px 18px",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "var(--sd-shadow-soft)",
                    borderTop: `4px solid ${accentColor}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "var(--sd-ink)" }}>{k.examName}</div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 8,
                      background: "rgba(16, 185, 129, 0.14)",
                      color: "#059669",
                    }}>
                      {k.totalMarks} Marks
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sd-muted)", marginBottom: 12 }}>
                    {k.subject} · Class {k.class} · {k.questions.length} Questions
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {k.questions.slice(0, 3).map((q) => (
                      <div
                        key={q.questionNumber}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: "var(--sd-ink)",
                          fontWeight: 600,
                          padding: "5px 0",
                          borderTop: "1px dashed var(--sd-line)",
                        }}
                      >
                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 220 }}>
                          Q{q.questionNumber}. {q.questionText}
                        </span>
                        <span style={{ fontWeight: 800, color: "var(--sd-muted)" }}>{q.maxMarks}m</span>
                      </div>
                    ))}
                    {k.questions.length > 3 && (
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#0284c7", marginTop: 4 }}>
                        + {k.questions.length - 3} more questions
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MODAL: Upload Exam Paper
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
      <motion.div className="xcd-modal" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="xcd-modal-head">
          <div className="xcd-modal-title">📤 Upload Student Exam Paper</div>
          <button className="xcd-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="xcd-modal-body">
          <div className="xcd-form-grid">
            <div className="xcd-field">
              <label>Student Name</label>
              <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Aarav Sharma" />
            </div>
            <div className="xcd-field">
              <label>Roll Number / ID</label>
              <input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. 10A-14" />
            </div>
          </div>

          <div className="xcd-field">
            <label>Link to Marking Scheme / Answer Key</label>
            <select value={answerKeyId} onChange={(e) => setAnswerKeyId(e.target.value)}>
              <option value="" disabled>Select an exam marking scheme…</option>
              {answerKeys.map((k) => (
                <option key={k.id} value={k.id}>{k.examName} — {k.subject} (Class {k.class})</option>
              ))}
            </select>
            {answerKeys.length === 0 && (
              <div style={{ fontSize: 11.5, color: "#ef4444", fontWeight: 700 }}>
                ⚠️ No answer keys found. Please create one first from the Answer Keys tab.
              </div>
            )}
          </div>

          <div className="xcd-field">
            <label>Scanned Answer Sheet (PDF, JPG, PNG)</label>
            <label className="xcd-upload-area">
              <div style={{ fontSize: 38, marginBottom: 8 }}>📤</div>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--sd-ink)" }}>
                {file ? file.name : "Click or drag paper here to upload"}
              </div>
              <div className="xcd-sub">Supports scanned images &amp; PDFs up to 15MB</div>
              <input ref={inputRef} type="file" hidden accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
        <div className="xcd-modal-foot">
          <button className="xcd-btn secondary" onClick={onClose}>Cancel</button>
          <button className="xcd-btn emerald" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? "Uploading Paper…" : "Upload & Begin Evaluation"}
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
      <motion.div className="xcd-modal" style={{ maxWidth: 660 }} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="xcd-modal-head">
          <div className="xcd-modal-title">🔑 Define Exam Marking Scheme</div>
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
              <label>Class / Section</label>
              <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="e.g. 10-A" />
            </div>
            <div className="xcd-field">
              <label>Calculated Total Marks</label>
              <input value={`${totalMarks} Marks`} readOnly style={{ fontWeight: 800, color: "#059669" }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--sd-ink)" }}>
              Question-wise Criteria ({questions.length})
            </div>
            {questions.map((q, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: 14,
                  border: "1px solid var(--sd-line)",
                  background: "var(--sd-card-soft)",
                  padding: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13, color: "var(--sd-ink)" }}>Question {q.questionNumber}</strong>
                  {questions.length > 1 && (
                    <button className="xcd-icon-btn" onClick={() => removeQuestion(idx)} title="Delete Question">
                      🗑️
                    </button>
                  )}
                </div>
                <div className="xcd-field" style={{ marginBottom: 8 }}>
                  <label>Question Prompt / Text</label>
                  <input
                    value={q.questionText}
                    onChange={(e) => updateQuestion(idx, { questionText: e.target.value })}
                    placeholder="e.g. Solve for x: 2x + 5 = 17"
                  />
                </div>
                <div className="xcd-form-grid">
                  <div className="xcd-field">
                    <label>Curriculum Topic</label>
                    <input
                      value={q.topic}
                      onChange={(e) => updateQuestion(idx, { topic: e.target.value })}
                      placeholder="e.g. Algebra"
                    />
                  </div>
                  <div className="xcd-field">
                    <label>Max Marks</label>
                    <input
                      type="number"
                      min={1}
                      value={q.maxMarks}
                      onChange={(e) => updateQuestion(idx, { maxMarks: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="xcd-field" style={{ marginTop: 8 }}>
                  <label>Expected Model Answer / Rubric Points</label>
                  <textarea
                    value={q.modelAnswer}
                    onChange={(e) => updateQuestion(idx, { modelAnswer: e.target.value })}
                    placeholder="Key steps, required formulas, and final answer"
                    style={{ minHeight: 46 }}
                  />
                </div>
              </div>
            ))}
            <button className="xcd-btn secondary" onClick={addQuestion}>
              <span>➕</span> Add Another Question
            </button>
          </div>
        </div>
        <div className="xcd-modal-foot">
          <button className="xcd-btn secondary" onClick={onClose}>Cancel</button>
          <button className="xcd-btn emerald" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? "Saving Scheme…" : "Save Marking Scheme"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}