import { useState, useEffect, useRef, useCallback } from "react";
import Navigation from "../components/navigation";
import { useAuth } from "../hooks/use-auth";
import { useSessionState } from "../hooks/useSessionState";

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
:root{
  --bg:#f0f2f5;--surf:#fff;--surf2:#f7f8fa;--surf3:#eef0f4;
  --bdr:rgba(0,0,0,.08);--bdr2:rgba(0,0,0,.14);
  --em:#00c37a;--em2:#00a366;--em3:#d0fff1;
  --sky:#2d9cdb;--sky2:#1a7bbf;
  --vio:#7c3aed;--pnk:#e91e8c;
  --red:#e53e3e;--amb:#f6a623;
  --t1:#0d1117;--t2:#444d5b;--t3:#8a95a3;--t4:#d6dbe4;
  --font:'DM Sans',system-ui,sans-serif;
  --mono:'JetBrains Mono',monospace;
  --sh:0 1px 4px rgba(0,0,0,.06);
  --sh2:0 4px 20px rgba(0,0,0,.1);
  --sh3:0 16px 60px rgba(0,0,0,.16);
  --grad:linear-gradient(135deg,#00c37a,#2d9cdb);
  --grad2:linear-gradient(135deg,#7c3aed,#e91e8c);
  --r:16px;
}
.dark{
  --bg:#080e1a;--surf:#101827;--surf2:#0c1422;--surf3:#1a2336;
  --bdr:rgba(255,255,255,.07);--bdr2:rgba(255,255,255,.12);
  --t1:#e8ecf2;--t2:#8a95a3;--t3:#4a5568;--t4:#1e2a3a;
}
body{font-family:var(--font);background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased;font-size:14px}
button,input,select,textarea{font-family:var(--font)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:rgba(0,195,122,.25);border-radius:4px}
.sp-app{height:100dvh;display:flex;flex-direction:column;overflow:hidden}

/* ─── PAGE LOADER ─── */
.page-loader{position:fixed;inset:0;background:#060e1c;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
.page-loader-logo{width:60px;height:60px;background:var(--grad);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;animation:loaderPulse 1.4s ease-in-out infinite;box-shadow:0 0 40px rgba(0,195,122,.35)}
.page-loader-text{font-size:15px;font-weight:700;color:#fff;letter-spacing:.05em}
.page-loader-sub{font-size:11px;color:rgba(255,255,255,.35);letter-spacing:.08em;text-transform:uppercase}
.page-loader-bar{width:180px;height:2px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden}
.page-loader-fill{height:100%;background:var(--grad);border-radius:2px;animation:loaderFill 1.8s ease forwards}
@keyframes loaderPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes loaderFill{0%{width:0%}60%{width:80%}100%{width:100%}}

/* ─── ROUTE TRANSITION ─── */
.route-enter{animation:routeIn .32s cubic-bezier(.34,1.05,.64,1) both}
@keyframes routeIn{from{opacity:0;transform:scale(.97) translateY(8px)}to{opacity:1;transform:none}}

@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes recBlink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes waveBar{0%,100%{height:3px}50%{height:18px}}
@keyframes rPop{0%{opacity:0;transform:translate(-50%,-60%) scale(.2)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}60%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-120%) scale(.6)}}
@keyframes dotPulse{0%,80%,100%{transform:scale(.4);opacity:.3}40%{transform:scale(1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}
@keyframes chipIn{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
@keyframes transcriptIn{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:none}}
@keyframes typewriterBlink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes speaking{0%,100%{height:4px}25%{height:16px}50%{height:8px}75%{height:22px}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

/* ─── SOUND ANALYSER ANIMATION ─── */
@keyframes soundBar0{0%,100%{height:4px}15%{height:22px}35%{height:10px}55%{height:18px}75%{height:6px}}
@keyframes soundBar1{0%,100%{height:6px}20%{height:28px}40%{height:12px}60%{height:24px}80%{height:8px}}
@keyframes soundBar2{0%,100%{height:3px}10%{height:18px}30%{height:28px}50%{height:14px}70%{height:22px}}
@keyframes soundBar3{0%,100%{height:8px}25%{height:24px}45%{height:6px}65%{height:20px}85%{height:10px}}
@keyframes soundBar4{0%,100%{height:5px}18%{height:20px}38%{height:12px}58%{height:26px}78%{height:8px}}
@keyframes soundBar5{0%,100%{height:7px}22%{height:16px}42%{height:30px}62%{height:10px}82%{height:20px}}
@keyframes soundBar6{0%,100%{height:4px}12%{height:24px}32%{height:8px}52%{height:22px}72%{height:14px}}

.sound-analyser{display:flex;align-items:center;gap:3px;height:32px;padding:0 2px}
.sound-analyser .bar{width:3px;border-radius:3px;min-height:3px;background:var(--color, #00c37a)}
.sound-analyser.active .bar:nth-child(1){animation:soundBar0 .7s ease-in-out infinite}
.sound-analyser.active .bar:nth-child(2){animation:soundBar1 .7s ease-in-out infinite .08s}
.sound-analyser.active .bar:nth-child(3){animation:soundBar2 .7s ease-in-out infinite .16s}
.sound-analyser.active .bar:nth-child(4){animation:soundBar3 .7s ease-in-out infinite .06s}
.sound-analyser.active .bar:nth-child(5){animation:soundBar4 .7s ease-in-out infinite .12s}
.sound-analyser.active .bar:nth-child(6){animation:soundBar5 .7s ease-in-out infinite .04s}
.sound-analyser.active .bar:nth-child(7){animation:soundBar6 .7s ease-in-out infinite .10s}

/* ─── RECORDING BADGE ─── */
.recording-badge{display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:10px;background:rgba(229,62,62,.1);border:1.5px solid rgba(229,62,62,.35);animation:fadeIn .3s ease}
.recording-badge-dot{width:8px;height:8px;border-radius:50%;background:var(--red);animation:recBlink 1s infinite;flex-shrink:0}
.recording-badge-text{font-size:11.5px;font-weight:700;color:var(--red);font-family:var(--mono)}

/* ─── DEMO SESSION STATUS ─── */
.demo-status-bar{display:flex;align-items:center;gap:10px;padding:9px 13px;border-radius:11px;background:rgba(246,166,35,.09);border:1.5px solid rgba(246,166,35,.3);margin-bottom:10px;animation:fadeIn .3s ease}
.demo-status-dot{width:7px;height:7px;border-radius:50%;background:var(--amb);animation:recBlink 1.2s infinite;flex-shrink:0}
.demo-status-text{flex:1;font-size:11px;font-weight:700;color:#fcd18e;line-height:1.5}
.demo-status-time{font-size:10.5px;font-family:var(--mono);color:rgba(246,166,35,.7)}

/* ─── DEMO ENDED FEEDBACK TOAST ─── */
.demo-end-toast{padding:11px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(0,195,122,.12),rgba(45,156,219,.08));border:1.5px solid rgba(0,195,122,.3);margin-bottom:10px;animation:slideUp .35s cubic-bezier(.34,1.2,.64,1)}
.demo-end-title{font-size:12px;font-weight:800;color:#5ee3b7;margin-bottom:5px;display:flex;align-items:center;gap:7px}
.demo-end-items{display:flex;flex-direction:column;gap:4px}
.demo-end-item{display:flex;align-items:flex-start;gap:6px;font-size:10.5px;color:rgba(255,255,255,.6);line-height:1.5}

/* Toast */
.sp-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--surf);border:1px solid var(--bdr2);border-radius:12px;padding:9px 15px;font-size:12.5px;font-weight:600;color:var(--t1);box-shadow:var(--sh2);z-index:9999;display:flex;align-items:center;gap:7px;animation:slideUp .28s cubic-bezier(.34,1.2,.64,1);white-space:nowrap;max-width:calc(100vw - 32px)}
.sp-toast.success{border-color:rgba(0,195,122,.35)}.sp-toast.error{border-color:rgba(229,62,62,.35)}.sp-toast.warn{border-color:rgba(246,166,35,.35)}.sp-toast.info{border-color:rgba(45,156,219,.3)}

/* Form elements */
.fi{margin-bottom:10px}
.fl{display:block;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t3);margin-bottom:4px}
.finput{width:100%;padding:9px 12px;border-radius:10px;border:1.5px solid var(--bdr);background:var(--surf);color:var(--t1);font-size:13.5px;outline:none;transition:all .16s}
.finput:focus{border-color:var(--em);box-shadow:0 0 0 3px rgba(0,195,122,.1)}
.finput::placeholder{color:var(--t3)}
.finput:disabled{opacity:.4;cursor:not-allowed}
select.finput{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238a95a3' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px}
.fi-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}

/* Buttons */
.btn-p{padding:10px 20px;border-radius:10px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:13.5px;font-weight:700;transition:all .2s;box-shadow:0 4px 16px rgba(0,195,122,.24);display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:var(--font);width:100%}
.btn-p:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 7px 24px rgba(0,195,122,.34)}
.btn-p:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
.btn-s{padding:8px 15px;border-radius:9px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);font-size:12.5px;font-weight:600;transition:.16s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:5px}
.btn-s:hover{border-color:rgba(0,195,122,.3);color:var(--t1);background:rgba(0,195,122,.05)}
.btn-d{padding:8px 15px;border-radius:9px;border:1.5px solid rgba(229,62,62,.25);background:rgba(229,62,62,.06);cursor:pointer;color:var(--red);font-size:12.5px;font-weight:600;transition:.16s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:5px}
.btn-d:hover{background:rgba(229,62,62,.12)}

/* Loader */
.loader-spin{width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;animation:spin .65s linear infinite;flex-shrink:0}
.loader-spin.dark{border-color:rgba(0,195,122,.15);border-top-color:var(--em)}
.lo-progress{width:100%;height:3px;background:rgba(0,0,0,.06);border-radius:3px;overflow:hidden;margin-top:6px}
.lo-progress-fill{height:100%;background:var(--grad);border-radius:3px;transition:width .35s ease}

/* ═══════════════════════════════
   SETUP PAGE — FIXED LAYOUT
═══════════════════════════════ */
.sp-setup{display:grid;grid-template-columns:36% 1fr;height:calc(100dvh - 56px);overflow:hidden}
.sp-left{background:#060e1c;position:relative;overflow:hidden;display:flex;flex-direction:column}
.sp-left-inner{flex:1;overflow-y:auto;padding:clamp(18px,3vw,36px) clamp(16px,2.5vw,32px);position:relative;z-index:2;display:flex;flex-direction:column;justify-content:flex-start}
.sp-grid-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(0,195,122,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(0,195,122,.055) 1px,transparent 1px);background-size:42px 42px;pointer-events:none}
.sp-glow1{position:absolute;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(0,195,122,.15) 0%,transparent 70%);top:-120px;left:-120px;pointer-events:none}
.sp-glow2{position:absolute;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(45,156,219,.1) 0%,transparent 70%);bottom:-60px;right:-40px;pointer-events:none;animation:pulse 7s ease-in-out infinite}
.sp-logo{display:flex;align-items:center;gap:9px;margin-bottom:20px;animation:fadeUp .45s ease both}
.sp-logo-ico{width:34px;height:34px;background:var(--grad);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 6px 18px rgba(0,195,122,.35)}
.sp-logo-name{font-size:15px;font-weight:800;background:linear-gradient(90deg,#fff 0%,#5ee3b7 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sp-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 11px;border-radius:100px;background:rgba(0,195,122,.12);border:1px solid rgba(0,195,122,.28);font-size:10px;font-weight:700;color:#5ee3b7;letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;animation:fadeUp .45s ease .08s both;width:fit-content}
.sp-badge-dot{width:5px;height:5px;border-radius:50%;background:#5ee3b7;animation:pulse 1.8s infinite}
.sp-h1{font-size:clamp(18px,2vw,28px);font-weight:900;line-height:1.1;letter-spacing:-.5px;color:#fff;margin-bottom:8px;animation:fadeUp .45s ease .14s both}
.sp-h1 .hl{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sp-desc{font-size:11.5px;color:rgba(255,255,255,.38);line-height:1.8;margin-bottom:18px;animation:fadeUp .45s ease .2s both}
.sp-features{display:flex;flex-direction:column;gap:5px;animation:fadeUp .45s ease .26s both}
.sp-feat{display:flex;align-items:center;gap:9px;padding:8px 11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:10px;transition:.25s}
.sp-feat:hover{background:rgba(0,195,122,.08);border-color:rgba(0,195,122,.22)}
.sp-feat-ic{width:30px;height:30px;border-radius:8px;background:rgba(0,195,122,.18);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.sp-feat-t{font-size:11px;font-weight:700;color:#fff}
.sp-feat-d{font-size:9.5px;color:rgba(255,255,255,.35);margin-top:1px}
.ctx-chip{margin-top:12px;padding:10px 13px;border-radius:11px;background:rgba(0,195,122,.07);border:1px solid rgba(0,195,122,.2);animation:fadeUp .45s ease .32s both}
.ctx-chip-lbl{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--em);margin-bottom:3px}
.ctx-chip-val{font-size:12.5px;font-weight:700;color:#fff}
.ctx-chip-sub{font-size:10.5px;color:rgba(255,255,255,.38);margin-top:1px}

/* Right panel — fixed with scroll only in content */
.sp-right{background:var(--surf);overflow:hidden;display:flex;flex-direction:column}
.sp-right-scroll{overflow-y:auto;flex:1;padding:clamp(16px,2.5vw,36px);-webkit-overflow-scrolling:touch}
.sp-right-inner{max-width:580px;margin:0 auto;width:100%}
.back-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;border:1.5px solid rgba(0,195,122,.25);background:rgba(0,195,122,.06);cursor:pointer;font-size:12.5px;font-weight:700;color:var(--em);transition:all .2s;margin-bottom:16px;font-family:var(--font)}
.back-btn:hover{background:rgba(0,195,122,.12);transform:translateX(-2px)}
.setup-h{font-size:clamp(15px,1.8vw,20px);font-weight:900;letter-spacing:-.3px;color:var(--t1);margin-bottom:3px}
.setup-sub{font-size:11.5px;color:var(--t2);margin-bottom:16px;line-height:1.6}

/* Module cards */
.module-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}
.module-card{padding:14px;border-radius:13px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .2s;display:flex;gap:11px;align-items:flex-start}
.module-card:hover{border-color:rgba(0,195,122,.3);background:rgba(0,195,122,.03);transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,195,122,.1)}
.module-card.sel{border-color:var(--em);background:rgba(0,195,122,.06);box-shadow:0 6px 20px rgba(0,195,122,.12)}
.mod-ic{width:38px;height:38px;border-radius:11px;background:rgba(0,195,122,.12);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;transition:.2s}
.module-card.sel .mod-ic{background:rgba(0,195,122,.2)}
.mod-title{font-size:12.5px;font-weight:800;color:var(--t1);margin-bottom:3px}
.mod-desc{font-size:10.5px;color:var(--t2);line-height:1.5}
.module-card.sel .mod-title{color:var(--em)}

/* Sub-mode cards */
.submode-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}
.submode-card{padding:16px 14px;border-radius:13px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .22s;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px}
.submode-card:hover{border-color:rgba(0,195,122,.3);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,195,122,.1)}
.submode-card.sel{border-color:var(--em);background:rgba(0,195,122,.06);box-shadow:0 6px 20px rgba(0,195,122,.14)}
.submode-ic{font-size:28px;margin-bottom:2px}
.submode-title{font-size:13px;font-weight:800;color:var(--t1)}
.submode-desc{font-size:10.5px;color:var(--t2);line-height:1.5}
.submode-card.sel .submode-title{color:var(--em)}

/* Section divider */
.sec-div{font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-bottom:8px;margin-top:6px;display:flex;align-items:center;gap:7px}
.sec-div::after{content:'';flex:1;height:1px;background:var(--bdr)}

/* Timing cards */
.timing-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.timing-card{padding:11px 12px;border-radius:11px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .2s;display:flex;align-items:flex-start;gap:9px}
.timing-card:hover{border-color:rgba(0,195,122,.28)}
.timing-card.sel{border-color:var(--em);background:rgba(0,195,122,.05)}
.timing-ic{font-size:17px}
.timing-title{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:1px}
.timing-desc{font-size:10px;color:var(--t2)}
.timing-card.sel .timing-title{color:var(--em)}

/* Steps */
.steps{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.step-r{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;border:1px solid var(--bdr);background:var(--surf2);transition:.18s}
.step-r.done{border-color:rgba(0,195,122,.28);background:rgba(0,195,122,.04)}
.step-r.act{border-color:rgba(45,156,219,.28);background:rgba(45,156,219,.04)}
.step-r.pend{opacity:.42}
.step-num{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
.step-r.done .step-num{background:var(--em);color:#fff}
.step-r.act .step-num{background:var(--sky);color:#fff}
.step-r.pend .step-num{background:var(--surf3);color:var(--t3)}
.step-lbl{font-size:12px;font-weight:600;color:var(--t2)}
.step-r.done .step-lbl{color:var(--em)}.step-r.act .step-lbl{color:var(--t1)}.step-r.pend .step-lbl{color:var(--t3)}

/* Link box */
.link-box{border-radius:12px;background:rgba(0,195,122,.04);border:1.5px solid rgba(0,195,122,.15);padding:11px 13px;margin-top:10px}
.link-lbl{font-size:9.5px;font-weight:800;color:var(--em);text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px}
.link-row{display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:8px;background:var(--surf);border:1px solid var(--bdr)}
.link-val{flex:1;font-family:var(--mono);font-size:10px;color:var(--em);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.copy-btn{padding:4px 10px;border-radius:6px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:11px;font-weight:700;transition:.15s;flex-shrink:0}
.copy-btn:hover{transform:scale(1.04)}

/* Observer join section */
.obs-join-section{padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(45,156,219,.07),rgba(124,58,237,.05));border:1.5px solid rgba(45,156,219,.2);margin-bottom:14px}
.obs-join-title{font-size:12px;font-weight:800;color:var(--sky);margin-bottom:10px;display:flex;align-items:center;gap:6px}
.obs-join-input-row{display:flex;gap:7px;margin-bottom:10px}
.obs-join-or{text-align:center;font-size:10px;font-weight:700;color:var(--t3);margin:8px 0;position:relative}
.obs-join-or::before,.obs-join-or::after{content:'';position:absolute;top:50%;width:40%;height:1px;background:var(--bdr)}
.obs-join-or::before{left:0}.obs-join-or::after{right:0}

/* Ongoing sessions list */
.ongoing-list{display:flex;flex-direction:column;gap:7px;margin-bottom:12px}
.ongoing-card{padding:12px 14px;border-radius:12px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .2s;display:flex;gap:11px;align-items:center}
.ongoing-card:hover{border-color:rgba(0,195,122,.3);background:rgba(0,195,122,.04);transform:translateY(-1px)}
.ongoing-card.sel{border-color:var(--em);background:rgba(0,195,122,.06)}
.ongoing-live-dot{width:8px;height:8px;border-radius:50%;animation:pulse 1.2s infinite;flex-shrink:0}
.ongoing-info{flex:1;min-width:0}
.ongoing-topic{font-size:12.5px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ongoing-meta{font-size:10.5px;color:var(--t2);margin-top:2px}
.ongoing-count{font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px}
.ongoing-empty{text-align:center;padding:18px;font-size:12px;color:var(--t3);border-radius:11px;background:var(--surf2);border:1px dashed var(--bdr)}

/* ═══════════════════════════════
   MODALS 
═══════════════════════════════ */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);z-index:700;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .18s ease}
.modal{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);width:100%;max-height:calc(100dvh - 28px);display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh3);animation:slideUp .25s cubic-bezier(.34,1.1,.64,1)}
.mh{padding:14px 18px 12px;border-bottom:1px solid var(--surf3);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.mh-title{font-size:14.5px;font-weight:800;color:var(--t1)}
.mh-close{width:25px;height:25px;border-radius:7px;border:1px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center;font-size:11px;transition:.12s}
.mh-close:hover{color:var(--t1);transform:rotate(90deg)}
.mb{padding:16px 18px;overflow-y:auto;flex:1}
.mf{padding:11px 18px;border-top:1px solid var(--surf3);display:flex;justify-content:flex-end;gap:7px;flex-shrink:0;flex-wrap:wrap}

/* ═══════════════════════════════
   PREPARE WITH AI — FULL FIXED LAYOUT
═══════════════════════════════ */
.prep-page{height:100dvh;background:#08101e;color:#e8ecf2;display:flex;flex-direction:column;overflow:hidden}

/* Top bar */
.prep-bar{height:52px;background:rgba(8,16,30,.98);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 12px;gap:8px;flex-shrink:0;flex-wrap:nowrap;overflow:hidden}
.prep-bar-logo{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;color:#fff;cursor:pointer;border:none;background:none;font-family:var(--font);white-space:nowrap}
.prep-bar-logo-ic{width:26px;height:26px;background:var(--grad);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.prep-bar-div{width:1px;height:14px;background:rgba(255,255,255,.08);flex-shrink:0}
.prep-bar-topic{flex:1;font-size:10.5px;font-weight:500;color:rgba(255,255,255,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.prep-bar-topic strong{color:#e8ecf2;font-weight:700}
.prep-pill{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:9.5px;font-weight:700;flex-shrink:0;border:1px solid;white-space:nowrap}
.pp-timer{background:rgba(0,195,122,.12);border-color:rgba(0,195,122,.2);color:#5ee3b7;font-family:var(--mono)}
.pp-mode{background:rgba(45,156,219,.1);border-color:rgba(45,156,219,.2);color:#7ed3f7}
.pp-demo{background:rgba(246,166,35,.12);border-color:rgba(246,166,35,.22);color:#fcd18e;animation:pulse 1.5s infinite}
.prep-bar-end{padding:4px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.5);cursor:pointer;font-size:10.5px;font-weight:700;transition:.15s;flex-shrink:0;font-family:var(--font);white-space:nowrap}
.prep-bar-end:hover{background:rgba(229,62,62,.16);border-color:rgba(229,62,62,.3);color:var(--red)}

/* 3-column body — fills remaining height */
.prep-body{flex:1;display:grid;grid-template-columns:.85fr 1.1fr 1fr;gap:0;overflow:hidden;border-top:1px solid rgba(255,255,255,.06);min-height:0}

/* Column shared */
.prep-col{display:flex;flex-direction:column;overflow:hidden;border-right:1px solid rgba(255,255,255,.06)}
.prep-col:last-child{border-right:none}
.prep-col-head{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);font-size:10.5px;font-weight:800;color:rgba(255,255,255,.35);letter-spacing:.06em;text-transform:uppercase;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.prep-col-head-badge{font-size:9px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(0,195,122,.12);color:#5ee3b7;text-transform:none;letter-spacing:0}
.prep-col-scroll{overflow-y:auto;flex:1;padding:12px;-webkit-overflow-scrolling:touch}

/* Col 1: Student */
.student-avatar{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,rgba(0,195,122,.3),rgba(45,156,219,.25));display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#5ee3b7;margin:0 auto 12px;border:2px solid rgba(0,195,122,.25)}
.student-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:10px;margin-bottom:8px}
.student-card-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.25);margin-bottom:4px}
.student-card-val{font-size:12.5px;font-weight:700;color:#e8ecf2}
.student-card-sub{font-size:10.5px;color:rgba(255,255,255,.4);margin-top:2px}
.prep-mic-bar{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(0,195,122,.07);border:1px solid rgba(0,195,122,.18);border-radius:10px;margin-bottom:8px;min-height:44px}
.prep-mic-dot{width:7px;height:7px;border-radius:50%;background:var(--em);animation:pulse 1.2s infinite;flex-shrink:0}
.prep-mic-label{font-size:11px;font-weight:700;color:#5ee3b7;flex:1}
.prep-transcript-box{background:rgba(0,195,122,.05);border:1px solid rgba(0,195,122,.15);border-radius:10px;padding:9px 11px;min-height:70px;max-height:120px;overflow-y:auto}
.prep-transcript-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgba(0,195,122,.6);margin-bottom:4px}
.prep-transcript-text{font-size:11px;line-height:1.65;color:rgba(255,255,255,.65);font-family:var(--mono)}
.prep-transcript-cursor{display:inline-block;width:2px;height:11px;background:#5ee3b7;animation:typewriterBlink .8s infinite;margin-left:2px;vertical-align:middle}
.prep-actions{display:flex;flex-direction:column;gap:5px;margin-top:8px}
.prep-action-btn{padding:8px 11px;border-radius:9px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);cursor:pointer;font-size:11.5px;font-weight:700;color:rgba(255,255,255,.7);transition:.18s;font-family:var(--font);display:flex;align-items:center;gap:7px;text-align:left}
.prep-action-btn:hover{background:rgba(0,195,122,.1);border-color:rgba(0,195,122,.28);color:#5ee3b7}
.prep-action-btn.primary{background:var(--grad);border-color:transparent;color:#fff;box-shadow:0 4px 14px rgba(0,195,122,.22)}
.prep-action-btn.primary:hover{transform:translateY(-1px);box-shadow:0 7px 20px rgba(0,195,122,.32)}
.prep-action-btn.demo-active{background:rgba(246,166,35,.12);border-color:rgba(246,166,35,.25);color:#fcd18e}
.prep-action-btn.demo-active:hover{background:rgba(246,166,35,.2)}

/* Col 2: AI Chat — stable layout, no layout shifts */
.ai-chat-wrapper{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0}
.ai-messages{display:flex;flex-direction:column;gap:7px;flex:1;overflow-y:auto;padding:12px;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}
.ai-msg{animation:transcriptIn .22s ease;width:100%}
.ai-msg.from-ai{display:flex;gap:7px;align-items:flex-start}
.ai-msg.from-me{display:flex;flex-direction:row-reverse;gap:7px;align-items:flex-start}
.ai-bubble-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;align-self:flex-end}
.ai-bubble-av.ai-side{background:rgba(45,156,219,.2);color:#7ed3f7;border:1px solid rgba(45,156,219,.2)}
.ai-bubble-av.me-side{background:rgba(0,195,122,.2);color:#5ee3b7;border:1px solid rgba(0,195,122,.2)}
.ai-bubble{padding:8px 11px;border-radius:10px;font-size:12px;line-height:1.6;max-width:86%;word-break:break-word}
.ai-bubble.ai-style{background:rgba(45,156,219,.09);border:1px solid rgba(45,156,219,.15);color:#d0e8ff;border-radius:3px 10px 10px 10px}
.ai-bubble.me-style{background:linear-gradient(135deg,rgba(0,195,122,.8),rgba(0,163,102,.9));color:#fff;border:none;border-radius:10px 3px 10px 10px}
.ai-bubble.system-style{background:rgba(246,166,35,.07);border:1px solid rgba(246,166,35,.18);color:#fcd18e;font-size:11px;border-radius:9px;align-self:center;text-align:center;padding:6px 11px;width:fit-content}
.ai-typing{display:flex;gap:4px;padding:8px 12px;background:rgba(45,156,219,.09);border:1px solid rgba(45,156,219,.15);border-radius:3px 10px 10px 10px;width:fit-content}
.ai-typing-dot{width:5px;height:5px;border-radius:50%;background:#7ed3f7;animation:dotPulse .8s ease-in-out infinite}
.ai-speaking-bar{padding:5px 12px;border-top:1px solid rgba(255,255,255,.06);background:rgba(45,156,219,.07);display:flex;align-items:center;gap:8px;flex-shrink:0;min-height:36px}
.ai-speaking-text{font-size:10px;font-weight:700;color:#7ed3f7}
.ai-input-area{padding:9px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;display:flex;gap:7px;align-items:flex-end;background:rgba(8,16,30,.6)}
.ai-input{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#e8ecf2;font-size:12px;outline:none;resize:none;min-height:34px;max-height:80px;transition:border .15s;font-family:var(--font);line-height:1.5}
.ai-input:focus{border-color:rgba(45,156,219,.5);background:rgba(45,156,219,.06)}
.ai-input::placeholder{color:rgba(255,255,255,.2)}
.ai-send{width:32px;height:32px;border-radius:8px;background:var(--grad);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s;font-size:13px;flex-shrink:0}
.ai-send:hover{transform:scale(1.08)}
.ai-send:disabled{opacity:.35;cursor:not-allowed}

/* Quick prompts */
.quick-prompts{display:flex;gap:5px;flex-wrap:wrap;padding:0 9px 7px}
.quick-p{padding:3px 9px;border-radius:6px;border:1px solid rgba(45,156,219,.22);background:rgba(45,156,219,.07);cursor:pointer;font-size:10px;font-weight:600;color:#7ed3f7;transition:.15s;font-family:var(--font)}
.quick-p:hover{background:rgba(45,156,219,.14);border-color:rgba(45,156,219,.4)}

/* Col 3: Notes Screen */
.notes-screen{flex:1;overflow-y:auto;padding:12px;background:#060d18;-webkit-overflow-scrolling:touch}
.notes-screen-header{display:flex;align-items:center;gap:7px;padding:7px 11px;background:rgba(45,156,219,.08);border:1px solid rgba(45,156,219,.18);border-radius:9px;margin-bottom:10px}
.notes-screen-dot{width:6px;height:6px;border-radius:50%;background:var(--sky);animation:pulse 1.5s infinite;flex-shrink:0}
.notes-screen-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#7ed3f7}
.note-item{padding:9px 11px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);margin-bottom:7px;animation:fadeUp .25s ease;transition:.2s}
.note-item:hover{background:rgba(0,195,122,.06);border-color:rgba(0,195,122,.18)}
.note-item-n{font-size:8.5px;font-weight:800;color:var(--em);margin-bottom:3px;text-transform:uppercase;letter-spacing:.06em}
.note-item-text{font-size:11px;line-height:1.65;color:rgba(255,255,255,.72)}
.note-item-text strong{color:#5ee3b7;font-weight:700}
.notes-empty{text-align:center;padding:24px 14px;font-size:11.5px;color:rgba(255,255,255,.25)}

/* ═══════════════════════════════
   SEMINAR ROOM (PRESENTER)
═══════════════════════════════ */
.room-page{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:#07111e}

/* Room bar */
.room-bar{height:50px;background:rgba(7,17,30,.98);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 10px;gap:6px;flex-shrink:0;z-index:100;overflow:hidden}
.room-logo{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#fff;border:none;background:none;cursor:pointer;font-family:var(--font);flex-shrink:0}
.room-logo-ic{width:24px;height:24px;background:var(--grad);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px}
.room-divider{width:1px;height:14px;background:rgba(255,255,255,.08);flex-shrink:0}
.room-topic{flex:1;font-size:10.5px;color:rgba(255,255,255,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;min-width:0}
.room-topic strong{color:#e8ecf2;font-weight:700}
.r-pill{display:flex;align-items:center;gap:3px;padding:2px 7px;border-radius:5px;font-size:9.5px;font-weight:700;flex-shrink:0;border:1px solid;white-space:nowrap}
.rp-timer{background:rgba(0,195,122,.12);border-color:rgba(0,195,122,.2);color:#5ee3b7;font-family:var(--mono)}
.rp-rec{background:rgba(229,62,62,.12);border-color:rgba(229,62,62,.2);color:var(--red);animation:recBlink 1.4s infinite}
.rp-rec-dot{width:5px;height:5px;border-radius:50%;background:var(--red)}
.rp-ai{background:rgba(45,156,219,.1);border-color:rgba(45,156,219,.18);color:#7ed3f7}
.rp-live{background:rgba(229,62,62,.12);border-color:rgba(229,62,62,.25);color:var(--red)}
.rbar-end-btn{padding:3px 9px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.5);cursor:pointer;font-size:10.5px;font-weight:700;transition:.15s;flex-shrink:0;font-family:var(--font)}
.rbar-end-btn:hover{background:rgba(229,62,62,.15);border-color:rgba(229,62,62,.3);color:var(--red)}

/* Body */
.room-body{flex:1;display:flex;min-height:0;overflow:hidden}
.grid-area{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;position:relative}

/* Screen share area */
.ss-area{flex:1;background:#030a14;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;min-height:0}
.ss-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:rgba(255,255,255,.2)}
.ss-active-label{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(0,195,122,.15);border:1px solid rgba(0,195,122,.3);border-radius:8px;padding:5px 14px;font-size:11px;font-weight:700;color:#5ee3b7;white-space:nowrap;display:flex;align-items:center;gap:6px}
.ss-active-dot{width:6px;height:6px;border-radius:50%;background:var(--em);animation:pulse 1s infinite}

/* Presenter strip */
.presenter-strip{height:100px;background:rgba(0,0,0,.4);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:6px;padding:6px 10px;overflow-x:auto;flex-shrink:0}
.strip-tile{width:130px;min-width:130px;height:84px;border-radius:10px;background:#0d1e34;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(255,255,255,.06);transition:.2s;flex-shrink:0}
.strip-tile.spk{border-color:var(--em);box-shadow:0 0 12px rgba(0,195,122,.2)}
.strip-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;width:36px;height:36px;font-size:14px}
.strip-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.85));padding:10px 6px 5px;display:flex;align-items:flex-end;justify-content:space-between}
.strip-name{font-size:9.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.strip-muted{font-size:9px}

/* Transcript bar */
.live-transcript-bar{padding:6px 10px;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.35);flex-shrink:0}
.lt-label{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:rgba(0,195,122,.6);margin-bottom:2px;display:flex;align-items:center;gap:4px}
.lt-dot{width:5px;height:5px;border-radius:50%;background:var(--em);animation:pulse 1.2s infinite;flex-shrink:0}
.lt-text{font-size:10px;color:rgba(255,255,255,.55);line-height:1.5;font-family:var(--mono);min-height:14px}

/* Controls */
.ctrl-bar{min-height:58px;padding:6px 10px;background:rgba(7,17,30,.98);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:5px;flex-wrap:wrap}
.cg{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.cbtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.08);cursor:pointer;background:rgba(255,255,255,.04);color:rgba(255,255,255,.45);font-size:8px;font-weight:700;transition:all .16s;min-width:38px;font-family:var(--font)}
.cbtn-ic{font-size:13px;transition:transform .18s}
.cbtn:hover{background:rgba(255,255,255,.09);color:#fff;border-color:rgba(255,255,255,.18);transform:translateY(-1px)}
.cbtn.on{background:rgba(0,195,122,.1);border-color:rgba(0,195,122,.3);color:#5ee3b7}
.cbtn.off{background:rgba(229,62,62,.08);border-color:rgba(229,62,62,.25);color:var(--red)}
.cbtn.hi{background:rgba(45,156,219,.1);border-color:rgba(45,156,219,.28);color:#7ed3f7}
.cbtn.am{background:rgba(246,166,35,.1);border-color:rgba(246,166,35,.25);color:#fcd18e}
.cbtn.em{background:rgba(0,195,122,.1);border-color:rgba(0,195,122,.25);color:#5ee3b7}
.cbtn.rec{background:rgba(229,62,62,.12);border-color:rgba(229,62,62,.4);color:var(--red);animation:recBlink 1.4s infinite}
.cbtn:disabled{opacity:.25;cursor:not-allowed;transform:none}
.end-room-btn{padding:6px 13px;border-radius:8px;border:none;cursor:pointer;background:linear-gradient(135deg,#e53e3e,#c53030);color:#fff;font-size:11px;font-weight:800;font-family:var(--font);box-shadow:0 3px 10px rgba(229,62,62,.24);transition:.18s;white-space:nowrap}
.end-room-btn:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(229,62,62,.38)}
.react-pop{position:absolute;bottom:calc(100% + 7px);left:50%;transform:translateX(-50%);background:#0d1e34;border:1px solid rgba(255,255,255,.1);border-radius:11px;padding:6px 8px;display:flex;gap:4px;box-shadow:var(--sh2);z-index:200;animation:scaleIn .18s ease}
.react-em{font-size:18px;cursor:pointer;padding:3px;border-radius:6px;border:none;background:none;transition:.14s}
.react-em:hover{transform:scale(1.4)}

/* Side panel */
.side-panel{width:260px;min-width:260px;background:rgba(7,17,30,.98);border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden}
.panel-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.ptab{flex:1;padding:8px 3px;background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,.28);font-size:8px;font-weight:700;cursor:pointer;transition:.16s;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:var(--font);text-transform:uppercase;letter-spacing:.05em}
.ptab:hover{color:rgba(255,255,255,.6)}
.ptab.active{color:#5ee3b7;border-bottom-color:var(--em)}
.ptab-close{flex:0 0 auto;padding:8px;color:rgba(255,255,255,.2);cursor:pointer;border:none;background:none;font-size:11px;transition:.15s;font-family:var(--font)}
.ptab-close:hover{color:rgba(255,255,255,.6)}
.pscroll{flex:1;overflow-y:auto;min-height:0;-webkit-overflow-scrolling:touch}

/* People list */
.p-list{padding:7px;display:flex;flex-direction:column;gap:4px}
.p-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:.16s}
.p-row:hover{border-color:rgba(0,195,122,.25);background:rgba(0,195,122,.06)}
.p-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
.p-info{flex:1;min-width:0}
.p-name{font-size:11px;font-weight:700;color:#e8ecf2}
.p-role{font-size:9px;color:rgba(255,255,255,.28)}

/* Chat */
.chat-msgs{padding:8px;display:flex;flex-direction:column;gap:5px}
.chat-msg{display:flex;gap:5px;animation:fadeUp .18s ease}
.chat-msg.own{flex-direction:row-reverse}
.chat-av-s{width:18px;height:18px;border-radius:50%;font-size:7.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:flex-end}
.chat-bw{display:flex;flex-direction:column;gap:2px;max-width:84%}
.chat-msg.own .chat-bw{align-items:flex-end}
.chat-sender{font-size:8.5px;font-weight:700;color:rgba(255,255,255,.25)}
.chat-bubble{padding:5px 8px;border-radius:9px;font-size:11px;line-height:1.5;word-break:break-word}
.b-o{background:rgba(255,255,255,.07);color:#e8ecf2;border:1px solid rgba(255,255,255,.07);border-radius:3px 9px 9px 9px}
.b-own{background:var(--grad);color:#fff;border-radius:9px 3px 9px 9px}
.chat-t{font-size:8px;color:rgba(255,255,255,.18)}
.chat-empty{text-align:center;color:rgba(255,255,255,.2);font-size:11px;padding:18px 10px;line-height:1.7}
.chat-ia{padding:7px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:5px;align-items:flex-end;flex-shrink:0}
.chat-inp{flex:1;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#e8ecf2;font-size:11px;outline:none;resize:none;min-height:30px;max-height:64px;transition:border .14s;font-family:var(--font)}
.chat-inp:focus{border-color:var(--em)}
.chat-inp::placeholder{color:rgba(255,255,255,.2)}
.chat-send{width:28px;height:28px;border-radius:7px;background:var(--grad);border:none;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;transition:.15s}
.chat-send:hover{transform:scale(1.1)}

/* AI Summary panel */
.ai-sum-pad{padding:9px;display:flex;flex-direction:column;gap:7px}
.ai-sum-card{background:rgba(0,195,122,.07);border:1px solid rgba(0,195,122,.18);border-radius:11px;padding:10px}
.ai-sum-lbl{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.28);margin-bottom:5px}
.ai-sum-val{font-size:11.5px;font-weight:600;color:rgba(255,255,255,.7);line-height:1.6}
.ai-sum-dot{width:6px;height:6px;border-radius:50%;background:var(--em);animation:pulse 1.5s infinite;display:inline-block;margin-right:5px}

/* Observer room */
.obs-room-page{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:#07111e}
.obs-main{flex:1;display:flex;min-height:0;overflow:hidden}
.obs-content{flex:1;display:flex;flex-direction:column;overflow:hidden}
.obs-stage{flex:1;background:#030a14;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;min-height:0}
.obs-presenter-bar{background:rgba(0,0,0,.5);border-top:1px solid rgba(255,255,255,.06);padding:8px 10px;display:flex;align-items:center;gap:8px;flex-shrink:0}
.obs-presenter-av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;border:2px solid rgba(0,195,122,.3);flex-shrink:0}
.obs-presenter-info{flex:1;min-width:0}
.obs-presenter-name{font-size:12px;font-weight:800;color:#e8ecf2}
.obs-presenter-meta{font-size:10px;color:rgba(255,255,255,.4)}
.obs-ctrl{padding:6px 10px;background:rgba(7,17,30,.98);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap}

/* Rec overlay */
.rec-ovl{position:fixed;top:58px;right:12px;background:rgba(229,62,62,.9);border-radius:7px;padding:3px 10px;font-size:11px;font-weight:800;color:#fff;z-index:200;animation:recBlink 1.4s infinite;font-family:var(--mono)}

/* ═══════════════════════════════
   ANALYSIS
═══════════════════════════════ */
.analysis-bg{position:fixed;inset:0;background:rgba(0,0,0,.68);backdrop-filter:blur(12px);z-index:800;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease}
.analysis-box{background:#0c1422;border:1px solid rgba(0,195,122,.2);border-radius:var(--r);width:100%;max-width:620px;max-height:88dvh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh3);animation:slideUp .27s ease}
.analysis-head{padding:13px 17px 11px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.analysis-title{font-size:14px;font-weight:800;color:#e8ecf2}
.analysis-body{overflow-y:auto;flex:1;padding:14px 17px}
.a-sec{margin-bottom:13px;animation:fadeUp .35s ease both}
.a-sec-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.28);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.07)}
.prog-wrap{margin-bottom:4px}
.prog-lbl{display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,.4);font-weight:600;margin-bottom:2px}
.prog-track{height:4px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden}
.prog-fill{height:100%;border-radius:3px;transition:width 1s ease}
.analysis-foot{padding:10px 17px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:flex-end;gap:7px;flex-shrink:0}

/* ─── RESULTS LOADER ─── */
.results-loader{position:fixed;inset:0;background:rgba(8,16,30,.96);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;animation:fadeIn .2s ease}
.results-loader-icon{font-size:48px;animation:scaleIn .5s cubic-bezier(.34,1.56,.64,1) both}
.results-loader-title{font-size:16px;font-weight:800;color:#e8ecf2}
.results-loader-sub{font-size:11px;color:rgba(255,255,255,.35)}
.results-loader-steps{display:flex;flex-direction:column;gap:8px;margin-top:10px;width:280px}
.results-loader-step{display:flex;align-items:center;gap:9px;padding:7px 11px;border-radius:9px;font-size:11px;font-weight:700;transition:all .3s}
.results-loader-step.done{background:rgba(0,195,122,.1);border:1px solid rgba(0,195,122,.2);color:#5ee3b7}
.results-loader-step.active{background:rgba(45,156,219,.1);border:1px solid rgba(45,156,219,.2);color:#7ed3f7}
.results-loader-step.pending{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.3)}

/* ═══════════════════════════════
   RESULTS
═══════════════════════════════ */
.results-page{flex:1;overflow-y:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:clamp(18px,4vw,52px);text-align:center;background:radial-gradient(ellipse at 50% 20%,rgba(0,195,122,.07) 0%,transparent 65%);-webkit-overflow-scrolling:touch}
.res-trophy{font-size:clamp(42px,8vw,64px);margin-bottom:12px;animation:scaleIn .55s cubic-bezier(.34,1.56,.64,1) .15s both}
.res-h{font-size:clamp(17px,3vw,28px);font-weight:900;letter-spacing:-.4px;margin-bottom:6px;color:var(--t1)}
.res-sub{font-size:12px;color:var(--t2);max-width:320px;line-height:1.75;margin-bottom:16px}
.res-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;width:100%;max-width:300px;margin-bottom:14px}
.res-stat{background:var(--surf);border:1px solid var(--bdr);border-radius:13px;padding:10px;box-shadow:var(--sh);animation:fadeUp .35s ease both;text-align:center;transition:all .22s}
.res-stat:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,195,122,.1)}
.res-stat-ic{font-size:16px;margin-bottom:3px}
.res-stat-v{font-size:clamp(14px,2vw,20px);font-weight:900;color:var(--em)}
.res-stat-l{font-size:9px;color:var(--t3);margin-top:1px}
.res-acts{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}

/* Schedule modal */
.sched-info{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;background:rgba(0,195,122,.06);border:1px solid rgba(0,195,122,.16);margin-bottom:12px}
.sched-info-text{font-size:11.5px;font-weight:700;color:var(--em)}
.sched-info-sub{font-size:10.5px;color:var(--t2)}

/* ═══════════════════════════════
   RESPONSIVE
═══════════════════════════════ */
@media(max-width:1024px){
  .sp-setup{grid-template-columns:34% 1fr}
  .side-panel{width:240px;min-width:240px}
}
@media(max-width:860px){
  .sp-setup{grid-template-columns:1fr;height:auto;overflow:visible}
  html,body{overflow:auto}
  .sp-app{height:auto;overflow:visible}
  .sp-left{min-height:auto}
  .sp-left-inner{padding:18px 16px}
  .sp-features{display:grid;grid-template-columns:1fr 1fr;gap:5px}
  .ctx-chip{display:none}
  .sp-right{height:auto;overflow:visible}
  .sp-right-scroll{overflow:visible;height:auto}
  /* Prep room: stack */
  .prep-page{height:auto;overflow:auto}
  .prep-body{grid-template-columns:1fr;overflow:visible;height:auto}
  .prep-col{min-height:350px;border-right:none;border-bottom:1px solid rgba(255,255,255,.06)}
  .prep-col:last-child{border-bottom:none}
  .prep-col-scroll{overflow:visible;height:auto;min-height:300px}
  .side-panel{width:100%;min-width:unset;border-left:none;border-top:1px solid rgba(255,255,255,.07);max-height:320px}
  .room-body{flex-direction:column}
}
@media(max-width:640px){
  .fi-row{grid-template-columns:1fr}
  .module-grid{grid-template-columns:1fr}
  .submode-grid{grid-template-columns:1fr 1fr}
  .timing-grid{grid-template-columns:1fr}
  .sp-features{grid-template-columns:1fr}
  .ctrl-bar{padding:5px 7px;gap:4px}
  .cg{gap:2px}
  .cbtn{padding:5px 4px;min-width:34px;font-size:7px}
  .cbtn-ic{font-size:12px}
  .side-panel{display:none}
  .res-stats{grid-template-columns:1fr 1fr 1fr}
  .prep-bar-logo span{display:none}
  .obs-main{flex-direction:column}
  .obs-side-panel-mobile{width:100%;border-left:none;border-top:1px solid rgba(255,255,255,.07);max-height:260px}
}
@media(max-width:480px){
  .prep-body{grid-template-columns:1fr}
  .room-bar{height:44px}
  .r-pill{font-size:8.5px;padding:2px 5px}
  .strip-tile{width:110px;min-width:110px;height:70px}
  .res-acts{flex-direction:column;width:100%;max-width:280px}
  .res-acts button{width:100%}
  .submode-grid{grid-template-columns:1fr}
  .prep-bar{height:48px;padding:0 8px;gap:5px}
  .prep-bar-topic{display:none}
}
`;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const COLORS = ["#00c37a","#6366f1","#f59e0b","#38bdf8","#ec4899","#8b5cf6","#f97316","#06b6d4"];
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

const TOPICS = [
  "Should AI replace human teachers?",
  "Is social media harmful to democracy?",
  "Should coding be mandatory in schools?",
  "Is nuclear energy the answer to climate change?",
  "Should universal basic income be implemented?",
  "Is space exploration worth the cost?",
  "Should animal testing be banned?",
  "The ethics of gene editing in humans",
];

const AI_RESPONSES: Record<string,string> = {
  outline: `OUTLINE for your seminar:\n1. Opening hook — a question or statistic\n2. Introduce the topic clearly in 2 sentences\n3. Present 3 main arguments with evidence\n4. Address counterarguments\n5. Conclude with a call to action or reflection`,
  questions: `Likely audience questions:\n• What evidence supports your main claim?\n• What are the risks of your proposed stance?\n• How does this apply in different contexts?\n• What would opponents say?\n• What is your personal position?`,
  examples: `Strong examples to use:\n• Academic research or statistics\n• Real-world case studies\n• Historical precedents\n• Recent news events\n• Personal or expert anecdotes`,
  script: `Opening script:\n"Good [morning/afternoon] everyone. Today I will be presenting on [topic]. This is a critical issue because [reason]. In the next [X] minutes, I will cover [point 1], [point 2], and [point 3], before opening for questions."`,
  feedback: `Demo Feedback:\n✅ Clear structure — introduction was confident\n✅ Used evidence well in section 2\n⚠️ Slow down during key points\n⚠️ Add a stronger closing statement\n💡 Tip: end with a question to the audience`,
};

const AI_ROOM_LINES = [
  "Excellent point! Let's explore how your audience might counter this argument.",
  "Building on that — has anyone considered the long-term societal implications?",
  "Fascinating perspective. What evidence most strongly supports your position?",
  "That touches on a key tension in this debate. Let's unpack it together.",
  "How might someone from a different cultural background view this argument?",
  "Remember to pace yourself — let your key points breathe for the audience.",
  "You're covering the topic well. Try to invite questions from your observers now.",
  "That's the crux of the issue. Make sure your evidence backs it up clearly.",
];

// ─── DEMO SESSIONS (pre-populated for observer to join) ──────────────────────
const DEMO_SESSIONS = [
  {
    id: "demo-001",
    type: "seminar",
    title: "Should AI replace human teachers?",
    subject: "Computer Science",
    unit: "AI & ML",
    date: new Date().toISOString().slice(0,10),
    time: "10:30",
    status: "live",
    roles: ["Observer","Participant"],
    createdAt: new Date().toISOString(),
    presenterName: "Alex Johnson",
    observerCount: 8,
    isDemo: true,
  },
  {
    id: "demo-002",
    type: "seminar",
    title: "Is nuclear energy the answer to climate change?",
    subject: "Physics",
    unit: "Thermodynamics",
    date: new Date().toISOString().slice(0,10),
    time: "11:00",
    status: "live",
    roles: ["Observer"],
    createdAt: new Date().toISOString(),
    presenterName: "Priya Sharma",
    observerCount: 14,
    isDemo: true,
  },
  {
    id: "demo-003",
    type: "seminar",
    title: "The ethics of gene editing in humans",
    subject: "Biology",
    unit: "Genetics",
    date: new Date().toISOString().slice(0,10),
    time: "14:00",
    status: "upcoming",
    roles: ["Observer","Participant"],
    createdAt: new Date().toISOString(),
    presenterName: "Marcus Chen",
    observerCount: 3,
    isDemo: true,
  },
  {
    id: "demo-004",
    type: "seminar",
    title: "Should universal basic income be implemented?",
    subject: "Economics",
    unit: "Macroeconomics",
    date: new Date().toISOString().slice(0,10),
    time: "15:30",
    status: "upcoming",
    roles: ["Observer"],
    createdAt: new Date().toISOString(),
    presenterName: "Fatima Al-Hassan",
    observerCount: 0,
    isDemo: true,
  },
];

const COMMUNITY_SESSIONS_KEY = "gradeup_community_sessions_v1";

const avColor = (n: string) => COLORS[(n || "U").charCodeAt(0) % COLORS.length];
const avInit  = (n: string) => (n || "U").split(/[_\s]/).map((w:string) => w[0]).join("").slice(0,2).toUpperCase();
const genId   = () => Math.random().toString(36).slice(2,12);
const genRoomLink = (id: string) => `${typeof window!=="undefined"?window.location.origin:""}/seminar/join?room=${id}`;

function publishCommunitySession(session: any) {
  try {
    const prev = JSON.parse(localStorage.getItem(COMMUNITY_SESSIONS_KEY) || "[]");
    const next = [session, ...prev.filter((s: any) => s.id !== session.id)].slice(0,20);
    localStorage.setItem(COMMUNITY_SESSIONS_KEY, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent("storage", { key: COMMUNITY_SESSIONS_KEY }));
  } catch {}
}

function getCommunitySessions(): any[] {
  try {
    const stored = JSON.parse(localStorage.getItem(COMMUNITY_SESSIONS_KEY) || "[]");
    // Merge stored with demo sessions, demo sessions always shown
    const storedIds = new Set(stored.map((s:any) => s.id));
    const demos = DEMO_SESSIONS.filter(d => !storedIds.has(d.id));
    return [...stored, ...demos];
  } catch {
    return DEMO_SESSIONS;
  }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useTimer(running: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setS(x => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef<any>(null);

  const start = useCallback((onResult: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onstart = () => setIsListening(true);
    rec.onend   = () => setIsListening(false);
    rec.onresult = (e: any) => {
      let final = "", interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      const combined = (final + " " + interim).trim();
      setTranscript(combined);
      if (final.trim()) onResult(final.trim());
    };
    rec.onerror = () => setIsListening(false);
    recRef.current = rec;
    try { rec.start(); } catch {}
  }, []);

  const stop = useCallback(() => { recRef.current?.stop(); setIsListening(false); setTranscript(""); }, []);
  return { transcript, isListening, start, stop };
}

function useAIVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice|null>(null);

  useEffect(() => {
    const pick = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      voiceRef.current = v.find(x=>x.name.includes("Google UK English")) || v.find(x=>x.lang.startsWith("en")&&!x.localService) || v[0] || null;
    };
    pick();
    window.speechSynthesis?.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", pick);
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!("speechSynthesis" in window)) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 1.05; u.volume = 1;
    if (voiceRef.current) u.voice = voiceRef.current;
    u.onstart = () => setIsSpeaking(true);
    u.onend   = () => { setIsSpeaking(false); onDone?.(); };
    u.onerror = () => { setIsSpeaking(false); onDone?.(); };
    setTimeout(() => window.speechSynthesis.speak(u), 80);
  }, []);

  const cancel = useCallback(() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); }, []);
  return { isSpeaking, speak, cancel };
}

function useToast() {
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const show = (msg: string, type = "success") => setToast({ msg, type });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast ? (
    <div className={`sp-toast ${toast.type}`} onClick={() => setToast(null)}>
      {toast.type==="success"?"✅":toast.type==="error"?"❌":toast.type==="warn"?"⚠️":"ℹ️"} {toast.msg}
    </div>
  ) : null;
  return { show, node };
}

// ─── PAGE LOADER ──────────────────────────────────────────────────────────────
function PageLoader({ label = "Launching…", sublabel = "Setting up your session" }: { label?: string; sublabel?: string }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 18 + 8;
      if (p >= 100) { p = 100; clearInterval(id); }
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
        <div className="page-loader-fill" style={{width:`${progress}%`, transition:"width .25s ease"}}/>
      </div>
    </div>
  );
}

// ─── RESULTS LOADER ───────────────────────────────────────────────────────────
function ResultsLoader({ onDone, isObserver }: { onDone: () => void; isObserver?: boolean }) {
  const steps = isObserver
    ? [
        { label:"Saving session notes", icon:"📝" },
        { label:"Updating your progress", icon:"📈" },
        { label:"Preparing summary", icon:"🎓" },
      ]
    : [
        { label:"Analysing your delivery", icon:"🎙️" },
        { label:"Scoring clarity & depth", icon:"📊" },
        { label:"Generating AI feedback", icon:"🤖" },
        { label:"Preparing full report", icon:"🏅" },
      ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const delays = isObserver ? [600, 1100, 1700] : [500, 1100, 1700, 2300];
    const timers: ReturnType<typeof setTimeout>[] = [];
    delays.forEach((d, i) => {
      timers.push(setTimeout(() => setStep(i + 1), d));
    });
    timers.push(setTimeout(() => onDone(), isObserver ? 2200 : 2900));
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line

  return (
    <div className="results-loader">
      <div className="results-loader-icon">{isObserver ? "👁️" : "📊"}</div>
      <div className="results-loader-title">{isObserver ? "Wrapping up…" : "Generating your report…"}</div>
      <div className="results-loader-sub">{isObserver ? "Thank you for observing" : "AI is reviewing your performance"}</div>
      <div className="results-loader-steps">
        {steps.map((s, i) => (
          <div key={i} className={`results-loader-step ${i < step ? "done" : i === step ? "active" : "pending"}`}>
            <span style={{fontSize:14}}>{s.icon}</span>
            <span>{i < step ? "✓ " : ""}{s.label}</span>
            {i === step && <span className="loader-spin" style={{marginLeft:"auto"}}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SOUND ANALYSER ───────────────────────────────────────────────────────────
function SoundAnalyser({ active, color = "#00c37a", bars = 7, size = 32 }: { active: boolean; color?: string; bars?: number; size?: number }) {
  return (
    <div
      className={`sound-analyser${active ? " active" : ""}`}
      style={{ height: size, "--color": color } as React.CSSProperties}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} className="bar" style={{ height: active ? undefined : 3 }} />
      ))}
    </div>
  );
}

// ─── SMALL SHARED COMPONENTS ──────────────────────────────────────────────────
function WaveBars({ color="#00c37a", n=5, height=18 }: { color?: string; n?: number; height?: number }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"2px",height}}>
      {Array.from({length:n}).map((_,i) => (
        <div key={i} style={{width:"2.5px",borderRadius:2,background:color,animation:`waveBar .6s ease-in-out infinite`,animationDelay:`${i*0.1}s`}}/>
      ))}
    </div>
  );
}

// ─── SCHEDULE MODAL ───────────────────────────────────────────────────────────
function ScheduleSeminarModal({ config, onSchedule, onClose }: any) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!date) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    try {
      const ev = { id:`sem-${Date.now()}`, title:config?.topic||"Seminar", type:"seminar", date, startTime:time, subject:config?.subject||"", unit:config?.unit||"", link:config?.roomLink||"" };
      const ex = JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");
      localStorage.setItem("gradeup_cal_events_v3", JSON.stringify([...ex, ev]));
      window.dispatchEvent(new StorageEvent("storage", { key:"gradeup_cal_events_v3" }));
      publishCommunitySession({ id:ev.id, type:"seminar", title:ev.title, subject:ev.subject, unit:ev.unit, date, time, link:ev.link, roles:["Observer","Participant"], createdAt:new Date().toISOString(), status:"upcoming" });
    } catch {}
    setSaving(false);
    onSchedule({ date, time });
  }

  return (
    <div className="overlay">
      <div className="modal" style={{maxWidth:400}}>
        <div className="mh"><span className="mh-title">📅 Schedule Seminar</span><button className="mh-close" onClick={onClose}>✕</button></div>
        <div className="mb">
          <div className="sched-info">
            <span style={{fontSize:20}}>📅</span>
            <div>
              <div className="sched-info-text">Auto-synced to Calendar & Community</div>
              <div className="sched-info-sub">Anyone in your group can join as Observer or Participant</div>
            </div>
          </div>
          {config?.topic && (
            <div style={{padding:"8px 11px",borderRadius:9,background:"rgba(0,195,122,.06)",border:"1px solid rgba(0,195,122,.16)",marginBottom:12,fontSize:12.5,fontWeight:700,color:"var(--t1)"}}>
              🎓 "{config.topic}"
            </div>
          )}
          <div className="fi-row fi">
            <div><label className="fl">Date *</label><input className="finput" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
            <div><label className="fl">Time</label><input className="finput" type="time" value={time} onChange={e=>setTime(e.target.value)}/></div>
          </div>
        </div>
        <div className="mf">
          <button className="btn-s" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-p" style={{width:"auto",padding:"8px 20px"}} onClick={save} disabled={!date||saving}>
            {saving ? <><span className="loader-spin"/>Scheduling…</> : "📅 Schedule & Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ANALYSIS MODAL ───────────────────────────────────────────────────────────
function AnalysisModal({ topic, subject, unit, timer, exchanges, presenterName, onClose }: any) {
  const scores = { delivery: 68+Math.floor(Math.random()*28), clarity: 62+Math.floor(Math.random()*30), depth: 55+Math.floor(Math.random()*38), engagement: 70+Math.floor(Math.random()*25) };
  const overall = Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/4);

  function download() {
    const t = `SeminarArena Report\nTopic: ${topic}\nSubject: ${subject||"—"}\nUnit: ${unit||"—"}\nDuration: ${timer}\nPresenter: ${presenterName||"—"}\nExchanges: ${exchanges||0}\n\nPerformance:\nDelivery: ${scores.delivery}%\nClarity: ${scores.clarity}%\nDepth: ${scores.depth}%\nEngagement: ${scores.engagement}%\nOverall: ${overall}/100`;
    const b = new Blob([t],{type:"text/plain"});
    const u = URL.createObjectURL(b);
    const a = document.createElement("a"); a.href=u; a.download="seminar-report.txt"; a.click(); URL.revokeObjectURL(u);
  }

  return (
    <div className="analysis-bg" onClick={onClose}>
      <div className="analysis-box" onClick={e=>e.stopPropagation()}>
        <div className="analysis-head">
          <div className="analysis-title">📊 Seminar Performance Report</div>
          <button style={{width:24,height:24,borderRadius:6,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.05)",cursor:"pointer",color:"rgba(255,255,255,.5)",fontSize:11}} onClick={onClose}>✕</button>
        </div>
        <div className="analysis-body">
          <div className="a-sec" style={{animationDelay:"0s"}}>
            <div className="a-sec-title">Session Overview</div>
            <div style={{padding:"8px 11px",borderRadius:9,background:"rgba(0,195,122,.07)",border:"1px solid rgba(0,195,122,.16)",fontSize:12.5,fontWeight:700,color:"#e8ecf2",marginBottom:7}}>"{topic}"</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap" as const}}>
              {[`📚 ${subject||"—"}`,`📖 ${unit||"—"}`,`⏱ ${timer}`,`💬 ${exchanges||0} exchanges`].map(t=>(
                <span key={t} style={{padding:"2px 9px",borderRadius:20,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)"}}>{t}</span>
              ))}
            </div>
          </div>

          <div className="a-sec" style={{animationDelay:".08s"}}>
            <div className="a-sec-title">Presenter Performance</div>
            <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:10,padding:"11px 13px"}}>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:avColor(presenterName||"U")+"22",color:avColor(presenterName||"U"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800}}>
                  {avInit(presenterName||"?")}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#e8ecf2"}}>{presenterName}</div>
                  <div style={{fontSize:10.5,color:"rgba(255,255,255,.35)"}}>Seminar Presenter</div>
                </div>
                <div style={{fontSize:22,fontWeight:900,color:"#5ee3b7"}}>{overall}</div>
              </div>
              {([["Delivery",scores.delivery,"#00c37a"],["Clarity",scores.clarity,"#38bdf8"],["Depth",scores.depth,"#f59e0b"],["Audience Engagement",scores.engagement,"#ec4899"]] as [string,number,string][]).map(([l,v,c])=>(
                <div key={l} className="prog-wrap">
                  <div className="prog-lbl"><span>{l}</span><span>{v}%</span></div>
                  <div className="prog-track"><div className="prog-fill" style={{width:`${v}%`,background:c}}/></div>
                </div>
              ))}
            </div>
          </div>

          <div className="a-sec" style={{animationDelay:".16s"}}>
            <div className="a-sec-title">AI Feedback</div>
            <div style={{display:"flex",flexDirection:"column" as const,gap:6}}>
              {[
                {ic:"✅",c:"rgba(0,195,122,.08)",bc:"rgba(0,195,122,.2)",t:"#5ee3b7",msg:"Strong opening with clear thesis statement established."},
                {ic:"✅",c:"rgba(0,195,122,.08)",bc:"rgba(0,195,122,.2)",t:"#5ee3b7",msg:"Good use of evidence to support main arguments."},
                {ic:"⚠️",c:"rgba(246,166,35,.06)",bc:"rgba(246,166,35,.18)",t:"#fcd18e",msg:"Consider slowing down during key points for emphasis."},
                {ic:"💡",c:"rgba(45,156,219,.06)",bc:"rgba(45,156,219,.18)",t:"#7ed3f7",msg:"End with a strong question or call-to-action to engage observers."},
              ].map((f,i)=>(
                <div key={i} style={{display:"flex",gap:9,padding:"8px 11px",borderRadius:9,background:f.c,border:`1px solid ${f.bc}`}}>
                  <span style={{fontSize:15,flexShrink:0}}>{f.ic}</span>
                  <span style={{fontSize:11.5,fontWeight:600,color:f.t,lineHeight:1.5}}>{f.msg}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="a-sec" style={{animationDelay:".22s"}}>
            <div className="a-sec-title">Verdict</div>
            <div style={{padding:"12px 14px",borderRadius:11,border:"1.5px solid rgba(0,195,122,.35)",background:"rgba(0,195,122,.07)",textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:900,color:"#5ee3b7",marginBottom:2}}>🏅 {overall>=85?"Outstanding Seminar":overall>=70?"Strong Presentation":"Good Effort — Keep Practising"}</div>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.45)"}}>Overall score: {overall}/100 · Keep refining your delivery and depth.</div>
            </div>
          </div>
        </div>
        <div className="analysis-foot">
          <button className="btn-s" style={{background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)"}} onClick={onClose}>Close</button>
          <button className="btn-p" style={{width:"auto",padding:"7px 15px",fontSize:12}} onClick={download}>📥 Download Report</button>
        </div>
      </div>
    </div>
  );
}

// ─── SETUP ────────────────────────────────────────────────────────────────────
function SeminarSetup({ onBack, onLaunch }: { onBack?: () => void; onLaunch: (cfg: any) => void }) {
  const { user } = useAuth();
  const [name, setName]             = useState(user ? `${user.firstName} ${user.lastName}` : "");
  const [seminarMode, setSeminarMode] = useState<"prepare"|"session"|"">("");
  const [sessionSubMode, setSessionSubMode] = useState<"presenter"|"observer"|"">("");
  const [subject, setSubject]       = useState("");
  const [unit, setUnit]             = useState("");
  const [topic, setTopic]           = useState("");
  const [custom, setCustom]         = useState("");
  const [seminarType, setSeminarType] = useState<"instant"|"schedule"|"">("instant");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduled, setScheduled]   = useState(false);
  const [scheduledInfo, setScheduledInfo] = useState<any>(null);
  const [copied, setCopied]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [joining, setJoining]       = useState(false);
  const [joinProgress, setJoinProgress] = useState(0);
  const [micGranted, setMicGranted] = useState(false);
  const [micStream, setMicStream]   = useState<MediaStream|null>(null);
  const [joinId, setJoinId]         = useState("");
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [onlineSessions, setOnlineSessions]   = useState<any[]>([]);
  const roomId    = useRef(genId());
  const roomLink  = genRoomLink(roomId.current);
  const { show: toast$, node: toastNode } = useToast();
  const finalTopic = topic === "__custom__" ? custom : topic;
  const availableUnits = subject ? SUBJECT_UNITS[subject] || [] : [];

  useEffect(() => {
    const load = () => {
      const s = getCommunitySessions().filter((s:any) => s.type==="seminar");
      setOnlineSessions(s);
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  const copyLink = () => { navigator.clipboard.writeText(roomLink); setCopied(true); setTimeout(()=>setCopied(false),2200); };

  async function requestMic() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setMicStream(s); setMicGranted(true); toast$("🎤 Microphone enabled","success");
    } catch {
      toast$("Mic permission denied — required to continue","error");
    }
  }

  const presenterSteps = [
    { label:"Enter your name",                done: name.trim().length > 0 },
    { label:"Select subject & unit",          done: !!subject && !!unit },
    { label:"Select seminar topic",           done: !!finalTopic },
    { label:"Enable microphone (required)",   done: micGranted },
  ];
  const canLaunchPresenter = presenterSteps.every(s => s.done);
  const canJoinObserver = !!(selectedSession || joinId.trim().length >= 4);

  const leftFeatures = seminarMode === "prepare" ? [
    { ic:"🧠", t:"AI Seminar Coach",   d:"Outline, scripts, Q&A prep" },
    { ic:"🎙️", t:"Voice Transcript",   d:"Your speech transcribed live" },
    { ic:"🖥️", t:"Notes Screen",       d:"Instructions visible at all times" },
    { ic:"🎭", t:"Demo Mode",           d:"Practice delivery to AI audience" },
  ] : sessionSubMode === "observer" ? [
    { ic:"👁️", t:"Watch Live",         d:"See the presenter's screen & delivery" },
    { ic:"💬", t:"Ask in Chat",         d:"Send questions to the presenter" },
    { ic:"🎤", t:"Raise Hand",          d:"Request mic to ask verbally" },
    { ic:"📊", t:"Session Feed",        d:"See all ongoing community seminars" },
  ] : [
    { ic:"🖥️", t:"Screen Share",       d:"Present your content to observers" },
    { ic:"🎙️", t:"Live Transcript",    d:"AI transcribes your speech live" },
    { ic:"🤖", t:"AI Moderator",        d:"Intro, tips, and end-of-session report" },
    { ic:"📊", t:"Auto Report",         d:"Full performance analysis at end" },
  ];

  async function handleJoin() {
    setJoining(true);
    if (seminarMode === "session" && sessionSubMode === "presenter") {
      const ev = { id:`sem-${Date.now()}`, title:finalTopic, type:"seminar", date:new Date().toISOString().slice(0,10), startTime:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), subject, unit, link:roomLink };
      try {
        const ex = JSON.parse(localStorage.getItem("gradeup_cal_events_v3")||"[]");
        localStorage.setItem("gradeup_cal_events_v3", JSON.stringify([...ex, ev]));
        window.dispatchEvent(new StorageEvent("storage", { key:"gradeup_cal_events_v3" }));
        publishCommunitySession({ ...ev, roles:["Observer","Participant"], createdAt:new Date().toISOString(), status:"live" });
      } catch {}
    }
    for (let p = 0; p <= 100; p += 20) { await new Promise(r=>setTimeout(r,150)); setJoinProgress(p); }
    setJoining(false); setShowConfirm(false); setJoinProgress(0);
    onLaunch({
      seminarMode, sessionSubMode, name,
      role: seminarMode === "prepare" ? "Presenter" : sessionSubMode === "presenter" ? "Presenter" : "Observer",
      subject, unit, topic: finalTopic,
      roomId: roomId.current, roomLink,
      stream: micStream, micOn: micGranted,
      joinSession: selectedSession || (joinId.trim() ? { id:joinId.trim(), title:"Seminar Session" } : null),
      date: scheduledInfo?.date, time: scheduledInfo?.time,
    });
  }

  return (
    <div className="sp-setup route-enter">
      {/* LEFT */}
      <div className="sp-left">
        <div className="sp-grid-lines"/><div className="sp-glow1"/><div className="sp-glow2"/>
        <div className="sp-left-inner">
          <div className="sp-logo">
            <div className="sp-logo-ico">🎓</div>
            <span className="sp-logo-name">SeminarArena</span>
          </div>
          <div className="sp-badge"><div className="sp-badge-dot"/>Seminar Setup</div>
          <h2 className="sp-h1">Your stage,<br/><span className="hl">your seminar.</span></h2>
          <p className="sp-desc">AI-facilitated sessions with voice transcription, screen sharing, observer chat & full performance reports.</p>
          <div className="sp-features">
            {leftFeatures.map((f,i) => (
              <div key={f.t} className="sp-feat" style={{animationDelay:`${.1+i*.06}s`}}>
                <div className="sp-feat-ic">{f.ic}</div>
                <div><div className="sp-feat-t">{f.t}</div><div className="sp-feat-d">{f.d}</div></div>
              </div>
            ))}
          </div>
          {(subject || finalTopic) && (
            <div className="ctx-chip">
              <div className="ctx-chip-lbl">Session Context</div>
              {subject && <div className="ctx-chip-val">📚 {subject}{unit?` · ${unit}`:""}</div>}
              {finalTopic && <div className="ctx-chip-sub">{finalTopic.length>44?finalTopic.slice(0,44)+"…":finalTopic}</div>}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — scrollable only */}
      <div className="sp-right">
        <div className="sp-right-scroll">
          <div className="sp-right-inner">
            {onBack && <button className="back-btn" onClick={onBack}>← Back</button>}
            <h2 className="setup-h">🎓 Seminar Setup</h2>
            <p className="setup-sub">Choose your mode — prepare alone with AI, run a live seminar, or join one as an observer.</p>

            <div className="sec-div">Choose Mode</div>
            <div className="module-grid fi">
              {[
                { id:"prepare", ic:"🤖", t:"Prepare with AI", d:"AI coach helps you rehearse, build outline, transcribe speech and practice demo." },
                { id:"session", ic:"🔴", t:"Seminar Session",  d:"Start or join a live seminar with AI moderator, screen share & full report." },
              ].map(m => (
                <div key={m.id} className={`module-card${seminarMode===m.id?" sel":""}`} onClick={()=>{setSeminarMode(m.id as any);setSessionSubMode("");}}>
                  <div className="mod-ic">{m.ic}</div>
                  <div><div className="mod-title">{m.t}</div><div className="mod-desc">{m.d}</div></div>
                </div>
              ))}
            </div>

            {seminarMode === "session" && (
              <>
                <div className="sec-div">I want to…</div>
                <div className="submode-grid fi">
                  <div className={`submode-card${sessionSubMode==="presenter"?" sel":""}`} onClick={()=>setSessionSubMode("presenter")}>
                    <div className="submode-ic">🎙️</div>
                    <div className="submode-title">Present a Seminar</div>
                    <div className="submode-desc">Start a room, share your screen, deliver your seminar. AI moderates & generates a report.</div>
                  </div>
                  <div className={`submode-card${sessionSubMode==="observer"?" sel":""}`} onClick={()=>setSessionSubMode("observer")}>
                    <div className="submode-ic">👁️</div>
                    <div className="submode-title">Join as Observer</div>
                    <div className="submode-desc">Watch live seminars, ask questions in chat, or raise your hand to speak verbally.</div>
                  </div>
                </div>
              </>
            )}

            {/* OBSERVER FLOW */}
            {seminarMode === "session" && sessionSubMode === "observer" && (
              <>
                <div className="sec-div">Join a Session</div>
                <div className="obs-join-section">
                  <div className="obs-join-title">🔗 Join with Room Link or ID</div>
                  <div className="obs-join-input-row">
                    <input className="finput" placeholder="Paste room link or enter Room ID…" style={{flex:1}} value={joinId} onChange={e=>setJoinId(e.target.value)}/>
                    <button className="btn-s" onClick={()=>{if(joinId.trim())toast$("Joining room…","info");}}>Join</button>
                  </div>
                  <div className="obs-join-or">or</div>
                  <div style={{fontSize:10.5,fontWeight:700,color:"var(--t2)",marginBottom:8}}>📡 Live & Upcoming Sessions</div>
                  {onlineSessions.length === 0 ? (
                    <div className="ongoing-empty">No active sessions. Check back soon.</div>
                  ) : (
                    <div className="ongoing-list">
                      {onlineSessions.map((s: any) => (
                        <div key={s.id} className={`ongoing-card${selectedSession?.id===s.id?" sel":""}`} onClick={()=>setSelectedSession(selectedSession?.id===s.id?null:s)}>
                          <div className="ongoing-live-dot" style={{background:s.status==="live"?"var(--red)":"var(--amb)"}}/>
                          <div className="ongoing-info">
                            <div className="ongoing-topic">{s.title}</div>
                            <div className="ongoing-meta">📚 {s.subject||"—"}{s.unit?` · ${s.unit}`:""} · {s.presenterName?`by ${s.presenterName} · `:""}{s.status==="live"?"🔴 Live now":`📅 ${s.date||""} ${s.time||""}`}</div>
                          </div>
                          <div className="ongoing-count" style={{background:s.status==="live"?"rgba(229,62,62,.1)":"rgba(246,166,35,.1)",color:s.status==="live"?"var(--red)":"var(--amb)"}}>
                            {s.status==="live"?(s.observerCount?`${s.observerCount} 👁`:"● LIVE"):"⏰"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sec-div">Your Name</div>
                <div className="fi">
                  <label className="fl">Display Name</label>
                  <input className="finput" placeholder="e.g. Alex (Observer)" value={name} onChange={e=>setName(e.target.value)} maxLength={40}/>
                </div>

                <div style={{marginTop:14,marginBottom:10}}>
                  <button className="btn-p" onClick={()=>setShowConfirm(true)} disabled={!canJoinObserver||!name.trim()}>
                    👁️ Join as Observer
                  </button>
                </div>
              </>
            )}

            {/* PRESENTER + PREPARE FLOW */}
            {(seminarMode === "prepare" || (seminarMode === "session" && sessionSubMode === "presenter")) && (
              <>
                <div className="sec-div">Your Identity</div>
                <div className="fi">
                  <label className="fl">Your Name</label>
                  <input className="finput" placeholder="e.g. Alex Johnson" value={name} onChange={e=>setName(e.target.value)} maxLength={40}/>
                </div>

                <div className="sec-div">Microphone (Required)</div>
                <div style={{padding:"10px 12px",borderRadius:12,border:`1.5px solid ${micGranted?"rgba(0,195,122,.35)":"rgba(229,62,62,.3)"}`,background:micGranted?"rgba(0,195,122,.06)":"rgba(229,62,62,.05)",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:micGranted?0:8}}>
                    <span style={{fontSize:20}}>🎤</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:micGranted?"var(--em)":"var(--red)"}}>
                        {micGranted?"Microphone Active — Voice Transcription Enabled":"Microphone Required"}
                      </div>
                      <div style={{fontSize:10.5,color:"var(--t2)"}}>
                        {micGranted?"Your speech is transcribed live throughout the session":"Enable mic to continue."}
                      </div>
                    </div>
                    {micGranted && <span style={{fontSize:16}}>✅</span>}
                  </div>
                  {!micGranted && (
                    <button className="btn-p" style={{marginTop:4}} onClick={requestMic}>🎤 Enable Microphone</button>
                  )}
                </div>

                <div className="sec-div">Academic Context</div>
                <div className="fi-row fi">
                  <div>
                    <label className="fl">Subject</label>
                    <select className="finput" value={subject} onChange={e=>{setSubject(e.target.value);setUnit("");}}>
                      <option value="">Select subject…</option>
                      {SUBJECTS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="fl">Unit / Module</label>
                    <select className="finput" value={unit} onChange={e=>setUnit(e.target.value)} disabled={!subject}>
                      <option value="">{subject?"Select unit…":"Subject first"}</option>
                      {availableUnits.map(u=><option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sec-div">Seminar Topic</div>
                <div className="fi">
                  <select className="finput" value={topic} onChange={e=>setTopic(e.target.value)}>
                    <option value="">Select a topic…</option>
                    {TOPICS.map(t=><option key={t} value={t}>{t}</option>)}
                    <option value="__custom__">✏️ Custom topic…</option>
                  </select>
                </div>
                {topic==="__custom__" && (
                  <div className="fi">
                    <input className="finput" placeholder="Enter your seminar topic…" value={custom} onChange={e=>setCustom(e.target.value)}/>
                  </div>
                )}

                {seminarMode === "session" && sessionSubMode === "presenter" && (
                  <>
                    <div className="sec-div">Session Timing</div>
                    <div className="timing-grid fi">
                      {[
                        { id:"instant", ic:"⚡", t:"Start Now",  d:"Launch immediately" },
                        { id:"schedule", ic:"📅", t:"Schedule",   d:"Plan for a future date" },
                      ].map(o=>(
                        <div key={o.id} className={`timing-card${seminarType===o.id?" sel":""}`} onClick={()=>setSeminarType(o.id as any)}>
                          <div className="timing-ic">{o.ic}</div>
                          <div><div className="timing-title">{o.t}</div><div className="timing-desc">{o.d}</div></div>
                        </div>
                      ))}
                    </div>

                    {seminarType==="schedule" && (
                      <div style={{padding:"11px 13px",borderRadius:11,background:"rgba(0,195,122,.04)",border:"1.5px solid rgba(0,195,122,.16)",marginBottom:10}}>
                        {!scheduled ? (
                          <>
                            <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",marginBottom:5}}>📅 Schedule & publish to community</div>
                            <div style={{fontSize:11,color:"var(--t2)",marginBottom:8}}>Observers in your group will see and can join.</div>
                            <button className="btn-s" style={{width:"100%",justifyContent:"center" as const}} onClick={()=>setShowSchedule(true)}>📅 Set Date & Time</button>
                          </>
                        ) : (
                          <div style={{display:"flex",alignItems:"center",gap:9}}>
                            <span style={{fontSize:20}}>✅</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:11.5,fontWeight:800,color:"var(--em)"}}>Scheduled & Published</div>
                              <div style={{fontSize:10.5,color:"var(--t2)"}}>📅 {scheduledInfo?.date} at {scheduledInfo?.time}</div>
                            </div>
                            <button className="btn-s" style={{fontSize:10.5,padding:"3px 8px"}} onClick={()=>{setScheduled(false);setShowSchedule(true);}}>Edit</button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="link-box">
                      <div className="link-lbl">🔗 Your Room Link — Share with Observers</div>
                      <div className="link-row">
                        <span className="link-val">{roomLink}</span>
                        <button className="copy-btn" onClick={copyLink}>{copied?"✓ Copied":"Copy"}</button>
                      </div>
                      <div style={{display:"flex",gap:6,marginTop:7}}>
                        <button className="btn-s" style={{flex:1,fontSize:11,justifyContent:"center" as const}} onClick={()=>{navigator.clipboard.writeText(roomLink);toast$("Link copied!","info");}}>📋 Copy</button>
                        <button className="btn-s" style={{flex:1,fontSize:11,justifyContent:"center" as const}} onClick={()=>{if(navigator.share)navigator.share({title:"Join my seminar",url:roomLink});else copyLink();}}>↗ Share</button>
                      </div>
                    </div>
                  </>
                )}

                <div style={{marginTop:14,marginBottom:10}}>
                  <div className="steps">
                    {presenterSteps.map((s,i) => {
                      const done=s.done;const prev=presenterSteps.slice(0,i).every(x=>x.done);const act=!done&&prev;const pend=!done&&!prev;
                      return (
                        <div key={i} className={`step-r ${done?"done":act?"act":"pend"}`}>
                          <div className="step-num">{done?"✓":i+1}</div>
                          <div className="step-lbl">{s.label}</div>
                        </div>
                      );
                    })}
                  </div>
                  <button className="btn-p" onClick={()=>setShowConfirm(true)} disabled={!canLaunchPresenter}>
                    {seminarMode==="prepare"?"🤖 Start AI Preparation":"🎙️ Launch Seminar Room"}
                  </button>
                </div>
              </>
            )}
            <div style={{height:20}}/>
          </div>
        </div>
      </div>

      {showSchedule && (
        <ScheduleSeminarModal
          config={{ topic:finalTopic, subject, unit, roomLink }}
          onSchedule={(info:any)=>{setScheduledInfo(info);setScheduled(true);setShowSchedule(false);toast$("📅 Seminar scheduled & published!","success");}}
          onClose={()=>setShowSchedule(false)}
        />
      )}

      {showConfirm && (
        <div className="overlay">
          <div className="modal" style={{maxWidth:380}}>
            <div style={{background:"linear-gradient(135deg,#060e1c,#081a10)",padding:"22px 18px",textAlign:"center" as const}}>
              <div style={{width:58,height:58,borderRadius:"50%",background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 10px"}}>
                {seminarMode==="prepare"?"🤖":sessionSubMode==="observer"?"👁️":"🎙️"}
              </div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:2}}>{name}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.45)"}}>
                {seminarMode==="prepare"?"🤖 AI Preparation":sessionSubMode==="observer"?"👁️ Observer":sessionSubMode==="presenter"?"🎙️ Presenter":""}
              </div>
              {subject && <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:2}}>📚 {subject}{unit?` · ${unit}`:""}</div>}
            </div>
            <div className="mb">
              {finalTopic && (
                <div style={{padding:"8px 11px",borderRadius:10,background:"rgba(0,195,122,.06)",border:"1px solid rgba(0,195,122,.16)",marginBottom:10,fontSize:12,fontWeight:700,color:"var(--t1)"}}>
                  "{finalTopic}"
                </div>
              )}
              {sessionSubMode==="observer" && selectedSession && (
                <div style={{padding:"8px 11px",borderRadius:9,background:"rgba(45,156,219,.06)",border:"1px solid rgba(45,156,219,.2)",marginBottom:9,fontSize:11.5,fontWeight:600,color:"var(--sky)"}}>
                  👁️ Joining: {selectedSession.title}
                </div>
              )}
              {micGranted && (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:9,background:"rgba(0,195,122,.07)",border:"1px solid rgba(0,195,122,.2)"}}>
                  <span style={{fontSize:14}}>🎤</span>
                  <div style={{flex:1,fontSize:11,fontWeight:700,color:"var(--em)"}}>Microphone Active — Transcription Enabled</div>
                  <span>✅</span>
                </div>
              )}
            </div>
            <div className="mf" style={{flexDirection:"column" as const,gap:7}}>
              <button className="btn-p" onClick={handleJoin} disabled={joining} style={{fontSize:13}}>
                {joining ? <><span className="loader-spin"/>{joinProgress>0?`Loading ${joinProgress}%`:"Launching…"}</> :
                  seminarMode==="prepare"?"🤖 Enter AI Coach Room":sessionSubMode==="observer"?"👁️ Join as Observer":"🎙️ Enter Seminar Room"}
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

// ─── PREPARE WITH AI ──────────────────────────────────────────────────────────
function PrepareWithAIRoom({ config, onEnd }: { config: any; onEnd: (r: any) => void }) {
  const timer = useTimer(true);
  const [demoMode, setDemoMode]     = useState(false);
  const [demoTimer, setDemoTimer]   = useState(0);
  const [demoEndFeedback, setDemoEndFeedback] = useState<string[]|null>(null);
  const [aiInput, setAiInput]       = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [exchanges, setExchanges]   = useState(0);
  const [messages, setMessages]     = useState<any[]>([
    { from:"ai", text:`Welcome! I've analysed your seminar topic: "${config.topic}"${config.subject?` in ${config.subject}${config.unit?`, ${config.unit}`:""}`:""}. I'm your AI coach — here to help with outlines, scripts, Q&A prep, and delivery feedback. What would you like to start with?` }
  ]);
  const [notes, setNotes]           = useState<{id:number;n:number;text:string}[]>([
    { id:1, n:1, text:`<strong>Topic:</strong> "${config.topic}" — know your thesis in one sentence.` },
    { id:2, n:2, text:`<strong>Structure:</strong> Opening hook → 3 key arguments → Evidence → Counterarguments → Conclusion.` },
    { id:3, n:3, text:`<strong>Opening:</strong> Start with a bold statement, statistic, or a question that frames the debate.` },
    { id:4, n:4, text:`<strong>Delivery:</strong> Speak at 100–120 wpm, pause after key points, vary your tone.` },
  ]);
  const [noteCount, setNoteCount]   = useState(5);
  const [isStudentSpeaking, setIsStudentSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript]       = useState("");
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const aiVoice    = useAIVoice();
  const speech     = useSpeechRecognition();
  const demoIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const { show: toast$, node: toastNode } = useToast();

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  useEffect(() => {
    if (config.stream) {
      speech.start((finalText: string) => {
        setTranscriptHistory(h => [...h, finalText].slice(-10));
        setIsStudentSpeaking(true);
        setTimeout(() => setIsStudentSpeaking(false), 1800);
      });
    }
    return () => { speech.stop(); aiVoice.cancel(); if(demoIntervalRef.current) clearInterval(demoIntervalRef.current); };
  }, []); // eslint-disable-line

  useEffect(() => {
    setLiveTranscript(speech.transcript);
    if (speech.transcript) { setIsStudentSpeaking(true); }
  }, [speech.transcript]);

  // Demo timer
  useEffect(() => {
    if (!demoMode) return;
    setDemoTimer(0);
    const id = setInterval(() => setDemoTimer(t => t + 1), 1000);
    demoIntervalRef.current = id;
    return () => clearInterval(id);
  }, [demoMode]);

  function getAIReply(q: string): string {
    const lower = q.toLowerCase();
    if (lower.includes("outline")||lower.includes("structure")) return AI_RESPONSES.outline;
    if (lower.includes("question")||lower.includes("audience")) return AI_RESPONSES.questions;
    if (lower.includes("example")||lower.includes("evidence"))  return AI_RESPONSES.examples;
    if (lower.includes("script")||lower.includes("opening"))    return AI_RESPONSES.script;
    if (lower.includes("feedback")||lower.includes("demo")||lower.includes("how am i")) return AI_RESPONSES.feedback;
    return `For "${config.topic}", I recommend:\n1. Ground your argument in peer-reviewed evidence\n2. Use a real-world case study relevant to ${config.subject||"your subject"}\n3. Anticipate objections and address them proactively\n4. End with a clear, memorable statement\n\nWould you like me to draft any specific section?`;
  }

  function addNote(text: string) {
    const n = noteCount; setNoteCount(c=>c+1);
    setNotes(prev => [{ id:Date.now(), n, text }, ...prev].slice(0,14));
  }

  function sendAI(text = aiInput) {
    const q = text.trim(); if (!q) return;
    setMessages(m=>[...m,{from:"me",text:q}]); setAiInput(""); setIsAITyping(true); setExchanges(x=>x+1);
    setTimeout(() => {
      const reply = getAIReply(q); setIsAITyping(false);
      setMessages(m=>[...m,{from:"ai",text:reply}]);
      addNote(reply.split("\n")[0].replace(/^\d+\.\s*/,""));
      aiVoice.speak(reply.split("\n")[0]);
      setExchanges(x=>x+1);
    }, 900+Math.random()*400);
  }

  function startDemo() {
    setDemoMode(true);
    setDemoEndFeedback(null);
    const msg = `Demo mode activated! Present your seminar on "${config.topic}" as if to a live audience. I'm analysing: introduction clarity, argument structure, evidence usage, transitions, and closing impact. Speak naturally — your microphone is recording.`;
    setMessages(m=>[...m,{from:"system",text:"🎭 Demo Mode Started — Present now, I'm listening"},{from:"ai",text:msg}]);
    addNote("🎭 Demo mode: Evaluating clarity, structure, evidence, transitions, and closing.");
    aiVoice.speak("Demo mode active. Please begin your presentation.");
    toast$("🎭 Demo started — speak freely, AI is listening","info");
  }

  function stopDemo() {
    setDemoMode(false);
    if(demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    const demoSecs = demoTimer;
    const full = transcriptHistory.join(" ");
    const score = 70+Math.floor(Math.random()*25);
    const feedback = full.length > 20
      ? `Demo Complete (${String(Math.floor(demoSecs/60)).padStart(2,"0")}:${String(demoSecs%60).padStart(2,"0")})\n\n"${full.slice(0,80)}…"\n\n✅ Confident opening detected\n✅ Main argument identified\n⚠️ Add more quantitative evidence\n⚠️ Strengthen your closing\n💡 Score: ${score}/100`
      : AI_RESPONSES.feedback;

    // Show feedback items
    setDemoEndFeedback([
      `✅ Confident opening detected`,
      `✅ Main argument identified`,
      `⚠️ Add more quantitative evidence`,
      `💡 Score: ${score}/100 — keep practising!`,
    ]);

    setMessages(m=>[...m,{from:"system",text:"🏁 Demo Complete — AI Feedback Below"},{from:"ai",text:feedback}]);
    addNote(`Demo feedback (Score: ${score}/100): Structure clear. Strengthen closing & add evidence.`);
    toast$(`🏁 Demo ended — score: ${score}/100`,"success");
  }

  const demoTimerStr = `${String(Math.floor(demoTimer/60)).padStart(2,"0")}:${String(demoTimer%60).padStart(2,"0")}`;

  function handleEnd() {
    speech.stop(); aiVoice.cancel();
    config.stream?.getTracks().forEach((t: MediaStreamTrack)=>t.stop());
    onEnd({ modeType:"prepare", timer, topic:config.topic, subject:config.subject, unit:config.unit, participants:1, exchanges, presenterName:config.name });
  }

  return (
    <div className="prep-page">
      <div className="prep-bar">
        <button className="prep-bar-logo"><div className="prep-bar-logo-ic">🎓</div><span>SeminarArena</span></button>
        <div className="prep-bar-div"/>
        <div className="prep-bar-topic"><strong>{config.subject&&`${config.subject}${config.unit?` · ${config.unit}`:""} · `}</strong>{config.topic}</div>
        <div className={`prep-pill ${demoMode?"pp-demo":"pp-mode"}`}>{demoMode?`🎭 ${demoTimerStr}`:"🤖 AI Coach"}</div>
        <div className="prep-pill pp-timer">{timer}</div>
        <button className="prep-bar-end" onClick={handleEnd}>End</button>
      </div>

      <div className="prep-body">
        {/* COL 1: Student */}
        <div className="prep-col">
          <div className="prep-col-head">
            <span>You — Student</span>
            <div className="prep-col-head-badge">{isStudentSpeaking?"🔊 Speaking":"🎤 Ready"}</div>
          </div>
          <div className="prep-col-scroll">
            <div className="student-avatar">{avInit(config.name)}</div>
            <div className="student-card"><div className="student-card-label">Student</div><div className="student-card-val">{config.name}</div><div className="student-card-sub">Presenter Preparation</div></div>
            <div className="student-card"><div className="student-card-label">Topic</div><div className="student-card-val" style={{fontSize:11,lineHeight:1.4}}>{config.topic}</div><div className="student-card-sub">{config.subject}{config.unit?` · ${config.unit}`:""}</div></div>

            {/* Mic + Sound Analyser */}
            <div className="prep-mic-bar">
              <div className="prep-mic-dot"/>
              <span className="prep-mic-label" style={{fontSize:10.5}}>{isStudentSpeaking?"Recording your voice…":"Mic active — start speaking"}</span>
              <SoundAnalyser active={isStudentSpeaking} color="#5ee3b7" bars={7} size={28}/>
            </div>

            {/* Recording badge when in demo mode */}
            {demoMode && (
              <div className="recording-badge" style={{marginBottom:8}}>
                <div className="recording-badge-dot"/>
                <span className="recording-badge-text">⏺ REC {demoTimerStr} — Voice being analysed</span>
              </div>
            )}

            <div className="prep-transcript-box">
              <div className="prep-transcript-label">Live Voice Transcript</div>
              <div className="prep-transcript-text">
                {liveTranscript || (transcriptHistory.length > 0 ? transcriptHistory[transcriptHistory.length-1] : "Start speaking to see your transcript…")}
                <span className="prep-transcript-cursor"/>
              </div>
            </div>

            {/* Demo end feedback */}
            {demoEndFeedback && (
              <div className="demo-end-toast">
                <div className="demo-end-title">🏁 Demo Feedback</div>
                <div className="demo-end-items">
                  {demoEndFeedback.map((item, i) => (
                    <div key={i} className="demo-end-item">{item}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="prep-actions">
              {!demoMode
                ? <button className="prep-action-btn primary" onClick={startDemo}>🎭 Start Demo Seminar</button>
                : <button className="prep-action-btn demo-active" onClick={stopDemo}>🏁 End Demo & Get Feedback</button>
              }
              <button className="prep-action-btn" onClick={()=>sendAI("Generate a complete seminar outline")}>📋 Generate Outline</button>
              <button className="prep-action-btn" onClick={()=>sendAI("Write an opening script for my seminar")}>📝 Write Opening Script</button>
              <button className="prep-action-btn" onClick={()=>sendAI("Predict the audience questions I may face")}>❓ Predict Questions</button>
              <button className="prep-action-btn" onClick={()=>sendAI("Give me strong examples and evidence to use")}>💡 Find Examples</button>
            </div>
          </div>
        </div>

        {/* COL 2: AI Chat — stable, no layout shifts */}
        <div className="prep-col">
          <div className="prep-col-head">
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(45,156,219,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>🤖</div>
              <span>AI Coach</span>
            </div>
          </div>

          <div className="ai-chat-wrapper">
            <div className="ai-messages">
              {messages.map((m,i) => {
                if (m.from==="system") return (
                  <div key={i} style={{display:"flex",justifyContent:"center",width:"100%"}}>
                    <div className="ai-bubble system-style">{m.text}</div>
                  </div>
                );
                return (
                  <div key={i} className={`ai-msg ${m.from==="ai"?"from-ai":"from-me"}`}>
                    <div className={`ai-bubble-av ${m.from==="ai"?"ai-side":"me-side"}`}>{m.from==="ai"?"🤖":avInit(config.name)}</div>
                    <div className={`ai-bubble ${m.from==="ai"?"ai-style":"me-style"}`} style={{whiteSpace:"pre-line"}}>{m.text}</div>
                  </div>
                );
              })}
              {isAITyping && (
                <div className="ai-msg from-ai">
                  <div className="ai-bubble-av ai-side">🤖</div>
                  <div className="ai-typing">{[0,1,2].map(i=><div key={i} className="ai-typing-dot" style={{animationDelay:`${i*.22}s`}}/>)}</div>
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            {/* AI speaking indicator — fixed height, no layout shift */}
            <div className="ai-speaking-bar">
              {aiVoice.isSpeaking ? (
                <>
                  <SoundAnalyser active={true} color="#7ed3f7" bars={6} size={22}/>
                  <span className="ai-speaking-text">AI Coach is speaking…</span>
                </>
              ) : (
                <span className="ai-speaking-text" style={{color:"rgba(255,255,255,.2)"}}>AI Coach ready</span>
              )}
            </div>

            <div className="quick-prompts">
              {["Outline","Script","Questions","Examples","Feedback"].map(qp=>(
                <button key={qp} className="quick-p" onClick={()=>sendAI(qp.toLowerCase())}>{qp}</button>
              ))}
            </div>
            <div className="ai-input-area">
              <textarea className="ai-input" placeholder="Ask AI coach for help…" value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAI();}}} rows={1}/>
              <button className="ai-send" onClick={()=>sendAI()} disabled={isAITyping||!aiInput.trim()}>➤</button>
            </div>
          </div>
        </div>

        {/* COL 3: Notes */}
        <div className="prep-col" style={{background:"#060d18"}}>
          <div className="prep-col-head" style={{background:"rgba(6,13,24,.98)"}}>
            <span>Notes Screen</span>
            <div className="prep-col-head-badge">{notes.length} notes</div>
          </div>
          <div className="notes-screen">
            <div className="notes-screen-header"><div className="notes-screen-dot"/><span className="notes-screen-title">AI Instructions &amp; Key Points</span></div>
            {demoMode && (
              <div className="demo-status-bar">
                <div className="demo-status-dot"/>
                <div className="demo-status-text">🎭 Demo active — AI analysing your delivery, structure, evidence, and closing.</div>
                <div className="demo-status-time">{demoTimerStr}</div>
              </div>
            )}
            {notes.length === 0 ? <div className="notes-empty">AI Coach notes will appear here as you prepare.</div>
              : notes.map(n=>(
                <div key={n.id} className="note-item">
                  <div className="note-item-n">Note {n.n}</div>
                  <div className="note-item-text" dangerouslySetInnerHTML={{__html:n.text}}/>
                </div>
              ))
            }
          </div>
        </div>
      </div>
      {toastNode}
    </div>
  );
}

// ─── PRESENTER SEMINAR ROOM ────────────────────────────────────────────────────
function PresenterRoom({ config, onEnd }: { config: any; onEnd: (r: any) => void }) {
  const timer = useTimer(true);
  const [panelTab, setPanelTab] = useState<string|null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [micOn, setMicOn]       = useState(true);
  const [isRecording, setIsRecording]   = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showEnd, setShowEnd]   = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reaction, setReaction] = useState<{emoji:string;k:number}|null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [aiSummaryLines, setAiSummaryLines] = useState<string[]>([
    "Session started — AI Moderator is listening and taking notes.",
    "Waiting for you to begin sharing your screen.",
  ]);
  const [aiTyping, setAiTyping] = useState(false);
  const [observerCount, setObserverCount] = useState(Math.floor(Math.random()*4));
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const aiIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const aiVoice = useAIVoice();
  const speech  = useSpeechRecognition();
  const { show: toast$, node: toastNode } = useToast();
  const presenterColor = avColor(config.name);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  function addMsg(sender: string, text: string, type?: string) {
    setMessages(ms=>[...ms,{sender,text,type,time:Date.now()}]);
    setExchangeCount(c=>c+1);
  }

  useEffect(() => {
    if (config.stream) {
      speech.start((finalText: string) => {
        setLiveTranscript(finalText);
        setIsSpeaking(true);
        setTimeout(() => { setLiveTranscript(""); setIsSpeaking(false); }, 5000);
      });
    }
    const intro = `Welcome to your seminar session on "${config.topic}"${config.subject?` — ${config.subject}`:""}, ${config.name}! I'm your AI Moderator. I'll introduce you, provide real-time notes, and generate a full performance report when you end the session. Whenever you're ready, share your screen and begin!`;
    setTimeout(() => {
      addMsg("AI Moderator", intro, "ai");
      setAiTyping(true);
      setTimeout(() => { setAiTyping(false); aiVoice.speak(intro.slice(0,120)); }, 600);
    }, 1000);

    aiIntervalRef.current = setInterval(() => {
      if (Math.random() > 0.6 && !aiVoice.isSpeaking) {
        const tip = AI_ROOM_LINES[Math.floor(Math.random()*AI_ROOM_LINES.length)];
        addMsg("AI Moderator", tip, "ai");
        setAiSummaryLines(l=>[...l, tip].slice(-8));
      }
      if (Math.random() > 0.7) setObserverCount(c=>Math.min(c+1,20));
    }, 25000);

    return () => {
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
      aiVoice.cancel(); speech.stop();
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (speech.transcript) { setLiveTranscript(speech.transcript); setIsSpeaking(true); }
  }, [speech.transcript]);

  async function toggleScreen() {
    if (screenSharing) { setScreenSharing(false); toast$("🖥 Screen sharing stopped","warn"); return; }
    try {
      await (navigator.mediaDevices as any).getDisplayMedia({ video:true });
      setScreenSharing(true); toast$("🖥 Screen sharing started","success");
      addMsg("AI Moderator","Screen sharing is now active. Observers can see your content. Begin when ready!", "ai");
    } catch { toast$("Screen share cancelled","warn"); }
  }

  function sendMsg(text: string) { if (!text.trim()) return; addMsg(config.name, text.trim()); setChatInput(""); }
  function sendReaction(emoji: string) { setShowReactions(false); const k=Date.now();setReaction({emoji,k});setTimeout(()=>setReaction(null),2400); }

  function handleEnd() {
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    aiVoice.cancel(); speech.stop();
    config.stream?.getTracks().forEach((t: MediaStreamTrack)=>t.stop());
    onEnd({ timer, topic:config.topic, subject:config.subject, unit:config.unit, participants:1, exchanges:exchangeCount, presenterName:config.name });
  }

  const fmt = (d:number) => new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

  return (
    <div className="room-page">
      {isRecording && <div className="rec-ovl">⏺ REC {timer}</div>}

      <div className="room-bar">
        <div className="room-logo"><div className="room-logo-ic">🎓</div>SeminarArena</div>
        <div className="room-divider"/>
        <div className="room-topic"><strong>{config.subject&&`${config.subject}${config.unit?` · ${config.unit}`:""} · `}</strong>{config.topic}</div>
        <div className="r-pill rp-timer">{timer}</div>
        {isRecording && <div className="r-pill rp-rec"><div className="rp-rec-dot"/>REC</div>}
        <div className="r-pill rp-ai">🤖 AI Mod</div>
        <div className="r-pill" style={{background:"rgba(0,195,122,.1)",borderColor:"rgba(0,195,122,.2)",color:"#5ee3b7"}}>👁 {observerCount} watching</div>
        <button className="rbar-end-btn" onClick={()=>setShowEnd(true)}>✕ End</button>
      </div>

      <div className="room-body">
        <div className="grid-area">
          <div className="ss-area">
            {!screenSharing ? (
              <div className="ss-placeholder">
                <div style={{fontSize:56,opacity:.2}}>🖥️</div>
                <div style={{fontSize:13,fontWeight:700}}>Screen not shared yet</div>
                <div style={{fontSize:11,textAlign:"center",maxWidth:200,lineHeight:1.6,opacity:.6}}>Click below to share your screen with observers.</div>
                <button style={{marginTop:14,padding:"9px 20px",borderRadius:10,background:"var(--grad)",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff"}} onClick={toggleScreen}>
                  🖥️ Start Screen Share
                </button>
              </div>
            ) : (
              <>
                <div className="ss-active-label"><div className="ss-active-dot"/>Screen Sharing Active — {observerCount} watching</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>Your screen is shared with observers</div>
              </>
            )}
            {reaction && (
              <div key={reaction.k} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:46,animation:"rPop 2s forwards",pointerEvents:"none",zIndex:5}}>{reaction.emoji}</div>
            )}
          </div>

          <div className="presenter-strip">
            <div className="strip-tile" style={{border:`1.5px solid ${presenterColor}44`}}>
              <div className="strip-av" style={{background:presenterColor+"22",color:presenterColor}}>{avInit(config.name)}</div>
              {isSpeaking && (
                <div style={{position:"absolute",top:5,right:5}}>
                  <SoundAnalyser active={true} color="#5ee3b7" bars={4} size={16}/>
                </div>
              )}
              <div className="strip-ov">
                <span className="strip-name">{config.name}</span>
                <span className="strip-muted">{micOn?"🎤":"🔇"}</span>
              </div>
              <div style={{position:"absolute",top:5,left:5,fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:4,background:"rgba(0,195,122,.85)",color:"#000"}}>YOU</div>
            </div>

            <div className="strip-tile" style={{border:"1.5px solid rgba(45,156,219,.3)"}}>
              <div style={{fontSize:26}}>🤖</div>
              {aiTyping && (
                <div style={{position:"absolute",top:5,right:5,display:"flex",gap:2,alignItems:"center",height:14}}>
                  {[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:"#7ed3f7",animation:"dotPulse .8s ease-in-out infinite",animationDelay:`${i*.22}s`}}/>)}
                </div>
              )}
              <div className="strip-ov">
                <span className="strip-name">AI Moderator</span>
                <span className="strip-muted">🎙️</span>
              </div>
              <div style={{position:"absolute",top:5,left:5,fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:4,background:"rgba(45,156,219,.85)",color:"#000"}}>AI</div>
            </div>

            {observerCount > 0 && (
              <div className="strip-tile" style={{border:"1.5px solid rgba(138,149,163,.2)"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                  <div style={{fontSize:22}}>👁️</div>
                  <div style={{fontSize:18,fontWeight:900,color:"rgba(255,255,255,.6)"}}>{observerCount}</div>
                </div>
                <div className="strip-ov"><span className="strip-name">Observers</span></div>
              </div>
            )}
          </div>

          {(speech.isListening || liveTranscript) && (
            <div className="live-transcript-bar">
              <div className="lt-label"><div className="lt-dot"/>Live Transcript</div>
              <div className="lt-text">{liveTranscript || "Listening…"}</div>
            </div>
          )}

          <div className="ctrl-bar">
            <div className="cg">
              <button className={`cbtn ${micOn?"on":"off"}`} onClick={()=>{const n=!micOn;setMicOn(n);config.stream?.getAudioTracks().forEach((t:MediaStreamTrack)=>t.enabled=n);toast$(n?"🎤 Mic enabled":"🔇 Mic muted",n?"info":"warn");}}>
                <span className="cbtn-ic">{micOn?"🎤":"🔇"}</span><span>{micOn?"Mute":"Unmute"}</span>
              </button>
              <button className={`cbtn${screenSharing?" hi":""}`} onClick={toggleScreen}>
                <span className="cbtn-ic">🖥</span><span>{screenSharing?"Stop":"Share"}</span>
              </button>
              <div style={{position:"relative"}}>
                <button className={`cbtn${showReactions?" hi":""}`} onClick={()=>setShowReactions(r=>!r)}><span className="cbtn-ic">😊</span><span>React</span></button>
                {showReactions && <div className="react-pop">{REACTIONS.map(r=><button key={r} className="react-em" onClick={()=>sendReaction(r)}>{r}</button>)}</div>}
              </div>
            </div>
            <div className="cg">
              <button className={`cbtn${isRecording?" rec":""}`} onClick={()=>{setIsRecording(r=>!r);toast$(isRecording?"⏹ Stopped":"🔴 Recording…",isRecording?"warn":"info");}}>
                <span className="cbtn-ic">⏺</span><span>{isRecording?"Stop":"Record"}</span>
              </button>
              <button className="cbtn em" onClick={()=>setShowAnalysis(true)}><span className="cbtn-ic">📊</span><span>Report</span></button>
            </div>
            <div className="cg">
              <button className={`cbtn${panelTab==="chat"?" hi":""}`} onClick={()=>setPanelTab(p=>p==="chat"?null:"chat")}><span className="cbtn-ic">💬</span><span>Chat</span></button>
              <button className={`cbtn${panelTab==="ai"?" hi":""}`} onClick={()=>setPanelTab(p=>p==="ai"?null:"ai")}><span className="cbtn-ic">🤖</span><span>AI Notes</span></button>
              <button className="end-room-btn" onClick={()=>setShowEnd(true)}>End Session</button>
            </div>
          </div>
        </div>

        {panelTab && (
          <div className="side-panel">
            <div className="panel-tabs">
              {[{id:"chat",ic:"💬",lbl:"Chat"},{id:"ai",ic:"🤖",lbl:"AI Notes"}].map(t=>(
                <button key={t.id} className={`ptab${panelTab===t.id?" active":""}`} onClick={()=>setPanelTab(t.id)}>
                  <span style={{fontSize:13}}>{t.ic}</span><span>{t.lbl}</span>
                </button>
              ))}
              <button className="ptab-close" onClick={()=>setPanelTab(null)}>✕</button>
            </div>

            {panelTab==="chat" && (
              <div style={{display:"flex",flexDirection:"column" as const,height:"100%",minHeight:0}}>
                <div className="pscroll" style={{flex:1}}>
                  <div className="chat-msgs">
                    {messages.length===0 && <div className="chat-empty">No messages yet.<br/>Observer questions appear here.</div>}
                    {messages.map((m,i)=>{
                      const own=m.sender===config.name;const isAI=m.type==="ai";
                      return (
                        <div key={i} className={`chat-msg${own?" own":""}`}>
                          {!own && <div className="chat-av-s" style={{background:isAI?"rgba(45,156,219,.2)":"rgba(255,255,255,.08)",color:isAI?"#7ed3f7":"rgba(255,255,255,.5)"}}>{isAI?"🤖":m.sender[0]?.toUpperCase()}</div>}
                          <div className="chat-bw">
                            {!own && <span className="chat-sender">{m.sender}</span>}
                            <div className={`chat-bubble ${own?"b-own":isAI?"":"b-o"}`} style={isAI?{background:"rgba(45,156,219,.09)",border:"1px solid rgba(45,156,219,.15)",color:"#d0e8ff",borderRadius:"3px 9px 9px 9px"}:{}}>{m.text}</div>
                            <span className="chat-t">{fmt(m.time)}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef}/>
                  </div>
                </div>
                <div className="chat-ia">
                  <textarea className="chat-inp" placeholder="Reply to observers…" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg(chatInput);}}} rows={1}/>
                  <button className="chat-send" onClick={()=>sendMsg(chatInput)}>➤</button>
                </div>
              </div>
            )}

            {panelTab==="ai" && (
              <div className="pscroll">
                <div className="ai-sum-pad">
                  <div style={{padding:"8px 10px",borderRadius:9,background:"rgba(0,195,122,.07)",border:"1px solid rgba(0,195,122,.18)",marginBottom:7}}>
                    <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".07em",color:"rgba(255,255,255,.28)",marginBottom:4}}>Session Status</div>
                    <div style={{fontSize:12,fontWeight:700,color:"#5ee3b7",display:"flex",alignItems:"center",gap:6}}><div style={{width:6,height:6,borderRadius:"50%",background:"var(--em)",animation:"pulse 1.5s infinite"}}/>{timer} · {observerCount} observer(s)</div>
                  </div>
                  <div className="ai-sum-card">
                    <div className="ai-sum-lbl">🤖 AI Moderator Notes</div>
                    {aiSummaryLines.map((l,i)=>(
                      <div key={i} className="ai-sum-val" style={{marginBottom:4,paddingBottom:4,borderBottom:i<aiSummaryLines.length-1?"1px solid rgba(255,255,255,.06)":"none",fontSize:11}}>
                        {i===aiSummaryLines.length-1 && <span><span className="ai-sum-dot"/>Latest: </span>}{l}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAnalysis && <AnalysisModal topic={config.topic} subject={config.subject} unit={config.unit} timer={timer} exchanges={exchangeCount} presenterName={config.name} onClose={()=>setShowAnalysis(false)}/>}

      {showEnd && (
        <div className="overlay" onClick={()=>setShowEnd(false)}>
          <div className="modal" style={{maxWidth:340,background:"#0c1422",border:"1px solid rgba(255,255,255,.1)"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:"linear-gradient(135deg,#060e1c,#08180e)",padding:"22px 18px",textAlign:"center" as const}}>
              <div style={{fontSize:40,marginBottom:9}}>🏁</div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:4}}>End seminar session?</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.38)",lineHeight:1.7}}>Duration: <strong style={{color:"#5ee3b7"}}>{timer}</strong><br/>{observerCount} observer(s) · {exchangeCount} exchanges</div>
            </div>
            <div style={{padding:"11px 13px",margin:"10px 18px",borderRadius:10,background:"rgba(0,195,122,.06)",border:"1px solid rgba(0,195,122,.16)",fontSize:11.5,fontWeight:600,color:"var(--em)",textAlign:"center" as const}}>
              🤖 AI will generate your full performance report after ending.
            </div>
            <div className="mf" style={{borderColor:"rgba(255,255,255,.08)"}}>
              <button className="btn-s" style={{background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)"}} onClick={()=>setShowEnd(false)}>Keep Going</button>
              <button className="btn-d" onClick={handleEnd}>End &amp; Generate Report</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ─── OBSERVER ROOM ────────────────────────────────────────────────────────────
function ObserverRoom({ config, onEnd }: { config: any; onEnd: (r: any) => void }) {
  const timer        = useTimer(true);
  const session      = config.joinSession;
  const [panelTab, setPanelTab]   = useState<"chat"|"people">("chat");
  const [messages, setMessages]   = useState<any[]>([
    { sender:"AI Moderator", text:`Welcome, ${config.name}! You've joined as an observer for "${session?.title||config.topic||"the seminar"}". Watch, ask questions in chat, or raise your hand.`, type:"ai", time:Date.now() }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [micOn, setMicOn]         = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [showEnd, setShowEnd]     = useState(false);
  const [presenterSpeaking, setPresenterSpeaking] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [reaction, setReaction]   = useState<{emoji:string;k:number}|null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const aiVoice      = useAIVoice();
  const { show: toast$, node: toastNode } = useToast();
  const presenterName = session?.presenterName || session?.title?.split(" ")[0] || "Presenter";
  const presenterColor = avColor(presenterName);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  useEffect(() => {
    // Simulate presenter activity
    const id = setInterval(() => {
      setPresenterSpeaking(v=>!v);
      // Occasionally simulate a chat message from presenter or AI
      if (Math.random() > 0.75) {
        const simMsgs = [
          { sender:"AI Moderator", text:"The presenter is making a strong argument here. Feel free to ask questions.", type:"ai" },
          { sender:presenterName, text:"Does anyone have questions about this point?", type:"presenter" },
          { sender:"AI Moderator", text:"Key point: consider the long-term implications of this stance.", type:"ai" },
        ];
        const m = simMsgs[Math.floor(Math.random()*simMsgs.length)];
        setMessages(ms=>[...ms,{...m,time:Date.now()}]);
      }
    }, 5000 + Math.random()*6000);
    return () => { clearInterval(id); aiVoice.cancel(); };
  }, []); // eslint-disable-line

  function addMsg(sender: string, text: string, type?: string) {
    setMessages(ms=>[...ms,{sender,text,type,time:Date.now()}]);
    setExchangeCount(c=>c+1);
  }

  function sendMsg() {
    if (!chatInput.trim()) return;
    addMsg(config.name, chatInput.trim()); setChatInput("");
    if (Math.random() > 0.5) {
      setTimeout(()=>{addMsg("AI Moderator","Great question! The presenter will address this shortly.","ai");},1800);
    }
  }

  function toggleMic() {
    if (!micOn) {
      navigator.mediaDevices.getUserMedia({audio:true}).then(()=>{setMicOn(true);toast$("🎤 Mic active","success");}).catch(()=>toast$("Mic permission denied","error"));
    } else { setMicOn(false); toast$("🔇 Mic muted","warn"); }
  }

  function toggleHand() {
    const n=!handRaised;setHandRaised(n);
    if(n){addMsg("AI Moderator",`${config.name} has raised their hand. Presenter, please acknowledge.`,"ai");toast$("✋ Hand raised","warn");}
    else toast$("Hand lowered","info");
  }

  function sendReaction(emoji:string){setShowReactions(false);const k=Date.now();setReaction({emoji,k});setTimeout(()=>setReaction(null),2400);}

  const fmt = (d:number) => new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

  return (
    <div className="obs-room-page">
      <div className="room-bar">
        <div className="room-logo"><div className="room-logo-ic">🎓</div>SeminarArena</div>
        <div className="room-divider"/>
        <div className="room-topic"><strong>Observing: </strong>{session?.title||config.topic||"Seminar Session"}</div>
        <div className="r-pill rp-timer">{timer}</div>
        <div className="r-pill rp-ai">👁️ Observer</div>
        <button className="rbar-end-btn" onClick={()=>setShowEnd(true)}>Leave</button>
      </div>

      <div className="obs-main">
        <div className="obs-content">
          <div className="obs-stage">
            <div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",gap:10,color:"rgba(255,255,255,.2)",flex:1,width:"100%"}}>
              <div style={{fontSize:52,opacity:.18}}>🖥️</div>
              <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.4)"}}>Presenter's Screen</div>
              <div style={{fontSize:11,textAlign:"center" as const,maxWidth:220,lineHeight:1.6,color:"rgba(255,255,255,.25)"}}>
                The presenter's screen appears here once they start sharing.
              </div>
              {presenterSpeaking && (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",borderRadius:8,background:"rgba(0,195,122,.09)",border:"1px solid rgba(0,195,122,.2)",marginTop:8}}>
                  <SoundAnalyser active={true} color="#5ee3b7" bars={6} size={20}/>
                  <span style={{fontSize:11,fontWeight:700,color:"#5ee3b7"}}>Presenter speaking…</span>
                </div>
              )}
            </div>
            {reaction && (
              <div key={reaction.k} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:44,animation:"rPop 2s forwards",pointerEvents:"none",zIndex:5}}>{reaction.emoji}</div>
            )}

            <div className="obs-presenter-bar">
              <div className="obs-presenter-av" style={{background:presenterColor+"22",color:presenterColor}}>{avInit(presenterName)}</div>
              <div className="obs-presenter-info">
                <div className="obs-presenter-name">{presenterName}</div>
                <div className="obs-presenter-meta">📚 {session?.subject||"—"}{session?.unit?` · ${session.unit}`:""} · {session?.status==="live"?"🔴 Live":"📅 Upcoming"}</div>
              </div>
              {presenterSpeaking && (
                <SoundAnalyser active={true} color="#5ee3b7" bars={5} size={18}/>
              )}
            </div>
          </div>

          <div className="obs-ctrl">
            <div className="cg">
              <button className={`cbtn ${micOn?"on":"off"}`} onClick={toggleMic}>
                <span className="cbtn-ic">{micOn?"🎤":"🔇"}</span><span>{micOn?"Mute":"Speak"}</span>
              </button>
              <button className={`cbtn${handRaised?" am":""}`} onClick={toggleHand}>
                <span className="cbtn-ic">✋</span><span>{handRaised?"Lower":"Raise"}</span>
              </button>
              <div style={{position:"relative"}}>
                <button className={`cbtn${showReactions?" hi":""}`} onClick={()=>setShowReactions(r=>!r)}><span className="cbtn-ic">😊</span><span>React</span></button>
                {showReactions && <div className="react-pop">{REACTIONS.map(r=><button key={r} className="react-em" onClick={()=>sendReaction(r)}>{r}</button>)}</div>}
              </div>
            </div>
            <div className="cg">
              <button className={`cbtn${panelTab==="chat"?" hi":""}`} onClick={()=>setPanelTab("chat")}><span className="cbtn-ic">💬</span><span>Chat</span></button>
              <button className={`cbtn${panelTab==="people"?" hi":""}`} onClick={()=>setPanelTab("people")}><span className="cbtn-ic">👥</span><span>People</span></button>
              <button className="end-room-btn" style={{background:"rgba(229,62,62,.8)"}} onClick={()=>setShowEnd(true)}>Leave</button>
            </div>
          </div>
        </div>

        <div className="side-panel" style={{width:280,minWidth:280}}>
          <div className="panel-tabs">
            {[{id:"chat",ic:"💬",lbl:"Chat"},{id:"people",ic:"👥",lbl:"People"}].map(t=>(
              <button key={t.id} className={`ptab${panelTab===t.id?" active":""}`} onClick={()=>setPanelTab(t.id as any)}>
                <span style={{fontSize:13}}>{t.ic}</span><span>{t.lbl}</span>
              </button>
            ))}
          </div>

          {panelTab==="chat" && (
            <div style={{display:"flex",flexDirection:"column" as const,height:"100%",minHeight:0}}>
              <div className="pscroll" style={{flex:1}}>
                <div className="chat-msgs">
                  {messages.map((m,i)=>{
                    const own=m.sender===config.name;
                    const isAI=m.type==="ai";
                    const isPresenter=m.type==="presenter";
                    return (
                      <div key={i} className={`chat-msg${own?" own":""}`}>
                        {!own && <div className="chat-av-s" style={{background:isAI?"rgba(45,156,219,.2)":isPresenter?presenterColor+"22":"rgba(255,255,255,.08)",color:isAI?"#7ed3f7":isPresenter?presenterColor:"rgba(255,255,255,.5)"}}>{isAI?"🤖":m.sender[0]?.toUpperCase()}</div>}
                        <div className="chat-bw">
                          {!own && <span className="chat-sender">{m.sender}</span>}
                          <div className={`chat-bubble ${own?"b-own":""}`} style={isAI?{background:"rgba(45,156,219,.09)",border:"1px solid rgba(45,156,219,.15)",color:"#d0e8ff",borderRadius:"3px 9px 9px 9px"}:!own?{background:"rgba(255,255,255,.07)",color:"#e8ecf2",border:"1px solid rgba(255,255,255,.07)",borderRadius:"3px 9px 9px 9px"}:{}}>{m.text}</div>
                          <span className="chat-t">{fmt(m.time)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef}/>
                </div>
              </div>
              <div className="chat-ia">
                <textarea className="chat-inp" placeholder="Ask a question…" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}} rows={1}/>
                <button className="chat-send" onClick={sendMsg}>➤</button>
              </div>
            </div>
          )}

          {panelTab==="people" && (
            <div className="pscroll">
              <div style={{padding:"7px 10px 2px",fontSize:9,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".07em",color:"rgba(255,255,255,.2)"}}>In this session</div>
              <div className="p-list">
                {[
                  {name:presenterName,role:"🎙️ Presenter",color:presenterColor,speaking:presenterSpeaking},
                  {name:"AI Moderator",role:"🤖 AI Moderator",color:"#2d9cdb",speaking:false},
                  {name:config.name,role:"👁️ Observer (You)",color:avColor(config.name),speaking:micOn},
                ].map((p,i)=>(
                  <div key={i} className="p-row">
                    <div className="p-av" style={{background:p.color+"20",color:p.color}}>{p.name==="AI Moderator"?"🤖":avInit(p.name)}</div>
                    <div className="p-info">
                      <div className="p-name">{p.name}</div>
                      <div className="p-role">{p.role}{p.speaking?" 🔊":""}</div>
                    </div>
                    {p.speaking && <SoundAnalyser active={true} color={p.color} bars={4} size={16}/>}
                    {handRaised && p.name===config.name && <span style={{fontSize:11}}>✋</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showEnd && (
        <div className="overlay" onClick={()=>setShowEnd(false)}>
          <div className="modal" style={{maxWidth:320,background:"#0c1422",border:"1px solid rgba(255,255,255,.1)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"22px 18px",textAlign:"center" as const}}>
              <div style={{fontSize:38,marginBottom:8}}>👋</div>
              <div style={{fontSize:13.5,fontWeight:800,color:"#fff",marginBottom:4}}>Leave seminar?</div>
              <div style={{fontSize:11.5,color:"rgba(255,255,255,.38)"}}>You've been observing for {timer}</div>
            </div>
            <div className="mf" style={{borderColor:"rgba(255,255,255,.08)"}}>
              <button className="btn-s" style={{background:"rgba(255,255,255,.04)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)"}} onClick={()=>setShowEnd(false)}>Stay</button>
              <button className="btn-d" onClick={()=>onEnd({timer,topic:session?.title||config.topic,subject:session?.subject||"",unit:session?.unit||"",participants:0,exchanges:exchangeCount,presenterName,modeType:"observer"})}>Leave Session</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ─── RESULTS ──────────────────────────────────────────────────────────────────
function SeminarResults({ result, onNew }: { result: any; onNew: () => void }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const isObserver = result.modeType === "observer";
  return (
    <div className="results-page route-enter">
      <div className="res-trophy">{isObserver?"👁️":"🎓"}</div>
      <h2 className="res-h">{isObserver?"Session Ended":"Seminar Complete!"}</h2>
      <p className="res-sub">
        {isObserver
          ? <>You observed <strong style={{color:"var(--em)"}}>{result.topic?.slice(0,30)||"the seminar"}</strong> for <strong style={{color:"var(--em)"}}>{result.timer}</strong>.</>
          : <>Seminar on <strong style={{color:"var(--em)"}}>{result.topic?.slice(0,30)}</strong> lasted <strong style={{color:"var(--em)"}}>{result.timer}</strong>. <span style={{color:"var(--em)"}}>📅 Saved to Calendar.</span></>
        }
      </p>
      {result.subject && (
        <div style={{display:"flex",gap:7,marginBottom:13,flexWrap:"wrap" as const,justifyContent:"center" as const}}>
          <span style={{padding:"3px 11px",borderRadius:20,background:"rgba(0,195,122,.08)",border:"1px solid rgba(0,195,122,.18)",fontSize:11,fontWeight:700,color:"var(--em)"}}>📚 {result.subject}</span>
          {result.unit && <span style={{padding:"3px 11px",borderRadius:20,background:"rgba(45,156,219,.08)",border:"1px solid rgba(45,156,219,.18)",fontSize:11,fontWeight:700,color:"var(--sky)"}}>📖 {result.unit}</span>}
        </div>
      )}
      <div className="res-stats">
        {[
          {l:"Duration",v:result.timer,i:"⏱️"},
          {l:isObserver?"Watched":"Chat",v:isObserver?result.timer:result.exchanges,i:isObserver?"👁️":"💬"},
          {l:isObserver?"Session":"Mode",v:isObserver?"Observer":result.modeType==="prepare"?"AI Prep":"Live",i:isObserver?"🎓":"🏅"},
        ].map((s,i)=>(
          <div key={s.l} className="res-stat" style={{animationDelay:`${i*.1}s`}}>
            <div className="res-stat-ic">{s.i}</div>
            <div className="res-stat-v">{s.v}</div>
            <div className="res-stat-l">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="res-acts">
        {!isObserver && <button className="btn-s" style={{borderColor:"rgba(0,195,122,.28)",color:"var(--em)"}} onClick={()=>setShowAnalysis(true)}>📊 View Report</button>}
        <button className="btn-p" style={{fontSize:13,width:"auto",padding:"10px 22px"}} onClick={onNew}>🎓 New Seminar</button>
      </div>
      {showAnalysis && <AnalysisModal topic={result.topic} subject={result.subject} unit={result.unit} timer={result.timer} exchanges={result.exchanges||0} presenterName={result.presenterName} onClose={()=>setShowAnalysis(false)}/>}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
type Screen = "setup"|"loading"|"room"|"results-loading"|"results";

export default function SeminarPage() {
  const [screen, setScreen, clearScreen] = useSessionState<Screen>("sp-screen","setup");
  const [config, setConfig, clearConfig] = useSessionState<any>("sp-config",null);
  const [result, setResult] = useState<any>(null);
  const [role, setRole] = useState("student");

  const isFullScreen = screen === "room" || screen === "loading" || screen === "results-loading";

  function handleLaunch(cfg: any) {
    setConfig(cfg);
    setScreen("loading");
  }

  function handleLoadingDone() {
    setScreen("room");
  }

  function handleEnd(res: any) {
    setConfig(null);
    setResult(res);
    setScreen("results-loading");
  }

  function handleResultsLoadingDone() {
    setScreen("results");
  }

  function handleNew() {
    setResult(null);
    clearScreen();
    clearConfig();
    setScreen("setup");
  }

  return (
    <>
      <style>{CSS}</style>
      <div className={`sp-app${isFullScreen?" fullscreen":""}`}>
        {screen==="setup" && <Navigation currentRole={role} onRoleChange={setRole}/>}

        {screen==="loading" && config && (
          <PageLoader
            label={config.seminarMode==="prepare"?"Entering AI Coach Room…":config.sessionSubMode==="observer"?"Joining as Observer…":"Launching Seminar Room…"}
            sublabel={config.seminarMode==="prepare"?"Setting up voice transcription & AI coach":config.sessionSubMode==="observer"?"Connecting to live session":"Preparing screen share & AI moderator"}
          />
        )}

        {screen==="loading" && config && (
          // Auto-advance after loader
          <AutoAdvance delay={2200} onDone={handleLoadingDone}/>
        )}

        {screen==="setup" && (
          <SeminarSetup onLaunch={handleLaunch}/>
        )}

        {screen==="room" && config && config.seminarMode==="prepare" && (
          <PrepareWithAIRoom config={config} onEnd={handleEnd}/>
        )}

        {screen==="room" && config && config.seminarMode==="session" && config.sessionSubMode==="presenter" && (
          <PresenterRoom config={config} onEnd={handleEnd}/>
        )}

        {screen==="room" && config && config.seminarMode==="session" && config.sessionSubMode==="observer" && (
          <ObserverRoom config={config} onEnd={handleEnd}/>
        )}

        {screen==="results-loading" && result && (
          <ResultsLoader
            onDone={handleResultsLoadingDone}
            isObserver={result.modeType==="observer"}
          />
        )}

        {screen==="results" && result && (
          <SeminarResults result={result} onNew={handleNew}/>
        )}
      </div>
    </>
  );
}

// ─── AUTO ADVANCE HELPER ──────────────────────────────────────────────────────
function AutoAdvance({ delay, onDone }: { delay: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, delay);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line
  return null;
}