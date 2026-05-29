import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  FileQuestion,
  ChevronDown,
  Check,
  ArrowRight,
  Sparkles,
  Clock,
  Target,
  Search,
  X,
  Star,
  Lock,
  TrendingUp,
  ArrowLeft,
  Home,
  Printer,
  ChevronRight,
} from "lucide-react";
import { useAuth } from '../hooks/use-auth';
import Navigation from '../components/navigation';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

.ep-root{font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  background:var(--bg-app,#f8fafc);min-height:100vh;color:var(--text-main,#0f172a);}
.dark .ep-root { --bg-app: #0d1117; --text-main: #c9d1d9; }
.dark .ep-steps-bar, .dark .ep-subj-card, .dark .ep-hub-header, .dark .ep-hub-card, .dark .ep-faq-sidebar, .dark .ep-faq-search-bar, .dark .ep-faq-qonly-card, .dark .ep-paper-header, .dark .ep-part-section, .dark .ep-empty, .dark .ep-back-btn, .dark .bg-white { background-color: #161b22; }
.dark .ep-steps-bar, .dark .ep-subj-card, .dark .ep-hub-header, .dark .ep-hub-card, .dark .ep-faq-sidebar, .dark .ep-faq-search-bar, .dark .ep-faq-qonly-card, .dark .ep-paper-header, .dark .ep-part-section, .dark .ep-back-btn { border-color: rgba(255,255,255,.1); }
.dark .ep-step-circle.pending { background-color: #21262d; color: #8b949e; border-color: rgba(255,255,255,.1); }
.dark .ep-step-lbl.pending { color: #8b949e; }
.dark .ep-step-line.empty { background-color: #21262d; }
.dark .ep-s1-heading, .dark .ep-subj-name, .dark .ep-hub-subj-name, .dark .ep-hub-title, .dark .ep-page-title, .dark .ep-faq-q-text, .dark .ep-paper-exam-title, .dark .ep-paper-meta-val, .dark .ep-part-title, .dark .ep-paper-qn-text { color: #c9d1d9; }
.dark .ep-s1-sub, .dark .ep-hub-subj-meta, .dark .ep-hub-desc, .dark .ep-faq-fi, .dark .ep-paper-instructions, .dark .ep-part-subtitle, .dark .ep-back-btn { color: #8b949e; }
.dark .ep-subj-count, .dark .ep-hub-meta-item, .dark .ep-faq-sb-head, .dark .ep-paper-school, .dark .ep-paper-meta-lbl, .dark .ep-paper-qn-marks { color: #8b949e; }
.dark .ep-faq-search-bar { border-color: rgba(255,255,255,.1); }
.dark .ep-faq-si { color: #c9d1d9; }
.dark .ep-faq-si::placeholder { color: #484f58; }
.dark .ep-faq-qonly-card { border-color: #30363d; }
.dark .ep-faq-qonly-card:hover { border-color: #8b5cf6; }
.dark .ep-paper-meta-row { background-color: #0d1117; border-color: #30363d; }
.dark .ep-paper-divider { background: linear-gradient(90deg,transparent,#30363d,transparent); }
.dark .ep-part-header { border-bottom-color: #30363d; }
.dark .ep-paper-questions .ep-paper-qn { border-bottom-color: #30363d; }
.dark .ep-paper-answer-space { border-bottom-color: #30363d; }
.dark .ep-nav { border-top-color: rgba(255,255,255,.1); }
.dark .ep-empty { color: #8b949e; }
.dark .bg-gray-50 { background-color: #161b22; }
.dark .border-gray-200 { border-color: #30363d; }
.dark .text-gray-400 { color: #8b949e; }
.dark .text-gray-500 { color: #8b949e; }
.dark .text-indigo-500 { color: #a5b4fc; }
.dark .bg-indigo-50 { background-color: rgba(99, 102, 241, 0.1); }
.dark .hover\:bg-indigo-100:hover { background-color: rgba(99, 102, 241, 0.2); }
.dark .text-indigo-600 { color: #818cf8; }
.dark .bg-indigo-100 { background-color: rgba(99, 102, 241, 0.15); }
.dark .text-indigo-700 { color: #a5b4fc; }
.dark .hover\:bg-indigo-200:hover { background-color: rgba(99, 102, 241, 0.25); }
.dark .text-indigo-400 { color: #a5b4fc; }

/* ── Hero ── */
.ep-hero{margin:20px 28px 0;border-radius:20px;padding:18px 28px;
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  position:relative;overflow:hidden;color:#fff;
  box-shadow:0 6px 24px rgba(99,102,241,.26);
  animation:heroIn .5s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes heroIn{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}
.ep-hero::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;
  border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none;}
.ep-hero::after{content:'';position:absolute;bottom:-50px;left:30%;width:150px;height:150px;
  border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none;}
.ep-hero-inner{position:relative;z-index:1;display:flex;align-items:center;
  justify-content:space-between;gap:14px;flex-wrap:wrap;}
.ep-hero-left{display:flex;align-items:center;gap:14px;}
.ep-hero-icon{width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.2);
  border:1.5px solid rgba(255,255,255,.3);display:flex;align-items:center;
  justify-content:center;flex-shrink:0;font-size:22px;}
.ep-hero-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;
  margin-bottom:5px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);
  font-size:10.5px;font-weight:700;color:#fff;}
.ep-hero-title{font-size:clamp(16px,2.2vw,22px);font-weight:800;color:#fff;
  margin-bottom:2px;letter-spacing:-.2px;line-height:1.2;}
.ep-hero-sub{font-size:12px;color:rgba(255,255,255,.68);line-height:1.4;}
.ep-hero-stats{display:flex;gap:8px;flex-shrink:0;}
.ep-hstat{text-align:center;padding:8px 14px;border-radius:12px;min-width:58px;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(8px);}
.ep-hstat-n{font-size:18px;font-weight:800;color:#fff;line-height:1;}
.ep-hstat-l{font-size:9.5px;color:rgba(255,255,255,.62);margin-top:1px;}

/* ── Body ── */
.ep-body{padding:20px 28px 60px;}

/* Steps */
.ep-steps-bar{display:flex;align-items:center;margin-bottom:24px;background:#fff;
  border-radius:16px;padding:16px 24px;border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 8px rgba(0,0,0,.04);}
.ep-step-item{display:flex;align-items:center;flex:1;}
.ep-step-node{display:flex;flex-direction:column;align-items:center;gap:5px;}
.ep-step-circle{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;transition:all .3s;}
.ep-step-circle.done{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
  box-shadow:0 3px 10px rgba(99,102,241,.35);cursor:pointer;}
.ep-step-circle.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
  box-shadow:0 3px 10px rgba(99,102,241,.35);outline:3px solid rgba(99,102,241,.2);outline-offset:2px;}
.ep-step-circle.pending{background:#f1f5f9;color:#94a3b8;border:1.5px solid rgba(0,0,0,.08);}
.ep-step-lbl{font-size:11px;font-weight:700;white-space:nowrap;}
.ep-step-lbl.done,.ep-step-lbl.active{color:#6366f1;}
.ep-step-lbl.pending{color:#94a3b8;}
.ep-step-line{flex:1;height:2px;margin:0 10px;margin-bottom:18px;transition:background .4s;}
.ep-step-line.filled{background:linear-gradient(90deg,#6366f1,#8b5cf6);}
.ep-step-line.empty{background:#f1f5f9;}

/* Subject Step */
.ep-s1-heading{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:6px;}
.ep-s1-sub{font-size:13px;color:#64748b;margin-bottom:20px;}
.ep-s1-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px;}
.ep-subj-card{border-radius:18px;padding:22px 14px;text-align:center;cursor:pointer;
  border:2px solid rgba(0,0,0,.06);transition:all .22s cubic-bezier(.34,1.56,.64,1);
  background:#fff;position:relative;overflow:hidden;}
.ep-subj-card:hover{transform:translateY(-5px);box-shadow:0 12px 30px rgba(0,0,0,.1);}
.ep-subj-card.sel{box-shadow:0 8px 28px rgba(99,102,241,.18);}
.ep-subj-emoji{font-size:34px;display:block;margin-bottom:10px;}
.ep-subj-name{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;}
.ep-subj-count{font-size:11px;color:#94a3b8;}
.ep-subj-check{position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;
  justify-content:center;box-shadow:0 2px 6px rgba(99,102,241,.4);}

/* Step 2 */
.ep-s2-grid{display:grid;grid-template-columns:1fr 320px;gap:16px;}

/* Hub */
.ep-hub-header{background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05);padding:18px 24px;margin-bottom:16px;
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.ep-hub-subj-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;
  justify-content:center;font-size:25px;flex-shrink:0;}
.ep-hub-subj-name{font-size:19px;font-weight:800;color:#0f172a;letter-spacing:-.2px;}
.ep-hub-subj-meta{font-size:12px;color:#64748b;margin-top:2px;}
.ep-unit-pills{display:flex;gap:5px;flex-wrap:wrap;}
.ep-unit-pill{padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700;
  background:rgba(99,102,241,.1);color:#6366f1;border:1px solid rgba(99,102,241,.15);}
.ep-hub-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;}
.ep-hub-card{background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05);overflow:hidden;
  transition:all .25s cubic-bezier(.4,0,.2,1);cursor:pointer;}
.ep-hub-card:hover:not(.disabled){transform:translateY(-5px);box-shadow:0 14px 36px rgba(0,0,0,.1);}
.ep-hub-card.disabled{opacity:.55;cursor:not-allowed;}
.ep-hub-banner{height:5px;}
.ep-hub-body{padding:20px 22px;}
.ep-hub-icon-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;}
.ep-hub-icon{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;
  justify-content:center;font-size:23px;}
.ep-hub-badge{font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;
  text-transform:uppercase;letter-spacing:.06em;}
.ep-hub-badge.blue{background:rgba(99,102,241,.12);color:#6366f1;}
.ep-hub-badge.green{background:rgba(16,185,129,.12);color:#059669;}
.ep-hub-badge.purple{background:rgba(139,92,246,.12);color:#7c3aed;}
.ep-hub-title{font-size:17px;font-weight:800;color:#0f172a;margin-bottom:7px;}
.ep-hub-desc{font-size:12.5px;color:#64748b;line-height:1.65;margin-bottom:13px;}
.ep-hub-meta{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;}
.ep-hub-meta-item{display:flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:#94a3b8;}
.ep-hub-meta-item b{color:#0f172a;font-weight:700;}
.ep-hub-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:11px;
  border:none;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;
  transition:all .2s;color:#fff;}
.ep-hub-btn.blue{background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 3px 10px rgba(99,102,241,.3);}
.ep-hub-btn.green{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 3px 10px rgba(16,185,129,.3);}
.ep-hub-btn:hover{transform:translateY(-1px);filter:brightness(1.08);}
.ep-hub-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
.ep-buddy-features{display:flex;flex-direction:column;gap:7px;margin-bottom:14px;}
.ep-buddy-feat{display:flex;align-items:center;gap:8px;font-size:12px;color:#94a3b8;}
.ep-buddy-dot{width:6px;height:6px;border-radius:50%;background:#8b5cf6;flex-shrink:0;}
.ep-buddy-locked-btn{width:100%;padding:10px;border-radius:11px;
  border:1.5px dashed rgba(139,92,246,.3);background:rgba(139,92,246,.06);
  font-family:inherit;font-size:13px;font-weight:700;color:#8b5cf6;
  cursor:not-allowed;display:flex;align-items:center;justify-content:center;gap:7px;}

/* Page top bar */
.ep-page-topbar{display:flex;align-items:center;justify-content:space-between;
  margin-bottom:20px;gap:12px;flex-wrap:wrap;}
.ep-back-btn{display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:12px;
  border:1.5px solid rgba(0,0,0,.08);background:#fff;font-family:inherit;font-size:13px;
  font-weight:700;color:#64748b;cursor:pointer;transition:all .18s;}
.ep-back-btn:hover{border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,.04);}
.ep-page-title-row{display:flex;align-items:center;gap:10px;}
.ep-page-icon{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;
  justify-content:center;font-size:19px;}
.ep-page-title{font-size:17px;font-weight:800;color:#0f172a;}

/* ── FAQ Questions Only ── */
.ep-faq-layout{display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:start;}
.ep-faq-sidebar{background:#fff;border-radius:18px;border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 10px rgba(0,0,0,.04);overflow:hidden;position:sticky;top:20px;}
.ep-faq-sb-head{padding:13px 16px;border-bottom:1px solid #f1f5f9;
  font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;}
.ep-faq-fi{display:flex;align-items:center;justify-content:space-between;
  padding:10px 16px;cursor:pointer;transition:background .15s;
  font-size:13px;font-weight:600;color:#64748b;}
.ep-faq-fi:hover{background:rgba(99,102,241,.05);color:#6366f1;}
.ep-faq-fi.on{background:rgba(99,102,241,.08);color:#6366f1;}
.ep-faq-fi-count{font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;
  background:rgba(99,102,241,.1);color:#6366f1;}
.ep-faq-search-bar{background:#fff;border-radius:13px;border:1px solid rgba(0,0,0,.06);
  padding:11px 15px;margin-bottom:10px;display:flex;align-items:center;gap:9px;
  box-shadow:0 1px 6px rgba(0,0,0,.04);}
.ep-faq-si{flex:1;border:none;background:transparent;font-family:inherit;
  font-size:13.5px;color:#0f172a;outline:none;}
.ep-faq-si::placeholder{color:#cbd5e1;}

/* FAQ question-only card */
.ep-faq-qonly-card{background:#fff;border-radius:15px;border:1.5px solid #f1f5f9;
  margin-bottom:8px;overflow:hidden;transition:all .18s;padding:14px 16px;
  display:flex;align-items:flex-start;gap:11px;}
.ep-faq-qonly-card:hover{border-color:#c7d2fe;box-shadow:0 4px 14px rgba(99,102,241,.08);}
.ep-faq-q-num{min-width:28px;height:28px;border-radius:8px;background:rgba(99,102,241,.1);
  color:#6366f1;font-size:11px;font-weight:800;display:flex;align-items:center;
  justify-content:center;flex-shrink:0;margin-top:1px;}
.ep-faq-q-body{flex:1;}
.ep-faq-q-text{font-size:13.5px;font-weight:700;color:#0f172a;line-height:1.5;margin-bottom:5px;}
.ep-faq-unit-tag{display:inline-flex;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;
  background:rgba(99,102,241,.08);color:#6366f1;}

/* ── Question Paper Format ── */
.ep-paper-wrapper{max-width:900px;margin:0 auto;}
.ep-paper-header{background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05);padding:24px 28px;margin-bottom:16px;
  text-align:center;position:relative;}
.ep-paper-school{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;
  letter-spacing:.1em;margin-bottom:6px;}
.ep-paper-exam-title{font-size:22px;font-weight:800;color:#0f172a;margin-bottom:4px;}
.ep-paper-subject{font-size:15px;font-weight:700;color:#6366f1;margin-bottom:14px;}
.ep-paper-meta-row{display:flex;justify-content:space-between;align-items:center;
  flex-wrap:wrap;gap:10px;padding:14px 20px;background:#f8fafc;border-radius:12px;
  border:1px solid #e2e8f0;}
.ep-paper-meta-item{display:flex;flex-direction:column;align-items:center;gap:2px;}
.ep-paper-meta-val{font-size:15px;font-weight:800;color:#0f172a;}
.ep-paper-meta-lbl{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;}
.ep-paper-divider{height:1px;background:linear-gradient(90deg,transparent,#e2e8f0,transparent);margin:16px 0;}
.ep-paper-instructions{font-size:11.5px;color:#64748b;line-height:1.7;text-align:left;
  padding:12px 16px;background:rgba(99,102,241,.04);border-radius:10px;
  border-left:3px solid #6366f1;}
.ep-paper-instructions strong{color:#0f172a;font-weight:700;}
.ep-paper-print-btn{position:absolute;top:16px;right:16px;display:flex;align-items:center;gap:6px;
  padding:7px 14px;border-radius:10px;border:1.5px solid rgba(99,102,241,.2);
  background:rgba(99,102,241,.06);font-family:inherit;font-size:12px;font-weight:700;
  color:#6366f1;cursor:pointer;transition:all .18s;}
.ep-paper-print-btn:hover{background:rgba(99,102,241,.12);}

/* Part sections */
.ep-part-section{background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.05);margin-bottom:16px;overflow:hidden;}
.ep-part-header{padding:14px 22px;display:flex;align-items:center;justify-content:space-between;
  gap:10px;border-bottom:1px solid #f1f5f9;}
.ep-part-left{display:flex;align-items:center;gap:12px;}
.ep-part-badge{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;
  justify-content:center;font-size:15px;font-weight:900;color:#fff;flex-shrink:0;}
.ep-part-title{font-size:15px;font-weight:800;color:#0f172a;}
.ep-part-subtitle{font-size:11.5px;color:#64748b;margin-top:1px;}
.ep-part-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ep-part-tag{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800;
  text-transform:uppercase;letter-spacing:.06em;}
.ep-part-count{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;
  background:rgba(0,0,0,.05);color:#64748b;}

/* Questions list in paper */
.ep-paper-questions{padding:8px 0;}
.ep-paper-qn{display:flex;align-items:flex-start;gap:12px;padding:14px 22px;
  border-bottom:1px dashed #f1f5f9;transition:background .15s;}
.ep-paper-qn:last-child{border-bottom:none;}
.ep-paper-qn:hover{background:rgba(99,102,241,.02);}
.ep-paper-qn-num{min-width:28px;height:28px;border-radius:8px;display:flex;align-items:center;
  justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;margin-top:2px;}
.ep-paper-qn-text{font-size:13.5px;font-weight:600;color:#0f172a;line-height:1.65;flex:1;}
.ep-paper-qn-unit{font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;
  white-space:nowrap;flex-shrink:0;margin-top:4px;}
.ep-paper-qn-marks{font-size:10.5px;font-weight:800;color:#94a3b8;white-space:nowrap;flex-shrink:0;margin-top:4px;}
.ep-paper-answer-space{margin:6px 0 0 40px;height:28px;border-bottom:1px solid #e2e8f0;opacity:.5;}

/* Part color themes */
.ep-part1 .ep-part-badge{background:linear-gradient(135deg,#6366f1,#8b5cf6);}
.ep-part1 .ep-part-tag{background:rgba(99,102,241,.1);color:#6366f1;}
.ep-part1 .ep-paper-qn-num{background:rgba(99,102,241,.1);color:#6366f1;}
.ep-part1 .ep-paper-qn-unit{background:rgba(99,102,241,.08);color:#6366f1;}
.ep-part2 .ep-part-badge{background:linear-gradient(135deg,#10b981,#059669);}
.ep-part2 .ep-part-tag{background:rgba(16,185,129,.1);color:#059669;}
.ep-part2 .ep-paper-qn-num{background:rgba(16,185,129,.1);color:#059669;}
.ep-part2 .ep-paper-qn-unit{background:rgba(16,185,129,.08);color:#059669;}
.ep-part3 .ep-part-badge{background:linear-gradient(135deg,#f59e0b,#d97706);}
.ep-part3 .ep-part-tag{background:rgba(245,158,11,.1);color:#d97706;}
.ep-part3 .ep-paper-qn-num{background:rgba(245,158,11,.1);color:#d97706;}
.ep-part3 .ep-paper-qn-unit{background:rgba(245,158,11,.08);color:#d97706;}
.ep-part4 .ep-part-badge{background:linear-gradient(135deg,#ef4444,#dc2626);}
.ep-part4 .ep-part-tag{background:rgba(239,68,68,.1);color:#dc2626;}
.ep-part4 .ep-paper-qn-num{background:rgba(239,68,68,.08);color:#dc2626;}
.ep-part4 .ep-paper-qn-unit{background:rgba(239,68,68,.07);color:#dc2626;}

/* Nav */
.ep-nav{display:flex;align-items:center;justify-content:space-between;
  margin-top:22px;padding-top:18px;border-top:1px solid rgba(0,0,0,.06);}
.ep-btn-prev,.ep-btn-next{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;
  border-radius:13px;border:none;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;transition:all .2s;}
.ep-btn-prev{background:#fff;color:#64748b;border:1.5px solid rgba(0,0,0,.08);}
.ep-btn-prev:hover{border-color:#6366f1;color:#6366f1;}
.ep-btn-next{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
  box-shadow:0 4px 14px rgba(99,102,241,.32);}
.ep-btn-next:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(99,102,241,.4);}
.ep-btn-next:disabled{opacity:.5;cursor:not-allowed;transform:none;}

/* No questions placeholder */
.ep-empty{text-align:center;padding:50px 20px;color:#94a3b8;font-size:13px;
  background:#fff;border-radius:18px;border:1px solid rgba(0,0,0,.06);}
.ep-empty-icon{font-size:36px;margin-bottom:10px;}

/* ── Responsive ── */
@media(max-width:1100px){
  .ep-hub-grid{grid-template-columns:1fr 1fr;}
  .ep-s1-grid{grid-template-columns:repeat(3,1fr);}
}
@media(max-width:900px){
  .ep-hero{margin:12px 16px 0;padding:14px 18px;}
  .ep-body{padding:12px 16px 56px;}
  .ep-hero-stats{display:none;}
  .ep-faq-layout{grid-template-columns:1fr;}
  .ep-faq-sidebar{position:static;margin-bottom:12px;}
  .ep-s2-grid{grid-template-columns:1fr;}
  .ep-paper-meta-row{gap:6px;}
}
@media(max-width:768px){
  .ep-hero{margin:10px 12px 0;padding:12px 16px;border-radius:16px;}
  .ep-hero-title{font-size:16px;}
  .ep-body{padding:10px 12px 56px;}
  .ep-s1-grid{grid-template-columns:repeat(2,1fr);}
  .ep-hub-grid{grid-template-columns:1fr;}
  .ep-step-lbl{display:none;}
  .ep-steps-bar{overflow-x:auto;scrollbar-width:none;padding:14px 16px;}
  .ep-paper-exam-title{font-size:18px;}
  .ep-paper-print-btn{position:static;margin-bottom:12px;}
  .ep-paper-header{text-align:center;}
  .ep-paper-qn{flex-wrap:wrap;gap:8px;}
  .ep-paper-qn-marks,.ep-paper-qn-unit{margin-top:0;}
}
@media(max-width:600px){
  .ep-hero{margin:10px 10px 0;padding:12px 14px;border-radius:14px;}
  .ep-body{padding:10px 10px 56px;}
  .ep-s1-grid{grid-template-columns:repeat(2,1fr);}
  .ep-nav{flex-direction:column;gap:8px;}
  .ep-btn-prev,.ep-btn-next{width:100%;justify-content:center;}
  .ep-paper-meta-row{flex-direction:column;align-items:flex-start;gap:10px;}
  .ep-part-header{flex-direction:column;align-items:flex-start;gap:8px;}
  .ep-paper-qn{padding:12px 14px;}
}
@media(max-width:480px){
  .ep-hero{margin:8px 8px 0;}
  .ep-body{padding:8px 8px 56px;}
  .ep-subj-emoji{font-size:28px;}
  .ep-subj-name{font-size:12px;}
  .ep-hub-grid{grid-template-columns:1fr;}
}

@media print{
  .ep-hero,.ep-steps-bar,.ep-page-topbar,.ep-paper-print-btn,.ep-nav,.ep-back-btn{display:none!important;}
  .ep-body{padding:0!important;}
  .ep-paper-section{box-shadow:none!important;border:1px solid #ddd!important;}
  .ep-paper-answer-space{border-bottom:1px solid #999!important;opacity:1!important;}
}
`;

// ── Data ──────────────────────────────────────────────────────────────────────
const SUBJECTS = [
  {
    name: "Mathematics",
    emoji: "🧮",
    color: "#6366f1",
    bg: "rgba(99,102,241,.1)",
    units: [
      "Algebra",
      "Calculus",
      "Statistics",
      "Geometry",
      "Trigonometry",
      "Number Theory",
    ],
  },
  {
    name: "Physics",
    emoji: "⚡",
    color: "#ec4899",
    bg: "rgba(236,72,153,.1)",
    units: [
      "Mechanics",
      "Thermodynamics",
      "Electromagnetism",
      "Optics",
      "Waves",
      "Modern Physics",
    ],
  },
  {
    name: "Chemistry",
    emoji: "🧪",
    color: "#10b981",
    bg: "rgba(16,185,129,.1)",
    units: [
      "Organic",
      "Inorganic",
      "Physical",
      "Analytical",
      "Biochemistry",
      "Polymer",
    ],
  },
  {
    name: "Biology",
    emoji: "🌿",
    color: "#f59e0b",
    bg: "rgba(245,158,11,.1)",
    units: [
      "Cell Biology",
      "Genetics",
      "Ecology",
      "Human Physiology",
      "Botany",
      "Zoology",
    ],
  },
  {
    name: "History",
    emoji: "🌍",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,.1)",
    units: [
      "Ancient",
      "Medieval",
      "Modern",
      "World Wars",
      "Independence",
      "Post-Independence",
    ],
  },
];

const FAQS_DATA: Record<string, { q: string; unit: string }[]> = {
  Mathematics: [
    { q: "What is the quadratic formula?", unit: "Algebra" },
    { q: "Explain the power rule in differentiation.", unit: "Calculus" },
    { q: "What is the fundamental theorem of calculus?", unit: "Calculus" },
    { q: "How do you calculate standard deviation?", unit: "Statistics" },
    { q: "State the Pythagorean theorem.", unit: "Geometry" },
    { q: "What is sin(30°)?", unit: "Trigonometry" },
    { q: "Explain the chain rule in differentiation.", unit: "Calculus" },
    { q: "What is a prime number? Give examples.", unit: "Number Theory" },
  ],
  Physics: [
    { q: "State Newton's second law of motion.", unit: "Mechanics" },
    {
      q: "What does the first law of thermodynamics state?",
      unit: "Thermodynamics",
    },
    { q: "State Ohm's law.", unit: "Electromagnetism" },
    { q: "What is total internal reflection?", unit: "Optics" },
    { q: "Define amplitude and frequency of a wave.", unit: "Waves" },
    { q: "What is the photoelectric effect?", unit: "Modern Physics" },
  ],
  Chemistry: [
    { q: "What is Avogadro's number?", unit: "Physical" },
    { q: "State Le Chatelier's principle.", unit: "Physical" },
    { q: "What is an electrophile?", unit: "Organic" },
    { q: "Explain ionic bonding with an example.", unit: "Inorganic" },
    { q: "What is chromatography used for?", unit: "Analytical" },
  ],
  Biology: [
    { q: "Describe the central dogma of molecular biology.", unit: "Genetics" },
    { q: "What is osmosis?", unit: "Cell Biology" },
    { q: "What is the role of mitochondria?", unit: "Cell Biology" },
    { q: "Explain the food chain concept.", unit: "Ecology" },
    { q: "What is transpiration in plants?", unit: "Botany" },
  ],
  History: [
    { q: "When did World War I begin and end?", unit: "World Wars" },
    { q: "What caused the French Revolution?", unit: "Modern" },
    { q: "When did India gain independence?", unit: "Independence" },
    { q: "Who was Ashoka and why is he important?", unit: "Ancient" },
    { q: "What was the significance of the Magna Carta?", unit: "Medieval" },
  ],
};

// Question paper data: 4 parts with different mark weights
const PAPER_DATA: Record<
  string,
  {
    part1: { q: string; unit: string }[];
    part2: { q: string; unit: string }[];
    part3: { q: string; unit: string }[];
    part4: { q: string; unit: string }[];
  }
> = {
  Mathematics: {
    part1: [
      { q: "What is the value of sin(90°)?", unit: "Trigonometry" },
      { q: "Simplify: (x²)(x³)", unit: "Algebra" },
      {
        q: "What is the area of a square with side 4 units?",
        unit: "Geometry",
      },
      { q: "Define 'mean' in statistics.", unit: "Statistics" },
      { q: "What is the derivative of a constant?", unit: "Calculus" },
      { q: "Is 17 a prime number? (Yes/No)", unit: "Number Theory" },
    ],
    part2: [
      { q: "Solve: 3x + 7 = 22. Find x.", unit: "Algebra" },
      { q: "Find the derivative of f(x) = 5x³ − 2x + 1.", unit: "Calculus" },
      {
        q: "Two angles of a triangle are 60° and 80°. Find the third angle.",
        unit: "Geometry",
      },
      { q: "If the mean of 5, 7, x is 8, find x.", unit: "Statistics" },
      { q: "Convert 135° to radians.", unit: "Trigonometry" },
    ],
    part3: [
      {
        q: "Solve the quadratic equation 2x² − 5x + 3 = 0 using the quadratic formula. Show all steps.",
        unit: "Algebra",
      },
      {
        q: "Find the area under the curve y = 3x² from x = 0 to x = 3 using definite integration.",
        unit: "Calculus",
      },
      {
        q: "Calculate the standard deviation of the data set: 4, 8, 6, 5, 3, 2, 8, 9, 2, 5.",
        unit: "Statistics",
      },
      {
        q: "Prove that sin²θ + cos²θ = 1 using a right-angled triangle.",
        unit: "Trigonometry",
      },
    ],
    part4: [
      {
        q: "A company's revenue (in ₹ lakhs) over 5 years is: 12, 18, 15, 22, 30. (a) Find the mean revenue. (b) Find the variance and standard deviation. (c) Interpret your results and predict the trend for year 6.",
        unit: "Statistics",
      },
      {
        q: "Derive the formula for the surface area and volume of a sphere of radius r. Using these formulas, find the total surface area and volume of a sphere whose diameter is 14 cm. (Use π = 22/7)",
        unit: "Geometry",
      },
    ],
  },
  Physics: {
    part1: [
      { q: "What is the SI unit of force?", unit: "Mechanics" },
      { q: "State one example of a conductor.", unit: "Electromagnetism" },
      { q: "What is the speed of light in vacuum (approx)?", unit: "Optics" },
      { q: "Define frequency of a wave.", unit: "Waves" },
      {
        q: "Name the scientist who proposed the photoelectric effect.",
        unit: "Modern Physics",
      },
      { q: "What is absolute zero temperature?", unit: "Thermodynamics" },
    ],
    part2: [
      {
        q: "A body of mass 10 kg is moving with a velocity of 5 m/s. Find its kinetic energy.",
        unit: "Mechanics",
      },
      {
        q: "State and explain Ohm's Law with a diagram.",
        unit: "Electromagnetism",
      },
      {
        q: "Define critical angle. What happens at angles greater than critical angle?",
        unit: "Optics",
      },
      {
        q: "Differentiate between transverse and longitudinal waves with examples.",
        unit: "Waves",
      },
      {
        q: "State the first law of thermodynamics and write its mathematical form.",
        unit: "Thermodynamics",
      },
    ],
    part3: [
      {
        q: "A ball is thrown vertically upward with an initial velocity of 20 m/s. Find (a) the maximum height reached, (b) the time to reach the maximum height, and (c) the total time of flight. (g = 10 m/s²)",
        unit: "Mechanics",
      },
      {
        q: "Three resistors of 2Ω, 3Ω, and 6Ω are connected in parallel. Find the equivalent resistance. If a 12V battery is connected across this combination, find the current through each resistor.",
        unit: "Electromagnetism",
      },
      {
        q: "Explain the phenomenon of total internal reflection with a neat diagram. Derive the expression for critical angle in terms of refractive indices.",
        unit: "Optics",
      },
      {
        q: "Explain the working principle of a heat engine. Define efficiency and derive the expression for Carnot efficiency.",
        unit: "Thermodynamics",
      },
    ],
    part4: [
      {
        q: "A charged particle of mass 2×10⁻²⁷ kg and charge 1.6×10⁻¹⁹ C is accelerated through a potential difference of 1000 V. It then enters a uniform magnetic field of 0.1 T perpendicular to its velocity. (a) Find the velocity of the particle after acceleration. (b) Find the radius of the circular path in the magnetic field. (c) Calculate the time period of revolution. (d) What happens to the radius if the particle is replaced by a heavier isotope?",
        unit: "Electromagnetism",
      },
      {
        q: "With a neat labelled diagram, explain the construction and working of a compound microscope. Derive the expression for its total magnification when the final image is formed at the near point (D = 25 cm). State any two differences between a microscope and a telescope.",
        unit: "Optics",
      },
    ],
  },
  Chemistry: {
    part1: [
      { q: "What is the molecular formula of water?", unit: "Inorganic" },
      {
        q: "State the number of particles in 1 mole of a substance.",
        unit: "Physical",
      },
      { q: "Is NaCl an ionic or covalent compound?", unit: "Inorganic" },
      { q: "Name the functional group present in alcohols.", unit: "Organic" },
      { q: "Define pH.", unit: "Analytical" },
      { q: "What is a monomer?", unit: "Polymer" },
    ],
    part2: [
      {
        q: "Calculate the number of moles in 36 g of water (M = 18 g/mol).",
        unit: "Physical",
      },
      {
        q: "State Le Chatelier's principle and give one example of its application.",
        unit: "Physical",
      },
      {
        q: "Differentiate between electrophile and nucleophile.",
        unit: "Organic",
      },
      {
        q: "What is paper chromatography? Mention one application.",
        unit: "Analytical",
      },
      { q: "Define addition polymerization with an example.", unit: "Polymer" },
    ],
    part3: [
      {
        q: "Explain the mechanism of SN1 reaction with a suitable example. Draw the energy profile diagram and identify the rate-determining step.",
        unit: "Organic",
      },
      {
        q: "State and explain Le Chatelier's principle. Apply it to the Haber process for synthesis of ammonia, explaining the effect of temperature, pressure, and concentration.",
        unit: "Physical",
      },
      {
        q: "Describe the principle and procedure of thin-layer chromatography (TLC). How is Rf value calculated and what does it indicate?",
        unit: "Analytical",
      },
      {
        q: "Explain ionic product of water (Kw). Derive the relationship between pH and pOH. Calculate the pH of a 0.01 M HCl solution.",
        unit: "Physical",
      },
    ],
    part4: [
      {
        q: "(a) Explain the concept of hybridization in carbon. Draw and describe the geometry of sp, sp², and sp³ hybridized carbon atoms with suitable examples. (b) Explain the structure of benzene using the concept of resonance. Why does benzene prefer electrophilic substitution over addition reactions? Give two examples of electrophilic substitution in benzene.",
        unit: "Organic",
      },
      {
        q: "Write a detailed note on coordination polymers: (a) Define coordination polymers and distinguish them from addition and condensation polymers. (b) Explain the mechanism of condensation polymerization with the synthesis of Nylon-6,6. (c) Discuss the properties and applications of Bakelite in industrial contexts. (d) What are biodegradable polymers? Give two examples and explain their significance.",
        unit: "Polymer",
      },
    ],
  },
  Biology: {
    part1: [
      { q: "What is the powerhouse of the cell?", unit: "Cell Biology" },
      {
        q: "Name the molecule that carries genetic information.",
        unit: "Genetics",
      },
      { q: "Define ecology.", unit: "Ecology" },
      { q: "What is the function of the heart?", unit: "Human Physiology" },
      { q: "Name one example of a gymnosperm plant.", unit: "Botany" },
      { q: "What is metamorphosis in insects?", unit: "Zoology" },
    ],
    part2: [
      { q: "Differentiate between mitosis and meiosis.", unit: "Genetics" },
      {
        q: "What is osmosis? How does it differ from diffusion?",
        unit: "Cell Biology",
      },
      {
        q: "Explain the concept of a food web with a simple example.",
        unit: "Ecology",
      },
      {
        q: "What is the role of haemoglobin in the blood?",
        unit: "Human Physiology",
      },
      {
        q: "Define transpiration. State its importance in plants.",
        unit: "Botany",
      },
    ],
    part3: [
      {
        q: "Explain the process of DNA replication with a neat diagram. Identify the key enzymes involved and describe the roles of each.",
        unit: "Genetics",
      },
      {
        q: "Describe the light-dependent and light-independent reactions of photosynthesis. Where in the chloroplast does each stage occur?",
        unit: "Botany",
      },
      {
        q: "Explain the mechanism of nerve impulse transmission across a synapse. Include the role of neurotransmitters.",
        unit: "Human Physiology",
      },
      {
        q: "Define ecological succession. Explain primary succession with an example from a bare rock ecosystem.",
        unit: "Ecology",
      },
    ],
    part4: [
      {
        q: "The human immune system is the body's defense against disease. (a) Distinguish between innate and adaptive immunity. (b) Explain the role of B-lymphocytes and T-lymphocytes in immune response. (c) Describe how vaccines stimulate immunity. (d) What is an autoimmune disease? Give two examples and explain the underlying mechanism.",
        unit: "Human Physiology",
      },
      {
        q: "Write a comprehensive account of Mendelian genetics: (a) State Mendel's Law of Segregation and Law of Independent Assortment. (b) Solve a dihybrid cross for seed color (yellow/green) and seed shape (round/wrinkled). (c) Explain codominance with the example of ABO blood group system. (d) What are sex-linked traits? Give one example and explain its inheritance pattern.",
        unit: "Genetics",
      },
    ],
  },
  History: {
    part1: [
      { q: "In which year did India gain independence?", unit: "Independence" },
      { q: "Who was the first Prime Minister of India?", unit: "Independence" },
      { q: "Name the treaty that ended World War I.", unit: "World Wars" },
      { q: "Which empire did Alexander the Great build?", unit: "Ancient" },
      { q: "What does 'Renaissance' mean?", unit: "Medieval" },
      {
        q: "In which year did the Berlin Wall fall?",
        unit: "Post-Independence",
      },
    ],
    part2: [
      { q: "What were the main causes of World War II?", unit: "World Wars" },
      {
        q: "Briefly explain the significance of the Magna Carta.",
        unit: "Medieval",
      },
      {
        q: "Who led the Non-Cooperation Movement in India? Describe its significance.",
        unit: "Independence",
      },
      {
        q: "What was the French Revolution? Mention its immediate causes.",
        unit: "Modern",
      },
      {
        q: "Explain the concept of the Cold War between the USA and USSR.",
        unit: "Post-Independence",
      },
    ],
    part3: [
      {
        q: "Explain the causes and consequences of the First World War. How did it reshape the political map of Europe? What role did the Treaty of Versailles play in sowing the seeds of World War II?",
        unit: "World Wars",
      },
      {
        q: "Trace the role of Mahatma Gandhi in India's independence movement. Discuss the Dandi March and its significance in the context of the Civil Disobedience Movement.",
        unit: "Independence",
      },
      {
        q: "Describe the major achievements of the Mauryan Empire under Emperor Ashoka. How did his conversion to Buddhism influence governance and foreign policy?",
        unit: "Ancient",
      },
      {
        q: "Explain the causes and outcomes of the French Revolution. How did the Declaration of the Rights of Man and Citizen reflect Enlightenment ideals?",
        unit: "Modern",
      },
    ],
    part4: [
      {
        q: "The Second World War (1939–1945) was one of the most devastating conflicts in human history. (a) Analyze the long-term and immediate causes of World War II, including the role of appeasement policy. (b) Describe the major turning points of the war — Battle of Stalingrad, D-Day, and the Pacific Theatre. (c) Critically evaluate the use of atomic bombs on Hiroshima and Nagasaki. Was it justified? (d) Explain how the war led to the formation of the United Nations and the beginning of the Cold War.",
        unit: "World Wars",
      },
      {
        q: "Indian civilization has evolved over thousands of years across distinct phases. (a) Describe the key features of the Indus Valley Civilization — urban planning, trade, and decline. (b) Explain the political and cultural achievements of the Gupta Empire — often called India's Golden Age. (c) Assess the impact of British colonial rule on India's economy, society, and political consciousness. (d) How did the partition of India in 1947 unfold, and what were its immediate and long-term consequences for the subcontinent?",
        unit: "Ancient",
      },
    ],
  },
};

const STEPS = [
  { id: 1, label: "Subject" },
  { id: 2, label: "Units" },
  { id: 3, label: "Prepare" },
  { id: 4, label: "Study" },
];

const PARTS = [
  {
    key: "part1",
    label: "Part A",
    marks: 1,
    desc: "Very Short Answer Questions",
    cls: "ep-part1",
    icon: "①",
  },
  {
    key: "part2",
    label: "Part B",
    marks: 2,
    desc: "Short Answer Questions",
    cls: "ep-part2",
    icon: "②",
  },
  {
    key: "part3",
    label: "Part C",
    marks: 5,
    desc: "Long Answer Questions",
    cls: "ep-part3",
    icon: "③",
  },
  {
    key: "part4",
    label: "Part D",
    marks: 10,
    desc: "Essay / Analytical Questions",
    cls: "ep-part4",
    icon: "④",
  },
];

export default function ExamPreparationPage() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"" | "faq" | "qbank">("");
  const [subjIdx, setSubjIdx] = useState(0);
  const [units, setUnits] = useState<string[]>(["Algebra", "Calculus"]);

  const [faqSearch, setFaqSearch] = useState("");
  const [faqFilter, setFaqFilter] = useState("All");
  const [currentRole, setCurrentRole] = useState("student");
  const [activePart, setActivePart] = useState("part1");

  const subj = SUBJECTS[subjIdx];

  useEffect(() => {
    setUnits([SUBJECTS[subjIdx].units[0], SUBJECTS[subjIdx].units[1]]);
    setFaqSearch("");
    setFaqFilter("All");
    setActivePart("part1");
  }, [subjIdx]);

  const toggleUnit = (u: string) =>
    setUnits((p) => (p.includes(u) ? p.filter((x) => x !== u) : [...p, u]));
  const allSel = units.length === subj.units.length;

  const allFaqs = FAQS_DATA[subj.name] || [];
  const unitFaqs =
    faqFilter === "All" ? allFaqs : allFaqs.filter((f) => f.unit === faqFilter);
  const displayFaqs = !faqSearch
    ? unitFaqs
    : unitFaqs.filter((f) =>
        f.q.toLowerCase().includes(faqSearch.toLowerCase()),
      );

  const paperData = PAPER_DATA[subj.name];

  // Filter paper questions by selected units
  const getFilteredPart = (partKey: string) => {
    const qs = (paperData as any)[partKey] as { q: string; unit: string }[];
    return units.length === 0
      ? qs
      : qs.filter((q) => units.includes(q.unit) || true);
    // showing all qs but filtering those where unit matches or no filter
  };

  const totalMarks = PARTS.reduce((acc, p) => {
    const qs = getFilteredPart(p.key);
    return acc + qs.length * p.marks;
  }, 0);

  const totalQs = PARTS.reduce(
    (acc, p) => acc + getFilteredPart(p.key).length,
    0,
  );

  const goBack = () => {
    if (mode) {
      setMode("");
      setStep(3);
    } else if (step > 1) setStep((s) => s - 1);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ep-root">
        {/* Hero */}
 <Navigation currentRole={currentRole} onRoleChange={setCurrentRole} />
             
        
        <div className="ep-hero">
          <div className="ep-hero-inner">
            <div className="ep-hero-left">
              <div className="ep-hero-icon">📚</div>
              <div>
                <div className="ep-hero-pill">🎓 Exam Preparation</div>
                <div className="ep-hero-title">Exam Preparation Centre</div>
                <div className="ep-hero-sub">
                  Step-by-step study — FAQs, question papers &amp; AI Buddy
                </div>
              </div>
            </div>
            <div className="ep-hero-stats">
              {[
                { n: "5", l: "Subjects" },
                { n: "35+", l: "FAQs" },
                { n: "4 Parts", l: "Question Paper" },
                { n: "AI", l: "Buddy Soon" },
              ].map((s, i) => (
                <div className="ep-hstat" key={i}>
                  <div className="ep-hstat-n">{s.n}</div>
                  <div className="ep-hstat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ep-body">
          {/* Step indicator */}
          {!mode && (
            <div className="ep-steps-bar">
              {STEPS.map((s, i) => {
                const state =
                  step > s.id ? "done" : step === s.id ? "active" : "pending";
                return (
                  <div key={s.id} className="ep-step-item">
                    <div className="ep-step-node">
                      <div
                        className={`ep-step-circle ${state}`}
                        onClick={() => {
                          if (state === "done") setStep(s.id);
                        }}
                      >
                        {state === "done" ? <Check size={14} /> : s.id}
                      </div>
                      <div className={`ep-step-lbl ${state}`}>{s.label}</div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`ep-step-line${state === "done" ? " filled" : " empty"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ── STEP 1: CHOOSE SUBJECT ── */}
            {!mode && step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="ep-s1-heading">Choose a Subject</div>
                <div className="ep-s1-sub">
                  Select the subject you want to prepare for your exam.
                </div>
                <div className="ep-s1-grid">
                  {SUBJECTS.map((s, i) => (
                    <motion.div
                      key={s.name}
                      className={`ep-subj-card${i === subjIdx ? " sel" : ""}`}
                      style={{
                        borderColor:
                          i === subjIdx ? s.color : "rgba(0,0,0,.06)",
                      }}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => setSubjIdx(i)}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: s.color,
                          borderRadius: "18px 18px 0 0",
                        }}
                      />
                      {i === subjIdx && (
                        <div className="ep-subj-check">
                          <Check size={11} color="#fff" />
                        </div>
                      )}
                      <span className="ep-subj-emoji">{s.emoji}</span>
                      <div className="ep-subj-name">{s.name}</div>
                      <div className="ep-subj-count">
                        {s.units.length} units
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="ep-nav">
                  <div />
                  <button className="ep-btn-next" onClick={() => setStep(2)}>
                    Next: Select Units <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: SELECT UNITS ── */}
            {!mode && step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="ep-s1-heading">
                  {subj.emoji} {subj.name} — Select Units
                </div>
                <div className="ep-s1-sub" style={{ marginBottom: 16 }}>
                  Pick the units you want to study. You can select one or
                  multiple.
                </div>
                <div className="ep-s2-grid">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md">
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                        📌 Units
                      </h2>
                      <button
                        onClick={() =>
                          setUnits(allSel ? [] : subj.units.slice())
                        }
                        className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900"
                      >
                        {allSel ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto pr-1">
                      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {subj.units.map((u) => {
                          const active = units.includes(u);
                          return (
                            <div
                              key={u}
                              onClick={() => toggleUnit(u)}
                              className={`relative p-3 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-2 min-h-[60px] ${
                                active
                                  ? "bg-indigo-500 text-white border-indigo-500"
                                  : "bg-gray-50 border-gray-200 hover:bg-indigo-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                              }`}
                            >
                              <div
                                className={`mt-[2px] w-4 h-4 flex items-center justify-center rounded ${active ? "bg-white/30" : "bg-black/5 dark:bg-white/10"}`}
                              >
                                {active && <Check size={12} />}
                              </div>
                              <span className={`text-xs md:text-sm font-medium break-words whitespace-normal leading-snug ${active ? '' : 'text-gray-800 dark:text-gray-200'}`}>
                                {u}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                        📋 Your Selection
                      </h2>
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg font-semibold dark:bg-indigo-900/50 dark:text-indigo-400">
                        {units.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ background: subj.bg }}
                      >
                        {subj.emoji}
                      </div>
                      <div>
                        <div className="font-semibold text-sm md:text-base text-gray-900 dark:text-gray-100">
                          {subj.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {units.length} of {subj.units.length} units selected
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      Selected Units
                    </div>
                    <div className="h-[160px] overflow-y-auto border dark:border-gray-600 rounded-xl p-2 bg-gray-50 dark:bg-gray-700">
                      {units.length === 0 ? (
                        <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
                          No units selected yet
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {units.map((u) => (
                            <div
                              key={u}
                              onClick={() => toggleUnit(u)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 text-xs md:text-sm font-medium break-words whitespace-normal max-w-full cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900 transition"
                            >
                              <span className="break-words whitespace-normal">
                                {u}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleUnit(u);
                                }}
                                className="ml-1 text-indigo-400 hover:text-red-500 dark:text-indigo-500 dark:hover:text-red-400"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {units.length > 0 && (
                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/50">
                        💡 Your question paper will include questions from{" "}
                        <span className="text-indigo-500 dark:text-indigo-400 font-semibold">
                          {units.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ep-nav">
                  <button className="ep-btn-prev" onClick={() => setStep(1)}>
                    <ArrowLeft size={15} /> Back
                  </button>
                  <button
                    className="ep-btn-next"
                    disabled={!units.length}
                    onClick={() => setStep(3)}
                  >
                    Start Preparation <Sparkles size={15} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: HUB ── */}
            {!mode && step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="ep-hub-header">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 13 }}
                  >
                    <div
                      className="ep-hub-subj-icon"
                      style={{ background: subj.bg }}
                    >
                      {subj.emoji}
                    </div>
                    <div>
                      <div className="ep-hub-subj-name">{subj.name}</div>
                      <div className="ep-hub-subj-meta">
                        {units.length} unit{units.length !== 1 ? "s" : ""}{" "}
                        selected
                      </div>
                    </div>
                  </div>
                  <div className="ep-unit-pills">
                    {units.slice(0, 4).map((u) => (
                      <span key={u} className="ep-unit-pill">
                        {u}
                      </span>
                    ))}
                    {units.length > 4 && (
                      <span className="ep-unit-pill">+{units.length - 4}</span>
                    )}
                  </div>
                </div>

                <div className="ep-hub-grid">
                  {/* FAQ card */}
                  <div
                    className="ep-hub-card"
                    onClick={() => {
                      setMode("faq");
                      setStep(4);
                    }}
                  >
                    <div
                      className="ep-hub-banner"
                      style={{
                        background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
                      }}
                    />
                    <div className="ep-hub-body">
                      <div className="ep-hub-icon-row">
                        <div
                          className="ep-hub-icon"
                          style={{ background: "rgba(99,102,241,.1)" }}
                        >
                          ❓
                        </div>
                        <span className="ep-hub-badge blue">
                          {(FAQS_DATA[subj.name] || []).length} Questions
                        </span>
                      </div>
                      <div className="ep-hub-title">FAQs & Notes</div>
                      <div className="ep-hub-desc">
                        Important questions for revision — browse by unit,
                        search by keyword. Perfect for quick exam-day reference.
                      </div>
                      <div className="ep-hub-meta">
                        <span className="ep-hub-meta-item">
                          <Clock size={12} />
                          <b>~5 min</b> review
                        </span>
                        <span className="ep-hub-meta-item">
                          <Star size={12} />
                          <b>{(FAQS_DATA[subj.name] || []).length}</b> questions
                        </span>
                      </div>
                      <button className="ep-hub-btn blue">
                        <BookOpen size={14} /> View Questions
                      </button>
                    </div>
                  </div>

                  {/* Question Paper card */}
                  <div
                    className="ep-hub-card"
                    onClick={() => {
                      setMode("qbank");
                      setStep(4);
                    }}
                  >
                    <div
                      className="ep-hub-banner"
                      style={{
                        background: "linear-gradient(90deg,#10b981,#059669)",
                      }}
                    />
                    <div className="ep-hub-body">
                      <div className="ep-hub-icon-row">
                        <div
                          className="ep-hub-icon"
                          style={{ background: "rgba(16,185,129,.1)" }}
                        >
                          📝
                        </div>
                        <span className="ep-hub-badge green">4 Parts</span>
                      </div>
                      <div className="ep-hub-title">Question Paper</div>
                      <div className="ep-hub-desc">
                        Full exam-format paper with 4 parts — 1 mark, 2 mark, 5
                        mark and 10 mark questions. No answers shown.
                      </div>
                      <div className="ep-hub-meta">
                        <span className="ep-hub-meta-item">
                          <Target size={12} />
                          <b>4 difficulty levels</b>
                        </span>
                        <span className="ep-hub-meta-item">
                          <TrendingUp size={12} />
                          <b>Exam format</b>
                        </span>
                      </div>
                      <button className="ep-hub-btn green">
                        <FileQuestion size={14} /> View Paper
                      </button>
                    </div>
                  </div>

                  {/* AI Buddy card */}
                  <div className="ep-hub-card disabled">
                    <div
                      className="ep-hub-banner"
                      style={{
                        background: "linear-gradient(90deg,#8b5cf6,#a78bfa)",
                      }}
                    />
                    <div className="ep-hub-body">
                      <div className="ep-hub-icon-row">
                        <div
                          className="ep-hub-icon"
                          style={{ background: "rgba(139,92,246,.1)" }}
                        >
                          🤖
                        </div>
                        <span className="ep-hub-badge purple">Coming Soon</span>
                      </div>
                      <div className="ep-hub-title">Exam Buddy AI</div>
                      <div className="ep-hub-desc">
                        Your personal AI tutor — ask questions, get step-by-step
                        explanations and adaptive practice.
                      </div>
                      <div className="ep-buddy-features">
                        {[
                          "Ask any concept question",
                          "Instant explanations",
                          "Adaptive practice",
                          "Exam strategy tips",
                        ].map((f) => (
                          <div key={f} className="ep-buddy-feat">
                            <div className="ep-buddy-dot" />
                            {f}
                          </div>
                        ))}
                      </div>
                      <button className="ep-buddy-locked-btn" disabled>
                        <Lock size={13} /> Coming Soon
                      </button>
                    </div>
                  </div>
                </div>

                <div className="ep-nav">
                  <button className="ep-btn-prev" onClick={() => setStep(2)}>
                    <ArrowLeft size={15} /> Change Units
                  </button>
                  <button
                    className="ep-btn-prev"
                    onClick={() => setStep(1)}
                    style={{ gap: 6 }}
                  >
                    <Home size={14} /> Start Over
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── FAQ: QUESTIONS ONLY ── */}
            {mode === "faq" && (
              <motion.div
                key="faq"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="ep-page-topbar">
                  <button className="ep-back-btn" onClick={goBack}>
                    <ArrowLeft size={14} /> Back to Prep Hub
                  </button>
                  <div className="ep-page-title-row">
                    <div
                      className="ep-page-icon"
                      style={{ background: "rgba(99,102,241,.1)" }}
                    >
                      ❓
                    </div>
                    <div className="ep-page-title">
                      {subj.emoji} {subj.name} — Important Questions
                    </div>
                  </div>
                </div>

                <div className="ep-faq-layout">
                  <div className="ep-faq-sidebar">
                    <div className="ep-faq-sb-head">Filter by Unit</div>
                    {["All", ...new Set(allFaqs.map((f) => f.unit))].map(
                      (u) => (
                        <div
                          key={u}
                          className={`ep-faq-fi${faqFilter === u ? " on" : ""}`}
                          onClick={() => {
                            setFaqFilter(u);
                          }}
                        >
                          <span>{u}</span>
                          <span className="ep-faq-fi-count">
                            {u === "All"
                              ? allFaqs.length
                              : allFaqs.filter((f) => f.unit === u).length}
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  <div>
                    <div className="ep-faq-search-bar">
                      <Search
                        size={15}
                        style={{ color: "#94a3b8", flexShrink: 0 }}
                      />
                      <input
                        className="ep-faq-si"
                        placeholder="Search questions…"
                        value={faqSearch}
                        onChange={(e) => setFaqSearch(e.target.value)}
                      />
                      {faqSearch && (
                        <button
                          onClick={() => setFaqSearch("")}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#94a3b8",
                            display: "flex",
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Info note */}
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "rgba(99,102,241,.05)",
                        borderRadius: 12,
                        border: "1px solid rgba(99,102,241,.12)",
                        marginBottom: 12,
                        fontSize: 12,
                        color: "#6366f1",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      📋 {displayFaqs.length} question
                      {displayFaqs.length !== 1 ? "s" : ""} listed — answers not
                      shown. Use these for self-testing.
                    </div>

                    {displayFaqs.length === 0 ? (
                      <div className="ep-empty">
                        <div className="ep-empty-icon">🔍</div>
                        No questions found. Try a different search or filter.
                      </div>
                    ) : (
                      displayFaqs.map((f, i) => (
                        <motion.div
                          key={i}
                          className="ep-faq-qonly-card"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <div className="ep-faq-q-num">Q{i + 1}</div>
                          <div className="ep-faq-q-body">
                            <div className="ep-faq-q-text">{f.q}</div>
                            <span className="ep-faq-unit-tag">{f.unit}</span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── QUESTION PAPER FORMAT ── */}
            {mode === "qbank" && (
              <motion.div
                key="qbank"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="ep-page-topbar">
                  <button className="ep-back-btn" onClick={goBack}>
                    <ArrowLeft size={14} /> Back to Prep Hub
                  </button>
                  <div className="ep-page-title-row">
                    <div
                      className="ep-page-icon"
                      style={{ background: "rgba(16,185,129,.1)" }}
                    >
                      📝
                    </div>
                    <div className="ep-page-title">
                      {subj.emoji} {subj.name} — Question Paper
                    </div>
                  </div>
                </div>

                <div className="ep-faq-layout">
                  {/* Sidebar for Parts */}
                  <div className="ep-faq-sidebar">
                    <div className="ep-faq-sb-head">Select Part</div>
                    {PARTS.map((part) => {
                      const qsCount = getFilteredPart(part.key).length;
                      if (qsCount === 0) return null;
                      return (
                        <div
                          key={part.key}
                          className={`ep-faq-fi${activePart === part.key ? " on" : ""}`}
                          onClick={() => setActivePart(part.key)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{part.icon}</span>
                            <span>{part.label}</span>
                          </div>
                          <span className="ep-faq-fi-count">{qsCount}</span>
                        </div>
                      );
                    })}
                    <div style={{ padding: "12px 16px", marginTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                      <button
                        className="ep-paper-print-btn"
                        style={{ position: "static", width: "100%", justifyContent: "center" }}
                        onClick={() => window.print()}
                      >
                        <Printer size={13} /> Print Paper
                      </button>
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div>
                    {PARTS.map((part) => {
                      if (part.key !== activePart) return null;
                      const qs = getFilteredPart(part.key);
                      if (qs.length === 0) return null;

                      return (
                        <div key={part.key} className="ep-paper-wrapper" style={{ margin: 0, maxWidth: "100%" }}>
                          <div className="ep-paper-header" style={{ marginBottom: 16 }}>
                            <div className="ep-paper-school">Model Question Paper</div>
                            <div className="ep-paper-exam-title">{subj.name}</div>
                            <div className="ep-paper-subject">{units.join(" · ")}</div>
                            <div className="ep-paper-meta-row">
                              <div className="ep-paper-meta-item">
                                <div className="ep-paper-meta-val">{qs.length}</div>
                                <div className="ep-paper-meta-lbl">Questions</div>
                              </div>
                              <div className="ep-paper-meta-item">
                                <div className="ep-paper-meta-val">{part.marks * qs.length}</div>
                                <div className="ep-paper-meta-lbl">Total Marks</div>
                              </div>
                              <div className="ep-paper-meta-item">
                                <div className="ep-paper-meta-val">{part.label}</div>
                                <div className="ep-paper-meta-lbl">Active Part</div>
                              </div>
                            </div>
                          </div>

                          <motion.div
                            className={`ep-part-section ${part.cls}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            style={{ background: "transparent", border: "none", boxShadow: "none" }}
                          >
                            <div className="ep-part-header" style={{ background: "#fff", borderRadius: 20, border: "1px solid rgba(0,0,0,.06)", boxShadow: "0 2px 12px rgba(0,0,0,.05)", marginBottom: 16 }}>
                              <div className="ep-part-left">
                                <div className="ep-part-badge">{part.icon}</div>
                                <div>
                                  <div className="ep-part-title">
                                    {part.label} — {part.desc}
                                  </div>
                                  <div className="ep-part-subtitle">
                                    Each question carries {part.marks} mark{part.marks > 1 ? "s" : ""}
                                  </div>
                                </div>
                              </div>
                              <div className="ep-part-right">
                                <span className="ep-part-tag">
                                  {part.marks} × {qs.length} = {part.marks * qs.length} marks
                                </span>
                              </div>
                            </div>

                            <div className="ep-paper-questions" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                              {qs.map((q, qi) => (
                                <motion.div
                                  key={qi}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: qi * 0.04 }}
                                  style={{
                                    display: "flex",
                                    gap: "12px",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  {/* Avatar / Number bubble */}
                                  <div style={{
                                    width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    background: "linear-gradient(135deg, rgba(99,102,241,.12), rgba(139,92,246,.12))",
                                    border: "1.5px solid rgba(99,102,241,.2)",
                                    color: "#6366f1", fontSize: 13, fontWeight: 800
                                  }}>
                                    {qi + 1}
                                  </div>
                                  
                                  {/* Question Bubble */}
                                  <div style={{
                                    background: "#fff",
                                    border: "1.5px solid #f1f5f9",
                                    color: "#0f172a",
                                    borderRadius: "4px 18px 18px 18px",
                                    boxShadow: "0 2px 8px rgba(0,0,0,.05)",
                                    padding: "14px 18px",
                                    flex: 1,
                                    position: "relative"
                                  }}>
                                    <div style={{ fontSize: "14.5px", fontWeight: 600, lineHeight: 1.6, marginBottom: 8 }}>
                                      {q.q}
                                    </div>
                                    <div style={{
                                      display: "flex", alignItems: "center", justifyContent: "space-between",
                                      paddingTop: 8, borderTop: "1px solid rgba(0,0,0,.05)", gap: 8
                                    }}>
                                      <div style={{ display: "flex", gap: 6 }}>
                                        <span style={{
                                          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 8,
                                          background: "rgba(16,185,129,.1)", color: "#059669"
                                        }}>
                                          {q.unit}
                                        </span>
                                        <span style={{
                                          fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 8,
                                          background: "rgba(245,158,11,.1)", color: "#d97706"
                                        }}>
                                          {part.marks} Marks
                                        </span>
                                      </div>
                                      <button style={{
                                        width: 26, height: 26, borderRadius: 8, border: "none",
                                        background: "rgba(0,0,0,.06)", cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: "#64748b", transition: "all .15s"
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = "rgba(99,102,241,.1)"; e.currentTarget.style.color = "#6366f1"; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = "rgba(0,0,0,.06)"; e.currentTarget.style.color = "#64748b"; }}>
                                        <span style={{ fontSize: 14 }}>✎</span>
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
