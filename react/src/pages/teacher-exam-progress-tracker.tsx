import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

/* ════════════════════════════════════════════════════════════════════════
   TYPES (JSDoc — convert to .ts / interfaces once backend contracts land)
   ════════════════════════════════════════════════════════════════════════
   Student            { id, name, rollNumber, class, section, photo }
   ExamProgressRecord { studentId, examId, examName, subject, status,
                        score?, accuracy?, timeSpent?, completionDate?,
                        totalQuestions?, correctAnswers? }
   status ∈ "completed" | "in-progress" | "not-started"
   ════════════════════════════════════════════════════════════════════════ */

/* ─── Mock Data (swap for live data via examApi below) ───────────────────── */
export const mockStudents = [
  { id: "S001", name: "Aarav Sharma",  rollNumber: "101", class: "10", section: "A", photo: "https://i.pravatar.cc/150?img=1" },
  { id: "S002", name: "Vivaan Singh",  rollNumber: "102", class: "10", section: "A", photo: "https://i.pravatar.cc/150?img=2" },
  { id: "S003", name: "Aditya Kumar",  rollNumber: "103", class: "10", section: "A", photo: "https://i.pravatar.cc/150?img=3" },
  { id: "S004", name: "Ishaan Patel",  rollNumber: "104", class: "10", section: "A", photo: "https://i.pravatar.cc/150?img=4" },
  { id: "S005", name: "Diya Gupta",    rollNumber: "105", class: "10", section: "A", photo: "https://i.pravatar.cc/150?img=5" },
  { id: "S006", name: "Ananya Reddy",  rollNumber: "106", class: "10", section: "A", photo: "https://i.pravatar.cc/150?img=6" },
  { id: "S007", name: "Aryan Joshi",   rollNumber: "201", class: "12", section: "B", photo: "https://i.pravatar.cc/150?img=7" },
  { id: "S008", name: "Riya Malhotra", rollNumber: "202", class: "12", section: "B", photo: "https://i.pravatar.cc/150?img=8" },
  { id: "S009", name: "Kabir Verma",   rollNumber: "203", class: "12", section: "B", photo: "https://i.pravatar.cc/150?img=9" },
  { id: "S010", name: "Myra Chauhan",  rollNumber: "204", class: "12", section: "B", photo: "https://i.pravatar.cc/150?img=10" },
  { id: "S011", name: "Priya Nair",    rollNumber: "205", class: "12", section: "B", photo: "https://i.pravatar.cc/150?img=11" },
  { id: "S012", name: "Rohan Mehta",   rollNumber: "107", class: "10", section: "A", photo: "https://i.pravatar.cc/150?img=12" },
];

const initExamProgress = [
  { studentId: "S001", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "completed", score: 85, accuracy: 88, timeSpent: 45, completionDate: "2024-06-20", totalQuestions: 20, correctAnswers: 17 },
  { studentId: "S002", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "completed", score: 92, accuracy: 95, timeSpent: 40, completionDate: "2024-06-20", totalQuestions: 20, correctAnswers: 19 },
  { studentId: "S003", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "completed", score: 70, accuracy: 75, timeSpent: 55, completionDate: "2024-06-21", totalQuestions: 20, correctAnswers: 15 },
  { studentId: "S004", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "in-progress" },
  { studentId: "S005", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "not-started" },
  { studentId: "S012", examId: "M101", examName: "Mathematics Unit Test 1", subject: "Mathematics", status: "completed", score: 65, accuracy: 70, timeSpent: 58, completionDate: "2024-06-21", totalQuestions: 20, correctAnswers: 14 },
  { studentId: "S007", examId: "P121", examName: "Physics Mid-Term", subject: "Physics", status: "completed", score: 88, accuracy: 90, timeSpent: 85, completionDate: "2024-06-18", totalQuestions: 50, correctAnswers: 45 },
  { studentId: "S008", examId: "P121", examName: "Physics Mid-Term", subject: "Physics", status: "completed", score: 75, accuracy: 80, timeSpent: 90, completionDate: "2024-06-18", totalQuestions: 50, correctAnswers: 40 },
  { studentId: "S009", examId: "P121", examName: "Physics Mid-Term", subject: "Physics", status: "completed", score: 93, accuracy: 94, timeSpent: 80, completionDate: "2024-06-19", totalQuestions: 50, correctAnswers: 47 },
  { studentId: "S010", examId: "P121", examName: "Physics Mid-Term", subject: "Physics", status: "not-started" },
  { studentId: "S011", examId: "P121", examName: "Physics Mid-Term", subject: "Physics", status: "in-progress" },
  { studentId: "S001", examId: "S101", examName: "Science Quarterly", subject: "Science", status: "completed", score: 90, accuracy: 92, timeSpent: 75, completionDate: "2024-06-15", totalQuestions: 60, correctAnswers: 55 },
  { studentId: "S002", examId: "S101", examName: "Science Quarterly", subject: "Science", status: "completed", score: 88, accuracy: 90, timeSpent: 70, completionDate: "2024-06-15", totalQuestions: 60, correctAnswers: 54 },
  { studentId: "S006", examId: "S101", examName: "Science Quarterly", subject: "Science", status: "completed", score: 65, accuracy: 68, timeSpent: 88, completionDate: "2024-06-16", totalQuestions: 60, correctAnswers: 41 },
  { studentId: "S003", examId: "E101", examName: "English Unit Test", subject: "English", status: "completed", score: 78, accuracy: 80, timeSpent: 35, completionDate: "2024-06-22", totalQuestions: 25, correctAnswers: 20 },
  { studentId: "S004", examId: "E101", examName: "English Unit Test", subject: "English", status: "completed", score: 82, accuracy: 84, timeSpent: 30, completionDate: "2024-06-22", totalQuestions: 25, correctAnswers: 21 },
  { studentId: "S012", examId: "E101", examName: "English Unit Test", subject: "English", status: "completed", score: 60, accuracy: 64, timeSpent: 42, completionDate: "2024-06-23", totalQuestions: 25, correctAnswers: 16 },
];

/* ════════════════════════════════════════════════════════════════════════
   API ABSTRACTION LAYER
   Swap the body of each function for a real fetch() call once the backend
   is ready — every consumer below only talks to `examApi`, never to the
   mock arrays directly, so no UI code needs to change.

   Example real implementation:
     async function getStudents() {
       const res = await fetch("/api/teacher/students");
       if (!res.ok) throw new Error("Failed to load students");
       return res.json();
     }
   ════════════════════════════════════════════════════════════════════════ */
const simulateLatency = (data, ms = 250) =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

export const examApi = {
  getStudents: () => simulateLatency(mockStudents),
  getExamProgress: (filters = {}) => {
    let data = [...initExamProgress];
    if (filters.examName && filters.examName !== "all") data = data.filter(p => p.examName === filters.examName);
    if (filters.subject && filters.subject !== "all") data = data.filter(p => p.subject === filters.subject);
    if (filters.status && filters.status !== "all") data = data.filter(p => p.status === filters.status);
    return simulateLatency(data);
  },
  getStudentProgress: (studentId) =>
    simulateLatency(initExamProgress.filter(p => p.studentId === studentId)),
};

/* ─── CSS ──────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root {
  --bg-app:#f8fafc; --bg-panel:#ffffff; --bg-panel2:#fafafa; --bg-hover:#f5f3ff;
  --border:rgba(0,0,0,.06); --border2:#f1f5f9; --text-main:#0f172a; --text-sub:#64748b;
  --text-muted:#94a3b8; --shadow:0 2px 12px rgba(0,0,0,.05); --shadow2:0 12px 32px rgba(0,0,0,.10);
  --bar-bg:#f1f5f9; --tip-bg:#ffffff;
  --btn-bg:#ffffff; --btn-text:#374151; --btn-hover:#f5f3ff; --btn-htext:#6366f1;
  --table-hover:#f8fafc; --input-bg:#f8fafc; --overlay:rgba(15,23,42,.45);
}
[data-theme="dark"] {
  --bg-app:#0b1120; --bg-panel:#141f35; --bg-panel2:#1a2540; --bg-hover:rgba(99,102,241,.15);
  --border:rgba(255,255,255,.07); --border2:rgba(255,255,255,.06); --text-main:#f1f5f9;
  --text-sub:#94a3b8; --text-muted:#64748b; --shadow:0 2px 12px rgba(0,0,0,.3);
  --shadow2:0 12px 32px rgba(0,0,0,.45); --bar-bg:rgba(255,255,255,.07); --tip-bg:#1a2540;
  --btn-bg:rgba(255,255,255,.06); --btn-text:#94a3b8; --btn-hover:rgba(99,102,241,.18);
  --btn-htext:#a5b4fc; --table-hover:rgba(255,255,255,.03); --input-bg:#1a2540;
  --overlay:rgba(0,0,0,.6);
}
.ept-root { font-family:'Plus Jakarta Sans',system-ui,sans-serif; background:var(--bg-app); color:var(--text-main); transition:background .3s ease, color .3s ease; min-height:100vh; }
.ept-hero { margin:20px 28px 0; border-radius:20px; padding:18px 28px; background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%); position:relative; overflow:hidden; color:#fff; box-shadow:0 6px 24px rgba(99,102,241,.26); animation:heroIn .55s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes heroIn{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}
.ept-hero::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none;}
.ept-hero::after{content:'';position:absolute;bottom:-50px;left:30%;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none;}
.ept-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.ept-hero-left{display:flex;align-items:center;gap:14px;}
.ept-hero-icon{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.25);border:2px solid rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.ept-hero-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;margin-bottom:5px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);font-size:10.5px;font-weight:700;color:#fff;}
.ept-hero-title{font-size:clamp(16px,2.2vw,22px);font-weight:800;color:#fff;margin-bottom:2px;letter-spacing:-.2px;line-height:1.2;}
.ept-hero-sub{font-size:12px;color:rgba(255,255,255,.68);line-height:1.4;}
.ept-hero-right{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.ept-hstat{text-align:center;padding:8px 14px;border-radius:12px;min-width:58px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(8px);transition:transform .2s;}
.ept-hstat:hover{transform:translateY(-2px);}
.ept-hstat-n{font-size:18px;font-weight:800;color:#fff;line-height:1;}
.ept-hstat-l{font-size:9.5px;color:rgba(255,255,255,.62);margin-top:1px;}
.ept-theme-toggle{width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.18);color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

.ept-tabs{display:flex;gap:6px;padding:16px 28px 0;flex-wrap:wrap;}
.ept-tab{padding:9px 18px;border-radius:11px;border:1.5px solid var(--border);background:var(--bg-panel);color:var(--text-sub);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:all .18s;display:flex;align-items:center;gap:6px;}
.ept-tab:hover{color:#6366f1;border-color:#6366f1;}
.ept-tab.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 4px 14px rgba(99,102,241,.3);}

.ept-body{padding:20px 28px 80px;}
.ept-panel{background:var(--bg-panel);border-radius:20px;border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;transition:background .3s,border-color .3s;}
.ept-panel-head{padding:18px 22px 14px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.ept-panel-title{font-size:15px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:8px;}
.ept-panel-sub{font-size:12.5px;color:var(--text-sub);margin-top:3px;}
.ept-panel-body{padding:20px 22px;}
.ept-filters-bar{background:var(--bg-panel);border-radius:16px;padding:16px 20px;border:1px solid var(--border);box-shadow:var(--shadow);margin-bottom:16px;}
.ept-filters-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;align-items:end;}
.ept-filter-group{display:flex;flex-direction:column;gap:5px;}
.ept-filter-label{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;}
.ept-filter-select,.ept-filter-input{width:100%;padding:8px 12px;border-radius:10px;border:1.5px solid var(--border2);background:var(--input-bg);color:var(--text-main);font-family:inherit;font-size:13px;appearance:none;-webkit-appearance:none;outline:none;transition:border-color .2s;}
.ept-filter-select:focus,.ept-filter-input:focus{border-color:#6366f1;}
.ept-search-wrap{position:relative;}
.ept-search-icon{position:absolute;top:50%;right:10px;transform:translateY(-50%);color:var(--text-muted);pointer-events:none;font-size:14px;}
.ept-btn{padding:8px 16px;border-radius:10px;border:1.5px solid var(--border2);background:var(--btn-bg);color:var(--btn-text);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .18s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
.ept-btn:hover{background:var(--btn-hover);color:var(--btn-htext);border-color:#6366f1;}
.ept-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;}
.ept-table{width:100%;border-collapse:collapse;min-width:820px;}
.ept-th{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);padding:12px 16px;text-align:left;border-bottom:1px solid var(--border2);cursor:pointer;user-select:none;white-space:nowrap;}
.ept-th:hover{color:#6366f1;}
.ept-tr{transition:background .15s;cursor:pointer;}
.ept-tr:hover{background:var(--table-hover);}
.ept-td{padding:13px 16px;font-size:13.5px;color:var(--text-main);border-bottom:1px solid var(--border2);}
.ept-student-cell{display:flex;align-items:center;gap:11px;}
.ept-student-photo{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--border2);}
.ept-student-name{font-weight:700;font-size:13.5px;}
.ept-student-roll{font-size:11px;color:var(--text-muted);margin-top:1px;}
.ept-status-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;}
.ept-status-completed{background:rgba(34,197,94,.1);color:#16a34a;}
.ept-status-in-progress{background:rgba(59,130,246,.1);color:#2563eb;}
.ept-status-not-started{background:rgba(239,68,68,.1);color:#dc2626;}
[data-theme="dark"] .ept-status-completed{background:rgba(34,197,94,.18);color:#4ade80;}
[data-theme="dark"] .ept-status-in-progress{background:rgba(59,130,246,.18);color:#60a5fa;}
[data-theme="dark"] .ept-status-not-started{background:rgba(239,68,68,.18);color:#f87171;}
.ept-pagination{display:flex;align-items:center;gap:6px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;}
.ept-page-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--border2);background:var(--btn-bg);color:var(--text-sub);cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.ept-page-btn:hover{border-color:#6366f1;color:#6366f1;}
.ept-page-info{font-size:12.5px;color:var(--text-sub);font-weight:500;}
.ept-empty{text-align:center;padding:40px 20px;color:var(--text-muted);}
.ept-empty-icon{font-size:40px;margin-bottom:12px;}
.ept-empty-text{font-size:14px;font-weight:600;}
.ept-empty-sub{font-size:12.5px;margin-top:5px;}

.recharts-cartesian-grid line{stroke:var(--border2);}
.recharts-text{fill:var(--text-muted);}
.recharts-wrapper{font-size:12px;}

.ept-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;padding:20px 28px 0;}
.ept-scard{background:var(--bg-panel);border-radius:20px;padding:18px;border:1px solid var(--border);box-shadow:var(--shadow);transition:all .28s cubic-bezier(.4,0,.2,1);animation:scardIn .5s cubic-bezier(.34,1.56,.64,1) both;position:relative;overflow:hidden;}
@keyframes scardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.ept-scard:hover{transform:translateY(-6px) scale(1.01);box-shadow:var(--shadow2);}
.ept-scard.blue{border-top:3px solid #6366f1;}
.ept-scard.green{border-top:3px solid #10b981;}
.ept-scard.red{border-top:3px solid #ef4444;}
.ept-scard.amber{border-top:3px solid #f59e0b;}
.ept-scard.purple{border-top:3px solid #8b5cf6;}
.ept-scard-icon{width:36px;height:36px;border-radius:10px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;font-size:16px;}
.ept-scard.blue .ept-scard-icon{background:rgba(99,102,241,.1);}
.ept-scard.green .ept-scard-icon{background:rgba(16,185,129,.1);}
.ept-scard.red .ept-scard-icon{background:rgba(239,68,68,.1);}
.ept-scard.amber .ept-scard-icon{background:rgba(245,158,11,.1);}
.ept-scard-n{font-size:26px;font-weight:800;color:var(--text-main);letter-spacing:-1px;line-height:1;}
.ept-scard-l{font-size:11.5px;color:var(--text-sub);margin-top:3px;font-weight:500;}
.ept-scard-sub{font-size:10.5px;margin-top:5px;font-weight:600;}
.ept-scard-sub.green{color:#10b981;}
.ept-scard-sub.red{color:#ef4444;}

/* class-wise cards */
.ept-class-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;}
.ept-class-card{background:var(--bg-panel2);border:1px solid var(--border);border-radius:16px;padding:18px;cursor:pointer;transition:all .2s;}
.ept-class-card:hover{transform:translateY(-3px);box-shadow:var(--shadow2);border-color:#6366f1;}
.ept-class-card.active{border-color:#6366f1;background:var(--bg-hover);}
.ept-class-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.ept-class-badge{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;}
.ept-class-name{font-size:14.5px;font-weight:800;}
.ept-class-meta{font-size:11.5px;color:var(--text-sub);}
.ept-class-row{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--text-sub);margin-top:6px;}
.ept-class-row b{color:var(--text-main);font-weight:700;}
.ept-progress-track{height:6px;border-radius:6px;background:var(--bar-bg);margin-top:10px;overflow:hidden;}
.ept-progress-fill{height:100%;border-radius:6px;background:linear-gradient(90deg,#6366f1,#8b5cf6);}

/* student-wise search + drawer */
.ept-student-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
.ept-student-card{background:var(--bg-panel2);border:1px solid var(--border);border-radius:16px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .2s;}
.ept-student-card:hover{border-color:#6366f1;transform:translateY(-2px);box-shadow:var(--shadow);}
.ept-student-card-photo{width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--border2);}
.ept-student-card-pct{margin-left:auto;font-weight:800;font-size:14px;color:#6366f1;}

.ept-drawer-overlay{position:fixed;inset:0;background:var(--overlay);z-index:60;}
.ept-drawer{position:fixed;top:0;right:0;height:100%;width:min(440px,100%);background:var(--bg-panel);z-index:61;box-shadow:-12px 0 40px rgba(0,0,0,.18);display:flex;flex-direction:column;}
.ept-drawer-head{padding:20px;border-bottom:1px solid var(--border2);display:flex;align-items:center;gap:14px;}
.ept-drawer-photo{width:56px;height:56px;border-radius:50%;object-fit:cover;border:3px solid var(--border2);}
.ept-drawer-close{margin-left:auto;width:32px;height:32px;border-radius:50%;border:none;background:var(--bg-panel2);color:var(--text-sub);cursor:pointer;font-size:15px;}
.ept-drawer-body{padding:20px;overflow-y:auto;flex:1;}
.ept-drawer-overall{text-align:center;padding:16px;border-radius:16px;background:var(--bg-hover);margin-bottom:18px;}
.ept-drawer-overall-n{font-size:34px;font-weight:800;color:#6366f1;letter-spacing:-1px;}
.ept-drawer-overall-l{font-size:12px;color:var(--text-sub);margin-top:2px;}
.ept-subject-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border2);}
.ept-subject-name{font-size:13px;font-weight:700;}
.ept-subject-score{font-size:13px;font-weight:800;color:var(--text-main);}
.ept-history-item{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-radius:10px;background:var(--bg-panel2);margin-bottom:6px;}
.ept-history-name{font-size:12.5px;font-weight:600;}
.ept-history-sub{font-size:10.5px;color:var(--text-muted);}

@media(max-width:768px){
  .ept-hero{margin:10px 12px 0;border-radius:16px;}
  .ept-hero-right{display:none;}
  .ept-tabs{padding:12px 12px 0;}
  .ept-stats{grid-template-columns:repeat(2,1fr);padding:10px 12px 0;}
  .ept-body{padding:10px 12px 80px;}
  .ept-filters-grid{grid-template-columns:1fr;}
  .ept-drawer{width:100%;}
}
@media(max-width:480px){
  .ept-stats{grid-template-columns:1fr;}
  .ept-class-grid{grid-template-columns:1fr;}
}
`;

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function AnimNum({ target, suffix = "" }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setV(target));
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{Math.round(v)}{suffix}</>;
}

function overallPercentage(records) {
  const completed = records.filter(r => r.status === "completed" && typeof r.score === "number");
  if (!completed.length) return 0;
  return completed.reduce((sum, r) => sum + r.score, 0) / completed.length;
}

function subjectBreakdown(records) {
  const bySubject = {};
  records.forEach(r => {
    if (r.status !== "completed" || typeof r.score !== "number") return;
    if (!bySubject[r.subject]) bySubject[r.subject] = { total: 0, count: 0 };
    bySubject[r.subject].total += r.score;
    bySubject[r.subject].count += 1;
  });
  return Object.entries(bySubject).map(([subject, v]) => ({
    subject, score: Math.round(v.total / v.count),
  }));
}

/* ─── Student Detail Drawer ───────────────────────────────────────────── */
function StudentDrawer({ student, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    let active = true;
    setLoading(true);
    examApi.getStudentProgress(student.id).then(data => {
      if (active) { setRecords(data); setLoading(false); }
    });
    return () => { active = false; };
  }, [student]);

  if (!student) return null;
  const overall = overallPercentage(records);
  const bySubject = subjectBreakdown(records);
  const completedCount = records.filter(r => r.status === "completed").length;

  return (
    <AnimatePresence>
      <motion.div className="ept-drawer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="ept-drawer" initial={{ x: 440 }} animate={{ x: 0 }} exit={{ x: 440 }} transition={{ type: "spring", damping: 28, stiffness: 260 }}>
        <div className="ept-drawer-head">
          <img src={student.photo} alt={student.name} className="ept-drawer-photo" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{student.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-sub)" }}>Class {student.class}-{student.section} · Roll #{student.rollNumber}</div>
          </div>
          <button className="ept-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="ept-drawer-body">
          {loading ? (
            <div className="ept-empty"><div className="ept-empty-text">Loading…</div></div>
          ) : (
            <>
              <div className="ept-drawer-overall">
                <div className="ept-drawer-overall-n"><AnimNum target={overall} suffix="%" /></div>
                <div className="ept-drawer-overall-l">Overall average · {completedCount} exam{completedCount !== 1 ? "s" : ""} completed</div>
              </div>

              {bySubject.length > 0 && (
                <div style={{ height: 220, marginBottom: 18 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={bySubject} outerRadius="75%">
                      <PolarGrid stroke="var(--border2)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--text-sub)" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--text-muted)" }} />
                      <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                      <Tooltip contentStyle={{ background: "var(--tip-bg)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Subject-wise</div>
              {bySubject.map(s => (
                <div className="ept-subject-row" key={s.subject}>
                  <span className="ept-subject-name">{s.subject}</span>
                  <span className="ept-subject-score">{s.score}%</span>
                </div>
              ))}

              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", margin: "18px 0 8px" }}>Exam history</div>
              {records.map((r, i) => (
                <div className="ept-history-item" key={i}>
                  <div>
                    <div className="ept-history-name">{r.examName}</div>
                    <div className="ept-history-sub">{r.subject}{r.completionDate ? ` · ${r.completionDate}` : ""}</div>
                  </div>
                  {r.status === "completed"
                    ? <span className="ept-subject-score">{r.score}%</span>
                    : <span className={`ept-status-badge ept-status-${r.status}`}>{r.status.replace("-", " ")}</span>}
                </div>
              ))}
              {records.length === 0 && <div className="ept-empty-sub">No exam records yet.</div>}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────────────────── */
export default function StudentExamProgressTracker() {
  const [theme, setTheme] = useState("light");
  const [students, setStudents] = useState([]);
  const [examProgress, setExamProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("overview"); // overview | class | student
  const [filters, setFilters] = useState({ exam: "all", subject: "all", status: "all", search: "" });
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [sort, setSort] = useState({ key: "name", dir: "asc" });

  const [selectedClass, setSelectedClass] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [drawerStudent, setDrawerStudent] = useState(null);

  // ── Initial data load (mirrors a future fetch-on-mount pattern) ──────────
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([examApi.getStudents(), examApi.getExamProgress()]).then(([s, p]) => {
      if (!active) return;
      setStudents(s);
      setExamProgress(p);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const uniqueExams = useMemo(() => [...new Set(initExamProgress.map(p => p.examName))], []);
  const uniqueSubjects = useMemo(() => [...new Set(initExamProgress.map(p => p.subject))], []);
  const uniqueClasses = useMemo(() => [...new Set(students.map(s => s.class))].sort(), [students]);

  // ── Overview stats ────────────────────────────────────────────────────
  const completedExams = useMemo(() => examProgress.filter(p => p.status === "completed"), [examProgress]);
  const averageScore = useMemo(() => overallPercentage(examProgress), [examProgress]);
  const completionRate = useMemo(() => (examProgress.length ? (completedExams.length / examProgress.length) * 100 : 0), [examProgress, completedExams]);
  const studentsInProgress = useMemo(() => examProgress.filter(p => p.status === "in-progress").length, [examProgress]);
  const studentsNotStarted = useMemo(() => examProgress.filter(p => p.status === "not-started").length, [examProgress]);

  const subjectTrend = useMemo(() => subjectBreakdown(examProgress), [examProgress]);

  // ── Class-wise aggregation ────────────────────────────────────────────
  const classStats = useMemo(() => uniqueClasses.map(cls => {
    const classStudents = students.filter(s => s.class === cls);
    const studentIds = new Set(classStudents.map(s => s.id));
    const records = examProgress.filter(p => studentIds.has(p.studentId));
    const completed = records.filter(r => r.status === "completed");
    return {
      class: cls,
      studentCount: classStudents.length,
      avgScore: overallPercentage(records),
      completionRate: records.length ? (completed.length / records.length) * 100 : 0,
      completedCount: completed.length,
      totalRecords: records.length,
    };
  }), [uniqueClasses, students, examProgress]);

  // ── Student-wise list (with overall %) ────────────────────────────────
  const studentOverallList = useMemo(() => students
    .filter(s => (selectedClass ? s.class === selectedClass : true))
    .filter(s => studentSearch === "" || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.rollNumber.includes(studentSearch))
    .map(s => {
      const records = examProgress.filter(p => p.studentId === s.id);
      return { ...s, overall: overallPercentage(records), examCount: records.length };
    })
    .sort((a, b) => b.overall - a.overall),
  [students, examProgress, selectedClass, studentSearch]);

  // ── Filtered + sorted table (overview tab) ────────────────────────────
  const studentsWithProgress = useMemo(() => {
    let progress = filters.exam === "all" ? examProgress : examProgress.filter(p => p.examName === filters.exam);
    return students.map(student => {
      const studentProgress = progress.find(p => p.studentId === student.id);
      return { ...student, progress: studentProgress };
    }).filter(s => s.progress);
  }, [students, examProgress, filters.exam]);

  const filtered = useMemo(() => studentsWithProgress.filter(s => {
    if (!s.progress) return false;
    const subjectMatch = filters.subject === "all" || s.progress.subject === filters.subject;
    const statusMatch = filters.status === "all" || s.progress.status === filters.status;
    const searchMatch = filters.search === "" || s.name.toLowerCase().includes(filters.search.toLowerCase()) || s.rollNumber.includes(filters.search);
    return subjectMatch && statusMatch && searchMatch;
  }), [studentsWithProgress, filters]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const aVal = a.progress?.[sort.key] ?? a[sort.key];
    const bVal = b.progress?.[sort.key] ?? b[sort.key];
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sort.dir === "asc" ? cmp : -cmp;
  }), [filtered, sort]);

  const paginated = useMemo(() => sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage), [sorted, page]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));

  const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  return (
    <>
      <style>{CSS}</style>
      <div className="ept-root" data-theme={theme}>

        {/* ── Hero ── */}
        <div className="ept-hero">
          <div className="ept-hero-inner">
            <div className="ept-hero-left">
              <div className="ept-hero-icon">📊</div>
              <div>
                <div className="ept-hero-pill">👨‍🏫 Teacher Module</div>
                <div className="ept-hero-title">Student Exam Progress Tracker</div>
                <div className="ept-hero-sub">Monitor completion, scores, accuracy and time spent across every class.</div>
              </div>
            </div>
            <div className="ept-hero-right">
              <div className="ept-hstat"><div className="ept-hstat-n">{Math.round(averageScore)}%</div><div className="ept-hstat-l">Avg. Score</div></div>
              <div className="ept-hstat"><div className="ept-hstat-n">{Math.round(completionRate)}%</div><div className="ept-hstat-l">Completion</div></div>
              <button className="ept-theme-toggle" onClick={() => setTheme(t => t === "light" ? "dark" : "light")} title="Toggle dark mode">
                {theme === "light" ? "🌙" : "☀️"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="ept-stats">
          <div className="ept-scard blue">
            <div className="ept-scard-icon">📈</div>
            <div className="ept-scard-n"><AnimNum target={averageScore} suffix="%" /></div>
            <div className="ept-scard-l">Average Score</div>
            <div className={`ept-scard-sub ${averageScore > 75 ? "green" : "red"}`}>{averageScore > 75 ? "Good performance" : "Needs improvement"}</div>
          </div>
          <div className="ept-scard green">
            <div className="ept-scard-icon">✅</div>
            <div className="ept-scard-n"><AnimNum target={completionRate} suffix="%" /></div>
            <div className="ept-scard-l">Completion Rate</div>
            <div className="ept-scard-sub green">{completedExams.length} finished</div>
          </div>
          <div className="ept-scard amber">
            <div className="ept-scard-icon">⏳</div>
            <div className="ept-scard-n"><AnimNum target={studentsInProgress} /></div>
            <div className="ept-scard-l">Exams In Progress</div>
            <div className="ept-scard-sub">Students currently taking exams</div>
          </div>
          <div className="ept-scard red">
            <div className="ept-scard-icon">❌</div>
            <div className="ept-scard-n"><AnimNum target={studentsNotStarted} /></div>
            <div className="ept-scard-l">Not Started</div>
            <div className="ept-scard-sub red">{studentsNotStarted} students pending</div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="ept-tabs">
          <button className={`ept-tab ${activeTab === "overview" ? "on" : ""}`} onClick={() => setActiveTab("overview")}>📋 Overview</button>
          <button className={`ept-tab ${activeTab === "class" ? "on" : ""}`} onClick={() => setActiveTab("class")}>🏫 Class-wise</button>
          <button className={`ept-tab ${activeTab === "student" ? "on" : ""}`} onClick={() => setActiveTab("student")}>🧑‍🎓 Student-wise</button>
        </div>

        {/* ── Body ── */}
        <div className="ept-body">

          {loading && (
            <div className="ept-panel"><div className="ept-empty"><div className="ept-empty-text">Loading exam data…</div></div></div>
          )}

          {!loading && activeTab === "overview" && (
            <>
              <div className="ept-filters-bar">
                <div className="ept-filters-grid">
                  <div className="ept-filter-group">
                    <label className="ept-filter-label">Exam</label>
                    <select className="ept-filter-select" value={filters.exam} onChange={e => { setFilters(f => ({ ...f, exam: e.target.value, subject: "all" })); setPage(1); }}>
                      <option value="all">All Exams</option>
                      {uniqueExams.map(exam => <option key={exam} value={exam}>{exam}</option>)}
                    </select>
                  </div>
                  <div className="ept-filter-group">
                    <label className="ept-filter-label">Subject</label>
                    <select className="ept-filter-select" value={filters.subject} onChange={e => { setFilters(f => ({ ...f, subject: e.target.value })); setPage(1); }} disabled={filters.exam === "all"}>
                      <option value="all">All Subjects</option>
                      {uniqueSubjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                    </select>
                  </div>
                  <div className="ept-filter-group">
                    <label className="ept-filter-label">Status</label>
                    <select className="ept-filter-select" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="not-started">Not Started</option>
                    </select>
                  </div>
                  <div className="ept-filter-group">
                    <label className="ept-filter-label">Search</label>
                    <div className="ept-search-wrap">
                      <input className="ept-filter-input" placeholder="Student name or roll no..." value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
                      <span className="ept-search-icon">🔍</span>
                    </div>
                  </div>
                  <div className="ept-filter-group" style={{ justifyContent: "flex-end" }}>
                    <button className="ept-btn" onClick={() => { setFilters({ exam: "all", subject: "all", status: "all", search: "" }); setPage(1); }}>↺ Reset Filters</button>
                  </div>
                </div>
              </div>

              {subjectTrend.length > 0 && (
                <div className="ept-panel" style={{ marginBottom: 20 }}>
                  <div className="ept-panel-head">
                    <div>
                      <div className="ept-panel-title">📊 Subject-wise Average</div>
                      <div className="ept-panel-sub">Average score across all completed exams, by subject</div>
                    </div>
                  </div>
                  <div className="ept-panel-body" style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: "var(--tip-bg)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="score" fill="#6366f1" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="ept-panel">
                <div className="ept-panel-head">
                  <div className="ept-panel-title">👩‍🎓 Student Progress — {sorted.length} results</div>
                </div>
                <div className="ept-panel-body">
                  <div className="ept-table-wrap">
                    <table className="ept-table">
                      <thead>
                        <tr>
                          <th className="ept-th" onClick={() => toggleSort("name")}>Student</th>
                          <th className="ept-th" onClick={() => toggleSort("class")}>Class</th>
                          <th className="ept-th" onClick={() => toggleSort("score")}>Score</th>
                          <th className="ept-th" onClick={() => toggleSort("accuracy")}>Accuracy</th>
                          <th className="ept-th" onClick={() => toggleSort("timeSpent")}>Time Spent</th>
                          <th className="ept-th" onClick={() => toggleSort("status")}>Status</th>
                          <th className="ept-th" onClick={() => toggleSort("completionDate")}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map(s => s.progress && (
                          <motion.tr key={s.id + s.progress.examId} className="ept-tr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setDrawerStudent(s)}>
                            <td className="ept-td">
                              <div className="ept-student-cell">
                                <img src={s.photo} alt={s.name} className="ept-student-photo" />
                                <div>
                                  <div className="ept-student-name">{s.name}</div>
                                  <div className="ept-student-roll">Roll #{s.rollNumber}</div>
                                </div>
                              </div>
                            </td>
                            <td className="ept-td">{s.class}-{s.section}</td>
                            <td className="ept-td">{s.progress.score?.toFixed(0) ?? "–"}%</td>
                            <td className="ept-td">{s.progress.accuracy?.toFixed(0) ?? "–"}%</td>
                            <td className="ept-td">{s.progress.timeSpent ? `${s.progress.timeSpent} min` : "–"}</td>
                            <td className="ept-td"><span className={`ept-status-badge ept-status-${s.progress.status}`}>{s.progress.status.replace("-", " ")}</span></td>
                            <td className="ept-td">{s.progress.completionDate ?? "–"}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {paginated.length === 0 && (
                    <div className="ept-empty"><div className="ept-empty-icon">🔍</div><div className="ept-empty-text">No results found</div><div className="ept-empty-sub">Try adjusting your filters</div></div>
                  )}
                  <div className="ept-pagination">
                    <span className="ept-page-info">{sorted.length} results · Page {page} of {totalPages}</span>
                    <button className="ept-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                    <button className="ept-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {!loading && activeTab === "class" && (
            <div className="ept-panel">
              <div className="ept-panel-head">
                <div>
                  <div className="ept-panel-title">🏫 Class-wise Performance</div>
                  <div className="ept-panel-sub">Click a class to filter the student list below</div>
                </div>
                {selectedClass && <button className="ept-btn" onClick={() => setSelectedClass(null)}>✕ Clear selection</button>}
              </div>
              <div className="ept-panel-body">
                <div className="ept-class-grid">
                  {classStats.map(c => (
                    <div key={c.class} className={`ept-class-card ${selectedClass === c.class ? "active" : ""}`} onClick={() => { setSelectedClass(c.class); setActiveTab("student"); }}>
                      <div className="ept-class-card-top">
                        <div className="ept-class-badge">{c.class}</div>
                        <div style={{ textAlign: "right" }}>
                          <div className="ept-class-name">Class {c.class}</div>
                          <div className="ept-class-meta">{c.studentCount} students</div>
                        </div>
                      </div>
                      <div className="ept-class-row"><span>Average Score</span><b>{Math.round(c.avgScore)}%</b></div>
                      <div className="ept-class-row"><span>Completion</span><b>{Math.round(c.completionRate)}%</b></div>
                      <div className="ept-class-row"><span>Exams Completed</span><b>{c.completedCount}/{c.totalRecords}</b></div>
                      <div className="ept-progress-track"><div className="ept-progress-fill" style={{ width: `${c.avgScore}%` }} /></div>
                    </div>
                  ))}
                  {classStats.length === 0 && <div className="ept-empty"><div className="ept-empty-text">No class data available</div></div>}
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === "student" && (
            <div className="ept-panel">
              <div className="ept-panel-head">
                <div>
                  <div className="ept-panel-title">🧑‍🎓 Student-wise Overall Performance{selectedClass ? ` — Class ${selectedClass}` : ""}</div>
                  <div className="ept-panel-sub">Sorted by overall percentage · click a student for the full subject-wise breakdown</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select className="ept-filter-select" style={{ width: 140 }} value={selectedClass || "all"} onChange={e => setSelectedClass(e.target.value === "all" ? null : e.target.value)}>
                    <option value="all">All Classes</option>
                    {uniqueClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                  <div className="ept-search-wrap">
                    <input className="ept-filter-input" placeholder="Search student..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                    <span className="ept-search-icon">🔍</span>
                  </div>
                </div>
              </div>
              <div className="ept-panel-body">
                <div className="ept-student-grid">
                  {studentOverallList.map(s => (
                    <div key={s.id} className="ept-student-card" onClick={() => setDrawerStudent(s)}>
                      <img src={s.photo} alt={s.name} className="ept-student-card-photo" />
                      <div>
                        <div className="ept-student-name">{s.name}</div>
                        <div className="ept-student-roll">Class {s.class}-{s.section} · {s.examCount} exam{s.examCount !== 1 ? "s" : ""}</div>
                      </div>
                      <div className="ept-student-card-pct">{Math.round(s.overall)}%</div>
                    </div>
                  ))}
                </div>
                {studentOverallList.length === 0 && (
                  <div className="ept-empty"><div className="ept-empty-icon">🔍</div><div className="ept-empty-text">No students found</div></div>
                )}
              </div>
            </div>
          )}
        </div>

        {drawerStudent && <StudentDrawer student={drawerStudent} onClose={() => setDrawerStudent(null)} />}
      </div>
    </>
  );
}