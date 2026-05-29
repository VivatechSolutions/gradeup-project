import { useState, useEffect, useRef, useCallback } from "react";
import Navigation from "../components/navigation";
import { useAuth } from "../hooks/use-auth";
import { useNotificationStore } from "../lib/notification-store";
import { useSessionState } from "../hooks/useSessionState";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
:root{
  --bg:#f8fafc;--surf:#fff;--surf2:#f8fafc;--surf3:#f1f5f9;
  --bdr:rgba(0,0,0,.06);--bdr2:rgba(0,0,0,.1);
  --ind:#0ea5e9;--ind2:#38bdf8;--ind3:#7dd3fc;
  --em:#10b981;--amb:#f59e0b;--sky:#38bdf8;--red:#ef4444;--vio:#8b5cf6;--pink:#ec4899;
  --t1:#0f172a;--t2:#475569;--t3:#94a3b8;--t4:#e2e8f0;
  --font:'Plus Jakarta Sans',system-ui,sans-serif;
  --sh:0 2px 12px rgba(0,0,0,.05);--sh2:0 8px 32px rgba(0,0,0,.12);--sh3:0 24px 64px rgba(0,0,0,.18);
  --grad:linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%);
  --grad-meet:linear-gradient(135deg,#0ea5e9 0%,#38bdf8 100%);
  --grad-ai:linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%);
  --r:20px;
}
.dark{--bg:#0b1120;--surf:#1e293b;--surf2:#0f172a;--surf3:#334155;--bdr:rgba(255,255,255,.07);--bdr2:rgba(255,255,255,.1);--t1:#f1f5f9;--t2:#94a3b8;--t3:#64748b;--t4:#334155;}
body{font-family:var(--font);background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(14,165,233,.2);border-radius:4px}
button,input,select,textarea{font-family:var(--font)}
.mp-app{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}

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
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes tIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes strikeShake{0%,100%{transform:translateX(-50%)}20%{transform:translateX(calc(-50% - 6px))}40%{transform:translateX(calc(-50% + 6px))}60%{transform:translateX(calc(-50% - 4px))}80%{transform:translateX(calc(-50% + 4px))}}
@keyframes aiPulse{0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,.4)}70%{box-shadow:0 0 0 8px rgba(139,92,246,0)}}
@keyframes teacherIn{from{opacity:0;transform:translate(-50%,-20px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes dotPulse{0%,80%,100%{transform:scale(.5);opacity:.4}40%{transform:scale(1);opacity:1}}
@keyframes urgentPulse{0%,100%{border-color:rgba(239,68,68,.4)}50%{border-color:rgba(239,68,68,.9);box-shadow:0 0 0 3px rgba(239,68,68,.15)}}

.mp-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--surf);border:1.5px solid var(--bdr);border-radius:13px;padding:10px 17px;font-size:12.5px;font-weight:700;color:var(--t1);box-shadow:var(--sh2);z-index:9999;display:flex;align-items:center;gap:7px;animation:tIn .32s cubic-bezier(.34,1.2,.64,1);white-space:nowrap;max-width:calc(100vw - 28px)}
.mp-toast.success{border-color:rgba(16,185,129,.4)}.mp-toast.error{border-color:rgba(239,68,68,.4)}.mp-toast.warn{border-color:rgba(245,158,11,.4)}.mp-toast.info{border-color:rgba(14,165,233,.4)}
.loader-spin{width:20px;height:20px;border-radius:50%;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .7s linear infinite;flex-shrink:0}
.loader-spin.dark{border-color:rgba(14,165,233,.2);border-top-color:var(--ind)}

.fi{margin-bottom:10px}
.fl{display:block;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--t3);margin-bottom:5px}
.finput{width:100%;padding:10px 12px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);color:var(--t1);font-size:13px;outline:none;transition:all .18s}
.finput:focus{border-color:var(--ind);background:var(--surf);box-shadow:0 0 0 3px rgba(14,165,233,.1)}
.finput::placeholder{color:var(--t3)}
select.finput{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}
.fi-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}

.btn-p{padding:11px 20px;border-radius:13px;border:none;cursor:pointer;background:var(--grad-meet);color:#fff;font-size:13px;font-weight:700;transition:all .22s;box-shadow:0 5px 18px rgba(14,165,233,.28);display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font);width:100%}
.btn-p:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 9px 26px rgba(14,165,233,.38)}
.btn-p:disabled{opacity:.38;cursor:not-allowed;transform:none;box-shadow:none}
.btn-p.ai-btn{background:var(--grad-ai);box-shadow:0 5px 18px rgba(139,92,246,.28)}
.btn-p.ai-btn:hover:not(:disabled){box-shadow:0 9px 26px rgba(139,92,246,.38)}
.btn-p.pdf-btn{background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 5px 18px rgba(239,68,68,.28)}
.btn-p.pdf-btn:hover:not(:disabled){box-shadow:0 9px 26px rgba(239,68,68,.38)}
.btn-s{padding:9px 16px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn-s:hover{border-color:rgba(14,165,233,.32);color:var(--t1);background:rgba(14,165,233,.04)}
.btn-d{padding:9px 16px;border-radius:11px;border:1.5px solid rgba(239,68,68,.25);background:rgba(239,68,68,.06);cursor:pointer;color:var(--red);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn-d:hover{background:rgba(239,68,68,.12)}
.btn-g{padding:9px 16px;border-radius:11px;border:1.5px solid rgba(16,185,129,.3);background:rgba(16,185,129,.07);cursor:pointer;color:var(--em);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn-g:hover{background:rgba(16,185,129,.14)}

.link-box{border-radius:14px;background:rgba(14,165,233,.04);border:1.5px solid rgba(14,165,233,.16);padding:12px 14px;margin-bottom:10px}
.link-box-title{font-size:10px;font-weight:800;color:var(--ind);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
.link-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:10px;background:var(--surf);border:1.5px solid var(--bdr)}
.link-val{flex:1;font-family:monospace;font-size:10.5px;color:var(--ind);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.copy-btn{padding:5px 11px;border-radius:7px;border:none;cursor:pointer;background:var(--grad-meet);color:#fff;font-size:11.5px;font-weight:800;transition:.18s;flex-shrink:0}
.copy-btn:hover{transform:scale(1.05)}
.share-actions{display:flex;gap:6px;margin-top:7px}
.share-btn{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:11.5px;font-weight:700;color:var(--t2);transition:.2s;display:flex;align-items:center;justify-content:center;gap:5px}
.share-btn:hover{border-color:rgba(14,165,233,.3);color:var(--ind);background:rgba(14,165,233,.04)}

.steps{display:flex;flex-direction:column;gap:5px;margin-bottom:13px}
.step-row{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);transition:.22s}
.step-row.done{border-color:rgba(16,185,129,.32);background:rgba(16,185,129,.05)}
.step-row.act{border-color:rgba(14,165,233,.32);background:rgba(14,165,233,.05)}
.step-row.pend{opacity:.45}
.step-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;flex-shrink:0}
.step-row.done .step-num{background:var(--em);color:#fff}
.step-row.act .step-num{background:var(--ind);color:#fff}
.step-row.pend .step-num{background:var(--surf3);color:var(--t3)}
.step-lbl{font-size:12px;font-weight:700}
.step-row.done .step-lbl{color:var(--em)}.step-row.act .step-lbl{color:var(--t1)}.step-row.pend .step-lbl{color:var(--t3)}

.sec-div{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--t3);margin-bottom:8px;margin-top:4px;display:flex;align-items:center;gap:7px}
.sec-div::after{content:'';flex:1;height:1px;background:var(--bdr)}

.cam-wrap{width:100%;aspect-ratio:16/9;border-radius:12px;background:var(--surf3);border:1.5px solid var(--bdr);overflow:hidden;position:relative;margin-bottom:10px}
.cam-wrap video{width:100%;height:100%;object-fit:cover}
.cam-off{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;background:linear-gradient(135deg,rgba(14,165,233,.05),rgba(99,102,241,.03))}
.cam-av{width:52px;height:52px;border-radius:50%;background:var(--grad-meet);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;box-shadow:0 8px 22px rgba(14,165,233,.36);animation:scaleIn .4s ease}
.cam-nametag{position:absolute;bottom:9px;left:9px;background:rgba(0,0,0,.68);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:3px 8px;font-size:10.5px;font-weight:700;color:#fff}
.cam-perm-bar{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
.cam-perm-btn{flex:1;min-width:88px;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 10px;border-radius:9px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;font-size:11.5px;font-weight:700;transition:.18s}
.cam-perm-btn.granted{background:rgba(16,185,129,.07);border-color:rgba(16,185,129,.3);color:var(--em)}
.cam-perm-btn.denied{background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.25);color:var(--red)}
.cam-perm-btn.req{background:rgba(14,165,233,.07);border-color:rgba(14,165,233,.25);color:var(--ind)}
.perm-warn{font-size:11.5px;color:#fca5a5;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);border-radius:9px;padding:8px 11px;margin-top:7px;line-height:1.6}

.type-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}
.type-card{padding:16px 14px;border-radius:14px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .22s;display:flex;align-items:flex-start;gap:10px}
.type-card:hover{border-color:rgba(14,165,233,.32);background:rgba(14,165,233,.03);transform:translateY(-2px)}
.type-card.sel{border-color:var(--ind);background:rgba(14,165,233,.06)}
.type-ico{font-size:22px;flex-shrink:0;margin-top:1px}
.type-title{font-size:12.5px;font-weight:800;color:var(--t1);margin-bottom:2px}
.type-desc{font-size:10.5px;color:var(--t2);line-height:1.5}

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
.lo-progress-fill{height:100%;background:var(--grad-meet);border-radius:4px;transition:width .4s ease}

.teacher-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:11px;border:1.5px solid rgba(139,92,246,.25);background:rgba(139,92,246,.05);margin-bottom:5px;animation:scaleIn .22s ease;transition:.2s;cursor:pointer}
.teacher-row:hover{border-color:rgba(139,92,246,.5);background:rgba(139,92,246,.08)}
.teacher-row.selected{border-color:var(--vio);background:rgba(139,92,246,.1)}
.teacher-badge{padding:2px 8px;border-radius:5px;background:rgba(139,92,246,.15);color:var(--vio);font-size:9.5px;font-weight:800;flex-shrink:0}
.invite-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex-shrink:0}
.invite-info{flex:1;min-width:0}
.invite-name{font-size:12px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invite-type{font-size:10px;color:var(--t3)}
.invite-rm{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--bdr);background:var(--surf3);cursor:pointer;color:var(--t3);display:flex;align-items:center;justify-content:center;font-size:10px;transition:.15s;flex-shrink:0}
.invite-rm:hover{background:rgba(239,68,68,.1);color:var(--red);border-color:rgba(239,68,68,.25)}

.mp-setup{height:100dvh;display:grid;grid-template-columns:32% 1fr;overflow:hidden}
.mp-setup-left{background:#060c1a;overflow:hidden;position:relative;display:flex;flex-direction:column}
.mp-setup-left-inner{overflow-y:auto;flex:1;padding:clamp(20px,3vw,44px);display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2}
.mp-orbs{position:absolute;inset:0;pointer-events:none}
.mp-orb{position:absolute;border-radius:50%}
.mp-orb1{width:320px;height:320px;background:radial-gradient(circle,rgba(14,165,233,.18) 0%,transparent 70%);top:-80px;left:-60px;animation:orbFloat 9s ease-in-out infinite}
.mp-orb2{width:220px;height:220px;background:radial-gradient(circle,rgba(99,102,241,.13) 0%,transparent 70%);bottom:-40px;right:-30px;animation:orbFloat 11s ease-in-out infinite reverse}
.mp-orb3{width:160px;height:160px;background:radial-gradient(circle,rgba(139,92,246,.1) 0%,transparent 70%);top:40%;left:30%;animation:orbFloat 7s ease-in-out infinite}
.mp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(14,165,233,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,.06) 1px,transparent 1px);background-size:38px 38px;pointer-events:none}
.mp-logo{display:flex;align-items:center;gap:8px;margin-bottom:20px;animation:fadeUp .5s ease both}
.mp-logo-ico{width:32px;height:32px;background:var(--grad-meet);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 6px 18px rgba(14,165,233,.38)}
.mp-logo-name{font-size:14px;font-weight:800;background:linear-gradient(90deg,#fff,var(--ind3));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.mp-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;background:rgba(14,165,233,.15);border:1px solid rgba(14,165,233,.3);font-size:10px;font-weight:800;color:var(--ind3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;animation:fadeUp .5s ease .1s both;width:fit-content}
.mp-tag-dot{width:5px;height:5px;border-radius:50%;background:var(--em);animation:pulse 2s infinite}
.mp-h1{font-size:clamp(18px,2.2vw,32px);font-weight:900;line-height:1.06;letter-spacing:-1px;color:#fff;margin-bottom:10px;animation:fadeUp .5s ease .16s both}
.mp-h1 .gt{background:var(--grad-meet);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.mp-p{font-size:12px;color:rgba(255,255,255,.42);line-height:1.85;margin-bottom:20px;animation:fadeUp .5s ease .22s both}
.mp-feats-left{display:flex;flex-direction:column;gap:6px;animation:fadeUp .5s ease .28s both}
.mp-feat-left{display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;transition:.3s}
.mp-feat-left:hover{background:rgba(14,165,233,.1);border-color:rgba(14,165,233,.28)}
.mp-feat-ico{width:34px;height:34px;border-radius:9px;background:rgba(14,165,233,.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.mp-feat-ico.ai{background:rgba(139,92,246,.25)}
.mp-feat-txt strong{display:block;font-size:12px;font-weight:700;color:#fff;margin-bottom:1px}
.mp-feat-txt span{font-size:10px;color:rgba(255,255,255,.38)}
.mp-setup-right{background:var(--surf);overflow:hidden;display:flex;flex-direction:column}
.mp-setup-scroll{overflow-y:auto;flex:1;padding:clamp(20px,3vw,44px)}
.mp-setup-inner{max-width:620px;width:100%;margin:0 auto}
.setup-title{font-size:clamp(17px,2vw,24px);font-weight:900;letter-spacing:-.4px;margin-bottom:3px;color:var(--t1)}
.setup-sub{font-size:12px;color:var(--t2);margin-bottom:18px;line-height:1.6}

.waiting-room{height:100dvh;display:flex;align-items:center;justify-content:center;background:#060c1a;flex-direction:column;gap:16px;padding:24px;text-align:center}
.teacher-approval-wait{height:100dvh;display:flex;align-items:center;justify-content:center;background:#07080f;flex-direction:column;gap:18px;padding:24px;text-align:center}
.taw-orb{width:90px;height:90px;border-radius:50%;background:rgba(139,92,246,.15);border:2.5px solid rgba(139,92,246,.4);display:flex;align-items:center;justify-content:center;font-size:36px;animation:aiPulse 2s infinite}
.taw-title{font-size:22px;font-weight:800;color:#fff}
.taw-sub{font-size:13px;color:rgba(255,255,255,.4);max-width:380px;line-height:1.8}
.taw-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 18px;max-width:360px;width:100%;text-align:left}
.taw-card-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-size:12px;color:rgba(255,255,255,.5)}
.taw-card-row strong{color:rgba(255,255,255,.85)}

/* ── ROOM ── */
.mp-room{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:#060c1a}
.room-bar{height:52px;background:rgba(6,12,26,.97);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 14px;gap:8px;flex-shrink:0;z-index:100}
.room-logo{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:#fff;flex-shrink:0;border:none;background:none;font-family:var(--font)}
.room-logo-ico{width:26px;height:26px;background:var(--grad-meet);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px}
.rbar-div{width:1px;height:15px;background:rgba(255,255,255,.08);flex-shrink:0}
.rbar-topic{flex:1;font-size:11.5px;color:rgba(255,255,255,.4);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rbar-topic strong{color:#fff}
.rbar-pill{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:10.5px;font-weight:700;flex-shrink:0}
.pill-timer{background:rgba(14,165,233,.14);border:1px solid rgba(14,165,233,.22);color:var(--ind3);font-family:monospace}
.pill-rec{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.22);color:var(--red);animation:recBlink 1.5s infinite}
.pill-rec-dot{width:5px;height:5px;border-radius:50%;background:var(--red)}
.pill-ai{background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);color:#c4b5fd}
.pill-warn{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:var(--red);animation:urgentPulse 1.5s infinite}
.rbar-end{padding:5px 12px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);cursor:pointer;font-size:11px;font-weight:700;transition:.15s;flex-shrink:0;font-family:var(--font)}
.rbar-end:hover{background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.35);color:var(--red)}

/* TILE SIZE CONTROLS */
.tile-size-bar{display:flex;align-items:center;gap:3px;padding:3px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);flex-shrink:0}
.tsz-btn{padding:3px 8px;border-radius:5px;border:none;cursor:pointer;font-size:10px;font-weight:700;font-family:var(--font);transition:.15s;background:none;color:rgba(255,255,255,.4)}
.tsz-btn.active{background:var(--grad-meet);color:#fff;box-shadow:0 2px 6px rgba(14,165,233,.3)}

.room-body{flex:1;display:flex;min-height:0;overflow:hidden}
.grid-area{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}

/* ── VIDEO OUTER — tile size modes ── */
.vid-outer{flex:1;overflow:hidden;position:relative;min-height:0}
.vid-outer.full{overflow-y:auto}
.vid-outer.medium{overflow:hidden}
.vid-outer.small{overflow-y:auto}
.vid-outer.medium .vid-grid{height:100%}
.vid-outer.small .tile{min-height:60px}
.vid-outer.small .tile-av{width:24px!important;height:24px!important;font-size:9px!important}
.vid-outer.small .vid-grid{grid-template-columns:repeat(5,1fr)!important;grid-template-rows:none!important;align-content:start}
.vid-outer.full .vid-grid{grid-template-rows:none!important;align-content:start}
.vid-outer.full .tile{height:120px}
.vid-outer.small .tile{height:80px}

/* SCREENSHARE LAYOUT */
.vid-outer.screenshare-active{display:flex;gap:5px;padding:7px;overflow:hidden}
.screenshare-main{flex:1;border-radius:10px;background:#0d1428;overflow:hidden;position:relative;min-height:0;min-width:0;display:flex;align-items:center;justify-content:center;border:2px solid rgba(14,165,233,.4)}
.screenshare-sidebar{width:200px;min-width:200px;display:flex;flex-direction:column;gap:5px;overflow-y:auto}
.screenshare-sidebar-inner{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.screen-label{position:absolute;top:8px;left:8px;background:rgba(14,165,233,.85);border-radius:6px;padding:2px 9px;font-size:9.5px;font-weight:800;color:#fff}

/* VIDEO GRID */
.vid-grid{display:grid;gap:5px;padding:7px;min-height:0;align-content:start}
.vid-outer.medium .vid-grid{height:100%;align-content:stretch}
.vg-1 {grid-template-columns:1fr;grid-template-rows:1fr;}
.vg-2 {grid-template-columns:1fr 1fr;grid-template-rows:1fr;}
.vg-3 {grid-template-columns:repeat(3,1fr);grid-template-rows:1fr;}
.vg-4 {grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;}
.vg-5 {grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;}
.vg-6 {grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;}
.vg-7 {grid-template-columns:repeat(4,1fr);grid-template-rows:1fr 1fr;}
.vg-8 {grid-template-columns:repeat(4,1fr);grid-template-rows:1fr 1fr;}
.vg-9 {grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr 1fr;}
.vg-10{grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);}
.vg-11{grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);}
.vg-12{grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);}
.vg-13{grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(3,1fr);}
.vg-14{grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(3,1fr);}
.vg-15{grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(3,1fr);}
.vg-16{grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);}

/* TILE */
.tile{border-radius:10px;background:#0d1428;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;min-height:0;min-width:0;width:100%;height:100%;animation:tileIn .28s ease;}
.tile.spk{box-shadow:0 0 0 2px var(--em),0 0 16px rgba(16,185,129,.2);}
.tile video{width:100%;height:100%;object-fit:cover;display:block}
.tile-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;width:clamp(28px,4vw,60px);height:clamp(28px,4vw,60px);font-size:clamp(11px,1.6vw,24px);}
.tile-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.85));padding:14px 8px 6px;display:flex;align-items:flex-end;justify-content:space-between;gap:4px}
.tile-name{font-size:clamp(8px,.85vw,11px);font-weight:700;color:#fff;display:flex;align-items:center;gap:3px;flex-wrap:wrap;line-height:1.2}
.t-badge{font-size:7px;font-weight:800;padding:1px 4px;border-radius:20px;color:#fff;white-space:nowrap}
.t-host{background:var(--amb);color:#000}.t-you{background:rgba(255,255,255,.17)}.t-teacher{background:var(--vio)}.t-ai{background:linear-gradient(90deg,#8b5cf6,#6366f1)}
.tile-muted{width:16px;height:16px;border-radius:50%;background:rgba(239,68,68,.85);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:7.5px}
.tile-react{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:32px;animation:rPop 2.2s forwards;pointer-events:none;z-index:5}
.tile-wave{position:absolute;top:7px;right:7px;display:flex;align-items:center;gap:1.5px;height:16px}
.tile-wave-bar{width:2px;border-radius:2px;animation:waveBar .65s ease-in-out infinite}
.tile-strike{position:absolute;top:5px;right:5px;background:rgba(239,68,68,.85);border-radius:5px;padding:1px 5px;font-size:8.5px;font-weight:800;color:#fff}
.tile-fullscreen-btn{position:absolute;top:5px;left:5px;width:20px;height:20px;border-radius:5px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.7);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;opacity:0;transition:.15s}
.tile:hover .tile-fullscreen-btn{opacity:1}
.ai-teacher-tile{border-radius:10px;background:linear-gradient(135deg,#150a2e,#1a1040);overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;animation:tileIn .28s ease;border:2px solid rgba(139,92,246,.4);min-height:0;min-width:0;width:100%;height:100%}
.ai-teacher-av{width:clamp(28px,4vw,60px);height:clamp(28px,4vw,60px);border-radius:50%;background:var(--grad-ai);display:flex;align-items:center;justify-content:center;font-size:clamp(14px,2vw,28px);animation:aiPulse 2s infinite}
.ai-teacher-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.9));padding:12px 8px 6px;display:flex;align-items:flex-end;justify-content:space-between;gap:4px}
.ai-teacher-label{font-size:clamp(8px,.85vw,11px);font-weight:700;color:#fff;display:flex;align-items:center;gap:5px}
.ai-badge{padding:1px 5px;border-radius:5px;background:rgba(139,92,246,.7);color:#fff;font-size:7px;font-weight:800}

/* FULLSCREEN OVERLAY */
.tile-fullscreen-overlay{position:fixed;inset:0;background:#000;z-index:9000;display:flex;flex-direction:column}
.tfo-bar{padding:10px 16px;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.tfo-name{color:#fff;font-size:14px;font-weight:700}
.tfo-close{padding:5px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-size:12px;font-weight:700;font-family:var(--font)}
.tfo-content{flex:1;display:flex;align-items:center;justify-content:center}

/* CTRL BAR */
.ctrl-bar{min-height:58px;padding:7px 12px;background:rgba(6,12,26,.98);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:6px;flex-wrap:wrap}
.cg{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.cbtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.09);cursor:pointer;background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);font-size:8px;font-weight:700;transition:all .18s;min-width:38px;font-family:var(--font)}
.cbtn-ico{font-size:12px;transition:transform .2s}
.cbtn:hover{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2);transform:translateY(-2px)}
.cbtn.on{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.36);color:var(--em)}
.cbtn.off{background:rgba(239,68,68,.09);border-color:rgba(239,68,68,.3);color:var(--red)}
.cbtn.hi{background:rgba(14,165,233,.12);border-color:rgba(14,165,233,.36);color:var(--ind3)}
.cbtn.amb{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:var(--amb)}
.cbtn.vio{background:rgba(139,92,246,.14);border-color:rgba(139,92,246,.4);color:var(--vio)}
.cbtn.rec{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.46);color:var(--red);animation:recBlink 1.5s infinite}
.cbtn.red-hi{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.46);color:var(--red)}
.cbtn.screen-active{background:rgba(14,165,233,.2);border-color:rgba(14,165,233,.5);color:var(--ind3);animation:recBlink 2s infinite}
.end-btn{padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:11px;font-weight:800;font-family:var(--font);box-shadow:0 3px 10px rgba(239,68,68,.28);transition:.2s;white-space:nowrap}
.end-btn:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(239,68,68,.42)}
.react-pop{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#141e36;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 10px;display:flex;gap:6px;box-shadow:var(--sh2);z-index:200;animation:scaleIn .2s ease}
.react-emoji{font-size:18px;cursor:pointer;padding:4px;border-radius:7px;border:none;background:none;transition:.15s}
.react-emoji:hover{transform:scale(1.45)}
.rec-overlay{position:fixed;top:60px;right:12px;background:rgba(239,68,68,.92);border-radius:8px;padding:4px 11px;font-size:11px;font-weight:800;color:#fff;z-index:200;animation:recBlink 1.5s infinite}

.side-panel{width:288px;min-width:288px;background:rgba(6,12,26,.98);border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden}
.panel-tabs-dark{display:flex;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.ptab{flex:1;padding:8px 3px;background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,.3);font-size:8px;font-weight:700;cursor:pointer;transition:.18s;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:var(--font)}
.ptab:hover{color:rgba(255,255,255,.65)}
.ptab.active{color:var(--ind3);border-bottom-color:var(--ind)}
.ptab-cls{flex:0;padding:8px 6px;color:rgba(255,255,255,.22);border:none;background:none;cursor:pointer}
.pscroll{flex:1;overflow-y:auto;min-height:0}

.p-list{padding:6px;display:flex;flex-direction:column;gap:4px}
.p-row{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:.18s}
.p-row:hover{border-color:rgba(14,165,233,.28);background:rgba(14,165,233,.07)}
.p-row.spk{border-color:rgba(16,185,129,.4);background:rgba(16,185,129,.06)}
.p-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
.p-info{flex:1;min-width:0}
.p-name{font-size:11px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.p-role{font-size:9px;color:rgba(255,255,255,.28)}

.chat-msgs{padding:7px;display:flex;flex-direction:column;gap:5px}
.chat-msg{display:flex;gap:5px;animation:fadeUp .2s ease}
.chat-msg.own{flex-direction:row-reverse}
.chat-av-sm{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;flex-shrink:0;align-self:flex-end}
.chat-bwrap{display:flex;flex-direction:column;gap:2px;max-width:86%}
.chat-msg.own .chat-bwrap{align-items:flex-end}
.chat-sender{font-size:8.5px;font-weight:700;color:rgba(255,255,255,.28)}
.chat-bubble{padding:6px 9px;border-radius:9px;font-size:11px;line-height:1.5;word-break:break-word}
.bubble-o{background:rgba(255,255,255,.07);color:#fff;border-radius:3px 9px 9px 9px;border:1px solid rgba(255,255,255,.08)}
.bubble-own{background:var(--grad-meet);color:#fff;border-radius:9px 3px 9px 9px}
.bubble-ai{background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.22);color:#fff;border-radius:3px 9px 9px 9px}
.bubble-ai-warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);color:var(--amb);border-radius:3px 9px 9px 9px}
.bubble-blocked{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.2);color:rgba(255,255,255,.4);font-style:italic;border-radius:9px;text-decoration:line-through}
.chat-time{font-size:8px;color:rgba(255,255,255,.2)}
.chat-empty{text-align:center;color:rgba(255,255,255,.2);font-size:11px;padding:18px 10px;line-height:1.7}
.chat-ia{padding:6px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;display:flex;gap:5px;align-items:flex-end}
.chat-inp{flex:1;padding:6px 9px;border-radius:8px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:11px;outline:none;resize:none;min-height:30px;max-height:68px;transition:border .15s;font-family:var(--font)}
.chat-inp:focus{border-color:var(--ind)}
.chat-inp::placeholder{color:rgba(255,255,255,.2)}
.chat-inp:disabled{opacity:.4;cursor:not-allowed}
.chat-send{width:28px;height:28px;border-radius:7px;background:var(--grad-meet);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.18s;font-size:11px}
.chat-send:hover{transform:scale(1.12)}
.chat-send:disabled{opacity:.4;cursor:not-allowed}
.chat-muted-banner{padding:6px 10px;background:rgba(239,68,68,.12);border-top:1px solid rgba(239,68,68,.2);font-size:10px;font-weight:700;color:var(--red);text-align:center}

.ai-summary-card{background:rgba(139,92,246,.07);border:1.5px solid rgba(139,92,246,.22);border-radius:10px;padding:9px 11px;margin:5px 0}
.ai-summary-title{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--vio);margin-bottom:4px}
.ai-summary-body{font-size:10.5px;color:rgba(255,255,255,.6);line-height:1.6}

/* SPEECH PANEL */
.speech-row{display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);margin-bottom:3px}
.speech-av{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
.speech-name{font-size:10px;font-weight:700;color:rgba(255,255,255,.6);margin-bottom:2px}
.speech-text{font-size:10px;color:rgba(255,255,255,.45);line-height:1.5}
.speech-time{font-size:8px;color:rgba(255,255,255,.2);margin-left:auto;flex-shrink:0;padding-top:1px}

.log-row{display:flex;gap:6px;padding:6px 8px;border-radius:8px;border-left:3px solid var(--bdr2);background:rgba(255,255,255,.04);margin-bottom:3px;font-size:10.5px}
.log-row.flag-bad{border-left-color:var(--red);background:rgba(239,68,68,.06)}
.log-row.flag-cheat{border-left-color:var(--vio);background:rgba(139,92,246,.06)}
.log-row.flag-gossip{border-left-color:var(--amb);background:rgba(245,158,11,.06)}
.log-time{font-size:9px;color:rgba(255,255,255,.3);white-space:nowrap;flex-shrink:0;padding-top:1px}
.log-content{flex:1}
.log-user{font-weight:700;color:rgba(255,255,255,.7)}
.log-detail{color:rgba(255,255,255,.35);margin-top:1px}
.log-cat{font-size:8.5px;font-weight:800;padding:1px 5px;border-radius:4px;display:inline-block;margin-top:2px}
.cat-bad{background:rgba(239,68,68,.15);color:var(--red)}
.cat-cheat{background:rgba(139,92,246,.15);color:var(--vio)}
.cat-gossip{background:rgba(245,158,11,.15);color:var(--amb)}

.strike-alert{position:fixed;top:68px;left:50%;transform:translateX(-50%);z-index:9000;background:rgba(15,23,42,.97);border:2px solid var(--red);border-radius:14px;padding:13px 18px;min-width:240px;max-width:340px;animation:strikeShake .5s ease;box-shadow:0 0 28px rgba(239,68,68,.3)}
.strike-alert-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.strike-badge{background:var(--red);color:#fff;font-size:10px;font-weight:800;padding:2px 9px;border-radius:20px}
.strike-msg{font-size:11px;color:rgba(255,255,255,.75);line-height:1.6}
.strike-count{font-size:10px;font-weight:800;margin-top:5px;color:var(--amb)}

.teacher-join-banner{position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:500;background:rgba(16,185,129,.95);backdrop-filter:blur(10px);border-radius:14px;padding:10px 18px;display:flex;align-items:center;gap:10px;font-size:12.5px;font-weight:700;color:#fff;box-shadow:0 8px 28px rgba(16,185,129,.4);animation:teacherIn .4s cubic-bezier(.34,1.2,.64,1)}
.urgent-teacher-alert{position:fixed;top:68px;left:50%;transform:translateX(-50%);z-index:8999;background:rgba(15,23,42,.98);border:2px solid var(--amb);border-radius:14px;padding:11px 16px;min-width:240px;max-width:360px;box-shadow:0 0 26px rgba(245,158,11,.28);animation:modalUp .3s ease}

.join-request-pop{position:fixed;top:68px;right:16px;z-index:650;width:min(310px,calc(100vw - 32px));background:rgba(6,12,26,.98);border:1px solid rgba(255,255,255,.09);border-radius:15px;box-shadow:var(--sh3);overflow:hidden;animation:modalUp .24s cubic-bezier(.34,1.2,.64,1)}
.join-request-head{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:space-between;gap:10px}

.hq-row{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:9px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);margin-bottom:3px;animation:scaleIn .2s ease}
.hq-num{width:18px;height:18px;border-radius:50%;background:var(--amb);color:#fff;font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}

.lock-banner{display:flex;align-items:center;gap:7px;padding:5px 14px;background:rgba(239,68,68,.1);border-bottom:1px solid rgba(239,68,68,.2)}

/* RESULTS */
.results-page{height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:clamp(16px,2.5vw,36px);text-align:center;overflow-y:auto;background:radial-gradient(ellipse at 50% 15%,rgba(14,165,233,.07) 0%,transparent 65%)}
.res-trophy{font-size:48px;margin-bottom:8px;animation:scaleIn .6s cubic-bezier(.34,1.56,.64,1) .2s both}
.res-title{font-size:clamp(17px,2.8vw,28px);font-weight:900;letter-spacing:-.6px;margin-bottom:4px;color:var(--t1)}
.res-sub{font-size:12.5px;color:var(--t2);max-width:420px;line-height:1.75;margin-bottom:12px}
.res-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;width:100%;max-width:520px;margin-bottom:12px}
.res-stat{background:var(--surf);border:1px solid var(--bdr);border-radius:13px;padding:10px 8px;box-shadow:var(--sh);animation:fadeUp .4s ease both;text-align:center}
.res-stat-ico{font-size:16px;margin-bottom:3px}
.res-stat-val{font-size:clamp(14px,2vw,21px);font-weight:900;color:var(--ind)}
.res-stat-lbl{font-size:9px;color:var(--t3);margin-top:2px}
.res-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px}

.pdf-sent-banner{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:13px;background:linear-gradient(135deg,rgba(139,92,246,.1),rgba(99,102,241,.08));border:1.5px solid rgba(139,92,246,.28);margin-bottom:14px;width:100%;max-width:680px;text-align:left}
.pdf-sent-icon{width:40px;height:40px;border-radius:11px;background:var(--grad-ai);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.pdf-sent-title{font-size:13px;font-weight:800;color:var(--t1);margin-bottom:2px}
.pdf-sent-sub{font-size:11.5px;color:var(--t2)}

.teacher-report-card{width:100%;max-width:720px;background:var(--surf);border:1px solid var(--bdr);border-radius:18px;padding:18px;margin-bottom:12px;text-align:left;box-shadow:var(--sh)}
.teacher-report-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--vio);margin-bottom:12px}
.report-section{margin-bottom:10px}
.report-section-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:5px;padding-bottom:3px;border-bottom:1px solid var(--bdr)}
.report-student-row{display:flex;align-items:flex-start;justify-content:space-between;padding:7px 10px;border-radius:9px;background:var(--surf2);border:1px solid var(--bdr);margin-bottom:4px;gap:10px}
.report-student-name{font-size:12.5px;font-weight:700;color:var(--t1)}
.report-student-meta{font-size:10.5px;color:var(--t3)}
.report-violation-badge{padding:2px 8px;border-radius:5px;font-size:9.5px;font-weight:800;flex-shrink:0}
.badge-clean{background:rgba(16,185,129,.1);color:var(--em);border:1px solid rgba(16,185,129,.2)}
.badge-warn{background:rgba(245,158,11,.1);color:var(--amb);border:1px solid rgba(245,158,11,.2)}
.badge-severe{background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.2)}
.report-summary-text{font-size:12px;color:var(--t2);line-height:1.7;padding:9px 11px;border-radius:10px;background:var(--surf2);border:1px solid var(--bdr)}

.ai-notice{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;background:rgba(139,92,246,.08);border:1.5px solid rgba(139,92,246,.25);margin-bottom:10px;font-size:11.5px;color:var(--vio);font-weight:700}
.teacher-required-notice{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:rgba(239,68,68,.07);border:1.5px solid rgba(239,68,68,.22);margin-bottom:10px;font-size:11.5px;color:var(--red);font-weight:700}
.host-badge{padding:4px 10px;border-radius:7px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);font-size:10.5px;font-weight:800;color:var(--amb);display:inline-flex;align-items:center;gap:4px}
.ai-host-badge{padding:4px 10px;border-radius:7px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);font-size:10.5px;font-weight:800;color:var(--vio);display:inline-flex;align-items:center;gap:4px}

/* SPEECH SUMMARY IN RESULTS */
.speech-summary-block{background:var(--surf2);border:1px solid var(--bdr);border-radius:10px;padding:10px 12px;margin-bottom:6px}
.speech-summary-student{font-size:12px;font-weight:700;color:var(--t1);margin-bottom:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.speech-summary-text{font-size:11px;color:var(--t2);line-height:1.6}
.speech-stat-pill{font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:5px}

@media(max-width:1200px){.mp-setup{grid-template-columns:38% 1fr}}
@media(max-width:900px){
  .mp-setup{grid-template-columns:1fr;overflow-y:auto;height:auto;min-height:100dvh}
  .mp-setup-left{min-height:220px;max-height:280px}
  .mp-setup-left-inner{justify-content:flex-start}
  .mp-feats-left{display:none}
}
@media(max-width:768px){
  .type-grid{grid-template-columns:1fr}
  .room-body{flex-direction:column}
  .side-panel{width:100%;min-width:100%;max-height:36dvh;border-left:none;border-top:1px solid rgba(255,255,255,.07)}
  .rbar-topic{display:none}
  .ctrl-bar{padding:5px 8px;min-height:50px}
  .cg{gap:2px;justify-content:center}
  .cbtn{padding:4px 5px;min-width:34px;font-size:7.5px}
  .overlay{align-items:flex-end;padding:0}
  .modal{border-radius:16px 16px 0 0;max-height:90dvh}
  .fi-row{grid-template-columns:1fr}
  .res-stats{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:480px){
  .cbtn span:last-child{display:none}
  .cbtn{min-width:28px}
  .res-stats{grid-template-columns:1fr 1fr}
}
`;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const COLORS = ["#0ea5e9","#10b981","#f59e0b","#38bdf8","#ec4899","#8b5cf6","#f97316","#06b6d4","#a855f7","#14b8a6","#f43f5e","#84cc16"];
const REACTIONS = ["👍","👏","❤️","😂","🔥","🤔","🎉","✨"];

const MOCK_TEACHERS = [
  { id:"t1", name:"Mrs. Priya Sharma",  email:"priya.sharma@school.edu",  subject:"Chemistry", classes:["11A","11B"] },
  { id:"t2", name:"Mr. Rahul Kumar",    email:"rahul.kumar@school.edu",    subject:"Physics",   classes:["11A","12A"] },
  { id:"t3", name:"Ms. Anita Rao",      email:"anita.rao@school.edu",      subject:"Maths",     classes:["11B","12B"] },
  { id:"t4", name:"Mr. David Thomas",   email:"david.thomas@school.edu",   subject:"Biology",   classes:["11A","11B"] },
  { id:"t5", name:"Mrs. Lakshmi Nair",  email:"lakshmi.nair@school.edu",   subject:"English",   classes:["12A","12B"] },
];

const DUMMY_STUDENTS = [
  "Aarav Shah","Diya Kapoor","Rohan Iyer","Meera Nair","Kabir Singh","Anaya Das",
  "Vivaan Patel","Ishita Rao","Arjun Menon","Sara Khan","Neel Joshi","Tara Mehta",
];

// ─── AI MODERATION ────────────────────────────────────────────────────────────
type ViolationCategory = "bad_word"|"sexual"|"adult"|"cheating"|"gossip"|"vulgar"|"offensive";
interface ModerationResult { blocked:boolean; category?:ViolationCategory; reason?:string; severity:"low"|"medium"|"high"; matchedWord?:string; }

const BAD_WORDS        = ["fuck","f**k","fck","f@ck","shit","sh1t","sh!t","bitch","b1tch","bastard","asshole","a**hole","damn","crap","idiot","stupid","moron","dumb","loser","shut up","wtf","stfu","bloody hell","cunt","prick","trash","screw you","bullshit","bull****","motherfucker","mf","hell no","jerk","dammit","omfg"];
const SEXUAL_PATTERNS  = ["sex","sexy","sexual","porn","porno","nude","naked","boobs","boob","breast","penis","vagina","dick","cock","pussy","ass","butt","erotic","horny","masturbat","orgasm","intercourse","xxxx","nsfw","adult content","x-rated","onlyfans","stripper","prostitut","nudes","seduce"];
const ADULT_PATTERNS   = ["18+","adult","mature content","explicit","obscene","indecent","lewd","lascivious","pervert","perversion","fetish","kink","bdsm","threesome","hookup app"];
const CHEATING_PATTERNS= ["send answer","share answer","give me answer","what is answer","answer for q","answer q","leak paper","leaked paper","question paper","share paper","exam paper","copy answer","copy from","answers please","answers share","cheat","cheating","give paper","send question","share question","exam leak","paper leak","question leak","send marks","share marks","answers leak","copy paste","screenshot exam","exam screenshot","bypass","answer key","solved paper","give solution","share solution"];
const GOSSIP_PATTERNS  = ["did you hear","did you know about","talking behind","spreading rumor","rumor","gossip","personal life","private matter","who is dating","hook up","who likes who","talk about teacher","hate teacher","teacher is bad","teacher sucks","classmate problem","fight with","drama","roast","expose","exposed","snitch","backstab","two-faced","fake friend","talking shit about"];
const VULGAR_PATTERNS  = ["fart","poop","pee","piss","urine","vomit","puke","spit on","disgusting","gross","toilet humor","dirty joke","inappropriate joke","sexual joke","pervert joke","vulgar","obscene joke"];
const OFFENSIVE_PATTERNS=["racist","racism","sexist","sexism","discrimination","bully","bullying","harass","harassment","threat","abuse","insult","degrade","mock","shame","hate speech","slur","n-word","f-word","stereotype","bigot","xenophob","homophob"];

const ALL_PATTERNS = [
  { list:BAD_WORDS,        category:"bad_word"   as ViolationCategory, severity:"high"   as const, reason:"Profanity detected" },
  { list:SEXUAL_PATTERNS,  category:"sexual"     as ViolationCategory, severity:"high"   as const, reason:"Sexual content detected" },
  { list:ADULT_PATTERNS,   category:"adult"      as ViolationCategory, severity:"high"   as const, reason:"Adult content detected" },
  { list:CHEATING_PATTERNS,category:"cheating"   as ViolationCategory, severity:"high"   as const, reason:"Cheating attempt detected" },
  { list:GOSSIP_PATTERNS,  category:"gossip"     as ViolationCategory, severity:"medium" as const, reason:"Off-topic gossip" },
  { list:VULGAR_PATTERNS,  category:"vulgar"     as ViolationCategory, severity:"medium" as const, reason:"Vulgar language" },
  { list:OFFENSIVE_PATTERNS,category:"offensive" as ViolationCategory, severity:"high"   as const, reason:"Offensive language" },
];

function moderateMessage(text:string):ModerationResult {
  const lower = text.toLowerCase().trim();
  for (const { list,category,severity,reason } of ALL_PATTERNS) {
    for (const p of list) { if (lower.includes(p)) return { blocked:true,category,severity,reason,matchedWord:p }; }
  }
  return { blocked:false, severity:"low" };
}

const CATEGORY_LABELS:Record<ViolationCategory,string> = { bad_word:"🤬 Bad Language", sexual:"🔞 Sexual Content", adult:"🚫 Adult Content", cheating:"📋 Cheating Attempt", gossip:"📢 Gossip/Off-topic", vulgar:"💬 Vulgar Language", offensive:"⚠️ Offensive Language" };
const CAT_LOG_CLASS:Record<ViolationCategory,string>   = { bad_word:"flag-bad", sexual:"flag-bad", adult:"flag-bad", cheating:"flag-cheat", gossip:"flag-gossip", vulgar:"flag-gossip", offensive:"flag-bad" };
const CAT_CLASS:Record<ViolationCategory,string>        = { bad_word:"cat-bad", sexual:"cat-bad", adult:"cat-bad", cheating:"cat-cheat", gossip:"cat-gossip", vulgar:"cat-gossip", offensive:"cat-bad" };
const AI_WARNINGS:Record<ViolationCategory,string[]> = {
  bad_word:  ["⚠️ Please avoid profanity. Your teacher has been notified.","⚠️ That language is not allowed here. First warning issued."],
  sexual:    ["🚫 Sexual content is strictly prohibited. Teacher notified immediately.","🚫 That message contains inappropriate content and has been blocked."],
  adult:     ["🚫 Adult content is not allowed. Incident logged and teacher notified.","🚫 That content is inappropriate. Your teacher has been informed."],
  cheating:  ["🚫 Sharing exam answers is strictly prohibited. Teacher notified immediately.","🚫 Cheating attempt detected and blocked. Escalated to teacher."],
  gossip:    ["⚠️ Please keep discussions focused on academics.","⚠️ That message is off-topic. Teacher has been informed."],
  vulgar:    ["⚠️ Vulgar language is not appropriate here.","⚠️ That language is not acceptable. Teacher has been notified."],
  offensive: ["🚫 Offensive language is strictly prohibited. Teacher notified immediately.","🚫 That content violates code of conduct. Incident logged."],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const avColor  = (n:string) => COLORS[(n||"U").charCodeAt(0)%COLORS.length];
const avInit   = (n:string) => (n||"U").split(/[_\s]/).map((w:string)=>w[0]).join("").slice(0,2).toUpperCase();
const genId    = () => Math.random().toString(36).slice(2,12);
const genLink  = (id:string) => `${window.location.origin}/meeting/join?room=${id}`;
const genPin   = () => Math.floor(100000+Math.random()*900000).toString();
const fmtTime  = (d:number) => new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
const fmtClock = (s:number) => `${String(Math.floor(Math.max(0,s)/60)).padStart(2,"0")}:${String(Math.max(0,s)%60).padStart(2,"0")}`;

function getAIResponse(subject:string):string {
  const r:Record<string,string[]> = {
    chemistry:["In organic chemistry, hybridisation determines molecular shape. sp3 gives tetrahedral geometry.","For IUPAC naming, identify the longest carbon chain first, then number from the end closest to the first substituent.","Functional groups determine reactivity. Alcohols (-OH) are polar and form hydrogen bonds."],
    maths:["For integration by parts, use the LIATE rule: Logarithm, Inverse trig, Algebraic, Trig, Exponential.","Remember d/dx(sin x) = cos x, and d/dx(cos x) = -sin x.","When solving quadratics, always check if it factors before using the quadratic formula."],
    physics:["Newton's second law: F = ma. Always draw a free body diagram first.","In circuit analysis, Kirchhoff's Current Law: sum of currents entering a node equals sum leaving.","For projectile motion, treat horizontal and vertical components independently."],
    biology:["The central dogma: DNA to RNA to Protein. Transcription makes mRNA; translation makes protein.","Mitosis produces 2 identical diploid cells. Meiosis produces 4 unique haploid cells.","Enzymes are biological catalysts. They lower activation energy and are substrate-specific."],
    default:["Great question! Let me help you think through this step by step.","That is a good observation. Here is what the curriculum covers about this topic.","Excellent thinking! Let us explore this concept further together."],
  };
  const key = subject.toLowerCase();
  const pool = r[key]||r.default;
  return pool[Math.floor(Math.random()*pool.length)];
}

// ─── PDF GENERATION ───────────────────────────────────────────────────────────
async function loadJsPDF():Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).jsPDF) { resolve((window as any).jsPDF); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve((window as any).jsPDF || (window as any).jspdf?.jsPDF);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

interface StudentSummary {
  name:string; id:number; strikes:number;
  violations:{category:ViolationCategory;detail:string;time:number}[];
  messageCount:number; joinedAt:number;
  behaviorRating:"excellent"|"good"|"warning"|"removed";
  speechSummary?:{text:string;time:number}[];
}

interface SpeechEntry { name:string; text:string; time:number; senderId:number; }

async function generateSessionPDF(data:{
  topic:string; subject:string; teacherName:string; teacherEmail:string;
  duration:string; participants:number; studentReport:StudentSummary[];
  violations:number; teacherJoined:boolean; roomLink:string;
  activityLog:{time:number;user:string;action:string;category?:ViolationCategory;detail?:string}[];
  speechSummary:{name:string;speeches:string[];count:number}[];
}):Promise<Blob> {
  const jsPDFLib = await loadJsPDF();
  const jsPDFConstructor = jsPDFLib.jsPDF || jsPDFLib;
  const doc = new jsPDFConstructor({ orientation:"portrait", unit:"mm", format:"a4" });

  const W = 210; const PL = 18; const PR = 18; const CW = W - PL - PR;
  let y = 0;

  const hex = (h:string) => { const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return [r,g,b]; };
  const setColor = (h:string) => { const [r,g,b]=hex(h); doc.setFillColor(r,g,b); };
  const rgbFill  = (r:number,g:number,b:number) => doc.setFillColor(r,g,b);
  const rgbText  = (r:number,g:number,b:number) => doc.setTextColor(r,g,b);
  const rgbDraw  = (r:number,g:number,b:number) => doc.setDrawColor(r,g,b);

  function addPageIfNeeded(needed=20) {
    if (y + needed > 272) { doc.addPage(); y = 18; }
  }

  // HEADER
  setColor("#6366f1"); doc.rect(0, 0, W, 42, "F");
  setColor("#8b5cf6"); doc.rect(0, 32, W, 10, "F");
  rgbText(255,255,255);
  doc.setFont("helvetica","bold"); doc.setFontSize(22);
  doc.text("Session Report", PL, 16);
  doc.setFontSize(10); doc.setFont("helvetica","normal");
  doc.text("AI-Monitored Study Room — GradeUp", PL, 24);
  doc.setFontSize(8.5);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PL, 30);
  rgbFill(255,255,255); doc.roundedRect(W-52, 7, 36, 20, 3, 3, "F");
  rgbText(99,102,241);
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
  doc.text("PDF REPORT", W-50, 14);
  doc.setFontSize(6.5); doc.setFont("helvetica","normal");
  doc.text("Sent to teacher email", W-50, 18.5);
  doc.text(`& notifications`, W-50, 23);
  y = 50;

  // INFO CARDS
  const cards = [
    { label:"Session Topic", value: data.topic||"Study Session" },
    { label:"Subject",       value: data.subject||"General" },
    { label:"Duration",      value: data.duration },
    { label:"Participants",  value: String(data.participants) },
    { label:"Teacher",       value: data.teacherName||"N/A" },
    { label:"Teacher Email", value: data.teacherEmail||"N/A" },
    { label:"Teacher Joined",value: data.teacherJoined?"Yes (took over room)":"No (AI proctored full session)" },
    { label:"Violations",    value: String(data.violations) },
    { label:"Room Link",     value: data.roomLink||"N/A" },
  ];
  const cardW = (CW-8)/2;
  cards.forEach((c, i) => {
    const col = i%2; const row = Math.floor(i/2);
    const cx = PL + col*(cardW+8);
    const cy = y + row*18;
    rgbFill(248,250,252); rgbDraw(226,232,240);
    doc.setLineWidth(0.3); doc.roundedRect(cx, cy, cardW, 14, 2, 2, "FD");
    rgbText(100,116,139); doc.setFont("helvetica","normal"); doc.setFontSize(7);
    doc.text(c.label.toUpperCase(), cx+5, cy+5.5);
    rgbText(15,23,42); doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
    const val = c.value.length>32 ? c.value.slice(0,30)+"…" : c.value;
    doc.text(val, cx+5, cy+11);
  });
  y += Math.ceil(cards.length/2)*18 + 12;
  addPageIfNeeded(30);

  // STUDENT BEHAVIOUR
  setColor("#6366f1"); doc.rect(PL, y, CW, 8, "F");
  rgbText(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("STUDENT BEHAVIOUR REPORT", PL+4, y+5.5);
  y += 12;

  if (data.studentReport.length > 0) {
    rgbFill(241,245,249); rgbDraw(226,232,240);
    doc.setLineWidth(0.3); doc.rect(PL, y, CW, 7, "FD");
    rgbText(71,85,105); doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
    const cols = [PL+2, PL+50, PL+80, PL+110, PL+140];
    ["Student Name","Messages","Strikes","Status","Violation Types"].forEach((h,i) => doc.text(h, cols[i], y+4.8));
    y += 7;

    data.studentReport.forEach((s, idx) => {
      addPageIfNeeded(10);
      const rowColor:number[] = idx%2===0 ? [255,255,255] : [248,250,252];
      rgbFill(...rowColor as [number,number,number]); rgbDraw(226,232,240);
      doc.setLineWidth(0.2); doc.rect(PL, y, CW, 8, "FD");
      rgbText(15,23,42); doc.setFont("helvetica","normal"); doc.setFontSize(8);
      doc.text(s.name.length>20?s.name.slice(0,19)+"…":s.name, cols[0], y+5.2);
      doc.text(String(s.messageCount), cols[1]+8, y+5.2);
      doc.text(`${s.strikes}/3`, cols[2]+4, y+5.2);
      const [badgeR,badgeG,badgeB,textR,textG,textB] =
        s.behaviorRating==="excellent" ? [209,250,229,6,95,70] :
        s.behaviorRating==="good"      ? [254,243,199,146,86,20] :
        s.behaviorRating==="warning"   ? [254,226,226,185,28,28] :
                                          [254,202,202,185,28,28];
      rgbFill(badgeR,badgeG,badgeB);
      doc.roundedRect(cols[3], y+1.5, 28, 5, 1, 1, "F");
      rgbText(textR,textG,textB); doc.setFont("helvetica","bold"); doc.setFontSize(6.5);
      const badgeLabel = s.behaviorRating==="excellent"?"Excellent":s.behaviorRating==="good"?"Warning":s.behaviorRating==="warning"?"Suspended":"Removed";
      doc.text(badgeLabel, cols[3]+2, y+5.2);
      const vtypes = [...new Set(s.violations.map(v=>v.category))].slice(0,2);
      rgbText(100,116,139); doc.setFont("helvetica","normal"); doc.setFontSize(6.5);
      doc.text(vtypes.length>0?vtypes.map(v=>CATEGORY_LABELS[v].split(" ").slice(1).join(" ")).join(", "):"None", cols[4], y+5.2);
      y += 8;
    });
  }
  y += 8;
  addPageIfNeeded(30);

  // SPEECH & CHAT SUMMARY (new section)
  if (data.speechSummary && data.speechSummary.length > 0) {
    setColor("#0ea5e9"); doc.rect(PL, y, CW, 8, "F");
    rgbText(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.text("STUDENT SPEECH & CHAT SUMMARY", PL+4, y+5.5);
    y += 12;

    data.speechSummary.forEach((s) => {
      addPageIfNeeded(20);
      rgbFill(240,249,255); rgbDraw(186,230,253);
      doc.setLineWidth(0.3); doc.roundedRect(PL, y, CW, 7, 2, 2, "FD");
      rgbText(15,23,42); doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
      doc.text(`${s.name}  (${s.count} contribution${s.count!==1?"s":""})`, PL+4, y+4.8);
      y += 9;

      s.speeches.slice(0,5).forEach((sp) => {
        addPageIfNeeded(8);
        rgbFill(248,250,252); rgbDraw(226,232,240);
        doc.setLineWidth(0.2); doc.roundedRect(PL+4, y, CW-4, 6, 1, 1, "FD");
        rgbText(71,85,105); doc.setFont("helvetica","normal"); doc.setFontSize(7);
        const display = `"${sp}"`.slice(0, 95);
        doc.text(display, PL+8, y+4.2);
        y += 7;
      });
      if (s.speeches.length > 5) {
        rgbText(148,163,184); doc.setFont("helvetica","italic"); doc.setFontSize(6.5);
        doc.text(`… and ${s.speeches.length-5} more message${s.speeches.length-5!==1?"s":""}`, PL+8, y+3);
        y += 5;
      }
      y += 4;
    });
    y += 4;
  }

  addPageIfNeeded(30);

  // VIOLATIONS DETAIL
  const violationLogs = data.activityLog.filter(l=>l.category);
  if (violationLogs.length > 0) {
    setColor("#ef4444"); doc.rect(PL, y, CW, 8, "F");
    rgbText(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.text("VIOLATION LOG", PL+4, y+5.5);
    y += 12;

    violationLogs.slice(0,20).forEach((l, idx) => {
      addPageIfNeeded(10);
      const rowColor:number[] = idx%2===0 ? [255,255,255] : [254,242,242];
      rgbFill(...rowColor as [number,number,number]); rgbDraw(254,202,202);
      doc.setLineWidth(0.2); doc.rect(PL, y, CW, 8, "FD");
      rgbText(100,116,139); doc.setFont("helvetica","normal"); doc.setFontSize(7);
      doc.text(fmtTime(l.time), PL+2, y+5.2);
      rgbText(15,23,42); doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
      doc.text(l.user.length>16?l.user.slice(0,15)+"…":l.user, PL+22, y+5.2);
      rgbText(185,28,28); doc.setFont("helvetica","normal"); doc.setFontSize(7);
      doc.text(l.category?CATEGORY_LABELS[l.category].slice(0,20):"", PL+60, y+5.2);
      rgbText(71,85,105); doc.setFontSize(6.5);
      const detail = (l.detail||l.action).slice(0,55);
      doc.text(detail, PL+110, y+5.2);
      y += 8;
    });
    y += 6;
  }

  addPageIfNeeded(50);

  // AI SUMMARY
  setColor("#8b5cf6"); doc.rect(PL, y, CW, 8, "F");
  rgbText(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("AI SESSION SUMMARY", PL+4, y+5.5);
  y += 12;

  const cleanStudents = data.studentReport.filter(r=>r.strikes===0).map(r=>r.name);
  const warnStudents  = data.studentReport.filter(r=>r.strikes>0).map(r=>r.name);
  const summaryLines = [
    `Session lasted ${data.duration} with ${data.participants} participant(s).`,
    cleanStudents.length>0 ? `Excellent conduct: ${cleanStudents.join(", ")}.` : null,
    warnStudents.length>0  ? `Violations noted: ${warnStudents.join(", ")}.` : null,
    data.teacherJoined ? `${data.teacherName} joined and moderated the session.` : `AI Teacher proctored the full session.`,
    `Total violations detected: ${data.violations}.`,
    data.speechSummary.length>0 ? `Speech/chat contributions recorded from ${data.speechSummary.length} student(s).` : null,
    data.violations===0 ? "All students maintained excellent academic conduct." : `${warnStudents.length} student(s) require follow-up.`,
  ].filter(Boolean) as string[];

  rgbFill(245,243,255); rgbDraw(196,181,253);
  doc.setLineWidth(0.4); doc.roundedRect(PL, y, CW, summaryLines.length*7+8, 3, 3, "FD");
  y += 5;
  summaryLines.forEach(line => {
    rgbText(55,48,163); doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
    doc.text(line, PL+5, y+4); y += 7;
  });
  y += 6;

  addPageIfNeeded(30);

  // RECOMMENDATIONS
  setColor("#10b981"); doc.rect(PL, y, CW, 8, "F");
  rgbText(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("RECOMMENDATIONS", PL+4, y+5.5);
  y += 12;

  const recs = data.violations===0
    ? ["All students maintained excellent academic conduct. No action required.","Continue encouraging this positive learning environment."]
    : [
        `${warnStudents.join(", ")} require a follow-up conversation regarding academic conduct.`,
        data.activityLog.filter(l=>l.category==="cheating").length>0 ? "Cheating attempts were detected — immediate review recommended." : null,
        data.activityLog.filter(l=>l.category==="sexual"||l.category==="adult").length>0 ? "Inappropriate content was attempted — parental notification may be warranted." : null,
        "All incidents were blocked in real-time. Detailed logs are above.",
      ].filter(Boolean) as string[];

  rgbFill(236,253,245); rgbDraw(167,243,208);
  doc.setLineWidth(0.4); doc.roundedRect(PL, y, CW, recs.length*7+8, 3, 3, "FD");
  y += 5;
  recs.forEach(line => {
    rgbText(6,95,70); doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
    doc.text(line, PL+5, y+4); y += 7;
  });
  y += 10;

  // FOOTER
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i=1; i<=totalPages; i++) {
    doc.setPage(i);
    rgbFill(248,250,252); doc.rect(0, 284, W, 13, "F");
    rgbText(148,163,184); doc.setFont("helvetica","normal"); doc.setFontSize(7);
    doc.text(`GradeUp AI Study Room — Confidential Report`, PL, 290);
    doc.text(`Page ${i} of ${totalPages}`, W-PR-20, 290);
    doc.text(`Sent to: ${data.teacherEmail||"teacher@school.edu"}`, W/2, 290, { align:"center" });
  }

  return doc.output("blob");
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useTimer(running:boolean) {
  const [s,setS]=useState(0);
  useEffect(()=>{
    if(!running) return;
    const id=setInterval(()=>setS(x=>x+1),1000);
    return()=>clearInterval(id);
  },[running]);
  return { seconds:s, display:fmtClock(s) };
}

function useMediaPerm() {
  const [state,setState]=useState<"idle"|"requesting"|"granted"|"denied">("idle");
  const [stream,setStream]=useState<MediaStream|null>(null);
  async function request(){
    setState("requesting");
    try { const s=await navigator.mediaDevices.getUserMedia({video:true,audio:true}); setStream(s); setState("granted"); return s; }
    catch { setState("denied"); return null; }
  }
  function stop() { stream?.getTracks().forEach(t=>t.stop()); setStream(null); setState("idle"); }
  return { state, stream, request, stop };
}

function useRecorder() {
  const mrRef=useRef<MediaRecorder|null>(null);
  const chunks=useRef<Blob[]>([]);
  const [isRecording,setIsRecording]=useState(false);
  const [blob,setBlob]=useState<Blob|null>(null);
  async function start(audio?:MediaStream|null){
    try {
      const ds=await (navigator.mediaDevices as any).getDisplayMedia({video:{displaySurface:"browser"},audio:true});
      const tracks=[...ds.getTracks()];
      if(audio instanceof MediaStream) audio.getAudioTracks().forEach((t:MediaStreamTrack)=>tracks.push(t));
      const combined=new MediaStream(tracks);
      const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":"video/webm";
      const mr=new MediaRecorder(combined,{mimeType:mime});
      chunks.current=[];
      mr.ondataavailable=(e:BlobEvent)=>{if(e.data.size>0) chunks.current.push(e.data);};
      mr.onstop=()=>{setBlob(new Blob(chunks.current,{type:mime}));combined.getTracks().forEach((t:MediaStreamTrack)=>t.stop());};
      ds.getVideoTracks()[0].addEventListener("ended",()=>stop());
      mr.start(1000); mrRef.current=mr; setIsRecording(true); return true;
    } catch { return false; }
  }
  function stop(){if(mrRef.current?.state!=="inactive") mrRef.current?.stop(); setIsRecording(false);}
  function download(fname="meeting.webm"){
    if(!blob) return;
    const u=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=u; a.download=fname; a.click(); URL.revokeObjectURL(u);
  }
  return { isRecording, blob, start, stop, download };
}

function useToast() {
  const [toast,setToast]=useState<{msg:string;type:string}|null>(null);
  const show=(msg:string,type="success")=>setToast({msg,type});
  useEffect(()=>{if(!toast) return; const t=setTimeout(()=>setToast(null),3500); return()=>clearTimeout(t);},[toast]);
  const node=toast?(
    <div className={`mp-toast ${toast.type}`} onClick={()=>setToast(null)}>
      {toast.type==="success"?"✅":toast.type==="error"?"❌":toast.type==="warn"?"⚠️":"ℹ️"} {toast.msg}
    </div>
  ):null;
  return { show, node };
}

// ─── INTERFACES ───────────────────────────────────────────────────────────────
interface Participant {
  id:number; name:string; stream:MediaStream|null;
  isLocal?:boolean; isHost?:boolean; isTeacher?:boolean; isAITeacher?:boolean;
  micMuted:boolean; camOn:boolean; isSpeaking:boolean; handRaised:boolean;
  avatarColor?:string; strikes:number; chatMuted:boolean; chatMutedUntil?:number;
  joinedAt:number; messageCount:number;
}

interface WaitingEntry { id:string; name:string; time:number; }
interface LogEntry { time:number; user:string; action:string; category?:ViolationCategory; detail?:string; severity?:string; }

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function WaveBars({color="#10b981"}:{color?:string}) {
  return (
    <div className="tile-wave">
      {[0,1,2,3,4].map(i=><div key={i} className="tile-wave-bar" style={{background:color,animationDelay:`${i*.11}s`}}/>)}
    </div>
  );
}

function CamPreview({stream,camOn,micOn,name,perm,onReq,onToggleMic,onToggleCam}:any) {
  const vRef=useRef<HTMLVideoElement>(null);
  useEffect(()=>{if(vRef.current) vRef.current.srcObject=stream&&camOn?stream:null;},[stream,camOn]);
  return (
    <>
      <div className="cam-wrap">
        <video ref={vRef} autoPlay playsInline muted style={{display:stream&&camOn?"block":"none"}}/>
        {(!stream||!camOn)&&<div className="cam-off"><div className="cam-av">{name?name[0].toUpperCase():"?"}</div><span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>{!stream?"Enable camera":"Camera off"}</span></div>}
        {name&&<div className="cam-nametag">📍 {name}</div>}
      </div>
      <div className="cam-perm-bar">
        {perm==="idle"       &&<button className="cam-perm-btn req"    style={{flex:1}} onClick={onReq}>🔐 Allow Camera & Mic</button>}
        {perm==="requesting" &&<button className="cam-perm-btn req"    style={{flex:1}} disabled><span className="loader-spin dark" style={{width:13,height:13,borderWidth:2}}/>Requesting…</button>}
        {perm==="denied"     &&<button className="cam-perm-btn denied" style={{flex:1}} onClick={onReq}>🔄 Retry Permissions</button>}
        {perm==="granted"    &&<>
          <button className={`cam-perm-btn ${micOn?"granted":"denied"}`} onClick={onToggleMic}>{micOn?"🎤":"🔇"} {micOn?"Mic On":"Mic Off"}</button>
          <button className={`cam-perm-btn ${camOn?"granted":"denied"}`} onClick={onToggleCam}>{camOn?"📹":"🚫"} {camOn?"Cam On":"Cam Off"}</button>
          <span style={{padding:"7px 10px",borderRadius:8,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",fontSize:11,fontWeight:700,color:"var(--em)",display:"flex",alignItems:"center",gap:4}}>✓ Ready</span>
        </>}
      </div>
      {perm==="denied"&&<div className="perm-warn">⚠️ Camera & mic denied. Allow in browser settings.</div>}
    </>
  );
}

function StepsComp({steps}:{steps:{label:string;done:boolean}[]}) {
  const st=(i:number)=>steps[i].done?"done":steps.slice(0,i).every(s=>s.done)?"act":"pend";
  return (
    <div className="steps">
      {steps.map((s,i)=>(
        <div key={i} className={`step-row ${st(i)}`}>
          <div className="step-num">{s.done?"✓":i+1}</div>
          <div className="step-lbl">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Tile({p,reaction,tileSize,onFullscreen}:{p:Participant;reaction?:any;tileSize?:string;onFullscreen?:(p:Participant)=>void}) {
  const vRef=useRef<HTMLVideoElement>(null);
  useEffect(()=>{if(vRef.current&&p.stream instanceof MediaStream&&p.camOn) vRef.current.srcObject=p.stream;},[p.stream,p.camOn]);

  if (p.isAITeacher) {
    return (
      <div className="ai-teacher-tile">
        <div className="ai-teacher-av">🤖</div>
        {p.isSpeaking&&<WaveBars color="#8b5cf6"/>}
        <div className="ai-teacher-ov">
          <div className="ai-teacher-label">AI Teacher<span className="ai-badge">LIVE</span></div>
          <div style={{fontSize:7.5,color:"rgba(139,92,246,.7)",fontWeight:700}}>🛡️ Proctoring</div>
        </div>
      </div>
    );
  }

  const color=p.avatarColor||avColor(p.name);
  return (
    <div className={`tile${p.isSpeaking?" spk":""}`}>
      {p.stream instanceof MediaStream&&p.camOn
        ?<video ref={vRef} autoPlay playsInline muted={p.isLocal}/>
        :<div className="tile-av" style={{background:color+"28",color}}>{avInit(p.name)}</div>
      }
      {p.isSpeaking&&<WaveBars/>}
      {p.handRaised&&<div style={{position:"absolute",top:5,left:28,background:"rgba(245,166,35,.92)",borderRadius:5,padding:"1px 5px",fontSize:9,fontWeight:800,color:"#000"}}>✋</div>}
      {p.strikes>0&&<div className="tile-strike">⚠️{p.strikes}/3</div>}
      {reaction&&<div key={reaction.key} className="tile-react">{reaction.emoji}</div>}
      <button className="tile-fullscreen-btn" onClick={(e)=>{e.stopPropagation();onFullscreen&&onFullscreen(p);}}>⤢</button>
      <div className="tile-ov">
        <div className="tile-name">
          {tileSize==="small"?avInit(p.name):p.name}
          {p.isTeacher&&<span className="t-badge t-teacher">TCH</span>}
          {p.isHost&&!p.isTeacher&&<span className="t-badge t-host">HOST</span>}
          {p.isLocal&&!p.isHost&&!p.isTeacher&&<span className="t-badge t-you">You</span>}
        </div>
        {p.micMuted&&<div className="tile-muted">🔇</div>}
      </div>
    </div>
  );
}

function getGridClass(n:number, tileSize?:string):string {
  if(tileSize==="small") return "";
  if(n<=1)  return "vg-1";
  if(n<=2)  return "vg-2";
  if(n<=3)  return "vg-3";
  if(n<=4)  return "vg-4";
  if(n<=5)  return "vg-5";
  if(n<=6)  return "vg-6";
  if(n<=8)  return "vg-8";
  if(n<=9)  return "vg-9";
  if(n<=12) return "vg-12";
  if(n<=14) return "vg-14";
  return "vg-16";
}

// ─── WAITING FOR TEACHER ──────────────────────────────────────────────────────
function WaitingForTeacherApproval({name,teacherName,topic,subject,roomLink,onApproved,onCancel}:any) {
  const [elapsed,setElapsed]=useState(0);
  const [simState,setSimState]=useState<"waiting"|"approved">("waiting");
  useEffect(()=>{const t=setInterval(()=>setElapsed(e=>e+1),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{const t=setTimeout(()=>{setSimState("approved");setTimeout(onApproved,2000);},9000);return()=>clearTimeout(t);},[onApproved]);
  return (
    <div className="teacher-approval-wait">
      <div className="taw-orb">{simState==="waiting"?"⏳":"✅"}</div>
      <div className="taw-title" style={{color:simState==="approved"?"#4ade80":"#fff"}}>{simState==="waiting"?"Waiting for teacher approval":"Approved! Entering room…"}</div>
      <div className="taw-sub">{simState==="waiting"?<>Invitation sent to <strong style={{color:"rgba(139,92,246,.8)"}}>{teacherName}</strong>. AI Teacher will proctor until they join.</>:<>Your study room is approved. AI Teacher is now monitoring until {teacherName} joins.</>}</div>
      <div className="taw-card">
        <div style={{fontSize:8.5,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"rgba(14,165,233,.6)",marginBottom:8}}>Room Details</div>
        <div className="taw-card-row"><span>Topic</span><strong>{topic}</strong></div>
        <div className="taw-card-row"><span>Subject</span><strong>{subject}</strong></div>
        <div className="taw-card-row"><span>Teacher</span><strong>{teacherName}</strong></div>
        <div className="taw-card-row"><span>Waiting</span><strong style={{color:"var(--ind3)",fontFamily:"monospace"}}>{fmtClock(elapsed)}</strong></div>
        <div className="taw-card-row"><span>Status</span><strong style={{color:simState==="waiting"?"var(--amb)":"var(--em)"}}>{simState==="waiting"?"⏳ Pending":"✅ Approved"}</strong></div>
      </div>
      {simState==="waiting"&&(
        <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,justifyContent:"center" as const}}>
          <button className="btn-s" style={{background:"rgba(255,255,255,.05)",borderColor:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.5)"}} onClick={()=>navigator.clipboard?.writeText(roomLink)}>🔗 Copy link</button>
          <button className="btn-d" onClick={onCancel}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ─── STRIKE ALERT ─────────────────────────────────────────────────────────────
function StrikeAlert({strike,reason,category,onClose}:{strike:number;reason:string;category:ViolationCategory;onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,5000);return()=>clearTimeout(t);},[onClose]);
  const msgs=["","⚠️ First warning issued","🚫 Chat suspended for 5 minutes","❌ You have been removed from the room"];
  const colors=["","var(--amb)","var(--red)","var(--red)"];
  return (
    <div className="strike-alert">
      <div className="strike-alert-head"><span style={{fontSize:16}}>🛡️</span><span style={{fontSize:12,fontWeight:800,color:"#fff"}}>AI Proctor Alert</span><span className="strike-badge">{CATEGORY_LABELS[category]}</span></div>
      <div className="strike-msg">Message blocked: <em>{reason}</em></div>
      <div className="strike-count" style={{color:colors[strike]}}>{msgs[strike]} — Strike {strike}/3</div>
    </div>
  );
}

// ─── PASSCODE MODAL ───────────────────────────────────────────────────────────
function PasscodeModal({pin,onVerify,onClose}:{pin:string;onVerify:()=>void;onClose:()=>void}) {
  const [input,setInput]=useState(""); const [wrong,setWrong]=useState(false);
  function check(){if(input===pin){onVerify();}else{setWrong(true);setTimeout(()=>setWrong(false),1400);setInput("");}}
  return (
    <div className="overlay">
      <div className="modal" style={{maxWidth:360}}>
        <div className="mh"><span className="mh-title">🔑 Meeting Passcode</span><button className="mh-close" onClick={onClose}>✕</button></div>
        <div className="mb" style={{textAlign:"center" as const}}>
          <div style={{fontSize:32,marginBottom:10}}>🔐</div>
          <div style={{fontSize:12.5,color:"var(--t2)",marginBottom:14,lineHeight:1.7}}>This meeting is passcode protected. Enter the 6-digit PIN.</div>
          <div className="fi"><input className="finput" placeholder="Enter 6-digit PIN" value={input} onChange={e=>setInput(e.target.value.replace(/\D/g,"").slice(0,6))} onKeyDown={e=>e.key==="Enter"&&check()} style={{textAlign:"center",letterSpacing:".3em",fontSize:20,fontWeight:800,borderColor:wrong?"var(--red)":undefined}}/>{wrong&&<div style={{fontSize:11.5,color:"var(--red)",marginTop:5,fontWeight:700}}>❌ Wrong PIN. Try again.</div>}</div>
        </div>
        <div className="mf">
          <button className="btn-s" onClick={onClose}>Cancel</button>
          <button className="btn-p" style={{width:"auto",padding:"9px 22px"}} onClick={check} disabled={input.length!==6}>Verify PIN</button>
        </div>
      </div>
    </div>
  );
}

// ─── SCHEDULE MODAL ────────────────────────────────────────────────────────────
function ScheduleMeetingModal({config,onSchedule,onClose}:any) {
  const [title,setTitle]=useState(config?.title||""); const [date,setDate]=useState(""); const [time,setTime]=useState("10:00"); const [saving,setSaving]=useState(false);
  async function handleSave(){
    if(!title||!date) return; setSaving(true); await new Promise(r=>setTimeout(r,700));
    try{const ev={id:`mt-${Date.now()}`,title,type:"meeting",date,startTime:time,subject:config?.subject||"",fromMeeting:true};const ex=JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");localStorage.setItem("gradeup_cal_events_v3",JSON.stringify([...ex,ev]));window.dispatchEvent(new StorageEvent("storage",{key:"gradeup_cal_events_v3"}));}catch{}
    setSaving(false); onSchedule({title,date,time});
  }
  return (
    <div className="overlay">
      <div className="modal" style={{maxWidth:420}}>
        <div className="mh"><span className="mh-title">📅 Schedule Meeting</span><button className="mh-close" onClick={onClose}>✕</button></div>
        <div className="mb">
          <div className="fi"><label className="fl">Meeting Title *</label><input className="finput" placeholder="e.g. Chemistry Revision" value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}/></div>
          <div className="fi-row fi">
            <div><label className="fl">Date *</label><input className="finput" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
            <div><label className="fl">Time</label><input className="finput" type="time" value={time} onChange={e=>setTime(e.target.value)}/></div>
          </div>
        </div>
        <div className="mf">
          <button className="btn-s" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-p" style={{width:"auto",padding:"9px 22px"}} onClick={handleSave} disabled={!title||!date||saving}>{saving?<><span className="loader-spin"/>Scheduling…</>:"📅 Schedule & Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── SETUP ───────────────────────────────────────────────────────────────────
function MeetingSetup({onLaunch}:{onLaunch:(cfg:any)=>void}) {
  const {user}=useAuth();
  const [name,setName]           =useState(user?`${user.firstName} ${user.lastName}`:"");
  const [role,setRole_]          =useState<"student"|"teacher">("student");
  const [mtgType,setMtgType]     =useState<"instant"|"schedule"|"">("");
  const [title,setTitle]         =useState("");
  const [subject,setSubject]     =useState("");
  const [micOn,setMicOn]         =useState(true);
  const [camOn,setCamOn]         =useState(true);
  const [invitees,setInvitees]   =useState<{id:string;value:string;color:string}[]>([]);
  const [invInput,setInvInput]   =useState("");
  const [copied,setCopied]       =useState(false);
  const [showConfirm,setShowConfirm]=useState(false);
  const [showSchedule,setShowSchedule]=useState(false);
  const [scheduled,setScheduled] =useState(false);
  const [scheduledInfo,setScheduledInfo]=useState<any>(null);
  const [joining,setJoining]     =useState(false);
  const [joinProgress,setJoinProgress]=useState(0);
  const [usePasscode,setUsePasscode]=useState(false);
  const [pin]                    =useState(genPin);
  const [enableWR,setEnableWR]   =useState(true);
  const [teacherSearch,setTeacherSearch]=useState("");
  const [selectedTeacher,setSelectedTeacher]=useState<typeof MOCK_TEACHERS[0]|null>(null);
  const [addDummies,setAddDummies]=useState(false);

  const roomId=useRef(genId());
  const roomLink=genLink(roomId.current);
  const {state:perm,stream,request}=useMediaPerm();
  const {show:toast$,node:toastNode}=useToast();
  const copyLink=()=>{navigator.clipboard.writeText(roomLink);setCopied(true);setTimeout(()=>setCopied(false),2200);};

  const filteredTeachers=MOCK_TEACHERS.filter(t=>t.name.toLowerCase().includes(teacherSearch.toLowerCase())||t.subject.toLowerCase().includes(teacherSearch.toLowerCase()));

  const steps=role==="student"?[
    {label:"Enter your name",    done:name.trim().length>0},
    {label:"Choose meeting type",done:!!mtgType},
    {label:"Invite a teacher",   done:!!selectedTeacher},
  ]:[
    {label:"Enter your name",    done:name.trim().length>0},
    {label:"Choose meeting type",done:!!mtgType},
  ];
  const canLaunch=steps.every(s=>s.done);

  function addInvitee(){const v=invInput.trim();if(!v)return;setInvitees(p=>[...p,{id:Date.now().toString(),value:v,color:COLORS[Math.floor(Math.random()*COLORS.length)]}]);setInvInput("");navigator.clipboard.writeText(roomLink).catch(()=>{});toast$(`${v} added`,"info");}

  async function handleJoin(){
    setJoining(true);
    try{const ev={id:`mt-${Date.now()}`,title:title||"Study Session",type:"meeting",date:new Date().toISOString().slice(0,10),startTime:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),subject,fromMeeting:true};const ex=JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");localStorage.setItem("gradeup_cal_events_v3",JSON.stringify([...ex,ev]));window.dispatchEvent(new StorageEvent("storage",{key:"gradeup_cal_events_v3"}));}catch{}
    for(let p=0;p<=100;p+=20){await new Promise(r=>setTimeout(r,180));setJoinProgress(p);}
    setJoining(false);setShowConfirm(false);setJoinProgress(0);
    onLaunch({name,role,mode:"meeting",topic:title||"Study Session",subject,stream,micOn,camOn,invitees,roomId:roomId.current,roomLink,usePasscode,pin:usePasscode?pin:null,enableWaitingRoom:enableWR,selectedTeacher,requiresTeacherApproval:role==="student"&&!!selectedTeacher,addDummies});
  }

  const features=[
    {ico:"🤖",t:"AI Teacher",      d:"Proctors & teaches until teacher joins",ai:true},
    {ico:"🛡️",t:"AI Moderation",   d:"Bad words, cheating, adult content blocked",ai:false},
    {ico:"🎙️",t:"Speech Summary",  d:"All student speech summarised in PDF",ai:false},
    {ico:"📄",t:"PDF Report",      d:"Full PDF sent to teacher email & notifications",ai:false},
  ];

  return (
    <div className="mp-setup">
      <div className="mp-setup-left">
        <div className="mp-orbs"><div className="mp-orb mp-orb1"/><div className="mp-orb mp-orb2"/><div className="mp-orb mp-orb3"/></div>
        <div className="mp-grid"/>
        <div className="mp-setup-left-inner">
          <div className="mp-logo"><div className="mp-logo-ico">📹</div><span className="mp-logo-name">MeetHub</span></div>
          <div className="mp-tag"><div className="mp-tag-dot"/>Student Study Rooms</div>
          <h2 className="mp-h1">Learn together,<br/><span className="gt">safely.</span></h2>
          <p className="mp-p">AI-monitored study rooms with speech summaries, PDF reports, instant teacher alerts.</p>
          <div className="mp-feats-left">
            {features.map((f,i)=>(
              <div key={f.t} className="mp-feat-left" style={{animationDelay:`${0.12+i*.07}s`}}>
                <div className={`mp-feat-ico${f.ai?" ai":""}`}>{f.ico}</div>
                <div className="mp-feat-txt"><strong>{f.t}</strong><span>{f.d}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mp-setup-right">
        <div className="mp-setup-scroll">
          <div className="mp-setup-inner">
            <h2 className="setup-title">📹 Meeting Setup</h2>
            <p className="setup-sub">Set up your AI-proctored study room below.</p>
            <div className="sec-div">Identity</div>
            <div className="fi"><label className="fl">Your Name</label><input className="finput" placeholder="e.g. Aarav Kumar" value={name} onChange={e=>setName(e.target.value)} maxLength={40}/></div>
            <div className="fi"><label className="fl">Subject</label><input className="finput" placeholder="e.g. Chemistry, Maths, Physics…" value={subject} onChange={e=>setSubject(e.target.value)} maxLength={40}/></div>

            <div className="sec-div">Your Role</div>
            <div className="type-grid fi">
              {[{id:"student",ico:"🎓",t:"Student",d:"Host a study room — invite classmates and a teacher supervisor"},{id:"teacher",ico:"👩‍🏫",t:"Teacher",d:"Join as supervisor with full controls and AI assistant"}].map(o=>(
                <div key={o.id} className={`type-card${role===o.id?" sel":""}`} onClick={()=>setRole_(o.id as any)}>
                  <div className="type-ico">{o.ico}</div><div><div className="type-title">{o.t}</div><div className="type-desc">{o.d}</div></div>
                </div>
              ))}
            </div>

            <div className="sec-div">Meeting Type</div>
            <div className="type-grid fi">
              {[{id:"instant",ico:"⚡",t:"Quick Room",d:"Start instantly"},{id:"schedule",ico:"📅",t:"Schedule",d:"Plan ahead, auto-synced"}].map(o=>(
                <div key={o.id} className={`type-card${mtgType===o.id?" sel":""}`} onClick={()=>setMtgType(o.id as any)}>
                  <div className="type-ico">{o.ico}</div><div><div className="type-title">{o.t}</div><div className="type-desc">{o.d}</div></div>
                </div>
              ))}
            </div>
            {mtgType==="instant"&&<div className="fi"><label className="fl">Room Title (optional)</label><input className="finput" placeholder="e.g. Chemistry Revision" value={title} onChange={e=>setTitle(e.target.value)} maxLength={60}/></div>}
            {mtgType==="schedule"&&(
              <div style={{padding:13,borderRadius:13,background:"rgba(14,165,233,.05)",border:"1.5px solid rgba(14,165,233,.18)",marginBottom:10}}>
                {!scheduled?<><div style={{fontSize:12.5,fontWeight:700,color:"var(--t1)",marginBottom:6}}>📅 Set date & time</div><button className="btn-s" style={{width:"100%",justifyContent:"center" as const}} onClick={()=>setShowSchedule(true)}>📅 Open Schedule Form</button></>
                :<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:22}}>✅</span><div><div style={{fontSize:12.5,fontWeight:800,color:"var(--em)"}}>{scheduledInfo?.title}</div><div style={{fontSize:11,color:"var(--t2)"}}>📅 {scheduledInfo?.date} at {scheduledInfo?.time}</div></div><button className="btn-s" style={{marginLeft:"auto",fontSize:11,padding:"5px 10px"}} onClick={()=>{setScheduled(false);setShowSchedule(true);}}>Edit</button></div>}
              </div>
            )}

            <div className="sec-div">Demo Options</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 13px",borderRadius:11,border:"1.5px solid var(--bdr)",background:"var(--surf2)",marginBottom:10}}>
              <div>
                <div style={{fontSize:12.5,fontWeight:700,color:"var(--t1)"}}>👥 Add 12 Dummy Students</div>
                <div style={{fontSize:11,color:"var(--t3)"}}>Demo: fills the tile grid with 12 students</div>
              </div>
              <button onClick={()=>setAddDummies(v=>!v)} style={{padding:"5px 12px",borderRadius:8,border:"1.5px solid",borderColor:addDummies?"rgba(16,185,129,.4)":"var(--bdr)",background:addDummies?"rgba(16,185,129,.08)":"var(--surf3)",color:addDummies?"var(--em)":"var(--t3)",fontSize:11.5,fontWeight:800,cursor:"pointer"}}>
                {addDummies?"ON":"OFF"}
              </button>
            </div>

            {role==="student"&&<>
              <div className="sec-div">Supervisor Teacher <span style={{color:"var(--red)",marginLeft:4,fontSize:9}}>REQUIRED</span></div>
              <div className="teacher-required-notice">👩‍🏫 A teacher must supervise. AI will proctor until they join. PDF + speech report sent at end.</div>
              {!selectedTeacher?(
                <>
                  <div className="fi"><label className="fl">Search teacher</label><input className="finput" placeholder="e.g. Mrs. Sharma or Chemistry…" value={teacherSearch} onChange={e=>setTeacherSearch(e.target.value)} maxLength={60}/></div>
                  {filteredTeachers.map(t=>(
                    <div key={t.id} className="teacher-row" onClick={()=>{setSelectedTeacher(t);setTeacherSearch("");toast$(`${t.name} invited`,"success");}}>
                      <div className="invite-av" style={{background:avColor(t.name),width:30,height:30,fontSize:12}}>{avInit(t.name)}</div>
                      <div className="invite-info"><div className="invite-name">{t.name}</div><div className="invite-type">{t.subject} · {t.email}</div></div>
                      <span className="teacher-badge">Invite</span>
                    </div>
                  ))}
                </>
              ):(
                <div className="teacher-row selected">
                  <div className="invite-av" style={{background:avColor(selectedTeacher.name),width:30,height:30,fontSize:12}}>{avInit(selectedTeacher.name)}</div>
                  <div className="invite-info"><div className="invite-name">✅ {selectedTeacher.name}</div><div className="invite-type">{selectedTeacher.subject} · PDF + speech report will be emailed</div></div>
                  <button className="invite-rm" onClick={()=>setSelectedTeacher(null)}>✕</button>
                </div>
              )}
            </>}

            <div className="sec-div">Invite Classmates</div>
            <div style={{display:"flex",gap:7,marginBottom:7}}>
              <input className="finput" placeholder="Name or email…" value={invInput} onChange={e=>setInvInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addInvitee()} style={{flex:1}}/>
              <button className="btn-s" style={{padding:"9px 13px",whiteSpace:"nowrap"}} onClick={addInvitee}>+ Add</button>
            </div>
            {invitees.map(inv=>(
              <div key={inv.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 11px",borderRadius:10,border:"1.5px solid var(--bdr)",background:"var(--surf2)",marginBottom:5}}>
                <div className="invite-av" style={{background:inv.color,width:26,height:26,fontSize:11}}>{inv.value[0]?.toUpperCase()}</div>
                <div className="invite-info"><div className="invite-name">{inv.value}</div><div className="invite-type">📧 Link shared</div></div>
                <button className="invite-rm" onClick={()=>setInvitees(p=>p.filter(i=>i.id!==inv.id))}>✕</button>
              </div>
            ))}

            <div className="sec-div">Security Settings</div>
            <div style={{display:"flex",flexDirection:"column" as const,gap:8,marginBottom:12}}>
              {[{label:"⏳ Waiting Room",desc:"Approve each student before they enter",val:enableWR,set:setEnableWR},{label:"🔑 Meeting Passcode",desc:`PIN: ${usePasscode?pin:"------"}`,val:usePasscode,set:setUsePasscode}].map(o=>(
                <div key={o.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 13px",borderRadius:11,border:"1.5px solid var(--bdr)",background:"var(--surf2)"}}>
                  <div><div style={{fontSize:12.5,fontWeight:700,color:"var(--t1)"}}>{o.label}</div><div style={{fontSize:11,color:"var(--t3)"}}>{o.desc}</div></div>
                  <button onClick={()=>o.set((v:boolean)=>!v)} style={{padding:"5px 12px",borderRadius:8,border:"1.5px solid",borderColor:o.val?"rgba(16,185,129,.4)":"var(--bdr)",background:o.val?"rgba(16,185,129,.08)":"var(--surf3)",color:o.val?"var(--em)":"var(--t3)",fontSize:11.5,fontWeight:800,cursor:"pointer"}}>{o.val?"ON":"OFF"}</button>
                </div>
              ))}
            </div>

            <div className="ai-notice">🤖 AI monitors all messages & speech, blocks violations, generates PDF + speech summary, sends instant teacher alerts.</div>

            <div className="link-box">
              <div className="link-box-title">🔗 Room Link</div>
              <div className="link-row"><span className="link-val">{roomLink}</span><button className="copy-btn" onClick={copyLink}>{copied?"✓ Copied!":"Copy"}</button></div>
              <div className="share-actions">
                <button className="share-btn" onClick={()=>{navigator.clipboard.writeText(roomLink);toast$("Link copied!","info");}}>📧 Email</button>
                <button className="share-btn" onClick={()=>{if(navigator.share)navigator.share({title:"Join my study room",url:roomLink});}}>↗ Share</button>
              </div>
            </div>

            <StepsComp steps={steps}/>
            <button className="btn-p ai-btn" onClick={()=>canLaunch&&setShowConfirm(true)} disabled={!canLaunch}>
              {role==="student"&&selectedTeacher?`🤖 Launch & Notify ${selectedTeacher.name.split(" ")[0]}`:"🚀 Start Meeting"}
            </button>
            <div style={{height:24}}/>
          </div>
        </div>
      </div>

      {showSchedule&&<ScheduleMeetingModal config={{title,subject}} onSchedule={(info:any)=>{setScheduledInfo(info);setTitle(info.title);setScheduled(true);setShowSchedule(false);toast$("📅 Meeting scheduled!","success");}} onClose={()=>setShowSchedule(false)}/>}

      {showConfirm&&(
        <div className="overlay">
          <div className="modal" style={{maxWidth:420}}>
            <div style={{background:"linear-gradient(135deg,#0d1428,#1a1040)",padding:"24px 20px",textAlign:"center" as const}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:"var(--grad-ai)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 10px",animation:"aiPulse 2s infinite"}}>🤖</div>
              <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:3}}>{name}</div>
              <div style={{fontSize:11.5,color:"rgba(255,255,255,.5)"}}>{title||"Study Session"}{addDummies?" · +12 demo students":""}</div>
              {selectedTeacher&&<div style={{fontSize:11,color:"rgba(139,92,246,.8)",marginTop:3}}>👩‍🏫 {selectedTeacher.name} — PDF + speech report will be sent</div>}
            </div>
            <div className="mb">
              <CamPreview stream={stream} camOn={camOn} micOn={micOn} name={name} perm={perm} onReq={request} onToggleMic={()=>{const n=!micOn;setMicOn(n);stream?.getAudioTracks().forEach(t=>t.enabled=n);}} onToggleCam={()=>{const n=!camOn;setCamOn(n);stream?.getVideoTracks().forEach(t=>t.enabled=n);}}/>
              <div style={{display:"none",gap:8,marginBottom:12}}>
                <button className={`type-card${micOn?" sel":""}`} style={{flex:1,padding:"10px 8px",justifyContent:"center",fontSize:12}} onClick={()=>setMicOn(m=>!m)}>{micOn?"🎤":"🔇"} {micOn?"Mic On":"Mic Off"}</button>
                <button className={`type-card${camOn?" sel":""}`} style={{flex:1,padding:"10px 8px",justifyContent:"center",fontSize:12}} onClick={()=>setCamOn(c=>!c)}>{camOn?"📹":"🚫"} {camOn?"Cam On":"Cam Off"}</button>
              </div>
              {role==="student"&&selectedTeacher&&(
                <div style={{background:"rgba(139,92,246,.06)",border:"1.5px solid rgba(139,92,246,.2)",borderRadius:11,padding:"10px 13px",fontSize:11.5,color:"var(--vio)",lineHeight:1.7}}>
                  🤖 AI Teacher joins immediately<br/>📧 {selectedTeacher.name} gets notified &amp; can join anytime<br/>📄 PDF + 🎙️ speech summary sent at meeting end<br/>🔔 Notifications updated in real-time
                </div>
              )}
            </div>
            <div className="mf" style={{flexDirection:"column" as const,gap:8}}>
              <button className="btn-p ai-btn" onClick={handleJoin} disabled={joining||perm!=="granted"} style={{fontSize:14}}>
                {joining?<><span className="loader-spin"/>Launching {joinProgress>0?`${joinProgress}%`:"…"}</>:"🤖 Launch Study Room"}
              </button>
              {joinProgress>0&&<div className="lo-progress"><div className="lo-progress-fill" style={{width:`${joinProgress}%`}}/></div>}
              <button className="btn-s" onClick={()=>setShowConfirm(false)} disabled={joining} style={{width:"100%",justifyContent:"center" as const}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ─── MEETING ROOM ─────────────────────────────────────────────────────────────
function MeetingRoom({config,onEnd}:{config:any;onEnd:(r:any)=>void}) {
  const isStudent=config.role==="student";
  const invitedTeacher:typeof MOCK_TEACHERS[0]|null=config.selectedTeacher||null;

  const [participants,setParticipants]=useState<Participant[]>(()=>{
    const now=Date.now();
    const list:Participant[]=[{
      id:0,name:config.name,stream:config.stream instanceof MediaStream?config.stream:null,
      isLocal:true,isHost:!isStudent,isTeacher:config.role==="teacher",
      micMuted:!config.micOn,camOn:config.camOn||false,
      isSpeaking:false,handRaised:false,avatarColor:COLORS[0],
      strikes:0,chatMuted:false,joinedAt:now,messageCount:0,
    }];
    if(isStudent){
      list.push({id:-1,name:"AI Teacher",stream:null,isAITeacher:true,micMuted:false,camOn:false,isSpeaking:false,handRaised:false,avatarColor:"#8b5cf6",strikes:0,chatMuted:false,joinedAt:now,messageCount:0});
    }
    if(config.addDummies){
      DUMMY_STUDENTS.forEach((dname,i)=>{
        list.push({id:100+i,name:dname,stream:null,micMuted:i%3!==0,camOn:i%2===0,isSpeaking:false,handRaised:i%5===0,avatarColor:COLORS[(i+1)%COLORS.length],strikes:0,chatMuted:false,joinedAt:now+i*1000,messageCount:0});
      });
    }
    (config.invitees||[]).forEach((inv:any,i:number)=>{
      list.push({id:i+1,name:inv.value,stream:null,micMuted:Math.random()>.5,camOn:Math.random()>.4,isSpeaking:false,handRaised:false,avatarColor:inv.color||COLORS[(i+2)%COLORS.length],strikes:0,chatMuted:false,joinedAt:now+i*2000,messageCount:0});
    });
    return list;
  });

  const [micOn,setMicOn]             =useState(config.micOn!==false);
  const [camOn,setCamOn]             =useState(config.camOn||false);
  const [panelTab,setPanelTab]       =useState<string|null>(null);
  const [teacherJoined,setTeacherJoined]=useState(!isStudent);
  const [aiTeacherActive,setAITeacherActive]=useState(isStudent);
  const [showTeacherBanner,setShowTeacherBanner]=useState(false);
  const [meetingLocked,setMeetingLocked]=useState(false);
  const [muteAll,setMuteAll]         =useState(false);
  const [showEnd,setShowEnd]         =useState(false);
  const [showAdd,setShowAdd]         =useState(false);
  const [showWaiting,setShowWaiting] =useState(false);
  const [showReactions,setShowReactions]=useState(false);
  const [showTeacherNotif,setShowTeacherNotif]=useState(false);
  const [chatInput,setChatInput]     =useState("");
  const [tileSize,setTileSize]       =useState<"small"|"medium"|"full">("medium");
  const [screenSharing,setScreenSharing]=useState(false);
  const [shareStream,setShareStream] =useState<MediaStream|null>(null);
  const [fullscreenTile,setFullscreenTile]=useState<Participant|null>(null);
  const [messages,setMessages]       =useState<any[]>(()=>{
    const init=[{sender:"System",senderId:99,text:"📋 Study room rules: No bad words · No sexual/adult content · No cheating · No gossip. All messages are AI-monitored.",time:Date.now(),system:true}];
    if(isStudent) init.push({sender:"AI Teacher",senderId:-1,text:`Hello everyone! I'm your AI study assistant. ${invitedTeacher?`${invitedTeacher.name} has been notified and will join shortly.`:"Your teacher will join soon."} I'm monitoring all messages and speech for academic conduct. A PDF + speech summary report will be sent to the teacher at session end. What topic shall we start with?`,time:Date.now()+100,ai:true});
    return init;
  });
  const [tileReacts,setTileReacts]   =useState<Record<number,any>>({});
  const [waitingQueue,setWaitingQueue]=useState<WaitingEntry[]>([]);
  const [activityLog,setActivityLog] =useState<LogEntry[]>([]);
  const [handQueue,setHandQueue]     =useState<{id:number;name:string}[]>([]);
  const [chatMutedUntil,setChatMutedUntil]=useState<number|null>(null);
  const [strikeAlert,setStrikeAlert] =useState<{strike:number;reason:string;category:ViolationCategory}|null>(null);
  const [urgentTeacherAlert,setUrgentTeacherAlert]=useState<string|null>(null);
  const [aiTyping,setAITyping]       =useState(false);
  const [summaryCount,setSummaryCount]=useState(0);
  const [studentViolations,setStudentViolations]=useState<Record<number,{category:ViolationCategory;detail:string;time:number}[]>>({});
  // Speech tracking
  const [speechLog,setSpeechLog]     =useState<SpeechEntry[]>([]);

  const chatEndRef=useRef<HTMLDivElement>(null);
  const timer=useTimer(true);
  const recorder=useRecorder();
  const {show:toast$,node:toastNode}=useToast();
  const notifStore=useNotificationStore();

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  useEffect(()=>{
    if(!chatMutedUntil) return;
    const id=setInterval(()=>{if(Date.now()>=chatMutedUntil){setChatMutedUntil(null);toast$("✅ Chat access restored","info");}},1000);
    return()=>clearInterval(id);
  },[chatMutedUntil]);

  useEffect(()=>{
    if(!config.enableWaitingRoom) return;
    const t1=setTimeout(()=>setWaitingQueue(q=>[...q,{id:genId(),name:"Student A",time:Date.now()}]),6000);
    const t2=setTimeout(()=>setWaitingQueue(q=>[...q,{id:genId(),name:"Student B",time:Date.now()}]),12000);
    return()=>{clearTimeout(t1);clearTimeout(t2);};
  },[config.enableWaitingRoom]);

  useEffect(()=>{if(waitingQueue.length>0) toast$(`${waitingQueue[waitingQueue.length-1].name} wants to join`,"info");},[waitingQueue.length]); // eslint-disable-line

  // Periodic AI summary
  useEffect(()=>{
    if(!isStudent||!aiTeacherActive) return;
    const id=setInterval(()=>{
      setSummaryCount(c=>{
        const n=c+1;
        const summary=`📊 AI Summary (${n*10} min mark): Session active. ${participants.filter(p=>!p.isAITeacher).length} students present. No critical violations.${invitedTeacher?` Report updates being tracked for ${invitedTeacher.name}.`:""}`;
        setMessages(ms=>[...ms,{sender:"AI Teacher",senderId:-1,text:summary,time:Date.now(),ai:true,summary:true}]);
        if(invitedTeacher) toast$(`📋 Summary sent to ${invitedTeacher.name}`,"info");
        return n;
      });
    },60000);
    return()=>clearInterval(id);
  },[isStudent,aiTeacherActive,invitedTeacher]); // eslint-disable-line

  // Simulated speech from dummy students
  useEffect(()=>{
    if(!config.addDummies) return;
    const speeches = [
      "Can you explain the hybridisation of carbon?",
      "I think the answer to question 3 is option B.",
      "What is the formula for velocity?",
      "I have a doubt about photosynthesis.",
      "Should we write the derivation or just the formula?",
      "How many marks does this question carry?",
      "I finished the first section already.",
      "Can we go over the periodic table again?",
      "Is this going to be in the exam?",
      "I don't understand the last step in the derivation.",
    ];
    const id=setInterval(()=>{
      const activeStudents=DUMMY_STUDENTS.filter((_,i)=>i<8);
      const student=activeStudents[Math.floor(Math.random()*activeStudents.length)];
      const text=speeches[Math.floor(Math.random()*speeches.length)];
      setSpeechLog(l=>[...l,{name:student,text,time:Date.now(),senderId:DUMMY_STUDENTS.indexOf(student)+100}]);
    },45000);
    return()=>clearInterval(id);
  },[config.addDummies]);

  const updateP=useCallback((id:number,patch:Partial<Participant>)=>setParticipants(ps=>ps.map(p=>p.id===id?{...p,...patch}:p)),[]);
  const addLog=useCallback((e:Omit<LogEntry,"time">)=>setActivityLog(l=>[{...e,time:Date.now()},...l.slice(0,99)]),[]);

  const aiRespond=useCallback((userText:string)=>{
    if(!aiTeacherActive) return;
    setAITyping(true);updateP(-1,{isSpeaking:true});
    setTimeout(()=>{
      const reply=getAIResponse(config.subject||"default");
      setMessages(ms=>[...ms,{sender:"AI Teacher",senderId:-1,text:reply,time:Date.now(),ai:true}]);
      setAITyping(false);updateP(-1,{isSpeaking:false});
    },1000+Math.random()*900);
  },[aiTeacherActive,config.subject,updateP]);

  function notifyTeacherViolation(studentName:string,category:ViolationCategory,detail:string){
    if(!invitedTeacher) return;
    const alertMsg=`🚨 URGENT: ${studentName} sent ${CATEGORY_LABELS[category]} in "${config.topic||"Study Session"}". Message: "${detail.slice(0,50)}${detail.length>50?"…":""}"`;
    setUrgentTeacherAlert(alertMsg);
    setTimeout(()=>setUrgentTeacherAlert(null),7000);
    notifStore.addNotification(`🚨 Violation Alert: ${studentName} — ${CATEGORY_LABELS[category]} in "${config.topic||"Study Session"}"`);
    toast$(`🚨 ${invitedTeacher.name} notified of violation`,"warn");
  }

  function getStream(){return participants.find(p=>p.isLocal)?.stream??config.stream??null;}

  const toggleMic=()=>{
    const n=!micOn;setMicOn(n);
    const s=getStream();
    if(s instanceof MediaStream) s.getAudioTracks().forEach(t=>t.enabled=n);
    updateP(0,{micMuted:!n});
  };
  const toggleCam=()=>{
    const s=getStream();if(!(s instanceof MediaStream))return;
    const n=!camOn;setCamOn(n);s.getVideoTracks().forEach(t=>t.enabled=n);updateP(0,{camOn:n});
  };
  const toggleHand=()=>{
    const me=participants.find(p=>p.isLocal);const v=!me?.handRaised;
    updateP(0,{handRaised:v});
    if(v){setHandQueue(q=>[...q,{id:0,name:config.name}]);toast$("✋ Hand raised!","warn");}
    else setHandQueue(q=>q.filter(x=>x.id!==0));
  };

  async function toggleScreenShare(){
    if(screenSharing){
      shareStream?.getTracks().forEach(t=>t.stop());
      setShareStream(null);setScreenSharing(false);
      toast$("🖥️ Screen share ended","info"); return;
    }
    try {
      const ss=await (navigator.mediaDevices as any).getDisplayMedia({video:{displaySurface:"screen"},audio:false});
      ss.getVideoTracks()[0].addEventListener("ended",()=>{setShareStream(null);setScreenSharing(false);});
      setShareStream(ss);setScreenSharing(true);
      toast$("🖥️ Screen sharing started","success");
    } catch { toast$("Screen share cancelled","warn"); }
  }

  function simulateTeacherJoin(){
    if(!invitedTeacher) return;
    const tId=Date.now();
    setParticipants(ps=>[...ps,{id:tId,name:invitedTeacher.name,stream:null,isTeacher:true,isHost:true,micMuted:false,camOn:false,isSpeaking:false,handRaised:false,avatarColor:"#8b5cf6",strikes:0,chatMuted:false,joinedAt:Date.now(),messageCount:0}]);
    setTeacherJoined(true);setAITeacherActive(false);
    setShowTeacherBanner(true);setTimeout(()=>setShowTeacherBanner(false),5000);
    updateP(-1,{isSpeaking:false});
    setMessages(ms=>[...ms,{sender:"System",senderId:99,text:`👩‍🏫 ${invitedTeacher.name} has joined and taken over as host. AI Teacher is now in assistant mode.`,time:Date.now(),system:true},{sender:invitedTeacher.name,senderId:tId,text:`Hello everyone! Great to be here. The AI briefed me. Let's continue together!`,time:Date.now()+200,teacher:true}]);
    addLog({user:invitedTeacher.name,action:"Teacher joined — AI stepped back"});
    toast$(`✅ ${invitedTeacher.name} joined!`,"success");
  }

  function sendMsg(text:string){
    if(!text.trim()) return;
    const now=Date.now();
    const isChatMuted=chatMutedUntil&&now<chatMutedUntil;
    if(isChatMuted){toast$("🚫 Chat muted","error");return;}
    const result=moderateMessage(text);
    if(result.blocked&&result.category){
      const me=participants.find(p=>p.isLocal);const ns=(me?.strikes||0)+1;
      updateP(0,{strikes:ns});
      setParticipants(ps=>ps.map(p=>p.id===0?{...p,messageCount:p.messageCount+1}:p));
      setMessages(ms=>[...ms,{sender:config.name,senderId:0,text:`[BLOCKED] ${text}`,time:now,blocked:true,category:result.category}]);
      setStrikeAlert({strike:ns,reason:result.reason!,category:result.category});
      addLog({user:config.name,action:"Message blocked",category:result.category,detail:text.slice(0,80),severity:result.severity});
      setStudentViolations(sv=>({...sv,0:[...(sv[0]||[]),{category:result.category!,detail:text.slice(0,80),time:now}]}));
      notifyTeacherViolation(config.name,result.category,text);
      if(aiTeacherActive){
        const warningPool=AI_WARNINGS[result.category]||AI_WARNINGS.bad_word;
        const warning=warningPool[Math.floor(Math.random()*warningPool.length)];
        setTimeout(()=>setMessages(ms=>[...ms,{sender:"AI Teacher",senderId:-1,text:warning,time:Date.now(),ai:true,warn:true}]),400);
      }
      if(ns===2){
        const until=now+5*60*1000;setChatMutedUntil(until);
        setMessages(ms=>[...ms,{sender:"System",senderId:99,text:"🚫 Chat suspended for 5 minutes due to repeated violations.",time:now+1,system:true}]);
        addLog({user:config.name,action:"Chat muted 5 min",category:result.category});
        notifyTeacherViolation(config.name,result.category,`SECOND VIOLATION — chat suspended. Original: ${text.slice(0,60)}`);
      }
      if(ns>=3){
        setMessages(ms=>[...ms,{sender:"System",senderId:99,text:`❌ ${config.name} has been removed for repeated violations.`,time:now+2,system:true}]);
        addLog({user:config.name,action:"REMOVED from room — 3 strikes",category:result.category});
        notifyTeacherViolation(config.name,result.category,`REMOVED after 3 strikes. Final: ${text.slice(0,60)}`);
        setTimeout(()=>handleEnd(),2500);
      }
      setChatInput(""); return;
    }
    setMessages(ms=>[...ms,{sender:config.name,senderId:0,text:text.trim(),time:now}]);
    setParticipants(ps=>ps.map(p=>p.id===0?{...p,isSpeaking:true,messageCount:p.messageCount+1}:p));
    // Add to speech log
    setSpeechLog(l=>[...l,{name:config.name,text:text.trim(),time:now,senderId:0}]);
    setTimeout(()=>updateP(0,{isSpeaking:false}),1200);
    setChatInput("");
    if(aiTeacherActive&&Math.random()>.38) aiRespond(text);
  }

  function sendReaction(emoji:string){
    setShowReactions(false);
    const k=Date.now();
    setTileReacts(tr=>({...tr,0:{emoji,key:k}}));
    setTimeout(()=>setTileReacts(tr=>{const n={...tr};delete n[0];return n;}),2400);
  }

  function admitStudent(id:string){
    const s=waitingQueue.find(x=>x.id===id);if(!s) return;
    setWaitingQueue(q=>q.filter(x=>x.id!==id));
    const nId=Date.now();
    setParticipants(ps=>[...ps,{id:nId,name:s.name,stream:null,micMuted:true,camOn:false,isSpeaking:false,handRaised:false,avatarColor:COLORS[ps.length%COLORS.length],strikes:0,chatMuted:false,joinedAt:Date.now(),messageCount:0}]);
    addLog({user:s.name,action:"Admitted from waiting room"});
    toast$(`✅ ${s.name} admitted`,"success");
  }
  function denyStudent(id:string){const s=waitingQueue.find(x=>x.id===id);if(s){addLog({user:s.name,action:"Denied from waiting room"});toast$(`${s.name} denied`,"warn");}setWaitingQueue(q=>q.filter(x=>x.id!==id));}
  function removeParticipant(id:number){const p=participants.find(x=>x.id===id);if(!p)return;setParticipants(ps=>ps.filter(x=>x.id!==id));setMessages(ms=>[...ms,{sender:"System",senderId:99,text:`🚷 ${p.name} was removed.`,time:Date.now(),system:true}]);addLog({user:p.name,action:"Removed by host"});toast$(`${p.name} removed`,"warn");}
  function muteParticipant(id:number){const p=participants.find(x=>x.id===id);if(!p)return;updateP(id,{micMuted:true});addLog({user:p.name,action:"Muted by host"});toast$(`${p.name} muted`,"info");}
  function handleMuteAll(){const n=!muteAll;setMuteAll(n);setParticipants(ps=>ps.map(p=>(p.isLocal&&p.isHost)||p.isAITeacher?p:{...p,micMuted:n}));if(n){addLog({user:"All participants",action:"Muted by host"});toast$("🔇 All muted","warn");}else toast$("🎤 All unmuted","info");}

  function buildFinalReport():StudentSummary[] {
    return participants.filter(p=>!p.isAITeacher).map(p=>({
      name:p.name,id:p.id,strikes:p.strikes,
      violations:studentViolations[p.id]||[],
      messageCount:p.messageCount,joinedAt:p.joinedAt,
      behaviorRating:p.strikes===0?"excellent":p.strikes===1?"good":p.strikes===2?"warning":"removed" as any,
    }));
  }

  function buildSpeechSummary():{name:string;speeches:string[];count:number}[] {
    const byStudent:{[k:string]:{name:string;speeches:string[];count:number}}={};
    // Chat messages
    messages.filter(m=>!m.system&&!m.ai&&!m.blocked&&!m.teacher&&m.sender!=="System").forEach(m=>{
      if(!byStudent[m.sender]) byStudent[m.sender]={name:m.sender,speeches:[],count:0};
      if(!byStudent[m.sender].speeches.includes(m.text)){byStudent[m.sender].speeches.push(m.text);byStudent[m.sender].count++;}
    });
    // Simulated speech
    speechLog.forEach(s=>{
      if(!byStudent[s.name]) byStudent[s.name]={name:s.name,speeches:[],count:0};
      if(!byStudent[s.name].speeches.includes(s.text)){byStudent[s.name].speeches.push(s.text);byStudent[s.name].count++;}
    });
    return Object.values(byStudent);
  }

  async function handleEnd(){
    participants.forEach(p=>{if(p.isLocal&&p.stream instanceof MediaStream) p.stream.getTracks().forEach(t=>t.stop());});
    if(config.stream instanceof MediaStream) config.stream.getTracks().forEach((t:MediaStreamTrack)=>t.stop());
    if(shareStream) shareStream.getTracks().forEach(t=>t.stop());
    if(recorder.isRecording) recorder.stop();

    const report=buildFinalReport();
    const speechSummary=buildSpeechSummary();
    const violations=activityLog.filter(l=>l.category).length;

    // Generate PDF blob
    let pdfBlob:Blob|null=null;
    try {
      pdfBlob=await generateSessionPDF({
        topic:config.topic||"Study Session",
        subject:config.subject||"General",
        teacherName:invitedTeacher?.name||"Teacher",
        teacherEmail:invitedTeacher?.email||"teacher@school.edu",
        duration:timer.display,
        participants:participants.filter(p=>!p.isAITeacher).length,
        studentReport:report,
        violations,
        teacherJoined,
        roomLink:config.roomLink||"",
        activityLog,
        speechSummary,
      });
    } catch(e) { console.error("PDF generation failed:",e); }

    // Meeting ended notification
    const endMsg=`📹 Meeting ended: "${config.topic||"Study Session"}" — Duration: ${timer.display}, ${participants.filter(p=>!p.isAITeacher).length} students, ${violations} violation${violations!==1?"s":""}. Room: ${config.roomLink||""}${invitedTeacher?` — PDF + speech report sent to ${invitedTeacher.name}.`:""}`;
    notifStore.addNotification(endMsg);
    // PDF notification
    if(invitedTeacher){
      notifStore.addNotification(`📄 PDF + Speech Report ready for "${config.topic||"Study Session"}" — sent to ${invitedTeacher.name} at ${invitedTeacher.email}.`);
    }

    onEnd({
      timer:timer.display,timerSeconds:timer.seconds,
      mode:"meeting",topic:config.topic,subject:config.subject,
      participants:participants.filter(p=>!p.isAITeacher).length,
      recorder,hasRecording:!!recorder.blob,
      violations,teacherJoined,summaryCount,
      teacherName:invitedTeacher?.name,
      teacherEmail:invitedTeacher?.email,
      studentReport:report,
      activityLog,studentViolations,
      speechSummary,speechLog,
      roomTopic:config.topic||"Study Session",
      roomLink:config.roomLink||"",
      pdfBlob,
    });
  }

  const allTiles=aiTeacherActive?participants:participants.filter(p=>!p.isAITeacher);
  const n=allTiles.length;
  const gc=getGridClass(n,tileSize);

  const me=participants.find(p=>p.isLocal);
  const isChatMuted=chatMutedUntil?Date.now()<chatMutedUntil:false;
  const pendingWait=waitingQueue.length;
  const pendingHands=handQueue.length;
  const canControl=config.role==="teacher"||(isStudent&&!teacherJoined);
  const activeJoinReq=canControl&&waitingQueue.length>0?waitingQueue[0]:null;

  return (
    <div className="mp-room">
      {recorder.isRecording&&<div className="rec-overlay">⏺ REC {timer.display}</div>}
      {strikeAlert&&<StrikeAlert {...strikeAlert} onClose={()=>setStrikeAlert(null)}/>}
      {urgentTeacherAlert&&(
        <div className="urgent-teacher-alert">
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:6}}><span style={{fontSize:18}}>🚨</span><span style={{fontSize:12.5,fontWeight:800,color:"var(--amb)"}}>Teacher Alert Sent</span></div>
          <div style={{fontSize:11.5,color:"rgba(255,255,255,.7)",lineHeight:1.6}}>{urgentTeacherAlert}</div>
        </div>
      )}
      {showTeacherBanner&&invitedTeacher&&(
        <div className="teacher-join-banner"><span>👩‍🏫</span> {invitedTeacher.name} joined as host! AI Teacher is now in assistant mode.</div>
      )}

      {/* Fullscreen tile overlay */}
      {fullscreenTile&&(
        <div className="tile-fullscreen-overlay">
          <div className="tfo-bar">
            <div className="tfo-name">⤢ {fullscreenTile.name}</div>
            <button className="tfo-close" onClick={()=>setFullscreenTile(null)}>✕ Exit Fullscreen</button>
          </div>
          <div className="tfo-content">
            <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#0d1428"}}>
              <div className="tile-av" style={{width:120,height:120,background:(fullscreenTile.avatarColor||avColor(fullscreenTile.name))+"28",color:fullscreenTile.avatarColor||avColor(fullscreenTile.name),fontSize:48}}>
                {avInit(fullscreenTile.name)}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeJoinReq&&(
        <div className="join-request-pop">
          <div className="join-request-head">
            <div><div style={{fontSize:12.5,fontWeight:800,color:"#fff"}}>Join Request</div><div style={{fontSize:10,color:"rgba(255,255,255,.35)",marginTop:2}}>Someone wants to enter</div></div>
            <button className="mh-close" style={{borderColor:"rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)"}} onClick={()=>setShowWaiting(true)}>⋯</button>
          </div>
          <div style={{padding:12}}>
            <div style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:11,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",marginBottom:10}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:avColor(activeJoinReq.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>{avInit(activeJoinReq.name)}</div>
              <div><div style={{fontSize:12.5,fontWeight:800,color:"#fff"}}>{activeJoinReq.name}</div><div style={{fontSize:10,color:"rgba(255,255,255,.35)"}}>Requested {Math.max(1,Math.floor((Date.now()-activeJoinReq.time)/1000))}s ago</div></div>
            </div>
            <div style={{display:"flex",gap:7}}>
              <button className="btn-g" style={{flex:1,fontSize:11.5,justifyContent:"center"}} onClick={()=>admitStudent(activeJoinReq.id)}>✓ Admit</button>
              <button className="btn-d" style={{flex:1,fontSize:11.5,justifyContent:"center"}} onClick={()=>denyStudent(activeJoinReq.id)}>✕ Deny</button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="room-bar">
        <div className="room-logo"><div className="room-logo-ico">📹</div>MeetHub</div>
        <div className="rbar-div"/>
        <div className="rbar-topic"><strong>{config.topic||"Study Room"}</strong>{config.subject?` · ${config.subject}`:""}</div>
        <div className="rbar-pill pill-timer">{timer.display}</div>
        {recorder.isRecording&&<div className="rbar-pill pill-rec"><div className="pill-rec-dot"/>REC</div>}
        {aiTeacherActive&&<div className="rbar-pill pill-ai">🤖 AI Proctoring</div>}
        {meetingLocked&&<div className="rbar-pill" style={{background:"rgba(239,68,68,.14)",border:"1px solid rgba(239,68,68,.3)",color:"var(--red)"}}>🔒 Locked</div>}
        {screenSharing&&<div className="rbar-pill" style={{background:"rgba(14,165,233,.2)",border:"1px solid rgba(14,165,233,.4)",color:"var(--ind3)"}}>🖥️ Sharing</div>}
        {participants.filter(p=>!p.isAITeacher&&p.strikes>0).length>0&&<div className="rbar-pill pill-warn">⚠️ {participants.filter(p=>!p.isAITeacher&&p.strikes>0).length} warning{participants.filter(p=>!p.isAITeacher&&p.strikes>0).length>1?"s":""}</div>}

        {/* TILE SIZE CONTROLS */}
        <div className="tile-size-bar">
          {(["S","M","F"] as const).map((lbl,i)=>{
            const vals=["small","medium","full"] as const;
            return <button key={lbl} className={`tsz-btn${tileSize===vals[i]?" active":""}`} title={["Small","Medium","Full"][i]} onClick={()=>setTileSize(vals[i])}>{lbl}</button>;
          })}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:4}}>
          {config.role==="teacher"&&<span className="host-badge">👩‍🏫 Teacher</span>}
          {isStudent&&!teacherJoined&&<span className="ai-host-badge">🤖 AI Hosting</span>}
          <span style={{padding:"3px 8px",borderRadius:6,background:"rgba(14,165,233,.14)",border:"1px solid rgba(14,165,233,.22)",fontSize:10.5,fontWeight:700,color:"var(--ind3)"}}>{n} tiles</span>
          {invitedTeacher&&!teacherJoined&&<button style={{padding:"4px 10px",borderRadius:7,border:"1px solid rgba(139,92,246,.3)",background:"rgba(139,92,246,.1)",color:"var(--vio)",fontSize:10.5,fontWeight:700,cursor:"pointer"}} onClick={simulateTeacherJoin}>Simulate: {invitedTeacher.name.split(" ").slice(-1)[0]} joins</button>}
          <button className="rbar-end" onClick={()=>setShowEnd(true)}>✕ End</button>
        </div>
      </div>

      {meetingLocked&&<div className="lock-banner"><span style={{fontSize:13}}>🔒</span><span style={{fontSize:11,fontWeight:700,color:"var(--red)"}}>Meeting locked — new participants cannot join</span></div>}

      <div className="room-body">
        <div className="grid-area">
          {/* VIDEO AREA */}
          {screenSharing?(
            <div className="vid-outer screenshare-active">
              <div className="screenshare-main">
                <div style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:700,textAlign:"center" as const}}>
                  <div style={{fontSize:36,marginBottom:8}}>🖥️</div>
                  Screen Share Active<br/>
                  <span style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>Your screen is being shared</span>
                </div>
                <div className="screen-label">🖥️ {config.name}'s Screen</div>
                <button onClick={toggleScreenShare} style={{position:"absolute",bottom:10,right:10,padding:"5px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,.4)",background:"rgba(239,68,68,.15)",color:"var(--red)",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"var(--font)"}}>Stop Sharing</button>
              </div>
              <div className="screenshare-sidebar">
                <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"rgba(255,255,255,.22)",padding:"0 2px 5px"}}>Participants ({allTiles.filter(p=>!p.isAITeacher).length})</div>
                <div className="screenshare-sidebar-inner">
                  {allTiles.filter(p=>!p.isAITeacher).map(p=>(
                    <Tile key={p.id} p={p} reaction={tileReacts[p.id]} tileSize="small" onFullscreen={setFullscreenTile}/>
                  ))}
                </div>
              </div>
            </div>
          ):(
            <div className={`vid-outer ${tileSize}`}>
              <div className={`vid-grid ${gc}`} style={tileSize==="medium"?{height:"100%"}:{}}>
                {allTiles.map(p=><Tile key={p.id} p={p} reaction={tileReacts[p.id]} tileSize={tileSize} onFullscreen={setFullscreenTile}/>)}
              </div>
            </div>
          )}

          {/* CTRL BAR */}
          <div className="ctrl-bar">
            <div className="cg">
              <button className={`cbtn ${micOn?"on":"off"}`} onClick={toggleMic}><span className="cbtn-ico">{micOn?"🎤":"🔇"}</span><span>{micOn?"Mute":"Unmute"}</span></button>
              <button className={`cbtn ${camOn?"on":"off"}`} onClick={toggleCam}><span className="cbtn-ico">{camOn?"📹":"🚫"}</span><span>{camOn?"Stop":"Camera"}</span></button>
              <button className={`cbtn${screenSharing?" screen-active":""}`} onClick={toggleScreenShare}><span className="cbtn-ico">🖥️</span><span>{screenSharing?"Stop":"Share"}</span></button>
              <div style={{position:"relative"}}>
                <button className={`cbtn${showReactions?" hi":""}`} onClick={()=>setShowReactions(r=>!r)}><span className="cbtn-ico">😊</span><span>React</span></button>
                {showReactions&&<div className="react-pop">{REACTIONS.map(r=><button key={r} className="react-emoji" onClick={()=>sendReaction(r)}>{r}</button>)}</div>}
              </div>
              <button className={`cbtn${me?.handRaised?" amb":""}`} onClick={toggleHand}><span className="cbtn-ico">✋</span><span>{me?.handRaised?"Lower":"Hand"}</span></button>
            </div>
            {canControl&&(
              <div className="cg">
                <button className={`cbtn${muteAll?" off":""}`} onClick={handleMuteAll}><span className="cbtn-ico">{muteAll?"🔇":"🔈"}</span><span>{muteAll?"Unmute":"Mute All"}</span></button>
                <button className={`cbtn${meetingLocked?" red-hi":""}`} onClick={()=>{setMeetingLocked(l=>!l);toast$(meetingLocked?"🔓 Unlocked":"🔒 Locked",meetingLocked?"info":"warn");}}><span className="cbtn-ico">{meetingLocked?"🔓":"🔒"}</span><span>{meetingLocked?"Unlock":"Lock"}</span></button>
                <button className={`cbtn${pendingWait>0?" amb":""}`} onClick={()=>setShowWaiting(true)}><span className="cbtn-ico">⏳</span><span>Wait{pendingWait>0?` (${pendingWait})`:""}</span></button>
                <button className={`cbtn${panelTab==="log"?" hi":""}`} onClick={()=>setPanelTab(p=>p==="log"?null:"log")}><span className="cbtn-ico">📋</span><span>Log</span></button>
                <button className={`cbtn${panelTab==="speech"?" hi":""}`} onClick={()=>setPanelTab(p=>p==="speech"?null:"speech")}><span className="cbtn-ico">🎙️</span><span>Speech</span></button>
              </div>
            )}
            <div className="cg">
              <button className={`cbtn${recorder.isRecording?" rec":""}`} onClick={()=>recorder.isRecording?(recorder.stop(),toast$("Recording stopped","warn")):recorder.start(getStream()).then((ok:boolean)=>ok?toast$("🔴 Recording","info"):toast$("Share screen first","error"))}><span className="cbtn-ico">⏺</span><span>{recorder.isRecording?"Stop":"Record"}</span></button>
              <button className="cbtn" onClick={()=>setShowAdd(true)}><span className="cbtn-ico">➕</span><span>Add</span></button>
              {isStudent&&invitedTeacher&&!teacherJoined&&<button className="cbtn vio" onClick={()=>setShowTeacherNotif(true)}><span className="cbtn-ico">🔔</span><span>Notify</span></button>}
            </div>
            <div className="cg">
              {canControl&&pendingHands>0&&<button className="cbtn amb" onClick={()=>setPanelTab("hands")}><span className="cbtn-ico">✋</span><span>({pendingHands})</span></button>}
              <button className={`cbtn${panelTab==="people"?" hi":""}`} onClick={()=>setPanelTab(p=>p==="people"?null:"people")}><span className="cbtn-ico">👥</span><span>People ({allTiles.length})</span></button>
              <button className={`cbtn${panelTab==="chat"?" hi":""}`} onClick={()=>setPanelTab(p=>p==="chat"?null:"chat")}><span className="cbtn-ico">💬</span><span>Chat</span></button>
              <button className="end-btn" onClick={()=>setShowEnd(true)}>End</button>
            </div>
          </div>
        </div>

        {/* SIDE PANEL */}
        {panelTab&&(
          <div className="side-panel">
            <div className="panel-tabs-dark">
              {[{id:"people",ico:"👥",lbl:"People"},{id:"chat",ico:"💬",lbl:"Chat"},...(canControl?[{id:"log",ico:"📋",lbl:"Log"},{id:"speech",ico:"🎙️",lbl:"Speech"},{id:"hands",ico:"✋",lbl:"Hands"}]:[])].map(t=>(
                <button key={t.id} className={`ptab${panelTab===t.id?" active":""}`} onClick={()=>setPanelTab(t.id)}>{t.ico}<span style={{fontSize:7.5,display:"block"}}>{t.lbl}</span></button>
              ))}
              <button className="ptab-cls" onClick={()=>setPanelTab(null)}>✕</button>
            </div>

            {/* PEOPLE */}
            {panelTab==="people"&&(
              <div className="pscroll">
                <div style={{padding:"6px 8px 3px",fontSize:9,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"rgba(255,255,255,.22)"}}>{allTiles.length} in room</div>
                {aiTeacherActive&&(
                  <div style={{padding:"5px 8px"}}>
                    <div className="p-row" style={{borderColor:"rgba(139,92,246,.35)",background:"rgba(139,92,246,.07)"}}>
                      <div className="p-av" style={{background:"linear-gradient(135deg,#8b5cf6,#6366f1)"}}>🤖</div>
                      <div className="p-info"><div className="p-name">AI Teacher</div><div className="p-role" style={{color:"rgba(139,92,246,.6)"}}>🛡️ Proctoring · Monitoring all messages</div></div>
                      {invitedTeacher&&!teacherJoined&&<span style={{fontSize:8.5,color:"rgba(245,158,11,.7)",fontWeight:700}}>⏳</span>}
                    </div>
                  </div>
                )}
                {canControl&&waitingQueue.length>0&&(
                  <div style={{padding:"0 6px 8px"}}>
                    <div style={{padding:"8px 10px",borderRadius:10,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.16)"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><div style={{fontSize:10.5,fontWeight:800,color:"#fde68a"}}>Waiting ({waitingQueue.length})</div><button className="btn-s" style={{fontSize:9.5,padding:"3px 8px"}} onClick={()=>waitingQueue.forEach(s=>admitStudent(s.id))}>Admit all</button></div>
                      {waitingQueue.map(s=>(
                        <div key={s.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 7px",borderRadius:8,background:"rgba(255,255,255,.05)",marginBottom:3}}>
                          <div className="p-av" style={{background:avColor(s.name),width:24,height:24,fontSize:9}}>{avInit(s.name)}</div>
                          <div style={{flex:1,fontSize:11,fontWeight:700,color:"#fff"}}>{s.name}</div>
                          <button className="btn-g" style={{fontSize:9.5,padding:"2px 8px"}} onClick={()=>admitStudent(s.id)}>✓</button>
                          <button className="btn-d" style={{fontSize:9.5,padding:"2px 8px"}} onClick={()=>denyStudent(s.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-list">
                  {allTiles.filter(p=>!p.isAITeacher).map(p=>{
                    const c=p.avatarColor||avColor(p.name);
                    return (
                      <div key={p.id} className={`p-row${p.isSpeaking?" spk":""}`}>
                        <div className="p-av" style={{background:c+"28",color:c,width:26,height:26,fontSize:10}}>{avInit(p.name)}</div>
                        <div className="p-info">
                          <div className="p-name">{p.name}{p.isLocal?" (You)":""}{p.isSpeaking?" 🔊":""}{p.handRaised?" ✋":""}</div>
                          <div className="p-role">{p.isTeacher?"👩‍🏫 Teacher":p.isHost?"👑 Host":"🎓 Student"}{p.strikes>0&&<span style={{color:p.strikes>=3?"var(--red)":"var(--amb)",marginLeft:4,fontSize:8.5}}>⚠️{p.strikes}/3</span>}</div>
                        </div>
                        <span style={{fontSize:10.5,color:p.micMuted?"var(--red)":"var(--em)"}}>{p.micMuted?"🔇":"🎤"}</span>
                        {canControl&&!p.isLocal&&!p.isTeacher&&!p.isAITeacher&&(
                          <div style={{display:"flex",gap:2,marginLeft:2}}>
                            <button onClick={()=>muteParticipant(p.id)} style={{width:16,height:16,borderRadius:4,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.5)",cursor:"pointer",fontSize:8.5,display:"flex",alignItems:"center",justifyContent:"center"}}>🔇</button>
                            <button onClick={()=>removeParticipant(p.id)} style={{width:16,height:16,borderRadius:4,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.08)",color:"var(--red)",cursor:"pointer",fontSize:8.5,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CHAT */}
            {panelTab==="chat"&&(
              <div style={{display:"flex",flexDirection:"column" as const,height:"100%",minHeight:0}}>
                <div className="pscroll" style={{flex:1}}>
                  <div className="chat-msgs">
                    {messages.map((m,i)=>{
                      const own=m.sender===config.name;
                      const isAI=m.ai;const isTeacher=m.teacher;
                      const c=isAI?"#8b5cf6":isTeacher?"#8b5cf6":COLORS[m.senderId%COLORS.length];
                      if(m.system) return <div key={i} style={{padding:"4px 7px",fontSize:10,color:"rgba(255,255,255,.35)",background:"rgba(255,255,255,.03)",borderRadius:7,border:"1px solid rgba(255,255,255,.06)",textAlign:"center",lineHeight:1.5}}>{m.text}</div>;
                      if(m.summary) return <div key={i} className="ai-summary-card"><div className="ai-summary-title">📊 AI Summary</div><div className="ai-summary-body">{m.text}</div></div>;
                      return (
                        <div key={i} className={`chat-msg${own?" own":""}`}>
                          {!own&&<div className="chat-av-sm" style={{background:c+"40",color:c,width:18,height:18,fontSize:7.5}}>{isAI?"🤖":m.sender[0]?.toUpperCase()}</div>}
                          <div className="chat-bwrap">
                            {!own&&<span className="chat-sender" style={{color:isAI?"rgba(139,92,246,.7)":isTeacher?"rgba(139,92,246,.7)":"rgba(255,255,255,.28)"}}>{m.sender}{isAI?" (AI)":""}</span>}
                            <div className={`chat-bubble ${m.blocked?"bubble-blocked":own?"bubble-own":isAI&&m.warn?"bubble-ai-warn":isAI||isTeacher?"bubble-ai":"bubble-o"}`}>{m.text}{m.category&&<div style={{fontSize:7.5,marginTop:2,opacity:.65}}>{CATEGORY_LABELS[m.category as ViolationCategory]}</div>}</div>
                            <span className="chat-time">{fmtTime(m.time)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {aiTyping&&<div className="chat-msg"><div className="chat-av-sm" style={{background:"rgba(139,92,246,.4)",color:"#8b5cf6",width:18,height:18,fontSize:7.5}}>🤖</div><div className="chat-bwrap"><span className="chat-sender" style={{color:"rgba(139,92,246,.7)"}}>AI Teacher</span><div className="chat-bubble bubble-ai" style={{padding:"5px 10px"}}><span style={{display:"inline-flex",gap:3}}>{[0,1,2].map(i=><span key={i} style={{width:4,height:4,borderRadius:"50%",background:"rgba(139,92,246,.7)",display:"inline-block",animation:"dotPulse 1.4s ease-in-out infinite",animationDelay:`${i*.2}s`}}/>)}</span></div></div></div>}
                    <div ref={chatEndRef}/>
                  </div>
                </div>
                {isChatMuted&&<div className="chat-muted-banner">🚫 Chat suspended · {Math.ceil((chatMutedUntil!-Date.now())/60000)}m remaining</div>}
                <div className="chat-ia">
                  <textarea className="chat-inp" placeholder={isChatMuted?"Chat muted…":"Type here (AI moderated)…"} value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg(chatInput);}}} rows={1} disabled={isChatMuted}/>
                  <button className="chat-send" onClick={()=>sendMsg(chatInput)} disabled={isChatMuted}>➤</button>
                </div>
                <div style={{padding:"3px 7px",fontSize:8.5,color:"rgba(255,255,255,.2)",textAlign:"center" as const}}>🛡️ AI-monitored · Violations reported to teacher</div>
              </div>
            )}

            {/* SPEECH LOG */}
            {panelTab==="speech"&&canControl&&(
              <div className="pscroll">
                <div style={{padding:"6px 8px 3px",fontSize:9,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"rgba(255,255,255,.22)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span>🎙️ Speech & Chat Log ({speechLog.length + messages.filter(m=>!m.system&&!m.ai&&!m.blocked&&!m.teacher).length})</span>
                </div>
                <div style={{padding:"4px 6px"}}>
                  <div style={{padding:"5px 7px",borderRadius:7,background:"rgba(139,92,246,.08)",border:"1px solid rgba(139,92,246,.15)",fontSize:9.5,color:"rgba(139,92,246,.7)",marginBottom:8,lineHeight:1.5}}>
                    All student chat messages are recorded here. AI will summarise for the teacher's PDF report at session end.
                  </div>
                  {[...speechLog,...messages.filter(m=>!m.system&&!m.ai&&!m.blocked&&!m.teacher&&m.sender!=="System").map(m=>({name:m.sender,text:m.text,time:m.time,senderId:m.senderId}))].sort((a,b)=>b.time-a.time).slice(0,40).map((l,i)=>(
                    <div key={i} className="speech-row">
                      <div className="speech-av" style={{background:avColor(l.name)+"40",color:avColor(l.name)}}>{avInit(l.name)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="speech-name">{l.name}</div>
                        <div className="speech-text">"{l.text}"</div>
                      </div>
                      <div className="speech-time">{fmtTime(l.time)}</div>
                    </div>
                  ))}
                  {speechLog.length===0&&messages.filter(m=>!m.system&&!m.ai&&!m.blocked&&!m.teacher).length===0&&<div className="chat-empty">No speech/chat logged yet.<br/><span style={{fontSize:10}}>Messages will appear here.</span></div>}
                </div>
              </div>
            )}

            {/* LOG */}
            {panelTab==="log"&&canControl&&(
              <div className="pscroll">
                <div style={{padding:"6px 8px 3px",fontSize:9,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"rgba(255,255,255,.22)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span>Activity Log ({activityLog.length})</span>
                  <button onClick={()=>setActivityLog([])} style={{fontSize:8.5,color:"rgba(255,255,255,.2)",background:"none",border:"none",cursor:"pointer"}}>Clear</button>
                </div>
                <div style={{padding:"4px 6px"}}>
                  {activityLog.length===0&&<div className="chat-empty">No activity logged yet.</div>}
                  {activityLog.map((l,i)=>(
                    <div key={i} className={`log-row${l.category?" "+CAT_LOG_CLASS[l.category]:""}`}>
                      <div className="log-time">{fmtTime(l.time)}</div>
                      <div className="log-content"><div className="log-user">{l.user}</div><div className="log-detail">{l.action}{l.detail?` — "${l.detail.slice(0,40)}"`:""}</div>{l.category&&<span className={`log-cat ${CAT_CLASS[l.category]}`}>{CATEGORY_LABELS[l.category]}</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HANDS */}
            {panelTab==="hands"&&canControl&&(
              <div className="pscroll">
                <div style={{padding:"6px 8px 3px",fontSize:9,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"rgba(255,255,255,.22)"}}>Hand Queue</div>
                <div style={{padding:"4px 6px"}}>
                  {handQueue.length===0&&<div className="chat-empty">No hands raised.</div>}
                  {handQueue.map((h,i)=>(
                    <div key={h.id} className="hq-row">
                      <div className="hq-num">{i+1}</div>
                      <div style={{flex:1,fontSize:11.5,fontWeight:700,color:"#fff"}}>{h.name}</div>
                      <button onClick={()=>{updateP(h.id,{handRaised:false});setHandQueue(q=>q.filter(x=>x.id!==h.id));}} style={{fontSize:9,padding:"2px 8px",borderRadius:5,background:"rgba(245,158,11,.15)",border:"1px solid rgba(245,158,11,.3)",color:"var(--amb)",cursor:"pointer",fontWeight:700}}>Lower</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* WAITING ROOM MODAL */}
      {showWaiting&&canControl&&(
        <div className="overlay" onClick={()=>setShowWaiting(false)}>
          <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div className="mh"><span className="mh-title">⏳ Waiting Room ({waitingQueue.length})</span><button className="mh-close" onClick={()=>setShowWaiting(false)}>✕</button></div>
            <div className="mb">
              {waitingQueue.length===0&&<div style={{textAlign:"center" as const,padding:"20px",color:"var(--t3)"}}>No students waiting.</div>}
              {waitingQueue.map(s=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px",borderRadius:11,border:"1.5px solid var(--bdr)",background:"var(--surf2)",marginBottom:7}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:avColor(s.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>{avInit(s.name)}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{s.name}</div><div style={{fontSize:10.5,color:"var(--t3)"}}>Waiting {Math.floor((Date.now()-s.time)/1000)}s</div></div>
                  <div style={{display:"flex",gap:6}}><button className="btn-g" style={{fontSize:11,padding:"5px 11px"}} onClick={()=>admitStudent(s.id)}>✓ Admit</button><button className="btn-d" style={{fontSize:11,padding:"5px 11px"}} onClick={()=>denyStudent(s.id)}>✕ Deny</button></div>
                </div>
              ))}
            </div>
            <div className="mf"><button className="btn-p" style={{width:"auto",padding:"8px 18px"}} onClick={()=>waitingQueue.forEach(s=>admitStudent(s.id))}>✓ Admit All</button></div>
          </div>
        </div>
      )}

      {/* ADD PARTICIPANT */}
      {showAdd&&(
        <div className="overlay" onClick={()=>setShowAdd(false)}>
          <div className="modal" style={{maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <div className="mh"><span className="mh-title">➕ Invite Student</span><button className="mh-close" onClick={()=>setShowAdd(false)}>✕</button></div>
            <div className="mb">
              <div className="link-box"><div className="link-box-title">🔗 Room Link</div><div className="link-row"><span className="link-val">{config.roomLink||""}</span><button className="copy-btn" onClick={()=>{navigator.clipboard.writeText(config.roomLink||"");toast$("Link copied!","success");}}>Copy</button></div></div>
              <div className="fi"><label className="fl">Student name or email</label><input className="finput" placeholder="e.g. Aarav Sharma…" id="add-inp"/></div>
            </div>
            <div className="mf">
              <button className="btn-s" onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="btn-p" style={{width:"auto",padding:"9px 18px"}} onClick={()=>{const v=(document.getElementById("add-inp") as HTMLInputElement)?.value?.trim();if(!v)return;const nId=Date.now();setParticipants(ps=>[...ps,{id:nId,name:v,stream:null,micMuted:true,camOn:false,isSpeaking:false,handRaised:false,avatarColor:COLORS[ps.length%COLORS.length],strikes:0,chatMuted:false,joinedAt:Date.now(),messageCount:0}]);navigator.clipboard.writeText(config.roomLink||"").catch(()=>{});toast$(`Invite sent to ${v}`,"success");setShowAdd(false);}}>➕ Invite</button>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER NOTIFY */}
      {showTeacherNotif&&invitedTeacher&&!teacherJoined&&(
        <div className="overlay" onClick={()=>setShowTeacherNotif(false)}>
          <div className="modal" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div className="mh"><span className="mh-title">🔔 Teacher Notification</span><button className="mh-close" onClick={()=>setShowTeacherNotif(false)}>✕</button></div>
            <div className="mb">
              <div style={{background:"linear-gradient(135deg,#0d1428,#1a1040)",borderRadius:13,padding:"18px",textAlign:"center" as const,marginBottom:14}}>
                <div style={{width:56,height:56,borderRadius:"50%",background:"var(--grad-ai)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 9px",animation:"aiPulse 2.5s infinite"}}>👩‍🏫</div>
                <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:3}}>{invitedTeacher.name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>{invitedTeacher.subject} · {invitedTeacher.email}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column" as const,gap:6,marginBottom:12}}>
                {[{label:"Email sent",val:"✅ Delivered",c:"var(--em)"},{label:"PDF + Speech Report",val:"Sent at session end",c:"var(--vio)"},{label:"Teacher response",val:"⏳ Pending",c:"var(--amb)"},{label:"Session duration",val:timer.display,c:"var(--ind3)"},{label:"Violations detected",val:activityLog.filter(l=>l.category).length.toString(),c:activityLog.filter(l=>l.category).length>0?"var(--red)":"var(--em)"}].map(row=>(
                  <div key={row.label} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"6px 0",borderBottom:"1px solid var(--bdr)"}}>
                    <span style={{color:"var(--t3)"}}>{row.label}</span><strong style={{color:row.c}}>{row.val}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" onClick={()=>setShowTeacherNotif(false)}>Close</button>
              <button className="btn-p ai-btn" style={{width:"auto",padding:"9px 18px"}} onClick={()=>{simulateTeacherJoin();setShowTeacherNotif(false);}}>Simulate: Teacher joins →</button>
            </div>
          </div>
        </div>
      )}

      {/* END MODAL */}
      {showEnd&&(
        <div className="overlay" onClick={()=>setShowEnd(false)}>
          <div className="modal dark" style={{maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <div className="mh"><span className="mh-title" style={{color:"#fff"}}>End Meeting?</span><button className="mh-close" style={{borderColor:"rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)"}} onClick={()=>setShowEnd(false)}>✕</button></div>
            <div className="mb" style={{textAlign:"center" as const,padding:"18px"}}>
              <div style={{fontSize:36,marginBottom:9}}>🏁</div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:5}}>End this study room?</div>
              <div style={{fontSize:12.5,color:"rgba(255,255,255,.4)",lineHeight:1.75}}>
                Duration: <strong style={{color:"var(--ind3)"}}>{timer.display}</strong>
                {activityLog.filter(l=>l.category).length>0&&<><br/><span style={{color:"var(--amb)"}}>⚠️ {activityLog.filter(l=>l.category).length} violations detected</span></>}
                {invitedTeacher&&<><br/><span style={{color:"var(--vio)"}}>📄 PDF + speech report sent to {invitedTeacher.name}</span></>}
                {recorder.isRecording&&<><br/><span style={{color:"var(--em)"}}>✅ Recording will be saved</span></>}
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" style={{background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)"}} onClick={()=>setShowEnd(false)}>Keep Going</button>
              <button className="btn-d" onClick={handleEnd}>End Room</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ─── RESULTS ─────────────────────────────────────────────────────────────────
function MeetingResults({result,onNew}:{result:any;onNew:()=>void}) {
  const report:StudentSummary[]=result.studentReport||[];
  const totalViolations=result.violations||0;
  const speechSummary:{name:string;speeches:string[];count:number}[]=result.speechSummary||[];
  const [pdfGenerating,setPdfGenerating]=useState(false);

  const getBehaviorBadge=(r:StudentSummary)=>{
    if(r.behaviorRating==="excellent") return <span className="report-violation-badge badge-clean">✅ Excellent</span>;
    if(r.behaviorRating==="good")      return <span className="report-violation-badge badge-warn">⚠️ 1 Warning</span>;
    if(r.behaviorRating==="warning")   return <span className="report-violation-badge badge-severe">🚫 Suspended</span>;
    return <span className="report-violation-badge badge-severe">❌ Removed</span>;
  };

  async function downloadPDF(){
    if(result.pdfBlob){
      const url=URL.createObjectURL(result.pdfBlob);
      const a=document.createElement("a"); a.href=url;
      a.download=`session-report-${Date.now()}.pdf`; a.click();
      URL.revokeObjectURL(url); return;
    }
    setPdfGenerating(true);
    try {
      const blob=await generateSessionPDF({
        topic:result.topic||"Study Session",subject:result.subject||"General",
        teacherName:result.teacherName||"Teacher",teacherEmail:result.teacherEmail||"teacher@school.edu",
        duration:result.timer,participants:result.participants,
        studentReport:report,violations:totalViolations,
        teacherJoined:result.teacherJoined,roomLink:result.roomLink||"",
        activityLog:result.activityLog||[],speechSummary,
      });
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url;
      a.download=`session-report-${Date.now()}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch(e){console.error(e);}
    setPdfGenerating(false);
  }

  const aiSummaryText=(()=>{
    const clean=report.filter(r=>r.strikes===0).map(r=>r.name);
    const warn=report.filter(r=>r.strikes>0).map(r=>r.name);
    let text=`Session lasted ${result.timer} with ${result.participants} participant(s). `;
    if(clean.length>0) text+=`${clean.join(", ")} maintained excellent academic conduct. `;
    if(warn.length>0)  text+=`${warn.join(", ")} received violations. `;
    text+=result.teacherJoined?`${result.teacherName} joined and moderated the session.`:`AI Teacher proctored the full session. PDF + speech report sent to ${result.teacherName||"teacher"}.`;
    return text;
  })();

  return (
    <div className="results-page">
      <div className="res-trophy">✅</div>
      <h2 className="res-title">Session Complete!</h2>
      <p className="res-sub">Lasted <strong style={{color:"var(--ind)"}}>{result.timer}</strong> · {result.participants} participant(s){result.teacherName&&<> · <span style={{color:"var(--vio)"}}>📄 PDF sent to {result.teacherName}</span></>}</p>

      {/* PDF SENT BANNER */}
      {result.teacherName&&(
        <div className="pdf-sent-banner">
          <div className="pdf-sent-icon">📄</div>
          <div>
            <div className="pdf-sent-title">PDF + Speech Report Sent</div>
            <div className="pdf-sent-sub">Full session report sent to <strong>{result.teacherName}</strong> at <strong>{result.teacherEmail}</strong> · Added to Notifications · Room link logged</div>
          </div>
        </div>
      )}

      <div className="res-stats" style={{maxWidth:560}}>
        {[
          {l:"Duration",    v:result.timer,                  i:"⏱️"},
          {l:"Students",    v:result.participants,            i:"👥"},
          {l:"Violations",  v:totalViolations,                i:"🛡️",red:totalViolations>0},
          {l:"Speech Logs", v:speechSummary.reduce((a:{count:number},s:{count:number})=>({count:a.count+s.count}),{count:0}).count, i:"🎙️"},
          {l:"AI Summaries",v:result.summaryCount||0,        i:"🤖"},
          {l:"Teacher",     v:result.teacherJoined?"Joined":"AI Only",i:"👩‍🏫"},
        ].map((s,i)=>(
          <div key={s.l} className="res-stat" style={{animationDelay:`${i*.07}s`}}>
            <div className="res-stat-ico">{s.i}</div>
            <div className="res-stat-val" style={{color:(s as any).red&&(s.v as number)>0?"var(--red)":s.i==="🤖"?"var(--vio)":undefined}}>{s.v as string}</div>
            <div className="res-stat-lbl">{s.l}</div>
          </div>
        ))}
      </div>

      {/* AI SUMMARY */}
      <div style={{width:"100%",maxWidth:720,background:"rgba(139,92,246,.08)",border:"1.5px solid rgba(139,92,246,.22)",borderRadius:16,padding:"14px 18px",marginBottom:12,textAlign:"left" as const}}>
        <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"var(--vio)",marginBottom:8}}>🤖 AI Session Summary — Sent to Teacher</div>
        <div style={{fontSize:12.5,color:"var(--t2)",lineHeight:1.7}}>{aiSummaryText}</div>
      </div>

      {/* SPEECH SUMMARY */}
      {speechSummary.length>0&&(
        <div className="teacher-report-card">
          <div className="teacher-report-title">🎙️ Student Speech & Chat Summary — Included in PDF Report</div>
          <div className="report-section">
            <div className="report-section-title">What each student contributed during the session</div>
            {speechSummary.map((s,i)=>(
              <div key={i} className="speech-summary-block">
                <div className="speech-summary-student">
                  <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",background:avColor(s.name)+"28",color:avColor(s.name),fontSize:9,fontWeight:800,marginRight:2}}>{avInit(s.name)}</span>
                  {s.name}
                  <span className="speech-stat-pill" style={{background:"rgba(14,165,233,.1)",color:"var(--ind)"}}>💬 {s.count} contribution{s.count!==1?"s":""}</span>
                </div>
                <div className="speech-summary-text">
                  {s.speeches.slice(0,3).map((sp,j)=><div key={j} style={{padding:"2px 0",borderLeft:"2px solid rgba(14,165,233,.2)",paddingLeft:8,marginBottom:3}}>"{sp}"</div>)}
                  {s.speeches.length>3&&<div style={{fontSize:10,color:"var(--t3)",marginTop:4}}>… and {s.speeches.length-3} more message{s.speeches.length-3!==1?"s":""}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STUDENT REPORT */}
      {report.length>0&&(
        <div className="teacher-report-card">
          <div className="teacher-report-title">📋 Full Student Behaviour Report — {result.teacherName||"Teacher"}</div>
          <div className="report-section">
            <div className="report-section-title">Students in Session ({report.length})</div>
            {report.map(r=>(
              <div key={r.id} className="report-student-row">
                <div>
                  <div className="report-student-name">{r.name}</div>
                  <div className="report-student-meta">{r.messageCount} message{r.messageCount!==1?"s":""} · Joined {fmtTime(r.joinedAt)}{r.violations.length>0&&<span style={{color:"var(--red)",marginLeft:8}}>{r.violations.length} violation{r.violations.length!==1?"s":""}: {[...new Set(r.violations.map(v=>CATEGORY_LABELS[v.category]))].join(", ")}</span>}</div>
                  {r.violations.length>0&&<div style={{marginTop:5,display:"flex",flexWrap:"wrap" as const,gap:4}}>{r.violations.map((v,vi)=><span key={vi} style={{fontSize:9.5,padding:"1px 7px",borderRadius:4,background:"rgba(239,68,68,.1)",color:"var(--red)",border:"1px solid rgba(239,68,68,.2)"}}>{CATEGORY_LABELS[v.category]}: "{v.detail.slice(0,30)}{v.detail.length>30?"…":""}"</span>)}</div>}
                </div>
                {getBehaviorBadge(r)}
              </div>
            ))}
          </div>
          {totalViolations>0&&(
            <div className="report-section">
              <div className="report-section-title">Violation Summary</div>
              <div className="report-summary-text">{totalViolations} violation{totalViolations!==1?"s were":""} detected.{result.activityLog?.filter((l:LogEntry)=>l.category==="cheating").length>0?" ⚠️ Cheating attempts detected — immediate review recommended.":""}{result.activityLog?.filter((l:LogEntry)=>l.category==="sexual"||l.category==="adult").length>0?" 🚫 Inappropriate content attempted — parental notification may be warranted.":""} All incidents were blocked in real-time.</div>
            </div>
          )}
          <div className="report-section">
            <div className="report-section-title">Recommendations</div>
            <div className="report-summary-text">{totalViolations===0?"✅ All students maintained excellent academic conduct. No action required.":`⚠️ ${report.filter(r=>r.strikes>0).map(r=>r.name).join(", ")} require follow-up regarding academic conduct.`}</div>
          </div>
        </div>
      )}

      {/* MEETING LINK */}
      <div style={{width:"100%",maxWidth:720,background:"rgba(14,165,233,.06)",border:"1.5px solid rgba(14,165,233,.2)",borderRadius:14,padding:"12px 16px",marginBottom:12,textAlign:"left" as const}}>
        <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"var(--ind)",marginBottom:7}}>🔗 Meeting Details — Logged to Notifications</div>
        <div style={{fontSize:12,color:"var(--t2)",lineHeight:1.8}}>
          <strong>Topic:</strong> {result.topic||"Study Session"} &nbsp;·&nbsp; <strong>Duration:</strong> {result.timer} &nbsp;·&nbsp; <strong>Participants:</strong> {result.participants}<br/>
          <strong>Room Link:</strong> <span style={{fontFamily:"monospace",fontSize:11,color:"var(--ind)"}}>{result.roomLink||"N/A"}</span>
        </div>
      </div>

      <div className="res-actions">
        {/* PDF DOWNLOAD — prominent red button */}
        <button
          className="btn-p pdf-btn"
          style={{width:"auto",padding:"11px 24px",fontSize:13}}
          onClick={downloadPDF}
          disabled={pdfGenerating}
        >
          {pdfGenerating?<><span className="loader-spin"/>Generating PDF…</>:"📄 Download PDF Report"}
        </button>
        {result.hasRecording&&<button className="btn-s" onClick={()=>result.recorder?.download("session.webm")}>📥 Download Recording</button>}
        <button className="btn-p ai-btn" style={{fontSize:13,width:"auto",padding:"11px 22px"}} onClick={onNew}>📹 New Study Room</button>
      </div>
    </div>
  );
}

// ─── WAITING ROOM ─────────────────────────────────────────────────────────────
function WaitingRoom({name,onReady}:{name:string;onReady:()=>void}) {
  return (
    <div className="waiting-room">
      <div style={{width:70,height:70,borderRadius:"50%",background:"rgba(14,165,233,.15)",border:"2px solid rgba(14,165,233,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,animation:"pulse 2s infinite"}}>⏳</div>
      <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>Waiting for host</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,.42)",maxWidth:320,lineHeight:1.75}}>Hi <strong style={{color:"var(--ind3)"}}>{name}</strong>! You'll join automatically once the host admits you.</div>
      <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:4}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"var(--ind)",animation:"dotPulse 1.4s ease-in-out infinite",animationDelay:`${i*.2}s`}}/>)}</div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
type Screen="setup"|"waiting_teacher"|"passcode"|"waiting_room"|"room"|"results";

export default function MeetingPage() {
  const [screen,setScreen,clearScreen] = useSessionState<Screen>("mp-screen", "setup");
  const [config,setConfig,clearConfig] = useSessionState<any>("mp-config", null);
  const [result,setResult] = useState<any>(null);
  const [role,setRole]     = useState("student");
  const notifStore         = useNotificationStore();


  function handleLaunch(cfg:any){
    setConfig(cfg);
    // Notification: meeting started
    notifStore.addNotification(`📹 Meeting started: "${cfg.topic||"Study Session"}" — Room link: ${cfg.roomLink}`);
    if(cfg.role==="teacher")               setScreen("room");
    else if(cfg.usePasscode&&cfg.pin)      setScreen("passcode");
    else if(cfg.requiresTeacherApproval)   setScreen("waiting_teacher");
    else if(cfg.enableWaitingRoom)         setScreen("waiting_room");
    else                                   setScreen("room");
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="mp-app">
        {screen==="setup"&&<Navigation currentRole={role} onRoleChange={setRole}/>}
        {screen==="setup"&&<MeetingSetup onLaunch={handleLaunch}/>}
        {screen==="passcode"&&config&&<PasscodeModal pin={config.pin} onVerify={()=>config.requiresTeacherApproval?setScreen("waiting_teacher"):config.enableWaitingRoom?setScreen("waiting_room"):setScreen("room")} onClose={()=>setScreen("setup")}/>}
        {screen==="waiting_teacher"&&config&&<WaitingForTeacherApproval name={config.name} teacherName={config.selectedTeacher?.name||"Your teacher"} topic={config.topic} subject={config.subject} roomLink={config.roomLink} onApproved={()=>setScreen("room")} onCancel={()=>setScreen("setup")}/>}
        {screen==="waiting_room"&&config&&<WaitingRoom name={config.name} onReady={()=>setScreen("room")}/>}
        {screen==="room"&&config&&<MeetingRoom config={config} onEnd={res=>{setConfig(null);setResult(res);setScreen("results");}}/>}
        {screen==="results"&&result&&<MeetingResults result={result} onNew={()=>{setResult(null);clearScreen();clearConfig();setScreen("setup");}}/>}
      </div>
    </>
  );
}
