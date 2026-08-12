import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

// ─── DARK MODE CONTEXT ────────────────────────────────────────────────────────
const ThemeCtx = React.createContext({ dark: false, toggle: () => {} });

// ─── API ABSTRACTION LAYER ────────────────────────────────────────────────────
const API = {
  getModules:       () => Promise.resolve(mockModules),
  createModule:     (m) => Promise.resolve({ ...m, id: `mod-${Date.now()}` }),
  updateModule:     (m) => Promise.resolve(m),
  deleteModule:     (id) => Promise.resolve({ id }),
  getChapters:      (moduleId) => Promise.resolve(mockModules.find(m => m.id === moduleId)?.chapters || []),
  createChapter:    (c) => Promise.resolve({ ...c, id: `chap-${Date.now()}` }),
  updateChapter:    (c) => Promise.resolve(c),
  deleteChapter:    (id) => Promise.resolve({ id }),
  getLessons:       () => Promise.resolve(mockLessons),
  createLesson:     (l) => Promise.resolve({ ...l, id: `les-${Date.now()}` }),
  updateLesson:     (l) => Promise.resolve(l),
  deleteLesson:     (id) => Promise.resolve({ id }),
  getResources:     () => Promise.resolve(mockResources),
  uploadResource:   (r) => Promise.resolve({ ...r, id: `res-${Date.now()}` }),
  deleteResource:   (id) => Promise.resolve({ id }),
  publishModule:    (id, settings) => Promise.resolve({ id, ...settings }),
  getPublishStatus: () => Promise.resolve(mockPublishStatus),
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const mockModules = [
  {
    id: "mod-1", title: "Module 1: Algebra Basics", subject: "Mathematics",
    dueDate: "2026-09-30", status: "in-progress", completedChapters: 1, totalChapters: 3,
    chapters: [
      { id: "c1", moduleId: "mod-1", title: "Introduction to Variables", status: "completed",   duration: 45, type: "lecture",  objectives: "Understand variables and constants",      resources: ["res-1"] },
      { id: "c2", moduleId: "mod-1", title: "Solving Linear Equations",  status: "in-progress", duration: 50, type: "lecture",  objectives: "Solve one-step and two-step equations",  resources: [] },
      { id: "c3", moduleId: "mod-1", title: "Graphing Linear Equations", status: "not-started", duration: 55, type: "lab",      objectives: "Plot equations on coordinate plane",     resources: ["res-2"] },
    ],
  },
  {
    id: "mod-2", title: "Module 2: Geometry", subject: "Mathematics",
    dueDate: "2026-10-31", status: "not-started", completedChapters: 0, totalChapters: 2,
    chapters: [
      { id: "c4", moduleId: "mod-2", title: "Properties of Triangles",   status: "not-started", duration: 45, type: "lecture",  objectives: "Identify triangle types and properties",            resources: [] },
      { id: "c5", moduleId: "mod-2", title: "Circles and Circumference", status: "not-started", duration: 40, type: "activity", objectives: "Calculate circumference and area of circles", resources: ["res-3"] },
    ],
  },
  {
    id: "mod-3", title: "Module 3: Trigonometry", subject: "Mathematics",
    dueDate: "2026-11-30", status: "not-started", completedChapters: 0, totalChapters: 3,
    chapters: [
      { id: "c6", moduleId: "mod-3", title: "Sine, Cosine, Tangent",    status: "not-started", duration: 60, type: "lecture", objectives: "Memorize and apply basic trig ratios",   resources: [] },
      { id: "c7", moduleId: "mod-3", title: "Unit Circle",              status: "not-started", duration: 55, type: "lab",     objectives: "Navigate and apply the unit circle",    resources: [] },
      { id: "c8", moduleId: "mod-3", title: "Trigonometric Identities", status: "not-started", duration: 65, type: "lecture", objectives: "Prove and apply trig identities",        resources: [] },
    ],
  },
];

const SEG_TYPES = [
  { value: "warm-up",  label: "Warm-Up"     },
  { value: "lecture",  label: "Lecture"     },
  { value: "practice", label: "Practice"    },
  { value: "qa",       label: "Q & A"       },
  { value: "exit",     label: "Exit Ticket" },
  { value: "activity", label: "Activity"    },
  { value: "demo",     label: "Demo"        },
];

const initialLessons = [
  {
    id: "les-1", chapterId: "c2", moduleId: "mod-1", date: "2026-07-01",
    title: "Day 1: Solving One-Step Equations", classGroup: "10-A",
    color: "#6366f1",
    segments: [
      { id: "s1", type: "warm-up",  label: "Warm-Up",     duration: 5,  content: "Mental math quiz – simplify 5 expressions in 5 minutes." },
      { id: "s2", type: "lecture",  label: "Lecture",     duration: 20, content: "Introduce inverse operations. Demonstrate 4 worked examples on board." },
      { id: "s3", type: "practice", label: "Practice",    duration: 15, content: "Students solve 8 problems from workbook pg 42 independently." },
      { id: "s4", type: "qa",       label: "Q&A",         duration: 10, content: "Open floor discussion. Address common errors from practice round." },
      { id: "s5", type: "exit",     label: "Exit Ticket", duration: 5,  content: "Solve 2 equations. Turn in slip before leaving." },
    ],
    differentiatedTracks: [
      { label: "Advanced", note: "Introduce two-step equations as bonus challenge." },
      { label: "Support",  note: "Provide equation balance visual aid worksheet." },
    ],
    status: "draft",
  },
  {
    id: "les-2", chapterId: "c1", moduleId: "mod-1", date: "2026-06-25",
    title: "Day 3: Variables in Real Life", classGroup: "10-A",
    color: "#10b981",
    segments: [
      { id: "s6", type: "warm-up",  label: "Warm-Up",     duration: 5,  content: "Class discussion: where do we see unknowns in daily life?" },
      { id: "s7", type: "lecture",  label: "Lecture",     duration: 25, content: "Word problem to algebra translation — 6 examples." },
      { id: "s8", type: "practice", label: "Practice",    duration: 15, content: "Group activity: translate 5 real-world scenarios into equations." },
      { id: "s9", type: "exit",     label: "Exit Ticket", duration: 5,  content: "Write one real-life problem and its algebraic expression." },
    ],
    differentiatedTracks: [],
    status: "published",
  },
  {
    id: "les-3", chapterId: "c3", moduleId: "mod-1", date: "2026-07-08",
    title: "Graphing on Coordinate Plane", classGroup: "10-B",
    color: "#f59e0b",
    segments: [
      { id: "s10", type: "warm-up",  label: "Warm-Up",     duration: 5,  content: "Plot 5 coordinate pairs quickly." },
      { id: "s11", type: "lecture",  label: "Lecture",     duration: 20, content: "Introduce slope-intercept form y = mx + b." },
      { id: "s12", type: "activity", label: "Activity",    duration: 20, content: "Graphing on graph paper with coloured pens." },
      { id: "s13", type: "exit",     label: "Exit Ticket", duration: 5,  content: "Graph one equation from scratch." },
    ],
    differentiatedTracks: [
      { label: "Advanced", note: "Explore parallel and perpendicular lines." },
    ],
    status: "draft",
  },
];

const mockResources = [
  { id: "res-1", name: "Algebra_Intro_Slides.pdf", type: "pdf",   size: "2.4 MB",  linkedModules: ["mod-1"], uploadedAt: "2026-06-10" },
  { id: "res-2", name: "Graphing_Tutorial.mp4",    type: "video", size: "45.1 MB", linkedModules: ["mod-1"], uploadedAt: "2026-06-12" },
  { id: "res-3", name: "Geometry_Basics.pptx",     type: "ppt",   size: "8.2 MB",  linkedModules: ["mod-2"], uploadedAt: "2026-06-15" },
  { id: "res-4", name: "Trig_Formula_Sheet.pdf",   type: "pdf",   size: "0.8 MB",  linkedModules: ["mod-3"], uploadedAt: "2026-06-18" },
  { id: "res-5", name: "Unit_Circle_Visual.png",   type: "image", size: "1.1 MB",  linkedModules: ["mod-3"], uploadedAt: "2026-06-20" },
];

const mockPublishStatus = [
  { moduleId: "mod-1", published: true,  publishDate: "2026-06-20", gated: false, dripEnabled: false },
  { moduleId: "mod-2", published: false, publishDate: "2026-09-01", gated: true,  dripEnabled: true  },
  { moduleId: "mod-3", published: false, publishDate: "2026-10-01", gated: true,  dripEnabled: true  },
];

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root{
  --bg-app:#f0f2f8;
  --bg-panel:#ffffff;
  --bg-panel2:#f8fafc;
  --bg-hover:rgba(99,102,241,.07);
  --border:rgba(0,0,0,.07);
  --border2:#e8edf5;
  --text-main:#0f172a;
  --text-sub:#4b5563;
  --text-muted:#94a3b8;
  --shadow:0 1px 8px rgba(0,0,0,.05),0 2px 16px rgba(0,0,0,.04);
  --shadow2:0 8px 32px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
  --prog-bg:#e8edf5;
  --btn-bg:#ffffff;
  --btn-text:#374151;
  --btn-hover:#f0f0ff;
  --btn-htext:#6366f1;
  --input-bg:#ffffff;
  --scrollbar:#d1d5db;
  --hero-overlay:rgba(255,255,255,.12);
}
.dark-theme{
  --bg-app:#0d1117;
  --bg-panel:#161b27;
  --bg-panel2:#1c2333;
  --bg-hover:rgba(99,102,241,.14);
  --border:rgba(255,255,255,.07);
  --border2:rgba(255,255,255,.06);
  --text-main:#f0f4ff;
  --text-sub:#8b9fc9;
  --text-muted:#4a5578;
  --shadow:0 1px 8px rgba(0,0,0,.4),0 2px 16px rgba(0,0,0,.3);
  --shadow2:0 8px 32px rgba(0,0,0,.55),0 2px 8px rgba(0,0,0,.3);
  --prog-bg:rgba(255,255,255,.08);
  --btn-bg:rgba(255,255,255,.04);
  --btn-text:#8b9fc9;
  --btn-hover:rgba(99,102,241,.18);
  --btn-htext:#a5b4fc;
  --input-bg:#1c2333;
  --scrollbar:#2d3748;
  --hero-overlay:rgba(0,0,0,.15);
}

/* Scrollbars */
*::-webkit-scrollbar{width:5px;height:5px;}
*::-webkit-scrollbar-track{background:transparent;}
*::-webkit-scrollbar-thumb{background:var(--scrollbar);border-radius:3px;}
.dark-theme *::-webkit-scrollbar-thumb{background:#2d3748;}

.cp-root{
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  background:var(--bg-app);
  color:var(--text-main);
  min-height:100vh;
  transition:background .25s,color .25s;
  padding-bottom:env(safe-area-inset-bottom,0px);
}

/* ── Hero ── */
.am-hero{
  margin:16px 20px 0;border-radius:22px;padding:18px 24px;
  background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#db2777 100%);
  position:relative;overflow:hidden;color:#fff;
  box-shadow:0 8px 30px rgba(79,70,229,.32);
}
.am-hero::before{content:'';position:absolute;top:-80px;right:-80px;width:240px;height:240px;border-radius:50%;background:var(--hero-overlay);pointer-events:none;}
.am-hero::after{content:'';position:absolute;bottom:-60px;left:25%;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.05);pointer-events:none;}
.am-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.am-hero-left{display:flex;align-items:center;gap:14px;min-width:0;}
.am-hero-icon{width:48px;height:48px;border-radius:16px;background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.am-hero-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 11px;border-radius:20px;margin-bottom:6px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);font-size:10px;font-weight:700;color:#fff;letter-spacing:.04em;}
.am-hero-title{font-size:clamp(15px,3.5vw,22px);font-weight:800;color:#fff;letter-spacing:-.3px;line-height:1.2;}
.am-hero-sub{font-size:11px;color:rgba(255,255,255,.65);margin-top:3px;}
.am-hero-right{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.am-hstat{text-align:center;padding:8px 14px;border-radius:14px;min-width:54px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2);}
.am-hstat-n{font-size:17px;font-weight:800;color:#fff;line-height:1;}
.am-hstat-l{font-size:9px;color:rgba(255,255,255,.6);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}

/* Theme toggle */
.am-theme-btn{
  width:36px;height:36px;border-radius:12px;border:1.5px solid rgba(255,255,255,.3);
  background:rgba(255,255,255,.15);color:#fff;font-size:15px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;
}
.am-theme-btn:hover{background:rgba(255,255,255,.25);}

/* ── Nav ── */
.am-nav{display:flex;gap:5px;padding:14px 20px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.am-nav::-webkit-scrollbar{display:none;}
.am-nav-btn{
  padding:8px 16px;border-radius:13px;border:1.5px solid var(--border2);
  background:var(--bg-panel);font-family:inherit;font-size:12.5px;font-weight:600;
  color:var(--text-sub);cursor:pointer;transition:all .18s;white-space:nowrap;
  display:flex;align-items:center;gap:6px;flex-shrink:0;min-height:38px;
  touch-action:manipulation;-webkit-tap-highlight-color:transparent;
}
.am-nav-btn:hover{border-color:#6366f1;color:#6366f1;background:var(--bg-hover);}
.am-nav-btn.on{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-color:transparent;box-shadow:0 4px 14px rgba(79,70,229,.35);}

/* ── Stats grid ── */
.am-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:16px 20px 0;}
.am-scard{
  background:var(--bg-panel);border-radius:18px;padding:16px;
  border:1px solid var(--border);box-shadow:var(--shadow);
  transition:transform .25s,box-shadow .25s,background .25s;
  cursor:default;
}
.am-scard:hover{transform:translateY(-3px);box-shadow:var(--shadow2);}
.am-scard.blue   {border-top:3px solid #6366f1;}
.am-scard.green  {border-top:3px solid #10b981;}
.am-scard.amber  {border-top:3px solid #f59e0b;}
.am-scard.purple {border-top:3px solid #8b5cf6;}
.am-scard.rose   {border-top:3px solid #ec4899;}
.am-scard-icon{width:36px;height:36px;border-radius:11px;margin-bottom:11px;display:flex;align-items:center;justify-content:center;font-size:16px;}
.am-scard.blue   .am-scard-icon{background:rgba(99,102,241,.1);}
.am-scard.green  .am-scard-icon{background:rgba(16,185,129,.1);}
.am-scard.amber  .am-scard-icon{background:rgba(245,158,11,.1);}
.am-scard.purple .am-scard-icon{background:rgba(139,92,246,.1);}
.am-scard.rose   .am-scard-icon{background:rgba(236,72,153,.1);}
.am-scard-n{font-size:26px;font-weight:800;color:var(--text-main);letter-spacing:-1.5px;line-height:1;}
.am-scard-l{font-size:11px;color:var(--text-sub);margin-top:3px;font-weight:600;}
.am-scard-sub{font-size:10px;color:#10b981;margin-top:5px;font-weight:700;}
.dark-theme .am-scard.blue   .am-scard-icon{background:rgba(99,102,241,.2);}
.dark-theme .am-scard.green  .am-scard-icon{background:rgba(16,185,129,.2);}
.dark-theme .am-scard.amber  .am-scard-icon{background:rgba(245,158,11,.2);}
.dark-theme .am-scard.purple .am-scard-icon{background:rgba(139,92,246,.2);}
.dark-theme .am-scard.rose   .am-scard-icon{background:rgba(236,72,153,.2);}

/* ── Body ── */
.am-body{padding:16px 20px 80px;}

/* ── Panels ── */
.am-panel{background:var(--bg-panel);border-radius:18px;border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;transition:background .25s,border-color .25s;}
.am-panel-head{padding:16px 18px 12px;border-bottom:1px solid var(--border2);display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.am-panel-title{font-size:14px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:7px;}
.am-panel-sub{font-size:12px;color:var(--text-sub);margin-top:2px;}
.am-panel-body{padding:16px 18px;}
.am-panel-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;flex-shrink:0;}

/* ── Grids ── */
.am-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
.am-main-grid{display:grid;grid-template-columns:1fr 320px;gap:14px;margin-bottom:14px;}

/* ── Buttons ── */
.am-btn{
  padding:8px 15px;border-radius:11px;border:1.5px solid var(--border2);
  background:var(--btn-bg);color:var(--btn-text);font-family:inherit;
  font-size:12px;font-weight:600;cursor:pointer;transition:all .16s;
  display:inline-flex;align-items:center;gap:5px;white-space:nowrap;
  touch-action:manipulation;-webkit-tap-highlight-color:transparent;
  min-height:36px;
}
.am-btn:hover{background:var(--btn-hover);color:var(--btn-htext);border-color:#6366f1;}
.am-btn:active{transform:scale(.97);}
.am-btn.primary{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-color:transparent;box-shadow:0 3px 12px rgba(79,70,229,.3);}
.am-btn.primary:hover{box-shadow:0 5px 18px rgba(79,70,229,.42);color:#fff;}
.am-btn.success{background:rgba(16,185,129,.09);color:#059669;border-color:rgba(16,185,129,.25);}
.am-btn.success:hover{background:rgba(16,185,129,.18);border-color:#10b981;color:#059669;}
.am-btn.danger{background:rgba(239,68,68,.08);color:#dc2626;border-color:rgba(239,68,68,.2);}
.am-btn.danger:hover{background:rgba(239,68,68,.16);border-color:#ef4444;color:#dc2626;}
.am-btn.sm{padding:5px 10px;font-size:11px;min-height:28px;border-radius:8px;}
.am-btn.icon{padding:5px 8px;min-width:28px;justify-content:center;}
.dark-theme .am-btn.success{background:rgba(16,185,129,.15);color:#4ade80;border-color:rgba(16,185,129,.3);}
.dark-theme .am-btn.danger{background:rgba(239,68,68,.14);color:#f87171;border-color:rgba(239,68,68,.3);}

/* ── Section title ── */
.am-section-title{font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
.am-section-title::after{content:'';flex:1;height:1px;background:var(--border2);}

/* ── Inputs ── */
.am-filter-group{display:flex;flex-direction:column;gap:5px;}
.am-filter-label{font-size:10.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;}
.am-filter-input,.am-filter-select,.am-textarea{
  padding:9px 12px;border-radius:10px;border:1.5px solid var(--border2);
  background:var(--input-bg);color:var(--text-main);font-family:inherit;
  font-size:max(16px,13px);outline:none;transition:border-color .2s,background .25s;width:100%;
  appearance:none;-webkit-appearance:none;
}
.am-filter-input:focus,.am-filter-select:focus,.am-textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12);}
.am-textarea{resize:vertical;min-height:80px;}
.dark-theme .am-filter-input,.dark-theme .am-filter-select,.dark-theme .am-textarea{
  background:var(--input-bg);border-color:var(--border2);color:var(--text-main);
}

/* ── Badges ── */
.am-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10.5px;font-weight:700;white-space:nowrap;}
.am-badge.completed    {background:rgba(16,185,129,.12);color:#059669;}
.am-badge.in-progress  {background:rgba(99,102,241,.12);color:#6366f1;}
.am-badge.not-started  {background:rgba(148,163,184,.12);color:#64748b;}
.am-badge.draft        {background:rgba(245,158,11,.12);color:#d97706;}
.am-badge.published    {background:rgba(16,185,129,.12);color:#059669;}
.am-badge.lecture      {background:rgba(99,102,241,.12);color:#6366f1;}
.am-badge.lab          {background:rgba(236,72,153,.12);color:#db2777;}
.am-badge.activity     {background:rgba(245,158,11,.12);color:#d97706;}
.dark-theme .am-badge.completed   {background:rgba(16,185,129,.2);color:#4ade80;}
.dark-theme .am-badge.in-progress {background:rgba(99,102,241,.2);color:#a5b4fc;}
.dark-theme .am-badge.not-started {background:rgba(148,163,184,.12);color:#94a3b8;}
.dark-theme .am-badge.draft       {background:rgba(245,158,11,.2);color:#fbbf24;}
.dark-theme .am-badge.published   {background:rgba(16,185,129,.2);color:#4ade80;}
.dark-theme .am-badge.lecture     {background:rgba(99,102,241,.2);color:#a5b4fc;}
.dark-theme .am-badge.lab         {background:rgba(236,72,153,.2);color:#f472b6;}
.dark-theme .am-badge.activity    {background:rgba(245,158,11,.2);color:#fbbf24;}

/* ── Progress ── */
.am-prog-wrap{height:6px;background:var(--prog-bg);border-radius:6px;overflow:hidden;}
.am-prog-fill{height:100%;border-radius:6px;}

/* ── Legend ── */
.am-legend{display:flex;flex-wrap:wrap;gap:5px 12px;}
.am-legend-item{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--text-sub);}
.am-legend-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}

/* ── Chart tip ── */
.am-tip{background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;padding:8px 12px;box-shadow:0 4px 16px rgba(0,0,0,.15);font-size:12px;font-weight:600;}
.am-tip-label{color:var(--text-sub);margin-bottom:3px;font-size:11px;}
.am-tip-val{color:#6366f1;}

/* ── Module card ── */
.cp-mod-card{
  background:var(--bg-panel2);border:1.5px solid var(--border2);border-radius:14px;
  padding:14px;margin-bottom:10px;transition:border-color .18s,box-shadow .18s,background .25s;cursor:pointer;
}
.cp-mod-card:hover{border-color:#a5b4fc;box-shadow:0 4px 18px rgba(99,102,241,.12);}
.cp-mod-card:active{transform:scale(.995);}
.cp-mod-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px;}
.cp-mod-title{font-size:13.5px;font-weight:700;color:var(--text-main);}
.cp-mod-meta{font-size:11px;color:var(--text-sub);margin-top:2px;}
.cp-mod-actions{display:flex;gap:4px;flex-wrap:wrap;align-items:center;flex-shrink:0;}

/* ── Chapter row ── */
.cp-chap-row{
  display:flex;align-items:center;gap:8px;padding:10px 12px;
  border-radius:12px;background:var(--bg-panel2);border:1px solid var(--border2);
  margin-bottom:8px;cursor:pointer;transition:border-color .15s,background .15s;
}
.cp-chap-row:hover{border-color:#a5b4fc;background:var(--bg-hover);}
.cp-chap-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.cp-chap-title{flex:1;font-size:12.5px;font-weight:600;color:var(--text-main);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cp-chap-meta{font-size:10.5px;color:var(--text-muted);font-weight:600;white-space:nowrap;}
.cp-chap-actions{display:flex;gap:4px;align-items:center;flex-shrink:0;}

/* ── Lesson segment ── */
.cp-seg{border-left:3px solid;border-radius:0 10px 10px 0;padding:11px 14px;margin-bottom:8px;background:var(--bg-panel2);}
.cp-seg.warm-up   {border-color:#f59e0b;}
.cp-seg.lecture   {border-color:#6366f1;}
.cp-seg.practice  {border-color:#10b981;}
.cp-seg.qa        {border-color:#3b82f6;}
.cp-seg.exit      {border-color:#ec4899;}
.cp-seg.activity  {border-color:#f97316;}
.cp-seg.demo      {border-color:#8b5cf6;}
.cp-seg-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;gap:8px;}
.cp-seg-label{font-size:12px;font-weight:700;color:var(--text-main);}
.cp-seg-right{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.cp-seg-dur{font-size:11px;color:var(--text-muted);font-weight:600;}
.cp-seg-content{font-size:12px;color:var(--text-sub);line-height:1.6;}

/* ── Calendar ── */
.cal-wrap{background:var(--bg-panel);border:1px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:var(--shadow);}
.cal-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border2);}
.cal-title{font-size:14px;font-weight:800;color:var(--text-main);}
.cal-nav-btn{width:30px;height:30px;border-radius:9px;border:1.5px solid var(--border2);background:var(--btn-bg);color:var(--text-sub);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
.cal-nav-btn:hover{border-color:#6366f1;color:#6366f1;background:var(--bg-hover);}
.cal-grid-head{display:grid;grid-template-columns:repeat(7,1fr);padding:8px 18px 4px;}
.cal-day-label{font-size:10px;font-weight:800;color:var(--text-muted);text-align:center;text-transform:uppercase;letter-spacing:.05em;}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);padding:4px 10px 12px;gap:3px;}
.cal-cell{
  min-height:52px;border-radius:10px;padding:4px 5px;cursor:pointer;
  transition:background .15s,border-color .15s;border:1.5px solid transparent;
  position:relative;
}
.cal-cell:hover{background:var(--bg-hover);border-color:rgba(99,102,241,.2);}
.cal-cell.other-month{opacity:.35;}
.cal-cell.today .cal-cell-num{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:8px;}
.cal-cell.selected{background:rgba(99,102,241,.1);border-color:#6366f1;}
.cal-cell-num{font-size:11.5px;font-weight:700;color:var(--text-main);padding:2px 5px;display:inline-block;min-width:22px;text-align:center;border-radius:6px;margin-bottom:2px;}
.cal-event-dot{
  display:flex;align-items:center;gap:2px;padding:1.5px 4px;
  border-radius:4px;margin-bottom:2px;cursor:pointer;
  font-size:9px;font-weight:700;color:#fff;line-height:1.3;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  max-width:100%;
}
.cal-more{font-size:9px;font-weight:700;color:#6366f1;padding:0 2px;cursor:pointer;}

/* ── Lesson card (sidebar list) ── */
.lp-lesson-card{
  border-radius:13px;padding:12px;margin-bottom:8px;cursor:pointer;
  border:1.5px solid var(--border2);background:var(--bg-panel2);
  transition:border-color .15s,box-shadow .15s,background .25s;
}
.lp-lesson-card:hover{border-color:#a5b4fc;box-shadow:0 3px 14px rgba(99,102,241,.1);}
.lp-lesson-card.active{border-color:#6366f1;background:rgba(99,102,241,.06);}
.lp-lesson-card-accent{width:4px;border-radius:4px;flex-shrink:0;align-self:stretch;}
.lp-lesson-title{font-size:12.5px;font-weight:700;color:var(--text-main);}
.lp-lesson-meta{font-size:10.5px;color:var(--text-muted);margin-top:3px;font-weight:600;}

/* ── Resource item ── */
.cp-res-item{
  display:flex;align-items:flex-start;gap:10px;padding:12px 14px;
  border-radius:13px;background:var(--bg-panel2);border:1.5px solid var(--border2);
  margin-bottom:8px;transition:border-color .18s,background .25s;
}
.cp-res-item:hover{border-color:#a5b4fc;}
.cp-res-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
.cp-res-icon.pdf   {background:rgba(239,68,68,.1);}
.cp-res-icon.video {background:rgba(99,102,241,.1);}
.cp-res-icon.ppt   {background:rgba(245,158,11,.1);}
.cp-res-icon.image {background:rgba(16,185,129,.1);}
.dark-theme .cp-res-icon.pdf   {background:rgba(239,68,68,.18);}
.dark-theme .cp-res-icon.video {background:rgba(99,102,241,.18);}
.dark-theme .cp-res-icon.ppt   {background:rgba(245,158,11,.18);}
.dark-theme .cp-res-icon.image {background:rgba(16,185,129,.18);}
.cp-res-info{flex:1;min-width:0;}
.cp-res-name{font-size:12.5px;font-weight:700;color:var(--text-main);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cp-res-meta{font-size:10.5px;color:var(--text-muted);margin-top:2px;}
.cp-res-actions{display:flex;gap:4px;flex-wrap:wrap;margin-top:7px;}

/* ── Upload zone ── */
.cp-upload-zone{
  border:2px dashed var(--border2);border-radius:14px;padding:24px 16px;
  text-align:center;cursor:pointer;transition:all .2s;background:var(--bg-panel2);
  margin-bottom:14px;
}
.cp-upload-zone:hover{border-color:#6366f1;background:rgba(99,102,241,.04);}
.cp-upload-icon{font-size:28px;margin-bottom:8px;}
.cp-upload-text{font-size:13px;font-weight:600;color:var(--text-sub);}
.cp-upload-hint{font-size:11px;color:var(--text-muted);margin-top:4px;}

/* ── Toggle ── */
.cp-toggle-wrap{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border2);gap:12px;}
.cp-toggle-wrap:last-child{border-bottom:none;}
.cp-toggle-label{font-size:12.5px;font-weight:600;color:var(--text-main);}
.cp-toggle-sub{font-size:11px;color:var(--text-sub);margin-top:2px;line-height:1.4;}
.cp-toggle{position:relative;width:40px;height:22px;flex-shrink:0;}
.cp-toggle input{opacity:0;width:0;height:0;}
.cp-toggle-slider{position:absolute;inset:0;background:var(--prog-bg);border-radius:22px;cursor:pointer;transition:.28s;}
.cp-toggle-slider:before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.28s;box-shadow:0 1px 4px rgba(0,0,0,.2);}
.cp-toggle input:checked + .cp-toggle-slider{background:linear-gradient(135deg,#4f46e5,#7c3aed);}
.cp-toggle input:checked + .cp-toggle-slider:before{transform:translateX(18px);}

/* ── Publish row ── */
.cp-pub-row{border-radius:14px;padding:14px;border:1.5px solid var(--border2);margin-bottom:10px;transition:border-color .18s,background .25s;background:var(--bg-panel2);}
.cp-pub-row:hover{border-color:#a5b4fc;}
.cp-pub-row-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;flex-wrap:wrap;}
.cp-pub-row-title{font-size:13px;font-weight:700;color:var(--text-main);}

/* ── Drawer ── */
.am-drawer-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;backdrop-filter:blur(3px);}
.am-drawer{
  position:fixed;top:0;right:0;width:480px;max-width:95vw;height:100%;
  background:var(--bg-panel);box-shadow:-12px 0 48px rgba(0,0,0,.18);
  z-index:101;overflow-y:auto;-webkit-overflow-scrolling:touch;
}
.am-drawer-head{
  padding:18px 20px;border-bottom:1px solid var(--border2);
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;background:var(--bg-panel);z-index:1;
}
.am-drawer-title{font-size:16px;font-weight:800;color:var(--text-main);}
.am-drawer-close{
  width:34px;height:34px;border-radius:10px;border:1.5px solid var(--border2);
  background:var(--btn-bg);cursor:pointer;color:var(--text-sub);font-size:16px;
  display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;
}
.am-drawer-close:hover{background:rgba(239,68,68,.1);color:#dc2626;border-color:rgba(239,68,68,.25);}
.am-drawer-body{padding:16px 20px;display:flex;flex-direction:column;gap:14px;padding-bottom:calc(28px + env(safe-area-inset-bottom,0px));}
.am-drawer-section{background:var(--bg-panel2);border-radius:14px;padding:14px;border:1px solid var(--border);}
.am-drawer-section-title{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:11px;}
.am-drawer-info-row{display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border2);font-size:12.5px;gap:10px;}
.am-drawer-info-row:last-child{border-bottom:none;}
.am-drawer-info-label{color:var(--text-sub);font-weight:500;flex-shrink:0;}
.am-drawer-info-val{color:var(--text-main);font-weight:700;text-align:right;word-break:break-word;}

/* ── Modal ── */
.am-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(3px);}
.am-modal{width:100%;max-width:560px;background:var(--bg-panel);border-radius:22px 22px 0 0;box-shadow:var(--shadow2);overflow:hidden;max-height:94vh;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.am-modal-head{padding:16px 20px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg-panel);z-index:1;}
.am-modal-title{font-size:15px;font-weight:800;color:var(--text-main);}
.am-modal-body{padding:16px 20px;display:flex;flex-direction:column;gap:12px;}
.am-modal-footer{padding:14px 20px;border-top:1px solid var(--border2);display:flex;gap:8px;justify-content:flex-end;position:sticky;bottom:0;background:var(--bg-panel);padding-bottom:calc(14px + env(safe-area-inset-bottom,0px));}
.am-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}

/* ── Lesson modal extra ── */
.seg-edit-row{
  background:var(--bg-panel2);border:1.5px solid var(--border2);border-radius:12px;
  padding:10px 12px;margin-bottom:7px;
}
.seg-edit-head{display:flex;align-items:center;gap:7px;margin-bottom:8px;}
.seg-color-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}

/* ── Toast ── */
.am-toast{
  position:fixed;bottom:calc(24px + env(safe-area-inset-bottom,0px));
  left:50%;transform:translateX(-50%);
  padding:12px 20px;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.22);
  font-size:13px;font-weight:600;z-index:300;display:flex;align-items:center;gap:9px;
  white-space:nowrap;max-width:calc(100vw - 32px);
}
.am-toast.success{background:linear-gradient(135deg,#10b981,#059669);color:#fff;}
.am-toast.error  {background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;}
.am-toast.info   {background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;}

/* ── Empty state ── */
.am-empty{text-align:center;padding:32px 16px;color:var(--text-muted);}
.am-empty-icon{font-size:34px;margin-bottom:9px;}
.am-empty-text{font-size:13.5px;font-weight:600;color:var(--text-sub);}
.am-empty-sub{font-size:11.5px;margin-top:4px;}

/* ── Recharts dark-theme overrides ── */
.dark-theme .recharts-cartesian-grid line{stroke:rgba(255,255,255,.06);}
.dark-theme .recharts-text{fill:#4a5578;}

/* ═══════════════════════ RESPONSIVE ═══════════════════════ */

/* Laptop */
@media(max-width:1280px){
  .am-stats{grid-template-columns:repeat(3,1fr);}
  .am-main-grid{grid-template-columns:1fr 290px;}
}

/* Tablet landscape */
@media(max-width:1024px){
  .am-main-grid{grid-template-columns:1fr;}
  .am-2col{grid-template-columns:1fr;}
}

/* Small tablet */
@media(max-width:900px){
  .am-hero{margin:10px 14px 0;padding:14px 18px;}
  .am-stats{padding:12px 14px 0;grid-template-columns:repeat(3,1fr);}
  .am-nav{padding:12px 14px 0;}
  .am-body{padding:12px 14px 80px;}
}

/* Mobile landscape */
@media(max-width:768px){
  .am-hero{margin:8px 12px 0;border-radius:18px;}
  .am-stats{grid-template-columns:repeat(2,1fr);padding:10px 12px 0;gap:10px;}
  .am-body{padding:10px 12px 80px;}
  .am-nav{padding:10px 12px 0;}
  .am-drawer{width:100%!important;max-width:100%!important;border-radius:22px 22px 0 0;top:auto;bottom:0;height:92vh;box-shadow:0 -8px 40px rgba(0,0,0,.22);}
  .am-modal-grid{grid-template-columns:1fr;}
  .cp-mod-head{flex-wrap:wrap;}
}

/* Phone portrait */
@media(max-width:600px){
  .am-hero{margin:8px 10px 0;padding:12px 14px;}
  .am-hero-right{display:none;}
  .am-hero-title{font-size:15px;}
  .am-stats{padding:8px 10px 0;gap:8px;}
  .am-nav{padding:8px 10px 0;}
  .am-body{padding:8px 10px 80px;}
  .am-panel-head{flex-direction:column;align-items:stretch;}
  .am-panel-actions{justify-content:flex-end;}
  .cp-res-actions{width:100%;justify-content:flex-end;}
  .cp-chap-actions{flex-wrap:wrap;}
  .am-panel-body{padding:12px 14px;}
}

/* Very small */
@media(max-width:380px){
  .am-hero{padding:10px 12px;}
  .am-scard{padding:12px;}
  .am-scard-n{font-size:22px;}
  .am-btn{font-size:11.5px;padding:7px 10px;}
  .cal-cell{min-height:44px;}
}
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function AnimNum({ target, suffix = "" }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let cur = 0, raf;
    const step = () => {
      cur += target / 50;
      if (cur < target) { setV(Math.floor(cur)); raf = requestAnimationFrame(step); }
      else setV(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{v}{suffix}</>;
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="am-tip">
      <div className="am-tip-label">{label}</div>
      <div className="am-tip-val">{payload[0].value}</div>
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div className={`am-toast ${type}`}
      initial={{ opacity: 0, y: 30, scale: .92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: .95 }}>
      {type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"} {msg}
    </motion.div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="cp-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="cp-toggle-slider" />
    </label>
  );
}

function useIsMobile(bp = 768) {
  const [is, setIs] = useState(() => typeof window !== "undefined" ? window.innerWidth <= bp : false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${bp}px)`);
    const h = e => setIs(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [bp]);
  return is;
}

const statusColor = { completed: "#10b981", "in-progress": "#6366f1", "not-started": "#94a3b8" };
const resIcon = { pdf: "📄", video: "🎬", ppt: "📊", image: "🖼️" };
const segColor = { "warm-up": "#f59e0b", lecture: "#6366f1", practice: "#10b981", qa: "#3b82f6", exit: "#ec4899", activity: "#f97316", demo: "#8b5cf6" };

// ─── DRAWER ──────────────────────────────────────────────────────────────────
function Drawer({ onClose, title, children }) {
  const isMobile = useIsMobile();
  const from = isMobile ? { y: "100%" } : { x: "100%" };
  const to   = isMobile ? { y: 0 }      : { x: 0 };
  return (
    <>
      <motion.div className="am-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="am-drawer" initial={from} animate={to} exit={from} transition={{ type: "spring", stiffness: 280, damping: 28 }}>
        {isMobile && <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}><div style={{ width: 38, height: 4, borderRadius: 4, background: "var(--border2)" }} /></div>}
        <div className="am-drawer-head">
          <div className="am-drawer-title">{title}</div>
          <button className="am-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="am-drawer-body">{children}</div>
      </motion.div>
    </>
  );
}

// ─── MODULE DRAWER ───────────────────────────────────────────────────────────
function ModuleDrawer({ module, onClose, onEditChapter, onAddChapter, onDeleteChapter, showToast }) {
  const totalMins = module.chapters.reduce((a, c) => a + (c.duration || 0), 0);
  const pct = Math.round(module.completedChapters / Math.max(module.totalChapters, 1) * 100);
  return (
    <Drawer title={`📖 ${module.title}`} onClose={onClose}>
      <div className="am-drawer-section">
        <div className="am-drawer-section-title">Module Overview</div>
        {[
          ["Subject",   module.subject],
          ["Due Date",  new Date(module.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
          ["Progress",  `${module.completedChapters}/${module.totalChapters} chapters`],
          ["Duration",  `${totalMins} mins total`],
        ].map(([l, v]) => (
          <div key={l} className="am-drawer-info-row">
            <span className="am-drawer-info-label">{l}</span>
            <span className="am-drawer-info-val">{v}</span>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5 }}>
            <span>Progress</span><span style={{ color: "#6366f1" }}>{pct}%</span>
          </div>
          <div className="am-prog-wrap">
            <motion.div className="am-prog-fill" style={{ background: "linear-gradient(90deg,#4f46e5,#7c3aed)", width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: .8 }} />
          </div>
        </div>
      </div>
      <div className="am-drawer-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
          <div className="am-drawer-section-title" style={{ margin: 0 }}>Chapters ({module.chapters.length})</div>
          <button className="am-btn sm primary" onClick={onAddChapter}>+ Add Chapter</button>
        </div>
        {module.chapters.map((ch, i) => (
          <motion.div key={ch.id} className="cp-chap-row" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .07 }}
            onClick={() => onEditChapter(ch)}>
            <div className="cp-chap-dot" style={{ background: statusColor[ch.status] }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cp-chap-title">{ch.title}</div>
              <div className="cp-chap-meta">{ch.duration}m · {ch.type}</div>
            </div>
            <div className="cp-chap-actions" onClick={e => e.stopPropagation()}>
              <span className={`am-badge ${ch.status}`}>{ch.status}</span>
              <button className="am-btn sm danger icon" onClick={() => onDeleteChapter(ch.id)}>✕</button>
            </div>
          </motion.div>
        ))}
        {module.chapters.length === 0 && (
          <div className="am-empty" style={{ padding: "16px 0" }}>
            <div className="am-empty-icon" style={{ fontSize: 26 }}>📖</div>
            <div className="am-empty-text" style={{ fontSize: 12.5 }}>No chapters yet</div>
          </div>
        )}
      </div>
      <button className="am-btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => showToast("Module exported as PDF", "info")}>📄 Export Module Plan</button>
    </Drawer>
  );
}

// ─── CHAPTER DRAWER ──────────────────────────────────────────────────────────
function ChapterDrawer({ chapter, lessons, onClose, showToast }) {
  const lesson = lessons.find(l => l.chapterId === chapter.id);
  return (
    <Drawer title={`📝 ${chapter.title}`} onClose={onClose}>
      <div className="am-drawer-section">
        <div className="am-drawer-section-title">Chapter Details</div>
        {[["Type", chapter.type], ["Duration", `${chapter.duration} mins`], ["Status", chapter.status], ["Objectives", chapter.objectives]].map(([l, v]) => (
          <div key={l} className="am-drawer-info-row">
            <span className="am-drawer-info-label">{l}</span>
            <span className="am-drawer-info-val">{v}</span>
          </div>
        ))}
      </div>
      {lesson ? (
        <div className="am-drawer-section">
          <div className="am-drawer-section-title">Lesson — {lesson.title}</div>
          {lesson.segments.map((seg, i) => (
            <motion.div key={seg.id} className={`cp-seg ${seg.type}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * .07 }}>
              <div className="cp-seg-head">
                <div className="cp-seg-label">{seg.label}</div>
                <div className="cp-seg-dur">⏱ {seg.duration} min</div>
              </div>
              <div className="cp-seg-content">{seg.content}</div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="am-drawer-section">
          <div className="am-empty">
            <div className="am-empty-icon">✍️</div>
            <div className="am-empty-text">No lesson plan yet</div>
            <div className="am-empty-sub">Go to Planner tab to create one</div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ─── FORM MODAL (Module / Chapter) ───────────────────────────────────────────
function FormModal({ mode, data, onSave, onClose }) {
  const isChapter = mode === "chapter" || mode === "edit-chapter";
  const isEdit    = mode.startsWith("edit");
  const [form, setForm] = useState(data || { title: "", subject: "Mathematics", dueDate: "", status: "not-started", duration: 45, type: "lecture", objectives: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <motion.div className="am-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="am-modal" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10 }}>
          <div style={{ width: 34, height: 4, borderRadius: 4, background: "var(--border2)" }} />
        </div>
        <div className="am-modal-head">
          <div className="am-modal-title">{isEdit ? "✏️ Edit" : "➕ New"} {isChapter ? "Chapter" : "Module"}</div>
          <button className="am-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="am-modal-body">
          <div className="am-filter-group">
            <label className="am-filter-label">Title *</label>
            <input className="am-filter-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder={isChapter ? "Chapter title…" : "Module title…"} />
          </div>
          {!isChapter && (
            <div className="am-modal-grid">
              <div className="am-filter-group">
                <label className="am-filter-label">Subject</label>
                <select className="am-filter-select" value={form.subject} onChange={e => set("subject", e.target.value)}>
                  <option>Mathematics</option><option>Science</option><option>English</option><option>History</option><option>Computer Science</option>
                </select>
              </div>
              <div className="am-filter-group">
                <label className="am-filter-label">Due Date *</label>
                <input type="date" className="am-filter-input" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
              </div>
            </div>
          )}
          {isChapter && (
            <div className="am-modal-grid">
              <div className="am-filter-group">
                <label className="am-filter-label">Type</label>
                <select className="am-filter-select" value={form.type} onChange={e => set("type", e.target.value)}>
                  <option value="lecture">Lecture</option><option value="lab">Lab</option><option value="activity">Activity</option><option value="assessment">Assessment</option><option value="demo">Demo</option>
                </select>
              </div>
              <div className="am-filter-group">
                <label className="am-filter-label">Duration (mins)</label>
                <input type="number" className="am-filter-input" value={form.duration} onChange={e => set("duration", Number(e.target.value))} min={5} max={180} />
              </div>
            </div>
          )}
          {isChapter && (
            <div className="am-filter-group">
              <label className="am-filter-label">Learning Objectives</label>
              <textarea className="am-textarea" value={form.objectives} onChange={e => set("objectives", e.target.value)} placeholder="What will students know or be able to do after this chapter?" />
            </div>
          )}
          <div className="am-filter-group">
            <label className="am-filter-label">Status</label>
            <select className="am-filter-select" value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="am-modal-footer">
          <button className="am-btn" onClick={onClose}>Cancel</button>
          <button className="am-btn primary" onClick={() => { if (!form.title.trim()) return; onSave(form); }}>{isEdit ? "Save Changes" : "Create"}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── LESSON MODAL ────────────────────────────────────────────────────────────
const LESSON_COLORS = ["#6366f1","#10b981","#f59e0b","#ec4899","#3b82f6","#8b5cf6","#f97316","#14b8a6"];

function LessonModal({ lesson, modules, onSave, onClose }) {
  const isEdit = !!lesson?.id;
  const [form, setForm] = useState(lesson || {
    title: "", classGroup: "10-A", date: new Date().toISOString().split("T")[0],
    moduleId: modules[0]?.id || "", chapterId: modules[0]?.chapters[0]?.id || "",
    status: "draft", color: "#6366f1",
    segments: [{ id: `s-${Date.now()}`, type: "warm-up", label: "Warm-Up", duration: 5, content: "" }],
    differentiatedTracks: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const availChapters = modules.find(m => m.id === form.moduleId)?.chapters || [];

  const addSeg = () => set("segments", [...form.segments, { id: `s-${Date.now()}`, type: "lecture", label: "Lecture", duration: 20, content: "" }]);
  const removeSeg = id => set("segments", form.segments.filter(s => s.id !== id));
  const updateSeg = (id, k, v) => set("segments", form.segments.map(s => s.id === id ? { ...s, [k]: v, label: k === "type" ? SEG_TYPES.find(t => t.value === v)?.label || v : s.label } : s));

  const addTrack = () => set("differentiatedTracks", [...(form.differentiatedTracks||[]), { label: "Advanced", note: "" }]);
  const removeTrack = i => set("differentiatedTracks", form.differentiatedTracks.filter((_, idx) => idx !== i));
  const updateTrack = (i, k, v) => set("differentiatedTracks", form.differentiatedTracks.map((t, idx) => idx === i ? { ...t, [k]: v } : t));

  const totalMin = form.segments.reduce((a, s) => a + Number(s.duration || 0), 0);

  return (
    <motion.div className="am-modal-backdrop" style={{ alignItems: "center" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="am-modal" style={{ borderRadius: 22, maxHeight: "92vh", maxWidth: 620 }}
        initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }} onClick={e => e.stopPropagation()}>
        <div className="am-modal-head">
          <div className="am-modal-title">{isEdit ? "✏️ Edit Lesson" : "➕ New Lesson Plan"}</div>
          <button className="am-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="am-modal-body">
          {/* Basic info */}
          <div className="am-filter-group">
            <label className="am-filter-label">Lesson Title *</label>
            <input className="am-filter-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Day 1: Solving One-Step Equations" />
          </div>
          <div className="am-modal-grid">
            <div className="am-filter-group">
              <label className="am-filter-label">Class / Group</label>
              <select className="am-filter-select" value={form.classGroup} onChange={e => set("classGroup", e.target.value)}>
                {["10-A","10-B","10-C","11-A","11-B","12-A","12-B"].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="am-filter-group">
              <label className="am-filter-label">Date *</label>
              <input type="date" className="am-filter-input" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
          </div>
          <div className="am-modal-grid">
            <div className="am-filter-group">
              <label className="am-filter-label">Module</label>
              <select className="am-filter-select" value={form.moduleId} onChange={e => set("moduleId", e.target.value)}>
                {modules.map(m => <option key={m.id} value={m.id}>{m.title.split(":")[0]}</option>)}
              </select>
            </div>
            <div className="am-filter-group">
              <label className="am-filter-label">Chapter</label>
              <select className="am-filter-select" value={form.chapterId} onChange={e => set("chapterId", e.target.value)}>
                <option value="">— None —</option>
                {availChapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>
          <div className="am-modal-grid">
            <div className="am-filter-group">
              <label className="am-filter-label">Status</label>
              <select className="am-filter-select" value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="draft">Draft</option><option value="published">Published</option>
              </select>
            </div>
            <div className="am-filter-group">
              <label className="am-filter-label">Calendar Color</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8 }}>
                {LESSON_COLORS.map(c => (
                  <div key={c} onClick={() => set("color", c)} style={{ width: 24, height: 24, borderRadius: 8, background: c, cursor: "pointer", border: form.color === c ? `3px solid var(--text-main)` : "2px solid transparent", flexShrink: 0 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Segments */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <div className="am-section-title" style={{ flex: 1, margin: 0 }}>Lesson Segments</div>
            <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, marginLeft: 10, flexShrink: 0 }}>Total: {totalMin} min</span>
          </div>
          {form.segments.map((seg, i) => (
            <div key={seg.id} className="seg-edit-row">
              <div className="seg-edit-head">
                <div className="seg-color-dot" style={{ background: segColor[seg.type] || "#94a3b8" }} />
                <select className="am-filter-select" style={{ flex: 1, fontSize: "max(16px,11px)", padding: "4px 8px" }}
                  value={seg.type} onChange={e => updateSeg(seg.id, "type", e.target.value)}>
                  {SEG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input type="number" className="am-filter-input" style={{ width: 68, fontSize: "max(16px,11px)", padding: "4px 7px" }}
                  value={seg.duration} min={1} max={120} onChange={e => updateSeg(seg.id, "duration", Number(e.target.value))} />
                <span style={{ fontSize: 10.5, color: "var(--text-muted)", flexShrink: 0 }}>min</span>
                <button className="am-btn sm danger icon" onClick={() => removeSeg(seg.id)}>✕</button>
              </div>
              <textarea className="am-textarea" style={{ minHeight: 52 }} value={seg.content} placeholder="Describe this segment…"
                onChange={e => updateSeg(seg.id, "content", e.target.value)} />
            </div>
          ))}
          <button className="am-btn" style={{ width: "100%", justifyContent: "center" }} onClick={addSeg}>+ Add Segment</button>

          {/* Differentiated tracks */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <div className="am-section-title" style={{ flex: 1, margin: 0 }}>Differentiated Tracks</div>
            <button className="am-btn sm" style={{ marginLeft: 10, flexShrink: 0 }} onClick={addTrack}>+ Track</button>
          </div>
          {(form.differentiatedTracks || []).map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
              <select className="am-filter-select" style={{ width: 110, fontSize: "max(16px,11px)", padding: "6px 8px", flexShrink: 0 }}
                value={t.label} onChange={e => updateTrack(i, "label", e.target.value)}>
                {["Advanced","Support","ELL","Gifted","Remedial"].map(l => <option key={l}>{l}</option>)}
              </select>
              <input className="am-filter-input" style={{ flex: 1 }} value={t.note} placeholder="Track-specific note…"
                onChange={e => updateTrack(i, "note", e.target.value)} />
              <button className="am-btn sm danger icon" style={{ flexShrink: 0 }} onClick={() => removeTrack(i)}>✕</button>
            </div>
          ))}
        </div>
        <div className="am-modal-footer">
          <button className="am-btn" onClick={onClose}>Cancel</button>
          <button className="am-btn primary" onClick={() => { if (!form.title.trim() || !form.date) return; onSave(form); }}>{isEdit ? "Save Changes" : "Create Lesson"}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── CALENDAR COMPONENT ───────────────────────────────────────────────────────
function CalendarView({ lessons, onDayClick, onLessonClick, selectedDate, setSelectedDate }) {
  const today = new Date();
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const prev = () => setCur(c => { const d = new Date(c.year, c.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const next = () => setCur(c => { const d = new Date(c.year, c.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; });

  const monthName = new Date(cur.year, cur.month).toLocaleString("default", { month: "long", year: "numeric" });

  // Build grid cells
  const firstDay = new Date(cur.year, cur.month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate();
  const daysInPrev  = new Date(cur.year, cur.month, 0).getDate();
  const gridStart   = firstDay; // start offset

  const cells = [];
  for (let i = 0; i < gridStart; i++) cells.push({ d: daysInPrev - gridStart + 1 + i, cur: false, date: null });
  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${cur.year}-${String(cur.month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    cells.push({ d: i, cur: true, date });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) cells.push({ d: i, cur: false, date: null });

  const lessonsByDate = {};
  lessons.forEach(l => { if (!lessonsByDate[l.date]) lessonsByDate[l.date] = []; lessonsByDate[l.date].push(l); });

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  return (
    <div className="cal-wrap">
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={prev}>‹</button>
        <div className="cal-title">{monthName}</div>
        <button className="cal-nav-btn" onClick={next}>›</button>
      </div>
      <div className="cal-grid-head">
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="cal-day-label">{d}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((cell, i) => {
          const events = cell.date ? (lessonsByDate[cell.date] || []) : [];
          const isToday = cell.date === todayStr;
          const isSelected = cell.date === selectedDate;
          return (
            <div key={i}
              className={`cal-cell${!cell.cur ? " other-month" : ""}${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
              onClick={() => { if (cell.cur && cell.date) { setSelectedDate(cell.date); onDayClick(cell.date); } }}>
              <div className="cal-cell-num">{cell.d}</div>
              {events.slice(0, 2).map(l => (
                <div key={l.id} className="cal-event-dot" style={{ background: l.color || "#6366f1" }}
                  onClick={e => { e.stopPropagation(); onLessonClick(l); }}>
                  {l.classGroup}
                </div>
              ))}
              {events.length > 2 && <div className="cal-more">+{events.length - 2}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── OUTLINE VIEW ─────────────────────────────────────────────────────────────
function OutlineView({ modules, onModuleClick, onAddModule, onEditModule, onDeleteModule, showToast }) {
  const totalChapters    = modules.reduce((a, m) => a + m.totalChapters, 0);
  const completedChapters = modules.reduce((a, m) => a + m.completedChapters, 0);

  const pieData = [
    { name: "Completed",   value: completedChapters,              color: "#10b981" },
    { name: "In Progress", value: modules.filter(m => m.status === "in-progress").reduce((a, m) => a + m.totalChapters - m.completedChapters, 0), color: "#6366f1" },
    { name: "Not Started", value: modules.filter(m => m.status === "not-started").reduce((a, m) => a + m.totalChapters, 0), color: "#f59e0b" },
  ].filter(d => d.value > 0);

  const barData = modules.map(m => ({
    name:      m.title.split(":")[0].replace("Module ", "M"),
    completed: m.completedChapters,
    remaining: m.totalChapters - m.completedChapters,
  }));

  return (
    <div className="am-main-grid">
      <div>
        <div className="am-panel" style={{ marginBottom: 14 }}>
          <div className="am-panel-head">
            <div>
              <div className="am-panel-title">🗺️ Course Architecture</div>
              <div className="am-panel-sub">Build and manage your syllabus modules</div>
            </div>
            <div className="am-panel-actions">
              <button className="am-btn" onClick={() => showToast("Syllabus imported", "info")}>📥 Import</button>
              <button className="am-btn primary" onClick={onAddModule}>+ Module</button>
            </div>
          </div>
          <div className="am-panel-body">
            {modules.map((mod, i) => (
              <motion.div key={mod.id} className="cp-mod-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }}
                onClick={() => onModuleClick(mod)}>
                <div className="cp-mod-head">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cp-mod-title">{mod.title}</div>
                    <div className="cp-mod-meta">Due {new Date(mod.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {mod.totalChapters} chapters</div>
                  </div>
                  <div className="cp-mod-actions" onClick={e => e.stopPropagation()}>
                    <span className={`am-badge ${mod.status}`}>{mod.status}</span>
                    <button className="am-btn sm icon" onClick={() => onEditModule(mod)}>✏️</button>
                    <button className="am-btn sm danger icon" onClick={() => onDeleteModule(mod.id)}>🗑️</button>
                  </div>
                </div>
                {mod.chapters.slice(0, 3).map(ch => (
                  <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0", fontSize: 12 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor[ch.status], flexShrink: 0 }} />
                    <span style={{ color: "var(--text-sub)", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.title}</span>
                    <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{ch.duration}m</span>
                  </div>
                ))}
                {mod.chapters.length > 3 && <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, marginTop: 3 }}>+{mod.chapters.length - 3} more chapters</div>}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                    <span>{mod.completedChapters}/{mod.totalChapters} done</span>
                    <span style={{ color: "#6366f1" }}>{Math.round(mod.completedChapters / Math.max(mod.totalChapters, 1) * 100)}%</span>
                  </div>
                  <div className="am-prog-wrap">
                    <motion.div className="am-prog-fill" style={{ background: "linear-gradient(90deg,#4f46e5,#7c3aed)", width: 0 }}
                      animate={{ width: `${Math.round(mod.completedChapters / Math.max(mod.totalChapters, 1) * 100)}%` }}
                      transition={{ duration: .8, delay: i * .1 }} />
                  </div>
                </div>
              </motion.div>
            ))}
            {modules.length === 0 && (
              <div className="am-empty"><div className="am-empty-icon">📚</div><div className="am-empty-text">No modules yet</div><div className="am-empty-sub">Tap "+ Module" to start building</div></div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="am-panel">
          <div className="am-panel-head"><div className="am-panel-title">📊 Milestone Tracker</div></div>
          <div className="am-panel-body">
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-main)" }}>{completedChapters}<span style={{ fontSize: 15, color: "#6366f1" }}>/{totalChapters}</span></div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Chapters completed</div>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={50} innerRadius={28} dataKey="value" paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} chapters`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="am-legend" style={{ justifyContent: "center", marginTop: 8 }}>
              {pieData.map(d => <div key={d.name} className="am-legend-item"><div className="am-legend-dot" style={{ background: d.color }} />{d.name}</div>)}
            </div>
          </div>
        </div>

        <div className="am-panel">
          <div className="am-panel-head"><div className="am-panel-title">📈 Module Progress</div></div>
          <div className="am-panel-body">
            <ResponsiveContainer width="100%" height={145}>
              <BarChart data={barData} barGap={3} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={20} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Done"      stackId="a" />
                <Bar dataKey="remaining" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Remaining" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="am-panel">
          <div className="am-panel-head"><div className="am-panel-title">⚡ Quick Actions</div></div>
          <div className="am-panel-body" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[["📥","Import from last year","success"],["📤","Export full syllabus","info"],["🔄","Sync school calendar","success"],["📋","Clone course structure","success"]].map(([icon, label, t], i) => (
              <button key={i} className="am-btn" style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={() => showToast(`${label} done`, t)}>{icon} {label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DAILY PLANNER VIEW ───────────────────────────────────────────────────────
function DailyPlannerView({ modules, lessons, setLessons, showToast }) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedLesson, setSelectedLesson] = useState(lessons[0] || null);
  const [lessonModal, setLessonModal] = useState(null); // null | "new" | lessonObj
  const [deleteId, setDeleteId] = useState(null);
  const [calView, setCalView] = useState("month"); // "month" | "list"

  const dayLessons = lessons.filter(l => l.date === selectedDate);

  const handleDayClick = (date) => {
    setSelectedDate(date);
    const first = lessons.find(l => l.date === date);
    if (first) setSelectedLesson(first);
  };

  const handleSaveLesson = (form) => {
    if (form.id) {
      setLessons(ls => ls.map(l => l.id === form.id ? form : l));
      setSelectedLesson(form);
      showToast("Lesson updated", "success");
    } else {
      const newL = { ...form, id: `les-${Date.now()}` };
      setLessons(ls => [...ls, newL]);
      setSelectedLesson(newL);
      showToast("Lesson created", "success");
    }
    setLessonModal(null);
  };

  const handleDelete = (id) => {
    setLessons(ls => ls.filter(l => l.id !== id));
    if (selectedLesson?.id === id) setSelectedLesson(null);
    setDeleteId(null);
    showToast("Lesson deleted", "error");
  };

  const totalMin = selectedLesson ? selectedLesson.segments.reduce((a, s) => a + s.duration, 0) : 0;

  return (
    <div className="am-main-grid">
      {/* LEFT — Calendar + lesson list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Calendar / List toggle */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 5 }}>
            {["month","list"].map(v => (
              <button key={v} className={`am-btn${calView === v ? " primary" : ""}`}
                onClick={() => setCalView(v)}>
                {v === "month" ? "📅 Month" : "📋 All Lessons"}
              </button>
            ))}
          </div>
          <button className="am-btn primary" onClick={() => setLessonModal("new")}>+ New Lesson</button>
        </div>

        <AnimatePresence mode="wait">
          {calView === "month" ? (
            <motion.div key="month" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CalendarView lessons={lessons} onDayClick={handleDayClick} onLessonClick={setSelectedLesson}
                selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
              {/* Day lessons strip */}
              {dayLessons.length > 0 && (
                <div className="am-panel" style={{ marginTop: 12 }}>
                  <div className="am-panel-head">
                    <div className="am-panel-title">📍 {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{dayLessons.length} lesson{dayLessons.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="am-panel-body">
                    {dayLessons.map(l => (
                      <div key={l.id} className={`lp-lesson-card${selectedLesson?.id === l.id ? " active" : ""}`}
                        style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                        onClick={() => setSelectedLesson(l)}>
                        <div className="lp-lesson-card-accent" style={{ background: l.color || "#6366f1", minHeight: 44 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="lp-lesson-title">{l.title}</div>
                          <div className="lp-lesson-meta">{l.classGroup} · {l.segments.reduce((a, s) => a + s.duration, 0)} min</div>
                        </div>
                        <span className={`am-badge ${l.status}`}>{l.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {dayLessons.length === 0 && selectedDate && (
                <div className="am-panel" style={{ marginTop: 12 }}>
                  <div className="am-panel-body">
                    <div className="am-empty" style={{ padding: "18px 0" }}>
                      <div className="am-empty-icon">📭</div>
                      <div className="am-empty-text">No lessons on this day</div>
                      <div className="am-empty-sub">
                        <button className="am-btn primary" style={{ marginTop: 10 }} onClick={() => setLessonModal("new")}>+ Create Lesson</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="am-panel">
                <div className="am-panel-head">
                  <div className="am-panel-title">📋 All Lessons</div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{lessons.length} total</span>
                </div>
                <div className="am-panel-body">
                  {lessons.length === 0 && <div className="am-empty"><div className="am-empty-icon">✍️</div><div className="am-empty-text">No lessons yet</div></div>}
                  {[...lessons].sort((a, b) => a.date.localeCompare(b.date)).map(l => (
                    <div key={l.id} className={`lp-lesson-card${selectedLesson?.id === l.id ? " active" : ""}`}
                      style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                      onClick={() => { setSelectedLesson(l); setSelectedDate(l.date); }}>
                      <div className="lp-lesson-card-accent" style={{ background: l.color || "#6366f1", minHeight: 50 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="lp-lesson-title">{l.title}</div>
                        <div className="lp-lesson-meta">{new Date(l.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {l.classGroup} · {l.segments.reduce((a, s) => a + s.duration, 0)} min</div>
                      </div>
                      <span className={`am-badge ${l.status}`}>{l.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT — lesson detail */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {selectedLesson ? (
          <>
            <div className="am-panel">
              <div className="am-panel-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 4, background: selectedLesson.color || "#6366f1", flexShrink: 0 }} />
                    <div className="am-panel-title" style={{ fontSize: 13 }}>{selectedLesson.title}</div>
                  </div>
                  <div className="am-panel-sub">{selectedLesson.classGroup} · {new Date(selectedLesson.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {totalMin} min</div>
                </div>
                <div className="am-panel-actions">
                  <span className={`am-badge ${selectedLesson.status}`}>{selectedLesson.status}</span>
                  <button className="am-btn sm" onClick={() => setLessonModal(selectedLesson)}>✏️ Edit</button>
                  <button className="am-btn sm danger" onClick={() => setDeleteId(selectedLesson.id)}>🗑️</button>
                </div>
              </div>
              <div className="am-panel-body">
                <div className="am-section-title">Lesson Segments</div>
                {selectedLesson.segments.map((seg, i) => (
                  <motion.div key={seg.id} className={`cp-seg ${seg.type}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .06 }}>
                    <div className="cp-seg-head">
                      <div className="cp-seg-label">{seg.label}</div>
                      <div className="cp-seg-dur">⏱ {seg.duration} min</div>
                    </div>
                    <div className="cp-seg-content">{seg.content || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No description</span>}</div>
                  </motion.div>
                ))}

                {selectedLesson.differentiatedTracks?.length > 0 && (
                  <>
                    <div className="am-section-title" style={{ marginTop: 16 }}>🌿 Differentiated Tracks</div>
                    {selectedLesson.differentiatedTracks.map((t, i) => (
                      <div key={i} style={{ borderRadius: 10, padding: "9px 12px", background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.14)", marginBottom: 7 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#6366f1", marginBottom: 3 }}>{t.label} Track</div>
                        <div style={{ fontSize: 12, color: "var(--text-sub)" }}>{t.note}</div>
                      </div>
                    ))}
                  </>
                )}

                <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
                  <button className="am-btn success" style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => { setLessons(ls => ls.map(l => l.id === selectedLesson.id ? { ...l, status: "published" } : l)); setSelectedLesson(s => ({ ...s, status: "published" })); showToast("Lesson published!", "success"); }}>
                    🚀 Publish
                  </button>
                  <button className="am-btn" style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => showToast("Saved as draft", "info")}>💾 Save Draft</button>
                </div>
              </div>
            </div>

            {/* Time budget */}
            <div className="am-panel">
              <div className="am-panel-head"><div className="am-panel-title">⏱ Time Budget</div></div>
              <div className="am-panel-body">
                {selectedLesson.segments.map(s => {
                  const pct = Math.round(s.duration / totalMin * 100);
                  return (
                    <div key={s.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600, marginBottom: 3 }}>
                        <span style={{ color: "var(--text-sub)" }}>{s.label}</span>
                        <span style={{ color: segColor[s.type] || "#64748b" }}>{s.duration}m · {pct}%</span>
                      </div>
                      <div className="am-prog-wrap">
                        <motion.div className="am-prog-fill" style={{ background: segColor[s.type] || "#64748b", width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: .6 }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border2)" }}>
                  <span style={{ color: "var(--text-sub)" }}>Total</span><span>{totalMin} min</span>
                </div>
              </div>
            </div>

            {/* Co-Teacher Hub */}
            <div className="am-panel">
              <div className="am-panel-head"><div className="am-panel-title">👥 Co-Teacher Hub</div></div>
              <div className="am-panel-body">
                {[{ name: "Meera Krishnan", role: "Science Co-Teacher", online: true }, { name: "Ravi Sundar", role: "Math Dept. Head", online: false }].map(t => (
                  <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderBottom: "1px solid var(--border2)" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{t.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-main)" }}>{t.name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{t.role}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.online ? "#10b981" : "#94a3b8", flexShrink: 0 }} />
                  </div>
                ))}
                <button className="am-btn" style={{ width: "100%", justifyContent: "center", marginTop: 11 }} onClick={() => showToast("Session started", "info")}>💬 Start Session</button>
              </div>
            </div>
          </>
        ) : (
          <div className="am-panel">
            <div className="am-panel-body">
              <div className="am-empty">
                <div className="am-empty-icon">📆</div>
                <div className="am-empty-text">No lesson selected</div>
                <div className="am-empty-sub">Click a day or lesson to view details</div>
                <button className="am-btn primary" style={{ marginTop: 14 }} onClick={() => setLessonModal("new")}>+ Create Lesson</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {lessonModal && (
          <LessonModal
            lesson={lessonModal === "new" ? { date: selectedDate } : lessonModal}
            modules={modules}
            onSave={handleSaveLesson}
            onClose={() => setLessonModal(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <motion.div className="am-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)}>
            <motion.div className="am-modal" style={{ maxWidth: 380, borderRadius: 20, maxHeight: "auto" }}
              initial={{ scale: .92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .92, opacity: 0 }}
              onClick={e => e.stopPropagation()}>
              <div className="am-modal-head"><div className="am-modal-title">🗑️ Delete Lesson?</div><button className="am-drawer-close" onClick={() => setDeleteId(null)}>✕</button></div>
              <div className="am-modal-body"><div style={{ color: "var(--text-sub)", fontSize: 13 }}>This action cannot be undone. The lesson plan and all its segments will be permanently removed.</div></div>
              <div className="am-modal-footer">
                <button className="am-btn" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="am-btn danger" onClick={() => handleDelete(deleteId)}>Delete Permanently</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── RESOURCE VAULT VIEW ─────────────────────────────────────────────────────
function ResourceVaultView({ showToast }) {
  const [resources, setResources] = useState(mockResources);
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? resources : resources.filter(r => r.type === filter);

  return (
    <div className="am-2col">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="am-panel">
          <div className="am-panel-head">
            <div>
              <div className="am-panel-title">📚 Resource Vault</div>
              <div className="am-panel-sub">{resources.length} files</div>
            </div>
            <div className="am-panel-actions">
              <select className="am-filter-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ fontSize: "max(16px,11.5px)", padding: "5px 8px", width: "auto" }}>
                <option value="all">All</option><option value="pdf">PDF</option><option value="video">Video</option><option value="ppt">PPT</option><option value="image">Image</option>
              </select>
            </div>
          </div>
          <div className="am-panel-body">
            <div className="cp-upload-zone" onClick={() => showToast("File picker opened", "info")}>
              <div className="cp-upload-icon">📤</div>
              <div className="cp-upload-text">Tap to upload or drag & drop</div>
              <div className="cp-upload-hint">PDF, PPT, MP4, PNG · Max 100 MB</div>
            </div>
            <AnimatePresence>
              {filtered.map((res, i) => (
                <motion.div key={res.id} className="cp-res-item" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * .04 }}>
                  <div className={`cp-res-icon ${res.type}`}>{resIcon[res.type] || "📎"}</div>
                  <div className="cp-res-info">
                    <div className="cp-res-name">{res.name}</div>
                    <div className="cp-res-meta">{res.size} · {res.uploadedAt}</div>
                    <div className="cp-res-actions">
                      <button className="am-btn sm" onClick={() => showToast("Preview opened", "info")}>👁️ View</button>
                      <button className="am-btn sm" onClick={() => showToast("Linked to module", "success")}>🔗 Link</button>
                      <button className="am-btn sm danger" onClick={() => { setResources(r => r.filter(x => x.id !== res.id)); showToast("Deleted", "error"); }}>🗑️ Delete</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && <div className="am-empty"><div className="am-empty-icon">📁</div><div className="am-empty-text">No files found</div></div>}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="am-panel">
          <div className="am-panel-head"><div className="am-panel-title">🌍 Embed Web Tools</div></div>
          <div className="am-panel-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 12 }}>
              {[["▶️","YouTube"],["🃏","Quizlet"],["🔬","PhET"],["📐","Desmos"]].map(([icon, name]) => (
                <button key={name} className="am-btn" style={{ justifyContent: "center", flexDirection: "column", height: 64, gap: 4 }}
                  onClick={() => showToast(`${name} embedded`, "success")}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ fontSize: 10.5 }}>{name}</span>
                </button>
              ))}
            </div>
            <div className="am-filter-group">
              <label className="am-filter-label">Custom URL</label>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <input className="am-filter-input" style={{ flex: 1, minWidth: 120 }} placeholder="https://example.com/embed/…" />
                <button className="am-btn primary" onClick={() => showToast("Embedded", "success")}>Embed</button>
              </div>
            </div>
          </div>
        </div>

        <div className="am-panel">
          <div className="am-panel-head"><div className="am-panel-title">🔗 Cross-Linker</div></div>
          <div className="am-panel-body">
            <div style={{ fontSize: 12.5, color: "var(--text-sub)", marginBottom: 12 }}>Link resources directly to modules or chapters.</div>
            {mockResources.slice(0, 3).map(r => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border2)", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name.split(".")[0]}</span>
                <select className="am-filter-select" style={{ fontSize: "max(16px,11px)", padding: "4px 7px", width: "auto", minWidth: 110 }} onChange={() => showToast("Linked", "success")}>
                  <option>Link to…</option>
                  {mockModules.map(m => <option key={m.id} value={m.id}>{m.title.split(":")[0]}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="am-panel">
          <div className="am-panel-head"><div className="am-panel-title">📊 Storage</div></div>
          <div className="am-panel-body">
            {[["PDF Docs", 3.2, 50, "#ef4444"], ["Videos", 45.1, 200, "#6366f1"], ["Slides", 8.2, 50, "#f59e0b"]].map(([l, u, t, c]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-sub)" }}>{l}</span>
                  <span style={{ color: c }}>{u}/{t} MB</span>
                </div>
                <div className="am-prog-wrap">
                  <motion.div className="am-prog-fill" style={{ background: c, width: 0 }} animate={{ width: `${Math.round(u / t * 100)}%` }} transition={{ duration: .8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PUBLISHING VIEW ─────────────────────────────────────────────────────────
function PublishingView({ modules, showToast }) {
  const [pubStatus, setPubStatus] = useState(mockPublishStatus);
  const set = (moduleId, key, val) => setPubStatus(s => s.map(p => p.moduleId === moduleId ? { ...p, [key]: val } : p));

  return (
    <div className="am-main-grid">
      <div>
        <div className="am-panel" style={{ marginBottom: 14 }}>
          <div className="am-panel-head">
            <div>
              <div className="am-panel-title">🚀 Publishing & Scheduling</div>
              <div className="am-panel-sub">Control when content reaches students</div>
            </div>
            <div className="am-panel-actions">
              <button className="am-btn primary" onClick={() => showToast("All published", "success")}>Publish All</button>
            </div>
          </div>
          <div className="am-panel-body">
            {modules.map((mod, i) => {
              const ps = pubStatus.find(p => p.moduleId === mod.id) || {};
              return (
                <motion.div key={mod.id} className="cp-pub-row" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }}>
                  <div className="cp-pub-row-head">
                    <div className="cp-pub-row-title">{mod.title}</div>
                    <span className={`am-badge ${ps.published ? "published" : "not-started"}`}>{ps.published ? "Published" : "Hidden"}</span>
                  </div>
                  {[
                    { key: "published",   icon: "📢", label: "Publish to Students",   sub: "Make module visible on student dashboard" },
                    { key: "dripEnabled", icon: "🗓️", label: "Drip-Feed Scheduling", sub: "Auto-publish chapters on set dates" },
                    { key: "gated",       icon: "🔒", label: "Prerequisite Gating",   sub: "Lock chapters until prior work is done" },
                  ].map(({ key, icon, label, sub }) => (
                    <div key={key} className="cp-toggle-wrap">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="cp-toggle-label">{icon} {label}</div>
                        <div className="cp-toggle-sub">{sub}</div>
                      </div>
                      <Toggle checked={ps[key] || false} onChange={v => { set(mod.id, key, v); showToast(v ? `${label} on` : `${label} off`, "info"); }} />
                    </div>
                  ))}
                  {ps.dripEnabled && (
                    <div className="am-filter-group" style={{ marginTop: 10 }}>
                      <label className="am-filter-label">Auto-Publish Date</label>
                      <input type="date" className="am-filter-input" defaultValue={ps.publishDate}
                        onChange={e => { set(mod.id, "publishDate", e.target.value); showToast("Date set", "info"); }} />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
                    <button className="am-btn sm success" style={{ flex: 1, justifyContent: "center" }} onClick={() => showToast("Preview sent", "success")}>👁️ Preview</button>
                    <button className="am-btn sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => showToast("Notified", "info")}>📧 Notify</button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="am-panel">
          <div className="am-panel-head"><div className="am-panel-title">🔄 Activity Sync</div></div>
          <div className="am-panel-body">
            {[["✅","Readings → Student To-Do",true],["📝","Exit tickets → Assessments",true],["📊","Push to parent portal",false],["🔔","Notify on new content",true]].map(([icon, label, on], i) => (
              <div key={i} className="cp-toggle-wrap">
                <div style={{ flex: 1 }}><div className="cp-toggle-label">{icon} {label}</div></div>
                <Toggle checked={on} onChange={v => showToast(v ? "Enabled" : "Disabled", "info")} />
              </div>
            ))}
          </div>
        </div>

        <div className="am-panel">
          <div className="am-panel-head"><div className="am-panel-title">🚦 Class Access</div></div>
          <div className="am-panel-body">
            {modules.map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border2)", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-main)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title.split(":")[0]}</span>
                <select className="am-filter-select" style={{ fontSize: "max(16px,11.5px)", padding: "4px 7px", width: "auto", minWidth: 100 }} onChange={() => showToast("Access updated", "info")}>
                  <option>10-A</option><option>10-B</option><option>12-A</option><option>All</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="am-panel">
          <div className="am-panel-head"><div className="am-panel-title">📈 Publish Summary</div></div>
          <div className="am-panel-body">
            {[["Published", pubStatus.filter(p => p.published).length, "#10b981"],
              ["Drip Active", pubStatus.filter(p => p.dripEnabled).length, "#6366f1"],
              ["Gating On",  pubStatus.filter(p => p.gated).length, "#f59e0b"],
              ["Hidden",     pubStatus.filter(p => !p.published).length, "#94a3b8"]].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border2)" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-sub)" }}>{l}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function TeacherCurriculumPlannerPage() {
  const [dark,          setDark]          = useState(false);
  const [activeTab,     setActiveTab]     = useState("outline");
  const [modules,       setModules]       = useState(mockModules);
  const [lessons,       setLessons]       = useState(initialLessons);
  const [toast,         setToast]         = useState(null);
  const [viewingModule, setViewingModule] = useState(null);
  const [viewingChapter,setViewingChapter]= useState(null);
  const [formModal,     setFormModal]     = useState(null);

  const showToast = useCallback((msg, type = "success") => setToast({ msg, type }), []);

  const totalModules   = modules.length;
  const totalChapters  = modules.reduce((a, m) => a + m.totalChapters, 0);
  const completedChaps = modules.reduce((a, m) => a + m.completedChapters, 0);
  const progressPct    = totalChapters > 0 ? Math.round(completedChaps / totalChapters * 100) : 0;

  const handleSaveModule = async (form) => {
    if (formModal.mode === "edit-module") {
      setModules(m => m.map(x => x.id === form.id ? { ...x, ...form } : x));
      showToast("Module updated", "success");
    } else {
      const n = await API.createModule({ ...form, chapters: [], completedChapters: 0, totalChapters: 0 });
      setModules(m => [...m, n]);
      showToast("Module created", "success");
    }
    setFormModal(null);
  };

  const handleSaveChapter = async (form) => {
    if (formModal.mode === "edit-chapter") {
      setModules(m => m.map(mod => ({ ...mod, chapters: mod.chapters.map(c => c.id === form.id ? { ...c, ...form } : c) })));
      showToast("Chapter updated", "success");
    } else {
      const newChap = { ...form, id: `chap-${Date.now()}`, moduleId: formModal.moduleId, resources: [] };
      setModules(m => m.map(x => x.id === formModal.moduleId
        ? { ...x, chapters: [...x.chapters, newChap], totalChapters: x.totalChapters + 1 } : x));
      if (viewingModule?.id === formModal.moduleId)
        setViewingModule(p => ({ ...p, chapters: [...p.chapters, newChap], totalChapters: p.totalChapters + 1 }));
      showToast("Chapter added", "success");
    }
    setFormModal(null);
  };

  const handleDeleteModule = (id) => {
    if (window.confirm("Delete this module and all its chapters?")) {
      setModules(m => m.filter(x => x.id !== id));
      showToast("Module deleted", "error");
    }
  };

  const handleDeleteChapter = (chapId) => {
    if (window.confirm("Delete this chapter?")) {
      setModules(m => m.map(mod => ({
        ...mod,
        chapters: mod.chapters.filter(c => c.id !== chapId),
        totalChapters: mod.chapters.some(c => c.id === chapId) ? mod.totalChapters - 1 : mod.totalChapters,
      })));
      if (viewingModule) setViewingModule(p => ({ ...p, chapters: p.chapters.filter(c => c.id !== chapId), totalChapters: p.totalChapters - 1 }));
      showToast("Chapter deleted", "error");
    }
  };

  const tabs = [
    { id: "outline",   label: "Outline",   icon: "🗺️" },
    { id: "daily",     label: "Planner",   icon: "📅" },
    { id: "resources", label: "Resources", icon: "📚" },
    { id: "publish",   label: "Publish",   icon: "🚀" },
  ];

  return (
    <>
      <style>{CSS}</style>
      <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
        <div className={`cp-root${dark ? " dark-theme" : ""}`}>

          {/* Hero */}
          <div className="am-hero">
            <div className="am-hero-inner">
              <div className="am-hero-left">
                <div className="am-hero-icon">🗓️</div>
                <div>
                  <div className="am-hero-pill">👨‍🏫 TEACHER TOOLS</div>
                  <div className="am-hero-title">Curriculum & Lesson Planner</div>
                  <div className="am-hero-sub">Course design · Lesson planning · Publishing</div>
                </div>
              </div>
              <div className="am-hero-right">
                {[
                  { n: totalModules,       l: "Modules"  },
                  { n: totalChapters,      l: "Chapters" },
                  { n: `${progressPct}%`,  l: "Progress" },
                  { n: lessons.length,     l: "Lessons"  },
                ].map((s, i) => (
                  <div key={i} className="am-hstat">
                    <div className="am-hstat-n">{typeof s.n === "number" ? s.n : s.n}</div>
                    <div className="am-hstat-l">{s.l}</div>
                  </div>
                ))}
                <button className="am-theme-btn" onClick={() => setDark(d => !d)} title="Toggle dark mode">
                  {dark ? "☀️" : "🌙"}
                </button>
              </div>
            </div>
          </div>

          {/* Nav */}
          <div className="am-nav">
            {tabs.map(t => (
              <button key={t.id} className={`am-nav-btn${activeTab === t.id ? " on" : ""}`} onClick={() => setActiveTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
            {/* Mobile-only theme toggle */}
            <button className="am-nav-btn" onClick={() => setDark(d => !d)} style={{ marginLeft: "auto" }}>
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>

          {/* Stat Cards */}
          <div className="am-stats">
            {[
              { label: "Modules",   value: totalModules,         cls: "blue",   icon: "📦", sub: `${modules.filter(m => m.status === "in-progress").length} active` },
              { label: "Chapters",  value: totalChapters,        cls: "purple", icon: "📖", sub: `${completedChaps} done` },
              { label: "Lessons",   value: lessons.length,       cls: "green",  icon: "✍️", sub: `${lessons.filter(l => l.status === "published").length} published` },
              { label: "Resources", value: mockResources.length, cls: "amber",  icon: "📁", sub: "PDF · Video · PPT" },
              { label: "Progress",  value: progressPct,          cls: "rose",   icon: "📈", sub: `${completedChaps}/${totalChapters} chapters`, suffix: "%" },
            ].map((s, i) => (
              <motion.div key={i} className={`am-scard ${s.cls}`}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .05 + i * .07 }}>
                <div className="am-scard-icon">{s.icon}</div>
                <div className="am-scard-n"><AnimNum target={s.value} suffix={s.suffix || ""} /></div>
                <div className="am-scard-l">{s.label}</div>
                <div className="am-scard-sub">{s.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Body */}
          <div className="am-body">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
                {activeTab === "outline"   && <OutlineView modules={modules} onModuleClick={m => setViewingModule(m)} onAddModule={() => setFormModal({ mode: "module" })} onEditModule={m => setFormModal({ mode: "edit-module", data: m })} onDeleteModule={handleDeleteModule} showToast={showToast} />}
                {activeTab === "daily"     && <DailyPlannerView modules={modules} lessons={lessons} setLessons={setLessons} showToast={showToast} />}
                {activeTab === "resources" && <ResourceVaultView showToast={showToast} />}
                {activeTab === "publish"   && <PublishingView modules={modules} showToast={showToast} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Drawers */}
          <AnimatePresence>
            {viewingModule && (
              <ModuleDrawer module={viewingModule} onClose={() => setViewingModule(null)}
                onEditChapter={ch => setFormModal({ mode: "edit-chapter", data: ch })}
                onAddChapter={() => setFormModal({ mode: "chapter", moduleId: viewingModule.id })}
                onDeleteChapter={handleDeleteChapter} showToast={showToast} />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {viewingChapter && <ChapterDrawer chapter={viewingChapter} lessons={lessons} onClose={() => setViewingChapter(null)} showToast={showToast} />}
          </AnimatePresence>

          {/* Form Modal */}
          <AnimatePresence>
            {formModal && (
              <FormModal mode={formModal.mode} data={formModal.data}
                onSave={formModal.mode?.includes("chapter") ? handleSaveChapter : handleSaveModule}
                onClose={() => setFormModal(null)} />
            )}
          </AnimatePresence>

          {/* Toast */}
          <AnimatePresence>
            {toast && <Toast key={toast.msg + toast.type} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
          </AnimatePresence>
        </div>
      </ThemeCtx.Provider>
    </>
  );
}