import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import { buildApiUrl } from "../lib/apiBase";

/* ═══════════════════════════════════════════════════════════
   CSS — mirrors teacher dashboard (td-*) design tokens exactly
   ═══════════════════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── CSS Variables — Light ── */
:root {
  --ec-bg:           #f8fafc;
  --ec-card:         #ffffff;
  --ec-card2:        #fafafa;
  --ec-border:       rgba(0,0,0,.06);
  --ec-border2:      #f3f4f6;
  --ec-shadow:       0 2px 12px rgba(0,0,0,.05);
  --ec-shadow2:      0 12px 32px rgba(0,0,0,.10);
  --ec-text:         #0f172a;
  --ec-text2:        #64748b;
  --ec-text3:        #94a3b8;
  --ec-text4:        #374151;
  --ec-bar-bg:       #f1f5f9;
  --ec-btn-bg:       #ffffff;
  --ec-btn-text:     #374151;
  --ec-btn-hover:    #f5f3ff;
  --ec-btn-htext:    #6366f1;
  --ec-badge-bg:     #f9fafb;
  --ec-badge-text:   #9ca3af;
  --ec-sel-bg:       #ffffff;
  --ec-sel-text:     #374151;
  --ec-sel-border:   #e5e7eb;
  --ec-input-bg:     #ffffff;
  --ec-input-text:   #374151;
  --ec-table-hover:  #f8fafc;
  --ec-row-border:   #f3f4f6;
  --ec-qa-bg:        #fafafa;
  --ec-qa-border:    #f3f4f6;
  --ec-drop-bg:      #f5f3ff;
  --ec-drop-border:  #c4b5fd;
}
[data-theme="dark"] {
  --ec-bg:           #0b1120;
  --ec-card:         #141f35;
  --ec-card2:        #1a2540;
  --ec-border:       rgba(255,255,255,.07);
  --ec-border2:      rgba(255,255,255,.06);
  --ec-shadow:       0 2px 12px rgba(0,0,0,.3);
  --ec-shadow2:      0 12px 32px rgba(0,0,0,.5);
  --ec-text:         #f1f5f9;
  --ec-text2:        #94a3b8;
  --ec-text3:        #64748b;
  --ec-text4:        #cbd5e1;
  --ec-bar-bg:       rgba(255,255,255,.07);
  --ec-btn-bg:       rgba(255,255,255,.06);
  --ec-btn-text:     #94a3b8;
  --ec-btn-hover:    rgba(99,102,241,.18);
  --ec-btn-htext:    #a5b4fc;
  --ec-badge-bg:     rgba(255,255,255,.08);
  --ec-badge-text:   #64748b;
  --ec-sel-bg:       #1a2540;
  --ec-sel-text:     #94a3b8;
  --ec-sel-border:   rgba(255,255,255,.12);
  --ec-input-bg:     #1a2540;
  --ec-input-text:   #94a3b8;
  --ec-table-hover:  rgba(255,255,255,.03);
  --ec-row-border:   rgba(255,255,255,.05);
  --ec-qa-bg:        rgba(255,255,255,.03);
  --ec-qa-border:    rgba(255,255,255,.06);
  --ec-drop-bg:      rgba(99,102,241,.08);
  --ec-drop-border:  rgba(99,102,241,.35);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.ec-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  padding: 24px 28px;
  max-width: 1280px;
  margin: 0 auto;
  color: var(--ec-text);
  transition: color .3s;
}

/* ── Hero banner — matches td-hero exactly ── */
.ec-hero {
  border-radius: 24px; padding: 32px 36px; margin-bottom: 28px;
  position: relative; overflow: hidden; color: #fff;
   background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  animation: heroIn .6s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes heroIn { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:none} }
.ec-hero::before { content:''; position:absolute; top:-50px; right:-50px; width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,.1); }
.ec-hero::after  { content:''; position:absolute; bottom:-60px; left:20%; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,.07); }
.ec-float { position:absolute; border-radius:50%; background:rgba(255,255,255,.06); animation:ecFloat 6s ease-in-out infinite; }
@keyframes ecFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
.ec-hero-inner  { display:flex; align-items:center; justify-content:space-between; position:relative; z-index:1; gap:20px; flex-wrap:wrap; }
.ec-hero-title  { font-size:clamp(18px,3vw,26px); font-weight:800; margin-bottom:6px; }
.ec-hero-sub    { font-size:14px; opacity:.75; max-width:520px; }
.ec-hero-badges { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
.ec-hero-badge  {
  padding:6px 14px; border-radius:999px; font-size:12px; font-weight:700;
  background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.3);
  backdrop-filter:blur(6px); display:flex; align-items:center; gap:6px;
}
.ec-hero-actions { display:flex; gap:10px; flex-shrink:0; flex-wrap:wrap; }
.ec-hero-btn {
  padding:11px 22px; background:#fff; color:#059669; border:none; border-radius:14px;
  font-size:13.5px; font-weight:700; cursor:pointer; font-family:inherit;
  transition:all .2s; box-shadow:0 4px 16px rgba(0,0,0,.15); white-space:nowrap;
  display:flex; align-items:center; gap:7px;
}
.ec-hero-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.2); }
.ec-hero-btn svg { width:15px; height:15px; }
.ec-hero-btn-ol {
  padding:11px 22px; background:rgba(255,255,255,.15); color:#fff;
  border:1.5px solid rgba(255,255,255,.35); border-radius:14px;
  font-size:13.5px; font-weight:700; cursor:pointer; font-family:inherit;
  transition:all .2s; white-space:nowrap; display:flex; align-items:center; gap:7px;
  backdrop-filter:blur(6px);
}
.ec-hero-btn-ol:hover { background:rgba(255,255,255,.25); transform:translateY(-2px); }
.ec-hero-btn-ol svg { width:15px; height:15px; }

/* ── Stats ── */
.ec-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
.ec-stat-card {
  background:var(--ec-card); border-radius:18px; padding:20px;
  border:1px solid var(--ec-border); box-shadow:var(--ec-shadow);
  transition:all .25s; position:relative; overflow:hidden;
  animation:cardUp .5s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cardUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
.ec-stat-card:nth-child(1){animation-delay:.07s} .ec-stat-card:nth-child(2){animation-delay:.14s}
.ec-stat-card:nth-child(3){animation-delay:.21s} .ec-stat-card:nth-child(4){animation-delay:.28s}
.ec-stat-card::after { content:''; position:absolute; top:-20px; right:-20px; width:80px; height:80px; border-radius:50%; opacity:.08; transition:transform .3s; }
.ec-stat-card:hover { transform:translateY(-4px); box-shadow:var(--ec-shadow2); }
.ec-stat-card:hover::after { transform:scale(1.4); }
.ec-sc-green  { border-top:3px solid #10b981; } .ec-sc-green::after  { background:#10b981; }
.ec-sc-blue   { border-top:3px solid #0ea5e9; } .ec-sc-blue::after   { background:#0ea5e9; }
.ec-sc-purple { border-top:3px solid #6366f1; } .ec-sc-purple::after { background:#6366f1; }
.ec-sc-amber  { border-top:3px solid #f59e0b; } .ec-sc-amber::after  { background:#f59e0b; }
.ec-stat-top   { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.ec-stat-icon  { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
.ec-stat-icon svg { width:20px; height:20px; }
.esi-green  { background:rgba(16,185,129,.12);  color:#10b981; }
.esi-blue   { background:rgba(14,165,233,.12);  color:#0ea5e9; }
.esi-purple { background:rgba(99,102,241,.12);  color:#6366f1; }
.esi-amber  { background:rgba(245,158,11,.12);  color:#f59e0b; }
[data-theme="dark"] .esi-green  { background:rgba(16,185,129,.22); }
[data-theme="dark"] .esi-blue   { background:rgba(14,165,233,.22); }
[data-theme="dark"] .esi-purple { background:rgba(99,102,241,.22); }
[data-theme="dark"] .esi-amber  { background:rgba(245,158,11,.22); }
.ec-stat-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; color:var(--ec-badge-text); background:var(--ec-badge-bg); }
.ec-stat-num   { font-size:32px; font-weight:800; color:var(--ec-text); letter-spacing:-1px; line-height:1; margin-bottom:4px; }
.ec-stat-label { font-size:13px; color:var(--ec-text2); font-weight:500; }
.ec-stat-trend { font-size:11.5px; color:#10b981; margin-top:4px; font-weight:600; }
[data-theme="dark"] .ec-stat-trend { color:#34d399; }

/* ── Alert row ── */
.ec-alerts { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:28px; }
.ec-alert {
  border-radius:16px; padding:18px; position:relative; overflow:hidden;
  animation:cardUp .5s .35s both;
}
.ec-alert::before { content:''; position:absolute; top:-20px; right:-20px; width:70px; height:70px; border-radius:50%; opacity:.15; }
.ea-green  { background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1px solid #bbf7d0; }
.ea-green::before  { background:#10b981; }
.ea-blue   { background:linear-gradient(135deg,#eff6ff,#e0f2fe); border:1px solid #bae6fd; }
.ea-blue::before   { background:#0ea5e9; }
.ea-purple { background:linear-gradient(135deg,#f5f3ff,#ede9fe); border:1px solid #c4b5fd; }
.ea-purple::before { background:#6366f1; }
[data-theme="dark"] .ea-green  { background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(52,211,153,.07));  border-color:rgba(16,185,129,.28); }
[data-theme="dark"] .ea-blue   { background:linear-gradient(135deg,rgba(14,165,233,.12),rgba(59,130,246,.07));  border-color:rgba(14,165,233,.28); }
[data-theme="dark"] .ea-purple { background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.07)); border-color:rgba(99,102,241,.28); }
.ec-alert-emoji { font-size:26px; margin-bottom:8px; }
.ec-alert-title { font-size:13.5px; font-weight:700; color:var(--ec-text); margin-bottom:3px; }
.ec-alert-sub   { font-size:12px; color:var(--ec-text2); }
.ec-alert-num   { font-size:26px; font-weight:800; color:var(--ec-text); margin-top:6px; }

/* ── Tabs — exactly td style ── */
.ec-tabs-row { display:flex; gap:4px; margin-bottom:24px; background:var(--ec-bar-bg); border-radius:16px; padding:4px; animation:cardUp .5s .38s both; }
.ec-tab {
  flex:1; padding:10px 14px; border-radius:13px; border:none; font-size:12.5px; font-weight:600;
  cursor:pointer; font-family:inherit; color:var(--ec-text2); background:transparent;
  transition:all .2s; display:flex; align-items:center; justify-content:center; gap:6px;
  white-space:nowrap;
}
.ec-tab svg { width:14px; height:14px; flex-shrink:0; }
.ec-tab.active {
  background:linear-gradient(135deg,#10b981,#0ea5e9); color:#fff;
  box-shadow:0 4px 16px rgba(16,185,129,.4);
}
[data-theme="dark"] .ec-tab.active { box-shadow:0 4px 16px rgba(16,185,129,.6); }

/* ── Cards ── */
.ec-card {
  background:var(--ec-card); border-radius:20px; padding:22px;
  border:1px solid var(--ec-border); box-shadow:var(--ec-shadow);
  animation:cardUp .5s .4s both; transition:background .3s;
}
.ec-card-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
.ec-card-title { font-size:15px; font-weight:700; color:var(--ec-text); display:flex; align-items:center; gap:8px; }
.ec-card-title svg { width:18px; height:18px; color:#10b981; }
.ec-view-btn {
  padding:6px 14px; border-radius:9px; border:1px solid var(--ec-sel-border);
  background:var(--ec-btn-bg); font-size:12px; font-weight:600;
  cursor:pointer; font-family:inherit; color:var(--ec-btn-text);
  transition:all .18s; display:flex; align-items:center; gap:5px;
}
.ec-view-btn:hover { background:var(--ec-btn-hover); border-color:rgba(99,102,241,.35); color:var(--ec-btn-htext); }
.ec-view-btn svg { width:13px; height:13px; }

/* ── Main grid ── */
.ec-main-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
.ec-main-grid3 { display:grid; grid-template-columns:1fr 1fr 320px; gap:20px; margin-bottom:24px; }

/* ── Form elements ── */
.ec-form-group { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
.ec-form-group:last-child { margin-bottom:0; }
.ec-label { font-size:12px; font-weight:700; color:var(--ec-text2); letter-spacing:.03em; text-transform:uppercase; }
.ec-input, .ec-textarea, .ec-select {
  padding:10px 13px; border-radius:11px; border:1.5px solid var(--ec-sel-border);
  background:var(--ec-input-bg); color:var(--ec-input-text); font-size:13.5px;
  font-family:inherit; outline:none; transition:border-color .15s, box-shadow .15s; width:100%;
}
.ec-textarea { resize:vertical; min-height:80px; }
.ec-input:focus, .ec-textarea:focus, .ec-select:focus {
  border-color:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,.12);
}
.ec-input::placeholder, .ec-textarea::placeholder { color:var(--ec-text3); }

.ec-form-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.ec-form-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }

/* ── Submit / action buttons ── */
.ec-submit-btn {
  width:100%; padding:12px; border-radius:13px; border:none;
  background:linear-gradient(135deg,#10b981,#0ea5e9); color:#fff;
  font-size:14px; font-weight:700; cursor:pointer; font-family:inherit;
  transition:all .2s; box-shadow:0 4px 14px rgba(16,185,129,.4);
  display:flex; align-items:center; justify-content:center; gap:8px;
}
.ec-submit-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(16,185,129,.55); }
.ec-submit-btn:disabled { opacity:.6; cursor:not-allowed; transform:none; }
.ec-submit-btn svg { width:16px; height:16px; }

.ec-secondary-btn {
  padding:10px 20px; border-radius:11px; border:1.5px solid var(--ec-sel-border);
  background:var(--ec-btn-bg); color:var(--ec-btn-text); font-size:13.5px; font-weight:700;
  cursor:pointer; font-family:inherit; transition:all .18s; display:flex; align-items:center; gap:7px;
}
.ec-secondary-btn:hover { background:var(--ec-btn-hover); border-color:rgba(16,185,129,.3); color:#10b981; }
.ec-secondary-btn svg { width:14px; height:14px; }

/* ── Drag-drop upload zone ── */
.ec-drop-zone {
  border:2px dashed var(--ec-drop-border); border-radius:18px;
  background:var(--ec-drop-bg); padding:36px 24px; text-align:center;
  cursor:pointer; transition:all .25s; position:relative;
}
.ec-drop-zone.dragging { border-color:#10b981; background:rgba(16,185,129,.1); transform:scale(1.01); }
.ec-drop-zone:hover { border-color:#10b981; background:rgba(16,185,129,.06); }
.ec-drop-icon {
  width:60px; height:60px; border-radius:18px; margin:0 auto 16px;
  background:linear-gradient(135deg,rgba(16,185,129,.15),rgba(14,165,233,.1));
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 4px 16px rgba(16,185,129,.2);
}
.ec-drop-icon svg { width:28px; height:28px; color:#10b981; }
.ec-drop-title { font-size:15px; font-weight:700; color:var(--ec-text); margin-bottom:5px; }
.ec-drop-sub   { font-size:12.5px; color:var(--ec-text3); }
.ec-drop-pill  { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:999px; margin-top:12px; font-size:11.5px; font-weight:600; }
.edp-pdf  { background:rgba(244,63,94,.1); color:#f43f5e; border:1px solid rgba(244,63,94,.2); }
.edp-docx { background:rgba(59,130,246,.1); color:#3b82f6; border:1px solid rgba(59,130,246,.2); }
.edp-txt  { background:rgba(245,158,11,.1); color:#f59e0b; border:1px solid rgba(245,158,11,.2); }

.ec-file-selected {
  border-radius:13px; padding:13px 16px; margin-top:14px;
  background:rgba(16,185,129,.08); border:1.5px solid rgba(16,185,129,.25);
  display:flex; align-items:center; gap:12px;
}
.ec-file-ico { width:38px; height:38px; border-radius:10px; background:rgba(16,185,129,.15); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ec-file-ico svg { width:18px; height:18px; color:#10b981; }
.ec-file-name  { font-size:13px; font-weight:700; color:var(--ec-text); }
.ec-file-size  { font-size:11.5px; color:var(--ec-text3); margin-top:2px; }
.ec-file-close { margin-left:auto; width:26px; height:26px; border-radius:8px; border:1px solid rgba(244,63,94,.25); background:rgba(244,63,94,.08); color:#f43f5e; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
.ec-file-close:hover { background:rgba(244,63,94,.18); }
.ec-file-close svg { width:12px; height:12px; }

/* ── Progress bar ── */
.ec-progress-wrap { margin-top:16px; }
.ec-progress-hd { display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; color:var(--ec-text2); font-weight:600; }
.ec-progress-bg { height:8px; background:var(--ec-bar-bg); border-radius:8px; overflow:hidden; }
.ec-progress-fill {
  height:100%; border-radius:8px;
  background:linear-gradient(90deg,#10b981,#0ea5e9,#6366f1);
  transition:width .4s ease; box-shadow:0 0 12px rgba(16,185,129,.5);
}
.ec-progress-steps { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
.ec-progress-step {
  display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600;
  padding:4px 10px; border-radius:8px;
}
.eps-done    { background:rgba(16,185,129,.12); color:#10b981; }
.eps-active  { background:rgba(14,165,233,.12); color:#0ea5e9; }
.eps-pending { background:var(--ec-bar-bg);     color:var(--ec-text3); }
.eps-done svg, .eps-active svg, .eps-pending svg { width:11px; height:11px; }

/* ── Mode selector cards ── */
.ec-mode-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; }
.ec-mode-card {
  border-radius:14px; padding:14px; border:2px solid var(--ec-sel-border);
  background:var(--ec-card2); cursor:pointer; transition:all .2s; text-align:center;
}
.ec-mode-card:hover { border-color:#10b981; background:rgba(16,185,129,.04); }
.ec-mode-card.selected { border-color:#10b981; background:rgba(16,185,129,.1); box-shadow:0 4px 16px rgba(16,185,129,.2); }
[data-theme="dark"] .ec-mode-card.selected { background:rgba(16,185,129,.15); }
.ec-mode-icon { font-size:24px; margin-bottom:6px; }
.ec-mode-label { font-size:12px; font-weight:800; color:var(--ec-text); margin-bottom:3px; }
.ec-mode-desc  { font-size:10.5px; color:var(--ec-text3); line-height:1.4; }

/* ── Option toggles ── */
.ec-option {
  display:flex; align-items:center; gap:12px; padding:11px 14px;
  border-radius:12px; border:1.5px solid var(--ec-sel-border); background:var(--ec-qa-bg);
  cursor:pointer; transition:all .2s; margin-bottom:8px;
}
.ec-option:last-child { margin-bottom:0; }
.ec-option.on { border-color:#10b981; background:rgba(16,185,129,.08); }
[data-theme="dark"] .ec-option.on { background:rgba(16,185,129,.12); }
.ec-opt-check {
  width:22px; height:22px; border-radius:7px; border:2px solid var(--ec-sel-border);
  display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .2s;
  background:var(--ec-card);
}
.ec-option.on .ec-opt-check { border-color:#10b981; background:#10b981; }
.ec-opt-check svg { width:12px; height:12px; color:#fff; }
.ec-opt-label { flex:1; }
.ec-opt-title { font-size:13px; font-weight:700; color:var(--ec-text); }
.ec-opt-sub   { font-size:11px; color:var(--ec-text3); margin-top:2px; }
.ec-opt-badge { padding:3px 8px; border-radius:6px; font-size:10.5px; font-weight:700; background:rgba(16,185,129,.12); color:#10b981; }

/* ── Results panel ── */
.ec-result-banner {
  border-radius:16px; padding:16px 20px; margin-bottom:18px;
  display:flex; align-items:center; gap:12px;
  background:linear-gradient(135deg,rgba(16,185,129,.1),rgba(14,165,233,.06));
  border:1.5px solid rgba(16,185,129,.25);
}
.ec-result-ico { width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,#10b981,#0ea5e9); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ec-result-ico svg { width:18px; height:18px; color:#fff; }
.ec-result-title { font-size:13.5px; font-weight:700; color:var(--ec-text); }
.ec-result-sub   { font-size:12px; color:var(--ec-text2); margin-top:2px; }

.ec-result-chips { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:18px; }
.ec-result-chip {
  border-radius:13px; padding:14px 12px; text-align:center;
  border:1px solid var(--ec-border);
}
.erc-green  { background:rgba(16,185,129,.08); border-color:rgba(16,185,129,.2); }
.erc-blue   { background:rgba(14,165,233,.08); border-color:rgba(14,165,233,.2); }
.erc-purple { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.2); }
.ec-chip-num   { font-size:24px; font-weight:800; line-height:1; margin-bottom:4px; }
.erc-green  .ec-chip-num  { color:#10b981; }
.erc-blue   .ec-chip-num  { color:#0ea5e9; }
.erc-purple .ec-chip-num  { color:#6366f1; }
.ec-chip-label { font-size:11px; font-weight:600; color:var(--ec-text3); }

.ec-meta-row { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--ec-border2); font-size:13px; }
.ec-meta-row:last-child { border-bottom:0; }
.ec-meta-label { color:var(--ec-text2); }
.ec-meta-val   { font-weight:700; color:var(--ec-text); }
.ec-meta-badge {
  padding:3px 10px; border-radius:6px; font-size:11.5px; font-weight:700;
  background:rgba(99,102,241,.1); color:#6366f1; border:1px solid rgba(99,102,241,.2);
}
[data-theme="dark"] .ec-meta-badge { background:rgba(99,102,241,.2); border-color:rgba(99,102,241,.3); }

.ec-concept-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
.ec-concept-chip {
  padding:4px 12px; border-radius:8px; font-size:11.5px; font-weight:600;
  background:rgba(14,165,233,.1); color:#0ea5e9; border:1px solid rgba(14,165,233,.2);
  transition:all .15s; cursor:default;
}
.ec-concept-chip:hover { background:rgba(14,165,233,.2); transform:translateY(-1px); }

/* ── Course list / management ── */
.ec-course-item {
  display:flex; align-items:center; gap:14px; padding:14px 16px;
  border-radius:14px; border:1px solid var(--ec-border); background:var(--ec-card2);
  margin-bottom:10px; cursor:pointer; transition:all .2s;
}
.ec-course-item:last-child { margin-bottom:0; }
.ec-course-item:hover { background:var(--ec-btn-hover); border-color:rgba(99,102,241,.3); transform:translateX(3px); }
.ec-course-item.selected { background:rgba(16,185,129,.08); border-color:rgba(16,185,129,.35); }
[data-theme="dark"] .ec-course-item.selected { background:rgba(16,185,129,.12); }
.ec-course-ico { width:44px; height:44px; border-radius:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:20px; }
.ec-course-info { flex:1; min-width:0; }
.ec-course-name { font-size:13.5px; font-weight:700; color:var(--ec-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ec-course-meta { font-size:11.5px; color:var(--ec-text3); margin-top:3px; }
.ec-course-badge { padding:3px 10px; border-radius:8px; font-size:11px; font-weight:700; background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.2); flex-shrink:0; }
.ec-course-actions { display:flex; gap:5px; flex-shrink:0; }
.ec-course-action {
  width:30px; height:30px; border-radius:8px; border:1px solid var(--ec-sel-border);
  background:var(--ec-btn-bg); display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:var(--ec-text3); transition:all .18s;
}
.ec-course-action:hover { background:var(--ec-btn-hover); color:#6366f1; border-color:rgba(99,102,241,.3); }
.ec-course-action svg { width:13px; height:13px; }

/* ── Lesson cards ── */
.ec-lesson {
  border-radius:13px; padding:14px; border:1px solid var(--ec-border);
  background:var(--ec-card2); margin-bottom:10px; transition:all .2s;
}
.ec-lesson:last-child { margin-bottom:0; }
.ec-lesson:hover { box-shadow:var(--ec-shadow); border-color:rgba(16,185,129,.25); }
.ec-lesson-hd   { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:8px; }
.ec-lesson-title{ font-size:13.5px; font-weight:700; color:var(--ec-text); }
.ec-lesson-meta { font-size:11.5px; color:var(--ec-text3); margin-top:3px; }
.ec-lesson-tags { display:flex; gap:5px; flex-wrap:wrap; margin-top:8px; }
.ec-lesson-tag  { padding:3px 9px; border-radius:6px; font-size:10.5px; font-weight:600; }
.elt-diff-beg { background:rgba(16,185,129,.1); color:#10b981; }
.elt-diff-mid { background:rgba(245,158,11,.1); color:#f59e0b; }
.elt-diff-adv { background:rgba(244,63,94,.1);  color:#f43f5e; }
.elt-topic    { background:var(--ec-bar-bg);     color:var(--ec-text3); }
.ec-lesson-actions { display:flex; gap:4px; flex-shrink:0; }

/* ── Analytics bars ── */
.ec-analytics-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
.ec-bar-chart { display:flex; align-items:flex-end; gap:8px; height:100px; padding-top:8px; }
.ec-bar-col   { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; }
.ec-bar       { width:100%; border-radius:5px 5px 0 0; min-height:4px; animation:barUp .7s cubic-bezier(.4,0,.2,1) both; }
@keyframes barUp { from{transform:scaleY(0);transform-origin:bottom} to{transform:scaleY(1)} }
.ec-bar-lbl   { font-size:10px; color:var(--ec-text3); font-weight:600; }

/* ── Snap bars ── */
.ec-snap-row { margin-bottom:13px; }
.ec-snap-row:last-child { margin-bottom:0; }
.ec-snap-hd { display:flex; justify-content:space-between; margin-bottom:5px; font-size:12.5px; }
.ec-snap-label { color:var(--ec-text2); font-weight:500; }
.ec-snap-val   { font-weight:700; color:var(--ec-text); }
.ec-snap-bg  { height:7px; background:var(--ec-bar-bg); border-radius:6px; overflow:hidden; }
.ec-snap-fill{ height:100%; border-radius:6px; transition:width .8s; }

/* ── Quick actions (td-qa style) ── */
.ec-qa {
  display:flex; align-items:center; gap:12px; padding:13px 14px;
  border-radius:14px; border:1px solid var(--ec-qa-border); background:var(--ec-qa-bg);
  cursor:pointer; transition:all .2s; margin-bottom:8px; font-family:inherit; width:100%; text-align:left;
}
.ec-qa:last-child { margin-bottom:0; }
.ec-qa:hover { transform:translateX(4px); background:var(--ec-btn-hover); border-color:rgba(16,185,129,.3); }
.ec-qa-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:transform .2s; }
.ec-qa-icon svg { width:17px; height:17px; }
.ec-qa:hover .ec-qa-icon { transform:scale(1.12); }
.eqa-green  { background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 4px 12px rgba(16,185,129,.4); }
.eqa-blue   { background:linear-gradient(135deg,#0ea5e9,#3b82f6); color:#fff; box-shadow:0 4px 12px rgba(14,165,233,.4); }
.eqa-purple { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 12px rgba(99,102,241,.4); }
.eqa-amber  { background:linear-gradient(135deg,#f59e0b,#ef4444); color:#fff; box-shadow:0 4px 12px rgba(245,158,11,.4); }
.ec-qa-text  { flex:1; }
.ec-qa-label { font-size:13px; font-weight:700; color:var(--ec-text); }
.ec-qa-desc  { font-size:11.5px; color:var(--ec-text3); margin-top:2px; }
.ec-qa-arrow { color:var(--ec-text3); font-size:18px; transition:color .2s; }
.ec-qa:hover .ec-qa-arrow { color:#10b981; }

/* ── Back link ── */
.ec-back {
  display:inline-flex; align-items:center; gap:6px; padding:8px 14px;
  border-radius:10px; border:1px solid var(--ec-sel-border); background:var(--ec-btn-bg);
  color:var(--ec-btn-text); font-size:13px; font-weight:600; text-decoration:none;
  cursor:pointer; margin-bottom:20px; transition:all .18s; font-family:inherit;
}
.ec-back:hover { background:var(--ec-btn-hover); color:#10b981; border-color:rgba(16,185,129,.3); }
.ec-back svg { width:14px; height:14px; }

/* ── Scrollable areas ── */
.ec-scroll { max-height:320px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(16,185,129,.3) transparent; }
.ec-scroll::-webkit-scrollbar { width:4px; }
.ec-scroll::-webkit-scrollbar-thumb { background:rgba(16,185,129,.3); border-radius:4px; }

/* ── Loading spinner ── */
.ec-spin { animation:spin 1s linear infinite; width:16px; height:16px; }
@keyframes spin { to { transform:rotate(360deg); } }

/* ── Empty state ── */
.ec-empty { text-align:center; padding:40px 20px; }
.ec-empty-ico { width:60px; height:60px; border-radius:18px; background:var(--ec-bar-bg); display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
.ec-empty-ico svg { width:26px; height:26px; color:var(--ec-text3); }
.ec-empty-title { font-size:14px; font-weight:700; color:var(--ec-text); margin-bottom:5px; }
.ec-empty-sub   { font-size:12.5px; color:var(--ec-text3); }

/* ── Responsive ── */
@media (max-width:1100px) {
  .ec-main-grid3 { grid-template-columns:1fr 1fr; }
  .ec-main-grid3 > :last-child { grid-column:span 2; }
  .ec-stats { grid-template-columns:repeat(2,1fr); }
  .ec-alerts { grid-template-columns:1fr 1fr; }
  .ec-analytics-grid { grid-template-columns:1fr; }
  .ec-result-chips { grid-template-columns:1fr 1fr; }
}
@media (max-width:768px) {
  .ec-root { padding:16px; }
  .ec-hero { padding:22px 20px; }
  .ec-hero-inner { flex-direction:column; align-items:flex-start; }
  .ec-hero-actions { width:100%; }
  .ec-stats { grid-template-columns:1fr 1fr; gap:12px; }
  .ec-alerts { grid-template-columns:1fr; }
  .ec-main-grid, .ec-main-grid3 { grid-template-columns:1fr; }
  .ec-main-grid3 > :last-child { grid-column:1; }
  .ec-tabs-row { flex-wrap:wrap; }
  .ec-tab { font-size:11px; padding:8px 10px; }
  .ec-form-grid2, .ec-form-grid3, .ec-mode-grid { grid-template-columns:1fr; }
  .ec-result-chips { grid-template-columns:1fr; }
  .ec-analytics-grid { grid-template-columns:1fr; }
}
@media (max-width:480px) {
  .ec-root { padding:12px; }
  .ec-stats { grid-template-columns:1fr; }
}
`;

/* ── SVG Helper ── */
const Svg = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  back:    "M19 12H5M12 19l-7-7 7-7",
  plus:    "M12 5v14M5 12h14",
  upload:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  brain:   "M9.5 2A2.5 2.5 0 017 4.5v1A2.5 2.5 0 009.5 8h5A2.5 2.5 0 0017 5.5v-1A2.5 2.5 0 0014.5 2h-5zM12 8v8M9 12h6M6 20h12a2 2 0 002-2v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1a2 2 0 002 2z",
  book:    "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z",
  chart:   "M18 20V10M12 20V4M6 20v-6",
  file:    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  target:  "M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  check:   "M20 6L9 17l-5-5",
  close:   "M18 6L6 18M6 6l12 12",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  clock:   "M12 2a10 10 0 110 20A10 10 0 0112 2zm0 5v5l3 3",
  tag:     "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  users:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 110 8 4 4 0 010-8z",
  bolt:    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  layers:  "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  trend:   "M23 6l-9.5 9.5-5-5L1 18",
  download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  pdf:     "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M9 13h6M9 17h6M9 9h1",
  info:    "M12 22a10 10 0 100-20 10 10 0 000 20zM12 8h.01M11 12h1v4h1",
} as const;

/* ── Animated Number ── */
function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = () => {
      cur += target / 55;
      if (cur < target) { setV(Math.floor(cur)); requestAnimationFrame(step); }
      else setV(target);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{v}{suffix}</>;
}

/* ── Zod schemas ── */
const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  grade: z.number().min(1).max(12),
  subjectId: z.number().min(1),
  learningObjectives: z.string().optional(),
  prerequisites: z.string().optional(),
});

type CourseForm = z.infer<typeof courseSchema>;

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function EnhancedContentManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState("create");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState(0);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [processingMode, setProcessingMode] = useState<"basic" | "advanced" | "comprehensive">("advanced");
  const [opts, setOpts] = useState({ extractConcepts: true, generateExercises: true, createQuizzes: false });

  // Queries
  const { data: courses = [] } = useQuery<any[]>({ queryKey: ["/api/teacher/courses"] });
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["/api/subjects"] });
  const { data: lessons = []  } = useQuery<any[]>({ queryKey: [`/api/lessons/${selectedCourse}`], enabled: !!selectedCourse });

  const totalLessons = courses.reduce((a: number, c: any) => a + (c.lessonCount || 0), 0);

  // Course form
  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: { title:"", description:"", grade:9, subjectId:1 },
  });

  // Mutations
  const createCourse = useMutation({
    mutationFn: (d: CourseForm) => fetch(buildApiUrl('/api/courses'), {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...d, teacherId: user?.id }),
      credentials: 'include',
    }).then(r => { if(!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:["/api/teacher/courses"] });
      form.reset();
      toast({ title:"✅ Course created!", description:"Your course is live and ready for content." });
    },
    onError: () => toast({ title:"Failed to create course", variant:"destructive" }),
  });

  const processDoc = useMutation({
    mutationFn: async (data: { file:File; courseId:number; opts:any }) => {
      const fd = new FormData();
      fd.append('pdf', data.file);
      fd.append('courseId', data.courseId.toString());
      fd.append('options', JSON.stringify(data.opts));
      const r = await fetch(buildApiUrl('/api/teacher/process-document-nlp'), { method:'POST', body:fd, credentials:'include' });
      if(!r.ok) throw new Error();
      return r.json();
    },
    onSuccess: (result) => {
      setProcessingResult(result);
      setProgress(100);
      setProgressStep(4);
      qc.invalidateQueries({ queryKey:["/api/lessons"] });
      toast({ title:"🎉 Processing complete!", description:`${result.lessonsCreated || result.lessons?.length || 0} lessons created` });
    },
    onError: () => {
      toast({ title:"Processing failed", variant:"destructive" });
      setProgress(0); setProgressStep(0);
    },
  });

  // File handling
  const acceptFile = (f: File) => {
    if (f.type==='application/pdf' || f.name.endsWith('.docx') || f.name.endsWith('.txt')) {
      setSelectedFile(f); setProcessingResult(null); setProgress(0); setProgressStep(0);
    } else {
      toast({ title:"Invalid file type", description:"Please use PDF, DOCX, or TXT", variant:"destructive" });
    }
  };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(f)acceptFile(f); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0]; if(f)acceptFile(f);
  };

  const STEPS = ["Parsing document","Extracting structure","NLP analysis","Generating lessons"];

  const handleProcess = async () => {
    if(!selectedFile || !selectedCourse) {
      toast({ title:"Missing info", description:"Select a course and file first", variant:"destructive" }); return;
    }
    setProgress(0); setProgressStep(0);
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setProgressStep(Math.min(step, 3));
      setProgress(Math.min(step * 23, 88));
      if(step >= 4) clearInterval(iv);
    }, 900);
    await processDoc.mutateAsync({ file: selectedFile, courseId: selectedCourse, opts: { processingMode, ...opts } });
    clearInterval(iv);
  };

  const COURSE_ICONS = ["📐","🔬","📚","🌍","💻","🎨","🔢","📝","🎯","🔭"];
  const gradients = [
    "linear-gradient(135deg,#10b981,#059669)","linear-gradient(135deg,#0ea5e9,#3b82f6)",
    "linear-gradient(135deg,#6366f1,#8b5cf6)","linear-gradient(135deg,#f59e0b,#ef4444)",
    "linear-gradient(135deg,#ec4899,#8b5cf6)","linear-gradient(135deg,#06b6d4,#0ea5e9)",
  ];

  const barData  = [72,85,61,90,78,94,83];
  const barDays  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const barMax   = Math.max(...barData);

  const tabs = [
    { key:"create",    label:"Create Course",  icon:ICONS.plus   },
    { key:"upload",    label:"Process Docs",   icon:ICONS.upload  },
    { key:"manage",    label:"Manage Content", icon:ICONS.book    },
    { key:"analytics", label:"Analytics",      icon:ICONS.chart   },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="ec-root">

        {/* Back */}
        <Link href="/dashboard">
          <button className="ec-back"><Svg d={ICONS.back} size={14}/> Back to Dashboard</button>
        </Link>

        {/* ── HERO ── */}
        <div className="ec-hero">
          <span className="ec-float" style={{width:40,height:40,top:"18%",left:"58%",animationDelay:"0s"}}/>
          <span className="ec-float" style={{width:26,height:26,top:"62%",left:"78%",animationDelay:"1.2s"}}/>
          <span className="ec-float" style={{width:58,height:58,top:"10%",left:"44%",animationDelay:"2.4s"}}/>
          <div className="ec-hero-inner">
            <div>
              <div className="ec-hero-title">Enhanced Content Manager 🧠</div>
              <div className="ec-hero-sub">AI-powered course creation with advanced NLP document processing, concept extraction, and auto-generated lessons.</div>
              <div className="ec-hero-badges">
                <span className="ec-hero-badge"><Svg d={ICONS.brain} size={12}/> NLP Powered</span>
                <span className="ec-hero-badge"><Svg d={ICONS.bolt} size={12}/> Smart Analysis</span>
                <span className="ec-hero-badge"><Svg d={ICONS.layers} size={12}/> Auto-Structure</span>
              </div>
            </div>
            <div className="ec-hero-actions">
              <button className="ec-hero-btn" onClick={()=>setActiveTab("create")}>
                <Svg d={ICONS.plus} size={15}/> New Course
              </button>
              <button className="ec-hero-btn-ol" onClick={()=>setActiveTab("upload")}>
                <Svg d={ICONS.upload} size={15}/> Upload PDF
              </button>
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="ec-stats">
          {[
            { label:"Total Courses",    value:courses.length,  badge:"Created",   cls:"ec-sc-green",  ico:"esi-green",  icon:ICONS.book,    trend:"↑ 2 this month" },
            { label:"Total Lessons",    value:totalLessons,    badge:"AI-Built",  cls:"ec-sc-blue",   ico:"esi-blue",   icon:ICONS.layers,  trend:"Auto-generated" },
            { label:"Docs Processed",   value:processingResult?1:0, badge:"NLP",  cls:"ec-sc-purple", ico:"esi-purple", icon:ICONS.file,    trend:"Advanced AI" },
            { label:"Concepts Mapped",  value:processingResult?.conceptMap?.length||0, badge:"Extracted", cls:"ec-sc-amber", ico:"esi-amber", icon:ICONS.target, trend:"↑ Key ideas" },
          ].map((s,i)=>(
            <div key={i} className={`ec-stat-card ${s.cls}`}>
              <div className="ec-stat-top">
                <div className={`ec-stat-icon ${s.ico}`}><Svg d={s.icon} size={20}/></div>
                <span className="ec-stat-badge">{s.badge}</span>
              </div>
              <div className="ec-stat-num"><AnimNum target={s.value}/></div>
              <div className="ec-stat-label">{s.label}</div>
              <div className="ec-stat-trend">{s.trend}</div>
            </div>
          ))}
        </div>

        {/* ── ALERT CARDS ── */}
        <div className="ec-alerts">
          {[
            { emoji:"📄", title:"Ready to Process", sub:"Upload a PDF or DOCX",   num:selectedFile?1:0, cls:"ea-green"  },
            { emoji:"🎯", title:"Active Courses",    sub:"Accepting new content",   num:courses.length,  cls:"ea-blue"   },
            { emoji:"⚡", title:"AI Lessons Created",sub:"From processed docs",     num:processingResult?.lessons?.length||0, cls:"ea-purple" },
          ].map((a,i)=>(
            <div key={i} className={`ec-alert ${a.cls}`}>
              <div className="ec-alert-emoji">{a.emoji}</div>
              <div className="ec-alert-title">{a.title}</div>
              <div className="ec-alert-sub">{a.sub}</div>
              <div className="ec-alert-num">{a.num}</div>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div className="ec-tabs-row">
          {tabs.map(t=>(
            <button key={t.key} className={`ec-tab${activeTab===t.key?" active":""}`}
              onClick={()=>setActiveTab(t.key)}>
              <Svg d={t.icon} size={14}/>{t.label}
            </button>
          ))}
        </div>

        {/* ═══════════ TAB: CREATE COURSE ═══════════ */}
        {activeTab==="create" && (
          <div className="ec-main-grid3">
            {/* Form */}
            <div style={{gridColumn:"span 2"}}>
              <div className="ec-card">
                <div className="ec-card-hd">
                  <div className="ec-card-title"><Svg d={ICONS.book} size={18}/> Create New Course</div>
                </div>
                <form onSubmit={form.handleSubmit(d=>createCourse.mutate(d))}>
                  <div className="ec-form-grid2">
                    <div className="ec-form-group">
                      <label className="ec-label">Course Title *</label>
                      <input className="ec-input" placeholder="e.g., Advanced Mathematics" {...form.register("title")}/>
                      {form.formState.errors.title && <span style={{fontSize:12,color:"#f43f5e"}}>Required</span>}
                    </div>
                    <div className="ec-form-group">
                      <label className="ec-label">Subject *</label>
                      <select className="ec-select" {...form.register("subjectId",{valueAsNumber:true})}>
                        {subjects.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
                        {!subjects.length && <>
                          <option value={1}>Mathematics</option>
                          <option value={2}>Physics</option>
                          <option value={3}>Chemistry</option>
                          <option value={4}>Biology</option>
                          <option value={5}>English</option>
                          <option value={6}>History</option>
                          <option value={7}>Computer Science</option>
                        </>}
                      </select>
                    </div>
                  </div>
                  <div className="ec-form-group">
                    <label className="ec-label">Description *</label>
                    <textarea className="ec-textarea" rows={3}
                      placeholder="Describe the course content, objectives and what students will learn…"
                      {...form.register("description")}/>
                    {form.formState.errors.description && <span style={{fontSize:12,color:"#f43f5e"}}>Min 10 characters</span>}
                  </div>
                  <div className="ec-form-grid2">
                    <div className="ec-form-group">
                      <label className="ec-label">Grade Level *</label>
                      <select className="ec-select" {...form.register("grade",{valueAsNumber:true})}>
                        {Array.from({length:12},(_,i)=>i+1).map(g=>(
                          <option key={g} value={g}>Grade {g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="ec-form-group">
                      <label className="ec-label">Prerequisites (optional)</label>
                      <input className="ec-input" placeholder="e.g., Basic Algebra, Grade 9 Math" {...form.register("prerequisites")}/>
                    </div>
                  </div>
                  <div className="ec-form-group">
                    <label className="ec-label">Learning Objectives (optional)</label>
                    <textarea className="ec-textarea" rows={2}
                      placeholder="What will students be able to do after this course?"
                      {...form.register("learningObjectives")}/>
                  </div>
                  <button type="submit" className="ec-submit-btn" disabled={createCourse.isPending}>
                    {createCourse.isPending
                      ? <><svg className="ec-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Creating…</>
                      : <><Svg d={ICONS.plus} size={16}/>Create Enhanced Course</>
                    }
                  </button>
                </form>
              </div>
            </div>

            {/* Quick actions sidebar */}
            <div>
              <div className="ec-card">
                <div className="ec-card-hd"><div className="ec-card-title"><Svg d={ICONS.bolt} size={18}/>Quick Actions</div></div>
                {[
                  {label:"Upload PDF",       desc:"Process a new document",  icon:ICONS.upload,  cls:"eqa-green",  tab:"upload"},
                  {label:"Manage Lessons",   desc:"View & edit content",     icon:ICONS.book,    cls:"eqa-blue",   tab:"manage"},
                  {label:"View Analytics",   desc:"Performance insights",    icon:ICONS.chart,   cls:"eqa-purple", tab:"analytics"},
                  {label:"Export Content",   desc:"Download course pack",    icon:ICONS.download,cls:"eqa-amber",  tab:"manage"},
                ].map((a,i)=>(
                  <button key={i} className="ec-qa" onClick={()=>a.tab!=="manage"||setActiveTab(a.tab)&&false}>
                    <div className={`ec-qa-icon ${a.cls}`}><Svg d={a.icon} size={17}/></div>
                    <div className="ec-qa-text">
                      <div className="ec-qa-label">{a.label}</div>
                      <div className="ec-qa-desc">{a.desc}</div>
                    </div>
                    <span className="ec-qa-arrow">›</span>
                  </button>
                ))}
              </div>

              {/* Recently created */}
              {courses.length > 0 && (
                <div className="ec-card" style={{marginTop:16}}>
                  <div className="ec-card-hd"><div className="ec-card-title"><Svg d={ICONS.star} size={18}/>Recent Courses</div></div>
                  {courses.slice(0,3).map((c:any,i:number)=>(
                    <div key={i} className="ec-course-item" onClick={()=>{setSelectedCourse(c.id);setActiveTab("manage");}}>
                      <div className="ec-course-ico" style={{background:gradients[i%gradients.length]}}>
                        <span>{COURSE_ICONS[i%COURSE_ICONS.length]}</span>
                      </div>
                      <div className="ec-course-info">
                        <div className="ec-course-name">{c.title}</div>
                        <div className="ec-course-meta">Grade {c.grade} · {c.lessonCount||0} lessons</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TAB: PROCESS DOCUMENTS ═══════════ */}
        {activeTab==="upload" && (
          <div className="ec-main-grid">
            {/* Left: Upload + options */}
            <div className="ec-card">
              <div className="ec-card-hd">
                <div className="ec-card-title"><Svg d={ICONS.upload} size={18}/>Advanced Document Processing</div>
              </div>

              {/* Course select */}
              <div className="ec-form-group">
                <label className="ec-label">Target Course *</label>
                <select className="ec-select"
                  value={selectedCourse||""}
                  onChange={e=>setSelectedCourse(Number(e.target.value)||null)}>
                  <option value="">Select a course…</option>
                  {courses.map((c:any)=><option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              {/* Drop zone */}
              <div
                ref={dropRef}
                className={`ec-drop-zone${dragging?" dragging":""}`}
                onClick={()=>fileRef.current?.click()}
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={()=>setDragging(false)}
                onDrop={onDrop}>
                <div className="ec-drop-icon"><Svg d={ICONS.upload} size={28}/></div>
                <div className="ec-drop-title">{dragging?"Drop it here!":"Drag & drop your document"}</div>
                <div className="ec-drop-sub">or click to browse files</div>
                <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
                  <span className="ec-drop-pill edp-pdf"><Svg d={ICONS.pdf} size={11}/>PDF</span>
                  <span className="ec-drop-pill edp-docx"><Svg d={ICONS.file} size={11}/>DOCX</span>
                  <span className="ec-drop-pill edp-txt"><Svg d={ICONS.file} size={11}/>TXT</span>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt"
                  style={{display:"none"}} onChange={onFileChange}/>
              </div>

              {/* Selected file */}
              {selectedFile && (
                <div className="ec-file-selected">
                  <div className="ec-file-ico"><Svg d={ICONS.pdf} size={18}/></div>
                  <div>
                    <div className="ec-file-name">{selectedFile.name}</div>
                    <div className="ec-file-size">{(selectedFile.size/1024).toFixed(1)} KB</div>
                  </div>
                  <button className="ec-file-close" onClick={()=>setSelectedFile(null)}>
                    <Svg d={ICONS.close} size={12}/>
                  </button>
                </div>
              )}

              {/* Processing mode */}
              <div style={{marginTop:18}}>
                <div className="ec-form-group">
                  <label className="ec-label">Processing Mode</label>
                </div>
                <div className="ec-mode-grid">
                  {[
                    {key:"basic",         icon:"⚡", label:"Basic",         desc:"Fast extraction, essential content"},
                    {key:"advanced",      icon:"🧠", label:"Advanced NLP",   desc:"Deep analysis, concept mapping"},
                    {key:"comprehensive", icon:"🔬", label:"Comprehensive",  desc:"Full AI: quizzes, exercises, maps"},
                  ].map((m)=>(
                    <div key={m.key}
                      className={`ec-mode-card${processingMode===m.key?" selected":""}`}
                      onClick={()=>setProcessingMode(m.key as any)}>
                      <div className="ec-mode-icon">{m.icon}</div>
                      <div className="ec-mode-label">{m.label}</div>
                      <div className="ec-mode-desc">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options toggles */}
              <div style={{marginTop:14}}>
                <label className="ec-label" style={{display:"block",marginBottom:10}}>Processing Options</label>
                {[
                  {key:"extractConcepts",   label:"Extract Key Concepts",      desc:"NLP concept mapping",          badge:"NLP"},
                  {key:"generateExercises", label:"Generate Practice Exercises",desc:"AI-crafted practice problems", badge:"AI"},
                  {key:"createQuizzes",     label:"Create Assessment Quizzes",  desc:"Auto-graded quiz sets",        badge:"Auto"},
                ].map((opt)=>(
                  <div key={opt.key}
                    className={`ec-option${(opts as any)[opt.key]?" on":""}`}
                    onClick={()=>setOpts(o=>({...o,[opt.key]:!(o as any)[opt.key]}))}>
                    <div className="ec-opt-check">
                      {(opts as any)[opt.key] && <Svg d={ICONS.check} size={12}/>}
                    </div>
                    <div className="ec-opt-label">
                      <div className="ec-opt-title">{opt.label}</div>
                      <div className="ec-opt-sub">{opt.desc}</div>
                    </div>
                    <span className="ec-opt-badge">{opt.badge}</span>
                  </div>
                ))}
              </div>

              {/* Progress */}
              {processDoc.isPending && (
                <div className="ec-progress-wrap">
                  <div className="ec-progress-hd">
                    <span>Processing…</span><span>{progress}%</span>
                  </div>
                  <div className="ec-progress-bg">
                    <div className="ec-progress-fill" style={{width:`${progress}%`}}/>
                  </div>
                  <div className="ec-progress-steps">
                    {STEPS.map((s,i)=>(
                      <span key={i} className={`ec-progress-step ${i<progressStep?"eps-done":i===progressStep?"eps-active":"eps-pending"}`}>
                        {i<progressStep?<Svg d={ICONS.check} size={11}/>:null}
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button className="ec-submit-btn"
                style={{marginTop:18}}
                disabled={processDoc.isPending||!selectedFile||!selectedCourse}
                onClick={handleProcess}>
                {processDoc.isPending
                  ? <><svg className="ec-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Analysing with AI…</>
                  : <><Svg d={ICONS.brain} size={16}/>Process with Advanced NLP</>
                }
              </button>
            </div>

            {/* Right: Results */}
            <div className="ec-card">
              <div className="ec-card-hd">
                <div className="ec-card-title"><Svg d={ICONS.target} size={18}/>Processing Results</div>
                {processingResult && (
                  <button className="ec-view-btn"><Svg d={ICONS.download} size={13}/>Export</button>
                )}
              </div>

              {processingResult ? (
                <>
                  <div className="ec-result-banner">
                    <div className="ec-result-ico"><Svg d={ICONS.check} size={18}/></div>
                    <div>
                      <div className="ec-result-title">Processing Complete 🎉</div>
                      <div className="ec-result-sub">{processingResult.message||"Document successfully analysed and lessons created"}</div>
                    </div>
                  </div>

                  <div className="ec-result-chips">
                    <div className="ec-result-chip erc-green">
                      <div className="ec-chip-num">{processingResult.lessons?.length||processingResult.lessonsCreated||0}</div>
                      <div className="ec-chip-label">Lessons</div>
                    </div>
                    <div className="ec-result-chip erc-blue">
                      <div className="ec-chip-num">{processingResult.totalPages||0}</div>
                      <div className="ec-chip-label">Pages</div>
                    </div>
                    <div className="ec-result-chip erc-purple">
                      <div className="ec-chip-num">{processingResult.conceptMap?.length||0}</div>
                      <div className="ec-chip-label">Concepts</div>
                    </div>
                  </div>

                  <div className="ec-meta-row">
                    <span className="ec-meta-label">Subject Classification</span>
                    <span className="ec-meta-badge">{processingResult.subjectClassification||"Auto-detected"}</span>
                  </div>
                  <div className="ec-meta-row">
                    <span className="ec-meta-label">Reading Level</span>
                    <span className="ec-meta-badge">{processingResult.readingLevel||"Intermediate"}</span>
                  </div>
                  <div className="ec-meta-row">
                    <span className="ec-meta-label">Word Count</span>
                    <span className="ec-meta-val">{(processingResult.wordCount||0).toLocaleString()}</span>
                  </div>

                  {processingResult.conceptMap?.length > 0 && (
                    <div style={{marginTop:16}}>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--ec-text2)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>Key Concepts Extracted</div>
                      <div className="ec-concept-chips">
                        {processingResult.conceptMap.slice(0,10).map((c:any,i:number)=>(
                          <span key={i} className="ec-concept-chip">{c.concept||c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lesson previews */}
                  {processingResult.lessons?.length > 0 && (
                    <div style={{marginTop:20}}>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--ec-text2)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>Generated Lessons</div>
                      <div className="ec-scroll">
                        {processingResult.lessons.slice(0,5).map((l:any,i:number)=>(
                          <div key={i} className="ec-lesson">
                            <div className="ec-lesson-hd">
                              <div>
                                <div className="ec-lesson-title">{l.title}</div>
                                <div className="ec-lesson-meta">{l.estimatedDuration||20}min · {l.topics?.length||0} topics</div>
                              </div>
                              <div className="ec-lesson-actions">
                                <button className="ec-course-action"><Svg d={ICONS.eye} size={13}/></button>
                              </div>
                            </div>
                            <div className="ec-lesson-tags">
                              <span className={`ec-lesson-tag ${l.difficulty==="beginner"?"elt-diff-beg":l.difficulty==="advanced"?"elt-diff-adv":"elt-diff-mid"}`}>
                                {l.difficulty||"intermediate"}
                              </span>
                              {l.topics?.slice(0,2).map((t:string,ti:number)=>(
                                <span key={ti} className="ec-lesson-tag elt-topic">{t}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="ec-empty">
                  <div className="ec-empty-ico"><Svg d={ICONS.file} size={26}/></div>
                  <div className="ec-empty-title">No results yet</div>
                  <div className="ec-empty-sub">Upload and process a document to see AI-generated lessons, concept maps, and analytics here</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TAB: MANAGE CONTENT ═══════════ */}
        {activeTab==="manage" && (
          <div className="ec-main-grid">
            {/* Course list */}
            <div className="ec-card">
              <div className="ec-card-hd">
                <div className="ec-card-title"><Svg d={ICONS.book} size={18}/>Your Courses ({courses.length})</div>
                <button className="ec-view-btn" onClick={()=>setActiveTab("create")}>
                  <Svg d={ICONS.plus} size={13}/>New Course
                </button>
              </div>
              {courses.length === 0 ? (
                <div className="ec-empty">
                  <div className="ec-empty-ico"><Svg d={ICONS.book} size={26}/></div>
                  <div className="ec-empty-title">No courses yet</div>
                  <div className="ec-empty-sub">Create your first course to start building content</div>
                </div>
              ) : (
                <div className="ec-scroll">
                  {courses.map((c:any,i:number)=>(
                    <div key={c.id}
                      className={`ec-course-item${selectedCourse===c.id?" selected":""}`}
                      onClick={()=>setSelectedCourse(c.id)}>
                      <div className="ec-course-ico" style={{background:gradients[i%gradients.length]}}>
                        <span style={{fontSize:18}}>{COURSE_ICONS[i%COURSE_ICONS.length]}</span>
                      </div>
                      <div className="ec-course-info">
                        <div className="ec-course-name">{c.title}</div>
                        <div className="ec-course-meta">Grade {c.grade} · {c.lessonCount||0} lessons</div>
                      </div>
                      <span className="ec-course-badge">{c.lessonCount||0}</span>
                      <div className="ec-course-actions">
                        <button className="ec-course-action" title="Edit"><Svg d={ICONS.edit} size={13}/></button>
                        <button className="ec-course-action" title="Delete"><Svg d={ICONS.trash} size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lesson viewer */}
            <div className="ec-card">
              <div className="ec-card-hd">
                <div className="ec-card-title"><Svg d={ICONS.layers} size={18}/>Lessons {selectedCourse?`(${lessons.length})`:""}</div>
                {selectedCourse && (
                  <button className="ec-view-btn" onClick={()=>setActiveTab("upload")}>
                    <Svg d={ICONS.upload} size={13}/>Add via PDF
                  </button>
                )}
              </div>
              {!selectedCourse ? (
                <div className="ec-empty">
                  <div className="ec-empty-ico"><Svg d={ICONS.layers} size={26}/></div>
                  <div className="ec-empty-title">Select a course</div>
                  <div className="ec-empty-sub">Click a course on the left to view and manage its lessons</div>
                </div>
              ) : lessons.length === 0 ? (
                <div className="ec-empty">
                  <div className="ec-empty-ico"><Svg d={ICONS.file} size={26}/></div>
                  <div className="ec-empty-title">No lessons yet</div>
                  <div className="ec-empty-sub">Process a PDF document to auto-generate lessons for this course</div>
                </div>
              ) : (
                <div className="ec-scroll">
                  {lessons.map((l:any,i:number)=>(
                    <div key={l.id||i} className="ec-lesson">
                      <div className="ec-lesson-hd">
                        <div>
                          <div className="ec-lesson-title">{l.title}</div>
                          <div className="ec-lesson-meta">
                            {l.estimatedDuration&&`${l.estimatedDuration}min · `}
                            {l.topics?.length||0} topics
                          </div>
                        </div>
                        <div className="ec-lesson-actions">
                          <button className="ec-course-action" title="View"><Svg d={ICONS.eye} size={13}/></button>
                          <button className="ec-course-action" title="Edit"><Svg d={ICONS.edit} size={13}/></button>
                          <button className="ec-course-action" title="Delete"><Svg d={ICONS.trash} size={13}/></button>
                        </div>
                      </div>
                      {l.summary && (
                        <div style={{fontSize:12.5,color:"var(--ec-text3)",lineHeight:1.5,marginBottom:8}}>{l.summary}</div>
                      )}
                      <div className="ec-lesson-tags">
                        {l.difficulty && (
                          <span className={`ec-lesson-tag ${l.difficulty==="beginner"?"elt-diff-beg":l.difficulty==="advanced"?"elt-diff-adv":"elt-diff-mid"}`}>
                            {l.difficulty}
                          </span>
                        )}
                        {l.estimatedDuration && (
                          <span className="ec-lesson-tag elt-topic" style={{display:"flex",alignItems:"center",gap:4}}>
                            <Svg d={ICONS.clock} size={10}/>{l.estimatedDuration}min
                          </span>
                        )}
                        {l.topics?.slice(0,2).map((t:string,ti:number)=>(
                          <span key={ti} className="ec-lesson-tag elt-topic">
                            <Svg d={ICONS.tag} size={10}/> {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TAB: ANALYTICS ═══════════ */}
        {activeTab==="analytics" && (
          <>
            {/* Analytics stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
              {[
                {label:"Total Courses",   value:courses.length,           badge:"All",      cls:"ec-sc-green",  ico:"esi-green",  icon:ICONS.book,   trend:"↑ Growing"},
                {label:"Total Lessons",   value:totalLessons,             badge:"AI-Built", cls:"ec-sc-blue",   ico:"esi-blue",   icon:ICONS.layers, trend:"Auto-generated"},
                {label:"Avg Lessons",     value:courses.length?Math.round(totalLessons/courses.length):0, badge:"Per Course", cls:"ec-sc-purple", ico:"esi-purple", icon:ICONS.chart, trend:"Good coverage"},
                {label:"AI Sessions",     value:processingResult?1:0,     badge:"Runs",     cls:"ec-sc-amber",  ico:"esi-amber",  icon:ICONS.brain,  trend:"NLP powered"},
              ].map((s,i)=>(
                <div key={i} className={`ec-stat-card ${s.cls}`} style={{animationDelay:`${i*.08}s`}}>
                  <div className="ec-stat-top">
                    <div className={`ec-stat-icon ${s.ico}`}><Svg d={s.icon} size={20}/></div>
                    <span className="ec-stat-badge">{s.badge}</span>
                  </div>
                  <div className="ec-stat-num"><AnimNum target={s.value}/></div>
                  <div className="ec-stat-label">{s.label}</div>
                  <div className="ec-stat-trend">{s.trend}</div>
                </div>
              ))}
            </div>

            <div className="ec-analytics-grid">
              {/* Bar chart */}
              <div className="ec-card">
                <div className="ec-card-hd">
                  <div className="ec-card-title"><Svg d={ICONS.chart} size={18}/>Weekly Upload Activity</div>
                  <select className="ec-select" style={{width:"auto",padding:"4px 10px",fontSize:12}}>
                    <option>7 days</option><option>30 days</option>
                  </select>
                </div>
                <div className="ec-bar-chart">
                  {barData.map((v,i)=>(
                    <div key={i} className="ec-bar-col">
                      <div className="ec-bar"
                        style={{
                          height:`${(v/barMax)*90}%`,
                          background:`linear-gradient(180deg,#10b981,${i%2===0?"#0ea5e9":"#6366f1"})`,
                          animationDelay:`${.1+i*.08}s`,
                          borderRadius:5,
                        }}/>
                      <div className="ec-bar-lbl">{barDays[i]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Snapshot bars */}
              <div className="ec-card">
                <div className="ec-card-hd"><div className="ec-card-title"><Svg d={ICONS.trend} size={18}/>Content Health</div></div>
                {[
                  {label:"Courses with Lessons", val:`${courses.filter((c:any)=>c.lessonCount>0).length}/${courses.length}`, pct:courses.length?Math.round(courses.filter((c:any)=>c.lessonCount>0).length/courses.length*100):0, cls:"linear-gradient(90deg,#10b981,#34d399)"},
                  {label:"AI-Generated Content",  val:`${processingResult?.lessons?.length||0} lessons`,                         pct:Math.min(100,(processingResult?.lessons?.length||0)*10), cls:"linear-gradient(90deg,#0ea5e9,#60a5fa)"},
                  {label:"Concept Coverage",      val:`${processingResult?.conceptMap?.length||0} concepts`,                     pct:Math.min(100,(processingResult?.conceptMap?.length||0)*5), cls:"linear-gradient(90deg,#6366f1,#8b5cf6)"},
                  {label:"Processing Success",    val:processingResult?"100%":"0%",                                             pct:processingResult?100:0, cls:"linear-gradient(90deg,#f59e0b,#fbbf24)"},
                ].map((b,i)=>(
                  <div key={i} className="ec-snap-row">
                    <div className="ec-snap-hd">
                      <span className="ec-snap-label">{b.label}</span>
                      <span className="ec-snap-val">{b.val}</span>
                    </div>
                    <div className="ec-snap-bg">
                      <div className="ec-snap-fill" style={{width:`${b.pct}%`,background:b.cls}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Course breakdown table */}
            <div className="ec-card">
              <div className="ec-card-hd">
                <div className="ec-card-title"><Svg d={ICONS.book} size={18}/>Course Overview</div>
                <button className="ec-view-btn"><Svg d={ICONS.download} size={13}/>Export</button>
              </div>
              {courses.length === 0 ? (
                <div className="ec-empty">
                  <div className="ec-empty-ico"><Svg d={ICONS.book} size={26}/></div>
                  <div className="ec-empty-title">No course data yet</div>
                  <div className="ec-empty-sub">Create courses to see analytics here</div>
                </div>
              ) : (
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead>
                      <tr>
                        {["Course","Grade","Lessons","Status","Progress"].map(h=>(
                          <th key={h} style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--ec-text3)",padding:"10px 14px",textAlign:"left",borderBottom:"1px solid var(--ec-row-border)"}}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c:any,i:number)=>{
                        const pct = Math.min(100,Math.round((c.lessonCount||0)*12));
                        return(
                          <tr key={c.id} style={{cursor:"pointer",transition:"background .15s"}}
                            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="var(--ec-table-hover)"}
                            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                            <td style={{padding:"12px 14px"}}>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <div style={{width:34,height:34,borderRadius:9,background:gradients[i%gradients.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                                  {COURSE_ICONS[i%COURSE_ICONS.length]}
                                </div>
                                <div style={{fontWeight:700,fontSize:13.5,color:"var(--ec-text)"}}>{c.title}</div>
                              </div>
                            </td>
                            <td style={{padding:"12px 14px",fontSize:13,color:"var(--ec-text4)"}}>Grade {c.grade}</td>
                            <td style={{padding:"12px 14px",fontSize:13,fontWeight:700,color:"var(--ec-text)"}}>{c.lessonCount||0}</td>
                            <td style={{padding:"12px 14px"}}>
                              <span style={{padding:"3px 10px",borderRadius:8,fontSize:11.5,fontWeight:700,background:"rgba(16,185,129,.1)",color:"#10b981",border:"1px solid rgba(16,185,129,.2)"}}>
                                {(c.lessonCount||0)>0?"Active":"Empty"}
                              </span>
                            </td>
                            <td style={{padding:"12px 14px",minWidth:120}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <div style={{flex:1,height:6,background:"var(--ec-bar-bg)",borderRadius:6,overflow:"hidden"}}>
                                  <div style={{height:"100%",borderRadius:6,width:`${pct}%`,background:"linear-gradient(90deg,#10b981,#0ea5e9)",transition:"width .8s"}}/>
                                </div>
                                <span style={{fontSize:11.5,fontWeight:700,color:"var(--ec-text4)",minWidth:32}}>{pct}%</span>
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
          </>
        )}
      </div>
    </>
  );
}
