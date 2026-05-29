import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";

/* ─── CSS (mirrors teacher dashboard design tokens) ─────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --sd-bg:          #f8fafc;
  --sd-card:        #ffffff;
  --sd-card2:       #fafafa;
  --sd-border:      rgba(0,0,0,.06);
  --sd-border2:     #f3f4f6;
  --sd-shadow:      0 2px 12px rgba(0,0,0,.05);
  --sd-shadow2:     0 12px 32px rgba(0,0,0,.10);
  --sd-text:        #0f172a;
  --sd-text2:       #64748b;
  --sd-text3:       #94a3b8;
  --sd-text4:       #374151;
  --sd-bar-bg:      #f1f5f9;
  --sd-btn-bg:      #ffffff;
  --sd-btn-text:    #374151;
  --sd-btn-hover:   #f5f3ff;
  --sd-btn-htext:   #6366f1;
  --sd-badge-bg:    #f9fafb;
  --sd-badge-text:  #9ca3af;
  --sd-sel-bg:      #ffffff;
  --sd-sel-text:    #374151;
  --sd-sel-border:  #e5e7eb;
  --sd-input-bg:    #ffffff;
  --sd-input-text:  #374151;
  --sd-table-hover: #f8fafc;
  --sd-row-border:  #f3f4f6;
  --sd-modal-bg:    #ffffff;
  --sd-modal-overlay: rgba(0,0,0,.5);
  --sd-tab-active:  #6366f1;
  --sd-tab-bg:      #f1f5f9;
}
[data-theme="dark"] {
  --sd-bg:          #0b1120;
  --sd-card:        #141f35;
  --sd-card2:       #1a2540;
  --sd-border:      rgba(255,255,255,.07);
  --sd-border2:     rgba(255,255,255,.06);
  --sd-shadow:      0 2px 12px rgba(0,0,0,.3);
  --sd-shadow2:     0 12px 32px rgba(0,0,0,.5);
  --sd-text:        #f1f5f9;
  --sd-text2:       #94a3b8;
  --sd-text3:       #64748b;
  --sd-text4:       #cbd5e1;
  --sd-bar-bg:      rgba(255,255,255,.07);
  --sd-btn-bg:      rgba(255,255,255,.06);
  --sd-btn-text:    #94a3b8;
  --sd-btn-hover:   rgba(99,102,241,.18);
  --sd-btn-htext:   #a5b4fc;
  --sd-badge-bg:    rgba(255,255,255,.08);
  --sd-badge-text:  #64748b;
  --sd-sel-bg:      #1a2540;
  --sd-sel-text:    #94a3b8;
  --sd-sel-border:  rgba(255,255,255,.12);
  --sd-input-bg:    #1a2540;
  --sd-input-text:  #94a3b8;
  --sd-table-hover: rgba(255,255,255,.03);
  --sd-row-border:  rgba(255,255,255,.05);
  --sd-modal-bg:    #141f35;
  --sd-modal-overlay: rgba(0,0,0,.75);
  --sd-tab-active:  #6366f1;
  --sd-tab-bg:      rgba(255,255,255,.05);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.sd-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  padding: 24px 28px;
  max-width: 1280px;
  margin: 0 auto;
  color: var(--sd-text);
  transition: color .3s ease;
}

/* ── Hero (matches td-hero exactly) ── */
.sd-hero {
  border-radius: 24px; padding: 32px 36px; margin-bottom: 28px;
  position: relative; overflow: hidden; color: #fff;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  animation: heroIn .6s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes heroIn { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:none} }
.sd-hero::before { content:''; position:absolute; top:-50px; right:-50px; width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,.1); }
.sd-hero::after  { content:''; position:absolute; bottom:-60px; left:20%; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,.07); }
.sd-float { position:absolute; border-radius:50%; background:rgba(255,255,255,.06); animation:sdFloat 6s ease-in-out infinite; }
@keyframes sdFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
.sd-hero-inner  { display:flex; align-items:center; justify-content:space-between; position:relative; z-index:1; gap:20px; }
.sd-hero-title  { font-size:clamp(18px,3vw,26px); font-weight:800; margin-bottom:6px; }
.sd-hero-sub    { font-size:14px; opacity:.75; }
.sd-hero-stats  { display:flex; align-items:center; gap:20px; flex-shrink:0; }
.sd-hero-stat   { text-align:center; }
.sd-hero-sn     { font-size:30px; font-weight:800; line-height:1; }
.sd-hero-sl     { font-size:12px; opacity:.65; margin-top:2px; }
.sd-hero-div    { width:1px; height:44px; background:rgba(255,255,255,.2); }
.sd-hero-btn {
  padding: 12px 24px; background: #fff; color: #6d28d9;
  border: none; border-radius: 14px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: all .2s;
  box-shadow: 0 4px 16px rgba(0,0,0,.15); white-space: nowrap;
}
.sd-hero-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.2); }
.sd-hero-btn-outline {
  padding: 12px 20px; background: rgba(255,255,255,.15);
  color: #fff; border: 1.5px solid rgba(255,255,255,.35);
  border-radius: 14px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: all .2s; white-space: nowrap;
  backdrop-filter: blur(6px);
}
.sd-hero-btn-outline:hover { background: rgba(255,255,255,.25); transform:translateY(-2px); }

/* ── Stats grid (4 cols → 2 → 1) ── */
.sd-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
.sd-stat-card {
  background: var(--sd-card); border-radius:18px; padding:20px;
  border:1px solid var(--sd-border); box-shadow: var(--sd-shadow);
  transition:all .25s; cursor:default; position:relative; overflow:hidden;
  animation: cardUp .5s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cardUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
.sd-stat-card:nth-child(1){animation-delay:.07s} .sd-stat-card:nth-child(2){animation-delay:.14s}
.sd-stat-card:nth-child(3){animation-delay:.21s} .sd-stat-card:nth-child(4){animation-delay:.28s}
.sd-stat-card::after { content:''; position:absolute; top:-20px; right:-20px; width:80px; height:80px; border-radius:50%; opacity:.08; transition:transform .3s; }
.sd-stat-card:hover { transform:translateY(-4px); box-shadow: var(--sd-shadow2); }
.sd-stat-card:hover::after { transform:scale(1.4); }
.sd-stat-card.vio  { border-top:3px solid #6366f1; } .sd-stat-card.vio::after  { background:#6366f1; }
.sd-stat-card.sky  { border-top:3px solid #0ea5e9; } .sd-stat-card.sky::after  { background:#0ea5e9; }
.sd-stat-card.rose { border-top:3px solid #f43f5e; } .sd-stat-card.rose::after { background:#f43f5e; }
.sd-stat-card.lime { border-top:3px solid #84cc16; } .sd-stat-card.lime::after { background:#84cc16; }
.sd-stat-top   { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.sd-stat-icon  { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
.sd-stat-icon svg { width:20px; height:20px; }
.ssi-vio  { background:rgba(99,102,241,.12);  color:#6366f1; }
.ssi-sky  { background:rgba(14,165,233,.12);  color:#0ea5e9; }
.ssi-rose { background:rgba(244,63,94,.12);   color:#f43f5e; }
.ssi-lime { background:rgba(132,204,22,.12);  color:#84cc16; }
[data-theme="dark"] .ssi-vio  { background:rgba(99,102,241,.22); }
[data-theme="dark"] .ssi-sky  { background:rgba(14,165,233,.22); }
[data-theme="dark"] .ssi-rose { background:rgba(244,63,94,.22); }
[data-theme="dark"] .ssi-lime { background:rgba(132,204,22,.22); }
.sd-stat-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; color: var(--sd-badge-text); background: var(--sd-badge-bg); }
.sd-stat-num   { font-size:32px; font-weight:800; color: var(--sd-text); letter-spacing:-1px; line-height:1; margin-bottom:4px; }
.sd-stat-label { font-size:13px; color: var(--sd-text2); font-weight:500; }
.sd-stat-trend { font-size:11.5px; color:#10b981; margin-top:4px; font-weight:600; }
[data-theme="dark"] .sd-stat-trend { color:#34d399; }

/* ── Alert cards row ── */
.sd-alerts-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:28px; }
.sd-alert-card { border-radius:16px; padding:18px; position:relative; overflow:hidden; animation:cardUp .5s .35s both; }
.sd-alert-card::before { content:''; position:absolute; top:-20px; right:-20px; width:70px; height:70px; border-radius:50%; opacity:.15; }
.sd-alert-card.purple { background:linear-gradient(135deg,#f5f3ff,#ede9fe); border:1px solid #c4b5fd; }
.sd-alert-card.purple::before { background:#8b5cf6; }
.sd-alert-card.sky    { background:linear-gradient(135deg,#eff6ff,#e0f2fe); border:1px solid #bae6fd; }
.sd-alert-card.sky::before    { background:#0ea5e9; }
.sd-alert-card.green  { background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1px solid #bbf7d0; }
.sd-alert-card.green::before  { background:#10b981; }
[data-theme="dark"] .sd-alert-card.purple { background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(99,102,241,.07)); border-color:rgba(139,92,246,.28); }
[data-theme="dark"] .sd-alert-card.sky    { background:linear-gradient(135deg,rgba(14,165,233,.12),rgba(59,130,246,.07)); border-color:rgba(14,165,233,.28); }
[data-theme="dark"] .sd-alert-card.green  { background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(52,211,153,.07)); border-color:rgba(16,185,129,.28); }
.sd-alert-emoji { font-size:26px; margin-bottom:8px; }
.sd-alert-title { font-size:13.5px; font-weight:700; color: var(--sd-text); margin-bottom:3px; }
.sd-alert-sub   { font-size:12px; color: var(--sd-text2); }
.sd-alert-num   { font-size:26px; font-weight:800; color: var(--sd-text); margin-top:6px; }

/* ── Filters bar ── */
.sd-filters {
  background: var(--sd-card); border-radius:16px; padding:16px 20px;
  border:1px solid var(--sd-border); box-shadow: var(--sd-shadow);
  display:flex; align-items:center; gap:12px; margin-bottom:20px;
  flex-wrap:wrap; animation:cardUp .5s .38s both;
}
.sd-search-wrap { position:relative; flex:1; min-width:200px; }
.sd-search-ico  { position:absolute; left:12px; top:50%; transform:translateY(-50%); color: var(--sd-text3); pointer-events:none; }
.sd-search-ico svg { width:16px; height:16px; }
.sd-search {
  width:100%; padding:9px 12px 9px 38px; border-radius:11px;
  border:1px solid var(--sd-sel-border); font-size:13.5px;
  background: var(--sd-input-bg); color: var(--sd-input-text);
  font-family:inherit; outline:none; transition:border-color .15s;
}
.sd-search:focus { border-color:#6366f1; }
.sd-search::placeholder { color: var(--sd-text3); }
.sd-select {
  padding:9px 12px; border-radius:11px; border:1px solid var(--sd-sel-border);
  background: var(--sd-sel-bg); color: var(--sd-sel-text); font-size:13px;
  font-family:inherit; cursor:pointer; outline:none; transition:border-color .15s;
  min-width:120px;
}
.sd-select:focus { border-color:#6366f1; }
.sd-filter-count {
  padding:6px 14px; border-radius:10px; font-size:12.5px; font-weight:700;
  background: rgba(99,102,241,.1); color:#6366f1; white-space:nowrap; flex-shrink:0;
}
[data-theme="dark"] .sd-filter-count { background:rgba(99,102,241,.2); color:#a5b4fc; }

/* ── Add Student button ── */
.sd-add-btn {
  padding:9px 18px; border-radius:11px; font-size:13px; font-weight:700;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none;
  cursor:pointer; font-family:inherit; transition:all .2s; display:flex; align-items:center; gap:7px;
  box-shadow:0 4px 12px rgba(99,102,241,.4); white-space:nowrap; flex-shrink:0;
}
.sd-add-btn:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(99,102,241,.5); }
.sd-add-btn svg   { width:15px; height:15px; }

/* ── Students table card ── */
.sd-table-card {
  background: var(--sd-card); border-radius:20px;
  border:1px solid var(--sd-border); box-shadow: var(--sd-shadow);
  overflow:hidden; animation:cardUp .5s .42s both;
  transition: background .3s ease;
}
.sd-table-hd {
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 22px; border-bottom:1px solid var(--sd-border2);
}
.sd-table-title { font-size:15px; font-weight:700; color: var(--sd-text); display:flex; align-items:center; gap:8px; }
.sd-table-title svg { width:18px; height:18px; color:#6366f1; }
.sd-view-btn {
  padding:6px 14px; border-radius:9px; border:1px solid var(--sd-sel-border);
  background: var(--sd-btn-bg); font-size:12px; font-weight:600;
  cursor:pointer; font-family:inherit; color: var(--sd-btn-text); transition:all .18s;
  display:flex; align-items:center; gap:5px;
}
.sd-view-btn:hover { background: var(--sd-btn-hover); border-color:rgba(99,102,241,.35); color: var(--sd-btn-htext); }
.sd-view-btn svg { width:13px; height:13px; }

/* Table itself */
.sd-table { width:100%; border-collapse:collapse; }
.sd-th {
  font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
  color: var(--sd-text3); padding:10px 16px; text-align:left;
  border-bottom:1px solid var(--sd-row-border); white-space:nowrap;
}
.sd-tr { transition:background .15s; cursor:pointer; }
.sd-tr:hover { background: var(--sd-table-hover); }
.sd-td {
  padding:13px 16px; font-size:13.5px; color: var(--sd-text4);
  border-bottom:1px solid var(--sd-row-border); vertical-align:middle;
}
.sd-tr:last-child .sd-td { border-bottom:0; }

/* Avatar in table */
.sd-ava {
  width:36px; height:36px; border-radius:10px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-weight:800; font-size:13px; color:#fff;
}
.sd-student-name { font-weight:700; font-size:13.5px; color: var(--sd-text); }
.sd-student-email { font-size:11.5px; color: var(--sd-text3); margin-top:2px; }

/* Badges */
.sd-badge {
  display:inline-block; padding:3px 10px; border-radius:20px;
  font-size:11.5px; font-weight:700;
}
.sb-active  { background:#d1fae5; color:#065f46; }
.sb-inactive{ background:#fee2e2; color:#991b1b; }
.sb-suspend { background:#fef3c7; color:#92400e; }
.sb-present { background:#d1fae5; color:#065f46; }
.sb-absent  { background:#fee2e2; color:#991b1b; }
.sb-late    { background:#fef3c7; color:#92400e; }
.sb-excused { background:#dbeafe; color:#1e40af; }
.sb-notmark { background: var(--sd-badge-bg); color: var(--sd-badge-text); }
.sb-grade   { background:rgba(99,102,241,.12); color:#6366f1; border:1px solid rgba(99,102,241,.2); }
[data-theme="dark"] .sb-active  { background:rgba(16,185,129,.18);  color:#6ee7b7; }
[data-theme="dark"] .sb-inactive{ background:rgba(239,68,68,.18);   color:#fca5a5; }
[data-theme="dark"] .sb-suspend { background:rgba(245,158,11,.18);  color:#fcd34d; }
[data-theme="dark"] .sb-present { background:rgba(16,185,129,.18);  color:#6ee7b7; }
[data-theme="dark"] .sb-absent  { background:rgba(239,68,68,.18);   color:#fca5a5; }
[data-theme="dark"] .sb-late    { background:rgba(245,158,11,.18);  color:#fcd34d; }
[data-theme="dark"] .sb-excused { background:rgba(59,130,246,.18);  color:#93c5fd; }
[data-theme="dark"] .sb-grade   { background:rgba(99,102,241,.22);  color:#a5b4fc; border-color:rgba(99,102,241,.3); }

/* Action buttons in table */
.sd-action-btn {
  width:30px; height:30px; border-radius:8px; border:1px solid var(--sd-sel-border);
  background: var(--sd-btn-bg); display:inline-flex; align-items:center;
  justify-content:center; cursor:pointer; transition:all .18s; color: var(--sd-text3);
}
.sd-action-btn svg { width:13px; height:13px; }
.sd-action-btn:hover { background: var(--sd-btn-hover); border-color:rgba(99,102,241,.35); color:#6366f1; }

/* Attendance bar mini */
.sd-att-bar { display:flex; align-items:center; gap:8px; }
.sd-att-bg  { flex:1; height:5px; background: var(--sd-bar-bg); border-radius:4px; overflow:hidden; min-width:50px; }
.sd-att-fill { height:100%; border-radius:4px; transition:width .8s; }
.sd-att-pct { font-size:11.5px; font-weight:700; color: var(--sd-text4); min-width:32px; }

/* Snap bars */
.sd-snap-bar-bg { height:7px; background: var(--sd-bar-bg); border-radius:6px; overflow:hidden; }
.sd-snap-bar-fill { height:100%; border-radius:6px; transition:width .8s; }

/* ── MODAL OVERLAY ── */
.sd-overlay {
  position:fixed; inset:0; z-index:1000;
  background: var(--sd-modal-overlay); backdrop-filter:blur(4px);
  display:flex; align-items:center; justify-content:center; padding:20px;
  animation:fadeIn .2s ease;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.sd-modal {
  background: var(--sd-modal-bg); border-radius:24px;
  border:1px solid var(--sd-border); box-shadow: 0 40px 80px rgba(0,0,0,.3);
  width:100%; max-width:800px; max-height:90vh; overflow-y:auto;
  animation:modalIn .3s cubic-bezier(.34,1.56,.64,1);
}
@keyframes modalIn { from{opacity:0;transform:scale(.93) translateY(20px)} to{opacity:1;transform:none} }
.sd-modal-sm {
  background: var(--sd-modal-bg); border-radius:24px;
  border:1px solid var(--sd-border); box-shadow: 0 40px 80px rgba(0,0,0,.3);
  width:100%; max-width:520px; max-height:90vh; overflow-y:auto;
  animation:modalIn .3s cubic-bezier(.34,1.56,.64,1);
}
.sd-modal-hd {
  padding:24px 28px 0; display:flex; align-items:center; justify-content:space-between;
  position:sticky; top:0; background: var(--sd-modal-bg); z-index:10;
  border-bottom:1px solid var(--sd-border2); padding-bottom:16px;
}
.sd-modal-title { font-size:17px; font-weight:800; color: var(--sd-text); }
.sd-modal-sub   { font-size:12.5px; color: var(--sd-text2); margin-top:3px; }
.sd-modal-close {
  width:32px; height:32px; border-radius:10px; border:1px solid var(--sd-sel-border);
  background: var(--sd-btn-bg); display:flex; align-items:center; justify-content:center;
  cursor:pointer; color: var(--sd-text3); transition:all .18s;
}
.sd-modal-close:hover { background:#fee2e2; color:#f43f5e; border-color:#fecaca; }
.sd-modal-close svg { width:14px; height:14px; }
.sd-modal-body { padding:24px 28px; }

/* ── Tabs ── */
.sd-tabs { display:flex; gap:4px; background: var(--sd-tab-bg); border-radius:12px; padding:4px; margin-bottom:20px; }
.sd-tab {
  flex:1; padding:8px 12px; border-radius:9px; border:none; font-size:12.5px; font-weight:600;
  cursor:pointer; font-family:inherit; color: var(--sd-text2); background:transparent;
  transition:all .2s; display:flex; align-items:center; justify-content:center; gap:5px;
}
.sd-tab svg { width:13px; height:13px; }
.sd-tab.active { background: #6366f1; color:#fff; box-shadow:0 2px 10px rgba(99,102,241,.4); }
[data-theme="dark"] .sd-tab.active { box-shadow:0 2px 10px rgba(99,102,241,.6); }

/* ── Form elements ── */
.sd-form-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.sd-form-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
.sd-form-group { display:flex; flex-direction:column; gap:5px; }
.sd-label { font-size:12px; font-weight:700; color: var(--sd-text2); letter-spacing:.03em; text-transform:uppercase; }
.sd-input, .sd-textarea, .sd-form-select {
  padding:10px 13px; border-radius:11px; border:1.5px solid var(--sd-sel-border);
  background: var(--sd-input-bg); color: var(--sd-input-text); font-size:13.5px;
  font-family:inherit; outline:none; transition:border-color .15s, box-shadow .15s; width:100%;
}
.sd-textarea { resize:vertical; min-height:80px; }
.sd-input:focus, .sd-textarea:focus, .sd-form-select:focus {
  border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1);
}
.sd-input::placeholder, .sd-textarea::placeholder { color: var(--sd-text3); }
.sd-form-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; padding-top:16px; border-top:1px solid var(--sd-border2); }
.sd-cancel-btn {
  padding:10px 20px; border-radius:11px; border:1.5px solid var(--sd-sel-border);
  background: var(--sd-btn-bg); color: var(--sd-btn-text); font-size:13.5px; font-weight:700;
  cursor:pointer; font-family:inherit; transition:all .18s;
}
.sd-cancel-btn:hover { background: var(--sd-btn-hover); border-color:rgba(99,102,241,.3); color: var(--sd-btn-htext); }
.sd-submit-btn {
  padding:10px 24px; border-radius:11px; border:none;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; font-size:13.5px; font-weight:700;
  cursor:pointer; font-family:inherit; transition:all .2s;
  box-shadow:0 4px 12px rgba(99,102,241,.4);
}
.sd-submit-btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(99,102,241,.5); }
.sd-submit-btn:disabled { opacity:.6; cursor:not-allowed; transform:none; }

/* ── Detail modal internals ── */
.sd-detail-hero {
  border-radius:16px; padding:20px; margin-bottom:20px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff; display:flex; align-items:center; gap:16px;
}
.sd-detail-ava {
  width:64px; height:64px; border-radius:18px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-weight:900; font-size:22px; color:#fff;
  border:3px solid rgba(255,255,255,.3);
}
.sd-detail-name  { font-size:20px; font-weight:800; line-height:1.2; }
.sd-detail-meta  { font-size:13px; opacity:.8; margin-top:4px; }
.sd-detail-badges{ display:flex; gap:8px; margin-top:8px; flex-wrap:wrap; }
.sd-detail-badge {
  padding:3px 12px; border-radius:999px; font-size:11px; font-weight:700;
  background:rgba(255,255,255,.2); color:#fff; border:1px solid rgba(255,255,255,.3);
}

/* Info grid */
.sd-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
.sd-info-card {
  background: var(--sd-card2); border-radius:14px; padding:16px;
  border:1px solid var(--sd-border); display:flex; flex-direction:column; gap:12px;
}
.sd-info-card h4 { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color: var(--sd-text3); }
.sd-info-row { display:flex; align-items:center; gap:8px; }
.sd-info-ico { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sd-info-ico svg { width:13px; height:13px; }
.sii-vio { background:rgba(99,102,241,.12); color:#6366f1; }
.sii-sky { background:rgba(14,165,233,.12); color:#0ea5e9; }
.sii-rose{ background:rgba(244,63,94,.12);  color:#f43f5e; }
.sii-lime{ background:rgba(132,204,22,.12); color:#84cc16; }
[data-theme="dark"] .sii-vio  { background:rgba(99,102,241,.22); }
[data-theme="dark"] .sii-sky  { background:rgba(14,165,233,.22); }
[data-theme="dark"] .sii-rose { background:rgba(244,63,94,.22); }
[data-theme="dark"] .sii-lime { background:rgba(132,204,22,.22); }
.sd-info-label { font-size:11px; color: var(--sd-text3); font-weight:500; }
.sd-info-val   { font-size:13px; color: var(--sd-text); font-weight:600; }

/* Attendance stat chips */
.sd-att-chips { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
.sd-att-chip  { border-radius:12px; padding:12px; text-align:center; border:1px solid transparent; }
.sac-green  { background:#d1fae5; border-color:#a7f3d0; }
.sac-red    { background:#fee2e2; border-color:#fecaca; }
.sac-yellow { background:#fef3c7; border-color:#fde68a; }
.sac-blue   { background:#dbeafe; border-color:#bfdbfe; }
[data-theme="dark"] .sac-green  { background:rgba(16,185,129,.15);  border-color:rgba(16,185,129,.3); }
[data-theme="dark"] .sac-red    { background:rgba(239,68,68,.15);   border-color:rgba(239,68,68,.3); }
[data-theme="dark"] .sac-yellow { background:rgba(245,158,11,.15);  border-color:rgba(245,158,11,.3); }
[data-theme="dark"] .sac-blue   { background:rgba(59,130,246,.15);  border-color:rgba(59,130,246,.3); }
.sac-num    { font-size:24px; font-weight:800; color: var(--sd-text); }
.sac-label  { font-size:11px; font-weight:600; color: var(--sd-text2); margin-top:2px; }

/* Attendance log */
.sd-att-log-item {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 14px; border-radius:12px; background: var(--sd-card2);
  border:1px solid var(--sd-border); margin-bottom:8px;
  transition:background .15s;
}
.sd-att-log-item:last-child { margin-bottom:0; }
.sd-att-log-item:hover { background: var(--sd-table-hover); }

/* Parent contact cards */
.sd-parent-card {
  border-radius:14px; padding:16px; border:1px solid var(--sd-border);
  background: var(--sd-card2); margin-bottom:12px; transition:all .2s;
}
.sd-parent-card:last-child { margin-bottom:0; }
.sd-parent-card:hover { box-shadow: var(--sd-shadow); }
.sd-parent-actions { display:flex; gap:6px; flex-shrink:0; }
.sd-parent-action {
  width:32px; height:32px; border-radius:9px; border:1px solid var(--sd-sel-border);
  background: var(--sd-btn-bg); display:flex; align-items:center; justify-content:center;
  cursor:pointer; color: var(--sd-text3); transition:all .18s;
}
.sd-parent-action:hover { background: var(--sd-btn-hover); color:#6366f1; }
.sd-parent-action svg { width:13px; height:13px; }

/* Notification */
.sd-notif-card { border-radius:14px; padding:18px; border:1px solid var(--sd-border); background: var(--sd-card2); }
.sd-notif-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
.sd-send-btn {
  padding:10px 20px; border-radius:11px; border:none;
  background:linear-gradient(135deg,#6366f1,#ec4899); color:#fff; font-size:13.5px; font-weight:700;
  cursor:pointer; font-family:inherit; transition:all .2s; display:flex; align-items:center; gap:7px;
  box-shadow:0 4px 12px rgba(99,102,241,.4);
}
.sd-send-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,.5); }
.sd-send-btn svg { width:14px; height:14px; }

/* Section sub-headers in modal */
.sd-section-hd { font-size:14px; font-weight:800; color: var(--sd-text); margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; }
.sd-section-btn {
  padding:6px 14px; border-radius:9px; border:1.5px solid rgba(99,102,241,.3);
  background:rgba(99,102,241,.08); color:#6366f1; font-size:12px; font-weight:700;
  cursor:pointer; font-family:inherit; transition:all .18s; display:flex; align-items:center; gap:5px;
}
.sd-section-btn:hover { background:rgba(99,102,241,.18); }
.sd-section-btn svg { width:12px; height:12px; }
[data-theme="dark"] .sd-section-btn { color:#a5b4fc; background:rgba(99,102,241,.15); border-color:rgba(99,102,241,.3); }

/* empty state */
.sd-empty { text-align:center; padding:48px 24px; }
.sd-empty-ico { width:64px; height:64px; border-radius:18px; background: var(--sd-bar-bg); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
.sd-empty-ico svg { width:28px; height:28px; color: var(--sd-text3); }
.sd-empty-title { font-size:15px; font-weight:700; color: var(--sd-text); margin-bottom:6px; }
.sd-empty-sub   { font-size:13px; color: var(--sd-text3); }

/* Loading skeleton */
.sd-skeleton { border-radius:8px; background:linear-gradient(90deg,var(--sd-bar-bg) 25%,var(--sd-card2) 50%,var(--sd-bar-bg) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* Back link */
.sd-back {
  display:inline-flex; align-items:center; gap:6px; padding:8px 14px;
  border-radius:10px; border:1px solid var(--sd-sel-border); background: var(--sd-btn-bg);
  color: var(--sd-btn-text); font-size:13px; font-weight:600; text-decoration:none;
  cursor:pointer; margin-bottom:20px; transition:all .18s; font-family:inherit;
}
.sd-back:hover { background: var(--sd-btn-hover); color: var(--sd-btn-htext); border-color:rgba(99,102,241,.3); }
.sd-back svg { width:14px; height:14px; }

/* Progress fill colours */
.pf-green  { background:linear-gradient(90deg,#10b981,#34d399); }
.pf-yellow { background:linear-gradient(90deg,#f59e0b,#fbbf24); }
.pf-red    { background:linear-gradient(90deg,#f43f5e,#fb7185); }
.pf-blue   { background:linear-gradient(90deg,#3b82f6,#60a5fa); }
.pf-purple { background:linear-gradient(90deg,#6366f1,#8b5cf6); }

/* ── RESPONSIVE ── */
@media (max-width:1100px) {
  .sd-stats { grid-template-columns:repeat(2,1fr); }
  .sd-alerts-row { grid-template-columns:1fr 1fr; }
  .sd-info-grid { grid-template-columns:1fr; }
  .sd-att-chips { grid-template-columns:repeat(2,1fr); }
  .sd-form-grid3 { grid-template-columns:1fr 1fr; }
}
@media (max-width:768px) {
  .sd-root { padding:16px; }
  .sd-hero { padding:22px 20px; }
  .sd-hero-inner { flex-direction:column; align-items:flex-start; gap:16px; }
  .sd-hero-stats { width:100%; flex-wrap:wrap; }
  .sd-stats { grid-template-columns:1fr 1fr; gap:12px; }
  .sd-alerts-row { grid-template-columns:1fr; }
  .sd-filters { flex-direction:column; align-items:stretch; }
  .sd-search-wrap { min-width:unset; }
  .sd-th:nth-child(4),.sd-td:nth-child(4),
  .sd-th:nth-child(5),.sd-td:nth-child(5) { display:none; }
  .sd-form-grid2,.sd-form-grid3 { grid-template-columns:1fr; }
  .sd-notif-grid { grid-template-columns:1fr; }
  .sd-modal,.sd-modal-sm { border-radius:18px; }
  .sd-modal-body { padding:18px; }
}
@media (max-width:480px) {
  .sd-root { padding:12px; }
  .sd-stats { grid-template-columns:1fr; }
  .sd-th:nth-child(3),.sd-td:nth-child(3) { display:none; }
  .sd-att-chips { grid-template-columns:repeat(2,1fr); }
}
`;

/* ─── SVG Helper ──────────────────────────────────────────── */
const Svg = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 110 8 4 4 0 010-8z",
  back:     "M19 12H5M12 19l-7-7 7-7",
  plus:     "M12 5v14M5 12h14",
  search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  mail:     "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  phone:    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
  mappin:   "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
  calendar: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
  clock:    "M12 2a10 10 0 110 20A10 10 0 0112 2zm0 5v5l3 3",
  check:    "M20 6L9 17l-5-5",
  close:    "M18 6L6 18M6 6l12 12",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  send:     "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  bell:     "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  alert:    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  person:   "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  id:       "M10 9a3 3 0 100-6 3 3 0 000 6zM9 17H5a4 4 0 014-4h2m3-2a7 7 0 010 9M19 8v4m0 0l-2-2m2 2l2-2",
  grad:     "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5",
  filter:   "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
} as const;

/* ─── Animated Number ─────────────────────────────────────── */
function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = () => {
      cur += target / 60;
      if (cur < target) { setV(Math.floor(cur)); requestAnimationFrame(step); }
      else setV(target);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{v}{suffix}</>;
}

/* ─── Avatar with gradient ────────────────────────────────── */
const GRAD_PAIRS = [
  ["#6366f1","#8b5cf6"],["#f43f5e","#ec4899"],["#0ea5e9","#06b6d4"],
  ["#10b981","#059669"],["#f59e0b","#ef4444"],["#8b5cf6","#6366f1"],
];
function Ava({ name, size = 36, idx = 0 }: { name: string; size?: number; idx?: number }) {
  const [a, b] = GRAD_PAIRS[idx % GRAD_PAIRS.length];
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="sd-ava" style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `linear-gradient(135deg,${a},${b})`,
      fontSize: size * 0.36, minWidth: size,
    }}>{initials}</div>
  );
}

/* ─── Types ───────────────────────────────────────────────── */
interface StudentWithProfile {
  id: number; username: string; firstName: string; lastName: string;
  email: string; grade: number; profileImage?: string;
  studentProfile?: { id:number; studentId:string; dateOfBirth?:string; address?:string; phone?:string; status:string; enrollmentDate:string; };
  parentContacts?: Array<{ id:number; parentType:string; firstName:string; lastName:string; email:string; phone:string; emergencyContact:boolean; }>;
  attendanceStats?: { totalDays:number; presentDays:number; absentDays:number; lateCount:number; attendanceRate:number; };
}

const studentFormSchema = z.object({
  firstName: z.string().min(1),lastName: z.string().min(1),email: z.string().email(),
  username: z.string().min(3),grade: z.number().min(9).max(12),studentId: z.string().min(1),
  dateOfBirth: z.string().min(1),address: z.string().optional(),phone: z.string().optional(),
  emergencyContact: z.string().optional(),medicalInfo: z.string().optional(),
});

const parentFormSchema = z.object({
  parentType: z.enum(["father","mother","guardian"]),firstName: z.string().min(1),
  lastName: z.string().min(1),email: z.string().email(),phone: z.string().min(1),
  emergencyContact: z.boolean().default(false),
  preferredContactMethod: z.enum(["email","phone","sms"]).default("email"),
});

/* ─── MAIN COMPONENT ──────────────────────────────────────── */
export default function StudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<StudentWithProfile | null>(null);
  const [search, setSearch]   = useState("");
  const [grade, setGrade]     = useState("all");
  const [status, setStatus]   = useState("all");
  const [addStudent, setAddStudent] = useState(false);
  const [addParent, setAddParent]   = useState(false);
  const [activeTab, setActiveTab]   = useState("overview");
  const [notifMsg, setNotifMsg]     = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifType, setNotifType]   = useState("general");

  // Forms
  const sForm = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema), defaultValues: { grade: 9 },
  });
  const pForm = useForm<z.infer<typeof parentFormSchema>>({
    resolver: zodResolver(parentFormSchema),
    defaultValues: { parentType:"father", emergencyContact:false, preferredContactMethod:"email" },
  });

  // Queries
  const { data: students = [], isLoading } = useQuery<StudentWithProfile[]>({ queryKey: ["/api/students"] });
  const { data: attendance = [] } = useQuery<any[]>({ queryKey: ["/api/students/attendance"] });

  // Mutations
  const createStudent = useMutation({
    mutationFn: (d: z.infer<typeof studentFormSchema>) => apiRequest("/api/students","POST",d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:["/api/students"] }); setAddStudent(false); toast({ title:"Student added!" }); },
    onError: (e: Error) => toast({ title:"Error", description:e.message, variant:"destructive" }),
  });
  const createParent = useMutation({
    mutationFn: (d: { pid:number; data:any }) => apiRequest(`/api/students/${d.pid}/parents`,"POST",d.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:["/api/students"] }); setAddParent(false); toast({ title:"Parent added!" }); },
    onError: (e: Error) => toast({ title:"Error", description:e.message, variant:"destructive" }),
  });
  const sendNotif = useMutation({
    mutationFn: (d: any) => apiRequest("/api/students/notifications","POST",d),
    onSuccess: () => { toast({ title:"Notification sent!" }); setNotifMsg(""); setNotifTitle(""); },
    onError: (e: Error) => toast({ title:"Error", description:e.message, variant:"destructive" }),
  });

  // Helpers
  const getAttStatus = (sid: number) => {
    const today = new Date().toDateString();
    const a = attendance.find((r: any) => r.studentId === sid && new Date(r.date).toDateString() === today);
    if (!a) return { cls:"sb-notmark", text:"Not Marked" };
    const map: Record<string,{cls:string;text:string}> = {
      present:{cls:"sb-present",text:"Present"}, absent:{cls:"sb-absent",text:"Absent"},
      late:{cls:"sb-late",text:"Late"}, excused:{cls:"sb-excused",text:"Excused"},
    };
    return map[a.status] || { cls:"sb-notmark", text:"Not Marked" };
  };

  const filtered = students.filter((s: StudentWithProfile) => {
    const q = search.toLowerCase();
    const m = s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q) ||
              s.email.toLowerCase().includes(q) || s.studentProfile?.studentId?.toLowerCase().includes(q);
    const g = grade === "all" || s.grade?.toString() === grade;
    const st = status === "all" || s.studentProfile?.status === status;
    return m && g && st;
  });

  const attColor = (r: number) => r >= 90 ? "pf-green" : r >= 75 ? "pf-yellow" : "pf-red";

  const totalActive = students.filter((s:any) => s.studentProfile?.status === "active").length;
  const avgAtt = students.length
    ? Math.round(students.reduce((acc:number,s:any) => acc + (s.attendanceStats?.attendanceRate||0), 0) / students.length)
    : 0;

  return (
    <>
      <style>{css}</style>
      <div className="sd-root">

        {/* Back */}
        <Link href="/">
          <button className="sd-back">
            <Svg d={ICONS.back} size={14}/> Back to Dashboard
          </button>
        </Link>

        {/* ── HERO ── */}
        <div className="sd-hero">
          <span className="sd-float" style={{width:40,height:40,top:"20%",left:"60%",animationDelay:"0s"}}/>
          <span className="sd-float" style={{width:25,height:25,top:"60%",left:"80%",animationDelay:"1s"}}/>
          <span className="sd-float" style={{width:55,height:55,top:"8%",left:"42%",animationDelay:"2s"}}/>
          <div className="sd-hero-inner">
            <div>
              <div className="sd-hero-title">Student Management 👩‍🎓</div>
              <div className="sd-hero-sub">Track profiles, attendance, parent contacts and send notifications from one place.</div>
            </div>
            <div className="sd-hero-stats">
              <div className="sd-hero-stat">
                <div className="sd-hero-sn"><AnimNum target={students.length}/></div>
                <div className="sd-hero-sl">Total</div>
              </div>
              <div className="sd-hero-div"/>
              <div className="sd-hero-stat">
                <div className="sd-hero-sn"><AnimNum target={totalActive}/></div>
                <div className="sd-hero-sl">Active</div>
              </div>
              <div className="sd-hero-div"/>
              <div className="sd-hero-stat">
                <div className="sd-hero-sn"><AnimNum target={avgAtt} suffix="%"/></div>
                <div className="sd-hero-sl">Avg Att.</div>
              </div>
              <div className="sd-hero-div"/>
              <button className="sd-hero-btn" onClick={()=>setAddStudent(true)}>+ Add Student</button>
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="sd-stats">
          {[
            { label:"Total Students", value:students.length, badge:"Enrolled", cardClass:"vio", iconClass:"ssi-vio", icon:"users", trend:"↑ 3 this week" },
            { label:"Active Today",   value:Math.round(students.length*0.88), badge:"Present",  cardClass:"sky",  iconClass:"ssi-sky",  icon:"check", trend:"88% attendance" },
            { label:"Avg Attendance", value:avgAtt, badge:"Rate", cardClass:"lime", iconClass:"ssi-lime", icon:"activity", trend:avgAtt>85?"↑ Good":"Keep improving", suffix:"%" },
            { label:"Parent Contacts",value:students.reduce((a:number,s:any)=>a+(s.parentContacts?.length||0),0), badge:"Linked", cardClass:"rose", iconClass:"ssi-rose", icon:"person", trend:"Family outreach" },
          ].map((s, i) => (
            <div key={i} className={`sd-stat-card ${s.cardClass}`}>
              <div className="sd-stat-top">
                <div className={`sd-stat-icon ${s.iconClass}`}><Svg d={ICONS[s.icon as keyof typeof ICONS]} size={20}/></div>
                <span className="sd-stat-badge">{s.badge}</span>
              </div>
              <div className="sd-stat-num">{isLoading ? "—" : <AnimNum target={s.value} suffix={(s as any).suffix||""}/>}</div>
              <div className="sd-stat-label">{s.label}</div>
              <div className="sd-stat-trend">{s.trend}</div>
            </div>
          ))}
        </div>

        {/* ── ALERT CARDS ── */}
        <div className="sd-alerts-row">
          {[
            { emoji:"⚠️", title:"Absent Today",     sub:"Needs follow-up",    num:Math.round(students.length*.12), cls:"purple" },
            { emoji:"📬", title:"Parent Messages",   sub:"Pending replies",    num:4,                               cls:"sky"    },
            { emoji:"✅", title:"Present Today",     sub:"In class",           num:Math.round(students.length*.88), cls:"green"  },
          ].map((a, i) => (
            <div key={i} className={`sd-alert-card ${a.cls}`}>
              <div className="sd-alert-emoji">{a.emoji}</div>
              <div className="sd-alert-title">{a.title}</div>
              <div className="sd-alert-sub">{a.sub}</div>
              <div className="sd-alert-num">{a.num}</div>
            </div>
          ))}
        </div>

        {/* ── FILTERS ── */}
        <div className="sd-filters">
          <div className="sd-search-wrap">
            <div className="sd-search-ico"><Svg d={ICONS.search} size={16}/></div>
            <input className="sd-search" placeholder="Search by name, email, student ID…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="sd-select" value={grade} onChange={e=>setGrade(e.target.value)}>
            <option value="all">All Grades</option>
            <option value="9">Grade 9</option><option value="10">Grade 10</option>
            <option value="11">Grade 11</option><option value="12">Grade 12</option>
          </select>
          <select className="sd-select" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option><option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <div className="sd-filter-count">{filtered.length} students</div>
          <button className="sd-add-btn" onClick={()=>setAddStudent(true)}>
            <Svg d={ICONS.plus} size={15}/> Add Student
          </button>
        </div>

        {/* ── STUDENTS TABLE ── */}
        <div className="sd-table-card">
          <div className="sd-table-hd">
            <div className="sd-table-title">
              <Svg d={ICONS.users} size={18}/> Students ({filtered.length})
            </div>
            <button className="sd-view-btn">
              <Svg d={ICONS.download} size={13}/> Export CSV
            </button>
          </div>

          {isLoading ? (
            <div style={{padding:"24px"}}>
              {[...Array(5)].map((_,i)=>(
                <div key={i} style={{display:"flex",gap:12,alignItems:"center",marginBottom:16}}>
                  <div className="sd-skeleton" style={{width:36,height:36,borderRadius:10,flexShrink:0}}/>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                    <div className="sd-skeleton" style={{width:"40%",height:13,borderRadius:6}}/>
                    <div className="sd-skeleton" style={{width:"60%",height:11,borderRadius:5}}/>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-ico"><Svg d={ICONS.users} size={28}/></div>
              <div className="sd-empty-title">No students found</div>
              <div className="sd-empty-sub">Try adjusting your search or filters</div>
            </div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table className="sd-table">
                <thead>
                  <tr>
                    <th className="sd-th">Student</th>
                    <th className="sd-th">ID / Grade</th>
                    <th className="sd-th">Parent Contact</th>
                    <th className="sd-th">Attendance</th>
                    <th className="sd-th">Today</th>
                    <th className="sd-th">Status</th>
                    <th className="sd-th">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s: StudentWithProfile, idx: number) => {
                    const att = getAttStatus(s.studentProfile?.id || 0);
                    const rate = s.attendanceStats?.attendanceRate || 0;
                    const parent = s.parentContacts?.[0];
                    return (
                      <tr key={s.id} className="sd-tr" onClick={()=>{setSelected(s);setActiveTab("overview");}}>
                        <td className="sd-td">
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <Ava name={`${s.firstName} ${s.lastName}`} size={36} idx={idx}/>
                            <div>
                              <div className="sd-student-name">{s.firstName} {s.lastName}</div>
                              <div className="sd-student-email">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="sd-td">
                          <div style={{display:"flex",flexDirection:"column",gap:4}}>
                            <span className={`sd-badge sb-grade`}>{s.studentProfile?.studentId||"N/A"}</span>
                            <span style={{fontSize:12,color:"var(--sd-text3)"}}>Grade {s.grade}</span>
                          </div>
                        </td>
                        <td className="sd-td">
                          {parent ? (
                            <div>
                              <div style={{fontWeight:600,fontSize:13,color:"var(--sd-text)"}}>{parent.firstName} {parent.lastName}</div>
                              <div style={{fontSize:11.5,color:"var(--sd-text3)"}}>{parent.email}</div>
                            </div>
                          ) : <span style={{color:"var(--sd-text3)",fontSize:12}}>—</span>}
                        </td>
                        <td className="sd-td">
                          <div className="sd-att-bar">
                            <div className="sd-att-bg">
                              <div className={`sd-att-fill ${attColor(rate)}`} style={{width:`${rate}%`}}/>
                            </div>
                            <span className="sd-att-pct">{rate}%</span>
                          </div>
                        </td>
                        <td className="sd-td">
                          <span className={`sd-badge ${att.cls}`}>{att.text}</span>
                        </td>
                        <td className="sd-td">
                          <span className={`sd-badge ${s.studentProfile?.status==="active"?"sb-active":s.studentProfile?.status==="suspended"?"sb-suspend":"sb-inactive"}`}>
                            {s.studentProfile?.status||"active"}
                          </span>
                        </td>
                        <td className="sd-td" onClick={e=>e.stopPropagation()}>
                          <button className="sd-action-btn" title="View" onClick={()=>{setSelected(s);setActiveTab("overview");}}>
                            <Svg d={ICONS.eye} size={13}/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══════════════ ADD STUDENT MODAL ═══════════════ */}
        {addStudent && (
          <div className="sd-overlay" onClick={()=>setAddStudent(false)}>
            <div className="sd-modal" onClick={e=>e.stopPropagation()}>
              <div className="sd-modal-hd">
                <div>
                  <div className="sd-modal-title">Add New Student</div>
                  <div className="sd-modal-sub">Create a student profile with full information</div>
                </div>
                <button className="sd-modal-close" onClick={()=>setAddStudent(false)}><Svg d={ICONS.close} size={14}/></button>
              </div>
              <div className="sd-modal-body">
                <form onSubmit={sForm.handleSubmit(d => createStudent.mutate(d))}>
                  <div className="sd-form-grid2" style={{marginBottom:14}}>
                    <div className="sd-form-group">
                      <label className="sd-label">First Name *</label>
                      <input className="sd-input" placeholder="First name" {...sForm.register("firstName")}/>
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-label">Last Name *</label>
                      <input className="sd-input" placeholder="Last name" {...sForm.register("lastName")}/>
                    </div>
                  </div>
                  <div className="sd-form-grid2" style={{marginBottom:14}}>
                    <div className="sd-form-group">
                      <label className="sd-label">Email *</label>
                      <input className="sd-input" type="email" placeholder="student@school.com" {...sForm.register("email")}/>
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-label">Username *</label>
                      <input className="sd-input" placeholder="username" {...sForm.register("username")}/>
                    </div>
                  </div>
                  <div className="sd-form-grid3" style={{marginBottom:14}}>
                    <div className="sd-form-group">
                      <label className="sd-label">Grade *</label>
                      <select className="sd-form-select sd-input"
                        {...sForm.register("grade",{valueAsNumber:true})}>
                        <option value={9}>Grade 9</option><option value={10}>Grade 10</option>
                        <option value={11}>Grade 11</option><option value={12}>Grade 12</option>
                      </select>
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-label">Student ID *</label>
                      <input className="sd-input" placeholder="STU-001" {...sForm.register("studentId")}/>
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-label">Date of Birth *</label>
                      <input className="sd-input" type="date" {...sForm.register("dateOfBirth")}/>
                    </div>
                  </div>
                  <div className="sd-form-group" style={{marginBottom:14}}>
                    <label className="sd-label">Address</label>
                    <textarea className="sd-textarea" placeholder="Full address…" {...sForm.register("address")}/>
                  </div>
                  <div className="sd-form-grid2" style={{marginBottom:14}}>
                    <div className="sd-form-group">
                      <label className="sd-label">Phone</label>
                      <input className="sd-input" placeholder="+1 234 567 8900" {...sForm.register("phone")}/>
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-label">Emergency Contact</label>
                      <input className="sd-input" placeholder="Name & phone" {...sForm.register("emergencyContact")}/>
                    </div>
                  </div>
                  <div className="sd-form-group" style={{marginBottom:0}}>
                    <label className="sd-label">Medical Information</label>
                    <textarea className="sd-textarea" placeholder="Allergies, conditions…" {...sForm.register("medicalInfo")}/>
                  </div>
                  <div className="sd-form-actions">
                    <button type="button" className="sd-cancel-btn" onClick={()=>setAddStudent(false)}>Cancel</button>
                    <button type="submit" className="sd-submit-btn" disabled={createStudent.isPending}>
                      {createStudent.isPending ? "Adding…" : "+ Add Student"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ STUDENT DETAIL MODAL ═══════════════ */}
        {selected && (
          <div className="sd-overlay" onClick={()=>setSelected(null)}>
            <div className="sd-modal" onClick={e=>e.stopPropagation()}>
              <div className="sd-modal-hd">
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <Ava name={`${selected.firstName} ${selected.lastName}`} size={48}/>
                  <div>
                    <div className="sd-modal-title">{selected.firstName} {selected.lastName}</div>
                    <div className="sd-modal-sub">{selected.studentProfile?.studentId} · Grade {selected.grade} · {selected.email}</div>
                  </div>
                </div>
                <button className="sd-modal-close" onClick={()=>setSelected(null)}><Svg d={ICONS.close} size={14}/></button>
              </div>

              <div className="sd-modal-body">
                {/* Hero banner */}
                <div className="sd-detail-hero">
                  <Ava name={`${selected.firstName} ${selected.lastName}`} size={64}/>
                  <div>
                    <div className="sd-detail-name">{selected.firstName} {selected.lastName}</div>
                    <div className="sd-detail-meta">Grade {selected.grade} · Student ID: {selected.studentProfile?.studentId||"N/A"}</div>
                    <div className="sd-detail-badges">
                      <span className="sd-detail-badge">{selected.studentProfile?.status||"Active"}</span>
                      <span className="sd-detail-badge">Att: {selected.attendanceStats?.attendanceRate||0}%</span>
                      {selected.parentContacts?.length ? <span className="sd-detail-badge">{selected.parentContacts.length} Parent{selected.parentContacts.length>1?"s":""}</span> : null}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="sd-tabs">
                  {[
                    {key:"overview",label:"Overview",icon:ICONS.person},
                    {key:"parents",label:"Parents",icon:ICONS.users},
                    {key:"attendance",label:"Attendance",icon:ICONS.calendar},
                    {key:"notifications",label:"Notify",icon:ICONS.bell},
                  ].map(tab=>(
                    <button key={tab.key} className={`sd-tab${activeTab===tab.key?" active":""}`}
                      onClick={()=>setActiveTab(tab.key)}>
                      <Svg d={tab.icon} size={13}/>{tab.label}
                    </button>
                  ))}
                </div>

                {/* ── Overview ── */}
                {activeTab==="overview" && (
                  <div>
                    <div className="sd-info-grid">
                      <div className="sd-info-card">
                        <h4>Personal Info</h4>
                        {[
                          {ico:"sii-vio",icon:ICONS.mail,  label:"Email",   val:selected.email},
                          {ico:"sii-sky",icon:ICONS.phone, label:"Phone",   val:selected.studentProfile?.phone||"Not provided"},
                          {ico:"sii-rose",icon:ICONS.mappin,label:"Address",val:selected.studentProfile?.address||"Not provided"},
                          {ico:"sii-lime",icon:ICONS.calendar,label:"DOB",  val:selected.studentProfile?.dateOfBirth?format(new Date(selected.studentProfile.dateOfBirth),"dd MMM yyyy"):"Not provided"},
                        ].map((r,i)=>(
                          <div key={i} className="sd-info-row">
                            <div className={`sd-info-ico ${r.ico}`}><Svg d={r.icon} size={13}/></div>
                            <div>
                              <div className="sd-info-label">{r.label}</div>
                              <div className="sd-info-val">{r.val}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="sd-info-card">
                        <h4>Academic Info</h4>
                        {[
                          {ico:"sii-vio",icon:ICONS.id,   label:"Student ID",    val:selected.studentProfile?.studentId||"N/A"},
                          {ico:"sii-sky",icon:ICONS.grad, label:"Grade",         val:`Grade ${selected.grade}`},
                          {ico:"sii-lime",icon:ICONS.calendar,label:"Enrolled",  val:selected.studentProfile?.enrollmentDate?format(new Date(selected.studentProfile.enrollmentDate),"dd MMM yyyy"):"N/A"},
                          {ico:"sii-rose",icon:ICONS.activity,label:"Status",    val:selected.studentProfile?.status||"Active"},
                        ].map((r,i)=>(
                          <div key={i} className="sd-info-row">
                            <div className={`sd-info-ico ${r.ico}`}><Svg d={r.icon} size={13}/></div>
                            <div>
                              <div className="sd-info-label">{r.label}</div>
                              <div className="sd-info-val">{r.val}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Snapshot bars */}
                    <div className="sd-info-card" style={{marginBottom:0}}>
                      <h4>Attendance Snapshot</h4>
                      {[
                        {label:"Present Days",val:`${selected.attendanceStats?.presentDays||0}/${selected.attendanceStats?.totalDays||0}`,pct:selected.attendanceStats?.attendanceRate||0,cls:"pf-green"},
                        {label:"Absence Rate",val:`${selected.attendanceStats?.absentDays||0} days`,pct:selected.attendanceStats?.totalDays?(selected.attendanceStats.absentDays/selected.attendanceStats.totalDays*100):0,cls:"pf-red"},
                        {label:"Late Arrivals",val:`${selected.attendanceStats?.lateCount||0} times`,pct:selected.attendanceStats?.totalDays?(selected.attendanceStats.lateCount/selected.attendanceStats.totalDays*100):0,cls:"pf-yellow"},
                      ].map((b,i)=>(
                        <div key={i} style={{marginBottom:i<2?12:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            <span style={{fontSize:12.5,color:"var(--sd-text2)"}}>{b.label}</span>
                            <span style={{fontSize:12.5,fontWeight:700,color:"var(--sd-text)"}}>{b.val}</span>
                          </div>
                          <div className="sd-snap-bar-bg">
                            <div className={`sd-snap-bar-fill ${b.cls}`} style={{width:`${Math.min(100,b.pct)}%`}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Parents ── */}
                {activeTab==="parents" && (
                  <div>
                    <div className="sd-section-hd">
                      Parent Contacts
                      <button className="sd-section-btn" onClick={()=>setAddParent(true)}>
                        <Svg d={ICONS.plus} size={12}/> Add Parent
                      </button>
                    </div>
                    {selected.parentContacts?.length ? selected.parentContacts.map((p,i)=>(
                      <div key={i} className="sd-parent-card">
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                          <div style={{display:"flex",gap:12,alignItems:"center"}}>
                            <Ava name={`${p.firstName} ${p.lastName}`} size={40} idx={i+3}/>
                            <div>
                              <div style={{fontWeight:700,fontSize:14,color:"var(--sd-text)"}}>
                                {p.firstName} {p.lastName}
                                <span className="sd-badge sb-grade" style={{marginLeft:8,fontSize:10}}>{p.parentType}</span>
                                {p.emergencyContact && <span className="sd-badge sb-absent" style={{marginLeft:6,fontSize:10}}>Emergency</span>}
                              </div>
                              <div style={{display:"flex",gap:16,marginTop:6,flexWrap:"wrap"}}>
                                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12.5,color:"var(--sd-text2)"}}>
                                  <Svg d={ICONS.mail} size={12}/>{p.email}
                                </span>
                                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12.5,color:"var(--sd-text2)"}}>
                                  <Svg d={ICONS.phone} size={12}/>{p.phone}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="sd-parent-actions">
                            <button className="sd-parent-action" title="Email"><Svg d={ICONS.mail} size={13}/></button>
                            <button className="sd-parent-action" title="Call"><Svg d={ICONS.phone} size={13}/></button>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="sd-empty" style={{padding:"32px 0"}}>
                        <div className="sd-empty-ico"><Svg d={ICONS.users} size={28}/></div>
                        <div className="sd-empty-title">No parent contacts yet</div>
                        <div className="sd-empty-sub">Add a parent or guardian to enable communication</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Attendance ── */}
                {activeTab==="attendance" && (
                  <div>
                    <div className="sd-section-hd">
                      Attendance Record
                      <button className="sd-section-btn"><Svg d={ICONS.download} size={12}/> Export</button>
                    </div>
                    <div className="sd-att-chips">
                      {[
                        {num:selected.attendanceStats?.presentDays||0, label:"Present", cls:"sac-green"},
                        {num:selected.attendanceStats?.absentDays||0,  label:"Absent",  cls:"sac-red"},
                        {num:selected.attendanceStats?.lateCount||0,   label:"Late",    cls:"sac-yellow"},
                        {num:selected.attendanceStats?.totalDays||0,   label:"Total",   cls:"sac-blue"},
                      ].map((c,i)=>(
                        <div key={i} className={`sd-att-chip ${c.cls}`}>
                          <div className="sac-num">{c.num}</div>
                          <div className="sac-label">{c.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Log entries */}
                    {attendance
                      .filter((a:any) => a.studentId === selected.studentProfile?.id)
                      .slice(0,12)
                      .map((a:any,i:number)=>{
                        const statusMap: Record<string,{cls:string;label:string}> = {
                          present:{cls:"sb-present",label:"Present"},absent:{cls:"sb-absent",label:"Absent"},
                          late:{cls:"sb-late",label:"Late"},excused:{cls:"sb-excused",label:"Excused"},
                        };
                        const s = statusMap[a.status] || {cls:"sb-notmark",label:a.status};
                        return (
                          <div key={i} className="sd-att-log-item">
                            <div style={{display:"flex",alignItems:"center",gap:12}}>
                              <div style={{fontSize:13,fontWeight:600,color:"var(--sd-text)"}}>
                                {format(new Date(a.date),"dd MMM yyyy")}
                              </div>
                              {a.loginTime && (
                                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:"var(--sd-text3)"}}>
                                  <Svg d={ICONS.clock} size={11}/>{format(new Date(a.loginTime),"HH:mm")}
                                </span>
                              )}
                            </div>
                            <span className={`sd-badge ${s.cls}`}>{s.label}</span>
                          </div>
                        );
                      })
                    }
                    {!attendance.filter((a:any)=>a.studentId===selected.studentProfile?.id).length && (
                      <div className="sd-empty" style={{padding:"24px 0"}}>
                        <div className="sd-empty-title">No attendance records</div>
                        <div className="sd-empty-sub">Records will appear here once attendance is marked</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Notifications ── */}
                {activeTab==="notifications" && (
                  <div>
                    <div className="sd-section-hd">Send Notification</div>
                    <div className="sd-notif-card">
                      <div className="sd-notif-grid">
                        <div className="sd-form-group">
                          <label className="sd-label">Type</label>
                          <select className="sd-input" value={notifType} onChange={e=>setNotifType(e.target.value)}>
                            <option value="general">General</option>
                            <option value="attendance">Attendance</option>
                            <option value="grades">Grades</option>
                            <option value="behavior">Behavior</option>
                          </select>
                        </div>
                        <div className="sd-form-group">
                          <label className="sd-label">Recipients</label>
                          <select className="sd-input">
                            <option value="parents">All Parents</option>
                            <option value="emergency">Emergency Only</option>
                            <option value="student">Student Only</option>
                          </select>
                        </div>
                      </div>
                      <div className="sd-form-group" style={{marginBottom:12}}>
                        <label className="sd-label">Title</label>
                        <input className="sd-input" placeholder="Notification title…"
                          value={notifTitle} onChange={e=>setNotifTitle(e.target.value)}/>
                      </div>
                      <div className="sd-form-group" style={{marginBottom:16}}>
                        <label className="sd-label">Message</label>
                        <textarea className="sd-textarea" rows={4}
                          placeholder="Write your message here…"
                          value={notifMsg} onChange={e=>setNotifMsg(e.target.value)}/>
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--sd-text2)",cursor:"pointer"}}>
                          <input type="checkbox" defaultChecked style={{accentColor:"#6366f1"}}/>
                          Send via email
                        </label>
                        <button className="sd-send-btn" disabled={!notifTitle||!notifMsg||sendNotif.isPending}
                          onClick={()=>sendNotif.mutate({studentIds:[selected.id],title:notifTitle,message:notifMsg,type:notifType,sendEmail:true})}>
                          <Svg d={ICONS.send} size={14}/>{sendNotif.isPending?"Sending…":"Send Notification"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ ADD PARENT MODAL ═══════════════ */}
        {addParent && selected && (
          <div className="sd-overlay" onClick={()=>setAddParent(false)} style={{zIndex:1100}}>
            <div className="sd-modal-sm" onClick={e=>e.stopPropagation()}>
              <div className="sd-modal-hd">
                <div>
                  <div className="sd-modal-title">Add Parent Contact</div>
                  <div className="sd-modal-sub">For {selected.firstName} {selected.lastName}</div>
                </div>
                <button className="sd-modal-close" onClick={()=>setAddParent(false)}><Svg d={ICONS.close} size={14}/></button>
              </div>
              <div className="sd-modal-body">
                <form onSubmit={pForm.handleSubmit(d => createParent.mutate({ pid: selected.studentProfile?.id||0, data:d }))}>
                  <div className="sd-form-group" style={{marginBottom:14}}>
                    <label className="sd-label">Relationship *</label>
                    <select className="sd-input" {...pForm.register("parentType")}>
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                    </select>
                  </div>
                  <div className="sd-form-grid2" style={{marginBottom:14}}>
                    <div className="sd-form-group">
                      <label className="sd-label">First Name *</label>
                      <input className="sd-input" placeholder="First name" {...pForm.register("firstName")}/>
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-label">Last Name *</label>
                      <input className="sd-input" placeholder="Last name" {...pForm.register("lastName")}/>
                    </div>
                  </div>
                  <div className="sd-form-grid2" style={{marginBottom:14}}>
                    <div className="sd-form-group">
                      <label className="sd-label">Email *</label>
                      <input className="sd-input" type="email" placeholder="parent@email.com" {...pForm.register("email")}/>
                    </div>
                    <div className="sd-form-group">
                      <label className="sd-label">Phone *</label>
                      <input className="sd-input" placeholder="+1 234 567 8900" {...pForm.register("phone")}/>
                    </div>
                  </div>
                  <div className="sd-form-group" style={{marginBottom:14}}>
                    <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--sd-text2)",cursor:"pointer"}}>
                      <input type="checkbox" style={{accentColor:"#6366f1"}} {...pForm.register("emergencyContact")}/>
                      Mark as Emergency Contact
                    </label>
                  </div>
                  <div className="sd-form-actions">
                    <button type="button" className="sd-cancel-btn" onClick={()=>setAddParent(false)}>Cancel</button>
                    <button type="submit" className="sd-submit-btn" disabled={createParent.isPending}>
                      {createParent.isPending ? "Adding…" : "+ Add Parent"}
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