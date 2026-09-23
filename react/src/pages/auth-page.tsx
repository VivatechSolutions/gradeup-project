import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast";
import { useTheme } from "../hooks/use-theme";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Brain, Target, Sparkles, Users, Eye, EyeOff,
  Mail, Lock, Shield, RefreshCw, Loader2, AlertTriangle,
  ChevronRight, ChevronLeft, Check, Sun, Moon, Flame, Trophy, Zap, BookOpen, Star,
  Atom, Calculator, Compass
} from "lucide-react";
import { FaGoogle, FaMicrosoft } from "react-icons/fa";
import logoDark from "../assets/logo-dark.png";
import logoWhite from "../assets/logo-white.png";
import learningIsland from "../assets/dashboard/07_floating_learning_island.png";

// ─── CSS — Student Dashboard Color System, No-Scroll 100vh Layout & Micro-Animations ─
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root, [data-theme="light"] {
  --sd-page: #fbfcff;
  --sd-page-2: #f5f7ff;
  --sd-card: rgba(255, 255, 255, 0.92);
  --sd-card-solid: #ffffff;
  --sd-card-soft: #f8faff;
  --sd-ink: #071235;
  --sd-muted: #68708a;
  --sd-faint: #8c94aa;
  --sd-line: rgba(15, 23, 42, 0.08);
  --sd-line-hover: rgba(37, 99, 235, 0.35);
  --sd-shadow: 0 12px 32px -6px rgba(35, 44, 87, 0.09), 0 4px 12px rgba(35, 44, 87, 0.03);
  --sd-shadow-soft: 0 6px 18px rgba(35, 44, 87, 0.05);
  --sd-input-bg: #ffffff;
  --sd-input-bdr: rgba(15, 23, 42, 0.11);
  --sd-primary-grad: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  --sd-primary-hover: linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%);
  --sd-primary-glow: rgba(37, 99, 235, 0.32);
  --sd-hero-bg: radial-gradient(circle at 14% 12%, rgba(126,87,255,.13), transparent 32%), radial-gradient(circle at 86% 18%, rgba(255,171,64,.15), transparent 30%), linear-gradient(180deg, #f0f4ff 0%, #f7f9fe 100%);
  --sd-hero-text: #071235;
  --sd-hero-muted: #68708a;
  --sd-hero-card-bg: rgba(255, 255, 255, 0.82);
  --sd-hero-card-bdr: rgba(255, 255, 255, 0.90);
  --sd-pill-bg: rgba(255, 255, 255, 0.88);
  --sd-pill-bdr: rgba(15, 23, 42, 0.08);
}

[data-theme="dark"], .dark {
  --sd-page: #080d1f;
  --sd-page-2: #10172d;
  --sd-card: rgba(23, 31, 58, 0.94);
  --sd-card-solid: #171f3a;
  --sd-card-soft: rgba(31, 42, 76, 0.72);
  --sd-ink: #f6f7ff;
  --sd-muted: #b5bfd8;
  --sd-faint: #7f8aa7;
  --sd-line: rgba(255, 255, 255, 0.11);
  --sd-line-hover: rgba(56, 189, 248, 0.45);
  --sd-shadow: 0 16px 44px rgba(0, 0, 0, 0.45), 0 0 20px -4px rgba(37, 99, 235, 0.20);
  --sd-shadow-soft: 0 10px 24px rgba(0, 0, 0, 0.28);
  --sd-input-bg: rgba(15, 23, 42, 0.72);
  --sd-input-bdr: rgba(255, 255, 255, 0.13);
  --sd-primary-grad: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  --sd-primary-hover: linear-gradient(135deg, #3b82f6 0%, #38bdf8 100%);
  --sd-primary-glow: rgba(14, 165, 233, 0.40);
  --sd-hero-bg: radial-gradient(circle at 14% 12%, rgba(126,87,255,.22), transparent 34%), radial-gradient(circle at 86% 18%, rgba(255,107,74,.18), transparent 32%), linear-gradient(180deg, #090e23 0%, #111a36 100%);
  --sd-hero-text: #f6f7ff;
  --sd-hero-muted: #b5bfd8;
  --sd-hero-card-bg: rgba(23, 31, 58, 0.80);
  --sd-hero-card-bdr: rgba(255, 255, 255, 0.11);
  --sd-pill-bg: rgba(23, 31, 58, 0.85);
  --sd-pill-bdr: rgba(255, 255, 255, 0.11);
}

/* Screen fitted layout (NO outer window scroll) */
.sd-auth-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  height: 100vh;
  height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  display: flex;
  background: radial-gradient(circle at 14% 9%, rgba(126,87,255,.14), transparent 28%),
              radial-gradient(circle at 88% 14%, rgba(255,171,64,.16), transparent 28%),
              linear-gradient(180deg, var(--sd-page), var(--sd-page-2));
  color: var(--sd-ink);
  position: relative;
  overflow: hidden;
  transition: background .35s ease, color .35s ease;
}

/* Floating ambient blobs */
.sd-auth-root::before, .sd-auth-root::after {
  content: "";
  position: fixed;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(40px);
  opacity: .55;
  z-index: 0;
  animation: sdFloatBg 14s ease-in-out infinite alternate;
}
.sd-auth-root::before {
  width: 320px;
  height: 320px;
  left: -80px;
  top: 60px;
  background: radial-gradient(circle, rgba(37,99,235,.20), transparent 70%);
}
.sd-auth-root::after {
  width: 360px;
  height: 360px;
  right: -90px;
  bottom: 60px;
  background: radial-gradient(circle, rgba(255,107,74,.18), transparent 70%);
  animation-delay: -6s;
}

@keyframes sdFloatBg {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to   { transform: translate3d(24px, 28px, 0) scale(1.1); }
}

@keyframes sdBreathe {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}

@keyframes sdShine {
  0%       { transform: translateX(-140%) rotate(22deg); }
  40%, 100%{ transform: translateX(240%) rotate(22deg); }
}

@keyframes sdDrift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0); }
  50%      { transform: translate3d(10px, -8px, 0) rotate(5deg); }
}

@keyframes sdPop3d {
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-3px) scale(1.015); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes sdFlameFlicker {
  0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 4px rgba(234, 88, 12, 0.4)); }
  50% { transform: scale(1.18) rotate(3deg); filter: drop-shadow(0 0 10px rgba(255, 121, 31, 0.8)); }
}

@keyframes sdPulseRing {
  0% { transform: scale(0.86); opacity: 0.65; }
  50% { transform: scale(1.14); opacity: 0.2; }
  100% { transform: scale(0.86); opacity: 0.65; }
}

@keyframes sdIslandFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-7px) rotate(1.2deg); }
  66% { transform: translateY(4px) rotate(-1deg); }
}

@keyframes sdSatTL {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(4px, -6px, 0) rotate(-1.5deg); }
}

@keyframes sdSatTR {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-5px, -7px, 0) rotate(1.5deg); }
}

@keyframes sdSatBL {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(5px, 6px, 0) rotate(1.2deg); }
}

@keyframes sdSatBR {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-4px, 5px, 0) rotate(-1.2deg); }
}

@keyframes sdBeaconPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
  50% { transform: scale(1.12); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
}

@keyframes sdGradientFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes sdProgressSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}


/* Floating spark points */
.sd-bg-spark {
  position: fixed;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
  opacity: .5;
  animation: sdDrift 9s ease-in-out infinite;
}
.sd-bg-spark.s1 { left: 45%; top: 60px; width: 8px; height: 8px; background: #ffb21d; box-shadow: 32px 24px 0 #27b86a, 64px -14px 0 #2389ff; }
.sd-bg-spark.s2 { right: 10%; top: 160px; width: 7px; height: 7px; background: #ff4d8d; box-shadow: -40px 38px 0 #7e45e8, -70px -14px 0 #00a7c8; animation-delay: -3s; }
.sd-bg-spark.s3 { left: 6%; bottom: 100px; width: 8px; height: 8px; background: #27b86a; box-shadow: 36px -28px 0 #ff791f, 76px 14px 0 #2389ff; animation-delay: -5s; }

/* ── Theme Toggle Button ── */
.sd-theme-btn {
  position: absolute;
  top: 16px;
  right: 20px;
  z-index: 50;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: var(--sd-pill-bg);
  border: 1px solid var(--sd-pill-bdr);
  color: var(--sd-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--sd-shadow-soft);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
}
.sd-theme-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: var(--sd-shadow);
  border-color: var(--sd-line-hover);
}

/* ── NEW LEFT HERO: GAMIFIED ORBIT & DYNAMIC STAGE ── */
.sd-auth-hero {
  flex: 1.12;
  height: 100%;
  max-height: 100vh;
  max-height: 100dvh;
  background: var(--sd-hero-bg);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(14px, 2.2vh, 26px) clamp(20px, 2.5vw, 36px);
  z-index: 1;
  border-right: 1px solid var(--sd-line);
  transition: background .35s ease, border-color .35s ease;
}

.sd-hero-header {
  display: flex;
  flex-direction: column;
  gap: clamp(5px, 1vh, 10px);
  position: relative;
  z-index: 2;
}

.sd-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sd-hero-logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.sd-hero-logo img {
  height: clamp(36px, 4.2vh, 44px);
  width: auto;
  object-fit: contain;
}

.sd-hero-badge-live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--sd-pill-bg);
  border: 1px solid var(--sd-pill-bdr);
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-ink);
  backdrop-filter: blur(12px);
  box-shadow: var(--sd-shadow-soft);
}

.sd-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  animation: sdBeaconPulse 2s infinite ease-in-out;
}

.sd-hero-title {
  font-size: clamp(20px, 2.3vw, 29px);
  font-weight: 900;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--sd-hero-text);
  margin-top: 2px;
}
.sd-hero-title .sd-grad-text {
  background: linear-gradient(135deg, #2563eb, #0ea5e9, #7c3aed);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: sdGradientFlow 6s ease infinite;
}

.sd-hero-desc {
  font-size: clamp(11.5px, 1.3vh, 13px);
  line-height: 1.45;
  color: var(--sd-hero-muted);
  font-weight: 600;
  max-width: 460px;
}

/* ── Central Interactive Orbit Stage ── */
.sd-orbit-stage {
  position: relative;
  width: 100%;
  height: clamp(170px, 24vh, 220px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: clamp(4px, 0.8vh, 10px) 0;
  z-index: 2;
}

.sd-stage-halo {
  position: absolute;
  width: clamp(150px, 19vh, 190px);
  height: clamp(150px, 19vh, 190px);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(14, 165, 233, 0.12) 45%, transparent 70%);
  pointer-events: none;
  animation: sdPulseRing 4.5s ease-in-out infinite;
}

.sd-stage-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed var(--sd-line);
  pointer-events: none;
}
.sd-stage-ring.r1 {
  width: clamp(200px, 25vh, 260px);
  height: clamp(200px, 25vh, 260px);
  opacity: 0.65;
}

.sd-island-center {
  height: clamp(80px, 11vh, 115px);
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 12px 18px rgba(37, 99, 235, 0.28));
  animation: sdIslandFloat 5.5s ease-in-out infinite;
  z-index: 3;
  cursor: pointer;
  transition: transform 0.25s ease;
}
.sd-island-center:hover {
  transform: scale(1.08) translateY(-4px);
}

/* Floating Satellite Cards */
.sd-sat-card {
  position: absolute;
  z-index: 4;
  background: var(--sd-hero-card-bg);
  border: 1px solid var(--sd-hero-card-bdr);
  border-radius: 13px;
  padding: 7px 10px;
  box-shadow: var(--sd-shadow-soft);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
}
.sd-sat-card:hover {
  transform: translateY(-3px) scale(1.03) !important;
  border-color: var(--sd-line-hover);
  box-shadow: var(--sd-shadow);
}

.sd-sat-card.c-tl {
  top: 2px;
  left: 0;
  animation: sdSatTL 5s ease-in-out infinite;
}
.sd-sat-card.c-tr {
  top: 6px;
  right: 0;
  animation: sdSatTR 5.6s ease-in-out infinite;
}
.sd-sat-card.c-bl {
  bottom: 4px;
  left: 4px;
  animation: sdSatBL 5.2s ease-in-out infinite;
}
.sd-sat-card.c-br {
  bottom: 2px;
  right: 4px;
  animation: sdSatBR 4.8s ease-in-out infinite;
}

.sd-sat-head {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-hero-text);
}
.sd-sat-sub {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--sd-hero-muted);
  line-height: 1.3;
}
.sd-sat-streak-dots {
  display: flex;
  gap: 3px;
  margin-top: 3px;
}
.sd-streak-dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7.5px;
  font-weight: 900;
}
.sd-streak-dot.active {
  background: #16a34a;
  color: #ffffff;
}

.sd-sat-progress {
  width: 104px;
  height: 4px;
  border-radius: 999px;
  background: var(--sd-line);
  overflow: hidden;
  margin-top: 3px;
  position: relative;
}
.sd-sat-progress-fill {
  height: 100%;
  width: 88%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2563eb, #0ea5e9);
}

/* ── Interactive Subject Capsules Strip ── */
.sd-subjects-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  position: relative;
  z-index: 2;
  margin: clamp(3px, 0.7vh, 8px) 0;
}

.sd-sub-capsule {
  background: var(--sd-hero-card-bg);
  border: 1px solid var(--sd-hero-card-bdr);
  border-radius: 12px;
  padding: 7px 9px;
  display: flex;
  align-items: center;
  gap: 7px;
  backdrop-filter: blur(12px);
  box-shadow: var(--sd-shadow-soft);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.sd-sub-capsule:hover {
  transform: translateY(-2px) scale(1.02);
  border-color: var(--cap-color);
  box-shadow: 0 6px 16px -3px var(--cap-glow);
}
.sd-sub-ico {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #ffffff;
}
.sd-sub-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.sd-sub-name {
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-hero-text);
  white-space: nowrap;
}
.sd-sub-meta {
  font-size: 9px;
  font-weight: 700;
  color: var(--sd-hero-muted);
  white-space: nowrap;
}

/* ── Social Proof & Live Learner Footer Bar ── */
.sd-hero-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--sd-line);
  padding-top: clamp(8px, 1.3vh, 12px);
  position: relative;
  z-index: 2;
}

.sd-avatar-stack {
  display: flex;
  align-items: center;
}
.sd-avatar-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--sd-page);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8.5px;
  font-weight: 800;
  color: #ffffff;
  margin-left: -5px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.sd-avatar-circle:first-child {
  margin-left: 0;
}

.sd-social-label {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--sd-hero-text);
}

.sd-live-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--sd-pill-bg);
  border: 1px solid var(--sd-pill-bdr);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  color: var(--sd-hero-text);
  box-shadow: var(--sd-shadow-soft);
  white-space: nowrap;
}


/* ── RIGHT FORM PANEL (Fitted & Centered) ── */
.sd-auth-panel {
  flex: 0.95;
  height: 100%;
  max-height: 100vh;
  max-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(12px, 2.5vh, 28px) clamp(16px, 2.8vw, 32px);
  position: relative;
  z-index: 2;
  overflow-y: auto;
}

.sd-form-container {
  width: 100%;
  max-width: 440px;
  margin: auto 0;
  position: relative;
}

/* Mobile Brand Header */
.sd-mobile-header {
  display: none;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.sd-mobile-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}
.sd-mobile-logo img {
  height: 36px;
  width: auto;
  object-fit: contain;
}

/* Segmented Tab Switcher */
.sd-auth-tabs {
  display: flex;
  gap: 4px;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 13px;
  padding: 3px;
  box-shadow: var(--sd-shadow-soft);
  margin-bottom: 14px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.sd-auth-tab {
  flex: 1;
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--sd-muted);
  cursor: pointer;
  transition: all .18s ease;
}
.sd-auth-tab:hover {
  color: var(--sd-ink);
  background: rgba(37, 99, 235, 0.08);
}
.sd-auth-tab.active {
  background: var(--sd-primary-grad);
  color: #ffffff;
  box-shadow: 0 4px 12px var(--sd-primary-glow);
}

/* Main Auth Card */
.sd-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 20px;
  box-shadow: var(--sd-shadow);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
  transition: background .35s ease, border-color .35s ease, box-shadow .35s ease;
}

.sd-card-header {
  padding: 14px 20px 10px;
  border-bottom: 1px solid var(--sd-line);
}
.sd-card-title {
  font-size: 18px;
  font-weight: 900;
  color: var(--sd-ink);
  letter-spacing: -0.01em;
  margin-bottom: 2px;
}
.sd-card-sub {
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
}

.sd-card-body {
  padding: 14px 20px 16px;
}

/* Compact Step Indicator */
.sd-stepper {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  position: relative;
}
.sd-step-item {
  display: flex;
  align-items: center;
}
.sd-step-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: default;
}
.sd-step-bubble {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 800;
  transition: all .2s ease;
}
.sd-step-bubble.done {
  background: var(--sd-primary-grad);
  color: #ffffff;
  box-shadow: 0 3px 10px var(--sd-primary-glow);
}
.sd-step-bubble.active {
  background: var(--sd-primary-grad);
  color: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18), 0 3px 10px var(--sd-primary-glow);
}
.sd-step-bubble.pending {
  background: var(--sd-card-soft);
  color: var(--sd-faint);
  border: 1.5px solid var(--sd-line);
}
.sd-step-text {
  font-size: 10px;
  font-weight: 800;
  margin-top: 3px;
  white-space: nowrap;
}
.sd-step-text.done, .sd-step-text.active {
  color: #2563eb;
}
[data-theme="dark"] .sd-step-text.done,
[data-theme="dark"] .sd-step-text.active,
.dark .sd-step-text.done,
.dark .sd-step-text.active {
  color: #38bdf8;
}
.sd-step-text.pending {
  color: var(--sd-faint);
}
.sd-step-track {
  flex: 1;
  height: 2px;
  background: var(--sd-line);
  margin: 0 6px 14px;
  transition: background .3s ease;
}
.sd-step-track.filled {
  background: var(--sd-primary-grad);
}

/* Role Selector Grid */
.sd-role-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.sd-role-card {
  border-radius: 16px;
  border: 2px solid var(--sd-line);
  background: var(--sd-card-soft);
  padding: 12px 10px;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: all .2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.sd-role-card:hover {
  transform: translateY(-2px);
  border-color: rgba(37, 99, 235, 0.4);
  box-shadow: var(--sd-shadow-soft);
}
.sd-role-card.selected {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  box-shadow: 0 6px 18px -3px var(--sd-primary-glow);
}
[data-theme="dark"] .sd-role-card.selected,
.dark .sd-role-card.selected {
  background: rgba(37, 99, 235, 0.16);
  border-color: #38bdf8;
}
.sd-role-ico {
  font-size: 26px;
  display: block;
  margin-bottom: 6px;
  animation: sdPop3d 4s ease-in-out infinite;
}
.sd-role-title {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--sd-ink);
  margin-bottom: 2px;
}
.sd-role-desc {
  font-size: 10px;
  font-weight: 600;
  color: var(--sd-muted);
  line-height: 1.35;
}
.sd-role-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--sd-primary-grad);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

/* OAuth Fast Sign-in */
.sd-oauth-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.sd-oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 11px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card-soft);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--sd-ink);
  cursor: pointer;
  transition: all .16s ease;
}
.sd-oauth-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.4);
  background: rgba(37, 99, 235, 0.05);
}
.sd-oauth-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
  transform: none;
}

/* Divider */
.sd-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
}
.sd-divider-line {
  flex: 1;
  height: 1px;
  background: var(--sd-line);
}
.sd-divider-text {
  font-size: 10px;
  font-weight: 800;
  color: var(--sd-faint);
  text-transform: uppercase;
  letter-spacing: .08em;
}

/* Form Fields */
.sd-field {
  margin-bottom: 10px;
}
.sd-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.sd-label {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--sd-ink);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.sd-input-wrap {
  position: relative;
}
.sd-input-ico {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sd-faint);
  display: flex;
  pointer-events: none;
}
.sd-input {
  width: 100%;
  min-height: 38px;
  padding: 8px 11px;
  border-radius: 11px;
  border: 1.5px solid var(--sd-input-bdr);
  background: var(--sd-input-bg);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--sd-ink);
  transition: border-color .18s, box-shadow .18s;
  outline: none;
}
.sd-input.with-icon { padding-left: 36px; }
.sd-input.with-eye  { padding-right: 36px; }
.sd-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.sd-input.is-error {
  border-color: #ef4444;
}
.sd-input::placeholder {
  color: var(--sd-faint);
  font-weight: 500;
}
.sd-input-eye {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--sd-faint);
  padding: 3px;
  display: flex;
}
.sd-input-eye:hover {
  color: #2563eb;
}
.sd-field-error {
  font-size: 11px;
  font-weight: 700;
  color: #ef4444;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Board Chips */
.sd-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.sd-chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card-soft);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--sd-muted);
  cursor: pointer;
  transition: all .16s ease;
}
.sd-chip:hover {
  border-color: rgba(37, 99, 235, 0.4);
  color: #2563eb;
  background: rgba(37, 99, 235, 0.05);
}
.sd-chip.active {
  background: var(--sd-primary-grad);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 3px 10px var(--sd-primary-glow);
}

/* Action Buttons */
.sd-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  min-height: 40px;
  padding: 9px 18px;
  border-radius: 12px;
  border: none;
  background: var(--sd-primary-grad);
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 18px -3px var(--sd-primary-glow);
  position: relative;
  overflow: hidden;
  transition: transform .18s ease, box-shadow .18s ease;
}
.sd-btn::after {
  content: "";
  position: absolute;
  top: -40px;
  bottom: -40px;
  width: 50px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.26), transparent);
  animation: sdShine 5s ease-in-out infinite;
}
.sd-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px -3px var(--sd-primary-glow);
}
.sd-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
  transform: none;
}
.sd-btn-outline {
  background: transparent;
  color: var(--sd-ink);
  border: 1.5px solid var(--sd-line);
  box-shadow: none;
}
.sd-btn-outline:hover {
  background: var(--sd-card-soft);
  border-color: rgba(37, 99, 235, 0.4);
}
.sd-step-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.sd-step-actions .sd-btn {
  flex: 1;
}

/* Account Summary Box */
.sd-summary-box {
  border-radius: 13px;
  border: 1.5px solid rgba(37, 99, 235, 0.22);
  background: rgba(37, 99, 235, 0.05);
  padding: 8px 12px;
  margin-bottom: 10px;
}
[data-theme="dark"] .sd-summary-box,
.dark .sd-summary-box {
  background: rgba(37, 99, 235, 0.14);
  border-color: rgba(56, 189, 248, 0.28);
}
.sd-summary-title {
  font-size: 10.5px;
  font-weight: 800;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 5px;
}
[data-theme="dark"] .sd-summary-title,
.dark .sd-summary-title {
  color: #38bdf8;
}
.sd-summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  padding: 2px 0;
  border-bottom: 1px dashed var(--sd-line);
}
.sd-summary-row:last-child {
  border-bottom: none;
}
.sd-summary-key {
  color: var(--sd-muted);
  font-weight: 600;
}
.sd-summary-val {
  color: var(--sd-ink);
  font-weight: 800;
}

/* Captcha Card */
.sd-captcha-card {
  border-radius: 14px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card-soft);
  padding: 12px;
  margin-bottom: 12px;
}
.sd-captcha-view {
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--sd-card-solid);
  border-radius: 10px;
  padding: 6px;
  border: 1px solid var(--sd-line);
  margin-bottom: 10px;
}
.sd-captcha-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.sd-captcha-refresh-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card-solid);
  color: var(--sd-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sd-captcha-refresh-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}

/* Alert Box */
.sd-alert {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 11px;
  border: 1.5px solid rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.08);
  margin-bottom: 10px;
}
.sd-alert-text {
  font-size: 12px;
  font-weight: 600;
  color: #dc2626;
  line-height: 1.4;
}
[data-theme="dark"] .sd-alert-text,
.dark .sd-alert-text {
  color: #fca5a5;
}

/* Footer note */
.sd-auth-footer {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 10px;
  line-height: 1.5;
}
.sd-auth-footer a {
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
}
[data-theme="dark"] .sd-auth-footer a,
.dark .sd-auth-footer a {
  color: #38bdf8;
}

/* ── RESPONSIVENESS (All Devices) ── */
@media (max-width: 1024px) {
  .sd-auth-hero {
    display: none;
  }
  .sd-auth-panel {
    flex: 1;
    padding: 16px;
  }
  .sd-mobile-header {
    display: flex;
  }
  .sd-theme-btn {
    position: static;
  }
}

@media (max-width: 600px) {
  .sd-card-header {
    padding: 12px 16px 8px;
  }
  .sd-card-body {
    padding: 12px 16px 14px;
  }
  .sd-step-text {
    display: none;
  }
}

@media (max-width: 400px) {
  .sd-field-row {
    grid-template-columns: 1fr;
  }
  .sd-role-grid {
    grid-template-columns: 1fr;
  }
  .sd-oauth-grid {
    grid-template-columns: 1fr;
  }
}
`;

// ── Constants ─────────────────────────────────────────────────────────────────
const LOGIN_STEPS = [
  { id: 1, label: "Role" },
  { id: 2, label: "Credentials" },
  { id: 3, label: "Verify" },
];
const REGISTER_STEPS = [
  { id: 1, label: "Role" },
  { id: 2, label: "Profile" },
  { id: 3, label: "Details" },
  { id: 4, label: "Password" },
];
const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "Cambridge"];
const GoogleIcon = FaGoogle as any;
const MicrosoftIcon = FaMicrosoft as any;

// ── Step indicator component ──────────────────────────────────────────────────
function StepIndicator({ current, steps }: { current: number; steps: typeof REGISTER_STEPS }) {
  return (
    <div className="sd-stepper" aria-label="Registration steps">
      {steps.map((s, i) => {
        const state = current > s.id ? "done" : current === s.id ? "active" : "pending";
        return (
          <div key={s.id} className="sd-step-item" style={{ flex: i < steps.length - 1 ? 1 : 0 }}>
            <div className="sd-step-node">
              <div className={`sd-step-bubble ${state}`}>
                {state === "done" ? <Check size={13} strokeWidth={3} /> : s.id}
              </div>
              <span className={`sd-step-text ${state}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`sd-step-track${current > s.id ? " filled" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Script loader ─────────────────────────────────────────────────────────────
function loadScriptOnce(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

// ── Google OAuth Token ────────────────────────────────────────────────────────
async function getGoogleOAuthToken(): Promise<{ accessToken: string }> {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("REACT_APP_GOOGLE_CLIENT_ID is not configured");
  await loadScriptOnce("https://accounts.google.com/gsi/client");

  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error("Google OAuth is unavailable"));
      return;
    }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      prompt: "select_account",
      callback: (response: any) => {
        if (response?.access_token) resolve({ accessToken: response.access_token });
        else reject(new Error(response?.error_description || "Google did not return an access token"));
      },
    });
    client.requestAccessToken();
  });
}

// ── Microsoft OAuth Token ─────────────────────────────────────────────────────
function getMicrosoftIdToken(): Promise<string> {
  const clientId = process.env.REACT_APP_MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("REACT_APP_MICROSOFT_CLIENT_ID is not configured");
  const tenant = process.env.REACT_APP_MICROSOFT_TENANT_ID || "common";
  const nonce = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "id_token",
    redirect_uri: window.location.origin,
    response_mode: "fragment",
    scope: "openid profile email",
    nonce,
    prompt: "select_account",
  });
  const popup = window.open(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`,
    "gradeup_microsoft_oauth",
    "width=520,height=680",
  );
  if (!popup) return Promise.reject(new Error("Popup blocked. Please allow popups and try again."));

  return new Promise((resolve, reject) => {
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        reject(new Error("Microsoft sign-in was cancelled"));
        return;
      }
      try {
        if (popup.location.origin !== window.location.origin) return;
        const hash = new URLSearchParams(popup.location.hash.replace(/^#/, ""));
        const error = hash.get("error_description") || hash.get("error");
        const idToken = hash.get("id_token");
        if (error) {
          popup.close();
          window.clearInterval(timer);
          reject(new Error(error));
        } else if (idToken) {
          popup.close();
          window.clearInterval(timer);
          resolve(idToken);
        }
      } catch {
        // Cross-origin until redirect
      }
    }, 300);
  });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuthPage() {
  const { loginMutation, registerMutation, oauthMutation } = useAuth();
  const { toast } = useToast();

  // Theme support
  const { isDark, toggleTheme } = useTheme();
  const logo = isDark ? logoWhite : logoDark;

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // ── Login state ──
  const [loginStep, setLoginStep] = useState(1);
  const [loginRole, setLoginRole] = useState<"student" | "teacher" | "">("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "", captchaAnswer: "" });
  const [showPw, setShowPw] = useState(false);
  const [captchaData, setCaptchaData] = useState<{ svg: string; sessionId: string } | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // ── Register state ──
  const [step, setStep] = useState(1);
  const [regRole, setRegRole] = useState<"student" | "teacher">("student");
  const [regBoard, setRegBoard] = useState("");
  const [regGrade, setRegGrade] = useState("");
  const [regForm, setRegForm] = useState({
    firstName: "", lastName: "", username: "", email: "", schoolName: "", password: "", confirmPassword: "",
  });
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegConf, setShowRegConf] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  // ── Handle login error (captcha trigger) ──
  useEffect(() => {
    if (loginMutation.isError && loginMutation.error) {
      const err = loginMutation.error as any;
      if (err?.requiresCaptcha) {
        setRequiresCaptcha(true);
        loadCaptcha();
        setLoginStep(3);
        setLoginErrors({ captcha: "Security verification required. Please complete the CAPTCHA below." });
      } else {
        setLoginErrors({ form: err?.message || "Invalid credentials. Please try again." });
      }
    }
  }, [loginMutation.isError, loginMutation.error]);

  // ── CAPTCHA loader ──
  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    await new Promise(r => setTimeout(r, 400));
    setCaptchaData({
      svg: `<svg width="150" height="44" viewBox="0 0 150 44" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="44" rx="8" fill="#F0F4FF"/><text x="75" y="27" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="20" fill="#2563EB" text-anchor="middle" letter-spacing="4">GRADEUP</text><line x1="10" y1="14" x2="140" y2="30" stroke="#93C5FD" stroke-width="2"/></svg>`,
      sessionId: "mock-session-123",
    });
    setCaptchaLoading(false);
  };

  // ── Login validation ──
  const validateLoginStep = (): boolean => {
    const errs: Record<string, string> = {};

    if (loginStep === 1) {
      if (!loginRole) errs.role = "Please select whether you are a student or teacher";
    } else if (loginStep === 2) {
      if (!loginForm.email.trim()) {
        errs.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(loginForm.email)) {
        errs.email = "Please enter a valid email address";
      }
      if (!loginForm.password) {
        errs.password = "Password is required";
      } else if (loginForm.password.length < 8) {
        errs.password = "Password must be at least 8 characters";
      }
    } else if (loginStep === 3 && requiresCaptcha) {
      if (!loginForm.captchaAnswer.trim()) errs.captcha = "Please complete the security verification";
    }

    setLoginErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLoginNext = () => {
    if (!validateLoginStep()) return;

    if (loginStep === 1) {
      setLoginStep(2);
    } else if (loginStep === 2) {
      loginMutation.mutate({
        email: loginForm.email,
        password: loginForm.password,
        role: loginRole,
      });
    } else if (loginStep === 3 && requiresCaptcha) {
      loginMutation.mutate({
        email: loginForm.email,
        password: loginForm.password,
        role: loginRole,
        captchaAnswer: loginForm.captchaAnswer,
        captchaSessionId: captchaData?.sessionId,
      });
    }
  };

  const handleLoginBack = () => {
    if (loginStep > 1) {
      setLoginStep(s => s - 1);
      setLoginErrors({});
    }
  };

  const resetLoginForm = () => {
    setLoginStep(1);
    setLoginRole("");
    setLoginForm({ email: "", password: "", captchaAnswer: "" });
    setLoginErrors({});
    setRequiresCaptcha(false);
    setCaptchaData(null);
    setShowPw(false);
  };

  // ── Register validation ──
  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};

    if (step === 2) {
      if (!regForm.firstName.trim()) errs.firstName = "First name is required";
      if (!regForm.lastName.trim()) errs.lastName = "Last name is required";
      if (!regForm.username.trim()) errs.username = "Username is required";
      if (!regForm.email.trim()) errs.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(regForm.email)) errs.email = "Invalid email address";
      if (regRole === "student" && !regForm.schoolName.trim()) errs.schoolName = "School name is required";
    }

    if (step === 3) {
      if (regRole === "student") {
        if (!regBoard) errs.board = "Please select a board";
        if (!regGrade.trim()) errs.grade = "Class is required";
      }
    }

    if (step === 4) {
      if (!regForm.password) errs.password = "Password is required";
      else if (regForm.password.length < 8) errs.password = "Password must be at least 8 characters";
      if (!regForm.confirmPassword) errs.confirmPassword = "Please confirm your password";
      else if (regForm.password !== regForm.confirmPassword) errs.confirmPassword = "Passwords don't match";
    }

    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterSubmit = () => {
    if (!validateStep()) return;

    registerMutation.mutate({
      email: regForm.email,
      username: regForm.username,
      password: regForm.password,
      firstName: regForm.firstName,
      lastName: regForm.lastName,
      role: regRole,
      schoolName: regForm.schoolName,
      board: regBoard,
      classNumber: regGrade,
      subjects: [],
      grade: regRole === "student" && regGrade
        ? parseInt(regGrade.replace(/\D/g, ""))
        : undefined,
    });
  };

  const validateOAuthSignupContext = () => {
    const errs: Record<string, string> = {};
    if (!regForm.firstName.trim()) errs.firstName = "First name is required";
    if (!regForm.lastName.trim()) errs.lastName = "Last name is required";
    if (regRole === "student" && !regForm.schoolName.trim()) errs.schoolName = "School name is required";
    if (regRole === "student") {
      if (!regBoard) errs.board = "Please select a board";
      if (!regGrade.trim()) errs.grade = "Class is required";
    }
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOAuth = async (provider: "google" | "microsoft", mode: "login" | "signup") => {
    try {
      if (mode === "signup" && !validateOAuthSignupContext()) return;
      const googleToken = provider === "google" ? await getGoogleOAuthToken() : null;
      const idToken = provider === "microsoft" ? await getMicrosoftIdToken() : undefined;
      oauthMutation.mutate({
        provider,
        idToken,
        accessToken: googleToken?.accessToken,
        profileContext: mode === "signup"
          ? {
              firstName: regForm.firstName,
              lastName: regForm.lastName,
              schoolName: regForm.schoolName,
              board: regBoard,
              classNumber: regGrade,
            }
          : undefined,
      });
    } catch (error) {
      toast({
        title: "OAuth unavailable",
        description: error instanceof Error ? error.message : "Unable to start OAuth sign-in.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="sd-auth-root">
        {/* Ambient Sparkles */}
        <div className="sd-bg-spark s1" aria-hidden="true" />
        <div className="sd-bg-spark s2" aria-hidden="true" />
        <div className="sd-bg-spark s3" aria-hidden="true" />

        {/* Floating Theme Toggle button (Desktop top-right) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="sd-theme-btn"
          title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#3b82f6" />}
        </button>

        {/* ────────── LEFT HERO PANEL ────────── */}
        <div className="sd-auth-hero">
          {/* Top Brand Header & Live Radar Badge */}
          <div className="sd-hero-header">
            <div className="sd-hero-top">
              <Link href="/dashboard" className="sd-hero-logo" aria-label="GradeUp AI Home">
                <img src={logo} alt="GradeUp AI" />
              </Link>
              <div className="sd-hero-badge-live">
                <span className="sd-live-dot" />
                <span>AI Study Campus</span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <h1 className="sd-hero-title">
                Level Up Your Learning with{" "}
                <span className="sd-grad-text">Next-Gen AI</span>
              </h1>
              <p className="sd-hero-desc">
                Interactive quizzes, real-time doubt clearing, and personalized curriculum mastery built for top academic achievers.
              </p>
            </motion.div>
          </div>

          {/* ── Central Interactive Orbit Stage ── */}
          <div className="sd-orbit-stage">
            {/* Ambient Pulsing Radar / Energy Rings */}
            <div className="sd-stage-halo" />
            <div className="sd-stage-ring r1" />

            {/* Floating Satellite 1: Top-Left Streak Flame */}
            <motion.div
              className="sd-sat-card c-tl"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              <div className="sd-sat-head">
                <Flame size={14} color="#ea580c" style={{ animation: "sdFlameFlicker 2.2s infinite ease-in-out" }} />
                <span>14-Day Streak!</span>
              </div>
              <div className="sd-sat-streak-dots">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, idx) => (
                  <span key={idx} className="sd-streak-dot active">{d}</span>
                ))}
              </div>
            </motion.div>

            {/* Floating Satellite 2: Top-Right AI Doubt Solver */}
            <motion.div
              className="sd-sat-card c-tr"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.35 }}
            >
              <div className="sd-sat-head">
                <Brain size={14} color="#0284c7" />
                <span>AI Doubt Solver</span>
              </div>
              <div className="sd-sat-sub">
                ⚡ Solved in 2.4s • 4.9★
              </div>
            </motion.div>

            {/* Central 3D Mascot Island */}
            <motion.img
              src={learningIsland}
              alt="GradeUp Learning Island"
              className="sd-island-center"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              title="GradeUp Study Campus"
            />

            {/* Floating Satellite 3: Bottom-Left Daily Mastery */}
            <motion.div
              className="sd-sat-card c-bl"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              <div className="sd-sat-head">
                <Zap size={14} color="#2563eb" />
                <span>+450 XP Today</span>
              </div>
              <div className="sd-sat-progress">
                <div className="sd-sat-progress-fill" />
              </div>
              <div className="sd-sat-sub">88% Daily Mastery</div>
            </motion.div>

            {/* Floating Satellite 4: Bottom-Right Scholar Rank */}
            <motion.div
              className="sd-sat-card c-br"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.35 }}
            >
              <div className="sd-sat-head">
                <Trophy size={14} color="#f59e0b" />
                <span>Rank #1 Scholar</span>
              </div>
              <div className="sd-sat-sub">Top 1% CBSE Grade 10</div>
            </motion.div>
          </div>

          {/* ── Interactive Subject Capsules ── */}
          <motion.div
            className="sd-subjects-strip"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
          >
            {[
              {
                name: "Maths",
                meta: "+140 XP",
                icon: <Calculator size={13} />,
                color: "#2389ff",
                bg: "linear-gradient(135deg, #2389ff, #0ea5e9)",
                glow: "rgba(35, 137, 255, 0.4)",
              },
              {
                name: "Science",
                meta: "98% Score",
                icon: <Atom size={13} />,
                color: "#27b86a",
                bg: "linear-gradient(135deg, #27b86a, #10b981)",
                glow: "rgba(39, 184, 106, 0.4)",
              },
              {
                name: "English",
                meta: "Level 6",
                icon: <BookOpen size={13} />,
                color: "#7e45e8",
                bg: "linear-gradient(135deg, #7e45e8, #a855f7)",
                glow: "rgba(126, 69, 232, 0.4)",
              },
              {
                name: "Social",
                meta: "Exam Ready",
                icon: <Compass size={13} />,
                color: "#ff791f",
                bg: "linear-gradient(135deg, #ff791f, #f97316)",
                glow: "rgba(255, 121, 31, 0.4)",
              },
            ].map(sub => (
              <div
                key={sub.name}
                className="sd-sub-capsule"
                style={{
                  ["--cap-color" as any]: sub.color,
                  ["--cap-glow" as any]: sub.glow,
                }}
              >
                <div className="sd-sub-ico" style={{ background: sub.bg }}>
                  {sub.icon}
                </div>
                <div className="sd-sub-info">
                  <div className="sd-sub-name">{sub.name}</div>
                  <div className="sd-sub-meta">{sub.meta}</div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Social Proof & Live Learner Footer Bar ── */}
          <motion.div
            className="sd-hero-footer-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.35 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="sd-avatar-stack">
                <div className="sd-avatar-circle" style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>AR</div>
                <div className="sd-avatar-circle" style={{ background: "linear-gradient(135deg, #ec4899, #f43f5e)" }}>SK</div>
                <div className="sd-avatar-circle" style={{ background: "linear-gradient(135deg, #10b981, #14b8a6)" }}>VN</div>
                <div className="sd-avatar-circle" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>+15k</div>
              </div>
              <div className="sd-social-label">
                <span>15,000+ Active Students</span>
              </div>
            </div>

            <div className="sd-live-status-pill">
              <span className="sd-live-dot" />
              <span>3,420 Online Now</span>
            </div>
          </motion.div>
        </div>

        {/* ────────── RIGHT FORM PANEL ────────── */}
        <div className="sd-auth-panel">
          <div className="sd-form-container">

            {/* Mobile Header with Logo and Theme Switcher */}
            <div className="sd-mobile-header">
              <Link href="/dashboard" className="sd-mobile-logo">
                <img src={logo} alt="GradeUp AI" />
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                className="sd-theme-btn"
                title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#3b82f6" />}
              </button>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="sd-auth-tabs">
              <button
                type="button"
                className={`sd-auth-tab${activeTab === "login" ? " active" : ""}`}
                onClick={() => { setActiveTab("login"); resetLoginForm(); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`sd-auth-tab${activeTab === "register" ? " active" : ""}`}
                onClick={() => { setActiveTab("register"); setRegErrors({}); }}
              >
                Create Account
              </button>
            </div>

            <AnimatePresence mode="wait">

              {/* ────────── SIGN IN FLOW ────────── */}
              {activeTab === "login" && (
                <motion.div
                  key="login-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="sd-card">
                    <div className="sd-card-header">
                      <h2 className="sd-card-title">
                        {loginStep === 1 && "Choose Your Role"}
                        {loginStep === 2 && "Welcome Back"}
                        {loginStep === 3 && "Security Check"}
                      </h2>
                      <p className="sd-card-sub">
                        {loginStep === 1 && "Select how you will use GradeUp"}
                        {loginStep === 2 && "Sign in to continue your learning"}
                        {loginStep === 3 && "Complete verification to proceed"}
                      </p>
                    </div>

                    <div className="sd-card-body">
                      <StepIndicator current={loginStep} steps={LOGIN_STEPS} />

                      {/* Form-level error alert */}
                      {loginErrors.form && (
                        <div className="sd-alert">
                          <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                          <div className="sd-alert-text">{loginErrors.form}</div>
                        </div>
                      )}

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`login-step-${loginStep}`}
                          initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -14 }}
                          transition={{ duration: 0.16 }}
                        >

                          {/* Login Step 1 — Role Selection */}
                          {loginStep === 1 && (
                            <div>
                              <div className="sd-role-grid">
                                {([
                                  { val: "student", icon: "🎓", name: "Student", desc: "Study notes, quizzes & AI tutoring" },
                                  { val: "teacher", icon: "👨‍🏫", name: "Teacher", desc: "Manage classes, quizzes & student analytics" },
                                ] as const).map(r => (
                                  <div
                                    key={r.val}
                                    className={`sd-role-card${loginRole === r.val ? " selected" : ""}`}
                                    onClick={() => {
                                      setLoginRole(r.val);
                                      setLoginErrors(p => ({ ...p, role: "" }));
                                    }}
                                  >
                                    {loginRole === r.val && (
                                      <div className="sd-role-check">
                                        <Check size={11} strokeWidth={3} />
                                      </div>
                                    )}
                                    <span className="sd-role-ico">{r.icon}</span>
                                    <div className="sd-role-title">{r.name}</div>
                                    <div className="sd-role-desc">{r.desc}</div>
                                  </div>
                                ))}
                              </div>

                              {loginErrors.role && (
                                <div className="sd-field-error" style={{ marginBottom: 10 }}>
                                  <AlertTriangle size={12} /> {loginErrors.role}
                                </div>
                              )}

                              <button
                                type="button"
                                className="sd-btn"
                                onClick={handleLoginNext}
                              >
                                Continue <ChevronRight size={15} />
                              </button>
                            </div>
                          )}

                          {/* Login Step 2 — Credentials */}
                          {loginStep === 2 && (
                            <div>
                              {/* OAuth Fast Sign-in */}
                              <div className="sd-oauth-grid">
                                <button
                                  className="sd-oauth-btn"
                                  type="button"
                                  disabled={oauthMutation.isPending}
                                  title="Continue with Google"
                                  onClick={() => handleOAuth("google", "login")}
                                >
                                  <GoogleIcon style={{ color: "#ea4335", fontSize: 14 }} /> Google
                                </button>
                                <button
                                  className="sd-oauth-btn"
                                  type="button"
                                  disabled={oauthMutation.isPending}
                                  title="Continue with Microsoft"
                                  onClick={() => handleOAuth("microsoft", "login")}
                                >
                                  <MicrosoftIcon style={{ color: "#00a4ef", fontSize: 14 }} /> Microsoft
                                </button>
                              </div>

                              <div className="sd-divider">
                                <div className="sd-divider-line" />
                                <span className="sd-divider-text">Or with email</span>
                                <div className="sd-divider-line" />
                              </div>

                              {/* Email input */}
                              <div className="sd-field">
                                <label className="sd-label">
                                  <Mail size={13} /> Email Address
                                </label>
                                <div className="sd-input-wrap">
                                  <span className="sd-input-ico"><Mail size={14} /></span>
                                  <input
                                    className={`sd-input with-icon${loginErrors.email ? " is-error" : ""}`}
                                    type="email"
                                    placeholder="name@example.com"
                                    value={loginForm.email}
                                    onChange={e => {
                                      setLoginForm(f => ({ ...f, email: e.target.value }));
                                      setLoginErrors(p => ({ ...p, email: "" }));
                                    }}
                                    data-testid="input-email"
                                  />
                                </div>
                                {loginErrors.email && (
                                  <div className="sd-field-error">
                                    <AlertTriangle size={11} /> {loginErrors.email}
                                  </div>
                                )}
                              </div>

                              {/* Password input */}
                              <div className="sd-field">
                                <label className="sd-label">
                                  <Lock size={13} /> Password
                                </label>
                                <div className="sd-input-wrap">
                                  <span className="sd-input-ico"><Lock size={14} /></span>
                                  <input
                                    className={`sd-input with-icon with-eye${loginErrors.password ? " is-error" : ""}`}
                                    type={showPw ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={loginForm.password}
                                    onChange={e => {
                                      setLoginForm(f => ({ ...f, password: e.target.value }));
                                      setLoginErrors(p => ({ ...p, password: "" }));
                                    }}
                                    data-testid="input-password"
                                  />
                                  <button
                                    type="button"
                                    className="sd-input-eye"
                                    onClick={() => setShowPw(v => !v)}
                                    aria-label={showPw ? "Hide password" : "Show password"}
                                  >
                                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                  </button>
                                </div>
                                {loginErrors.password && (
                                  <div className="sd-field-error">
                                    <AlertTriangle size={11} /> {loginErrors.password}
                                  </div>
                                )}
                              </div>

                              <div style={{ textAlign: "right", marginTop: 4, marginBottom: 12 }}>
                                <Link href="/forgot-password">
                                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--sd-muted)", textDecoration: "none" }}>Forgot password?</span>
                                </Link>
                              </div>

                              <div className="sd-step-actions">
                                <button
                                  type="button"
                                  className="sd-btn sd-btn-outline"
                                  onClick={handleLoginBack}
                                >
                                  <ChevronLeft size={15} /> Back
                                </button>
                                <button
                                  type="button"
                                  className="sd-btn"
                                  onClick={handleLoginNext}
                                  disabled={loginMutation.isPending}
                                  data-testid="button-login"
                                >
                                  {loginMutation.isPending ? (
                                    <>
                                      <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                                      Signing In…
                                    </>
                                  ) : (
                                    <>
                                      Sign In <ChevronRight size={15} />
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Login Step 3 — CAPTCHA Security Check */}
                          {loginStep === 3 && (
                            <div>
                              {loginErrors.captcha && (
                                <div className="sd-alert">
                                  <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                                  <div className="sd-alert-text">{loginErrors.captcha}</div>
                                </div>
                              )}

                              <div className="sd-field">
                                <label className="sd-label">
                                  <Shield size={13} /> Security Verification
                                </label>
                                <div className="sd-captcha-card">
                                  {captchaData ? (
                                    <>
                                      <div
                                        className="sd-captcha-view"
                                        dangerouslySetInnerHTML={{ __html: captchaData.svg }}
                                      />
                                      <div className="sd-captcha-input-row">
                                        <input
                                          className={`sd-input${loginErrors.captcha ? " is-error" : ""}`}
                                          style={{ textAlign: "center", letterSpacing: "2px", fontWeight: 800 }}
                                          placeholder="Enter security code"
                                          value={loginForm.captchaAnswer}
                                          onChange={e => {
                                            setLoginForm(f => ({ ...f, captchaAnswer: e.target.value }));
                                            setLoginErrors(p => ({ ...p, captcha: "" }));
                                          }}
                                        />
                                        <button
                                          type="button"
                                          className="sd-captcha-refresh-btn"
                                          onClick={loadCaptcha}
                                          disabled={captchaLoading}
                                          title="Get new code"
                                        >
                                          <RefreshCw
                                            size={15}
                                            style={{ animation: captchaLoading ? "spin 1s linear infinite" : "none" }}
                                          />
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="sd-btn sd-btn-outline"
                                      onClick={loadCaptcha}
                                      disabled={captchaLoading}
                                    >
                                      {captchaLoading ? (
                                        <>
                                          <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                                          Loading Code…
                                        </>
                                      ) : (
                                        <>
                                          <Shield size={15} /> Load Verification Code
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="sd-step-actions">
                                <button
                                  type="button"
                                  className="sd-btn sd-btn-outline"
                                  onClick={handleLoginBack}
                                >
                                  <ChevronLeft size={15} /> Back
                                </button>
                                <button
                                  type="button"
                                  className="sd-btn"
                                  onClick={handleLoginNext}
                                  disabled={loginMutation.isPending}
                                >
                                  {loginMutation.isPending ? (
                                    <>
                                      <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                                      Verifying…
                                    </>
                                  ) : (
                                    <>
                                      Verify <ChevronRight size={15} />
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ────────── CREATE ACCOUNT FLOW ────────── */}
              {activeTab === "register" && (
                <motion.div
                  key="register-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="sd-card">
                    <div className="sd-card-header">
                      <h2 className="sd-card-title">
                        {step === 1 && "Select Your Role"}
                        {step === 2 && "Profile Details"}
                        {step === 3 && (regRole === "student" ? "Academic Setup" : "Teaching Profile")}
                        {step === 4 && "Set Password"}
                      </h2>
                      <p className="sd-card-sub">
                        {step === 1 && "Tell us how you will use GradeUp AI"}
                        {step === 2 && "Enter your basic account details"}
                        {step === 3 && (regRole === "student" ? "Curriculum board & class" : "Educator specifications")}
                        {step === 4 && "Create your account password"}
                      </p>
                    </div>

                    <div className="sd-card-body">
                      <StepIndicator current={step} steps={REGISTER_STEPS} />

                      {regErrors.form && (
                        <div className="sd-alert">
                          <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                          <div className="sd-alert-text">{regErrors.form}</div>
                        </div>
                      )}

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`register-step-${step}`}
                          initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -14 }}
                          transition={{ duration: 0.16 }}
                        >

                          {/* Step 1 — Role Selection */}
                          {step === 1 && (
                            <div>
                              <div className="sd-role-grid">
                                {([
                                  { val: "student", icon: "🎓", name: "Student", desc: "Interactive quizzes, AI study tutor & rewards" },
                                  { val: "teacher", icon: "👨‍🏫", name: "Teacher", desc: "Create tests, track progress & guide students" },
                                ] as const).map(r => (
                                  <div
                                    key={r.val}
                                    className={`sd-role-card${regRole === r.val ? " selected" : ""}`}
                                    onClick={() => setRegRole(r.val)}
                                  >
                                    {regRole === r.val && (
                                      <div className="sd-role-check">
                                        <Check size={11} strokeWidth={3} />
                                      </div>
                                    )}
                                    <span className="sd-role-ico">{r.icon}</span>
                                    <div className="sd-role-title">{r.name}</div>
                                    <div className="sd-role-desc">{r.desc}</div>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                className="sd-btn"
                                onClick={() => setStep(2)}
                              >
                                Continue <ChevronRight size={15} />
                              </button>
                            </div>
                          )}

                          {/* Step 2 — Profile Details (Space-Optimized 2-Column) */}
                          {step === 2 && (
                            <div>
                              <div className="sd-field-row sd-field">
                                <div>
                                  <label className="sd-label">First Name</label>
                                  <input
                                    className={`sd-input${regErrors.firstName ? " is-error" : ""}`}
                                    placeholder="Alex"
                                    value={regForm.firstName}
                                    onChange={e => setRegForm(f => ({ ...f, firstName: e.target.value }))}
                                    data-testid="input-firstname"
                                  />
                                  {regErrors.firstName && (
                                    <div className="sd-field-error">
                                      <AlertTriangle size={11} /> {regErrors.firstName}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <label className="sd-label">Last Name</label>
                                  <input
                                    className={`sd-input${regErrors.lastName ? " is-error" : ""}`}
                                    placeholder="Smith"
                                    value={regForm.lastName}
                                    onChange={e => setRegForm(f => ({ ...f, lastName: e.target.value }))}
                                    data-testid="input-lastname"
                                  />
                                  {regErrors.lastName && (
                                    <div className="sd-field-error">
                                      <AlertTriangle size={11} /> {regErrors.lastName}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className={regRole === "student" ? "sd-field-row sd-field" : "sd-field"}>
                                <div>
                                  <label className="sd-label">Username</label>
                                  <input
                                    className={`sd-input${regErrors.username ? " is-error" : ""}`}
                                    placeholder="alexsmith99"
                                    value={regForm.username}
                                    onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
                                    data-testid="input-username"
                                  />
                                  {regErrors.username && (
                                    <div className="sd-field-error">
                                      <AlertTriangle size={11} /> {regErrors.username}
                                    </div>
                                  )}
                                </div>

                                {regRole === "student" && (
                                  <div>
                                    <label className="sd-label">School Name</label>
                                    <input
                                      className={`sd-input${regErrors.schoolName ? " is-error" : ""}`}
                                      placeholder="School name"
                                      value={regForm.schoolName}
                                      onChange={e => setRegForm(f => ({ ...f, schoolName: e.target.value }))}
                                    />
                                    {regErrors.schoolName && (
                                      <div className="sd-field-error">
                                        <AlertTriangle size={11} /> {regErrors.schoolName}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="sd-field">
                                <label className="sd-label">Email Address</label>
                                <div className="sd-input-wrap">
                                  <span className="sd-input-ico"><Mail size={14} /></span>
                                  <input
                                    className={`sd-input with-icon${regErrors.email ? " is-error" : ""}`}
                                    type="email"
                                    placeholder="alex@example.com"
                                    value={regForm.email}
                                    onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                                    data-testid="input-reg-email"
                                  />
                                </div>
                                {regErrors.email && (
                                  <div className="sd-field-error">
                                    <AlertTriangle size={11} /> {regErrors.email}
                                  </div>
                                )}
                              </div>

                              <div className="sd-step-actions">
                                <button
                                  type="button"
                                  className="sd-btn sd-btn-outline"
                                  onClick={() => setStep(1)}
                                >
                                  <ChevronLeft size={15} /> Back
                                </button>
                                <button
                                  type="button"
                                  className="sd-btn"
                                  onClick={() => {
                                    if (validateStep()) setStep(3);
                                  }}
                                >
                                  Continue <ChevronRight size={15} />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Step 3 — Board & Grade Setup */}
                          {step === 3 && (
                            <div>
                              {regRole === "student" ? (
                                <>
                                  <div className="sd-field">
                                    <label className="sd-label">
                                      <BookOpen size={13} /> Curriculum Board
                                    </label>
                                    <div className="sd-chips">
                                      {BOARDS.map(b => (
                                        <button
                                          key={b}
                                          type="button"
                                          className={`sd-chip${regBoard === b ? " active" : ""}`}
                                          onClick={() => {
                                            setRegBoard(b);
                                            setRegErrors(p => ({ ...p, board: "" }));
                                          }}
                                        >
                                          {b}
                                        </button>
                                      ))}
                                    </div>
                                    {regErrors.board && (
                                      <div className="sd-field-error">
                                        <AlertTriangle size={11} /> {regErrors.board}
                                      </div>
                                    )}
                                  </div>

                                  <div className="sd-field">
                                    <label className="sd-label">
                                      <GraduationCap size={13} /> Class / Grade
                                    </label>
                                    <input
                                      className={`sd-input${regErrors.grade ? " is-error" : ""}`}
                                      placeholder="e.g. 10"
                                      value={regGrade}
                                      onChange={e => {
                                        setRegGrade(e.target.value);
                                        setRegErrors(p => ({ ...p, grade: "" }));
                                      }}
                                    />
                                    {regErrors.grade && (
                                      <div className="sd-field-error">
                                        <AlertTriangle size={11} /> {regErrors.grade}
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="sd-summary-box" style={{ marginBottom: 14 }}>
                                  <div className="sd-summary-title">
                                    <Star size={13} /> Educator Account
                                  </div>
                                  <p style={{ fontSize: "12px", color: "var(--sd-muted)", lineHeight: 1.45 }}>
                                    Full access to student classroom rosters, debate setup, and analytics.
                                  </p>
                                </div>
                              )}

                              <div className="sd-step-actions">
                                <button
                                  type="button"
                                  className="sd-btn sd-btn-outline"
                                  onClick={() => setStep(2)}
                                >
                                  <ChevronLeft size={15} /> Back
                                </button>
                                <button
                                  type="button"
                                  className="sd-btn"
                                  onClick={() => {
                                    if (validateStep()) setStep(4);
                                  }}
                                >
                                  Continue <ChevronRight size={15} />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Step 4 — Password & Overview (Compact) */}
                          {step === 4 && (
                            <div>
                              <div className="sd-field-row sd-field">
                                <div>
                                  <label className="sd-label">Password</label>
                                  <div className="sd-input-wrap">
                                    <span className="sd-input-ico"><Lock size={13} /></span>
                                    <input
                                      className={`sd-input with-icon with-eye${regErrors.password ? " is-error" : ""}`}
                                      type={showRegPw ? "text" : "password"}
                                      placeholder="Min 8 chars"
                                      value={regForm.password}
                                      onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                                      data-testid="input-reg-password"
                                    />
                                    <button
                                      type="button"
                                      className="sd-input-eye"
                                      onClick={() => setShowRegPw(v => !v)}
                                      aria-label={showRegPw ? "Hide password" : "Show password"}
                                    >
                                      {showRegPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                  </div>
                                  {regErrors.password && (
                                    <div className="sd-field-error">
                                      <AlertTriangle size={11} /> {regErrors.password}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <label className="sd-label">Confirm Password</label>
                                  <div className="sd-input-wrap">
                                    <span className="sd-input-ico"><Lock size={13} /></span>
                                    <input
                                      className={`sd-input with-icon with-eye${regErrors.confirmPassword ? " is-error" : ""}`}
                                      type={showRegConf ? "text" : "password"}
                                      placeholder="Re-enter"
                                      value={regForm.confirmPassword}
                                      onChange={e => setRegForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                    />
                                    <button
                                      type="button"
                                      className="sd-input-eye"
                                      onClick={() => setShowRegConf(v => !v)}
                                      aria-label={showRegConf ? "Hide password" : "Show password"}
                                    >
                                      {showRegConf ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                  </div>
                                  {regErrors.confirmPassword && (
                                    <div className="sd-field-error">
                                      <AlertTriangle size={11} /> {regErrors.confirmPassword}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Compact Account Overview */}
                              <div className="sd-summary-box">
                                <div className="sd-summary-title">
                                  <Check size={13} strokeWidth={3} /> Overview
                                </div>
                                {([
                                  ["Role", regRole === "student" ? "🎓 Student" : "👨‍🏫 Teacher"],
                                  ["Name", `${regForm.firstName} ${regForm.lastName}`.trim() || "—"],
                                  ["Email", regForm.email || "—"],
                                  ...(regRole === "student"
                                    ? [["Class", `${regBoard || "Board"} - Class ${regGrade || "—"}`]]
                                    : []),
                                ] as [string, string][]).map(([k, v]) => (
                                  <div key={k} className="sd-summary-row">
                                    <span className="sd-summary-key">{k}</span>
                                    <span className="sd-summary-val">{v}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Student OAuth option */}
                              {regRole === "student" && (
                                <>
                                  <div className="sd-oauth-grid">
                                    <button
                                      className="sd-oauth-btn"
                                      type="button"
                                      disabled={oauthMutation.isPending}
                                      onClick={() => handleOAuth("google", "signup")}
                                    >
                                      <GoogleIcon style={{ color: "#ea4335", fontSize: 13 }} /> Google
                                    </button>
                                    <button
                                      className="sd-oauth-btn"
                                      type="button"
                                      disabled={oauthMutation.isPending}
                                      onClick={() => handleOAuth("microsoft", "signup")}
                                    >
                                      <MicrosoftIcon style={{ color: "#00a4ef", fontSize: 13 }} /> Microsoft
                                    </button>
                                  </div>
                                </>
                              )}

                              <div className="sd-step-actions">
                                <button
                                  type="button"
                                  className="sd-btn sd-btn-outline"
                                  onClick={() => setStep(3)}
                                >
                                  <ChevronLeft size={15} /> Back
                                </button>
                                <button
                                  type="button"
                                  className="sd-btn"
                                  onClick={handleRegisterSubmit}
                                  disabled={registerMutation.isPending}
                                >
                                  {registerMutation.isPending ? (
                                    <>
                                      <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                                      Creating…
                                    </>
                                  ) : (
                                    <>
                                      Create Account <Check size={15} strokeWidth={2.5} />
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Footer terms notice */}
            <p className="sd-auth-footer">
              By proceeding, you agree to GradeUp's{" "}
              <a href="#">Terms</a> &amp; <a href="#">Privacy</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

