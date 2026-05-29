import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAuth } from "../../hooks/use-auth";
import Navigation from "../../components/navigation";
import {
  ArrowLeft, Download, Eye, Search, X, Printer,
  Timer, Bookmark, ArrowUp, Sparkles,
  PieChart, Zap, Activity, AlertTriangle, ChevronDown,
  GraduationCap, BookOpen, List,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
@media (max-width:900px)  { .qb-viewer-sb { display:none; } }
@media (max-width:768px) {
  .qb-hero { padding:24px 20px; margin-bottom:20px; }
  .qb-hero-right { display:none; }
  .qb-grid { grid-template-columns:1fr; }
  .qb-viewer-head { padding:0 14px; }
  .qb-vhbtn-print { display:none; }
  .qb-filters { gap:8px; }
  .qb-search-wrap { max-width:none; }
  .qb-subj-chips { display:none; }   /* hide on mobile — use dropdown only */
}
@media (max-width:480px) {
  .qb-paper-foot { flex-direction:column; }
  .qb-filters { flex-wrap:wrap; }
  .qb-search-wrap { min-width:100%; order:1; }
  .qb-year-wrap   { order:2; }
}
`;

const QUESTION_BANK_DATA = [
  {
    id:1, subjectId:1, year:2025, type:"Board Exam",
    title:"Class 12 Mathematics (8312)",
    fileUrl:"/pdfs/tn-board-class-12-mathematics-8312-set-a-2025.pdf",
    difficulty:"Hard", duration:"3.00 Hours", topics:["Calculus","Vectors","Probability"],
    sections:[{label:"Part I (MCQs)",page:1,diff:40},{label:"Part II (2-Marks)",page:6,diff:60},{label:"Part III (3-Marks)",page:8,diff:75},{label:"Part IV (5-Marks)",page:10,diff:95}],
    aiHint:"Part IV heavily tests Cramer's rule, DeMorgan's theorems, and vector equations of planes.",
    crackStrategy:"Prioritize the parabolic arch bridge problem and the growth of population differential equation for 5-mark sections.",
    topicWeightage:"Analytical Geometry: 35%, Calculus: 40%, Discrete Math: 25%",
    mistakeRadar:"Commonly missed: Forgetting to verify if the matrix is non-singular before inversion.",
  },
  {
    id:2, subjectId:2, year:2025, type:"Board Exam",
    title:"Class 12 Physics (8317 - Set B)",
    fileUrl:"/pdfs/tn-board-class-12-physics-8317-set-b-2025.pdf",
    difficulty:"Hard", duration:"3.00 Hours", topics:["Optics","Electromagnetism","Electronics"],
    sections:[{label:"Part I (MCQs)",page:1,diff:45},{label:"Part II (2-Marks)",page:7,diff:55},{label:"Part III (3-Marks)",page:8,diff:70},{label:"Part IV (5-Marks)",page:9,diff:90}],
    aiHint:"Focus on Fizeau's method for light speed and DeMorgan's theorems in digital logic.",
    crackStrategy:"Master the induction of emf by changing area and Brewster's Law for Part IV.",
    topicWeightage:"Optics: 30%, Electromagnetism: 40%, Atomic Physics: 30%",
    mistakeRadar:"Watch out for the specific requirement of drawing the forward biased p-n junction diode circuit diagram.",
  },
  {
    id:3, subjectId:2, year:2024, type:"Board Exam",
    title:"Class 12 Physics (7417 - Set A)",
    fileUrl:"/pdfs/tn-board-class-12-physics-7417-set-a-2024.pdf",
    difficulty:"Hard", duration:"3.00 Hours", topics:["Electrostatics","Nuclear","Optics"],
    sections:[{label:"Part I (MCQs)",page:1,diff:35},{label:"Part II (2-Marks)",page:7,diff:50},{label:"Part III (3-Marks)",page:8,diff:65},{label:"Part IV (5-Marks)",page:10,diff:95}],
    aiHint:"Recurring derivations include Einstein's photoelectric equation and Maxwell's modification of Ampere's law.",
    crackStrategy:"Review nuclear reactor components (Moderators/Control rods) as they are standard Part IV theory questions.",
    topicWeightage:"Electrostatics: 35%, Nuclear Physics: 30%, Optics: 35%",
    mistakeRadar:"Commonly missed: Distinguishing between near point and normal focusing in simple microscopes.",
  },
  {
    id:4, subjectId:3, year:2025, type:"Board Exam",
    title:"Class 12 Computer Science (8372)",
    fileUrl:"/pdfs/tn-board-class-12-computer-science-8372-2025.pdf",
    difficulty:"Medium", duration:"3.00 Hours", topics:["Python","SQL","Data Models"],
    sections:[{label:"Part I (MCQs)",page:1,diff:30},{label:"Part II (2-Marks)",page:6,diff:45},{label:"Part III (3-Marks)",page:7,diff:60},{label:"Part IV (5-Marks)",page:9,diff:80}],
    aiHint:"Part IV requires detailed Python file modes and SQL aggregate functions like AVG() and SUM().",
    crackStrategy:"Practice the pure vs impure function examples and relational operators for Part IV.",
    topicWeightage:"Python: 45%, SQL: 35%, Data Structures: 20%",
    mistakeRadar:"Students often confuse the output of Python range slicing, especially negative indexing.",
  },
];

const diffColor   = (d:string) => d==="Hard"?"#ef4444":d==="Medium"?"#f59e0b":"#10b981";
const diffTagCls  = (d:string) => d==="Hard"?"qb-tag-hard":d==="Medium"?"qb-tag-medium":"qb-tag-easy";
const barColor    = (diff:number) => diff>80?"#ef4444":diff>60?"#f59e0b":"#10b981";

// Derive all unique years from data, sorted descending
const ALL_YEARS = [...new Set(QUESTION_BANK_DATA.map(p => p.year))].sort((a,b)=>b-a);

/* ── Year Dropdown Component ── */
const YearDropdown = ({
  value, onChange, data,
}: {
  value: string;
  onChange: (v: string) => void;
  data: typeof QUESTION_BANK_DATA;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const countForYear = (y: string) =>
    y === "all" ? data.length : data.filter(p => p.year.toString() === y).length;

  const label = value === "all" ? "All Years" : value;

  return (
    <div className="qb-year-wrap" ref={ref}>
      <button
        className={`qb-year-btn${open ? " open" : ""}${value !== "all" ? " has-filter" : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {label}
        <ChevronDown size={13} className="qb-chev" />
      </button>

      {open && (
        <div className="qb-year-menu">
          {/* All Years option */}
          <div
            className={`qb-year-option${value === "all" ? " sel" : ""}`}
            onClick={() => { onChange("all"); setOpen(false); }}
          >
            <span>All Years</span>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span className="qb-year-count">{countForYear("all")}</span>
              {value === "all" && <div className="qb-year-check"/>}
            </div>
          </div>

          <div className="qb-year-sep"/>

          {/* Individual year options */}
          {ALL_YEARS.map(y => (
            <div
              key={y}
              className={`qb-year-option${value === y.toString() ? " sel" : ""}`}
              onClick={() => { onChange(y.toString()); setOpen(false); }}
            >
              <span>{y}</span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span className="qb-year-count">{countForYear(y.toString())}</span>
                {value === y.toString() && <div className="qb-year-check"/>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function QuestionBank() {
  const [, setLocation]     = useLocation();
  const [search,   setSearch]   = useState("");
  const [yearFilt, setYearFilt] = useState("all");
  const [preview,  setPreview]  = useState<(typeof QUESTION_BANK_DATA)[0]|null>(null);
  const [numPages, setNumPages] = useState<number|null>(null);
  const [showTop,  setShowTop]  = useState(false);
  const [showPred, setShowPred] = useState(false);
  const [showMobSb,setShowMobSb]= useState(false);
  const { userHeader }          = useAuth();
  const [role, setRole]         = useState("student");
  const pdfRef                  = useRef<HTMLDivElement>(null);

  useEffect(()=>{ if(userHeader?.role) setRole(userHeader.role); },[userHeader]);

  const params      = new URLSearchParams(window.location.search);
  const activeSubId = params.get("subjectId") ? parseInt(params.get("subjectId")!) : null;

  const filteredPapers = QUESTION_BANK_DATA.filter(p => {
    const ms = activeSubId ? p.subjectId === activeSubId : true;
    const my = yearFilt === "all" || p.year.toString() === yearFilt;
    const mq = p.title.toLowerCase().includes(search.toLowerCase());
    return ms && my && mq;
  });

  const dl    = (url:string,name:string) => { const a=document.createElement("a");a.href=url;a.download=name;a.click(); };
  const print = (url:string) => { const w=window.open(url,"_blank");if(w) w.onload=()=>w.print(); };
  const scrollTo  = (page:number) => { const el=document.getElementById(`qbp_${page}`);if(el) el.scrollIntoView({behavior:"smooth",block:"start"}); };
  const scrollTop = () => { pdfRef.current?.scrollTo({top:0,behavior:"smooth"}); };

  const hasActiveFilters = yearFilt !== "all" || !!search;

  // ── Landing view ──────────────────────────────────────────────────────────
  if (!preview) {
    return (
      <div className="qb">
        <style>{CSS}</style>
        <Navigation currentRole={role} onRoleChange={setRole}/>
        <div style={{padding:"28px 32px",maxWidth:1280,margin:"0 auto"}}>

          {/* Hero */}
          <div className="qb-hero">
            <div className="qb-hero-inner">
              <div>
                <div className="qb-hero-badge"><GraduationCap size={13}/>GradeUp Vault</div>
                <div className="qb-hero-title">Premium Question Bank 📚</div>
                <div className="qb-hero-sub">
                  {activeSubId
                    ? `Showing papers for Subject ${activeSubId}`
                    : "Official board papers with AI-powered insights, section analysis & topic weightage."}
                </div>
              </div>
              <div className="qb-hero-right">
                <div className="qb-hero-stat"><div className="qb-hero-sv">{QUESTION_BANK_DATA.length}</div><div className="qb-hero-sl">Papers</div></div>
                <div className="qb-hero-div"/>
                <div className="qb-hero-stat"><div className="qb-hero-sv">4</div><div className="qb-hero-sl">Subjects</div></div>
                <div className="qb-hero-div"/>
                <div className="qb-hero-stat"><div className="qb-hero-sv">{ALL_YEARS.length}</div><div className="qb-hero-sl">Years</div></div>
              </div>
            </div>
          </div>

          {/* Filters bar */}
          <div className="qb-filters">
            {/* Back button */}
            <button
              onClick={()=>setLocation("/ai-tutor")}
              style={{height:42,padding:"0 16px",borderRadius:14,border:"1.5px solid #f1f5f9",background:"#fff",display:"flex",alignItems:"center",gap:7,fontFamily:"'Plus Jakarta Sans',system-ui",fontSize:13,fontWeight:600,color:"#64748b",cursor:"pointer",transition:"all .2s",boxShadow:"0 2px 8px rgba(0,0,0,.04)",whiteSpace:"nowrap",flexShrink:0}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#6366f1";e.currentTarget.style.color="#6366f1";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#f1f5f9";e.currentTarget.style.color="#64748b";}}>
              <ArrowLeft size={15}/> Back
            </button>

            {/* Search */}
            <div className="qb-search-wrap">
              <Search size={15} className="qb-search-ico"/>
              <input
                className="qb-search-inp"
                value={search}
                onChange={e=>setSearch(e.target.value)}
                placeholder="Search papers…"
              />
              {search && (
                <button
                  onClick={()=>setSearch("")}
                  style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",display:"flex",padding:2}}>
                  <X size={13}/>
                </button>
              )}
            </div>

            {/* Year dropdown */}
            <YearDropdown
              value={yearFilt}
              onChange={setYearFilt}
              data={QUESTION_BANK_DATA}
            />
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="qb-active-filters">
              {yearFilt !== "all" && (
                <span className="qb-filter-pill">
                  📅 {yearFilt}
                  <button onClick={()=>setYearFilt("all")} title="Remove year filter"><X size={9}/></button>
                </span>
              )}
              {search && (
                <span className="qb-filter-pill">
                  🔍 "{search}"
                  <button onClick={()=>setSearch("")} title="Clear search"><X size={9}/></button>
                </span>
              )}
              <button
                onClick={()=>{setYearFilt("all");setSearch("");}}
                style={{fontSize:11.5,fontWeight:700,color:"#94a3b8",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"4px 8px",borderRadius:20,transition:"color .15s"}}
                onMouseEnter={e=>(e.currentTarget.style.color="#ef4444")}
                onMouseLeave={e=>(e.currentTarget.style.color="#94a3b8")}>
                Clear all
              </button>
            </div>
          )}

          {/* Results count */}
          <div style={{fontSize:12.5,fontWeight:600,color:"#94a3b8",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:"#0f172a",fontWeight:800}}>{filteredPapers.length}</span> paper{filteredPapers.length!==1?"s":""} found
            {yearFilt !== "all" && <span style={{color:"#6366f1"}}>in {yearFilt}</span>}
          </div>

          {/* Grid */}
          {filteredPapers.length === 0 ? (
            <div className="qb-empty">
              <div className="qb-empty-icon"><BookOpen size={30} style={{color:"#6366f1"}}/></div>
              <div className="qb-empty-title">No papers found</div>
              <div className="qb-empty-sub">
                Try adjusting your search or{" "}
                <button onClick={()=>{setYearFilt("all");setSearch("");}} style={{background:"none",border:"none",color:"#6366f1",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:"inherit"}}>
                  clear all filters
                </button>
              </div>
            </div>
          ) : (
            <div className="qb-grid">
              {filteredPapers.map((paper,i)=>(
                <div key={paper.id} className="qb-paper-card" style={{animationDelay:`${i*.07}s`}}>
                  <div className="qb-diff-strip" style={{background:diffColor(paper.difficulty)}}/>
                  <div className="qb-paper-head">
                    <div className="qb-paper-tags">
                      <span className="qb-tag qb-tag-year">{paper.year}</span>
                      <span className="qb-tag qb-tag-type">{paper.type}</span>
                      <span className={`qb-tag ${diffTagCls(paper.difficulty)}`}>{paper.difficulty}</span>
                    </div>
                    <div className="qb-paper-title">{paper.title}</div>
                    <div className="qb-paper-meta">
                      <span className="qb-paper-meta-item"><Timer size={11}/>{paper.duration}</span>
                      <span className="qb-paper-meta-item"><Activity size={11}/>Conceptual</span>
                    </div>
                  </div>
                  <div className="qb-paper-body">
                    <div>
                      <div className="qb-topics-label"><Zap size={11} style={{color:"#f59e0b"}}/>High-Yield Topics</div>
                      <div className="qb-topics-row">
                        {paper.topics.map(t=><span key={t} className="qb-topic-tag">{t}</span>)}
                      </div>
                    </div>
                    <div>
                      <div className="qb-bars-label">Sectional Intensity</div>
                      <div className="qb-bars-row">
                        {paper.sections.map((s,idx)=>(
                          <div key={idx} className="qb-bar-col" style={{height:`${s.diff}%`,background:barColor(s.diff)}}/>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="qb-paper-foot">
                    <button className="qb-btn-preview" onClick={()=>{setPreview(paper);setNumPages(null);}}>
                      <Eye size={15}/>Preview
                    </button>
                    <button className="qb-btn-download" onClick={()=>dl(paper.fileUrl,`${paper.title}.pdf`)}>
                      <Download size={15}/>Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PDF Viewer view ───────────────────────────────────────────────────────
  return (
    <div className="qb">
      <style>{CSS}</style>
      <div className="qb-viewer">

        <div className="qb-viewer-head">
          <div className="qb-viewer-head-left">
            <button className="qb-vhclose" onClick={()=>{setPreview(null);setNumPages(null);setShowTop(false);setShowPred(false);}}>
              <X size={18}/>
            </button>
            <div style={{width:1,height:28,background:"#f1f5f9"}}/>
            <div>
              <div className="qb-viewer-head-title">{preview.title}</div>
              <div className="qb-viewer-head-sub">{preview.year} Official Board Paper</div>
            </div>
          </div>
          <div className="qb-viewer-head-right">
            <button className="qb-vhbtn qb-vhbtn-print" onClick={()=>print(preview.fileUrl)}>
              <Printer size={14}/>Print
            </button>
            <button className="qb-vhbtn-dl" onClick={()=>dl(preview.fileUrl,`${preview.title}.pdf`)}>
              <Download size={14}/>Download
            </button>
          </div>
        </div>

        <div className="qb-viewer-body">
          <div className="qb-viewer-sb">
            <div>
              <div className="qb-sb-section-title"><Bookmark size={12}/>Quick Links</div>
              {preview.sections.map((s,i)=>(
                <div key={i} className="qb-sec-item" onClick={()=>scrollTo(s.page)}>
                  <div className="qb-sec-item-top">
                    <span className="qb-sec-lbl">{s.label}</span>
                    <span className="qb-sec-diff-badge" style={{background:`${barColor(s.diff)}18`,color:barColor(s.diff)}}>{s.diff}%</span>
                  </div>
                  <div className="qb-sec-page" style={{marginBottom:6}}>Page {s.page}</div>
                  <div className="qb-sec-bar-bg"><div className="qb-sec-bar-fill" style={{width:`${s.diff}%`,background:barColor(s.diff)}}/></div>
                </div>
              ))}
            </div>
            <div className="qb-ai-card" style={{background:"rgba(139,92,246,.06)",borderColor:"rgba(139,92,246,.2)"}}>
              <div className="qb-ai-card-title" style={{color:"#7c3aed"}}><Sparkles size={11}/>AI Cracker</div>
              <div className="qb-ai-card-text" style={{color:"rgba(109,40,217,.8)"}}>{preview.crackStrategy}</div>
            </div>
            <div className="qb-ai-card" style={{background:"rgba(239,68,68,.05)",borderColor:"rgba(239,68,68,.15)"}}>
              <div className="qb-ai-card-title" style={{color:"#dc2626"}}><AlertTriangle size={11}/>Mistake Radar</div>
              <div className="qb-ai-card-text" style={{color:"rgba(185,28,28,.8)"}}>{preview.mistakeRadar}</div>
            </div>
            <button className="qb-predict-btn" onClick={()=>setShowPred(true)}>
              <PieChart size={13}/>Topic Predictor
            </button>
          </div>

          <div className="qb-pdf-area" ref={pdfRef} onScroll={e=>{setShowTop((e.target as HTMLElement).scrollTop>600);}}>
            <Document file={preview.fileUrl} onLoadSuccess={({numPages})=>setNumPages(numPages)}>
              {Array.from(new Array(numPages),(_, idx)=>(
                <div key={`qbp_${idx+1}`} id={`qbp_${idx+1}`} className="qb-pdf-page-wrap">
                  <div className="qb-watermark">GradeUp AI</div>
                  <Page pageNumber={idx+1} renderTextLayer={false} renderAnnotationLayer={false} width={Math.min(800,window.innerWidth-80)} className="z-10"/>
                  <div className="qb-pdf-verified">Verified Resource 2026</div>
                </div>
              ))}
            </Document>
          </div>

          {showPred && (
            <div className="qb-predictor-overlay">
              <div className="qb-predictor-card">
                <div className="qb-predictor-head">
                  <div className="qb-predictor-title"><PieChart size={15} style={{color:"#8b5cf6"}}/>Topic Weightage</div>
                  <button onClick={()=>setShowPred(false)} style={{width:28,height:28,borderRadius:8,border:"1.5px solid #f1f5f9",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8"}}><X size={14}/></button>
                </div>
                <div className="qb-predictor-body">
                  {preview.topicWeightage.split(",").map((item,i)=>{
                    const [lbl,val]=item.split(":");
                    return (
                      <div key={i} className="qb-predictor-row">
                        <span className="qb-predictor-lbl">{lbl?.trim()}</span>
                        <span className="qb-predictor-val">{val?.trim()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {showTop && (
          <button className="qb-scroll-top" onClick={scrollTop}><ArrowUp size={18}/></button>
        )}

        <button className="qb-mob-fab" style={{display:"none"}} onClick={()=>setShowMobSb(o=>!o)}>
          {showMobSb?<X size={20}/>:<List size={20}/>}
        </button>
      </div>
    </div>
  );
}