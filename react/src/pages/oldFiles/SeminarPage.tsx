import { useState, useEffect, useRef, useCallback } from "react";
import Navigation from "../../components/navigation";
import FormattedAIContent from "../../components/ai/FormattedAIContent";
import { useAuth } from "../../hooks/use-auth";
import { useSessionState } from "../../hooks/useSessionState";
import {
  createSeminarRoom,
  endSeminarWithTranscript,
  endSeminar,
  getActiveSeminarSessions,
  getCandidateContext,
  getSeminarSession,
  getSeminarTopics,
  guideSeminar,
  joinSeminarSession,
  getLibrarySubjects,
  removeSeminarParticipant,
  respondSeminar,
  sendSeminarMessage,
  startSeminar,
  startSeminarRoom,
  synthesizeDebateSpeech,
  transcribeDebateAudio,
  type LibrarySubject,
} from "../../lib/gradeupApi";

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
:root{
  --bg:#f8fafc;--surf:#fff;--surf2:#f8fafc;--surf3:#f1f5f9;
  --bdr:rgba(0,0,0,.06);--bdr2:rgba(0,0,0,.1);
  --ind:#6366f1;--ind2:#818cf8;--ind3:#a5b4fc;
  --vio:#8b5cf6;--pnk:#ec4899;--em:#10b981;--amb:#f59e0b;
  --sky:#38bdf8;--red:#ef4444;
  --t1:#0f172a;--t2:#475569;--t3:#94a3b8;--t4:#e2e8f0;
  --font:'Plus Jakarta Sans',system-ui,sans-serif;
  --sh:0 2px 12px rgba(0,0,0,.05);
  --sh2:0 8px 32px rgba(0,0,0,.12);
  --sh3:0 24px 64px rgba(0,0,0,.18);
  --grad:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  --grad-sem:linear-gradient(135deg,#10b981 0%,#38bdf8 100%);
  --r:20px;
}
.dark{
  --bg:#0b1120;--surf:#1e293b;--surf2:#0f172a;--surf3:#334155;
  --bdr:rgba(255,255,255,.07);--bdr2:rgba(255,255,255,.1);
  --t1:#f1f5f9;--t2:#94a3b8;--t3:#64748b;--t4:#334155;
}
body{font-family:var(--font);background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:rgba(16,185,129,.2);border-radius:4px}
button,input,select,textarea{font-family:var(--font)}
.sp-app{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.page-loader{position:fixed;inset:0;background:#060e1c;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
.page-loader-logo{width:60px;height:60px;background:var(--grad-sem);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;animation:loaderPulse 1.4s ease-in-out infinite;box-shadow:0 0 40px rgba(16,185,129,.35)}
.page-loader-text{font-size:15px;font-weight:700;color:#fff;letter-spacing:.05em}
.page-loader-sub{font-size:11px;color:rgba(255,255,255,.35);letter-spacing:.08em;text-transform:uppercase}
.page-loader-bar{width:180px;height:2px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden}
.page-loader-fill{height:100%;background:var(--grad-sem);border-radius:2px;animation:loaderFill 1.8s ease forwards}
@keyframes loaderPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes loaderFill{0%{width:0%}60%{width:80%}100%{width:100%}}

@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
@keyframes orbFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-16px) scale(1.02)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes modalUp{from{opacity:0;transform:translateY(22px) scale(.96)}to{opacity:1;transform:none}}
@keyframes recBlink{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes tileIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
@keyframes waveBar{0%,100%{height:3px;opacity:.5}50%{height:20px;opacity:1}}
@keyframes rPop{0%{opacity:0;transform:translate(-50%,-70%) scale(.3)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.3)}65%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-120%) scale(.7)}}
@keyframes dotPulse{0%,80%,100%{transform:scale(.5);opacity:.4}40%{transform:scale(1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes tIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes chipIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}

/* Toast */
.sp-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--surf);border:1.5px solid var(--bdr);border-radius:13px;padding:10px 17px;font-size:12.5px;font-weight:700;color:var(--t1);box-shadow:var(--sh2);z-index:9999;display:flex;align-items:center;gap:7px;animation:tIn .32s cubic-bezier(.34,1.2,.64,1);white-space:nowrap;max-width:calc(100vw - 28px)}
.sp-toast.success{border-color:rgba(16,185,129,.4)}.sp-toast.error{border-color:rgba(239,68,68,.4)}.sp-toast.warn{border-color:rgba(245,158,11,.4)}.sp-toast.info{border-color:rgba(99,102,241,.36)}

/* Form */
.fi{margin-bottom:10px}
.fl{display:block;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--t3);margin-bottom:5px}
.finput{width:100%;padding:10px 12px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);color:var(--t1);font-size:13px;outline:none;transition:all .18s}
.finput:focus{border-color:var(--em);background:var(--surf);box-shadow:0 0 0 3px rgba(16,185,129,.1)}
.finput::placeholder{color:var(--t3)}
.finput:disabled{opacity:.45;cursor:not-allowed}
select.finput{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}
.fi-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}

/* Buttons */
.btn-p{padding:11px 20px;border-radius:13px;border:none;cursor:pointer;background:var(--grad-sem);color:#fff;font-size:13px;font-weight:700;transition:all .22s;box-shadow:0 5px 18px rgba(16,185,129,.28);display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font);width:100%}
.btn-p:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 9px 26px rgba(16,185,129,.38)}
.btn-p:disabled{opacity:.38;cursor:not-allowed;transform:none;box-shadow:none}
.btn-s{padding:9px 16px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn-s:hover{border-color:rgba(16,185,129,.32);color:var(--t1);background:rgba(16,185,129,.04)}
.btn-d{padding:9px 16px;border-radius:11px;border:1.5px solid rgba(239,68,68,.25);background:rgba(239,68,68,.06);cursor:pointer;color:var(--red);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn-d:hover{background:rgba(239,68,68,.12)}

/* Link share */
.link-box{border-radius:14px;background:rgba(16,185,129,.04);border:1.5px solid rgba(16,185,129,.16);padding:12px 14px;margin-bottom:10px}
.link-box-title{font-size:10px;font-weight:800;color:var(--em);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
.link-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:10px;background:var(--surf);border:1.5px solid var(--bdr)}
.link-val{flex:1;font-family:monospace;font-size:10.5px;color:var(--em);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.copy-btn{padding:5px 11px;border-radius:7px;border:none;cursor:pointer;background:var(--grad-sem);color:#fff;font-size:11.5px;font-weight:800;transition:.18s;flex-shrink:0}
.copy-btn:hover{transform:scale(1.05)}
.share-actions{display:flex;gap:6px;margin-top:7px}
.share-btn{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:11.5px;font-weight:700;color:var(--t2);transition:.2s;display:flex;align-items:center;justify-content:center;gap:5px}
.share-btn:hover{border-color:rgba(16,185,129,.3);color:var(--em);background:rgba(16,185,129,.04)}

/* Steps */
.steps{display:flex;flex-direction:column;gap:5px;margin-bottom:13px}
.step-row{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);transition:.22s}
.step-row.done{border-color:rgba(16,185,129,.32);background:rgba(16,185,129,.05)}
.step-row.act{border-color:rgba(56,189,248,.32);background:rgba(56,189,248,.05)}
.step-row.pend{opacity:.45}
.step-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;flex-shrink:0}
.step-row.done .step-num{background:var(--em);color:#fff}
.step-row.act  .step-num{background:var(--sky);color:#fff}
.step-row.pend .step-num{background:var(--surf3);color:var(--t3)}
.step-lbl{font-size:12px;font-weight:700}
.step-row.done .step-lbl{color:var(--em)}.step-row.act .step-lbl{color:var(--t1)}.step-row.pend .step-lbl{color:var(--t3)}

/* Role Cards */
.role-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.role-card{padding:12px 10px;border-radius:13px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .22s;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.role-card:hover{border-color:rgba(16,185,129,.32);background:rgba(16,185,129,.03);transform:translateY(-2px)}
.role-card.sel{border-color:var(--em);background:rgba(16,185,129,.06)}
.role-ico{font-size:22px}
.role-title{font-size:11.5px;font-weight:800;color:var(--t1)}
.role-desc{font-size:9.5px;color:var(--t2);line-height:1.4}
.role-card.sel .role-title{color:var(--em)}

/* Seminar Type Cards */
.stype-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px}
.stype-card{padding:12px 13px;border-radius:13px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .22s;display:flex;align-items:flex-start;gap:9px}
.stype-card:hover{border-color:rgba(16,185,129,.32);background:rgba(16,185,129,.03);transform:translateY(-1px)}
.stype-card.sel{border-color:var(--em);background:rgba(16,185,129,.06)}
.stype-ico{font-size:19px;flex-shrink:0}
.stype-title{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:2px}
.stype-desc{font-size:10px;color:var(--t2);line-height:1.45}

/* Mic preview */
.mic-preview{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;background:rgba(16,185,129,.05);border:1.5px solid rgba(16,185,129,.14);margin-bottom:11px}
.mic-av{width:46px;height:46px;border-radius:50%;background:var(--grad-sem);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;color:#fff;box-shadow:0 6px 18px rgba(16,185,129,.32);flex-shrink:0}
.mic-info{flex:1}
.mic-name{font-size:14px;font-weight:800;color:var(--t1);margin-bottom:1px}
.mic-sub{font-size:11px;color:var(--t2)}
.perm-row{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}
.perm-btn{display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:8px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:11.5px;font-weight:700;transition:.18s}
.perm-btn.granted{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.32);color:var(--em)}
.perm-btn.denied{background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.28);color:var(--red)}
.perm-btn.req{background:rgba(56,189,248,.07);border-color:rgba(56,189,248,.28);color:var(--sky)}
.perm-btn:disabled{opacity:.42;cursor:not-allowed}
.perm-warn{font-size:11.5px;color:#fca5a5;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);border-radius:9px;padding:8px 11px;margin-top:7px;line-height:1.6}

/* Section divider */
.sec-div{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--t3);margin-bottom:8px;margin-top:4px;display:flex;align-items:center;gap:7px}
.sec-div::after{content:'';flex:1;height:1px;background:var(--bdr)}

/* Invite rows */
.invite-row{display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:10px;border:1.5px solid var(--bdr);background:var(--surf2);margin-bottom:5px;animation:chipIn .22s ease;transition:.2s}
.invite-row:hover{border-color:rgba(16,185,129,.25)}
.invite-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0}
.invite-info{flex:1;min-width:0}
.invite-name{font-size:12px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invite-type{font-size:10px;color:var(--t3)}
.invite-status{font-size:9px;font-weight:800;padding:2px 7px;border-radius:20px;flex-shrink:0}
.inv-pending{background:rgba(245,158,11,.12);color:var(--amb)}
.inv-sent{background:rgba(56,189,248,.1);color:var(--sky)}
.invite-rm{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--bdr);background:var(--surf3);cursor:pointer;color:var(--t3);display:flex;align-items:center;justify-content:center;font-size:10px;transition:.15s;flex-shrink:0}
.invite-rm:hover{background:rgba(239,68,68,.1);color:var(--red);border-color:rgba(239,68,68,.25)}

/* Cal notice */
.cal-notice{display:flex;align-items:center;gap:9px;padding:10px 13px;border-radius:12px;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2);margin-bottom:11px}

/* Overlay / Modal */
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);backdrop-filter:blur(10px);z-index:700;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease}
.modal{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);width:100%;box-shadow:var(--sh3);overflow:hidden;animation:modalUp .28s cubic-bezier(.34,1.2,.64,1);max-height:calc(100dvh - 30px);display:flex;flex-direction:column}
.modal.dark{background:#0c1220;border-color:rgba(255,255,255,.1)}
.mh{padding:16px 20px 13px;border-bottom:1px solid var(--surf3);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:10px}
.modal.dark .mh{border-color:rgba(255,255,255,.08)}
.mh-title{font-size:15.5px;font-weight:800;color:var(--t1)}
.modal.dark .mh-title{color:#fff}
.mh-close{width:27px;height:27px;border-radius:8px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center;transition:.15s;font-size:12.5px;flex-shrink:0}
.mh-close:hover{color:var(--t1);transform:rotate(90deg)}
.mb{padding:18px 20px;overflow-y:auto;flex:1}
.mf{padding:13px 20px;border-top:1px solid var(--surf3);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0;flex-wrap:wrap}
.modal.dark .mf{border-color:rgba(255,255,255,.08)}
.loader-spin{width:22px;height:22px;border-radius:50%;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .7s linear infinite;flex-shrink:0}
.loader-spin.dark{border-color:rgba(16,185,129,.2);border-top-color:var(--em)}
.lo-progress{width:100%;height:4px;background:rgba(0,0,0,.07);border-radius:4px;overflow:hidden;margin-top:7px}
.lo-progress-fill{height:100%;background:var(--grad-sem);border-radius:4px;transition:width .4s ease}
.results-loader{position:fixed;inset:0;background:rgba(8,16,30,.96);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;animation:fadeIn .2s ease}
.results-loader-icon{font-size:48px;animation:scaleIn .5s cubic-bezier(.34,1.56,.64,1) both}
.results-loader-title{font-size:16px;font-weight:800;color:#e8ecf2}
.results-loader-sub{font-size:11px;color:rgba(255,255,255,.35)}
.results-loader-steps{display:flex;flex-direction:column;gap:8px;margin-top:10px;width:280px}
.results-loader-step{display:flex;align-items:center;gap:9px;padding:7px 11px;border-radius:9px;font-size:11px;font-weight:700;transition:all .3s}
.results-loader-step.done{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);color:#5ee3b7}
.results-loader-step.active{background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);color:#7ed3f7}
.results-loader-step.pending{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.3)}

/* SETUP */
.sp-setup{height:100dvh;display:grid;grid-template-columns:32% 1fr;overflow:hidden}
.sp-setup-left{background:#060c1a;overflow:hidden;position:relative;display:flex;flex-direction:column}
.sp-setup-left-inner{overflow-y:auto;flex:1;padding:clamp(20px,3vw,44px);display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2}
.sp-orbs{position:absolute;inset:0;pointer-events:none}
.sp-orb{position:absolute;border-radius:50%}
.sp-orb1{width:320px;height:320px;background:radial-gradient(circle,rgba(16,185,129,.18) 0%,transparent 70%);top:-80px;left:-60px;animation:orbFloat 9s ease-in-out infinite}
.sp-orb2{width:220px;height:220px;background:radial-gradient(circle,rgba(56,189,248,.13) 0%,transparent 70%);bottom:-40px;right:-30px;animation:orbFloat 11s ease-in-out infinite reverse}
.sp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(16,185,129,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,.06) 1px,transparent 1px);background-size:38px 38px;pointer-events:none}
.sp-logo{display:flex;align-items:center;gap:8px;margin-bottom:20px;animation:fadeUp .5s ease both}
.sp-logo-ico{width:32px;height:32px;background:var(--grad-sem);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 6px 18px rgba(16,185,129,.38)}
.sp-logo-name{font-size:14px;font-weight:800;background:linear-gradient(90deg,#fff,#6ee7b7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sp-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);font-size:10px;font-weight:800;color:#6ee7b7;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;animation:fadeUp .5s ease .1s both;width:fit-content}
.sp-tag-dot{width:5px;height:5px;border-radius:50%;background:var(--sky);animation:pulse 2s infinite}
.sp-h1{font-size:clamp(18px,2.2vw,32px);font-weight:900;line-height:1.06;letter-spacing:-1px;color:#fff;margin-bottom:10px;animation:fadeUp .5s ease .16s both}
.sp-h1 .gt{background:var(--grad-sem);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sp-p{font-size:12px;color:rgba(255,255,255,.42);line-height:1.85;margin-bottom:20px;animation:fadeUp .5s ease .22s both}
.sp-feats-left{display:flex;flex-direction:column;gap:6px;animation:fadeUp .5s ease .28s both}
.sp-feat-left{display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;transition:.3s}
.sp-feat-left:hover{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.28)}
.sp-feat-ico{width:34px;height:34px;border-radius:9px;background:rgba(16,185,129,.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.sp-feat-txt strong{display:block;font-size:12px;font-weight:700;color:#fff;margin-bottom:1px}
.sp-feat-txt span{font-size:10px;color:rgba(255,255,255,.38)}
.ctx-card{margin-top:16px;padding:12px 14px;border-radius:12px;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);animation:fadeUp .5s ease .32s both}
.ctx-card-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--em);margin-bottom:5px}
.ctx-card-val{font-size:13px;font-weight:700;color:#fff;margin-bottom:2px}
.ctx-card-sub{font-size:11px;color:rgba(255,255,255,.4)}
.sp-setup-right{background:var(--surf);overflow:hidden;display:flex;flex-direction:column}
.sp-setup-scroll{overflow-y:auto;flex:1;padding:clamp(20px,3vw,44px)}
.sp-setup-inner{max-width:620px;width:100%;margin:0 auto}
.setup-back{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:11px;border:2px solid rgba(16,185,129,.28);background:rgba(16,185,129,.07);cursor:pointer;font-size:13px;font-weight:800;color:var(--em);transition:all .22s;margin-bottom:20px;font-family:var(--font)}
.setup-back:hover{background:rgba(16,185,129,.14);border-color:rgba(16,185,129,.5);color:var(--t1);transform:translateX(-3px);box-shadow:0 4px 16px rgba(16,185,129,.15)}
.setup-title{font-size:clamp(17px,2vw,24px);font-weight:900;letter-spacing:-.4px;margin-bottom:3px;color:var(--t1)}
.setup-sub{font-size:12px;color:var(--t2);margin-bottom:18px;line-height:1.6}
.sp-left{background:#060e1c;position:relative;overflow:hidden;display:flex;flex-direction:column}
.sp-left-inner{flex:1;overflow-y:auto;padding:clamp(16px,2.5vw,32px) clamp(14px,2vw,28px);position:relative;z-index:2;display:flex;flex-direction:column}
.sp-grid-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(16,185,129,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,.055) 1px,transparent 1px);background-size:42px 42px;pointer-events:none}
.sp-glow1{position:absolute;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(16,185,129,.15) 0%,transparent 70%);top:-120px;left:-120px;pointer-events:none}
.sp-glow2{position:absolute;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(56,189,248,.14) 0%,transparent 72%);bottom:-80px;right:-90px;pointer-events:none}
.sp-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 11px;border-radius:100px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.28);font-size:10px;font-weight:700;color:#5ee3b7;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;animation:fadeUp .45s ease .08s both;width:fit-content}
.sp-badge-dot{width:5px;height:5px;border-radius:50%;background:#5ee3b7;animation:pulse 1.8s infinite}
.sp-desc{font-size:11px;color:rgba(255,255,255,.38);line-height:1.8;margin-bottom:14px;animation:fadeUp .45s ease .2s both}
.sp-features{display:flex;flex-direction:column;gap:5px;animation:fadeUp .45s ease .26s both}
.sp-feat{display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:10px;transition:.25s}
.sp-feat:hover{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.22)}
.sp-feat-ic{width:34px;height:34px;border-radius:10px;background:rgba(16,185,129,.14);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.sp-feat-t{font-size:12px;font-weight:700;color:#fff}
.sp-feat-d{font-size:10px;color:rgba(255,255,255,.42)}
.ctx-chip{margin-top:14px;padding:11px 13px;border-radius:12px;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.18)}
.ctx-chip-lbl{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--em);margin-bottom:4px}
.ctx-chip-val{font-size:12px;font-weight:700;color:#fff}
.ctx-chip-sub{font-size:10.5px;color:rgba(255,255,255,.4);margin-top:2px}
.sp-right{background:var(--surf);overflow:hidden;display:flex;flex-direction:column}
.sp-right-scroll{overflow-y:auto;flex:1;padding:clamp(14px,2vw,28px);-webkit-overflow-scrolling:touch}
.sp-right-inner{max-width:560px;margin:0 auto;width:100%}
.back-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;border:1.5px solid rgba(16,185,129,.25);background:rgba(16,185,129,.06);cursor:pointer;font-size:12.5px;font-weight:700;color:var(--em);transition:all .2s;margin-bottom:14px;font-family:var(--font)}
.back-btn:hover{background:rgba(16,185,129,.12);transform:translateX(-2px)}
.setup-h{font-size:clamp(14px,1.6vw,18px);font-weight:900;letter-spacing:-.3px;color:var(--t1);margin-bottom:3px}
.module-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}
.module-card{padding:13px;border-radius:13px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .2s;display:flex;gap:10px;align-items:flex-start}
.module-card:hover{border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.03);transform:translateY(-2px);box-shadow:0 6px 20px rgba(16,185,129,.1)}
.module-card.sel{border-color:var(--em);background:rgba(16,185,129,.06);box-shadow:0 6px 20px rgba(16,185,129,.12)}
.mod-ic{width:36px;height:36px;border-radius:11px;background:rgba(16,185,129,.12);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;transition:.2s}
.module-card.sel .mod-ic{background:rgba(16,185,129,.2)}
.mod-title{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:3px}
.mod-desc{font-size:10px;color:var(--t2);line-height:1.5}
.module-card.sel .mod-title{color:var(--em)}
.submode-ic{font-size:26px;margin-bottom:2px}
.submode-desc{font-size:10px;color:var(--t2);line-height:1.45}
.timing-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px}
.timing-card{padding:11px 12px;border-radius:11px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .2s;display:flex;align-items:flex-start;gap:9px}
.timing-card:hover{border-color:rgba(16,185,129,.28)}
.timing-card.sel{border-color:var(--em);background:rgba(16,185,129,.05)}
.timing-ic{font-size:16px}
.timing-title{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:1px}
.timing-desc{font-size:10px;color:var(--t2)}
.timing-card.sel .timing-title{color:var(--em)}
.step-r{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;border:1px solid var(--bdr);background:var(--surf2);transition:.18s}
.step-r.done{border-color:rgba(16,185,129,.28);background:rgba(16,185,129,.04)}
.step-r.act{border-color:rgba(56,189,248,.28);background:rgba(56,189,248,.04)}
.step-r.pend{opacity:.42}
.link-lbl{font-size:9.5px;font-weight:800;color:var(--em);text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px}
.obs-join-section{padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(56,189,248,.07),rgba(16,185,129,.05));border:1.5px solid rgba(56,189,248,.2);margin-bottom:14px}
.obs-join-title{font-size:12px;font-weight:800;color:var(--sky);margin-bottom:10px;display:flex;align-items:center;gap:6px}
.obs-join-input-row{display:flex;gap:7px;margin-bottom:10px}
.obs-join-or{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin:10px 0}
.obs-join-or::before,.obs-join-or::after{content:'';flex:1;height:1px;background:var(--bdr)}
.ongoing-empty{padding:11px 12px;border-radius:12px;background:var(--surf);border:1px solid var(--bdr);font-size:11px;color:var(--t2)}
.ongoing-list{display:flex;flex-direction:column;gap:8px}
.ongoing-card{padding:12px 14px;border-radius:12px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .2s;display:flex;gap:11px;align-items:center}
.ongoing-card:hover{border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.04);transform:translateY(-1px)}
.ongoing-card.sel{border-color:var(--em);background:rgba(16,185,129,.06)}
.ongoing-live-dot{width:8px;height:8px;border-radius:50%;animation:pulse 1.2s infinite;flex-shrink:0}
.ongoing-info{flex:1;min-width:0}
.ongoing-topic{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:2px}
.ongoing-meta{font-size:10px;color:var(--t2);line-height:1.45}
.ongoing-count{padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800;white-space:nowrap}

/* ROOM */
.sp-room{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:#060c1a}
.room-bar{height:50px;background:rgba(6,12,26,.97);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 12px;gap:7px;flex-shrink:0;z-index:100;overflow:hidden}
.room-logo{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:#fff;flex-shrink:0;border:none;background:none;cursor:pointer;font-family:var(--font)}
.room-logo-ico{width:25px;height:25px;background:var(--grad-sem);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px}
.rbar-div{width:1px;height:15px;background:rgba(255,255,255,.08);flex-shrink:0}
.rbar-topic{flex:1;font-size:11.5px;color:rgba(255,255,255,.38);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rbar-topic strong{color:#fff}
.rbar-pill{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:10.5px;font-weight:700;flex-shrink:0}
.pill-timer{background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.22);color:#6ee7b7;font-family:monospace}
.pill-rec{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.22);color:var(--red);animation:recBlink 1.5s infinite}
.pill-rec-dot{width:5px;height:5px;border-radius:50%;background:var(--red)}
.pill-med{background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.22);color:var(--sky)}
.rbar-end{padding:4px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);cursor:pointer;font-size:11px;font-weight:700;transition:.15s;flex-shrink:0;font-family:var(--font)}
.rbar-end:hover{background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.35);color:var(--red)}
.room-body{flex:1;display:flex;min-height:0;overflow:hidden}
.grid-area{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.vid-grid{flex:1;display:grid;gap:4px;padding:7px;min-height:0;overflow:hidden}
.vg-1{grid-template-columns:1fr}.vg-2{grid-template-columns:1fr 1fr}.vg-3{grid-template-columns:1fr 1fr 1fr}.vg-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}.vg-5,.vg-6{grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr}
.tile{border-radius:12px;background:#0d1428;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;transition:box-shadow .28s;min-height:0;animation:tileIn .32s ease}
.tile.spk{box-shadow:0 0 0 2.5px var(--em),0 0 24px rgba(16,185,129,.2)}
.tile video{width:100%;height:100%;object-fit:cover;display:block}
.tile-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;width:clamp(44px,6vw,78px);height:clamp(44px,6vw,78px);font-size:clamp(17px,2.4vw,30px)}
.tile-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.83));padding:20px 9px 8px;display:flex;align-items:flex-end;justify-content:space-between;gap:4px}
.tile-name{font-size:clamp(9.5px,1.1vw,12px);font-weight:700;color:#fff;display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.t-badge{font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px;color:#fff;white-space:nowrap}
.t-host{background:var(--amb);color:#000}.t-ai{background:var(--grad-sem)}.t-you{background:rgba(255,255,255,.17)}.t-med{background:rgba(56,189,248,.82);color:#000}.t-fac{background:rgba(99,102,241,.9)}.t-obs{background:rgba(148,163,184,.7);color:#000}
.tile-muted{width:20px;height:20px;border-radius:50%;background:rgba(239,68,68,.85);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9.5px}
.tile-react{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:42px;animation:rPop 2.2s forwards;pointer-events:none;z-index:5}
.tile-wave{position:absolute;top:9px;right:9px;display:flex;align-items:center;gap:2px;height:22px}
.tile-wave-bar{width:2.5px;border-radius:2px;animation:waveBar .65s ease-in-out infinite}
.ai-typing-wrap{position:absolute;top:9px;right:9px;display:flex;gap:3px;align-items:center}
.ai-dot{width:5px;height:5px;border-radius:50%;background:var(--sky);animation:dotPulse .9s ease-in-out infinite}
.observer-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;pointer-events:none}
.observer-badge{background:rgba(148,163,184,.15);border:1px solid rgba(148,163,184,.25);border-radius:8px;padding:4px 10px;font-size:10px;font-weight:700;color:rgba(255,255,255,.5)}

/* Controls */
.ctrl-bar{min-height:62px;padding:7px 11px;background:rgba(6,12,26,.98);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:5px;flex-wrap:wrap}
.cg{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.cbtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 7px;border-radius:9px;border:1px solid rgba(255,255,255,.09);cursor:pointer;background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);font-size:9px;font-weight:700;transition:all .18s;min-width:42px;font-family:var(--font)}
.cbtn-ico{font-size:14px;transition:transform .2s}
.cbtn:hover{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2);transform:translateY(-2px)}
.cbtn.on{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.36);color:var(--em)}
.cbtn.off{background:rgba(239,68,68,.09);border-color:rgba(239,68,68,.3);color:var(--red)}
.cbtn.hi{background:rgba(56,189,248,.12);border-color:rgba(56,189,248,.36);color:var(--sky)}
.cbtn.amb{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:var(--amb)}
.cbtn.em{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.28);color:var(--em)}
.cbtn.rec{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.46);color:var(--red);animation:recBlink 1.5s infinite}
.cbtn:disabled{opacity:.28;cursor:not-allowed;transform:none}
.end-btn{padding:8px 16px;border-radius:9px;border:none;cursor:pointer;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:12px;font-weight:800;font-family:var(--font);box-shadow:0 3px 12px rgba(239,68,68,.28);transition:.2s;white-space:nowrap}
.end-btn:hover{transform:translateY(-2px);box-shadow:0 7px 20px rgba(239,68,68,.42)}
.react-pop{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#141e36;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 10px;display:flex;gap:6px;box-shadow:var(--sh2);z-index:200;animation:scaleIn .2s ease}
.react-emoji{font-size:20px;cursor:pointer;padding:4px;border-radius:7px;border:none;background:none;transition:.15s}
.react-emoji:hover{transform:scale(1.45)}
.rec-overlay{position:fixed;top:63px;right:12px;background:rgba(239,68,68,.92);border-radius:8px;padding:4px 11px;font-size:11px;font-weight:800;color:#fff;z-index:200;animation:recBlink 1.5s infinite}

/* Side panel */
.side-panel{width:280px;min-width:280px;background:rgba(6,12,26,.98);border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden}
.panel-tabs-dark{display:flex;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.ptab{flex:1;padding:10px 4px;background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,.3);font-size:9px;font-weight:700;cursor:pointer;transition:.18s;display:flex;flex-direction:column;align-items:center;gap:3px;font-family:var(--font)}
.ptab:hover{color:rgba(255,255,255,.65)}
.ptab.active{color:#6ee7b7;border-bottom-color:var(--em)}
.ptab-cls{flex:0;padding:10px 8px;color:rgba(255,255,255,.22)}
.pscroll{flex:1;overflow-y:auto;min-height:0}
.p-list{padding:8px;display:flex;flex-direction:column;gap:5px}
.p-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:.18s}
.p-row:hover{border-color:rgba(16,185,129,.28);background:rgba(16,185,129,.07)}
.p-row.spk{border-color:rgba(16,185,129,.4);background:rgba(16,185,129,.06)}
.p-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:800;flex-shrink:0}
.p-info{flex:1;min-width:0}
.p-name{font-size:12px;font-weight:700;color:#fff}
.p-role{font-size:10px;color:rgba(255,255,255,.28)}
.chat-msgs{padding:9px;display:flex;flex-direction:column;gap:7px}
.chat-msg{display:flex;gap:6px;animation:fadeUp .2s ease}
.chat-msg.own{flex-direction:row-reverse}
.chat-av-sm{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0;align-self:flex-end}
.chat-bwrap{display:flex;flex-direction:column;gap:2px;max-width:84%}
.chat-msg.own .chat-bwrap{align-items:flex-end}
.chat-sender{font-size:9.5px;font-weight:700;color:rgba(255,255,255,.28)}
.chat-bubble{padding:7px 10px;border-radius:10px;font-size:12px;line-height:1.55;word-break:break-word}
.bubble-o{background:rgba(255,255,255,.07);color:#fff;border-radius:3px 10px 10px 10px;border:1px solid rgba(255,255,255,.08)}
.bubble-own{background:var(--grad-sem);color:#fff;border-radius:10px 3px 10px 10px}
.chat-time{font-size:9px;color:rgba(255,255,255,.2)}
.chat-empty{text-align:center;color:rgba(255,255,255,.2);font-size:12px;padding:22px 10px;line-height:1.7}
.chat-ia{padding:8px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;display:flex;gap:6px;align-items:flex-end}
.chat-inp{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:12px;outline:none;resize:none;min-height:34px;max-height:78px;transition:border .15s;font-family:var(--font)}
.chat-inp:focus{border-color:var(--em)}
.chat-inp::placeholder{color:rgba(255,255,255,.2)}
.chat-inp:disabled{opacity:.4;cursor:not-allowed}
.chat-send{width:32px;height:32px;border-radius:8px;background:var(--grad-sem);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.18s;font-size:13px}
.chat-send:hover{transform:scale(1.12)}
.chat-send:disabled{opacity:.4;cursor:not-allowed}

/* Seminar panel */
.sem-wrap{padding:9px;display:flex;flex-direction:column;gap:7px}
.sem-phase-card{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.22);border-radius:12px;padding:12px}
.sem-phase-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.35);margin-bottom:6px}
.sem-phase-name{font-size:13px;font-weight:700;color:#6ee7b7;display:flex;align-items:center;gap:6px}
.sem-phase-dot{width:6px;height:6px;border-radius:50%;background:var(--em);animation:pulse 1.5s infinite}
.sem-ph-list{display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:8px}
.sem-ph-step{display:flex;align-items:center;gap:7px;padding:6px 7px;border-radius:8px;transition:.18s;cursor:pointer}
.sem-ph-step:hover{background:rgba(255,255,255,.05)}
.sem-ph-step.act{background:rgba(16,185,129,.1)}
.sem-ph-num{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
.ph-done{background:var(--em);color:#fff}.ph-act{background:var(--sky);color:#fff}.ph-pend{background:rgba(255,255,255,.08);color:rgba(255,255,255,.25)}
.sem-ph-lbl{font-weight:700;color:rgba(255,255,255,.4);font-size:11px}
.sem-ph-step.act .sem-ph-lbl{color:#fff}
.score-card{background:linear-gradient(135deg,rgba(16,185,129,.15),rgba(56,189,248,.1));border:1px solid rgba(16,185,129,.26);border-radius:12px;padding:12px}
.sc-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.35);margin-bottom:8px}
.sem-score-row{display:flex;align-items:center;gap:7px;margin-bottom:5px}
.sem-score-name{font-size:11px;font-weight:700;color:rgba(255,255,255,.5);min-width:55px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sem-score-bar-wrap{flex:1;height:4px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden}
.sem-score-bar{height:100%;border-radius:3px;transition:width .9s ease}
.sem-score-val{font-size:11px;font-weight:800;color:rgba(255,255,255,.55);min-width:24px;text-align:right}
.tip-card{background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.17);border-radius:11px;padding:10px 12px}
.tip-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.3);margin-bottom:4px}
.tip-text{font-size:11px;color:rgba(255,255,255,.4);line-height:1.65}

/* Analysis */
.analysis-bg{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(14px);z-index:800;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .22s ease}
.analysis-box{background:#0c1220;border:1px solid rgba(16,185,129,.22);border-radius:var(--r);width:100%;max-width:650px;max-height:88dvh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh3);animation:modalUp .3s ease}
.analysis-head{padding:16px 20px 13px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;display:flex;align-items:center;justify-content:space-between}
.analysis-title{font-size:15.5px;font-weight:800;color:#fff}
.analysis-body{overflow-y:auto;flex:1;padding:18px 20px}
.a-sec{margin-bottom:16px;animation:fadeUp .4s ease both}
.a-sec-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.32);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,.07)}
.prog-wrap{margin-bottom:5px}
.prog-label{display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.45);font-weight:600;margin-bottom:3px}
.prog-track{height:5px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
.prog-fill{height:100%;border-radius:4px;transition:width 1.1s ease}
.analysis-foot{padding:12px 20px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;display:flex;justify-content:flex-end;gap:8px}

/* Results */
.results-page{height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:clamp(20px,4vw,52px);text-align:center;overflow-y:auto;background:radial-gradient(ellipse at 50% 25%,rgba(16,185,129,.07) 0%,transparent 65%)}
.res-trophy{font-size:62px;margin-bottom:12px;animation:scaleIn .6s cubic-bezier(.34,1.56,.64,1) .2s both}
.res-title{font-size:clamp(20px,3.2vw,34px);font-weight:900;letter-spacing:-.6px;margin-bottom:6px;color:var(--t1)}
.res-sub{font-size:13px;color:var(--t2);max-width:340px;line-height:1.75;margin-bottom:18px}
.res-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;max-width:340px;margin-bottom:16px}
.res-stat{background:var(--surf);border:1px solid var(--bdr);border-radius:14px;padding:12px 10px;box-shadow:var(--sh);animation:fadeUp .4s ease both;text-align:center;transition:all .25s}
.res-stat:hover{transform:translateY(-4px);box-shadow:0 10px 28px rgba(16,185,129,.12)}
.res-stat-ico{font-size:19px;margin-bottom:4px}
.res-stat-val{font-size:clamp(16px,2.2vw,24px);font-weight:900;color:var(--em)}
.res-stat-lbl{font-size:10px;color:var(--t3);margin-top:2px}
.res-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:center}

@media(max-width:1100px){.sp-setup{grid-template-columns:35% 1fr}}
@media(max-width:900px){
  .sp-setup{grid-template-columns:1fr;overflow-y:auto;height:auto;min-height:100dvh}
  .sp-setup-left{min-height:180px;max-height:240px}
  .sp-setup-left-inner{justify-content:flex-start;padding:20px}
  .sp-feats-left{display:none}.ctx-card{display:none}
  .sp-h1{font-size:20px;margin-bottom:6px}.sp-p{margin-bottom:8px}
}
@media(max-width:768px){
  .ctrl-bar{padding:6px 8px}.cg{gap:2px;justify-content:center}
  .cbtn{padding:5px 6px;min-width:38px;font-size:8.5px}
  .side-panel{display:none}.rbar-topic{display:none}
  .fi-row{grid-template-columns:1fr}
  .role-grid{grid-template-columns:1fr 1fr 1fr}
  .stype-grid{grid-template-columns:1fr 1fr}
  .analysis-bg{align-items:flex-end;padding:0}.analysis-box{border-radius:16px 16px 0 0;max-height:92dvh}
  .overlay{align-items:flex-end;padding:0}.modal{border-radius:16px 16px 0 0;max-height:90dvh}
  .vg-3,.vg-4,.vg-5,.vg-6{grid-template-columns:1fr 1fr}
}
@media(max-width:560px){
  .cbtn span:last-child{display:none}.cbtn{min-width:32px}
  .res-actions{flex-direction:column;align-items:stretch}
  .role-grid{grid-template-columns:1fr 1fr 1fr}
  .res-stats{grid-template-columns:repeat(3,1fr)}
}
`;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const COLORS = ["#10b981","#6366f1","#f59e0b","#38bdf8","#ec4899","#8b5cf6","#f97316","#06b6d4"];
const PHASES = ["Introduction","Open Discussion","Cross-Examination","Closing Statements"];
const REACTIONS = ["👍","👏","❤️","🔥","🤔","🎓","✨","💡"];

const SUBJECT_UNITS: Record<string, string[]> = {
  "Computer Science": ["Data Structures","Algorithms","Operating Systems","Networks","Databases","AI & ML","Web Development","Cybersecurity","Other"],
  "Mathematics": ["Calculus","Linear Algebra","Statistics","Number Theory","Discrete Math","Probability","Geometry","Other"],
  "Biology": ["Cell Biology","Genetics","Ecology","Evolution","Physiology","Microbiology","Biochemistry","Other"],
  "Physics": ["Mechanics","Thermodynamics","Electromagnetism","Quantum Physics","Optics","Relativity","Other"],
  "Chemistry": ["Organic Chemistry","Inorganic Chemistry","Physical Chemistry","Analytical Chemistry","Biochemistry","Other"],
  "History": ["Ancient History","Medieval History","Modern History","World Wars","Cold War","Economic History","Other"],
  "Literature": ["Poetry","Fiction","Drama","Non-Fiction","Literary Theory","Comparative Lit","Other"],
  "Economics": ["Microeconomics","Macroeconomics","Development Economics","International Trade","Behavioral Econ","Other"],
  "Philosophy": ["Ethics","Logic","Metaphysics","Epistemology","Political Philosophy","Philosophy of Mind","Other"],
  "Psychology": ["Cognitive Psychology","Social Psychology","Developmental Psych","Clinical Psychology","Neuroscience","Other"],
  "Law": ["Constitutional Law","Criminal Law","Contract Law","International Law","Tort Law","Other"],
  "Business": ["Marketing","Finance","Strategy","Operations","Entrepreneurship","HR Management","Other"],
  "Medicine": ["Anatomy","Pharmacology","Pathology","Clinical Skills","Public Health","Other"],
  "Engineering": ["Mechanical Eng","Electrical Eng","Civil Eng","Chemical Eng","Aerospace Eng","Other"],
  "Arts": ["Fine Arts","Design","Music Theory","Film Studies","Architecture","Other"],
};
const SUBJECTS = Object.keys(SUBJECT_UNITS);

const ROLES = [
  { id:"Facilitator", ico:"🎙️", title:"Instructor", desc:"Lead & guide discussion" },
  { id:"Participant", ico:"🙋", title:"Participant", desc:"Active discussion member" },
  { id:"Observer",   ico:"👁️", title:"Observer",   desc:"Watch & take notes" },
];

const AI_LINES = [
  "Excellent contribution. Let's explore the counterargument to deepen our understanding.",
  "Building on that point — has anyone considered the long-term implications?",
  "Fascinating perspective. Can someone offer a different angle on this topic?",
  "That touches on a key tension. Let's unpack it together as a group.",
  "I'd like to challenge that assumption — what evidence supports your position?",
  "Would anyone like to build on or challenge this argument further?",
  "I notice we haven't addressed the ethical dimension yet — any thoughts?",
  "That's the crux of the issue. What does the evidence actually tell us?",
];
void AI_LINES;

const TIPS = [
  "Use the Socratic method — ask probing questions that guide discovery.",
  "Ensure balanced participation — invite quieter voices to share.",
  "Look for common ground between opposing viewpoints to synthesize insights.",
  "Use PEEL: Point → Evidence → Explanation → Link back to theme.",
];

const avColor = (n: string) => COLORS[(n || "U").charCodeAt(0) % COLORS.length];
const avInit  = (n: string) => (n || "U").split(/[_\s]/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
const genId = () => Math.random().toString(36).slice(2, 12);
const genRoomLink = (id: string) => `${window.location.origin}/seminarPage?room=${encodeURIComponent(id)}`;
const parseSeminarSessionId = (value: string) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.searchParams.get("room") || url.pathname.split("/").filter(Boolean).pop() || raw;
  } catch {
    const roomMatch = raw.match(/[?&]room=([^&]+)/i);
    if (roomMatch?.[1]) return decodeURIComponent(roomMatch[1]);
    return raw;
  }
};

// ─── HOOKS ───────────────────────────────────────────────────────────────────
function useTimer(running: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setS(x => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function useMicPerm() {
  const [state, setState] = useState<"idle"|"requesting"|"granted"|"denied">("idle");
  const [stream, setStream] = useState<MediaStream|null>(null);
  async function request() {
    setState("requesting");
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); setStream(s); setState("granted"); return s; }
    catch { setState("denied"); return null; }
  }
  function stop() { stream?.getTracks().forEach(t => t.stop()); setStream(null); setState("idle"); }
  return { state, stream, request, stop };
}

function useAIVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice|null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const pick = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      voiceRef.current = v.find(x => x.name.includes("Google UK English")) || v.find(x => x.lang.startsWith("en") && !x.localService) || v[0] || null;
    };
    pick(); window.speechSynthesis?.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", pick);
  }, []);
  const speak = useCallback((text: string, onDone?: () => void) => {
    synthesizeDebateSpeech({ text, voice: "alloy" })
      .then((audio) => {
        if (!audio?.dataUrl) {
          throw new Error("Missing audio data");
        }
        window.speechSynthesis?.cancel();
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const player = new Audio(audio.dataUrl);
        audioRef.current = player;
        player.onplay = () => setIsSpeaking(true);
        player.onended = () => { setIsSpeaking(false); onDone?.(); };
        player.onerror = () => { setIsSpeaking(false); onDone?.(); };
        player.play().catch(() => {
          setIsSpeaking(false);
          onDone?.();
        });
      })
      .catch(() => {
        if (!("speechSynthesis" in window)) { onDone?.(); return; }
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.92; u.pitch = 1.05; u.volume = 1;
        if (voiceRef.current) u.voice = voiceRef.current;
        u.onstart = () => setIsSpeaking(true);
        u.onend = () => { setIsSpeaking(false); onDone?.(); };
        u.onerror = () => { setIsSpeaking(false); onDone?.(); };
        setTimeout(() => window.speechSynthesis.speak(u), 80);
      });
  }, []);
  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);
  return { isSpeaking, speak, cancel };
}

function useToast() {
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const show = (msg: string, type = "success") => setToast({ msg, type });
  const node = toast ? (
    <div className={`sp-toast ${toast.type}`} onClick={() => setToast(null)}>
      {toast.type==="success"?"✅":toast.type==="error"?"❌":toast.type==="warn"?"⚠️":"ℹ️"} {toast.msg}
    </div>
  ) : null;
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return { show, node };
}

// ─── TYPES ───────────────────────────────────────────────────────────────────
function PageLoader({ label = "Launching...", sublabel = "Setting up your session" }: { label?: string; sublabel?: string }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 18 + 8;
      if (p >= 100) {
        p = 100;
        clearInterval(id);
      }
      setProgress(Math.min(p, 100));
    }, 180);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="page-loader">
      <div className="page-loader-logo">🎓</div>
      <div className="page-loader-text">{label}</div>
      <div className="page-loader-sub">{sublabel}</div>
      <div className="page-loader-bar">
        <div className="page-loader-fill" style={{ width: `${progress}%`, transition: "width .25s ease" }} />
      </div>
    </div>
  );
}

function ResultsLoader({ onDone, isObserver }: { onDone: () => void; isObserver?: boolean }) {
  const steps = isObserver
    ? [
        { label: "Saving session notes", icon: "📝" },
        { label: "Updating your progress", icon: "📈" },
        { label: "Preparing summary", icon: "🎓" },
      ]
    : [
        { label: "Analysing your delivery", icon: "🎙️" },
        { label: "Scoring clarity & depth", icon: "📊" },
        { label: "Generating AI feedback", icon: "🤖" },
        { label: "Preparing full report", icon: "🏁" },
      ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const delays = isObserver ? [600, 1100, 1700] : [500, 1100, 1700, 2300];
    const timers: ReturnType<typeof setTimeout>[] = [];
    delays.forEach((delay, index) => {
      timers.push(setTimeout(() => setStep(index + 1), delay));
    });
    timers.push(setTimeout(() => onDone(), isObserver ? 2200 : 2900));
    return () => timers.forEach(clearTimeout);
  }, [isObserver, onDone]);

  return (
    <div className="results-loader">
      <div className="results-loader-icon">{isObserver ? "👁️" : "📊"}</div>
      <div className="results-loader-title">{isObserver ? "Wrapping up..." : "Generating your report..."}</div>
      <div className="results-loader-sub">{isObserver ? "Thank you for observing" : "AI is reviewing your performance"}</div>
      <div className="results-loader-steps">
        {steps.map((entry, index) => (
          <div
            key={entry.label}
            className={`results-loader-step ${index < step ? "done" : index === step ? "active" : "pending"}`}
          >
            <span style={{ fontSize: 14 }}>{entry.icon}</span>
            <span>{index < step ? "✓ " : ""}{entry.label}</span>
            {index === step && <span className="loader-spin" style={{ marginLeft: "auto" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Participant {
  id: number; name: string; stream: MediaStream|null;
  isLocal?: boolean; isHost?: boolean; isAI?: boolean; isMed?: boolean;
  role?: string; micMuted: boolean; camOn: boolean; isSpeaking: boolean;
  handRaised: boolean; isAITyping?: boolean; avatarColor: string; score?: number;
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
function MicPreview({ perm, name, onReq, micOn, onToggle }: any) {
  return (
    <div className="mic-preview">
      <div className="mic-av">{name ? name[0].toUpperCase() : "?"}</div>
      <div className="mic-info">
        <div className="mic-name">{name || "Your Name"}</div>
        <div className="mic-sub">🎙 Audio-only · Seminar Mode</div>
        <div className="perm-row">
          {perm === "idle" && <button className="perm-btn req" onClick={onReq}>🎤 Allow Mic</button>}
          {perm === "requesting" && <button className="perm-btn req" disabled><span className="loader-spin dark" style={{width:14,height:14,borderWidth:2}} />Requesting…</button>}
          {perm === "denied" && <button className="perm-btn denied" onClick={onReq}>🔄 Retry</button>}
          {perm === "granted" && (
            <>
              <button className={`perm-btn ${micOn?"granted":"denied"}`} onClick={onToggle}>{micOn?"🎤 Mic On":"🔇 Off"}</button>
              <span style={{padding:"5px 10px",borderRadius:7,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",fontSize:11,fontWeight:700,color:"var(--em)"}}>✓ Ready</span>
            </>
          )}
        </div>
        {perm === "denied" && <div className="perm-warn">⚠️ Allow mic in browser settings and retry.</div>}
      </div>
    </div>
  );
}

function StepsComp({ steps }: { steps: {label:string;done:boolean}[] }) {
  const st = (i: number) => steps[i].done ? "done" : steps.slice(0,i).every(s=>s.done) ? "act" : "pend";
  return (
    <div className="steps">
      {steps.map((s,i) => (
        <div key={i} className={`step-row ${st(i)}`}>
          <div className="step-num">{s.done?"✓":i+1}</div>
          <div className="step-lbl">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function WaveBars({ color="#10b981" }: { color?: string }) {
  return (
    <div className="tile-wave">
      {[0,1,2,3,4].map(i => (
        <div key={i} className="tile-wave-bar" style={{background:color, animationDelay:`${i*0.11}s`}} />
      ))}
    </div>
  );
}

function Tile({ p, reaction }: { p: Participant; reaction?: any }) {
  const vRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (vRef.current && p.stream) vRef.current.srcObject = p.stream; }, [p.stream]);
  const color = p.avatarColor;
  return (
    <div className={`tile${p.isSpeaking?" spk":""}`}>
      {p.stream && p.camOn ? <video ref={vRef} autoPlay playsInline muted={p.isLocal} /> : (
        <div className="tile-av" style={{background:color+"28",color}}>{p.isAI?"🤖":p.isMed?"🎙️":avInit(p.name)}</div>
      )}
      {p.isSpeaking && <WaveBars color={p.isMed?"#22d3a0":"#10b981"} />}
      {p.isAITyping && <div className="ai-typing-wrap">{[0,1,2].map(i=><div key={i} className="ai-dot" style={{animationDelay:`${i*0.22}s`}}/>)}</div>}
      {p.handRaised && <div style={{position:"absolute",top:8,left:8,background:"rgba(245,166,35,.92)",borderRadius:7,padding:"3px 8px",fontSize:11,fontWeight:800,color:"#000"}}>✋</div>}
      {reaction && <div key={reaction.key} className="tile-react">{reaction.emoji}</div>}
      {p.role==="Observer" && !p.isAI && !p.isMed && (
        <div className="observer-overlay">
          <div className="observer-badge">👁️ Observer</div>
        </div>
      )}
      <div className="tile-ov">
        <div className="tile-name">
          {p.name}
          {p.isHost && p.role==="Facilitator" && <span className="t-badge t-fac">FAC</span>}
          {p.isHost && p.role!=="Facilitator" && <span className="t-badge t-host">HOST</span>}
          {p.isMed && <span className="t-badge t-med">MED</span>}
          {p.isAI && !p.isMed && <span className="t-badge t-ai">AI</span>}
          {p.isLocal && !p.isHost && p.role==="Observer" && <span className="t-badge t-obs">OBS</span>}
          {p.isLocal && !p.isHost && p.role!=="Observer" && <span className="t-badge t-you">You</span>}
        </div>
        {p.micMuted && <div className="tile-muted">🔇</div>}
      </div>
    </div>
  );
}

// ─── SCHEDULE MODAL ──────────────────────────────────────────────────────────
function ScheduleSeminarModal({ config, onSchedule, onClose }: any) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    try {
      const ev = { id:`sem-${Date.now()}`, title:config?.topic||"Seminar", type:"seminar", date, startTime:time, subject:config?.subject||"", unit:config?.unit||"" };
      const ex = JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");
      localStorage.setItem("gradeup_cal_events_v3", JSON.stringify([...ex, ev]));
      window.dispatchEvent(new StorageEvent("storage", { key:"gradeup_cal_events_v3" }));
    } catch {}
    setSaving(false);
    onSchedule({ date, time });
  }

  return (
    <div className="overlay">
      <div className="modal" style={{maxWidth:400}}>
        <div className="mh">
          <span className="mh-title">📅 Schedule Seminar</span>
          <button className="mh-close" onClick={onClose}>✕</button>
        </div>
        <div className="mb">
          <div style={{padding:"10px 12px",borderRadius:11,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.18)",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>📅</span>
            <div>
              <div style={{fontSize:11.5,fontWeight:800,color:"var(--em)"}}>Auto-synced to Calendar</div>
              <div style={{fontSize:10.5,color:"var(--t2)"}}>Event saved automatically after scheduling</div>
            </div>
          </div>
          {config?.topic && (
            <div style={{padding:"9px 12px",borderRadius:10,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.18)",marginBottom:14,fontSize:12.5,fontWeight:700,color:"var(--t1)"}}>
              🎓 "{config.topic}"
            </div>
          )}
          {config?.subject && (
            <div style={{padding:"7px 11px",borderRadius:9,background:"rgba(56,189,248,.06)",border:"1px solid rgba(56,189,248,.15)",marginBottom:12,fontSize:12,fontWeight:600,color:"var(--sky)"}}>
              📚 {config.subject}{config.unit?` · ${config.unit}`:""}
            </div>
          )}
          <div className="fi-row fi">
            <div><label className="fl">Date *</label><input className="finput" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
            <div><label className="fl">Time</label><input className="finput" type="time" value={time} onChange={e=>setTime(e.target.value)}/></div>
          </div>
        </div>
        <div className="mf">
          <button className="btn-s" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-p" style={{width:"auto",padding:"9px 22px"}} onClick={handleSave} disabled={!date||saving}>
            {saving ? <><span className="loader-spin"/>Scheduling…</> : "📅 Schedule & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ANALYSIS MODAL ──────────────────────────────────────────────────────────
function AnalysisModal({ topic, subject, unit, participants, scores, timer, exchanges, onClose }: any) {
  const humanPs = (participants||[]).filter((p: any) => !p.isAI && !p.isMed);
  function download() {
    const t = `SeminarArena Report\nTopic: ${topic}\nSubject: ${subject||"—"}\nUnit: ${unit||"—"}\nDuration: ${timer}\nParticipants: ${humanPs.length}\nExchanges: ${exchanges||0}\n\n${humanPs.map((p: any)=>`${p.name} (${p.role||"Participant"}): ${scores?.[p.id]||70} pts`).join("\n")}`;
    const b=new Blob([t],{type:"text/plain"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="seminar-report.txt";a.click();URL.revokeObjectURL(u);
  }
  return (
    <div className="analysis-bg" onClick={onClose}>
      <div className="analysis-box" onClick={e=>e.stopPropagation()}>
        <div className="analysis-head">
          <div className="analysis-title">📋 Seminar Analysis</div>
          <button style={{width:26,height:26,borderRadius:7,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",cursor:"pointer",color:"rgba(255,255,255,.55)",fontSize:12}} onClick={onClose}>✕</button>
        </div>
        <div className="analysis-body">
          <div className="a-sec">
            <div className="a-sec-title">📌 Session Details</div>
            <div style={{padding:"9px 12px",borderRadius:10,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.18)",fontSize:13,fontWeight:700,color:"#fff",marginBottom:7}}>"{topic}"</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap" as const}}>
              {[`📚 ${subject||"—"}`,`📖 ${unit||"—"}`,`⏱ ${timer}`,`👥 ${humanPs.length} participants`,`💬 ${exchanges||0} exchanges`].map((t: string)=>(
                <span key={t} style={{padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.55)"}}>{t}</span>
              ))}
            </div>
          </div>
          {humanPs.length > 0 && (
            <div className="a-sec">
              <div className="a-sec-title">👥 Individual Performance</div>
              {humanPs.map((p: any) => {
                const sc = scores?.[p.id] || 70;
                const eng = 55+Math.floor(Math.random()*36);
                const cla = 60+Math.floor(Math.random()*30);
                const dep = 50+Math.floor(Math.random()*40);
                return (
                  <div key={p.id} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px",marginBottom:7}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:"#fff",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:p.avatarColor+"28",color:p.avatarColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800}}>{p.name[0]}</div>
                      {p.name}{p.isLocal?" (You)":""}
                      <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"rgba(56,189,248,.12)",color:"var(--sky)",marginLeft:2}}>{p.role||"Participant"}</span>
                      <span style={{marginLeft:"auto",fontSize:18,fontWeight:800,color:"var(--sky)"}}>{sc}</span>
                    </div>
                    {[["Engagement",eng,"#10b981"],["Clarity",cla,"#38bdf8"],["Depth",dep,"#f59e0b"]].map(([l,v,c])=>(
                      <div key={l as string} className="prog-wrap">
                        <div className="prog-label"><span>{l}</span><span>{v}%</span></div>
                        <div className="prog-track"><div className="prog-fill" style={{width:`${v}%`,background:c as string}}/></div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          <div className="a-sec">
            <div className="a-sec-title">🏅 Verdict</div>
            <div style={{padding:"13px 15px",borderRadius:12,border:"1.5px solid rgba(16,185,129,.4)",background:"rgba(16,185,129,.07)",textAlign:"center"}}>
              <div style={{fontSize:21,fontWeight:900,color:"var(--em)",marginBottom:3}}>🏅 Excellent Discussion</div>
              <div style={{fontSize:11.5,fontWeight:700,color:"rgba(255,255,255,.5)"}}>Rich multi-perspective insights across all four phases.</div>
            </div>
          </div>
        </div>
        <div className="analysis-foot">
          <button className="btn-s" style={{background:"rgba(255,255,255,.05)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.55)"}} onClick={onClose}>Close</button>
          <button className="btn-p" style={{width:"auto",padding:"9px 18px",fontSize:12.5}} onClick={download}>📥 Download Report</button>
        </div>
      </div>
    </div>
  );
}

// ─── SETUP ───────────────────────────────────────────────────────────────────
function SeminarSetup({ onBack, onLaunch }: { onBack?: () => void; onLaunch: (cfg: any) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}` : "");
  const [role, setRole] = useState("Facilitator");
  const [subjectCatalog, setSubjectCatalog] = useState<LibrarySubject[]>([]);
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [seminarTopicCatalog, setSeminarTopicCatalog] = useState<any[]>([]);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [custom, setCustom] = useState("");
  const [seminarType, setSeminarType] = useState<"instant"|"schedule"|"">(""); // instant or schedule
  const [inviteInput, setInviteInput] = useState("");
  const [invitees, setInvitees] = useState<any[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledInfo, setScheduledInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinProgress, setJoinProgress] = useState(0);
  const [joinId, setJoinId] = useState("");
  const [onlineSessions, setOnlineSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const roomId = useRef(genId());
  const roomLink = genRoomLink(roomId.current);
  const { state: perm, stream, request, stop } = useMicPerm();
  const { show: toast$, node: toastNode } = useToast();
  const finalTopic = topic === "__custom__" ? custom : topic;
  const selectedSubjectLabel = subjectCatalog.find((item) => item.subjectGroupKey === subject)?.title || subject;
  const availableUnits = subject
    ? subjectCatalog.find((item) => item.subjectGroupKey === subject)?.units || []
    : [];
  const copyLink = () => { navigator.clipboard.writeText(roomLink); setCopied(true); setTimeout(()=>setCopied(false),2200); };

  useEffect(() => {
    let ignore = false;

    async function loadSubjects() {
      try {
        const data = await getLibrarySubjects();
        if (!ignore) {
          setSubjectCatalog(data);
        }
      } catch (error) {
        if (!ignore) {
          setSubjectCatalog([]);
          toast$("Unable to load subjects for seminar.", "warn");
        }
      }
    }

    loadSubjects();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadTopics() {
      if (!subject) {
        setTopicOptions([]);
        return;
      }
      try {
        const topics = await getSeminarTopics(subject);
        if (!ignore) {
          const liveTopics = (topics || [])
            .map((item: any) => item.topic || item.title || item.name)
            .filter(Boolean);
          setTopicOptions(liveTopics);
        }
      } catch (error) {
        if (!ignore) {
          setTopicOptions([]);
          toast$("Unable to load seminar topics from the server.", "warn");
        }
      }
    }

    loadTopics();
    return () => {
      ignore = true;
    };
  }, [subject]);

  useEffect(() => {
    let ignore = false;
    async function loadActiveSessions() {
      try {
        const sessions = await getActiveSeminarSessions();
        if (!ignore) {
          setOnlineSessions(sessions || []);
        }
      } catch (error) {
        if (!ignore) {
          setOnlineSessions([]);
        }
      }
    }
    loadActiveSessions();
    const pollId = setInterval(loadActiveSessions, 5000);
    return () => {
      ignore = true;
      clearInterval(pollId);
    };
  }, []);

  const addInvitee = () => {
    const v = inviteInput.trim();
    if (!v) return;
    if (invitees.find(i=>i.value===v)) { toast$("Already added","warn"); return; }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const inv = { id:Date.now()+Math.random(), value:v, type:isEmail?"email":"name", status:isEmail?"sent":"pending", color:COLORS[invitees.length%COLORS.length] };
    setInvitees(p=>[...p,inv]); setInviteInput("");
    if (isEmail) toast$(`📧 Invite sent to ${v}`,"info");
    else { navigator.clipboard.writeText(roomLink); toast$(`🔗 ${v} added · Link copied`,"success"); }
  };

  const steps = role === "Observer"
    ? [
        { label: "Enter your name", done: name.trim().length > 0 },
        { label: "Choose your role", done: !!role },
        { label: "Pick a live session or paste a link", done: Boolean(selectedSession || parseSeminarSessionId(joinId)) },
      ]
    : [
        { label: "Enter your name", done: name.trim().length > 0 },
        { label: "Allow microphone", done: perm === "granted" },
        { label: "Select subject", done: !!subject },
        { label: "Select unit / module", done: !!unit },
        { label: "Select topic", done: !!finalTopic },
        { label: "Choose your role", done: !!role },
        { label: "Choose instant or schedule", done: !!seminarType },
      ];
  const canLaunch = steps.every(s => s.done);

  const features = [
    { ico:"🎙️", t:"AI Facilitator", d:"Guides with Socratic method" },
    { ico:"📋", t:"Individual Reports", d:"Personalized analysis for all" },
    { ico:"📅", t:"Calendar Sync", d:"Auto-saves with reminders" },
    { ico:"⏺", t:"Session Recording", d:"Download as video" },
  ];

  async function handleJoin() {
    setJoining(true);
    // Auto-sync calendar (mandatory, no toggle)
    try {
      const ev = { id:`sem-${Date.now()}`, title:finalTopic, type:"seminar", date:new Date().toISOString().slice(0,10), startTime:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), subject:selectedSubjectLabel, unit };
      const ex = JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");
      localStorage.setItem("gradeup_cal_events_v3", JSON.stringify([...ex, ev]));
      window.dispatchEvent(new StorageEvent("storage", { key:"gradeup_cal_events_v3" }));
    } catch {}
    for (let p = 0; p <= 100; p += 20) { await new Promise(r=>setTimeout(r,180)); setJoinProgress(p); }
    setJoining(false); setShowConfirm(false); setJoinProgress(0);
    if (role === "Observer") {
      const sessionId = selectedSession?.sessionId || selectedSession?.id || parseSeminarSessionId(joinId);
      if (!sessionId) {
        toast$("Enter a valid seminar link or choose a live session.", "warn");
        return;
      }
      try {
        const candidate = getCandidateContext(user || { firstName: name, lastName: "" });
        const joinedSession = await joinSeminarSession({
          sessionId,
          candidateId: candidate.candidateId,
          candidateName: candidate.candidateName,
          role: "observer",
        });
        onLaunch({
          name,
          role,
          subject: joinedSession?.subject || selectedSession?.subject || "",
          unit: joinedSession?.unit || selectedSession?.unit || "",
          topic: joinedSession?.topic || joinedSession?.liveSession?.topic || selectedSession?.title || "",
          invitees:[...invitees],
          roomId:roomId.current,
          roomLink: joinedSession?.shareLink || selectedSession?.roomLink || genRoomLink(sessionId),
          stream: null,
          micOn: false,
          date:scheduledInfo?.date,
          time:scheduledInfo?.time,
          unitId: "",
          sessionId,
          liveSession: joinedSession || joinedSession?.liveSession || null,
          seminarMode: "session",
          joinSession: selectedSession || null,
        });
        return;
      } catch (error: any) {
        toast$(error?.message || "Unable to join the seminar session.", "error");
        return;
      }
    }
    let liveSession = null;
    const seminarMode =
      role === "Observer"
        ? null
        : role === "Facilitator"
          ? "main"
          : "demo";
    if (selectedUnitId && seminarMode) {
      try {
        const candidate = getCandidateContext(user || { firstName: name, lastName: "" });
        liveSession = await startSeminar({
          unitId: selectedUnitId,
          candidateId: candidate.candidateId,
          candidateName: candidate.candidateName,
          topic: finalTopic,
          mode: seminarMode,
        });
      } catch (error: any) {
        toast$(error.message || "Unable to start the live seminar.", "error");
      }
    }
    onLaunch({
      name,
      role,
      subject: selectedSubjectLabel,
      unit,
      topic: finalTopic,
      invitees:[...invitees],
      roomId:roomId.current,
      roomLink,
      stream,
      micOn,
      date:scheduledInfo?.date,
      time:scheduledInfo?.time,
      unitId: selectedUnitId,
      sessionId: liveSession?.session_id || liveSession?.sessionId || "",
      liveSession: liveSession?.liveSession || null,
      initialFacilitatorMessage: liveSession?.ai_greeting || liveSession?.message || liveSession?.opening_statement || "",
      seminarMode,
      sessionSubMode: role === "Facilitator" ? "presenter" : role === "Participant" ? "practice" : "observer",
    });
  }

  return (
    <div className="sp-setup">
        
      {/* LEFT */}
      <div className="sp-setup-left">
        <div className="sp-orbs"><div className="sp-orb sp-orb1"/><div className="sp-orb sp-orb2"/></div>
        <div className="sp-grid"/>
        <div className="sp-setup-left-inner">
          <div className="sp-logo"><div className="sp-logo-ico">🎓</div><span className="sp-logo-name">SeminarArena</span></div>
          <div className="sp-tag"><div className="sp-tag-dot"/>Seminar Setup</div>
          <h2 className="sp-h1">Launch your<br/><span className="gt">Seminar Room.</span></h2>
          <p className="sp-p">{subject?`${subject}${unit?` · ${unit}`:""} — `:""}AI-facilitated group discussion with structured phases, individual scoring & reports.</p>
          <div className="sp-feats-left">
            {features.map((f,i) => (
              <div key={f.t} className="sp-feat-left" style={{animationDelay:`${0.12+i*0.07}s`}}>
                <div className="sp-feat-ico">{f.ico}</div>
                <div className="sp-feat-txt"><strong>{f.t}</strong><span>{f.d}</span></div>
              </div>
            ))}
          </div>
          {(subject||finalTopic) && (
            <div className="ctx-card">
              <div className="ctx-card-label">Session Context</div>
              {subject && <div className="ctx-card-val">📚 {subject}{unit?` · ${unit}`:""}</div>}
              {finalTopic && <div className="ctx-card-sub">{finalTopic.length>45?finalTopic.slice(0,45)+"…":finalTopic}</div>}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="sp-setup-right">
        <div className="sp-setup-scroll">
          <div className="sp-setup-inner">
            {onBack && <button className="setup-back" onClick={()=>{stop();onBack();}}>← Back</button>}
            <h2 className="setup-title">🎓 Seminar Setup</h2>
            <p className="setup-sub">Complete all steps below to launch your AI-facilitated seminar room.</p>

            {/* Mic */}
            <MicPreview perm={perm} name={name} onReq={request} micOn={micOn} onToggle={()=>{const n=!micOn;setMicOn(n);stream?.getAudioTracks().forEach(t=>t.enabled=n);}} />

            {/* Role first (card type, above name) */}
            <div className="sec-div">Your Role</div>
            <div className="role-grid fi">
              {ROLES.map(r => (
                <div key={r.id} className={`role-card${role===r.id?" sel":""}`} onClick={()=>setRole(r.id)}>
                  <div className="role-ico">{r.ico}</div>
                  <div className="role-title">{r.title}</div>
                  <div className="role-desc">{r.desc}</div>
                </div>
              ))}
            </div>

            {/* Identity */}
            <div className="sec-div">Identity</div>
            <div className="fi">
              <label className="fl">Your Name</label>
              <input className="finput" placeholder={role==="Facilitator"?"e.g. Dr. Sarah Chen":role==="Observer"?"e.g. Alex (Observer)":"e.g. Jamie Williams"} value={name} onChange={e=>setName(e.target.value)} maxLength={40}/>
            </div>

            {/* Academic Context */}
            {role === "Observer" ? (
              <>
                <div className="sec-div">Join a Session</div>
                <div className="fi">
                  <label className="fl">Room Link or Session ID</label>
                  <input className="finput" placeholder="Paste seminar link or session id…" value={joinId} onChange={e=>setJoinId(e.target.value)} />
                </div>
                <div className="fi">
                  <label className="fl">Live Sessions</label>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {onlineSessions.length === 0 ? (
                      <div style={{padding:"12px 14px",borderRadius:12,background:"var(--surf2)",border:"1px solid var(--bdr)",fontSize:12,color:"var(--t2)"}}>
                        No active seminar sessions found right now.
                      </div>
                    ) : onlineSessions.map((session) => (
                      <button
                        key={session.sessionId || session.id}
                        type="button"
                        className="btn-s"
                        style={{
                          justifyContent:"space-between",
                          width:"100%",
                          background:selectedSession?.sessionId === session.sessionId || selectedSession?.id === session.id ? "rgba(16,185,129,.08)" : "var(--surf2)",
                          borderColor:selectedSession?.sessionId === session.sessionId || selectedSession?.id === session.id ? "rgba(16,185,129,.32)" : "var(--bdr)",
                          color:"var(--t1)",
                        }}
                        onClick={() => setSelectedSession(session)}
                      >
                        <span>{session.title}</span>
                        <span style={{fontSize:11,color:"var(--t2)"}}>
                          {session.status === "active" ? "Live" : "Waiting"} · {session.observerCount || 0} observers
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="sec-div">Academic Context</div>
                <div className="fi-row fi">
                  <div>
                    <label className="fl">Subject</label>
                    <select className="finput" value={subject} onChange={e=>{setSubject(e.target.value);setUnit("");setSelectedUnitId("");}}>
                      <option value="">Select subject…</option>
                      {subjectCatalog.map(s=><option key={s.subjectGroupKey} value={s.subjectGroupKey}>{s.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="fl">Unit / Module</label>
                    <select className="finput" value={unit} onChange={e=>{
                      const chosen = availableUnits.find(item => (item.unitTitle || item.unitLabel) === e.target.value);
                      setUnit(e.target.value);
                      setSelectedUnitId(chosen?.id || "");
                    }} disabled={!subject}>
                      <option value="">{subject?"Select unit…":"Select subject first"}</option>
                      {availableUnits.map(u=><option key={u.id} value={u.unitTitle || u.unitLabel}>{u.unitTitle || u.unitLabel}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sec-div">Topic</div>
                <div className="fi">
                  <label className="fl">Seminar Topic</label>
                  <select className="finput" value={topic} onChange={e=>setTopic(e.target.value)}>
                    <option value="">Select a topic…</option>
                    {topicOptions.map(t=><option key={t} value={t}>{t}</option>)}
                    {!topicOptions.length && subject && <option value="" disabled>No data available</option>}
                    <option value="__custom__">✏️ Custom topic…</option>
                  </select>
                </div>
                {topic==="__custom__" && (
                  <div className="fi">
                    <label className="fl">Custom Topic</label>
                    <input className="finput" placeholder="Enter your seminar topic…" value={custom} onChange={e=>setCustom(e.target.value)}/>
                  </div>
                )}
              </>
            )}

            {/* Seminar Type */}
            <div className="sec-div">Timing</div>
            <div className="stype-grid fi">
              {[
                { id:"instant", ico:"⚡", t:"Start Now", d:"Jump right in immediately" },
                { id:"schedule", ico:"📅", t:"Schedule", d:"Plan for a future date & time" },
              ].map(o => (
                <div key={o.id} className={`stype-card${seminarType===o.id?" sel":""}`} onClick={()=>setSeminarType(o.id as any)}>
                  <div className="stype-ico">{o.ico}</div>
                  <div><div className="stype-title">{o.t}</div><div className="stype-desc">{o.d}</div></div>
                </div>
              ))}
            </div>
            {seminarType==="schedule" && (
              <div style={{padding:"13px",borderRadius:13,background:"rgba(16,185,129,.05)",border:"1.5px solid rgba(16,185,129,.18)",marginBottom:10}}>
                {!scheduled ? (
                  <>
                    <div style={{fontSize:12.5,fontWeight:700,color:"var(--t1)",marginBottom:6}}>📅 Set date & time for your seminar</div>
                    <div style={{fontSize:11.5,color:"var(--t2)",marginBottom:10}}>Event will be auto-saved to your calendar.</div>
                    <button className="btn-s" style={{width:"100%",justifyContent:"center" as const}} onClick={()=>setShowSchedule(true)}>📅 Open Schedule Form</button>
                  </>
                ) : (
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    <span style={{fontSize:22}}>✅</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:800,color:"var(--em)"}}>Seminar Scheduled</div>
                      <div style={{fontSize:11,color:"var(--t2)"}}>📅 {scheduledInfo?.date} at {scheduledInfo?.time} · Saved to Calendar</div>
                    </div>
                    <button className="btn-s" style={{marginLeft:"auto",fontSize:11,padding:"5px 10px"}} onClick={()=>{setScheduled(false);setShowSchedule(true);}}>Edit</button>
                  </div>
                )}
              </div>
            )}

            {/* Participants */}
            <div className="sec-div">Participants</div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input className="finput" placeholder="Name or email…" style={{flex:1}} value={inviteInput} onChange={e=>setInviteInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addInvitee();}}/>
              <button className="btn-s" style={{flexShrink:0}} onClick={addInvitee}>+ Add</button>
            </div>
            {invitees.map(inv=>(
              <div key={inv.id} className="invite-row">
                <div className="invite-av" style={{background:inv.color}}>{inv.value[0].toUpperCase()}</div>
                <div className="invite-info"><div className="invite-name">{inv.value}</div><div className="invite-type">{inv.type==="email"?"📧 Email invite":"👤 Name · link shared"}</div></div>
                <span className={`invite-status ${inv.status==="sent"?"inv-sent":"inv-pending"}`}>{inv.status==="sent"?"Sent":"Pending"}</span>
                <button className="invite-rm" onClick={()=>setInvitees(p=>p.filter(i=>i.id!==inv.id))}>✕</button>
              </div>
            ))}

            {/* Room Link */}
            <div className="link-box" style={{marginTop:10}}>
              <div className="link-box-title">🔗 Room Link</div>
              <div className="link-row"><span className="link-val">{roomLink}</span><button className="copy-btn" onClick={copyLink}>{copied?"✓ Copied!":"Copy"}</button></div>
              <div className="share-actions">
                <button className="share-btn" onClick={()=>{navigator.clipboard.writeText(roomLink);toast$("Link copied!","info");}}>📧 Email</button>
                <button className="share-btn" onClick={()=>{if(navigator.share)navigator.share({title:"Join my seminar",url:roomLink});else copyLink();}}>↗ Share</button>
              </div>
            </div>

            {/* Calendar auto-sync notice (mandatory, no toggle) */}
            {/* <div className="cal-notice">
              <span style={{fontSize:18}}>📅</span>
              <div><div style={{fontSize:11.5,fontWeight:800,color:"var(--em)"}}>Auto-synced to Calendar</div><div style={{fontSize:10.5,color:"var(--t2)"}}>Sessions are automatically saved to your calendar</div></div>
            </div> */}

            <StepsComp steps={steps}/>
            <button className="btn-p" onClick={()=>setShowConfirm(true)} disabled={!canLaunch}>🚀 Launch Seminar Room</button>
            <div style={{height:24}}/>
          </div>
        </div>
      </div>

      {showSchedule && (
        <ScheduleSeminarModal
          config={{ topic:finalTopic, subject, unit }}
          onSchedule={(info: any)=>{setScheduledInfo(info);setScheduled(true);setShowSchedule(false);toast$("📅 Seminar scheduled!","success");}}
          onClose={()=>setShowSchedule(false)}
        />
      )}

      {showConfirm && (
        <div className="overlay">
          <div className="modal" style={{maxWidth:400}}>
            <div style={{background:"linear-gradient(135deg,#0a1628,#0d2018)",padding:"28px 20px",textAlign:"center" as const}}>
              <div style={{width:70,height:70,borderRadius:"50%",background:"var(--grad-sem)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 12px"}}>🎓</div>
              <div style={{fontSize:16,fontWeight:800,color:"#fff",marginBottom:4}}>{name}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>
                {role==="Facilitator"?"🎙️ Facilitator":role==="Observer"?"👁️ Observer":"🙋 Participant"}
              </div>
              {subject && <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:4}}>📚 {subject}{unit?` · ${unit}`:""}</div>}
            </div>
            <div className="mb">
              <div style={{padding:"10px 12px",borderRadius:12,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.18)",marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:800,color:"var(--t1)",marginBottom:3}}>"{finalTopic}"</div>
              </div>
              <button className={`perm-btn ${micOn?"granted":"denied"}`} style={{width:"100%",justifyContent:"center" as const,fontSize:13,padding:"10px"}} onClick={()=>setMicOn(m=>!m)}>
                <span style={{fontSize:18}}>{micOn?"🎤":"🔇"}</span>{micOn?"Microphone On":"Microphone Off"}
              </button>
              {role==="Observer" && (
                <div style={{marginTop:10,padding:"9px 12px",borderRadius:10,background:"rgba(148,163,184,.07)",border:"1px solid rgba(148,163,184,.18)",fontSize:11.5,color:"var(--t2)"}}>
                  👁️ As an Observer, your mic is muted by default. You can watch, react & take notes.
                </div>
              )}
            </div>
            <div className="mf" style={{flexDirection:"column" as const,gap:8}}>
              <button className="btn-p" onClick={handleJoin} disabled={joining} style={{fontSize:14}}>
                {joining ? <><span className="loader-spin"/>{joinProgress>0?`Loading ${joinProgress}%`:"Launching…"}</> : "🎓 Enter Seminar Room"}
              </button>
              {joinProgress>0 && <div className="lo-progress"><div className="lo-progress-fill" style={{width:`${joinProgress}%`}}/></div>}
              <button className="btn-s" onClick={()=>setShowConfirm(false)} disabled={joining} style={{width:"100%",justifyContent:"center" as const}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

function SeminarSetupModern({ onBack, onLaunch }: { onBack?: () => void; onLaunch: (cfg: any) => void }) {
  const { user } = useAuth();
  const defaultName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "";
  const [name, setName] = useState(defaultName);
  const [seminarMode, setSeminarMode] = useState<"" | "prepare" | "session">("");
  const [sessionSubMode, setSessionSubMode] = useState<"" | "presenter" | "observer">("");
  const [subjectCatalog, setSubjectCatalog] = useState<LibrarySubject[]>([]);
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [seminarTopicCatalog, setSeminarTopicCatalog] = useState<any[]>([]);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [custom, setCustom] = useState("");
  const [seminarType, setSeminarType] = useState<"instant" | "schedule">("instant");
  const [inviteInput, setInviteInput] = useState("");
  const [invitees, setInvitees] = useState<any[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledInfo, setScheduledInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinProgress, setJoinProgress] = useState(0);
  const [joinId, setJoinId] = useState("");
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [onlineSessions, setOnlineSessions] = useState<any[]>([]);
  const roomId = useRef(genId());
  const roomLink = genRoomLink(roomId.current);
  const { state: perm, stream, request, stop } = useMicPerm();
  const { show: toast$, node: toastNode } = useToast();
  const finalTopic = topic === "__custom__" ? custom.trim() : topic;
  const selectedSubjectLabel = subjectCatalog.find((item) => item.subjectGroupKey === subject)?.title || subject;
  const availableUnits = subject ? subjectCatalog.find((item) => item.subjectGroupKey === subject)?.units || [] : [];
  const derivedRole = seminarMode === "session" && sessionSubMode === "observer" ? "Observer" : seminarMode === "session" ? "Facilitator" : "Participant";

  useEffect(() => {
    if (defaultName && !name) setName(defaultName);
  }, [defaultName, name]);

  useEffect(() => {
    let ignore = false;
    async function loadSubjects() {
      try {
        const data = await getLibrarySubjects();
        if (!ignore) setSubjectCatalog(data || []);
      } catch {
        if (!ignore) {
          setSubjectCatalog([]);
          toast$("Unable to load subjects for seminar.", "warn");
        }
      }
    }
    loadSubjects();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadTopics() {
      if (!subject) {
        setSeminarTopicCatalog([]);
        return;
      }
      try {
        const topics = await getSeminarTopics(subject);
        if (!ignore) {
          setSeminarTopicCatalog(topics || []);
        }
      } catch {
        if (!ignore) {
          setSeminarTopicCatalog([]);
          toast$("Unable to load seminar topics from the server.", "warn");
        }
      }
    }
    loadTopics();
    return () => { ignore = true; };
  }, [subject]);

  useEffect(() => {
    const selectedUnit = availableUnits.find((item) => item.id === selectedUnitId);
    const sectionTopics = (selectedUnit?.sectionTopics || [])
      .map((item) => item.label || item.sectionTitle || item.sectionNumber)
      .filter(Boolean);
    const fallbackTopics = (seminarTopicCatalog || [])
      .filter((item: any) => {
        if (!selectedUnitId) return true;
        return (
          item?.unitId === selectedUnitId ||
          item?.unit_id === selectedUnitId ||
          item?.unitTitle === unit ||
          item?.unit === unit
        );
      })
      .map((item: any) => item.topic || item.title || item.name || item.label)
      .filter(Boolean);
    const mergedTopics = Array.from(new Set([...sectionTopics, ...fallbackTopics]));
    setTopicOptions(mergedTopics);
    if (topic && topic !== "__custom__" && !mergedTopics.includes(topic)) {
      setTopic("");
    }
  }, [availableUnits, selectedUnitId, seminarTopicCatalog, topic, unit]);

  useEffect(() => {
    let ignore = false;
    async function loadActiveSessions() {
      try {
        const sessions = await getActiveSeminarSessions();
        if (!ignore) setOnlineSessions(sessions || []);
      } catch {
        if (!ignore) setOnlineSessions([]);
      }
    }
    loadActiveSessions();
    const pollId = setInterval(loadActiveSessions, 5000);
    return () => {
      ignore = true;
      clearInterval(pollId);
    };
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const addInvitee = () => {
    const value = inviteInput.trim();
    if (!value) return;
    if (invitees.find((item) => item.value === value)) {
      toast$("Already added", "warn");
      return;
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setInvitees((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        value,
        type: isEmail ? "email" : "name",
        status: isEmail ? "sent" : "pending",
        color: COLORS[current.length % COLORS.length],
      },
    ]);
    setInviteInput("");
    if (isEmail) toast$(`Invite sent to ${value}`, "info");
    else {
      navigator.clipboard.writeText(roomLink);
      toast$(`Added ${value} and copied the room link`, "success");
    }
  };

  const leftFeatures =
    seminarMode === "prepare"
      ? [
          { ic: "AI", t: "AI Coach", d: "Practice seminar flow with guided help." },
          { ic: "TT", t: "Transcript", d: "Speech can be captured and reused for feedback." },
          { ic: "CH", t: "Coach Chat", d: "Ask follow-up questions any time." },
          { ic: "FB", t: "Formatted Feedback", d: "Readable end-of-session analysis." },
        ]
      : sessionSubMode === "observer"
        ? [
            { ic: "LV", t: "Watch Live", d: "Join active seminar rooms as an observer." },
            { ic: "CH", t: "Observer Chat", d: "Message the presenter through Node APIs." },
            { ic: "WR", t: "Waiting Room", d: "See room status before the host starts." },
            { ic: "RT", t: "Real-time Sync", d: "Live participant and session updates." },
          ]
        : [
            { ic: "RM", t: "Presenter Lobby", d: "Create a real room before starting AI." },
            { ic: "AI", t: "AI Greeting", d: "Use backend TTS from the Python response." },
            { ic: "OB", t: "Observer Join", d: "Share a real room link backed by MongoDB." },
            { ic: "RP", t: "Session Report", d: "End with clean seminar feedback." },
          ];

  const presenterSteps = [
    { label: "Choose mode", done: seminarMode !== "" },
    { label: "Enter your name", done: name.trim().length > 0 },
    { label: "Allow microphone", done: perm === "granted" },
    { label: "Select subject and unit", done: !!subject && !!unit && !!selectedUnitId },
    { label: "Select topic", done: !!finalTopic },
  ];
  const observerSteps = [
    { label: "Choose observer mode", done: seminarMode === "session" && sessionSubMode === "observer" },
    { label: "Enter your name", done: name.trim().length > 0 },
    { label: "Pick a live session or paste a link", done: Boolean(selectedSession || parseSeminarSessionId(joinId)) },
  ];
  const activeSteps = seminarMode === "session" && sessionSubMode === "observer" ? observerSteps : presenterSteps;
  const canJoinObserver = !!(selectedSession || parseSeminarSessionId(joinId));
  const canLaunch =
    seminarMode !== "" &&
    name.trim().length > 0 &&
    (seminarMode === "session" && sessionSubMode === "observer"
      ? canJoinObserver
      : perm === "granted" && !!subject && !!selectedUnitId && !!finalTopic);

  async function handleJoin() {
    setJoining(true);
    try {
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        setJoinProgress(progress);
      }

      const candidate = getCandidateContext(user || { firstName: name, lastName: "" });

      if (seminarMode === "session" && sessionSubMode === "observer") {
        const sessionId = selectedSession?.sessionId || selectedSession?.id || parseSeminarSessionId(joinId);
        if (!sessionId) throw new Error("Enter a valid seminar link or choose a live session.");
        const joinedSession = await joinSeminarSession({
          sessionId,
          candidateId: candidate.candidateId,
          candidateName: candidate.candidateName,
          role: "observer",
        });
        onLaunch({
          name,
          role: "Observer",
          subject: joinedSession?.subject || selectedSession?.subject || "",
          unit: joinedSession?.unit || selectedSession?.unit || "",
          topic: joinedSession?.topic || joinedSession?.liveSession?.topic || selectedSession?.title || "",
          invitees: [...invitees],
          roomId: roomId.current,
          roomLink: joinedSession?.shareLink || selectedSession?.roomLink || genRoomLink(sessionId),
          stream: null,
          micOn: false,
          date: scheduledInfo?.date,
          time: scheduledInfo?.time,
          unitId: "",
          sessionId,
          liveSession: joinedSession?.liveSession || joinedSession || null,
          seminarMode: "session",
          sessionSubMode: "observer",
          joinSession: selectedSession || null,
        });
        return;
      }

      if (!selectedUnitId) throw new Error("Please select a subject unit before continuing.");

      if (seminarMode === "session" && sessionSubMode === "presenter") {
        const room = await createSeminarRoom({
          sessionId: roomId.current,
          roomLink,
          unitId: selectedUnitId,
          candidateId: candidate.candidateId,
          candidateName: candidate.candidateName,
          topic: finalTopic,
        });
        onLaunch({
          name,
          role: "Facilitator",
          subject: selectedSubjectLabel,
          unit,
          topic: finalTopic,
          invitees: [...invitees],
          roomId: roomId.current,
          roomLink,
          stream,
          micOn,
          date: scheduledInfo?.date,
          time: scheduledInfo?.time,
          unitId: selectedUnitId,
          sessionId: room?.session_id || room?.sessionId || roomId.current,
          liveSession: room?.liveSession || null,
          initialFacilitatorMessage: "",
          seminarMode: "session",
          sessionSubMode: "presenter",
        });
        return;
      }

      const liveSession = await startSeminar({
        unitId: selectedUnitId,
        candidateId: candidate.candidateId,
        candidateName: candidate.candidateName,
        topic: finalTopic,
        mode: "prepare_with_ai",
        session_mode: "prepare_with_ai",
      });
      onLaunch({
        name,
        role: "Participant",
        subject: selectedSubjectLabel,
        unit,
        topic: finalTopic,
        invitees: [...invitees],
        roomId: roomId.current,
        roomLink,
        stream,
        micOn,
        date: scheduledInfo?.date,
        time: scheduledInfo?.time,
        unitId: selectedUnitId,
        sessionId: liveSession?.session_id || liveSession?.sessionId || "",
        liveSession: liveSession?.liveSession || null,
        initialFacilitatorMessage: liveSession?.ai_greeting || liveSession?.message || liveSession?.opening_statement || "",
        seminarMode: "prepare",
        sessionSubMode: "practice",
      });
    } catch (error: any) {
      toast$(error?.message || "Unable to launch the seminar flow.", "error");
    } finally {
      setJoining(false);
      setShowConfirm(false);
      setJoinProgress(0);
    }
  }

  return (
    <div className="sp-setup">
      <div className="sp-left">
        <div className="sp-grid-lines" />
        <div className="sp-glow1" />
        <div className="sp-glow2" />
        <div className="sp-left-inner">
          <div className="sp-logo"><div className="sp-logo-ico">SE</div><span className="sp-logo-name">SeminarArena</span></div>
          <div className="sp-badge"><div className="sp-badge-dot" />Seminar Setup</div>
          <h2 className="sp-h1">Your stage,<br /><span className="gt">your seminar.</span></h2>
          <p className="sp-desc">Switch between AI preparation, presenter session mode, and observer join flow without losing the real API-backed seminar behavior.</p>
          <div className="sp-features">
            {leftFeatures.map((feature) => (
              <div key={feature.t} className="sp-feat">
                <div className="sp-feat-ic">{feature.ic}</div>
                <div>
                  <div className="sp-feat-t">{feature.t}</div>
                  <div className="sp-feat-d">{feature.d}</div>
                </div>
              </div>
            ))}
          </div>
          {(subject || finalTopic) && (
            <div className="ctx-chip">
              <div className="ctx-chip-lbl">Session Context</div>
              {subject && <div className="ctx-chip-val">{selectedSubjectLabel}{unit ? ` · ${unit}` : ""}</div>}
              {finalTopic && <div className="ctx-chip-sub">{finalTopic.length > 48 ? `${finalTopic.slice(0, 48)}...` : finalTopic}</div>}
            </div>
          )}
        </div>
      </div>
      <div className="sp-right">
        <div className="sp-right-scroll">
          <div className="sp-right-inner">
            {onBack && <button className="back-btn" onClick={() => { stop(); onBack(); }}>Back</button>}
            <h2 className="setup-h">Seminar Setup</h2>
            <p className="setup-sub">Choose your mode first, then we keep the new design while routing through the live Node and Python seminar APIs.</p>
            <div className="sec-div">Choose Mode</div>
            <div className="module-grid fi">
              {[
                { id: "prepare", ic: "AI", t: "Prepare with AI", d: "Practice with AI help, transcript capture, and clean feedback." },
                { id: "session", ic: "LIVE", t: "Seminar Session", d: "Run a presenter room or join as an observer." },
              ].map((item) => (
                <div key={item.id} className={`module-card${seminarMode === item.id ? " sel" : ""}`} onClick={() => { setSeminarMode(item.id as "prepare" | "session"); if (item.id !== "session") setSessionSubMode(""); }}>
                  <div className="mod-ic">{item.ic}</div>
                  <div><div className="mod-title">{item.t}</div><div className="mod-desc">{item.d}</div></div>
                </div>
              ))}
            </div>
            {seminarMode === "session" && (
              <>
                <div className="sec-div">I Want To</div>
                <div className="submode-grid fi">
                  <div className={`submode-card${sessionSubMode === "presenter" ? " sel" : ""}`} onClick={() => setSessionSubMode("presenter")}>
                    <div className="submode-ic">PR</div>
                    <div className="submode-title">Present Seminar</div>
                    <div className="submode-desc">Create a waiting room, invite observers, then start the seminar.</div>
                  </div>
                  <div className={`submode-card${sessionSubMode === "observer" ? " sel" : ""}`} onClick={() => setSessionSubMode("observer")}>
                    <div className="submode-ic">OB</div>
                    <div className="submode-title">Join as Observer</div>
                    <div className="submode-desc">Watch an active seminar and use the real observer chat flow.</div>
                  </div>
                </div>
              </>
            )}
            {seminarMode === "session" && sessionSubMode === "observer" ? (
              <>
                <div className="sec-div">Join a Session</div>
                <div className="obs-join-section">
                  <div className="obs-join-title">Room Link or Session ID</div>
                  <div className="obs-join-input-row">
                    <input className="finput" placeholder="Paste room link or session id..." value={joinId} onChange={(event) => setJoinId(event.target.value)} />
                    <button className="btn-s" type="button" onClick={() => setSelectedSession(null)}>Use Link</button>
                  </div>
                  <div className="obs-join-or">or</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--t2)", marginBottom: 8 }}>Live and waiting seminar rooms</div>
                  {onlineSessions.length === 0 ? (
                    <div className="ongoing-empty">No seminar rooms are available right now.</div>
                  ) : (
                    <div className="ongoing-list">
                      {onlineSessions.map((session) => (
                        <div key={session.sessionId || session.id} className={`ongoing-card${selectedSession?.sessionId === session.sessionId || selectedSession?.id === session.id ? " sel" : ""}`} onClick={() => setSelectedSession(session)}>
                          <div className="ongoing-live-dot" style={{ background: session.status === "active" ? "var(--red)" : "var(--amb)" }} />
                          <div className="ongoing-info">
                            <div className="ongoing-topic">{session.title}</div>
                            <div className="ongoing-meta">{session.subject || "Seminar"}{session.unit ? ` · ${session.unit}` : ""} · {session.status === "active" ? "Live now" : "Waiting for presenter"}</div>
                          </div>
                          <div className="ongoing-count">{session.observerCount || 0} obs</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="sec-div">Your Name</div>
                <div className="fi">
                  <label className="fl">Display Name</label>
                  <input className="finput" placeholder="e.g. Alex (Observer)" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} />
                </div>
              </>
            ) : seminarMode ? (
              <>
                <MicPreview perm={perm} name={name} onReq={request} micOn={micOn} onToggle={() => { const next = !micOn; setMicOn(next); stream?.getAudioTracks().forEach((track) => { track.enabled = next; }); }} />
                <div className="sec-div">Your Identity</div>
                <div className="fi">
                  <label className="fl">Your Name</label>
                  <input className="finput" placeholder="e.g. Alex Johnson" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} />
                </div>
                <div className="sec-div">Academic Context</div>
                <div className="fi-row fi">
                  <div>
                    <label className="fl">Subject</label>
                    <select className="finput" value={subject} onChange={(event) => { setSubject(event.target.value); setUnit(""); setSelectedUnitId(""); setTopic(""); setCustom(""); }}>
                      <option value="">Select subject...</option>
                      {subjectCatalog.map((item) => <option key={item.subjectGroupKey} value={item.subjectGroupKey}>{item.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="fl">Unit / Module</label>
                    <select className="finput" value={unit} onChange={(event) => { const chosen = availableUnits.find((item) => (item.unitTitle || item.unitLabel) === event.target.value); setUnit(event.target.value); setSelectedUnitId(chosen?.id || ""); setTopic(""); setCustom(""); }} disabled={!subject}>
                      <option value="">{subject ? "Select unit..." : "Select subject first"}</option>
                      {availableUnits.map((item) => <option key={item.id} value={item.unitTitle || item.unitLabel}>{item.unitTitle || item.unitLabel}</option>)}
                    </select>
                  </div>
                </div>
                <div className="sec-div">Seminar Topic</div>
                <div className="fi">
                  <select className="finput" value={topic} onChange={(event) => setTopic(event.target.value)} disabled={!selectedUnitId}>
                    <option value="">{selectedUnitId ? "Select a topic..." : "Select unit first"}</option>
                    {topicOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                    <option value="__custom__">Custom topic...</option>
                  </select>
                </div>
                {topic === "__custom__" && <div className="fi"><input className="finput" placeholder="Enter your seminar topic..." value={custom} onChange={(event) => setCustom(event.target.value)} /></div>}
                {seminarMode === "session" && sessionSubMode === "presenter" && (
                  <>
                    <div className="sec-div">Session Timing</div>
                    <div className="timing-grid fi">
                      {[
                        { id: "instant", title: "Start Now", desc: "Create the room and begin once observers arrive." },
                        { id: "schedule", title: "Schedule", desc: "Save timing and share the room ahead of time." },
                      ].map((item) => (
                        <div key={item.id} className={`timing-card${seminarType === item.id ? " sel" : ""}`} onClick={() => setSeminarType(item.id as "instant" | "schedule")}>
                          <div className="timing-ic">{item.id === "instant" ? "GO" : "CAL"}</div>
                          <div><div className="timing-title">{item.title}</div><div className="timing-desc">{item.desc}</div></div>
                        </div>
                      ))}
                    </div>
                    {seminarType === "schedule" && (
                      <div style={{ padding: "11px 13px", borderRadius: 11, background: "rgba(16,185,129,.04)", border: "1.5px solid rgba(16,185,129,.16)", marginBottom: 10 }}>
                        {!scheduled ? (
                          <>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)", marginBottom: 5 }}>Set date and time for this seminar</div>
                            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 8 }}>We keep the new setup design here and preserve the current calendar flow.</div>
                            <button className="btn-s" style={{ width: "100%", justifyContent: "center" }} onClick={() => setShowSchedule(true)}>Open Schedule Form</button>
                          </>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <span style={{ fontSize: 18 }}>OK</span>
                            <div style={{ flex: 1 }}><div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--em)" }}>Scheduled</div><div style={{ fontSize: 10.5, color: "var(--t2)" }}>{scheduledInfo?.date} at {scheduledInfo?.time}</div></div>
                            <button className="btn-s" style={{ fontSize: 10.5, padding: "3px 8px" }} onClick={() => { setScheduled(false); setShowSchedule(true); }}>Edit</button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="link-box">
                      <div className="link-lbl">Presenter room link</div>
                      <div className="link-row"><span className="link-val">{roomLink}</span><button className="copy-btn" onClick={copyLink}>{copied ? "Copied" : "Copy"}</button></div>
                      <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                        <button className="btn-s" style={{ flex: 1, justifyContent: "center" }} onClick={copyLink}>Copy Link</button>
                        <button className="btn-s" style={{ flex: 1, justifyContent: "center" }} onClick={() => { if (navigator.share) navigator.share({ title: "Join my seminar", url: roomLink }); else copyLink(); }}>Share</button>
                      </div>
                    </div>
                    <div className="sec-div">Invite Participants</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input className="finput" placeholder="Name or email..." style={{ flex: 1 }} value={inviteInput} onChange={(event) => setInviteInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addInvitee(); }} />
                      <button className="btn-s" style={{ flexShrink: 0 }} onClick={addInvitee}>Add</button>
                    </div>
                    {invitees.map((invitee) => (
                      <div key={invitee.id} className="invite-row">
                        <div className="invite-av" style={{ background: invitee.color }}>{invitee.value[0].toUpperCase()}</div>
                        <div className="invite-info"><div className="invite-name">{invitee.value}</div><div className="invite-type">{invitee.type === "email" ? "Email invite" : "Name with shared room link"}</div></div>
                        <span className={`invite-status ${invitee.status === "sent" ? "inv-sent" : "inv-pending"}`}>{invitee.status === "sent" ? "Sent" : "Pending"}</span>
                        <button className="invite-rm" onClick={() => setInvitees((current) => current.filter((item) => item.id !== invitee.id))}>X</button>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : null}
            {seminarMode !== "" && (
              <div style={{ marginTop: 14, marginBottom: 10 }}>
                <div className="steps">
                  {activeSteps.map((step, index) => {
                    const done = step.done;
                    const prevDone = activeSteps.slice(0, index).every((item) => item.done);
                    const active = !done && prevDone;
                    return (
                      <div key={step.label} className={`step-r ${done ? "done" : active ? "act" : "pend"}`}>
                        <div className="step-num">{done ? "OK" : index + 1}</div>
                        <div className="step-lbl">{step.label}</div>
                      </div>
                    );
                  })}
                </div>
                <button className="btn-p" onClick={() => setShowConfirm(true)} disabled={!canLaunch}>
                  {seminarMode === "prepare" ? "Start AI Preparation" : sessionSubMode === "observer" ? "Join as Observer" : "Launch Seminar Room"}
                </button>
              </div>
            )}
            <div style={{ height: 20 }} />
          </div>
        </div>
      </div>
      {showSchedule && (
        <ScheduleSeminarModal
          config={{ topic: finalTopic, subject: selectedSubjectLabel, unit }}
          onSchedule={(info: any) => { setScheduledInfo(info); setScheduled(true); setShowSchedule(false); toast$("Seminar scheduled.", "success"); }}
          onClose={() => setShowSchedule(false)}
        />
      )}
      {showConfirm && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ background: "linear-gradient(135deg,#0a1628,#0d2018)", padding: "28px 20px", textAlign: "center" as const }}>
              <div style={{ width: 70, height: 70, borderRadius: "50%", background: "var(--grad-sem)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>{seminarMode === "prepare" ? "AI" : sessionSubMode === "observer" ? "OB" : "SE"}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{name || "Seminar user"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{derivedRole}</div>
              {selectedSubjectLabel && <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 4 }}>{selectedSubjectLabel}{unit ? ` · ${unit}` : ""}</div>}
            </div>
            <div className="mb">
              {!!finalTopic && <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.18)", marginBottom: 14 }}><div style={{ fontSize: 13, fontWeight: 800, color: "var(--t1)", marginBottom: 3 }}>{finalTopic}</div></div>}
              {derivedRole !== "Observer" && <button className={`perm-btn ${micOn ? "granted" : "denied"}`} style={{ width: "100%", justifyContent: "center" as const, fontSize: 13, padding: "10px" }} onClick={() => setMicOn((current) => !current)}>{micOn ? "Microphone On" : "Microphone Off"}</button>}
              {derivedRole === "Observer" && <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 10, background: "rgba(148,163,184,.07)", border: "1px solid rgba(148,163,184,.18)", fontSize: 11.5, color: "var(--t2)" }}>Observers stay muted and should not call seminar AI start, respond, or end APIs directly.</div>}
            </div>
            <div className="mf" style={{ flexDirection: "column" as const, gap: 8 }}>
              <button className="btn-p" onClick={handleJoin} disabled={joining} style={{ fontSize: 14 }}>
                {joining ? <><span className="loader-spin" />{joinProgress > 0 ? `Loading ${joinProgress}%` : "Launching..."}</> : seminarMode === "prepare" ? "Enter AI Coach Room" : sessionSubMode === "observer" ? "Enter as Observer" : "Open Presenter Lobby"}
              </button>
              {joinProgress > 0 && <div className="lo-progress"><div className="lo-progress-fill" style={{ width: `${joinProgress}%` }} /></div>}
              <button className="btn-s" onClick={() => setShowConfirm(false)} disabled={joining} style={{ width: "100%", justifyContent: "center" as const }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ─── ROOM ─────────────────────────────────────────────────────────────────────
function SeminarRoom({ config, onEnd }: { config: any; onEnd: (r: any) => void }) {
  const { user } = useAuth();
  const isFacilitator = config.role === "Facilitator";
  const isObserver = config.role === "Observer";
  const isPresenterSession = config.seminarMode === "session" && config.sessionSubMode === "presenter";
  const isPrepareMode = config.seminarMode === "prepare";

  const [participants, setParticipants] = useState<Participant[]>(() => {
    const list: Participant[] = [];
    list.push({ id:0, name:config.name, stream:config.stream??null, isLocal:true, isHost:true, role:config.role, micMuted:isObserver||!config.micOn, camOn:false, isSpeaking:false, handRaised:false, avatarColor:COLORS[0] });
    list.push({ id:99, name:"AI Mediator", stream:null, isAI:true, isMed:true, micMuted:false, camOn:false, isSpeaking:false, handRaised:false, avatarColor:"#10b981" });
    return list;
  });

  const [micOn, setMicOn] = useState(!isObserver && config.micOn !== false);
  const [panelTab, setPanelTab] = useState<string|null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [scores, setScores] = useState<Record<number,number>>({});
  const [showEnd, setShowEnd] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [requestingGuide, setRequestingGuide] = useState(false);
  const [showHelpPrompt, setShowHelpPrompt] = useState(false);
  const [speechRecording, setSpeechRecording] = useState(false);
  const [speechProcessing, setSpeechProcessing] = useState(false);
  const [guideStatusText, setGuideStatusText] = useState("");
  const [transcriptEntries, setTranscriptEntries] = useState<string[]>([]);
  const [tileReacts, setTileReacts] = useState<Record<number,any>>({});
  const [handRaised, setHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [liveSessionState, setLiveSessionState] = useState<any>(config.liveSession || null);
  const [startingPresenterSession, setStartingPresenterSession] = useState(false);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const aiIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const speechRecorderRef = useRef<MediaRecorder | null>(null);
  const speechChunksRef = useRef<Blob[]>([]);
  const speechAudioContextRef = useRef<AudioContext | null>(null);
  const speechAnalyserRef = useRef<AnalyserNode | null>(null);
  const speechSilenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechDetectedRef = useRef(false);
  const lastSpeechAtRef = useRef<number | null>(null);
  const timer = useTimer(true);
  const aiVoice = useAIVoice();
  const { show: toast$, node: toastNode } = useToast();
  const sessionStarted = !isPresenterSession && !isObserver ? true : liveSessionState?.status === "active" || liveSessionState?.status === "completed";
  const waitingParticipants = (liveSessionState?.participants || []).filter((participant: any) => !participant.isHost);
  const backHandledRef = useRef(false);

  const mapLiveParticipants = useCallback((liveParticipants: any[] = []) => {
    setParticipants((current) => {
      const seeded = current.filter((participant) => participant.isLocal || participant.isAI || participant.isMed);
      const mapped = liveParticipants
        .filter((participant: any) => participant.name && participant.name !== config.name)
        .map((participant: any, index: number) => ({
          id: Number(participant.id) || index + 10,
          name: participant.name,
          stream: null,
          isLocal: false,
          isHost: Boolean(participant.isHost),
          role: participant.role === "observer" ? "Observer" : participant.isHost ? "Facilitator" : "Participant",
          micMuted: participant.role === "observer" || participant.status !== "active",
          camOn: false,
          isSpeaking: false,
          handRaised: false,
          avatarColor: COLORS[(index + 2) % COLORS.length],
        }));
      return [...seeded, ...mapped];
    });
  }, [config.name]);

  useEffect(() => {
    if (!config.liveSession?.participants?.length) return;
    setLiveSessionState(config.liveSession);
    mapLiveParticipants(config.liveSession.participants);
  }, [config.liveSession, mapLiveParticipants]);

  useEffect(() => {
    let ignore = false;
    let pollId: ReturnType<typeof setInterval> | null = null;
    async function refreshSession() {
      if (!config.sessionId) return;
      try {
        const session = await getSeminarSession(config.sessionId);
        const liveSession = session?.liveSession;
        if (!ignore && liveSession) {
          setLiveSessionState(liveSession);
        }
        if (!ignore && liveSession?.participants?.length) {
          mapLiveParticipants(liveSession.participants);
        }
        if (!ignore && Array.isArray(liveSession?.turns)) {
          const nextMessages = liveSession.turns
            .filter((turn: any) => turn?.message)
            .map((turn: any) => ({
              sender: turn.speakerName || (turn.metadata?.senderRole === "observer" ? "Observer" : "Participant"),
              senderId: Number(turn.speakerId) || 0,
              text: turn.message,
              time: turn.createdAt ? new Date(turn.createdAt).getTime() : Date.now(),
            }));
          if (nextMessages.length) {
            setMessages(nextMessages);
          }
        }
      } catch (error) {
        if (!ignore) {
          toast$("Unable to refresh seminar participants.", "warn");
        }
      }
    }
    refreshSession();
    pollId = setInterval(() => {
      refreshSession();
    }, 5000);
    return () => {
      ignore = true;
      if (pollId) clearInterval(pollId);
    };
  }, [config.sessionId, mapLiveParticipants]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);
  const updateP = useCallback((id: number, patch: any) => setParticipants(ps=>ps.map(p=>p.id===id?{...p,...patch}:p)), []);

  useEffect(() => {
    const onPopState = () => {
      setShowBackConfirm(true);
      window.history.pushState({ seminarRoom: true }, "", window.location.href);
    };
    window.history.pushState({ seminarRoom: true }, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  function addMsg(sender: string, senderId: number, text: string) {
    setMessages(ms=>[...ms,{sender,senderId,text,time:Date.now()}]);
    setExchangeCount(c=>c+1);
  }

  const cleanupSpeechDetection = useCallback(() => {
    if (speechSilenceRef.current) {
      clearInterval(speechSilenceRef.current);
      speechSilenceRef.current = null;
    }
    speechAnalyserRef.current = null;
    if (speechAudioContextRef.current) {
      speechAudioContextRef.current.close().catch(() => null);
      speechAudioContextRef.current = null;
    }
    speechDetectedRef.current = false;
    lastSpeechAtRef.current = null;
  }, []);

  const beginSpeechCapture = useCallback(() => {
    if (isObserver || !sessionStarted || !micOn || speechRecording || speechProcessing || aiVoice.isSpeaking) {
      return;
    }
    const localStream = config.stream instanceof MediaStream ? config.stream : null;
    const audioTrack = localStream?.getAudioTracks?.()[0];
    if (!audioTrack) {
      toast$("Microphone is not available for seminar capture.", "warn");
      return;
    }

    const recordingStream = new MediaStream([audioTrack]);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const recorder = new MediaRecorder(recordingStream, { mimeType });
    speechRecorderRef.current = recorder;
    speechChunksRef.current = [];
    setGuideStatusText("");
    setShowHelpPrompt(false);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        speechChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = async () => {
      cleanupSpeechDetection();
      setSpeechRecording(false);
      setIsRecording(false);
      updateP(0, { isSpeaking: false });
      const audioBlob = new Blob(speechChunksRef.current, { type: mimeType });
      speechChunksRef.current = [];
      if (!audioBlob.size) {
        return;
      }
      setSpeechProcessing(true);
      try {
        const response = await transcribeDebateAudio(audioBlob);
        const transcriptText = String(response?.text || "").trim();
        if (!transcriptText) {
          toast$("No speech detected in the last segment.", "warn");
          return;
        }
        setTranscriptEntries((current) => [...current, transcriptText]);
        addMsg(config.name, 0, transcriptText);
        if (isPrepareMode) {
          setShowHelpPrompt(true);
        }
      } catch (error: any) {
        toast$(error?.message || "Unable to transcribe seminar audio.", "error");
      } finally {
        setSpeechProcessing(false);
      }
    };

    recorder.start();
    setSpeechRecording(true);
    updateP(0, { isSpeaking: false, micMuted: false });

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      const source = audioContext.createMediaStreamSource(recordingStream);
      source.connect(analyser);
      speechAudioContextRef.current = audioContext;
      speechAnalyserRef.current = analyser;
      speechDetectedRef.current = false;
      lastSpeechAtRef.current = Date.now();
      const samples = new Uint8Array(analyser.fftSize);
      speechSilenceRef.current = setInterval(() => {
        if (!speechAnalyserRef.current) return;
        speechAnalyserRef.current.getByteTimeDomainData(samples);
        let peak = 0;
        for (let index = 0; index < samples.length; index += 1) {
          const amplitude = Math.abs(samples[index] - 128);
          if (amplitude > peak) peak = amplitude;
        }
        const detectedSpeech = peak > 8;
        if (detectedSpeech) {
          speechDetectedRef.current = true;
          lastSpeechAtRef.current = Date.now();
          updateP(0, { isSpeaking: true });
          return;
        }
        updateP(0, { isSpeaking: false });
        if (!speechDetectedRef.current || !lastSpeechAtRef.current) {
          return;
        }
        if (Date.now() - lastSpeechAtRef.current >= 10000) {
          speechRecorderRef.current?.stop();
          speechRecorderRef.current = null;
        }
      }, 500);
    } catch {
      cleanupSpeechDetection();
    }

    toast$(isPrepareMode ? "Listening... AI help will be offered after 10 seconds of silence." : "Listening to your seminar speech.", "info");
  }, [aiVoice.isSpeaking, cleanupSpeechDetection, config.name, config.stream, isObserver, isPrepareMode, micOn, sessionStarted, speechProcessing, speechRecording, toast$, updateP]);

  const stopSpeechCapture = useCallback(() => {
    if (!speechRecorderRef.current) return;
    const recorder = speechRecorderRef.current;
    speechRecorderRef.current = null;
    cleanupSpeechDetection();
    setSpeechRecording(false);
    updateP(0, { isSpeaking: false });
    recorder.stop();
  }, [cleanupSpeechDetection, updateP]);

  useEffect(() => {
    if (isPresenterSession && !sessionStarted) {
      return () => { if(aiIntervalRef.current) clearInterval(aiIntervalRef.current); aiVoice.cancel(); cleanupSpeechDetection(); };
    }
    const intro =
      config.initialFacilitatorMessage ||
      `Welcome everyone! I'm your AI Facilitator for today's seminar on "${config.topic}"${config.subject?` in ${config.subject}${config.unit?`, ${config.unit}`:""}`:""}.${isFacilitator?` ${config.name}, as our facilitator, please feel free to guide the discussion.`:""} Let's begin with introductions. Please introduce yourselves and share your initial thoughts.`;
    setTimeout(()=>{
      addMsg("AI Mediator",99,intro);
      updateP(99,{isAITyping:true});
      setTimeout(()=>{
        updateP(99,{isAITyping:false,isSpeaking:true});
        aiVoice.speak(intro,()=>{
          updateP(99,{isSpeaking:false});
          if (isPrepareMode && !isObserver && micOn) {
            beginSpeechCapture();
          }
        });
      },700);
    },1200);

    return ()=>{ if(aiIntervalRef.current) clearInterval(aiIntervalRef.current); aiVoice.cancel(); cleanupSpeechDetection(); };
  }, [beginSpeechCapture, cleanupSpeechDetection, config.initialFacilitatorMessage, config.subject, config.topic, config.unit, config.name, isFacilitator, isObserver, isPrepareMode, isPresenterSession, micOn, sessionStarted]); // eslint-disable-line

  const toggleMic = () => {
    if (isObserver) { toast$("Observers are muted by default","warn"); return; }
    const n=!micOn; setMicOn(n); config.stream?.getAudioTracks().forEach((t: MediaStreamTrack)=>t.enabled=n); updateP(0,{micMuted:!n});
    if (!n && speechRecording) {
      stopSpeechCapture();
    }
    if (n && isPrepareMode && sessionStarted && !aiVoice.isSpeaking && !speechRecording && !speechProcessing) {
      beginSpeechCapture();
    }
    if (n) toast$("🎤 Mic enabled","info"); else toast$("🔇 Mic muted","warn");
  };

  const toggleHand = () => {
    const n=!handRaised; setHandRaised(n); updateP(0,{handRaised:n});
    if(n) toast$("✋ Hand raised!","warn");
    else toast$("Hand lowered","info");
  };

  // Facilitator-only: advance phase
  const advancePhase = () => {
    if (!isFacilitator) { toast$("Only the Facilitator can advance phases","warn"); return; }
    const next = Math.min(phaseIdx+1, PHASES.length-1);
    setPhaseIdx(next);
    const msg = `📋 Moving to: ${PHASES[next]}`;
    addMsg("AI Mediator",99,msg);
    updateP(99,{isSpeaking:true}); aiVoice.speak(msg,()=>updateP(99,{isSpeaking:false}));
    toast$(`📋 Phase: ${PHASES[next]}`,"info");
  };

  async function sendMsg(text: string) {
    if (!text.trim()) return;
    addMsg(config.name,0,text.trim()); setChatInput(""); updateP(0,{isSpeaking:true});
    if (!isObserver) {
      setTranscriptEntries((current) => [...current, text.trim()]);
    }
    setTimeout(()=>updateP(0,{isSpeaking:false}),1300);
    if (config.sessionId && (isObserver || config.seminarMode === "session" || isFacilitator)) {
      try {
        const candidate = getCandidateContext(user || { firstName: config.name, lastName: "" });
        await sendSeminarMessage({
          sessionId: config.sessionId,
          candidateId: candidate.candidateId,
          candidateName: candidate.candidateName,
          message: text.trim(),
          role: isObserver ? "observer" : "participant",
        });
        return;
      } catch (error: any) {
        toast$(error?.message || "Unable to send chat message right now.", "error");
        return;
      }
    }
    if (config.sessionId) {
      try {
        updateP(99,{isAITyping:true});
        const response = await respondSeminar({
          sessionId: config.sessionId,
          message: text.trim(),
        });
        const reply =
          response?.ai_response ||
          response?.response ||
          response?.reply ||
          response?.message ||
          response?.answer;
        if (reply) {
          addMsg("AI Mediator",99,reply);
          setTimeout(()=>{ updateP(99,{isAITyping:false,isSpeaking:true}); aiVoice.speak(reply,()=>updateP(99,{isSpeaking:false})); },600);
          return;
        }
        updateP(99,{isAITyping:false});
      } catch (error: any) {
        updateP(99,{isAITyping:false});
        toast$(error?.message || "Unable to reach the seminar AI right now.", "error");
      }
    }
  }

  function sendReaction(emoji: string) {
    setShowReactions(false);
    const k=Date.now(); setTileReacts(r=>({...r,0:{emoji,k}}));
    setTimeout(()=>setTileReacts(r=>{const n={...r};delete n[0];return n;}),2500);
  }

  async function requestGuide() {
    if (!config.sessionId || requestingGuide) return;
    setRequestingGuide(true);
    setShowHelpPrompt(false);
    setGuideStatusText("AI is ready to help. Please wait...");
    if (speechRecording) {
      stopSpeechCapture();
    }
    try {
      const response = await respondSeminar({
        sessionId: config.sessionId,
        transcript: transcriptEntries.join("\n"),
      });
      const guideText =
        response?.ai_response ||
        response?.guidance ||
        response?.message ||
        response?.response;
      if (!guideText) {
        throw new Error("No guidance was returned.");
      }
      addMsg("AI Mediator",99,guideText);
      updateP(99,{isAITyping:true});
      setTimeout(()=>{
        updateP(99,{isAITyping:false,isSpeaking:true});
        aiVoice.speak(guideText,()=>{
          updateP(99,{isSpeaking:false});
          setGuideStatusText("");
          if (isPrepareMode && micOn) {
            beginSpeechCapture();
          }
        });
      },300);
    } catch (error: any) {
      setGuideStatusText("");
      toast$(error?.message || "Unable to fetch seminar guidance.", "error");
    } finally {
      setRequestingGuide(false);
    }
  }

  async function startPresenterSession() {
    if (!config.sessionId || startingPresenterSession) return;
    setStartingPresenterSession(true);
    try {
      const candidate = getCandidateContext(user || { firstName: config.name, lastName: "" });
      const response = await startSeminarRoom({
        sessionId: config.sessionId,
        unitId: config.unitId,
        candidateId: candidate.candidateId,
        candidateName: candidate.candidateName,
        topic: config.topic,
      });
      if (response?.liveSession) {
        setLiveSessionState(response.liveSession);
        if (response.liveSession.participants) {
          mapLiveParticipants(response.liveSession.participants);
        }
      }
      const greeting =
        response?.ai_greeting ||
        response?.message ||
        response?.opening_statement;
      if (greeting) {
        addMsg("AI Mediator", 99, greeting);
        updateP(99, { isSpeaking: true });
        aiVoice.speak(greeting, () => updateP(99, { isSpeaking: false }));
      }
      toast$("Seminar started. Observers can now follow the live session.", "success");
    } catch (error: any) {
      toast$(error?.message || "Unable to start the presenter seminar.", "error");
    } finally {
      setStartingPresenterSession(false);
    }
  }

  async function removeWaitingParticipant(participantId: string) {
    if (!config.sessionId || !participantId || removingParticipantId) return;
    setRemovingParticipantId(participantId);
    try {
      const candidate = getCandidateContext(user || { firstName: config.name, lastName: "" });
      const updated = await removeSeminarParticipant({
        sessionId: config.sessionId,
        candidateId: candidate.candidateId,
        participantId,
      });
      const nextLiveSession = updated?.liveSession || updated;
      if (nextLiveSession) {
        setLiveSessionState(nextLiveSession);
        if (nextLiveSession.participants) {
          mapLiveParticipants(nextLiveSession.participants);
        }
      }
      toast$("Removed waiting participant from the seminar room.", "info");
    } catch (error: any) {
      toast$(error?.message || "Unable to remove the waiting participant.", "error");
    } finally {
      setRemovingParticipantId(null);
    }
  }

  async function handleEnd() {
    if (backHandledRef.current) return;
    backHandledRef.current = true;
    if(aiIntervalRef.current) clearInterval(aiIntervalRef.current); aiVoice.cancel();
    if (speechRecording) {
      stopSpeechCapture();
    }
    cleanupSpeechDetection();
    config.stream?.getTracks().forEach((t: MediaStreamTrack)=>t.stop());
    if (isObserver) {
      onEnd({
        timer,
        topic: config.topic,
        subject: config.subject,
        unit: config.unit,
        participants: participants.filter(p => !p.isAI && !p.isMed).length,
        exchanges: exchangeCount,
        participantsList: participants,
        scores: {},
        modeType: "observer",
        presenterName: participants.find(p => p.isHost && p.role !== "Observer")?.name || config.name,
        feedback: null,
      });
      return;
    }
    let endResponse: any = null;
    if (config.sessionId) {
      try {
        endResponse = await endSeminarWithTranscript({
          sessionId: config.sessionId,
          transcript: transcriptEntries.join("\n"),
        });
      } catch (error: any) {
        toast$(error?.message || "Unable to end the seminar cleanly.", "error");
      }
    }
    const seminarScores = endResponse?.scores || {};
    const totalScore =
      typeof seminarScores.total_score === "number"
        ? seminarScores.total_score
        : undefined;
    if (typeof totalScore === "number") {
      setScores({ 0: totalScore });
    }
    onEnd({
      timer,
      topic: config.topic,
      subject: config.subject,
      unit: config.unit,
      participants: participants.filter(p => !p.isAI && !p.isMed).length,
      exchanges: exchangeCount,
      participantsList: participants,
      scores: typeof totalScore === "number" ? { 0: totalScore, ...seminarScores } : seminarScores,
      modeType: isObserver ? "observer" : "live",
      presenterName: participants.find(p => p.isHost && p.role !== "Observer")?.name || config.name,
      feedback: endResponse?.response_message || endResponse?.scores || endResponse || null,
      canViewFeedback: isPrepareMode || isFacilitator,
    });
  }

  function handleBackAction() {
    if (isFacilitator || isPrepareMode) {
      handleEnd();
      return;
    }
    onEnd({
      aborted: true,
      timer,
      topic: config.topic,
      subject: config.subject,
      unit: config.unit,
      participants: participants.filter(p => !p.isAI && !p.isMed).length,
      exchanges: exchangeCount,
      participantsList: participants,
      scores: {},
      modeType: isObserver ? "observer" : "live",
      presenterName: participants.find(p => p.isHost && p.role !== "Observer")?.name || config.name,
      feedback: null,
      canViewFeedback: false,
    });
  }

  const humanPs = participants.filter(p=>!p.isAI&&!p.isMed);
  const n = participants.length;
  const gc = n<=1?"vg-1":n===2?"vg-2":n===3?"vg-3":n<=4?"vg-4":"vg-6";
  const fmt = (d: number) => new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

  return (
    <div className="sp-room">
      {isRecording && <div className="rec-overlay">⏺ REC {timer}</div>}
      <div className="room-bar">
        <div className="room-logo"><div className="room-logo-ico">🎓</div>SeminarArena</div>
        <button className="btn-s" style={{ padding:"5px 10px", fontSize:11.5 }} onClick={() => setShowBackConfirm(true)}>Back</button>
        <div className="rbar-div"/>
        <div className="rbar-topic"><strong>{config.subject&&`${config.subject}${config.unit?` · ${config.unit}`:""} · `}</strong>{config.topic}</div>
        <div className="rbar-pill pill-timer">{timer}</div>
        {isRecording && <div className="rbar-pill pill-rec"><div className="pill-rec-dot"/>REC</div>}
        <div className="rbar-pill pill-med">🎙 AI Mediating</div>
        {isFacilitator && <div className="rbar-pill" style={{background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.22)",color:"var(--ind3)",fontSize:10.5,fontWeight:700}}>🎙️ Facilitator</div>}
        {isObserver && <div className="rbar-pill" style={{background:"rgba(148,163,184,.1)",border:"1px solid rgba(148,163,184,.2)",color:"rgba(255,255,255,.4)",fontSize:10.5,fontWeight:700}}>👁️ Observing</div>}
        <button className="rbar-end" onClick={()=>setShowEnd(true)}>✕ End</button>
      </div>
      <div className="room-body">
        <div className="grid-area">
          {liveSessionState?.status === "completed" && !showEnd && (
            <div style={{padding:"14px 14px 0"}}>
              <div style={{padding:"14px 16px",borderRadius:16,background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.24)",color:"#fecaca",fontSize:13,fontWeight:700}}>
                This seminar has ended. {isFacilitator || isPrepareMode ? "Your report is being prepared." : "The host ended the meeting."}
              </div>
            </div>
          )}
          {!sessionStarted && (
            <div style={{padding:"14px 14px 0"}}>
              <div style={{padding:"16px 18px",borderRadius:16,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",display:"flex",flexDirection:"column",gap:12}}>
                <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>{isObserver ? "Waiting for host to start." : "Presenter lobby is ready."}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.55)",lineHeight:1.7}}>
                  {isObserver
                    ? "You have joined successfully. Chat is available while the presenter gets ready."
                    : "Observers can join now. Start the seminar when you are ready to begin the live AI-backed session."}
                </div>
                {!isObserver && (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button className="btn-p" style={{width:"auto"}} onClick={startPresenterSession} disabled={startingPresenterSession}>
                      {startingPresenterSession ? "Starting seminar..." : "Start Seminar"}
                    </button>
                    {waitingParticipants.length > 0 && (
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.45)"}}>{waitingParticipants.length} participant(s) waiting</div>
                        {waitingParticipants.map((participant: any) => (
                          <div key={participant.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"8px 10px",borderRadius:10,background:"rgba(255,255,255,.04)"}}>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{participant.name}</div>
                              <div style={{fontSize:10.5,color:"rgba(255,255,255,.45)"}}>{participant.role === "observer" ? "Observer" : "Participant"} · {participant.status || "waiting"}</div>
                            </div>
                            <button className="btn-d" style={{padding:"6px 10px"}} onClick={() => removeWaitingParticipant(String(participant.id))} disabled={removingParticipantId === String(participant.id)}>
                              {removingParticipantId === String(participant.id) ? "Removing..." : "Remove"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className={`vid-grid ${gc}`}>
            {participants.map(p=><Tile key={p.id} p={p} reaction={tileReacts[p.id]}/>)}
          </div>
          <div className="ctrl-bar">
            <div className="cg">
              <button className={`cbtn ${micOn&&!isObserver?"on":"off"}`} onClick={toggleMic} title={isObserver?"Observers are muted":undefined}>
                <span className="cbtn-ico">{micOn&&!isObserver?"🎤":"🔇"}</span><span>{micOn&&!isObserver?"Mute":"Unmute"}</span>
              </button>
              <div style={{position:"relative"}}>
                <button className={`cbtn${showReactions?" hi":""}`} onClick={()=>setShowReactions(r=>!r)}><span className="cbtn-ico">😊</span><span>React</span></button>
                {showReactions && <div className="react-pop">{REACTIONS.map(r=><button key={r} className="react-emoji" onClick={()=>sendReaction(r)}>{r}</button>)}</div>}
              </div>
              <button className={`cbtn${handRaised?" amb":""}`} onClick={toggleHand}><span className="cbtn-ico">✋</span><span>{handRaised?"Lower":"Raise"}</span></button>
              {!isObserver && isPrepareMode && (
              <button className={`cbtn${requestingGuide?" hi":""}`} onClick={requestGuide} disabled={requestingGuide}>
                  <span className="cbtn-ico">💡</span><span>{requestingGuide?"Loading":"AI Help"}</span>
                </button>
              )}
            </div>
            <div className="cg">
              <button
                className={`cbtn${(speechRecording || isRecording)?" rec":""}`}
                onClick={()=>{
                  if (isObserver) {
                    toast$("Observers cannot record or transcribe the seminar.", "warn");
                    return;
                  }
                  if (speechRecording) {
                    setIsRecording(false);
                    stopSpeechCapture();
                    return;
                  }
                  setIsRecording(true);
                  beginSpeechCapture();
                }}
                disabled={speechProcessing || requestingGuide || aiVoice.isSpeaking}
              >
                <span className="cbtn-ico">⏺</span><span>{speechRecording?"Stop":"Record"}</span>
              </button>
              <button className="cbtn em" onClick={()=>setShowAnalysis(true)}><span className="cbtn-ico">📊</span><span>Analysis</span></button>
              {isFacilitator && phaseIdx < PHASES.length-1 && (
                <button className="cbtn hi" onClick={advancePhase}><span className="cbtn-ico">⏭</span><span>Next Phase</span></button>
              )}
            </div>
            <div className="cg">
              <button className={`cbtn${panelTab==="people"?" hi":""}`} onClick={()=>setPanelTab(p=>p==="people"?null:"people")}><span className="cbtn-ico">👥</span><span>People ({n})</span></button>
              <button className={`cbtn${panelTab==="chat"?" hi":""}`} onClick={()=>setPanelTab(p=>p==="chat"?null:"chat")}><span className="cbtn-ico">💬</span><span>Chat</span></button>
              <button className={`cbtn${panelTab==="seminar"?" hi":""}`} onClick={()=>setPanelTab(p=>p==="seminar"?null:"seminar")}><span className="cbtn-ico">📋</span><span>Seminar</span></button>
              <button className="end-btn" onClick={()=>setShowEnd(true)}>End</button>
            </div>
          </div>
        </div>
        {panelTab && (
          <div className="side-panel">
            <div className="panel-tabs-dark">
              {[{id:"people",ico:"👥",lbl:"People"},{id:"chat",ico:"💬",lbl:"Chat"},{id:"seminar",ico:"📋",lbl:"Seminar"}].map(t=>(
                <button key={t.id} className={`ptab${panelTab===t.id?" active":""}`} onClick={()=>setPanelTab(t.id)}>{t.ico}<span style={{fontSize:8.5,display:"block"}}>{t.lbl}</span></button>
              ))}
              <button className="ptab ptab-cls" onClick={()=>setPanelTab(null)}>✕</button>
            </div>

            {panelTab==="people" && (
              <div className="pscroll">
                <div style={{padding:"8px 10px 3px",fontSize:9.5,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"rgba(255,255,255,.22)"}}>{n} in room</div>
                {participants.filter(p=>!p.isAI&&!p.isMed&&!p.isLocal).length===0 && (
                  <div style={{ padding:"0 10px 10px" }}>
                    <div style={{ padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",fontSize:11.5,color:"rgba(255,255,255,.6)" }}>
                      No participants yet
                    </div>
                  </div>
                )}
                <div className="p-list">
                  {participants.map(p=>{
                    const c=p.avatarColor;
                    return (
                      <div key={p.id} className={`p-row${p.isSpeaking?" spk":""}`}>
                        <div className="p-av" style={{background:c+"28",color:c}}>{p.isAI?"🤖":p.isMed?"🎙️":avInit(p.name)}</div>
                        <div className="p-info">
                          <div className="p-name">{p.name}{p.isLocal?" (You)":""}{p.isSpeaking?" 🔊":""}{p.handRaised?" ✋":""}</div>
                          <div className="p-role">{p.isHost&&p.role==="Facilitator"?"🎙️ Facilitator":p.isMed?"🎙️ AI Mediator":p.isAI?"🤖 AI":p.role==="Observer"?"👁️ Observer":"🙋 Participant"}</div>
                        </div>
                        <span style={{fontSize:12,color:p.micMuted?"var(--red)":"var(--em)"}}>{p.micMuted?"🔇":"🎤"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {panelTab==="chat" && (
              <div style={{display:"flex",flexDirection:"column" as const,height:"100%",minHeight:0}}>
                <div className="pscroll" style={{flex:1}}>
                  <div className="chat-msgs">
                    {messages.length===0&&<div className="chat-empty">No messages yet.<br/>Start the discussion!</div>}
                    {messages.map((m,i)=>{
                      const own=m.sender===config.name;const c=COLORS[m.senderId%COLORS.length];
                      return (
                        <div key={i} className={`chat-msg${own?" own":""}`}>
                          {!own&&<div className="chat-av-sm" style={{background:c+"28",color:c}}>{m.sender[0]?.toUpperCase()}</div>}
                          <div className="chat-bwrap">
                            {!own&&<span className="chat-sender">{m.sender}</span>}
                            <div className={`chat-bubble ${own?"bubble-own":"bubble-o"}`}>{m.text}</div>
                            <span className="chat-time">{fmt(m.time)}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef}/>
                  </div>
                </div>
                <div className="chat-ia">
                  <textarea
                    className="chat-inp"
                    placeholder={isObserver?"Send a message to the presenter…":"Send a message…"}
                    value={chatInput}
                    onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg(chatInput);}}}
                    rows={1}
                  />
                  <button className="chat-send" onClick={()=>sendMsg(chatInput)}>➤</button>
                </div>
              </div>
            )}

            {panelTab==="seminar" && (
              <div className="pscroll">
                <div className="sem-wrap">
                  <div className="sem-phase-card">
                    <div className="sem-phase-title">Current Phase</div>
                    <div className="sem-phase-name"><div className="sem-phase-dot"/>{PHASES[phaseIdx]}</div>
                    {isFacilitator && <div style={{fontSize:10,color:"rgba(255,255,255,.35)",marginTop:5}}>As facilitator, use ⏭ Next Phase in controls</div>}
                  </div>
                  <div className="sem-ph-list">
                    {PHASES.map((ph,i)=>(
                      <div key={i} className={`sem-ph-step${i===phaseIdx?" act":""}`} onClick={()=>{ if(isFacilitator&&i<=phaseIdx+1){setPhaseIdx(i);toast$(`📋 Phase: ${ph}`,"info");} }}>
                        <div className={`sem-ph-num ${i<phaseIdx?"ph-done":i===phaseIdx?"ph-act":"ph-pend"}`}>{i<phaseIdx?"✓":i+1}</div>
                        <span className="sem-ph-lbl">{ph}</span>
                        {isFacilitator && i===phaseIdx+1 && <span style={{marginLeft:"auto",fontSize:9,color:"var(--sky)"}}>Click to advance</span>}
                      </div>
                    ))}
                  </div>
                  {humanPs.length>0 && Object.keys(scores).length > 0 && (
                    <div className="score-card">
                      <div className="sc-title">📊 Participant Scores</div>
                      {humanPs.map(p=>{
                        const sc=scores[p.id];const maxSc=Math.max(...humanPs.map(h=>scores[h.id]||0),1);const pct=Math.round(((sc||0)/maxSc)*100);const c=p.avatarColor;
                        if (typeof sc !== "number") return null;
                        return (
                          <div key={p.id} className="sem-score-row">
                            <div className="sem-score-name" title={p.name}>{p.name}{p.isLocal?" (You)":""}</div>
                            <div className="sem-score-bar-wrap"><div className="sem-score-bar" style={{width:`${pct}%`,background:c}}/></div>
                            <div className="sem-score-val">{sc}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="tip-card">
                    <div className="tip-title">💡 {isFacilitator?"Facilitator Tip":"Participant Tip"}</div>
                    <div className="tip-text">{isFacilitator?TIPS[phaseIdx%TIPS.length]:isObserver?"Take notes on key arguments and logical flow during discussions.":"Raise your hand before speaking to maintain structure."}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAnalysis && <AnalysisModal topic={config.topic} subject={config.subject} unit={config.unit} participants={participants} scores={scores} timer={timer} exchanges={exchangeCount} onClose={()=>setShowAnalysis(false)}/>}

      {showHelpPrompt && (
        <div className="overlay" onClick={() => setShowHelpPrompt(false)}>
          <div className="modal dark" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
            <div className="mh">
              <span className="mh-title" style={{ color: "#fff" }}>Need AI guidance?</span>
              <button className="mh-close" style={{ borderColor:"rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)" }} onClick={() => setShowHelpPrompt(false)}>X</button>
            </div>
            <div className="mb" style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.7 }}>
              We detected 10 seconds of silence. Would you like the AI to guide you based on your seminar transcript so far?
            </div>
            <div className="mf">
              <button
                className="btn-s"
                style={{ background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.6)" }}
                onClick={() => {
                  setShowHelpPrompt(false);
                  if (isPrepareMode && micOn && !aiVoice.isSpeaking && !speechRecording && !speechProcessing) {
                    beginSpeechCapture();
                  }
                }}
              >
                Cancel
              </button>
              <button className="btn-p" style={{ width: "auto" }} onClick={requestGuide} disabled={requestingGuide}>
                {requestingGuide ? "Preparing..." : "Help"}
              </button>
            </div>
          </div>
        </div>
      )}

      {guideStatusText && (
        <div style={{ position:"fixed", bottom:20, right:20, zIndex:760, maxWidth:320, padding:"11px 14px", borderRadius:12, background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.28)", color:"#d1fae5", fontSize:12.5, fontWeight:700, boxShadow:"var(--sh2)" }}>
          {guideStatusText}
        </div>
      )}

      {showEnd && (
        <div className="overlay" onClick={()=>setShowEnd(false)}>
          <div className="modal dark" style={{maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <div className="mh"><span className="mh-title" style={{color:"#fff"}}>End Seminar?</span><button className="mh-close" style={{borderColor:"rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)"}} onClick={()=>setShowEnd(false)}>✕</button></div>
            <div className="mb" style={{textAlign:"center" as const,padding:"20px"}}>
              <div style={{fontSize:42,marginBottom:10}}>🏁</div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:6}}>End this seminar?</div>
              <div style={{fontSize:12.5,color:"rgba(255,255,255,.4)",lineHeight:1.75}}>Duration: <strong style={{color:"#6ee7b7"}}>{timer}</strong><br/>{humanPs.length} participant{humanPs.length!==1?"s":""} · {exchangeCount} exchanges</div>
            </div>
            <div className="mf">
              <button className="btn-s" style={{background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)"}} onClick={()=>setShowEnd(false)}>Keep Going</button>
              <button className="btn-d" onClick={handleEnd}>End Session</button>
            </div>
          </div>
        </div>
      )}
      {showBackConfirm && (
        <div className="overlay" onClick={() => setShowBackConfirm(false)}>
          <div className="modal dark" style={{maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <div className="mh"><span className="mh-title" style={{color:"#fff"}}>Go Back?</span><button className="mh-close" style={{borderColor:"rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)"}} onClick={()=>setShowBackConfirm(false)}>X</button></div>
            <div className="mb" style={{textAlign:"center" as const,padding:"20px"}}>
              <div style={{fontSize:42,marginBottom:10}}>←</div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:6}}>Are you sure you want to go back?</div>
              <div style={{fontSize:12.5,color:"rgba(255,255,255,.4)",lineHeight:1.75}}>
                {isFacilitator || isPrepareMode ? "This will end the seminar for everyone in the room." : "Your session view will be closed."}
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" style={{background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)"}} onClick={()=>setShowBackConfirm(false)}>Cancel</button>
              <button className="btn-d" onClick={handleBackAction}>Proceed</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ─── RESULTS ─────────────────────────────────────────────────────────────────
function SeminarResults({ result, onNew }: { result: any; onNew: () => void }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const isObserver = result.modeType === "observer";
  const canViewFeedback = Boolean(result.canViewFeedback);
  return (
    <div className="results-page">
      <div className="res-trophy">{isObserver ? "👁️" : "🎓"}</div>
      <h2 className="res-title">{isObserver ? "Observation Complete!" : "Seminar Complete!"}</h2>
      <p className="res-sub">
        {isObserver ? "You observed" : "Session on"}{" "}
        <strong style={{color:"var(--em)"}}>{result.topic?.slice(0,32)}</strong>
        {isObserver
          ? <> led by <strong style={{ color: "var(--em)" }}>{result.presenterName || "the presenter"}</strong>.</>
          : <> lasted <strong style={{color:"var(--em)"}}>{result.timer}</strong> with <strong>{result.participants}</strong> participant(s).</>}
        {" "}<span style={{color:"var(--em)"}}>{isObserver ? "Live notes saved." : "📅 Saved to Calendar."}</span>
      </p>
      {result.subject && (
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap" as const,justifyContent:"center" as const}}>
          <span style={{padding:"4px 12px",borderRadius:20,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",fontSize:11.5,fontWeight:700,color:"var(--em)"}}>📚 {result.subject}</span>
          {result.unit&&<span style={{padding:"4px 12px",borderRadius:20,background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.2)",fontSize:11.5,fontWeight:700,color:"var(--sky)"}}>📖 {result.unit}</span>}
        </div>
      )}
      <div className="res-stats">
        {[
          { l: "Duration", v: result.timer, i: "⏱️" },
          { l: isObserver ? "Observed" : "Participants", v: result.participants, i: "👥" },
          { l: isObserver ? "Discussion Turns" : "Exchanges", v: result.exchanges, i: "💬" },
        ].map((s,i)=>(
          <div key={s.l} className="res-stat" style={{animationDelay:`${i*.1}s`}}>
            <div className="res-stat-ico">{s.i}</div>
            <div className="res-stat-val">{s.v}</div>
            <div className="res-stat-lbl">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="res-actions">
        {!isObserver && (
          <button className="btn-s" style={{borderColor:"rgba(16,185,129,.3)",color:"var(--em)"}} onClick={()=>setShowAnalysis(true)}>📊 View Analysis</button>
        )}
        <button className="btn-p" style={{fontSize:13,width:"auto",padding:"11px 24px"}} onClick={onNew}>{isObserver ? "Back to Seminar Setup" : "🎓 New Seminar"}</button>
      </div>
      {!isObserver && canViewFeedback && result.feedback && (
        <div className="res-actions">
          <button className="btn-s" onClick={() => setShowFeedback(true)}>View Feedback</button>
        </div>
      )}
      {!isObserver && showAnalysis && <AnalysisModal topic={result.topic} subject={result.subject} unit={result.unit} participants={result.participantsList||[]} scores={result.scores||{}} timer={result.timer} exchanges={result.exchanges||0} onClose={()=>setShowAnalysis(false)}/>}
      {!isObserver && canViewFeedback && showFeedback && (
        <div className="overlay" onClick={() => setShowFeedback(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(event) => event.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">Seminar feedback</div>
              <button className="mh-close" onClick={() => setShowFeedback(false)}>âœ•</button>
            </div>
            <div className="mb">
              <FormattedAIContent value={result.feedback} />
            </div>
            <div className="mf">
              <button className="btn-s" onClick={() => setShowFeedback(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
type Screen = "setup"|"loading"|"room"|"results-loading"|"results";

export default function SeminarPage() {
  const { user } = useAuth();
  const [screen, setScreen, clearScreen] = useSessionState<Screen>("sp-screen", "setup");
  const [config, setConfig, clearConfig] = useSessionState<any>("sp-config", null);
  const [result, setResult] = useState<any>(null);
  const [role, setRole] = useState("student");
  const isObserverResult = result?.modeType === "observer";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedSessionId = params.get("sessionId") || params.get("session") || params.get("room") || "";
    if (!linkedSessionId || config || screen !== "setup") return;

    let ignore = false;
    async function autoJoinLinkedSeminar() {
      try {
        const candidate = getCandidateContext(user || {});
        const joinedSession = await joinSeminarSession({
          sessionId: linkedSessionId,
          candidateId: candidate.candidateId,
          candidateName: candidate.candidateName,
          role: "observer",
        });
        if (ignore) return;
        setConfig({
          name: candidate.candidateName,
          role: "Observer",
          subject: joinedSession?.subject || joinedSession?.liveSession?.subject || "",
          unit: joinedSession?.unit || joinedSession?.liveSession?.unitTitle || "",
          topic: joinedSession?.topic || joinedSession?.liveSession?.topic || "",
          invitees: [],
          roomId: linkedSessionId,
          roomLink: joinedSession?.shareLink || genRoomLink(linkedSessionId),
          stream: null,
          micOn: false,
          unitId: "",
          sessionId: linkedSessionId,
          liveSession: joinedSession?.liveSession || joinedSession || null,
          seminarMode: "session",
          sessionSubMode: "observer",
          joinSession: joinedSession || null,
        });
        setScreen("loading");
      } catch {
        // Leave the user on setup if the shared room is invalid.
      }
    }

    autoJoinLinkedSeminar();
    return () => {
      ignore = true;
    };
  }, [config, screen, setConfig, setScreen, user]);
  
  return (
    <>
      <style>{CSS}</style>
      <div className="sp-app">
        {screen==="setup" && <Navigation currentRole={role} onRoleChange={setRole} />}

        {screen==="setup" && <SeminarSetupModern onLaunch={cfg=>{setConfig(cfg);setScreen("loading");}}/>}
        {screen==="loading" && <PageLoader label={config?.seminarMode==="prepare"?"Preparing AI coach room...":config?.sessionSubMode==="observer"?"Joining seminar as observer...":"Opening presenter lobby..."} sublabel={config?.seminarMode==="prepare"?"Loading transcript and AI coaching flow":config?.sessionSubMode==="observer"?"Connecting to live seminar state":"Syncing room, observers, and start controls"} />}
        {screen==="loading" && config && (
          <AutoAdvance delay={1400} onDone={() => setScreen("room")} />
        )}
        {screen==="room" && config && <SeminarRoom config={config} onEnd={res=>{
          setConfig(null);
          if (res?.aborted) {
            setResult(null);
            clearScreen();
            clearConfig();
            setScreen("setup");
            return;
          }
          setResult(res);
          setScreen("results-loading");
        }}/>}
        {screen==="results-loading" && result && (
          <ResultsLoader isObserver={isObserverResult} onDone={() => setScreen("results")} />
        )}
        {screen==="results" && result && <SeminarResults result={result} onNew={()=>{setResult(null);clearScreen();clearConfig();setScreen("setup");}}/>}
      </div>
    </>
  );
}

function AutoAdvance({ delay, onDone }: { delay: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, delay);
    return () => clearTimeout(t);
  }, [delay, onDone]);
  return null;
}
