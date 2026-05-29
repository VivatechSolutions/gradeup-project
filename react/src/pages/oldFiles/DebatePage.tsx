import { useState, useEffect, useRef, useCallback } from "react";
import Navigation from "../components/navigation";
import FormattedAIContent from "../components/ai/FormattedAIContent";
import { useAuth } from "../hooks/use-auth";
import { useSessionState } from "../hooks/useSessionState";
import {
  createDebateRoom,
  endDebate,
  endDebateRoom,
  getCandidateContext,
  getDebateRoom,
  joinDebateSession,
  joinDebateRoom,
  getDebateSession,
  getDebateTopics,
  getLibrarySubjects,
  inviteDebate,
  retryEndDebateRoom,
  respondDebate,
  startDebateRoom,
  startDebate,
  submitDebateRoomTurn,
  synthesizeDebateSpeech,
  transcribeDebateAudio,
  type LibrarySubject,
} from "../lib/gradeupApi";

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
  --sh:0 2px 12px rgba(0,0,0,.05);--sh2:0 8px 32px rgba(0,0,0,.12);--sh3:0 24px 64px rgba(0,0,0,.18);
  --grad:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  --r:20px;
}
.dark{
  --bg:#0b1120;--surf:#1e293b;--surf2:#0f172a;--surf3:#334155;
  --bdr:rgba(255,255,255,.07);--bdr2:rgba(255,255,255,.1);
  --t1:#f1f5f9;--t2:#94a3b8;--t3:#64748b;--t4:#334155;
}
body{font-family:var(--font);background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(99,102,241,.2);border-radius:4px}
button,input,select,textarea{font-family:var(--font)}
.dp-app{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
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
@keyframes turnBlink{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes tIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes voicePulse{0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,.4)}50%{box-shadow:0 0 0 8px rgba(139,92,246,.0)}}
@keyframes micGlow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}50%{box-shadow:0 0 0 10px rgba(16,185,129,.0)}}

.dp-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--surf);border:1.5px solid var(--bdr);border-radius:13px;padding:10px 17px;font-size:12.5px;font-weight:700;color:var(--t1);box-shadow:var(--sh2);z-index:9999;display:flex;align-items:center;gap:7px;animation:tIn .32s cubic-bezier(.34,1.2,.64,1);white-space:nowrap;max-width:calc(100vw - 28px)}
.dp-toast.success{border-color:rgba(16,185,129,.4)}.dp-toast.error{border-color:rgba(239,68,68,.4)}.dp-toast.warn{border-color:rgba(245,158,11,.4)}.dp-toast.info{border-color:rgba(99,102,241,.36)}

.voice-active{animation:voicePulse 1.2s ease-in-out infinite}
.mic-live{animation:micGlow 1s ease-in-out infinite}
.voice-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:800;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);color:#c4b5fd}
.mic-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:800;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#6ee7b7}
.voice-bars{display:flex;align-items:center;gap:2px;height:14px}
.voice-bar{width:2px;border-radius:2px;background:#c4b5fd;animation:waveBar .55s ease-in-out infinite}
.mic-bar{width:2px;border-radius:2px;background:#6ee7b7;animation:waveBar .55s ease-in-out infinite}

.fi{margin-bottom:10px}
.fl{display:block;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--t3);margin-bottom:5px}
.finput{width:100%;padding:10px 12px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);color:var(--t1);font-size:13px;outline:none;transition:all .18s}
.finput:focus{border-color:var(--ind);background:var(--surf);box-shadow:0 0 0 3px rgba(99,102,241,.1)}
.finput::placeholder{color:var(--t3)}
.finput:disabled{opacity:.45;cursor:not-allowed}
select.finput{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}
.fi-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}

.btn-p{padding:11px 20px;border-radius:13px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:13px;font-weight:700;transition:all .22s;box-shadow:0 5px 18px rgba(99,102,241,.28);display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font);width:100%}
.btn-p:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 9px 26px rgba(99,102,241,.38)}
.btn-p:disabled{opacity:.38;cursor:not-allowed;transform:none;box-shadow:none}
.btn-s{padding:9px 16px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn-s:hover{border-color:rgba(99,102,241,.32);color:var(--t1);background:rgba(99,102,241,.04)}
.btn-d{padding:9px 16px;border-radius:11px;border:1.5px solid rgba(239,68,68,.25);background:rgba(239,68,68,.06);cursor:pointer;color:var(--red);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn-d:hover{background:rgba(239,68,68,.12)}

.link-box{border-radius:14px;background:rgba(99,102,241,.04);border:1.5px solid rgba(99,102,241,.16);padding:12px 14px;margin-bottom:10px}
.link-box-title{font-size:10px;font-weight:800;color:var(--ind);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
.link-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:10px;background:var(--surf);border:1.5px solid var(--bdr)}
.link-val{flex:1;font-family:monospace;font-size:10.5px;color:var(--ind);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.copy-btn{padding:5px 11px;border-radius:7px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:11.5px;font-weight:800;transition:.18s;flex-shrink:0}
.copy-btn:hover{transform:scale(1.05)}
.share-actions{display:flex;gap:6px;margin-top:7px}
.share-btn{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:11.5px;font-weight:700;color:var(--t2);transition:.2s;display:flex;align-items:center;justify-content:center;gap:5px}
.share-btn:hover{border-color:rgba(99,102,241,.3);color:var(--ind);background:rgba(99,102,241,.04)}

.steps{display:flex;flex-direction:column;gap:5px;margin-bottom:13px}
.step-row{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);transition:.22s}
.step-row.done{border-color:rgba(16,185,129,.32);background:rgba(16,185,129,.05)}
.step-row.act{border-color:rgba(99,102,241,.32);background:rgba(99,102,241,.05)}
.step-row.pend{opacity:.45}
.step-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;flex-shrink:0}
.step-row.done .step-num{background:var(--em);color:#fff}
.step-row.act  .step-num{background:var(--ind);color:#fff}
.step-row.pend .step-num{background:var(--surf3);color:var(--t3)}
.step-lbl{font-size:12px;font-weight:700}
.step-row.done .step-lbl{color:var(--em)}.step-row.act .step-lbl{color:var(--t1)}.step-row.pend .step-lbl{color:var(--t3)}

.sec-div{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--t3);margin-bottom:8px;margin-top:4px;display:flex;align-items:center;gap:7px}
.sec-div::after{content:'';flex:1;height:1px;background:var(--bdr)}

.mic-preview{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;background:rgba(99,102,241,.05);border:1.5px solid rgba(99,102,241,.14);margin-bottom:11px}
.mic-av{width:46px;height:46px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;color:#fff;box-shadow:0 6px 18px rgba(99,102,241,.32);flex-shrink:0}
.mic-info{flex:1}
.mic-name{font-size:14px;font-weight:800;color:var(--t1);margin-bottom:1px}
.mic-sub{font-size:11px;color:var(--t2)}
.perm-row{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}
.perm-btn{display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:8px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:11.5px;font-weight:700;transition:.18s}
.perm-btn.granted{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.32);color:var(--em)}
.perm-btn.denied{background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.28);color:var(--red)}
.perm-btn.req{background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.28);color:var(--ind)}
.perm-btn:disabled{opacity:.42;cursor:not-allowed}
.perm-warn{font-size:11.5px;color:#fca5a5;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);border-radius:9px;padding:8px 11px;margin-top:7px;line-height:1.6}

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
.lo-progress{width:100%;height:4px;background:rgba(0,0,0,.07);border-radius:4px;overflow:hidden;margin-top:7px}
.lo-progress-fill{height:100%;background:var(--grad);border-radius:4px;transition:width .4s ease}
.loader-spin{width:22px;height:22px;border-radius:50%;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .7s linear infinite;flex-shrink:0}
.loader-spin.dark{border-color:rgba(99,102,241,.2);border-top-color:var(--ind)}

.dp-setup{height:100dvh;display:grid;grid-template-columns:32% 1fr;overflow:hidden}
.dp-setup-left{background:#060c1a;overflow:hidden;position:relative;display:flex;flex-direction:column}
.dp-setup-left-inner{overflow-y:auto;flex:1;padding:clamp(20px,3vw,44px);display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2}
.dp-orbs{position:absolute;inset:0;pointer-events:none}
.dp-orb{position:absolute;border-radius:50%}
.dp-orb1{width:320px;height:320px;background:radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%);top:-80px;left:-60px;animation:orbFloat 9s ease-in-out infinite}
.dp-orb2{width:220px;height:220px;background:radial-gradient(circle,rgba(139,92,246,.13) 0%,transparent 70%);bottom:-40px;right:-30px;animation:orbFloat 11s ease-in-out infinite reverse}
.dp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(99,102,241,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.06) 1px,transparent 1px);background-size:38px 38px;pointer-events:none}
.dp-logo{display:flex;align-items:center;gap:8px;margin-bottom:20px;animation:fadeUp .5s ease both}
.dp-logo-ico{width:32px;height:32px;background:var(--grad);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 6px 18px rgba(99,102,241,.38)}
.dp-logo-name{font-size:14px;font-weight:800;background:linear-gradient(90deg,#fff,var(--ind3));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.dp-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);font-size:10px;font-weight:800;color:var(--ind3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;animation:fadeUp .5s ease .1s both;width:fit-content}
.dp-tag-dot{width:5px;height:5px;border-radius:50%;background:var(--em);animation:pulse 2s infinite}
.dp-h1{font-size:clamp(18px,2.2vw,32px);font-weight:900;line-height:1.06;letter-spacing:-1px;color:#fff;margin-bottom:10px;animation:fadeUp .5s ease .16s both}
.dp-h1 .gt{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.dp-p{font-size:12px;color:rgba(255,255,255,.42);line-height:1.85;margin-bottom:20px;animation:fadeUp .5s ease .22s both}
.dp-feats-left{display:flex;flex-direction:column;gap:6px;animation:fadeUp .5s ease .28s both}
.dp-feat-left{display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;transition:.3s}
.dp-feat-left:hover{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.28)}
.dp-feat-ico{width:34px;height:34px;border-radius:9px;background:rgba(99,102,241,.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.dp-feat-txt strong{display:block;font-size:12px;font-weight:700;color:#fff;margin-bottom:1px}
.dp-feat-txt span{font-size:10px;color:rgba(255,255,255,.38)}
.ctx-card{margin-top:16px;padding:12px 14px;border-radius:12px;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);animation:fadeUp .5s ease .32s both}
.ctx-card-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--em);margin-bottom:5px}
.ctx-card-val{font-size:13px;font-weight:700;color:#fff;margin-bottom:2px}
.ctx-card-sub{font-size:11px;color:rgba(255,255,255,.4)}
.dp-setup-right{background:var(--surf);overflow:hidden;display:flex;flex-direction:column}
.dp-setup-scroll{overflow-y:auto;flex:1;padding:clamp(20px,3vw,44px)}
.dp-setup-inner{max-width:620px;width:100%;margin:0 auto}
.setup-back{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:11px;border:2px solid rgba(99,102,241,.28);background:rgba(99,102,241,.07);cursor:pointer;font-size:13px;font-weight:800;color:var(--ind);transition:all .22s;margin-bottom:20px;font-family:var(--font)}
.setup-back:hover{background:rgba(99,102,241,.14);border-color:rgba(99,102,241,.5);color:var(--t1);transform:translateX(-3px);box-shadow:0 4px 16px rgba(99,102,241,.15)}
.setup-title{font-size:clamp(17px,2vw,24px);font-weight:900;letter-spacing:-.4px;margin-bottom:3px;color:var(--t1)}
.setup-sub{font-size:12px;color:var(--t2);margin-bottom:18px;line-height:1.6}

.submode-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}
.submode-card{padding:14px 13px;border-radius:14px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .22s;display:flex;align-items:flex-start;gap:9px}
.submode-card:hover{border-color:rgba(99,102,241,.32);background:rgba(99,102,241,.03);transform:translateY(-2px)}
.submode-card.sel{border-color:var(--ind);background:rgba(99,102,241,.06)}
.submode-ico{font-size:22px;flex-shrink:0;margin-top:2px}
.submode-title{font-size:12.5px;font-weight:800;color:var(--t1);margin-bottom:3px}
.submode-desc{font-size:10.5px;color:var(--t2);line-height:1.5}

.dtype-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px}
.dtype-card{padding:12px 13px;border-radius:13px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .22s;display:flex;align-items:flex-start;gap:9px}
.dtype-card:hover{border-color:rgba(99,102,241,.32);background:rgba(99,102,241,.03);transform:translateY(-1px)}
.dtype-card.sel{border-color:var(--ind);background:rgba(99,102,241,.06)}
.dtype-ico{font-size:19px;flex-shrink:0}
.dtype-title{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:2px}
.dtype-desc{font-size:10px;color:var(--t2);line-height:1.45}

.dp-room{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:#060c1a}
.room-bar{height:50px;background:rgba(6,12,26,.97);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 12px;gap:7px;flex-shrink:0;z-index:100;overflow:hidden}
.room-logo{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:#fff;flex-shrink:0;border:none;background:none;cursor:pointer;font-family:var(--font)}
.room-logo-ico{width:25px;height:25px;background:var(--grad);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px}
.rbar-div{width:1px;height:15px;background:rgba(255,255,255,.08);flex-shrink:0}
.rbar-topic{flex:1;font-size:11.5px;color:rgba(255,255,255,.38);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rbar-topic strong{color:#fff}
.rbar-pill{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:10.5px;font-weight:700;flex-shrink:0}
.pill-timer{background:rgba(99,102,241,.14);border:1px solid rgba(99,102,241,.22);color:var(--ind3);font-family:monospace}
.pill-rec{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.22);color:var(--red);animation:recBlink 1.5s infinite}
.pill-rec-dot{width:5px;height:5px;border-radius:50%;background:var(--red)}
.pill-turn-you{background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.28);color:#6ee7b7}
.pill-turn-ai{background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.28);color:#c4b5fd;animation:turnBlink 1.2s infinite}
.rbar-end{padding:4px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);cursor:pointer;font-size:11px;font-weight:700;transition:.15s;flex-shrink:0;font-family:var(--font)}
.rbar-end:hover{background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.35);color:var(--red)}
.room-body{flex:1;display:flex;min-height:0;overflow:hidden}
.grid-area{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.room-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.06)}
.room-info-card{border-radius:14px;padding:10px 11px;min-height:auto}
.room-info-card.live{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.18)}
.room-info-card.host{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.18)}
.room-info-card.game{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.18)}
.room-info-label{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
.room-info-card.live .room-info-label{color:rgba(255,255,255,.45)}
.room-info-card.host .room-info-label{color:#fcd34d}
.room-info-card.game .room-info-label{color:#86efac}
.room-info-title{font-size:12.5px;font-weight:800;color:#fff;margin-bottom:4px}
.room-info-sub{font-size:10.5px;line-height:1.45;color:rgba(255,255,255,.52)}
.room-chip-row{display:flex;gap:6px;flex-wrap:wrap}
.room-chip{padding:4px 8px;border-radius:20px;background:rgba(255,255,255,.06);font-size:10px;font-weight:700;color:#fff}
.room-info-card.host{grid-column:1/-1}
.host-popup-wrap{position:relative}
.host-popup-btn{display:flex;align-items:center;gap:7px;width:100%;justify-content:center;padding:10px 12px;border:none;border-radius:14px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.2);color:#fde68a;cursor:pointer;font-size:11px;font-weight:800;font-family:var(--font);transition:.18s;white-space:nowrap}
.host-popup-btn:hover{transform:translateY(-1px);background:rgba(245,158,11,.18)}
.host-popup-dot{width:8px;height:8px;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.14)}
.host-popup-panel{position:absolute;top:calc(100% + 8px);right:0;width:min(320px,78vw);padding:12px;border-radius:16px;background:#10192f;border:1px solid rgba(245,158,11,.24);box-shadow:var(--sh2);z-index:30;animation:scaleIn .18s ease}
.host-popup-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
.host-popup-title{font-size:12.5px;font-weight:800;color:#fff}
.host-popup-sub{font-size:10.5px;line-height:1.45;color:rgba(255,255,255,.5)}
.host-popup-close{width:24px;height:24px;border:none;border-radius:50%;background:rgba(255,255,255,.06);color:rgba(255,255,255,.66);cursor:pointer}
.host-popup-list{display:flex;flex-direction:column;gap:7px;max-height:220px;overflow:auto}
.host-popup-item{display:flex;align-items:center;gap:8px;padding:8px 9px;border-radius:11px;background:rgba(255,255,255,.05)}
.host-popup-meta{flex:1;min-width:0}
.host-popup-name{font-size:11.5px;font-weight:700;color:#fff}
.host-popup-note{font-size:10px;color:rgba(255,255,255,.45)}
.vid-grid{flex:1;display:grid;gap:8px;padding:10px;min-height:0;overflow:auto;align-content:start}
.vg-1{grid-template-columns:1fr}.vg-2{grid-template-columns:1fr 1fr}.vg-3{grid-template-columns:1fr 1fr 1fr}.vg-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.tile{border-radius:16px;background:#0d1428;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;transition:box-shadow .28s;min-height:220px;animation:tileIn .32s ease}
.tile.spk{box-shadow:0 0 0 2.5px var(--em),0 0 24px rgba(16,185,129,.2)}
.tile video{width:100%;height:100%;object-fit:cover;display:block}
.tile-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;width:clamp(44px,6vw,78px);height:clamp(44px,6vw,78px);font-size:clamp(17px,2.4vw,30px)}
.tile-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.83));padding:24px 12px 10px;display:flex;align-items:flex-end;justify-content:space-between;gap:6px}
.tile-name{font-size:clamp(11px,1.1vw,13px);font-weight:700;color:#fff;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.t-badge{font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px;color:#fff;white-space:nowrap}
.t-host{background:var(--amb);color:#000}.t-ai{background:var(--grad)}.t-you{background:rgba(255,255,255,.17)}.t-med{background:rgba(56,189,248,.82);color:#000}
.tile-muted{width:20px;height:20px;border-radius:50%;background:rgba(239,68,68,.85);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9.5px}
.tile-react{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:42px;animation:rPop 2.2s forwards;pointer-events:none;z-index:5}
.tile-wave{position:absolute;top:9px;right:9px;display:flex;align-items:center;gap:2px;height:22px}
.tile-wave-bar{width:2.5px;border-radius:2px;animation:waveBar .65s ease-in-out infinite}
.tile-turn{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(16,185,129,.88);border-radius:100px;padding:5px 12px;font-size:10px;font-weight:800;color:#fff;white-space:nowrap;animation:turnBlink 1.2s infinite}
.ai-typing-wrap{position:absolute;top:9px;right:9px;display:flex;gap:3px;align-items:center}
.ai-dot{width:5px;height:5px;border-radius:50%;background:var(--vio);animation:dotPulse .9s ease-in-out infinite}
.tile-nudge{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(245,158,11,.92);border-radius:12px;padding:9px 15px;font-size:12.5px;font-weight:700;color:#000;animation:scaleIn .3s ease;white-space:nowrap;border:1px solid rgba(245,158,11,.4);max-width:80%;text-align:center}
.ctrl-bar{min-height:68px;padding:10px 12px;background:rgba(6,12,26,.98);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:8px;flex-wrap:wrap}
.cg{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.cbtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 7px;border-radius:9px;border:1px solid rgba(255,255,255,.09);cursor:pointer;background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);font-size:9px;font-weight:700;transition:all .18s;min-width:42px;font-family:var(--font)}
.cbtn-ico{font-size:14px;transition:transform .2s}
.cbtn:hover{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2);transform:translateY(-2px)}
.cbtn.on{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.36);color:var(--em)}
.cbtn.off{background:rgba(239,68,68,.09);border-color:rgba(239,68,68,.3);color:var(--red)}
.cbtn.hi{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.36);color:var(--ind3)}
.cbtn.amb{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:var(--amb)}
.cbtn.em{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.28);color:var(--em)}
.cbtn.rec{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.46);color:var(--red);animation:recBlink 1.5s infinite}
.cbtn.speaking{background:rgba(139,92,246,.14);border-color:rgba(139,92,246,.46);color:#c4b5fd;animation:voicePulse 1.2s ease-in-out infinite}
.cbtn.mic-live{background:rgba(16,185,129,.18);border-color:rgba(16,185,129,.6);color:#6ee7b7;animation:micGlow 1s ease-in-out infinite}
.cbtn:disabled{opacity:.38;cursor:not-allowed;transform:none}
.end-btn{padding:8px 16px;border-radius:9px;border:none;cursor:pointer;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:12px;font-weight:800;font-family:var(--font);box-shadow:0 3px 12px rgba(239,68,68,.28);transition:.2s;white-space:nowrap}
.end-btn:hover{transform:translateY(-2px);box-shadow:0 7px 20px rgba(239,68,68,.42)}
.react-pop{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#141e36;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 10px;display:flex;gap:6px;box-shadow:var(--sh2);z-index:200;animation:scaleIn .2s ease}
.react-emoji{font-size:20px;cursor:pointer;padding:4px;border-radius:7px;border:none;background:none;transition:.15s}
.react-emoji:hover{transform:scale(1.45)}
.rec-overlay{position:fixed;top:63px;right:12px;background:rgba(239,68,68,.92);border-radius:8px;padding:4px 11px;font-size:11px;font-weight:800;color:#fff;z-index:200;animation:recBlink 1.5s infinite}
.side-panel{width:300px;min-width:300px;background:rgba(6,12,26,.98);border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden}
.panel-tabs-dark{display:flex;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.ptab{flex:1;padding:10px 4px;background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,.3);font-size:9px;font-weight:700;cursor:pointer;transition:.18s;display:flex;flex-direction:column;align-items:center;gap:3px;font-family:var(--font)}
.ptab:hover{color:rgba(255,255,255,.65)}
.ptab.active{color:var(--ind3);border-bottom-color:var(--ind)}
.ptab-cls{flex:0;padding:10px 8px;color:rgba(255,255,255,.22)}
.pscroll{flex:1;overflow-y:auto;min-height:0}
.p-list{padding:8px;display:flex;flex-direction:column;gap:5px}
.p-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:.18s}
.p-row:hover{border-color:rgba(99,102,241,.28);background:rgba(99,102,241,.07)}
.p-row.spk{border-color:rgba(16,185,129,.4);background:rgba(16,185,129,.06)}
.p-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:800;flex-shrink:0}
.p-info{flex:1;min-width:0}
.p-name{font-size:12px;font-weight:700;color:#fff}
.p-role{font-size:10px;color:rgba(255,255,255,.28)}
.chat-msgs{padding:9px;display:flex;flex-direction:column;gap:7px}
.chat-side-head{padding:12px 14px;border:none;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(99,102,241,.06);display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;text-align:left;color:#fff}
.chat-side-title{font-size:12.5px;font-weight:800;color:#fff}
.chat-side-sub{font-size:10.5px;color:rgba(255,255,255,.48);margin-top:2px}
.chat-msg{display:flex;gap:6px;animation:fadeUp .2s ease}
.chat-msg.own{flex-direction:row-reverse}
.chat-av-sm{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0;align-self:flex-end}
.chat-bwrap{display:flex;flex-direction:column;gap:2px;max-width:84%}
.chat-msg.own .chat-bwrap{align-items:flex-end}
.chat-sender{font-size:9.5px;font-weight:700;color:rgba(255,255,255,.28)}
.chat-bubble{padding:7px 10px;border-radius:10px;font-size:12px;line-height:1.55;word-break:break-word}
.bubble-o{background:rgba(255,255,255,.07);color:#fff;border-radius:3px 10px 10px 10px;border:1px solid rgba(255,255,255,.08)}
.bubble-own{background:var(--grad);color:#fff;border-radius:10px 3px 10px 10px}
.chat-time{font-size:9px;color:rgba(255,255,255,.2)}
.chat-empty{text-align:center;color:rgba(255,255,255,.2);font-size:12px;padding:22px 10px;line-height:1.7}
.chat-ia{padding:8px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;display:flex;gap:6px;align-items:flex-end}
.chat-inp{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:12px;outline:none;resize:none;min-height:34px;max-height:78px;transition:border .15s;font-family:var(--font)}
.chat-inp:focus{border-color:var(--ind)}
.chat-inp::placeholder{color:rgba(255,255,255,.2)}
.chat-inp:disabled{opacity:.4;cursor:not-allowed}
.chat-send{width:32px;height:32px;border-radius:8px;background:var(--grad);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.18s;font-size:13px}
.chat-send:hover{transform:scale(1.12)}
.chat-send:disabled{opacity:.4;cursor:not-allowed}
.dp-wrap{padding:9px;display:flex;flex-direction:column;gap:7px}
.score-card{background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.1));border:1px solid rgba(99,102,241,.26);border-radius:12px;padding:12px}
.sc-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.35);margin-bottom:8px}
.sc-row{display:flex;align-items:center;gap:8px}
.sc-item{flex:1;text-align:center}
.sc-val{font-size:25px;font-weight:900}
.sc-u{color:var(--sky)}.sc-a{color:var(--vio)}
.sc-lbl{font-size:10px;color:rgba(255,255,255,.35);margin-top:2px}
.sc-vs{font-size:13px;font-weight:900;color:rgba(255,255,255,.22)}
.sc-bar{height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:7px}
.sc-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--sky),var(--ind),var(--vio));transition:width .8s ease}
.phase-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:10px 12px}
.ph-step{display:flex;align-items:center;gap:7px;padding:6px;border-radius:7px;font-size:11.5px;transition:.18s;margin-bottom:1px}
.ph-step.act{background:rgba(99,102,241,.12)}
.ph-num{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
.ph-done{background:var(--em);color:#fff}.ph-act{background:var(--ind);color:#fff}.ph-pend{background:rgba(255,255,255,.08);color:rgba(255,255,255,.25)}
.ph-lbl{font-weight:700;color:rgba(255,255,255,.4);font-size:11px}
.ph-step.act .ph-lbl{color:#fff}
.turn-box{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:11px;padding:11px 13px}
.turn-label{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.35);margin-bottom:7px}
.turn-ind{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:9px;border:1px solid}
.turn-ind.your{background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.3)}
.turn-ind.ai{background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.3);animation:turnBlink 1.5s infinite}
.turn-dot{width:9px;height:9px;border-radius:50%;animation:pulse 1.5s infinite}
.turn-name{font-size:12.5px;font-weight:700;color:#fff}
.turn-hint{font-size:10.5px;color:rgba(255,255,255,.42);margin-top:1px}
.analysis-bg{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(14px);z-index:800;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .22s ease}
.analysis-box{background:#0c1220;border:1px solid rgba(99,102,241,.24);border-radius:var(--r);width:100%;max-width:650px;max-height:88dvh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh3);animation:modalUp .3s ease}
.analysis-head{padding:16px 20px 13px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;display:flex;align-items:center;justify-content:space-between}
.analysis-title{font-size:15.5px;font-weight:800;color:#fff}
.analysis-body{overflow-y:auto;flex:1;padding:18px 20px}
.a-sec{margin-bottom:16px;animation:fadeUp .4s ease both}
.a-sec-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.32);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,.07)}
.score-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:7px}
.score-box{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:11px;text-align:center}
.score-box-val{font-size:23px;font-weight:900;margin-bottom:3px}
.score-box-lbl{font-size:10px;color:rgba(255,255,255,.38);font-weight:600}
.prog-wrap{margin-bottom:5px}
.prog-label{display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.45);font-weight:600;margin-bottom:3px}
.prog-track{height:5px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
.prog-fill{height:100%;border-radius:4px;transition:width 1.1s ease}
.verdict-box{padding:13px 15px;border-radius:12px;border:1.5px solid;text-align:center}
.verdict-win{font-size:21px;font-weight:900;margin-bottom:3px}
.verdict-lbl{font-size:11.5px;font-weight:700;opacity:.6}
.analysis-foot{padding:12px 20px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;display:flex;justify-content:flex-end;gap:8px}
.results-page{height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:clamp(20px,4vw,52px);text-align:center;overflow-y:auto;background:radial-gradient(ellipse at 50% 25%,rgba(99,102,241,.07) 0%,transparent 65%)}
.res-trophy{font-size:62px;margin-bottom:12px;animation:scaleIn .6s cubic-bezier(.34,1.56,.64,1) .2s both}
.res-title{font-size:clamp(20px,3.2vw,34px);font-weight:900;letter-spacing:-.6px;margin-bottom:6px;color:var(--t1)}
.res-sub{font-size:13px;color:var(--t2);max-width:340px;line-height:1.75;margin-bottom:18px}
.res-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;max-width:340px;margin-bottom:16px}
.res-stat{background:var(--surf);border:1px solid var(--bdr);border-radius:14px;padding:12px 10px;box-shadow:var(--sh);animation:fadeUp .4s ease both;text-align:center;transition:all .25s}
.res-stat:hover{transform:translateY(-4px);box-shadow:0 10px 28px rgba(99,102,241,.12)}
.res-stat-ico{font-size:19px;margin-bottom:4px}
.res-stat-val{font-size:clamp(16px,2.2vw,24px);font-weight:900;color:var(--ind)}
.res-stat-lbl{font-size:10px;color:var(--t3);margin-top:2px}
.res-verdict{width:100%;max-width:760px;display:grid;grid-template-columns:1.2fr .8fr;gap:12px;margin-bottom:18px;text-align:left}
.res-panel{background:var(--surf);border:1px solid var(--bdr);border-radius:18px;padding:18px;box-shadow:var(--sh)}
.res-panel-title{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--t3);margin-bottom:10px}
.res-winner-name{font-size:24px;font-weight:900;color:var(--t1);margin-bottom:4px}
.res-winner-sub{font-size:13px;line-height:1.6;color:var(--t2)}
.res-rank{display:flex;flex-direction:column;gap:10px}
.res-rank-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 13px;border-radius:14px;background:var(--surf2);border:1px solid var(--bdr)}
.res-rank-name{font-size:13px;font-weight:800;color:var(--t1)}
.res-rank-role{font-size:11px;color:var(--t3);margin-top:2px}
.res-rank-score{font-size:18px;font-weight:900;color:var(--ind)}
.res-insights{width:100%;max-width:760px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
.res-insight{background:var(--surf);border:1px solid var(--bdr);border-radius:16px;padding:14px;text-align:left;box-shadow:var(--sh)}
.res-insight-title{font-size:11px;font-weight:800;color:var(--ind);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em}
.res-insight-text{font-size:12.5px;line-height:1.65;color:var(--t2)}
.res-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:center}

@media(max-width:1100px){.dp-setup{grid-template-columns:35% 1fr}}
@media(max-width:900px){
  .dp-setup{grid-template-columns:1fr;overflow-y:auto;height:auto;min-height:100dvh}
  .dp-setup-left{min-height:200px;max-height:260px}
  .dp-setup-left-inner{justify-content:flex-start}
  .dp-feats-left{display:none}
  .ctx-card{display:none}
}
@media(max-width:768px){
  .submode-grid,.dtype-grid{grid-template-columns:1fr}
  .room-body{flex-direction:column}
  .room-info-grid{grid-template-columns:1fr;gap:8px;padding:8px}
  .room-info-card{min-height:auto;padding:10px 12px}
  .host-popup-btn{width:100%;justify-content:center}
  .host-popup-panel{left:0;right:0;width:auto}
  .vid-grid{padding:8px;gap:8px}
  .tile{min-height:180px}
  .ctrl-bar{padding:8px}.cg{gap:2px;justify-content:center}
  .cbtn{padding:5px 6px;min-width:38px;font-size:8.5px}
  .side-panel{width:100%;min-width:100%;max-height:42dvh;border-left:none;border-top:1px solid rgba(255,255,255,.07)}.rbar-topic{display:none}
  .fi-row{grid-template-columns:1fr}
  .analysis-bg{align-items:flex-end;padding:0}.analysis-box{border-radius:16px 16px 0 0;max-height:92dvh}
  .overlay{align-items:flex-end;padding:0}.modal{border-radius:16px 16px 0 0;max-height:90dvh}
  .vg-3,.vg-4{grid-template-columns:1fr 1fr}
  .res-verdict,.res-insights{grid-template-columns:1fr}
}
@media(max-width:560px){.cbtn span:last-child{display:none}.cbtn{min-width:32px}.tile{min-height:160px}.res-actions{flex-direction:column;align-items:stretch}}
`;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const COLORS = ["#6366f1","#10b981","#f59e0b","#38bdf8","#ec4899","#8b5cf6","#f97316","#06b6d4"];
const PHASES = ["Opening Statements","Cross-Examination","Rebuttal Round","Closing Arguments"];
const REACTIONS = ["👍","👏","❤️","😂","🔥","🤔","🎓","✨"];

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

// Short crisp AI debater lines so voice doesn't run too long
const AI_LINES = [
  "That claim lacks empirical support. The data says otherwise.",
  "You are conflating correlation with causation here.",
  "Strong framing, but the systemic implications are being ignored.",
  "Can you substantiate that with concrete evidence?",
  "That premise is false. Here is precisely why it breaks down.",
  "I concede that point, but your core conclusion still fails.",
  "History provides direct counter-examples to that assertion.",
  "Even granting your premise, the conclusion does not follow.",
  "That view has been thoroughly challenged in recent literature.",
  "You are presenting a false dilemma. There is a third option.",
];

const AI_MULTI_LINES = [
  "Excellent point. Let us hear another perspective.",
  "Building on that — consider the ethical angle here.",
  "Fascinating. Can someone offer a counter argument?",
  "That touches a key tension. Who wants to unpack it?",
  "Would anyone like to challenge or extend this?",
];

const avColor = (n: string) => COLORS[(n || "U").charCodeAt(0) % COLORS.length];
const avInit  = (n: string) => (n || "U").split(/[_\s]/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
const genRoomId = () => Math.random().toString(36).slice(2, 12);
const genRoomLink = (id: string) => `${window.location.origin}/debatePage?sessionId=${encodeURIComponent(id)}`;
const MULTI_REACTIONS = ["👏","🔥","💡","🙌","🎯","⚡","🚀","🏆","🧠","💯","📣","🌟"];
const randomPick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function extractDebateScores(payload: any) {
  const student =
    payload?.student_score ??
    payload?.user_score ??
    payload?.scores?.student ??
    payload?.scores?.user ??
    payload?.scores?.you;
  const ai =
    payload?.ai_score ??
    payload?.opponent_score ??
    payload?.scores?.ai ??
    payload?.scores?.opponent;
  const overall =
    payload?.total_score ??
    payload?.overall_score ??
    payload?.scores?.overall ??
    payload?.scores?.total_score;
  const hasRealScores =
    student !== undefined ||
    ai !== undefined ||
    overall !== undefined;

  return {
    you: student !== undefined ? Number(student) || 0 : null,
    ai: ai !== undefined ? Number(ai) || 0 : null,
    overall: overall !== undefined ? Number(overall) || 0 : null,
    hasRealScores,
  };
}

function buildTurnCountMap(liveSession: any) {
  const counts = new Map<string, number>();
  (liveSession?.turns || []).forEach((turn: any) => {
    const speakerId = turn?.speakerId !== undefined && turn?.speakerId !== null ? String(turn.speakerId) : "";
    const speakerName = String(turn?.speakerName || "").trim().toLowerCase();

    if (speakerId) {
      counts.set(`id:${speakerId}`, (counts.get(`id:${speakerId}`) || 0) + 1);
    }
    if (speakerName) {
      counts.set(`name:${speakerName}`, (counts.get(`name:${speakerName}`) || 0) + 1);
    }
  });
  return counts;
}

function playAudioDataUrl(dataUrl: string, onStart?: () => void, onDone?: () => void) {
  const audio = new Audio(dataUrl);
  let started = false;
  const markStarted = () => {
    if (started) return;
    started = true;
    onStart?.();
  };
  audio.onplay = markStarted;
  audio.onplaying = markStarted;
  audio.onended = () => onDone?.();
  audio.onerror = () => onDone?.();
  audio.play().then(markStarted).catch(() => onDone?.());
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function useTimer(running: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsedSeconds(x => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return { elapsedSeconds, label: fmtClock(elapsedSeconds) };
}

function useMicPerm() {
  const [state, setState] = useState<"idle"|"requesting"|"granted"|"denied">("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  async function request() {
    setState("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setStream(s); setState("granted"); return s;
    } catch { setState("denied"); return null; }
  }
  function stop() { stream?.getTracks().forEach(t => t.stop()); setStream(null); setState("idle"); }
  return { state, stream, request, stop };
}

function useRecorder() {
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  async function start(audio?: MediaStream | null) {
    try {
      const ds = await (navigator.mediaDevices as any).getDisplayMedia({ video: { displaySurface: "browser" }, audio: true });
      const tracks = [...ds.getTracks()];
      if (audio instanceof MediaStream) audio.getAudioTracks().forEach((t: MediaStreamTrack) => tracks.push(t));
      const combined = new MediaStream(tracks);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      const mr = new MediaRecorder(combined, { mimeType: mime });
      chunks.current = [];
      mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => { setBlob(new Blob(chunks.current, { type: mime })); combined.getTracks().forEach((t: MediaStreamTrack) => t.stop()); };
      ds.getVideoTracks()[0].addEventListener("ended", () => stop());
      mr.start(1000); mrRef.current = mr; setIsRecording(true); return true;
    } catch { return false; }
  }
  function stop() { if (mrRef.current?.state !== "inactive") mrRef.current?.stop(); setIsRecording(false); }
  function download(fname = "debate.webm") {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = u; a.download = fname; a.click(); URL.revokeObjectURL(u);
  }
  return { isRecording, blob, start, stop, download };
}

// ─── SINGLETON VOICE ENGINE ───────────────────────────────────────────────────
// One engine for the whole page. Serializes all speech so nothing overlaps.
// speak(text, id, onDone) — if same id is already queued/speaking, skip (dedup).
// cancel() stops everything immediately.
const voiceEngine = (() => {
  let currentId = "";
  let speaking = false;
  let cancelled = false;
  let voiceRef: SpeechSynthesisVoice | null = null;

  function pickVoice() {
    const voices = window.speechSynthesis?.getVoices() || [];
    const preferred = [
      "Microsoft Aria Online (Natural)",
      "Microsoft Jenny Online (Natural)",
      "Microsoft Guy Online (Natural)",
      "Google US English",
      "Google UK English Female",
      "Google UK English Male",
      "Samantha","Karen","Moira","Daniel","Alex",
    ];
    voiceRef =
      preferred.map(name => voices.find(v => v.name.includes(name))).find(Boolean) ||
      voices.find(v => /en[-_](us)/i.test(v.lang)) ||
      voices.find(v => /en[-_](gb|au|in)/i.test(v.lang)) ||
      voices.find(v => /^en/i.test(v.lang)) ||
      voices[0] || null;
  }

  if (typeof window !== "undefined") {
    window.speechSynthesis?.addEventListener("voiceschanged", pickVoice);
    pickVoice();
  }

  function speak(
    text: string,
    id: string,
    opts: { pitch?: number; rate?: number },
    onStart?: () => void,
    onDone?: () => void,
  ) {
    if (!("speechSynthesis" in window)) { onDone?.(); return; }

    // Deduplicate: if this exact id is already speaking, ignore
    if (currentId === id && speaking) return;

    cancelled = false;
    currentId = id;
    window.speechSynthesis.cancel();

    // Split into sentences to avoid Chrome's 15s truncation bug
    const sentences = text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) || [text];
    let idx = 0;

    function next() {
      if (cancelled || idx >= sentences.length) {
        speaking = false;
        if (!cancelled) onDone?.();
        return;
      }

      const u = new SpeechSynthesisUtterance(sentences[idx]);
      u.rate  = opts.rate  ?? 0.92;
      u.pitch = opts.pitch ?? 1.0;
      u.volume = 1;
      u.lang = voiceRef?.lang || "en-US";
      if (voiceRef) u.voice = voiceRef;

      u.onstart = () => {
        if (!cancelled) { speaking = true; onStart?.(); }
      };
      u.onend = () => { idx++; next(); };
      u.onerror = (e: SpeechSynthesisErrorEvent) => {
        if (e.error === "interrupted" || e.error === "canceled") { speaking = false; return; }
        speaking = false; onDone?.();
      };

      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(u);
      } catch { speaking = false; onDone?.(); }
    }

    // Small delay so cancel() fully clears before new utterance is enqueued
    setTimeout(next, 180);
  }

  function cancel() {
    cancelled = true;
    speaking = false;
    currentId = "";
    window.speechSynthesis?.cancel();
  }

  // Chrome keepalive — prevents silent suspension after ~15s
  if (typeof window !== "undefined") {
    setInterval(() => {
      if (window.speechSynthesis && !window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      }
    }, 10000);
  }

  return { speak, cancel };
})();

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const show = (msg: string, type = "success") => setToast({ msg, type });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast ? (
    <div className={`dp-toast ${toast.type}`} onClick={() => setToast(null)}>
      {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : toast.type === "warn" ? "⚠️" : "ℹ️"} {toast.msg}
    </div>
  ) : null;
  return { show, node };
}

function DebateLoadingScreen({ title, subtitle, progress }: { title: string; subtitle: string; progress?: number }) {
  const safeProgress = Math.max(8, Math.min(100, progress ?? 65));
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(circle at top, rgba(99,102,241,.16), transparent 48%), #060c1a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          padding: "28px 24px",
          background: "rgba(15,23,42,.86)",
          border: "1px solid rgba(255,255,255,.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,.28)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 16px",
            borderRadius: "50%",
            border: "4px solid rgba(99,102,241,.18)",
            borderTopColor: "#a5b4fc",
            animation: "spin .9s linear infinite",
          }}
        />
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,.58)", marginBottom: 18 }}>{subtitle}</div>
        <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
          <div
            style={{
              width: `${safeProgress}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)",
              transition: "width .3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
function MicPreview({ perm, name, onReq, micOn, onToggle }: any) {
  return (
    <div className="mic-preview">
      <div className="mic-av">{name ? name[0].toUpperCase() : "?"}</div>
      <div className="mic-info">
        <div className="mic-name">{name || "Your Name"}</div>
        <div className="mic-sub">🎙 Audio-only mode</div>
        <div className="perm-row">
          {perm === "idle"       && <button className="perm-btn req"    onClick={onReq}>🎤 Allow Mic</button>}
          {perm === "requesting" && <button className="perm-btn req"    disabled><span className="loader-spin dark" style={{ width:14,height:14,borderWidth:2 }} />Requesting…</button>}
          {perm === "denied"     && <button className="perm-btn denied" onClick={onReq}>🔄 Retry</button>}
          {perm === "granted"    && (
            <>
              <button className={`perm-btn ${micOn ? "granted" : "denied"}`} onClick={onToggle}>
                {micOn ? "🎤 Mic On" : "🔇 Off"}
              </button>
              <span style={{ padding:"5px 10px",borderRadius:7,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",fontSize:11,fontWeight:700,color:"var(--em)" }}>✓ Ready</span>
            </>
          )}
        </div>
        {perm === "denied" && <div className="perm-warn">⚠️ Allow mic in browser settings and retry.</div>}
      </div>
    </div>
  );
}

function StepsComp({ steps }: { steps: { label: string; done: boolean }[] }) {
  const st = (i: number) => steps[i].done ? "done" : steps.slice(0, i).every(s => s.done) ? "act" : "pend";
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <div key={i} className={`step-row ${st(i)}`}>
          <div className="step-num">{s.done ? "✓" : i + 1}</div>
          <div className="step-lbl">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

type Team = "A" | "B";

interface Participant {
  id: number;
  name: string;
  stream: MediaStream | null;
  isLocal?: boolean;
  isHost?: boolean;
  isAI?: boolean;
  isMed?: boolean;
  isStudent?: boolean;
  micMuted: boolean;
  camOn: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  isMyTurn?: boolean;
  isAITyping?: boolean;
  avatarColor?: string;
  energy?: number;
  reactionsReceived?: number;
  turnsTaken?: number;
  team?: Team;
  teamOrder?: number;
  hasSpoken?: boolean;
}

function WaveBars({ color = "#10b981" }: { color?: string }) {
  return (
    <div className="tile-wave">
      {[0,1,2,3,4].map(i => (
        <div key={i} className="tile-wave-bar" style={{ background: color, animationDelay: `${i * 0.11}s` }} />
      ))}
    </div>
  );
}

function Tile({ p, reaction, nudge }: { p: Participant; reaction?: any; nudge?: string }) {
  const vRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (vRef.current && p.stream instanceof MediaStream) vRef.current.srcObject = p.stream; }, [p.stream]);
  const color = p.avatarColor || avColor(p.name);
  return (
    <div className={`tile${p.isSpeaking ? " spk" : ""}`}>
      {p.stream instanceof MediaStream && p.camOn
        ? <video ref={vRef} autoPlay playsInline muted={p.isLocal} />
        : (
          <div className="tile-av" style={{ background: color + "28", color }}>
            {p.isAI && !p.isMed ? "🤖" : p.isMed ? "🎙️" : avInit(p.name)}
          </div>
        )
      }
      {p.isSpeaking && (p.isAI || p.isMed) && (
        <div className="tile-wave">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="tile-wave-bar" style={{ background: p.isMed ? "#38bdf8" : "#8b5cf6", animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}
      {p.isSpeaking && !p.isAI && !p.isMed && <WaveBars color="#10b981" />}
      {p.isMyTurn && !p.micMuted && <div className="tile-turn">🎤 Speaking</div>}
      {p.isMyTurn && p.micMuted && !p.isAI && !p.isMed && <div className="tile-turn" style={{ background:"rgba(99,102,241,.88)" }}>🎙 Your Turn Soon</div>}
      {p.isAITyping && (
        <div className="ai-typing-wrap">
          {[0,1,2].map(i => <div key={i} className="ai-dot" style={{ animationDelay: `${i * 0.22}s` }} />)}
        </div>
      )}
      {nudge && <div className="tile-nudge">{nudge}</div>}
      {p.handRaised && (
        <div style={{ position:"absolute",top:8,left:8,background:"rgba(245,166,35,.92)",borderRadius:7,padding:"3px 8px",fontSize:11,fontWeight:800,color:"#000" }}>✋</div>
      )}
      {reaction && <div key={reaction.key} className="tile-react">{reaction.emoji}</div>}
      <div className="tile-ov">
        <div className="tile-name">
          {p.name}
          {p.isHost  && <span className="t-badge t-host">HOST</span>}
          {p.isAI && !p.isMed && <span className="t-badge t-ai">AI</span>}
          {p.isMed   && <span className="t-badge t-med">MED</span>}
          {p.isLocal && !p.isHost && <span className="t-badge t-you">You</span>}
          {p.isSpeaking && (p.isAI || p.isMed) && (
            <span className="voice-badge">
              <span className="voice-bars">
                {[0,1,2].map(i => <span key={i} className="voice-bar" style={{ height:`${8+i*3}px`, animationDelay:`${i*0.15}s` }} />)}
              </span>
              Speaking
            </span>
          )}
          {p.isSpeaking && !p.isAI && !p.isMed && !p.micMuted && (
            <span className="mic-badge">
              <span className="voice-bars">
                {[0,1,2].map(i => <span key={i} className="mic-bar" style={{ height:`${8+i*3}px`, animationDelay:`${i*0.15}s` }} />)}
              </span>
              Live
            </span>
          )}
        </div>
        {p.micMuted && <div className="tile-muted">🔇</div>}
      </div>
    </div>
  );
}

function normalizeTeam(value: any): Team | undefined {
  if (value === "A" || value === "B") return value;
  return undefined;
}

function buildMultiVerdict(list: Participant[]) {
  const ranked = [...list]
    .filter(p => !p.isAI && !p.isMed)
    .map(p => ({
      ...p,
      debateScore: (p.turnsTaken || 0) * 6 + (p.reactionsReceived || 0) * 4 + Math.round((p.energy || 0) / 8),
    }))
    .sort((a, b) => (b.debateScore || 0) - (a.debateScore || 0));
  const teamScores = ranked.reduce(
    (acc, participant) => {
      if (participant.team === "A" || participant.team === "B") {
        acc[participant.team] += participant.debateScore || 0;
      }
      return acc;
    },
    { A: 0, B: 0 },
  );
  const winner   = ranked[0] || null;
  const runnerUp = ranked[1] || null;
  const winnerTeam =
    teamScores.A > 0 || teamScores.B > 0
      ? teamScores.A === teamScores.B
        ? undefined
        : teamScores.A > teamScores.B
          ? "A"
          : "B"
      : undefined;
  const insights = winner ? [
    `${winner.name} held the strongest audience response with ${winner.reactionsReceived || 0} reactions.`,
    `${winner.name} completed ${winner.turnsTaken || 0} speaking turn${winner.turnsTaken === 1 ? "" : "s"} with steady control.`,
    runnerUp
      ? `${runnerUp.name} finished as runner-up and stayed competitive throughout the room.`
      : "No runner-up was available in this session.",
  ] : [];
  return { ranked, winner, runnerUp, insights, winnerTeam, teamAScore: teamScores.A, teamBScore: teamScores.B };
}

// ─── SCHEDULE MODAL ──────────────────────────────────────────────────────────
function ScheduleDebateModal({ config, onSchedule, onClose }: any) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    try {
      const ev = { id:`db-${Date.now()}`,title:config?.topic||"Debate",type:"debate",date,startTime:time,subject:config?.subject||"",unit:config?.unit||"" };
      const ex = JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");
      localStorage.setItem("gradeup_cal_events_v3", JSON.stringify([...ex, ev]));
      window.dispatchEvent(new StorageEvent("storage", { key:"gradeup_cal_events_v3" }));
    } catch {}
    setSaving(false);
    onSchedule({ date, time });
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth:400 }}>
        <div className="mh">
          <span className="mh-title">📅 Schedule Debate</span>
          <button className="mh-close" onClick={onClose}>✕</button>
        </div>
        <div className="mb">
          <div style={{ padding:"10px 12px",borderRadius:11,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.18)",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:18 }}>📅</span>
            <div>
              <div style={{ fontSize:11.5,fontWeight:800,color:"var(--em)" }}>Auto-synced to Calendar</div>
              <div style={{ fontSize:10.5,color:"var(--t2)" }}>Event saved automatically after scheduling</div>
            </div>
          </div>
          {config?.topic && (
            <div style={{ padding:"9px 12px",borderRadius:10,background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.18)",marginBottom:14,fontSize:12.5,fontWeight:700,color:"var(--t1)" }}>
              ⚔️ "{config.topic}"
            </div>
          )}
          <div className="fi-row fi">
            <div><label className="fl">Date *</label><input className="finput" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><label className="fl">Time</label><input className="finput" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          </div>
        </div>
        <div className="mf">
          <button className="btn-s" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-p" style={{ width:"auto",padding:"9px 22px" }} onClick={handleSave} disabled={!date || saving}>
            {saving ? <><span className="loader-spin" />Scheduling…</> : "📅 Schedule & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SETUP ───────────────────────────────────────────────────────────────────
function DebateSetup({ onBack, onLaunch }: { onBack?: () => void; onLaunch: (cfg: any) => void }) {
  const { user } = useAuth();
  const [name, setName]           = useState(user ? `${user.firstName} ${user.lastName}` : "");
  const [subMode, setSubMode]     = useState<"ai"|"multi"|"">("");
  const [debateType, setDebateType] = useState<"instant"|"schedule"|"">("");
  const [subjectCatalog, setSubjectCatalog] = useState<LibrarySubject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subject, setSubject]     = useState("");
  const [unit, setUnit]           = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [topicOptions, setTopicOptions] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topic, setTopic]         = useState("");
  const [custom, setCustom]       = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [micOn, setMicOn]         = useState(true);
  const [debateMinutes, setDebateMinutes] = useState("5");
  const [showSchedule, setShowSchedule]   = useState(false);
  const [scheduled, setScheduled]         = useState(false);
  const [scheduledInfo, setScheduledInfo] = useState<any>(null);
  const [copied, setCopied]       = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [joining, setJoining]     = useState(false);
  const [joinProgress, setJoinProgress]   = useState(0);
  const [joinLinkSessionId, setJoinLinkSessionId] = useState("");
  const joinRoomFromLinkRef = useRef<string>("");
  const roomId   = useRef(genRoomId());
  const roomLink = genRoomLink(roomId.current);
  const { state: perm, stream, request, stop } = useMicPerm();
  const { show: toast$, node: toastNode } = useToast();
  const isJoinLinkMode = Boolean(joinLinkSessionId);
  const selectedTopicOption = topicOptions.find((item) => item.id === topic);
  const finalTopic     = topic === "__custom__" ? custom : selectedTopicOption?.label || "";
  const selectedSubjectLabel = subjectCatalog.find((item) => item.subjectGroupKey === subject)?.title || subject;
  const availableUnits = subject
    ? subjectCatalog.find((item) => item.subjectGroupKey === subject)?.units || []
    : [];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedSessionId = params.get("sessionId") || params.get("session") || params.get("room") || "";
    const linkedTopic = params.get("topic") || "";
    if (!linkedSessionId) return;
    joinRoomFromLinkRef.current = linkedSessionId;
    setJoinLinkSessionId(linkedSessionId);
    setSubMode("multi");
    setDebateType("instant");
    if (linkedTopic && !custom) {
      setCustom(linkedTopic);
      setTopic("__custom__");
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadSubjects() {
      setSubjectsLoading(true);
      try {
        const data = await getLibrarySubjects();
        if (!ignore) {
          setSubjectCatalog(data);
        }
      } catch (error) {
        if (!ignore) {
          setSubjectCatalog([]);
          toast$("Unable to load subjects for debate.", "warn");
        }
      } finally {
        if (!ignore) {
          setSubjectsLoading(false);
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
        setTopicsLoading(false);
        return;
      }
      setTopicsLoading(true);
      try {
        const topics = await getDebateTopics(subject);
        if (!ignore) {
          const liveTopics = (topics || [])
            .filter((item: any) => !selectedUnitId || item.unitId === selectedUnitId)
            .map((item: any, index: number) => ({
              id: String(item.id || `${item.unitId || "topic"}-${index}`),
              label: item.label || item.topic || item.title || item.name,
              unitId: item.unitId || "",
            }))
            .filter((item: any) => item.label);
          setTopicOptions(liveTopics);
        }
      } catch (error) {
        if (!ignore) {
          setTopicOptions([]);
          toast$("Unable to load debate topics from the server.", "warn");
        }
      } finally {
        if (!ignore) {
          setTopicsLoading(false);
        }
      }
    }

    loadTopics();
    return () => {
      ignore = true;
    };
  }, [subject, selectedUnitId]);

  const steps = [
    { label:"Enter your name",         done: name.trim().length > 0 },
    { label:"Allow microphone",        done: perm === "granted" },
    { label:"Select subject",          done: isJoinLinkMode || !!subject },
    { label:"Select unit",             done: isJoinLinkMode || !!unit },
    { label:"Select topic",            done: isJoinLinkMode || !!finalTopic },
    { label:"Choose debate type",      done: !!subMode },
    { label:"Instant or schedule",     done: !!debateType },
    { label:"Set debate timer",        done: !!debateMinutes },
  ];
  const canLaunch = steps.every(s => s.done);
  const copyLink = () => { navigator.clipboard.writeText(roomLink); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  const features = [
    { ico:"🤖", t:"AI Voice Opponent",  d:"Real-time voice rebuttals & live scoring" },
    { ico:"📊", t:"Analysis Reports",   d:"Full AI-generated feedback after each debate" },
    { ico:"📋", t:"4-Phase Structure",  d:"Opening → Cross-exam → Rebuttal → Closing" },
    { ico:"⏺",  t:"Session Recording", d:"Download your debate as video" },
  ];

  async function handleJoin() {
    setJoining(true);
    try {
      const ev = { id:`db-${Date.now()}`,title:finalTopic,type:"debate",date:new Date().toISOString().slice(0,10),startTime:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),subject:selectedSubjectLabel,unit };
      const ex = JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");
      localStorage.setItem("gradeup_cal_events_v3", JSON.stringify([...ex, ev]));
      window.dispatchEvent(new StorageEvent("storage", { key:"gradeup_cal_events_v3" }));
    } catch {}
    for (let p = 0; p <= 100; p += 20) { await new Promise(r => setTimeout(r, 180)); setJoinProgress(p); }
    let liveSession = null;
    if (subMode === "ai" && selectedUnitId) {
      try {
        const candidate = getCandidateContext(user || { firstName: name, lastName: "" });
        const candidateName = name.trim() || candidate.candidateName;
        liveSession = await startDebate({
          unitId: selectedUnitId,
          candidateId: candidate.candidateId,
          candidateName,
          topic: finalTopic,
          debateType: subMode === "multi" ? "team" : "1_vs_ai",
        });
      } catch (error: any) {
        toast$(error.message || "Unable to start live AI debate.", "error");
      }
      if (!liveSession) {
        setJoining(false);
        setShowConfirm(false);
        setJoinProgress(0);
        return;
      }
    }

    if (subMode === "multi" && (selectedUnitId || joinRoomFromLinkRef.current)) {
      try {
        const candidate = getCandidateContext(user || { firstName: name, lastName: "" });
        const candidateName = name.trim() || candidate.candidateName;
        if (joinRoomFromLinkRef.current) {
          liveSession = await joinDebateRoom({
            sessionId: joinRoomFromLinkRef.current,
            candidateId: candidate.candidateId,
            candidateName,
          });
        } else {
          liveSession = await createDebateRoom({
            unitId: selectedUnitId,
            candidateId: candidate.candidateId,
            candidateName,
            topic: finalTopic,
            roomLink,
          });
        }
      } catch (error: any) {
        toast$(error.message || "Unable to create the debate room right now.", "error");
      }
      if (!liveSession) {
        setJoining(false);
        setShowConfirm(false);
        setJoinProgress(0);
        return;
      }
    }

    setJoining(false); setShowConfirm(false); setJoinProgress(0);

    const launchedSessionId = liveSession?.session_id || liveSession?.sessionId || "";
    const launchedRoomLink = launchedSessionId ? genRoomLink(launchedSessionId) : roomLink;

    onLaunch({
      name, mode:"debate", subMode, subject:selectedSubjectLabel, unit,
      topic: finalTopic, stream, micOn, camOn: false,
      invitees: [], roomId: roomId.current, roomLink: launchedRoomLink,
      debateMinutes: Number(debateMinutes),
      unitId: selectedUnitId,
      sessionId: launchedSessionId,
      liveSession: liveSession?.liveSession || null,
      initialAiMessage: liveSession?.ai_greeting || liveSession?.opening_statement || liveSession?.message || "",
      isHost: !joinRoomFromLinkRef.current,
    });
  }

  return (
    <div className="dp-setup">
      {/* LEFT */}
      <div className="dp-setup-left">
        <div className="dp-orbs"><div className="dp-orb dp-orb1" /><div className="dp-orb dp-orb2" /></div>
        <div className="dp-grid" />
        <div className="dp-setup-left-inner">
          <div className="dp-logo">
            <div className="dp-logo-ico">⚔️</div>
            <span className="dp-logo-name">DebateArena</span>
          </div>
          <div className="dp-tag"><div className="dp-tag-dot" />Debate Setup</div>
          <h2 className="dp-h1">Launch your<br /><span className="gt">Debate Room.</span></h2>
          <p className="dp-p">
            {subMode === "ai"    ? "1-on-1 · AI voice opponent · Auto turn-based scoring" :
             subMode === "multi" ? "Multi-user · AI mediates · Group analysis report" :
             "AI-powered debate rooms with voice opponents, live scoring, and analysis."}
          </p>
          <div className="dp-feats-left">
            {features.map((f, i) => (
              <div key={f.t} className="dp-feat-left" style={{ animationDelay:`${0.12 + i * 0.07}s` }}>
                <div className="dp-feat-ico">{f.ico}</div>
                <div className="dp-feat-txt"><strong>{f.t}</strong><span>{f.d}</span></div>
              </div>
            ))}
          </div>
          {(subject || finalTopic) && (
            <div className="ctx-card">
              <div className="ctx-card-label">Session Context</div>
              {subject  && <div className="ctx-card-val">📚 {selectedSubjectLabel}{unit ? ` · ${unit}` : ""}</div>}
              {finalTopic && <div className="ctx-card-sub">{finalTopic.length > 45 ? finalTopic.slice(0,45)+"…" : finalTopic}</div>}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="dp-setup-right">
        <div className="dp-setup-scroll">
          <div className="dp-setup-inner">
            {onBack && <button className="setup-back" onClick={() => { stop(); onBack(); }}>← Back</button>}
            <h2 className="setup-title">⚔️ Debate Setup</h2>
            <p className="setup-sub">Complete all steps to launch your debate room.</p>

            <MicPreview
              perm={perm} name={name} onReq={request} micOn={micOn}
              onToggle={() => { const n = !micOn; setMicOn(n); stream?.getAudioTracks().forEach(t => t.enabled = n); }}
            />

            <div className="sec-div">Identity</div>
            <div className="fi">
              <label className="fl">Your Name</label>
              <input className="finput" placeholder="e.g. Alex Chen" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
            </div>

            <div className="sec-div">Academic Context</div>
            <div className="fi-row fi">
              <div>
                <label className="fl">Subject</label>
                <select className="finput" value={subject} onChange={e => { setSubject(e.target.value); setUnit(""); setSelectedUnitId(""); }}>
                  <option value="">{subjectsLoading ? "Loading subjects..." : "Select subject…"}</option>
                  {subjectCatalog.map(s => <option key={s.subjectGroupKey} value={s.subjectGroupKey}>{s.title}</option>)}
                </select>
              </div>
              <div>
                <label className="fl">Unit / Module</label>
                <select className="finput" value={unit} onChange={e => {
                  const chosen = availableUnits.find(item => (item.unitTitle || item.unitLabel) === e.target.value);
                  setUnit(e.target.value);
                  setSelectedUnitId(chosen?.id || "");
                  setTopic("");
                }} disabled={!subject || subjectsLoading}>
                  <option value="">{subjectsLoading ? "Loading subjects..." : subject ? "Select unit…" : "Select subject first"}</option>
                  {availableUnits.map(u => <option key={u.id} value={u.unitTitle || u.unitLabel}>{u.unitTitle || u.unitLabel}</option>)}
                </select>
              </div>
            </div>

            <div className="sec-div">Topic</div>
            <div className="fi">
              <label className="fl">Debate Topic</label>
              <select className="finput" value={topic} onChange={e => setTopic(e.target.value)} disabled={!subject || topicsLoading}>
                <option value="">{topicsLoading ? "Loading topics..." : "Select a topic…"}</option>
                {topicOptions.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                {!topicsLoading && !topicOptions.length && subject && <option value="" disabled>No debate topics available</option>}
                <option value="__custom__">✏️ Custom topic…</option>
              </select>
            </div>
            {topic === "__custom__" && (
              <div className="fi">
                <label className="fl">Custom Topic</label>
                <input className="finput" placeholder="Your debate topic…" value={custom} onChange={e => setCustom(e.target.value)} />
              </div>
            )}

            <div className="sec-div">Debate Mode</div>
            <div className="submode-grid fi">
              {[
                { id:"ai",    ico:"🤖", t:"1v1 vs AI",   d:"Face an AI voice opponent. Turn-based argumentation with live scoring.", badge:"Popular" },
                { id:"multi", ico:"👥", t:"Multi-User",  d:"Group debate with multiple participants. AI Mediator guides the discussion.", badge:"" },
              ].map(o => (
                <div key={o.id} className={`submode-card${subMode === o.id ? " sel" : ""}`} onClick={() => setSubMode(o.id as any)}>
                  <div className="submode-ico">{o.ico}</div>
                  <div>
                    <div className="submode-title">
                      {o.t} {o.badge && <span style={{ fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:20,background:"rgba(99,102,241,.15)",color:"var(--ind)",marginLeft:4 }}>{o.badge}</span>}
                    </div>
                    <div className="submode-desc">{o.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sec-div">Timing</div>
            <div className="dtype-grid fi">
              {[
                { id:"instant",  ico:"⚡", t:"Start Now", d:"Jump right in" },
                { id:"schedule", ico:"📅", t:"Schedule",  d:"Plan for later" },
              ].map(o => (
                <div key={o.id} className={`dtype-card${debateType === o.id ? " sel" : ""}`} onClick={() => setDebateType(o.id as any)}>
                  <div className="dtype-ico">{o.ico}</div>
                  <div><div className="dtype-title">{o.t}</div><div className="dtype-desc">{o.d}</div></div>
                </div>
              ))}
            </div>
            <div className="fi">
              <label className="fl">Debate Duration</label>
              <select className="finput" value={debateMinutes} onChange={e => setDebateMinutes(e.target.value)}>
                {[2,5,10,15,20].map(min => <option key={min} value={String(min)}>{min} minutes</option>)}
              </select>
            </div>
            {debateType === "schedule" && (
              <div style={{ padding:13,borderRadius:13,background:"rgba(99,102,241,.05)",border:"1.5px solid rgba(99,102,241,.18)",marginBottom:10 }}>
                {!scheduled ? (
                  <>
                    <div style={{ fontSize:12.5,fontWeight:700,color:"var(--t1)",marginBottom:6 }}>📅 Set date & time for your debate</div>
                    <div style={{ fontSize:11.5,color:"var(--t2)",marginBottom:10 }}>Event will be auto-saved to your calendar.</div>
                    <button className="btn-s" style={{ width:"100%",justifyContent:"center" as const }} onClick={() => setShowSchedule(true)}>📅 Open Schedule Form</button>
                  </>
                ) : (
                  <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                    <span style={{ fontSize:22 }}>✅</span>
                    <div>
                      <div style={{ fontSize:12,fontWeight:800,color:"var(--em)" }}>Debate Scheduled</div>
                      <div style={{ fontSize:11,color:"var(--t2)" }}>📅 {scheduledInfo?.date} at {scheduledInfo?.time} · Saved to Calendar</div>
                    </div>
                    <button className="btn-s" style={{ marginLeft:"auto",fontSize:11,padding:"5px 10px" }} onClick={() => { setScheduled(false); setShowSchedule(true); }}>Edit</button>
                  </div>
                )}
              </div>
            )}

            <div className="link-box">
              <div className="link-box-title">🔗 Room Link</div>
              <div className="link-row"><span className="link-val">{roomLink}</span><button className="copy-btn" onClick={copyLink}>{copied ? "✓ Copied!" : "Copy"}</button></div>
              <div className="share-actions">
                <button className="share-btn" onClick={() => setShowInvite(true)}>📧 Email</button>
                <button className="share-btn" onClick={() => { if (navigator.share) navigator.share({ title:"Join my debate", url:roomLink }); }}>↗ Share</button>
              </div>
            </div>

            <StepsComp steps={steps} />
            <button className="btn-p" onClick={() => setShowConfirm(true)} disabled={!canLaunch}>🚀 Launch Debate Room</button>
            <div style={{ height:24 }} />
          </div>
        </div>
      </div>

      {showSchedule && (
        <ScheduleDebateModal
          config={{ topic: finalTopic, subject, unit }}
          onSchedule={(info: any) => { setScheduledInfo(info); setScheduled(true); setShowSchedule(false); toast$("📅 Debate scheduled!","success"); }}
          onClose={() => setShowSchedule(false)}
        />
      )}

      {showConfirm && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth:400 }}>
            <div style={{ background:"linear-gradient(135deg,#0d1428,#1a2040)",padding:"28px 20px",textAlign:"center" as const }}>
              <div style={{ width:70,height:70,borderRadius:"50%",background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 12px" }}>⚔️</div>
              <div style={{ fontSize:16,fontWeight:800,color:"#fff",marginBottom:4 }}>{name}</div>
              <div style={{ fontSize:12,color:"rgba(255,255,255,.5)" }}>{subMode === "ai" ? "1v1 vs AI Debate" : "Multi-User Debate"}</div>
              {subject && <div style={{ fontSize:11,color:"rgba(255,255,255,.35)",marginTop:4 }}>📚 {subject}{unit ? ` · ${unit}` : ""}</div>}
            </div>
            <div className="mb">
              <div style={{ padding:"10px 12px",borderRadius:12,background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.18)",marginBottom:14 }}>
                <div style={{ fontSize:13,fontWeight:800,color:"var(--t1)",marginBottom:3 }}>"{finalTopic}"</div>
              </div>
              <button className={`perm-btn ${micOn ? "granted" : "denied"}`} style={{ width:"100%",justifyContent:"center" as const,fontSize:13,padding:"10px" }} onClick={() => setMicOn(m => !m)}>
                <span style={{ fontSize:18 }}>{micOn ? "🎤" : "🔇"}</span>{micOn ? "Microphone On" : "Microphone Off"}
              </button>
            </div>
            <div className="mf" style={{ flexDirection:"column" as const,gap:8 }}>
              <button className="btn-p" onClick={handleJoin} disabled={joining} style={{ fontSize:14 }}>
                {joining ? <><span className="loader-spin" />Joining {joinProgress > 0 ? `${joinProgress}%` : "…"}</> : "⚔️ Enter Debate Room"}
              </button>
              {joinProgress > 0 && <div className="lo-progress"><div className="lo-progress-fill" style={{ width:`${joinProgress}%` }} /></div>}
              <button className="btn-s" onClick={() => setShowConfirm(false)} disabled={joining} style={{ width:"100%",justifyContent:"center" as const }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showInvite && (
        <div className="overlay" onClick={() => !sendingInvite && setShowInvite(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">Email invite</div>
              <button className="mh-close" onClick={() => !sendingInvite && setShowInvite(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="fi">
                <label className="fl">Email addresses</label>
                <textarea
                  className="finput"
                  placeholder="Enter one or more emails, separated by commas"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" disabled={sendingInvite} onClick={() => setShowInvite(false)}>Cancel</button>
              <button
                className="btn-p"
                style={{ width: "auto", padding: "9px 18px" }}
                disabled={sendingInvite || !inviteEmails.trim()}
                onClick={async () => {
                  const emails = inviteEmails
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean);

                  if (!emails.length || emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
                    toast$("Enter valid email addresses.", "error");
                    return;
                  }

                  try {
                    setSendingInvite(true);
                    await inviteDebate({
                      emails,
                      senderName: name,
                      topic: finalTopic || "Debate Session",
                      debateType: subMode === "multi" ? "Team Debate" : "1 vs AI",
                      joinUrl: roomLink,
                    });
                    toast$("Invite email sent successfully.", "success");
                    setShowInvite(false);
                    setInviteEmails("");
                  } catch (error: any) {
                    toast$(error?.message || "Failed to send invite email.", "error");
                  } finally {
                    setSendingInvite(false);
                  }
                }}
              >
                {sendingInvite ? "Sending email..." : "Send invite"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

function buildTeamDebateResult(apiResult: any, liveSession: any, config: any, elapsedTimer: string, debateLimit: string) {
  const scoreEntries = Object.entries(apiResult?.scores || {}).map(([participantId, scoreData]: any) => ({
    participantId,
    name: scoreData?.candidate_name || "Participant",
    team:
      scoreData?.team === "blue_team" || scoreData?.team === "A"
        ? "A"
        : scoreData?.team === "red_team" || scoreData?.team === "B"
          ? "B"
          : undefined,
    debateScore: Number(scoreData?.total_score || 0),
    feedback: scoreData,
  }));

  const ranked = [...scoreEntries].sort((a, b) => (b.debateScore || 0) - (a.debateScore || 0));
  const winner = ranked[0] || null;
  const runnerUp = ranked[1] || null;
  const teamAScore = Number(apiResult?.team_scores?.blue_team || apiResult?.team_scores?.A || 0);
  const teamBScore = Number(apiResult?.team_scores?.red_team || apiResult?.team_scores?.B || 0);
  const winnerTeam = teamAScore === teamBScore ? undefined : teamAScore > teamBScore ? "A" : "B";

  return {
    timer: elapsedTimer,
    debateLimit,
    mode: "debate",
    subMode: "multi",
    topic: config.topic,
    subject: config.subject,
    unit: config.unit,
    participants: (liveSession?.participants || []).filter((participant: any) => !participant.isAi).length,
    scores: {
      overall: null,
    },
    hasRecording: false,
    participantsList: scoreEntries,
    transcript: liveSession?.turns || [],
    feedback: apiResult || null,
    meetingEnded: true,
    verdict: {
      ranked,
      winner,
      runnerUp,
      winnerTeam,
      teamAScore,
      teamBScore,
      insights: apiResult?.session_feedback ? [apiResult.session_feedback] : [],
    },
  };
}

function TeamDebateRoom({ config, onEnd }: { config: any; onEnd: (r: any) => void }) {
  const { user } = useAuth();
  const candidate = getCandidateContext(user || { firstName: config.name, lastName: "" });
  const candidateId = candidate.candidateId;
  const candidateName = candidate.candidateName;
  const { elapsedSeconds, label: elapsedTimer } = useTimer(true);
  const debateDurationSeconds = Math.max(60, Number(config.debateMinutes || 5) * 60);
  const remainingSeconds = Math.max(0, debateDurationSeconds - elapsedSeconds);
  const debateTimer = fmtClock(remainingSeconds);
  const { show: toast$, node: toastNode } = useToast();
  const [roomSnapshot, setRoomSnapshot] = useState<any>(config.liveSession ? { liveSession: config.liveSession } : null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [roomWarning, setRoomWarning] = useState<string | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [startingRoom, setStartingRoom] = useState(false);
  const [endingRoom, setEndingRoom] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [submittingTurn, setSubmittingTurn] = useState(false);
  const [speechRecording, setSpeechRecording] = useState(false);
  const [speechProcessing, setSpeechProcessing] = useState(false);
  const [copiedRoomLink, setCopiedRoomLink] = useState(false);
  const hasJoinedRef = useRef(Boolean(config.isHost));
  const initialRoomLoadedRef = useRef(false);
  const roomSyncInFlightRef = useRef(false);
  const toastRef = useRef(toast$);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    toastRef.current = toast$;
  }, [toast$]);

  const liveSession = roomSnapshot?.liveSession || config.liveSession || null;
  const participants = liveSession?.participants || [];
  const realRoomLink = config.roomLink || (config.sessionId ? genRoomLink(config.sessionId) : "");
  const currentParticipant = participants.find((participant: any) => String(participant.id) === String(candidate.candidateId));
  const isHost = Boolean(currentParticipant?.isHost || config.isHost);
  const teams = liveSession?.teams || { A: [], B: [] };
  const activeTeam = liveSession?.currentRound?.activeTeam || null;
  const currentSpeakerId = liveSession?.currentRound?.currentSpeakerId || null;
  const currentSpeaker = participants.find((participant: any) => String(participant.id) === String(currentSpeakerId)) || null;
  const canSpeak =
    liveSession?.status === "active" &&
    String(currentSpeakerId || "") === String(candidate.candidateId) &&
    !submittingTurn &&
    !speechProcessing &&
    !speechRecording &&
    !endingRoom;

  const syncRoom = useCallback(async (showWarn = false) => {
    if (!config.sessionId) return;
    if (roomSyncInFlightRef.current) return;
    roomSyncInFlightRef.current = true;
    if (!hasJoinedRef.current && !config.isHost) {
      await joinDebateRoom({
        sessionId: config.sessionId,
        candidateId,
        candidateName,
      });
      hasJoinedRef.current = true;
    }

    try {
      const snapshot = await getDebateRoom(config.sessionId);
      setRoomSnapshot(snapshot);
      setRoomError(null);
      if (snapshot?.pythonWarning) {
        setRoomWarning(snapshot.pythonWarning);
        if (showWarn) {
          toastRef.current(snapshot.pythonWarning, "warn");
        }
      }
    } catch (error: any) {
      setRoomError(error?.message || "Unable to load the debate room.");
      throw error;
    } finally {
      roomSyncInFlightRef.current = false;
    }
  }, [candidateId, candidateName, config.isHost, config.sessionId]);

  useEffect(() => {
    let ignore = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    async function load() {
      if (!initialRoomLoadedRef.current) {
        setLoadingRoom(true);
      }
      try {
        await syncRoom(true);
        if (!ignore) {
          initialRoomLoadedRef.current = true;
        }
      } catch (error: any) {
        if (!ignore) {
          setRoomError(error?.message || "Unable to load the debate room.");
        }
      } finally {
        if (!ignore) {
          setLoadingRoom(false);
        }
      }
    }

    load();
   pollId = setInterval(() => {
  syncRoom(false).catch(() => null);
}, 2000);

    return () => {
      ignore = true;
      if (pollId) clearInterval(pollId);
    };
  }, [syncRoom]);

  useEffect(() => {
    const onPopState = () => {
      setShowBackConfirm(true);
      window.history.pushState({ teamDebateRoom: true }, "", window.location.href);
    };
    window.history.pushState({ teamDebateRoom: true }, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (remainingSeconds <= 0 && !endingRoom && liveSession?.status !== "completed") {
      handleEndDebate(false);
    }
  }, [endingRoom, liveSession?.status, remainingSeconds]);

  async function startRoom() {
    setStartingRoom(true);
    try {
      const data = await startDebateRoom({
        sessionId: config.sessionId,
        candidateId,
        candidateName,
      });
      setRoomSnapshot({ liveSession: data?.liveSession || liveSession, ...data });
      setShowStartConfirm(false);
      toast$("Debate started successfully.", "success");
    } catch (error: any) {
      toast$(error?.message || "Unable to start the debate.", "error");
    } finally {
      setStartingRoom(false);
    }
  }
function copyRealRoomLink() {
  if (!realRoomLink) return;

  navigator.clipboard.writeText(realRoomLink);
  setCopiedRoomLink(true);

  setTimeout(() => {
    setCopiedRoomLink(false);
  }, 2000);
}
  async function submitTurn(message: string) {
    if (!message.trim()) return;
    setSubmittingTurn(true);
    try {
      const data = await submitDebateRoomTurn({
        sessionId: config.sessionId,
        candidateId: candidate.candidateId,
        candidateName: candidate.candidateName,
        team: currentParticipant?.team,
        message: message.trim(),
      });
      setMessageInput("");
      setRoomSnapshot({ liveSession: data?.liveSession || liveSession, ...data });
      if (data?.warnings?.length) {
        const latestWarning = data.warnings[data.warnings.length - 1]?.message;
        if (latestWarning) {
          setRoomWarning(latestWarning);
          toast$(latestWarning, "warn");
        }
      }
      if (data?.pythonWarning) {
        setRoomWarning(data.pythonWarning);
        toast$(data.pythonWarning, "warn");
      }
    } catch (error: any) {
      toast$(error?.message || "Unable to submit your team response.", "error");
    } finally {
      setSubmittingTurn(false);
    }
  }

  async function startSpeechCapture() {
    if (!canSpeak) return;
    const sourceStream = config.stream instanceof MediaStream ? config.stream : null;
    const audioTrack = sourceStream?.getAudioTracks?.()[0];
    if (!audioTrack) {
      toast$("Microphone is not available.", "error");
      return;
    }

    const recordingStream = new MediaStream([audioTrack]);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const recorder = new MediaRecorder(recordingStream, { mimeType });
    mediaChunksRef.current = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        mediaChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = async () => {
      setSpeechRecording(false);
      const blob = new Blob(mediaChunksRef.current, { type: mimeType });
      mediaChunksRef.current = [];
      if (!blob.size) {
        toast$("No speech was recorded.", "warn");
        return;
      }
      setSpeechProcessing(true);
      try {
        const transcription = await transcribeDebateAudio(blob);
        const text = transcription?.text?.trim();
        if (!text) {
          toast$("No transcript was detected. Please try again.", "warn");
          return;
        }
        await submitTurn(text);
      } catch (error: any) {
        toast$(error?.message || "Unable to transcribe your speech.", "error");
      } finally {
        setSpeechProcessing(false);
      }
    };

    recorder.start();
    setSpeechRecording(true);
  }

  function stopSpeechCapture() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function handleEndDebate(retry = false) {
    if (endingRoom || !config.sessionId) return;
    setEndingRoom(true);
    setEndError(null);
    try {
      const result = retry ? await retryEndDebateRoom(config.sessionId) : await endDebateRoom(config.sessionId);
      onEnd(buildTeamDebateResult(result, result?.liveSession || liveSession, config, elapsedTimer, fmtClock(debateDurationSeconds)));
    } catch (error: any) {
      const message = error?.message || "Unable to end the debate right now.";
      setEndError(message);
      toast$(message, "error");
    } finally {
      setEndingRoom(false);
    }
  }

  function handleBackAction() {
    if (isHost) {
      handleEndDebate(false);
      return;
    }
    onEnd({ aborted: true });
  }

  const participantCount = participants.filter((participant: any) => !participant.isAi).length;

  return (
    <div className="dp-room">
      <div className="room-bar">
        <button className="room-logo" type="button">
          <span className="room-logo-ico">⚔️</span>
          <span>DebateArena</span>
        </button>
        <button className="btn-s" style={{ width: "auto", padding: "6px 10px" }} onClick={() => setShowBackConfirm(true)}>Back</button>
        <div className="rbar-div" />
        <div className="rbar-topic">
          <strong>{config.topic}</strong> · {config.subject} · {config.unit}
        </div>
        <div className="rbar-pill" style={{ background: "rgba(99,102,241,.14)", color: "#c7d2fe" }}>
          {liveSession?.status === "waiting"
            ? "Waiting room"
            : liveSession?.status === "waiting_for_ai"
              ? "Waiting for AI"
              : liveSession?.status === "active"
                ? "Live debate"
                : liveSession?.status || "Connecting"}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 20, background: "linear-gradient(180deg,#081223 0%,#0f172a 100%)" }}>
        {loadingRoom ? (
          <div style={{ color: "#fff", display: "grid", placeItems: "center", minHeight: "60vh", gap: 12 }}>
            <div className="loader-spin" />
            <div style={{ fontWeight: 800 }}>Loading debate room...</div>
          </div>
        ) : roomError ? (
          <div style={{ maxWidth: 560, margin: "40px auto", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.24)", borderRadius: 20, padding: 24, color: "#fff" }}>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Unable to load debate room</div>
            <div style={{ color: "rgba(255,255,255,.7)", lineHeight: 1.7, marginBottom: 16 }}>{roomError}</div>
            <button className="btn-p" style={{ width: "auto" }} onClick={() => syncRoom(true).catch((error: any) => setRoomError(error?.message || "Unable to load the debate room."))}>
              Retry
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {liveSession?.status === "completed" && (
              <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.24)", borderRadius: 16, padding: 14, color: "#fecaca", fontSize: 13, fontWeight: 700 }}>
                This debate has ended. {isHost ? "Finalizing your room results." : "The host ended the meeting."}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <div className="room-info-card live">
                <div className="room-info-label">Participants</div>
                <div className="room-info-title">{participantCount} joined</div>
                <div className="room-info-sub">
                  {isHost ? "You are the host for this debate session." : "Waiting for the host to start the debate."}
                </div>
              </div>
              <div className="room-info-card game">
                <div className="room-info-label">Timer</div>
                <div className="room-info-title">{debateTimer} left</div>
                <div className="room-info-sub">Debate limit: {fmtClock(debateDurationSeconds)}</div>
              </div>
              <div className="room-info-card host">
                <div className="room-info-label">Current turn</div>
                <div className="room-info-title">
                  {currentSpeaker ? `${currentSpeaker.name} · Team ${currentSpeaker.team || "-"}` : liveSession?.status === "waiting" ? "Waiting for host" : "Preparing next speaker"}
                </div>
                <div className="room-info-sub">
                  {liveSession?.status === "waiting_for_ai"
                    ? "Waiting for AI response..."
                    : activeTeam
                      ? `Team ${activeTeam} is active`
                      : "AI opening or room setup in progress"}
                </div>
              </div>
            </div>

            {roomWarning && (
              <div style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.24)", borderRadius: 16, padding: 14, color: "#fde68a", fontSize: 13, fontWeight: 700 }}>
                {roomWarning}
              </div>
            )}

            {liveSession?.status === "waiting" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16 }}>
                <div style={{ background: "#0d1428", borderRadius: 22, border: "1px solid rgba(255,255,255,.08)", padding: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Waiting Room</div>
                  <div style={{ color: "rgba(255,255,255,.62)", lineHeight: 1.7, marginBottom: 18 }}>
                    {isHost
                      ? `Share the link and start when everyone is ready. ${participantCount} participant${participantCount === 1 ? "" : "s"} joined so far.`
                      : "Debate will start once the host starts. Please wait."}
                  </div>
                  {isHost && realRoomLink && (
  <div style={{
    borderRadius: 14,
    background: "rgba(99,102,241,.08)",
    border: "1px solid rgba(99,102,241,.22)",
    padding: 12,
    marginBottom: 16,
  }}>
    <div style={{
      fontSize: 10,
      fontWeight: 900,
      color: "#c7d2fe",
      textTransform: "uppercase",
      letterSpacing: ".08em",
      marginBottom: 8,
    }}>
      Invite Link
    </div>

    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,.06)",
      border: "1px solid rgba(255,255,255,.1)",
      borderRadius: 10,
      padding: "9px 10px",
    }}>
      <div style={{
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        color: "#c7d2fe",
        fontSize: 11,
        fontFamily: "monospace",
      }}>
        {realRoomLink}
      </div>

      <button
        className="copy-btn"
        type="button"
        onClick={copyRealRoomLink}
      >
        {copiedRoomLink ? "Copied" : "Copy"}
      </button>
    </div>

    <div style={{
      fontSize: 11,
      color: "rgba(255,255,255,.5)",
      lineHeight: 1.6,
      marginTop: 8,
    }}>
      Share this link with participants. They will wait here until you start the debate.
    </div>
  </div>
)}
                  <div className="host-popup-list" style={{ maxHeight: "none" }}>
                    {participants.length ? participants.map((participant: any) => (
                      <div key={participant.id} className="host-popup-item">
                        <div className="tile-av" style={{ width: 38, height: 38, fontSize: 14, background: "rgba(99,102,241,.18)", color: "#c7d2fe" }}>
                          {String(participant.name || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="host-popup-meta">
                          <div className="host-popup-name">{participant.name}</div>
                          <div className="host-popup-note">
                            {participant.isHost ? "Host" : participant.isAi ? "AI Participant" : "Waiting participant"}
                          </div>
                        </div>
                      </div>
                    )) : <div className="host-popup-note">No participants joined yet.</div>}
                  </div>
                </div>

                <div style={{ background: "#0d1428", borderRadius: 22, border: "1px solid rgba(255,255,255,.08)", padding: 20, display: "grid", alignContent: "start", gap: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>Host Controls</div>
                  <div style={{ color: "rgba(255,255,255,.62)", lineHeight: 1.7 }}>
                    {isHost
                      ? "Only the host can start the debate. Teams will be balanced automatically, and an AI participant will be added when the count is odd."
                      : "Only the host can start the debate. You will move into the live room automatically when it begins."}
                  </div>
                  {isHost ? (
                    <button className="btn-p" onClick={() => setShowStartConfirm(true)} disabled={startingRoom || participantCount < 2}>
                      {startingRoom ? "Starting debate..." : `Start Debate (${participantCount})`}
                    </button>
                  ) : (
                    <button className="btn-s" disabled>
                      Waiting for host to start
                    </button>
                  )}
                </div>
              </div>
            )}

            {liveSession?.status !== "waiting" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {(["A", "B"] as const).map((teamKey) => (
                  <div key={teamKey} style={{ background: "#0d1428", borderRadius: 22, border: `1px solid ${teamKey === "A" ? "rgba(99,102,241,.24)" : "rgba(236,72,153,.24)"}`, padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>Team {teamKey}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: activeTeam === teamKey ? "#fff" : "rgba(255,255,255,.5)" }}>
                        {activeTeam === teamKey ? "Active now" : "Waiting"}
                      </div>
                    </div>
                    <div className="host-popup-list" style={{ maxHeight: "none" }}>
                      {(teams?.[teamKey] || []).length ? (teams?.[teamKey] || []).map((participant: any) => (
                        <div key={participant.id} className="host-popup-item" style={{ border: String(currentSpeakerId) === String(participant.id) ? "1px solid rgba(16,185,129,.34)" : undefined }}>
                          <div className="tile-av" style={{ width: 36, height: 36, fontSize: 13, background: participant.isAi ? "rgba(139,92,246,.18)" : "rgba(255,255,255,.08)", color: "#fff" }}>
                            {participant.isAi ? "AI" : String(participant.name || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="host-popup-meta">
                            <div className="host-popup-name">{participant.name}</div>
                            <div className="host-popup-note">
                              {participant.isAi ? "AI Participant" : String(participant.id) === String(candidate.candidateId) ? "You" : `Speaker ${participant.teamOrder || "-"}`}
                            </div>
                          </div>
                        </div>
                      )) : <div className="host-popup-note">No team members assigned.</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {liveSession?.status !== "waiting" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
                <div style={{ background: "#0d1428", borderRadius: 22, border: "1px solid rgba(255,255,255,.08)", padding: 18, minHeight: 360 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>Debate Feed</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.56)" }}>
                      {liveSession?.status === "waiting_for_ai" ? "Waiting for AI response..." : currentSpeaker ? `${currentSpeaker.name} speaking` : "Live updates"}
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 10, maxHeight: 420, overflow: "auto", paddingRight: 4 }}>
                    {(liveSession?.turns || []).length ? (liveSession?.turns || []).map((turn: any) => (
                      <div key={turn.id} style={{ padding: 12, borderRadius: 14, background: turn.role === "moderator" ? "rgba(56,189,248,.08)" : "rgba(255,255,255,.05)", border: `1px solid ${turn.role === "moderator" ? "rgba(56,189,248,.18)" : "rgba(255,255,255,.08)"}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>
                            {turn.speakerName || "Unknown"}{turn.team ? ` · Team ${turn.team}` : ""}
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)" }}>
                            {turn.turnType === "opening" ? "Opening" : turn.turnType === "ai_response" ? "AI Response" : `Round ${turn.roundNumber || 1}`}
                          </div>
                        </div>
                        <div style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.7, fontSize: 13 }}>
                          {turn.message || turn.transcript || "No message recorded."}
                        </div>
                      </div>
                    )) : (
                      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>No debate turns recorded yet.</div>
                    )}
                  </div>
                </div>

                <div style={{ background: "#0d1428", borderRadius: 22, border: "1px solid rgba(255,255,255,.08)", padding: 18, display: "grid", gap: 14, alignContent: "start" }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>Your Controls</div>
                  <div style={{ color: "rgba(255,255,255,.62)", lineHeight: 1.7, fontSize: 13 }}>
                    {liveSession?.status === "waiting_for_ai"
                      ? "Waiting for AI response..."
                      : canSpeak
                        ? "It is your turn. You can speak or submit your point now."
                        : currentSpeaker
                          ? `${currentSpeaker.name} from Team ${currentSpeaker.team || "-"} is speaking now.`
                          : "Waiting for the next speaker."}
                  </div>
                  <textarea
                    className="finput"
                    style={{ minHeight: 140, resize: "vertical", background: "rgba(255,255,255,.04)", color: "#fff", borderColor: "rgba(255,255,255,.12)" }}
                    placeholder={canSpeak ? "Type your team response here..." : "You can respond when it is your turn."}
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    disabled={!canSpeak || submittingTurn || speechProcessing || endingRoom}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn-p" style={{ width: "auto" }} onClick={() => submitTurn(messageInput)} disabled={!canSpeak || submittingTurn || speechProcessing || endingRoom || !messageInput.trim()}>
                      {submittingTurn ? "Submitting..." : "Submit Turn"}
                    </button>
                    <button className="btn-s" onClick={speechRecording ? stopSpeechCapture : startSpeechCapture} disabled={!canSpeak || speechProcessing || submittingTurn || endingRoom}>
                      {speechProcessing ? "Transcribing..." : speechRecording ? "Stop Speak" : "Start Speak"}
                    </button>
                    {isHost && (
                      <button className="btn-d" onClick={() => handleEndDebate(Boolean(endError))} disabled={endingRoom}>
                        {endingRoom ? "Ending debate..." : endError ? "Retry End Debate" : "End Debate"}
                      </button>
                    )}
                  </div>
                  {endError && (
                    <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.24)", borderRadius: 14, padding: 12, color: "#fecaca", fontSize: 12.5, lineHeight: 1.6 }}>
                      {endError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showStartConfirm && (
        <div className="overlay" onClick={() => !startingRoom && setShowStartConfirm(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(event) => event.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">Start Debate</div>
              <button className="mh-close" onClick={() => !startingRoom && setShowStartConfirm(false)}>✕</button>
            </div>
            <div className="mb">
              <div style={{ fontSize: 14, color: "var(--t2)", lineHeight: 1.8 }}>
                Start debate with <strong>{participantCount}</strong> participant{participantCount === 1 ? "" : "s"}?
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" onClick={() => setShowStartConfirm(false)} disabled={startingRoom}>Cancel</button>
              <button className="btn-p" style={{ width: "auto" }} onClick={startRoom} disabled={startingRoom}>
                {startingRoom ? "Starting..." : "Confirm Start"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showBackConfirm && (
        <div className="overlay" onClick={() => setShowBackConfirm(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={(event) => event.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">Go Back?</div>
              <button className="mh-close" onClick={() => setShowBackConfirm(false)}>X</button>
            </div>
            <div className="mb" style={{ textAlign: "center" as const }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>←</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                Are you sure you want to go back?
              </div>
              <div style={{ fontSize: 12.5, color: "var(--t2)", lineHeight: 1.75 }}>
                {isHost ? "Your debate room will end for everyone." : "Your current room view will be closed."}
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" onClick={() => setShowBackConfirm(false)}>Cancel</button>
              <button className="btn-d" onClick={handleBackAction}>Proceed</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ─── ROOM ────────────────────────────────────────────────────────────────────
function DebateRoom({ config, onEnd }: { config: any; onEnd: (r: any) => void }) {
  const { user } = useAuth();
  const { subMode } = config;
  const isAI1v1 = subMode === "ai";
  const isMulti = subMode === "multi";

  // ── PARTICIPANTS ─────────────────────────────────────────────────────────
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const list: Participant[] = [];
    // Local user — stream passed directly (never serialized)
    const localStream = config.stream instanceof MediaStream ? config.stream : null;
    list.push({
      id: 0, name: config.name, stream: localStream,
      isLocal: true, isHost: true, isStudent: true,
      micMuted: isAI1v1 ? true : !config.micOn, camOn: false,
      isSpeaking: false, handRaised: false,
      isMyTurn: !isAI1v1,
      avatarColor: COLORS[0], energy: 88, reactionsReceived: 0, turnsTaken: 0,
    });
    if (isAI1v1) {
      list.push({ id:1, name:"AI Debater", stream:null, isAI:true, micMuted:false, camOn:false, isSpeaking:false, handRaised:false, avatarColor:"#8b5cf6" });
    }
    if (isMulti) {
      list.push({ id:99, name:"AI Moderator", stream:null, isAI:true, isMed:true, micMuted:false, camOn:false, isSpeaking:false, handRaised:false, avatarColor:"#38bdf8", energy:100, reactionsReceived:0, turnsTaken:0 });
    }
    return list;
  });

  // ── STATE ────────────────────────────────────────────────────────────────
  const [micOn, setMicOn]             = useState(config.micOn !== false);
  const [panelTab, setPanelTab]       = useState<string|null>(isMulti ? "people" : null);
  const [messages, setMessages]       = useState<any[]>([]);
  const [showEnd, setShowEnd]         = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showFeedbackDetail, setShowFeedbackDetail] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [chatExpanded, setChatExpanded]   = useState(false);
  const [scores, setScores]           = useState<{ you: number | null; ai: number | null }>({ you:null, ai:null });
  const [sessionFeedback, setSessionFeedback] = useState<any>(config.liveSession?.feedback || null);
  const [endingDebate, setEndingDebate] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [speechRecording, setSpeechRecording] = useState(false);
  const [speechProcessing, setSpeechProcessing] = useState(false);
  const [copiedRoomLink, setCopiedRoomLink] = useState(false);
  const [userHasSpoken, setUserHasSpoken] = useState(false);
  const [phaseIdx, setPhaseIdx]       = useState(0);
  const [whoTurn, setWhoTurn]         = useState<"you"|"ai">(isAI1v1 ? "ai" : "you");
  const [aiLocked, setAiLocked]       = useState(isAI1v1);
  const [nudge, setNudge]             = useState<string|null>(null);
  const [tileReacts, setTileReacts]   = useState<Record<number,any>>({});
  const [chatInput, setChatInput]     = useState("");
  const [transcript, setTranscript]   = useState<any[]>([]);
  const [waitingRoom, setWaitingRoom] = useState<Participant[]>([]);
  const [showHostPopup, setShowHostPopup] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<number|null>(null);
  const [turnHistory, setTurnHistory] = useState<string[]>([]);
  const [completedRound, setCompletedRound] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  // Voice speaking state for UI — driven by voiceEngine callbacks
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false);

  const chatEndRef       = useRef<HTMLDivElement>(null);
  const speechRecorderRef = useRef<MediaRecorder | null>(null);
  const speechChunksRef = useRef<Blob[]>([]);
  const speechAudioContextRef = useRef<AudioContext | null>(null);
  const speechAnalyserRef = useRef<AnalyserNode | null>(null);
  const speechSilenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userSpeechDetectedRef = useRef(false);
  const lastSpeechAtRef = useRef<number | null>(null);
  const nudgeTimerRef    = useRef<ReturnType<typeof setTimeout>|null>(null);
  const aiTimerRef       = useRef<ReturnType<typeof setTimeout>|null>(null);
  const autoAdvanceRef   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const initDoneRef      = useRef(false); // guard against double-init in dev StrictMode

  const { elapsedSeconds, label: elapsedTimer } = useTimer(true);
  const debateDurationSeconds = Math.max(60, Number(config.debateMinutes || 5) * 60);
  const remainingSeconds = Math.max(0, debateDurationSeconds - elapsedSeconds);
  const debateTimer = fmtClock(remainingSeconds);
  const recorder = useRecorder();

  const { show: toast$, node: toastNode } = useToast();
  const candidateContext = getCandidateContext(user || { firstName: config.name, lastName: "" });

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (endingDebate) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onPopState = () => {
      if (!endingDebate) {
        setShowBackConfirm(true);
        window.history.pushState({ debateRoom: true }, "", window.location.href);
      }
    };

    window.history.pushState({ debateRoom: true }, "", window.location.href);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [endingDebate]);

  useEffect(() => {
    if (!config.liveSession?.participants?.length) return;
    const turnCounts = buildTurnCountMap(config.liveSession);
    setParticipants((current) => {
      const seeded = current.filter((participant) => participant.isLocal || participant.isAI || participant.isMed);
      const liveParticipants = config.liveSession.participants
        .filter((participant: any) => participant.name && participant.name !== config.name)
        .map((participant: any, index: number) => ({
          id: Number(participant.id) || index + 10,
          name: participant.name,
          stream: null,
          isLocal: false,
          isHost: false,
          isStudent: true,
          micMuted: true,
          camOn: false,
          isSpeaking: false,
          handRaised: false,
          avatarColor: COLORS[(index + 2) % COLORS.length],
          energy: 80,
          reactionsReceived: 0,
          turnsTaken:
            turnCounts.get(`id:${Number(participant.id) || index + 10}`) ||
            turnCounts.get(`name:${String(participant.name || "").trim().toLowerCase()}`) ||
            0,
          team: normalizeTeam(participant.team || participant.teamName || participant.group),
          teamOrder: participant.teamOrder,
          hasSpoken: Boolean(participant.hasSpoken),
        }));
      return [...seeded, ...liveParticipants];
    });
  }, [config.liveSession, config.name]);

  useEffect(() => {
    let ignore = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const applyLiveParticipants = (liveSession: any) => {
      if (!liveSession) return;
      const turnCounts = buildTurnCountMap(liveSession);
      setParticipants((current) => {
        const seeded = current.filter((participant) => participant.isLocal || participant.isAI || participant.isMed);
        const liveParticipants = (liveSession.participants || [])
          .filter((participant: any) => participant.name && participant.name !== config.name)
          .map((participant: any, index: number) => ({
            id: Number(participant.id) || index + 10,
            name: participant.name,
            stream: null,
            isLocal: false,
            isHost: false,
            isStudent: true,
            micMuted: true,
            camOn: false,
            isSpeaking: false,
            handRaised: false,
            avatarColor: COLORS[(index + 2) % COLORS.length],
            energy: 80,
            reactionsReceived: 0,
            turnsTaken:
              turnCounts.get(`id:${Number(participant.id) || index + 10}`) ||
              turnCounts.get(`name:${String(participant.name || "").trim().toLowerCase()}`) ||
              0,
            team: normalizeTeam(participant.team || participant.teamName || participant.group),
            teamOrder: participant.teamOrder,
            hasSpoken: Boolean(participant.hasSpoken),
          }));
        return [...seeded, ...liveParticipants];
      });
    };

    async function syncSession(showErrorToast = true) {
      if (!config.sessionId) return;
      try {
        if (isMulti) {
          const joinData = await joinDebateSession({
            sessionId: config.sessionId,
            candidateId: candidateContext.candidateId,
            candidateName: candidateContext.candidateName,
          });
          if (!ignore) {
            applyLiveParticipants(joinData?.liveSession);
          }
        }

        const session = await getDebateSession(config.sessionId);
        if (!ignore) {
          applyLiveParticipants(session?.liveSession);
        }
      } catch (error) {
        if (!ignore && showErrorToast) {
          toast$("Unable to refresh debate participants.", "warn");
        }
      }
    }

    syncSession(true);
    if (isMulti && config.sessionId) {
      pollId = setInterval(() => {
        syncSession(false);
      }, 8000);
    }

    return () => {
      ignore = true;
      if (pollId) clearInterval(pollId);
    };
  }, [candidateContext.candidateId, candidateContext.candidateName, config.name, config.sessionId, isMulti]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  // ── HELPERS ──────────────────────────────────────────────────────────────
  const updateP = useCallback((id: number, patch: Partial<Participant>) =>
    setParticipants(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p)), []);

  // Safe: only touch real MediaStream tracks
  const syncLocalMic = useCallback((enabled: boolean) => {
    const localStream = config.stream;
    if (localStream instanceof MediaStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = enabled; });
    }
    setMicOn(enabled);
    updateP(0, { micMuted: !enabled, isSpeaking: false });
  }, [config.stream, updateP]);

  const restoreUserTurnAfterSpeechError = useCallback((message: string, type: "warn" | "error" = "error") => {
    setSpeechRecording(false);
    setSpeechProcessing(false);
    setUserHasSpoken(false);
    setAiLocked(false);
    setWhoTurn("you");
    setAiIsSpeaking(false);
    updateP(0, { isMyTurn: true, isSpeaking: false, micMuted: false });
    updateP(1, { isAITyping: false, isSpeaking: false });
    syncLocalMic(true);
    toast$(message, type);
  }, [syncLocalMic, updateP]);

  function restoreAfterEndFailure(message: string) {
    setEndingDebate(false);
    setEndError(message);
    setSpeechRecording(false);
    setSpeechProcessing(false);
    setUserHasSpoken(false);
    setAiIsSpeaking(false);
    setAiLocked(false);
    updateP(0, { isSpeaking: false, isMyTurn: isAI1v1, micMuted: !micOn });
    updateP(1, { isSpeaking: false, isAITyping: false });
    updateP(99, { isSpeaking: false });
    if (isAI1v1) {
      setWhoTurn("you");
      syncLocalMic(micOn);
    }
    toast$(message, "error");
  }

  const cleanupSpeechDetection = useCallback(() => {
    if (speechSilenceIntervalRef.current) {
      clearInterval(speechSilenceIntervalRef.current);
      speechSilenceIntervalRef.current = null;
    }
    speechAnalyserRef.current = null;
    if (speechAudioContextRef.current) {
      speechAudioContextRef.current.close().catch(() => {});
      speechAudioContextRef.current = null;
    }
    userSpeechDetectedRef.current = false;
    lastSpeechAtRef.current = null;
  }, []);

  function addMsg(sender: string, senderId: number, text: string) {
    const e = { sender, senderId, text, time: Date.now() };
    setMessages(ms => [...ms, e]);
    setTranscript(t => [...t, e]);
  }

  async function startSpeechCapture() {
    if (speechRecording || speechProcessing || aiLocked || whoTurn !== "you" || endingDebate) {
      return;
    }
    const localStream = config.stream instanceof MediaStream ? config.stream : null;
    const audioTrack = localStream?.getAudioTracks?.()[0];
    if (!audioTrack) {
      toast$("Microphone is not available.", "error");
      return;
    }

    const recordingStream = new MediaStream([audioTrack]);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const recorder = new MediaRecorder(recordingStream, { mimeType });
    speechChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        speechChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = async () => {
      cleanupSpeechDetection();
      const audioBlob = new Blob(speechChunksRef.current, { type: mimeType });
      speechChunksRef.current = [];
      setSpeechRecording(false);
      updateP(0, { isSpeaking: false });
      setSpeechProcessing(true);

      try {
        const result = await transcribeDebateAudio(audioBlob);
        const transcriptText = result?.text?.trim();
        if (!transcriptText) {
          restoreUserTurnAfterSpeechError("No speech detected. Try again.", "warn");
          return;
        }

        setWhoTurn("ai");
        updateP(0, { isMyTurn: false, isSpeaking: false });
        syncLocalMic(false);
        await sendMsg(transcriptText);
      } catch (error: any) {
        restoreUserTurnAfterSpeechError(error?.message || "Unable to transcribe speech.", "error");
      } finally {
        setSpeechProcessing(false);
      }
    };
    recorder.start();
    speechRecorderRef.current = recorder;
    setUserHasSpoken(false);
    cleanupSpeechDetection();
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      const source = audioContext.createMediaStreamSource(recordingStream);
      source.connect(analyser);
      speechAudioContextRef.current = audioContext;
      speechAnalyserRef.current = analyser;
      userSpeechDetectedRef.current = false;
      lastSpeechAtRef.current = Date.now();

      const samples = new Uint8Array(analyser.fftSize);
      speechSilenceIntervalRef.current = setInterval(() => {
        if (!speechAnalyserRef.current) return;
        speechAnalyserRef.current.getByteTimeDomainData(samples);
        let peak = 0;
        for (let index = 0; index < samples.length; index += 1) {
          const amplitude = Math.abs(samples[index] - 128);
          if (amplitude > peak) peak = amplitude;
        }

        const detectedSpeech = peak > 8;
        if (detectedSpeech) {
          userSpeechDetectedRef.current = true;
          lastSpeechAtRef.current = Date.now();
          setUserHasSpoken(true);
          updateP(0, { isSpeaking: true });
          return;
        }

        updateP(0, { isSpeaking: false });

        if (!userSpeechDetectedRef.current || !lastSpeechAtRef.current) {
          return;
        }

        if (Date.now() - lastSpeechAtRef.current >= 20000) {
          toast$("Silence detected. Sending your response to the AI.", "info");
          stopSpeechCapture();
        }
      }, 500);
    } catch (error) {
      cleanupSpeechDetection();
    }
    setSpeechRecording(true);
    updateP(0, { isSpeaking: false, isMyTurn: true, micMuted: false });
    toast$("Listening... I'll send your response after 20 seconds of silence.", "info");
  }

  function stopSpeechCapture() {
    setSpeechRecording(false);
    updateP(0, { isSpeaking: false });
    cleanupSpeechDetection();
    speechRecorderRef.current?.stop();
    speechRecorderRef.current = null;
  }

  const emitTileReaction = useCallback((targetId: number, emoji: string) => {
    const k = Date.now() + Math.random();
    setTileReacts(tr => ({ ...tr, [targetId]: { emoji, key: k } }));
    setParticipants(ps => ps.map(p => p.id === targetId ? { ...p, reactionsReceived:(p.reactionsReceived||0)+1 } : p));
    setTimeout(() => setTileReacts(tr => { const next = { ...tr }; delete next[targetId]; return next; }), 1900);
  }, []);

  // ── SPEAK HELPERS (use singleton engine, unique IDs to prevent doubling) ──
  // Each call gets a unique ID so the engine can deduplicate if called twice
  const speakModerator = useCallback((text: string, onDone?: () => void) => {
    const id = `mod-${Date.now()}`;
    updateP(99, { isSpeaking: false });
    setAiIsSpeaking(false);
    synthesizeDebateSpeech({ text, voice: "alloy" })
      .then((audio) => {
        if (audio?.dataUrl) {
          playAudioDataUrl(audio.dataUrl, () => {
            updateP(99, { isSpeaking: true });
            setAiIsSpeaking(true);
          }, () => {
            updateP(99, { isSpeaking: false });
            setAiIsSpeaking(false);
            onDone?.();
          });
          return;
        }

        voiceEngine.speak(
          text, id,
          { pitch: 1.1, rate: 0.88 },
          () => { updateP(99, { isSpeaking: true }); setAiIsSpeaking(true); },
          () => { updateP(99, { isSpeaking: false }); setAiIsSpeaking(false); onDone?.(); },
        );
      })
      .catch(() => {
        voiceEngine.speak(
          text, id,
          { pitch: 1.1, rate: 0.88 },
          () => { updateP(99, { isSpeaking: true }); setAiIsSpeaking(true); },
          () => { updateP(99, { isSpeaking: false }); setAiIsSpeaking(false); onDone?.(); },
        );
      });
  }, [updateP]);

  const speakDebater = useCallback((text: string, onDone?: () => void) => {
    const id = `deb-${Date.now()}`;
    updateP(1, { isSpeaking: false, isAITyping: true });
    setAiIsSpeaking(false);
    synthesizeDebateSpeech({ text, voice: "alloy" })
      .then((audio) => {
        if (audio?.dataUrl) {
          playAudioDataUrl(audio.dataUrl, () => {
            updateP(1, { isSpeaking: true, isAITyping: false });
            setAiIsSpeaking(true);
          }, () => {
            updateP(1, { isSpeaking: false, isAITyping: false });
            setAiIsSpeaking(false);
            onDone?.();
          });
          return;
        }

        voiceEngine.speak(
          text, id,
          { pitch: 0.95, rate: 0.94 },
          () => { updateP(1, { isSpeaking: true, isAITyping: false }); setAiIsSpeaking(true); },
          () => { updateP(1, { isSpeaking: false, isAITyping: false }); setAiIsSpeaking(false); onDone?.(); },
        );
      })
      .catch(() => {
        voiceEngine.speak(
          text, id,
          { pitch: 0.95, rate: 0.94 },
          () => { updateP(1, { isSpeaking: true, isAITyping: false }); setAiIsSpeaking(true); },
          () => { updateP(1, { isSpeaking: false, isAITyping: false }); setAiIsSpeaking(false); onDone?.(); },
        );
      });
  }, [updateP]);

  // Stable refs so callbacks inside effects don't get stale closures
  const speakModRef     = useRef(speakModerator);
  const speakDebaterRef = useRef(speakDebater);
  const syncMicRef      = useRef(syncLocalMic);
  useEffect(() => { speakModRef.current     = speakModerator;  }, [speakModerator]);
  useEffect(() => { speakDebaterRef.current = speakDebater;    }, [speakDebater]);
  useEffect(() => { syncMicRef.current      = syncLocalMic;    }, [syncLocalMic]);

  // ── TIME EXPIRED ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (remainingSeconds > 0 || timeExpired) return;
    setTimeExpired(true);
    if (autoAdvanceRef.current)   clearTimeout(autoAdvanceRef.current);
    setActiveSpeakerId(null);
    syncMicRef.current(false);
    setShowEnd(true);
    speakModRef.current("Debate time is over. Please review and end the session.");
  }, [remainingSeconds, timeExpired]);

  // ── PICK NEXT SPEAKER (multi-user) ────────────────────────────────────────
  // Flow: mute everyone → AI announces → AI callback → open speaker's mic
  const pickNextSpeaker = useCallback((reason = "random") => {
    if (!isMulti || timeExpired) return;

    // Clear any pending auto-advance
    if (autoAdvanceRef.current)   clearTimeout(autoAdvanceRef.current);

    const candidates = participants.filter(p => !p.isAI && !p.isMed);
    if (!candidates.length) return;

    // If everyone has spoken at least once, end the round
    if (candidates.every(p => (p.turnsTaken || 0) >= 1)) {
      if (!completedRound) {
        setCompletedRound(true);
        setShowEnd(true);
        addMsg("AI Moderator", 99, "All speaking turns are complete. Great debate everyone!");
      }
      return;
    }

    // Prefer the lowest turn count first, then a stable alphabetical order.
    const pool = candidates.filter(p => p.id !== activeSpeakerId);
    const rankedPool = (pool.length ? pool : candidates).slice().sort((left, right) => {
      const leftTurns = left.turnsTaken || 0;
      const rightTurns = right.turnsTaken || 0;
      if (leftTurns !== rightTurns) {
        return leftTurns - rightTurns;
      }
      return String(left.name || "").localeCompare(String(right.name || ""));
    });
    const chosen = rankedPool[0];
    if (!chosen) return;

    const isLocalSpeaker = chosen.id === 0;

    setActiveSpeakerId(chosen.id);
    setTurnHistory(h => [`${chosen.name} · ${reason}`, ...h].slice(0, 8));

    // Step 1: Mute EVERYONE (including local) while AI announces
    syncMicRef.current(false);
    setParticipants(ps => ps.map(p => ({
      ...p,
      isMyTurn:    p.id === chosen.id,
      isSpeaking:  false,
      micMuted:    true,         // all muted until AI finishes speaking
      handRaised:  p.id === chosen.id ? false : p.handRaised,
      turnsTaken:  p.id === chosen.id ? (p.turnsTaken || 0) + 1 : (p.turnsTaken || 0),
      energy:      p.id === chosen.id
        ? Math.max(10, (p.energy ?? 70) - 8)
        : Math.min(100, (p.energy ?? 70) + 3),
    })));

    const announcement = `${chosen.name}, you have the floor. Please begin your argument.`;
    addMsg("AI Moderator", 99, announcement);

    // Step 2: AI speaks. Only AFTER the voice callback fires do we open the mic.
    speakModRef.current(announcement, () => {
      // Step 3: AI done — now unmute the chosen speaker
      if (isLocalSpeaker) {
        syncMicRef.current(true);   // open local mic track
      }
      setParticipants(ps => ps.map(p => ({
        ...p,
        micMuted:   p.id !== chosen.id,   // only chosen speaker unmuted
        isSpeaking: p.id === chosen.id,
      })));

      // Step 4: Keep the room moving for non-local speakers without inventing debate content
      if (!isLocalSpeaker) {
        addMsg("AI Moderator", 99, `${chosen.name} has the floor.`);
        autoAdvanceRef.current = setTimeout(() => {
          setParticipants(ps => ps.map(p => ({
            ...p,
            micMuted:   true,
            isSpeaking: false,
            isMyTurn:   false,
          })));
          pickNextSpeaker("auto-next");
        }, (14 + Math.floor(Math.random() * 8)) * 1000);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpeakerId, completedRound, isMulti, participants, timeExpired]);

  const pickNextRef = useRef(pickNextSpeaker);
  useEffect(() => { pickNextRef.current = pickNextSpeaker; }, [pickNextSpeaker]);

  // ── INIT (runs once) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    if (isAI1v1) {
      syncMicRef.current(false);
      updateP(0, { isMyTurn: false, micMuted: true, isSpeaking: false });
      const greeting =
        config.initialAiMessage ||
        `Welcome ${config.name}. I will argue the opposing position on: ${config.topic}. You have the floor first. Make your opening statement.`;
      setTimeout(() => {
        addMsg("AI Debater", 1, greeting);
        updateP(1, { isAITyping: true });
        speakDebaterRef.current(greeting, () => {
          updateP(1, { isAITyping: false });
          setWhoTurn("you");
          updateP(0, { isMyTurn: true });
          setAiLocked(false);
          // Open local mic after AI greeting finishes
          syncMicRef.current(true);
          startNudge();
        });
      }, 800);
    }

    if (isMulti) {
      const intro = `Welcome everyone to the debate on: ${config.topic}. I am your AI Moderator. I will call on each speaker by name. When I finish announcing your name, your microphone will open automatically. To pass your turn, simply mute yourself. Let us begin.`;
      setTimeout(() => {
        addMsg("AI Moderator", 99, intro);
        // Speak intro, then chain into first speaker pick
        speakModRef.current(intro, () => {
          pickNextRef.current("opening");
        });
      }, 800);
    }

    return () => {
      voiceEngine.cancel();
      cleanupSpeechDetection();
      if (aiTimerRef.current)        clearTimeout(aiTimerRef.current);
      if (nudgeTimerRef.current)     clearTimeout(nudgeTimerRef.current);
      if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAI1v1 || whoTurn !== "you" || aiLocked || speechRecording || speechProcessing || endingDebate || !micOn) {
      return;
    }

    const timer = setTimeout(() => {
      startSpeechCapture();
    }, 250);

    return () => clearTimeout(timer);
  }, [isAI1v1, whoTurn, aiLocked, speechRecording, speechProcessing, endingDebate, micOn]);

  // ── NUDGE (1v1 only) ──────────────────────────────────────────────────────
  function startNudge() {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => {
      setNudge("💬 Your turn to argue!");
      setTimeout(() => setNudge(null), 5000);
    }, 10000);
  }
  function clearNudge() {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    setNudge(null);
  }

  // ── AI DEBATER RESPONSE (1v1) ─────────────────────────────────────────────
  const triggerAI = useCallback(() => {
    if (!config.sessionId) {
      restoreUserTurnAfterSpeechError("AI debate session is unavailable right now.", "error");
      return;
    }
    if (aiLocked) return;
    setAiLocked(true);
    clearNudge();
    setWhoTurn("ai");
    updateP(0, { isMyTurn: false });
    updateP(1, { isAITyping: true, isSpeaking: false });

    // Mute local mic while AI speaks
    syncMicRef.current(false);

    aiTimerRef.current = setTimeout(() => {
      restoreUserTurnAfterSpeechError("AI debate session is unavailable right now.", "error");
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiLocked, config.sessionId, restoreUserTurnAfterSpeechError, updateP]);

  // ── MIC TOGGLE ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    // ── 1v1 ──────────────────────────────────────────────────────────────
    if (isAI1v1) {
      if (whoTurn !== "you") {
        toast$("Wait for the AI to finish speaking.", "warn");
        return;
      }
      if (aiLocked || speechProcessing) {
        toast$("AI is responding. You can speak after the AI response.", "warn");
        return;
      }
      if (!speechRecording) {
        syncLocalMic(true);
        startSpeechCapture();
        return;
      }
      syncLocalMic(false);
      stopSpeechCapture();
      // Muting = done speaking → trigger AI response
      return;
    }

    // ── Multi ─────────────────────────────────────────────────────────────
    if (!isMulti) return;

    if (aiIsSpeaking) {
      toast$("Wait for the AI Moderator to finish.", "warn");
      return;
    }
    if (activeSpeakerId !== 0) {
      toast$("Only the current speaker can pass the turn.", "warn");
      return;
    }
    if (!micOn) {
      // Already muted — shouldn't normally be reachable
      return;
    }

    // Muting = passing the turn
    syncLocalMic(false);
    setParticipants(ps => ps.map(p => ({
      ...p,
      micMuted:   true,
      isSpeaking: false,
      isMyTurn:   false,
    })));
    if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);

    addMsg("AI Moderator", 99, `${config.name} passed the turn.`);
    // Small pause, then pick next
    setTimeout(() => pickNextRef.current("manual-pass"), 600);
  };

  const toggleHand = () => {
    const me = participants.find(p => p.isLocal);
    updateP(0, { handRaised: !me?.handRaised });
    if (!me?.handRaised) toast$("✋ Hand raised!", "warn");
  };

  async function sendMsg(text: string) {
    if (!text.trim()) return;
    addMsg(config.name, 0, text.trim());
    setChatInput("");
    updateP(0, { isSpeaking: true });
    setTimeout(() => updateP(0, { isSpeaking: false }), 1200);

    if (isAI1v1) {
      clearNudge();
      if (config.sessionId) {
        try {
          setAiLocked(true);
          setWhoTurn("ai");
          setAiIsSpeaking(false);
          updateP(1, { isAITyping: true, isSpeaking: false });
          updateP(0, { isMyTurn: false, isSpeaking: false });
          syncMicRef.current(false);
          const response = await respondDebate({
            sessionId: config.sessionId,
            message: text.trim(),
          });
          const replyText =
            response?.ai_response ||
            response?.response ||
            response?.reply ||
            response?.message ||
            response?.answer;
          if (!replyText) {
            throw new Error("AI response was empty.");
          }
          addMsg("AI Debater", 1, replyText);
          speakDebaterRef.current(replyText, () => {
            setWhoTurn("you");
            updateP(0, { isMyTurn: true });
            setAiLocked(false);
            syncMicRef.current(true);
            startNudge();
          });
          return;
        } catch (error) {
          restoreUserTurnAfterSpeechError("Unable to fetch the AI response right now.", "error");
          return;
        }
      }

      if (whoTurn === "you" && !aiLocked) setTimeout(() => triggerAI(), 400);
    }
  }

  function sendReaction(emoji: string) {
    setShowReactions(false);
    const targetId = isMulti ? (activeSpeakerId ?? 0) : 0;
    emitTileReaction(targetId, emoji);
  }

  // ── ADMIT ─────────────────────────────────────────────────────────────────
  function admitParticipant(id: number) {
    const target = waitingRoom.find(p => p.id === id);
    if (!target) return;
    setWaitingRoom(w => w.filter(p => p.id !== id));
    setParticipants(ps => [...ps, { ...target, id: Math.max(...ps.map(p => p.id)) + 1 }]);
    setShowHostPopup(false);
    addMsg("AI Moderator", 99, `${target.name} was admitted to the room.`);
  }
  function admitAll() { waitingRoom.forEach(p => admitParticipant(p.id)); setShowHostPopup(false); }

  // ── END ───────────────────────────────────────────────────────────────────
  async function handleEnd() {
    if (endingDebate) return;
    setEndingDebate(true);
    setEndError(null);
    setUserHasSpoken(false);
    voiceEngine.cancel();
    cleanupSpeechDetection();
    setAiIsSpeaking(false);
    setSpeechRecording(false);
    setSpeechProcessing(false);
    updateP(0, { isSpeaking: false });
    updateP(1, { isSpeaking: false, isAITyping: false });
    updateP(99, { isSpeaking: false });
    if (aiTimerRef.current)        clearTimeout(aiTimerRef.current);
    if (nudgeTimerRef.current)     clearTimeout(nudgeTimerRef.current);
    if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);
    if (recorder.isRecording) recorder.stop();
    if (!config.sessionId) {
      restoreAfterEndFailure("Debate session is missing. Please return to the room and try again.");
      return;
    }

    let endResponse: any = null;
    try {
      endResponse = await endDebate(config.sessionId);
    } catch (error: any) {
      restoreAfterEndFailure(error?.message || "Unable to end the debate right now.");
      return;
    }

    participants.forEach(p => {
      if (p.isLocal && p.stream instanceof MediaStream) {
        p.stream.getTracks().forEach(t => t.stop());
      }
    });
    if (config.stream instanceof MediaStream) {
      config.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    }

    const mappedScores = extractDebateScores(endResponse);
    setScores({ you: mappedScores.you, ai: mappedScores.ai });
    setSessionFeedback(endResponse || null);

    const verdict = isMulti ? buildMultiVerdict(participants) : null;
    onEnd({
      timer: elapsedTimer,
      debateLimit: fmtClock(debateDurationSeconds),
      mode: "debate", subMode,
      topic: config.topic, subject: config.subject, unit: config.unit,
      participants: participants.filter(p => !p.isAI && !p.isMed).length,
      scores: { you: mappedScores.you, ai: mappedScores.ai, overall: mappedScores.overall },
      hasRealScores: mappedScores.hasRealScores,
      recorder,
      hasRecording: !!recorder.blob,
      participantsList: participants,
      transcript,
      feedback: endResponse || null,
      meetingEnded: true,
      verdict,
    });
  }

  function abortDebateSession() {
    if (endingDebate) return;
    voiceEngine.cancel();
    cleanupSpeechDetection();
    setAiIsSpeaking(false);
    setSpeechRecording(false);
    setSpeechProcessing(false);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (recorder.isRecording) recorder.stop();

    participants.forEach((participant) => {
      if (participant.isLocal && participant.stream instanceof MediaStream) {
        participant.stream.getTracks().forEach((track) => track.stop());
      }
    });
    if (config.stream instanceof MediaStream) {
      config.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }

    onEnd({
      aborted: true,
      timer: elapsedTimer,
      mode: "debate",
      subMode,
      topic: config.topic,
      subject: config.subject,
      unit: config.unit,
      participants: participants.filter((participant) => !participant.isAI && !participant.isMed).length,
      transcript,
      feedback: null,
      meetingEnded: false,
    });
  }

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const n = participants.length;
  const gc = n <= 1 ? "vg-1" : n === 2 ? "vg-2" : "vg-4";
  const fmt = (d: number) => new Date(d).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  const me = participants.find(p => p.isLocal);
  const activeSpeaker = participants.find(p => p.id === activeSpeakerId);
  const liveStudents  = participants.filter(p => !p.isAI && !p.isMed);
  const hasTeamScoring = isMulti && liveStudents.some((participant) => participant.team);
  const teamScores = {
    A: liveStudents
      .filter((participant) => participant.team === "A")
      .reduce((sum, participant) => sum + (participant.reactionsReceived || 0) + (participant.turnsTaken || 0) * 2, 0),
    B: liveStudents
      .filter((participant) => participant.team === "B")
      .reduce((sum, participant) => sum + (participant.reactionsReceived || 0) + (participant.turnsTaken || 0) * 2, 0),
  };
  const aiTurnDisabled = isAI1v1 && (whoTurn === "ai" || aiLocked || speechProcessing || speechRecording || endingDebate);
  const leaderboard   = [...liveStudents]
    .sort((a, b) => ((b.reactionsReceived||0)+(b.turnsTaken||0)) - ((a.reactionsReceived||0)+(a.turnsTaken||0)))
    .slice(0, 5);

  // Mic button label
  const micBtnLabel = isMulti
    ? activeSpeakerId === 0 && micOn ? "Pass Turn" : micOn ? "Live" : "Muted"
    : speechProcessing
      ? "Transcribing..."
      : aiLocked || whoTurn === "ai"
        ? "Waiting for AI..."
        : speechRecording
          ? userHasSpoken ? "Stop & Send" : "Listening..."
          : "Start Speaking";

  const micBtnClass = isMulti
    ? (micOn ? (activeSpeakerId === 0 ? "mic-live" : "on") : "off")
    : speechRecording
      ? "mic-live"
      : micOn
        ? "on"
        : "off";

  return (
    <div className="dp-room">
      {recorder.isRecording && <div className="rec-overlay">⏺ REC {elapsedTimer}</div>}

      {/* TOP BAR */}
      <div className="room-bar">
        <div className="room-logo"><div className="room-logo-ico">⚔️</div>DebateArena</div>
        <div className="rbar-div" />
        <div className="rbar-topic">
          <strong>{config.subject && `${config.subject}${config.unit ? ` · ${config.unit}` : ""} · `}</strong>
          {config.topic}
        </div>
        <div className="rbar-pill pill-timer">{debateTimer}</div>
        {recorder.isRecording && <div className="rbar-pill pill-rec"><div className="pill-rec-dot" />REC</div>}
        {isAI1v1 && (
          <div className={`rbar-pill ${whoTurn === "you" ? "pill-turn-you" : "pill-turn-ai"}`}>
            {whoTurn === "you"
              ? "🎤 Your Turn"
              : speechProcessing
                ? "📝 Transcribing…"
                : aiIsSpeaking
                  ? "🤖 AI Speaking…"
                  : "⏳ Waiting for AI…"}
          </div>
        )}
        {isMulti && (
          <div className={`rbar-pill ${aiIsSpeaking ? "pill-turn-ai" : "pill-turn-you"}`}>
            {aiIsSpeaking
              ? "🎙 AI Moderator Speaking…"
              : activeSpeakerId === 0 && micOn
                ? "🎤 You're Live"
                : "🎙 AI Mediating"}
          </div>
        )}
        <button className="rbar-end" onClick={() => setShowEnd(true)}>✕ End</button>
      </div>

      <div className="room-body">
        <div className="grid-area">

          {/* TILES */}
          <div
            className={`vid-grid ${gc}`}
            style={isMulti ? { gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gridAutoRows:"minmax(220px, 1fr)" } : undefined}
          >
            {participants.map(p => (
              <Tile
                key={p.id} p={p}
                reaction={tileReacts[p.id]}
                nudge={p.isLocal && nudge ? nudge : undefined}
              />
            ))}
          </div>

          {/* CONTROL BAR */}
          <div className="ctrl-bar">
            <div className="cg">
              {/* Mic button — primary action */}
              <button className={`cbtn ${micBtnClass}`} onClick={toggleMic} disabled={speechProcessing || endingDebate || (!speechRecording && (aiLocked || whoTurn === "ai"))}>
                <span className="cbtn-ico">{micOn ? "🎤" : "🔇"}</span>
                <span>{micBtnLabel}</span>
              </button>

              <div style={{ position:"relative" }}>
                <button className={`cbtn${showReactions ? " hi" : ""}`} onClick={() => setShowReactions(r => !r)}>
                  <span className="cbtn-ico">😊</span><span>React</span>
                </button>
                {showReactions && (
                  <div className="react-pop">
                    {(isMulti ? MULTI_REACTIONS : REACTIONS).map(r => (
                      <button key={r} className="react-emoji" onClick={() => sendReaction(r)}>{r}</button>
                    ))}
                  </div>
                )}
              </div>

              <button className={`cbtn${me?.handRaised ? " amb" : ""}`} onClick={toggleHand}>
                <span className="cbtn-ico">✋</span>
                <span>{me?.handRaised ? "Lower" : "Raise"}</span>
              </button>
            </div>

            <div className="cg">
              {/* AI voice status indicator (non-interactive) */}
              <button className={`cbtn${aiIsSpeaking ? " speaking" : ""}`} disabled style={{ cursor:"default" }}>
                <span className="cbtn-ico">🔊</span>
                <span>{aiIsSpeaking ? "AI Live" : aiLocked || speechProcessing ? "Waiting..." : "AI Voice"}</span>
              </button>

              <button
                className={`cbtn${recorder.isRecording ? " rec" : ""}`}
                disabled={speechRecording || speechProcessing || aiLocked || endingDebate}
                onClick={() => recorder.isRecording
                  ? (recorder.stop(), toast$("Recording stopped","warn"))
                  : recorder.start(config.stream instanceof MediaStream ? config.stream : null)
                      .then((ok: boolean) => ok ? toast$("🔴 Recording started","info") : toast$("Share screen to record","error"))
                }
              >
                <span className="cbtn-ico">⏺</span>
                <span>{recorder.isRecording ? "Stop" : "Record"}</span>
              </button>

              <button className="cbtn em" onClick={() => setShowAnalysis(true)}>
                <span className="cbtn-ico">📊</span><span>Analysis</span>
              </button>
            </div>

            <div className="cg">
              <button className={`cbtn${panelTab === "people" ? " hi" : ""}`} onClick={() => setPanelTab(p => p === "people" ? null : "people")}>
                <span className="cbtn-ico">👥</span><span>People ({n})</span>
              </button>
              <button className={`cbtn${panelTab === "chat" ? " hi" : ""}`} onClick={() => setPanelTab(p => p === "chat" ? null : "chat")}>
                <span className="cbtn-ico">💬</span><span>Chat</span>
              </button>
              <button className={`cbtn${panelTab === "score" ? " hi" : ""}`} onClick={() => setPanelTab(p => p === "score" ? null : "score")}>
                <span className="cbtn-ico">🏆</span><span>{isMulti ? "Game" : "Score"}</span>
              </button>
              <button className="end-btn" onClick={() => setShowEnd(true)}>End</button>
            </div>
          </div>
        </div>

        {/* SIDE PANEL */}
        {panelTab && (
          <div className="side-panel">
            {/* Multi-user info grid */}
            {isMulti && panelTab !== "chat" && (
              <div className="room-info-grid">
                <div className="room-info-card live">
                  <div className="room-info-label">Floor Control</div>
                  <div className="room-info-title">
                    {aiIsSpeaking
                      ? "AI Moderator speaking…"
                      : activeSpeaker
                        ? `${activeSpeaker.name} has the floor`
                        : "Selecting speaker…"}
                  </div>
                  <div className="room-info-sub">
                    {activeSpeakerId === 0 && micOn
                      ? "🎤 You're live — mute yourself to pass the turn"
                      : "Mic opens automatically after AI announces you"}
                  </div>
                </div>
                <div className="room-info-card game">
                  <div className="room-info-label">Session</div>
                  <div className="room-chip-row">
                    <span className="room-chip">Players: {liveStudents.length}</span>
                    <span className="room-chip">Live reactions</span>
                  </div>
                </div>
                <div className="room-info-card host">
                  <div className="room-info-label">Host Control</div>
                  <div className="host-popup-wrap">
                    <button className="host-popup-btn" onClick={() => setShowHostPopup(v => !v)}>
                      <span className="host-popup-dot" />
                      <span>Host Admit {waitingRoom.length ? `(${waitingRoom.length})` : ""}</span>
                    </button>
                    {showHostPopup && (
                      <div className="host-popup-panel">
                        <div className="host-popup-head">
                          <div>
                            <div className="room-info-label" style={{ marginBottom:3 }}>Waiting Room</div>
                            <div className="host-popup-title">
                              {waitingRoom.length ? `${waitingRoom.length} student${waitingRoom.length > 1 ? "s" : ""} waiting` : "No one waiting"}
                            </div>
                          </div>
                          <button className="host-popup-close" onClick={() => setShowHostPopup(false)}>×</button>
                        </div>
                        {waitingRoom.length > 0 ? (
                          <>
                            <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:8 }}>
                              <button className="btn-s" style={{ fontSize:11,padding:"5px 10px" }} onClick={admitAll}>Admit all</button>
                            </div>
                            <div className="host-popup-list">
                              {waitingRoom.map(p => (
                                <div key={p.id} className="host-popup-item">
                                  <div className="p-av" style={{ background:(p.avatarColor||avColor(p.name))+"28",color:p.avatarColor||avColor(p.name) }}>{avInit(p.name)}</div>
                                  <div className="host-popup-meta">
                                    <div className="host-popup-name">{p.name}</div>
                                    <div className="host-popup-note">Waiting</div>
                                  </div>
                                  <button className="btn-s" style={{ fontSize:11,padding:"5px 10px" }} onClick={() => admitParticipant(p.id)}>Admit</button>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="host-popup-sub">New join requests appear here.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!chatExpanded && (
              <div className="panel-tabs-dark">
                {[
                  { id:"people", ico:"👥", lbl:"People" },
                  { id:"chat",   ico:"💬", lbl:"Chat"   },
                  ...(isAI1v1 ? [{ id:"score", ico:"🏆", lbl:"Score" }] : [{ id:"score", ico:"🏆", lbl:"Game" }]),
                ].map(t => (
                  <button key={t.id} className={`ptab${panelTab === t.id ? " active" : ""}`} onClick={() => setPanelTab(t.id)}>
                    {t.ico}<span style={{ fontSize:8.5,display:"block" }}>{t.lbl}</span>
                  </button>
                ))}
                <button className="ptab ptab-cls" onClick={() => setPanelTab(null)}>✕</button>
              </div>
            )}

            {/* PEOPLE */}
            {panelTab === "people" && (
              <div className="pscroll">
                <div style={{ padding:"8px 10px 3px",fontSize:9.5,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"rgba(255,255,255,.22)" }}>
                  {n} in room
                </div>
                {isMulti && waitingRoom.length > 0 && (
                  <div style={{ padding:"0 9px 10px" }}>
                    <div style={{ padding:"10px 12px",borderRadius:12,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.16)" }}>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                        <div style={{ fontSize:11.5,fontWeight:800,color:"#fde68a" }}>Waiting room</div>
                        <button className="btn-s" style={{ fontSize:11,padding:"5px 10px" }} onClick={admitAll}>Admit all</button>
                      </div>
                      <div style={{ display:"flex",flexDirection:"column" as const,gap:6 }}>
                        {waitingRoom.map(p => (
                          <div key={p.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 9px",borderRadius:10,background:"rgba(255,255,255,.05)" }}>
                            <div className="p-av" style={{ background:(p.avatarColor||avColor(p.name))+"28",color:p.avatarColor||avColor(p.name) }}>{avInit(p.name)}</div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:12,fontWeight:700,color:"#fff" }}>{p.name}</div>
                              <div style={{ fontSize:10.5,color:"rgba(255,255,255,.45)" }}>Awaiting admission</div>
                            </div>
                            <button className="btn-s" style={{ fontSize:11,padding:"5px 10px" }} onClick={() => admitParticipant(p.id)}>Admit</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {isMulti && participants.filter(p => !p.isAI && !p.isMed && !p.isLocal).length === 0 && (
                  <div style={{ padding:"0 10px 10px" }}>
                    <div style={{ padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",fontSize:11.5,color:"rgba(255,255,255,.6)" }}>
                      No participants yet
                    </div>
                  </div>
                )}
                <div className="p-list">
                  {participants.map(p => {
                    const c = p.avatarColor || avColor(p.name);
                    return (
                      <div key={p.id} className={`p-row${p.isSpeaking ? " spk" : ""}`}>
                        <div className="p-av" style={{ background:c+"28",color:c }}>
                          {p.isAI ? "🤖" : p.isMed ? "🎙️" : avInit(p.name)}
                        </div>
                        <div className="p-info">
                          <div className="p-name">
                            {p.name}{p.isLocal ? " (You)" : ""}
                            {p.isSpeaking ? " 🔊" : ""}
                            {p.handRaised ? " ✋" : ""}
                          </div>
                          <div className="p-role">
                            {p.isHost ? "👑 Host" : p.isMed ? "🎙️ Mediator" : p.isAI ? "🤖 AI" : "👤 Participant"}
                          </div>
                        </div>
                        <span style={{ fontSize:12,color:p.micMuted ? "var(--red)" : "var(--em)" }}>
                          {p.micMuted ? "🔇" : "🎤"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CHAT */}
            {panelTab === "chat" && (
              <div style={{ display:"flex",flexDirection:"column" as const,height:"100%",minHeight:0 }}>
                <button className="chat-side-head" onClick={() => setChatExpanded(v => !v)}>
                  <div>
                    <div className="chat-side-title">Room Chat</div>
                    <div className="chat-side-sub">{chatExpanded ? "Tap to restore sidebar" : "Tap to expand chat"}</div>
                  </div>
                  <span>{chatExpanded ? "Collapse" : "Expand"}</span>
                </button>
                <div className="pscroll" style={{ flex:1 }}>
                  <div className="chat-msgs">
                    {messages.length === 0 && (
                      <div className="chat-empty">
                        No messages yet.<br />
                        {isAI1v1 ? "Type your argument — AI will respond!" : "Start the conversation!"}
                      </div>
                    )}
                    {messages.map((m, i) => {
                      const own = m.sender === config.name;
                      const c   = COLORS[m.senderId % COLORS.length];
                      return (
                        <div key={i} className={`chat-msg${own ? " own" : ""}`}>
                          {!own && <div className="chat-av-sm" style={{ background:c+"28",color:c }}>{m.sender[0]?.toUpperCase()}</div>}
                          <div className="chat-bwrap">
                            {!own && <span className="chat-sender">{m.sender}</span>}
                            <div className={`chat-bubble ${own ? "bubble-own" : "bubble-o"}`}>{m.text}</div>
                            <span className="chat-time">{fmt(m.time)}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                </div>
                <div className="chat-ia">
                  <textarea
                    className="chat-inp"
                    placeholder={
                      isAI1v1
                        ? whoTurn === "you" ? "Type your argument…" : "AI is speaking…"
                        : aiIsSpeaking ? "AI Moderator speaking…" : "Send a message…"
                    }
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !aiTurnDisabled) { e.preventDefault(); sendMsg(chatInput); } }}
                    rows={1}
                    disabled={aiTurnDisabled}
                  />
                  <button className="chat-send" onClick={() => sendMsg(chatInput)} disabled={aiTurnDisabled}>➤</button>
                </div>
              </div>
            )}

            {/* SCORE — 1v1 */}
            {panelTab === "score" && isAI1v1 && (
              <div className="pscroll">
                <div className="dp-wrap">
                  <div className="turn-box">
                    <div className="turn-label">Current Turn</div>
                    <div className={`turn-ind ${whoTurn === "you" ? "your" : "ai"}`}>
                      <div className="turn-dot" style={{ background: whoTurn === "you" ? "var(--em)" : "var(--vio)" }} />
                      <div>
                        <div className="turn-name">{whoTurn === "you" ? "Your Turn" : "AI Debater"}</div>
                        <div className="turn-hint">
                          {whoTurn === "you"
                            ? micOn ? "🎤 Your response auto-sends after 20 seconds of silence" : "Speak or type your argument"
                            : speechProcessing
                              ? "Transcribing your response…"
                              : aiIsSpeaking
                                ? "AI is speaking…"
                                : "Waiting for AI response…"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="score-card">
                    <div className="sc-title">📊 Live Score</div>
                    <div className="sc-row">
                      <div className="sc-item"><div className="sc-val sc-u">{scores.you ?? "-"}</div><div className="sc-lbl">You</div></div>
                      <div className="sc-vs">VS</div>
                      <div className="sc-item"><div className="sc-val sc-a">{scores.ai ?? "-"}</div><div className="sc-lbl">AI</div></div>
                    </div>
                    <div className="sc-bar"><div className="sc-fill" style={{ width:`${(((scores.you ?? 0)/(((scores.you ?? 0)+(scores.ai ?? 0))||1))*100)}%` }} /></div>
                  </div>
                  <div className="phase-card">
                    <div className="sc-title" style={{ marginBottom:6 }}>📋 Debate Phases</div>
                    {PHASES.map((ph, i) => (
                      <div key={i} className={`ph-step${i === phaseIdx ? " act" : ""}`}>
                        <div className={`ph-num ${i < phaseIdx ? "ph-done" : i === phaseIdx ? "ph-act" : "ph-pend"}`}>
                          {i < phaseIdx ? "✓" : i+1}
                        </div>
                        <span className="ph-lbl">{ph}</span>
                      </div>
                    ))}
                    {phaseIdx < PHASES.length - 1 && (
                      <button className="btn-p" style={{ marginTop:9,fontSize:11,padding:"7px" }} onClick={() => setPhaseIdx(i => Math.min(i+1, PHASES.length-1))}>Next Phase →</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SCORE — Multi */}
            {panelTab === "score" && isMulti && (
              <div className="pscroll">
                <div className="dp-wrap">
                  {hasTeamScoring && (
                    <div className="score-card">
                      <div className="sc-title">Team Standings</div>
                      <div className="sc-row">
                        <div className="sc-item"><div className="sc-val sc-u">{teamScores.A}</div><div className="sc-lbl">Team A</div></div>
                        <div className="sc-vs">VS</div>
                        <div className="sc-item"><div className="sc-val sc-a">{teamScores.B}</div><div className="sc-lbl">Team B</div></div>
                      </div>
                      <div className="sc-bar">
                        <div
                          className="sc-fill"
                          style={{
                            width:`${(teamScores.A/((teamScores.A+teamScores.B)||1))*100}%`,
                            background:"linear-gradient(90deg,#6366f1,#a5b4fc)",
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="turn-box">
                    <div className="turn-label">{hasTeamScoring ? "Current Floor" : "Floor Status"}</div>
                    <div className="turn-ind your">
                      <div className="turn-dot" style={{ background: aiIsSpeaking ? "var(--vio)" : "var(--em)" }} />
                      <div>
                        <div className="turn-name">
                          {aiIsSpeaking
                            ? "AI Moderator announcing…"
                            : activeSpeaker
                              ? `${activeSpeaker.name} is speaking`
                              : "Selecting next speaker…"}
                        </div>
                        <div className="turn-hint">
                          {activeSpeakerId === 0 && micOn
                            ? "🎤 You're live — mute yourself to pass the turn"
                            : aiIsSpeaking
                              ? "Mic opens automatically when AI finishes"
                              : "Mute yourself to pass the turn when done"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="score-card">
                    <div className="sc-title">Leaderboard</div>
                    <div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>
                      {leaderboard.map((p, idx) => (
                        <div key={p.id} style={{ display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)" }}>
                          <div style={{ width:22,textAlign:"center" as const,fontSize:12,fontWeight:800,color:idx===0?"#fbbf24":"rgba(255,255,255,.65)" }}>{idx+1}</div>
                          <div className="p-av" style={{ background:(p.avatarColor||avColor(p.name))+"28",color:p.avatarColor||avColor(p.name) }}>{avInit(p.name)}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12,fontWeight:700,color:"#fff" }}>{p.name}</div>
                            <div style={{ fontSize:10.5,color:"rgba(255,255,255,.45)" }}>Turns {p.turnsTaken||0} · Energy {p.energy||0}</div>
                          </div>
                          <div style={{ fontSize:12,fontWeight:800,color:"#a5b4fc" }}>{p.reactionsReceived||0} reacts</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="phase-card">
                    <div className="sc-title" style={{ marginBottom:6 }}>Turn History</div>
                    <div style={{ display:"flex",flexDirection:"column" as const,gap:6 }}>
                      {turnHistory.length === 0 && <div style={{ fontSize:11,color:"rgba(255,255,255,.45)" }}>No turns yet.</div>}
                      {turnHistory.map((entry, idx) => (
                        <div key={`${entry}-${idx}`} style={{ padding:"8px 10px",borderRadius:9,background:"rgba(255,255,255,.05)",fontSize:11.5,fontWeight:700,color:"#fff" }}>
                          {entry}
                        </div>
                      ))}
                    </div>
                    <button className="btn-p" style={{ marginTop:9,fontSize:11,padding:"7px" }} onClick={() => pickNextRef.current("host-skip")}>
                      Pick next random speaker
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ANALYSIS MODAL */}
      {showAnalysis && (
        <div className="analysis-bg" onClick={() => setShowAnalysis(false)}>
          <div className="analysis-box" onClick={e => e.stopPropagation()}>
            <div className="analysis-head">
              <div className="analysis-title">🏆 Debate Analysis</div>
              <button style={{ width:26,height:26,borderRadius:7,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",cursor:"pointer",color:"rgba(255,255,255,.55)",fontSize:12 }} onClick={() => setShowAnalysis(false)}>✕</button>
            </div>
            <div className="analysis-body">
              <div className="a-sec">
                <div className="a-sec-title">📌 Session</div>
                <div style={{ padding:"9px 12px",borderRadius:10,background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.18)",fontSize:13,fontWeight:700,color:"#fff",marginBottom:7 }}>
                  "{config.topic}"
                </div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" as const }}>
                  {[`⏱ ${elapsedTimer}`,`⌛ ${debateTimer} left`,`👥 ${participants.filter(p=>!p.isAI&&!p.isMed).length} participant(s)`,`💬 ${transcript.length} exchanges`].map(t => (
                    <span key={t} style={{ padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.55)" }}>{t}</span>
                  ))}
                </div>
              </div>
              {isAI1v1 && (
                <div className="a-sec">
                  <div className="a-sec-title">📊 Score</div>
                  <div className="score-grid-3">
                    <div className="score-box"><div className="score-box-val" style={{ color:"var(--sky)" }}>{scores.you ?? "-"}</div><div className="score-box-lbl">Your Score</div></div>
                    <div className="score-box"><div className="score-box-val" style={{ color:"var(--vio)" }}>{scores.ai ?? "-"}</div><div className="score-box-lbl">AI Score</div></div>
                    <div className="score-box"><div className="score-box-val" style={{ color:"var(--em)" }}>{Math.abs((scores.you ?? 0) - (scores.ai ?? 0))}</div><div className="score-box-lbl">Margin</div></div>
                  </div>
                  <div className="verdict-box" style={{ borderColor:(scores.you ?? 0) > (scores.ai ?? 0)?"rgba(16,185,129,.4)":"rgba(99,102,241,.4)",background:(scores.you ?? 0) > (scores.ai ?? 0)?"rgba(16,185,129,.07)":"rgba(99,102,241,.07)" }}>
                    <div className="verdict-win" style={{ color:(scores.you ?? 0) > (scores.ai ?? 0)?"var(--em)":"var(--ind3)" }}>
                      {(scores.you ?? 0) > (scores.ai ?? 0) ? "🥇 You Win!" : "🤖 AI Wins"}
                    </div>
                    <div className="verdict-lbl" style={{ color:"rgba(255,255,255,.5)" }}>Score: {Math.max(scores.you ?? 0, scores.ai ?? 0)} pts</div>
                  </div>
                </div>
              )}
            </div>
            <div className="analysis-foot">
              <button className="btn-s" style={{ background:"rgba(255,255,255,.05)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.55)" }} onClick={() => setShowAnalysis(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* END MODAL */}
      {showEnd && (
        <div className="overlay" onClick={() => setShowEnd(false)}>
          <div className="modal dark" style={{ maxWidth:360 }} onClick={e => e.stopPropagation()}>
            <div className="mh">
              <span className="mh-title" style={{ color:"#fff" }}>End Debate?</span>
              <button className="mh-close" style={{ borderColor:"rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)" }} onClick={() => setShowEnd(false)}>✕</button>
            </div>
            <div className="mb" style={{ textAlign:"center" as const,padding:"20px" }}>
              <div style={{ fontSize:42,marginBottom:10 }}>🏁</div>
              <div style={{ fontSize:14,fontWeight:800,color:"#fff",marginBottom:6 }}>
                {completedRound ? "All turns are finished." : "End this debate?"}
              </div>
              <div style={{ fontSize:12.5,color:"rgba(255,255,255,.4)",lineHeight:1.75 }}>
                Elapsed: <strong style={{ color:"var(--ind3)" }}>{elapsedTimer}</strong><br />
                Remaining: <strong style={{ color:"var(--amb)" }}>{debateTimer}</strong>
                {recorder.isRecording && <><br /><span style={{ color:"var(--em)" }}>✅ Recording will be saved</span></>}
              </div>
              {endError && (
                <div style={{ marginTop:12,padding:"10px 12px",borderRadius:12,background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.24)",color:"#fecaca",fontSize:11.5,lineHeight:1.6 }}>
                  {endError}
                </div>
              )}
            </div>
            <div className="mf">
              <button className="btn-s" style={{ background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)" }} onClick={() => setShowEnd(false)}>
                {completedRound ? "Review Room" : "Keep Going"}
              </button>
              <button className="btn-d" onClick={handleEnd} disabled={endingDebate}>
                {endingDebate ? "Ending debate..." : endError ? "Retry End Debate" : completedRound ? "Show Results" : "End Debate"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showBackConfirm && (
        <div className="overlay" onClick={() => setShowBackConfirm(false)}>
          <div className="modal dark" style={{ maxWidth:360 }} onClick={e => e.stopPropagation()}>
            <div className="mh">
              <span className="mh-title" style={{ color:"#fff" }}>Go Back?</span>
              <button className="mh-close" style={{ borderColor:"rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)" }} onClick={() => setShowBackConfirm(false)}>X</button>
            </div>
            <div className="mb" style={{ textAlign:"center" as const,padding:"20px" }}>
              <div style={{ fontSize:42,marginBottom:10 }}>←</div>
              <div style={{ fontSize:14,fontWeight:800,color:"#fff",marginBottom:6 }}>
                Are you sure you want to go back?
              </div>
              <div style={{ fontSize:12.5,color:"rgba(255,255,255,.4)",lineHeight:1.75 }}>
                Your session will be lost.
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" style={{ background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)" }} onClick={() => setShowBackConfirm(false)}>
                Cancel
              </button>
              <button className="btn-d" onClick={abortDebateSession}>
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ─── RESULTS ─────────────────────────────────────────────────────────────────
function DebateResults({ result, onNew }: { result: any; onNew: () => void }) {
  const [showDetail, setShowDetail] = useState(false);

  if (result?.aborted) {
    return (
      <div className="results-page">
        <div className="res-trophy">←</div>
        <h2 className="res-title">Debate Cancelled</h2>
        <p className="res-sub">The active session was closed before it finished.</p>
        <div className="res-actions">
          <button className="btn-p" style={{ fontSize:13,width:"auto",padding:"11px 24px" }} onClick={onNew}>Start Fresh</button>
        </div>
      </div>
    );
  }

  const verdict  = result.verdict;
  const winner   = verdict?.winner;
  const runnerUp = verdict?.runnerUp;
  const insights = verdict?.insights || [];
  const feedbackEntries = result.feedback && typeof result.feedback === "object"
    ? Object.entries(result.feedback).filter(([_, value]) => value !== null && value !== undefined && value !== "")
    : [];
  return (
    <div className="results-page">
      <div className="res-trophy">🏆</div>
      <h2 className="res-title">{result.meetingEnded ? "Session Ended" : "Debate Complete!"}</h2>
      <p className="res-sub">
        ⚔️ Session lasted <strong style={{ color:"var(--ind)" }}>{result.timer}</strong> with <strong>{result.participants}</strong> participant(s).
        {" "}<span style={{ color:"var(--em)" }}>📅 Saved to Calendar.</span>
      </p>
      {result.subject && (
        <div style={{ display:"flex",gap:8,marginBottom:14,flexWrap:"wrap" as const,justifyContent:"center" as const }}>
          <span style={{ padding:"4px 12px",borderRadius:20,background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.18)",fontSize:11.5,fontWeight:700,color:"var(--ind)" }}>📚 {result.subject}</span>
          {result.unit && <span style={{ padding:"4px 12px",borderRadius:20,background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.2)",fontSize:11.5,fontWeight:700,color:"var(--em)" }}>📖 {result.unit}</span>}
        </div>
      )}
      <div className="res-stats">
        {[
          { l:"Duration",     v: result.timer,                i:"⏱️" },
          { l:"Participants", v: result.participants,         i:"👥" },
          { l:"Exchanges",    v: result.transcript?.length||0, i:"💬" },
        ].map((s, i) => (
          <div key={s.l} className="res-stat" style={{ animationDelay:`${i*.1}s` }}>
            <div className="res-stat-ico">{s.i}</div>
            <div className="res-stat-val">{s.v}</div>
            <div className="res-stat-lbl">{s.l}</div>
          </div>
        ))}
      </div>
      {result.subMode === "multi" && winner && (
        <>
          {verdict?.winnerTeam && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 20px",
                borderRadius: 16,
                background: verdict.winnerTeam === "A" ? "rgba(99,102,241,.1)" : "rgba(236,72,153,.1)",
                border: `1.5px solid ${verdict.winnerTeam === "A" ? "rgba(99,102,241,.3)" : "rgba(236,72,153,.3)"}`,
              }}
            >
              <div style={{ fontSize:22,fontWeight:900,color:verdict.winnerTeam==="A"?"#a5b4fc":"#f9a8d4",marginBottom:4 }}>
                Team {verdict.winnerTeam} Wins
              </div>
              <div style={{ fontSize:13,color:"var(--t2)" }}>
                Team A: {verdict.teamAScore || 0} pts · Team B: {verdict.teamBScore || 0} pts
              </div>
            </div>
          )}
          <div className="res-verdict">
            <div className="res-panel">
              <div className="res-panel-title">{verdict?.winnerTeam ? "MVP" : "AI Decision"}</div>
              <div className="res-winner-name">{winner.name}</div>
              <div className="res-winner-sub">
                {verdict?.winnerTeam
                  ? `Top speaker for Team ${winner.team || verdict.winnerTeam} based on reactions, completed turns, and engagement.`
                  : "Winner based on speaking consistency, audience reactions, and turn completion."}
              </div>
            </div>
            <div className="res-panel">
              <div className="res-panel-title">Top Rankings</div>
              <div className="res-rank">
                <div className="res-rank-row">
                  <div><div className="res-rank-name">{winner.name}</div><div className="res-rank-role">{winner.team ? `Winner · Team ${winner.team}` : "Winner"}</div></div>
                  <div className="res-rank-score">{winner.debateScore}</div>
                </div>
                {runnerUp && (
                  <div className="res-rank-row">
                    <div><div className="res-rank-name">{runnerUp.name}</div><div className="res-rank-role">{runnerUp.team ? `Runner-up · Team ${runnerUp.team}` : "Runner-up"}</div></div>
                    <div className="res-rank-score">{runnerUp.debateScore}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {insights.length > 0 && (
            <div className="res-insights">
              {insights.map((entry: string, idx: number) => (
                <div key={idx} className="res-insight">
                  <div className="res-insight-title">Analysis {idx+1}</div>
                  <div className="res-insight-text">{entry}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {result.subMode === "ai" && result.hasRealScores && (
        <div style={{ width:"100%",maxWidth:400,marginBottom:18 }}>
          <div style={{ background:"var(--surf)",border:"1px solid var(--bdr)",borderRadius:18,padding:18,boxShadow:"var(--sh)" }}>
            <div style={{ fontSize:12,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase" as const,color:"var(--t3)",marginBottom:10 }}>Final Score</div>
            <div style={{ display:"flex",alignItems:"center",gap:16,justifyContent:"center" }}>
              <div style={{ textAlign:"center" as const }}>
                <div style={{ fontSize:36,fontWeight:900,color:"var(--ind)" }}>{result.scores?.you ?? "-"}</div>
                <div style={{ fontSize:11,color:"var(--t3)" }}>You</div>
              </div>
              <div style={{ fontSize:18,fontWeight:800,color:"var(--t4)" }}>VS</div>
              <div style={{ textAlign:"center" as const }}>
                <div style={{ fontSize:36,fontWeight:900,color:"var(--vio)" }}>{result.scores?.ai ?? "-"}</div>
                <div style={{ fontSize:11,color:"var(--t3)" }}>AI</div>
              </div>
            </div>
            <div style={{ textAlign:"center" as const,marginTop:10,fontSize:15,fontWeight:800,color:(result.scores?.you ?? 0) >= (result.scores?.ai ?? 0) ? "var(--em)" : "var(--vio)" }}>
              {(result.scores?.you ?? 0) >= (result.scores?.ai ?? 0) ? "You won the debate!" : "AI won this round!"}
            </div>
          </div>
        </div>
      )}
      <div className="res-actions">
        {result.hasRecording && <button className="btn-s" onClick={() => result.recorder?.download("debate.webm")}>📥 Download Recording</button>}
        {feedbackEntries.length > 0 && <button className="btn-s" onClick={() => setShowDetail(true)}>View in detail</button>}
        <button className="btn-p" style={{ fontSize:13,width:"auto",padding:"11px 24px" }} onClick={onNew}>⚔️ New Debate</button>
      </div>
      {showDetail && (
        <div className="overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">Debate feedback</div>
              <button className="mh-close" onClick={() => setShowDetail(false)}>✕</button>
            </div>
            <div className="mb">
              <div style={{ display:"grid", gap:10 }}>
                {feedbackEntries.map(([key, value]) => (
                  <div key={key} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(99,102,241,.05)", border:"1px solid rgba(99,102,241,.12)" }}>
                    <div style={{ fontSize:11, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t3)", marginBottom:6 }}>
                      {key.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize:13, color:"var(--t1)", lineHeight:1.65 }}>
                      <FormattedAIContent value={value} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
type Screen = "setup"|"room"|"results-loading"|"results";

export default function DebatePage() {
  const { user } = useAuth();
  const [screen, setScreen, clearScreen] = useSessionState<Screen>("dp-screen", "setup");
  const [config, setConfig, clearConfig] = useSessionState<any>("dp-config", null);
  const [result, setResult]   = useState<any>(null);
  const [role,   setRole]     = useState("student");
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedSessionId = params.get("sessionId") || params.get("session") || params.get("room") || "";
    if (!linkedSessionId || config || screen !== "setup") return;

    let ignore = false;
    async function autoJoinLinkedDebate() {
      try {
        const candidate = getCandidateContext(user || {});
        const snapshot = await getDebateRoom(linkedSessionId);
        if (ignore) return;
        setConfig({
          name: candidate.candidateName,
          mode: "debate",
          subMode: "multi",
          subject: snapshot?.liveSession?.subject || "",
          unit: snapshot?.liveSession?.unitTitle || snapshot?.liveSession?.unit || "",
          topic: snapshot?.liveSession?.topic || snapshot?.topic || "",
          stream: null,
          micOn: false,
          camOn: false,
          invitees: [],
          roomId: linkedSessionId,
          roomLink: genRoomLink(linkedSessionId),
          debateMinutes: 5,
          unitId: snapshot?.liveSession?.unitId || "",
          sessionId: linkedSessionId,
          liveSession: snapshot?.liveSession || null,
          initialAiMessage: "",
          isHost: false,
        });
        setScreen("room");
      } catch {
        // Leave the user on setup if the shared room is invalid.
      }
    }

    autoJoinLinkedDebate();
    return () => {
      ignore = true;
    };
  }, [config, screen, setConfig, setScreen, user]);

  useEffect(() => {
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="dp-app">
        {screen === "setup" && <Navigation currentRole={role} onRoleChange={setRole} />}
        {screen === "setup" && (
          <DebateSetup
            onLaunch={cfg => { setConfig(cfg); setScreen("room"); }}
          />
        )}
        {screen === "room" && config && (
          config.subMode === "multi" ? (
            <TeamDebateRoom
              config={config}
              onEnd={res => {
                if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
                setConfig(null);
                if (res?.aborted) {
                  setResult(null);
                  clearScreen();
                  setScreen("setup");
                  return;
                }
                setResult(res);
                setScreen("results-loading");
                resultTimerRef.current = setTimeout(() => {
                  setScreen("results");
                  resultTimerRef.current = null;
                }, 2600);
              }}
            />
          ) : (
            <DebateRoom
              config={config}
              onEnd={res => {
                if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
                setConfig(null);
                if (res?.aborted) {
                  setResult(null);
                  clearScreen();
                  setScreen("setup");
                  return;
                }
                setResult(res);
                setScreen("results-loading");
                resultTimerRef.current = setTimeout(() => {
                  setScreen("results");
                  resultTimerRef.current = null;
                }, 2600);
              }}
            />
          )
        )}
        {screen === "results-loading" && (
          <DebateLoadingScreen
            title="Generating debate results"
            subtitle="Reviewing turns, reactions, transcript, and live scoring before finalizing the outcome."
            progress={78}
          />
        )}
        {screen === "results" && result && (
          <DebateResults
            result={result}
            onNew={() => {
              if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
              setResult(null);
              clearScreen();
              clearConfig();
              setScreen("setup");
            }}
          />
        )}
      </div>
    </>
  );
}
