import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Check, Mic, MicOff, Shield,
  Timer as TimerIcon, Star, Sun, Moon, GripVertical,
  LayoutGrid, ChevronLeft, ChevronRight, BookOpen,
  HelpCircle, PencilRuler, BrainCircuit, Sparkles,
} from 'lucide-react';
import {
  Drawer, DrawerClose, DrawerContent, DrawerFooter,
  DrawerHeader, DrawerTitle, DrawerTrigger,
} from '../components/ui/drawer';
import ExamResultDisplay from '../components/exam-result-display';
import { useTheme } from '../hooks/use-theme';
import { useMediaQuery } from '../hooks/use-media-query';
import { mockExamQuestions, Question } from '../lib/mock-exam-data';

export const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
.ep * { font-family:'Plus Jakarta Sans',system-ui,sans-serif; }

/* ── THEME VARIABLES (Aligned with Student Dashboard) ── */
:root {
  --ep-page:        #fbfcff;
  --ep-page-2:      #f5f7ff;
  --ep-surface:     rgba(255,255,255,.90);
  --ep-surface2:    #f7faff;
  --ep-text:        #071235;
  --ep-text2:       #243048;
  --ep-muted:       #68708a;
  --ep-subtle:      #8c94aa;
  --ep-border:      rgba(15,23,42,.09);
  --ep-border2:     rgba(15,23,42,.14);
  --ep-input-bg:    #f8fbff;
  --ep-opt-bg:      rgba(255,255,255,.78);
  --ep-opt-bdr:     rgba(15,23,42,.09);
  --ep-pal-bg:      rgba(255,255,255,.90);
  --ep-rc-bg:       rgba(255,255,255,.90);
  --ep-sub-bg:      rgba(255,255,255,.90);
  --ep-stm-bg:      #f5f8ff;
  --ep-nav-bg:      rgba(255,255,255,.82);
  --ep-nav-text:    #071235;
  --ep-btn-un:      #f1f4fb;
  --ep-btn-un-txt:  #68708a;
  --ep-loader-bg:   #fbfcff;
  --ep-shadow:      0 12px 30px rgba(35,44,87,.10);
  --ep-shadow-soft: 0 7px 18px rgba(35,44,87,.08);
}

[data-theme="dark"], .dark {
  --ep-page:        #080d1f;
  --ep-page-2:      #10172d;
  --ep-surface:     rgba(23,31,58,.92);
  --ep-surface2:    rgba(31,42,76,.72);
  --ep-text:        #f6f7ff;
  --ep-text2:       #cbd5e1;
  --ep-muted:       #b5bfd8;
  --ep-subtle:      #7f8aa7;
  --ep-border:      rgba(255,255,255,.12);
  --ep-border2:     rgba(255,255,255,.18);
  --ep-input-bg:    rgba(14,20,40,.85);
  --ep-opt-bg:      rgba(26,35,66,.72);
  --ep-opt-bdr:     rgba(255,255,255,.12);
  --ep-pal-bg:      rgba(23,31,58,.92);
  --ep-rc-bg:       rgba(23,31,58,.92);
  --ep-sub-bg:      rgba(23,31,58,.92);
  --ep-stm-bg:      rgba(16,23,45,.75);
  --ep-nav-bg:      rgba(23,31,58,.88);
  --ep-nav-text:    #b5bfd8;
  --ep-btn-un:      rgba(35,47,84,.8);
  --ep-btn-un-txt:  #cbd5e1;
  --ep-loader-bg:   #080d1f;
  --ep-shadow:      0 20px 54px rgba(0,0,0,.38);
  --ep-shadow-soft: 0 12px 30px rgba(0,0,0,.24);
}

/* ── ANIMATIONS ── */
@keyframes sdFloatBg {
  from { transform: translate3d(0,0,0) scale(1); }
  to   { transform: translate3d(24px,28px,0) scale(1.08); }
}
@keyframes sdDrift {
  0%,100% { transform: translate3d(0,0,0) rotate(0deg); }
  50%     { transform: translate3d(14px,-10px,0) rotate(6deg); }
}
@keyframes sdBreathe {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-5px); }
}
@keyframes sdPop3d {
  0%,100% { transform: translateY(0) scale(1); }
  50%     { transform: translateY(-3px) scale(1.03); }
}
@keyframes sdProgressSweep {
  0%   { transform: translateX(-120%) skewX(-20deg); }
  100% { transform: translateX(220%) skewX(-20deg); }
}
@keyframes tpulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%     { opacity:.75; transform:scale(1.02); }
}
@keyframes wave {
  0%,100% { height:6px; opacity:.5; }
  50%     { height:18px; opacity:1; }
}

/* ── ROOT CONTAINER ── */
.ep {
  display:flex; flex-direction:column;
  height:100dvh;
  background: radial-gradient(circle at 14% 9%,rgba(126,87,255,.12),transparent 26%),
              radial-gradient(circle at 88% 14%,rgba(255,171,64,.16),transparent 25%),
              linear-gradient(180deg,var(--ep-page),var(--ep-page-2));
  color:var(--ep-text);
  overflow:hidden; position:relative;
  transition:background .3s,color .3s;
}
[data-theme="dark"] .ep, .dark .ep {
  background: radial-gradient(circle at 14% 9%,rgba(126,87,255,.16),transparent 26%),
              radial-gradient(circle at 88% 14%,rgba(255,171,64,.12),transparent 25%),
              linear-gradient(180deg,var(--ep-page),var(--ep-page-2));
}

.ep::before, .ep::after {
  content:""; position:absolute; border-radius:999px;
  pointer-events:none; filter:blur(1px); opacity:.55;
  animation:sdFloatBg 14s ease-in-out infinite alternate;
}
.ep::before {
  width:260px; height:260px; left:-80px; top:90px;
  background:radial-gradient(circle,rgba(46,182,255,.18),transparent 68%);
}
.ep::after {
  width:300px; height:300px; right:-90px; bottom:60px;
  background:radial-gradient(circle,rgba(255,121,31,.14),transparent 70%);
  animation-delay:-5s;
}

.ep-spark {
  position:absolute; pointer-events:none; z-index:0;
  border-radius:999px; opacity:.45; animation:sdDrift 9s ease-in-out infinite;
}
.ep-spark.s1 { left:50%; top:70px; width:8px; height:8px; background:#ffb21d; box-shadow:28px 24px 0 #27b86a, 68px -10px 0 #2389ff; }
.ep-spark.s2 { right:14%; top:280px; width:7px; height:7px; background:#ff4d8d; box-shadow:-40px 36px 0 #7e45e8; animation-delay:-3s; }

/* ── TOP BAR (Matching Student Dashboard Studio/AI Header) ── */
.ep-top {
  flex-shrink:0; height:60px; padding:0 22px;
  background:linear-gradient(135deg,#0c173d 0%,#132b6b 52%,#0f4882 100%);
  border-bottom:1px solid rgba(255,255,255,.14);
  box-shadow:0 6px 24px rgba(7,18,53,.22);
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  position:relative; overflow:hidden; z-index:10;
}
.ep-top::before {
  content:''; position:absolute; top:-40px; right:200px;
  width:160px; height:160px; border-radius:50%;
  background:radial-gradient(circle,rgba(14,165,233,.28),transparent 70%);
  pointer-events:none; animation:sdBreathe 6s ease-in-out infinite;
}
.ep-top::after {
  content:''; position:absolute; left:-30px; bottom:-40px;
  width:140px; height:140px; border-radius:50%;
  background:radial-gradient(circle,rgba(255,178,29,.22),transparent 70%);
  pointer-events:none;
}

.ep-top-l { display:flex; align-items:center; gap:12px; position:relative; z-index:1; min-width:0; }
.ep-top-ico {
  width:38px; height:38px; border-radius:12px; flex-shrink:0;
  background:linear-gradient(145deg,rgba(255,255,255,.24),rgba(255,255,255,.08));
  border:1.5px solid rgba(255,255,255,.28);
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 4px 12px rgba(0,0,0,.15);
  animation:sdPop3d 4s ease-in-out infinite;
}
.ep-top-title { font-size:clamp(14px,2.1vw,17px); font-weight:800; color:#ffffff; letter-spacing:-.2px; }
.ep-top-sub   {
  display:inline-flex; align-items:center; gap:6px;
  font-size:11px; font-weight:700; color:rgba(255,255,255,.75);
  margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.ep-top-sub-chip {
  padding:1px 7px; border-radius:999px;
  background:rgba(35,137,255,.28); border:1px solid rgba(255,255,255,.24);
  color:#7ee7b7; font-size:10px; font-weight:800;
}

.ep-top-r { display:flex; align-items:center; gap:10px; position:relative; z-index:1; flex-shrink:0; }

.ep-timer {
  display:flex; align-items:center; gap:8px; padding:6px 14px;
  border-radius:13px;
  background:rgba(255,255,255,.14);
  border:1.5px solid rgba(255,255,255,.25);
  backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
  box-shadow:0 4px 14px rgba(0,0,0,.12);
  transition:all .2s ease;
}
.ep-timer.warn {
  background:linear-gradient(135deg,rgba(239,68,68,.32),rgba(220,38,38,.42));
  border-color:rgba(254,202,202,.5);
  animation:tpulse 1.1s ease-in-out infinite;
  box-shadow:0 0 16px rgba(239,68,68,.4);
}
.ep-timer-val {
  font-size:clamp(15px,2.4vw,20px); font-weight:900; color:#fff;
  letter-spacing:-.5px; font-variant-numeric:tabular-nums;
}
.ep-timer.warn .ep-timer-val { color:#fee2e2; }

.ep-icobtn {
  width:36px; height:36px; border-radius:11px; flex-shrink:0;
  background:rgba(255,255,255,.14);
  border:1.5px solid rgba(255,255,255,.22);
  backdrop-filter:blur(12px);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:#fff; transition:all .2s;
  box-shadow:0 4px 12px rgba(0,0,0,.1);
}
.ep-icobtn:hover {
  background:rgba(255,255,255,.26);
  transform:translateY(-2px);
  box-shadow:0 6px 16px rgba(0,0,0,.18);
}

/* ── BODY GRID ── */
.ep-body {
  flex:1; display:grid; grid-template-columns:1fr 288px;
  gap:14px; padding:14px 22px; min-height:0; overflow:hidden;
  position:relative; z-index:1;
}

/* ── LEFT: QUESTION SECTION ── */
.ep-left { display:flex; flex-direction:column; min-height:0; overflow:hidden; }

.ep-qcard {
  flex:1; display:flex; flex-direction:column;
  background:var(--ep-surface);
  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
  border-radius:20px;
  border:1px solid var(--ep-border);
  box-shadow:var(--ep-shadow);
  overflow:hidden; min-height:0;
  transition:background .3s,border-color .3s,box-shadow .3s;
  position:relative;
}
.ep-qcard::before {
  content:""; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,#2389ff,#7b2cff 50%,#ffb21d);
  z-index:3;
}

/* Q Header */
.ep-qhead {
  flex-shrink:0; padding:12px 20px;
  border-bottom:1px solid var(--ep-border);
  background:linear-gradient(180deg,rgba(255,255,255,.4),transparent);
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
}
[data-theme="dark"] .ep-qhead, .dark .ep-qhead {
  background:linear-gradient(180deg,rgba(255,255,255,.04),transparent);
}

.epbadge {
  font-size:10.5px; font-weight:800; text-transform:uppercase;
  letter-spacing:.05em; padding:4px 11px; border-radius:999px;
  display:inline-flex; align-items:center; gap:5px;
  transition:all .18s ease;
}
.epbadge-q {
  background:linear-gradient(135deg,rgba(37,99,235,.15),rgba(14,165,233,.15));
  border:1px solid rgba(14,165,233,.25);
  color:#0284c7;
}
[data-theme="dark"] .epbadge-q, .dark .epbadge-q { color:#38bdf8; border-color:rgba(56,189,248,.3); }

.epbadge-mcq { background:rgba(35,137,255,.12); color:#0284c7; border:1px solid rgba(35,137,255,.2); }
[data-theme="dark"] .epbadge-mcq, .dark .epbadge-mcq { color:#38bdf8; }

.epbadge-sh  { background:rgba(255,121,31,.12); color:#ea580c; border:1px solid rgba(255,121,31,.2); }
[data-theme="dark"] .epbadge-sh, .dark .epbadge-sh { color:#fb923c; }

.epbadge-lg  { background:rgba(126,69,232,.12); color:#7c3aed; border:1px solid rgba(126,69,232,.2); }
[data-theme="dark"] .epbadge-lg, .dark .epbadge-lg { color:#a78bfa; }

.epbadge-sp  { background:rgba(39,184,106,.12); color:#16a34a; border:1px solid rgba(39,184,106,.2); }
[data-theme="dark"] .epbadge-sp, .dark .epbadge-sp { color:#4ade80; }

.epbadge-mk  {
  font-size:11px; font-weight:800; color:var(--ep-muted);
  margin-left:auto; display:inline-flex; align-items:center; gap:4px;
  padding:3px 10px; border-radius:999px; background:var(--ep-surface2);
  border:1px solid var(--ep-border);
}

/* Q Body (Independent Scroll) */
.ep-qbody {
  flex:1; overflow-y:auto; padding:20px; min-height:0;
  display:flex; flex-direction:column;
}
.ep-qbody::-webkit-scrollbar { width:4px; }
.ep-qbody::-webkit-scrollbar-thumb {
  background:rgba(35,137,255,.25); border-radius:99px;
}

.ep-qtext {
  font-size:clamp(15px,1.8vw,18px); font-weight:800;
  color:var(--ep-text); line-height:1.6; margin-bottom:18px;
  letter-spacing:-.1px;
}

/* MCQ Options */
.ep-opt-grid { display:flex; flex-direction:column; gap:9px; }
.ep-opt {
  display:flex; align-items:center; gap:12px; padding:12px 16px;
  border-radius:15px; border:2px solid var(--ep-opt-bdr);
  background:var(--ep-opt-bg); cursor:pointer;
  transition:all .2s cubic-bezier(.22,1,.36,1);
  box-shadow:var(--ep-shadow-soft);
  position:relative; overflow:hidden;
}
.ep-opt::before {
  content:""; position:absolute; inset:0;
  background:linear-gradient(90deg,rgba(35,137,255,.05),transparent);
  opacity:0; transition:opacity .2s;
}
.ep-opt:hover {
  border-color:#38bdf8;
  transform:translateY(-2px);
  box-shadow:0 8px 20px rgba(35,137,255,.14);
}
.ep-opt:hover::before { opacity:1; }

.ep-opt.sel {
  border-color:#2563eb;
  background:linear-gradient(135deg,rgba(37,99,235,.08),rgba(14,165,233,.08));
  box-shadow:0 0 0 3px rgba(37,99,235,.15), 0 8px 22px rgba(35,137,255,.18);
  transform:translateY(-1px);
}
[data-theme="dark"] .ep-opt.sel, .dark .ep-opt.sel {
  border-color:#38bdf8;
  background:linear-gradient(135deg,rgba(56,189,248,.14),rgba(37,99,235,.14));
  box-shadow:0 0 0 3px rgba(56,189,248,.2), 0 8px 22px rgba(0,0,0,.35);
}

.ep-opt-idx {
  width:28px; height:28px; border-radius:10px; flex-shrink:0;
  display:grid; place-items:center; font-size:12px; font-weight:800;
  background:var(--ep-surface2); border:1px solid var(--ep-border2);
  color:var(--ep-muted); transition:all .2s ease;
}
.ep-opt.sel .ep-opt-idx {
  background:linear-gradient(135deg,#2563eb,#0ea5e9);
  color:#fff; border-color:transparent;
  box-shadow:0 3px 8px rgba(37,99,235,.35);
}

.ep-opt-lbl {
  font-size:14px; font-weight:600; color:var(--ep-text2);
  flex:1; line-height:1.45; cursor:pointer;
}
.ep-opt.sel .ep-opt-lbl {
  color:var(--ep-text); font-weight:800;
}

.ep-opt-radio {
  width:18px; height:18px; border-radius:50%; flex-shrink:0;
  border:2px solid var(--ep-border2); display:flex;
  align-items:center; justify-content:center; transition:all .2s;
}
.ep-opt.sel .ep-opt-radio {
  border-color:#2563eb; background:#2563eb;
  box-shadow:0 0 8px rgba(37,99,235,.4);
}
[data-theme="dark"] .ep-opt.sel .ep-opt-radio, .dark .ep-opt.sel .ep-opt-radio {
  border-color:#38bdf8; background:#38bdf8;
}
.ep-opt-dot { width:7px; height:7px; border-radius:50%; background:#fff; }

/* Textarea for Short & Long */
.ep-ta {
  width:100%; border-radius:15px; border:2px solid var(--ep-border2);
  padding:14px 16px; font-size:14px; font-family:inherit;
  color:var(--ep-text); resize:none; outline:none;
  background:var(--ep-input-bg); line-height:1.65;
  transition:border .2s,background .3s,box-shadow .2s;
}
.ep-ta:focus {
  border-color:#2563eb; background:var(--ep-surface);
  box-shadow:0 0 0 4px rgba(37,99,235,.15);
}
[data-theme="dark"] .ep-ta:focus, .dark .ep-ta:focus {
  border-color:#38bdf8;
  box-shadow:0 0 0 4px rgba(56,189,248,.2);
}

/* Speech Area */
.ep-speech-area { display:flex; flex-direction:column; gap:12px; align-items:center; }
.ep-speech-transcript {
  width:100%; border-radius:15px; border:2px solid var(--ep-border2);
  padding:14px 16px; font-size:14px; color:var(--ep-text);
  background:var(--ep-input-bg); min-height:100px; line-height:1.65;
  font-family:inherit; resize:none; outline:none;
  transition:background .3s,color .3s,border-color .3s;
}
.ep-speech-btn {
  display:inline-flex; align-items:center; gap:9px; padding:12px 28px;
  border-radius:14px; border:none; cursor:pointer; font-family:inherit;
  font-size:14px; font-weight:800; color:#fff; transition:all .2s;
}
.ep-speech-btn.idle {
  background:linear-gradient(135deg,#10b981,#059669);
  box-shadow:0 6px 18px rgba(16,185,129,.35);
}
.ep-speech-btn.idle:hover {
  transform:translateY(-2px) scale(1.02);
  box-shadow:0 10px 24px rgba(16,185,129,.45);
}
.ep-speech-btn.active {
  background:linear-gradient(135deg,#ff6b4a,#ef4444);
  box-shadow:0 6px 18px rgba(239,68,68,.4);
  animation:tpulse 1s ease-in-out infinite;
}
.ep-speech-listening {
  display:flex; align-items:center; gap:8px;
  font-size:12.5px; color:#2563eb; font-weight:800;
}
[data-theme="dark"] .ep-speech-listening, .dark .ep-speech-listening { color:#38bdf8; }
.ep-speech-wave { display:flex; align-items:center; gap:3px; }
.ep-speech-wave span {
  display:inline-block; width:3.5px; border-radius:4px;
  background:#2563eb; animation:wave 0.8s ease-in-out infinite;
}
[data-theme="dark"] .ep-speech-wave span, .dark .ep-speech-wave span { background:#38bdf8; }
.ep-speech-wave span:nth-child(1) { animation-delay:0s; }
.ep-speech-wave span:nth-child(2) { animation-delay:0.15s; }
.ep-speech-wave span:nth-child(3) { animation-delay:0.3s; }
.ep-speech-wave span:nth-child(4) { animation-delay:0.45s; }

.ep-speech-hint { font-size:12px; color:var(--ep-subtle); text-align:center; font-weight:600; }

/* Q Footer */
.ep-qfoot {
  flex-shrink:0; padding:12px 20px;
  border-top:1px solid var(--ep-border);
  background:linear-gradient(180deg,transparent,rgba(255,255,255,.3));
  display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;
}
[data-theme="dark"] .ep-qfoot, .dark .ep-qfoot {
  background:linear-gradient(180deg,transparent,rgba(255,255,255,.04));
}

.ep-nav {
  display:inline-flex; align-items:center; gap:6px; padding:9px 16px;
  border-radius:13px; border:1.5px solid var(--ep-border2);
  background:var(--ep-nav-bg); font-family:inherit; font-size:12.5px;
  font-weight:700; cursor:pointer; color:var(--ep-nav-text);
  box-shadow:var(--ep-shadow-soft); transition:all .2s;
}
.ep-nav:hover:not(:disabled) {
  border-color:#2563eb; color:#2563eb; transform:translateY(-1px);
}
[data-theme="dark"] .ep-nav:hover:not(:disabled), .dark .ep-nav:hover:not(:disabled) {
  border-color:#38bdf8; color:#38bdf8;
}
.ep-nav:disabled { opacity:.35; cursor:not-allowed; }

.ep-foot-r { display:flex; gap:8px; flex-wrap:wrap; }

.ep-rev {
  display:inline-flex; align-items:center; gap:6px; padding:9px 16px;
  border-radius:13px; border:1.5px solid rgba(255,121,31,.35);
  background:linear-gradient(135deg,rgba(255,121,31,.08),rgba(255,178,29,.08));
  font-family:inherit; font-size:12px; font-weight:800; cursor:pointer;
  color:#ea580c; transition:all .2s; box-shadow:var(--ep-shadow-soft);
}
[data-theme="dark"] .ep-rev, .dark .ep-rev { color:#fb923c; border-color:rgba(251,146,60,.4); }
.ep-rev:hover {
  background:linear-gradient(135deg,rgba(255,121,31,.18),rgba(255,178,29,.18));
  transform:translateY(-1px); box-shadow:0 6px 16px rgba(255,121,31,.2);
}

.ep-sav {
  display:inline-flex; align-items:center; gap:6px; padding:9px 18px;
  border-radius:13px; border:none;
  background:linear-gradient(135deg,#2563eb,#0ea5e9);
  font-family:inherit; font-size:12.5px; font-weight:800; cursor:pointer;
  color:#fff; box-shadow:0 6px 18px rgba(14,165,233,.32);
  transition:all .2s;
}
.ep-sav:hover {
  transform:translateY(-2px) scale(1.02);
  box-shadow:0 10px 24px rgba(14,165,233,.45);
}

/* ── RIGHT PANEL (Desktop) ── */
.ep-right { display:flex; flex-direction:column; gap:10px; min-height:0; overflow:hidden; }

/* Camera Preview Card */
.ep-rc {
  background:var(--ep-rc-bg);
  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
  border-radius:16px; border:1px solid var(--ep-border);
  box-shadow:var(--ep-shadow); overflow:hidden; flex-shrink:0;
  transition:background .3s,border-color .3s;
}
.ep-ph {
  padding:8px 12px;
  background:linear-gradient(135deg,rgba(35,137,255,.08),rgba(14,165,233,.04));
  border-bottom:1px solid var(--ep-border);
  display:flex; align-items:center; justify-content:space-between;
}
[data-theme="dark"] .ep-ph, .dark .ep-ph {
  background:linear-gradient(135deg,rgba(56,189,248,.12),rgba(35,137,255,.06));
}
.ep-pt {
  font-size:11.5px; font-weight:800; color:var(--ep-text);
  display:flex; align-items:center; gap:6px;
}
.ep-ps {
  display:flex; align-items:center; gap:4px; font-size:10px;
  font-weight:700; color:#10b981;
}
.ep-pd {
  width:6px; height:6px; border-radius:50%; background:#10b981;
  animation:tpulse 1.4s ease-in-out infinite;
}
.ep-wc { height:84px; background:#080d1f; overflow:hidden; }
.ep-pf {
  padding:4px 12px; font-size:9.5px; font-weight:600;
  color:var(--ep-subtle); text-align:center;
  background:var(--ep-surface2); border-top:1px solid var(--ep-border);
}

/* Palette / Navigator Card */
.ep-pal {
  flex:1; display:flex; flex-direction:column;
  background:var(--ep-pal-bg);
  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
  border-radius:16px; border:1px solid var(--ep-border);
  box-shadow:var(--ep-shadow); overflow:hidden; min-height:0;
  transition:background .3s,border-color .3s;
}
.ep-palh {
  flex-shrink:0; padding:10px 14px; border-bottom:1px solid var(--ep-border);
  font-size:12.5px; font-weight:800; color:var(--ep-text);
  display:flex; align-items:center; gap:6px;
}
.ep-palp { flex-shrink:0; padding:8px 14px; }
.ep-palpr {
  display:flex; justify-content:space-between; font-size:11px;
  color:var(--ep-muted); font-weight:700; margin-bottom:5px;
}
.ep-palpb {
  height:6px; background:rgba(35,137,255,.12);
  border-radius:999px; overflow:hidden; position:relative;
}
.ep-palpf {
  height:100%; border-radius:inherit;
  background:linear-gradient(90deg,#2389ff,#6349ff 72%,#ffb21d);
  transition:width .5s cubic-bezier(.22,1,.36,1);
  position:relative;
}
.ep-palpf::after {
  content:""; position:absolute; top:0; bottom:0; width:30px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);
  animation:sdProgressSweep 2.5s ease-in-out infinite;
}

.ep-palscr {
  flex:1; padding:6px 12px; min-height:0; overflow-y:auto;
}
.ep-palscr::-webkit-scrollbar { width:3px; }
.ep-palscr::-webkit-scrollbar-thumb {
  background:rgba(35,137,255,.2); border-radius:99px;
}
.ep-palgr { display:grid; grid-template-columns:repeat(6,1fr); gap:6px; }

.ep-pb {
  width:100%; aspect-ratio:1; border-radius:9px; border:none;
  font-family:inherit; font-size:11px; font-weight:800;
  cursor:pointer; transition:all .18s; position:relative;
}
.epb-un {
  background:var(--ep-btn-un); color:var(--ep-btn-un-txt);
  border:1px solid var(--ep-border);
}
.epb-un:hover {
  background:var(--ep-border2); transform:translateY(-1px);
}
.epb-ans {
  background:linear-gradient(135deg,#27b86a,#14915d);
  color:#fff; box-shadow:0 3px 8px rgba(39,184,106,.32);
}
.epb-rev {
  background:linear-gradient(135deg,#ff791f,#ffb21d);
  color:#fff; box-shadow:0 3px 8px rgba(255,121,31,.32);
}
.epb-cur {
  background:linear-gradient(135deg,#2563eb,#0ea5e9);
  color:#fff; box-shadow:0 4px 12px rgba(14,165,233,.45);
  transform:scale(1.08); z-index:2;
}

.ep-palleg {
  flex-shrink:0; padding:6px 12px 8px; display:flex; flex-wrap:wrap;
  gap:8px; border-top:1px solid var(--ep-border);
  background:var(--ep-surface2);
}
.ep-leg { display:flex; align-items:center; gap:4px; font-size:10px; color:var(--ep-muted); font-weight:700; }
.ep-legdot { width:8px; height:8px; border-radius:3px; flex-shrink:0; }

/* Stats & Submit Card */
.ep-sub {
  flex-shrink:0; background:var(--ep-sub-bg);
  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
  border-radius:16px; border:1px solid var(--ep-border);
  box-shadow:var(--ep-shadow); padding:12px; display:flex; flex-direction:column;
  gap:8px; transition:background .3s,border-color .3s;
}
.ep-subgr { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
.ep-stm {
  padding:7px 4px; border-radius:10px; background:var(--ep-stm-bg);
  border:1px solid var(--ep-border); text-align:center;
  transition:all .2s;
}
.ep-stmv { font-size:15px; font-weight:900; color:var(--ep-text); line-height:1; }
.ep-stml { font-size:9.5px; color:var(--ep-subtle); margin-top:3px; font-weight:700; }
.ep-stm.g .ep-stmv { color:#16a34a; }
[data-theme="dark"] .ep-stm.g .ep-stmv, .dark .ep-stm.g .ep-stmv { color:#4ade80; }
.ep-stm.a .ep-stmv { color:#ea580c; }
[data-theme="dark"] .ep-stm.a .ep-stmv, .dark .ep-stm.a .ep-stmv { color:#fb923c; }
.ep-stm.i .ep-stmv { color:#2563eb; }
[data-theme="dark"] .ep-stm.i .ep-stmv, .dark .ep-stm.i .ep-stmv { color:#38bdf8; }

.ep-subbtn {
  width:100%; padding:11px; border-radius:13px; border:none;
  background:linear-gradient(135deg,#ff6b4a,#ff9436);
  color:#fff; font-family:inherit; font-size:13px; font-weight:900;
  cursor:pointer; transition:all .2s cubic-bezier(.22,1,.36,1);
  box-shadow:0 6px 18px rgba(255,107,74,.36); letter-spacing:.03em;
}
.ep-subbtn:hover {
  transform:translateY(-2px) scale(1.015);
  box-shadow:0 10px 24px rgba(255,107,74,.48);
}

/* ── SYSTEM CHECK (Student Dashboard Palette) ── */
.sc-shell {
  position:fixed; inset:0; background:var(--ep-page);
  display:flex; align-items:center; justify-content:center;
  z-index:999; padding:20px;
}
.sc-card {
  background:var(--ep-surface); border-radius:24px; padding:28px 32px;
  max-width:410px; width:100%; border:1px solid var(--ep-border);
  box-shadow:var(--ep-shadow); text-align:center;
  backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
}
.sc-steps { display:flex; align-items:center; gap:6px; justify-content:center; margin-bottom:18px; }
.sc-step  { height:5px; width:28px; border-radius:4px; background:var(--ep-border2); transition:background .3s; }
.sc-step.d{ background:#2563eb; }
.sc-step.c{ background:linear-gradient(90deg,#2563eb,#0ea5e9); }
.sc-ico {
  width:72px; height:72px; border-radius:22px; margin:0 auto 16px;
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 10px 24px rgba(0,0,0,.15);
  animation:sdPop3d 4s ease-in-out infinite;
}
.sc-title { font-size:19px; font-weight:900; color:var(--ep-text); margin-bottom:7px; }
.sc-desc  { font-size:13px; color:var(--ep-muted); line-height:1.6; margin-bottom:20px; font-weight:600; }
.sc-denied{
  display:flex; align-items:center; justify-content:center; gap:6px;
  padding:10px 14px; border-radius:12px;
  background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.18);
  color:#ef4444; font-size:12.5px; font-weight:700; margin-bottom:14px;
}
.sc-btn {
  width:100%; padding:13px; border-radius:13px; border:none;
  font-family:inherit; font-size:13.5px; font-weight:800; cursor:pointer;
  transition:all .2s;
}
.sc-ind {
  background:linear-gradient(135deg,#2563eb,#0ea5e9); color:#fff;
  box-shadow:0 6px 18px rgba(14,165,233,.35);
}
.sc-red {
  background:linear-gradient(135deg,#ff6b4a,#ff9436); color:#fff;
  box-shadow:0 6px 18px rgba(255,107,74,.36);
}
.sc-btn:hover { transform:translateY(-2px); }

/* ── LOADER (Student Dashboard Palette) ── */
.ep-ldr {
  position:fixed; inset:0; background:var(--ep-loader-bg);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:16px; z-index:999; transition:background .3s;
}
.ep-ldr-ring {
  width:60px; height:60px; border-radius:18px; display:flex;
  align-items:center; justify-content:center;
  background:linear-gradient(135deg,#2563eb,#0ea5e9);
  box-shadow:0 10px 28px rgba(14,165,233,.38);
}
.ep-ldr-text {
  font-size:14px; font-weight:800; color:var(--ep-text);
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
}
.ep-ldr-sub {
  font-size:12px; color:var(--ep-subtle);
  font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-weight:600;
}
.ep-ldr-dots { display:flex; gap:6px; }
.ep-ldr-dot { width:7px; height:7px; border-radius:50%; background:#38bdf8; }

/* ── RESPONSIVE RULES ── */
@media (max-width:1200px) {
  .ep-body { grid-template-columns:1fr 270px; gap:12px; padding:12px 16px; }
}
@media (max-width:1024px) {
  .ep-body { grid-template-columns:1fr 250px; gap:10px; padding:10px 14px; }
  .ep-wc { height:75px; }
}
@media (max-width:900px) {
  .ep-body { grid-template-columns:1fr; padding:10px 12px; }
  .ep-right { display:none; }
}
@media (max-width:640px) {
  .ep-top   { height:54px; padding:0 14px; }
  .ep-body  { padding:8px 10px; }
  .ep-qhead { padding:10px 14px; }
  .ep-qbody { padding:14px; }
  .ep-qfoot { padding:8px 14px; }
  .ep-qtext { font-size:14px; margin-bottom:12px; }
  .ep-top-sub { display:none; }
  .ep-top-ico { display:none; }
  .ep-nav, .ep-rev, .ep-sav { padding:7px 12px; font-size:11.5px; }
  .ep-opt { padding:10px 12px; }
}
@media (max-width:400px) {
  .ep-foot-r { flex-direction:column; width:100%; }
  .ep-rev, .ep-sav { justify-content:center; }
}
`;

/* ─── Webcam ─── */
const Webcam = ({ stream }: { stream: MediaStream | null }) => {
  const r = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (r.current && stream) r.current.srcObject = stream; }, [stream]);
  return stream
    ? <video ref={r} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
    : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#64748b", fontSize:11, fontWeight:700 }}>Connecting camera…</div>;
};

/* ─── Loader ─── */
const Loader = () => (
  <div className="ep-ldr">
    <style>{S}</style>
    <motion.div className="ep-ldr-ring"
      animate={{ rotate:[0,180,360], borderRadius:["24%","50%","24%"] }}
      transition={{ duration:2.2, repeat:Infinity, ease:"easeInOut" }}>
      <Shield size={26} color="#fff" style={{ position:"relative", zIndex:1 }}/>
    </motion.div>
    <p className="ep-ldr-text">Initialising Secure Exam Environment</p>
    <p className="ep-ldr-sub">Please wait — preparing your assessment</p>
    <div className="ep-ldr-dots">
      {[0,1,2].map(i => (
        <motion.div key={i} className="ep-ldr-dot"
          animate={{ opacity:[.25,1,.25], scale:[.8,1.2,.8] }}
          transition={{ duration:1.2, repeat:Infinity, delay:i*.2 }}/>
      ))}
    </div>
  </div>
);

/* ─── System Check ─── */
const SystemCheck = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep]    = useState<"welcome"|"ready">("welcome");
  const [loading, setLoad] = useState(false);

  const skipProctoringCheck = () => {
    setLoad(true);
    setTimeout(() => { setLoad(false); setStep("ready"); }, 600);
  };
  if (loading) return <Loader/>;

  const allSteps = ["welcome","ready"];
  const si = allSteps.indexOf(step);

  const cfg: Record<string, any> = {
    welcome: {
      bg:"linear-gradient(135deg,#2563eb,#0ea5e9)",
      icon:<Shield size={28} color="#fff"/>,
      title:"Exam Ready",
      desc:"You are entering the final assessment. Your responses will be saved securely as you progress.",
      btn:"Continue",
      act:skipProctoringCheck,
      red:false
    },
    ready: {
      bg:"linear-gradient(135deg,#10b981,#059669)",
      icon:<Check size={28} color="#fff"/>,
      title:"Ready to Begin",
      desc:"Everything is set. You may now commence your assessment.",
      btn:"Start Exam",
      act:onComplete,
      red:true
    },
  };
  const c = cfg[step];

  return (
    <div className="sc-shell">
      <style>{S}</style>
      <AnimatePresence mode="wait">
        <motion.div key={step}
          initial={{ opacity:0, scale:.94, y:12 }}
          animate={{ opacity:1, scale:1, y:0 }}
          exit={{ opacity:0, scale:.94, y:-12 }}
          transition={{ duration:.24, ease:[0.22, 1, 0.36, 1] }}
          className="sc-card">
          <div className="sc-steps">
            {allSteps.map((s,i) => <div key={s} className={`sc-step${i<si?" d":i===si?" c":""}`}/>)}
          </div>
          <div className="sc-ico" style={{background:c.bg}}>{c.icon}</div>
          <h2 className="sc-title">{c.title}</h2>
          <p className="sc-desc">{c.desc}</p>
          {c.denied && <div className="sc-denied"><AlertTriangle size={15}/>Permission denied — check browser settings.</div>}
          {step!=="ready" && !c.denied && <button className={`sc-btn ${c.red?"sc-red":"sc-ind"}`} onClick={c.act}>{c.btn}</button>}
          {step==="ready"              && <button className="sc-btn sc-red"                       onClick={onComplete}>{c.btn}</button>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* ─── Question Type Icon ─── */
const QIcon = ({ type }: { type: string }) => {
  if (type==="MCQ")    return <HelpCircle size={15} style={{color:"#0284c7"}}/>;
  if (type==="SHORT")  return <PencilRuler size={15} style={{color:"#ea580c"}}/>;
  if (type==="LONG")   return <BrainCircuit size={15} style={{color:"#7c3aed"}}/>;
  if (type==="SPEECH") return <Mic size={15} style={{color:"#16a34a"}}/>;
  return null;
};

/* ═══════════════════════════════════════════════════════════════
   MAIN EXAM PAGE
═══════════════════════════════════════════════════════════════ */
const INIT_TIME = 60 * 60;

const MainExamPage = () => {
  const [loading,   setLoading]   = useState(true);
  const [sysOk,     setSysOk]     = useState(false);
  const [questions]               = useState<Question[]>(() => [...mockExamQuestions].sort(() => Math.random()-.5));
  const [idx,       setIdx]       = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers,   setAnswers]   = useState<Record<number, string|number>>({});
  const [statuses,  setStatuses]  = useState<Record<number, "answered"|"review">>({});
  const [timeLeft,  setTimeLeft]  = useState(INIT_TIME);
  const [submitted, setSubmitted] = useState(false);
  const [camStream, setCamStream] = useState<MediaStream|null>(null);
  const mediaRef                  = useRef<MediaStream|null>(null);

  // Speech recognition — native Web Speech API
  const [listening,  setListening]  = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const recRef                      = useRef<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const { theme, setTheme } = useTheme();
  const isDesktop = useMediaQuery("(min-width: 900px)");

  /* camera preview only */
  const stopCamera = () => {
    mediaRef.current?.getTracks().forEach(t => t.stop());
    mediaRef.current = null;
    setCamStream(null);
  };

  /* init */
  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  /* speech support check */
  useEffect(() => {
    setSpeechSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }, []);

  /* init speech recognition once */
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.continuous    = false;
    r.interimResults= true;

    r.onresult = (e: any) => {
      let interim = "";
      let final   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setSpokenText(final || interim);
      if (final) {
        handleAnswer(questions[idx].id, final);
        setListening(false);
      }
    };

    r.onerror = (e: any) => {
      console.error("Speech error:", e.error);
      setListening(false);
      if (e.error === "no-speech") setSpokenText("No speech detected. Please try again.");
    };

    r.onend = () => setListening(false);

    recRef.current = r;
  }, []);

  // Start speech listening
  const startListen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
    }

    const r = new SpeechRecognition();
    r.continuous     = false;
    r.interimResults = true;
    r.lang           = "en-US";
    const currentQId = questions[idx].id;

    r.onresult = (e: any) => {
      let interim = "";
      let finalT  = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalT += t;
        else interim += t;
      }
      setSpokenText(finalT || interim);
      if (finalT) {
        setAnswers(p => ({ ...p, [currentQId]: finalT }));
        setStatuses(p => ({ ...p, [currentQId]: "answered" }));
        setListening(false);
      }
    };

    r.onerror = (e: any) => {
      console.error("Speech error:", e.error);
      setListening(false);
      if (e.error === "no-speech") setSpokenText("No speech detected. Try again.");
      if (e.error === "not-allowed") setSpokenText("Microphone access denied.");
    };

    r.onend = () => setListening(false);

    recRef.current = r;
    try { r.start(); setListening(true); setSpokenText(""); } catch(e) { console.error(e); }
  };

  const stopListen = () => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  };

  /* webcam preview after system check */
  useEffect(() => {
    if (sysOk && !submitted) {
      navigator.mediaDevices.getUserMedia({ video:true })
        .then(s => { mediaRef.current = s; setCamStream(s); })
        .catch(() => setCamStream(null));
    } else {
      stopCamera();
    }
  }, [sysOk, submitted]);

  useEffect(() => () => stopCamera(), []);

  /* timer */
  useEffect(() => {
    if (loading || submitted || !sysOk) return;
    const t = setInterval(() => setTimeLeft(p => { if (p<=1){ clearInterval(t); handleSubmit(); return 0; } return p-1; }), 1000);
    return () => clearInterval(t);
  }, [loading, submitted, sysOk]);

  /* handlers */
  const handleSubmit = () => { setSubmitted(true); stopCamera(); };

  const handleSysOk = () => {
    setSysOk(true); setLoading(true);
    setTimeout(() => setLoading(false), 2200);
  };

  const handleAnswer = (qId: number, val: string|number) => {
    setAnswers(p  => ({ ...p,  [qId]: val }));
    setStatuses(p => ({ ...p,  [qId]: "answered" }));
  };

  const goTo = (i: number) => {
    if (i >= 0 && i < questions.length) {
      setDirection(i > idx ? 1 : -1);
      setIdx(i);
      setSpokenText("");
    }
  };

  const markRev = () => {
    setStatuses(p => ({ ...p, [questions[idx].id]: "review" }));
    if (idx < questions.length - 1) {
      setDirection(1);
      goTo(idx + 1);
    }
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  /* early returns */
  if (loading)   return <Loader/>;
  if (!sysOk)    return <SystemCheck onComplete={handleSysOk}/>;
  if (submitted) return <ExamResultDisplay score={0} total={0} isMainExam={true} onRetry={() => window.location.href="/dashboard"}/>;

  const q        = questions[idx];
  const answered = Object.values(statuses).filter(v => v==="answered").length;
  const reviewed = Object.values(statuses).filter(v => v==="review").length;
  const timeWarn = timeLeft < 300;

  const typeLabel: Record<string,string> = { MCQ:"Multiple Choice", SHORT:"Short Answer", LONG:"Essay Question", SPEECH:"Voice Assessment" };
  const typeBadge: Record<string,string> = { MCQ:"epbadge-mcq", SHORT:"epbadge-sh", LONG:"epbadge-lg", SPEECH:"epbadge-sp" };

  const currentSpokenVal = spokenText || String(answers[q.id]||"");

  /* Animation variants for question transition */
  const questionSlideVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 30 : -30,
      filter: "blur(3px)",
    }),
    center: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] }
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -30 : 30,
      filter: "blur(3px)",
      transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
    }),
  };

  /* ── Palette (shared desktop sidebar + mobile drawer) ── */
  const Palette = ({ compact = false }: { compact?: boolean }) => (
    <>
      <div className="ep-palh">
        <LayoutGrid size={15} style={{color:"#2563eb"}}/>
        <span>Question Navigator</span>
      </div>
      <div className="ep-palp">
        <div className="ep-palpr">
          <span>Overall Progress</span>
          <span style={{color:"#2563eb",fontWeight:800}}>{answered}/{questions.length}</span>
        </div>
        <div className="ep-palpb">
          <div className="ep-palpf" style={{width:`${(answered/questions.length)*100}%`}}/>
        </div>
      </div>
      <div className="ep-palscr">
        <div className="ep-palgr">
          {questions.map((qs,i) => {
            const st  = statuses[qs.id];
            const cur = i===idx;
            const cls = cur?"epb-cur":st==="answered"?"epb-ans":st==="review"?"epb-rev":"epb-un";
            return (
              <motion.button key={qs.id}
                whileHover={{ scale: cur ? 1.09 : 1.06, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => goTo(i)}
                className={`ep-pb ${cls}`}>
                {i+1}
              </motion.button>
            );
          })}
        </div>
      </div>
      <div className="ep-palleg">
        {[
          {bg:"linear-gradient(135deg,#2563eb,#0ea5e9)", l:"Current"},
          {bg:"linear-gradient(135deg,#27b86a,#14915d)", l:"Done"},
          {bg:"linear-gradient(135deg,#ff791f,#ffb21d)", l:"Review"},
          {bg:"var(--ep-btn-un)",                         l:"Not done"},
        ].map(x => (
          <div key={x.l} className="ep-leg">
            <div className="ep-legdot" style={{background:x.bg}}/>
            <span>{x.l}</span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <>
      <style>{S}</style>
      <div className="ep">
        {/* Floating background sparks */}
        <div className="ep-spark s1"/>
        <div className="ep-spark s2"/>

        {/* ── TOP BAR ── */}
        <div className="ep-top">
          <div className="ep-top-l">
            <motion.div className="ep-top-ico" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
              <BookOpen size={18} color="#fff"/>
            </motion.div>
            <div>
              <div className="ep-top-title">GradeUp Final Assessment</div>
              <div className="ep-top-sub">
                <span>Question {idx+1} of {questions.length}</span>
                <span className="ep-top-sub-chip">Secure Mode</span>
              </div>
            </div>
          </div>
          <div className="ep-top-r">
            <div className={`ep-timer${timeWarn?" warn":""}`}>
              <TimerIcon size={16} color={timeWarn?"#fca5a5":"rgba(255,255,255,.9)"}/>
              <span className="ep-timer-val">{fmt(timeLeft)}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92, rotate: 180 }}
              className="ep-icobtn"
              onClick={() => setTheme(theme==="dark"?"light":"dark")}
              title="Toggle Dark/Light Mode">
              {theme==="dark" ? <Sun size={15}/> : <Moon size={15}/>}
            </motion.button>
          </div>
        </div>

        {/* ── MAIN BODY ── */}
        <div className="ep-body">

          {/* ── LEFT: QUESTION CARD ── */}
          <div className="ep-left">
            <div className="ep-qcard">

              {/* Question Header */}
              <div className="ep-qhead">
                <QIcon type={q.type}/>
                <span className="epbadge epbadge-q">Question {idx+1}</span>
                <span className={`epbadge ${typeBadge[q.type]||"epbadge-mcq"}`}>{typeLabel[q.type]||q.type}</span>
                <span className="epbadge-mk">
                  <Sparkles size={11} style={{color:"#ffb21d"}}/>
                  2 Marks
                </span>
              </div>

              {/* Question Body with Directional Slide Transition */}
              <div className="ep-qbody">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={q.id}
                    custom={direction}
                    variants={questionSlideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    style={{ display:"flex", flexDirection:"column", flex:1 }}>

                    <p className="ep-qtext">{q.question}</p>

                    {/* MCQ Options with Staggered Fade-In */}
                    {q.type==="MCQ" && q.options && (
                      <div className="ep-opt-grid">
                        {q.options.map((opt,i) => {
                          const isSel = String(answers[q.id]) === String(i);
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity:0, y:8 }}
                              animate={{ opacity:1, y:0 }}
                              transition={{ duration:0.2, delay:i*0.04 }}
                              whileTap={{ scale: 0.985 }}
                              className={`ep-opt${isSel ? " sel" : ""}`}
                              onClick={() => handleAnswer(q.id, i)}>
                              <div className="ep-opt-idx">{String.fromCharCode(65 + i)}</div>
                              <label className="ep-opt-lbl">{opt}</label>
                              <div className="ep-opt-radio">
                                {isSel && (
                                  <motion.div
                                    initial={{ scale:0 }}
                                    animate={{ scale:1 }}
                                    transition={{ type:"spring", stiffness:350, damping:20 }}
                                    className="ep-opt-dot"
                                  />
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}

                    {/* Speech Option */}
                    {q.type==="SPEECH" && (
                      <div className="ep-speech-area">
                        <textarea
                          className="ep-speech-transcript"
                          readOnly
                          rows={4}
                          value={currentSpokenVal}
                          placeholder="Your spoken words will appear here in real-time as you speak…"
                        />
                        {speechSupported ? (
                          <>
                            <button
                              className={`ep-speech-btn ${listening?"active":"idle"}`}
                              onClick={listening ? stopListen : startListen}>
                              {listening ? <><MicOff size={17}/>Stop Recording</> : <><Mic size={17}/>Start Speaking</>}
                            </button>
                            {listening && (
                              <div className="ep-speech-listening">
                                <div className="ep-speech-wave">
                                  <span/><span/><span/><span/>
                                </div>
                                Listening now… please speak clearly into your mic
                              </div>
                            )}
                            {!listening && currentSpokenVal && (
                              <p className="ep-speech-hint">✓ Speech recorded. Click "Start Speaking" if you wish to re-record.</p>
                            )}
                          </>
                        ) : (
                          <div style={{
                            padding:"12px 16px", borderRadius:14,
                            background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)",
                            fontSize:13, color:"#ef4444", textAlign:"center", fontWeight:600
                          }}>
                            <AlertTriangle size={16} style={{marginBottom:4}}/>
                            <div>Speech recognition is not available in this browser environment.</div>
                            <div style={{color:"var(--ep-muted)",marginTop:4,fontSize:11.5}}>Please use Google Chrome or Microsoft Edge for voice questions.</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Short Answer */}
                    {q.type==="SHORT" && (
                      <textarea
                        className="ep-ta"
                        rows={4}
                        placeholder="Type your concise, precise response here…"
                        value={String(answers[q.id]||"")}
                        onChange={e => handleAnswer(q.id, e.target.value)}
                      />
                    )}

                    {/* Long Essay */}
                    {q.type==="LONG" && (
                      <textarea
                        className="ep-ta"
                        rows={7}
                        placeholder="Write your comprehensive, detailed explanation here…"
                        value={String(answers[q.id]||"")}
                        onChange={e => handleAnswer(q.id, e.target.value)}
                      />
                    )}

                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Question Footer Controls */}
              <div className="ep-qfoot">
                <button
                  className="ep-nav"
                  onClick={() => goTo(idx-1)}
                  disabled={idx===0}>
                  <ChevronLeft size={15}/>Previous
                </button>
                <div className="ep-foot-r">
                  <button className="ep-rev" onClick={markRev}>
                    <Star size={13}/>Mark for Review
                  </button>
                  <button
                    className="ep-sav"
                    onClick={() => idx<questions.length-1 ? goTo(idx+1) : undefined}>
                    Save &amp; Next<ChevronRight size={14}/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL (Desktop / Laptop) ── */}
          <div className="ep-right">

            {/* Camera Preview */}
            <div className="ep-rc">
              <div className="ep-ph">
                <div className="ep-pt">
                  <Shield size={13} style={{color:"#2563eb"}}/>
                  <span>Camera Preview</span>
                </div>
                <div className="ep-ps">
                  <div className="ep-pd"/>
                  <span>Live Feed</span>
                </div>
              </div>
              <div className="ep-wc"><Webcam stream={camStream}/></div>
              <div className="ep-pf">Camera preview active · Video only</div>
            </div>

            {/* Question Palette */}
            <div className="ep-pal"><Palette/></div>

            {/* Stats + Submit */}
            <div className="ep-sub">
              <div className="ep-subgr">
                <div className="ep-stm g"><div className="ep-stmv">{answered}</div><div className="ep-stml">Answered</div></div>
                <div className="ep-stm a"><div className="ep-stmv">{reviewed}</div><div className="ep-stml">Review</div></div>
                <div className="ep-stm">  <div className="ep-stmv">{questions.length-answered-reviewed}</div><div className="ep-stml">Left</div></div>
                <div className="ep-stm i"><div className="ep-stmv">{questions.length}</div><div className="ep-stml">Total</div></div>
              </div>
              <button className="ep-subbtn" onClick={handleSubmit}>SUBMIT EXAM</button>
            </div>
          </div>
        </div>

        {/* ── MOBILE / TABLET FLOATING DRAWER & CAMERA ── */}
        {!isDesktop && (
          <>
            {/* Palette Drawer Button */}
            <div style={{position:"fixed",bottom:20,right:20,zIndex:60}}>
              <Drawer>
                <DrawerTrigger asChild>
                  <motion.button
                    whileHover={{ scale:1.08 }}
                    whileTap={{ scale:0.92 }}
                    style={{
                      width:52,height:52,borderRadius:"50%",
                      background:"linear-gradient(135deg,#2563eb,#0ea5e9)",
                      border:"none",cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      color:"#fff",boxShadow:"0 8px 24px rgba(14,165,233,.45)",
                    }}>
                    <LayoutGrid size={21}/>
                  </motion.button>
                </DrawerTrigger>
                <DrawerContent style={{ background:"var(--ep-surface)", color:"var(--ep-text)", borderColor:"var(--ep-border)" }}>
                  <div style={{maxWidth:480,margin:"0 auto",width:"100%",fontFamily:"Plus Jakarta Sans,system-ui,sans-serif"}}>
                    <DrawerHeader>
                      <DrawerTitle style={{fontWeight:800,fontSize:15,color:"var(--ep-text)"}}>Question Navigator</DrawerTitle>
                    </DrawerHeader>
                    <div style={{padding:"0 16px 8px"}}>
                      {/* Mini Stats (Theme-aware) */}
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:12}}>
                        {[
                          {v:answered,l:"Answered",c:"#16a34a"},
                          {v:reviewed,l:"Review",c:"#ea580c"},
                          {v:questions.length-answered-reviewed,l:"Left",c:"var(--ep-text2)"},
                          {v:questions.length,l:"Total",c:"#2563eb"},
                        ].map(s => (
                          <div key={s.l} style={{
                            background:"var(--ep-stm-bg)",borderRadius:12,padding:"8px 6px",
                            textAlign:"center",border:"1px solid var(--ep-border)"
                          }}>
                            <div style={{fontSize:17,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div>
                            <div style={{fontSize:10,color:"var(--ep-subtle)",marginTop:3,fontWeight:700}}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                      {/* Palette Card */}
                      <div style={{
                        background:"var(--ep-surface2)",borderRadius:16,
                        border:"1px solid var(--ep-border)",overflow:"hidden",
                        maxHeight:"42vh",display:"flex",flexDirection:"column"
                      }}>
                        <Palette compact/>
                      </div>
                    </div>
                    <DrawerFooter>
                      <button onClick={handleSubmit} className="ep-subbtn" style={{padding:12}}>SUBMIT EXAM</button>
                      <DrawerClose asChild>
                        <button style={{
                          width:"100%",padding:10,borderRadius:12,border:"1.5px solid var(--ep-border2)",
                          background:"var(--ep-surface)",fontSize:13,fontWeight:700,cursor:"pointer",
                          fontFamily:"inherit",color:"var(--ep-muted)",marginTop:5
                        }}>Close</button>
                      </DrawerClose>
                    </DrawerFooter>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>

            {/* Draggable Mini Camera Preview */}
            <motion.div drag dragMomentum={false}
              style={{
                position:"fixed",top:68,right:12,zIndex:50,cursor:"grab",
                width:130,background:"var(--ep-surface)",borderRadius:14,overflow:"hidden",
                boxShadow:"0 8px 24px rgba(0,0,0,.2)",border:"2px solid rgba(35,137,255,.3)",
                backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",
              }}>
              <div style={{
                padding:"5px 8px",display:"flex",alignItems:"center",gap:4,
                background:"linear-gradient(135deg,rgba(35,137,255,.14),rgba(14,165,233,.08))"
              }}>
                <GripVertical size={12} style={{color:"var(--ep-subtle)"}}/>
                <span style={{fontSize:10,fontWeight:800,color:"var(--ep-text)"}}>Camera</span>
                <span style={{marginLeft:"auto",fontSize:9.5,fontWeight:800,color:"#10b981"}}>Live</span>
              </div>
              <div style={{height:70,background:"#080d1f"}}><Webcam stream={camStream}/></div>
            </motion.div>
          </>
        )}

      </div>
    </>
  );
};

export default MainExamPage;
