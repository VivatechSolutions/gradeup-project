// import { useState, useEffect, useRef, useCallback } from "react";
// import Navigation from "../components/navigation";
// import { useAuth } from "../hooks/use-auth";
// import { useSessionState } from "../hooks/useSessionState";

// const CSS = `
// @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
// *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
// html,body{height:100%;overflow:hidden}
// :root{
//   --bg:#f8fafc;--surf:#fff;--surf2:#f8fafc;--surf3:#f1f5f9;
//   --bdr:rgba(0,0,0,.06);--bdr2:rgba(0,0,0,.1);
//   --ind:#6366f1;--ind2:#818cf8;--ind3:#a5b4fc;
//   --vio:#8b5cf6;--pnk:#ec4899;--em:#10b981;--amb:#f59e0b;
//   --sky:#38bdf8;--red:#ef4444;
//   --t1:#0f172a;--t2:#475569;--t3:#94a3b8;--t4:#e2e8f0;
//   --font:'Plus Jakarta Sans',system-ui,sans-serif;
//   --sh:0 2px 12px rgba(0,0,0,.05);--sh2:0 8px 32px rgba(0,0,0,.12);--sh3:0 24px 64px rgba(0,0,0,.18);
//   --grad:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
//   --r:20px;
// }
// .dark{
//   --bg:#0b1120;--surf:#1e293b;--surf2:#0f172a;--surf3:#334155;
//   --bdr:rgba(255,255,255,.07);--bdr2:rgba(255,255,255,.1);
//   --t1:#f1f5f9;--t2:#94a3b8;--t3:#64748b;--t4:#334155;
// }
// body{font-family:var(--font);background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased}
// ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(99,102,241,.2);border-radius:4px}
// button,input,select,textarea{font-family:var(--font)}
// .dp-app{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
// @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
// @keyframes fadeIn{from{opacity:0}to{opacity:1}}
// @keyframes scaleIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
// @keyframes orbFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-16px) scale(1.02)}}
// @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
// @keyframes modalUp{from{opacity:0;transform:translateY(22px) scale(.96)}to{opacity:1;transform:none}}
// @keyframes recBlink{0%,100%{opacity:1}50%{opacity:.35}}
// @keyframes tileIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
// @keyframes waveBar{0%,100%{height:3px;opacity:.5}50%{height:20px;opacity:1}}
// @keyframes rPop{0%{opacity:0;transform:translate(-50%,-70%) scale(.3)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.3)}65%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-120%) scale(.7)}}
// @keyframes dotPulse{0%,80%,100%{transform:scale(.5);opacity:.4}40%{transform:scale(1);opacity:1}}
// @keyframes turnBlink{0%,100%{opacity:1}50%{opacity:.5}}
// @keyframes spin{to{transform:rotate(360deg)}}
// @keyframes tIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
// @keyframes voicePulse{0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,.4)}50%{box-shadow:0 0 0 8px rgba(139,92,246,.0)}}
// @keyframes micGlow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}50%{box-shadow:0 0 0 10px rgba(16,185,129,.0)}}

// .dp-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--surf);border:1.5px solid var(--bdr);border-radius:13px;padding:10px 17px;font-size:12.5px;font-weight:700;color:var(--t1);box-shadow:var(--sh2);z-index:9999;display:flex;align-items:center;gap:7px;animation:tIn .32s cubic-bezier(.34,1.2,.64,1);white-space:nowrap;max-width:calc(100vw - 28px)}
// .dp-toast.success{border-color:rgba(16,185,129,.4)}.dp-toast.error{border-color:rgba(239,68,68,.4)}.dp-toast.warn{border-color:rgba(245,158,11,.4)}.dp-toast.info{border-color:rgba(99,102,241,.36)}

// .voice-active{animation:voicePulse 1.2s ease-in-out infinite}
// .mic-live{animation:micGlow 1s ease-in-out infinite}
// .voice-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:800;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);color:#c4b5fd}
// .mic-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:800;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#6ee7b7}
// .voice-bars{display:flex;align-items:center;gap:2px;height:14px}
// .voice-bar{width:2px;border-radius:2px;background:#c4b5fd;animation:waveBar .55s ease-in-out infinite}
// .mic-bar{width:2px;border-radius:2px;background:#6ee7b7;animation:waveBar .55s ease-in-out infinite}

// .fi{margin-bottom:10px}
// .fl{display:block;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--t3);margin-bottom:5px}
// .finput{width:100%;padding:10px 12px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);color:var(--t1);font-size:13px;outline:none;transition:all .18s}
// .finput:focus{border-color:var(--ind);background:var(--surf);box-shadow:0 0 0 3px rgba(99,102,241,.1)}
// .finput::placeholder{color:var(--t3)}
// .finput:disabled{opacity:.45;cursor:not-allowed}
// select.finput{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}
// .fi-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}

// .btn-p{padding:11px 20px;border-radius:13px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:13px;font-weight:700;transition:all .22s;box-shadow:0 5px 18px rgba(99,102,241,.28);display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font);width:100%}
// .btn-p:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 9px 26px rgba(99,102,241,.38)}
// .btn-p:disabled{opacity:.38;cursor:not-allowed;transform:none;box-shadow:none}
// .btn-s{padding:9px 16px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
// .btn-s:hover{border-color:rgba(99,102,241,.32);color:var(--t1);background:rgba(99,102,241,.04)}
// .btn-d{padding:9px 16px;border-radius:11px;border:1.5px solid rgba(239,68,68,.25);background:rgba(239,68,68,.06);cursor:pointer;color:var(--red);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
// .btn-d:hover{background:rgba(239,68,68,.12)}

// .link-box{border-radius:14px;background:rgba(99,102,241,.04);border:1.5px solid rgba(99,102,241,.16);padding:12px 14px;margin-bottom:10px}
// .link-box-title{font-size:10px;font-weight:800;color:var(--ind);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
// .link-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:10px;background:var(--surf);border:1.5px solid var(--bdr)}
// .link-val{flex:1;font-family:monospace;font-size:10.5px;color:var(--ind);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
// .copy-btn{padding:5px 11px;border-radius:7px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:11.5px;font-weight:800;transition:.18s;flex-shrink:0}
// .copy-btn:hover{transform:scale(1.05)}
// .share-actions{display:flex;gap:6px;margin-top:7px}
// .share-btn{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:11.5px;font-weight:700;color:var(--t2);transition:.2s;display:flex;align-items:center;justify-content:center;gap:5px}
// .share-btn:hover{border-color:rgba(99,102,241,.3);color:var(--ind);background:rgba(99,102,241,.04)}

// .steps{display:flex;flex-direction:column;gap:5px;margin-bottom:13px}
// .step-row{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);transition:.22s}
// .step-row.done{border-color:rgba(16,185,129,.32);background:rgba(16,185,129,.05)}
// .step-row.act{border-color:rgba(99,102,241,.32);background:rgba(99,102,241,.05)}
// .step-row.pend{opacity:.45}
// .step-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;flex-shrink:0}
// .step-row.done .step-num{background:var(--em);color:#fff}
// .step-row.act  .step-num{background:var(--ind);color:#fff}
// .step-row.pend .step-num{background:var(--surf3);color:var(--t3)}
// .step-lbl{font-size:12px;font-weight:700}
// .step-row.done .step-lbl{color:var(--em)}.step-row.act .step-lbl{color:var(--t1)}.step-row.pend .step-lbl{color:var(--t3)}

// .sec-div{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--t3);margin-bottom:8px;margin-top:4px;display:flex;align-items:center;gap:7px}
// .sec-div::after{content:'';flex:1;height:1px;background:var(--bdr)}

// .mic-preview{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;background:rgba(99,102,241,.05);border:1.5px solid rgba(99,102,241,.14);margin-bottom:11px}
// .mic-av{width:46px;height:46px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;color:#fff;box-shadow:0 6px 18px rgba(99,102,241,.32);flex-shrink:0}
// .mic-info{flex:1}
// .mic-name{font-size:14px;font-weight:800;color:var(--t1);margin-bottom:1px}
// .mic-sub{font-size:11px;color:var(--t2)}
// .perm-row{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}
// .perm-btn{display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:8px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:11.5px;font-weight:700;transition:.18s}
// .perm-btn.granted{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.32);color:var(--em)}
// .perm-btn.denied{background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.28);color:var(--red)}
// .perm-btn.req{background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.28);color:var(--ind)}
// .perm-btn:disabled{opacity:.42;cursor:not-allowed}
// .perm-warn{font-size:11.5px;color:#fca5a5;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);border-radius:9px;padding:8px 11px;margin-top:7px;line-height:1.6}

// .overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);backdrop-filter:blur(10px);z-index:700;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease}
// .modal{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);width:100%;box-shadow:var(--sh3);overflow:hidden;animation:modalUp .28s cubic-bezier(.34,1.2,.64,1);max-height:calc(100dvh - 30px);display:flex;flex-direction:column}
// .modal.dark{background:#0c1220;border-color:rgba(255,255,255,.1)}
// .mh{padding:16px 20px 13px;border-bottom:1px solid var(--surf3);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:10px}
// .modal.dark .mh{border-color:rgba(255,255,255,.08)}
// .mh-title{font-size:15.5px;font-weight:800;color:var(--t1)}
// .modal.dark .mh-title{color:#fff}
// .mh-close{width:27px;height:27px;border-radius:8px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center;transition:.15s;font-size:12.5px;flex-shrink:0}
// .mh-close:hover{color:var(--t1);transform:rotate(90deg)}
// .mb{padding:18px 20px;overflow-y:auto;flex:1}
// .mf{padding:13px 20px;border-top:1px solid var(--surf3);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0;flex-wrap:wrap}
// .modal.dark .mf{border-color:rgba(255,255,255,.08)}
// .lo-progress{width:100%;height:4px;background:rgba(0,0,0,.07);border-radius:4px;overflow:hidden;margin-top:7px}
// .lo-progress-fill{height:100%;background:var(--grad);border-radius:4px;transition:width .4s ease}
// .loader-spin{width:22px;height:22px;border-radius:50%;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .7s linear infinite;flex-shrink:0}
// .loader-spin.dark{border-color:rgba(99,102,241,.2);border-top-color:var(--ind)}

// .dp-setup{height:100dvh;display:grid;grid-template-columns:32% 1fr;overflow:hidden}
// .dp-setup-left{background:#060c1a;overflow:hidden;position:relative;display:flex;flex-direction:column}
// .dp-setup-left-inner{overflow-y:auto;flex:1;padding:clamp(20px,3vw,44px);display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2}
// .dp-orbs{position:absolute;inset:0;pointer-events:none}
// .dp-orb{position:absolute;border-radius:50%}
// .dp-orb1{width:320px;height:320px;background:radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%);top:-80px;left:-60px;animation:orbFloat 9s ease-in-out infinite}
// .dp-orb2{width:220px;height:220px;background:radial-gradient(circle,rgba(139,92,246,.13) 0%,transparent 70%);bottom:-40px;right:-30px;animation:orbFloat 11s ease-in-out infinite reverse}
// .dp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(99,102,241,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.06) 1px,transparent 1px);background-size:38px 38px;pointer-events:none}
// .dp-logo{display:flex;align-items:center;gap:8px;margin-bottom:20px;animation:fadeUp .5s ease both}
// .dp-logo-ico{width:32px;height:32px;background:var(--grad);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 6px 18px rgba(99,102,241,.38)}
// .dp-logo-name{font-size:14px;font-weight:800;background:linear-gradient(90deg,#fff,var(--ind3));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
// .dp-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);font-size:10px;font-weight:800;color:var(--ind3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;animation:fadeUp .5s ease .1s both;width:fit-content}
// .dp-tag-dot{width:5px;height:5px;border-radius:50%;background:var(--em);animation:pulse 2s infinite}
// .dp-h1{font-size:clamp(18px,2.2vw,32px);font-weight:900;line-height:1.06;letter-spacing:-1px;color:#fff;margin-bottom:10px;animation:fadeUp .5s ease .16s both}
// .dp-h1 .gt{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
// .dp-p{font-size:12px;color:rgba(255,255,255,.42);line-height:1.85;margin-bottom:20px;animation:fadeUp .5s ease .22s both}
// .dp-feats-left{display:flex;flex-direction:column;gap:6px;animation:fadeUp .5s ease .28s both}
// .dp-feat-left{display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;transition:.3s}
// .dp-feat-left:hover{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.28)}
// .dp-feat-ico{width:34px;height:34px;border-radius:9px;background:rgba(99,102,241,.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
// .dp-feat-txt strong{display:block;font-size:12px;font-weight:700;color:#fff;margin-bottom:1px}
// .dp-feat-txt span{font-size:10px;color:rgba(255,255,255,.38)}
// .ctx-card{margin-top:16px;padding:12px 14px;border-radius:12px;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);animation:fadeUp .5s ease .32s both}
// .ctx-card-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--em);margin-bottom:5px}
// .ctx-card-val{font-size:13px;font-weight:700;color:#fff;margin-bottom:2px}
// .ctx-card-sub{font-size:11px;color:rgba(255,255,255,.4)}
// .dp-setup-right{background:var(--surf);overflow:hidden;display:flex;flex-direction:column}
// .dp-setup-scroll{overflow-y:auto;flex:1;padding:clamp(20px,3vw,44px)}
// .dp-setup-inner{max-width:620px;width:100%;margin:0 auto}
// .setup-back{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:11px;border:2px solid rgba(99,102,241,.28);background:rgba(99,102,241,.07);cursor:pointer;font-size:13px;font-weight:800;color:var(--ind);transition:all .22s;margin-bottom:20px;font-family:var(--font)}
// .setup-back:hover{background:rgba(99,102,241,.14);border-color:rgba(99,102,241,.5);color:var(--t1);transform:translateX(-3px);box-shadow:0 4px 16px rgba(99,102,241,.15)}
// .setup-title{font-size:clamp(17px,2vw,24px);font-weight:900;letter-spacing:-.4px;margin-bottom:3px;color:var(--t1)}
// .setup-sub{font-size:12px;color:var(--t2);margin-bottom:18px;line-height:1.6}

// .submode-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}
// .submode-card{padding:14px 13px;border-radius:14px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .22s;display:flex;align-items:flex-start;gap:9px}
// .submode-card:hover{border-color:rgba(99,102,241,.32);background:rgba(99,102,241,.03);transform:translateY(-2px)}
// .submode-card.sel{border-color:var(--ind);background:rgba(99,102,241,.06)}
// .submode-ico{font-size:22px;flex-shrink:0;margin-top:2px}
// .submode-title{font-size:12.5px;font-weight:800;color:var(--t1);margin-bottom:3px}
// .submode-desc{font-size:10.5px;color:var(--t2);line-height:1.5}

// .dtype-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px}
// .dtype-card{padding:12px 13px;border-radius:13px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .22s;display:flex;align-items:flex-start;gap:9px}
// .dtype-card:hover{border-color:rgba(99,102,241,.32);background:rgba(99,102,241,.03);transform:translateY(-1px)}
// .dtype-card.sel{border-color:var(--ind);background:rgba(99,102,241,.06)}
// .dtype-ico{font-size:19px;flex-shrink:0}
// .dtype-title{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:2px}
// .dtype-desc{font-size:10px;color:var(--t2);line-height:1.45}

// .dp-room{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:#060c1a}
// .room-bar{height:50px;background:rgba(6,12,26,.97);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 12px;gap:7px;flex-shrink:0;z-index:100;overflow:hidden}
// .room-logo{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:#fff;flex-shrink:0;border:none;background:none;cursor:pointer;font-family:var(--font)}
// .room-logo-ico{width:25px;height:25px;background:var(--grad);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px}
// .rbar-div{width:1px;height:15px;background:rgba(255,255,255,.08);flex-shrink:0}
// .rbar-topic{flex:1;font-size:11.5px;color:rgba(255,255,255,.38);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
// .rbar-topic strong{color:#fff}
// .rbar-pill{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:10.5px;font-weight:700;flex-shrink:0}
// .pill-timer{background:rgba(99,102,241,.14);border:1px solid rgba(99,102,241,.22);color:var(--ind3);font-family:monospace}
// .pill-rec{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.22);color:var(--red);animation:recBlink 1.5s infinite}
// .pill-rec-dot{width:5px;height:5px;border-radius:50%;background:var(--red)}
// .pill-turn-you{background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.28);color:#6ee7b7}
// .pill-turn-ai{background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.28);color:#c4b5fd;animation:turnBlink 1.2s infinite}
// .rbar-end{padding:4px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);cursor:pointer;font-size:11px;font-weight:700;transition:.15s;flex-shrink:0;font-family:var(--font)}
// .rbar-end:hover{background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.35);color:var(--red)}
// .room-body{flex:1;display:flex;min-height:0;overflow:hidden}
// .grid-area{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
// .room-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.06)}
// .room-info-card{border-radius:14px;padding:10px 11px;min-height:auto}
// .room-info-card.live{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.18)}
// .room-info-card.host{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.18)}
// .room-info-card.game{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.18)}
// .room-info-label{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
// .room-info-card.live .room-info-label{color:rgba(255,255,255,.45)}
// .room-info-card.host .room-info-label{color:#fcd34d}
// .room-info-card.game .room-info-label{color:#86efac}
// .room-info-title{font-size:12.5px;font-weight:800;color:#fff;margin-bottom:4px}
// .room-info-sub{font-size:10.5px;line-height:1.45;color:rgba(255,255,255,.52)}
// .room-chip-row{display:flex;gap:6px;flex-wrap:wrap}
// .room-chip{padding:4px 8px;border-radius:20px;background:rgba(255,255,255,.06);font-size:10px;font-weight:700;color:#fff}
// .room-info-card.host{grid-column:1/-1}
// .host-popup-wrap{position:relative}
// .host-popup-btn{display:flex;align-items:center;gap:7px;width:100%;justify-content:center;padding:10px 12px;border:none;border-radius:14px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.2);color:#fde68a;cursor:pointer;font-size:11px;font-weight:800;font-family:var(--font);transition:.18s;white-space:nowrap}
// .host-popup-btn:hover{transform:translateY(-1px);background:rgba(245,158,11,.18)}
// .host-popup-dot{width:8px;height:8px;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.14)}
// .host-popup-panel{position:absolute;top:calc(100% + 8px);right:0;width:min(320px,78vw);padding:12px;border-radius:16px;background:#10192f;border:1px solid rgba(245,158,11,.24);box-shadow:var(--sh2);z-index:30;animation:scaleIn .18s ease}
// .host-popup-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
// .host-popup-title{font-size:12.5px;font-weight:800;color:#fff}
// .host-popup-sub{font-size:10.5px;line-height:1.45;color:rgba(255,255,255,.5)}
// .host-popup-close{width:24px;height:24px;border:none;border-radius:50%;background:rgba(255,255,255,.06);color:rgba(255,255,255,.66);cursor:pointer}
// .host-popup-list{display:flex;flex-direction:column;gap:7px;max-height:220px;overflow:auto}
// .host-popup-item{display:flex;align-items:center;gap:8px;padding:8px 9px;border-radius:11px;background:rgba(255,255,255,.05)}
// .host-popup-meta{flex:1;min-width:0}
// .host-popup-name{font-size:11.5px;font-weight:700;color:#fff}
// .host-popup-note{font-size:10px;color:rgba(255,255,255,.45)}
// .vid-grid{flex:1;display:grid;gap:8px;padding:10px;min-height:0;overflow:auto;align-content:start}
// .vg-1{grid-template-columns:1fr}.vg-2{grid-template-columns:1fr 1fr}.vg-3{grid-template-columns:1fr 1fr 1fr}.vg-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
// .tile{border-radius:16px;background:#0d1428;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;transition:box-shadow .28s;min-height:220px;animation:tileIn .32s ease}
// .tile.spk{box-shadow:0 0 0 2.5px var(--em),0 0 24px rgba(16,185,129,.2)}
// .tile video{width:100%;height:100%;object-fit:cover;display:block}
// .tile-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;width:clamp(44px,6vw,78px);height:clamp(44px,6vw,78px);font-size:clamp(17px,2.4vw,30px)}
// .tile-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.83));padding:24px 12px 10px;display:flex;align-items:flex-end;justify-content:space-between;gap:6px}
// .tile-name{font-size:clamp(11px,1.1vw,13px);font-weight:700;color:#fff;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
// .t-badge{font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px;color:#fff;white-space:nowrap}
// .t-host{background:var(--amb);color:#000}.t-ai{background:var(--grad)}.t-you{background:rgba(255,255,255,.17)}.t-med{background:rgba(56,189,248,.82);color:#000}
// .tile-muted{width:20px;height:20px;border-radius:50%;background:rgba(239,68,68,.85);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9.5px}
// .tile-react{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:42px;animation:rPop 2.2s forwards;pointer-events:none;z-index:5}
// .tile-wave{position:absolute;top:9px;right:9px;display:flex;align-items:center;gap:2px;height:22px}
// .tile-wave-bar{width:2.5px;border-radius:2px;animation:waveBar .65s ease-in-out infinite}
// .tile-turn{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(16,185,129,.88);border-radius:100px;padding:5px 12px;font-size:10px;font-weight:800;color:#fff;white-space:nowrap;animation:turnBlink 1.2s infinite}
// .ai-typing-wrap{position:absolute;top:9px;right:9px;display:flex;gap:3px;align-items:center}
// .ai-dot{width:5px;height:5px;border-radius:50%;background:var(--vio);animation:dotPulse .9s ease-in-out infinite}
// .tile-nudge{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(245,158,11,.92);border-radius:12px;padding:9px 15px;font-size:12.5px;font-weight:700;color:#000;animation:scaleIn .3s ease;white-space:nowrap;border:1px solid rgba(245,158,11,.4);max-width:80%;text-align:center}
// .ctrl-bar{min-height:68px;padding:10px 12px;background:rgba(6,12,26,.98);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:8px;flex-wrap:wrap}
// .cg{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
// .cbtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 7px;border-radius:9px;border:1px solid rgba(255,255,255,.09);cursor:pointer;background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);font-size:9px;font-weight:700;transition:all .18s;min-width:42px;font-family:var(--font)}
// .cbtn-ico{font-size:14px;transition:transform .2s}
// .cbtn:hover{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2);transform:translateY(-2px)}
// .cbtn.on{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.36);color:var(--em)}
// .cbtn.off{background:rgba(239,68,68,.09);border-color:rgba(239,68,68,.3);color:var(--red)}
// .cbtn.hi{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.36);color:var(--ind3)}
// .cbtn.amb{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:var(--amb)}
// .cbtn.em{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.28);color:var(--em)}
// .cbtn.rec{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.46);color:var(--red);animation:recBlink 1.5s infinite}
// .cbtn.speaking{background:rgba(139,92,246,.14);border-color:rgba(139,92,246,.46);color:#c4b5fd;animation:voicePulse 1.2s ease-in-out infinite}
// .cbtn.mic-live{background:rgba(16,185,129,.18);border-color:rgba(16,185,129,.6);color:#6ee7b7;animation:micGlow 1s ease-in-out infinite}
// .cbtn:disabled{opacity:.38;cursor:not-allowed;transform:none}
// .end-btn{padding:8px 16px;border-radius:9px;border:none;cursor:pointer;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:12px;font-weight:800;font-family:var(--font);box-shadow:0 3px 12px rgba(239,68,68,.28);transition:.2s;white-space:nowrap}
// .end-btn:hover{transform:translateY(-2px);box-shadow:0 7px 20px rgba(239,68,68,.42)}
// .react-pop{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#141e36;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 10px;display:flex;gap:6px;box-shadow:var(--sh2);z-index:200;animation:scaleIn .2s ease}
// .react-emoji{font-size:20px;cursor:pointer;padding:4px;border-radius:7px;border:none;background:none;transition:.15s}
// .react-emoji:hover{transform:scale(1.45)}
// .rec-overlay{position:fixed;top:63px;right:12px;background:rgba(239,68,68,.92);border-radius:8px;padding:4px 11px;font-size:11px;font-weight:800;color:#fff;z-index:200;animation:recBlink 1.5s infinite}
// .side-panel{width:300px;min-width:300px;background:rgba(6,12,26,.98);border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden}
// .panel-tabs-dark{display:flex;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
// .ptab{flex:1;padding:10px 4px;background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,.3);font-size:9px;font-weight:700;cursor:pointer;transition:.18s;display:flex;flex-direction:column;align-items:center;gap:3px;font-family:var(--font)}
// .ptab:hover{color:rgba(255,255,255,.65)}
// .ptab.active{color:var(--ind3);border-bottom-color:var(--ind)}
// .ptab-cls{flex:0;padding:10px 8px;color:rgba(255,255,255,.22)}
// .pscroll{flex:1;overflow-y:auto;min-height:0}
// .p-list{padding:8px;display:flex;flex-direction:column;gap:5px}
// .p-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:.18s}
// .p-row:hover{border-color:rgba(99,102,241,.28);background:rgba(99,102,241,.07)}
// .p-row.spk{border-color:rgba(16,185,129,.4);background:rgba(16,185,129,.06)}
// .p-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:800;flex-shrink:0}
// .p-info{flex:1;min-width:0}
// .p-name{font-size:12px;font-weight:700;color:#fff}
// .p-role{font-size:10px;color:rgba(255,255,255,.28)}
// .chat-msgs{padding:9px;display:flex;flex-direction:column;gap:7px}
// .chat-side-head{padding:12px 14px;border:none;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(99,102,241,.06);display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;text-align:left;color:#fff}
// .chat-side-title{font-size:12.5px;font-weight:800;color:#fff}
// .chat-side-sub{font-size:10.5px;color:rgba(255,255,255,.48);margin-top:2px}
// .chat-msg{display:flex;gap:6px;animation:fadeUp .2s ease}
// .chat-msg.own{flex-direction:row-reverse}
// .chat-av-sm{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0;align-self:flex-end}
// .chat-bwrap{display:flex;flex-direction:column;gap:2px;max-width:84%}
// .chat-msg.own .chat-bwrap{align-items:flex-end}
// .chat-sender{font-size:9.5px;font-weight:700;color:rgba(255,255,255,.28)}
// .chat-bubble{padding:7px 10px;border-radius:10px;font-size:12px;line-height:1.55;word-break:break-word}
// .bubble-o{background:rgba(255,255,255,.07);color:#fff;border-radius:3px 10px 10px 10px;border:1px solid rgba(255,255,255,.08)}
// .bubble-own{background:var(--grad);color:#fff;border-radius:10px 3px 10px 10px}
// .chat-time{font-size:9px;color:rgba(255,255,255,.2)}
// .chat-empty{text-align:center;color:rgba(255,255,255,.2);font-size:12px;padding:22px 10px;line-height:1.7}
// .chat-ia{padding:8px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;display:flex;gap:6px;align-items:flex-end}
// .chat-inp{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:12px;outline:none;resize:none;min-height:34px;max-height:78px;transition:border .15s;font-family:var(--font)}
// .chat-inp:focus{border-color:var(--ind)}
// .chat-inp::placeholder{color:rgba(255,255,255,.2)}
// .chat-inp:disabled{opacity:.4;cursor:not-allowed}
// .chat-send{width:32px;height:32px;border-radius:8px;background:var(--grad);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.18s;font-size:13px}
// .chat-send:hover{transform:scale(1.12)}
// .chat-send:disabled{opacity:.4;cursor:not-allowed}
// .dp-wrap{padding:9px;display:flex;flex-direction:column;gap:7px}
// .score-card{background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.1));border:1px solid rgba(99,102,241,.26);border-radius:12px;padding:12px}
// .sc-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.35);margin-bottom:8px}
// .sc-row{display:flex;align-items:center;gap:8px}
// .sc-item{flex:1;text-align:center}
// .sc-val{font-size:25px;font-weight:900}
// .sc-u{color:var(--sky)}.sc-a{color:var(--vio)}
// .sc-lbl{font-size:10px;color:rgba(255,255,255,.35);margin-top:2px}
// .sc-vs{font-size:13px;font-weight:900;color:rgba(255,255,255,.22)}
// .sc-bar{height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:7px}
// .sc-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--sky),var(--ind),var(--vio));transition:width .8s ease}
// .phase-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:10px 12px}
// .ph-step{display:flex;align-items:center;gap:7px;padding:6px;border-radius:7px;font-size:11.5px;transition:.18s;margin-bottom:1px}
// .ph-step.act{background:rgba(99,102,241,.12)}
// .ph-num{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
// .ph-done{background:var(--em);color:#fff}.ph-act{background:var(--ind);color:#fff}.ph-pend{background:rgba(255,255,255,.08);color:rgba(255,255,255,.25)}
// .ph-lbl{font-weight:700;color:rgba(255,255,255,.4);font-size:11px}
// .ph-step.act .ph-lbl{color:#fff}
// .turn-box{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:11px;padding:11px 13px}
// .turn-label{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.35);margin-bottom:7px}
// .turn-ind{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:9px;border:1px solid}
// .turn-ind.your{background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.3)}
// .turn-ind.ai{background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.3);animation:turnBlink 1.5s infinite}
// .turn-dot{width:9px;height:9px;border-radius:50%;animation:pulse 1.5s infinite}
// .turn-name{font-size:12.5px;font-weight:700;color:#fff}
// .turn-hint{font-size:10.5px;color:rgba(255,255,255,.42);margin-top:1px}
// .analysis-bg{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(14px);z-index:800;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .22s ease}
// .analysis-box{background:#0c1220;border:1px solid rgba(99,102,241,.24);border-radius:var(--r);width:100%;max-width:650px;max-height:88dvh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh3);animation:modalUp .3s ease}
// .analysis-head{padding:16px 20px 13px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;display:flex;align-items:center;justify-content:space-between}
// .analysis-title{font-size:15.5px;font-weight:800;color:#fff}
// .analysis-body{overflow-y:auto;flex:1;padding:18px 20px}
// .a-sec{margin-bottom:16px;animation:fadeUp .4s ease both}
// .a-sec-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.32);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,.07)}
// .score-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:7px}
// .score-box{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:11px;text-align:center}
// .score-box-val{font-size:23px;font-weight:900;margin-bottom:3px}
// .score-box-lbl{font-size:10px;color:rgba(255,255,255,.38);font-weight:600}
// .prog-wrap{margin-bottom:5px}
// .prog-label{display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.45);font-weight:600;margin-bottom:3px}
// .prog-track{height:5px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
// .prog-fill{height:100%;border-radius:4px;transition:width 1.1s ease}
// .verdict-box{padding:13px 15px;border-radius:12px;border:1.5px solid;text-align:center}
// .verdict-win{font-size:21px;font-weight:900;margin-bottom:3px}
// .verdict-lbl{font-size:11.5px;font-weight:700;opacity:.6}
// .analysis-foot{padding:12px 20px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;display:flex;justify-content:flex-end;gap:8px}
// .results-page{height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:clamp(20px,4vw,52px);text-align:center;overflow-y:auto;background:radial-gradient(ellipse at 50% 25%,rgba(99,102,241,.07) 0%,transparent 65%)}
// .res-trophy{font-size:62px;margin-bottom:12px;animation:scaleIn .6s cubic-bezier(.34,1.56,.64,1) .2s both}
// .res-title{font-size:clamp(20px,3.2vw,34px);font-weight:900;letter-spacing:-.6px;margin-bottom:6px;color:var(--t1)}
// .res-sub{font-size:13px;color:var(--t2);max-width:340px;line-height:1.75;margin-bottom:18px}
// .res-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;max-width:340px;margin-bottom:16px}
// .res-stat{background:var(--surf);border:1px solid var(--bdr);border-radius:14px;padding:12px 10px;box-shadow:var(--sh);animation:fadeUp .4s ease both;text-align:center;transition:all .25s}
// .res-stat:hover{transform:translateY(-4px);box-shadow:0 10px 28px rgba(99,102,241,.12)}
// .res-stat-ico{font-size:19px;margin-bottom:4px}
// .res-stat-val{font-size:clamp(16px,2.2vw,24px);font-weight:900;color:var(--ind)}
// .res-stat-lbl{font-size:10px;color:var(--t3);margin-top:2px}
// .res-verdict{width:100%;max-width:760px;display:grid;grid-template-columns:1.2fr .8fr;gap:12px;margin-bottom:18px;text-align:left}
// .res-panel{background:var(--surf);border:1px solid var(--bdr);border-radius:18px;padding:18px;box-shadow:var(--sh)}
// .res-panel-title{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--t3);margin-bottom:10px}
// .res-winner-name{font-size:24px;font-weight:900;color:var(--t1);margin-bottom:4px}
// .res-winner-sub{font-size:13px;line-height:1.6;color:var(--t2)}
// .res-rank{display:flex;flex-direction:column;gap:10px}
// .res-rank-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 13px;border-radius:14px;background:var(--surf2);border:1px solid var(--bdr)}
// .res-rank-name{font-size:13px;font-weight:800;color:var(--t1)}
// .res-rank-role{font-size:11px;color:var(--t3);margin-top:2px}
// .res-rank-score{font-size:18px;font-weight:900;color:var(--ind)}
// .res-insights{width:100%;max-width:760px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
// .res-insight{background:var(--surf);border:1px solid var(--bdr);border-radius:16px;padding:14px;text-align:left;box-shadow:var(--sh)}
// .res-insight-title{font-size:11px;font-weight:800;color:var(--ind);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em}
// .res-insight-text{font-size:12.5px;line-height:1.65;color:var(--t2)}
// .res-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:center}

// @media(max-width:1100px){.dp-setup{grid-template-columns:35% 1fr}}
// @media(max-width:900px){
//   .dp-setup{grid-template-columns:1fr;overflow-y:auto;height:auto;min-height:100dvh}
//   .dp-setup-left{min-height:200px;max-height:260px}
//   .dp-setup-left-inner{justify-content:flex-start}
//   .dp-feats-left{display:none}
//   .ctx-card{display:none}
// }
// @media(max-width:768px){
//   .submode-grid,.dtype-grid{grid-template-columns:1fr}
//   .room-body{flex-direction:column}
//   .room-info-grid{grid-template-columns:1fr;gap:8px;padding:8px}
//   .room-info-card{min-height:auto;padding:10px 12px}
//   .host-popup-btn{width:100%;justify-content:center}
//   .host-popup-panel{left:0;right:0;width:auto}
//   .vid-grid{padding:8px;gap:8px}
//   .tile{min-height:180px}
//   .ctrl-bar{padding:8px}.cg{gap:2px;justify-content:center}
//   .cbtn{padding:5px 6px;min-width:38px;font-size:8.5px}
//   .side-panel{width:100%;min-width:100%;max-height:42dvh;border-left:none;border-top:1px solid rgba(255,255,255,.07)}.rbar-topic{display:none}
//   .fi-row{grid-template-columns:1fr}
//   .analysis-bg{align-items:flex-end;padding:0}.analysis-box{border-radius:16px 16px 0 0;max-height:92dvh}
//   .overlay{align-items:flex-end;padding:0}.modal{border-radius:16px 16px 0 0;max-height:90dvh}
//   .vg-3,.vg-4{grid-template-columns:1fr 1fr}
//   .res-verdict,.res-insights{grid-template-columns:1fr}
// }
// @media(max-width:560px){.cbtn span:last-child{display:none}.cbtn{min-width:32px}.tile{min-height:160px}.res-actions{flex-direction:column;align-items:stretch}}
// `;

// // ─── CONSTANTS ───────────────────────────────────────────────────────────────
// const COLORS = ["#6366f1","#10b981","#f59e0b","#38bdf8","#ec4899","#8b5cf6","#f97316","#06b6d4"];
// const PHASES = ["Opening Statements","Cross-Examination","Rebuttal Round","Closing Arguments"];
// const REACTIONS = ["👍","👏","❤️","😂","🔥","🤔","🎓","✨"];

// const SUBJECT_UNITS: Record<string, string[]> = {
//   "Computer Science": ["Data Structures","Algorithms","Operating Systems","Networks","Databases","AI & ML","Web Development","Cybersecurity","Other"],
//   "Mathematics": ["Calculus","Linear Algebra","Statistics","Number Theory","Discrete Math","Probability","Geometry","Other"],
//   "Biology": ["Cell Biology","Genetics","Ecology","Evolution","Physiology","Microbiology","Biochemistry","Other"],
//   "Physics": ["Mechanics","Thermodynamics","Electromagnetism","Quantum Physics","Optics","Relativity","Other"],
//   "Chemistry": ["Organic Chemistry","Inorganic Chemistry","Physical Chemistry","Analytical Chemistry","Biochemistry","Other"],
//   "History": ["Ancient History","Medieval History","Modern History","World Wars","Cold War","Economic History","Other"],
//   "Literature": ["Poetry","Fiction","Drama","Non-Fiction","Literary Theory","Comparative Lit","Other"],
//   "Economics": ["Microeconomics","Macroeconomics","Development Economics","International Trade","Behavioral Econ","Other"],
//   "Philosophy": ["Ethics","Logic","Metaphysics","Epistemology","Political Philosophy","Philosophy of Mind","Other"],
//   "Psychology": ["Cognitive Psychology","Social Psychology","Developmental Psych","Clinical Psychology","Neuroscience","Other"],
//   "Law": ["Constitutional Law","Criminal Law","Contract Law","International Law","Tort Law","Other"],
//   "Business": ["Marketing","Finance","Strategy","Operations","Entrepreneurship","HR Management","Other"],
//   "Medicine": ["Anatomy","Pharmacology","Pathology","Clinical Skills","Public Health","Other"],
//   "Engineering": ["Mechanical Eng","Electrical Eng","Civil Eng","Chemical Eng","Aerospace Eng","Other"],
//   "Arts": ["Fine Arts","Design","Music Theory","Film Studies","Architecture","Other"],
// };
// const SUBJECTS = Object.keys(SUBJECT_UNITS);

// const TOPICS = [
//   "AI will replace most human jobs within 20 years",
//   "Social media does more harm than good",
//   "Nuclear energy is essential for climate change",
//   "Universal basic income should be implemented",
//   "Space exploration is worth the investment",
//   "Animal testing should be banned",
//   "Coding should be mandatory in all schools",
//   "Democracy is the best form of government",
// ];

// // Short crisp AI debater lines so voice doesn't run too long
// const AI_LINES = [
//   "That claim lacks empirical support. The data says otherwise.",
//   "You are conflating correlation with causation here.",
//   "Strong framing, but the systemic implications are being ignored.",
//   "Can you substantiate that with concrete evidence?",
//   "That premise is false. Here is precisely why it breaks down.",
//   "I concede that point, but your core conclusion still fails.",
//   "History provides direct counter-examples to that assertion.",
//   "Even granting your premise, the conclusion does not follow.",
//   "That view has been thoroughly challenged in recent literature.",
//   "You are presenting a false dilemma. There is a third option.",
// ];

// const AI_MULTI_LINES = [
//   "Excellent point. Let us hear another perspective.",
//   "Building on that — consider the ethical angle here.",
//   "Fascinating. Can someone offer a counter argument?",
//   "That touches a key tension. Who wants to unpack it?",
//   "Would anyone like to challenge or extend this?",
// ];

// const avColor = (n: string) => COLORS[(n || "U").charCodeAt(0) % COLORS.length];
// const avInit  = (n: string) => (n || "U").split(/[_\s]/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
// const genRoomId = () => Math.random().toString(36).slice(2, 12);
// const genRoomLink = (id: string) => `${window.location.origin}/debate/join?room=${id}`;
// const MULTI_REACTIONS = ["👏","🔥","💡","🙌","🎯","⚡","🚀","🏆","🧠","💯","📣","🌟"];
// const DUMMY_STUDENTS = [
//   "Aarav Shah","Diya Kapoor","Rohan Iyer","Meera Nair","Kabir Singh","Anaya Das",
//   "Vivaan Patel","Ishita Rao","Arjun Menon","Sara Khan","Neel Joshi","Tara Mehta",
// ];
// const randomPick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
// const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

// // ─── HELPERS ─────────────────────────────────────────────────────────────────
// function fmtClock(totalSeconds: number) {
//   const safe = Math.max(0, totalSeconds);
//   return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
// }

// function useTimer(running: boolean) {
//   const [elapsedSeconds, setElapsedSeconds] = useState(0);
//   useEffect(() => {
//     if (!running) return;
//     const id = setInterval(() => setElapsedSeconds(x => x + 1), 1000);
//     return () => clearInterval(id);
//   }, [running]);
//   return { elapsedSeconds, label: fmtClock(elapsedSeconds) };
// }

// function useMicPerm() {
//   const [state, setState] = useState<"idle"|"requesting"|"granted"|"denied">("idle");
//   const [stream, setStream] = useState<MediaStream | null>(null);
//   async function request() {
//     setState("requesting");
//     try {
//       const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
//       setStream(s); setState("granted"); return s;
//     } catch { setState("denied"); return null; }
//   }
//   function stop() { stream?.getTracks().forEach(t => t.stop()); setStream(null); setState("idle"); }
//   return { state, stream, request, stop };
// }

// function useRecorder() {
//   const mrRef = useRef<MediaRecorder | null>(null);
//   const chunks = useRef<Blob[]>([]);
//   const [isRecording, setIsRecording] = useState(false);
//   const [blob, setBlob] = useState<Blob | null>(null);
//   async function start(audio?: MediaStream | null) {
//     try {
//       const ds = await (navigator.mediaDevices as any).getDisplayMedia({ video: { displaySurface: "browser" }, audio: true });
//       const tracks = [...ds.getTracks()];
//       if (audio instanceof MediaStream) audio.getAudioTracks().forEach((t: MediaStreamTrack) => tracks.push(t));
//       const combined = new MediaStream(tracks);
//       const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
//       const mr = new MediaRecorder(combined, { mimeType: mime });
//       chunks.current = [];
//       mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunks.current.push(e.data); };
//       mr.onstop = () => { setBlob(new Blob(chunks.current, { type: mime })); combined.getTracks().forEach((t: MediaStreamTrack) => t.stop()); };
//       ds.getVideoTracks()[0].addEventListener("ended", () => stop());
//       mr.start(1000); mrRef.current = mr; setIsRecording(true); return true;
//     } catch { return false; }
//   }
//   function stop() { if (mrRef.current?.state !== "inactive") mrRef.current?.stop(); setIsRecording(false); }
//   function download(fname = "debate.webm") {
//     if (!blob) return;
//     const u = URL.createObjectURL(blob);
//     const a = document.createElement("a"); a.href = u; a.download = fname; a.click(); URL.revokeObjectURL(u);
//   }
//   return { isRecording, blob, start, stop, download };
// }

// // ─── SINGLETON VOICE ENGINE ───────────────────────────────────────────────────
// // One engine for the whole page. Serializes all speech so nothing overlaps.
// // speak(text, id, onDone) — if same id is already queued/speaking, skip (dedup).
// // cancel() stops everything immediately.
// const voiceEngine = (() => {
//   let currentId = "";
//   let speaking = false;
//   let cancelled = false;
//   let voiceRef: SpeechSynthesisVoice | null = null;

//   function pickVoice() {
//     const voices = window.speechSynthesis?.getVoices() || [];
//     const preferred = [
//       "Microsoft Aria Online (Natural)",
//       "Microsoft Jenny Online (Natural)",
//       "Microsoft Guy Online (Natural)",
//       "Google US English",
//       "Google UK English Female",
//       "Google UK English Male",
//       "Samantha","Karen","Moira","Daniel","Alex",
//     ];
//     voiceRef =
//       preferred.map(name => voices.find(v => v.name.includes(name))).find(Boolean) ||
//       voices.find(v => /en[-_](us)/i.test(v.lang)) ||
//       voices.find(v => /en[-_](gb|au|in)/i.test(v.lang)) ||
//       voices.find(v => /^en/i.test(v.lang)) ||
//       voices[0] || null;
//   }

//   if (typeof window !== "undefined") {
//     window.speechSynthesis?.addEventListener("voiceschanged", pickVoice);
//     pickVoice();
//   }

//   function speak(
//     text: string,
//     id: string,
//     opts: { pitch?: number; rate?: number },
//     onStart?: () => void,
//     onDone?: () => void,
//   ) {
//     if (!("speechSynthesis" in window)) { onDone?.(); return; }

//     // Deduplicate: if this exact id is already speaking, ignore
//     if (currentId === id && speaking) return;

//     cancelled = false;
//     currentId = id;
//     window.speechSynthesis.cancel();

//     // Split into sentences to avoid Chrome's 15s truncation bug
//     const sentences = text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) || [text];
//     let idx = 0;

//     function next() {
//       if (cancelled || idx >= sentences.length) {
//         speaking = false;
//         if (!cancelled) onDone?.();
//         return;
//       }

//       const u = new SpeechSynthesisUtterance(sentences[idx]);
//       u.rate  = opts.rate  ?? 0.92;
//       u.pitch = opts.pitch ?? 1.0;
//       u.volume = 1;
//       u.lang = voiceRef?.lang || "en-US";
//       if (voiceRef) u.voice = voiceRef;

//       u.onstart = () => {
//         if (!cancelled) { speaking = true; onStart?.(); }
//       };
//       u.onend = () => { idx++; next(); };
//       u.onerror = (e: SpeechSynthesisErrorEvent) => {
//         if (e.error === "interrupted" || e.error === "canceled") { speaking = false; return; }
//         speaking = false; onDone?.();
//       };

//       try {
//         window.speechSynthesis.resume();
//         window.speechSynthesis.speak(u);
//       } catch { speaking = false; onDone?.(); }
//     }

//     // Small delay so cancel() fully clears before new utterance is enqueued
//     setTimeout(next, 180);
//   }

//   function cancel() {
//     cancelled = true;
//     speaking = false;
//     currentId = "";
//     window.speechSynthesis?.cancel();
//   }

//   // Chrome keepalive — prevents silent suspension after ~15s
//   if (typeof window !== "undefined") {
//     setInterval(() => {
//       if (window.speechSynthesis && !window.speechSynthesis.speaking) {
//         window.speechSynthesis.resume();
//       }
//     }, 10000);
//   }

//   return { speak, cancel };
// })();

// // ─── TOAST ────────────────────────────────────────────────────────────────────
// function useToast() {
//   const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
//   const show = (msg: string, type = "success") => setToast({ msg, type });
//   useEffect(() => {
//     if (!toast) return;
//     const t = setTimeout(() => setToast(null), 3500);
//     return () => clearTimeout(t);
//   }, [toast]);
//   const node = toast ? (
//     <div className={`dp-toast ${toast.type}`} onClick={() => setToast(null)}>
//       {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : toast.type === "warn" ? "⚠️" : "ℹ️"} {toast.msg}
//     </div>
//   ) : null;
//   return { show, node };
// }

// // ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
// function MicPreview({ perm, name, onReq, micOn, onToggle }: any) {
//   return (
//     <div className="mic-preview">
//       <div className="mic-av">{name ? name[0].toUpperCase() : "?"}</div>
//       <div className="mic-info">
//         <div className="mic-name">{name || "Your Name"}</div>
//         <div className="mic-sub">🎙 Audio-only mode</div>
//         <div className="perm-row">
//           {perm === "idle"       && <button className="perm-btn req"    onClick={onReq}>🎤 Allow Mic</button>}
//           {perm === "requesting" && <button className="perm-btn req"    disabled><span className="loader-spin dark" style={{ width:14,height:14,borderWidth:2 }} />Requesting…</button>}
//           {perm === "denied"     && <button className="perm-btn denied" onClick={onReq}>🔄 Retry</button>}
//           {perm === "granted"    && (
//             <>
//               <button className={`perm-btn ${micOn ? "granted" : "denied"}`} onClick={onToggle}>
//                 {micOn ? "🎤 Mic On" : "🔇 Off"}
//               </button>
//               <span style={{ padding:"5px 10px",borderRadius:7,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",fontSize:11,fontWeight:700,color:"var(--em)" }}>✓ Ready</span>
//             </>
//           )}
//         </div>
//         {perm === "denied" && <div className="perm-warn">⚠️ Allow mic in browser settings and retry.</div>}
//       </div>
//     </div>
//   );
// }

// function StepsComp({ steps }: { steps: { label: string; done: boolean }[] }) {
//   const st = (i: number) => steps[i].done ? "done" : steps.slice(0, i).every(s => s.done) ? "act" : "pend";
//   return (
//     <div className="steps">
//       {steps.map((s, i) => (
//         <div key={i} className={`step-row ${st(i)}`}>
//           <div className="step-num">{s.done ? "✓" : i + 1}</div>
//           <div className="step-lbl">{s.label}</div>
//         </div>
//       ))}
//     </div>
//   );
// }

// interface Participant {
//   id: number;
//   name: string;
//   stream: MediaStream | null;
//   isLocal?: boolean;
//   isHost?: boolean;
//   isAI?: boolean;
//   isMed?: boolean;
//   isStudent?: boolean;
//   micMuted: boolean;
//   camOn: boolean;
//   isSpeaking: boolean;
//   handRaised: boolean;
//   isMyTurn?: boolean;
//   isAITyping?: boolean;
//   avatarColor?: string;
//   energy?: number;
//   reactionsReceived?: number;
//   turnsTaken?: number;
// }

// function WaveBars({ color = "#10b981" }: { color?: string }) {
//   return (
//     <div className="tile-wave">
//       {[0,1,2,3,4].map(i => (
//         <div key={i} className="tile-wave-bar" style={{ background: color, animationDelay: `${i * 0.11}s` }} />
//       ))}
//     </div>
//   );
// }

// function Tile({ p, reaction, nudge }: { p: Participant; reaction?: any; nudge?: string }) {
//   const vRef = useRef<HTMLVideoElement>(null);
//   useEffect(() => { if (vRef.current && p.stream instanceof MediaStream) vRef.current.srcObject = p.stream; }, [p.stream]);
//   const color = p.avatarColor || avColor(p.name);
//   return (
//     <div className={`tile${p.isSpeaking ? " spk" : ""}`}>
//       {p.stream instanceof MediaStream && p.camOn
//         ? <video ref={vRef} autoPlay playsInline muted={p.isLocal} />
//         : (
//           <div className="tile-av" style={{ background: color + "28", color }}>
//             {p.isAI && !p.isMed ? "🤖" : p.isMed ? "🎙️" : avInit(p.name)}
//           </div>
//         )
//       }
//       {p.isSpeaking && (p.isAI || p.isMed) && (
//         <div className="tile-wave">
//           {[0,1,2,3,4].map(i => (
//             <div key={i} className="tile-wave-bar" style={{ background: p.isMed ? "#38bdf8" : "#8b5cf6", animationDelay: `${i * 0.1}s` }} />
//           ))}
//         </div>
//       )}
//       {p.isSpeaking && !p.isAI && !p.isMed && <WaveBars color="#10b981" />}
//       {p.isMyTurn && !p.micMuted && <div className="tile-turn">🎤 Speaking</div>}
//       {p.isMyTurn && p.micMuted && !p.isAI && !p.isMed && <div className="tile-turn" style={{ background:"rgba(99,102,241,.88)" }}>🎙 Your Turn Soon</div>}
//       {p.isAITyping && (
//         <div className="ai-typing-wrap">
//           {[0,1,2].map(i => <div key={i} className="ai-dot" style={{ animationDelay: `${i * 0.22}s` }} />)}
//         </div>
//       )}
//       {nudge && <div className="tile-nudge">{nudge}</div>}
//       {p.handRaised && (
//         <div style={{ position:"absolute",top:8,left:8,background:"rgba(245,166,35,.92)",borderRadius:7,padding:"3px 8px",fontSize:11,fontWeight:800,color:"#000" }}>✋</div>
//       )}
//       {reaction && <div key={reaction.key} className="tile-react">{reaction.emoji}</div>}
//       <div className="tile-ov">
//         <div className="tile-name">
//           {p.name}
//           {p.isHost  && <span className="t-badge t-host">HOST</span>}
//           {p.isAI && !p.isMed && <span className="t-badge t-ai">AI</span>}
//           {p.isMed   && <span className="t-badge t-med">MED</span>}
//           {p.isLocal && !p.isHost && <span className="t-badge t-you">You</span>}
//           {p.isSpeaking && (p.isAI || p.isMed) && (
//             <span className="voice-badge">
//               <span className="voice-bars">
//                 {[0,1,2].map(i => <span key={i} className="voice-bar" style={{ height:`${8+i*3}px`, animationDelay:`${i*0.15}s` }} />)}
//               </span>
//               Speaking
//             </span>
//           )}
//           {p.isSpeaking && !p.isAI && !p.isMed && !p.micMuted && (
//             <span className="mic-badge">
//               <span className="voice-bars">
//                 {[0,1,2].map(i => <span key={i} className="mic-bar" style={{ height:`${8+i*3}px`, animationDelay:`${i*0.15}s` }} />)}
//               </span>
//               Live
//             </span>
//           )}
//         </div>
//         {p.micMuted && <div className="tile-muted">🔇</div>}
//       </div>
//     </div>
//   );
// }

// function createDummyStudents(startId = 10, count = 10): Participant[] {
//   return shuffle(DUMMY_STUDENTS).slice(0, count).map((name, idx) => ({
//     id: startId + idx,
//     name,
//     stream: null,
//     isStudent: true,
//     micMuted: true,
//     camOn: false,
//     isSpeaking: false,
//     handRaised: Math.random() > 0.75,
//     avatarColor: COLORS[(idx + 1) % COLORS.length],
//     energy: 55 + Math.floor(Math.random() * 40),
//     reactionsReceived: 0,
//     turnsTaken: 0,
//   }));
// }

// function buildMultiVerdict(list: Participant[]) {
//   const ranked = [...list]
//     .filter(p => !p.isAI && !p.isMed)
//     .map(p => ({
//       ...p,
//       debateScore: (p.turnsTaken || 0) * 6 + (p.reactionsReceived || 0) * 4 + Math.round((p.energy || 0) / 8),
//     }))
//     .sort((a, b) => (b.debateScore || 0) - (a.debateScore || 0));
//   const winner   = ranked[0] || null;
//   const runnerUp = ranked[1] || null;
//   const insights = winner ? [
//     `${winner.name} held the strongest audience response with ${winner.reactionsReceived || 0} reactions.`,
//     `${winner.name} completed ${winner.turnsTaken || 0} speaking turn${winner.turnsTaken === 1 ? "" : "s"} with steady control.`,
//     runnerUp
//       ? `${runnerUp.name} finished as runner-up and stayed competitive throughout the room.`
//       : "No runner-up was available in this session.",
//   ] : [];
//   return { ranked, winner, runnerUp, insights };
// }

// // ─── SCHEDULE MODAL ──────────────────────────────────────────────────────────
// function ScheduleDebateModal({ config, onSchedule, onClose }: any) {
//   const [date, setDate] = useState("");
//   const [time, setTime] = useState("10:00");
//   const [saving, setSaving] = useState(false);

//   async function handleSave() {
//     if (!date) return;
//     setSaving(true);
//     await new Promise(r => setTimeout(r, 700));
//     try {
//       const ev = { id:`db-${Date.now()}`,title:config?.topic||"Debate",type:"debate",date,startTime:time,subject:config?.subject||"",unit:config?.unit||"" };
//       const ex = JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");
//       localStorage.setItem("gradeup_cal_events_v3", JSON.stringify([...ex, ev]));
//       window.dispatchEvent(new StorageEvent("storage", { key:"gradeup_cal_events_v3" }));
//     } catch {}
//     setSaving(false);
//     onSchedule({ date, time });
//   }

//   return (
//     <div className="overlay">
//       <div className="modal" style={{ maxWidth:400 }}>
//         <div className="mh">
//           <span className="mh-title">📅 Schedule Debate</span>
//           <button className="mh-close" onClick={onClose}>✕</button>
//         </div>
//         <div className="mb">
//           <div style={{ padding:"10px 12px",borderRadius:11,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.18)",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
//             <span style={{ fontSize:18 }}>📅</span>
//             <div>
//               <div style={{ fontSize:11.5,fontWeight:800,color:"var(--em)" }}>Auto-synced to Calendar</div>
//               <div style={{ fontSize:10.5,color:"var(--t2)" }}>Event saved automatically after scheduling</div>
//             </div>
//           </div>
//           {config?.topic && (
//             <div style={{ padding:"9px 12px",borderRadius:10,background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.18)",marginBottom:14,fontSize:12.5,fontWeight:700,color:"var(--t1)" }}>
//               ⚔️ "{config.topic}"
//             </div>
//           )}
//           <div className="fi-row fi">
//             <div><label className="fl">Date *</label><input className="finput" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
//             <div><label className="fl">Time</label><input className="finput" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
//           </div>
//         </div>
//         <div className="mf">
//           <button className="btn-s" onClick={onClose} disabled={saving}>Cancel</button>
//           <button className="btn-p" style={{ width:"auto",padding:"9px 22px" }} onClick={handleSave} disabled={!date || saving}>
//             {saving ? <><span className="loader-spin" />Scheduling…</> : "📅 Schedule & Save"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── SETUP ───────────────────────────────────────────────────────────────────
// function DebateSetup({ onBack, onLaunch }: { onBack?: () => void; onLaunch: (cfg: any) => void }) {
//   const { user } = useAuth();
//   const [name, setName]           = useState(user ? `${user.firstName} ${user.lastName}` : "");
//   const [subMode, setSubMode]     = useState<"ai"|"multi"|"">("");
//   const [debateType, setDebateType] = useState<"instant"|"schedule"|"">("");
//   const [subject, setSubject]     = useState("");
//   const [unit, setUnit]           = useState("");
//   const [topic, setTopic]         = useState("");
//   const [custom, setCustom]       = useState("");
//   const [micOn, setMicOn]         = useState(true);
//   const [debateMinutes, setDebateMinutes] = useState("5");
//   const [showSchedule, setShowSchedule]   = useState(false);
//   const [scheduled, setScheduled]         = useState(false);
//   const [scheduledInfo, setScheduledInfo] = useState<any>(null);
//   const [copied, setCopied]       = useState(false);
//   const [showConfirm, setShowConfirm]     = useState(false);
//   const [joining, setJoining]     = useState(false);
//   const [joinProgress, setJoinProgress]   = useState(0);
//   const roomId   = useRef(genRoomId());
//   const roomLink = genRoomLink(roomId.current);
//   const { state: perm, stream, request, stop } = useMicPerm();
//   const { show: toast$, node: toastNode } = useToast();
//   const finalTopic     = topic === "__custom__" ? custom : topic;
//   const availableUnits = subject ? SUBJECT_UNITS[subject] || [] : [];

//   const steps = [
//     { label:"Enter your name",         done: name.trim().length > 0 },
//     { label:"Allow microphone",        done: perm === "granted" },
//     { label:"Select subject",          done: !!subject },
//     { label:"Select unit",             done: !!unit },
//     { label:"Select topic",            done: !!finalTopic },
//     { label:"Choose debate type",      done: !!subMode },
//     { label:"Instant or schedule",     done: !!debateType },
//     { label:"Set debate timer",        done: !!debateMinutes },
//   ];
//   const canLaunch = steps.every(s => s.done);
//   const copyLink = () => { navigator.clipboard.writeText(roomLink); setCopied(true); setTimeout(() => setCopied(false), 2200); };

//   const features = [
//     { ico:"🤖", t:"AI Voice Opponent",  d:"Real-time voice rebuttals & live scoring" },
//     { ico:"📊", t:"Analysis Reports",   d:"Full AI-generated feedback after each debate" },
//     { ico:"📋", t:"4-Phase Structure",  d:"Opening → Cross-exam → Rebuttal → Closing" },
//     { ico:"⏺",  t:"Session Recording", d:"Download your debate as video" },
//   ];

//   async function handleJoin() {
//     setJoining(true);
//     try {
//       const ev = { id:`db-${Date.now()}`,title:finalTopic,type:"debate",date:new Date().toISOString().slice(0,10),startTime:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),subject,unit };
//       const ex = JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");
//       localStorage.setItem("gradeup_cal_events_v3", JSON.stringify([...ex, ev]));
//       window.dispatchEvent(new StorageEvent("storage", { key:"gradeup_cal_events_v3" }));
//     } catch {}
//     for (let p = 0; p <= 100; p += 20) { await new Promise(r => setTimeout(r, 180)); setJoinProgress(p); }
//     setJoining(false); setShowConfirm(false); setJoinProgress(0);
//     onLaunch({
//       name, mode:"debate", subMode, subject, unit,
//       topic: finalTopic, stream, micOn, camOn: false,
//       invitees: [], roomId: roomId.current, roomLink,
//       debateMinutes: Number(debateMinutes),
//     });
//   }

//   return (
//     <div className="dp-setup">
//       {/* LEFT */}
//       <div className="dp-setup-left">
//         <div className="dp-orbs"><div className="dp-orb dp-orb1" /><div className="dp-orb dp-orb2" /></div>
//         <div className="dp-grid" />
//         <div className="dp-setup-left-inner">
//           <div className="dp-logo">
//             <div className="dp-logo-ico">⚔️</div>
//             <span className="dp-logo-name">DebateArena</span>
//           </div>
//           <div className="dp-tag"><div className="dp-tag-dot" />Debate Setup</div>
//           <h2 className="dp-h1">Launch your<br /><span className="gt">Debate Room.</span></h2>
//           <p className="dp-p">
//             {subMode === "ai"    ? "1-on-1 · AI voice opponent · Auto turn-based scoring" :
//              subMode === "multi" ? "Multi-user · AI mediates · Group analysis report" :
//              "AI-powered debate rooms with voice opponents, live scoring, and analysis."}
//           </p>
//           <div className="dp-feats-left">
//             {features.map((f, i) => (
//               <div key={f.t} className="dp-feat-left" style={{ animationDelay:`${0.12 + i * 0.07}s` }}>
//                 <div className="dp-feat-ico">{f.ico}</div>
//                 <div className="dp-feat-txt"><strong>{f.t}</strong><span>{f.d}</span></div>
//               </div>
//             ))}
//           </div>
//           {(subject || finalTopic) && (
//             <div className="ctx-card">
//               <div className="ctx-card-label">Session Context</div>
//               {subject  && <div className="ctx-card-val">📚 {subject}{unit ? ` · ${unit}` : ""}</div>}
//               {finalTopic && <div className="ctx-card-sub">{finalTopic.length > 45 ? finalTopic.slice(0,45)+"…" : finalTopic}</div>}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* RIGHT */}
//       <div className="dp-setup-right">
//         <div className="dp-setup-scroll">
//           <div className="dp-setup-inner">
//             {onBack && <button className="setup-back" onClick={() => { stop(); onBack(); }}>← Back</button>}
//             <h2 className="setup-title">⚔️ Debate Setup</h2>
//             <p className="setup-sub">Complete all steps to launch your debate room.</p>

//             <MicPreview
//               perm={perm} name={name} onReq={request} micOn={micOn}
//               onToggle={() => { const n = !micOn; setMicOn(n); stream?.getAudioTracks().forEach(t => t.enabled = n); }}
//             />

//             <div className="sec-div">Identity</div>
//             <div className="fi">
//               <label className="fl">Your Name</label>
//               <input className="finput" placeholder="e.g. Alex Chen" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
//             </div>

//             <div className="sec-div">Academic Context</div>
//             <div className="fi-row fi">
//               <div>
//                 <label className="fl">Subject</label>
//                 <select className="finput" value={subject} onChange={e => { setSubject(e.target.value); setUnit(""); }}>
//                   <option value="">Select subject…</option>
//                   {SUBJECTS.map(s => <option key={s}>{s}</option>)}
//                 </select>
//               </div>
//               <div>
//                 <label className="fl">Unit / Module</label>
//                 <select className="finput" value={unit} onChange={e => setUnit(e.target.value)} disabled={!subject}>
//                   <option value="">{subject ? "Select unit…" : "Select subject first"}</option>
//                   {availableUnits.map(u => <option key={u}>{u}</option>)}
//                 </select>
//               </div>
//             </div>

//             <div className="sec-div">Topic</div>
//             <div className="fi">
//               <label className="fl">Debate Topic</label>
//               <select className="finput" value={topic} onChange={e => setTopic(e.target.value)}>
//                 <option value="">Select a topic…</option>
//                 {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
//                 <option value="__custom__">✏️ Custom topic…</option>
//               </select>
//             </div>
//             {topic === "__custom__" && (
//               <div className="fi">
//                 <label className="fl">Custom Topic</label>
//                 <input className="finput" placeholder="Your debate topic…" value={custom} onChange={e => setCustom(e.target.value)} />
//               </div>
//             )}

//             <div className="sec-div">Debate Mode</div>
//             <div className="submode-grid fi">
//               {[
//                 { id:"ai",    ico:"🤖", t:"1v1 vs AI",   d:"Face an AI voice opponent. Turn-based argumentation with live scoring.", badge:"Popular" },
//                 { id:"multi", ico:"👥", t:"Multi-User",  d:"Group debate with multiple participants. AI Mediator guides the discussion.", badge:"" },
//               ].map(o => (
//                 <div key={o.id} className={`submode-card${subMode === o.id ? " sel" : ""}`} onClick={() => setSubMode(o.id as any)}>
//                   <div className="submode-ico">{o.ico}</div>
//                   <div>
//                     <div className="submode-title">
//                       {o.t} {o.badge && <span style={{ fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:20,background:"rgba(99,102,241,.15)",color:"var(--ind)",marginLeft:4 }}>{o.badge}</span>}
//                     </div>
//                     <div className="submode-desc">{o.d}</div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             <div className="sec-div">Timing</div>
//             <div className="dtype-grid fi">
//               {[
//                 { id:"instant",  ico:"⚡", t:"Start Now", d:"Jump right in" },
//                 { id:"schedule", ico:"📅", t:"Schedule",  d:"Plan for later" },
//               ].map(o => (
//                 <div key={o.id} className={`dtype-card${debateType === o.id ? " sel" : ""}`} onClick={() => setDebateType(o.id as any)}>
//                   <div className="dtype-ico">{o.ico}</div>
//                   <div><div className="dtype-title">{o.t}</div><div className="dtype-desc">{o.d}</div></div>
//                 </div>
//               ))}
//             </div>
//             <div className="fi">
//               <label className="fl">Debate Duration</label>
//               <select className="finput" value={debateMinutes} onChange={e => setDebateMinutes(e.target.value)}>
//                 {[2,5,10,15,20].map(min => <option key={min} value={String(min)}>{min} minutes</option>)}
//               </select>
//             </div>
//             {debateType === "schedule" && (
//               <div style={{ padding:13,borderRadius:13,background:"rgba(99,102,241,.05)",border:"1.5px solid rgba(99,102,241,.18)",marginBottom:10 }}>
//                 {!scheduled ? (
//                   <>
//                     <div style={{ fontSize:12.5,fontWeight:700,color:"var(--t1)",marginBottom:6 }}>📅 Set date & time for your debate</div>
//                     <div style={{ fontSize:11.5,color:"var(--t2)",marginBottom:10 }}>Event will be auto-saved to your calendar.</div>
//                     <button className="btn-s" style={{ width:"100%",justifyContent:"center" as const }} onClick={() => setShowSchedule(true)}>📅 Open Schedule Form</button>
//                   </>
//                 ) : (
//                   <div style={{ display:"flex",alignItems:"center",gap:9 }}>
//                     <span style={{ fontSize:22 }}>✅</span>
//                     <div>
//                       <div style={{ fontSize:12,fontWeight:800,color:"var(--em)" }}>Debate Scheduled</div>
//                       <div style={{ fontSize:11,color:"var(--t2)" }}>📅 {scheduledInfo?.date} at {scheduledInfo?.time} · Saved to Calendar</div>
//                     </div>
//                     <button className="btn-s" style={{ marginLeft:"auto",fontSize:11,padding:"5px 10px" }} onClick={() => { setScheduled(false); setShowSchedule(true); }}>Edit</button>
//                   </div>
//                 )}
//               </div>
//             )}

//             <div className="link-box">
//               <div className="link-box-title">🔗 Room Link</div>
//               <div className="link-row"><span className="link-val">{roomLink}</span><button className="copy-btn" onClick={copyLink}>{copied ? "✓ Copied!" : "Copy"}</button></div>
//               <div className="share-actions">
//                 <button className="share-btn" onClick={() => { navigator.clipboard.writeText(roomLink); toast$("Link copied!","info"); }}>📧 Email</button>
//                 <button className="share-btn" onClick={() => { if (navigator.share) navigator.share({ title:"Join my debate", url:roomLink }); }}>↗ Share</button>
//               </div>
//             </div>

//             <StepsComp steps={steps} />
//             <button className="btn-p" onClick={() => setShowConfirm(true)} disabled={!canLaunch}>🚀 Launch Debate Room</button>
//             <div style={{ height:24 }} />
//           </div>
//         </div>
//       </div>

//       {showSchedule && (
//         <ScheduleDebateModal
//           config={{ topic: finalTopic, subject, unit }}
//           onSchedule={(info: any) => { setScheduledInfo(info); setScheduled(true); setShowSchedule(false); toast$("📅 Debate scheduled!","success"); }}
//           onClose={() => setShowSchedule(false)}
//         />
//       )}

//       {showConfirm && (
//         <div className="overlay">
//           <div className="modal" style={{ maxWidth:400 }}>
//             <div style={{ background:"linear-gradient(135deg,#0d1428,#1a2040)",padding:"28px 20px",textAlign:"center" as const }}>
//               <div style={{ width:70,height:70,borderRadius:"50%",background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 12px" }}>⚔️</div>
//               <div style={{ fontSize:16,fontWeight:800,color:"#fff",marginBottom:4 }}>{name}</div>
//               <div style={{ fontSize:12,color:"rgba(255,255,255,.5)" }}>{subMode === "ai" ? "1v1 vs AI Debate" : "Multi-User Debate"}</div>
//               {subject && <div style={{ fontSize:11,color:"rgba(255,255,255,.35)",marginTop:4 }}>📚 {subject}{unit ? ` · ${unit}` : ""}</div>}
//             </div>
//             <div className="mb">
//               <div style={{ padding:"10px 12px",borderRadius:12,background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.18)",marginBottom:14 }}>
//                 <div style={{ fontSize:13,fontWeight:800,color:"var(--t1)",marginBottom:3 }}>"{finalTopic}"</div>
//               </div>
//               <button className={`perm-btn ${micOn ? "granted" : "denied"}`} style={{ width:"100%",justifyContent:"center" as const,fontSize:13,padding:"10px" }} onClick={() => setMicOn(m => !m)}>
//                 <span style={{ fontSize:18 }}>{micOn ? "🎤" : "🔇"}</span>{micOn ? "Microphone On" : "Microphone Off"}
//               </button>
//             </div>
//             <div className="mf" style={{ flexDirection:"column" as const,gap:8 }}>
//               <button className="btn-p" onClick={handleJoin} disabled={joining} style={{ fontSize:14 }}>
//                 {joining ? <><span className="loader-spin" />Joining {joinProgress > 0 ? `${joinProgress}%` : "…"}</> : "⚔️ Enter Debate Room"}
//               </button>
//               {joinProgress > 0 && <div className="lo-progress"><div className="lo-progress-fill" style={{ width:`${joinProgress}%` }} /></div>}
//               <button className="btn-s" onClick={() => setShowConfirm(false)} disabled={joining} style={{ width:"100%",justifyContent:"center" as const }}>Cancel</button>
//             </div>
//           </div>
//         </div>
//       )}
//       {toastNode}
//     </div>
//   );
// }

// // ─── ROOM ────────────────────────────────────────────────────────────────────
// function DebateRoom({ config, onEnd }: { config: any; onEnd: (r: any) => void }) {
//   const { subMode } = config;
//   const isAI1v1 = subMode === "ai";
//   const isMulti = subMode === "multi";

//   // ── PARTICIPANTS ─────────────────────────────────────────────────────────
//   const [participants, setParticipants] = useState<Participant[]>(() => {
//     const list: Participant[] = [];
//     // Local user — stream passed directly (never serialized)
//     const localStream = config.stream instanceof MediaStream ? config.stream : null;
//     list.push({
//       id: 0, name: config.name, stream: localStream,
//       isLocal: true, isHost: true, isStudent: true,
//       micMuted: !config.micOn, camOn: false,
//       isSpeaking: false, handRaised: false,
//       isMyTurn: isAI1v1,
//       avatarColor: COLORS[0], energy: 88, reactionsReceived: 0, turnsTaken: 0,
//     });
//     if (isAI1v1) {
//       list.push({ id:1, name:"AI Debater", stream:null, isAI:true, micMuted:false, camOn:false, isSpeaking:false, handRaised:false, avatarColor:"#8b5cf6" });
//     }
//     if (isMulti) {
//       list.push({ id:99, name:"AI Moderator", stream:null, isAI:true, isMed:true, micMuted:false, camOn:false, isSpeaking:false, handRaised:false, avatarColor:"#38bdf8", energy:100, reactionsReceived:0, turnsTaken:0 });
//       list.push(...createDummyStudents(10, 10));
//     }
//     return list;
//   });

//   // ── STATE ────────────────────────────────────────────────────────────────
//   const [micOn, setMicOn]             = useState(config.micOn !== false);
//   const [panelTab, setPanelTab]       = useState<string|null>(isMulti ? "people" : null);
//   const [messages, setMessages]       = useState<any[]>([]);
//   const [showEnd, setShowEnd]         = useState(false);
//   const [showAnalysis, setShowAnalysis] = useState(false);
//   const [showReactions, setShowReactions] = useState(false);
//   const [chatExpanded, setChatExpanded]   = useState(false);
//   const [scores, setScores]           = useState({ you:40, ai:38 });
//   const [phaseIdx, setPhaseIdx]       = useState(0);
//   const [whoTurn, setWhoTurn]         = useState<"you"|"ai">("you");
//   const [aiLocked, setAiLocked]       = useState(false);
//   const [nudge, setNudge]             = useState<string|null>(null);
//   const [tileReacts, setTileReacts]   = useState<Record<number,any>>({});
//   const [chatInput, setChatInput]     = useState("");
//   const [transcript, setTranscript]   = useState<any[]>([]);
//   const [waitingRoom, setWaitingRoom] = useState<Participant[]>(() => isMulti ? createDummyStudents(110, 4) : []);
//   const [showHostPopup, setShowHostPopup] = useState(false);
//   const [activeSpeakerId, setActiveSpeakerId] = useState<number|null>(null);
//   const [turnHistory, setTurnHistory] = useState<string[]>([]);
//   const [completedRound, setCompletedRound] = useState(false);
//   const [timeExpired, setTimeExpired] = useState(false);
//   // Voice speaking state for UI — driven by voiceEngine callbacks
//   const [aiIsSpeaking, setAiIsSpeaking] = useState(false);

//   const chatEndRef       = useRef<HTMLDivElement>(null);
//   const nudgeTimerRef    = useRef<ReturnType<typeof setTimeout>|null>(null);
//   const aiTimerRef       = useRef<ReturnType<typeof setTimeout>|null>(null);
//   const reactionTickerRef = useRef<ReturnType<typeof setInterval>|null>(null);
//   const autoAdvanceRef   = useRef<ReturnType<typeof setTimeout>|null>(null);
//   const initDoneRef      = useRef(false); // guard against double-init in dev StrictMode

//   const { elapsedSeconds, label: elapsedTimer } = useTimer(true);
//   const debateDurationSeconds = Math.max(60, Number(config.debateMinutes || 5) * 60);
//   const remainingSeconds = Math.max(0, debateDurationSeconds - elapsedSeconds);
//   const debateTimer = fmtClock(remainingSeconds);
//   const recorder = useRecorder();

//   const { show: toast$, node: toastNode } = useToast();

//   useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

//   // ── HELPERS ──────────────────────────────────────────────────────────────
//   const updateP = useCallback((id: number, patch: Partial<Participant>) =>
//     setParticipants(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p)), []);

//   // Safe: only touch real MediaStream tracks
//   const syncLocalMic = useCallback((enabled: boolean) => {
//     const localStream = config.stream;
//     if (localStream instanceof MediaStream) {
//       localStream.getAudioTracks().forEach(t => { t.enabled = enabled; });
//     }
//     setMicOn(enabled);
//     updateP(0, { micMuted: !enabled, isSpeaking: enabled });
//   }, [config.stream, updateP]);

//   function addMsg(sender: string, senderId: number, text: string) {
//     const e = { sender, senderId, text, time: Date.now() };
//     setMessages(ms => [...ms, e]);
//     setTranscript(t => [...t, e]);
//   }

//   const emitTileReaction = useCallback((targetId: number, emoji: string) => {
//     const k = Date.now() + Math.random();
//     setTileReacts(tr => ({ ...tr, [targetId]: { emoji, key: k } }));
//     setParticipants(ps => ps.map(p => p.id === targetId ? { ...p, reactionsReceived:(p.reactionsReceived||0)+1 } : p));
//     setTimeout(() => setTileReacts(tr => { const next = { ...tr }; delete next[targetId]; return next; }), 1900);
//   }, []);

//   // ── SPEAK HELPERS (use singleton engine, unique IDs to prevent doubling) ──
//   // Each call gets a unique ID so the engine can deduplicate if called twice
//   const speakModerator = useCallback((text: string, onDone?: () => void) => {
//     const id = `mod-${Date.now()}`;
//     updateP(99, { isSpeaking: true });
//     setAiIsSpeaking(true);
//     voiceEngine.speak(
//       text, id,
//       { pitch: 1.1, rate: 0.88 },
//       () => { updateP(99, { isSpeaking: true }); setAiIsSpeaking(true); },
//       () => { updateP(99, { isSpeaking: false }); setAiIsSpeaking(false); onDone?.(); },
//     );
//   }, [updateP]);

//   const speakDebater = useCallback((text: string, onDone?: () => void) => {
//     const id = `deb-${Date.now()}`;
//     updateP(1, { isSpeaking: true, isAITyping: false });
//     setAiIsSpeaking(true);
//     voiceEngine.speak(
//       text, id,
//       { pitch: 0.95, rate: 0.94 },
//       () => { updateP(1, { isSpeaking: true }); setAiIsSpeaking(true); },
//       () => { updateP(1, { isSpeaking: false }); setAiIsSpeaking(false); onDone?.(); },
//     );
//   }, [updateP]);

//   // Stable refs so callbacks inside effects don't get stale closures
//   const speakModRef     = useRef(speakModerator);
//   const speakDebaterRef = useRef(speakDebater);
//   const syncMicRef      = useRef(syncLocalMic);
//   useEffect(() => { speakModRef.current     = speakModerator;  }, [speakModerator]);
//   useEffect(() => { speakDebaterRef.current = speakDebater;    }, [speakDebater]);
//   useEffect(() => { syncMicRef.current      = syncLocalMic;    }, [syncLocalMic]);

//   // ── TIME EXPIRED ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (remainingSeconds > 0 || timeExpired) return;
//     setTimeExpired(true);
//     if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
//     if (autoAdvanceRef.current)   clearTimeout(autoAdvanceRef.current);
//     setActiveSpeakerId(null);
//     syncMicRef.current(false);
//     setShowEnd(true);
//     speakModRef.current("Debate time is over. Please review and end the session.");
//   }, [remainingSeconds, timeExpired]);

//   // ── PICK NEXT SPEAKER (multi-user) ────────────────────────────────────────
//   // Flow: mute everyone → AI announces → AI callback → open speaker's mic
//   const pickNextSpeaker = useCallback((reason = "random") => {
//     if (!isMulti || timeExpired) return;

//     // Clear any pending auto-advance
//     if (autoAdvanceRef.current)   clearTimeout(autoAdvanceRef.current);
//     if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);

//     const candidates = participants.filter(p => !p.isAI && !p.isMed);
//     if (!candidates.length) return;

//     // If everyone has spoken at least once, end the round
//     if (candidates.every(p => (p.turnsTaken || 0) >= 1)) {
//       if (!completedRound) {
//         setCompletedRound(true);
//         setShowEnd(true);
//         addMsg("AI Moderator", 99, "All speaking turns are complete. Great debate everyone!");
//       }
//       return;
//     }

//     // Prefer unspoken; exclude current speaker
//     const unspoken = candidates.filter(p => (p.turnsTaken || 0) === 0 && p.id !== activeSpeakerId);
//     const pool     = unspoken.length ? unspoken : candidates.filter(p => p.id !== activeSpeakerId);
//     const chosen   = randomPick(pool.length ? pool : candidates);
//     if (!chosen) return;

//     const isLocalSpeaker = chosen.id === 0;

//     setActiveSpeakerId(chosen.id);
//     setTurnHistory(h => [`${chosen.name} · ${reason}`, ...h].slice(0, 8));

//     // Step 1: Mute EVERYONE (including local) while AI announces
//     syncMicRef.current(false);
//     setParticipants(ps => ps.map(p => ({
//       ...p,
//       isMyTurn:    p.id === chosen.id,
//       isSpeaking:  false,
//       micMuted:    true,         // all muted until AI finishes speaking
//       handRaised:  p.id === chosen.id ? false : p.handRaised,
//       turnsTaken:  p.id === chosen.id ? (p.turnsTaken || 0) + 1 : (p.turnsTaken || 0),
//       energy:      p.id === chosen.id
//         ? Math.max(10, (p.energy ?? 70) - 8)
//         : Math.min(100, (p.energy ?? 70) + 3),
//     })));

//     const announcement = `${chosen.name}, you have the floor. Please begin your argument.`;
//     addMsg("AI Moderator", 99, announcement);

//     // Step 2: AI speaks. Only AFTER the voice callback fires do we open the mic.
//     speakModRef.current(announcement, () => {
//       // Step 3: AI done — now unmute the chosen speaker
//       if (isLocalSpeaker) {
//         syncMicRef.current(true);   // open local mic track
//       }
//       setParticipants(ps => ps.map(p => ({
//         ...p,
//         micMuted:   p.id !== chosen.id,   // only chosen speaker unmuted
//         isSpeaking: p.id === chosen.id,
//       })));

//       // Step 4: Audience reactions while speaker holds the floor
//       reactionTickerRef.current = setInterval(() => {
//         setParticipants(current => {
//           const audience = current.filter(p => p.id !== chosen.id && !p.isMed);
//           if (!audience.length) return current;
//           const fan   = randomPick(audience);
//           const emoji = randomPick(MULTI_REACTIONS);
//           emitTileReaction(chosen.id, emoji);
//           if (Math.random() > 0.6) {
//             addMsg(fan.name, fan.id, `${emoji} Good point, ${chosen.name}!`);
//           }
//           return current;
//         });
//       }, 3500);

//       // Step 5: For dummy (non-local) speakers, auto-advance after a realistic window
//       if (!isLocalSpeaker) {
//         const dummyLine = randomPick(AI_MULTI_LINES);
//         addMsg(chosen.name, chosen.id, dummyLine);
//         autoAdvanceRef.current = setTimeout(() => {
//           if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
//           setParticipants(ps => ps.map(p => ({
//             ...p,
//             micMuted:   true,
//             isSpeaking: false,
//             isMyTurn:   false,
//           })));
//           pickNextSpeaker("auto-next");
//         }, (14 + Math.floor(Math.random() * 8)) * 1000);
//       }
//     });
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [activeSpeakerId, completedRound, emitTileReaction, isMulti, participants, timeExpired]);

//   const pickNextRef = useRef(pickNextSpeaker);
//   useEffect(() => { pickNextRef.current = pickNextSpeaker; }, [pickNextSpeaker]);

//   // ── INIT (runs once) ──────────────────────────────────────────────────────
//   useEffect(() => {
//     if (initDoneRef.current) return;
//     initDoneRef.current = true;

//     if (isAI1v1) {
//       const greeting = `Welcome ${config.name}. I will argue the opposing position on: ${config.topic}. You have the floor first. Make your opening statement.`;
//       setTimeout(() => {
//         addMsg("AI Debater", 1, greeting);
//         updateP(1, { isAITyping: true });
//         speakDebaterRef.current(greeting, () => {
//           updateP(1, { isAITyping: false });
//           setWhoTurn("you");
//           updateP(0, { isMyTurn: true });
//           // Open local mic after AI greeting finishes
//           syncMicRef.current(true);
//           startNudge();
//         });
//       }, 800);
//     }

//     if (isMulti) {
//       const intro = `Welcome everyone to the debate on: ${config.topic}. I am your AI Moderator. I will call on each speaker by name. When I finish announcing your name, your microphone will open automatically. To pass your turn, simply mute yourself. Let us begin.`;
//       setTimeout(() => {
//         addMsg("AI Moderator", 99, intro);
//         // Speak intro, then chain into first speaker pick
//         speakModRef.current(intro, () => {
//           pickNextRef.current("opening");
//         });
//       }, 800);
//     }

//     return () => {
//       voiceEngine.cancel();
//       if (aiTimerRef.current)        clearTimeout(aiTimerRef.current);
//       if (nudgeTimerRef.current)     clearTimeout(nudgeTimerRef.current);
//       if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
//       if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);
//     };
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // ── NUDGE (1v1 only) ──────────────────────────────────────────────────────
//   function startNudge() {
//     if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
//     nudgeTimerRef.current = setTimeout(() => {
//       setNudge("💬 Your turn to argue!");
//       setTimeout(() => setNudge(null), 5000);
//     }, 10000);
//   }
//   function clearNudge() {
//     if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
//     setNudge(null);
//   }

//   // ── AI DEBATER RESPONSE (1v1) ─────────────────────────────────────────────
//   const triggerAI = useCallback(() => {
//     if (aiLocked) return;
//     setAiLocked(true);
//     clearNudge();
//     setWhoTurn("ai");
//     updateP(0, { isMyTurn: false });
//     updateP(1, { isAITyping: true, isSpeaking: false });

//     // Mute local mic while AI speaks
//     syncMicRef.current(false);

//     aiTimerRef.current = setTimeout(() => {
//       const response = randomPick(AI_LINES);
//       addMsg("AI Debater", 1, response);
//       setScores(s => ({
//         you: Math.min(s.you + Math.floor(Math.random() * 5), 100),
//         ai:  Math.min(s.ai  + Math.floor(Math.random() * 4), 100),
//       }));
//       setTranscript(t => {
//         if (t.length > 0 && t.length % 4 === 0) setPhaseIdx(i => Math.min(i + 1, PHASES.length - 1));
//         return t;
//       });

//       // Speak AI response; when done, re-open user mic
//       speakDebaterRef.current(response, () => {
//         setWhoTurn("you");
//         updateP(0, { isMyTurn: true });
//         setAiLocked(false);
//         syncMicRef.current(true);   // open user mic after AI finishes
//         startNudge();
//       });
//     }, 600 + Math.random() * 800);
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [aiLocked, updateP]);

//   // ── MIC TOGGLE ────────────────────────────────────────────────────────────
//   const toggleMic = () => {
//     // ── 1v1 ──────────────────────────────────────────────────────────────
//     if (isAI1v1) {
//       if (whoTurn !== "you") {
//         toast$("Wait for the AI to finish speaking.", "warn");
//         return;
//       }
//       const next = !micOn;
//       syncLocalMic(next);
//       // Muting = done speaking → trigger AI response
//       if (!next && !aiLocked) setTimeout(() => triggerAI(), 500);
//       return;
//     }

//     // ── Multi ─────────────────────────────────────────────────────────────
//     if (!isMulti) return;

//     if (aiIsSpeaking) {
//       toast$("Wait for the AI Moderator to finish.", "warn");
//       return;
//     }
//     if (activeSpeakerId !== 0) {
//       toast$("Only the current speaker can pass the turn.", "warn");
//       return;
//     }
//     if (!micOn) {
//       // Already muted — shouldn't normally be reachable
//       return;
//     }

//     // Muting = passing the turn
//     syncLocalMic(false);
//     setParticipants(ps => ps.map(p => ({
//       ...p,
//       micMuted:   true,
//       isSpeaking: false,
//       isMyTurn:   false,
//     })));
//     if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
//     if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);

//     addMsg("AI Moderator", 99, `${config.name} passed the turn.`);
//     // Small pause, then pick next
//     setTimeout(() => pickNextRef.current("manual-pass"), 600);
//   };

//   const toggleHand = () => {
//     const me = participants.find(p => p.isLocal);
//     updateP(0, { handRaised: !me?.handRaised });
//     if (!me?.handRaised) toast$("✋ Hand raised!", "warn");
//   };

//   function sendMsg(text: string) {
//     if (!text.trim()) return;
//     addMsg(config.name, 0, text.trim());
//     setChatInput("");
//     updateP(0, { isSpeaking: true });
//     setTimeout(() => updateP(0, { isSpeaking: false }), 1200);

//     if (isAI1v1) {
//       clearNudge();
//       // Sending a message counts as "speaking" → trigger AI
//       if (whoTurn === "you" && !aiLocked) setTimeout(() => triggerAI(), 400);
//     }

//     if (isMulti && Math.random() > 0.4) {
//       const line = randomPick(AI_MULTI_LINES);
//       setTimeout(() => {
//         addMsg("AI Moderator", 99, line);
//         speakModRef.current(line);
//       }, 1800);
//     }
//   }

//   function sendReaction(emoji: string) {
//     setShowReactions(false);
//     const targetId = isMulti ? (activeSpeakerId ?? 0) : 0;
//     emitTileReaction(targetId, emoji);
//   }

//   // ── ADMIT ─────────────────────────────────────────────────────────────────
//   function admitParticipant(id: number) {
//     const target = waitingRoom.find(p => p.id === id);
//     if (!target) return;
//     setWaitingRoom(w => w.filter(p => p.id !== id));
//     setParticipants(ps => [...ps, { ...target, id: Math.max(...ps.map(p => p.id)) + 1 }]);
//     setShowHostPopup(false);
//     addMsg("AI Moderator", 99, `${target.name} was admitted to the room.`);
//   }
//   function admitAll() { waitingRoom.forEach(p => admitParticipant(p.id)); setShowHostPopup(false); }

//   // ── END ───────────────────────────────────────────────────────────────────
//   function handleEnd() {
//     voiceEngine.cancel();
//     if (aiTimerRef.current)        clearTimeout(aiTimerRef.current);
//     if (nudgeTimerRef.current)     clearTimeout(nudgeTimerRef.current);
//     if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
//     if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);

//     // Stop local media tracks safely
//     participants.forEach(p => {
//       if (p.isLocal && p.stream instanceof MediaStream) {
//         p.stream.getTracks().forEach(t => t.stop());
//       }
//     });
//     if (config.stream instanceof MediaStream) {
//       config.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
//     }
//     if (recorder.isRecording) recorder.stop();

//     const verdict = isMulti ? buildMultiVerdict(participants) : null;
//     onEnd({
//       timer: elapsedTimer,
//       debateLimit: fmtClock(debateDurationSeconds),
//       mode: "debate", subMode,
//       topic: config.topic, subject: config.subject, unit: config.unit,
//       participants: participants.filter(p => !p.isAI && !p.isMed).length,
//       scores, recorder,
//       hasRecording: !!recorder.blob,
//       participantsList: participants,
//       transcript,
//       meetingEnded: true,
//       verdict,
//     });
//   }

//   // ── DERIVED ───────────────────────────────────────────────────────────────
//   const n = participants.length;
//   const gc = n <= 1 ? "vg-1" : n === 2 ? "vg-2" : "vg-4";
//   const fmt = (d: number) => new Date(d).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
//   const me = participants.find(p => p.isLocal);
//   const activeSpeaker = participants.find(p => p.id === activeSpeakerId);
//   const liveStudents  = participants.filter(p => !p.isAI && !p.isMed);
//   const leaderboard   = [...liveStudents]
//     .sort((a, b) => ((b.reactionsReceived||0)+(b.turnsTaken||0)) - ((a.reactionsReceived||0)+(a.turnsTaken||0)))
//     .slice(0, 5);

//   // Mic button label
//   const micBtnLabel = isMulti
//     ? activeSpeakerId === 0 && micOn ? "Pass Turn" : micOn ? "Live" : "Muted"
//     : micOn ? "Mute" : "Unmute";

//   const micBtnClass = micOn
//     ? (isMulti && activeSpeakerId === 0 ? "mic-live" : "on")
//     : "off";

//   return (
//     <div className="dp-room">
//       {recorder.isRecording && <div className="rec-overlay">⏺ REC {elapsedTimer}</div>}

//       {/* TOP BAR */}
//       <div className="room-bar">
//         <div className="room-logo"><div className="room-logo-ico">⚔️</div>DebateArena</div>
//         <div className="rbar-div" />
//         <div className="rbar-topic">
//           <strong>{config.subject && `${config.subject}${config.unit ? ` · ${config.unit}` : ""} · `}</strong>
//           {config.topic}
//         </div>
//         <div className="rbar-pill pill-timer">{debateTimer}</div>
//         {recorder.isRecording && <div className="rbar-pill pill-rec"><div className="pill-rec-dot" />REC</div>}
//         {isAI1v1 && (
//           <div className={`rbar-pill ${whoTurn === "you" ? "pill-turn-you" : "pill-turn-ai"}`}>
//             {whoTurn === "you" ? "🎤 Your Turn" : "🤖 AI Speaking…"}
//           </div>
//         )}
//         {isMulti && (
//           <div className={`rbar-pill ${aiIsSpeaking ? "pill-turn-ai" : "pill-turn-you"}`}>
//             {aiIsSpeaking
//               ? "🎙 AI Moderator Speaking…"
//               : activeSpeakerId === 0 && micOn
//                 ? "🎤 You're Live"
//                 : "🎙 AI Mediating"}
//           </div>
//         )}
//         <button className="rbar-end" onClick={() => setShowEnd(true)}>✕ End</button>
//       </div>

//       <div className="room-body">
//         <div className="grid-area">

//           {/* TILES */}
//           <div
//             className={`vid-grid ${gc}`}
//             style={isMulti ? { gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gridAutoRows:"minmax(220px, 1fr)" } : undefined}
//           >
//             {participants.map(p => (
//               <Tile
//                 key={p.id} p={p}
//                 reaction={tileReacts[p.id]}
//                 nudge={p.isLocal && nudge ? nudge : undefined}
//               />
//             ))}
//           </div>

//           {/* CONTROL BAR */}
//           <div className="ctrl-bar">
//             <div className="cg">
//               {/* Mic button — primary action */}
//               <button className={`cbtn ${micBtnClass}`} onClick={toggleMic}>
//                 <span className="cbtn-ico">{micOn ? "🎤" : "🔇"}</span>
//                 <span>{micBtnLabel}</span>
//               </button>

//               <div style={{ position:"relative" }}>
//                 <button className={`cbtn${showReactions ? " hi" : ""}`} onClick={() => setShowReactions(r => !r)}>
//                   <span className="cbtn-ico">😊</span><span>React</span>
//                 </button>
//                 {showReactions && (
//                   <div className="react-pop">
//                     {(isMulti ? MULTI_REACTIONS : REACTIONS).map(r => (
//                       <button key={r} className="react-emoji" onClick={() => sendReaction(r)}>{r}</button>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               <button className={`cbtn${me?.handRaised ? " amb" : ""}`} onClick={toggleHand}>
//                 <span className="cbtn-ico">✋</span>
//                 <span>{me?.handRaised ? "Lower" : "Raise"}</span>
//               </button>
//             </div>

//             <div className="cg">
//               {/* AI voice status indicator (non-interactive) */}
//               <button className={`cbtn${aiIsSpeaking ? " speaking" : ""}`} disabled style={{ cursor:"default" }}>
//                 <span className="cbtn-ico">🔊</span>
//                 <span>{aiIsSpeaking ? "AI Live" : "AI Voice"}</span>
//               </button>

//               <button
//                 className={`cbtn${recorder.isRecording ? " rec" : ""}`}
//                 onClick={() => recorder.isRecording
//                   ? (recorder.stop(), toast$("Recording stopped","warn"))
//                   : recorder.start(config.stream instanceof MediaStream ? config.stream : null)
//                       .then((ok: boolean) => ok ? toast$("🔴 Recording started","info") : toast$("Share screen to record","error"))
//                 }
//               >
//                 <span className="cbtn-ico">⏺</span>
//                 <span>{recorder.isRecording ? "Stop" : "Record"}</span>
//               </button>

//               <button className="cbtn em" onClick={() => setShowAnalysis(true)}>
//                 <span className="cbtn-ico">📊</span><span>Analysis</span>
//               </button>
//             </div>

//             <div className="cg">
//               <button className={`cbtn${panelTab === "people" ? " hi" : ""}`} onClick={() => setPanelTab(p => p === "people" ? null : "people")}>
//                 <span className="cbtn-ico">👥</span><span>People ({n})</span>
//               </button>
//               <button className={`cbtn${panelTab === "chat" ? " hi" : ""}`} onClick={() => setPanelTab(p => p === "chat" ? null : "chat")}>
//                 <span className="cbtn-ico">💬</span><span>Chat</span>
//               </button>
//               <button className={`cbtn${panelTab === "score" ? " hi" : ""}`} onClick={() => setPanelTab(p => p === "score" ? null : "score")}>
//                 <span className="cbtn-ico">🏆</span><span>{isMulti ? "Game" : "Score"}</span>
//               </button>
//               <button className="end-btn" onClick={() => setShowEnd(true)}>End</button>
//             </div>
//           </div>
//         </div>

//         {/* SIDE PANEL */}
//         {panelTab && (
//           <div className="side-panel">
//             {/* Multi-user info grid */}
//             {isMulti && panelTab !== "chat" && (
//               <div className="room-info-grid">
//                 <div className="room-info-card live">
//                   <div className="room-info-label">Floor Control</div>
//                   <div className="room-info-title">
//                     {aiIsSpeaking
//                       ? "AI Moderator speaking…"
//                       : activeSpeaker
//                         ? `${activeSpeaker.name} has the floor`
//                         : "Selecting speaker…"}
//                   </div>
//                   <div className="room-info-sub">
//                     {activeSpeakerId === 0 && micOn
//                       ? "🎤 You're live — mute yourself to pass the turn"
//                       : "Mic opens automatically after AI announces you"}
//                   </div>
//                 </div>
//                 <div className="room-info-card game">
//                   <div className="room-info-label">Session</div>
//                   <div className="room-chip-row">
//                     <span className="room-chip">Players: {liveStudents.length}</span>
//                     <span className="room-chip">Live reactions</span>
//                   </div>
//                 </div>
//                 <div className="room-info-card host">
//                   <div className="room-info-label">Host Control</div>
//                   <div className="host-popup-wrap">
//                     <button className="host-popup-btn" onClick={() => setShowHostPopup(v => !v)}>
//                       <span className="host-popup-dot" />
//                       <span>Host Admit {waitingRoom.length ? `(${waitingRoom.length})` : ""}</span>
//                     </button>
//                     {showHostPopup && (
//                       <div className="host-popup-panel">
//                         <div className="host-popup-head">
//                           <div>
//                             <div className="room-info-label" style={{ marginBottom:3 }}>Waiting Room</div>
//                             <div className="host-popup-title">
//                               {waitingRoom.length ? `${waitingRoom.length} student${waitingRoom.length > 1 ? "s" : ""} waiting` : "No one waiting"}
//                             </div>
//                           </div>
//                           <button className="host-popup-close" onClick={() => setShowHostPopup(false)}>×</button>
//                         </div>
//                         {waitingRoom.length > 0 ? (
//                           <>
//                             <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:8 }}>
//                               <button className="btn-s" style={{ fontSize:11,padding:"5px 10px" }} onClick={admitAll}>Admit all</button>
//                             </div>
//                             <div className="host-popup-list">
//                               {waitingRoom.map(p => (
//                                 <div key={p.id} className="host-popup-item">
//                                   <div className="p-av" style={{ background:(p.avatarColor||avColor(p.name))+"28",color:p.avatarColor||avColor(p.name) }}>{avInit(p.name)}</div>
//                                   <div className="host-popup-meta">
//                                     <div className="host-popup-name">{p.name}</div>
//                                     <div className="host-popup-note">Waiting</div>
//                                   </div>
//                                   <button className="btn-s" style={{ fontSize:11,padding:"5px 10px" }} onClick={() => admitParticipant(p.id)}>Admit</button>
//                                 </div>
//                               ))}
//                             </div>
//                           </>
//                         ) : (
//                           <div className="host-popup-sub">New join requests appear here.</div>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             )}

//             {!chatExpanded && (
//               <div className="panel-tabs-dark">
//                 {[
//                   { id:"people", ico:"👥", lbl:"People" },
//                   { id:"chat",   ico:"💬", lbl:"Chat"   },
//                   ...(isAI1v1 ? [{ id:"score", ico:"🏆", lbl:"Score" }] : [{ id:"score", ico:"🏆", lbl:"Game" }]),
//                 ].map(t => (
//                   <button key={t.id} className={`ptab${panelTab === t.id ? " active" : ""}`} onClick={() => setPanelTab(t.id)}>
//                     {t.ico}<span style={{ fontSize:8.5,display:"block" }}>{t.lbl}</span>
//                   </button>
//                 ))}
//                 <button className="ptab ptab-cls" onClick={() => setPanelTab(null)}>✕</button>
//               </div>
//             )}

//             {/* PEOPLE */}
//             {panelTab === "people" && (
//               <div className="pscroll">
//                 <div style={{ padding:"8px 10px 3px",fontSize:9.5,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:"rgba(255,255,255,.22)" }}>
//                   {n} in room
//                 </div>
//                 {isMulti && waitingRoom.length > 0 && (
//                   <div style={{ padding:"0 9px 10px" }}>
//                     <div style={{ padding:"10px 12px",borderRadius:12,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.16)" }}>
//                       <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
//                         <div style={{ fontSize:11.5,fontWeight:800,color:"#fde68a" }}>Waiting room</div>
//                         <button className="btn-s" style={{ fontSize:11,padding:"5px 10px" }} onClick={admitAll}>Admit all</button>
//                       </div>
//                       <div style={{ display:"flex",flexDirection:"column" as const,gap:6 }}>
//                         {waitingRoom.map(p => (
//                           <div key={p.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 9px",borderRadius:10,background:"rgba(255,255,255,.05)" }}>
//                             <div className="p-av" style={{ background:(p.avatarColor||avColor(p.name))+"28",color:p.avatarColor||avColor(p.name) }}>{avInit(p.name)}</div>
//                             <div style={{ flex:1 }}>
//                               <div style={{ fontSize:12,fontWeight:700,color:"#fff" }}>{p.name}</div>
//                               <div style={{ fontSize:10.5,color:"rgba(255,255,255,.45)" }}>Awaiting admission</div>
//                             </div>
//                             <button className="btn-s" style={{ fontSize:11,padding:"5px 10px" }} onClick={() => admitParticipant(p.id)}>Admit</button>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   </div>
//                 )}
//                 <div className="p-list">
//                   {participants.map(p => {
//                     const c = p.avatarColor || avColor(p.name);
//                     return (
//                       <div key={p.id} className={`p-row${p.isSpeaking ? " spk" : ""}`}>
//                         <div className="p-av" style={{ background:c+"28",color:c }}>
//                           {p.isAI ? "🤖" : p.isMed ? "🎙️" : avInit(p.name)}
//                         </div>
//                         <div className="p-info">
//                           <div className="p-name">
//                             {p.name}{p.isLocal ? " (You)" : ""}
//                             {p.isSpeaking ? " 🔊" : ""}
//                             {p.handRaised ? " ✋" : ""}
//                           </div>
//                           <div className="p-role">
//                             {p.isHost ? "👑 Host" : p.isMed ? "🎙️ Mediator" : p.isAI ? "🤖 AI" : "👤 Participant"}
//                           </div>
//                         </div>
//                         <span style={{ fontSize:12,color:p.micMuted ? "var(--red)" : "var(--em)" }}>
//                           {p.micMuted ? "🔇" : "🎤"}
//                         </span>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             )}

//             {/* CHAT */}
//             {panelTab === "chat" && (
//               <div style={{ display:"flex",flexDirection:"column" as const,height:"100%",minHeight:0 }}>
//                 <button className="chat-side-head" onClick={() => setChatExpanded(v => !v)}>
//                   <div>
//                     <div className="chat-side-title">Room Chat</div>
//                     <div className="chat-side-sub">{chatExpanded ? "Tap to restore sidebar" : "Tap to expand chat"}</div>
//                   </div>
//                   <span>{chatExpanded ? "Collapse" : "Expand"}</span>
//                 </button>
//                 <div className="pscroll" style={{ flex:1 }}>
//                   <div className="chat-msgs">
//                     {messages.length === 0 && (
//                       <div className="chat-empty">
//                         No messages yet.<br />
//                         {isAI1v1 ? "Type your argument — AI will respond!" : "Start the conversation!"}
//                       </div>
//                     )}
//                     {messages.map((m, i) => {
//                       const own = m.sender === config.name;
//                       const c   = COLORS[m.senderId % COLORS.length];
//                       return (
//                         <div key={i} className={`chat-msg${own ? " own" : ""}`}>
//                           {!own && <div className="chat-av-sm" style={{ background:c+"28",color:c }}>{m.sender[0]?.toUpperCase()}</div>}
//                           <div className="chat-bwrap">
//                             {!own && <span className="chat-sender">{m.sender}</span>}
//                             <div className={`chat-bubble ${own ? "bubble-own" : "bubble-o"}`}>{m.text}</div>
//                             <span className="chat-time">{fmt(m.time)}</span>
//                           </div>
//                         </div>
//                       );
//                     })}
//                     <div ref={chatEndRef} />
//                   </div>
//                 </div>
//                 <div className="chat-ia">
//                   <textarea
//                     className="chat-inp"
//                     placeholder={
//                       isAI1v1
//                         ? whoTurn === "you" ? "Type your argument…" : "AI is speaking…"
//                         : aiIsSpeaking ? "AI Moderator speaking…" : "Send a message…"
//                     }
//                     value={chatInput}
//                     onChange={e => setChatInput(e.target.value)}
//                     onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(chatInput); } }}
//                     rows={1}
//                     disabled={isAI1v1 && whoTurn === "ai"}
//                   />
//                   <button className="chat-send" onClick={() => sendMsg(chatInput)} disabled={isAI1v1 && whoTurn === "ai"}>➤</button>
//                 </div>
//               </div>
//             )}

//             {/* SCORE — 1v1 */}
//             {panelTab === "score" && isAI1v1 && (
//               <div className="pscroll">
//                 <div className="dp-wrap">
//                   <div className="turn-box">
//                     <div className="turn-label">Current Turn</div>
//                     <div className={`turn-ind ${whoTurn === "you" ? "your" : "ai"}`}>
//                       <div className="turn-dot" style={{ background: whoTurn === "you" ? "var(--em)" : "var(--vio)" }} />
//                       <div>
//                         <div className="turn-name">{whoTurn === "you" ? "Your Turn" : "AI Debater"}</div>
//                         <div className="turn-hint">
//                           {whoTurn === "you"
//                             ? micOn ? "🎤 Mic open — mute to pass" : "Speak or type your argument"
//                             : aiIsSpeaking ? "AI is speaking…" : "AI is formulating…"}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="score-card">
//                     <div className="sc-title">📊 Live Score</div>
//                     <div className="sc-row">
//                       <div className="sc-item"><div className="sc-val sc-u">{scores.you}</div><div className="sc-lbl">You</div></div>
//                       <div className="sc-vs">VS</div>
//                       <div className="sc-item"><div className="sc-val sc-a">{scores.ai}</div><div className="sc-lbl">AI</div></div>
//                     </div>
//                     <div className="sc-bar"><div className="sc-fill" style={{ width:`${(scores.you/(scores.you+scores.ai||1))*100}%` }} /></div>
//                   </div>
//                   <div className="phase-card">
//                     <div className="sc-title" style={{ marginBottom:6 }}>📋 Debate Phases</div>
//                     {PHASES.map((ph, i) => (
//                       <div key={i} className={`ph-step${i === phaseIdx ? " act" : ""}`}>
//                         <div className={`ph-num ${i < phaseIdx ? "ph-done" : i === phaseIdx ? "ph-act" : "ph-pend"}`}>
//                           {i < phaseIdx ? "✓" : i+1}
//                         </div>
//                         <span className="ph-lbl">{ph}</span>
//                       </div>
//                     ))}
//                     {phaseIdx < PHASES.length - 1 && (
//                       <button className="btn-p" style={{ marginTop:9,fontSize:11,padding:"7px" }} onClick={() => setPhaseIdx(i => Math.min(i+1, PHASES.length-1))}>Next Phase →</button>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* SCORE — Multi */}
//             {panelTab === "score" && isMulti && (
//               <div className="pscroll">
//                 <div className="dp-wrap">
//                   <div className="turn-box">
//                     <div className="turn-label">Floor Status</div>
//                     <div className="turn-ind your">
//                       <div className="turn-dot" style={{ background: aiIsSpeaking ? "var(--vio)" : "var(--em)" }} />
//                       <div>
//                         <div className="turn-name">
//                           {aiIsSpeaking
//                             ? "AI Moderator announcing…"
//                             : activeSpeaker
//                               ? `${activeSpeaker.name} is speaking`
//                               : "Selecting next speaker…"}
//                         </div>
//                         <div className="turn-hint">
//                           {activeSpeakerId === 0 && micOn
//                             ? "🎤 You're live — mute yourself to pass the turn"
//                             : aiIsSpeaking
//                               ? "Mic opens automatically when AI finishes"
//                               : "Mute yourself to pass the turn when done"}
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="score-card">
//                     <div className="sc-title">Leaderboard</div>
//                     <div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>
//                       {leaderboard.map((p, idx) => (
//                         <div key={p.id} style={{ display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)" }}>
//                           <div style={{ width:22,textAlign:"center" as const,fontSize:12,fontWeight:800,color:idx===0?"#fbbf24":"rgba(255,255,255,.65)" }}>{idx+1}</div>
//                           <div className="p-av" style={{ background:(p.avatarColor||avColor(p.name))+"28",color:p.avatarColor||avColor(p.name) }}>{avInit(p.name)}</div>
//                           <div style={{ flex:1 }}>
//                             <div style={{ fontSize:12,fontWeight:700,color:"#fff" }}>{p.name}</div>
//                             <div style={{ fontSize:10.5,color:"rgba(255,255,255,.45)" }}>Turns {p.turnsTaken||0} · Energy {p.energy||0}</div>
//                           </div>
//                           <div style={{ fontSize:12,fontWeight:800,color:"#a5b4fc" }}>{p.reactionsReceived||0} reacts</div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>

//                   <div className="phase-card">
//                     <div className="sc-title" style={{ marginBottom:6 }}>Turn History</div>
//                     <div style={{ display:"flex",flexDirection:"column" as const,gap:6 }}>
//                       {turnHistory.length === 0 && <div style={{ fontSize:11,color:"rgba(255,255,255,.45)" }}>No turns yet.</div>}
//                       {turnHistory.map((entry, idx) => (
//                         <div key={`${entry}-${idx}`} style={{ padding:"8px 10px",borderRadius:9,background:"rgba(255,255,255,.05)",fontSize:11.5,fontWeight:700,color:"#fff" }}>
//                           {entry}
//                         </div>
//                       ))}
//                     </div>
//                     <button className="btn-p" style={{ marginTop:9,fontSize:11,padding:"7px" }} onClick={() => pickNextRef.current("host-skip")}>
//                       Pick next random speaker
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* ANALYSIS MODAL */}
//       {showAnalysis && (
//         <div className="analysis-bg" onClick={() => setShowAnalysis(false)}>
//           <div className="analysis-box" onClick={e => e.stopPropagation()}>
//             <div className="analysis-head">
//               <div className="analysis-title">🏆 Debate Analysis</div>
//               <button style={{ width:26,height:26,borderRadius:7,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",cursor:"pointer",color:"rgba(255,255,255,.55)",fontSize:12 }} onClick={() => setShowAnalysis(false)}>✕</button>
//             </div>
//             <div className="analysis-body">
//               <div className="a-sec">
//                 <div className="a-sec-title">📌 Session</div>
//                 <div style={{ padding:"9px 12px",borderRadius:10,background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.18)",fontSize:13,fontWeight:700,color:"#fff",marginBottom:7 }}>
//                   "{config.topic}"
//                 </div>
//                 <div style={{ display:"flex",gap:6,flexWrap:"wrap" as const }}>
//                   {[`⏱ ${elapsedTimer}`,`⌛ ${debateTimer} left`,`👥 ${participants.filter(p=>!p.isAI&&!p.isMed).length} participant(s)`,`💬 ${transcript.length} exchanges`].map(t => (
//                     <span key={t} style={{ padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.55)" }}>{t}</span>
//                   ))}
//                 </div>
//               </div>
//               {isAI1v1 && (
//                 <div className="a-sec">
//                   <div className="a-sec-title">📊 Score</div>
//                   <div className="score-grid-3">
//                     <div className="score-box"><div className="score-box-val" style={{ color:"var(--sky)" }}>{scores.you}</div><div className="score-box-lbl">Your Score</div></div>
//                     <div className="score-box"><div className="score-box-val" style={{ color:"var(--vio)" }}>{scores.ai}</div><div className="score-box-lbl">AI Score</div></div>
//                     <div className="score-box"><div className="score-box-val" style={{ color:"var(--em)" }}>{Math.abs(scores.you-scores.ai)}</div><div className="score-box-lbl">Margin</div></div>
//                   </div>
//                   <div className="verdict-box" style={{ borderColor:scores.you>scores.ai?"rgba(16,185,129,.4)":"rgba(99,102,241,.4)",background:scores.you>scores.ai?"rgba(16,185,129,.07)":"rgba(99,102,241,.07)" }}>
//                     <div className="verdict-win" style={{ color:scores.you>scores.ai?"var(--em)":"var(--ind3)" }}>
//                       {scores.you > scores.ai ? "🥇 You Win!" : "🤖 AI Wins"}
//                     </div>
//                     <div className="verdict-lbl" style={{ color:"rgba(255,255,255,.5)" }}>Score: {Math.max(scores.you,scores.ai)} pts</div>
//                   </div>
//                 </div>
//               )}
//             </div>
//             <div className="analysis-foot">
//               <button className="btn-s" style={{ background:"rgba(255,255,255,.05)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.55)" }} onClick={() => setShowAnalysis(false)}>Close</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* END MODAL */}
//       {showEnd && (
//         <div className="overlay" onClick={() => setShowEnd(false)}>
//           <div className="modal dark" style={{ maxWidth:360 }} onClick={e => e.stopPropagation()}>
//             <div className="mh">
//               <span className="mh-title" style={{ color:"#fff" }}>End Debate?</span>
//               <button className="mh-close" style={{ borderColor:"rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)" }} onClick={() => setShowEnd(false)}>✕</button>
//             </div>
//             <div className="mb" style={{ textAlign:"center" as const,padding:"20px" }}>
//               <div style={{ fontSize:42,marginBottom:10 }}>🏁</div>
//               <div style={{ fontSize:14,fontWeight:800,color:"#fff",marginBottom:6 }}>
//                 {completedRound ? "All turns are finished." : "End this debate?"}
//               </div>
//               <div style={{ fontSize:12.5,color:"rgba(255,255,255,.4)",lineHeight:1.75 }}>
//                 Elapsed: <strong style={{ color:"var(--ind3)" }}>{elapsedTimer}</strong><br />
//                 Remaining: <strong style={{ color:"var(--amb)" }}>{debateTimer}</strong>
//                 {recorder.isRecording && <><br /><span style={{ color:"var(--em)" }}>✅ Recording will be saved</span></>}
//               </div>
//             </div>
//             <div className="mf">
//               <button className="btn-s" style={{ background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)" }} onClick={() => setShowEnd(false)}>
//                 {completedRound ? "Review Room" : "Keep Going"}
//               </button>
//               <button className="btn-d" onClick={handleEnd}>
//                 {completedRound ? "Show Results" : "End Debate"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//       {toastNode}
//     </div>
//   );
// }

// // ─── RESULTS ─────────────────────────────────────────────────────────────────
// function DebateResults({ result, onNew }: { result: any; onNew: () => void }) {
//   const verdict  = result.verdict;
//   const winner   = verdict?.winner;
//   const runnerUp = verdict?.runnerUp;
//   const insights = verdict?.insights || [];
//   return (
//     <div className="results-page">
//       <div className="res-trophy">🏆</div>
//       <h2 className="res-title">{result.meetingEnded ? "Session Ended" : "Debate Complete!"}</h2>
//       <p className="res-sub">
//         ⚔️ Session lasted <strong style={{ color:"var(--ind)" }}>{result.timer}</strong> with <strong>{result.participants}</strong> participant(s).
//         {" "}<span style={{ color:"var(--em)" }}>📅 Saved to Calendar.</span>
//       </p>
//       {result.subject && (
//         <div style={{ display:"flex",gap:8,marginBottom:14,flexWrap:"wrap" as const,justifyContent:"center" as const }}>
//           <span style={{ padding:"4px 12px",borderRadius:20,background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.18)",fontSize:11.5,fontWeight:700,color:"var(--ind)" }}>📚 {result.subject}</span>
//           {result.unit && <span style={{ padding:"4px 12px",borderRadius:20,background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.2)",fontSize:11.5,fontWeight:700,color:"var(--em)" }}>📖 {result.unit}</span>}
//         </div>
//       )}
//       <div className="res-stats">
//         {[
//           { l:"Duration",     v: result.timer,                i:"⏱️" },
//           { l:"Participants", v: result.participants,         i:"👥" },
//           { l:"Exchanges",    v: result.transcript?.length||0, i:"💬" },
//         ].map((s, i) => (
//           <div key={s.l} className="res-stat" style={{ animationDelay:`${i*.1}s` }}>
//             <div className="res-stat-ico">{s.i}</div>
//             <div className="res-stat-val">{s.v}</div>
//             <div className="res-stat-lbl">{s.l}</div>
//           </div>
//         ))}
//       </div>
//       {result.subMode === "multi" && winner && (
//         <>
//           <div className="res-verdict">
//             <div className="res-panel">
//               <div className="res-panel-title">AI Decision</div>
//               <div className="res-winner-name">{winner.name}</div>
//               <div className="res-winner-sub">Winner based on speaking consistency, audience reactions, and turn completion.</div>
//             </div>
//             <div className="res-panel">
//               <div className="res-panel-title">Top Rankings</div>
//               <div className="res-rank">
//                 <div className="res-rank-row">
//                   <div><div className="res-rank-name">{winner.name}</div><div className="res-rank-role">Winner</div></div>
//                   <div className="res-rank-score">{winner.debateScore}</div>
//                 </div>
//                 {runnerUp && (
//                   <div className="res-rank-row">
//                     <div><div className="res-rank-name">{runnerUp.name}</div><div className="res-rank-role">Runner-up</div></div>
//                     <div className="res-rank-score">{runnerUp.debateScore}</div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//           {insights.length > 0 && (
//             <div className="res-insights">
//               {insights.map((entry: string, idx: number) => (
//                 <div key={idx} className="res-insight">
//                   <div className="res-insight-title">Analysis {idx+1}</div>
//                   <div className="res-insight-text">{entry}</div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </>
//       )}
//       {result.subMode === "ai" && (
//         <div style={{ width:"100%",maxWidth:400,marginBottom:18 }}>
//           <div style={{ background:"var(--surf)",border:"1px solid var(--bdr)",borderRadius:18,padding:18,boxShadow:"var(--sh)" }}>
//             <div style={{ fontSize:12,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase" as const,color:"var(--t3)",marginBottom:10 }}>Final Score</div>
//             <div style={{ display:"flex",alignItems:"center",gap:16,justifyContent:"center" }}>
//               <div style={{ textAlign:"center" as const }}>
//                 <div style={{ fontSize:36,fontWeight:900,color:"var(--ind)" }}>{result.scores?.you || 0}</div>
//                 <div style={{ fontSize:11,color:"var(--t3)" }}>You</div>
//               </div>
//               <div style={{ fontSize:18,fontWeight:800,color:"var(--t4)" }}>VS</div>
//               <div style={{ textAlign:"center" as const }}>
//                 <div style={{ fontSize:36,fontWeight:900,color:"var(--vio)" }}>{result.scores?.ai || 0}</div>
//                 <div style={{ fontSize:11,color:"var(--t3)" }}>AI</div>
//               </div>
//             </div>
//             <div style={{ textAlign:"center" as const,marginTop:10,fontSize:15,fontWeight:800,color:(result.scores?.you||0) >= (result.scores?.ai||0) ? "var(--em)" : "var(--vio)" }}>
//               {(result.scores?.you||0) >= (result.scores?.ai||0) ? "🥇 You won the debate!" : "🤖 AI won this round!"}
//             </div>
//           </div>
//         </div>
//       )}
//       <div className="res-actions">
//         {result.hasRecording && <button className="btn-s" onClick={() => result.recorder?.download("debate.webm")}>📥 Download Recording</button>}
//         <button className="btn-p" style={{ fontSize:13,width:"auto",padding:"11px 24px" }} onClick={onNew}>⚔️ New Debate</button>
//       </div>
//     </div>
//   );
// }

// // ─── MAIN ─────────────────────────────────────────────────────────────────────
// type Screen = "setup"|"room"|"results";

// export default function DebatePage() {
//   const [screen, setScreen, clearScreen] = useSessionState<Screen>("dp-screen", "setup");
//   const [config, setConfig, clearConfig] = useSessionState<any>("dp-config", null);
//   const [result, setResult]   = useState<any>(null);
//   const [role,   setRole]     = useState("student");

//   return (
//     <>
//       <style>{CSS}</style>
//       <div className="dp-app">
//         <Navigation currentRole={role} onRoleChange={setRole} />
//         {screen === "setup" && (
//           <DebateSetup
//             onLaunch={cfg => { setConfig(cfg); setScreen("room"); }}
//           />
//         )}
//         {screen === "room" && config && (
//           <DebateRoom
//             config={config}
//             onEnd={res => { setConfig(null); setResult(res); setScreen("results"); }}
//           />
//         )}
//         {screen === "results" && result && (
//           <DebateResults
//             result={result}
//             onNew={() => { setResult(null); clearScreen(); clearConfig(); setScreen("setup"); }}
//           />
//         )}
//       </div>
//     </>
//   );
// }

import { useState, useEffect, useRef, useCallback } from "react";
import Navigation from "../components/navigation";
import { useAuth } from "../hooks/use-auth";
import { useSessionState } from "../hooks/useSessionState";

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
@keyframes countdownPulse{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}

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

/* ── MIC PERMISSION MODAL CARD ─────────────────────────────────────────── */
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

/* ── TEAM BADGES ─────────────────────────────────────────────────────────── */
.team-a-badge{background:rgba(99,102,241,.85);color:#fff;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:800;flex-shrink:0}
.team-b-badge{background:rgba(236,72,153,.85);color:#fff;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:800;flex-shrink:0}
.team-a-tile{box-shadow:0 0 0 2px #6366f1,0 0 22px rgba(99,102,241,.22)!important}
.team-b-tile{box-shadow:0 0 0 2px #ec4899,0 0 22px rgba(236,72,153,.22)!important}

/* ── COUNTDOWN OVERLAY ───────────────────────────────────────────────────── */
.countdown-overlay{position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(245,158,11,.92);border-radius:100px;padding:5px 13px;font-size:11px;font-weight:800;color:#000;white-space:nowrap;animation:countdownPulse 1s ease-in-out infinite;z-index:10}

/* ── TURN STATUS BAR ─────────────────────────────────────────────────────── */
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
.pill-team-a{background:rgba(99,102,241,.2);border:1px solid rgba(99,102,241,.4);color:#a5b4fc}
.pill-team-b{background:rgba(236,72,153,.2);border:1px solid rgba(236,72,153,.4);color:#f9a8d4}
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
.cbtn.locked{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.3);color:var(--amb)}
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
  .analysis-bg{align-items:flex-end;padding:0}.analysis-box{border-radius:16px 16px 0 0;max-height:92dvh}
  .overlay{align-items:flex-end;padding:0}.modal{border-radius:16px 16px 0 0;max-height:90dvh}
  .vg-3,.vg-4{grid-template-columns:1fr 1fr}
  .res-verdict,.res-insights{grid-template-columns:1fr}
}
@media(max-width:560px){.cbtn span:last-child{display:none}.cbtn{min-width:32px}.tile{min-height:160px}.team-member-grid{grid-template-columns:1fr}.res-actions{flex-direction:column;align-items:stretch}}
`;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const COLORS = ["#6366f1","#10b981","#f59e0b","#38bdf8","#ec4899","#8b5cf6","#f97316","#06b6d4"];
const PHASES = ["Opening Statements","Cross-Examination","Rebuttal Round","Closing Arguments"];
const REACTIONS = ["👍","👏","❤️","😂","🔥","🤔","🎓","✨"];
const MANDATORY_SPEAK_SECONDS = 10; // must speak for at least 10s before mute is allowed

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

const TOPICS = [
  "AI will replace most human jobs within 20 years",
  "Social media does more harm than good",
  "Nuclear energy is essential for climate change",
  "Universal basic income should be implemented",
  "Space exploration is worth the investment",
  "Animal testing should be banned",
  "Coding should be mandatory in all schools",
  "Democracy is the best form of government",
];

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
const genRoomLink = (id: string) => `${window.location.origin}/debate/join?room=${id}`;
const COMMUNITY_SESSIONS_KEY = "gradeup_community_sessions_v1";

function publishCommunitySession(session: any) {
  try {
    const prev = JSON.parse(localStorage.getItem(COMMUNITY_SESSIONS_KEY) || "[]");
    const next = [session, ...prev.filter((s: any) => s.id !== session.id)].slice(0, 20);
    localStorage.setItem(COMMUNITY_SESSIONS_KEY, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent("storage", { key: COMMUNITY_SESSIONS_KEY }));
  } catch {}
}
const MULTI_REACTIONS = ["👏","🔥","💡","🙌","🎯","⚡","🚀","🏆","🧠","💯","📣","🌟"];
const DUMMY_STUDENTS = [
  "Aarav Shah","Diya Kapoor","Rohan Iyer","Meera Nair","Kabir Singh","Anaya Das",
  "Vivaan Patel","Ishita Rao","Arjun Menon","Sara Khan","Neel Joshi","Tara Mehta",
];
const randomPick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

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
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const rafRef = useRef<number>(0);

  async function request() {
    setState("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setStream(s);
      setState("granted");
      // Set up analyser for mic level visualisation
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(s);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;
        const tick = () => {
          const arr = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(arr);
          const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
          setMicLevel(Math.min(100, (avg / 128) * 100));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {}
      return s;
    } catch {
      setState("denied");
      return null;
    }
  }

  function stop() {
    cancelAnimationFrame(rafRef.current);
    analyserRef.current = null;
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setState("idle");
    setMicLevel(0);
  }

  return { state, stream, micLevel, request, stop };
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
const voiceEngine = (() => {
  let currentId = "";
  let speaking = false;
  let cancelled = false;
  let voiceRef: SpeechSynthesisVoice | null = null;
  let runToken = 0;
  let lastTextKey = "";
  let lastTextAt = 0;

  function pickVoice() {
    const voices = window.speechSynthesis?.getVoices() || [];
    const preferred = [
      "Microsoft Aria Online (Natural)","Microsoft Jenny Online (Natural)",
      "Microsoft Guy Online (Natural)","Google US English","Google UK English Female",
      "Google UK English Male","Samantha","Karen","Moira","Daniel","Alex",
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

  function speak(text: string, id: string, opts: { pitch?: number; rate?: number }, onStart?: () => void, onDone?: () => void) {
    if (!("speechSynthesis" in window)) { onDone?.(); return; }
    const textKey = text.replace(/\s+/g, " ").trim().toLowerCase();
    const now = Date.now();
    if ((currentId === id && speaking) || (textKey && textKey === lastTextKey && now - lastTextAt < 2500)) return;
    lastTextKey = textKey;
    lastTextAt = now;
    const token = ++runToken;
    cancelled = false;
    currentId = id;
    window.speechSynthesis.cancel();
    function finish() {
      if (token !== runToken) return;
      speaking = false;
      if (!cancelled) onDone?.();
    }
    function start() {
      if (cancelled || token !== runToken) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate ?? 0.92; u.pitch = opts.pitch ?? 1.0; u.volume = 1;
      u.lang = voiceRef?.lang || "en-US";
      if (voiceRef) u.voice = voiceRef;
      u.onstart = () => { if (!cancelled) { speaking = true; onStart?.(); } };
      u.onend = finish;
      u.onerror = (e: SpeechSynthesisErrorEvent) => {
        if (e.error === "interrupted" || e.error === "canceled") { speaking = false; return; }
        finish();
      };
      try { window.speechSynthesis.resume(); window.speechSynthesis.speak(u); } catch { finish(); }
    }
    setTimeout(start, 180);
  }

  function cancel() { cancelled = true; speaking = false; currentId = ""; runToken++; window.speechSynthesis?.cancel(); }

  if (typeof window !== "undefined") {
    setInterval(() => { if (window.speechSynthesis && !window.speechSynthesis.speaking) window.speechSynthesis.resume(); }, 10000);
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

// ─── MIC PERMISSION CARD (used in setup confirm modal) ───────────────────────
function MicPermCard({ perm, stream, micLevel, micOn, onRequest, onToggle }: {
  perm: "idle"|"requesting"|"granted"|"denied";
  stream: MediaStream | null;
  micLevel: number;
  micOn: boolean;
  onRequest: () => void;
  onToggle: () => void;
}) {
  const statusLabels = {
    idle:       { label: "Microphone permission required", hint: "Click Allow Mic to grant access before joining" },
    requesting: { label: "Requesting microphone access…",  hint: "Please allow access in your browser prompt" },
    granted:    { label: "Microphone ready",               hint: "Your mic is connected and ready for the debate" },
    denied:     { label: "Microphone access denied",       hint: "Allow mic in browser settings and click Retry" },
  };
  const { label, hint } = statusLabels[perm];

  return (
    <div className="mic-perm-card">
      <div className="mic-perm-header">
        <div className="mic-perm-icon">🎤</div>
        <div>
          <div className="mic-perm-title">Microphone Setup</div>
          <div className="mic-perm-sub">Required before entering the debate room</div>
        </div>
      </div>

      <div className={`mic-perm-status ${perm}`}>
        <div className="mic-perm-dot" />
        <div style={{ flex: 1 }}>
          <div className="mic-perm-label">{label}</div>
          <div className="mic-perm-hint">{hint}</div>
        </div>
        {perm === "idle" && (
          <button className="mic-perm-action allow" onClick={onRequest}>Allow Mic</button>
        )}
        {perm === "requesting" && (
          <button className="mic-perm-action allow" disabled>
            <span className="loader-spin" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 4 }} />
            Waiting…
          </button>
        )}
        {perm === "denied" && (
          <button className="mic-perm-action retry" onClick={onRequest}>Retry</button>
        )}
      </div>

      {perm === "denied" && (
        <div className="mic-perm-warn">
          ⚠️ Open your browser's site settings, allow microphone access for this page, then click Retry.
        </div>
      )}

      {perm === "granted" && stream && (
        <>
          <div className="mic-level-row">
            <span className="mic-level-label">Mic level</span>
            <div className="mic-level-track">
              <div className="mic-level-fill" style={{ width: `${micLevel}%` }} />
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)", minWidth: 26, textAlign: "right" as const }}>
              {Math.round(micLevel)}%
            </span>
          </div>
          <div className="mic-toggle-row">
            <span className="mic-toggle-label">{micOn ? "🎤 Mic is on — will be active in room" : "🔇 Mic is off — you'll join muted"}</span>
            <button className={`mic-toggle-btn ${micOn ? "on" : "off"}`} onClick={onToggle}>
              {micOn ? "On" : "Off"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

function DebateLoadingScreen({ title, subtitle, progress }: { title: string; subtitle: string; progress?: number }) {
  return (
    <div className="debate-loader-screen">
      <div className="debate-loader-card">
        <div className="debate-loader-ring" />
        <div className="debate-loader-title">{title}</div>
        <div className="debate-loader-sub">{subtitle}</div>
        <div className="debate-loader-bar">
          <div className="debate-loader-fill" style={{ width: `${Math.max(8, Math.min(100, progress ?? 65))}%` }} />
        </div>
      </div>
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
  // ── Team debate fields ──
  team?: Team;
  teamOrder?: number;
  hasSpoken?: boolean; // true after first completed speaking turn
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

function Tile({ p, reaction, nudge, countdown }: { p: Participant; reaction?: any; nudge?: string; countdown?: number | null }) {
  const vRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (vRef.current && p.stream instanceof MediaStream) vRef.current.srcObject = p.stream; }, [p.stream]);
  const color = p.avatarColor || avColor(p.name);

  // tile border class based on team
  const teamClass = p.team === "A" ? "team-a-tile" : p.team === "B" ? "team-b-tile" : "";
  const tileClass = `tile${p.isSpeaking ? " spk" : ""}${p.team ? " "+teamClass : ""}`;

  return (
    <div className={tileClass}>
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

      {/* Countdown overlay — shown while mandatory window is active */}
      {countdown != null && countdown > 0 && (
        <div className="countdown-overlay">
          🔒 Mute unlocks in {countdown}s
        </div>
      )}

      {p.isMyTurn && !p.micMuted && countdown == null && (
        <div className="tile-turn">🎤 Speaking</div>
      )}
      {p.isMyTurn && p.micMuted && !p.isAI && !p.isMed && countdown == null && (
        <div className="tile-turn" style={{ background:"rgba(99,102,241,.88)" }}>🎙 Your Turn Soon</div>
      )}
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
          {p.team === "A" && <span className="team-a-badge">Team A</span>}
          {p.team === "B" && <span className="team-b-badge">Team B</span>}
          {p.isHost  && <span className="t-badge t-host">HOST</span>}
          {p.isAI && !p.isMed && <span className="t-badge t-ai">AI</span>}
          {p.isMed   && <span className="t-badge t-med">MED</span>}
          {p.isLocal && !p.isHost && <span className="t-badge t-you">You</span>}
          {p.hasSpoken && !p.isMyTurn && (
            <span style={{ fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:20,background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)" }}>Done</span>
          )}
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

function createDummyStudents(startId = 10, count = 10): Participant[] {
  return shuffle(DUMMY_STUDENTS).slice(0, count).map((name, idx) => ({
    id: startId + idx,
    name,
    stream: null,
    isStudent: true,
    micMuted: true,
    camOn: false,
    isSpeaking: false,
    handRaised: Math.random() > 0.75,
    avatarColor: COLORS[(idx + 1) % COLORS.length],
    energy: 55 + Math.floor(Math.random() * 40),
    reactionsReceived: 0,
    turnsTaken: 0,
    hasSpoken: false,
    team: undefined,
  }));
}

// Assign teams: shuffle non-AI/non-med participants, split evenly into A and B
function assignTeams(participants: Participant[]): Participant[] {
  const humans = participants.filter(p => !p.isAI && !p.isMed);
  const shuffled = shuffle(humans);
  const half = Math.ceil(shuffled.length / 2);
  const teamA = shuffled.slice(0, half);
  const teamB = shuffled.slice(half);
  const teamAOrder = new Map(teamA.map((p, idx) => [p.id, idx]));
  const teamBOrder = new Map(teamB.map((p, idx) => [p.id, idx]));
  return participants.map(p => ({
    ...p,
    team: p.isAI || p.isMed ? undefined : (teamAOrder.has(p.id) ? "A" : "B"),
    teamOrder: p.isAI || p.isMed ? undefined : (teamAOrder.get(p.id) ?? teamBOrder.get(p.id) ?? 0),
  }));
}

function buildMultiVerdict(list: Participant[]) {
  const ranked = [...list]
    .filter(p => !p.isAI && !p.isMed)
    .map(p => ({
      ...p,
      debateScore: (p.turnsTaken || 0) * 6 + (p.reactionsReceived || 0) * 4 + Math.round((p.energy || 0) / 8),
    }))
    .sort((a, b) => (b.debateScore || 0) - (a.debateScore || 0));
  const winner   = ranked[0] || null;
  const runnerUp = ranked[1] || null;

  // Team scores
  const teamAScore = ranked.filter(p => p.team === "A").reduce((s, p) => s + (p.debateScore || 0), 0);
  const teamBScore = ranked.filter(p => p.team === "B").reduce((s, p) => s + (p.debateScore || 0), 0);
  const winnerTeam: Team | null = teamAScore > teamBScore ? "A" : teamBScore > teamAScore ? "B" : null;

  const insights = winner ? [
    `${winner.name} (Team ${winner.team}) held the strongest audience response with ${winner.reactionsReceived || 0} reactions.`,
    `Team ${winnerTeam ?? "—"} scored ${winnerTeam === "A" ? teamAScore : teamBScore} pts vs Team ${winnerTeam === "A" ? "B" : "A"}'s ${winnerTeam === "A" ? teamBScore : teamAScore} pts.`,
    runnerUp
      ? `${runnerUp.name} (Team ${runnerUp.team}) was runner-up with ${runnerUp.debateScore} pts.`
      : "No runner-up available in this session.",
  ] : [];
  return { ranked, winner, runnerUp, insights, teamAScore, teamBScore, winnerTeam };
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
      const ev = { id:`db-${Date.now()}`,title:config?.topic||"Debate",type:"debate",date,startTime:time,subject:config?.subject||"",unit:config?.unit||"",link:config?.roomLink||"" };
      const ex = JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");
      localStorage.setItem("gradeup_cal_events_v3", JSON.stringify([...ex, ev]));
      window.dispatchEvent(new StorageEvent("storage", { key:"gradeup_cal_events_v3" }));
      publishCommunitySession({
        id: ev.id,
        type: "debate",
        title: ev.title,
        subject: ev.subject,
        unit: ev.unit,
        date,
        time,
        link: ev.link,
        roles: ["Observer", "Participant"],
        createdAt: new Date().toISOString(),
      });
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
  const [subject, setSubject]     = useState("");
  const [unit, setUnit]           = useState("");
  const [topic, setTopic]         = useState("");
  const [custom, setCustom]       = useState("");
  const [micOn, setMicOn]         = useState(true);
  const [debateMinutes, setDebateMinutes] = useState("5");
  const [showSchedule, setShowSchedule]   = useState(false);
  const [scheduled, setScheduled]         = useState(false);
  const [scheduledInfo, setScheduledInfo] = useState<any>(null);
  const [copied, setCopied]       = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [joining, setJoining]     = useState(false);
  const [joinProgress, setJoinProgress]   = useState(0);
  const roomId   = useRef(genRoomId());
  const roomLink = genRoomLink(roomId.current);
  const { state: perm, stream, micLevel, request, stop } = useMicPerm();
  const { show: toast$, node: toastNode } = useToast();
  const finalTopic     = topic === "__custom__" ? custom : topic;
  const availableUnits = subject ? SUBJECT_UNITS[subject] || [] : [];

  const steps = [
    { label:"Enter your name",         done: name.trim().length > 0 },
    { label:"Select subject",          done: !!subject },
    { label:"Select unit",             done: !!unit },
    { label:"Select topic",            done: !!finalTopic },
    { label:"Choose debate type",      done: !!subMode },
    { label:"Instant or schedule",     done: !!debateType },
    ...(subMode === "multi" ? [] : [{ label:"Set debate timer", done: !!debateMinutes }]),
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
      const ev = { id:`db-${Date.now()}`,title:finalTopic,type:"debate",date:new Date().toISOString().slice(0,10),startTime:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),subject,unit };
      const ex = JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");
      localStorage.setItem("gradeup_cal_events_v3", JSON.stringify([...ex, ev]));
      window.dispatchEvent(new StorageEvent("storage", { key:"gradeup_cal_events_v3" }));
    } catch {}
    for (let p = 0; p <= 100; p += 20) { await new Promise(r => setTimeout(r, 180)); setJoinProgress(p); }
    setJoining(false); setShowConfirm(false); setJoinProgress(0);
    onLaunch({
      name, mode:"debate", subMode, subject, unit,
      topic: finalTopic, stream, micOn, camOn: false,
      invitees: [], roomId: roomId.current, roomLink,
      debateMinutes: Number(debateMinutes),
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
             subMode === "multi" ? "Team A vs Team B · AI mediates · Group analysis report" :
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
              {subject  && <div className="ctx-card-val">📚 {subject}{unit ? ` · ${unit}` : ""}</div>}
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

            <div className="sec-div">Identity</div>
            <div className="fi">
              <label className="fl">Your Name</label>
              <input className="finput" placeholder="e.g. Alex Chen" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
            </div>

            <div className="sec-div">Academic Context</div>
            <div className="fi-row fi">
              <div>
                <label className="fl">Subject</label>
                <select className="finput" value={subject} onChange={e => { setSubject(e.target.value); setUnit(""); }}>
                  <option value="">Select subject…</option>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="fl">Unit / Module</label>
                <select className="finput" value={unit} onChange={e => setUnit(e.target.value)} disabled={!subject}>
                  <option value="">{subject ? "Select unit…" : "Select subject first"}</option>
                  {availableUnits.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="sec-div">Topic</div>
            <div className="fi">
              <label className="fl">Debate Topic</label>
              <select className="finput" value={topic} onChange={e => setTopic(e.target.value)}>
                <option value="">Select a topic…</option>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
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
                { id:"multi", ico:"👥", t:"Team A vs B",  d:"AI assigns teams automatically. Strict alternating turns with one-time participation.", badge:"" },
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
            {subMode !== "multi" && (
              <div className="fi">
                <label className="fl">Debate Duration</label>
                <select className="finput" value={debateMinutes} onChange={e => setDebateMinutes(e.target.value)}>
                  {[2,5,10,15,20].map(min => <option key={min} value={String(min)}>{min} minutes</option>)}
                </select>
              </div>
            )}
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
                <button className="share-btn" onClick={() => { navigator.clipboard.writeText(roomLink); toast$("Link copied!","info"); }}>📧 Email</button>
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
          config={{ topic: finalTopic, subject, unit, roomLink }}
          onSchedule={(info: any) => { setScheduledInfo(info); setScheduled(true); setShowSchedule(false); toast$("📅 Debate scheduled!","success"); }}
          onClose={() => setShowSchedule(false)}
        />
      )}

      {/* ── CONFIRM MODAL — includes MicPermCard ── */}
      {showConfirm && (
        <div className="overlay">
          <div className="modal dark" style={{ maxWidth:440 }}>
            <div className="mh">
              <span className="mh-title" style={{ color:"#fff" }}>⚔️ Ready to Enter?</span>
              <button className="mh-close" style={{ borderColor:"rgba(255,255,255,.1)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)" }} onClick={() => setShowConfirm(false)}>✕</button>
            </div>
            <div className="mb" style={{ padding:"16px 20px" }}>
              {/* Session summary */}
              <div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:13,background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.18)",marginBottom:14 }}>
                <div style={{ width:46,height:46,borderRadius:"50%",background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>⚔️</div>
                <div>
                  <div style={{ fontSize:14,fontWeight:800,color:"#fff" }}>{name}</div>
                  <div style={{ fontSize:11.5,color:"rgba(255,255,255,.5)" }}>
                    {subMode === "ai" ? "1v1 vs AI Debate" : "Team A vs B Debate"}
                    {subject ? ` · ${subject}` : ""}
                    {unit ? ` · ${unit}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ padding:"9px 12px",borderRadius:10,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",marginBottom:14,fontSize:12.5,fontWeight:700,color:"rgba(255,255,255,.8)" }}>
                💬 "{finalTopic}"
              </div>

              {/* ── MIC PERMISSION CARD ── */}
              <MicPermCard
                perm={perm}
                stream={stream}
                micLevel={micLevel}
                micOn={micOn}
                onRequest={request}
                onToggle={() => {
                  const n = !micOn;
                  setMicOn(n);
                  stream?.getAudioTracks().forEach(t => { t.enabled = n; });
                }}
              />

              {subMode === "multi" && (
                <div style={{ padding:"9px 12px",borderRadius:10,background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.2)",fontSize:11.5,color:"rgba(255,255,255,.65)",lineHeight:1.6 }}>
                  🎯 You'll be auto-assigned to <strong style={{ color:"#a5b4fc" }}>Team A</strong> or <strong style={{ color:"#f9a8d4" }}>Team B</strong> by the AI Moderator. Each speaker must speak for <strong style={{ color:"var(--em)" }}>10 seconds</strong> before they can mute and pass the turn.
                </div>
              )}
            </div>
            <div className="mf" style={{ flexDirection:"column" as const, gap:8, borderColor:"rgba(255,255,255,.08)" }}>
              <button
                className="btn-p"
                onClick={handleJoin}
                disabled={joining || perm !== "granted"}
                style={{ fontSize:14 }}
              >
                {joining
                  ? <><span className="loader-spin" />Joining {joinProgress > 0 ? `${joinProgress}%` : "…"}</>
                  : perm !== "granted"
                    ? "🎤 Allow Mic to Continue"
                    : "⚔️ Enter Debate Room"
                }
              </button>
              {joinProgress > 0 && <div className="lo-progress"><div className="lo-progress-fill" style={{ width:`${joinProgress}%` }} /></div>}
              <button className="btn-s" onClick={() => setShowConfirm(false)} disabled={joining}
                style={{ width:"100%",justifyContent:"center" as const,background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)" }}>
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

// ─── ROOM ────────────────────────────────────────────────────────────────────
function DebateRoom({ config, onEnd }: { config: any; onEnd: (r: any) => void }) {
  const { subMode } = config;
  const isAI1v1 = subMode === "ai";
  const isMulti = subMode === "multi";

  // ── PARTICIPANTS ─────────────────────────────────────────────────────────
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const list: Participant[] = [];
    const localStream = config.stream instanceof MediaStream ? config.stream : null;
    list.push({
      id: 0, name: config.name, stream: localStream,
      isLocal: true, isHost: true, isStudent: true,
      micMuted: isMulti ? true : !config.micOn, camOn: false,
      isSpeaking: false, handRaised: false,
      isMyTurn: isAI1v1,
      avatarColor: COLORS[0], energy: 88, reactionsReceived: 0, turnsTaken: 0,
      hasSpoken: false, team: undefined,
    });
    if (isAI1v1) {
      list.push({ id:1, name:"AI Debater", stream:null, isAI:true, micMuted:false, camOn:false, isSpeaking:false, handRaised:false, avatarColor:"#8b5cf6" });
    }
    if (isMulti) {
      list.push({ id:99, name:"AI Moderator", stream:null, isAI:true, isMed:true, micMuted:false, camOn:false, isSpeaking:false, handRaised:false, avatarColor:"#38bdf8", energy:100, reactionsReceived:0, turnsTaken:0 });
      list.push(...createDummyStudents(10, 11));
    }
    return list;
  });

  // ── STATE ────────────────────────────────────────────────────────────────
  const [micOn, setMicOn]                 = useState(config.micOn !== false);
  const [panelTab, setPanelTab]           = useState<string|null>(isMulti ? "people" : null);
  const [messages, setMessages]           = useState<any[]>([]);
  const [showEnd, setShowEnd]             = useState(false);
  const [showAnalysis, setShowAnalysis]   = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [chatExpanded, setChatExpanded]   = useState(false);
  const [scores, setScores]               = useState({ you:40, ai:38 });
  const [phaseIdx, setPhaseIdx]           = useState(0);
  const [whoTurn, setWhoTurn]             = useState<"you"|"ai">("you");
  const [aiLocked, setAiLocked]           = useState(false);
  const [nudge, setNudge]                 = useState<string|null>(null);
  const [tileReacts, setTileReacts]       = useState<Record<number,any>>({});
  const [chatInput, setChatInput]         = useState("");
  const [transcript, setTranscript]       = useState<any[]>([]);
  const [waitingRoom, setWaitingRoom]     = useState<Participant[]>(() => isMulti ? createDummyStudents(110, 4) : []);
  const [showHostPopup, setShowHostPopup] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<number|null>(null);
  const [turnHistory, setTurnHistory]     = useState<string[]>([]);
  const [completedRound, setCompletedRound] = useState(false);
  const [timeExpired, setTimeExpired]     = useState(false);
  const [aiIsSpeaking, setAiIsSpeaking]   = useState(false);
  const [teamsAssigned, setTeamsAssigned] = useState(false);

  // ── TEAM TURN TRACKING ───────────────────────────────────────────────────
  // Which team's turn is it right now (multi only)
  const [currentTeamTurn, setCurrentTeamTurn] = useState<Team>("A");
  // Countdown seconds remaining in mandatory speaking window (null = no countdown)
  const [speakCountdown, setSpeakCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chatEndRef        = useRef<HTMLDivElement>(null);
  const nudgeTimerRef     = useRef<ReturnType<typeof setTimeout>|null>(null);
  const aiTimerRef        = useRef<ReturnType<typeof setTimeout>|null>(null);
  const reactionTickerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const autoAdvanceRef    = useRef<ReturnType<typeof setTimeout>|null>(null);
  const initDoneRef       = useRef(false);

  const { elapsedSeconds, label: elapsedTimer } = useTimer(true);
  const debateDurationSeconds = Math.max(60, Number(config.debateMinutes || 5) * 60);
  const remainingSeconds = Math.max(0, debateDurationSeconds - elapsedSeconds);
  const debateTimer = fmtClock(remainingSeconds);
  const recorder = useRecorder();
  const { show: toast$, node: toastNode } = useToast();

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  // ── HELPERS ──────────────────────────────────────────────────────────────
  const updateP = useCallback((id: number, patch: Partial<Participant>) =>
    setParticipants(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p)), []);

  const syncLocalMic = useCallback((enabled: boolean) => {
    const localStream = config.stream;
    if (localStream instanceof MediaStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = enabled; });
    }
    setMicOn(enabled);
    updateP(0, { micMuted: !enabled, isSpeaking: enabled });
  }, [config.stream, updateP]);

  function addMsg(sender: string, senderId: number, text: string) {
    const e = { sender, senderId, text, time: Date.now() };
    setMessages(ms => [...ms, e]);
    setTranscript(t => [...t, e]);
  }

  const emitTileReaction = useCallback((targetId: number, emoji: string) => {
    const k = Date.now() + Math.random();
    setTileReacts(tr => ({ ...tr, [targetId]: { emoji, key: k } }));
    setParticipants(ps => ps.map(p => p.id === targetId ? { ...p, reactionsReceived:(p.reactionsReceived||0)+1 } : p));
    setTimeout(() => setTileReacts(tr => { const next = { ...tr }; delete next[targetId]; return next; }), 1900);
  }, []);

  // ── SPEAK HELPERS ────────────────────────────────────────────────────────
  const speakModerator = useCallback((text: string, onDone?: () => void) => {
    const id = `mod-${Date.now()}`;
    updateP(99, { isSpeaking: true });
    setAiIsSpeaking(true);
    voiceEngine.speak(text, id, { pitch: 1.1, rate: 0.88 },
      () => { updateP(99, { isSpeaking: true }); setAiIsSpeaking(true); },
      () => { updateP(99, { isSpeaking: false }); setAiIsSpeaking(false); onDone?.(); },
    );
  }, [updateP]);

  const speakDebater = useCallback((text: string, onDone?: () => void) => {
    const id = `deb-${Date.now()}`;
    updateP(1, { isSpeaking: true, isAITyping: false });
    setAiIsSpeaking(true);
    voiceEngine.speak(text, id, { pitch: 0.95, rate: 0.94 },
      () => { updateP(1, { isSpeaking: true }); setAiIsSpeaking(true); },
      () => { updateP(1, { isSpeaking: false }); setAiIsSpeaking(false); onDone?.(); },
    );
  }, [updateP]);

  const speakModRef     = useRef(speakModerator);
  const speakDebaterRef = useRef(speakDebater);
  const syncMicRef      = useRef(syncLocalMic);
  useEffect(() => { speakModRef.current     = speakModerator;  }, [speakModerator]);
  useEffect(() => { speakDebaterRef.current = speakDebater;    }, [speakDebater]);
  useEffect(() => { syncMicRef.current      = syncLocalMic;    }, [syncLocalMic]);

  // ── MANDATORY COUNTDOWN ──────────────────────────────────────────────────
  // Starts a 10s countdown; mute button is locked until it hits 0
  const startMandatoryWindow = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setSpeakCountdown(MANDATORY_SPEAK_SECONDS);
    let remaining = MANDATORY_SPEAK_SECONDS;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setSpeakCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current!);
        countdownIntervalRef.current = null;
        setSpeakCountdown(null);
      }
    }, 1000);
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = null;
    setSpeakCountdown(null);
  }, []);

  // ── TIME EXPIRED ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (remainingSeconds > 0 || timeExpired) return;
    setTimeExpired(true);
    clearCountdown();
    if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
    if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);
    setActiveSpeakerId(null);
    syncMicRef.current(false);
    setShowEnd(true);
    speakModRef.current("Debate time is over. Please review and end the session.");
  }, [remainingSeconds, timeExpired, clearCountdown]);

  // ── NEXT SPEAKER (multi-user, team-alternating) ───────────────────────────
  // teamOverride: force pick from a specific team (used after pass/auto)
  const pickNextSpeaker = useCallback((reason = "random", teamOverride?: Team) => {
    if (!isMulti || timeExpired) return;

    if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);
    if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
    clearCountdown();

    setParticipants(current => {
      // Determine which team to pick from
      const targetTeam: Team = teamOverride ?? (
        current.find(p => p.id === activeSpeakerId)?.team === "A" ? "B" : "A"
      );

      // Pool: same team, not yet spoken, not AI/MED, not current speaker
      const eligible = current.filter(p =>
        !p.isAI && !p.isMed &&
        p.team === targetTeam &&
        !p.hasSpoken &&
        p.id !== activeSpeakerId
      );

      // If no one left in target team, check if all participants have spoken
      const allSpoken = current.filter(p => !p.isAI && !p.isMed).every(p => p.hasSpoken);
      if (allSpoken) {
        setCompletedRound(true);
        setShowEnd(true);
        addMsg("AI Moderator", 99, "All participants have spoken. Great debate everyone! The round is now complete.");
        return current;
      }

      // If this team is exhausted, switch to other team
      const otherTeam: Team = targetTeam === "A" ? "B" : "A";
      const fallback = current.filter(p => !p.isAI && !p.isMed && p.team === otherTeam && !p.hasSpoken && p.id !== activeSpeakerId);
      const pool = (eligible.length ? eligible : fallback)
        .sort((a, b) => (a.teamOrder ?? 0) - (b.teamOrder ?? 0));

      if (!pool.length) {
        setCompletedRound(true);
        setShowEnd(true);
        addMsg("AI Moderator", 99, "All participants have spoken. Great debate everyone!");
        return current;
      }

      const chosen = pool[0];
      const pickedTeam: Team = chosen.team!;
      const isLocalSpeaker = chosen.id === 0;

      setActiveSpeakerId(chosen.id);
      setCurrentTeamTurn(pickedTeam);
      setTurnHistory(h => [`Team ${pickedTeam} · ${chosen.name} · ${reason}`, ...h].slice(0, 8));

      // Mute everyone while AI announces
      syncMicRef.current(false);
      const updated = current.map(p => ({
        ...p,
        isMyTurn:   p.id === chosen.id,
        isSpeaking: false,
        micMuted:   true,
        handRaised: p.id === chosen.id ? false : p.handRaised,
        turnsTaken: p.id === chosen.id ? (p.turnsTaken || 0) + 1 : (p.turnsTaken || 0),
        energy: p.id === chosen.id
          ? Math.max(10, (p.energy ?? 70) - 8)
          : Math.min(100, (p.energy ?? 70) + 3),
      }));

      const announcement = `Team ${pickedTeam}, ${chosen.name} — you have the floor. Please make your argument.`;
      addMsg("AI Moderator", 99, announcement);

      speakModRef.current(announcement, () => {
        // After AI finishes → open speaker mic + start mandatory window
        if (isLocalSpeaker) syncMicRef.current(true);

        setParticipants(ps => ps.map(p => ({
          ...p,
          micMuted:   p.id !== chosen.id,
          isSpeaking: p.id === chosen.id,
        })));

        // Start 10s mandatory speaking countdown
        startMandatoryWindow();

        // Audience reactions
        reactionTickerRef.current = setInterval(() => {
          setParticipants(cur => {
            const audience = cur.filter(p => p.id !== chosen.id && !p.isMed);
            if (!audience.length) return cur;
            const fan   = randomPick(audience);
            const emoji = randomPick(MULTI_REACTIONS);
            emitTileReaction(chosen.id, emoji);
            if (Math.random() > 0.6) {
              addMsg(fan.name, fan.id, `${emoji} Good point, ${chosen.name}!`);
            }
            return cur;
          });
        }, 3500);

        // Dummy speakers: auto-advance after a realistic window (>10s mandatory + extra)
        if (!isLocalSpeaker) {
          const dummyLine = randomPick(AI_MULTI_LINES);
          addMsg(chosen.name, chosen.id, dummyLine);
          // Mark as spoken after mandatory window
          setTimeout(() => {
            setParticipants(ps => ps.map(p => p.id === chosen.id ? { ...p, hasSpoken: true } : p));
          }, MANDATORY_SPEAK_SECONDS * 1000);
          // Then auto-advance after another few seconds
          autoAdvanceRef.current = setTimeout(() => {
            if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
            setParticipants(ps => ps.map(p => ({
              ...p,
              micMuted:   true,
              isSpeaking: false,
              isMyTurn:   false,
              hasSpoken:  p.id === chosen.id ? true : p.hasSpoken,
            })));
            // Next team is opposite of pickedTeam
            pickNextSpeaker("auto-next", pickedTeam === "A" ? "B" : "A");
          }, (MANDATORY_SPEAK_SECONDS + 6 + Math.floor(Math.random() * 6)) * 1000);
        }
      });

      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpeakerId, timeExpired, emitTileReaction, isMulti, clearCountdown, startMandatoryWindow]);

  const pickNextRef = useRef(pickNextSpeaker);
  useEffect(() => { pickNextRef.current = pickNextSpeaker; }, [pickNextSpeaker]);

  // ── INIT (once) ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    if (isAI1v1) {
      const greeting = `Welcome ${config.name}. I will argue the opposing position on: ${config.topic}. You have the floor first. Make your opening statement.`;
      setTimeout(() => {
        addMsg("AI Debater", 1, greeting);
        updateP(1, { isAITyping: true });
        speakDebaterRef.current(greeting, () => {
          updateP(1, { isAITyping: false });
          setWhoTurn("you");
          updateP(0, { isMyTurn: true });
          syncMicRef.current(true);
          startNudge();
        });
      }, 800);
    }

    if (isMulti) {
      syncMicRef.current(false);
      // Assign teams on init
      setParticipants(ps => {
        const withTeams = assignTeams(ps);
        const teamA = withTeams.filter(p => p.team === "A").map(p => p.name).join(", ");
        const teamB = withTeams.filter(p => p.team === "B").map(p => p.name).join(", ");
        const intro = `Welcome everyone to the debate on: ${config.topic}. I am your AI Moderator. Teams have been assigned. Team A: ${teamA}. Team B: ${teamB}. Each speaker must speak for at least 10 seconds before passing the turn. Teams will alternate strictly. Let us begin with Team A.`;
        setTimeout(() => {
          addMsg("AI Moderator", 99, intro);
          speakModRef.current(intro, () => {
            pickNextRef.current("opening", "A");
          });
        }, 800);
        setTeamsAssigned(true);
        setCurrentTeamTurn("A");
        return withTeams;
      });
    }

    return () => {
      voiceEngine.cancel();
      clearCountdown();
      if (aiTimerRef.current)        clearTimeout(aiTimerRef.current);
      if (nudgeTimerRef.current)     clearTimeout(nudgeTimerRef.current);
      if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
      if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (aiLocked) return;
    setAiLocked(true);
    clearNudge();
    setWhoTurn("ai");
    updateP(0, { isMyTurn: false });
    updateP(1, { isAITyping: true, isSpeaking: false });
    syncMicRef.current(false);

    aiTimerRef.current = setTimeout(() => {
      const response = randomPick(AI_LINES);
      addMsg("AI Debater", 1, response);
      setScores(s => ({
        you: Math.min(s.you + Math.floor(Math.random() * 5), 100),
        ai:  Math.min(s.ai  + Math.floor(Math.random() * 4), 100),
      }));
      setTranscript(t => {
        if (t.length > 0 && t.length % 4 === 0) setPhaseIdx(i => Math.min(i + 1, PHASES.length - 1));
        return t;
      });

      speakDebaterRef.current(response, () => {
        setWhoTurn("you");
        updateP(0, { isMyTurn: true });
        setAiLocked(false);
        syncMicRef.current(true);
        startNudge();
      });
    }, 600 + Math.random() * 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiLocked, updateP]);

  // ── MIC TOGGLE ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    // ── 1v1 ──────────────────────────────────────────────────────────────
    if (isAI1v1) {
      if (whoTurn !== "you") { toast$("Wait for the AI to finish speaking.", "warn"); return; }
      const next = !micOn;
      syncLocalMic(next);
      if (!next && !aiLocked) setTimeout(() => triggerAI(), 500);
      return;
    }

    // ── Multi ─────────────────────────────────────────────────────────────
    if (!isMulti) return;

    if (aiIsSpeaking) { toast$("Wait for the AI Moderator to finish.", "warn"); return; }
    if (activeSpeakerId !== 0) { toast$("Only the current speaker can pass the turn.", "warn"); return; }

    // Mandatory 10s window — mute button is locked
    if (speakCountdown != null && speakCountdown > 0) {
      toast$(`🔒 Must speak for ${speakCountdown}s more before passing.`, "warn");
      return;
    }

    if (!micOn) return;

    // Mark local user as hasSpoken and pass turn to next team
    syncLocalMic(false);
    clearCountdown();
    if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
    if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);

    // Mark local user's turn as done
    setParticipants(ps => ps.map(p => ({
      ...p,
      micMuted:   true,
      isSpeaking: false,
      isMyTurn:   false,
      hasSpoken:  p.isLocal ? true : p.hasSpoken,
    })));

    addMsg("AI Moderator", 99, `${config.name} has completed their turn.`);

    const localParticipant = participants.find(p => p.isLocal);
    const doneTeam: Team = localParticipant?.team ?? "A";
    const nextTeam: Team = doneTeam === "A" ? "B" : "A";

    setTimeout(() => pickNextRef.current("manual-pass", nextTeam), 600);
  };

  const toggleHand = () => {
    const me = participants.find(p => p.isLocal);
    updateP(0, { handRaised: !me?.handRaised });
    if (!me?.handRaised) toast$("✋ Hand raised!", "warn");
  };

  function sendMsg(text: string) {
    if (!text.trim()) return;
    addMsg(config.name, 0, text.trim());
    setChatInput("");
    updateP(0, { isSpeaking: true });
    setTimeout(() => updateP(0, { isSpeaking: false }), 1200);

    if (isAI1v1) {
      clearNudge();
      if (whoTurn === "you" && !aiLocked) setTimeout(() => triggerAI(), 400);
    }

    if (isMulti && !activeSpeakerId && !aiIsSpeaking && Math.random() > 0.4) {
      const line = randomPick(AI_MULTI_LINES);
      setTimeout(() => {
        addMsg("AI Moderator", 99, line);
        speakModRef.current(line);
      }, 1800);
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
    // Assign team to newly admitted participant
    setParticipants(ps => {
      const teamACnt = ps.filter(p => p.team === "A").length;
      const teamBCnt = ps.filter(p => p.team === "B").length;
      const assignedTeam: Team = teamACnt <= teamBCnt ? "A" : "B";
      const teamOrder = ps.filter(p => p.team === assignedTeam && !p.isAI && !p.isMed).length;
      return [...ps, { ...target, id: Math.max(...ps.map(p => p.id)) + 1, team: assignedTeam, teamOrder }];
    });
    setShowHostPopup(false);
    addMsg("AI Moderator", 99, `${target.name} was admitted to the room.`);
  }
  function admitAll() { waitingRoom.forEach(p => admitParticipant(p.id)); setShowHostPopup(false); }

  // ── END ───────────────────────────────────────────────────────────────────
  function handleEnd() {
    voiceEngine.cancel();
    clearCountdown();
    if (aiTimerRef.current)        clearTimeout(aiTimerRef.current);
    if (nudgeTimerRef.current)     clearTimeout(nudgeTimerRef.current);
    if (reactionTickerRef.current) clearInterval(reactionTickerRef.current);
    if (autoAdvanceRef.current)    clearTimeout(autoAdvanceRef.current);

    participants.forEach(p => {
      if (p.isLocal && p.stream instanceof MediaStream) p.stream.getTracks().forEach(t => t.stop());
    });
    if (config.stream instanceof MediaStream) {
      config.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    }
    if (recorder.isRecording) recorder.stop();

    const verdict = isMulti ? buildMultiVerdict(participants) : null;
    onEnd({
      timer: elapsedTimer,
      debateLimit: fmtClock(debateDurationSeconds),
      mode: "debate", subMode,
      topic: config.topic, subject: config.subject, unit: config.unit,
      participants: participants.filter(p => !p.isAI && !p.isMed).length,
      scores, recorder,
      hasRecording: !!recorder.blob,
      participantsList: participants,
      transcript,
      meetingEnded: true,
      verdict,
    });
  }

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const n = participants.length;
  const gc = n <= 1 ? "vg-1" : n === 2 ? "vg-2" : "vg-4";
  const fmt = (d: number) => new Date(d).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  const me = participants.find(p => p.isLocal);
  const activeSpeaker = participants.find(p => p.id === activeSpeakerId);
  const liveStudents  = participants.filter(p => !p.isAI && !p.isMed);
  const teamAStudents = liveStudents
    .filter(p => p.team === "A")
    .sort((a, b) => (a.teamOrder ?? 0) - (b.teamOrder ?? 0));
  const teamBStudents = liveStudents
    .filter(p => p.team === "B")
    .sort((a, b) => (a.teamOrder ?? 0) - (b.teamOrder ?? 0));
  const moderators = participants.filter(p => p.isAI || p.isMed);
  const leaderboard   = [...liveStudents]
    .sort((a, b) => ((b.reactionsReceived||0)+(b.turnsTaken||0)) - ((a.reactionsReceived||0)+(a.turnsTaken||0)))
    .slice(0, 5);

  // Is local user the active speaker?
  const localIsActive = activeSpeakerId === 0;
  // Is mute button locked by mandatory window?
  const muteIsLocked = isMulti && localIsActive && speakCountdown != null && speakCountdown > 0;

  const micBtnLabel = isMulti
    ? muteIsLocked
      ? `${speakCountdown}s`
      : localIsActive && micOn
        ? "Pass Turn"
        : micOn ? "Live" : "Muted"
    : micOn ? "Mute" : "Unmute";

  const micBtnClass = muteIsLocked
    ? "locked"
    : micOn
      ? (isMulti && localIsActive ? "mic-live" : "on")
      : "off";

  // Team turn badge for top bar
  const teamTurnPill = isMulti && teamsAssigned ? (
    <div className={`rbar-pill pill-team-${currentTeamTurn === "A" ? "a" : "b"}`}>
      {aiIsSpeaking ? "🎙 AI Moderator…" : `Team ${currentTeamTurn}'s Turn`}
    </div>
  ) : null;

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
            {whoTurn === "you" ? "🎤 Your Turn" : "🤖 AI Speaking…"}
          </div>
        )}
        {isMulti && teamTurnPill}
        <button className="rbar-end" onClick={() => setShowEnd(true)}>✕ End</button>
      </div>

      <div className="room-body">
        <div className="grid-area">

          {/* TILES */}
          {isMulti ? (
            <div className="team-stage">
              <div className="moderator-row">
                {moderators.map(p => (
                  <Tile
                    key={p.id} p={p}
                    reaction={tileReacts[p.id]}
                    nudge={undefined}
                    countdown={null}
                  />
                ))}
              </div>
              <div className="team-vs-grid">
                {(["A","B"] as Team[]).map(team => {
                  const teamStudents = team === "A" ? teamAStudents : teamBStudents;
                  const isActiveTeam = currentTeamTurn === team;
                  return (
                    <section key={team} className={`team-box team-box-${team.toLowerCase()}${isActiveTeam ? " active" : ""}`}>
                      <div className="team-box-head">
                        <div>
                          <div className="team-box-title">Team {team}</div>
                          <div className="team-box-sub">
                            {teamStudents.filter(p => p.hasSpoken).length}/{teamStudents.length} spoke
                          </div>
                        </div>
                        <span className={team === "A" ? "team-a-badge" : "team-b-badge"}>
                          {team === "A" ? "Left" : "Right"}
                        </span>
                      </div>
                      <div className="team-member-grid">
                        {teamStudents.map(p => (
                          <Tile
                            key={p.id} p={p}
                            reaction={tileReacts[p.id]}
                            nudge={p.isLocal && nudge ? nudge : undefined}
                            countdown={p.isLocal && localIsActive ? speakCountdown : null}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`vid-grid ${gc}`}>
              {participants.map(p => (
                <Tile
                  key={p.id} p={p}
                  reaction={tileReacts[p.id]}
                  nudge={p.isLocal && nudge ? nudge : undefined}
                  countdown={p.isLocal && localIsActive ? speakCountdown : null}
                />
              ))}
            </div>
          )}

          {/* CONTROL BAR */}
          <div className="ctrl-bar">
            <div className="cg">
              {/* Mic / Pass Turn button */}
              <button
                className={`cbtn ${micBtnClass}`}
                onClick={toggleMic}
                title={muteIsLocked ? `Must speak for ${speakCountdown}s more` : undefined}
              >
                <span className="cbtn-ico">
                  {muteIsLocked ? "🔒" : micOn ? "🎤" : "🔇"}
                </span>
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
              <button className={`cbtn${aiIsSpeaking ? " speaking" : ""}`} disabled style={{ cursor:"default" }}>
                <span className="cbtn-ico">🔊</span>
                <span>{aiIsSpeaking ? "AI Live" : "AI Voice"}</span>
              </button>

              <button
                className={`cbtn${recorder.isRecording ? " rec" : ""}`}
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
                <span className="cbtn-ico">🏆</span><span>{isMulti ? "Teams" : "Score"}</span>
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
                        ? `${activeSpeaker.name} (Team ${activeSpeaker.team})`
                        : "Selecting speaker…"}
                  </div>
                  <div className="room-info-sub">
                    {localIsActive && micOn
                      ? muteIsLocked
                        ? `🔒 Must speak ${speakCountdown}s more before passing`
                        : "🎤 You're live — mute yourself to pass the turn"
                      : "Mic opens automatically after AI announces you"}
                  </div>
                </div>
                <div className="room-info-card game">
                  <div className="room-info-label">Turn Order</div>
                  <div className="room-chip-row">
                    <span className="room-chip" style={{ background:"rgba(99,102,241,.25)" }}>
                      Team A: {participants.filter(p => p.team === "A" && p.hasSpoken).length}/{participants.filter(p => p.team === "A").length}
                    </span>
                    <span className="room-chip" style={{ background:"rgba(236,72,153,.25)" }}>
                      Team B: {participants.filter(p => p.team === "B" && p.hasSpoken).length}/{participants.filter(p => p.team === "B").length}
                    </span>
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
                  ...(isAI1v1 ? [{ id:"score", ico:"🏆", lbl:"Score" }] : [{ id:"score", ico:"🏆", lbl:"Teams" }]),
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
                {isMulti && (
                  <div style={{ padding:"6px 9px 0" }}>
                    {(["A","B"] as Team[]).map(team => (
                      <div key={team} style={{ marginBottom:8,padding:"9px 11px",borderRadius:11,background:team==="A"?"rgba(99,102,241,.08)":"rgba(236,72,153,.08)",border:`1px solid ${team==="A"?"rgba(99,102,241,.22)":"rgba(236,72,153,.22)"}` }}>
                        <div style={{ fontSize:10,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em",color:team==="A"?"#a5b4fc":"#f9a8d4",marginBottom:5 }}>
                          Team {team} — {participants.filter(p=>p.team===team&&p.hasSpoken).length}/{participants.filter(p=>p.team===team).length} spoke
                        </div>
                        {participants.filter(p => p.team === team).map(p => (
                          <div key={p.id} style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 7px",borderRadius:7,marginBottom:3,background:"rgba(255,255,255,.04)" }}>
                            <div className="p-av" style={{ width:22,height:22,fontSize:9,background:(p.avatarColor||avColor(p.name))+"28",color:p.avatarColor||avColor(p.name) }}>{avInit(p.name)}</div>
                            <span style={{ fontSize:11.5,fontWeight:700,color:"#fff",flex:1 }}>{p.name}{p.isLocal?" (You)":""}</span>
                            {p.hasSpoken && <span style={{ fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:20,background:"rgba(16,185,129,.15)",color:"#6ee7b7" }}>Done</span>}
                            {p.isSpeaking && <span style={{ fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:20,background:"rgba(99,102,241,.2)",color:"#a5b4fc" }}>Speaking</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
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
                {!isMulti && (
                  <div className="p-list">
                    {participants.map(p => {
                      const c = p.avatarColor || avColor(p.name);
                      return (
                        <div key={p.id} className={`p-row${p.isSpeaking ? " spk" : ""}`}>
                          <div className="p-av" style={{ background:c+"28",color:c }}>
                            {p.isAI ? "🤖" : p.isMed ? "🎙️" : avInit(p.name)}
                          </div>
                          <div className="p-info">
                            <div className="p-name">{p.name}{p.isLocal ? " (You)" : ""}{p.isSpeaking ? " 🔊" : ""}{p.handRaised ? " ✋" : ""}</div>
                            <div className="p-role">{p.isHost ? "👑 Host" : p.isMed ? "🎙️ Mediator" : p.isAI ? "🤖 AI" : "👤 Participant"}</div>
                          </div>
                          <span style={{ fontSize:12,color:p.micMuted ? "var(--red)" : "var(--em)" }}>{p.micMuted ? "🔇" : "🎤"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                      <div className="chat-empty">No messages yet.<br />{isAI1v1 ? "Type your argument — AI will respond!" : "Start the conversation!"}</div>
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
                    placeholder={isAI1v1 ? (whoTurn === "you" ? "Type your argument…" : "AI is speaking…") : aiIsSpeaking ? "AI Moderator speaking…" : "Send a message…"}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(chatInput); } }}
                    rows={1}
                    disabled={isAI1v1 && whoTurn === "ai"}
                  />
                  <button className="chat-send" onClick={() => sendMsg(chatInput)} disabled={isAI1v1 && whoTurn === "ai"}>➤</button>
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
                        <div className="turn-hint">{whoTurn === "you" ? (micOn ? "🎤 Mic open — mute to pass" : "Speak or type your argument") : (aiIsSpeaking ? "AI is speaking…" : "AI is formulating…")}</div>
                      </div>
                    </div>
                  </div>
                  <div className="score-card">
                    <div className="sc-title">📊 Live Score</div>
                    <div className="sc-row">
                      <div className="sc-item"><div className="sc-val sc-u">{scores.you}</div><div className="sc-lbl">You</div></div>
                      <div className="sc-vs">VS</div>
                      <div className="sc-item"><div className="sc-val sc-a">{scores.ai}</div><div className="sc-lbl">AI</div></div>
                    </div>
                    <div className="sc-bar"><div className="sc-fill" style={{ width:`${(scores.you/(scores.you+scores.ai||1))*100}%` }} /></div>
                  </div>
                  <div className="phase-card">
                    <div className="sc-title" style={{ marginBottom:6 }}>📋 Debate Phases</div>
                    {PHASES.map((ph, i) => (
                      <div key={i} className={`ph-step${i === phaseIdx ? " act" : ""}`}>
                        <div className={`ph-num ${i < phaseIdx ? "ph-done" : i === phaseIdx ? "ph-act" : "ph-pend"}`}>{i < phaseIdx ? "✓" : i+1}</div>
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

            {/* TEAMS PANEL — Multi */}
            {panelTab === "score" && isMulti && (
              <div className="pscroll">
                <div className="dp-wrap">
                  {/* Team A vs B summary */}
                  <div className="score-card">
                    <div className="sc-title">⚔️ Team Standings</div>
                    <div className="sc-row">
                      <div className="sc-item">
                        <div className="sc-val" style={{ color:"#a5b4fc",fontSize:20 }}>
                          {participants.filter(p=>p.team==="A").reduce((s,p)=>(s+(p.reactionsReceived||0)+(p.turnsTaken||0)*2),0)}
                        </div>
                        <div className="sc-lbl">Team A pts</div>
                      </div>
                      <div className="sc-vs">VS</div>
                      <div className="sc-item">
                        <div className="sc-val" style={{ color:"#f9a8d4",fontSize:20 }}>
                          {participants.filter(p=>p.team==="B").reduce((s,p)=>(s+(p.reactionsReceived||0)+(p.turnsTaken||0)*2),0)}
                        </div>
                        <div className="sc-lbl">Team B pts</div>
                      </div>
                    </div>
                    <div className="sc-bar">
                      {(() => {
                        const aScore = participants.filter(p=>p.team==="A").reduce((s,p)=>(s+(p.reactionsReceived||0)+(p.turnsTaken||0)*2),0);
                        const bScore = participants.filter(p=>p.team==="B").reduce((s,p)=>(s+(p.reactionsReceived||0)+(p.turnsTaken||0)*2),0);
                        const total  = aScore + bScore || 1;
                        return <div className="sc-fill" style={{ width:`${(aScore/total)*100}%`, background:"linear-gradient(90deg,#6366f1,#a5b4fc)" }} />;
                      })()}
                    </div>
                  </div>

                  {/* Current turn status */}
                  <div className="turn-box">
                    <div className="turn-label">Current Floor</div>
                    <div className={`team-turn-bar ${currentTeamTurn === "A" ? "a" : "b"}`}>
                      <div className="team-turn-dot" />
                      <div>
                        <div className="turn-name">
                          {aiIsSpeaking
                            ? "AI Moderator announcing…"
                            : activeSpeaker
                              ? `${activeSpeaker.name} · Team ${activeSpeaker.team}`
                              : `Team ${currentTeamTurn}'s turn`}
                        </div>
                        <div className="turn-hint">
                          {localIsActive && micOn
                            ? muteIsLocked
                              ? `🔒 Must speak ${speakCountdown}s more`
                              : "Mute yourself to pass to the other team"
                            : "Mic opens automatically when you're called"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Turn history */}
                  <div className="phase-card">
                    <div className="sc-title" style={{ marginBottom:6 }}>Turn History</div>
                    <div style={{ display:"flex",flexDirection:"column" as const,gap:5 }}>
                      {turnHistory.length === 0 && <div style={{ fontSize:11,color:"rgba(255,255,255,.45)" }}>No turns yet.</div>}
                      {turnHistory.map((entry, idx) => (
                        <div key={`${entry}-${idx}`} style={{ padding:"7px 10px",borderRadius:9,background:"rgba(255,255,255,.05)",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.8)" }}>
                          {entry}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Leaderboard */}
                  <div className="score-card">
                    <div className="sc-title">Leaderboard</div>
                    <div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>
                      {leaderboard.map((p, idx) => (
                        <div key={p.id} style={{ display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)" }}>
                          <div style={{ width:22,textAlign:"center" as const,fontSize:12,fontWeight:800,color:idx===0?"#fbbf24":"rgba(255,255,255,.65)" }}>{idx+1}</div>
                          <div className="p-av" style={{ background:(p.avatarColor||avColor(p.name))+"28",color:p.avatarColor||avColor(p.name) }}>{avInit(p.name)}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:11.5,fontWeight:700,color:"#fff" }}>
                              {p.name}
                              {p.team === "A" && <span className="team-a-badge" style={{ marginLeft:4 }}>A</span>}
                              {p.team === "B" && <span className="team-b-badge" style={{ marginLeft:4 }}>B</span>}
                            </div>
                            <div style={{ fontSize:10.5,color:"rgba(255,255,255,.45)" }}>Turns {p.turnsTaken||0} · {p.reactionsReceived||0} reacts{p.hasSpoken?" · Done":""}</div>
                          </div>
                        </div>
                      ))}
                    </div>
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
              {isMulti && (
                <div className="a-sec">
                  <div className="a-sec-title">⚔️ Team Scores</div>
                  <div className="score-grid-3">
                    {(["A","B"] as Team[]).map(team => (
                      <div key={team} className="score-box">
                        <div className="score-box-val" style={{ color:team==="A"?"#a5b4fc":"#f9a8d4" }}>
                          {participants.filter(p=>p.team===team).reduce((s,p)=>(s+(p.reactionsReceived||0)+(p.turnsTaken||0)*2),0)}
                        </div>
                        <div className="score-box-lbl">Team {team}</div>
                      </div>
                    ))}
                    <div className="score-box">
                      <div className="score-box-val" style={{ color:"var(--em)" }}>
                        {participants.filter(p=>!p.isAI&&!p.isMed&&p.hasSpoken).length}
                      </div>
                      <div className="score-box-lbl">Spoke</div>
                    </div>
                  </div>
                </div>
              )}
              {isAI1v1 && (
                <div className="a-sec">
                  <div className="a-sec-title">📊 Score</div>
                  <div className="score-grid-3">
                    <div className="score-box"><div className="score-box-val" style={{ color:"var(--sky)" }}>{scores.you}</div><div className="score-box-lbl">Your Score</div></div>
                    <div className="score-box"><div className="score-box-val" style={{ color:"var(--vio)" }}>{scores.ai}</div><div className="score-box-lbl">AI Score</div></div>
                    <div className="score-box"><div className="score-box-val" style={{ color:"var(--em)" }}>{Math.abs(scores.you-scores.ai)}</div><div className="score-box-lbl">Margin</div></div>
                  </div>
                  <div className="verdict-box" style={{ borderColor:scores.you>scores.ai?"rgba(16,185,129,.4)":"rgba(99,102,241,.4)",background:scores.you>scores.ai?"rgba(16,185,129,.07)":"rgba(99,102,241,.07)" }}>
                    <div className="verdict-win" style={{ color:scores.you>scores.ai?"var(--em)":"var(--ind3)" }}>
                      {scores.you > scores.ai ? "🥇 You Win!" : "🤖 AI Wins"}
                    </div>
                    <div className="verdict-lbl" style={{ color:"rgba(255,255,255,.5)" }}>Score: {Math.max(scores.you,scores.ai)} pts</div>
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
            </div>
            <div className="mf">
              <button className="btn-s" style={{ background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)" }} onClick={() => setShowEnd(false)}>
                {completedRound ? "Review Room" : "Keep Going"}
              </button>
              <button className="btn-d" onClick={handleEnd}>
                {completedRound ? "Show Results" : "End Debate"}
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
  const verdict    = result.verdict;
  const winner     = verdict?.winner;
  const runnerUp   = verdict?.runnerUp;
  const insights   = verdict?.insights || [];
  const winnerTeam = verdict?.winnerTeam;

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
          {winnerTeam && (
            <div style={{ marginBottom:16,padding:"12px 20px",borderRadius:16,background:winnerTeam==="A"?"rgba(99,102,241,.1)":"rgba(236,72,153,.1)",border:`1.5px solid ${winnerTeam==="A"?"rgba(99,102,241,.3)":"rgba(236,72,153,.3)"}` }}>
              <div style={{ fontSize:22,fontWeight:900,color:winnerTeam==="A"?"#a5b4fc":"#f9a8d4",marginBottom:4 }}>
                🏅 Team {winnerTeam} Wins!
              </div>
              <div style={{ fontSize:13,color:"var(--t2)" }}>
                Team {winnerTeam}: {verdict?.[winnerTeam === "A" ? "teamAScore" : "teamBScore"]} pts vs Team {winnerTeam==="A"?"B":"A"}: {verdict?.[winnerTeam === "A" ? "teamBScore" : "teamAScore"]} pts
              </div>
            </div>
          )}
          <div className="res-verdict">
            <div className="res-panel">
              <div className="res-panel-title">MVP</div>
              <div className="res-winner-name">{winner.name}</div>
              <div style={{ marginBottom:6 }}>
                {winner.team === "A" ? <span className="team-a-badge">Team A</span> : <span className="team-b-badge">Team B</span>}
              </div>
              <div className="res-winner-sub">Best speaker based on reactions, turns completed, and audience engagement.</div>
            </div>
            <div className="res-panel">
              <div className="res-panel-title">Top Rankings</div>
              <div className="res-rank">
                <div className="res-rank-row">
                  <div>
                    <div className="res-rank-name">{winner.name}</div>
                    <div className="res-rank-role">Winner · Team {winner.team}</div>
                  </div>
                  <div className="res-rank-score">{winner.debateScore}</div>
                </div>
                {runnerUp && (
                  <div className="res-rank-row">
                    <div>
                      <div className="res-rank-name">{runnerUp.name}</div>
                      <div className="res-rank-role">Runner-up · Team {runnerUp.team}</div>
                    </div>
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

      {result.subMode === "ai" && (
        <div style={{ width:"100%",maxWidth:400,marginBottom:18 }}>
          <div style={{ background:"var(--surf)",border:"1px solid var(--bdr)",borderRadius:18,padding:18,boxShadow:"var(--sh)" }}>
            <div style={{ fontSize:12,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase" as const,color:"var(--t3)",marginBottom:10 }}>Final Score</div>
            <div style={{ display:"flex",alignItems:"center",gap:16,justifyContent:"center" }}>
              <div style={{ textAlign:"center" as const }}>
                <div style={{ fontSize:36,fontWeight:900,color:"var(--ind)" }}>{result.scores?.you || 0}</div>
                <div style={{ fontSize:11,color:"var(--t3)" }}>You</div>
              </div>
              <div style={{ fontSize:18,fontWeight:800,color:"var(--t4)" }}>VS</div>
              <div style={{ textAlign:"center" as const }}>
                <div style={{ fontSize:36,fontWeight:900,color:"var(--vio)" }}>{result.scores?.ai || 0}</div>
                <div style={{ fontSize:11,color:"var(--t3)" }}>AI</div>
              </div>
            </div>
            <div style={{ textAlign:"center" as const,marginTop:10,fontSize:15,fontWeight:800,color:(result.scores?.you||0) >= (result.scores?.ai||0) ? "var(--em)" : "var(--vio)" }}>
              {(result.scores?.you||0) >= (result.scores?.ai||0) ? "🥇 You won the debate!" : "🤖 AI won this round!"}
            </div>
          </div>
        </div>
      )}

      <div className="res-actions">
        {result.hasRecording && <button className="btn-s" onClick={() => result.recorder?.download("debate.webm")}>📥 Download Recording</button>}
        <button className="btn-p" style={{ fontSize:13,width:"auto",padding:"11px 24px" }} onClick={onNew}>⚔️ New Debate</button>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
type Screen = "setup"|"room"|"results-loading"|"results";

export default function DebatePage() {
  const [screen, setScreen, clearScreen] = useSessionState<Screen>("dp-screen", "setup");
  const [config, setConfig, clearConfig] = useSessionState<any>("dp-config", null);
  const [result, setResult]   = useState<any>(null);
  const [role,   setRole]     = useState("student");
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          <DebateRoom
            config={config}
            onEnd={res => {
              if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
              setConfig(null);
              setResult(res);
              setScreen("results-loading");
              const delay = 5000 + Math.floor(Math.random() * 5000);
              resultTimerRef.current = setTimeout(() => {
                setScreen("results");
                resultTimerRef.current = null;
              }, delay);
            }}
          />
        )}
        {screen === "results-loading" && (
          <DebateLoadingScreen
            title="Generating debate results"
            subtitle="Reviewing turns, reactions, transcript, and team performance..."
            progress={78}
          />
        )}
        {screen === "results" && result && (
          <DebateResults
            result={result}
            onNew={() => {
              if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
              setResult(null); clearScreen(); clearConfig(); setScreen("setup");
            }}
          />
        )}
      </div>
    </>
  );
}
