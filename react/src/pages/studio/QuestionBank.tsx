import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAuth } from "../../hooks/use-auth";
import Navigation from "../../components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  mathsQuestionBankDemo,
  scienceQuestionBankDemo,
  socialQuestionBankDemo,
} from "../../lib/demo-question-bank-data";
import {
  ArrowLeft,
  Download,
  Eye,
  Search,
  X,
  Printer,
  Bookmark,
  ArrowUp,
  Sparkles,
  PieChart,
  Zap,
  Activity,
  AlertTriangle,
  ChevronDown,
  GraduationCap,
  BookOpen,
  List,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  Filter,
} from "lucide-react";
import studyRoboImg from "../../assets/dashboard/study-robo.png";
import roboImg from "../../assets/robo.png";
import tamilSubject from "../../assets/dashboard/subject-tamil.png";
import englishSubject from "../../assets/dashboard/subject-english.png";
import scienceSubject from "../../assets/dashboard/subject-science.png";
import socialSubject from "../../assets/dashboard/subject-social.png";
import mathsSubject from "../../assets/dashboard/subject-maths.png";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// API Response Types
interface Question {
  question_id: string;
  question: string;
  marks: number;
  type: string;
  options: string[];
  correct_answer: string;
  difficulty: string;
  bloom_level: string;
  topic: string;
  unit_number: number;
  section_title?: string;
  question_type_refined: string;
  estimated_time_minutes: number;
}

interface QuestionBankResponse {
  status: boolean;
  data: {
    documentId: string;
    examName: string;
    year: string;
    board: string;
    classNumber: string;
    subject: string;
    subjectGroupKey: string;
    unitName: string;
    totalQuestions: number;
    difficultyDistribution: {
      easy: number;
      medium: number;
      hard: number;
    };
    questions: Question[];
  };
}

// Demo fallback data
const DEMO_SCIENCE_QUESTION_BANK: QuestionBankResponse["data"] = scienceQuestionBankDemo;
const DEMO_MATHS_QUESTION_BANK: QuestionBankResponse["data"] = mathsQuestionBankDemo;
const DEMO_SOCIAL_QUESTION_BANK: QuestionBankResponse["data"] = socialQuestionBankDemo;
const DEMO_QUESTION_BANKS: QuestionBankResponse["data"][] = [
  DEMO_SCIENCE_QUESTION_BANK,
  DEMO_MATHS_QUESTION_BANK,
  DEMO_SOCIAL_QUESTION_BANK,
];

const findDemoQuestionBank = (
  subject: string,
  subjectGroupKey: string,
): QuestionBankResponse["data"] | null => {
  const searchText = `${subject} ${subjectGroupKey}`.toLowerCase();
  if (!searchText.trim()) return DEMO_SCIENCE_QUESTION_BANK;
  const filters = [subject, subjectGroupKey]
    .map((value) => value.toLowerCase().trim())
    .filter(Boolean);
  const exactMatch = DEMO_QUESTION_BANKS.find((bank) => {
    const bankSearchText = `${bank.subject} ${bank.subjectGroupKey}`.toLowerCase();
    return filters.some((filter) => bankSearchText.includes(filter));
  });
  if (exactMatch) return exactMatch;

  if (searchText.includes("math")) return DEMO_MATHS_QUESTION_BANK;
  if (searchText.includes("social") || searchText.includes("sst")) return DEMO_SOCIAL_QUESTION_BANK;
  if (searchText.includes("science")) return DEMO_SCIENCE_QUESTION_BANK;

  return null;
};

// ── COLOR THEMES MATCHING STUDENT DASHBOARD EXPLORE & PLAY ──
interface CardTheme {
  gradient: string;
  accent: string;
  badgeBg: string;
  badgeColor: string;
  btnGrad: string;
  btnShadow: string;
  art: string;
}

const CARD_THEMES: Record<string, CardTheme> = {
  science: {
    gradient: "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
    accent: "#10b981",
    badgeBg: "rgba(16,185,129,.14)",
    badgeColor: "#059669",
    btnGrad: "linear-gradient(135deg, #10b981, #059669)",
    btnShadow: "0 8px 18px rgba(16,185,129,.28)",
    art: scienceSubject,
  },
  math: {
    gradient: "linear-gradient(135deg, #ff9c1a 0%, #ff6c00 100%)",
    accent: "#ff9c1a",
    badgeBg: "rgba(255,156,26,.14)",
    badgeColor: "#d97706",
    btnGrad: "linear-gradient(135deg, #ff9c1a, #ea580c)",
    btnShadow: "0 8px 18px rgba(255,156,26,.28)",
    art: mathsSubject,
  },
  social: {
    gradient: "linear-gradient(135deg, #00b9b4 0%, #00a7e8 100%)",
    accent: "#00a7e8",
    badgeBg: "rgba(0,185,180,.14)",
    badgeColor: "#0284c7",
    btnGrad: "linear-gradient(135deg, #00b9b4, #0284c7)",
    btnShadow: "0 8px 18px rgba(0,185,180,.28)",
    art: socialSubject,
  },
  english: {
    gradient: "linear-gradient(135deg, #ff5f99 0%, #ff9f54 100%)",
    accent: "#ff5f99",
    badgeBg: "rgba(255,95,153,.14)",
    badgeColor: "#e11d48",
    btnGrad: "linear-gradient(135deg, #ff5f99, #f43f5e)",
    btnShadow: "0 8px 18px rgba(255,95,153,.28)",
    art: englishSubject,
  },
  tamil: {
    gradient: "linear-gradient(135deg, #83e76d 0%, #27b86a 100%)",
    accent: "#27b86a",
    badgeBg: "rgba(39,184,106,.14)",
    badgeColor: "#15803d",
    btnGrad: "linear-gradient(135deg, #83e76d, #27b86a)",
    btnShadow: "0 8px 18px rgba(39,184,106,.28)",
    art: tamilSubject,
  },
};

const PALETTE_FALLBACKS: CardTheme[] = [
  {
    gradient: "linear-gradient(135deg, #ff5f99 0%, #ff9f54 100%)",
    accent: "#ff5f99",
    badgeBg: "rgba(255,95,153,.14)",
    badgeColor: "#e11d48",
    btnGrad: "linear-gradient(135deg, #ff5f99, #ff7b54)",
    btnShadow: "0 8px 18px rgba(255,95,153,.25)",
    art: englishSubject,
  },
  {
    gradient: "linear-gradient(135deg, #00b9b4 0%, #00a7e8 100%)",
    accent: "#00a7e8",
    badgeBg: "rgba(0,185,180,.14)",
    badgeColor: "#0284c7",
    btnGrad: "linear-gradient(135deg, #00b9b4, #0284c7)",
    btnShadow: "0 8px 18px rgba(0,185,180,.25)",
    art: socialSubject,
  },
  {
    gradient: "linear-gradient(135deg, #ff9c1a 0%, #ff6c00 100%)",
    accent: "#ff9c1a",
    badgeBg: "rgba(255,156,26,.14)",
    badgeColor: "#d97706",
    btnGrad: "linear-gradient(135deg, #ff9c1a, #ea580c)",
    btnShadow: "0 8px 18px rgba(255,156,26,.25)",
    art: mathsSubject,
  },
  {
    gradient: "linear-gradient(135deg, #83e76d 0%, #27b86a 100%)",
    accent: "#27b86a",
    badgeBg: "rgba(39,184,106,.14)",
    badgeColor: "#15803d",
    btnGrad: "linear-gradient(135deg, #83e76d, #27b86a)",
    btnShadow: "0 8px 18px rgba(39,184,106,.25)",
    art: tamilSubject,
  },
  {
    gradient: "linear-gradient(135deg, #ffcf5a 0%, #ff7b54 100%)",
    accent: "#ff7b54",
    badgeBg: "rgba(255,123,84,.14)",
    badgeColor: "#c2410c",
    btnGrad: "linear-gradient(135deg, #ffcf5a, #ff7b54)",
    btnShadow: "0 8px 18px rgba(255,123,84,.25)",
    art: mathsSubject,
  },
];

function getCardTheme(subject: string, index: number): CardTheme {
  const s = (subject || "").toLowerCase();
  if (s.includes("sci") || s.includes("phy") || s.includes("chem") || s.includes("bio")) return CARD_THEMES.science;
  if (s.includes("math")) return CARD_THEMES.math;
  if (s.includes("soc") || s.includes("hist") || s.includes("geo")) return CARD_THEMES.social;
  if (s.includes("eng")) return CARD_THEMES.english;
  if (s.includes("tam")) return CARD_THEMES.tamil;
  return PALETTE_FALLBACKS[index % PALETTE_FALLBACKS.length];
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ── ROOT MATCHING STUDENT DASHBOARD DESIGN SYSTEM ── */
.qb {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: #071235;
  background: radial-gradient(circle at 14% 9%,rgba(39,184,106,.10),transparent 28%),
              radial-gradient(circle at 88% 14%,rgba(255,171,64,.14),transparent 26%),
              radial-gradient(circle at 50% 80%,rgba(0,185,180,.08),transparent 30%),
              linear-gradient(180deg,#fbfcff,#f4f7fc);
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.dark .qb, [data-theme="dark"] .qb {
  color: #f6f7ff;
  background: radial-gradient(circle at 14% 9%,rgba(39,184,106,.15),transparent 28%),
              radial-gradient(circle at 88% 14%,rgba(255,171,64,.12),transparent 26%),
              linear-gradient(180deg,#080d1f,#10172d);
}

.qb ::-webkit-scrollbar { width: 5px; height: 5px; }
.qb ::-webkit-scrollbar-thumb { background: rgba(39,184,106,.3); border-radius: 99px; }

/* Background decorative sparks */
.qb-bg-spark {
  position: absolute; pointer-events: none; z-index: 0;
  border-radius: 999px; opacity: .45; animation: qbDrift 9s ease-in-out infinite;
}
.qb-bg-spark.s1 { left: 52%; top: 78px; width: 9px; height: 9px; background: #ffb21d; box-shadow: 34px 28px 0 #27b86a, 76px -14px 0 #00a7e8; }
.qb-bg-spark.s2 { right: 8%; top: 260px; width: 7px; height: 7px; background: #ff4d8d; box-shadow: -48px 46px 0 #ff9c1a, -86px -18px 0 #00a7e8; animation-delay: -3s; }
.qb-bg-spark.s3 { left: 6%; bottom: 160px; width: 8px; height: 8px; background: #27b86a; box-shadow: 42px -34px 0 #ff791f, 92px 18px 0 #00b9b4; animation-delay: -5s; }

@keyframes qbDrift {
  0%, 100% { transform: translate3d(0,0,0) rotate(0); }
  50% { transform: translate3d(16px,-12px,0) rotate(6deg); }
}
@keyframes qbBreathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes qbShine {
  0% { transform: translateX(-120%) rotate(18deg); }
  45%, 100% { transform: translateX(220%) rotate(18deg); }
}
@keyframes qbPop3d {
  0%, 100% { transform: translateY(0) rotate(-3deg) scale(1); }
  50% { transform: translateY(-7px) rotate(4deg) scale(1.06); }
}
@keyframes qbCardIn {
  from { opacity: 0; transform: translateY(14px) scale(.985); }
  to { opacity: 1; transform: none; }
}

/* ── HERO BANNER: FRESH LEARNING GARDEN (NO PURPLE/BLUE AI GRADIENT) ── */
.qb-hero {
  position: relative;
  overflow: hidden;
  min-height: 190px;
  border-radius: 24px;
  padding: 24px 30px;
  background: linear-gradient(135deg, #d9f5c7 0%, #ecfccb 42%, #ffffff 100%);
  border: 1.5px solid rgba(84,166,83,.24);
  box-shadow: 0 14px 34px rgba(39,184,106,.12);
  margin-bottom: 24px;
  animation: qbCardIn .45s both;
}
.qb-hero::before {
  content: '';
  position: absolute;
  inset: -80px auto auto -80px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255,255,255,.45);
  animation: qbBreathe 5s ease-in-out infinite;
}
.qb-hero::after {
  content: '';
  position: absolute;
  top: -50px;
  bottom: -50px;
  width: 80px;
  background: linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent);
  animation: qbShine 7s ease-in-out infinite;
}

.dark .qb-hero, [data-theme="dark"] .qb-hero {
  background: linear-gradient(135deg, #132e1b 0%, #173826 48%, #1c2738 100%);
  border-color: rgba(110,231,183,.22);
  box-shadow: 0 18px 44px rgba(0,0,0,.4);
}

.qb-hero-inner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.qb-hero-content {
  max-width: 580px;
}
.qb-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 800;
  color: #10734c;
  background: rgba(16,185,129,.14);
  padding: 5px 13px;
  border-radius: 20px;
  margin-bottom: 10px;
  border: 1px solid rgba(16,185,129,.22);
}
.dark .qb-hero-badge, [data-theme="dark"] .qb-hero-badge {
  color: #7ee7b7;
  background: rgba(16,185,129,.22);
  border-color: rgba(16,185,129,.35);
}
.qb-hero-title {
  font-size: clamp(24px, 3.2vw, 34px);
  font-weight: 800;
  line-height: 1.15;
  color: #071235;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}
.dark .qb-hero-title, [data-theme="dark"] .qb-hero-title {
  color: #f6f7ff;
}
.qb-hero-sub {
  font-size: 13.5px;
  font-weight: 600;
  color: #526077;
  line-height: 1.5;
  margin-bottom: 16px;
}
.dark .qb-hero-sub, [data-theme="dark"] .qb-hero-sub {
  color: #a8b3cf;
}

/* Stat pills on hero */
.qb-hero-pills {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.qb-hero-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 14px;
  background: rgba(255,255,255,.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(15,23,42,.08);
  box-shadow: 0 4px 12px rgba(35,44,87,.05);
}
.dark .qb-hero-pill, [data-theme="dark"] .qb-hero-pill {
  background: rgba(23,31,58,.82);
  border-color: rgba(255,255,255,.12);
}
.qb-hero-pill strong {
  font-size: 14px;
  font-weight: 800;
  color: #071235;
}
.dark .qb-hero-pill strong, [data-theme="dark"] .qb-hero-pill strong {
  color: #f6f7ff;
}
.qb-hero-pill span {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

/* Mascot robot in banner */
.qb-hero-mascot-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.qb-hero-robo {
  width: clamp(110px, 14vw, 150px);
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 16px 20px rgba(0,0,0,.22));
  animation: qbBreathe 4.5s ease-in-out infinite;
}

/* Back button in hero */
.qb-btn-back {
  border: 0;
  border-radius: 14px;
  padding: 9px 18px;
  min-height: 40px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  font: 800 13px/1 'Plus Jakarta Sans', system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(16,185,129,.3);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all .2s cubic-bezier(.34,1.56,.64,1);
}
.qb-btn-back:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 12px 24px rgba(16,185,129,.4);
}

/* ── SEARCH & FILTER CONTROLS ── */
.qb-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}
.qb-controls-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 280px;
  max-width: 480px;
}
.qb-search-wrap {
  position: relative;
  width: 100%;
}
.qb-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 17px;
  height: 17px;
  color: #8c94aa;
  pointer-events: none;
}
.qb-search-inp {
  width: 100%;
  height: 44px;
  border-radius: 16px;
  padding: 0 38px 0 42px;
  border: 1.5px solid rgba(15,23,42,.1);
  background: rgba(255,255,255,.9);
  backdrop-filter: blur(10px);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: #071235;
  outline: none;
  transition: all .2s;
  box-shadow: 0 3px 10px rgba(35,44,87,.04);
}
.dark .qb-search-inp, [data-theme="dark"] .qb-search-inp {
  background: rgba(23,31,58,.85);
  border-color: rgba(255,255,255,.14);
  color: #f6f7ff;
}
.qb-search-inp:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 4px rgba(16,185,129,.15);
}
.qb-search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(15,23,42,.08);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: background .15s;
}
.qb-search-clear:hover { background: rgba(15,23,42,.16); }

/* Year dropdown */
.qb-year-wrap { position: relative; }
.qb-year-btn {
  height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 16px;
  border: 1.5px solid rgba(15,23,42,.1);
  background: rgba(255,255,255,.9);
  backdrop-filter: blur(10px);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: #071235;
  cursor: pointer;
  transition: all .2s;
  box-shadow: 0 3px 10px rgba(35,44,87,.04);
  user-select: none;
}
.dark .qb-year-btn, [data-theme="dark"] .qb-year-btn {
  background: rgba(23,31,58,.85);
  border-color: rgba(255,255,255,.14);
  color: #f6f7ff;
}
.qb-year-btn:hover { border-color: #10b981; }
.qb-year-btn.open { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
.qb-year-btn.has-filter {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(16,185,129,.35);
}
.qb-year-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 100;
  background: #fff;
  border-radius: 16px;
  border: 1.5px solid rgba(15,23,42,.08);
  box-shadow: 0 14px 38px rgba(0,0,0,.15);
  overflow: hidden;
  min-width: 170px;
  animation: qbCardIn .2s both;
}
.dark .qb-year-menu, [data-theme="dark"] .qb-year-menu {
  background: #171f3a;
  border-color: rgba(255,255,255,.14);
}
.qb-year-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: #071235;
  transition: background .15s;
}
.dark .qb-year-option, [data-theme="dark"] .qb-year-option {
  color: #f6f7ff;
}
.qb-year-option:hover {
  background: rgba(16,185,129,.1);
  color: #10b981;
}
.qb-year-option.sel {
  background: rgba(16,185,129,.15);
  color: #059669;
}

/* Subject Chips row */
.qb-subj-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  max-width: 100%;
}
.qb-chip {
  height: 40px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(15,23,42,.09);
  background: rgba(255,255,255,.85);
  backdrop-filter: blur(8px);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  transition: all .2s;
  white-space: nowrap;
}
.dark .qb-chip, [data-theme="dark"] .qb-chip {
  background: rgba(23,31,58,.8);
  border-color: rgba(255,255,255,.12);
  color: #94a3b8;
}
.qb-chip:hover {
  transform: translateY(-1px);
  border-color: #10b981;
  color: #10b981;
}
.qb-chip.act {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(16,185,129,.32);
}

/* ── COLORFUL CARDS (EXPLORE & PLAY STYLE) ── */
.qb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 22px;
  margin-bottom: 40px;
}

.qb-card {
  border-radius: 22px;
  border: 1.5px solid rgba(15,23,42,.08);
  background: rgba(255,255,255,.94);
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 26px rgba(35,44,87,.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all .28s cubic-bezier(.34,1.56,.64,1);
  position: relative;
  isolation: isolate;
}
.dark .qb-card, [data-theme="dark"] .qb-card {
  background: rgba(23,31,58,.94);
  border-color: rgba(255,255,255,.12);
  box-shadow: 0 14px 34px rgba(0,0,0,.35);
}
.qb-card:hover {
  transform: translateY(-6px) scale(1.015);
  box-shadow: 0 20px 42px rgba(35,44,87,.14);
}
.dark .qb-card:hover {
  box-shadow: 0 20px 48px rgba(0,0,0,.5);
}

/* Vibrant Header on Card */
.qb-card-hero {
  position: relative;
  overflow: hidden;
  padding: 20px 22px 22px;
  color: #fff;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.qb-card-hero::before {
  content: '';
  position: absolute;
  inset: -30px auto auto -30px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: rgba(255,255,255,.18);
  transition: transform .3s ease;
}
.qb-card:hover .qb-card-hero::before {
  transform: scale(1.25);
}
.qb-card-hero::after {
  content: '';
  position: absolute;
  right: -24px;
  bottom: -32px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
}

.qb-card-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  position: relative;
  z-index: 2;
  margin-bottom: 8px;
}
.qb-card-exam-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;
  background: rgba(255,255,255,.24);
  backdrop-filter: blur(8px);
  padding: 4px 11px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,.35);
}
.qb-card-title {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
  letter-spacing: -0.01em;
  position: relative;
  z-index: 2;
  text-shadow: 0 2px 6px rgba(0,0,0,.15);
}
.qb-card-sub {
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(255,255,255,.9);
  margin-top: 4px;
  position: relative;
  z-index: 2;
}

/* Floating 3D Pop art in card header */
.qb-card-art-pop {
  position: absolute;
  right: 14px;
  bottom: 12px;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, rgba(255,255,255,.85), rgba(255,255,255,.35));
  box-shadow: inset 0 -6px 0 rgba(0,0,0,.08), 0 10px 18px rgba(0,0,0,.18);
  filter: drop-shadow(0 6px 8px rgba(0,0,0,.16));
  animation: qbPop3d 4.4s ease-in-out infinite;
  z-index: 2;
}
.qb-card-art-img {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

/* Card Body */
.qb-card-body {
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

/* 4-Item Meta Grid */
.qb-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.qb-meta-box {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(15,23,42,.03);
  border: 1px solid rgba(15,23,42,.06);
}
.dark .qb-meta-box, [data-theme="dark"] .qb-meta-box {
  background: rgba(31,42,76,.65);
  border-color: rgba(255,255,255,.09);
}
.qb-meta-lbl {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #8c94aa;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.qb-meta-val {
  font-size: 15px;
  font-weight: 800;
  color: #071235;
}
.dark .qb-meta-val, [data-theme="dark"] .qb-meta-val {
  color: #f6f7ff;
}

/* Difficulty Distribution Stack */
.qb-diff-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.qb-diff-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #64748b;
}
.qb-diff-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(15,23,42,.08);
  display: flex;
  overflow: hidden;
  gap: 2px;
}
.dark .qb-diff-bar, [data-theme="dark"] .qb-diff-bar {
  background: rgba(255,255,255,.1);
}
.qb-diff-seg {
  height: 100%;
  border-radius: inherit;
  transition: width .6s ease;
}
.qb-diff-pills {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}
.qb-diff-pill {
  flex: 1;
  text-align: center;
  padding: 4px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.qb-diff-pill.easy { background: rgba(16,185,129,.14); color: #059669; }
.qb-diff-pill.medium { background: rgba(245,158,11,.14); color: #d97706; }
.qb-diff-pill.hard { background: rgba(239,68,68,.14); color: #dc2626; }

/* Topics preview */
.qb-topics-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.qb-topic-chip {
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 12px;
  background: rgba(15,23,42,.05);
  color: #475569;
}
.dark .qb-topic-chip, [data-theme="dark"] .qb-topic-chip {
  background: rgba(255,255,255,.08);
  color: #cbd5e1;
}

/* Card Action Buttons */
.qb-card-actions {
  padding: 14px 22px 18px;
  border-top: 1px solid rgba(15,23,42,.06);
  display: flex;
  gap: 10px;
  background: rgba(15,23,42,.015);
}
.dark .qb-card-actions, [data-theme="dark"] .qb-card-actions {
  border-color: rgba(255,255,255,.08);
  background: rgba(0,0,0,.15);
}
.qb-btn-view {
  flex: 1;
  height: 42px;
  border-radius: 14px;
  border: 0;
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: all .2s;
}
.qb-btn-view:hover {
  transform: translateY(-2px);
}
.qb-btn-dl {
  flex: 1;
  height: 42px;
  border-radius: 14px;
  border: 1.5px solid rgba(15,23,42,.12);
  background: #fff;
  color: #334155;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: all .2s;
}
.dark .qb-btn-dl, [data-theme="dark"] .qb-btn-dl {
  background: rgba(31,42,76,.8);
  border-color: rgba(255,255,255,.16);
  color: #f1f5f9;
}
.qb-btn-dl:hover {
  transform: translateY(-2px);
  border-color: #10b981;
  color: #10b981;
}

/* ── PDF VIEWER MODAL ── */
.qb-viewer {
  position: fixed; inset: 0; z-index: 100;
  background: #f8fafc;
  display: flex; flex-direction: column;
}
.dark .qb-viewer, [data-theme="dark"] .qb-viewer {
  background: #080d1f;
  color: #f6f7ff;
}

.qb-viewer-head {
  height: 62px;
  background: #fff;
  border-bottom: 1.5px solid rgba(15,23,42,.08);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(0,0,0,.04);
}
.dark .qb-viewer-head, [data-theme="dark"] .qb-viewer-head {
  background: #10172d;
  border-color: rgba(255,255,255,.12);
}
.qb-viewer-head-left { display: flex; align-items: center; gap: 14px; }
.qb-viewer-head-title { font-size: 15px; font-weight: 800; color: #071235; }
.dark .qb-viewer-head-title, [data-theme="dark"] .qb-viewer-head-title { color: #f6f7ff; }
.qb-viewer-head-sub { font-size: 11px; font-weight: 600; color: #64748b; margin-top: 1px; }
.dark .qb-viewer-head-sub, [data-theme="dark"] .qb-viewer-head-sub { color: #94a3b8; }

.qb-vhclose {
  width: 38px; height: 38px; border-radius: 12px;
  border: 1.5px solid rgba(15,23,42,.1); background: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #64748b; transition: all .2s;
}
.dark .qb-vhclose, [data-theme="dark"] .qb-vhclose {
  background: rgba(31,42,76,.8); border-color: rgba(255,255,255,.14); color: #cbd5e1;
}
.qb-vhclose:hover { border-color: #ef4444; color: #ef4444; }

.qb-vhbtn-print {
  height: 40px; padding: 0 16px; border-radius: 12px;
  border: 1.5px solid rgba(15,23,42,.12); background: #fff;
  font-family: inherit; font-size: 12.5px; font-weight: 700;
  cursor: pointer; color: #374151; display: flex; align-items: center; gap: 6px; transition: all .2s;
}
.dark .qb-vhbtn-print, [data-theme="dark"] .qb-vhbtn-print {
  background: rgba(31,42,76,.8); border-color: rgba(255,255,255,.16); color: #f1f5f9;
}
.qb-vhbtn-print:hover { border-color: #10b981; color: #10b981; }

.qb-vhbtn-dl-primary {
  height: 40px; padding: 0 18px; border-radius: 12px; border: 0;
  background: linear-gradient(135deg, #10b981, #059669); color: #fff;
  font-family: inherit; font-size: 13px; font-weight: 800;
  cursor: pointer; display: flex; align-items: center; gap: 6px;
  box-shadow: 0 6px 18px rgba(16,185,129,.35); transition: all .2s;
}
.qb-vhbtn-dl-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(16,185,129,.45);
}

.qb-viewer-body { flex: 1; display: flex; overflow: hidden; }
.qb-viewer-sb {
  width: 270px; background: #fff; border-right: 1.5px solid rgba(15,23,42,.08);
  overflow-y: auto; flex-shrink: 0; padding: 20px 18px;
  display: flex; flex-direction: column; gap: 18px;
}
.dark .qb-viewer-sb, [data-theme="dark"] .qb-viewer-sb {
  background: #10172d; border-color: rgba(255,255,255,.12);
}

.qb-sb-section-title {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .08em; color: #64748b; margin-bottom: 10px;
  display: flex; align-items: center; gap: 6px;
}
.qb-sec-item {
  cursor: pointer; padding: 11px 12px; border-radius: 14px;
  border: 1px solid rgba(15,23,42,.08); background: #fbfcff;
  margin-bottom: 7px; transition: all .2s;
}
.dark .qb-sec-item, [data-theme="dark"] .qb-sec-item {
  background: rgba(31,42,76,.6); border-color: rgba(255,255,255,.09);
}
.qb-sec-item:hover { border-color: #10b981; background: rgba(16,185,129,.06); }
.qb-sec-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.qb-sec-lbl { font-size: 13px; font-weight: 800; color: #071235; }
.dark .qb-sec-lbl, [data-theme="dark"] .qb-sec-lbl { color: #f6f7ff; }
.qb-sec-page { font-size: 10.5px; color: #64748b; font-weight: 600; }

.qb-ai-card {
  padding: 14px; border-radius: 16px; border: 1.5px solid rgba(16,185,129,.2);
  background: rgba(16,185,129,.08);
}
.qb-ai-card-title {
  font-size: 10.5px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .06em; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;
  color: #059669;
}
.dark .qb-ai-card-title, [data-theme="dark"] .qb-ai-card-title { color: #6ee7b7; }
.qb-ai-card-text { font-size: 11.5px; font-weight: 600; line-height: 1.55; color: #2d453b; }
.dark .qb-ai-card-text, [data-theme="dark"] .qb-ai-card-text { color: #a7f3d0; }

.qb-predict-btn {
  width: 100%; padding: 11px 14px; border-radius: 14px;
  border: 1.5px solid rgba(255,156,26,.3); background: rgba(255,156,26,.08);
  font-family: inherit; font-size: 12px; font-weight: 800;
  cursor: pointer; color: #d97706; display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: all .2s;
}
.qb-predict-btn:hover { background: rgba(255,156,26,.18); transform: translateY(-1px); }

/* Center Printable Question Paper area */
.qb-pdf-area {
  flex: 1; background: #eef2f6; overflow-y: auto; padding: 32px 20px;
}
.dark .qb-pdf-area, [data-theme="dark"] .qb-pdf-area { background: #0c1224; }

.ep-paper-wrapper {
  width: 100%; max-width: 860px; margin: 0 auto; padding: 40px 48px;
  background: #ffffff; color: #111827; border: 1px solid #cbd5e1; border-radius: 4px;
  box-shadow: 0 16px 42px rgba(15,23,42,.14);
}
.dark .ep-paper-wrapper, [data-theme="dark"] .ep-paper-wrapper {
  background: #171f38; color: #f1f5f9; border-color: rgba(255,255,255,.14);
}
.ep-paper-header { text-align: center; padding-bottom: 20px; }
.ep-paper-school { font-family: Georgia, serif; font-size: 13px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: #475569; }
.dark .ep-paper-school, [data-theme="dark"] .ep-paper-school { color: #94a3b8; }
.ep-paper-exam-title { margin-top: 8px; font-family: Georgia, serif; font-size: 26px; font-weight: 800; line-height: 1.2; color: #111827; }
.dark .ep-paper-exam-title, [data-theme="dark"] .ep-paper-exam-title { color: #f8fafc; }
.ep-paper-subject { margin-top: 4px; font-size: 13.5px; font-weight: 600; color: #64748b; }

.ep-paper-meta-row {
  margin: 18px auto 0; display: grid; grid-template-columns: repeat(3, 1fr);
  max-width: 520px; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;
}
.dark .ep-paper-meta-row, [data-theme="dark"] .ep-paper-meta-row { border-color: rgba(255,255,255,.16); }
.ep-paper-meta-item { padding: 10px 12px; border-right: 1px solid #cbd5e1; background: #f8fafc; text-align: center; }
.dark .ep-paper-meta-item, [data-theme="dark"] .ep-paper-meta-item { background: #1f2a48; border-color: rgba(255,255,255,.16); }
.ep-paper-meta-item:last-child { border-right: none; }
.ep-paper-meta-val { font-size: 17px; font-weight: 800; color: #111827; }
.dark .ep-paper-meta-val, [data-theme="dark"] .ep-paper-meta-val { color: #f8fafc; }
.ep-paper-meta-lbl { margin-top: 3px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }

.ep-paper-divider { margin-top: 20px; height: 2px; background: #111827; position: relative; }
.dark .ep-paper-divider, [data-theme="dark"] .ep-paper-divider { background: rgba(255,255,255,.3); }

.ep-part-section { padding: 26px 0 10px; border-bottom: 1px solid #e5e7eb; scroll-margin-top: 24px; }
.dark .ep-part-section, [data-theme="dark"] .ep-part-section { border-color: rgba(255,255,255,.1); }
.ep-part-section:last-child { border-bottom: none; }

.ep-part-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
  padding: 0 0 12px; margin-bottom: 14px; border-bottom: 1.5px solid #111827;
}
.dark .ep-part-header, [data-theme="dark"] .ep-part-header { border-color: rgba(255,255,255,.25); }
.ep-part-left { display: flex; align-items: flex-start; gap: 12px; }
.ep-part-badge {
  width: 32px; height: 32px; border-radius: 4px; border: 1.5px solid #111827;
  display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800;
  background: #fff; color: #111827;
}
.dark .ep-part-badge, [data-theme="dark"] .ep-part-badge { background: #1f2a48; color: #f8fafc; border-color: rgba(255,255,255,.3); }
.ep-part-title { font-family: Georgia, serif; font-size: 17px; font-weight: 800; color: #111827; }
.dark .ep-part-title, [data-theme="dark"] .ep-part-title { color: #f8fafc; }
.ep-part-subtitle { margin-top: 3px; font-size: 12px; font-weight: 600; color: #64748b; }

.ep-paper-qn {
  display: grid; grid-template-columns: 32px minmax(0,1fr) auto; gap: 12px; align-items: flex-start;
  padding: 10px 0; border-bottom: 1px dashed #d1d5db;
}
.dark .ep-paper-qn, [data-theme="dark"] .ep-paper-qn { border-color: rgba(255,255,255,.12); }
.ep-paper-qn:last-child { border-bottom: none; }
.ep-paper-qn-num {
  width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid #cbd5e1;
  display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;
  color: #111827;
}
.dark .ep-paper-qn-num, [data-theme="dark"] .ep-paper-qn-num { border-color: rgba(255,255,255,.2); color: #f8fafc; }
.ep-paper-qn-text { font-family: Georgia, serif; font-size: 14.5px; line-height: 1.6; color: #111827; }
.dark .ep-paper-qn-text, [data-theme="dark"] .ep-paper-qn-text { color: #e2e8f0; }

.ep-paper-qn-unit {
  padding: 4px 8px; border-radius: 4px; background: #f8fafc; border: 1px solid #e2e8f0;
  font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b;
}
.dark .ep-paper-qn-unit, [data-theme="dark"] .ep-paper-qn-unit { background: #1f2a48; border-color: rgba(255,255,255,.14); color: #cbd5e1; }

/* Sticky part selector for mobile/tablet */
.qb-mobile-parts {
  position: sticky; top: -32px; z-index: 20; display: none; gap: 8px; overflow-x: auto;
  margin: -32px -20px 20px; padding: 12px 16px; background: rgba(255,255,255,.94);
  border-bottom: 1px solid #e2e8f0; backdrop-filter: blur(10px);
}
.dark .qb-mobile-parts, [data-theme="dark"] .qb-mobile-parts {
  background: rgba(16,23,45,.94); border-color: rgba(255,255,255,.14);
}
.qb-mobile-part-btn {
  flex: 0 0 auto; height: 36px; padding: 0 14px; border-radius: 10px; border: 1.5px solid rgba(15,23,42,.12);
  background: #fff; color: #071235; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer;
}
.dark .qb-mobile-part-btn, [data-theme="dark"] .qb-mobile-part-btn {
  background: rgba(31,42,76,.8); border-color: rgba(255,255,255,.16); color: #f1f5f9;
}

/* Predictor modal */
.qb-predictor-overlay {
  position: fixed; inset: 0; z-index: 120; background: rgba(7,18,53,.6);
  backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px;
}
.qb-predictor-card {
  background: #fff; border-radius: 24px; max-width: 420px; width: 100%;
  overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,.25);
  animation: qbCardIn .3s both;
}
.dark .qb-predictor-card, [data-theme="dark"] .qb-predictor-card {
  background: #171f38; border: 1.5px solid rgba(255,255,255,.15);
}
.qb-predictor-head {
  padding: 18px 22px; border-bottom: 1px solid rgba(15,23,42,.08);
  display: flex; align-items: center; justify-content: space-between;
}
.dark .qb-predictor-head, [data-theme="dark"] .qb-predictor-head { border-color: rgba(255,255,255,.12); }
.qb-predictor-title { font-size: 15px; font-weight: 800; color: #071235; display: flex; align-items: center; gap: 8px; }
.dark .qb-predictor-title, [data-theme="dark"] .qb-predictor-title { color: #f8fafc; }
.qb-predictor-body { padding: 20px 22px; }
.qb-predictor-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 11px 0; border-bottom: 1px solid rgba(15,23,42,.06);
}
.dark .qb-predictor-row, [data-theme="dark"] .qb-predictor-row { border-color: rgba(255,255,255,.1); }
.qb-predictor-row:last-child { border-bottom: none; }
.qb-predictor-lbl { font-size: 13px; font-weight: 600; color: #64748b; }
.dark .qb-predictor-lbl, [data-theme="dark"] .qb-predictor-lbl { color: #94a3b8; }
.qb-predictor-val { font-size: 14px; font-weight: 800; color: #10b981; }

/* ── RESPONSIVE DESIGN ── */
@media (max-width: 900px) {
  .qb-viewer-sb { display: none; }
  .qb-mobile-parts { display: flex; }
}
@media (max-width: 768px) {
  .qb-hero { padding: 20px 18px; }
  .qb-hero-inner { flex-direction: column; align-items: flex-start; }
  .qb-hero-mascot-wrap { display: none; }
  .qb-grid { grid-template-columns: 1fr; gap: 16px; }
  .qb-controls-left { max-width: 100%; }
}
@media (max-width: 520px) {
  .qb-hero-pills { flex-direction: column; align-items: flex-start; }
  .ep-paper-wrapper { padding: 24px 18px; }
  .ep-paper-meta-row { grid-template-columns: 1fr; }
  .ep-paper-meta-item { border-right: none; border-bottom: 1px solid #cbd5e1; }
  .ep-paper-meta-item:last-child { border-bottom: none; }
}
`;

// Group questions by marks/type
const groupQuestionsByMarks = (questions: Question[]): Record<number, Question[]> => {
  return questions.reduce(
    (acc, q) => {
      if (!acc[q.marks]) acc[q.marks] = [];
      acc[q.marks].push(q);
      return acc;
    },
    {} as Record<number, Question[]>
  );
};

// Get unique topics from questions
const getTopicsFromQuestions = (questions: Question[]): string[] => {
  const topics = new Set(questions.map((q) => q.topic).filter(Boolean));
  return Array.from(topics).slice(0, 4);
};

// Calculate difficulty distribution
const getDifficultyStats = (questions: Question[]) => {
  let easy = 0,
    medium = 0,
    hard = 0;
  questions.forEach((q) => {
    const d = (q.difficulty || "").toLowerCase();
    if (d === "easy") easy++;
    else if (d === "medium") medium++;
    else if (d === "hard") hard++;
  });
  return { easy, medium, hard };
};

export default function QuestionBank() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [yearFilt, setYearFilt] = useState("all");
  const [selectedSubj, setSelectedSubj] = useState("all");
  const [apiDataList, setApiDataList] = useState<QuestionBankResponse["data"][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<QuestionBankResponse["data"] | false>(false);
  const [showTop, setShowTop] = useState(false);
  const [showPred, setShowPred] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const { userHeader } = useAuth();
  const [role, setRole] = useState("student");
  const pdfRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userHeader?.role) setRole(userHeader.role);
  }, [userHeader]);

  // Close year dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setYearDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch API data based on query parameters or fall back to demo data
  useEffect(() => {
    const fetchQuestionBank = async () => {
      const params = new URLSearchParams(window.location.search);
      const board = params.get("board") || "";
      const classNumber = params.get("classNumber") || "";
      const subject = params.get("subject") || "";
      const subjectGroupKey = params.get("subjectGroupKey") || "";

      const demoQuestionBank = findDemoQuestionBank(subject, subjectGroupKey);
      const loadDemoQuestionBanks = () => {
        if (!demoQuestionBank) {
          setApiDataList(DEMO_QUESTION_BANKS);
          setError(null);
          return true;
        }
        setApiDataList(DEMO_QUESTION_BANKS);
        setError(null);
        return true;
      };

      if (!board || !classNumber || !subject || !subjectGroupKey) {
        loadDemoQuestionBanks();
        setLoading(false);
        return;
      }

      try {
        const queryString = `board=${encodeURIComponent(board)}&classNumber=${encodeURIComponent(classNumber)}&subject=${encodeURIComponent(subject)}&subjectGroupKey=${encodeURIComponent(subjectGroupKey)}`;
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/v1/tutor/tutor/question-bank?${queryString}`,
          { credentials: "include" },
        );
        const data: QuestionBankResponse & { message?: string } = await response
          .json()
          .catch(() => ({ status: false }));

        if (!response.ok) {
          if (response.status === 401 || response.status === 403 || response.status === 410) {
            throw new Error("Your session has expired. Please sign in again.");
          }
          if (response.status === 404) {
            throw new Error("Question bank not added");
          }
          throw new Error(data?.message || `API Error: ${response.statusText}`);
        }

        if (data.status && data.data) {
          const bankData = Array.isArray(data.data) ? data.data : [data.data];
          setApiDataList(bankData);
        } else if (loadDemoQuestionBanks()) {
          return;
        } else {
          setError(data?.message || "Question bank not added");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch data";
        if (!message.toLowerCase().includes("session")) {
          loadDemoQuestionBanks();
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionBank();
  }, []);

  // Compute unique years and subjects for filters
  const availableYears = useMemo(() => {
    const set = new Set(apiDataList.map((b) => b.year).filter(Boolean));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [apiDataList]);

  const availableSubjects = useMemo(() => {
    const set = new Set(apiDataList.map((b) => b.subject).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [apiDataList]);

  // Filtered Question Banks
  const filteredBanks = useMemo(() => {
    return apiDataList.filter((b) => {
      const matchesSearch =
        search === "" ||
        b.subject.toLowerCase().includes(search.toLowerCase()) ||
        b.examName.toLowerCase().includes(search.toLowerCase()) ||
        b.board.toLowerCase().includes(search.toLowerCase()) ||
        b.questions.some((q) => q.topic?.toLowerCase().includes(search.toLowerCase()));

      const matchesYear = yearFilt === "all" || b.year === yearFilt;
      const matchesSubject = selectedSubj === "all" || b.subject.toLowerCase() === selectedSubj.toLowerCase();

      return matchesSearch && matchesYear && matchesSubject;
    });
  }, [apiDataList, search, yearFilt, selectedSubj]);

  const totalQuestionsSum = useMemo(() => {
    return apiDataList.reduce((acc, b) => acc + (b.totalQuestions || b.questions?.length || 0), 0);
  }, [apiDataList]);

  // Helper function to generate PDF content as HTML string
  const generatePDFContentForBank = (bank: QuestionBankResponse["data"]): string => {
    const bankQuestionsByMarks = groupQuestionsByMarks(bank.questions);
    const bankTotalMarks = bank.questions.reduce((sum, q) => sum + q.marks, 0);

    let html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${bank.subject} Question Paper</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Georgia, serif; color: #111827; line-height: 1.6; padding: 40px; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #111827; margin-bottom: 30px; }
            .school { font-family: Georgia, serif; font-size: 11px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
            .exam-title { font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #111827; line-height: 1.2; margin: 8px 0; }
            .meta-row { margin: 18px 0; display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #cbd5e1; border-radius: 2px; overflow: hidden; }
            .meta-item { padding: 10px 12px; border-right: 1px solid #cbd5e1; background: #f8fafc; text-align: center; }
            .meta-item:last-child { border-right: none; }
            .meta-val { font-size: 16px; font-weight: bold; color: #111827; }
            .meta-lbl { margin-top: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
            .section { page-break-inside: avoid; margin-bottom: 30px; }
            .section-header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 1px solid #111827; }
            .section-badge { width: 34px; height: 34px; border-radius: 2px; border: 1px solid #111827; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: bold; color: #111827; background: #fff; }
            .section-title { font-family: Georgia, serif; font-size: 16px; font-weight: bold; color: #111827; line-height: 1.25; }
            .section-subtitle { margin-top: 3px; font-size: 11px; font-weight: 600; color: #64748b; }
            .question { display: grid; grid-template-columns: 30px 1fr auto; gap: 12px; padding-bottom: 10px; border-bottom: 1px dashed #d1d5db; align-items: flex-start; margin-bottom: 10px; }
            .question:last-child { border-bottom: none; padding-bottom: 0; }
            .q-num { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #111827; flex-shrink: 0; }
            .q-text { font-size: 13.5px; line-height: 1.5; color: #111827; }
            .q-options { margin-top: 8px; margin-left: 12px; display: flex; flex-direction: column; gap: 6px; }
            .q-option { font-size: 12px; color: #374151; }
            .q-marks { font-size: 11px; font-weight: bold; color: #64748b; white-space: nowrap; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school">Model Question Paper</div>
            <div class="exam-title">${bank.subject}</div>
            <div style="margin-top: 4px; font-size: 13px; font-weight: 600; color: #64748b;">Class ${bank.classNumber} | ${bank.board} | ${bank.year}</div>
            <div class="meta-row">
              <div class="meta-item"><div class="meta-val">${bank.totalQuestions}</div><div class="meta-lbl">Questions</div></div>
              <div class="meta-item"><div class="meta-val">${bankTotalMarks}</div><div class="meta-lbl">Total Marks</div></div>
              <div class="meta-item"><div class="meta-val">3 hrs</div><div class="meta-lbl">Duration</div></div>
            </div>
          </div>
    `;

    Object.keys(bankQuestionsByMarks)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((marks) => {
        const marksQuestions = bankQuestionsByMarks[parseInt(marks)];
        const sectionNum = Object.keys(bankQuestionsByMarks).indexOf(marks) + 1;

        html += `
          <div class="section">
            <div class="section-header">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div class="section-badge">${sectionNum}</div>
                <div>
                  <div class="section-title">${marks}-Mark Questions</div>
                  <div class="section-subtitle">Each question carries ${marks} mark${parseInt(marks) > 1 ? "s" : ""}</div>
                </div>
              </div>
            </div>
            <div>
        `;

        let lastSectionTitle = "";
        marksQuestions.forEach((q, idx) => {
          const isNewSection = q.section_title && q.section_title !== lastSectionTitle;
          if (isNewSection) lastSectionTitle = q.section_title;

          html += `
            ${isNewSection ? `
              <div style="font-size: 11px; font-weight: bold; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #a7f3d0;">
                ${q.section_title}
              </div>
            ` : ""}
            <div class="question">
              <div class="q-num">${idx + 1}</div>
              <div class="q-text">
                ${q.question}
                ${q.options && q.options.length > 0 ? `
                  <div class="q-options">
                    ${q.options.map((opt, optIdx) => `<div class="q-option">(${String.fromCharCode(97 + optIdx)}) ${opt}</div>`).join("")}
                  </div>
                ` : ""}
              </div>
              <div class="q-marks">${marks}M</div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });

    html += `
        </body>
      </html>
    `;
    return html;
  };

  const downloadPDF = (htmlContent: string, filename: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);
    };
  };

  const print = (bank: QuestionBankResponse["data"]) => {
    const htmlContent = generatePDFContentForBank(bank);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 100);
      };
    }
  };

  const scrollToPart = (partKey: string) => {
    const el = document.getElementById(`qbank-part-${partKey}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const scrollTop = () => {
    pdfRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── LANDING VIEW ──────────────────────────────────────────────────────────
  if (!preview) {
    return (
      <div className="qb">
        <style>{CSS}</style>
        <span className="qb-bg-spark s1" aria-hidden />
        <span className="qb-bg-spark s2" aria-hidden />
        <span className="qb-bg-spark s3" aria-hidden />

        <Navigation currentRole={role as "student" | "teacher"} onRoleChange={setRole} />

        <div style={{ padding: "24px clamp(16px, 3vw, 36px) 48px", maxWidth: 1320, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* ── HERO BANNER WITH ROBO MASCOT & FRESH LEARNING COLORS ── */}
          <motion.div
            className="qb-hero"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="qb-hero-inner">
              <div className="qb-hero-content">
                <div className="qb-hero-badge">
                  <Sparkles size={13} />
                  Model Question Papers & Question Bank
                </div>
                <h1 className="qb-hero-title">Practice & Master Questions</h1>
                <p className="qb-hero-sub">
                  Explore curated syllabus-aligned questions, chapter-wise weightage, and instant model exam printouts.
                </p>

                <div className="qb-hero-pills">
                  <div className="qb-hero-pill">
                    <Layers size={15} color="#10b981" />
                    <strong>{apiDataList.length}</strong>
                    <span>Papers Available</span>
                  </div>
                  <div className="qb-hero-pill">
                    <CheckCircle2 size={15} color="#ff9c1a" />
                    <strong>{totalQuestionsSum}</strong>
                    <span>Total Questions</span>
                  </div>
                  <button
                    onClick={() => setLocation("/ai-tutor")}
                    className="qb-btn-back"
                    style={{ marginLeft: 6 }}
                  >
                    <ArrowLeft size={15} /> Back to AI Tutor
                  </button>
                </div>
              </div>

              {/* Robo mascot in banner */}
              <div className="qb-hero-mascot-wrap" aria-hidden="true">
                <img
                  src={studyRoboImg}
                  alt="Study Robot"
                  className="qb-hero-robo"
                />
              </div>
            </div>
          </motion.div>

          {/* ── SEARCH & FILTER CONTROLS ── */}
          <div className="qb-controls">
            <div className="qb-controls-left">
              <div className="qb-search-wrap">
                <Search className="qb-search-icon" />
                <input
                  type="text"
                  className="qb-search-inp"
                  placeholder="Search by subject, topic or board..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="qb-search-clear"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Year Dropdown Filter */}
              <div className="qb-year-wrap" ref={yearRef}>
                <button
                  className={`qb-year-btn ${yearDropdownOpen ? "open" : ""} ${yearFilt !== "all" ? "has-filter" : ""}`}
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                >
                  <Calendar size={15} />
                  <span>{yearFilt === "all" ? "All Years" : yearFilt}</span>
                  <ChevronDown size={14} style={{ transform: yearDropdownOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>

                {yearDropdownOpen && (
                  <div className="qb-year-menu">
                    <div
                      className={`qb-year-option ${yearFilt === "all" ? "sel" : ""}`}
                      onClick={() => {
                        setYearFilt("all");
                        setYearDropdownOpen(false);
                      }}
                    >
                      <span>All Years</span>
                      <span style={{ fontSize: 11, opacity: 0.6 }}>({apiDataList.length})</span>
                    </div>
                    {availableYears.map((y) => (
                      <div
                        key={y}
                        className={`qb-year-option ${yearFilt === y ? "sel" : ""}`}
                        onClick={() => {
                          setYearFilt(y);
                          setYearDropdownOpen(false);
                        }}
                      >
                        <span>Year {y}</span>
                        <span style={{ fontSize: 11, opacity: 0.6 }}>
                          ({apiDataList.filter((b) => b.year === y).length})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subject Filter Chips */}
            <div className="qb-subj-chips">
              {availableSubjects.map((subj) => (
                <button
                  key={subj}
                  className={`qb-chip ${selectedSubj.toLowerCase() === subj.toLowerCase() ? "act" : ""}`}
                  onClick={() => setSelectedSubj(subj)}
                >
                  {subj === "all" ? "All Subjects" : subj}
                </button>
              ))}
            </div>
          </div>

          {/* ── QUESTION BANK CARDS (COLORFUL EXPLORE & PLAY STYLE) ── */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Loading Question Banks...</div>
              <p style={{ fontSize: 13 }}>Preparing your interactive study materials.</p>
            </div>
          ) : filteredBanks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 24px",
                background: "rgba(255,255,255,.8)",
                borderRadius: 24,
                border: "2px dashed rgba(15,23,42,.12)",
                maxWidth: 480,
                margin: "40px auto",
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>No Question Papers Found</h3>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                Try adjusting your search query or reset the year filter.
              </p>
              <button
                className="qb-btn-back"
                onClick={() => {
                  setSearch("");
                  setYearFilt("all");
                  setSelectedSubj("all");
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="qb-grid">
              {filteredBanks.map((bank, index) => {
                const theme = getCardTheme(bank.subject, index);
                const bankDiffStats = getDifficultyStats(bank.questions || []);
                const bankTopics = getTopicsFromQuestions(bank.questions || []);
                const bankTotalMarks = (bank.questions || []).reduce((sum, q) => sum + q.marks, 0);
                const totalQ = bank.totalQuestions || bank.questions?.length || 0;

                const easyPct = totalQ > 0 ? Math.round((bankDiffStats.easy / totalQ) * 100) : 33;
                const medPct = totalQ > 0 ? Math.round((bankDiffStats.medium / totalQ) * 100) : 33;
                const hardPct = totalQ > 0 ? Math.round((bankDiffStats.hard / totalQ) * 100) : 34;

                return (
                  <motion.div
                    key={bank.documentId || `${bank.subject}-${index}`}
                    className="qb-card"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.35 }}
                    whileHover={{ y: -6, scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Vibrant Card Header */}
                    <div className="qb-card-hero" style={{ background: theme.gradient }}>
                      <div className="qb-card-badge-row">
                        <span className="qb-card-exam-chip">
                          <GraduationCap size={12} />
                          {bank.examName || "Model Exam"}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>
                          Class {bank.classNumber}
                        </span>
                      </div>

                      <div>
                        <h2 className="qb-card-title">{bank.subject}</h2>
                        <div className="qb-card-sub">
                          {bank.board} • {bank.year} Edition
                        </div>
                      </div>

                      {/* 3D Pop floating subject icon */}
                      <div className="qb-card-art-pop" aria-hidden="true">
                        <img
                          src={theme.art}
                          alt=""
                          className="qb-card-art-img"
                        />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="qb-card-body">
                      {/* Meta Grid */}
                      <div className="qb-meta-grid">
                        <div className="qb-meta-box">
                          <div className="qb-meta-lbl">
                            <Calendar size={11} /> Year
                          </div>
                          <div className="qb-meta-val">{bank.year}</div>
                        </div>
                        <div className="qb-meta-box">
                          <div className="qb-meta-lbl">
                            <Layers size={11} /> Questions
                          </div>
                          <div className="qb-meta-val">{totalQ}</div>
                        </div>
                        <div className="qb-meta-box">
                          <div className="qb-meta-lbl">
                            <Award size={11} /> Total Marks
                          </div>
                          <div className="qb-meta-val">{bankTotalMarks || 100} M</div>
                        </div>
                        <div className="qb-meta-box">
                          <div className="qb-meta-lbl">
                            <Bookmark size={11} /> Board
                          </div>
                          <div className="qb-meta-val">{bank.board}</div>
                        </div>
                      </div>

                      {/* Difficulty Progress */}
                      <div className="qb-diff-wrap">
                        <div className="qb-diff-label-row">
                          <span>Difficulty Breakdown</span>
                          <span>{totalQ} Qs</span>
                        </div>
                        <div className="qb-diff-bar">
                          <div className="qb-diff-seg" style={{ width: `${easyPct}%`, background: "#10b981" }} title={`Easy: ${bankDiffStats.easy}`} />
                          <div className="qb-diff-seg" style={{ width: `${medPct}%`, background: "#f59e0b" }} title={`Medium: ${bankDiffStats.medium}`} />
                          <div className="qb-diff-seg" style={{ width: `${hardPct}%`, background: "#ef4444" }} title={`Hard: ${bankDiffStats.hard}`} />
                        </div>
                        <div className="qb-diff-pills">
                          <div className="qb-diff-pill easy">
                            <span>Easy</span>
                            <strong>{bankDiffStats.easy}</strong>
                          </div>
                          <div className="qb-diff-pill medium">
                            <span>Med</span>
                            <strong>{bankDiffStats.medium}</strong>
                          </div>
                          <div className="qb-diff-pill hard">
                            <span>Hard</span>
                            <strong>{bankDiffStats.hard}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Topics preview */}
                      {bankTopics.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#8c94aa", marginBottom: 6 }}>
                            Key Topics Covered
                          </div>
                          <div className="qb-topics-list">
                            {bankTopics.map((topic, ti) => (
                              <span key={ti} className="qb-topic-chip">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions (NO PURPLE/BLUE AI GRADIENT) */}
                    <div className="qb-card-actions">
                      <button
                        className="qb-btn-view"
                        style={{
                          background: theme.btnGrad,
                          boxShadow: theme.btnShadow,
                        }}
                        onClick={() => setPreview(bank)}
                      >
                        <Eye size={15} /> View Question Paper
                      </button>
                      <button
                        className="qb-btn-dl"
                        onClick={() => {
                          const html = generatePDFContentForBank(bank);
                          downloadPDF(html, `${bank.subject}_${bank.year}_ModelPaper.pdf`);
                        }}
                        title="Download printable model paper"
                      >
                        <Download size={15} /> Download
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PREVIEW / MODEL QUESTION PAPER VIEWER ─────────────────────────────────
  const questionsByMarks = groupQuestionsByMarks(preview.questions || []);
  const totalMarks = (preview.questions || []).reduce((sum, q) => sum + q.marks, 0);
  const diffStats = getDifficultyStats(preview.questions || []);
  const topicsList = getTopicsFromQuestions(preview.questions || []);

  return (
    <div className="qb">
      <style>{CSS}</style>
      <div className="qb-viewer">
        {/* Viewer Top Header */}
        <div className="qb-viewer-head">
          <div className="qb-viewer-head-left">
            <button
              className="qb-vhclose"
              onClick={() => {
                setPreview(false);
                setShowTop(false);
                setShowPred(false);
              }}
              aria-label="Back to Question Bank list"
            >
              <ArrowLeft size={16} />
            </button>
            <div style={{ width: 1, height: 28, background: "rgba(15,23,42,.1)" }} />
            <div>
              <div className="qb-viewer-head-title">{preview.subject} — Model Question Paper</div>
              <div className="qb-viewer-head-sub">
                Class {preview.classNumber} • {preview.board} • {preview.year}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="qb-vhbtn-print"
              onClick={() => print(preview)}
            >
              <Printer size={15} /> Print Paper
            </button>
            <button
              className="qb-vhbtn-dl-primary"
              onClick={() => {
                const html = generatePDFContentForBank(preview);
                downloadPDF(html, `${preview.subject}_${preview.year}_ModelPaper.pdf`);
              }}
            >
              <Download size={15} /> Download PDF
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="qb-viewer-body">
          {/* Quick Links Sidebar */}
          <aside className="qb-viewer-sb">
            <div>
              <div className="qb-sb-section-title">
                <Bookmark size={13} color="#10b981" />
                Marks Sections
              </div>
              {Object.keys(questionsByMarks)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((marks, idx) => {
                  const qs = questionsByMarks[parseInt(marks)];
                  return (
                    <div
                      key={marks}
                      className="qb-sec-item"
                      onClick={() => scrollToPart(`part${idx + 1}`)}
                    >
                      <div className="qb-sec-item-top">
                        <span className="qb-sec-lbl">{marks}-Mark Questions</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: 12,
                            background: "rgba(16,185,129,.14)",
                            color: "#059669",
                          }}
                        >
                          {qs.length} Qs
                        </span>
                      </div>
                      <div className="qb-sec-page">
                        Section {idx + 1} • {parseInt(marks) * qs.length} Marks total
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Study Guide Card */}
            <div className="qb-ai-card">
              <div className="qb-ai-card-title">
                <Sparkles size={12} />
                Focus Guide
              </div>
              <div className="qb-ai-card-text">
                {topicsList.length > 0
                  ? `High frequency topics: ${topicsList.join(", ")}.`
                  : "Practice all questions under timed exam conditions."}
              </div>
            </div>

            {/* Topic Predictor Button */}
            <button
              className="qb-predict-btn"
              onClick={() => setShowPred(true)}
            >
              <PieChart size={14} />
              View Weightage Stats
            </button>
          </aside>

          {/* Printable Question Paper Document */}
          <main
            className="qb-pdf-area"
            ref={pdfRef}
            onScroll={(e) => setShowTop((e.target as HTMLElement).scrollTop > 500)}
          >
            {/* Mobile Parts jump-bar */}
            <div className="qb-mobile-parts">
              {Object.keys(questionsByMarks)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((marks, idx) => (
                  <button
                    key={marks}
                    className="qb-mobile-part-btn"
                    onClick={() => scrollToPart(`part${idx + 1}`)}
                  >
                    {marks}M Section
                  </button>
                ))}
            </div>

            <div className="ep-paper-wrapper">
              <div className="ep-paper-header">
                <div className="ep-paper-school">Government of School Education</div>
                <h1 className="ep-paper-exam-title">{preview.subject} Model Examination</h1>
                <div className="ep-paper-subject">
                  Standard {preview.classNumber} | Board of {preview.board} | Academic Year {preview.year}
                </div>
                <div className="ep-paper-meta-row">
                  <div className="ep-paper-meta-item">
                    <div className="ep-paper-meta-val">{preview.totalQuestions}</div>
                    <div className="ep-paper-meta-lbl">Total Questions</div>
                  </div>
                  <div className="ep-paper-meta-item">
                    <div className="ep-paper-meta-val">{totalMarks}</div>
                    <div className="ep-paper-meta-lbl">Maximum Marks</div>
                  </div>
                  <div className="ep-paper-meta-item">
                    <div className="ep-paper-meta-val">3 Hours</div>
                    <div className="ep-paper-meta-lbl">Time Allowed</div>
                  </div>
                </div>
                <div className="ep-paper-divider" />
              </div>

              {/* Sections by Marks */}
              {Object.keys(questionsByMarks)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((marks, partIdx) => {
                  const qs = questionsByMarks[parseInt(marks)];
                  if (!qs || qs.length === 0) return null;

                  return (
                    <section
                      id={`qbank-part-part${partIdx + 1}`}
                      key={marks}
                      className="ep-part-section"
                    >
                      <div className="ep-part-header">
                        <div className="ep-part-left">
                          <div className="ep-part-badge">{partIdx + 1}</div>
                          <div>
                            <h2 className="ep-part-title">Part {partIdx + 1} — {marks}-Mark Questions</h2>
                            <div className="ep-part-subtitle">
                              Answer all questions. Each question carries {marks} mark{parseInt(marks) > 1 ? "s" : ""}.
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {qs.map((q, qi) => {
                          const prevQuestion = qi > 0 ? qs[qi - 1] : null;
                          const showSection = !prevQuestion || prevQuestion.section_title !== q.section_title;

                          return (
                            <div key={q.question_id || qi}>
                              {showSection && q.section_title && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: "#10b981",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    margin: "14px 0 10px",
                                    paddingBottom: 6,
                                    borderBottom: "1.5px solid rgba(16,185,129,.2)",
                                  }}
                                >
                                  {q.section_title}
                                </div>
                              )}
                              <div className="ep-paper-qn">
                                <div className="ep-paper-qn-num">{qi + 1}</div>
                                <div className="ep-paper-qn-text">
                                  {q.question}
                                  {q.options && q.options.length > 0 && (
                                    <div style={{ marginTop: 8, marginLeft: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                                      {q.options.map((opt, optIdx) => (
                                        <div key={optIdx} style={{ fontSize: 13, color: "#475569" }}>
                                          ({String.fromCharCode(97 + optIdx)}) {opt}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="ep-paper-qn-unit">{q.difficulty || `${marks}M`}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
            </div>
          </main>
        </div>

        {/* Topic Predictor Modal */}
        {showPred && (
          <div className="qb-predictor-overlay" onClick={() => setShowPred(false)}>
            <div className="qb-predictor-card" onClick={(e) => e.stopPropagation()}>
              <div className="qb-predictor-head">
                <div className="qb-predictor-title">
                  <PieChart size={16} color="#ff9c1a" />
                  Exam Difficulty Analytics
                </div>
                <button
                  className="qb-vhclose"
                  style={{ width: 30, height: 30 }}
                  onClick={() => setShowPred(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="qb-predictor-body">
                <div className="qb-predictor-row">
                  <span className="qb-predictor-lbl">Easy Level Questions</span>
                  <span className="qb-predictor-val" style={{ color: "#10b981" }}>
                    {Math.round((diffStats.easy / (preview.totalQuestions || 1)) * 100)}% ({diffStats.easy} Qs)
                  </span>
                </div>
                <div className="qb-predictor-row">
                  <span className="qb-predictor-lbl">Medium Level Questions</span>
                  <span className="qb-predictor-val" style={{ color: "#f59e0b" }}>
                    {Math.round((diffStats.medium / (preview.totalQuestions || 1)) * 100)}% ({diffStats.medium} Qs)
                  </span>
                </div>
                <div className="qb-predictor-row">
                  <span className="qb-predictor-lbl">Hard Level Questions</span>
                  <span className="qb-predictor-val" style={{ color: "#ef4444" }}>
                    {Math.round((diffStats.hard / (preview.totalQuestions || 1)) * 100)}% ({diffStats.hard} Qs)
                  </span>
                </div>
                <div className="qb-predictor-row">
                  <span className="qb-predictor-lbl">Total Marks Target</span>
                  <span className="qb-predictor-val" style={{ color: "#071235" }}>
                    {totalMarks} Marks
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll to Top FAB */}
        {showTop && (
          <button
            style={{
              position: "fixed",
              bottom: 28,
              right: 28,
              zIndex: 80,
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#10b981",
              color: "#fff",
              border: 0,
              boxShadow: "0 6px 20px rgba(16,185,129,.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onClick={scrollTop}
            aria-label="Scroll to top"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
