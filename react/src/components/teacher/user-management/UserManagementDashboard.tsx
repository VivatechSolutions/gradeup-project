import React, { useState, useEffect, useMemo } from "react";

// ─── TYPES (kept as comments for reference, JS file) ──────────────────────────
// FeatureUsage { feature, timeSpent }
// StudentAnalytics { id, name, rollNumber, class, section, photo, email, lastActive,
//   loginFrequency, totalLearningTime, progress, engagementScore, featureUsage, activityHistory }
// ClassAnalytics { class, section, totalStudents, totalLearningTime, avgTimePerStudent,
//   mostUsedFeature, leastUsedFeature, activeStudents, inactiveStudents, featureBreakdown }
// DashboardAnalytics { totalStudents, activeStudents, totalLearningHours, avgUsageTime,
//   featureEngagementRate, studentCompletionRate }

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const NAMES = [
  "Aarav Sharma","Vivaan Singh","Aditya Kumar","Ishaan Patel","Diya Gupta","Ananya Reddy",
  "Aryan Joshi","Riya Malhotra","Kabir Verma","Myra Chauhan","Priya Nair","Rohan Mehta",
  "Saanvi Desai","Arjun Pillai","Anika Menon","Krish Iyer","Zara Khan","Advik Rao",
  "Neha Kapoor","Siddharth Bose","Pooja Iyer","Rahul Nanda","Tanvi Shah","Dev Pandey"
];
const CLASSES = [
  {class:"9",section:"A"},{class:"9",section:"B"},{class:"10",section:"A"},
  {class:"10",section:"B"},{class:"11",section:"A"},{class:"12",section:"A"},
];
const FEATURES = ["AI Tutor","Book Library","Exams","Debate","Seminar","Extras"];
const FC = {
  "AI Tutor":"#6366f1","Book Library":"#10b981","Exams":"#f59e0b",
  "Debate":"#ec4899","Seminar":"#8b5cf6","Extras":"#06b6d4",
};
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
function genHistory(total){
  const h=[];
  let rem=total;
  for(let i=0;i<30;i++){
    if(rem<=0)break;
    const d=new Date();d.setDate(d.getDate()-i);
    const t=Math.random()>0.3?Math.min(rem,rnd(15,90)):0;
    if(t>0){h.push({date:d.toISOString().split("T")[0],timeSpent:t});rem-=t;}
  }
  return h;
}
const STUDENTS=NAMES.map((name,i)=>{
  const ci=CLASSES[i%CLASSES.length];
  const total=rnd(500,3500);
  const fu=[];
  let pool=total;const fc=[...FEATURES];
  while(pool>0&&fc.length>0){
    const idx=Math.floor(Math.random()*fc.length);
    const f=fc.splice(idx,1)[0];
    const t=Math.min(pool,rnd(50,Math.max(60,Math.floor(pool/2))));
    fu.push({feature:f,timeSpent:t});pool-=t;
  }
  if(pool>0&&fu.length>0)fu[0].timeSpent+=pool;
  const lb=rnd(0,14);const la=new Date();la.setDate(la.getDate()-lb);
  return{
    id:`S${(i+1).toString().padStart(3,"0")}`,name,rollNumber:`${ci.class}0${i+1}`,
    class:ci.class,section:ci.section,photo:`https://i.pravatar.cc/150?img=${(i%70)+1}`,
    email:`${name.split(" ")[0].toLowerCase()}@school.edu`,lastActive:la.toISOString(),
    loginFrequency:rnd(1,10),totalLearningTime:total,progress:rnd(20,95),
    engagementScore:rnd(30,98),featureUsage:fu,activityHistory:genHistory(total),
  };
});
const CLS_DATA=CLASSES.map(({class:cn,section})=>{
  const ss=STUDENTS.filter(s=>s.class===cn&&s.section===section);
  if(!ss.length)return{class:cn,section,totalStudents:0,totalLearningTime:0,avgTimePerStudent:0,mostUsedFeature:"N/A",leastUsedFeature:"N/A",activeStudents:0,inactiveStudents:0,featureBreakdown:[]};
  const ttl=ss.reduce((a,s)=>a+s.totalLearningTime,0);
  const ft={};
  ss.forEach(s=>s.featureUsage.forEach(f=>{ft[f.feature]=(ft[f.feature]||0)+f.timeSpent;}));
  const sorted=Object.entries(ft).sort(([,a],[,b])=>a-b);
  const sa=new Date();sa.setDate(sa.getDate()-7);
  const active=ss.filter(s=>new Date(s.lastActive)>sa).length;
  return{class:cn,section,totalStudents:ss.length,totalLearningTime:ttl,
    avgTimePerStudent:Math.floor(ttl/ss.length),
    mostUsedFeature:sorted.length?sorted[sorted.length-1][0]:"N/A",
    leastUsedFeature:sorted.length?sorted[0][0]:"N/A",
    activeStudents:active,inactiveStudents:ss.length-active,
    featureBreakdown:sorted.map(([feature,time])=>({feature,time})).reverse()};
});
const DASH=(()=>{
  const n=STUDENTS.length;
  const ttl=STUDENTS.reduce((a,s)=>a+s.totalLearningTime,0);
  const sa=new Date();sa.setDate(sa.getDate()-7);
  const act=STUDENTS.filter(s=>new Date(s.lastActive)>sa).length;
  const fe={};
  STUDENTS.forEach(s=>s.featureUsage.forEach(f=>{fe[f.feature]=(fe[f.feature]||0)+1;}));
  return{
    totalStudents:n,activeStudents:act,totalLearningHours:Math.floor(ttl/60),
    avgUsageTime:Math.floor(ttl/n),
    featureEngagementRate:Object.entries(fe).map(([f,c])=>({feature:f,rate:Math.round((c/n)*100)})).sort((a,b)=>b.rate-a.rate),
    studentCompletionRate:Math.round(STUDENTS.reduce((a,s)=>a+s.progress,0)/n),
  };
})();
const api={
  getDashboard:()=>new Promise(r=>setTimeout(()=>r(DASH),400)),
  getStudents:()=>new Promise(r=>setTimeout(()=>r(STUDENTS),600)),
  getClasses:()=>new Promise(r=>setTimeout(()=>r(CLS_DATA),500)),
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const isActive=(la)=>{const d=new Date();d.setDate(d.getDate()-7);return new Date(la)>d;};
const fmtMins=(m)=>m>=60?`${Math.round(m/60)}h ${m%60>0?`${m%60}m`:""}`.trim():`${m}m`;
const engLevel=(s)=>s>75?"high":s>50?"med":"low";
const engWord=(s)=>s>75?"Highly engaged":s>50?"Moderately engaged":"Needs attention";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#f0f2f8;--sur:#fff;--sur2:#f7f8fb;--sur3:#eff1f6;
  --brd:rgba(0,0,0,.07);--brd2:rgba(0,0,0,.05);
  --t:#0f172a;--t2:#475569;--t3:#94a3b8;
  --sh:0 1px 3px rgba(0,0,0,.06),0 4px 12px rgba(0,0,0,.04);
  --sh2:0 8px 28px rgba(0,0,0,.12);
  --ac:#6366f1;--ac2:#818cf8;
}
[data-theme=dark]{
  --bg:#0d1117;--sur:#161b27;--sur2:#1c2333;--sur3:#212940;
  --brd:rgba(255,255,255,.07);--brd2:rgba(255,255,255,.05);
  --t:#e2e8f0;--t2:#94a3b8;--t3:#475569;
  --sh:0 1px 4px rgba(0,0,0,.3),0 4px 16px rgba(0,0,0,.2);
  --sh2:0 8px 32px rgba(0,0,0,.5);
}
html,body{height:100%;}
.um{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--t);min-height:100vh;transition:background .3s,color .3s;}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-thumb{background:var(--brd);border-radius:3px;}

/* topbar */
.top{position:sticky;top:0;z-index:50;background:var(--sur);border-bottom:1px solid var(--brd);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.top-logo{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.top-title{font-size:14.5px;font-weight:700;}
.top-sub{font-size:11px;color:var(--t3);}
.top-r{display:flex;align-items:center;gap:8px;}
.icon-btn{width:34px;height:34px;border-radius:8px;border:1px solid var(--brd);background:var(--sur2);cursor:pointer;color:var(--t2);font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
.icon-btn:hover{border-color:var(--ac);color:var(--ac);}
.txt-btn{padding:7px 12px;border-radius:8px;border:1px solid var(--brd);background:var(--sur2);cursor:pointer;color:var(--t2);font-size:12px;font-weight:600;font-family:inherit;display:flex;align-items:center;gap:5px;transition:all .15s;white-space:nowrap;}
.txt-btn:hover{border-color:var(--ac);color:var(--ac);}
.date-pill{font-size:11px;color:var(--t3);padding:4px 9px;border-radius:7px;background:var(--sur2);border:1px solid var(--brd);white-space:nowrap;}

/* stat cards */
.stats{display:grid;grid-template-columns:repeat(6,1fr);gap:11px;padding:18px 20px 0;}
.sc{background:var(--sur);border-radius:13px;padding:15px 16px;border:1px solid var(--brd);box-shadow:var(--sh);transition:transform .2s,box-shadow .2s;position:relative;overflow:hidden;min-width:0;}
.sc:hover{transform:translateY(-3px);box-shadow:var(--sh2);}
.sc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:2px 2px 0 0;}
.sc.b::before{background:#6366f1;}.sc.g::before{background:#10b981;}
.sc.a::before{background:#f59e0b;}.sc.r::before{background:#ef4444;}
.sc.p::before{background:#8b5cf6;}.sc.c::before{background:#06b6d4;}
.sc-ico{font-size:17px;margin-bottom:7px;}
.sc-n{font-size:21px;font-weight:800;letter-spacing:-1px;color:var(--t);line-height:1.1;}
.sc-l{font-size:11px;color:var(--t2);font-weight:500;margin-top:2px;}
.sc-s{font-size:10px;font-weight:600;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sc.b .sc-s{color:#6366f1;}.sc.g .sc-s{color:#10b981;}
.sc.a .sc-s{color:#f59e0b;}.sc.r .sc-s{color:#ef4444;}
.sc.p .sc-s{color:#8b5cf6;}.sc.c .sc-s{color:#06b6d4;}

/* nav */
.nav{display:flex;gap:4px;padding:14px 20px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;}
.nav::-webkit-scrollbar{display:none;}
.nb{padding:8px 14px;border-radius:9px;border:1px solid transparent;background:transparent;font-family:inherit;font-size:12.5px;font-weight:600;color:var(--t2);cursor:pointer;transition:all .15s;white-space:nowrap;display:flex;align-items:center;gap:5px;flex-shrink:0;}
.nb:hover{background:var(--sur2);border-color:var(--brd);color:var(--t);}
.nb.on{background:var(--sur);border-color:var(--brd);box-shadow:var(--sh);color:var(--ac);}
.badge{font-size:9.5px;font-weight:700;padding:1px 5px;border-radius:5px;background:rgba(239,68,68,.15);color:#ef4444;}

/* body */
.body{padding:18px 20px 60px;}

/* panel */
.panel{background:var(--sur);border-radius:13px;border:1px solid var(--brd);box-shadow:var(--sh);overflow:hidden;}
.ph{padding:15px 18px 12px;border-bottom:1px solid var(--brd2);}
.pt{font-size:14px;font-weight:700;display:flex;align-items:center;gap:6px;line-height:1.3;}
.ps{font-size:12px;color:var(--t3);margin-top:3px;line-height:1.4;}
.pb{padding:16px 18px;}

/* grids */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:13px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-bottom:13px;}
.mb{margin-bottom:13px;}

/* chip */
.chip{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;}
.chip.high{background:rgba(16,185,129,.1);color:#059669;}
.chip.med{background:rgba(245,158,11,.1);color:#d97706;}
.chip.low{background:rgba(239,68,68,.1);color:#dc2626;}
.chip.active{background:rgba(16,185,129,.1);color:#059669;}
.chip.inactive{background:rgba(239,68,68,.1);color:#dc2626;}
[data-theme=dark] .chip.high{background:rgba(16,185,129,.2);color:#34d399;}
[data-theme=dark] .chip.med{background:rgba(245,158,11,.2);color:#fbbf24;}
[data-theme=dark] .chip.low{background:rgba(239,68,68,.2);color:#f87171;}
[data-theme=dark] .chip.active{background:rgba(16,185,129,.2);color:#34d399;}
[data-theme=dark] .chip.inactive{background:rgba(239,68,68,.2);color:#f87171;}

/* table -> becomes cards on mobile */
.twrap{overflow-x:auto;}
.tbl{width:100%;border-collapse:collapse;min-width:560px;}
.th{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--t3);padding:9px 13px;text-align:left;border-bottom:1px solid var(--brd2);cursor:pointer;user-select:none;white-space:nowrap;}
.th:hover{color:var(--ac);}
.tr{cursor:pointer;transition:background .12s;}
.tr:hover{background:var(--sur2);}
.td{padding:10px 13px;font-size:12.5px;color:var(--t);border-bottom:1px solid var(--brd2);}
.tr:last-child .td{border-bottom:none;}
.scell{display:flex;align-items:center;gap:9px;}
.simg{width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid var(--brd2);flex-shrink:0;}
.sname{font-weight:600;font-size:13px;}
.sroll{font-size:10.5px;color:var(--t3);}
.prow{display:flex;align-items:center;gap:7px;}
.pbar{height:5px;background:var(--sur3);border-radius:3px;overflow:hidden;flex:1;}
.pfill{height:100%;border-radius:3px;background:#6366f1;transition:width .4s;}

/* mobile student cards (shown instead of table on small screens) */
.mcards{display:none;}
.mcard{display:flex;align-items:center;gap:11px;padding:12px;border-radius:11px;border:1px solid var(--brd2);background:var(--sur2);margin-bottom:8px;cursor:pointer;}
.mcard:active{background:var(--sur3);}
.mcard-body{flex:1;min-width:0;}
.mcard-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.mcard-meta{display:flex;gap:10px;margin-top:5px;font-size:11px;color:var(--t3);flex-wrap:wrap;}

/* pagination */
.pag{display:flex;align-items:center;gap:4px;margin-top:11px;justify-content:flex-end;flex-wrap:wrap;}
.pgb{width:30px;height:30px;border-radius:6px;border:1px solid var(--brd);background:var(--sur2);color:var(--t2);cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;transition:all .12s;}
.pgb:hover{border-color:var(--ac);color:var(--ac);}
.pgb.on{background:#6366f1;color:#fff;border-color:transparent;}
.pgb:disabled{opacity:.4;cursor:not-allowed;}
.pgi{font-size:11.5px;color:var(--t3);width:100%;margin-bottom:4px;}

/* filters */
.fbar{background:var(--sur);border:1px solid var(--brd);border-radius:13px;padding:14px;margin-bottom:13px;box-shadow:var(--sh);}
.fg{display:flex;flex-wrap:wrap;gap:9px;align-items:flex-end;}
.fl{font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;}
.fgrp{display:flex;flex-direction:column;min-width:110px;flex:1;}
.fsel,.finp{padding:8px 10px;border-radius:8px;border:1px solid var(--brd);background:var(--sur2);color:var(--t);font-family:inherit;font-size:13px;outline:none;transition:border-color .15s;width:100%;}
.fsel:focus,.finp:focus{border-color:var(--ac);}
.swrap{position:relative;}
.sico{position:absolute;top:50%;right:8px;transform:translateY(-50%);color:var(--t3);font-size:12px;pointer-events:none;}
.btn{padding:8px 12px;border-radius:8px;border:1px solid var(--brd);background:var(--sur2);color:var(--t2);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;}
.btn:hover{border-color:var(--ac);color:var(--ac);}

/* drawer */
.bkdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;backdrop-filter:blur(2px);animation:fi .2s;}
.drw{position:fixed;top:0;right:0;width:450px;max-width:96vw;height:100%;background:var(--sur);z-index:101;overflow-y:auto;box-shadow:-12px 0 40px rgba(0,0,0,.15);animation:si .25s cubic-bezier(.4,0,.2,1);}
@keyframes fi{from{opacity:0}to{opacity:1}}
@keyframes si{from{transform:translateX(100%)}to{transform:translateX(0)}}
.dhead{padding:16px 20px;border-bottom:1px solid var(--brd2);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--sur);z-index:1;}
.dtitle{font-size:15px;font-weight:700;}
.dclose{width:30px;height:30px;border-radius:7px;border:1px solid var(--brd);background:var(--sur2);cursor:pointer;color:var(--t2);font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
.dclose:hover{background:rgba(239,68,68,.1);color:#dc2626;}
.dbody{padding:16px 20px;display:flex;flex-direction:column;gap:14px;}
.dsec{background:var(--sur2);border-radius:11px;padding:13px;border:1px solid var(--brd2);}
.dst{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:9px;}
.drow{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--brd2);font-size:12.5px;gap:8px;}
.drow:last-child{border-bottom:none;}
.dl{color:var(--t2);flex-shrink:0;}
.dv{font-weight:600;text-align:right;word-break:break-word;}
.dpro{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
.dav{width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid var(--brd2);flex-shrink:0;}

/* legend */
.leg{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:10px;}
.li{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--t2);}
.ld{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

/* alert item */
.aitem{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:9px;border:1px solid var(--brd);background:var(--sur2);cursor:pointer;transition:background .15s;margin-bottom:7px;}
.aitem:hover{background:rgba(99,102,241,.06);}
.aimg{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;}
.ainfo{flex:1;min-width:0;}
.aname{font-size:13px;font-weight:600;}
.adet{font-size:11px;color:var(--t3);margin-top:1px;}
.ascr{font-size:12px;font-weight:700;text-align:right;flex-shrink:0;line-height:1.3;}

/* simple horizontal bar list -- THE workhorse chart, used everywhere */
.barlist{display:flex;flex-direction:column;gap:12px;}
.barrow{display:grid;grid-template-columns:88px 1fr 64px;align-items:center;gap:10px;}
.barrow.wide-label{grid-template-columns:120px 1fr 64px;}
.bar-label{font-size:12.5px;font-weight:600;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bar-track{height:14px;background:var(--sur3);border-radius:7px;overflow:hidden;position:relative;}
.bar-fill{height:100%;border-radius:7px;transition:width .6s cubic-bezier(.4,0,.2,1);}
.bar-val{font-size:12.5px;font-weight:700;text-align:right;color:var(--t);white-space:nowrap;}

/* rank row (used in top/bottom lists) */
.rrow{display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--brd2);}
.rrow:last-child{border-bottom:none;}
.rn{font-size:12.5px;font-weight:800;color:var(--t3);width:18px;text-align:center;flex-shrink:0;}
.ri{width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;}
.rin{flex:1;min-width:0;}
.rname{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rdet{font-size:10.5px;color:var(--t3);}
.rsco{font-size:13px;font-weight:800;flex-shrink:0;text-align:right;}

/* big number tile (replaces waffle/radial rings for simple stats) */
.bignum-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.bignum{text-align:center;padding:14px 8px;border-radius:11px;background:var(--sur2);border:1px solid var(--brd2);}
.bignum-v{font-size:24px;font-weight:800;line-height:1.1;}
.bignum-l{font-size:11px;color:var(--t3);margin-top:4px;font-weight:500;}

/* toast */
.toast{position:fixed;bottom:18px;right:18px;left:18px;max-width:340px;margin-left:auto;padding:11px 16px;border-radius:11px;box-shadow:var(--sh2);font-size:12.5px;font-weight:600;z-index:200;display:flex;align-items:center;gap:7px;animation:toastIn .3s cubic-bezier(.34,1.56,.64,1);}
@keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.toast.ok{background:#10b981;color:#fff;}

/* loader */
.loader{display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:14px;}
.spin{width:40px;height:40px;border:3px solid var(--brd);border-top-color:#6366f1;border-radius:50%;animation:sp .6s linear infinite;}
@keyframes sp{to{transform:rotate(360deg)}}

/* empty */
.empty{text-align:center;padding:32px 20px;}
.empty-ico{font-size:32px;margin-bottom:8px;}

/* insight callout under charts */
.insight{display:flex;gap:8px;align-items:flex-start;background:var(--sur2);border:1px solid var(--brd2);border-radius:10px;padding:10px 12px;margin-top:13px;font-size:12px;color:var(--t2);line-height:1.5;}
.insight b{color:var(--t);}

/* ═══════════ RESPONSIVE ═══════════ */
@media(max-width:1100px){.g3{grid-template-columns:1fr 1fr;}}
@media(max-width:900px){
  .stats{grid-template-columns:repeat(3,1fr);}
  .g2{grid-template-columns:1fr;}.g3{grid-template-columns:1fr 1fr;}
  .top,.nav,.stats,.body{padding-left:14px;padding-right:14px;}
}
@media(max-width:700px){
  .top{height:auto;flex-wrap:wrap;padding:10px 14px;gap:8px;}
  .top-r{width:100%;justify-content:flex-start;}
  .date-pill{display:none;}
  .stats{grid-template-columns:repeat(2,1fr);gap:8px;padding:14px 14px 0;}
  .sc{padding:12px 13px;}
  .sc-n{font-size:19px;}
  .body{padding:14px 14px 50px;}
  .g3{grid-template-columns:1fr;}
  .ph{padding:13px 14px 10px;}
  .pb{padding:13px 14px;}
  .pt{font-size:13.5px;}
  /* tables collapse to cards */
  .twrap{display:none;}
  .mcards{display:block;}
  .drw{width:100%;}
  .fg{flex-direction:column;align-items:stretch;}
  .fgrp{min-width:0;}
  .barrow,.barrow.wide-label{grid-template-columns:72px 1fr 52px;gap:7px;}
  .bignum-row{grid-template-columns:1fr 1fr;}
  .bignum-row .bignum:last-child{grid-column:1 / -1;}
}
@media(max-width:420px){
  .stats{grid-template-columns:1fr 1fr;}
  .sc-s{display:none;}
}
`;

// ─── ANIM NUMBER ─────────────────────────────────────────────────────────────
function AnimNum({target,suffix=""}){
  const [v,setV]=useState(0);
  useEffect(()=>{
    let c=0;const step=()=>{c+=target/48;if(c<target){setV(Math.floor(c));requestAnimationFrame(step);}else setV(target);};
    requestAnimationFrame(step);
  },[target]);
  return <>{v.toLocaleString()}{suffix}</>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE CHART 1 — HORIZONTAL BAR LIST
// The one workhorse comparison chart used everywhere instead of grouped columns,
// lollipops, or bar-races. Reads top-to-bottom like a sentence: label, bar, value.
// Works at any width without scaling tricks, so it never breaks on mobile.
// ═══════════════════════════════════════════════════════════════════════════════
function BarList({data, valueFormatter=(v)=>v, wideLabel=false, animate=true}){
  const max=Math.max(...data.map(d=>d.value),1);
  return(
    <div className="barlist">
      {data.map((d,i)=>(
        <div key={d.label+i} className={`barrow${wideLabel?" wide-label":""}`}>
          <div className="bar-label" title={d.label}>{d.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{
              width: animate ? `${(d.value/max)*100}%` : `${(d.value/max)*100}%`,
              background:d.color||"#6366f1"
            }}/>
          </div>
          <div className="bar-val">{valueFormatter(d.value)}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE CHART 2 — SIMPLE DONUT (part-to-whole, e.g. "where did the time go")
// Kept simple: one ring, hover highlights one slice, legend lists exact values.
// ═══════════════════════════════════════════════════════════════════════════════
function SimpleDonut({data,size=120}){
  const total=data.reduce((a,d)=>a+d.value,0)||1;
  const r=size/2-10;const circ=2*Math.PI*r;
  let cum=0;
  const [hov,setHov]=useState(null);
  return(
    <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)",flexShrink:0}} role="img" aria-label="Donut chart showing share of time per feature">
        {data.map((d,i)=>{
          const frac=d.value/total;
          const off=circ*cum;
          cum+=frac;
          return(
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
              stroke={d.color} strokeWidth={hov===i?15:11}
              strokeDasharray={`${circ*frac} ${circ*(1-frac)}`}
              strokeDashoffset={-off}
              style={{cursor:"pointer",transition:"stroke-width .15s"}}
              onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
            />
          );
        })}
      </svg>
      <div style={{flex:1,minWidth:160}}>
        {data.map((d,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:i<data.length-1?"1px solid var(--brd2)":"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/>
              <span style={{fontSize:12,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.label}</span>
            </div>
            <span style={{fontSize:12,fontWeight:700,color:"var(--t)",flexShrink:0,marginLeft:8}}>{Math.round((d.value/total)*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE CHART 3 — SIMPLE TREND LINE (over time)
// One line, light fill, a single highlighted dot on hover/tap. No dual axes,
// no extra encodings — just "how did this number move over the days".
// ═══════════════════════════════════════════════════════════════════════════════
function TrendLine({data,color="#6366f1",height=130}){
  const [hov,setHov]=useState(null);
  const W=600,H=height,pL=8,pB=22,pT=10,pR=8;
  const iW=W-pL-pR;const iH=H-pT-pB;
  if(data.length<2)return null;
  const max=Math.max(...data,1);
  const stepW=iW/(data.length-1);
  const pts=data.map((v,i)=>[pL+i*stepW,pT+iH-(v/max)*iH]);
  const pathD=pts.map((p,i)=>i===0?`M${p[0]},${p[1]}`:`L${p[0]},${p[1]}`).join(" ");
  const fillD=pathD+` L${pts[pts.length-1][0]},${pT+iH} L${pts[0][0]},${pT+iH} Z`;
  const move=(clientX,rect)=>{
    const mx=(clientX-rect.left)*(W/rect.width)-pL;
    const idx=Math.max(0,Math.min(data.length-1,Math.round(mx/stepW)));
    setHov(idx);
  };
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",touchAction:"none"}}
      role="img" aria-label="Line chart of total learning minutes per day over the last 30 days"
      onMouseMove={e=>move(e.clientX,e.currentTarget.getBoundingClientRect())}
      onMouseLeave={()=>setHov(null)}
      onTouchStart={e=>move(e.touches[0].clientX,e.currentTarget.getBoundingClientRect())}
      onTouchMove={e=>move(e.touches[0].clientX,e.currentTarget.getBoundingClientRect())}
    >
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <line x1={pL} y1={pT+iH} x2={W-pR} y2={pT+iH} stroke="var(--brd2)"/>
      <path d={fillD} fill="url(#trendGrad)"/>
      <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
      <text x={pL} y={H-4} fontSize={10} fill="var(--t3)">30 days ago</text>
      <text x={W-pR} y={H-4} fontSize={10} fill="var(--t3)" textAnchor="end">today</text>
      {hov!==null&&(
        <g>
          <line x1={pts[hov][0]} y1={pT} x2={pts[hov][0]} y2={pT+iH} stroke={color} strokeDasharray="3,3" strokeWidth={1.2}/>
          <circle cx={pts[hov][0]} cy={pts[hov][1]} r={5} fill={color}/>
          <rect x={Math.min(Math.max(pts[hov][0]-38,pL),W-pR-76)} y={Math.max(pts[hov][1]-30,pT)} width={76} height={22} rx={5} fill="var(--sur)" stroke="var(--brd)" strokeWidth={1}/>
          <text x={Math.min(Math.max(pts[hov][0]-34,pL+4),W-pR-72)} y={Math.max(pts[hov][1]-15,pT+15)} fontSize={10.5} fill="var(--t)" fontWeight="700">{fmtMins(data[hov])}</text>
        </g>
      )}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE CHART 4 — STATUS SPLIT (active vs inactive, or any 2-way split)
// A single wide bar split in two colors plus the headline number. Replaces the
// 60-square waffle grid, which doesn't scale down to a phone width gracefully.
// ═══════════════════════════════════════════════════════════════════════════════
function StatusSplit({active,total,activeLabel="active",inactiveLabel="inactive"}){
  const pct=total>0?Math.round((active/total)*100):0;
  return(
    <div>
      <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{fontSize:30,fontWeight:800,color:"var(--t)"}}>{pct}%</div>
        <div style={{fontSize:12.5,color:"var(--t3)"}}>{active} of {total} students {activeLabel} this week</div>
      </div>
      <div style={{height:16,borderRadius:8,overflow:"hidden",display:"flex",background:"var(--sur3)"}}>
        <div style={{width:`${pct}%`,background:"#10b981",transition:"width .6s"}}/>
        <div style={{width:`${100-pct}%`,background:"#ef4444",transition:"width .6s"}}/>
      </div>
      <div className="leg" style={{marginTop:10}}>
        <div className="li"><div className="ld" style={{background:"#10b981"}}/>{active} {activeLabel}</div>
        <div className="li"><div className="ld" style={{background:"#ef4444"}}/>{total-active} {inactiveLabel}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR HEATMAP — kept only in the student drawer (30-day personal activity)
// This view earns its place: a calendar is the most natural way to show "which
// specific days did this one student show up."
// ═══════════════════════════════════════════════════════════════════════════════
function CalendarHeatmap({history}){
  const map={};
  history.forEach(h=>{map[h.date]=(map[h.date]||0)+h.timeSpent;});
  const days=[];
  for(let i=29;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=d.toISOString().split("T")[0];days.push({date:k,time:map[k]||0});}
  const maxT=Math.max(...days.map(d=>d.time),1);
  const weeks=[];for(let i=0;i<days.length;i+=7)weeks.push(days.slice(i,i+7));
  const dayLabels=["S","M","T","W","T","F","S"];
  return(
    <div>
      <div style={{display:"flex",gap:3,overflowX:"auto"}}>
        <div style={{display:"flex",flexDirection:"column",gap:3,paddingTop:18,flexShrink:0}}>
          {dayLabels.map((l,i)=><div key={i} style={{height:14,fontSize:9,color:"var(--t3)",lineHeight:"14px"}}>{l}</div>)}
        </div>
        {weeks.map((week,wi)=>(
          <div key={wi} style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0}}>
            <div style={{height:14,fontSize:9,color:"var(--t3)",textAlign:"center",lineHeight:"14px"}}>
              {week[0]?.date.split("-")[2]==="01"?new Date(week[0].date).toLocaleDateString("en",{month:"short"}):""}
            </div>
            {week.map((d,di)=>{
              const alpha=d.time===0?0.06:0.15+(d.time/maxT)*0.85;
              return(
                <div key={di} title={`${d.date}: ${d.time} mins`}
                  style={{width:14,height:14,borderRadius:2,background:`rgba(99,102,241,${alpha})`,cursor:"pointer",transition:"transform .1s"}}
                  onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.4)")}
                  onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:4,marginTop:8,fontSize:10,color:"var(--t3)"}}>
        Less <div style={{display:"flex",gap:2}}>{[.06,.25,.5,.75,1].map((a,i)=><div key={i} style={{width:10,height:10,borderRadius:2,background:`rgba(99,102,241,${a})`}}/>)}</div> More
      </div>
    </div>
  );
}

// ─── STUDENT DRAWER ───────────────────────────────────────────────────────────
function StudentDrawer({student,onClose}){
  const featureData=student.featureUsage
    .slice().sort((a,b)=>b.timeSpent-a.timeSpent)
    .map(f=>({label:f.feature,value:f.timeSpent,color:FC[f.feature]||"#6366f1"}));
  const scoreColor=student.engagementScore>75?"#10b981":student.engagementScore>50?"#f59e0b":"#ef4444";
  return(
    <>
      <div className="bkdrop" onClick={onClose}/>
      <div className="drw">
        <div className="dhead">
          <div className="dtitle">Student profile</div>
          <button className="dclose" onClick={onClose}>✕</button>
        </div>
        <div className="dbody">
          {/* Profile */}
          <div className="dsec">
            <div className="dpro">
              <img src={student.photo} alt={student.name} className="dav"/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700}}>{student.name}</div>
                <div style={{fontSize:11.5,color:"var(--t3)",marginTop:1}}>Roll #{student.rollNumber} · Class {student.class}-{student.section}</div>
                <span className={`chip ${engLevel(student.engagementScore)}`} style={{marginTop:5,display:"inline-flex"}}>
                  {engWord(student.engagementScore)}
                </span>
              </div>
            </div>
            {[["Email",student.email],["Last active",new Date(student.lastActive).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})],["Logins/week",`${student.loginFrequency}×`]].map(([l,v])=>(
              <div key={l} className="drow"><span className="dl">{l}</span><span className="dv">{v}</span></div>
            ))}
          </div>

          {/* Engagement, progress, hours — plain big numbers instead of 3 spinning rings */}
          <div className="dsec">
            <div className="dst">At a glance</div>
            <div className="bignum-row">
              <div className="bignum"><div className="bignum-v" style={{color:scoreColor}}>{student.engagementScore}</div><div className="bignum-l">Engagement score</div></div>
              <div className="bignum"><div className="bignum-v" style={{color:"#6366f1"}}>{student.progress}%</div><div className="bignum-l">Course progress</div></div>
              <div className="bignum"><div className="bignum-v" style={{color:"#06b6d4"}}>{Math.round(student.totalLearningTime/60)}h</div><div className="bignum-l">Total time</div></div>
            </div>
          </div>

          {/* Donut — time per feature */}
          <div className="dsec">
            <div className="dst">Time spent per feature</div>
            <SimpleDonut data={featureData}/>
          </div>

          {/* Calendar heatmap — 30-day activity */}
          <div className="dsec">
            <div className="dst">30-day activity calendar (darker = more time)</div>
            <CalendarHeatmap history={student.activityHistory}/>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({students,classes,dashboard}){
  const featureWithTime=useMemo(()=>{
    const ft={};
    students.forEach(s=>s.featureUsage.forEach(f=>{ft[f.feature]=(ft[f.feature]||0)+f.timeSpent;}));
    return dashboard.featureEngagementRate
      .map(f=>({label:f.feature,value:ft[f.feature]||0,color:FC[f.feature]||"#6366f1"}))
      .sort((a,b)=>b.value-a.value);
  },[students,dashboard]);

  const classBarData=useMemo(()=>{
    const colors=["#6366f1","#10b981","#f59e0b","#ec4899","#8b5cf6","#06b6d4"];
    return classes.map((c,i)=>({label:`Class ${c.class}-${c.section}`,value:c.avgTimePerStudent,color:colors[i%colors.length]}))
      .sort((a,b)=>b.value-a.value);
  },[classes]);

  const topFeature=featureWithTime[0];
  const topClass=classBarData[0];

  return(
    <>
      <div className="g2">
        {/* Class comparison — simple horizontal bars, sorted, easy to scan */}
        <div className="panel">
          <div className="ph">
            <div className="pt">🏫 Which class learns the most?</div>
            <div className="ps">Average time per student, sorted highest to lowest</div>
          </div>
          <div className="pb">
            <BarList data={classBarData} valueFormatter={fmtMins} wideLabel/>
            {topClass&&<div className="insight">💡 <span><b>{topClass.label}</b> spends the most time learning, averaging <b>{fmtMins(topClass.value)}</b> per student.</span></div>}
          </div>
        </div>

        {/* Active vs inactive — single split bar instead of 60-square grid */}
        <div className="panel">
          <div className="ph">
            <div className="pt">✅ Who's active this week?</div>
            <div className="ps">Students who logged in within the last 7 days</div>
          </div>
          <div className="pb">
            <StatusSplit active={dashboard.activeStudents} total={dashboard.totalStudents}/>
          </div>
        </div>
      </div>

      {/* Feature usage — single clean bar list instead of 36-bar grouped columns */}
      <div className="panel mb">
        <div className="ph">
          <div className="pt">⚡ Where does everyone's time go?</div>
          <div className="ps">Total minutes spent on each feature, across all {dashboard.totalStudents} students</div>
        </div>
        <div className="pb">
          <BarList data={featureWithTime} valueFormatter={fmtMins} wideLabel/>
          {topFeature&&<div className="insight">💡 <span><b>{topFeature.label}</b> is the most-used feature school-wide, with <b>{fmtMins(topFeature.value)}</b> logged in total.</span></div>}
        </div>
      </div>
    </>
  );
}

// ─── STUDENTS TAB ─────────────────────────────────────────────────────────────
function StudentsTab({students,onSelect}){
  const [filters,setFilters]=useState({class:"all",section:"all",status:"all",search:"",sk:"name",sd:"asc"});
  const [page,setPage]=useState(1);const PP=8;
  const allClasses=useMemo(()=>[...new Set(students.map(s=>s.class))].sort(),[students]);
  const allSections=useMemo(()=>{if(filters.class==="all")return[];return[...new Set(students.filter(s=>s.class===filters.class).map(s=>s.section))].sort();},[students,filters.class]);
  const filtered=useMemo(()=>students.filter(s=>{
    if(filters.class!=="all"&&s.class!==filters.class)return false;
    if(filters.section!=="all"&&s.section!==filters.section)return false;
    if(filters.status==="active"&&!isActive(s.lastActive))return false;
    if(filters.status==="inactive"&&isActive(s.lastActive))return false;
    if(filters.search&&!s.name.toLowerCase().includes(filters.search.toLowerCase())&&!s.rollNumber.includes(filters.search))return false;
    return true;
  }),[students,filters]);
  const sorted=useMemo(()=>[...filtered].sort((a,b)=>{
    const va=a[filters.sk],vb=b[filters.sk];
    const c=String(va).localeCompare(String(vb),undefined,{numeric:true});
    return filters.sd==="asc"?c:-c;
  }),[filtered,filters.sk,filters.sd]);
  const paginated=useMemo(()=>sorted.slice((page-1)*PP,page*PP),[sorted,page]);
  const totalPages=Math.max(1,Math.ceil(sorted.length/PP));
  const sf=(k,v)=>{setFilters(f=>({...f,[k]:v}));setPage(1);};
  const toggleSort=(k)=>{setFilters(f=>({...f,sk:k,sd:f.sk===k&&f.sd==="asc"?"desc":"asc"}));setPage(1);};
  return(
    <div className="panel">
      <div className="ph"><div className="pt">👩‍🎓 All students</div><div className="ps">{sorted.length} students match current filters</div></div>
      <div className="pb">
        <div className="fbar">
          <div className="fg">
            <div className="fgrp"><div className="fl">Class</div>
              <select className="fsel" value={filters.class} onChange={e=>{sf("class",e.target.value);sf("section","all");}}>
                <option value="all">All classes</option>
                {allClasses.map(c=><option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div className="fgrp"><div className="fl">Section</div>
              <select className="fsel" value={filters.section} onChange={e=>sf("section",e.target.value)} disabled={filters.class==="all"}>
                <option value="all">All sections</option>
                {allSections.map(s=><option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
            <div className="fgrp"><div className="fl">Status</div>
              <select className="fsel" value={filters.status} onChange={e=>sf("status",e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="fgrp" style={{flex:2}}><div className="fl">Search</div>
              <div className="swrap"><input className="finp" style={{paddingRight:28}} placeholder="Name or roll…" value={filters.search} onChange={e=>sf("search",e.target.value)}/><span className="sico">🔍</span></div>
            </div>
            <div className="fgrp"><div className="fl">&nbsp;</div>
              <button className="btn" onClick={()=>{setFilters({class:"all",section:"all",status:"all",search:"",sk:"name",sd:"asc"});setPage(1);}}>↺ Reset filters</button>
            </div>
          </div>
        </div>

        {/* Desktop/tablet table */}
        <div className="twrap">
          <table className="tbl">
            <thead><tr>
              {[["name","Student"],["totalLearningTime","Learning time"],["engagementScore","Engagement"],["progress","Progress"],["lastActive","Status"]].map(([k,l])=>(
                <th key={k} className="th" onClick={()=>toggleSort(k)}>{l} {filters.sk===k?(filters.sd==="asc"?"↑":"↓"):""}</th>
              ))}
            </tr></thead>
            <tbody>
              {paginated.map(s=>(
                <tr key={s.id} className="tr" onClick={()=>onSelect(s)}>
                  <td className="td"><div className="scell"><img src={s.photo} alt={s.name} className="simg"/><div><div className="sname">{s.name}</div><div className="sroll">Class {s.class}-{s.section}</div></div></div></td>
                  <td className="td">{fmtMins(s.totalLearningTime)}</td>
                  <td className="td"><span className={`chip ${engLevel(s.engagementScore)}`}>{s.engagementScore}</span></td>
                  <td className="td"><div className="prow"><div className="pbar"><div className="pfill" style={{width:`${s.progress}%`}}/></div><span style={{fontSize:11.5,fontWeight:700,color:"#6366f1",flexShrink:0}}>{s.progress}%</span></div></td>
                  <td className="td"><span className={`chip ${isActive(s.lastActive)?"active":"inactive"}`}>{isActive(s.lastActive)?"Active":"Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards — same data, stacked layout instead of a cramped scrolling table */}
        <div className="mcards">
          {paginated.map(s=>(
            <div key={s.id} className="mcard" onClick={()=>onSelect(s)}>
              <img src={s.photo} alt={s.name} className="simg"/>
              <div className="mcard-body">
                <div className="mcard-top">
                  <div className="sname">{s.name}</div>
                  <span className={`chip ${isActive(s.lastActive)?"active":"inactive"}`}>{isActive(s.lastActive)?"Active":"Inactive"}</span>
                </div>
                <div className="mcard-meta">
                  <span>Class {s.class}-{s.section}</span>
                  <span>{fmtMins(s.totalLearningTime)}</span>
                  <span className={`chip ${engLevel(s.engagementScore)}`} style={{padding:"1px 7px"}}>{s.engagementScore}</span>
                </div>
                <div className="prow" style={{marginTop:7}}>
                  <div className="pbar"><div className="pfill" style={{width:`${s.progress}%`}}/></div>
                  <span style={{fontSize:11,fontWeight:700,color:"#6366f1",flexShrink:0}}>{s.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(paginated.length===0)&&<div className="empty"><div className="empty-ico">🔍</div><div style={{fontSize:13,fontWeight:600,color:"var(--t2)"}}>No students found</div><div style={{fontSize:12,color:"var(--t3)",marginTop:4}}>Try adjusting or resetting the filters above.</div></div>}

        <div className="pag">
          <span className="pgi">{sorted.length} total · page {page} of {totalPages}</span>
          <button className="pgb" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
          {Array.from({length:Math.min(5,totalPages)},(_,i)=>{const pg=page<=3?i+1:page+i-2;if(pg<1||pg>totalPages)return null;return<button key={pg} className={`pgb${page===pg?" on":""}`} onClick={()=>setPage(pg)}>{pg}</button>;}).filter(Boolean)}
          <button className="pgb" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
        </div>
      </div>
    </div>
  );
}

// ─── CLASSES TAB ──────────────────────────────────────────────────────────────
function ClassesTab({classes,students,onSelect}){
  const [sel,setSel]=useState(null);
  const classStudents=useMemo(()=>sel?students.filter(s=>s.class===sel.class&&s.section===sel.section):[],[sel,students]);
  const colors=["#6366f1","#10b981","#f59e0b","#ec4899","#8b5cf6","#06b6d4"];

  const featureBarData=sel?sel.featureBreakdown.map((f,i)=>({label:f.feature,value:f.time,color:FC[f.feature]||colors[i%colors.length]})).sort((a,b)=>b.value-a.value):[];

  return(
    <>
      <div className="g3 mb">
        {classes.map((c,i)=>{
          const col=colors[i%colors.length];
          const isSel=sel?.class===c.class&&sel?.section===c.section;
          const actRatio=c.totalStudents>0?Math.round((c.activeStudents/c.totalStudents)*100):0;
          return(
            <div key={i} onClick={()=>setSel(isSel?null:c)} className="panel" style={{cursor:"pointer",borderColor:isSel?col:"var(--brd)",borderWidth:isSel?2:1,transition:"border-color .2s"}}>
              <div className="ph" style={{borderLeft:`4px solid ${col}`,paddingLeft:14}}>
                <div className="pt">Class {c.class}-{c.section}</div><div className="ps">{c.totalStudents} students</div>
              </div>
              <div className="pb">
                {[["Avg learning time",fmtMins(c.avgTimePerStudent)],["Most used",c.mostUsedFeature],["Least used",c.leastUsedFeature],["Active this week",`${actRatio}%`]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--brd2)",fontSize:12.5,gap:8}}>
                    <span style={{color:"var(--t2)"}}>{l}</span><span style={{fontWeight:700,color:"var(--t)",textAlign:"right"}}>{v}</span>
                  </div>
                ))}
                {isSel&&<div style={{marginTop:10,fontSize:11.5,color:col,fontWeight:600}}>▲ Showing details below</div>}
                {!isSel&&<div style={{marginTop:10,fontSize:11.5,color:"var(--t3)"}}>Tap to see students &amp; feature breakdown</div>}
              </div>
            </div>
          );
        })}
      </div>

      {sel&&(
        <div className="g2 mb">
          {/* Feature usage for selected class — same simple bar list as Overview */}
          <div className="panel">
            <div className="ph">
              <div className="pt">📚 Feature usage — Class {sel.class}-{sel.section}</div>
              <div className="ps">Total time this class spent on each feature</div>
            </div>
            <div className="pb"><BarList data={featureBarData} valueFormatter={fmtMins} wideLabel/></div>
          </div>

          {/* Student list, ranked */}
          <div className="panel">
            <div className="ph">
              <div className="pt">👩‍🎓 Students, ranked by engagement</div>
              <div className="ps">Tap any student for full details</div>
            </div>
            <div className="pb" style={{paddingTop:10}}>
              {classStudents.sort((a,b)=>b.engagementScore-a.engagementScore).map((s,i)=>(
                <div key={i} className="rrow" style={{cursor:"pointer"}} onClick={()=>onSelect(s)}>
                  <div className="rn" style={{color:i===0?"#f59e0b":"var(--t3)"}}>{i+1}</div>
                  <img src={s.photo} alt={s.name} className="ri"/>
                  <div className="rin"><div className="rname">{s.name}</div><div className="rdet">{fmtMins(s.totalLearningTime)} · {s.loginFrequency}×/wk</div></div>
                  <span className={`chip ${engLevel(s.engagementScore)}`}>{s.engagementScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── ANALYTICS TAB ───────────────────────────────────────────────────────────
function AnalyticsTab({students,onSelect}){
  const trendData=useMemo(()=>{
    const map={};
    students.forEach(s=>s.activityHistory.forEach(a=>{map[a.date]=(map[a.date]||0)+a.timeSpent;}));
    const days=Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).slice(-30);
    return days.map(([,v])=>v);
  },[students]);

  const topByTime=useMemo(()=>[...students].sort((a,b)=>b.totalLearningTime-a.totalLearningTime).slice(0,6),[students]);
  const leastByTime=useMemo(()=>[...students].sort((a,b)=>a.totalLearningTime-b.totalLearningTime).slice(0,6),[students]);

  // Engagement vs time-spent, simplified into 3 plain buckets instead of a scatter/bubble plot.
  const buckets=useMemo(()=>{
    const sorted=[...students].sort((a,b)=>b.totalLearningTime-a.totalLearningTime);
    const med=sorted[Math.floor(sorted.length/2)]?.totalLearningTime||0;
    const onTrack=students.filter(s=>s.engagementScore>60&&s.totalLearningTime>=med).length;
    const puttingInTime=students.filter(s=>s.engagementScore<=60&&s.totalLearningTime>=med).length;
    const lowBoth=students.filter(s=>s.totalLearningTime<med).length;
    return [
      {label:"Engaged & on track",value:onTrack,color:"#10b981"},
      {label:"Putting in time, low engagement",value:puttingInTime,color:"#f59e0b"},
      {label:"Below-average time",value:lowBoth,color:"#ef4444"},
    ];
  },[students]);

  const trendMax=Math.max(...trendData,1);
  const trendAvg=trendData.length?Math.round(trendData.reduce((a,b)=>a+b,0)/trendData.length):0;

  return(
    <>
      {/* Trend line — 30-day total */}
      <div className="panel mb">
        <div className="ph">
          <div className="pt">📈 Are students learning more or less over time?</div>
          <div className="ps">Total minutes across all students, day by day. Drag or hover to check a specific day</div>
        </div>
        <div className="pb">
          <TrendLine data={trendData} color="#6366f1"/>
          <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
            {[{l:"Peak day",v:fmtMins(trendMax),c:"#6366f1"},{l:"Daily average",v:fmtMins(trendAvg),c:"#10b981"},{l:"Active days",v:`${trendData.filter(v=>v>0).length}/30`,c:"#f59e0b"}].map((m,i)=>(
              <div key={i} style={{flex:"1 1 110px",background:"var(--sur2)",borderRadius:9,padding:"8px 12px",border:"1px solid var(--brd)"}}>
                <div style={{fontSize:10.5,color:"var(--t3)"}}>{m.l}</div>
                <div style={{fontSize:16,fontWeight:800,color:m.c}}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engagement buckets — plain bar list instead of a bubble scatterplot */}
      <div className="panel mb">
        <div className="ph">
          <div className="pt">🎯 Who's engaged, and who needs a nudge?</div>
          <div className="ps">Every student grouped into one of three simple categories</div>
        </div>
        <div className="pb">
          <BarList data={buckets} wideLabel valueFormatter={(v)=>`${v} students`}/>
          <div className="insight">💡 <span>This groups students by both <b>time spent</b> and <b>engagement score</b> together — the categories most useful for deciding who to check in with.</span></div>
        </div>
      </div>

      <div className="g2">
        {/* Top learners */}
        <div className="panel">
          <div className="ph"><div className="pt">🔥 Top by learning time</div><div className="ps">Most hours logged</div></div>
          <div className="pb" style={{paddingTop:8}}>
            {topByTime.map((s,i)=>(
              <div key={i} className="rrow" style={{cursor:"pointer"}} onClick={()=>onSelect(s)}>
                <div className="rn" style={{color:i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7c4e":"var(--t3)"}}>{i+1}</div>
                <img src={s.photo} alt={s.name} className="ri"/>
                <div className="rin"><div className="rname">{s.name}</div><div className="rdet">Class {s.class}-{s.section}</div></div>
                <div className="rsco" style={{color:"#10b981"}}>{fmtMins(s.totalLearningTime)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Least active */}
        <div className="panel">
          <div className="ph"><div className="pt">📉 Needs support</div><div className="ps">Least learning time</div></div>
          <div className="pb" style={{paddingTop:8}}>
            {leastByTime.map((s,i)=>(
              <div key={i} className="rrow" style={{cursor:"pointer"}} onClick={()=>onSelect(s)}>
                <div className="rn">{i+1}</div>
                <img src={s.photo} alt={s.name} className="ri"/>
                <div className="rin"><div className="rname">{s.name}</div><div className="rdet">Class {s.class}-{s.section}</div></div>
                <div className="rsco" style={{color:"#ef4444"}}>{fmtMins(s.totalLearningTime)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── ALERTS TAB ──────────────────────────────────────────────────────────────
function AlertsTab({students,onSelect}){
  const lowEng=useMemo(()=>students.filter(s=>s.engagementScore<50).sort((a,b)=>a.engagementScore-b.engagementScore),[students]);
  const inact=useMemo(()=>students.filter(s=>!isActive(s.lastActive)),[students]);
  if(!lowEng.length&&!inact.length)return(
    <div className="panel"><div className="empty" style={{padding:60}}>
      <div className="empty-ico">🎉</div>
      <div style={{fontSize:14,fontWeight:600,color:"var(--t2)"}}>All students are on track!</div>
      <div style={{fontSize:12,color:"var(--t3)",marginTop:4}}>No alerts right now.</div>
    </div></div>
  );
  return(
    <>
      {lowEng.length>0&&(
        <div className="panel mb">
          <div className="ph">
            <div className="pt">⚠️ Low engagement — {lowEng.length} students</div>
            <div className="ps">Engagement score below 50 · these students may need support</div>
          </div>
          <div className="pb">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8}}>
              {lowEng.map((s,i)=>(
                <div key={i} className="aitem" onClick={()=>onSelect(s)}>
                  <img src={s.photo} alt={s.name} className="aimg"/>
                  <div className="ainfo">
                    <div className="aname">{s.name}</div>
                    <div className="adet">Class {s.class}-{s.section} · {fmtMins(s.totalLearningTime)}</div>
                    <div style={{height:5,background:"var(--sur3)",borderRadius:3,marginTop:6,width:"100%"}}>
                      <div style={{height:"100%",borderRadius:3,background:"#ef4444",width:`${s.engagementScore}%`}}/>
                    </div>
                  </div>
                  <div className="ascr" style={{color:"#ef4444"}}>{s.engagementScore}<br/><span style={{fontSize:9,fontWeight:400,color:"var(--t3)"}}>score</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {inact.length>0&&(
        <div className="panel">
          <div className="ph">
            <div className="pt">💤 Inactive students — {inact.length}</div>
            <div className="ps">Not seen in the last 7 days</div>
          </div>
          <div className="pb">
            {inact.map((s,i)=>{
              const daysAgo=Math.floor((Date.now()-new Date(s.lastActive).getTime())/86400000);
              return(
                <div key={i} className="aitem" onClick={()=>onSelect(s)}>
                  <img src={s.photo} alt={s.name} className="aimg"/>
                  <div className="ainfo">
                    <div className="aname">{s.name}</div>
                    <div className="adet">Class {s.class}-{s.section}</div>
                  </div>
                  <div className="ascr" style={{color:"#f59e0b"}}>{daysAgo}d<br/><span style={{fontSize:9,fontWeight:400,color:"var(--t3)"}}>ago</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function UserManagementDashboard(){
  const [theme,setTheme]=useState("light");
  const [tab,setTab]=useState("overview");
  const [students,setStudents]=useState([]);
  const [classes,setClasses]=useState([]);
  const [dashboard,setDashboard]=useState(null);
  const [loading,setLoading]=useState(true);
  const [selStudent,setSelStudent]=useState(null);
  const [toast,setToast]=useState(null);

  useEffect(()=>{
    Promise.all([api.getDashboard(),api.getStudents(),api.getClasses()])
      .then(([d,s,c])=>{setDashboard(d);setStudents(s);setClasses(c);})
      .finally(()=>setLoading(false));
  },[]);

  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),2500);};

  const handleExport=()=>{
    const rows=[["ID","Name","Class","Section","Mins","Engagement","Progress","Active"]];
    students.forEach(s=>rows.push([s.id,s.name,s.class,s.section,String(s.totalLearningTime),String(s.engagementScore),`${s.progress}%`,isActive(s.lastActive)?"Yes":"No"]));
    const blob=new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="students.csv";a.click();
    showToast("✅ Exported students.csv");
  };

  const alerts=useMemo(()=>students.filter(s=>s.engagementScore<50||!isActive(s.lastActive)),[students]);

  if(loading||!dashboard)return(
    <><style>{CSS}</style>
    <div className="um" data-theme={theme}>
      <div className="loader"><div className="spin"/><div style={{fontSize:14,fontWeight:600,color:"var(--t2)"}}>Loading dashboard…</div></div>
    </div></>
  );

  const {totalStudents,activeStudents,totalLearningHours,avgUsageTime,featureEngagementRate,studentCompletionRate}=dashboard;
  const statCards=[
    {l:"Total students",v:totalStudents,sf:"",cls:"b",ico:"👥",s:"Enrolled"},
    {l:"Active this week",v:activeStudents,sf:"",cls:"g",ico:"✅",s:`${Math.round(activeStudents/totalStudents*100)}% of total`},
    {l:"Learning hours",v:totalLearningHours,sf:"h",cls:"p",ico:"📚",s:"All combined"},
    {l:"Avg usage",v:avgUsageTime,sf:"m",cls:"a",ico:"⏱",s:"Per student"},
    {l:"Top feature rate",v:featureEngagementRate[0]?.rate||0,sf:"%",cls:"c",ico:"🎯",s:featureEngagementRate[0]?.feature||""},
    {l:"Avg completion",v:studentCompletionRate,sf:"%",cls:"r",ico:"📈",s:"All courses"},
  ];
  const tabs=[
    {id:"overview",label:"Overview",icon:"📊"},
    {id:"students",label:"Students",icon:"👩‍🎓"},
    {id:"classes",label:"Classes",icon:"🏫"},
    {id:"analytics",label:"Analytics",icon:"📈"},
    {id:"alerts",label:"Alerts",icon:"🔔",badge:alerts.length},
  ];

  return(
    <><style>{CSS}</style>
    <div className="um" data-theme={theme}>
      <div className="top">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div className="top-logo">👥</div>
          <div><div className="top-title">User Management</div><div className="top-sub">Teacher dashboard · {totalStudents} students</div></div>
        </div>
        <div className="top-r">
          <div className="date-pill">📅 {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</div>
          <button className="txt-btn" onClick={handleExport}>⬇ Export CSV</button>
          <button className="icon-btn" onClick={()=>setTheme(t=>t==="light"?"dark":"light")} title="Toggle dark mode">{theme==="light"?"🌙":"☀️"}</button>
        </div>
      </div>

      <div className="stats">
        {statCards.map((s,i)=>(
          <div key={i} className={`sc ${s.cls}`}>
            <div className="sc-ico">{s.ico}</div>
            <div className="sc-n"><AnimNum target={s.v} suffix={s.sf}/></div>
            <div className="sc-l">{s.l}</div>
            <div className="sc-s">{s.s}</div>
          </div>
        ))}
      </div>

      <div className="nav">
        {tabs.map(t=>(
          <button key={t.id} className={`nb${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>
            {t.icon} {t.label}
            {t.badge&&t.badge>0?<span className="badge">{t.badge}</span>:null}
          </button>
        ))}
      </div>

      <div className="body">
        {tab==="overview"&&<OverviewTab students={students} classes={classes} dashboard={dashboard}/>}
        {tab==="students"&&<StudentsTab students={students} onSelect={setSelStudent}/>}
        {tab==="classes"&&<ClassesTab classes={classes} students={students} onSelect={setSelStudent}/>}
        {tab==="analytics"&&<AnalyticsTab students={students} onSelect={setSelStudent}/>}
        {tab==="alerts"&&<AlertsTab students={students} onSelect={setSelStudent}/>}
      </div>

      {selStudent&&<StudentDrawer student={selStudent} onClose={()=>setSelStudent(null)}/>}
      {toast&&<div className="toast ok">{toast}</div>}
    </div></>
  );
}