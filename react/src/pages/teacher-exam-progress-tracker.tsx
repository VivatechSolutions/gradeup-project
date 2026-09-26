import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import {
  TrendingUp, CheckCircle2, Clock, AlertCircle, Search,
  RotateCcw, Download, Sparkles, Filter, Layers, Users,
  GraduationCap, BookOpen, Award, ChevronRight, ChevronLeft,
  X, Sun, Moon, BarChart3, PieChart, ArrowUpDown, ArrowUp,
  ArrowDown, Check, Compass, FileText
} from "lucide-react";
import robo from "../assets/robo.png";
import { useTheme } from "../hooks/use-theme";
import { useAuth } from "../hooks/use-auth";

/* ════════════════════════════════════════════════════════════════════════
   TYPES & INTERFACES
   ════════════════════════════════════════════════════════════════════════ */
export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  photo: string;
}

export interface ExamProgressRecord {
  studentId: string;
  examId: string;
  examName: string;
  subject: string;
  status: "completed" | "in-progress" | "not-started";
  score?: number;
  accuracy?: number;
  timeSpent?: number;
  completionDate?: string;
  totalQuestions?: number;
  correctAnswers?: number;
}

/* ─── Mock Data ──────────────────────────────────────────────────────── */
export const mockStudents: Student[] = [
  { id: "S001", name: "Aarav Sharma",  rollNumber: "101", class: "10", section: "A", photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80" },
  { id: "S002", name: "Vivaan Singh",  rollNumber: "102", class: "10", section: "A", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { id: "S003", name: "Aditya Kumar",  rollNumber: "103", class: "10", section: "A", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
  { id: "S004", name: "Ishaan Patel",  rollNumber: "104", class: "10", section: "A", photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80" },
  { id: "S005", name: "Diya Gupta",    rollNumber: "105", class: "10", section: "A", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
  { id: "S006", name: "Ananya Reddy",  rollNumber: "106", class: "10", section: "A", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80" },
  { id: "S007", name: "Aryan Joshi",   rollNumber: "201", class: "12", section: "B", photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80" },
  { id: "S008", name: "Riya Malhotra", rollNumber: "202", class: "12", section: "B", photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
  { id: "S009", name: "Kabir Verma",   rollNumber: "203", class: "12", section: "B", photo: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80" },
  { id: "S010", name: "Myra Chauhan",  rollNumber: "204", class: "12", section: "B", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
  { id: "S011", name: "Priya Nair",    rollNumber: "205", class: "12", section: "B", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80" },
  { id: "S012", name: "Rohan Mehta",   rollNumber: "107", class: "10", section: "A", photo: "https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80" },
];

const initExamProgress: ExamProgressRecord[] = [
  { studentId: "S001", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "completed", score: 85, accuracy: 88, timeSpent: 45, completionDate: "2024-06-20", totalQuestions: 20, correctAnswers: 17 },
  { studentId: "S002", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "completed", score: 92, accuracy: 95, timeSpent: 40, completionDate: "2024-06-20", totalQuestions: 20, correctAnswers: 19 },
  { studentId: "S003", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "completed", score: 70, accuracy: 75, timeSpent: 55, completionDate: "2024-06-21", totalQuestions: 20, correctAnswers: 15 },
  { studentId: "S004", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "in-progress" },
  { studentId: "S005", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "not-started" },
  { studentId: "S012", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "completed", score: 65, accuracy: 70, timeSpent: 58, completionDate: "2024-06-21", totalQuestions: 20, correctAnswers: 14 },
  { studentId: "S007", examId: "P121", examName: "Physics Mid-Term", subject: "Physics", status: "completed", score: 88, accuracy: 90, timeSpent: 85, completionDate: "2024-06-18", totalQuestions: 50, correctAnswers: 45 },
  { studentId: "S008", examId: "P121", examName: "Physics Mid-Term", subject: "Physics", status: "completed", score: 75, accuracy: 80, timeSpent: 90, completionDate: "2024-06-18", totalQuestions: 50, correctAnswers: 40 },
  { studentId: "S009", examId: "P121", examName: "Physics Mid-Term", subject: "Physics", status: "completed", score: 93, accuracy: 94, timeSpent: 80, completionDate: "2024-06-19", totalQuestions: 50, correctAnswers: 47 },
  { studentId: "S010", examId: "P121", examName: "Physics Mid-Term", subject: "Physics", status: "not-started" },
  { studentId: "S011", examId: "P121", examName: "Physics Mid-Term", subject: "Physics", status: "in-progress" },
  { studentId: "S001", examId: "S101", examName: "Science Quarterly", subject: "Science", status: "completed", score: 90, accuracy: 92, timeSpent: 75, completionDate: "2024-06-15", totalQuestions: 60, correctAnswers: 55 },
  { studentId: "S002", examId: "S101", examName: "Science Quarterly", subject: "Science", status: "completed", score: 88, accuracy: 90, timeSpent: 70, completionDate: "2024-06-15", totalQuestions: 60, correctAnswers: 54 },
  { studentId: "S006", examId: "S101", examName: "Science Quarterly", subject: "Science", status: "completed", score: 65, accuracy: 68, timeSpent: 88, completionDate: "2024-06-16", totalQuestions: 60, correctAnswers: 41 },
  { studentId: "S003", examId: "E101", examName: "English Unit Test", subject: "English", status: "completed", score: 78, accuracy: 80, timeSpent: 35, completionDate: "2024-06-22", totalQuestions: 25, correctAnswers: 20 },
  { studentId: "S004", examId: "E101", examName: "English Unit Test", subject: "English", status: "completed", score: 82, accuracy: 84, timeSpent: 30, completionDate: "2024-06-22", totalQuestions: 25, correctAnswers: 21 },
  { studentId: "S012", examId: "E101", examName: "English Unit Test", subject: "English", status: "completed", score: 60, accuracy: 64, timeSpent: 42, completionDate: "2024-06-23", totalQuestions: 25, correctAnswers: 16 },
];

/* ─── API Layer ──────────────────────────────────────────────────────── */
const simulateLatency = <T,>(data: T, ms = 220): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

export const examApi = {
  getStudents: () => simulateLatency(mockStudents),
  getExamProgress: (filters: { examName?: string; subject?: string; status?: string } = {}) => {
    let data = [...initExamProgress];
    if (filters.examName && filters.examName !== "all") data = data.filter(p => p.examName === filters.examName);
    if (filters.subject && filters.subject !== "all") data = data.filter(p => p.subject === filters.subject);
    if (filters.status && filters.status !== "all") data = data.filter(p => p.status === filters.status);
    return simulateLatency(data);
  },
  getStudentProgress: (studentId: string) =>
    simulateLatency(initExamProgress.filter(p => p.studentId === studentId)),
};

/* ─── Vibrant Palette Mapping ────────────────────────────────────────── */
const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#10b981", // Emerald
  Physics: "#f59e0b",     // Amber
  Science: "#0ea5e9",     // Cyan
  English: "#f43f5e",     // Coral / Rose
  Social: "#8b5cf6",      // Purple
  Tamil: "#ff791f",       // Warm orange
};

const getSubjectColor = (subj: string) => SUBJECT_COLORS[subj] || "#10b981";

/* ─── Stylesheet ─────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
}

:root {
  --sd-page: #f8fafc;
  --sd-page-2: #f1f5f9;
  --sd-card: #ffffff;
  --sd-card-soft: #f8fafc;
  --sd-ink: #071235;
  --sd-muted: #64748b;
  --sd-faint: #94a3b8;
  --sd-line: rgba(15, 23, 42, 0.08);
  --sd-line-strong: rgba(15, 23, 42, 0.15);
  --sd-shadow: 0 12px 32px rgba(35, 44, 87, 0.08);
  --sd-shadow-soft: 0 6px 18px rgba(35, 44, 87, 0.05);
  --sd-overlay: rgba(15, 23, 42, 0.55);
}

[data-theme="dark"],
.dark,
[data-theme="dark"] .ept-root,
.dark .ept-root,
.ept-root[data-theme="dark"] {
  --sd-page: #060913;
  --sd-page-2: #0b1120;
  --sd-card: rgba(20, 29, 53, 0.94);
  --sd-card-soft: rgba(26, 38, 70, 0.78);
  --sd-ink: #f8fafc;
  --sd-muted: #94a3b8;
  --sd-faint: #64748b;
  --sd-line: rgba(255, 255, 255, 0.08);
  --sd-line-strong: rgba(255, 255, 255, 0.16);
  --sd-shadow: 0 20px 48px rgba(0, 0, 0, 0.65);
  --sd-shadow-soft: 0 10px 24px rgba(0, 0, 0, 0.42);
  --sd-overlay: rgba(0, 0, 0, 0.75);
}

.ept-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  background: radial-gradient(circle at 12% 8%, rgba(16, 185, 129, 0.12), transparent 28%),
              radial-gradient(circle at 88% 12%, rgba(245, 158, 11, 0.14), transparent 26%),
              radial-gradient(circle at 50% 90%, rgba(14, 165, 233, 0.10), transparent 32%),
              linear-gradient(180deg, var(--sd-page), var(--sd-page-2));
  color: var(--sd-ink);
  transition: background 0.3s ease, color 0.3s ease;
  padding-bottom: 60px;
}

[data-theme="dark"] .ept-root,
.dark .ept-root,
.ept-root[data-theme="dark"] {
  background: radial-gradient(circle at 12% 8%, rgba(16, 185, 129, 0.10), transparent 28%),
              radial-gradient(circle at 88% 12%, rgba(245, 158, 11, 0.10), transparent 26%),
              radial-gradient(circle at 50% 90%, rgba(14, 165, 233, 0.08), transparent 32%),
              linear-gradient(180deg, #060913 0%, #090d1a 100%) !important;
}

/* Background floating particles */
.ept-bg-spark {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
  opacity: 0.45;
  animation: sdDrift 10s ease-in-out infinite;
}
.ept-bg-spark.s1 {
  left: 48%;
  top: 90px;
  width: 9px;
  height: 9px;
  background: #f59e0b;
  box-shadow: 38px 24px 0 #10b981, 84px -12px 0 #0ea5e9;
}
.ept-bg-spark.s2 {
  right: 6%;
  top: 240px;
  width: 8px;
  height: 8px;
  background: #f43f5e;
  box-shadow: -46px 42px 0 #10b981, -82px -16px 0 #f59e0b;
  animation-delay: -3.5s;
}
.ept-bg-spark.s3 {
  left: 6%;
  bottom: 180px;
  width: 9px;
  height: 9px;
  background: #10b981;
  box-shadow: 48px -32px 0 #f59e0b, 96px 20px 0 #0ea5e9;
  animation-delay: -6s;
}

.ept-bg-ribbon {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  left: 3%;
  right: 3%;
  top: 130px;
  height: 180px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.08), rgba(245, 158, 11, 0.09), rgba(14, 165, 233, 0.08));
  filter: blur(24px);
  opacity: 0.8;
  animation: sdBgWave 14s ease-in-out infinite;
}

/* Animations */
@keyframes sdCardIn {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to { opacity: 1; transform: none; }
}
@keyframes sdBreathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes sdFloatSlow {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(1.5deg); }
}
@keyframes sdShine {
  0% { transform: translateX(-120%) rotate(20deg); }
  45%, 100% { transform: translateX(220%) rotate(20deg); }
}
@keyframes sdDrift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0); }
  50% { transform: translate3d(16px, -12px, 0) rotate(6deg); }
}
@keyframes sdBgWave {
  0%, 100% { transform: translate3d(-1.5%, 0, 0); }
  50% { transform: translate3d(1.5%, -2%, 0); }
}
@keyframes sdPulseSoft {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.28); }
  50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
}
@keyframes sdPop3d {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.03); }
}

.ept-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}

/* ─── Hero Banner (NO purple/blue AI gradient!) ──────────────────────── */
.ept-hero {
  position: relative;
  overflow: hidden;
  min-height: 220px;
  border-radius: 24px;
  padding: 26px 32px;
  background: linear-gradient(135deg, #e6f9e8 0%, #f0faf2 48%, #fff7eb 100%);
  border: 1px solid rgba(16, 185, 129, 0.26);
  box-shadow: 0 14px 34px rgba(16, 185, 129, 0.12), var(--sd-shadow-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin: 20px 0 22px;
  animation: sdCardIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

[data-theme="dark"] .ept-hero,
.dark .ept-hero,
.ept-root[data-theme="dark"] .ept-hero {
  background: linear-gradient(135deg, #051d14 0%, #092121 48%, #1a160c 100%) !important;
  border-color: rgba(16, 185, 129, 0.28) !important;
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.65), 0 0 28px rgba(16, 185, 129, 0.12) !important;
}

.ept-hero::after {
  content: "";
  position: absolute;
  top: -50px;
  bottom: -50px;
  width: 90px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  animation: sdShine 7.5s ease-in-out infinite;
  pointer-events: none;
}

.ept-hero-content {
  position: relative;
  z-index: 2;
  max-width: 660px;
}

.ept-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  background: rgba(16, 185, 129, 0.15);
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.32);
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);
}

[data-theme="dark"] .ept-chip {
  background: rgba(16, 185, 129, 0.22);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.42);
}

.ept-hero-title {
  font-size: clamp(24px, 3.2vw, 32px);
  font-weight: 900;
  line-height: 1.15;
  color: var(--sd-ink);
  margin: 0 0 10px;
  letter-spacing: -0.02em;
}

.ept-hero-desc {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--sd-muted);
  margin: 0 0 18px;
}

.ept-hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Emerald Primary Button (NO purple/blue!) */
.ept-btn-emerald {
  border: 0;
  border-radius: 14px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 22px rgba(16, 185, 129, 0.32);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.ept-btn-emerald:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(16, 185, 129, 0.44);
}

.ept-btn-surface {
  border: 1px solid var(--sd-line-strong);
  border-radius: 14px;
  padding: 10px 16px;
  background: var(--sd-card);
  color: var(--sd-ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--sd-shadow-soft);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}
.ept-btn-surface:hover {
  transform: translateY(-2px);
  background: var(--sd-card-soft);
  border-color: #10b981;
}

.ept-theme-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--sd-line-strong);
  background: var(--sd-card);
  color: var(--sd-ink);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 16px;
  box-shadow: var(--sd-shadow-soft);
  transition: transform 0.18s ease, background 0.18s ease;
}
.ept-theme-btn:hover {
  transform: translateY(-2px) scale(1.05);
}

/* ─── Hero Mascot Robo ───────────────────────────────────────────────── */
.ept-hero-robo-wrap {
  position: relative;
  z-index: 2;
  flex: 0 0 230px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.ept-hero-robo-glow {
  position: absolute;
  width: 210px;
  height: 210px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.32), rgba(245, 158, 11, 0.16), transparent 70%);
  filter: blur(14px);
  animation: sdBreathe 4.5s ease-in-out infinite;
}

.ept-hero-robo-img {
  width: 175px;
  max-width: 100%;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 18px 24px rgba(10, 40, 25, 0.28));
  animation: sdFloatSlow 5s ease-in-out infinite;
  z-index: 2;
}

.ept-robo-bubble {
  position: absolute;
  top: 8px;
  right: -6px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line-strong);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-ink);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  animation: sdBreathe 4.5s ease-in-out infinite;
  z-index: 3;
}

/* ─── Colorful KPI Cards (Equal to Teacher Dashboard) ─────────────────── */
.ept-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 22px;
}

.ept-stat-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 20px;
  padding: 18px;
  box-shadow: var(--sd-shadow-soft);
  position: relative;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  animation: sdCardIn 0.45s both;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.ept-stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--sd-shadow);
}

/* Card 1: Emerald Theme */
.ept-stat-card.emerald {
  border-top: 3.5px solid #10b981;
}
.ept-stat-card.emerald:hover {
  border-color: rgba(16, 185, 129, 0.45);
}
.ept-stat-icon.emerald {
  background: rgba(16, 185, 129, 0.14);
  color: #10b981;
}

/* Card 2: Ocean Cyan Theme */
.ept-stat-card.cyan {
  border-top: 3.5px solid #0ea5e9;
}
.ept-stat-card.cyan:hover {
  border-color: rgba(14, 165, 233, 0.45);
}
.ept-stat-icon.cyan {
  background: rgba(14, 165, 233, 0.14);
  color: #0ea5e9;
}

/* Card 3: Warm Amber Theme */
.ept-stat-card.amber {
  border-top: 3.5px solid #f59e0b;
}
.ept-stat-card.amber:hover {
  border-color: rgba(245, 158, 11, 0.45);
}
.ept-stat-icon.amber {
  background: rgba(245, 158, 11, 0.14);
  color: #f59e0b;
}

/* Card 4: Vibrant Coral Theme */
.ept-stat-card.rose {
  border-top: 3.5px solid #f43f5e;
}
.ept-stat-card.rose:hover {
  border-color: rgba(244, 63, 94, 0.45);
}
.ept-stat-icon.rose {
  background: rgba(244, 63, 94, 0.14);
  color: #f43f5e;
}

.ept-stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.ept-stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.05);
}

.ept-stat-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.ept-stat-badge.emerald { background: rgba(16, 185, 129, 0.14); color: #10b981; }
.ept-stat-badge.cyan { background: rgba(14, 165, 233, 0.14); color: #0ea5e9; }
.ept-stat-badge.amber { background: rgba(245, 158, 11, 0.14); color: #f59e0b; }
.ept-stat-badge.rose { background: rgba(244, 63, 94, 0.14); color: #f43f5e; }

.ept-stat-num {
  font-size: 28px;
  font-weight: 900;
  color: var(--sd-ink);
  line-height: 1;
  letter-spacing: -0.02em;
}

.ept-stat-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--sd-muted);
  margin-top: 4px;
}

.ept-stat-meter {
  height: 6px;
  border-radius: 999px;
  background: var(--sd-line);
  margin-top: 14px;
  overflow: hidden;
}
.ept-stat-meter-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.8s ease;
}

/* ─── Modern Tabs ────────────────────────────────────────────────────── */
.ept-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.ept-tab {
  padding: 10px 20px;
  border-radius: 14px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card);
  color: var(--sd-muted);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  box-shadow: var(--sd-shadow-soft);
}
.ept-tab:hover {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.4);
  transform: translateY(-2px);
}
.ept-tab.active {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 8px 22px rgba(16, 185, 129, 0.36);
}

/* ─── Card Panels ────────────────────────────────────────────────────── */
.ept-panel {
  background: var(--sd-card);
  border-radius: 22px;
  border: 1px solid var(--sd-line);
  box-shadow: var(--sd-shadow-soft);
  overflow: hidden;
  margin-bottom: 22px;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  animation: sdCardIn 0.45s both;
}
.ept-panel-head {
  padding: 20px 24px;
  border-bottom: 1px solid var(--sd-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.ept-panel-title {
  font-size: 16.5px;
  font-weight: 800;
  color: var(--sd-ink);
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}
.ept-panel-sub {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 3px;
}
.ept-panel-body {
  padding: 22px 24px;
}

/* ─── Filter Bar ─────────────────────────────────────────────────────── */
.ept-filters-bar {
  background: var(--sd-card);
  border-radius: 20px;
  padding: 18px 22px;
  border: 1px solid var(--sd-line);
  box-shadow: var(--sd-shadow-soft);
  margin-bottom: 20px;
}
.ept-filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  align-items: end;
}
.ept-filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ept-filter-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.ept-filter-select,
.ept-filter-input {
  width: 100%;
  padding: 9px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--sd-line-strong);
  background: var(--sd-card-soft);
  color: var(--sd-ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.ept-filter-select:focus,
.ept-filter-input:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.16);
}
.ept-search-wrap {
  position: relative;
}
.ept-search-icon {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  color: var(--sd-muted);
  pointer-events: none;
}

/* Quick Filter Chips */
.ept-chip-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.ept-filter-chip {
  padding: 6px 13px;
  border-radius: 999px;
  border: 1px solid var(--sd-line);
  background: var(--sd-card-soft);
  color: var(--sd-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ept-filter-chip:hover {
  border-color: #10b981;
  color: var(--sd-ink);
}
.ept-filter-chip.active {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  color: #10b981;
}
[data-theme="dark"] .ept-filter-chip.active {
  color: #6ee7b7;
  border-color: #6ee7b7;
}

/* ─── Table Styling ──────────────────────────────────────────────────── */
.ept-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 14px;
}
.ept-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}
.ept-th {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sd-muted);
  padding: 13px 16px;
  text-align: left;
  border-bottom: 1.5px solid var(--sd-line);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color 0.15s;
}
.ept-th:hover {
  color: #10b981;
}
.ept-tr {
  transition: background 0.18s ease, transform 0.18s ease;
  cursor: pointer;
}
.ept-tr:hover {
  background: var(--sd-card-soft);
}
.ept-td {
  padding: 13px 16px;
  font-size: 13px;
  color: var(--sd-ink);
  border-bottom: 1px solid var(--sd-line);
}
.ept-tr:last-child .ept-td {
  border-bottom: none;
}

.ept-student-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ept-student-photo {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(16, 185, 129, 0.35);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
.ept-student-name {
  font-weight: 800;
  font-size: 13.5px;
  color: var(--sd-ink);
}
.ept-student-roll {
  font-size: 11px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 1px;
}

/* Status Badges */
.ept-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.ept-status-completed {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
}
.ept-status-in-progress {
  background: rgba(14, 165, 233, 0.14);
  color: #0284c7;
}
.ept-status-not-started {
  background: rgba(244, 63, 94, 0.14);
  color: #e11d48;
}

[data-theme="dark"] .ept-status-completed {
  background: rgba(16, 185, 129, 0.22);
  color: #6ee7b7;
}
[data-theme="dark"] .ept-status-in-progress {
  background: rgba(14, 165, 233, 0.22);
  color: #7dd3fc;
}
[data-theme="dark"] .ept-status-not-started {
  background: rgba(244, 63, 94, 0.22);
  color: #fda4af;
}

/* Score Pills */
.score-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 800;
}
.sp-hi {
  background: rgba(16, 185, 129, 0.16);
  color: #059669;
}
.sp-mid {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}
.sp-lo {
  background: rgba(244, 63, 94, 0.18);
  color: #e11d48;
}
[data-theme="dark"] .sp-hi {
  background: rgba(16, 185, 129, 0.25);
  color: #6ee7b7;
}
[data-theme="dark"] .sp-mid {
  background: rgba(245, 158, 11, 0.25);
  color: #fcd34d;
}
[data-theme="dark"] .sp-lo {
  background: rgba(244, 63, 94, 0.25);
  color: #fda4af;
}

/* Pagination */
.ept-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--sd-line);
  flex-wrap: wrap;
}
.ept-page-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1.5px solid var(--sd-line-strong);
  background: var(--sd-card);
  color: var(--sd-ink);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.ept-page-btn:hover:not(:disabled) {
  border-color: #10b981;
  color: #10b981;
}
.ept-page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ─── Class-wise Cards ───────────────────────────────────────────────── */
.ept-class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}
.ept-class-card {
  background: var(--sd-card-soft);
  border: 1.5px solid var(--sd-line);
  border-radius: 20px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.22s ease;
  position: relative;
  overflow: hidden;
}
.ept-class-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--sd-shadow);
  border-color: #10b981;
}
.ept-class-card.active {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
  box-shadow: 0 0 0 2px #10b981 inset;
}
.ept-class-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.ept-class-badge {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 16px;
  box-shadow: 0 6px 14px rgba(16, 185, 129, 0.3);
}
.ept-class-badge.alt {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 6px 14px rgba(245, 158, 11, 0.3);
}
.ept-class-name {
  font-size: 15.5px;
  font-weight: 800;
  color: var(--sd-ink);
}
.ept-class-meta {
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
}
.ept-class-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
  color: var(--sd-muted);
  margin-top: 8px;
}
.ept-class-row b {
  color: var(--sd-ink);
  font-weight: 800;
}
.ept-progress-track {
  height: 7px;
  border-radius: 999px;
  background: var(--sd-line);
  margin-top: 14px;
  overflow: hidden;
}
.ept-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #10b981, #0ea5e9);
}

/* ─── Student Directory Cards ────────────────────────────────────────── */
.ept-student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.ept-student-card {
  background: var(--sd-card-soft);
  border: 1.5px solid var(--sd-line);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.ept-student-card:hover {
  border-color: #10b981;
  transform: translateY(-3px) scale(1.015);
  box-shadow: var(--sd-shadow-soft);
}
.ept-student-card-photo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(16, 185, 129, 0.4);
}
.ept-student-card-pct {
  margin-left: auto;
  font-weight: 900;
  font-size: 15px;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  padding: 4px 10px;
  border-radius: 12px;
}
[data-theme="dark"] .ept-student-card-pct {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.22);
}

/* ─── Student Detail Drawer ───────────────────────────────────────────── */
.ept-drawer-overlay {
  position: fixed;
  inset: 0;
  background: var(--sd-overlay);
  backdrop-filter: blur(4px);
  z-index: 100;
}
.ept-drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: min(480px, 100%);
  background: var(--sd-card);
  z-index: 101;
  box-shadow: -14px 0 44px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
}
.ept-drawer-head {
  padding: 22px 24px;
  border-bottom: 1px solid var(--sd-line);
  display: flex;
  align-items: center;
  gap: 14px;
}
.ept-drawer-photo {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
  border: 2.5px solid #10b981;
}
.ept-drawer-close {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--sd-line);
  background: var(--sd-card-soft);
  color: var(--sd-ink);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.15s;
}
.ept-drawer-close:hover {
  background: #f43f5e;
  color: #ffffff;
  border-color: transparent;
}
.ept-drawer-body {
  padding: 22px 24px;
  overflow-y: auto;
  flex: 1;
}
.ept-drawer-overall {
  text-align: center;
  padding: 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(14, 165, 233, 0.08));
  border: 1px solid rgba(16, 185, 129, 0.25);
  margin-bottom: 22px;
}
.ept-drawer-overall-n {
  font-size: 38px;
  font-weight: 900;
  color: #10b981;
  letter-spacing: -1px;
  line-height: 1;
}
[data-theme="dark"] .ept-drawer-overall-n {
  color: #6ee7b7;
}
.ept-drawer-overall-l {
  font-size: 12px;
  font-weight: 700;
  color: var(--sd-muted);
  margin-top: 6px;
}
.ept-subject-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 0;
  border-bottom: 1px solid var(--sd-line);
}
.ept-history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 14px;
  border-radius: 12px;
  background: var(--sd-card-soft);
  margin-bottom: 8px;
  border: 1px solid var(--sd-line);
}

/* ─── Responsive Adjustments ─────────────────────────────────────────── */
@media (max-width: 1024px) {
  .ept-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .ept-root {
    padding-bottom: 40px;
  }
  .ept-shell {
    padding: 0 12px;
  }
  .ept-hero {
    flex-direction: column-reverse;
    text-align: center;
    padding: 22px 18px;
    gap: 16px;
    margin: 14px 0 18px;
  }
  .ept-hero-content {
    max-width: 100%;
  }
  .ept-hero-actions {
    justify-content: center;
  }
  .ept-hero-robo-wrap {
    flex: 0 0 auto;
  }
  .ept-hero-robo-img {
    width: 135px;
  }
  .ept-robo-bubble {
    right: -12px;
    top: -4px;
  }
  .ept-stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .ept-filters-grid {
    grid-template-columns: 1fr;
  }
  .ept-panel-head {
    padding: 16px 18px;
  }
  .ept-panel-body {
    padding: 16px 18px;
  }
  .ept-drawer {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .ept-hero-title {
    font-size: 22px;
  }
  .ept-tabs {
    gap: 6px;
  }
  .ept-tab {
    padding: 8px 14px;
    font-size: 12.5px;
  }
}
`;

/* ─── Animated Number Counter ────────────────────────────────────────── */
function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let frame = 0;
    let raf = 0;
    const totalFrames = 38;
    const tick = () => {
      frame += 1;
      setVal(Math.round((target * Math.min(frame, totalFrames)) / totalFrames));
      if (frame < totalFrames) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <>{val}{suffix}</>;
}

/* ─── Calculations ───────────────────────────────────────────────────── */
function overallPercentage(records: ExamProgressRecord[]) {
  const completed = records.filter(r => r.status === "completed" && typeof r.score === "number");
  if (!completed.length) return 0;
  return Math.round(completed.reduce((sum, r) => sum + (r.score ?? 0), 0) / completed.length);
}

function subjectBreakdown(records: ExamProgressRecord[]) {
  const bySubject: Record<string, { total: number; count: number }> = {};
  records.forEach(r => {
    if (r.status !== "completed" || typeof r.score !== "number") return;
    if (!bySubject[r.subject]) bySubject[r.subject] = { total: 0, count: 0 };
    bySubject[r.subject].total += r.score;
    bySubject[r.subject].count += 1;
  });
  return Object.entries(bySubject).map(([subject, v]) => ({
    subject,
    score: Math.round(v.total / v.count),
    color: getSubjectColor(subject),
  }));
}

/* ─── Student Detail Drawer ───────────────────────────────────────────── */
function StudentDrawer({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const [records, setRecords] = useState<ExamProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    let active = true;
    setLoading(true);
    examApi.getStudentProgress(student.id).then(data => {
      if (active) {
        setRecords(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [student]);

  if (!student) return null;
  const overall = overallPercentage(records);
  const bySubject = subjectBreakdown(records);
  const completedCount = records.filter(r => r.status === "completed").length;

  return (
    <AnimatePresence>
      <motion.div
        className="ept-drawer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="ept-drawer"
        initial={{ x: 480 }}
        animate={{ x: 0 }}
        exit={{ x: 480 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
      >
        <div className="ept-drawer-head">
          <img src={student.photo} alt={student.name} className="ept-drawer-photo" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{student.name}</div>
            <div style={{ fontSize: 12, color: "var(--sd-muted)", marginTop: 2 }}>
              Class {student.class}-{student.section} · Roll #{student.rollNumber}
            </div>
          </div>
          <button className="ept-drawer-close" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </div>

        <div className="ept-drawer-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sd-muted)" }}>
              Loading performance metrics…
            </div>
          ) : (
            <>
              <div className="ept-drawer-overall">
                <div className="ept-drawer-overall-n">
                  <AnimNum target={overall} suffix="%" />
                </div>
                <div className="ept-drawer-overall-l">
                  Overall Academic Score · {completedCount} of {records.length} exam{records.length !== 1 ? "s" : ""} completed
                </div>
              </div>

              {bySubject.length > 0 && (
                <div style={{ height: 220, marginBottom: 20 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={bySubject} outerRadius="75%">
                      <PolarGrid stroke="var(--sd-line-strong)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--sd-muted)", fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--sd-faint)" }} />
                      <Radar dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--sd-card)",
                          border: "1px solid var(--sd-line-strong)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "var(--sd-ink)",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
                Subject Performance
              </div>
              {bySubject.map(s => (
                <div className="ept-subject-row" key={s.subject}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{s.subject}</span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: s.color }}>{s.score}%</span>
                </div>
              ))}

              <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: ".06em", margin: "22px 0 10px" }}>
                Exam Assessment History
              </div>
              {records.map((r, i) => (
                <div className="ept-history-item" key={i}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{r.examName}</div>
                    <div style={{ fontSize: 11, color: "var(--sd-muted)", marginTop: 2 }}>
                      {r.subject}{r.completionDate ? ` · ${r.completionDate}` : ""}
                    </div>
                  </div>
                  {r.status === "completed" ? (
                    <span className={`score-pill ${(r.score ?? 0) >= 90 ? "sp-hi" : (r.score ?? 0) >= 75 ? "sp-mid" : "sp-lo"}`}>
                      {r.score}%
                    </span>
                  ) : (
                    <span className={`ept-status-badge ept-status-${r.status}`}>
                      {r.status === "in-progress" ? <Clock size={11} /> : <AlertCircle size={11} />}
                      {r.status.replace("-", " ")}
                    </span>
                  )}
                </div>
              ))}
              {records.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--sd-muted)", textAlign: "center", padding: "20px 0" }}>
                  No exam records found.
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */
export default function TeacherExamProgressTracker() {
  const { user } = useAuth();
  const themeContext = useTheme?.();
  const [localTheme, setLocalTheme] = useState<"light" | "dark">(() => {
    if (themeContext?.theme) return themeContext.theme as "light" | "dark";
    if (typeof document !== "undefined") {
      const docTheme = document.documentElement.getAttribute("data-theme");
      if (docTheme === "dark" || docTheme === "light") return docTheme;
    }
    return "light";
  });

  const currentTheme = themeContext?.theme || localTheme;

  const handleToggleTheme = () => {
    if (themeContext?.toggleTheme) {
      themeContext.toggleTheme();
    } else {
      const next = localTheme === "light" ? "dark" : "light";
      setLocalTheme(next);
      document.documentElement.setAttribute("data-theme", next);
    }
  };

  const [students, setStudents] = useState<Student[]>([]);
  const [examProgress, setExamProgress] = useState<ExamProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"overview" | "class" | "student">("overview");
  const [filters, setFilters] = useState({
    exam: "all",
    subject: "all",
    status: "all",
    search: "",
    preset: "all",
  });
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });

  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);

  // Initial load
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([examApi.getStudents(), examApi.getExamProgress()]).then(([s, p]) => {
      if (!active) return;
      setStudents(s);
      setExamProgress(p);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const uniqueExams = useMemo(() => [...new Set(initExamProgress.map(p => p.examName))], []);
  const uniqueSubjects = useMemo(() => [...new Set(initExamProgress.map(p => p.subject))], []);
  const uniqueClasses = useMemo(() => [...new Set(students.map(s => s.class))].sort(), [students]);

  // Performance calculations
  const completedExams = useMemo(() => examProgress.filter(p => p.status === "completed"), [examProgress]);
  const averageScore = useMemo(() => overallPercentage(examProgress), [examProgress]);
  const completionRate = useMemo(() => (
    examProgress.length ? Math.round((completedExams.length / examProgress.length) * 100) : 0
  ), [examProgress, completedExams]);
  const studentsInProgress = useMemo(() => examProgress.filter(p => p.status === "in-progress").length, [examProgress]);
  const studentsNotStarted = useMemo(() => examProgress.filter(p => p.status === "not-started").length, [examProgress]);

  const subjectTrend = useMemo(() => subjectBreakdown(examProgress), [examProgress]);

  // Class-wise aggregation
  const classStats = useMemo(() => uniqueClasses.map((cls, idx) => {
    const classStudents = students.filter(s => s.class === cls);
    const studentIds = new Set(classStudents.map(s => s.id));
    const records = examProgress.filter(p => studentIds.has(p.studentId));
    const completed = records.filter(r => r.status === "completed");
    return {
      class: cls,
      studentCount: classStudents.length,
      avgScore: overallPercentage(records),
      completionRate: records.length ? Math.round((completed.length / records.length) * 100) : 0,
      completedCount: completed.length,
      totalRecords: records.length,
      isAlt: idx % 2 !== 0,
    };
  }), [uniqueClasses, students, examProgress]);

  // Student-wise list
  const studentOverallList = useMemo(() => students
    .filter(s => (selectedClass ? s.class === selectedClass : true))
    .filter(s => studentSearch === "" || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.rollNumber.includes(studentSearch))
    .map(s => {
      const records = examProgress.filter(p => p.studentId === s.id);
      return { ...s, overall: overallPercentage(records), examCount: records.length };
    })
    .sort((a, b) => b.overall - a.overall),
  [students, examProgress, selectedClass, studentSearch]);

  // Filtered & sorted table list
  const studentsWithProgress = useMemo(() => {
    const progress = filters.exam === "all" ? examProgress : examProgress.filter(p => p.examName === filters.exam);
    return students.map(student => {
      const studentProgress = progress.find(p => p.studentId === student.id);
      return { ...student, progress: studentProgress };
    }).filter(s => s.progress);
  }, [students, examProgress, filters.exam]);

  const filtered = useMemo(() => studentsWithProgress.filter(s => {
    if (!s.progress) return false;
    const subjectMatch = filters.subject === "all" || s.progress.subject === filters.subject;
    const statusMatch = filters.status === "all" || s.progress.status === filters.status;
    const searchMatch = filters.search === "" ||
      s.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      s.rollNumber.includes(filters.search);

    // Preset quick filters
    let presetMatch = true;
    if (filters.preset === "high") {
      presetMatch = (s.progress.score ?? 0) >= 85;
    } else if (filters.preset === "needs-help") {
      presetMatch = s.progress.status === "not-started" || ((s.progress.score ?? 0) < 70 && s.progress.status === "completed");
    } else if (filters.preset === "in-progress") {
      presetMatch = s.progress.status === "in-progress";
    }

    return subjectMatch && statusMatch && searchMatch && presetMatch;
  }), [studentsWithProgress, filters]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const aVal = (a.progress as any)?.[sort.key] ?? (a as any)[sort.key];
    const bVal = (b.progress as any)?.[sort.key] ?? (b as any)[sort.key];
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sort.dir === "asc" ? cmp : -cmp;
  }), [filtered, sort]);

  const paginated = useMemo(() => sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage), [sorted, page]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));

  const toggleSort = (key: string) => {
    setSort(s => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  };

  // Export CSV
  const handleExportCSV = useCallback(() => {
    const headers = ["Student Name", "Roll Number", "Class", "Section", "Exam Name", "Subject", "Status", "Score", "Accuracy", "Time Spent (min)", "Date"];
    const rows = sorted.map(s => [
      `"${s.name}"`,
      `"${s.rollNumber}"`,
      `"${s.class}"`,
      `"${s.section}"`,
      `"${s.progress?.examName || ""}"`,
      `"${s.progress?.subject || ""}"`,
      `"${s.progress?.status || ""}"`,
      `"${s.progress?.score ?? ""}"`,
      `"${s.progress?.accuracy ?? ""}"`,
      `"${s.progress?.timeSpent ?? ""}"`,
      `"${s.progress?.completionDate || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `exam_progress_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sorted]);

  const teacherGreeting = user?.lastName
    ? `Prof. ${user.lastName}`
    : (user?.firstName ? `Prof. ${user.firstName}` : "Professor");

  return (
    <>
      <style>{CSS}</style>
      <div className="ept-root" data-theme={currentTheme}>
        {/* Ambient sparks & ribbon */}
        <span className="ept-bg-ribbon" aria-hidden />
        <span className="ept-bg-spark s1" aria-hidden />
        <span className="ept-bg-spark s2" aria-hidden />
        <span className="ept-bg-spark s3" aria-hidden />

        <div className="ept-shell">
          {/* ─── Hero Banner with Robo Mascot (Warm, Vibrant, NO purple/blue!) ─── */}
          <section className="ept-hero">
            <div className="ept-hero-content">
              <div className="ept-chip">
                <GraduationCap size={15} />
                <span>Academic Real-Time Intelligence</span>
              </div>
              <h1 className="ept-hero-title">
                Welcome back, {teacherGreeting}! 📚
              </h1>
              <p className="ept-hero-desc">
                Track student exam performance, analyze accuracy trends across subjects, and identify students who need immediate intervention.
              </p>
              <div className="ept-hero-actions">
                <button className="ept-btn-emerald" onClick={handleExportCSV}>
                  <Download size={15} />
                  <span>Export Report (CSV)</span>
                </button>
                <button
                  className="ept-btn-surface"
                  onClick={() => {
                    setFilters({ exam: "all", subject: "all", status: "all", search: "", preset: "all" });
                    setPage(1);
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reset Filters</span>
                </button>
                <button
                  className="ept-theme-btn"
                  onClick={handleToggleTheme}
                  title={`Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`}
                >
                  {currentTheme === "dark" ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#071235" />}
                </button>
              </div>
            </div>

            {/* 3D Animated Robo Mascot */}
            <div className="ept-hero-robo-wrap">
              <div className="ept-hero-robo-glow" />
              <img
                src={robo}
                alt="GradeUp Robo Assistant"
                className="ept-hero-robo-img"
              />
              <div className="ept-robo-bubble">
                <Sparkles size={13} color="#10b981" />
                <span>{completedExams.length} Exams Completed</span>
              </div>
            </div>
          </section>

          {/* ─── Colorful KPI Cards ────────────────────────────────────────── */}
          <section className="ept-stats-grid">
            {/* Card 1: Emerald Theme */}
            <div className="ept-stat-card emerald">
              <div>
                <div className="ept-stat-top">
                  <div className="ept-stat-icon emerald">
                    <TrendingUp size={22} />
                  </div>
                  <span className="ept-stat-badge emerald">
                    <Check size={11} /> {averageScore >= 75 ? "Target Met" : "Needs Push"}
                  </span>
                </div>
                <div className="ept-stat-num">
                  <AnimNum target={averageScore} suffix="%" />
                </div>
                <div className="ept-stat-label">Class Average Score</div>
              </div>
              <div className="ept-stat-meter">
                <div
                  className="ept-stat-meter-fill"
                  style={{ width: `${averageScore}%`, background: "linear-gradient(90deg, #10b981, #059669)" }}
                />
              </div>
            </div>

            {/* Card 2: Ocean Cyan Theme */}
            <div className="ept-stat-card cyan">
              <div>
                <div className="ept-stat-top">
                  <div className="ept-stat-icon cyan">
                    <CheckCircle2 size={22} />
                  </div>
                  <span className="ept-stat-badge cyan">
                    {completedExams.length}/{examProgress.length} Done
                  </span>
                </div>
                <div className="ept-stat-num">
                  <AnimNum target={completionRate} suffix="%" />
                </div>
                <div className="ept-stat-label">Exam Completion Rate</div>
              </div>
              <div className="ept-stat-meter">
                <div
                  className="ept-stat-meter-fill"
                  style={{ width: `${completionRate}%`, background: "linear-gradient(90deg, #0ea5e9, #0284c7)" }}
                />
              </div>
            </div>

            {/* Card 3: Warm Amber Theme */}
            <div className="ept-stat-card amber">
              <div>
                <div className="ept-stat-top">
                  <div className="ept-stat-icon amber">
                    <Clock size={22} />
                  </div>
                  <span className="ept-stat-badge amber">Active Sessions</span>
                </div>
                <div className="ept-stat-num">
                  <AnimNum target={studentsInProgress} />
                </div>
                <div className="ept-stat-label">Exams Currently In-Progress</div>
              </div>
              <div className="ept-stat-meter">
                <div
                  className="ept-stat-meter-fill"
                  style={{
                    width: `${examProgress.length ? (studentsInProgress / examProgress.length) * 100 : 0}%`,
                    background: "linear-gradient(90deg, #f59e0b, #d97706)",
                  }}
                />
              </div>
            </div>

            {/* Card 4: Vibrant Coral Theme */}
            <div className="ept-stat-card rose">
              <div>
                <div className="ept-stat-top">
                  <div className="ept-stat-icon rose">
                    <AlertCircle size={22} />
                  </div>
                  <span className="ept-stat-badge rose">Action Required</span>
                </div>
                <div className="ept-stat-num">
                  <AnimNum target={studentsNotStarted} />
                </div>
                <div className="ept-stat-label">Students Pending Submission</div>
              </div>
              <div className="ept-stat-meter">
                <div
                  className="ept-stat-meter-fill"
                  style={{
                    width: `${examProgress.length ? (studentsNotStarted / examProgress.length) * 100 : 0}%`,
                    background: "linear-gradient(90deg, #f43f5e, #be123c)",
                  }}
                />
              </div>
            </div>
          </section>

          {/* ─── Navigation Tabs ─────────────────────────────────────────── */}
          <nav className="ept-tabs">
            <button
              className={`ept-tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <FileText size={16} />
              <span>Assessment Overview</span>
            </button>
            <button
              className={`ept-tab ${activeTab === "class" ? "active" : ""}`}
              onClick={() => setActiveTab("class")}
            >
              <Layers size={16} />
              <span>Class-Wise Breakdown</span>
            </button>
            <button
              className={`ept-tab ${activeTab === "student" ? "active" : ""}`}
              onClick={() => setActiveTab("student")}
            >
              <Users size={16} />
              <span>Student Directory</span>
            </button>
          </nav>

          {/* ─── Tab Content: Overview ────────────────────────────────────── */}
          {activeTab === "overview" && (
            <>
              {/* Filters Bar */}
              <div className="ept-filters-bar">
                {/* Quick Presets */}
                <div className="ept-chip-row">
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--sd-muted)", marginRight: 4 }}>
                    QUICK FILTERS:
                  </span>
                  {[
                    { id: "all", label: "All Submissions" },
                    { id: "high", label: "🌟 High Scorers (>85%)" },
                    { id: "in-progress", label: "⏳ Currently Writing" },
                    { id: "needs-help", label: "⚠️ Needs Support" },
                  ].map(p => (
                    <button
                      key={p.id}
                      className={`ept-filter-chip ${filters.preset === p.id ? "active" : ""}`}
                      onClick={() => { setFilters(f => ({ ...f, preset: p.id })); setPage(1); }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="ept-filters-grid">
                  <div className="ept-filter-group">
                    <label className="ept-filter-label">Filter by Exam</label>
                    <select
                      className="ept-filter-select"
                      value={filters.exam}
                      onChange={e => {
                        setFilters(f => ({ ...f, exam: e.target.value, subject: "all" }));
                        setPage(1);
                      }}
                    >
                      <option value="all">All Exams</option>
                      {uniqueExams.map(ex => (
                        <option key={ex} value={ex}>{ex}</option>
                      ))}
                    </select>
                  </div>

                  <div className="ept-filter-group">
                    <label className="ept-filter-label">Filter by Subject</label>
                    <select
                      className="ept-filter-select"
                      value={filters.subject}
                      onChange={e => { setFilters(f => ({ ...f, subject: e.target.value })); setPage(1); }}
                      disabled={filters.exam === "all"}
                    >
                      <option value="all">All Subjects</option>
                      {uniqueSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div className="ept-filter-group">
                    <label className="ept-filter-label">Status</label>
                    <select
                      className="ept-filter-select"
                      value={filters.status}
                      onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="not-started">Not Started</option>
                    </select>
                  </div>

                  <div className="ept-filter-group">
                    <label className="ept-filter-label">Search Student</label>
                    <div className="ept-search-wrap">
                      <input
                        className="ept-filter-input"
                        placeholder="Search student or roll no..."
                        value={filters.search}
                        onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                      />
                      <Search size={15} className="ept-search-icon" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown Chart */}
              {subjectTrend.length > 0 && (
                <div className="ept-panel">
                  <div className="ept-panel-head">
                    <div>
                      <h2 className="ept-panel-title">
                        <BarChart3 size={18} color="#10b981" />
                        <span>Subject-Wise Average Performance</span>
                      </h2>
                      <div className="ept-panel-sub">
                        Average score metrics across completed assessments
                      </div>
                    </div>
                    {/* Subject color badges */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {subjectTrend.map(s => (
                        <div
                          key={s.subject}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "var(--sd-ink)",
                            background: "var(--sd-card-soft)",
                            padding: "4px 10px",
                            borderRadius: 999,
                            border: "1px solid var(--sd-line)",
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                          <span>{s.subject}: <b>{s.score}%</b></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ept-panel-body" style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--sd-line)" />
                        <XAxis
                          dataKey="subject"
                          tick={{ fontSize: 12, fill: "var(--sd-muted)", fontWeight: 700 }}
                          axisLine={{ stroke: "var(--sd-line)" }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: "var(--sd-faint)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(16, 185, 129, 0.05)" }}
                          contentStyle={{
                            background: "var(--sd-card)",
                            border: "1px solid var(--sd-line-strong)",
                            borderRadius: 12,
                            fontSize: 12,
                            color: "var(--sd-ink)",
                            boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                          }}
                        />
                        <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                          {subjectTrend.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Progress Table */}
              <div className="ept-panel">
                <div className="ept-panel-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <h2 className="ept-panel-title">
                      <GraduationCap size={18} color="#10b981" />
                      <span>Student Assessment Records</span>
                    </h2>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: "rgba(16, 185, 129, 0.12)",
                        color: "#10b981",
                      }}
                    >
                      {sorted.length} {sorted.length === 1 ? "student" : "students"}
                    </span>
                  </div>
                </div>

                <div className="ept-panel-body" style={{ padding: 0 }}>
                  <div className="ept-table-wrap">
                    <table className="ept-table">
                      <thead>
                        <tr>
                          <th className="ept-th" onClick={() => toggleSort("name")}>
                            Student {sort.key === "name" && (sort.dir === "asc" ? "▲" : "▼")}
                          </th>
                          <th className="ept-th" onClick={() => toggleSort("class")}>
                            Class {sort.key === "class" && (sort.dir === "asc" ? "▲" : "▼")}
                          </th>
                          <th className="ept-th">Exam</th>
                          <th className="ept-th" onClick={() => toggleSort("score")}>
                            Score {sort.key === "score" && (sort.dir === "asc" ? "▲" : "▼")}
                          </th>
                          <th className="ept-th" onClick={() => toggleSort("accuracy")}>
                            Accuracy {sort.key === "accuracy" && (sort.dir === "asc" ? "▲" : "▼")}
                          </th>
                          <th className="ept-th" onClick={() => toggleSort("timeSpent")}>
                            Time Spent {sort.key === "timeSpent" && (sort.dir === "asc" ? "▲" : "▼")}
                          </th>
                          <th className="ept-th" onClick={() => toggleSort("status")}>
                            Status {sort.key === "status" && (sort.dir === "asc" ? "▲" : "▼")}
                          </th>
                          <th className="ept-th">Completion Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map(s => s.progress && (
                          <motion.tr
                            key={s.id + s.progress.examId}
                            className="ept-tr"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => setDrawerStudent(s)}
                          >
                            <td className="ept-td">
                              <div className="ept-student-cell">
                                <img src={s.photo} alt={s.name} className="ept-student-photo" />
                                <div>
                                  <div className="ept-student-name">{s.name}</div>
                                  <div className="ept-student-roll">Roll #{s.rollNumber}</div>
                                </div>
                              </div>
                            </td>
                            <td className="ept-td">
                              <span style={{ fontWeight: 700 }}>Class {s.class}-{s.section}</span>
                            </td>
                            <td className="ept-td">
                              <div style={{ fontWeight: 700 }}>{s.progress.examName}</div>
                              <div style={{ fontSize: 11, color: getSubjectColor(s.progress.subject), fontWeight: 700 }}>
                                {s.progress.subject}
                              </div>
                            </td>
                            <td className="ept-td">
                              {typeof s.progress.score === "number" ? (
                                <span className={`score-pill ${s.progress.score >= 90 ? "sp-hi" : s.progress.score >= 75 ? "sp-mid" : "sp-lo"}`}>
                                  {s.progress.score}%
                                </span>
                              ) : (
                                <span style={{ color: "var(--sd-muted)" }}>–</span>
                              )}
                            </td>
                            <td className="ept-td">
                              {typeof s.progress.accuracy === "number" ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontWeight: 700 }}>{s.progress.accuracy}%</span>
                                  <div style={{ width: 44, height: 5, borderRadius: 4, background: "var(--sd-line)", overflow: "hidden" }}>
                                    <div
                                      style={{
                                        width: `${s.progress.accuracy}%`,
                                        height: "100%",
                                        background: s.progress.accuracy >= 80 ? "#10b981" : "#f59e0b",
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: "var(--sd-muted)" }}>–</span>
                              )}
                            </td>
                            <td className="ept-td">
                              {s.progress.timeSpent ? (
                                <span style={{ fontWeight: 700, color: "var(--sd-muted)" }}>
                                  {s.progress.timeSpent} mins
                                </span>
                              ) : (
                                <span style={{ color: "var(--sd-muted)" }}>–</span>
                              )}
                            </td>
                            <td className="ept-td">
                              <span className={`ept-status-badge ept-status-${s.progress.status}`}>
                                {s.progress.status === "completed" && <Check size={12} />}
                                {s.progress.status === "in-progress" && <Clock size={12} />}
                                {s.progress.status === "not-started" && <AlertCircle size={12} />}
                                {s.progress.status.replace("-", " ")}
                              </span>
                            </td>
                            <td className="ept-td" style={{ color: "var(--sd-muted)", fontWeight: 600 }}>
                              {s.progress.completionDate || "–"}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {paginated.length === 0 && (
                    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--sd-muted)" }}>
                      <Search size={36} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                      <div style={{ fontSize: 15, fontWeight: 700 }}>No assessment records match your filters</div>
                      <div style={{ fontSize: 12.5, marginTop: 4 }}>Try clearing or adjusting search keywords</div>
                    </div>
                  )}

                  {/* Pagination Footer */}
                  <div className="ept-pagination" style={{ padding: "16px 24px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sd-muted)" }}>
                      Showing {paginated.length ? (page - 1) * rowsPerPage + 1 : 0} - {Math.min(page * rowsPerPage, sorted.length)} of {sorted.length} results
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        className="ept-page-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 800, padding: "0 6px" }}>
                        {page} / {totalPages}
                      </span>
                      <button
                        className="ept-page-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── Tab Content: Class-Wise Breakdown ───────────────────────── */}
          {activeTab === "class" && (
            <div className="ept-panel">
              <div className="ept-panel-head">
                <div>
                  <h2 className="ept-panel-title">
                    <Layers size={18} color="#10b981" />
                    <span>Class Performance Comparison</span>
                  </h2>
                  <div className="ept-panel-sub">
                    Click any class card to inspect student metrics and drill into individual progress
                  </div>
                </div>
                {selectedClass && (
                  <button className="ept-btn-surface" onClick={() => setSelectedClass(null)}>
                    <X size={14} />
                    <span>Clear Class Selection ({selectedClass})</span>
                  </button>
                )}
              </div>

              <div className="ept-panel-body">
                <div className="ept-class-grid">
                  {classStats.map(c => (
                    <div
                      key={c.class}
                      className={`ept-class-card ${selectedClass === c.class ? "active" : ""}`}
                      onClick={() => {
                        setSelectedClass(c.class);
                        setActiveTab("student");
                      }}
                    >
                      <div className="ept-class-card-top">
                        <div className={`ept-class-badge ${c.isAlt ? "alt" : ""}`}>
                          {c.class}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="ept-class-name">Class {c.class}</div>
                          <div className="ept-class-meta">{c.studentCount} Students Enrolled</div>
                        </div>
                      </div>

                      <div className="ept-class-row">
                        <span>Class Average Score</span>
                        <b>{c.avgScore}%</b>
                      </div>
                      <div className="ept-class-row">
                        <span>Completion Rate</span>
                        <b>{c.completionRate}%</b>
                      </div>
                      <div className="ept-class-row">
                        <span>Exams Completed</span>
                        <b>{c.completedCount} / {c.totalRecords}</b>
                      </div>

                      <div className="ept-progress-track">
                        <div
                          className="ept-progress-fill"
                          style={{
                            width: `${c.avgScore}%`,
                            background: c.isAlt
                              ? "linear-gradient(90deg, #f59e0b, #ff791f)"
                              : "linear-gradient(90deg, #10b981, #0ea5e9)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab Content: Student Directory ─────────────────────────── */}
          {activeTab === "student" && (
            <div className="ept-panel">
              <div className="ept-panel-head">
                <div>
                  <h2 className="ept-panel-title">
                    <Users size={18} color="#10b981" />
                    <span>Student Roster{selectedClass ? ` · Class ${selectedClass}` : ""}</span>
                  </h2>
                  <div className="ept-panel-sub">
                    Click any student to launch their personalized score radar & exam history
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    className="ept-filter-select"
                    style={{ width: 140 }}
                    value={selectedClass || "all"}
                    onChange={e => setSelectedClass(e.target.value === "all" ? null : e.target.value)}
                  >
                    <option value="all">All Classes</option>
                    {uniqueClasses.map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>

                  <div className="ept-search-wrap" style={{ width: 220 }}>
                    <input
                      className="ept-filter-input"
                      placeholder="Search student..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                    />
                    <Search size={14} className="ept-search-icon" />
                  </div>
                </div>
              </div>

              <div className="ept-panel-body">
                <div className="ept-student-grid">
                  {studentOverallList.map(s => (
                    <div
                      key={s.id}
                      className="ept-student-card"
                      onClick={() => setDrawerStudent(s)}
                    >
                      <img src={s.photo} alt={s.name} className="ept-student-card-photo" />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: "var(--sd-muted)", marginTop: 2 }}>
                          Class {s.class}-{s.section} · {s.examCount} exam{s.examCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="ept-student-card-pct">
                        {s.overall}%
                      </div>
                    </div>
                  ))}
                </div>

                {studentOverallList.length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "var(--sd-muted)" }}>
                    <Users size={36} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                    <div style={{ fontSize: 15, fontWeight: 700 }}>No students found</div>
                    <div style={{ fontSize: 12.5, marginTop: 4 }}>Try clearing class or search criteria</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Student Detail Drawer ───────────────────────────────────── */}
        {drawerStudent && (
          <StudentDrawer
            student={drawerStudent}
            onClose={() => setDrawerStudent(null)}
          />
        )}
      </div>
    </>
  );
}