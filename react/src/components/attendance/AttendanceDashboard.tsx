import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Student {
  id: string; name: string; rollNumber: string; class: string; section: string;
  photo: string; parentName: string; parentContact: string; email: string;
  academicPerformance: { math: number; science: number; english: number; };
}
interface AttendanceRecord {
  studentId: string; date: string;
  status: "present" | "absent" | "late" | "leave" | "half-day";
  checkIn?: string; checkOut?: string; remarks?: string;
}
interface LeaveRequest {
  id: string; studentId: string; studentName: string; class: string; section: string;
  fromDate: string; toDate: string; reason: string;
  status: "pending" | "approved" | "rejected"; document?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const today = new Date();
const fmt = (d: Date) => d.toISOString().split("T")[0];
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
const dayBefore = new Date(today); dayBefore.setDate(today.getDate() - 2);

export const mockStudents: Student[] = [
  { id:"S001", name:"Aarav Sharma",   rollNumber:"101", class:"10", section:"A", photo:"https://i.pravatar.cc/150?img=1",  parentName:"Rajesh Sharma",   parentContact:"9876543210", email:"aarav@example.com",  academicPerformance:{math:85, science:90, english:78} },
  { id:"S002", name:"Vivaan Singh",   rollNumber:"102", class:"10", section:"A", photo:"https://i.pravatar.cc/150?img=2",  parentName:"Pooja Singh",     parentContact:"9876543211", email:"vivaan@example.com", academicPerformance:{math:92, science:88, english:95} },
  { id:"S003", name:"Aditya Kumar",   rollNumber:"103", class:"10", section:"A", photo:"https://i.pravatar.cc/150?img=3",  parentName:"Alok Kumar",      parentContact:"9876543212", email:"aditya@example.com", academicPerformance:{math:70, science:75, english:80} },
  { id:"S004", name:"Ishaan Patel",   rollNumber:"104", class:"10", section:"A", photo:"https://i.pravatar.cc/150?img=4",  parentName:"Seema Patel",     parentContact:"9876543213", email:"ishaan@example.com", academicPerformance:{math:78, science:82, english:70} },
  { id:"S005", name:"Diya Gupta",     rollNumber:"105", class:"10", section:"A", photo:"https://i.pravatar.cc/150?img=5",  parentName:"Manoj Gupta",     parentContact:"9876543214", email:"diya@example.com",   academicPerformance:{math:95, science:92, english:88} },
  { id:"S006", name:"Ananya Reddy",   rollNumber:"106", class:"10", section:"A", photo:"https://i.pravatar.cc/150?img=6",  parentName:"Kavita Reddy",    parentContact:"9876543215", email:"ananya@example.com", academicPerformance:{math:60, science:65, english:70} },
  { id:"S007", name:"Aryan Joshi",    rollNumber:"201", class:"12", section:"B", photo:"https://i.pravatar.cc/150?img=7",  parentName:"Sanjay Joshi",    parentContact:"9876543216", email:"aryan@example.com",  academicPerformance:{math:88, science:85, english:90} },
  { id:"S008", name:"Riya Malhotra",  rollNumber:"202", class:"12", section:"B", photo:"https://i.pravatar.cc/150?img=8",  parentName:"Neha Malhotra",   parentContact:"9876543217", email:"riya@example.com",   academicPerformance:{math:75, science:70, english:72} },
  { id:"S009", name:"Kabir Verma",    rollNumber:"203", class:"12", section:"B", photo:"https://i.pravatar.cc/150?img=9",  parentName:"Vivek Verma",     parentContact:"9876543218", email:"kabir@example.com",  academicPerformance:{math:90, science:93, english:89} },
  { id:"S010", name:"Myra Chauhan",   rollNumber:"204", class:"12", section:"B", photo:"https://i.pravatar.cc/150?img=10", parentName:"Smita Chauhan",   parentContact:"9876543219", email:"myra@example.com",   academicPerformance:{math:68, science:72, english:65} },
  { id:"S011", name:"Priya Nair",     rollNumber:"205", class:"12", section:"B", photo:"https://i.pravatar.cc/150?img=11", parentName:"Suresh Nair",     parentContact:"9876543220", email:"priya@example.com",  academicPerformance:{math:82, science:80, english:87} },
  { id:"S012", name:"Rohan Mehta",    rollNumber:"107", class:"10", section:"A", photo:"https://i.pravatar.cc/150?img=12", parentName:"Vikram Mehta",    parentContact:"9876543221", email:"rohan@example.com",  academicPerformance:{math:74, science:78, english:69} },
];

const initAttendance: AttendanceRecord[] = [
  { studentId:"S001", date:fmt(today),     status:"present",  checkIn:"09:00", checkOut:"16:00" },
  { studentId:"S002", date:fmt(today),     status:"present",  checkIn:"09:02", checkOut:"16:05" },
  { studentId:"S003", date:fmt(today),     status:"absent" },
  { studentId:"S004", date:fmt(today),     status:"late",     checkIn:"09:18", checkOut:"16:00" },
  { studentId:"S005", date:fmt(today),     status:"present",  checkIn:"08:58", checkOut:"16:01" },
  { studentId:"S006", date:fmt(today),     status:"leave",    remarks:"Family function" },
  { studentId:"S007", date:fmt(today),     status:"present",  checkIn:"09:00", checkOut:"16:00" },
  { studentId:"S008", date:fmt(today),     status:"half-day", checkIn:"09:00", checkOut:"12:30", remarks:"Doctor appointment" },
  { studentId:"S009", date:fmt(today),     status:"present",  checkIn:"09:05", checkOut:"16:00" },
  { studentId:"S010", date:fmt(today),     status:"absent" },
  { studentId:"S011", date:fmt(today),     status:"present",  checkIn:"08:55", checkOut:"16:00" },
  { studentId:"S012", date:fmt(today),     status:"late",     checkIn:"09:25", checkOut:"16:00" },
  { studentId:"S001", date:fmt(yesterday), status:"present",  checkIn:"09:01", checkOut:"16:00" },
  { studentId:"S002", date:fmt(yesterday), status:"absent" },
  { studentId:"S003", date:fmt(yesterday), status:"present",  checkIn:"09:00", checkOut:"16:00" },
  { studentId:"S004", date:fmt(yesterday), status:"present",  checkIn:"09:00", checkOut:"16:00" },
  { studentId:"S005", date:fmt(yesterday), status:"late",     checkIn:"09:20", checkOut:"16:00" },
  { studentId:"S006", date:fmt(yesterday), status:"present",  checkIn:"09:00", checkOut:"16:00" },
  { studentId:"S007", date:fmt(yesterday), status:"present",  checkIn:"09:00", checkOut:"16:00" },
  { studentId:"S008", date:fmt(yesterday), status:"present",  checkIn:"09:02", checkOut:"16:00" },
  { studentId:"S009", date:fmt(yesterday), status:"absent" },
  { studentId:"S010", date:fmt(yesterday), status:"present",  checkIn:"09:00", checkOut:"16:00" },
  { studentId:"S001", date:fmt(dayBefore), status:"present",  checkIn:"09:00", checkOut:"16:00" },
  { studentId:"S002", date:fmt(dayBefore), status:"present",  checkIn:"09:00", checkOut:"16:00" },
  { studentId:"S003", date:fmt(dayBefore), status:"late",     checkIn:"09:30", checkOut:"16:00" },
];

const initLeaveRequests: LeaveRequest[] = [
  { id:"L001", studentId:"S006", studentName:"Ananya Reddy", class:"10", section:"A", fromDate:fmt(today),     toDate:fmt(today),     reason:"Family function",   status:"approved" },
  { id:"L002", studentId:"S010", studentName:"Myra Chauhan", class:"12", section:"B", fromDate:fmt(today),     toDate:fmt(today),     reason:"Not feeling well",  status:"pending" },
  { id:"L003", studentId:"S001", studentName:"Aarav Sharma", class:"10", section:"A", fromDate:"2024-06-20",   toDate:"2024-06-21",   reason:"Vacation",          status:"approved" },
  { id:"L004", studentId:"S005", studentName:"Diya Gupta",   class:"10", section:"A", fromDate:"2024-06-18",   toDate:"2024-06-18",   reason:"Doctor appointment",status:"rejected" },
  { id:"L005", studentId:"S003", studentName:"Aditya Kumar", class:"10", section:"A", fromDate:fmt(today),     toDate:fmt(today),     reason:"Personal reason",   status:"pending" },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root {
  --bg-app:#f8fafc; --bg-panel:#ffffff; --bg-panel2:#fafafa; --bg-hover:#f5f3ff;
  --border:rgba(0,0,0,.06); --border2:#f1f5f9; --text-main:#0f172a; --text-sub:#64748b;
  --text-muted:#94a3b8; --shadow:0 2px 12px rgba(0,0,0,.05); --shadow2:0 12px 32px rgba(0,0,0,.10);
  --bar-bg:#f1f5f9; --prog-bg:#f1f5f9; --tip-bg:#ffffff; --lb-bg:#f1f5f9;
  --course-bg:#fafafa; --course-hover:#ffffff; --rec-border:#f1f5f9;
  --btn-bg:#ffffff; --btn-text:#374151; --btn-hover:#f5f3ff; --btn-htext:#6366f1;
  --table-hover:#f8fafc; --input-bg:#f8fafc;
}
[data-theme="dark"] {
  --bg-app:#0b1120; --bg-panel:#141f35; --bg-panel2:#1a2540; --bg-hover:rgba(99,102,241,.15);
  --border:rgba(255,255,255,.07); --border2:rgba(255,255,255,.06); --text-main:#f1f5f9;
  --text-sub:#94a3b8; --text-muted:#64748b; --shadow:0 2px 12px rgba(0,0,0,.3);
  --shadow2:0 12px 32px rgba(0,0,0,.45); --bar-bg:rgba(255,255,255,.07);
  --prog-bg:rgba(255,255,255,.07); --tip-bg:#1a2540; --lb-bg:rgba(255,255,255,.07);
  --course-bg:rgba(255,255,255,.03); --course-hover:rgba(255,255,255,.05);
  --rec-border:rgba(255,255,255,.07); --btn-bg:rgba(255,255,255,.06); --btn-text:#94a3b8;
  --btn-hover:rgba(99,102,241,.18); --btn-htext:#a5b4fc; --table-hover:rgba(255,255,255,.03);
  --input-bg:#1a2540;
}

.am-root {
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  color:var(--text-main);
  transition:background .3s ease, color .3s ease;
}

/* ── Hero ── */
.am-hero {
  margin:20px 28px 0; border-radius:20px; padding:18px 28px;
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  position:relative; overflow:hidden; color:#fff;
  box-shadow:0 6px 24px rgba(99,102,241,.26);
  animation:heroIn .55s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes heroIn{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}
.am-hero::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none;}
.am-hero::after{content:'';position:absolute;bottom:-50px;left:30%;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none;}
.am-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.am-hero-left{display:flex;align-items:center;gap:14px;}
.am-hero-icon{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.25);border:2px solid rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.am-hero-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;margin-bottom:5px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);font-size:10.5px;font-weight:700;color:#fff;}
.am-hero-title{font-size:clamp(16px,2.2vw,22px);font-weight:800;color:#fff;margin-bottom:2px;letter-spacing:-.2px;line-height:1.2;}
.am-hero-sub{font-size:12px;color:rgba(255,255,255,.68);line-height:1.4;}
.am-hero-right{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.am-hstat{text-align:center;padding:8px 14px;border-radius:12px;min-width:58px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(8px);transition:transform .2s;}
.am-hstat:hover{transform:translateY(-2px);}
.am-hstat-n{font-size:18px;font-weight:800;color:#fff;line-height:1;}
.am-hstat-l{font-size:9.5px;color:rgba(255,255,255,.62);margin-top:1px;}
.am-hero-btn{padding:9px 18px;background:#fff;color:#6366f1;border:none;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;flex-shrink:0;transition:all .2s;box-shadow:0 3px 12px rgba(0,0,0,.15);white-space:nowrap;}
.am-hero-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.2);background:#f5f3ff;}
.am-hero-date{font-size:12px;color:rgba(255,255,255,.7);background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:4px 12px;white-space:nowrap;}

/* ── Nav Tabs ── */
.am-nav{display:flex;gap:4px;padding:16px 28px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;}
.am-nav::-webkit-scrollbar{display:none;}
.am-nav-btn{
  padding:8px 16px;border-radius:12px;border:1.5px solid var(--border);
  background:var(--bg-panel);font-family:inherit;font-size:12.5px;font-weight:600;
  color:var(--text-sub);cursor:pointer;transition:all .18s;white-space:nowrap;
  display:flex;align-items:center;gap:6px;
}
.am-nav-btn:hover{border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,.06);}
.am-nav-btn.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(99,102,241,.3);}
.am-nav-badge{font-size:10px;font-weight:800;padding:1px 6px;border-radius:8px;background:rgba(239,68,68,.2);color:#ef4444;}
.am-nav-btn.on .am-nav-badge{background:rgba(255,255,255,.25);color:#fff;}

/* ── Stats Grid ── */
.am-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;padding:20px 28px 0;}
.am-scard{
  background:var(--bg-panel);border-radius:20px;padding:18px;
  border:1px solid var(--border);box-shadow:var(--shadow);
  transition:all .28s cubic-bezier(.4,0,.2,1);
  animation:scardIn .5s cubic-bezier(.34,1.56,.64,1) both;
  position:relative;overflow:hidden;
}
@keyframes scardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.am-scard:hover{transform:translateY(-6px) scale(1.01);box-shadow:var(--shadow2);}
.am-scard.blue   {border-top:3px solid #6366f1;}
.am-scard.green  {border-top:3px solid #10b981;}
.am-scard.red    {border-top:3px solid #ef4444;}
.am-scard.amber  {border-top:3px solid #f59e0b;}
.am-scard.purple {border-top:3px solid #8b5cf6;}
.am-scard.rose   {border-top:3px solid #ec4899;}
.am-scard-icon{width:36px;height:36px;border-radius:10px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;font-size:16px;}
.am-scard.blue   .am-scard-icon{background:rgba(99,102,241,.1);}
.am-scard.green  .am-scard-icon{background:rgba(16,185,129,.1);}
.am-scard.red    .am-scard-icon{background:rgba(239,68,68,.1);}
.am-scard.amber  .am-scard-icon{background:rgba(245,158,11,.1);}
.am-scard.purple .am-scard-icon{background:rgba(139,92,246,.1);}
.am-scard.rose   .am-scard-icon{background:rgba(236,72,153,.1);}
.am-scard-n{font-size:26px;font-weight:800;color:var(--text-main);letter-spacing:-1px;line-height:1;}
.am-scard-l{font-size:11.5px;color:var(--text-sub);margin-top:3px;font-weight:500;}
.am-scard-sub{font-size:10.5px;color:#10b981;margin-top:5px;font-weight:600;}

/* ── Body ── */
.am-body{padding:20px 28px 80px;}

/* ── Panel ── */
.am-panel{background:var(--bg-panel);border-radius:20px;border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;transition:background .3s,border-color .3s;}
.am-panel-head{padding:18px 22px 14px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.am-panel-title{font-size:15px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:8px;}
.am-panel-sub{font-size:12.5px;color:var(--text-sub);margin-top:3px;}
.am-panel-body{padding:20px 22px;}
.am-view-all{font-size:12.5px;font-weight:600;color:#6366f1;border:none;background:none;cursor:pointer;font-family:inherit;padding:6px 12px;border-radius:8px;transition:background .15s;}
.am-view-all:hover{background:rgba(99,102,241,.08);}

/* ── Grid Layouts ── */
.am-2col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
.am-3col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;}
.am-main-grid{display:grid;grid-template-columns:1fr 360px;gap:16px;margin-bottom:16px;}

/* ── Filters ── */
.am-filters-bar{background:var(--bg-panel);border-radius:16px;padding:16px 20px;border:1px solid var(--border);box-shadow:var(--shadow);margin-bottom:16px;}
.am-filters-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;align-items:end;}
.am-filter-group{display:flex;flex-direction:column;gap:5px;}
.am-filter-label{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;}
.am-filter-select,.am-filter-input{
  padding:8px 12px;border-radius:10px;border:1.5px solid var(--border2);
  background:var(--input-bg);color:var(--text-main);font-family:inherit;
  font-size:13px;appearance:none;-webkit-appearance:none;outline:none;transition:border-color .2s;
}
.am-filter-select:focus,.am-filter-input:focus{border-color:#6366f1;}
.am-search-wrap{position:relative;}
.am-search-icon{position:absolute;top:50%;right:10px;transform:translateY(-50%);color:var(--text-muted);pointer-events:none;font-size:14px;}
.am-btn{
  padding:8px 16px;border-radius:10px;border:1.5px solid var(--border2);
  background:var(--btn-bg);color:var(--btn-text);font-family:inherit;
  font-size:12.5px;font-weight:600;cursor:pointer;transition:all .18s;
  display:inline-flex;align-items:center;gap:6px;white-space:nowrap;
}
.am-btn:hover{background:var(--btn-hover);color:var(--btn-htext);border-color:#6366f1;}
.am-btn.primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(99,102,241,.3);}
.am-btn.primary:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(99,102,241,.4);}
.am-btn.danger{background:rgba(239,68,68,.08);color:#dc2626;border-color:rgba(239,68,68,.2);}
.am-btn.danger:hover{background:rgba(239,68,68,.15);border-color:#ef4444;}
.am-btn.success{background:rgba(16,185,129,.08);color:#059669;border-color:rgba(16,185,129,.2);}
.am-btn.success:hover{background:rgba(16,185,129,.15);border-color:#10b981;}
.am-btn:disabled{opacity:.5;cursor:not-allowed;transform:none !important;}

/* ── Table ── */
.am-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;}
.am-table{width:100%;border-collapse:collapse;min-width:700px;}
.am-th{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);padding:12px 16px;text-align:left;border-bottom:1px solid var(--border2);cursor:pointer;user-select:none;white-space:nowrap;}
.am-th:hover{color:#6366f1;}
.am-sort-icon{margin-left:4px;opacity:.5;}
.am-tr{transition:background .15s;cursor:pointer;}
.am-tr:hover{background:var(--table-hover);}
.am-tr.selected{background:rgba(99,102,241,.06);}
.am-td{padding:13px 16px;font-size:13.5px;color:var(--text-main);border-bottom:1px solid var(--border2);}
.am-td:last-child{border-bottom:none;}
.am-tr:last-child .am-td{border-bottom:none;}
.am-student-cell{display:flex;align-items:center;gap:11px;}
.am-student-photo{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--border2);}
.am-student-name{font-weight:700;font-size:13.5px;}
.am-student-roll{font-size:11px;color:var(--text-muted);margin-top:1px;}
.am-status-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;}
.am-status-present  {background:rgba(34,197,94,.1); color:#16a34a;}
.am-status-absent   {background:rgba(239,68,68,.1);  color:#dc2626;}
.am-status-late     {background:rgba(249,115,22,.1); color:#ea580c;}
.am-status-leave    {background:rgba(59,130,246,.1); color:#2563eb;}
.am-status-half-day {background:rgba(139,92,246,.1); color:#7c3aed;}
.am-status-pending  {background:rgba(245,158,11,.1); color:#d97706;}
.am-status-approved {background:rgba(16,185,129,.1); color:#059669;}
.am-status-rejected {background:rgba(239,68,68,.1);  color:#dc2626;}
[data-theme="dark"] .am-status-present  {background:rgba(34,197,94,.18);color:#4ade80;}
[data-theme="dark"] .am-status-absent   {background:rgba(239,68,68,.18);color:#f87171;}
[data-theme="dark"] .am-status-late     {background:rgba(249,115,22,.18);color:#fb923c;}
[data-theme="dark"] .am-status-leave    {background:rgba(59,130,246,.18);color:#60a5fa;}
[data-theme="dark"] .am-status-half-day {background:rgba(139,92,246,.18);color:#a78bfa;}
.am-action-btn{width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:13px;transition:all .15s;margin-right:3px;font-family:inherit;}
.am-action-present{background:rgba(34,197,94,.1);color:#16a34a;}
.am-action-present:hover{background:rgba(34,197,94,.25);}
.am-action-absent{background:rgba(239,68,68,.1);color:#dc2626;}
.am-action-absent:hover{background:rgba(239,68,68,.25);}
.am-action-late{background:rgba(249,115,22,.1);color:#ea580c;}
.am-action-late:hover{background:rgba(249,115,22,.25);}
.am-action-leave{background:rgba(59,130,246,.1);color:#2563eb;}
.am-action-leave:hover{background:rgba(59,130,246,.25);}
.am-action-halfday{background:rgba(139,92,246,.1);color:#7c3aed;}
.am-action-halfday:hover{background:rgba(139,92,246,.25);}
.am-table-controls{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.am-btn-group{display:flex;gap:6px;flex-wrap:wrap;}
.am-pagination{display:flex;align-items:center;gap:6px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;}
.am-page-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--border2);background:var(--btn-bg);color:var(--text-sub);cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.am-page-btn:hover{border-color:#6366f1;color:#6366f1;}
.am-page-btn.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;}
.am-page-info{font-size:12.5px;color:var(--text-sub);font-weight:500;}

/* ── Calendar ── */
.am-cal{padding:0 4px;}
.am-cal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;}
.am-cal-title{font-size:15px;font-weight:800;color:var(--text-main);}
.am-cal-nav{display:flex;gap:6px;}
.am-cal-nav-btn{width:30px;height:30px;border-radius:9px;border:1.5px solid var(--border2);background:var(--btn-bg);color:var(--text-sub);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.am-cal-nav-btn:hover{border-color:#6366f1;color:#6366f1;}
.am-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
.am-cal-day-header{font-size:10.5px;font-weight:700;color:var(--text-muted);text-align:center;padding:6px 0;text-transform:uppercase;}
.am-cal-cell{border-radius:8px;padding:6px 4px;min-height:48px;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:all .15s;position:relative;background:var(--input-bg);}
.am-cal-cell:hover{background:var(--bg-hover);transform:scale(1.05);}
.am-cal-cell.empty{background:transparent;cursor:default;}
.am-cal-cell.today{outline:2px solid #6366f1;outline-offset:-1px;}
.am-cal-cell.selected{background:rgba(99,102,241,.12);}
.am-cal-cell.weekend .am-cal-num{color:#ef4444;}
.am-cal-num{font-size:12px;font-weight:700;color:var(--text-main);line-height:1;}
.am-cal-dot{width:6px;height:6px;border-radius:50%;margin-top:3px;}
.am-cal-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;}
.am-cal-legend-item{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--text-sub);}
.am-cal-legend-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

/* ── Drawer ── */
.am-drawer-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;backdrop-filter:blur(2px);}
.am-drawer{position:fixed;top:0;right:0;width:420px;max-width:95vw;height:100%;background:var(--bg-panel);box-shadow:-10px 0 40px rgba(0,0,0,.15);z-index:101;overflow-y:auto;}
.am-drawer-head{padding:20px 24px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg-panel);z-index:1;}
.am-drawer-title{font-size:17px;font-weight:800;color:var(--text-main);}
.am-drawer-close{width:32px;height:32px;border-radius:10px;border:1.5px solid var(--border2);background:var(--btn-bg);cursor:pointer;color:var(--text-sub);font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.am-drawer-close:hover{background:rgba(239,68,68,.1);color:#dc2626;border-color:rgba(239,68,68,.2);}
.am-drawer-body{padding:20px 24px;display:flex;flex-direction:column;gap:20px;}
.am-drawer-section{background:var(--bg-panel2);border-radius:14px;padding:16px;border:1px solid var(--border);}
.am-drawer-section-title{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:12px;}
.am-drawer-profile{display:flex;align-items:center;gap:14px;}
.am-drawer-avatar{width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--border2);flex-shrink:0;}
.am-drawer-info-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border2);font-size:13px;}
.am-drawer-info-row:last-child{border-bottom:none;}
.am-drawer-info-label{color:var(--text-sub);font-weight:500;}
.am-drawer-info-val{color:var(--text-main);font-weight:700;}
.am-perf-bar{height:6px;background:var(--prog-bg);border-radius:6px;overflow:hidden;margin-top:4px;}
.am-perf-fill{height:100%;border-radius:6px;}

/* ── Modal ── */
.am-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px);}
.am-modal{width:100%;max-width:480px;background:var(--bg-panel);border-radius:20px;box-shadow:var(--shadow2);overflow:hidden;}
.am-modal-head{padding:20px 24px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;}
.am-modal-title{font-size:16px;font-weight:800;color:var(--text-main);}
.am-modal-body{padding:20px 24px;display:flex;flex-direction:column;gap:14px;}
.am-modal-footer{padding:16px 24px;border-top:1px solid var(--border2);display:flex;gap:10px;justify-content:flex-end;}
.am-textarea{width:100%;min-height:110px;padding:12px;border-radius:12px;border:1.5px solid var(--border2);background:var(--input-bg);color:var(--text-main);font-family:inherit;font-size:13.5px;resize:vertical;outline:none;transition:border-color .2s;}
.am-textarea:focus{border-color:#6366f1;}

/* ── Chart Tooltip ── */
.am-tip{background:var(--tip-bg);border:1px solid var(--border);border-radius:10px;padding:8px 12px;box-shadow:0 4px 16px rgba(0,0,0,.1);font-size:12px;font-weight:600;}
.am-tip-label{color:var(--text-sub);margin-bottom:3px;}
.am-tip-val{color:#6366f1;}

/* ── Alert Banner ── */
.am-alert{border-radius:14px;padding:14px 18px;border-left:4px solid;display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;}
.am-alert.warn{background:rgba(245,158,11,.08);border-color:#f59e0b;}
.am-alert.danger{background:rgba(239,68,68,.08);border-color:#ef4444;}
[data-theme="dark"] .am-alert.warn{background:rgba(245,158,11,.12);}
[data-theme="dark"] .am-alert.danger{background:rgba(239,68,68,.12);}
.am-alert-icon{font-size:18px;flex-shrink:0;margin-top:1px;}
.am-alert-title{font-size:13.5px;font-weight:700;color:var(--text-main);margin-bottom:2px;}
.am-alert-text{font-size:12px;color:var(--text-sub);}

/* ── Progress ring ── */
.am-ring-wrap{position:relative;width:70px;height:70px;margin:0 auto;}
.am-ring-wrap svg{width:70px;height:70px;transform:rotate(-90deg);}
.am-ring-bg{fill:none;stroke:var(--prog-bg);stroke-width:5;}
.am-ring-fill{fill:none;stroke-width:5;stroke-linecap:round;transition:stroke-dashoffset 1s cubic-bezier(.4,0,.2,1);}
.am-ring-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;}

/* ── Section Title ── */
.am-section-title{font-size:12.5px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
.am-section-title::after{content:'';flex:1;height:1px;background:var(--border);}

/* ── Notification Bell ── */
.am-bell-wrap{position:relative;cursor:pointer;}
.am-bell-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;}

/* ── Toast ── */
.am-toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.15);font-size:13.5px;font-weight:600;z-index:300;display:flex;align-items:center;gap:10px;max-width:320px;}
.am-toast.success{background:linear-gradient(135deg,#10b981,#059669);color:#fff;}
.am-toast.error{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;}
.am-toast.info{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;}

/* ── Recharts dark mode ── */
[data-theme="dark"] .recharts-cartesian-grid line{stroke:rgba(255,255,255,.06);}
[data-theme="dark"] .recharts-text{fill:#64748b;}

/* ── Empty state ── */
.am-empty{text-align:center;padding:40px 20px;color:var(--text-muted);}
.am-empty-icon{font-size:40px;margin-bottom:12px;}
.am-empty-text{font-size:14px;font-weight:600;}
.am-empty-sub{font-size:12.5px;margin-top:5px;}

/* ── Leave card ── */
.am-leave-item{border-radius:14px;padding:14px 16px;border:1.5px solid var(--border2);margin-bottom:10px;transition:all .2s;}
.am-leave-item:last-child{margin-bottom:0;}
.am-leave-item:hover{border-color:#c7d2fe;box-shadow:0 4px 12px rgba(99,102,241,.1);}
.am-leave-item-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px;}
.am-leave-item-name{font-size:13.5px;font-weight:700;color:var(--text-main);}
.am-leave-item-meta{font-size:12px;color:var(--text-sub);margin-top:2px;}
.am-leave-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;}

/* ── Analytics card ── */
.am-analytics-num{font-size:38px;font-weight:800;letter-spacing:-2px;line-height:1;color:var(--text-main);}
.am-analytics-suf{font-size:18px;font-weight:700;color:#6366f1;margin-left:2px;}
.am-analytics-label{font-size:12px;color:var(--text-muted);margin-top:4px;}
.am-stack{height:12px;border-radius:12px;overflow:hidden;display:flex;gap:0;margin:12px 0 8px;}
.am-stack-seg{height:100%;transition:flex .9s cubic-bezier(.4,0,.2,1);}
.am-legend{display:flex;flex-wrap:wrap;gap:6px 14px;}
.am-legend-item{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:var(--text-sub);}
.am-legend-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

/* ── Responsive ── */
@media(max-width:1200px){
  .am-stats{grid-template-columns:repeat(3,1fr);}
  .am-3col{grid-template-columns:1fr 1fr;}
  .am-main-grid{grid-template-columns:1fr 320px;}
}
@media(max-width:1024px){
  .am-main-grid{grid-template-columns:1fr;}
  .am-2col{grid-template-columns:1fr;}
  .am-3col{grid-template-columns:1fr 1fr;}
}
@media(max-width:900px){
  .am-hero{margin:12px 16px 0;padding:14px 18px;}
  .am-stats{padding:12px 16px 0;grid-template-columns:repeat(3,1fr);}
  .am-nav{padding:12px 16px 0;}
  .am-body{padding:12px 16px 80px;}
}
@media(max-width:768px){
  .am-hero{margin:10px 12px 0;border-radius:16px;}
  .am-hero-right .am-hstat:nth-child(3),.am-hero-right .am-hstat:nth-child(4){display:none;}
  .am-stats{grid-template-columns:repeat(2,1fr);padding:10px 12px 0;}
  .am-body{padding:10px 12px 80px;}
  .am-3col{grid-template-columns:1fr;}
  .am-filters-grid{grid-template-columns:repeat(2,1fr);}
  .am-drawer{width:100%;border-radius:20px 20px 0 0;top:auto;bottom:0;height:90vh;}
}
@media(max-width:600px){
  .am-hero-right{display:none;}
  .am-hero{margin:10px 10px 0;}
  .am-stats{padding:10px 10px 0;gap:9px;grid-template-columns:repeat(2,1fr);}
  .am-body{padding:10px 10px 80px;}
  .am-nav{padding:10px 10px 0;}
  .am-scard-n{font-size:22px;}
  .am-filters-grid{grid-template-columns:1fr;}
  .am-table-controls{flex-direction:column;align-items:flex-start;}
  .am-2col{grid-template-columns:1fr;}
}
@media(max-width:480px){
  .am-stats{grid-template-columns:repeat(2,1fr);}
  .am-scard{padding:13px;border-radius:15px;}
  .am-scard-n{font-size:20px;}
  .am-hero{padding:12px 14px;}
}
`;

// ─── Sub-components ───────────────────────────────────────────────────────────
function AnimNum({ target, suffix="" }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = () => { cur += target / 55; if (cur < target) { setV(Math.floor(cur)); requestAnimationFrame(step); } else setV(target); };
    requestAnimationFrame(step);
  }, [target]);
  return <>{v}{suffix}</>;
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="am-tip">
      <div className="am-tip-label">{label}</div>
      <div className="am-tip-val">{payload[0].value}</div>
    </div>
  );
}

function Toast({ msg, type, onClose }: { msg: string; type: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div className={`am-toast ${type}`} initial={{ opacity: 0, y: 20, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}>
      {type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"} {msg}
    </motion.div>
  );
}

// ─── Calendar Component ───────────────────────────────────────────────────────
function AttendanceCalendar({ selectedDate, onSelect, records }: { selectedDate: string; onSelect: (d: string) => void; records: AttendanceRecord[]; }) {
  const [display, setDisplay] = useState(() => new Date(selectedDate));
  const year = display.getFullYear(), month = display.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = fmt(new Date());
  const cells: (string | null)[] = [...Array(firstDay).fill(null)];
  for (let i = 1; i <= daysInMonth; i++) cells.push(fmt(new Date(year, month, i)));

  const statusMap = useMemo(() => {
    const m: Record<string, string> = {};
    records.forEach(r => { if (!m[r.date] || r.status === "present") m[r.date] = r.status; });
    return m;
  }, [records]);

  const dotColor: Record<string, string> = { present: "#10b981", absent: "#ef4444", late: "#f97316", leave: "#3b82f6", "half-day": "#8b5cf6" };

  return (
    <div className="am-cal">
      <div className="am-cal-header">
        <div className="am-cal-title">{display.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
        <div className="am-cal-nav">
          <button className="am-cal-nav-btn" onClick={() => setDisplay(new Date(year, month - 1, 1))}>‹</button>
          <button className="am-cal-nav-btn" onClick={() => setDisplay(new Date(year, month + 1, 1))}>›</button>
        </div>
      </div>
      <div className="am-cal-grid">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="am-cal-day-header">{d}</div>)}
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="am-cal-cell empty" />;
          const dow = new Date(date).getDay();
          const st = statusMap[date];
          return (
            <div key={date} className={`am-cal-cell ${date === todayStr ? "today" : ""} ${date === selectedDate ? "selected" : ""} ${dow === 0 || dow === 6 ? "weekend" : ""}`} onClick={() => onSelect(date)}>
              <span className="am-cal-num">{new Date(date).getDate()}</span>
              {st && <div className="am-cal-dot" style={{ background: dotColor[st] || "#94a3b8" }} />}
            </div>
          );
        })}
      </div>
      <div className="am-cal-legend">
        {Object.entries(dotColor).map(([k, v]) => (
          <div key={k} className="am-cal-legend-item">
            <div className="am-cal-legend-dot" style={{ background: v }} />
            {k.replace("-", " ")}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Student Drawer ───────────────────────────────────────────────────────────
function StudentDrawer({ student, records, leaves, onClose, onNotify }: { student: Student; records: AttendanceRecord[]; leaves: LeaveRequest[]; onClose: () => void; onNotify: () => void; }) {
  const history = records.filter(r => r.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const present = records.filter(r => r.studentId === student.id && r.status === "present").length;
  const total = records.filter(r => r.studentId === student.id).length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const studentLeaves = leaves.filter(l => l.studentId === student.id);

  const chartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      const ds = fmt(d);
      const r = records.find(r => r.studentId === student.id && r.date === ds);
      return { day: d.toLocaleDateString("en-US", { weekday: "short" }), val: r?.status === "present" ? 1 : r?.status === "late" ? 0.5 : r ? 0 : null };
    });
  }, [student, records]);

  const r = 28, circ = 2 * Math.PI * r;

  return (
    <>
      <motion.div className="am-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="am-drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 280, damping: 28 }}>
        <div className="am-drawer-head">
          <div className="am-drawer-title">Student Profile</div>
          <button className="am-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="am-drawer-body">
          {/* Profile */}
          <div className="am-drawer-section">
            <div className="am-drawer-profile" style={{ marginBottom: 14 }}>
              <img src={student.photo} alt={student.name} className="am-drawer-avatar" />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>{student.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 2 }}>Roll #{student.rollNumber} · Class {student.class}-{student.section}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <span className={`am-status-badge am-status-${pct >= 85 ? "present" : pct >= 70 ? "late" : "absent"}`}>{pct >= 85 ? "Good" : pct >= 70 ? "Average" : "At Risk"}</span>
                </div>
              </div>
            </div>
            {[["Email", student.email], ["Parent", student.parentName], ["Contact", student.parentContact]].map(([l, v]) => (
              <div key={l} className="am-drawer-info-row"><span className="am-drawer-info-label">{l}</span><span className="am-drawer-info-val">{v}</span></div>
            ))}
          </div>

          {/* Attendance Rate */}
          <div className="am-drawer-section">
            <div className="am-drawer-section-title">Attendance Rate</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="am-ring-wrap">
                <svg viewBox="0 0 70 70">
                  <circle className="am-ring-bg" cx="35" cy="35" r={r} />
                  <circle className="am-ring-fill" cx="35" cy="35" r={r} stroke={pct >= 85 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444"} strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} />
                </svg>
                <div className="am-ring-label" style={{ color: pct >= 85 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444" }}>{pct}%</div>
              </div>
              <div style={{ flex: 1 }}>
                {[["Present", present, "#10b981"], ["Total Days", total, "#6366f1"], ["Leaves", studentLeaves.filter(l => l.status !== "rejected").length, "#3b82f6"]].map(([l, v, c]) => (
                  <div key={l as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-sub)" }}>{l}</span>
                    <span style={{ color: c as string, fontWeight: 800 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 14-day trend */}
          <div className="am-drawer-section">
            <div className="am-drawer-section-title">14-Day Trend</div>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={chartData} barSize={14}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [v === 1 ? "Present" : v === 0.5 ? "Late" : "Absent"]} />
                <Bar dataKey="val" radius={4}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.val === 1 ? "#10b981" : entry.val === 0.5 ? "#f59e0b" : entry.val === 0 ? "#ef4444" : "#e2e8f0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Academic Performance */}
          <div className="am-drawer-section">
            <div className="am-drawer-section-title">Academic Performance</div>
            {[["Math", student.academicPerformance.math, "#6366f1"], ["Science", student.academicPerformance.science, "#10b981"], ["English", student.academicPerformance.english, "#f59e0b"]].map(([s, p, c]) => (
              <div key={s as string} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-sub)" }}>{s}</span>
                  <span style={{ color: c as string, fontWeight: 800 }}>{p}%</span>
                </div>
                <div className="am-perf-bar"><motion.div className="am-perf-fill" style={{ background: c as string, width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: .8 }} /></div>
              </div>
            ))}
          </div>

          {/* Recent History */}
          <div className="am-drawer-section">
            <div className="am-drawer-section-title">Recent Attendance</div>
            {history.length === 0 ? <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No records</div> : history.map(r => (
              <div key={r.date} className="am-drawer-info-row">
                <span className="am-drawer-info-label">{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className={`am-status-badge am-status-${r.status}`}>{r.status}{r.checkIn ? ` · ${r.checkIn}` : ""}</span>
              </div>
            ))}
          </div>

          {/* Leave History */}
          {studentLeaves.length > 0 && (
            <div className="am-drawer-section">
              <div className="am-drawer-section-title">Leave Records</div>
              {studentLeaves.map(l => (
                <div key={l.id} className="am-drawer-info-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-main)" }}>{l.fromDate} → {l.toDate}</div>
                  <div style={{ fontSize: 12, color: "var(--text-sub)" }}>{l.reason}</div>
                  <span className={`am-status-badge am-status-${l.status}`}>{l.status}</span>
                </div>
              ))}
            </div>
          )}

          <button className="am-btn primary" style={{ width: "100%" }} onClick={onNotify}>📧 Notify Parent</button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AttendanceDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [records, setRecords] = useState<AttendanceRecord[]>(initAttendance);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initLeaveRequests);
  const [selectedDate, setSelectedDate] = useState(fmt(today));
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [filters, setFilters] = useState({ class: "all", section: "all", status: "all", search: "" });
  const [page, setPage] = useState(1);
  const rowsPerPage = 8;
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [notifyStudent, setNotifyStudent] = useState<Student | null>(null);
  const [notifyMsg, setNotifyMsg] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [lbPeriod, setLbPeriod] = useState("today");

  const showToast = (msg: string, type = "success") => { setToast({ msg, type }); };

  // ── Computed stats ──────────────────────────────────────────────────────────
  const todayRecords = useMemo(() => records.filter(r => r.date === selectedDate), [records, selectedDate]);
  const total = mockStudents.length;
  const presentCount = todayRecords.filter(r => r.status === "present").length;
  const absentCount = total - todayRecords.length + todayRecords.filter(r => r.status === "absent").length;
  const lateCount = todayRecords.filter(r => r.status === "late").length;
  const leaveCount = todayRecords.filter(r => r.status === "leave").length;
  const halfCount = todayRecords.filter(r => r.status === "half-day").length;
  const attendancePct = Math.round((presentCount / (total - leaveCount || 1)) * 100);
  const pendingLeaves = leaves.filter(l => l.status === "pending").length;

  // ── Filtered + sorted students ──────────────────────────────────────────────
  const studentsWithAtt = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    todayRecords.forEach(r => map.set(r.studentId, r));
    return mockStudents.map(s => ({ ...s, att: map.get(s.id) || { studentId: s.id, date: selectedDate, status: "absent" as const } }));
  }, [todayRecords, selectedDate]);

  const filtered = useMemo(() => studentsWithAtt.filter(s => {
    const cm = filters.class === "all" || s.class === filters.class;
    const sm = filters.section === "all" || s.section === filters.section;
    const stm = filters.status === "all" || s.att.status === filters.status;
    const qm = filters.search === "" || s.name.toLowerCase().includes(filters.search.toLowerCase()) || s.rollNumber.includes(filters.search);
    return cm && sm && stm && qm;
  }), [studentsWithAtt, filters]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = sort.key === "status" ? a.att.status : (a as any)[sort.key];
    const bv = sort.key === "status" ? b.att.status : (b as any)[sort.key];
    return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  }), [filtered, sort]);

  const paginated = useMemo(() => sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage), [sorted, sort, page]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));

  const toggleSort = (key: string) => setSort(s => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  // ── Attendance actions ──────────────────────────────────────────────────────
  const updateAtt = useCallback((studentId: string, status: AttendanceRecord["status"], e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecords(prev => {
      const filtered = prev.filter(r => !(r.studentId === studentId && r.date === selectedDate));
      const rec: AttendanceRecord = { studentId, date: selectedDate, status };
      if (["present", "late", "half-day"].includes(status)) rec.checkIn = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      return [...filtered, rec];
    });
    showToast(`Marked ${status}`, "success");
  }, [selectedDate]);

  const markAll = (status: AttendanceRecord["status"]) => {
    setRecords(prev => {
      const other = prev.filter(r => r.date !== selectedDate);
      const newRecs = mockStudents.map(s => {
        const rec: AttendanceRecord = { studentId: s.id, date: selectedDate, status };
        if (["present", "late", "half-day"].includes(status)) rec.checkIn = "09:00";
        return rec;
      });
      return [...other, ...newRecs];
    });
    showToast(`All students marked as ${status}`, "success");
  };

  // ── Charts data ─────────────────────────────────────────────────────────────
  const weeklyData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = fmt(d);
    const dayRecs = records.filter(r => r.date === ds);
    return { day: d.toLocaleDateString("en-US", { weekday: "short" }), present: dayRecs.filter(r => r.status === "present").length, absent: dayRecs.filter(r => r.status === "absent").length, late: dayRecs.filter(r => r.status === "late").length };
  }), [records]);

  const pieData = [
    { name: "Present", value: presentCount, color: "#10b981" },
    { name: "Absent", value: absentCount, color: "#ef4444" },
    { name: "Late", value: lateCount, color: "#f97316" },
    { name: "Leave", value: leaveCount, color: "#3b82f6" },
    { name: "Half Day", value: halfCount, color: "#8b5cf6" },
  ].filter(d => d.value > 0);

  const classwiseData = useMemo(() => {
    const cls: Record<string, { present: number; total: number }> = {};
    mockStudents.forEach(s => {
      const k = `Class ${s.class}-${s.section}`;
      if (!cls[k]) cls[k] = { present: 0, total: 0 };
      cls[k].total++;
      const att = todayRecords.find(r => r.studentId === s.id);
      if (att?.status === "present") cls[k].present++;
    });
    return Object.entries(cls).map(([name, d]) => ({ name, pct: Math.round((d.present / d.total) * 100) }));
  }, [todayRecords]);

  const monthlyTrendData = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const ds = fmt(d);
    const dayRecs = records.filter(r => r.date === ds);
    const p = dayRecs.filter(r => r.status === "present").length;
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, pct: dayRecs.length > 0 ? Math.round((p / mockStudents.length) * 100) : 0 };
  }), [records]);

  // ── Low attendance alerts ───────────────────────────────────────────────────
  const lowAttStudents = useMemo(() => mockStudents.filter(s => {
    const sRecs = records.filter(r => r.studentId === s.id);
    const p = sRecs.filter(r => r.status === "present").length;
    return sRecs.length > 0 && (p / sRecs.length) < 0.7;
  }), [records]);

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const tabs = [
    { id: "overview",   label: "Overview",   icon: "📊" },
    { id: "attendance", label: "Attendance",  icon: "✅" },
    { id: "calendar",   label: "Calendar",    icon: "📅" },
    { id: "analytics",  label: "Analytics",   icon: "📈" },
    { id: "leaves",     label: "Leave",       icon: "📋", badge: pendingLeaves },
    { id: "alerts",     label: "Alerts",      icon: "🔔", badge: lowAttStudents.length },
  ];

  const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
  const chartAxis = isDark ? "#475569" : "#94a3b8";
  const chartGrid = isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)";

  return (
    <>
      <style>{CSS}</style>
      <div className="am-root">

        {/* ── Hero ── */}
        <div className="am-hero">
          <div className="am-hero-inner">
            <div className="am-hero-left">
              <div className="am-hero-icon">📋</div>
              <div>
                <div className="am-hero-pill">👨‍🏫 Attendance Management</div>
                <div className="am-hero-title">Attendance Dashboard</div>
                <div className="am-hero-sub">Real-time tracking · {mockStudents.length} students · {fmt(today)}</div>
              </div>
            </div>
            <div className="am-hero-right">
              {[
                { n: `${attendancePct}%`, l: "Rate" },
                { n: presentCount, l: "Present" },
                { n: absentCount, l: "Absent" },
                { n: pendingLeaves, l: "Pending" },
              ].map((s, i) => (
                <div className="am-hstat" key={i}>
                  <div className="am-hstat-n">{s.n}</div>
                  <div className="am-hstat-l">{s.l}</div>
                </div>
              ))}
              <div className="am-hero-date">📅 {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
            </div>
          </div>
        </div>

        {/* ── Nav Tabs ── */}
        <div className="am-nav">
          {tabs.map(t => (
            <button key={t.id} className={`am-nav-btn${activeTab === t.id ? " on" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
              {t.badge && t.badge > 0 ? <span className="am-nav-badge">{t.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* ── Stat Cards ── */}
        <div className="am-stats">
          {[
            { label: "Total Students", value: total,          cls: "blue",   icon: "👥", sub: "All enrolled" },
            { label: "Present Today",  value: presentCount,   cls: "green",  icon: "✅", sub: `${attendancePct}% rate` },
            { label: "Absent Today",   value: absentCount,    cls: "red",    icon: "❌", sub: `${Math.round(absentCount/total*100)}% absent` },
            { label: "Late Arrivals",  value: lateCount,      cls: "amber",  icon: "⏰", sub: "After 9:15 AM" },
            { label: "On Leave",       value: leaveCount,     cls: "purple", icon: "📁", sub: `${halfCount} half-day` },
            { label: "Attendance %",   value: attendancePct,  cls: "rose",   icon: "📈", sub: "Monthly avg 92%", suffix: "%" },
          ].map((s, i) => (
            <motion.div key={i} className={`am-scard ${s.cls}`} style={{ animationDelay: `${0.05 + i * 0.07}s` }}>
              <div className="am-scard-icon">{s.icon}</div>
              <div className="am-scard-n"><AnimNum target={s.value} suffix={(s as any).suffix || ""} /></div>
              <div className="am-scard-l">{s.label}</div>
              <div className="am-scard-sub">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="am-body">

          {/* ════ OVERVIEW TAB ════ */}
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Row 1: Weekly Trend + Pie */}
                <div className="am-2col">
                  <div className="am-panel">
                    <div className="am-panel-head">
                      <div><div className="am-panel-title">📊 Weekly Attendance Trend</div><div className="am-panel-sub">Present / Absent / Late over last 7 days</div></div>
                    </div>
                    <div className="am-panel-body">
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={weeklyData}>
                          <defs>
                            <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                          <XAxis dataKey="day" tick={{ fontSize: 11, fill: chartAxis }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: chartAxis }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTip />} />
                          <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5} fill="url(#gPresent)" dot={{ fill: "#10b981", r: 4 }} />
                          <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} fill="url(#gAbsent)" dot={{ fill: "#ef4444", r: 3 }} />
                          <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} fill="none" dot={{ fill: "#f59e0b", r: 3 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                      <div className="am-legend" style={{ marginTop: 8 }}>
                        {[["Present", "#10b981"], ["Absent", "#ef4444"], ["Late", "#f59e0b"]].map(([l, c]) => (
                          <div key={l} className="am-legend-item"><div className="am-legend-dot" style={{ background: c }} />{l}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="am-panel">
                    <div className="am-panel-head"><div className="am-panel-title">🥧 Today's Distribution</div><div className="am-panel-sub">Status breakdown for {selectedDate}</div></div>
                    <div className="am-panel-body">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} innerRadius={38} dataKey="value" paddingAngle={2}>
                            {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: any, n: any) => [`${v} students`, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="am-legend" style={{ justifyContent: "center", marginTop: 8 }}>
                        {pieData.map(d => <div key={d.name} className="am-legend-item"><div className="am-legend-dot" style={{ background: d.color }} />{d.name} <strong style={{ color: "var(--text-main)" }}>{d.value}</strong></div>)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Class-wise + Overall rate */}
                <div className="am-2col">
                  <div className="am-panel">
                    <div className="am-panel-head"><div className="am-panel-title">🏫 Class-wise Attendance</div></div>
                    <div className="am-panel-body">
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={classwiseData} barSize={32}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartAxis }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: chartAxis }} axisLine={false} tickLine={false} domain={[0, 100]} />
                          <Tooltip formatter={(v: any) => [`${v}%`, "Attendance"]} />
                          <Bar dataKey="pct" radius={8}>
                            {classwiseData.map((d, i) => <Cell key={i} fill={d.pct >= 85 ? "#10b981" : d.pct >= 70 ? "#f59e0b" : "#ef4444"} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="am-panel">
                    <div className="am-panel-head"><div className="am-panel-title">🎯 Attendance Overview</div></div>
                    <div className="am-panel-body">
                      <div style={{ textAlign: "center", marginBottom: 16 }}>
                        <div className="am-analytics-num">{attendancePct}<span className="am-analytics-suf">%</span></div>
                        <div className="am-analytics-label">Today's attendance rate</div>
                      </div>
                      <div className="am-stack">
                        {pieData.map((d, i) => (
                          <motion.div key={i} className="am-stack-seg" style={{ background: d.color, flex: 0 }}
                            animate={{ flex: d.value }} transition={{ duration: 1, delay: i * .08 }} />
                        ))}
                      </div>
                      <div className="am-legend">
                        {pieData.map(d => <div key={d.name} className="am-legend-item"><div className="am-legend-dot" style={{ background: d.color }} />{d.name} <strong style={{ color: "var(--text-main)" }}>{Math.round(d.value / total * 100)}%</strong></div>)}
                      </div>
                      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[{ n: "92%", l: "Monthly Avg", c: "green" }, { n: "3", l: "Low Att.", c: "red" }, { n: pendingLeaves, l: "Pending", c: "amber" }, { n: `${lateCount}`, l: "Late Today", c: "purple" }].map((m, i) => (
                          <div key={i} style={{ padding: "10px 12px", borderRadius: 12, background: `rgba(${m.c === "green" ? "16,185,129" : m.c === "red" ? "239,68,68" : m.c === "amber" ? "245,158,11" : "139,92,246"},.08)`, textAlign: "center" }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: `var(--text-main)` }}>{m.n}</div>
                            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>{m.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alerts preview */}
                {lowAttStudents.length > 0 && (
                  <div className="am-panel" style={{ marginBottom: 16 }}>
                    <div className="am-panel-head"><div className="am-panel-title">⚠️ Attendance Alerts</div><button className="am-view-all" onClick={() => setActiveTab("alerts")}>View all →</button></div>
                    <div className="am-panel-body">
                      {lowAttStudents.slice(0, 3).map(s => {
                        const sr = records.filter(r => r.studentId === s.id);
                        const p = sr.filter(r => r.status === "present").length;
                        const pct = Math.round(p / sr.length * 100);
                        return (
                          <div key={s.id} className="am-alert danger" style={{ marginBottom: 8 }}>
                            <span className="am-alert-icon">⚠️</span>
                            <div>
                              <div className="am-alert-title">{s.name} — Low Attendance ({pct}%)</div>
                              <div className="am-alert-text">Roll #{s.rollNumber} · Class {s.class}-{s.section} · Parent: {s.parentName}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ════ ATTENDANCE TAB ════ */}
            {activeTab === "attendance" && (
              <motion.div key="attendance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* Date picker row */}
                <div className="am-panel" style={{ marginBottom: 16 }}>
                  <div className="am-panel-head">
                    <div>
                      <div className="am-panel-title">📅 Select Date & Filters</div>
                      <div className="am-panel-sub">Mark attendance for {selectedDate}</div>
                    </div>
                  </div>
                  <div className="am-panel-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
                    <div className="am-filters-grid">
                      <div className="am-filter-group">
                        <label className="am-filter-label">Date</label>
                        <input type="date" className="am-filter-input" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setPage(1); }} />
                      </div>
                      <div className="am-filter-group">
                        <label className="am-filter-label">Class</label>
                        <select className="am-filter-select" value={filters.class} onChange={e => { setFilters(f => ({ ...f, class: e.target.value })); setPage(1); }}>
                          <option value="all">All Classes</option>
                          <option value="10">Class 10</option>
                          <option value="12">Class 12</option>
                        </select>
                      </div>
                      <div className="am-filter-group">
                        <label className="am-filter-label">Section</label>
                        <select className="am-filter-select" value={filters.section} onChange={e => { setFilters(f => ({ ...f, section: e.target.value })); setPage(1); }}>
                          <option value="all">All Sections</option>
                          <option value="A">Section A</option>
                          <option value="B">Section B</option>
                        </select>
                      </div>
                      <div className="am-filter-group">
                        <label className="am-filter-label">Status</label>
                        <select className="am-filter-select" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
                          <option value="all">All Status</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="leave">Leave</option>
                          <option value="half-day">Half Day</option>
                        </select>
                      </div>
                      <div className="am-filter-group" style={{ gridColumn: "span 2" }}>
                        <label className="am-filter-label">Search</label>
                        <div className="am-search-wrap">
                          <input className="am-filter-input" placeholder="Name or roll number…" value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} style={{ width: "100%", paddingRight: 32 }} />
                          <span className="am-search-icon">🔍</span>
                        </div>
                      </div>
                      <div className="am-filter-group" style={{ justifyContent: "flex-end" }}>
                        <label className="am-filter-label" style={{ opacity: 0 }}>.</label>
                        <button className="am-btn" onClick={() => { setFilters({ class: "all", section: "all", status: "all", search: "" }); setPage(1); }}>↺ Reset</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="am-panel">
                  <div className="am-panel-head">
                    <div className="am-panel-title">👩‍🎓 Student Attendance — {sorted.length} students</div>
                  </div>
                  <div className="am-panel-body">
                    <div className="am-table-controls">
                      <div className="am-btn-group">
                        <button className="am-btn success" onClick={() => markAll("present")}>✅ Mark All Present</button>
                        <button className="am-btn danger" onClick={() => markAll("absent")}>❌ Mark All Absent</button>
                      </div>
                      <div className="am-btn-group">
                        <button className="am-btn" onClick={() => showToast("Exported to PDF", "info")}>📄 Export PDF</button>
                        <button className="am-btn" onClick={() => showToast("Exported to CSV", "info")}>📊 Export CSV</button>
                      </div>
                    </div>
                    <div className="am-table-wrap">
                      <table className="am-table">
                        <thead>
                          <tr>
                            <th className="am-th" onClick={() => toggleSort("name")}>Student {sort.key === "name" ? (sort.dir === "asc" ? "↑" : "↓") : <span className="am-sort-icon">↕</span>}</th>
                            <th className="am-th" onClick={() => toggleSort("rollNumber")}>Roll #</th>
                            <th className="am-th">Class</th>
                            <th className="am-th" onClick={() => toggleSort("status")}>Status</th>
                            <th className="am-th">Check-in</th>
                            <th className="am-th">Check-out</th>
                            <th className="am-th">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map(s => (
                            <motion.tr key={s.id} className="am-tr" onClick={() => setSelectedStudent(s)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                              <td className="am-td">
                                <div className="am-student-cell">
                                  <img src={s.photo} alt={s.name} className="am-student-photo" />
                                  <div><div className="am-student-name">{s.name}</div><div className="am-student-roll">{s.email}</div></div>
                                </div>
                              </td>
                              <td className="am-td">{s.rollNumber}</td>
                              <td className="am-td">{s.class}-{s.section}</td>
                              <td className="am-td"><span className={`am-status-badge am-status-${s.att.status}`}>{s.att.status}</span></td>
                              <td className="am-td">{s.att.checkIn || "—"}</td>
                              <td className="am-td">{s.att.checkOut || "—"}</td>
                              <td className="am-td" onClick={e => e.stopPropagation()}>
                                <button className="am-action-btn am-action-present" title="Present" onClick={e => updateAtt(s.id, "present", e)}>✅</button>
                                <button className="am-action-btn am-action-absent"  title="Absent"  onClick={e => updateAtt(s.id, "absent", e)}>❌</button>
                                <button className="am-action-btn am-action-late"    title="Late"    onClick={e => updateAtt(s.id, "late", e)}>⏰</button>
                                <button className="am-action-btn am-action-leave"   title="Leave"   onClick={e => updateAtt(s.id, "leave", e)}>📁</button>
                                <button className="am-action-btn am-action-halfday" title="Half Day" onClick={e => updateAtt(s.id, "half-day", e)}>½</button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {paginated.length === 0 && (
                      <div className="am-empty"><div className="am-empty-icon">🔍</div><div className="am-empty-text">No students found</div><div className="am-empty-sub">Try adjusting your filters</div></div>
                    )}
                    <div className="am-pagination">
                      <span className="am-page-info">{sorted.length} students · Page {page} of {totalPages}</span>
                      <button className="am-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pg = page <= 3 ? i + 1 : page + i - 2;
                        if (pg > totalPages) return null;
                        return <button key={pg} className={`am-page-btn${page === pg ? " on" : ""}`} onClick={() => setPage(pg)}>{pg}</button>;
                      })}
                      <button className="am-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════ CALENDAR TAB ════ */}
            {activeTab === "calendar" && (
              <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="am-main-grid">
                  <div className="am-panel">
                    <div className="am-panel-head">
                      <div className="am-panel-title">📅 Attendance Calendar</div>
                      <div className="am-panel-sub">Click any date to view details</div>
                    </div>
                    <div className="am-panel-body">
                      <AttendanceCalendar selectedDate={selectedDate} onSelect={(d) => { setSelectedDate(d); }} records={records} />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="am-panel">
                      <div className="am-panel-head"><div className="am-panel-title">📊 {selectedDate}</div></div>
                      <div className="am-panel-body">
                        {[
                          { label: "Present", count: todayRecords.filter(r => r.status === "present").length, color: "#10b981" },
                          { label: "Absent",  count: todayRecords.filter(r => r.status === "absent").length,  color: "#ef4444" },
                          { label: "Late",    count: todayRecords.filter(r => r.status === "late").length,    color: "#f59e0b" },
                          { label: "Leave",   count: todayRecords.filter(r => r.status === "leave").length,   color: "#3b82f6" },
                        ].map(d => (
                          <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border2)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
                              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{d.label}</span>
                            </div>
                            <span style={{ fontSize: 16, fontWeight: 800, color: d.color }}>{d.count}</span>
                          </div>
                        ))}
                        <button className="am-btn primary" style={{ width: "100%", marginTop: 14 }} onClick={() => { setActiveTab("attendance"); }}>
                          📝 Manage This Day
                        </button>
                      </div>
                    </div>

                    <div className="am-panel">
                      <div className="am-panel-head"><div className="am-panel-title">📈 30-Day Trend</div></div>
                      <div className="am-panel-body">
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={monthlyTrendData.slice(-15)}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: chartAxis }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: chartAxis }} axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Tooltip formatter={(v: any) => [`${v}%`]} />
                            <Line type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════ ANALYTICS TAB ════ */}
            {activeTab === "analytics" && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="am-3col">
                  {/* Monthly trend */}
                  <div className="am-panel" style={{ gridColumn: "span 2" }}>
                    <div className="am-panel-head">
                      <div><div className="am-panel-title">📈 30-Day Attendance Trend</div><div className="am-panel-sub">Daily attendance percentage over the past month</div></div>
                      <div style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(99,102,241,.1)", color: "#6366f1", fontSize: 12, fontWeight: 700 }}>Avg {Math.round(monthlyTrendData.reduce((a, b) => a + b.pct, 0) / monthlyTrendData.length)}%</div>
                    </div>
                    <div className="am-panel-body">
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={monthlyTrendData}>
                          <defs>
                            <linearGradient id="gMonth" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: chartAxis }} axisLine={false} tickLine={false} interval={4} />
                          <YAxis tick={{ fontSize: 11, fill: chartAxis }} axisLine={false} tickLine={false} domain={[0, 100]} />
                          <Tooltip formatter={(v: any) => [`${v}%`, "Attendance"]} />
                          <Area type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2.5} fill="url(#gMonth)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Class radar */}
                  <div className="am-panel">
                    <div className="am-panel-head"><div className="am-panel-title">🎯 Class Performance</div></div>
                    <div className="am-panel-body">
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={[
                          { subject: "10-A", att: 87 }, { subject: "12-B", att: 82 },
                          { subject: "Overall", att: attendancePct }, { subject: "Target", att: 90 },
                        ]}>
                          <PolarGrid stroke={chartGrid} />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: chartAxis }} />
                          <Radar dataKey="att" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                          <Tooltip formatter={(v: any) => [`${v}%`]} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Student ranking */}
                <div className="am-panel" style={{ marginBottom: 16 }}>
                  <div className="am-panel-head"><div className="am-panel-title">🏆 Student Attendance Ranking</div><div className="am-panel-sub">Ranked by attendance percentage</div></div>
                  <div className="am-panel-body">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                      {mockStudents.map(s => {
                        const sr = records.filter(r => r.studentId === s.id);
                        const p = sr.filter(r => r.status === "present").length;
                        const pct = sr.length > 0 ? Math.round(p / sr.length * 100) : 0;
                        return (
                          <motion.div key={s.id} style={{ borderRadius: 14, padding: "12px 14px", border: "1.5px solid var(--border2)", cursor: "pointer", transition: "all .2s" }}
                            whileHover={{ scale: 1.02, boxShadow: "0 6px 20px rgba(99,102,241,.15)" }}
                            onClick={() => setSelectedStudent(s)}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                              <img src={s.photo} alt={s.name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Class {s.class}-{s.section}</div>
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 800, color: pct >= 85 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444" }}>{pct}%</span>
                            </div>
                            <div style={{ height: 5, background: "var(--prog-bg)", borderRadius: 5, overflow: "hidden" }}>
                              <motion.div style={{ height: "100%", borderRadius: 5, background: pct >= 85 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444", width: 0 }}
                                animate={{ width: `${pct}%` }} transition={{ duration: .8 }} />
                            </div>
                          </motion.div>
                        );
                      }).sort((a, b) => {
                        const pa = records.filter(r => r.studentId === (a as any).key).length;
                        return pa;
                      })}
                    </div>
                  </div>
                </div>

                {/* Weekly bar comparison */}
                <div className="am-2col">
                  <div className="am-panel">
                    <div className="am-panel-head"><div className="am-panel-title">📊 Weekly Bar Comparison</div></div>
                    <div className="am-panel-body">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={weeklyData} barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                          <XAxis dataKey="day" tick={{ fontSize: 11, fill: chartAxis }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: chartAxis }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="am-panel">
                    <div className="am-panel-head"><div className="am-panel-title">📉 Absence Heatmap</div></div>
                    <div className="am-panel-body">
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
                        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{d}</div>)}
                        {Array.from({ length: 35 }, (_, i) => {
                          const absences = Math.floor(Math.random() * 5);
                          const opacity = absences / 5;
                          return <div key={i} style={{ height: 22, borderRadius: 5, background: `rgba(239,68,68,${.1 + opacity * .6})`, cursor: "pointer", transition: "transform .15s" }} title={`${absences} absences`} onMouseOver={e => (e.currentTarget.style.transform = "scale(1.2)")} onMouseOut={e => (e.currentTarget.style.transform = "")} />;
                        })}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
                        <span>Less</span>
                        {[0.1, 0.3, 0.5, 0.7, 0.9].map(o => <div key={o} style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(239,68,68,${o})` }} />)}
                        <span>More absences</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════ LEAVES TAB ════ */}
            {activeTab === "leaves" && (
              <motion.div key="leaves" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="am-main-grid">
                  <div>
                    {/* Pending */}
                    <div className="am-panel" style={{ marginBottom: 16 }}>
                      <div className="am-panel-head">
                        <div><div className="am-panel-title">⏳ Pending Requests</div><div className="am-panel-sub">{leaves.filter(l => l.status === "pending").length} awaiting action</div></div>
                      </div>
                      <div className="am-panel-body">
                        {leaves.filter(l => l.status === "pending").length === 0 ? (
                          <div className="am-empty"><div className="am-empty-icon">🎉</div><div className="am-empty-text">All caught up!</div><div className="am-empty-sub">No pending leave requests</div></div>
                        ) : leaves.filter(l => l.status === "pending").map(l => (
                          <div key={l.id} className="am-leave-item">
                            <div className="am-leave-item-head">
                              <div>
                                <div className="am-leave-item-name">{l.studentName}</div>
                                <div className="am-leave-item-meta">Class {l.class}-{l.section} · {l.fromDate} → {l.toDate}</div>
                                <div className="am-leave-item-meta" style={{ marginTop: 4 }}>📝 {l.reason}</div>
                              </div>
                              <span className="am-status-badge am-status-pending">Pending</span>
                            </div>
                            <div className="am-leave-actions">
                              <button className="am-btn success" onClick={() => { setLeaves(p => p.map(r => r.id === l.id ? { ...r, status: "approved" } : r)); showToast("Leave approved", "success"); }}>✓ Approve</button>
                              <button className="am-btn danger" onClick={() => { setLeaves(p => p.map(r => r.id === l.id ? { ...r, status: "rejected" } : r)); showToast("Leave rejected", "error"); }}>✕ Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* History */}
                    <div className="am-panel">
                      <div className="am-panel-head"><div className="am-panel-title">📜 Leave History</div></div>
                      <div className="am-panel-body">
                        {leaves.filter(l => l.status !== "pending").map(l => (
                          <div key={l.id} className="am-leave-item">
                            <div className="am-leave-item-head">
                              <div>
                                <div className="am-leave-item-name">{l.studentName}</div>
                                <div className="am-leave-item-meta">Class {l.class}-{l.section} · {l.fromDate} → {l.toDate}</div>
                                <div className="am-leave-item-meta" style={{ marginTop: 4 }}>📝 {l.reason}</div>
                              </div>
                              <span className={`am-status-badge am-status-${l.status}`}>{l.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stats sidebar */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="am-panel">
                      <div className="am-panel-head"><div className="am-panel-title">📊 Leave Summary</div></div>
                      <div className="am-panel-body">
                        {[
                          { l: "Total Requests", v: leaves.length, c: "#6366f1" },
                          { l: "Pending",         v: leaves.filter(l => l.status === "pending").length,  c: "#f59e0b" },
                          { l: "Approved",        v: leaves.filter(l => l.status === "approved").length, c: "#10b981" },
                          { l: "Rejected",        v: leaves.filter(l => l.status === "rejected").length, c: "#ef4444" },
                        ].map(d => (
                          <div key={d.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border2)" }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-sub)" }}>{d.l}</span>
                            <span style={{ fontSize: 17, fontWeight: 800, color: d.c }}>{d.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="am-panel">
                      <div className="am-panel-head"><div className="am-panel-title">🥧 Leave Status</div></div>
                      <div className="am-panel-body">
                        <ResponsiveContainer width="100%" height={150}>
                          <PieChart>
                            <Pie data={[
                              { name: "Approved", value: leaves.filter(l => l.status === "approved").length, color: "#10b981" },
                              { name: "Pending",  value: leaves.filter(l => l.status === "pending").length,  color: "#f59e0b" },
                              { name: "Rejected", value: leaves.filter(l => l.status === "rejected").length, color: "#ef4444" },
                            ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value">
                              {[{ color: "#10b981" }, { color: "#f59e0b" }, { color: "#ef4444" }].map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════ ALERTS TAB ════ */}
            {activeTab === "alerts" && (
              <motion.div key="alerts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="am-2col">
                  <div>
                    <div className="am-section-title">Low Attendance Students</div>
                    {lowAttStudents.length === 0 ? (
                      <div className="am-panel"><div className="am-panel-body"><div className="am-empty"><div className="am-empty-icon">✅</div><div className="am-empty-text">No alerts</div><div className="am-empty-sub">All students have good attendance</div></div></div></div>
                    ) : lowAttStudents.map(s => {
                      const sr = records.filter(r => r.studentId === s.id);
                      const p = sr.filter(r => r.status === "present").length;
                      const pct = Math.round(p / sr.length * 100);
                      return (
                        <motion.div key={s.id} className="am-panel" style={{ marginBottom: 12, cursor: "pointer" }} whileHover={{ scale: 1.01 }} onClick={() => setSelectedStudent(s)}>
                          <div className="am-panel-body">
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <img src={s.photo} alt={s.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(239,68,68,.3)" }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", marginBottom: 2 }}>{s.name}</div>
                                <div style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 6 }}>Roll #{s.rollNumber} · Class {s.class}-{s.section}</div>
                                <div style={{ height: 5, background: "var(--prog-bg)", borderRadius: 5, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: "#ef4444", borderRadius: 5 }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, fontWeight: 600 }}>
                                  <span style={{ color: "var(--text-muted)" }}>{sr.length} school days recorded</span>
                                  <span style={{ color: "#ef4444" }}>{pct}% attendance</span>
                                </div>
                              </div>
                              <button className="am-btn danger" onClick={e => { e.stopPropagation(); setNotifyStudent(s); setNotifyMsg(`Dear ${s.parentName},\n\nWe are writing to inform you that ${s.name}'s attendance has fallen to ${pct}%, which is below the required threshold of 75%.\n\nPlease ensure regular attendance.\n\nRegards,\nClass Teacher`); }} style={{ fontSize: 11 }}>📧 Notify</button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div>
                    <div className="am-section-title">Today's Alerts</div>
                    {[
                      { icon: "🔴", title: "Consecutive Absences", text: `${records.filter(r => r.status === "absent").length > 0 ? "3 students" : "None"} absent 3+ consecutive days`, type: "danger" as const },
                      { icon: "⏰", title: "Frequent Late Arrivals", text: `${lateCount} students arrived late today`, type: "warn" as const },
                      { icon: "📋", title: "Pending Leave Requests", text: `${pendingLeaves} leave request${pendingLeaves !== 1 ? "s" : ""} awaiting approval`, type: "warn" as const },
                    ].map((a, i) => (
                      <div key={i} className={`am-alert ${a.type}`} style={{ marginBottom: 10 }}>
                        <span className="am-alert-icon">{a.icon}</span>
                        <div><div className="am-alert-title">{a.title}</div><div className="am-alert-text">{a.text}</div></div>
                      </div>
                    ))}

                    <div className="am-panel" style={{ marginTop: 4 }}>
                      <div className="am-panel-head"><div className="am-panel-title">📬 Bulk Notifications</div></div>
                      <div className="am-panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[
                          { label: "Notify all absent parents", icon: "📧" },
                          { label: "Send daily attendance report", icon: "📄" },
                          { label: "Alert low-attendance parents", icon: "⚠️" },
                        ].map((a, i) => (
                          <button key={i} className="am-btn" style={{ justifyContent: "flex-start" }} onClick={() => showToast(`${a.icon} Notification sent`, "success")}>{a.icon} {a.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Student Drawer ── */}
        <AnimatePresence>
          {selectedStudent && (
            <StudentDrawer
              student={selectedStudent}
              records={records}
              leaves={leaves}
              onClose={() => setSelectedStudent(null)}
              onNotify={() => {
                setNotifyStudent(selectedStudent);
                setNotifyMsg(`Dear ${selectedStudent.parentName},\n\nThis is a message regarding ${selectedStudent.name}'s attendance.\n\nRegards,\nClass Teacher`);
                setSelectedStudent(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Notify Modal ── */}
        <AnimatePresence>
          {notifyStudent && (
            <motion.div className="am-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNotifyStudent(null)}>
              <motion.div className="am-modal" initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                <div className="am-modal-head">
                  <div className="am-modal-title">📧 Notify {notifyStudent.parentName}</div>
                  <button className="am-drawer-close" onClick={() => setNotifyStudent(null)}>✕</button>
                </div>
                <div className="am-modal-body">
                  <div style={{ fontSize: 12.5, color: "var(--text-sub)", marginBottom: 4 }}>Message to parent of <strong style={{ color: "var(--text-main)" }}>{notifyStudent.name}</strong></div>
                  <textarea className="am-textarea" value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} />
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📱 Will be sent via SMS & Email to {notifyStudent.parentContact}</div>
                </div>
                <div className="am-modal-footer">
                  <button className="am-btn" onClick={() => setNotifyStudent(null)}>Cancel</button>
                  <button className="am-btn primary" onClick={() => { setNotifyStudent(null); showToast("Notification sent successfully!", "success"); }}>📧 Send Message</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Toast ── */}
        <AnimatePresence>
          {toast && <Toast key={toast.msg} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>
      </div>
    </>
  );
}