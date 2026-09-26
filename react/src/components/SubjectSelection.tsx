import React, { useState, useEffect } from "react";
import tamilSubject from "../assets/dashboard/subject-tamil.png";
import englishSubject from "../assets/dashboard/subject-english.png";
import scienceSubject from "../assets/dashboard/subject-science.png";
import socialSubject from "../assets/dashboard/subject-social.png";
import mathsSubject from "../assets/dashboard/subject-maths.png";
import studyRoboImg from "../assets/dashboard/study-robo.png";

/* ─── Types ─── */
interface Subject {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
  id: number;
  progress?: number;
  totalLessons?: number;
}

const SUBJECT_ART: Record<string, string> = {
  tamil: tamilSubject,
  english: englishSubject,
  science: scienceSubject,
  social: socialSubject,
  maths: mathsSubject,
  mathematics: mathsSubject,
};

function getSubjectArt(subject: string): string | undefined {
  const subjectKey = subject.toLowerCase().trim();
  return Object.entries(SUBJECT_ART).find(([key]) => subjectKey.includes(key))?.[1];
}

const SUBJECT_BACKGROUNDS = [
  "linear-gradient(135deg,#ffcf5a,#ff7b54)",
  "linear-gradient(135deg,#6ee7f2,#2389ff)",
  "linear-gradient(135deg,#83e76d,#27b86a)",
  "linear-gradient(135deg,#b48cff,#7e45e8)",
  "linear-gradient(135deg,#ff9f54,#ff5f99)",
];

interface SubjectSelectionProps {
  subjects: Subject[];
  onSelectSubject: (id: number) => void;
  isLoading?: boolean;
}

/* ─── CSS matching dashboard design system ─── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.ss-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--theme-text-main, #071235);
  background: radial-gradient(circle at 10% 6%,rgba(126,87,255,.12),transparent 25%), radial-gradient(circle at 90% 18%,rgba(255,171,64,.16),transparent 24%), linear-gradient(180deg,var(--theme-bg-app,#fbfcff),var(--theme-bg-elevated,#f5f7ff));
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  position: relative;
  isolation: isolate;
}
.ss-root::before,.ss-root::after { content:''; position:absolute; z-index:-1; border-radius:999px; pointer-events:none; animation:ssFloat 11s ease-in-out infinite alternate; }
.ss-root::before { width:250px; height:250px; left:-90px; top:280px; background:radial-gradient(circle,rgba(46,182,255,.18),transparent 68%); }
.ss-root::after { width:290px; height:290px; right:-110px; top:620px; background:radial-gradient(circle,rgba(255,95,153,.14),transparent 70%); animation-delay:-5s; }
@keyframes ssFloat { from { transform:translate3d(0,0,0) scale(1); } to { transform:translate3d(24px,28px,0) scale(1.08); } }
@keyframes ssHeroIn { from { opacity:0; transform:translateY(16px) scale(.98); } to { opacity:1; transform:none; } }
@keyframes ssShimmer { from { transform:translateX(-140%) rotate(18deg); } to { transform:translateX(260%) rotate(18deg); } }
@keyframes ssOrbit { from { transform:rotate(0deg) translateX(9px) rotate(0deg); } to { transform:rotate(360deg) translateX(9px) rotate(-360deg); } }
@keyframes ssArtFloat { 0%,100% { transform:translateY(0) rotate(-2deg); } 50% { transform:translateY(-8px) rotate(3deg); } }
@keyframes ssCardGlow { 0%,100% { opacity:.3; } 50% { opacity:.65; } }
.dark .ss-root, [data-theme="dark"] .ss-root { color:#f6f7ff; background:radial-gradient(circle at 10% 6%,rgba(126,87,255,.18),transparent 25%),radial-gradient(circle at 90% 18%,rgba(255,171,64,.14),transparent 24%),linear-gradient(180deg,#080d1f,#10172d); }
.dark .ss-root::before { background:radial-gradient(circle,rgba(46,182,255,.12),transparent 68%); }
.dark .ss-root::after { background:radial-gradient(circle,rgba(255,95,153,.1),transparent 70%); }
.dark .ss-hero { background:linear-gradient(135deg,#101b3f 0%,#123326 55%,#392a16 100%); border-color:rgba(110,231,183,.18); }
.dark .ss-search { background: rgba(0,0,0,.18); border-color: rgba(255,255,255,.15); }
.dark .ss-search:focus { background: rgba(0,0,0,.25); border-color: rgba(255,255,255,.3); }
.dark .ss-section-label { color: #64748b; }
.dark .ss-recent-card {
  background: #1e293b;
  border-color: rgba(255,255,255,.08);
  box-shadow: 0 2px 12px rgba(0,0,0,.3);
}
.dark .ss-recent-card:hover { border-color: rgba(99,102,241,.4); }
.dark .ss-recent-name { color: #f1f5f9; }
.dark .ss-recent-bar-bg { background: #334155; }
.dark .ss-recent-pct { color: #a5b4fc; }
.dark .ss-empty { background: #1e293b; border-color: #334155; }
.dark .ss-empty-title { color: #f1f5f9; }
.dark .ss-empty-sub { color: #94a3b8; }

/* ── HERO BANNER — matches dashboard hero ── */
.ss-hero {
  background: linear-gradient(135deg,#eef8ff 0%,#efffed 48%,#fff5d7 100%);
  padding: 28px 32px 34px;
  border-bottom:1px solid rgba(35,137,255,.14);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  animation:ssHeroIn .5s both;
  box-shadow:0 12px 28px rgba(35,57,116,.08);
}
.ss-hero::before {
  content: '';
  position: absolute; top: -60px; right: -60px;
  width: 260px; height: 260px; border-radius: 50%;
  background: rgba(255,255,255,.09);
}
.ss-hero::after {
  content: '';
  position: absolute; bottom: -80px; left: 25%;
  width: 200px; height: 200px; border-radius: 50%;
  background: rgba(255,178,29,.12);
  animation:ssShimmer 8s ease-in-out infinite;
}
.ss-hero-inner {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 16px;
}
.ss-hero-art { position:absolute; z-index:2; left:50%; bottom:-8px; width:clamp(100px,13vw,150px); transform:translateX(-50%); filter:drop-shadow(0 14px 16px rgba(7,18,53,.24)); pointer-events:none; }
.ss-hero-art img { display:block; width:100%; height:auto; }
.ss-hero-kicker { display:inline-flex; align-items:center; gap:7px; margin-bottom:8px; color:#14915d; font-size:10px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.ss-hero-kicker::before { content:''; width:8px; height:8px; border-radius:50%; background:#27b86a; box-shadow:0 0 0 5px rgba(39,184,106,.14); animation:ssCardGlow 2.4s ease-in-out infinite; }
.ss-hero-orbit { position:absolute; right:25%; bottom:-32px; width:112px; height:112px; border:1px dashed rgba(35,137,255,.2); border-radius:50%; animation:ssOrbit 14s linear infinite; pointer-events:none; }
.ss-hero-orbit::after { content:''; position:absolute; top:5px; left:50%; width:14px; height:14px; border-radius:50%; background:#ffb21d; box-shadow:0 0 0 7px rgba(255,178,29,.16); }
.ss-hero-left { display: flex; align-items: center; gap: 14px; }
.ss-hero-icon {
  width: 58px; height: 58px; border-radius: 19px;
  background: linear-gradient(145deg,#fff,#dff6ff);
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(35,137,255,.14);
  box-shadow:inset 0 -8px 0 rgba(35,137,255,.08),0 14px 22px rgba(38,57,116,.14);
  flex-shrink: 0;
}
.ss-hero-icon svg { width: 29px; height: 29px; color: #2389ff; }
.ss-hero-title {
  font-size: clamp(20px, 3vw, 28px); font-weight: 800;
  color: #071235; letter-spacing: 0; margin-bottom: 5px;
}
.ss-hero-sub { font-size: 13px; color: #68708a; font-weight:700; }

/* Search bar */
.ss-search-wrap {
  position: relative;
  width: 100%; max-width: 400px;
}
.ss-search-icon {
  position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
  width: 18px; height: 18px; color: rgba(255,255,255,.6);
  pointer-events: none;
}
.ss-search {
  width: 100%; height: 48px;
  background: rgba(255,255,255,.78);
  border: 1px solid rgba(15,23,42,.1);
  border-radius: 16px;
  padding: 0 44px 0 46px;
  font-size: 14px; font-weight: 500;
  color: #071235; font-family: inherit;
  outline: none;
  transition: all .2s;
}
.ss-search::placeholder { color: #8c94aa; }
.ss-search:focus {
  background: #fff;
  border-color: rgba(35,137,255,.5);
  box-shadow: 0 0 0 4px rgba(35,137,255,.12),0 10px 22px rgba(35,57,116,.1);
}
.ss-search-clear {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(255,255,255,.2); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; color: #fff;
  transition: background .15s;
}
.ss-search-clear:hover { background: rgba(255,255,255,.35); }
.ss-search-clear svg { width: 12px; height: 12px; }

/* ── BODY ── */
.ss-body {
  padding: 24px 32px 42px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}
.ss-dashboard-row { display:grid; grid-template-columns:1fr auto; align-items:center; gap:14px; margin-bottom:24px; animation:ssHeroIn .55s .06s both; }
.ss-dashboard-title { font-size:20px; font-weight:800; color:inherit; }
.ss-dashboard-copy { margin-top:4px; font-size:12px; font-weight:700; color:#68708a; }
.ss-dashboard-stats { display:flex; gap:9px; flex-wrap:wrap; justify-content:flex-end; }
.ss-stat { min-width:92px; padding:9px 11px; border:1px solid rgba(15,23,42,.1); border-radius:17px; background:rgba(255,255,255,.78); box-shadow:0 7px 18px rgba(35,44,87,.08); }
.ss-stat strong { display:block; font-size:17px; line-height:1; color:#071235; }
.ss-stat span { display:block; margin-top:4px; font-size:9px; font-weight:800; color:#68708a; }
.dark .ss-dashboard-copy,.dark .ss-section-label { color:#b5bfd8; }
.dark .ss-stat { background:rgba(23,31,58,.82); border-color:rgba(255,255,255,.12); }
.dark .ss-stat strong { color:#f6f7ff; }

/* Section label — matches dashboard style */
.ss-section-label {
  display: flex; align-items: center; gap: 7px;
  font-size: 10.5px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; color: #64748b;
  margin: 0 0 16px;
  color:#68708a;
}
.ss-section-label svg { width: 13px; height: 13px; }

/* ── RECENT CARDS ── */
.ss-recent-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}
.ss-recent-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  background: #fff; border-radius: 16px;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 2px 10px rgba(0,0,0,.05);
  cursor: pointer; transition: all .22s cubic-bezier(.4,0,.2,1);
  animation: cardIn .45s cubic-bezier(.34,1.56,.64,1) both;
}
.ss-recent-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 6px 24px rgba(99,102,241,.12);
  transform: translateY(-3px);
}
.ss-recent-card-left { display: flex; align-items: center; gap: 12px; overflow: hidden; }
.ss-recent-icon {
  width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.ss-recent-icon svg { width: 20px; height: 20px; }
.ss-recent-art { width: 30px; height: 30px; object-fit: contain; filter: drop-shadow(0 5px 6px rgba(0,0,0,.16)); animation:ssArtFloat 4.6s ease-in-out infinite; }
.ss-recent-name { font-size: 13.5px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ss-recent-progress { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.ss-recent-bar-bg { width: 48px; height: 4px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
.ss-recent-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg,#6366f1,#8b5cf6); }
.ss-recent-pct { font-size: 10px; font-weight: 700; color: #6366f1; }
.ss-recent-spark { flex-shrink: 0; opacity: 0; transition: opacity .2s; }
.ss-recent-card:hover .ss-recent-spark { opacity: 1; }
.ss-recent-spark svg { width: 15px; height: 15px; color: #8b5cf6; }

/* ── SUBJECT CARDS ── */
.ss-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}
.ss-card {
  position: relative;
  min-height: 218px;
  border-radius: 18px;
  padding: 12px;
  color: #071235;
  cursor: pointer;
  border: none;
  overflow: hidden;
  display: flex; flex-direction: column; gap: 8px;
  transition: all .35s cubic-bezier(.4,0,.2,1);
  animation: cardIn .5s cubic-bezier(.34,1.56,.64,1) both;
  text-align: left;
  box-shadow:0 10px 22px rgba(38,57,116,.12);
}
.ss-card:hover {
  transform: translateY(-5px) rotate(-.45deg);
  box-shadow: 0 18px 30px rgba(38,57,116,.18);
}
.ss-card:active { transform: scale(.97); }

/* Animated delays */
.ss-card:nth-child(1){animation-delay:.04s}
.ss-card:nth-child(2){animation-delay:.08s}
.ss-card:nth-child(3){animation-delay:.12s}
.ss-card:nth-child(4){animation-delay:.16s}
.ss-card:nth-child(5){animation-delay:.20s}
.ss-card:nth-child(6){animation-delay:.24s}
.ss-card:nth-child(7){animation-delay:.28s}
.ss-card:nth-child(8){animation-delay:.32s}

/* Glow orb inside card */
.ss-card-orb {
  display: none;
}
.ss-card:hover .ss-card-orb { transform: scale(1.6); background: rgba(255,255,255,.18); }

/* Card top row */
.ss-card-top { display: none; }
.ss-card-emoji { display: none; }
.ss-card:hover .ss-card-emoji { transform: rotate(10deg) scale(1.15); }
.ss-card-done {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,.22); border: 1px solid rgba(255,255,255,.35);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ss-card-done svg { width: 15px; height: 15px; }

/* Card bottom */
.ss-card-bottom { width: 100%; z-index: 1; }
.ss-card-name { font-size: 16px; font-weight: 800; margin-bottom: 7px; line-height: 1.2; }
.ss-card-bar-bg { width: 100%; height: 8px; background: rgba(7,18,53,.14); border-radius: 999px; overflow: hidden; margin-bottom: 0; }
.ss-card-bar-fill { height: 100%; border-radius: inherit; background: rgba(7,18,53,.82); transition: width .8s cubic-bezier(.4,0,.2,1); }
.ss-card-meta { display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; opacity: .85; }
.ss-card-visual { position: relative; z-index: 1; min-height: 112px; border-radius: 18px; display: grid; place-items: center; background: linear-gradient(145deg,rgba(255,255,255,.78),rgba(255,255,255,.28)); box-shadow: inset 0 -8px 0 rgba(0,0,0,.05); overflow: hidden; }
.ss-card-visual::before { content: ''; position: absolute; inset: auto -20px -36px auto; width: 92px; height: 92px; border-radius: 50%; background: rgba(255,255,255,.28); }
.ss-card-art { width: 110px; height: 100px; padding: 0; object-fit: contain; filter: drop-shadow(0 13px 14px rgba(0,0,0,.15)); }
.ss-card::after { content:''; position:absolute; left:16px; right:16px; bottom:14px; height:10px; border-radius:999px; pointer-events:none; }
.ss-card-bottom { position:relative; z-index:2; padding:9px; border-radius:14px; }
.ss-card-meta { letter-spacing:.03em; margin-top:7px; }
.ss-card::before { content:''; position:absolute; top:-50%; left:-35%; width:34%; height:220%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent); transform:rotate(18deg); opacity:0; transition:opacity .2s; }
.ss-card:hover::before { opacity:1; animation:ssShimmer 1.2s ease both; }
.ss-card-art { animation:ssArtFloat 4.6s ease-in-out infinite; }
.ss-card:nth-child(2) .ss-card-art { animation-delay:-1.2s; }
.ss-card:nth-child(3) .ss-card-art { animation-delay:-2.1s; }
.ss-card:nth-child(4) .ss-card-art { animation-delay:-.7s; }
.ss-card:first-child { grid-column:span 2; min-height:244px; }
.ss-card:first-child .ss-card-visual { flex:1; display:flex; justify-content:flex-start; padding-left:16%; }
.ss-card:first-child .ss-card-art { width:170px; height:145px; }
.ss-card:nth-child(4) { transform:translateY(10px); }
.ss-card:nth-child(4):hover { transform:translateY(5px) rotate(-.45deg); }

/* ── EMPTY STATE ── */
.ss-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 64px 32px;
  background: #fff; border-radius: 24px;
  border: 2px dashed #e0e7ff;
  animation: cardIn .3s ease both;
}
.ss-empty-icon { font-size: 64px; margin-bottom: 16px; }
.ss-empty-title { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
.ss-empty-sub   { font-size: 14px; color: #94a3b8; text-align: center; max-width: 320px; margin-bottom: 20px; }
.ss-empty-btn {
  padding: 10px 24px; background: linear-gradient(135deg,#6366f1,#8b5cf6);
  color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: all .2s;
  box-shadow: 0 4px 14px rgba(99,102,241,.35);
}
.ss-empty-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(99,102,241,.45); }

@keyframes cardIn {
  from { opacity:0; transform:translateY(14px); }
  to   { opacity:1; transform:translateY(0); }
}

/* ── RESPONSIVE ── */
@media (max-width: 1100px) {
  .ss-recent-grid { grid-template-columns: repeat(2, 1fr); }
  .ss-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .ss-dashboard-row { grid-template-columns:1fr; }
  .ss-dashboard-stats { justify-content:flex-start; }
}
@media (max-width: 768px) {
  .ss-hero { padding: 22px 20px 28px; }
  .ss-hero-inner { flex-direction: column; align-items: flex-start; }
  .ss-search-wrap { max-width: 100%; }
  .ss-body { padding: 20px 16px 32px; }
  .ss-dashboard-title { font-size:18px; }
  .ss-recent-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .ss-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .ss-card { min-height: 206px; padding: 12px; border-radius: 18px; }
  .ss-card-name { font-size: 15px; }
  .ss-card-art { width: 100px; height: 92px; }
  .ss-card:first-child { grid-column:span 2; min-height:224px; }
  .ss-card:first-child .ss-card-art { width:140px; height:120px; }
  .ss-card:nth-child(4) { transform:none; }
}
/* ── SKELETON LOADER ── */
.ss-skeleton-card {
  aspect-ratio: 4/3.6;
  border-radius: 22px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}
.dark .ss-skeleton-card {
  background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
  background-size: 200% 100%;
}
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.ss-skeleton-recent {
  height: 68px;
  border-radius: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}
.dark .ss-skeleton-recent {
  background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
}

@media (max-width: 480px) {
  .ss-recent-grid { grid-template-columns: 1fr; }
  .ss-grid { grid-template-columns: 1fr; gap: 10px; }
  .ss-card { min-height: 190px; padding: 12px; border-radius: 16px; }
  .ss-card-name { font-size: 13.5px; margin-bottom: 7px; }
  .ss-card-art { width: 92px; height: 84px; }
  .ss-card:first-child { grid-column:auto; min-height:206px; }
  .ss-card:first-child .ss-card-visual { padding-left:0; justify-content:center; }
  .ss-card:first-child .ss-card-art { width:110px; height:98px; }
  .ss-skeleton-card { aspect-ratio: 3/2.6; }
}

/* Compact command-bar variant */
.ss-hero { padding:16px 28px; background:linear-gradient(105deg,#122451 0%,#155b68 52%,#247d65 100%); border:0; border-radius:0 0 22px 22px; box-shadow:0 12px 26px rgba(7,18,53,.16); }
.ss-hero::before { top:-90px; right:9%; width:210px; height:210px; background:rgba(255,255,255,.08); }
.ss-hero::after { bottom:-110px; left:42%; width:170px; height:170px; background:rgba(255,178,29,.16); }
.ss-hero-inner { max-width:1280px; margin:0 auto; }
.ss-hero-left { gap:11px; }
.ss-hero-icon { width:44px; height:44px; border-radius:14px; box-shadow:inset 0 -6px 0 rgba(35,137,255,.08),0 9px 16px rgba(7,18,53,.2); }
.ss-hero-icon svg { width:22px; height:22px; }
.ss-hero-kicker { margin-bottom:3px; color:#9af0be; font-size:8px; }
.ss-hero-kicker::before { width:6px; height:6px; box-shadow:0 0 0 4px rgba(154,240,190,.14); }
.ss-hero-title { color:#fff; font-size:clamp(17px,2.2vw,23px); margin-bottom:2px; }
.ss-hero-sub { color:rgba(255,255,255,.7); font-size:11px; }
.ss-hero-orbit { right:29%; bottom:-44px; width:94px; height:94px; border-color:rgba(255,255,255,.2); }
.ss-search-wrap { max-width:310px; }
.ss-search { height:38px; border-radius:12px; padding-left:38px; font-size:12px; background:rgba(255,255,255,.14); border-color:rgba(255,255,255,.22); color:#fff; }
.ss-search::placeholder { color:rgba(255,255,255,.65); }
.ss-search:focus { background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.5); box-shadow:0 0 0 3px rgba(255,255,255,.1); }
.ss-search-icon { left:12px; color:rgba(255,255,255,.72); }
.ss-search-clear { right:10px; width:20px; height:20px; background:rgba(255,255,255,.18); }
.ss-body { padding:20px 28px 34px; }
.ss-dashboard-row { margin-bottom:18px; }
.ss-dashboard-title { font-size:17px; }
.ss-dashboard-copy { font-size:11px; }
.ss-stat { min-width:76px; padding:8px 10px; border-radius:14px; }
.ss-stat strong { font-size:15px; }
.ss-stat span { font-size:8px; }
.ss-grid { grid-template-columns:repeat(6,minmax(0,1fr)); gap:9px; }
.ss-card { min-height:178px; border-radius:15px; padding:10px; gap:6px; }
.ss-card:first-child { min-height:198px; }
.ss-card:first-child .ss-card-art { width:140px; height:120px; }
.ss-card-visual { min-height:92px; border-radius:14px; }
.ss-card-art { width:84px; height:78px; }
.ss-card-bottom { padding:7px; border-radius:11px; }
.ss-card-name { font-size:13px; margin-bottom:5px; }
.ss-card-bar-bg { height:6px; }
.ss-card-meta { font-size:8px; margin-top:5px; }
.ss-recent-grid { gap:10px; margin-bottom:22px; }
.ss-recent-card { padding:11px 12px; border-radius:13px; }
.ss-section-label { margin-bottom:11px; font-size:9px; }
.ss-empty { padding:42px 24px; border-radius:18px; }
@media (max-width:1100px) {
  .ss-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
}
@media (max-width:768px) {
  .ss-hero { padding:14px 16px 16px; border-radius:0 0 18px 18px; }
  .ss-hero-inner { gap:12px; }
  .ss-hero-orbit { display:none; }
  .ss-body { padding:16px 14px 28px; }
  .ss-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
  .ss-card { min-height:174px; }
  .ss-card:first-child { min-height:190px; }
  .ss-card:first-child .ss-card-art { width:124px; height:106px; }
  .ss-card-art { width:82px; height:74px; }
  .ss-search-wrap { max-width:none; }
}
@media (max-width:480px) {
  .ss-hero-left { align-items:flex-start; }
  .ss-hero-sub { max-width:190px; line-height:1.35; }
  .ss-dashboard-row { gap:10px; }
  .ss-dashboard-stats { width:100%; }
  .ss-stat { flex:1; }
  .ss-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .ss-card { min-height:166px; padding:9px; }
  .ss-card:first-child { grid-column:span 2; min-height:178px; }
  .ss-card:first-child .ss-card-visual { padding-left:0; justify-content:center; }
  .ss-card:first-child .ss-card-art { width:112px; height:94px; }
  .ss-card-art { width:74px; height:67px; }
  .ss-card-name { font-size:12px; }
  .ss-card-meta { font-size:7px; }
}

/* ── COMPACT MOSAIC CARD LAYOUT ── */
@keyframes ssCardReveal {
  0% { opacity:0; transform:translateY(24px) rotate(2deg) scale(.92); }
  70% { transform:translateY(-4px) rotate(-.5deg) scale(1.015); }
  100% { opacity:1; transform:none; }
}
@keyframes ssCardPulse {
  0%,100% { transform:scale(1); opacity:.36; }
  50% { transform:scale(1.18); opacity:.62; }
}
@keyframes ssCardSweep {
  0% { left:-80%; opacity:0; }
  18% { opacity:1; }
  55%,100% { left:125%; opacity:0; }
}
.ss-grid { grid-template-columns:repeat(5,minmax(0,1fr)); gap:14px; align-items:stretch; }
.ss-card {
  min-height:214px;
  padding:11px;
  border-radius:20px;
  gap:8px;
  animation:ssCardReveal .68s cubic-bezier(.2,.85,.25,1) both;
  isolation:isolate;
}
.ss-card:first-child { grid-column:auto; min-height:214px; }
.ss-card:first-child .ss-card-visual { padding-left:0; justify-content:center; }
.ss-card:first-child .ss-card-art { width:110px; height:98px; }
.ss-card-visual { order:1; flex:1; min-height:126px; border-radius:16px; transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s ease; }
.ss-card-name { order:2; margin:0 3px; font-size:14px; }
.ss-card-bottom { order:3; }
.ss-card-art { transition:transform .45s cubic-bezier(.2,.8,.2,1),filter .35s ease; }
.ss-card-orb { display:block; position:absolute; z-index:-1; width:100px; height:100px; top:-38px; right:-28px; border-radius:50%; background:rgba(255,255,255,.24); transition:transform .45s ease,background .35s ease; animation:ssCardPulse 4.5s ease-in-out infinite; }
.ss-card:nth-child(2n) .ss-card-orb { animation-delay:-1.5s; }
.ss-card:nth-child(3n) .ss-card-orb { animation-delay:-3s; }
.ss-card::before { animation:ssCardSweep 5.8s ease-in-out infinite; opacity:0; }
.ss-card:nth-child(2)::before { animation-delay:1s; }
.ss-card:nth-child(3)::before { animation-delay:2s; }
.ss-card:hover { transform:translateY(-8px) rotate(-1deg); }
.ss-card:hover .ss-card-visual { transform:translateY(-3px); box-shadow:inset 0 -8px 0 rgba(0,0,0,.04),0 10px 18px rgba(38,57,116,.13); }
.ss-card:hover .ss-card-art { transform:translateY(-7px) rotate(5deg) scale(1.08); filter:drop-shadow(0 17px 16px rgba(0,0,0,.2)); }
.ss-recent-card:hover .ss-recent-art { transform:translateY(-3px) rotate(6deg) scale(1.1); }
.ss-card:hover .ss-card-orb { transform:scale(1.55); background:rgba(255,255,255,.34); }
.ss-card:nth-child(4),.ss-card:nth-child(4):hover { transform:none; }
.ss-card:nth-child(4):hover { transform:translateY(-8px) rotate(-1deg); }
@media (max-width:1100px) { .ss-grid { grid-template-columns:repeat(4,minmax(0,1fr)); } }
@media (max-width:768px) {
  .ss-grid { grid-template-columns:repeat(3,minmax(0,1fr)); gap:11px; }
  .ss-card,.ss-card:first-child { min-height:200px; }
  .ss-card-visual { min-height:110px; }
  .ss-card-art,.ss-card:first-child .ss-card-art { width:86px; height:78px; }
}
@media (max-width:560px) {
  .ss-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .ss-card,.ss-card:first-child { min-height:184px; }
  .ss-card { padding:9px; border-radius:17px; }
  .ss-card-visual { min-height:98px; border-radius:14px; }
  .ss-card-name { font-size:12px; }
  .ss-card-art,.ss-card:first-child .ss-card-art { width:76px; height:68px; }
}
`;

/* ─── Icon helpers ─── */
const Svg = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const PATHS = {
  bot:     "M12 2a2 2 0 012 2v2h3a1 1 0 011 1v5a7 7 0 01-14 0V7a1 1 0 011-1h3V4a2 2 0 012-2zM8 11h.01M16 11h.01",
  search:  "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
  x:       "M18 6L6 18M6 6l12 12",
  clock:   "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  check:   "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
  spark:   "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3M6.343 6.343l-.707-.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
};

/* Gradient map for subject icons */
const ICON_GRAD: Record<string, { bg: string; color: string }> = {
  "bg-gradient-to-r from-blue-500 to-cyan-500":      { bg: "rgba(99,102,241,.12)",   color: "#6366f1" },
  "bg-gradient-to-r from-green-500 to-teal-500":     { bg: "rgba(16,185,129,.12)",   color: "#10b981" },
  "bg-gradient-to-r from-red-500 to-orange-500":     { bg: "rgba(239,68,68,.12)",    color: "#ef4444" },
  "bg-gradient-to-r from-emerald-500 to-green-500":  { bg: "rgba(16,185,129,.12)",   color: "#059669" },
  "bg-gradient-to-r from-indigo-500 to-purple-500":  { bg: "rgba(139,92,246,.12)",   color: "#8b5cf6" },
  "bg-gradient-to-r from-amber-500 to-yellow-500":   { bg: "rgba(245,158,11,.12)",   color: "#f59e0b" },
  "bg-gradient-to-r from-slate-500 to-gray-500":     { bg: "rgba(100,116,139,.12)",  color: "#64748b" },
  "bg-gradient-to-r from-purple-500 to-pink-500":    { bg: "rgba(168,85,247,.12)",   color: "#a855f7" },
};

export const SubjectSelection: React.FC<SubjectSelectionProps> = ({
  subjects: initialSubjects,
  onSelectSubject,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery]   = useState("");
  const [recentIds,   setRecentIds]     = useState<number[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("recent_subjects");
      if (saved) setRecentIds(JSON.parse(saved));
    } catch {}
  }, []);

  const handleSelect = (subject: Subject) => {
    const updated = [subject.id, ...recentIds.filter(id => id !== subject.id)].slice(0, 4);
    setRecentIds(updated);
    try { localStorage.setItem("recent_subjects", JSON.stringify(updated)); } catch {}
    onSelectSubject(subject.id);
  };

  const filtered = initialSubjects.filter(s =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const recents = initialSubjects.filter(s => recentIds.includes(s.id));

  return (
    <>
      <style>{css}</style>
      <div className="ss-root">

        {/* ── HERO ── */}
        <div className="ss-hero">
          <span className="ss-hero-orbit" aria-hidden />
          <div className="ss-hero-art" aria-hidden="true"><img src={studyRoboImg} alt="" /></div>
          <div className="ss-hero-inner">
            <div className="ss-hero-left">
              <div className="ss-hero-icon"><Svg d={PATHS.bot} size={26} /></div>
              <div>
                <div className="ss-hero-kicker">Learning studio</div>
                <div className="ss-hero-title">AI Tutor</div>
                <div className="ss-hero-sub">Select a subject to start your learning session</div>
              </div>
            </div>

            {/* Search */}
            <div className="ss-search-wrap">
              <span className="ss-search-icon"><Svg d={PATHS.search} size={18} /></span>
              <input
                className="ss-search"
                placeholder="Search subjects…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="ss-search-clear" onClick={() => setSearchQuery("")}>
                  <Svg d={PATHS.x} size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="ss-body">
          <div className="ss-dashboard-row">
            <div>
              <div className="ss-dashboard-title">Build your learning path</div>
              <div className="ss-dashboard-copy">Choose a subject and keep your daily momentum going.</div>
            </div>
            <div className="ss-dashboard-stats">
              <div className="ss-stat"><strong>{initialSubjects.length}</strong><span>Subjects</span></div>
              <div className="ss-stat"><strong>{recents.length}</strong><span>Recent</span></div>
              <div className="ss-stat"><strong>24/7</strong><span>AI Support</span></div>
            </div>
          </div>

          {/* Recent subjects */}
          {!searchQuery && recents.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div className="ss-section-label">
                <Svg d={PATHS.clock} size={13} />
                Jump Back In
              </div>
              <div className="ss-recent-grid">
                {recents.map(sub => {
                  const g = ICON_GRAD[sub.color] ?? { bg: "rgba(99,102,241,.1)", color: "#6366f1" };
                  return (
                    <button key={`r-${sub.id}`} className="ss-recent-card" onClick={() => handleSelect(sub)}>
                      <div className="ss-recent-card-left">
                        <div className="ss-recent-icon" style={{ background: g.bg }}>
                          {getSubjectArt(sub.label) ? (
                            <img src={getSubjectArt(sub.label)} alt="" className="ss-recent-art" aria-hidden />
                          ) : (
                            <sub.icon style={{ width: 20, height: 20, color: g.color }} />
                          )}
                        </div>
                        <div style={{ overflow: "hidden" }}>
                          <div className="ss-recent-name">{sub.label}</div>
                          <div className="ss-recent-progress">
                            <div className="ss-recent-bar-bg">
                              <div className="ss-recent-bar-fill" style={{ width: `${sub.progress ?? 0}%` }} />
                            </div>
                            <span className="ss-recent-pct">{sub.progress ?? 0}%</span>
                          </div>
                        </div>
                      </div>
                      <span className="ss-recent-spark"><Svg d={PATHS.spark} size={15} /></span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section header */}
          <h2 className="ss-section-label" style={{ marginBottom: 16 }}>
            {searchQuery
              ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} found`
              : "Subjects"}
          </h2>

          {/* Cards grid */}
          {isLoading ? (
            <div className="ss-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="ss-skeleton-card" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="ss-grid">
              {filtered.map((sub, index) => (
                <button
                  key={sub.id}
                  className={`ss-card ${sub.color}`}
                  style={{ background: SUBJECT_BACKGROUNDS[index % SUBJECT_BACKGROUNDS.length], animationDelay: `${index * 0.06}s` }}
                  onClick={() => handleSelect(sub)}
                  aria-label={`${sub.label} subject`}
                >
                  <div className="ss-card-orb" />

                  <div className="ss-card-name">{sub.label}</div>
                  <div className="ss-card-visual">
                    {getSubjectArt(sub.label) ? (
                      <img
                        src={getSubjectArt(sub.label)}
                        alt=""
                        className="ss-card-art"
                        aria-hidden
                      />
                    ) : (
                      <sub.icon style={{ width: 62, height: 62, color: "rgba(7,18,53,.75)" }} />
                    )}
                  </div>

                  <div className="ss-card-bottom">
                    <div className="ss-card-bar-bg">
                      <div className="ss-card-bar-fill" style={{ width: `${sub.progress ?? 0}%` }} />
                    </div>
                    <div className="ss-card-meta">
                      <span>{sub.progress ?? 0}% Ready</span>
                      <span>{sub.totalLessons ?? 0} Topics</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="ss-empty">
              <div className="ss-empty-icon">🔍</div>
              <div className="ss-empty-title">No subjects found</div>
              <p className="ss-empty-sub">
                We couldn't find anything for "<strong>{searchQuery}</strong>". Try a different keyword.
              </p>
              <button className="ss-empty-btn" onClick={() => setSearchQuery("")}>Clear Search</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SubjectSelection;
