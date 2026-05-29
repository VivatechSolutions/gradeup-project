import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Check, Eye, Mic, MicOff, Shield,
  Timer as TimerIcon, Star, Sun, Moon, GripVertical,
  LayoutGrid, Skull, ChevronLeft, ChevronRight, BookOpen,
  HelpCircle, PencilRuler, BrainCircuit, Download, FileText,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Drawer, DrawerClose, DrawerContent, DrawerFooter,
  DrawerHeader, DrawerTitle, DrawerTrigger,
} from '../components/ui/drawer';
import ExamResultDisplay from '../components/exam-result-display';
import { useTheme } from '../hooks/use-theme';
import { useMediaQuery } from '../hooks/use-media-query';
import MotionDetector from '../components/MotionDetector';
import { mockExamQuestions, Question } from '../lib/mock-exam-data';


export const S = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
.ep * { font-family:'Plus Jakarta Sans',system-ui,sans-serif; }

/* ── THEME VARIABLES ── */
:root {
  --ep-bg:         #f8fafc;
  --ep-surface:    #ffffff;
  --ep-surface2:   #fafafa;
  --ep-text:       #0f172a;
  --ep-text2:      #374151;
  --ep-muted:      #64748b;
  --ep-subtle:     #94a3b8;
  --ep-border:     #f1f5f9;
  --ep-border2:    #e2e8f0;
  --ep-input-bg:   #fafafa;
  --ep-opt-bg:     #fafafa;
  --ep-opt-bdr:    #f1f5f9;
  --ep-pal-bg:     #ffffff;
  --ep-rc-bg:      #ffffff;
  --ep-sub-bg:     #ffffff;
  --ep-stm-bg:     #f8fafc;
  --ep-nav-bg:     #ffffff;
  --ep-nav-text:   #64748b;
  --ep-btn-un:     #f1f5f9;
  --ep-btn-un-txt: #64748b;
  --ep-loader-bg:  #ffffff;
  --ep-shadow:     0 2px 12px rgba(0,0,0,.05);
}

[data-theme="dark"] {
  --ep-bg:         #0b1120;
  --ep-surface:    #1e293b;
  --ep-surface2:   #0f172a;
  --ep-text:       #f1f5f9;
  --ep-text2:      #cbd5e1;
  --ep-muted:      #94a3b8;
  --ep-subtle:     #64748b;
  --ep-border:     rgba(255,255,255,.06);
  --ep-border2:    rgba(255,255,255,.10);
  --ep-input-bg:   #0f172a;
  --ep-opt-bg:     #0f172a;
  --ep-opt-bdr:    rgba(255,255,255,.08);
  --ep-pal-bg:     #1e293b;
  --ep-rc-bg:      #1e293b;
  --ep-sub-bg:     #1e293b;
  --ep-stm-bg:     #0f172a;
  --ep-nav-bg:     #1e293b;
  --ep-nav-text:   #94a3b8;
  --ep-btn-un:     #334155;
  --ep-btn-un-txt: #94a3b8;
  --ep-loader-bg:  #0b1120;
  --ep-shadow:     0 2px 12px rgba(0,0,0,.35);
}

/* ── ROOT ── */
.ep {
  display:flex; flex-direction:column;
  height:100dvh; background:var(--ep-bg);
  overflow:hidden; position:relative;
  transition:background .3s,color .3s;
}

/* ── TOP BAR ── */
.ep-top {
  flex-shrink:0; height:58px; padding:0 20px;
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 55%,#ec4899 100%);
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  position:relative; overflow:hidden; z-index:10;
}
.ep-top::before { content:''; position:absolute; top:-50px; right:-50px; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,.08); pointer-events:none; }
.ep-top-l { display:flex; align-items:center; gap:10px; position:relative; z-index:1; min-width:0; }
.ep-top-ico { width:36px; height:36px; border-radius:10px; flex-shrink:0; background:rgba(255,255,255,.18); border:1.5px solid rgba(255,255,255,.25); display:flex; align-items:center; justify-content:center; }
.ep-top-title { font-size:clamp(13px,2vw,17px); font-weight:800; color:#fff; letter-spacing:-.3px; }
.ep-top-sub   { font-size:10.5px; color:rgba(255,255,255,.68); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ep-top-r { display:flex; align-items:center; gap:8px; position:relative; z-index:1; flex-shrink:0; }

.ep-timer { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:11px; background:rgba(255,255,255,.16); border:1.5px solid rgba(255,255,255,.22); }
.ep-timer.warn { background:rgba(239,68,68,.22); border-color:rgba(239,68,68,.4); animation:tpulse 1s ease-in-out infinite; }
@keyframes tpulse { 0%,100%{opacity:1} 50%{opacity:.65} }
.ep-timer-val { font-size:clamp(15px,2.5vw,21px); font-weight:800; color:#fff; letter-spacing:-1px; }
.ep-timer.warn .ep-timer-val { color:#fca5a5; }

.ep-icobtn { width:34px; height:34px; border-radius:10px; flex-shrink:0; background:rgba(255,255,255,.18); border:1.5px solid rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; cursor:pointer; color:#fff; transition:all .2s; }
.ep-icobtn:hover { background:rgba(255,255,255,.28); }

/* ── BODY GRID ── */
.ep-body {
  flex:1; display:grid; grid-template-columns:1fr 280px;
  gap:12px; padding:12px 18px 12px; min-height:0; overflow:hidden;
}

/* ── LEFT ── */
.ep-left { display:flex; flex-direction:column; min-height:0; overflow:hidden; }

.ep-qcard {
  flex:1; display:flex; flex-direction:column;
  background:var(--ep-surface); border-radius:18px;
  border:1px solid var(--ep-border); box-shadow:var(--ep-shadow);
  overflow:hidden; min-height:0;
  transition:background .3s,border-color .3s;
}

/* Q header */
.ep-qhead { flex-shrink:0; padding:10px 16px; border-bottom:1px solid var(--ep-border); display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
.epbadge  { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; padding:3px 9px; border-radius:20px; }
.epbadge-q   { background:rgba(99,102,241,.1); color:#6366f1; }
.epbadge-mcq { background:rgba(59,130,246,.1); color:#3b82f6; }
.epbadge-sh  { background:rgba(245,158,11,.1); color:#d97706; }
.epbadge-lg  { background:rgba(139,92,246,.1); color:#8b5cf6; }
.epbadge-sp  { background:rgba(16,185,129,.1); color:#059669; }
.epbadge-mk  { font-size:10.5px; font-weight:600; color:var(--ep-subtle); margin-left:auto; }

/* Q body */
.ep-qbody { flex:1; overflow-y:auto; padding:14px 16px; min-height:0; }
.ep-qbody::-webkit-scrollbar { width:3px; }
.ep-qbody::-webkit-scrollbar-thumb { background:rgba(99,102,241,.18); border-radius:99px; }

.ep-qtext { font-size:clamp(13.5px,1.7vw,16px); font-weight:600; color:var(--ep-text); line-height:1.55; margin-bottom:14px; }

/* MCQ */
.ep-opt { display:flex; align-items:center; gap:10px; padding:10px 13px; border-radius:12px; border:2px solid var(--ep-opt-bdr); background:var(--ep-opt-bg); cursor:pointer; margin-bottom:7px; transition:all .16s cubic-bezier(.4,0,.2,1); }
.ep-opt:hover { border-color:#c7d2fe; background:rgba(99,102,241,.06); }
[data-theme="dark"] .ep-opt:hover { border-color:#818cf8; background:rgba(99,102,241,.10); }
.ep-opt.sel   { border-color:#6366f1; background:rgba(99,102,241,.06); box-shadow:0 0 0 3px rgba(99,102,241,.09); }
[data-theme="dark"] .ep-opt.sel { background:rgba(99,102,241,.12); }
.ep-opt-radio { width:16px; height:16px; border-radius:50%; flex-shrink:0; border:2px solid var(--ep-border2); display:flex; align-items:center; justify-content:center; transition:all .16s; }
.ep-opt.sel .ep-opt-radio { border-color:#6366f1; background:#6366f1; }
.ep-opt-dot   { width:6px; height:6px; border-radius:50%; background:#fff; }
.ep-opt-lbl   { font-size:13px; font-weight:500; color:var(--ep-text2); flex:1; line-height:1.4; cursor:pointer; }
.ep-opt.sel .ep-opt-lbl { color:#4338ca; font-weight:600; }
[data-theme="dark"] .ep-opt.sel .ep-opt-lbl { color:#a5b4fc; }

/* Textarea */
.ep-ta { width:100%; border-radius:12px; border:2px solid var(--ep-border2); padding:11px 13px; font-size:13.5px; font-family:inherit; color:var(--ep-text); resize:none; outline:none; transition:border .2s,background .3s,color .3s; background:var(--ep-input-bg); line-height:1.6; }
.ep-ta:focus { border-color:#6366f1; background:var(--ep-surface); box-shadow:0 0 0 3px rgba(99,102,241,.08); }

/* Speech */
.ep-speech-area { display:flex; flex-direction:column; gap:10px; align-items:center; }
.ep-speech-transcript { width:100%; border-radius:12px; border:2px solid var(--ep-border2); padding:11px 13px; font-size:13.5px; color:var(--ep-text); background:var(--ep-input-bg); min-height:90px; line-height:1.6; font-family:inherit; resize:none; outline:none; transition:background .3s,color .3s,border-color .3s; }
.ep-speech-btn { display:flex; align-items:center; gap:8px; padding:10px 24px; border-radius:12px; border:none; cursor:pointer; font-family:inherit; font-size:13.5px; font-weight:700; color:#fff; transition:all .2s; }
.ep-speech-btn.idle   { background:linear-gradient(135deg,#10b981,#0d9488); box-shadow:0 4px 12px rgba(16,185,129,.3); }
.ep-speech-btn.active { background:linear-gradient(135deg,#ef4444,#dc2626); box-shadow:0 4px 12px rgba(239,68,68,.3); animation:sPulse .9s ease-in-out infinite; }
.ep-speech-btn.idle:hover   { transform:translateY(-1px); box-shadow:0 6px 16px rgba(16,185,129,.4); }
.ep-speech-btn.active:hover { transform:translateY(-1px); }
@keyframes sPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
.ep-speech-hint { font-size:11.5px; color:var(--ep-subtle); text-align:center; }
.ep-speech-listening { display:flex; align-items:center; gap:6px; font-size:11.5px; color:#6366f1; font-weight:600; }
.ep-speech-wave { display:flex; align-items:center; gap:2px; }
.ep-speech-wave span { display:inline-block; width:3px; border-radius:3px; background:#6366f1; animation:wave 0.8s ease-in-out infinite; }
.ep-speech-wave span:nth-child(1) { animation-delay:0s; }
.ep-speech-wave span:nth-child(2) { animation-delay:0.15s; }
.ep-speech-wave span:nth-child(3) { animation-delay:0.3s; }
.ep-speech-wave span:nth-child(4) { animation-delay:0.45s; }
@keyframes wave { 0%,100%{height:6px;opacity:.5} 50%{height:16px;opacity:1} }

/* Q footer */
.ep-qfoot { flex-shrink:0; padding:9px 16px; border-top:1px solid var(--ep-border); display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
.ep-nav { display:flex; align-items:center; gap:5px; padding:7px 13px; border-radius:10px; border:1.5px solid var(--ep-border2); background:var(--ep-nav-bg); font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; color:var(--ep-nav-text); transition:all .18s; }
.ep-nav:hover:not(:disabled) { border-color:#6366f1; color:#6366f1; }
.ep-nav:disabled { opacity:.35; cursor:not-allowed; }
.ep-foot-r { display:flex; gap:6px; flex-wrap:wrap; }
.ep-rev { display:flex; align-items:center; gap:5px; padding:7px 12px; border-radius:10px; border:1.5px solid #f59e0b; background:rgba(245,158,11,.06); font-family:inherit; font-size:11.5px; font-weight:600; cursor:pointer; color:#d97706; transition:all .18s; }
.ep-rev:hover { background:rgba(245,158,11,.11); }
.ep-sav { display:flex; align-items:center; gap:5px; padding:7px 14px; border-radius:10px; border:none; background:linear-gradient(135deg,#6366f1,#8b5cf6); font-family:inherit; font-size:12px; font-weight:700; cursor:pointer; color:#fff; box-shadow:0 3px 9px rgba(99,102,241,.26); transition:all .18s; }
.ep-sav:hover { transform:translateY(-1px); box-shadow:0 5px 13px rgba(99,102,241,.36); }

/* ── RIGHT PANEL ── */
.ep-right { display:flex; flex-direction:column; gap:8px; min-height:0; overflow:hidden; }

.ep-rc { background:var(--ep-rc-bg); border-radius:14px; border:1px solid var(--ep-border); box-shadow:var(--ep-shadow); overflow:hidden; flex-shrink:0; transition:background .3s,border-color .3s; }

/* Proctoring */
.ep-ph { padding:8px 12px; background:linear-gradient(135deg,rgba(99,102,241,.06),rgba(139,92,246,.04)); border-bottom:1px solid var(--ep-border); display:flex; align-items:center; justify-content:space-between; }
[data-theme="dark"] .ep-ph { background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.08)); }
.ep-pt { font-size:11.5px; font-weight:700; color:var(--ep-text); display:flex; align-items:center; gap:5px; }
.ep-ps { display:flex; align-items:center; gap:4px; font-size:10px; font-weight:600; color:#059669; }
.ep-pd { width:6px; height:6px; border-radius:50%; background:#22c55e; animation:pDot 1.5s ease-in-out infinite; }
@keyframes pDot { 0%,100%{opacity:1} 50%{opacity:.3} }
.ep-wc { height:90px; background:#0f172a; overflow:hidden; }
.ep-pf { padding:4px 12px; font-size:9.5px; color:var(--ep-subtle); text-align:center; background:var(--ep-surface2); border-top:1px solid var(--ep-border); }

/* Palette */
.ep-pal {
  flex:1; display:flex; flex-direction:column;
  background:var(--ep-pal-bg); border-radius:14px; border:1px solid var(--ep-border);
  box-shadow:var(--ep-shadow); overflow:hidden; min-height:0;
  transition:background .3s,border-color .3s;
}
.ep-palh   { flex-shrink:0; padding:9px 12px; border-bottom:1px solid var(--ep-border); font-size:12px; font-weight:700; color:var(--ep-text); }
.ep-palp   { flex-shrink:0; padding:6px 12px; }
.ep-palpr  { display:flex; justify-content:space-between; font-size:10px; color:var(--ep-muted); font-weight:500; margin-bottom:3px; }
.ep-palpb  { height:4px; background:var(--ep-border); border-radius:4px; overflow:hidden; }
.ep-palpf  { height:100%; border-radius:4px; background:linear-gradient(90deg,#6366f1,#8b5cf6); transition:width .5s; }

.ep-palscr { flex:1; padding:6px 12px; min-height:0; overflow-y:auto; }
.ep-palscr::-webkit-scrollbar { width:3px; }
.ep-palscr::-webkit-scrollbar-thumb { background:rgba(99,102,241,.18); border-radius:99px; }
.ep-palgr { display:grid; grid-template-columns:repeat(6,1fr); gap:5px; }

.ep-pb { width:100%; aspect-ratio:1; border-radius:7px; border:none; font-family:inherit; font-size:10.5px; font-weight:700; cursor:pointer; transition:all .15s; }
.epb-un  { background:var(--ep-btn-un); color:var(--ep-btn-un-txt); }
.epb-un:hover { background:var(--ep-border2); }
.epb-ans { background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 1px 5px rgba(16,185,129,.26); }
.epb-rev { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; box-shadow:0 1px 5px rgba(245,158,11,.26); }
.epb-cur { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 2px 7px rgba(99,102,241,.34); transform:scale(1.07); }

.ep-palleg { flex-shrink:0; padding:5px 12px 8px; display:flex; flex-wrap:wrap; gap:5px; border-top:1px solid var(--ep-border); }
.ep-leg    { display:flex; align-items:center; gap:3px; font-size:9.5px; color:var(--ep-muted); font-weight:500; }
.ep-legdot { width:8px; height:8px; border-radius:3px; flex-shrink:0; }

/* Stats + submit */
.ep-sub { flex-shrink:0; background:var(--ep-sub-bg); border-radius:14px; border:1px solid var(--ep-border); box-shadow:var(--ep-shadow); padding:10px 12px; display:flex; flex-direction:column; gap:6px; transition:background .3s,border-color .3s; }
.ep-subgr { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; }
.ep-stm   { padding:6px; border-radius:9px; background:var(--ep-stm-bg); border:1px solid var(--ep-border); text-align:center; transition:background .3s,border-color .3s; }
.ep-stmv  { font-size:15px; font-weight:800; color:var(--ep-text); line-height:1; }
.ep-stml  { font-size:9px; color:var(--ep-subtle); margin-top:2px; font-weight:500; }
.ep-stm.g .ep-stmv { color:#059669; }
.ep-stm.a .ep-stmv { color:#d97706; }
.ep-stm.i .ep-stmv { color:#6366f1; }
.ep-subbtn { width:100%; padding:10px; border-radius:11px; border:none; background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; font-family:inherit; font-size:13px; font-weight:800; cursor:pointer; transition:all .2s; box-shadow:0 3px 12px rgba(239,68,68,.28); letter-spacing:.03em; }
.ep-subbtn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(239,68,68,.4); }

/* ── SYSTEM CHECK ── */
.sc-shell { position:fixed; inset:0; background:var(--ep-bg); display:flex; align-items:center; justify-content:center; z-index:999; padding:20px; }
.sc-card  { background:var(--ep-surface); border-radius:22px; padding:26px 30px; max-width:400px; width:100%; border:1px solid var(--ep-border); box-shadow:0 8px 40px rgba(0,0,0,.1); text-align:center; }
[data-theme="dark"] .sc-card { box-shadow:0 8px 40px rgba(0,0,0,.4); }
.sc-steps { display:flex; align-items:center; gap:5px; justify-content:center; margin-bottom:16px; }
.sc-step  { height:4px; width:26px; border-radius:4px; background:var(--ep-border2); transition:background .3s; }
.sc-step.d{ background:#6366f1; }
.sc-step.c{ background:linear-gradient(90deg,#6366f1,#8b5cf6); }
.sc-ico   { width:68px; height:68px; border-radius:20px; margin:0 auto 14px; display:flex; align-items:center; justify-content:center; }
.sc-title { font-size:18px; font-weight:800; color:var(--ep-text); margin-bottom:6px; }
.sc-desc  { font-size:13px; color:var(--ep-muted); line-height:1.6; margin-bottom:18px; }
.sc-webcam{ border-radius:12px; overflow:hidden; border:2px solid var(--ep-border); margin-bottom:14px; aspect-ratio:16/9; background:#0f172a; }
.sc-denied{ display:flex; align-items:center; justify-content:center; gap:6px; padding:9px 12px; border-radius:10px; background:rgba(239,68,68,.06); border:1px solid rgba(239,68,68,.14); color:#ef4444; font-size:12px; font-weight:600; margin-bottom:12px; }
.sc-btn   { width:100%; padding:12px; border-radius:12px; border:none; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:all .2s; }
.sc-ind   { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 13px rgba(99,102,241,.3); }
.sc-red   { background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; box-shadow:0 4px 13px rgba(239,68,68,.3); }
.sc-btn:hover { transform:translateY(-1px); }

/* ── LOADER ── */
.ep-ldr  { position:fixed; inset:0; background:var(--ep-loader-bg); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; z-index:999; transition:background .3s; }
.ep-ldr-ring { width:56px; height:56px; border-radius:16px; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#6366f1,#8b5cf6); box-shadow:0 8px 24px rgba(99,102,241,.3); }
.ep-ldr-text { font-size:13.5px; font-weight:700; color:var(--ep-text); font-family:'Plus Jakarta Sans',system-ui,sans-serif; }
.ep-ldr-sub  { font-size:11.5px; color:var(--ep-subtle); font-family:'Plus Jakarta Sans',system-ui,sans-serif; }
.ep-ldr-dots { display:flex; gap:5px; }
.ep-ldr-dot  { width:6px; height:6px; border-radius:50%; background:#818cf8; }

/* ── BAN OVERLAY ── */
.ep-ban { position:absolute; inset:0; background:rgba(0,0,0,.92); backdrop-filter:blur(20px); z-index:200; display:flex; align-items:center; justify-content:center; padding:28px; }

/* ── RESPONSIVE ── */
@media (max-width:1200px) { .ep-body { grid-template-columns:1fr 260px; gap:10px; padding:10px 14px; } }
@media (max-width:1024px) { .ep-body { grid-template-columns:1fr 240px; gap:9px; padding:9px 12px; } .ep-wc { height:75px; } }
@media (max-width:900px)  { .ep-body { grid-template-columns:1fr; padding:10px 12px; } .ep-right { display:none; } }
@media (max-width:640px)  {
  .ep-top   { height:52px; padding:0 12px; }
  .ep-body  { padding:8px 10px; }
  .ep-qhead { padding:8px 12px; }
  .ep-qbody { padding:11px 12px; }
  .ep-qfoot { padding:7px 12px; }
  .ep-qtext { font-size:13.5px; margin-bottom:11px; }
  .ep-top-sub { display:none; }
  .ep-top-ico { display:none; }
  .ep-nav,.ep-rev,.ep-sav { padding:6px 10px; font-size:11px; }
  .ep-opt { padding:8px 10px; }
}
@media (max-width:380px) { .ep-foot-r { flex-direction:column; width:100%; } .ep-rev,.ep-sav { justify-content:center; } }
`;

/* ─── Webcam ─── */
const Webcam = ({ stream }: { stream: MediaStream | null }) => {
  const r = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (r.current && stream) r.current.srcObject = stream; }, [stream]);
  return stream
    ? <video ref={r} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
    : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#475569", fontSize:10 }}>Connecting…</div>;
};

/* ─── Loader ─── */
const Loader = () => (
  <div className="ep-ldr">
    <style>{S}</style>
    <motion.div className="ep-ldr-ring"
      animate={{ rotate:[0,180,360], borderRadius:["20%","50%","20%"] }}
      transition={{ duration:2.4, repeat:Infinity, ease:"easeInOut" }}>
      <Shield size={24} color="#fff" style={{ position:"relative", zIndex:1 }}/>
    </motion.div>
    <p className="ep-ldr-text">Initialising Secure Exam Environment</p>
    <p className="ep-ldr-sub">Please wait — do not close this window</p>
    <div className="ep-ldr-dots">
      {[0,1,2].map(i => (
        <motion.div key={i} className="ep-ldr-dot"
          animate={{ opacity:[.3,1,.3] }} transition={{ duration:1.2, repeat:Infinity, delay:i*.2 }}/>
      ))}
    </div>
  </div>
);

/* ─── System Check ─── */
const SystemCheck = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep]    = useState<"welcome"|"mic"|"webcam"|"ready">("welcome");
  const [micP, setMicP]    = useState<"prompt"|"granted"|"denied">("prompt");
  const [camP, setCamP]    = useState<"prompt"|"granted"|"denied">("prompt");
  const vidRef             = useRef<HTMLVideoElement>(null);
  const [stream, setStream]= useState<MediaStream|null>(null);
  const [loading, setLoad] = useState(false);

  const reqMic = async () => {
    setLoad(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio:true });
      s.getTracks().forEach(t => t.stop()); setMicP("granted");
      setTimeout(() => { setLoad(false); setStep("webcam"); }, 1200);
    } catch { setMicP("denied"); setLoad(false); }
  };

  const reqCam = async () => {
    setLoad(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:true });
      setCamP("granted"); setStream(s);
      if (vidRef.current) vidRef.current.srcObject = s;
      setTimeout(() => { setLoad(false); setStep("ready"); }, 1200);
    } catch { setCamP("denied"); setLoad(false); }
  };

  useEffect(() => { if (stream && vidRef.current) vidRef.current.srcObject = stream; }, [stream]);
  if (loading) return <Loader/>;

  const allSteps = ["welcome","mic","webcam","ready"];
  const si = allSteps.indexOf(step);

  const cfg: Record<string, any> = {
    welcome: { bg:"linear-gradient(135deg,#6366f1,#8b5cf6)", icon:<Shield size={28} color="#fff"/>,  title:"Secure Environment Check",   desc:"Before the exam begins, we must verify your system's integrity.",           btn:"Begin Verification",   act:()=>setStep("mic"), red:false },
    mic:     { bg:"linear-gradient(135deg,#0ea5e9,#22d3ee)", icon:<Mic size={28} color="#fff"/>,     title:"Microphone Verification",     desc:"Proctoring requires microphone access. Please grant permission when prompted.", btn:"Authorise Microphone", act:reqMic, red:false, denied:micP==="denied" },
    webcam:  { bg:"linear-gradient(135deg,#10b981,#0d9488)", icon:<Eye size={28} color="#fff"/>,     title:"Camera Verification",         desc:"Your camera feed is required for proctoring. Confirm you can see yourself.",   btn:"Authorise Camera",    act:reqCam, red:false, denied:camP==="denied" },
    ready:   { bg:"linear-gradient(135deg,#10b981,#059669)", icon:<Check size={28} color="#fff"/>,   title:"System Verified ✓",           desc:"Your system is secure. You may now begin the final assessment. Good luck! 🎓", btn:"Start Exam",          act:onComplete, red:true },
  };
  const c = cfg[step];

  return (
    <div className="sc-shell">
      <style>{S}</style>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.96}} transition={{duration:.22}} className="sc-card">
          <div className="sc-steps">
            {allSteps.map((s,i) => <div key={s} className={`sc-step${i<si?" d":i===si?" c":""}`}/>)}
          </div>
          <div className="sc-ico" style={{background:c.bg}}>{c.icon}</div>
          <h2 className="sc-title">{c.title}</h2>
          <p className="sc-desc">{c.desc}</p>
          {step==="webcam" && (
            <div className="sc-webcam">
              <video ref={vidRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
            </div>
          )}
          {c.denied && <div className="sc-denied"><AlertTriangle size={14}/>Permission denied — check browser settings.</div>}
          {step!=="ready" && !c.denied && <button className={`sc-btn ${c.red?"sc-red":"sc-ind"}`} onClick={c.act}>{c.btn}</button>}
          {step==="ready"              && <button className="sc-btn sc-red"                       onClick={onComplete}>{c.btn}</button>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* ─── Question type icon ─── */
const QIcon = ({ type }: { type: string }) => {
  if (type==="MCQ")    return <HelpCircle size={14} style={{color:"#3b82f6"}}/>;
  if (type==="SHORT")  return <PencilRuler size={14} style={{color:"#d97706"}}/>;
  if (type==="LONG")   return <BrainCircuit size={14} style={{color:"#8b5cf6"}}/>;
  if (type==="SPEECH") return <Mic size={14} style={{color:"#059669"}}/>;
  return null;
};

/* ═══════════════════════════════════════════════════════════════
   MAIN EXAM PAGE
═══════════════════════════════════════════════════════════════ */
const INIT_TIME = 60 * 60;

const MainExamPage = () => {
  const [loading,   setLoading]   = useState(true);
  const [sysOk,     setSysOk]     = useState(false);
  const [questions]               = useState<Question[]>(() => [...mockExamQuestions].sort(() => Math.random()-.5));
  const [idx,       setIdx]       = useState(0);
  const [answers,   setAnswers]   = useState<Record<number, string|number>>({});
  const [statuses,  setStatuses]  = useState<Record<number, "answered"|"review">>({});
  const [timeLeft,  setTimeLeft]  = useState(INIT_TIME);
  const [camStream, setCamStream] = useState<MediaStream|null>(null);
  const mediaRef                  = useRef<MediaStream|null>(null);
  const [alert,     setAlert]     = useState<string|null>(null);
  const [cooldown,  setCooldown]  = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isBanned,  setIsBanned]  = useState(false);
  const [strikes,   setStrikes]   = useState(0);

  // Speech recognition — native Web Speech API
  const [listening,  setListening]  = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const recRef                      = useRef<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const { theme, setTheme } = useTheme();
  const isDesktop = useMediaQuery("(min-width: 900px)");

  /* streams */
  const stopStreams = () => {
    mediaRef.current?.getTracks().forEach(t => t.stop());
    mediaRef.current = null; setCamStream(null);
  };

  /* init */
  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  /* speech support check */
  useEffect(() => {
    setSpeechSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }, []);

  /* init speech recognition once */
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.continuous    = false;
    r.interimResults= true;   // show partial results while speaking
    r.lang          = "en-US";

    r.onresult = (e: any) => {
      let interim = "";
      let final   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      // Show interim while speaking
      setSpokenText(final || interim);
      if (final) {
        handleAnswer(questions[idx].id, final);
        setListening(false);
      }
    };

    r.onerror = (e: any) => {
      console.error("Speech error:", e.error);
      setListening(false);
      if (e.error === "no-speech") setSpokenText("No speech detected. Please try again.");
    };

    r.onend = () => setListening(false);

    recRef.current = r;
  }, []); // only once

  // Re-init recognition for each question so we capture the right qId
  const startListen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop any existing session
    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
    }

    const r = new SpeechRecognition();
    r.continuous     = false;
    r.interimResults = true;
    r.lang           = "en-US";
    const currentQId = questions[idx].id;

    r.onresult = (e: any) => {
      let interim = "";
      let finalT  = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalT += t;
        else interim += t;
      }
      setSpokenText(finalT || interim);
      if (finalT) {
        setAnswers(p => ({ ...p, [currentQId]: finalT }));
        setStatuses(p => ({ ...p, [currentQId]: "answered" }));
        setListening(false);
      }
    };

    r.onerror = (e: any) => {
      console.error("Speech error:", e.error);
      setListening(false);
      if (e.error === "no-speech") setSpokenText("No speech detected. Try again.");
      if (e.error === "not-allowed") setSpokenText("Microphone access denied.");
    };

    r.onend = () => setListening(false);

    recRef.current = r;
    try { r.start(); setListening(true); setSpokenText(""); } catch(e) { console.error(e); }
  };

  const stopListen = () => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  };

  /* streams after system check */
  useEffect(() => {
    if (sysOk && !submitted) {
      navigator.mediaDevices.getUserMedia({ video:true, audio:true })
        .then(s => { mediaRef.current = s; setCamStream(s); })
        .catch(() => {});
    } else { stopStreams(); }
  }, [sysOk, submitted]);

  useEffect(() => () => stopStreams(), []);

  /* timer */
  useEffect(() => {
    if (loading || submitted || !sysOk) return;
    const t = setInterval(() => setTimeLeft(p => { if (p<=1){ clearInterval(t); handleSubmit(); return 0; } return p-1; }), 1000);
    return () => clearInterval(t);
  }, [loading, submitted, sysOk]);

  /* handlers */
  const handleSubmit = () => { setSubmitted(true); stopStreams(); };

  const handleSysOk = () => {
    setSysOk(true); setLoading(true);
    setTimeout(() => setLoading(false), 2200);
  };

  const handleMotion = () => {
    if (alert || cooldown) return;
    setAlert("Potential misconduct detected: Unusual movement. A warning has been logged.");
  };

  const dismissAlert = () => {
    const s = strikes + 1; setStrikes(s);
    setAlert(null);
    if (s >= 3) { setIsBanned(true); return; }
    setCooldown(true); setTimeout(() => setCooldown(false), 30_000);
  };

  const handleAnswer = (qId: number, val: string|number) => {
    setAnswers(p  => ({ ...p,  [qId]: val }));
    setStatuses(p => ({ ...p,  [qId]: "answered" }));
  };

  const goTo    = (i: number) => { if (i>=0 && i<questions.length) { setIdx(i); setSpokenText(""); } };
  const markRev = () => {
    setStatuses(p => ({ ...p, [questions[idx].id]: "review" }));
    if (idx < questions.length-1) goTo(idx+1);
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  /* early returns */
  if (loading)   return <Loader/>;
  if (!sysOk)    return <SystemCheck onComplete={handleSysOk}/>;
  if (submitted) return <ExamResultDisplay score={0} total={0} isMainExam={true} onRetry={() => window.location.href="/dashboard"}/>;

  const q        = questions[idx];
  const answered = Object.values(statuses).filter(v => v==="answered").length;
  const reviewed = Object.values(statuses).filter(v => v==="review").length;
  const timeWarn = timeLeft < 300;

  const typeLabel: Record<string,string> = { MCQ:"Multiple Choice", SHORT:"Short Answer", LONG:"Essay", SPEECH:"Speech" };
  const typeBadge: Record<string,string> = { MCQ:"epbadge-mcq", SHORT:"epbadge-sh", LONG:"epbadge-lg", SPEECH:"epbadge-sp" };

  /* Current answer value for speech question */
  const currentSpokenVal = spokenText || String(answers[q.id]||"");

  /* ── Palette (shared sidebar + drawer) ── */
  const Palette = ({ compact = false }: { compact?: boolean }) => (
    <>
      <div className="ep-palh">Question Navigator</div>
      <div className="ep-palp">
        <div className="ep-palpr">
          <span>Progress</span>
          <span style={{color:"#6366f1",fontWeight:700}}>{answered}/{questions.length}</span>
        </div>
        <div className="ep-palpb"><div className="ep-palpf" style={{width:`${(answered/questions.length)*100}%`}}/></div>
      </div>
      {/* Scroll only when >30 questions */}
      <div className="ep-palscr">
        <div className="ep-palgr">
          {questions.map((qs,i) => {
            const st  = statuses[qs.id];
            const cur = i===idx;
            const cls = cur?"epb-cur":st==="answered"?"epb-ans":st==="review"?"epb-rev":"epb-un";
            return (
              <motion.button key={qs.id}
                whileHover={{ scale: cur ? 1.07 : 1.05 }}
                onClick={() => goTo(i)}
                className={`ep-pb ${cls}`}>
                {i+1}
              </motion.button>
            );
          })}
        </div>
      </div>
      <div className="ep-palleg">
        {[
          {bg:"linear-gradient(135deg,#6366f1,#8b5cf6)", l:"Current"},
          {bg:"linear-gradient(135deg,#10b981,#059669)", l:"Done"},
          {bg:"linear-gradient(135deg,#f59e0b,#d97706)", l:"Review"},
          {bg:"#f1f5f9",                                 l:"Not done"},
        ].map(x => (
          <div key={x.l} className="ep-leg">
            <div className="ep-legdot" style={{background:x.bg}}/>{x.l}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <>
      <style>{S}</style>
      <div className="ep">
        {camStream && <MotionDetector stream={camStream} onMotion={handleMotion}/>}

        {/* ── PROCTORING ALERT ── */}
        <AlertDialog open={!!alert}>
          <AlertDialogContent className="rounded-2xl max-w-sm p-6">
            <AlertDialogHeader style={{alignItems:"center",textAlign:"center",gap:10}}>
              <div style={{width:46,height:46,borderRadius:13,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.14)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <AlertTriangle size={21} color="#ef4444"/>
              </div>
              <AlertDialogTitle className="text-base font-semibold">Proctoring Alert</AlertDialogTitle>
              <AlertDialogDescription style={{lineHeight:1.6}}>
                {alert} Strike <strong style={{color:"#f59e0b"}}>{strikes+1}/3</strong> recorded.
                {strikes+1>=3 && " You will be banned from the exam."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter style={{marginTop:14}}>
              <AlertDialogAction onClick={dismissAlert}
                style={{width:"100%",borderRadius:11,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",fontWeight:700}}>
                Understood
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── TOP BAR ── */}
        <div className="ep-top">
          <div className="ep-top-l">
            <div className="ep-top-ico"><BookOpen size={16} color="#fff"/></div>
            <div>
              <div className="ep-top-title">Final Assessment</div>
              <div className="ep-top-sub">Q{idx+1}/{questions.length} · Secure proctored exam</div>
            </div>
          </div>
          <div className="ep-top-r">
            {/* Strike indicator */}
            {strikes > 0 && (
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,background:"rgba(239,68,68,.2)",border:"1px solid rgba(239,68,68,.3)"}}>
                <AlertTriangle size={12} color="#fca5a5"/>
                <span style={{fontSize:11,fontWeight:700,color:"#fca5a5"}}>{strikes}/3 strikes</span>
              </div>
            )}
            <div className={`ep-timer${timeWarn?" warn":""}`}>
              <TimerIcon size={14} color={timeWarn?"#fca5a5":"rgba(255,255,255,.8)"}/>
              <span className="ep-timer-val">{fmt(timeLeft)}</span>
            </div>
            <button className="ep-icobtn" onClick={() => setTheme(theme==="dark"?"light":"dark")}>
              {theme==="dark" ? <Sun size={14}/> : <Moon size={14}/>}
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="ep-body">

          {/* ── LEFT: question ── */}
          <div className="ep-left">
            <div className="ep-qcard">

              {/* Q header */}
              <div className="ep-qhead">
                <QIcon type={q.type}/>
                <span className="epbadge epbadge-q">Q {idx+1}</span>
                <span className={`epbadge ${typeBadge[q.type]||"epbadge-mcq"}`}>{typeLabel[q.type]||q.type}</span>
                <span className="epbadge-mk">2 marks</span>
              </div>

              {/* Q body — internal scroll only */}
              <div className="ep-qbody">
                <AnimatePresence mode="wait">
                  <motion.div key={q.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.2}}>
                    <p className="ep-qtext">{q.question}</p>

                    {/* MCQ */}
                    {q.type==="MCQ" && q.options && (
                      <div>
                        {q.options.map((opt,i) => (
                          <div key={i} className={`ep-opt${String(answers[q.id])===String(i)?" sel":""}`}
                            onClick={() => handleAnswer(q.id, i)}>
                            <div className="ep-opt-radio">
                              {String(answers[q.id])===String(i) && <div className="ep-opt-dot"/>}
                            </div>
                            <label className="ep-opt-lbl">{opt}</label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Speech */}
                    {q.type==="SPEECH" && (
                      <div className="ep-speech-area">
                        <textarea
                          className="ep-speech-transcript"
                          readOnly
                          rows={4}
                          style={{width:"100%",resize:"none"}}
                          value={currentSpokenVal}
                          placeholder="Your spoken answer will appear here as you speak…"
                        />
                        {speechSupported ? (
                          <>
                            <button
                              className={`ep-speech-btn ${listening?"active":"idle"}`}
                              onClick={listening ? stopListen : startListen}
                            >
                              {listening ? <><MicOff size={16}/>Stop Speaking</> : <><Mic size={16}/>Start Speaking</>}
                            </button>
                            {listening && (
                              <div className="ep-speech-listening">
                                <div className="ep-speech-wave">
                                  <span/><span/><span/><span/>
                                </div>
                                Listening… speak clearly now
                              </div>
                            )}
                            {!listening && currentSpokenVal && (
                              <p className="ep-speech-hint">✓ Answer recorded. Click Start Speaking to re-record.</p>
                            )}
                          </>
                        ) : (
                          <div style={{padding:"10px 14px",borderRadius:12,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.14)",fontSize:12.5,color:"#ef4444",textAlign:"center"}}>
                            <AlertTriangle size={14} style={{marginBottom:4}}/>
                            <div>Speech recognition is not supported in this browser.</div>
                            <div style={{color:"#94a3b8",marginTop:4}}>Please use Chrome or Edge for speech questions.</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Short */}
                    {q.type==="SHORT" && (
                      <textarea className="ep-ta" rows={4} style={{width:"100%"}}
                        placeholder="Type your concise answer here…"
                        value={String(answers[q.id]||"")}
                        onChange={e => handleAnswer(q.id, e.target.value)}/>
                    )}

                    {/* Long */}
                    {q.type==="LONG" && (
                      <textarea className="ep-ta" rows={7} style={{width:"100%"}}
                        placeholder="Type your detailed answer here…"
                        value={String(answers[q.id]||"")}
                        onChange={e => handleAnswer(q.id, e.target.value)}/>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Q footer */}
              <div className="ep-qfoot">
                <button className="ep-nav" onClick={() => goTo(idx-1)} disabled={idx===0}>
                  <ChevronLeft size={13}/>Previous
                </button>
                <div className="ep-foot-r">
                  <button className="ep-rev" onClick={markRev}>
                    <Star size={11}/>Mark for Review
                  </button>
                  <button className="ep-sav" onClick={() => idx<questions.length-1 ? goTo(idx+1) : undefined}>
                    Save &amp; Next<ChevronRight size={12}/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: desktop/laptop only ── */}
          <div className="ep-right">

            {/* Compact proctoring webcam */}
            <div className="ep-rc">
              <div className="ep-ph">
                <div className="ep-pt"><Shield size={12} style={{color:"#6366f1"}}/>System Status</div>
                <div className="ep-ps"><div className="ep-pd"/>AI Active <Eye size={9}/><Mic size={9}/></div>
              </div>
              <div className="ep-wc"><Webcam stream={camStream}/></div>
              <div className="ep-pf">AI Proctoring Enabled · Monitored</div>
            </div>

            {/* Palette — up to 30 shown, scrolls above 30 */}
            <div className="ep-pal"><Palette/></div>

            {/* Stats + submit */}
            <div className="ep-sub">
              <div className="ep-subgr">
                <div className="ep-stm g"><div className="ep-stmv">{answered}</div><div className="ep-stml">Answered</div></div>
                <div className="ep-stm a"><div className="ep-stmv">{reviewed}</div><div className="ep-stml">Review</div></div>
                <div className="ep-stm">  <div className="ep-stmv">{questions.length-answered-reviewed}</div><div className="ep-stml">Left</div></div>
                <div className="ep-stm i"><div className="ep-stmv">{questions.length}</div><div className="ep-stml">Total</div></div>
              </div>
              <button className="ep-subbtn" onClick={handleSubmit}>SUBMIT EXAM</button>
            </div>
          </div>
        </div>

        {/* ── MOBILE / TABLET: FABs ── */}
        {!isDesktop && (
          <>
            {/* Palette + submit drawer */}
            <div style={{position:"fixed",bottom:20,right:20,zIndex:60}}>
              <Drawer>
                <DrawerTrigger asChild>
                  <button style={{
                    width:50,height:50,borderRadius:"50%",
                    background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                    border:"none",cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:"#fff",boxShadow:"0 5px 16px rgba(99,102,241,.38)",
                  }}>
                    <LayoutGrid size={19}/>
                  </button>
                </DrawerTrigger>
                <DrawerContent>
                  <div style={{maxWidth:480,margin:"0 auto",width:"100%",fontFamily:"Plus Jakarta Sans,system-ui,sans-serif"}}>
                    <DrawerHeader>
                      <DrawerTitle style={{fontWeight:800,fontSize:14}}>Question Navigator</DrawerTitle>
                    </DrawerHeader>
                    <div style={{padding:"0 16px 8px"}}>
                      {/* Mini stats */}
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:12}}>
                        {[
                          {v:answered,l:"Answered",c:"#059669"},
                          {v:reviewed,l:"Review",c:"#d97706"},
                          {v:questions.length-answered-reviewed,l:"Left",c:"#374151"},
                          {v:questions.length,l:"Total",c:"#6366f1"},
                        ].map(s => (
                          <div key={s.l} style={{background:"#f8fafc",borderRadius:11,padding:"7px 9px",textAlign:"center",border:"1px solid #f1f5f9"}}>
                            <div style={{fontSize:17,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                            <div style={{fontSize:9.5,color:"#94a3b8",marginTop:2,fontWeight:500}}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                      {/* Palette */}
                      <div style={{background:"#fff",borderRadius:14,border:"1px solid #f1f5f9",overflow:"hidden",maxHeight:"40vh",display:"flex",flexDirection:"column"}}>
                        <Palette compact/>
                      </div>
                    </div>
                    <DrawerFooter>
                      <button onClick={handleSubmit} style={{
                        width:"100%",padding:12,borderRadius:11,border:"none",
                        background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"#fff",
                        fontSize:13.5,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                        boxShadow:"0 4px 13px rgba(239,68,68,.3)",
                      }}>SUBMIT EXAM</button>
                      <DrawerClose asChild>
                        <button style={{width:"100%",padding:10,borderRadius:11,border:"1.5px solid #e2e8f0",background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",color:"#64748b",marginTop:5}}>Close</button>
                      </DrawerClose>
                    </DrawerFooter>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>

            {/* Draggable mini proctoring cam */}
            <motion.div drag dragMomentum={false}
              style={{
                position:"fixed",top:64,right:12,zIndex:50,cursor:"grab",
                width:130,background:"#fff",borderRadius:12,overflow:"hidden",
                boxShadow:"0 5px 20px rgba(0,0,0,.14)",border:"2px solid rgba(99,102,241,.18)",
              }}>
              <div style={{padding:"4px 8px",display:"flex",alignItems:"center",gap:4,background:"linear-gradient(135deg,rgba(99,102,241,.07),rgba(139,92,246,.04))"}}>
                <GripVertical size={11} style={{color:"#94a3b8"}}/>
                <span style={{fontSize:9.5,fontWeight:700,color:"#374151"}}>Proctoring</span>
                <div style={{marginLeft:"auto",display:"flex",gap:3}}>
                  <Eye size={9} style={{color:"#10b981"}}/><Mic size={9} style={{color:"#10b981"}}/>
                </div>
              </div>
              <div style={{height:70,background:"#0f172a"}}><Webcam stream={camStream}/></div>
            </motion.div>
          </>
        )}

        {/* ── BAN OVERLAY ── */}
        {isBanned && (
          <div className="ep-ban">
            <motion.div initial={{scale:.85,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",delay:.1}}
              style={{textAlign:"center",maxWidth:300}}>
              <motion.div animate={{scale:[1,1.05,1]}} transition={{duration:2,repeat:Infinity}}
                style={{width:64,height:64,borderRadius:18,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                <Skull size={32} color="#ef4444"/>
              </motion.div>
              <h2 style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:7}}>Access Suspended</h2>
              <p style={{fontSize:12.5,color:"#94a3b8",lineHeight:1.6,marginBottom:20}}>You have reached the maximum policy violations (3/3). Access to this exam has been permanently terminated.</p>
              <button onClick={() => window.location.reload()}
                style={{width:"100%",padding:11,borderRadius:11,background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"#fff",border:"none",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Leave Exam
              </button>
            </motion.div>
          </div>
        )}

      </div>
    </>
  );
};

export default MainExamPage;