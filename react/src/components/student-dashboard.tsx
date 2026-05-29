import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface StudentDashboardProps { onStartQuiz: () => void; }
interface StudentStats { lessonsCompleted?:number; averageScore?:number; totalTimeSpent?:number; badgesEarned?:number; }
interface StreakData { currentStreak?:number; longestStreak?:number; }

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

/* ── CSS VARIABLES — Light defaults ── */
:root {
  --sd-bg-app:        #f8fafc;
  --sd-bg-panel:      #ffffff;
  --sd-bg-panel2:     #fafafa;
  --sd-bg-hover:      #f5f3ff;
  --sd-border:        rgba(0,0,0,0.06);
  --sd-border2:       #f1f5f9;
  --sd-text-main:     #0f172a;
  --sd-text-sub:      #64748b;
  --sd-text-muted:    #94a3b8;
  --sd-shadow:        0 2px 12px rgba(0,0,0,.05);
  --sd-shadow2:       0 12px 32px rgba(0,0,0,.10);
  --sd-bar-bg:        #f1f5f9;
  --sd-scard-bg:      #ffffff;
  --sd-course-bg:     #fafafa;
  --sd-course-hover:  #ffffff;
  --sd-lb-bg:         #f1f5f9;
  --sd-lb-row:        transparent;
  --sd-lb-me:         rgba(99,102,241,.07);
  --sd-lb-me-border:  #a5b4fc;
  --sd-rec-hover:     #fafafa;
  --sd-rec-border:    #f1f5f9;
  --sd-prog-bg:       #f1f5f9;
  --sd-tip-bg:        #ffffff;
}

/* ── CSS VARIABLES — Dark mode (via [data-theme="dark"] on <html>) ── */
[data-theme="dark"] {
  --sd-bg-app:        #0b1120;
  --sd-bg-panel:      #141f35;
  --sd-bg-panel2:     #1a2540;
  --sd-bg-hover:      rgba(99,102,241,0.15);
  --sd-border:        rgba(255,255,255,0.07);
  --sd-border2:       rgba(255,255,255,0.06);
  --sd-text-main:     #f1f5f9;
  --sd-text-sub:      #94a3b8;
  --sd-text-muted:    #64748b;
  --sd-shadow:        0 2px 12px rgba(0,0,0,.3);
  --sd-shadow2:       0 12px 32px rgba(0,0,0,.45);
  --sd-bar-bg:        rgba(255,255,255,0.07);
  --sd-scard-bg:      #141f35;
  --sd-course-bg:     rgba(255,255,255,0.03);
  --sd-course-hover:  rgba(255,255,255,0.05);
  --sd-lb-bg:         rgba(255,255,255,0.07);
  --sd-lb-row:        transparent;
  --sd-lb-me:         rgba(99,102,241,0.18);
  --sd-lb-me-border:  rgba(99,102,241,0.5);
  --sd-rec-hover:     rgba(255,255,255,0.03);
  --sd-rec-border:    rgba(255,255,255,0.07);
  --sd-prog-bg:       rgba(255,255,255,0.07);
  --sd-tip-bg:        #1a2540;
}

.sd-root {
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  background: var(--sd-bg-app);
  min-height:100vh;
  color: var(--sd-text-main);
  transition: background .3s ease, color .3s ease;
}

/* ── Hero ── */
.sd-hero{margin:20px 28px 0;border-radius:20px;padding:18px 28px;
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  position:relative;overflow:hidden;color:#fff;
  box-shadow:0 6px 24px rgba(99,102,241,.26);
  animation:heroIn .55s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes heroIn{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}
.sd-hero::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;
  border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none;}
.sd-hero::after{content:'';position:absolute;bottom:-50px;left:30%;width:150px;height:150px;
  border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none;}
.sd-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.sd-hero-left{display:flex;align-items:center;gap:14px;}
.sd-hero-avatar{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.25);
  border:2px solid rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;
  font-size:18px;font-weight:800;color:#fff;flex-shrink:0;}
.sd-hero-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;
  margin-bottom:5px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);
  font-size:10.5px;font-weight:700;color:#fff;}
.sd-hero-title{font-size:clamp(16px,2.2vw,22px);font-weight:800;color:#fff;margin-bottom:2px;letter-spacing:-.2px;line-height:1.2;}
.sd-hero-sub{font-size:12px;color:rgba(255,255,255,.68);line-height:1.4;}
.sd-hero-right{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.sd-hstat{text-align:center;padding:8px 14px;border-radius:12px;min-width:58px;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(8px);transition:transform .2s;}
.sd-hstat:hover{transform:translateY(-2px);}
.sd-hstat-n{font-size:18px;font-weight:800;color:#fff;line-height:1;}
.sd-hstat-l{font-size:9.5px;color:rgba(255,255,255,.62);margin-top:1px;}
.sd-hero-btn{padding:9px 18px;background:#fff;color:#6366f1;border:none;border-radius:12px;
  font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;flex-shrink:0;
  transition:all .2s;box-shadow:0 3px 12px rgba(0,0,0,.15);white-space:nowrap;}
.sd-hero-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.2);background:#f5f3ff;}

/* ── Stat cards ── */
.sd-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:20px 28px 0;}
.sd-scard{
  background: var(--sd-scard-bg);
  border-radius:20px;padding:20px;
  border:1px solid var(--sd-border);
  box-shadow: var(--sd-shadow);
  transition:all .28s cubic-bezier(.4,0,.2,1);
  animation:scardIn .5s cubic-bezier(.34,1.56,.64,1) both;
  position:relative;overflow:hidden;
}
@keyframes scardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.sd-scard:hover{transform:translateY(-6px) scale(1.01);box-shadow: var(--sd-shadow2);}
.sd-scard.blue  {border-top:3px solid #6366f1;}
.sd-scard.green {border-top:3px solid #10b981;}
.sd-scard.amber {border-top:3px solid #f59e0b;}
.sd-scard.purple{border-top:3px solid #8b5cf6;}
.sd-scard-icon{width:40px;height:40px;border-radius:12px;margin-bottom:12px;
  display:flex;align-items:center;justify-content:center;}
.sd-scard.blue   .sd-scard-icon{background:rgba(99,102,241,.1);}
.sd-scard.green  .sd-scard-icon{background:rgba(16,185,129,.1);}
.sd-scard.amber  .sd-scard-icon{background:rgba(245,158,11,.1);}
.sd-scard.purple .sd-scard-icon{background:rgba(139,92,246,.1);}
.sd-scard-n{font-size:30px;font-weight:800;color: var(--sd-text-main);letter-spacing:-1px;line-height:1;}
.sd-scard-l{font-size:12.5px;color: var(--sd-text-sub);margin-top:4px;font-weight:500;}
.sd-scard-sub{font-size:11.5px;color:#10b981;margin-top:6px;display:flex;align-items:center;gap:4px;font-weight:600;}

/* ── Body ── */
.sd-body{padding:20px 28px 60px;}

/* ── Panel ── */
.sd-panel{
  background: var(--sd-bg-panel);
  border-radius:20px;
  border:1px solid var(--sd-border);
  box-shadow: var(--sd-shadow);
  overflow:hidden;
  transition: background .3s ease, border-color .3s ease;
}
.sd-panel-head{
  padding:18px 22px 14px;
  border-bottom:1px solid var(--sd-border2);
  display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
}
.sd-panel-title{font-size:15px;font-weight:800;color: var(--sd-text-main);display:flex;align-items:center;gap:8px;}
.sd-panel-sub{font-size:12.5px;color: var(--sd-text-sub);margin-top:3px;}
.sd-panel-body{padding:20px 22px;}
.sd-view-all{font-size:12.5px;font-weight:600;color:#6366f1;border:none;background:none;
  cursor:pointer;font-family:inherit;padding:6px 12px;border-radius:8px;transition:background .15s;}
.sd-view-all:hover{background:rgba(99,102,241,.08);}

/* ── Grid layouts ── */
.sd-2col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
.sd-3col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;}
.sd-main-grid{display:grid;grid-template-columns:1fr 340px;gap:16px;margin-bottom:16px;}

/* ── Course rows ── */
.sd-course{
  display:flex;align-items:center;gap:14px;padding:14px 16px;
  border-radius:14px;border:1px solid var(--sd-border2);margin-bottom:8px;
  transition:all .22s;cursor:pointer;background: var(--sd-course-bg);
}
.sd-course:last-child{margin-bottom:0;}
.sd-course:hover{background: var(--sd-course-hover);border-color:#e0e7ff;box-shadow:0 4px 16px rgba(99,102,241,.1);transform:translateX(3px);}
.sd-course-icon{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;}
.sd-course-icon.blue  {background:linear-gradient(135deg,#e0e7ff,#c7d2fe);}
.sd-course-icon.green {background:linear-gradient(135deg,#d1fae5,#a7f3d0);}
.sd-course-icon.purple{background:linear-gradient(135deg,#ede9fe,#ddd6fe);}
.sd-course-name{font-size:13.5px;font-weight:700;color: var(--sd-text-main);margin-bottom:2px;}
.sd-course-meta{font-size:11.5px;color: var(--sd-text-muted);margin-bottom:7px;}
.sd-prog-bg{height:6px;background: var(--sd-prog-bg);border-radius:6px;overflow:hidden;}
.sd-prog-fill{height:100%;border-radius:6px;transition:width .8s cubic-bezier(.4,0,.2,1);}
.sd-prog-pct{font-size:11px;color: var(--sd-text-muted);margin-top:3px;font-weight:600;}
.sd-cont-btn{padding:8px 16px;border-radius:10px;border:none;font-size:12px;font-weight:700;
  cursor:pointer;font-family:inherit;flex-shrink:0;
  color:#fff;background:linear-gradient(135deg,#6366f1,#8b5cf6);
  box-shadow:0 4px 12px rgba(99,102,241,.35);transition:all .2s;}
.sd-cont-btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(99,102,241,.45);}

/* ── Test cards ── */
.sd-test{border-radius:14px;padding:15px;margin-bottom:9px;border:1px solid transparent;transition:all .2s;}
.sd-test:last-child{margin-bottom:0;}
.sd-test.urgent{background:linear-gradient(135deg,#fff7ed,#fef3c7);border-color:#fde68a;}
.sd-test.medium{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-color:#bae6fd;}
[data-theme="dark"] .sd-test.urgent{background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(234,179,8,.08));border-color:rgba(245,158,11,.3);}
[data-theme="dark"] .sd-test.medium{background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(14,165,233,.08));border-color:rgba(59,130,246,.3);}
.sd-test:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08);}
.sd-test-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:5px;}
.sd-test-title{font-size:13.5px;font-weight:700;color: var(--sd-text-main);}
.sd-test-meta{font-size:12px;color: var(--sd-text-sub);margin-bottom:11px;}
.sd-test-badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;flex-shrink:0;}
.tb-urgent{background:#fef3c7;color:#92400e;}
.tb-medium{background:#bae6fd;color:#075985;}
[data-theme="dark"] .tb-urgent{background:rgba(245,158,11,.2);color:#fbbf24;}
[data-theme="dark"] .tb-medium{background:rgba(59,130,246,.2);color:#93c5fd;}
.sd-test-btn{width:100%;padding:9px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;border:none;transition:all .2s;}
.sd-test-btn.urgent{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;box-shadow:0 4px 12px rgba(245,158,11,.3);}
.sd-test-btn.medium{background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;box-shadow:0 4px 12px rgba(59,130,246,.3);}
.sd-test-btn:hover{transform:translateY(-1px);filter:brightness(1.08);}

/* ── Achievement cards ── */
.sd-ach-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.sd-ach{border-radius:16px;padding:18px 14px;text-align:center;
  border:1.5px solid transparent;position:relative;overflow:hidden;
  transition:all .22s cubic-bezier(.34,1.56,.64,1);}
.sd-ach:hover{transform:translateY(-5px) scale(1.02);box-shadow:0 16px 40px rgba(0,0,0,.12);}
.sd-ach::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
.sd-ach.yellow{background:linear-gradient(135deg,#fffbeb,#fef3c7);border-color:#fde68a;}
.sd-ach.yellow::before{background:linear-gradient(90deg,#f59e0b,#fbbf24);}
.sd-ach.green{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:#bbf7d0;}
.sd-ach.green::before{background:linear-gradient(90deg,#10b981,#34d399);}
.sd-ach.purple{background:linear-gradient(135deg,#faf5ff,#ede9fe);border-color:#ddd6fe;}
.sd-ach.purple::before{background:linear-gradient(90deg,#8b5cf6,#a78bfa);}
.sd-ach.blue{background:linear-gradient(135deg,#eff6ff,#dbeafe);border-color:#bfdbfe;}
.sd-ach.blue::before{background:linear-gradient(90deg,#3b82f6,#60a5fa);}
[data-theme="dark"] .sd-ach.yellow{background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(251,191,36,.07));border-color:rgba(245,158,11,.25);}
[data-theme="dark"] .sd-ach.green {background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(52,211,153,.07));border-color:rgba(16,185,129,.25);}
[data-theme="dark"] .sd-ach.purple{background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(167,139,250,.07));border-color:rgba(139,92,246,.25);}
[data-theme="dark"] .sd-ach.blue  {background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(96,165,250,.07));border-color:rgba(59,130,246,.25);}
.sd-ach-icon{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:22px;box-shadow:0 6px 18px rgba(0,0,0,.12);}
.ai-yellow{background:linear-gradient(135deg,#f59e0b,#fbbf24);}
.ai-green {background:linear-gradient(135deg,#10b981,#34d399);}
.ai-purple{background:linear-gradient(135deg,#8b5cf6,#a78bfa);}
.ai-blue  {background:linear-gradient(135deg,#3b82f6,#60a5fa);}
.sd-ach-name{font-size:12.5px;font-weight:700;color: var(--sd-text-main);margin-bottom:3px;}
.sd-ach-desc{font-size:11px;color: var(--sd-text-muted);}

/* ── Chart tooltip ── */
.sd-tip{background: var(--sd-tip-bg);border:1px solid var(--sd-border);border-radius:10px;
  padding:8px 12px;box-shadow:0 4px 16px rgba(0,0,0,.1);font-size:12px;font-weight:600;}
.sd-tip-label{color: var(--sd-text-sub);margin-bottom:3px;}
.sd-tip-val{color:#6366f1;}

/* ── Daily progress ── */
.sd-dp-time{display:flex;flex-direction:column;gap:8px;}
.sd-dp-row{display:flex;align-items:center;gap:10px;}
.sd-dp-label{font-size:12px;font-weight:600;color: var(--sd-text-sub);width:28px;flex-shrink:0;}
.sd-dp-bar-bg{flex:1;height:8px;background: var(--sd-bar-bg);border-radius:8px;overflow:hidden;}
.sd-dp-bar-fill{height:100%;border-radius:8px;transition:width .9s cubic-bezier(.4,0,.2,1);}
.sd-dp-val{font-size:11.5px;font-weight:700;color: var(--sd-text-main);width:32px;text-align:right;flex-shrink:0;}
.sd-dp-goal-row{display:flex;align-items:center;justify-content:space-between;
  margin-top:14px;padding-top:14px;border-top:1px solid var(--sd-border2);}
.sd-dp-goal-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;}
.sd-dp-goal-pill.good{background:rgba(16,185,129,.1);color:#059669;}
.sd-dp-goal-pill.warn{background:rgba(245,158,11,.1);color:#d97706;}
[data-theme="dark"] .sd-dp-goal-pill.good{background:rgba(16,185,129,.18);color:#34d399;}
[data-theme="dark"] .sd-dp-goal-pill.warn{background:rgba(245,158,11,.18);color:#fbbf24;}

/* ── Syllabus cards grid ── */
.sd-syl-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}
.sd-syl-card{border-radius:16px;padding:16px 14px;text-align:center;border:1.5px solid transparent;
  position:relative;overflow:hidden;transition:all .22s cubic-bezier(.34,1.56,.64,1);cursor:default;}
.sd-syl-card:hover{transform:translateY(-4px) scale(1.02);box-shadow:0 12px 32px rgba(0,0,0,.1);}
.sd-syl-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
.sd-syl-card.math   {background:rgba(99,102,241,.06); border-color:rgba(99,102,241,.2);}  .sd-syl-card.math::before  {background:linear-gradient(90deg,#6366f1,#8b5cf6);}
.sd-syl-card.bio    {background:rgba(16,185,129,.06);  border-color:rgba(16,185,129,.2);}  .sd-syl-card.bio::before   {background:linear-gradient(90deg,#10b981,#34d399);}
.sd-syl-card.hist   {background:rgba(139,92,246,.06);  border-color:rgba(139,92,246,.2);}  .sd-syl-card.hist::before  {background:linear-gradient(90deg,#8b5cf6,#a78bfa);}
.sd-syl-card.phys   {background:rgba(236,72,153,.06);  border-color:rgba(236,72,153,.2);}  .sd-syl-card.phys::before  {background:linear-gradient(90deg,#ec4899,#f97316);}
.sd-syl-card.eng    {background:rgba(245,158,11,.06);  border-color:rgba(245,158,11,.2);}  .sd-syl-card.eng::before   {background:linear-gradient(90deg,#f59e0b,#fbbf24);}
[data-theme="dark"] .sd-syl-card.math{background:rgba(99,102,241,.10);border-color:rgba(99,102,241,.28);}
[data-theme="dark"] .sd-syl-card.bio {background:rgba(16,185,129,.10);border-color:rgba(16,185,129,.28);}
[data-theme="dark"] .sd-syl-card.hist{background:rgba(139,92,246,.10);border-color:rgba(139,92,246,.28);}
[data-theme="dark"] .sd-syl-card.phys{background:rgba(236,72,153,.10);border-color:rgba(236,72,153,.28);}
[data-theme="dark"] .sd-syl-card.eng {background:rgba(245,158,11,.10);border-color:rgba(245,158,11,.28);}
.sd-syl-emoji{font-size:26px;display:block;margin-bottom:8px;}
.sd-syl-subject{font-size:12px;font-weight:700;color: var(--sd-text-main);margin-bottom:10px;}
.sd-syl-ring-wrap{position:relative;width:60px;height:60px;margin:0 auto 8px;}
.sd-syl-ring-wrap svg{width:60px;height:60px;transform:rotate(-90deg);}
.sd-syl-ring-bg{fill:none;stroke:rgba(0,0,0,.07);stroke-width:5;}
[data-theme="dark"] .sd-syl-ring-bg{stroke:rgba(255,255,255,.1);}
.sd-syl-ring-fill{fill:none;stroke-width:5;stroke-linecap:round;transition:stroke-dashoffset 1s cubic-bezier(.4,0,.2,1);}
.sd-syl-ring-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:800;color: var(--sd-text-main);}
.sd-syl-chapters{font-size:10.5px;color: var(--sd-text-muted);font-weight:500;}

/* ── Overall progress ── */
.sd-op-big-num{display:flex;align-items:baseline;gap:4px;margin-bottom:6px;}
.sd-op-big-n{font-size:42px;font-weight:800;color: var(--sd-text-main);letter-spacing:-2px;line-height:1;}
.sd-op-big-suffix{font-size:18px;font-weight:700;color:#6366f1;}
.sd-op-big-label{font-size:12px;color: var(--sd-text-muted);margin-bottom:14px;}
.sd-op-stack{height:14px;border-radius:14px;overflow:hidden;display:flex;gap:0;margin-bottom:10px;}
.sd-op-stack-seg{height:100%;transition:flex .9s cubic-bezier(.4,0,.2,1);}
.sd-op-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:16px;}
.sd-op-legend-item{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color: var(--sd-text-sub);}
.sd-op-legend-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.sd-op-mini-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.sd-op-mini{padding:10px 8px;border-radius:12px;text-align:center;}
.sd-op-mini.green {background:rgba(16,185,129,.08);}
.sd-op-mini.blue  {background:rgba(99,102,241,.08);}
.sd-op-mini.amber {background:rgba(245,158,11,.08);}
[data-theme="dark"] .sd-op-mini.green {background:rgba(16,185,129,.15);}
[data-theme="dark"] .sd-op-mini.blue  {background:rgba(99,102,241,.15);}
[data-theme="dark"] .sd-op-mini.amber {background:rgba(245,158,11,.15);}
.sd-op-mini-n{font-size:17px;font-weight:800;line-height:1;}
.sd-op-mini.green .sd-op-mini-n{color:#10b981;}
.sd-op-mini.blue  .sd-op-mini-n{color:#6366f1;}
.sd-op-mini.amber .sd-op-mini-n{color:#f59e0b;}
.sd-op-mini-l{font-size:10px;color: var(--sd-text-muted);margin-top:2px;font-weight:500;}

/* ── Leaderboard ── */
.sd-lb-period{display:flex;gap:5px;}
.sd-lb-pbtn{
  padding:5px 13px;border-radius:20px;
  border:1.5px solid var(--sd-border);
  background: var(--sd-bg-panel);
  font-family:inherit;font-size:11.5px;font-weight:600;color: var(--sd-text-sub);
  cursor:pointer;transition:all .18s;text-transform:capitalize;
}
.sd-lb-pbtn:hover{border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,.05);}
.sd-lb-pbtn.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(99,102,241,.3);}
.sd-lb-row{
  display:flex;align-items:center;gap:11px;padding:11px 14px;border-radius:14px;
  border:1.5px solid var(--sd-border2);margin-bottom:7px;transition:all .18s;cursor:default;
  background: var(--sd-lb-row);
}
.sd-lb-row:last-child{margin-bottom:0;}
.sd-lb-row:hover{background:rgba(99,102,241,.04);border-color:#c7d2fe;}
.sd-lb-row.me{background: var(--sd-lb-me);border-color: var(--sd-lb-me-border);}
[data-theme="dark"] .sd-lb-row:hover{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.4);}
.sd-lb-rank{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
.sd-lb-rank.gold  {background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;box-shadow:0 3px 8px rgba(245,158,11,.4);}
.sd-lb-rank.silver{background:linear-gradient(135deg,#94a3b8,#64748b);color:#fff;}
.sd-lb-rank.bronze{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;}
.sd-lb-rank.other {background: var(--sd-lb-bg);color: var(--sd-text-sub);}
.sd-lb-avatar{width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;}
.sd-lb-info{flex:1;min-width:0;}
.sd-lb-name{font-size:13px;font-weight:700;color: var(--sd-text-main);display:flex;align-items:center;gap:6px;}
.sd-lb-you{font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;background:rgba(99,102,241,.12);color:#6366f1;}
[data-theme="dark"] .sd-lb-you{background:rgba(99,102,241,.22);color:#a5b4fc;}
.sd-lb-level{font-size:11px;color: var(--sd-text-muted);margin-top:1px;}
.sd-lb-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.sd-lb-streak{display:flex;align-items:center;gap:3px;font-size:12px;color:#f59e0b;font-weight:700;}
.sd-lb-pts{display:flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color: var(--sd-text-main);}
.sd-lb-medal{font-size:18px;flex-shrink:0;}

/* ── Smart Recommendations ── */
.sd-rec-filter{display:flex;gap:5px;flex-wrap:wrap;}
.sd-rec-ftag{
  padding:4px 12px;border-radius:20px;
  border:1.5px solid var(--sd-border);
  background: var(--sd-bg-panel);
  font-family:inherit;font-size:11.5px;font-weight:600;color: var(--sd-text-sub);
  cursor:pointer;transition:all .18s;
}
.sd-rec-ftag:hover{border-color:#6366f1;color:#6366f1;}
.sd-rec-ftag.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 3px 8px rgba(99,102,241,.3);}
.sd-rec-item{
  display:flex;align-items:flex-start;gap:13px;padding:14px 16px;
  border-radius:16px;border:1.5px solid var(--sd-rec-border);margin-bottom:9px;
  transition:all .22s;cursor:pointer;position:relative;overflow:hidden;
  background: transparent;
}
.sd-rec-item:last-child{margin-bottom:0;}
.sd-rec-item::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:3px 0 0 3px;}
.sd-rec-item.priority-high::before{background:linear-gradient(180deg,#ef4444,#f97316);}
.sd-rec-item.priority-med::before{background:linear-gradient(180deg,#6366f1,#8b5cf6);}
.sd-rec-item.priority-low::before{background:linear-gradient(180deg,#10b981,#34d399);}
.sd-rec-item:hover{background: var(--sd-rec-hover);border-color:#e0e7ff;box-shadow:0 4px 16px rgba(99,102,241,.1);transform:translateY(-2px);}
[data-theme="dark"] .sd-rec-item:hover{border-color:rgba(99,102,241,.35);}
.sd-rec-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;}
.sd-rec-icon.blue  {background:rgba(99,102,241,.1);}
.sd-rec-icon.green {background:rgba(16,185,129,.1);}
.sd-rec-icon.amber {background:rgba(245,158,11,.1);}
.sd-rec-icon.purple{background:rgba(139,92,246,.1);}
.sd-rec-icon.rose  {background:rgba(239,68,68,.08);}
[data-theme="dark"] .sd-rec-icon.blue  {background:rgba(99,102,241,.18);}
[data-theme="dark"] .sd-rec-icon.green {background:rgba(16,185,129,.18);}
[data-theme="dark"] .sd-rec-icon.amber {background:rgba(245,158,11,.18);}
[data-theme="dark"] .sd-rec-icon.purple{background:rgba(139,92,246,.18);}
[data-theme="dark"] .sd-rec-icon.rose  {background:rgba(239,68,68,.15);}
.sd-rec-body{flex:1;min-width:0;}
.sd-rec-title{font-size:13.5px;font-weight:700;color: var(--sd-text-main);margin-bottom:3px;}
.sd-rec-desc{font-size:12px;color: var(--sd-text-sub);line-height:1.5;margin-bottom:8px;}
.sd-rec-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.sd-rec-tag{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:6px;}
.sd-rec-tag.blue  {background:rgba(99,102,241,.1);color:#6366f1;}
.sd-rec-tag.green {background:rgba(16,185,129,.1);color:#059669;}
.sd-rec-tag.amber {background:rgba(245,158,11,.1);color:#d97706;}
.sd-rec-tag.purple{background:rgba(139,92,246,.1);color:#7c3aed;}
.sd-rec-tag.rose  {background:rgba(239,68,68,.08);color:#dc2626;}
[data-theme="dark"] .sd-rec-tag.blue  {background:rgba(99,102,241,.2);color:#a5b4fc;}
[data-theme="dark"] .sd-rec-tag.green {background:rgba(16,185,129,.2);color:#6ee7b7;}
[data-theme="dark"] .sd-rec-tag.amber {background:rgba(245,158,11,.2);color:#fcd34d;}
[data-theme="dark"] .sd-rec-tag.purple{background:rgba(139,92,246,.2);color:#c4b5fd;}
[data-theme="dark"] .sd-rec-tag.rose  {background:rgba(239,68,68,.15);color:#fca5a5;}
.sd-rec-time{font-size:11px;color: var(--sd-text-muted);font-weight:500;}
.sd-rec-priority{font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;flex-shrink:0;text-transform:uppercase;letter-spacing:.05em;}
.sd-rec-priority.high{background:rgba(239,68,68,.08);color:#dc2626;}
.sd-rec-priority.med {background:rgba(99,102,241,.1);color:#6366f1;}
.sd-rec-priority.low {background:rgba(16,185,129,.1);color:#059669;}
[data-theme="dark"] .sd-rec-priority.high{background:rgba(239,68,68,.18);color:#fca5a5;}
[data-theme="dark"] .sd-rec-priority.med {background:rgba(99,102,241,.2);color:#a5b4fc;}
[data-theme="dark"] .sd-rec-priority.low {background:rgba(16,185,129,.2);color:#6ee7b7;}
.sd-rec-start-btn{padding:7px 14px;border-radius:9px;border:none;font-size:11.5px;font-weight:700;
  cursor:pointer;font-family:inherit;color:#fff;flex-shrink:0;align-self:center;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  box-shadow:0 3px 10px rgba(99,102,241,.3);transition:all .2s;}
.sd-rec-start-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(99,102,241,.4);}

/* ── Section titles ── */
.sd-section-title{font-size:13px;font-weight:800;color: var(--sd-text-muted);
  text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;
  display:flex;align-items:center;gap:8px;}
.sd-section-title::after{content:'';flex:1;height:1px;background: var(--sd-border);}

/* ── Recharts dark mode overrides ── */
[data-theme="dark"] .recharts-cartesian-grid line { stroke: rgba(255,255,255,.06); }
[data-theme="dark"] .recharts-text { fill: #64748b; }
[data-theme="dark"] .recharts-tooltip-wrapper .sd-tip { background: #1a2540; border-color: rgba(255,255,255,.1); }

/* ── Responsive ── */
@media(max-width:1200px){
  .sd-stats{grid-template-columns:repeat(2,1fr);}
  .sd-3col{grid-template-columns:1fr 1fr;}
  .sd-main-grid{grid-template-columns:1fr 300px;}
  .sd-syl-grid{grid-template-columns:repeat(3,1fr);}
}
@media(max-width:1024px){
  .sd-main-grid{grid-template-columns:1fr;}
  .sd-2col{grid-template-columns:1fr;}
  .sd-3col{grid-template-columns:1fr 1fr;}
  .sd-ach-grid{grid-template-columns:repeat(2,1fr);}
  .sd-syl-grid{grid-template-columns:repeat(3,1fr);}
}
@media(max-width:900px){
  .sd-hero{margin:12px 16px 0;padding:14px 18px;}
  .sd-hero-right .sd-hstat:nth-child(3),.sd-hero-right .sd-hstat:nth-child(4){display:none;}
  .sd-stats{padding:12px 16px 0;gap:12px;}
  .sd-body{padding:12px 16px 56px;}
}
@media(max-width:768px){
  .sd-hero{margin:10px 12px 0;padding:12px 16px;border-radius:16px;}
  .sd-hero-title{font-size:16px;}
  .sd-hero-sub{font-size:11px;}
  .sd-hero-right{display:none;}
  .sd-stats{grid-template-columns:repeat(2,1fr);padding:10px 12px 0;}
  .sd-scard{padding:15px;}
  .sd-body{padding:10px 12px 56px;}
  .sd-3col{grid-template-columns:1fr;}
  .sd-syl-grid{grid-template-columns:repeat(2,1fr);}
  .sd-panel-head{flex-direction:column;align-items:flex-start;gap:8px;}
  .sd-op-mini-row{grid-template-columns:repeat(3,1fr);}
}
@media(max-width:600px){
  .sd-hero{margin:10px 10px 0;padding:12px 14px;border-radius:14px;}
  .sd-hero-title{font-size:15px;}
  .sd-hero-left{gap:10px;}
  .sd-hero-avatar{width:36px;height:36px;font-size:15px;}
  .sd-stats{padding:10px 10px 0;gap:9px;}
  .sd-body{padding:10px 10px 56px;}
  .sd-scard-n{font-size:26px;}
  .sd-ach-grid{grid-template-columns:repeat(2,1fr);}
  .sd-course{flex-wrap:wrap;}
  .sd-cont-btn{width:100%;margin-top:8px;text-align:center;}
  .sd-lb-right .sd-lb-streak{display:none;}
  .sd-rec-start-btn{display:none;}
  .sd-syl-grid{grid-template-columns:repeat(2,1fr);}
  .sd-op-big-n{font-size:34px;}
}
@media(max-width:480px){
  .sd-hero{margin:8px 8px 0;padding:10px 12px;border-radius:13px;}
  .sd-hero-title{font-size:14px;}
  .sd-stats{grid-template-columns:repeat(2,1fr);padding:8px 8px 0;gap:8px;}
  .sd-scard{padding:13px;border-radius:15px;}
  .sd-scard-n{font-size:24px;}
  .sd-scard-icon{width:34px;height:34px;border-radius:10px;}
  .sd-body{padding:8px 8px 56px;}
  .sd-ach-grid{grid-template-columns:repeat(2,1fr);gap:9px;}
  .sd-syl-grid{grid-template-columns:1fr 1fr;}
  .sd-lb-medal{display:none;}
}
@media(max-width:360px){
  .sd-hero-title{font-size:13px;}
  .sd-scard-n{font-size:21px;}
  .sd-scard{padding:11px;}
  .sd-syl-grid{grid-template-columns:1fr 1fr;gap:8px;}
}
`;

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="sd-tip">
      <div className="sd-tip-label">{label}</div>
      <div className="sd-tip-val">{payload[0].value}{payload[0].name === "minutes" ? " min" : payload[0].name === "pct" ? "%" : " pts"}</div>
    </div>
  );
};

function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = () => { cur += target / 55; if (cur < target) { setV(Math.floor(cur)); requestAnimationFrame(step); } else setV(target); };
    requestAnimationFrame(step);
  }, [target]);
  return <>{v}{suffix}</>;
}

const WEEKLY_ACTIVITY = [
  { day:"Mon", pts:50, minutes:45 }, { day:"Tue", pts:80, minutes:60 },
  { day:"Wed", pts:65, minutes:35 }, { day:"Thu", pts:110, minutes:80 },
  { day:"Fri", pts:90, minutes:70 }, { day:"Sat", pts:140, minutes:110 },
  { day:"Sun", pts:120, minutes:90 },
];

const DAILY_HOURS = [
  { label:"6am", val:10 }, { label:"9am", val:40 }, { label:"12pm", val:25 },
  { label:"3pm", val:70 }, { label:"6pm", val:85 }, { label:"9pm", val:60 },
];

const SUBJECT_DIST = [
  { name:"Math",    value:32, color:"#6366f1" },
  { name:"Biology", value:24, color:"#10b981" },
  { name:"History", value:20, color:"#8b5cf6" },
  { name:"Physics", value:14, color:"#ec4899" },
  { name:"English", value:10, color:"#f59e0b" },
];

const SCORE_TREND = [
  { week:"W1", score:72 }, { week:"W2", score:75 }, { week:"W3", score:70 },
  { week:"W4", score:82 }, { week:"W5", score:79 }, { week:"W6", score:88 },
  { week:"W7", score:84 }, { week:"W8", score:91 },
];

const LEADERBOARD = [
  { id:1, name:"Alex Chen",   pts:2450, level:8, streak:12, rank:1, avatar:"AC", bg:"linear-gradient(135deg,#f59e0b,#f97316)" },
  { id:2, name:"Maria L.",    pts:2100, level:7, streak:5,  rank:2, avatar:"ML", bg:"linear-gradient(135deg,#8b5cf6,#6366f1)" },
  { id:3, name:"You",         pts:1250, level:5, streak:7,  rank:3, avatar:"U",  bg:"linear-gradient(135deg,#6366f1,#ec4899)" },
  { id:4, name:"John S.",     pts:1100, level:5, streak:3,  rank:4, avatar:"JS", bg:"linear-gradient(135deg,#10b981,#0ea5e9)" },
  { id:5, name:"Emma B.",     pts:980,  level:4, streak:8,  rank:5, avatar:"EB", bg:"linear-gradient(135deg,#ec4899,#f59e0b)" },
];

const RECS = [
  { id:1, icon:"🧮", iconColor:"blue",   title:"Revise Quadratic Equations",   desc:"You scored 58% on your last quiz. Focus on factorisation and discriminant topics.",      tag:"Math",    tagColor:"blue",   time:"~20 min", priority:"high", cat:"weak" },
  { id:2, icon:"⚡", iconColor:"purple", title:"Complete Physics: Wave Motion", desc:"This topic is due in 2 days. You haven't started — now is the right time.",              tag:"Physics",  tagColor:"purple", time:"~35 min", priority:"high", cat:"urgent" },
  { id:3, icon:"📖", iconColor:"green",  title:"Continue: Photosynthesis",      desc:"You're 42% through. Pick up from the light-dependent reactions section.",                tag:"Biology",  tagColor:"green",  time:"~15 min", priority:"med",  cat:"continue" },
  { id:4, icon:"🌍", iconColor:"amber",  title:"World War II: Revision Quiz",   desc:"You completed this chapter. Take the quiz to solidify your knowledge and earn XP.",     tag:"History",  tagColor:"amber",  time:"~10 min", priority:"low",  cat:"quiz" },
  { id:5, icon:"✍️", iconColor:"rose",   title:"English: Essay Writing Skills", desc:"AI recommends improving essay structure based on your recent assignment feedback.",     tag:"English",  tagColor:"rose",   time:"~30 min", priority:"med",  cat:"improve" },
];

const REC_FILTERS = ["All", "Urgent", "Continue", "Quiz", "Improve"];

export default function StudentDashboard({ onStartQuiz }: StudentDashboardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lbPeriod, setLbPeriod] = useState("week");
  const [recFilter, setRecFilter] = useState("All");
  const [actTab, setActTab] = useState<"pts"|"minutes">("pts");

  const { data: stats, isLoading } = useQuery<StudentStats>({ queryKey: ["/api/student/stats"] });
  const { data: streak }           = useQuery<StreakData>({ queryKey: ["/api/student/streak"] });
  const recentActivity = (stats as any)?.recentActivity || [];

  const filteredRecs = recentActivity.map((item: any, index: number) => ({
    id: index + 1,
    icon: "📘",
    iconColor: "blue",
    title: item.title || "Continue learning",
    desc: `${item.subject || "Subject"}${item.unit ? ` · ${item.unit}` : ""}`,
    tag: item.subject || "Study",
    tagColor: "blue",
    time: "Live",
    priority: "med",
    cat: "continue",
  }));

  const courses = [
    { id:1, name:"Quadratic Equations", subject:"Mathematics · Grade 10", pct:65, icon:"🧮", color:"blue",   bar:"linear-gradient(90deg,#6366f1,#8b5cf6)" },
    { id:2, name:"Photosynthesis",       subject:"Biology · Grade 9",      pct:42, icon:"🌿", color:"green",  bar:"linear-gradient(90deg,#10b981,#34d399)" },
    { id:3, name:"World War II",          subject:"History · Grade 11",     pct:80, icon:"🌍", color:"purple", bar:"linear-gradient(90deg,#8b5cf6,#ec4899)" },
  ];

  const tests = [
    { id:1, title:"Physics Quiz",  desc:"Motion & Force · 20 questions", due:"Tomorrow",  urgency:"urgent" as const, action:"🔥 Study Now",  href:"/courses" },
    { id:2, title:"Math Test",     desc:"Algebra · 15 questions",        due:"In 3 days", urgency:"medium" as const, action:"📚 Prepare",    href:"/studio/quiz?questions=15" },
  ];

  const achs = [
    { id:1, title:"Perfect Score",  desc:"Math Quiz · 100%",   emoji:"⭐", ai:"ai-yellow", c:"yellow" },
    { id:2, title:"Streak Master",  desc:"10 days in a row",   emoji:"🔥", ai:"ai-green",  c:"green" },
    { id:3, title:"Chapter Master", desc:"Biology Ch. 3",      emoji:"🎓", ai:"ai-purple", c:"purple" },
    { id:4, title:"Fast Learner",   desc:"Record completion",  emoji:"🚀", ai:"ai-blue",   c:"blue" },
  ];

  const liveCourses = recentActivity.map((item: any, index: number) => ({
    id: index + 1,
    name: item.title || "Continue learning",
    subject: `${item.subject || "Subject"}${item.unit ? ` · ${item.unit}` : ""}`,
    pct: 0,
    icon: "📘",
    color: "blue",
    bar: "linear-gradient(90deg,#6366f1,#8b5cf6)",
  }));
  const liveTests: typeof tests = [];
  const liveAchievements: typeof achs = [];

  // read dark/light from the document element's data-theme attribute
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const chartAxisColor = isDark ? "#475569" : "#94a3b8";
  const chartGridColor = isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)";
  const areaGradStop1  = isDark ? 0.35 : 0.25;

  return (
    <>
      <style>{CSS}</style>
      <div className="sd-root">

        {/* Hero */}
        <div className="sd-hero">
          <div className="sd-hero-inner">
            <div className="sd-hero-left">
              <div className="sd-hero-avatar">{(user?.firstName?.[0] ?? "A").toUpperCase()}</div>
              <div className="sd-hero-text">
                <div className="sd-hero-pill">🎓 Student Dashboard</div>
                <div className="sd-hero-title">Welcome back, {user?.firstName ?? "Alex"}! 👋</div>
                <div className="sd-hero-sub">{streak?.currentStreak ?? 7}-day streak · Level 5 · Keep it going!</div>
              </div>
            </div>
            <div className="sd-hero-right">
              {[
                { n: streak?.currentStreak ?? 7, l:"Streak 🔥" },
                { n: stats?.lessonsCompleted ?? 12, l:"Lessons" },
                { n: "#3", l:"Rank" },
                { n: "Lvl 5", l:"Level" },
              ].map((s,i)=>(
                <div className="sd-hstat" key={i}>
                  <div className="sd-hstat-n">{s.n}</div>
                  <div className="sd-hstat-l">{s.l}</div>
                </div>
              ))}
              <Link href="/ai-tutor"><button className="sd-hero-btn">Start Learning →</button></Link>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="sd-stats">
          {[
            { label:"Lessons Done", value:stats?.lessonsCompleted??12, cls:"blue",   icon:"📚", sub:"↑ 3 from last week",  suffix:"" },
            { label:"Avg Score",    value:stats?.averageScore??84,      cls:"green",  icon:"🏆", sub:"↑ 5% improvement",    suffix:"%" },
            { label:"Study Hours",  value:stats?.totalTimeSpent??6,     cls:"purple", icon:"⏱️", sub:"↑ 1h from last week", suffix:"h" },
            { label:"Badges",       value:stats?.badgesEarned??7,       cls:"amber",  icon:"🏅", sub:"2 new this week",     suffix:"" },
          ].map((s,i)=>(
            <motion.div key={i} className={`sd-scard ${s.cls}`} style={{animationDelay:`${0.05+i*0.07}s`}}>
              <div className="sd-scard-icon">{s.icon}</div>
              <div className="sd-scard-n">{isLoading ? "—" : <AnimNum target={s.value} suffix={s.suffix}/>}</div>
              <div className="sd-scard-l">{s.label}</div>
              <div className="sd-scard-sub">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="sd-body">

          {/* Row 1: Weekly activity + Score trend */}
          <div className="sd-2col" style={{marginBottom:16}}>
            <div className="sd-panel">
              <div className="sd-panel-head">
                <div>
                  <div className="sd-panel-title">📊 Weekly Activity</div>
                  <div className="sd-panel-sub">XP earned & study minutes this week</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {(["pts","minutes"] as const).map(t=>(
                    <button key={t} className={`sd-lb-pbtn${actTab===t?" on":""}`} onClick={()=>setActTab(t)}>
                      {t==="pts"?"XP":"Time"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sd-panel-body">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={WEEKLY_ACTIVITY}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={areaGradStop1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor}/>
                    <XAxis dataKey="day" tick={{fontSize:11,fill:chartAxisColor}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:chartAxisColor}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Area type="monotone" dataKey={actTab} stroke="#6366f1" strokeWidth={2.5}
                      fill="url(#areaGrad)" dot={{fill:"#6366f1",r:4}} activeDot={{r:6}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="sd-panel">
              <div className="sd-panel-head">
                <div>
                  <div className="sd-panel-title">📈 Score Trend</div>
                  <div className="sd-panel-sub">Average quiz/test scores over 8 weeks</div>
                </div>
                <div style={{padding:"4px 12px",borderRadius:20,background:"rgba(16,185,129,.1)",color:"#059669",fontSize:12,fontWeight:700}}>
                  ↑ +19% overall
                </div>
              </div>
              <div className="sd-panel-body">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={SCORE_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor}/>
                    <XAxis dataKey="week" tick={{fontSize:11,fill:chartAxisColor}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:chartAxisColor}} axisLine={false} tickLine={false} domain={[60,100]}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3}
                      dot={{fill:"#10b981",r:4,strokeWidth:2,stroke: isDark ? "#141f35" : "#fff"}} activeDot={{r:7}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Overall progress + Daily progress + Subject distribution */}
          <div className="sd-3col" style={{marginBottom:16}}>
            <div className="sd-panel">
              <div className="sd-panel-head"><div className="sd-panel-title">🎯 Overall Progress</div></div>
              <div className="sd-panel-body">
                <div className="sd-op-big-num">
                  <span className="sd-op-big-n">72</span>
                  <span className="sd-op-big-suffix">%</span>
                </div>
                <div className="sd-op-big-label">Curriculum covered overall</div>
                <div className="sd-op-stack">
                  {SUBJECT_DIST.map((s,i)=>(
                    <motion.div key={i} className="sd-op-stack-seg"
                      style={{background:s.color, flex:0}}
                      animate={{flex:s.value}}
                      transition={{duration:1,delay:i*.08,ease:[.4,0,.2,1]}}/>
                  ))}
                </div>
                <div className="sd-op-legend">
                  {SUBJECT_DIST.map((s,i)=>(
                    <div key={i} className="sd-op-legend-item">
                      <div className="sd-op-legend-dot" style={{background:s.color}}/>
                      {s.name} <span style={{color:"var(--sd-text-main)",fontWeight:700,marginLeft:2}}>{s.value}%</span>
                    </div>
                  ))}
                </div>
                <div className="sd-op-mini-row">
                  {[{n:"84%",l:"Avg Score",c:"green"},{n:"12",l:"Lessons",c:"blue"},{n:"6h",l:"Study",c:"amber"}].map((m,i)=>(
                    <div key={i} className={`sd-op-mini ${m.c}`}>
                      <div className="sd-op-mini-n">{m.n}</div>
                      <div className="sd-op-mini-l">{m.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sd-panel">
              <div className="sd-panel-head">
                <div className="sd-panel-title">⏰ Daily Progress</div>
                <div className="sd-panel-sub">Study hours by time of day</div>
              </div>
              <div className="sd-panel-body">
                <div className="sd-dp-time">
                  {DAILY_HOURS.map((h,i)=>(
                    <div key={i} className="sd-dp-row">
                      <span className="sd-dp-label">{h.label}</span>
                      <div className="sd-dp-bar-bg">
                        <motion.div className="sd-dp-bar-fill"
                          style={{background:`linear-gradient(90deg,#6366f1,#8b5cf6)`,width:0}}
                          animate={{width:`${h.val}%`}}
                          transition={{duration:.9,delay:i*.08,ease:[.4,0,.2,1]}}/>
                      </div>
                      <span className="sd-dp-val">{h.val}%</span>
                    </div>
                  ))}
                </div>
                <div className="sd-dp-goal-row">
                  <span style={{fontSize:12,color:"var(--sd-text-sub)",fontWeight:600}}>Daily goal: 2 hrs</span>
                  <span className="sd-dp-goal-pill good">✓ 2.5h today</span>
                </div>
              </div>
            </div>

            <div className="sd-panel">
              <div className="sd-panel-head">
                <div className="sd-panel-title">📚 Subject Split</div>
                <div className="sd-panel-sub">Time distribution this week</div>
              </div>
              <div className="sd-panel-body">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={SUBJECT_DIST} cx="50%" cy="50%" outerRadius={60} innerRadius={35}
                      dataKey="value" paddingAngle={2}>
                      {SUBJECT_DIST.map((d,i)=><Cell key={i} fill={d.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v:any)=>[`${v}%`]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{display:"flex",flexWrap:"wrap",gap:"6px 14px",marginTop:4}}>
                  {SUBJECT_DIST.map((d,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11.5,fontWeight:600,color:"var(--sd-text-sub)"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/>
                      {d.name} <span style={{color:"var(--sd-text-main)",fontWeight:700}}>{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Syllabus progress */}
          <div className="sd-panel" style={{marginBottom:16}}>
            <div className="sd-panel-head">
              <div>
                <div className="sd-panel-title">📋 Syllabus Progress</div>
                <div className="sd-panel-sub">Curriculum coverage across all subjects</div>
              </div>
              <Link href="/courses"><button className="sd-view-all">View all →</button></Link>
            </div>
            <div className="sd-panel-body">
              <div className="sd-syl-grid">
                {[
                  { name:"Mathematics", pct:65, emoji:"🧮", cls:"math",  color:"#6366f1", chapters:7, total:10 },
                  { name:"Biology",     pct:42, emoji:"🌿", cls:"bio",   color:"#10b981", chapters:5, total:12 },
                  { name:"History",     pct:80, emoji:"🌍", cls:"hist",  color:"#8b5cf6", chapters:8, total:10 },
                  { name:"Physics",     pct:28, emoji:"⚡", cls:"phys",  color:"#ec4899", chapters:3, total:11 },
                  { name:"English",     pct:55, emoji:"✍️", cls:"eng",   color:"#f59e0b", chapters:6, total:11 },
                ].map((s,i)=>{
                  const r = 25; const circ = 2 * Math.PI * r;
                  const offset = circ - (s.pct / 100) * circ;
                  return (
                    <motion.div key={i} className={`sd-syl-card ${s.cls}`}
                      initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.07}}>
                      <span className="sd-syl-emoji">{s.emoji}</span>
                      <div className="sd-syl-subject">{s.name}</div>
                      <div className="sd-syl-ring-wrap">
                        <svg viewBox="0 0 60 60">
                          <circle className="sd-syl-ring-bg" cx="30" cy="30" r={r}/>
                          <circle className="sd-syl-ring-fill" cx="30" cy="30" r={r}
                            stroke={s.color} strokeDasharray={circ} strokeDashoffset={offset}/>
                        </svg>
                        <div className="sd-syl-ring-label" style={{color:s.color}}>{s.pct}%</div>
                      </div>
                      <div className="sd-syl-chapters">{s.chapters}/{s.total} chapters</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Courses + Tests */}
          <div className="sd-main-grid">
            <div className="sd-panel">
              <div className="sd-panel-head">
                <div className="sd-panel-title">📖 Continue Learning</div>
                <Link href="/courses"><button className="sd-view-all">View all →</button></Link>
              </div>
              <div className="sd-panel-body" style={{padding:"14px 18px"}}>
                {liveCourses.length === 0 && (
                  <div className="sd-panel-sub">No data available</div>
                )}
                {liveCourses.map((c,i)=>(
                  <motion.div key={c.id} className="sd-course"
                    initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.07}}>
                    <div className={`sd-course-icon ${c.color}`}>{c.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="sd-course-name">{c.name}</div>
                      <div className="sd-course-meta">{c.subject}</div>
                      <div className="sd-prog-bg">
                        <div className="sd-prog-fill" style={{width:`${c.pct}%`,background:c.bar}}/>
                      </div>
                      <div className="sd-prog-pct">{c.pct}% complete</div>
                    </div>
                    <Link href="/bookExpanded"><button className="sd-cont-btn">Continue</button></Link>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="sd-panel">
              <div className="sd-panel-head"><div className="sd-panel-title">📅 Upcoming Tests</div></div>
              <div className="sd-panel-body" style={{padding:"14px 18px"}}>
                {liveTests.length === 0 && (
                  <div className="sd-panel-sub">No data available</div>
                )}
                {liveTests.map((t,i)=>(
                  <div key={t.id} className={`sd-test ${t.urgency}`}>
                    <div className="sd-test-hd">
                      <div className="sd-test-title">{t.title}</div>
                      <span className={`sd-test-badge ${t.urgency==="urgent"?"tb-urgent":"tb-medium"}`}>{t.due}</span>
                    </div>
                    <div className="sd-test-meta">{t.desc}</div>
                    <button className={`sd-test-btn ${t.urgency}`} onClick={()=>setLocation(t.href)}>{t.action}</button>
                  </div>
                ))}
                <div style={{textAlign:"center",marginTop:14}}>
                  <Link href="/exam-preparation"><button className="sd-view-all">Prep Exam →</button></Link>
                  <Link href="/studio/quiz"><button className="sd-view-all">View all tests →</button></Link>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="sd-panel" style={{marginBottom:16}}>
            <div className="sd-panel-head">
              <div className="sd-panel-title">🏆 Recent Achievements</div>
              <Link href="/achievements"><button className="sd-view-all">View all →</button></Link>
            </div>
            <div className="sd-panel-body">
              <div className="sd-ach-grid">
                {liveAchievements.length === 0 && (
                  <div className="sd-panel-sub">No data available</div>
                )}
                {liveAchievements.map((a,i)=>(
                  <motion.div key={a.id} className={`sd-ach ${a.c}`}
                    initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}>
                    <div className={`sd-ach-icon ${a.ai}`}>{a.emoji}</div>
                    <div className="sd-ach-name">{a.title}</div>
                    <div className="sd-ach-desc">{a.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard + Recommendations */}
          <div className="sd-2col">
            <div className="sd-panel">
              <div className="sd-panel-head">
                <div>
                  <div className="sd-panel-title">👥 Leaderboard</div>
                  <div className="sd-panel-sub">See how you compare with classmates</div>
                </div>
                <div className="sd-lb-period">
                  {["week","month","all"].map(p=>(
                    <button key={p} className={`sd-lb-pbtn${lbPeriod===p?" on":""}`} onClick={()=>setLbPeriod(p)}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="sd-panel-body">
                {LEADERBOARD.map((e,i)=>{
                  const isMe = e.name==="You";
                  const rankCls = i===0?"gold":i===1?"silver":i===2?"bronze":"other";
                  return (
                    <motion.div key={e.id} className={`sd-lb-row${isMe?" me":""}`}
                      initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.06}}>
                      <div className={`sd-lb-rank ${rankCls}`}>{e.rank}</div>
                      <div className="sd-lb-medal">{i===0?"🥇":i===1?"🥈":i===2?"🥉":""}</div>
                      <div className="sd-lb-avatar" style={{background:e.bg}}>{e.avatar}</div>
                      <div className="sd-lb-info">
                        <div className="sd-lb-name">{e.name}{isMe&&<span className="sd-lb-you">You</span>}</div>
                        <div className="sd-lb-level">Level {e.level}</div>
                      </div>
                      <div className="sd-lb-right">
                        <div className="sd-lb-streak">🔥{e.streak}d</div>
                        <div className="sd-lb-pts">⭐{e.pts.toLocaleString()}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="sd-panel">
              <div className="sd-panel-head">
                <div>
                  <div className="sd-panel-title">🧠 Smart Recommendations</div>
                  <div className="sd-panel-sub">AI-powered learning suggestions</div>
                </div>
              </div>
              <div style={{padding:"10px 22px 0"}}>
                <div className="sd-rec-filter">
                  {REC_FILTERS.map(f=>(
                    <button key={f} className={`sd-rec-ftag${recFilter===f?" on":""}`} onClick={()=>setRecFilter(f)}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="sd-panel-body">
                <AnimatePresence mode="wait">
                  <motion.div key={recFilter}
                    initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.18}}>
                    {filteredRecs.length === 0 && (
                      <div className="sd-panel-sub">No data available</div>
                    )}
                    {filteredRecs.slice(0,4).map((r,i)=>(
                      <motion.div key={r.id} className={`sd-rec-item priority-${r.priority==="high"?"high":r.priority==="med"?"med":"low"}`}
                        initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*.05}}>
                        <div className={`sd-rec-icon ${r.iconColor}`}>{r.icon}</div>
                        <div className="sd-rec-body">
                          <div className="sd-rec-title">{r.title}</div>
                          <div className="sd-rec-desc">{r.desc}</div>
                          <div className="sd-rec-meta">
                            <span className={`sd-rec-tag ${r.tagColor}`}>{r.tag}</span>
                            <span className="sd-rec-time">⏱ {r.time}</span>
                            <span className={`sd-rec-priority ${r.priority}`}>{r.priority==="high"?"Urgent":r.priority==="med"?"Medium":"Low"}</span>
                          </div>
                        </div>
                        <button className="sd-rec-start-btn" onClick={()=>setLocation("/ai-tutor")}>Start →</button>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
