import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  getLibrarySubjects,
  getDebateTopics,
  getCandidateContext,
  getDebateHistory,
  startDebate,
  respondDebate,
  endDebate,
  createDebateRoom,
  joinDebateRoom,
  startDebateRoom,
  completeDebateRoomOpening,
  submitDebateRoomTurn,
  endDebateRoom,
  synthesizeDebateSpeech,
  transcribeDebateAudio,
  type LibrarySubject,
  type DebateHistoryEntry,
} from "./debateMockApi";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * TEACHER DEBATE MODULE
 * ─────────────────────────────────────────────────────────────────────────
 * Adapted from the student DebateArena module. Every backend call goes
 * through `debateMockApi.ts` so this screen runs entirely on mock data.
 * Once the backend is ready, swap the import at the top of this file to
 * point at the real API client — no other code needs to change, since the
 * mock functions mirror the real function names & shapes exactly.
 * ─────────────────────────────────────────────────────────────────────────
 */

// Lightweight local debug helpers (kept so behaviour matches the reference
// module 1:1 without pulling in an external logging util).
const debateDebug = (...args: any[]) => console.log(...args);

const POST_AUTH_REDIRECT_KEY = "gradeup_post_auth_redirect";

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
@keyframes turnBlink{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes tIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes micGlow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}50%{box-shadow:0 0 0 10px rgba(16,185,129,.0)}}
@keyframes countdownPulse{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}

.dp-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--surf);border:1.5px solid var(--bdr);border-radius:13px;padding:10px 17px;font-size:12.5px;font-weight:700;color:var(--t1);box-shadow:var(--sh2);z-index:9999;display:flex;align-items:center;gap:7px;animation:tIn .32s cubic-bezier(.34,1.2,.64,1);white-space:nowrap;max-width:calc(100vw - 28px)}
.dp-toast.success{border-color:rgba(16,185,129,.4)}.dp-toast.error{border-color:rgba(239,68,68,.4)}.dp-toast.warn{border-color:rgba(245,158,11,.4)}.dp-toast.info{border-color:rgba(99,102,241,.36)}

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

.mic-perm-card{border-radius:16px;background:rgba(99,102,241,.06);border:1.5px solid rgba(99,102,241,.2);padding:16px;margin-bottom:14px}
.mic-perm-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.mic-perm-icon{width:42px;height:42px;border-radius:12px;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.mic-perm-title{font-size:14px;font-weight:800;color:#fff}
.mic-perm-sub{font-size:11px;color:rgba(255,255,255,.5);margin-top:2px}
.mic-perm-status{display:flex;align-items:center;gap:9px;padding:11px 13px;border-radius:12px;border:1.5px solid}
.mic-perm-status.idle{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.28)}
.mic-perm-status.requesting{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.28)}
.mic-perm-status.granted{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.32)}
.mic-perm-status.denied{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.28)}
.mic-perm-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.mic-perm-status.idle .mic-perm-dot{background:var(--ind);animation:pulse 2s infinite}
.mic-perm-status.requesting .mic-perm-dot{background:var(--amb);animation:pulse 1s infinite}
.mic-perm-status.granted .mic-perm-dot{background:var(--em);animation:pulse 2.5s infinite}
.mic-perm-status.denied .mic-perm-dot{background:var(--red)}
.mic-perm-label{flex:1;font-size:12.5px;font-weight:700;color:#fff}
.mic-perm-hint{font-size:10.5px;color:rgba(255,255,255,.45);margin-top:2px}
.mic-perm-action{padding:7px 14px;border-radius:9px;border:none;cursor:pointer;font-size:12px;font-weight:800;transition:.18s;font-family:var(--font);flex-shrink:0}
.mic-perm-action.allow{background:var(--grad);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,.28)}
.mic-perm-action.allow:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(99,102,241,.38)}
.mic-perm-action.retry{background:rgba(239,68,68,.14);color:var(--red);border:1.5px solid rgba(239,68,68,.3)}
.mic-perm-action.retry:hover{background:rgba(239,68,68,.22)}
.mic-perm-action:disabled{opacity:.4;cursor:not-allowed}
.mic-perm-warn{margin-top:8px;padding:8px 11px;border-radius:9px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);font-size:11px;color:#fca5a5;line-height:1.6}
.mic-level-row{display:flex;align-items:center;gap:8px;margin-top:10px}
.mic-level-label{font-size:10.5px;font-weight:700;color:rgba(255,255,255,.45);flex-shrink:0}
.mic-level-track{flex:1;height:5px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden}
.mic-level-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#10b981,#6ee7b7);transition:width .1s}
.mic-toggle-row{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:9px 12px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
.mic-toggle-label{font-size:12px;font-weight:700;color:#fff}
.mic-toggle-btn{padding:5px 12px;border-radius:7px;border:none;cursor:pointer;font-size:11.5px;font-weight:800;font-family:var(--font);transition:.18s}
.mic-toggle-btn.on{background:rgba(16,185,129,.15);color:#6ee7b7;border:1.5px solid rgba(16,185,129,.35)}
.mic-toggle-btn.off{background:rgba(239,68,68,.12);color:var(--red);border:1.5px solid rgba(239,68,68,.3)}

.team-a-badge{background:rgba(99,102,241,.85);color:#fff;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:800;flex-shrink:0}
.team-b-badge{background:rgba(236,72,153,.85);color:#fff;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:800;flex-shrink:0}
.team-a-tile{box-shadow:0 0 0 2px #6366f1,0 0 22px rgba(99,102,241,.22)!important}
.team-b-tile{box-shadow:0 0 0 2px #ec4899,0 0 22px rgba(236,72,153,.22)!important}

.team-turn-bar{display:flex;align-items:center;gap:8px;padding:7px 14px;border-radius:10px;border:1.5px solid;font-size:12px;font-weight:700;margin-bottom:8px}
.team-turn-bar.a{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3);color:#a5b4fc}
.team-turn-bar.b{background:rgba(236,72,153,.1);border-color:rgba(236,72,153,.3);color:#f9a8d4}
.team-turn-dot{width:8px;height:8px;border-radius:50%;animation:pulse 1.5s infinite}
.team-turn-bar.a .team-turn-dot{background:#6366f1}
.team-turn-bar.b .team-turn-dot{background:#ec4899}

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
.debate-loader-screen{position:fixed;inset:0;z-index:950;background:rgba(6,12,26,.94);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease}
.debate-loader-card{width:min(360px,100%);border-radius:18px;border:1px solid rgba(99,102,241,.26);background:rgba(15,23,42,.92);box-shadow:var(--sh3);padding:26px 24px;text-align:center;color:#fff}
.debate-loader-ring{width:62px;height:62px;border-radius:50%;border:4px solid rgba(99,102,241,.18);border-top-color:#a5b4fc;margin:0 auto 16px;animation:spin .8s linear infinite}
.debate-loader-title{font-size:16px;font-weight:900;margin-bottom:5px}
.debate-loader-sub{font-size:12px;line-height:1.6;color:rgba(255,255,255,.52);margin-bottom:14px}
.debate-loader-bar{height:5px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
.debate-loader-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899);transition:width .35s ease}

/* ── HISTORY SCREEN ────────────────────────────────────────────────────── */
.dp-history{height:100dvh;overflow-y:auto;background:var(--bg)}
.hist-hero{background:#060c1a;position:relative;overflow:hidden;padding:clamp(24px,4vw,44px) clamp(18px,4vw,48px) clamp(30px,5vw,54px)}
.hist-hero-orbs{position:absolute;inset:0;pointer-events:none}
.hist-hero .dp-orb1{width:320px;height:320px;background:radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%);top:-100px;left:-60px;position:absolute;border-radius:50%;animation:orbFloat 9s ease-in-out infinite}
.hist-hero .dp-orb2{width:220px;height:220px;background:radial-gradient(circle,rgba(236,72,153,.14) 0%,transparent 70%);top:-40px;right:-40px;position:absolute;border-radius:50%;animation:orbFloat 11s ease-in-out infinite reverse}
.hist-hero-inner{position:relative;z-index:2;max-width:1180px;margin:0 auto;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap}
.hist-logo{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.hist-logo-ico{width:32px;height:32px;background:var(--grad);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 6px 18px rgba(99,102,241,.38)}
.hist-logo-name{font-size:14px;font-weight:800;background:linear-gradient(90deg,#fff,var(--ind3));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hist-h1{font-size:clamp(20px,3vw,32px);font-weight:900;letter-spacing:-.6px;color:#fff;margin-bottom:6px}
.hist-h1 .gt{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hist-p{font-size:12.5px;color:rgba(255,255,255,.45);max-width:460px;line-height:1.7}
.hist-new-btn{flex-shrink:0;padding:13px 22px;border-radius:15px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:13.5px;font-weight:800;display:inline-flex;align-items:center;gap:9px;box-shadow:0 8px 26px rgba(99,102,241,.34);transition:all .22s;font-family:var(--font)}
.hist-new-btn:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(99,102,241,.44)}
.hist-new-ico{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}

.hist-body{max-width:1180px;margin:0 auto;padding:clamp(18px,3vw,32px) clamp(18px,4vw,48px) 60px}
.hist-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.hist-stat{background:var(--surf);border:1px solid var(--bdr);border-radius:16px;padding:14px 16px;box-shadow:var(--sh)}
.hist-stat-val{font-size:22px;font-weight:900;color:var(--t1)}
.hist-stat-lbl{font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.hist-section-title{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--t3);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.hist-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
.hist-card{background:var(--surf);border:1px solid var(--bdr);border-radius:18px;padding:16px;box-shadow:var(--sh);display:flex;flex-direction:column;gap:10px;transition:all .22s;animation:fadeUp .4s ease both}
.hist-card:hover{transform:translateY(-3px);box-shadow:var(--sh2);border-color:rgba(99,102,241,.25)}
.hist-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.hist-mode-badge{padding:3px 9px;border-radius:20px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0}
.hist-mode-badge.ai{background:rgba(139,92,246,.12);color:var(--vio);border:1px solid rgba(139,92,246,.24)}
.hist-mode-badge.multi{background:rgba(56,189,248,.12);color:#0284c7;border:1px solid rgba(56,189,248,.28)}
.dark .hist-mode-badge.multi{color:var(--sky)}
.hist-date{font-size:10.5px;color:var(--t3);font-weight:600;white-space:nowrap}
.hist-topic{font-size:13.5px;font-weight:800;color:var(--t1);line-height:1.45}
.hist-meta-row{display:flex;gap:6px;flex-wrap:wrap}
.hist-chip{padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;background:var(--surf3);color:var(--t2)}
.hist-score-row{display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid var(--bdr)}
.hist-score-val{font-size:19px;font-weight:900;color:var(--ind)}
.hist-score-lbl{font-size:10px;color:var(--t3);font-weight:700}
.hist-winner-pill{padding:4px 10px;border-radius:20px;font-size:10.5px;font-weight:800}
.hist-winner-pill.a{background:rgba(99,102,241,.12);color:#4f46e5}
.hist-winner-pill.b{background:rgba(236,72,153,.12);color:#db2777}
.hist-empty{text-align:center;padding:60px 20px;color:var(--t3)}
.hist-empty-ico{font-size:40px;margin-bottom:12px}
.hist-loading{display:flex;align-items:center;justify-content:center;gap:10px;color:var(--t2);padding:40px 0;font-weight:700;font-size:13px}

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

.module-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}
.module-card{padding:13px;border-radius:13px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .2s;display:flex;gap:10px;align-items:flex-start}
.module-card:hover{border-color:rgba(99,102,241,.32);background:rgba(99,102,241,.03);transform:translateY(-2px);box-shadow:0 6px 20px rgba(99,102,241,.1)}
.module-card.sel{border-color:var(--ind);background:rgba(99,102,241,.06);box-shadow:0 6px 20px rgba(99,102,241,.12)}
.mod-ic{width:36px;height:36px;border-radius:11px;background:rgba(99,102,241,.13);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;transition:.2s}
.module-card.sel .mod-ic{background:rgba(99,102,241,.22)}
.mod-title{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:3px}
.mod-desc{font-size:10px;color:var(--t2);line-height:1.5}
.module-card.sel .mod-title{color:var(--ind)}

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
.pill-turn-you{background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.28);color:#6ee7b7}
.pill-turn-ai{background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.28);color:#c4b5fd;animation:turnBlink 1.2s infinite}
.pill-team-a{background:rgba(99,102,241,.2);border:1px solid rgba(99,102,241,.4);color:#a5b4fc}
.pill-team-b{background:rgba(236,72,153,.2);border:1px solid rgba(236,72,153,.4);color:#f9a8d4}
.rbar-end{padding:4px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);cursor:pointer;font-size:11px;font-weight:700;transition:.15s;flex-shrink:0;font-family:var(--font)}
.rbar-end:hover{background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.35);color:var(--red)}
.room-body{flex:1;display:flex;min-height:0;overflow:hidden}
.grid-area{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.vid-grid{flex:1;display:grid;gap:8px;padding:10px;min-height:0;overflow:auto;align-content:start}
.vg-1{grid-template-columns:1fr}.vg-2{grid-template-columns:1fr 1fr}.vg-3{grid-template-columns:1fr 1fr 1fr}.vg-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.team-stage{flex:1;min-height:0;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:10px}
.moderator-row{display:grid;grid-template-columns:minmax(220px,360px);gap:8px;flex-shrink:0}
.moderator-row .tile{min-height:130px}
.team-vs-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;align-items:start;min-height:0}
.team-box{min-width:0;border-radius:16px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);padding:10px;display:flex;flex-direction:column;gap:10px}
.team-box-a{border-color:rgba(99,102,241,.28);background:rgba(99,102,241,.055)}
.team-box-b{border-color:rgba(236,72,153,.28);background:rgba(236,72,153,.055)}
.team-box.active{box-shadow:0 0 0 2px rgba(16,185,129,.38),0 0 26px rgba(16,185,129,.14)}
.team-box-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0}
.team-box-title{font-size:13px;font-weight:900;color:#fff}
.team-box-sub{font-size:10.5px;font-weight:700;color:rgba(255,255,255,.45);margin-top:2px}
.team-member-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));grid-auto-rows:minmax(180px,auto);gap:8px;align-items:stretch}
.team-member-grid .tile{min-height:180px;height:100%}
.tile{border-radius:16px;background:#0d1428;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;transition:box-shadow .28s;min-height:220px;animation:tileIn .32s ease}
.tile.spk{box-shadow:0 0 0 2.5px var(--em),0 0 24px rgba(16,185,129,.2)}
.tile-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;width:clamp(44px,6vw,78px);height:clamp(44px,6vw,78px);font-size:clamp(17px,2.4vw,30px)}
.tile-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.83));padding:24px 12px 10px;display:flex;align-items:flex-end;justify-content:space-between;gap:6px}
.tile-name{font-size:clamp(11px,1.1vw,13px);font-weight:700;color:#fff;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.t-badge{font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px;color:#fff;white-space:nowrap}
.t-host{background:var(--amb);color:#000}.t-ai{background:var(--grad)}.t-you{background:rgba(255,255,255,.17)}.t-med{background:rgba(56,189,248,.82);color:#000}
.tile-muted{width:20px;height:20px;border-radius:50%;background:rgba(239,68,68,.85);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9.5px}
.tile-wave{position:absolute;top:9px;right:9px;display:flex;align-items:center;gap:2px;height:22px}
.tile-wave-bar{width:2.5px;border-radius:2px;animation:waveBar .65s ease-in-out infinite}
.tile-turn{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(16,185,129,.88);border-radius:100px;padding:5px 12px;font-size:10px;font-weight:800;color:#fff;white-space:nowrap;animation:turnBlink 1.2s infinite}
.ai-typing-wrap{position:absolute;top:9px;right:9px;display:flex;gap:3px;align-items:center}
.ai-dot{width:5px;height:5px;border-radius:50%;background:var(--vio);animation:pulse .9s ease-in-out infinite}
.ctrl-bar{min-height:68px;padding:10px 12px;background:rgba(6,12,26,.98);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:8px;flex-wrap:wrap}
.cg{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.cbtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 7px;border-radius:9px;border:1px solid rgba(255,255,255,.09);cursor:pointer;background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);font-size:9px;font-weight:700;transition:all .18s;min-width:42px;font-family:var(--font)}
.cbtn-ico{font-size:14px;transition:transform .2s}
.cbtn:hover{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2);transform:translateY(-2px)}
.cbtn.on{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.36);color:var(--em)}
.cbtn.off{background:rgba(239,68,68,.09);border-color:rgba(239,68,68,.3);color:var(--red)}
.cbtn.speaking{background:rgba(139,92,246,.14);border-color:rgba(139,92,246,.46);color:#c4b5fd;animation:micGlow 1.2s ease-in-out infinite}
.cbtn.mic-live{background:rgba(16,185,129,.18);border-color:rgba(16,185,129,.6);color:#6ee7b7;animation:micGlow 1s ease-in-out infinite}
.cbtn.locked{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.3);color:var(--amb)}
.cbtn:disabled{opacity:.38;cursor:not-allowed;transform:none}
.end-btn{padding:8px 16px;border-radius:9px;border:none;cursor:pointer;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:12px;font-weight:800;font-family:var(--font);box-shadow:0 3px 12px rgba(239,68,68,.28);transition:.2s;white-space:nowrap}
.end-btn:hover{transform:translateY(-2px);box-shadow:0 7px 20px rgba(239,68,68,.42)}
.side-panel{width:300px;min-width:300px;background:rgba(6,12,26,.98);border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden}
.pscroll{flex:1;overflow-y:auto;min-height:0}
.chat-msgs{padding:9px;display:flex;flex-direction:column;gap:7px}
.chat-msg{display:flex;gap:6px;animation:fadeUp .2s ease}
.chat-msg.own{flex-direction:row-reverse}
.chat-av-sm{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0;align-self:flex-end}
.chat-bwrap{display:flex;flex-direction:column;gap:2px;max-width:84%}
.chat-msg.own .chat-bwrap{align-items:flex-end}
.chat-sender{font-size:9.5px;font-weight:700;color:rgba(255,255,255,.28)}
.chat-bubble{padding:7px 10px;border-radius:10px;font-size:12px;line-height:1.55;word-break:break-word}
.bubble-o{background:rgba(255,255,255,.07);color:#fff;border-radius:3px 10px 10px 10px;border:1px solid rgba(255,255,255,.08)}
.bubble-own{background:var(--grad);color:#fff;border-radius:10px 3px 10px 10px}
.chat-empty{text-align:center;color:rgba(255,255,255,.2);font-size:12px;padding:22px 10px;line-height:1.7}
.chat-ia{padding:8px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;display:flex;gap:6px;align-items:flex-end}
.chat-inp{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:12px;outline:none;resize:none;min-height:34px;max-height:78px;transition:border .15s;font-family:var(--font)}
.chat-inp:focus{border-color:var(--ind)}
.chat-inp::placeholder{color:rgba(255,255,255,.2)}
.chat-inp:disabled{opacity:.4;cursor:not-allowed}
.chat-send{width:32px;height:32px;border-radius:8px;background:var(--grad);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.18s;font-size:13px}
.chat-send:hover{transform:scale(1.12)}
.chat-send:disabled{opacity:.4;cursor:not-allowed}
.room-info-grid{display:grid;grid-template-columns:1fr;gap:8px;padding:10px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.06)}
.room-info-card{border-radius:14px;padding:10px 11px}
.room-info-card.live{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.18)}
.room-info-label{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;color:rgba(255,255,255,.45)}
.room-info-title{font-size:12.5px;font-weight:800;color:#fff;margin-bottom:4px}
.room-info-sub{font-size:10.5px;line-height:1.45;color:rgba(255,255,255,.52)}
.score-card{background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.1));border:1px solid rgba(99,102,241,.26);border-radius:12px;padding:12px}
.sc-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.35);margin-bottom:8px}
.sc-row{display:flex;align-items:center;gap:8px}
.sc-item{flex:1;text-align:center}
.sc-val{font-size:25px;font-weight:900}
.sc-u{color:var(--sky)}.sc-a{color:var(--vio)}
.sc-lbl{font-size:10px;color:rgba(255,255,255,.35);margin-top:2px}
.sc-vs{font-size:13px;font-weight:900;color:rgba(255,255,255,.22)}
.dp-wrap{padding:9px;display:flex;flex-direction:column;gap:7px}

.results-page{height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:max(40px, 10vh) clamp(20px,4vw,52px) clamp(20px,4vw,52px);text-align:center;overflow-y:auto;background:radial-gradient(ellipse at 50% 25%,rgba(99,102,241,.07) 0%,transparent 65%)}
.res-trophy{font-size:62px;margin-bottom:12px;animation:scaleIn .6s cubic-bezier(.34,1.56,.64,1) .2s both}
.res-title{font-size:clamp(20px,3.2vw,34px);font-weight:900;letter-spacing:-.6px;margin-bottom:6px;color:var(--t1)}
.res-sub{font-size:13px;color:var(--t2);max-width:420px;line-height:1.75;margin-bottom:18px}
.res-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;max-width:420px;margin-bottom:16px}
.res-stat{background:var(--surf);border:1px solid var(--bdr);border-radius:14px;padding:12px 10px;box-shadow:var(--sh);animation:fadeUp .4s ease both;text-align:center;transition:all .25s}
.res-stat:hover{transform:translateY(-4px);box-shadow:0 10px 28px rgba(99,102,241,.12)}
.res-stat-ico{font-size:19px;margin-bottom:4px}
.res-stat-val{font-size:clamp(16px,2.2vw,24px);font-weight:900;color:var(--ind)}
.res-stat-lbl{font-size:10px;color:var(--t3);margin-top:2px}
.res-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:center}

@media(max-width:1100px){.dp-setup{grid-template-columns:35% 1fr}}
@media(max-width:900px){
  .dp-setup{grid-template-columns:1fr;overflow-y:auto;height:auto;min-height:100dvh}
  .dp-setup-left{min-height:200px;max-height:260px}
  .dp-setup-left-inner{justify-content:flex-start}
  .dp-feats-left{display:none}
  .ctx-card{display:none}
  .hist-stats-row{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:768px){
  .room-body{flex-direction:column}
  .vid-grid{padding:8px;gap:8px}
  .team-stage{padding:8px}
  .team-vs-grid{grid-template-columns:1fr}
  .team-member-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));grid-auto-rows:minmax(160px,auto)}
  .team-member-grid .tile{min-height:160px}
  .moderator-row{grid-template-columns:1fr}
  .tile{min-height:180px}
  .ctrl-bar{padding:8px}.cg{gap:2px;justify-content:center}
  .cbtn{padding:5px 6px;min-width:38px;font-size:8.5px}
  .side-panel{width:100%;min-width:100%;max-height:42dvh;border-left:none;border-top:1px solid rgba(255,255,255,.07)}.rbar-topic{display:none}
  .fi-row{grid-template-columns:1fr}
  .overlay{align-items:flex-end;padding:0}.modal{border-radius:16px 16px 0 0;max-height:90dvh}
  .vg-3,.vg-4{grid-template-columns:1fr 1fr}
  .hist-hero-inner{align-items:flex-start}
  .hist-new-btn{width:100%;justify-content:center}
  .hist-grid{grid-template-columns:1fr}
}
@media(max-width:560px){.cbtn span:last-child{display:none}.cbtn{min-width:32px}.tile{min-height:160px}.team-member-grid{grid-template-columns:1fr}.res-actions{flex-direction:column;align-items:stretch}.hist-stats-row{grid-template-columns:1fr 1fr}}
`;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#38bdf8",
  "#ec4899",
  "#8b5cf6",
  "#f97316",
  "#06b6d4",
];

const avColor = (n: string) => COLORS[(n || "U").charCodeAt(0) % COLORS.length];
const avInit = (n: string) =>
  (n || "U")
    .split(/[_\s]/)
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function fmtClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useTimer(running: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsedSeconds((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return { elapsedSeconds, label: fmtClock(elapsedSeconds) };
}

function useMicPerm() {
  const [state, setState] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    streamRef.current = localStream;
  }, [localStream]);

  const cleanupAnalysis = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => null);
      audioContextRef.current = null;
    }
  }, []);

  const stop = useCallback(
    (silent = false) => {
      cleanupAnalysis();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (!silent) {
        setLocalStream(null);
        setState("idle");
        setError(null);
      }
    },
    [cleanupAnalysis],
  );

  const audioTrack = localStream?.getAudioTracks?.()[0] || null;
  const micGranted = Boolean(localStream);
  const micLive = audioTrack?.readyState === "live";
  const micEnabled = Boolean(audioTrack?.enabled);
  const canProceed = micGranted && micLive && micEnabled;

  const request = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }
      stop();
      setState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      const track = stream.getAudioTracks?.()[0] || null;
      if (!track) throw new Error("No audio track was returned.");
      if (!track.enabled) track.enabled = true;
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;
        audioContextRef.current = ctx;
        const tick = () => {
          const currentAnalyser = analyserRef.current;
          if (!currentAnalyser) return;
          const arr = new Uint8Array(currentAnalyser.frequencyBinCount);
          currentAnalyser.getByteFrequencyData(arr);
          const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
          setMicLevel(Math.min(100, (avg / 128) * 100));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {}
      setLocalStream(stream);
      setState("granted");
      return stream;
    } catch (err: any) {
      stop();
      setState("denied");
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("PERMISSION_DENIED");
      } else if (name === "NotFoundError") {
        setError("No microphone found. Connect one and click Retry.");
      } else {
        setError(err?.message || "Microphone access was denied.");
      }
      return null;
    }
  }, [stop]);

  const setMicEnabled = useCallback((next: boolean) => {
    const track = streamRef.current?.getAudioTracks?.()[0] || null;
    if (track) track.enabled = next;
    setLocalStream((s) => (s ? Object.assign(Object.create(Object.getPrototypeOf(s)), s) : s));
  }, []);

  useEffect(() => {
    return () => {
      cleanupAnalysis();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return {
    state,
    stream: localStream,
    micGranted,
    micEnabled,
    canProceed,
    micLevel,
    error,
    request,
    stop,
    setMicEnabled,
  };
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(
    null,
  );
  const show = (msg: string, type = "success") => setToast({ msg, type });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast ? (
    <div className={`dp-toast ${toast.type}`} onClick={() => setToast(null)}>
      {toast.type === "success"
        ? "✅"
        : toast.type === "error"
          ? "❌"
          : toast.type === "warn"
            ? "⚠️"
            : "ℹ️"}{" "}
      {toast.msg}
    </div>
  ) : null;
  return { show, node };
}

// ─── VOICE ENGINE (browser TTS — works fully offline, no server call) ────────
const voiceEngine = (() => {
  let speaking = false;
  let cancelled = false;
  let voiceRef: SpeechSynthesisVoice | null = null;
  let runToken = 0;

  function pickVoice() {
    const voices = window.speechSynthesis?.getVoices() || [];
    voiceRef =
      voices.find((v) => /en[-_](us)/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      voices[0] ||
      null;
  }
  if (typeof window !== "undefined") {
    window.speechSynthesis?.addEventListener("voiceschanged", pickVoice);
    pickVoice();
  }

  function speak(
    text: string,
    opts: { pitch?: number; rate?: number } = {},
    onStart?: () => void,
    onDone?: () => void,
  ) {
    if (!("speechSynthesis" in window) || !text) {
      onDone?.();
      return;
    }
    const token = ++runToken;
    cancelled = false;
    window.speechSynthesis.cancel();
    setTimeout(() => {
      if (cancelled || token !== runToken) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate ?? 0.95;
      u.pitch = opts.pitch ?? 1.0;
      u.volume = 1;
      if (voiceRef) u.voice = voiceRef;
      u.onstart = () => {
        if (!cancelled) {
          speaking = true;
          onStart?.();
        }
      };
      const finish = () => {
        if (token !== runToken) return;
        speaking = false;
        if (!cancelled) onDone?.();
      };
      u.onend = finish;
      u.onerror = finish;
      try {
        window.speechSynthesis.speak(u);
      } catch {
        finish();
      }
    }, 120);
  }
  function cancel() {
    cancelled = true;
    speaking = false;
    runToken++;
    window.speechSynthesis?.cancel();
  }
  return { speak, cancel };
})();

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
function StepsComp({ steps }: { steps: { label: string; done: boolean }[] }) {
  const st = (i: number) =>
    steps[i].done
      ? "done"
      : steps.slice(0, i).every((s) => s.done)
        ? "act"
        : "pend";
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

function DebateLoadingScreen({
  title,
  subtitle,
  progress,
}: {
  title: string;
  subtitle: string;
  progress?: number;
}) {
  return (
    <div className="debate-loader-screen">
      <div className="debate-loader-card">
        <div className="debate-loader-ring" />
        <div className="debate-loader-title">{title}</div>
        <div className="debate-loader-sub">{subtitle}</div>
        <div className="debate-loader-bar">
          <div
            className="debate-loader-fill"
            style={{ width: `${Math.max(8, Math.min(100, progress ?? 65))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MicPermCard({
  perm,
  stream,
  micLevel,
  micOn,
  onRequest,
  onToggle,
  error,
}: {
  perm: "idle" | "requesting" | "granted" | "denied";
  stream: MediaStream | null;
  micLevel: number;
  micOn: boolean;
  onRequest: () => void;
  onToggle: () => void;
  error?: string | null;
}) {
  const statusLabels = {
    idle: {
      label: "Microphone permission required",
      hint: "Click Allow Mic to grant access before joining",
    },
    requesting: {
      label: "Requesting microphone access…",
      hint: "Please allow access in your browser prompt",
    },
    granted: {
      label: "Microphone ready",
      hint: "Your mic is connected and ready for the debate",
    },
    denied: {
      label: "Microphone access blocked",
      hint: "Click the lock icon in your address bar to allow, then Retry",
    },
  };
  const { label, hint } = statusLabels[perm];
  return (
    <div className="mic-perm-card">
      <div className="mic-perm-header">
        <div className="mic-perm-icon">🎤</div>
        <div>
          <div className="mic-perm-title">Microphone Setup</div>
          <div className="mic-perm-sub">Required before entering the room</div>
        </div>
      </div>
      <div className={`mic-perm-status ${perm}`}>
        <div className="mic-perm-dot" />
        <div style={{ flex: 1 }}>
          <div className="mic-perm-label">{label}</div>
          <div className="mic-perm-hint">{hint}</div>
        </div>
        {perm === "idle" && (
          <button className="mic-perm-action allow" onClick={onRequest}>
            Allow Mic
          </button>
        )}
        {perm === "requesting" && (
          <button className="mic-perm-action allow" disabled>
            <span
              className="loader-spin"
              style={{ width: 14, height: 14, borderWidth: 2, marginRight: 4 }}
            />
            Waiting…
          </button>
        )}
        {perm === "denied" && (
          <button className="mic-perm-action retry" onClick={onRequest}>
            Retry
          </button>
        )}
      </div>
      {perm === "denied" && error && (
        <div className="mic-perm-warn">⚠️ {error}</div>
      )}
      {perm === "granted" && stream && (
        <>
          <div className="mic-level-row">
            <span className="mic-level-label">Mic level</span>
            <div className="mic-level-track">
              <div className="mic-level-fill" style={{ width: `${micLevel}%` }} />
            </div>
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,.4)",
                minWidth: 26,
                textAlign: "right" as const,
              }}
            >
              {Math.round(micLevel)}%
            </span>
          </div>
          <div className="mic-toggle-row">
            <span className="mic-toggle-label">
              {micOn ? "🎤 Mic is on" : "🔇 Mic is off"}
            </span>
            <button
              className={`mic-toggle-btn ${micOn ? "on" : "off"}`}
              onClick={onToggle}
            >
              {micOn ? "On" : "Off"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type Team = "A" | "B";

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal?: boolean;
  isHost?: boolean;
  isAI?: boolean;
  isMed?: boolean;
  micMuted: boolean;
  camOn: boolean;
  isSpeaking: boolean;
  isMyTurn?: boolean;
  isAITyping?: boolean;
  avatarColor?: string;
  team?: Team;
  hasSpoken?: boolean;
}

function WaveBars({ color = "#10b981" }: { color?: string }) {
  return (
    <div className="tile-wave">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="tile-wave-bar"
          style={{ background: color, animationDelay: `${i * 0.11}s` }}
        />
      ))}
    </div>
  );
}

function Tile({ p }: { p: Participant }) {
  const vRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (vRef.current && p.stream instanceof MediaStream)
      vRef.current.srcObject = p.stream;
  }, [p.stream]);
  const color = p.avatarColor || avColor(p.name);
  const teamClass =
    p.team === "A" ? "team-a-tile" : p.team === "B" ? "team-b-tile" : "";
  const tileClass = `tile${p.isSpeaking ? " spk" : ""}${p.team ? " " + teamClass : ""}`;

  return (
    <div className={tileClass}>
      {p.stream instanceof MediaStream && p.camOn ? (
        <video ref={vRef} autoPlay playsInline muted={p.isLocal} />
      ) : (
        <div className="tile-av" style={{ background: color + "28", color }}>
          {p.isAI && !p.isMed ? "🤖" : p.isMed ? "🎙️" : avInit(p.name)}
        </div>
      )}
      {p.isSpeaking && (p.isAI || p.isMed) && (
        <div className="tile-wave">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="tile-wave-bar"
              style={{
                background: p.isMed ? "#38bdf8" : "#8b5cf6",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}
      {p.isSpeaking && !p.isAI && !p.isMed && <WaveBars color="#10b981" />}
      {p.isMyTurn && !p.micMuted && (
        <div className="tile-turn">🎤 Speaking</div>
      )}
      {p.isAITyping && (
        <div className="ai-typing-wrap">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ai-dot" style={{ animationDelay: `${i * 0.22}s` }} />
          ))}
        </div>
      )}
      <div className="tile-ov">
        <div className="tile-name">
          {p.name}
          {p.team === "A" && <span className="team-a-badge">Team A</span>}
          {p.team === "B" && <span className="team-b-badge">Team B</span>}
          {p.isHost && <span className="t-badge t-host">HOST</span>}
          {p.isAI && !p.isMed && <span className="t-badge t-ai">AI</span>}
          {p.isMed && <span className="t-badge t-med">MED</span>}
          {p.isLocal && !p.isHost && <span className="t-badge t-you">You</span>}
          {p.hasSpoken && !p.isMyTurn && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 20,
                background: "rgba(255,255,255,.1)",
                color: "rgba(255,255,255,.5)",
              }}
            >
              Done
            </span>
          )}
        </div>
        {p.micMuted && <div className="tile-muted">🔇</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY SCREEN — new landing screen shown before Setup
// ═══════════════════════════════════════════════════════════════════════════
function DebateHistoryScreen({ onNew }: { onNew: () => void }) {
  const [entries, setEntries] = useState<DebateHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getDebateHistory();
      setEntries(data);
    } catch (err: any) {
      setError(err?.message || "Unable to load debate history.");
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const list = entries || [];
    const completed = list.filter((e) => e.status === "completed");
    const totalParticipants = list.reduce((s, e) => s + (e.participants || 0), 0);
    const aiCount = list.filter((e) => e.mode === "ai").length;
    const teamCount = list.filter((e) => e.mode === "multi").length;
    return { total: list.length, completed: completed.length, aiCount, teamCount, totalParticipants };
  }, [entries]);

  return (
    <div className="dp-history">
      <div className="hist-hero">
        <div className="hist-hero-orbs">
          <div className="dp-orb1" />
          <div className="dp-orb2" />
        </div>
        <div className="hist-hero-inner">
          <div>
            <div className="hist-logo">
              <div className="hist-logo-ico">⚔️</div>
              <span className="hist-logo-name">DebateArena</span>
            </div>
            <h1 className="hist-h1">
              Debate <span className="gt">History</span>
            </h1>
            <p className="hist-p">
              Review past AI and team debates, then launch a fresh session
              whenever you're ready.
            </p>
          </div>
          <button className="hist-new-btn" onClick={onNew}>
            <span className="hist-new-ico">+</span>
            New Debate
          </button>
        </div>
      </div>

      <div className="hist-body">
        <div className="hist-stats-row">
          <div className="hist-stat">
            <div className="hist-stat-val">{stats.total}</div>
            <div className="hist-stat-lbl">Total Sessions</div>
          </div>
          <div className="hist-stat">
            <div className="hist-stat-val">{stats.completed}</div>
            <div className="hist-stat-lbl">Completed</div>
          </div>
          <div className="hist-stat">
            <div className="hist-stat-val">{stats.aiCount}</div>
            <div className="hist-stat-lbl">1 vs AI</div>
          </div>
          <div className="hist-stat">
            <div className="hist-stat-val">{stats.teamCount}</div>
            <div className="hist-stat-lbl">Team Debates</div>
          </div>
        </div>

        <div className="hist-section-title">Recent Sessions</div>

        {entries === null && (
          <div className="hist-loading">
            <span className="loader-spin dark" style={{ width: 18, height: 18 }} />
            Loading debate history…
          </div>
        )}

        {error && entries !== null && entries.length === 0 && (
          <div className="hist-empty">
            <div className="hist-empty-ico">⚠️</div>
            <div>{error}</div>
          </div>
        )}

        {entries && entries.length === 0 && !error && (
          <div className="hist-empty">
            <div className="hist-empty-ico">🗒️</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              No debates yet
            </div>
            <div style={{ fontSize: 12.5 }}>
              Start your first debate to see it show up here.
            </div>
          </div>
        )}

        {entries && entries.length > 0 && (
          <div className="hist-grid">
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                className="hist-card"
                style={{ animationDelay: `${Math.min(idx * 0.04, 0.4)}s` }}
              >
                <div className="hist-card-top">
                  <span className={`hist-mode-badge ${entry.mode}`}>
                    {entry.mode === "ai" ? "1 vs AI" : "Team Debate"}
                  </span>
                  <span className="hist-date">
                    {new Date(entry.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="hist-topic">{entry.topic}</div>
                <div className="hist-meta-row">
                  {entry.subject && (
                    <span className="hist-chip">📚 {entry.subject}</span>
                  )}
                  <span className="hist-chip">⏱ {entry.durationLabel}</span>
                  <span className="hist-chip">
                    👥 {entry.participants} participant
                    {entry.participants === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="hist-score-row">
                  {entry.mode === "ai" ? (
                    <>
                      <div>
                        <div className="hist-score-val">
                          {entry.yourScore ?? "-"}
                        </div>
                        <div className="hist-score-lbl">YOUR SCORE</div>
                      </div>
                      <div style={{ textAlign: "right" as const }}>
                        <div
                          className="hist-score-val"
                          style={{ color: "var(--vio)" }}
                        >
                          {entry.opponentScore ?? "-"}
                        </div>
                        <div className="hist-score-lbl">AI SCORE</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="hist-score-lbl">RESULT</span>
                      {entry.winnerTeam ? (
                        <span
                          className={`hist-winner-pill ${entry.winnerTeam.toLowerCase()}`}
                        >
                          Team {entry.winnerTeam} won
                        </span>
                      ) : (
                        <span className="hist-chip">Pending</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function DebateSetup({
  onBack,
  onLaunch,
}: {
  onBack: () => void;
  onLaunch: (cfg: any) => void;
}) {
  const [name, setName] = useState("");
  const [subMode, setSubMode] = useState<"ai" | "multi" | "">("");
  const [subjectCatalog, setSubjectCatalog] = useState<LibrarySubject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [topicOptions, setTopicOptions] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [custom, setCustom] = useState("");
  const [participantCount, setParticipantCount] = useState("8");
  const [debateMinutes, setDebateMinutes] = useState("5");
  const [showConfirm, setShowConfirm] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinProgress, setJoinProgress] = useState(0);
  const { show: toast$, node: toastNode } = useToast();
  const {
    state: perm,
    stream,
    micLevel,
    request,
    stop,
    canProceed,
    micEnabled,
    setMicEnabled,
    error,
  } = useMicPerm();

  const selectedSubjectLabel =
    subjectCatalog.find((s) => s.subjectGroupKey === subject)?.title ||
    subject;
  const availableUnits = subject
    ? subjectCatalog.find((s) => s.subjectGroupKey === subject)?.units || []
    : [];
  const selectedUnitRecord =
    availableUnits.find((u) => u.id === selectedUnitId) || null;
  const selectedTopicOption = topicOptions.find((t) => t.id === topic);
  const finalTopic =
    topic === "__custom__" ? custom : selectedTopicOption?.title || "";

  useEffect(() => {
    let ignore = false;
    (async () => {
      setSubjectsLoading(true);
      try {
        const data = await getLibrarySubjects();
        if (!ignore) setSubjectCatalog(data);
      } catch {
        if (!ignore) toast$("Unable to load subjects.", "warn");
      } finally {
        if (!ignore) setSubjectsLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!subject || !selectedUnitRecord) {
        setTopicOptions([]);
        return;
      }
      setTopicsLoading(true);
      try {
        const data = await getDebateTopics(subject, selectedUnitRecord.unitNumber);
        if (ignore) return;
        const flat: any[] = [];
        (data?.units || []).forEach((unit: any) =>
          (unit.sections || []).forEach((section: any) =>
            (section.debate_topics || []).forEach((item: any) => {
              flat.push({ id: item.topic_id, title: item.topic_title });
            }),
          ),
        );
        setTopicOptions(flat);
      } catch {
        if (!ignore) toast$("Unable to load debate topics.", "warn");
      } finally {
        if (!ignore) setTopicsLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, selectedUnitRecord?.id]);

  const maxParticipants = Math.min(12, Math.max(2, Number(participantCount) || 8));
  const steps = [
    { label: "Enter your name", done: name.trim().length > 0 },
    { label: "Select subject", done: !!subject },
    { label: "Select unit", done: !!selectedUnitId },
    { label: "Select topic", done: !!finalTopic },
    { label: "Choose debate type", done: !!subMode },
    ...(subMode === "multi"
      ? [{ label: "Set participant limit", done: maxParticipants >= 2 }]
      : [{ label: "Set debate timer", done: !!debateMinutes }]),
  ];
  const canLaunch = steps.every((s) => s.done);

  const features = [
    { ico: "🤖", t: "AI Voice Opponent", d: "Live rebuttals & instant scoring" },
    { ico: "📊", t: "Analysis Reports", d: "Full feedback after each debate" },
    { ico: "👥", t: "Team Mode", d: "Blue vs Red with turn-based moderation" },
    { ico: "🗒️", t: "Session History", d: "Every debate is saved automatically" },
  ];

  async function handleJoin() {
    if (!canProceed) {
      toast$("Enable your microphone before launching the debate.", "warn");
      return;
    }
    setJoining(true);
    for (let p = 0; p <= 100; p += 20) {
      await new Promise((r) => setTimeout(r, 110));
      setJoinProgress(p);
    }

    try {
      const candidate = getCandidateContext({ firstName: name, lastName: "" });
      const candidateName = name.trim() || candidate.candidateName;

      if (subMode === "ai") {
        const session = await startDebate({
          candidateId: candidate.candidateId,
          candidateName,
          topic: finalTopic,
        });
        onLaunch({
          name: candidateName,
          candidateId: candidate.candidateId,
          subMode: "ai",
          subject: selectedSubjectLabel,
          unit: selectedUnitRecord?.unitTitle || "",
          topic: finalTopic,
          stream,
          debateMinutes: Number(debateMinutes),
          sessionId: session.session_id,
          initialAiMessage: session.ai_greeting,
        });
      } else {
        const room = await createDebateRoom({
          candidateId: candidate.candidateId,
          candidateName,
          topic: finalTopic,
          maxParticipants,
        });
        onLaunch({
          name: candidateName,
          candidateId: candidate.candidateId,
          subMode: "multi",
          subject: selectedSubjectLabel,
          unit: selectedUnitRecord?.unitTitle || "",
          topic: finalTopic,
          stream,
          sessionId: room.session_id,
          isHost: true,
          maxParticipants,
        });
      }
    } catch (err: any) {
      toast$(err?.message || "Unable to launch the debate right now.", "error");
    } finally {
      setJoining(false);
      setShowConfirm(false);
      setJoinProgress(0);
    }
  }

  return (
    <div className="dp-setup">
      <div className="dp-setup-left">
        <div className="dp-orbs">
          <div className="dp-orb dp-orb1" />
          <div className="dp-orb dp-orb2" />
        </div>
        <div className="dp-grid" />
        <div className="dp-setup-left-inner">
          <div className="dp-logo">
            <div className="dp-logo-ico">⚔️</div>
            <span className="dp-logo-name">DebateArena</span>
          </div>
          <div className="dp-tag">
            <div className="dp-tag-dot" />
            Debate Setup
          </div>
          <h2 className="dp-h1">
            Launch your
            <br />
            <span className="gt">Debate Room.</span>
          </h2>
          <p className="dp-p">
            {subMode === "ai"
              ? "1-on-1 practice with a live AI opponent and instant scoring."
              : subMode === "multi"
                ? "Team debate room with AI moderation and balanced teams."
                : "Set up an AI-powered debate room in a few quick steps."}
          </p>
          <div className="dp-feats-left">
            {features.map((f) => (
              <div key={f.t} className="dp-feat-left">
                <div className="dp-feat-ico">{f.ico}</div>
                <div className="dp-feat-txt">
                  <strong>{f.t}</strong>
                  <span>{f.d}</span>
                </div>
              </div>
            ))}
          </div>
          {(selectedSubjectLabel || finalTopic) && (
            <div className="ctx-card">
              <div className="ctx-card-label">Session Context</div>
              {selectedSubjectLabel && (
                <div className="ctx-card-val">📚 {selectedSubjectLabel}</div>
              )}
              {finalTopic && <div className="ctx-card-sub">{finalTopic}</div>}
            </div>
          )}
        </div>
      </div>

      <div className="dp-setup-right">
        <div className="dp-setup-scroll">
          <div className="dp-setup-inner">
            <button
              className="setup-back"
              onClick={() => {
                stop();
                onBack();
              }}
            >
              ← Back to History
            </button>
            <h2 className="setup-title">⚔️ Debate Setup</h2>
            <p className="setup-sub">
              Choose your debate type, then complete the setup flow.
            </p>

            <div className="sec-div">Choose Debate Type</div>
            <div className="module-grid fi">
              {[
                { id: "ai", ic: "🤖", t: "1 vs AI", d: "Practice with a live AI voice opponent and scored turns." },
                { id: "multi", ic: "👥", t: "Team Debate", d: "Create a live team room with AI moderation." },
              ].map((item) => (
                <div
                  key={item.id}
                  className={`module-card${subMode === item.id ? " sel" : ""}`}
                  onClick={() => setSubMode(item.id as any)}
                >
                  <div className="mod-ic">{item.ic}</div>
                  <div>
                    <div className="mod-title">{item.t}</div>
                    <div className="mod-desc">{item.d}</div>
                  </div>
                </div>
              ))}
            </div>

            {subMode && (
              <>
                <div className="sec-div">Identity</div>
                <div className="fi">
                  <label className="fl">Your Name</label>
                  <input
                    className="finput"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    maxLength={40}
                  />
                </div>

                <div className="sec-div">Academic Context</div>
                <div className="fi-row fi">
                  <div>
                    <label className="fl">Subject</label>
                    <select
                      className="finput"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        setSelectedUnitId("");
                        setTopic("");
                        setCustom("");
                      }}
                      disabled={subjectsLoading}
                    >
                      <option value="">
                        {subjectsLoading ? "Loading subjects..." : "Select subject..."}
                      </option>
                      {subjectCatalog.map((s) => (
                        <option key={s.subjectGroupKey} value={s.subjectGroupKey}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="fl">Unit / Module</label>
                    <select
                      className="finput"
                      value={selectedUnitId}
                      onChange={(e) => {
                        setSelectedUnitId(e.target.value);
                        setTopic("");
                        setCustom("");
                      }}
                      disabled={!subject}
                    >
                      <option value="">
                        {subject ? "Select unit..." : "Select subject first"}
                      </option>
                      {availableUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.unitTitle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sec-div">Topic</div>
                <div className="fi">
                  <label className="fl">Debate Topic</label>
                  <select
                    className="finput"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={!selectedUnitRecord}
                  >
                    <option value="">
                      {!selectedUnitRecord
                        ? "Select a unit first"
                        : topicsLoading
                          ? "Loading topics..."
                          : "Select a topic..."}
                    </option>
                    {topicOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                    <option value="__custom__">✏️ Custom topic...</option>
                  </select>
                </div>
                {topic === "__custom__" && (
                  <div className="fi">
                    <label className="fl">Custom Topic</label>
                    <input
                      className="finput"
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      placeholder="Your debate topic..."
                    />
                  </div>
                )}

                <div className="sec-div">Timing</div>
                {subMode === "multi" ? (
                  <div className="fi">
                    <label className="fl">Number of Participants</label>
                    <input
                      className="finput"
                      type="number"
                      min={2}
                      max={12}
                      value={participantCount}
                      onChange={(e) =>
                        setParticipantCount(e.target.value.replace(/[^\d]/g, ""))
                      }
                    />
                    <div style={{ marginTop: 6, fontSize: 11, color: "var(--t2)" }}>
                      Team debates support 2 to 12 participants.
                    </div>
                  </div>
                ) : (
                  <div className="fi">
                    <label className="fl">Debate Duration</label>
                    <select
                      className="finput"
                      value={debateMinutes}
                      onChange={(e) => setDebateMinutes(e.target.value)}
                    >
                      {[2, 5, 10, 15, 20].map((m) => (
                        <option key={m} value={String(m)}>
                          {m} minutes
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <StepsComp steps={steps} />
                <button
                  className="btn-p"
                  onClick={() => setShowConfirm(true)}
                  disabled={!canLaunch}
                >
                  {subMode === "ai" ? "🤖 Start 1 vs AI Debate" : "👥 Launch Team Debate"}
                </button>
              </>
            )}
            <div style={{ height: 24 }} />
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="overlay">
          <div className="modal dark" style={{ maxWidth: 440 }}>
            <div className="mh">
              <span className="mh-title" style={{ color: "#fff" }}>
                ⚔️ Ready to Enter?
              </span>
              <button
                className="mh-close"
                style={{
                  borderColor: "rgba(255,255,255,.1)",
                  background: "rgba(255,255,255,.06)",
                  color: "rgba(255,255,255,.6)",
                }}
                onClick={() => {
                  stop();
                  setShowConfirm(false);
                }}
              >
                ✕
              </button>
            </div>
            <div className="mb" style={{ padding: "16px 20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 13,
                  background: "rgba(99,102,241,.08)",
                  border: "1px solid rgba(99,102,241,.18)",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    background: "var(--grad)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  ⚔️
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
                    {name || "Guest"}
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)" }}>
                    {subMode === "ai" ? "1v1 vs AI Debate" : "Team Debate"}
                    {selectedSubjectLabel ? ` · ${selectedSubjectLabel}` : ""}
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.07)",
                  marginBottom: 14,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "rgba(255,255,255,.8)",
                }}
              >
                💬 "{finalTopic}"
              </div>
              <MicPermCard
                perm={perm}
                stream={stream}
                micLevel={micLevel}
                micOn={micEnabled}
                onRequest={request}
                onToggle={() => setMicEnabled(!micEnabled)}
                error={error}
              />
            </div>
            <div className="mf" style={{ flexDirection: "column" as const, gap: 8 }}>
              <button
                className="btn-p"
                onClick={handleJoin}
                disabled={joining || !canProceed}
              >
                {joining ? (
                  <>
                    <span className="loader-spin" />
                    Launching {joinProgress > 0 ? `${joinProgress}%` : "..."}
                  </>
                ) : canProceed ? (
                  "⚔️ Launch Debate"
                ) : perm === "requesting" ? (
                  "Waiting for Mic..."
                ) : (
                  "Enable Mic to Launch"
                )}
              </button>
              {joinProgress > 0 && (
                <div className="lo-progress">
                  <div className="lo-progress-fill" style={{ width: `${joinProgress}%` }} />
                </div>
              )}
              <button
                className="btn-s"
                onClick={() => {
                  stop();
                  setShowConfirm(false);
                }}
                disabled={joining}
                style={{
                  width: "100%",
                  justifyContent: "center" as const,
                  background: "rgba(255,255,255,.04)",
                  borderColor: "rgba(255,255,255,.1)",
                  color: "rgba(255,255,255,.5)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {joining && (
        <DebateLoadingScreen
          title="Entering debate room"
          subtitle="Preparing teams, voice controls, and room state..."
          progress={joinProgress || 12}
        />
      )}
      {toastNode}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AI 1-VS-1 ROOM
// ═══════════════════════════════════════════════════════════════════════════
function AIDebateRoom({ config, onEnd }: { config: any; onEnd: (r: any) => void }) {
  const { elapsedSeconds, label: elapsedTimer } = useTimer(true);
  const debateDurationSeconds = Math.max(60, Number(config.debateMinutes || 5) * 60);
  const remainingSeconds = Math.max(0, debateDurationSeconds - elapsedSeconds);
  const debateTimer = fmtClock(remainingSeconds);
  const { show: toast$, node: toastNode } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [whoTurn, setWhoTurn] = useState<"you" | "ai">("ai");
  const [aiLocked, setAiLocked] = useState(true);
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false);
  const [speechRecording, setSpeechRecording] = useState(false);
  const [speechProcessing, setSpeechProcessing] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [endingDebate, setEndingDebate] = useState(false);
  const [scores, setScores] = useState<{ you: number | null; ai: number | null }>({
    you: null,
    ai: null,
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const initRef = useRef(false);

  function addMsg(sender: string, senderId: 0 | 1, text: string) {
    setMessages((m) => [...m, { sender, senderId, text, time: Date.now() }]);
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const greeting = config.initialAiMessage || "Welcome! Make your opening statement.";
    addMsg("AI Debater", 1, greeting);
    voiceEngine.speak(
      greeting,
      { pitch: 0.95, rate: 0.94 },
      () => setAiIsSpeaking(true),
      () => {
        setAiIsSpeaking(false);
        setAiLocked(false);
        setWhoTurn("you");
      },
    );
    return () => voiceEngine.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMsg(text: string) {
    if (!text.trim() || aiLocked) return;
    addMsg(config.name, 0, text.trim());
    setChatInput("");
    setAiLocked(true);
    setWhoTurn("ai");
    try {
      const res = await respondDebate({ sessionId: config.sessionId, message: text.trim() });
      const reply = res?.ai_response || res?.response || res?.reply || "";
      addMsg("AI Debater", 1, reply);
      voiceEngine.speak(
        reply,
        { pitch: 0.95, rate: 0.94 },
        () => setAiIsSpeaking(true),
        () => {
          setAiIsSpeaking(false);
          setAiLocked(false);
          setWhoTurn("you");
        },
      );
    } catch (err: any) {
      setAiLocked(false);
      setWhoTurn("you");
      toast$(err?.message || "Unable to reach the AI right now.", "error");
    }
  }

  async function startSpeechCapture() {
    if (whoTurn !== "you" || aiLocked || speechRecording) return;
    const localStream = config.stream instanceof MediaStream ? config.stream : null;
    const track = localStream?.getAudioTracks?.()[0];
    if (!track) {
      toast$("Microphone is not available.", "error");
      return;
    }
    track.enabled = true;
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    if (!mimeType) {
      toast$("Your browser does not support audio recording.", "error");
      return;
    }
    const recorder = new MediaRecorder(new MediaStream([track]), { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      setSpeechRecording(false);
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (!blob.size) return;
      setSpeechProcessing(true);
      try {
        const result = await transcribeDebateAudio(blob);
        if (result?.text) await sendMsg(result.text);
      } catch (err: any) {
        toast$(err?.message || "Unable to transcribe speech.", "error");
      } finally {
        setSpeechProcessing(false);
      }
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setSpeechRecording(true);
    toast$("Listening... click Stop when you're done speaking.", "info");
  }

  function stopSpeechCapture() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function handleEnd() {
    if (endingDebate) return;
    setEndingDebate(true);
    voiceEngine.cancel();
    stopSpeechCapture();
    try {
      const res = await endDebate(config.sessionId);
      const you = res?.scores?.student ?? null;
      const ai = res?.scores?.ai ?? null;
      setScores({ you, ai });
      onEnd({
        timer: elapsedTimer,
        subMode: "ai",
        topic: config.topic,
        subject: config.subject,
        participants: 1,
        scores: { you, ai, breakdown: res?.feedback?.scores || null },
        recommendations: res?.recommendations || null,
        transcript: messages,
      });
    } catch (err: any) {
      toast$(err?.message || "Unable to end the debate.", "error");
    } finally {
      setEndingDebate(false);
    }
  }

  return (
    <div className="dp-room">
      <div className="room-bar">
        <div className="room-logo">
          <div className="room-logo-ico">⚔️</div>DebateArena
        </div>
        <div className="rbar-div" />
        <div className="rbar-topic">
          <strong>{config.subject && `${config.subject} · `}</strong>
          {config.topic}
        </div>
        <div className="rbar-pill pill-timer">{debateTimer}</div>
        <div className={`rbar-pill ${whoTurn === "you" ? "pill-turn-you" : "pill-turn-ai"}`}>
          {whoTurn === "you" ? "🎤 Your Turn" : aiIsSpeaking ? "🤖 AI Speaking..." : "⏳ AI thinking..."}
        </div>
        <button className="rbar-end" onClick={() => setShowEnd(true)}>
          ✕ End
        </button>
      </div>

      <div className="room-body">
        <div className="grid-area">
          <div className="vid-grid vg-2">
            <Tile
              p={{
                id: "you",
                name: config.name,
                stream: config.stream instanceof MediaStream ? config.stream : null,
                isLocal: true,
                isHost: true,
                micMuted: !speechRecording,
                camOn: false,
                isSpeaking: speechRecording,
                isMyTurn: whoTurn === "you" && !aiLocked,
                avatarColor: COLORS[0],
              }}
            />
            <Tile
              p={{
                id: "ai",
                name: "AI Debater",
                stream: null,
                isAI: true,
                micMuted: false,
                camOn: false,
                isSpeaking: aiIsSpeaking,
                isAITyping: aiLocked && !aiIsSpeaking,
                avatarColor: "#8b5cf6",
              }}
            />
          </div>
          <div className="ctrl-bar">
            <div className="cg">
              <button
                className={`cbtn ${speechRecording ? "mic-live" : whoTurn === "you" && !aiLocked ? "on" : "off"}`}
                onClick={speechRecording ? stopSpeechCapture : startSpeechCapture}
                disabled={whoTurn !== "you" || aiLocked || speechProcessing}
              >
                <span className="cbtn-ico">{speechRecording ? "🎙" : "🎤"}</span>
                <span>
                  {speechProcessing ? "Transcribing..." : speechRecording ? "Stop Speaking" : "Start Speaking"}
                </span>
              </button>
            </div>
            <div className="cg">
              <button className={`cbtn${aiIsSpeaking ? " speaking" : ""}`} disabled>
                <span className="cbtn-ico">🔊</span>
                <span>{aiIsSpeaking ? "AI Speaking" : whoTurn === "you" ? "Your Turn" : "AI Turn"}</span>
              </button>
              <button className="end-btn" onClick={() => setShowEnd(true)}>
                End
              </button>
            </div>
          </div>
        </div>

        <div className="side-panel">
          <div className="pscroll">
            <div className="room-info-grid">
              <div className="room-info-card live">
                <div className="room-info-label">Debate Status</div>
                <div className="room-info-title">
                  {aiIsSpeaking ? "AI is speaking" : whoTurn === "you" ? "Your response window is open" : "Waiting for AI"}
                </div>
                <div className="room-info-sub">
                  {whoTurn === "you"
                    ? "Speak or type your argument now."
                    : "Your mic stays blocked until the AI finishes."}
                </div>
              </div>
            </div>
            <div className="chat-msgs" style={{ maxHeight: 340 }}>
              {messages.length ? (
                messages.map((m, i) => (
                  <div key={i} className={`chat-msg${m.senderId === 0 ? " own" : ""}`}>
                    <div className="chat-bwrap" style={{ width: "100%" }}>
                      <span className="chat-sender">{m.sender}</span>
                      <div className={`chat-bubble ${m.senderId === 0 ? "bubble-own" : "bubble-o"}`}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="chat-empty">The debate will appear here.</div>
              )}
              <div ref={chatEndRef} />
            </div>
            {(scores.you !== null || scores.ai !== null) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 9px" }}>
                <div style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 16, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 800, marginBottom: 4 }}>You</div>
                  <div style={{ fontSize: 24, color: "#fff", fontWeight: 900 }}>{scores.you ?? "-"}</div>
                </div>
                <div style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.2)", borderRadius: 16, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 800, marginBottom: 4 }}>AI</div>
                  <div style={{ fontSize: 24, color: "#fff", fontWeight: 900 }}>{scores.ai ?? "-"}</div>
                </div>
              </div>
            )}
          </div>
          <div className="chat-ia">
            <textarea
              className="chat-inp"
              placeholder={whoTurn === "you" ? "Type your argument…" : "AI is speaking…"}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMsg(chatInput);
                }
              }}
              rows={1}
              disabled={aiLocked}
            />
            <button className="chat-send" onClick={() => sendMsg(chatInput)} disabled={aiLocked}>
              ➤
            </button>
          </div>
        </div>
      </div>

      {showEnd && (
        <div className="overlay" onClick={() => setShowEnd(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">End Debate?</div>
              <button className="mh-close" onClick={() => setShowEnd(false)}>✕</button>
            </div>
            <div className="mb" style={{ textAlign: "center" as const }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🛑</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                Finish this AI debate session?
              </div>
              <div style={{ fontSize: 12.5, color: "var(--t2)", lineHeight: 1.75 }}>
                We'll wrap up the session and show your score & feedback.
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" onClick={() => setShowEnd(false)}>Cancel</button>
              <button className="btn-d" onClick={handleEnd} disabled={endingDebate}>
                {endingDebate ? "Ending..." : "End Debate"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAM DEBATE ROOM
// ═══════════════════════════════════════════════════════════════════════════
function TeamDebateRoom({ config, onEnd }: { config: any; onEnd: (r: any) => void }) {
  const { elapsedSeconds, label: elapsedTimer } = useTimer(true);
  const { show: toast$, node: toastNode } = useToast();
  const [liveSession, setLiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveSession?.turns?.length]);

  const loadRoom = useCallback(async () => {
    try {
      const res = await joinDebateRoom({
        sessionId: config.sessionId,
        candidateId: config.candidateId,
        candidateName: config.name,
      });
      setLiveSession(res.liveSession);
    } catch (err: any) {
      toast$(err?.message || "Unable to load the debate room.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.sessionId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  async function handleStart() {
    if (starting || startedRef.current) return;
    startedRef.current = true;
    setStarting(true);
    try {
      const res = await startDebateRoom({
        sessionId: config.sessionId,
        candidateId: config.candidateId,
        candidateName: config.name,
      });
      setLiveSession(res.liveSession);
      const greeting = res?.data?.aiGreeting || res?.aiGreeting || "";
      setAiSpeaking(true);
      voiceEngine.speak(
        greeting,
        { pitch: 1.05, rate: 0.9 },
        undefined,
        async () => {
          setAiSpeaking(false);
          try {
            const completed = await completeDebateRoomOpening({
              sessionId: config.sessionId,
              candidateId: config.candidateId,
            });
            setLiveSession(completed.liveSession);
          } catch {}
        },
      );
    } catch (err: any) {
      toast$(err?.message || "Unable to start the debate.", "error");
    } finally {
      setStarting(false);
    }
  }

  const participants = liveSession?.participants || [];
  const teams = liveSession?.teams || { A: [], B: [] };
  const currentRound = liveSession?.currentRound || {};
  const currentSpeakerId = currentRound.currentSpeakerId;
  const activeTeam = currentRound.activeTeam;
  const isLocalTurn =
    liveSession?.status === "active" &&
    String(currentSpeakerId) === String(config.candidateId) &&
    !aiSpeaking;

  async function submitTurn(text: string) {
    if (!text.trim()) return;
    setMessageInput("");
    try {
      const me = participants.find((p: any) => p.id === config.candidateId);
      const res = await submitDebateRoomTurn({
        sessionId: config.sessionId,
        candidateId: config.candidateId,
        candidateName: config.name,
        team: me?.team,
        message: text.trim(),
      });
      setLiveSession(res.liveSession);
      const lastTurn = (res.liveSession.turns || []).slice(-1)[0];
      if (lastTurn?.role === "moderator") {
        setAiSpeaking(true);
        voiceEngine.speak(lastTurn.message, { pitch: 1.05, rate: 0.9 }, undefined, () =>
          setAiSpeaking(false),
        );
      }
    } catch (err: any) {
      toast$(err?.message || "Unable to submit your turn.", "error");
    }
  }

  async function handleEnd() {
    if (ending) return;
    setEnding(true);
    voiceEngine.cancel();
    try {
      const res = await endDebateRoom(config.sessionId);
      const scoreEntries = Object.entries(res.scores || {}).map(([id, s]: any) => {
        const p = participants.find((pp: any) => String(pp.id) === String(id));
        return {
          participantId: id,
          name: p?.name || "Participant",
          team: p?.team || null,
          isViewer: String(id) === String(config.candidateId),
          score: s.total_score,
        };
      }).sort((a, b) => (b.score || 0) - (a.score || 0));
      const teamAScore = scoreEntries.filter((e) => e.team === "A").reduce((s, e) => s + e.score, 0);
      const teamBScore = scoreEntries.filter((e) => e.team === "B").reduce((s, e) => s + e.score, 0);
      onEnd({
        timer: elapsedTimer,
        subMode: "multi",
        topic: config.topic,
        subject: config.subject,
        participants: participants.length,
        transcript: res.liveSession?.turns || [],
        verdict: {
          winnerTeam: teamAScore === teamBScore ? null : teamAScore > teamBScore ? "A" : "B",
          teamAScore,
          teamBScore,
          winner: scoreEntries[0]
            ? { name: scoreEntries[0].name, team: scoreEntries[0].team, debateScore: scoreEntries[0].score }
            : null,
          runnerUp: scoreEntries[1]
            ? { name: scoreEntries[1].name, team: scoreEntries[1].team, debateScore: scoreEntries[1].score }
            : null,
          insights: [],
        },
        scores: { viewer: scoreEntries.find((e) => e.isViewer) || null, participantScores: scoreEntries },
      });
    } catch (err: any) {
      toast$(err?.message || "Unable to end the debate.", "error");
    } finally {
      setEnding(false);
    }
  }

  const buildTiles = (team: "A" | "B") =>
    (teams[team] || []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
      stream: String(p.id) === String(config.candidateId) && config.stream instanceof MediaStream ? config.stream : null,
      isAI: false,
      isLocal: String(p.id) === String(config.candidateId),
      isHost: participants.find((pp: any) => pp.id === p.id)?.isHost,
      micMuted: aiSpeaking || String(p.id) !== String(currentSpeakerId),
      camOn: false,
      isSpeaking: String(p.id) === String(config.candidateId) && speaking,
      isMyTurn: String(p.id) === String(currentSpeakerId),
      avatarColor: team === "A" ? "#6366f1" : "#ec4899",
      team,
      hasSpoken: Boolean(
        participants.find((pp: any) => pp.id === p.id)?.hasSpoken,
      ),
    }));

  return (
    <div className="dp-room">
      <div className="room-bar">
        <div className="room-logo">
          <div className="room-logo-ico">⚔️</div>DebateArena
        </div>
        <div className="rbar-div" />
        <div className="rbar-topic">
          <strong>{config.topic}</strong> {config.subject && `· ${config.subject}`}
        </div>
        <div className="rbar-pill" style={{ background: "rgba(99,102,241,.14)", color: "#c7d2fe" }}>
          {liveSession?.status === "completed"
            ? "Completed"
            : liveSession?.status === "active"
              ? "Live debate"
              : "Waiting Room"}
        </div>
        <button className="rbar-end" onClick={() => setShowEnd(true)}>✕ End</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16, background: "linear-gradient(180deg,#081223 0%,#0f172a 100%)" }}>
        {loading ? (
          <div style={{ color: "#fff", display: "grid", placeItems: "center", minHeight: "60vh", gap: 12 }}>
            <div className="loader-spin" />
            <div style={{ fontWeight: 800 }}>Loading debate room...</div>
          </div>
        ) : liveSession?.status === "waiting" ? (
          <div style={{ maxWidth: 560, margin: "40px auto", background: "#0d1428", borderRadius: 22, border: "1px solid rgba(255,255,255,.08)", padding: 22, color: "#fff" }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Waiting Room</div>
            <div style={{ color: "rgba(255,255,255,.62)", lineHeight: 1.7, marginBottom: 16 }}>
              {participants.length} participant{participants.length === 1 ? "" : "s"} joined so far. Start when ready —
              everyone will be split into Team A / Team B automatically.
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 16 }}>
              {participants.map((p: any) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,.05)" }}>
                  <div className="tile-av" style={{ width: 30, height: 30, fontSize: 12, background: avColor(p.name) + "28", color: avColor(p.name) }}>
                    {avInit(p.name)}
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</span>
                  {p.isHost && <span className="t-badge t-host" style={{ marginLeft: "auto" }}>HOST</span>}
                </div>
              ))}
            </div>
            <button className="btn-p" onClick={handleStart} disabled={starting || participants.length < 2}>
              {starting ? "Starting..." : `Start Debate (${participants.length})`}
            </button>
          </div>
        ) : (
          <div className="team-stage">
            <div className="moderator-row">
              <Tile
                p={{
                  id: "moderator",
                  name: "AI Moderator",
                  stream: null,
                  isAI: true,
                  isMed: true,
                  micMuted: false,
                  camOn: false,
                  isSpeaking: aiSpeaking,
                  avatarColor: "#38bdf8",
                }}
              />
            </div>
            <div className="team-vs-grid">
              <section className={`team-box team-box-a${activeTeam === "A" ? " active" : ""}`}>
                <div className="team-box-head">
                  <div>
                    <div className="team-box-title">🔵 Team Blue</div>
                    <div className="team-box-sub">
                      {(teams.A || []).filter((p: any) => participants.find((pp: any) => pp.id === p.id)?.hasSpoken).length}/
                      {(teams.A || []).length} spoke
                    </div>
                  </div>
                  <span className="team-a-badge">A</span>
                </div>
                <div className="team-member-grid">
                  {buildTiles("A").map((p) => (
                    <Tile key={p.id} p={p} />
                  ))}
                </div>
              </section>
              <section className={`team-box team-box-b${activeTeam === "B" ? " active" : ""}`}>
                <div className="team-box-head">
                  <div>
                    <div className="team-box-title">🔴 Team Red</div>
                    <div className="team-box-sub">
                      {(teams.B || []).filter((p: any) => participants.find((pp: any) => pp.id === p.id)?.hasSpoken).length}/
                      {(teams.B || []).length} spoke
                    </div>
                  </div>
                  <span className="team-b-badge">B</span>
                </div>
                <div className="team-member-grid">
                  {buildTiles("B").map((p) => (
                    <Tile key={p.id} p={p} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {liveSession?.status === "active" && (
        <div className="room-body" style={{ flex: "0 0 auto" }}>
          <div className="side-panel" style={{ width: "100%", minWidth: 0, height: 260 }}>
            <div className="pscroll">
              <div className="room-info-grid">
                <div className="room-info-card live">
                  <div className="room-info-label">Floor</div>
                  <div className="room-info-title">
                    {aiSpeaking
                      ? "AI Moderator speaking…"
                      : isLocalTurn
                        ? "It's your turn — type your argument below"
                        : `Waiting on ${participants.find((p: any) => p.id === currentSpeakerId)?.name || "next speaker"}`}
                  </div>
                </div>
              </div>
              <div className="chat-msgs">
                {(liveSession.turns || []).map((t: any) => (
                  <div key={t.id} className="chat-msg">
                    <div className="chat-bwrap" style={{ width: "100%" }}>
                      <span className="chat-sender">
                        {t.speakerName}
                        {t.team ? ` · Team ${t.team}` : ""}
                      </span>
                      <div className="chat-bubble bubble-o">{t.message}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
            <div className="chat-ia">
              <textarea
                className="chat-inp"
                placeholder={isLocalTurn ? "Type your argument…" : "Waiting for your turn…"}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitTurn(messageInput);
                  }
                }}
                rows={1}
                disabled={!isLocalTurn}
              />
              <button className="chat-send" onClick={() => submitTurn(messageInput)} disabled={!isLocalTurn}>
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnd && (
        <div className="overlay" onClick={() => setShowEnd(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">End Debate?</div>
              <button className="mh-close" onClick={() => setShowEnd(false)}>✕</button>
            </div>
            <div className="mb" style={{ textAlign: "center" as const }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🏁</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>End this team debate?</div>
              <div style={{ fontSize: 12.5, color: "var(--t2)", lineHeight: 1.75 }}>
                Elapsed: <strong style={{ color: "var(--ind3)" }}>{elapsedTimer}</strong>
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" onClick={() => setShowEnd(false)}>Keep Going</button>
              <button className="btn-d" onClick={handleEnd} disabled={ending}>
                {ending ? "Ending..." : "End Debate"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════
function DebateResults({ result, onDone }: { result: any; onDone: () => void }) {
  function downloadTranscript() {
    const lines: string[] = [];
    lines.push("DEBATE TRANSCRIPT");
    lines.push("=================");
    lines.push(`Topic: ${result.topic || "N/A"}`);
    lines.push(`Duration: ${result.timer || "N/A"}`);
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push("");
    (result.transcript || []).forEach((t: any, i: number) => {
      const speaker = t.speakerName || t.sender || "Speaker";
      const msg = t.message || t.text || "";
      lines.push(`[${i + 1}] ${speaker}`);
      lines.push(msg);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debate_transcript_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const verdict = result.verdict;
  const breakdown = result.scores?.breakdown;

  return (
    <div className="results-page">
      <div className="res-trophy">🏆</div>
      <h2 className="res-title">Debate Complete!</h2>
      <p className="res-sub">
        Session lasted <strong style={{ color: "var(--ind)" }}>{result.timer}</strong> with{" "}
        <strong>{result.participants}</strong> participant(s) on{" "}
        <strong>{result.topic}</strong>.
      </p>

      {result.subMode === "ai" && (
        <div style={{ width: "100%", maxWidth: 460, marginBottom: 20 }}>
          <div style={{ background: "var(--surf)", border: "1px solid var(--bdr)", borderRadius: 18, padding: 18, boxShadow: "var(--sh)" }}>
            {breakdown ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["Reasoning", breakdown.reasoning],
                  ["Knowledge", breakdown.textbook_knowledge],
                  ["Argumentation", breakdown.argumentation],
                  ["Communication", breakdown.communication],
                ].map(([label, value]: any) => (
                  <div key={label} style={{ background: "var(--surf2)", borderRadius: 12, padding: "10px 12px", textAlign: "center" as const }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ind)" }}>{value ?? "-"}</div>
                    <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 700 }}>{label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
                <div style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "var(--ind)" }}>{result.scores?.you ?? "-"}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)" }}>You</div>
                </div>
                <div style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "var(--vio)" }}>{result.scores?.ai ?? "-"}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)" }}>AI</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {result.subMode === "multi" && verdict && (
        <div style={{ width: "100%", maxWidth: 460, marginBottom: 20 }}>
          {verdict.winnerTeam && (
            <div
              style={{
                marginBottom: 12,
                padding: "12px 20px",
                borderRadius: 16,
                background: verdict.winnerTeam === "A" ? "rgba(99,102,241,.1)" : "rgba(236,72,153,.1)",
                border: `1.5px solid ${verdict.winnerTeam === "A" ? "rgba(99,102,241,.3)" : "rgba(236,72,153,.3)"}`,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 900, color: verdict.winnerTeam === "A" ? "#4f46e5" : "#db2777" }}>
                🏅 Team {verdict.winnerTeam} Wins!
              </div>
              <div style={{ fontSize: 12.5, color: "var(--t2)" }}>
                Team A: {verdict.teamAScore} pts · Team B: {verdict.teamBScore} pts
              </div>
            </div>
          )}
          {verdict.winner && (
            <div style={{ background: "var(--surf)", border: "1px solid var(--bdr)", borderRadius: 18, padding: 18, boxShadow: "var(--sh)", textAlign: "left" as const }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 6 }}>
                MVP
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--t1)" }}>{verdict.winner.name}</div>
              <div style={{ fontSize: 12, color: "var(--t3)" }}>Team {verdict.winner.team} · {verdict.winner.debateScore} pts</div>
            </div>
          )}
        </div>
      )}

      <div className="res-stats">
        <div className="res-stat">
          <div className="res-stat-ico">⏱️</div>
          <div className="res-stat-val">{result.timer}</div>
          <div className="res-stat-lbl">Duration</div>
        </div>
        <div className="res-stat">
          <div className="res-stat-ico">👥</div>
          <div className="res-stat-val">{result.participants}</div>
          <div className="res-stat-lbl">Participants</div>
        </div>
        <div className="res-stat">
          <div className="res-stat-ico">💬</div>
          <div className="res-stat-val">{result.transcript?.length || 0}</div>
          <div className="res-stat-lbl">Exchanges</div>
        </div>
      </div>

      <div className="res-actions">
        {(result.transcript || []).length > 0 && (
          <button className="btn-s" onClick={downloadTranscript}>
            📄 Download Transcript
          </button>
        )}
        <button className="btn-p" style={{ fontSize: 13, width: "auto", padding: "11px 24px" }} onClick={onDone}>
          Back to History
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
type Screen = "history" | "setup" | "room" | "results-loading" | "results";

export default function TeacherDebatePage() {
  const [screen, setScreen] = useState<Screen>("history");
  const [config, setConfig] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  return (
    <>
      <style>{CSS}</style>
      <div className="dp-app">
        {screen === "history" && (
          <DebateHistoryScreen onNew={() => setScreen("setup")} />
        )}

        {screen === "setup" && (
          <DebateSetup
            onBack={() => setScreen("history")}
            onLaunch={(cfg) => {
              setConfig(cfg);
              setScreen("room");
            }}
          />
        )}

        {screen === "room" && config?.subMode === "ai" && (
          <AIDebateRoom
            config={config}
            onEnd={(res) => {
              setConfig(null);
              setResult(res);
              setScreen("results");
            }}
          />
        )}

        {screen === "room" && config?.subMode === "multi" && (
          <TeamDebateRoom
            config={config}
            onEnd={(res) => {
              setConfig(null);
              setResult(res);
              setScreen("results");
            }}
          />
        )}

        {screen === "results-loading" && (
          <DebateLoadingScreen
            title="Generating debate results"
            subtitle="Reviewing turns and scoring performance..."
            progress={78}
          />
        )}

        {screen === "results" && result && (
          <DebateResults
            result={result}
            onDone={() => {
              setResult(null);
              setScreen("history");
            }}
          />
        )}
      </div>
    </>
  );
}