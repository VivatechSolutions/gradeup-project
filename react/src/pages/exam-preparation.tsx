import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  FileQuestion,
  Check,
  ArrowRight,
  Sparkles,
  Clock,
  Target,
  Search,
  X,
  Star,
  Lock,
  TrendingUp,
  ArrowLeft,
  Home,
  Printer,
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import Navigation from "../components/navigation";

// Assets matching student dashboard
import studyRobo from "../assets/dashboard/study-robo.png";
import roboImg from "../assets/robo.png";
import mathsSubject from "../assets/dashboard/subject-maths.png";
import scienceSubject from "../assets/dashboard/subject-science.png";
import socialSubject from "../assets/dashboard/subject-social.png";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box}

.ep-root {
  min-height: 100vh;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--ep-ink);
  background:
    radial-gradient(circle at 14% 9%, rgba(126,87,255,.12), transparent 26%),
    radial-gradient(circle at 88% 14%, rgba(255,171,64,.16), transparent 25%),
    linear-gradient(180deg, var(--ep-page), var(--ep-page-2));
  --ep-page: #fbfcff;
  --ep-page-2: #f5f7ff;
  --ep-card: #ffffff;
  --ep-card-soft: #f7faff;
  --ep-ink: #071235;
  --ep-muted: #68708a;
  --ep-faint: #8c94aa;
  --ep-line: rgba(15,23,42,.08);
  --ep-shadow: 0 12px 30px rgba(35,44,87,.10);
  --ep-shadow-soft: 0 7px 18px rgba(35,44,87,.06);
  position: relative;
  overflow-x: hidden;
}

[data-theme="dark"] .ep-root,
.dark .ep-root {
  --ep-page: #080d1f;
  --ep-page-2: #10172d;
  --ep-card: rgba(23,31,58,.92);
  --ep-card-soft: rgba(31,42,76,.72);
  --ep-ink: #f6f7ff;
  --ep-muted: #b5bfd8;
  --ep-faint: #7f8aa7;
  --ep-line: rgba(255,255,255,.12);
  --ep-shadow: 0 20px 54px rgba(0,0,0,.36);
  --ep-shadow-soft: 0 12px 30px rgba(0,0,0,.24);
}

.ep-root::before, .ep-root::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(.2px);
  opacity: .55;
  animation: epFloatBg 12s ease-in-out infinite alternate;
}
.ep-root::before {
  width: 260px;
  height: 260px;
  left: -80px;
  top: 100px;
  background: radial-gradient(circle, rgba(46,182,255,.18), transparent 68%);
}
.ep-root::after {
  width: 300px;
  height: 300px;
  right: -100px;
  top: 380px;
  background: radial-gradient(circle, rgba(255,95,153,.14), transparent 70%);
  animation-delay: -5s;
}

@keyframes epFloatBg {
  from { transform: translate3d(0,0,0) scale(1); }
  to { transform: translate3d(22px,28px,0) scale(1.08); }
}
@keyframes epCardIn {
  from { opacity: 0; transform: translateY(12px) scale(.985); }
  to { opacity: 1; transform: none; }
}
@keyframes epShine {
  0% { transform: translateX(-120%) rotate(18deg); }
  45%, 100% { transform: translateX(220%) rotate(18deg); }
}
@keyframes epBreathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes epPulseSoft {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,91,255,.22); }
  50% { box-shadow: 0 0 0 8px rgba(99,91,255,0); }
}
@keyframes epDrift {
  0%, 100% { transform: translate3d(0,0,0) rotate(0); }
  50% { transform: translate3d(18px,-14px,0) rotate(7deg); }
}
@keyframes epGlowMove {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes epWiggle {
  0%, 100% { transform: rotate(0) scale(1); }
  35% { transform: rotate(-2deg) scale(1.025); }
  70% { transform: rotate(2deg) scale(1.025); }
}
@keyframes epPop3d {
  0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
  50% { transform: translateY(-6px) rotate(3deg) scale(1.04); }
}
@keyframes epBgWave {
  0%, 100% { transform: translate3d(-2%,0,0) rotate(0); }
  50% { transform: translate3d(2%,-2%,0) rotate(2deg); }
}
@keyframes epProgressSweep {
  0% { transform: translateX(-120%) skewX(-20deg); }
  100% { transform: translateX(220%) skewX(-20deg); }
}

.ep-bg-spark {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
  opacity: .48;
  animation: epDrift 9s ease-in-out infinite;
}
.ep-bg-spark.s1 {
  left: 52%;
  top: 78px;
  width: 9px;
  height: 9px;
  background: #ffb21d;
  box-shadow: 34px 28px 0 #27b86a, 76px -14px 0 #2389ff;
}
.ep-bg-spark.s2 {
  right: 8%;
  top: 260px;
  width: 7px;
  height: 7px;
  background: #ff4d8d;
  box-shadow: -48px 46px 0 #7e45e8, -86px -18px 0 #00a7c8;
  animation-delay: -3s;
}
.ep-bg-spark.s3 {
  left: 7%;
  bottom: 160px;
  width: 8px;
  height: 8px;
  background: #27b86a;
  box-shadow: 42px -34px 0 #ff791f, 92px 18px 0 #2389ff;
  animation-delay: -5s;
}
.ep-bg-ribbon {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  left: 4%;
  right: 4%;
  top: 150px;
  height: 170px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(35,137,255,.08), rgba(255,178,29,.10), rgba(39,184,106,.08));
  filter: blur(18px);
  opacity: .75;
  animation: epBgWave 13s ease-in-out infinite;
}

.ep-shell {
  max-width: 1180px;
  margin: 0 auto;
  padding: 16px 20px 60px;
  position: relative;
  z-index: 1;
}

/* Greeting Header */
.ep-greeting {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin: 0 2px 18px;
  flex-wrap: wrap;
}
.ep-title {
  font-size: clamp(22px, 2.6vw, 30px);
  line-height: 1.05;
  font-weight: 800;
  color: var(--ep-ink);
  letter-spacing: -0.01em;
}
.ep-subtitle {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ep-muted);
}
.ep-mini-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.ep-mini-pill {
  min-width: 96px;
  border: 1px solid var(--ep-line);
  background: rgba(255,255,255,.78);
  backdrop-filter: blur(14px);
  border-radius: 16px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 9px;
  box-shadow: var(--ep-shadow-soft);
  animation: epCardIn .42s both;
  transition: transform .18s, box-shadow .18s, border-color .18s;
}
.ep-mini-pill:hover {
  transform: translateY(-3px);
  box-shadow: var(--ep-shadow);
  border-color: rgba(35,137,255,.3);
}
[data-theme="dark"] .ep-mini-pill,
.dark .ep-mini-pill {
  background: rgba(23,31,58,.82);
  border-color: rgba(255,255,255,.12);
}
.ep-pill-ico {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 16px;
  background: #fff4d6;
  flex-shrink: 0;
}
[data-theme="dark"] .ep-pill-ico,
.dark .ep-pill-ico {
  background: rgba(255,255,255,.1);
}
.ep-pill-num {
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  color: var(--ep-ink);
}
.ep-pill-label {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--ep-muted);
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: .04em;
}

/* ── Hero Banner with Robot ── */
.ep-hero {
  position: relative;
  overflow: hidden;
  min-height: 220px;
  border-radius: 22px;
  padding: 24px 28px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 20px;
  align-items: center;
  background: linear-gradient(118deg, #dff5ff 0%, #eef2ff 48%, #fff1d6 100%);
  border: 1px solid rgba(35,137,255,.2);
  box-shadow: var(--ep-shadow);
  animation: epCardIn .45s both;
  margin-bottom: 22px;
}
[data-theme="dark"] .ep-hero,
.dark .ep-hero {
  background: linear-gradient(118deg, #102b43 0%, #20264f 52%, #49321c 100%);
  border-color: rgba(116,190,255,.24);
}
.ep-hero::before {
  content: "";
  position: absolute;
  inset: -70px auto auto -70px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255,255,255,.45);
  animation: epBreathe 5s ease-in-out infinite;
  pointer-events: none;
}
.ep-hero::after {
  content: "";
  position: absolute;
  top: -50px;
  bottom: -50px;
  width: 70px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.36), transparent);
  animation: epShine 7s ease-in-out infinite;
  pointer-events: none;
}
.ep-hero-content {
  position: relative;
  z-index: 2;
  max-width: 540px;
}
.ep-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 800;
  color: #0284c7;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(2,132,199,.1);
  border: 1px solid rgba(2,132,199,.18);
  margin-bottom: 10px;
}
[data-theme="dark"] .ep-chip,
.dark .ep-chip {
  color: #38bdf8;
  background: rgba(56,189,248,.14);
  border-color: rgba(56,189,248,.25);
}
.ep-hero-title {
  font-size: clamp(22px, 2.7vw, 32px);
  line-height: 1.15;
  font-weight: 800;
  color: var(--ep-ink);
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}
.ep-hero-desc {
  font-size: 13px;
  font-weight: 600;
  color: var(--ep-muted);
  line-height: 1.5;
  margin-bottom: 16px;
}
.ep-hero-progress-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  max-width: 320px;
}
.ep-hero-track {
  height: 8px;
  flex: 1;
  border-radius: 999px;
  background: rgba(35,137,255,.14);
  overflow: hidden;
  position: relative;
}
.ep-hero-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #0ea5e9);
  position: relative;
}
.ep-hero-fill::after {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 30%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent);
  animation: epProgressSweep 2.4s ease-in-out infinite;
}
.ep-hero-progress-text {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--ep-ink);
  white-space: nowrap;
}
.ep-primary-btn {
  border: 0;
  border-radius: 14px;
  padding: 11px 20px;
  min-height: 42px;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
  font: 800 13px/1 'Plus Jakarta Sans', system-ui, sans-serif;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 20px rgba(14,165,233,.28);
  transition: transform .18s, box-shadow .18s;
}
.ep-primary-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 14px 26px rgba(14,165,233,.38);
}

/* Robot Stage Panel */
.ep-hero-panel {
  position: relative;
  z-index: 2;
  min-height: 200px;
  border-radius: 20px;
  padding: 16px;
  background: rgba(255,255,255,.58);
  border: 1px solid rgba(255,255,255,.72);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 18px 34px rgba(38,57,116,.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}
[data-theme="dark"] .ep-hero-panel,
.dark .ep-hero-panel {
  background: rgba(15,23,42,.45);
  border-color: rgba(255,255,255,.14);
}
.ep-hero-panel::before {
  content: "";
  position: absolute;
  right: -30px;
  top: -30px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: rgba(35,137,255,.16);
  animation: epBreathe 5s ease-in-out infinite;
}
.ep-hero-panel::after {
  content: "";
  position: absolute;
  left: -30px;
  bottom: -40px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: rgba(255,178,29,.18);
  animation: epDrift 8s ease-in-out infinite;
}
.ep-hero-orbit {
  position: relative;
  z-index: 1;
  width: 110px;
  height: 110px;
  display: grid;
  place-items: center;
  margin: 4px auto 8px;
}
.ep-hero-robo-img {
  width: 104px;
  height: 104px;
  object-fit: contain;
  filter: drop-shadow(0 14px 18px rgba(0,0,0,.22));
  animation: epBreathe 4.2s ease-in-out infinite;
}
.ep-hero-stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  width: 100%;
}
.ep-hero-stat {
  border-radius: 12px;
  padding: 8px 10px;
  text-align: center;
  background: rgba(255,255,255,.72);
  border: 1px solid rgba(15,23,42,.07);
}
[data-theme="dark"] .ep-hero-stat,
.dark .ep-hero-stat {
  background: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.10);
}
.ep-hero-stat b {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: var(--ep-ink);
  line-height: 1;
}
.ep-hero-stat span {
  display: block;
  margin-top: 3px;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--ep-muted);
  text-transform: uppercase;
}

/* ── Generic Glass Card ── */
.ep-card {
  background: rgba(255,255,255,.86);
  backdrop-filter: blur(14px);
  border: 1px solid var(--ep-line);
  border-radius: 20px;
  box-shadow: var(--ep-shadow-soft);
  padding: 20px;
  animation: epCardIn .45s both;
  transition: transform .18s, box-shadow .18s, border-color .18s;
  margin-bottom: 20px;
}
[data-theme="dark"] .ep-card,
.dark .ep-card {
  background: rgba(23,31,58,.88);
  border-color: rgba(255,255,255,.12);
}
.ep-card:hover {
  border-color: rgba(35,137,255,.24);
}

/* ── Step Progress Indicator ── */
.ep-steps-bar {
  display: flex;
  align-items: center;
  padding: 16px 22px;
  border-radius: 18px;
  background: rgba(255,255,255,.86);
  backdrop-filter: blur(14px);
  border: 1px solid var(--ep-line);
  box-shadow: var(--ep-shadow-soft);
  margin-bottom: 22px;
}
[data-theme="dark"] .ep-steps-bar,
.dark .ep-steps-bar {
  background: rgba(23,31,58,.88);
  border-color: rgba(255,255,255,.12);
}
.ep-step-item {
  display: flex;
  align-items: center;
  flex: 1;
}
.ep-step-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: default;
}
.ep-step-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
  transition: all .25s ease;
}
.ep-step-circle.done {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4px 12px rgba(16,185,129,.35);
  cursor: pointer;
}
.ep-step-circle.active {
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
  box-shadow: 0 4px 14px rgba(37,99,235,.35);
  outline: 3px solid rgba(14,165,233,.3);
  outline-offset: 2px;
}
.ep-step-circle.pending {
  background: var(--ep-card-soft);
  color: var(--ep-muted);
  border: 1.5px solid var(--ep-line);
}
.ep-step-lbl {
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
  color: var(--ep-muted);
}
.ep-step-lbl.active,
.ep-step-lbl.done {
  color: var(--ep-ink);
  font-weight: 800;
}
.ep-step-line {
  flex: 1;
  height: 3px;
  margin: 0 12px 20px;
  border-radius: 99px;
  transition: background .4s;
}
.ep-step-line.filled {
  background: linear-gradient(90deg, #2563eb, #0ea5e9);
}
.ep-step-line.empty {
  background: var(--ep-line);
}

/* ── Section Titles ── */
.ep-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.ep-section-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--ep-ink);
  letter-spacing: -0.01em;
}
.ep-section-sub {
  font-size: 13px;
  font-weight: 600;
  color: var(--ep-muted);
  margin-top: 3px;
}

/* ── Step 1: Subjects Grid ── */
.ep-subject-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 22px;
}
.ep-subject {
  min-height: 196px;
  border-radius: 18px;
  padding: 14px 12px;
  background: var(--subject-bg);
  box-shadow: 0 10px 22px rgba(38,57,116,.12);
  transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s, border-color .22s;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}
.ep-subject::before {
  content: "";
  position: absolute;
  inset: -40px -26px auto auto;
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background: rgba(255,255,255,.33);
}
.ep-subject:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 18px 32px rgba(38,57,116,.18);
}
.ep-subject.selected {
  border-color: #fff;
  box-shadow: 0 12px 30px rgba(37,99,235,.28), 0 0 0 2px #2563eb;
}
.ep-subject-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  color: #2563eb;
  display: grid;
  place-items: center;
  box-shadow: 0 3px 8px rgba(0,0,0,.2);
  z-index: 2;
}
.ep-subject-name {
  font-size: 16px;
  font-weight: 800;
  color: #071235;
  margin: 0;
  position: relative;
  z-index: 1;
}
.ep-subject-visual {
  position: relative;
  z-index: 1;
  min-height: 96px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, rgba(255,255,255,.78), rgba(255,255,255,.28));
  box-shadow: inset 0 -8px 0 rgba(0,0,0,.05);
  overflow: hidden;
}
.ep-subject-visual::before {
  content: "";
  position: absolute;
  inset: auto -20px -36px auto;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: rgba(255,255,255,.28);
}
.ep-subject-art-img {
  width: 92px;
  height: 84px;
  object-fit: contain;
  filter: drop-shadow(0 10px 12px rgba(0,0,0,.15));
  animation: epPop3d 4.2s ease-in-out infinite;
  animation-delay: var(--delay, 0s);
  position: relative;
  z-index: 1;
}
.ep-subject-emoji-art {
  font-size: 46px;
  animation: epPop3d 4.2s ease-in-out infinite;
  animation-delay: var(--delay, 0s);
  position: relative;
  z-index: 1;
}
.ep-subject-footer {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding: 6px 2px 2px;
}
.ep-subject-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 800;
  color: rgba(7,18,53,.85);
  margin-bottom: 5px;
}
.ep-subject-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(7,18,53,.14);
  overflow: hidden;
}
.ep-subject-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: rgba(7,18,53,.82);
}

/* ── Step 2: Units Selection ── */
.ep-s2-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  margin-bottom: 20px;
}
.ep-units-box {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.ep-unit-card {
  padding: 14px 12px;
  border-radius: 14px;
  border: 1.5px solid var(--ep-line);
  background: var(--ep-card-soft);
  cursor: pointer;
  transition: all .2s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
}
.ep-unit-card:hover {
  transform: translateY(-2px);
  border-color: rgba(37,99,235,.35);
  box-shadow: var(--ep-shadow-soft);
}
.ep-unit-card.active {
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 8px 18px rgba(37,99,235,.26);
}
.ep-unit-check-box {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: rgba(15,23,42,.08);
  color: transparent;
  transition: all .2s;
}
[data-theme="dark"] .ep-unit-check-box,
.dark .ep-unit-check-box {
  background: rgba(255,255,255,.12);
}
.ep-unit-card.active .ep-unit-check-box {
  background: rgba(255,255,255,.28);
  color: #fff;
}
.ep-unit-name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
}
.ep-unit-card.active .ep-unit-name {
  color: #fff;
}

/* Selection Summary Sidebar */
.ep-summary-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: var(--ep-card-soft);
  border: 1px solid var(--ep-line);
  margin-bottom: 14px;
}
.ep-summary-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 22px;
  flex-shrink: 0;
}
.ep-summary-subject {
  font-size: 16px;
  font-weight: 800;
  color: var(--ep-ink);
}
.ep-summary-meta {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ep-muted);
}
.ep-unit-pills-wrap {
  max-height: 180px;
  overflow-y: auto;
  padding: 10px;
  border-radius: 12px;
  background: var(--ep-card-soft);
  border: 1px solid var(--ep-line);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}
.ep-sel-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: rgba(37,99,235,.10);
  color: #2563eb;
  border: 1px solid rgba(37,99,235,.20);
  cursor: pointer;
  transition: all .18s;
}
[data-theme="dark"] .ep-sel-pill,
.dark .ep-sel-pill {
  background: rgba(56,189,248,.15);
  color: #38bdf8;
  border-color: rgba(56,189,248,.3);
}
.ep-sel-pill:hover {
  background: rgba(239,68,68,.14);
  color: #ef4444;
  border-color: rgba(239,68,68,.3);
}
.ep-tip-box {
  padding: 12px;
  border-radius: 12px;
  font-size: 11.5px;
  line-height: 1.5;
  font-weight: 600;
  background: rgba(37,99,235,.06);
  border: 1px solid rgba(37,99,235,.15);
  color: #2563eb;
}
[data-theme="dark"] .ep-tip-box,
.dark .ep-tip-box {
  background: rgba(56,189,248,.1);
  color: #38bdf8;
  border-color: rgba(56,189,248,.2);
}

/* ── Step 3: Exam Prep Hub ── */
.ep-hub-banner-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 22px;
  border-radius: 18px;
  background: rgba(255,255,255,.86);
  backdrop-filter: blur(14px);
  border: 1px solid var(--ep-line);
  box-shadow: var(--ep-shadow-soft);
  margin-bottom: 18px;
  flex-wrap: wrap;
}
[data-theme="dark"] .ep-hub-banner-card,
.dark .ep-hub-banner-card {
  background: rgba(23,31,58,.88);
  border-color: rgba(255,255,255,.12);
}
.ep-hub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 22px;
}
.ep-hub-card {
  border-radius: 20px;
  border: 1px solid var(--ep-line);
  background: var(--ep-card);
  box-shadow: var(--ep-shadow-soft);
  overflow: hidden;
  transition: all .25s cubic-bezier(.34,1.56,.64,1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
}
.ep-hub-card:hover:not(.disabled) {
  transform: translateY(-5px);
  box-shadow: var(--ep-shadow);
  border-color: rgba(37,99,235,.3);
}
.ep-hub-card.disabled {
  opacity: .75;
  cursor: not-allowed;
}
.ep-hub-stripe {
  height: 6px;
}
.ep-hub-body {
  padding: 22px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ep-hub-icon-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.ep-hub-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 24px;
}
.ep-hub-badge {
  font-size: 10.5px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.ep-hub-badge.blue {
  background: rgba(37,99,235,.12);
  color: #2563eb;
}
.ep-hub-badge.green {
  background: rgba(16,185,129,.12);
  color: #059669;
}
.ep-hub-badge.purple {
  background: rgba(139,92,246,.12);
  color: #7c3aed;
}
[data-theme="dark"] .ep-hub-badge.blue,
.dark .ep-hub-badge.blue {
  color: #60a5fa;
  background: rgba(96,165,250,.2);
}
[data-theme="dark"] .ep-hub-badge.green,
.dark .ep-hub-badge.green {
  color: #34d399;
  background: rgba(52,211,153,.2);
}
[data-theme="dark"] .ep-hub-badge.purple,
.dark .ep-hub-badge.purple {
  color: #c084fc;
  background: rgba(192,132,252,.2);
}
.ep-hub-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--ep-ink);
  margin-bottom: 8px;
}
.ep-hub-desc {
  font-size: 12.5px;
  color: var(--ep-muted);
  line-height: 1.6;
  margin-bottom: 14px;
}
.ep-hub-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ep-muted);
}
.ep-hub-meta b {
  color: var(--ep-ink);
  font-weight: 700;
}
.ep-hub-action-btn {
  margin-top: auto;
  border: 0;
  border-radius: 12px;
  padding: 11px 18px;
  font: 800 13px/1 'Plus Jakarta Sans', system-ui, sans-serif;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: transform .18s, filter .18s;
}
.ep-hub-action-btn.blue {
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  box-shadow: 0 4px 14px rgba(37,99,235,.3);
}
.ep-hub-action-btn.green {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 4px 14px rgba(16,185,129,.3);
}
.ep-hub-action-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.06);
}
.ep-hub-buddy-locked {
  margin-top: auto;
  border: 1.5px dashed rgba(139,92,246,.3);
  background: rgba(139,92,246,.07);
  border-radius: 12px;
  padding: 10px;
  font: 800 12.5px 'Plus Jakarta Sans', system-ui, sans-serif;
  color: #8b5cf6;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.ep-buddy-features {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 16px;
}
.ep-buddy-feat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ep-muted);
}
.ep-buddy-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8b5cf6;
  flex-shrink: 0;
}

/* ── Step 4: FAQs & Question Paper Views ── */
.ep-page-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.ep-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 12px;
  border: 1.5px solid var(--ep-line);
  background: var(--ep-card);
  color: var(--ep-muted);
  font: 800 12.5px 'Plus Jakarta Sans', system-ui, sans-serif;
  cursor: pointer;
  transition: all .18s;
  box-shadow: var(--ep-shadow-soft);
}
.ep-back-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
  transform: translateY(-1px);
}
[data-theme="dark"] .ep-back-btn,
.dark .ep-back-btn {
  color: #b5bfd8;
  border-color: rgba(255,255,255,.14);
}
[data-theme="dark"] .ep-back-btn:hover,
.dark .ep-back-btn:hover {
  border-color: #38bdf8;
  color: #38bdf8;
}

/* FAQ Layout */
.ep-faq-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.ep-faq-sidebar {
  background: var(--ep-card);
  border-radius: 18px;
  border: 1px solid var(--ep-line);
  box-shadow: var(--ep-shadow-soft);
  overflow: hidden;
  position: sticky;
  top: 80px;
}
.ep-faq-sb-head {
  padding: 14px 18px;
  border-bottom: 1px solid var(--ep-line);
  font-size: 11px;
  font-weight: 800;
  color: var(--ep-muted);
  text-transform: uppercase;
  letter-spacing: .06em;
}
.ep-faq-fi {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 18px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: var(--ep-muted);
  transition: all .15s;
}
.ep-faq-fi:hover {
  background: rgba(37,99,235,.05);
  color: #2563eb;
}
.ep-faq-fi.on {
  background: rgba(37,99,235,.10);
  color: #2563eb;
  font-weight: 800;
}
[data-theme="dark"] .ep-faq-fi:hover,
.dark .ep-faq-fi:hover {
  color: #38bdf8;
  background: rgba(56,189,248,.1);
}
[data-theme="dark"] .ep-faq-fi.on,
.dark .ep-faq-fi.on {
  color: #38bdf8;
  background: rgba(56,189,248,.15);
}
.ep-faq-fi-count {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(37,99,235,.1);
  color: #2563eb;
}
[data-theme="dark"] .ep-faq-fi-count,
.dark .ep-faq-fi-count {
  color: #38bdf8;
  background: rgba(56,189,248,.16);
}

.ep-faq-search-bar {
  background: var(--ep-card);
  border-radius: 14px;
  border: 1px solid var(--ep-line);
  padding: 12px 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: var(--ep-shadow-soft);
}
.ep-faq-si {
  flex: 1;
  border: none;
  background: transparent;
  font: 600 13.5px 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--ep-ink);
  outline: none;
}
.ep-faq-si::placeholder {
  color: var(--ep-faint);
}
.ep-faq-qonly-card {
  background: var(--ep-card);
  border-radius: 16px;
  border: 1px solid var(--ep-line);
  margin-bottom: 10px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: var(--ep-shadow-soft);
  transition: all .2s;
}
.ep-faq-qonly-card:hover {
  transform: translateY(-2px);
  border-color: rgba(37,99,235,.3);
  box-shadow: var(--ep-shadow);
}
.ep-faq-q-num {
  min-width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(37,99,235,.12), rgba(14,165,233,.12));
  border: 1px solid rgba(37,99,235,.2);
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
[data-theme="dark"] .ep-faq-q-num,
.dark .ep-faq-q-num {
  color: #38bdf8;
  border-color: rgba(56,189,248,.25);
  background: rgba(56,189,248,.14);
}
.ep-faq-q-body {
  flex: 1;
}
.ep-faq-q-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--ep-ink);
  line-height: 1.5;
  margin-bottom: 6px;
}
.ep-faq-unit-tag {
  display: inline-flex;
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 8px;
  background: rgba(37,99,235,.08);
  color: #2563eb;
}
[data-theme="dark"] .ep-faq-unit-tag,
.dark .ep-faq-unit-tag {
  color: #38bdf8;
  background: rgba(56,189,248,.12);
}

/* Question Paper Header & Sections */
.ep-paper-header {
  background: var(--ep-card);
  border-radius: 20px;
  border: 1px solid var(--ep-line);
  box-shadow: var(--ep-shadow-soft);
  padding: 22px 26px;
  margin-bottom: 16px;
  text-align: center;
  position: relative;
}
.ep-paper-school {
  font-size: 11px;
  font-weight: 800;
  color: var(--ep-muted);
  text-transform: uppercase;
  letter-spacing: .12em;
  margin-bottom: 6px;
}
.ep-paper-exam-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--ep-ink);
  margin-bottom: 4px;
}
.ep-paper-subject {
  font-size: 14px;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 16px;
}
[data-theme="dark"] .ep-paper-subject,
.dark .ep-paper-subject {
  color: #38bdf8;
}
.ep-paper-meta-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 18px;
  background: var(--ep-card-soft);
  border-radius: 14px;
  border: 1px solid var(--ep-line);
}
.ep-paper-meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ep-paper-meta-val {
  font-size: 16px;
  font-weight: 800;
  color: var(--ep-ink);
}
.ep-paper-meta-lbl {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--ep-muted);
  text-transform: uppercase;
  letter-spacing: .06em;
}
.ep-paper-print-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 12px;
  border: 1.5px solid rgba(37,99,235,.25);
  background: rgba(37,99,235,.08);
  font: 800 12.5px 'Plus Jakarta Sans', system-ui, sans-serif;
  color: #2563eb;
  cursor: pointer;
  transition: all .18s;
}
.ep-paper-print-btn:hover {
  background: rgba(37,99,235,.15);
  transform: translateY(-1px);
}
[data-theme="dark"] .ep-paper-print-btn,
.dark .ep-paper-print-btn {
  color: #38bdf8;
  border-color: rgba(56,189,248,.3);
  background: rgba(56,189,248,.12);
}

/* Part Section Header */
.ep-part-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 18px;
  background: var(--ep-card);
  border: 1px solid var(--ep-line);
  box-shadow: var(--ep-shadow-soft);
  margin-bottom: 14px;
}
.ep-part-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ep-part-badge {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 900;
  color: #fff;
  flex-shrink: 0;
}
.ep-part-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--ep-ink);
}
.ep-part-subtitle {
  font-size: 12px;
  color: var(--ep-muted);
  margin-top: 2px;
}
.ep-part-tag {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
}

/* Part theme colors */
.ep-part1 .ep-part-badge { background: linear-gradient(135deg, #2563eb, #0ea5e9); }
.ep-part1 .ep-part-tag { background: rgba(37,99,235,.1); color: #2563eb; }
.ep-part2 .ep-part-badge { background: linear-gradient(135deg, #10b981, #059669); }
.ep-part2 .ep-part-tag { background: rgba(16,185,129,.1); color: #059669; }
.ep-part3 .ep-part-badge { background: linear-gradient(135deg, #f59e0b, #d97706); }
.ep-part3 .ep-part-tag { background: rgba(245,158,11,.1); color: #d97706; }
.ep-part4 .ep-part-badge { background: linear-gradient(135deg, #ef4444, #dc2626); }
.ep-part4 .ep-part-tag { background: rgba(239,68,68,.1); color: #dc2626; }

/* Question item bubble */
.ep-paper-question-bubble {
  background: var(--ep-card);
  border: 1px solid var(--ep-line);
  color: var(--ep-ink);
  border-radius: 4px 18px 18px 18px;
  box-shadow: var(--ep-shadow-soft);
  padding: 16px 20px;
  flex: 1;
  transition: all .18s ease;
}
.ep-paper-question-bubble:hover {
  transform: translateY(-2px);
  box-shadow: var(--ep-shadow);
  border-color: rgba(37,99,235,.28);
}
.ep-paper-answer-space {
  margin: 10px 0 0 46px;
  height: 24px;
  border-bottom: 1px dashed var(--ep-line);
  opacity: .7;
}

/* Bottom Navigation */
.ep-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--ep-line);
}
.ep-btn-prev {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 11px 20px;
  border-radius: 14px;
  border: 1.5px solid var(--ep-line);
  background: var(--ep-card);
  font: 800 13px 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--ep-muted);
  cursor: pointer;
  transition: all .2s;
}
.ep-btn-prev:hover {
  border-color: #2563eb;
  color: #2563eb;
}
[data-theme="dark"] .ep-btn-prev,
.dark .ep-btn-prev {
  border-color: rgba(255,255,255,.14);
  color: #b5bfd8;
}
.ep-btn-next {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 14px;
  border: 0;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
  font: 800 13.5px 'Plus Jakarta Sans', system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(14,165,233,.28);
  transition: all .2s;
}
.ep-btn-next:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 26px rgba(14,165,233,.38);
}
.ep-btn-next:disabled {
  opacity: .5;
  cursor: not-allowed;
  transform: none;
}

.ep-empty {
  text-align: center;
  padding: 44px 20px;
  color: var(--ep-muted);
  font-size: 13.5px;
  font-weight: 600;
  background: var(--ep-card);
  border-radius: 18px;
  border: 1px solid var(--ep-line);
}
.ep-empty-icon {
  font-size: 38px;
  margin-bottom: 8px;
}

/* ── Responsive Media Queries ── */
@media(max-width: 1080px) {
  .ep-subject-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .ep-hub-grid {
    grid-template-columns: 1fr 1fr;
  }
  .ep-units-box {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media(max-width: 860px) {
  .ep-hero {
    grid-template-columns: 1fr;
    padding: 20px;
  }
  .ep-hero-panel {
    display: none;
  }
  .ep-s2-grid {
    grid-template-columns: 1fr;
  }
  .ep-faq-layout {
    grid-template-columns: 1fr;
  }
  .ep-faq-sidebar {
    position: static;
    margin-bottom: 14px;
  }
  .ep-paper-meta-row {
    gap: 8px;
  }
}

@media(max-width: 640px) {
  .ep-shell {
    padding: 12px 12px 50px;
  }
  .ep-greeting {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .ep-mini-stats {
    width: 100%;
    justify-content: space-between;
  }
  .ep-mini-pill {
    flex: 1;
    min-width: 0;
    padding: 8px 8px;
  }
  .ep-hero {
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 16px;
  }
  .ep-hero-title {
    font-size: 20px;
  }
  .ep-subject-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .ep-subject {
    min-height: 180px;
    padding: 12px 10px;
  }
  .ep-subject-visual {
    min-height: 80px;
  }
  .ep-subject-art-img {
    width: 78px;
    height: 70px;
  }
  .ep-hub-grid {
    grid-template-columns: 1fr;
  }
  .ep-units-box {
    grid-template-columns: 1fr;
  }
  .ep-step-lbl {
    display: none;
  }
  .ep-steps-bar {
    padding: 12px 16px;
  }
  .ep-step-line {
    margin-bottom: 0;
  }
  .ep-nav {
    flex-direction: column;
  }
  .ep-btn-prev, .ep-btn-next {
    width: 100%;
    justify-content: center;
  }
}

@media(max-width: 420px) {
  .ep-subject-grid {
    grid-template-columns: 1fr;
  }
}

@media print {
  .ep-hero, .ep-steps-bar, .ep-page-topbar, .ep-paper-print-btn, .ep-nav, .ep-back-btn, nav {
    display: none !important;
  }
  .ep-root {
    background: #fff !important;
    color: #000 !important;
    padding: 0 !important;
  }
  .ep-shell {
    max-width: 100% !important;
    padding: 0 !important;
  }
  .ep-paper-header, .ep-part-header, .ep-paper-question-bubble {
    box-shadow: none !important;
    border: 1px solid #ccc !important;
    background: #fff !important;
    color: #000 !important;
  }
  .ep-paper-answer-space {
    border-bottom: 1px solid #999 !important;
    opacity: 1 !important;
  }
}
`;

// ── Subjects Data with Dashboard 3D Artwork ──
const SUBJECTS = [
  {
    name: "Mathematics",
    emoji: "🧮",
    image: mathsSubject,
    color: "#ff6b4a",
    bg: "linear-gradient(135deg, #ffcf5a, #ff7b54)",
    units: [
      "Algebra",
      "Calculus",
      "Statistics",
      "Geometry",
      "Trigonometry",
      "Number Theory",
    ],
  },
  {
    name: "Physics",
    emoji: "⚡",
    image: scienceSubject,
    color: "#2563eb",
    bg: "linear-gradient(135deg, #6ee7f2, #2389ff)",
    units: [
      "Mechanics",
      "Thermodynamics",
      "Electromagnetism",
      "Optics",
      "Waves",
      "Modern Physics",
    ],
  },
  {
    name: "Chemistry",
    emoji: "🧪",
    image: scienceSubject,
    color: "#10b981",
    bg: "linear-gradient(135deg, #83e76d, #27b86a)",
    units: [
      "Organic",
      "Inorganic",
      "Physical",
      "Analytical",
      "Biochemistry",
      "Polymer",
    ],
  },
  {
    name: "Biology",
    emoji: "🌿",
    image: scienceSubject,
    color: "#f59e0b",
    bg: "linear-gradient(135deg, #ffd77d, #ff9c52)",
    units: [
      "Cell Biology",
      "Genetics",
      "Ecology",
      "Human Physiology",
      "Botany",
      "Zoology",
    ],
  },
  {
    name: "History",
    emoji: "🌍",
    image: socialSubject,
    color: "#8b5cf6",
    bg: "linear-gradient(135deg, #b48cff, #7e45e8)",
    units: [
      "Ancient",
      "Medieval",
      "Modern",
      "World Wars",
      "Independence",
      "Post-Independence",
    ],
  },
];

const FAQS_DATA: Record<string, { q: string; unit: string }[]> = {
  Mathematics: [
    { q: "What is the quadratic formula?", unit: "Algebra" },
    { q: "Explain the power rule in differentiation.", unit: "Calculus" },
    { q: "What is the fundamental theorem of calculus?", unit: "Calculus" },
    { q: "How do you calculate standard deviation?", unit: "Statistics" },
    { q: "State the Pythagorean theorem.", unit: "Geometry" },
    { q: "What is sin(30°)?", unit: "Trigonometry" },
    { q: "Explain the chain rule in differentiation.", unit: "Calculus" },
    { q: "What is a prime number? Give examples.", unit: "Number Theory" },
  ],
  Physics: [
    { q: "State Newton's second law of motion.", unit: "Mechanics" },
    {
      q: "What does the first law of thermodynamics state?",
      unit: "Thermodynamics",
    },
    { q: "State Ohm's law.", unit: "Electromagnetism" },
    { q: "What is total internal reflection?", unit: "Optics" },
    { q: "Define amplitude and frequency of a wave.", unit: "Waves" },
    { q: "What is the photoelectric effect?", unit: "Modern Physics" },
  ],
  Chemistry: [
    { q: "What is Avogadro's number?", unit: "Physical" },
    { q: "State Le Chatelier's principle.", unit: "Physical" },
    { q: "What is an electrophile?", unit: "Organic" },
    { q: "Explain ionic bonding with an example.", unit: "Inorganic" },
    { q: "What is chromatography used for?", unit: "Analytical" },
  ],
  Biology: [
    { q: "Describe the central dogma of molecular biology.", unit: "Genetics" },
    { q: "What is osmosis?", unit: "Cell Biology" },
    { q: "What is the role of mitochondria?", unit: "Cell Biology" },
    { q: "Explain the food chain concept.", unit: "Ecology" },
    { q: "What is transpiration in plants?", unit: "Botany" },
  ],
  History: [
    { q: "When did World War I begin and end?", unit: "World Wars" },
    { q: "What caused the French Revolution?", unit: "Modern" },
    { q: "When did India gain independence?", unit: "Independence" },
    { q: "Who was Ashoka and why is he important?", unit: "Ancient" },
    { q: "What was the significance of the Magna Carta?", unit: "Medieval" },
  ],
};

const PAPER_DATA: Record<
  string,
  {
    part1: { q: string; unit: string }[];
    part2: { q: string; unit: string }[];
    part3: { q: string; unit: string }[];
    part4: { q: string; unit: string }[];
  }
> = {
  Mathematics: {
    part1: [
      { q: "What is the value of sin(90°)?", unit: "Trigonometry" },
      { q: "Simplify: (x²)(x³)", unit: "Algebra" },
      { q: "What is the area of a square with side 4 units?", unit: "Geometry" },
      { q: "Define 'mean' in statistics.", unit: "Statistics" },
      { q: "What is the derivative of a constant?", unit: "Calculus" },
      { q: "Is 17 a prime number? (Yes/No)", unit: "Number Theory" },
    ],
    part2: [
      { q: "Solve: 3x + 7 = 22. Find x.", unit: "Algebra" },
      { q: "Find the derivative of f(x) = 5x³ − 2x + 1.", unit: "Calculus" },
      { q: "Two angles of a triangle are 60° and 80°. Find the third angle.", unit: "Geometry" },
      { q: "If the mean of 5, 7, x is 8, find x.", unit: "Statistics" },
      { q: "Convert 135° to radians.", unit: "Trigonometry" },
    ],
    part3: [
      {
        q: "Solve the quadratic equation 2x² − 5x + 3 = 0 using the quadratic formula. Show all steps.",
        unit: "Algebra",
      },
      {
        q: "Find the area under the curve y = 3x² from x = 0 to x = 3 using definite integration.",
        unit: "Calculus",
      },
      {
        q: "Calculate the standard deviation of the data set: 4, 8, 6, 5, 3, 2, 8, 9, 2, 5.",
        unit: "Statistics",
      },
      {
        q: "Prove that sin²θ + cos²θ = 1 using a right-angled triangle.",
        unit: "Trigonometry",
      },
    ],
    part4: [
      {
        q: "A company's revenue (in ₹ lakhs) over 5 years is: 12, 18, 15, 22, 30. (a) Find the mean revenue. (b) Find the variance and standard deviation. (c) Interpret your results and predict the trend for year 6.",
        unit: "Statistics",
      },
      {
        q: "Derive the formula for the surface area and volume of a sphere of radius r. Using these formulas, find the total surface area and volume of a sphere whose diameter is 14 cm. (Use π = 22/7)",
        unit: "Geometry",
      },
    ],
  },
  Physics: {
    part1: [
      { q: "What is the SI unit of force?", unit: "Mechanics" },
      { q: "State one example of a conductor.", unit: "Electromagnetism" },
      { q: "What is the speed of light in vacuum (approx)?", unit: "Optics" },
      { q: "Define frequency of a wave.", unit: "Waves" },
      { q: "Name the scientist who proposed the photoelectric effect.", unit: "Modern Physics" },
      { q: "What is absolute zero temperature?", unit: "Thermodynamics" },
    ],
    part2: [
      { q: "A body of mass 10 kg is moving with a velocity of 5 m/s. Find its kinetic energy.", unit: "Mechanics" },
      { q: "State and explain Ohm's Law with a diagram.", unit: "Electromagnetism" },
      { q: "Define critical angle. What happens at angles greater than critical angle?", unit: "Optics" },
      { q: "Differentiate between transverse and longitudinal waves with examples.", unit: "Waves" },
      { q: "State the first law of thermodynamics and write its mathematical form.", unit: "Thermodynamics" },
    ],
    part3: [
      {
        q: "A ball is thrown vertically upward with an initial velocity of 20 m/s. Find (a) the maximum height reached, (b) the time to reach the maximum height, and (c) the total time of flight. (g = 10 m/s²)",
        unit: "Mechanics",
      },
      {
        q: "Three resistors of 2Ω, 3Ω, and 6Ω are connected in parallel. Find the equivalent resistance. If a 12V battery is connected across this combination, find the current through each resistor.",
        unit: "Electromagnetism",
      },
      {
        q: "Explain the phenomenon of total internal reflection with a neat diagram. Derive the expression for critical angle in terms of refractive indices.",
        unit: "Optics",
      },
      {
        q: "Explain the working principle of a heat engine. Define efficiency and derive the expression for Carnot efficiency.",
        unit: "Thermodynamics",
      },
    ],
    part4: [
      {
        q: "A charged particle of mass 2×10⁻²⁷ kg and charge 1.6×10⁻¹⁹ C is accelerated through a potential difference of 1000 V. It then enters a uniform magnetic field of 0.1 T perpendicular to its velocity. (a) Find the velocity of the particle after acceleration. (b) Find the radius of the circular path in the magnetic field. (c) Calculate the time period of revolution. (d) What happens to the radius if the particle is replaced by a heavier isotope?",
        unit: "Electromagnetism",
      },
      {
        q: "With a neat labelled diagram, explain the construction and working of a compound microscope. Derive the expression for its total magnification when the final image is formed at the near point (D = 25 cm). State any two differences between a microscope and a telescope.",
        unit: "Optics",
      },
    ],
  },
  Chemistry: {
    part1: [
      { q: "What is the molecular formula of water?", unit: "Inorganic" },
      { q: "State the number of particles in 1 mole of a substance.", unit: "Physical" },
      { q: "Is NaCl an ionic or covalent compound?", unit: "Inorganic" },
      { q: "Name the functional group present in alcohols.", unit: "Organic" },
      { q: "Define pH.", unit: "Analytical" },
      { q: "What is a monomer?", unit: "Polymer" },
    ],
    part2: [
      { q: "Calculate the number of moles in 36 g of water (M = 18 g/mol).", unit: "Physical" },
      { q: "State Le Chatelier's principle and give one example of its application.", unit: "Physical" },
      { q: "Differentiate between electrophile and nucleophile.", unit: "Organic" },
      { q: "What is paper chromatography? Mention one application.", unit: "Analytical" },
      { q: "Define addition polymerization with an example.", unit: "Polymer" },
    ],
    part3: [
      {
        q: "Explain the mechanism of SN1 reaction with a suitable example. Draw the energy profile diagram and identify the rate-determining step.",
        unit: "Organic",
      },
      {
        q: "State and explain Le Chatelier's principle. Apply it to the Haber process for synthesis of ammonia, explaining the effect of temperature, pressure, and concentration.",
        unit: "Physical",
      },
      {
        q: "Describe the principle and procedure of thin-layer chromatography (TLC). How is Rf value calculated and what does it indicate?",
        unit: "Analytical",
      },
      {
        q: "Explain ionic product of water (Kw). Derive the relationship between pH and pOH. Calculate the pH of a 0.01 M HCl solution.",
        unit: "Physical",
      },
    ],
    part4: [
      {
        q: "(a) Explain the concept of hybridization in carbon. Draw and describe the geometry of sp, sp², and sp³ hybridized carbon atoms with suitable examples. (b) Explain the structure of benzene using the concept of resonance. Why does benzene prefer electrophilic substitution over addition reactions? Give two examples of electrophilic substitution in benzene.",
        unit: "Organic",
      },
      {
        q: "Write a detailed note on coordination polymers: (a) Define coordination polymers and distinguish them from addition and condensation polymers. (b) Explain the mechanism of condensation polymerization with the synthesis of Nylon-6,6. (c) Discuss the properties and applications of Bakelite in industrial contexts. (d) What are biodegradable polymers? Give two examples and explain their significance.",
        unit: "Polymer",
      },
    ],
  },
  Biology: {
    part1: [
      { q: "What is the powerhouse of the cell?", unit: "Cell Biology" },
      { q: "Name the molecule that carries genetic information.", unit: "Genetics" },
      { q: "Define ecology.", unit: "Ecology" },
      { q: "What is the function of the heart?", unit: "Human Physiology" },
      { q: "Name one example of a gymnosperm plant.", unit: "Botany" },
      { q: "What is metamorphosis in insects?", unit: "Zoology" },
    ],
    part2: [
      { q: "Differentiate between mitosis and meiosis.", unit: "Genetics" },
      { q: "What is osmosis? How does it differ from diffusion?", unit: "Cell Biology" },
      { q: "Explain the concept of a food web with a simple example.", unit: "Ecology" },
      { q: "What is the role of haemoglobin in the blood?", unit: "Human Physiology" },
      { q: "Define transpiration. State its importance in plants.", unit: "Botany" },
    ],
    part3: [
      {
        q: "Explain the process of DNA replication with a neat diagram. Identify the key enzymes involved and describe the roles of each.",
        unit: "Genetics",
      },
      {
        q: "Describe the light-dependent and light-independent reactions of photosynthesis. Where in the chloroplast does each stage occur?",
        unit: "Botany",
      },
      {
        q: "Explain the mechanism of nerve impulse transmission across a synapse. Include the role of neurotransmitters.",
        unit: "Human Physiology",
      },
      {
        q: "Define ecological succession. Explain primary succession with an example from a bare rock ecosystem.",
        unit: "Ecology",
      },
    ],
    part4: [
      {
        q: "The human immune system is the body's defense against disease. (a) Distinguish between innate and adaptive immunity. (b) Explain the role of B-lymphocytes and T-lymphocytes in immune response. (c) Describe how vaccines stimulate immunity. (d) What is an autoimmune disease? Give two examples and explain the underlying mechanism.",
        unit: "Human Physiology",
      },
      {
        q: "Write a comprehensive account of Mendelian genetics: (a) State Mendel's Law of Segregation and Law of Independent Assortment. (b) Solve a dihybrid cross for seed color (yellow/green) and seed shape (round/wrinkled). (c) Explain codominance with the example of ABO blood group system. (d) What are sex-linked traits? Give one example and explain its inheritance pattern.",
        unit: "Genetics",
      },
    ],
  },
  History: {
    part1: [
      { q: "In which year did India gain independence?", unit: "Independence" },
      { q: "Who was the first Prime Minister of India?", unit: "Independence" },
      { q: "Name the treaty that ended World War I.", unit: "World Wars" },
      { q: "Which empire did Alexander the Great build?", unit: "Ancient" },
      { q: "What does 'Renaissance' mean?", unit: "Medieval" },
      { q: "In which year did the Berlin Wall fall?", unit: "Post-Independence" },
    ],
    part2: [
      { q: "What were the main causes of World War II?", unit: "World Wars" },
      { q: "Briefly explain the significance of the Magna Carta.", unit: "Medieval" },
      { q: "Who led the Non-Cooperation Movement in India? Describe its significance.", unit: "Independence" },
      { q: "What was the French Revolution? Mention its immediate causes.", unit: "Modern" },
      { q: "Explain the concept of the Cold War between the USA and USSR.", unit: "Post-Independence" },
    ],
    part3: [
      {
        q: "Explain the causes and consequences of the First World War. How did it reshape the political map of Europe? What role did the Treaty of Versailles play in sowing the seeds of World War II?",
        unit: "World Wars",
      },
      {
        q: "Trace the role of Mahatma Gandhi in India's independence movement. Discuss the Dandi March and its significance in the context of the Civil Disobedience Movement.",
        unit: "Independence",
      },
      {
        q: "Describe the major achievements of the Mauryan Empire under Emperor Ashoka. How did his conversion to Buddhism influence governance and foreign policy?",
        unit: "Ancient",
      },
      {
        q: "Explain the causes and outcomes of the French Revolution. How did the Declaration of the Rights of Man and Citizen reflect Enlightenment ideals?",
        unit: "Modern",
      },
    ],
    part4: [
      {
        q: "The Second World War (1939–1945) was one of the most devastating conflicts in human history. (a) Analyze the long-term and immediate causes of World War II, including the role of appeasement policy. (b) Describe the major turning points of the war — Battle of Stalingrad, D-Day, and the Pacific Theatre. (c) Critically evaluate the use of atomic bombs on Hiroshima and Nagasaki. Was it justified? (d) Explain how the war led to the formation of the United Nations and the beginning of the Cold War.",
        unit: "World Wars",
      },
      {
        q: "Indian civilization has evolved over thousands of years across distinct phases. (a) Describe the key features of the Indus Valley Civilization — urban planning, trade, and decline. (b) Explain the political and cultural achievements of the Gupta Empire — often called India's Golden Age. (c) Assess the impact of British colonial rule on India's economy, society, and political consciousness. (d) How did the partition of India in 1947 unfold, and what were its immediate and long-term consequences for the subcontinent?",
        unit: "Ancient",
      },
    ],
  },
};

const STEPS = [
  { id: 1, label: "Subject", icon: "📚" },
  { id: 2, label: "Units", icon: "📑" },
  { id: 3, label: "Prep Hub", icon: "🎯" },
  { id: 4, label: "Study", icon: "📝" },
];

const PARTS = [
  {
    key: "part1",
    label: "Part A",
    marks: 1,
    desc: "Very Short Answer Questions",
    cls: "ep-part1",
    icon: "①",
  },
  {
    key: "part2",
    label: "Part B",
    marks: 2,
    desc: "Short Answer Questions",
    cls: "ep-part2",
    icon: "②",
  },
  {
    key: "part3",
    label: "Part C",
    marks: 5,
    desc: "Long Answer Questions",
    cls: "ep-part3",
    icon: "③",
  },
  {
    key: "part4",
    label: "Part D",
    marks: 10,
    desc: "Essay / Analytical Questions",
    cls: "ep-part4",
    icon: "④",
  },
];

export default function ExamPreparationPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"" | "faq" | "qbank">("");
  const [subjIdx, setSubjIdx] = useState(0);
  const [units, setUnits] = useState<string[]>(["Algebra", "Calculus"]);
  const [faqSearch, setFaqSearch] = useState("");
  const [faqFilter, setFaqFilter] = useState("All");
  const [currentRole, setCurrentRole] = useState("student");
  const [activePart, setActivePart] = useState("part1");

  const subj = SUBJECTS[subjIdx];
  const firstName = user?.firstName || "Student";

  useEffect(() => {
    setUnits([SUBJECTS[subjIdx].units[0], SUBJECTS[subjIdx].units[1]]);
    setFaqSearch("");
    setFaqFilter("All");
    setActivePart("part1");
  }, [subjIdx]);

  const toggleUnit = (u: string) =>
    setUnits((p) => (p.includes(u) ? p.filter((x) => x !== u) : [...p, u]));
  const allSel = units.length === subj.units.length;

  const allFaqs = FAQS_DATA[subj.name] || [];
  const unitFaqs =
    faqFilter === "All" ? allFaqs : allFaqs.filter((f) => f.unit === faqFilter);
  const displayFaqs = !faqSearch
    ? unitFaqs
    : unitFaqs.filter((f) =>
        f.q.toLowerCase().includes(faqSearch.toLowerCase())
      );

  const paperData = PAPER_DATA[subj.name];

  const getFilteredPart = (partKey: string) => {
    const qs = (paperData as any)[partKey] as { q: string; unit: string }[];
    return units.length === 0
      ? qs
      : qs.filter((q) => units.includes(q.unit) || true);
  };

  const totalMarks = PARTS.reduce((acc, p) => {
    const qs = getFilteredPart(p.key);
    return acc + qs.length * p.marks;
  }, 0);

  const totalQs = PARTS.reduce(
    (acc, p) => acc + getFilteredPart(p.key).length,
    0
  );

  const goBack = () => {
    if (mode) {
      setMode("");
      setStep(3);
    } else if (step > 1) setStep((s) => s - 1);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ep-root">
        {/* Navigation Bar */}
        <Navigation currentRole={currentRole as any} onRoleChange={setCurrentRole as any} />

        {/* Floating background ambience */}
        <span className="ep-bg-ribbon" aria-hidden />
        <span className="ep-bg-spark s1" aria-hidden />
        <span className="ep-bg-spark s2" aria-hidden />
        <span className="ep-bg-spark s3" aria-hidden />

        <div className="ep-shell">
          {/* Greeting & Quick Badges */}
          <div className="ep-greeting">
            <div>
              <div className="ep-title">Hey {firstName}! 🎯 Ready for Exams?</div>
              <div className="ep-subtitle">
                Master your subjects step-by-step with curated FAQs and comprehensive model question papers.
              </div>
            </div>
            <div className="ep-mini-stats">
              <div className="ep-mini-pill">
                <div className="ep-pill-ico">📚</div>
                <div>
                  <div className="ep-pill-num">5</div>
                  <div className="ep-pill-label">Subjects</div>
                </div>
              </div>
              <div className="ep-mini-pill">
                <div className="ep-pill-ico">❓</div>
                <div>
                  <div className="ep-pill-num">35+</div>
                  <div className="ep-pill-label">FAQs</div>
                </div>
              </div>
              <div className="ep-mini-pill">
                <div className="ep-pill-ico">📝</div>
                <div>
                  <div className="ep-pill-num">4 Parts</div>
                  <div className="ep-pill-label">Paper</div>
                </div>
              </div>
              <div className="ep-mini-pill">
                <div className="ep-pill-ico">🤖</div>
                <div>
                  <div className="ep-pill-num">AI Ready</div>
                  <div className="ep-pill-label">Buddy</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Hero Banner with Robot ── */}
          <motion.section
            className="ep-hero"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38 }}
          >
            <div className="ep-hero-content">
              <div className="ep-chip">
                <Sparkles size={14} /> AI-Powered Exam Readiness
              </div>
              <h1 className="ep-hero-title">Ace Your Exams with Confidence!</h1>
              <p className="ep-hero-desc">
                Follow our proven 4-stage study path: pick your subject, pinpoint key units, explore high-yield FAQs, and practice realistic model exam papers.
              </p>
              <div className="ep-hero-progress-line">
                <div className="ep-hero-track">
                  <div
                    className="ep-hero-fill"
                    style={{ width: `${Math.round((units.length / subj.units.length) * 100)}%` }}
                  />
                </div>
                <div className="ep-hero-progress-text">
                  {units.length}/{subj.units.length} Units Chosen
                </div>
              </div>
              <button
                className="ep-primary-btn"
                onClick={() => {
                  if (step === 1) setStep(2);
                  else if (step === 2) setStep(3);
                  else if (step === 3) {
                    setMode("qbank");
                    setStep(4);
                  }
                }}
              >
                {step === 1 && "Select Units >"}
                {step === 2 && "Open Prep Hub >"}
                {step === 3 && "Practice Question Paper >"}
                {step === 4 && "Continue Study >"}
              </button>
            </div>

            {/* Robot Mascot Stage */}
            <div className="ep-hero-panel" aria-hidden>
              <div className="ep-hero-orbit">
                <img
                  src={studyRobo || roboImg}
                  alt="Exam Robot Mascot"
                  className="ep-hero-robo-img"
                  onError={(e) => {
                    // Fallback to secondary robot image if needed
                    e.currentTarget.src = roboImg;
                  }}
                />
              </div>
              <div className="ep-hero-stats">
                <div className="ep-hero-stat">
                  <b>{subj.name.slice(0, 5)}</b>
                  <span>Target</span>
                </div>
                <div className="ep-hero-stat">
                  <b>{units.length} Units</b>
                  <span>Focused</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ── Steps Navigation Bar ── */}
          {!mode && (
            <div className="ep-steps-bar">
              {STEPS.map((s, i) => {
                const state =
                  step > s.id ? "done" : step === s.id ? "active" : "pending";
                return (
                  <div key={s.id} className="ep-step-item">
                    <div className="ep-step-node">
                      <div
                        className={`ep-step-circle ${state}`}
                        onClick={() => {
                          if (step > s.id) setStep(s.id);
                        }}
                      >
                        {state === "done" ? <Check size={16} /> : s.id}
                      </div>
                      <div className={`ep-step-lbl ${state}`}>{s.label}</div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`ep-step-line ${
                          step > s.id ? "filled" : "empty"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── STEP 1: CHOOSE SUBJECT ── */}
          <AnimatePresence mode="wait">
            {!mode && step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="ep-section-head">
                  <div>
                    <h2 className="ep-section-title">1. Choose a Subject</h2>
                    <div className="ep-section-sub">
                      Select the subject you want to prepare for your upcoming test.
                    </div>
                  </div>
                </div>

                <div className="ep-subject-grid">
                  {SUBJECTS.map((s, i) => {
                    const isSelected = i === subjIdx;
                    return (
                      <motion.div
                        key={s.name}
                        className={`ep-subject${isSelected ? " selected" : ""}`}
                        style={{
                          "--subject-bg": s.bg,
                          "--delay": `${i * -0.2}s`,
                        } as any}
                        onClick={() => setSubjIdx(i)}
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        {isSelected && (
                          <div className="ep-subject-check">
                            <Check size={14} />
                          </div>
                        )}
                        <div className="ep-subject-name">{s.name}</div>
                        <div className="ep-subject-visual">
                          {s.image ? (
                            <img
                              src={s.image}
                              alt={s.name}
                              className="ep-subject-art-img"
                              aria-hidden
                            />
                          ) : (
                            <span className="ep-subject-emoji-art">{s.emoji}</span>
                          )}
                        </div>
                        <div className="ep-subject-footer">
                          <div className="ep-subject-meta">
                            <span>{s.units.length} Units</span>
                            <span>Ready</span>
                          </div>
                          <div className="ep-subject-bar">
                            <span style={{ width: "100%" }} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="ep-nav">
                  <div />
                  <button className="ep-btn-next" onClick={() => setStep(2)}>
                    Next: Select Units <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: SELECT UNITS ── */}
            {!mode && step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="ep-section-head">
                  <div>
                    <h2 className="ep-section-title">
                      {subj.emoji} {subj.name} — Select Exam Units
                    </h2>
                    <div className="ep-section-sub">
                      Pick the topics you wish to study. You can select single or multiple units.
                    </div>
                  </div>
                </div>

                <div className="ep-s2-grid">
                  {/* Units selector card */}
                  <div className="ep-card" style={{ marginBottom: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ep-ink)" }}>
                        📌 Available Units ({subj.units.length})
                      </span>
                      <button
                        onClick={() => setUnits(allSel ? [] : subj.units.slice())}
                        style={{
                          border: "none",
                          background: "rgba(37,99,235,.1)",
                          color: "#2563eb",
                          borderRadius: 999,
                          padding: "5px 14px",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {allSel ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="ep-units-box">
                      {subj.units.map((u) => {
                        const active = units.includes(u);
                        return (
                          <div
                            key={u}
                            onClick={() => toggleUnit(u)}
                            className={`ep-unit-card${active ? " active" : ""}`}
                          >
                            <div className="ep-unit-check-box">
                              {active && <Check size={14} />}
                            </div>
                            <span className="ep-unit-name">{u}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selection summary sidebar */}
                  <div className="ep-card" style={{ marginBottom: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 14,
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ep-ink)" }}>
                        📋 Your Selection
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: "rgba(37,99,235,.12)",
                          color: "#2563eb",
                        }}
                      >
                        {units.length} / {subj.units.length}
                      </span>
                    </div>

                    <div className="ep-summary-hero">
                      <div className="ep-summary-icon" style={{ background: "rgba(37,99,235,.1)" }}>
                        {subj.emoji}
                      </div>
                      <div>
                        <div className="ep-summary-subject">{subj.name}</div>
                        <div className="ep-summary-meta">
                          {units.length === 0
                            ? "No units chosen"
                            : `${units.length} unit${units.length !== 1 ? "s" : ""} selected`}
                        </div>
                      </div>
                    </div>

                    <div className="ep-unit-pills-wrap">
                      {units.length === 0 ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--ep-muted)",
                            textAlign: "center",
                            width: "100%",
                            padding: "20px 0",
                          }}
                        >
                          Click any unit to add it to your preparation list
                        </div>
                      ) : (
                        units.map((u) => (
                          <span
                            key={u}
                            className="ep-sel-pill"
                            onClick={() => toggleUnit(u)}
                            title="Click to remove"
                          >
                            {u} <X size={12} />
                          </span>
                        ))
                      )}
                    </div>

                    {units.length > 0 && (
                      <div className="ep-tip-box">
                        💡 Your FAQs and model exam paper will focus on:{" "}
                        <b>{units.join(", ")}</b>.
                      </div>
                    )}
                  </div>
                </div>

                <div className="ep-nav">
                  <button className="ep-btn-prev" onClick={() => setStep(1)}>
                    <ArrowLeft size={16} /> Back to Subjects
                  </button>
                  <button
                    className="ep-btn-next"
                    disabled={units.length === 0}
                    onClick={() => setStep(3)}
                  >
                    Start Preparation <Sparkles size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: PREP HUB ── */}
            {!mode && step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="ep-hub-banner-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 26,
                        background: "rgba(37,99,235,.1)",
                      }}
                    >
                      {subj.emoji}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ep-ink)" }}>
                        {subj.name} Preparation Hub
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ep-muted)" }}>
                        {units.length} unit{units.length !== 1 ? "s" : ""} selected for exam drill
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {units.slice(0, 4).map((u) => (
                      <span
                        key={u}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "rgba(37,99,235,.1)",
                          color: "#2563eb",
                        }}
                      >
                        {u}
                      </span>
                    ))}
                    {units.length > 4 && (
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
                          background: "var(--ep-card-soft)",
                          color: "var(--ep-muted)",
                        }}
                      >
                        +{units.length - 4} more
                      </span>
                    )}
                    <button
                      onClick={() => setStep(2)}
                      style={{
                        border: "1.5px solid var(--ep-line)",
                        background: "var(--ep-card)",
                        borderRadius: 10,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--ep-muted)",
                        cursor: "pointer",
                      }}
                    >
                      Change Units
                    </button>
                  </div>
                </div>

                <div className="ep-hub-grid">
                  {/* Card 1: FAQs & Exercises */}
                  <div
                    className="ep-hub-card"
                    onClick={() => {
                      setMode("faq");
                      setStep(4);
                    }}
                  >
                    <div
                      className="ep-hub-stripe"
                      style={{ background: "linear-gradient(90deg, #2563eb, #0ea5e9)" }}
                    />
                    <div className="ep-hub-body">
                      <div className="ep-hub-icon-row">
                        <div className="ep-hub-icon" style={{ background: "rgba(37,99,235,.1)" }}>
                          ❓
                        </div>
                        <span className="ep-hub-badge blue">
                          {(FAQS_DATA[subj.name] || []).length} Questions
                        </span>
                      </div>
                      <div className="ep-hub-title">FAQs & Key Questions</div>
                      <div className="ep-hub-desc">
                        Curated collection of high-frequency exam questions. Perfect for quick revision and testing recall before the exam.
                      </div>
                      <div className="ep-hub-meta">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Clock size={13} /> <b>~5 min</b> review
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Star size={13} /> <b>All Units</b> covered
                        </span>
                      </div>
                      <button className="ep-hub-action-btn blue">
                        <BookOpen size={15} /> View Questions &gt;
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Question Paper */}
                  <div
                    className="ep-hub-card"
                    onClick={() => {
                      setMode("qbank");
                      setStep(4);
                    }}
                  >
                    <div
                      className="ep-hub-stripe"
                      style={{ background: "linear-gradient(90deg, #10b981, #059669)" }}
                    />
                    <div className="ep-hub-body">
                      <div className="ep-hub-icon-row">
                        <div className="ep-hub-icon" style={{ background: "rgba(16,185,129,.1)" }}>
                          📝
                        </div>
                        <span className="ep-hub-badge green">4 Exam Parts</span>
                      </div>
                      <div className="ep-hub-title">Model Question Paper</div>
                      <div className="ep-hub-desc">
                        Full authentic examination format with Part A (1M), Part B (2M), Part C (5M) and Part D (10M) analytical questions.
                      </div>
                      <div className="ep-hub-meta">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Target size={13} /> <b>{totalMarks} Total</b> Marks
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <TrendingUp size={13} /> <b>Board</b> format
                        </span>
                      </div>
                      <button className="ep-hub-action-btn green">
                        <FileQuestion size={15} /> Open Paper &gt;
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Exam Buddy AI */}
                  <div className="ep-hub-card disabled">
                    <div
                      className="ep-hub-stripe"
                      style={{ background: "linear-gradient(90deg, #8b5cf6, #d946ef)" }}
                    />
                    <div className="ep-hub-body">
                      <div className="ep-hub-icon-row">
                        <div className="ep-hub-icon" style={{ background: "rgba(139,92,246,.1)" }}>
                          <img
                            src={roboImg}
                            alt="AI Buddy"
                            style={{ width: 28, height: 28, objectFit: "contain" }}
                          />
                        </div>
                        <span className="ep-hub-badge purple">Coming Soon 🤖</span>
                      </div>
                      <div className="ep-hub-title">Exam Buddy AI</div>
                      <div className="ep-hub-desc">
                        Your intelligent study partner — get step-by-step guidance, personalized hints, and live test simulations.
                      </div>
                      <div className="ep-buddy-features">
                        {[
                          "Instant answer verification",
                          "Step-by-step problem solver",
                          "Weak topic recommendation",
                          "Timed speed testing",
                        ].map((f) => (
                          <div key={f} className="ep-buddy-feat">
                            <div className="ep-buddy-dot" />
                            {f}
                          </div>
                        ))}
                      </div>
                      <div className="ep-hub-buddy-locked">
                        <Lock size={14} /> Available Soon
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ep-nav">
                  <button className="ep-btn-prev" onClick={() => setStep(2)}>
                    <ArrowLeft size={16} /> Change Units
                  </button>
                  <button
                    className="ep-btn-prev"
                    onClick={() => setStep(1)}
                    style={{ gap: 6 }}
                  >
                    <Home size={15} /> Start Over
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: FAQ QUESTIONS VIEW ── */}
            {mode === "faq" && (
              <motion.div
                key="faq-mode"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="ep-page-topbar">
                  <button className="ep-back-btn" onClick={goBack}>
                    <ArrowLeft size={15} /> Back to Prep Hub
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 18,
                        background: "rgba(37,99,235,.1)",
                      }}
                    >
                      ❓
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ep-ink)" }}>
                      {subj.emoji} {subj.name} — Important FAQs
                    </div>
                  </div>
                </div>

                <div className="ep-faq-layout">
                  {/* Left filter sidebar */}
                  <div className="ep-faq-sidebar">
                    <div className="ep-faq-sb-head">Filter by Unit</div>
                    {["All", ...new Set(allFaqs.map((f) => f.unit))].map((u) => (
                      <div
                        key={u}
                        className={`ep-faq-fi${faqFilter === u ? " on" : ""}`}
                        onClick={() => setFaqFilter(u)}
                      >
                        <span>{u}</span>
                        <span className="ep-faq-fi-count">
                          {u === "All"
                            ? allFaqs.length
                            : allFaqs.filter((f) => f.unit === u).length}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Questions Main List */}
                  <div>
                    <div className="ep-faq-search-bar">
                      <Search size={16} style={{ color: "var(--ep-muted)", flexShrink: 0 }} />
                      <input
                        className="ep-faq-si"
                        placeholder="Search key question or concept..."
                        value={faqSearch}
                        onChange={(e) => setFaqSearch(e.target.value)}
                      />
                      {faqSearch && (
                        <button
                          onClick={() => setFaqSearch("")}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--ep-muted)",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        padding: "10px 14px",
                        background: "rgba(37,99,235,.06)",
                        borderRadius: 12,
                        border: "1px solid rgba(37,99,235,.14)",
                        marginBottom: 14,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      📋 Showing {displayFaqs.length} question
                      {displayFaqs.length !== 1 ? "s" : ""}. Answers are hidden for self-testing.
                    </div>

                    {displayFaqs.length === 0 ? (
                      <div className="ep-empty">
                        <div className="ep-empty-icon">🔍</div>
                        No questions matched your query. Try clearing the search or choosing another unit.
                      </div>
                    ) : (
                      displayFaqs.map((f, i) => (
                        <motion.div
                          key={i}
                          className="ep-faq-qonly-card"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <div className="ep-faq-q-num">Q{i + 1}</div>
                          <div className="ep-faq-q-body">
                            <div className="ep-faq-q-text">{f.q}</div>
                            <span className="ep-faq-unit-tag">{f.unit}</span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: QUESTION PAPER VIEW ── */}
            {mode === "qbank" && (
              <motion.div
                key="paper-mode"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="ep-page-topbar">
                  <button className="ep-back-btn" onClick={goBack}>
                    <ArrowLeft size={15} /> Back to Prep Hub
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 18,
                        background: "rgba(16,185,129,.1)",
                      }}
                    >
                      📝
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ep-ink)" }}>
                      {subj.emoji} {subj.name} — Model Question Paper
                    </div>
                  </div>
                </div>

                <div className="ep-faq-layout">
                  {/* Left Sidebar with Parts & Print */}
                  <div className="ep-faq-sidebar">
                    <div className="ep-faq-sb-head">Exam Parts</div>
                    {PARTS.map((part) => {
                      const qsCount = getFilteredPart(part.key).length;
                      if (qsCount === 0) return null;
                      return (
                        <div
                          key={part.key}
                          className={`ep-faq-fi${activePart === part.key ? " on" : ""}`}
                          onClick={() => setActivePart(part.key)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 15 }}>{part.icon}</span>
                            <span>{part.label} ({part.marks}M)</span>
                          </div>
                          <span className="ep-faq-fi-count">{qsCount}</span>
                        </div>
                      );
                    })}
                    <div style={{ padding: "14px 18px", borderTop: "1px solid var(--ep-line)" }}>
                      <button
                        className="ep-paper-print-btn"
                        style={{ width: "100%", justifyContent: "center" }}
                        onClick={() => window.print()}
                      >
                        <Printer size={14} /> Print Paper
                      </button>
                    </div>
                  </div>

                  {/* Main Question Paper Content */}
                  <div>
                    {PARTS.map((part) => {
                      if (part.key !== activePart) return null;
                      const qs = getFilteredPart(part.key);
                      if (qs.length === 0) return null;

                      return (
                        <div key={part.key}>
                          <div className="ep-paper-header">
                            <div className="ep-paper-school">Standardized Model Examination</div>
                            <div className="ep-paper-exam-title">{subj.name}</div>
                            <div className="ep-paper-subject">
                              Units: {units.join(" · ")}
                            </div>
                            <div className="ep-paper-meta-row">
                              <div className="ep-paper-meta-item">
                                <div className="ep-paper-meta-val">{qs.length}</div>
                                <div className="ep-paper-meta-lbl">Part Questions</div>
                              </div>
                              <div className="ep-paper-meta-item">
                                <div className="ep-paper-meta-val">
                                  {part.marks * qs.length} Marks
                                </div>
                                <div className="ep-paper-meta-lbl">Section Weight</div>
                              </div>
                              <div className="ep-paper-meta-item">
                                <div className="ep-paper-meta-val">{part.label}</div>
                                <div className="ep-paper-meta-lbl">Active Section</div>
                              </div>
                            </div>
                          </div>

                          <div className={`ep-part-header ${part.cls}`}>
                            <div className="ep-part-left">
                              <div className="ep-part-badge">{part.icon}</div>
                              <div>
                                <div className="ep-part-title">
                                  {part.label} — {part.desc}
                                </div>
                                <div className="ep-part-subtitle">
                                  Each question carries {part.marks} mark{part.marks > 1 ? "s" : ""}
                                </div>
                              </div>
                            </div>
                            <span className="ep-part-tag">
                              {part.marks} × {qs.length} = {part.marks * qs.length} Marks
                            </span>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {qs.map((q, qi) => (
                              <motion.div
                                key={qi}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: qi * 0.03 }}
                                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                              >
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 12,
                                    flexShrink: 0,
                                    display: "grid",
                                    placeItems: "center",
                                    background: "linear-gradient(135deg, rgba(37,99,235,.12), rgba(14,165,233,.12))",
                                    border: "1.5px solid rgba(37,99,235,.25)",
                                    color: "#2563eb",
                                    fontSize: 13,
                                    fontWeight: 800,
                                    marginTop: 2,
                                  }}
                                >
                                  {qi + 1}
                                </div>

                                <div className="ep-paper-question-bubble">
                                  <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.6, marginBottom: 10 }}>
                                    {q.q}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      paddingTop: 10,
                                      borderTop: "1px solid var(--ep-line)",
                                      gap: 8,
                                    }}
                                  >
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <span
                                        style={{
                                          fontSize: 10.5,
                                          fontWeight: 700,
                                          padding: "3px 9px",
                                          borderRadius: 8,
                                          background: "rgba(16,185,129,.1)",
                                          color: "#059669",
                                        }}
                                      >
                                        {q.unit}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 10.5,
                                          fontWeight: 800,
                                          padding: "3px 9px",
                                          borderRadius: 8,
                                          background: "rgba(245,158,11,.1)",
                                          color: "#d97706",
                                        }}
                                      >
                                        {part.marks} Mark{part.marks > 1 ? "s" : ""}
                                      </span>
                                    </div>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "var(--ep-muted)",
                                      }}
                                    >
                                      Write solution below ✎
                                    </span>
                                  </div>
                                  <div className="ep-paper-answer-space" />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

