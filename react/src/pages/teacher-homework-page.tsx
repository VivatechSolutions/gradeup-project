import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { cn } from "../lib/utils";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";
import { useNotificationStore } from "../lib/notification-store";
import { useTheme } from "../hooks/use-theme";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen, Clock, Send, BarChart2, Eye, Plus, Edit, Trash2, Award, Users,
  Search, Paperclip, CheckCircle2, X, TrendingUp, Filter, Sparkles,
  ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Mic, Image, FileText,
  HelpCircle, Check, AlertCircle, RefreshCw, Layers, Calendar, ChevronDown,
  CheckCheck, Star, Target, Zap, ShieldCheck
} from "lucide-react";
import roboImg from "../assets/robo.png";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES & INTERFACES
───────────────────────────────────────────────────────────────────────────── */
export type QuestionType = "mcq" | "short" | "medium" | "long" | "speech" | "image" | "document";

export interface QuestionItem {
  id: string;
  type: QuestionType;
  marks: number;
  question: string;
  options?: string[];
  correctOption?: number;
  hint?: string;
  minWords?: number;
  maxWords?: number;
  sampleAnswer?: string;
}

export interface Course {
  id: number;
  title: string;
  enrollmentCount: number;
  subject?: string;
  color?: string;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  instructions: string;
  courseId: number;
  courseName: string;
  dueDate: string;
  maxScore: number;
  submissionType: "text" | "file" | "both";
  createdAt: string;
  submissionCount: number;
  totalStudents: number;
  questions: QuestionItem[];
}

export interface Submission {
  id: number;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
  content: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
  gradedAt?: string;
  questionAnswers?: Record<string, { answer: string; score?: number; feedback?: string }>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   QUESTION TYPE METADATA
───────────────────────────────────────────────────────────────────────────── */
const QUESTION_TYPES: Record<QuestionType, { label: string; short: string; icon: any; color: string; bg: string }> = {
  mcq:      { label: "Multiple Choice", short: "MCQ",      icon: Target,    color: "#0284c7", bg: "rgba(2,132,199,.12)" },
  short:    { label: "Short Answer",    short: "2 Marks",  icon: Edit,      color: "#0ea5e9", bg: "rgba(14,165,233,.12)" },
  medium:   { label: "Medium Answer",   short: "5 Marks",  icon: FileText,  color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  long:     { label: "Essay Question",  short: "Essay",    icon: BookOpen,  color: "#ea580c", bg: "rgba(234,88,12,.12)" },
  speech:   { label: "Voice Answer",    short: "Speech",   icon: Mic,       color: "#10b981", bg: "rgba(16,185,129,.12)" },
  image:    { label: "Diagram / Image", short: "Diagram",  icon: Image,     color: "#0d9488", bg: "rgba(13,148,136,.12)" },
  document: { label: "Doc Upload",      short: "Document", icon: Paperclip, color: "#0284c7", bg: "rgba(2,132,199,.12)" },
};

/* ─────────────────────────────────────────────────────────────────────────────
   SAMPLE / FALLBACK ASSIGNMENTS
───────────────────────────────────────────────────────────────────────────── */
const DEFAULT_ASSIGNMENTS: Assignment[] = [
  {
    id: 101,
    title: "Cell Discovery & Organelles Lab Review",
    courseId: 1,
    courseName: "Grade 10 Biology",
    dueDate: new Date(Date.now() + 3 * 864e5).toISOString(),
    maxScore: 30,
    submissionType: "both",
    description: "Explore the fundamental building blocks of life — cell theory, organelle functions, and microscopy techniques.",
    instructions: "Answer all questions thoroughly. For MCQ, select the best option. For diagram questions, submit a clean labeled sketch.",
    createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
    submissionCount: 24,
    totalStudents: 28,
    questions: [
      {
        id: "q1",
        type: "mcq",
        marks: 2,
        question: "Who coined the term 'cell' after observing thin cork slices under a compound microscope in 1665?",
        options: ["Anton van Leeuwenhoek", "Robert Hooke", "Matthias Schleiden", "Theodor Schwann"],
        correctOption: 1,
        hint: "He compared the microscopic porous structures to monastery quarters.",
      },
      {
        id: "q2",
        type: "mcq",
        marks: 2,
        question: "Which organelle contains its own circular DNA and generates most of the chemical energy needed by the cell (ATP)?",
        options: ["Golgi apparatus", "Ribosome", "Mitochondria", "Endoplasmic Reticulum"],
        correctOption: 2,
        hint: "Often called the powerhouse of eukaryotic cells.",
      },
      {
        id: "q3",
        type: "short",
        marks: 4,
        question: "Differentiate between rough and smooth endoplasmic reticulum in terms of structure and primary cellular function.",
        minWords: 20,
        maxWords: 70,
        hint: "Mention ribosomes and lipid/protein synthesis.",
        sampleAnswer: "Rough ER is studded with ribosomes and synthesizes/folds proteins; smooth ER lacks ribosomes and is responsible for lipid synthesis and detoxification.",
      },
      {
        id: "q4",
        type: "image",
        marks: 6,
        question: "Provide or sketch a labeled cross-section of an animal cell showing at least 5 major organelles.",
        hint: "Include Nucleus, Mitochondria, Cell Membrane, Cytoplasm, and Ribosomes.",
      },
      {
        id: "q5",
        type: "speech",
        marks: 6,
        question: "Record a 30-45 second spoken explanation describing how the cell membrane regulates transport via selectively permeable channels.",
        hint: "Discuss phospholipids, active transport, and facilitated diffusion.",
      },
      {
        id: "q6",
        type: "long",
        marks: 10,
        question: "Evaluate the Unified Cell Theory and discuss how modern cellular engineering and CRISPR gene therapy rely on its principles.",
        minWords: 150,
        maxWords: 350,
        hint: "Cover the 3 core pillars proposed by Schleiden, Schwann, and Virchow, followed by therapeutic applications.",
      },
    ],
  },
  {
    id: 102,
    title: "Newtonian Laws of Motion & Momentum",
    courseId: 2,
    courseName: "Grade 11 Physics",
    dueDate: new Date(Date.now() + 5 * 864e5).toISOString(),
    maxScore: 25,
    submissionType: "text",
    description: "Master Newton's three fundamental laws and their real-world applications in classical mechanics and rocketry.",
    instructions: "Show your formulas and working for all calculations. Keep reasoning concise and scientifically accurate.",
    createdAt: new Date(Date.now() - 4 * 864e5).toISOString(),
    submissionCount: 19,
    totalStudents: 25,
    questions: [
      {
        id: "p1",
        type: "mcq",
        marks: 2,
        question: "If a constant net force of 40 N is applied to an object with mass 8 kg, what is the resulting acceleration?",
        options: ["2.5 m/s²", "5.0 m/s²", "10 m/s²", "320 m/s²"],
        correctOption: 1,
        hint: "Use F = m * a.",
      },
      {
        id: "p2",
        type: "short",
        marks: 4,
        question: "Explain Newton's Third Law and illustrate how it provides upward thrust during a rocket launch.",
        minWords: 25,
        maxWords: 80,
        hint: "Equal and opposite reaction forces between expelled gas and rocket body.",
      },
      {
        id: "p3",
        type: "medium",
        marks: 7,
        question: "A 1200 kg car traveling at 25 m/s comes to a complete stop over a distance of 50 m. Determine the net braking force applied.",
        minWords: 40,
        maxWords: 120,
        hint: "First find acceleration using v² = u² + 2as, then apply F = ma.",
      },
      {
        id: "p4",
        type: "long",
        marks: 12,
        question: "Analyze the principle of conservation of linear momentum in elastic vs inelastic collisions with mathematical proofs.",
        minWords: 180,
        maxWords: 320,
        hint: "Define isolated systems, kinetic energy differences, and real-world automotive safety crumple zones.",
      },
    ],
  },
  {
    id: 103,
    title: "Calculus: Differentiation & Chain Rule",
    courseId: 3,
    courseName: "Grade 12 Advanced Mathematics",
    dueDate: new Date(Date.now() - 1 * 864e5).toISOString(),
    maxScore: 30,
    submissionType: "both",
    description: "Deep dive into product rule, quotient rule, and composite differentiation with physics applications.",
    instructions: "Submit neat step-by-step mathematical working. Clearly state the rules utilized at each step.",
    createdAt: new Date(Date.now() - 7 * 864e5).toISOString(),
    submissionCount: 22,
    totalStudents: 22,
    questions: [
      {
        id: "m1",
        type: "mcq",
        marks: 3,
        question: "What is the first derivative of f(x) = sin(3x² + 5)?",
        options: ["cos(3x² + 5)", "6x · cos(3x² + 5)", "3x · cos(3x² + 5)", "-6x · sin(3x² + 5)"],
        correctOption: 1,
        hint: "Apply the Chain Rule: d/dx[f(g(x))] = f'(g(x)) * g'(x).",
      },
      {
        id: "m2",
        type: "medium",
        marks: 7,
        question: "Differentiate y = (x³ + 2x) / (e^x + 1) using the Quotient Rule. Simplify your final expression.",
        minWords: 30,
        maxWords: 90,
        hint: "Quotient Rule: (u'v - uv') / v².",
      },
      {
        id: "m3",
        type: "document",
        marks: 8,
        question: "Upload your handwritten solution sheet solving optimization problem #4 from textbook Chapter 7.",
        hint: "Ensure lighting is clear and all stationary points are tested via the Second Derivative Test.",
      },
      {
        id: "m4",
        type: "long",
        marks: 12,
        question: "Explain the geometric and physical significance of the second derivative f''(x) in motion analysis (displacement, velocity, acceleration).",
        minWords: 150,
        maxWords: 300,
        hint: "Discuss concavity, inflection points, rate of change of rate of change.",
      },
    ],
  },
  {
    id: 104,
    title: "Algorithms: Sorting & Complexity Analysis",
    courseId: 4,
    courseName: "Grade 12 Computer Science",
    dueDate: new Date(Date.now() + 7 * 864e5).toISOString(),
    maxScore: 25,
    submissionType: "both",
    description: "Explore Big-O notation, Divide-and-Conquer paradigms, and trade-offs between Merge Sort and Quick Sort.",
    instructions: "Write clean pseudocode where requested and specify best, average, and worst-case time complexities.",
    createdAt: new Date(Date.now() - 1 * 864e5).toISOString(),
    submissionCount: 15,
    totalStudents: 24,
    questions: [
      {
        id: "cs1",
        type: "mcq",
        marks: 2,
        question: "What is the worst-case time complexity of Quick Sort when an unbalanced pivot is chosen continuously?",
        options: ["O(log n)", "O(n log n)", "O(n²)", "O(n!)"],
        correctOption: 2,
        hint: "Occurs when array is already sorted and first/last element is picked as pivot.",
      },
      {
        id: "cs2",
        type: "short",
        marks: 4,
        question: "Why is Merge Sort considered a stable sorting algorithm, while standard Quick Sort is not?",
        minWords: 20,
        maxWords: 60,
        hint: "Think about the relative ordering of equal keys during merge.",
      },
      {
        id: "cs3",
        type: "medium",
        marks: 7,
        question: "Provide the recursive pseudocode for the partition step in Quick Sort and state its auxiliary space complexity.",
        minWords: 40,
        maxWords: 120,
        hint: "Lomuto or Hoare partitioning method.",
      },
      {
        id: "cs4",
        type: "long",
        marks: 12,
        question: "Compare in-memory sorting with external merge sort for processing multi-terabyte datasets exceeding physical RAM limits.",
        minWords: 180,
        maxWords: 350,
        hint: "Mention disk I/O latency, k-way merging, buffer pools, and sequential block reading.",
      },
    ],
  },
];

const DEFAULT_SUBMISSIONS: Record<number, Submission[]> = {
  101: [
    {
      id: 201,
      studentName: "Aditi Ramesh",
      studentEmail: "aditi.ramesh@gradeup.edu",
      studentAvatar: "AR",
      submittedAt: new Date(Date.now() - 8 * 3600e3).toISOString(),
      score: 28,
      feedback: "Brilliant analysis of cell theory! Labeled diagram was crisp and thorough.",
      gradedAt: new Date(Date.now() - 2 * 3600e3).toISOString(),
      content: "1. Robert Hooke coined the term 'cell' in 1665.\n2. Mitochondria produce ATP via cellular respiration.\n3. Rough ER has ribosomes for protein synthesis, Smooth ER synthesizes lipids.\n4. Uploaded animal cell diagram with 7 organelles.\n5. Voice recording submitted explaining membrane permeability.\n6. Essay on Unified Cell Theory and CRISPR gene therapies completed.",
      questionAnswers: {
        q1: { answer: "Robert Hooke", score: 2, feedback: "Spot on!" },
        q2: { answer: "Mitochondria", score: 2, feedback: "Correct." },
        q3: { answer: "Rough ER possesses ribosomes on its outer surface designed for protein synthesis and membrane targeting. In contrast, Smooth ER lacks ribosomes and synthesizes lipids, phospholipids, and steroid hormones while sequestering calcium ions.", score: 4, feedback: "Excellent explanation with cellular context." },
        q4: { answer: "[Diagram Uploaded: animal-cell-labeled.png - Nucleus, Mitochondria, Golgi, Ribosome, Lysosome]", score: 6, feedback: "Very clear hand-drawn diagram." },
        q5: { answer: "[Voice Note: 42s recorded - Clear explanation of lipid bilayer and transport proteins]", score: 5, feedback: "Clear audio, good technical vocabulary." },
        q6: { answer: "The Unified Cell Theory establishes that all living organisms consist of one or more cells, that the cell is the most fundamental unit of biological structure, and that all cells arise solely from pre-existing cells. In modern medicine, these axioms guide CRISPR-Cas9 therapies: by understanding cellular lineage and membrane mechanisms, geneticists can selectively edit genomes within specific stem cells...", score: 9, feedback: "Deep conceptual mastery shown." },
      },
    },
    {
      id: 202,
      studentName: "Karthik Sundaram",
      studentEmail: "karthik.s@gradeup.edu",
      studentAvatar: "KS",
      submittedAt: new Date(Date.now() - 14 * 3600e3).toISOString(),
      content: "Answers submitted for Chapter 5 review:\n1. Robert Hooke\n2. Mitochondria\n3. Rough ER synthesizes proteins because of ribosomes, Smooth ER detoxifies drugs and makes lipids.\n4. Animal cell sketch attached.\n5. Audio recorded explaining active and passive diffusion.\n6. Cell theory essay discussing Schwann and Virchow.",
      questionAnswers: {
        q1: { answer: "Robert Hooke", score: 2 },
        q2: { answer: "Mitochondria", score: 2 },
        q3: { answer: "Rough ER is rough because it contains ribosomes for making proteins. Smooth ER makes lipids and breaks down toxins in cells.", score: 3 },
        q4: { answer: "[Sketch uploaded: cell_scan.jpg]", score: 5 },
        q5: { answer: "[Audio Recording: 35s]", score: 4 },
        q6: { answer: "Cell theory explains that everything living is made of cells. Today we use this in stem cell research...", score: 7 },
      },
    },
    {
      id: 203,
      studentName: "Divya Nambiar",
      studentEmail: "divya.n@gradeup.edu",
      studentAvatar: "DN",
      submittedAt: new Date(Date.now() - 1 * 3600e3).toISOString(),
      content: "1. Robert Hooke\n2. Mitochondria\n3. The rough endoplasmic reticulum features membrane-bound ribosomes that assemble polypeptides. Smooth ER produces cholesterol and steroids.\n4. Hand-drawn diagram uploaded.\n5. Voice note submitted.\n6. Extended essay on cell theory and cellular oncology.",
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────────
   ANIMATED NUMBER COUNTER COMPONENT
───────────────────────────────────────────────────────────────────────────── */
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let c = 0;
    const step = () => {
      c += Math.max(1, target / 35);
      if (c < target) {
        setVal(Math.floor(c));
        requestAnimationFrame(step);
      } else {
        setVal(target);
      }
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{val}{suffix}</>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   DONUT CHART COMPONENT
───────────────────────────────────────────────────────────────────────────── */
function DonutChart({
  segments,
  size = 120,
  stroke = 14,
}: {
  segments: { label: string; pct: number; color: string }[];
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let accumulated = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      {segments.map((s, i) => {
        const dash = (s.pct / 100) * c;
        const el = (
          <circle
            key={i}
            r={r}
            cx={size / 2}
            cy={size / 2}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-(accumulated / 100) * c}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        );
        accumulated += s.pct;
        return el;
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE STYLES
───────────────────────────────────────────────────────────────────────────── */
const CSS_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root, [data-theme="light"], .light {
  --sd-page:          #ffffff;
  --sd-page-2:        #f8fafc;
  --sd-card:          #ffffff;
  --sd-card-soft:     #f8fafc;
  --sd-ink:           #071235;
  --sd-muted:         #64748b;
  --sd-faint:         #94a3b8;
  --sd-line:          rgba(15,23,42,.08);
  --sd-line-subtle:   rgba(15,23,42,.04);
  --sd-shadow:        0 12px 30px rgba(35,44,87,.08);
  --sd-shadow-soft:   0 7px 18px rgba(35,44,87,.06);
  --sd-shadow-hover:  0 18px 36px rgba(35,44,87,.12);
  --sd-input-bg:      #ffffff;
  --sd-input-border:  rgba(15,23,42,.14);
  --sd-bar-bg:        #f1f5f9;
  --sd-pill-bg:       #ffffff;
  --sd-overlay:       #ffffff;
  --sd-accent:        #0284c7;
  --sd-accent-grad:   linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
  --sd-hero-grad:     linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0d9488 100%);
}

[data-theme="dark"], .dark, .th-root.dark {
  --sd-page:          #000000;
  --sd-page-2:        #08090d;
  --sd-card:          #0d0e12;
  --sd-card-soft:     #14161c;
  --sd-ink:           #f8fafc;
  --sd-muted:         #94a3b8;
  --sd-faint:         #64748b;
  --sd-line:          rgba(255,255,255,.08);
  --sd-line-subtle:   rgba(255,255,255,.04);
  --sd-shadow:        0 20px 54px rgba(0,0,0,.65);
  --sd-shadow-soft:   0 12px 28px rgba(0,0,0,.45);
  --sd-shadow-hover:  0 22px 50px rgba(0,0,0,.85);
  --sd-input-bg:      #121318;
  --sd-input-border:  rgba(255,255,255,.12);
  --sd-bar-bg:        rgba(255,255,255,.06);
  --sd-pill-bg:       #121318;
  --sd-overlay:       #08090d;
  --sd-accent:        #38bdf8;
  --sd-accent-grad:   linear-gradient(135deg, #0284c7 0%, #14b8a6 100%);
  --sd-hero-grad:     linear-gradient(135deg, #031422 0%, #05263d 45%, #054863 75%, #04403c 100%);
}

.th-root {
  min-height: 100vh;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--sd-ink);
  background: radial-gradient(circle at 14% 0%, rgba(2,132,199,.08), transparent 28%),
              radial-gradient(circle at 88% 5%, rgba(255,171,64,.08), transparent 26%),
              linear-gradient(180deg, #ffffff 0%, #ffffff 80px, #f8fafc 100%);
  position: relative;
  overflow-x: hidden;
  padding: 24px 28px 80px;
  transition: background .3s ease, color .3s ease;
}

[data-theme="dark"] .th-root,
.dark .th-root,
.th-root.dark {
  background: radial-gradient(circle at 14% 0%, rgba(2,132,199,.12), transparent 30%),
              radial-gradient(circle at 88% 5%, rgba(14,165,233,.08), transparent 26%),
              linear-gradient(180deg, #000000 0%, #000000 80px, #08090d 100%) !important;
  color: #f8fafc !important;
}

.sd-bg-spark {
  position: absolute; pointer-events: none; z-index: 0; border-radius: 999px;
  opacity: .5; animation: sdDrift 10s ease-in-out infinite;
}
.sd-bg-spark.s1 { left: 45%; top: 90px; width: 9px; height: 9px; background: #ffb21d; box-shadow: 40px 30px 0 #27b86a, 80px -15px 0 #2389ff; }
.sd-bg-spark.s2 { right: 6%; top: 280px; width: 8px; height: 8px; background: #0284c7; box-shadow: -50px 50px 0 #0d9488, -90px -20px 0 #00a7c8; animation-delay: -3s; }
.sd-bg-spark.s3 { left: 8%; bottom: 180px; width: 8px; height: 8px; background: #27b86a; box-shadow: 44px -36px 0 #ff791f, 96px 20px 0 #2389ff; animation-delay: -6s; }

.sd-bg-ribbon {
  position: absolute; pointer-events: none; z-index: 0; left: 2%; right: 2%; top: 130px; height: 160px;
  border-radius: 50%; background: linear-gradient(90deg, rgba(35,137,255,.07), rgba(255,178,29,.09), rgba(39,184,106,.07));
  filter: blur(24px); opacity: .7; animation: sdBgWave 14s ease-in-out infinite;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes sdDrift { 0%,100%{transform:translate3d(0,0,0) rotate(0)} 50%{transform:translate3d(18px,-14px,0) rotate(6deg)} }
@keyframes sdBgWave { 0%,100%{transform:translate3d(-2%,0,0)} 50%{transform:translate3d(2%,-2%,0) scale(1.02)} }
@keyframes sdBreathe { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes robotFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-7px) rotate(2.5deg); } }
@keyframes robotPulseGlow { 0%, 100% { box-shadow: 0 16px 36px rgba(2, 132, 199, 0.28), 0 0 18px rgba(56, 189, 248, 0.2); } 50% { box-shadow: 0 20px 42px rgba(2, 132, 199, 0.42), 0 0 32px rgba(56, 189, 248, 0.42); } }
@keyframes sdPop3d { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-6px) scale(1.04)} }
@keyframes sdPulseSoft { 0%,100%{box-shadow:0 0 0 0 rgba(2,132,199,.3)} 50%{box-shadow:0 0 0 10px rgba(2,132,199,0)} }
@keyframes sdShineSweep { 0%{transform:translateX(-150%) skewX(-20deg)} 100%{transform:translateX(250%) skewX(-20deg)} }

.th-shell {
  max-width: 1260px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.th-hero {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  padding: 30px 34px;
  margin-bottom: 24px;
  background: var(--sd-hero-grad);
  color: #ffffff;
  box-shadow: var(--sd-shadow);
  border: 1px solid rgba(255,255,255,.18);
  animation: cardIn .45s both;
}
.th-hero::before {
  content: ''; position: absolute; top: -60px; right: -60px; width: 260px; height: 260px;
  border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.24), transparent 70%);
  animation: sdBreathe 6s ease-in-out infinite; pointer-events: none;
}
.th-hero::after {
  content: ''; position: absolute; bottom: -80px; left: 15%; width: 220px; height: 220px;
  border-radius: 50%; background: radial-gradient(circle, rgba(56,189,248,.22), transparent 70%);
  pointer-events: none;
}

.th-hero-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
}
.th-hero-content {
  flex: 1;
  min-width: 0;
}
.th-hero-robot-stage {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}
.th-hero-robot-bubble {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 18px;
  padding: 12px 16px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
  max-width: 210px;
  animation: cardIn 0.5s both;
}
[data-theme="dark"] .th-hero-robot-bubble {
  background: rgba(13, 14, 18, 0.94);
  border: 1px solid rgba(56, 189, 248, 0.28);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.6);
}
.th-hero-robot-bubble-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  color: #0284c7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
[data-theme="dark"] .th-hero-robot-bubble-badge {
  color: #38bdf8;
}
.th-hero-robot-bubble-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
  margin: 0;
}
[data-theme="dark"] .th-hero-robot-bubble-text {
  color: #e2e8f0;
}
.th-hero-robot-wrap {
  position: relative;
  width: 124px;
  height: 124px;
  border-radius: 30px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(224, 242, 254, 0.88));
  border: 1.5px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 18px 36px rgba(2, 132, 199, 0.28), inset 0 -6px 0 rgba(2, 132, 199, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: robotPulseGlow 4.5s ease-in-out infinite;
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(.34,1.56,.64,1);
}
.th-hero-robot-wrap:hover {
  transform: translateY(-4px) scale(1.04);
}
[data-theme="dark"] .th-hero-robot-wrap {
  background: linear-gradient(145deg, #0d0e12, #08283e);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.65), inset 0 -6px 0 rgba(14, 165, 233, 0.25);
}
.th-hero-robot {
  width: 98px;
  height: 98px;
  object-fit: contain;
  filter: drop-shadow(0 10px 16px rgba(2, 132, 199, 0.3));
  transition: transform 0.3s cubic-bezier(.34,1.56,.64,1);
  animation: robotFloat 4.2s ease-in-out infinite;
}
.th-hero-robot-wrap:hover .th-hero-robot {
  transform: scale(1.14) rotate(4deg);
}

.th-hero-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 14px; border-radius: 999px;
  background: rgba(255,255,255,.16); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.26);
  font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em;
  margin-bottom: 12px;
}
.th-live-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #34d399;
  box-shadow: 0 0 10px #34d399; animation: sdPulseSoft 2s infinite;
}
.th-hero-title {
  font-size: clamp(22px, 3.2vw, 32px); font-weight: 800; line-height: 1.15; margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.th-hero-sub {
  font-size: 13.5px; opacity: .88; max-width: 580px; line-height: 1.55; margin-bottom: 20px;
}
.th-hero-actions {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.th-hero-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 22px; border-radius: 14px; border: none;
  font-family: inherit; font-size: 13.5px; font-weight: 800;
  cursor: pointer; transition: all .2s cubic-bezier(.34,1.56,.64,1);
}
.th-hero-btn.primary {
  background: #ffffff; color: #0369a1; box-shadow: 0 8px 24px rgba(0,0,0,.18);
}
.th-hero-btn.primary:hover {
  transform: translateY(-2px) scale(1.02); box-shadow: 0 12px 30px rgba(0,0,0,.26);
}
.th-hero-btn.secondary {
  background: rgba(255,255,255,.15); color: #fff;
  border: 1px solid rgba(255,255,255,.3); backdrop-filter: blur(12px);
}
.th-hero-btn.secondary:hover {
  background: rgba(255,255,255,.24); transform: translateY(-2px);
}

.th-hero-stat-row {
  display: flex; align-items: center; gap: 12px; margin-top: 24px; flex-wrap: wrap;
}
.th-hero-pill {
  background: rgba(255,255,255,.14); backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.22);
  border-radius: 16px; padding: 10px 16px; display: flex; align-items: center; gap: 12px;
}
.th-hero-pill-num {
  font-size: 20px; font-weight: 800; line-height: 1;
}
.th-hero-pill-lbl {
  font-size: 11px; opacity: .8; font-weight: 600; text-transform: uppercase; letter-spacing: .04em;
}

.th-stats-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px;
}
.th-stat-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 20px; padding: 18px 20px;
  box-shadow: var(--sd-shadow-soft);
  position: relative; overflow: hidden;
  transition: transform .24s cubic-bezier(.34,1.56,.64,1), box-shadow .24s, border-color .24s;
  animation: cardIn .42s both;
}
.th-stat-card:nth-child(1) { animation-delay: 0.05s; }
.th-stat-card:nth-child(2) { animation-delay: 0.12s; }
.th-stat-card:nth-child(3) { animation-delay: 0.19s; }
.th-stat-card:nth-child(4) { animation-delay: 0.26s; }

.th-stat-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--sd-shadow-hover);
  border-color: rgba(2,132,199,.4);
}
.th-stat-card:hover .th-stat-icon {
  transform: scale(1.18) rotate(6deg);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.th-stat-top {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
}
.th-stat-icon {
  width: 44px; height: 44px; border-radius: 14px;
  display: grid; place-items: center; font-size: 20px;
  animation: sdPop3d 4s ease-in-out infinite;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.th-stat-badge {
  font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px;
  background: var(--sd-card-soft); color: var(--sd-muted); border: 1px solid var(--sd-line-subtle);
}
.th-stat-value {
  font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; margin-bottom: 4px;
  color: var(--sd-ink);
}
.th-stat-label {
  font-size: 12.5px; font-weight: 600; color: var(--sd-muted);
}
.th-stat-trend {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11.5px; font-weight: 700; margin-top: 6px;
}

.th-spotlights {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px;
}
.th-spotlight-card {
  border-radius: 18px; padding: 16px 20px;
  position: relative; overflow: hidden;
  border: 1px solid transparent;
  transition: transform .2s, box-shadow .2s;
  animation: cardIn .45s both;
}
.th-spotlight-card:nth-child(1) { animation-delay: 0.08s; }
.th-spotlight-card:nth-child(2) { animation-delay: 0.16s; }
.th-spotlight-card:nth-child(3) { animation-delay: 0.24s; }
.th-spotlight-card:hover {
  transform: translateY(-3px);
}
.th-spotlight-card.amber {
  background: linear-gradient(135deg, rgba(245,158,11,.14), rgba(251,191,36,.06));
  border-color: rgba(245,158,11,.28);
}
.th-spotlight-card.blue {
  background: linear-gradient(135deg, rgba(59,130,246,.14), rgba(14,165,233,.06));
  border-color: rgba(59,130,246,.28);
}
.th-spotlight-card.emerald {
  background: linear-gradient(135deg, rgba(16,185,129,.14), rgba(52,211,153,.06));
  border-color: rgba(16,185,129,.28);
}
.th-spot-top {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;
}
.th-spot-tag {
  font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em;
}
.th-spotlight-card.amber .th-spot-tag { color: #d97706; }
.th-spotlight-card.blue .th-spot-tag { color: #2563eb; }
.th-spotlight-card.emerald .th-spot-tag { color: #059669; }
[data-theme="dark"] .th-spotlight-card.amber .th-spot-tag { color: #fbbf24; }
[data-theme="dark"] .th-spotlight-card.blue .th-spot-tag { color: #60a5fa; }
[data-theme="dark"] .th-spotlight-card.emerald .th-spot-tag { color: #34d399; }
.th-spot-title {
  font-size: 13.5px; font-weight: 700; color: var(--sd-ink); margin-bottom: 2px;
}
.th-spot-sub {
  font-size: 11.5px; color: var(--sd-muted);
}
.th-spot-num {
  font-size: 24px; font-weight: 800; margin-top: 6px; color: var(--sd-ink);
}

.th-tabs-nav {
  display: flex; gap: 8px; margin-bottom: 20px;
  background: var(--sd-card);
  padding: 6px; border-radius: 18px;
  border: 1px solid var(--sd-line);
  box-shadow: var(--sd-shadow-soft);
  overflow-x: auto; -webkit-overflow-scrolling: touch;
}
.th-tab-btn {
  flex: 1; min-width: 140px;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 18px; border-radius: 13px; border: none;
  font-family: inherit; font-size: 13px; font-weight: 700;
  cursor: pointer; background: transparent; color: var(--sd-muted);
  transition: all .2s cubic-bezier(.34,1.56,.64,1);
  white-space: nowrap;
}
.th-tab-btn:hover {
  background: var(--sd-card-soft); color: var(--sd-ink);
}
.th-tab-btn.active {
  background: var(--sd-accent-grad);
  color: #ffffff;
  box-shadow: 0 6px 18px rgba(2,132,199,.35);
}

.th-toolbar {
  display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;
}
.th-search-wrap {
  position: relative; flex: 1; min-width: 220px;
}
.th-search-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--sd-faint); pointer-events: none;
}
.th-search-input {
  width: 100%; padding: 11px 14px 11px 40px; border-radius: 14px;
  border: 1px solid var(--sd-input-border);
  background: var(--sd-input-bg); color: var(--sd-ink);
  font-family: inherit; font-size: 13.5px; outline: none;
  transition: all .18s ease;
}
.th-search-input:focus {
  border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2,132,199,.18);
}
.th-select {
  padding: 11px 36px 11px 14px; border-radius: 14px;
  border: 1px solid var(--sd-input-border);
  background: var(--sd-input-bg); color: var(--sd-ink);
  font-family: inherit; font-size: 13px; font-weight: 600;
  outline: none; cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238c94aa' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center;
  transition: border-color .18s;
}
.th-select:focus {
  border-color: #0284c7;
}

.th-assign-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 22px; padding: 22px 24px;
  box-shadow: var(--sd-shadow-soft);
  margin-bottom: 16px;
  position: relative; overflow: hidden;
  transition: all .24s cubic-bezier(.34,1.56,.64,1);
}
.th-assign-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--sd-shadow-hover);
  border-color: rgba(2,132,199,.32);
}
.th-assign-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
  flex-wrap: wrap; margin-bottom: 12px;
}
.th-assign-title {
  font-size: 17px; font-weight: 800; color: var(--sd-ink); margin-bottom: 6px;
}
.th-assign-badges {
  display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
}
.th-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
}
.th-badge.active {
  background: rgba(16,185,129,.14); color: #059669; border: 1px solid rgba(16,185,129,.3);
}
.th-badge.overdue {
  background: rgba(234,88,12,.14); color: #c2410c; border: 1px solid rgba(234,88,12,.3);
}
.th-badge.soft {
  background: var(--sd-card-soft); color: var(--sd-muted); border: 1px solid var(--sd-line);
}
.th-badge.accent {
  background: rgba(2,132,199,.14); color: #0284c7; border: 1px solid rgba(2,132,199,.3);
}
[data-theme="dark"] .th-badge.active { color: #34d399; }
[data-theme="dark"] .th-badge.overdue { color: #fb923c; }
[data-theme="dark"] .th-badge.accent { color: #38bdf8; }

.th-assign-meta {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  font-size: 12px; color: var(--sd-muted); font-weight: 600; margin-bottom: 14px;
}
.th-assign-meta-item {
  display: inline-flex; align-items: center; gap: 6px;
}
.th-assign-desc {
  font-size: 13px; color: var(--sd-muted); line-height: 1.6; margin-bottom: 16px;
}

.th-progress-strip {
  background: var(--sd-card-soft); border-radius: 14px; padding: 12px 16px;
  margin-bottom: 16px; border: 1px solid var(--sd-line-subtle);
}
.th-prog-info {
  display: flex; justify-content: space-between; font-size: 12px; font-weight: 700;
  margin-bottom: 6px;
}
.th-prog-track {
  height: 8px; border-radius: 999px; background: var(--sd-bar-bg); overflow: hidden;
  position: relative;
}
.th-prog-fill {
  height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, #0284c7 0%, #0ea5e9 50%, #10b981 100%);
  transition: width .8s cubic-bezier(.4,0,.2,1);
  position: relative;
}
.th-prog-fill::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);
  animation: sdShineSweep 3s infinite;
}

.th-assign-actions {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  flex-wrap: wrap;
}
.th-btn-group {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.th-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 16px; border-radius: 12px; border: none;
  font-family: inherit; font-size: 12.5px; font-weight: 700;
  cursor: pointer; transition: all .18s cubic-bezier(.34,1.56,.64,1);
}
.th-btn.primary {
  background: var(--sd-accent-grad); color: #fff;
  box-shadow: 0 4px 14px rgba(2,132,199,.32);
}
.th-btn.primary:hover {
  transform: translateY(-2px); box-shadow: 0 8px 20px rgba(2,132,199,.45);
}
.th-btn.outline {
  background: var(--sd-pill-bg); color: var(--sd-ink);
  border: 1px solid var(--sd-line);
}
.th-btn.outline:hover {
  border-color: #0284c7; color: #0284c7; background: var(--sd-card-soft);
}
.th-btn.danger {
  background: rgba(220,38,38,.08); color: #dc2626;
  border: 1px solid rgba(220,38,38,.2);
}
.th-btn.danger:hover {
  background: rgba(220,38,38,.16);
}

.th-qc-container {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 26px; padding: 26px 28px;
  box-shadow: var(--sd-shadow);
  position: relative; overflow: hidden;
  margin-bottom: 24px;
}
.th-qc-header {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  flex-wrap: wrap; margin-bottom: 18px; padding-bottom: 16px;
  border-bottom: 1px solid var(--sd-line);
}
.th-qc-title {
  font-size: 18px; font-weight: 800; color: var(--sd-ink); display: flex; align-items: center; gap: 8px;
}

.th-qc-stepper {
  display: flex; gap: 6px; overflow-x: auto; padding: 4px 2px; margin-bottom: 20px;
  -webkit-overflow-scrolling: touch;
}
.th-q-step-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 12px; border: 1px solid var(--sd-line);
  background: var(--sd-card-soft); color: var(--sd-muted);
  font-family: inherit; font-size: 12px; font-weight: 700;
  cursor: pointer; white-space: nowrap; transition: all .2s;
}
.th-q-step-btn:hover {
  border-color: #0284c7; color: var(--sd-ink);
}
.th-q-step-btn.active {
  background: var(--sd-accent-grad); color: #fff; border-color: transparent;
  box-shadow: 0 4px 14px rgba(2,132,199,.35);
}

.th-question-stage {
  min-height: 260px;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 20px; padding: 24px;
  position: relative; overflow: hidden;
  box-shadow: inset 0 2px 6px rgba(0,0,0,.02);
}
.th-qs-top {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 16px; flex-wrap: wrap;
}
.th-qs-type-chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 800; padding: 5px 12px; border-radius: 999px;
}
.th-qs-prompt {
  font-size: 16.5px; font-weight: 700; color: var(--sd-ink); line-height: 1.6;
  margin-bottom: 18px;
}

.th-mcq-grid {
  display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 16px;
}
.th-mcq-opt {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  border-radius: 14px; border: 1.5px solid var(--sd-line);
  background: var(--sd-card); color: var(--sd-ink); font-size: 13.5px; font-weight: 600;
  transition: all .18s;
}
.th-mcq-opt.correct {
  border-color: #10b981; background: rgba(16,185,129,.08); color: #065f46;
}
[data-theme="dark"] .th-mcq-opt.correct {
  background: rgba(16,185,129,.18); color: #6ee7b7;
}
.th-mcq-badge {
  width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center;
  font-size: 12px; font-weight: 800; background: var(--sd-bar-bg); color: var(--sd-ink);
}
.th-mcq-opt.correct .th-mcq-badge {
  background: #10b981; color: #fff;
}

.th-q-extra-box {
  background: rgba(2,132,199,.06); border-left: 4px solid #0284c7;
  border-radius: 0 14px 14px 0; padding: 12px 16px; margin-top: 14px;
}
.th-q-extra-title {
  font-size: 11.5px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: .04em;
  margin-bottom: 4px; display: flex; align-items: center; gap: 6px;
}
[data-theme="dark"] .th-q-extra-title { color: #38bdf8; }
.th-q-extra-text {
  font-size: 12.5px; color: var(--sd-muted); line-height: 1.5;
}

.th-qc-controls {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-top: 20px; flex-wrap: wrap;
}

.th-sub-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 22px; padding: 22px;
  margin-bottom: 16px; box-shadow: var(--sd-shadow-soft);
  transition: all .2s;
}
.th-sub-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
  margin-bottom: 16px; flex-wrap: wrap;
}
.th-student-info {
  display: flex; align-items: center; gap: 12px;
}
.th-avatar {
  width: 44px; height: 44px; border-radius: 14px;
  background: var(--sd-accent-grad); color: #fff;
  display: grid; place-items: center; font-size: 14px; font-weight: 800;
  box-shadow: 0 4px 12px rgba(2,132,199,.3);
  box-shadow: 0 4px 12px rgba(2,132,199,.3);
}
.th-student-name {
  font-size: 15px; font-weight: 800; color: var(--sd-ink);
}
.th-student-meta {
  font-size: 12px; color: var(--sd-muted);
}
.th-response-box {
  background: var(--sd-card-soft); border: 1px solid var(--sd-line);
  border-radius: 14px; padding: 14px 16px; font-size: 13.5px; color: var(--sd-ink);
  line-height: 1.65; white-space: pre-wrap; margin-bottom: 16px;
}

.th-analytics-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px;
}
.th-card-panel {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 22px; padding: 22px;
  box-shadow: var(--sd-shadow-soft);
}
.th-bar-chart {
  display: flex; align-items: flex-end; gap: 10px; height: 160px; margin-top: 16px;
}
.th-bar-col {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.th-bar-track {
  width: 100%; height: 100%; display: flex; align-items: flex-end;
  background: var(--sd-bar-bg); border-radius: 10px 10px 0 0; overflow: hidden;
}
.th-bar-fill {
  width: 100%; border-radius: 10px 10px 0 0;
  background: linear-gradient(180deg, #0284c7 0%, #0ea5e9 100%);
  transition: height .8s cubic-bezier(.4,0,.2,1);
}
.th-bar-lbl {
  font-size: 11px; font-weight: 700; color: var(--sd-muted); text-align: center;
  max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.th-table-wrap {
  overflow-x: auto; -webkit-overflow-scrolling: touch;
}
.th-table {
  width: 100%; border-collapse: collapse; text-align: left;
}
.th-table th {
  padding: 12px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .06em; color: var(--sd-muted); border-bottom: 1px solid var(--sd-line);
}
.th-table td {
  padding: 14px; font-size: 13px; color: var(--sd-ink);
  border-bottom: 1px solid var(--sd-line-subtle);
}
.th-table tr:hover td {
  background: var(--sd-card-soft);
}

.th-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(7,18,53,.55); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; padding: 18px;
}
.th-modal-card {
  width: 100%; max-width: 680px; max-height: 88vh; overflow-y: auto;
  background: var(--sd-overlay); border: 1px solid var(--sd-line);
  border-radius: 26px; padding: 28px; box-shadow: var(--sd-shadow);
  animation: cardIn .32s cubic-bezier(.34,1.56,.64,1) both;
}
.th-form-group {
  margin-bottom: 16px;
}
.th-form-label {
  display: block; font-size: 12px; font-weight: 800; color: var(--sd-muted);
  text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px;
}
.th-input, .th-textarea {
  width: 100%; padding: 11px 14px; border-radius: 12px;
  border: 1px solid var(--sd-input-border);
  background: var(--sd-input-bg); color: var(--sd-ink);
  font-family: inherit; font-size: 13.5px; outline: none;
  transition: border-color .18s, box-shadow .18s; box-sizing: border-box;
}
.th-input:focus, .th-textarea:focus {
  border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2,132,199,.18);
}
.th-textarea {
  resize: vertical; min-height: 80px;
}
.th-form-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(14px) scale(.985); }
  to { opacity: 1; transform: none; }
}

@media (max-width: 900px) {
  .th-hero-main { flex-direction: column-reverse; align-items: flex-start; }
  .th-hero-robot-stage { width: 100%; justify-content: flex-start; margin-bottom: 8px; }
}
@media (max-width: 600px) {
  .th-hero-robot-bubble { display: none; }
  .th-hero-robot-wrap { width: 88px; height: 88px; border-radius: 22px; }
  .th-hero-robot { width: 70px; height: 70px; }
}
@media (max-width: 1024px) {
  .th-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .th-spotlights { grid-template-columns: repeat(2, 1fr); }
  .th-analytics-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .th-root { padding: 16px 14px 60px; }
  .th-hero { padding: 22px 20px; border-radius: 20px; }
  .th-hero-title { font-size: 22px; }
  .th-hero-stat-row { gap: 8px; }
  .th-hero-pill { padding: 8px 12px; }
  .th-stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .th-spotlights { grid-template-columns: 1fr; }
  .th-form-grid { grid-template-columns: 1fr; }
  .th-qc-container { padding: 18px 16px; border-radius: 20px; }
  .th-question-stage { padding: 18px 16px; min-height: 220px; }
  .th-assign-actions { flex-direction: column; align-items: stretch; }
  .th-btn-group { width: 100%; justify-content: flex-start; }
}
@media (max-width: 480px) {
  .th-stats-grid { grid-template-columns: 1fr; }
  .th-tab-btn { min-width: 120px; padding: 9px 12px; font-size: 12px; }
  .th-hero-actions { flex-direction: column; align-items: stretch; }
  .th-hero-btn { justify-content: center; }
}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function TeacherHomeworkPage() {
  const { user } = useAuth();
  const { isDark: dark } = useTheme();
  const { addNotification } = useNotificationStore();

  const [tab, setTab] = useState<"overview" | "submissions" | "questions" | "analytics">("overview");

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(DEFAULT_ASSIGNMENTS[0]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");

  const [activeSubQuestionIdx, setActiveSubQuestionIdx] = useState(0);
  const [subSlideDirection, setSubSlideDirection] = useState<1 | -1>(1);
  const [gradingMode, setGradingMode] = useState<"question-by-question" | "full-response">("question-by-question");
  const [scoreInputs, setScoreInputs] = useState<Record<number, string>>({});
  const [feedbackInputs, setFeedbackInputs] = useState<Record<number, string>>({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    instructions: string;
    courseId: string;
    dueDate: string;
    maxScore: number;
    submissionType: "text" | "file" | "both";
    questions: QuestionItem[];
  }>({
    title: "",
    description: "",
    instructions: "",
    courseId: "",
    dueDate: "",
    maxScore: 30,
    submissionType: "both",
    questions: [
      {
        id: "q1",
        type: "mcq" as QuestionType,
        marks: 5,
        question: "",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctOption: 0,
        hint: "",
      },
    ],
  });

  const { data: serverCourses = [] } = useQuery<Course[]>({ queryKey: ["/api/teacher/courses"] });
  const { data: serverAssignments = [] } = useQuery<Assignment[]>({ queryKey: ["/api/teacher/assignments"] });

  const assignments: Assignment[] = useMemo(() => {
    if (serverAssignments.length > 0) {
      return serverAssignments.map((sa, i) => ({
        ...sa,
        questions: sa.questions && sa.questions.length > 0
          ? sa.questions
          : DEFAULT_ASSIGNMENTS[i % DEFAULT_ASSIGNMENTS.length].questions,
      }));
    }
    return DEFAULT_ASSIGNMENTS;
  }, [serverAssignments]);

  const courses: Course[] = useMemo(() => {
    if (serverCourses.length > 0) return serverCourses;
    return [
      { id: 1, title: "Grade 10 Biology", enrollmentCount: 28, subject: "Biology", color: "#10b981" },
      { id: 2, title: "Grade 11 Physics", enrollmentCount: 25, subject: "Physics", color: "#f59e0b" },
      { id: 3, title: "Grade 12 Advanced Mathematics", enrollmentCount: 22, subject: "Mathematics", color: "#0284c7" },
      { id: 4, title: "Grade 12 Computer Science", enrollmentCount: 24, subject: "Computer Science", color: "#0ea5e9" },
    ];
  }, [serverCourses]);

  const activeAssignment = selectedAssignment || assignments[0] || DEFAULT_ASSIGNMENTS[0];
  const questionsList = activeAssignment?.questions || [];
  const currentQuestion = questionsList[activeQuestionIdx] || questionsList[0];

  const { data: serverSubmissions = [] } = useQuery<Submission[]>({
    queryKey: ["/api/assignments", activeAssignment?.id, "submissions"],
    enabled: !!activeAssignment,
  });

  const submissions: Submission[] = useMemo(() => {
    if (serverSubmissions.length > 0) return serverSubmissions;
    return DEFAULT_SUBMISSIONS[activeAssignment?.id] || DEFAULT_SUBMISSIONS[101] || [];
  }, [serverSubmissions, activeAssignment]);

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("POST", "/api/assignments", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
      setShowCreateModal(false);
      addNotification(`Assignment created: "${data.title}" 🎉`);
      setForm({
        title: "",
        description: "",
        instructions: "",
        courseId: "",
        dueDate: "",
        maxScore: 30,
        submissionType: "both",
        questions: [
          {
            id: "q1",
            type: "mcq",
            marks: 5,
            question: "",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctOption: 0,
            hint: "",
          },
        ],
      });
    },
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ id, score, feedback }: { id: number; score: number; feedback: string }) => {
      const res = await apiRequest("PUT", `/api/submissions/${id}/grade`, { score, feedback });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments", activeAssignment?.id, "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
      addNotification("Submission graded successfully! ✨");
    },
  });

  const totalCount = assignments.length;
  const activeCount = assignments.filter(a => new Date(a.dueDate) > new Date()).length;
  const totalSubs = assignments.reduce((s, a) => s + (a.submissionCount || 0), 0);
  const avgCompletion = totalCount > 0
    ? Math.round(assignments.reduce((s, a) => s + (a.submissionCount / Math.max(a.totalStudents, 1)), 0) / totalCount * 100)
    : 0;
  const pendingGradingCount = submissions.filter(s => !s.gradedAt).length;

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const matchSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.courseName.toLowerCase().includes(search.toLowerCase());
      const isOverdue = new Date(a.dueDate) < new Date();
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && !isOverdue) ||
        (filterStatus === "overdue" && isOverdue);
      const matchCourse = filterCourse === "all" || a.courseId.toString() === filterCourse;
      return matchSearch && matchStatus && matchCourse;
    });
  }, [assignments, search, filterStatus, filterCourse]);

  const handleNextQuestion = () => {
    if (activeQuestionIdx < questionsList.length - 1) {
      setSlideDirection(1);
      setActiveQuestionIdx(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (activeQuestionIdx > 0) {
      setSlideDirection(-1);
      setActiveQuestionIdx(prev => prev - 1);
    }
  };

  const handleJumpQuestion = (idx: number) => {
    setSlideDirection(idx > activeQuestionIdx ? 1 : -1);
    setActiveQuestionIdx(idx);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tab === "questions" && !showCreateModal) {
        if (e.key === "ArrowRight") handleNextQuestion();
        if (e.key === "ArrowLeft") handlePrevQuestion();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab, activeQuestionIdx, questionsList.length, showCreateModal]);

  const addQuestionField = () => {
    setForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q${prev.questions.length + 1}`,
          type: "short" as QuestionType,
          marks: 5,
          question: "",
          hint: "",
        },
      ],
    }));
  };

  const removeQuestionField = (idx: number) => {
    if (form.questions.length <= 1) return;
    setForm(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  const questionSlideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 320, damping: 28 },
        opacity: { duration: 0.24 },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 90 : -90,
      opacity: 0,
      scale: 0.96,
      transition: {
        x: { type: "spring", stiffness: 320, damping: 28 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  const donutSegments = courses.slice(0, 4).map((c, i) => ({
    label: c.title.substring(0, 14),
    pct: [35, 28, 22, 15][i] ?? 12,
    color: ["#0284c7", "#10b981", "#f59e0b", "#0d9488"][i] ?? "#0ea5e9",
  }));

  return (
    <>
      <style>{CSS_STYLES}</style>
      <div className={cn("th-root", dark && "dark")}>

        <span className="sd-bg-spark s1" />
        <span className="sd-bg-spark s2" />
        <span className="sd-bg-spark s3" />
        <div className="sd-bg-ribbon" />

        <div className="th-shell">

          {/* ═════════════════════════════════════════════════════════════════════
              HERO BANNER
          ═════════════════════════════════════════════════════════════════════ */}
          <div className="th-hero">
            <div className="th-hero-main">
              <div className="th-hero-content">
                <div className="th-hero-chip">
                  <span className="th-live-dot" />
                  Teacher Academic Hub • GradeUp
                </div>
                <h1 className="th-hero-title">Homework & Question Studio 📝</h1>
                <p className="th-hero-sub">
                  Craft interactive homework with questions, review student responses with step-by-step
                  question transitions, and monitor class mastery in real time.
                </p>

                <div className="th-hero-actions">
                  <button className="th-hero-btn primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} /> Create Assignment
                  </button>
                  <button
                    className="th-hero-btn secondary"
                    onClick={() => {
                      setTab("questions");
                      setActiveQuestionIdx(0);
                    }}
                  >
                    <Sparkles size={16} /> Question Explorer & Transitions
                  </button>
                </div>
              </div>

              {/* Robot Mascot Stage on the Banner */}
              <div className="th-hero-robot-stage">
                <div className="th-hero-robot-bubble">
                  <div className="th-hero-robot-bubble-badge">
                    <Sparkles size={12} /> AI Homework Copilot
                  </div>
                  <div className="th-hero-robot-bubble-text">
                    Ready to generate questions, rubric hints & evaluate answers in real time!
                  </div>
                </div>
                <div className="th-hero-robot-wrap">
                  <img src={roboImg} alt="GradeUp AI Robot" className="th-hero-robot" />
                </div>
              </div>
            </div>

            <div className="th-hero-stat-row">
              <div className="th-hero-pill">
                <BookOpen size={18} opacity={0.9} />
                <div>
                  <div className="th-hero-pill-num">{totalCount}</div>
                  <div className="th-hero-pill-lbl">Homeworks</div>
                </div>
              </div>
              <div className="th-hero-pill">
                <Clock size={18} opacity={0.9} />
                <div>
                  <div className="th-hero-pill-num">{activeCount}</div>
                  <div className="th-hero-pill-lbl">Active Now</div>
                </div>
              </div>
              <div className="th-hero-pill">
                <Send size={18} opacity={0.9} />
                <div>
                  <div className="th-hero-pill-num">{totalSubs}</div>
                  <div className="th-hero-pill-lbl">Submissions</div>
                </div>
              </div>
              <div className="th-hero-pill">
                <Award size={18} opacity={0.9} />
                <div>
                  <div className="th-hero-pill-num">{avgCompletion}%</div>
                  <div className="th-hero-pill-lbl">Completion Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              4 QUICK STATS CARDS
          ═════════════════════════════════════════════════════════════════════ */}
          <div className="th-stats-grid">
            <div className="th-stat-card">
              <div className="th-stat-top">
                <div className="th-stat-icon" style={{ background: "rgba(14,165,233,.12)", color: "#0ea5e9" }}>
                  <BookOpen size={20} />
                </div>
                <span className="th-stat-badge">Total</span>
              </div>
              <div className="th-stat-value"><AnimatedNumber target={totalCount} /></div>
              <div className="th-stat-label">Total Assignments</div>
              <div className="th-stat-trend" style={{ color: "#0ea5e9" }}>
                <TrendingUp size={13} /> {courses.length} active classes
              </div>
            </div>

            <div className="th-stat-card">
              <div className="th-stat-top">
                <div className="th-stat-icon" style={{ background: "rgba(2,132,199,.12)", color: "#0284c7" }}>
                  <Clock size={20} />
                </div>
                <span className="th-stat-badge">Open</span>
              </div>
              <div className="th-stat-value"><AnimatedNumber target={activeCount} /></div>
              <div className="th-stat-label">Active Deadlines</div>
              <div className="th-stat-trend" style={{ color: "#10b981" }}>
                <CheckCircle2 size={13} /> {totalCount - activeCount} completed
              </div>
            </div>

            <div className="th-stat-card">
              <div className="th-stat-top">
                <div className="th-stat-icon" style={{ background: "rgba(245,158,11,.12)", color: "#f59e0b" }}>
                  <Send size={20} />
                </div>
                <span className="th-stat-badge">Turn-in</span>
              </div>
              <div className="th-stat-value"><AnimatedNumber target={totalSubs} /></div>
              <div className="th-stat-label">Total Submissions</div>
              <div className="th-stat-trend" style={{ color: "#f59e0b" }}>
                <AlertCircle size={13} /> {pendingGradingCount} awaiting review
              </div>
            </div>

            <div className="th-stat-card">
              <div className="th-stat-top">
                <div className="th-stat-icon" style={{ background: "rgba(16,185,129,.12)", color: "#10b981" }}>
                  <BarChart2 size={20} />
                </div>
                <span className="th-stat-badge">Rate</span>
              </div>
              <div className="th-stat-value"><AnimatedNumber target={avgCompletion} suffix="%" /></div>
              <div className="th-stat-label">Average Completion</div>
              <div className="th-stat-trend" style={{ color: "#10b981" }}>
                <TrendingUp size={13} /> Across all subjects
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              SPOTLIGHTS / ALERTS ROW
          ═════════════════════════════════════════════════════════════════════ */}
          <div className="th-spotlights">
            <div className="th-spotlight-card amber">
              <div className="th-spot-top">
                <span className="th-spot-tag">⏰ Deadlines Approaching</span>
                <Clock size={16} />
              </div>
              <div className="th-spot-title">Due in Next 3 Days</div>
              <div className="th-spot-sub">Assignments closing soon for submissions</div>
              <div className="th-spot-num">
                {assignments.filter(a => {
                  const diff = new Date(a.dueDate).getTime() - Date.now();
                  return diff > 0 && diff < 3 * 864e5;
                }).length}
              </div>
            </div>

            <div className="th-spotlight-card blue">
              <div className="th-spot-top">
                <span className="th-spot-tag">📬 Review Required</span>
                <Edit size={16} />
              </div>
              <div className="th-spot-title">Ungraded Submissions</div>
              <div className="th-spot-sub">Students awaiting teacher score and feedback</div>
              <div className="th-spot-num">{pendingGradingCount}</div>
            </div>

            <div className="th-spotlight-card emerald">
              <div className="th-spot-top">
                <span className="th-spot-tag">🏆 Class Champions</span>
                <Award size={16} />
              </div>
              <div className="th-spot-title">100% Submission Rate</div>
              <div className="th-spot-sub">Homeworks with complete class turn-ins</div>
              <div className="th-spot-num">
                {assignments.filter(a => a.submissionCount >= a.totalStudents).length}
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              TABS NAVIGATION
          ═════════════════════════════════════════════════════════════════════ */}
          <div className="th-tabs-nav">
            <button
              className={`th-tab-btn ${tab === "overview" ? "active" : ""}`}
              onClick={() => setTab("overview")}
            >
              <BookOpen size={16} /> All Assignments ({filteredAssignments.length})
            </button>
            <button
              className={`th-tab-btn ${tab === "questions" ? "active" : ""}`}
              onClick={() => setTab("questions")}
            >
              <Target size={16} /> Question Transitions & Explorer
            </button>
            <button
              className={`th-tab-btn ${tab === "submissions" ? "active" : ""}`}
              onClick={() => setTab("submissions")}
            >
              <Send size={16} /> Submissions & Grading ({submissions.length})
            </button>
            <button
              className={`th-tab-btn ${tab === "analytics" ? "active" : ""}`}
              onClick={() => setTab("analytics")}
            >
              <BarChart2 size={16} /> Class Analytics
            </button>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              TAB 1: ALL ASSIGNMENTS OVERVIEW
          ═════════════════════════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <div>
              <div className="th-toolbar">
                <div className="th-search-wrap">
                  <Search size={16} className="th-search-icon" />
                  <input
                    type="text"
                    className="th-search-input"
                    placeholder="Search by assignment title, course, or topic…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <select
                  className="th-select"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Deadlines</option>
                  <option value="active">Active Only</option>
                  <option value="overdue">Overdue / Closed</option>
                </select>

                <select
                  className="th-select"
                  value={filterCourse}
                  onChange={e => setFilterCourse(e.target.value)}
                >
                  <option value="all">All Courses</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id.toString()}>{c.title}</option>
                  ))}
                </select>

                <button className="th-btn primary" onClick={() => setShowCreateModal(true)}>
                  <Plus size={15} /> Create Homework
                </button>
              </div>

              {filteredAssignments.length === 0 ? (
                <div className="th-card-panel" style={{ textAlign: "center", padding: "48px 20px" }}>
                  <HelpCircle size={48} style={{ color: "#0284c7", margin: "0 auto 12px", opacity: 0.8 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>No Assignments Found</h3>
                  <p style={{ fontSize: 13, color: "var(--sd-muted)", marginBottom: 16 }}>
                    {search ? "Try adjusting your search query or filters." : "Create your first homework to get started."}
                  </p>
                  <button className="th-btn primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={14} /> Create New Assignment
                  </button>
                </div>
              ) : (
                filteredAssignments.map((a, idx) => {
                  const dueDate = new Date(a.dueDate);
                  const isOverdue = dueDate < new Date();
                  const compRate = Math.round((a.submissionCount / Math.max(a.totalStudents, 1)) * 100);
                  const qCount = a.questions?.length || 0;

                  return (
                    <motion.div
                      key={a.id}
                      className="th-assign-card"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="th-assign-header">
                        <div>
                          <div className="th-assign-title">{a.title}</div>
                          <div className="th-assign-meta">
                            <span className="th-assign-meta-item">
                              <BookOpen size={14} /> {a.courseName}
                            </span>
                            <span className="th-assign-meta-item">
                              <Clock size={14} /> Due {formatDistanceToNow(dueDate, { addSuffix: true })}
                            </span>
                            <span className="th-assign-meta-item">
                              <Users size={14} /> {a.submissionCount} of {a.totalStudents} submitted
                            </span>
                          </div>
                        </div>

                        <div className="th-assign-badges">
                          <span className={`th-badge ${isOverdue ? "overdue" : "active"}`}>
                            {isOverdue ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
                            {isOverdue ? "Overdue" : "Active"}
                          </span>
                          <span className="th-badge accent">
                            <Target size={11} /> {qCount} Questions
                          </span>
                          <span className="th-badge soft">
                            {a.maxScore} Max Pts
                          </span>
                          <span className="th-badge soft">
                            {a.submissionType.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="th-progress-strip">
                        <div className="th-prog-info">
                          <span>Class Turn-In Rate</span>
                          <span>{compRate}% ({a.submissionCount}/{a.totalStudents})</span>
                        </div>
                        <div className="th-prog-track">
                          <div className="th-prog-fill" style={{ width: `${compRate}%` }} />
                        </div>
                      </div>

                      {a.description && <p className="th-assign-desc">{a.description}</p>}

                      <div className="th-assign-actions">
                        <div className="th-btn-group">
                          <button
                            className="th-btn primary"
                            onClick={() => {
                              setSelectedAssignment(a);
                              setActiveQuestionIdx(0);
                              setTab("questions");
                            }}
                          >
                            <Target size={14} /> Question Explorer ({qCount})
                          </button>
                          <button
                            className="th-btn outline"
                            onClick={() => {
                              setSelectedAssignment(a);
                              setActiveSubQuestionIdx(0);
                              setTab("submissions");
                            }}
                          >
                            <Eye size={14} /> Review Submissions ({a.submissionCount})
                          </button>
                        </div>

                        <div className="th-btn-group">
                          <button className="th-btn outline">
                            <Edit size={13} /> Edit
                          </button>
                          <button className="th-btn danger">
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              TAB 2: QUESTION EXPLORER & QUESTION TRANSITIONS
          ═════════════════════════════════════════════════════════════════════ */}
          {tab === "questions" && (
            <div>
              <div className="th-card-panel" style={{ marginBottom: 18, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <BookOpen size={18} style={{ color: "#0284c7" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--sd-muted)" }}>Active Assignment:</span>
                    <select
                      className="th-select"
                      value={activeAssignment.id}
                      onChange={e => {
                        const found = assignments.find(a => a.id === parseInt(e.target.value));
                        if (found) {
                          setSelectedAssignment(found);
                          setActiveQuestionIdx(0);
                        }
                      }}
                    >
                      {assignments.map(a => (
                        <option key={a.id} value={a.id}>{a.title} ({a.courseName})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="th-badge accent">
                      <Target size={12} /> {questionsList.length} Questions Total
                    </span>
                    <span className="th-badge soft">
                      {activeAssignment.maxScore} Total Points
                    </span>
                  </div>
                </div>
              </div>

              <div className="th-qc-container">
                <div className="th-qc-header">
                  <div className="th-qc-title">
                    <Sparkles size={20} style={{ color: "#0284c7" }} />
                    Question Navigator & Transition Studio
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sd-muted)" }}>
                    Question {activeQuestionIdx + 1} of {questionsList.length}
                  </div>
                </div>

                <div className="th-qc-stepper">
                  {questionsList.map((qItem, qIdx) => {
                    const typeMeta = QUESTION_TYPES[qItem.type] || QUESTION_TYPES.mcq;
                    const IconComp = typeMeta.icon;
                    return (
                      <button
                        key={qItem.id}
                        className={`th-q-step-btn ${activeQuestionIdx === qIdx ? "active" : ""}`}
                        onClick={() => handleJumpQuestion(qIdx)}
                      >
                        <IconComp size={13} />
                        <span>Q{qIdx + 1}: {typeMeta.short}</span>
                        <span style={{ opacity: 0.7, fontSize: 11 }}>({qItem.marks}m)</span>
                      </button>
                    );
                  })}
                </div>

                <div className="th-question-stage">
                  <AnimatePresence mode="wait" custom={slideDirection}>
                    {currentQuestion && (
                      <motion.div
                        key={currentQuestion.id}
                        custom={slideDirection}
                        variants={questionSlideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                      >
                        <div className="th-qs-top">
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              className="th-qs-type-chip"
                              style={{
                                background: QUESTION_TYPES[currentQuestion.type]?.bg || "rgba(2,132,199,.12)",
                                color: QUESTION_TYPES[currentQuestion.type]?.color || "#0284c7",
                              }}
                            >
                              {React.createElement(QUESTION_TYPES[currentQuestion.type]?.icon || Target, { size: 14 })}
                              {QUESTION_TYPES[currentQuestion.type]?.label}
                            </span>
                            <span className="th-badge soft">
                              Question #{activeQuestionIdx + 1}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="th-badge" style={{ background: "rgba(245,158,11,.14)", color: "#d97706", fontWeight: 800 }}>
                              <Award size={12} /> {currentQuestion.marks} Marks
                            </span>
                          </div>
                        </div>

                        <div className="th-qs-prompt">
                          {currentQuestion.question}
                        </div>

                        {currentQuestion.type === "mcq" && currentQuestion.options && (
                          <div className="th-mcq-grid">
                            {currentQuestion.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === currentQuestion.correctOption;
                              const letters = ["A", "B", "C", "D", "E"];
                              return (
                                <div
                                  key={oIdx}
                                  className={`th-mcq-opt ${isCorrect ? "correct" : ""}`}
                                >
                                  <span className="th-mcq-badge">{letters[oIdx] || oIdx + 1}</span>
                                  <span style={{ flex: 1 }}>{opt}</span>
                                  {isCorrect && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "#059669" }}>
                                      <CheckCircle2 size={14} /> Correct Key
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {(currentQuestion.minWords || currentQuestion.maxWords) && (
                          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                            <span className="th-badge soft">
                              Word Requirement: {currentQuestion.minWords || 0} - {currentQuestion.maxWords || "Unlimited"} words
                            </span>
                          </div>
                        )}

                        {currentQuestion.sampleAnswer && (
                          <div className="th-q-extra-box" style={{ borderColor: "#10b981", background: "rgba(16,185,129,.06)" }}>
                            <div className="th-q-extra-title" style={{ color: "#059669" }}>
                              <CheckCheck size={14} /> Sample Benchmark Answer
                            </div>
                            <div className="th-q-extra-text">
                              {currentQuestion.sampleAnswer}
                            </div>
                          </div>
                        )}

                        {currentQuestion.hint && (
                          <div className="th-q-extra-box">
                            <div className="th-q-extra-title">
                              <Sparkles size={14} /> Teacher's Diagnostic Hint
                            </div>
                            <div className="th-q-extra-text">
                              {currentQuestion.hint}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="th-qc-controls">
                  <button
                    className="th-btn outline"
                    onClick={handlePrevQuestion}
                    disabled={activeQuestionIdx === 0}
                    style={{ opacity: activeQuestionIdx === 0 ? 0.45 : 1 }}
                  >
                    <ArrowLeft size={14} /> Previous Question
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {questionsList.map((_, dotIdx) => (
                      <span
                        key={dotIdx}
                        onClick={() => handleJumpQuestion(dotIdx)}
                        style={{
                          width: activeQuestionIdx === dotIdx ? 24 : 8,
                          height: 8,
                          borderRadius: 999,
                          background: activeQuestionIdx === dotIdx ? "#0284c7" : "var(--sd-bar-bg)",
                          cursor: "pointer",
                          transition: "all .24s",
                        }}
                      />
                    ))}
                  </div>

                  <button
                    className="th-btn primary"
                    onClick={handleNextQuestion}
                    disabled={activeQuestionIdx === questionsList.length - 1}
                    style={{ opacity: activeQuestionIdx === questionsList.length - 1 ? 0.45 : 1 }}
                  >
                    Next Question <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              TAB 3: REVIEW SUBMISSIONS & GRADING WITH QUESTION TRANSITIONS
          ═════════════════════════════════════════════════════════════════════ */}
          {tab === "submissions" && (
            <div>
              <div className="th-card-panel" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--sd-ink)", marginBottom: 4 }}>
                      {activeAssignment.title}
                    </h2>
                    <p style={{ fontSize: 12.5, color: "var(--sd-muted)" }}>
                      {activeAssignment.courseName} • {submissions.length} Submissions • Max {activeAssignment.maxScore} Points
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="th-badge active">
                      {submissions.filter(s => s.gradedAt).length} of {submissions.length} Graded
                    </span>
                    <button
                      className="th-btn outline"
                      onClick={() => setGradingMode(m => m === "question-by-question" ? "full-response" : "question-by-question")}
                    >
                      <Layers size={14} /> Mode: {gradingMode === "question-by-question" ? "Question-by-Question" : "Full View"}
                    </button>
                  </div>
                </div>

                <div className="th-progress-strip" style={{ marginTop: 14, marginBottom: 0 }}>
                  <div className="th-prog-info">
                    <span>Grading Progress</span>
                    <span>
                      {submissions.length > 0
                        ? `${Math.round((submissions.filter(s => s.gradedAt).length / submissions.length) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="th-prog-track">
                    <div
                      className="th-prog-fill"
                      style={{
                        width: submissions.length > 0
                          ? `${(submissions.filter(s => s.gradedAt).length / submissions.length) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>

              {submissions.length === 0 ? (
                <div className="th-card-panel" style={{ textAlign: "center", padding: "48px 20px" }}>
                  <Send size={44} style={{ color: "#0284c7", margin: "0 auto 12px", opacity: 0.8 }} />
                  <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>No Submissions Yet</h3>
                  <p style={{ fontSize: 13, color: "var(--sd-muted)" }}>
                    Students enrolled in this course have not turned in this assignment yet.
                  </p>
                </div>
              ) : (
                submissions.map((sub, sIdx) => {
                  const isGraded = !!sub.gradedAt;
                  const currentSubQuestion = questionsList[activeSubQuestionIdx];
                  const studentAnswer = sub.questionAnswers?.[currentSubQuestion?.id]?.answer;

                  return (
                    <motion.div
                      key={sub.id}
                      className="th-sub-card"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: sIdx * 0.05 }}
                    >
                      <div className="th-sub-head">
                        <div className="th-student-info">
                          <div className="th-avatar">
                            {sub.studentAvatar || sub.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="th-student-name">{sub.studentName}</div>
                            <div className="th-student-meta">
                              {sub.studentEmail} • Submitted {formatDistanceToNow(new Date(sub.submittedAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {isGraded ? (
                            <>
                              <span
                                className="th-badge"
                                style={{
                                  background: "rgba(16,185,129,.14)",
                                  color: "#059669",
                                  fontWeight: 800,
                                  fontSize: 13,
                                }}
                              >
                                {sub.score} / {activeAssignment.maxScore} pts
                              </span>
                              <span className="th-badge active">
                                <CheckCircle2 size={12} /> Graded
                              </span>
                            </>
                          ) : (
                            <span className="th-badge" style={{ background: "rgba(245,158,11,.14)", color: "#d97706" }}>
                              <Clock size={12} /> Pending Review
                            </span>
                          )}
                        </div>
                      </div>

                      {gradingMode === "question-by-question" && questionsList.length > 0 ? (
                        <div style={{ background: "var(--sd-card-soft)", border: "1px solid var(--sd-line)", borderRadius: 18, padding: 18, marginBottom: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                              {questionsList.map((qItem, qIdx) => (
                                <button
                                  key={qItem.id}
                                  className={`th-q-step-btn ${activeSubQuestionIdx === qIdx ? "active" : ""}`}
                                  style={{ padding: "6px 10px", fontSize: 11.5 }}
                                  onClick={() => {
                                    setSubSlideDirection(qIdx > activeSubQuestionIdx ? 1 : -1);
                                    setActiveSubQuestionIdx(qIdx);
                                  }}
                                >
                                  Q{qIdx + 1}
                                </button>
                              ))}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sd-muted)" }}>
                              Question {activeSubQuestionIdx + 1} of {questionsList.length}
                            </span>
                          </div>

                          <AnimatePresence mode="wait" custom={subSlideDirection}>
                            {currentSubQuestion && (
                              <motion.div
                                key={currentSubQuestion.id}
                                custom={subSlideDirection}
                                variants={questionSlideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                              >
                                <div style={{ fontSize: 12, fontWeight: 800, color: "#0284c7", marginBottom: 4, textTransform: "uppercase" }}>
                                  Prompt (Max {currentSubQuestion.marks} Marks)
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--sd-ink)", marginBottom: 12 }}>
                                  {currentSubQuestion.question}
                                </div>

                                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--sd-muted)", marginBottom: 4, textTransform: "uppercase" }}>
                                  Student Response:
                                </div>
                                <div className="th-response-box">
                                  {studentAnswer || sub.content}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                            <button
                              className="th-btn outline"
                              disabled={activeSubQuestionIdx === 0}
                              onClick={() => {
                                setSubSlideDirection(-1);
                                setActiveSubQuestionIdx(p => Math.max(0, p - 1));
                              }}
                            >
                              <ChevronLeft size={14} /> Previous Q
                            </button>
                            <button
                              className="th-btn outline"
                              disabled={activeSubQuestionIdx === questionsList.length - 1}
                              onClick={() => {
                                setSubSlideDirection(1);
                                setActiveSubQuestionIdx(p => Math.min(questionsList.length - 1, p + 1));
                              }}
                            >
                              Next Q <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--sd-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                            Complete Student Submission:
                          </div>
                          <div className="th-response-box">
                            {sub.content}
                          </div>
                        </div>
                      )}

                      {sub.feedback && (
                        <div className="th-q-extra-box" style={{ marginBottom: 16 }}>
                          <div className="th-q-extra-title">
                            <CheckCheck size={14} /> Teacher's Feedback Recorded
                          </div>
                          <div className="th-q-extra-text">{sub.feedback}</div>
                        </div>
                      )}

                      {!isGraded && (
                        <div style={{ borderTop: "1px solid var(--sd-line)", paddingTop: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--sd-ink)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                            <Edit size={14} style={{ color: "#0284c7" }} /> Grade this Student
                          </div>

                          <div className="th-form-grid" style={{ marginBottom: 12 }}>
                            <div>
                              <label className="th-form-label">Score (out of {activeAssignment.maxScore})</label>
                              <input
                                type="number"
                                min={0}
                                max={activeAssignment.maxScore}
                                className="th-input"
                                placeholder={`0 - ${activeAssignment.maxScore}`}
                                value={scoreInputs[sub.id] ?? ""}
                                onChange={e => setScoreInputs(p => ({ ...p, [sub.id]: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="th-form-label">Feedback & Recommendations</label>
                              <textarea
                                className="th-textarea"
                                style={{ minHeight: 46 }}
                                placeholder="Constructive guidance for the student…"
                                value={feedbackInputs[sub.id] ?? ""}
                                onChange={e => setFeedbackInputs(p => ({ ...p, [sub.id]: e.target.value }))}
                              />
                            </div>
                          </div>

                          <button
                            className="th-btn primary"
                            disabled={!scoreInputs[sub.id] || gradeMutation.isPending}
                            onClick={() =>
                              gradeMutation.mutate({
                                id: sub.id,
                                score: parseInt(scoreInputs[sub.id]),
                                feedback: feedbackInputs[sub.id] || "Well done!",
                              })
                            }
                          >
                            <Star size={14} /> Submit Grade
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              TAB 4: CLASS ANALYTICS & INSIGHTS
          ═════════════════════════════════════════════════════════════════════ */}
          {tab === "analytics" && (
            <div>
              <div className="th-analytics-grid">
                <div className="th-card-panel">
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--sd-ink)", marginBottom: 4 }}>
                    Submission Rates by Homework
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--sd-muted)", marginBottom: 14 }}>
                    Percentage of students who turned in work on schedule
                  </p>

                  <div className="th-bar-chart">
                    {assignments.slice(0, 6).map((a) => {
                      const rate = Math.round((a.submissionCount / Math.max(a.totalStudents, 1)) * 100);
                      return (
                        <div key={a.id} className="th-bar-col">
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sd-muted)" }}>{rate}%</span>
                          <div className="th-bar-track">
                            <div className="th-bar-fill" style={{ height: `${rate}%` }} />
                          </div>
                          <span className="th-bar-lbl" title={a.title}>
                            {a.title.slice(0, 10)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="th-card-panel">
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--sd-ink)", marginBottom: 4 }}>
                    Assignments by Subject
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--sd-muted)", marginBottom: 14 }}>
                    Curriculum allocation across disciplines
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 12 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <DonutChart segments={donutSegments} size={120} stroke={14} />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span style={{ fontSize: 22, fontWeight: 800, color: "var(--sd-ink)", lineHeight: 1 }}>
                          {totalCount}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--sd-muted)", textTransform: "uppercase" }}>Total</span>
                      </div>
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      {donutSegments.map((s, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                            <span style={{ fontWeight: 600, color: "var(--sd-ink)" }}>{s.label}</span>
                          </div>
                          <span style={{ fontWeight: 800, color: "var(--sd-muted)" }}>{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="th-card-panel">
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--sd-ink)", marginBottom: 14 }}>
                  Comprehensive Performance Ledger
                </h3>

                <div className="th-table-wrap">
                  <table className="th-table">
                    <thead>
                      <tr>
                        <th>Homework Title</th>
                        <th>Course</th>
                        <th>Questions</th>
                        <th>Turn-In Rate</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map(a => {
                        const rate = Math.round((a.submissionCount / Math.max(a.totalStudents, 1)) * 100);
                        const isOver = new Date(a.dueDate) < new Date();
                        return (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 700, color: "var(--sd-ink)" }}>{a.title}</td>
                            <td>{a.courseName}</td>
                            <td>
                              <span className="th-badge accent" style={{ padding: "2px 8px", fontSize: 11 }}>
                                {a.questions?.length || 0} Qs
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 80, height: 6, borderRadius: 999, background: "var(--sd-bar-bg)", overflow: "hidden" }}>
                                  <div style={{ width: `${rate}%`, height: "100%", background: "#0284c7" }} />
                                </div>
                                <span style={{ fontSize: 11.5, fontWeight: 700 }}>{rate}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`th-badge ${isOver ? "overdue" : "active"}`}>
                                {isOver ? "Overdue" : "Active"}
                              </span>
                            </td>
                            <td>
                              <button
                                className="th-btn outline"
                                style={{ padding: "4px 10px", fontSize: 11.5 }}
                                onClick={() => {
                                  setSelectedAssignment(a);
                                  setTab("questions");
                                }}
                              >
                                View Qs →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              CREATE ASSIGNMENT MODAL (WITH QUESTION BUILDER)
          ═════════════════════════════════════════════════════════════════════ */}
          {showCreateModal && (
            <div
              className="th-modal-overlay"
              onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}
            >
              <div className="th-modal-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--sd-ink)", display: "flex", alignItems: "center", gap: 8 }}>
                    <Plus size={18} style={{ color: "#0284c7" }} /> Create Homework & Questions
                  </div>
                  <button
                    className="th-btn outline"
                    style={{ padding: 6, borderRadius: "50%" }}
                    onClick={() => setShowCreateModal(false)}
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="th-form-group">
                  <label className="th-form-label">Assignment Title *</label>
                  <input
                    type="text"
                    className="th-input"
                    placeholder="e.g. Cellular Respiration & Photosynthesis Lab"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div className="th-form-grid th-form-group">
                  <div>
                    <label className="th-form-label">Select Course *</label>
                    <select
                      className="th-select"
                      style={{ width: "100%" }}
                      value={form.courseId}
                      onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
                    >
                      <option value="">Choose Course…</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.title} ({c.enrollmentCount} students)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="th-form-label">Due Date & Time *</label>
                    <input
                      type="datetime-local"
                      className="th-input"
                      value={form.dueDate}
                      onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="th-form-grid th-form-group">
                  <div>
                    <label className="th-form-label">Max Score (Points)</label>
                    <input
                      type="number"
                      className="th-input"
                      value={form.maxScore}
                      onChange={e => setForm(p => ({ ...p, maxScore: parseInt(e.target.value) || 30 }))}
                    />
                  </div>
                  <div>
                    <label className="th-form-label">Submission Mode</label>
                    <select
                      className="th-select"
                      style={{ width: "100%" }}
                      value={form.submissionType}
                      onChange={e => setForm(p => ({ ...p, submissionType: e.target.value as any }))}
                    >
                      <option value="both">Text & File Uploads</option>
                      <option value="text">Text Only</option>
                      <option value="file">File / Diagram Upload Only</option>
                    </select>
                  </div>
                </div>

                <div className="th-form-group">
                  <label className="th-form-label">Objective & Summary</label>
                  <textarea
                    className="th-textarea"
                    placeholder="Short description for students…"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <div style={{ marginTop: 22, borderTop: "1px solid var(--sd-line)", paddingTop: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--sd-ink)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Target size={16} style={{ color: "#0284c7" }} /> Questions ({form.questions.length})
                    </div>
                    <button className="th-btn outline" type="button" onClick={addQuestionField}>
                      <Plus size={13} /> Add Question
                    </button>
                  </div>

                  {form.questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      style={{
                        background: "var(--sd-card-soft)",
                        border: "1px solid var(--sd-line)",
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#0284c7" }}>Question #{qIdx + 1}</span>
                        {form.questions.length > 1 && (
                          <button
                            type="button"
                            className="th-btn danger"
                            style={{ padding: "3px 8px", fontSize: 11 }}
                            onClick={() => removeQuestionField(qIdx)}
                          >
                            <Trash2 size={11} /> Remove
                          </button>
                        )}
                      </div>

                      <div className="th-form-grid" style={{ marginBottom: 8 }}>
                        <div>
                          <label className="th-form-label">Question Type</label>
                          <select
                            className="th-select"
                            style={{ width: "100%" }}
                            value={q.type}
                            onChange={e => {
                              const newType = e.target.value as QuestionType;
                              setForm(p => {
                                const nextQs = [...p.questions];
                                nextQs[qIdx] = { ...nextQs[qIdx], type: newType };
                                return { ...p, questions: nextQs };
                              });
                            }}
                          >
                            <option value="mcq">Multiple Choice (MCQ)</option>
                            <option value="short">Short Answer (2 Marks)</option>
                            <option value="medium">Medium Answer (5 Marks)</option>
                            <option value="long">Essay (10+ Marks)</option>
                            <option value="speech">Voice Recording Answer</option>
                            <option value="image">Diagram / Image Upload</option>
                            <option value="document">Document Upload</option>
                          </select>
                        </div>
                        <div>
                          <label className="th-form-label">Marks</label>
                          <input
                            type="number"
                            className="th-input"
                            value={q.marks}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 1;
                              setForm(p => {
                                const nextQs = [...p.questions];
                                nextQs[qIdx] = { ...nextQs[qIdx], marks: val };
                                return { ...p, questions: nextQs };
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label className="th-form-label">Question Text *</label>
                        <input
                          type="text"
                          className="th-input"
                          placeholder="e.g. Explain how the cell membrane maintains homeostasis."
                          value={q.question}
                          onChange={e => {
                            const val = e.target.value;
                            setForm(p => {
                              const nextQs = [...p.questions];
                              nextQs[qIdx] = { ...nextQs[qIdx], question: val };
                              return { ...p, questions: nextQs };
                            });
                          }}
                        />
                      </div>

                      {q.type === "mcq" && (
                        <div style={{ marginBottom: 8 }}>
                          <label className="th-form-label">MCQ Options (Comma Separated)</label>
                          <input
                            type="text"
                            className="th-input"
                            placeholder="Option A, Option B, Option C, Option D"
                            value={q.options?.join(", ") || ""}
                            onChange={e => {
                              const opts = e.target.value.split(",").map(s => s.trim());
                              setForm(p => {
                                const nextQs = [...p.questions];
                                nextQs[qIdx] = { ...nextQs[qIdx], options: opts };
                                return { ...p, questions: nextQs };
                              });
                            }}
                          />
                        </div>
                      )}

                      <div>
                        <label className="th-form-label">Diagnostic Hint</label>
                        <input
                          type="text"
                          className="th-input"
                          placeholder="Optional guidance for struggling students…"
                          value={q.hint || ""}
                          onChange={e => {
                            const val = e.target.value;
                            setForm(p => {
                              const nextQs = [...p.questions];
                              nextQs[qIdx] = { ...nextQs[qIdx], hint: val };
                              return { ...p, questions: nextQs };
                            });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                  <button className="th-btn outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="th-btn primary"
                    disabled={!form.title.trim() || !form.courseId || !form.dueDate || createMutation.isPending}
                    onClick={() => createMutation.mutate(form)}
                  >
                    <Plus size={15} />
                    {createMutation.isPending ? "Creating…" : "Publish Assignment"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}