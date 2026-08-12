import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAuth } from "../../hooks/use-auth";
import Navigation from "../../components/navigation";
import { PARTS } from "../../lib/mock-paper-data";
import {
  ArrowLeft,
  Download,
  Eye,
  Search,
  X,
  Printer,
  Timer,
  Bookmark,
  ArrowUp,
  Sparkles,
  PieChart,
  Zap,
  Activity,
  AlertTriangle,
  ChevronDown,
  GraduationCap,
  BookOpen,
  List,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// API Response Types
interface Question {
  question_id: string;
  question: string;
  marks: number;
  type: string;
  options: string[];
  correct_answer: string;
  difficulty: string;
  bloom_level: string;
  topic: string;
  unit_number: number;
  question_type_refined: string;
  estimated_time_minutes: number;
}

interface QuestionBankResponse {
  status: boolean;
  data: {
    documentId: string;
    examName: string;
    year: string;
    board: string;
    classNumber: string;
    subject: string;
    subjectGroupKey: string;
    unitName: string;
    totalQuestions: number;
    difficultyDistribution: {
      easy: number;
      medium: number;
      hard: number;
    };
    questions: Question[];
  };
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.qb *, .qb *::before, .qb *::after { box-sizing:border-box; margin:0; padding:0; }
.qb { font-family:'Plus Jakarta Sans',system-ui,sans-serif; background:#f8fafc; min-height:100vh; }
.qb ::-webkit-scrollbar { width:4px; height:4px; }
.qb ::-webkit-scrollbar-thumb { background:rgba(99,102,241,.2); border-radius:99px; }

/* ── HERO ── */
.qb-hero {
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  border-radius:24px; padding:36px 40px; position:relative; overflow:hidden;
  color:#fff; animation:heroIn .5s cubic-bezier(.34,1.56,.64,1) both;
  margin-bottom:28px;
}
@keyframes heroIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
.qb-hero::before { content:''; position:absolute; top:-60px; right:-60px; width:260px; height:260px; border-radius:50%; background:rgba(255,255,255,.1); }
.qb-hero::after  { content:''; position:absolute; bottom:-80px; left:30%; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,.07); }
.qb-hero-inner { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:20px; }
.qb-hero-badge { display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; background:rgba(255,255,255,.18); padding:5px 12px; border-radius:20px; margin-bottom:12px; border:1px solid rgba(255,255,255,.25); }
.qb-hero-title { font-size:clamp(22px,3.5vw,34px); font-weight:800; letter-spacing:-.5px; margin-bottom:6px; }
.qb-hero-sub   { font-size:14px; opacity:.75; max-width:400px; line-height:1.5; }
.qb-hero-right { display:flex; align-items:center; gap:20px; flex-shrink:0; }
.qb-hero-stat  { text-align:center; }
.qb-hero-sv    { font-size:28px; font-weight:800; line-height:1; }
.qb-hero-sl    { font-size:11px; opacity:.65; margin-top:2px; }
.qb-hero-div   { width:1px; height:44px; background:rgba(255,255,255,.2); }

/* ── CARD ── */
.qb-card {
  background:#fff; border-radius:20px;
  border:1px solid rgba(0,0,0,.06); box-shadow:0 2px 12px rgba(0,0,0,.05);
}

/* ── FILTERS ROW ── */
.qb-filters {
  display:flex; align-items:center; gap:10px;
  flex-wrap:nowrap; margin-bottom:24px;
}

/* Search */
.qb-search-wrap { position:relative; flex:1; min-width:0; max-width:380px; }
.qb-search-ico  { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; }
.qb-search-inp  {
  width:100%; height:42px; border-radius:14px; padding:0 14px 0 38px;
  border:1.5px solid #f1f5f9; background:#fff; font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  font-size:13.5px; color:#0f172a; outline:none; transition:all .2s;
  box-shadow:0 2px 8px rgba(0,0,0,.04);
}
.qb-search-inp:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.qb-search-inp::placeholder { color:#94a3b8; }

/* ── YEAR DROPDOWN ── */
.qb-year-wrap {
  position:relative; flex-shrink:0;
}
.qb-year-btn {
  height:42px; padding:0 14px 0 14px;
  display:flex; align-items:center; gap:7px;
  border-radius:14px; border:1.5px solid #f1f5f9; background:#fff;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  font-size:13px; font-weight:600; color:#374151; cursor:pointer;
  transition:all .2s; white-space:nowrap;
  box-shadow:0 2px 8px rgba(0,0,0,.04);
  user-select:none;
}
.qb-year-btn:hover { border-color:#c7d2fe; color:#6366f1; }
.qb-year-btn.open  { border-color:#6366f1; color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.qb-year-btn.has-filter {
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff; border-color:transparent;
  box-shadow:0 4px 12px rgba(99,102,241,.3);
}
.qb-year-btn.has-filter:hover { box-shadow:0 6px 18px rgba(99,102,241,.38); }
.qb-year-btn .qb-chev {
  transition:transform .2s; flex-shrink:0;
}
.qb-year-btn.open .qb-chev { transform:rotate(180deg); }
.qb-year-btn.has-filter .qb-chev { opacity:.8; }

/* Dropdown menu */
.qb-year-menu {
  position:absolute; top:calc(100% + 7px); right:0; z-index:100;
  background:#fff; border-radius:16px;
  border:1.5px solid rgba(0,0,0,.07);
  box-shadow:0 12px 36px rgba(0,0,0,.14);
  overflow:hidden; min-width:160px;
  animation:menuIn .18s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes menuIn { from{opacity:0;transform:translateY(-6px) scale(.97)} to{opacity:1;transform:none} }

.qb-year-option {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 16px; cursor:pointer; font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  font-size:13px; font-weight:600; color:#374151; transition:background .12s;
  gap:20px;
}
.qb-year-option:first-child { border-radius:14px 14px 0 0; }
.qb-year-option:last-child  { border-radius:0 0 14px 14px; }
.qb-year-option:hover { background:rgba(99,102,241,.06); color:#6366f1; }
.qb-year-option.sel  { background:rgba(99,102,241,.08); color:#4f46e5; }
.qb-year-option .qb-year-count {
  font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:20px;
  background:rgba(99,102,241,.1); color:#6366f1; flex-shrink:0;
}
.qb-year-option.sel .qb-year-count { background:rgba(99,102,241,.2); }
.qb-year-sep { height:1px; background:#f1f5f9; margin:0 12px; }
/* check mark for selected */
.qb-year-check {
  width:16px; height:16px; border-radius:5px; flex-shrink:0;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex; align-items:center; justify-content:center;
}
.qb-year-check::after {
  content:''; width:8px; height:5px;
  border-left:2px solid #fff; border-bottom:2px solid #fff;
  transform:rotate(-45deg) translateY(-1px);
  display:block;
}

/* Subject filter chips — compact pill row */
.qb-subj-chips { display:flex; gap:6px; flex-shrink:0; }
.qb-schip {
  height:42px; padding:0 16px; border-radius:14px;
  border:1.5px solid #f1f5f9; background:#fff;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  font-size:12.5px; font-weight:600; cursor:pointer; color:#64748b;
  transition:all .2s; white-space:nowrap;
  box-shadow:0 2px 8px rgba(0,0,0,.04);
}
.qb-schip:hover { border-color:#c7d2fe; color:#6366f1; }
.qb-schip.act   {
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  border-color:transparent; box-shadow:0 4px 12px rgba(99,102,241,.3);
}

/* Active filter indicator pill */
.qb-active-filters {
  display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:16px;
}
.qb-filter-pill {
  display:inline-flex; align-items:center; gap:5px;
  padding:4px 10px 4px 12px; border-radius:20px;
  background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.18);
  font-size:11.5px; font-weight:700; color:#6366f1;
}
.qb-filter-pill button {
  width:16px; height:16px; border-radius:50%; border:none; background:rgba(99,102,241,.2);
  color:#6366f1; cursor:pointer; display:flex; align-items:center; justify-content:center;
  font-size:10px; line-height:1; transition:background .15s; padding:0;
}
.qb-filter-pill button:hover { background:rgba(99,102,241,.38); }

/* Paper grid */
.qb-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; }

/* Paper card */
.qb-paper-card {
  background:#fff; border-radius:20px; border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05); overflow:hidden; display:flex; flex-direction:column;
  cursor:pointer; transition:all .25s cubic-bezier(.4,0,.2,1); position:relative;
  animation:cardIn .45s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cardIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
.qb-paper-card:hover { transform:translateY(-6px) scale(1.01); box-shadow:0 16px 40px rgba(0,0,0,.12); border-color:#e0e7ff; }

.qb-diff-strip { height:4px; border-radius:20px 20px 0 0; }

.qb-paper-head { padding:22px 22px 14px; }
.qb-paper-tags { display:flex; align-items:center; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
.qb-tag { font-size:10px; font-weight:700; padding:3px 9px; border-radius:20px; text-transform:uppercase; letter-spacing:.05em; }
.qb-tag-year  { background:#f1f5f9; color:#64748b; }
.qb-tag-type  { background:rgba(99,102,241,.1); color:#6366f1; }
.qb-tag-hard  { background:rgba(239,68,68,.1);  color:#dc2626; }
.qb-tag-medium{ background:rgba(245,158,11,.1); color:#d97706; }
.qb-tag-easy  { background:rgba(16,185,129,.1); color:#059669; }
.qb-paper-title { font-size:16px; font-weight:800; color:#0f172a; margin-bottom:6px; line-height:1.3; transition:color .2s; }
.qb-paper-card:hover .qb-paper-title { color:#4f46e5; }
.qb-paper-meta { display:flex; align-items:center; gap:14px; }
.qb-paper-meta-item { font-size:11px; font-weight:600; color:#94a3b8; display:flex; align-items:center; gap:4px; }

.qb-paper-body { padding:0 22px 20px; flex:1; display:flex; flex-direction:column; gap:16px; }

.qb-topics-label { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#94a3b8; margin-bottom:8px; display:flex; align-items:center; gap:5px; }
.qb-topics-row   { display:flex; flex-wrap:wrap; gap:6px; }
.qb-topic-tag { font-size:10.5px; font-weight:700; padding:4px 10px; border-radius:20px; background:rgba(99,102,241,.08); color:#6366f1; border:1px solid rgba(99,102,241,.15); text-transform:uppercase; letter-spacing:.04em; }

.qb-bars-label { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#94a3b8; margin-bottom:8px; }
.qb-bars-row   { display:flex; gap:6px; height:24px; align-items:flex-end; }
.qb-bar-col    { flex:1; border-radius:4px 4px 0 0; transition:all .25s; opacity:.65; }
.qb-paper-card:hover .qb-bar-col { opacity:1; }

.qb-paper-foot { padding:16px 22px; border-top:1px solid #f1f5f9; display:flex; gap:10px; }
.qb-btn-preview {
  flex:1; padding:11px; border-radius:14px; border:1.5px solid #e2e8f0; background:#fff;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-size:13px; font-weight:700;
  cursor:pointer; color:#374151; display:flex; align-items:center; justify-content:center; gap:7px; transition:all .2s;
}
.qb-btn-preview:hover { border-color:#6366f1; color:#6366f1; background:rgba(99,102,241,.04); }
.qb-btn-download {
  flex:1; padding:11px; border-radius:14px; border:none;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-size:13px; font-weight:700;
  cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px;
  box-shadow:0 4px 14px rgba(99,102,241,.3); transition:all .2s;
}
.qb-btn-download:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,.42); }

/* ── PDF VIEWER ── */
.qb-viewer { position:fixed; inset:0; z-index:50; background:#f8fafc; display:flex; flex-direction:column; }
.qb-viewer-head {
  height:60px; background:#fff; border-bottom:1px solid #f1f5f9;
  padding:0 20px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
  box-shadow:0 2px 8px rgba(0,0,0,.04);
}
.qb-viewer-head-left  { display:flex; align-items:center; gap:12px; }
.qb-viewer-head-title { font-size:13.5px; font-weight:800; color:#0f172a; }
.qb-viewer-head-sub   { font-size:10.5px; color:#94a3b8; margin-top:1px; }
.qb-viewer-head-right { display:flex; align-items:center; gap:10px; }
.qb-vhbtn {
  height:38px; padding:0 16px; border-radius:12px; border:1.5px solid #e2e8f0; background:#fff;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-size:12.5px; font-weight:600;
  cursor:pointer; color:#374151; display:flex; align-items:center; gap:6px; transition:all .2s;
}
.qb-vhbtn:hover { border-color:#6366f1; color:#6366f1; }
.qb-vhbtn-dl {
  height:38px; padding:0 18px; border-radius:12px; border:none;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-size:12.5px; font-weight:700;
  cursor:pointer; display:flex; align-items:center; gap:6px;
  box-shadow:0 3px 10px rgba(99,102,241,.28); transition:all .2s;
}
.qb-vhbtn-dl:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(99,102,241,.4); }
.qb-vhclose {
  width:36px; height:36px; border-radius:11px; border:1.5px solid #f1f5f9; background:#fff;
  display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; transition:all .2s;
}
.qb-vhclose:hover { border-color:#ef4444; color:#ef4444; }

.qb-viewer-body { flex:1; display:flex; overflow:hidden; }
.qb-viewer-sb {
  width:264px; background:#fff; border-right:1px solid #f1f5f9;
  overflow-y:auto; flex-shrink:0; padding:20px 16px;
  display:flex; flex-direction:column; gap:20px;
}
.qb-sb-section-title { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#94a3b8; margin-bottom:10px; display:flex; align-items:center; gap:5px; }
.qb-sec-item { cursor:pointer; padding:10px 12px; border-radius:12px; border:1px solid #f1f5f9; margin-bottom:7px; transition:all .18s; }
.qb-sec-item:hover { border-color:#c7d2fe; background:rgba(99,102,241,.04); }
.qb-sec-item-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
.qb-sec-lbl  { font-size:12.5px; font-weight:700; color:#374151; transition:color .18s; }
.qb-sec-item:hover .qb-sec-lbl { color:#6366f1; }
.qb-sec-page { font-size:10px; color:#94a3b8; font-weight:500; }
.qb-sec-diff-badge { font-size:9.5px; font-weight:700; padding:2px 7px; border-radius:20px; }
.qb-sec-bar-bg   { height:4px; background:#f1f5f9; border-radius:4px; overflow:hidden; }
.qb-sec-bar-fill { height:100%; border-radius:4px; transition:width .8s; }

.qb-ai-card { padding:14px; border-radius:14px; border:1px solid; }
.qb-ai-card-title { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; margin-bottom:7px; display:flex; align-items:center; gap:5px; }
.qb-ai-card-text  { font-size:11.5px; line-height:1.6; }

.qb-predict-btn {
  width:100%; padding:10px 14px; border-radius:12px;
  border:1.5px solid rgba(139,92,246,.3); background:rgba(139,92,246,.06);
  font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-size:12px; font-weight:700;
  cursor:pointer; color:#7c3aed; display:flex; align-items:center; justify-content:center; gap:6px; transition:all .2s;
}
.qb-predict-btn:hover { background:rgba(139,92,246,.12); }

.qb-pdf-area { flex:1; background:#e2e8f0; overflow-y:auto; padding:28px 20px; }
.qb-pdf-area::-webkit-scrollbar { width:6px; }
.qb-pdf-area::-webkit-scrollbar-thumb { background:rgba(99,102,241,.25); border-radius:99px; }
.qb-pdf-page-wrap { position:relative; background:#fff; box-shadow:0 4px 24px rgba(0,0,0,.12); margin:0 auto 24px; overflow:hidden; border-radius:4px; max-width:860px; }
.qb-watermark { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; opacity:.04; transform:rotate(-45deg); font-size:80px; font-weight:900; text-transform:uppercase; white-space:nowrap; color:#0f172a; z-index:30; letter-spacing:-2px; }
.qb-pdf-verified { position:absolute; bottom:12px; right:14px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.15em; color:#94a3b8; opacity:.5; z-index:40; }

.qb-mobile-parts { display:none; }
.ep-paper-wrapper {
  width:100%; max-width:860px; margin:0 auto; padding:34px 44px 42px;
  background:#fff; color:#111827; border:1px solid #d8dee8; border-radius:2px;
  box-shadow:0 12px 36px rgba(15,23,42,.16);
}
.ep-paper-header { text-align:center; padding-bottom:18px; }
.ep-paper-school { font-family:Georgia,'Times New Roman',serif; font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#475569; }
.ep-paper-exam-title { margin-top:8px; font-family:Georgia,'Times New Roman',serif; font-size:25px; font-weight:700; color:#111827; line-height:1.2; }
.ep-paper-subject { margin-top:4px; font-size:13px; font-weight:600; color:#64748b; }
.ep-paper-meta-row {
  margin:18px auto 0; display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
  max-width:520px; border:1px solid #cbd5e1; border-radius:2px; overflow:hidden;
}
.ep-paper-meta-item { padding:10px 12px; border-right:1px solid #cbd5e1; background:#f8fafc; }
.ep-paper-meta-item:last-child { border-right:none; }
.ep-paper-meta-val { font-size:16px; line-height:1; font-weight:800; color:#111827; }
.ep-paper-meta-lbl { margin-top:4px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#64748b; }
.ep-paper-divider { margin-top:18px; height:2px; background:#111827; position:relative; }
.ep-paper-divider::after { content:''; position:absolute; left:0; right:0; top:5px; height:1px; background:#cbd5e1; }
.ep-part-section { padding:24px 0 4px; border-bottom:1px solid #e5e7eb; scroll-margin-top:24px; }
.ep-part-section:last-child { border-bottom:none; padding-bottom:0; }
.ep-part-header {
  display:flex; align-items:flex-start; justify-content:space-between; gap:14px;
  padding:0 0 12px; margin-bottom:12px; border-bottom:1px solid #111827;
}
.ep-part-left { display:flex; align-items:flex-start; gap:12px; min-width:0; }
.ep-part-badge {
  width:34px; height:34px; border-radius:2px; border:1px solid #111827;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
  font-size:15px; font-weight:800; color:#111827; background:#fff;
}
.ep-part-title { font-family:Georgia,'Times New Roman',serif; font-size:17px; font-weight:700; color:#111827; line-height:1.25; }
.ep-part-subtitle { margin-top:3px; font-size:12px; font-weight:600; color:#64748b; }
.ep-paper-questions { display:flex; flex-direction:column; gap:10px; }
.ep-paper-qn {
  display:grid; grid-template-columns:32px minmax(0,1fr) auto; gap:12px; align-items:flex-start;
  padding:0 0 10px; border-bottom:1px dashed #d1d5db; background:#fff;
  margin-bottom: 8px;
}
.ep-paper-qn:last-child { border-bottom:none; padding-bottom:0; }
.ep-paper-qn-section-header {
  grid-column: 1 / -1;
  font-size: 11px;
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0e7ff;
  margin-top: 16px;
}
.ep-paper-qn-section-header:first-child { margin-top: 0; }
.ep-paper-qn-num {
  width:28px; height:28px; border-radius:50%; border:1px solid #cbd5e1;
  display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:#111827;
}
.ep-paper-qn-text { font-family:Georgia,'Times New Roman',serif; font-size:15px; line-height:1.65; color:#111827; overflow-wrap:anywhere; }
.ep-paper-qn-unit {
  max-width:160px; padding:4px 8px; border-radius:2px; background:#f8fafc; border:1px solid #e2e8f0;
  font-size:10px; line-height:1.2; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:#64748b;
  white-space:normal; text-align:right;
}
.ep-paper-empty {
  padding:28px 18px; border:1px dashed #cbd5e1; background:#f8fafc;
  text-align:center; font-size:13px; font-weight:600; color:#64748b;
}

.qb-predictor-overlay { position:absolute; inset:0; z-index:60; background:rgba(15,23,42,.55); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:24px; }
.qb-predictor-card { background:#fff; border-radius:20px; max-width:400px; width:100%; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,.2); }
.qb-predictor-head { padding:18px 22px; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; }
.qb-predictor-title { font-size:14px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:7px; }
.qb-predictor-body  { padding:20px 22px; }
.qb-predictor-row   { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9; }
.qb-predictor-row:last-child { border-bottom:none; }
.qb-predictor-lbl { font-size:12.5px; color:#64748b; font-weight:500; }
.qb-predictor-val { font-size:13px; font-weight:700; color:#6366f1; }

.qb-scroll-top {
  position:fixed; bottom:28px; right:24px; z-index:80;
  width:44px; height:44px; border-radius:50%; background:#fff;
  border:1.5px solid #f1f5f9; box-shadow:0 4px 16px rgba(0,0,0,.12);
  display:flex; align-items:center; justify-content:center; cursor:pointer; color:#6366f1; transition:all .2s;
}
.qb-scroll-top:hover { transform:translateY(-2px); }

.qb-mob-fab {
  position:fixed; bottom:24px; right:24px; z-index:70;
  width:50px; height:50px; border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); border:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center; color:#fff;
  box-shadow:0 6px 20px rgba(99,102,241,.38); transition:all .2s;
}

.qb-empty { text-align:center; padding:64px 24px; }
.qb-empty-icon { width:72px; height:72px; border-radius:20px; background:rgba(99,102,241,.08); border:1px solid rgba(99,102,241,.12); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; }
.qb-empty-title { font-size:17px; font-weight:700; color:#374151; margin-bottom:8px; }
.qb-empty-sub   { font-size:13.5px; color:#94a3b8; }

/* ── RESPONSIVE ── */
@media (max-width:1024px) { .qb-viewer-sb { width:220px; } }
@media (max-width:900px)  {
  .qb-viewer-sb { display:none; }
  .qb-mobile-parts {
    position:sticky; top:0; z-index:20; display:flex; gap:8px; overflow-x:auto;
    margin:-28px -20px 18px; padding:12px 16px; background:rgba(248,250,252,.96);
    border-bottom:1px solid #e2e8f0; backdrop-filter:blur(8px);
  }
  .qb-mobile-part-btn {
    flex:0 0 auto; height:34px; padding:0 12px; border-radius:2px; border:1px solid #cbd5e1;
    background:#fff; color:#334155; font-family:'Plus Jakarta Sans',system-ui,sans-serif;
    font-size:12px; font-weight:800; cursor:pointer;
  }
}
@media (max-width:768px) {
  .qb-hero { padding:24px 20px; margin-bottom:20px; }
  .qb-hero-right { display:none; }
  .qb-grid { grid-template-columns:1fr; }
  .qb-viewer-head { padding:0 14px; }
  .qb-vhbtn-print { display:none; }
  .qb-filters { gap:8px; }
  .qb-search-wrap { max-width:none; }
  .qb-subj-chips { display:none; }   /* hide on mobile — use dropdown only */
  .qb-pdf-area { padding:28px 14px 20px; }
  .ep-paper-wrapper { padding:24px 18px 28px; }
  .ep-paper-exam-title { font-size:21px; }
  .ep-paper-meta-row { grid-template-columns:1fr; max-width:none; }
  .ep-paper-meta-item { border-right:none; border-bottom:1px solid #cbd5e1; }
  .ep-paper-meta-item:last-child { border-bottom:none; }
  .ep-paper-qn { grid-template-columns:28px minmax(0,1fr); }
  .ep-paper-qn-unit { grid-column:2; justify-self:start; max-width:100%; text-align:left; }
}
@media (max-width:480px) {
  .qb-paper-foot { flex-direction:column; }
  .qb-filters { flex-wrap:wrap; }
  .qb-search-wrap { min-width:100%; order:1; }
  .qb-year-wrap   { order:2; }
  .qb-viewer-head-title { max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .qb-vhbtn-dl { padding:0 12px; }
  .ep-part-title { font-size:15px; }
  .ep-paper-qn-text { font-size:14px; line-height:1.6; }
}

/* ── CARD GRID VIEW ── */
.qb-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:20px; margin-top:28px; }
.qb-qbank-card {
  background:#fff; border-radius:16px; border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05); overflow:hidden;
  transition:all .3s cubic-bezier(.34,1.56,.64,1); cursor:pointer;
  display:flex; flex-direction:column;
}
.qb-qbank-card:hover {
  transform:translateY(-4px); box-shadow:0 12px 32px rgba(99,102,241,.15);
  border-color:rgba(99,102,241,.2);
}
.qb-card-header {
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  color:#fff; padding:20px; position:relative; overflow:hidden;
}
.qb-card-header::before { content:''; position:absolute; top:-30px; right:-30px; width:120px; height:120px; border-radius:50%; background:rgba(255,255,255,.1); }
.qb-card-header-inner { position:relative; z-index:1; }
.qb-card-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; background:rgba(255,255,255,.18); padding:4px 10px; border-radius:20px; margin-bottom:10px; border:1px solid rgba(255,255,255,.25); }
.qb-card-title { font-size:20px; font-weight:800; margin-bottom:4px; }
.qb-card-subject { font-size:13px; opacity:.85; }

.qb-card-meta {
  display:grid; grid-template-columns:repeat(2,1fr); gap:12px; padding:16px 20px;
  border-bottom:1px solid #f1f5f9; font-size:13px;
}
.qb-card-meta-item { }
.qb-card-meta-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#94a3b8; margin-bottom:3px; }
.qb-card-meta-val { font-size:14px; font-weight:800; color:#0f172a; }

.qb-card-stats {
  display:flex; gap:12px; padding:16px 20px; border-bottom:1px solid #f1f5f9;
  background:#f8fafc;
}
.qb-card-stat {
  flex:1; text-align:center; padding:8px;
  border-radius:10px; background:#fff; border:1px solid #e2e8f0;
}
.qb-card-stat-val { font-size:16px; font-weight:800; color:#6366f1; }
.qb-card-stat-lbl { font-size:9px; color:#94a3b8; margin-top:2px; }

.qb-card-actions {
  display:flex; gap:10px; padding:16px 20px; margin-top:auto;
}
.qb-card-btn {
  flex:1; padding:10px 14px; border-radius:10px; border:none;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-size:12px;
  font-weight:700; cursor:pointer; transition:all .2s;
  display:flex; align-items:center; justify-content:center; gap:6px;
}
.qb-card-btn-view {
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  box-shadow:0 4px 12px rgba(99,102,241,.25);
}
.qb-card-btn-view:hover {
  transform:translateY(-2px); box-shadow:0 6px 16px rgba(99,102,241,.35);
}
.qb-card-btn-download {
  background:#fff; color:#6366f1; border:1.5px solid #e2e8f0;
  box-shadow:0 2px 8px rgba(0,0,0,.04);
}
.qb-card-btn-download:hover {
  border-color:#6366f1; box-shadow:0 4px 12px rgba(99,102,241,.1);
}

.qb-landing-header {
  padding:28px 0; margin-bottom:20px;
  display:flex; align-items:center; justify-content:space-between;
  flex-wrap:wrap; gap:16px;
}
.qb-landing-title { font-size:28px; font-weight:800; color:#0f172a; }
.qb-landing-back {
  padding:10px 16px; border-radius:12px; border:1.5px solid #e2e8f0;
  background:#fff; color:#64748b; font-family:'Plus Jakarta Sans',system-ui;
  font-size:13px; font-weight:600; cursor:pointer; transition:all .2s;
  display:flex; align-items:center; gap:6px;
}
.qb-landing-back:hover {
  border-color:#6366f1; color:#6366f1;
}

@media (max-width:768px) {
  .qb-grid { grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
  .qb-landing-header { flex-direction:column; align-items:flex-start; }
  .qb-card-header { padding:16px; }
  .qb-card-title { font-size:18px; }
}
`;

// Helper function to get difficulty color
const diffColor = (d: string) =>
  d === "hard" || d === "Hard" ? "#ef4444" : d === "medium" || d === "Medium" ? "#f59e0b" : "#10b981";

const diffTagCls = (d: string) =>
  d === "hard" || d === "Hard"
    ? "qb-tag-hard"
    : d === "medium" || d === "Medium"
      ? "qb-tag-medium"
      : "qb-tag-easy";

const barColor = (diff: number) =>
  diff > 80 ? "#ef4444" : diff > 60 ? "#f59e0b" : "#10b981";

// Group questions by marks/type
const groupQuestionsByMarks = (questions: Question[]): Record<number, Question[]> => {
  return questions.reduce(
    (acc, q) => {
      if (!acc[q.marks]) acc[q.marks] = [];
      acc[q.marks].push(q);
      return acc;
    },
    {} as Record<number, Question[]>
  );
};

// Get unique topics from questions
const getTopicsFromQuestions = (questions: Question[]): string[] => {
  const topics = new Set(questions.map((q) => q.topic).filter(Boolean));
  return Array.from(topics).slice(0, 5); // Top 5 topics
};

// Calculate difficulty distribution
const getDifficultyStats = (questions: Question[]) => {
  let easy = 0,
    medium = 0,
    hard = 0;
  questions.forEach((q) => {
    if (q.difficulty === "easy") easy++;
    else if (q.difficulty === "medium") medium++;
    else if (q.difficulty === "hard") hard++;
  });
  return { easy, medium, hard };
};

/* ── Year Dropdown Component ── */
const YearDropdown = ({
  value,
  onChange,
  data,
}: {
  value: string;
  onChange: (v: string) => void;
  data: any[];
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const countForYear = (y: string) =>
    y === "all"
      ? data.length
      : data.filter((p) => p.year.toString() === y).length;

  const label = value === "all" ? "All Years" : value;

  return (
    <div className="qb-year-wrap" ref={ref}>
      <button
        className={`qb-year-btn${open ? " open" : ""}${value !== "all" ? " has-filter" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {label}
        <ChevronDown size={13} className="qb-chev" />
      </button>

      {open && (
        <div className="qb-year-menu">
          {/* All Years option */}
          <div
            className={`qb-year-option${value === "all" ? " sel" : ""}`}
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
          >
            <span>All Years</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="qb-year-count">{countForYear("all")}</span>
              {value === "all" && <div className="qb-year-check" />}
            </div>
          </div>

          <div className="qb-year-sep" />

          {/* Individual year options */}
          {ALL_YEARS.map((y) => (
            <div
              key={y}
              className={`qb-year-option${value === y.toString() ? " sel" : ""}`}
              onClick={() => {
                onChange(y.toString());
                setOpen(false);
              }}
            >
              <span>{y}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="qb-year-count">
                  {countForYear(y.toString())}
                </span>
                {value === y.toString() && <div className="qb-year-check" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function QuestionBank() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [yearFilt, setYearFilt] = useState("all");
  const [apiDataList, setApiDataList] = useState<QuestionBankResponse["data"][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<QuestionBankResponse["data"] | false>(false);
  const [showTop, setShowTop] = useState(false);
  const [showPred, setShowPred] = useState(false);
  const [showMobSb, setShowMobSb] = useState(false);
  const { userHeader } = useAuth();
  const [role, setRole] = useState("student");
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userHeader?.role) setRole(userHeader.role);
  }, [userHeader]);

  // Fetch API data based on query parameters
  useEffect(() => {
    const fetchQuestionBank = async () => {
      const params = new URLSearchParams(window.location.search);
      const board = params.get("board") || "";
      const classNumber = params.get("classNumber") || "";
      const subject = params.get("subject") || "";
      const subjectGroupKey = params.get("subjectGroupKey") || "";

      if (!board || !classNumber || !subject || !subjectGroupKey) {
        setError("Missing required parameters");
        setLoading(false);
        return;
      }

      try {
        const queryString = `board=${encodeURIComponent(board)}&classNumber=${encodeURIComponent(classNumber)}&subject=${encodeURIComponent(subject)}&subjectGroupKey=${encodeURIComponent(subjectGroupKey)}`;
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/v1/tutor/tutor/question-bank?${queryString}`
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`);
        }

        const data: QuestionBankResponse = await response.json();

        if (data.status && data.data) {
        const bankData = Array.isArray(data.data) ? data.data : [data.data];
          setApiDataList(bankData);
        } else {
          setError("Invalid response format");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionBank();
  }, []);

  // Extract data from API response for use throughout component
  // const examName = apiData?.examName || "";
  // const subject = apiData?.subject || "";
  // const classNumber = apiData?.classNumber || "";
  // const board = apiData?.board || "";
  // const year = apiData?.year || "";
  // const totalQuestions = apiData?.totalQuestions || 0;
  
  // // Calculate total marks from questions
  // const totalMarks = apiData?.questions?.reduce((sum, q) => sum + q.marks, 0) || 0;
  
  // // Group questions by marks
  // const questionsByMarks = apiData ? groupQuestionsByMarks(apiData.questions) : {};
  
  // // Get difficulty stats
  // const diffStats = apiData ? getDifficultyStats(apiData.questions) : { easy: 0, medium: 0, hard: 0 };
  
  // // Get top topics
  // const topicsList = apiData ? getTopicsFromQuestions(apiData.questions) : [];

  const dl = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };
  const print = (url: string) => {
    const w = window.open(url, "_blank");
    if (w) w.onload = () => w.print();
  };
  const scrollToPart = (partKey: string) => {
    const el = document.getElementById(`qbank-part-${partKey}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const scrollTop = () => {
    pdfRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

// Helper function to generate PDF content as HTML string
  const generatePDFContentForBank = (bank: QuestionBankResponse["data"]): string => {
    const bankQuestionsByMarks = groupQuestionsByMarks(bank.questions);
    const bankTotalMarks = bank.questions.reduce((sum, q) => sum + q.marks, 0);
    
    let html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${bank.subject}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Georgia, serif; color: #111827; line-height: 1.6; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #111827; margin-bottom: 30px; }
            .school { font-family: Georgia, serif; font-size: 11px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
            .exam-title { font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #111827; line-height: 1.2; margin: 8px 0; }
            .meta-row { margin: 18px 0; display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #cbd5e1; border-radius: 2px; overflow: hidden; }
            .meta-item { padding: 10px 12px; border-right: 1px solid #cbd5e1; background: #f8fafc; }
            .meta-item:last-child { border-right: none; }
            .meta-val { font-size: 16px; font-weight: bold; color: #111827; }
            .meta-lbl { margin-top: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
            .section { page-break-inside: avoid; margin-bottom: 30px; }
            .section-header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 1px solid #111827; }
            .section-badge { width: 34px; height: 34px; border-radius: 2px; border: 1px solid #111827; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: bold; color: #111827; background: #fff; }
            .section-title { font-family: Georgia, serif; font-size: 16px; font-weight: bold; color: #111827; line-height: 1.25; }
            .section-subtitle { margin-top: 3px; font-size: 11px; font-weight: 600; color: #64748b; }
            .question { display: grid; grid-template-columns: 30px 1fr auto; gap: 12px; padding-bottom: 10px; border-bottom: 1px dashed #d1d5db; align-items: flex-start; }
            .question:last-child { border-bottom: none; padding-bottom: 0; }
            .q-num { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #111827; flex-shrink: 0; }
            .q-text { font-size: 13px; line-height: 1.5; color: #111827; }
            .q-options { margin-top: 8px; margin-left: 42px; display: flex; flex-direction: column; gap: 6px; }
            .q-option { font-size: 12px; color: #374151; }
            .q-marks { font-size: 11px; font-weight: 600; color: #64748b; white-space: nowrap; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school">Model Question Paper</div>
            <div class="exam-title">${bank.subject}</div>
            <div style="margin-top: 4px; font-size: 13px; font-weight: 600; color: #64748b;">Class ${bank.classNumber} | ${bank.board} | ${bank.year}</div>
            <div class="meta-row">
              <div class="meta-item"><div class="meta-val">${bank.totalQuestions}</div><div class="meta-lbl">Questions</div></div>
              <div class="meta-item"><div class="meta-val">${bankTotalMarks}</div><div class="meta-lbl">Total Marks</div></div>
              <div class="meta-item"><div class="meta-val">3 hrs</div><div class="meta-lbl">Duration</div></div>
            </div>
          </div>
    `;

    // Group and display questions by marks
    Object.keys(bankQuestionsByMarks)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((marks) => {
        const marksQuestions = bankQuestionsByMarks[parseInt(marks)];
        const sectionNum = Object.keys(bankQuestionsByMarks).indexOf(marks) + 1;
        
        html += `
          <div class="section">
            <div class="section-header">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div class="section-badge">${sectionNum}</div>
                <div>
                  <div class="section-title">${marks}-Mark Questions</div>
                  <div class="section-subtitle">Each question carries ${marks} mark${marks > 1 ? "s" : ""}</div>
                </div>
              </div>
            </div>
            <div>
        `;

        let lastSectionTitle = "";
        
        marksQuestions.forEach((q, idx) => {
          const isNewSection = q.section_title && q.section_title !== lastSectionTitle;
          if (isNewSection) {
            lastSectionTitle = q.section_title;
          }
          
          html += `
            ${isNewSection ? `
              <div style="
                font-size: 11px;
                font-weight: bold;
                color: #6366f1;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin: 16px 0 12px 0;
                padding-bottom: 10px;
                border-bottom: 2px solid #e0e7ff;
              ">
                ${q.section_title}
              </div>
            ` : ""}
            <div class="question">
              <div class="q-num">${idx + 1}</div>
              <div class="q-text">
                ${q.question}
                ${q.options && q.options.length > 0 ? `
                  <div class="q-options">
                    ${q.options.map((opt) => `<div class="q-option">○ ${opt}</div>`).join("")}
                  </div>
                ` : ""}
              </div>
              <div class="q-marks">${marks}M</div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });

    html += `
        </body>
      </html>
    `;

    return html;
  };

  // Wrapper function for single API data (for backward compatibility)
  const generatePDFContent = (): string => {
    if (!apiDataList || apiDataList.length === 0) return "";
    return generatePDFContentForBank(apiDataList[0]);
  };

  // Helper function to download PDF
  const downloadPDF = (htmlContent: string, filename: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);
    };
  };

  // ── Landing view ──────────────────────────────────────────────────────────
  if (!preview) {
    // Show loading state
    if (loading) {
      return (
        <div className="qb">
          <style>{CSS}</style>
          <Navigation currentRole={role} onRoleChange={setRole} />
          <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#94a3b8"
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Loading Questions...</div>
              <div style={{ fontSize: 14 }}>Please wait while we fetch your question bank.</div>
            </div>
          </div>
        </div>
      );
    }

    // Show error state
    if (error || !apiDataList || apiDataList.length === 0) {
      return (
        <div className="qb">
          <style>{CSS}</style>
          <Navigation currentRole={role} onRoleChange={setRole} />
          <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "rgba(239,68,68,.1)",
              borderRadius: 16,
              color: "#dc2626"
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Error Loading Questions</div>
              <div style={{ fontSize: 14, marginBottom: 16 }}>{error || "Failed to load question bank"}</div>
              <button
                onClick={() => setLocation("/ai-tutor")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="qb">
        <style>{CSS}</style>
        <Navigation currentRole={role} onRoleChange={setRole} />
        <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
          {/* Landing Header */}
          <div className="qb-landing-header">
            <div>
              <div className="qb-landing-title">Question Banks</div>
            </div>
            <button
              onClick={() => setLocation("/ai-tutor")}
              className="qb-landing-back"
            >
              <ArrowLeft size={15} /> Back
            </button>
          </div>

          {/* Question Bank Cards Grid */}
          <div className="qb-grid">
            {apiDataList.map((bank) => {
              const bankDiffStats = getDifficultyStats(bank.questions);
              const bankTopics = getTopicsFromQuestions(bank.questions);
              const bankQuestionsByMarks = groupQuestionsByMarks(bank.questions);
              const bankTotalMarks = bank.questions.reduce((sum, q) => sum + q.marks, 0);

              return (
                <div key={bank.documentId} className="qb-qbank-card">
                  {/* Card Header */}
                  <div className="qb-card-header">
                    <div className="qb-card-header-inner">
                      <div className="qb-card-badge">
                        <GraduationCap size={11} />
                        {bank.examName}
                      </div>
                      <div className="qb-card-title">{bank.subject}</div>
                      <div className="qb-card-subject">
                        Class {bank.classNumber} • {bank.board}
                      </div>
                    </div>
                  </div>

                  {/* Meta Information */}
                  <div className="qb-card-meta">
                    <div className="qb-card-meta-item">
                      <div className="qb-card-meta-lbl">Year</div>
                      <div className="qb-card-meta-val">{bank.year}</div>
                    </div>
                    <div className="qb-card-meta-item">
                      <div className="qb-card-meta-lbl">Questions</div>
                      <div className="qb-card-meta-val">{bank.totalQuestions}</div>
                    </div>
                    <div className="qb-card-meta-item">
                      <div className="qb-card-meta-lbl">Total Marks</div>
                      <div className="qb-card-meta-val">{bankTotalMarks}</div>
                    </div>
                    <div className="qb-card-meta-item">
                      <div className="qb-card-meta-lbl">Board</div>
                      <div className="qb-card-meta-val">{bank.board}</div>
                    </div>
                  </div>

                  {/* Difficulty Stats */}
                  <div className="qb-card-stats">
                    <div className="qb-card-stat">
                      <div className="qb-card-stat-val" style={{ color: "#10b981" }}>
                        {bankDiffStats.easy}
                      </div>
                      <div className="qb-card-stat-lbl">Easy</div>
                    </div>
                    <div className="qb-card-stat">
                      <div className="qb-card-stat-val" style={{ color: "#f59e0b" }}>
                        {bankDiffStats.medium}
                      </div>
                      <div className="qb-card-stat-lbl">Medium</div>
                    </div>
                    <div className="qb-card-stat">
                      <div className="qb-card-stat-val" style={{ color: "#ef4444" }}>
                        {bankDiffStats.hard}
                      </div>
                      <div className="qb-card-stat-lbl">Hard</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="qb-card-actions">
                    <button
                      className="qb-card-btn qb-card-btn-view"
                      onClick={() => setPreview(bank)}
                    >
                      <Eye size={13} /> View PDF
                    </button>
                    <button
                      className="qb-card-btn qb-card-btn-download"
                      onClick={() => {
                        const htmlContent = generatePDFContentForBank(bank);
                        downloadPDF(htmlContent, `${bank.subject}_${bank.year}.pdf`);
                      }}
                    >
                      <Download size={13} /> Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {apiDataList.length === 0 && (
            <div className="qb-empty">
              <div className="qb-empty-icon">
                <BookOpen size={36} />
              </div>
              <div className="qb-empty-title">No Question Banks Found</div>
              <div className="qb-empty-sub">
                Try adjusting your filters or check back later
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PDF Viewer view ───────────────────────────────────────────────────────
  
  // Extract variables from preview object
  if (!preview || typeof preview === 'boolean') {
    return null;
  }

  const subject = preview.subject;
  const classNumber = preview.classNumber;
  const board = preview.board;
  const year = preview.year;
  const totalQuestions = preview.totalQuestions;
  const totalMarks = preview.questions.reduce((sum: number, q: Question) => sum + q.marks, 0);
  const diffStats = getDifficultyStats(preview.questions);
  const topicsList = getTopicsFromQuestions(preview.questions);
  const questionsByMarks = groupQuestionsByMarks(preview.questions);

  return (
    <div className="qb">
      <style>{CSS}</style>
      <div className="qb-viewer">
        <div className="qb-viewer-head">
          <div className="qb-viewer-head-left">
            <button
              className="qb-vhclose"
              onClick={() => {
                setPreview(false);
                setShowTop(false);
                setShowPred(false);
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <div style={{ width: 1, height: 28, background: "#f1f5f9" }} />
            <div>
              <div className="qb-viewer-head-title">Question Paper</div>
              <div className="qb-viewer-head-sub">
                {preview.subject} | Class {preview.classNumber} | {preview.year}
              </div>
            </div>
          </div>
          <div className="qb-viewer-head-right">
            <button
              className="qb-vhbtn qb-vhbtn-print"
              onClick={() => {
                const htmlContent = generatePDFContentForBank(preview);
                const iframe = document.createElement("iframe");
                iframe.style.display = "none";
                document.body.appendChild(iframe);
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (doc) {
                  doc.open();
                  doc.write(htmlContent);
                  doc.close();
                  iframe.onload = () => {
                    iframe.contentWindow?.print();
                    setTimeout(() => {
                      document.body.removeChild(iframe);
                    }, 100);
                  };
                }
              }}
            >
              <Printer size={14} />
              Print
            </button>
            <button
              className="qb-vhbtn-dl"
              onClick={() => {
                const htmlContent = generatePDFContentForBank(preview);
                downloadPDF(htmlContent, `${preview.subject}_${preview.year}.pdf`);
              }}
            >
              <Download size={14} />
              Download PDF
            </button>
          </div>
        </div>

        <div className="qb-viewer-body">
          <div className="qb-viewer-sb">
            <div>
              <div className="qb-sb-section-title">
                <Bookmark size={12} />
                Quick Links
              </div>
              {Object.keys(questionsByMarks)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((marks, idx) => {
                  const questionsInMark = questionsByMarks[parseInt(marks)];
                  return (
                    <div
                      key={marks}
                      className="qb-sec-item"
                      onClick={() => scrollToPart(`part${idx + 1}`)}
                    >
                      <div className="qb-sec-item-top">
                        <span className="qb-sec-lbl">{marks}M Questions</span>
                        <span
                          className="qb-sec-diff-badge"
                          style={{
                            background: "rgba(15,23,42,.06)",
                            color: "#334155",
                          }}
                        >
                          {questionsInMark.length} Q{questionsInMark.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="qb-sec-page" style={{ marginBottom: 6 }}>
                        {parseInt(marks)} mark{parseInt(marks) > 1 ? "s" : ""} each
                      </div>
                      <div className="qb-sec-bar-bg">
                        <div
                          className="qb-sec-bar-fill"
                          style={{ width: "100%", background: "#111827" }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
            <div
              className="qb-ai-card"
              style={{
                background: "rgba(99,102,241,.08)",
                borderColor: "rgba(99,102,241,.12)",
              }}
            >
              <div className="qb-ai-card-title" style={{ color: "#6366f1" }}>
                <Sparkles size={11} />
                Study Guide
              </div>
              <div
                className="qb-ai-card-text"
                style={{ color: "rgba(99,102,241,.8)" }}
              >
                {topicsList.length > 0
                  ? `Focus on: ${topicsList.join(", ")}`
                  : "Review all topics systematically"}
              </div>
            </div>
            <div
              className="qb-ai-card"
              style={{
                background: "rgba(239,68,68,.05)",
                borderColor: "rgba(239,68,68,.15)",
              }}
            >
              <div className="qb-ai-card-title" style={{ color: "#dc2626" }}>
                <AlertTriangle size={11} />
                Mistake Radar
              </div>
              <div
                className="qb-ai-card-text"
                style={{ color: "rgba(185,28,28,.8)" }}
              >
                {preview.questions && preview.questions.length > 0
                  ? "Review carefully - common mistakes detected in this topic"
                  : "No mistake data available"}
              </div>
            </div>
            <button
              className="qb-predict-btn"
              onClick={() => setShowPred(true)}
            >
              <PieChart size={13} />
              Topic Predictor
            </button>
          </div>

          <div
            className="qb-pdf-area"
            ref={pdfRef}
            onScroll={(e) => {
              setShowTop((e.target as HTMLElement).scrollTop > 600);
            }}
          >
 <div className="qb-mobile-parts">
              {Object.keys(questionsByMarks)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((marks, idx) => (
                  <button
                    key={marks}
                    className="qb-mobile-part-btn"
                    onClick={() => scrollToPart(`part${idx + 1}`)}
                  >
                    {marks}M Questions
                  </button>
                ))}
            </div>

            <div className="ep-paper-wrapper">
              <div className="ep-paper-header">
                <div className="ep-paper-school">Model Question Paper</div>
                <div className="ep-paper-exam-title">{subject}</div>
                <div className="ep-paper-subject">Class {classNumber} | {board} | {year}</div>
                <div className="ep-paper-meta-row">
                  <div className="ep-paper-meta-item">
                    <div className="ep-paper-meta-val">{totalQuestions}</div>
                    <div className="ep-paper-meta-lbl">Questions</div>
                  </div>
                  <div className="ep-paper-meta-item">
                    <div className="ep-paper-meta-val">{totalMarks}</div>
                    <div className="ep-paper-meta-lbl">Total Marks</div>
                  </div>
                  <div className="ep-paper-meta-item">
                    <div className="ep-paper-meta-val">3 hrs</div>
                    <div className="ep-paper-meta-lbl">Duration</div>
                  </div>
                </div>
                <div className="ep-paper-divider" />
              </div>

              {totalQuestions === 0 && (
                <div className="ep-paper-empty">
                  Questions for this subject are not available yet.
                </div>
              )}

              {Object.keys(questionsByMarks)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((marks, partIdx) => {
                  const qs = questionsByMarks[parseInt(marks)];
                  if (!qs || qs.length === 0) return null;
                  return (
                    <div
                      id={`qbank-part-part${partIdx + 1}`}
                      key={marks}
                      className="ep-part-section"
                    >
                      <div className="ep-part-header">
                        <div className="ep-part-left">
                          <div className="ep-part-badge">{partIdx + 1}</div>
                          <div>
                            <div className="ep-part-title">
                              {marks}-Mark Questions
                            </div>
                            <div className="ep-part-subtitle">
                              Each question carries {marks} mark
                              {parseInt(marks) > 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ep-paper-questions">
                        {qs.map((q, qi) => {
                          // Check if this is first question or section changed
                          const prevQuestion = qi > 0 ? qs[qi - 1] : null;
                          const showSection = !prevQuestion || prevQuestion.section_title !== q.section_title;
                          
                          return (
                            <div key={q.question_id}>
                              {showSection && q.section_title && (
                                <div style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#6366f1",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  marginBottom: 12,
                                  paddingBottom: 10,
                                  borderBottom: "2px solid #e0e7ff",
                                  marginTop: qi > 0 ? 16 : 0
                                }}>
                                  {q.section_title}
                                </div>
                              )}
                              <div className="ep-paper-qn" style={{ marginBottom: 12 }}>
                                <div className="ep-paper-qn-num">{qi + 1}</div>
                                <div className="ep-paper-qn-text">
                                  {q.question}
                                  {q.options && q.options.length > 0 && (
                                    <div style={{ marginTop: 8, marginLeft: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                                      {q.options.map((opt, optIdx) => (
                                        <div key={optIdx} style={{ fontSize: 12, color: "#374151" }}>
                                          {String.fromCharCode(97 + optIdx)}) {opt}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="ep-paper-qn-unit">{q.difficulty}</span>
                           
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {showPred && (
            <div className="qb-predictor-overlay">
              <div className="qb-predictor-card">
                <div className="qb-predictor-head">
                  <div className="qb-predictor-title">
                    <PieChart size={15} style={{ color: "#8b5cf6" }} />
                    Topic Weightage
                  </div>
                  <button
                    onClick={() => setShowPred(false)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: "1.5px solid #f1f5f9",
                      background: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="qb-predictor-body">
                  {topicsList && topicsList.length > 0 ? (
                    (() => {
                      const difficulty = getDifficultyStats(preview.questions);
                      const percentEasy = Math.round((difficulty.easy / preview.totalQuestions) * 100);
                      const percentMedium = Math.round((difficulty.medium / preview.totalQuestions) * 100);
                      const percentHard = Math.round((difficulty.hard / preview.totalQuestions) * 100);
                      
                      return (
                        <>
                          <div className="qb-predictor-row">
                            <span className="qb-predictor-lbl">Easy Questions</span>
                            <span className="qb-predictor-val">{percentEasy}%</span>
                          </div>
                          <div className="qb-predictor-row">
                            <span className="qb-predictor-lbl">Medium Questions</span>
                            <span className="qb-predictor-val">{percentMedium}%</span>
                          </div>
                          <div className="qb-predictor-row">
                            <span className="qb-predictor-lbl">Hard Questions</span>
                            <span className="qb-predictor-val">{percentHard}%</span>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="qb-predictor-row">
                      <span className="qb-predictor-lbl">No data</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {showTop && (
          <button className="qb-scroll-top" onClick={scrollTop}>
            <ArrowUp size={18} />
          </button>
        )}

        <button
          className="qb-mob-fab"
          style={{ display: "none" }}
          onClick={() => setShowMobSb((o) => !o)}
        >
          {showMobSb ? <X size={20} /> : <List size={20} />}
        </button>
      </div>
    </div>
  );
}
