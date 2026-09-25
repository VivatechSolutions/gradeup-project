import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  MessageSquare,
  Send,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Search,
  BookOpen,
  Trophy,
  Zap,
  Lightbulb,
  GraduationCap,
  Vote,
  TrendingUp,
  Award,
  Target,
  Star,
  BarChart3,
  HelpCircle,
  CheckCircle2,
  Radio,
  Sparkles,
  X,
  ChevronRight,
  Flame,
  ShieldCheck,
  Smile,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useTheme } from "../hooks/use-theme";
import { useNotificationStore } from "../lib/notification-store";
import FunnyLoader from "../components/ui/FunnyLoader";
import { queryClient } from "../lib/queryClient";
import { buildApiUrl } from "../lib/apiBase";
import Navigation from "../components/navigation";
import { useAuth } from "../hooks/use-auth";
import { badWords } from "../lib/bad-words";
import BlogFeed from "../components/BlogFeed";
import { getStudentAchievements, getStudentDashboard, getStudentLeaderboard } from "../lib/gradeupApi";

// Student Dashboard Assets
import studyRoboImg from "../assets/dashboard/study-robo.png";
import robotWaving from "../assets/dashboard/15_robot_waving.png";
import tomatoHappy from "../assets/dashboard/01_tomato_happy_running.png";
import learningIsland from "../assets/dashboard/07_floating_learning_island.png";
import robotSearch from "../assets/dashboard/11_robot_magnifying_glass.png";

/* ══════════════════════════════════════════════════════════════════════════
   STUDENT DASHBOARD MATCHED STYLES & ANIMATIONS
   ══════════════════════════════════════════════════════════════════════════ */
const communityStyles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

:root {
  --comm-page: #fbfcff;
  --comm-page-2: #f5f7ff;
  --comm-card: #ffffff;
  --comm-card-soft: #f7faff;
  --comm-card-hover: #ffffff;
  --comm-ink: #071235;
  --comm-muted: #68708a;
  --comm-faint: #8c94aa;
  --comm-line: rgba(15, 23, 42, 0.08);
  --comm-shadow: 0 14px 34px rgba(35, 44, 87, 0.09);
  --comm-shadow-soft: 0 7px 20px rgba(35, 44, 87, 0.06);
  --comm-primary: #7b2cff;
  --comm-primary-end: #b948d9;
}

[data-theme="dark"], .dark {
  --comm-page: #080d1f;
  --comm-page-2: #10172d;
  --comm-card: rgba(23, 31, 58, 0.94);
  --comm-card-soft: rgba(31, 42, 76, 0.72);
  --comm-card-hover: rgba(33, 46, 84, 0.98);
  --comm-ink: #f6f7ff;
  --comm-muted: #b5bfd8;
  --comm-faint: #7f8aa7;
  --comm-line: rgba(255, 255, 255, 0.11);
  --comm-shadow: 0 20px 54px rgba(0, 0, 0, 0.42);
  --comm-shadow-soft: 0 12px 30px rgba(0, 0, 0, 0.28);
  --comm-primary: #8b5cf6;
  --comm-primary-end: #d946ef;
}

/* ── Page Root with Ambient Meshes ── */
.comm-page {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  min-height: 100vh;
  color: var(--comm-ink);
  background:
    radial-gradient(circle at 14% 9%, rgba(126, 87, 255, 0.14), transparent 26%),
    radial-gradient(circle at 88% 14%, rgba(255, 171, 64, 0.18), transparent 25%),
    linear-gradient(180deg, var(--comm-page), var(--comm-page-2));
  position: relative;
  overflow-x: hidden;
  transition: background-color 0.3s ease, color 0.3s ease;
}

[data-theme="dark"] .comm-page, .dark .comm-page {
  background:
    radial-gradient(circle at 14% 9%, rgba(126, 87, 255, 0.22), transparent 26%),
    radial-gradient(circle at 88% 14%, rgba(255, 171, 64, 0.14), transparent 25%),
    linear-gradient(180deg, var(--comm-page), var(--comm-page-2));
}

/* Moving Floating Orbs & Sparks (Matching Student Dashboard) */
.comm-page::before, .comm-page::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(0.5px);
  opacity: 0.55;
  animation: commFloatBg 14s ease-in-out infinite alternate;
  z-index: 0;
}
.comm-page::before {
  width: 270px;
  height: 270px;
  left: -80px;
  top: 120px;
  background: radial-gradient(circle, rgba(46, 182, 255, 0.20), transparent 68%);
}
.comm-page::after {
  width: 320px;
  height: 320px;
  right: -100px;
  top: 420px;
  background: radial-gradient(circle, rgba(255, 95, 153, 0.16), transparent 70%);
  animation-delay: -6s;
}

@keyframes commFloatBg {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to   { transform: translate3d(24px, 30px, 0) scale(1.08); }
}
@keyframes commBreathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes commPop3d {
  0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
  50% { transform: translateY(-6px) rotate(3deg) scale(1.04); }
}
@keyframes commPulseSoft {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 91, 255, 0.25); }
  50% { box-shadow: 0 0 0 8px rgba(99, 91, 255, 0); }
}
@keyframes commShine {
  0% { transform: translateX(-140%) rotate(18deg); }
  45%, 100% { transform: translateX(240%) rotate(18deg); }
}
@keyframes commDrift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0); }
  50% { transform: translate3d(16px, -12px, 0) rotate(6deg); }
}
@keyframes commBgWave {
  0%, 100% { transform: translate3d(-2%, 0, 0) rotate(0); }
  50% { transform: translate3d(2%, -2%, 0) rotate(2deg); }
}

.comm-bg-spark {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
  opacity: 0.48;
  animation: commDrift 9s ease-in-out infinite;
}
.comm-bg-spark.s1 {
  left: 54%;
  top: 90px;
  width: 9px;
  height: 9px;
  background: #ffb21d;
  box-shadow: 34px 28px 0 #27b86a, 76px -14px 0 #2389ff;
}
.comm-bg-spark.s2 {
  right: 6%;
  top: 280px;
  width: 7px;
  height: 7px;
  background: #ff4d8d;
  box-shadow: -48px 46px 0 #7e45e8, -86px -18px 0 #00a7c8;
  animation-delay: -3s;
}
.comm-bg-spark.s3 {
  left: 6%;
  bottom: 200px;
  width: 8px;
  height: 8px;
  background: #27b86a;
  box-shadow: 42px -34px 0 #ff791f, 92px 18px 0 #2389ff;
  animation-delay: -5s;
}
.comm-bg-ribbon {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  left: 3%;
  right: 3%;
  top: 160px;
  height: 180px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(35, 137, 255, 0.09), rgba(255, 178, 29, 0.11), rgba(39, 184, 106, 0.09));
  filter: blur(20px);
  opacity: 0.75;
  animation: commBgWave 13s ease-in-out infinite;
}

/* ══════════════════ HERO SECTION ══════════════════ */
.comm-hero-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 20px 24px 0;
  position: relative;
  z-index: 1;
}
.comm-hero {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 26px 32px;
  background: linear-gradient(135deg, #eef8ff 0%, #efffed 48%, #fff5d7 100%);
  border: 1.5px solid rgba(35, 137, 255, 0.18);
  box-shadow: var(--comm-shadow);
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 20px;
  align-items: center;
}
[data-theme="dark"] .comm-hero, .dark .comm-hero {
  background: linear-gradient(135deg, #101b3f 0%, #123326 55%, #392a16 100%);
  border-color: rgba(110, 231, 183, 0.22);
}
.comm-hero::before {
  content: "";
  position: absolute;
  top: -70px;
  right: 15%;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  animation: commBreathe 6s ease-in-out infinite;
  pointer-events: none;
}
.comm-hero::after {
  content: "";
  position: absolute;
  top: -60px;
  bottom: -60px;
  width: 80px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.38), transparent);
  animation: commShine 8s ease-in-out infinite;
  pointer-events: none;
}

.comm-hero-left {
  position: relative;
  z-index: 2;
}
.comm-hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 800;
  color: #10734c;
  background: rgba(16, 115, 76, 0.1);
  padding: 6px 14px;
  border-radius: 999px;
  margin-bottom: 12px;
}
[data-theme="dark"] .comm-hero-chip, .dark .comm-hero-chip {
  color: #7ee7b7;
  background: rgba(126, 231, 183, 0.15);
}

.comm-hero-title {
  font-size: clamp(24px, 3.2vw, 36px);
  line-height: 1.15;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--comm-ink);
  margin-bottom: 8px;
}
.comm-hero-title span {
  background: linear-gradient(135deg, #7b2cff, #2389ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="dark"] .comm-hero-title span, .dark .comm-hero-title span {
  background: linear-gradient(135deg, #a78bfa, #60a5fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.comm-hero-desc {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--comm-muted);
  max-width: 480px;
  margin-bottom: 18px;
}

.comm-hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.comm-hero-primary-btn {
  border: 0;
  border-radius: 14px;
  padding: 11px 20px;
  min-height: 42px;
  background: linear-gradient(135deg, #7b2cff, #b948d9);
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(123, 44, 255, 0.26);
  transition: transform 0.2s, box-shadow 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.comm-hero-primary-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 14px 28px rgba(123, 44, 255, 0.35);
}
.comm-hero-secondary-btn {
  border: 1px solid var(--comm-line);
  border-radius: 14px;
  padding: 10px 18px;
  min-height: 42px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  color: var(--comm-ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
[data-theme="dark"] .comm-hero-secondary-btn, .dark .comm-hero-secondary-btn {
  background: rgba(23, 31, 58, 0.75);
  border-color: rgba(255, 255, 255, 0.15);
}
.comm-hero-secondary-btn:hover {
  transform: translateY(-2px);
  background: var(--comm-card);
  box-shadow: var(--comm-shadow-soft);
}

/* Hero Right: Robot Mascot Showcase */
.comm-hero-right {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}
.comm-hero-art-wrap {
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 36px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(220, 240, 255, 0.75));
  box-shadow: inset 0 -8px 0 rgba(35, 137, 255, 0.12), 0 16px 32px rgba(35, 44, 87, 0.16);
  display: grid;
  place-items: center;
  animation: commBreathe 4.5s ease-in-out infinite;
  flex-shrink: 0;
}
[data-theme="dark"] .comm-hero-art-wrap, .dark .comm-hero-art-wrap {
  background: linear-gradient(145deg, rgba(35, 52, 94, 0.9), rgba(20, 29, 58, 0.8));
  box-shadow: inset 0 -8px 0 rgba(0, 0, 0, 0.3), 0 18px 36px rgba(0, 0, 0, 0.45);
}
.comm-hero-art-img {
  width: 110px;
  height: 110px;
  object-fit: contain;
  filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.2));
}

.comm-hero-stats-panel {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  padding: 14px 18px;
  box-shadow: 0 12px 28px rgba(35, 44, 87, 0.09);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  min-width: 190px;
}
[data-theme="dark"] .comm-hero-stats-panel, .dark .comm-hero-stats-panel {
  background: rgba(18, 26, 52, 0.8);
  border-color: rgba(255, 255, 255, 0.12);
}
.comm-hero-mini-stat b {
  display: block;
  font-size: 20px;
  font-weight: 900;
  color: var(--comm-ink);
  line-height: 1;
}
.comm-hero-mini-stat span {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--comm-muted);
  margin-top: 4px;
}

/* ══════════════════ BODY WRAPPER ══════════════════ */
.comm-body {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px 24px 60px;
  position: relative;
  z-index: 1;
}

/* ── Gamified 4 Stat Cards Row ── */
.comm-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}
.comm-stat-card {
  background: var(--comm-card);
  backdrop-filter: blur(14px);
  border-radius: 20px;
  padding: 16px 18px;
  border: 1px solid var(--comm-line);
  box-shadow: var(--comm-shadow-soft);
  transition: transform 0.22s, box-shadow 0.22s, border-color 0.22s;
  cursor: default;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.comm-stat-card::after {
  content: "";
  position: absolute;
  right: -24px;
  bottom: -24px;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.6;
  transition: transform 0.3s ease;
}
.comm-stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--comm-shadow);
}
.comm-stat-card:hover::after {
  transform: scale(1.3);
}

.comm-stat-card.blue::after   { background: radial-gradient(circle, rgba(35, 137, 255, 0.22), transparent 70%); }
.comm-stat-card.green::after  { background: radial-gradient(circle, rgba(39, 184, 106, 0.22), transparent 70%); }
.comm-stat-card.purple::after { background: radial-gradient(circle, rgba(126, 69, 232, 0.22), transparent 70%); }
.comm-stat-card.amber::after  { background: radial-gradient(circle, rgba(255, 178, 29, 0.24), transparent 70%); }

.comm-stat-card.blue   { border-top: 3.5px solid #2389ff; }
.comm-stat-card.green  { border-top: 3.5px solid #27b86a; }
.comm-stat-card.purple { border-top: 3.5px solid #7e45e8; }
.comm-stat-card.amber  { border-top: 3.5px solid #ffb21d; }

.comm-stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.comm-stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 19px;
  transition: transform 0.2s;
  animation: commPop3d 4.5s ease-in-out infinite;
}
.comm-stat-card:hover .comm-stat-icon {
  transform: scale(1.08) rotate(5deg);
}

.si-blue   { background: rgba(35, 137, 255, 0.12); color: #2389ff; }
.si-green  { background: rgba(39, 184, 106, 0.12); color: #27b86a; }
.si-purple { background: rgba(126, 69, 232, 0.12); color: #7e45e8; }
.si-amber  { background: rgba(255, 178, 29, 0.14); color: #ff9800; }

.comm-stat-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 999px;
  color: var(--comm-muted);
  background: var(--comm-card-soft);
  border: 1px solid var(--comm-line);
}
.comm-stat-num {
  font-size: 26px;
  font-weight: 900;
  color: var(--comm-ink);
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 4px;
}
.comm-stat-label {
  font-size: 12.5px;
  color: var(--comm-muted);
  font-weight: 700;
}

/* ── Tab Navigation Bar ── */
.comm-tabs-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}
.comm-tabs-bar {
  display: inline-flex;
  gap: 6px;
  background: var(--comm-card);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  padding: 6px;
  border: 1px solid var(--comm-line);
  box-shadow: var(--comm-shadow-soft);
  overflow-x: auto;
  max-width: 100%;
}
.comm-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;
  color: var(--comm-muted);
  white-space: nowrap;
}
.comm-tab:hover {
  background: var(--comm-card-soft);
  color: var(--comm-ink);
}
.comm-tab.active {
  background: linear-gradient(135deg, #7b2cff, #b948d9);
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(123, 44, 255, 0.32);
}

/* ── Feed 3-Column Layout ── */
.comm-feed-layout {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr) 290px;
  gap: 20px;
  align-items: start;
}

/* ── Standard Card Styling ── */
.comm-card {
  background: var(--comm-card);
  backdrop-filter: blur(14px);
  border-radius: 22px;
  border: 1px solid var(--comm-line);
  box-shadow: var(--comm-shadow-soft);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  position: relative;
}
.comm-card:hover {
  border-color: rgba(123, 44, 255, 0.18);
  box-shadow: var(--comm-shadow);
}
.comm-card-header {
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--comm-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, var(--comm-card-soft), transparent);
}
.comm-card-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--comm-ink);
  display: flex;
  align-items: center;
  gap: 8px;
}
.comm-card-body {
  padding: 18px 20px;
}

/* ── Post Creation Card (Center) ── */
.comm-composer-card {
  margin-bottom: 18px;
  background: var(--comm-card);
  border-radius: 22px;
  border: 1.5px solid var(--comm-line);
  box-shadow: var(--comm-shadow-soft);
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
}
.comm-composer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.comm-composer-avatar {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: linear-gradient(135deg, #7b2cff, #2389ff);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 900;
  font-size: 16px;
  box-shadow: 0 6px 14px rgba(123, 44, 255, 0.24);
  flex-shrink: 0;
}
.comm-composer-meta b {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: var(--comm-ink);
}
.comm-composer-meta span {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--comm-muted);
}

.comm-type-pill-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 12px;
}
.comm-type-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 12px;
  border: 1px solid var(--comm-line);
  background: var(--comm-card-soft);
  color: var(--comm-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.comm-type-pill:hover {
  border-color: #7b2cff;
  color: #7b2cff;
}
.comm-type-pill.active {
  background: rgba(123, 44, 255, 0.12);
  border-color: #7b2cff;
  color: #7b2cff;
  font-weight: 800;
}
[data-theme="dark"] .comm-type-pill.active, .dark .comm-type-pill.active {
  background: rgba(139, 92, 246, 0.24);
  border-color: #a78bfa;
  color: #c4b5fd;
}

.comm-post-textarea {
  width: 100%;
  border-radius: 16px;
  border: 1.5px solid var(--comm-line);
  padding: 14px 16px;
  font-size: 14px;
  font-family: inherit;
  color: var(--comm-ink);
  resize: none;
  outline: none;
  background: var(--comm-card-soft);
  min-height: 96px;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.comm-post-textarea:focus {
  border-color: #7b2cff;
  background: var(--comm-card);
  box-shadow: 0 0 0 4px rgba(123, 44, 255, 0.12);
}

.comm-composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  flex-wrap: wrap;
  gap: 10px;
}
.comm-composer-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}
.comm-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid var(--comm-line);
  background: var(--comm-card-soft);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--comm-muted);
  cursor: pointer;
  transition: all 0.18s;
  font-family: inherit;
}
.comm-tool-btn:hover {
  border-color: #7b2cff;
  color: #7b2cff;
  background: rgba(123, 44, 255, 0.08);
}
.comm-visibility-select {
  padding: 7px 12px;
  border-radius: 12px;
  border: 1px solid var(--comm-line);
  background: var(--comm-card-soft);
  font-size: 12px;
  font-weight: 700;
  color: var(--comm-ink);
  outline: none;
  cursor: pointer;
  font-family: inherit;
}
.comm-submit-btn {
  padding: 9px 22px;
  background: linear-gradient(135deg, #7b2cff, #b948d9);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.18s, box-shadow 0.18s;
  box-shadow: 0 6px 16px rgba(123, 44, 255, 0.32);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.comm-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(123, 44, 255, 0.42);
}
.comm-submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

/* ── Filter & Search Bar ── */
.comm-filter-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.comm-search-bar {
  position: relative;
  flex: 1;
  min-width: 200px;
}
.comm-search-bar input {
  width: 100%;
  height: 44px;
  border-radius: 14px;
  border: 1.5px solid var(--comm-line);
  padding: 0 16px 0 42px;
  font-size: 13.5px;
  font-family: inherit;
  outline: none;
  background: var(--comm-card);
  color: var(--comm-ink);
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.comm-search-bar input:focus {
  border-color: #7b2cff;
  box-shadow: 0 0 0 3.5px rgba(123, 44, 255, 0.1);
}
.comm-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--comm-faint);
  width: 17px;
  height: 17px;
  pointer-events: none;
}
.comm-filter-select {
  height: 44px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1.5px solid var(--comm-line);
  background: var(--comm-card);
  font-size: 13px;
  font-weight: 700;
  color: var(--comm-ink);
  outline: none;
  cursor: pointer;
  font-family: inherit;
}

/* ── Post Feed Cards ── */
.comm-post-card {
  background: var(--comm-card);
  border-radius: 22px;
  border: 1px solid var(--comm-line);
  box-shadow: var(--comm-shadow-soft);
  padding: 20px 22px;
  margin-bottom: 16px;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  position: relative;
}
.comm-post-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--comm-shadow);
  border-color: rgba(123, 44, 255, 0.2);
}
.comm-post-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.comm-post-author-avatar {
  width: 42px;
  height: 42px;
  border-radius: 15px;
  background: linear-gradient(135deg, #7b2cff, #2389ff);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 900;
  font-size: 15px;
  flex-shrink: 0;
  box-shadow: 0 6px 14px rgba(35, 44, 87, 0.12);
}
.comm-post-author-info b {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: var(--comm-ink);
}
.comm-post-time {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--comm-muted);
  margin-left: auto;
}

/* Category Badge Pills */
.comm-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  text-transform: capitalize;
  letter-spacing: 0.01em;
}
.comm-badge.discussion {
  background: rgba(123, 44, 255, 0.12);
  color: #7b2cff;
}
.comm-badge.question {
  background: rgba(35, 137, 255, 0.12);
  color: #2389ff;
}
.comm-badge.achievement {
  background: rgba(255, 178, 29, 0.14);
  color: #d97706;
}
.comm-badge.study_tip {
  background: rgba(39, 184, 106, 0.14);
  color: #059669;
}
.comm-badge.session_card {
  background: rgba(255, 77, 141, 0.14);
  color: #e11d48;
}
[data-theme="dark"] .comm-badge.discussion, .dark .comm-badge.discussion {
  background: rgba(139, 92, 246, 0.22);
  color: #c4b5fd;
}
[data-theme="dark"] .comm-badge.question, .dark .comm-badge.question {
  background: rgba(59, 130, 246, 0.22);
  color: #93c5fd;
}
[data-theme="dark"] .comm-badge.achievement, .dark .comm-badge.achievement {
  background: rgba(245, 158, 11, 0.22);
  color: #fcd34d;
}
[data-theme="dark"] .comm-badge.study_tip, .dark .comm-badge.study_tip {
  background: rgba(16, 185, 129, 0.22);
  color: #6ee7b7;
}
[data-theme="dark"] .comm-badge.session_card, .dark .comm-badge.session_card {
  background: rgba(244, 63, 94, 0.22);
  color: #fda4af;
}

.comm-post-content {
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--comm-ink);
  margin-bottom: 14px;
  font-weight: 500;
  word-break: break-word;
}

.comm-post-reactions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--comm-line);
}
.comm-reaction-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--comm-muted);
  background: transparent;
  border: 1px solid transparent;
  padding: 6px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.16s;
  font-family: inherit;
}
.comm-reaction-btn:hover {
  background: var(--comm-card-soft);
  color: #7b2cff;
  border-color: var(--comm-line);
}
.comm-reaction-btn.liked {
  color: #e11d48;
  background: rgba(225, 29, 72, 0.08);
}
.comm-reaction-btn.liked svg {
  fill: #e11d48;
}

/* ── Expanded Comments ── */
.comm-comments-area {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--comm-line);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.comm-comment-bubble {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.comm-comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2389ff, #7b2cff);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}
.comm-comment-body {
  flex: 1;
  background: var(--comm-card-soft);
  border: 1px solid var(--comm-line);
  border-radius: 14px;
  padding: 10px 14px;
}
.comm-comment-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}
.comm-comment-author {
  font-size: 12.5px;
  font-weight: 800;
  color: var(--comm-ink);
}
.comm-comment-time {
  font-size: 11px;
  color: var(--comm-faint);
  font-weight: 600;
}
.comm-comment-text {
  font-size: 13px;
  color: var(--comm-ink);
  line-height: 1.45;
}

.comm-comment-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
}
.comm-comment-input {
  flex: 1;
  height: 40px;
  border-radius: 12px;
  border: 1.5px solid var(--comm-line);
  padding: 0 14px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  background: var(--comm-card-soft);
  color: var(--comm-ink);
  transition: border-color 0.2s;
}
.comm-comment-input:focus {
  border-color: #7b2cff;
  background: var(--comm-card);
}
.comm-comment-send-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7b2cff, #b948d9);
  color: #fff;
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform 0.16s;
  flex-shrink: 0;
}
.comm-comment-send-btn:hover {
  transform: scale(1.06);
}

/* ── Embedded Live Session Card ── */
.comm-session-pass {
  border-radius: 16px;
  overflow: hidden;
  margin: 12px 0 14px;
  border: 1.5px solid var(--comm-line);
  background: var(--comm-card-soft);
  box-shadow: 0 6px 18px rgba(35, 44, 87, 0.05);
}
.comm-session-pass-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--comm-line);
}
.comm-session-pass-body {
  padding: 14px 16px;
}
.comm-session-pass-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--comm-ink);
  margin-bottom: 4px;
}
.comm-session-pass-creator {
  font-size: 12px;
  color: var(--comm-muted);
  font-weight: 600;
}
.comm-session-pass-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--comm-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.comm-session-btn {
  padding: 8px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #27b86a, #2389ff);
  color: #fff;
  font-size: 12.5px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.18s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.comm-session-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(39, 184, 106, 0.3);
}

/* ── Interactive Polls (Left Rail) ── */
.comm-poll-card {
  background: var(--comm-card-soft);
  border-radius: 16px;
  border: 1.5px solid var(--comm-line);
  padding: 16px;
  margin-bottom: 14px;
  transition: border-color 0.2s;
}
.comm-poll-card:hover {
  border-color: rgba(123, 44, 255, 0.25);
}
.comm-poll-q {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--comm-ink);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.comm-poll-opt-btn {
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 8px;
  border-radius: 12px;
  border: 1.5px solid var(--comm-line);
  background: var(--comm-card);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--comm-ink);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  text-align: left;
}
.comm-poll-opt-btn:hover:not(:disabled) {
  border-color: #7b2cff;
  background: rgba(123, 44, 255, 0.05);
  color: #7b2cff;
}
.comm-poll-opt-btn:disabled {
  cursor: default;
}
.comm-poll-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: rgba(123, 44, 255, 0.12);
  border-radius: inherit;
  pointer-events: none;
  transition: width 0.4s ease;
}
[data-theme="dark"] .comm-poll-progress-fill, .dark .comm-poll-progress-fill {
  background: rgba(139, 92, 246, 0.2);
}
.comm-poll-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--comm-muted);
  margin-top: 6px;
}

/* ── Trending Topics (Right Rail) ── */
.comm-topic-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.18s;
  margin-bottom: 6px;
  border: 1px solid transparent;
}
.comm-topic-item:hover {
  background: var(--comm-card-soft);
  border-color: var(--comm-line);
  transform: translateX(3px);
}
.comm-topic-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(255, 121, 31, 0.12);
  color: #ff791f;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.comm-topic-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--comm-ink);
}
.comm-topic-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--comm-muted);
  margin-top: 1px;
}
.comm-topic-arrow {
  margin-left: auto;
  color: var(--comm-faint);
}

/* ── Badges Showcase ── */
.comm-badge-tile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--comm-card-soft);
  border: 1px solid var(--comm-line);
  margin-bottom: 8px;
  transition: transform 0.2s;
}
.comm-badge-tile:hover {
  transform: translateY(-2px);
}
.comm-badge-shape {
  width: 38px;
  height: 42px;
  clip-path: polygon(50% 0, 93% 20%, 93% 72%, 50% 100%, 7% 72%, 7% 20%);
  background: linear-gradient(135deg, #ffb21d, #ff791f);
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 18px;
  box-shadow: 0 4px 10px rgba(255, 121, 31, 0.28);
}
.comm-badge-info b {
  display: block;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--comm-ink);
}
.comm-badge-info span {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--comm-muted);
}

/* ── Messaging Tab Layout ── */
.comm-msg-container {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  gap: 18px;
  height: 68vh;
  min-height: 480px;
}
.comm-chat-channel-list {
  background: var(--comm-card);
  border-radius: 22px;
  border: 1px solid var(--comm-line);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.comm-chat-main-area {
  background: var(--comm-card);
  border-radius: 22px;
  border: 1px solid var(--comm-line);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ══════════════════ RESPONSIVENESS ══════════════════ */
@media (max-width: 1200px) {
  .comm-feed-layout {
    grid-template-columns: 260px minmax(0, 1fr) 260px;
  }
}

@media (max-width: 1040px) {
  .comm-hero {
    grid-template-columns: 1fr;
  }
  .comm-hero-right {
    justify-content: flex-start;
  }
  .comm-feed-layout {
    grid-template-columns: 1fr;
  }
  .comm-feed-left, .comm-feed-right {
    order: 2;
  }
  .comm-feed-center {
    order: 1;
  }
}

@media (max-width: 768px) {
  .comm-hero-container {
    padding: 14px 16px 0;
  }
  .comm-hero {
    padding: 20px 18px;
    border-radius: 18px;
  }
  .comm-body {
    padding: 16px 16px 40px;
  }
  .comm-stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .comm-msg-container {
    grid-template-columns: 1fr;
    height: auto;
  }
  .comm-hero-stats-panel {
    display: none;
  }
}

@media (max-width: 480px) {
  .comm-hero-title {
    font-size: 22px;
  }
  .comm-stat-card {
    padding: 12px 14px;
  }
  .comm-stat-num {
    font-size: 20px;
  }
}
`;

/* ── Content Moderation Helper ── */
const moderateContent = (content: string) => {
  const lowerCaseContent = content.toLowerCase();
  return badWords.some((word) => lowerCaseContent.includes(word));
};

interface TrendingTopic {
  id: string;
  title: string;
  posts: number;
  icon?: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

function communitySessionStatus(card: any) {
  const status = String(card?.status || "waiting").toLowerCase();
  if (status === "cancelled" || status === "canceled") return "Meeting was cancelled";
  if (status === "completed" || status === "ended" || status === "ending" || status === "end_error") return "Meeting has ended";
  if (card?.sessionType === "seminar" && status === "active") return "Join Seminar";
  if (status === "active" || status === "waiting_for_ai") return "Debate already started";
  return card?.sessionType === "seminar" ? "Join Seminar" : "Join Debate";
}

function communitySessionJoinable(card: any) {
  const status = String(card?.status || "waiting").toLowerCase();
  if (["completed", "ended", "ending", "end_error", "cancelled", "canceled"].includes(status)) return false;
  if (card?.sessionType === "seminar") return status === "waiting" || status === "active";
  return status === "waiting";
}

interface CommunityPoll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVoted: boolean;
  icon?: string;
}

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profileImage?: string;
}

interface Group {
  id: string;
  name: string;
  members: number[];
  messages: any[];
}

interface Channel {
  id: string;
  name: string;
  groups: Group[];
}

/* ══════════════════════════════════════════════════════════════════════════
   LIVE SESSION PASS COMPONENT (Seminars & Debates)
   ══════════════════════════════════════════════════════════════════════════ */
function CommunitySessionCard({ card }: { card: any }) {
  const [liveCard, setLiveCard] = useState(card || {});

  useEffect(() => {
    setLiveCard(card);
  }, [card]);

  useEffect(() => {
    if (!card?.sessionId) return;
    let closed = false;
    const load = async () => {
      try {
        const path =
          card.sessionType === "seminar"
            ? `/api/v1/seminar/session/${encodeURIComponent(card.sessionId)}`
            : `/api/v1/debate/room/${encodeURIComponent(card.sessionId)}`;
        const response = await fetch(buildApiUrl(path), { credentials: "include" });
        const payload = await response.json().catch(() => null);
        const snapshot = payload?.data || payload || {};
        const live = snapshot.liveSession || snapshot;
        if (!closed) {
          setLiveCard((previous: any) => ({
            ...previous,
            accessError: undefined,
            status: live?.status || previous.status,
            participantCount: Array.isArray(live?.participants)
              ? live.participants.filter((item: any) => !item.isAi).length
              : previous.participantCount,
          }));
        }
      } catch (error: any) {
        if (!closed) {
          setLiveCard((previous: any) => ({
            ...previous,
            accessError: error?.message || "You do not have access to this session.",
          }));
        }
      }
    };
    load();
    const timer = window.setInterval(load, 6000);
    return () => {
      closed = true;
      window.clearInterval(timer);
    };
  }, [card?.sessionId, card?.sessionType]);

  if (!card) return null;

  const status = String(liveCard?.status || "waiting").toLowerCase();
  const isCompleted = status === "completed" || status === "ended";
  const isActive = status === "active";
  const joinable = !liveCard?.accessError && communitySessionJoinable(liveCard);
  const label = liveCard?.accessError || communitySessionStatus(liveCard);
  const joinUrl = liveCard.joinUrl
    ? /^https?:\/\//i.test(liveCard.joinUrl)
      ? liveCard.joinUrl
      : `${window.location.origin}${liveCard.joinUrl.startsWith("/") ? liveCard.joinUrl : `/${liveCard.joinUrl}`}`
    : "";

  return (
    <div className="comm-session-pass">
      <div className="comm-session-pass-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="comm-badge session_card">
            <Radio size={12} className="animate-pulse" />
            {liveCard.sessionType === "seminar" ? "Live Seminar" : "Student Debate"}
          </span>
          {isActive && (
            <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              Active Now
            </span>
          )}
        </div>
        <span style={{ fontSize: 11.5, color: "var(--comm-muted)", fontWeight: 700 }}>
          <Users size={12} style={{ display: "inline", marginRight: 4 }} />
          {liveCard.participantCount || 0} learners
        </span>
      </div>

      <div className="comm-session-pass-body">
        <div className="comm-session-pass-title">{liveCard.topic || liveCard.title || "Live Group Session"}</div>
        <div className="comm-session-pass-creator">
          Hosted by <strong style={{ color: "var(--comm-ink)" }}>{liveCard.createdBy || "GradeUp Educator"}</strong>
        </div>
      </div>

      <div className="comm-session-pass-footer">
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--comm-muted)" }}>
          {isCompleted ? "Session Concluded" : "Interactive Audio & Whiteboard"}
        </span>
        {joinable ? (
          <button
            className="comm-session-btn"
            onClick={() => {
              if (joinUrl) window.location.href = joinUrl;
            }}
          >
            Join Live Room <ArrowRight size={13} />
          </button>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--comm-muted)" }}>
            {isCompleted ? "Closed" : "In Progress"}
          </span>
        )}
      </div>
      {joinable ? (
        <button className="comm-reaction-btn" style={{ width: "100%", justifyContent: "center", borderRadius: 0, border: "none", borderTop: "1px solid #e2e8f0" }} onClick={() => { if (joinUrl) window.open(joinUrl, "_blank", "noopener,noreferrer"); }}>
          {label}
        </button>
      ) : (
        <div style={{ padding: 11, textAlign: "center", fontSize: 13, fontWeight: 800, color: "#475569", borderTop: "1px solid #e2e8f0" }}>{label}</div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMMUNITY PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
export default function CommunityPage() {
  const { addNotification } = useNotificationStore();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState("feed");
  const [selectedConversation, setSelectedConversation] = useState<string | number | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState("discussion");
  const [postVisibility, setPostVisibility] = useState<"all" | "school">("all");
  const [contentFilter, setContentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showComments, setShowComments] = useState<{ [k: number]: boolean }>({});
  const [commentTexts, setCommentTexts] = useState<{ [k: number]: string }>({});
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [likedPosts, setLikedPosts] = useState<{ [id: number]: boolean }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // Poll creation states
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState<string[]>(["", ""]);
  const [showPollCreationForm, setShowPollCreationForm] = useState(false);

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);

  const { userHeader } = useAuth();
  const [currentRole, setCurrentRole] = useState("student");
  useEffect(() => {
    if (userHeader?.role) setCurrentRole(userHeader.role);
  }, [userHeader]);

  // Data Queries
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<any[]>({
    queryKey: ["/api/community/posts"],
  });
  const { data: polls = [], isLoading: isLoadingPolls } = useQuery<CommunityPoll[]>({
    queryKey: ["/api/community/polls"],
  });
  const { data: trendingTopics = [] } = useQuery<TrendingTopic[]>({
    queryKey: ["/api/community/trending-topics"],
  });
  const { data: privateMessages } = useQuery<any[]>({ queryKey: ["/api/community/messages"] });
  const { data: dashboard } = useQuery<any>({ queryKey: ["/api/v1/student/dashboard", "community"], queryFn: getStudentDashboard });
  const { data: cohortLeaderboard, isLoading: isLoadingLeaderboard } = useQuery<any>({ queryKey: ["/api/v1/student/leaderboard", "community"], queryFn: () => getStudentLeaderboard("week") });
  const { data: badges = [] } = useQuery<any[]>({ queryKey: ["/api/v1/student/achievements", "community"], queryFn: getStudentAchievements });
  const classmates = cohortLeaderboard?.entries || [];
  const leaderboard = cohortLeaderboard?.entries || [];
  const communityPoints = Number(dashboard?.stats?.totalPoints || 0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [privateMessages, selectedConversation]);

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(buildApiUrl("/api/community/posts"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed to create post");
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      setPostContent("");
      setAttachedFile(null);
      addNotification(`New post shared: "${data?.content?.substring(0, 24) || "Discussion"}..."`);
      toast({ title: "Post published to community! 🚀" });
    },
    onError: () => toast({ title: "Failed to publish post", variant: "destructive" }),
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const r = await fetch(buildApiUrl(`/api/community/posts/${postId}/like`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error("Failed to like");
      return r.json();
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
    },
  });

  const commentPostMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      const r = await fetch(buildApiUrl(`/api/community/posts/${postId}/comments`), {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ content }),
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error("Failed to comment");
      return r.json();
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      setCommentTexts((p) => ({ ...p, [vars.postId]: "" }));
      addNotification(`New reply on community post`);
      toast({ title: "Comment posted! 💬" });
    },
  });

  const createPollMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(buildApiUrl("/api/community/polls"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed to create poll");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/polls"] });
      setNewPollQuestion("");
      setNewPollOptions(["", ""]);
      setShowPollCreationForm(false);
      toast({ title: "Poll launched successfully! 🗳️" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const r = await fetch(buildApiUrl(`/api/community/posts/${postId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      toast({ title: "Post deleted" });
    },
    onError: () => toast({ title: "Unable to delete post" }),
  });

  const votePollMutation = useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      const r = await fetch(buildApiUrl(`/api/community/polls/${pollId}/options/${optionId}/vote`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error("Failed to cast vote");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/polls"] });
      toast({ title: "Vote recorded! Thanks for participating 🌟" });
    },
    onError: () => toast({ title: "Unable to submit vote", variant: "destructive" }),
  });

  const createPrivateMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(buildApiUrl("/api/community/messages"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/messages"] });
      setMessageContent("");
      addNotification(`New direct message sent`);
    },
  });

  const createGroupMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(buildApiUrl("/api/community/group-messages"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/group-messages"] });
      setMessageContent("");
      addNotification(`Group message sent`);
    },
  });

  const sendMessage = () => {
    if (moderateContent(messageContent)) {
      toast({ title: "Please keep discussions helpful and respectful." });
      return;
    }
    if (!messageContent.trim() || !selectedConversation) return;
    const data = { content: messageContent.trim(), courseId: 27, messageType: "text" };
    if (selectedConversation === "group") {
      createGroupMessageMutation.mutate(data);
    } else if (typeof selectedConversation === "string" && selectedConversation.startsWith("group_")) {
      const newMsg = {
        id: `msg_${Date.now()}`,
        senderId: user?.id,
        content: messageContent.trim(),
        createdAt: new Date().toISOString(),
        sender: { firstName: user?.firstName, lastName: user?.lastName },
      };
      setChannels((prev) =>
        prev.map((c) => ({
          ...c,
          groups: c.groups.map((g) => (g.id === selectedConversation ? { ...g, messages: [...g.messages, newMsg] } : g)),
        }))
      );
      setMessageContent("");
    } else {
      createPrivateMessageMutation.mutate({ ...data, receiverId: selectedConversation });
    }
  };

  const handleCreatePost = () => {
    if (moderateContent(postContent)) {
      toast({ title: "Please keep your post respectful and academic." });
      return;
    }
    if (!postContent.trim()) {
      toast({ title: "Please write something before posting!" });
      return;
    }
    createPostMutation.mutate({
      content: postContent.trim(),
      type: postType,
      visibility: postVisibility,
      courseId: 27,
    });
  };

  const handleCreatePoll = () => {
    const validOpts = newPollOptions.filter((o) => o.trim());
    if (!newPollQuestion.trim() || validOpts.length < 2) {
      toast({ title: "Please provide a question and at least 2 options." });
      return;
    }
    createPollMutation.mutate({
      question: newPollQuestion.trim(),
      options: validOpts,
      visibility: postVisibility,
    });
  };

  const handleSharePost = (post: any) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/community#post-${post.id}`);
      toast({ title: "Post link copied to clipboard! 📋" });
    }
  };

  const scrollToComposer = (type?: string) => {
    if (type) setPostType(type);
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Filtered post list
  const filteredPosts = useMemo(() => {
    if (!Array.isArray(posts)) return [];
    return posts.filter((p: any) => {
      const matchesSearch = !searchTerm || p.content?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = contentFilter === "all" || p.type === contentFilter;
      return matchesSearch && matchesFilter;
    });
  }, [posts, searchTerm, contentFilter]);

  // Tab definitions
  const tabs = [
    { id: "feed", label: "Community Feed", icon: <MessageSquare size={16} /> },
    { id: "polls", label: "Student Polls", icon: <Vote size={16} /> },
    // { id: "leaderboard", label: "Class Leaderboard", icon: <Trophy size={16} /> },
    // { id: "messaging", label: "Study Groups", icon: <Users size={16} /> },
    // { id: "blogs", label: "Student Blogs", icon: <BookOpen size={16} /> },
  ];

  // Stat Mini-Cards
  const statCards = [
    {
      label: "Active Posts",
      value: posts?.length ?? 0,
      badge: "Community",
      cls: "blue",
      icon: <MessageSquare size={19} />,
      si: "si-blue",
    },
    {
      label: "My Points",
      value: communityPoints,
      badge: cohortLeaderboard?.currentUser?.rank ? `Rank #${cohortLeaderboard.currentUser.rank}` : "Unranked",
      cls: "green",
      icon: <Award size={19} />,
      si: "si-green",
    },
    {
      label: "Study Peers",
      value: classmates.length,
      badge: "Online",
      cls: "purple",
      icon: <Users size={19} />,
      si: "si-purple",
    },
    {
      label: "Badges Earned",
      value: badges.filter((badge: any) => badge.unlocked).length,
      badge: "Mastery",
      cls: "amber",
      icon: <Star size={19} />,
      si: "si-amber",
    },
  ];

  // Post Type Choices
  const postTypes = [
    { id: "discussion", label: "Discussion 💬", icon: <MessageSquare size={13} /> },
    { id: "question", label: "Doubt / Help ❓", icon: <HelpCircle size={13} /> },
    { id: "achievement", label: "Achievement 🏆", icon: <Trophy size={13} /> },
    { id: "study_tip", label: "Study Tip 💡", icon: <Lightbulb size={13} /> },
    { id: "session_card", label: "Live Room 🎙️", icon: <Radio size={13} /> },
  ];

  return (
    <>
      <style>{communityStyles}</style>
      <div className="comm-page">
        {/* Navigation Bar */}
        <Navigation currentRole={currentRole} onRoleChange={setCurrentRole} />

        {/* Floating Ambient Sparks & Ribbon */}
        <span className="comm-bg-ribbon" aria-hidden="true" />
        <span className="comm-bg-spark s1" aria-hidden="true" />
        <span className="comm-bg-spark s2" aria-hidden="true" />
        <span className="comm-bg-spark s3" aria-hidden="true" />

        {/* ══════════════════ HERO BANNER ══════════════════ */}
        <div className="comm-hero-container">
          <motion.div
            className="comm-hero"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="comm-hero-left">
              <div className="comm-hero-chip">
                <Sparkles size={14} /> GRADEUP STUDENT LOUNGE 🚀
              </div>
              <h1 className="comm-hero-title">
                Learn, Connect & <span>Grow Together</span>
              </h1>
              <p className="comm-hero-desc">
                Ask tough questions, discuss chapters with friends, share your exam achievements, and collaborate in real-time study sessions!
              </p>
              <div className="comm-hero-actions">
                <button className="comm-hero-primary-btn" onClick={() => scrollToComposer("discussion")}>
                  <Plus size={16} /> Share a Thought
                </button>
                <button className="comm-hero-secondary-btn" onClick={() => scrollToComposer("question")}>
                  <HelpCircle size={16} style={{ color: "#2389ff" }} /> Ask a Doubt
                </button>
                <button className="comm-hero-secondary-btn" onClick={() => setActiveTab("polls")}>
                  <Vote size={16} style={{ color: "#7b2cff" }} /> Live Polls
                </button>
              </div>
            </div>

            <div className="comm-hero-right">
              <div className="comm-hero-stats-panel">
                <div className="comm-hero-mini-stat">
                  <b>{posts?.length || 18}</b>
                  <span>Total Posts</span>
                </div>
                <div className="comm-hero-mini-stat">
                  <b>{communityPoints}</b>
                  <span>XP Points</span>
                </div>
                <div className="comm-hero-mini-stat">
                  <b>{classmates.length}</b>
                  <span>Classmates</span>
                </div>
                <div className="comm-hero-mini-stat">
                  <b>{badges.filter((badge: any) => badge.unlocked).length}</b>
                  <span>Badges</span>
                </div>
              </div>

              <div className="comm-hero-art-wrap">
                <img src={studyRoboImg} alt="GradeUp Mascot" className="comm-hero-art-img" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══════════════════ BODY CONTENT ══════════════════ */}
        <div className="comm-body">
          {/* 4 Gamified Stat Cards */}
          <div className="comm-stats-row">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                className={`comm-stat-card ${stat.cls}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.06 }}
              >
                <div className="comm-stat-top">
                  <div className={`comm-stat-icon ${stat.si}`}>{stat.icon}</div>
                  <span className="comm-stat-badge">{stat.badge}</span>
                </div>
                <div className="comm-stat-num">{stat.value}</div>
                <div className="comm-stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Tab Navigation Pill Bar */}
          <div className="comm-tabs-wrap">
            <div className="comm-tabs-bar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`comm-tab ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {activeTab === "feed" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--comm-muted)" }}>
                  Showing: <strong style={{ color: "var(--comm-ink)" }}>{filteredPosts.length} posts</strong>
                </span>
              </div>
            )}
          </div>

          {/* ══════════════════ FEED TAB ══════════════════ */}
          {activeTab === "feed" && (
            <div className="comm-feed-layout">
              {/* ── LEFT RAIL: Polls & Quick Helpers ── */}
              <div className="comm-feed-left">
                {/* Community Polls Card */}
                <div className="comm-card" style={{ marginBottom: 18 }}>
                  <div className="comm-card-header">
                    <div className="comm-card-title">
                      <Vote size={17} style={{ color: "#7b2cff" }} /> Student Polls
                    </div>
                    <button
                      onClick={() => setShowPollCreationForm(!showPollCreationForm)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#7b2cff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <Plus size={14} /> {showPollCreationForm ? "Close" : "New Poll"}
                    </button>
                  </div>

                  <div className="comm-card-body" style={{ maxHeight: 460, overflowY: "auto" }}>
                    {/* Poll Creator Form */}
                    <AnimatePresence>
                      {showPollCreationForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{
                            marginBottom: 16,
                            padding: 14,
                            borderRadius: 14,
                            background: "var(--comm-card-soft)",
                            border: "1.5px solid var(--comm-line)",
                          }}
                        >
                          <input
                            placeholder="What do you want to ask?"
                            value={newPollQuestion}
                            onChange={(e) => setNewPollQuestion(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              borderRadius: 10,
                              border: "1.5px solid var(--comm-line)",
                              fontSize: 13,
                              marginBottom: 8,
                              background: "var(--comm-card)",
                              color: "var(--comm-ink)",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                          {newPollOptions.map((opt, i) => (
                            <input
                              key={i}
                              placeholder={`Option ${i + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const next = [...newPollOptions];
                                next[i] = e.target.value;
                                setNewPollOptions(next);
                              }}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1.5px solid var(--comm-line)",
                                fontSize: 12.5,
                                marginBottom: 6,
                                background: "var(--comm-card)",
                                color: "var(--comm-ink)",
                                outline: "none",
                                boxSizing: "border-box",
                              }}
                            />
                          ))}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                            <button
                              onClick={() => setNewPollOptions([...newPollOptions, ""])}
                              style={{
                                fontSize: 12,
                                color: "#7b2cff",
                                fontWeight: 700,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              + Add Option
                            </button>
                            <button
                              className="comm-submit-btn"
                              style={{ padding: "6px 14px", fontSize: 12 }}
                              onClick={handleCreatePoll}
                              disabled={createPollMutation.isPending}
                            >
                              {createPollMutation.isPending ? "Creating..." : "Launch Poll"}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isLoadingPolls ? (
                      <FunnyLoader text="Loading polls..." />
                    ) : polls.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "20px 10px",
                          color: "var(--comm-muted)",
                          fontSize: 12.5,
                        }}
                      >
                        <Vote size={26} style={{ margin: "0 auto 6px", opacity: 0.5 }} />
                        No active polls right now. Be the first to start one!
                      </div>
                    ) : (
                      polls.map((poll) => {
                        const totalVotes = poll.totalVotes || poll.options?.reduce((a, b) => a + (b.votes || 0), 0) || 1;
                        return (
                          <div key={poll.id} className="comm-poll-card">
                            <div className="comm-poll-q">
                              <BarChart3 size={15} style={{ color: "#7b2cff", flexShrink: 0 }} />
                              {poll.question}
                            </div>
                            {poll.options.map((opt) => {
                              const pct = Math.round(((opt.votes || 0) / totalVotes) * 100);
                              return (
                                <button
                                  key={opt.id}
                                  className="comm-poll-opt-btn"
                                  onClick={() => votePollMutation.mutate({ pollId: poll.id, optionId: opt.id })}
                                  disabled={poll.userVoted || votePollMutation.isPending}
                                >
                                  {poll.userVoted && (
                                    <span className="comm-poll-progress-fill" style={{ width: `${pct}%` }} />
                                  )}
                                  <span style={{ position: "relative", zIndex: 1 }}>{opt.text}</span>
                                  <span style={{ position: "relative", zIndex: 1, fontSize: 11.5, color: "var(--comm-muted)" }}>
                                    {poll.userVoted ? `${pct}% (${opt.votes || 0})` : `${opt.votes || 0}`}
                                  </span>
                                </button>
                              );
                            })}
                            <div className="comm-poll-footer">
                              <span>{poll.totalVotes || 0} total votes</span>
                              {poll.userVoted && (
                                <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 3 }}>
                                  <CheckCircle2 size={12} /> Voted
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Daily Motivation Mascot Card */}
                <div
                  className="comm-card"
                  style={{
                    background: "linear-gradient(135deg, rgba(255, 178, 29, 0.12), rgba(39, 184, 106, 0.12))",
                    border: "1.5px solid rgba(255, 178, 29, 0.25)",
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={tomatoHappy}
                      alt="Encouragement"
                      style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0, animation: "commBreathe 4s infinite" }}
                    />
                    <div>
                      <b style={{ display: "block", fontSize: 13.5, color: "var(--comm-ink)" }}>Study Streak Tip 🔥</b>
                      <span style={{ fontSize: 12, color: "var(--comm-muted)", lineHeight: 1.4 }}>
                        Helping a peer answer a question reinforces 90% of what you studied today!
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── CENTER FEED: Create Post & Post Stream ── */}
              <div className="comm-feed-center">
                {/* Interactive Composer Box */}
                <div ref={composerRef} className="comm-composer-card">
                  <div className="comm-composer-header">
                    <div className="comm-composer-avatar">
                      {(user?.firstName?.[0] || "U").toUpperCase()}
                    </div>
                    <div className="comm-composer-meta">
                      <b>{user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "Student Lounge"}</b>
                      <span>Share a doubt, discussion, note, or achievement</span>
                    </div>
                  </div>

                  {/* Post Type Chips */}
                  <div className="comm-type-pill-strip">
                    {postTypes.map((pt) => (
                      <button
                        key={pt.id}
                        className={`comm-type-pill ${postType === pt.id ? "active" : ""}`}
                        onClick={() => setPostType(pt.id)}
                      >
                        {pt.icon}
                        <span>{pt.label}</span>
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="comm-post-textarea"
                    placeholder={
                      postType === "question"
                        ? "Ask your question or doubt... What topic are you stuck on?"
                        : postType === "achievement"
                        ? "Celebrate your progress! Finished a tough chapter or scored well?"
                        : postType === "study_tip"
                        ? "Share a memory trick, formula summary, or helpful study routine..."
                        : "What's on your mind? Share thoughts with your peers..."
                    }
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={3}
                  />

                  <div className="comm-composer-footer">
                    <div className="comm-composer-tools">
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setAttachedFile(f);
                        }}
                      />
                      <button className="comm-tool-btn" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon size={14} style={{ color: "#2389ff" }} /> Add Photo
                      </button>

                      <select
                        className="comm-visibility-select"
                        value={postVisibility}
                        onChange={(e) => setPostVisibility(e.target.value as "all" | "school")}
                      >
                        <option value="all">Visible to All GradeUp 🌐</option>
                        <option value="school">My School Only 🏫</option>
                      </select>

                      {attachedFile && (
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "#7b2cff",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {attachedFile.name}
                          <X
                            size={13}
                            style={{ cursor: "pointer" }}
                            onClick={() => setAttachedFile(null)}
                          />
                        </span>
                      )}
                    </div>

                    <button
                      className="comm-submit-btn"
                      onClick={handleCreatePost}
                      disabled={createPostMutation.isPending || !postContent.trim()}
                    >
                      {createPostMutation.isPending ? "Publishing..." : "Post Update 🚀"}
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="comm-filter-strip">
                  <div className="comm-search-bar">
                    <Search size={16} className="comm-search-icon" />
                    <input
                      placeholder="Search questions, topics, chapters..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <X
                        size={15}
                        style={{ position: "absolute", right: 14, top: 14, cursor: "pointer", color: "var(--comm-muted)" }}
                        onClick={() => setSearchTerm("")}
                      />
                    )}
                  </div>

                  <select
                    className="comm-filter-select"
                    value={contentFilter}
                    onChange={(e) => setContentFilter(e.target.value)}
                  >
                    <option value="all">🌟 All Categories</option>
                    <option value="question">❓ Doubts & Questions</option>
                    <option value="discussion">💬 Discussions</option>
                    <option value="achievement">🏆 Achievements</option>
                    <option value="study_tip">💡 Study Tips</option>
                    <option value="session_card">🎙️ Live Sessions</option>
                  </select>
                </div>

                {/* Posts Feed Stream */}
                {isLoadingPosts ? (
                  <FunnyLoader text="Gathering the latest community buzz..." />
                ) : filteredPosts.length === 0 ? (
                  <div
                    className="comm-card"
                    style={{
                      textAlign: "center",
                      padding: "48px 24px",
                      background: "var(--comm-card)",
                    }}
                  >
                    <img
                      src={robotSearch}
                      alt="No posts"
                      style={{ width: 80, height: 80, margin: "0 auto 12px", objectFit: "contain" }}
                    />
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--comm-ink)", marginBottom: 4 }}>
                      No discussions found
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--comm-muted)", maxWidth: 360, margin: "0 auto 16px" }}>
                      {searchTerm
                        ? `No discussions matching "${searchTerm}". Try a different search!`
                        : "Be the first student to post a doubt or start a conversation!"}
                    </p>
                    <button className="comm-hero-primary-btn" onClick={() => scrollToComposer("discussion")}>
                      <Plus size={15} /> Start Discussion
                    </button>
                  </div>
                ) : (
                  filteredPosts.map((post: any, idx: number) => {
                    const isLiked = likedPosts[post.id] || false;
                    const likesCount = (post.likesCount || 0) + (isLiked ? 1 : 0);
                    const commentsOpen = showComments[post.id] || false;

                    return (
                      <motion.div
                        key={post.id}
                        className="comm-post-card"
                        id={`post-${post.id}`}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                      >
                        <div className="comm-post-header">
                          <div className="comm-post-author-avatar">
                            {(post.author?.firstName?.[0] || "U").toUpperCase()}
                          </div>
                          <div className="comm-post-author-info">
                            <b>
                              {post.author?.firstName || "Learner"} {post.author?.lastName || ""}
                            </b>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                              <span className={`comm-badge ${post.type || "discussion"}`}>
                                {post.type === "question" && <HelpCircle size={11} />}
                                {post.type === "discussion" && <MessageCircle size={11} />}
                                {post.type === "achievement" && <Trophy size={11} />}
                                {post.type === "study_tip" && <Lightbulb size={11} />}
                                {post.type === "session_card" && <Radio size={11} />}
                                {post.type || "discussion"}
                              </span>
                              {post.visibility === "school" && (
                                <span style={{ fontSize: 10.5, color: "var(--comm-muted)", fontWeight: 700 }}>
                                  • School Only
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="comm-post-time">
                            {post.createdAt
                              ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
                              : "Recently"}
                          </span>
                        </div>

                        <div className="comm-post-content">{post.content}</div>

                        {/* Embedded Live Session Card if present */}
                        {post.metadata?.sessionCard && (
                          <CommunitySessionCard card={post.metadata.sessionCard} />
                        )}

                        {/* Reaction Bar */}
                        <div className="comm-post-reactions">
                          <button
                            className={`comm-reaction-btn ${isLiked ? "liked" : ""}`}
                            onClick={() => likePostMutation.mutate(post.id)}
                          >
                            <Heart size={15} />
                            <span>{likesCount} Likes</span>
                          </button>

                          <button
                            className="comm-reaction-btn"
                            onClick={() =>
                              setShowComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                            }
                          >
                            <MessageCircle size={15} />
                            <span>{post.commentsCount || post.comments?.length || 0} Replies</span>
                          </button>

                          <button className="comm-reaction-btn" onClick={() => handleSharePost(post)}>
                            <Share2 size={15} />
                            <span>Share</span>
                          </button>
                        </div>

                        {/* Expandable Comments Drawer */}
                        <AnimatePresence>
                          {commentsOpen && (
                            <motion.div
                              className="comm-comments-area"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              {post.comments && post.comments.length > 0 ? (
                                post.comments.map((comment: any) => (
                                  <div key={comment.id} className="comm-comment-bubble">
                                    <div className="comm-comment-avatar">
                                      {(comment.author?.firstName?.[0] || "U").toUpperCase()}
                                    </div>
                                    <div className="comm-comment-body">
                                      <div className="comm-comment-top">
                                        <span className="comm-comment-author">
                                          {comment.author?.firstName || "Peer"}
                                        </span>
                                        <span className="comm-comment-time">
                                          {comment.createdAt
                                            ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
                                            : "Just now"}
                                        </span>
                                      </div>
                                      <div className="comm-comment-text">{comment.content}</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div
                                  style={{
                                    fontSize: 12.5,
                                    color: "var(--comm-muted)",
                                    textAlign: "center",
                                    padding: "6px 0",
                                  }}
                                >
                                  No comments yet. Start the conversation!
                                </div>
                              )}

                              {/* Comment Reply Input */}
                              <div className="comm-comment-input-row">
                                <input
                                  className="comm-comment-input"
                                  placeholder="Write an encouraging reply..."
                                  value={commentTexts[post.id] || ""}
                                  onChange={(e) =>
                                    setCommentTexts((p) => ({ ...p, [post.id]: e.target.value }))
                                  }
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter" && (commentTexts[post.id] || "").trim()) {
                                      commentPostMutation.mutate({
                                        postId: post.id,
                                        content: (commentTexts[post.id] || "").trim(),
                                      });
                                    }
                                  }}
                                />
                                <button
                                  className="comm-comment-send-btn"
                                  onClick={() => {
                                    if ((commentTexts[post.id] || "").trim()) {
                                      commentPostMutation.mutate({
                                        postId: post.id,
                                        content: (commentTexts[post.id] || "").trim(),
                                      });
                                    }
                                  }}
                                >
                                  <Send size={14} />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* ── RIGHT RAIL: Trending Topics & Badges ── */}
              <div className="comm-feed-right">
                {/* Trending Study Topics */}
                <div className="comm-card" style={{ marginBottom: 18 }}>
                  <div className="comm-card-header">
                    <div className="comm-card-title">
                      <Flame size={17} style={{ color: "#ff791f" }} /> Trending Study Buzz
                    </div>
                  </div>
                  <div className="comm-card-body" style={{ padding: "12px 14px" }}>
                    {trendingTopics.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: "var(--comm-muted)", padding: "12px 0", textAlign: "center" }}>
                        <TrendingUp size={20} style={{ margin: "0 auto 6px", opacity: 0.5 }} />
                        New topics heating up soon!
                      </div>
                    ) : (
                      trendingTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className="comm-topic-item"
                          onClick={() => setSearchTerm(topic.title)}
                        >
                          <div className="comm-topic-icon">
                            <Zap size={16} />
                          </div>
                          <div>
                            <div className="comm-topic-title">#{topic.title}</div>
                            <div className="comm-topic-count">{topic.posts} student posts</div>
                          </div>
                          <ChevronRight size={14} className="comm-topic-arrow" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Badges & Student Perks */}
                <div className="comm-card" style={{ marginBottom: 18 }}>
                  <div className="comm-card-header">
                    <div className="comm-card-title">
                      <Award size={17} style={{ color: "#ffb21d" }} /> Community Badges
                    </div>
                  </div>
                  <div className="comm-card-body" style={{ padding: "14px" }}>
                    <div className="comm-badge-tile">
                      <div className="comm-badge-shape">🌟</div>
                      <div className="comm-badge-info">
                        <b>Top Contributor</b>
                        <span>Help 5 classmates with doubts</span>
                      </div>
                    </div>
                    <div className="comm-badge-tile">
                      <div
                        className="comm-badge-shape"
                        style={{ background: "linear-gradient(135deg, #7b2cff, #b948d9)" }}
                      >
                        ⚡
                      </div>
                      <div className="comm-badge-info">
                        <b>Study Buddy Pro</b>
                        <span>Engage in 10 discussion threads</span>
                      </div>
                    </div>
                    <div className="comm-badge-tile">
                      <div
                        className="comm-badge-shape"
                        style={{ background: "linear-gradient(135deg, #27b86a, #2389ff)" }}
                      >
                        💡
                      </div>
                      <div className="comm-badge-info">
                        <b>Problem Solver</b>
                        <span>Earn 100+ community points</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Friendly Student Code of Conduct */}
                <div
                  className="comm-card"
                  style={{
                    background: "var(--comm-card-soft)",
                    border: "1px dashed var(--comm-line)",
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <ShieldCheck size={18} style={{ color: "#27b86a" }} />
                    <b style={{ fontSize: 13, color: "var(--comm-ink)" }}>Student Friendly Space</b>
                  </div>
                  <p style={{ fontSize: 11.5, color: "var(--comm-muted)", lineHeight: 1.5, margin: 0 }}>
                    GradeUp Community is a respectful learning zone. Cheer on your peers, celebrate curious minds, and keep all shared resources academic!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ POLLS FULL TAB ══════════════════ */}
          {activeTab === "polls" && (
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <div className="comm-card">
                <div className="comm-card-header">
                  <div className="comm-card-title">
                    <Vote size={18} style={{ color: "#7b2cff" }} /> All Active Student Polls
                  </div>
                  <button
                    className="comm-hero-primary-btn"
                    style={{ padding: "8px 16px", fontSize: 12.5 }}
                    onClick={() => setShowPollCreationForm(!showPollCreationForm)}
                  >
                    <Plus size={14} /> Create Poll
                  </button>
                </div>

                <div className="comm-card-body">
                  {showPollCreationForm && (
                    <div
                      style={{
                        marginBottom: 20,
                        padding: 16,
                        borderRadius: 16,
                        background: "var(--comm-card-soft)",
                        border: "1.5px solid var(--comm-line)",
                      }}
                    >
                      <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, color: "var(--comm-ink)" }}>
                        Create a New Poll
                      </h4>
                      <input
                        placeholder="Poll Question"
                        value={newPollQuestion}
                        onChange={(e) => setNewPollQuestion(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 12,
                          border: "1.5px solid var(--comm-line)",
                          fontSize: 13.5,
                          marginBottom: 10,
                          background: "var(--comm-card)",
                          color: "var(--comm-ink)",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      {newPollOptions.map((opt, i) => (
                        <input
                          key={i}
                          placeholder={`Option ${i + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const next = [...newPollOptions];
                            next[i] = e.target.value;
                            setNewPollOptions(next);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1.5px solid var(--comm-line)",
                            fontSize: 12.5,
                            marginBottom: 8,
                            background: "var(--comm-card)",
                            color: "var(--comm-ink)",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <button
                          onClick={() => setNewPollOptions([...newPollOptions, ""])}
                          style={{
                            fontSize: 12.5,
                            color: "#7b2cff",
                            fontWeight: 700,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          + Add Option
                        </button>
                        <button
                          className="comm-submit-btn"
                          onClick={handleCreatePoll}
                          disabled={createPollMutation.isPending}
                        >
                          {createPollMutation.isPending ? "Creating..." : "Launch Poll"}
                        </button>
                      </div>
                    </div>
                  )}

                  {isLoadingPolls ? (
                    <FunnyLoader text="Loading polls..." />
                  ) : polls.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--comm-muted)" }}>
                      <Vote size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
                      <p style={{ fontSize: 14, fontWeight: 700 }}>No polls active at this moment.</p>
                    </div>
                  ) : (
                    polls.map((poll) => {
                      const totalVotes =
                        poll.totalVotes || poll.options?.reduce((a, b) => a + (b.votes || 0), 0) || 1;
                      return (
                        <div key={poll.id} className="comm-poll-card" style={{ marginBottom: 18 }}>
                          <div className="comm-poll-q" style={{ fontSize: 15 }}>
                            <BarChart3 size={17} style={{ color: "#7b2cff" }} /> {poll.question}
                          </div>
                          {poll.options.map((opt) => {
                            const pct = Math.round(((opt.votes || 0) / totalVotes) * 100);
                            return (
                              <button
                                key={opt.id}
                                className="comm-poll-opt-btn"
                                onClick={() => votePollMutation.mutate({ pollId: poll.id, optionId: opt.id })}
                                disabled={poll.userVoted || votePollMutation.isPending}
                              >
                                {poll.userVoted && (
                                  <span className="comm-poll-progress-fill" style={{ width: `${pct}%` }} />
                                )}
                                <span style={{ position: "relative", zIndex: 1 }}>{opt.text}</span>
                                <span style={{ position: "relative", zIndex: 1, fontSize: 12, color: "var(--comm-muted)" }}>
                                  {poll.userVoted ? `${pct}% (${opt.votes || 0} votes)` : `${opt.votes || 0} votes`}
                                </span>
                              </button>
                            );
                          })}
                          <div className="comm-poll-footer" style={{ marginTop: 10 }}>
                            <span>{poll.totalVotes || 0} learners voted</span>
                            {poll.userVoted && (
                              <span style={{ color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                <CheckCircle2 size={13} /> You cast your vote
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ LEADERBOARD TAB ══════════════════ */}
          {activeTab === "leaderboard" && (
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <div className="comm-card">
                <div className="comm-card-header">
                  <div className="comm-card-title">
                    <Trophy size={18} style={{ color: "#ffb21d" }} /> Student Community Leaderboard
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--comm-muted)" }}>
                    Live cohort 🏆
                  </span>
                </div>
                <div className="comm-card-body">
                  {isLoadingLeaderboard ? (
                    <FunnyLoader text="Calculating rankings..." />
                  ) : leaderboard && leaderboard.length > 0 ? (
                    leaderboard.map((student: any, idx: number) => (
                      <motion.div
                        key={student.userId || idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 18px",
                          borderRadius: 16,
                          background:
                            idx === 0
                              ? "linear-gradient(135deg, rgba(255, 178, 29, 0.15), rgba(255, 245, 215, 0.4))"
                              : "var(--comm-card-soft)",
                          border: "1px solid var(--comm-line)",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            width: 32,
                            textAlign: "center",
                            color: idx === 0 ? "#ff9800" : idx === 1 ? "#64748b" : idx === 2 ? "#b45309" : "var(--comm-muted)",
                          }}
                        >
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </div>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 14,
                            background: "linear-gradient(135deg, #7b2cff, #2389ff)",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 14,
                            fontWeight: 800,
                          }}
                        >
                          {(student.name?.[0] || "S").toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <b style={{ display: "block", fontSize: 14, color: "var(--comm-ink)" }}>
                            {student.name}
                          </b>
                          <span style={{ fontSize: 11.5, color: "var(--comm-muted)", fontWeight: 600 }}>
                            {student.points || 0} Community XP Points
                          </span>
                        </div>
                        <span
                          className={`comm-badge ${idx === 0 ? "achievement" : idx < 3 ? "discussion" : "study_tip"}`}
                        >
                          {idx === 0 ? "🏆 Grand Champion" : idx === 1 ? "🥈 Master Helper" : idx === 2 ? "🥉 Star Contributor" : `${student.points || 0} pts`}
                        </span>
                      </motion.div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--comm-muted)" }}>
                      <Trophy size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
                      <p style={{ fontSize: 14, fontWeight: 700 }}>Leaderboard will refresh after current round.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ MESSAGING / CHAT TAB ══════════════════ */}
          {activeTab === "messaging" && (
            <div className="comm-msg-container">
              {/* Channel list */}
              <div className="comm-chat-channel-list">
                <div className="comm-card-header">
                  <span className="comm-card-title">
                    <Users size={16} style={{ color: "#7b2cff" }} /> Study Groups
                  </span>
                  <button
                    onClick={() => setShowCreateChannelModal(true)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      background: "rgba(123, 44, 255, 0.1)",
                      color: "#7b2cff",
                      border: "none",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
                  {channels.map((ch) => (
                    <div key={ch.id}>
                      <div
                        onClick={() => setSelectedChannel(ch.id === selectedChannel ? null : ch.id)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: ch.id === selectedChannel ? "var(--comm-card-soft)" : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: "#7b2cff", fontWeight: 900 }}>#</span>
                        <span>{ch.name}</span>
                      </div>
                      {selectedChannel === ch.id &&
                        ch.groups.map((g) => (
                          <div
                            key={g.id}
                            onClick={() => setSelectedConversation(g.id)}
                            style={{
                              padding: "8px 12px 8px 30px",
                              borderRadius: 10,
                              background: selectedConversation === g.id ? "rgba(123, 44, 255, 0.12)" : "transparent",
                              color: selectedConversation === g.id ? "#7b2cff" : "var(--comm-muted)",
                              cursor: "pointer",
                              fontSize: 12.5,
                              fontWeight: 700,
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>{g.name}</span>
                            <span style={{ fontSize: 11, opacity: 0.7 }}>{g.members?.length || 0}</span>
                          </div>
                        ))}
                    </div>
                  ))}
                  {channels.length === 0 && (
                    <div style={{ textAlign: "center", padding: "36px 12px", color: "var(--comm-muted)" }}>
                      <MessageSquare size={30} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                      <p style={{ fontSize: 13, fontWeight: 700 }}>No study groups yet.</p>
                      <p style={{ fontSize: 11.5 }}>Create a group to study with friends!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat window */}
              <div className="comm-chat-main-area">
                {selectedConversation ? (
                  <>
                    <div className="comm-card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: "linear-gradient(135deg, #7b2cff, #2389ff)",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 800,
                            fontSize: 13,
                          }}
                        >
                          #
                        </div>
                        <div>
                          <b style={{ display: "block", fontSize: 13.5, color: "var(--comm-ink)" }}>
                            {channels.flatMap((c) => c.groups).find((g) => g.id === selectedConversation)?.name || "Study Group"}
                          </b>
                          <span style={{ fontSize: 11, color: "var(--comm-muted)" }}>Active Study Circle</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {channels
                        .flatMap((c) => c.groups)
                        .find((g) => g.id === selectedConversation)
                        ?.messages.map((m: any) => (
                          <div
                            key={m.id}
                            style={{
                              display: "flex",
                              justifyContent: m.senderId === user?.id ? "flex-end" : "flex-start",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "72%",
                                padding: "10px 15px",
                                borderRadius:
                                  m.senderId === user?.id
                                    ? "18px 18px 4px 18px"
                                    : "18px 18px 18px 4px",
                                background:
                                  m.senderId === user?.id
                                    ? "linear-gradient(135deg, #7b2cff, #b948d9)"
                                    : "var(--comm-card-soft)",
                                color: m.senderId === user?.id ? "#fff" : "var(--comm-ink)",
                                border: m.senderId === user?.id ? "none" : "1px solid var(--comm-line)",
                                fontSize: 13.5,
                                lineHeight: 1.5,
                              }}
                            >
                              {m.content}
                            </div>
                          </div>
                        ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <div
                      style={{
                        padding: "12px 16px",
                        borderTop: "1px solid var(--comm-line)",
                        display: "flex",
                        gap: 10,
                      }}
                    >
                      <input
                        placeholder="Write a message to your group..."
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        style={{
                          flex: 1,
                          height: 42,
                          borderRadius: 14,
                          border: "1.5px solid var(--comm-line)",
                          padding: "0 14px",
                          fontSize: 13.5,
                          background: "var(--comm-card-soft)",
                          color: "var(--comm-ink)",
                          outline: "none",
                        }}
                      />
                      <button className="comm-submit-btn" style={{ padding: "0 18px" }} onClick={sendMessage}>
                        <Send size={15} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--comm-muted)",
                      gap: 12,
                    }}
                  >
                    <Users size={38} style={{ opacity: 0.4 }} />
                    <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--comm-ink)" }}>
                      Choose a study group to start chatting
                    </p>
                    <p style={{ fontSize: 12.5, margin: 0 }}>
                      Collaborate with classmates in real time
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ BLOGS TAB ══════════════════ */}
          {activeTab === "blogs" && (
            <div>
              {user ? (
                <BlogFeed
                  currentUser={{
                    id: user.id.toString(),
                    firstName: user.firstName,
                    lastName: user.lastName,
                    profileImage: user.profileImage,
                  }}
                />
              ) : (
                <FunnyLoader text="Logging into blog feed..." />
              )}
            </div>
          )}
        </div>

        {/* ── Create Channel Modal ── */}
        {showCreateChannelModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
            onClick={() => setShowCreateChannelModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <Users size={18} className="text-purple-600" /> Create Study Channel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Name your subject or project channel (e.g. "Maths Exam Prep", "Science Club")
              </p>
              <input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Channel Name"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && newChannelName.trim()) {
                    setChannels((prev) => [
                      ...prev,
                      { id: `ch_${Date.now()}`, name: newChannelName.trim(), groups: [] },
                    ]);
                    setNewChannelName("");
                    setShowCreateChannelModal(false);
                    toast({ title: "Study Channel Created! 🚀" });
                  }
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none mb-4 focus:border-purple-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateChannelModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newChannelName.trim()) return;
                    setChannels((prev) => [
                      ...prev,
                      { id: `ch_${Date.now()}`, name: newChannelName.trim(), groups: [] },
                    ]);
                    setNewChannelName("");
                    setShowCreateChannelModal(false);
                    toast({ title: "Study Channel Created! 🚀" });
                  }}
                  disabled={!newChannelName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-black disabled:opacity-50"
                >
                  Create Channel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}
