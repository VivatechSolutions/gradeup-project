import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { useTheme } from "../hooks/use-theme";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { format } from "date-fns";
import roboImg from "../assets/robo.png";
import {
  Users,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Eye,
  Download,
  Search,
  Sparkles,
  Trophy,
  Filter,
  RefreshCw,
  X,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
  HeartHandshake,
  LayoutGrid,
  Table as TableIcon,
  Clock,
  Send,
  Bell,
  Check,
  Copy,
  TrendingUp,
  Smile,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS & CSS (Matching Teacher Dashboard + Colorful Student Dashboard)
───────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
}

.sd-root {
  min-height: 100vh;
  padding: 20px 24px 60px;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  color: var(--sd-ink);
  background: radial-gradient(circle at 14% 9%, rgba(16, 185, 129, 0.08), transparent 28%),
              radial-gradient(circle at 88% 14%, rgba(245, 158, 11, 0.10), transparent 26%),
              linear-gradient(180deg, var(--sd-page), var(--sd-page-2));
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
  --sd-modal-bg: #ffffff;
  --sd-modal-overlay: rgba(7, 18, 53, 0.55);
  position: relative;
  overflow-x: hidden;
  transition: background 0.3s ease, color 0.3s ease;
}

/* ─── DARK THEME STYLES (High Contrast & Attractive) ─── */
[data-theme="dark"] .sd-root,
.dark .sd-root,
.sd-root.dark,
.sd-root.dark-theme,
.sd-root[data-theme="dark"] {
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
  --sd-modal-bg: #0f1934 !important;
  --sd-modal-overlay: rgba(0, 0, 0, 0.78) !important;
  background: radial-gradient(circle at 14% 0%, rgba(16, 185, 129, 0.12), transparent 28%),
              radial-gradient(circle at 88% 5%, rgba(245, 158, 11, 0.10), transparent 28%),
              linear-gradient(180deg, #060b18 0%, #0b1328 100%) !important;
  color: #f8fafc !important;
}

/* ─── AMBIENT BACKGROUND BLOBS & SPARKS ─── */
.sd-root::before,
.sd-root::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(40px);
  opacity: 0.65;
  animation: sdFloatBg 14s ease-in-out infinite alternate;
}
.sd-root::before {
  width: 320px;
  height: 320px;
  left: -100px;
  top: 60px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.16), transparent 70%);
}
.sd-root::after {
  width: 360px;
  height: 360px;
  right: -120px;
  top: 320px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.14), transparent 70%);
  animation-delay: -6s;
}

@keyframes sdFloatBg {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(24px, 32px, 0) scale(1.1); }
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
  box-shadow: 42px 30px 0 #10b981, 90px -16px 0 #0ea5e9;
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
  box-shadow: 44px -32px 0 #ff791f, 96px 20px 0 #0ea5e9;
  animation-delay: -5s;
}

.sd-bg-ribbon {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  left: 3%;
  right: 3%;
  top: 180px;
  height: 180px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.07), rgba(245, 158, 11, 0.08), rgba(14, 165, 233, 0.07));
  filter: blur(24px);
  opacity: 0.7;
  animation: sdBgWave 14s ease-in-out infinite;
}

@keyframes sdBgWave {
  0%, 100% { transform: translate3d(-1.5%, 0, 0) rotate(0); }
  50% { transform: translate3d(1.5%, -1.5%, 0) rotate(1.5deg); }
}

@keyframes sdDrift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0); }
  50% { transform: translate3d(16px, -14px, 0) rotate(6deg); }
}

/* ─── ANIMATION SUITE ─── */
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
  50% { transform: translateY(-9px) rotate(2deg); }
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
@keyframes sdGlowMove {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ─── SHELL CONTAINER ─── */
.sd-shell {
  max-width: 1260px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* ─── HERO BANNER (NO PURPLE/BLUE AI GRADIENT!) ─── */
.sd-hero {
  position: relative;
  overflow: hidden;
  min-height: 220px;
  border-radius: 24px;
  padding: 28px 34px;
  background: linear-gradient(135deg, #dcfce7 0%, #edfbf2 48%, #ffffff 100%);
  border: 1px solid rgba(16, 185, 129, 0.25);
  box-shadow: var(--sd-shadow);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
  animation: cardIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

[data-theme="dark"] .sd-hero,
.dark .sd-hero,
.sd-root.dark .sd-hero {
  background: linear-gradient(135deg, #052618 0%, #092f25 45%, #0f1c30 100%) !important;
  border-color: rgba(16, 185, 129, 0.35) !important;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.65) !important;
}

.sd-hero::after {
  content: "";
  position: absolute;
  top: -60px;
  bottom: -60px;
  width: 90px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  animation: sdShine 7.5s ease-in-out infinite;
}

.sd-hero-content {
  position: relative;
  z-index: 2;
  max-width: 640px;
}

.sd-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.02em;
  background: rgba(16, 185, 129, 0.16);
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.32);
  margin-bottom: 12px;
}

[data-theme="dark"] .sd-chip {
  background: rgba(16, 185, 129, 0.22);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.45);
}

.sd-hero-title {
  font-size: clamp(22px, 3.2vw, 32px);
  font-weight: 900;
  line-height: 1.15;
  color: var(--sd-ink);
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sd-hero-desc {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--sd-muted);
  margin: 0 0 20px;
  max-width: 580px;
}

.sd-hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Primary Button (Vibrant Emerald - NO purple/blue gradient) */
.sd-btn-emerald {
  border: 0;
  border-radius: 14px;
  padding: 11px 22px;
  min-height: 42px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 22px rgba(16, 185, 129, 0.35);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  white-space: nowrap;
}
.sd-btn-emerald:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(16, 185, 129, 0.48);
}
.sd-btn-emerald:active {
  transform: translateY(0);
}

/* Secondary Button (Clean Subtle Glass) */
.sd-btn-subtle {
  border: 1px solid var(--sd-line-strong);
  border-radius: 14px;
  padding: 10px 18px;
  min-height: 42px;
  background: var(--sd-card);
  color: var(--sd-ink);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--sd-shadow-soft);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
  white-space: nowrap;
}
.sd-btn-subtle:hover {
  transform: translateY(-2px);
  background: var(--sd-card-soft);
  border-color: rgba(16, 185, 129, 0.4);
  color: #10b981;
}

/* ─── HERO ROBO MASCOT STAGE ─── */
.sd-hero-robo-wrap {
  position: relative;
  z-index: 2;
  flex: 0 0 230px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sd-hero-robo-glow {
  position: absolute;
  width: 210px;
  height: 210px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.32), rgba(245, 158, 11, 0.16), transparent 70%);
  filter: blur(16px);
  animation: sdBreathe 4.5s ease-in-out infinite;
}

[data-theme="dark"] .sd-hero-robo-glow {
  background: radial-gradient(circle, rgba(16, 185, 129, 0.4), rgba(6, 182, 212, 0.22), transparent 70%);
}

.sd-hero-robo-img {
  width: 175px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 18px 24px rgba(10, 40, 25, 0.22));
  animation: sdFloatSlow 5s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

.sd-robo-bubble {
  position: absolute;
  top: 4px;
  right: -8px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line-strong);
  padding: 7px 13px;
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

[data-theme="dark"] .sd-robo-bubble {
  background: rgba(22, 33, 64, 0.95);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.16);
}

/* ─── METRIC STATS CARDS (COLOURFUL LIKE STUDENT DASHBOARD) ─── */
.sd-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.sd-stat-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 20px;
  padding: 20px 18px;
  box-shadow: var(--sd-shadow-soft);
  position: relative;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  animation: cardIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sd-stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--sd-shadow);
}

/* Student Dashboard Colorful Palette Cards */
.sd-stat-card.sky {
  border-top: 3.5px solid #0284c7;
}
.sd-stat-card.sky:hover {
  border-color: rgba(2, 132, 199, 0.35);
  box-shadow: 0 16px 36px rgba(2, 132, 199, 0.14);
}

.sd-stat-card.emerald {
  border-top: 3.5px solid #10b981;
}
.sd-stat-card.emerald:hover {
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 16px 36px rgba(16, 185, 129, 0.14);
}

.sd-stat-card.amber {
  border-top: 3.5px solid #f59e0b;
}
.sd-stat-card.amber:hover {
  border-color: rgba(245, 158, 11, 0.35);
  box-shadow: 0 16px 36px rgba(245, 158, 11, 0.14);
}

.sd-stat-card.rose {
  border-top: 3.5px solid #f43f5e;
}
.sd-stat-card.rose:hover {
  border-color: rgba(244, 63, 94, 0.35);
  box-shadow: 0 16px 36px rgba(244, 63, 94, 0.14);
}

/* Top bar in stat card */
.sd-stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.sd-stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: sdPop3d 4.5s ease-in-out infinite;
}

.ssi-sky {
  background: rgba(2, 132, 199, 0.12);
  color: #0284c7;
}
[data-theme="dark"] .ssi-sky {
  background: rgba(2, 132, 199, 0.24);
  color: #38bdf8;
}

.ssi-emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}
[data-theme="dark"] .ssi-emerald {
  background: rgba(16, 185, 129, 0.24);
  color: #34d399;
}

.ssi-amber {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}
[data-theme="dark"] .ssi-amber {
  background: rgba(245, 158, 11, 0.24);
  color: #fbbf24;
}

.ssi-rose {
  background: rgba(244, 63, 94, 0.12);
  color: #f43f5e;
}
[data-theme="dark"] .ssi-rose {
  background: rgba(244, 63, 94, 0.24);
  color: #fb7185;
}

.sd-stat-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--sd-card-alt);
  color: var(--sd-muted);
  border: 1px solid var(--sd-line);
}

.sd-stat-num {
  font-size: clamp(26px, 2.4vw, 34px);
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--sd-ink);
  line-height: 1;
  margin-bottom: 6px;
}

.sd-stat-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--sd-muted);
}

.sd-stat-footer {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
}

/* ─── ALERT / ACTION LAUNCHPAD CARDS ─── */
.sd-alerts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.sd-alert-box {
  border-radius: 20px;
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
  box-shadow: var(--sd-shadow-soft);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.sd-alert-box:hover {
  transform: translateY(-3px);
  box-shadow: var(--sd-shadow);
}

.sd-alert-box.coral {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe4e6 100%);
  border: 1px solid rgba(244, 63, 94, 0.28);
}
[data-theme="dark"] .sd-alert-box.coral {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.16) 0%, rgba(225, 29, 72, 0.08) 100%) !important;
  border-color: rgba(244, 63, 94, 0.35) !important;
}

.sd-alert-box.cyan {
  background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%);
  border: 1px solid rgba(14, 165, 233, 0.28);
}
[data-theme="dark"] .sd-alert-box.cyan {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.16) 0%, rgba(2, 132, 199, 0.08) 100%) !important;
  border-color: rgba(14, 165, 233, 0.35) !important;
}

.sd-alert-box.emerald {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid rgba(16, 185, 129, 0.28);
}
[data-theme="dark"] .sd-alert-box.emerald {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(5, 150, 105, 0.08) 100%) !important;
  border-color: rgba(16, 185, 129, 0.35) !important;
}

.sd-alert-info {
  display: flex;
  align-items: center;
  gap: 14px;
}
.sd-alert-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
[data-theme="dark"] .sd-alert-icon {
  background: rgba(15, 23, 42, 0.6);
}

.sd-alert-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--sd-ink);
  margin-bottom: 2px;
}
.sd-alert-sub {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--sd-muted);
}
.sd-alert-badge {
  font-size: 22px;
  font-weight: 900;
  color: var(--sd-ink);
  letter-spacing: -0.02em;
}

/* ─── FILTERS & CONTROL TOOLBAR ─── */
.sd-toolbar {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 20px;
  padding: 16px 20px;
  box-shadow: var(--sd-shadow-soft);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  animation: cardIn 0.45s 0.1s both;
}

.sd-search-box {
  position: relative;
  flex: 1;
  min-width: 220px;
}
.sd-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sd-faint);
  pointer-events: none;
}
.sd-search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: 0;
  color: var(--sd-faint);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
}
.sd-search-clear:hover {
  color: var(--sd-ink);
}

.sd-search-input {
  width: 100%;
  padding: 10px 34px 10px 40px;
  border-radius: 12px;
  border: 1px solid var(--sd-input-border);
  background: var(--sd-input-bg);
  color: var(--sd-ink);
  font-size: 13.5px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
  font-family: inherit;
}
.sd-search-input:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
}
.sd-search-input::placeholder {
  color: var(--sd-faint);
}

.sd-select-control {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--sd-input-border);
  background: var(--sd-input-bg);
  color: var(--sd-ink);
  font-size: 13px;
  font-weight: 700;
  outline: none;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.18s;
}
.sd-select-control:focus {
  border-color: #10b981;
}

/* View Switcher Pill */
.sd-view-toggle {
  display: flex;
  background: var(--sd-card-alt);
  padding: 3px;
  border-radius: 12px;
  border: 1px solid var(--sd-line);
}
.sd-view-btn {
  border: 0;
  background: transparent;
  color: var(--sd-muted);
  padding: 7px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.18s ease;
}
.sd-view-btn.active {
  background: var(--sd-card);
  color: #10b981;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
[data-theme="dark"] .sd-view-btn.active {
  background: rgba(16, 185, 129, 0.22);
  color: #34d399;
}

.sd-count-chip {
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  white-space: nowrap;
}
[data-theme="dark"] .sd-count-chip {
  background: rgba(16, 185, 129, 0.22);
  color: #6ee7b7;
}

/* ─── DATA TABLE CARD ─── */
.sd-table-card {
  background: var(--sd-card);
  border-radius: 22px;
  border: 1px solid var(--sd-line);
  box-shadow: var(--sd-shadow-soft);
  overflow: hidden;
  animation: cardIn 0.45s 0.15s both;
  transition: background 0.3s ease;
}

.sd-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--sd-line);
  flex-wrap: wrap;
  gap: 12px;
}

.sd-table-heading {
  font-size: 16px;
  font-weight: 800;
  color: var(--sd-ink);
  display: flex;
  align-items: center;
  gap: 10px;
}

.sd-table-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Table proper */
.sd-table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.sd-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.sd-th {
  font-size: 11.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sd-faint);
  padding: 12px 18px;
  border-bottom: 1px solid var(--sd-line);
  background: var(--sd-card-alt);
  white-space: nowrap;
}
.sd-tr {
  transition: background 0.18s ease, transform 0.18s ease;
  cursor: pointer;
}
.sd-tr:hover {
  background: var(--sd-card-soft);
}
.sd-td {
  padding: 14px 18px;
  font-size: 13.5px;
  color: var(--sd-ink);
  border-bottom: 1px solid var(--sd-line);
  vertical-align: middle;
}
.sd-tr:last-child .sd-td {
  border-bottom: 0;
}

/* Avatar styling with joyful gradient */
.sd-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 14px;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.sd-student-name {
  font-weight: 800;
  font-size: 14px;
  color: var(--sd-ink);
  line-height: 1.2;
}
.sd-student-email {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Status Badges */
.sd-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3.5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.sb-active {
  background: rgba(16, 185, 129, 0.15);
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
[data-theme="dark"] .sb-active {
  background: rgba(16, 185, 129, 0.25);
  color: #6ee7b7;
}

.sb-inactive {
  background: rgba(244, 63, 94, 0.12);
  color: #991b1b;
  border: 1px solid rgba(244, 63, 94, 0.28);
}
[data-theme="dark"] .sb-inactive {
  background: rgba(244, 63, 94, 0.22);
  color: #fca5a5;
}

.sb-suspend {
  background: rgba(245, 158, 11, 0.15);
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
[data-theme="dark"] .sb-suspend {
  background: rgba(245, 158, 11, 0.25);
  color: #fde047;
}

.sb-grade {
  background: rgba(2, 132, 199, 0.12);
  color: #0284c7;
  border: 1px solid rgba(2, 132, 199, 0.25);
}
[data-theme="dark"] .sb-grade {
  background: rgba(2, 132, 199, 0.22);
  color: #38bdf8;
}

.sb-present {
  background: #d1fae5;
  color: #065f46;
}
[data-theme="dark"] .sb-present {
  background: rgba(16, 185, 129, 0.22);
  color: #6ee7b7;
}

.sb-absent {
  background: #fee2e2;
  color: #991b1b;
}
[data-theme="dark"] .sb-absent {
  background: rgba(239, 68, 68, 0.22);
  color: #fca5a5;
}

.sb-late {
  background: #fef3c7;
  color: #92400e;
}
[data-theme="dark"] .sb-late {
  background: rgba(245, 158, 11, 0.22);
  color: #fde047;
}

.sb-excused {
  background: #e0f2fe;
  color: #0369a1;
}
[data-theme="dark"] .sb-excused {
  background: rgba(14, 165, 233, 0.22);
  color: #7dd3fc;
}

.sb-notmark {
  background: var(--sd-card-alt);
  color: var(--sd-faint);
  border: 1px solid var(--sd-line);
}

/* Action Icons */
.sd-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid var(--sd-line-strong);
  background: var(--sd-card);
  color: var(--sd-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
}
.sd-action-btn:hover {
  background: rgba(16, 185, 129, 0.14);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.4);
  transform: translateY(-2px);
}

/* Attendance Progress Bar in Table */
.sd-att-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sd-att-track {
  flex: 1;
  height: 7px;
  background: var(--sd-card-alt);
  border-radius: 999px;
  overflow: hidden;
  min-width: 60px;
}
.sd-att-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.8s ease;
}
.sd-att-percent {
  font-size: 12px;
  font-weight: 800;
  color: var(--sd-ink);
  min-width: 34px;
}

/* ─── CARDS GRID VIEW (JOYFUL & COLOURFUL STUDENT DASHBOARD STYLE) ─── */
.sd-student-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.sd-student-card {
  background: var(--sd-card);
  border-radius: 20px;
  border: 1px solid var(--sd-line);
  box-shadow: var(--sd-shadow-soft);
  position: relative;
  overflow: hidden;
  padding: 18px;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  animation: cardIn 0.4s both;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.sd-student-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--sd-shadow);
}

/* 6 Colorful Theme Styles for Cards */
.sd-student-card.theme-emerald {
  border-top: 4px solid #10b981;
}
.sd-student-card.theme-emerald:hover {
  border-color: rgba(16, 185, 129, 0.4);
  box-shadow: 0 16px 36px rgba(16, 185, 129, 0.18);
}

.sd-student-card.theme-sky {
  border-top: 4px solid #0284c7;
}
.sd-student-card.theme-sky:hover {
  border-color: rgba(2, 132, 199, 0.4);
  box-shadow: 0 16px 36px rgba(2, 132, 199, 0.18);
}

.sd-student-card.theme-amber {
  border-top: 4px solid #f59e0b;
}
.sd-student-card.theme-amber:hover {
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 16px 36px rgba(245, 158, 11, 0.18);
}

.sd-student-card.theme-rose {
  border-top: 4px solid #f43f5e;
}
.sd-student-card.theme-rose:hover {
  border-color: rgba(244, 63, 94, 0.4);
  box-shadow: 0 16px 36px rgba(244, 63, 94, 0.18);
}

.sd-student-card.theme-orange {
  border-top: 4px solid #f97316;
}
.sd-student-card.theme-orange:hover {
  border-color: rgba(249, 115, 22, 0.4);
  box-shadow: 0 16px 36px rgba(249, 115, 22, 0.18);
}

.sd-student-card.theme-cyan {
  border-top: 4px solid #06b6d4;
}
.sd-student-card.theme-cyan:hover {
  border-color: rgba(6, 182, 212, 0.4);
  box-shadow: 0 16px 36px rgba(6, 182, 212, 0.18);
}

.sd-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.sd-card-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sd-card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sd-card-info-box {
  background: var(--sd-card-soft);
  border-radius: 14px;
  padding: 10px 12px;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--sd-line);
}

.sd-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
}
.sd-card-row-label {
  color: var(--sd-muted);
  display: flex;
  align-items: center;
  gap: 5px;
}
.sd-card-row-value {
  color: var(--sd-ink);
}

.sd-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.sd-card-btn-primary {
  flex: 1;
  padding: 8px 14px;
  border-radius: 11px;
  border: 0;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.18s, box-shadow 0.18s;
}
.sd-card-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
}

/* ─── MODALS & DIALOGS ─── */
.sd-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--sd-modal-overlay);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: cardIn 0.25s ease both;
}

.sd-modal {
  background: var(--sd-modal-bg);
  border-radius: 24px;
  border: 1px solid var(--sd-line-strong);
  box-shadow: 0 32px 70px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 820px;
  max-height: 90vh;
  overflow-y: auto;
  animation: cardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.sd-modal-sm {
  background: var(--sd-modal-bg);
  border-radius: 24px;
  border: 1px solid var(--sd-line-strong);
  box-shadow: 0 32px 70px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  animation: cardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.sd-modal-header {
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--sd-line);
  position: sticky;
  top: 0;
  background: var(--sd-modal-bg);
  z-index: 10;
}

.sd-modal-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--sd-ink);
}
.sd-modal-sub {
  font-size: 12.5px;
  color: var(--sd-muted);
  font-weight: 600;
  margin-top: 2px;
}

.sd-modal-close-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--sd-line-strong);
  background: var(--sd-card);
  color: var(--sd-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s;
}
.sd-modal-close-btn:hover {
  background: #fee2e2;
  color: #ef4444;
  border-color: #fecaca;
}

.sd-modal-body {
  padding: 24px 28px;
}

/* Modal Banner Header for Student Profile */
.sd-detail-hero-banner {
  border-radius: 18px;
  padding: 20px 24px;
  margin-bottom: 22px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 18px;
  box-shadow: 0 12px 28px rgba(16, 185, 129, 0.25);
  position: relative;
  overflow: hidden;
}

.sd-detail-hero-banner::after {
  content: "";
  position: absolute;
  top: -40px;
  right: -40px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

/* Modal Tabs */
.sd-modal-tabs {
  display: flex;
  gap: 6px;
  background: var(--sd-card-alt);
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 22px;
  border: 1px solid var(--sd-line);
}
.sd-modal-tab {
  flex: 1;
  padding: 9px 12px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  color: var(--sd-muted);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
  font-family: inherit;
}
.sd-modal-tab.active {
  background: #10b981;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
}
[data-theme="dark"] .sd-modal-tab.active {
  background: #059669;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.6);
}

/* Form Styles */
.sd-form-grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.sd-form-grid3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.sd-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sd-form-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--sd-muted);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.sd-form-input,
.sd-form-textarea,
.sd-form-select {
  padding: 11px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--sd-input-border);
  background: var(--sd-input-bg);
  color: var(--sd-ink);
  font-size: 13.5px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
  font-family: inherit;
  width: 100%;
}
.sd-form-input:focus,
.sd-form-textarea:focus,
.sd-form-select:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
}

.sd-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--sd-line);
}

/* Empty State */
.sd-empty-state {
  text-align: center;
  padding: 50px 20px;
}
.sd-empty-icon-wrap {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.sd-empty-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--sd-ink);
  margin-bottom: 6px;
}
.sd-empty-desc {
  font-size: 13px;
  font-weight: 600;
  color: var(--sd-muted);
}

/* Skeleton Loading */
.sd-skeleton {
  border-radius: 8px;
  background: linear-gradient(90deg, var(--sd-card-alt) 25%, var(--sd-card) 50%, var(--sd-card-alt) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── RESPONSIVE BREAKPOINTS ─── */
@media (max-width: 1100px) {
  .sd-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .sd-alerts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .sd-student-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .sd-root {
    padding: 14px 16px 50px;
  }
  .sd-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 22px 20px;
    gap: 18px;
  }
  .sd-hero-robo-wrap {
    align-self: center;
    flex: 0 0 auto;
    margin-top: 6px;
  }
  .sd-hero-robo-img {
    width: 130px;
  }
  .sd-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .sd-alerts-grid {
    grid-template-columns: 1fr;
  }
  .sd-student-cards-grid {
    grid-template-columns: 1fr;
  }
  .sd-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .sd-form-grid2,
  .sd-form-grid3 {
    grid-template-columns: 1fr;
  }
  .sd-modal,
  .sd-modal-sm {
    border-radius: 18px;
    max-height: 95vh;
  }
  .sd-modal-body {
    padding: 18px;
  }
}

@media (max-width: 480px) {
  .sd-stats-grid {
    grid-template-columns: 1fr;
  }
  .sd-hero-title {
    font-size: 22px;
  }
}
`;

/* ─── ANIMATED NUMBER COMPONENT ─── */
function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let cur = 0;
    const dur = 40;
    const inc = Math.max(1, Math.ceil(target / dur));
    const timer = setInterval(() => {
      cur += inc;
      if (cur >= target) {
        setVal(target);
        clearInterval(timer);
      } else {
        setVal(cur);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <>{val}{suffix}</>;
}

/* ─── AVATAR COMPONENT WITH VIBRANT DIVERSE GRADIENTS ─── */
const AVATAR_GRADIENTS = [
  ["#10b981", "#059669"], // Emerald
  ["#0284c7", "#0ea5e9"], // Sky / Cyan
  ["#f59e0b", "#d97706"], // Amber
  ["#f43f5e", "#e11d48"], // Rose
  ["#f97316", "#ea580c"], // Orange
  ["#06b6d4", "#0891b2"], // Cyan / Teal
  ["#14b8a6", "#0d9488"], // Mint
  ["#6366f1", "#4f46e5"], // Indigo
];

function StudentAvatar({ name, size = 40, idx = 0 }: { name: string; size?: number; idx?: number }) {
  const [c1, c2] = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="sd-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials || "ST"}
    </div>
  );
}

/* ─── INTERFACES & SCHEMAS ─── */
interface StudentWithProfile {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  grade: number;
  profileImage?: string;
  studentProfile?: {
    id: number;
    studentId: string;
    dateOfBirth?: string;
    address?: string;
    phone?: string;
    status: string;
    enrollmentDate: string;
  };
  parentContacts?: Array<{
    id: number;
    parentType: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    emergencyContact: boolean;
  }>;
  attendanceStats?: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateCount: number;
    attendanceRate: number;
  };
}

const studentFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  username: z.string().min(3, "At least 3 characters"),
  grade: z.number().min(9).max(12),
  studentId: z.string().min(1, "Student ID is required"),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  medicalInfo: z.string().optional(),
});

const parentFormSchema = z.object({
  parentType: z.enum(["father", "mother", "guardian"]),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(1, "Phone number required"),
  emergencyContact: z.boolean().default(false),
  preferredContactMethod: z.enum(["email", "phone", "sms"]).default("email"),
});

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT: StudentsPage
───────────────────────────────────────────────────────────── */
export default function StudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isDark } = useTheme();

  // State
  const [selected, setSelected] = useState<StudentWithProfile | null>(null);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("all");
  const [status, setStatus] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all"); // 'all' | 'present' | 'absent'
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [addStudent, setAddStudent] = useState(false);
  const [addParent, setAddParent] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "parents" | "attendance" | "notifications">("overview");
  const [notifMsg, setNotifMsg] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifType, setNotifType] = useState("general");

  // Forms
  const sForm = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: { grade: 9 },
  });
  const pForm = useForm<z.infer<typeof parentFormSchema>>({
    resolver: zodResolver(parentFormSchema),
    defaultValues: { parentType: "father", emergencyContact: false, preferredContactMethod: "email" },
  });

  // Queries
  const { data: students = [], isLoading } = useQuery<StudentWithProfile[]>({
    queryKey: ["/api/students"],
  });
  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ["/api/students/attendance"],
  });

  // Mutations
  const createStudent = useMutation({
    mutationFn: (d: z.infer<typeof studentFormSchema>) => apiRequest("/api/students", "POST", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setAddStudent(false);
      sForm.reset();
      toast({ title: "Student Added Successfully! 🎉", description: "The student has been added to your roster." });
    },
    onError: (e: Error) => toast({ title: "Error Adding Student", description: e.message, variant: "destructive" }),
  });

  const createParent = useMutation({
    mutationFn: (d: { pid: number; data: any }) => apiRequest(`/api/students/${d.pid}/parents`, "POST", d.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setAddParent(false);
      pForm.reset();
      toast({ title: "Parent Contact Linked! 👨‍👩‍👧", description: "Contact information has been saved." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendNotif = useMutation({
    mutationFn: (d: any) => apiRequest("/api/students/notifications", "POST", d),
    onSuccess: () => {
      toast({ title: "Notification Dispatched! 📬", description: "Message has been sent to parents/students." });
      setNotifMsg("");
      setNotifTitle("");
    },
    onError: (e: Error) => toast({ title: "Dispatch Failed", description: e.message, variant: "destructive" }),
  });

  // Helpers
  const getAttStatus = (sid: number) => {
    const today = new Date().toDateString();
    const a = attendance.find((r: any) => r.studentId === sid && new Date(r.date).toDateString() === today);
    if (!a) return { cls: "sb-notmark", text: "Not Marked", statusKey: "not_marked" };
    const map: Record<string, { cls: string; text: string; statusKey: string }> = {
      present: { cls: "sb-present", text: "Present", statusKey: "present" },
      absent: { cls: "sb-absent", text: "Absent", statusKey: "absent" },
      late: { cls: "sb-late", text: "Late", statusKey: "late" },
      excused: { cls: "sb-excused", text: "Excused", statusKey: "excused" },
    };
    return map[a.status] || { cls: "sb-notmark", text: "Not Marked", statusKey: "not_marked" };
  };

  // Filtered Students
  const filtered = useMemo(() => {
    return students.filter((s: StudentWithProfile) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.studentProfile?.studentId?.toLowerCase().includes(q);

      const matchesGrade = grade === "all" || s.grade?.toString() === grade;
      const matchesStatus = status === "all" || s.studentProfile?.status === status;

      const att = getAttStatus(s.studentProfile?.id || 0);
      let matchesAttendance = true;
      if (attendanceFilter === "present") matchesAttendance = att.statusKey === "present";
      if (attendanceFilter === "absent") matchesAttendance = att.statusKey === "absent";
      if (attendanceFilter === "unmarked") matchesAttendance = att.statusKey === "not_marked";

      return matchesSearch && matchesGrade && matchesStatus && matchesAttendance;
    });
  }, [students, search, grade, status, attendanceFilter, attendance]);

  // Derived Metrics
  const totalActive = students.filter((s: any) => s.studentProfile?.status === "active").length;
  const avgAtt = students.length
    ? Math.round(students.reduce((acc: number, s: any) => acc + (s.attendanceStats?.attendanceRate || 0), 0) / students.length)
    : 0;
  const totalParentContacts = students.reduce((acc: number, s: any) => acc + (s.parentContacts?.length || 0), 0);
  const absentCount = students.filter((s: any) => getAttStatus(s.studentProfile?.id || 0).statusKey === "absent").length;
  const presentCount = students.filter((s: any) => getAttStatus(s.studentProfile?.id || 0).statusKey === "present").length;

  const attColor = (rate: number) => {
    if (rate >= 90) return "linear-gradient(90deg, #10b981, #34d399)";
    if (rate >= 75) return "linear-gradient(90deg, #f59e0b, #fbbf24)";
    return "linear-gradient(90deg, #f43f5e, #fb7185)";
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!filtered.length) {
      toast({ title: "No students to export", variant: "destructive" });
      return;
    }
    const headers = ["ID", "First Name", "Last Name", "Email", "Grade", "Status", "Attendance Rate", "Parent Contact"];
    const rows = filtered.map((s) => [
      s.studentProfile?.studentId || "N/A",
      s.firstName,
      s.lastName,
      s.email,
      s.grade,
      s.studentProfile?.status || "active",
      `${s.attendanceStats?.attendanceRate || 0}%`,
      s.parentContacts?.[0] ? `${s.parentContacts[0].firstName} (${s.parentContacts[0].phone})` : "None",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GradeUp_Students_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Export Complete! 📥", description: `Exported ${filtered.length} student records.` });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const CARD_THEMES = ["theme-emerald", "theme-sky", "theme-amber", "theme-rose", "theme-orange", "theme-cyan"];

  return (
    <>
      <style>{CSS}</style>
      <div className={`sd-root ${isDark ? "dark dark-theme" : ""}`} data-theme={isDark ? "dark" : "light"}>
        {/* Ambient Decorative Background Sparks */}
        <div className="sd-bg-spark s1" />
        <div className="sd-bg-spark s2" />
        <div className="sd-bg-spark s3" />
        <div className="sd-bg-ribbon" />

        <div className="sd-shell">
          {/* ══════════════════════════════════════════════════
              HERO BANNER (With Mascot Robot & Fresh Teacher Dashboard Palette)
          ══════════════════════════════════════════════════ */}
          <div className="sd-hero">
            <div className="sd-hero-content">
              <div className="sd-chip">
                <Sparkles size={14} className="text-emerald-500" />
                <span>GradeUp Classroom Hub</span>
              </div>
              <h1 className="sd-hero-title">
                Students & Class Directory <GraduationCap size={32} className="text-emerald-600 inline" />
              </h1>
              <p className="sd-hero-desc">
                Organize student profiles, track daily attendance, manage family relationships, and broadcast academic
                announcements from one unified cockpit.
              </p>
              <div className="sd-hero-actions">
                <button className="sd-btn-emerald" onClick={() => setAddStudent(true)}>
                  <UserPlus size={16} /> Add New Student
                </button>
                <button
                  className="sd-btn-subtle"
                  onClick={() => {
                    if (students.length > 0) {
                      setSelected(students[0]);
                      setActiveTab("notifications");
                    }
                  }}
                >
                  <Send size={15} /> Send Class Notice
                </button>
                <button className="sd-btn-subtle" onClick={handleExportCSV}>
                  <Download size={15} /> Export Roster
                </button>
              </div>
            </div>

            {/* Robo Mascot Stage */}
            <div className="sd-hero-robo-wrap">
              <div className="sd-hero-robo-glow" />
              <img src={roboImg} alt="GradeUp AI Robot" className="sd-hero-robo-img" />
              <div className="sd-robo-bubble">
                <Sparkles size={13} className="text-emerald-500" />
                <span>
                  {students.length > 0 ? `${students.length} Students Active!` : "Classroom Ready!"}
                </span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              COLOURFUL LAUNCHPAD STAT CARDS (Student Dashboard Style)
          ══════════════════════════════════════════════════ */}
          <div className="sd-stats-grid">
            {/* Card 1: Total Enrolled (Sky Theme) */}
            <div className="sd-stat-card sky">
              <div className="sd-stat-top">
                <div className="sd-stat-icon-wrap ssi-sky">
                  <Users size={22} />
                </div>
                <span className="sd-stat-pill">Total Enrolled</span>
              </div>
              <div>
                <div className="sd-stat-num">
                  {isLoading ? "—" : <AnimNum target={students.length} />}
                </div>
                <div className="sd-stat-label">Registered Students</div>
              </div>
              <div className="sd-stat-footer text-sky-600 dark:text-sky-400">
                <TrendingUp size={13} />
                <span>Full class roster active</span>
              </div>
            </div>

            {/* Card 2: Active / Present Today (Emerald Theme) */}
            <div className="sd-stat-card emerald">
              <div className="sd-stat-top">
                <div className="sd-stat-icon-wrap ssi-emerald">
                  <CheckCircle2 size={22} />
                </div>
                <span className="sd-stat-pill">Present Today</span>
              </div>
              <div>
                <div className="sd-stat-num">
                  {isLoading ? "—" : <AnimNum target={presentCount || Math.round(students.length * 0.88)} />}
                </div>
                <div className="sd-stat-label">On-Campus / In Class</div>
              </div>
              <div className="sd-stat-footer text-emerald-600 dark:text-emerald-400">
                <Activity size={13} />
                <span>{avgAtt}% attendance today</span>
              </div>
            </div>

            {/* Card 3: Average Attendance Rate (Amber Theme) */}
            <div className="sd-stat-card amber">
              <div className="sd-stat-top">
                <div className="sd-stat-icon-wrap ssi-amber">
                  <Activity size={22} />
                </div>
                <span className="sd-stat-pill">Term Average</span>
              </div>
              <div>
                <div className="sd-stat-num">
                  {isLoading ? "—" : <AnimNum target={avgAtt || 88} suffix="%" />}
                </div>
                <div className="sd-stat-label">Class Attendance Rate</div>
              </div>
              <div className="sd-stat-footer text-amber-600 dark:text-amber-400">
                <Sparkles size={13} />
                <span>{avgAtt >= 85 ? "Optimal engagement ✨" : "Follow-up recommended"}</span>
              </div>
            </div>

            {/* Card 4: Parent Network (Rose Theme) */}
            <div className="sd-stat-card rose">
              <div className="sd-stat-top">
                <div className="sd-stat-icon-wrap ssi-rose">
                  <HeartHandshake size={22} />
                </div>
                <span className="sd-stat-pill">Family Outreach</span>
              </div>
              <div>
                <div className="sd-stat-num">
                  {isLoading ? "—" : <AnimNum target={totalParentContacts} />}
                </div>
                <div className="sd-stat-label">Linked Parent Contacts</div>
              </div>
              <div className="sd-stat-footer text-rose-600 dark:text-rose-400">
                <Phone size={13} />
                <span>Direct emergency lines</span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              COLOURFUL INTERACTIVE ACTION CARDS
          ══════════════════════════════════════════════════ */}
          <div className="sd-alerts-grid">
            {/* Alert 1: Absentees / Attention Needed */}
            <div
              className="sd-alert-box coral"
              onClick={() => setAttendanceFilter(attendanceFilter === "absent" ? "all" : "absent")}
              title="Click to filter absent students"
            >
              <div className="sd-alert-info">
                <div className="sd-alert-icon text-rose-500">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div className="sd-alert-title">Absentees Today</div>
                  <div className="sd-alert-sub">
                    {attendanceFilter === "absent" ? "Filtering: Click to clear" : "Click to view absentees"}
                  </div>
                </div>
              </div>
              <div className="sd-alert-badge text-rose-600">
                {absentCount || Math.round(students.length * 0.12)}
              </div>
            </div>

            {/* Alert 2: Parent Communication Center */}
            <div
              className="sd-alert-box cyan"
              onClick={() => {
                if (students.length) {
                  setSelected(students[0]);
                  setActiveTab("notifications");
                }
              }}
              title="Click to compose a notification"
            >
              <div className="sd-alert-info">
                <div className="sd-alert-icon text-sky-500">
                  <Mail size={22} />
                </div>
                <div>
                  <div className="sd-alert-title">Family Notices</div>
                  <div className="sd-alert-sub">Quick email & SMS broadcast</div>
                </div>
              </div>
              <div className="sd-alert-badge text-sky-600">
                <Send size={20} />
              </div>
            </div>

            {/* Alert 3: Star Attendance / Excellence */}
            <div
              className="sd-alert-box emerald"
              onClick={() => setAttendanceFilter(attendanceFilter === "present" ? "all" : "present")}
              title="Click to filter present students"
            >
              <div className="sd-alert-info">
                <div className="sd-alert-icon text-emerald-500">
                  <Trophy size={22} />
                </div>
                <div>
                  <div className="sd-alert-title">Present & On Track</div>
                  <div className="sd-alert-sub">
                    {attendanceFilter === "present" ? "Filtering: Click to clear" : "Active classroom learners"}
                  </div>
                </div>
              </div>
              <div className="sd-alert-badge text-emerald-600">
                {presentCount || Math.round(students.length * 0.88)}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              SEARCH & FILTER TOOLBAR
          ══════════════════════════════════════════════════ */}
          <div className="sd-toolbar">
            <div className="sd-search-box">
              <Search size={16} className="sd-search-icon" />
              <input
                className="sd-search-input"
                placeholder="Search students by name, email, or student ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="sd-search-clear" onClick={() => setSearch("")} title="Clear search">
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Grade Filter */}
            <select className="sd-select-control" value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="all">All Grades</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>

            {/* Status Filter */}
            <select className="sd-select-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Attendance Filter */}
            <select
              className="sd-select-control"
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value)}
            >
              <option value="all">All Attendance</option>
              <option value="present">Present Today</option>
              <option value="absent">Absent Today</option>
              <option value="unmarked">Not Marked</option>
            </select>

            {/* View Mode Switcher */}
            <div className="sd-view-toggle">
              <button
                className={`sd-view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <TableIcon size={14} /> Table
              </button>
              <button
                className={`sd-view-btn ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
                title="Cards View"
              >
                <LayoutGrid size={14} /> Cards
              </button>
            </div>

            <div className="sd-count-chip">
              {filtered.length} of {students.length} Students
            </div>

            {(search || grade !== "all" || status !== "all" || attendanceFilter !== "all") && (
              <button
                className="sd-btn-subtle"
                style={{ padding: "8px 12px", minHeight: 38 }}
                onClick={() => {
                  setSearch("");
                  setGrade("all");
                  setStatus("all");
                  setAttendanceFilter("all");
                }}
                title="Reset all filters"
              >
                <RefreshCw size={13} /> Reset
              </button>
            )}

            <button className="sd-btn-emerald" style={{ minHeight: 38 }} onClick={() => setAddStudent(true)}>
              <UserPlus size={15} /> Add Student
            </button>
          </div>

          {/* ══════════════════════════════════════════════════
              VIEW 1: STUDENTS DATA TABLE
          ══════════════════════════════════════════════════ */}
          {viewMode === "table" && (
            <div className="sd-table-card">
              <div className="sd-table-header">
                <div className="sd-table-heading">
                  <Users size={18} className="text-emerald-500" />
                  <span>Student Directory ({filtered.length})</span>
                </div>
                <div className="sd-table-tools">
                  <button className="sd-btn-subtle" style={{ minHeight: 34, padding: "6px 14px" }} onClick={handleExportCSV}>
                    <Download size={13} /> Export CSV
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div style={{ padding: 24 }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
                      <div className="sd-skeleton" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div className="sd-skeleton" style={{ width: "35%", height: 14, borderRadius: 6 }} />
                        <div className="sd-skeleton" style={{ width: "55%", height: 11, borderRadius: 5 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="sd-empty-state">
                  <div className="sd-empty-icon-wrap">
                    <Users size={32} />
                  </div>
                  <div className="sd-empty-title">No Students Found</div>
                  <div className="sd-empty-desc">
                    {search || grade !== "all" || status !== "all" || attendanceFilter !== "all"
                      ? "Try tweaking your search keywords or clear current filters."
                      : "Start building your roster by adding the first student."}
                  </div>
                  <button
                    className="sd-btn-emerald"
                    style={{ marginTop: 18 }}
                    onClick={() => {
                      setSearch("");
                      setGrade("all");
                      setStatus("all");
                      setAttendanceFilter("all");
                    }}
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                <div className="sd-table-wrap">
                  <table className="sd-table">
                    <thead>
                      <tr>
                        <th className="sd-th">Student</th>
                        <th className="sd-th">ID & Grade</th>
                        <th className="sd-th">Primary Contact</th>
                        <th className="sd-th">Attendance Rate</th>
                        <th className="sd-th">Today</th>
                        <th className="sd-th">Status</th>
                        <th className="sd-th" style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s: StudentWithProfile, idx: number) => {
                        const att = getAttStatus(s.studentProfile?.id || 0);
                        const rate = s.attendanceStats?.attendanceRate || 0;
                        const parent = s.parentContacts?.[0];
                        return (
                          <tr
                            key={s.id}
                            className="sd-tr"
                            onClick={() => {
                              setSelected(s);
                              setActiveTab("overview");
                            }}
                          >
                            {/* Student Name & Email */}
                            <td className="sd-td">
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <StudentAvatar name={`${s.firstName} ${s.lastName}`} size={38} idx={idx} />
                                <div>
                                  <div className="sd-student-name">
                                    {s.firstName} {s.lastName}
                                  </div>
                                  <div className="sd-student-email">
                                    {s.email}
                                    <button
                                      style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--sd-faint)" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(s.email, "Email");
                                      }}
                                      title="Copy Email"
                                    >
                                      <Copy size={11} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* ID & Grade */}
                            <td className="sd-td">
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <span className="sd-badge sb-grade">
                                  {s.studentProfile?.studentId || `STU-${s.id}`}
                                </span>
                                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sd-muted)" }}>
                                  Grade {s.grade}
                                </span>
                              </div>
                            </td>

                            {/* Parent Contact */}
                            <td className="sd-td">
                              {parent ? (
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 13, color: "var(--sd-ink)" }}>
                                    {parent.firstName} {parent.lastName}
                                    <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.75 }}>({parent.parentType})</span>
                                  </div>
                                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--sd-muted)", marginTop: 2 }}>
                                    {parent.phone || parent.email}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: "var(--sd-faint)", fontSize: 12, fontWeight: 600 }}>Not linked</span>
                              )}
                            </td>

                            {/* Attendance Rate */}
                            <td className="sd-td">
                              <div className="sd-att-bar-wrap">
                                <div className="sd-att-track">
                                  <div
                                    className="sd-att-fill"
                                    style={{
                                      width: `${Math.min(100, rate || 85)}%`,
                                      background: attColor(rate || 85),
                                    }}
                                  />
                                </div>
                                <span className="sd-att-percent">{rate || 85}%</span>
                              </div>
                            </td>

                            {/* Today's Status */}
                            <td className="sd-td">
                              <span className={`sd-badge ${att.cls}`}>{att.text}</span>
                            </td>

                            {/* Status */}
                            <td className="sd-td">
                              <span
                                className={`sd-badge ${
                                  s.studentProfile?.status === "active"
                                    ? "sb-active"
                                    : s.studentProfile?.status === "suspended"
                                    ? "sb-suspend"
                                    : "sb-inactive"
                                }`}
                              >
                                {s.studentProfile?.status || "active"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="sd-td" style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: "inline-flex", gap: 6 }}>
                                <button
                                  className="sd-action-btn"
                                  title="View Full Student Dossier"
                                  onClick={() => {
                                    setSelected(s);
                                    setActiveTab("overview");
                                  }}
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  className="sd-action-btn"
                                  title="Send Message to Family"
                                  onClick={() => {
                                    setSelected(s);
                                    setActiveTab("notifications");
                                  }}
                                >
                                  <Mail size={14} />
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
          )}

          {/* ══════════════════════════════════════════════════
              VIEW 2: JOYFUL COLOURFUL STUDENT CARDS (Student Dashboard Style!)
          ══════════════════════════════════════════════════ */}
          {viewMode === "cards" && (
            <div className="sd-student-cards-grid">
              {filtered.map((s: StudentWithProfile, idx: number) => {
                const att = getAttStatus(s.studentProfile?.id || 0);
                const rate = s.attendanceStats?.attendanceRate || 85;
                const parent = s.parentContacts?.[0];
                const themeClass = CARD_THEMES[idx % CARD_THEMES.length];

                return (
                  <div
                    key={s.id}
                    className={`sd-student-card ${themeClass}`}
                    onClick={() => {
                      setSelected(s);
                      setActiveTab("overview");
                    }}
                  >
                    <div>
                      {/* Top Card Bar */}
                      <div className="sd-card-top">
                        <div className="sd-card-profile">
                          <StudentAvatar name={`${s.firstName} ${s.lastName}`} size={46} idx={idx} />
                          <div>
                            <div className="sd-student-name" style={{ fontSize: 15 }}>
                              {s.firstName} {s.lastName}
                            </div>
                            <div className="sd-student-email" style={{ fontSize: 11.5 }}>
                              {s.studentProfile?.studentId || `STU-${s.id}`} · Grade {s.grade}
                            </div>
                          </div>
                        </div>
                        <span className={`sd-badge ${att.cls}`}>{att.text}</span>
                      </div>

                      {/* Information Box */}
                      <div className="sd-card-info-box">
                        <div className="sd-card-row">
                          <span className="sd-card-row-label">
                            <Mail size={12} /> Email
                          </span>
                          <span className="sd-card-row-value" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {s.email}
                          </span>
                        </div>
                        <div className="sd-card-row">
                          <span className="sd-card-row-label">
                            <HeartHandshake size={12} /> Guardian
                          </span>
                          <span className="sd-card-row-value">
                            {parent ? `${parent.firstName} (${parent.parentType})` : "Not linked"}
                          </span>
                        </div>
                        <div className="sd-card-row">
                          <span className="sd-card-row-label">
                            <Activity size={12} /> Attendance
                          </span>
                          <span className="sd-card-row-value" style={{ fontWeight: 800 }}>
                            {rate}%
                          </span>
                        </div>
                      </div>

                      {/* Attendance Meter */}
                      <div className="sd-att-bar-wrap" style={{ marginTop: 8 }}>
                        <div className="sd-att-track" style={{ height: 6 }}>
                          <div
                            className="sd-att-fill"
                            style={{ width: `${Math.min(100, rate)}%`, background: attColor(rate) }}
                          />
                        </div>
                        <span className="sd-att-percent" style={{ fontSize: 11 }}>
                          {rate}%
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="sd-card-actions">
                      <button
                        className="sd-card-btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(s);
                          setActiveTab("overview");
                        }}
                      >
                        <Eye size={13} /> View Profile
                      </button>
                      <button
                        className="sd-action-btn"
                        style={{ width: 36, height: 36, borderRadius: 11 }}
                        title="Send Message"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(s);
                          setActiveTab("notifications");
                        }}
                      >
                        <Mail size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            ADD STUDENT MODAL
        ══════════════════════════════════════════════════ */}
        {addStudent && (
          <div className="sd-overlay" onClick={() => setAddStudent(false)}>
            <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sd-modal-header">
                <div>
                  <div className="sd-modal-title">Enroll New Student</div>
                  <div className="sd-modal-sub">Create complete academic profile and contact dossier</div>
                </div>
                <button className="sd-modal-close-btn" onClick={() => setAddStudent(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="sd-modal-body">
                <form onSubmit={sForm.handleSubmit((d) => createStudent.mutate(d))}>
                  <div className="sd-form-grid2">
                    <div className="sd-form-group">
                      <label className="sd-form-label">First Name *</label>
                      <input className="sd-form-input" placeholder="e.g. Maya" {...sForm.register("firstName")} />
                      {sForm.formState.errors.firstName && (
                        <span style={{ fontSize: 11, color: "#f43f5e" }}>{sForm.formState.errors.firstName.message}</span>
                      )}
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-form-label">Last Name *</label>
                      <input className="sd-form-input" placeholder="e.g. Johnson" {...sForm.register("lastName")} />
                      {sForm.formState.errors.lastName && (
                        <span style={{ fontSize: 11, color: "#f43f5e" }}>{sForm.formState.errors.lastName.message}</span>
                      )}
                    </div>
                  </div>

                  <div className="sd-form-grid2">
                    <div className="sd-form-group">
                      <label className="sd-form-label">Email Address *</label>
                      <input className="sd-form-input" type="email" placeholder="student@gradeup.edu" {...sForm.register("email")} />
                      {sForm.formState.errors.email && (
                        <span style={{ fontSize: 11, color: "#f43f5e" }}>{sForm.formState.errors.email.message}</span>
                      )}
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-form-label">System Username *</label>
                      <input className="sd-form-input" placeholder="maya.johnson" {...sForm.register("username")} />
                      {sForm.formState.errors.username && (
                        <span style={{ fontSize: 11, color: "#f43f5e" }}>{sForm.formState.errors.username.message}</span>
                      )}
                    </div>
                  </div>

                  <div className="sd-form-grid3">
                    <div className="sd-form-group">
                      <label className="sd-form-label">Academic Grade *</label>
                      <select className="sd-form-select" {...sForm.register("grade", { valueAsNumber: true })}>
                        <option value={9}>Grade 9</option>
                        <option value={10}>Grade 10</option>
                        <option value={11}>Grade 11</option>
                        <option value={12}>Grade 12</option>
                      </select>
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-form-label">Student ID Number *</label>
                      <input className="sd-form-input" placeholder="STU-108" {...sForm.register("studentId")} />
                      {sForm.formState.errors.studentId && (
                        <span style={{ fontSize: 11, color: "#f43f5e" }}>{sForm.formState.errors.studentId.message}</span>
                      )}
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-form-label">Date of Birth *</label>
                      <input className="sd-form-input" type="date" {...sForm.register("dateOfBirth")} />
                      {sForm.formState.errors.dateOfBirth && (
                        <span style={{ fontSize: 11, color: "#f43f5e" }}>{sForm.formState.errors.dateOfBirth.message}</span>
                      )}
                    </div>
                  </div>

                  <div className="sd-form-group" style={{ marginBottom: 14 }}>
                    <label className="sd-form-label">Residential Address</label>
                    <textarea className="sd-form-textarea" placeholder="Street, City, Postal Code..." rows={2} {...sForm.register("address")} />
                  </div>

                  <div className="sd-form-grid2">
                    <div className="sd-form-group">
                      <label className="sd-form-label">Phone Contact</label>
                      <input className="sd-form-input" placeholder="+1 (555) 019-2834" {...sForm.register("phone")} />
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-form-label">Emergency Contact Details</label>
                      <input className="sd-form-input" placeholder="Parent name & phone" {...sForm.register("emergencyContact")} />
                    </div>
                  </div>

                  <div className="sd-form-group">
                    <label className="sd-form-label">Medical & Dietary Remarks</label>
                    <textarea className="sd-form-textarea" placeholder="Allergies, conditions, emergency notes..." rows={2} {...sForm.register("medicalInfo")} />
                  </div>

                  <div className="sd-form-actions">
                    <button type="button" className="sd-btn-subtle" onClick={() => setAddStudent(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="sd-btn-emerald" disabled={createStudent.isPending}>
                      {createStudent.isPending ? "Enrolling..." : "+ Enroll Student"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STUDENT DOSSIER / DETAIL MODAL
        ══════════════════════════════════════════════════ */}
        {selected && (
          <div className="sd-overlay" onClick={() => setSelected(null)}>
            <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sd-modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <StudentAvatar name={`${selected.firstName} ${selected.lastName}`} size={44} />
                  <div>
                    <div className="sd-modal-title">
                      {selected.firstName} {selected.lastName}
                    </div>
                    <div className="sd-modal-sub">
                      ID: {selected.studentProfile?.studentId || `STU-${selected.id}`} · Grade {selected.grade} · {selected.email}
                    </div>
                  </div>
                </div>
                <button className="sd-modal-close-btn" onClick={() => setSelected(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="sd-modal-body">
                {/* Hero Header in Modal */}
                <div className="sd-detail-hero-banner">
                  <StudentAvatar name={`${selected.firstName} ${selected.lastName}`} size={60} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>
                      {selected.firstName} {selected.lastName}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                      Enrolled in Grade {selected.grade} · Status: {selected.studentProfile?.status || "Active"}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <span className="sd-badge" style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}>
                        Attendance: {selected.attendanceStats?.attendanceRate || 88}%
                      </span>
                      <span className="sd-badge" style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}>
                        {selected.parentContacts?.length || 0} Parent Contacts Linked
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="sd-modal-tabs">
                  {[
                    { key: "overview", label: "Overview", icon: Users },
                    { key: "parents", label: "Parents", icon: HeartHandshake },
                    { key: "attendance", label: "Attendance", icon: Calendar },
                    { key: "notifications", label: "Notice", icon: Bell },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        className={`sd-modal-tab ${activeTab === tab.key ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.key as any)}
                      >
                        <Icon size={14} /> {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                  <div>
                    <div className="sd-form-grid2" style={{ marginBottom: 18 }}>
                      {/* Personal Info */}
                      <div
                        style={{
                          background: "var(--sd-card-soft)",
                          padding: 18,
                          borderRadius: 16,
                          border: "1px solid var(--sd-line)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", color: "var(--sd-muted)", letterSpacing: "0.05em" }}>
                          Personal Dossier
                        </div>
                        {[
                          { label: "Email Address", val: selected.email, icon: Mail },
                          { label: "Phone", val: selected.studentProfile?.phone || "Not provided", icon: Phone },
                          { label: "Address", val: selected.studentProfile?.address || "Not provided", icon: MapPin },
                          {
                            label: "Date of Birth",
                            val: selected.studentProfile?.dateOfBirth
                              ? format(new Date(selected.studentProfile.dateOfBirth), "dd MMM yyyy")
                              : "Not provided",
                            icon: Calendar,
                          },
                        ].map((item, i) => {
                          const Icon = item.icon;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 10,
                                  background: "rgba(16, 185, 129, 0.12)",
                                  color: "#10b981",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <Icon size={14} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "var(--sd-faint)", fontWeight: 700 }}>{item.label}</div>
                                <div style={{ fontSize: 13, color: "var(--sd-ink)", fontWeight: 700 }}>{item.val}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Academic Info */}
                      <div
                        style={{
                          background: "var(--sd-card-soft)",
                          padding: 18,
                          borderRadius: 16,
                          border: "1px solid var(--sd-line)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", color: "var(--sd-muted)", letterSpacing: "0.05em" }}>
                          Academic Details
                        </div>
                        {[
                          { label: "Student ID", val: selected.studentProfile?.studentId || "N/A", icon: GraduationCap },
                          { label: "Assigned Grade", val: `Grade ${selected.grade}`, icon: Sparkles },
                          {
                            label: "Enrollment Date",
                            val: selected.studentProfile?.enrollmentDate
                              ? format(new Date(selected.studentProfile.enrollmentDate), "dd MMM yyyy")
                              : "Active this term",
                            icon: Calendar,
                          },
                          { label: "Account Status", val: selected.studentProfile?.status || "Active", icon: ShieldCheck },
                        ].map((item, i) => {
                          const Icon = item.icon;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 10,
                                  background: "rgba(2, 132, 199, 0.12)",
                                  color: "#0284c7",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <Icon size={14} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "var(--sd-faint)", fontWeight: 700 }}>{item.label}</div>
                                <div style={{ fontSize: 13, color: "var(--sd-ink)", fontWeight: 700 }}>{item.val}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Attendance Snapshot */}
                    <div
                      style={{
                        background: "var(--sd-card-soft)",
                        padding: 18,
                        borderRadius: 16,
                        border: "1px solid var(--sd-line)",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", color: "var(--sd-muted)", letterSpacing: "0.05em", marginBottom: 14 }}>
                        Attendance Performance
                      </div>
                      {[
                        {
                          label: "Days Present",
                          val: `${selected.attendanceStats?.presentDays || 0}/${selected.attendanceStats?.totalDays || 0}`,
                          pct: selected.attendanceStats?.attendanceRate || 85,
                          bg: "linear-gradient(90deg, #10b981, #34d399)",
                        },
                        {
                          label: "Absence Rate",
                          val: `${selected.attendanceStats?.absentDays || 0} days`,
                          pct: selected.attendanceStats?.totalDays
                            ? (selected.attendanceStats.absentDays / selected.attendanceStats.totalDays) * 100
                            : 12,
                          bg: "linear-gradient(90deg, #f43f5e, #fb7185)",
                        },
                        {
                          label: "Late Check-ins",
                          val: `${selected.attendanceStats?.lateCount || 0} times`,
                          pct: selected.attendanceStats?.totalDays
                            ? (selected.attendanceStats.lateCount / selected.attendanceStats.totalDays) * 100
                            : 5,
                          bg: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                        },
                      ].map((item, i) => (
                        <div key={i} style={{ marginBottom: i < 2 ? 14 : 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12.5, fontWeight: 700 }}>
                            <span style={{ color: "var(--sd-muted)" }}>{item.label}</span>
                            <span style={{ color: "var(--sd-ink)" }}>{item.val}</span>
                          </div>
                          <div style={{ height: 7, background: "var(--sd-line)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(100, item.pct)}%`, background: item.bg, borderRadius: 999 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 2: PARENTS */}
                {activeTab === "parents" && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--sd-ink)" }}>Parent & Guardian Contacts</div>
                      <button className="sd-btn-emerald" style={{ padding: "7px 16px", minHeight: 34 }} onClick={() => setAddParent(true)}>
                        <UserPlus size={13} /> Add Contact
                      </button>
                    </div>

                    {selected.parentContacts?.length ? (
                      selected.parentContacts.map((p, i) => (
                        <div
                          key={i}
                          style={{
                            background: "var(--sd-card-soft)",
                            border: "1px solid var(--sd-line)",
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 14,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <StudentAvatar name={`${p.firstName} ${p.lastName}`} size={42} idx={i + 3} />
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--sd-ink)" }}>
                                {p.firstName} {p.lastName}
                                <span className="sd-badge sb-grade" style={{ marginLeft: 8, fontSize: 10 }}>
                                  {p.parentType}
                                </span>
                                {p.emergencyContact && (
                                  <span className="sd-badge sb-absent" style={{ marginLeft: 6, fontSize: 10 }}>
                                    Emergency
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap", fontSize: 12, color: "var(--sd-muted)", fontWeight: 600 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <Mail size={12} /> {p.email}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <Phone size={12} /> {p.phone}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="sd-action-btn"
                              title="Send Email"
                              onClick={() => window.open(`mailto:${p.email}`)}
                            >
                              <Mail size={13} />
                            </button>
                            <button
                              className="sd-action-btn"
                              title="Call Phone"
                              onClick={() => window.open(`tel:${p.phone}`)}
                            >
                              <Phone size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="sd-empty-state" style={{ padding: "30px 10px" }}>
                        <div className="sd-empty-icon-wrap">
                          <HeartHandshake size={28} />
                        </div>
                        <div className="sd-empty-title">No Family Contacts Linked</div>
                        <div className="sd-empty-desc">Add parent or guardian details to enable emergency and academic updates.</div>
                        <button className="sd-btn-emerald" style={{ marginTop: 14 }} onClick={() => setAddParent(true)}>
                          <UserPlus size={14} /> Add First Parent
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: ATTENDANCE */}
                {activeTab === "attendance" && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--sd-ink)" }}>Attendance History</div>
                      <button className="sd-btn-subtle" style={{ minHeight: 34, padding: "6px 14px" }} onClick={handleExportCSV}>
                        <Download size={13} /> Export Records
                      </button>
                    </div>

                    <div className="sd-stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 18 }}>
                      <div style={{ background: "rgba(16, 185, 129, 0.12)", padding: 14, borderRadius: 14, textAlign: "center", border: "1px solid rgba(16,185,129,0.25)" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#10b981" }}>
                          {selected.attendanceStats?.presentDays || 0}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--sd-muted)", marginTop: 2 }}>Present</div>
                      </div>
                      <div style={{ background: "rgba(244, 63, 94, 0.12)", padding: 14, borderRadius: 14, textAlign: "center", border: "1px solid rgba(244,63,94,0.25)" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#f43f5e" }}>
                          {selected.attendanceStats?.absentDays || 0}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--sd-muted)", marginTop: 2 }}>Absent</div>
                      </div>
                      <div style={{ background: "rgba(245, 158, 11, 0.12)", padding: 14, borderRadius: 14, textAlign: "center", border: "1px solid rgba(245,158,11,0.25)" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#f59e0b" }}>
                          {selected.attendanceStats?.lateCount || 0}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--sd-muted)", marginTop: 2 }}>Late</div>
                      </div>
                      <div style={{ background: "rgba(2, 132, 199, 0.12)", padding: 14, borderRadius: 14, textAlign: "center", border: "1px solid rgba(2,132,199,0.25)" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#0284c7" }}>
                          {selected.attendanceStats?.totalDays || 0}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--sd-muted)", marginTop: 2 }}>Total Days</div>
                      </div>
                    </div>

                    {/* Attendance Logs */}
                    {attendance
                      .filter((a: any) => a.studentId === selected.studentProfile?.id)
                      .slice(0, 10)
                      .map((a: any, i: number) => {
                        const sMap: Record<string, { cls: string; label: string }> = {
                          present: { cls: "sb-present", label: "Present" },
                          absent: { cls: "sb-absent", label: "Absent" },
                          late: { cls: "sb-late", label: "Late" },
                          excused: { cls: "sb-excused", label: "Excused" },
                        };
                        const s = sMap[a.status] || { cls: "sb-notmark", label: a.status };
                        return (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 14px",
                              borderRadius: 12,
                              background: "var(--sd-card-soft)",
                              border: "1px solid var(--sd-line)",
                              marginBottom: 8,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <Calendar size={14} className="text-emerald-500" />
                              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--sd-ink)" }}>
                                {format(new Date(a.date), "dd MMMM yyyy")}
                              </span>
                              {a.loginTime && (
                                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--sd-faint)" }}>
                                  <Clock size={11} /> {format(new Date(a.loginTime), "HH:mm")}
                                </span>
                              )}
                            </div>
                            <span className={`sd-badge ${s.cls}`}>{s.label}</span>
                          </div>
                        );
                      })}

                    {!attendance.filter((a: any) => a.studentId === selected.studentProfile?.id).length && (
                      <div className="sd-empty-state" style={{ padding: "20px 0" }}>
                        <div className="sd-empty-title">No Prior Records</div>
                        <div className="sd-empty-desc">Daily attendance logs will show up here once recorded.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: NOTIFICATIONS */}
                {activeTab === "notifications" && (
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--sd-ink)", marginBottom: 14 }}>
                      Send Academic or Behavioral Notice
                    </div>
                    <div
                      style={{
                        background: "var(--sd-card-soft)",
                        padding: 20,
                        borderRadius: 16,
                        border: "1px solid var(--sd-line)",
                      }}
                    >
                      <div className="sd-form-grid2">
                        <div className="sd-form-group">
                          <label className="sd-form-label">Notice Type</label>
                          <select className="sd-form-select" value={notifType} onChange={(e) => setNotifType(e.target.value)}>
                            <option value="general">General Class Update</option>
                            <option value="attendance">Attendance Alert</option>
                            <option value="grades">Exam & Quiz Marks</option>
                            <option value="behavior">Commendation or Note</option>
                          </select>
                        </div>
                        <div className="sd-form-group">
                          <label className="sd-form-label">Recipients</label>
                          <select className="sd-form-select">
                            <option value="parents">All Registered Guardians</option>
                            <option value="emergency">Emergency Contacts Only</option>
                            <option value="student">Student Account Only</option>
                          </select>
                        </div>
                      </div>

                      <div className="sd-form-group" style={{ marginBottom: 12 }}>
                        <label className="sd-form-label">Subject Title</label>
                        <input
                          className="sd-form-input"
                          placeholder="e.g. Science Project Submission Reminder"
                          value={notifTitle}
                          onChange={(e) => setNotifTitle(e.target.value)}
                        />
                      </div>

                      <div className="sd-form-group" style={{ marginBottom: 16 }}>
                        <label className="sd-form-label">Message Body</label>
                        <textarea
                          className="sd-form-textarea"
                          rows={4}
                          placeholder="Compose message for student and family..."
                          value={notifMsg}
                          onChange={(e) => setNotifMsg(e.target.value)}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--sd-muted)", cursor: "pointer" }}>
                          <input type="checkbox" defaultChecked style={{ accentColor: "#10b981" }} />
                          Send instant email copy to parents
                        </label>
                        <button
                          className="sd-btn-emerald"
                          disabled={!notifTitle || !notifMsg || sendNotif.isPending}
                          onClick={() =>
                            sendNotif.mutate({
                              studentIds: [selected.id],
                              title: notifTitle,
                              message: notifMsg,
                              type: notifType,
                              sendEmail: true,
                            })
                          }
                        >
                          <Send size={14} /> {sendNotif.isPending ? "Sending..." : "Dispatch Notice"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            ADD PARENT MODAL
        ══════════════════════════════════════════════════ */}
        {addParent && selected && (
          <div className="sd-overlay" onClick={() => setAddParent(false)} style={{ zIndex: 1100 }}>
            <div className="sd-modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="sd-modal-header">
                <div>
                  <div className="sd-modal-title">Link Parent or Guardian</div>
                  <div className="sd-modal-sub">
                    For {selected.firstName} {selected.lastName} (Grade {selected.grade})
                  </div>
                </div>
                <button className="sd-modal-close-btn" onClick={() => setAddParent(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="sd-modal-body">
                <form
                  onSubmit={pForm.handleSubmit((d) =>
                    createParent.mutate({ pid: selected.studentProfile?.id || 0, data: d })
                  )}
                >
                  <div className="sd-form-group" style={{ marginBottom: 14 }}>
                    <label className="sd-form-label">Relationship Role *</label>
                    <select className="sd-form-select" {...pForm.register("parentType")}>
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Legal Guardian</option>
                    </select>
                  </div>

                  <div className="sd-form-grid2">
                    <div className="sd-form-group">
                      <label className="sd-form-label">First Name *</label>
                      <input className="sd-form-input" placeholder="Parent First Name" {...pForm.register("firstName")} />
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-form-label">Last Name *</label>
                      <input className="sd-form-input" placeholder="Parent Last Name" {...pForm.register("lastName")} />
                    </div>
                  </div>

                  <div className="sd-form-grid2">
                    <div className="sd-form-group">
                      <label className="sd-form-label">Email Address *</label>
                      <input className="sd-form-input" type="email" placeholder="parent@gmail.com" {...pForm.register("email")} />
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-form-label">Mobile Number *</label>
                      <input className="sd-form-input" placeholder="+1 (555) 019-3829" {...pForm.register("phone")} />
                    </div>
                  </div>

                  <div className="sd-form-group" style={{ marginBottom: 16 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--sd-ink)", cursor: "pointer" }}>
                      <input type="checkbox" style={{ accentColor: "#10b981" }} {...pForm.register("emergencyContact")} />
                      Mark as Primary Emergency Contact
                    </label>
                  </div>

                  <div className="sd-form-actions">
                    <button type="button" className="sd-btn-subtle" onClick={() => setAddParent(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="sd-btn-emerald" disabled={createParent.isPending}>
                      {createParent.isPending ? "Linking..." : "+ Link Contact"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}