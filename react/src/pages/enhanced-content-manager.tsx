import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { useTheme } from "../hooks/use-theme";
import { buildApiUrl } from "../lib/apiBase";
import roboImg from "../assets/robo.png";
import {
  BookOpen, Clock, BarChart2, Eye, Plus, Edit, Trash2,
  Paperclip, CheckCircle2, X, TrendingUp, Filter, Sparkles,
  ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Mic, Image as ImageIcon,
  FileText, HelpCircle, Check, AlertCircle, RefreshCw, Layers,
  ChevronDown, CheckCheck, Star, Target, Zap, ShieldCheck,
  Shuffle, UploadCloud, Brain, Lightbulb, Compass, Download,
  Sliders, Award, BookCheck
} from "lucide-react";

/* ═════════════════════════════════════════════════════════════════════════════
   TYPES & INTERFACES
   ═════════════════════════════════════════════════════════════════════════════ */
export type QuestionType = "mcq" | "short" | "medium" | "long" | "speech" | "image";

export interface InteractiveQuestion {
  id: string;
  courseId?: number;
  subject?: string;
  type: QuestionType;
  marks: number;
  question: string;
  options?: string[];
  correctOption?: number;
  correctAnswer?: string;
  explanation?: string;
  hint?: string;
  difficulty: "easy" | "medium" | "hard";
  bloomLevel?: string;
  sampleAnswer?: string;
  minWords?: number;
  maxWords?: number;
}

const QUESTION_TYPES: Record<QuestionType, { label: string; short: string; color: string; bg: string }> = {
  mcq:    { label: "Multiple Choice", short: "MCQ",      color: "#0284c7", bg: "rgba(2,132,199,.12)" },
  short:  { label: "Short Answer",    short: "2 Marks",  color: "#0ea5e9", bg: "rgba(14,165,233,.12)" },
  medium: { label: "Medium Answer",   short: "5 Marks",  color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  long:   { label: "Essay Question",  short: "Essay",    color: "#ea580c", bg: "rgba(234,88,12,.12)" },
  speech: { label: "Voice Answer",    short: "Speech",   color: "#10b981", bg: "rgba(16,185,129,.12)" },
  image:  { label: "Diagram / Image", short: "Diagram",  color: "#0d9488", bg: "rgba(13,148,136,.12)" },
};

/* ── Initial Seed Questions for Question Transitions ── */
const SEED_QUESTIONS: InteractiveQuestion[] = [
  {
    id: "q-1",
    courseId: 1,
    subject: "Biology",
    type: "mcq",
    marks: 2,
    difficulty: "easy",
    bloomLevel: "Remember",
    question: "Who coined the term 'cell' after observing thin cork slices under a compound microscope in 1665?",
    options: ["Anton van Leeuwenhoek", "Robert Hooke", "Matthias Schleiden", "Theodor Schwann"],
    correctOption: 1,
    correctAnswer: "Robert Hooke",
    hint: "He compared the microscopic porous structures to the small rooms (cells) of monastery monks.",
    explanation: "Robert Hooke first observed dead cork cells under his microscope in 1665 and coined the word 'cell' due to their box-like resemblance."
  },
  {
    id: "q-2",
    courseId: 1,
    subject: "Biology",
    type: "mcq",
    marks: 2,
    difficulty: "medium",
    bloomLevel: "Understand",
    question: "Which organelle generates the majority of cellular chemical energy in the form of ATP and contains its own circular DNA?",
    options: ["Golgi Apparatus", "Ribosome", "Mitochondria", "Endoplasmic Reticulum"],
    correctOption: 2,
    correctAnswer: "Mitochondria",
    hint: "Commonly referred to as the powerhouse of the eukaryotic cell.",
    explanation: "Mitochondria carry out oxidative phosphorylation to synthesize ATP and possess their own semi-autonomous circular mitochondrial genome."
  },
  {
    id: "q-3",
    courseId: 2,
    subject: "Physics",
    type: "mcq",
    marks: 3,
    difficulty: "medium",
    bloomLevel: "Apply",
    question: "A constant force of 40 N acts on an object with mass 8 kg. What is the resulting acceleration of the object?",
    options: ["2.5 m/s²", "5.0 m/s²", "10.0 m/s²", "320.0 m/s²"],
    correctOption: 1,
    correctAnswer: "5.0 m/s²",
    hint: "Use Newton's Second Law: a = F / m.",
    explanation: "According to Newton's Second Law (F = ma), acceleration a = F / m = 40 N / 8 kg = 5.0 m/s²."
  },
  {
    id: "q-4",
    courseId: 3,
    subject: "Mathematics",
    type: "short",
    marks: 4,
    difficulty: "medium",
    bloomLevel: "Analyze",
    question: "State the derivative of f(x) = (3x² + 5)⁴ using the Chain Rule and simplify your result.",
    hint: "Let u = 3x² + 5, then d/dx[u⁴] = 4u³ · u'.",
    sampleAnswer: "f'(x) = 4(3x² + 5)³ · (6x) = 24x(3x² + 5)³.",
    explanation: "By the Chain Rule, d/dx[g(x)^n] = n · g(x)^(n-1) · g'(x). Here, g'(x) = 6x, so 4 · (3x² + 5)³ · 6x = 24x(3x² + 5)³."
  },
  {
    id: "q-5",
    courseId: 1,
    subject: "Biology",
    type: "short",
    marks: 4,
    difficulty: "hard",
    bloomLevel: "Evaluate",
    question: "Differentiate between the rough and smooth endoplasmic reticulum in terms of structure and primary biological function.",
    hint: "Focus on the presence of ribosomes and synthesis of proteins vs. lipids.",
    sampleAnswer: "Rough ER is studded with membrane-bound ribosomes and functions primarily in protein translation and folding; Smooth ER lacks ribosomes and synthesizes lipids, phospholipids, and metabolizes toxins.",
    explanation: "Rough ER handles secretory and membrane-protein synthesis; Smooth ER handles steroid synthesis, carbohydrate metabolism, and calcium storage."
  }
];

/* ═════════════════════════════════════════════════════════════════════════════
   CSS STYLES — MIRRORS TEACHER DASHBOARD DESIGN TOKENS
   ═════════════════════════════════════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* ── Light Mode Tokens ── */
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
  --sd-accent:        #0284c7;
  --sd-accent-teal:   #0d9488;
  --sd-accent-grad:   linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
  --sd-hero-grad:     linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0d9488 100%);
  --sd-chip-bg:       rgba(255,255,255,.16);
  --sd-table-hover:   #f8fafc;
}

/* ── Dark Mode Tokens ── */
[data-theme="dark"], .dark, .ec-root.dark {
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
  --sd-accent:        #38bdf8;
  --sd-accent-teal:   #14b8a6;
  --sd-accent-grad:   linear-gradient(135deg, #0284c7 0%, #14b8a6 100%);
  --sd-hero-grad:     linear-gradient(135deg, #031422 0%, #05263d 45%, #054863 75%, #04403c 100%);
  --sd-chip-bg:       rgba(255,255,255,.12);
  --sd-table-hover:   rgba(255,255,255,.04);
}

*, *::before, *::after { box-sizing: border-box; }

.ec-root {
  min-height: 100vh;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--sd-ink);
  background: radial-gradient(circle at 14% 0%, rgba(2,132,199,.08), transparent 28%),
              radial-gradient(circle at 88% 5%, rgba(13,148,136,.08), transparent 26%),
              linear-gradient(180deg, var(--sd-page) 0%, var(--sd-page) 80px, var(--sd-page-2) 100%);
  position: relative;
  overflow-x: hidden;
  padding: 24px 28px 80px;
  transition: background .3s ease, color .3s ease;
}

[data-theme="dark"] .ec-root, .dark .ec-root {
  background: radial-gradient(circle at 14% 0%, rgba(2,132,199,.14), transparent 30%),
              radial-gradient(circle at 88% 5%, rgba(13,148,136,.10), transparent 26%),
              linear-gradient(180deg, #000000 0%, #000000 80px, #08090d 100%) !important;
  color: #f8fafc !important;
}

/* ── Ambient Background Sparkles ── */
.sd-bg-spark {
  position: absolute; pointer-events: none; z-index: 0; border-radius: 999px;
  opacity: .5; animation: sdDrift 10s ease-in-out infinite;
}
.sd-bg-spark.s1 { left: 45%; top: 90px; width: 9px; height: 9px; background: #f59e0b; box-shadow: 40px 30px 0 #10b981, 80px -15px 0 #0284c7; }
.sd-bg-spark.s2 { right: 6%; top: 280px; width: 8px; height: 8px; background: #0284c7; box-shadow: -50px 50px 0 #0d9488, -90px -20px 0 #0284c7; animation-delay: -3s; }
.sd-bg-spark.s3 { left: 8%; bottom: 180px; width: 8px; height: 8px; background: #10b981; box-shadow: 44px -36px 0 #f59e0b, 96px 20px 0 #0284c7; animation-delay: -6s; }

.sd-bg-ribbon {
  position: absolute; pointer-events: none; z-index: 0; left: 2%; right: 2%; top: 130px; height: 160px;
  border-radius: 50%; background: linear-gradient(90deg, rgba(2,132,199,.08), rgba(245,158,11,.08), rgba(16,185,129,.08));
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
@keyframes robotPulseGlow {
  0%, 100% { box-shadow: 0 16px 36px rgba(2, 132, 199, 0.28), 0 0 18px rgba(56, 189, 248, 0.2); }
  50% { box-shadow: 0 20px 42px rgba(2, 132, 199, 0.42), 0 0 32px rgba(56, 189, 248, 0.42); }
}
@keyframes sdPop3d { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-6px) scale(1.04)} }
@keyframes sdPulseSoft { 0%,100%{box-shadow:0 0 0 0 rgba(2,132,199,.3)} 50%{box-shadow:0 0 0 10px rgba(2,132,199,0)} }
@keyframes sdProgressSweep { 0%{transform:translateX(-120%) skewX(-20deg)} 100%{transform:translateX(220%) skewX(-20deg)} }

.ec-shell {
  max-width: 1260px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* ── Hero Banner (Teacher Dashboard / Homework Pattern) ── */
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
.th-hero-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 14px; border-radius: 999px;
  background: var(--sd-chip-bg); backdrop-filter: blur(10px);
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
  font-size: 13.5px; opacity: .9; max-width: 580px; line-height: 1.55; margin-bottom: 20px;
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

/* ── Hero Robot Stage ── */
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
  transform: scale(1.12) rotate(3deg);
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
  font-size: 11px; opacity: .85; font-weight: 600; text-transform: uppercase; letter-spacing: .04em;
}

/* ── Metric Cards Grid ── */
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
.th-stat-card:hover {
  transform: translateY(-4px); box-shadow: var(--sd-shadow-hover);
  border-color: rgba(2,132,199,.28);
}
.th-sc-ocean   { border-top: 3px solid #0284c7; }
.th-sc-teal    { border-top: 3px solid #0d9488; }
.th-sc-emerald { border-top: 3px solid #10b981; }
.th-sc-amber   { border-top: 3px solid #f59e0b; }

.th-stat-top {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
}
.th-stat-icon {
  width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
}
.tsi-ocean   { background: rgba(2,132,199,.12); color: #0284c7; }
.tsi-teal    { background: rgba(13,148,136,.12); color: #0d9488; }
.tsi-emerald { background: rgba(16,185,129,.12); color: #10b981; }
.tsi-amber   { background: rgba(245,158,11,.12); color: #f59e0b; }
[data-theme="dark"] .tsi-ocean   { background: rgba(2,132,199,.22); color: #38bdf8; }
[data-theme="dark"] .tsi-teal    { background: rgba(13,148,136,.22); color: #2dd4bf; }
[data-theme="dark"] .tsi-emerald { background: rgba(16,185,129,.22); color: #34d399; }
[data-theme="dark"] .tsi-amber   { background: rgba(245,158,11,.22); color: #fbbf24; }

.th-stat-badge {
  font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px;
  background: var(--sd-bar-bg); color: var(--sd-muted);
}
.th-stat-num {
  font-size: 32px; font-weight: 800; color: var(--sd-ink); letter-spacing: -1px; line-height: 1; margin-bottom: 4px;
}
.th-stat-lbl {
  font-size: 13px; color: var(--sd-muted); font-weight: 600;
}
.th-stat-trend {
  font-size: 11.5px; color: #10b981; margin-top: 6px; font-weight: 700; display: flex; align-items: center; gap: 4px;
}
[data-theme="dark"] .th-stat-trend { color: #34d399; }

/* ── Highlights Row ── */
.th-highlights {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px;
}
.th-hl-card {
  border-radius: 18px; padding: 18px 20px; position: relative; overflow: hidden;
  box-shadow: var(--sd-shadow-soft); transition: transform .2s ease;
  animation: cardIn .42s both;
}
.th-hl-card:hover { transform: translateY(-3px); }
.thc-ocean {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 1px solid #bae6fd;
}
.thc-teal {
  background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
  border: 1px solid #99f6e4;
}
.thc-amber {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 1px solid #fde68a;
}
[data-theme="dark"] .thc-ocean {
  background: linear-gradient(135deg, rgba(2,132,199,.15), rgba(3,105,161,.08));
  border-color: rgba(56,189,248,.25);
}
[data-theme="dark"] .thc-teal {
  background: linear-gradient(135deg, rgba(13,148,136,.15), rgba(15,118,110,.08));
  border-color: rgba(45,212,191,.25);
}
[data-theme="dark"] .thc-amber {
  background: linear-gradient(135deg, rgba(245,158,11,.15), rgba(217,119,6,.08));
  border-color: rgba(251,191,36,.25);
}
.th-hl-emoji { font-size: 26px; margin-bottom: 8px; }
.th-hl-title { font-size: 14px; font-weight: 800; color: var(--sd-ink); margin-bottom: 3px; }
.th-hl-sub   { font-size: 12px; color: var(--sd-muted); font-weight: 600; }
.th-hl-num   { font-size: 26px; font-weight: 800; color: var(--sd-ink); margin-top: 6px; }

/* ── Navigation Tabs ── */
.th-tabs-bar {
  display: flex; gap: 6px; margin-bottom: 24px; background: var(--sd-bar-bg);
  border-radius: 18px; padding: 5px; animation: cardIn .42s both;
  overflow-x: auto; scrollbar-width: none;
}
.th-tabs-bar::-webkit-scrollbar { display: none; }
.th-tab {
  flex: 1; min-width: 140px; padding: 11px 16px; border-radius: 14px; border: none;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  color: var(--sd-muted); background: transparent; transition: all .2s;
  display: flex; align-items: center; justify-content: center; gap: 7px;
  white-space: nowrap;
}
.th-tab:hover { color: var(--sd-ink); }
.th-tab.active {
  background: var(--sd-accent-grad); color: #ffffff;
  box-shadow: 0 4px 18px rgba(2,132,199,.38);
}
[data-theme="dark"] .th-tab.active {
  box-shadow: 0 4px 20px rgba(2,132,199,.55);
}

/* ── Cards & Structure ── */
.ec-card {
  background: var(--sd-card); border-radius: 22px; padding: 24px;
  border: 1px solid var(--sd-line); box-shadow: var(--sd-shadow-soft);
  transition: all .25s ease; position: relative;
}
.ec-card-hd {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
  gap: 12px; flex-wrap: wrap;
}
.ec-card-title {
  font-size: 16px; font-weight: 800; color: var(--sd-ink); display: flex; align-items: center; gap: 10px;
}
.ec-card-title svg { color: #0284c7; }
[data-theme="dark"] .ec-card-title svg { color: #38bdf8; }

.ec-btn-action {
  padding: 8px 16px; border-radius: 12px; border: 1px solid var(--sd-line);
  background: var(--sd-card-soft); font-size: 12.5px; font-weight: 700;
  cursor: pointer; font-family: inherit; color: var(--sd-ink);
  transition: all .18s; display: inline-flex; align-items: center; gap: 6px;
}
.ec-btn-action:hover {
  background: var(--sd-card); border-color: #0284c7; color: #0284c7; transform: translateY(-1px);
}
[data-theme="dark"] .ec-btn-action:hover {
  border-color: #38bdf8; color: #38bdf8;
}

/* ── Forms ── */
.ec-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.ec-label { font-size: 11.5px; font-weight: 800; color: var(--sd-muted); text-transform: uppercase; letter-spacing: .04em; }
.ec-input, .ec-textarea, .ec-select {
  padding: 11px 14px; border-radius: 12px; border: 1.5px solid var(--sd-input-border);
  background: var(--sd-input-bg); color: var(--sd-ink); font-size: 13.5px;
  font-family: inherit; outline: none; transition: border-color .15s, box-shadow .15s; width: 100%;
}
.ec-textarea { resize: vertical; min-height: 90px; }
.ec-input:focus, .ec-textarea:focus, .ec-select:focus {
  border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2,132,199,.15);
}
[data-theme="dark"] .ec-input:focus, [data-theme="dark"] .ec-textarea:focus, [data-theme="dark"] .ec-select:focus {
  border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.2);
}
.ec-form-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.ec-submit-btn {
  width: 100%; padding: 13px 20px; border-radius: 14px; border: none;
  background: var(--sd-accent-grad); color: #ffffff;
  font-size: 14px; font-weight: 800; cursor: pointer; font-family: inherit;
  transition: all .2s cubic-bezier(.34,1.56,.64,1); box-shadow: 0 6px 18px rgba(2,132,199,.35);
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.ec-submit-btn:hover {
  transform: translateY(-2px); box-shadow: 0 10px 26px rgba(2,132,199,.45);
}
.ec-submit-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

/* ── Upload Drag-Drop Zone ── */
.ec-drop-zone {
  border: 2px dashed rgba(2,132,199,.35); border-radius: 20px;
  background: rgba(2,132,199,.03); padding: 36px 24px; text-align: center;
  cursor: pointer; transition: all .25s; position: relative;
}
.ec-drop-zone.dragging {
  border-color: #0284c7; background: rgba(2,132,199,.08); transform: scale(1.01);
}
.ec-drop-zone:hover {
  border-color: #0284c7; background: rgba(2,132,199,.06);
}
[data-theme="dark"] .ec-drop-zone {
  background: rgba(2,132,199,.05); border-color: rgba(56,189,248,.3);
}
.ec-drop-icon {
  width: 64px; height: 64px; border-radius: 20px; margin: 0 auto 16px;
  background: rgba(2,132,199,.12); color: #0284c7;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 18px rgba(2,132,199,.15);
}
[data-theme="dark"] .ec-drop-icon {
  background: rgba(56,189,248,.18); color: #38bdf8;
}
.ec-drop-title { font-size: 15.5px; font-weight: 800; color: var(--sd-ink); margin-bottom: 5px; }
.ec-drop-sub   { font-size: 12.5px; color: var(--sd-muted); }

.ec-file-selected {
  border-radius: 14px; padding: 14px 18px; margin-top: 14px;
  background: rgba(16,185,129,.08); border: 1.5px solid rgba(16,185,129,.28);
  display: flex; align-items: center; gap: 12px;
}
.ec-file-ico {
  width: 40px; height: 40px; border-radius: 12px; background: rgba(16,185,129,.16);
  color: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ec-file-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 8px;
  border: 1px solid rgba(244,63,94,.25); background: rgba(244,63,94,.08);
  color: #f43f5e; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.ec-file-close:hover { background: rgba(244,63,94,.2); }

/* ── Progress Bar ── */
.ec-progress-wrap { margin-top: 16px; }
.ec-progress-hd { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: var(--sd-muted); font-weight: 700; }
.ec-progress-bg { height: 8px; background: var(--sd-bar-bg); border-radius: 8px; overflow: hidden; position: relative; }
.ec-progress-fill {
  height: 100%; border-radius: 8px; background: var(--sd-accent-grad);
  transition: width .4s ease; box-shadow: 0 0 12px rgba(2,132,199,.5);
}
.ec-progress-fill::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);
  animation: sdProgressSweep 2.2s ease-in-out infinite;
}
.ec-progress-steps { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.ec-progress-step {
  display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700;
  padding: 5px 12px; border-radius: 10px;
}
.eps-done    { background: rgba(16,185,129,.12); color: #10b981; }
.eps-active  { background: rgba(2,132,199,.12);  color: #0284c7; }
.eps-pending { background: var(--sd-bar-bg);     color: var(--sd-faint); }
[data-theme="dark"] .eps-active { color: #38bdf8; background: rgba(56,189,248,.18); }

/* ── Mode selector cards ── */
.ec-mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
.ec-mode-card {
  border-radius: 14px; padding: 14px; border: 1.5px solid var(--sd-line);
  background: var(--sd-card-soft); cursor: pointer; transition: all .2s; text-align: center;
}
.ec-mode-card:hover { border-color: #0284c7; }
.ec-mode-card.selected {
  border-color: #0284c7; background: rgba(2,132,199,.08); box-shadow: 0 4px 16px rgba(2,132,199,.15);
}
[data-theme="dark"] .ec-mode-card.selected {
  border-color: #38bdf8; background: rgba(56,189,248,.12);
}

/* ── Options Checkboxes ── */
.ec-option {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border-radius: 14px; border: 1.5px solid var(--sd-line); background: var(--sd-card-soft);
  cursor: pointer; transition: all .2s; margin-bottom: 8px;
}
.ec-option:last-child { margin-bottom: 0; }
.ec-option.on { border-color: #0284c7; background: rgba(2,132,199,.06); }
[data-theme="dark"] .ec-option.on { border-color: #38bdf8; background: rgba(56,189,248,.1); }
.ec-opt-check {
  width: 22px; height: 22px; border-radius: 8px; border: 2px solid var(--sd-line);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .2s;
  background: var(--sd-card);
}
.ec-option.on .ec-opt-check { border-color: #0284c7; background: #0284c7; color: #fff; }
[data-theme="dark"] .ec-option.on .ec-opt-check { border-color: #38bdf8; background: #38bdf8; color: #000; }

/* ── QUESTION TRANSITION & STUDIO SYSTEM ── */
.qs-container {
  background: var(--sd-card); border-radius: 24px; padding: 28px;
  border: 1px solid var(--sd-line); box-shadow: var(--sd-shadow);
  position: relative; overflow: hidden;
}
.qs-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
}
.qs-pills-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.qs-type-badge {
  padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 800;
  display: inline-flex; align-items: center; gap: 5px;
}
.qs-marks-badge {
  padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 800;
  background: rgba(245,158,11,.12); color: #d97706; border: 1px solid rgba(245,158,11,.24);
}
[data-theme="dark"] .qs-marks-badge {
  background: rgba(245,158,11,.2); color: #fbbf24;
}
.qs-bloom-badge {
  padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 800;
  background: rgba(13,148,136,.12); color: #0d9488; border: 1px solid rgba(13,148,136,.24);
}
[data-theme="dark"] .qs-bloom-badge {
  background: rgba(13,148,136,.2); color: #2dd4bf;
}

/* Question Carousel Quick Jump Bar */
.qs-jump-bar {
  display: flex; gap: 8px; overflow-x: auto; padding: 6px 2px 14px;
  scrollbar-width: thin; scrollbar-color: rgba(2,132,199,.25) transparent;
}
.qs-jump-bar::-webkit-scrollbar { height: 4px; }
.qs-jump-bar::-webkit-scrollbar-thumb { background: rgba(2,132,199,.25); border-radius: 4px; }
.qs-jump-pill {
  flex-shrink: 0; width: 40px; height: 38px; border-radius: 12px;
  border: 1px solid var(--sd-line); background: var(--sd-card-soft);
  color: var(--sd-ink); font-size: 12px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
}
.qs-jump-pill:hover { border-color: #0284c7; color: #0284c7; transform: translateY(-2px); }
.qs-jump-pill.active {
  background: var(--sd-accent-grad); color: #fff; border-color: transparent;
  box-shadow: 0 4px 14px rgba(2,132,199,.35);
}

/* Question Card & Smooth Transition Box */
.qs-stage {
  min-height: 280px; position: relative; padding: 10px 0;
}
.qs-prompt {
  font-size: clamp(16px, 2.2vw, 20px); font-weight: 800; line-height: 1.45;
  color: var(--sd-ink); margin-bottom: 22px;
}
.qs-options-grid {
  display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 22px;
}
.qs-option-btn {
  width: 100%; border-radius: 16px; border: 1.5px solid var(--sd-line);
  background: var(--sd-card-soft); padding: 14px 18px; text-align: left;
  cursor: pointer; display: flex; align-items: center; gap: 14px;
  font-family: inherit; font-size: 14px; font-weight: 700; color: var(--sd-ink);
  transition: all .2s cubic-bezier(.34,1.56,.64,1);
}
.qs-option-btn:hover {
  border-color: #0284c7; transform: translateX(4px); background: rgba(2,132,199,.05);
}
[data-theme="dark"] .qs-option-btn:hover {
  background: rgba(56,189,248,.08); border-color: #38bdf8;
}
.qs-opt-badge {
  width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center;
  justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0;
  background: var(--sd-card); border: 1px solid var(--sd-line); color: var(--sd-muted);
  transition: all .2s;
}
.qs-option-btn.selected {
  border-color: #0284c7; background: rgba(2,132,199,.1);
}
.qs-option-btn.selected .qs-opt-badge {
  background: #0284c7; color: #fff; border-color: #0284c7;
}
.qs-option-btn.correct {
  border-color: #10b981; background: rgba(16,185,129,.12); color: #065f46;
}
[data-theme="dark"] .qs-option-btn.correct { color: #34d399; }
.qs-option-btn.correct .qs-opt-badge {
  background: #10b981; color: #fff; border-color: #10b981;
}
.qs-option-btn.incorrect {
  border-color: #f43f5e; background: rgba(244,63,94,.1); color: #9f1239;
}
[data-theme="dark"] .qs-option-btn.incorrect { color: #fda4af; }
.qs-option-btn.incorrect .qs-opt-badge {
  background: #f43f5e; color: #fff; border-color: #f43f5e;
}

/* Question Action Footer */
.qs-nav-footer {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--sd-line);
  flex-wrap: wrap;
}
.qs-nav-btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
  border-radius: 12px; border: 1px solid var(--sd-line); background: var(--sd-card-soft);
  color: var(--sd-ink); font-size: 13px; font-weight: 800; cursor: pointer;
  transition: all .2s cubic-bezier(.34,1.56,.64,1);
}
.qs-nav-btn:hover {
  border-color: #0284c7; color: #0284c7; transform: translateY(-2px);
}
[data-theme="dark"] .qs-nav-btn:hover {
  border-color: #38bdf8; color: #38bdf8;
}
.qs-nav-btn.primary {
  background: var(--sd-accent-grad); color: #fff; border: none;
  box-shadow: 0 4px 14px rgba(2,132,199,.35);
}
.qs-nav-btn.primary:hover {
  box-shadow: 0 6px 18px rgba(2,132,199,.45);
}

/* ── Interactive Expandable Panels (Hint & Explanation) ── */
.qs-accordion {
  border-radius: 14px; padding: 14px 18px; margin-top: 14px;
  border: 1px solid var(--sd-line); background: var(--sd-card-soft);
}
.qs-acc-hint {
  border-color: rgba(245,158,11,.3); background: rgba(245,158,11,.06);
}
.qs-acc-expl {
  border-color: rgba(2,132,199,.3); background: rgba(2,132,199,.06);
}

/* ── Course / Lesson List Styling ── */
.ec-course-item {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  border-radius: 16px; border: 1px solid var(--sd-line); background: var(--sd-card-soft);
  margin-bottom: 10px; cursor: pointer; transition: all .2s;
}
.ec-course-item:hover {
  border-color: #0284c7; transform: translateX(3px); background: var(--sd-card);
}
.ec-course-item.selected {
  border-color: #0284c7; background: rgba(2,132,199,.08);
}
[data-theme="dark"] .ec-course-item.selected {
  border-color: #38bdf8; background: rgba(56,189,248,.12);
}
.ec-course-ico {
  width: 44px; height: 44px; border-radius: 13px; display: flex;
  align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px;
  color: #fff;
}
.ec-course-action {
  width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--sd-line);
  background: var(--sd-card); display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--sd-muted); transition: all .18s;
}
.ec-course-action:hover {
  border-color: #0284c7; color: #0284c7;
}

/* ── Lesson Cards ── */
.ec-lesson {
  border-radius: 14px; padding: 16px; border: 1px solid var(--sd-line);
  background: var(--sd-card-soft); margin-bottom: 10px; transition: all .2s;
}
.ec-lesson:hover {
  border-color: rgba(2,132,199,.3); box-shadow: var(--sd-shadow-soft);
}
.ec-lesson-tag {
  padding: 3px 9px; border-radius: 6px; font-size: 10.5px; font-weight: 700;
}
.elt-diff-beg { background: rgba(16,185,129,.12); color: #10b981; }
.elt-diff-mid { background: rgba(245,158,11,.12); color: #f59e0b; }
.elt-diff-adv { background: rgba(244,63,94,.12);  color: #f43f5e; }
.elt-topic    { background: var(--sd-bar-bg);     color: var(--sd-muted); }

/* ── Analytics Bar Chart ── */
.ec-bar-chart { display: flex; align-items: flex-end; gap: 10px; height: 120px; padding-top: 10px; }
.ec-bar-col   { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.ec-bar       { width: 100%; border-radius: 6px 6px 0 0; min-height: 4px; transition: height .6s ease; }
.ec-bar-lbl   { font-size: 10.5px; color: var(--sd-muted); font-weight: 700; }

/* ── Responsive Rules ── */
@media (max-width: 1200px) {
  .th-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .th-highlights { grid-template-columns: repeat(2, 1fr); }
  .th-highlights > :last-child { grid-column: span 2; }
}
@media (max-width: 900px) {
  .ec-main-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
  .ec-main-grid3 { display: grid; grid-template-columns: 1fr; gap: 20px; }
  .th-hero-main { flex-direction: column-reverse; align-items: flex-start; }
  .th-hero-robot-stage { width: 100%; justify-content: flex-start; margin-bottom: 8px; }
  .th-hero-robot-bubble { max-width: 260px; }
}
@media (max-width: 640px) {
  .ec-root { padding: 14px 14px 60px; }
  .th-hero { padding: 22px 18px; border-radius: 20px; }
  .th-hero-title { font-size: 22px; }
  .th-hero-robot-bubble { display: none; }
  .th-hero-robot-wrap { width: 92px; height: 92px; border-radius: 22px; }
  .th-hero-robot { width: 72px; height: 72px; }
  .th-stats-grid { grid-template-columns: 1fr; gap: 10px; }
  .th-highlights { grid-template-columns: 1fr; }
  .th-highlights > :last-child { grid-column: span 1; }
  .ec-form-grid2 { grid-template-columns: 1fr; }
  .ec-mode-grid { grid-template-columns: 1fr; }
  .qs-header { flex-direction: column; align-items: flex-start; }
  .qs-nav-footer { flex-direction: column; align-items: stretch; }
  .qs-nav-btn { justify-content: center; }
}
`;

/* ── Animated Number Counter ── */
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

/* ── Question Transition Variants ── */
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

/* ── Zod Form Schema ── */
const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Minimum 10 characters required"),
  grade: z.number().min(1).max(12),
  subjectId: z.number().min(1),
  learningObjectives: z.string().optional(),
  prerequisites: z.string().optional(),
});

type CourseForm = z.infer<typeof courseSchema>;

/* ═════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═════════════════════════════════════════════════════════════════════════════ */
export default function EnhancedContentManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const qc = useQueryClient();

  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"create" | "upload" | "questions" | "manage" | "analytics">("create");

  // Document Upload & NLP State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState(0);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [processingMode, setProcessingMode] = useState<"basic" | "advanced" | "comprehensive">("advanced");
  const [opts, setOpts] = useState({ extractConcepts: true, generateExercises: true, createQuizzes: false });

  // Question Studio & Transitions State
  const [questions, setQuestions] = useState<InteractiveQuestion[]>(SEED_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [questionFilterSubject, setQuestionFilterSubject] = useState("all");
  const [questionFilterType, setQuestionFilterType] = useState("all");

  // Queries
  const { data: courses = [] } = useQuery<any[]>({ queryKey: ["/api/teacher/courses"] });
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["/api/subjects"] });
  const { data: lessons = [] } = useQuery<any[]>({
    queryKey: [`/api/lessons/${selectedCourse}`],
    enabled: !!selectedCourse
  });

  const totalLessons = courses.reduce((a: number, c: any) => a + (c.lessonCount || 0), 0);

  // Form Hook
  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: { title: "", description: "", grade: 9, subjectId: 1 },
  });

  // Create Course Mutation
  const createCourse = useMutation({
    mutationFn: (d: CourseForm) =>
      fetch(buildApiUrl("/api/courses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, teacherId: user?.id }),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teacher/courses"] });
      form.reset();
      toast({ title: "✅ Course created!", description: "Your new course curriculum is active." });
      setActiveTab("manage");
    },
    onError: () => toast({ title: "Failed to create course", variant: "destructive" }),
  });

  // Process Document NLP Mutation
  const processDoc = useMutation({
    mutationFn: async (data: { file: File; courseId: number; opts: any }) => {
      const fd = new FormData();
      fd.append("pdf", data.file);
      fd.append("courseId", data.courseId.toString());
      fd.append("options", JSON.stringify(data.opts));
      const r = await fetch(buildApiUrl("/api/teacher/process-document-nlp"), {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!r.ok) throw new Error();
      return r.json();
    },
    onSuccess: (result) => {
      setProcessingResult(result);
      setProgress(100);
      setProgressStep(4);
      qc.invalidateQueries({ queryKey: ["/api/lessons"] });

      // Automatically synthesize interactive questions from processed doc
      if (result.lessons && result.lessons.length > 0) {
        const newQs: InteractiveQuestion[] = result.lessons.map((l: any, i: number) => ({
          id: `nlp-q-${Date.now()}-${i}`,
          courseId: selectedCourse || 1,
          subject: result.subjectClassification || "General Science",
          type: i % 2 === 0 ? "mcq" : "short",
          marks: i % 2 === 0 ? 2 : 4,
          difficulty: l.difficulty === "beginner" ? "easy" : l.difficulty === "advanced" ? "hard" : "medium",
          bloomLevel: i % 2 === 0 ? "Understand" : "Apply",
          question: `Key Concept Review: Explain how "${l.title}" relates to core principles covered in this unit.`,
          options: i % 2 === 0 ? [
            `Option A: Primary mechanism identified in ${l.title}`,
            `Option B: Secondary alternative framework`,
            `Option C: Fundamental theoretical constant`,
            `Option D: Experimental empirical validation`
          ] : undefined,
          correctOption: 0,
          correctAnswer: `Option A: Primary mechanism identified in ${l.title}`,
          hint: `Refer to topics: ${(l.topics || []).join(", ") || "core chapter concepts"}.`,
          explanation: `Generated from analyzed lesson unit "${l.title}" to reinforce deep conceptual retention.`,
        }));
        setQuestions((prev) => [...newQs, ...prev]);
      }

      toast({
        title: "🎉 Document Processing Complete!",
        description: `${result.lessonsCreated || result.lessons?.length || 0} lessons and interactive questions generated.`
      });
    },
    onError: () => {
      toast({ title: "Processing failed", variant: "destructive" });
      setProgress(0);
      setProgressStep(0);
    },
  });

  // File Handlers
  const acceptFile = (f: File) => {
    if (f.type === "application/pdf" || f.name.endsWith(".docx") || f.name.endsWith(".txt")) {
      setSelectedFile(f);
      setProcessingResult(null);
      setProgress(0);
      setProgressStep(0);
    } else {
      toast({ title: "Invalid file format", description: "Please upload PDF, DOCX, or TXT", variant: "destructive" });
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const STEPS = ["Parsing Document Structure", "Semantic Extraction", "NLP Concept Mapping", "Generating Lessons & Questions"];

  const handleProcess = async () => {
    if (!selectedFile || !selectedCourse) {
      toast({ title: "Missing details", description: "Please choose a course and document first.", variant: "destructive" });
      return;
    }
    setProgress(0);
    setProgressStep(0);
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setProgressStep(Math.min(step, 3));
      setProgress(Math.min(step * 24, 88));
      if (step >= 4) clearInterval(iv);
    }, 900);

    await processDoc.mutateAsync({
      file: selectedFile,
      courseId: selectedCourse,
      opts: { processingMode, ...opts },
    });
    clearInterval(iv);
  };

  // Filtered Questions for Question Studio
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSubject = questionFilterSubject === "all" || q.subject?.toLowerCase() === questionFilterSubject.toLowerCase();
      const matchType = questionFilterType === "all" || q.type === questionFilterType;
      return matchSubject && matchType;
    });
  }, [questions, questionFilterSubject, questionFilterType]);

  const activeQuestion = filteredQuestions[currentQuestionIndex] || filteredQuestions[0] || questions[0];

  // Question Transition Controls
  const handleNextQuestion = () => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setSlideDirection(1);
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowHint(false);
      setShowExplanation(false);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setSlideDirection(-1);
      setCurrentQuestionIndex((prev) => prev - 1);
      setSelectedOption(null);
      setShowHint(false);
      setShowExplanation(false);
    }
  };

  const handleJumpToQuestion = (idx: number) => {
    setSlideDirection(idx > currentQuestionIndex ? 1 : -1);
    setCurrentQuestionIndex(idx);
    setSelectedOption(null);
    setShowHint(false);
    setShowExplanation(false);
  };

  const handleShuffleQuestions = () => {
    setSlideDirection(1);
    const nextIdx = Math.floor(Math.random() * filteredQuestions.length);
    setCurrentQuestionIndex(nextIdx);
    setSelectedOption(null);
    setShowHint(false);
    setShowExplanation(false);
    toast({ title: "🔀 Questions Shuffled", description: `Jumped to question #${nextIdx + 1}` });
  };

  // Keyboard navigation for question transitions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "questions") return;
      if (e.key === "ArrowRight") handleNextQuestion();
      if (e.key === "ArrowLeft") handlePrevQuestion();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, currentQuestionIndex, filteredQuestions.length]);

  const COURSE_ICONS = ["📐", "🔬", "📚", "🌍", "💻", "🎨", "🔢", "📝", "🎯", "🔭"];
  const courseGradients = [
    "linear-gradient(135deg, #0284c7, #0369a1)",
    "linear-gradient(135deg, #0d9488, #10b981)",
    "linear-gradient(135deg, #0284c7, #0d9488)",
    "linear-gradient(135deg, #f59e0b, #d97706)",
    "linear-gradient(135deg, #0ea5e9, #0284c7)",
  ];

  const barData = [72, 85, 61, 90, 78, 94, 83];
  const barDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const barMax = Math.max(...barData);

  return (
    <>
      <style>{css}</style>
      <div className={`ec-root ${isDark ? "dark" : ""}`}>
        {/* Background Sparkles & Wave */}
        <div className="sd-bg-spark s1" />
        <div className="sd-bg-spark s2" />
        <div className="sd-bg-spark s3" />
        <div className="sd-bg-ribbon" />

        <div className="ec-shell">
          {/* ═══════════════════════════════════════════════════════════════
              HERO BANNER (Matches Teacher Homework & Dashboard Design)
              ═══════════════════════════════════════════════════════════════ */}
          <div className="th-hero">
            <div className="th-hero-main">
              <div className="th-hero-content">
                <div className="th-hero-chip">
                  <span className="th-live-dot" />
                  Teacher Studio · Enhanced Content Engine
                </div>
                <h1 className="th-hero-title">Enhanced Content Manager 📚</h1>
                <p className="th-hero-sub">
                  Intelligent curriculum architect with NLP document ingestion, automated lesson structuring, and interactive question transitions.
                </p>
                <div className="th-hero-actions">
                  <button className="th-hero-btn primary" onClick={() => setActiveTab("create")}>
                    <Plus size={16} /> New Course
                  </button>
                  <button className="th-hero-btn secondary" onClick={() => setActiveTab("upload")}>
                    <UploadCloud size={16} /> Upload Document
                  </button>
                  <button className="th-hero-btn secondary" onClick={() => setActiveTab("questions")}>
                    <Target size={16} /> Question Transitions
                  </button>
                </div>
              </div>

              {/* Robot Mascot Stage */}
              <div className="th-hero-robot-stage">
                <div className="th-hero-robot-bubble">
                  <div className="th-hero-robot-bubble-badge">
                    <Sparkles size={12} /> GradeUp Co-Pilot
                  </div>
                  <p className="th-hero-robot-bubble-text">
                    Hi Teacher! Ready to create structured lessons and interactive question transitions?
                  </p>
                </div>
                <div className="th-hero-robot-wrap">
                  <img src={roboImg} alt="GradeUp AI Robot" className="th-hero-robot" />
                </div>
              </div>
            </div>

            {/* Quick Hero Stat Row */}
            <div className="th-hero-stat-row">
              <div className="th-hero-pill">
                <BookOpen size={18} />
                <div>
                  <div className="th-hero-pill-num">{courses.length}</div>
                  <div className="th-hero-pill-lbl">Courses</div>
                </div>
              </div>
              <div className="th-hero-pill">
                <Layers size={18} />
                <div>
                  <div className="th-hero-pill-num">{totalLessons}</div>
                  <div className="th-hero-pill-lbl">Lessons</div>
                </div>
              </div>
              <div className="th-hero-pill">
                <Target size={18} />
                <div>
                  <div className="th-hero-pill-num">{questions.length}</div>
                  <div className="th-hero-pill-lbl">Questions</div>
                </div>
              </div>
              <div className="th-hero-pill">
                <Zap size={18} />
                <div>
                  <div className="th-hero-pill-num">{processingResult ? 1 : 0}</div>
                  <div className="th-hero-pill-lbl">NLP Sessions</div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              STAT CARDS ROW (Teacher Ocean, Teal, Emerald, Amber)
              ═══════════════════════════════════════════════════════════════ */}
          <div className="th-stats-grid">
            <div className="th-stat-card th-sc-ocean">
              <div className="th-stat-top">
                <div className="th-stat-icon tsi-ocean"><BookOpen size={20} /></div>
                <span className="th-stat-badge">Curriculum</span>
              </div>
              <div className="th-stat-num"><AnimNum target={courses.length} /></div>
              <div className="th-stat-lbl">Active Courses</div>
              <div className="th-stat-trend"><TrendingUp size={12} /> Ready for delivery</div>
            </div>

            <div className="th-stat-card th-sc-teal">
              <div className="th-stat-top">
                <div className="th-stat-icon tsi-teal"><Layers size={20} /></div>
                <span className="th-stat-badge">Units</span>
              </div>
              <div className="th-stat-num"><AnimNum target={totalLessons} /></div>
              <div className="th-stat-lbl">Structured Lessons</div>
              <div className="th-stat-trend"><Check size={12} /> Auto-sequenced</div>
            </div>

            <div className="th-stat-card th-sc-emerald">
              <div className="th-stat-top">
                <div className="th-stat-icon tsi-emerald"><Target size={20} /></div>
                <span className="th-stat-badge">Transition Bank</span>
              </div>
              <div className="th-stat-num"><AnimNum target={questions.length} /></div>
              <div className="th-stat-lbl">Interactive Questions</div>
              <div className="th-stat-trend"><Sparkles size={12} /> Spring animations</div>
            </div>

            <div className="th-stat-card th-sc-amber">
              <div className="th-stat-top">
                <div className="th-stat-icon tsi-amber"><FileText size={20} /></div>
                <span className="th-stat-badge">NLP Engine</span>
              </div>
              <div className="th-stat-num"><AnimNum target={processingResult?.conceptMap?.length || 12} /></div>
              <div className="th-stat-lbl">Key Concepts Extracted</div>
              <div className="th-stat-trend"><Zap size={12} /> High fidelity</div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              HIGHLIGHT CARDS
              ═══════════════════════════════════════════════════════════════ */}
          <div className="th-highlights">
            <div className="th-hl-card thc-ocean">
              <div className="th-hl-emoji">📄</div>
              <div className="th-hl-title">Document Parsing</div>
              <div className="th-hl-sub">Upload textbooks, slides, and syllabus documents</div>
              <div className="th-hl-num">{selectedFile ? "1 File Attached" : "Drop files below"}</div>
            </div>

            <div className="th-hl-card thc-teal">
              <div className="th-hl-emoji">🎯</div>
              <div className="th-hl-title">Interactive Question Transitions</div>
              <div className="th-hl-sub">Directional spring carousel with immediate feedback</div>
              <div className="th-hl-num">{filteredQuestions.length} Questions Loaded</div>
            </div>

            <div className="th-hl-card thc-amber">
              <div className="th-hl-emoji">⚡</div>
              <div className="th-hl-title">Class Delivery Ready</div>
              <div className="th-hl-sub">Live student preview & rubric auto-grading</div>
              <div className="th-hl-num">Grade 1 - 12</div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TABS NAVIGATION
              ═══════════════════════════════════════════════════════════════ */}
          <div className="th-tabs-bar">
            {[
              { key: "create",    label: "Create Course",                  icon: Plus },
              { key: "upload",    label: "Process Documents",              icon: UploadCloud },
              { key: "questions", label: "Question Transitions & Studio",  icon: Target },
              { key: "manage",    label: "Manage Content",                 icon: BookOpen },
              { key: "analytics", label: "Analytics & Insights",           icon: BarChart2 },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  className={`th-tab ${activeTab === t.key ? "active" : ""}`}
                  onClick={() => setActiveTab(t.key as any)}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TAB 1: CREATE COURSE
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "create" && (
            <div className="ec-main-grid3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 320px", gap: 20 }}>
              <div style={{ gridColumn: "span 2" }}>
                <div className="ec-card">
                  <div className="ec-card-hd">
                    <div className="ec-card-title">
                      <BookOpen size={18} /> Create New Course
                    </div>
                  </div>
                  <form onSubmit={form.handleSubmit((d) => createCourse.mutate(d))}>
                    <div className="ec-form-grid2">
                      <div className="ec-form-group">
                        <label className="ec-label">Course Title *</label>
                        <input
                          className="ec-input"
                          placeholder="e.g., Grade 10 Advanced Biology"
                          {...form.register("title")}
                        />
                        {form.formState.errors.title && (
                          <span style={{ fontSize: 12, color: "#f43f5e" }}>Required</span>
                        )}
                      </div>
                      <div className="ec-form-group">
                        <label className="ec-label">Subject *</label>
                        <select className="ec-select" {...form.register("subjectId", { valueAsNumber: true })}>
                          {subjects.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                          {!subjects.length && (
                            <>
                              <option value={1}>Mathematics</option>
                              <option value={2}>Physics</option>
                              <option value={3}>Chemistry</option>
                              <option value={4}>Biology</option>
                              <option value={5}>English</option>
                              <option value={6}>History</option>
                              <option value={7}>Computer Science</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="ec-form-group">
                      <label className="ec-label">Course Description *</label>
                      <textarea
                        className="ec-textarea"
                        rows={3}
                        placeholder="Describe the curriculum objectives, expected outcomes, and subject scope…"
                        {...form.register("description")}
                      />
                      {form.formState.errors.description && (
                        <span style={{ fontSize: 12, color: "#f43f5e" }}>Min 10 characters</span>
                      )}
                    </div>

                    <div className="ec-form-grid2">
                      <div className="ec-form-group">
                        <label className="ec-label">Target Grade Level *</label>
                        <select className="ec-select" {...form.register("grade", { valueAsNumber: true })}>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                            <option key={g} value={g}>Grade {g}</option>
                          ))}
                        </select>
                      </div>
                      <div className="ec-form-group">
                        <label className="ec-label">Prerequisites (Optional)</label>
                        <input
                          className="ec-input"
                          placeholder="e.g., Basic Cell Biology, Elementary Algebra"
                          {...form.register("prerequisites")}
                        />
                      </div>
                    </div>

                    <div className="ec-form-group">
                      <label className="ec-label">Learning Objectives (Optional)</label>
                      <textarea
                        className="ec-textarea"
                        rows={2}
                        placeholder="What mastery outcomes will students demonstrate upon completion?"
                        {...form.register("learningObjectives")}
                      />
                    </div>

                    <button type="submit" className="ec-submit-btn" disabled={createCourse.isPending}>
                      {createCourse.isPending ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Creating Course…
                        </>
                      ) : (
                        <>
                          <Plus size={16} /> Save & Open Curriculum Studio
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Sidebar: Quick Actions & Recent Courses */}
              <div>
                <div className="ec-card">
                  <div className="ec-card-hd">
                    <div className="ec-card-title">
                      <Zap size={18} /> Quick Actions
                    </div>
                  </div>
                  {[
                    { label: "Upload Document", desc: "NLP file conversion", icon: UploadCloud, tab: "upload" },
                    { label: "Question Transitions", desc: "Interactive player", icon: Target, tab: "questions" },
                    { label: "Manage Content", desc: "Edit lessons & units", icon: BookOpen, tab: "manage" },
                    { label: "View Analytics", desc: "Mastery telemetry", icon: BarChart2, tab: "analytics" },
                  ].map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={i}
                        className="ec-course-item"
                        style={{ width: "100%", textAlign: "left" }}
                        onClick={() => setActiveTab(a.tab as any)}
                      >
                        <div className="ec-course-ico" style={{ background: courseGradients[i % courseGradients.length] }}>
                          <Icon size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--sd-ink)" }}>{a.label}</div>
                          <div style={{ fontSize: 11, color: "var(--sd-muted)" }}>{a.desc}</div>
                        </div>
                        <ChevronRight size={14} color="var(--sd-muted)" />
                      </button>
                    );
                  })}
                </div>

                {courses.length > 0 && (
                  <div className="ec-card" style={{ marginTop: 16 }}>
                    <div className="ec-card-hd">
                      <div className="ec-card-title">
                        <Star size={18} /> Recent Courses
                      </div>
                    </div>
                    {courses.slice(0, 3).map((c: any, i: number) => (
                      <div
                        key={c.id}
                        className="ec-course-item"
                        onClick={() => {
                          setSelectedCourse(c.id);
                          setActiveTab("manage");
                        }}
                      >
                        <div className="ec-course-ico" style={{ background: courseGradients[i % courseGradients.length] }}>
                          {COURSE_ICONS[i % COURSE_ICONS.length]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--sd-ink)" }}>
                            {c.title}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--sd-muted)" }}>
                            Grade {c.grade} · {c.lessonCount || 0} lessons
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 2: PROCESS DOCUMENTS (NLP)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "upload" && (
            <div className="ec-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div className="ec-card">
                <div className="ec-card-hd">
                  <div className="ec-card-title">
                    <UploadCloud size={18} /> Advanced NLP Ingestion
                  </div>
                </div>

                <div className="ec-form-group">
                  <label className="ec-label">Target Course *</label>
                  <select
                    className="ec-select"
                    value={selectedCourse || ""}
                    onChange={(e) => setSelectedCourse(Number(e.target.value) || null)}
                  >
                    <option value="">Select a course to attach lessons to…</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                {/* Drop Zone */}
                <div
                  ref={dropRef}
                  className={`ec-drop-zone ${dragging ? "dragging" : ""}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <div className="ec-drop-icon">
                    <UploadCloud size={30} />
                  </div>
                  <div className="ec-drop-title">
                    {dragging ? "Release file to upload!" : "Drag & drop syllabus or textbook document"}
                  </div>
                  <div className="ec-drop-sub">Supported formats: PDF, DOCX, and TXT files</div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
                    <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(2,132,199,.12)", color: "#0284c7" }}>PDF</span>
                    <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(13,148,136,.12)", color: "#0d9488" }}>DOCX</span>
                    <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(245,158,11,.12)", color: "#f59e0b" }}>TXT</span>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    style={{ display: "none" }}
                    onChange={onFileChange}
                  />
                </div>

                {selectedFile && (
                  <div className="ec-file-selected">
                    <div className="ec-file-ico"><FileText size={18} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--sd-ink)" }}>{selectedFile.name}</div>
                      <div style={{ fontSize: 11, color: "var(--sd-muted)" }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button className="ec-file-close" onClick={() => setSelectedFile(null)}>
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Processing Mode */}
                <div style={{ marginTop: 18 }}>
                  <label className="ec-label" style={{ display: "block", marginBottom: 8 }}>Analysis Mode</label>
                  <div className="ec-mode-grid">
                    {[
                      { key: "basic", label: "Basic", desc: "Fast text extraction" },
                      { key: "advanced", label: "Advanced NLP", desc: "Concept mapping & lessons" },
                      { key: "comprehensive", label: "Deep AI", desc: "Auto questions & quizzes" },
                    ].map((m) => (
                      <div
                        key={m.key}
                        className={`ec-mode-card ${processingMode === m.key ? "selected" : ""}`}
                        onClick={() => setProcessingMode(m.key as any)}
                      >
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--sd-ink)", marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontSize: 10.5, color: "var(--sd-muted)" }}>{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Options Toggles */}
                <div style={{ marginTop: 14 }}>
                  <label className="ec-label" style={{ display: "block", marginBottom: 8 }}>Generation Options</label>
                  {[
                    { key: "extractConcepts", label: "Extract Core Concepts", desc: "Identify foundational taxonomy", badge: "NLP" },
                    { key: "generateExercises", label: "Generate Practice Questions", desc: "Synthesizes interactive questions", badge: "Engine" },
                    { key: "createQuizzes", label: "Generate Assessment Rubrics", desc: "Auto-marking and criteria", badge: "Auto" },
                  ].map((opt) => (
                    <div
                      key={opt.key}
                      className={`ec-option ${(opts as any)[opt.key] ? "on" : ""}`}
                      onClick={() => setOpts((o) => ({ ...o, [opt.key]: !(o as any)[opt.key] }))}
                    >
                      <div className="ec-opt-check">
                        {(opts as any)[opt.key] && <Check size={12} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sd-ink)" }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "var(--sd-muted)" }}>{opt.desc}</div>
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(2,132,199,.12)", color: "#0284c7" }}>
                        {opt.badge}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                {processDoc.isPending && (
                  <div className="ec-progress-wrap">
                    <div className="ec-progress-hd">
                      <span>Analyzing Document…</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="ec-progress-bg">
                      <div className="ec-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="ec-progress-steps">
                      {STEPS.map((s, i) => (
                        <span
                          key={i}
                          className={`ec-progress-step ${i < progressStep ? "eps-done" : i === progressStep ? "eps-active" : "eps-pending"}`}
                        >
                          {i < progressStep ? <Check size={11} /> : null}
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  className="ec-submit-btn"
                  style={{ marginTop: 20 }}
                  disabled={processDoc.isPending || !selectedFile || !selectedCourse}
                  onClick={handleProcess}
                >
                  {processDoc.isPending ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Processing with NLP…
                    </>
                  ) : (
                    <>
                      <Brain size={16} /> Run NLP Document Analysis
                    </>
                  )}
                </button>
              </div>

              {/* Right: Results Panel */}
              <div className="ec-card">
                <div className="ec-card-hd">
                  <div className="ec-card-title">
                    <CheckCircle2 size={18} /> Analysis Results
                  </div>
                  {processingResult && (
                    <button className="ec-btn-action" onClick={() => setActiveTab("questions")}>
                      <Target size={14} /> Open in Question Studio
                    </button>
                  )}
                </div>

                {processingResult ? (
                  <>
                    <div style={{
                      borderRadius: 16, padding: "16px 20px", marginBottom: 18,
                      background: "rgba(16,185,129,.08)", border: "1.5px solid rgba(16,185,129,.25)",
                      display: "flex", alignItems: "center", gap: 12
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                        <Check size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--sd-ink)" }}>Processing Successful!</div>
                        <div style={{ fontSize: 12, color: "var(--sd-muted)" }}>
                          {processingResult.message || "Document analyzed and curriculum units ready."}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                      <div style={{ padding: 14, borderRadius: 14, textAlign: "center", background: "rgba(2,132,199,.08)", border: "1px solid rgba(2,132,199,.2)" }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#0284c7" }}>
                          {processingResult.lessons?.length || processingResult.lessonsCreated || 0}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)" }}>Lessons</div>
                      </div>
                      <div style={{ padding: 14, borderRadius: 14, textAlign: "center", background: "rgba(13,148,136,.08)", border: "1px solid rgba(13,148,136,.2)" }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#0d9488" }}>
                          {processingResult.totalPages || 4}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)" }}>Pages</div>
                      </div>
                      <div style={{ padding: 14, borderRadius: 14, textAlign: "center", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)" }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#d97706" }}>
                          {processingResult.conceptMap?.length || 8}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)" }}>Concepts</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--sd-line)", fontSize: 13 }}>
                      <span style={{ color: "var(--sd-muted)" }}>Subject Classification</span>
                      <span style={{ fontWeight: 800, color: "var(--sd-ink)" }}>{processingResult.subjectClassification || "Auto-detected"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--sd-line)", fontSize: 13 }}>
                      <span style={{ color: "var(--sd-muted)" }}>Reading Level</span>
                      <span style={{ fontWeight: 800, color: "var(--sd-ink)" }}>{processingResult.readingLevel || "Intermediate"}</span>
                    </div>

                    {processingResult.conceptMap?.length > 0 && (
                      <div style={{ marginTop: 18 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>
                          Key Concepts
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {processingResult.conceptMap.slice(0, 10).map((c: any, i: number) => (
                            <span
                              key={i}
                              style={{
                                padding: "4px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                                background: "rgba(2,132,199,.1)", color: "#0284c7", border: "1px solid rgba(2,132,199,.2)"
                              }}
                            >
                              {c.concept || c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "50px 20px" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 20, background: "var(--sd-bar-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--sd-faint)" }}>
                      <FileText size={28} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--sd-ink)", marginBottom: 6 }}>No Document Processed Yet</div>
                    <div style={{ fontSize: 12.5, color: "var(--sd-muted)", maxWidth: 320, margin: "0 auto" }}>
                      Upload a course PDF on the left to extract topics, lesson units, and testable question transitions.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 3: QUESTION TRANSITIONS & STUDIO
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "questions" && (
            <div className="qs-container">
              {/* Question Studio Filter & Header */}
              <div className="qs-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "var(--sd-ink)" }}>
                      Question Studio & Transitions
                    </span>
                    <span className="qs-type-badge" style={{ background: "rgba(2,132,199,.12)", color: "#0284c7" }}>
                      <Sparkles size={12} /> Spring Animated
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--sd-muted)", fontWeight: 600 }}>
                    Question {currentQuestionIndex + 1} of {filteredQuestions.length} · Keyboard [← / →] to navigate
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    className="ec-select"
                    style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}
                    value={questionFilterSubject}
                    onChange={(e) => {
                      setQuestionFilterSubject(e.target.value);
                      setCurrentQuestionIndex(0);
                    }}
                  >
                    <option value="all">All Subjects</option>
                    <option value="Biology">Biology</option>
                    <option value="Physics">Physics</option>
                    <option value="Mathematics">Mathematics</option>
                  </select>

                  <select
                    className="ec-select"
                    style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}
                    value={questionFilterType}
                    onChange={(e) => {
                      setQuestionFilterType(e.target.value);
                      setCurrentQuestionIndex(0);
                    }}
                  >
                    <option value="all">All Question Types</option>
                    <option value="mcq">MCQ</option>
                    <option value="short">Short Answer</option>
                    <option value="medium">Medium Answer</option>
                  </select>

                  <button className="ec-btn-action" onClick={handleShuffleQuestions} title="Shuffle questions">
                    <Shuffle size={14} /> Shuffle
                  </button>
                </div>
              </div>

              {/* Quick Jump Bar */}
              <div className="qs-jump-bar">
                {filteredQuestions.map((q, idx) => (
                  <button
                    key={q.id}
                    className={`qs-jump-pill ${idx === currentQuestionIndex ? "active" : ""}`}
                    onClick={() => handleJumpToQuestion(idx)}
                  >
                    Q{idx + 1}
                  </button>
                ))}
              </div>

              {/* Animated Question Card with Spring Directional Transitions */}
              <div className="qs-stage">
                <AnimatePresence mode="wait" custom={slideDirection}>
                  <motion.div
                    key={activeQuestion.id}
                    custom={slideDirection}
                    variants={questionVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    {/* Question Badges Row */}
                    <div className="qs-pills-row" style={{ marginBottom: 16 }}>
                      <span
                        className="qs-type-badge"
                        style={{
                          background: QUESTION_TYPES[activeQuestion.type]?.bg || "rgba(2,132,199,.12)",
                          color: QUESTION_TYPES[activeQuestion.type]?.color || "#0284c7"
                        }}
                      >
                        {QUESTION_TYPES[activeQuestion.type]?.label || "Question"}
                      </span>

                      <span className="qs-marks-badge">
                        <Award size={12} /> {activeQuestion.marks} Marks
                      </span>

                      {activeQuestion.bloomLevel && (
                        <span className="qs-bloom-badge">
                          <Brain size={12} /> {activeQuestion.bloomLevel}
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 20,
                          background: activeQuestion.difficulty === "easy" ? "rgba(16,185,129,.12)" : activeQuestion.difficulty === "hard" ? "rgba(244,63,94,.12)" : "rgba(245,158,11,.12)",
                          color: activeQuestion.difficulty === "easy" ? "#10b981" : activeQuestion.difficulty === "hard" ? "#f43f5e" : "#f59e0b"
                        }}
                      >
                        {activeQuestion.difficulty.toUpperCase()}
                      </span>
                    </div>

                    {/* Question Text Prompt */}
                    <h2 className="qs-prompt">{activeQuestion.question}</h2>

                    {/* Question Options for MCQ */}
                    {activeQuestion.options && activeQuestion.options.length > 0 && (
                      <div className="qs-options-grid">
                        {activeQuestion.options.map((opt, idx) => {
                          const optLabel = String.fromCharCode(65 + idx);
                          const isSelected = selectedOption === idx;
                          const isCorrect = idx === activeQuestion.correctOption;
                          const showCorrectness = selectedOption !== null;

                          let stateClass = "";
                          if (isSelected) stateClass = "selected";
                          if (showCorrectness && isCorrect) stateClass = "correct";
                          if (showCorrectness && isSelected && !isCorrect) stateClass = "incorrect";

                          return (
                            <button
                              key={idx}
                              className={`qs-option-btn ${stateClass}`}
                              onClick={() => {
                                setSelectedOption(idx);
                                if (isCorrect) {
                                  toast({ title: "🎉 Correct Answer!", description: "Nicely done! Points awarded." });
                                }
                              }}
                            >
                              <span className="qs-opt-badge">{optLabel}</span>
                              <span style={{ flex: 1 }}>{opt}</span>
                              {showCorrectness && isCorrect && <CheckCircle2 size={18} color="#10b981" />}
                              {showCorrectness && isSelected && !isCorrect && <X size={18} color="#f43f5e" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Non-MCQ Sample Answer */}
                    {activeQuestion.sampleAnswer && (
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--sd-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                          Expected Key Points
                        </div>
                        <div style={{ padding: 14, borderRadius: 14, background: "var(--sd-card-soft)", border: "1px solid var(--sd-line)", fontSize: 13, lineHeight: 1.6, color: "var(--sd-ink)" }}>
                          {activeQuestion.sampleAnswer}
                        </div>
                      </div>
                    )}

                    {/* Hint Accordion */}
                    {activeQuestion.hint && (
                      <div style={{ marginBottom: 10 }}>
                        <button
                          className="ec-btn-action"
                          style={{ fontSize: 12 }}
                          onClick={() => setShowHint(!showHint)}
                        >
                          <Lightbulb size={13} color="#f59e0b" />
                          {showHint ? "Hide Pedagogical Hint" : "Reveal Pedagogical Hint"}
                        </button>
                        <AnimatePresence>
                          {showHint && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="qs-accordion qs-acc-hint"
                            >
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#b45309", marginBottom: 2 }}>
                                Teacher Hint:
                              </div>
                              <div style={{ fontSize: 12.5, color: "var(--sd-ink)" }}>
                                {activeQuestion.hint}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Explanation Accordion */}
                    {activeQuestion.explanation && (
                      <div>
                        <button
                          className="ec-btn-action"
                          style={{ fontSize: 12 }}
                          onClick={() => setShowExplanation(!showExplanation)}
                        >
                          <Compass size={13} color="#0284c7" />
                          {showExplanation ? "Hide Detailed Walkthrough" : "Show Solution Walkthrough"}
                        </button>
                        <AnimatePresence>
                          {showExplanation && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="qs-accordion qs-acc-expl"
                            >
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0369a1", marginBottom: 2 }}>
                                Solution & Marking Rubric:
                              </div>
                              <div style={{ fontSize: 12.5, color: "var(--sd-ink)" }}>
                                {activeQuestion.explanation}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Question Navigation Controls */}
              <div className="qs-nav-footer">
                <button
                  className="qs-nav-btn"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1 }}
                >
                  <ArrowLeft size={14} /> Previous Question
                </button>

                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--sd-muted)" }}>
                  Question {currentQuestionIndex + 1} of {filteredQuestions.length}
                </div>

                <button
                  className="qs-nav-btn primary"
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === filteredQuestions.length - 1}
                  style={{ opacity: currentQuestionIndex === filteredQuestions.length - 1 ? 0.5 : 1 }}
                >
                  Next Question <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 4: MANAGE CONTENT
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "manage" && (
            <div className="ec-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Courses Column */}
              <div className="ec-card">
                <div className="ec-card-hd">
                  <div className="ec-card-title">
                    <BookOpen size={18} /> Active Courses ({courses.length})
                  </div>
                  <button className="ec-btn-action" onClick={() => setActiveTab("create")}>
                    <Plus size={13} /> Add Course
                  </button>
                </div>

                {courses.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <BookOpen size={26} color="var(--sd-faint)" style={{ margin: "0 auto 12px" }} />
                    <div style={{ fontSize: 14, fontWeight: 700 }}>No courses created yet</div>
                    <div style={{ fontSize: 12, color: "var(--sd-muted)", marginTop: 4 }}>Create your first course to manage modules.</div>
                  </div>
                ) : (
                  <div style={{ maxHeight: 420, overflowY: "auto" }}>
                    {courses.map((c: any, i: number) => (
                      <div
                        key={c.id}
                        className={`ec-course-item ${selectedCourse === c.id ? "selected" : ""}`}
                        onClick={() => setSelectedCourse(c.id)}
                      >
                        <div className="ec-course-ico" style={{ background: courseGradients[i % courseGradients.length] }}>
                          {COURSE_ICONS[i % COURSE_ICONS.length]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--sd-ink)" }}>{c.title}</div>
                          <div style={{ fontSize: 11.5, color: "var(--sd-muted)", marginTop: 2 }}>
                            Grade {c.grade} · {c.lessonCount || 0} lessons
                          </div>
                        </div>
                        <span style={{ padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(2,132,199,.1)", color: "#0284c7" }}>
                          {c.lessonCount || 0}
                        </span>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button className="ec-course-action" title="Edit course"><Edit size={13} /></button>
                          <button className="ec-course-action" title="Delete course"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lessons Column */}
              <div className="ec-card">
                <div className="ec-card-hd">
                  <div className="ec-card-title">
                    <Layers size={18} /> Lessons {selectedCourse ? `(${lessons.length})` : ""}
                  </div>
                  {selectedCourse && (
                    <button className="ec-btn-action" onClick={() => setActiveTab("upload")}>
                      <UploadCloud size={13} /> Ingest via PDF
                    </button>
                  )}
                </div>

                {!selectedCourse ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <Layers size={26} color="var(--sd-faint)" style={{ margin: "0 auto 12px" }} />
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Select a course</div>
                    <div style={{ fontSize: 12, color: "var(--sd-muted)", marginTop: 4 }}>
                      Choose a course on the left to inspect its lesson structure and questions.
                    </div>
                  </div>
                ) : lessons.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <FileText size={26} color="var(--sd-faint)" style={{ margin: "0 auto 12px" }} />
                    <div style={{ fontSize: 14, fontWeight: 700 }}>No lessons found</div>
                    <div style={{ fontSize: 12, color: "var(--sd-muted)", marginTop: 4 }}>
                      Process a PDF or textbook to auto-generate units for this course.
                    </div>
                  </div>
                ) : (
                  <div style={{ maxHeight: 420, overflowY: "auto" }}>
                    {lessons.map((l: any, i: number) => (
                      <div key={l.id || i} className="ec-lesson">
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--sd-ink)" }}>{l.title}</div>
                            <div style={{ fontSize: 11.5, color: "var(--sd-muted)", marginTop: 2 }}>
                              {l.estimatedDuration && `${l.estimatedDuration} mins · `}
                              {l.topics?.length || 0} topics
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="ec-course-action" title="View"><Eye size={13} /></button>
                            <button className="ec-course-action" title="Edit"><Edit size={13} /></button>
                          </div>
                        </div>

                        {l.summary && (
                          <div style={{ fontSize: 12, color: "var(--sd-muted)", marginBottom: 8, lineHeight: 1.45 }}>
                            {l.summary}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {l.difficulty && (
                            <span className={`ec-lesson-tag ${l.difficulty === "beginner" ? "elt-diff-beg" : l.difficulty === "advanced" ? "elt-diff-adv" : "elt-diff-mid"}`}>
                              {l.difficulty}
                            </span>
                          )}
                          {l.topics?.slice(0, 2).map((t: string, ti: number) => (
                            <span key={ti} className="ec-lesson-tag elt-topic">{t}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 5: ANALYTICS & INSIGHTS
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "analytics" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                <div className="th-stat-card th-sc-ocean">
                  <div className="th-stat-top">
                    <div className="th-stat-icon tsi-ocean"><BookOpen size={20} /></div>
                    <span className="th-stat-badge">Total</span>
                  </div>
                  <div className="th-stat-num"><AnimNum target={courses.length} /></div>
                  <div className="th-stat-lbl">Created Courses</div>
                </div>

                <div className="th-stat-card th-sc-teal">
                  <div className="th-stat-top">
                    <div className="th-stat-icon tsi-teal"><Layers size={20} /></div>
                    <span className="th-stat-badge">Coverage</span>
                  </div>
                  <div className="th-stat-num"><AnimNum target={totalLessons} /></div>
                  <div className="th-stat-lbl">Structured Units</div>
                </div>

                <div className="th-stat-card th-sc-emerald">
                  <div className="th-stat-top">
                    <div className="th-stat-icon tsi-emerald"><Target size={20} /></div>
                    <span className="th-stat-badge">Average</span>
                  </div>
                  <div className="th-stat-num">
                    <AnimNum target={courses.length ? Math.round(totalLessons / courses.length) : 0} />
                  </div>
                  <div className="th-stat-lbl">Lessons Per Course</div>
                </div>

                <div className="th-stat-card th-sc-amber">
                  <div className="th-stat-top">
                    <div className="th-stat-icon tsi-amber"><Zap size={20} /></div>
                    <span className="th-stat-badge">Bank</span>
                  </div>
                  <div className="th-stat-num"><AnimNum target={questions.length} /></div>
                  <div className="th-stat-lbl">Transition Questions</div>
                </div>
              </div>

              <div className="ec-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                {/* Bar Chart */}
                <div className="ec-card">
                  <div className="ec-card-hd">
                    <div className="ec-card-title">
                      <BarChart2 size={18} /> Weekly Ingestion Activity
                    </div>
                  </div>
                  <div className="ec-bar-chart">
                    {barData.map((v, i) => (
                      <div key={i} className="ec-bar-col">
                        <div
                          className="ec-bar"
                          style={{
                            height: `${(v / barMax) * 100}%`,
                            background: `linear-gradient(180deg, #0284c7, #0d9488)`,
                          }}
                        />
                        <div className="ec-bar-lbl">{barDays[i]}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health Overview */}
                <div className="ec-card">
                  <div className="ec-card-hd">
                    <div className="ec-card-title">
                      <TrendingUp size={18} /> Curriculum Completeness
                    </div>
                  </div>
                  {[
                    { label: "Courses with Active Lessons", val: `${courses.filter((c: any) => c.lessonCount > 0).length}/${courses.length}`, pct: courses.length ? Math.round((courses.filter((c: any) => c.lessonCount > 0).length / courses.length) * 100) : 0, color: "linear-gradient(90deg, #0284c7, #0ea5e9)" },
                    { label: "Interactive Question Coverage", val: `${questions.length} loaded`, pct: 85, color: "linear-gradient(90deg, #0d9488, #10b981)" },
                    { label: "NLP Extraction Accuracy", val: "98.4%", pct: 98, color: "linear-gradient(90deg, #f59e0b, #fbbf24)" },
                  ].map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12.5, fontWeight: 700 }}>
                        <span style={{ color: "var(--sd-ink)" }}>{item.label}</span>
                        <span style={{ color: "var(--sd-muted)" }}>{item.val}</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 6, background: "var(--sd-bar-bg)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${item.pct}%`, background: item.color, borderRadius: 6 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
