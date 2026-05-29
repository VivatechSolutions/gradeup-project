import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── GLOBAL CSS ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root{
  --bg:#f0f2ff;
  --surface:#ffffff;
  --surface2:#f7f8ff;
  --border:rgba(99,102,241,.12);
  --border2:rgba(99,102,241,.22);
  --text:#0f1117;
  --text2:#4b5563;
  --text3:#94a3b8;
  --accent:#5b5ef4;
  --accent2:#8b5cf6;
  --accent3:#ec4899;
  --green:#10b981;
  --amber:#f59e0b;
  --red:#ef4444;
  --blue:#3b82f6;
  --shadow:0 4px 24px rgba(91,94,244,.1);
  --shadow2:0 8px 40px rgba(91,94,244,.18);
  --radius:14px;
  --radius2:20px;
  --font:'Sora',sans-serif;
  --font2:'DM Sans',sans-serif;
}

.ms-root{font-family:var(--font);background:var(--bg);min-height:100dvh;display:flex;flex-direction:column;overflow-x:hidden;}

/* ── TOP NAV ── */
.ms-nav{
  height:58px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;
  background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0;position:sticky;top:0;z-index:100;
}
.ms-nav-logo{display:flex;align-items:center;gap:9px;}
.ms-nav-logo-icon{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;}
.ms-nav-logo-text{font-size:15px;font-weight:800;color:var(--text);letter-spacing:-.3px;}
.ms-nav-tabs{display:flex;gap:4px;background:var(--surface2);border-radius:11px;padding:3px;border:1px solid var(--border);}
.ms-nav-tab{padding:6px 16px;border-radius:8px;border:none;background:transparent;font-family:var(--font);font-size:12px;font-weight:600;color:var(--text2);cursor:pointer;transition:all .18s;}
.ms-nav-tab.active{background:var(--surface);color:var(--accent);box-shadow:0 2px 8px rgba(91,94,244,.15);border:1px solid var(--border2);}
.ms-nav-right{display:flex;align-items:center;gap:10px;}
.ms-new-btn{display:flex;align-items:center;gap:7px;padding:8px 16px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;font-family:var(--font);font-size:12.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(91,94,244,.3);transition:all .2s;}
.ms-new-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(91,94,244,.4);}

/* ── BODY ── */
.ms-body{flex:1;display:flex;gap:16px;padding:20px;min-height:0;}

/* ── CALENDAR PANEL ── */
.ms-cal-panel{
  width:340px;flex-shrink:0;display:flex;flex-direction:column;gap:14px;
}
.ms-panel-card{background:var(--surface);border-radius:var(--radius2);border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;}

/* Calendar header */
.ms-cal-head{padding:16px 18px 12px;border-bottom:1px solid var(--border);}
.ms-cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.ms-cal-month{font-size:15px;font-weight:700;color:var(--text);}
.ms-cal-arrow{width:28px;height:28px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);transition:all .15s;font-size:13px;}
.ms-cal-arrow:hover{background:rgba(91,94,244,.08);border-color:var(--border2);color:var(--accent);}
.ms-cal-days-row{display:grid;grid-template-columns:repeat(7,1fr);gap:0;margin-bottom:6px;}
.ms-cal-day-label{text-align:center;font-size:10.5px;font-weight:700;color:var(--text3);padding:4px 0;text-transform:uppercase;letter-spacing:.06em;}
.ms-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:0 2px 12px;}
.ms-cal-cell{aspect-ratio:1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;position:relative;border:1.5px solid transparent;}
.ms-cal-cell:hover{background:rgba(91,94,244,.08);}
.ms-cal-cell.today{background:rgba(91,94,244,.1);border-color:var(--accent);}
.ms-cal-cell.selected{background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent;}
.ms-cal-cell.other-month{opacity:.28;}
.ms-cal-cell-num{font-size:12.5px;font-weight:600;color:var(--text);}
.ms-cal-cell.selected .ms-cal-cell-num{color:#fff;}
.ms-cal-cell.today .ms-cal-cell-num{color:var(--accent);}
.ms-cal-cell-dots{display:flex;gap:2px;margin-top:1px;}
.ms-cal-dot{width:4px;height:4px;border-radius:50%;}
.ms-cal-cell.selected .ms-cal-dot{background:rgba(255,255,255,.7);}

/* Mini agenda */
.ms-mini-agenda{padding:12px 16px;}
.ms-mini-agenda-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:10px;}
.ms-mini-event{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);margin-bottom:6px;cursor:pointer;transition:all .15s;}
.ms-mini-event:hover{border-color:var(--border2);background:rgba(91,94,244,.05);}
.ms-mini-event-bar{width:3px;border-radius:2px;align-self:stretch;flex-shrink:0;}
.ms-mini-event-info{flex:1;min-width:0;}
.ms-mini-event-name{font-size:12px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ms-mini-event-time{font-size:10.5px;color:var(--text3);margin-top:1px;}

/* Stats row */
.ms-stats-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.ms-stat-card{background:var(--surface);border-radius:14px;border:1px solid var(--border);padding:12px 14px;text-align:center;}
.ms-stat-num{font-size:22px;font-weight:800;color:var(--accent);}
.ms-stat-lbl{font-size:9.5px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.07em;margin-top:2px;}

/* ── MAIN AREA ── */
.ms-main{flex:1;display:flex;flex-direction:column;gap:14px;min-width:0;}

/* ── MEETING CARD ── */
.ms-meet-card{
  background:var(--surface);border-radius:var(--radius2);border:1px solid var(--border);
  box-shadow:var(--shadow);padding:18px 20px;display:flex;align-items:flex-start;gap:14px;
  cursor:pointer;transition:all .2s;position:relative;overflow:hidden;
}
.ms-meet-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:4px 0 0 4px;}
.ms-meet-card.live::before{background:var(--green);}
.ms-meet-card.upcoming::before{background:var(--accent);}
.ms-meet-card.scheduled::before{background:var(--amber);}
.ms-meet-card.ended::before{background:var(--text3);}
.ms-meet-card:hover{transform:translateY(-2px);box-shadow:var(--shadow2);border-color:var(--border2);}
.ms-meet-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.ms-meet-body{flex:1;min-width:0;}
.ms-meet-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;}
.ms-meet-title{font-size:14px;font-weight:700;color:var(--text);}
.ms-meet-badge{font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.06em;}
.ms-badge-live{background:rgba(16,185,129,.12);color:#059669;}
.ms-badge-upcoming{background:rgba(91,94,244,.12);color:var(--accent);}
.ms-badge-scheduled{background:rgba(245,158,11,.12);color:#b45309;}
.ms-badge-ended{background:rgba(100,116,139,.1);color:#64748b;}
.ms-meet-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.ms-meet-meta-item{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text2);}
.ms-meet-actions{display:flex;gap:8px;align-items:center;flex-shrink:0;flex-wrap:wrap;}

/* Buttons */
.ms-btn{padding:7px 14px;border-radius:9px;border:none;font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer;transition:all .18s;display:flex;align-items:center;gap:6px;}
.ms-btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 3px 10px rgba(91,94,244,.25);}
.ms-btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(91,94,244,.35);}
.ms-btn-outline{background:var(--surface2);border:1.5px solid var(--border2);color:var(--accent);}
.ms-btn-outline:hover{background:rgba(91,94,244,.07);}
.ms-btn-ghost{background:transparent;border:1.5px solid var(--border);color:var(--text2);}
.ms-btn-ghost:hover{background:var(--surface2);}
.ms-btn-danger{background:rgba(239,68,68,.1);border:1.5px solid rgba(239,68,68,.2);color:var(--red);}
.ms-btn-danger:hover{background:rgba(239,68,68,.18);}
.ms-btn-green{background:rgba(16,185,129,.1);border:1.5px solid rgba(16,185,129,.22);color:var(--green);}
.ms-btn-green:hover{background:rgba(16,185,129,.18);}
.ms-btn-sm{padding:5px 11px;font-size:11px;}
.ms-btn-icon{width:32px;height:32px;padding:0;border-radius:9px;justify-content:center;}

/* Section header */
.ms-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.ms-section-title{font-size:13px;font-weight:800;color:var(--text);text-transform:uppercase;letter-spacing:.07em;}
.ms-section-count{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(91,94,244,.1);color:var(--accent);}

/* Live indicator */
.ms-live-pulse{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 0 rgba(16,185,129,.4);animation:livePulse 1.5s infinite;}
@keyframes livePulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.4);}70%{box-shadow:0 0 0 8px rgba(16,185,129,.0);}100%{box-shadow:0 0 0 0 rgba(16,185,129,.0);}}

/* ── MODALS ── */
.ms-overlay{position:fixed;inset:0;background:rgba(10,10,30,.55);backdrop-filter:blur(6px);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;}
.ms-modal{background:var(--surface);border-radius:var(--radius2);border:1px solid var(--border);box-shadow:0 30px 80px rgba(0,0,0,.25);width:100%;max-width:520px;max-height:90dvh;overflow-y:auto;display:flex;flex-direction:column;}
.ms-modal-lg{max-width:620px;}
.ms-modal-sm{max-width:420px;}
.ms-modal-head{padding:20px 22px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;position:sticky;top:0;background:var(--surface);z-index:1;border-radius:var(--radius2) var(--radius2) 0 0;}
.ms-modal-title{font-size:16px;font-weight:800;color:var(--text);}
.ms-modal-close{width:30px;height:30px;border-radius:8px;border:none;background:var(--surface2);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text2);font-size:16px;transition:all .15s;}
.ms-modal-close:hover{background:rgba(239,68,68,.1);color:var(--red);}
.ms-modal-body{padding:20px 22px;display:flex;flex-direction:column;gap:14px;flex:1;}
.ms-modal-footer{padding:16px 22px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;position:sticky;bottom:0;background:var(--surface);border-radius:0 0 var(--radius2) var(--radius2);}

/* Form elements */
.ms-field{display:flex;flex-direction:column;gap:6px;}
.ms-label{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;}
.ms-input,.ms-select,.ms-textarea{width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border2);background:var(--surface2);font-family:var(--font2);font-size:13px;color:var(--text);outline:none;transition:all .18s;}
.ms-input:focus,.ms-select:focus,.ms-textarea:focus{border-color:var(--accent);background:var(--surface);box-shadow:0 0 0 3px rgba(91,94,244,.1);}
.ms-textarea{resize:vertical;min-height:70px;}
.ms-select{appearance:none;cursor:pointer;}
.ms-input-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ms-input-icon-wrap{position:relative;}
.ms-input-icon-wrap .ms-input{padding-left:36px;}
.ms-input-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:14px;pointer-events:none;}

/* Toggle */
.ms-toggle-wrap{display:flex;align-items:center;justify-content:space-between;padding:10px 0;}
.ms-toggle-label{font-size:13px;font-weight:500;color:var(--text);}
.ms-toggle-sub{font-size:11px;color:var(--text3);}
.ms-toggle{width:40px;height:22px;border-radius:11px;border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
.ms-toggle.on{background:var(--accent);}
.ms-toggle.off{background:#d1d5db;}
.ms-toggle-thumb{position:absolute;top:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.2);transition:left .2s;}
.ms-toggle.on .ms-toggle-thumb{left:20px;}
.ms-toggle.off .ms-toggle-thumb{left:2px;}

/* Tabs inside modal */
.ms-tab-bar{display:flex;gap:3px;background:var(--surface2);border-radius:11px;padding:3px;border:1px solid var(--border);}
.ms-tab{flex:1;padding:7px 12px;border-radius:8px;border:none;font-family:var(--font);font-size:12px;font-weight:600;color:var(--text2);cursor:pointer;transition:all .18s;text-align:center;}
.ms-tab.active{background:var(--surface);color:var(--accent);box-shadow:0 2px 8px rgba(91,94,244,.12);border:1px solid var(--border2);}

/* Platform pills */
.ms-platform-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;}
.ms-platform-pill{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border-radius:12px;border:1.5px solid var(--border);background:var(--surface2);cursor:pointer;transition:all .15s;font-family:var(--font);font-size:11px;font-weight:600;color:var(--text2);}
.ms-platform-pill:hover{border-color:var(--border2);}
.ms-platform-pill.selected{border-color:var(--accent);background:rgba(91,94,244,.07);color:var(--accent);}
.ms-platform-emoji{font-size:22px;}

/* Share section */
.ms-share-link-box{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--surface2);border-radius:10px;border:1.5px solid var(--border2);}
.ms-share-link-url{flex:1;font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;}
.ms-copy-btn{padding:5px 12px;border-radius:8px;background:rgba(91,94,244,.1);border:1px solid var(--border2);color:var(--accent);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .15s;font-family:var(--font);}
.ms-copy-btn:hover{background:rgba(91,94,244,.18);}
.ms-share-socials{display:flex;gap:9px;flex-wrap:wrap;}
.ms-social-btn{display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);cursor:pointer;font-family:var(--font);font-size:12px;font-weight:600;color:var(--text2);transition:all .15s;}
.ms-social-btn:hover{border-color:var(--border2);transform:translateY(-1px);}

/* Attendees */
.ms-attendee-chips{display:flex;flex-wrap:wrap;gap:7px;}
.ms-chip{display:flex;align-items:center;gap:6px;padding:5px 10px;background:rgba(91,94,244,.07);border:1px solid rgba(91,94,244,.18);border-radius:20px;font-size:12px;font-weight:500;color:var(--accent);}
.ms-chip-remove{width:14px;height:14px;border-radius:50%;background:var(--accent);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;}

/* Color picker row */
.ms-color-row{display:flex;gap:8px;flex-wrap:wrap;}
.ms-color-dot{width:26px;height:26px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:all .15s;}
.ms-color-dot.selected{border-color:var(--text);transform:scale(1.15);}

/* Meeting detail view */
.ms-detail-hero{padding:24px 22px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:var(--radius2) var(--radius2) 0 0;}
.ms-detail-actions{display:flex;gap:9px;flex-wrap:wrap;padding:16px 22px;border-bottom:1px solid var(--border);}
.ms-detail-section{padding:14px 22px;border-bottom:1px solid var(--border);}
.ms-detail-section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--text3);margin-bottom:10px;}
.ms-info-row{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:13px;}
.ms-info-icon{width:28px;height:28px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
.ms-info-label{color:var(--text3);width:80px;flex-shrink:0;font-size:12px;}
.ms-info-value{color:var(--text);font-weight:500;}

/* Attendee list */
.ms-attendee-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);}
.ms-attendee-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;}

/* Empty state */
.ms-empty{text-align:center;padding:48px 20px;color:var(--text3);}
.ms-empty-icon{font-size:48px;margin-bottom:12px;opacity:.5;}
.ms-empty-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;}
.ms-empty-sub{font-size:13px;line-height:1.6;}

/* Notification toast */
.ms-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:600;background:var(--text);color:#fff;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 28px rgba(0,0,0,.25);pointer-events:none;font-family:var(--font);}

/* Scrollbar */
.ms-modal::-webkit-scrollbar{width:4px;}
.ms-modal::-webkit-scrollbar-thumb{background:rgba(91,94,244,.2);border-radius:4px;}

/* Responsive */
@media(max-width:1100px){.ms-cal-panel{width:290px;}}
@media(max-width:900px){
  .ms-cal-panel{display:none;}
  .ms-body{flex-direction:column;}
  .ms-nav-tabs{display:none;}
}
@media(max-width:640px){
  .ms-body{padding:12px;}
  .ms-meet-card{flex-direction:column;gap:10px;}
  .ms-meet-actions{width:100%;justify-content:flex-end;}
  .ms-input-row{grid-template-columns:1fr;}
  .ms-platform-grid{grid-template-columns:1fr 1fr;}
  .ms-modal{max-height:95dvh;}
  .ms-modal-head{padding:16px 16px 12px;}
  .ms-modal-body{padding:14px 16px;}
  .ms-modal-footer{padding:12px 16px;}
  .ms-nav{padding:0 14px;}
  .ms-new-btn span{display:none;}
}
@media(max-width:400px){
  .ms-platform-grid{grid-template-columns:1fr 1fr 1fr;}
  .ms-share-socials{gap:7px;}
}
`;

/* ─── DATA ─── */
const COLORS = ["#5b5ef4","#8b5cf6","#ec4899","#10b981","#f59e0b","#3b82f6","#ef4444","#06b6d4"];
const AV_BG = ["#5b5ef4","#8b5cf6","#0ea5e9","#10b981","#f59e0b","#ec4899","#ef4444","#06b6d4"];
const av = (n) => AV_BG[n?.charCodeAt(0) % AV_BG.length] || AV_BG[0];
const initials = (n="?") => n.split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase();
const fmt = (d) => d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
const fmtDate = (d) => d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});

const TODAY = new Date();
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const genId = () => Math.random().toString(36).substring(2,10);
const genMeetId = () => "AAC-" + Math.random().toString(36).substring(2,6).toUpperCase() + "-" + Math.random().toString(36).substring(2,6).toUpperCase();

const PLATFORMS = [
  {id:"zoom",label:"Zoom",emoji:"🎥",color:"#2D8CFF"},
  {id:"meet",label:"Google Meet",emoji:"🟢",color:"#00897B"},
  {id:"teams",label:"MS Teams",emoji:"🔵",color:"#5059C9"},
  {id:"zoho",label:"Zoho Meeting",emoji:"🟠",color:"#E8531A"},
  {id:"webex",label:"Webex",emoji:"🎯",color:"#00BCEB"},
  {id:"custom",label:"Custom Link",emoji:"🔗",color:"#5b5ef4"},
];

const DEBATE_TOPICS = ["AI vs Human Teachers","Climate Change Policies","Space Exploration Funding","Social Media & Youth","Free Trade vs Protectionism","Universal Basic Income","Nuclear Energy Future","Online Education vs Traditional"];

const INITIAL_MEETINGS = [
  {id:genId(),title:"Quantum Physics Debate",platform:"zoom",status:"live",meetId:genMeetId(),date:new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate(),TODAY.getHours(),TODAY.getMinutes()),duration:60,description:"AI vs Human Debate — Is quantum mechanics purely mathematical?",color:"#10b981",host:"Prof_Newton",attendees:["Scholar_Alpha","Quantum_Riya","You","AI Moderator"],topic:"Quantum Mechanics Reality",isPublic:true,link:"https://zoom.us/j/"+Math.random().toString().substring(2,14),channel:"quantum-physics",recurring:false},
  {id:genId(),title:"JavaScript Weekly Sync",platform:"meet",status:"upcoming",meetId:genMeetId(),date:new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate(),TODAY.getHours()+2,30),duration:45,description:"Weekly code review and architecture discussion for the Guild.",color:"#5b5ef4",host:"You",attendees:["Scholar_Alpha","AI Moderator"],topic:"Modern JS Patterns",isPublic:false,link:"https://meet.google.com/"+Math.random().toString(36).substring(2,12),channel:"javascript",recurring:true},
  {id:genId(),title:"History Lab Seminar",platform:"zoho",status:"scheduled",meetId:genMeetId(),date:new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate()+1,14,0),duration:90,description:"Ancient civilisations — structured debate format.",color:"#f59e0b",host:"Prof_Newton",attendees:["You","Scholar_Alpha","Quantum_Riya"],topic:"Were the Crusades Justified?",isPublic:true,link:"https://meeting.zoho.com/meeting/"+Math.random().toString(36).substring(2,12),channel:"ancient-greece",recurring:false},
  {id:genId(),title:"AI Ethics Open Forum",platform:"teams",status:"scheduled",meetId:genMeetId(),date:new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate()+3,16,0),duration:120,description:"Open discussion on AI ethics in education.",color:"#ec4899",host:"You",attendees:["AI Moderator","Quantum_Riya"],topic:"Should AI Replace Human Teachers?",isPublic:true,link:"https://teams.microsoft.com/l/"+genId(),channel:"general",recurring:false},
];

/* ─── Calendar helpers ─── */
function calDays(year, month) {
  const first = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) {
    const d = new Date(year, month, -first + i + 1);
    cells.push({ date: d, current: false });
  }
  for (let d = 1; d <= count; d++) cells.push({ date: new Date(year, month, d), current: true });
  while (cells.length < 42) {
    const d = new Date(year, month + 1, cells.length - count - first + 1);
    cells.push({ date: d, current: false });
  }
  return cells;
}

function sameDay(a, b) {
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}

/* ─── Avatar ─── */
const Av = ({ name, size = 32 }) => (
  <div style={{width:size,height:size,borderRadius:"50%",background:av(name),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:size*.32,fontFamily:"Sora,sans-serif",flexShrink:0}}>
    {initials(name)}
  </div>
);

/* ─── Toggle ─── */
const Toggle = ({ on, onToggle }) => (
  <button className={`ms-toggle ${on?"on":"off"}`} onClick={onToggle} type="button">
    <div className="ms-toggle-thumb"/>
  </button>
);

/* ─── Platform badge ─── */
const PlatBadge = ({ platform }) => {
  const p = PLATFORMS.find(x=>x.id===platform)||PLATFORMS[0];
  return <span style={{fontSize:13}}>{p.emoji}</span>;
};

/* ─── Status badge ─── */
const StatusBadge = ({ status }) => {
  const map = { live:["ms-badge-live","● LIVE"], upcoming:["ms-badge-upcoming","Soon"], scheduled:["ms-badge-scheduled","Scheduled"], ended:["ms-badge-ended","Ended"] };
  const [cls, label] = map[status]||map.scheduled;
  return <span className={`ms-meet-badge ${cls}`}>{label}</span>;
};

/* ─── Toast ─── */
const Toast = ({ msg, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []);
  return (
    <motion.div className="ms-toast" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}>
      {msg}
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════
   MODAL — New / Edit Meeting
══════════════════════════════════════════════════════ */
const MeetingFormModal = ({ initial, onClose, onSave, selectedDate }) => {
  const [tab, setTab] = useState("details");
  const [form, setForm] = useState(() => initial || {
    title: "", platform: "zoom", status: "scheduled",
    date: selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,"0")}-${String(selectedDate.getDate()).padStart(2,"0")}` : new Date().toISOString().substring(0,10),
    time: "10:00", duration: "60",
    description: "", topic: "", isPublic: true,
    color: "#5b5ef4", channel: "general",
    attendees: [], newAttendee: "", recurring: false,
    customLink: "", host: "You",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addAttendee = () => {
    if (!form.newAttendee.trim()) return;
    set("attendees", [...form.attendees, form.newAttendee.trim()]);
    set("newAttendee", "");
  };

  const meetLink = form.customLink || `https://${form.platform}.com/meeting/${genId()}`;

  const handleSave = () => {
    if (!form.title.trim()) return;
    const [y,m,d] = form.date.split("-").map(Number);
    const [hr,min] = form.time.split(":").map(Number);
    onSave({
      ...form, id: form.id || genId(), meetId: form.meetId || genMeetId(),
      date: new Date(y, m-1, d, hr, min),
      duration: Number(form.duration),
      link: meetLink,
      attendees: [...new Set([...form.attendees, "You"])],
    });
  };

  return (
    <div className="ms-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <motion.div className="ms-modal" initial={{opacity:0,scale:.94,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.94,y:16}} transition={{type:"spring",stiffness:300,damping:25}}>
        <div className="ms-modal-head">
          <div className="ms-modal-title">{initial?"Edit Meeting":"📅 New Meeting"}</div>
          <button className="ms-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ms-modal-body" style={{paddingTop:14}}>
          {/* Tabs */}
          <div className="ms-tab-bar">
            {["details","platform","attendees","share"].map(t=>(
              <button key={t} className={`ms-tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>

          {tab === "details" && (
            <>
              <div className="ms-field">
                <label className="ms-label">Meeting Title *</label>
                <input className="ms-input" value={form.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Quantum Physics Debate"/>
              </div>
              <div className="ms-input-row">
                <div className="ms-field">
                  <label className="ms-label">Date</label>
                  <input className="ms-input" type="date" value={form.date} onChange={e=>set("date",e.target.value)}/>
                </div>
                <div className="ms-field">
                  <label className="ms-label">Time</label>
                  <input className="ms-input" type="time" value={form.time} onChange={e=>set("time",e.target.value)}/>
                </div>
              </div>
              <div className="ms-input-row">
                <div className="ms-field">
                  <label className="ms-label">Duration (min)</label>
                  <select className="ms-select" value={form.duration} onChange={e=>set("duration",e.target.value)}>
                    {[15,30,45,60,90,120,180].map(d=><option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
                <div className="ms-field">
                  <label className="ms-label">Channel</label>
                  <select className="ms-select" value={form.channel} onChange={e=>set("channel",e.target.value)}>
                    {["general","quantum-physics","javascript","ancient-greece","resources"].map(c=><option key={c} value={c}>#{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="ms-field">
                <label className="ms-label">Debate Topic</label>
                <select className="ms-select" value={form.topic} onChange={e=>set("topic",e.target.value)}>
                  <option value="">None / Custom</option>
                  {DEBATE_TOPICS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="ms-field">
                <label className="ms-label">Description</label>
                <textarea className="ms-textarea" value={form.description} onChange={e=>set("description",e.target.value)} placeholder="What's this meeting about?"/>
              </div>
              <div className="ms-field">
                <label className="ms-label">Colour</label>
                <div className="ms-color-row">
                  {COLORS.map(c=>(
                    <div key={c} className={`ms-color-dot ${form.color===c?"selected":""}`} style={{background:c}} onClick={()=>set("color",c)}/>
                  ))}
                </div>
              </div>
              <div className="ms-toggle-wrap">
                <div><div className="ms-toggle-label">Recurring Meeting</div><div className="ms-toggle-sub">Repeat weekly</div></div>
                <Toggle on={form.recurring} onToggle={()=>set("recurring",!form.recurring)}/>
              </div>
              <div className="ms-toggle-wrap">
                <div><div className="ms-toggle-label">Public Meeting</div><div className="ms-toggle-sub">Visible to all community members</div></div>
                <Toggle on={form.isPublic} onToggle={()=>set("isPublic",!form.isPublic)}/>
              </div>
            </>
          )}

          {tab === "platform" && (
            <>
              <div className="ms-field">
                <label className="ms-label">Choose Platform</label>
                <div className="ms-platform-grid">
                  {PLATFORMS.map(p=>(
                    <div key={p.id} className={`ms-platform-pill ${form.platform===p.id?"selected":""}`} onClick={()=>set("platform",p.id)}>
                      <span className="ms-platform-emoji">{p.emoji}</span>
                      {p.label}
                    </div>
                  ))}
                </div>
              </div>
              {form.platform==="custom" && (
                <div className="ms-field">
                  <label className="ms-label">Custom Meeting URL</label>
                  <input className="ms-input" value={form.customLink} onChange={e=>set("customLink",e.target.value)} placeholder="https://your-meeting-link.com/..."/>
                </div>
              )}
              <div style={{padding:"12px 14px",background:"rgba(91,94,244,.06)",borderRadius:10,border:"1px solid rgba(91,94,244,.14)"}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--accent)",marginBottom:8,textTransform:"uppercase",letterSpacing:".07em"}}>Generated Meeting Link</div>
                <div className="ms-share-link-box" style={{marginBottom:0}}>
                  <span className="ms-share-link-url">{meetLink}</span>
                  <button className="ms-copy-btn" onClick={()=>navigator.clipboard?.writeText(meetLink)}>Copy</button>
                </div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:8}}>Meeting ID: <b style={{color:"var(--text2)"}}>{form.meetId||genMeetId()}</b></div>
              </div>
            </>
          )}

          {tab === "attendees" && (
            <>
              <div className="ms-field">
                <label className="ms-label">Add Attendees</label>
                <div style={{display:"flex",gap:8}}>
                  <input className="ms-input" style={{flex:1}} value={form.newAttendee} onChange={e=>set("newAttendee",e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addAttendee()} placeholder="Username or email"/>
                  <button className="ms-btn ms-btn-primary" onClick={addAttendee}>Add</button>
                </div>
              </div>
              <div className="ms-attendee-chips">
                {["You",...form.attendees].map(a=>(
                  <div key={a} className="ms-chip">
                    <Av name={a} size={18}/>
                    {a}
                    {a!=="You"&&<button className="ms-chip-remove" onClick={()=>set("attendees",form.attendees.filter(x=>x!==a))}>×</button>}
                  </div>
                ))}
              </div>
              <div style={{padding:"10px 12px",background:"var(--surface2)",borderRadius:10,border:"1px solid var(--border)",fontSize:12,color:"var(--text3)"}}>
                💡 Attendees will receive a notification with the meeting link when the meeting starts.
              </div>
            </>
          )}

          {tab === "share" && (
            <>
              <div className="ms-field">
                <label className="ms-label">Meeting Link</label>
                <div className="ms-share-link-box">
                  <span className="ms-share-link-url">{meetLink}</span>
                  <button className="ms-copy-btn" onClick={()=>navigator.clipboard?.writeText(meetLink)}>Copy</button>
                </div>
              </div>
              <div className="ms-field">
                <label className="ms-label">Share to Community Channel</label>
                <div style={{display:"flex",gap:8}}>
                  <select className="ms-select" style={{flex:1}} value={form.channel} onChange={e=>set("channel",e.target.value)}>
                    {["general","quantum-physics","javascript","ancient-greece","resources"].map(c=><option key={c}>{c}</option>)}
                  </select>
                  <button className="ms-btn ms-btn-primary" style={{whiteSpace:"nowrap"}}>📢 Post</button>
                </div>
              </div>
              <div className="ms-field">
                <label className="ms-label">Share on Social Media</label>
                <div className="ms-share-socials">
                  {[["WhatsApp","💬","#25D366"],["Telegram","✈️","#0088CC"],["Twitter/X","𝕏","#1DA1F2"],["LinkedIn","🔗","#0A66C2"],["Email","📧","#EA4335"],["Copy Link","🔗","var(--accent)"]].map(([name,icon,color])=>(
                    <button key={name} className="ms-social-btn" onClick={()=>navigator.clipboard?.writeText(meetLink)}>
                      <span style={{fontSize:15}}>{icon}</span>
                      <span style={{fontSize:11,color}}>{name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{padding:"12px 14px",background:"rgba(16,185,129,.06)",borderRadius:10,border:"1px solid rgba(16,185,129,.16)"}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--green)",marginBottom:6}}>✅ Meeting Ready to Share</div>
                <div style={{fontSize:11.5,color:"var(--text2)",lineHeight:1.6}}>
                  <b>Title:</b> {form.title||"Untitled"}<br/>
                  <b>Date:</b> {form.date} at {form.time}<br/>
                  <b>Platform:</b> {PLATFORMS.find(p=>p.id===form.platform)?.label}<br/>
                  <b>Link:</b> {meetLink}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="ms-modal-footer">
          <button className="ms-btn ms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ms-btn ms-btn-primary" onClick={handleSave} disabled={!form.title.trim()}>
            {initial?"Save Changes":"Create Meeting"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MODAL — Meeting Detail
══════════════════════════════════════════════════════ */
const MeetingDetailModal = ({ meeting, onClose, onEdit, onDelete, onJoin, onShare, toast }) => {
  const plat = PLATFORMS.find(p=>p.id===meeting.platform)||PLATFORMS[0];
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(meeting.link);
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
    toast("Link copied to clipboard ✓");
  };

  return (
    <div className="ms-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <motion.div className="ms-modal ms-modal-lg" initial={{opacity:0,scale:.94,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.94,y:16}} transition={{type:"spring",stiffness:300,damping:25}}>
        {/* Hero */}
        <div className="ms-detail-hero" style={{background:`linear-gradient(135deg,${meeting.color},${meeting.color}cc)`}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:24}}>{plat.emoji}</span>
                <StatusBadge status={meeting.status}/>
                {meeting.recurring&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,.2)",color:"#fff",textTransform:"uppercase",letterSpacing:".06em"}}>↻ Recurring</span>}
              </div>
              <div style={{fontSize:20,fontWeight:800,color:"#fff",letterSpacing:"-.3px",marginBottom:6,lineHeight:1.2}}>{meeting.title}</div>
              {meeting.topic&&<div style={{fontSize:12.5,color:"rgba(255,255,255,.8)",fontStyle:"italic"}}>{meeting.topic}</div>}
            </div>
            <button className="ms-modal-close" onClick={onClose} style={{background:"rgba(255,255,255,.2)",color:"#fff",flexShrink:0}}>×</button>
          </div>
        </div>

        {/* Actions */}
        <div className="ms-detail-actions">
          {meeting.status!=="ended"&&<button className="ms-btn ms-btn-primary" onClick={()=>onJoin(meeting)}>
            <span>{plat.emoji}</span> Join on {plat.label}
          </button>}
          <button className="ms-btn ms-btn-outline" onClick={copy}>{copied?"✓ Copied":"🔗 Copy Link"}</button>
          <button className="ms-btn ms-btn-ghost" onClick={()=>onShare(meeting)}>📤 Share</button>
          <button className="ms-btn ms-btn-ghost" onClick={()=>onEdit(meeting)}>✏️ Edit</button>
          <button className="ms-btn ms-btn-danger ms-btn-sm" onClick={()=>onDelete(meeting.id)}>🗑</button>
        </div>

        {/* Info */}
        <div className="ms-detail-section">
          <div className="ms-detail-section-title">Meeting Details</div>
          {[
            ["📅","Date",fmtDate(meeting.date)],
            ["⏰","Time",fmt(meeting.date)],
            ["⏱","Duration",`${meeting.duration} minutes`],
            ["💻","Platform",plat.label],
            ["🆔","Meeting ID",meeting.meetId],
            ["📢","Channel",`#${meeting.channel}`],
            ["👤","Host",meeting.host],
          ].map(([icon,label,value])=>(
            <div key={label} className="ms-info-row">
              <div className="ms-info-icon">{icon}</div>
              <div className="ms-info-label">{label}</div>
              <div className="ms-info-value">{value}</div>
            </div>
          ))}
        </div>

        {/* Link */}
        <div className="ms-detail-section">
          <div className="ms-detail-section-title">Meeting Link</div>
          <div className="ms-share-link-box">
            <span className="ms-share-link-url">{meeting.link}</span>
            <button className="ms-copy-btn" onClick={copy}>{copied?"✓":"Copy"}</button>
          </div>
        </div>

        {/* Description */}
        {meeting.description&&(
          <div className="ms-detail-section">
            <div className="ms-detail-section-title">Description</div>
            <p style={{fontSize:13,color:"var(--text2)",lineHeight:1.7}}>{meeting.description}</p>
          </div>
        )}

        {/* Attendees */}
        <div className="ms-detail-section" style={{borderBottom:"none"}}>
          <div className="ms-detail-section-title">Attendees ({meeting.attendees.length})</div>
          {meeting.attendees.map(a=>(
            <div key={a} className="ms-attendee-row">
              <Av name={a} size={32}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{a}</div>
                <div style={{fontSize:11,color:"var(--text3)"}}>{a==="AI Moderator"?"AI":"Member"} {a===meeting.host?"· Host":""}</div>
              </div>
              <div style={{width:8,height:8,borderRadius:"50%",background:a==="AI Moderator"||meeting.status==="live"?"var(--green)":"var(--text3)"}}/>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MODAL — Share Meeting
══════════════════════════════════════════════════════ */
const ShareModal = ({ meeting, onClose, toast }) => {
  const plat = PLATFORMS.find(p=>p.id===meeting.platform)||PLATFORMS[0];
  const msg = encodeURIComponent(`Join our meeting: ${meeting.title}\n${fmtDate(meeting.date)} at ${fmt(meeting.date)}\nLink: ${meeting.link}`);
  const socials = [
    {name:"WhatsApp",icon:"💬",color:"#25D366",url:`https://wa.me/?text=${msg}`},
    {name:"Telegram",icon:"✈️",color:"#0088CC",url:`https://t.me/share/url?url=${encodeURIComponent(meeting.link)}&text=${encodeURIComponent(meeting.title)}`},
    {name:"Twitter",icon:"𝕏",color:"#1DA1F2",url:`https://twitter.com/intent/tweet?text=${msg}`},
    {name:"LinkedIn",icon:"🔗",color:"#0A66C2",url:`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(meeting.link)}`},
    {name:"Email",icon:"📧",color:"#EA4335",url:`mailto:?subject=${encodeURIComponent(meeting.title)}&body=${msg}`},
  ];
  return (
    <div className="ms-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <motion.div className="ms-modal ms-modal-sm" initial={{opacity:0,scale:.94,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.94,y:16}} transition={{type:"spring",stiffness:300,damping:25}}>
        <div className="ms-modal-head">
          <div className="ms-modal-title">📤 Share Meeting</div>
          <button className="ms-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ms-modal-body">
          <div style={{padding:"14px 16px",background:"var(--surface2)",borderRadius:12,border:"1px solid var(--border)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:4}}>{meeting.title}</div>
            <div style={{fontSize:12,color:"var(--text3)"}}>{fmtDate(meeting.date)} · {fmt(meeting.date)} · {plat.emoji} {plat.label}</div>
          </div>
          <div className="ms-field">
            <label className="ms-label">Meeting Link</label>
            <div className="ms-share-link-box">
              <span className="ms-share-link-url">{meeting.link}</span>
              <button className="ms-copy-btn" onClick={()=>{navigator.clipboard?.writeText(meeting.link);toast("Link copied ✓");}}>Copy</button>
            </div>
          </div>
          <div className="ms-field">
            <label className="ms-label">Share to Community</label>
            <div style={{display:"flex",gap:8}}>
              <select className="ms-select" style={{flex:1}}>
                {["general","quantum-physics","javascript","ancient-greece"].map(c=><option key={c}>#{c}</option>)}
              </select>
              <button className="ms-btn ms-btn-primary" onClick={()=>toast("📢 Posted to channel!")}>Post</button>
            </div>
          </div>
          <div className="ms-field">
            <label className="ms-label">Share on Social</label>
            <div className="ms-share-socials">
              {socials.map(s=>(
                <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="ms-social-btn" style={{textDecoration:"none"}}>
                  <span style={{fontSize:16}}>{s.icon}</span>
                  <span style={{fontSize:11,color:s.color}}>{s.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MODAL — Quick Date Action (click on calendar date)
══════════════════════════════════════════════════════ */
const DateActionModal = ({ date, meetings, onClose, onNewMeeting, onViewMeeting }) => {
  const dayMeetings = meetings.filter(m=>sameDay(m.date,date));
  return (
    <div className="ms-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <motion.div className="ms-modal ms-modal-sm" initial={{opacity:0,scale:.94,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.94,y:16}} transition={{type:"spring",stiffness:300,damping:25}}>
        <div className="ms-modal-head">
          <div className="ms-modal-title">📅 {fmtDate(date)}</div>
          <button className="ms-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ms-modal-body">
          {dayMeetings.length>0?(
            <>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"var(--text3)",marginBottom:6}}>Meetings on this day</div>
              {dayMeetings.map(m=>(
                <div key={m.id} className="ms-mini-event" onClick={()=>onViewMeeting(m)} style={{marginBottom:8}}>
                  <div className="ms-mini-event-bar" style={{background:m.color}}/>
                  <div className="ms-mini-event-info">
                    <div className="ms-mini-event-name">{m.title}</div>
                    <div className="ms-mini-event-time">{fmt(m.date)} · {m.duration}min · {PLATFORMS.find(p=>p.id===m.platform)?.emoji}</div>
                  </div>
                  <StatusBadge status={m.status}/>
                </div>
              ))}
            </>
          ):(
            <div className="ms-empty" style={{padding:"24px 0"}}>
              <div style={{fontSize:32,marginBottom:8}}>📭</div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>No meetings</div>
              <div style={{fontSize:12,color:"var(--text3)",marginTop:4}}>Nothing scheduled for this day</div>
            </div>
          )}
        </div>
        <div className="ms-modal-footer">
          <button className="ms-btn ms-btn-ghost" onClick={onClose}>Close</button>
          <button className="ms-btn ms-btn-primary" onClick={()=>onNewMeeting(date)}>
            + Schedule Meeting
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════ */
export default function MeetingSystem() {
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);
  const [view, setView] = useState("upcoming"); // upcoming | scheduled | ended | all
  const [calYear, setCalYear] = useState(TODAY.getFullYear());
  const [calMonth, setCalMonth] = useState(TODAY.getMonth());
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [modalNew, setModalNew] = useState(false);
  const [modalEdit, setModalEdit] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalShare, setModalShare] = useState(null);
  const [modalDate, setModalDate] = useState(null);
  const [newMeetingDate, setNewMeetingDate] = useState(null);
  const [toast, setToastMsg] = useState(null);
  const [liveTimer, setLiveTimer] = useState(0);

  useEffect(() => {
    const t = setInterval(()=>setLiveTimer(x=>x+1), 30000);
    return ()=>clearInterval(t);
  }, []);

  const showToast = (msg) => { setToastMsg(msg); };

  const cells = calDays(calYear, calMonth);

  const getMeetDots = (d) => meetings.filter(m=>sameDay(m.date,d));

  const filteredMeetings = meetings.filter(m => {
    if (view==="all") return true;
    if (view==="upcoming") return m.status==="live"||m.status==="upcoming";
    if (view==="scheduled") return m.status==="scheduled";
    if (view==="ended") return m.status==="ended";
    return true;
  }).sort((a,b)=>a.date-b.date);

  const todayMeetings = meetings.filter(m=>sameDay(m.date,TODAY)).sort((a,b)=>a.date-b.date);

  const handleSave = (data) => {
    setMeetings(prev => {
      const exists = prev.find(m=>m.id===data.id);
      return exists ? prev.map(m=>m.id===data.id?data:m) : [...prev,data];
    });
    setModalNew(false); setModalEdit(null); setNewMeetingDate(null);
    showToast(data.title+" saved ✓");
  };

  const handleDelete = (id) => {
    setMeetings(prev=>prev.filter(m=>m.id!==id));
    setModalDetail(null); showToast("Meeting deleted");
  };

  const handleJoin = (m) => {
    window.open(m.link,"_blank");
    showToast(`Joining ${m.title}...`);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setModalDate(date);
  };

  const liveMeetings = meetings.filter(m=>m.status==="live").length;
  const upcomingCount = meetings.filter(m=>m.status==="upcoming"||m.status==="scheduled").length;

  return (
    <div className="ms-root">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="ms-nav">
        <div className="ms-nav-logo">
          <div className="ms-nav-logo-icon">🎓</div>
          <span className="ms-nav-logo-text">Academy Meetings</span>
        </div>
        <div className="ms-nav-tabs">
          {[["upcoming","Live & Soon"],["scheduled","Scheduled"],["ended","Past"],["all","All"]].map(([v,l])=>(
            <button key={v} className={`ms-nav-tab ${view===v?"active":""}`} onClick={()=>setView(v)}>{l}</button>
          ))}
        </div>
        <div className="ms-nav-right">
          {liveMeetings>0&&<div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:"var(--green)"}}>
            <div className="ms-live-pulse"/>{liveMeetings} live
          </div>}
          <button className="ms-new-btn" onClick={()=>{setNewMeetingDate(null);setModalNew(true);}}>
            <span>+</span> <span>New Meeting</span>
          </button>
        </div>
      </nav>

      {/* BODY */}
      <div className="ms-body">

        {/* Calendar Panel */}
        <div className="ms-cal-panel">
          {/* Stats */}
          <div className="ms-stats-row">
            <div className="ms-stat-card"><div className="ms-stat-num" style={{color:"var(--green)"}}>{liveMeetings}</div><div className="ms-stat-lbl">Live</div></div>
            <div className="ms-stat-card"><div className="ms-stat-num">{upcomingCount}</div><div className="ms-stat-lbl">Upcoming</div></div>
            <div className="ms-stat-card"><div className="ms-stat-num">{meetings.length}</div><div className="ms-stat-lbl">Total</div></div>
          </div>

          {/* Calendar */}
          <div className="ms-panel-card">
            <div className="ms-cal-head">
              <div className="ms-cal-nav">
                <button className="ms-cal-arrow" onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}}>‹</button>
                <span className="ms-cal-month">{MONTHS[calMonth]} {calYear}</span>
                <button className="ms-cal-arrow" onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}}>›</button>
              </div>
              <div className="ms-cal-days-row">
                {DAYS.map(d=><div key={d} className="ms-cal-day-label">{d[0]}</div>)}
              </div>
            </div>
            <div className="ms-cal-grid">
              {cells.map((c,i)=>{
                const dots = getMeetDots(c.date);
                const isToday = sameDay(c.date, TODAY);
                const isSelected = sameDay(c.date, selectedDate);
                return (
                  <div key={i} className={`ms-cal-cell${isToday?" today":""}${isSelected?" selected":""}${!c.current?" other-month":""}`}
                    onClick={()=>handleDateClick(c.date)}>
                    <span className="ms-cal-cell-num">{c.date.getDate()}</span>
                    {dots.length>0&&(
                      <div className="ms-cal-cell-dots">
                        {dots.slice(0,3).map((m,j)=><div key={j} className="ms-cal-dot" style={{background:isSelected?"rgba(255,255,255,.7)":m.color}}/>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Mini agenda for selected date */}
            {getMeetDots(selectedDate).length>0&&(
              <div className="ms-mini-agenda">
                <div className="ms-mini-agenda-title">{sameDay(selectedDate,TODAY)?"Today":"Selected Day"}</div>
                {getMeetDots(selectedDate).map(m=>(
                  <div key={m.id} className="ms-mini-event" onClick={()=>setModalDetail(m)}>
                    <div className="ms-mini-event-bar" style={{background:m.color}}/>
                    <div className="ms-mini-event-info">
                      <div className="ms-mini-event-name">{m.title}</div>
                      <div className="ms-mini-event-time">{fmt(m.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's agenda if no selection dots */}
          {todayMeetings.length>0&&!sameDay(selectedDate,TODAY)&&(
            <div className="ms-panel-card">
              <div className="ms-mini-agenda">
                <div className="ms-mini-agenda-title">Today</div>
                {todayMeetings.map(m=>(
                  <div key={m.id} className="ms-mini-event" onClick={()=>setModalDetail(m)}>
                    <div className="ms-mini-event-bar" style={{background:m.color}}/>
                    <div className="ms-mini-event-info">
                      <div className="ms-mini-event-name">{m.title}</div>
                      <div className="ms-mini-event-time">{fmt(m.date)} · {m.duration}min</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main meetings list */}
        <div className="ms-main">
          <div className="ms-section-head">
            <span className="ms-section-title">
              {view==="upcoming"?"Live & Upcoming":view==="scheduled"?"Scheduled":view==="ended"?"Past Meetings":"All Meetings"}
            </span>
            <span className="ms-section-count">{filteredMeetings.length}</span>
          </div>

          <AnimatePresence>
            {filteredMeetings.length===0?(
              <motion.div className="ms-panel-card" initial={{opacity:0}} animate={{opacity:1}} key="empty">
                <div className="ms-empty">
                  <div className="ms-empty-icon">📭</div>
                  <div className="ms-empty-title">No meetings here</div>
                  <p className="ms-empty-sub">Create a new meeting or schedule one for a future date.</p>
                  <button className="ms-btn ms-btn-primary" style={{margin:"14px auto 0"}} onClick={()=>setModalNew(true)}>+ Create Meeting</button>
                </div>
              </motion.div>
            ):(
              filteredMeetings.map((m,i)=>(
                <motion.div key={m.id} className={`ms-meet-card ${m.status}`}
                  initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:.97}} transition={{delay:i*.05}}
                  onClick={()=>setModalDetail(m)}>
                  <div className="ms-meet-icon" style={{background:m.color+"22",border:`1.5px solid ${m.color}44`}}>
                    {PLATFORMS.find(p=>p.id===m.platform)?.emoji||"🎥"}
                  </div>
                  <div className="ms-meet-body">
                    <div className="ms-meet-title-row">
                      {m.status==="live"&&<div className="ms-live-pulse"/>}
                      <span className="ms-meet-title">{m.title}</span>
                      <StatusBadge status={m.status}/>
                      {m.isPublic&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:"rgba(16,185,129,.1)",color:"var(--green)",textTransform:"uppercase",letterSpacing:".06em"}}>Public</span>}
                      {m.recurring&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:"rgba(91,94,244,.1)",color:"var(--accent)",textTransform:"uppercase",letterSpacing:".06em"}}>↻</span>}
                    </div>
                    {m.topic&&<div style={{fontSize:11.5,color:"var(--accent)",fontWeight:600,marginBottom:4,fontStyle:"italic"}}>"{m.topic}"</div>}
                    <div className="ms-meet-meta">
                      <span className="ms-meet-meta-item">📅 {fmtDate(m.date)}</span>
                      <span className="ms-meet-meta-item">⏰ {fmt(m.date)}</span>
                      <span className="ms-meet-meta-item">⏱ {m.duration}min</span>
                      <span className="ms-meet-meta-item">👥 {m.attendees.length}</span>
                      <span className="ms-meet-meta-item">📢 #{m.channel}</span>
                    </div>
                  </div>
                  <div className="ms-meet-actions" onClick={e=>e.stopPropagation()}>
                    {m.status!=="ended"&&(
                      <button className="ms-btn ms-btn-green ms-btn-sm" onClick={()=>handleJoin(m)}>Join</button>
                    )}
                    <button className="ms-btn ms-btn-ghost ms-btn-sm ms-btn-icon" title="Copy link" onClick={()=>{navigator.clipboard?.writeText(m.link);showToast("Link copied ✓");}}>🔗</button>
                    <button className="ms-btn ms-btn-ghost ms-btn-sm ms-btn-icon" title="Share" onClick={()=>setModalShare(m)}>📤</button>
                    <button className="ms-btn ms-btn-ghost ms-btn-sm ms-btn-icon" title="Edit" onClick={()=>setModalEdit(m)}>✏️</button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {/* Quick create fab at bottom */}
          <div style={{display:"flex",justifyContent:"center",marginTop:8}}>
            <button className="ms-btn ms-btn-outline" onClick={()=>setModalNew(true)} style={{gap:8,padding:"10px 24px"}}>
              + Schedule New Meeting
            </button>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {(modalNew||modalEdit)&&(
          <MeetingFormModal
            key="form"
            initial={modalEdit ? {
              ...modalEdit,
              date: `${modalEdit.date.getFullYear()}-${String(modalEdit.date.getMonth()+1).padStart(2,"0")}-${String(modalEdit.date.getDate()).padStart(2,"0")}`,
              time: `${String(modalEdit.date.getHours()).padStart(2,"0")}:${String(modalEdit.date.getMinutes()).padStart(2,"0")}`,
              duration: String(modalEdit.duration),
            } : null}
            selectedDate={newMeetingDate}
            onClose={()=>{setModalNew(false);setModalEdit(null);setNewMeetingDate(null);}}
            onSave={handleSave}
          />
        )}
        {modalDetail&&(
          <MeetingDetailModal
            key="detail"
            meeting={modalDetail}
            onClose={()=>setModalDetail(null)}
            onEdit={(m)=>{setModalDetail(null);setModalEdit(m);}}
            onDelete={(id)=>{handleDelete(id);setModalDetail(null);}}
            onJoin={handleJoin}
            onShare={(m)=>{setModalDetail(null);setModalShare(m);}}
            toast={showToast}
          />
        )}
        {modalShare&&(
          <ShareModal key="share" meeting={modalShare} onClose={()=>setModalShare(null)} toast={showToast}/>
        )}
        {modalDate&&(
          <DateActionModal
            key="dateaction"
            date={modalDate}
            meetings={meetings}
            onClose={()=>setModalDate(null)}
            onNewMeeting={(date)=>{setModalDate(null);setNewMeetingDate(date);setModalNew(true);}}
            onViewMeeting={(m)=>{setModalDate(null);setModalDetail(m);}}
          />
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast&&<Toast key="toast" msg={toast} onDone={()=>setToastMsg(null)}/>}
      </AnimatePresence>
    </div>
  );
}