import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "../components/navigation";
import {
  Trophy, Star, Flame, TrendingUp, BookOpen, Brain, Zap,
  Crown, Medal, Sparkles, Users, Loader2, Target, Clock,
  ChevronUp, Award,
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { useNotificationStore } from "../lib/notification-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";

// ── Dashboard design tokens (exact match) ─────────────────────────────────────
// Hero:    linear-gradient(135deg, #6366f1, #8b5cf6 50%, #ec4899)
// Accent:  #6366f1  Purple: #8b5cf6  Pink: #ec4899
// Success: #10b981  Amber: #f59e0b   Sky: #0ea5e9  Rose: #ef4444
// Body:    #f8fafc  Surface: #fff    Text: #0f172a
// Muted:   #64748b  Subtle: #94a3b8  Border: rgba(0,0,0,.06)
// Cards:   border-radius:20px · box-shadow:0 2px 12px rgba(0,0,0,.05)
// Font:    Plus Jakarta Sans 400–800
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

.pg-root{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:var(--bg-app,#f8fafc);
  min-height:100vh;color:var(--text-main,#0f172a);transition:background .3s,color .3s;}

/* ── Hero banner ── */
.pg-hero{margin:24px 28px 0;border-radius:24px;padding:32px 40px;
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  position:relative;overflow:hidden;color:#fff;
  box-shadow:0 8px 32px rgba(99,102,241,.28);
  animation:heroIn .55s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes heroIn{from{opacity:0;transform:translateY(-16px) scale(.97)}to{opacity:1;transform:none}}
.pg-hero::before{content:'';position:absolute;top:-80px;right:-80px;width:280px;height:280px;
  border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none;}
.pg-hero::after{content:'';position:absolute;bottom:-60px;left:25%;width:200px;height:200px;
  border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none;}
.pg-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.pg-hero-left{}
.pg-hero-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:20px;
  margin-bottom:10px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);
  font-size:12px;font-weight:700;color:#fff;}
.pg-hero-title{font-size:clamp(22px,3vw,32px);font-weight:800;color:#fff;margin-bottom:6px;letter-spacing:-.3px;}
.pg-hero-sub{font-size:13.5px;color:rgba(255,255,255,.72);line-height:1.6;}
.pg-hero-stats{display:flex;gap:10px;flex-shrink:0;}
.pg-hstat{text-align:center;padding:12px 18px;border-radius:16px;min-width:68px;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);}
.pg-hstat-n{font-size:22px;font-weight:800;color:#fff;line-height:1;}
.pg-hstat-l{font-size:10.5px;color:rgba(255,255,255,.6);margin-top:2px;}

/* ── Stat cards — dashboard border-top pattern ── */
.pg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:20px 28px 0;}
.pg-scard{background:#fff;border-radius:20px;padding:20px;
  border:1px solid rgba(0,0,0,.06);box-shadow:0 2px 12px rgba(0,0,0,.05);
  transition:all .28s cubic-bezier(.4,0,.2,1);
  animation:scardIn .5s cubic-bezier(.34,1.56,.64,1) both;position:relative;overflow:hidden;}
@keyframes scardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.pg-scard:hover{transform:translateY(-6px) scale(1.01);box-shadow:0 12px 32px rgba(0,0,0,.1);}
.pg-scard.blue  {border-top:3px solid #6366f1;}
.pg-scard.green {border-top:3px solid #10b981;}
.pg-scard.amber {border-top:3px solid #f59e0b;}
.pg-scard.purple{border-top:3px solid #8b5cf6;}
.pg-scard-icon{width:40px;height:40px;border-radius:12px;margin-bottom:12px;
  display:flex;align-items:center;justify-content:center;}
.pg-scard.blue   .pg-scard-icon{background:rgba(99,102,241,.1);}
.pg-scard.green  .pg-scard-icon{background:rgba(16,185,129,.1);}
.pg-scard.amber  .pg-scard-icon{background:rgba(245,158,11,.1);}
.pg-scard.purple .pg-scard-icon{background:rgba(139,92,246,.1);}
.pg-scard-n{font-size:30px;font-weight:800;color:#0f172a;letter-spacing:-1px;line-height:1;}
.pg-scard-l{font-size:12.5px;color:#64748b;margin-top:4px;font-weight:500;}
.pg-scard-sub{font-size:11.5px;color:#94a3b8;margin-top:6px;display:flex;align-items:center;gap:4px;font-weight:500;}
.dark .pg-scard{background:#1e293b;border-color:rgba(255,255,255,.08);}
.dark .pg-scard-n{color:#f1f5f9;}
.dark .pg-scard-l{color:#94a3b8;}
.dark .pg-scard-sub{color:#64748b;}

/* Level progress bar inside card */
.pg-lvl-track{height:6px;background:rgba(0,0,0,.07);border-radius:6px;margin-top:10px;overflow:hidden;}
.dark .pg-lvl-track{background:rgba(255,255,255,.1);}
.pg-lvl-fill{height:100%;border-radius:6px;background:linear-gradient(90deg,#6366f1,#8b5cf6);
  transition:width .7s cubic-bezier(.4,0,.2,1);}
.pg-lvl-label{display:flex;justify-content:space-between;font-size:10.5px;color:#94a3b8;font-weight:600;margin-top:4px;}

/* ── Body ── */
.pg-body{padding:20px 28px 60px;}

/* ── Tab bar — dashboard style ── */
.pg-tabs{display:flex;gap:4px;background:#fff;border-radius:16px;padding:5px;
  border:1px solid rgba(0,0,0,.06);box-shadow:0 2px 8px rgba(0,0,0,.04);
  margin-bottom:20px;overflow-x:auto;scrollbar-width:none;}
.pg-tabs::-webkit-scrollbar{display:none;}
.dark .pg-tabs{background:#1e293b;border-color:rgba(255,255,255,.08);}
.pg-tab{flex:1;min-width:fit-content;display:flex;align-items:center;justify-content:center;gap:7px;
  padding:10px 18px;border-radius:12px;border:none;background:transparent;
  font-family:inherit;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;
  transition:all .2s cubic-bezier(.4,0,.2,1);white-space:nowrap;}
.pg-tab:hover{background:rgba(99,102,241,.06);color:#6366f1;}
.pg-tab.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
  box-shadow:0 4px 12px rgba(99,102,241,.32);}
.dark .pg-tab{color:#94a3b8;}
.dark .pg-tab:hover{background:rgba(99,102,241,.15);color:#a5b4fc;}

/* ── Panel card ── */
.pg-panel{background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05);overflow:hidden;}
.dark .pg-panel{background:#1e293b;border-color:rgba(255,255,255,.08);}
.pg-panel-head{padding:18px 22px 14px;border-bottom:1px solid #f1f5f9;}
.dark .pg-panel-head{border-color:rgba(255,255,255,.06);}
.pg-panel-title{font-size:15px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;}
.dark .pg-panel-title{color:#f1f5f9;}
.pg-panel-sub{font-size:12.5px;color:#64748b;margin-top:3px;font-weight:500;}
.dark .pg-panel-sub{color:#94a3b8;}
.pg-panel-body{padding:20px 22px;}

/* ── Overview grid ── */
.pg-2col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}

/* ── Achievement cards ── */
.pg-ach-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.pg-ach{border-radius:16px;padding:18px 14px;text-align:center;cursor:default;
  transition:all .22s cubic-bezier(.34,1.56,.64,1);border:1.5px solid transparent;position:relative;}
.pg-ach:hover{transform:translateY(-4px) scale(1.02);}
.pg-ach.unlocked{box-shadow:0 4px 20px rgba(0,0,0,.12);}
.pg-ach.locked{background:#f8fafc;border-color:rgba(0,0,0,.06);}
.dark .pg-ach.locked{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08);}
.pg-ach-emoji{font-size:32px;display:block;margin-bottom:10px;}
.pg-ach.locked .pg-ach-emoji{filter:grayscale(1);opacity:.4;}
.pg-ach-name{font-size:12.5px;font-weight:700;line-height:1.3;margin-bottom:4px;}
.pg-ach.unlocked .pg-ach-name{color:#fff;}
.pg-ach.locked  .pg-ach-name{color:#94a3b8;}
.pg-ach-desc{font-size:11px;opacity:.8;line-height:1.5;}
.pg-ach.unlocked .pg-ach-desc{color:rgba(255,255,255,.85);}
.pg-ach.locked  .pg-ach-desc{color:#94a3b8;}
.pg-ach-rarity{position:absolute;top:10px;right:10px;font-size:9.5px;font-weight:800;
  padding:2px 7px;border-radius:6px;text-transform:uppercase;letter-spacing:.06em;}
.pg-ach.unlocked .pg-ach-rarity{background:rgba(255,255,255,.25);color:#fff;}
.pg-ach.locked  .pg-ach-rarity{background:rgba(0,0,0,.06);color:#94a3b8;}
.pg-ach-trophy{position:absolute;top:8px;left:10px;}

/* Rarity gradients — dashboard accent colours */
.pg-ach.common   {background:linear-gradient(135deg,#64748b,#475569);}
.pg-ach.rare     {background:linear-gradient(135deg,#0ea5e9,#0284c7);}
.pg-ach.epic     {background:linear-gradient(135deg,#8b5cf6,#6366f1);}
.pg-ach.legendary{background:linear-gradient(135deg,#f59e0b,#ec4899);}

/* ── Leaderboard ── */
.pg-lb-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;
  margin-bottom:6px;border:1.5px solid #f1f5f9;transition:all .18s;}
.dark .pg-lb-row{border-color:rgba(255,255,255,.07);}
.pg-lb-row:hover{background:rgba(99,102,241,.04);border-color:#c7d2fe;}
.pg-lb-row.me{background:rgba(99,102,241,.07);border-color:#c7d2fe;}
.dark .pg-lb-row.me{background:rgba(99,102,241,.18);}
.pg-lb-rank{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;
  justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
.pg-lb-rank.gold  {background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;box-shadow:0 3px 8px rgba(245,158,11,.4);}
.pg-lb-rank.silver{background:linear-gradient(135deg,#94a3b8,#64748b);color:#fff;}
.pg-lb-rank.bronze{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;}
.pg-lb-rank.other {background:#f1f5f9;color:#64748b;}
.dark .pg-lb-rank.other{background:rgba(255,255,255,.1);color:#94a3b8;}
.pg-lb-name{flex:1;font-size:13.5px;font-weight:600;color:#0f172a;}
.dark .pg-lb-name{color:#f1f5f9;}
.pg-lb-you{font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;
  background:rgba(99,102,241,.1);color:#6366f1;margin-left:6px;}
.dark .pg-lb-you{background:rgba(99,102,241,.2);color:#a5b4fc;}
.pg-lb-pts{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:700;color:#0f172a;}
.dark .pg-lb-pts{color:#f1f5f9;}
.pg-lb-streak{display:flex;align-items:center;gap:4px;font-size:12px;color:#f59e0b;font-weight:600;}
.pg-lb-medal{font-size:18px;flex-shrink:0;}

/* ── Analytics progress bars ── */
.pg-goal-row{margin-bottom:16px;}
.pg-goal-label{display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;
  color:#374151;margin-bottom:6px;}
.dark .pg-goal-label{color:#94a3b8;}
.pg-goal-track{height:8px;background:#f1f5f9;border-radius:8px;overflow:hidden;}
.dark .pg-goal-track{background:rgba(255,255,255,.08);}
.pg-goal-fill{height:100%;border-radius:8px;transition:width .7s cubic-bezier(.4,0,.2,1);}

/* Period selector */
.pg-period{display:flex;gap:6px;margin-bottom:20px;}
.pg-period-btn{padding:6px 16px;border-radius:20px;border:1.5px solid #e2e8f0;
  background:#fff;font-family:inherit;font-size:12px;font-weight:600;color:#64748b;
  cursor:pointer;transition:all .18s;}
.pg-period-btn:hover{border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,.06);}
.pg-period-btn.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
  border-color:transparent;box-shadow:0 3px 10px rgba(99,102,241,.3);}
.dark .pg-period-btn{background:#1e293b;border-color:rgba(255,255,255,.1);color:#94a3b8;}

/* Level up overlay */
.pg-lvlup-overlay{position:fixed;inset:0;z-index:50;display:flex;align-items:center;
  justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);cursor:pointer;}
.pg-lvlup-card{background:linear-gradient(135deg,#f59e0b,#ec4899);border-radius:24px;
  padding:40px 48px;text-align:center;color:#fff;
  box-shadow:0 24px 64px rgba(0,0,0,.3);border:2px solid rgba(255,255,255,.3);}
.pg-lvlup-title{font-size:36px;font-weight:800;margin:16px 0 8px;letter-spacing:-.5px;}
.pg-lvlup-sub{font-size:18px;opacity:.9;}

/* New achievement toast */
.pg-toast{position:fixed;top:80px;right:20px;z-index:40;
  background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;
  padding:14px 18px;border-radius:16px;box-shadow:0 8px 28px rgba(139,92,246,.4);
  display:flex;align-items:center;gap:12px;max-width:300px;}
.pg-toast-close{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.7);
  cursor:pointer;font-size:18px;line-height:1;padding:0;}

/* ── Leaderboard header flex fix ── */
.pg-lb-header-wrap{
  display:flex;
  align-items:center;
  justify-content:space-between;
  flex-wrap:wrap;
  gap:12px;
}

/* ── Quick stats row ── */
.pg-quick-stats{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:14px;
}

/* ── Responsive ── */

/* 1280px – keep 4-col stat cards, adjust hero padding */
@media(max-width:1280px){
  .pg-hero{margin:20px 20px 0;padding:28px 32px;}
  .pg-stats{padding:18px 20px 0;}
  .pg-body{padding:18px 20px 60px;}
}

/* 1100px – 2-col stat cards, single-col overview panels */
@media(max-width:1100px){
  .pg-stats{grid-template-columns:repeat(2,1fr);}
  .pg-2col{grid-template-columns:1fr;}
  .pg-ach-grid{grid-template-columns:repeat(3,1fr);}
  .pg-quick-stats{grid-template-columns:repeat(3,1fr);}
}

/* 900px – tighten horizontal margins, hide hero stats */
@media(max-width:900px){
  .pg-hero{margin:14px 16px 0;padding:26px 24px;}
  .pg-hero-stats{display:none;}
  .pg-stats{padding:16px 16px 0;gap:12px;}
  .pg-body{padding:16px 16px 56px;}
}

/* 768px – mobile-friendly layout */
@media(max-width:768px){
  .pg-hero{margin:12px 12px 0;padding:20px 18px;border-radius:18px;}
  .pg-hero-title{font-size:20px;}
  .pg-stats{grid-template-columns:repeat(2,1fr);padding:14px 12px 0;}
  .pg-scard{padding:16px;}
  .pg-body{padding:14px 12px 56px;}
  .pg-ach-grid{grid-template-columns:repeat(2,1fr);}
  .pg-panel-body{padding:16px;}
  .pg-quick-stats{grid-template-columns:repeat(2,1fr);gap:12px;}
  /* tab labels shrink to icon only on very narrow */
  .pg-tab-label{display:inline;}
  /* leaderboard header stacks */
  .pg-lb-header-wrap{flex-direction:column;align-items:flex-start;}
  /* period selector moves below title */
  .pg-period{margin-bottom:0;}
}

/* 600px – reduce hero padding more, 2-col quick stats */
@media(max-width:600px){
  .pg-hero{margin:10px 10px 0;padding:18px 16px;border-radius:16px;}
  .pg-hero-title{font-size:18px;}
  .pg-hero-sub{font-size:12.5px;}
  .pg-stats{padding:12px 10px 0;gap:10px;}
  .pg-body{padding:12px 10px 56px;}
  .pg-scard-n{font-size:26px;}
  .pg-ach-grid{grid-template-columns:repeat(2,1fr);gap:10px;}
  .pg-quick-stats{grid-template-columns:1fr 1fr;gap:10px;}
  /* hide tab text, show only emoji on tiny screens */
  .pg-tab-label{display:none;}
  .pg-tab{padding:10px 14px;}
}

/* 480px – single-col quick stats, compact cards */
@media(max-width:480px){
  .pg-hero{margin:10px 10px 0;padding:16px 14px;border-radius:16px;}
  .pg-hero-title{font-size:17px;}
  .pg-stats{grid-template-columns:repeat(2,1fr);padding:10px 10px 0;gap:9px;}
  .pg-scard{padding:14px;border-radius:16px;}
  .pg-scard-n{font-size:24px;}
  .pg-scard-icon{width:36px;height:36px;border-radius:10px;}
  .pg-body{padding:12px 10px 56px;}
  .pg-ach-grid{grid-template-columns:repeat(2,1fr);gap:9px;}
  .pg-ach{padding:16px 10px;}
  .pg-ach-emoji{font-size:28px;}
  .pg-quick-stats{grid-template-columns:1fr;gap:10px;}
  /* leaderboard compact */
  .pg-lb-medal{display:none;}
  .pg-lb-streak{display:none;}
  .pg-lb-row{gap:8px;padding:10px 10px;}
  .pg-lb-rank{width:26px;height:26px;font-size:11px;}
  .pg-lb-pts{font-size:12px;}
  /* analytics 2-col goal bars stack fine already */
  .pg-2col{gap:12px;}
  /* modal compact */
  .pg-lvlup-card{padding:28px 24px;margin:0 16px;}
  .pg-lvlup-title{font-size:28px;}
  .pg-lvlup-sub{font-size:15px;}
  /* toast full-width */
  .pg-toast{right:10px;left:10px;max-width:none;}
}

/* 360px – absolute minimum */
@media(max-width:360px){
  .pg-hero-title{font-size:15px;}
  .pg-hero-pill{font-size:11px;}
  .pg-scard-n{font-size:22px;}
  .pg-scard{padding:12px;}
  .pg-ach-grid{gap:7px;}
  .pg-tab{padding:9px 10px;}
}
`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Achievement {
  id:number; title:string; description:string; icon:string; category:string;
  pointsRequired:number; unlocked:boolean; unlockedAt?:string;
  rarity:"common"|"rare"|"epic"|"legendary";
}
interface ProgressStats {
  totalPoints:number; currentLevel:number; pointsToNextLevel:number;
  totalLessonsCompleted:number; streakDays:number; longestStreak:number;
  weeklyProgress:number; monthlyGoal:number; completionRate:number;
  studyTimeMinutes:number; rank:number; totalUsers:number;
}
interface LeaderboardEntry {
  id:number; username:string; points:number; level:number; streak:number; rank:number;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_STATS: ProgressStats = {
  totalPoints:1250, currentLevel:5, pointsToNextLevel:500,
  totalLessonsCompleted:24, streakDays:7, longestStreak:14,
  weeklyProgress:180, monthlyGoal:300, completionRate:87,
  studyTimeMinutes:1840, rank:3, totalUsers:50,
};
const MOCK_ACHIEVEMENTS: Achievement[] = [
  {id:1,title:"First Steps",   description:"Complete your first lesson",  icon:"👶",category:"Beginner",   pointsRequired:10,  unlocked:true, rarity:"common"},
  {id:2,title:"Week Warrior",  description:"Maintain a 7-day streak",     icon:"🔥",category:"Consistency",pointsRequired:50,  unlocked:true, rarity:"rare"},
  {id:3,title:"Knowledge Seeker",description:"Complete 25 lessons",       icon:"📚",category:"Progress",  pointsRequired:100, unlocked:false,rarity:"epic"},
  {id:4,title:"Master Student",description:"Reach level 10",              icon:"👑",category:"Mastery",   pointsRequired:1000,unlocked:false,rarity:"legendary"},
  {id:5,title:"Speed Reader",  description:"Finish 3 lessons in one day", icon:"⚡",category:"Speed",     pointsRequired:75,  unlocked:true, rarity:"rare"},
  {id:6,title:"Top of Class",  description:"Reach rank #1 on leaderboard",icon:"🏆",category:"Mastery",  pointsRequired:500, unlocked:false,rarity:"legendary"},
  {id:7,title:"Night Owl",     description:"Study after 10 PM",           icon:"🦉",category:"Habits",   pointsRequired:20,  unlocked:true, rarity:"common"},
  {id:8,title:"Perfect Score", description:"Get 100% on any quiz",        icon:"💯",category:"Excellence",pointsRequired:200, unlocked:false,rarity:"epic"},
];
const MOCK_LB: LeaderboardEntry[] = [
  {id:1,username:"alex_star",   points:2450,level:8,streak:12,rank:1},
  {id:2,username:"maria_learn", points:2100,level:7,streak:5, rank:2},
  {id:3,username:"You",         points:1250,level:5,streak:7, rank:3},
  {id:4,username:"john_study",  points:1100,level:5,streak:3, rank:4},
  {id:5,username:"emma_bright", points:980, level:4,streak:8, rank:5},
];
const MOCK_HISTORY = [
  {date:"Mon",points:50},{date:"Tue",points:75},{date:"Wed",points:120},
  {date:"Thu",points:150},{date:"Fri",points:200},{date:"Sat",points:240},{date:"Sun",points:280},
];
const MOCK_WEEKLY = [
  {day:"Mon",minutes:45},{day:"Tue",minutes:60},{day:"Wed",minutes:30},
  {day:"Thu",minutes:75},{day:"Fri",minutes:90},{day:"Sat",minutes:120},{day:"Sun",minutes:85},
];
const SUBJECT_DATA = [
  {name:"Science",value:40,color:"#8b5cf6"},
  {name:"Math",   value:30,color:"#6366f1"},
  {name:"English",value:20,color:"#ec4899"},
  {name:"History",value:10,color:"#f59e0b"},
];

// ── Chart tooltip ─────────────────────────────────────────────────────────────
const ChartTip = ({active,payload,label}:any) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:"#fff",border:"1px solid rgba(0,0,0,.08)",borderRadius:10,padding:"8px 12px",
      boxShadow:"0 4px 16px rgba(0,0,0,.1)",fontSize:12,fontWeight:600}}>
      <div style={{color:"#64748b",marginBottom:3}}>{label}</div>
      <div style={{color:"#6366f1"}}>{payload[0].value} {payload[0].name==="minutes"?"min":"pts"}</div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const {user} = useAuth() as any;
  const { addNotification } = useNotificationStore();
  const [tab,    setTab]    = useState("overview");
  const [period, setPeriod] = useState("week");
  const [lvlUp,  setLvlUp]  = useState(false);
  const [role,   setRole]   = useState("student");

  useEffect(()=>{ if(user?.role) setRole(user.role); },[user]);

  const stats = MOCK_STATS;
  const achievements = MOCK_ACHIEVEMENTS;
  const leaderboard  = MOCK_LB;
  const history      = MOCK_HISTORY;

  const levelPct = Math.min(((stats.totalPoints % 500) / 500)*100, 100);

  const TABS = [
    {id:"overview",    icon:"📈", label:"Overview"},
    {id:"achievements",icon:"🏆", label:"Achievements"},
    {id:"leaderboard", icon:"👥", label:"Leaderboard"},
    {id:"analytics",   icon:"🧠", label:"Analytics"},
  ];

  const handleLevelUp = () => {
    setLvlUp(true);
    addNotification(`Congratulations! You've reached Level ${stats.currentLevel}!`);
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="pg-root">
        <Navigation currentRole={role} onRoleChange={setRole as any}/>

        {/* Level-up overlay */}
        <AnimatePresence>
          {lvlUp && (
            <motion.div className="pg-lvlup-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setLvlUp(false)}>
              <motion.div className="pg-lvlup-card" initial={{scale:.5,rotate:-10}} animate={{scale:1,rotate:0}} exit={{scale:.5}} transition={{type:"spring",stiffness:280,damping:22}}>
                <motion.div animate={{rotate:[0,10,-10,10,0]}} transition={{duration:.8,repeat:2}}>
                  <Crown size={64} color="#fff" style={{margin:"0 auto"}}/>
                </motion.div>
                <div className="pg-lvlup-title">LEVEL UP!</div>
                <div className="pg-lvlup-sub">You reached Level {stats.currentLevel}!</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero */}
        <div className="pg-hero">
          <div className="pg-hero-inner">
            <div className="pg-hero-left">
              <div className="pg-hero-pill"><TrendingUp size={12}/> Learning Progress</div>
              <div className="pg-hero-title">📊 My Progress Dashboard</div>
              <div className="pg-hero-sub">
                Track your achievements, streaks &amp; climb the leaderboard<br/>
                Level {stats.currentLevel} · {stats.totalPoints.toLocaleString()} XP earned
              </div>
            </div>
            <div className="pg-hero-stats">
              {[
                {n:stats.currentLevel,      l:"Level"},
                {n:stats.streakDays+"d",    l:"Streak"},
                {n:"#"+stats.rank,          l:"Rank"},
                {n:stats.totalPoints,       l:"XP"},
              ].map((s,i)=>(
                <div className="pg-hstat" key={i}>
                  <div className="pg-hstat-n">{s.n}</div>
                  <div className="pg-hstat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="pg-stats">
          {/* Level card with progress */}
          <motion.div className="pg-scard blue" style={{animationDelay:".05s"}} onClick={handleLevelUp}>
            <div className="pg-scard-icon"><Crown size={20} color="#6366f1"/></div>
            <div className="pg-scard-n">Lvl {stats.currentLevel}</div>
            <div className="pg-scard-l">Current Level</div>
            <div className="pg-lvl-track"><div className="pg-lvl-fill" style={{width:`${levelPct}%`}}/></div>
            <div className="pg-lvl-label"><span>{stats.totalPoints % 500} XP</span><span>{stats.pointsToNextLevel} to next</span></div>
          </motion.div>

          <motion.div className="pg-scard green" style={{animationDelay:".1s"}}>
            <div className="pg-scard-icon"><Star size={20} color="#10b981"/></div>
            <div className="pg-scard-n">{stats.totalPoints.toLocaleString()}</div>
            <div className="pg-scard-l">Total XP</div>
            <div className="pg-scard-sub"><ChevronUp size={13} color="#10b981"/>+{stats.weeklyProgress} this week</div>
          </motion.div>

          <motion.div className="pg-scard amber" style={{animationDelay:".15s"}}>
            <div className="pg-scard-icon"><Flame size={20} color="#f59e0b"/></div>
            <div className="pg-scard-n">{stats.streakDays}d</div>
            <div className="pg-scard-l">Current Streak</div>
            <div className="pg-scard-sub"><Award size={13} color="#94a3b8"/>Best: {stats.longestStreak} days</div>
          </motion.div>

          <motion.div className="pg-scard purple" style={{animationDelay:".2s"}}>
            <div className="pg-scard-icon"><Medal size={20} color="#8b5cf6"/></div>
            <div className="pg-scard-n">#{stats.rank}</div>
            <div className="pg-scard-l">Global Rank</div>
            <div className="pg-scard-sub"><Users size={13} color="#94a3b8"/>Top {Math.round(stats.rank/stats.totalUsers*100)}% of {stats.totalUsers}</div>
          </motion.div>
        </div>

        {/* Body */}
        <div className="pg-body">

          {/* Tab bar */}
          <div className="pg-tabs">
            {TABS.map(t=>(
              <button key={t.id} className={`pg-tab${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>
                <span>{t.icon}</span>
                <span className="pg-tab-label">{t.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.2,ease:[.4,0,.2,1]}}>

              {/* ── OVERVIEW ── */}
              {tab==="overview" && (
                <div>
                  <div className="pg-2col">
                    <div className="pg-panel">
                      <div className="pg-panel-head">
                        <div className="pg-panel-title"><TrendingUp size={16} color="#6366f1"/> Learning Progress</div>
                        <div className="pg-panel-sub">Daily XP accumulation this week</div>
                      </div>
                      <div className="pg-panel-body">
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)"/>
                            <XAxis dataKey="date" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                            <Tooltip content={<ChartTip/>}/>
                            <Line type="monotone" dataKey="points" stroke="#6366f1" strokeWidth={3}
                              dot={{fill:"#6366f1",strokeWidth:2,r:4}} activeDot={{r:6}}/>
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="pg-panel">
                      <div className="pg-panel-head">
                        <div className="pg-panel-title"><BookOpen size={16} color="#8b5cf6"/> Subject Distribution</div>
                        <div className="pg-panel-sub">Time spent per subject</div>
                      </div>
                      <div className="pg-panel-body">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={SUBJECT_DATA} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                              label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                              labelLine={false}>
                              {SUBJECT_DATA.map((d,i)=><Cell key={i} fill={d.color}/>)}
                            </Pie>
                            <Tooltip/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Quick stats row */}
                  <div className="pg-quick-stats">
                    {[
                      {icon:"📚",label:"Lessons Completed", val:stats.totalLessonsCompleted, color:"#6366f1",bg:"rgba(99,102,241,.1)"},
                      {icon:"⏱️",label:"Study Time",        val:`${Math.floor(stats.studyTimeMinutes/60)}h ${stats.studyTimeMinutes%60}m`, color:"#10b981",bg:"rgba(16,185,129,.1)"},
                      {icon:"🎯",label:"Completion Rate",   val:`${stats.completionRate}%`,  color:"#f59e0b",bg:"rgba(245,158,11,.1)"},
                    ].map((s,i)=>(
                      <div key={i} className="pg-panel" style={{padding:"18px 20px",display:"flex",alignItems:"center",gap:14}}>
                        <div style={{width:44,height:44,borderRadius:13,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{s.icon}</div>
                        <div>
                          <div style={{fontSize:22,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div>
                          <div style={{fontSize:12,color:"#64748b",fontWeight:500,marginTop:3}}>{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ACHIEVEMENTS ── */}
              {tab==="achievements" && (
                <div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:"var(--text-main,#0f172a)"}}>Your Achievements</div>
                      <div style={{fontSize:12.5,color:"#64748b",marginTop:2}}>{achievements.filter(a=>a.unlocked).length} of {achievements.length} unlocked</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {(["common","rare","epic","legendary"] as const).map(r=>(
                        <div key={r} style={{fontSize:10.5,fontWeight:700,padding:"3px 10px",borderRadius:8,
                          background:r==="common"?"rgba(100,116,139,.1)":r==="rare"?"rgba(14,165,233,.1)":r==="epic"?"rgba(139,92,246,.1)":"rgba(245,158,11,.1)",
                          color:r==="common"?"#64748b":r==="rare"?"#0284c7":r==="epic"?"#8b5cf6":"#d97706",
                          textTransform:"capitalize"}}>
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pg-ach-grid">
                    {achievements.map((a,i)=>(
                      <motion.div key={a.id} className={`pg-ach ${a.unlocked?a.rarity:"locked"}`}
                        initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*.05}}
                        whileHover={{y:-4,scale:1.02}}>
                        {a.unlocked && <Trophy size={12} color="rgba(255,255,255,.7)" className="pg-ach-trophy"/>}
                        <div className="pg-ach-rarity">{a.rarity}</div>
                        <span className="pg-ach-emoji">{a.icon}</span>
                        <div className="pg-ach-name">{a.title}</div>
                        <div className="pg-ach-desc">{a.description}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── LEADERBOARD ── */}
              {tab==="leaderboard" && (
                <div className="pg-panel">
                  <div className="pg-panel-head">
                    <div className="pg-lb-header-wrap">
                      <div>
                        <div className="pg-panel-title"><Users size={16} color="#6366f1"/> Top Learners</div>
                        <div className="pg-panel-sub">See how you compare to classmates</div>
                      </div>
                      <div className="pg-period">
                        {["week","month","all"].map(p=>(
                          <button key={p} className={`pg-period-btn${period===p?" on":""}`} onClick={()=>setPeriod(p)}
                            style={{textTransform:"capitalize"}}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="pg-panel-body">
                    {leaderboard.map((e,i)=>{
                      const isMe = e.username==="You" || e.username===user?.username;
                      const rankClass = i===0?"gold":i===1?"silver":i===2?"bronze":"other";
                      return (
                        <motion.div key={e.id} className={`pg-lb-row${isMe?" me":""}`}
                          initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*.06}}>
                          <div className={`pg-lb-rank ${rankClass}`}>{e.rank}</div>
                          <div style={{fontSize:22,flexShrink:0}}>
                            {i===0?"🥇":i===1?"🥈":i===2?"🥉":""}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <span className="pg-lb-name">{e.username}</span>
                            {isMe && <span className="pg-lb-you">You</span>}
                            <div style={{fontSize:11,color:"#94a3b8",fontWeight:500,marginTop:1}}>Level {e.level}</div>
                          </div>
                          <div className="pg-lb-streak"><Flame size={13}/>{e.streak}d</div>
                          <div className="pg-lb-pts"><Star size={14} color="#f59e0b"/>{e.points.toLocaleString()}</div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── ANALYTICS ── */}
              {tab==="analytics" && (
                <div className="pg-2col">
                  <div className="pg-panel">
                    <div className="pg-panel-head">
                      <div className="pg-panel-title"><Brain size={16} color="#8b5cf6"/> Weekly Activity</div>
                      <div className="pg-panel-sub">Minutes studied per day</div>
                    </div>
                    <div className="pg-panel-body">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={MOCK_WEEKLY}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)"/>
                          <XAxis dataKey="day" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                          <Tooltip content={<ChartTip/>}/>
                          <Bar dataKey="minutes" fill="#6366f1" radius={[6,6,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="pg-panel">
                    <div className="pg-panel-head">
                      <div className="pg-panel-title"><Target size={16} color="#10b981"/> Monthly Goals</div>
                      <div className="pg-panel-sub">Progress toward this month's targets</div>
                    </div>
                    <div className="pg-panel-body">
                      {[
                        {label:"Lessons Completed",current:stats.totalLessonsCompleted,target:50,  color:"#6366f1"},
                        {label:"Study Hours",       current:Math.floor(stats.studyTimeMinutes/60),target:40,color:"#10b981"},
                        {label:"XP Earned",         current:stats.totalPoints, target:2000, color:"#f59e0b"},
                        {label:"Completion Rate",   current:stats.completionRate,target:100, color:"#8b5cf6"},
                      ].map((g,i)=>(
                        <div key={i} className="pg-goal-row">
                          <div className="pg-goal-label">
                            <span>{g.label}</span>
                            <span style={{color:g.color}}>{g.current}/{g.target}</span>
                          </div>
                          <div className="pg-goal-track">
                            <motion.div className="pg-goal-fill"
                              style={{background:g.color}}
                              initial={{width:0}}
                              animate={{width:`${Math.min(g.current/g.target*100,100)}%`}}
                              transition={{duration:.8,delay:i*.1,ease:[.4,0,.2,1]}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}