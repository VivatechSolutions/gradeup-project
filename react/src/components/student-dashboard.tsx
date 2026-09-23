import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { getLibrarySubjects, getStudentDashboard, type LibrarySubject } from "../lib/gradeupApi";
import { buildApiUrl } from "../lib/apiBase";
import focusGif from "../assets/dashboard/focus-gif.gif";
import learningIsland from "../assets/dashboard/07_floating_learning_island.png";
import tamilSubject from "../assets/dashboard/subject-tamil.png";
import englishSubject from "../assets/dashboard/subject-english.png";
import scienceSubject from "../assets/dashboard/subject-science.png";
import socialSubject from "../assets/dashboard/subject-social.png";
import mathsSubject from "../assets/dashboard/subject-maths.png";

interface StudentDashboardProps { onStartQuiz: () => void; }
interface StudentStats {
  lessonsCompleted?: number;
  averageScore?: number;
  totalTimeSpent?: number;
  badgesEarned?: number;
  completionRate?: number;
  totalPoints?: number;
  rank?: number;
  currentLevel?: number;
  streakDays?: number;
  studyTimeMinutes?: number;
}

function normalizeLearningText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getSubjectFallbackImage(subject: unknown) {
  const subjectKey = normalizeLearningText(subject);
  if (subjectKey.includes("tamil")) return tamilSubject;
  if (subjectKey.includes("english")) return englishSubject;
  if (subjectKey.includes("math")) return mathsSubject;
  if (subjectKey.includes("social") || subjectKey.includes("history")) return socialSubject;
  if (subjectKey.includes("science") || subjectKey.includes("physics") || subjectKey.includes("chemistry")) return scienceSubject;
  return undefined;
}

const SUBJECT_PALETTE = ["#27b86a", "#2389ff", "#ff791f", "#7e45e8", "#00a7c8", "#ff4d8d"];
type CSSVars = CSSProperties & Record<string, string>;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box}
.sd-root{min-height:100%;padding:16px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--sd-ink);background:radial-gradient(circle at 14% 9%,rgba(126,87,255,.12),transparent 26%),radial-gradient(circle at 88% 14%,rgba(255,171,64,.16),transparent 25%),linear-gradient(180deg,var(--sd-page),var(--sd-page-2));--sd-page:#fbfcff;--sd-page-2:#f5f7ff;--sd-card:#ffffff;--sd-card-soft:#f7faff;--sd-ink:#071235;--sd-muted:#68708a;--sd-faint:#8c94aa;--sd-line:rgba(15,23,42,.10);--sd-shadow:0 12px 30px rgba(35,44,87,.10);--sd-shadow-soft:0 7px 18px rgba(35,44,87,.08);position:relative;overflow:hidden}
[data-theme="dark"] .sd-root{--sd-page:#080d1f;--sd-page-2:#10172d;--sd-card:rgba(23,31,58,.92);--sd-card-soft:rgba(31,42,76,.72);--sd-ink:#f6f7ff;--sd-muted:#b5bfd8;--sd-faint:#7f8aa7;--sd-line:rgba(255,255,255,.12);--sd-shadow:0 20px 54px rgba(0,0,0,.36);--sd-shadow-soft:0 12px 30px rgba(0,0,0,.24)}
.sd-root::before,.sd-root::after{content:"";position:absolute;border-radius:999px;pointer-events:none;filter:blur(.2px);opacity:.55;animation:sdFloatBg 12s ease-in-out infinite alternate}.sd-root::before{width:250px;height:250px;left:-90px;top:80px;background:radial-gradient(circle,rgba(46,182,255,.18),transparent 68%)}.sd-root::after{width:290px;height:290px;right:-110px;top:360px;background:radial-gradient(circle,rgba(255,95,153,.14),transparent 70%);animation-delay:-5s}@keyframes sdFloatBg{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(22px,28px,0) scale(1.08)}}@keyframes sdCardIn{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}@keyframes sdShine{0%{transform:translateX(-120%) rotate(18deg)}45%,100%{transform:translateX(220%) rotate(18deg)}}@keyframes sdBreathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes sdPulseSoft{0%,100%{box-shadow:0 0 0 0 rgba(99,91,255,.22)}50%{box-shadow:0 0 0 8px rgba(99,91,255,0)}}@keyframes sdDrift{0%,100%{transform:translate3d(0,0,0) rotate(0)}50%{transform:translate3d(18px,-14px,0) rotate(7deg)}}@keyframes sdGlowMove{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}@keyframes sdWiggle{0%,100%{transform:rotate(0) scale(1)}35%{transform:rotate(-2deg) scale(1.025)}70%{transform:rotate(2deg) scale(1.025)}}@keyframes sdOrbit{from{transform:rotate(0deg) translateX(10px) rotate(0deg)}to{transform:rotate(360deg) translateX(10px) rotate(-360deg)}}@keyframes sdPop3d{0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}50%{transform:translateY(-8px) rotate(4deg) scale(1.06)}}@keyframes sdBgWave{0%,100%{transform:translate3d(-2%,0,0) rotate(0)}50%{transform:translate3d(2%,-2%,0) rotate(2deg)}}@keyframes sdProgressSweep{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(220%) skewX(-20deg)}}
.sd-bg-spark{position:absolute;pointer-events:none;z-index:0;border-radius:999px;opacity:.48;animation:sdDrift 9s ease-in-out infinite}.sd-bg-spark.s1{left:52%;top:78px;width:9px;height:9px;background:#ffb21d;box-shadow:34px 28px 0 #27b86a,76px -14px 0 #2389ff}.sd-bg-spark.s2{right:8%;top:260px;width:7px;height:7px;background:#ff4d8d;box-shadow:-48px 46px 0 #7e45e8,-86px -18px 0 #00a7c8;animation-delay:-3s}.sd-bg-spark.s3{left:7%;bottom:160px;width:8px;height:8px;background:#27b86a;box-shadow:42px -34px 0 #ff791f,92px 18px 0 #2389ff;animation-delay:-5s}
.sd-bg-ribbon{position:absolute;pointer-events:none;z-index:0;left:4%;right:4%;top:150px;height:170px;border-radius:50%;background:linear-gradient(90deg,rgba(35,137,255,.08),rgba(255,178,29,.10),rgba(39,184,106,.08));filter:blur(18px);opacity:.75;animation:sdBgWave 13s ease-in-out infinite}
.sd-shell{max-width:1180px;margin:0 auto;position:relative;z-index:1}.sd-grid{display:grid;grid-template-columns:minmax(0,1fr) 288px;gap:14px;align-items:start}.sd-main,.sd-rail{display:flex;flex-direction:column;gap:14px;min-width:0}
.sd-greeting{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin:0 2px}.sd-title{font-size:clamp(24px,2.6vw,20px);line-height:1.02;font-weight:800;letter-spacing:0;color:var(--sd-ink)}.sd-subtitle{margin-top:6px;font-size:12.5px;font-weight:700;color:var(--sd-muted)}.sd-mini-stats{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}.sd-mini-pill{min-width:94px;border:1px solid var(--sd-line);background:rgba(255,255,255,.78);backdrop-filter:blur(14px);border-radius:18px;padding:8px 11px;display:flex;align-items:center;gap:8px;box-shadow:var(--sd-shadow-soft);animation:sdCardIn .42s both;transition:transform .18s,box-shadow .18s}.sd-mini-pill:hover{transform:translateY(-3px);box-shadow:var(--sd-shadow)}[data-theme="dark"] .sd-mini-pill{background:rgba(23,31,58,.82)}.sd-pill-ico{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:17px;background:#fff4d6}.sd-pill-num{font-size:15px;font-weight:800;line-height:1;color:var(--sd-ink)}.sd-pill-label{font-size:9.5px;font-weight:800;color:var(--sd-muted)}
.sd-hero{position:relative;overflow:hidden;min-height:224px;border-radius:20px;padding:22px;background:linear-gradient(135deg,#d9f5c7 0%,#edf9dd 46%,#ffffff 100%);border:1px solid rgba(84,166,83,.18);box-shadow:var(--sd-shadow);animation:sdCardIn .45s both}.sd-hero::before{content:"";position:absolute;inset:-80px auto auto -80px;width:210px;height:210px;border-radius:50%;background:rgba(255,255,255,.45);animation:sdBreathe 5s ease-in-out infinite}.sd-hero::after{content:"";position:absolute;top:-50px;bottom:-50px;width:70px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.36),transparent);animation:sdShine 7s ease-in-out infinite}[data-theme="dark"] .sd-hero{background:linear-gradient(135deg,#16351f 0%,#17283a 58%,#1d2745 100%);border-color:rgba(110,231,183,.18)}.sd-hero-content{position:relative;z-index:2;max-width:360px}.sd-chip{display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;color:#10734c}[data-theme="dark"] .sd-chip{color:#7ee7b7}.sd-lesson-title{font-size:clamp(22px,2.6vw,29px);line-height:1.15;font-weight:800;letter-spacing:0;margin:13px 0 9px;color:var(--sd-ink)}.sd-lesson-meta{font-size:12.5px;font-weight:700;color:var(--sd-muted)}.sd-progress-line{display:flex;align-items:center;gap:9px;margin:18px 0 15px;max-width:230px}.sd-progress-track{height:7px;flex:1;border-radius:999px;background:rgba(12,98,59,.14);overflow:hidden}.sd-progress-fill{height:100%;border-radius:inherit;background:#14915d;animation:sdPulseSoft 2.6s ease-in-out infinite}.sd-progress-text{font-size:11.5px;font-weight:800;color:var(--sd-ink);white-space:nowrap}.sd-primary-btn{border:0;border-radius:14px;padding:11px 17px;min-height:40px;background:linear-gradient(135deg,#7b2cff,#b948d9);color:#fff;font:800 12.5px/1 'Plus Jakarta Sans',system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 20px rgba(123,44,255,.23);transition:transform .18s,box-shadow .18s}.sd-primary-btn:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 14px 26px rgba(123,44,255,.30)}
.sd-hero{position:relative;overflow:hidden;min-height:224px;border-radius:20px;padding:22px;background:linear-gradient(135deg,#d9f5c7 0%,#edf9dd 46%,#ffffff 100%);border:1px solid rgba(84,166,83,.18);box-shadow:var(--sd-shadow);animation:sdCardIn .45s both}.sd-hero::before{content:"";position:absolute;inset:-80px auto auto -80px;width:210px;height:210px;border-radius:50%;background:rgba(255,255,255,.45);animation:sdBreathe 5s ease-in-out infinite}.sd-hero::after{content:"";position:absolute;top:-50px;bottom:-50px;width:70px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.36),transparent);animation:sdShine 7s ease-in-out infinite}[data-theme="dark"] .sd-hero{background:linear-gradient(135deg,#16351f 0%,#17283a 58%,#1d2745 100%);border-color:rgba(110,231,183,.18)}.sd-hero-content{position:relative;z-index:2;max-width:360px}.sd-chip{display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;color:#10734c}[data-theme="dark"] .sd-chip{color:#7ee7b7}.sd-lesson-title{font-size:clamp(22px,2.6vw,29px);line-height:1.15;font-weight:800;letter-spacing:0;margin:13px 0 9px;color:var(--sd-ink)}.sd-lesson-meta{font-size:12.5px;font-weight:700;color:var(--sd-muted)}.sd-progress-line{display:flex;align-items:center;gap:9px;margin:18px 0 15px;max-width:230px}.sd-progress-track{height:7px;flex:1;border-radius:999px;background:rgba(12,98,59,.14);overflow:hidden}.sd-progress-fill{height:100%;border-radius:inherit;background:#14915d;animation:sdPulseSoft 2.6s ease-in-out infinite}.sd-progress-text{font-size:11.5px;font-weight:800;color:var(--sd-ink);white-space:nowrap}.sd-primary-btn{border:0;border-radius:14px;padding:11px 17px;min-height:40px;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;font:800 12.5px/1 'Plus Jakarta Sans',system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 20px rgba(14,165,233,.28);transition:transform .18s,box-shadow .18s}.sd-primary-btn:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 14px 26px rgba(14,165,233,.38)}
.sd-plant{position:absolute;right:126px;bottom:4px;width:min(230px,32%);aspect-ratio:1;z-index:1;filter:drop-shadow(0 22px 20px rgba(42,74,58,.22));animation:sdBreathe 4.8s ease-in-out infinite}.sd-dome{position:absolute;inset:7% 13% 13%;border-radius:48% 48% 44% 44%;background:linear-gradient(135deg,rgba(255,255,255,.82),rgba(133,213,255,.24));border:3px solid rgba(108,191,217,.45)}.sd-base{position:absolute;left:18%;right:18%;bottom:8%;height:18%;border-radius:50%;background:linear-gradient(180deg,#b9752f,#754017);box-shadow:inset 0 6px 0 rgba(255,213,142,.38)}.sd-sprout{position:absolute;left:47%;bottom:25%;width:8%;height:45%;border-radius:999px;background:#2d8c34;transform:rotate(-2deg)}.sd-leaf{position:absolute;width:28%;height:18%;border-radius:80% 10% 80% 10%;background:linear-gradient(135deg,#87dc37,#268b2d);box-shadow:inset -6px -5px 0 rgba(0,0,0,.08)}.sd-leaf.l1{left:33%;bottom:52%;transform:rotate(28deg)}.sd-leaf.l2{left:49%;bottom:60%;transform:rotate(-34deg)}.sd-leaf.l3{left:31%;bottom:36%;transform:rotate(-25deg)}.sd-leaf.l4{left:53%;bottom:41%;transform:rotate(35deg)}.sd-moss{position:absolute;left:28%;right:28%;bottom:20%;height:18%;border-radius:50%;background:linear-gradient(180deg,#9be64a,#3fa834)}.sd-quote{position:absolute;right:24px;top:70px;width:118px;font-size:11px;line-height:1.65;font-weight:700;color:var(--sd-ink)}.sd-quote-mark{font-size:36px;line-height:.7;color:#20a362;font-weight:800}.sd-quote small{display:block;margin-top:7px;color:#15915b;font-weight:800}
.sd-hero-art{position:absolute;right:170px;bottom:20px;width:min(300px,36%);z-index:1;filter:drop-shadow(0 24px 24px rgba(42,74,58,.22))}.sd-hero-art img{width:100%;height:auto;display:block}
.sd-ai{overflow:hidden;border-radius:22px;padding:18px;background:#101d54;color:#fff;box-shadow:var(--sd-shadow);background-image:radial-gradient(circle at 20% 20%,rgba(70,143,255,.32),transparent 24%),radial-gradient(circle at 83% 12%,rgba(151,72,255,.24),transparent 23%),linear-gradient(135deg,#10194e,#13235f);position:relative;animation:sdCardIn .45s .05s both}.sd-ai::after{content:"";position:absolute;inset:auto -30px -70px auto;width:180px;height:180px;border-radius:50%;background:rgba(46,182,255,.15);animation:sdBreathe 6s ease-in-out infinite}.sd-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.sd-section-title{font-size:18px;font-weight:800;color:var(--sd-ink);letter-spacing:0}.sd-ai .sd-section-title{color:#fff}.sd-link{border:0;background:transparent;color:#622cff;font-size:12px;font-weight:800;cursor:pointer;text-decoration:none}.sd-ai-body{display:grid;grid-template-columns:100px 1fr;gap:14px;align-items:center;position:relative;z-index:1}.sd-bot{width:100px;height:100px;border-radius:28px;background:linear-gradient(145deg,#f8fbff,#bdd7ff);position:relative;box-shadow:inset 0 -10px 0 rgba(61,99,172,.14)}.sd-bot::before{content:"";position:absolute;left:26px;right:26px;top:33px;height:42px;border-radius:16px;background:#071235;box-shadow:0 0 0 7px #e9f6ff}.sd-bot::after{content:"";position:absolute;left:43px;top:47px;width:10px;height:10px;border-radius:50%;background:#24d7ff;box-shadow:32px 0 0 #24d7ff,16px 22px 0 -2px #24d7ff}.sd-prompt-card{background:#fff;color:#071235;border-radius:18px;padding:12px;font-size:11px;font-weight:800;min-height:88px;display:grid;place-items:center;text-align:center;box-shadow:0 10px 18px rgba(0,0,0,.12)}.sd-action-row{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}.sd-action{border:0;border-radius:18px;min-height:94px;padding:12px 7px;background:linear-gradient(180deg,#f9fdff,#dceeff);color:#071235;font:800 10.5px/1.32 'Plus Jakarta Sans',system-ui,sans-serif;cursor:pointer;transition:transform .18s,box-shadow .18s}.sd-action:hover{transform:translateY(-4px) scale(1.025);box-shadow:0 12px 20px rgba(0,0,0,.16)}.sd-action span{display:block;font-size:32px;margin-bottom:10px}
.sd-ai{overflow:hidden;border-radius:22px;padding:18px;background:#101d54;color:#fff;box-shadow:var(--sd-shadow);background-image:radial-gradient(circle at 20% 20%,rgba(70,143,255,.32),transparent 24%),radial-gradient(circle at 83% 12%,rgba(151,72,255,.24),transparent 23%),linear-gradient(135deg,#10194e,#13235f);position:relative;animation:sdCardIn .45s .05s both}.sd-ai::after{content:"";position:absolute;inset:auto -30px -70px auto;width:180px;height:180px;border-radius:50%;background:rgba(46,182,255,.15);animation:sdBreathe 6s ease-in-out infinite}.sd-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.sd-section-title{font-size:18px;font-weight:800;color:var(--sd-ink);letter-spacing:0}.sd-ai .sd-section-title{color:#fff}.sd-link{border:0;background:transparent;color:#0284c7;font-size:12px;font-weight:800;cursor:pointer;text-decoration:none}[data-theme="dark"] .sd-link{color:#38bdf8}.sd-ai-body{display:grid;grid-template-columns:100px 1fr;gap:14px;align-items:center;position:relative;z-index:1}.sd-bot{width:100px;height:100px;border-radius:28px;background:linear-gradient(145deg,#f8fbff,#bdd7ff);position:relative;box-shadow:inset 0 -10px 0 rgba(61,99,172,.14)}.sd-bot::before{content:"";position:absolute;left:26px;right:26px;top:33px;height:42px;border-radius:16px;background:#071235;box-shadow:0 0 0 7px #e9f6ff}.sd-bot::after{content:"";position:absolute;left:43px;top:47px;width:10px;height:10px;border-radius:50%;background:#24d7ff;box-shadow:32px 0 0 #24d7ff,16px 22px 0 -2px #24d7ff}.sd-prompt-card{background:#fff;color:#071235;border-radius:18px;padding:12px;font-size:11px;font-weight:800;min-height:88px;display:grid;place-items:center;text-align:center;box-shadow:0 10px 18px rgba(0,0,0,.12)}.sd-action-row{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}.sd-action{border:0;border-radius:18px;min-height:94px;padding:12px 7px;background:linear-gradient(180deg,#f9fdff,#dceeff);color:#071235;font:800 10.5px/1.32 'Plus Jakarta Sans',system-ui,sans-serif;cursor:pointer;transition:transform .18s,box-shadow .18s}.sd-action:hover{transform:translateY(-4px) scale(1.025);box-shadow:0 12px 20px rgba(0,0,0,.16)}.sd-action span{display:block;font-size:32px;margin-bottom:10px}
.sd-bot-img{width:104px;height:104px;object-fit:contain;filter:drop-shadow(0 14px 16px rgba(0,0,0,.24));animation:sdBreathe 4.2s ease-in-out infinite}.sd-action-img{display:block;width:38px;height:38px;object-fit:contain;margin:0 auto 7px}.sd-prompt-card img{width:52px;height:52px;object-fit:contain;margin-bottom:5px}
.sd-card{background:rgba(255,255,255,.86);backdrop-filter:blur(14px);border:1px solid var(--sd-line);border-radius:18px;box-shadow:var(--sd-shadow-soft);padding:15px;animation:sdCardIn .45s both;transition:transform .18s,box-shadow .18s,border-color .18s}[data-theme="dark"] .sd-card{background:rgba(23,31,58,.88)}.sd-card:hover{transform:translateY(-2px);box-shadow:var(--sd-shadow);border-color:rgba(99,91,255,.18)}.sd-subject-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.sd-subject{min-height:166px;border:0;border-radius:8px;padding:16px 12px;text-align:left;color:#071235;position:relative;overflow:hidden;font-family:'Plus Jakarta Sans',system-ui,sans-serif;box-shadow:0 9px 18px rgba(38,57,116,.11);cursor:pointer}.sd-subject::after{content:"";position:absolute;right:-18px;bottom:-18px;width:118px;height:118px;border-radius:50%;background:rgba(255,255,255,.35)}.sd-subject-name{font-size:20px;font-weight:800;margin-bottom:82px;position:relative;z-index:1}.sd-subject-art{position:absolute;left:50%;top:70px;transform:translateX(-50%);font-size:70px;z-index:1}.sd-subject-progress{font-size:13px;font-weight:800;position:relative;z-index:1}.sd-subject-bar{height:8px;border-radius:999px;background:rgba(255,255,255,.55);margin:8px 0 16px;overflow:hidden;position:relative;z-index:1}.sd-subject-bar span{display:block;height:100%;border-radius:inherit;background:currentColor}.sd-small-btn{border:0;border-radius:999px;padding:10px 18px;color:#fff;background:rgba(0,0,0,.25);font-weight:800;cursor:pointer;position:relative;z-index:1}
.sd-card{background:rgba(255,255,255,.86);backdrop-filter:blur(14px);border:1px solid var(--sd-line);border-radius:18px;box-shadow:var(--sd-shadow-soft);padding:15px;animation:sdCardIn .45s both;transition:transform .18s,box-shadow .18s,border-color .18s}[data-theme="dark"] .sd-card{background:rgba(23,31,58,.88)}.sd-card:hover{transform:translateY(-2px);box-shadow:var(--sd-shadow);border-color:rgba(14,165,233,.24)}.sd-subject-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.sd-subject{min-height:166px;border:0;border-radius:8px;padding:16px 12px;text-align:left;color:#071235;position:relative;overflow:hidden;font-family:'Plus Jakarta Sans',system-ui,sans-serif;box-shadow:0 9px 18px rgba(38,57,116,.11);cursor:pointer}.sd-subject::after{content:"";position:absolute;right:-18px;bottom:-18px;width:118px;height:118px;border-radius:50%;background:rgba(255,255,255,.35)}.sd-subject-name{font-size:20px;font-weight:800;margin-bottom:82px;position:relative;z-index:1}.sd-subject-art{position:absolute;left:50%;top:70px;transform:translateX(-50%);font-size:70px;z-index:1}.sd-subject-progress{font-size:13px;font-weight:800;position:relative;z-index:1}.sd-subject-bar{height:8px;border-radius:999px;background:rgba(255,255,255,.55);margin:8px 0 16px;overflow:hidden;position:relative;z-index:1}.sd-subject-bar span{display:block;height:100%;border-radius:inherit;background:currentColor}.sd-small-btn{border:0;border-radius:999px;padding:10px 18px;color:#fff;background:rgba(0,0,0,.25);font-weight:800;cursor:pointer;position:relative;z-index:1}
.sd-subject.image-card{padding:0;background:linear-gradient(180deg,rgba(255,255,255,.8),rgba(245,248,255,.45))!important;color:inherit!important;box-shadow:0 10px 20px rgba(38,57,116,.08);border-radius:14px;min-height:166px;animation:sdCardIn .45s both;transition:transform .2s,box-shadow .2s}.sd-subject.image-card::after{display:none}.sd-subject-img{width:100%;height:100%;min-height:166px;object-fit:contain;display:block;filter:drop-shadow(0 9px 14px rgba(38,57,116,.14));transition:transform .22s,filter .22s}.sd-subject.image-card:hover{transform:translateY(-5px) rotate(-.6deg);box-shadow:0 16px 26px rgba(38,57,116,.14)}.sd-subject.image-card:hover .sd-subject-img{transform:scale(1.04);filter:drop-shadow(0 15px 18px rgba(38,57,116,.18))}
.sd-play-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.sd-play{min-height:108px;border:0;border-radius:12px;padding:13px;color:#fff;text-align:left;font-family:'Plus Jakarta Sans',system-ui,sans-serif;position:relative;overflow:hidden;cursor:pointer;box-shadow:0 9px 18px rgba(38,57,116,.12);transition:transform .18s,box-shadow .18s;animation:sdCardIn .45s both;background-size:180% 180%!important}.sd-play::before{content:"";position:absolute;inset:-40px auto auto -50px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.18);transition:transform .18s}.sd-play:hover{transform:translateY(-4px) scale(1.018);box-shadow:0 15px 26px rgba(38,57,116,.18);animation:sdGlowMove 2.6s ease infinite}.sd-play:hover::before{transform:scale(1.2)}.sd-play h3{font-size:13.5px;font-weight:800;margin:0 0 5px;position:relative;z-index:1}.sd-play p{font-size:10.5px;font-weight:700;line-height:1.35;margin:0;max-width:108px;position:relative;z-index:1}.sd-play span{position:absolute;right:14px;bottom:12px;font-size:58px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.18))}
.sd-play-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.sd-play{min-height:108px;border:1px solid rgba(255,255,255,.32);border-radius:14px;padding:13px;color:#fff;text-align:left;font-family:'Plus Jakarta Sans',system-ui,sans-serif;position:relative;overflow:hidden;cursor:pointer;box-shadow:0 9px 18px rgba(38,57,116,.12);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:transform .18s,box-shadow .18s;animation:sdCardIn .45s both;background-size:180% 180%!important}.sd-play::before{content:"";position:absolute;inset:-40px auto auto -50px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.18);transition:transform .18s}.sd-play:hover{transform:translateY(-4px) scale(1.018);box-shadow:0 15px 26px rgba(38,57,116,.18);animation:sdGlowMove 2.6s ease infinite}.sd-play:hover::before{transform:scale(1.2)}.sd-play h3{font-size:13.5px;font-weight:800;margin:0 0 5px;position:relative;z-index:1}.sd-play p{font-size:10.5px;font-weight:700;line-height:1.35;margin:0;max-width:108px;position:relative;z-index:1}.sd-play span{position:absolute;right:14px;bottom:12px;font-size:58px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.18))}[data-theme="dark"] .sd-play{border-color:rgba(255,255,255,.16);box-shadow:0 12px 24px rgba(0,0,0,.35)}
.sd-play img{position:absolute;right:4px;bottom:3px;width:56px;height:56px;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(0,0,0,.18));transition:transform .18s}.sd-play:hover img{animation:sdWiggle .65s ease both}
.sd-journey{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;position:relative}.sd-step{border:1px solid rgba(255,255,255,.62);background:var(--step-bg);border-radius:17px;padding:13px;display:flex;align-items:center;gap:10px;min-height:78px;position:relative;overflow:hidden;box-shadow:0 10px 20px rgba(38,57,116,.10);transition:transform .2s,box-shadow .2s;animation:sdCardIn .45s both}.sd-step::before{content:"";position:absolute;inset:-34px -24px auto auto;width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,.27);transition:transform .3s}.sd-step::after{content:"";position:absolute;left:13px;right:13px;bottom:0;height:4px;border-radius:99px;background:rgba(255,255,255,.58);transform:scaleX(.45);transform-origin:left;transition:transform .3s}.sd-step:hover{transform:translateY(-5px) rotate(-.7deg);box-shadow:0 17px 28px rgba(38,57,116,.17)}.sd-step:hover::before{transform:scale(1.35)}.sd-step:hover::after{transform:scaleX(1)}.sd-step-num{width:32px;height:32px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.82);color:var(--step-color);font-weight:800;flex:0 0 auto;font-size:13px;box-shadow:0 7px 12px rgba(38,57,116,.12);position:relative;z-index:1;animation:sdPop3d 4s ease-in-out infinite;animation-delay:var(--delay,0s)}.sd-step b{display:block;font-size:12px;color:#071235;position:relative;z-index:1}.sd-step span{display:block;font-size:9.5px;font-weight:700;line-height:1.35;color:rgba(7,18,53,.68);position:relative;z-index:1}
.sd-rec-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.sd-rec{min-height:116px;border-radius:16px;border:1px solid var(--sd-line);background:var(--sd-card-soft);padding:13px;position:relative;overflow:hidden;text-align:left;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif;transition:transform .18s,box-shadow .18s}.sd-rec:hover{transform:translateY(-3px);box-shadow:var(--sd-shadow-soft)}.sd-rec-type{font-size:10.5px;font-weight:800;color:#6b38f2}.sd-rec-title{font-size:12.5px;font-weight:800;color:var(--sd-ink);margin:6px 0;max-width:126px}.sd-rec-meta{font-size:10.5px;font-weight:700;color:var(--sd-muted)}.sd-rec-art{position:absolute;right:14px;bottom:10px;font-size:58px}
.sd-rec-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.sd-rec{min-height:116px;border-radius:16px;border:1px solid var(--sd-line);background:var(--sd-card-soft);padding:13px;position:relative;overflow:hidden;text-align:left;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif;transition:transform .18s,box-shadow .18s}.sd-rec:hover{transform:translateY(-3px);box-shadow:var(--sd-shadow-soft)}.sd-rec-type{font-size:10.5px;font-weight:800;color:#0284c7}.sd-rec-title{font-size:12.5px;font-weight:800;color:var(--sd-ink);margin:6px 0;max-width:126px}.sd-rec-meta{font-size:10.5px;font-weight:700;color:var(--sd-muted)}.sd-rec-art{position:absolute;right:14px;bottom:10px;font-size:58px}
.sd-rec-art-img{position:absolute;right:8px;bottom:6px;width:68px;height:68px;object-fit:contain}
.sd-plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.sd-plan{border:1px solid var(--sd-line);background:var(--sd-card-soft);border-radius:14px;padding:12px;min-height:86px;position:relative;overflow:hidden;transition:transform .18s,box-shadow .18s;text-align:left;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif}.sd-plan:hover{transform:translateY(-3px);box-shadow:var(--sd-shadow-soft)}.sd-plan::after{content:"";position:absolute;right:-18px;bottom:-24px;width:72px;height:72px;border-radius:50%;background:var(--plan-glow,rgba(99,91,255,.12))}.sd-plan-time{font-size:10px;font-weight:800;color:var(--sd-muted);text-transform:uppercase}.sd-plan-title{font-size:13px;font-weight:800;color:var(--sd-ink);margin:7px 0 5px;position:relative;z-index:1}.sd-plan-meta{font-size:10.5px;font-weight:700;color:var(--sd-muted);position:relative;z-index:1}.sd-skill-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.sd-skill{border:1px solid rgba(255,255,255,.62);background:var(--skill-card-bg);border-radius:17px;padding:12px;display:flex;align-items:center;gap:10px;min-height:82px;position:relative;overflow:hidden;box-shadow:0 10px 20px rgba(38,57,116,.10);transition:transform .2s,box-shadow .2s;text-align:left;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif;animation:sdCardIn .45s both}.sd-skill::before{content:"";position:absolute;top:-48px;right:-28px;width:118px;height:118px;border-radius:50%;background:rgba(255,255,255,.26);transition:transform .3s}.sd-skill::after{content:"";position:absolute;top:-20%;bottom:-20%;left:-100%;width:42%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);transform:skewX(-18deg);transition:left .5s}.sd-skill:hover{transform:translateY(-5px) scale(1.015);box-shadow:0 17px 28px rgba(38,57,116,.17)}.sd-skill:hover::before{transform:scale(1.35)}.sd-skill:hover::after{left:130%}.sd-skill-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;flex:0 0 auto;background:rgba(255,255,255,.78);font-size:21px;position:relative;z-index:1;box-shadow:0 8px 14px rgba(38,57,116,.12);animation:sdPop3d 4.2s ease-in-out infinite;animation-delay:var(--delay,0s)}.sd-skill:hover .sd-skill-icon{animation:sdWiggle .65s ease both}.sd-skill-name{font-size:12.5px;font-weight:800;color:#071235;position:relative;z-index:1}.sd-skill-text{font-size:10.5px;font-weight:700;color:rgba(7,18,53,.68);margin-top:3px;position:relative;z-index:1}.sd-skill-arrow{margin-left:auto;color:#071235;font-size:18px;font-weight:800;position:relative;z-index:1;transition:transform .2s}.sd-skill:hover .sd-skill-arrow{transform:translateX(4px)}
.sd-snapshot-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:10px}.sd-studio-card{min-height:150px;border:0;border-radius:16px;padding:16px;text-align:left;cursor:pointer;color:#fff;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:linear-gradient(135deg,#152070,#2944d8 52%,#1fb4c6);background-size:180% 180%;box-shadow:0 14px 26px rgba(38,57,116,.18);position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s}.sd-studio-card:hover{transform:translateY(-4px);box-shadow:0 18px 34px rgba(38,57,116,.24);animation:sdGlowMove 2.8s ease infinite}.sd-studio-title{font-size:17px;font-weight:800;margin-bottom:7px;position:relative;z-index:1}.sd-studio-text{font-size:12px;font-weight:700;line-height:1.45;max-width:230px;color:rgba(255,255,255,.86);position:relative;z-index:1}.sd-studio-art{position:absolute;right:12px;bottom:0;width:112px;height:112px;object-fit:contain;filter:drop-shadow(0 14px 16px rgba(0,0,0,.28));animation:sdBreathe 4.5s ease-in-out infinite}.sd-snapshot-stack{display:grid;gap:10px}.sd-micro{border:1px solid var(--sd-line);border-radius:14px;background:var(--sd-card-soft);min-height:70px;padding:12px;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif;transition:transform .18s,box-shadow .18s}.sd-micro:hover{transform:translateY(-3px);box-shadow:var(--sd-shadow-soft)}.sd-micro-ico{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;font-size:21px;background:var(--micro-bg)}.sd-micro b{display:block;font-size:12.5px;color:var(--sd-ink)}.sd-micro span{display:block;font-size:10.5px;font-weight:700;color:var(--sd-muted);margin-top:2px}
.sd-focus{background:linear-gradient(145deg,#6726c7,#141260);border:0;color:#fff;position:relative;overflow:hidden}.sd-focus::before{content:"";position:absolute;right:-28px;top:-28px;width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#ff6ab3,#7b35ff);box-shadow:inset -8px -8px 0 rgba(0,0,0,.12)}.sd-focus-title{font-size:14px;font-weight:800;letter-spacing:.02em;position:relative;z-index:1}.sd-timer{font-size:54px;line-height:1;font-weight:800;margin:16px 0;letter-spacing:0;position:relative;z-index:1}.sd-focus-mascot{height:110px;margin:0 auto 14px;width:132px;position:relative}.sd-tomato{position:absolute;left:28px;top:8px;width:94px;height:94px;border-radius:50%;background:linear-gradient(135deg,#ff623d,#e82922);box-shadow:0 16px 22px rgba(0,0,0,.28)}.sd-tomato::before{content:"";position:absolute;left:26px;top:-10px;width:44px;height:25px;border-radius:60% 60% 0 0;background:#4abe45}.sd-tomato::after{content:":)";position:absolute;left:0;right:0;top:30px;text-align:center;color:#1f1234;font-size:32px;font-weight:800}.sd-headphones{position:absolute;left:16px;top:18px;width:118px;height:72px;border:8px solid #44d06f;border-bottom:0;border-radius:70px 70px 0 0}.sd-focus-select{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:rgba(255,255,255,.12);padding:8px 12px;font-size:12px;font-weight:800}.sd-focus-btn{width:100%;border:0;border-radius:20px;padding:14px;margin:14px 0;background:linear-gradient(135deg,#22d579,#92df4e);color:#fff;font-weight:800;font-size:14px;cursor:pointer}.sd-focus-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.sd-focus-slots button{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.06);border-radius:14px;color:#fff;font-weight:800;padding:10px 8px;cursor:pointer}.sd-focus-slots button.active{border-color:#f070ff;box-shadow:0 0 0 1px #f070ff inset}
.sd-snapshot-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:10px}.sd-studio-card{min-height:150px;border:1px solid rgba(255,255,255,.24);border-radius:18px;padding:16px;text-align:left;cursor:pointer;color:#fff;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:linear-gradient(135deg,#132868,#1d57b8 52%,#0ea5e9);background-size:180% 180%;box-shadow:0 14px 26px rgba(14,165,233,.18);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s}.sd-studio-card:hover{transform:translateY(-4px);box-shadow:0 18px 34px rgba(14,165,233,.28);animation:sdGlowMove 2.8s ease infinite}[data-theme="dark"] .sd-studio-card{background:linear-gradient(135deg,rgba(19,40,104,.85),rgba(29,87,184,.75) 52%,rgba(14,165,233,.65));border-color:rgba(56,189,248,.25);box-shadow:0 16px 36px rgba(0,0,0,.45),0 0 24px -4px rgba(14,165,233,.25)}.sd-studio-title{font-size:17px;font-weight:800;margin-bottom:7px;position:relative;z-index:1}.sd-studio-text{font-size:12px;font-weight:700;line-height:1.45;max-width:230px;color:rgba(255,255,255,.86);position:relative;z-index:1}.sd-studio-art{position:absolute;right:12px;bottom:0;width:112px;height:112px;object-fit:contain;filter:drop-shadow(0 14px 16px rgba(0,0,0,.28));animation:sdBreathe 4.5s ease-in-out infinite}.sd-snapshot-stack{display:grid;gap:10px}.sd-micro{border:1px solid var(--sd-line);border-radius:14px;background:var(--sd-card-soft);min-height:70px;padding:12px;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif;transition:transform .18s,box-shadow .18s}.sd-micro:hover{transform:translateY(-3px);box-shadow:var(--sd-shadow-soft)}.sd-micro-ico{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;font-size:21px;background:var(--micro-bg)}.sd-micro b{display:block;font-size:12.5px;color:var(--sd-ink)}.sd-micro span{display:block;font-size:10.5px;font-weight:700;color:var(--sd-muted);margin-top:2px}
.sd-focus{position:relative;overflow:hidden;border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.86) 0%,rgba(255,244,236,.72) 45%,rgba(254,242,242,.78) 100%);border:1px solid rgba(255,255,255,.85);color:var(--sd-ink);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);box-shadow:0 14px 34px -10px rgba(255,107,74,.22),0 6px 18px rgba(35,44,87,.06),inset 0 1px 2px rgba(255,255,255,.9);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}[data-theme="dark"] .sd-focus{background:linear-gradient(145deg,rgba(32,24,48,.82) 0%,rgba(18,24,46,.75) 55%,rgba(14,20,38,.86) 100%);border:1px solid rgba(255,107,74,.28);color:#f8fafc;box-shadow:0 18px 44px -10px rgba(0,0,0,.65),0 0 28px -6px rgba(255,107,74,.24),inset 0 1px 1px rgba(255,255,255,.16)}.sd-focus::before{content:"";position:absolute;right:-32px;top:-32px;width:124px;height:124px;border-radius:50%;background:radial-gradient(circle,rgba(255,107,74,.32),transparent 70%);filter:blur(8px);pointer-events:none}[data-theme="dark"] .sd-focus::before{background:radial-gradient(circle,rgba(255,107,74,.42),transparent 70%)}.sd-focus::after{content:"";position:absolute;left:-25px;bottom:-25px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,rgba(255,163,64,.24),transparent 70%);filter:blur(10px);pointer-events:none}[data-theme="dark"] .sd-focus::after{background:radial-gradient(circle,rgba(255,163,64,.3),transparent 70%)}.sd-focus-title{font-size:13px;font-weight:900;letter-spacing:.04em;position:relative;z-index:1;color:#e05638;display:inline-flex;align-items:center;gap:6px}[data-theme="dark"] .sd-focus-title{color:#ff8e72}.sd-timer{font-size:52px;line-height:1;font-weight:900;margin:14px 0;letter-spacing:-.02em;position:relative;z-index:1;color:var(--sd-ink);font-variant-numeric:tabular-nums}[data-theme="dark"] .sd-timer{color:#ffffff;text-shadow:0 0 28px rgba(255,120,80,.4)}.sd-focus-mascot{height:110px;margin:0 auto 14px;width:132px;position:relative}.sd-tomato{position:absolute;left:28px;top:8px;width:94px;height:94px;border-radius:50%;background:linear-gradient(135deg,#ff623d,#e82922);box-shadow:0 16px 22px rgba(0,0,0,.28)}.sd-tomato::before{content:"";position:absolute;left:26px;top:-10px;width:44px;height:25px;border-radius:60% 60% 0 0;background:#4abe45}.sd-tomato::after{content:":)";position:absolute;left:0;right:0;top:30px;text-align:center;color:#1f1234;font-size:32px;font-weight:800}.sd-headphones{position:absolute;left:16px;top:18px;width:118px;height:72px;border:8px solid #44d06f;border-bottom:0;border-radius:70px 70px 0 0}.sd-focus-select{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:rgba(255,107,74,.10);border:1px solid rgba(255,107,74,.22);color:#e05638;padding:7px 13px;font-size:11.5px;font-weight:800;backdrop-filter:blur(8px);position:relative;z-index:1}[data-theme="dark"] .sd-focus-select{background:rgba(255,107,74,.16);border-color:rgba(255,107,74,.32);color:#ffb39e}.sd-focus-btn{width:100%;border:0;border-radius:18px;padding:13px;margin:14px 0 12px;background:linear-gradient(135deg,#ff6b4a,#ff9436);color:#fff;font-weight:900;font-size:13.5px;cursor:pointer;position:relative;z-index:1;box-shadow:0 8px 20px -4px rgba(255,107,74,.42);transition:transform .18s ease,box-shadow .18s ease,background .18s ease}.sd-focus-btn:hover{transform:translateY(-2px);box-shadow:0 12px 26px -4px rgba(255,107,74,.55)}[data-theme="dark"] .sd-focus-btn{box-shadow:0 8px 24px -2px rgba(255,107,74,.48)}.sd-focus-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;position:relative;z-index:1}.sd-focus-slots button{border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:14px;color:var(--sd-ink);font-weight:800;padding:9px 6px;cursor:pointer;transition:all .18s ease}[data-theme="dark"] .sd-focus-slots button{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12);color:#e2e8f0}.sd-focus-slots button:hover{transform:translateY(-1px);border-color:rgba(255,107,74,.4)}.sd-focus-slots button.active{border-color:#ff6b4a;background:rgba(255,107,74,.14);color:#e05638;box-shadow:0 0 0 1px #ff6b4a inset,0 4px 12px rgba(255,107,74,.22)}[data-theme="dark"] .sd-focus-slots button.active{border-color:#ff8e72;background:rgba(255,107,74,.22);color:#ffc4b3;box-shadow:0 0 0 1px #ff8e72 inset,0 0 16px rgba(255,107,74,.35)}
.sd-focus-mascot-img{height:124px;margin:0 auto 12px;display:block;object-fit:contain;filter:drop-shadow(0 16px 18px rgba(0,0,0,.3))}.sd-focus-mascot{display:none}
.sd-goal{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--sd-line)}.sd-goal:last-child{border-bottom:0}.sd-check{width:20px;height:20px;border-radius:6px;background:#2389ff;color:#fff;display:grid;place-items:center;font-size:13px;font-weight:800;flex:0 0 auto}.sd-goal-body{flex:1;min-width:0}.sd-goal-top{display:flex;justify-content:space-between;gap:12px;font-size:13px;font-weight:800;color:var(--sd-ink);margin-bottom:8px}.sd-goal-track{height:6px;border-radius:999px;background:rgba(99,102,241,.15);overflow:hidden}.sd-goal-track span{display:block;height:100%;border-radius:inherit;background:#6349ff}.sd-encourage{text-align:center;color:#0ba464;font-size:14px;font-weight:800;margin-top:14px}
.sd-progress-wrap{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center}.sd-progress-chart{height:150px;position:relative}.sd-progress-center{position:absolute;inset:0;display:grid;place-items:center;text-align:center;font-weight:800;color:var(--sd-ink)}.sd-progress-center b{font-size:38px;line-height:1}.sd-progress-center span{display:block;font-size:12px;color:var(--sd-muted)}.sd-sub-list{display:flex;flex-direction:column;gap:12px}.sd-sub-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;font-weight:800;color:var(--sd-ink)}.sd-sub-row span:first-child{display:flex;align-items:center;gap:8px;color:var(--sd-muted)}
.sd-streak-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;margin:6px 0 16px}.sd-streak-num{font-size:22px;font-weight:800;color:var(--sd-ink)}.sd-streak-label{font-size:11px;font-weight:800;color:var(--sd-muted)}.sd-week{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;text-align:center}.sd-day{font-size:11px;font-weight:800;color:var(--sd-muted)}.sd-day-dot{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;margin:7px auto 0;background:#14915d;color:#fff;font-size:12px;font-weight:800}.sd-day-dot.pending{background:transparent;border:2px solid #9aa4bf;color:transparent}.sd-tip-card{background:linear-gradient(135deg,#e8f5ff,#f4fbff);position:relative;overflow:hidden;min-height:176px}[data-theme="dark"] .sd-tip-card{background:linear-gradient(135deg,rgba(41,70,111,.74),rgba(22,35,63,.92))}.sd-tip-card p{max-width:205px;font-size:13px;line-height:1.55;font-weight:700;color:var(--sd-ink);margin-top:14px}.sd-tip-art{position:absolute;right:18px;bottom:18px;font-size:74px}.sd-badge-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;text-align:center}.sd-badge{min-width:0}.sd-badge-shape{width:54px;height:60px;margin:0 auto 8px;clip-path:polygon(50% 0,93% 20%,93% 72%,50% 100%,7% 72%,7% 20%);display:grid;place-items:center;color:#fff;font-size:26px;box-shadow:0 9px 18px rgba(0,0,0,.16)}.sd-badge-name{font-size:10px;font-weight:800;color:var(--sd-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sd-tip-art-img{position:absolute;right:14px;bottom:12px;width:92px;height:92px;object-fit:contain}
.sd-subject-grid{grid-template-columns:repeat(5,1fr)}
.sd-subject{min-height:158px;border-radius:16px;padding:14px 12px;background:var(--subject-bg);box-shadow:0 10px 22px rgba(38,57,116,.12);transition:transform .2s,box-shadow .2s}
.sd-subject::before{content:"";position:absolute;inset:-40px -26px auto auto;width:116px;height:116px;border-radius:50%;background:rgba(255,255,255,.33)}
.sd-subject::after{left:16px;right:16px;bottom:14px;width:auto;height:10px;border-radius:999px;background:rgba(255,255,255,.52)}
.sd-subject:hover{transform:translateY(-5px) rotate(-.45deg);box-shadow:0 18px 30px rgba(38,57,116,.18)}
.sd-subject-name{font-size:16px;margin-bottom:10px}
.sd-subject-art{position:relative;left:auto;top:auto;transform:none;width:72px;height:72px;border-radius:24px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.82),rgba(255,255,255,.36));font-size:42px;box-shadow:inset 0 -8px 0 rgba(0,0,0,.06),0 14px 20px rgba(0,0,0,.12);animation:sdPop3d 4.2s ease-in-out infinite;animation-delay:var(--delay,0s)}
.sd-subject-art-img{position:relative;left:auto;top:auto;transform:none;width:82px;height:82px;border-radius:24px;display:block;object-fit:contain;padding:4px;background:linear-gradient(145deg,rgba(255,255,255,.84),rgba(255,255,255,.30));box-shadow:inset 0 -8px 0 rgba(0,0,0,.06),0 14px 20px rgba(0,0,0,.12);animation:sdPop3d 4.2s ease-in-out infinite;animation-delay:var(--delay,0s);z-index:1}
.sd-subject-progress{position:absolute;left:12px;right:12px;bottom:30px;font-size:12px}
.sd-subject-bar{position:absolute;left:16px;right:16px;bottom:14px;height:10px;margin:0;background:rgba(255,255,255,.52)}
.sd-subject-bar span{background:rgba(7,18,53,.82)}
.sd-play{min-height:124px;border-radius:16px}
.sd-play::after{content:"";position:absolute;right:-24px;bottom:-36px;width:106px;height:106px;border-radius:50%;background:rgba(255,255,255,.14)}
.sd-play h3{max-width:118px}.sd-play p{max-width:112px;color:rgba(255,255,255,.9)}
.sd-play-icon{position:absolute;right:12px;bottom:11px;width:58px;height:58px;border-radius:20px;display:grid;place-items:center;font-size:36px;background:linear-gradient(145deg,rgba(255,255,255,.82),rgba(255,255,255,.26));box-shadow:inset 0 -8px 0 rgba(0,0,0,.08),0 12px 18px rgba(0,0,0,.18);filter:drop-shadow(0 8px 10px rgba(0,0,0,.16));animation:sdPop3d 4.4s ease-in-out infinite;animation-delay:var(--delay,0s);z-index:1}
.sd-play:hover .sd-play-icon{animation:sdWiggle .65s ease both}
.sd-rec{min-height:130px;background:linear-gradient(180deg,var(--sd-card),var(--sd-card-soft));padding:13px 74px 13px 13px}
.sd-rec::after{content:"";position:absolute;right:-28px;bottom:-34px;width:110px;height:110px;border-radius:50%;background:var(--rec-bg,rgba(99,91,255,.12));z-index:0}
.sd-rec-type,.sd-rec-title,.sd-rec-meta{position:relative;z-index:1}
.sd-rec-title{max-width:140px}
.sd-rec-art{right:14px;bottom:12px;width:54px;height:54px;border-radius:18px;display:grid;place-items:center;font-size:34px;background:linear-gradient(145deg,rgba(255,255,255,.92),rgba(255,255,255,.42));box-shadow:inset 0 -7px 0 rgba(0,0,0,.06),0 10px 16px rgba(30,41,59,.14);animation:sdPop3d 4s ease-in-out infinite;animation-delay:var(--delay,0s);z-index:1}
.sd-progress-card{background:linear-gradient(145deg,rgba(255,255,255,.92),rgba(239,247,255,.9));position:relative;overflow:hidden}
[data-theme="dark"] .sd-progress-card{background:linear-gradient(145deg,rgba(25,36,72,.94),rgba(18,27,53,.9))}
.sd-progress-card::before{content:"";position:absolute;right:-36px;top:-42px;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle,rgba(255,178,29,.28),transparent 68%);animation:sdBreathe 5s ease-in-out infinite}
.sd-progress-card::after{content:"";position:absolute;left:-42px;bottom:-58px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(35,137,255,.18),transparent 70%);animation:sdDrift 10s ease-in-out infinite}
.sd-progress-wrap{grid-template-columns:minmax(0,124px) minmax(0,1fr);gap:10px;position:relative;z-index:1}
.sd-progress-summary{min-width:0}
.sd-progress-chart{height:146px}
.sd-progress-chart::before{content:"";position:absolute;inset:13px;border-radius:50%;border:1px dashed rgba(99,91,255,.3);animation:sdOrbit 7s linear infinite}
.sd-progress-center b{font-size:27px}
.sd-progress-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:7px 10px;background:rgba(99,91,255,.11);color:#5548ff;font-size:11px;font-weight:800;margin-bottom:12px}
.sd-progress-summary{position:relative;z-index:1}
.sd-sub-list{gap:10px}
.sd-sub-row{display:block;font-size:12.5px}
.sd-sub-row-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
.sd-sub-row-top span:first-child{display:flex;align-items:center;gap:8px;color:var(--sd-muted)}
.sd-sub-mini-track{height:7px;border-radius:999px;background:rgba(99,102,241,.12);overflow:hidden;position:relative}
.sd-sub-mini-track span{display:block;height:100%;border-radius:inherit;position:relative}
.sd-sub-mini-track span::after{content:"";position:absolute;top:0;bottom:0;width:34px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:sdProgressSweep 2.8s ease-in-out infinite}
.sd-tip-card{background:linear-gradient(135deg,#fff7df,#e8f5ff);padding-right:106px}
[data-theme="dark"] .sd-tip-card{background:linear-gradient(135deg,rgba(58,45,22,.82),rgba(22,35,63,.92))}
.sd-tip-card p{max-width:188px;position:relative;z-index:1}
.sd-tip-card::after{content:"";position:absolute;right:-26px;bottom:-34px;width:116px;height:116px;border-radius:50%;background:rgba(255,188,31,.18);animation:sdBreathe 5.6s ease-in-out infinite}
.sd-tip-art{position:absolute;right:16px;bottom:18px;width:72px;height:72px;border-radius:24px;display:grid;place-items:center;font-size:45px;background:linear-gradient(145deg,#fff,#ffe39a);box-shadow:inset 0 -9px 0 rgba(151,94,11,.12),0 14px 20px rgba(151,94,11,.16);animation:sdPop3d 4.4s ease-in-out infinite;z-index:1}
.sd-hero{display:grid;grid-template-columns:minmax(0,1fr) 255px;gap:18px;align-items:center;min-height:252px;padding:24px;background:linear-gradient(135deg,#eef8ff 0%,#efffed 48%,#fff5d7 100%);border-color:rgba(35,137,255,.16)}
[data-theme="dark"] .sd-hero{background:linear-gradient(135deg,#101b3f 0%,#123326 55%,#392a16 100%)}
.sd-hero-content{max-width:460px}
.sd-lesson-title{display:flex;align-items:center;gap:10px;font-size:clamp(24px,2.9vw,34px)}
.sd-lesson-title-art{width:48px;height:48px;flex:0 0 auto;object-fit:contain;padding:4px;border-radius:14px;background:rgba(255,255,255,.72);box-shadow:0 8px 14px rgba(38,57,116,.14);filter:drop-shadow(0 6px 8px rgba(38,57,116,.16));animation:sdPop3d 4.2s ease-in-out infinite}
.sd-progress-line{max-width:340px}
.sd-hero-panel{position:relative;z-index:2;min-height:204px;border-radius:20px;padding:16px;background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.72);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 18px 34px rgba(38,57,116,.13);overflow:hidden;display:flex;flex-direction:column;justify-content:space-between}
[data-theme="dark"] .sd-hero-panel{background:rgba(15,23,42,.34);border-color:rgba(255,255,255,.12)}
.sd-hero-panel::before{content:"";position:absolute;right:-34px;top:-34px;width:122px;height:122px;border-radius:50%;background:rgba(35,137,255,.16);animation:sdBreathe 5s ease-in-out infinite}
.sd-hero-panel::after{content:"";position:absolute;left:-38px;bottom:-48px;width:150px;height:150px;border-radius:50%;background:rgba(255,178,29,.18);animation:sdDrift 8s ease-in-out infinite}
.sd-hero-orbit{position:relative;z-index:1;width:108px;height:108px;border-radius:32px;display:grid;place-items:center;margin-left:auto;background:linear-gradient(145deg,#fff,#dff6ff);box-shadow:inset 0 -10px 0 rgba(35,137,255,.08),0 18px 26px rgba(38,57,116,.16);font-size:56px;animation:sdPop3d 4.1s ease-in-out infinite}
.sd-hero-orbit img{width:100%;height:100%;padding:10px;object-fit:contain;border-radius:inherit;filter:drop-shadow(0 10px 12px rgba(38,57,116,.18))}
.sd-hero-stats{position:relative;z-index:1;display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.sd-hero-stat{border-radius:14px;padding:10px;background:rgba(255,255,255,.72);border:1px solid rgba(15,23,42,.07)}
[data-theme="dark"] .sd-hero-stat{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.10)}
.sd-hero-stat b{display:block;font-size:18px;color:var(--sd-ink);line-height:1}.sd-hero-stat span{display:block;margin-top:4px;font-size:10px;font-weight:800;color:var(--sd-muted)}
.sd-ai{background-image:radial-gradient(circle at 18% 22%,rgba(75,217,255,.26),transparent 24%),radial-gradient(circle at 86% 18%,rgba(255,178,29,.20),transparent 25%),linear-gradient(135deg,#10194e,#0c2f5a 52%,#13235f)}
.sd-ai-body{grid-template-columns:156px minmax(0,1fr);gap:16px}
.sd-geni-stage{position:relative;z-index:1;height:140px;border-radius:24px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.14);overflow:hidden}
.sd-geni-stage::before{content:"";position:absolute;inset:auto auto -38px -28px;width:96px;height:96px;border-radius:50%;background:rgba(36,215,255,.20);animation:sdDrift 7s ease-in-out infinite}
.sd-geni-gif{position:relative;z-index:1;width:118px;height:118px;object-fit:contain;filter:drop-shadow(0 18px 18px rgba(0,0,0,.30));animation:sdBreathe 4.2s ease-in-out infinite}
.sd-prompt-card{align-content:center;gap:5px}
.sd-subject{min-height:218px;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:8px}
.sd-subject::after{display:none}
.sd-subject-name{margin:0;font-size:16px}
.sd-subject-visual{position:relative;z-index:1;min-height:112px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.78),rgba(255,255,255,.28));box-shadow:inset 0 -8px 0 rgba(0,0,0,.05);overflow:hidden}
.sd-subject-visual::before{content:"";position:absolute;inset:auto -20px -36px auto;width:92px;height:92px;border-radius:50%;background:rgba(255,255,255,.28)}
.sd-subject-art-img{width:110px;height:100px;padding:0;background:transparent;box-shadow:none;border-radius:0;filter:drop-shadow(0 13px 14px rgba(0,0,0,.15))}
.sd-subject-footer{position:relative;z-index:1;margin-top:auto;padding:10px;border-radius:14px;}
.sd-subject-progress{position:relative;left:auto;right:auto;bottom:auto;font-size:12px;margin-bottom:7px}
.sd-subject-bar{position:relative;left:auto;right:auto;bottom:auto;height:8px;margin:0;background:rgba(7,18,53,.14)}
@media(min-width:1181px){.sd-mini-stats{display:none}}@media(max-width:1280px){.sd-grid{grid-template-columns:1fr}.sd-rail{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.sd-focus{grid-row:span 2}.sd-subject-grid,.sd-play-grid,.sd-rec-grid{grid-template-columns:repeat(4,1fr)}}@media(max-width:1024px){.sd-root{padding:16px}.sd-mini-stats{justify-content:flex-start}.sd-greeting{align-items:flex-start;flex-direction:column}.sd-subject-grid,.sd-play-grid,.sd-rec-grid,.sd-plan-grid,.sd-skill-grid{grid-template-columns:repeat(2,1fr)}.sd-snapshot-grid{grid-template-columns:1fr}.sd-journey{grid-template-columns:repeat(2,1fr)}.sd-plant{right:24px;opacity:.72}.sd-quote{display:none}.sd-hero-content{max-width:520px}}@media(max-width:760px){.sd-root{padding:12px}.sd-grid{margin-top:18px!important}.sd-rail{display:flex}.sd-hero{min-height:0;padding:22px;border-radius:20px}.sd-plant{display:none}.sd-ai-body{grid-template-columns:1fr}.sd-bot-img{display:none}.sd-action-row{grid-template-columns:repeat(2,1fr)}.sd-subject-grid,.sd-play-grid,.sd-rec-grid,.sd-journey,.sd-plan-grid,.sd-skill-grid,.sd-snapshot-grid{grid-template-columns:1fr}.sd-subject.image-card,.sd-subject-img{min-height:156px}.sd-progress-wrap{grid-template-columns:1fr}.sd-progress-chart{max-width:190px;margin:0 auto}.sd-title{font-size:30px}.sd-timer{font-size:50px}.sd-mini-pill{flex:1;min-width:126px}.sd-studio-art{width:92px;height:92px}}@media(max-width:420px){.sd-root{padding:10px}.sd-card{padding:16px;border-radius:18px}.sd-mini-pill{min-width:100%}.sd-action-row{grid-template-columns:1fr}.sd-focus-slots{grid-template-columns:1fr}.sd-badge-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){.sd-hero{grid-template-columns:1fr}.sd-hero-panel{min-height:170px}.sd-ai-body{grid-template-columns:1fr}.sd-geni-stage{height:118px}.sd-subject{min-height:206px}}
@media(min-width:1025px){.sd-subject-grid{grid-template-columns:repeat(5,1fr)}}@media(max-width:1024px) and (min-width:761px){.sd-subject-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:420px){.sd-tip-card{padding-right:78px}.sd-tip-art{width:56px;height:56px;font-size:34px}}

.sd-root{padding:12px}.sd-shell{max-width:1160px}.sd-grid{grid-template-columns:minmax(0,1fr) 272px;gap:16px}.sd-main,.sd-rail{gap:12px}.sd-title{font-size:20px}.sd-subtitle{font-size:11.5px}.sd-section-head{gap:8px;margin-bottom:9px}.sd-section-title,.sd-rail .sd-section-title{font-size:16px!important}.sd-link{font-size:11px}.sd-card{border-radius:14px;padding:12px}.sd-hero{min-height:220px;padding:18px;border-radius:16px;gap:14px;grid-template-columns:minmax(0,1fr) 218px}.sd-lesson-title{font-size:clamp(22px,2.5vw,28px);margin:10px 0 7px}.sd-lesson-meta{font-size:11px}.sd-progress-line{margin:14px 0 12px}.sd-primary-btn{padding:9px 14px;min-height:36px;font-size:11px}.sd-hero-panel{min-height:184px;padding:12px;border-radius:16px}.sd-hero-orbit{width:88px;height:88px;font-size:44px;border-radius:24px}.sd-hero-stat{padding:8px;border-radius:11px}.sd-hero-stat b{font-size:16px}.sd-studio-card{min-height:126px;padding:13px;border-radius:14px}.sd-studio-title{font-size:15px}.sd-studio-text{font-size:11px}.sd-studio-art{width:96px;height:96px}.sd-micro{min-height:59px;padding:10px;gap:8px}.sd-micro-ico{width:32px;height:32px;font-size:17px;border-radius:10px}.sd-micro b{font-size:11px}.sd-micro span{font-size:9.5px}.sd-plan{min-height:76px;padding:10px}.sd-plan-title{font-size:12px;margin:5px 0 3px}.sd-plan-meta{font-size:10px}.sd-subject{min-height:190px;padding:10px;border-radius:14px;gap:6px}.sd-subject-name{font-size:14px}.sd-subject-visual{min-height:94px;border-radius:14px}.sd-subject-art-img{width:92px;height:84px}.sd-subject-footer{padding:7px}.sd-subject-progress{font-size:11px;margin-bottom:5px}.sd-subject-bar{height:7px}.sd-play{min-height:108px;padding:11px;border-radius:14px}.sd-play h3{font-size:12px}.sd-play p{font-size:9.5px}.sd-play-icon{width:50px;height:50px;font-size:30px;border-radius:16px}.sd-step{min-height:68px;padding:10px;gap:8px;border-radius:14px}.sd-step-num{width:28px;height:28px;font-size:11px;border-radius:10px}.sd-step b{font-size:11px}.sd-step span{font-size:9px}.sd-rec{min-height:112px;padding:11px 66px 11px 11px}.sd-rec-title{font-size:11.5px}.sd-rec-meta,.sd-rec-type{font-size:10px}.sd-rec-art{width:48px;height:48px;font-size:29px;border-radius:15px}.sd-focus-title{font-size:12px}.sd-timer{font-size:44px;margin:12px 0}.sd-focus-mascot-img{height:106px;margin-bottom:9px}.sd-focus-select{padding:6px 9px;font-size:10px}.sd-focus-btn{padding:11px;margin:10px 0;font-size:12px}.sd-focus-slots{gap:6px}.sd-focus-slots button{padding:8px 5px;font-size:10px}.sd-goal{gap:9px;padding:10px 0}.sd-check{width:18px;height:18px;font-size:11px}.sd-goal-top{font-size:11px;margin-bottom:6px}.sd-encourage{font-size:12px;margin-top:10px}.sd-progress-wrap{grid-template-columns:minmax(0,116px) minmax(0,1fr);gap:8px}.sd-progress-chart{height:116px}.sd-progress-center b{font-size:23px}.sd-progress-center span{font-size:10px}.sd-progress-badge{font-size:9.5px;padding:5px 7px;margin-bottom:8px}.sd-sub-list{gap:8px}.sd-sub-row{font-size:11px}.sd-sub-row-top{gap:6px;margin-bottom:4px}.sd-sub-row span:first-child{gap:5px}.sd-sub-mini-track{height:5px}.sd-streak-row{gap:8px;margin:4px 0 11px}.sd-streak-num{font-size:18px}.sd-streak-label{font-size:9px}.sd-week{gap:5px}.sd-day{font-size:9px}.sd-day-dot{width:20px;height:20px;margin-top:5px;font-size:10px}.sd-tip-card{min-height:148px}.sd-tip-card p{font-size:11px;margin-top:10px}.sd-tip-art{width:62px;height:62px;font-size:38px}
@media(max-width:760px){.sd-root{padding:10px}.sd-grid{grid-template-columns:1fr;gap:12px}.sd-hero{grid-template-columns:1fr;padding:16px}.sd-title{font-size:24px}.sd-progress-wrap{grid-template-columns:1fr}.sd-progress-chart{height:128px;max-width:170px;margin:0 auto}.sd-card{padding:12px}}
.sd-progress-wrap{display:block}.sd-progress-overview{padding:10px 0 12px;position:relative;z-index:1}.sd-progress-number{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:9px}.sd-progress-number strong{font-size:29px;line-height:1;color:var(--sd-ink)}.sd-progress-number span{font-size:10px;font-weight:800;color:var(--sd-muted)}.sd-progress-meter{height:10px;border-radius:999px;background:rgba(35,137,255,.12);overflow:hidden;box-shadow:inset 0 1px 2px rgba(15,23,42,.08)}.sd-progress-meter span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2389ff,#6349ff 72%,#ffb21d);position:relative}.sd-progress-meter span::after{content:"";position:absolute;inset:0 auto 0 0;width:30%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);animation:sdProgressSweep 2.8s ease-in-out infinite}.sd-progress-scale{display:flex;justify-content:space-between;gap:6px;margin-top:6px;font-size:9px;font-weight:700;color:var(--sd-faint)}.sd-progress-scale b{color:var(--sd-ink)}.sd-hero{background:linear-gradient(118deg,#dff5ff 0%,#eef2ff 48%,#fff1d6 100%);border-color:rgba(35,137,255,.2)}[data-theme="dark"] .sd-hero{background:linear-gradient(118deg,#102b43 0%,#20264f 52%,#49321c 100%);border-color:rgba(116,190,255,.24)}
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
  rocket: "\u{1F680}", globe: "\u{1F30D}", pencil: "\u{270F}\u{FE0F}", check: "\u{2713}", leaf: "\u{1F331}", idea: "\u{1F4A1}",
  tamil: "\u{1F4DC}", atoms: "\u{269B}\u{FE0F}", map: "\u{1F5FA}\u{FE0F}", abacus: "\u{1F9EE}", dice: "\u{1F3B2}",
  medal: "\u{1F947}", film: "\u{1F3AC}", tools: "\u{1F6E0}\u{FE0F}", compass: "\u{1F9ED}", water: "\u{1F4A7}",
};

export default function StudentDashboard({ onStartQuiz }: StudentDashboardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusRemaining, setFocusRemaining] = useState(25 * 60);
  const [focusActive, setFocusActive] = useState(false);
  const [heroImageError, setHeroImageError] = useState(false);
  const { data: dashboard, isLoading } = useQuery<any>({
    queryKey: ["/api/v1/student/dashboard"],
    queryFn: getStudentDashboard,
  });
  const { data: librarySubjects } = useQuery<LibrarySubject[]>({
    queryKey: ["/api/v1/library/subjects"],
    queryFn: async () => getLibrarySubjects(undefined),
    staleTime: 5 * 60 * 1000,
  });

  const stats: StudentStats = dashboard?.stats || {};
  const recentActivity = dashboard?.recentActivity || [];
  const achievements = dashboard?.achievements || [];

  const subjectDist = useMemo(() => {
    const source = dashboard?.subjectDistribution?.length
      ? dashboard.subjectDistribution
      : [
          { name: "Science", value: Number(stats.completionRate || 72) },
          { name: "Mathematics", value: Number(stats.averageScore || 58) },
          { name: "English", value: 64 },
          { name: "History", value: 40 },
        ];
    return source.slice(0, 4).map((item: any, index: number) => ({
      name: item.name || `Subject ${index + 1}`,
      value: Math.max(0, Math.min(100, Number(item.value || 0))),
      color: SUBJECT_PALETTE[index % SUBJECT_PALETTE.length],
    }));
  }, [dashboard, stats.averageScore, stats.completionRate]);

  const liveCourses = (recentActivity.length ? recentActivity : [
    { title: "Photosynthesis in Plants", subject: "Science", unit: "Chapter 6", progressPercent: 72 },
    { title: "Speed Maths Practice", subject: "Mathematics", unit: "Chapter 4", progressPercent: 58 },
    { title: "Creative Writing", subject: "English", unit: "Chapter 3", progressPercent: 64 },
    { title: "Ancient Kingdoms", subject: "History", unit: "Chapter 2", progressPercent: 40 },
  ]).slice(0, 4);

  const heroCourse = liveCourses[0] || {};
  const heroLibraryBook = useMemo(() => {
    const availableLibrarySubjects: LibrarySubject[] = librarySubjects || [];
    const courseTitle = normalizeLearningText(heroCourse.title);
    const courseSubject = normalizeLearningText(heroCourse.subject);
    return availableLibrarySubjects.find((book) => {
      const bookTitle = normalizeLearningText(book.title);
      const bookSubject = normalizeLearningText(book.subject);
      return (
        (courseTitle && (courseTitle.includes(bookTitle) || bookTitle.includes(courseTitle))) ||
        (courseSubject && (courseSubject === bookSubject || bookSubject.includes(courseSubject)))
      );
    });
  }, [heroCourse.subject, heroCourse.title, librarySubjects]);
  const heroLibraryImage = heroLibraryBook
    ? heroLibraryBook.coverImageUrl || heroLibraryBook.imageCandidates?.[0]
    : null;
  const heroImage = !heroImageError && heroLibraryImage
    ? buildApiUrl(heroLibraryImage)
    : getSubjectFallbackImage(heroCourse.subject);
  const overallProgress = Math.round(Number(stats.completionRate || subjectDist[0]?.value || 0));
  const streakDays = Number(stats.streakDays || stats.currentLevel || 7);
  const totalPoints = Number(stats.totalPoints || 1240);
  const badgesEarned = Number(stats.badgesEarned || achievements.filter((a: any) => a.unlocked).length || 26);
  const firstName = user?.firstName || "Teny";

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
    { label: "Study for 60 minutes", value: Math.min(60, Number(stats.studyTimeMinutes || 42)), total: 60, color: "#635bff" },
    { label: "Complete 10 questions", value: Math.min(10, Number(stats.lessonsCompleted || 6)), total: 10, color: "#12a66a" },
    { label: "Learn a new concept", value: 1, total: 1, color: "#7e45e8" },
  ];

  const playCards = [
    { title: "Progress", text: "Track your learning", icon: icon.target, bg: "linear-gradient(135deg,#ff5f99,#ff9f54)", action: () => setLocation("/progress") },
    { title: "AI Tutor", text: "Ask Geni anything", icon: icon.chat, bg: "linear-gradient(135deg,#2eb6ff,#2676e8)", action: () => setLocation("/ai-tutor") },
    // { title: "AI Tutor", text: "Ask Geni anything", icon: icon.chat, bg: "linear-gradient(135deg,#00c8e0,#0084f0)", action: () => setLocation("/ai-tutor") },
    { title: "Book Library", text: "Read and discover", icon: icon.book, bg: "linear-gradient(135deg,#40c95f,#11a48c)", action: () => setLocation("/bookExpanded") },
    { title: "Homework", text: "View your assignments", icon: icon.note, bg: "linear-gradient(135deg,#ff9c1a,#ff6c00)", action: () => setLocation("/homework") },
    { title: "Homework Helper", text: "Get help with tasks", icon: icon.bulb, bg: "linear-gradient(135deg,#8a4fff,#cf4bd8)", action: () => setLocation("/homework-helper") },
    // { title: "Homework Helper", text: "Get help with tasks", icon: icon.bulb, bg: "linear-gradient(135deg,#ff6b8b,#ff8e53)", action: () => setLocation("/homework-helper") },
    { title: "Community", text: "Learn together", icon: icon.chat, bg: "linear-gradient(135deg,#ff6578,#ff563c)", action: () => setLocation("/community") },
    { title: "Live Events", text: "Join upcoming sessions", icon: icon.video, bg: "linear-gradient(135deg,#00b9b4,#00a7e8)", action: () => setLocation("/live-events") },
    // { title: "Exams", text: "Prepare and test yourself", icon: icon.quiz, bg: "linear-gradient(135deg,#2778ff,#5548d9)", action: () => setLocation("/exam-preparation") },
    { title: "Exams", text: "Prepare and test yourself", icon: icon.quiz, bg: "linear-gradient(135deg,#3b82f6,#6366f1)", action: () => setLocation("/exam-preparation") },
  ];

  const recs = [
    { type: "Quiz", title: "Maths Speed Test", meta: "10 Questions", icon: icon.abacus, bg: "rgba(35,137,255,.15)", href: "/studio/quiz" },
    { type: "Watch", title: "Water Cycle Explained", meta: "8:45 min", icon: icon.water, bg: "rgba(0,167,200,.16)", href: "/courses" },
    { type: "AI Tutor", title: "Why is the sky blue?", meta: "Ask now", icon: icon.bulb, bg: "rgba(255,188,31,.18)", href: "/ai-tutor" },
    { type: "Read", title: "Positive Thinking", meta: "5 min read", icon: icon.book, bg: "rgba(126,69,232,.14)", href: "/bookExpanded" },
  ];

  const plans = [
    { time: "09:30 AM", title: "Science revision", meta: "Photosynthesis recap", color: "rgba(39,184,106,.18)" },
    { time: "11:00 AM", title: "Math practice", meta: "12 quick problems", color: "rgba(35,137,255,.18)" },
    { time: "04:15 PM", title: "Story session", meta: "Read for 15 minutes", color: "rgba(255,121,31,.18)" },
  ];

  const skills = [
    { icon: icon.bulb, name: "Concept Clarity", text: "2 topics ready", bg: "linear-gradient(135deg,#ffe07b,#ff9f54)", href: "/ai-tutor" },
    { icon: icon.quiz, name: "Fast Recall", text: "10 questions", bg: "linear-gradient(135deg,#8be7ff,#4f9bff)", href: "/studio/quiz" },
    { icon: icon.pencil, name: "Writing Boost", text: "1 short task", bg: "linear-gradient(135deg,#ff9fc5,#e86b9f)", href: "/homework-helper" },
  ];

  const microWins = [
    { icon: icon.target, title: "Weak Topic", text: "Practice fractions next", bg: "rgba(255,95,153,.15)", href: "/studio/quiz" },
    { icon: icon.rocket, title: "Quick Start", text: "One 8 min lesson ready", bg: "rgba(39,184,106,.16)", href: "/courses" },
  ];

  const subjectCards = [
    { name: "Tamil", image: tamilSubject, progress: 68, bg: "linear-gradient(135deg,#ffcf5a,#ff7b54)" },
    { name: "English", image: englishSubject, progress: 64, bg: "linear-gradient(135deg,#6ee7f2,#2389ff)" },
    { name: "Science", image: scienceSubject, progress: Math.round(Number(stats.completionRate || 72)), bg: "linear-gradient(135deg,#83e76d,#27b86a)" },
    { name: "Social", image: socialSubject, progress: 54, bg: "linear-gradient(135deg,#b48cff,#7e45e8)" },
    { name: "Maths", image: mathsSubject, progress: Math.round(Number(stats.averageScore || 58)), bg: "linear-gradient(135deg,#ff9f54,#ff5f99)" },
  ];

  const unlockedBadges = achievements.filter((a: any) => a.unlocked).slice(0, 4);

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
              <div className="sd-title">Hey {firstName}! {icon.wave}</div>
              <div className="sd-subtitle">You're doing awesome! Let's make today amazing! {icon.party}</div>
            </div>
            <div className="sd-mini-stats">
              {[
                { icon: icon.fire, value: streakDays, label: "Day Streak" },
                { icon: icon.star, value: totalPoints.toLocaleString(), label: "XP" },
                { icon: icon.gem, value: badgesEarned, label: "Gems" },
              ].map((item) => (
                <div className="sd-mini-pill" key={item.label}>
                  <div className="sd-pill-ico">{item.icon}</div>
                  <div><div className="sd-pill-num">{isLoading ? "..." : item.value}</div><div className="sd-pill-label">{item.label}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="sd-grid" style={{ marginTop: 22 }}>
            <main className="sd-main">
              <motion.section className="sd-hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
                <div className="sd-hero-content">
                  <div className="sd-chip">{icon.book} Continue Learning</div>
                  <h1 className="sd-lesson-title">
                    <span>{heroCourse.title || "Photosynthesis in Plants"}</span>
                    {heroImage ? <img src={heroImage} alt="" className="sd-lesson-title-art" onError={() => setHeroImageError(true)} /> : null}
                  </h1>
                  <div className="sd-lesson-meta">{heroCourse.subject || "Science"} {heroCourse.unit ? `- ${heroCourse.unit}` : "- Chapter 6"}</div>
                  <div className="sd-progress-line">
                    <div className="sd-progress-track"><div className="sd-progress-fill" style={{ width: `${Number(heroCourse.progressPercent || 72)}%` }} /></div>
                    <div className="sd-progress-text">{Number(heroCourse.progressPercent || 72)}% Completed</div>
                  </div>
                  <Link href="/bookExpanded"><button className="sd-primary-btn">Continue Lesson &gt;</button></Link>
                </div>
                <div className="sd-hero-panel" aria-hidden>
                  <div className="sd-hero-orbit">
                    {heroImage ? (
                      <img src={heroImage} alt="" onError={() => setHeroImageError(true)} />
                    ) : null}
                  </div>
                  <div className="sd-hero-stats">
                    <div className="sd-hero-stat"><b>{Number(heroCourse.progressPercent || 72)}%</b><span>Lesson</span></div>
                    <div className="sd-hero-stat"><b>{streakDays}d</b><span>Streak</span></div>
                  </div>
                </div>
              </motion.section>

              <section className="sd-snapshot-grid">
                <motion.button className="sd-studio-card" onClick={() => setLocation("/courses")} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08, duration: .36 }} whileTap={{ scale: .97 }}>
                  <div className="sd-studio-title">Learning Studio</div>
                  <div className="sd-studio-text">Jump back into lessons, videos, reading and homework from one place.</div>
                  <img src={learningIsland} alt="" className="sd-studio-art" />
                </motion.button>
                <div className="sd-snapshot-stack">
                  {microWins.map((item, index) => (
                    <motion.button key={item.title} className="sd-micro" onClick={() => setLocation(item.href)} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .1 + index * .04 }} whileTap={{ scale: .97 }}>
                      <div className="sd-micro-ico" style={{ "--micro-bg": item.bg } as CSSVars}>{item.icon}</div>
                      <div><b>{item.title}</b><span>{item.text}</span></div>
                    </motion.button>
                  ))}
                </div>
              </section>

              <section className="sd-card">
                <div className="sd-section-head"><h2 className="sd-section-title">Today's Plan</h2><Link href="/calendar" className="sd-link">Open calendar &gt;</Link></div>
                <div className="sd-plan-grid">
                  {plans.map((plan, index) => (
                    <motion.button key={plan.title} className="sd-plan" style={{ "--plan-glow": plan.color } as CSSVars} onClick={() => setLocation("/calendar")} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 + index * .04 }} whileTap={{ scale: .97 }}>
                      <div className="sd-plan-time">{plan.time}</div>
                      <div className="sd-plan-title">{plan.title}</div>
                      <div className="sd-plan-meta">{plan.meta}</div>
                    </motion.button>
                  ))}
                </div>
              </section>

              <section>
                <div className="sd-section-head"><h2 className="sd-section-title">Your Subjects</h2><Link href="/courses" className="sd-link">View all subjects &gt;</Link></div>
                <div className="sd-subject-grid">
                  {subjectCards.map((subject, index) => (
                      <motion.button key={subject.name} className="sd-subject" style={{ "--subject-bg": subject.bg, "--delay": `${index * -.22}s` } as CSSVars} onClick={() => setLocation("/courses")} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} aria-label={`${subject.name} subject`}>
                        <div className="sd-subject-name">{subject.name}</div>
                        <div className="sd-subject-visual">
                          <img src={subject.image} alt="" className="sd-subject-art-img" aria-hidden />
                        </div>
                        <div className="sd-subject-footer">
                          <div className="sd-subject-progress">{subject.progress}% ready</div>
                          <div className="sd-subject-bar"><span style={{ width: `${subject.progress}%` }} /></div>
                        </div>
                      </motion.button>
                  ))}
                </div>
              </section>

              <section><h2 className="sd-section-title" style={{ marginBottom: 14 }}>Explore & Play</h2><div className="sd-play-grid">{playCards.map((card, index) => <motion.button className="sd-play" key={card.title} style={{ background: card.bg, "--delay": `${index * -.18}s` } as CSSVars} onClick={card.action} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .025 }} whileTap={{ scale: .96 }}><h3>{card.title}</h3><p>{card.text}</p><span className="sd-play-icon" aria-hidden>{card.icon}</span></motion.button>)}</div></section>

              <section className="sd-card">
                <div className="sd-section-head"><h2 className="sd-section-title">Skill Boosters</h2><Link href="/ai-tutor" className="sd-link">Ask Geni &gt;</Link></div>
                <div className="sd-skill-grid">
                  {skills.map((skill, index) => (
                    <motion.button key={skill.name} className="sd-skill" style={{ "--skill-card-bg": skill.bg, "--delay": `${index * -.2}s` } as CSSVars} onClick={() => setLocation(skill.href)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 + index * .04 }} whileHover={{ y: -5 }} whileTap={{ scale: .97 }}>
                      <div className="sd-skill-icon">{skill.icon}</div>
                      <div><div className="sd-skill-name">{skill.name}</div><div className="sd-skill-text">{skill.text}</div></div>
                      <div className="sd-skill-arrow">&gt;</div>
                    </motion.button>
                  ))}
                </div>
              </section>

              <section className="sd-card sd-journey-card"><h2 className="sd-section-title" style={{ marginBottom: 16 }}>Your Learning Journey</h2><div className="sd-journey">{[["Learn", "Understand the topic", "linear-gradient(135deg,#b7f29d,#48c987)", "#168b59", "/courses"], ["Practice", "Solve questions & exercises", "linear-gradient(135deg,#9fe7ff,#4b9bff)", "#2474c9", "/studio/quiz"], ["Test", "Take quizzes & test yourself", "linear-gradient(135deg,#ffd77d,#ff9c52)", "#c56b16", "/exam-preparation"], ["Master", "Score high & earn rewards", "linear-gradient(135deg,#ffb2d1,#e671a4)", "#bf4679", "/progress"]].map(([title, text, bg, color, href], index) => <motion.div className="sd-step" key={title} style={{ "--step-bg": bg, "--step-color": color, "--delay": `${index * -.25}s` } as CSSVars} onClick={() => setLocation(href)} role="link" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setLocation(href); }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 + index * .05 }} whileHover={{ y: -5 }}><div className="sd-step-num">{index + 1}</div><div><b>{title}</b><span>{text}</span></div></motion.div>)}</div></section>

              <section><h2 className="sd-section-title" style={{ marginBottom: 14 }}>Recommended For You</h2><div className="sd-rec-grid">{recs.map((rec, index) => <motion.button className="sd-rec" key={rec.title} style={{ "--rec-bg": rec.bg, "--delay": `${index * -.2}s` } as CSSVars} onClick={() => setLocation(rec.href)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .035 }} whileTap={{ scale: .97 }}><div className="sd-rec-type">{rec.type}</div><div className="sd-rec-title">{rec.title}</div><div className="sd-rec-meta">{rec.meta}</div><span className="sd-rec-art" aria-hidden>{rec.icon}</span></motion.button>)}</div></section>
            </main>

            <aside className="sd-rail">
              <section className="sd-card sd-focus"><div className="sd-focus-title">{icon.fire} FOCUS TIME</div><div className="sd-timer">{focusLabel}</div><img src={focusGif} alt="" className="sd-focus-mascot-img" /><div className="sd-focus-select">Deep Focus</div><button className="sd-focus-btn" onClick={() => setFocusActive((value) => !value)}>{focusActive ? "Pause Focus" : "Start Focus"} &gt;</button><div className="sd-focus-slots">{[15, 25, 45].map((minutes) => <button key={minutes} className={focusMinutes === minutes ? "active" : ""} onClick={() => setFocusLength(minutes)}>{minutes} min</button>)}</div></section>

              <section className="sd-card"><h2 className="sd-section-title" style={{ fontSize: 20 }}>Today's Goals</h2>{goals.map((goal) => <div className="sd-goal" key={goal.label}><div className="sd-check">{icon.check}</div><div className="sd-goal-body"><div className="sd-goal-top"><span>{goal.label}</span><span>{goal.value}/{goal.total}</span></div><div className="sd-goal-track"><span style={{ width: `${(goal.value / goal.total) * 100}%`, background: goal.color }} /></div></div></div>)}<div className="sd-encourage">Great job! Keep it up! {icon.party}</div></section>

              <section className="sd-card sd-progress-card">
                <div className="sd-section-head"><h2 className="sd-section-title" style={{ fontSize: 20 }}>My Progress</h2><Link href="/progress" className="sd-link">View report</Link></div>
                <div className="sd-progress-wrap"><div className="sd-progress-overview"><div className="sd-progress-number"><strong><AnimNum target={overallProgress} suffix="%" /></strong><span>Overall completion</span></div><div className="sd-progress-meter"><span style={{ width: `${overallProgress}%` }} /></div><div className="sd-progress-scale"><span>Starting point</span><b>{overallProgress}% complete</b><span>Goal: 100%</span></div></div><div className="sd-progress-summary"><div className="sd-progress-badge">{icon.rocket} Learning lift-off</div><div className="sd-sub-list">{subjectDist.map((subject: any) => <div className="sd-sub-row" key={subject.name}><div className="sd-sub-row-top"><span><i style={{ width: 8, height: 8, borderRadius: 99, background: subject.color, display: "inline-block" }} />{subject.name}</span><b>{subject.value}%</b></div><div className="sd-sub-mini-track"><span style={{ width: `${subject.value}%`, background: subject.color }} /></div></div>)}</div></div></div>
              </section>

              <section className="sd-card"><div className="sd-section-head"><h2 className="sd-section-title" style={{ fontSize: 20 }}>Streak & Rewards</h2><Link href="/achievements" className="sd-link">View all</Link></div><div className="sd-streak-row">{[[icon.fire, streakDays, "Day Streak"], [icon.star, totalPoints.toLocaleString(), "XP Earned"], [icon.gem, badgesEarned, "Gems"]].map(([ico, num, label]) => <div key={label}><div className="sd-pill-ico" style={{ margin: "0 auto 6px" }}>{ico}</div><div className="sd-streak-num">{num}</div><div className="sd-streak-label">{label}</div></div>)}</div><div className="sd-week">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <div key={`${day}-${index}`}><div className="sd-day">{day}</div><div className={`sd-day-dot${index === 6 ? " pending" : ""}`}>{index === 5 ? icon.star : icon.check}</div></div>)}</div></section>

              <section className="sd-card sd-tip-card"><h2 className="sd-section-title" style={{ fontSize: 20 }}>{icon.bulb} Daily Tip</h2><p>Break big topics into small parts. Understand one step at a time.</p><span className="sd-tip-art" aria-hidden>{icon.bulb}</span></section>

              <section className="sd-card"><div className="sd-section-head"><h2 className="sd-section-title" style={{ fontSize: 20 }}>Latest Badges</h2><Link href="/achievements" className="sd-link">View all &gt;</Link></div><div className="sd-badge-grid">{(unlockedBadges.length ? unlockedBadges : [{ title: "Focus Master" }, { title: "Quiz Whiz" }, { title: "Streak Star" }, { title: "Brainy" }]).map((badge: any, index: number) => <div className="sd-badge" key={badge.id || badge.title}><div className="sd-badge-shape" style={{ background: ["#ff6b35", "#f24b73", "#ffb21d", "#7c4dff"][index % 4] }}>{index === 1 ? "?" : icon.star}</div><div className="sd-badge-name">{badge.title}</div></div>)}</div></section>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}


