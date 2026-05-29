import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";

interface TeacherStats {
  totalStudents?: number;
  coursesCreated?: number;
  pendingAssignments?: number;
  classAverage?: number;
}
interface StatCard { label:string; value:number; badge:string; cardClass:string; iconClass:string; iconKey:keyof typeof ICONS; trend:string; suffix:string; }
interface QuickAction { label:string; desc:string; iconKey:keyof typeof ICONS; colorClass:string; href:string; }
interface ClassItem { name:string; grade:string; students:number; pct:number; iconKey:keyof typeof ICONS; iconClass:string; ago:string; }
interface AlertCard { emoji:string; title:string; sub:string; num:number; colorClass:string; }
interface DonutSegment { label:string; pct:number; }
interface StudentRow { name:string; subject:string; score:number; grade:number; }
interface SnapshotRow { label:string; val:string; pct:number; }

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── CSS Variables — Light ── */
:root {
  --td-bg:          #f8fafc;
  --td-card:        #ffffff;
  --td-card2:       #fafafa;
  --td-border:      rgba(0,0,0,.06);
  --td-border2:     #f3f4f6;
  --td-shadow:      0 2px 12px rgba(0,0,0,.05);
  --td-shadow2:     0 12px 32px rgba(0,0,0,.10);
  --td-text:        #0f172a;
  --td-text2:       #64748b;
  --td-text3:       #94a3b8;
  --td-text4:       #374151;
  --td-bar-bg:      #f1f5f9;
  --td-qa-bg:       #fafafa;
  --td-qa-border:   #f3f4f6;
  --td-class-bg:    #fafafa;
  --td-table-hover: #f8fafc;
  --td-btn-bg:      #ffffff;
  --td-btn-text:    #374151;
  --td-btn-hover:   #f5f3ff;
  --td-btn-htext:   #6366f1;
  --td-badge-bg:    #f9fafb;
  --td-badge-text:  #9ca3af;
  --td-sel-bg:      #ffffff;
  --td-sel-text:    #374151;
  --td-sel-border:  #e5e7eb;
}

/* ── CSS Variables — Dark ── */
[data-theme="dark"] {
  --td-bg:          #0b1120;
  --td-card:        #141f35;
  --td-card2:       #1a2540;
  --td-border:      rgba(255,255,255,.07);
  --td-border2:     rgba(255,255,255,.06);
  --td-shadow:      0 2px 12px rgba(0,0,0,.3);
  --td-shadow2:     0 12px 32px rgba(0,0,0,.5);
  --td-text:        #f1f5f9;
  --td-text2:       #94a3b8;
  --td-text3:       #64748b;
  --td-text4:       #cbd5e1;
  --td-bar-bg:      rgba(255,255,255,.07);
  --td-qa-bg:       rgba(255,255,255,.03);
  --td-qa-border:   rgba(255,255,255,.06);
  --td-class-bg:    rgba(255,255,255,.03);
  --td-table-hover: rgba(255,255,255,.03);
  --td-btn-bg:      rgba(255,255,255,.06);
  --td-btn-text:    #94a3b8;
  --td-btn-hover:   rgba(99,102,241,.18);
  --td-btn-htext:   #a5b4fc;
  --td-badge-bg:    rgba(255,255,255,.08);
  --td-badge-text:  #64748b;
  --td-sel-bg:      #1a2540;
  --td-sel-text:    #94a3b8;
  --td-sel-border:  rgba(255,255,255,.12);
}

.td-root {
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  padding:24px 28px;
  max-width:1280px;
  margin:0 auto;
  color: var(--td-text);
  transition: color .3s ease;
}

/* Hero */
.td-hero {
  border-radius:24px; padding:32px 36px; margin-bottom:28px;
  position:relative; overflow:hidden; color:#fff;
  background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 55%,#8b5cf6 100%);
  animation:heroIn .6s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes heroIn { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:none} }
.td-hero::before { content:''; position:absolute; top:-50px; right:-50px; width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,.1); }
.td-hero::after  { content:''; position:absolute; bottom:-60px; left:20%; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,.07); }
.td-float { position:absolute; border-radius:50%; background:rgba(255,255,255,.06); animation:float 6s ease-in-out infinite; }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
.td-hero-inner  { display:flex; align-items:center; justify-content:space-between; position:relative; z-index:1; }
.td-hero-title  { font-size:clamp(18px,3vw,26px); font-weight:800; margin-bottom:6px; }
.td-hero-sub    { font-size:14px; opacity:.75; }
.td-hero-stats  { display:flex; align-items:center; gap:20px; }
.td-hero-stat   { text-align:center; }
.td-hero-sn     { font-size:30px; font-weight:800; line-height:1; }
.td-hero-sl     { font-size:12px; opacity:.65; margin-top:2px; }
.td-hero-div    { width:1px; height:44px; background:rgba(255,255,255,.2); }
.td-hero-btn    { padding:12px 24px; background:#fff; color:#4f46e5; border:none; border-radius:14px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .2s; box-shadow:0 4px 16px rgba(0,0,0,.15); white-space:nowrap; }
.td-hero-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.2); }

/* Stats */
.td-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
.td-stat-card {
  background: var(--td-card);
  border-radius:18px; padding:20px;
  border:1px solid var(--td-border);
  box-shadow: var(--td-shadow);
  transition:all .25s; cursor:default;
  position:relative; overflow:hidden;
  animation:cardUp .5s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cardUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
.td-stat-card:nth-child(1){animation-delay:.07s} .td-stat-card:nth-child(2){animation-delay:.14s}
.td-stat-card:nth-child(3){animation-delay:.21s} .td-stat-card:nth-child(4){animation-delay:.28s}
.td-stat-card::after { content:''; position:absolute; top:-20px; right:-20px; width:80px; height:80px; border-radius:50%; opacity:.08; transition:transform .3s; }
.td-stat-card:hover { transform:translateY(-4px); box-shadow: var(--td-shadow2); }
.td-stat-card:hover::after { transform:scale(1.4); }
.td-stat-card.sky  { border-top:3px solid #0ea5e9; } .td-stat-card.sky::after  { background:#0ea5e9; }
.td-stat-card.vio  { border-top:3px solid #6366f1; } .td-stat-card.vio::after  { background:#6366f1; }
.td-stat-card.rose { border-top:3px solid #f43f5e; } .td-stat-card.rose::after { background:#f43f5e; }
.td-stat-card.lime { border-top:3px solid #84cc16; } .td-stat-card.lime::after { background:#84cc16; }
.td-stat-top  { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.td-stat-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
.td-stat-icon svg { width:20px; height:20px; }
.tsi-sky  { background:rgba(14,165,233,.12); color:#0ea5e9; }
.tsi-vio  { background:rgba(99,102,241,.12); color:#6366f1; }
.tsi-rose { background:rgba(244,63,94,.12);  color:#f43f5e; }
.tsi-lime { background:rgba(132,204,22,.12); color:#84cc16; }
[data-theme="dark"] .tsi-sky  { background:rgba(14,165,233,.2); }
[data-theme="dark"] .tsi-vio  { background:rgba(99,102,241,.2); }
[data-theme="dark"] .tsi-rose { background:rgba(244,63,94,.2);  }
[data-theme="dark"] .tsi-lime { background:rgba(132,204,22,.2); }
.td-stat-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; color: var(--td-badge-text); background: var(--td-badge-bg); }
.td-stat-num   { font-size:32px; font-weight:800; color: var(--td-text); letter-spacing:-1px; line-height:1; margin-bottom:4px; }
.td-stat-label { font-size:13px; color: var(--td-text2); font-weight:500; }
.td-stat-trend { font-size:11.5px; color:#10b981; margin-top:4px; font-weight:600; }
[data-theme="dark"] .td-stat-trend { color:#34d399; }

/* Alerts */
.td-alerts-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:28px; }
.td-alert-card { border-radius:16px; padding:18px; position:relative; overflow:hidden; animation:cardUp .5s .35s both; }
.td-alert-card::before { content:''; position:absolute; top:-20px; right:-20px; width:70px; height:70px; border-radius:50%; opacity:.15; }
.td-alert-card.orange { background:linear-gradient(135deg,#fff7ed,#fef3c7); border:1px solid #fde68a; }
.td-alert-card.orange::before { background:#f59e0b; }
.td-alert-card.blue   { background:linear-gradient(135deg,#eff6ff,#e0f2fe); border:1px solid #bae6fd; }
.td-alert-card.blue::before   { background:#3b82f6; }
.td-alert-card.green  { background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1px solid #bbf7d0; }
.td-alert-card.green::before  { background:#10b981; }
[data-theme="dark"] .td-alert-card.orange { background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(234,179,8,.07)); border-color:rgba(245,158,11,.28); }
[data-theme="dark"] .td-alert-card.blue   { background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(14,165,233,.07)); border-color:rgba(59,130,246,.28); }
[data-theme="dark"] .td-alert-card.green  { background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(52,211,153,.07)); border-color:rgba(16,185,129,.28); }
.td-alert-emoji { font-size:26px; margin-bottom:8px; }
.td-alert-title { font-size:13.5px; font-weight:700; color: var(--td-text); margin-bottom:3px; }
.td-alert-sub   { font-size:12px; color: var(--td-text2); }
.td-alert-num   { font-size:26px; font-weight:800; color: var(--td-text); margin-top:6px; }

/* Main grid */
.td-grid { display:grid; grid-template-columns:1fr 1fr 340px; gap:20px; margin-bottom:28px; }
.td-card {
  background: var(--td-card);
  border-radius:20px; padding:22px;
  border:1px solid var(--td-border);
  box-shadow: var(--td-shadow);
  animation:cardUp .5s .4s both;
  transition: background .3s ease, border-color .3s ease;
}
.td-card-hd    { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
.td-card-title { font-size:15px; font-weight:700; color: var(--td-text); }
.td-view-all   { font-size:12.5px; font-weight:600; color:#6366f1; border:none; background:none; cursor:pointer; font-family:inherit; padding:5px 12px; border-radius:8px; transition:background .15s; }
.td-view-all:hover { background:rgba(99,102,241,.08); }
[data-theme="dark"] .td-view-all { color:#a5b4fc; }

/* Quick actions */
.td-qa {
  display:flex; align-items:center; gap:12px; padding:13px 14px;
  border-radius:14px;
  border:1px solid var(--td-qa-border);
  background: var(--td-qa-bg);
  cursor:pointer; transition:all .2s; margin-bottom:8px;
  font-family:inherit; width:100%; text-align:left;
}
.td-qa:last-child { margin-bottom:0; }
.td-qa:hover { transform:translateX(4px); background: var(--td-btn-hover); border-color:rgba(99,102,241,.3); }
.td-qa-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:transform .2s; }
.td-qa-icon svg { width:17px; height:17px; }
.td-qa:hover .td-qa-icon { transform:scale(1.12); }
.tqa-purple { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 12px rgba(99,102,241,.4); }
.tqa-blue   { background:linear-gradient(135deg,#3b82f6,#0ea5e9); color:#fff; box-shadow:0 4px 12px rgba(59,130,246,.4); }
.tqa-green  { background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 4px 12px rgba(16,185,129,.4); }
.tqa-orange { background:linear-gradient(135deg,#f59e0b,#ef4444); color:#fff; box-shadow:0 4px 12px rgba(245,158,11,.4); }
.td-qa-text  { flex:1; }
.td-qa-label { font-size:13px; font-weight:700; color: var(--td-text); }
.td-qa-desc  { font-size:11.5px; color: var(--td-text3); margin-top:1px; }
.td-qa-arrow { color: var(--td-text3); font-size:18px; transition:color .2s; }
.td-qa:hover .td-qa-arrow { color:#6366f1; }
[data-theme="dark"] .td-qa:hover .td-qa-arrow { color:#a5b4fc; }

/* Classes */
.td-class { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:13px; border:1px solid var(--td-qa-border); margin-bottom:10px; background: var(--td-class-bg); transition:all .2s; cursor:pointer; }
.td-class:last-child { margin-bottom:0; }
.td-class:hover { background: var(--td-btn-hover); border-color:rgba(99,102,241,.3); }
.td-class-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.td-class-icon svg { width:18px; height:18px; }
.tci-blue   { background:linear-gradient(135deg,#e0e7ff,#c7d2fe); color:#4338ca; }
.tci-green  { background:linear-gradient(135deg,#d1fae5,#a7f3d0); color:#059669; }
.tci-purple { background:linear-gradient(135deg,#ede9fe,#ddd6fe); color:#7c3aed; }
[data-theme="dark"] .tci-blue   { background:rgba(99,102,241,.2);  color:#a5b4fc; }
[data-theme="dark"] .tci-green  { background:rgba(16,185,129,.2);  color:#6ee7b7; }
[data-theme="dark"] .tci-purple { background:rgba(139,92,246,.2);  color:#c4b5fd; }
.td-class-info { flex:1; }
.td-class-name { font-size:13.5px; font-weight:700; color: var(--td-text); }
.td-class-meta { font-size:12px; color: var(--td-text3); margin-top:2px; }
.td-class-foot { display:flex; align-items:center; gap:8px; margin-top:6px; }
.td-class-pct  { font-size:11.5px; font-weight:700; padding:2px 8px; border-radius:20px; }
.tcp-hi  { background:#d1fae5; color:#065f46; }
.tcp-mid { background:#fef3c7; color:#92400e; }
.tcp-lo  { background:#dbeafe; color:#1e40af; }
[data-theme="dark"] .tcp-hi  { background:rgba(16,185,129,.18); color:#6ee7b7; }
[data-theme="dark"] .tcp-mid { background:rgba(245,158,11,.18); color:#fcd34d; }
[data-theme="dark"] .tcp-lo  { background:rgba(59,130,246,.18); color:#93c5fd; }
.td-class-ago  { font-size:11px; color: var(--td-text3); }
.td-manage { padding:7px 13px; border-radius:9px; border:1px solid var(--td-sel-border); background: var(--td-btn-bg); font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; color: var(--td-btn-text); transition:all .18s; flex-shrink:0; }
.td-manage:hover { background: var(--td-btn-hover); border-color:rgba(99,102,241,.35); color: var(--td-btn-htext); }

/* Snapshot bars */
.td-snap-bar-bg { height:7px; background: var(--td-bar-bg); border-radius:6px; overflow:hidden; }
.td-snap-bar-fill { height:100%; width:0%; background:linear-gradient(90deg,#6366f1,#8b5cf6); border-radius:6px; transition:width .8s; }
.td-snap-label { font-size:12.5px; color: var(--td-text2); font-weight:500; }
.td-snap-val { font-size:12.5px; font-weight:700; color: var(--td-text); }

/* Performance charts */
.td-perf { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:28px; }
.td-perf-card {
  background: var(--td-card);
  border-radius:20px; padding:22px;
  border:1px solid var(--td-border);
  box-shadow: var(--td-shadow);
  animation:cardUp .5s .45s both;
  transition: background .3s ease, border-color .3s ease;
}
.td-chart { display:flex; align-items:flex-end; gap:8px; height:120px; margin-top:12px; }
.td-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; }
.td-bar { width:100%; border-radius:6px 6px 0 0; background:linear-gradient(180deg,#6366f1,#8b5cf6); animation:barRise .8s cubic-bezier(.4,0,.2,1) both; min-height:4px; }
@keyframes barRise { from{transform:scaleY(0);transform-origin:bottom} to{transform:scaleY(1)} }
.td-bar-lbl { font-size:10.5px; color: var(--td-text3); font-weight:600; }

.td-donut-wrap   { display:flex; align-items:center; gap:20px; margin-top:12px; }
.td-donut        { position:relative; flex-shrink:0; }
.td-donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.td-donut-num    { font-size:20px; font-weight:800; color: var(--td-text); line-height:1; }
.td-donut-lbl    { font-size:10px; color: var(--td-text3); }
.td-donut-legend { flex:1; }
.td-legend-item  { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.td-legend-dot   { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.td-legend-txt   { font-size:12px; color: var(--td-text2); }
.td-legend-val   { font-size:12px; font-weight:700; color: var(--td-text); margin-left:auto; }

/* Select */
.td-select {
  font-size:12px; padding:4px 10px; border-radius:8px;
  border:1px solid var(--td-sel-border);
  background: var(--td-sel-bg);
  color: var(--td-sel-text);
  font-family:inherit;
  cursor:pointer; transition: background .2s, color .2s;
}
.td-select:focus { outline:none; border-color:#6366f1; }

/* Students table */
.td-students {
  background: var(--td-card);
  border-radius:20px; padding:22px;
  border:1px solid var(--td-border);
  box-shadow: var(--td-shadow);
  animation:cardUp .5s .5s both;
  transition: background .3s ease, border-color .3s ease;
}
.td-table    { width:100%; border-collapse:collapse; margin-top:4px; }
.td-th       { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color: var(--td-text3); padding:10px 12px; text-align:left; border-bottom:1px solid var(--td-border2); }
.td-tr       { transition:background .15s; cursor:pointer; }
.td-tr:hover { background: var(--td-table-hover); }
.td-td       { padding:12px; font-size:13.5px; color: var(--td-text4); border-bottom:1px solid var(--td-border2); }
.td-td:last-child { border-bottom:0; }
.td-s-name   { font-weight:700; color: var(--td-text); }
.td-s-sub    { font-size:11.5px; color: var(--td-text3); margin-top:1px; }
.score-pill  { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; }
.sp-hi  { background:#d1fae5; color:#065f46; }
.sp-mid { background:#fef3c7; color:#92400e; }
.sp-lo  { background:#fee2e2; color:#991b1b; }
[data-theme="dark"] .sp-hi  { background:rgba(16,185,129,.18);  color:#6ee7b7; }
[data-theme="dark"] .sp-mid { background:rgba(245,158,11,.18);  color:#fcd34d; }
[data-theme="dark"] .sp-lo  { background:rgba(239,68,68,.18);   color:#fca5a5; }
.td-grade-bar  { display:flex; align-items:center; gap:8px; }
.td-grade-bg   { flex:1; height:6px; background: var(--td-bar-bg); border-radius:6px; overflow:hidden; }
.td-grade-fill { height:100%; border-radius:6px; background:linear-gradient(90deg,#6366f1,#8b5cf6); transition:width .8s; }

/* Responsive */
@media (max-width:1100px) {
  .td-grid { grid-template-columns:1fr 1fr; }
  .td-grid > :last-child { grid-column:span 2; }
  .td-stats { grid-template-columns:repeat(2,1fr); }
  .td-perf  { grid-template-columns:1fr; }
  .td-alerts-row { grid-template-columns:1fr 1fr; }
}
@media (max-width:700px) {
  .td-root { padding:16px; }
  .td-hero { padding:22px 20px; }
  .td-hero-inner { flex-direction:column; align-items:flex-start; gap:16px; }
  .td-hero-stats { width:100%; }
  .td-grid { grid-template-columns:1fr; }
  .td-grid > :last-child { grid-column:1; }
  .td-stats { grid-template-columns:1fr 1fr; gap:12px; }
  .td-perf  { grid-template-columns:1fr; }
  .td-alerts-row { grid-template-columns:1fr; }
}
`;

const Svg = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  users:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 110 8 4 4 0 010-8z",
  book:    "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z",
  clip:    "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 14l2 2 4-4M8 2h8a1 1 0 011 1v3a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1z",
  chart:   "M18 20V10M12 20V4M6 20v-6",
  file:    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  upload:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  calc:    "M4 2h16a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z",
  micro:   "M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z",
  atom:    "M2 12c0 5.523 4.477 10 10 10S22 17.523 22 12 17.523 2 12 2 2 6.477 2 12z",
  plus:    "M12 5v14M5 12h14",
} as const;

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState<number>(0);
  useEffect(() => {
    let current = 0;
    const step = () => {
      current += target / 60;
      if (current < target) { setVal(Math.floor(current)); requestAnimationFrame(step); }
      else setVal(target);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{val}{suffix}</>;
}

function Donut({ segments, size = 110, stroke = 16 }: { segments: DonutSegment[]; size?: number; stroke?: number }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e"];
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * circ;
        const gap  = circ - dash;
        const el = (
          <circle key={i} r={r} cx={size / 2} cy={size / 2}
            fill="none" stroke={colors[i % colors.length]}
            strokeWidth={stroke} strokeLinecap="butt"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-(offset / 100) * circ}/>
        );
        offset += seg.pct;
        return el;
      })}
    </svg>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery<TeacherStats>({ queryKey: ["/api/teacher/stats"] });

  const statCards: StatCard[] = [
    { label:"Total Students", value:stats?.totalStudents??85,      badge:"Active",  cardClass:"sky",  iconClass:"tsi-sky",  iconKey:"users", trend:"↑ 5 this week",  suffix:"" },
    { label:"Courses",        value:stats?.coursesCreated??3,       badge:"Created", cardClass:"vio",  iconClass:"tsi-vio",  iconKey:"book",  trend:"↑ 1 new",        suffix:"" },
    { label:"To Review",      value:stats?.pendingAssignments??12,  badge:"Pending", cardClass:"rose", iconClass:"tsi-rose", iconKey:"clip",  trend:"3 due today",    suffix:"" },
    { label:"Class Average",  value:stats?.classAverage??78,        badge:"Score",   cardClass:"lime", iconClass:"tsi-lime", iconKey:"chart", trend:"↑ 4% this month",suffix:"%" },
  ];

  const quickActions: QuickAction[] = [
    { label:"AI Content Manager", desc:"Create with advanced NLP",   iconKey:"file",   colorClass:"tqa-purple", href:"/enhanced-content-manager" },
    { label:"PDF Processing",     desc:"Upload & analyse documents", iconKey:"upload", colorClass:"tqa-blue",   href:"/enhanced-content-manager" },
    { label:"Create Assignment",  desc:"Design homework & exams",    iconKey:"clip",   colorClass:"tqa-green",  href:"/teacher/homework" },
    { label:"View Analytics",     desc:"Track student performance",  iconKey:"chart",  colorClass:"tqa-orange", href:"/analytics" },
  ];

  const classes: ClassItem[] = [
    { name:"Advanced Mathematics", grade:"Grade 12", students:32, pct:94, iconKey:"calc",  iconClass:"tci-blue",   ago:"2h ago" },
    { name:"Physics Fundamentals", grade:"Grade 11", students:28, pct:76, iconKey:"micro", iconClass:"tci-green",  ago:"5h ago" },
    { name:"Chemistry Basics",     grade:"Grade 10", students:25, pct:88, iconKey:"atom",  iconClass:"tci-purple", ago:"1d ago" },
  ];

  const alerts: AlertCard[] = [
    { emoji:"⚠️", title:"Assignments Due", sub:"5 not yet reviewed", num:5,  colorClass:"orange" },
    { emoji:"📬", title:"New Messages",    sub:"From students",       num:3,  colorClass:"blue"   },
    { emoji:"✅", title:"Submitted Today", sub:"Completed work",      num:18, colorClass:"green"  },
  ];

  const perfData  = [62, 75, 68, 82, 78, 91, 84];
  const perfDays  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const donutData: DonutSegment[] = [{ label:"Math",pct:35 },{ label:"Science",pct:28 },{ label:"History",pct:22 },{ label:"Other",pct:15 }];
  const donutColors = ["#6366f1","#10b981","#f59e0b","#f43f5e"];

  const topStudents: StudentRow[] = [
    { name:"Sarah Chen",  subject:"Mathematics", score:98, grade:98 },
    { name:"James Kim",   subject:"Physics",     score:92, grade:92 },
    { name:"Priya Patel", subject:"Chemistry",   score:87, grade:87 },
    { name:"Tom Rivera",  subject:"Mathematics", score:73, grade:73 },
    { name:"Amy Liu",     subject:"Biology",     score:61, grade:61 },
  ];

  const snapshot: SnapshotRow[] = [
    { label:"Lessons submitted", val:"18/24", pct:75 },
    { label:"Active students",   val:"67/85", pct:79 },
    { label:"Quiz pass rate",    val:"82%",   pct:82 },
  ];

  const liveClasses: typeof classes = [];
  const liveAlerts = [
    { emoji:"📚", title:"Courses Created", sub:"Live from MongoDB", num:stats?.coursesCreated ?? 0, colorClass:"blue" },
    { emoji:"⏳", title:"Pending Uploads", sub:"Processing queue", num:stats?.pendingAssignments ?? 0, colorClass:"orange" },
    { emoji:"✅", title:"Active Sessions", sub:"Debate & seminar", num:(stats as any)?.activeSessions ?? 0, colorClass:"green" },
  ];
  const liveSnapshot = [
    { label:"Students", val:String(stats?.totalStudents ?? 0), pct:Math.min(stats?.totalStudents ?? 0, 100) },
    { label:"Courses", val:String(stats?.coursesCreated ?? 0), pct:Math.min((stats?.coursesCreated ?? 0) * 10, 100) },
    { label:"Pending", val:String(stats?.pendingAssignments ?? 0), pct:Math.min((stats?.pendingAssignments ?? 0) * 10, 100) },
  ];
  const liveTopStudents: typeof topStudents = [];

  const pctClass  = (pct:number) => pct > 90 ? "tcp-hi" : pct > 75 ? "tcp-mid" : "tcp-lo";
  const scoreClass = (s:number) => s >= 90 ? "sp-hi" : s >= 75 ? "sp-mid" : "sp-lo";

  return (
    <>
      <style>{css}</style>
      <div className="td-root">

        {/* Hero */}
        <div className="td-hero">
          <span className="td-float" style={{width:40,height:40,top:"20%",left:"60%",animationDelay:"0s"}}/>
          <span className="td-float" style={{width:25,height:25,top:"60%",left:"80%",animationDelay:"1s"}}/>
          <span className="td-float" style={{width:60,height:60,top:"10%",left:"45%",animationDelay:"2s"}}/>
          <div className="td-hero-inner">
            <div>
              <div className="td-hero-title">Welcome, Prof. {user?.lastName ?? "Johnson"}! 👩‍🏫</div>
              <div className="td-hero-sub">Manage your classes, create content, and track student progress.</div>
            </div>
            <div className="td-hero-stats">
              <div className="td-hero-stat"><div className="td-hero-sn">{stats?.totalStudents ?? 0}</div><div className="td-hero-sl">Students</div></div>
              <div className="td-hero-div"/>
              <div className="td-hero-stat"><div className="td-hero-sn">{stats?.coursesCreated ?? 0}</div><div className="td-hero-sl">Courses</div></div>
              <div className="td-hero-div"/>
              <Link href="/enhanced-content-manager"><button className="td-hero-btn">+ New Course</button></Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="td-stats">
          {statCards.map((s,i)=>(
            <div key={i} className={`td-stat-card ${s.cardClass}`}>
              <div className="td-stat-top">
                <div className={`td-stat-icon ${s.iconClass}`}><Svg d={ICONS[s.iconKey]} size={20}/></div>
                <span className="td-stat-badge">{s.badge}</span>
              </div>
              <div className="td-stat-num">{isLoading ? "—" : <AnimatedNumber target={s.value} suffix={s.suffix}/>}</div>
              <div className="td-stat-label">{s.label}</div>
              <div className="td-stat-trend">{s.trend}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="td-alerts-row">
          {liveAlerts.map((a,i)=>(
            <div key={i} className={`td-alert-card ${a.colorClass}`}>
              <div className="td-alert-emoji">{a.emoji}</div>
              <div className="td-alert-title">{a.title}</div>
              <div className="td-alert-sub">{a.sub}</div>
              <div className="td-alert-num">{a.num}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="td-grid">
          {/* Classes */}
          <div className="td-card">
            <div className="td-card-hd">
              <div className="td-card-title">Recent Classes</div>
              <button className="td-view-all">View all →</button>
            </div>
            {liveClasses.length === 0 && <div className="td-card-sub">No data available</div>}
            {liveClasses.map((c,i)=>(
              <div key={i} className="td-class">
                <div className={`td-class-icon ${c.iconClass}`}><Svg d={ICONS[c.iconKey]} size={18}/></div>
                <div className="td-class-info">
                  <div className="td-class-name">{c.name}</div>
                  <div className="td-class-meta">{c.grade} · {c.students} students</div>
                  <div className="td-class-foot">
                    <span className={`td-class-pct ${pctClass(c.pct)}`}>{c.pct}%</span>
                    <span className="td-class-ago">{c.ago}</span>
                  </div>
                </div>
                <button className="td-manage">Manage</button>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="td-card">
            <div className="td-card-hd"><div className="td-card-title">Quick Actions</div></div>
            {quickActions.map((a,i)=>(
              <Link key={i} href={a.href}>
                <button className="td-qa">
                  <div className={`td-qa-icon ${a.colorClass}`}><Svg d={ICONS[a.iconKey]} size={17}/></div>
                  <div className="td-qa-text">
                    <div className="td-qa-label">{a.label}</div>
                    <div className="td-qa-desc">{a.desc}</div>
                  </div>
                  <span className="td-qa-arrow">›</span>
                </button>
              </Link>
            ))}
          </div>

          {/* Snapshot */}
          <div className="td-card">
            <div className="td-card-hd"><div className="td-card-title">Today's Snapshot</div></div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {liveSnapshot.map((row,i)=>(
                <div key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span className="td-snap-label">{row.label}</span>
                    <span className="td-snap-val">{row.val}</span>
                  </div>
                  <div className="td-snap-bar-bg">
                    <div className="td-snap-bar-fill" style={{width:`${row.pct}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance charts */}
        <div className="td-perf">
          <div className="td-perf-card">
            <div className="td-card-hd">
              <div className="td-card-title">Weekly Performance</div>
              <select className="td-select">
                <option>7 days</option><option>30 days</option>
              </select>
            </div>
            <div className="td-chart">
              {perfData.map((v,i)=>(
                <div key={i} className="td-bar-col">
                  <div className="td-bar" style={{height:`${v}%`,animationDelay:`${0.1+i*0.08}s`}}/>
                  <div className="td-bar-lbl">{perfDays[i]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="td-perf-card">
            <div className="td-card-hd"><div className="td-card-title">Subject Distribution</div></div>
            <div className="td-donut-wrap">
              <div className="td-donut">
                <Donut segments={donutData} size={110} stroke={16}/>
                <div className="td-donut-center">
                  <div className="td-donut-num">85</div>
                  <div className="td-donut-lbl">students</div>
                </div>
              </div>
              <div className="td-donut-legend">
                {donutData.map((d,i)=>(
                  <div key={i} className="td-legend-item">
                    <div className="td-legend-dot" style={{background:donutColors[i]}}/>
                    <div className="td-legend-txt">{d.label}</div>
                    <div className="td-legend-val">{d.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top students */}
        <div className="td-students">
          <div className="td-card-hd">
            <div className="td-card-title">Top Students 🌟</div>
            <button className="td-view-all">View all →</button>
          </div>
          <table className="td-table">
            <thead>
              <tr>
                <th className="td-th">Student</th>
                <th className="td-th">Subject</th>
                <th className="td-th">Score</th>
                <th className="td-th">Progress</th>
              </tr>
            </thead>
            <tbody>
              {liveTopStudents.length === 0 && (
                <tr className="td-tr"><td className="td-td" colSpan={4}>No data available</td></tr>
              )}
              {liveTopStudents.map((s,i)=>(
                <tr key={i} className="td-tr">
                  <td className="td-td"><div className="td-s-name">{s.name}</div></td>
                  <td className="td-td"><div className="td-s-sub">{s.subject}</div></td>
                  <td className="td-td"><span className={`score-pill ${scoreClass(s.score)}`}>{s.score}%</span></td>
                  <td className="td-td">
                    <div className="td-grade-bar">
                      <div className="td-grade-bg"><div className="td-grade-fill" style={{width:`${s.grade}%`}}/></div>
                      <span style={{fontSize:11.5,fontWeight:700,color:"var(--td-text4)",minWidth:32}}>{s.grade}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
