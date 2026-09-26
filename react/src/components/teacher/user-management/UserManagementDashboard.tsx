import React, { useState, useEffect, useMemo } from "react";
import roboImg from "../../../assets/robo.png";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface FeatureUsage {
  feature: string;
  timeSpent: number;
}

interface StudentAnalytics {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  photo: string;
  email: string;
  lastActive: string;
  loginFrequency: number;
  totalLearningTime: number;
  progress: number;
  engagementScore: number;
  featureUsage: FeatureUsage[];
  activityHistory: { date: string; timeSpent: number }[];
}

interface ClassAnalytics {
  class: string;
  section: string;
  totalStudents: number;
  totalLearningTime: number;
  avgTimePerStudent: number;
  mostUsedFeature: string;
  leastUsedFeature: string;
  activeStudents: number;
  inactiveStudents: number;
  featureBreakdown: { feature: string; time: number }[];
}

interface DashboardAnalytics {
  totalStudents: number;
  activeStudents: number;
  totalLearningHours: number;
  avgUsageTime: number;
  featureEngagementRate: { feature: string; rate: number }[];
  studentCompletionRate: number;
}

// ─── MOCK DATA GENERATION ─────────────────────────────────────────────────────
const NAMES = [
  "Aarav Sharma", "Vivaan Singh", "Aditya Kumar", "Ishaan Patel", "Diya Gupta", "Ananya Reddy",
  "Aryan Joshi", "Riya Malhotra", "Kabir Verma", "Myra Chauhan", "Priya Nair", "Rohan Mehta",
  "Saanvi Desai", "Arjun Pillai", "Anika Menon", "Krish Iyer", "Zara Khan", "Advik Rao",
  "Neha Kapoor", "Siddharth Bose", "Pooja Iyer", "Rahul Nanda", "Tanvi Shah", "Dev Pandey"
];

const CLASSES = [
  { class: "9", section: "A" }, { class: "9", section: "B" }, { class: "10", section: "A" },
  { class: "10", section: "B" }, { class: "11", section: "A" }, { class: "12", section: "A" },
];

const FEATURES = ["AI Tutor", "Book Library", "Exams", "Debate", "Seminar", "Extras"];

// Vibrant student-dashboard colorful scheme
const FC: Record<string, string> = {
  "AI Tutor": "#10b981",    // Emerald
  "Book Library": "#06b6d4", // Cyan
  "Exams": "#f59e0b",        // Amber
  "Debate": "#f43f5e",       // Rose
  "Seminar": "#8b5cf6",      // Violet
  "Extras": "#27b86a",       // Jade
};

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

function genHistory(total: number) {
  const h: { date: string; timeSpent: number }[] = [];
  let rem = total;
  for (let i = 0; i < 30; i++) {
    if (rem <= 0) break;
    const d = new Date();
    d.setDate(d.getDate() - i);
    const t = Math.random() > 0.3 ? Math.min(rem, rnd(15, 90)) : 0;
    if (t > 0) {
      h.push({ date: d.toISOString().split("T")[0], timeSpent: t });
      rem -= t;
    }
  }
  return h;
}

const STUDENTS: StudentAnalytics[] = NAMES.map((name, i) => {
  const ci = CLASSES[i % CLASSES.length];
  const total = rnd(500, 3500);
  const fu: FeatureUsage[] = [];
  let pool = total;
  const fc = [...FEATURES];
  while (pool > 0 && fc.length > 0) {
    const idx = Math.floor(Math.random() * fc.length);
    const f = fc.splice(idx, 1)[0];
    const t = Math.min(pool, rnd(50, Math.max(60, Math.floor(pool / 2))));
    fu.push({ feature: f, timeSpent: t });
    pool -= t;
  }
  if (pool > 0 && fu.length > 0) fu[0].timeSpent += pool;
  const lb = rnd(0, 14);
  const la = new Date();
  la.setDate(la.getDate() - lb);
  return {
    id: `S${(i + 1).toString().padStart(3, "0")}`,
    name,
    rollNumber: `${ci.class}0${i + 1}`,
    class: ci.class,
    section: ci.section,
    photo: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
    email: `${name.split(" ")[0].toLowerCase()}@school.edu`,
    lastActive: la.toISOString(),
    loginFrequency: rnd(1, 10),
    totalLearningTime: total,
    progress: rnd(20, 95),
    engagementScore: rnd(30, 98),
    featureUsage: fu,
    activityHistory: genHistory(total),
  };
});

const CLS_DATA: ClassAnalytics[] = CLASSES.map(({ class: cn, section }) => {
  const ss = STUDENTS.filter(s => s.class === cn && s.section === section);
  if (!ss.length) {
    return {
      class: cn, section, totalStudents: 0, totalLearningTime: 0, avgTimePerStudent: 0,
      mostUsedFeature: "N/A", leastUsedFeature: "N/A", activeStudents: 0, inactiveStudents: 0,
      featureBreakdown: []
    };
  }
  const ttl = ss.reduce((a, s) => a + s.totalLearningTime, 0);
  const ft: Record<string, number> = {};
  ss.forEach(s => s.featureUsage.forEach(f => { ft[f.feature] = (ft[f.feature] || 0) + f.timeSpent; }));
  const sorted = Object.entries(ft).sort(([, a], [, b]) => a - b);
  const sa = new Date();
  sa.setDate(sa.getDate() - 7);
  const active = ss.filter(s => new Date(s.lastActive) > sa).length;
  return {
    class: cn,
    section,
    totalStudents: ss.length,
    totalLearningTime: ttl,
    avgTimePerStudent: Math.floor(ttl / ss.length),
    mostUsedFeature: sorted.length ? sorted[sorted.length - 1][0] : "N/A",
    leastUsedFeature: sorted.length ? sorted[0][0] : "N/A",
    activeStudents: active,
    inactiveStudents: ss.length - active,
    featureBreakdown: sorted.map(([feature, time]) => ({ feature, time })).reverse()
  };
});

const DASH: DashboardAnalytics = (() => {
  const n = STUDENTS.length;
  const ttl = STUDENTS.reduce((a, s) => a + s.totalLearningTime, 0);
  const sa = new Date();
  sa.setDate(sa.getDate() - 7);
  const act = STUDENTS.filter(s => new Date(s.lastActive) > sa).length;
  const fe: Record<string, number> = {};
  STUDENTS.forEach(s => s.featureUsage.forEach(f => { fe[f.feature] = (fe[f.feature] || 0) + 1; }));
  return {
    totalStudents: n,
    activeStudents: act,
    totalLearningHours: Math.floor(ttl / 60),
    avgUsageTime: Math.floor(ttl / n),
    featureEngagementRate: Object.entries(fe).map(([f, c]) => ({ feature: f, rate: Math.round((c / n) * 100) })).sort((a, b) => b.rate - a.rate),
    studentCompletionRate: Math.round(STUDENTS.reduce((a, s) => a + s.progress, 0) / n),
  };
})();

const api = {
  getDashboard: () => new Promise<DashboardAnalytics>(r => setTimeout(() => r(DASH), 350)),
  getStudents: () => new Promise<StudentAnalytics[]>(r => setTimeout(() => r(STUDENTS), 450)),
  getClasses: () => new Promise<ClassAnalytics[]>(r => setTimeout(() => r(CLS_DATA), 400)),
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const isActive = (la: string) => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return new Date(la) > d;
};
const fmtMins = (m: number) => m >= 60 ? `${Math.round(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ""}`.trim() : `${m}m`;
const engLevel = (s: number) => s > 75 ? "high" : s > 50 ? "med" : "low";
const engWord = (s: number) => s > 75 ? "Highly engaged" : s > 50 ? "Moderately engaged" : "Needs attention";

// ─── CSS DESIGN TOKENS & ANIMATIONS ──────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --sd-page: #fbfcff;
  --sd-page-2: #f4f8fe;
  --sd-card: #ffffff;
  --sd-card-soft: #f8fbff;
  --sd-card-alt: #f1f6fd;
  --sd-ink: #071235;
  --sd-muted: #5e6b8c;
  --sd-faint: #8d9bb5;
  --sd-line: rgba(15, 23, 42, 0.08);
  --sd-line-strong: rgba(15, 23, 42, 0.14);
  --sd-shadow: 0 14px 34px rgba(35, 44, 87, 0.08);
  --sd-shadow-soft: 0 6px 20px rgba(35, 44, 87, 0.05);
  --sd-shadow-lift: 0 20px 40px rgba(16, 185, 129, 0.16);
  --sd-input-bg: #ffffff;
  --sd-input-border: #e2e8f0;
  --sd-emerald: #10b981;
  --sd-amber: #f59e0b;
  --sd-cyan: #06b6d4;
  --sd-rose: #f43f5e;
  --sd-purple: #8b5cf6;
  --sd-jade: #27b86a;
  --sd-orange: #ff791f;
}

/* ─── DARK THEME (HIGH CONTRAST & ATTRACTIVE) ─── */
[data-theme="dark"],
.dark .um,
.um[data-theme="dark"] {
  --sd-page: #060b18 !important;
  --sd-page-2: #0b1328 !important;
  --sd-card: rgba(18, 27, 54, 0.94) !important;
  --sd-card-soft: rgba(25, 37, 72, 0.72) !important;
  --sd-card-alt: rgba(30, 44, 84, 0.85) !important;
  --sd-ink: #f8fafc !important;
  --sd-muted: #a5b4cf !important;
  --sd-faint: #7080a2 !important;
  --sd-line: rgba(255, 255, 255, 0.10) !important;
  --sd-line-strong: rgba(255, 255, 255, 0.18) !important;
  --sd-shadow: 0 20px 54px rgba(0, 0, 0, 0.6) !important;
  --sd-shadow-soft: 0 10px 28px rgba(0, 0, 0, 0.4) !important;
  --sd-shadow-lift: 0 20px 44px rgba(0, 0, 0, 0.7) !important;
  --sd-input-bg: #121c38 !important;
  --sd-input-border: rgba(255, 255, 255, 0.16) !important;
}

.um {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  color: var(--sd-ink);
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 16px 20px 60px;
  background: radial-gradient(circle at 14% 9%, rgba(16, 185, 129, 0.08), transparent 28%),
              radial-gradient(circle at 88% 14%, rgba(245, 158, 11, 0.10), transparent 26%),
              linear-gradient(180deg, var(--sd-page), var(--sd-page-2));
  transition: background 0.3s ease, color 0.3s ease;
}

[data-theme="dark"] .um,
.um[data-theme="dark"] {
  background: radial-gradient(circle at 14% 0%, rgba(16, 185, 129, 0.12), transparent 28%),
              radial-gradient(circle at 88% 5%, rgba(245, 158, 11, 0.10), transparent 28%),
              linear-gradient(180deg, #060b18 0%, #0b1328 100%) !important;
}

/* ─── ANIMATED BACKGROUND BLOBS & SPARKS ─── */
.um::before,
.um::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(40px);
  opacity: 0.6;
  animation: sdFloatBg 14s ease-in-out infinite alternate;
}
.um::before {
  width: 300px;
  height: 300px;
  left: -80px;
  top: 70px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.18), transparent 70%);
}
.um::after {
  width: 340px;
  height: 340px;
  right: -100px;
  top: 340px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.15), transparent 70%);
  animation-delay: -6s;
}

.sd-bg-spark {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
  opacity: 0.55;
  animation: sdDrift 10s ease-in-out infinite;
}
.sd-bg-spark.s1 {
  left: 45%;
  top: 90px;
  width: 9px;
  height: 9px;
  background: #ffb21d;
  box-shadow: 42px 30px 0 #10b981, 90px -16px 0 #06b6d4;
}
.sd-bg-spark.s2 {
  right: 10%;
  top: 240px;
  width: 8px;
  height: 8px;
  background: #f43f5e;
  box-shadow: -46px 42px 0 #10b981, -94px -20px 0 #06b6d4;
  animation-delay: -3s;
}
.sd-bg-spark.s3 {
  left: 8%;
  bottom: 220px;
  width: 8px;
  height: 8px;
  background: #10b981;
  box-shadow: 44px -32px 0 #ff791f, 96px 20px 0 #06b6d4;
  animation-delay: -5s;
}

.sd-bg-ribbon {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  left: 3%;
  right: 3%;
  top: 170px;
  height: 180px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.08), rgba(245, 158, 11, 0.09), rgba(6, 182, 212, 0.08));
  filter: blur(24px);
  opacity: 0.7;
  animation: sdBgWave 14s ease-in-out infinite;
}

/* ─── KEYFRAME ANIMATIONS ─── */
@keyframes sdFloatBg {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(24px, 32px, 0) scale(1.1); }
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes sdBreathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes sdFloatSlow {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-9px) rotate(2.5deg); }
}
@keyframes sdPulseSoft {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.28); }
  50% { box-shadow: 0 0 0 9px rgba(16, 185, 129, 0); }
}
@keyframes sdPop3d {
  0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
  50% { transform: translateY(-6px) rotate(3deg) scale(1.06); }
}
@keyframes sdShine {
  0% { transform: translateX(-120%) rotate(20deg); }
  45%, 100% { transform: translateX(240%) rotate(20deg); }
}
@keyframes sdBgWave {
  0%, 100% { transform: translate3d(-1.5%, 0, 0) rotate(0); }
  50% { transform: translate3d(1.5%, -1.5%, 0) rotate(1.5deg); }
}
@keyframes sdDrift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0); }
  50% { transform: translate3d(16px, -14px, 0) rotate(6deg); }
}

/* ─── SHELL CONTAINER ─── */
.sd-shell {
  max-width: 1260px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* ─── TOPBAR ─── */
.topbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 18px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 18px;
  box-shadow: var(--sd-shadow-soft);
  margin-bottom: 20px;
  backdrop-filter: blur(12px);
  animation: cardIn 0.4s both;
}
.top-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.top-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 8px 18px rgba(16, 185, 129, 0.3);
  animation: sdPop3d 4.5s ease-in-out infinite;
  flex-shrink: 0;
}
.top-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--sd-ink);
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.top-sub {
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 2px;
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.date-pill {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--sd-muted);
  padding: 7px 13px;
  border-radius: 12px;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  white-space: nowrap;
}
.btn-emerald {
  border: 0;
  border-radius: 12px;
  padding: 8px 16px;
  min-height: 38px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.32);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  white-space: nowrap;
}
.btn-emerald:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(16, 185, 129, 0.45);
}
.btn-emerald:active {
  transform: translateY(0);
}
.theme-btn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid var(--sd-line-strong);
  background: var(--sd-card-soft);
  color: var(--sd-ink);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
  flex-shrink: 0;
}
.theme-btn:hover {
  border-color: #10b981;
  color: #10b981;
  transform: translateY(-2px);
}

/* ─── HERO BANNER (NO PURPLE/BLUE GRADIENT) ─── */
.sd-hero {
  position: relative;
  overflow: hidden;
  min-height: 220px;
  border-radius: 24px;
  padding: 26px 32px;
  background: linear-gradient(135deg, #dcfce7 0%, #ecfdf5 45%, #fffbeb 100%);
  border: 1px solid rgba(16, 185, 129, 0.28);
  box-shadow: var(--sd-shadow);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 22px;
  animation: cardIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

[data-theme="dark"] .sd-hero,
.um[data-theme="dark"] .sd-hero {
  background: linear-gradient(135deg, #052618 0%, #0a3327 50%, #0e2038 100%) !important;
  border-color: rgba(16, 185, 129, 0.35) !important;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.65) !important;
}

.sd-hero::after {
  content: "";
  position: absolute;
  top: -60px;
  bottom: -60px;
  width: 90px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.38), transparent);
  animation: sdShine 7.5s ease-in-out infinite;
}

.sd-hero-content {
  position: relative;
  z-index: 2;
  max-width: 650px;
}

.sd-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 13px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.02em;
  background: rgba(16, 185, 129, 0.16);
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.32);
  margin-bottom: 10px;
}

[data-theme="dark"] .sd-chip {
  background: rgba(16, 185, 129, 0.24);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.45);
}

.sd-hero-title {
  font-size: clamp(22px, 3.2vw, 30px);
  font-weight: 900;
  line-height: 1.18;
  color: var(--sd-ink);
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}

.sd-hero-desc {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--sd-muted);
  margin: 0 0 18px;
  max-width: 580px;
}

.sd-hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-subtle {
  border: 1px solid var(--sd-line-strong);
  border-radius: 12px;
  padding: 8px 16px;
  min-height: 38px;
  background: var(--sd-card);
  color: var(--sd-ink);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  box-shadow: var(--sd-shadow-soft);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
  white-space: nowrap;
}
.btn-subtle:hover {
  transform: translateY(-2px);
  background: var(--sd-card-soft);
  border-color: rgba(16, 185, 129, 0.4);
  color: #10b981;
}

/* ─── HERO ROBO MASCOT STAGE ─── */
.sd-hero-robo-wrap {
  position: relative;
  z-index: 2;
  flex: 0 0 210px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sd-hero-robo-glow {
  position: absolute;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.35), rgba(245, 158, 11, 0.18), transparent 70%);
  filter: blur(16px);
  animation: sdBreathe 4.5s ease-in-out infinite;
}

[data-theme="dark"] .sd-hero-robo-glow {
  background: radial-gradient(circle, rgba(16, 185, 129, 0.42), rgba(6, 182, 212, 0.25), transparent 70%);
}

.sd-hero-robo-img {
  width: 160px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 18px 24px rgba(10, 40, 25, 0.22));
  animation: sdFloatSlow 5s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

.sd-robo-bubble {
  position: absolute;
  top: 0px;
  right: -10px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line-strong);
  padding: 6px 12px;
  border-radius: 18px;
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-ink);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  animation: sdBreathe 4s ease-in-out infinite;
  z-index: 3;
}
.sd-bubble-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: sdPulseSoft 2.5s infinite;
}

[data-theme="dark"] .sd-robo-bubble {
  background: rgba(22, 33, 64, 0.95);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.16);
}

/* ─── METRIC STAT CARDS (COLOURFUL LIKE STUDENT DASHBOARD) ─── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 13px;
  margin-bottom: 22px;
}

.stat-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 18px;
  padding: 16px 15px;
  box-shadow: var(--sd-shadow-soft);
  position: relative;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  animation: cardIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--sd-shadow);
}

/* Student dashboard color borders & glow */
.stat-card.emerald { border-top: 3.5px solid #10b981; }
.stat-card.emerald:hover { border-color: rgba(16, 185, 129, 0.35); box-shadow: 0 16px 36px rgba(16, 185, 129, 0.18); }

.stat-card.cyan { border-top: 3.5px solid #06b6d4; }
.stat-card.cyan:hover { border-color: rgba(6, 182, 212, 0.35); box-shadow: 0 16px 36px rgba(6, 182, 212, 0.18); }

.stat-card.amber { border-top: 3.5px solid #f59e0b; }
.stat-card.amber:hover { border-color: rgba(245, 158, 11, 0.35); box-shadow: 0 16px 36px rgba(245, 158, 11, 0.18); }

.stat-card.orange { border-top: 3.5px solid #ff791f; }
.stat-card.orange:hover { border-color: rgba(255, 121, 31, 0.35); box-shadow: 0 16px 36px rgba(255, 121, 31, 0.18); }

.stat-card.rose { border-top: 3.5px solid #f43f5e; }
.stat-card.rose:hover { border-color: rgba(244, 63, 94, 0.35); box-shadow: 0 16px 36px rgba(244, 63, 94, 0.18); }

.stat-card.jade { border-top: 3.5px solid #27b86a; }
.stat-card.jade:hover { border-color: rgba(39, 184, 106, 0.35); box-shadow: 0 16px 36px rgba(39, 184, 106, 0.18); }

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.stat-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  animation: sdPop3d 4.2s ease-in-out infinite;
}

.stat-card.emerald .stat-icon { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.stat-card.cyan .stat-icon { background: rgba(6, 182, 212, 0.12); color: #06b6d4; }
.stat-card.amber .stat-icon { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
.stat-card.orange .stat-icon { background: rgba(255, 121, 31, 0.12); color: #ff791f; }
.stat-card.rose .stat-icon { background: rgba(244, 63, 94, 0.12); color: #f43f5e; }
.stat-card.jade .stat-icon { background: rgba(39, 184, 106, 0.12); color: #27b86a; }

.stat-pill {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--sd-card-alt);
  color: var(--sd-muted);
  border: 1px solid var(--sd-line);
}

.stat-num {
  font-size: clamp(20px, 2.2vw, 26px);
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--sd-ink);
  line-height: 1.1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-bottom: 6px;
}

.stat-sub {
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-card.emerald .stat-sub { color: #10b981; }
.stat-card.cyan .stat-sub { color: #06b6d4; }
.stat-card.amber .stat-sub { color: #f59e0b; }
.stat-card.orange .stat-sub { color: #ff791f; }
.stat-card.rose .stat-sub { color: #f43f5e; }
.stat-card.jade .stat-sub { color: #27b86a; }

/* ─── NAVIGATION TABS ─── */
.nav-tabs {
  display: flex;
  gap: 8px;
  padding: 6px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 16px;
  box-shadow: var(--sd-shadow-soft);
  margin-bottom: 20px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.nav-tabs::-webkit-scrollbar { display: none; }

.tab-btn {
  padding: 9px 18px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--sd-muted);
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.tab-btn:hover {
  background: var(--sd-card-soft);
  color: var(--sd-ink);
}
.tab-btn.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
}
.badge-count {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  background: #f43f5e;
  color: #fff;
  box-shadow: 0 2px 6px rgba(244, 63, 94, 0.4);
}

/* ─── PANEL CARDS ─── */
.panel {
  background: var(--sd-card);
  border-radius: 18px;
  border: 1px solid var(--sd-line);
  box-shadow: var(--sd-shadow-soft);
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  animation: cardIn 0.4s both;
}
.panel:hover {
  box-shadow: var(--sd-shadow);
  border-color: rgba(16, 185, 129, 0.22);
}
.panel-head {
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--sd-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.panel-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--sd-ink);
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-sub {
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 3px;
}
.panel-body {
  padding: 18px 20px;
}

/* ─── GRIDS ─── */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 18px;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 18px;
}
.mb-18 { margin-bottom: 18px; }

/* ─── STATUS CHIPS ─── */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.chip.high, .chip.active {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}
.chip.med {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}
.chip.low, .chip.inactive {
  background: rgba(244, 63, 94, 0.12);
  color: #e11d48;
}
[data-theme="dark"] .chip.high, [data-theme="dark"] .chip.active {
  background: rgba(16, 185, 129, 0.25);
  color: #34d399;
}
[data-theme="dark"] .chip.med {
  background: rgba(245, 158, 11, 0.25);
  color: #fbbf24;
}
[data-theme="dark"] .chip.low, [data-theme="dark"] .chip.inactive {
  background: rgba(244, 63, 94, 0.25);
  color: #fb7185;
}

/* ─── TABLE STYLES ─── */
.table-wrap {
  overflow-x: auto;
  border-radius: 12px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}
.th {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sd-muted);
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid var(--sd-line);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color 0.15s;
}
.th:hover { color: #10b981; }
.tr {
  cursor: pointer;
  transition: background 0.15s ease;
}
.tr:hover { background: var(--sd-card-soft); }
.td {
  padding: 12px 14px;
  font-size: 13px;
  color: var(--sd-ink);
  border-bottom: 1px solid var(--sd-line);
}
.tr:last-child .td { border-bottom: none; }
.student-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.student-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--sd-card);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
.student-name {
  font-weight: 700;
  font-size: 13.5px;
}
.student-roll {
  font-size: 11px;
  font-weight: 600;
  color: var(--sd-muted);
}
.progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.progress-track {
  height: 7px;
  background: var(--sd-card-alt);
  border-radius: 999px;
  overflow: hidden;
  flex: 1;
}
.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.5s ease;
}

/* ─── MOBILE STUDENT CARDS ─── */
.mobile-cards { display: none; }
.m-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--sd-line);
  background: var(--sd-card-soft);
  margin-bottom: 10px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.m-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--sd-shadow-soft);
}
.m-body { flex: 1; min-width: 0; }
.m-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.m-meta {
  display: flex;
  gap: 10px;
  margin-top: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--sd-muted);
  flex-wrap: wrap;
}

/* ─── FILTER BAR ─── */
.filter-bar {
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 16px;
}
.filter-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
}
.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 120px;
  flex: 1;
}
.filter-label {
  font-size: 10.5px;
  font-weight: 800;
  color: var(--sd-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.filter-select, .filter-input {
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--sd-line-strong);
  background: var(--sd-card);
  color: var(--sd-ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  width: 100%;
}
.filter-select:focus, .filter-input:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
}
.search-wrap {
  position: relative;
}
.search-icon {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  color: var(--sd-muted);
  font-size: 13px;
  pointer-events: none;
}

/* ─── PAGINATION ─── */
.pagination {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 14px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.page-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--sd-line-strong);
  background: var(--sd-card);
  color: var(--sd-ink);
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.page-btn:hover {
  border-color: #10b981;
  color: #10b981;
}
.page-btn.active {
  background: #10b981;
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
}
.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.page-info {
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
  width: 100%;
  margin-bottom: 6px;
}

/* ─── BAR LIST WORKHORSE CHART ─── */
.bar-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}
.bar-row {
  display: grid;
  grid-template-columns: 96px 1fr 68px;
  align-items: center;
  gap: 12px;
}
.bar-row.wide-label {
  grid-template-columns: 126px 1fr 68px;
}
.bar-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--sd-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar-track {
  height: 14px;
  background: var(--sd-card-alt);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.bar-val {
  font-size: 12.5px;
  font-weight: 800;
  text-align: right;
  color: var(--sd-ink);
  white-space: nowrap;
}

/* ─── INSIGHT CALLOUT ─── */
.insight-box {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 12px;
  padding: 12px 14px;
  margin-top: 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
  line-height: 1.5;
}
.insight-box b {
  color: var(--sd-ink);
}

/* ─── RANK ROW ─── */
.rank-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--sd-line);
  cursor: pointer;
  transition: transform 0.15s ease;
}
.rank-row:hover {
  transform: translateX(4px);
}
.rank-row:last-child { border-bottom: none; }
.rank-num {
  font-size: 13px;
  font-weight: 900;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}
.rank-img {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1.5px solid var(--sd-line-strong);
}
.rank-info {
  flex: 1;
  min-width: 0;
}
.rank-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--sd-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-det {
  font-size: 11px;
  font-weight: 600;
  color: var(--sd-muted);
}
.rank-score {
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
  text-align: right;
}

/* ─── ALERT ITEM ─── */
.alert-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--sd-line);
  background: var(--sd-card-soft);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.alert-item:hover {
  transform: translateY(-2px);
  border-color: rgba(244, 63, 94, 0.4);
  box-shadow: 0 10px 24px rgba(244, 63, 94, 0.12);
}
.alert-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.alert-info {
  flex: 1;
  min-width: 0;
}
.alert-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--sd-ink);
}
.alert-det {
  font-size: 11px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 1px;
}

/* ─── STUDENT DRAWER ─── */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(7, 18, 53, 0.55);
  backdrop-filter: blur(4px);
  z-index: 100;
  animation: fadeIn 0.2s ease;
}
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 480px;
  max-width: 95vw;
  height: 100%;
  background: var(--sd-card);
  z-index: 101;
  overflow-y: auto;
  box-shadow: -14px 0 44px rgba(0, 0, 0, 0.25);
  animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

.drawer-head {
  padding: 18px 22px;
  border-bottom: 1px solid var(--sd-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background: var(--sd-card);
  z-index: 2;
}
.drawer-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--sd-ink);
}
.drawer-close {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid var(--sd-line-strong);
  background: var(--sd-card-soft);
  cursor: pointer;
  color: var(--sd-muted);
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.drawer-close:hover {
  background: rgba(244, 63, 94, 0.12);
  color: #f43f5e;
  border-color: #f43f5e;
}
.drawer-body {
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.drawer-sec {
  background: var(--sd-card-soft);
  border-radius: 14px;
  padding: 15px;
  border: 1px solid var(--sd-line);
}
.drawer-sec-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sd-muted);
  margin-bottom: 10px;
}
.drawer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid var(--sd-line);
  font-size: 13px;
}
.drawer-row:last-child { border-bottom: none; }
.drawer-label { color: var(--sd-muted); font-weight: 600; }
.drawer-val { font-weight: 700; color: var(--sd-ink); }

/* Big num tiles */
.bignum-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.bignum-card {
  text-align: center;
  padding: 14px 8px;
  border-radius: 12px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
}
.bignum-val {
  font-size: 24px;
  font-weight: 900;
  line-height: 1.1;
}
.bignum-lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 4px;
}

/* ─── TOAST ─── */
.toast-msg {
  position: fixed;
  bottom: 22px;
  right: 22px;
  padding: 12px 20px;
  border-radius: 14px;
  background: #10b981;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: cardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ─── LOADER ─── */
.loader-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 65vh;
  gap: 16px;
}
.spinner {
  width: 44px;
  height: 44px;
  border: 3.5px solid var(--sd-line-strong);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── RESPONSIVE BREAKPOINTS ─── */
@media (max-width: 1150px) {
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
  .grid-3 { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 860px) {
  .sd-hero {
    flex-direction: column-reverse;
    text-align: center;
    padding: 22px 20px;
    align-items: center;
  }
  .sd-hero-content {
    max-width: 100%;
  }
  .sd-hero-actions {
    justify-content: center;
  }
  .sd-hero-robo-wrap {
    flex: 0 0 auto;
    margin-bottom: 8px;
  }
  .sd-hero-robo-img {
    width: 135px;
  }
  .sd-hero-robo-glow {
    width: 150px;
    height: 150px;
  }
  .grid-2 { grid-template-columns: 1fr; }
  .grid-3 { grid-template-columns: 1fr; }
}

@media (max-width: 700px) {
  .topbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .top-actions {
    justify-content: space-between;
    width: 100%;
  }
  .date-pill { display: none; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .stat-card { padding: 13px 12px; }
  .stat-num { font-size: 20px; }
  .table-wrap { display: none; }
  .mobile-cards { display: block; }
  .drawer { width: 100%; }
  .filter-grid { flex-direction: column; align-items: stretch; }
  .filter-group { min-width: 0; }
  .bignum-grid { grid-template-columns: 1fr; }
  .bar-row, .bar-row.wide-label { grid-template-columns: 78px 1fr 56px; gap: 8px; }
}

@media (max-width: 420px) {
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .stat-sub { display: none; }
  .sd-hero-title { font-size: 20px; }
}
`;

// ─── ANIMATED NUMBER COMPONENT ───────────────────────────────────────────────
function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let c = 0;
    const step = () => {
      c += target / 40;
      if (c < target) {
        setV(Math.floor(c));
        requestAnimationFrame(step);
      } else {
        setV(target);
      }
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{v.toLocaleString()}{suffix}</>;
}

// ─── HORIZONTAL BAR LIST (WORKHORSE CHART) ────────────────────────────────────
function BarList({
  data,
  valueFormatter = (v: number) => String(v),
  wideLabel = false,
}: {
  data: { label: string; value: number; color?: string }[];
  valueFormatter?: (v: number) => string;
  wideLabel?: boolean;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bar-list">
      {data.map((d, i) => (
        <div key={d.label + i} className={`bar-row${wideLabel ? " wide-label" : ""}`}>
          <div className="bar-label" title={d.label}>{d.label}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.color || "#10b981",
              }}
            />
          </div>
          <div className="bar-val">{valueFormatter(d.value)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── SIMPLE DONUT CHART ──────────────────────────────────────────────────────
function SimpleDonut({
  data,
  size = 120,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  const [hov, setHov] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
        role="img"
        aria-label="Donut chart showing share of time per feature"
      >
        {data.map((d, i) => {
          const frac = d.value / total;
          const off = circ * cum;
          cum += frac;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={hov === i ? 15 : 11}
              strokeDasharray={`${circ * frac} ${circ * (1 - frac)}`}
              strokeDashoffset={-off}
              style={{ cursor: "pointer", transition: "stroke-width 0.15s ease" }}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            />
          );
        })}
      </svg>
      <div style={{ flex: 1, minWidth: 160 }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: i < data.length - 1 ? "1px solid var(--sd-line)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--sd-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.label}
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--sd-ink)", flexShrink: 0, marginLeft: 8 }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TREND LINE (NATURE EMERALD GRADIENT - NO PURPLE/BLUE) ────────────────────
function TrendLine({
  data,
  color = "#10b981",
  height = 140,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const [hov, setHov] = useState<number | null>(null);
  const W = 600, H = height, pL = 12, pB = 24, pT = 14, pR = 12;
  const iW = W - pL - pR;
  const iH = H - pT - pB;

  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const stepW = iW / (data.length - 1);
  const pts = data.map((v, i) => [pL + i * stepW, pT + iH - (v / max) * iH]);
  const pathD = pts.map((p, i) => i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`).join(" ");
  const fillD = pathD + ` L${pts[pts.length - 1][0]},${pT + iH} L${pts[0][0]},${pT + iH} Z`;

  const move = (clientX: number, rect: DOMRect) => {
    const mx = (clientX - rect.left) * (W / rect.width) - pL;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(mx / stepW)));
    setHov(idx);
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", touchAction: "none" }}
      role="img"
      aria-label="Line chart of total learning minutes per day over the last 30 days"
      onMouseMove={e => move(e.clientX, e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setHov(null)}
      onTouchStart={e => move(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
      onTouchMove={e => move(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
    >
      <defs>
        <linearGradient id="natureTrendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <line x1={pL} y1={pT + iH} x2={W - pR} y2={pT + iH} stroke="var(--sd-line)" />
      <path d={fillD} fill="url(#natureTrendGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
      <text x={pL} y={H - 4} fontSize={10.5} fill="var(--sd-muted)" fontWeight="600">30 days ago</text>
      <text x={W - pR} y={H - 4} fontSize={10.5} fill="var(--sd-muted)" fontWeight="600" textAnchor="end">Today</text>
      {hov !== null && (
        <g>
          <line x1={pts[hov][0]} y1={pT} x2={pts[hov][0]} y2={pT + iH} stroke={color} strokeDasharray="3,3" strokeWidth={1.5} />
          <circle cx={pts[hov][0]} cy={pts[hov][1]} r={5.5} fill={color} stroke="#ffffff" strokeWidth={2} />
          <rect
            x={Math.min(Math.max(pts[hov][0] - 42, pL), W - pR - 84)}
            y={Math.max(pts[hov][1] - 32, pT)}
            width={84}
            height={24}
            rx={6}
            fill="var(--sd-card)"
            stroke="var(--sd-line-strong)"
            strokeWidth={1}
          />
          <text
            x={Math.min(Math.max(pts[hov][0] - 38, pL + 4), W - pR - 80) + 38}
            y={Math.max(pts[hov][1] - 16, pT + 16)}
            fontSize={11}
            fill="var(--sd-ink)"
            fontWeight="800"
            textAnchor="middle"
          >
            {fmtMins(data[hov])}
          </text>
        </g>
      )}
    </svg>
  );
}

// ─── STATUS SPLIT ────────────────────────────────────────────────────────────
function StatusSplit({
  active,
  total,
  activeLabel = "active",
  inactiveLabel = "inactive",
}: {
  active: number;
  total: number;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  const pct = total > 0 ? Math.round((active / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "var(--sd-ink)", letterSpacing: "-0.02em" }}>{pct}%</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sd-muted)" }}>
          {active} of {total} students {activeLabel} this week
        </div>
      </div>
      <div style={{ height: 16, borderRadius: 999, overflow: "hidden", display: "flex", background: "var(--sd-card-alt)" }}>
        <div style={{ width: `${pct}%`, background: "linear-gradient(90deg, #10b981, #059669)", transition: "width 0.6s ease" }} />
        <div style={{ width: `${100 - pct}%`, background: "linear-gradient(90deg, #f43f5e, #e11d48)", transition: "width 0.6s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--sd-muted)" }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#10b981" }} />
          {active} {activeLabel}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--sd-muted)" }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#f43f5e" }} />
          {total - active} {inactiveLabel}
        </div>
      </div>
    </div>
  );
}

// ─── CALENDAR HEATMAP (STUDENT ACTIVITY) ──────────────────────────────────────
function CalendarHeatmap({ history }: { history: { date: string; timeSpent: number }[] }) {
  const map: Record<string, number> = {};
  history.forEach(h => { map[h.date] = (map[h.date] || 0) + h.timeSpent; });
  const days: { date: string; time: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toISOString().split("T")[0];
    days.push({ date: k, time: map[k] || 0 });
  }
  const maxT = Math.max(...days.map(d => d.time), 1);
  const weeks: { date: string; time: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 18, flexShrink: 0 }}>
          {dayLabels.map((l, i) => (
            <div key={i} style={{ height: 16, fontSize: 9.5, fontWeight: 700, color: "var(--sd-muted)", lineHeight: "16px" }}>{l}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
            <div style={{ height: 16, fontSize: 9.5, fontWeight: 800, color: "var(--sd-muted)", textAlign: "center", lineHeight: "16px" }}>
              {week[0]?.date.split("-")[2] === "01" ? new Date(week[0].date).toLocaleDateString("en", { month: "short" }) : ""}
            </div>
            {week.map((d, di) => {
              const alpha = d.time === 0 ? 0.08 : 0.2 + (d.time / maxT) * 0.8;
              return (
                <div
                  key={di}
                  title={`${d.date}: ${d.time} mins`}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: `rgba(16, 185, 129, ${alpha})`,
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.35)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, fontWeight: 700, color: "var(--sd-muted)" }}>
        Less
        <div style={{ display: "flex", gap: 3 }}>
          {[0.08, 0.28, 0.52, 0.78, 1].map((a, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: `rgba(16, 185, 129, ${a})` }} />
          ))}
        </div>
        More
      </div>
    </div>
  );
}

// ─── STUDENT DRAWER COMPONENT ─────────────────────────────────────────────────
function StudentDrawer({
  student,
  onClose,
}: {
  student: StudentAnalytics;
  onClose: () => void;
}) {
  const featureData = student.featureUsage
    .slice()
    .sort((a, b) => b.timeSpent - a.timeSpent)
    .map(f => ({ label: f.feature, value: f.timeSpent, color: FC[f.feature] || "#10b981" }));
  const scoreColor = student.engagementScore > 75 ? "#10b981" : student.engagementScore > 50 ? "#f59e0b" : "#f43f5e";

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div className="drawer-title">Student Profile &amp; Telemetry</div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">
          {/* Profile header */}
          <div className="drawer-sec">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <img src={student.photo} alt={student.name} style={{ width: 58, height: 58, borderRadius: "50%", objectFit: "cover", border: "2.5px solid #10b981", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--sd-ink)" }}>{student.name}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--sd-muted)", marginTop: 2 }}>
                  Roll #{student.rollNumber} · Class {student.class}-{student.section}
                </div>
                <span className={`chip ${engLevel(student.engagementScore)}`} style={{ marginTop: 6, display: "inline-flex" }}>
                  {engWord(student.engagementScore)}
                </span>
              </div>
            </div>
            {[
              ["Email Address", student.email],
              ["Last Active", new Date(student.lastActive).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
              ["Login Frequency", `${student.loginFrequency}× / week`],
            ].map(([l, v]) => (
              <div key={l} className="drawer-row">
                <span className="drawer-label">{l}</span>
                <span className="drawer-val">{v}</span>
              </div>
            ))}
          </div>

          {/* At a glance 3 big numbers */}
          <div className="drawer-sec">
            <div className="drawer-sec-title">At a Glance</div>
            <div className="bignum-grid">
              <div className="bignum-card">
                <div className="bignum-val" style={{ color: scoreColor }}>{student.engagementScore}</div>
                <div className="bignum-lbl">Engagement</div>
              </div>
              <div className="bignum-card">
                <div className="bignum-val" style={{ color: "#10b981" }}>{student.progress}%</div>
                <div className="bignum-lbl">Course Progress</div>
              </div>
              <div className="bignum-card">
                <div className="bignum-val" style={{ color: "#06b6d4" }}>{Math.round(student.totalLearningTime / 60)}h</div>
                <div className="bignum-lbl">Total Time</div>
              </div>
            </div>
          </div>

          {/* Time spent per feature */}
          <div className="drawer-sec">
            <div className="drawer-sec-title">Time Spent per Feature</div>
            <SimpleDonut data={featureData} />
          </div>

          {/* 30-day activity heatmap */}
          <div className="drawer-sec">
            <div className="drawer-sec-title">30-Day Activity Calendar (Darker = More Time)</div>
            <CalendarHeatmap history={student.activityHistory} />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({
  students,
  classes,
  dashboard,
}: {
  students: StudentAnalytics[];
  classes: ClassAnalytics[];
  dashboard: DashboardAnalytics;
}) {
  const featureWithTime = useMemo(() => {
    const ft: Record<string, number> = {};
    students.forEach(s => s.featureUsage.forEach(f => { ft[f.feature] = (ft[f.feature] || 0) + f.timeSpent; }));
    return dashboard.featureEngagementRate
      .map(f => ({ label: f.feature, value: ft[f.feature] || 0, color: FC[f.feature] || "#10b981" }))
      .sort((a, b) => b.value - a.value);
  }, [students, dashboard]);

  const classBarData = useMemo(() => {
    const colors = ["#10b981", "#f59e0b", "#06b6d4", "#f43f5e", "#8b5cf6", "#27b86a"];
    return classes.map((c, i) => ({
      label: `Class ${c.class}-${c.section}`,
      value: c.avgTimePerStudent,
      color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);
  }, [classes]);

  const topFeature = featureWithTime[0];
  const topClass = classBarData[0];

  return (
    <>
      <div className="grid-2">
        {/* Class comparison */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">🏫 Which Class Learns the Most?</div>
              <div className="panel-sub">Average minutes per student, ranked highest to lowest</div>
            </div>
          </div>
          <div className="panel-body">
            <BarList data={classBarData} valueFormatter={fmtMins} wideLabel />
            {topClass && (
              <div className="insight-box">
                💡 <span><b>{topClass.label}</b> leads the school in dedicated study time, averaging <b>{fmtMins(topClass.value)}</b> per student.</span>
              </div>
            )}
          </div>
        </div>

        {/* Active vs inactive */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">✅ Who's Active This Week?</div>
              <div className="panel-sub">Students who logged in during the past 7 days</div>
            </div>
          </div>
          <div className="panel-body">
            <StatusSplit active={dashboard.activeStudents} total={dashboard.totalStudents} />
            <div className="insight-box" style={{ marginTop: 22 }}>
              🎯 <span>Regular logins correlate with a <b>24% higher assignment score</b> across core subjects.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature usage */}
      <div className="panel mb-18">
        <div className="panel-head">
          <div>
            <div className="panel-title">⚡ Where Does Everyone's Time Go?</div>
            <div className="panel-sub">Total minutes logged per feature across all {dashboard.totalStudents} students</div>
          </div>
        </div>
        <div className="panel-body">
          <BarList data={featureWithTime} valueFormatter={fmtMins} wideLabel />
          {topFeature && (
            <div className="insight-box">
              💡 <span><b>{topFeature.label}</b> is the #1 feature overall, capturing <b>{fmtMins(topFeature.value)}</b> in total learning time.</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── STUDENTS TAB ─────────────────────────────────────────────────────────────
function StudentsTab({
  students,
  onSelect,
}: {
  students: StudentAnalytics[];
  onSelect: (s: StudentAnalytics) => void;
}) {
  const [filters, setFilters] = useState<{
    class: string;
    section: string;
    status: string;
    search: string;
    sk: keyof StudentAnalytics;
    sd: "asc" | "desc";
  }>({
    class: "all",
    section: "all",
    status: "all",
    search: "",
    sk: "name",
    sd: "asc",
  });
  const [page, setPage] = useState(1);
  const PP = 8;

  const allClasses = useMemo(() => [...new Set(students.map(s => s.class))].sort(), [students]);
  const allSections = useMemo(() => {
    if (filters.class === "all") return [];
    return [...new Set(students.filter(s => s.class === filters.class).map(s => s.section))].sort();
  }, [students, filters.class]);

  const filtered = useMemo(() => students.filter(s => {
    if (filters.class !== "all" && s.class !== filters.class) return false;
    if (filters.section !== "all" && s.section !== filters.section) return false;
    if (filters.status === "active" && !isActive(s.lastActive)) return false;
    if (filters.status === "inactive" && isActive(s.lastActive)) return false;
    if (filters.search && !s.name.toLowerCase().includes(filters.search.toLowerCase()) && !s.rollNumber.includes(filters.search)) return false;
    return true;
  }), [students, filters]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const va = a[filters.sk];
    const vb = b[filters.sk];
    const c = String(va).localeCompare(String(vb), undefined, { numeric: true });
    return filters.sd === "asc" ? c : -c;
  }), [filtered, filters.sk, filters.sd]);

  const paginated = useMemo(() => sorted.slice((page - 1) * PP, page * PP), [sorted, page]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PP));

  const sf = (k: string, v: string) => {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(1);
  };
  const toggleSort = (k: keyof StudentAnalytics) => {
    setFilters(f => ({ ...f, sk: k, sd: f.sk === k && f.sd === "asc" ? "desc" : "asc" }));
    setPage(1);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">👩‍🎓 All Enrolled Students</div>
          <div className="panel-sub">{sorted.length} students match current criteria</div>
        </div>
      </div>
      <div className="panel-body">
        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-grid">
            <div className="filter-group">
              <div className="filter-label">Class</div>
              <select className="filter-select" value={filters.class} onChange={e => { sf("class", e.target.value); sf("section", "all"); }}>
                <option value="all">All Classes</option>
                {allClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <div className="filter-label">Section</div>
              <select className="filter-select" value={filters.section} onChange={e => sf("section", e.target.value)} disabled={filters.class === "all"}>
                <option value="all">All Sections</option>
                {allSections.map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <div className="filter-label">Status</div>
              <select className="filter-select" value={filters.status} onChange={e => sf("status", e.target.value)}>
                <option value="all">All Students</option>
                <option value="active">Active Recently</option>
                <option value="inactive">Inactive (&gt;7d)</option>
              </select>
            </div>
            <div className="filter-group" style={{ flex: 2 }}>
              <div className="filter-label">Search Student</div>
              <div className="search-wrap">
                <input
                  className="filter-input"
                  style={{ paddingRight: 32 }}
                  placeholder="Filter by name or roll number…"
                  value={filters.search}
                  onChange={e => sf("search", e.target.value)}
                />
                <span className="search-icon">🔍</span>
              </div>
            </div>
            <div className="filter-group" style={{ flex: "0 0 auto" }}>
              <div className="filter-label">&nbsp;</div>
              <button
                className="btn-subtle"
                onClick={() => {
                  setFilters({ class: "all", section: "all", status: "all", search: "", sk: "name", sd: "asc" });
                  setPage(1);
                }}
              >
                ↺ Reset
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {[
                  ["name", "Student"],
                  ["totalLearningTime", "Learning Time"],
                  ["engagementScore", "Engagement"],
                  ["progress", "Progress"],
                  ["lastActive", "Activity Status"],
                ].map(([k, l]) => (
                  <th key={k} className="th" onClick={() => toggleSort(k as keyof StudentAnalytics)}>
                    {l} {filters.sk === k ? (filters.sd === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(s => (
                <tr key={s.id} className="tr" onClick={() => onSelect(s)}>
                  <td className="td">
                    <div className="student-cell">
                      <img src={s.photo} alt={s.name} className="student-avatar" />
                      <div>
                        <div className="student-name">{s.name}</div>
                        <div className="student-roll">Class {s.class}-{s.section} · Roll #{s.rollNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td" style={{ fontWeight: 700 }}>{fmtMins(s.totalLearningTime)}</td>
                  <td className="td">
                    <span className={`chip ${engLevel(s.engagementScore)}`}>{s.engagementScore}</span>
                  </td>
                  <td className="td">
                    <div className="progress-row">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${s.progress}%` }} />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: "#10b981", flexShrink: 0 }}>
                        {s.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="td">
                    <span className={`chip ${isActive(s.lastActive) ? "active" : "inactive"}`}>
                      {isActive(s.lastActive) ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards view */}
        <div className="mobile-cards">
          {paginated.map(s => (
            <div key={s.id} className="m-card" onClick={() => onSelect(s)}>
              <img src={s.photo} alt={s.name} className="student-avatar" />
              <div className="m-body">
                <div className="m-top">
                  <div className="student-name">{s.name}</div>
                  <span className={`chip ${isActive(s.lastActive) ? "active" : "inactive"}`}>
                    {isActive(s.lastActive) ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="m-meta">
                  <span>Class {s.class}-{s.section}</span>
                  <span>{fmtMins(s.totalLearningTime)}</span>
                  <span className={`chip ${engLevel(s.engagementScore)}`} style={{ padding: "1px 7px" }}>
                    Score {s.engagementScore}
                  </span>
                </div>
                <div className="progress-row" style={{ marginTop: 8 }}>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${s.progress}%` }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981", flexShrink: 0 }}>
                    {s.progress}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {paginated.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--sd-ink)" }}>No students match your criteria</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--sd-muted)", marginTop: 4 }}>
              Try adjusting the filters or search term above.
            </div>
          </div>
        )}

        <div className="pagination">
          <span className="page-info">{sorted.length} total · page {page} of {totalPages}</span>
          <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pg = page <= 3 ? i + 1 : page + i - 2;
            if (pg < 1 || pg > totalPages) return null;
            return (
              <button key={pg} className={`page-btn${page === pg ? " active" : ""}`} onClick={() => setPage(pg)}>
                {pg}
              </button>
            );
          }).filter(Boolean)}
          <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
        </div>
      </div>
    </div>
  );
}

// ─── CLASSES TAB ──────────────────────────────────────────────────────────────
function ClassesTab({
  classes,
  students,
  onSelect,
}: {
  classes: ClassAnalytics[];
  students: StudentAnalytics[];
  onSelect: (s: StudentAnalytics) => void;
}) {
  const [sel, setSel] = useState<ClassAnalytics | null>(null);
  const classStudents = useMemo(() => sel ? students.filter(s => s.class === sel.class && s.section === sel.section) : [], [sel, students]);
  const colors = ["#10b981", "#f59e0b", "#06b6d4", "#f43f5e", "#8b5cf6", "#27b86a"];

  const featureBarData = sel ? sel.featureBreakdown.map((f, i) => ({
    label: f.feature,
    value: f.time,
    color: FC[f.feature] || colors[i % colors.length]
  })).sort((a, b) => b.value - a.value) : [];

  return (
    <>
      <div className="grid-3 mb-18">
        {classes.map((c, i) => {
          const col = colors[i % colors.length];
          const isSel = sel?.class === c.class && sel?.section === c.section;
          const actRatio = c.totalStudents > 0 ? Math.round((c.activeStudents / c.totalStudents) * 100) : 0;
          return (
            <div
              key={i}
              onClick={() => setSel(isSel ? null : c)}
              className="panel"
              style={{
                cursor: "pointer",
                borderColor: isSel ? col : "var(--sd-line)",
                borderWidth: isSel ? 2 : 1,
                boxShadow: isSel ? `0 14px 34px ${col}33` : "var(--sd-shadow-soft)",
                transform: isSel ? "translateY(-3px)" : "none",
              }}
            >
              <div className="panel-head" style={{ borderLeft: `5px solid ${col}`, paddingLeft: 16 }}>
                <div>
                  <div className="panel-title">Class {c.class}-{c.section}</div>
                  <div className="panel-sub">{c.totalStudents} enrolled students</div>
                </div>
                <span className="stat-pill" style={{ borderColor: col, color: col, background: `${col}15` }}>
                  {actRatio}% Active
                </span>
              </div>
              <div className="panel-body">
                {[
                  ["Avg learning time", fmtMins(c.avgTimePerStudent)],
                  ["Most used feature", c.mostUsedFeature],
                  ["Least used feature", c.leastUsedFeature],
                  ["Active this week", `${c.activeStudents} of ${c.totalStudents}`],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--sd-line)",
                      fontSize: 12.5,
                      gap: 8,
                    }}
                  >
                    <span style={{ color: "var(--sd-muted)", fontWeight: 600 }}>{l}</span>
                    <span style={{ fontWeight: 800, color: "var(--sd-ink)", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
                {isSel ? (
                  <div style={{ marginTop: 12, fontSize: 12, color: col, fontWeight: 800, textAlign: "center" }}>
                    ▲ Viewing breakdown below
                  </div>
                ) : (
                  <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--sd-muted)", fontWeight: 600, textAlign: "center" }}>
                    Tap to see students &amp; usage details
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sel && (
        <div className="grid-2 mb-18">
          {/* Feature breakdown */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">📚 Feature Usage — Class {sel.class}-{sel.section}</div>
                <div className="panel-sub">Total time this specific classroom spent across modules</div>
              </div>
            </div>
            <div className="panel-body">
              <BarList data={featureBarData} valueFormatter={fmtMins} wideLabel />
            </div>
          </div>

          {/* Students ranked */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">👩‍🎓 Classroom Roster, Ranked by Engagement</div>
                <div className="panel-sub">Tap any student to inspect individual telemetry</div>
              </div>
            </div>
            <div className="panel-body" style={{ paddingTop: 10 }}>
              {classStudents
                .sort((a, b) => b.engagementScore - a.engagementScore)
                .map((s, i) => (
                  <div key={i} className="rank-row" onClick={() => onSelect(s)}>
                    <div className="rank-num" style={{ color: i === 0 ? "#f59e0b" : "var(--sd-muted)" }}>{i + 1}</div>
                    <img src={s.photo} alt={s.name} className="rank-img" />
                    <div className="rank-info">
                      <div className="rank-name">{s.name}</div>
                      <div className="rank-det">{fmtMins(s.totalLearningTime)} · {s.loginFrequency}×/week</div>
                    </div>
                    <span className={`chip ${engLevel(s.engagementScore)}`}>{s.engagementScore}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── ANALYTICS TAB ───────────────────────────────────────────────────────────
function AnalyticsTab({
  students,
  onSelect,
}: {
  students: StudentAnalytics[];
  onSelect: (s: StudentAnalytics) => void;
}) {
  const trendData = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(s => s.activityHistory.forEach(a => { map[a.date] = (map[a.date] || 0) + a.timeSpent; }));
    const days = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    return days.map(([, v]) => v);
  }, [students]);

  const topByTime = useMemo(() => [...students].sort((a, b) => b.totalLearningTime - a.totalLearningTime).slice(0, 6), [students]);
  const leastByTime = useMemo(() => [...students].sort((a, b) => a.totalLearningTime - b.totalLearningTime).slice(0, 6), [students]);

  const buckets = useMemo(() => {
    const sorted = [...students].sort((a, b) => b.totalLearningTime - a.totalLearningTime);
    const med = sorted[Math.floor(sorted.length / 2)]?.totalLearningTime || 0;
    const onTrack = students.filter(s => s.engagementScore > 60 && s.totalLearningTime >= med).length;
    const puttingInTime = students.filter(s => s.engagementScore <= 60 && s.totalLearningTime >= med).length;
    const lowBoth = students.filter(s => s.totalLearningTime < med).length;
    return [
      { label: "Engaged & On Track", value: onTrack, color: "#10b981" },
      { label: "Putting in Time, Low Score", value: puttingInTime, color: "#f59e0b" },
      { label: "Below-Average Learning Time", value: lowBoth, color: "#f43f5e" },
    ];
  }, [students]);

  const trendMax = Math.max(...trendData, 1);
  const trendAvg = trendData.length ? Math.round(trendData.reduce((a, b) => a + b, 0) / trendData.length) : 0;

  return (
    <>
      {/* Trend line */}
      <div className="panel mb-18">
        <div className="panel-head">
          <div>
            <div className="panel-title">📈 Overall Learning Momentum (Past 30 Days)</div>
            <div className="panel-sub">Total school-wide learning minutes logged each day. Hover or tap to inspect</div>
          </div>
        </div>
        <div className="panel-body">
          <TrendLine data={trendData} color="#10b981" />
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { l: "Peak Day", v: fmtMins(trendMax), c: "#10b981" },
              { l: "Daily Average", v: fmtMins(trendAvg), c: "#06b6d4" },
              { l: "Active Days", v: `${trendData.filter(v => v > 0).length}/30`, c: "#f59e0b" },
            ].map((m, i) => (
              <div key={i} style={{ flex: "1 1 120px", background: "var(--sd-card-soft)", borderRadius: 12, padding: "10px 14px", border: "1px solid var(--sd-line)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)" }}>{m.l}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: m.c, marginTop: 3 }}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engagement buckets */}
      <div className="panel mb-18">
        <div className="panel-head">
          <div>
            <div className="panel-title">🎯 Who's Flourishing vs. Needing a Nudge?</div>
            <div className="panel-sub">Combined evaluation of effort (time spent) and focus (engagement score)</div>
          </div>
        </div>
        <div className="panel-body">
          <BarList data={buckets} wideLabel valueFormatter={v => `${v} students`} />
          <div className="insight-box">
            💡 <span>Students in <b>Putting in Time, Low Score</b> may benefit from customized quiz practice or teacher 1-on-1 assistance.</span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Top learners */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">🔥 Top Scholars by Learning Hours</div>
              <div className="panel-sub">Highest engagement logged overall</div>
            </div>
          </div>
          <div className="panel-body" style={{ paddingTop: 8 }}>
            {topByTime.map((s, i) => (
              <div key={i} className="rank-row" onClick={() => onSelect(s)}>
                <div className="rank-num" style={{ color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c4e" : "var(--sd-muted)" }}>
                  {i + 1}
                </div>
                <img src={s.photo} alt={s.name} className="rank-img" />
                <div className="rank-info">
                  <div className="rank-name">{s.name}</div>
                  <div className="rank-det">Class {s.class}-{s.section}</div>
                </div>
                <div className="rank-score" style={{ color: "#10b981" }}>{fmtMins(s.totalLearningTime)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs support */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">📉 Students Requiring Motivation</div>
              <div className="panel-sub">Lowest activity logged recently</div>
            </div>
          </div>
          <div className="panel-body" style={{ paddingTop: 8 }}>
            {leastByTime.map((s, i) => (
              <div key={i} className="rank-row" onClick={() => onSelect(s)}>
                <div className="rank-num" style={{ color: "var(--sd-muted)" }}>{i + 1}</div>
                <img src={s.photo} alt={s.name} className="rank-img" />
                <div className="rank-info">
                  <div className="rank-name">{s.name}</div>
                  <div className="rank-det">Class {s.class}-{s.section}</div>
                </div>
                <div className="rank-score" style={{ color: "#f43f5e" }}>{fmtMins(s.totalLearningTime)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── ALERTS TAB ──────────────────────────────────────────────────────────────
function AlertsTab({
  students,
  onSelect,
}: {
  students: StudentAnalytics[];
  onSelect: (s: StudentAnalytics) => void;
}) {
  const lowEng = useMemo(() => students.filter(s => s.engagementScore < 50).sort((a, b) => a.engagementScore - b.engagementScore), [students]);
  const inact = useMemo(() => students.filter(s => !isActive(s.lastActive)), [students]);

  if (!lowEng.length && !inact.length) {
    return (
      <div className="panel">
        <div style={{ textAlign: "center", padding: "64px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--sd-ink)" }}>Outstanding! All students are on track</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sd-muted)", marginTop: 4 }}>
            There are currently zero warning alerts or inactive flags.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {lowEng.length > 0 && (
        <div className="panel mb-18">
          <div className="panel-head">
            <div>
              <div className="panel-title">⚠️ Attention Required: Low Engagement ({lowEng.length} Students)</div>
              <div className="panel-sub">Engagement score under 50% · Click any profile to view learning history</div>
            </div>
          </div>
          <div className="panel-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {lowEng.map((s, i) => (
                <div key={i} className="alert-item" onClick={() => onSelect(s)}>
                  <img src={s.photo} alt={s.name} className="alert-img" />
                  <div className="alert-info">
                    <div className="alert-name">{s.name}</div>
                    <div className="alert-det">Class {s.class}-{s.section} · {fmtMins(s.totalLearningTime)}</div>
                    <div style={{ height: 6, background: "var(--sd-card-alt)", borderRadius: 999, marginTop: 7, width: "100%", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 999, background: "#f43f5e", width: `${s.engagementScore}%` }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#f43f5e" }}>{s.engagementScore}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sd-muted)" }}>score</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {inact.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">💤 Inactive Students ({inact.length} Pending)</div>
              <div className="panel-sub">Students who haven't logged in over the last 7 days</div>
            </div>
          </div>
          <div className="panel-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {inact.map((s, i) => {
                const daysAgo = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / 86400000);
                return (
                  <div key={i} className="alert-item" onClick={() => onSelect(s)}>
                    <img src={s.photo} alt={s.name} className="alert-img" />
                    <div className="alert-info">
                      <div className="alert-name">{s.name}</div>
                      <div className="alert-det">Class {s.class}-{s.section}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#f59e0b" }}>{daysAgo}d</div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sd-muted)" }}>away</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── MAIN USER MANAGEMENT DASHBOARD ──────────────────────────────────────────
export default function UserManagementDashboard() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || document.documentElement.classList.contains("dark")) return "dark";
    }
    return "light";
  });

  const [tab, setTab] = useState("overview");
  const [students, setStudents] = useState<StudentAnalytics[]>([]);
  const [classes, setClasses] = useState<ClassAnalytics[]>([]);
  const [dashboard, setDashboard] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selStudent, setSelStudent] = useState<StudentAnalytics | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Sync theme with document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getStudents(), api.getClasses()])
      .then(([d, s, c]) => {
        setDashboard(d);
        setStudents(s);
        setClasses(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const handleExport = () => {
    const rows = [["ID", "Name", "Class", "Section", "Mins", "Engagement", "Progress", "Active"]];
    students.forEach(s => rows.push([
      s.id, s.name, s.class, s.section, String(s.totalLearningTime),
      String(s.engagementScore), `${s.progress}%`, isActive(s.lastActive) ? "Yes" : "No"
    ]));
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "students_report.csv";
    a.click();
    showToast("✅ Exported students_report.csv successfully!");
  };

  const alerts = useMemo(() => students.filter(s => s.engagementScore < 50 || !isActive(s.lastActive)), [students]);

  if (loading || !dashboard) {
    return (
      <>
        <style>{CSS}</style>
        <div className="um" data-theme={theme}>
          <div className="loader-box">
            <div className="spinner" />
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sd-muted)" }}>
              Loading User Management Dashboard…
            </div>
          </div>
        </div>
      </>
    );
  }

  const { totalStudents, activeStudents, totalLearningHours, avgUsageTime, featureEngagementRate, studentCompletionRate } = dashboard;

  // 6 vibrant student-dashboard themed stat cards
  const statCards = [
    { l: "Total Students", v: totalStudents, sf: "", cls: "emerald", ico: "👥", s: "Enrolled in classes", pill: "Active Roster" },
    { l: "Active This Week", v: activeStudents, sf: "", cls: "cyan", ico: "⚡", s: `${Math.round((activeStudents / totalStudents) * 100)}% active rate`, pill: "Engagement" },
    { l: "Learning Hours", v: totalLearningHours, sf: "h", cls: "amber", ico: "📚", s: "Across all subjects", pill: "Total Hours" },
    { l: "Avg Usage Time", v: avgUsageTime, sf: "m", cls: "orange", ico: "⏱️", s: "Per student / week", pill: "Pace" },
    { l: "Top Feature Rate", v: featureEngagementRate[0]?.rate || 0, sf: "%", cls: "rose", ico: "🎯", s: featureEngagementRate[0]?.feature || "AI Tutor", pill: "Popular" },
    { l: "Avg Completion", v: studentCompletionRate, sf: "%", cls: "jade", ico: "📈", s: "Curriculum progress", pill: "Milestone" },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "students", label: "Students", icon: "👩‍🎓" },
    { id: "classes", label: "Classes", icon: "🏫" },
    { id: "analytics", label: "Analytics", icon: "📈" },
    { id: "alerts", label: "Alerts", icon: "🔔", badge: alerts.length },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="um" data-theme={theme}>
        {/* Animated background ribbons & ambient sparks */}
        <div className="sd-bg-spark s1" />
        <div className="sd-bg-spark s2" />
        <div className="sd-bg-spark s3" />
        <div className="sd-bg-ribbon" />

        <div className="sd-shell">
          {/* Top navigation header */}
          <div className="topbar">
            <div className="top-left">
              <div className="top-icon">👥</div>
              <div>
                <div className="top-title">User Management &amp; Analytics</div>
                <div className="top-sub">Teacher Portal · Monitoring {totalStudents} Active Students Across {classes.length} Classes</div>
              </div>
            </div>
            <div className="top-actions">
              <div className="date-pill">
                📅 {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </div>
              <button className="btn-emerald" onClick={handleExport}>
                ⬇ Export CSV
              </button>
              <button
                className="theme-btn"
                onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
                title="Toggle Dark / Light Mode"
                aria-label="Toggle Theme"
              >
                {theme === "light" ? "🌙" : "☀️"}
              </button>
            </div>
          </div>

          {/* HERO BANNER WITH ROBO MASCOT (NO PURPLE/BLUE GRADIENT) */}
          <div className="sd-hero">
            <div className="sd-hero-content">
              <div className="sd-chip">
                <span>🌱 Teacher Administration · Class Telemetry</span>
              </div>
              <h1 className="sd-hero-title">
                Student Activity &amp; Engagement Dashboard 🚀
              </h1>
              <p className="sd-hero-desc">
                Gain real-time visibility into student study patterns, class performance, feature preferences, and engagement scores with proactive guidance alerts.
              </p>
              <div className="sd-hero-actions">
                <button className="btn-emerald" onClick={() => setTab("students")}>
                  👩‍🎓 Browse All Students
                </button>
                <button className="btn-subtle" onClick={handleExport}>
                  📊 Export Analytics Report
                </button>
              </div>
            </div>

            {/* Robo Mascot Stage */}
            <div className="sd-hero-robo-wrap">
              <div className="sd-hero-robo-glow" />
              <img src={roboImg} alt="GradeUp AI Robot" className="sd-hero-robo-img" />
              <div className="sd-robo-bubble">
                <span className="sd-bubble-dot" />
                <span>Tracking {activeStudents} Active Now</span>
              </div>
            </div>
          </div>

          {/* METRIC STAT CARDS (COLOURFUL LIKE STUDENT DASHBOARD) */}
          <div className="stats-grid">
            {statCards.map((s, i) => (
              <div key={i} className={`stat-card ${s.cls}`}>
                <div className="stat-top">
                  <div className="stat-icon">{s.ico}</div>
                  <span className="stat-pill">{s.pill}</span>
                </div>
                <div>
                  <div className="stat-num">
                    <AnimNum target={s.v} suffix={s.sf} />
                  </div>
                  <div className="stat-label">{s.l}</div>
                  <div className="stat-sub">{s.s}</div>
                </div>
              </div>
            ))}
          </div>

          {/* TABS NAVIGATION */}
          <div className="nav-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`tab-btn${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {t.badge && t.badge > 0 ? (
                  <span className="badge-count">{t.badge}</span>
                ) : null}
              </button>
            ))}
          </div>

          {/* TAB CONTENTS */}
          <div className="tab-contents">
            {tab === "overview" && <OverviewTab students={students} classes={classes} dashboard={dashboard} />}
            {tab === "students" && <StudentsTab students={students} onSelect={setSelStudent} />}
            {tab === "classes" && <ClassesTab classes={classes} students={students} onSelect={setSelStudent} />}
            {tab === "analytics" && <AnalyticsTab students={students} onSelect={setSelStudent} />}
            {tab === "alerts" && <AlertsTab students={students} onSelect={setSelStudent} />}
          </div>
        </div>

        {/* STUDENT PROFILE SLIDE-IN DRAWER */}
        {selStudent && <StudentDrawer student={selStudent} onClose={() => setSelStudent(null)} />}

        {/* NOTIFICATION TOAST */}
        {toast && <div className="toast-msg">{toast}</div>}
      </div>
    </>
  );
}
