import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "../components/navigation";
import {
  Star, Flame, TrendingUp, BookOpen, Brain,
  Crown, Medal, Users, Target, ChevronUp, Award, CheckCircle2,
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { useTheme } from "../hooks/use-theme";
import { useNotificationStore } from "../lib/notification-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { getStudentProgressSummary } from "../lib/gradeupApi";

// ── Assets ────────────────────────────────────────────────────────────────────
import roboImg from "../assets/robo.png";
import studyRoboImg from "../assets/dashboard/study-robo.png";
import subjectEnglishImg from "../assets/dashboard/subject-english.png";
import subjectScienceImg from "../assets/dashboard/subject-science.png";
import subjectSocialImg from "../assets/dashboard/subject-social.png";
import subjectMathsImg from "../assets/dashboard/subject-maths.png";

// ─── CSS Stylesheet (Matching homework-page.tsx Layout & Tokens) ───────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root {
  --brand:#6349ff;--brand2:#a03dff;--brand3:#ff4d8d;--success:#12a66a;--warning:#ff9c1a;--danger:#ef4444;--sky:#2389ff;
}

.pg-root {
  --bg-app:#fbfcff;--bg-app-2:#f2f6ff;--surface:rgba(255,255,255,.88);--surface2:#f7faff;--surface3:#edf2ff;
  --border:rgba(15,23,42,.1);--border2:rgba(15,23,42,.15);--text:#071235;--text2:#26345e;--muted:#68708a;--subtle:#8c94aa;
  --shadow:0 10px 24px rgba(35,44,87,.09);--shadow-md:0 14px 30px rgba(35,44,87,.14);--shadow-lg:0 20px 48px rgba(35,44,87,.2);
  --radius:20px;--radius-sm:15px;
}

.dark {
  --bg-app:#080d1f;--bg-app-2:#10172d;--surface:rgba(23,31,58,.9);--surface2:rgba(31,42,76,.78);--surface3:rgba(43,56,96,.72);
  --border:rgba(255,255,255,.12);--border2:rgba(255,255,255,.18);--text:#f6f7ff;--text2:#d6def5;--muted:#b5bfd8;--subtle:#7f8aa7;
  --shadow:0 14px 34px rgba(0,0,0,.28);--shadow-md:0 18px 42px rgba(0,0,0,.38);--shadow-lg:0 24px 58px rgba(0,0,0,.48);
}

::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:10px;}

.pg-root {
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  background:radial-gradient(circle at 14% 9%,rgba(126,87,255,.12),transparent 26%),
             radial-gradient(circle at 88% 14%,rgba(255,171,64,.16),transparent 25%),
             linear-gradient(180deg,var(--bg-app),var(--bg-app-2));
  min-height:100vh;
  color:var(--text);
  transition:background .3s,color .3s;
  position:relative;
  overflow:hidden;
}

.pg-root::before,.pg-root::after{
  content:'';position:absolute;z-index:0;pointer-events:none;border-radius:999px;opacity:.55;filter:blur(.2px);
  animation:pgFloatBg 12s ease-in-out infinite alternate;
}
.pg-root::before{
  width:260px;height:260px;left:-90px;top:90px;
  background:radial-gradient(circle,rgba(46,182,255,.18),transparent 68%);
}
.pg-root::after{
  width:300px;height:300px;right:-110px;top:390px;
  background:radial-gradient(circle,rgba(255,95,153,.14),transparent 70%);
  animation-delay:-5s;
}

.dark.pg-root {
  background:radial-gradient(circle at 14% 9%,rgba(99,91,255,.2),transparent 26%),
             radial-gradient(circle at 88% 14%,rgba(255,156,26,.12),transparent 25%),
             linear-gradient(180deg,var(--bg-app),var(--bg-app-2));
}

@keyframes pgFloatBg{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(22px,28px,0) scale(1.08)}}
@keyframes pgDrift{0%,100%{transform:translateX(-50%) translate3d(0,0,0) rotate(-3deg)}50%{transform:translateX(-50%) translate3d(10px,-8px,0) rotate(3deg)}}
@keyframes pgShine{0%,45%{transform:translateX(-140%) rotate(18deg)}75%,100%{transform:translateX(240%) rotate(18deg)}}
@keyframes pgPop3d{0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}50%{transform:translateY(-7px) rotate(4deg) scale(1.06)}}
@keyframes heroIn{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}
@keyframes scardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4)}50%{box-shadow:0 0 0 12px rgba(99,102,241,0)}}
@keyframes trophyBounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-10px) scale(1.08)}}

.pg-ambient{
  position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse 65% 50% at 80% 10%,rgba(99,102,241,.06),transparent),
             radial-gradient(ellipse 50% 55% at 10% 85%,rgba(139,92,246,.05),transparent);
}
.dark .pg-ambient{
  background:radial-gradient(ellipse 65% 50% at 80% 10%,rgba(99,102,241,.09),transparent),
             radial-gradient(ellipse 50% 55% at 10% 85%,rgba(139,92,246,.07),transparent);
}

/* ── Topbar ── */
.pg-topbar{
  position:sticky;top:0;z-index:300;height:60px;display:flex;align-items:center;gap:12px;padding:0 24px;
  background:rgba(255,255,255,.88);border-bottom:1px solid var(--border);backdrop-filter:blur(16px);
  box-shadow:0 2px 12px rgba(0,0,0,.04);transition:background .3s;
}
.dark .pg-topbar{background:rgba(21,28,46,.9);}
.pg-logo-icon{
  width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(99,102,241,.35);flex-shrink:0;
}
.pg-logo-text{font-size:15px;font-weight:800;color:var(--text);letter-spacing:-.2px;}
.pg-topbar-sep{width:1px;height:22px;background:var(--border2);flex-shrink:0;}
.pg-breadcrumb{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--muted);}
.pg-bc-link{cursor:pointer;color:var(--brand);transition:opacity .15s;}
.pg-bc-link:hover{opacity:.7;}
.pg-bc-active{color:var(--text);font-weight:700;}
.pg-topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px;}
.pg-topbar-pill{
  display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:20px;
  font-size:11.5px;font-weight:700;background:rgba(99,102,241,.1);color:var(--brand);border:1px solid rgba(99,102,241,.2);
}
.dark .pg-topbar-pill{background:rgba(99,102,241,.18);color:#a5b4fc;}
.pg-theme-btn{
  width:36px;height:36px;border-radius:10px;border:1.5px solid var(--border2);background:var(--surface2);
  display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:all .18s;
}
.pg-theme-btn:hover{background:var(--surface3);transform:scale(1.06);}

/* ── Hero Banner ── */
.pg-hero{
  margin:20px 28px 0;border-radius:var(--radius);padding:24px 28px;
  background:linear-gradient(135deg,#e9f8d8 0%,#e8f5ff 48%,#fff0ce 100%);
  border:1px solid rgba(35,137,255,.16);position:relative;overflow:hidden;
  box-shadow:var(--shadow);animation:heroIn .55s cubic-bezier(.34,1.56,.64,1) both;
}
.dark .pg-hero{
  background:linear-gradient(135deg,#123326 0%,#101b3f 52%,#392a16 100%);
  border-color:rgba(110,231,183,.18);
}
.pg-hero::after{
  content:'';position:absolute;animation:pgShine 8s ease-in-out infinite;left:38%;bottom:-70px;
  width:66px;height:260px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);border-radius:0;
  pointer-events:none;
}
.pg-hero::before{
  content:'';position:absolute;top:-70px;right:-70px;width:220px;height:220px;border-radius:50%;
  background:rgba(255,255,255,.12);pointer-events:none;
}
.pg-hero-art{
  position:absolute;z-index:2;left:50%;bottom:-2px;width:clamp(110px,15vw,180px);
  transform:translateX(-50%);filter:drop-shadow(0 18px 18px rgba(38,57,116,.2));
  animation:pgDrift 4.8s ease-in-out infinite;pointer-events:none;
}
.pg-hero-art img{display:block;width:100%;height:auto;object-fit:contain;}
.pg-hero-in{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.pg-hero-left{display:flex;align-items:center;gap:16px;}
.pg-hero-avatar{
  width:58px;height:58px;border-radius:20px;background:linear-gradient(145deg,#fff,#dff6ff);
  border:1px solid rgba(35,137,255,.16);display:flex;align-items:center;justify-content:center;
  font-size:28px;font-weight:800;color:#071235;flex-shrink:0;box-shadow:0 14px 22px rgba(38,57,116,.14);
  animation:pgPop3d 4s ease-in-out infinite;
}
.pg-hero-pill{
  display:inline-flex;align-items:center;gap:5px;padding:3px 11px;border-radius:20px;
  margin-bottom:6px;background:rgba(35,137,255,.1);border:1px solid rgba(35,137,255,.18);
  font-size:10.5px;font-weight:800;color:#15704c;
}
.dark .pg-hero-pill{color:#7ee7b7;background:rgba(110,231,183,.1);border-color:rgba(110,231,183,.2);}
.pg-hero-title{
  font-size:clamp(21px,2.8vw,32px);font-weight:800;color:#071235;letter-spacing:0;line-height:1.2;margin-bottom:3px;
}
.dark .pg-hero-title{color:var(--text);}
.pg-hero-sub{font-size:12px;color:var(--muted);line-height:1.5;}
.pg-hero-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.pg-hstat{
  text-align:center;padding:10px 14px;border-radius:14px;min-width:62px;background:rgba(255,255,255,.68);
  border:1px solid rgba(15,23,42,.07);backdrop-filter:blur(8px);transition:transform .2s,box-shadow .2s;cursor:default;
}
.dark .pg-hstat{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.1);}
.pg-hstat:hover{transform:translateY(-3px);box-shadow:var(--shadow-md);}
.pg-hstat-n{font-size:20px;font-weight:800;color:var(--text);line-height:1;}
.pg-hstat-l{font-size:9.5px;color:var(--muted);margin-top:2px;font-weight:700;}
.pg-hero-btn{
  padding:11px 18px;background:linear-gradient(135deg,#7b2cff,#b948d9);color:#fff;border:none;border-radius:14px;
  font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 10px 20px rgba(123,44,255,.23);
  white-space:nowrap;transition:all .2s;display:inline-flex;align-items:center;gap:6px;
}
.pg-hero-btn:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 14px 26px rgba(123,44,255,.32);}

/* ── Stat Cards Grid (Border-Top Style) ── */
.pg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:20px 28px 0;}
.pg-scard{
  background:var(--surface);backdrop-filter:blur(14px);border-radius:18px;padding:18px;border:1px solid var(--border);
  box-shadow:var(--shadow);transition:all .28s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden;
  cursor:pointer;
}
.pg-scard:hover{transform:translateY(-6px) scale(1.01);box-shadow:var(--shadow-lg);}
.pg-scard.blue{border-top:3px solid #6366f1;}
.pg-scard.green{border-top:3px solid #10b981;}
.pg-scard.amber{border-top:3px solid #f59e0b;}
.pg-scard.purple{border-top:3px solid #8b5cf6;}
.pg-scard-icon{
  width:40px;height:40px;border-radius:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;font-size:18px;
}
.pg-scard.blue .pg-scard-icon{background:rgba(99,102,241,.1);}
.pg-scard.green .pg-scard-icon{background:rgba(16,185,129,.1);}
.pg-scard.amber .pg-scard-icon{background:rgba(245,158,11,.1);}
.pg-scard.purple .pg-scard-icon{background:rgba(139,92,246,.1);}
.pg-scard-n{font-size:32px;font-weight:800;color:var(--text);letter-spacing:-1.5px;line-height:1;}
.pg-scard-l{font-size:12.5px;color:var(--muted);margin-top:4px;font-weight:500;}
.pg-scard-sub{font-size:11.5px;color:var(--success);margin-top:6px;font-weight:600;display:flex;align-items:center;gap:4px;}
.pg-scard-sub.sub-amber{color:#d97706;}
.pg-scard-sub.sub-purple{color:#8b5cf6;}

/* Progress Bar inside Card */
.pg-card-track{height:6px;background:var(--surface3);border-radius:6px;margin-top:10px;overflow:hidden;}
.pg-card-fill{
  height:100%;border-radius:6px;background:linear-gradient(90deg,#6366f1,#8b5cf6);
  transition:width .8s cubic-bezier(.4,0,.2,1);
}
.pg-card-meta{display:flex;justify-content:space-between;font-size:10.5px;color:var(--subtle);font-weight:600;margin-top:4px;}

/* ── Body Container ── */
.pg-body{padding:20px 28px 100px;}

/* ── Tab Navigation ── */
.pg-tabs{
  display:flex;gap:6px;background:var(--surface);border-radius:16px;padding:6px;border:1px solid var(--border);
  box-shadow:var(--shadow);margin-bottom:20px;overflow-x:auto;scrollbar-width:none;
}
.pg-tabs::-webkit-scrollbar{display:none;}
.pg-tab{
  flex:1;min-width:fit-content;display:flex;align-items:center;justify-content:center;gap:7px;
  padding:10px 18px;border-radius:12px;border:none;background:transparent;
  font-family:inherit;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;
  transition:all .2s cubic-bezier(.4,0,.2,1);white-space:nowrap;
}
.pg-tab:hover{background:rgba(99,102,241,.06);color:var(--brand);}
.pg-tab.on{
  background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
  box-shadow:0 4px 14px rgba(99,102,241,.32);
}

/* ── Panels & Cards ── */
.pg-panel{
  background:var(--surface);backdrop-filter:blur(14px);border-radius:var(--radius);border:1px solid var(--border);
  box-shadow:var(--shadow);overflow:hidden;transition:box-shadow .2s;
}
.pg-panel-head{
  padding:18px 22px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;
  justify-content:space-between;gap:12px;flex-wrap:wrap;
}
.pg-panel-title{font-size:15px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px;}
.pg-panel-sub{font-size:12px;color:var(--muted);margin-top:3px;}
.pg-panel-body{padding:20px 22px;}
.pg-view-all{
  font-size:12.5px;font-weight:700;color:var(--brand);border:none;background:none;cursor:pointer;
  font-family:inherit;padding:6px 12px;border-radius:8px;transition:background .15s;
}
.pg-view-all:hover{background:rgba(99,102,241,.08);}

/* ── 2-Column Responsive Grid ── */
.pg-2col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}

/* ── Quick Highlights Row ── */
.pg-quick-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px;}
.pg-qstat-card{
  background:var(--surface);backdrop-filter:blur(14px);border-radius:16px;border:1px solid var(--border);
  padding:18px 20px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow);
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
}
.pg-qstat-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-md);}
.pg-qstat-icon{
  width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;
  font-size:22px;flex-shrink:0;
}
.pg-qstat-val{font-size:24px;font-weight:800;line-height:1;margin-bottom:3px;}
.pg-qstat-lbl{font-size:12px;color:var(--muted);font-weight:500;}

/* ── Subject Mastery Grid (Matching homework-page.tsx syllabus) ── */
.pg-syl-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px;}
.pg-syl-card{
  border-radius:var(--radius-sm);padding:18px 14px;text-align:center;border:1.5px solid transparent;
  position:relative;overflow:hidden;transition:all .24s cubic-bezier(.34,1.56,.64,1);background:var(--surface);
  box-shadow:var(--shadow);cursor:pointer;
}
.pg-syl-card:hover{transform:translateY(-6px) scale(1.02);box-shadow:var(--shadow-lg);}
.pg-syl-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3.5px;}
.pg-syl-card.math{border-color:rgba(99,102,241,.2);background:rgba(99,102,241,.04);}.pg-syl-card.math::before{background:linear-gradient(90deg,#6366f1,#8b5cf6);}
.pg-syl-card.bio{border-color:rgba(16,185,129,.2);background:rgba(16,185,129,.04);}.pg-syl-card.bio::before{background:linear-gradient(90deg,#10b981,#34d399);}
.pg-syl-card.hist{border-color:rgba(139,92,246,.2);background:rgba(139,92,246,.04);}.pg-syl-card.hist::before{background:linear-gradient(90deg,#8b5cf6,#a78bfa);}
.pg-syl-card.phys{border-color:rgba(236,72,153,.2);background:rgba(236,72,153,.04);}.pg-syl-card.phys::before{background:linear-gradient(90deg,#ec4899,#f97316);}
.pg-syl-card.cs{border-color:rgba(14,165,233,.2);background:rgba(14,165,233,.04);}.pg-syl-card.cs::before{background:linear-gradient(90deg,#0ea5e9,#6366f1);}

.dark .pg-syl-card.math{background:rgba(99,102,241,.09);}
.dark .pg-syl-card.bio{background:rgba(16,185,129,.09);}
.dark .pg-syl-card.hist{background:rgba(139,92,246,.09);}
.dark .pg-syl-card.phys{background:rgba(236,72,153,.09);}
.dark .pg-syl-card.cs{background:rgba(14,165,233,.09);}

.pg-syl-art{
  height:68px;width:98px;object-fit:contain;object-position:50% 50%;display:block;margin:-4px auto 8px;
  position:relative;left:6px;filter:drop-shadow(0 8px 8px rgba(38,57,116,.14));
  animation:pgDrift 5s ease-in-out infinite;animation-delay:var(--delay,0s);
}
.pg-syl-name{font-size:12.5px;font-weight:700;color:var(--text);margin-bottom:8px;}
.pg-syl-ring-wrap{position:relative;width:64px;height:64px;margin:0 auto 8px;}
.pg-syl-ring-wrap svg{width:64px;height:64px;transform:rotate(-90deg);}
.pg-syl-ring-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:800;}
.pg-syl-sub{font-size:11px;color:var(--subtle);font-weight:500;}

/* ── Achievements Cards (Matching hw-ach-item format) ── */
.pg-ach-filter-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
.pg-ach-fchip{
  padding:6px 14px;border-radius:20px;border:1.5px solid var(--border2);background:var(--surface2);
  font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;font-family:inherit;transition:all .18s;
}
.pg-ach-fchip:hover{border-color:var(--brand);color:var(--brand);}
.pg-ach-fchip.on{
  background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(99,102,241,.3);
}

.pg-ach-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.pg-ach-card{
  border-radius:var(--radius-sm);padding:18px 16px;text-align:center;border:1.5px solid transparent;
  position:relative;overflow:hidden;transition:all .22s cubic-bezier(.34,1.56,.64,1);background:var(--surface);
  box-shadow:var(--shadow);
}
.pg-ach-card:hover{transform:translateY(-5px) scale(1.02);box-shadow:var(--shadow-lg);}
.pg-ach-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3.5px;}

.pg-ach-card.yellow{background:linear-gradient(135deg,#fffbeb,#fef3c7);border-color:#fde68a;}.pg-ach-card.yellow::before{background:linear-gradient(90deg,#f59e0b,#fbbf24);}
.pg-ach-card.green{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:#bbf7d0;}.pg-ach-card.green::before{background:linear-gradient(90deg,#10b981,#34d399);}
.pg-ach-card.purple{background:linear-gradient(135deg,#faf5ff,#ede9fe);border-color:#ddd6fe;}.pg-ach-card.purple::before{background:linear-gradient(90deg,#8b5cf6,#a78bfa);}
.pg-ach-card.blue{background:linear-gradient(135deg,#eff6ff,#dbeafe);border-color:#bfdbfe;}.pg-ach-card.blue::before{background:linear-gradient(90deg,#3b82f6,#60a5fa);}
.pg-ach-card.locked{background:var(--surface2);border-color:var(--border);opacity:.78;}
.pg-ach-card.locked::before{background:var(--border2);}

.dark .pg-ach-card.yellow{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.3);}
.dark .pg-ach-card.green{background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.3);}
.dark .pg-ach-card.purple{background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.3);}
.dark .pg-ach-card.blue{background:rgba(59,130,246,.12);border-color:rgba(59,130,246,.3);}
.dark .pg-ach-card.locked{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.08);}

.pg-ach-icon{
  width:64px;height:64px;border-radius:20px;display:flex;align-items:center;justify-content:center;
  margin:0 auto 12px;font-size:36px;box-shadow:inset 0 -8px 0 rgba(0,0,0,.08),0 12px 18px rgba(38,57,116,.18);
  filter:drop-shadow(0 8px 10px rgba(0,0,0,.12));animation:pgPop3d 4.4s ease-in-out infinite;
}
.pg-ach-icon.y{background:linear-gradient(135deg,#f59e0b,#fbbf24);}
.pg-ach-icon.g{background:linear-gradient(135deg,#10b981,#34d399);}
.pg-ach-icon.p{background:linear-gradient(135deg,#8b5cf6,#a78bfa);}
.pg-ach-icon.b{background:linear-gradient(135deg,#3b82f6,#60a5fa);}
.pg-ach-icon.lock{background:var(--surface3);filter:grayscale(1);opacity:.6;}

.pg-ach-rarity-badge{
  position:absolute;top:10px;right:10px;font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:6px;
  text-transform:uppercase;letter-spacing:.05em;background:rgba(0,0,0,.06);color:var(--text);
}
.pg-ach-name{font-size:13.5px;font-weight:700;color:var(--text);margin-bottom:4px;}
.pg-ach-desc{font-size:11.5px;color:var(--muted);line-height:1.45;}
.pg-ach-status{
  margin-top:10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;
  padding:3px 9px;border-radius:8px;background:rgba(255,255,255,.6);color:var(--text);
}
.dark .pg-ach-status{background:rgba(255,255,255,.1);}

/* ── Leaderboard Podium & Rows ── */
.pg-podium-wrap{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:14px;margin-bottom:22px;align-items:flex-end;}
.pg-podium-card{
  background:var(--surface);border-radius:18px;border:1px solid var(--border);padding:20px 14px;text-align:center;
  box-shadow:var(--shadow);position:relative;overflow:hidden;transition:all .22s cubic-bezier(.34,1.56,.64,1);
}
.pg-podium-card:hover{transform:translateY(-6px);box-shadow:var(--shadow-lg);}
.pg-podium-card.first{
  padding:26px 16px;border-top:4px solid #f59e0b;background:linear-gradient(180deg,rgba(245,158,11,.08),var(--surface));
}
.pg-podium-card.second{border-top:4px solid #94a3b8;}
.pg-podium-card.third{border-top:4px solid #f97316;}
.pg-podium-badge{font-size:28px;margin-bottom:6px;display:block;}
.pg-podium-card.first .pg-podium-badge{font-size:36px;animation:trophyBounce 3s ease-in-out infinite;}
.pg-podium-name{font-size:14px;font-weight:800;color:var(--text);margin-bottom:2px;}
.pg-podium-pts{font-size:13px;font-weight:700;color:var(--brand);display:flex;align-items:center;justify-content:center;gap:4px;}

.pg-lb-row{
  display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:14px;margin-bottom:8px;
  border:1.5px solid var(--border);background:var(--surface);transition:all .18s;
}
.pg-lb-row:hover{background:rgba(99,102,241,.04);border-color:var(--brand);transform:translateX(3px);}
.pg-lb-row.me{
  background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.08));
  border-color:rgba(99,102,241,.35);box-shadow:0 4px 14px rgba(99,102,241,.12);
}
.pg-lb-rank{
  width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;
  font-size:12.5px;font-weight:800;flex-shrink:0;
}
.pg-lb-rank.gold{background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;box-shadow:0 3px 8px rgba(245,158,11,.4);}
.pg-lb-rank.silver{background:linear-gradient(135deg,#94a3b8,#64748b);color:#fff;}
.pg-lb-rank.bronze{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;}
.pg-lb-rank.other{background:var(--surface2);color:var(--muted);}
.pg-lb-name{font-size:13.5px;font-weight:700;color:var(--text);}
.pg-lb-you{
  font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;background:rgba(99,102,241,.15);
  color:var(--brand);margin-left:6px;text-transform:uppercase;letter-spacing:.04em;
}
.pg-lb-streak{display:flex;align-items:center;gap:4px;font-size:12px;color:#f59e0b;font-weight:700;}
.pg-lb-pts{display:flex;align-items:center;gap:5px;font-size:13.5px;font-weight:800;color:var(--text);}

/* ── Goals & Analytics Elements ── */
.pg-goal-row{margin-bottom:18px;}
.pg-goal-label{display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;color:var(--text2);margin-bottom:6px;}
.pg-goal-track{height:8px;background:var(--surface3);border-radius:8px;overflow:hidden;}
.pg-goal-fill{height:100%;border-radius:8px;transition:width .8s cubic-bezier(.4,0,.2,1);}

.pg-insight-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px;}
.pg-insight-card{
  background:var(--surface);border-radius:16px;border:1px solid var(--border);padding:18px;
  box-shadow:var(--shadow);transition:all .2s;
}
.pg-insight-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md);}
.pg-insight-icon{
  width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;
  font-size:18px;margin-bottom:10px;background:rgba(99,102,241,.1);color:var(--brand);
}
.pg-insight-title{font-size:13.5px;font-weight:800;color:var(--text);margin-bottom:4px;}
.pg-insight-desc{font-size:12px;color:var(--muted);line-height:1.55;}

/* ── Level-Up Modal Overlay ── */
.pg-lvlup-overlay{
  position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;
  background:rgba(7,18,53,.7);backdrop-filter:blur(8px);cursor:pointer;padding:20px;
}
.pg-lvlup-card{
  background:linear-gradient(135deg,#7b2cff 0%,#b948d9 50%,#ff4d8d 100%);border-radius:28px;
  padding:44px 40px;text-align:center;color:#fff;box-shadow:0 24px 64px rgba(0,0,0,.35);
  border:2px solid rgba(255,255,255,.3);position:relative;overflow:hidden;max-width:440px;width:100%;
}
.pg-lvlup-crown{
  width:96px;height:96px;border-radius:50%;background:rgba(255,255,255,.2);margin:0 auto 16px;
  display:flex;align-items:center;justify-content:center;box-shadow:0 12px 28px rgba(0,0,0,.2);
}
.pg-lvlup-title{font-size:38px;font-weight:800;letter-spacing:-.5px;line-height:1.1;margin-bottom:8px;}
.pg-lvlup-sub{font-size:16px;color:rgba(255,255,255,.9);line-height:1.5;margin-bottom:24px;}
.pg-lvlup-btn{
  padding:12px 28px;border-radius:14px;border:none;background:#fff;color:#7b2cff;font-family:inherit;
  font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.2);transition:all .2s;
}
.pg-lvlup-btn:hover{transform:scale(1.05);box-shadow:0 12px 28px rgba(0,0,0,.3);}

/* ── AI Coach FAB & Chat Window ── */
@keyframes floatFab{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes rippleFab{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.2);opacity:0}}
.ai-fab-wrap{
  position:fixed;bottom:28px;right:28px;z-index:9000;display:flex;flex-direction:column;align-items:flex-end;gap:12px;
}
.ai-fab-label{
  background:var(--surface);border:1px solid var(--border2);padding:6px 14px;border-radius:20px;
  font-size:12px;font-weight:700;color:var(--text);box-shadow:var(--shadow-md);pointer-events:none;
}
.ai-fab{
  width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;color:#fff;
  background:linear-gradient(135deg,var(--brand),var(--brand2));box-shadow:0 8px 24px rgba(99,102,241,.45);
  display:flex;align-items:center;justify-content:center;font-size:26px;position:relative;transition:all .22s;
  animation:floatFab 4s ease-in-out infinite;
}
.ai-fab:hover{transform:scale(1.08);box-shadow:0 12px 32px rgba(99,102,241,.55);}
.ai-fab-ripple,.ai-fab-ripple2{
  position:absolute;inset:0;border-radius:50%;border:2px solid var(--brand);pointer-events:none;animation:rippleFab 2.2s ease-out infinite;
}
.ai-fab-ripple2{animation-delay:.7s;border-color:var(--brand2);}
.ai-fab-badge{
  position:absolute;top:-2px;right:-2px;width:20px;height:20px;border-radius:50%;background:#ef4444;
  color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;
}
.ai-chat-panel{
  position:fixed;bottom:100px;right:28px;width:370px;height:520px;max-height:calc(100vh - 130px);
  background:var(--surface);backdrop-filter:blur(18px);border-radius:24px;border:1px solid var(--border);
  box-shadow:var(--shadow-lg);z-index:9001;display:flex;flex-direction:column;overflow:hidden;
}
.ai-chat-header{
  padding:16px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;gap:12px;
}
.ai-chat-hinfo{flex:1;}
.ai-chat-hname{font-size:14px;font-weight:800;}
.ai-chat-hstatus{font-size:11px;opacity:.9;display:flex;align-items:center;gap:5px;}
.ai-chat-close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;opacity:.8;padding:4px;}
.ai-chat-close:hover{opacity:1;}
.ai-chat-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;}
.ai-msg-bubble{
  max-width:84%;padding:10px 14px;border-radius:14px;font-size:12.5px;line-height:1.55;word-break:break-word;
}
.ai-msg-bubble.ai{background:var(--surface2);color:var(--text);align-self:flex-start;border:1px solid var(--border);}
.ai-msg-bubble.user{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;align-self:flex-end;}
.ai-chat-prompts{display:flex;gap:6px;overflow-x:auto;padding:8px 12px;border-top:1px solid var(--border);scrollbar-width:none;}
.ai-chat-prompts::-webkit-scrollbar{display:none;}
.ai-qprompt-btn{
  flex-shrink:0;padding:5px 11px;border-radius:14px;border:1px solid var(--border2);background:var(--surface2);
  font-size:11px;font-weight:600;color:var(--text2);cursor:pointer;transition:all .15s;
}
.ai-qprompt-btn:hover{border-color:var(--brand);color:var(--brand);}
.ai-chat-foot{padding:12px 14px;border-top:1px solid var(--border);display:flex;gap:8px;}
.ai-chat-input{
  flex:1;padding:9px 14px;border-radius:12px;border:1.5px solid var(--border2);background:var(--surface2);
  font-family:inherit;font-size:12.5px;color:var(--text);outline:none;
}
.ai-chat-input:focus{border-color:var(--brand);}
.ai-chat-send{
  width:36px;height:36px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;
}

/* ── Responsive Rules (Exact Parity with homework-page.tsx) ── */
@media(max-width:1280px){
  .pg-syl-grid{grid-template-columns:repeat(3,1fr);}
  .pg-stats{grid-template-columns:repeat(4,1fr);gap:12px;padding:18px 24px 0;}
  .pg-body{padding:18px 24px 80px;}
  .pg-hero{margin:16px 24px 0;padding:20px 24px;}
}

@media(max-width:1100px){
  .pg-stats{grid-template-columns:repeat(2,1fr);}
  .pg-2col{grid-template-columns:1fr;}
  .pg-insight-grid{grid-template-columns:1fr 1fr;}
  .pg-ach-grid{grid-template-columns:repeat(3,1fr);}
}

@media(max-width:900px){
  .pg-hero{margin:12px 16px 0;padding:14px 18px;border-radius:16px;}
  .pg-hero-right .pg-hstat:nth-child(3),.pg-hero-right .pg-hstat:nth-child(4){display:none;}
  .pg-stats{padding:12px 16px 0;gap:10px;}
  .pg-body{padding:12px 16px 80px;}
  .pg-syl-grid{grid-template-columns:repeat(3,1fr);}
}

@media(max-width:768px){
  .pg-hero{margin:10px 12px 0;border-radius:14px;padding:12px 16px;}
  .pg-hero-right{display:none;}
  .pg-stats{grid-template-columns:repeat(2,1fr);padding:10px 12px 0;gap:10px;}
  .pg-hero-art{left:50%;right:auto;width:112px;opacity:.62;animation-name:pgDrift;}
  .pg-hero-left{max-width:72%;}
  .pg-scard{padding:15px;border-radius:16px;}
  .pg-scard-n{font-size:28px;}
  .pg-syl-grid{grid-template-columns:repeat(2,1fr);}
  .pg-body{padding:10px 12px 80px;}
  .pg-topbar{padding:0 14px;}
  .pg-quick-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .pg-ach-grid{grid-template-columns:repeat(2,1fr);}
  .pg-podium-wrap{grid-template-columns:1fr;gap:10px;}
  .pg-insight-grid{grid-template-columns:1fr;}
}

@media(max-width:600px){
  .pg-hero{margin:8px 10px 0;padding:12px 14px;border-radius:13px;}
  .pg-hero-title{font-size:15px;}
  .pg-stats{padding:8px 10px 0;gap:8px;}
  .pg-scard{padding:13px;border-radius:14px;}
  .pg-scard-n{font-size:25px;}
  .pg-hero-art{left:50%;right:auto;width:92px;opacity:.48;}
  .pg-hero-left{max-width:100%;}
  .pg-body{padding:8px 10px 80px;}
  .pg-syl-grid{grid-template-columns:repeat(2,1fr);}
  .pg-quick-stats{grid-template-columns:1fr;}
  .ai-fab-wrap{bottom:16px;right:16px;}
  .ai-chat-panel{bottom:88px;right:16px;width:calc(100vw - 32px);height:calc(100vh - 120px);}
}

@media(max-width:420px){
  .pg-hero-title{font-size:14px;}
  .pg-scard-n{font-size:22px;}
  .pg-tab{padding:8px 12px;font-size:12px;}
  .pg-ach-grid{grid-template-columns:1fr 1fr;gap:9px;}
}

@media(max-width:360px){
  .pg-hero{padding:10px 12px;}
  .pg-hero-title{font-size:13px;}
  .pg-scard-n{font-size:20px;}
  .pg-stats{gap:6px;}
  .pg-syl-grid{gap:8px;}
  .pg-ach-grid{grid-template-columns:1fr;}
  .ai-fab-wrap{bottom:12px;right:12px;}
  .ai-chat-panel{right:12px;width:calc(100vw - 24px);}
}
`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProgressStats {
  totalPoints: number;
  currentLevel: number;
  pointsToNextLevel: number;
  totalLessonsCompleted: number;
  streakDays: number;
  longestStreak: number;
  weeklyProgress: number;
  monthlyGoal: number;
  completionRate: number;
  studyTimeMinutes: number;
  rank: number;
  totalUsers: number;
}

// ── Animated Number Counter ───────────────────────────────────────────────────
function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = () => {
      cur += Math.max(1, target / 40);
      if (cur < target) {
        setVal(Math.floor(cur));
        requestAnimationFrame(step);
      } else {
        setVal(target);
      }
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{val.toLocaleString()}{suffix}</>;
}

// ── Custom Tooltip for Charts ─────────────────────────────────────────────────
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface, #fff)",
      border: "1px solid var(--border, rgba(0,0,0,.1))",
      borderRadius: 12,
      padding: "8px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,.12)",
      fontSize: 12,
      fontWeight: 600,
    }}>
      <div style={{ color: "var(--muted, #64748b)", marginBottom: 3 }}>{label}</div>
      <div style={{ color: "var(--brand, #6366f1)", fontWeight: 800 }}>
        {payload[0].value} {payload[0].name === "minutes" ? "mins studied" : "XP earned"}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { user } = useAuth() as any;
  const { isDark: dark, toggleTheme } = useTheme();
  const { addNotification } = useNotificationStore();

  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("week");
  const [lvlUp, setLvlUp] = useState(false);
  const [role, setRole] = useState("student");
  const [achFilter, setAchFilter] = useState("all");

  // AI Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([
    {
      id: 1,
      from: "ai",
      text: "Hi there! 👋 I'm your AI Academic Coach. I've analyzed your performance: your streak is strong and you're close to your next level! What progress insights would you like to review?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role) setRole(user.role);
  }, [user]);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatOpen, chatMsgs]);

  const { data: progressSummary } = useQuery<any>({
    queryKey: ["/api/v1/student/progress/summary"],
    queryFn: getStudentProgressSummary,
  });

  const stats: ProgressStats = {
    totalPoints: 2450,
    currentLevel: 4,
    pointsToNextLevel: 180,
    totalLessonsCompleted: 38,
    streakDays: 8,
    longestStreak: 14,
    weeklyProgress: 420,
    monthlyGoal: 3000,
    completionRate: 78,
    studyTimeMinutes: 840,
    rank: 3,
    totalUsers: 42,
    ...(progressSummary?.stats || {}),
  };

  const levelPct = Math.min(
    Math.round(((stats.totalPoints % 500) / 500) * 100),
    100
  );

  const achievementsList = [
    { id: 1, title: "Level 4 Scholar", desc: "Reached academic Level 4", icon: "👑", rarity: "epic", unlocked: true, date: "Yesterday", color: "purple" },
    { id: 2, title: "7-Day Streak Master", desc: "Maintained a continuous 7-day study streak", icon: "🔥", rarity: "rare", unlocked: true, date: "3 days ago", color: "yellow" },
    { id: 3, title: "Math Whiz", desc: "Completed 15 Calculus & Algebra exercises", icon: "🧮", rarity: "legendary", unlocked: true, date: "May 12", color: "green" },
    { id: 4, title: "Early Bird", desc: "Completed a lesson before 8:00 AM", icon: "🌅", rarity: "common", unlocked: true, date: "May 08", color: "blue" },
    { id: 5, title: "Quiz Conqueror", desc: "Scored 100% on 5 consecutive quizzes", icon: "💯", rarity: "epic", unlocked: false, color: "purple" },
    { id: 6, title: "Science Explorer", desc: "Mastered all Biology cell organelle modules", icon: "🔬", rarity: "rare", unlocked: false, color: "green" },
    { id: 7, title: "Night Owl", desc: "Studied for 45 minutes after 9:00 PM", icon: "🦉", rarity: "common", unlocked: false, color: "blue" },
    { id: 8, title: "Leaderboard Champion", desc: "Reach the #1 Global rank in class", icon: "🏆", rarity: "legendary", unlocked: false, color: "yellow" },
  ];

  const filteredAchievements = achievementsList.filter(a => {
    if (achFilter === "all") return true;
    if (achFilter === "unlocked") return a.unlocked;
    if (achFilter === "locked") return !a.unlocked;
    return a.rarity === achFilter;
  });

  const progressRows = progressSummary?.progress || [];
  const history = progressRows.length
    ? progressRows.slice().reverse().map((item: any) => ({
        date: item.lastActivityAt ? new Date(item.lastActivityAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Recent",
        points: Number(item.pointsEarned || 0),
      }))
    : [
        { date: "Mon", points: 140 },
        { date: "Tue", points: 260 },
        { date: "Wed", points: 180 },
        { date: "Thu", points: 340 },
        { date: "Fri", points: 290 },
        { date: "Sat", points: 410 },
        { date: "Sun", points: 380 },
      ];

  const subjectPalette = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#0ea5e9"];
  const subjectData = progressSummary?.subjectDistribution?.length
    ? progressSummary.subjectDistribution.map((item: any, index: number) => ({
        ...item,
        color: subjectPalette[index % subjectPalette.length],
      }))
    : [
        { name: "Mathematics", value: 35, color: "#6366f1" },
        { name: "Biology", value: 25, color: "#10b981" },
        { name: "Physics", value: 20, color: "#ec4899" },
        { name: "History", value: 12, color: "#8b5cf6" },
        { name: "Comp. Sci", value: 8, color: "#0ea5e9" },
      ];

  const weeklyActivity = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - offset));
    const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
    const defaultMins = [45, 60, 35, 90, 75, 110, 85][offset];
    return { day: dayName, minutes: defaultMins };
  });

  const syllabusList = [
    { name: "Mathematics", pct: 78, cls: "math", color: "#6366f1", chapters: "8/10", art: subjectMathsImg },
    { name: "Biology",     pct: 64, cls: "bio",  color: "#10b981", chapters: "7/11", art: subjectScienceImg },
    { name: "History",     pct: 85, cls: "hist", color: "#8b5cf6", chapters: "9/11", art: subjectSocialImg },
    { name: "Physics",     pct: 48, cls: "phys", color: "#ec4899", chapters: "5/10", art: subjectScienceImg },
    { name: "Comp. Sci.",  pct: 92, cls: "cs",   color: "#0ea5e9", chapters: "11/12", art: subjectEnglishImg },
  ];

  const leaderboardList = [
    { id: 1, rank: 1, username: "Elena Vance", points: 3420, level: 5, streak: 16, avatar: "👩‍🎓" },
    { id: 2, rank: 2, username: "Arjun Mehta", points: 2890, level: 4, streak: 12, avatar: "👨‍💻" },
    { id: 3, rank: 3, username: user?.username || "You (Scholar)", points: stats.totalPoints, level: stats.currentLevel, streak: stats.streakDays, avatar: "🚀", isMe: true },
    { id: 4, rank: 4, username: "Sarah Jenkins", points: 2180, level: 4, streak: 6, avatar: "🎨" },
    { id: 5, rank: 5, username: "Marcus Brody", points: 1940, level: 3, streak: 5, avatar: "⚡" },
  ];

  const triggerLevelUpModal = () => {
    setLvlUp(true);
    addNotification(`🎉 Celebrated Level ${stats.currentLevel}! Keep climbing the leaderboard!`);
  };

  const handleSendChat = (textToSend?: string) => {
    const q = textToSend || chatInput.trim();
    if (!q) return;
    setChatInput("");
    const newMsg = { id: Date.now(), from: "user", text: q };
    setChatMsgs(prev => [...prev, newMsg]);

    setTimeout(() => {
      let reply = "You're making great strides! Consistency is the number one predictor of academic mastery.";
      const lower = q.toLowerCase();
      if (lower.includes("streak")) {
        reply = `Your current streak is ${stats.streakDays} days! Study for just 15 minutes today to keep your streak burning hot! 🔥`;
      } else if (lower.includes("subject") || lower.includes("attention")) {
        reply = "Looking at your mastery map, Physics (48%) has the most room for rapid gains. Try completing one Newton's Laws module today! ⚡";
      } else if (lower.includes("level") || lower.includes("xp")) {
        reply = `You have ${stats.totalPoints} total XP! Only ${stats.pointsToNextLevel} XP needed to reach Level ${stats.currentLevel + 1}! 🚀`;
      } else if (lower.includes("achievement")) {
        reply = "You're 2 quizzes away from unlocking the 'Quiz Conqueror' Epic achievement! 💯";
      }
      setChatMsgs(prev => [...prev, { id: Date.now() + 1, from: "ai", text: reply }]);
    }, 700);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="pg-ambient" />
      <div className={`pg-root${dark ? " dark" : ""}`}>
        {/* Navigation Bar */}
        <Navigation currentRole={role as "student" | "teacher"} onRoleChange={setRole as any} />

        {/* Sticky Sub-Topbar Matching homework-page.tsx */}
        <div className="pg-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="pg-logo-icon">📊</div>
            <span className="pg-logo-text">GradeUp Progress</span>
          </div>
          <div className="pg-topbar-sep" />
          <div className="pg-breadcrumb">
            <span className="pg-bc-link">Dashboard</span>
            <span>›</span>
            <span className="pg-bc-active">Progress &amp; Analytics</span>
          </div>
          <div className="pg-topbar-right">
            <span className="pg-topbar-pill">✨ AI Analytics Engine</span>
            <button
              className="pg-theme-btn"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Hero Banner with 3D Character Art */}
        <div className="pg-hero">
          <div className="pg-hero-art" aria-hidden="true">
            <img src={studyRoboImg} alt="" />
          </div>
          <div className="pg-hero-in">
            <div className="pg-hero-left">
              <div className="pg-hero-avatar">🏆</div>
              <div>
                <div className="pg-hero-pill">
                  <TrendingUp size={12} style={{ marginRight: 4 }} /> Academic Mastery &amp; Insights
                </div>
                <div className="pg-hero-title">
                  Welcome back, {user?.username || "Scholar"}! 🚀
                </div>
                <div className="pg-hero-sub">
                  Level {stats.currentLevel} Scholar · {stats.totalPoints.toLocaleString()} XP earned · {stats.streakDays} Day Streak 🔥
                </div>
              </div>
            </div>

            <div className="pg-hero-right">
              {[
                { n: `Lvl ${stats.currentLevel}`, l: "Level" },
                { n: `${stats.streakDays}d`, l: "Streak 🔥" },
                { n: `#${stats.rank}`, l: "Rank 🌍" },
                { n: stats.totalPoints.toLocaleString(), l: "Total XP" },
              ].map((s, i) => (
                <div className="pg-hstat" key={i}>
                  <div className="pg-hstat-n">{s.n}</div>
                  <div className="pg-hstat-l">{s.l}</div>
                </div>
              ))}
              <button className="pg-hero-btn" onClick={triggerLevelUpModal}>
                <Crown size={15} /> Celebrate Level
              </button>
            </div>
          </div>
        </div>

        {/* Top 4 Stat Cards with Animated Counters */}
        <div className="pg-stats">
          {/* Card 1: Level Progress */}
          <motion.div
            className="pg-scard blue"
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            onClick={triggerLevelUpModal}
          >
            <div className="pg-scard-icon">
              <Crown size={20} color="#6366f1" />
            </div>
            <div className="pg-scard-n">Lvl {stats.currentLevel}</div>
            <div className="pg-scard-l">Current Scholar Level</div>
            <div className="pg-card-track">
              <div className="pg-card-fill" style={{ width: `${levelPct}%` }} />
            </div>
            <div className="pg-card-meta">
              <span>{stats.totalPoints % 500} XP earned</span>
              <span>{stats.pointsToNextLevel} to next level</span>
            </div>
          </motion.div>

          {/* Card 2: Total XP */}
          <motion.div
            className="pg-scard green"
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <div className="pg-scard-icon">
              <Star size={20} color="#10b981" />
            </div>
            <div className="pg-scard-n">
              <AnimNum target={stats.totalPoints} />
            </div>
            <div className="pg-scard-l">Total XP Earned</div>
            <div className="pg-scard-sub">
              <ChevronUp size={14} color="#10b981" />
              +{stats.weeklyProgress} XP this week
            </div>
          </motion.div>

          {/* Card 3: Streak */}
          <motion.div
            className="pg-scard amber"
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <div className="pg-scard-icon">
              <Flame size={20} color="#f59e0b" />
            </div>
            <div className="pg-scard-n">
              <AnimNum target={stats.streakDays} suffix="d" />
            </div>
            <div className="pg-scard-l">Current Streak</div>
            <div className="pg-scard-sub sub-amber">
              <Award size={13} color="#f59e0b" />
              Best: {stats.longestStreak} days in a row
            </div>
          </motion.div>

          {/* Card 4: Global Rank */}
          <motion.div
            className="pg-scard purple"
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <div className="pg-scard-icon">
              <Medal size={20} color="#8b5cf6" />
            </div>
            <div className="pg-scard-n">#{stats.rank}</div>
            <div className="pg-scard-l">Global Rank</div>
            <div className="pg-scard-sub sub-purple">
              <Users size={13} color="#8b5cf6" />
              Top {Math.max(1, Math.round((stats.rank / Math.max(stats.totalUsers, 1)) * 100))}% of all learners
            </div>
          </motion.div>
        </div>

        {/* Body Content Container */}
        <div className="pg-body">
          {/* Navigation Tab Bar */}
          <div className="pg-tabs">
            {[
              { id: "overview", label: "Overview & Insights", icon: "📈" },
              { id: "syllabus", label: "Subject Mastery", icon: "📚" },
              { id: "achievements", label: "Achievements", icon: "🏆" },
              { id: "leaderboard", label: "Leaderboard", icon: "👥" },
              { id: "goals", label: "Goals & Analytics", icon: "🧠" },
            ].map(t => (
              <button
                key={t.id}
                className={`pg-tab${tab === t.id ? " on" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* ═════════ 1. OVERVIEW TAB ═════════ */}
              {tab === "overview" && (
                <div>
                  <div className="pg-2col">
                    {/* XP Growth Chart */}
                    <div className="pg-panel">
                      <div className="pg-panel-head">
                        <div>
                          <div className="pg-panel-title">
                            <TrendingUp size={16} color="#6366f1" /> XP Growth Trajectory
                          </div>
                          <div className="pg-panel-sub">Daily learning points gained over time</div>
                        </div>
                        <span className="pg-topbar-pill">+32% vs last week</span>
                      </div>
                      <div className="pg-panel-body">
                        <ResponsiveContainer width="100%" height={230}>
                          <AreaChart data={history}>
                            <defs>
                              <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="points"
                              stroke="#6366f1"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorPoints)"
                              activeDot={{ r: 6, fill: "#6366f1" }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Subject Distribution */}
                    <div className="pg-panel">
                      <div className="pg-panel-head">
                        <div>
                          <div className="pg-panel-title">
                            <BookOpen size={16} color="#8b5cf6" /> Subject Distribution
                          </div>
                          <div className="pg-panel-sub">Study focus and time allocation breakdown</div>
                        </div>
                        <span className="pg-topbar-pill">5 Subjects</span>
                      </div>
                      <div className="pg-panel-body">
                        <ResponsiveContainer width="100%" height={230}>
                          <PieChart>
                            <Pie
                              data={subjectData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {subjectData.map((d: any, i: number) => (
                                <Cell key={i} fill={d.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* 3 Quick Highlight Cards */}
                  <div className="pg-quick-stats">
                    {[
                      { icon: "📚", label: "Lessons Completed", val: `${stats.totalLessonsCompleted}`, sub: "All time total", color: "#6366f1", bg: "rgba(99,102,241,.1)" },
                      { icon: "⏱️", label: "Total Study Time", val: `${Math.floor(stats.studyTimeMinutes / 60)}h ${stats.studyTimeMinutes % 60}m`, sub: "Dedicated learning", color: "#10b981", bg: "rgba(16,185,129,.1)" },
                      { icon: "🎯", label: "Overall Completion", val: `${stats.completionRate}%`, sub: "Ahead of schedule", color: "#f59e0b", bg: "rgba(245,158,11,.1)" },
                    ].map((s, i) => (
                      <div key={i} className="pg-qstat-card">
                        <div className="pg-qstat-icon" style={{ background: s.bg }}>
                          {s.icon}
                        </div>
                        <div>
                          <div className="pg-qstat-val" style={{ color: s.color }}>{s.val}</div>
                          <div className="pg-qstat-lbl">{s.label}</div>
                          <div style={{ fontSize: 10.5, color: "var(--subtle)", marginTop: 2 }}>{s.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═════════ 2. SUBJECT MASTERY (SYLLABUS) TAB ═════════ */}
              {tab === "syllabus" && (
                <div className="pg-panel">
                  <div className="pg-panel-head">
                    <div>
                      <div className="pg-panel-title">📋 Curriculum &amp; Subject Mastery</div>
                      <div className="pg-panel-sub">Syllabus coverage, completed chapters, and topic proficiency</div>
                    </div>
                    <button className="pg-view-all" onClick={() => addNotification("Viewing detailed curriculum...")}>
                      Download Syllabus PDF →
                    </button>
                  </div>
                  <div className="pg-panel-body">
                    <div className="pg-syl-grid">
                      {syllabusList.map((s, i) => {
                        const r = 26;
                        const circ = 2 * Math.PI * r;
                        const offset = circ - (s.pct / 100) * circ;
                        return (
                          <div key={i} className={`pg-syl-card ${s.cls}`}>
                            <img
                              className="pg-syl-art"
                              src={s.art}
                              alt=""
                              style={{ "--delay": `${i * 0.4}s` } as React.CSSProperties}
                            />
                            <div className="pg-syl-name">{s.name}</div>
                            <div className="pg-syl-ring-wrap">
                              <svg viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(15,23,42,.08)" strokeWidth="5" />
                                <circle
                                  cx="32"
                                  cy="32"
                                  r={r}
                                  fill="none"
                                  stroke={s.color}
                                  strokeWidth="5"
                                  strokeLinecap="round"
                                  strokeDasharray={circ}
                                  strokeDashoffset={offset}
                                  style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }}
                                />
                              </svg>
                              <div className="pg-syl-ring-label" style={{ color: s.color }}>
                                {s.pct}%
                              </div>
                            </div>
                            <div className="pg-syl-sub">{s.chapters} chapters</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ═════════ 3. ACHIEVEMENTS TAB ═════════ */}
              {tab === "achievements" && (
                <div>
                  <div className="pg-ach-filter-row">
                    {["all", "unlocked", "locked", "legendary", "epic", "rare", "common"].map(f => (
                      <button
                        key={f}
                        className={`pg-ach-fchip${achFilter === f ? " on" : ""}`}
                        onClick={() => setAchFilter(f)}
                        style={{ textTransform: "capitalize" }}
                      >
                        {f === "all" ? "All Badges" : f}
                      </button>
                    ))}
                  </div>

                  <div className="pg-ach-grid">
                    {filteredAchievements.map(a => (
                      <motion.div
                        key={a.id}
                        className={`pg-ach-card ${a.unlocked ? a.color : "locked"}`}
                        whileHover={{ y: -6, scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="pg-ach-rarity-badge">{a.rarity}</div>
                        <div className={`pg-ach-icon ${a.unlocked ? (a.color === "yellow" ? "y" : a.color === "green" ? "g" : a.color === "purple" ? "p" : "b") : "lock"}`}>
                          {a.icon}
                        </div>
                        <div className="pg-ach-name">{a.title}</div>
                        <div className="pg-ach-desc">{a.desc}</div>
                        <div className="pg-ach-status">
                          {a.unlocked ? (
                            <>
                              <CheckCircle2 size={12} color="#10b981" /> Unlocked {a.date}
                            </>
                          ) : (
                            <>🔒 In Progress</>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═════════ 4. LEADERBOARD TAB ═════════ */}
              {tab === "leaderboard" && (
                <div className="pg-panel">
                  <div className="pg-panel-head">
                    <div>
                      <div className="pg-panel-title">
                        <Users size={16} color="#6366f1" /> Academic Honor Roll &amp; Top Learners
                      </div>
                      <div className="pg-panel-sub">Compete and grow together with classmates worldwide</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["week", "month", "all"].map(p => (
                        <button
                          key={p}
                          className={`pg-ach-fchip${period === p ? " on" : ""}`}
                          onClick={() => setPeriod(p)}
                          style={{ textTransform: "capitalize" }}
                        >
                          {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pg-panel-body">
                    {/* Top 3 Podium */}
                    <div className="pg-podium-wrap">
                      {/* 2nd Place */}
                      <div className="pg-podium-card second">
                        <span className="pg-podium-badge">🥈</span>
                        <div className="pg-podium-name">{leaderboardList[1].username}</div>
                        <div className="pg-podium-pts">
                          <Star size={13} color="#94a3b8" /> {leaderboardList[1].points.toLocaleString()} XP
                        </div>
                        <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 4 }}>
                          {leaderboardList[1].streak}d streak
                        </div>
                      </div>

                      {/* 1st Place */}
                      <div className="pg-podium-card first">
                        <span className="pg-podium-badge">👑 🥇</span>
                        <div className="pg-podium-name">{leaderboardList[0].username}</div>
                        <div className="pg-podium-pts" style={{ color: "#f59e0b" }}>
                          <Star size={14} color="#f59e0b" /> {leaderboardList[0].points.toLocaleString()} XP
                        </div>
                        <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700, marginTop: 4 }}>
                          Rank #1 · {leaderboardList[0].streak}d streak
                        </div>
                      </div>

                      {/* 3rd Place */}
                      <div className="pg-podium-card third">
                        <span className="pg-podium-badge">🥉</span>
                        <div className="pg-podium-name">{leaderboardList[2].username}</div>
                        <div className="pg-podium-pts">
                          <Star size={13} color="#f97316" /> {leaderboardList[2].points.toLocaleString()} XP
                        </div>
                        <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 4 }}>
                          {leaderboardList[2].streak}d streak
                        </div>
                      </div>
                    </div>

                    {/* Ranked List */}
                    <div>
                      {leaderboardList.map((entry, idx) => {
                        const rankClass = idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : "other";
                        return (
                          <motion.div
                            key={entry.id}
                            className={`pg-lb-row${entry.isMe ? " me" : ""}`}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            <div className={`pg-lb-rank ${rankClass}`}>{entry.rank}</div>
                            <span style={{ fontSize: 20 }}>{entry.avatar}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span className="pg-lb-name">{entry.username}</span>
                              {entry.isMe && <span className="pg-lb-you">You</span>}
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                Level {entry.level} Scholar
                              </div>
                            </div>
                            <div className="pg-lb-streak">
                              <Flame size={14} /> {entry.streak}d
                            </div>
                            <div className="pg-lb-pts">
                              <Star size={14} color="#f59e0b" /> {entry.points.toLocaleString()}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ═════════ 5. GOALS & ANALYTICS TAB ═════════ */}
              {tab === "goals" && (
                <div>
                  <div className="pg-2col">
                    {/* Weekly Activity Bar Chart */}
                    <div className="pg-panel">
                      <div className="pg-panel-head">
                        <div>
                          <div className="pg-panel-title">
                            <Brain size={16} color="#8b5cf6" /> Weekly Study Activity
                          </div>
                          <div className="pg-panel-sub">Active minutes spent studying each day</div>
                        </div>
                        <span className="pg-topbar-pill">Daily Target: 45m</span>
                      </div>
                      <div className="pg-panel-body">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={weeklyActivity}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Bar dataKey="minutes" fill="#6366f1" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Monthly Targets */}
                    <div className="pg-panel">
                      <div className="pg-panel-head">
                        <div>
                          <div className="pg-panel-title">
                            <Target size={16} color="#10b981" /> Monthly Learning Goals
                          </div>
                          <div className="pg-panel-sub">Progress towards your monthly milestones</div>
                        </div>
                        <span className="pg-topbar-pill">May Cycle</span>
                      </div>
                      <div className="pg-panel-body">
                        {[
                          { label: "Lessons Completed", current: stats.totalLessonsCompleted, target: 50, color: "#6366f1" },
                          { label: "Active Study Hours", current: Math.floor(stats.studyTimeMinutes / 60), target: 20, color: "#10b981" },
                          { label: "Total XP Accumulation", current: stats.totalPoints, target: stats.monthlyGoal, color: "#f59e0b" },
                          { label: "Overall Accuracy Rate", current: stats.completionRate, target: 100, color: "#8b5cf6" },
                        ].map((g, i) => {
                          const pct = Math.min(Math.round((g.current / g.target) * 100), 100);
                          return (
                            <div key={i} className="pg-goal-row">
                              <div className="pg-goal-label">
                                <span>{g.label}</span>
                                <span style={{ color: g.color, fontWeight: 700 }}>
                                  {g.current}/{g.target} ({pct}%)
                                </span>
                              </div>
                              <div className="pg-goal-track">
                                <motion.div
                                  className="pg-goal-fill"
                                  style={{ background: g.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.1 }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* AI Learning Insights */}
                  <div className="pg-insight-grid">
                    <div className="pg-insight-card">
                      <div className="pg-insight-icon">💡</div>
                      <div className="pg-insight-title">Optimal Study Window</div>
                      <div className="pg-insight-desc">
                        You retain 28% more concept knowledge when reviewing between 9:00 AM – 11:30 AM.
                      </div>
                    </div>
                    <div className="pg-insight-card">
                      <div className="pg-insight-icon">⚡</div>
                      <div className="pg-insight-title">Physics Focus Recommended</div>
                      <div className="pg-insight-desc">
                        Completing 2 mechanics problem sets will elevate your overall mastery past 80%.
                      </div>
                    </div>
                    <div className="pg-insight-card">
                      <div className="pg-insight-icon">🔥</div>
                      <div className="pg-insight-title">Streak Protection Active</div>
                      <div className="pg-insight-desc">
                        Complete any short 5-minute quiz today before midnight to secure your 8-day streak!
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Level-Up Celebration Modal ── */}
        <AnimatePresence>
          {lvlUp && (
            <motion.div
              className="pg-lvlup-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLvlUp(false)}
            >
              <motion.div
                className="pg-lvlup-card"
                initial={{ scale: 0.7, rotate: -6 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="pg-lvlup-crown">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 10, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <Crown size={52} color="#fff" />
                  </motion.div>
                </div>
                <div className="pg-lvlup-title">LEVEL UP! 🌟</div>
                <div className="pg-lvlup-sub">
                  Congratulations! You've achieved Level {stats.currentLevel} Scholar status with {stats.totalPoints.toLocaleString()} XP earned!
                </div>
                <button className="pg-lvlup-btn" onClick={() => setLvlUp(false)}>
                  Continue Learning 🚀
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Floating AI Study Assistant FAB (Matching homework-page.tsx) ── */}
        <div className="ai-fab-wrap">
          {!chatOpen && <div className="ai-fab-label">✨ Ask AI Coach</div>}
          <button
            className="ai-fab"
            onClick={() => setChatOpen(o => !o)}
            title="AI Academic Coach"
          >
            {!chatOpen && (
              <>
                <div className="ai-fab-ripple" />
                <div className="ai-fab-ripple2" />
              </>
            )}
            {chatOpen ? "✕" : <img src={roboImg} alt="AI" style={{ width: 32, height: 32, objectFit: "contain" }} />}
            {!chatOpen && <div className="ai-fab-badge">1</div>}
          </button>
        </div>

        {/* ── Floating AI Coach Chat Window ── */}
        {chatOpen && (
          <div className="ai-chat-panel">
            <div className="ai-chat-header">
              <img src={roboImg} alt="AI" style={{ width: 26, height: 26, objectFit: "contain" }} />
              <div className="ai-chat-hinfo">
                <div className="ai-chat-hname">AI Academic Coach</div>
                <div className="ai-chat-hstatus">
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
                  Online · Personalized Learning Insights
                </div>
              </div>
              <button className="ai-chat-close" onClick={() => setChatOpen(false)}>✕</button>
            </div>

            <div className="ai-chat-body">
              {chatMsgs.map(m => (
                <div key={m.id} className={`ai-msg-bubble ${m.from}`}>
                  {m.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="ai-chat-prompts">
              {[
                "🔥 How to keep my streak?",
                "🎯 Which subject needs focus?",
                "🏆 Next achievement unlock?",
                "📈 How close to next level?",
              ].map((p, i) => (
                <button key={i} className="ai-qprompt-btn" onClick={() => handleSendChat(p)}>
                  {p}
                </button>
              ))}
            </div>

            <div className="ai-chat-foot">
              <input
                className="ai-chat-input"
                placeholder="Ask about your study habits &amp; progress..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSendChat();
                }}
              />
              <button className="ai-chat-send" onClick={() => handleSendChat()}>
                ➤
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
