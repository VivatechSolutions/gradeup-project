import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import focusGif from "../assets/dashboard/focus-gif.gif";
import learningIsland from "../assets/dashboard/07_floating_learning_island.png";
import tamilSubject from "../assets/dashboard/subject-tamil.png";
import englishSubject from "../assets/dashboard/subject-english.png";
import scienceSubject from "../assets/dashboard/subject-science.png";
import socialSubject from "../assets/dashboard/subject-social.png";
import mathsSubject from "../assets/dashboard/subject-maths.png";

interface TeacherStats {
  totalStudents?: number;
  coursesCreated?: number;
  pendingAssignments?: number;
  classAverage?: number;
  activeSessions?: number;
}

interface StudentRow {
  name: string;
  subject: string;
  score: number;
  grade: number;
}

type CSSVars = CSSProperties & Record<string, string>;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box}
.sd-root{min-height:100%;padding:16px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--sd-ink);background:radial-gradient(circle at 14% 9%,rgba(126,87,255,.12),transparent 26%),radial-gradient(circle at 88% 14%,rgba(255,171,64,.16),transparent 25%),linear-gradient(180deg,var(--sd-page),var(--sd-page-2));--sd-page:#fbfcff;--sd-page-2:#f5f7ff;--sd-card:#ffffff;--sd-card-soft:#f7faff;--sd-ink:#071235;--sd-muted:#68708a;--sd-faint:#8c94aa;--sd-line:rgba(15,23,42,.10);--sd-shadow:0 12px 30px rgba(35,44,87,.10);--sd-shadow-soft:0 7px 18px rgba(35,44,87,.08);position:relative;overflow:hidden}
[data-theme="dark"] .sd-root{--sd-page:#080d1f;--sd-page-2:#10172d;--sd-card:rgba(23,31,58,.92);--sd-card-soft:rgba(31,42,76,.72);--sd-ink:#f6f7ff;--sd-muted:#b5bfd8;--sd-faint:#7f8aa7;--sd-line:rgba(255,255,255,.12);--sd-shadow:0 20px 54px rgba(0,0,0,.36);--sd-shadow-soft:0 12px 30px rgba(0,0,0,.24)}
.sd-root::before,.sd-root::after{content:"";position:absolute;border-radius:999px;pointer-events:none;filter:blur(.2px);opacity:.55;animation:sdFloatBg 12s ease-in-out infinite alternate}.sd-root::before{width:250px;height:250px;left:-90px;top:80px;background:radial-gradient(circle,rgba(46,182,255,.18),transparent 68%)}.sd-root::after{width:290px;height:290px;right:-110px;top:360px;background:radial-gradient(circle,rgba(255,95,153,.14),transparent 70%);animation-delay:-5s}
@keyframes sdFloatBg{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(22px,28px,0) scale(1.08)}}
@keyframes sdCardIn{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}
@keyframes sdShine{0%{transform:translateX(-120%) rotate(18deg)}45%,100%{transform:translateX(220%) rotate(18deg)}}
@keyframes sdBreathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes sdPulseSoft{0%,100%{box-shadow:0 0 0 0 rgba(99,91,255,.22)}50%{box-shadow:0 0 0 8px rgba(99,91,255,0)}}
@keyframes sdDrift{0%,100%{transform:translate3d(0,0,0) rotate(0)}50%{transform:translate3d(18px,-14px,0) rotate(7deg)}}
@keyframes sdGlowMove{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes sdWiggle{0%,100%{transform:rotate(0) scale(1)}35%{transform:rotate(-2deg) scale(1.025)}70%{transform:rotate(2deg) scale(1.025)}}
@keyframes sdOrbit{from{transform:rotate(0deg) translateX(10px) rotate(0deg)}to{transform:rotate(360deg) translateX(10px) rotate(-360deg)}}
@keyframes sdPop3d{0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}50%{transform:translateY(-8px) rotate(4deg) scale(1.06)}}
@keyframes sdBgWave{0%,100%{transform:translate3d(-2%,0,0) rotate(0)}50%{transform:translate3d(2%,-2%,0) rotate(2deg)}}
@keyframes sdProgressSweep{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(220%) skewX(-20deg)}}

.sd-bg-spark{position:absolute;pointer-events:none;z-index:0;border-radius:999px;opacity:.48;animation:sdDrift 9s ease-in-out infinite}
.sd-bg-spark.s1{left:52%;top:78px;width:9px;height:9px;background:#ffb21d;box-shadow:34px 28px 0 #27b86a,76px -14px 0 #2389ff}
.sd-bg-spark.s2{right:8%;top:260px;width:7px;height:7px;background:#ff4d8d;box-shadow:-48px 46px 0 #7e45e8,-86px -18px 0 #00a7c8;animation-delay:-3s}
.sd-bg-spark.s3{left:7%;bottom:160px;width:8px;height:8px;background:#27b86a;box-shadow:42px -34px 0 #ff791f,92px 18px 0 #2389ff;animation-delay:-5s}
.sd-bg-ribbon{position:absolute;pointer-events:none;z-index:0;left:4%;right:4%;top:150px;height:170px;border-radius:50%;background:linear-gradient(90deg,rgba(35,137,255,.08),rgba(255,178,29,.10),rgba(39,184,106,.08));filter:blur(18px);opacity:.75;animation:sdBgWave 13s ease-in-out infinite}

.sd-shell{max-width:1160px;margin:0 auto;position:relative;z-index:1}
.sd-grid{display:grid;grid-template-columns:minmax(0,1fr) 272px;gap:16px;align-items:start}
.sd-main,.sd-rail{display:flex;flex-direction:column;gap:12px;min-width:0}

.sd-greeting{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin:0 2px}
.sd-title{font-size:20px;line-height:1.15;font-weight:800;letter-spacing:0;color:var(--sd-ink)}
.sd-subtitle{margin-top:6px;font-size:11.5px;font-weight:700;color:var(--sd-muted)}
.sd-mini-stats{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}
.sd-mini-pill{min-width:94px;border:1px solid var(--sd-line);background:rgba(255,255,255,.78);backdrop-filter:blur(14px);border-radius:18px;padding:8px 11px;display:flex;align-items:center;gap:8px;box-shadow:var(--sd-shadow-soft);animation:sdCardIn .42s both;transition:transform .18s,box-shadow .18s}
.sd-mini-pill:hover{transform:translateY(-3px);box-shadow:var(--sd-shadow)}
[data-theme="dark"] .sd-mini-pill{background:rgba(23,31,58,.82)}
.sd-pill-ico{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:17px;background:#fff4d6}
.sd-pill-num{font-size:15px;font-weight:800;line-height:1;color:var(--sd-ink)}
.sd-pill-label{font-size:9.5px;font-weight:800;color:var(--sd-muted)}

.sd-hero{position:relative;overflow:hidden;min-height:220px;padding:18px;border-radius:16px;gap:14px;display:grid;grid-template-columns:minmax(0,1fr) 218px;align-items:center;background:linear-gradient(118deg,#dff5ff 0%,#eef2ff 48%,#fff1d6 100%);border:1px solid rgba(35,137,255,.2);box-shadow:var(--sd-shadow);animation:sdCardIn .45s both}
.sd-hero::before{content:"";position:absolute;inset:-80px auto auto -80px;width:210px;height:210px;border-radius:50%;background:rgba(255,255,255,.45);animation:sdBreathe 5s ease-in-out infinite}
.sd-hero::after{content:"";position:absolute;top:-50px;bottom:-50px;width:70px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.36),transparent);animation:sdShine 7s ease-in-out infinite}
[data-theme="dark"] .sd-hero{background:linear-gradient(118deg,#102b43 0%,#20264f 52%,#49321c 100%);border-color:rgba(116,190,255,.24)}
.sd-hero-content{position:relative;z-index:2;max-width:460px}
.sd-chip{display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;color:#10734c}
[data-theme="dark"] .sd-chip{color:#7ee7b7}
.sd-lesson-title{font-size:clamp(22px,2.5vw,28px);line-height:1.15;font-weight:800;letter-spacing:0;margin:10px 0 7px;color:var(--sd-ink);display:flex;align-items:center;gap:10px}
.sd-lesson-title-art{width:46px;height:46px;flex:0 0 auto;object-fit:contain;padding:4px;border-radius:14px;background:rgba(255,255,255,.72);box-shadow:0 8px 14px rgba(38,57,116,.14);filter:drop-shadow(0 6px 8px rgba(38,57,116,.16));animation:sdPop3d 4.2s ease-in-out infinite}
.sd-lesson-meta{font-size:11.5px;font-weight:700;color:var(--sd-muted)}
.sd-progress-line{display:flex;align-items:center;gap:9px;margin:14px 0 12px;max-width:320px}
.sd-progress-track{height:7px;flex:1;border-radius:999px;background:rgba(12,98,59,.14);overflow:hidden}
.sd-progress-fill{height:100%;border-radius:inherit;background:#14915d;animation:sdPulseSoft 2.6s ease-in-out infinite}
.sd-progress-text{font-size:11px;font-weight:800;color:var(--sd-ink);white-space:nowrap}
.sd-primary-btn{border:0;border-radius:14px;padding:9px 15px;min-height:36px;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;font:800 11.5px/1 'Plus Jakarta Sans',system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 20px rgba(14,165,233,.28);transition:transform .18s,box-shadow .18s}
.sd-primary-btn:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 14px 26px rgba(14,165,233,.38)}

.sd-hero-panel{position:relative;z-index:2;min-height:184px;border-radius:16px;padding:12px;background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.72);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 18px 34px rgba(38,57,116,.13);overflow:hidden;display:flex;flex-direction:column;justify-content:space-between}
[data-theme="dark"] .sd-hero-panel{background:rgba(15,23,42,.34);border-color:rgba(255,255,255,.12)}
.sd-hero-panel::before{content:"";position:absolute;right:-34px;top:-34px;width:122px;height:122px;border-radius:50%;background:rgba(35,137,255,.16);animation:sdBreathe 5s ease-in-out infinite}
.sd-hero-panel::after{content:"";position:absolute;left:-38px;bottom:-48px;width:150px;height:150px;border-radius:50%;background:rgba(255,178,29,.18);animation:sdDrift 8s ease-in-out infinite}
.sd-hero-orbit{position:relative;z-index:1;width:88px;height:88px;border-radius:24px;display:grid;place-items:center;margin-left:auto;background:linear-gradient(145deg,#fff,#dff6ff);box-shadow:inset 0 -10px 0 rgba(35,137,255,.08),0 18px 26px rgba(38,57,116,.16);font-size:44px;animation:sdPop3d 4.1s ease-in-out infinite}
.sd-hero-orbit img{width:100%;height:100%;padding:8px;object-fit:contain;border-radius:inherit;filter:drop-shadow(0 10px 12px rgba(38,57,116,.18))}
.sd-hero-stats{position:relative;z-index:1;display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.sd-hero-stat{border-radius:11px;padding:8px;background:rgba(255,255,255,.72);border:1px solid rgba(15,23,42,.07)}
[data-theme="dark"] .sd-hero-stat{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.10)}
.sd-hero-stat b{display:block;font-size:16px;color:var(--sd-ink);line-height:1}
.sd-hero-stat span{display:block;margin-top:4px;font-size:9.5px;font-weight:800;color:var(--sd-muted)}

.sd-card{background:rgba(255,255,255,.86);backdrop-filter:blur(14px);border:1px solid var(--sd-line);border-radius:14px;box-shadow:var(--sd-shadow-soft);padding:12px;animation:sdCardIn .45s both;transition:transform .18s,box-shadow .18s,border-color .18s}
[data-theme="dark"] .sd-card{background:rgba(23,31,58,.88)}
.sd-card:hover{transform:translateY(-2px);box-shadow:var(--sd-shadow);border-color:rgba(14,165,233,.24)}

.sd-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
.sd-section-title,.sd-rail .sd-section-title{font-size:16px!important;font-weight:800;color:var(--sd-ink);letter-spacing:0;margin:0}
.sd-link{border:0;background:transparent;color:#0284c7;font-size:11px;font-weight:800;cursor:pointer;text-decoration:none}
[data-theme="dark"] .sd-link{color:#38bdf8}

.sd-snapshot-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:10px}
.sd-studio-card{min-height:126px;border:1px solid rgba(255,255,255,.24);border-radius:14px;padding:13px;text-align:left;cursor:pointer;color:#fff;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:linear-gradient(135deg,#132868,#1d57b8 52%,#0ea5e9);background-size:180% 180%;box-shadow:0 14px 26px rgba(14,165,233,.18);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s}
.sd-studio-card:hover{transform:translateY(-4px);box-shadow:0 18px 34px rgba(14,165,233,.28);animation:sdGlowMove 2.8s ease infinite}
[data-theme="dark"] .sd-studio-card{background:linear-gradient(135deg,rgba(19,40,104,.85),rgba(29,87,184,.75) 52%,rgba(14,165,233,.65));border-color:rgba(56,189,248,.25);box-shadow:0 16px 36px rgba(0,0,0,.45),0 0 24px -4px rgba(14,165,233,.25)}
.sd-studio-title{font-size:15px;font-weight:800;margin-bottom:7px;position:relative;z-index:1}
.sd-studio-text{font-size:11px;font-weight:700;line-height:1.45;max-width:220px;color:rgba(255,255,255,.86);position:relative;z-index:1}
.sd-studio-art{position:absolute;right:8px;bottom:0;width:96px;height:96px;object-fit:contain;filter:drop-shadow(0 14px 16px rgba(0,0,0,.28));animation:sdBreathe 4.5s ease-in-out infinite}

.sd-snapshot-stack{display:grid;gap:10px}
.sd-micro{border:1px solid var(--sd-line);border-radius:14px;background:var(--sd-card-soft);min-height:59px;padding:10px;gap:8px;display:flex;align-items:center;text-align:left;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif;transition:transform .18s,box-shadow .18s}
.sd-micro:hover{transform:translateY(-3px);box-shadow:var(--sd-shadow-soft)}
.sd-micro-ico{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;font-size:17px;background:var(--micro-bg);flex-shrink:0}
.sd-micro b{display:block;font-size:11.5px;color:var(--sd-ink)}
.sd-micro span{display:block;font-size:9.5px;font-weight:700;color:var(--sd-muted);margin-top:2px}

.sd-plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.sd-plan{border:1px solid var(--sd-line);background:var(--sd-card-soft);border-radius:14px;padding:10px;min-height:76px;position:relative;overflow:hidden;transition:transform .18s,box-shadow .18s;text-align:left;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
.sd-plan:hover{transform:translateY(-3px);box-shadow:var(--sd-shadow-soft)}
.sd-plan::after{content:"";position:absolute;right:-18px;bottom:-24px;width:72px;height:72px;border-radius:50%;background:var(--plan-glow,rgba(99,91,255,.12))}
.sd-plan-time{font-size:9.5px;font-weight:800;color:var(--sd-muted);text-transform:uppercase}
.sd-plan-title{font-size:12px;font-weight:800;color:var(--sd-ink);margin:5px 0 3px;position:relative;z-index:1}
.sd-plan-meta{font-size:10px;font-weight:700;color:var(--sd-muted);position:relative;z-index:1}

.sd-subject-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.sd-subject{min-height:190px;padding:10px;border-radius:14px;gap:6px;border:0;background:var(--subject-bg);display:flex;flex-direction:column;text-align:left;color:#071235;position:relative;overflow:hidden;box-shadow:0 10px 22px rgba(38,57,116,.12);cursor:pointer;transition:transform .2s,box-shadow .2s}
.sd-subject::before{content:"";position:absolute;inset:-40px -26px auto auto;width:116px;height:116px;border-radius:50%;background:rgba(255,255,255,.33)}
.sd-subject:hover{transform:translateY(-5px) rotate(-.45deg);box-shadow:0 18px 30px rgba(38,57,116,.18)}
.sd-subject-name{font-size:14px;font-weight:800;margin:0;position:relative;z-index:1}
.sd-subject-visual{position:relative;z-index:1;min-height:94px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.78),rgba(255,255,255,.28));box-shadow:inset 0 -8px 0 rgba(0,0,0,.05);overflow:hidden}
.sd-subject-visual::before{content:"";position:absolute;inset:auto -20px -36px auto;width:92px;height:92px;border-radius:50%;background:rgba(255,255,255,.28)}
.sd-subject-art-img{width:92px;height:84px;display:block;object-fit:contain;filter:drop-shadow(0 13px 14px rgba(0,0,0,.15));animation:sdPop3d 4.2s ease-in-out infinite;animation-delay:var(--delay,0s);z-index:1}
.sd-subject-footer{position:relative;z-index:1;margin-top:auto;padding:7px;border-radius:14px}
.sd-subject-progress{font-size:11px;font-weight:800;margin-bottom:5px}
.sd-subject-bar{height:7px;border-radius:999px;background:rgba(7,18,53,.14);overflow:hidden;position:relative}
.sd-subject-bar span{display:block;height:100%;border-radius:inherit;background:rgba(7,18,53,.82)}

.sd-play-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.sd-play{min-height:108px;border:1px solid rgba(255,255,255,.32);border-radius:14px;padding:11px;color:#fff;text-align:left;font-family:'Plus Jakarta Sans',system-ui,sans-serif;position:relative;overflow:hidden;cursor:pointer;box-shadow:0 9px 18px rgba(38,57,116,.12);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:transform .18s,box-shadow .18s;animation:sdCardIn .45s both;background-size:180% 180%!important}
.sd-play::before{content:"";position:absolute;inset:-40px auto auto -50px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.18);transition:transform .18s}
.sd-play:hover{transform:translateY(-4px) scale(1.018);box-shadow:0 15px 26px rgba(38,57,116,.18);animation:sdGlowMove 2.6s ease infinite}
.sd-play:hover::before{transform:scale(1.2)}
.sd-play h3{font-size:12px;font-weight:800;margin:0 0 4px;position:relative;z-index:1;max-width:118px}
.sd-play p{font-size:9.5px;font-weight:700;line-height:1.35;margin:0;max-width:112px;position:relative;z-index:1;color:rgba(255,255,255,.9)}
.sd-play-icon{position:absolute;right:10px;bottom:10px;width:50px;height:50px;border-radius:16px;display:grid;place-items:center;font-size:30px;background:linear-gradient(145deg,rgba(255,255,255,.82),rgba(255,255,255,.26));box-shadow:inset 0 -8px 0 rgba(0,0,0,.08),0 12px 18px rgba(0,0,0,.18);filter:drop-shadow(0 8px 10px rgba(0,0,0,.16));animation:sdPop3d 4.4s ease-in-out infinite;animation-delay:var(--delay,0s);z-index:1}
.sd-play:hover .sd-play-icon{animation:sdWiggle .65s ease both}
[data-theme="dark"] .sd-play{border-color:rgba(255,255,255,.16);box-shadow:0 12px 24px rgba(0,0,0,.35)}

.sd-skill-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.sd-skill{border:1px solid rgba(255,255,255,.62);background:var(--skill-card-bg);border-radius:17px;padding:12px;display:flex;align-items:center;gap:10px;min-height:82px;position:relative;overflow:hidden;box-shadow:0 10px 20px rgba(38,57,116,.10);transition:transform .2s,box-shadow .2s;text-align:left;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif;animation:sdCardIn .45s both}
.sd-skill::before{content:"";position:absolute;top:-48px;right:-28px;width:118px;height:118px;border-radius:50%;background:rgba(255,255,255,.26);transition:transform .3s}
.sd-skill:hover{transform:translateY(-5px) scale(1.015);box-shadow:0 17px 28px rgba(38,57,116,.17)}
.sd-skill-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;flex:0 0 auto;background:rgba(255,255,255,.78);font-size:21px;position:relative;z-index:1;box-shadow:0 8px 14px rgba(38,57,116,.12);animation:sdPop3d 4.2s ease-in-out infinite;animation-delay:var(--delay,0s)}
.sd-skill:hover .sd-skill-icon{animation:sdWiggle .65s ease both}
.sd-skill-name{font-size:12.5px;font-weight:800;color:#071235;position:relative;z-index:1}
.sd-skill-text{font-size:10.5px;font-weight:700;color:rgba(7,18,53,.68);margin-top:3px;position:relative;z-index:1}
.sd-skill-arrow{margin-left:auto;color:#071235;font-size:16px;font-weight:800;position:relative;z-index:1;transition:transform .2s}
.sd-skill:hover .sd-skill-arrow{transform:translateX(4px)}

.sd-journey{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;position:relative}
.sd-step{border:1px solid rgba(255,255,255,.62);background:var(--step-bg);border-radius:14px;padding:10px;display:flex;align-items:center;gap:8px;min-height:68px;position:relative;overflow:hidden;box-shadow:0 10px 20px rgba(38,57,116,.10);transition:transform .2s,box-shadow .2s;animation:sdCardIn .45s both;cursor:pointer}
.sd-step::before{content:"";position:absolute;inset:-34px -24px auto auto;width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,.27);transition:transform .3s}
.sd-step:hover{transform:translateY(-5px) rotate(-.7deg);box-shadow:0 17px 28px rgba(38,57,116,.17)}
.sd-step-num{width:28px;height:28px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.82);color:var(--step-color);font-weight:800;flex:0 0 auto;font-size:11px;box-shadow:0 7px 12px rgba(38,57,116,.12);position:relative;z-index:1;animation:sdPop3d 4s ease-in-out infinite;animation-delay:var(--delay,0s)}
.sd-step b{display:block;font-size:11px;color:#071235;position:relative;z-index:1}
.sd-step span{display:block;font-size:9px;font-weight:700;line-height:1.35;color:rgba(7,18,53,.68);position:relative;z-index:1}

.sd-rec-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.sd-rec{min-height:112px;border-radius:16px;border:1px solid var(--sd-line);background:linear-gradient(180deg,var(--sd-card),var(--sd-card-soft));padding:11px 66px 11px 11px;position:relative;overflow:hidden;text-align:left;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif;transition:transform .18s,box-shadow .18s}
.sd-rec:hover{transform:translateY(-3px);box-shadow:var(--sd-shadow-soft)}
.sd-rec::after{content:"";position:absolute;right:-28px;bottom:-34px;width:110px;height:110px;border-radius:50%;background:var(--rec-bg,rgba(99,91,255,.12));z-index:0}
.sd-rec-type{font-size:10px;font-weight:800;color:#0284c7;position:relative;z-index:1}
.sd-rec-title{font-size:11.5px;font-weight:800;color:var(--sd-ink);margin:5px 0;max-width:130px;position:relative;z-index:1}
.sd-rec-meta{font-size:10px;font-weight:700;color:var(--sd-muted);position:relative;z-index:1}
.sd-rec-art{position:absolute;right:12px;bottom:12px;width:48px;height:48px;border-radius:15px;display:grid;place-items:center;font-size:29px;background:linear-gradient(145deg,rgba(255,255,255,.92),rgba(255,255,255,.42));box-shadow:inset 0 -7px 0 rgba(0,0,0,.06),0 10px 16px rgba(30,41,59,.14);animation:sdPop3d 4s ease-in-out infinite;animation-delay:var(--delay,0s);z-index:1}

.sd-table{width:100%;border-collapse:collapse;margin-top:8px}
.sd-th{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--sd-muted);padding:8px 10px;text-align:left;border-bottom:1px solid var(--sd-line)}
.sd-tr{transition:background .15s,transform .15s;cursor:pointer}
.sd-tr:hover{background:var(--sd-card-soft);transform:translateX(2px)}
.sd-td{padding:9px 10px;font-size:12px;color:var(--sd-ink);border-bottom:1px solid var(--sd-line)}
.sd-tr:last-child .sd-td{border-bottom:0}
.sd-s-name{font-weight:800;color:var(--sd-ink)}
.sd-s-sub{font-size:10px;color:var(--sd-muted);margin-top:1px}
.score-pill{display:inline-block;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:800}
.sp-hi{background:rgba(39,184,106,.16);color:#10734c}
.sp-mid{background:rgba(255,178,29,.2);color:#b45309}
.sp-lo{background:rgba(255,77,141,.18);color:#be123c}
[data-theme="dark"] .sp-hi{background:rgba(16,185,129,.22);color:#6ee7b7}
[data-theme="dark"] .sp-mid{background:rgba(245,158,11,.22);color:#fcd34d}
[data-theme="dark"] .sp-lo{background:rgba(244,63,94,.22);color:#fda4af}
.sd-grade-bar{display:flex;align-items:center;gap:8px}
.sd-grade-bg{flex:1;height:6px;background:rgba(15,23,42,.08);border-radius:6px;overflow:hidden}
[data-theme="dark"] .sd-grade-bg{background:rgba(255,255,255,.1)}
.sd-grade-fill{height:100%;border-radius:6px;background:linear-gradient(90deg,#2389ff,#6349ff)}
.sd-manage-btn{padding:4px 10px;border-radius:8px;border:1px solid var(--sd-line);background:rgba(255,255,255,.6);font-size:10.5px;font-weight:700;color:var(--sd-ink);cursor:pointer;transition:all .15s}
.sd-manage-btn:hover{background:var(--sd-card);border-color:#2389ff;color:#2389ff}
[data-theme="dark"] .sd-manage-btn{background:rgba(255,255,255,.08);color:#f6f7ff}

/* Rail */
.sd-focus{position:relative;overflow:hidden;border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.86) 0%,rgba(255,244,236,.72) 45%,rgba(254,242,242,.78) 100%);border:1px solid rgba(255,255,255,.85);color:var(--sd-ink);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);box-shadow:0 14px 34px -10px rgba(255,107,74,.22),0 6px 18px rgba(35,44,87,.06),inset 0 1px 2px rgba(255,255,255,.9);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
[data-theme="dark"] .sd-focus{background:linear-gradient(145deg,rgba(32,24,48,.82) 0%,rgba(18,24,46,.75) 55%,rgba(14,20,38,.86) 100%);border:1px solid rgba(255,107,74,.28);color:#f8fafc;box-shadow:0 18px 44px -10px rgba(0,0,0,.65),0 0 28px -6px rgba(255,107,74,.24),inset 0 1px 1px rgba(255,255,255,.16)}
.sd-focus::before{content:"";position:absolute;right:-32px;top:-32px;width:124px;height:124px;border-radius:50%;background:radial-gradient(circle,rgba(255,107,74,.32),transparent 70%);filter:blur(8px);pointer-events:none}
[data-theme="dark"] .sd-focus::before{background:radial-gradient(circle,rgba(255,107,74,.42),transparent 70%)}
.sd-focus-title{font-size:12px;font-weight:900;letter-spacing:.04em;position:relative;z-index:1;color:#e05638;display:inline-flex;align-items:center;gap:6px}
[data-theme="dark"] .sd-focus-title{color:#ff8e72}
.sd-timer{font-size:44px;line-height:1;font-weight:900;margin:12px 0;letter-spacing:-.02em;position:relative;z-index:1;color:var(--sd-ink);font-variant-numeric:tabular-nums}
[data-theme="dark"] .sd-timer{color:#ffffff;text-shadow:0 0 28px rgba(255,120,80,.4)}
.sd-focus-mascot-img{height:106px;margin:0 auto 9px;display:block;object-fit:contain;filter:drop-shadow(0 16px 18px rgba(0,0,0,.3))}
.sd-focus-select{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:rgba(255,107,74,.10);border:1px solid rgba(255,107,74,.22);color:#e05638;padding:6px 10px;font-size:10px;font-weight:800;backdrop-filter:blur(8px);position:relative;z-index:1}
[data-theme="dark"] .sd-focus-select{background:rgba(255,107,74,.16);border-color:rgba(255,107,74,.32);color:#ffb39e}
.sd-focus-btn{width:100%;border:0;border-radius:16px;padding:11px;margin:10px 0;background:linear-gradient(135deg,#ff6b4a,#ff9436);color:#fff;font-weight:900;font-size:12px;cursor:pointer;position:relative;z-index:1;box-shadow:0 8px 20px -4px rgba(255,107,74,.42);transition:transform .18s ease,box-shadow .18s ease}
.sd-focus-btn:hover{transform:translateY(-2px);box-shadow:0 12px 26px -4px rgba(255,107,74,.55)}
.sd-focus-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;position:relative;z-index:1}
.sd-focus-slots button{border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:12px;color:var(--sd-ink);font-weight:800;padding:8px 5px;font-size:10px;cursor:pointer;transition:all .18s ease}
[data-theme="dark"] .sd-focus-slots button{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12);color:#e2e8f0}
.sd-focus-slots button.active{border-color:#ff6b4a;background:rgba(255,107,74,.14);color:#e05638;box-shadow:0 0 0 1px #ff6b4a inset,0 4px 12px rgba(255,107,74,.22)}
[data-theme="dark"] .sd-focus-slots button.active{border-color:#ff8e72;background:rgba(255,107,74,.22);color:#ffc4b3;box-shadow:0 0 0 1px #ff8e72 inset}

.sd-goal{display:flex;align-items:center;gap:9px;padding:10px 0;border-bottom:1px solid var(--sd-line)}
.sd-goal:last-child{border-bottom:0}
.sd-check{width:18px;height:18px;border-radius:6px;background:#2389ff;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800;flex:0 0 auto}
.sd-goal-body{flex:1;min-width:0}
.sd-goal-top{display:flex;justify-content:space-between;gap:10px;font-size:11px;font-weight:800;color:var(--sd-ink);margin-bottom:6px}
.sd-goal-track{height:6px;border-radius:999px;background:rgba(99,102,241,.15);overflow:hidden}
.sd-goal-track span{display:block;height:100%;border-radius:inherit;background:#6349ff}
.sd-encourage{text-align:center;color:#0ba464;font-size:12px;font-weight:800;margin-top:10px}

.sd-progress-card{background:linear-gradient(145deg,rgba(255,255,255,.92),rgba(239,247,255,.9));position:relative;overflow:hidden}
[data-theme="dark"] .sd-progress-card{background:linear-gradient(145deg,rgba(25,36,72,.94),rgba(18,27,53,.9))}
.sd-progress-card::before{content:"";position:absolute;right:-36px;top:-42px;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle,rgba(255,178,29,.28),transparent 68%);animation:sdBreathe 5s ease-in-out infinite}
.sd-progress-card::after{content:"";position:absolute;left:-42px;bottom:-58px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(35,137,255,.18),transparent 70%);animation:sdDrift 10s ease-in-out infinite}
.sd-progress-wrap{display:block;position:relative;z-index:1}
.sd-progress-overview{padding:6px 0 10px;position:relative;z-index:1}
.sd-progress-number{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px}
.sd-progress-number strong{font-size:27px;line-height:1;color:var(--sd-ink)}
.sd-progress-number span{font-size:9.5px;font-weight:800;color:var(--sd-muted)}
.sd-progress-meter{height:8px;border-radius:999px;background:rgba(35,137,255,.12);overflow:hidden;box-shadow:inset 0 1px 2px rgba(15,23,42,.08)}
.sd-progress-meter span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2389ff,#6349ff 72%,#ffb21d);position:relative}
.sd-progress-meter span::after{content:"";position:absolute;inset:0 auto 0 0;width:30%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);animation:sdProgressSweep 2.8s ease-in-out infinite}
.sd-progress-scale{display:flex;justify-content:space-between;gap:6px;margin-top:5px;font-size:8.5px;font-weight:700;color:var(--sd-faint)}
.sd-progress-scale b{color:var(--sd-ink)}
.sd-progress-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 8px;background:rgba(99,91,255,.11);color:#5548ff;font-size:10px;font-weight:800;margin-bottom:8px}
.sd-sub-list{display:flex;flex-direction:column;gap:8px}
.sd-sub-row{display:block;font-size:11px}
.sd-sub-row-top{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;font-weight:800;color:var(--sd-ink)}
.sd-sub-row-top span:first-child{display:flex;align-items:center;gap:6px;color:var(--sd-muted)}
.sd-sub-mini-track{height:5px;border-radius:999px;background:rgba(99,102,241,.12);overflow:hidden;position:relative}
.sd-sub-mini-track span{display:block;height:100%;border-radius:inherit}

.sd-streak-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;margin:4px 0 11px}
.sd-streak-num{font-size:18px;font-weight:800;color:var(--sd-ink)}
.sd-streak-label{font-size:9px;font-weight:800;color:var(--sd-muted)}
.sd-week{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center}
.sd-day{font-size:9px;font-weight:800;color:var(--sd-muted)}
.sd-day-dot{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;margin:5px auto 0;background:#14915d;color:#fff;font-size:10px;font-weight:800}
.sd-day-dot.pending{background:transparent;border:2px solid #9aa4bf;color:transparent}

.sd-tip-card{background:linear-gradient(135deg,#fff7df,#e8f5ff);position:relative;overflow:hidden;min-height:148px;padding-right:90px}
[data-theme="dark"] .sd-tip-card{background:linear-gradient(135deg,rgba(58,45,22,.82),rgba(22,35,63,.92))}
.sd-tip-card p{max-width:180px;font-size:11px;line-height:1.55;font-weight:700;color:var(--sd-ink);margin-top:8px;position:relative;z-index:1}
.sd-tip-art{position:absolute;right:14px;bottom:14px;width:62px;height:62px;border-radius:20px;display:grid;place-items:center;font-size:38px;background:linear-gradient(145deg,#fff,#ffe39a);box-shadow:inset 0 -9px 0 rgba(151,94,11,.12),0 14px 20px rgba(151,94,11,.16);animation:sdPop3d 4.4s ease-in-out infinite;z-index:1}

.sd-badge-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center}
.sd-badge{min-width:0}
.sd-badge-shape{width:48px;height:54px;margin:0 auto 6px;clip-path:polygon(50% 0,93% 20%,93% 72%,50% 100%,7% 72%,7% 20%);display:grid;place-items:center;color:#fff;font-size:22px;box-shadow:0 9px 18px rgba(0,0,0,.16)}
.sd-badge-name{font-size:9.5px;font-weight:800;color:var(--sd-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

@media(min-width:1181px){.sd-mini-stats{display:flex}}
@media(max-width:1280px){
  .sd-grid{grid-template-columns:1fr}
  .sd-rail{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  .sd-focus{grid-row:span 2}
  .sd-subject-grid,.sd-play-grid,.sd-rec-grid{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:1024px){
  .sd-root{padding:14px}
  .sd-greeting{align-items:flex-start;flex-direction:column}
  .sd-mini-stats{justify-content:flex-start}
  .sd-subject-grid,.sd-play-grid,.sd-rec-grid,.sd-plan-grid,.sd-skill-grid{grid-template-columns:repeat(2,1fr)}
  .sd-snapshot-grid{grid-template-columns:1fr}
  .sd-journey{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:760px){
  .sd-root{padding:10px}
  .sd-grid{grid-template-columns:1fr;gap:12px;margin-top:16px!important}
  .sd-rail{display:flex;flex-direction:column}
  .sd-hero{grid-template-columns:1fr;padding:16px;min-height:0}
  .sd-title{font-size:22px}
  .sd-action-row{grid-template-columns:repeat(2,1fr)}
  .sd-subject-grid,.sd-play-grid,.sd-rec-grid,.sd-journey,.sd-plan-grid,.sd-skill-grid,.sd-snapshot-grid{grid-template-columns:1fr}
  .sd-timer{font-size:42px}
  .sd-studio-art{width:82px;height:82px}
  .sd-tip-card{padding-right:72px}
  .sd-tip-art{width:52px;height:52px;font-size:32px}
}
`;

function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      setValue(Math.round((target * Math.min(frame, 42)) / 42));
      if (frame < 42) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{value}{suffix}</>;
}

const icon = {
  fire: "\u{1F525}", star: "\u{2B50}", gem: "\u{1F48E}", wave: "\u{1F44B}", party: "\u{1F389}",
  book: "\u{1F4D6}", bulb: "\u{1F4A1}", chat: "\u{1F4AC}", quiz: "\u{2753}", note: "\u{1F4DD}",
  flask: "\u{1F9EA}", calc: "\u{1F522}", english: "\u{1F4D6}", castle: "\u{1F3F0}", trophy: "\u{1F3C6}",
  game: "\u{1F3AE}", target: "\u{1F3AF}", board: "\u{1F3C5}", rainbow: "\u{1F308}", video: "\u{25B6}\u{FE0F}",
  rocket: "\u{1F680}", globe: "\u{1F30D}", pencil: "\u{270F}\u{FE0F}", check: "\u{2713}", leaf: "\u{1F331}",
  idea: "\u{1F4A1}", tamil: "\u{1F4DC}", atoms: "\u{269B}\u{FE0F}", map: "\u{1F5FA}\u{FE0F}", abacus: "\u{1F9EE}",
  dice: "\u{1F3B2}", medal: "\u{1F947}", film: "\u{1F3AC}", tools: "\u{1F6E0}\u{FE0F}", compass: "\u{1F9ED}",
  water: "\u{1F4A7}", teacher: "\u{1F469}\u{200D}\u{1F3EB}", graduation: "\u{1F393}", bell: "\u{1F514}",
  calendar: "\u{1F4C5}", clipboard: "\u{1F4CB}", megaphone: "\u{1F4E2}", chart: "\u{1F4CA}", clock: "\u{23F0}",
  users: "\u{1F465}", spark: "\u{2728}", folder: "\u{1F4C1}", upload: "\u{1F4E4}",
};

const SUBJECT_PALETTE = ["#2389ff", "#27b86a", "#7e45e8", "#ff791f", "#00a7c8", "#ff4d8d"];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusRemaining, setFocusRemaining] = useState(25 * 60);
  const [focusActive, setFocusActive] = useState(false);

  const { data: stats, isLoading } = useQuery<TeacherStats>({
    queryKey: ["/api/teacher/stats"],
  });

  const totalStudents = stats?.totalStudents ?? 85;
  const coursesCreated = stats?.coursesCreated ?? 6;
  const pendingAssignments = stats?.pendingAssignments ?? 12;
  const classAverage = stats?.classAverage ?? 82;

  const teacherName = user?.lastName
    ? `Prof. ${user.lastName}`
    : (user?.firstName ? `Prof. ${user.firstName}` : "Professor");

  useEffect(() => {
    if (!focusActive) return;
    const timer = window.setInterval(() => {
      setFocusRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setFocusActive(false);
          return focusMinutes * 60;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusActive, focusMinutes]);

  const setFocusLength = (minutes: number) => {
    setFocusMinutes(minutes);
    setFocusRemaining(minutes * 60);
    setFocusActive(false);
  };

  const focusLabel = `${String(Math.floor(focusRemaining / 60)).padStart(2, "0")}:${String(focusRemaining % 60).padStart(2, "0")}`;

  const goals = [
    { label: "Review 12 assignments", value: 8, total: 12, color: "#635bff" },
    { label: "Publish Chapter 6 slides", value: 1, total: 1, color: "#12a66a" },
    { label: "Take class attendance", value: 1, total: 1, color: "#7e45e8" },
  ];

  const playCards = [
    { title: "AI Content Studio", text: "Create with advanced NLP", icon: icon.spark, bg: "linear-gradient(135deg,#8a4fff,#cf4bd8)", action: () => setLocation("/enhanced-content-manager") },
    { title: "Assignments", text: "Design homework & tests", icon: icon.note, bg: "linear-gradient(135deg,#ff9c1a,#ff6c00)", action: () => setLocation("/teacher/homework") },
    { title: "Student Analytics", text: "Track grades & progress", icon: icon.chart, bg: "linear-gradient(135deg,#2eb6ff,#2676e8)", action: () => setLocation("/analytics") },
    { title: "Curriculum Planner", text: "Plan lessons & syllabus", icon: icon.compass, bg: "linear-gradient(135deg,#40c95f,#11a48c)", action: () => setLocation("/teacher/curriculum-planner") },
    { title: "Class Attendance", text: "Daily student register", icon: icon.clipboard, bg: "linear-gradient(135deg,#ff5f99,#ff9f54)", action: () => setLocation("/teacher/attendance") },
    { title: "PDF Processing", text: "Upload & analyse documents", icon: icon.book, bg: "linear-gradient(135deg,#00b9b4,#00a7e8)", action: () => setLocation("/teacher/pdf-upload") },
    { title: "Exam Correction", text: "Grade student submissions", icon: icon.pencil, bg: "linear-gradient(135deg,#3b82f6,#6366f1)", action: () => setLocation("/teacher/exam-correction") },
    { title: "Debates & Seminars", text: "Launch collaborative rooms", icon: icon.video, bg: "linear-gradient(135deg,#ff6578,#ff563c)", action: () => setLocation("/teacher/debates") },
  ];

  const recs = [
    { type: "Top Performer", title: "Sarah Chen", meta: "98% in Advanced Maths", icon: icon.trophy, bg: "rgba(35,137,255,.15)", href: "/students" },
    { type: "Highest Activity", title: "James Kim", meta: "92% in Physics", icon: icon.fire, bg: "rgba(39,184,106,.16)", href: "/students" },
    { type: "Needs Review", title: "Tom Rivera", meta: "73% Calculus Support", icon: icon.bulb, bg: "rgba(255,188,31,.18)", href: "/students" },
    { type: "Lab Report", title: "Priya Patel", meta: "87% in Chemistry", icon: icon.flask, bg: "rgba(126,69,232,.14)", href: "/students" },
  ];

  const plans = [
    { time: "09:30 AM", title: "Advanced Mathematics", meta: "Grade 12 · Calculus & Vectors", color: "rgba(39,184,106,.18)" },
    { time: "11:15 AM", title: "Physics Fundamentals", meta: "Grade 11 · Mechanics & Waves", color: "rgba(35,137,255,.18)" },
    { time: "02:00 PM", title: "Faculty Curriculum Sync", meta: "Staff Room · Term 2 Planning", color: "rgba(255,121,31,.18)" },
  ];

  const skills = [
    { icon: icon.quiz, name: "Quiz Generator", text: "10 instant questions", bg: "linear-gradient(135deg,#8be7ff,#4f9bff)", href: "/studio/quiz" },
    { icon: icon.abacus, name: "Question Bank", text: "250+ curated items", bg: "linear-gradient(135deg,#ffe07b,#ff9f54)", href: "/studio/question-bank" },
    { icon: icon.bulb, name: "AI Lesson Assistant", text: "Explain tough topics", bg: "linear-gradient(135deg,#ff9fc5,#e86b9f)", href: "/ai-tutor" },
  ];

  const microWins = [
    { icon: icon.note, title: "Pending Reviews", text: `${pendingAssignments} assignments awaiting review`, bg: "rgba(255,95,153,.15)", href: "/teacher/homework" },
    { icon: icon.rocket, title: "Curriculum Planner", text: "Draft next week's syllabus", bg: "rgba(39,184,106,.16)", href: "/teacher/curriculum-planner" },
  ];

  const subjectCards = [
    { name: "Tamil", image: tamilSubject, progress: 78, students: 28, bg: "linear-gradient(135deg,#ffcf5a,#ff7b54)" },
    { name: "English", image: englishSubject, progress: 82, students: 30, bg: "linear-gradient(135deg,#6ee7f2,#2389ff)" },
    { name: "Science", image: scienceSubject, progress: 76, students: 28, bg: "linear-gradient(135deg,#83e76d,#27b86a)" },
    { name: "Social", image: socialSubject, progress: 70, students: 26, bg: "linear-gradient(135deg,#b48cff,#7e45e8)" },
    { name: "Maths", image: mathsSubject, progress: 94, students: 32, bg: "linear-gradient(135deg,#ff9f54,#ff5f99)" },
  ];

  const subjectDist = useMemo(() => [
    { name: "Advanced Mathematics", value: 94, color: SUBJECT_PALETTE[0] },
    { name: "Chemistry Basics", value: 88, color: SUBJECT_PALETTE[1] },
    { name: "English Literature", value: 82, color: SUBJECT_PALETTE[2] },
    { name: "Physics Fundamentals", value: 76, color: SUBJECT_PALETTE[3] },
  ], []);

  const topStudents: StudentRow[] = [
    { name: "Sarah Chen", subject: "Mathematics", score: 98, grade: 98 },
    { name: "James Kim", subject: "Physics", score: 92, grade: 92 },
    { name: "Priya Patel", subject: "Chemistry", score: 87, grade: 87 },
    { name: "Tom Rivera", subject: "Mathematics", score: 73, grade: 73 },
    { name: "Amy Liu", subject: "Biology", score: 85, grade: 85 },
  ];

  const starStudents = [
    { title: "Sarah C." },
    { title: "James K." },
    { title: "Priya P." },
    { title: "Amy L." },
  ];

  const scoreClass = (s: number) => s >= 90 ? "sp-hi" : s >= 75 ? "sp-mid" : "sp-lo";

  return (
    <>
      <style>{CSS}</style>
      <div className="sd-root">
        <span className="sd-bg-ribbon" aria-hidden />
        <span className="sd-bg-spark s1" aria-hidden />
        <span className="sd-bg-spark s2" aria-hidden />
        <span className="sd-bg-spark s3" aria-hidden />
        <div className="sd-shell">
          <div className="sd-greeting">
            <div>
              <div className="sd-title">Welcome, {teacherName}! 👩‍🏫</div>
              <div className="sd-subtitle">Manage your classes, track student progress, and inspire learning! {icon.rocket}</div>
            </div>
            <div className="sd-mini-stats">
              {[
                { icon: icon.users, value: totalStudents, label: "Students" },
                { icon: icon.book, value: coursesCreated, label: "Courses" },
                { icon: icon.target, value: `${classAverage}%`, label: "Class Avg" },
              ].map((item) => (
                <div className="sd-mini-pill" key={item.label}>
                  <div className="sd-pill-ico">{item.icon}</div>
                  <div>
                    <div className="sd-pill-num">{isLoading ? "..." : item.value}</div>
                    <div className="sd-pill-label">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sd-grid" style={{ marginTop: 22 }}>
            <main className="sd-main">
              <motion.section
                className="sd-hero"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38 }}
              >
                <div className="sd-hero-content">
                  <div className="sd-chip">{icon.graduation} Active Teaching Track</div>
                  <h1 className="sd-lesson-title">
                    <span>Advanced Mathematics</span>
                    <img src={mathsSubject} alt="" className="sd-lesson-title-art" />
                  </h1>
                  <div className="sd-lesson-meta">Grade 12 · 32 Students Enrolled · Room 204</div>
                  <div className="sd-progress-line">
                    <div className="sd-progress-track">
                      <div className="sd-progress-fill" style={{ width: "84%" }} />
                    </div>
                    <div className="sd-progress-text">84% Syllabus Covered</div>
                  </div>
                  <Link href="/enhanced-content-manager">
                    <button className="sd-primary-btn">+ Create Course / Lesson &gt;</button>
                  </Link>
                </div>
                <div className="sd-hero-panel" aria-hidden>
                  <div className="sd-hero-orbit">
                    <img src={mathsSubject} alt="" />
                  </div>
                  <div className="sd-hero-stats">
                    <div className="sd-hero-stat"><b>84%</b><span>Syllabus</span></div>
                    <div className="sd-hero-stat"><b>94%</b><span>Attendance</span></div>
                  </div>
                </div>
              </motion.section>

              <section className="sd-snapshot-grid">
                <motion.button
                  className="sd-studio-card"
                  onClick={() => setLocation("/enhanced-content-manager")}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.36 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="sd-studio-title">AI Teaching Studio</div>
                  <div className="sd-studio-text">Generate interactive slides, automated quizzes, and customized curriculum plans with AI.</div>
                  <img src={learningIsland} alt="" className="sd-studio-art" />
                </motion.button>
                <div className="sd-snapshot-stack">
                  {microWins.map((item, index) => (
                    <motion.button
                      key={item.title}
                      className="sd-micro"
                      onClick={() => setLocation(item.href)}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="sd-micro-ico" style={{ "--micro-bg": item.bg } as CSSVars}>
                        {item.icon}
                      </div>
                      <div>
                        <b>{item.title}</b>
                        <span>{item.text}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>

              <section className="sd-card">
                <div className="sd-section-head">
                  <h2 className="sd-section-title">Today's Schedule</h2>
                  <Link href="/calendar" className="sd-link">Open calendar &gt;</Link>
                </div>
                <div className="sd-plan-grid">
                  {plans.map((plan, index) => (
                    <motion.button
                      key={plan.title}
                      className="sd-plan"
                      style={{ "--plan-glow": plan.color } as CSSVars}
                      onClick={() => setLocation("/calendar")}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + index * 0.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="sd-plan-time">{plan.time}</div>
                      <div className="sd-plan-title">{plan.title}</div>
                      <div className="sd-plan-meta">{plan.meta}</div>
                    </motion.button>
                  ))}
                </div>
              </section>

              <section>
                <div className="sd-section-head">
                  <h2 className="sd-section-title">Your Classes & Subjects</h2>
                  <Link href="/students" className="sd-link">View all classes &gt;</Link>
                </div>
                <div className="sd-subject-grid">
                  {subjectCards.map((subject, index) => (
                    <motion.button
                      key={subject.name}
                      className="sd-subject"
                      style={{ "--subject-bg": subject.bg, "--delay": `${index * -0.22}s` } as CSSVars}
                      onClick={() => setLocation("/students")}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      aria-label={`${subject.name} subject`}
                    >
                      <div className="sd-subject-name">{subject.name}</div>
                      <div className="sd-subject-visual">
                        <img src={subject.image} alt="" className="sd-subject-art-img" aria-hidden />
                      </div>
                      <div className="sd-subject-footer">
                        <div className="sd-subject-progress">{subject.progress}% syllabus · {subject.students} students</div>
                        <div className="sd-subject-bar">
                          <span style={{ width: `${subject.progress}%` }} />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="sd-section-title" style={{ marginBottom: 14 }}>Teaching Tools & Actions</h2>
                <div className="sd-play-grid">
                  {playCards.map((card, index) => (
                    <motion.button
                      className="sd-play"
                      key={card.title}
                      style={{ background: card.bg, "--delay": `${index * -0.18}s` } as CSSVars}
                      onClick={card.action}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.025 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <h3>{card.title}</h3>
                      <p>{card.text}</p>
                      <span className="sd-play-icon" aria-hidden>{card.icon}</span>
                    </motion.button>
                  ))}
                </div>
              </section>

              <section className="sd-card">
                <div className="sd-section-head">
                  <h2 className="sd-section-title">Classroom Accelerators</h2>
                  <Link href="/enhanced-content-manager" className="sd-link">Launch Studio &gt;</Link>
                </div>
                <div className="sd-skill-grid">
                  {skills.map((skill, index) => (
                    <motion.button
                      key={skill.name}
                      className="sd-skill"
                      style={{ "--skill-card-bg": skill.bg, "--delay": `${index * -0.2}s` } as CSSVars}
                      onClick={() => setLocation(skill.href)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + index * 0.04 }}
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="sd-skill-icon">{skill.icon}</div>
                      <div>
                        <div className="sd-skill-name">{skill.name}</div>
                        <div className="sd-skill-text">{skill.text}</div>
                      </div>
                      <div className="sd-skill-arrow">&gt;</div>
                    </motion.button>
                  ))}
                </div>
              </section>

              <section className="sd-card sd-journey-card">
                <h2 className="sd-section-title" style={{ marginBottom: 16 }}>Teaching Workflow</h2>
                <div className="sd-journey">
                  {[
                    ["Plan", "Draft curriculum & lessons", "linear-gradient(135deg,#b7f29d,#48c987)", "#168b59", "/teacher/curriculum-planner"],
                    ["Teach", "Deliver slides & interactive media", "linear-gradient(135deg,#9fe7ff,#4b9bff)", "#2474c9", "/bookExpanded"],
                    ["Assess", "Assign quizzes & homework", "linear-gradient(135deg,#ffd77d,#ff9c52)", "#c56b16", "/teacher/homework"],
                    ["Analyze", "Evaluate class mastery & growth", "linear-gradient(135deg,#ffb2d1,#e671a4)", "#bf4679", "/analytics"],
                  ].map(([title, text, bg, clr, href], index) => (
                    <motion.div
                      className="sd-step"
                      key={title}
                      style={{ "--step-bg": bg, "--step-color": clr, "--delay": `${index * -0.25}s` } as CSSVars}
                      onClick={() => setLocation(href)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") setLocation(href);
                      }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      whileHover={{ y: -5 }}
                    >
                      <div className="sd-step-num">{index + 1}</div>
                      <div>
                        <b>{title}</b>
                        <span>{text}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="sd-section-title" style={{ marginBottom: 14 }}>Student Performance Highlights</h2>
                <div className="sd-rec-grid">
                  {recs.map((rec, index) => (
                    <motion.button
                      className="sd-rec"
                      key={rec.title}
                      style={{ "--rec-bg": rec.bg, "--delay": `${index * -0.2}s` } as CSSVars}
                      onClick={() => setLocation(rec.href)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.035 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="sd-rec-type">{rec.type}</div>
                      <div className="sd-rec-title">{rec.title}</div>
                      <div className="sd-rec-meta">{rec.meta}</div>
                      <span className="sd-rec-art" aria-hidden>{rec.icon}</span>
                    </motion.button>
                  ))}
                </div>
              </section>

              <section className="sd-card">
                <div className="sd-section-head">
                  <h2 className="sd-section-title">Top Students 🌟</h2>
                  <Link href="/students" className="sd-link">View all students &gt;</Link>
                </div>
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th className="sd-th">Student</th>
                      <th className="sd-th">Subject</th>
                      <th className="sd-th">Score</th>
                      <th className="sd-th">Progress</th>
                      <th className="sd-th" style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topStudents.map((s, i) => (
                      <tr key={i} className="sd-tr" onClick={() => setLocation("/students")}>
                        <td className="sd-td">
                          <div className="sd-s-name">{s.name}</div>
                        </td>
                        <td className="sd-td">
                          <div className="sd-s-sub">{s.subject}</div>
                        </td>
                        <td className="sd-td">
                          <span className={`score-pill ${scoreClass(s.score)}`}>{s.score}%</span>
                        </td>
                        <td className="sd-td">
                          <div className="sd-grade-bar">
                            <div className="sd-grade-bg">
                              <div className="sd-grade-fill" style={{ width: `${s.grade}%` }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, minWidth: 32 }}>{s.grade}%</span>
                          </div>
                        </td>
                        <td className="sd-td" style={{ textAlign: "right" }}>
                          <button className="sd-manage-btn" onClick={(e) => { e.stopPropagation(); setLocation("/students"); }}>
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </main>

            <aside className="sd-rail">
              <section className="sd-card sd-focus">
                <div className="sd-focus-title">{icon.fire} CLASSROOM TIMER</div>
                <div className="sd-timer">{focusLabel}</div>
                <img src={focusGif} alt="" className="sd-focus-mascot-img" />
                <div className="sd-focus-select">Lecture & Quiz Timer</div>
                <button
                  className="sd-focus-btn"
                  onClick={() => setFocusActive((value) => !value)}
                >
                  {focusActive ? "Pause Timer" : "Start Timer"} &gt;
                </button>
                <div className="sd-focus-slots">
                  {[15, 25, 45].map((minutes) => (
                    <button
                      key={minutes}
                      className={focusMinutes === minutes ? "active" : ""}
                      onClick={() => setFocusLength(minutes)}
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
              </section>

              <section className="sd-card">
                <h2 className="sd-section-title" style={{ fontSize: 20 }}>Today's Goals</h2>
                {goals.map((goal) => (
                  <div className="sd-goal" key={goal.label}>
                    <div className="sd-check">{icon.check}</div>
                    <div className="sd-goal-body">
                      <div className="sd-goal-top">
                        <span>{goal.label}</span>
                        <span>{goal.value}/{goal.total}</span>
                      </div>
                      <div className="sd-goal-track">
                        <span style={{ width: `${(goal.value / goal.total) * 100}%`, background: goal.color }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="sd-encourage">Great job! Your classes are on track! {icon.party}</div>
              </section>

              <section className="sd-card sd-progress-card">
                <div className="sd-section-head">
                  <h2 className="sd-section-title" style={{ fontSize: 20 }}>Class Performance</h2>
                  <Link href="/analytics" className="sd-link">View report</Link>
                </div>
                <div className="sd-progress-wrap">
                  <div className="sd-progress-overview">
                    <div className="sd-progress-number">
                      <strong><AnimNum target={classAverage} suffix="%" /></strong>
                      <span>Average Class Score</span>
                    </div>
                    <div className="sd-progress-meter">
                      <span style={{ width: `${classAverage}%` }} />
                    </div>
                    <div className="sd-progress-scale">
                      <span>Passing: 50%</span>
                      <b>{classAverage}% average</b>
                      <span>Target: 95%</span>
                    </div>
                  </div>
                  <div className="sd-progress-summary">
                    <div className="sd-progress-badge">{icon.chart} Subject Distribution</div>
                    <div className="sd-sub-list">
                      {subjectDist.map((subject) => (
                        <div className="sd-sub-row" key={subject.name}>
                          <div className="sd-sub-row-top">
                            <span>
                              <i style={{ width: 8, height: 8, borderRadius: 99, background: subject.color, display: "inline-block" }} />
                              {subject.name}
                            </span>
                            <b>{subject.value}%</b>
                          </div>
                          <div className="sd-sub-mini-track">
                            <span style={{ width: `${subject.value}%`, background: subject.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="sd-card">
                <div className="sd-section-head">
                  <h2 className="sd-section-title" style={{ fontSize: 20 }}>Weekly Activity</h2>
                  <Link href="/analytics" className="sd-link">View details</Link>
                </div>
                <div className="sd-streak-row">
                  {[
                    [icon.users, totalStudents, "Enrolled"],
                    [icon.star, 78, "Active Today"],
                    [icon.clipboard, 34, "Submissions"],
                  ].map(([ico, num, label]) => (
                    <div key={label as string}>
                      <div className="sd-pill-ico" style={{ margin: "0 auto 6px" }}>{ico}</div>
                      <div className="sd-streak-num">{num}</div>
                      <div className="sd-streak-label">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="sd-week">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                    <div key={`${day}-${index}`}>
                      <div className="sd-day">{day}</div>
                      <div className={`sd-day-dot${index >= 5 ? " pending" : ""}`}>
                        {index === 4 ? icon.star : icon.check}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="sd-card sd-tip-card">
                <h2 className="sd-section-title" style={{ fontSize: 20 }}>{icon.bulb} Teaching Tip</h2>
                <p>Use short 2-minute diagnostic polls before introducing complex concepts to check comprehension.</p>
                <span className="sd-tip-art" aria-hidden>{icon.bulb}</span>
              </section>

              <section className="sd-card">
                <div className="sd-section-head">
                  <h2 className="sd-section-title" style={{ fontSize: 20 }}>Star Students</h2>
                  <Link href="/students" className="sd-link">View all &gt;</Link>
                </div>
                <div className="sd-badge-grid">
                  {starStudents.map((badge, index) => (
                    <div className="sd-badge" key={badge.title}>
                      <div
                        className="sd-badge-shape"
                        style={{ background: ["#ff6b35", "#2563eb", "#ffb21d", "#7c4dff"][index % 4] }}
                      >
                        {index === 0 ? icon.trophy : icon.star}
                      </div>
                      <div className="sd-badge-name">{badge.title}</div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
