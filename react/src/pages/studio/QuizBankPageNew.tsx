import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, ArrowLeft, Eye, ThumbsUp,
  Laptop, Atom, Zap, Trophy, X,
  BrainCircuit, Send, Wand2, CheckCircle2, GraduationCap,
  Loader2, BookOpen, FlameKindling, Sparkles, Star,
  ChevronRight, BarChart2, Clock, Target, User, Bot,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import Navigation from '../../components/navigation';
import { useAuth } from '../../hooks/use-auth';
// ─── Design tokens (matches dashboard) ──────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }

.qb-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background: #f8fafc;
  min-height: 100vh;
  color: #0f172a;
}

/* ── Hero gradient ── */
.qb-hero {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%);
  border-radius: 24px;
  padding: 32px 36px;
  margin: 24px 28px 0;
  position: relative;
  overflow: hidden;
  color: #fff;
  animation: heroIn .55s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes heroIn { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:none} }
.qb-hero::before {
  content:''; position:absolute; top:-60px; right:-60px;
  width:260px; height:260px; border-radius:50%; background:rgba(255,255,255,.10);
  pointer-events:none;
}
.qb-hero::after {
  content:''; position:absolute; bottom:-80px; left:30%;
  width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,.07);
  pointer-events:none;
}
.qb-hero-inner { display:flex; align-items:center; justify-content:space-between; position:relative; z-index:1; gap:16px; flex-wrap:wrap; }
.qb-hero-title { font-size:clamp(20px,3vw,28px); font-weight:800; margin-bottom:6px; letter-spacing:-.3px; }
.qb-hero-sub   { font-size:14px; opacity:.75; line-height:1.5; max-width:400px; }
.qb-hero-right { display:flex; align-items:center; gap:16px; flex-shrink:0; }
.qb-hero-stat  { text-align:center; }
.qb-hero-sn    { font-size:30px; font-weight:800; line-height:1; }
.qb-hero-sl    { font-size:11px; opacity:.65; margin-top:2px; white-space:nowrap; }
.qb-hero-div   { width:1px; height:48px; background:rgba(255,255,255,.22); }

/* ── XP bar in hero ── */
.qb-xp-row { display:flex; align-items:center; gap:10px; margin-top:18px; position:relative; z-index:1; }
.qb-xp-label { font-size:11px; font-weight:700; color:rgba(255,255,255,.75); white-space:nowrap; }
.qb-xp-track {
  flex:1; height:8px; border-radius:8px; background:rgba(255,255,255,.22); overflow:hidden;
}
.qb-xp-fill {
  height:100%; border-radius:8px; background:rgba(255,255,255,.9);
  transition: width .6s cubic-bezier(.4,0,.2,1);
}
.qb-xp-gain {
  position:absolute; right:0; top:-28px;
  font-size:13px; font-weight:800; color:#fff;
  pointer-events:none;
  text-shadow: 0 2px 8px rgba(0,0,0,.25);
}

/* ── Stat cards row ── */
.qb-stats-row {
  display:grid; grid-template-columns:repeat(4,1fr); gap:14px;
  padding:0 28px; margin-top:20px;
}
.qb-stat-card {
  background:#fff; border-radius:18px; padding:18px 20px;
  border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05);
  transition:all .25s cubic-bezier(.4,0,.2,1);
  animation: cardIn .5s cubic-bezier(.34,1.56,.64,1) both;
  display:flex; flex-direction:column; gap:4px;
}
@keyframes cardIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
.qb-stat-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,.10); }
.qb-stat-card.blue   { border-top:3px solid #6366f1; }
.qb-stat-card.purple { border-top:3px solid #8b5cf6; }
.qb-stat-card.amber  { border-top:3px solid #f59e0b; }
.qb-stat-card.green  { border-top:3px solid #10b981; }
.qb-stat-icon { font-size:22px; margin-bottom:2px; }
.qb-stat-num  { font-size:26px; font-weight:800; color:#0f172a; letter-spacing:-1px; line-height:1; }
.qb-stat-lbl  { font-size:12px; color:#64748b; font-weight:500; }

/* ── Section header ── */
.qb-section {
  padding:24px 28px 0;
  display:flex; align-items:center; justify-content:space-between; gap:12px;
}
.qb-section-title {
  font-size:18px; font-weight:800; color:#0f172a; letter-spacing:-.2px;
}
.qb-section-sub { font-size:13px; color:#64748b; margin-top:2px; font-weight:500; }

/* ── Search + filter bar ── */
.qb-toolbar {
  display:flex; align-items:center; gap:10px;
  padding:0 28px; margin-top:16px; flex-wrap:wrap;
}
.qb-search-wrap { position:relative; flex:1; min-width:220px; max-width:380px; }
.qb-search-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; }
.qb-search {
  width:100%; padding:10px 14px 10px 42px;
  border-radius:14px; border:1.5px solid #e2e8f0;
  background:#fff; font-family:inherit; font-size:13.5px; font-weight:500;
  color:#0f172a; outline:none; transition:border .18s, box-shadow .18s;
  box-shadow:0 1px 4px rgba(0,0,0,.04);
}
.qb-search:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.qb-search::placeholder { color:#94a3b8; }
.qb-filter-chip {
  padding:8px 16px; border-radius:24px;
  border:1.5px solid #e2e8f0; background:#fff;
  font-family:inherit; font-size:13px; font-weight:600; color:#64748b;
  cursor:pointer; transition:all .18s; white-space:nowrap;
}
.qb-filter-chip:hover { border-color:#6366f1; color:#6366f1; background:rgba(99,102,241,.05); }
.qb-filter-chip.active {
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  border-color:transparent; box-shadow:0 4px 12px rgba(99,102,241,.32);
}

/* ── Arena cards (landing) ── */
.qb-arena-grid {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:18px;
  padding:20px 28px;
}
.qb-arena-card {
  background:#fff; border-radius:20px;
  border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05);
  overflow:hidden; cursor:pointer;
  transition:all .25s cubic-bezier(.4,0,.2,1);
  animation: cardIn .5s cubic-bezier(.34,1.56,.64,1) both;
}
.qb-arena-card:hover { transform:translateY(-6px) scale(1.01); box-shadow:0 16px 40px rgba(0,0,0,.12); border-color:#e0e7ff; }
.qb-arena-cover {
  height:120px; position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden;
}
.qb-arena-cover-glare {
  position:absolute; top:0; left:0; right:0; height:50%;
  background:linear-gradient(180deg,rgba(255,255,255,.22),transparent);
  pointer-events:none;
}
.qb-arena-emoji { font-size:48px; filter:drop-shadow(0 4px 10px rgba(0,0,0,.18)); position:relative; z-index:1; }
.qb-arena-body { padding:18px 20px 20px; }
.qb-arena-tag {
  display:inline-block; font-size:10.5px; font-weight:700; padding:3px 10px;
  border-radius:20px; background:rgba(99,102,241,.1); color:#6366f1;
  margin-bottom:8px; letter-spacing:.3px; text-transform:uppercase;
}
.qb-arena-name { font-size:16px; font-weight:800; color:#0f172a; margin-bottom:4px; line-height:1.3; }
.qb-arena-desc { font-size:12.5px; color:#64748b; margin-bottom:14px; line-height:1.5; }
.qb-arena-meta { display:flex; align-items:center; justify-content:space-between; }
.qb-arena-qs   { font-size:12px; color:#94a3b8; font-weight:500; }
.qb-arena-btn {
  padding:8px 18px; border-radius:12px; border:none;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  font-family:inherit; font-size:12.5px; font-weight:700; cursor:pointer;
  box-shadow:0 4px 12px rgba(99,102,241,.32); transition:all .18s;
}
.qb-arena-btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(99,102,241,.42); }

/* ── Quiz bank cards ── */
.qb-banks-grid {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:18px;
  padding:20px 28px 80px;
}
.qb-bank-card {
  background:#fff; border-radius:20px;
  border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05);
  padding:20px; cursor:pointer;
  transition:all .25s cubic-bezier(.4,0,.2,1);
  animation: cardIn .45s cubic-bezier(.34,1.56,.64,1) both;
  display:flex; flex-direction:column; gap:12px;
}
.qb-bank-card:hover { transform:translateY(-5px) scale(1.01); box-shadow:0 14px 38px rgba(0,0,0,.11); border-color:#e0e7ff; }
.qb-bank-top { display:flex; align-items:center; justify-content:space-between; }
.qb-bank-subject {
  font-size:10.5px; font-weight:700; padding:3px 10px; border-radius:20px;
  background:rgba(99,102,241,.1); color:#6366f1; text-transform:uppercase; letter-spacing:.3px;
}
.qb-diff-easy   { font-size:11.5px; font-weight:700; color:#10b981; background:rgba(16,185,129,.1); padding:3px 10px; border-radius:20px; }
.qb-diff-medium { font-size:11.5px; font-weight:700; color:#f59e0b; background:rgba(245,158,11,.1); padding:3px 10px; border-radius:20px; }
.qb-diff-hard   { font-size:11.5px; font-weight:700; color:#ef4444; background:rgba(239,68,68,.1);  padding:3px 10px; border-radius:20px; }
.qb-bank-mid { display:flex; align-items:center; gap:14px; }
.qb-bank-icon-wrap {
  width:50px; height:50px; border-radius:14px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:26px;
}
.qb-bank-name { font-size:15px; font-weight:800; color:#0f172a; line-height:1.3; margin-bottom:2px; }
.qb-bank-qs   { font-size:12px; color:#94a3b8; font-weight:500; }
.qb-bank-footer { display:flex; align-items:center; justify-content:space-between; border-top:1px solid #f1f5f9; padding-top:12px; }
.qb-bank-type {
  font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px;
  border:1.5px solid;
}
.qb-bank-type.general     { color:#64748b; border-color:#e2e8f0; }
.qb-bank-type.competitive { color:#8b5cf6; border-color:#c4b5fd; background:rgba(139,92,246,.07); }
.qb-bank-preview-btn {
  display:flex; align-items:center; gap:5px;
  padding:7px 16px; border-radius:12px; border:none; cursor:pointer;
  font-family:inherit; font-size:12.5px; font-weight:700;
  background:rgba(99,102,241,.08); color:#6366f1;
  transition:all .18s;
}
.qb-bank-preview-btn:hover { background:#6366f1; color:#fff; transform:translateX(2px); }

/* ── Q&A view ── */
.qb-qa-list { padding:20px 28px 80px; display:flex; flex-direction:column; gap:18px; max-width:820px; }
.qb-qa-card {
  background:#fff; border-radius:20px;
  border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05);
  padding:26px 28px;
  animation: cardIn .45s cubic-bezier(.34,1.56,.64,1) both;
}
.qb-qa-meta { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
.qb-qa-icon-wrap {
  width:36px; height:36px; border-radius:12px; flex-shrink:0;
  background:rgba(99,102,241,.1); color:#6366f1;
  display:flex; align-items:center; justify-content:center;
}
.qb-qa-author { font-size:12.5px; font-weight:700; color:#374151; }
.qb-qa-subj   { font-size:11px; font-weight:600; color:#94a3b8; }
.qb-qa-q { font-size:17px; font-weight:800; color:#0f172a; line-height:1.45; margin-bottom:14px; letter-spacing:-.2px; }
.qb-qa-answer {
  background:#f8fafc; border-radius:14px; padding:16px 18px;
  border-left:3px solid #6366f1;
  font-size:14px; color:#374151; line-height:1.75; font-weight:500;
  margin-bottom:16px;
}
.qb-qa-footer { display:flex; align-items:center; justify-content:space-between; }
.qb-qa-like-btn {
  display:flex; align-items:center; gap:6px;
  padding:8px 16px; border-radius:12px; border:1.5px solid #e2e8f0;
  background:#fff; font-family:inherit; font-size:13px; font-weight:700; color:#64748b;
  cursor:pointer; transition:all .18s;
}
.qb-qa-like-btn:hover { border-color:#10b981; color:#10b981; background:rgba(16,185,129,.05); }
.qb-qa-mastered-btn {
  display:flex; align-items:center; gap:7px;
  padding:9px 20px; border-radius:12px; border:none;
  background:linear-gradient(135deg,#10b981,#059669); color:#fff;
  font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;
  box-shadow:0 4px 12px rgba(16,185,129,.28); transition:all .18s;
}
.qb-qa-mastered-btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(16,185,129,.38); }

/* ── AI side panel ── */
.qb-ai-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35); backdrop-filter:blur(4px); z-index:200; }
.qb-ai-panel {
  position:fixed; right:0; top:0; bottom:0; width:380px; max-width:95vw;
  background:#fff; z-index:201;
  display:flex; flex-direction:column;
  border-left:1px solid rgba(0,0,0,.08);
  box-shadow:-8px 0 32px rgba(0,0,0,.12);
}
.qb-ai-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 20px; border-bottom:1px solid #f1f5f9;
  background:linear-gradient(135deg,rgba(99,102,241,.06),rgba(139,92,246,.04));
  flex-shrink:0;
}
.qb-ai-header-left { display:flex; align-items:center; gap:10px; }
.qb-ai-bot-icon {
  width:36px; height:36px; border-radius:12px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex; align-items:center; justify-content:center; color:#fff;
  box-shadow:0 4px 12px rgba(99,102,241,.3); flex-shrink:0;
}
.qb-ai-title { font-size:15px; font-weight:800; color:#0f172a; line-height:1.2; }
.qb-ai-sub   { font-size:11.5px; color:#6366f1; font-weight:600; margin-top:1px; }
.qb-ai-close {
  width:32px; height:32px; border-radius:10px; border:none; background:transparent;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  color:#94a3b8; transition:all .15s;
}
.qb-ai-close:hover { background:rgba(239,68,68,.1); color:#ef4444; }
.qb-ai-messages { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }
.qb-ai-messages::-webkit-scrollbar { width:3px; }
.qb-ai-messages::-webkit-scrollbar-thumb { background:rgba(99,102,241,.2); border-radius:3px; }
.qb-ai-msg-row { display:flex; gap:8px; }
.qb-ai-msg-row.user { flex-direction:row-reverse; }
.qb-ai-avatar { width:28px; height:28px; border-radius:50%; flex-shrink:0; margin-top:2px; display:flex; align-items:center; justify-content:center; }
.qb-ai-avatar.bot  { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; }
.qb-ai-avatar.user { background:linear-gradient(135deg,#8b5cf6,#ec4899); color:#fff; }
.qb-ai-bubble { border-radius:16px; padding:10px 14px; font-size:13.5px; line-height:1.6; font-family:inherit; font-weight:500; max-width:84%; }
.qb-ai-bubble.bot  { background:#f8fafc; border:1px solid #f1f5f9; color:#0f172a; border-radius:16px 16px 16px 4px; }
.qb-ai-bubble.user { background:linear-gradient(135deg,#6366f1,#7c3aed); color:#fff; border-radius:16px 16px 4px 16px; }
.qb-ai-typing { display:flex; gap:4px; align-items:center; padding:12px 14px; background:#f8fafc; border:1px solid #f1f5f9; border-radius:16px 16px 16px 4px; }
.qb-ai-dot { width:7px; height:7px; border-radius:50%; background:#6366f1; animation:dotBounce .9s infinite; }
.qb-ai-dot:nth-child(2) { animation-delay:.18s; }
.qb-ai-dot:nth-child(3) { animation-delay:.36s; }
@keyframes dotBounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-5px);opacity:1} }
.qb-ai-input-row { display:flex; gap:8px; align-items:flex-end; padding:12px 16px; border-top:1px solid #f1f5f9; flex-shrink:0; }
.qb-ai-textarea {
  flex:1; resize:none; border-radius:12px; border:1.5px solid #e2e8f0;
  background:#f8fafc; color:#0f172a; font-size:13.5px;
  padding:9px 12px; outline:none; min-height:40px; max-height:110px; overflow-y:auto;
  font-family:inherit; font-weight:500; transition:border .18s;
}
.qb-ai-textarea:focus { border-color:#6366f1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.qb-ai-textarea::placeholder { color:#94a3b8; }
.qb-ai-send {
  width:38px; height:38px; border-radius:12px; flex-shrink:0;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); border:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center; color:#fff;
  box-shadow:0 4px 10px rgba(99,102,241,.28); transition:all .18s;
}
.qb-ai-send:disabled { opacity:.35; cursor:not-allowed; box-shadow:none; }
.qb-ai-send:not(:disabled):hover { transform:scale(1.07); box-shadow:0 6px 14px rgba(99,102,241,.4); }

/* ── Floating buttons ── */
.qb-fab {
  position:fixed; bottom:32px; right:32px; z-index:100;
  display:flex; flex-direction:column; gap:10px; align-items:flex-end;
}
.qb-fab-ai {
  display:flex; align-items:center; gap:8px;
  padding:12px 22px; border-radius:24px; border:none; cursor:pointer;
  font-family:inherit; font-size:13.5px; font-weight:700; color:#fff;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  box-shadow:0 8px 24px rgba(99,102,241,.38); transition:all .2s;
}
.qb-fab-ai:hover { transform:translateY(-3px); box-shadow:0 12px 30px rgba(99,102,241,.5); }
.qb-fab-add {
  width:52px; height:52px; border-radius:16px; border:none; cursor:pointer;
  background:linear-gradient(135deg,#ec4899,#db2777); color:#fff;
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 8px 24px rgba(236,72,153,.38); transition:all .2s;
}
.qb-fab-add:hover { transform:translateY(-3px) rotate(8deg); box-shadow:0 12px 30px rgba(236,72,153,.5); }

/* ── Level up modal ── */
.qb-levelup-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(8px);
  z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;
}
.qb-levelup-card {
  background:#fff; border-radius:28px; padding:36px 32px; max-width:360px; width:100%;
  text-align:center; box-shadow:0 24px 60px rgba(0,0,0,.25);
  animation: cardIn .4s cubic-bezier(.34,1.56,.64,1) both;
}
.qb-levelup-emoji { font-size:64px; margin-bottom:12px; display:block; }
.qb-levelup-title {
  font-size:28px; font-weight:800; letter-spacing:-.5px; margin-bottom:6px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
}
.qb-levelup-sub   { font-size:14px; color:#64748b; margin-bottom:24px; font-weight:500; line-height:1.5; }
.qb-levelup-btn {
  width:100%; padding:14px; border-radius:14px; border:none; cursor:pointer;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  font-family:inherit; font-size:15px; font-weight:800;
  box-shadow:0 6px 18px rgba(99,102,241,.35); transition:all .18s;
}
.qb-levelup-btn:hover { transform:translateY(-1px); box-shadow:0 8px 24px rgba(99,102,241,.45); }

/* ── Back / nav button ── */
.qb-back-btn {
  display:inline-flex; align-items:center; gap:7px;
  padding:9px 16px; border-radius:13px;
  border:1.5px solid #f1f5f9; background:#fff;
  font-family:inherit; font-size:13px; font-weight:700; color:#6366f1;
  cursor:pointer; transition:all .18s; text-decoration:none;
  box-shadow:0 1px 4px rgba(0,0,0,.05);
}
.qb-back-btn:hover { background:rgba(99,102,241,.06); border-color:#c7d2fe; }

/* ── Empty / search empty ── */
.qb-empty { text-align:center; padding:60px 20px; color:#94a3b8; }
.qb-empty-icon { font-size:48px; margin-bottom:12px; }
.qb-empty-title { font-size:16px; font-weight:700; color:#64748b; margin-bottom:6px; }
.qb-empty-sub   { font-size:13px; line-height:1.6; }

/* ── Responsive ── */
@media(max-width:768px) {
  .qb-stats-row { grid-template-columns:repeat(2,1fr); }
  .qb-hero { margin:12px 12px 0; padding:22px 20px; }
  .qb-arena-grid, .qb-banks-grid { padding:16px 12px 72px; }
  .qb-section { padding:16px 12px 0; }
  .qb-toolbar { padding:0 12px; }
  .qb-qa-list { padding:16px 12px 72px; }
  .qb-stats-row { padding:0 12px; }
  .qb-fab { bottom:20px; right:16px; }
}
@media(max-width:480px) {
  .qb-stats-row { grid-template-columns:1fr 1fr; gap:10px; }
  .qb-hero-right { display:none; }
  .qb-arena-grid { grid-template-columns:1fr; }
  .qb-banks-grid { grid-template-columns:1fr; }
}
`;

// ─── Data ──────────────────────────────────────────────────────────────────

const ARENAS = [
  { id: 'exam',        emoji: '📚', label: 'Exam Prep',      tag: 'Academics',   desc: 'Textbooks, board exams and unit tests', color: 'linear-gradient(135deg,#6366f1,#8b5cf6)', q: 82  },
  { id: 'competitive', emoji: '🏆', label: 'Competitive',    tag: 'NEET • UPSC',  desc: 'Bank, UPSC, JEE, NEET and beyond',      color: 'linear-gradient(135deg,#10b981,#059669)', q: 210 },
  { id: 'cs',          emoji: '💻', label: 'Computer Sci',   tag: 'DSA • Dev',    desc: 'Algorithms, data structures, coding',   color: 'linear-gradient(135deg,#0ea5e9,#0284c7)', q: 64  },
  { id: 'science',     emoji: '⚗️', label: 'Science',        tag: 'Physics+',     desc: 'Physics, Chemistry and Biology',        color: 'linear-gradient(135deg,#f59e0b,#d97706)', q: 95  },
  { id: 'humanities',  emoji: '📜', label: 'Humanities',     tag: 'History+',     desc: 'History, Geography, Economics',         color: 'linear-gradient(135deg,#ec4899,#db2777)', q: 120 },
  { id: 'aptitude',    emoji: '🧠', label: 'Aptitude',       tag: 'Logic+',       desc: 'Quantitative, reasoning and verbal',    color: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', q: 140 },
];

const QUIZ_BANKS = [
  { id:'1',  title:'Algebra Basics',               questions:15, subject:'Mathematics',        difficulty:'Easy',   type:'General',     emoji:'📐', color:'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { id:'2',  title:'Newtonian Physics',             questions:20, subject:'Physics',            difficulty:'Medium', type:'General',     emoji:'⚡', color:'linear-gradient(135deg,#f59e0b,#d97706)' },
  { id:'3',  title:'Organic Chemistry Reactions',   questions:25, subject:'Chemistry',          difficulty:'Hard',   type:'General',     emoji:'⚗️', color:'linear-gradient(135deg,#10b981,#059669)' },
  { id:'4',  title:'Cellular Biology',              questions:15, subject:'Biology',            difficulty:'Easy',   type:'General',     emoji:'🔬', color:'linear-gradient(135deg,#0ea5e9,#0284c7)' },
  { id:'5',  title:'World War II',                  questions:30, subject:'History',            difficulty:'Medium', type:'General',     emoji:'📜', color:'linear-gradient(135deg,#ec4899,#db2777)' },
  { id:'6',  title:'Data Structures & Algorithms',  questions:20, subject:'Computer Science',   difficulty:'Hard',   type:'Competitive', emoji:'🖥️', color:'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  { id:'7',  title:'Quantitative Aptitude UPSC',    questions:40, subject:'General Aptitude',   difficulty:'Hard',   type:'Competitive', emoji:'📊', color:'linear-gradient(135deg,#6366f1,#ec4899)' },
  { id:'8',  title:'English Grammar',               questions:35, subject:'English',            difficulty:'Medium', type:'Competitive', emoji:'✍️', color:'linear-gradient(135deg,#f59e0b,#ec4899)' },
  { id:'9',  title:'Indian Polity & Constitution',  questions:50, subject:'Political Science',  difficulty:'Hard',   type:'Competitive', emoji:'⚖️', color:'linear-gradient(135deg,#10b981,#6366f1)' },
  { id:'10', title:'Introduction to Psychology',    questions:20, subject:'Psychology',         difficulty:'Easy',   type:'General',     emoji:'🧠', color:'linear-gradient(135deg,#ec4899,#8b5cf6)' },
  { id:'11', title:'Environmental Science',         questions:25, subject:'Env. Science',       difficulty:'Medium', type:'General',     emoji:'🌿', color:'linear-gradient(135deg,#10b981,#0ea5e9)' },
  { id:'12', title:'Advanced Calculus',             questions:30, subject:'Mathematics',        difficulty:'Hard',   type:'General',     emoji:'∫',  color:'linear-gradient(135deg,#6366f1,#0ea5e9)' },
];

const QUESTIONS = [
  { id:'q1', question:'What is the difference between velocity and speed?',             answer:'Speed is a scalar quantity — it only has magnitude. Velocity is a vector quantity with both magnitude and direction. An object moving in a circle has constant speed but changing velocity.',     author:'Physics Bot', likes:12, icon:Atom,   subject:'Physics',          type:'General'     },
  { id:'q2', question:'Can you explain recursion in programming?',                      answer:'Recursion is when a function calls itself with a smaller sub-problem until it reaches a base case. Think of it as Russian nesting dolls — each doll opens to reveal a smaller one.',            author:'CS Bot',      likes:25, icon:Laptop, subject:'Computer Science', type:'Competitive' },
  { id:'q3', question:'What is the fundamental difference between prokaryotic and eukaryotic cells?', answer:'Prokaryotic cells have no true nucleus — their DNA floats freely. Eukaryotic cells have a membrane-bound nucleus. Eukaryotes are also far larger and contain organelles like mitochondria.', author:'Biology Master', likes:18, icon:Atom, subject:'Biology',       type:'General'     },
  { id:'q4', question:'Explain the concept of "divide and conquer" in algorithms.',     answer:'Divide and conquer breaks a large problem into smaller sub-problems, solves each recursively, then combines the results. Classic examples include Merge Sort and Quick Sort.',               author:'Algo Expert', likes:45, icon:Laptop, subject:'Computer Science', type:'Competitive' },
  { id:'q5', question:'What is Article 370 of the Indian Constitution?',               answer:'Article 370 granted special autonomous status to Jammu & Kashmir. It was a temporary provision that was abrogated in August 2019, integrating the region more fully with India.',             author:'Polity Pro',  likes:30, icon:Eye,    subject:'Political Science',type:'Competitive' },
];

// ─── Main Component ─────────────────────────────────────────────────────────
const QuizBankPage = () => {
  const [view, setView]         = useState<'arena'|'banks'|'qa'>('arena');
  const [searchTerm, setSearch] = useState('');
  const [filter, setFilter]     = useState('All');
  const [isAiOpen, setAiOpen]   = useState(false);
const { userHeader }      = useAuth();
  const [currentRole, setCurrentRole] = useState('student');
  useEffect(() => { if (userHeader?.role) setCurrentRole(userHeader.role); }, [userHeader]);
  // XP
  const [xp, setXp]                   = useState(30);
  const [level, setLevel]             = useState(1);
  const [showLevelUp, setLevelUp]     = useState(false);
  const [showXpGain, setXpGain]       = useState(false);
  const [xpAmount, setXpAmount]       = useState(0);

  // AI chat
  const [aiInput, setAiInput]     = useState('');
  const [isTyping, setTyping]     = useState(false);
  const [messages, setMessages]   = useState([
    { role:'bot', text:"Hi! I'm your AI study buddy 🤖 Ask me anything about these quiz topics." }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, isTyping]);

  // Liked QA
  const [likedQs, setLikedQs] = useState<Set<string>>(new Set());
  const [masteredQs, setMastered] = useState<Set<string>>(new Set());

  const gainXP = (amount: number) => {
    setXpAmount(amount);
    setXpGain(true);
    setTimeout(() => setXpGain(false), 1500);
    setXp(prev => {
      const next = prev + amount;
      if (next >= 100) { setLevelUp(true); return next - 100; }
      return next;
    });
  };

  const sendAI = () => {
    if (!aiInput.trim() || isTyping) return;
    const msg = aiInput.trim();
    setMessages(p => [...p, { role:'user', text: msg }]);
    setAiInput('');
    setTyping(true);
    setTimeout(() => {
      setMessages(p => [...p, { role:'bot', text:`Great question! "${msg.slice(0,40)}..." — The key insight here is to understand the underlying concept deeply. Try connecting it to what you already know from the chapter. Keep it up! ✨` }]);
      setTyping(false);
      gainXP(10);
    }, 1400);
  };

  const filteredBanks = useMemo(() => {
    return QUIZ_BANKS.filter(b => {
      const matchSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || b.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilter = filter === 'All' || b.type === filter || b.difficulty === filter;
      return matchSearch && matchFilter;
    });
  }, [searchTerm, filter]);

  const diffClass = (d: string) => d === 'Easy' ? 'qb-diff-easy' : d === 'Medium' ? 'qb-diff-medium' : 'qb-diff-hard';

  return (
    <>
      <style>{CSS}</style>
      <div className="qb-root">
        <Navigation currentRole={currentRole} onRoleChange={setCurrentRole}/>

        {/* ── Level Up Modal ── */}
        <AnimatePresence>
          {showLevelUp && (
            <div className="qb-levelup-overlay">
              <motion.div initial={{scale:.7,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.7,opacity:0}} className="qb-levelup-card">
                <span className="qb-levelup-emoji">🎉</span>
                <div className="qb-levelup-title">Level {level + 1} Unlocked!</div>
                <div className="qb-levelup-sub">Your brain is officially levelling up. Keep solving to gain more XP!</div>
                <button className="qb-levelup-btn" onClick={() => { setLevel(l => l+1); setLevelUp(false); }}>
                  Keep Going →
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── AI Side Panel ── */}
        <AnimatePresence>
          {isAiOpen && (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="qb-ai-overlay" onClick={() => setAiOpen(false)} />
              <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:22,stiffness:260}} className="qb-ai-panel">
                <div className="qb-ai-header">
                  <div className="qb-ai-header-left">
                    <div className="qb-ai-bot-icon"><Bot size={16}/></div>
                    <div>
                      <div className="qb-ai-title">Ask AI</div>
                      <div className="qb-ai-sub">Quiz Study Buddy</div>
                    </div>
                  </div>
                  <button className="qb-ai-close" onClick={() => setAiOpen(false)}><X size={15}/></button>
                </div>
                <div className="qb-ai-messages">
                  {messages.map((m,i) => (
                    <div key={i} className={`qb-ai-msg-row ${m.role === 'user' ? 'user' : ''}`}>
                      <div className={`qb-ai-avatar ${m.role === 'user' ? 'user' : 'bot'}`}>
                        {m.role === 'user' ? <User size={12}/> : <Sparkles className="animate-pulse" size={12}/>}
                      </div>
                      <div className={`qb-ai-bubble ${m.role === 'user' ? 'user' : 'bot'}`}>{m.text}</div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="qb-ai-msg-row">
                      <div className="qb-ai-avatar bot"><Sparkles className="animate-pulse" size={12}/></div>
                      <div className="qb-ai-typing">
                        <div className="qb-ai-dot"/><div className="qb-ai-dot"/><div className="qb-ai-dot"/>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>
                <div className="qb-ai-input-row">
                  <textarea
                    className="qb-ai-textarea"
                    rows={1}
                    value={aiInput}
                    placeholder="Ask anything about these topics…"
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendAI(); } }}
                    onInput={e => { const t = e.currentTarget; t.style.height='auto'; t.style.height=Math.min(t.scrollHeight,110)+'px'; }}
                  />
                  <button className="qb-ai-send" onClick={sendAI} disabled={!aiInput.trim()||isTyping}>
                    <Send size={14}/>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── HERO ── */}
        <div className="qb-hero">
          <div className="qb-hero-inner">
            <div>
              <div className="qb-hero-title">
                {view === 'arena' ? '📚 Quiz Bank' : view === 'banks' ? '🗄️ Question Vault' : '💬 Q&A Forum'}
              </div>
              <div className="qb-hero-sub">
                {view === 'arena' && 'Choose your arena and start mastering topics with smart quizzes.'}
                {view === 'banks' && 'Browse all quiz banks, filter by subject or difficulty and dive in.'}
                {view === 'qa'    && 'Community-answered questions with explanations and upvotes.'}
              </div>
              {/* XP bar */}
              <div className="qb-xp-row">
                <span className="qb-xp-label"><Trophy size={11} style={{display:'inline',marginRight:4}}/>LVL {level}</span>
                <div className="qb-xp-track"><div className="qb-xp-fill" style={{width:`${xp}%`}}/></div>
                <span className="qb-xp-label">{xp}/100 XP</span>
                <AnimatePresence>
                  {showXpGain && (
                    <motion.span className="qb-xp-gain" initial={{y:0,opacity:0}} animate={{y:-18,opacity:1}} exit={{opacity:0}}>
                      +{xpAmount} XP ✨
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="qb-hero-right">
              <div className="qb-hero-stat">
                <div className="qb-hero-sn">{QUIZ_BANKS.length}</div>
                <div className="qb-hero-sl">Quiz Banks</div>
              </div>
              <div className="qb-hero-div"/>
              <div className="qb-hero-stat">
                <div className="qb-hero-sn">{QUESTIONS.length}</div>
                <div className="qb-hero-sl">Q&A Threads</div>
              </div>
              <div className="qb-hero-div"/>
              <div className="qb-hero-stat">
                <div className="qb-hero-sn">{level}</div>
                <div className="qb-hero-sl">Your Level</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="qb-stats-row" style={{marginTop:20}}>
          {[
            {icon:'📚', label:'Total Banks',   value:QUIZ_BANKS.length, color:'blue'},
            {icon:'🏆', label:'Competitive',   value:QUIZ_BANKS.filter(b=>b.type==='Competitive').length, color:'purple'},
            {icon:'⭐', label:'XP Earned',     value:`${level*100+xp}`, color:'amber'},
            {icon:'✅', label:'Mastered',      value:masteredQs.size, color:'green'},
          ].map((s,i) => (
            <div key={i} className={`qb-stat-card ${s.color}`} style={{animationDelay:`${i*0.07}s`}}>
              <div className="qb-stat-icon">{s.icon}</div>
              <div className="qb-stat-num">{s.value}</div>
              <div className="qb-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Section header + back nav ── */}
        <div className="qb-section" style={{marginTop:28}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              {view !== 'arena' && (
                <button className="qb-back-btn" onClick={() => { setView(view==='qa'?'banks':'arena'); setSearch(''); setFilter('All'); }}>
                  <ArrowLeft size={14}/> Back
                </button>
              )}
              <div>
                <div className="qb-section-title">
                  {view === 'arena' ? 'Choose Your Arena' : view === 'banks' ? 'All Quiz Banks' : 'Community Q&A'}
                </div>
                <div className="qb-section-sub">
                  {view === 'arena' && `${ARENAS.length} arenas available`}
                  {view === 'banks' && `${filteredBanks.length} banks found`}
                  {view === 'qa'    && `${QUESTIONS.length} answered questions`}
                </div>
              </div>
            </div>
          </div>
          {view === 'banks' && (
            <button className="qb-arena-btn" onClick={() => setView('qa')}>
              Community Q&A <ChevronRight size={13} style={{display:'inline'}}/>
            </button>
          )}
        </div>

        {/* ── Toolbar (search + filter chips) ── */}
        {view === 'banks' && (
          <div className="qb-toolbar" style={{marginTop:14}}>
            <div className="qb-search-wrap">
              <Search size={15} className="qb-search-icon"/>
              <input className="qb-search" placeholder="Search by title or subject…" value={searchTerm} onChange={e => setSearch(e.target.value)}/>
            </div>
            {['All','Easy','Medium','Hard','General','Competitive'].map(f => (
              <button key={f} className={`qb-filter-chip ${filter===f?'active':''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            MAIN CONTENT — switches between arena / banks / qa
        ══════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">

          {/* ── ARENA SELECTION ── */}
          {view === 'arena' && (
            <motion.div key="arena" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.22}}>
              <div className="qb-arena-grid">
                {ARENAS.map((a,i) => (
                  <motion.div key={a.id} whileHover={{y:-6,scale:1.015}} transition={{type:'spring',stiffness:340,damping:18}}>
                    <div className="qb-arena-card" style={{animationDelay:`${i*0.07}s`}} onClick={() => { setView('banks'); gainXP(20); }}>
                      <div className="qb-arena-cover" style={{background:a.color}}>
                        <div className="qb-arena-cover-glare"/>
                        <span className="qb-arena-emoji">{a.emoji}</span>
                      </div>
                      <div className="qb-arena-body">
                        <span className="qb-arena-tag">{a.tag}</span>
                        <div className="qb-arena-name">{a.label}</div>
                        <div className="qb-arena-desc">{a.desc}</div>
                        <div className="qb-arena-meta">
                          <span className="qb-arena-qs">{a.q} questions</span>
                          <button className="qb-arena-btn">Enter →</button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── QUIZ BANKS ── */}
          {view === 'banks' && (
            <motion.div key="banks" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.22}}>
              {filteredBanks.length === 0 ? (
                <div className="qb-empty">
                  <div className="qb-empty-icon">🔍</div>
                  <div className="qb-empty-title">No banks found</div>
                  <div className="qb-empty-sub">Try a different search term or filter.</div>
                </div>
              ) : (
                <div className="qb-banks-grid">
                  {filteredBanks.map((b,i) => (
                    <motion.div key={b.id} whileHover={{y:-5,scale:1.01}} transition={{type:'spring',stiffness:340,damping:18}}>
                      <div className="qb-bank-card" style={{animationDelay:`${i*0.05}s`}}>
                        <div className="qb-bank-top">
                          <span className="qb-bank-subject">{b.subject}</span>
                          <span className={diffClass(b.difficulty)}>{b.difficulty}</span>
                        </div>
                        <div className="qb-bank-mid">
                          <div className="qb-bank-icon-wrap" style={{background:b.color}}>
                            <span style={{fontSize:24,filter:'drop-shadow(0 2px 4px rgba(0,0,0,.2))'}}>{b.emoji}</span>
                          </div>
                          <div>
                            <div className="qb-bank-name">{b.title}</div>
                            <div className="qb-bank-qs">{b.questions} questions</div>
                          </div>
                        </div>
                        <div className="qb-bank-footer">
                          <span className={`qb-bank-type ${b.type.toLowerCase()}`}>{b.type}</span>
                          <button className="qb-bank-preview-btn" onClick={() => { setView('qa'); gainXP(15); }}>
                            <Eye size={13}/> Preview
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Q&A FORUM ── */}
          {view === 'qa' && (
            <motion.div key="qa" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.22}}>
              <div className="qb-qa-list">
                {QUESTIONS.map((q,i) => (
                  <div key={q.id} className="qb-qa-card" style={{animationDelay:`${i*0.06}s`}}>
                    <div className="qb-qa-meta">
                      <div className="qb-qa-icon-wrap">
                        <q.icon size={16}/>
                      </div>
                      <div>
                        <div className="qb-qa-author">{q.author}</div>
                        <div className="qb-qa-subj">{q.subject} · {q.type}</div>
                      </div>
                    </div>
                    <div className="qb-qa-q">{q.question}</div>
                    <div className="qb-qa-answer">{q.answer}</div>
                    <div className="qb-qa-footer">
                      <button
                        className="qb-qa-like-btn"
                        style={likedQs.has(q.id) ? {borderColor:'#10b981',color:'#10b981',background:'rgba(16,185,129,.07)'} : {}}
                        onClick={() => { setLikedQs(p => { const n=new Set(p); n.has(q.id)?n.delete(q.id):n.add(q.id); return n; }); gainXP(5); }}
                      >
                        <ThumbsUp size={14}/> {q.likes + (likedQs.has(q.id)?1:0)}
                      </button>
                      <button
                        className="qb-qa-mastered-btn"
                        style={masteredQs.has(q.id) ? {background:'linear-gradient(135deg,#6366f1,#8b5cf6)',boxShadow:'0 4px 12px rgba(99,102,241,.28)'} : {}}
                        onClick={() => { setMastered(p => { const n=new Set(p); n.has(q.id)?n.delete(q.id):n.add(q.id); return n; }); if (!masteredQs.has(q.id)) gainXP(10); }}
                      >
                        <CheckCircle2 size={14}/> {masteredQs.has(q.id) ? 'Mastered ✓' : 'Mark Mastered'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Floating action buttons ── */}
        <div className="qb-fab">
          <motion.button
            className="qb-fab-ai"
            whileHover={{scale:1.04}} whileTap={{scale:.96}}
            onClick={() => setAiOpen(true)}
          >
            <Sparkles className="animate-pulse" size={15}/> Ask AI
          </motion.button>
          {view === 'banks' && (
            <motion.button
              className="qb-fab-add"
              whileHover={{scale:1.1,rotate:8}} whileTap={{scale:.92}}
              onClick={() => gainXP(25)}
            >
              <Plus size={22} strokeWidth={2.5}/>
            </motion.button>
          )}
        </div>

      </div>
    </>
  );
};

export default QuizBankPage;