import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import roboWaving from "../../assets/dashboard/15_robot_waving.png";

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

// ─── CSS Styles ───────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;}

/* ── Root & Theme Tokens ── */
.am-root {
  min-height: 100%;
  padding: 16px 20px 80px;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  color: var(--sd-ink);
  background: radial-gradient(circle at 14% 9%, rgba(14, 165, 233, 0.08), transparent 28%),
              radial-gradient(circle at 88% 14%, rgba(245, 158, 11, 0.10), transparent 26%),
              linear-gradient(180deg, var(--sd-page), var(--sd-page-2));
  --sd-page: #fbfcff;
  --sd-page-2: #f5f7ff;
  --sd-card: #ffffff;
  --sd-card-soft: #f8fafc;
  --sd-ink: #071235;
  --sd-muted: #64748b;
  --sd-faint: #94a3b8;
  --sd-line: rgba(15, 23, 42, 0.08);
  --sd-shadow: 0 12px 30px rgba(35, 44, 87, 0.08);
  --sd-shadow-soft: 0 6px 18px rgba(35, 44, 87, 0.06);
  position: relative;
  overflow-x: hidden;
  transition: background .25s ease, color .25s ease;
}

[data-theme="dark"] .am-root,
.dark .am-root {
  --sd-page: #080d1f;
  --sd-page-2: #10172d;
  --sd-card: rgba(23, 31, 58, 0.94);
  --sd-card-soft: rgba(31, 42, 76, 0.72);
  --sd-ink: #f8fafc;
  --sd-muted: #cbd5e1;
  --sd-faint: #818cf8;
  --sd-line: rgba(255, 255, 255, 0.12);
  --sd-shadow: 0 20px 54px rgba(0, 0, 0, 0.42);
  --sd-shadow-soft: 0 10px 24px rgba(0, 0, 0, 0.28);
}

/* ── Floating Background Ornaments ── */
.am-root::before, .am-root::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  opacity: .55;
  animation: sdFloatBg 12s ease-in-out infinite alternate;
}
.am-root::before {
  width: 280px; height: 280px;
  left: -80px; top: 90px;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.16), transparent 70%);
}
.am-root::after {
  width: 320px; height: 320px;
  right: -100px; top: 380px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.14), transparent 72%);
  animation-delay: -5s;
}

.am-bg-spark {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
  opacity: .48;
  animation: sdDrift 9s ease-in-out infinite;
}
.am-bg-spark.s1 {
  left: 48%; top: 80px; width: 8px; height: 8px;
  background: #f59e0b;
  box-shadow: 36px 30px 0 #10b981, 80px -16px 0 #0284c7;
}
.am-bg-spark.s2 {
  right: 6%; top: 280px; width: 7px; height: 7px;
  background: #f43f5e;
  box-shadow: -46px 42px 0 #0d9488, -84px -20px 0 #0284c7;
  animation-delay: -3s;
}
.am-bg-spark.s3 {
  left: 6%; bottom: 180px; width: 8px; height: 8px;
  background: #10b981;
  box-shadow: 40px -32px 0 #ea580c, 90px 20px 0 #0284c7;
  animation-delay: -5s;
}

/* ── Keyframe Animations ── */
@keyframes sdFloatBg {
  from { transform: translate3d(0,0,0) scale(1); }
  to   { transform: translate3d(24px, 28px, 0) scale(1.08); }
}
@keyframes sdCardIn {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to   { opacity: 1; transform: none; }
}
@keyframes sdShine {
  0%   { transform: translateX(-120%) rotate(18deg); }
  45%, 100% { transform: translateX(220%) rotate(18deg); }
}
@keyframes sdBreathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes sdPulseSoft {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.28); }
  50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
}
@keyframes sdDrift {
  0%, 100% { transform: translate3d(0,0,0) rotate(0); }
  50% { transform: translate3d(18px, -14px, 0) rotate(7deg); }
}
@keyframes sdGlowMove {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes sdWiggle {
  0%, 100% { transform: rotate(0) scale(1); }
  35% { transform: rotate(-3deg) scale(1.03); }
  70% { transform: rotate(3deg) scale(1.03); }
}
@keyframes sdPop3d {
  0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
  50% { transform: translateY(-7px) rotate(3deg) scale(1.05); }
}
@keyframes sdProgressSweep {
  0% { transform: translateX(-120%) skewX(-20deg); }
  100% { transform: translateX(220%) skewX(-20deg); }
}

.am-shell {
  max-width: 1240px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* ── Hero Banner (Fresh Education Palette + Animated Robo Mascot) ── */
.am-hero {
  position: relative;
  overflow: hidden;
  min-height: 210px;
  padding: 22px 28px;
  border-radius: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  align-items: center;
  gap: 20px;
  background: linear-gradient(118deg, #e0f2fe 0%, #ecfdf5 45%, #fffbeb 100%);
  border: 1px solid rgba(14, 165, 233, 0.24);
  box-shadow: var(--sd-shadow);
  animation: sdCardIn 0.48s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.am-hero::before {
  content: "";
  position: absolute;
  inset: -80px auto auto -80px;
  width: 220px; height: 220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  animation: sdBreathe 5s ease-in-out infinite;
}
.am-hero::after {
  content: "";
  position: absolute;
  top: -50px; bottom: -50px;
  width: 70px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  animation: sdShine 7s ease-in-out infinite;
}

[data-theme="dark"] .am-hero,
.dark .am-hero {
  background: linear-gradient(118deg, #0d283f 0%, #0d2a29 50%, #2e2614 100%);
  border-color: rgba(56, 189, 248, 0.28);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
}
[data-theme="dark"] .am-hero::before,
.dark .am-hero::before {
  background: rgba(255, 255, 255, 0.08);
}

.am-hero-left {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.am-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.28);
  color: #047857;
  font-size: 11.5px;
  font-weight: 800;
  width: fit-content;
}
[data-theme="dark"] .am-chip,
.dark .am-chip {
  background: rgba(16, 185, 129, 0.20);
  border-color: rgba(52, 211, 153, 0.35);
  color: #6ee7b7;
}
.am-live-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: sdPulseSoft 2s ease-in-out infinite;
}

.am-hero-title {
  font-size: clamp(22px, 2.7vw, 30px);
  line-height: 1.15;
  font-weight: 900;
  letter-spacing: -0.5px;
  color: var(--sd-ink);
  margin: 2px 0 0;
}
.am-hero-sub {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--sd-muted);
  max-width: 520px;
}

.am-hero-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.am-hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  border: 1px solid var(--sd-line);
  font-size: 11.5px;
  font-weight: 800;
  color: var(--sd-ink);
  box-shadow: var(--sd-shadow-soft);
  transition: transform .18s;
}
.am-hero-pill:hover {
  transform: translateY(-2px);
}
[data-theme="dark"] .am-hero-pill,
.dark .am-hero-pill {
  background: rgba(15, 23, 42, 0.65);
  border-color: rgba(255, 255, 255, 0.12);
}

.am-hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

/* ── Robo Mascot Showcase Panel ── */
.am-hero-right {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.am-hero-mascot-box {
  position: relative;
  width: 100%;
  min-height: 175px;
  border-radius: 20px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 14px 28px rgba(35, 44, 87, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
[data-theme="dark"] .am-hero-mascot-box,
.dark .am-hero-mascot-box {
  background: rgba(15, 23, 42, 0.52);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
}
.am-hero-mascot-box::before {
  content: "";
  position: absolute;
  right: -30px; top: -30px;
  width: 110px; height: 110px;
  border-radius: 50%;
  background: rgba(14, 165, 233, 0.18);
  animation: sdBreathe 5s ease-in-out infinite;
}
.am-hero-mascot-box::after {
  content: "";
  position: absolute;
  left: -20px; bottom: -20px;
  width: 90px; height: 90px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.18);
  animation: sdDrift 8s ease-in-out infinite;
}

.am-hero-robo {
  width: 116px;
  height: 116px;
  object-fit: contain;
  filter: drop-shadow(0 14px 18px rgba(38, 57, 116, 0.22));
  animation: sdPop3d 4.4s ease-in-out infinite;
  z-index: 1;
  transition: transform .25s ease;
}
.am-hero-robo:hover {
  animation: sdWiggle .7s ease both;
}
.am-robo-speech {
  position: relative;
  z-index: 1;
  margin-top: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid rgba(14, 165, 233, 0.25);
  color: #0369a1;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 6px 14px rgba(14, 165, 233, 0.12);
  white-space: nowrap;
}
[data-theme="dark"] .am-robo-speech,
.dark .am-robo-speech {
  background: #0f172a;
  border-color: rgba(56, 189, 248, 0.35);
  color: #7dd3fc;
}

/* ── Nav Tabs (Clean, Bright, Non-Purple Active State) ── */
.am-nav {
  display: flex;
  gap: 8px;
  padding: 18px 0 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.am-nav::-webkit-scrollbar { display: none; }

.am-nav-btn {
  padding: 10px 18px;
  border-radius: 14px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card);
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  color: var(--sd-muted);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--sd-shadow-soft);
}
.am-nav-btn:hover {
  transform: translateY(-2px);
  color: #0284c7;
  border-color: rgba(14, 165, 233, 0.4);
  box-shadow: var(--sd-shadow);
}
.am-nav-btn.on {
  background: linear-gradient(135deg, #0284c7, #0ea5e9);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 8px 20px rgba(14, 165, 233, 0.35);
  transform: translateY(-2px);
}
.am-nav-badge {
  font-size: 10.5px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}
.am-nav-btn.on .am-nav-badge {
  background: rgba(255, 255, 255, 0.28);
  color: #ffffff;
}

/* ── Colorful Student-Dashboard Style Stat Cards ── */
.am-stats {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  padding: 18px 0 0;
}
.am-scard {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  padding: 16px 14px;
  text-align: left;
  border: 1.5px solid transparent;
  box-shadow: var(--sd-shadow-soft);
  transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s, border-color .22s;
  animation: sdCardIn .45s both;
  cursor: pointer;
}
.am-scard:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: var(--sd-shadow);
}
.am-scard::before {
  content: "";
  position: absolute;
  inset: -35px -25px auto auto;
  width: 90px; height: 90px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.32);
}
.am-scard::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 4px;
  background: var(--card-accent, #0284c7);
  opacity: .75;
}

/* Card Themes */
.am-scard.theme-blue {
  background: linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%);
  border-color: rgba(59, 130, 246, 0.28);
  --card-accent: #2563eb;
}
.am-scard.theme-green {
  background: linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%);
  border-color: rgba(16, 185, 129, 0.28);
  --card-accent: #10b981;
}
.am-scard.theme-red {
  background: linear-gradient(145deg, #fff1f2 0%, #ffe4e6 100%);
  border-color: rgba(244, 63, 94, 0.28);
  --card-accent: #e11d48;
}
.am-scard.theme-amber {
  background: linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%);
  border-color: rgba(245, 158, 11, 0.28);
  --card-accent: #f59e0b;
}
.am-scard.theme-teal {
  background: linear-gradient(145deg, #f0fdfa 0%, #ccfbf1 100%);
  border-color: rgba(20, 184, 166, 0.28);
  --card-accent: #0d9488;
}
.am-scard.theme-orange {
  background: linear-gradient(145deg, #fff7ed 0%, #ffedd5 100%);
  border-color: rgba(249, 115, 22, 0.28);
  --card-accent: #ea580c;
}

[data-theme="dark"] .am-scard.theme-blue, .dark .am-scard.theme-blue {
  background: linear-gradient(145deg, rgba(30, 58, 138, 0.35) 0%, rgba(23, 31, 58, 0.94) 100%);
  border-color: rgba(96, 165, 250, 0.35);
}
[data-theme="dark"] .am-scard.theme-green, .dark .am-scard.theme-green {
  background: linear-gradient(145deg, rgba(6, 78, 59, 0.35) 0%, rgba(23, 31, 58, 0.94) 100%);
  border-color: rgba(52, 211, 153, 0.35);
}
[data-theme="dark"] .am-scard.theme-red, .dark .am-scard.theme-red {
  background: linear-gradient(145deg, rgba(136, 19, 55, 0.35) 0%, rgba(23, 31, 58, 0.94) 100%);
  border-color: rgba(251, 113, 133, 0.35);
}
[data-theme="dark"] .am-scard.theme-amber, .dark .am-scard.theme-amber {
  background: linear-gradient(145deg, rgba(120, 53, 15, 0.35) 0%, rgba(23, 31, 58, 0.94) 100%);
  border-color: rgba(251, 191, 36, 0.35);
}
[data-theme="dark"] .am-scard.theme-teal, .dark .am-scard.theme-teal {
  background: linear-gradient(145deg, rgba(19, 78, 74, 0.35) 0%, rgba(23, 31, 58, 0.94) 100%);
  border-color: rgba(45, 212, 191, 0.35);
}
[data-theme="dark"] .am-scard.theme-orange, .dark .am-scard.theme-orange {
  background: linear-gradient(145deg, rgba(124, 45, 18, 0.35) 0%, rgba(23, 31, 58, 0.94) 100%);
  border-color: rgba(251, 146, 60, 0.35);
}

.am-scard-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.am-scard-icon {
  width: 40px; height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 19px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 -4px 0 rgba(0,0,0,.06), 0 6px 14px rgba(35, 44, 87, 0.12);
  animation: sdPop3d 4.2s ease-in-out infinite;
}
[data-theme="dark"] .am-scard-icon,
.dark .am-scard-icon {
  background: rgba(255, 255, 255, 0.14);
}
.am-scard:hover .am-scard-icon {
  animation: sdWiggle .65s ease both;
}

.am-scard-n {
  font-size: 26px;
  font-weight: 900;
  color: var(--sd-ink);
  line-height: 1.05;
  letter-spacing: -0.5px;
}
.am-scard-l {
  font-size: 12px;
  font-weight: 800;
  color: var(--sd-muted);
  margin-top: 4px;
}
.am-scard-sub {
  font-size: 11px;
  font-weight: 700;
  margin-top: 6px;
  color: var(--card-accent);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ── Panels & Cards ── */
.am-body {
  padding: 18px 0 20px;
}

.am-panel {
  background: var(--sd-card);
  border-radius: 20px;
  border: 1px solid var(--sd-line);
  box-shadow: var(--sd-shadow-soft);
  overflow: hidden;
  transition: transform .2s, box-shadow .2s, border-color .2s;
}
.am-panel:hover {
  box-shadow: var(--sd-shadow);
  border-color: rgba(14, 165, 233, 0.28);
}
.am-panel-head {
  padding: 18px 22px;
  border-bottom: 1px solid var(--sd-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  background: var(--sd-card-soft);
}
.am-panel-title {
  font-size: 15.5px;
  font-weight: 900;
  color: var(--sd-ink);
  display: flex;
  align-items: center;
  gap: 8px;
}
.am-panel-sub {
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
  margin-top: 3px;
}
.am-panel-body {
  padding: 20px 22px;
}
.am-view-all {
  font-size: 12.5px;
  font-weight: 800;
  color: #0284c7;
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background .15s;
}
.am-view-all:hover {
  background: rgba(14, 165, 233, 0.1);
}

/* ── Grid Layouts ── */
.am-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.am-3col {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.am-main-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
  margin-bottom: 16px;
}

/* ── Filters Bar ── */
.am-filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  align-items: end;
}
.am-filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.am-filter-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-muted);
  text-transform: uppercase;
  letter-spacing: .06em;
}
.am-filter-select, .am-filter-input {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card);
  color: var(--sd-ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.am-filter-select:focus, .am-filter-input:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.16);
}
.am-search-wrap { position: relative; }
.am-search-icon {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  color: var(--sd-muted);
  pointer-events: none;
  font-size: 14px;
}

/* ── Buttons (No AI purple gradients) ── */
.am-btn {
  padding: 9px 18px;
  border-radius: 12px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card);
  color: var(--sd-ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: all .2s;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  box-shadow: var(--sd-shadow-soft);
}
.am-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--sd-shadow);
  border-color: rgba(14, 165, 233, 0.4);
}
.am-btn.primary {
  background: linear-gradient(135deg, #0284c7, #0ea5e9);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 18px rgba(14, 165, 233, 0.32);
}
.am-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(14, 165, 233, 0.42);
}
.am-btn.success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.3);
}
.am-btn.success:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(16, 185, 129, 0.4);
}
.am-btn.danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.3);
}
.am-btn.danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(239, 68, 68, 0.4);
}
.am-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
  transform: none !important;
}

/* ── Student Attendance Table ── */
.am-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 14px;
}
.am-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}
.am-th {
  font-size: 11.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--sd-muted);
  padding: 14px 18px;
  text-align: left;
  border-bottom: 1.5px solid var(--sd-line);
  background: var(--sd-card-soft);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.am-th:hover { color: #0284c7; }
.am-sort-icon { margin-left: 4px; opacity: .6; }
.am-tr {
  transition: background .15s, transform .15s;
  cursor: pointer;
}
.am-tr:hover {
  background: var(--sd-card-soft);
}
.am-td {
  padding: 13px 18px;
  font-size: 13.5px;
  color: var(--sd-ink);
  border-bottom: 1px solid var(--sd-line);
}
.am-tr:last-child .am-td { border-bottom: none; }

.am-student-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.am-student-photo {
  width: 38px; height: 38px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid var(--sd-line);
  box-shadow: 0 4px 10px rgba(0,0,0,.08);
}
.am-student-name {
  font-weight: 800;
  font-size: 13.5px;
  color: var(--sd-ink);
}
.am-student-roll {
  font-size: 11.5px;
  color: var(--sd-muted);
  margin-top: 1px;
}

/* ── High-Contrast Colorful Badges ── */
.am-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  white-space: nowrap;
}
.am-status-present  { background: rgba(16, 185, 129, 0.14); color: #047857; }
.am-status-absent   { background: rgba(239, 68, 68, 0.14);  color: #b91c1c; }
.am-status-late     { background: rgba(245, 158, 11, 0.15); color: #b45309; }
.am-status-leave    { background: rgba(14, 165, 233, 0.14); color: #0369a1; }
.am-status-half-day { background: rgba(20, 184, 166, 0.15); color: #0f766e; }
.am-status-pending  { background: rgba(245, 158, 11, 0.15); color: #b45309; }
.am-status-approved { background: rgba(16, 185, 129, 0.14); color: #047857; }
.am-status-rejected { background: rgba(239, 68, 68, 0.14);  color: #b91c1c; }

[data-theme="dark"] .am-status-present,  .dark .am-status-present  { background: rgba(16, 185, 129, 0.24); color: #6ee7b7; }
[data-theme="dark"] .am-status-absent,   .dark .am-status-absent   { background: rgba(239, 68, 68, 0.24);  color: #fca5a5; }
[data-theme="dark"] .am-status-late,     .dark .am-status-late     { background: rgba(245, 158, 11, 0.24); color: #fcd34d; }
[data-theme="dark"] .am-status-leave,    .dark .am-status-leave    { background: rgba(14, 165, 233, 0.24); color: #7dd3fc; }
[data-theme="dark"] .am-status-half-day, .dark .am-status-half-day { background: rgba(20, 184, 166, 0.24); color: #5eead4; }

/* ── Quick Action Mini Buttons ── */
.am-action-btn {
  width: 32px; height: 32px;
  border-radius: 9px;
  border: 1px solid var(--sd-line);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13.5px;
  transition: all .16s;
  margin-right: 4px;
  font-family: inherit;
  background: var(--sd-card);
  box-shadow: var(--sd-shadow-soft);
}
.am-action-btn:hover {
  transform: translateY(-2px) scale(1.08);
}
.am-action-present:hover { background: rgba(16, 185, 129, 0.2); border-color: #10b981; }
.am-action-absent:hover  { background: rgba(239, 68, 68, 0.2);  border-color: #ef4444; }
.am-action-late:hover    { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; }
.am-action-leave:hover   { background: rgba(14, 165, 233, 0.2); border-color: #0ea5e9; }
.am-action-halfday:hover { background: rgba(20, 184, 166, 0.2); border-color: #14b8a6; }

.am-table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.am-btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
.am-pagination {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.am-page-btn {
  width: 34px; height: 34px;
  border-radius: 10px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card);
  color: var(--sd-ink);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
}
.am-page-btn:hover {
  border-color: #0284c7;
  color: #0284c7;
}
.am-page-btn.on {
  background: linear-gradient(135deg, #0284c7, #0ea5e9);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}
.am-page-info {
  font-size: 12.5px;
  color: var(--sd-muted);
  font-weight: 700;
  margin-right: 6px;
}

/* ── Calendar ── */
.am-cal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}
.am-cal-title {
  font-size: 16px;
  font-weight: 900;
  color: var(--sd-ink);
}
.am-cal-nav { display: flex; gap: 6px; }
.am-cal-nav-btn {
  width: 32px; height: 32px;
  border-radius: 10px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card);
  color: var(--sd-ink);
  cursor: pointer;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
}
.am-cal-nav-btn:hover {
  border-color: #0284c7;
  color: #0284c7;
}
.am-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.am-cal-day-header {
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-muted);
  text-align: center;
  padding: 6px 0;
  text-transform: uppercase;
}
.am-cal-cell {
  border-radius: 10px;
  padding: 8px 4px;
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all .15s;
  position: relative;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
}
.am-cal-cell:hover {
  background: var(--sd-card);
  transform: translateY(-2px) scale(1.04);
  box-shadow: var(--sd-shadow-soft);
  border-color: rgba(14, 165, 233, 0.35);
}
.am-cal-cell.empty {
  background: transparent;
  border-color: transparent;
  cursor: default;
}
.am-cal-cell.today {
  box-shadow: 0 0 0 2px #0ea5e9 inset;
}
.am-cal-cell.selected {
  background: rgba(14, 165, 233, 0.16);
  border-color: #0284c7;
}
.am-cal-cell.weekend .am-cal-num {
  color: #ef4444;
}
.am-cal-num {
  font-size: 12.5px;
  font-weight: 800;
  color: var(--sd-ink);
  line-height: 1;
}
.am-cal-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  margin-top: 5px;
  box-shadow: 0 2px 4px rgba(0,0,0,.15);
}
.am-cal-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.am-cal-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--sd-muted);
}
.am-cal-legend-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Student Drawer ── */
.am-drawer-backdrop {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.55);
  z-index: 100;
  backdrop-filter: blur(4px);
}
.am-drawer {
  position: fixed; top: 0; right: 0;
  width: 440px; max-width: 95vw; height: 100%;
  background: var(--sd-card);
  box-shadow: -10px 0 40px rgba(0,0,0,.2);
  z-index: 101;
  overflow-y: auto;
  border-left: 1px solid var(--sd-line);
}
.am-drawer-head {
  padding: 20px 24px;
  border-bottom: 1px solid var(--sd-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background: var(--sd-card);
  z-index: 2;
}
.am-drawer-title {
  font-size: 17px;
  font-weight: 900;
  color: var(--sd-ink);
}
.am-drawer-close {
  width: 34px; height: 34px;
  border-radius: 10px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card-soft);
  cursor: pointer;
  color: var(--sd-muted);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
}
.am-drawer-close:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.3);
}
.am-drawer-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.am-drawer-section {
  background: var(--sd-card-soft);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid var(--sd-line);
}
.am-drawer-section-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--sd-muted);
  margin-bottom: 12px;
}
.am-drawer-profile {
  display: flex;
  align-items: center;
  gap: 14px;
}
.am-drawer-avatar {
  width: 66px; height: 66px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--sd-line);
  flex-shrink: 0;
  box-shadow: 0 6px 14px rgba(0,0,0,.1);
}
.am-drawer-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--sd-line);
  font-size: 13px;
}
.am-drawer-info-row:last-child { border-bottom: none; }
.am-drawer-info-label { color: var(--sd-muted); font-weight: 600; }
.am-drawer-info-val { color: var(--sd-ink); font-weight: 800; }
.am-perf-bar {
  height: 7px;
  background: rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 5px;
}
[data-theme="dark"] .am-perf-bar,
.dark .am-perf-bar {
  background: rgba(255, 255, 255, 0.1);
}
.am-perf-fill { height: 100%; border-radius: 999px; }

/* ── Progress Ring ── */
.am-ring-wrap { position: relative; width: 72px; height: 72px; margin: 0 auto; }
.am-ring-wrap svg { width: 72px; height: 72px; transform: rotate(-90deg); }
.am-ring-bg { fill: none; stroke: rgba(15, 23, 42, 0.08); stroke-width: 6; }
[data-theme="dark"] .am-ring-bg,
.dark .am-ring-bg { stroke: rgba(255, 255, 255, 0.1); }
.am-ring-fill { fill: none; stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 1s cubic-bezier(.4,0,.2,1); }
.am-ring-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 900; }

/* ── Modal ── */
.am-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.6);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}
.am-modal {
  width: 100%;
  max-width: 490px;
  background: var(--sd-card);
  border-radius: 22px;
  border: 1px solid var(--sd-line);
  box-shadow: var(--sd-shadow);
  overflow: hidden;
}
.am-modal-head {
  padding: 20px 24px;
  border-bottom: 1px solid var(--sd-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--sd-card-soft);
}
.am-modal-title { font-size: 16.5px; font-weight: 900; color: var(--sd-ink); }
.am-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.am-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--sd-line);
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  background: var(--sd-card-soft);
}
.am-textarea {
  width: 100%;
  min-height: 110px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card);
  color: var(--sd-ink);
  font-family: inherit;
  font-size: 13.5px;
  resize: vertical;
  outline: none;
  transition: border-color .2s;
}
.am-textarea:focus { border-color: #0284c7; }

/* ── Chart Tooltip & Analytics ── */
.am-tip {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: var(--sd-shadow);
  font-size: 12px;
  font-weight: 700;
}
.am-tip-label { color: var(--sd-muted); margin-bottom: 3px; }
.am-tip-val { color: #0284c7; font-weight: 900; }

.am-analytics-num {
  font-size: 40px;
  font-weight: 900;
  letter-spacing: -2px;
  line-height: 1;
  color: var(--sd-ink);
}
.am-analytics-suf {
  font-size: 20px;
  font-weight: 800;
  color: #0284c7;
  margin-left: 2px;
}
.am-analytics-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--sd-muted);
  margin-top: 4px;
}
.am-stack {
  height: 12px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  gap: 0;
  margin: 14px 0 10px;
}
.am-stack-seg {
  height: 100%;
  transition: flex .9s cubic-bezier(.4,0,.2,1);
}
.am-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.am-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--sd-muted);
}
.am-legend-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Alert & Empty States ── */
.am-alert {
  border-radius: 16px;
  padding: 14px 18px;
  border-left: 4px solid;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.am-alert.warn {
  background: rgba(245, 158, 11, 0.10);
  border-color: #f59e0b;
}
.am-alert.danger {
  background: rgba(239, 68, 68, 0.10);
  border-color: #ef4444;
}
.am-alert-icon { font-size: 19px; flex-shrink: 0; margin-top: 1px; }
.am-alert-title { font-size: 14px; font-weight: 800; color: var(--sd-ink); margin-bottom: 2px; }
.am-alert-text { font-size: 12.5px; font-weight: 600; color: var(--sd-muted); }

.am-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--sd-muted);
}
.am-empty-icon { font-size: 42px; margin-bottom: 12px; }
.am-empty-text { font-size: 15px; font-weight: 800; color: var(--sd-ink); }
.am-empty-sub { font-size: 12.5px; font-weight: 600; margin-top: 4px; }

/* ── Leave Item ── */
.am-leave-item {
  border-radius: 16px;
  padding: 14px 18px;
  border: 1.5px solid var(--sd-line);
  margin-bottom: 12px;
  background: var(--sd-card);
  transition: all .2s;
}
.am-leave-item:hover {
  border-color: rgba(14, 165, 233, 0.35);
  box-shadow: var(--sd-shadow-soft);
}
.am-leave-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.am-leave-item-name { font-size: 14px; font-weight: 800; color: var(--sd-ink); }
.am-leave-item-meta { font-size: 12px; font-weight: 600; color: var(--sd-muted); margin-top: 2px; }
.am-leave-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }

/* ── Toast ── */
.am-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0,0,0,.22);
  font-size: 13.5px;
  font-weight: 800;
  z-index: 300;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 340px;
}
.am-toast.success { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
.am-toast.error   { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
.am-toast.info    { background: linear-gradient(135deg, #0284c7, #0ea5e9); color: #fff; }

/* ── Responsive Rules ── */
@media(max-width: 1200px) {
  .am-stats { grid-template-columns: repeat(3, 1fr); }
  .am-3col { grid-template-columns: 1fr 1fr; }
  .am-main-grid { grid-template-columns: 1fr 320px; }
}
@media(max-width: 1024px) {
  .am-main-grid { grid-template-columns: 1fr; }
  .am-2col { grid-template-columns: 1fr; }
  .am-3col { grid-template-columns: 1fr 1fr; }
}
@media(max-width: 860px) {
  .am-root { padding: 12px 14px 70px; }
  .am-hero { grid-template-columns: 1fr; padding: 20px 22px; }
  .am-hero-right { justify-content: flex-start; }
  .am-hero-mascot-box { flex-direction: row; min-height: 120px; gap: 16px; justify-content: flex-start; }
  .am-hero-robo { width: 90px; height: 90px; }
}
@media(max-width: 768px) {
  .am-stats { grid-template-columns: repeat(2, 1fr); }
  .am-3col { grid-template-columns: 1fr; }
  .am-drawer { width: 100%; top: auto; bottom: 0; height: 88vh; border-radius: 22px 22px 0 0; }
  .am-table-controls { flex-direction: column; align-items: flex-start; }
}
@media(max-width: 540px) {
  .am-hero { padding: 16px; }
  .am-hero-title { font-size: 20px; }
  .am-stats { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .am-scard { padding: 13px 11px; }
  .am-scard-n { font-size: 22px; }
  .am-filters-grid { grid-template-columns: 1fr; }
  .am-hero-mascot-box { flex-direction: column; text-align: center; }
}
`;

// ─── Number Animation Helper ──────────────────────────────────────────────────
function AnimNum({ target, suffix="" }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = () => {
      cur += target / 40;
      if (cur < target) {
        setV(Math.floor(cur));
        requestAnimationFrame(step);
      } else {
        setV(target);
      }
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{v}{suffix}</>;
}

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="am-tip">
      <div className="am-tip-label">{label}</div>
      <div className="am-tip-val">{payload[0].value} {payload[0].name ? `(${payload[0].name})` : ""}</div>
    </div>
  );
}

// ─── Toast Component ──────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <motion.div
      className={`am-toast ${type}`}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
    >
      {type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"} {msg}
    </motion.div>
  );
}

// ─── Attendance Calendar Component ────────────────────────────────────────────
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

  const dotColor: Record<string, string> = {
    present: "#10b981",
    absent: "#ef4444",
    late: "#f59e0b",
    leave: "#0ea5e9",
    "half-day": "#14b8a6",
  };

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
            <div
              key={date}
              className={`am-cal-cell ${date === todayStr ? "today" : ""} ${date === selectedDate ? "selected" : ""} ${dow === 0 || dow === 6 ? "weekend" : ""}`}
              onClick={() => onSelect(date)}
            >
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

// ─── Student Profile Drawer ───────────────────────────────────────────────────
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
      return {
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        val: r?.status === "present" ? 1 : r?.status === "late" ? 0.5 : r ? 0 : null
      };
    });
  }, [student, records]);

  const r = 28, circ = 2 * Math.PI * r;

  return (
    <>
      <motion.div className="am-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="am-drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
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
                <div style={{ fontSize: 16.5, fontWeight: 900, color: "var(--sd-ink)" }}>{student.name}</div>
                <div style={{ fontSize: 12, color: "var(--sd-muted)", marginTop: 2 }}>Roll #{student.rollNumber} · Class {student.class}-{student.section}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <span className={`am-status-badge am-status-${pct >= 85 ? "present" : pct >= 70 ? "late" : "absent"}`}>
                    {pct >= 85 ? "Good Attendance" : pct >= 70 ? "Average" : "At Risk"}
                  </span>
                </div>
              </div>
            </div>
            {[["Email", student.email], ["Parent", student.parentName], ["Contact", student.parentContact]].map(([l, v]) => (
              <div key={l} className="am-drawer-info-row">
                <span className="am-drawer-info-label">{l}</span>
                <span className="am-drawer-info-val">{v}</span>
              </div>
            ))}
          </div>

          {/* Attendance Rate */}
          <div className="am-drawer-section">
            <div className="am-drawer-section-title">Attendance Rate</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="am-ring-wrap">
                <svg viewBox="0 0 72 72">
                  <circle className="am-ring-bg" cx="36" cy="36" r={r} />
                  <circle
                    className="am-ring-fill"
                    cx="36" cy="36" r={r}
                    stroke={pct >= 85 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444"}
                    strokeDasharray={circ}
                    strokeDashoffset={circ - (pct / 100) * circ}
                  />
                </svg>
                <div className="am-ring-label" style={{ color: pct >= 85 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444" }}>
                  {pct}%
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {[
                  ["Present", present, "#10b981"],
                  ["Total Recorded", total, "#0284c7"],
                  ["Leaves", studentLeaves.filter(l => l.status !== "rejected").length, "#0ea5e9"]
                ].map(([l, v, c]) => (
                  <div key={l as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                    <span style={{ color: "var(--sd-muted)" }}>{l}</span>
                    <span style={{ color: c as string, fontWeight: 900 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 14-day trend */}
          <div className="am-drawer-section">
            <div className="am-drawer-section-title">14-Day Presence Trend</div>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={chartData} barSize={14}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--sd-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [v === 1 ? "Present" : v === 0.5 ? "Late" : "Absent"]} />
                <Bar dataKey="val" radius={4}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.val === 1 ? "#10b981" : entry.val === 0.5 ? "#f59e0b" : entry.val === 0 ? "#ef4444" : "rgba(15,23,42,.1)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Academic Performance */}
          <div className="am-drawer-section">
            <div className="am-drawer-section-title">Academic Performance</div>
            {[
              ["Math", student.academicPerformance.math, "#0284c7"],
              ["Science", student.academicPerformance.science, "#10b981"],
              ["English", student.academicPerformance.english, "#f59e0b"]
            ].map(([s, p, c]) => (
              <div key={s as string} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: "var(--sd-muted)" }}>{s}</span>
                  <span style={{ color: c as string, fontWeight: 900 }}>{p}%</span>
                </div>
                <div className="am-perf-bar">
                  <motion.div className="am-perf-fill" style={{ background: c as string, width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: .8 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Recent History */}
          <div className="am-drawer-section">
            <div className="am-drawer-section-title">Recent Attendance Records</div>
            {history.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--sd-muted)" }}>No records yet</div>
            ) : history.map(r => (
              <div key={r.date} className="am-drawer-info-row">
                <span className="am-drawer-info-label">{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className={`am-status-badge am-status-${r.status}`}>{r.status}{r.checkIn ? ` · ${r.checkIn}` : ""}</span>
              </div>
            ))}
          </div>

          {/* Leave History */}
          {studentLeaves.length > 0 && (
            <div className="am-drawer-section">
              <div className="am-drawer-section-title">Leave History</div>
              {studentLeaves.map(l => (
                <div key={l.id} className="am-drawer-info-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--sd-ink)" }}>{l.fromDate} → {l.toDate}</div>
                  <div style={{ fontSize: 12, color: "var(--sd-muted)" }}>{l.reason}</div>
                  <span className={`am-status-badge am-status-${l.status}`}>{l.status}</span>
                </div>
              ))}
            </div>
          )}

          <button className="am-btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={onNotify}>
            📧 Notify Parent
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Attendance Dashboard ────────────────────────────────────────────────
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

  const showToast = (msg: string, type = "success") => { setToast({ msg, type }); };

  // ── Computed Stats ──────────────────────────────────────────────────────────
  const todayRecords = useMemo(() => records.filter(r => r.date === selectedDate), [records, selectedDate]);
  const total = mockStudents.length;
  const presentCount = todayRecords.filter(r => r.status === "present").length;
  const absentCount = total - todayRecords.length + todayRecords.filter(r => r.status === "absent").length;
  const lateCount = todayRecords.filter(r => r.status === "late").length;
  const leaveCount = todayRecords.filter(r => r.status === "leave").length;
  const halfCount = todayRecords.filter(r => r.status === "half-day").length;
  const attendancePct = Math.round((presentCount / (total - leaveCount || 1)) * 100);
  const pendingLeaves = leaves.filter(l => l.status === "pending").length;

  // ── Filtered + Sorted Students ──────────────────────────────────────────────
  const studentsWithAtt = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    todayRecords.forEach(r => map.set(r.studentId, r));
    return mockStudents.map(s => ({
      ...s,
      att: map.get(s.id) || { studentId: s.id, date: selectedDate, status: "absent" as const }
    }));
  }, [todayRecords, selectedDate]);

  const filtered = useMemo(() => studentsWithAtt.filter(s => {
    const cm = filters.class === "all" || s.class === filters.class;
    const sm = filters.section === "all" || s.section === filters.section;
    const stm = filters.status === "all" || s.att.status === filters.status;
    const qm = filters.search === "" ||
      s.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      s.rollNumber.includes(filters.search);
    return cm && sm && stm && qm;
  }), [studentsWithAtt, filters]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = sort.key === "status" ? a.att.status : (a as any)[sort.key];
    const bv = sort.key === "status" ? b.att.status : (b as any)[sort.key];
    return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  }), [filtered, sort]);

  const paginated = useMemo(() => sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage), [sorted, page]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));

  const toggleSort = (key: string) => setSort(s => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  // ── Attendance Actions ──────────────────────────────────────────────────────
  const updateAtt = useCallback((studentId: string, status: AttendanceRecord["status"], e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecords(prev => {
      const filtered = prev.filter(r => !(r.studentId === studentId && r.date === selectedDate));
      const rec: AttendanceRecord = { studentId, date: selectedDate, status };
      if (["present", "late", "half-day"].includes(status)) {
        rec.checkIn = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      }
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

  // ── Charts Data ─────────────────────────────────────────────────────────────
  const weeklyData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = fmt(d);
    const dayRecs = records.filter(r => r.date === ds);
    return {
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      present: dayRecs.filter(r => r.status === "present").length,
      absent: dayRecs.filter(r => r.status === "absent").length,
      late: dayRecs.filter(r => r.status === "late").length,
    };
  }), [records]);

  const pieData = [
    { name: "Present",  value: presentCount, color: "#10b981" },
    { name: "Absent",   value: absentCount,  color: "#ef4444" },
    { name: "Late",     value: lateCount,    color: "#f59e0b" },
    { name: "Leave",    value: leaveCount,   color: "#0ea5e9" },
    { name: "Half Day", value: halfCount,    color: "#14b8a6" },
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
    return Object.entries(cls).map(([name, d]) => ({
      name,
      pct: Math.round((d.present / d.total) * 100)
    }));
  }, [todayRecords]);

  const monthlyTrendData = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const ds = fmt(d);
    const dayRecs = records.filter(r => r.date === ds);
    const p = dayRecs.filter(r => r.status === "present").length;
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      pct: dayRecs.length > 0 ? Math.round((p / mockStudents.length) * 100) : 0
    };
  }), [records]);

  // ── Low Attendance Alerts ───────────────────────────────────────────────────
  const lowAttStudents = useMemo(() => mockStudents.filter(s => {
    const sRecs = records.filter(r => r.studentId === s.id);
    const p = sRecs.filter(r => r.status === "present").length;
    return sRecs.length > 0 && (p / sRecs.length) < 0.7;
  }), [records]);

  // ── Tabs Config ─────────────────────────────────────────────────────────────
  const tabs = [
    { id: "overview",   label: "Overview",   icon: "📊" },
    { id: "attendance", label: "Attendance", icon: "✅" },
    { id: "calendar",   label: "Calendar",   icon: "📅" },
    { id: "analytics",  label: "Analytics",  icon: "📈" },
    { id: "leaves",     label: "Leave",      icon: "📋", badge: pendingLeaves },
    { id: "alerts",     label: "Alerts",     icon: "🔔", badge: lowAttStudents.length },
  ];

  const chartAxis = "var(--sd-muted)";
  const chartGrid = "var(--sd-line)";

  return (
    <>
      <style>{CSS}</style>
      <div className="am-root">
        {/* Background Sparkles & Ambient Accents */}
        <div className="am-bg-spark s1" />
        <div className="am-bg-spark s2" />
        <div className="am-bg-spark s3" />

        <div className="am-shell">
          {/* ════ HERO BANNER (Teacher Dashboard Style + Animated Robo Mascot) ════ */}
          <div className="am-hero">
            <div className="am-hero-left">
              <div className="am-chip">
                <span className="am-live-dot" />
                <span>👨‍🏫 Classroom Live Session</span>
                <span style={{ opacity: 0.6 }}>·</span>
                <span>Active</span>
              </div>
              <h1 className="am-hero-title">Attendance Dashboard</h1>
              <p className="am-hero-sub">
                Track daily student attendance, monitor class progress, approve leaves, and notify parents in real-time.
              </p>
              
              <div className="am-hero-pills">
                <div className="am-hero-pill">
                  <span>📅</span>
                  <span>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                </div>
                <div className="am-hero-pill" style={{ color: "#059669" }}>
                  <span>✅</span>
                  <span>{presentCount} Present</span>
                </div>
                <div className="am-hero-pill" style={{ color: "#dc2626" }}>
                  <span>❌</span>
                  <span>{absentCount} Absent</span>
                </div>
                <div className="am-hero-pill" style={{ color: "#0284c7" }}>
                  <span>⚡</span>
                  <span>{attendancePct}% Rate</span>
                </div>
              </div>

              <div className="am-hero-actions">
                <button className="am-btn success" onClick={() => setActiveTab("attendance")}>
                  ⚡ Mark Today's Roll
                </button>
                {lowAttStudents.length > 0 && (
                  <button className="am-btn" onClick={() => setActiveTab("alerts")}>
                    🔔 {lowAttStudents.length} Low Attendance Alerts
                  </button>
                )}
              </div>
            </div>

            {/* Mascot Showcase Panel with Robot Image */}
            <div className="am-hero-right">
              <div className="am-hero-mascot-box">
                <img src={roboWaving} alt="GradeUp AI Robot" className="am-hero-robo" />
                <div className="am-robo-speech">
                  ✨ Daily Goal: 90%+ Rate
                </div>
              </div>
            </div>
          </div>

          {/* ════ NAV TABS ════ */}
          <div className="am-nav">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`am-nav-btn${activeTab === t.id ? " on" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {t.badge && t.badge > 0 ? <span className="am-nav-badge">{t.badge}</span> : null}
              </button>
            ))}
          </div>

          {/* ════ COLORFUL STAT CARDS (Student Dashboard Style) ════ */}
          <div className="am-stats">
            {/* Card 1: Total Enrolled */}
            <motion.div
              className="am-scard theme-blue"
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => setActiveTab("attendance")}
            >
              <div className="am-scard-top">
                <div className="am-scard-icon">👥</div>
                <span className="am-status-badge" style={{ background: "rgba(37,99,235,.12)", color: "#2563eb" }}>Total</span>
              </div>
              <div className="am-scard-n"><AnimNum target={total} /></div>
              <div className="am-scard-l">Enrolled Students</div>
              <div className="am-scard-sub">Class 10 & 12 · All active</div>
            </motion.div>

            {/* Card 2: Present Today */}
            <motion.div
              className="am-scard theme-green"
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => { setFilters(f => ({ ...f, status: "present" })); setActiveTab("attendance"); }}
            >
              <div className="am-scard-top">
                <div className="am-scard-icon">✅</div>
                <span className="am-status-badge" style={{ background: "rgba(16,185,129,.14)", color: "#047857" }}>Present</span>
              </div>
              <div className="am-scard-n"><AnimNum target={presentCount} /></div>
              <div className="am-scard-l">Present Today</div>
              <div className="am-scard-sub">🟢 {attendancePct}% attendance rate</div>
            </motion.div>

            {/* Card 3: Absent Today */}
            <motion.div
              className="am-scard theme-red"
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => { setFilters(f => ({ ...f, status: "absent" })); setActiveTab("attendance"); }}
            >
              <div className="am-scard-top">
                <div className="am-scard-icon">❌</div>
                <span className="am-status-badge" style={{ background: "rgba(239,68,68,.14)", color: "#b91c1c" }}>Absent</span>
              </div>
              <div className="am-scard-n"><AnimNum target={absentCount} /></div>
              <div className="am-scard-l">Absent Today</div>
              <div className="am-scard-sub">🔴 {Math.round(absentCount / total * 100)}% absent</div>
            </motion.div>

            {/* Card 4: Late Arrivals */}
            <motion.div
              className="am-scard theme-amber"
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => { setFilters(f => ({ ...f, status: "late" })); setActiveTab("attendance"); }}
            >
              <div className="am-scard-top">
                <div className="am-scard-icon">⏰</div>
                <span className="am-status-badge" style={{ background: "rgba(245,158,11,.15)", color: "#b45309" }}>Late</span>
              </div>
              <div className="am-scard-n"><AnimNum target={lateCount} /></div>
              <div className="am-scard-l">Late Arrivals</div>
              <div className="am-scard-sub">🕒 Checked in after 9:15 AM</div>
            </motion.div>

            {/* Card 5: On Leave */}
            <motion.div
              className="am-scard theme-teal"
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => setActiveTab("leaves")}
            >
              <div className="am-scard-top">
                <div className="am-scard-icon">📋</div>
                <span className="am-status-badge" style={{ background: "rgba(20,184,166,.15)", color: "#0f766e" }}>Leave</span>
              </div>
              <div className="am-scard-n"><AnimNum target={leaveCount} /></div>
              <div className="am-scard-l">On Leave Today</div>
              <div className="am-scard-sub">📁 {halfCount} half-day leave</div>
            </motion.div>

            {/* Card 6: Attendance % */}
            <motion.div
              className="am-scard theme-orange"
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => setActiveTab("analytics")}
            >
              <div className="am-scard-top">
                <div className="am-scard-icon">📈</div>
                <span className="am-status-badge" style={{ background: "rgba(249,115,22,.15)", color: "#ea580c" }}>Rate</span>
              </div>
              <div className="am-scard-n"><AnimNum target={attendancePct} suffix="%" /></div>
              <div className="am-scard-l">Class Attendance</div>
              <div className="am-scard-sub">✨ Monthly target 90%</div>
            </motion.div>
          </div>

          {/* ════ BODY TABS ════ */}
          <div className="am-body">
            <AnimatePresence mode="wait">
              {/* ───────────────── OVERVIEW TAB ───────────────── */}
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
                  {/* Row 1: Weekly Trend + Distribution Pie */}
                  <div className="am-2col">
                    <div className="am-panel">
                      <div className="am-panel-head">
                        <div>
                          <div className="am-panel-title">📊 7-Day Attendance Trend</div>
                          <div className="am-panel-sub">Presence, absence, and late check-ins over the past week</div>
                        </div>
                      </div>
                      <div className="am-panel-body">
                        <ResponsiveContainer width="100%" height={210}>
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
                        <div className="am-legend" style={{ marginTop: 10 }}>
                          {[["Present", "#10b981"], ["Absent", "#ef4444"], ["Late", "#f59e0b"]].map(([l, c]) => (
                            <div key={l} className="am-legend-item">
                              <div className="am-legend-dot" style={{ background: c }} />
                              <span>{l}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="am-panel">
                      <div className="am-panel-head">
                        <div>
                          <div className="am-panel-title">🥧 Today's Attendance Distribution</div>
                          <div className="am-panel-sub">Breakdown for {selectedDate}</div>
                        </div>
                      </div>
                      <div className="am-panel-body">
                        <ResponsiveContainer width="100%" height={170}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={68} innerRadius={42} dataKey="value" paddingAngle={3}>
                              {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <Tooltip formatter={(v: any, n: any) => [`${v} students`, n]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="am-legend" style={{ justifyContent: "center", marginTop: 8 }}>
                          {pieData.map(d => (
                            <div key={d.name} className="am-legend-item">
                              <div className="am-legend-dot" style={{ background: d.color }} />
                              <span>{d.name} <strong style={{ color: "var(--sd-ink)" }}>{d.value}</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Class-wise + Today's Summary */}
                  <div className="am-2col">
                    <div className="am-panel">
                      <div className="am-panel-head">
                        <div>
                          <div className="am-panel-title">🏫 Class-wise Attendance Rates</div>
                          <div className="am-panel-sub">Comparison across enrolled batches</div>
                        </div>
                      </div>
                      <div className="am-panel-body">
                        <ResponsiveContainer width="100%" height={190}>
                          <BarChart data={classwiseData} barSize={34}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartAxis }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: chartAxis }} axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Tooltip formatter={(v: any) => [`${v}%`, "Attendance"]} />
                            <Bar dataKey="pct" radius={[8, 8, 0, 0]}>
                              {classwiseData.map((d, i) => (
                                <Cell key={i} fill={d.pct >= 85 ? "#10b981" : d.pct >= 70 ? "#f59e0b" : "#ef4444"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="am-panel">
                      <div className="am-panel-head">
                        <div>
                          <div className="am-panel-title">🎯 Attendance Overview</div>
                          <div className="am-panel-sub">Aggregated performance</div>
                        </div>
                      </div>
                      <div className="am-panel-body">
                        <div style={{ textAlign: "center", marginBottom: 14 }}>
                          <div className="am-analytics-num">{attendancePct}<span className="am-analytics-suf">%</span></div>
                          <div className="am-analytics-label">Class presence rate for {selectedDate}</div>
                        </div>
                        <div className="am-stack">
                          {pieData.map((d, i) => (
                            <motion.div
                              key={i}
                              className="am-stack-seg"
                              style={{ background: d.color, flex: 0 }}
                              animate={{ flex: d.value }}
                              transition={{ duration: 1, delay: i * .08 }}
                            />
                          ))}
                        </div>
                        <div className="am-legend">
                          {pieData.map(d => (
                            <div key={d.name} className="am-legend-item">
                              <div className="am-legend-dot" style={{ background: d.color }} />
                              <span>{d.name} <strong style={{ color: "var(--sd-ink)" }}>{Math.round(d.value / total * 100)}%</strong></span>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {[
                            { n: "92%", l: "Monthly Avg", c: "#10b981", bg: "rgba(16,185,129,.1)" },
                            { n: `${lowAttStudents.length}`, l: "Low Attendance", c: "#ef4444", bg: "rgba(239,68,68,.1)" },
                            { n: `${pendingLeaves}`, l: "Pending Leaves", c: "#f59e0b", bg: "rgba(245,158,11,.1)" },
                            { n: `${lateCount}`, l: "Late Arrivals", c: "#0284c7", bg: "rgba(14,165,233,.1)" }
                          ].map((m, i) => (
                            <div key={i} style={{ padding: "12px 14px", borderRadius: 14, background: m.bg, textAlign: "center" }}>
                              <div style={{ fontSize: 21, fontWeight: 900, color: m.c }}>{m.n}</div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)", marginTop: 2 }}>{m.l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alerts preview */}
                  {lowAttStudents.length > 0 && (
                    <div className="am-panel" style={{ marginBottom: 16 }}>
                      <div className="am-panel-head">
                        <div className="am-panel-title">⚠️ Priority Attendance Alerts</div>
                        <button className="am-view-all" onClick={() => setActiveTab("alerts")}>View all alerts →</button>
                      </div>
                      <div className="am-panel-body">
                        {lowAttStudents.slice(0, 3).map(s => {
                          const sr = records.filter(r => r.studentId === s.id);
                          const p = sr.filter(r => r.status === "present").length;
                          const pct = Math.round(p / sr.length * 100);
                          return (
                            <div key={s.id} className="am-alert danger" style={{ marginBottom: 10 }}>
                              <span className="am-alert-icon">⚠️</span>
                              <div style={{ flex: 1 }}>
                                <div className="am-alert-title">{s.name} — Attendance Below 70% ({pct}%)</div>
                                <div className="am-alert-text">Roll #{s.rollNumber} · Class {s.class}-{s.section} · Parent: {s.parentName} ({s.parentContact})</div>
                              </div>
                              <button
                                className="am-btn danger"
                                style={{ padding: "6px 12px", fontSize: 11.5 }}
                                onClick={() => {
                                  setNotifyStudent(s);
                                  setNotifyMsg(`Dear ${s.parentName},\n\nWe are writing to inform you that ${s.name}'s attendance has fallen to ${pct}%, which is below the required 75% threshold.\n\nRegards,\nClass Teacher`);
                                }}
                              >
                                📧 Notify Parent
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ───────────────── ATTENDANCE TAB ───────────────── */}
              {activeTab === "attendance" && (
                <motion.div key="attendance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
                  {/* Filter Toolbar */}
                  <div className="am-panel" style={{ marginBottom: 16 }}>
                    <div className="am-panel-head">
                      <div>
                        <div className="am-panel-title">📅 Date & Filter Controls</div>
                        <div className="am-panel-sub">Select date and filter students by class, section, or attendance status</div>
                      </div>
                    </div>
                    <div className="am-panel-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
                      <div className="am-filters-grid">
                        <div className="am-filter-group">
                          <label className="am-filter-label">Session Date</label>
                          <input
                            type="date"
                            className="am-filter-input"
                            value={selectedDate}
                            onChange={e => { setSelectedDate(e.target.value); setPage(1); }}
                          />
                        </div>
                        <div className="am-filter-group">
                          <label className="am-filter-label">Class</label>
                          <select
                            className="am-filter-select"
                            value={filters.class}
                            onChange={e => { setFilters(f => ({ ...f, class: e.target.value })); setPage(1); }}
                          >
                            <option value="all">All Classes</option>
                            <option value="10">Class 10</option>
                            <option value="12">Class 12</option>
                          </select>
                        </div>
                        <div className="am-filter-group">
                          <label className="am-filter-label">Section</label>
                          <select
                            className="am-filter-select"
                            value={filters.section}
                            onChange={e => { setFilters(f => ({ ...f, section: e.target.value })); setPage(1); }}
                          >
                            <option value="all">All Sections</option>
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                          </select>
                        </div>
                        <div className="am-filter-group">
                          <label className="am-filter-label">Status</label>
                          <select
                            className="am-filter-select"
                            value={filters.status}
                            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
                          >
                            <option value="all">All Status</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="leave">Leave</option>
                            <option value="half-day">Half Day</option>
                          </select>
                        </div>
                        <div className="am-filter-group" style={{ gridColumn: "span 2" }}>
                          <label className="am-filter-label">Search Student</label>
                          <div className="am-search-wrap">
                            <input
                              className="am-filter-input"
                              placeholder="Name, roll number, or email…"
                              value={filters.search}
                              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                              style={{ width: "100%", paddingRight: 32 }}
                            />
                            <span className="am-search-icon">🔍</span>
                          </div>
                        </div>
                        <div className="am-filter-group">
                          <label className="am-filter-label" style={{ opacity: 0 }}>Reset</label>
                          <button
                            className="am-btn"
                            style={{ width: "100%", justifyContent: "center" }}
                            onClick={() => { setFilters({ class: "all", section: "all", status: "all", search: "" }); setPage(1); }}
                          >
                            ↺ Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div className="am-panel">
                    <div className="am-panel-head">
                      <div className="am-panel-title">
                        👩‍🎓 Student Roll — {sorted.length} {sorted.length === 1 ? "student" : "students"}
                      </div>
                    </div>
                    <div className="am-panel-body">
                      <div className="am-table-controls">
                        <div className="am-btn-group">
                          <button className="am-btn success" onClick={() => markAll("present")}>
                            ✅ Mark All Present
                          </button>
                          <button className="am-btn danger" onClick={() => markAll("absent")}>
                            ❌ Mark All Absent
                          </button>
                        </div>
                        <div className="am-btn-group">
                          <button className="am-btn" onClick={() => showToast("Exported attendance report to PDF", "info")}>
                            📄 Export PDF
                          </button>
                          <button className="am-btn" onClick={() => showToast("Exported attendance list to CSV", "info")}>
                            📊 Export CSV
                          </button>
                        </div>
                      </div>

                      <div className="am-table-wrap">
                        <table className="am-table">
                          <thead>
                            <tr>
                              <th className="am-th" onClick={() => toggleSort("name")}>
                                Student {sort.key === "name" ? (sort.dir === "asc" ? "↑" : "↓") : <span className="am-sort-icon">↕</span>}
                              </th>
                              <th className="am-th" onClick={() => toggleSort("rollNumber")}>Roll #</th>
                              <th className="am-th">Class</th>
                              <th className="am-th" onClick={() => toggleSort("status")}>Status</th>
                              <th className="am-th">Check-In</th>
                              <th className="am-th">Check-Out</th>
                              <th className="am-th">Quick Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginated.map(s => (
                              <motion.tr
                                key={s.id}
                                className="am-tr"
                                onClick={() => setSelectedStudent(s)}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                <td className="am-td">
                                  <div className="am-student-cell">
                                    <img src={s.photo} alt={s.name} className="am-student-photo" />
                                    <div>
                                      <div className="am-student-name">{s.name}</div>
                                      <div className="am-student-roll">{s.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="am-td" style={{ fontWeight: 800 }}>{s.rollNumber}</td>
                                <td className="am-td">{s.class}-{s.section}</td>
                                <td className="am-td">
                                  <span className={`am-status-badge am-status-${s.att.status}`}>
                                    {s.att.status}
                                  </span>
                                </td>
                                <td className="am-td">{s.att.checkIn || "—"}</td>
                                <td className="am-td">{s.att.checkOut || "—"}</td>
                                <td className="am-td" onClick={e => e.stopPropagation()}>
                                  <button className="am-action-btn am-action-present" title="Mark Present" onClick={e => updateAtt(s.id, "present", e)}>✅</button>
                                  <button className="am-action-btn am-action-absent"  title="Mark Absent"  onClick={e => updateAtt(s.id, "absent", e)}>❌</button>
                                  <button className="am-action-btn am-action-late"    title="Mark Late"    onClick={e => updateAtt(s.id, "late", e)}>⏰</button>
                                  <button className="am-action-btn am-action-leave"   title="Mark Leave"   onClick={e => updateAtt(s.id, "leave", e)}>📁</button>
                                  <button className="am-action-btn am-action-halfday" title="Mark Half-Day" onClick={e => updateAtt(s.id, "half-day", e)}>½</button>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {paginated.length === 0 && (
                        <div className="am-empty">
                          <div className="am-empty-icon">🔍</div>
                          <div className="am-empty-text">No students found</div>
                          <div className="am-empty-sub">Try adjusting your filters or search keywords</div>
                        </div>
                      )}

                      <div className="am-pagination">
                        <span className="am-page-info">{sorted.length} students · Page {page} of {totalPages}</span>
                        <button className="am-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pg = page <= 3 ? i + 1 : page + i - 2;
                          if (pg > totalPages) return null;
                          return (
                            <button
                              key={pg}
                              className={`am-page-btn${page === pg ? " on" : ""}`}
                              onClick={() => setPage(pg)}
                            >
                              {pg}
                            </button>
                          );
                        })}
                        <button className="am-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ───────────────── CALENDAR TAB ───────────────── */}
              {activeTab === "calendar" && (
                <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
                  <div className="am-main-grid">
                    <div className="am-panel">
                      <div className="am-panel-head">
                        <div>
                          <div className="am-panel-title">📅 Monthly Attendance Calendar</div>
                          <div className="am-panel-sub">Select any date to view records, daily percentages, and student rosters</div>
                        </div>
                      </div>
                      <div className="am-panel-body">
                        <AttendanceCalendar selectedDate={selectedDate} onSelect={d => setSelectedDate(d)} records={records} />
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div className="am-panel">
                        <div className="am-panel-head">
                          <div className="am-panel-title">📊 Session Details ({selectedDate})</div>
                        </div>
                        <div className="am-panel-body">
                          {[
                            { label: "Present", count: todayRecords.filter(r => r.status === "present").length, color: "#10b981" },
                            { label: "Absent",  count: todayRecords.filter(r => r.status === "absent").length,  color: "#ef4444" },
                            { label: "Late",    count: todayRecords.filter(r => r.status === "late").length,    color: "#f59e0b" },
                            { label: "Leave",   count: todayRecords.filter(r => r.status === "leave").length,   color: "#0ea5e9" },
                          ].map(d => (
                            <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--sd-line)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
                                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--sd-ink)" }}>{d.label}</span>
                              </div>
                              <span style={{ fontSize: 16, fontWeight: 900, color: d.color }}>{d.count}</span>
                            </div>
                          ))}
                          <button className="am-btn primary" style={{ width: "100%", marginTop: 16, justifyContent: "center" }} onClick={() => setActiveTab("attendance")}>
                            📝 Manage This Day
                          </button>
                        </div>
                      </div>

                      <div className="am-panel">
                        <div className="am-panel-head">
                          <div className="am-panel-title">📈 15-Day Attendance Curve</div>
                        </div>
                        <div className="am-panel-body">
                          <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={monthlyTrendData.slice(-15)}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                              <XAxis dataKey="date" tick={{ fontSize: 9, fill: chartAxis }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 9, fill: chartAxis }} axisLine={false} tickLine={false} domain={[0, 100]} />
                              <Tooltip formatter={(v: any) => [`${v}%`, "Rate"]} />
                              <Line type="monotone" dataKey="pct" stroke="#0284c7" strokeWidth={2.5} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ───────────────── ANALYTICS TAB ───────────────── */}
              {activeTab === "analytics" && (
                <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
                  <div className="am-3col">
                    <div className="am-panel" style={{ gridColumn: "span 2" }}>
                      <div className="am-panel-head">
                        <div>
                          <div className="am-panel-title">📈 30-Day Attendance Overview</div>
                          <div className="am-panel-sub">Daily class attendance percentage recorded over the last month</div>
                        </div>
                        <div style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(14,165,233,.12)", color: "#0284c7", fontSize: 12, fontWeight: 800 }}>
                          Avg {Math.round(monthlyTrendData.reduce((a, b) => a + b.pct, 0) / monthlyTrendData.length)}%
                        </div>
                      </div>
                      <div className="am-panel-body">
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={monthlyTrendData}>
                            <defs>
                              <linearGradient id="gMonth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: chartAxis }} axisLine={false} tickLine={false} interval={4} />
                            <YAxis tick={{ fontSize: 11, fill: chartAxis }} axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Tooltip formatter={(v: any) => [`${v}%`, "Attendance"]} />
                            <Area type="monotone" dataKey="pct" stroke="#0284c7" strokeWidth={2.5} fill="url(#gMonth)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="am-panel">
                      <div className="am-panel-head">
                        <div className="am-panel-title">🎯 Class Performance</div>
                      </div>
                      <div className="am-panel-body">
                        <ResponsiveContainer width="100%" height={220}>
                          <RadarChart data={[
                            { subject: "10-A", att: 87 },
                            { subject: "12-B", att: 82 },
                            { subject: "Overall", att: attendancePct },
                            { subject: "Target", att: 90 },
                          ]}>
                            <PolarGrid stroke={chartGrid} />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: chartAxis }} />
                            <Radar dataKey="att" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.25} />
                            <Tooltip formatter={(v: any) => [`${v}%`]} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Student Ranking Grid */}
                  <div className="am-panel" style={{ marginBottom: 16 }}>
                    <div className="am-panel-head">
                      <div>
                        <div className="am-panel-title">🏆 Student Attendance Rankings</div>
                        <div className="am-panel-sub">Ranked by individual presence rate</div>
                      </div>
                    </div>
                    <div className="am-panel-body">
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                        {mockStudents.map(s => {
                          const sr = records.filter(r => r.studentId === s.id);
                          const p = sr.filter(r => r.status === "present").length;
                          const pct = sr.length > 0 ? Math.round(p / sr.length * 100) : 0;
                          return (
                            <motion.div
                              key={s.id}
                              style={{
                                borderRadius: 16,
                                padding: "12px 14px",
                                border: "1.5px solid var(--sd-line)",
                                background: "var(--sd-card-soft)",
                                cursor: "pointer",
                                transition: "all .2s"
                              }}
                              whileHover={{ scale: 1.02, boxShadow: "var(--sd-shadow)" }}
                              onClick={() => setSelectedStudent(s)}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                <img src={s.photo} alt={s.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--sd-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                                  <div style={{ fontSize: 11, color: "var(--sd-muted)" }}>Class {s.class}-{s.section}</div>
                                </div>
                                <span style={{ fontSize: 14.5, fontWeight: 900, color: pct >= 85 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444" }}>
                                  {pct}%
                                </span>
                              </div>
                              <div style={{ height: 6, background: "rgba(15,23,42,.08)", borderRadius: 6, overflow: "hidden" }}>
                                <motion.div
                                  style={{
                                    height: "100%",
                                    borderRadius: 6,
                                    background: pct >= 85 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444",
                                    width: 0
                                  }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: .8 }}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Weekly Bar Comparison & Absence Heatmap */}
                  <div className="am-2col">
                    <div className="am-panel">
                      <div className="am-panel-head">
                        <div className="am-panel-title">📊 Weekly Presence Comparison</div>
                      </div>
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
                      <div className="am-panel-head">
                        <div className="am-panel-title">📉 Absence Frequency Heatmap</div>
                      </div>
                      <div className="am-panel-body">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
                            <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 800, color: "var(--sd-muted)" }}>{d}</div>
                          ))}
                          {Array.from({ length: 35 }, (_, i) => {
                            const absences = (i % 5 === 0) ? 3 : (i % 7 === 0) ? 4 : (i % 3 === 0) ? 1 : 0;
                            const opacity = absences / 4;
                            return (
                              <div
                                key={i}
                                style={{
                                  height: 22,
                                  borderRadius: 6,
                                  background: `rgba(239, 68, 68, ${0.1 + opacity * 0.7})`,
                                  cursor: "pointer",
                                  transition: "transform .15s"
                                }}
                                title={`${absences} absences recorded`}
                                onMouseOver={e => (e.currentTarget.style.transform = "scale(1.15)")}
                                onMouseOut={e => (e.currentTarget.style.transform = "")}
                              />
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 11, color: "var(--sd-muted)", fontWeight: 700 }}>
                          <span>Fewer absences</span>
                          {[0.1, 0.3, 0.5, 0.7, 0.9].map(o => (
                            <div key={o} style={{ width: 14, height: 14, borderRadius: 4, background: `rgba(239, 68, 68, ${o})` }} />
                          ))}
                          <span>More absences</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ───────────────── LEAVES TAB ───────────────── */}
              {activeTab === "leaves" && (
                <motion.div key="leaves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
                  <div className="am-main-grid">
                    <div>
                      {/* Pending Leaves */}
                      <div className="am-panel" style={{ marginBottom: 16 }}>
                        <div className="am-panel-head">
                          <div>
                            <div className="am-panel-title">⏳ Pending Leave Requests</div>
                            <div className="am-panel-sub">{leaves.filter(l => l.status === "pending").length} requests awaiting your review</div>
                          </div>
                        </div>
                        <div className="am-panel-body">
                          {leaves.filter(l => l.status === "pending").length === 0 ? (
                            <div className="am-empty">
                              <div className="am-empty-icon">🎉</div>
                              <div className="am-empty-text">All caught up!</div>
                              <div className="am-empty-sub">No pending student leave requests</div>
                            </div>
                          ) : leaves.filter(l => l.status === "pending").map(l => (
                            <div key={l.id} className="am-leave-item">
                              <div className="am-leave-item-head">
                                <div>
                                  <div className="am-leave-item-name">{l.studentName}</div>
                                  <div className="am-leave-item-meta">Class {l.class}-{l.section} · {l.fromDate} → {l.toDate}</div>
                                  <div className="am-leave-item-meta" style={{ marginTop: 4 }}>📝 Reason: {l.reason}</div>
                                </div>
                                <span className="am-status-badge am-status-pending">Pending</span>
                              </div>
                              <div className="am-leave-actions">
                                <button
                                  className="am-btn success"
                                  onClick={() => {
                                    setLeaves(p => p.map(r => r.id === l.id ? { ...r, status: "approved" } : r));
                                    showToast("Leave request approved", "success");
                                  }}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  className="am-btn danger"
                                  onClick={() => {
                                    setLeaves(p => p.map(r => r.id === l.id ? { ...r, status: "rejected" } : r));
                                    showToast("Leave request rejected", "error");
                                  }}
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Leave History */}
                      <div className="am-panel">
                        <div className="am-panel-head">
                          <div className="am-panel-title">📜 Resolved Leave Requests</div>
                        </div>
                        <div className="am-panel-body">
                          {leaves.filter(l => l.status !== "pending").map(l => (
                            <div key={l.id} className="am-leave-item">
                              <div className="am-leave-item-head">
                                <div>
                                  <div className="am-leave-item-name">{l.studentName}</div>
                                  <div className="am-leave-item-meta">Class {l.class}-{l.section} · {l.fromDate} → {l.toDate}</div>
                                  <div className="am-leave-item-meta" style={{ marginTop: 4 }}>📝 Reason: {l.reason}</div>
                                </div>
                                <span className={`am-status-badge am-status-${l.status}`}>{l.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Stats Sidebar */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div className="am-panel">
                        <div className="am-panel-head">
                          <div className="am-panel-title">📊 Leave Summary</div>
                        </div>
                        <div className="am-panel-body">
                          {[
                            { l: "Total Requests", v: leaves.length, c: "#0284c7" },
                            { l: "Pending",        v: leaves.filter(l => l.status === "pending").length,  c: "#f59e0b" },
                            { l: "Approved",       v: leaves.filter(l => l.status === "approved").length, c: "#10b981" },
                            { l: "Rejected",       v: leaves.filter(l => l.status === "rejected").length, c: "#ef4444" },
                          ].map(d => (
                            <div key={d.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--sd-line)" }}>
                              <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--sd-muted)" }}>{d.l}</span>
                              <span style={{ fontSize: 17, fontWeight: 900, color: d.c }}>{d.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="am-panel">
                        <div className="am-panel-head">
                          <div className="am-panel-title">🥧 Status Distribution</div>
                        </div>
                        <div className="am-panel-body">
                          <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: "Approved", value: leaves.filter(l => l.status === "approved").length, color: "#10b981" },
                                  { name: "Pending",  value: leaves.filter(l => l.status === "pending").length,  color: "#f59e0b" },
                                  { name: "Rejected", value: leaves.filter(l => l.status === "rejected").length, color: "#ef4444" },
                                ].filter(d => d.value > 0)}
                                cx="50%" cy="50%" outerRadius={56} innerRadius={32} dataKey="value"
                              >
                                {[{ color: "#10b981" }, { color: "#f59e0b" }, { color: "#ef4444" }].map((d, i) => (
                                  <Cell key={i} fill={d.color} />
                                ))}
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

              {/* ───────────────── ALERTS TAB ───────────────── */}
              {activeTab === "alerts" && (
                <motion.div key="alerts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
                  <div className="am-2col">
                    <div>
                      <div className="am-panel" style={{ marginBottom: 16 }}>
                        <div className="am-panel-head">
                          <div>
                            <div className="am-panel-title">⚠️ Low Attendance Alert List</div>
                            <div className="am-panel-sub">Students with cumulative attendance below the standard 70% threshold</div>
                          </div>
                        </div>
                        <div className="am-panel-body">
                          {lowAttStudents.length === 0 ? (
                            <div className="am-empty">
                              <div className="am-empty-icon">✅</div>
                              <div className="am-empty-text">No active alerts!</div>
                              <div className="am-empty-sub">All students currently maintain regular attendance</div>
                            </div>
                          ) : lowAttStudents.map(s => {
                            const sr = records.filter(r => r.studentId === s.id);
                            const p = sr.filter(r => r.status === "present").length;
                            const pct = Math.round(p / sr.length * 100);
                            return (
                              <motion.div
                                key={s.id}
                                style={{
                                  border: "1.5px solid var(--sd-line)",
                                  borderRadius: 16,
                                  padding: 14,
                                  marginBottom: 12,
                                  background: "var(--sd-card-soft)",
                                  cursor: "pointer",
                                }}
                                whileHover={{ scale: 1.01 }}
                                onClick={() => setSelectedStudent(s)}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <img src={s.photo} alt={s.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #ef4444" }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 900, color: "var(--sd-ink)", marginBottom: 2 }}>{s.name}</div>
                                    <div style={{ fontSize: 12, color: "var(--sd-muted)", marginBottom: 6 }}>Roll #{s.rollNumber} · Class {s.class}-{s.section}</div>
                                    <div style={{ height: 6, background: "rgba(15,23,42,.08)", borderRadius: 6, overflow: "hidden" }}>
                                      <div style={{ height: "100%", width: `${pct}%`, background: "#ef4444", borderRadius: 6 }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11.5, fontWeight: 700 }}>
                                      <span style={{ color: "var(--sd-muted)" }}>{sr.length} days recorded</span>
                                      <span style={{ color: "#ef4444" }}>{pct}% attendance</span>
                                    </div>
                                  </div>
                                  <button
                                    className="am-btn danger"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setNotifyStudent(s);
                                      setNotifyMsg(`Dear ${s.parentName},\n\nWe are writing to inform you that ${s.name}'s attendance has fallen to ${pct}%, which is below the required 75% threshold.\n\nPlease ensure regular attendance.\n\nRegards,\nClass Teacher`);
                                    }}
                                    style={{ fontSize: 11.5, padding: "6px 12px" }}
                                  >
                                    📧 Notify
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="am-panel" style={{ marginBottom: 16 }}>
                        <div className="am-panel-head">
                          <div className="am-panel-title">🔔 Classroom Alerts & Notifications</div>
                        </div>
                        <div className="am-panel-body">
                          {[
                            { icon: "🔴", title: "Consecutive Absences", text: `${records.filter(r => r.status === "absent").length > 0 ? "3 students" : "None"} absent 3+ consecutive days`, type: "danger" as const },
                            { icon: "⏰", title: "Frequent Late Arrivals", text: `${lateCount} students arrived late today`, type: "warn" as const },
                            { icon: "📋", title: "Pending Leave Requests", text: `${pendingLeaves} leave request${pendingLeaves !== 1 ? "s" : ""} awaiting approval`, type: "warn" as const },
                          ].map((a, i) => (
                            <div key={i} className={`am-alert ${a.type}`}>
                              <span className="am-alert-icon">{a.icon}</span>
                              <div>
                                <div className="am-alert-title">{a.title}</div>
                                <div className="am-alert-text">{a.text}</div>
                              </div>
                            </div>
                          ))}

                          <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--sd-ink)", marginBottom: 10 }}>📬 Quick Dispatch Actions</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {[
                                { label: "Notify All Absent Student Parents", icon: "📧" },
                                { label: "Send Daily Attendance Report to Admin", icon: "📄" },
                                { label: "Alert Low-Attendance Parents via SMS", icon: "⚠️" },
                              ].map((a, i) => (
                                <button
                                  key={i}
                                  className="am-btn"
                                  style={{ justifyContent: "flex-start", width: "100%" }}
                                  onClick={() => showToast(`${a.icon} ${a.label} triggered`, "success")}
                                >
                                  {a.icon} {a.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Student Profile Drawer ── */}
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

        {/* ── Notify Parent Modal ── */}
        <AnimatePresence>
          {notifyStudent && (
            <motion.div
              className="am-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotifyStudent(null)}
            >
              <motion.div
                className="am-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="am-modal-head">
                  <div className="am-modal-title">📧 Notify Parent — {notifyStudent.parentName}</div>
                  <button className="am-drawer-close" onClick={() => setNotifyStudent(null)}>✕</button>
                </div>
                <div className="am-modal-body">
                  <div style={{ fontSize: 13, color: "var(--sd-muted)" }}>
                    Message to parent of <strong style={{ color: "var(--sd-ink)" }}>{notifyStudent.name}</strong> (Roll #{notifyStudent.rollNumber})
                  </div>
                  <textarea
                    className="am-textarea"
                    value={notifyMsg}
                    onChange={e => setNotifyMsg(e.target.value)}
                  />
                  <div style={{ fontSize: 12, color: "var(--sd-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>📱</span>
                    <span>Will be delivered to {notifyStudent.parentContact} & {notifyStudent.email}</span>
                  </div>
                </div>
                <div className="am-modal-footer">
                  <button className="am-btn" onClick={() => setNotifyStudent(null)}>Cancel</button>
                  <button
                    className="am-btn primary"
                    onClick={() => {
                      setNotifyStudent(null);
                      showToast("Notification successfully dispatched to parent!", "success");
                    }}
                  >
                    📧 Send Notification
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Toast Notifications ── */}
        <AnimatePresence>
          {toast && <Toast key={toast.msg} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>
      </div>
    </>
  );
}

