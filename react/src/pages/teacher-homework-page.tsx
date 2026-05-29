import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { cn } from "../lib/utils";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";
import { useNotificationStore } from "../lib/notification-store";
import { formatDistanceToNow } from "date-fns";

/* ─────────────────────────── CSS (mirrors teacher-dashboard token system) ─── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── Variables — Light ── */
:root {
  --hw-bg:          #f8fafc;
  --hw-card:        #ffffff;
  --hw-card2:       #fafafa;
  --hw-border:      rgba(0,0,0,.06);
  --hw-border2:     #f3f4f6;
  --hw-shadow:      0 2px 12px rgba(0,0,0,.05);
  --hw-shadow2:     0 12px 32px rgba(0,0,0,.10);
  --hw-text:        #0f172a;
  --hw-text2:       #64748b;
  --hw-text3:       #94a3b8;
  --hw-text4:       #374151;
  --hw-bar-bg:      #f1f5f9;
  --hw-qa-bg:       #fafafa;
  --hw-qa-border:   #f3f4f6;
  --hw-table-hover: #f8fafc;
  --hw-btn-bg:      #ffffff;
  --hw-btn-text:    #374151;
  --hw-btn-hover:   #f5f3ff;
  --hw-btn-htext:   #6366f1;
  --hw-badge-bg:    #f9fafb;
  --hw-badge-text:  #9ca3af;
  --hw-sel-bg:      #ffffff;
  --hw-sel-text:    #374151;
  --hw-sel-border:  #e5e7eb;
  --hw-input-bg:    #ffffff;
  --hw-input-border:#e5e7eb;
  --hw-overlay:     rgba(255,255,255,.95);
}

/* ── Variables — Dark ── */
[data-theme="dark"] {
  --hw-bg:          #0b1120;
  --hw-card:        #141f35;
  --hw-card2:       #1a2540;
  --hw-border:      rgba(255,255,255,.07);
  --hw-border2:     rgba(255,255,255,.06);
  --hw-shadow:      0 2px 12px rgba(0,0,0,.3);
  --hw-shadow2:     0 12px 32px rgba(0,0,0,.5);
  --hw-text:        #f1f5f9;
  --hw-text2:       #94a3b8;
  --hw-text3:       #64748b;
  --hw-text4:       #cbd5e1;
  --hw-bar-bg:      rgba(255,255,255,.07);
  --hw-qa-bg:       rgba(255,255,255,.03);
  --hw-qa-border:   rgba(255,255,255,.06);
  --hw-table-hover: rgba(255,255,255,.03);
  --hw-btn-bg:      rgba(255,255,255,.06);
  --hw-btn-text:    #94a3b8;
  --hw-btn-hover:   rgba(99,102,241,.18);
  --hw-btn-htext:   #a5b4fc;
  --hw-badge-bg:    rgba(255,255,255,.08);
  --hw-badge-text:  #64748b;
  --hw-sel-bg:      #1a2540;
  --hw-sel-text:    #94a3b8;
  --hw-sel-border:  rgba(255,255,255,.12);
  --hw-input-bg:    #1a2540;
  --hw-input-border:rgba(255,255,255,.12);
  --hw-overlay:     rgba(20,31,53,.97);
}

/* ── Root ── */
.hw-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  padding: 24px 28px;
  max-width: 1280px;
  margin: 0 auto;
  color: var(--hw-text);
  transition: color .3s ease;
  min-height: 100vh;
  background: var(--hw-bg);
}

/* ── Hero (same as td-hero) ── */
.hw-hero {
  border-radius: 24px; padding: 32px 36px; margin-bottom: 28px;
  position: relative; overflow: hidden; color: #fff;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 55%, #8b5cf6 100%);
  animation: heroIn .6s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes heroIn { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:none} }
.hw-hero::before { content:''; position:absolute; top:-50px; right:-50px; width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,.1); }
.hw-hero::after  { content:''; position:absolute; bottom:-60px; left:20%; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,.07); }
.hw-float { position:absolute; border-radius:50%; background:rgba(255,255,255,.06); animation:float 6s ease-in-out infinite; }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
.hw-hero-inner  { display:flex; align-items:center; justify-content:space-between; position:relative; z-index:1; flex-wrap:wrap; gap:16px; }
.hw-hero-title  { font-size: clamp(18px,3vw,26px); font-weight:800; margin-bottom:6px; }
.hw-hero-sub    { font-size:14px; opacity:.75; }
.hw-hero-stats  { display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
.hw-hero-stat   { text-align:center; }
.hw-hero-sn     { font-size:30px; font-weight:800; line-height:1; }
.hw-hero-sl     { font-size:12px; opacity:.65; margin-top:2px; }
.hw-hero-div    { width:1px; height:44px; background:rgba(255,255,255,.2); }
.hw-hero-btn    { padding:12px 24px; background:#fff; color:#4f46e5; border:none; border-radius:14px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .2s; box-shadow:0 4px 16px rgba(0,0,0,.15); white-space:nowrap; }
.hw-hero-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.2); }

/* ── Stats Grid (same pattern as td-stats) ── */
.hw-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
.hw-stat-card {
  background: var(--hw-card);
  border-radius:18px; padding:20px;
  border:1px solid var(--hw-border);
  box-shadow: var(--hw-shadow);
  transition:all .25s; cursor:default;
  position:relative; overflow:hidden;
  animation:cardUp .5s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cardUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
.hw-stat-card:nth-child(1){animation-delay:.07s} .hw-stat-card:nth-child(2){animation-delay:.14s}
.hw-stat-card:nth-child(3){animation-delay:.21s} .hw-stat-card:nth-child(4){animation-delay:.28s}
.hw-stat-card::after { content:''; position:absolute; top:-20px; right:-20px; width:80px; height:80px; border-radius:50%; opacity:.08; transition:transform .3s; }
.hw-stat-card:hover { transform:translateY(-4px); box-shadow: var(--hw-shadow2); }
.hw-stat-card:hover::after { transform:scale(1.4); }
.hw-stat-card.sky  { border-top:3px solid #0ea5e9; } .hw-stat-card.sky::after  { background:#0ea5e9; }
.hw-stat-card.vio  { border-top:3px solid #6366f1; } .hw-stat-card.vio::after  { background:#6366f1; }
.hw-stat-card.rose { border-top:3px solid #f43f5e; } .hw-stat-card.rose::after { background:#f43f5e; }
.hw-stat-card.lime { border-top:3px solid #84cc16; } .hw-stat-card.lime::after { background:#84cc16; }
.hw-stat-top   { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.hw-stat-icon  { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
.hw-stat-icon svg { width:20px; height:20px; }
.hsi-sky  { background:rgba(14,165,233,.12);  color:#0ea5e9; }
.hsi-vio  { background:rgba(99,102,241,.12);  color:#6366f1; }
.hsi-rose { background:rgba(244,63,94,.12);   color:#f43f5e; }
.hsi-lime { background:rgba(132,204,22,.12);  color:#84cc16; }
[data-theme="dark"] .hsi-sky  { background:rgba(14,165,233,.2); }
[data-theme="dark"] .hsi-vio  { background:rgba(99,102,241,.2); }
[data-theme="dark"] .hsi-rose { background:rgba(244,63,94,.2);  }
[data-theme="dark"] .hsi-lime { background:rgba(132,204,22,.2); }
.hw-stat-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; color: var(--hw-badge-text); background: var(--hw-badge-bg); }
.hw-stat-num   { font-size:32px; font-weight:800; color: var(--hw-text); letter-spacing:-1px; line-height:1; margin-bottom:4px; }
.hw-stat-label { font-size:13px; color: var(--hw-text2); font-weight:500; }
.hw-stat-trend { font-size:11.5px; color:#10b981; margin-top:4px; font-weight:600; }
[data-theme="dark"] .hw-stat-trend { color:#34d399; }

/* ── Alerts Row (same as td-alerts-row) ── */
.hw-alerts-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:28px; }
.hw-alert-card { border-radius:16px; padding:18px; position:relative; overflow:hidden; animation:cardUp .5s .35s both; }
.hw-alert-card::before { content:''; position:absolute; top:-20px; right:-20px; width:70px; height:70px; border-radius:50%; opacity:.15; }
.hw-alert-card.orange { background:linear-gradient(135deg,#fff7ed,#fef3c7); border:1px solid #fde68a; }
.hw-alert-card.orange::before { background:#f59e0b; }
.hw-alert-card.blue   { background:linear-gradient(135deg,#eff6ff,#e0f2fe); border:1px solid #bae6fd; }
.hw-alert-card.blue::before   { background:#3b82f6; }
.hw-alert-card.rose   { background:linear-gradient(135deg,#fff1f2,#ffe4e6); border:1px solid #fecdd3; }
.hw-alert-card.rose::before   { background:#f43f5e; }
[data-theme="dark"] .hw-alert-card.orange { background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(234,179,8,.07)); border-color:rgba(245,158,11,.28); }
[data-theme="dark"] .hw-alert-card.blue   { background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(14,165,233,.07)); border-color:rgba(59,130,246,.28); }
[data-theme="dark"] .hw-alert-card.rose   { background:linear-gradient(135deg,rgba(244,63,94,.12),rgba(251,113,133,.07)); border-color:rgba(244,63,94,.28); }
.hw-alert-emoji { font-size:26px; margin-bottom:8px; }
.hw-alert-title { font-size:13.5px; font-weight:700; color: var(--hw-text); margin-bottom:3px; }
.hw-alert-sub   { font-size:12px; color: var(--hw-text2); }
.hw-alert-num   { font-size:26px; font-weight:800; color: var(--hw-text); margin-top:6px; }

/* ── Tab Navigation ── */
.hw-tabs { display:flex; gap:4px; background: var(--hw-card); border-radius:16px; padding:6px; margin-bottom:24px; border:1px solid var(--hw-border); box-shadow: var(--hw-shadow); overflow-x:auto; }
.hw-tab  { flex:1; min-width:120px; padding:10px 16px; border:none; border-radius:12px; font-size:13.5px; font-weight:600; cursor:pointer; font-family:inherit; color: var(--hw-text3); background:transparent; transition:all .2s; white-space:nowrap; }
.hw-tab:hover { background: var(--hw-qa-bg); color: var(--hw-text2); }
.hw-tab.active { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 14px rgba(99,102,241,.4); }

/* ── Card base ── */
.hw-card {
  background: var(--hw-card);
  border-radius:20px; padding:22px;
  border:1px solid var(--hw-border);
  box-shadow: var(--hw-shadow);
  animation:cardUp .5s .4s both;
  transition: background .3s ease, border-color .3s ease;
}
.hw-card-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:10px; }
.hw-card-title { font-size:15px; font-weight:700; color: var(--hw-text); }
.hw-view-all   { font-size:12.5px; font-weight:600; color:#6366f1; border:none; background:none; cursor:pointer; font-family:inherit; padding:5px 12px; border-radius:8px; transition:background .15s; }
.hw-view-all:hover { background:rgba(99,102,241,.08); }
[data-theme="dark"] .hw-view-all { color:#a5b4fc; }

/* ── Assignment List ── */
.hw-assign-list { display:flex; flex-direction:column; gap:16px; }
.hw-assign-card {
  background: var(--hw-card);
  border-radius:18px;
  border:1px solid var(--hw-border);
  box-shadow: var(--hw-shadow);
  overflow:hidden;
  transition:all .25s;
  animation:cardUp .5s both;
}
.hw-assign-card:hover { transform:translateY(-3px); box-shadow: var(--hw-shadow2); }
.hw-assign-head { padding:18px 20px 0; }
.hw-assign-body { padding:0 20px 18px; }
.hw-assign-title { font-size:16px; font-weight:700; color: var(--hw-text); margin-bottom:8px; }
.hw-assign-meta  { display:flex; flex-wrap:wrap; gap:12px; font-size:12.5px; color: var(--hw-text2); margin-bottom:12px; }
.hw-assign-meta-item { display:flex; align-items:center; gap:4px; }
.hw-assign-meta-item svg { width:14px; height:14px; }
.hw-assign-desc  { font-size:13px; color: var(--hw-text4); margin-bottom:14px; line-height:1.6; }
.hw-assign-foot  { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

/* ── Progress bar inside assignment card ── */
.hw-prog-wrap { padding:0 20px 16px; }
.hw-prog-label { display:flex; justify-content:space-between; font-size:11.5px; color: var(--hw-text3); margin-bottom:5px; }
.hw-prog-bg    { height:6px; background: var(--hw-bar-bg); border-radius:6px; overflow:hidden; }
.hw-prog-fill  { height:100%; border-radius:6px; background:linear-gradient(90deg,#6366f1,#8b5cf6); transition:width .8s; }

/* ── Badges ── */
.hw-badge        { display:inline-block; font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:20px; }
.hw-badge.active { background:linear-gradient(135deg,#10b981,#059669); color:#fff; }
.hw-badge.overdue{ background:linear-gradient(135deg,#f43f5e,#e11d48); color:#fff; }
.hw-badge.outline{ background: var(--hw-badge-bg); color: var(--hw-text2); border:1px solid var(--hw-border2); }
.hw-badge.pending{ background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; }

/* ── Action Buttons ── */
.hw-btn {
  display:inline-flex; align-items:center; gap:6px; padding:8px 14px;
  border-radius:10px; font-size:12.5px; font-weight:600; cursor:pointer;
  font-family:inherit; transition:all .18s; border:none;
}
.hw-btn svg { width:14px; height:14px; }
.hw-btn-outline { background: var(--hw-btn-bg); color: var(--hw-btn-text); border:1px solid var(--hw-sel-border); }
.hw-btn-outline:hover { background: var(--hw-btn-hover); color: var(--hw-btn-htext); border-color:rgba(99,102,241,.35); }
.hw-btn-danger  { background:transparent; color:#f43f5e; border:1px solid rgba(244,63,94,.3); }
.hw-btn-danger:hover  { background:rgba(244,63,94,.08); border-color:#f43f5e; }
.hw-btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 14px rgba(99,102,241,.4); }
.hw-btn-primary:hover { transform:translateY(-1px); box-shadow:0 8px 20px rgba(99,102,241,.5); }
.hw-btn-green { background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 4px 12px rgba(16,185,129,.35); }
.hw-btn-green:hover { transform:translateY(-1px); box-shadow:0 8px 18px rgba(16,185,129,.4); }
.hw-btn-sm { padding:6px 11px; font-size:12px; }

/* ── Modal / Dialog ── */
.hw-modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000;
  display:flex; align-items:center; justify-content:center; padding:20px;
  animation:fadeIn .2s;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.hw-modal {
  background: var(--hw-overlay);
  border-radius:24px; padding:28px; width:100%; max-width:640px;
  max-height:90vh; overflow-y:auto;
  border:1px solid var(--hw-border);
  box-shadow:0 24px 64px rgba(0,0,0,.2);
  animation:modalIn .3s cubic-bezier(.34,1.56,.64,1);
}
@keyframes modalIn { from{opacity:0;transform:translateY(24px) scale(.96)} to{opacity:1;transform:none} }
.hw-modal-title { font-size:18px; font-weight:800; color: var(--hw-text); margin-bottom:20px; }

/* ── Form inputs ── */
.hw-label  { display:block; font-size:12.5px; font-weight:700; color: var(--hw-text2); margin-bottom:6px; text-transform:uppercase; letter-spacing:.04em; }
.hw-input, .hw-textarea, .hw-select {
  width:100%; padding:10px 14px;
  border-radius:12px;
  border:1px solid var(--hw-input-border);
  background: var(--hw-input-bg);
  color: var(--hw-text);
  font-family:inherit; font-size:13.5px;
  transition:all .18s;
  outline:none; box-sizing:border-box;
}
.hw-input:focus, .hw-textarea:focus, .hw-select:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.hw-textarea { min-height:90px; resize:vertical; }
.hw-select   { cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:36px; }
.hw-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.hw-form-row  { margin-bottom:14px; }

/* ── Submissions ── */
.hw-sub-card {
  background: var(--hw-card);
  border-radius:18px; padding:20px;
  border:1px solid var(--hw-border);
  box-shadow: var(--hw-shadow);
  margin-bottom:14px;
  animation:cardUp .4s both;
}
.hw-sub-head  { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:10px; }
.hw-sub-name  { font-size:15px; font-weight:700; color: var(--hw-text); }
.hw-sub-email { font-size:12px; color: var(--hw-text3); margin-top:2px; }
.hw-sub-time  { font-size:12px; color: var(--hw-text3); margin-top:2px; }
.hw-response  { background: var(--hw-qa-bg); border-radius:12px; padding:14px; font-size:13px; color: var(--hw-text4); line-height:1.65; border:1px solid var(--hw-qa-border); white-space:pre-wrap; }
.hw-feedback-box { background:linear-gradient(135deg,rgba(99,102,241,.06),rgba(139,92,246,.04)); border-left:4px solid #6366f1; border-radius:0 12px 12px 0; padding:14px; margin-top:12px; }
.hw-feedback-title { font-size:12.5px; font-weight:700; color:#6366f1; margin-bottom:6px; }
[data-theme="dark"] .hw-feedback-title { color:#a5b4fc; }
.hw-grade-section { margin-top:14px; padding-top:14px; border-top:1px solid var(--hw-border2); }
.hw-grade-title { font-size:13px; font-weight:700; color: var(--hw-text); margin-bottom:12px; }

/* ── Analytics ── */
.hw-analytics-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.hw-chart { display:flex; align-items:flex-end; gap:8px; height:130px; margin-top:12px; }
.hw-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:5px; }
.hw-bar { width:100%; border-radius:6px 6px 0 0; background:linear-gradient(180deg,#6366f1,#8b5cf6); animation:barRise .8s cubic-bezier(.4,0,.2,1) both; min-height:4px; }
@keyframes barRise { from{transform:scaleY(0);transform-origin:bottom} to{transform:scaleY(1)} }
.hw-bar-lbl { font-size:10.5px; color: var(--hw-text3); font-weight:600; }
.hw-bar-val { font-size:10px; color: var(--hw-text3); }

/* ── Donut ── */
.hw-donut-wrap   { display:flex; align-items:center; gap:20px; margin-top:12px; }
.hw-donut        { position:relative; flex-shrink:0; }
.hw-donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.hw-donut-num    { font-size:20px; font-weight:800; color: var(--hw-text); line-height:1; }
.hw-donut-lbl    { font-size:10px; color: var(--hw-text3); }
.hw-donut-legend { flex:1; }
.hw-legend-item  { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.hw-legend-dot   { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.hw-legend-txt   { font-size:12px; color: var(--hw-text2); flex:1; }
.hw-legend-val   { font-size:12px; font-weight:700; color: var(--hw-text); }

/* ── Assignment Performance Table ── */
.hw-table    { width:100%; border-collapse:collapse; margin-top:4px; }
.hw-th       { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color: var(--hw-text3); padding:10px 12px; text-align:left; border-bottom:1px solid var(--hw-border2); }
.hw-tr       { transition:background .15s; cursor:pointer; }
.hw-tr:hover { background: var(--hw-table-hover); }
.hw-td       { padding:12px; font-size:13px; color: var(--hw-text4); border-bottom:1px solid var(--hw-border2); }
.hw-td.hw-td-last { border-bottom:0; }

/* ── Progress mini ── */
.hw-mini-prog-bg   { height:6px; background: var(--hw-bar-bg); border-radius:6px; overflow:hidden; flex:1; }
.hw-mini-prog-fill { height:100%; border-radius:6px; background:linear-gradient(90deg,#6366f1,#8b5cf6); }

/* ── Empty state ── */
.hw-empty { padding:60px 20px; text-align:center; }
.hw-empty-icon { width:64px; height:64px; background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.08)); border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
.hw-empty-icon svg { width:28px; height:28px; color:#6366f1; }
.hw-empty-title { font-size:16px; font-weight:700; color: var(--hw-text); margin-bottom:6px; }
.hw-empty-sub   { font-size:13px; color: var(--hw-text3); margin-bottom:20px; }

/* ── Filter bar ── */
.hw-filter-bar { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; }
.hw-search { flex:1; min-width:200px; padding:10px 14px 10px 38px; border-radius:12px; border:1px solid var(--hw-input-border); background: var(--hw-input-bg); color: var(--hw-text); font-size:13.5px; font-family:inherit; outline:none; transition:all .18s; position:relative; }
.hw-search:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.hw-search-wrap { position:relative; flex:1; min-width:200px; }
.hw-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color: var(--hw-text3); pointer-events:none; }
.hw-search-icon svg { width:15px; height:15px; }
.hw-filter-sel { padding:10px 14px; border-radius:12px; border:1px solid var(--hw-input-border); background: var(--hw-input-bg); color: var(--hw-text); font-size:13px; font-family:inherit; cursor:pointer; outline:none; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; }
.hw-filter-sel:focus { border-color:#6366f1; }

/* ── Modal footer ── */
.hw-modal-footer { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; padding-top:16px; border-top:1px solid var(--hw-border2); }

/* ── Submission back bar ── */
.hw-back-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
.hw-back-info h3 { font-size:16px; font-weight:800; color: var(--hw-text); }
.hw-back-info p  { font-size:13px; color: var(--hw-text3); margin-top:2px; }

/* ── Score chip ── */
.sp-hi  { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; background:#d1fae5; color:#065f46; }
.sp-mid { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; background:#fef3c7; color:#92400e; }
.sp-lo  { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; background:#fee2e2; color:#991b1b; }
[data-theme="dark"] .sp-hi  { background:rgba(16,185,129,.18);  color:#6ee7b7; }
[data-theme="dark"] .sp-mid { background:rgba(245,158,11,.18);  color:#fcd34d; }
[data-theme="dark"] .sp-lo  { background:rgba(239,68,68,.18);   color:#fca5a5; }

/* ── Divider ── */
.hw-divider { border:none; border-top:1px solid var(--hw-border2); margin:16px 0; }

/* ── Responsive ── */
@media (max-width:1100px) {
  .hw-stats { grid-template-columns:repeat(2,1fr); }
  .hw-analytics-grid { grid-template-columns:1fr; }
  .hw-alerts-row { grid-template-columns:1fr 1fr; }
  .hw-form-grid { grid-template-columns:1fr; }
}
@media (max-width:700px) {
  .hw-root { padding:14px 12px; }
  .hw-hero { padding:20px 18px; }
  .hw-stats { grid-template-columns:1fr 1fr; gap:10px; }
  .hw-alerts-row { grid-template-columns:1fr; }
  .hw-tabs { gap:2px; }
  .hw-tab { padding:9px 10px; font-size:12px; min-width:90px; }
  .hw-form-grid { grid-template-columns:1fr; }
  .hw-modal { padding:18px; }
  .hw-assign-foot { gap:6px; }
}
@media (max-width:420px) {
  .hw-stats { grid-template-columns:1fr; }
  .hw-hero-stats { flex-wrap:wrap; gap:12px; }
}
`;

/* ─────────────────────────── SVG helper (same as dashboard) ─── */
const Svg = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  file:    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  clock:   "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4 2",
  send:    "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  chart:   "M18 20V10M12 20V4M6 20v-6",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  plus:    "M12 5v14M5 12h14",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  users:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 110 8 4 4 0 010-8z",
  book:    "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z",
  cap:     "M22 10v6M2 10l10-5 10 5-10 5-10-5zM6 12v5c3.33 1.67 8.67 1.67 12 0v-5",
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  clip:    "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 14l2 2 4-4M8 2h8a1 1 0 011 1v3a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1z",
  check:   "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
  x:       "M18 6L6 18M6 6l12 12",
  trend:   "M23 6l-9.5 9.5-5-5L1 18",
  filter:  "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
} as const;

/* ─────────────────────────── Animated number ─── */
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let c = 0;
    const step = () => {
      c += target / 60;
      if (c < target) { setVal(Math.floor(c)); requestAnimationFrame(step); }
      else setVal(target);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{val}{suffix}</>;
}

/* ─────────────────────────── Donut chart ─── */
function Donut({ segs, size = 110, stroke = 16 }: { segs: { label: string; pct: number }[]; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e"];
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      {segs.map((s, i) => {
        const dash = (s.pct / 100) * c;
        const el = (
          <circle key={i} r={r} cx={size / 2} cy={size / 2}
            fill="none" stroke={colors[i % colors.length]}
            strokeWidth={stroke} strokeLinecap="butt"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-(off / 100) * c} />
        );
        off += s.pct;
        return el;
      })}
    </svg>
  );
}

/* ─────────────────────────── Types ─── */
interface Course { id: number; title: string; enrollmentCount: number; }
interface Assignment {
  id: number; title: string; description: string; instructions: string;
  courseId: number; courseName: string; dueDate: string;
  maxScore: number; submissionType: 'text' | 'file' | 'both';
  createdAt: string; submissionCount: number; totalStudents: number;
}
interface Submission {
  id: number; studentName: string; studentEmail: string; content: string;
  submittedAt: string; score?: number; feedback?: string; gradedAt?: string;
}

/* ─────────────────────────── Loader ─── */
const Loader = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--hw-bg)" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.1))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Svg d={ICONS.cap} size={28} />
      </div>
      <p style={{ fontWeight: 700, color: "var(--hw-text2)", marginBottom: 8 }}>Loading homework data…</p>
      <div style={{ width: 32, height: 32, border: "3px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  </div>
);

/* ─────────────────────────── Main Component ─── */
export default function TeacherHomeworkPage() {
  const { user } = useAuth();
  const { addNotification } = useNotificationStore();

  const [tab, setTab] = useState<"overview" | "submissions" | "analytics">("overview");
  const [showModal, setShowModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [scoreInputs, setScoreInputs] = useState<Record<number, string>>({});
  const [feedbackInputs, setFeedbackInputs] = useState<Record<number, string>>({});

  const [form, setForm] = useState({
    title: "", description: "", instructions: "",
    courseId: "", dueDate: "", maxScore: 100,
    submissionType: "text" as "text" | "file" | "both",
  });

  const { data: courses = [] } = useQuery<Course[]>({ queryKey: ["/api/teacher/courses"] });
  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({ queryKey: ["/api/teacher/assignments"] });
  const { data: submissions = [] } = useQuery<Submission[]>({
    queryKey: ["/api/assignments", selectedAssignment?.id, "submissions"],
    enabled: !!selectedAssignment,
  });

  const createMutation = useMutation({
    mutationFn: async (d: typeof form) => {
      const res = await apiRequest("POST", "/api/assignments", d);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
      setShowModal(false);
      addNotification(`Assignment created: "${data.title}"`);
      setForm({ title: "", description: "", instructions: "", courseId: "", dueDate: "", maxScore: 100, submissionType: "text" });
    },
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ id, score, feedback }: { id: number; score: number; feedback: string }) => {
      const res = await apiRequest("PUT", `/api/submissions/${id}/grade`, { score, feedback });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments", selectedAssignment?.id, "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
    },
  });

  /* Stats */
  const total = assignments.length;
  const active = assignments.filter(a => new Date(a.dueDate) > new Date()).length;
  const totalSubs = assignments.reduce((s, a) => s + a.submissionCount, 0);
  const avgComp = total > 0
    ? assignments.reduce((s, a) => s + (a.submissionCount / Math.max(a.totalStudents, 1)), 0) / total * 100
    : 0;
  const pendingGrade = submissions.filter(s => !s.gradedAt).length;

  /* Filtered assignments */
  const filteredAssignments = assignments.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.courseName.toLowerCase().includes(search.toLowerCase());
    const isOverdue = new Date(a.dueDate) < new Date();
    const matchStatus = filterStatus === "all" || (filterStatus === "active" && !isOverdue) || (filterStatus === "overdue" && isOverdue);
    const matchCourse = filterCourse === "all" || a.courseId.toString() === filterCourse;
    return matchSearch && matchStatus && matchCourse;
  });

  /* Analytics data */
  const analyticsData = assignments.map(a => ({
    label: a.title.substring(0, 10) + (a.title.length > 10 ? "…" : ""),
    pct: Math.round((a.submissionCount / Math.max(a.totalStudents, 1)) * 100),
    subs: a.submissionCount,
    total: a.totalStudents,
    title: a.title,
  }));
  const donutSegs = courses.slice(0, 4).map((c, i) => ({
    label: c.title.substring(0, 12),
    pct: [35, 28, 22, 15][i] ?? 10,
  }));
  const donutColors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e"];

  if (isLoading) return <><style>{css}</style><Loader /></>;

  return (
    <>
      <style>{css}</style>
      <div className="hw-root">

        {/* ── Hero ── */}
        <div className="hw-hero">
          <span className="hw-float" style={{ width: 40, height: 40, top: "20%", left: "60%", animationDelay: "0s" }} />
          <span className="hw-float" style={{ width: 25, height: 25, top: "65%", left: "80%", animationDelay: "1s" }} />
          <span className="hw-float" style={{ width: 60, height: 60, top: "10%", left: "45%", animationDelay: "2s" }} />
          <div className="hw-hero-inner">
            <div>
              <div className="hw-hero-title">Homework Management 📝</div>
              <div className="hw-hero-sub">Create assignments, review submissions & track student progress</div>
            </div>
            <div className="hw-hero-stats">
              <div className="hw-hero-stat"><div className="hw-hero-sn">{total}</div><div className="hw-hero-sl">Assignments</div></div>
              <div className="hw-hero-div" />
              <div className="hw-hero-stat"><div className="hw-hero-sn">{active}</div><div className="hw-hero-sl">Active</div></div>
              <div className="hw-hero-div" />
              <button className="hw-hero-btn" onClick={() => setShowModal(true)}>+ New Assignment</button>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="hw-stats">
          {[
            { label: "Total Assignments", value: total, badge: "All", cls: "sky", icls: "hsi-sky", icon: "file", trend: `${active} active`, suffix: "" },
            { label: "Active Now", value: active, badge: "Open", cls: "vio", icls: "hsi-vio", icon: "clock", trend: `${total - active} closed`, suffix: "" },
            { label: "Submissions", value: totalSubs, badge: "Received", cls: "rose", icls: "hsi-rose", icon: "send", trend: `${pendingGrade} ungraded`, suffix: "" },
            { label: "Avg Completion", value: Math.round(avgComp), badge: "Rate", cls: "lime", icls: "hsi-lime", icon: "chart", trend: "across all classes", suffix: "%" },
          ].map((s, i) => (
            <div key={i} className={`hw-stat-card ${s.cls}`}>
              <div className="hw-stat-top">
                <div className={`hw-stat-icon ${s.icls}`}><Svg d={ICONS[s.icon as keyof typeof ICONS]} size={20} /></div>
                <span className="hw-stat-badge">{s.badge}</span>
              </div>
              <div className="hw-stat-num"><AnimatedNumber target={s.value} suffix={s.suffix} /></div>
              <div className="hw-stat-label">{s.label}</div>
              <div className="hw-stat-trend">↑ {s.trend}</div>
            </div>
          ))}
        </div>

        {/* ── Alert cards ── */}
        <div className="hw-alerts-row">
          {[
            { emoji: "⏰", title: "Due This Week", sub: "Assignments closing soon", num: assignments.filter(a => { const d = new Date(a.dueDate); const now = new Date(); return d > now && d < new Date(now.getTime() + 7 * 864e5); }).length, cls: "orange" },
            { emoji: "📬", title: "Pending Grading", sub: "Submissions awaiting review", num: pendingGrade, cls: "blue" },
            { emoji: "🏆", title: "Fully Submitted", sub: "100% completion rate", num: assignments.filter(a => a.submissionCount >= a.totalStudents).length, cls: "rose" },
          ].map((a, i) => (
            <div key={i} className={`hw-alert-card ${a.cls}`}>
              <div className="hw-alert-emoji">{a.emoji}</div>
              <div className="hw-alert-title">{a.title}</div>
              <div className="hw-alert-sub">{a.sub}</div>
              <div className="hw-alert-num">{a.num}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="hw-tabs">
          {(["overview", "submissions", "analytics"] as const).map(t => (
            <button key={t} className={`hw-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "overview" ? "📋 All Assignments" : t === "submissions" ? "📨 Review Submissions" : "📊 Analytics"}
            </button>
          ))}
        </div>

        {/* ════════════════ OVERVIEW TAB ════════════════ */}
        {tab === "overview" && (
          <div>
            {/* Filter bar */}
            <div className="hw-filter-bar">
              <div className="hw-search-wrap">
                <span className="hw-search-icon"><Svg d={ICONS.search} size={15} /></span>
                <input className="hw-search" placeholder="Search assignments or courses…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="hw-filter-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="overdue">Overdue</option>
              </select>
              <select className="hw-filter-sel" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                <option value="all">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id.toString()}>{c.title}</option>)}
              </select>
              <button className="hw-btn hw-btn-primary" onClick={() => setShowModal(true)}>
                <Svg d={ICONS.plus} size={14} /> Create Assignment
              </button>
            </div>

            {/* Assignment list */}
            {filteredAssignments.length === 0 ? (
              <div className="hw-card">
                <div className="hw-empty">
                  <div className="hw-empty-icon"><Svg d={ICONS.cap} size={28} /></div>
                  <div className="hw-empty-title">No assignments found</div>
                  <div className="hw-empty-sub">{search ? "Try adjusting your search or filters" : "Create your first assignment to get started"}</div>
                  {!search && <button className="hw-btn hw-btn-primary" onClick={() => setShowModal(true)}><Svg d={ICONS.plus} size={14} /> Create Assignment</button>}
                </div>
              </div>
            ) : (
              <div className="hw-assign-list">
                {filteredAssignments.map((a, idx) => {
                  const due = new Date(a.dueDate);
                  const isOverdue = due < new Date();
                  const compRate = Math.round((a.submissionCount / Math.max(a.totalStudents, 1)) * 100);
                  return (
                    <div key={a.id} className="hw-assign-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="hw-assign-head">
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                          <div className="hw-assign-title">{a.title}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span className={`hw-badge ${isOverdue ? "overdue" : "active"}`}>{isOverdue ? "Overdue" : "Active"}</span>
                            <span className="hw-badge outline">{a.submissionType}</span>
                            <span className="hw-badge outline">{a.maxScore} pts</span>
                          </div>
                        </div>
                        <div className="hw-assign-meta">
                          <span className="hw-assign-meta-item"><Svg d={ICONS.book} size={14} />{a.courseName}</span>
                          <span className="hw-assign-meta-item"><Svg d={ICONS.clock} size={14} />Due {formatDistanceToNow(due, { addSuffix: true })}</span>
                          <span className="hw-assign-meta-item"><Svg d={ICONS.users} size={14} />{a.submissionCount}/{a.totalStudents} submitted</span>
                          <span className="hw-assign-meta-item"><Svg d={ICONS.trend} size={14} />{compRate}% complete</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="hw-prog-wrap">
                        <div className="hw-prog-label">
                          <span>Submission progress</span>
                          <span>{a.submissionCount}/{a.totalStudents}</span>
                        </div>
                        <div className="hw-prog-bg">
                          <div className="hw-prog-fill" style={{ width: `${compRate}%` }} />
                        </div>
                      </div>

                      <div className="hw-assign-body">
                        {a.description && <p className="hw-assign-desc">{a.description}</p>}
                        <div className="hw-assign-foot">
                          <button className="hw-btn hw-btn-outline" onClick={() => { setSelectedAssignment(a); setTab("submissions"); }}>
                            <Svg d={ICONS.eye} size={14} /> Review ({a.submissionCount})
                          </button>
                          <button className="hw-btn hw-btn-outline"><Svg d={ICONS.edit} size={14} /> Edit</button>
                          <button className="hw-btn hw-btn-danger"><Svg d={ICONS.trash} size={14} /> Delete</button>
                          {a.submissionCount > 0 && (
                            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--hw-text3)" }}>
                              Created {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ SUBMISSIONS TAB ════════════════ */}
        {tab === "submissions" && (
          <div>
            {!selectedAssignment ? (
              <div>
                <div className="hw-card" style={{ marginBottom: 16 }}>
                  <div className="hw-card-hd">
                    <div className="hw-card-title">Select an Assignment to Review</div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--hw-text3)", marginBottom: 16 }}>Click any assignment below or choose from the Overview tab</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {assignments.map(a => (
                      <button key={a.id} onClick={() => setSelectedAssignment(a)}
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, border: "1px solid var(--hw-border2)", background: "var(--hw-qa-bg)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .18s", width: "100%" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--hw-btn-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "var(--hw-qa-bg)")}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.08))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#6366f1" }}>
                          <Svg d={ICONS.clip} size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--hw-text)" }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: "var(--hw-text3)", marginTop: 2 }}>{a.courseName} · {a.submissionCount}/{a.totalStudents} submissions</div>
                        </div>
                        <span style={{ color: "var(--hw-text3)", fontSize: 18 }}>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Back bar */}
                <div className="hw-back-bar">
                  <div className="hw-back-info">
                    <h3>{selectedAssignment.title}</h3>
                    <p>{selectedAssignment.courseName} · {submissions.length} submissions · Max {selectedAssignment.maxScore} pts</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="hw-badge outline">{submissions.filter(s => s.gradedAt).length}/{submissions.length} graded</span>
                    <button className="hw-btn hw-btn-outline hw-btn-sm" onClick={() => setSelectedAssignment(null)}>← Back</button>
                  </div>
                </div>

                {/* Grading progress */}
                <div className="hw-card" style={{ marginBottom: 20 }}>
                  <div className="hw-card-hd">
                    <div className="hw-card-title">Grading Progress</div>
                    <span style={{ fontSize: 12, color: "var(--hw-text3)" }}>{submissions.filter(s => s.gradedAt).length} of {submissions.length} graded</span>
                  </div>
                  <div className="hw-prog-bg">
                    <div className="hw-prog-fill" style={{ width: submissions.length > 0 ? `${(submissions.filter(s => s.gradedAt).length / submissions.length) * 100}%` : "0%" }} />
                  </div>
                </div>

                {submissions.length === 0 ? (
                  <div className="hw-card">
                    <div className="hw-empty">
                      <div className="hw-empty-icon"><Svg d={ICONS.send} size={28} /></div>
                      <div className="hw-empty-title">No submissions yet</div>
                      <div className="hw-empty-sub">Students haven't submitted their work yet</div>
                    </div>
                  </div>
                ) : (
                  submissions.map((sub, idx) => (
                    <div key={sub.id} className="hw-sub-card" style={{ animationDelay: `${idx * 0.04}s` }}>
                      <div className="hw-sub-head">
                        <div>
                          <div className="hw-sub-name">{sub.studentName}</div>
                          <div className="hw-sub-email">{sub.studentEmail}</div>
                          <div className="hw-sub-time">Submitted {formatDistanceToNow(new Date(sub.submittedAt), { addSuffix: true })}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {sub.gradedAt ? (
                            <>
                              <span className={sub.score != null && sub.score >= selectedAssignment.maxScore * 0.9 ? "sp-hi" : sub.score != null && sub.score >= selectedAssignment.maxScore * 0.7 ? "sp-mid" : "sp-lo"}>
                                {sub.score}/{selectedAssignment.maxScore}
                              </span>
                              <span className="hw-badge active"><Svg d={ICONS.check} size={11} /> Graded</span>
                            </>
                          ) : (
                            <span className="hw-badge pending">Pending</span>
                          )}
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--hw-text3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Student Response</div>
                        <div className="hw-response">{sub.content}</div>
                      </div>

                      {sub.feedback && (
                        <div className="hw-feedback-box">
                          <div className="hw-feedback-title">Your Feedback</div>
                          <p style={{ fontSize: 13, color: "var(--hw-text4)" }}>{sub.feedback}</p>
                        </div>
                      )}

                      {!sub.gradedAt && (
                        <div className="hw-grade-section">
                          <div className="hw-grade-title">✏️ Grade this Submission</div>
                          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, marginBottom: 12 }}>
                            <div>
                              <label className="hw-label">Score (/ {selectedAssignment.maxScore})</label>
                              <input type="number" min={0} max={selectedAssignment.maxScore} className="hw-input"
                                placeholder="0" value={scoreInputs[sub.id] ?? ""}
                                onChange={e => setScoreInputs(p => ({ ...p, [sub.id]: e.target.value }))} />
                            </div>
                            <div>
                              <label className="hw-label">Feedback</label>
                              <textarea className="hw-textarea" style={{ minHeight: 60 }} placeholder="Write constructive feedback…"
                                value={feedbackInputs[sub.id] ?? ""}
                                onChange={e => setFeedbackInputs(p => ({ ...p, [sub.id]: e.target.value }))} />
                            </div>
                          </div>
                          <button className="hw-btn hw-btn-green"
                            disabled={!scoreInputs[sub.id] || !feedbackInputs[sub.id]}
                            onClick={() => gradeMutation.mutate({ id: sub.id, score: parseInt(scoreInputs[sub.id]), feedback: feedbackInputs[sub.id] })}>
                            <Svg d={ICONS.star} size={14} /> Submit Grade
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ ANALYTICS TAB ════════════════ */}
        {tab === "analytics" && (
          <div>
            {/* Summary row */}
            <div className="hw-stats" style={{ marginBottom: 20 }}>
              {[
                { label: "Highest Completion", value: analyticsData.length > 0 ? Math.max(...analyticsData.map(d => d.pct)) : 0, suffix: "%", badge: "Best", cls: "lime", icls: "hsi-lime", icon: "trend" },
                { label: "Avg Submissions", value: total > 0 ? Math.round(totalSubs / total) : 0, suffix: "", badge: "Per Assign", cls: "vio", icls: "hsi-vio", icon: "send" },
                { label: "Ungraded Total", value: pendingGrade, suffix: "", badge: "To Do", cls: "rose", icls: "hsi-rose", icon: "clip" },
                { label: "Active Courses", value: courses.length, suffix: "", badge: "Running", cls: "sky", icls: "hsi-sky", icon: "book" },
              ].map((s, i) => (
                <div key={i} className={`hw-stat-card ${s.cls}`}>
                  <div className="hw-stat-top">
                    <div className={`hw-stat-icon ${s.icls}`}><Svg d={ICONS[s.icon as keyof typeof ICONS]} size={20} /></div>
                    <span className="hw-stat-badge">{s.badge}</span>
                  </div>
                  <div className="hw-stat-num"><AnimatedNumber target={s.value} suffix={s.suffix} /></div>
                  <div className="hw-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="hw-analytics-grid">
              {/* Bar chart */}
              <div className="hw-card">
                <div className="hw-card-hd">
                  <div className="hw-card-title">Submission Rate by Assignment</div>
                </div>
                {analyticsData.length === 0 ? (
                  <div className="hw-empty"><div className="hw-empty-title">No data yet</div></div>
                ) : (
                  <div className="hw-chart">
                    {analyticsData.slice(0, 7).map((d, i) => (
                      <div key={i} className="hw-bar-col">
                        <div className="hw-bar-val">{d.pct}%</div>
                        <div className="hw-bar" style={{ height: `${d.pct}%`, animationDelay: `${0.1 + i * 0.08}s` }} />
                        <div className="hw-bar-lbl">{d.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Donut: course distribution */}
              <div className="hw-card">
                <div className="hw-card-hd">
                  <div className="hw-card-title">Assignments by Course</div>
                </div>
                <div className="hw-donut-wrap">
                  <div className="hw-donut">
                    <Donut segs={donutSegs.length > 0 ? donutSegs : [{ label: "No data", pct: 100 }]} size={110} stroke={16} />
                    <div className="hw-donut-center">
                      <div className="hw-donut-num">{total}</div>
                      <div className="hw-donut-lbl">total</div>
                    </div>
                  </div>
                  <div className="hw-donut-legend">
                    {donutSegs.map((d, i) => (
                      <div key={i} className="hw-legend-item">
                        <div className="hw-legend-dot" style={{ background: donutColors[i] }} />
                        <div className="hw-legend-txt">{d.label}</div>
                        <div className="hw-legend-val">{d.pct}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed table */}
            <div className="hw-card" style={{ marginTop: 20 }}>
              <div className="hw-card-hd">
                <div className="hw-card-title">Assignment Performance Table</div>
              </div>
              {assignments.length === 0 ? (
                <div className="hw-empty"><div className="hw-empty-title">No assignments yet</div></div>
              ) : (
                <table className="hw-table">
                  <thead>
                    <tr>
                      <th className="hw-th">Assignment</th>
                      <th className="hw-th">Course</th>
                      <th className="hw-th">Submissions</th>
                      <th className="hw-th">Completion</th>
                      <th className="hw-th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a, i) => {
                      const pct = Math.round((a.submissionCount / Math.max(a.totalStudents, 1)) * 100);
                      const isOver = new Date(a.dueDate) < new Date();
                      return (
                        <tr key={a.id} className="hw-tr" onClick={() => { setSelectedAssignment(a); setTab("submissions"); }}>
                          <td className="hw-td" style={{ fontWeight: 700, color: "var(--hw-text)" }}>{a.title}</td>
                          <td className="hw-td">{a.courseName}</td>
                          <td className="hw-td">{a.submissionCount}/{a.totalStudents}</td>
                          <td className="hw-td">
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div className="hw-mini-prog-bg">
                                <div className="hw-mini-prog-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--hw-text4)", minWidth: 36 }}>{pct}%</span>
                            </div>
                          </td>
                          <td className={`hw-td hw-td-last`}>
                            <span className={`hw-badge ${isOver ? "overdue" : "active"}`}>{isOver ? "Overdue" : "Active"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ CREATE MODAL ════════════════ */}
        {showModal && (
          <div className="hw-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div className="hw-modal">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div className="hw-modal-title">📝 Create New Assignment</div>
                <button className="hw-btn hw-btn-outline hw-btn-sm" onClick={() => setShowModal(false)}>
                  <Svg d={ICONS.x} size={14} />
                </button>
              </div>

              <div className="hw-form-row">
                <label className="hw-label">Assignment Title *</label>
                <input className="hw-input" placeholder="e.g. Chapter 5 Review Questions" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>

              <div className="hw-form-row">
                <label className="hw-label">Select Course *</label>
                <select className="hw-select" value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}>
                  <option value="">Choose a course…</option>
                  {courses.map(c => <option key={c.id} value={c.id.toString()}>{c.title} ({c.enrollmentCount} students)</option>)}
                </select>
              </div>

              <div className="hw-form-grid hw-form-row">
                <div>
                  <label className="hw-label">Due Date *</label>
                  <input type="datetime-local" className="hw-input" value={form.dueDate}
                    onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="hw-label">Max Score</label>
                  <input type="number" className="hw-input" value={form.maxScore}
                    onChange={e => setForm(p => ({ ...p, maxScore: parseInt(e.target.value) || 100 }))} />
                </div>
              </div>

              <div className="hw-form-row">
                <label className="hw-label">Submission Type</label>
                <select className="hw-select" value={form.submissionType} onChange={e => setForm(p => ({ ...p, submissionType: e.target.value as any }))}>
                  <option value="text">Text Only</option>
                  <option value="file">File Upload Only</option>
                  <option value="both">Text and Files</option>
                </select>
              </div>

              <div className="hw-form-row">
                <label className="hw-label">Description</label>
                <textarea className="hw-textarea" placeholder="Describe objectives and requirements…"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="hw-form-row">
                <label className="hw-label">Detailed Instructions</label>
                <textarea className="hw-textarea" style={{ minHeight: 110 }} placeholder="Provide step-by-step instructions for students…"
                  value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} />
              </div>

              <div className="hw-modal-footer">
                <button className="hw-btn hw-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="hw-btn hw-btn-primary"
                  disabled={!form.title.trim() || !form.courseId || !form.dueDate || createMutation.isPending}
                  onClick={() => createMutation.mutate(form)}>
                  <Svg d={ICONS.plus} size={14} />
                  {createMutation.isPending ? "Creating…" : "Create Assignment"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}