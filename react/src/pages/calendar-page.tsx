import React, { useState, useRef, useEffect, useCallback } from "react";
import Navigation from "../components/navigation";


const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root {
  --indigo:#6366f1;--purple:#8b5cf6;--pink:#ec4899;
  --green:#10b981;--amber:#f59e0b;--sky:#0ea5e9;--rose:#ef4444;
  
  /* Light theme variables */
  --slate-50:#f8fafc; --slate-100:#f1f5f9; --slate-200:#e2e8f0;
  --slate-400:#94a3b8; --slate-500:#64748b; --slate-700:#374151; --slate-900:#0f172a;
  --sat-bg:rgba(14,165,233,.06); --sun-bg:rgba(239,68,68,.06);
  --holiday-bg:linear-gradient(135deg,rgba(245,158,11,.08),rgba(236,72,153,.08));
  
  --surface-ground: var(--slate-50);
  --surface-raised: #fff;
  --surface-overlay: #fff;
  --text-primary: var(--slate-900);
  --text-secondary: var(--slate-500);
  --text-tertiary: var(--slate-400);
  --border-light: rgba(0,0,0,.06);
  --border-mid: rgba(0,0,0,.08);
  --border-dark: rgba(0,0,0,.1);
}

.dark {
  /* Dark theme variables */
  --slate-50: #0f172a; --slate-100: #1e293b; --slate-200: #334155;
  --slate-400: #64748b; --slate-500: #94a3b8; --slate-700: #cbd5e1; --slate-900: #f1f5f9;
  --sat-bg:rgba(14,165,233,.1); --sun-bg:rgba(239,68,68,.1);
  --holiday-bg:linear-gradient(135deg,rgba(245,158,11,.12),rgba(236,72,153,.12));

  --surface-ground: #0b1120;
  --surface-raised: #1e293b;
  --surface-overlay: #283447;
  --text-primary: var(--slate-100);
  --text-secondary: var(--slate-400);
  --text-tertiary: var(--slate-500);
  --border-light: rgba(255,255,255,.07);
  --border-mid: rgba(255,255,255,.1);
  --border-dark: rgba(255,255,255,.12);
}

.cal-root{
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  background:var(--surface-ground);color:var(--text-primary);
  height:100vh;display:flex;flex-direction:column;overflow:hidden;
}
.cal-shell{flex:1;display:flex;overflow:hidden;}

/* ── SIDEBAR ── */
.cal-sidebar{
  width:280px;flex-shrink:0;background:var(--surface-raised);
  border-right:1px solid var(--border-light);
  display:flex;flex-direction:column;overflow:hidden;
  box-shadow:1px 0 12px rgba(0,0,0,.04);
  transition:transform .3s ease;
}
.cal-sb-scroll{
  flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#e2e8f0 transparent;
  padding:16px 14px 24px;
}
.cal-sb-scroll::-webkit-scrollbar{width:4px;}
.cal-sb-scroll::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px;}

.cal-new-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;
  width:calc(100% - 28px);margin:14px 14px 0;padding:12px;
  border-radius:14px;border:none;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff;font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  font-size:14px;font-weight:700;cursor:pointer;
  box-shadow:0 4px 14px rgba(99,102,241,.32);
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
}
.cal-new-btn:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(99,102,241,.44);}

/* Mini calendar */
.cal-mini{margin-bottom:18px;}
.cal-mini-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.cal-mini-title{font-size:13px;font-weight:800;color:var(--slate-900);}
.cal-mini-nav{display:flex;gap:2px;}
.cal-mini-nav button{width:26px;height:26px;border-radius:8px;border:none;background:transparent;
  cursor:pointer;color:var(--slate-500);display:flex;align-items:center;justify-content:center;transition:all .15s;}
.cal-mini-nav button:hover{background:rgba(99,102,241,.1);color:var(--indigo);}
.cal-mini-days{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;}
.cal-mini-day-label{font-size:9.5px;font-weight:700;color:var(--slate-400);text-align:center;padding:2px 0;text-transform:uppercase;}
.cal-mini-dates{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
.cal-mini-date{
  height:28px;border-radius:8px;border:none;background:transparent;
  font-size:11.5px;font-weight:500;color:#374151;cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all .15s;position:relative;
}
.cal-mini-date:hover{background:rgba(99,102,241,.08);color:var(--indigo);}
.cal-mini-date.other-month{color:#cbd5e1;}
.cal-mini-date.past{color:#cbd5e1;cursor:default;}
.cal-mini-date.past:hover{background:transparent;color:#cbd5e1;}
.cal-mini-date.today{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:800;
  box-shadow:0 3px 8px rgba(99,102,241,.3);}
.cal-mini-date.selected{background:rgba(99,102,241,.12);color:var(--indigo);font-weight:700;}
.cal-mini-date.has-event::after{content:'';display:block;width:4px;height:4px;border-radius:50%;
  background:#ec4899;position:absolute;bottom:2px;left:50%;transform:translateX(-50%);}

.cal-sb-section{font-size:10px;font-weight:800;color:var(--slate-400);text-transform:uppercase;
  letter-spacing:.1em;margin:16px 0 8px;}
.cal-type-list{display:flex;flex-direction:column;gap:4px;}
.cal-type-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;
  cursor:pointer;transition:all .15s;border:1.5px solid transparent;}
.cal-type-item:hover{background:rgba(99,102,241,.05);}
.cal-type-item.active{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.2);}
.cal-type-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.cal-type-label{font-size:12.5px;font-weight:600;color:#374151;flex:1;}
.cal-type-count{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;
  background:#f1f5f9;color:var(--slate-400);}

.cal-upcoming-list{display:flex;flex-direction:column;gap:6px;}
.cal-up-item{padding:10px 12px;border-radius:12px;border:1.5px solid #f1f5f9;cursor:pointer;transition:all .18s;}
.cal-up-item:hover{border-color:#c7d2fe;background:rgba(99,102,241,.04);}
.cal-up-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:3px;}
.cal-up-title{font-size:12.5px;font-weight:700;color:var(--slate-900);margin-bottom:2px;}
.cal-up-meta{font-size:11px;color:var(--slate-400);font-weight:500;}

/* ── MAIN ── */
.cal-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;}

.cal-toolbar{
  background:var(--surface-raised);border-bottom:1px solid var(--border-light);
  padding:0 20px;height:58px;display:flex;align-items:center;
  gap:12px;flex-shrink:0;box-shadow:0 1px 8px rgba(0,0,0,.04);
}
.dark .cal-toolbar {
  box-shadow: none;
}
.cal-toolbar-title{font-size:17px;font-weight:800;color:var(--text-primary);min-width:180px;}
.cal-toolbar-nav{display:flex;gap:4px;}
.cal-toolbar-nav button,.cal-today-btn{
  height:36px;border-radius:10px;border:1.5px solid var(--border-mid);background:var(--surface-raised);
  cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  font-size:12.5px;font-weight:600;color:var(--text-secondary);
  display:flex;align-items:center;justify-content:center;gap:5px;
  padding:0 12px;transition:all .18s;
}
.cal-toolbar-nav button:hover,.cal-today-btn:hover{border-color:var(--indigo);color:var(--indigo);background:rgba(99,102,241,.05);}
.cal-today-btn{min-width:70px;}
.cal-view-btns{display:flex;background:var(--slate-100);border-radius:12px;padding:3px;border:1px solid var(--border-mid);}
.cal-view-btn{
  padding:6px 14px;border-radius:10px;border:none;background:transparent;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:12px;font-weight:600;
  color:var(--text-secondary);cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:5px;
}
.cal-view-btn.on{background:var(--surface-raised);color:var(--indigo);box-shadow:0 2px 8px rgba(0,0,0,.08);}
.cal-spacer{flex:1;}

/* Hamburger for mobile */
.cal-mob-menu-btn{
  display:none;width:36px;height:36px;border-radius:10px;border:1.5px solid var(--border-mid);
  background:var(--surface-raised);cursor:pointer;align-items:center;justify-content:center;color:var(--text-secondary);
}

/* ── MONTH VIEW ── */
.cal-month{flex:1;overflow:auto;display:flex;flex-direction:column;}
.cal-month-head{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--border-light);flex-shrink:0;}
.cal-month-dname{font-size:11px;font-weight:800;text-align:center;padding:10px 0;
  color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.07em;}
.cal-month-dname.sat{color:var(--sky);}
.cal-month-dname.sun{color:var(--rose);}
.cal-month-grid{flex:1;display:grid;grid-template-rows:repeat(6,1fr);overflow:hidden;}
.cal-month-week{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--border-light);}
.cal-month-week:last-child{border-bottom:none;}

/* Cell base */
.cal-month-cell{
  border-right:1px solid var(--border-light);padding:6px;
  overflow:hidden;cursor:pointer;transition:background .15s;min-height:90px;
  display:flex;flex-direction:column;position:relative;
}
.cal-month-cell:last-child{border-right:none;}
.cal-month-cell:hover{background:rgba(99,102,241,.03);}
.cal-month-cell.today{background:rgba(99,102,241,.04);}
.cal-month-cell.other-month{background: var(--slate-100);}
.dark .cal-month-cell.other-month { background: #1a2436; }
.cal-month-cell.sat-cell{background:var(--sat-bg);}
.cal-month-cell.sun-cell{background:var(--sun-bg);}
.cal-month-cell.sat-cell.today,.cal-month-cell.sun-cell.today{background:rgba(99,102,241,.05);}
/* Past dates */
.cal-month-cell.past-cell{cursor:default;opacity:.65;}
.cal-month-cell.past-cell:hover{background:inherit;}
.cal-month-cell.past-cell.sat-cell:hover{background:var(--sat-bg);}
.cal-month-cell.past-cell.sun-cell:hover{background:var(--sun-bg);}

/* Government holiday cell */
.cal-month-cell.holiday-cell{
  background:var(--holiday-bg);
  background-size:200% 200%;
  animation:holidayShimmer 3s ease infinite;
  cursor:default;
}
.cal-month-cell.holiday-cell:hover{opacity:.95;}
@keyframes holidayShimmer{
  0%{background-position:0% 50%}
  50%{background-position:100% 50%}
  100%{background-position:0% 50%}
}
.cal-holiday-badge{
  position:absolute;top:4px;right:4px;
  font-size:8.5px;font-weight:800;color:#fff;
  background:linear-gradient(135deg,#f59e0b,#ec4899);
  padding:2px 5px;border-radius:5px;letter-spacing:.04em;
  white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;
  box-shadow:0 2px 6px rgba(245,158,11,.3);
}
.cal-holiday-confetti{
  position:absolute;inset:0;overflow:hidden;pointer-events:none;
}
.cal-holiday-confetti span{
  position:absolute;font-size:10px;animation:confettiFall 4s linear infinite;opacity:.5;
}
@keyframes confettiFall{
  0%{transform:translateY(-20px) rotate(0deg);opacity:.6}
  100%{transform:translateY(110%) rotate(360deg);opacity:0}
}

.cal-cell-num{
  width:26px;height:26px;border-radius:8px;
  font-size:12px;font-weight:700;color:var(--text-primary);
  display:flex;align-items:center;justify-content:center;
  margin-bottom:4px;flex-shrink:0;transition:all .15s;
}
.cal-month-cell:not(.past-cell):hover .cal-cell-num{background:rgba(99,102,241,.1);color:var(--indigo);}
.cal-month-cell.today .cal-cell-num{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
  box-shadow:0 3px 8px rgba(99,102,241,.3);}
.cal-month-cell.other-month .cal-cell-num{color:var(--slate-400);}
.cal-month-cell.past-cell .cal-cell-num{color:var(--slate-400); opacity: .5;}
.cal-month-cell.sat-cell .cal-cell-num{color:var(--sky);}
.cal-month-cell.sun-cell .cal-cell-num{color:var(--rose);}
.cal-month-cell.today .cal-cell-num{color:#fff!important;}

.cal-cell-flags{display:flex;gap:2px;margin-bottom:2px;}
.cal-cell-flag{font-size:10px;}

.cal-month-events{display:flex;flex-direction:column;gap:2px;flex:1;overflow:hidden;}
.cal-month-ev{
  font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:5px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;
  transition:opacity .15s;display:flex;align-items:center;gap:3px;
}
.cal-month-ev:hover{opacity:.8;}
.cal-month-more{font-size:10px;font-weight:700;color:var(--indigo);cursor:pointer;padding:1px 4px;}

/* ── WEEK VIEW ── */
.cal-week{flex:1;overflow:auto;display:flex;flex-direction:column;}
.cal-week-head{display:grid;grid-template-columns:52px repeat(7,1fr);border-bottom:1px solid var(--border-light);flex-shrink:0;background:var(--surface-raised);}
.cal-week-dname{font-size:10.5px;font-weight:700;text-align:center;padding:8px 0 4px;
  color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;}
.cal-week-dname.sat-head{color:var(--sky);}
.cal-week-dname.sun-head{color:var(--rose);}
.cal-week-dnum{font-size:15px;font-weight:800;text-align:center;padding-bottom:8px;color:var(--text-primary);cursor:pointer;}
.cal-week-dnum.today{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.cal-week-dnum.past-num{color:var(--slate-400); opacity: .5;}
.cal-week-dnum.sat-num{color:var(--sky);}
.cal-week-dnum.sun-num{color:var(--rose);}
.cal-week-body{flex:1;display:grid;grid-template-columns:52px repeat(7,1fr);overflow:auto;position:relative;}
.cal-week-time-col{border-right:1px solid var(--border-light);}
.cal-week-time{height:60px;display:flex;align-items:flex-start;justify-content:flex-end;padding-right:8px;padding-top:2px;font-size:10px;font-weight:600;color:var(--text-tertiary);}
.cal-week-day-col{border-right:1px solid var(--border-light);position:relative;}
.cal-week-day-col:last-child{border-right:none;}
.cal-week-day-col.sat-col{background:var(--sat-bg);}
.cal-week-day-col.sun-col{background:var(--sun-bg);}
.cal-week-day-col.past-col{opacity:.7;}
.cal-week-slot{height:60px;border-bottom:1px solid var(--border-light); opacity: .5; cursor:pointer;transition:background .1s;}
.cal-week-slot:hover{background:rgba(99,102,241,.04);}
.cal-week-slot.past-slot{cursor:default;}
.cal-week-slot.past-slot:hover{background:transparent;}
.cal-week-ev{
  position:absolute;left:2px;right:2px;border-radius:8px;
  padding:4px 7px;cursor:pointer;overflow:hidden;
  font-size:11px;font-weight:600;color:#fff;
  box-shadow:0 2px 8px rgba(0,0,0,.15);transition:all .18s;z-index:2;
}
.cal-week-ev:hover{transform:scale(1.02);z-index:10;box-shadow:0 4px 16px rgba(0,0,0,.22);}
.cal-week-ev-title{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cal-week-ev-time{font-size:9.5px;opacity:.85;}
.cal-now-line{position:absolute;left:0;right:0;height:2px;background:#ef4444;z-index:5;pointer-events:none;}
.cal-now-dot{position:absolute;left:-4px;top:-4px;width:10px;height:10px;border-radius:50%;background:#ef4444;}

/* ── DAY VIEW ── */
.cal-day{flex:1;overflow:auto;display:flex;flex-direction:column;}
.cal-day-head{
  background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
  padding:16px 20px;flex-shrink:0;display:flex;align-items:center;gap:16px;
}
.cal-day-date{font-size:28px;font-weight:800;letter-spacing:-1px;}
.cal-day-name{font-size:14px;opacity:.8;font-weight:600;}
.cal-day-stats{display:flex;gap:12px;margin-left:auto;}
.cal-day-stat{text-align:center;padding:8px 14px;border-radius:12px;background:rgba(255,255,255,.15);backdrop-filter:blur(8px);}
.cal-day-stat-n{font-size:18px;font-weight:800;}
.cal-day-stat-l{font-size:10px;opacity:.7;margin-top:1px;}
.cal-day-body{flex:1;display:grid;grid-template-columns:52px 1fr;overflow:auto;}
.cal-day-time{height:60px;display:flex;align-items:flex-start;justify-content:flex-end;padding-right:8px;padding-top:2px;font-size:10px;font-weight:600;color:var(--text-tertiary);border-right:1px solid var(--border-light);}
.cal-day-slot{height:60px;border-bottom:1px solid var(--border-light); opacity: .5; cursor:pointer;transition:background .1s;position:relative;}
.cal-day-slot:hover{background:rgba(99,102,241,.04);}
.cal-day-slot.past-slot{cursor:default;}
.cal-day-slot.past-slot:hover{background:transparent;}
.cal-day-ev{
  position:absolute;left:4px;right:4px;border-radius:10px;
  padding:6px 10px;cursor:pointer;overflow:hidden;
  box-shadow:0 2px 10px rgba(0,0,0,.15);transition:all .18s;z-index:2;
}
.cal-day-ev:hover{transform:scale(1.01);z-index:10;box-shadow:0 4px 18px rgba(0,0,0,.22);}
.cal-day-ev-title{font-size:13px;font-weight:800;color:#fff;margin-bottom:2px;}
.cal-day-ev-meta{font-size:11px;color:rgba(255,255,255,.8);display:flex;align-items:center;gap:6px;flex-wrap:wrap;}

/* ── AGENDA VIEW ── */
.cal-agenda{flex:1;overflow:auto;padding:20px;}
.cal-agenda-group{margin-bottom:20px;}
.cal-agenda-date-head{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.cal-agenda-date-num{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 12px rgba(99,102,241,.3);}
.cal-agenda-date-num.today-num{background:linear-gradient(135deg,#ec4899,#8b5cf6);}
.cal-agenda-date-label{font-size:14px;font-weight:800;color:var(--text-primary);}
.cal-agenda-date-sub{font-size:12px;color:var(--text-secondary);font-weight:500;}
.cal-agenda-items{display:flex;flex-direction:column;gap:6px;padding-left:56px;}
.cal-agenda-item{
  display:flex;align-items:flex-start;gap:12px;padding:12px 16px;
  border-radius:14px;border:1.5px solid var(--slate-100);background:var(--surface-raised);
  cursor:pointer;transition:all .18s;box-shadow:0 1px 6px rgba(0,0,0,.04);
}
.dark .cal-agenda-item {
  border-color: var(--border-light)
}
.cal-agenda-item:hover{border-color:#c7d2fe;box-shadow:0 4px 16px rgba(99,102,241,.1);transform:translateX(3px);}
.cal-agenda-color{width:4px;border-radius:4px;flex-shrink:0;min-height:40px;}
.cal-agenda-info{flex:1;min-width:0;}
.cal-agenda-title{font-size:13.5px;font-weight:800;color:var(--text-primary);margin-bottom:3px;}
.cal-agenda-meta{display:flex;flex-wrap:wrap;gap:10px;}
.cal-agenda-meta-item{font-size:11.5px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;font-weight:500;}
.cal-agenda-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;flex-shrink:0;text-transform:uppercase;letter-spacing:.05em;align-self:flex-start;margin-top:1px;}

/* ── EVENT DETAIL POPUP ── */
.cal-detail{
  position:fixed;background:var(--surface-overlay);border-radius:18px;width:320px;
  box-shadow:0 16px 48px rgba(0,0,0,.18);z-index:300;overflow:hidden;
}
.cal-detail-head{padding:14px 16px;display:flex;align-items:center;justify-content:space-between;}
.cal-detail-title{font-size:14px;font-weight:800;color:#fff;flex:1;margin-right:8px;}
.cal-detail-close{width:26px;height:26px;border-radius:7px;border:none;background:rgba(255,255,255,.2);cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cal-detail-body{padding:14px 16px;display:flex;flex-direction:column;gap:9px;}
.cal-detail-row{display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--text-primary);font-weight:500;}
.cal-detail-foot{padding:10px 16px;border-top:1px solid var(--border-light);display:flex;gap:8px;flex-wrap:wrap;}
.cal-detail-edit{flex:1;padding:8px;border-radius:10px;border:none;background:rgba(99,102,241,.1);color:var(--indigo);font-size:12.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all .15s;}
.cal-detail-edit:hover{background:rgba(99,102,241,.18);}
.cal-detail-del{padding:8px 12px;border-radius:10px;border:none;background:rgba(239,68,68,.08);color:#dc2626;font-size:12.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all .15s;}
.cal-detail-del:hover{background:rgba(239,68,68,.16);}

/* Join meeting button */
.cal-join-btn{
  width:100%;padding:10px;border-radius:12px;border:none;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:13px;font-weight:800;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;
  transition:all .2s;margin-bottom:2px;
}
.cal-join-btn.enabled{
  background:linear-gradient(135deg,#10b981,#0ea5e9);color:#fff;
  box-shadow:0 4px 14px rgba(16,185,129,.3);
}
.cal-join-btn.enabled:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(16,185,129,.4);}
.cal-join-btn.disabled{background:#f1f5f9;color:var(--slate-400);cursor:not-allowed;}

/* ── MODAL ── */
.cal-modal-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);
  z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;
}
.dark .cal-modal-overlay {
  background:rgba(0,0,0,.7);
}
.cal-modal{
  background:var(--surface-overlay);border-radius:24px;width:100%;max-width:540px;
  box-shadow:0 24px 64px rgba(0,0,0,.2);overflow:hidden;
  animation:modalIn .3s cubic-bezier(.34,1.56,.64,1);
}
@keyframes modalIn{from{opacity:0;transform:scale(.92) translateY(20px)}to{opacity:1;transform:none}}
.cal-modal-head{padding:20px 24px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-light);}
.cal-modal-title{font-size:16px;font-weight:800;color:var(--text-primary);}
.cal-modal-close{width:32px;height:32px;border-radius:9px;border:1.5px solid var(--border-mid);background:var(--surface-raised);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);transition:all .18s;}
.cal-modal-close:hover{border-color:#ef4444;background:rgba(239,68,68,.06);color:#ef4444;}
.cal-modal-body{padding:20px 24px;display:flex;flex-direction:column;gap:14px;max-height:72vh;overflow-y:auto;}
.cal-modal-body::-webkit-scrollbar{width:4px;}
.cal-modal-body::-webkit-scrollbar-thumb{background:var(--slate-200);border-radius:4px;}

.cal-field{display:flex;flex-direction:column;gap:5px;}
.cal-field-label{font-size:11.5px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.07em;}
.cal-field-input{
  height:44px;border-radius:12px;border:1.5px solid var(--border-dark);background:var(--slate-100);
  padding:0 14px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  font-size:14px;color:var(--text-primary);outline:none;transition:all .2s;width:100%;
}
.cal-field-input:focus{border-color:var(--indigo);box-shadow:0 0 0 3px rgba(99,102,241,.1);background:var(--surface-raised);}
.cal-field-input::placeholder{color:var(--text-tertiary);}
.cal-field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.cal-type-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.cal-type-card{padding:12px 10px;border-radius:12px;border:2px solid var(--slate-100);cursor:pointer;text-align:center;transition:all .2s;background:var(--slate-50);}
.cal-type-card:hover{border-color:#c7d2fe;background:rgba(99,102,241,.04);}
.cal-type-card.on{border-color:var(--indigo);background:rgba(99,102,241,.08);}
.cal-type-card-icon{font-size:20px;margin-bottom:4px;}
.cal-type-card-label{font-size:11px;font-weight:700;color:var(--text-primary);}
.cal-type-card.on .cal-type-card-label{color:var(--indigo);}

/* Flag toggles in modal */
.cal-flag-row{display:flex;gap:10px;flex-wrap:wrap;}
.cal-flag-btn{
  display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:12px;
  border:2px solid var(--slate-100);background:var(--slate-50);cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  font-size:12px;font-weight:700;color:var(--text-primary);transition:all .2s;
}
.cal-flag-btn:hover{border-color:#c7d2fe;}
.cal-flag-btn.important-on{border-color:#f59e0b;background:rgba(245,158,11,.1);color:#d97706;}
.cal-flag-btn.exam-on{border-color:#ef4444;background:rgba(239,68,68,.1);color:#dc2626;}
.cal-flag-btn.notify-on{border-color:#6366f1;background:rgba(99,102,241,.1);color:#4f46e5;}

.cal-color-row{display:flex;gap:8px;flex-wrap:wrap;}
.cal-color-dot{width:28px;height:28px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:all .2s;}
.cal-color-dot.on{border-color:var(--text-primary);transform:scale(1.15);}
.cal-modal-foot{padding:16px 24px;border-top:1px solid var(--border-light);display:flex;gap:8px;justify-content:flex-end;}
.cal-btn-cancel{padding:10px 20px;border-radius:12px;border:1.5px solid var(--border-mid);background:var(--surface-raised);font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:13.5px;font-weight:600;color:var(--text-secondary);cursor:pointer;transition:all .18s;}
.cal-btn-cancel:hover{border-color:var(--indigo);color:var(--indigo);}
.cal-btn-save{padding:10px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:13.5px;font-weight:700;color:#fff;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.3);transition:all .2s;display:flex;align-items:center;gap:7px;}
.cal-btn-save:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(99,102,241,.4);}
.cal-btn-save:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.cal-btn-delete{padding:10px 16px;border-radius:12px;border:1.5px solid rgba(239,68,68,.2);background:rgba(239,68,68,.06);font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:13.5px;font-weight:600;color:#dc2626;cursor:pointer;transition:all .18s;display:flex;align-items:center;gap:6px;margin-right:auto;}
.cal-btn-delete:hover{background:rgba(239,68,68,.12);border-color:#ef4444;}

/* Notification toast */
.cal-notif-stack{position:fixed;top:16px;right:16px;z-index:999;display:flex;flex-direction:column;gap:8px;max-width:340px;}
.cal-notif{
  background:var(--surface-overlay);border-radius:16px;padding:14px 16px;
  box-shadow:0 8px 32px rgba(0,0,0,.15);border-left:4px solid var(--indigo);
  animation:notifSlide .4s cubic-bezier(.34,1.56,.64,1);
  display:flex;align-items:flex-start;gap:12px;
}
@keyframes notifSlide{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:none}}
.cal-notif.urgent{border-left-color:#ef4444;}
.cal-notif-icon{font-size:22px;flex-shrink:0;}
.cal-notif-body{flex:1;min-width:0;}
.cal-notif-title{font-size:13px;font-weight:800;color:var(--text-primary);margin-bottom:2px;}
.cal-notif-msg{font-size:11.5px;color:var(--text-secondary);font-weight:500;}
.cal-notif-close{width:22px;height:22px;border-radius:6px;border:none;background:var(--slate-100);cursor:pointer;color:var(--text-tertiary);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;}

/* Email notification simulation modal */
.cal-email-modal{
  position:fixed;bottom:20px;right:20px;width:340px;background:var(--surface-overlay);
  border-radius:18px;box-shadow:0 16px 48px rgba(0,0,0,.18);
  z-index:500;overflow:hidden;animation:emailSlide .4s cubic-bezier(.34,1.56,.64,1);
}
@keyframes emailSlide{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
.cal-email-head{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:12px 16px;display:flex;align-items:center;gap:10px;}
.cal-email-head-title{font-size:13px;font-weight:800;color:#fff;flex:1;}
.cal-email-body{padding:14px 16px;}
.cal-email-field{margin-bottom:10px;}
.cal-email-label{font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;}
.cal-email-value{font-size:12.5px;color:var(--text-secondary);font-weight:500;}
.cal-email-send{
  width:100%;padding:10px;border-radius:12px;border:none;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:13px;font-weight:700;
  cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:6px;
}
.cal-email-send:hover{transform:translateY(-1px);}

/* Mobile overlay */
.cal-mob-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;}
.cal-mob-overlay.visible{display:block;}

/* ── RESPONSIVE ── */
@media(max-width:1100px){
  .cal-sidebar{width:240px;}
}
@media(max-width:900px){
  .cal-sidebar{
    position:fixed;left:0;top:0;bottom:0;z-index:210;
    transform:translateX(-100%);
    width:280px;
  }
  .cal-sidebar.mob-open{transform:translateX(0);}
  .cal-mob-menu-btn{display:flex;}
}
@media(max-width:768px){
  .cal-toolbar{padding:0 12px;gap:8px;height:50px;}
  .cal-toolbar-title{font-size:13px;min-width:110px;}
  .cal-view-btn span{display:none;}
  .cal-day-stats{display:none;}
  .cal-month-cell{min-height:60px;padding:3px;}
  .cal-month-ev{display:none;}
  .cal-month-cell.has-any::after{content:'';display:block;width:4px;height:4px;border-radius:50%;background:var(--indigo);margin:2px auto;}
  .cal-week-head{grid-template-columns:36px repeat(7,1fr);}
  .cal-week-body{grid-template-columns:36px repeat(7,1fr);}
  .cal-week-time,.cal-day-time{font-size:8.5px;padding-right:4px;}
  .cal-week-ev-time{display:none;}
  .cal-field-row{grid-template-columns:1fr;}
  .cal-type-grid{grid-template-columns:repeat(3,1fr);}
  .cal-modal{max-width:100%;}
  .cal-modal-overlay{align-items:flex-end;padding:0;}
  .cal-modal{border-radius:24px 24px 0 0;}
  .cal-detail{width:280px;}
  .cal-notif-stack{max-width:calc(100vw - 32px);right:16px;}
}
@media(max-width:480px){
  .cal-toolbar-title{font-size:12px;min-width:90px;}
  .cal-month-dname{font-size:8.5px;}
  .cal-cell-num{width:20px;height:20px;font-size:10px;}
  .cal-agenda{padding:12px;}
  .cal-agenda-items{padding-left:0;}
  .cal-view-btn{padding:6px 8px;}
  .cal-today-btn{min-width:56px;font-size:11px;}
}
`;

// ── Types ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  class:   { label:"Class",   icon:"🎓", color:"#6366f1", bg:"rgba(99,102,241,.1)"  },
  meeting: { label:"Meeting", icon:"👥", color:"#0ea5e9", bg:"rgba(14,165,233,.1)"  },
  debate:  { label:"Debate",  icon:"🎤", color:"#f59e0b", bg:"rgba(245,158,11,.1)"  },
  seminar: { label:"Seminar", icon:"📚", color:"#10b981", bg:"rgba(16,185,129,.1)"  },
  exam:    { label:"Exam",    icon:"📝", color:"#ef4444", bg:"rgba(239,68,68,.1)"   },
  other:   { label:"Other",   icon:"📌", color:"#8b5cf6", bg:"rgba(139,92,246,.1)"  },
};

const PALETTE = ["#6366f1","#8b5cf6","#ec4899","#10b981","#f59e0b","#0ea5e9","#ef4444","#f97316"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const HOURS = Array.from({length:24},(_,i)=>i);

// Join-capable types
const JOIN_TYPES = ["meeting","debate","seminar"];

// ── Indian Government Holidays 2025 ─────────────────────────────────────────
const HOLIDAYS_2025 = {
  "2025-01-01":"New Year's Day",
  "2025-01-14":"Makar Sankranti / Pongal",
  "2025-01-26":"Republic Day",
  "2025-02-19":"Chhatrapati Shivaji Maharaj Jayanti",
  "2025-03-14":"Holi",
  "2025-03-30":"Ram Navami",
  "2025-04-10":"Mahavir Jayanti",
  "2025-04-14":"Dr. Ambedkar Jayanti / Good Friday",
  "2025-04-18":"Good Friday",
  "2025-05-01":"Maharashtra Day / Labour Day",
  "2025-05-12":"Buddha Purnima",
  "2025-06-07":"Eid ul-Adha",
  "2025-07-06":"Muharram",
  "2025-08-15":"Independence Day",
  "2025-08-16":"Janmashtami",
  "2025-08-27":"Onam",
  "2025-09-05":"Ganesh Chaturthi",
  "2025-10-02":"Gandhi Jayanti",
  "2025-10-02":"Dussehra",
  "2025-10-20":"Diwali (Lakshmi Puja)",
  "2025-10-22":"Diwali (Bhai Dooj)",
  "2025-11-05":"Guru Nanak Jayanti",
  "2025-11-15":"Jharkhand Foundation Day",
  "2025-12-25":"Christmas Day",
  // 2026 holidays
  "2026-01-01":"New Year's Day",
  "2026-01-14":"Makar Sankranti / Pongal",
  "2026-01-26":"Republic Day",
  "2026-03-02":"Maha Shivratri",
  "2026-03-04":"Holi",
  "2026-03-19":"Ram Navami",
  "2026-04-02":"Mahavir Jayanti",
  "2026-04-03":"Good Friday",
  "2026-04-14":"Dr. Ambedkar Jayanti",
  "2026-05-01":"Labour Day",
  "2026-08-15":"Independence Day",
  "2026-10-02":"Gandhi Jayanti",
  "2026-12-25":"Christmas Day",
};

// ── Utils ────────────────────────────────────────────────────────────────────
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatTime(t) {
  const [h,m] = t.split(":").map(Number);
  return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}
function toMinutes(t) {
  const [h,m] = t.split(":").map(Number);
  return h*60+m;
}
function nowMinutes() {
  const n = new Date();
  return n.getHours()*60+n.getMinutes();
}
function isJoinEnabled(ev, dateStr) {
  const todayStr = toDateStr(new Date());
  if(dateStr !== todayStr) return false;
  const evStart = toMinutes(ev.startTime);
  const evEnd = toMinutes(ev.endTime);
  const now = nowMinutes();
  return now >= evStart - 10 && now <= evEnd;
}

// ── Seed Events ──────────────────────────────────────────────────────────────
function seedEvents() {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth()+1;
  const pad = n => String(n).padStart(2,"0");
  const dt = day => `${y}-${pad(m)}-${pad(day)}`;
  const td = today.getDate();
  return [
    {id:"e1",title:"Biology Lecture",type:"class",date:dt(td),startTime:"09:00",endTime:"10:00",color:"#6366f1",location:"Room 101",attendees:"Grade 10",important:false,markExam:false,notifyEmail:true,emailId:"teacher@school.edu"},
    {id:"e2",title:"Maths Seminar",type:"seminar",date:dt(td),startTime:"11:00",endTime:"12:30",color:"#10b981",location:"Hall B",attendees:"Grade 11 & 12",important:false,markExam:false,notifyEmail:true,emailId:"teacher@school.edu"},
    {id:"e3",title:"Physics Debate",type:"debate",date:dt(Math.min(td+1,28)),startTime:"14:00",endTime:"15:30",color:"#f59e0b",description:"Newton vs Einstein",important:true,markExam:false,notifyEmail:false,emailId:""},
    {id:"e4",title:"Staff Meeting",type:"meeting",date:dt(Math.min(td+1,28)),startTime:"10:00",endTime:"11:00",color:"#0ea5e9",location:"Conference Room",attendees:"All Staff",important:false,markExam:false,notifyEmail:true,emailId:"staff@school.edu"},
    {id:"e5",title:"Chemistry Exam",type:"exam",date:dt(Math.min(td+3,28)),startTime:"09:00",endTime:"11:00",color:"#ef4444",location:"Exam Hall",attendees:"Grade 12",important:true,markExam:true,notifyEmail:true,emailId:"teacher@school.edu"},
    {id:"e6",title:"Parent-Teacher Meeting",type:"meeting",date:dt(Math.max(td-1,1)),startTime:"15:00",endTime:"17:00",color:"#0ea5e9",location:"Auditorium",important:false,markExam:false,notifyEmail:false,emailId:""},
    {id:"e7",title:"History Seminar",type:"seminar",date:dt(Math.min(td+5,28)),startTime:"13:00",endTime:"14:30",color:"#10b981",description:"World War II Analysis",important:false,markExam:false,notifyEmail:false,emailId:""},
    {id:"e8",title:"English Class",type:"class",date:dt(Math.min(td+2,28)),startTime:"08:00",endTime:"09:00",color:"#6366f1",location:"Room 204",important:false,markExam:false,notifyEmail:false,emailId:""},
  ];
}

const LS_KEY = "gradeup_cal_events_v3";
function loadEvents() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if(raw) return JSON.parse(raw);
  } catch(e){}
  return null;
}
function saveEvents(evs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(evs)); } catch(e){}
}

// ══════════════════════════════════════════════════════════════════════════════
export default function CalendarPage() {
  const today = new Date();
  const todayStr = toDateStr(today);

  const [role, setRole] = useState("student");
  const [view, setView] = useState("month");
  const [curDate, setCurDate] = useState(new Date());
  const [events, setEvents] = useState(() => loadEvents() || seedEvents());
  const [modal, setModal] = useState(false);
  const [editEvt, setEditEvt] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [miniDate, setMiniDate] = useState(new Date());
  const [mobOpen, setMobOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [emailModal, setEmailModal] = useState(null);
  const [notifiedIds, setNotifiedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gradeup_notified")||"[]"); } catch{return [];}
  });

  const [form, setFormState] = useState({
    title:"",type:"class",date:todayStr,startTime:"09:00",endTime:"10:00",
    color:"#6366f1",description:"",location:"",attendees:"",
    important:false,markExam:false,notifyEmail:false,emailId:"",
  });

  const setF = (k,v) => setFormState(p=>({...p,[k]:v}));

  // Persist events to localStorage
  useEffect(()=>{ saveEvents(events); },[events]);
  useEffect(()=>{ try{localStorage.setItem("gradeup_notified",JSON.stringify(notifiedIds));}catch{} },[notifiedIds]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        setEvents(loadEvents() || []);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // ── Notification checker (runs every 30s) ────────────────────────────────
  useEffect(()=>{
    function check() {
      const nowStr = toDateStr(new Date());
      const nowMins = nowMinutes();
      events.forEach(ev=>{
        if(!ev.notifyEmail || !ev.emailId) return;
        const evMins = toMinutes(ev.startTime);
        // 1hr before
        const id1h = `${ev.id}-1h`;
        if(ev.date === nowStr && Math.abs(evMins - nowMins - 60) <= 1 && !notifiedIds.includes(id1h)){
          pushNotif({icon:"📧",title:`Reminder: ${ev.title}`,msg:`Starts in 1 hour at ${formatTime(ev.startTime)}. Email sent to ${ev.emailId}`,urgent:false});
          setEmailModal({ev,type:"1h"});
          setNotifiedIds(p=>[...p,id1h]);
        }
        // At event time
        const idNow = `${ev.id}-now`;
        if(ev.date === nowStr && Math.abs(evMins - nowMins) <= 1 && !notifiedIds.includes(idNow)){
          pushNotif({icon:"🔔",title:`Starting Now: ${ev.title}`,msg:`Your event is starting! Check in at ${formatTime(ev.startTime)}`,urgent:true});
          setNotifiedIds(p=>[...p,idNow]);
        }
      });
    }
    check();
    const t = setInterval(check, 30000);
    return ()=>clearInterval(t);
  },[events, notifiedIds]);

  function pushNotif({icon,title,msg,urgent}) {
    const id = Date.now()+Math.random();
    setNotifications(p=>[...p,{id,icon,title,msg,urgent}]);
    setTimeout(()=>setNotifications(p=>p.filter(n=>n.id!==id)),7000);
  }

  // ── Modal helpers ────────────────────────────────────────────────────────
  function openNew(date, hour) {
    const d = date || todayStr;
    if(d < todayStr) return; // don't open for past
    const h = hour??9;
    const pad = n=>String(n).padStart(2,"0");
    setFormState({title:"",type:"class",date:d,startTime:`${pad(h)}:00`,endTime:`${pad(h+1)}:00`,
      color:"#6366f1",description:"",location:"",attendees:"",important:false,markExam:false,notifyEmail:false,emailId:""});
    setEditEvt(null);setModal(true);
  }
  function openEdit(ev) {
    setFormState({title:ev.title,type:ev.type,date:ev.date,startTime:ev.startTime,endTime:ev.endTime,
      color:ev.color,description:ev.description||"",location:ev.location||"",attendees:ev.attendees||"",
      important:!!ev.important,markExam:!!ev.markExam,notifyEmail:!!ev.notifyEmail,emailId:ev.emailId||""});
    setEditEvt(ev);setDetail(null);setModal(true);
  }
  function saveEvent() {
    if(!form.title.trim()) return;
    const ev = {...form,id:editEvt?editEvt.id:`ev-${Date.now()}`};
    if(editEvt) {
      setEvents(es=>es.map(e=>e.id===editEvt.id?ev:e));
    } else {
      setEvents(es=>[...es,ev]);
      if(form.notifyEmail && form.emailId) {
        pushNotif({icon:"📧",title:"Event Created!",msg:`Notification scheduled for "${form.title}" — email to ${form.emailId}`,urgent:false});
      }
    }
    setModal(false);
  }
  function deleteEvent(id) {
    setEvents(es=>es.filter(e=>e.id!==id));
    setDetail(null);setModal(false);
  }

  const visibleEvents = filterType==="all"?events:events.filter(e=>e.type===filterType);

  function nav(dir) {
    const d = new Date(curDate);
    if(view==="month") d.setMonth(d.getMonth()+dir);
    else if(view==="week") d.setDate(d.getDate()+dir*7);
    else d.setDate(d.getDate()+dir);
    setCurDate(d);
  }

  function toolbarTitle() {
    if(view==="month") return `${MONTHS[curDate.getMonth()]} ${curDate.getFullYear()}`;
    if(view==="week") {
      const s = new Date(curDate); s.setDate(curDate.getDate()-curDate.getDay());
      const e = new Date(s); e.setDate(s.getDate()+6);
      return `${s.getDate()} ${MONTHS[s.getMonth()].slice(0,3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0,3)} ${e.getFullYear()}`;
    }
    return `${DAYS[curDate.getDay()]}, ${MONTHS[curDate.getMonth()].slice(0,3)} ${curDate.getDate()}, ${curDate.getFullYear()}`;
  }

  function monthGrid(d) {
    const first = new Date(d.getFullYear(),d.getMonth(),1);
    const start = new Date(first); start.setDate(1-first.getDay());
    return Array.from({length:42},(_,i)=>{ const c=new Date(start); c.setDate(start.getDate()+i); return c; });
  }
  const cells = monthGrid(curDate);

  function weekDays(d) {
    const s = new Date(d); s.setDate(d.getDate()-d.getDay());
    return Array.from({length:7},(_,i)=>{ const c=new Date(s); c.setDate(s.getDate()+i); return c; });
  }
  const wDays = weekDays(curDate);

  function evForDate(ds) { return visibleEvents.filter(e=>e.date===ds); }
  function isToday(d) { return toDateStr(d)===todayStr; }
  function isPast(d) { return toDateStr(d)<todayStr; }
  function isSat(d) { return d.getDay()===6; }
  function isSun(d) { return d.getDay()===0; }

  function agendaDays() {
    const start = new Date(curDate.getFullYear(),curDate.getMonth(),1);
    const end = new Date(curDate.getFullYear(),curDate.getMonth()+1,0);
    const days=[];
    for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)) days.push(new Date(d));
    return days.filter(d=>visibleEvents.some(e=>e.date===toDateStr(d)));
  }

  // Click outside detail
  useEffect(()=>{
    if(!detail) return;
    const h=e=>{ if(!(e.target).closest(".cal-detail")) setDetail(null); };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[detail]);

  function showDetail(ev,e) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.right+8;
    let y = rect.top;
    const w = window.innerWidth;
    if(x+330>w) x = rect.left-338;
    if(x<8) x=8;
    if(y+350>window.innerHeight) y = window.innerHeight-360;
    if(y<8) y=8;
    setDetail({ev,x,y});
  }

  // ── Mini Calendar ─────────────────────────────────────────────────────────
  function SidebarMini() {
    const cells = monthGrid(miniDate);
    return (
      <div className="cal-mini">
        <div className="cal-mini-head">
          <span className="cal-mini-title">{MONTHS[miniDate.getMonth()].slice(0,3)} {miniDate.getFullYear()}</span>
          <div className="cal-mini-nav">
            <button onClick={()=>setMiniDate(p=>{const d=new Date(p);d.setMonth(d.getMonth()-1);return d;})}>‹</button>
            <button onClick={()=>setMiniDate(p=>{const d=new Date(p);d.setMonth(d.getMonth()+1);return d;})}>›</button>
          </div>
        </div>
        <div className="cal-mini-days">{DAYS.map(d=><div key={d} className="cal-mini-day-label">{d[0]}</div>)}</div>
        <div className="cal-mini-dates">
          {cells.map((c,i)=>{
            const ds=toDateStr(c);
            const isOther=c.getMonth()!==miniDate.getMonth();
            const isTod=isToday(c); const isSel=ds===toDateStr(curDate);
            const hasEv=events.some(e=>e.date===ds);
            const past=isPast(c);
            return <button key={i}
              className={`cal-mini-date${isOther?" other-month":""}${past&&!isTod?" past":""}${isTod?" today":""}${isSel&&!isTod?" selected":""}${hasEv?" has-event":""}`}
              onClick={()=>{ if(past&&!isTod) return; setCurDate(new Date(c)); if(view!=="month"&&view!=="week") setView("day"); }}
            >{c.getDate()}</button>;
          })}
        </div>
      </div>
    );
  }

  // ── Month Event Pill ──────────────────────────────────────────────────────
  function MonthEvPill({ev}) {
    const cfg = TYPE_CONFIG[ev.type];
    return (
      <div className="cal-month-ev" style={{background:ev.color,color:"#fff"}}
        onClick={e=>showDetail(ev,e)} title={`${ev.title} · ${formatTime(ev.startTime)}`}>
        {ev.important?"⭐ ":""}{ev.markExam?"📝 ":""}{cfg.icon} {ev.title}
      </div>
    );
  }

  // ── Holiday confetti ──────────────────────────────────────────────────────
  function HolidayConfetti() {
    const emojis=["🎉","✨","🌸","🪔","🎊","⭐"];
    return (
      <div className="cal-holiday-confetti">
        {emojis.map((em,i)=>(
          <span key={i} style={{left:`${(i*17+5)%90}%`,animationDelay:`${i*0.6}s`,animationDuration:`${3+i*0.4}s`}}>{em}</span>
        ))}
      </div>
    );
  }

  // ── Detail join button ────────────────────────────────────────────────────
  function JoinBtn({ev}) {
    const [,forceUpdate] = React.useState(0);
    useEffect(()=>{
      if (JOIN_TYPES.includes(ev.type)) {
        const t=setInterval(()=>forceUpdate(p=>p+1),30000);
        return ()=>clearInterval(t);
      }
    },[ev.type]);

    if(!JOIN_TYPES.includes(ev.type)) return null;
    
    const enabled = isJoinEnabled(ev, ev.date);
    return (
      <div style={{padding:"8px 16px",borderTop:"1px solid #f1f5f9"}}>
        <button className={`cal-join-btn ${enabled?"enabled":"disabled"}`}
          onClick={e=>{ e.stopPropagation(); if(enabled) pushNotif({icon:"🎥",title:"Joining Meeting",msg:`Connecting to "${ev.title}"...`,urgent:false}); }}
          disabled={!enabled}>
          🎥 {enabled?"Join Now":`Join ${ev.type.charAt(0).toUpperCase()+ev.type.slice(1)}`}
          {!enabled&&<span style={{fontSize:10,marginLeft:4}}>(enabled 10 min before)</span>}
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{CSS}</style>
      <div className="cal-root">
        <Navigation currentRole={role} onRoleChange={setRole} />

        {/* ── Notification toasts ── */}
        <div className="cal-notif-stack">
          {notifications.map(n=>(
            <div key={n.id} className={`cal-notif${n.urgent?" urgent":""}`}>
              <div className="cal-notif-icon">{n.icon}</div>
              <div className="cal-notif-body">
                <div className="cal-notif-title">{n.title}</div>
                <div className="cal-notif-msg">{n.msg}</div>
              </div>
              <button className="cal-notif-close" onClick={()=>setNotifications(p=>p.filter(x=>x.id!==n.id))}>✕</button>
            </div>
          ))}
        </div>

        {/* ── Email notification modal ── */}
        {emailModal && (
          <div className="cal-email-modal">
            <div className="cal-email-head">
              <span style={{fontSize:20}}>📧</span>
              <div className="cal-email-head-title">Email Notification Sent</div>
              <button style={{width:26,height:26,borderRadius:8,border:"none",background:"rgba(255,255,255,.2)",color:"#fff",cursor:"pointer"}}
                onClick={()=>setEmailModal(null)}>✕</button>
            </div>
            <div className="cal-email-body">
              <div className="cal-email-field">
                <div className="cal-email-label">To</div>
                <div className="cal-email-value">{emailModal.ev.emailId}</div>
              </div>
              <div className="cal-email-field">
                <div className="cal-email-label">Subject</div>
                <div className="cal-email-value">Reminder: {emailModal.ev.title}</div>
              </div>
              <div className="cal-email-field">
                <div className="cal-email-label">Message</div>
                <div className="cal-email-value" style={{fontSize:11.5}}>
                  Your event "<strong>{emailModal.ev.title}</strong>" is scheduled for {emailModal.ev.date} at {formatTime(emailModal.ev.startTime)}
                  {emailModal.ev.location ? ` in ${emailModal.ev.location}` : ""}. This reminder was sent {emailModal.type==="1h"?"1 hour":"at event time"}.
                </div>
              </div>
              <button className="cal-email-send" onClick={()=>setEmailModal(null)}>✓ Got it</button>
            </div>
          </div>
        )}

        {/* ── Mobile overlay ── */}
        <div className={`cal-mob-overlay${mobOpen?" visible":""}`} onClick={()=>setMobOpen(false)}/>

        <div className="cal-shell">
          {/* ── SIDEBAR ── */}
          <div className={`cal-sidebar${mobOpen?" mob-open":""}`}>
            <button className="cal-new-btn" onClick={()=>{openNew();setMobOpen(false);}}>
              ＋ New Event
            </button>
            <div className="cal-sb-scroll">
              <SidebarMini/>
              <div className="cal-sb-section">Event Types</div>
              <div className="cal-type-list">
                <div className={`cal-type-item${filterType==="all"?" active":""}`} onClick={()=>setFilterType("all")}>
                  <div className="cal-type-dot" style={{background:"linear-gradient(135deg,#6366f1,#ec4899)"}}/>
                  <span className="cal-type-label">All Events</span>
                  <span className="cal-type-count">{events.length}</span>
                </div>
                {Object.entries(TYPE_CONFIG).map(([k,cfg])=>(
                  <div key={k} className={`cal-type-item${filterType===k?" active":""}`} onClick={()=>setFilterType(k)}>
                    <div className="cal-type-dot" style={{background:cfg.color}}/>
                    <span className="cal-type-label">{cfg.icon} {cfg.label}</span>
                    <span className="cal-type-count">{events.filter(e=>e.type===k).length}</span>
                  </div>
                ))}
              </div>
              <div className="cal-sb-section">Upcoming</div>
              <div className="cal-upcoming-list">
                {[...visibleEvents].filter(e=>e.date>=todayStr).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime)).slice(0,6).map(ev=>(
                  <div key={ev.id} className="cal-up-item" onClick={()=>{setCurDate(new Date(ev.date));setView("day");setMobOpen(false);}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                      <div className="cal-up-dot" style={{background:ev.color,marginTop:3}}/>
                      <div>
                        <div className="cal-up-title">{ev.important?"⭐ ":""}{ev.markExam?"📝 ":""}{ev.title}</div>
                        <div className="cal-up-meta">{ev.date.slice(5).replace("-","/")} · {formatTime(ev.startTime)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MAIN ── */}
          <div className="cal-main">
            {/* Toolbar */}
            <div className="cal-toolbar">
              <button className="cal-mob-menu-btn" onClick={()=>setMobOpen(p=>!p)}>
                ☰
              </button>
              <div className="cal-toolbar-nav">
                <button onClick={()=>nav(-1)}>‹</button>
                <button onClick={()=>nav(1)}>›</button>
              </div>
              <button className="cal-today-btn" onClick={()=>{setCurDate(new Date());setMiniDate(new Date());}}>Today</button>
              <div className="cal-toolbar-title">{toolbarTitle()}</div>
              <div className="cal-spacer"/>
              <div className="cal-view-btns">
                {["month","week","day","agenda"].map(v=>(
                  <button key={v} className={`cal-view-btn${view===v?" on":""}`} onClick={()=>setView(v)}>
                    {v==="month"&&<>⊞<span> Month</span></>}
                    {v==="week"&&<>📅<span> Week</span></>}
                    {v==="day"&&<>◎<span> Day</span></>}
                    {v==="agenda"&&<>☰<span> Agenda</span></>}
                  </button>
                ))}
              </div>
              <button className="cal-btn-save" onClick={()=>openNew()} style={{padding:"8px 16px",fontSize:13,border:"none",borderRadius:12}}>
                ＋ Add
              </button>
            </div>

            {/* ══ MONTH VIEW ══ */}
            {view==="month"&&(
              <div className="cal-month">
                <div className="cal-month-head">
                  {DAYS.map((d,i)=>(
                    <div key={d} className={`cal-month-dname${i===6?" sat":""}${i===0?" sun":""}`}>{d}</div>
                  ))}
                </div>
                <div className="cal-month-grid">
                  {Array.from({length:6},(_,w)=>(
                    <div key={w} className="cal-month-week">
                      {cells.slice(w*7,(w+1)*7).map((c,di)=>{
                        const ds=toDateStr(c);
                        const dayEvs=evForDate(ds).sort((a,b)=>a.startTime.localeCompare(b.startTime));
                        const isOther=c.getMonth()!==curDate.getMonth();
                        const isTod=isToday(c);
                        const past=isPast(c);
                        const sat=isSat(c); const sun=isSun(c);
                        const holiday=HOLIDAYS_2025[ds];
                        let cellClass="cal-month-cell";
                        if(isTod) cellClass+=" today";
                        if(isOther) cellClass+=" other-month";
                        if(past&&!isTod) cellClass+=" past-cell";
                        if(sat&&!isTod&&!past) cellClass+=" sat-cell";
                        if(sun&&!isTod&&!past) cellClass+=" sun-cell";
                        if(holiday) cellClass+=" holiday-cell";
                        if(dayEvs.length>0) cellClass+=" has-any";
                        return (
                          <div key={di} className={cellClass}
                            onClick={()=>{ if(!past&&!holiday) openNew(ds); }}>
                            {holiday&&<HolidayConfetti/>}
                            {holiday&&<div className="cal-holiday-badge">{holiday}</div>}
                            <div style={{display:"flex",alignItems:"center",gap:2}}>
                              <div className="cal-cell-num">{c.getDate()}</div>
                              <div className="cal-cell-flags">
                                {dayEvs.some(e=>e.important)&&<span className="cal-cell-flag">⭐</span>}
                                {dayEvs.some(e=>e.markExam)&&<span className="cal-cell-flag">📝</span>}
                              </div>
                            </div>
                            <div className="cal-month-events">
                              {dayEvs.slice(0,2).map(ev=><MonthEvPill key={ev.id} ev={ev}/>)}
                              {dayEvs.length>2&&<div className="cal-month-more" onClick={e=>{e.stopPropagation();setCurDate(new Date(c));setView("day");}}>+{dayEvs.length-2} more</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ WEEK VIEW ══ */}
            {view==="week"&&(
              <div className="cal-week">
                <div className="cal-week-head">
                  <div/>
                  {wDays.map((d,i)=>{
                    const sat=isSat(d),sun=isSun(d),past=isPast(d),tod=isToday(d);
                    return (
                      <div key={i} style={{textAlign:"center",padding:"8px 0"}}>
                        <div className={`cal-week-dname${sat?" sat-head":""}${sun?" sun-head":""}`}>{DAYS[d.getDay()]}</div>
                        <div className={`cal-week-dnum${tod?" today":""}${past&&!tod?" past-num":""}${sat&&!tod?" sat-num":""}${sun&&!tod?" sun-num":""}`}
                          onClick={()=>{setCurDate(new Date(d));setView("day");}}>
                          {d.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="cal-week-body">
                  <div className="cal-week-time-col">
                    {HOURS.map(h=><div key={h} className="cal-week-time">{h===0?"":h<12?`${h}am`:h===12?"12pm":`${h-12}pm`}</div>)}
                  </div>
                  {wDays.map((d,di)=>{
                    const ds=toDateStr(d); const dayEvs=evForDate(ds);
                    const past=isPast(d); const sat=isSat(d); const sun=isSun(d); const tod=isToday(d);
                    const holiday=HOLIDAYS_2025[ds];
                    return (
                      <div key={di} className={`cal-week-day-col${sat&&!tod?" sat-col":""}${sun&&!tod?" sun-col":""}${past&&!tod?" past-col":""}`}
                        style={holiday?{background:"linear-gradient(180deg,rgba(245,158,11,.06),transparent)"}:{}}>
                        {HOURS.map(h=>(
                          <div key={h} className={`cal-week-slot${past?" past-slot":""}`}
                            onClick={()=>{ if(!past&&!holiday) openNew(ds,h); }}/>
                        ))}
                        {dayEvs.map(ev=>{
                          const top=(toMinutes(ev.startTime)/60)*60;
                          const ht=Math.max(30,((toMinutes(ev.endTime)-toMinutes(ev.startTime))/60)*60);
                          return (
                            <div key={ev.id} className="cal-week-ev"
                              style={{top,height:ht,background:`linear-gradient(135deg,${ev.color},${ev.color}cc)`}}
                              onClick={e=>showDetail(ev,e)}>
                              <div className="cal-week-ev-title">{ev.important?"⭐":""}{ev.markExam?"📝":""}{TYPE_CONFIG[ev.type].icon} {ev.title}</div>
                              <div className="cal-week-ev-time">{formatTime(ev.startTime)} – {formatTime(ev.endTime)}</div>
                            </div>
                          );
                        })}
                        {isToday(d)&&(()=>{const now=new Date();const top=((now.getHours()*60+now.getMinutes())/60)*60;return(<div className="cal-now-line" style={{top}}><div className="cal-now-dot"/></div>);})()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ DAY VIEW ══ */}
            {view==="day"&&(()=>{
              const ds=toDateStr(curDate);
              const dayEvs=evForDate(ds).sort((a,b)=>a.startTime.localeCompare(b.startTime));
              const past=isPast(curDate); const tod=isToday(curDate);
              const holiday=HOLIDAYS_2025[ds];
              const sat=isSat(curDate); const sun=isSun(curDate);
              let headBg="linear-gradient(135deg,#6366f1,#8b5cf6)";
              if(holiday) headBg="linear-gradient(135deg,#f59e0b,#ec4899)";
              else if(sat) headBg="linear-gradient(135deg,#0ea5e9,#6366f1)";
              else if(sun) headBg="linear-gradient(135deg,#ef4444,#ec4899)";
              return (
                <div className="cal-day">
                  <div className="cal-day-head" style={{background:headBg}}>
                    <div>
                      <div className="cal-day-name">{DAYS[curDate.getDay()]}, {MONTHS[curDate.getMonth()]}{holiday?` 🎉`:""}</div>
                      <div className="cal-day-date">{curDate.getDate()}</div>
                      {holiday&&<div style={{fontSize:12,opacity:.85,marginTop:2}}>🏛️ {holiday}</div>}
                      {past&&!tod&&<div style={{fontSize:11,opacity:.7,marginTop:2}}>📅 Past Date</div>}
                    </div>
                    <div className="cal-day-stats">
                      <div className="cal-day-stat"><div className="cal-day-stat-n">{dayEvs.length}</div><div className="cal-day-stat-l">Events</div></div>
                      {dayEvs.some(e=>e.important)&&<div className="cal-day-stat"><div className="cal-day-stat-n">⭐</div><div className="cal-day-stat-l">Important</div></div>}
                      {dayEvs.some(e=>e.markExam)&&<div className="cal-day-stat"><div className="cal-day-stat-n">📝</div><div className="cal-day-stat-l">Exam</div></div>}
                    </div>
                  </div>
                  <div className="cal-day-body">
                    <div>{HOURS.map(h=><div key={h} className="cal-day-time">{h===0?"":h<12?`${h}am`:h===12?"12pm":`${h-12}pm`}</div>)}</div>
                    <div style={{position:"relative"}}>
                      {HOURS.map(h=>(
                        <div key={h} className={`cal-day-slot${past?" past-slot":""}`}
                          onClick={()=>{ if(!past&&!holiday) openNew(ds,h); }}/>
                      ))}
                      {dayEvs.map(ev=>{
                        const top=(toMinutes(ev.startTime)/60)*60;
                        const ht=Math.max(40,((toMinutes(ev.endTime)-toMinutes(ev.startTime))/60)*60);
                        return (
                          <div key={ev.id} className="cal-day-ev"
                            style={{top,height:ht,background:`linear-gradient(135deg,${ev.color},${ev.color}cc)`}}
                            onClick={e=>showDetail(ev,e)}>
                            <div className="cal-day-ev-title">{ev.important?"⭐ ":""}{ev.markExam?"📝 ":""}{TYPE_CONFIG[ev.type].icon} {ev.title}</div>
                            <div className="cal-day-ev-meta">
                              🕐 {formatTime(ev.startTime)} – {formatTime(ev.endTime)}
                              {ev.location&&<>📍{ev.location}</>}
                            </div>
                          </div>
                        );
                      })}
                      {tod&&(()=>{const now=new Date();const top=((now.getHours()*60+now.getMinutes())/60)*60;return(<div className="cal-now-line" style={{top}}><div className="cal-now-dot"/></div>);})()}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ══ AGENDA VIEW ══ */}
            {view==="agenda"&&(
              <div className="cal-agenda">
                {agendaDays().length===0&&(
                  <div style={{textAlign:"center",padding:"60px 24px"}}>
                    <div style={{fontSize:48,marginBottom:12}}>📅</div>
                    <div style={{fontSize:16,fontWeight:700,color:"#374151"}}>No events this month</div>
                    <div style={{fontSize:13,color:"#94a3b8",marginTop:6}}>Click "+ New Event" to add something.</div>
                  </div>
                )}
                {agendaDays().map((d,gi)=>{
                  const ds=toDateStr(d);
                  const dayEvs=evForDate(ds).sort((a,b)=>a.startTime.localeCompare(b.startTime));
                  const isTod=isToday(d); const holiday=HOLIDAYS_2025[ds];
                  return (
                    <div key={gi} className="cal-agenda-group">
                      <div className="cal-agenda-date-head">
                        <div className={`cal-agenda-date-num${isTod?" today-num":""}`}
                          style={holiday?{background:"linear-gradient(135deg,#f59e0b,#ec4899)"}:{}}>
                          {d.getDate()}
                        </div>
                        <div>
                          <div className="cal-agenda-date-label">{DAYS[d.getDay()]}, {MONTHS[d.getMonth()].slice(0,3)} {d.getDate()}{holiday?` 🎉 ${holiday}`:""}</div>
                          <div className="cal-agenda-date-sub">{dayEvs.length} event{dayEvs.length!==1?"s":""}</div>
                        </div>
                      </div>
                      <div className="cal-agenda-items">
                        {dayEvs.map(ev=>{
                          const cfg=TYPE_CONFIG[ev.type];
                          return (
                            <div key={ev.id} className="cal-agenda-item" onClick={e=>showDetail(ev,e)}>
                              <div className="cal-agenda-color" style={{background:ev.color}}/>
                              <div className="cal-agenda-info">
                                <div className="cal-agenda-title">{ev.important?"⭐ ":""}{ev.markExam?"📝 ":""}{cfg.icon} {ev.title}</div>
                                <div className="cal-agenda-meta">
                                  <span className="cal-agenda-meta-item">🕐 {formatTime(ev.startTime)} – {formatTime(ev.endTime)}</span>
                                  {ev.location&&<span className="cal-agenda-meta-item">📍{ev.location}</span>}
                                  {ev.attendees&&<span className="cal-agenda-meta-item">👥{ev.attendees}</span>}
                                  {ev.notifyEmail&&ev.emailId&&<span className="cal-agenda-meta-item">📧{ev.emailId}</span>}
                                </div>
                              </div>
                              <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                                <div className="cal-agenda-badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</div>
                                {ev.important&&<div className="cal-agenda-badge" style={{background:"rgba(245,158,11,.1)",color:"#d97706"}}>⭐ Important</div>}
                                {ev.markExam&&<div className="cal-agenda-badge" style={{background:"rgba(239,68,68,.1)",color:"#dc2626"}}>📝 Exam</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══ DETAIL POPUP ══ */}
        {detail&&(()=>{
          const ev=detail.ev; const cfg=TYPE_CONFIG[ev.type];
          const joinable=JOIN_TYPES.includes(ev.type);
          return (
            <div className="cal-detail" style={{left:detail.x,top:detail.y}}>
              <div className="cal-detail-head" style={{background:`linear-gradient(135deg,${ev.color},${ev.color}cc)`}}>
                <div className="cal-detail-title">{ev.important?"⭐ ":""}{ev.markExam?"📝 ":""}{cfg.icon} {ev.title}</div>
                <button className="cal-detail-close" onClick={()=>setDetail(null)}>✕</button>
              </div>
              <div className="cal-detail-body">
                <div className="cal-detail-row">🕐 <span>{formatTime(ev.startTime)} – {formatTime(ev.endTime)}</span></div>
                <div className="cal-detail-row">📅 <span>{ev.date}</span></div>
                {ev.location&&<div className="cal-detail-row">📍 <span>{ev.location}</span></div>}
                {ev.attendees&&<div className="cal-detail-row">👥 <span>{ev.attendees}</span></div>}
                {ev.description&&<div className="cal-detail-row">📖 <span>{ev.description}</span></div>}
                {ev.notifyEmail&&ev.emailId&&<div className="cal-detail-row">📧 <span>{ev.emailId}</span></div>}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                  {ev.important&&<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"rgba(245,158,11,.1)",color:"#d97706"}}>⭐ Important</span>}
                  {ev.markExam&&<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"rgba(239,68,68,.1)",color:"#dc2626"}}>📝 Exam</span>}
                </div>
              </div>
              {joinable&&<JoinBtn ev={ev}/>}
              <div className="cal-detail-foot">
                <button className="cal-detail-del" onClick={()=>deleteEvent(ev.id)}>🗑 Delete</button>
                <button className="cal-detail-edit" onClick={()=>openEdit(ev)}>✏️ Edit</button>
              </div>
            </div>
          );
        })()}

        {/* ══ ADD / EDIT MODAL ══ */}
        {modal&&(
          <div className="cal-modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(false);}}>
            <div className="cal-modal">
              <div className="cal-modal-head">
                <div className="cal-modal-title">{editEvt?"✏️ Edit Event":"✨ New Event"}</div>
                <button className="cal-modal-close" onClick={()=>setModal(false)}>✕</button>
              </div>
              <div className="cal-modal-body">
                {/* Title */}
                <div className="cal-field">
                  <div className="cal-field-label">Event Title *</div>
                  <input className="cal-field-input" placeholder="e.g. Physics Seminar…"
                    value={form.title} onChange={e=>setF("title",e.target.value)}/>
                </div>
                {/* Type */}
                <div className="cal-field">
                  <div className="cal-field-label">Event Type</div>
                  <div className="cal-type-grid">
                    {Object.entries(TYPE_CONFIG).map(([k,cfg])=>(
                      <div key={k} className={`cal-type-card${form.type===k?" on":""}`}
                        onClick={()=>{setF("type",k);setF("color",cfg.color);}}>
                        <div className="cal-type-card-icon">{cfg.icon}</div>
                        <div className="cal-type-card-label">{cfg.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Date & Time */}
                <div className="cal-field-row">
                  <div className="cal-field">
                    <div className="cal-field-label">Date</div>
                    <input className="cal-field-input" type="date" value={form.date}
                      min={todayStr} onChange={e=>setF("date",e.target.value)}/>
                  </div>
                  <div className="cal-field">
                    <div className="cal-field-label">Time</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:4}}>
                      <input className="cal-field-input" type="time" value={form.startTime} onChange={e=>setF("startTime",e.target.value)}/>
                      <span style={{fontSize:12,color:"#94a3b8",textAlign:"center"}}>–</span>
                      <input className="cal-field-input" type="time" value={form.endTime} onChange={e=>setF("endTime",e.target.value)}/>
                    </div>
                  </div>
                </div>
                {/* Location & Attendees */}
                <div className="cal-field-row">
                  <div className="cal-field">
                    <div className="cal-field-label">Location</div>
                    <input className="cal-field-input" placeholder="Room, Hall, Online…" value={form.location} onChange={e=>setF("location",e.target.value)}/>
                  </div>
                  <div className="cal-field">
                    <div className="cal-field-label">Attendees</div>
                    <input className="cal-field-input" placeholder="Grade 10, All Staff…" value={form.attendees} onChange={e=>setF("attendees",e.target.value)}/>
                  </div>
                </div>
                {/* Description */}
                <div className="cal-field">
                  <div className="cal-field-label">Description</div>
                  <textarea className="cal-field-input" placeholder="Add details…" rows={2}
                    style={{height:"auto",padding:"10px 14px",resize:"vertical"}}
                    value={form.description} onChange={e=>setF("description",e.target.value)}/>
                </div>
                {/* Flags */}
                <div className="cal-field">
                  <div className="cal-field-label">Flags & Notifications</div>
                  <div className="cal-flag-row">
                    <button type="button" className={`cal-flag-btn${form.important?" important-on":""}`}
                      onClick={()=>setF("important",!form.important)}>
                      ⭐ {form.important?"Important ✓":"Mark Important"}
                    </button>
                    <button type="button" className={`cal-flag-btn${form.markExam?" exam-on":""}`}
                      onClick={()=>setF("markExam",!form.markExam)}>
                      📝 {form.markExam?"Exam ✓":"Mark as Exam"}
                    </button>
                    <button type="button" className={`cal-flag-btn${form.notifyEmail?" notify-on":""}`}
                      onClick={()=>setF("notifyEmail",!form.notifyEmail)}>
                      📧 {form.notifyEmail?"Notify ✓":"Email Notify"}
                    </button>
                  </div>
                </div>
                {/* Email ID (shown if notify enabled) */}
                {form.notifyEmail&&(
                  <div className="cal-field">
                    <div className="cal-field-label">Email Address for Notifications</div>
                    <input className="cal-field-input" type="email" placeholder="e.g. teacher@school.edu"
                      value={form.emailId} onChange={e=>setF("emailId",e.target.value)}/>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>📧 You'll receive a reminder 1 hour before the event.</div>
                  </div>
                )}
                {/* Color */}
                <div className="cal-field">
                  <div className="cal-field-label">Color</div>
                  <div className="cal-color-row">
                    {PALETTE.map(c=>(
                      <div key={c} className={`cal-color-dot${form.color===c?" on":""}`}
                        style={{background:c}} onClick={()=>setF("color",c)}/>
                    ))}
                  </div>
                </div>
                {/* Preview */}
                {form.title&&(
                  <div style={{padding:"10px 14px",borderRadius:12,background:form.color,color:"#fff",display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:700}}>
                    <span style={{fontSize:18}}>{TYPE_CONFIG[form.type].icon}</span>
                    <div>
                      <div>{form.important?"⭐ ":""}{form.markExam?"📝 ":""}{form.title}</div>
                      <div style={{fontSize:11,opacity:.8,fontWeight:500}}>{form.date} · {formatTime(form.startTime)} – {formatTime(form.endTime)}{form.location&&` · ${form.location}`}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="cal-modal-foot">
                {editEvt&&<button className="cal-btn-delete" onClick={()=>deleteEvent(editEvt.id)}>🗑 Delete</button>}
                <button className="cal-btn-cancel" onClick={()=>setModal(false)}>Cancel</button>
                <button className="cal-btn-save" onClick={saveEvent} disabled={!form.title.trim()}>
                  ✓ {editEvt?"Save Changes":"Create Event"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}