import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

/* ─────────────────────────── CSS — mirrors teacher-dashboard token system ─── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── Variables — Light ── */
:root {
  --an-bg:          #f8fafc;
  --an-card:        #ffffff;
  --an-card2:       #fafafa;
  --an-border:      rgba(0,0,0,.06);
  --an-border2:     #f3f4f6;
  --an-shadow:      0 2px 12px rgba(0,0,0,.05);
  --an-shadow2:     0 12px 32px rgba(0,0,0,.10);
  --an-text:        #0f172a;
  --an-text2:       #64748b;
  --an-text3:       #94a3b8;
  --an-text4:       #374151;
  --an-bar-bg:      #f1f5f9;
  --an-qa-bg:       #fafafa;
  --an-qa-border:   #f3f4f6;
  --an-table-hover: #f8fafc;
  --an-btn-bg:      #ffffff;
  --an-btn-text:    #374151;
  --an-btn-hover:   #f5f3ff;
  --an-btn-htext:   #6366f1;
  --an-badge-bg:    #f9fafb;
  --an-badge-text:  #9ca3af;
  --an-sel-bg:      #ffffff;
  --an-sel-text:    #374151;
  --an-sel-border:  #e5e7eb;
  --an-input-bg:    #ffffff;
  --an-input-border:#e5e7eb;
}

/* ── Variables — Dark ── */
[data-theme="dark"] {
  --an-bg:          #0b1120;
  --an-card:        #141f35;
  --an-card2:       #1a2540;
  --an-border:      rgba(255,255,255,.07);
  --an-border2:     rgba(255,255,255,.06);
  --an-shadow:      0 2px 12px rgba(0,0,0,.3);
  --an-shadow2:     0 12px 32px rgba(0,0,0,.5);
  --an-text:        #f1f5f9;
  --an-text2:       #94a3b8;
  --an-text3:       #64748b;
  --an-text4:       #cbd5e1;
  --an-bar-bg:      rgba(255,255,255,.07);
  --an-qa-bg:       rgba(255,255,255,.03);
  --an-qa-border:   rgba(255,255,255,.06);
  --an-table-hover: rgba(255,255,255,.03);
  --an-btn-bg:      rgba(255,255,255,.06);
  --an-btn-text:    #94a3b8;
  --an-btn-hover:   rgba(99,102,241,.18);
  --an-btn-htext:   #a5b4fc;
  --an-badge-bg:    rgba(255,255,255,.08);
  --an-badge-text:  #64748b;
  --an-sel-bg:      #1a2540;
  --an-sel-text:    #94a3b8;
  --an-sel-border:  rgba(255,255,255,.12);
  --an-input-bg:    #1a2540;
  --an-input-border:rgba(255,255,255,.12);
}

/* ── Root ── */
.an-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  padding: 24px 28px;
  max-width: 1280px;
  margin: 0 auto;
  color: var(--an-text);
  min-height: 100vh;
  background: var(--an-bg);
  transition: color .3s ease, background .3s ease;
}

/* ── Hero ── */
.an-hero {
  border-radius: 24px; padding: 32px 36px; margin-bottom: 28px;
  position: relative; overflow: hidden; color: #fff;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 55%, #8b5cf6 100%);
  animation: heroIn .6s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes heroIn { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:none} }
.an-hero::before { content:''; position:absolute; top:-50px; right:-50px; width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,.1); }
.an-hero::after  { content:''; position:absolute; bottom:-60px; left:20%; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,.07); }
.an-float { position:absolute; border-radius:50%; background:rgba(255,255,255,.06); animation:float 6s ease-in-out infinite; }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
.an-hero-inner  { display:flex; align-items:center; justify-content:space-between; position:relative; z-index:1; flex-wrap:wrap; gap:16px; }
.an-hero-title  { font-size: clamp(18px,3vw,26px); font-weight:800; margin-bottom:6px; }
.an-hero-sub    { font-size:14px; opacity:.75; }
.an-hero-stats  { display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
.an-hero-stat   { text-align:center; }
.an-hero-sn     { font-size:30px; font-weight:800; line-height:1; }
.an-hero-sl     { font-size:12px; opacity:.65; margin-top:2px; }
.an-hero-div    { width:1px; height:44px; background:rgba(255,255,255,.2); }
.an-hero-actions { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.an-hero-btn    { padding:11px 22px; background:#fff; color:#4f46e5; border:none; border-radius:14px; font-size:13.5px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .2s; box-shadow:0 4px 16px rgba(0,0,0,.15); white-space:nowrap; }
.an-hero-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.2); }
.an-hero-btn-outline { padding:11px 22px; background:rgba(255,255,255,.15); color:#fff; border:2px solid rgba(255,255,255,.35); border-radius:14px; font-size:13.5px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .2s; white-space:nowrap; backdrop-filter:blur(4px); }
.an-hero-btn-outline:hover { background:rgba(255,255,255,.25); }
.an-back-link   { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:rgba(255,255,255,.8); background:rgba(255,255,255,.12); border:none; border-radius:10px; padding:7px 14px; cursor:pointer; font-family:inherit; transition:all .18s; margin-bottom:14px; }
.an-back-link:hover { background:rgba(255,255,255,.22); color:#fff; }
.an-back-link svg { width:14px; height:14px; }

/* ── Stats Grid ── */
.an-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
.an-stat-card {
  background: var(--an-card);
  border-radius:18px; padding:20px;
  border:1px solid var(--an-border);
  box-shadow: var(--an-shadow);
  transition:all .25s; cursor:default;
  position:relative; overflow:hidden;
  animation:cardUp .5s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cardUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
.an-stat-card:nth-child(1){animation-delay:.07s} .an-stat-card:nth-child(2){animation-delay:.14s}
.an-stat-card:nth-child(3){animation-delay:.21s} .an-stat-card:nth-child(4){animation-delay:.28s}
.an-stat-card::after { content:''; position:absolute; top:-20px; right:-20px; width:80px; height:80px; border-radius:50%; opacity:.08; transition:transform .3s; }
.an-stat-card:hover { transform:translateY(-4px); box-shadow: var(--an-shadow2); }
.an-stat-card:hover::after { transform:scale(1.4); }
.an-stat-card.sky  { border-top:3px solid #0ea5e9; } .an-stat-card.sky::after  { background:#0ea5e9; }
.an-stat-card.vio  { border-top:3px solid #6366f1; } .an-stat-card.vio::after  { background:#6366f1; }
.an-stat-card.rose { border-top:3px solid #f43f5e; } .an-stat-card.rose::after { background:#f43f5e; }
.an-stat-card.lime { border-top:3px solid #84cc16; } .an-stat-card.lime::after { background:#84cc16; }
.an-stat-card.amber{ border-top:3px solid #f59e0b; } .an-stat-card.amber::after{ background:#f59e0b; }
.an-stat-top   { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.an-stat-icon  { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
.an-stat-icon svg { width:20px; height:20px; }
.asi-sky  { background:rgba(14,165,233,.12);  color:#0ea5e9; }
.asi-vio  { background:rgba(99,102,241,.12);  color:#6366f1; }
.asi-rose { background:rgba(244,63,94,.12);   color:#f43f5e; }
.asi-lime { background:rgba(132,204,22,.12);  color:#84cc16; }
.asi-amber{ background:rgba(245,158,11,.12);  color:#f59e0b; }
[data-theme="dark"] .asi-sky  { background:rgba(14,165,233,.2); }
[data-theme="dark"] .asi-vio  { background:rgba(99,102,241,.2); }
[data-theme="dark"] .asi-rose { background:rgba(244,63,94,.2);  }
[data-theme="dark"] .asi-lime { background:rgba(132,204,22,.2); }
[data-theme="dark"] .asi-amber{ background:rgba(245,158,11,.2); }
.an-stat-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; color: var(--an-badge-text); background: var(--an-badge-bg); }
.an-stat-num   { font-size:32px; font-weight:800; color: var(--an-text); letter-spacing:-1px; line-height:1; margin-bottom:4px; }
.an-stat-label { font-size:13px; color: var(--an-text2); font-weight:500; }
.an-stat-trend { font-size:11.5px; color:#10b981; margin-top:4px; font-weight:600; }
[data-theme="dark"] .an-stat-trend { color:#34d399; }
.an-stat-trend.warn { color:#f59e0b; }
[data-theme="dark"] .an-stat-trend.warn { color:#fcd34d; }

/* ── Alert Cards ── */
.an-alerts-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:28px; }
.an-alert-card { border-radius:16px; padding:18px; position:relative; overflow:hidden; animation:cardUp .5s .35s both; }
.an-alert-card::before { content:''; position:absolute; top:-20px; right:-20px; width:70px; height:70px; border-radius:50%; opacity:.15; }
.an-alert-card.orange { background:linear-gradient(135deg,#fff7ed,#fef3c7); border:1px solid #fde68a; }
.an-alert-card.orange::before { background:#f59e0b; }
.an-alert-card.blue   { background:linear-gradient(135deg,#eff6ff,#e0f2fe); border:1px solid #bae6fd; }
.an-alert-card.blue::before   { background:#3b82f6; }
.an-alert-card.green  { background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1px solid #bbf7d0; }
.an-alert-card.green::before  { background:#10b981; }
.an-alert-card.rose   { background:linear-gradient(135deg,#fff1f2,#ffe4e6); border:1px solid #fecdd3; }
.an-alert-card.rose::before   { background:#f43f5e; }
[data-theme="dark"] .an-alert-card.orange { background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(234,179,8,.07)); border-color:rgba(245,158,11,.28); }
[data-theme="dark"] .an-alert-card.blue   { background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(14,165,233,.07)); border-color:rgba(59,130,246,.28); }
[data-theme="dark"] .an-alert-card.green  { background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(52,211,153,.07)); border-color:rgba(16,185,129,.28); }
[data-theme="dark"] .an-alert-card.rose   { background:linear-gradient(135deg,rgba(244,63,94,.12),rgba(251,113,133,.07)); border-color:rgba(244,63,94,.28); }
.an-alert-emoji { font-size:26px; margin-bottom:8px; }
.an-alert-title { font-size:13.5px; font-weight:700; color: var(--an-text); margin-bottom:3px; }
.an-alert-sub   { font-size:12px; color: var(--an-text2); }
.an-alert-num   { font-size:26px; font-weight:800; color: var(--an-text); margin-top:6px; }

/* ── Time Range Select ── */
.an-sel {
  font-size:13px; padding:9px 14px; border-radius:12px;
  border:1px solid var(--an-sel-border);
  background: var(--an-sel-bg); color: var(--an-sel-text);
  font-family:inherit; cursor:pointer; outline:none;
  appearance:none; transition:all .18s;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 12px center; padding-right:32px;
}
.an-sel:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }

/* ── Tabs ── */
.an-tabs { display:flex; gap:4px; background: var(--an-card); border-radius:16px; padding:6px; margin-bottom:24px; border:1px solid var(--an-border); box-shadow: var(--an-shadow); overflow-x:auto; flex-wrap:nowrap; }
.an-tab  { flex:1; min-width:110px; padding:10px 14px; border:none; border-radius:12px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; color: var(--an-text3); background:transparent; transition:all .2s; white-space:nowrap; }
.an-tab:hover { background: var(--an-qa-bg); color: var(--an-text2); }
.an-tab.active { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 14px rgba(99,102,241,.4); }

/* ── Card ── */
.an-card {
  background: var(--an-card);
  border-radius:20px; padding:22px;
  border:1px solid var(--an-border);
  box-shadow: var(--an-shadow);
  animation:cardUp .5s .4s both;
  transition: background .3s ease, border-color .3s ease;
  margin-bottom: 20px;
}
.an-card:last-child { margin-bottom: 0; }
.an-card-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:10px; }
.an-card-title { font-size:15px; font-weight:700; color: var(--an-text); display:flex; align-items:center; gap:8px; }
.an-card-title svg { width:18px; height:18px; }
.an-view-all { font-size:12.5px; font-weight:600; color:#6366f1; border:none; background:none; cursor:pointer; font-family:inherit; padding:5px 12px; border-radius:8px; transition:background .15s; }
.an-view-all:hover { background:rgba(99,102,241,.08); }
[data-theme="dark"] .an-view-all { color:#a5b4fc; }

/* ── Grid Layouts ── */
.an-2col { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
.an-3col { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-bottom:20px; }

/* ── Progress bar ── */
.an-prog-bg   { height:7px; background: var(--an-bar-bg); border-radius:6px; overflow:hidden; }
.an-prog-fill { height:100%; border-radius:6px; background:linear-gradient(90deg,#6366f1,#8b5cf6); transition:width .9s cubic-bezier(.4,0,.2,1); }
.an-prog-fill.green  { background:linear-gradient(90deg,#10b981,#059669); }
.an-prog-fill.sky    { background:linear-gradient(90deg,#0ea5e9,#3b82f6); }
.an-prog-fill.amber  { background:linear-gradient(90deg,#f59e0b,#ef4444); }
.an-prog-fill.rose   { background:linear-gradient(90deg,#f43f5e,#e11d48); }
.an-prog-row  { margin-bottom:14px; }
.an-prog-label{ display:flex; justify-content:space-between; font-size:12.5px; color: var(--an-text2); margin-bottom:5px; font-weight:500; }
.an-prog-val  { font-weight:700; color: var(--an-text); }

/* ── Bar chart ── */
.an-chart { display:flex; align-items:flex-end; gap:8px; height:130px; margin-top:12px; }
.an-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:5px; }
.an-bar { width:100%; border-radius:6px 6px 0 0; background:linear-gradient(180deg,#6366f1,#8b5cf6); animation:barRise .8s cubic-bezier(.4,0,.2,1) both; min-height:4px; transition:opacity .2s; }
.an-bar:hover { opacity:.8; }
@keyframes barRise { from{transform:scaleY(0);transform-origin:bottom} to{transform:scaleY(1)} }
.an-bar-lbl { font-size:10.5px; color: var(--an-text3); font-weight:600; }
.an-bar-val { font-size:10px; color: var(--an-text3); }

/* ── Donut ── */
.an-donut-wrap   { display:flex; align-items:center; gap:20px; margin-top:12px; }
.an-donut        { position:relative; flex-shrink:0; }
.an-donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.an-donut-num    { font-size:20px; font-weight:800; color: var(--an-text); line-height:1; }
.an-donut-lbl    { font-size:10px; color: var(--an-text3); }
.an-donut-legend { flex:1; }
.an-legend-item  { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.an-legend-dot   { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.an-legend-txt   { font-size:12px; color: var(--an-text2); flex:1; }
.an-legend-val   { font-size:12px; font-weight:700; color: var(--an-text); }

/* ── Insight cards ── */
.an-insight { border-radius:14px; padding:16px; margin-bottom:12px; display:flex; gap:14px; align-items:flex-start; }
.an-insight:last-child { margin-bottom:0; }
.an-insight.warn  { background:linear-gradient(135deg,#fff7ed,#fef3c7); border:1px solid #fde68a; }
.an-insight.good  { background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1px solid #bbf7d0; }
.an-insight.info  { background:linear-gradient(135deg,#eff6ff,#e0f2fe); border:1px solid #bae6fd; }
.an-insight.purple{ background:linear-gradient(135deg,#faf5ff,#f3e8ff); border:1px solid #e9d5ff; }
[data-theme="dark"] .an-insight.warn   { background:linear-gradient(135deg,rgba(245,158,11,.1),rgba(234,179,8,.06)); border-color:rgba(245,158,11,.25); }
[data-theme="dark"] .an-insight.good   { background:linear-gradient(135deg,rgba(16,185,129,.1),rgba(52,211,153,.06)); border-color:rgba(16,185,129,.25); }
[data-theme="dark"] .an-insight.info   { background:linear-gradient(135deg,rgba(59,130,246,.1),rgba(14,165,233,.06)); border-color:rgba(59,130,246,.25); }
[data-theme="dark"] .an-insight.purple { background:linear-gradient(135deg,rgba(139,92,246,.1),rgba(168,85,247,.06)); border-color:rgba(139,92,246,.25); }
.an-insight-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.an-insight-icon svg { width:18px; height:18px; }
.aii-warn   { background:rgba(245,158,11,.15);  color:#d97706; }
.aii-good   { background:rgba(16,185,129,.15);  color:#059669; }
.aii-info   { background:rgba(59,130,246,.15);  color:#2563eb; }
.aii-purple { background:rgba(139,92,246,.15);  color:#7c3aed; }
.an-insight-body { flex:1; }
.an-insight-title { font-size:13.5px; font-weight:700; color: var(--an-text); margin-bottom:4px; }
.an-insight-msg   { font-size:12.5px; color: var(--an-text2); line-height:1.5; }
.an-insight-action{ margin-top:8px; }

/* ── Subject row ── */
.an-subject-row { display:flex; align-items:center; gap:14px; padding:13px 14px; border-radius:13px; border:1px solid var(--an-qa-border); background: var(--an-qa-bg); margin-bottom:10px; transition:all .2s; }
.an-subject-row:last-child { margin-bottom:0; }
.an-subject-row:hover { background: var(--an-btn-hover); border-color:rgba(99,102,241,.3); }
.an-subject-icon { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.an-subject-icon svg { width:18px; height:18px; }
.asi-green  { background:linear-gradient(135deg,#d1fae5,#a7f3d0); color:#059669; }
.asi-orange { background:linear-gradient(135deg,#ffedd5,#fed7aa); color:#d97706; }
.asi-blue2  { background:linear-gradient(135deg,#dbeafe,#bfdbfe); color:#1d4ed8; }
[data-theme="dark"] .asi-green  { background:rgba(16,185,129,.2);  color:#6ee7b7; }
[data-theme="dark"] .asi-orange { background:rgba(245,158,11,.2);  color:#fcd34d; }
[data-theme="dark"] .asi-blue2  { background:rgba(59,130,246,.2);  color:#93c5fd; }
.an-subject-info { flex:1; min-width:0; }
.an-subject-name { font-size:13.5px; font-weight:700; color: var(--an-text); }
.an-subject-meta { font-size:12px; color: var(--an-text3); margin-top:2px; }
.an-subject-prog { flex:1; }

/* ── Score pill ── */
.sp-hi  { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; background:#d1fae5; color:#065f46; }
.sp-mid { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; background:#fef3c7; color:#92400e; }
.sp-lo  { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; background:#fee2e2; color:#991b1b; }
[data-theme="dark"] .sp-hi  { background:rgba(16,185,129,.18); color:#6ee7b7; }
[data-theme="dark"] .sp-mid { background:rgba(245,158,11,.18); color:#fcd34d; }
[data-theme="dark"] .sp-lo  { background:rgba(239,68,68,.18);  color:#fca5a5; }

/* ── Badge ── */
.an-badge        { display:inline-block; font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:20px; }
.an-badge.purple { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; }
.an-badge.green  { background:linear-gradient(135deg,#10b981,#059669); color:#fff; }
.an-badge.amber  { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; }
.an-badge.rose   { background:linear-gradient(135deg,#f43f5e,#e11d48); color:#fff; }
.an-badge.sky    { background:linear-gradient(135deg,#0ea5e9,#3b82f6); color:#fff; }
.an-badge.outline{ background: var(--an-badge-bg); color: var(--an-text2); border:1px solid var(--an-border2); }

/* ── Buttons ── */
.an-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:10px; font-size:12.5px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .18s; border:none; }
.an-btn svg { width:14px; height:14px; }
.an-btn-outline { background: var(--an-btn-bg); color: var(--an-btn-text); border:1px solid var(--an-sel-border); }
.an-btn-outline:hover { background: var(--an-btn-hover); color: var(--an-btn-htext); border-color:rgba(99,102,241,.35); }
.an-btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 14px rgba(99,102,241,.4); }
.an-btn-primary:hover { transform:translateY(-1px); box-shadow:0 8px 20px rgba(99,102,241,.5); }
.an-btn-sm { padding:6px 11px; font-size:12px; }
.an-btn-green { background:linear-gradient(135deg,#10b981,#059669); color:#fff; }
.an-btn-amber { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; }

/* ── Table ── */
.an-table { width:100%; border-collapse:collapse; }
.an-th { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color: var(--an-text3); padding:10px 12px; text-align:left; border-bottom:1px solid var(--an-border2); }
.an-tr { transition:background .15s; cursor:pointer; }
.an-tr:hover { background: var(--an-table-hover); }
.an-td { padding:12px; font-size:13px; color: var(--an-text4); border-bottom:1px solid var(--an-border2); }
.an-td-last { border-bottom:0; }

/* ── Streak grid ── */
.an-streak-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin:12px 0; }
.an-streak-cell { aspect-ratio:1; border-radius:4px; transition:transform .1s; }
.an-streak-cell:hover { transform:scale(1.2); }

/* ── Goal card ── */
.an-goal { padding:16px; border:1px solid var(--an-border2); border-radius:14px; margin-bottom:12px; background: var(--an-card2); }
.an-goal:last-child { margin-bottom:0; }
.an-goal-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.an-goal-title { font-size:13.5px; font-weight:700; color: var(--an-text); }

/* ── Empty state ── */
.an-empty { padding:50px 20px; text-align:center; }
.an-empty-icon { width:64px; height:64px; background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.08)); border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
.an-empty-icon svg { width:28px; height:28px; color:#6366f1; }
.an-empty-title { font-size:15px; font-weight:700; color: var(--an-text); margin-bottom:6px; }
.an-empty-sub   { font-size:13px; color: var(--an-text3); }

/* ── Schedule ── */
.an-schedule-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--an-border2); font-size:13px; }
.an-schedule-row:last-child { border-bottom:0; }
.an-schedule-day { color: var(--an-text2); font-weight:500; }
.an-schedule-subj{ color: var(--an-text); font-weight:700; }

/* ── Mini stat inline ── */
.an-inline-stat { display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--an-border2); }
.an-inline-stat:last-child { border-bottom:0; }
.an-inline-label { color: var(--an-text2); }
.an-inline-val   { color: var(--an-text); font-weight:700; }

/* ── Responsive ── */
@media (max-width:1100px) {
  .an-stats { grid-template-columns:repeat(2,1fr); }
  .an-2col  { grid-template-columns:1fr; }
  .an-3col  { grid-template-columns:1fr 1fr; }
  .an-alerts-row { grid-template-columns:1fr 1fr; }
}
@media (max-width:700px) {
  .an-root  { padding:14px 12px; }
  .an-hero  { padding:20px 18px; }
  .an-stats { grid-template-columns:1fr 1fr; gap:10px; }
  .an-alerts-row { grid-template-columns:1fr; }
  .an-tabs  { gap:2px; }
  .an-tab   { padding:9px 8px; font-size:11.5px; min-width:80px; }
  .an-3col  { grid-template-columns:1fr; }
  .an-2col  { grid-template-columns:1fr; }
}
@media (max-width:420px) {
  .an-stats { grid-template-columns:1fr; }
  .an-hero-stats { flex-wrap:wrap; gap:12px; }
}
`;

/* ─── SVG helper ─── */
const Svg = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  flame:   "M12 2c0 0-5 4-5 9a5 5 0 0010 0c0-5-5-9-5-9zM9.5 14.5c.5 1 1.5 1.5 2.5 1.5",
  trend:   "M23 6l-9.5 9.5-5-5L1 18",
  clock:   "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4 2",
  check:   "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
  users:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 110 8 4 4 0 010-8z",
  book:    "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z",
  brain:   "M9.5 2A2.5 2.5 0 017 4.5v0A2.5 2.5 0 014.5 7H4a2 2 0 00-2 2v0a2 2 0 002 2h.5A2.5 2.5 0 017 13.5v0A2.5 2.5 0 019.5 16v0a2.5 2.5 0 002.5-2.5v0A2.5 2.5 0 0014.5 11H20a2 2 0 002-2v0a2 2 0 00-2-2h-5.5A2.5 2.5 0 0112 4.5v0A2.5 2.5 0 009.5 2z",
  target:  "M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  chart:   "M18 20V10M12 20V4M6 20v-6",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  trophy:  "M12 2H8l-1 7H5l1 3h1a5 5 0 0010 0h1l1-3h-2L16 2h-4zM9 17v4M15 17v4M9 21h6",
  bulb:    "M12 2a7 7 0 015 12l-1 3H8l-1-3A7 7 0 0112 2zM9 19h6M10 22h4",
  alert:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  arrow:   "M19 12H5M12 5l-7 7 7 7",
  zap:     "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",
  clip:    "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 14l2 2 4-4M8 2h8a1 1 0 011 1v3a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1z",
  cal:     "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
  export:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  plus:    "M12 5v14M5 12h14",
} as const;

/* ─── Animated number ─── */
function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let c = 0;
    const step = () => { c += target / 60; if (c < target) { setV(Math.floor(c)); requestAnimationFrame(step); } else setV(target); };
    requestAnimationFrame(step);
  }, [target]);
  return <>{v}{suffix}</>;
}

/* ─── Donut ─── */
function Donut({ segs, size = 110, stroke = 16 }: { segs: { label: string; pct: number }[]; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9"];
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      {segs.map((s, i) => {
        const dash = (s.pct / 100) * c;
        const el = <circle key={i} r={r} cx={size / 2} cy={size / 2} fill="none" stroke={colors[i % colors.length]}
          strokeWidth={stroke} strokeLinecap="butt" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-(off / 100) * c} />;
        off += s.pct; return el;
      })}
    </svg>
  );
}

/* ════════════════════════════════════════ MAIN ════════════════════════════════ */
export default function AnalyticsPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("30days");
  const currentRole = user?.role || "student";
  const isAuthenticated = !!user;

  const { data: studentStats } = useQuery({ queryKey: ["/api/student/stats"], enabled: isAuthenticated && currentRole === "student" });
  const { data: teacherStats }  = useQuery({ queryKey: ["/api/teacher/stats"],  enabled: isAuthenticated && currentRole === "teacher" });
  const { data: examHistory }   = useQuery({ queryKey: ["/api/student/exam-history"], enabled: isAuthenticated && currentRole === "student" });
  const { data: assignments }   = useQuery({ queryKey: ["/api/teacher/assignments"],  enabled: isAuthenticated && currentRole === "teacher" });

  if (!user) return null;

  const heroStats = currentRole === "student"
    ? [
        { n: (studentStats as any)?.lessonsCompleted ?? 24, l: "Lessons Done" },
        { n: Math.round((studentStats as any)?.totalTimeSpent / 60) || 18, l: "Hours Studied" },
        { n: (studentStats as any)?.averageScore ?? 78, l: "Avg Score %" },
      ]
    : [
        { n: (teacherStats as any)?.totalStudents ?? 85, l: "Students" },
        { n: (assignments as any)?.length ?? 12, l: "Assignments" },
        { n: (teacherStats as any)?.classAverage ?? 76, l: "Class Avg %" },
      ];

  return (
    <>
      <style>{css}</style>
      <div className="an-root">

        {/* ── Hero ── */}
        <div className="an-hero">
          <span className="an-float" style={{ width: 40, height: 40, top: "20%", left: "60%", animationDelay: "0s" }} />
          <span className="an-float" style={{ width: 25, height: 25, top: "65%", left: "80%", animationDelay: "1s" }} />
          <span className="an-float" style={{ width: 60, height: 60, top: "10%", left: "45%", animationDelay: "2s" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <Link href="/">
              <button className="an-back-link"><Svg d={ICONS.arrow} size={14} /> Back to Dashboard</button>
            </Link>
            <div className="an-hero-inner">
              <div>
                <div className="an-hero-title">
                  {currentRole === "student" ? "📊 My Learning Analytics" : "📈 Class Analytics Dashboard"}
                </div>
                <div className="an-hero-sub">
                  {currentRole === "student" ? "Track your progress, habits, and performance insights" : "Monitor student performance, assignments, and class trends"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                <div className="an-hero-stats">
                  {heroStats.map((s, i) => (
                    <div key={i} className="an-hero-stat">
                      <div className="an-hero-sn">{s.n}</div>
                      <div className="an-hero-sl">{s.l}</div>
                    </div>
                  )).reduce((acc: any[], el, i, arr) => {
                    acc.push(el);
                    if (i < arr.length - 1) acc.push(<div key={`d${i}`} className="an-hero-div" />);
                    return acc;
                  }, [])}
                </div>
                <div className="an-hero-actions">
                  <select className="an-sel" value={timeRange} onChange={e => setTimeRange(e.target.value)}
                    style={{ background: "rgba(255,255,255,.15)", color: "#fff", borderColor: "rgba(255,255,255,.3)" }}>
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="3months">Last 3 months</option>
                    <option value="6months">Last 6 months</option>
                  </select>
                  <button className="an-hero-btn-outline"><Svg d={ICONS.export} size={14} /> Export</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Role-split content ── */}
        {currentRole === "student"
          ? <StudentAnalytics stats={studentStats} examHistory={examHistory} />
          : <TeacherAnalytics stats={teacherStats} assignments={assignments} />
        }
      </div>
    </>
  );
}

/* ════════════════════════════ STUDENT ANALYTICS ══════════════════════════════ */
function StudentAnalytics({ stats, examHistory }: any) {
  const [tab, setTab] = useState<"overview" | "performance" | "insights" | "goals" | "habits">("overview");

  const avgScore      = stats?.averageScore ?? 0;
  const lessonsComp   = stats?.lessonsCompleted ?? 0;
  const timeSpentH    = Math.round((stats?.totalTimeSpent ?? 0) / 60);
  const studyStreak   = 11; // from backend in real app
  const examList: any[] = examHistory ?? [];

  const subjectMap = examList.reduce((acc: any, e: any) => {
    if (!acc[e.subject]) acc[e.subject] = { total: 0, count: 0 };
    acc[e.subject].total += e.score; acc[e.subject].count += 1;
    return acc;
  }, {});
  const subjects = Object.entries(subjectMap).map(([s, d]: any) => ({ subject: s, avg: Math.round(d.total / d.count), count: d.count }));
  const strong = subjects.filter(s => s.avg >= 75).sort((a, b) => b.avg - a.avg).slice(0, 3);
  const weak   = subjects.filter(s => s.avg < 75).sort((a, b) => a.avg - b.avg).slice(0, 3);

  const donutSegs = subjects.slice(0, 4).map((s, i) => ({ label: s.subject, pct: [35, 28, 22, 15][i] ?? 10 }));
  const donutColors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e"];

  /* score chip */
  const chip = (s: number) => s >= 80 ? "sp-hi" : s >= 65 ? "sp-mid" : "sp-lo";

  return (
    <div>
      {/* Stats */}
      <div className="an-stats">
        {[
          { label: "Study Streak", value: studyStreak, suffix: "d", badge: "🔥 Hot", cls: "amber", icls: "asi-amber", icon: "flame", trend: "Keep it going!" },
          { label: "Avg Score",    value: avgScore,    suffix: "%", badge: "Score",  cls: "sky",   icls: "asi-sky",   icon: "trend", trend: avgScore >= 70 ? "↑ Great progress" : "⚠ Needs work" },
          { label: "Study Hours",  value: timeSpentH,  suffix: "h", badge: "Total",  cls: "vio",   icls: "asi-vio",   icon: "clock", trend: "This period" },
          { label: "Lessons Done", value: lessonsComp, suffix: "",  badge: "Complete",cls: "lime",  icls: "asi-lime",  icon: "check", trend: "↑ Keep learning" },
        ].map((s, i) => (
          <div key={i} className={`an-stat-card ${s.cls}`}>
            <div className="an-stat-top">
              <div className={`an-stat-icon ${s.icls}`}><Svg d={ICONS[s.icon as keyof typeof ICONS]} size={20} /></div>
              <span className="an-stat-badge">{s.badge}</span>
            </div>
            <div className="an-stat-num"><AnimNum target={s.value} suffix={s.suffix} /></div>
            <div className="an-stat-label">{s.label}</div>
            <div className={`an-stat-trend ${s.icon === "trend" && avgScore < 70 ? "warn" : ""}`}>{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Alert snapshots */}
      <div className="an-alerts-row">
        <div className="an-alert-card orange">
          <div className="an-alert-emoji">⚠️</div>
          <div className="an-alert-title">Focus Areas</div>
          <div className="an-alert-sub">Subjects below 75%</div>
          <div className="an-alert-num">{weak.length || 0}</div>
        </div>
        <div className="an-alert-card blue">
          <div className="an-alert-emoji">📚</div>
          <div className="an-alert-title">Exams Taken</div>
          <div className="an-alert-sub">Total attempts</div>
          <div className="an-alert-num">{examList.length}</div>
        </div>
        <div className="an-alert-card green">
          <div className="an-alert-emoji">🏆</div>
          <div className="an-alert-title">Top Subjects</div>
          <div className="an-alert-sub">Scoring 75%+</div>
          <div className="an-alert-num">{strong.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="an-tabs">
        {(["overview","performance","insights","goals","habits"] as const).map(t => (
          <button key={t} className={`an-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "overview" ? "📋 Overview" : t === "performance" ? "📈 Performance" : t === "insights" ? "🧠 Insights" : t === "goals" ? "🎯 Goals" : "⏰ Habits"}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div>
          <div className="an-2col">
            {/* Strong subjects */}
            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd">
                <div className="an-card-title"><Svg d={ICONS.star} size={18} style={{ color: "#f59e0b" }} /> Strong Subjects</div>
              </div>
              {strong.length > 0 ? strong.map((s, i) => (
                <div key={i} className="an-subject-row">
                  <div className={`an-subject-icon ${["asi-green","asi-blue2","asi-orange"][i]}`}><Svg d={ICONS.book} size={18} /></div>
                  <div className="an-subject-info">
                    <div className="an-subject-name">{s.subject}</div>
                    <div className="an-subject-meta">{s.count} attempt{s.count !== 1 ? "s" : ""}</div>
                  </div>
                  <span className={chip(s.avg)}>{s.avg}%</span>
                </div>
              )) : (
                <div className="an-empty">
                  <div className="an-empty-icon"><Svg d={ICONS.book} size={28} /></div>
                  <div className="an-empty-title">No data yet</div>
                  <div className="an-empty-sub">Take exams to discover your strong subjects</div>
                </div>
              )}
            </div>

            {/* Weak subjects */}
            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd">
                <div className="an-card-title"><Svg d={ICONS.brain} size={18} style={{ color: "#6366f1" }} /> Focus Areas</div>
              </div>
              {weak.length > 0 ? weak.map((s, i) => (
                <div key={i} className="an-subject-row">
                  <div className="an-subject-icon asi-orange"><Svg d={ICONS.target} size={18} /></div>
                  <div className="an-subject-info">
                    <div className="an-subject-name">{s.subject}</div>
                    <div className="an-subject-meta">Needs more practice</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span className={chip(s.avg)}>{s.avg}%</span>
                    <button className="an-btn an-btn-amber an-btn-sm">Practice</button>
                  </div>
                </div>
              )) : (
                <div className="an-empty">
                  <div className="an-empty-icon"><Svg d={ICONS.trophy} size={28} /></div>
                  <div className="an-empty-title">No weak areas!</div>
                  <div className="an-empty-sub">All your subjects are performing well</div>
                </div>
              )}
            </div>
          </div>

          {/* Subject distribution donut */}
          <div className="an-2col">
            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd"><div className="an-card-title"><Svg d={ICONS.chart} />Subject Distribution</div></div>
              <div className="an-donut-wrap">
                <div className="an-donut">
                  <Donut segs={donutSegs.length ? donutSegs : [{ label: "No data", pct: 100 }]} size={110} stroke={16} />
                  <div className="an-donut-center">
                    <div className="an-donut-num">{examList.length}</div>
                    <div className="an-donut-lbl">exams</div>
                  </div>
                </div>
                <div className="an-donut-legend">
                  {donutSegs.map((d, i) => (
                    <div key={i} className="an-legend-item">
                      <div className="an-legend-dot" style={{ background: donutColors[i] }} />
                      <div className="an-legend-txt">{d.label}</div>
                      <div className="an-legend-val">{d.pct}%</div>
                    </div>
                  ))}
                  {donutSegs.length === 0 && <p style={{ fontSize: 12, color: "var(--an-text3)" }}>Take exams to see distribution</p>}
                </div>
              </div>
            </div>

            {/* Recent exams */}
            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd">
                <div className="an-card-title"><Svg d={ICONS.cal} />Recent Exams</div>
                <button className="an-view-all">View all →</button>
              </div>
              {examList.length > 0 ? examList.slice(0, 5).map((e: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--an-border2)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: e.score >= 80 ? "#10b981" : e.score >= 65 ? "#f59e0b" : "#f43f5e" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--an-text)" }}>{e.subject}</div>
                    <div style={{ fontSize: 11.5, color: "var(--an-text3)" }}>{new Date(e.completedAt).toLocaleDateString()}</div>
                  </div>
                  <span className={chip(e.score)}>{e.score}%</span>
                </div>
              )) : (
                <div className="an-empty" style={{ padding: "30px 0" }}>
                  <div className="an-empty-sub">No exam history yet</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Performance ── */}
      {tab === "performance" && (
        <div>
          <div className="an-3col">
            {[
              { label: "This Week", value: avgScore, suffix: "%", sub: "Average Score", icon: "trend", color: "#0ea5e9" },
              { label: "Consistency", value: Math.min(studyStreak * 7, 100), suffix: "%", sub: "Daily Practice", icon: "flame", color: "#f59e0b" },
              { label: "Velocity", value: lessonsComp * 2, suffix: "", sub: "Topics / Week", icon: "activity", color: "#8b5cf6" },
            ].map((s, i) => (
              <div key={i} className="an-card" style={{ textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--an-text2)", marginBottom: 12 }}>{s.label}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: s.color, letterSpacing: -1 }}><AnimNum target={s.value} suffix={s.suffix} /></div>
                <div style={{ fontSize: 12, color: "var(--an-text3)", marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Score distribution */}
          <div className="an-card">
            <div className="an-card-hd"><div className="an-card-title"><Svg d={ICONS.chart} />Score Distribution</div></div>
            {examList.length > 0 ? (
              [["90–100%", 90, 100], ["80–89%", 80, 89], ["70–79%", 70, 79], ["60–69%", 60, 69], ["< 60%", 0, 59]].map(([label, min, max], idx) => {
                const count = examList.filter((e: any) => e.score >= (min as number) && e.score <= (max as number)).length;
                const pct = (count / examList.length) * 100;
                const colors = ["green", "green", "", "amber", "rose"] as const;
                return (
                  <div key={idx} className="an-prog-row">
                    <div className="an-prog-label"><span>{label}</span><span className="an-prog-val">{count} exams</span></div>
                    <div className="an-prog-bg"><div className={`an-prog-fill ${colors[idx]}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })
            ) : (
              <div className="an-empty"><div className="an-empty-sub">Take more exams to see score distribution</div></div>
            )}
          </div>

          {/* Bar chart — mock weekly scores */}
          <div className="an-card">
            <div className="an-card-hd">
              <div className="an-card-title"><Svg d={ICONS.trend} />Weekly Score Trend</div>
              <select className="an-sel"><option>7 days</option><option>30 days</option></select>
            </div>
            <div className="an-chart">
              {[62, 75, 68, 82, 78, 91, avgScore || 84].map((v, i) => (
                <div key={i} className="an-bar-col">
                  <div className="an-bar-val">{v}%</div>
                  <div className="an-bar" style={{ height: `${v}%`, animationDelay: `${0.1 + i * 0.08}s` }} />
                  <div className="an-bar-lbl">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Insights ── */}
      {tab === "insights" && (
        <div>
          <div className="an-card">
            <div className="an-card-hd"><div className="an-card-title"><Svg d={ICONS.brain} style={{ color: "#6366f1" }} />Personalized Learning Insights</div></div>

            {avgScore < 70 && (
              <div className="an-insight warn">
                <div className="an-insight-icon aii-warn"><Svg d={ICONS.alert} size={18} /></div>
                <div className="an-insight-body">
                  <div className="an-insight-title">Performance Needs Attention</div>
                  <div className="an-insight-msg">Your average is below 70%. Spending 20 extra minutes daily on practice tests can improve retention significantly.</div>
                  <div className="an-insight-action"><button className="an-btn an-btn-amber an-btn-sm">Take Practice Tests</button></div>
                </div>
              </div>
            )}

            {avgScore >= 85 && (
              <div className="an-insight good">
                <div className="an-insight-icon aii-good"><Svg d={ICONS.trophy} size={18} /></div>
                <div className="an-insight-body">
                  <div className="an-insight-title">Excellent Performance! 🎉</div>
                  <div className="an-insight-msg">You're performing exceptionally well above 85%. Challenge yourself with harder topics to continue growing.</div>
                  <div className="an-insight-action"><button className="an-btn an-btn-primary an-btn-sm">Challenge Yourself</button></div>
                </div>
              </div>
            )}

            <div className="an-insight info">
              <div className="an-insight-icon aii-info"><Svg d={ICONS.activity} size={18} /></div>
              <div className="an-insight-body">
                <div className="an-insight-title">Learning Pattern Analysis</div>
                <div className="an-insight-msg">Based on your study habits, you perform best during evening hours and show stronger retention with structured content. Your current {studyStreak}-day streak is fantastic!</div>
                <div className="an-insight-action" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className="an-badge sky">Evening Learner</span>
                  <span className="an-badge purple">Visual Style</span>
                  <span className="an-badge green">{studyStreak}d Streak</span>
                </div>
              </div>
            </div>

            <div className="an-insight purple">
              <div className="an-insight-icon aii-purple"><Svg d={ICONS.trend} size={18} /></div>
              <div className="an-insight-body">
                <div className="an-insight-title">Performance Prediction</div>
                <div className="an-insight-msg">Based on current trends, you're likely to achieve <strong>{Math.min(avgScore + 5, 95)}%</strong> avg by next month with consistent daily practice of 30+ minutes.</div>
                <div style={{ marginTop: 10 }}>
                  <div className="an-prog-bg"><div className="an-prog-fill" style={{ width: `${Math.min(avgScore + 5, 95)}%` }} /></div>
                  <div style={{ fontSize: 11.5, color: "var(--an-text3)", marginTop: 4 }}>Predicted: {Math.min(avgScore + 5, 95)}%</div>
                </div>
              </div>
            </div>

            {weak.length > 0 && (
              <div className="an-insight warn">
                <div className="an-insight-icon aii-warn"><Svg d={ICONS.bulb} size={18} /></div>
                <div className="an-insight-body">
                  <div className="an-insight-title">Recommendations</div>
                  <div className="an-insight-msg">
                    <ul style={{ paddingLeft: 16, marginTop: 6 }}>
                      {weak.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>Focus on <strong>{s.subject}</strong> — currently {s.avg}%, needs 75%+</li>)}
                      <li>Review previous mistakes before attempting new tests</li>
                      <li>Schedule 15-min daily reviews to maintain your streak</li>
                    </ul>
                  </div>
                  <div className="an-insight-action"><button className="an-btn an-btn-primary an-btn-sm">View Study Plan</button></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Goals ── */}
      {tab === "goals" && (
        <div>
          <div className="an-2col">
            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd">
                <div className="an-card-title"><Svg d={ICONS.target} style={{ color: "#10b981" }} />Active Goals</div>
                <button className="an-btn an-btn-primary an-btn-sm"><Svg d={ICONS.plus} size={13} />Add Goal</button>
              </div>
              {[
                { title: "Weekly Study Goal", target: "10 hours", current: timeSpentH, max: 10, badge: "sky", color: "sky" },
                { title: "Score Improvement",  target: "85% avg",  current: avgScore,  max: 85,  badge: "green", color: "green" },
                { title: "Study Streak",       target: "30 days",  current: studyStreak, max: 30, badge: "amber", color: "amber" },
                { title: "Lessons Completed",  target: "50 total", current: lessonsComp, max: 50, badge: "purple", color: "" },
              ].map((g, i) => (
                <div key={i} className="an-goal">
                  <div className="an-goal-head">
                    <div className="an-goal-title">{g.title}</div>
                    <span className={`an-badge ${g.badge}`}>{g.target}</span>
                  </div>
                  <div className="an-prog-bg">
                    <div className={`an-prog-fill ${g.color}`} style={{ width: `${Math.min((g.current / g.max) * 100, 100)}%` }} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--an-text3)", marginTop: 5 }}>{g.current} / {g.max} {g.title.includes("Score") ? "%" : g.title.includes("hours") ? "h" : ""}</div>
                </div>
              ))}
            </div>

            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd"><div className="an-card-title"><Svg d={ICONS.star} style={{ color: "#f59e0b" }} />Suggested Goals</div></div>
              {[
                { title: "Complete 5 lessons this week", diff: "Easy",   pts: "50 pts",  badge: "green" },
                { title: "Achieve 80% in next Science test", diff: "Medium", pts: "100 pts", badge: "amber" },
                { title: "Maintain 14-day study streak", diff: "Medium", pts: "150 pts", badge: "amber" },
                { title: "Master all weak subjects",     diff: "Hard",   pts: "200 pts", badge: "rose"  },
              ].map((g, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid var(--an-border2)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--an-text)", marginBottom: 4 }}>{g.title}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span className={`an-badge ${g.badge}`}>{g.diff}</span>
                      <span className="an-badge outline">{g.pts}</span>
                    </div>
                  </div>
                  <button className="an-btn an-btn-outline an-btn-sm">Add</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Habits ── */}
      {tab === "habits" && (
        <div>
          <div className="an-2col">
            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd"><div className="an-card-title"><Svg d={ICONS.clock} style={{ color: "#0ea5e9" }} />Study Time Patterns</div></div>
              {[
                { period: "Morning (6–12)", hours: 2 },
                { period: "Afternoon (12–18)", hours: 1 },
                { period: "Evening (18–24)", hours: 4 },
                { period: "Night (0–6)", hours: 0 },
              ].map((r, i) => (
                <div key={i} className="an-prog-row">
                  <div className="an-prog-label"><span>{r.period}</span><span className="an-prog-val">{r.hours}h</span></div>
                  <div className="an-prog-bg"><div className="an-prog-fill sky" style={{ width: `${(r.hours / 4) * 100}%` }} /></div>
                </div>
              ))}
              <div className="an-insight info" style={{ marginTop: 14, marginBottom: 0 }}>
                <div className="an-insight-icon aii-info" style={{ width: 32, height: 32 }}><Svg d={ICONS.bulb} size={14} /></div>
                <div className="an-insight-body">
                  <div className="an-insight-msg" style={{ fontSize: 12 }}>You're most productive during <strong>Evening (18–24)</strong>. Schedule your hardest topics then!</div>
                </div>
              </div>
            </div>

            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd"><div className="an-card-title"><Svg d={ICONS.activity} style={{ color: "#10b981" }} />Consistency Tracker</div></div>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#10b981", letterSpacing: -2 }}><AnimNum target={studyStreak} /></div>
                <div style={{ fontSize: 13, color: "var(--an-text3)" }}>Day Streak 🔥</div>
              </div>
              <div className="an-streak-grid">
                {Array.from({ length: 28 }, (_, i) => (
                  <div key={i} className="an-streak-cell"
                    style={{ background: i < studyStreak ? (i < 7 ? "#6366f1" : "#10b981") : "var(--an-bar-bg)" }}
                    title={`Day ${i + 1}`} />
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                {[
                  { label: "Study Days This Week", val: `${Math.min(studyStreak, 7)}/7` },
                  { label: "Avg Session Length", val: "45 min" },
                  { label: "Most Active Day", val: "Wednesday" },
                  { label: "Sessions This Month", val: studyStreak.toString() },
                ].map((r, i) => (
                  <div key={i} className="an-inline-stat">
                    <span className="an-inline-label">{r.label}</span>
                    <span className="an-inline-val">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="an-card">
            <div className="an-card-hd"><div className="an-card-title"><Svg d={ICONS.cal} />Recommended Study Schedule</div></div>
            <div className="an-2col" style={{ marginBottom: 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--an-text2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>Weekday Plan</div>
                {[
                  { day: "Mon / Wed / Fri", subj: "Mathematics (7–8 PM)" },
                  { day: "Tue / Thu",       subj: "Science (7–8 PM)" },
                ].map((r, i) => <div key={i} className="an-schedule-row"><span className="an-schedule-day">{r.day}</span><span className="an-schedule-subj">{r.subj}</span></div>)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--an-text2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>Weekend Plan</div>
                {[
                  { day: "Saturday", subj: "Review & Practice (2–4 PM)" },
                  { day: "Sunday",   subj: "English & Reading (6–7 PM)" },
                ].map((r, i) => <div key={i} className="an-schedule-row"><span className="an-schedule-day">{r.day}</span><span className="an-schedule-subj">{r.subj}</span></div>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════ TEACHER ANALYTICS ══════════════════════════════ */
function TeacherAnalytics({ stats, assignments }: any) {
  const [tab, setTab] = useState<"overview" | "students" | "assignments" | "performance">("overview");

  const assignList: any[] = assignments ?? [];
  const totalStudents = stats?.totalStudents ?? 85;
  const classAvg = stats?.classAverage ?? 78;
  const pendingReview = assignList.reduce((s: number, a: any) => s + ((a.totalStudents ?? 0) - (a.submissionCount ?? 0)), 0);
  const totalSubs = assignList.reduce((s: number, a: any) => s + (a.submissionCount ?? 0), 0);

  const donutSegs = [
    { label: "Submitted", pct: Math.round((totalSubs / Math.max(totalStudents, 1)) * 100) },
    { label: "Pending",   pct: 100 - Math.round((totalSubs / Math.max(totalStudents, 1)) * 100) },
  ];
  const donutColors = ["#6366f1", "var(--an-bar-bg)"];

  const topStudents = [
    { name: "Sarah Chen", subject: "Mathematics", score: 98 },
    { name: "James Kim",  subject: "Physics",     score: 92 },
    { name: "Priya Patel",subject: "Chemistry",   score: 87 },
    { name: "Tom Rivera", subject: "Mathematics", score: 73 },
    { name: "Amy Liu",    subject: "Biology",     score: 61 },
  ];
  const chip = (s: number) => s >= 80 ? "sp-hi" : s >= 65 ? "sp-mid" : "sp-lo";

  return (
    <div>
      {/* Stats */}
      <div className="an-stats">
        {[
          { label: "Total Students",   value: totalStudents,       suffix: "",  badge: "Enrolled",  cls: "sky",  icls: "asi-sky",  icon: "users",  trend: "↑ 5 this week" },
          { label: "Assignments",      value: assignList.length,   suffix: "",  badge: "Created",   cls: "vio",  icls: "asi-vio",  icon: "clip",   trend: `${assignList.filter((a:any) => new Date(a.dueDate) > new Date()).length} active` },
          { label: "Total Submissions",value: totalSubs,           suffix: "",  badge: "Received",  cls: "rose", icls: "asi-rose", icon: "send",   trend: `${pendingReview} pending` },
          { label: "Class Average",    value: classAvg,            suffix: "%", badge: "Score",     cls: "lime", icls: "asi-lime", icon: "trend",  trend: "↑ 4% this month" },
        ].map((s, i) => (
          <div key={i} className={`an-stat-card ${s.cls}`}>
            <div className="an-stat-top">
              <div className={`an-stat-icon ${s.icls}`}><Svg d={ICONS[s.icon as keyof typeof ICONS]} size={20} /></div>
              <span className="an-stat-badge">{s.badge}</span>
            </div>
            <div className="an-stat-num"><AnimNum target={s.value} suffix={s.suffix} /></div>
            <div className="an-stat-label">{s.label}</div>
            <div className="an-stat-trend">{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Alert cards */}
      <div className="an-alerts-row">
        <div className="an-alert-card orange">
          <div className="an-alert-emoji">⏰</div>
          <div className="an-alert-title">Due This Week</div>
          <div className="an-alert-sub">Assignments closing soon</div>
          <div className="an-alert-num">{assignList.filter((a: any) => { const d = new Date(a.dueDate); const n = new Date(); return d > n && d < new Date(n.getTime() + 7 * 864e5); }).length}</div>
        </div>
        <div className="an-alert-card blue">
          <div className="an-alert-emoji">📬</div>
          <div className="an-alert-title">Pending Review</div>
          <div className="an-alert-sub">Ungraded submissions</div>
          <div className="an-alert-num">{pendingReview}</div>
        </div>
        <div className="an-alert-card green">
          <div className="an-alert-emoji">✅</div>
          <div className="an-alert-title">Submitted Today</div>
          <div className="an-alert-sub">Completed work</div>
          <div className="an-alert-num">18</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="an-tabs">
        {(["overview","students","assignments","performance"] as const).map(t => (
          <button key={t} className={`an-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "overview" ? "📋 Overview" : t === "students" ? "👥 Students" : t === "assignments" ? "📝 Assignments" : "📈 Performance"}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div>
          <div className="an-2col">
            {/* Bar chart — weekly performance */}
            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd">
                <div className="an-card-title"><Svg d={ICONS.chart} />Weekly Class Performance</div>
                <select className="an-sel"><option>7 days</option><option>30 days</option></select>
              </div>
              <div className="an-chart">
                {[72, 78, 65, 83, 79, 88, classAvg].map((v, i) => (
                  <div key={i} className="an-bar-col">
                    <div className="an-bar-val">{v}%</div>
                    <div className="an-bar" style={{ height: `${v}%`, animationDelay: `${0.1 + i * 0.08}s` }} />
                    <div className="an-bar-lbl">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submission donut */}
            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd"><div className="an-card-title"><Svg d={ICONS.users} />Submission Rate</div></div>
              <div className="an-donut-wrap">
                <div className="an-donut">
                  <Donut segs={donutSegs} size={110} stroke={16} />
                  <div className="an-donut-center">
                    <div className="an-donut-num">{donutSegs[0].pct}%</div>
                    <div className="an-donut-lbl">submitted</div>
                  </div>
                </div>
                <div className="an-donut-legend">
                  <div className="an-legend-item"><div className="an-legend-dot" style={{ background: "#6366f1" }} /><div className="an-legend-txt">Submitted</div><div className="an-legend-val">{totalSubs}</div></div>
                  <div className="an-legend-item"><div className="an-legend-dot" style={{ background: "#f43f5e" }} /><div className="an-legend-txt">Pending</div><div className="an-legend-val">{pendingReview}</div></div>
                  <div className="an-legend-item"><div className="an-legend-dot" style={{ background: "#10b981" }} /><div className="an-legend-txt">Total Students</div><div className="an-legend-val">{totalStudents}</div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Class avg progress by subject */}
          <div className="an-card">
            <div className="an-card-hd"><div className="an-card-title"><Svg d={ICONS.book} />Average Score by Subject</div></div>
            {[
              { subject: "Advanced Mathematics", avg: 87, color: "" },
              { subject: "Physics Fundamentals", avg: 74, color: "sky" },
              { subject: "Chemistry Basics",     avg: 82, color: "green" },
              { subject: "Biology",              avg: 69, color: "amber" },
            ].map((s, i) => (
              <div key={i} className="an-prog-row">
                <div className="an-prog-label"><span>{s.subject}</span><span className="an-prog-val">{s.avg}%</span></div>
                <div className="an-prog-bg"><div className={`an-prog-fill ${s.color}`} style={{ width: `${s.avg}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Students ── */}
      {tab === "students" && (
        <div>
          <div className="an-card">
            <div className="an-card-hd">
              <div className="an-card-title"><Svg d={ICONS.star} style={{ color: "#f59e0b" }} />Top Students 🌟</div>
              <button className="an-view-all">View all →</button>
            </div>
            <table className="an-table">
              <thead>
                <tr>
                  <th className="an-th">Student</th>
                  <th className="an-th">Subject</th>
                  <th className="an-th">Score</th>
                  <th className="an-th">Progress</th>
                </tr>
              </thead>
              <tbody>
                {topStudents.map((s, i) => (
                  <tr key={i} className="an-tr">
                    <td className="an-td" style={{ fontWeight: 700, color: "var(--an-text)" }}>{s.name}</td>
                    <td className="an-td" style={{ color: "var(--an-text3)" }}>{s.subject}</td>
                    <td className="an-td"><span className={chip(s.score)}>{s.score}%</span></td>
                    <td className={`an-td an-td-last`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="an-prog-bg" style={{ flex: 1 }}><div className="an-prog-fill" style={{ width: `${s.score}%` }} /></div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--an-text4)", minWidth: 32 }}>{s.score}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="an-2col">
            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd"><div className="an-card-title">Score Distribution</div></div>
              {[["90–100%",90,100], ["80–89%",80,89], ["70–79%",70,79], ["60–69%",60,69], ["<60%",0,59]].map(([lbl,mn,mx],i) => {
                const pct = [15, 32, 28, 18, 7][i];
                const colors = ["green","green","","amber","rose"] as const;
                return (
                  <div key={i} className="an-prog-row">
                    <div className="an-prog-label"><span>{lbl}</span><span className="an-prog-val">{pct}%</span></div>
                    <div className="an-prog-bg"><div className={`an-prog-fill ${colors[i]}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
            <div className="an-card" style={{ marginBottom: 0 }}>
              <div className="an-card-hd"><div className="an-card-title">Class Stats Snapshot</div></div>
              {[
                { label: "Highest Score", val: "98%" },
                { label: "Lowest Score",  val: "42%" },
                { label: "Class Median",  val: "79%" },
                { label: "Pass Rate (≥60%)", val: "93%" },
                { label: "Distinction (≥85%)", val: "24%" },
                { label: "Most Active Day", val: "Wednesday" },
              ].map((r, i) => (
                <div key={i} className="an-inline-stat">
                  <span className="an-inline-label">{r.label}</span>
                  <span className="an-inline-val">{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Assignments ── */}
      {tab === "assignments" && (
        <div>
          <div className="an-card">
            <div className="an-card-hd">
              <div className="an-card-title"><Svg d={ICONS.clip} />Assignment Completion</div>
              <Link href="/teacher/homework"><button className="an-btn an-btn-primary an-btn-sm">Manage →</button></Link>
            </div>
            {assignList.length > 0 ? assignList.map((a: any, i: number) => {
              const pct = Math.round(((a.submissionCount ?? 0) / Math.max(a.totalStudents ?? 1, 1)) * 100);
              const isOver = new Date(a.dueDate) < new Date();
              return (
                <div key={i} style={{ padding: "14px 0", borderBottom: "1px solid var(--an-border2)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--an-text)" }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: "var(--an-text3)", marginTop: 2 }}>{a.courseName} · {a.submissionCount ?? 0}/{a.totalStudents ?? 0} submitted</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span className={`an-badge ${isOver ? "rose" : "green"}`}>{isOver ? "Overdue" : "Active"}</span>
                      <span className="an-badge outline">{pct}%</span>
                    </div>
                  </div>
                  <div className="an-prog-bg">
                    <div className={`an-prog-fill ${pct >= 80 ? "green" : pct >= 60 ? "" : "amber"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            }) : (
              <div className="an-empty">
                <div className="an-empty-icon"><Svg d={ICONS.clip} size={28} /></div>
                <div className="an-empty-title">No assignments yet</div>
                <div className="an-empty-sub">Create assignments to see analytics</div>
                <div style={{ marginTop: 14 }}>
                  <Link href="/teacher/homework"><button className="an-btn an-btn-primary">Create Assignment</button></Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Performance ── */}
      {tab === "performance" && (
        <div>
          <div className="an-3col">
            {[
              { label: "This Week Avg", value: classAvg, suffix: "%", color: "#0ea5e9", sub: "Class Average" },
              { label: "Submissions",   value: totalSubs,suffix: "",  color: "#6366f1", sub: "Total Received" },
              { label: "Pass Rate",     value: 93,        suffix: "%", color: "#10b981", sub: "Scoring ≥ 60%" },
            ].map((s, i) => (
              <div key={i} className="an-card" style={{ textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--an-text2)", marginBottom: 12 }}>{s.label}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: s.color, letterSpacing: -1 }}><AnimNum target={s.value} suffix={s.suffix} /></div>
                <div style={{ fontSize: 12, color: "var(--an-text3)", marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="an-card">
            <div className="an-card-hd">
              <div className="an-card-title"><Svg d={ICONS.trend} />Class Performance Trend</div>
              <select className="an-sel"><option>7 days</option><option>30 days</option></select>
            </div>
            <div className="an-chart">
              {[68, 74, 71, 80, 76, 85, classAvg].map((v, i) => (
                <div key={i} className="an-bar-col">
                  <div className="an-bar-val">{v}%</div>
                  <div className="an-bar" style={{ height: `${v}%`, animationDelay: `${0.1 + i * 0.08}s` }} />
                  <div className="an-bar-lbl">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="an-card">
            <div className="an-card-hd"><div className="an-card-title"><Svg d={ICONS.brain} style={{ color: "#6366f1" }} />AI Class Insights</div></div>
            {[
              { cls: "good", icon: "trophy", icls: "aii-good", title: "Strong Performance", msg: "Your class is excelling in Mathematics with 87% average. Continue reinforcing problem-solving techniques." },
              { cls: "warn", icon: "alert", icls: "aii-warn", title: "Attention Needed", msg: "Biology scores are trending lower at 69% average. Consider scheduling additional practice sessions or revision materials." },
              { cls: "info", icon: "bulb", icls: "aii-info", title: "Engagement Tip", msg: "Submission rate is highest on Wednesdays and Thursdays. Schedule important assignments with Wednesday deadlines for best turnout." },
            ].map((ins, i) => (
              <div key={i} className={`an-insight ${ins.cls}`}>
                <div className={`an-insight-icon ${ins.icls}`}><Svg d={ICONS[ins.icon as keyof typeof ICONS]} size={18} /></div>
                <div className="an-insight-body">
                  <div className="an-insight-title">{ins.title}</div>
                  <div className="an-insight-msg">{ins.msg}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}