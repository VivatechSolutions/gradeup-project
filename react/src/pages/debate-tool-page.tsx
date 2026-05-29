// import { useState, useEffect, useRef, useCallback } from "react";
// import Navigation from "../components/navigation";

// // ─── Global CSS ────────────────────────────────────────────────────────────────
// const GLOBAL_CSS = `
// @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
// *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
// html,body{height:100%}
// :root{
//   --bg-app:#f8fafc;--bg-dark:#060c1a;
//   --surface:#ffffff;--surface2:#f8fafc;--surface3:#f1f5f9;
//   --border:rgba(0,0,0,0.06);--border-l:rgba(255,255,255,0.07);
//   --ind:#6366f1;--ind2:#818cf8;--ind3:#a5b4fc;
//   --vio:#8b5cf6;--em:#10b981;--em2:#34d399;
//   --red:#ef4444;--amb:#f59e0b;--sky:#38bdf8;--pnk:#ec4899;
//   --t1:#0f172a;--t2:#475569;--t3:#94a3b8;--t4:#e2e8f0;
//   --font:'Plus Jakarta Sans',system-ui,sans-serif;
//   --mono:'JetBrains Mono',monospace;
//   --sh:0 4px 24px rgba(0,0,0,0.07);--sh2:0 24px 64px rgba(0,0,0,0.14);
//   --r:16px;
//   --grad:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
//   --grad2:linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%);
//   --grad3:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);
// }
// body{font-family:var(--font);background:var(--bg-app);color:var(--t1);-webkit-font-smoothing:antialiased}
// ::-webkit-scrollbar{width:4px;height:4px}
// ::-webkit-scrollbar-thumb{background:rgba(99,102,241,.22);border-radius:4px}
// button,input,select,textarea{font-family:var(--font)}

// /* App Shell */
// .da-app{min-height:100dvh;display:flex;flex-direction:column;background:var(--bg-app);overflow-x:hidden}
// .da-main{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden}

// /* Animations */
// @keyframes pageIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
// @keyframes slideDown{from{transform:translateY(-100%);opacity:0}to{transform:none;opacity:1}}
// @keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
// @keyframes badgePop{from{transform:scale(0)}to{transform:scale(1)}}
// @keyframes bpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
// @keyframes avatarPop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
// @keyframes chipIn{from{transform:scale(0);opacity:0}to{transform:none;opacity:1}}
// @keyframes recBlink{0%,100%{opacity:1}50%{opacity:.5}}
// @keyframes tileIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}
// @keyframes tRing{0%,100%{opacity:1}50%{opacity:.1}}
// @keyframes rPop{0%{opacity:0;transform:translate(-50%,-70%) scale(.4)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.25)}65%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-130%) scale(.7)}}
// @keyframes modalIn{from{opacity:0;transform:scale(.9) translateY(16px)}to{opacity:1;transform:none}}
// @keyframes fadeIn{from{opacity:0}to{opacity:1}}
// @keyframes hPop{from{opacity:0;transform:scale(.5) translateY(-10px)}to{opacity:1;transform:none}}
// @keyframes tIn{from{opacity:0;transform:translateX(-50%) translateY(24px) scale(.9)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
// @keyframes slideFromRight{from{transform:translateX(100%)}to{transform:none}}
// @keyframes trophyBounce{from{transform:scale(.3) translateY(30px);opacity:0}to{transform:none;opacity:1}}
// @keyframes popIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
// @keyframes analysisIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}

// .page-enter{animation:pageIn .45s cubic-bezier(.4,0,.2,1)}

// /* ─── Landing ─── */
// .land{flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:calc(100dvh - 60px);overflow:hidden}
// .land-left{background:var(--bg-dark);display:flex;flex-direction:column;justify-content:center;padding:clamp(20px,4vw,60px);border-right:1px solid var(--border-l);position:relative;overflow:hidden}
// .land-orb1{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%);top:-120px;left:-100px;pointer-events:none;animation:orbFloat 8s ease-in-out infinite}
// .land-orb2{position:absolute;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.1) 0%,transparent 70%);bottom:-80px;right:-60px;pointer-events:none;animation:orbFloat 10s ease-in-out infinite reverse}
// .land-grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(99,102,241,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.05) 1px,transparent 1px);background-size:44px 44px;pointer-events:none}
// .land-content{position:relative;z-index:1;animation:pageIn .6s cubic-bezier(.4,0,.2,1) .3s both;overflow-y:auto;max-height:100%}
// .land-badge{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:100px;background:rgba(99,102,241,.14);border:1px solid rgba(99,102,241,.28);font-size:10.5px;font-weight:800;color:var(--ind3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:22px}
// .land-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--em);animation:bpulse 2s infinite}
// .land-h1{font-size:clamp(24px,3.2vw,46px);font-weight:900;line-height:1.05;letter-spacing:-1.5px;color:#fff;margin-bottom:18px}
// .land-h1 .grad{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
// .land-p{font-size:13.5px;color:rgba(255,255,255,.48);line-height:1.8;max-width:440px;margin-bottom:32px}
// .land-feats{display:flex;flex-direction:column;gap:9px}
// .land-feat{display:flex;align-items:center;gap:13px;padding:12px 15px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:13px;transition:.25s;animation:pageIn .5s cubic-bezier(.4,0,.2,1) both}
// .land-feat:hover{background:rgba(99,102,241,.09);border-color:rgba(99,102,241,.22);transform:translateX(5px)}
// .land-feat-ico{font-size:19px;flex-shrink:0}
// .land-feat-txt strong{display:block;font-size:12.5px;font-weight:700;color:#fff;margin-bottom:1px}
// .land-feat-txt span{font-size:11px;color:rgba(255,255,255,.4)}
// .land-right{background:var(--surface);display:flex;align-items:center;justify-content:center;padding:clamp(24px,4vw,60px);overflow-y:auto}
// .mode-wrap{width:100%;max-width:480px;animation:pageIn .55s cubic-bezier(.4,0,.2,1)}
// .mode-title{font-size:clamp(20px,2.5vw,27px);font-weight:900;letter-spacing:-.5px;margin-bottom:6px;color:var(--t1)}
// .mode-sub{font-size:13px;color:var(--t2);margin-bottom:22px;line-height:1.6}

// /* Mode cards - 3 columns for 3 options */
// .mode-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px}
// .mode-card{padding:18px 14px;border-radius:16px;border:2px solid var(--border);background:var(--surface2);cursor:pointer;text-align:left;transition:all .22s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden}
// .mode-card:hover{border-color:rgba(99,102,241,.3);transform:translateY(-4px);box-shadow:0 12px 32px rgba(99,102,241,.13)}
// .mode-card.sel{border-color:var(--ind);background:rgba(99,102,241,.04);transform:translateY(-2px)}
// .mode-card-ico{font-size:28px;margin-bottom:10px;display:block;transition:.2s}
// .mode-card:hover .mode-card-ico{transform:scale(1.12)}
// .mode-card-title{font-size:13px;font-weight:800;margin-bottom:4px;color:var(--t1)}
// .mode-card-desc{font-size:11px;color:var(--t2);line-height:1.5}
// .mode-card-ck{position:absolute;top:9px;right:9px;width:20px;height:20px;border-radius:50%;background:var(--ind);display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;opacity:0;transition:.2s;transform:scale(0)}
// .mode-card.sel .mode-card-ck{opacity:1;transform:scale(1)}

// /* ─── Sub-mode selection (debate type / seminar type) ─── */
// .submode-section{background:rgba(99,102,241,.04);border:1.5px solid rgba(99,102,241,.14);border-radius:14px;padding:14px 16px;margin-bottom:16px;animation:pageIn .3s ease}
// .submode-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--t3);margin-bottom:10px}
// .submode-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
// .submode-opt{padding:12px 14px;border-radius:11px;border:1.5px solid var(--border);background:var(--surface);cursor:pointer;transition:all .2s;display:flex;align-items:flex-start;gap:9px}
// .submode-opt:hover{border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.03)}
// .submode-opt.sel{border-color:var(--ind);background:rgba(99,102,241,.06)}
// .submode-opt-ico{font-size:20px;flex-shrink:0;margin-top:1px}
// .submode-opt-title{font-size:12.5px;font-weight:800;color:var(--t1);margin-bottom:3px}
// .submode-opt-desc{font-size:11px;color:var(--t2);line-height:1.5}

// /* ─── Join by link section ─── */
// .join-section{border:1.5px dashed rgba(99,102,241,.25);border-radius:14px;padding:14px 16px;margin-bottom:14px;background:rgba(99,102,241,.02)}
// .join-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--t3);margin-bottom:10px}
// .join-input-row{display:flex;gap:8px}

// /* ─── Setup ─── */
// .setup-full{flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:calc(100dvh - 60px);overflow:hidden;animation:pageIn .45s cubic-bezier(.4,0,.2,1)}
// .setup-left{background:var(--bg-dark);display:flex;flex-direction:column;justify-content:center;padding:clamp(20px,4vw,60px);position:relative;overflow:hidden;border-right:1px solid var(--border-l)}
// .setup-right{background:var(--surface);overflow-y:auto;padding:clamp(16px,3vw,48px);display:flex;flex-direction:column}
// .setup-right-inner{max-width:490px;width:100%;margin:auto}
// .setup-back{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:var(--t2);background:none;border:none;cursor:pointer;padding:0 0 20px;transition:.18s}
// .setup-back:hover{color:var(--ind);transform:translateX(-3px)}
// .setup-title{font-size:21px;font-weight:900;letter-spacing:-.4px;margin-bottom:4px;color:var(--t1)}
// .setup-sub{font-size:13px;color:var(--t2);margin-bottom:16px;line-height:1.6}

// /* Cam / Mic Preview */
// .cam-preview{width:100%;aspect-ratio:16/9;border-radius:13px;background:var(--surface3);border:1.5px solid var(--border);overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;margin-bottom:10px}
// .cam-preview video{width:100%;height:100%;object-fit:cover}
// .cam-off{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;width:100%;height:100%;background:linear-gradient(135deg,rgba(99,102,241,.06),rgba(139,92,246,.03))}
// .cam-off-av{width:56px;height:56px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;box-shadow:0 8px 20px rgba(99,102,241,.4);animation:avatarPop .4s cubic-bezier(.34,1.56,.64,1)}
// .cam-name-tag{position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.15);border-radius:7px;padding:3px 9px;font-size:11px;font-weight:700;color:#fff}
// .perm-bar{display:flex;gap:7px;margin-bottom:10px;flex-wrap:wrap}
// .perm-btn{flex:1;min-width:100px;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 11px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);color:var(--t2);cursor:pointer;font-size:12px;font-weight:700;transition:.18s;white-space:nowrap}
// .perm-btn:hover:not(:disabled){border-color:rgba(99,102,241,.3);color:var(--t1)}
// .perm-btn.granted{background:rgba(16,185,129,.07);border-color:rgba(16,185,129,.3);color:var(--em)}
// .perm-btn.denied{background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.25);color:var(--red)}
// .perm-btn.req{background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.25);color:var(--ind)}
// .perm-btn:disabled{opacity:.45;cursor:not-allowed}
// .perm-warn{display:flex;align-items:flex-start;gap:8px;padding:9px 12px;border-radius:10px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.18);font-size:12px;color:#fca5a5;line-height:1.6;margin-bottom:9px;font-weight:600}

// /* Mic-only preview for debate */
// .mic-preview{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:13px;background:rgba(99,102,241,.05);border:1.5px solid rgba(99,102,241,.14);margin-bottom:10px}
// .mic-av{width:52px;height:52px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;box-shadow:0 6px 18px rgba(99,102,241,.35);flex-shrink:0}
// .mic-info{flex:1}
// .mic-name{font-size:15px;font-weight:800;color:var(--t1);margin-bottom:2px}
// .mic-sub{font-size:12px;color:var(--t2)}
// .mic-status{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700}

// /* Cal sync */
// .cal-sync-banner{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.22);margin-bottom:12px;transition:.2s}
// .cal-sync-ico{font-size:20px;flex-shrink:0}
// .cal-sync-text strong{display:block;font-size:12px;font-weight:800;color:var(--em);margin-bottom:1px}
// .cal-sync-text span{font-size:11px;color:var(--t2);line-height:1.4}
// .toggle-sw{width:40px;height:21px;border-radius:11px;border:none;cursor:pointer;position:relative;transition:.2s;flex-shrink:0;margin-left:auto}
// .toggle-thumb{position:absolute;top:2px;width:17px;height:17px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 2px 4px rgba(0,0,0,.2)}

// /* Steps */
// .steps{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
// .step-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:11px;border:1.5px solid var(--border);background:var(--surface2);transition:.22s}
// .step-item.done{border-color:rgba(16,185,129,.35);background:rgba(16,185,129,.04)}
// .step-item.active{border-color:rgba(99,102,241,.35);background:rgba(99,102,241,.04)}
// .step-item.pending{opacity:.5}
// .step-num{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
// .step-item.done .step-num{background:var(--em);color:#fff}
// .step-item.active .step-num{background:var(--ind);color:#fff}
// .step-item.pending .step-num{background:var(--surface3);color:var(--t3)}
// .step-label{font-size:12.5px;font-weight:700}
// .step-item.done .step-label{color:var(--em)}
// .step-item.active .step-label{color:var(--t1)}
// .step-item.pending .step-label{color:var(--t3)}

// /* Form */
// .fi{margin-bottom:11px}
// .fl{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--t3);margin-bottom:5px}
// .finput{width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);color:var(--t1);font-size:13px;outline:none;transition:all .18s;font-family:var(--font)}
// .finput:focus{border-color:var(--ind);background:var(--surface);box-shadow:0 0 0 3px rgba(99,102,241,.1)}
// .finput::placeholder{color:var(--t3)}
// select.finput{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}
// .fi-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}
// .user-chips{display:flex;flex-wrap:wrap;gap:6px;padding:7px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);min-height:34px;margin-bottom:7px}
// .user-chip{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:100px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25);font-size:11.5px;font-weight:700;color:var(--ind);animation:chipIn .2s cubic-bezier(.34,1.56,.64,1)}
// .chip-rm{background:none;border:none;cursor:pointer;color:var(--t3);font-size:13px;padding:0;line-height:1;transition:.15s}
// .chip-rm:hover{color:var(--red)}
// .link-row{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);margin-bottom:9px}
// .link-val{flex:1;font-family:var(--mono);font-size:11px;color:var(--ind);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
// .copy-btn{padding:5px 12px;border-radius:7px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:11.5px;font-weight:800;font-family:var(--font);transition:.18s;flex-shrink:0}
// .copy-btn:hover{transform:scale(1.05)}

// /* Buttons */
// .btn-p{padding:12px 20px;border-radius:11px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:13px;font-weight:800;transition:all .22s;box-shadow:0 6px 20px rgba(99,102,241,.28);width:100%;display:flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font)}
// .btn-p:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 28px rgba(99,102,241,.36)}
// .btn-p:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
// .btn-s{padding:10px 16px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);cursor:pointer;color:var(--t2);font-size:12.5px;font-weight:700;transition:.18s;font-family:var(--font)}
// .btn-s:hover{border-color:rgba(99,102,241,.3);color:var(--t1);transform:translateY(-1px)}
// .btn-d{padding:10px 16px;border-radius:10px;border:1.5px solid rgba(239,68,68,.25);background:rgba(239,68,68,.05);cursor:pointer;color:var(--red);font-size:12.5px;font-weight:700;font-family:var(--font);transition:.18s}
// .btn-d:hover{background:rgba(239,68,68,.12);transform:translateY(-1px)}

// /* ─── ROOM ─── */
// .room-root{height:calc(100dvh - 60px);display:flex;flex-direction:column;overflow:hidden;background:#030609;animation:pageIn .4s ease}
// .room-topbar{height:52px;background:rgba(3,6,9,.97);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 12px;gap:6px;flex-shrink:0;z-index:100;overflow:hidden}
// .room-logo{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:800;flex-shrink:0;color:#fff;cursor:pointer;transition:.15s}
// .room-logo:hover{opacity:.8}
// .room-logo-ico{width:26px;height:26px;background:var(--grad);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px}
// .tb-div{width:1px;height:16px;background:rgba(255,255,255,.08);flex-shrink:0}
// .tb-topic{flex:1;font-size:12px;color:rgba(255,255,255,.4);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
// .tb-topic strong{color:#fff}
// .tb-pill{display:flex;align-items:center;gap:4px;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700;flex-shrink:0;white-space:nowrap}
// .tb-timer{background:rgba(99,102,241,.14);border:1px solid rgba(99,102,241,.22);color:var(--ind3);font-family:var(--mono)}
// .tb-rec{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.22);color:var(--red);animation:recBlink 1.5s infinite}
// .tb-rec-dot{width:6px;height:6px;border-radius:50%;background:var(--red)}
// .tb-sharing{background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.22);color:var(--sky)}
// .tb-back-btn{padding:4px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);cursor:pointer;font-size:11px;font-weight:700;font-family:var(--font);transition:.15s;flex-shrink:0}
// .tb-back-btn:hover{background:rgba(255,255,255,.12);color:#fff}

// /* Video grid */
// .room-body{flex:1;display:flex;min-height:0;overflow:hidden}
// .grid-wrap{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
// .vid-grid{flex:1;display:grid;gap:4px;padding:8px;min-height:0;overflow:hidden}
// .vid-grid.g1{grid-template-columns:1fr}
// .vid-grid.g2{grid-template-columns:1fr 1fr}
// .vid-grid.g3{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
// .vid-grid.g4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
// .vid-grid.g5{grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr}
// .tile{border-radius:11px;background:#0e1525;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;transition:box-shadow .25s;min-height:0;animation:tileIn .3s ease}
// .tile.speaking{box-shadow:0 0 0 3px var(--em),0 0 24px rgba(16,185,129,.22)}
// .tile video{width:100%;height:100%;object-fit:cover;display:block}
// .tile-av{width:clamp(48px,7vw,84px);height:clamp(48px,7vw,84px);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:clamp(20px,3vw,34px);font-weight:800}
// .tile-ring{position:absolute;inset:0;border-radius:11px;border:2.5px solid var(--em);pointer-events:none;animation:tRing 1.5s ease-in-out infinite}
// .tile-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.85));padding:24px 10px 9px;display:flex;align-items:flex-end;justify-content:space-between;gap:5px}
// .tile-name{font-size:clamp(10px,1.2vw,12.5px);font-weight:700;color:#fff;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
// .t-badge{font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:20px;color:#fff;white-space:nowrap}
// .t-badge.host{background:var(--amb);color:#000}.t-badge.ai{background:var(--grad)}.t-badge.you{background:rgba(255,255,255,.18)}.t-badge.med{background:rgba(56,189,248,.8);color:#000}
// .tile-muted{width:22px;height:22px;border-radius:50%;background:rgba(239,68,68,.85);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px}
// .tile-hand-tag{position:absolute;top:9px;left:9px;background:rgba(245,158,11,.92);border-radius:7px;padding:3px 9px;font-size:11.5px;font-weight:800;color:#000;animation:hPop .35s cubic-bezier(.34,1.56,.64,1)}
// .tile-reaction{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:48px;animation:rPop 2.2s forwards;pointer-events:none;z-index:5}

// /* Controls */
// .controls{min-height:64px;padding:8px 12px;background:rgba(3,6,9,.98);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:6px;flex-wrap:wrap}
// .cg{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
// .cbtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;border-radius:9px;border:1px solid rgba(255,255,255,.1);cursor:pointer;background:rgba(255,255,255,.05);color:rgba(255,255,255,.55);font-size:9.5px;font-weight:700;transition:.18s;min-width:46px;font-family:var(--font)}
// .cbtn:hover{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2);transform:translateY(-2px)}
// .cbtn.on{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.4);color:var(--em)}
// .cbtn.off{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.3);color:var(--red)}
// .cbtn.hi{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.4);color:var(--ind3)}
// .cbtn.amb{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:var(--amb)}
// .cbtn.sky{background:rgba(56,189,248,.1);border-color:rgba(56,189,248,.3);color:var(--sky)}
// .cbtn.em{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.3);color:var(--em)}
// .cbtn.rec-active{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.5);color:var(--red);animation:recBlink 1.5s infinite}
// .end-btn{padding:9px 18px;border-radius:9px;border:none;cursor:pointer;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:12.5px;font-weight:800;font-family:var(--font);box-shadow:0 4px 14px rgba(239,68,68,.3);transition:.2s;white-space:nowrap}
// .end-btn:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(239,68,68,.42)}
// .react-popup{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#1a2236;border:1px solid rgba(255,255,255,.1);border-radius:13px;padding:9px 11px;display:flex;gap:7px;box-shadow:var(--sh2);z-index:200;animation:modalIn .2s ease}
// .react-btn{font-size:21px;cursor:pointer;padding:4px;border-radius:7px;border:none;background:none;transition:.15s}
// .react-btn:hover{transform:scale(1.4)}
// .rec-overlay{position:fixed;top:66px;right:14px;background:rgba(239,68,68,.92);border-radius:9px;padding:5px 12px;display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:800;color:#fff;z-index:200;animation:recBlink 1.5s infinite;box-shadow:0 4px 14px rgba(239,68,68,.4)}
// .share-overlay{position:fixed;top:66px;left:14px;background:rgba(56,189,248,.9);border-radius:9px;padding:5px 12px;display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:800;color:#000;z-index:200}

// /* Side panel */
// .side-panel{width:290px;min-width:290px;background:rgba(3,6,9,.98);border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;animation:slideFromRight .3s ease}
// .panel-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
// .ptab{flex:1;padding:10px 4px;background:none;border:none;color:rgba(255,255,255,.35);font-size:9.5px;font-weight:700;cursor:pointer;border-bottom:2px solid transparent;transition:.18s;display:flex;flex-direction:column;align-items:center;gap:3px;font-family:var(--font)}
// .ptab:hover{color:rgba(255,255,255,.7)}
// .ptab.active{color:var(--ind3);border-bottom-color:var(--ind)}
// .ptab.cls{flex:0;padding:10px 9px;color:rgba(255,255,255,.25)}
// .ptab.cls:hover{color:#fff}
// .pscroll{flex:1;overflow-y:auto;min-height:0}
// .p-list{padding:9px;display:flex;flex-direction:column;gap:5px}
// .p-row{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:.18s}
// .p-row:hover{border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.07)}
// .p-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0}
// .p-info{flex:1;min-width:0}
// .p-name{font-size:12.5px;font-weight:700;color:#fff;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
// .p-role{font-size:10.5px;color:rgba(255,255,255,.3)}

// /* Chat */
// .chat-msgs{padding:10px;display:flex;flex-direction:column;gap:7px}
// .chat-msg{display:flex;gap:7px;animation:pageIn .2s ease}
// .chat-msg.own{flex-direction:row-reverse}
// .chat-av-sm{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;flex-shrink:0;align-self:flex-end}
// .chat-bwrap{display:flex;flex-direction:column;gap:2px;max-width:82%}
// .chat-msg.own .chat-bwrap{align-items:flex-end}
// .chat-sender{font-size:9.5px;font-weight:700;color:rgba(255,255,255,.3)}
// .chat-bubble{padding:8px 11px;border-radius:11px;font-size:12.5px;line-height:1.55;word-break:break-word}
// .chat-bubble.other{background:rgba(255,255,255,.07);color:#fff;border-radius:4px 11px 11px 11px;border:1px solid rgba(255,255,255,.08)}
// .chat-bubble.own{background:var(--grad);color:#fff;border-radius:11px 4px 11px 11px}
// .chat-time{font-size:9.5px;color:rgba(255,255,255,.2)}
// .chat-empty{text-align:center;color:rgba(255,255,255,.22);font-size:12.5px;padding:24px 10px;line-height:1.7}
// .chat-ia{padding:9px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;display:flex;gap:7px;align-items:flex-end}
// .chat-input{flex:1;padding:8px 11px;border-radius:9px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#fff;font-size:12.5px;outline:none;resize:none;min-height:36px;max-height:80px;transition:border .15s;font-family:var(--font)}
// .chat-input:focus{border-color:var(--ind)}
// .chat-input::placeholder{color:rgba(255,255,255,.22)}
// .chat-send{width:34px;height:34px;border-radius:8px;background:var(--grad);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.18s;font-size:14px}
// .chat-send:hover{transform:scale(1.1)}

// /* Debate panel */
// .dp-wrap{padding:10px;display:flex;flex-direction:column;gap:9px}
// .score-card{background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.12));border:1px solid rgba(99,102,241,.28);border-radius:13px;padding:13px}
// .sc-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.38);margin-bottom:9px}
// .sc-row{display:flex;align-items:center;gap:9px}
// .sc-item{flex:1;text-align:center}
// .sc-val{font-size:28px;font-weight:900}
// .sc-val.u{color:var(--sky)}.sc-val.a{color:var(--vio)}
// .sc-lbl{font-size:10.5px;color:rgba(255,255,255,.38);margin-top:2px}
// .sc-vs{font-size:15px;font-weight:900;color:rgba(255,255,255,.25)}
// .sc-bar{height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:8px}
// .sc-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--sky),var(--ind),var(--vio));transition:width .7s ease}
// .phase-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 13px}
// .ph-step{display:flex;align-items:center;gap:8px;padding:7px;border-radius:7px;font-size:12px;transition:.18s;margin-bottom:2px}
// .ph-step.act{background:rgba(99,102,241,.12)}
// .ph-num{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
// .ph-num.done{background:var(--em);color:#fff}.ph-num.act{background:var(--ind);color:#fff}.ph-num.pend{background:rgba(255,255,255,.08);color:rgba(255,255,255,.28)}
// .ph-lbl{font-weight:700;color:rgba(255,255,255,.45)}
// .ph-step.act .ph-lbl{color:#fff}

// /* ─── ANALYSIS REPORT ─── */
// .analysis-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(16px);z-index:800;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .25s ease}
// .analysis-modal{background:#0c1120;border:1px solid rgba(99,102,241,.25);border-radius:22px;width:100%;max-width:680px;max-height:90dvh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.6);animation:modalIn .3s cubic-bezier(.34,1.56,.64,1)}
// .analysis-header{padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;display:flex;align-items:center;justify-content:space-between}
// .analysis-title{font-size:18px;font-weight:900;color:#fff;display:flex;align-items:center;gap:9px}
// .analysis-body{overflow-y:auto;flex:1;padding:20px 24px}
// .analysis-section{margin-bottom:20px;animation:analysisIn .4s ease both}
// .analysis-sec-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.35);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.07)}
// .score-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:6px}
// .score-item{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:12px;text-align:center}
// .score-item-val{font-size:26px;font-weight:900;margin-bottom:4px}
// .score-item-lbl{font-size:10.5px;color:rgba(255,255,255,.4);font-weight:600}
// .progress-bar-wrap{margin-bottom:7px}
// .progress-bar-label{display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.5);font-weight:600;margin-bottom:4px}
// .progress-bar{height:6px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
// .progress-fill{height:100%;border-radius:4px;transition:width 1s ease}
// .strength-list{display:flex;flex-direction:column;gap:6px}
// .strength-item{display:flex;align-items:flex-start;gap:9px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}
// .strength-ico{font-size:16px;flex-shrink:0;margin-top:1px}
// .strength-text{font-size:12.5px;color:rgba(255,255,255,.65);line-height:1.55}
// .strength-text strong{color:#fff;font-weight:700}
// .participant-analysis{display:flex;flex-direction:column;gap:8px}
// .pa-row{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:12px 14px}
// .pa-name{font-size:13px;font-weight:800;color:#fff;margin-bottom:6px;display:flex;align-items:center;gap:7px}
// .pa-bars{display:flex;flex-direction:column;gap:5px}
// .verdict-box{padding:14px 16px;border-radius:13px;border:1.5px solid;text-align:center}
// .verdict-winner{font-size:24px;font-weight:900;margin-bottom:4px}
// .verdict-label{font-size:12px;font-weight:700;opacity:.7}
// .analysis-footer{padding:14px 24px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;display:flex;justify-content:flex-end;gap:9px}

// /* ─── Results ─── */
// .results{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:clamp(20px,4vw,56px);text-align:center;overflow-y:auto;background:radial-gradient(ellipse at 50% 30%,rgba(99,102,241,.06) 0%,transparent 65%);animation:pageIn .5s ease;min-height:calc(100dvh - 60px)}
// .res-trophy{font-size:66px;margin-bottom:14px;animation:trophyBounce .6s cubic-bezier(.34,1.56,.64,1) .2s both}
// .res-title{font-size:clamp(22px,3.5vw,36px);font-weight:900;letter-spacing:-1px;margin-bottom:7px;color:var(--t1)}
// .res-sub{font-size:13.5px;color:var(--t2);max-width:360px;line-height:1.7;margin-bottom:20px}
// .res-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;width:100%;max-width:360px;margin-bottom:18px}
// .res-stat{background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:14px;box-shadow:var(--sh);animation:pageIn .4s ease both}
// .res-stat-ico{font-size:20px;margin-bottom:4px}
// .res-stat-val{font-size:clamp(18px,2.5vw,26px);font-weight:900;color:var(--ind)}
// .res-stat-lbl{font-size:10.5px;color:var(--t3);margin-top:2px}

// /* Modal */
// .overlay{position:fixed;inset:0;background:rgba(10,15,30,.55);backdrop-filter:blur(14px);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease}
// .modal{background:var(--surface);border:1px solid var(--border);border-radius:21px;width:100%;max-width:480px;box-shadow:var(--sh2);overflow:hidden;animation:modalIn .28s cubic-bezier(.34,1.56,.64,1);max-height:calc(100dvh - 32px);display:flex;flex-direction:column}
// .mh{padding:16px 20px 13px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
// .mh-title{font-size:15.5px;font-weight:800;color:var(--t1)}
// .mh-close{width:28px;height:28px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface2);cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center;transition:.15s;font-size:13px}
// .mh-close:hover{color:var(--t1);transform:rotate(90deg)}
// .mb{padding:16px 20px;overflow-y:auto;flex:1}
// .mf{padding:13px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:9px;flex-shrink:0;flex-wrap:wrap}

// /* Dark modal variant */
// .modal.dark{background:#0c1120;border-color:rgba(255,255,255,.1)}
// .modal.dark .mh{border-color:rgba(255,255,255,.08)}
// .modal.dark .mh-title{color:#fff}
// .modal.dark .mf{border-color:rgba(255,255,255,.08)}

// /* Toast */
// .toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--surface);border:1.5px solid var(--border);border-radius:13px;padding:11px 18px;font-size:13px;font-weight:700;color:var(--t1);box-shadow:var(--sh2);z-index:9999;display:flex;align-items:center;gap:8px;animation:tIn .35s cubic-bezier(.34,1.56,.64,1);white-space:nowrap;max-width:calc(100vw - 32px)}
// .toast.success{border-color:rgba(16,185,129,.4)}.toast.error{border-color:rgba(239,68,68,.4)}.toast.warn{border-color:rgba(245,158,11,.4)}.toast.info{border-color:rgba(99,102,241,.35)}

// /* sync success */
// .sync-success{display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);border-radius:12px;margin-top:10px;text-align:center;animation:pageIn .35s cubic-bezier(.34,1.56,.64,1)}
// .sync-success-ico{font-size:28px}
// .sync-success-title{font-size:13px;font-weight:800;color:var(--em)}
// .sync-success-sub{font-size:11.5px;color:var(--t2);line-height:1.55}

// /* ─── Responsive ─── */
// @media(max-width:1100px){.side-panel{width:260px;min-width:260px}}
// @media(max-width:960px){
//   .land,.setup-full{grid-template-columns:1fr;min-height:auto;height:auto;overflow-y:auto}
//   .land-left,.setup-left{padding:clamp(20px,4vw,36px);min-height:auto}
//   .land-feats{display:none}
//   .land-right,.setup-right{overflow-y:visible;padding:clamp(16px,4vw,36px)}
//   .mode-cards{grid-template-columns:1fr 1fr 1fr}
// }
// @media(max-width:768px){
//   .mode-cards{grid-template-columns:1fr}
//   .submode-opts{grid-template-columns:1fr}
//   .controls{padding:7px 9px}
//   .cg{gap:2px;justify-content:center}
//   .cbtn{padding:6px;min-width:42px;font-size:9px}
//   .side-panel{display:none}
//   .side-panel.mob-open{display:flex;position:fixed;inset:0;z-index:300;width:100vw;min-width:unset;border-left:none}
//   .tb-topic{display:none}
//   .vid-grid.g3,.vid-grid.g4,.vid-grid.g5{grid-template-columns:1fr 1fr}
//   .score-grid{grid-template-columns:1fr 1fr 1fr}
//   .analysis-modal{border-radius:16px 16px 0 0;max-height:95dvh}
//   .analysis-overlay{align-items:flex-end;padding:0}
//   .fi-row{grid-template-columns:1fr}
// }
// @media(max-width:640px){
//   .land-left,.setup-left{padding:16px 16px 22px}
//   .land-right,.setup-right{padding:14px}
//   .mode-cards{grid-template-columns:1fr 1fr}
//   .overlay{align-items:flex-end;padding:0}
//   .modal{border-radius:18px 18px 0 0;max-height:92dvh}
//   .res-stats{grid-template-columns:1fr 1fr 1fr}
//   .score-grid{grid-template-columns:1fr}
// }
// @media(max-width:440px){
//   .mode-cards{grid-template-columns:1fr}
//   .cbtn span:last-child{display:none}
//   .cbtn{min-width:36px}
// }
// `;

// // ─── Constants ────────────────────────────────────────────────────────────────
// const CAL_STORE = "debateArena_calendar_events";
// const NOTIF_STORE = "debateArena_notifications";
// const COLORS_ARR = [
//   "#6366f1",
//   "#10b981",
//   "#f59e0b",
//   "#38bdf8",
//   "#ec4899",
//   "#8b5cf6",
//   "#f97316",
// ];
// const TOPICS = [
//   "Should AI replace human teachers?",
//   "Is social media harmful to democracy?",
//   "Should coding be mandatory in all schools?",
//   "Is nuclear energy the answer to climate change?",
//   "Should universal basic income be implemented?",
//   "Is space exploration worth the cost?",
//   "Should animal testing be banned?",
//   "Were the Crusades justified?",
// ];
// const PHASES = [
//   "Opening Statements",
//   "Cross-Examination",
//   "Rebuttal Round",
//   "Closing Arguments",
// ];
// const REACTIONS = ["👍", "👏", "❤️", "😂", "🔥", "🤔"];
// const AI_REPLIES = [
//   "That's interesting — but consider the counter-evidence carefully.",
//   "I'd challenge that argument — the data suggests otherwise.",
//   "Strong point! You're overlooking the long-term implications though.",
//   "Can you provide concrete evidence for that claim?",
//   "Let me offer a rebuttal to that perspective.",
//   "That reasoning relies on a false premise. Here's why.",
//   "Excellent argument. The strongest counter would be…",
// ];

// const genLink = () =>
//   `https://debatearena.app/join?room=${Math.random().toString(36).slice(2, 10)}`;
// const fmt12 = (t) => {
//   if (!t) return "";
//   const [h, m] = t.split(":").map(Number);
//   return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// function pushNotification({ title, body, eventType, category }) {
//   try {
//     const existing = JSON.parse(localStorage.getItem(NOTIF_STORE) || "[]");
//     const notif = {
//       id: Date.now().toString(),
//       title,
//       message: body,
//       category: category || "system",
//       icon:
//         {
//           debate: "⚔️",
//           meeting: "📹",
//           recording: "🎬",
//           schedule: "📅",
//           join: "👥",
//         }[eventType] || "🔔",
//       iconColor:
//         {
//           debate: "blue",
//           meeting: "sky",
//           recording: "purple",
//           schedule: "green",
//           join: "amber",
//         }[eventType] || "blue",
//       time: "Just now",
//       read: false,
//     };
//     localStorage.setItem(
//       NOTIF_STORE,
//       JSON.stringify([notif, ...existing].slice(0, 50)),
//     );
//     window.dispatchEvent(new StorageEvent("storage", { key: NOTIF_STORE }));
//   } catch {}
// }
// function syncToCalendar({
//   type,
//   title,
//   date,
//   time,
//   duration,
//   attendees = [],
//   link,
//   description = "",
// }) {
//   try {
//     const existing = JSON.parse(localStorage.getItem(CAL_STORE) || "[]");
//     const evt = {
//       id: Date.now().toString(),
//       type,
//       title,
//       date: new Date(date).toISOString(),
//       time: time || null,
//       duration: duration || "1 hour",
//       description,
//       attendees: attendees.map((a) => ({
//         name: typeof a === "string" ? a : a.value || a.name || "",
//         email:
//           typeof a === "object" && a.type === "email" ? a.value : a.email || "",
//         notified: !!(typeof a === "object" && a.type === "email"),
//       })),
//       link: link || null,
//       createdAt: new Date().toISOString(),
//       fromDebateArena: true,
//     };
//     localStorage.setItem(CAL_STORE, JSON.stringify([...existing, evt]));
//     window.dispatchEvent(new StorageEvent("storage", { key: CAL_STORE }));
//     return true;
//   } catch {
//     return false;
//   }
// }

// // ─── Hooks ────────────────────────────────────────────────────────────────────
// function useTimer(active) {
//   const [s, setS] = useState(0);
//   useEffect(() => {
//     if (!active) return;
//     const id = setInterval(() => setS((x) => x + 1), 1000);
//     return () => clearInterval(id);
//   }, [active]);
//   return [
//     `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`,
//     s,
//   ];
// }
// function useMicPerm() {
//   const [state, setState] = useState("idle");
//   const [stream, setStream] = useState(null);
//   async function request() {
//     setState("requesting");
//     try {
//       const s = await navigator.mediaDevices.getUserMedia({
//         audio: true,
//         video: false,
//       });
//       setStream(s);
//       setState("granted");
//       return s;
//     } catch {
//       setState("denied");
//       return null;
//     }
//   }
//   function stop() {
//     stream?.getTracks().forEach((t) => t.stop());
//     setStream(null);
//     setState("idle");
//   }
//   return { state, stream, request, stop };
// }
// function useMediaPerm() {
//   const [state, setState] = useState("idle");
//   const [stream, setStream] = useState(null);
//   async function request() {
//     setState("requesting");
//     try {
//       const s = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//       setStream(s);
//       setState("granted");
//       return s;
//     } catch {
//       setState("denied");
//       return null;
//     }
//   }
//   function stop() {
//     stream?.getTracks().forEach((t) => t.stop());
//     setStream(null);
//     setState("idle");
//   }
//   return { state, stream, request, stop };
// }
// function useScreenRecorder() {
//   const mrRef = useRef(null);
//   const chunksRef = useRef([]);
//   const [isRecording, setIsRecording] = useState(false);
//   const [blob, setBlob] = useState(null);
//   async function start(audioStream) {
//     try {
//       const ds = await navigator.mediaDevices.getDisplayMedia({
//         video: { displaySurface: "browser" },
//         audio: true,
//       });
//       const tracks = [...ds.getTracks()];
//       if (audioStream)
//         audioStream.getAudioTracks().forEach((t) => tracks.push(t));
//       const combined = new MediaStream(tracks);
//       const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
//         ? "video/webm;codecs=vp9,opus"
//         : "video/webm";
//       const mr = new MediaRecorder(combined, { mimeType: mime });
//       chunksRef.current = [];
//       mr.ondataavailable = (e) => {
//         if (e.data.size > 0) chunksRef.current.push(e.data);
//       };
//       mr.onstop = () => {
//         setBlob(new Blob(chunksRef.current, { type: mime }));
//         combined.getTracks().forEach((t) => t.stop());
//       };
//       ds.getVideoTracks()[0].addEventListener("ended", () => stop());
//       mr.start(1000);
//       mrRef.current = mr;
//       setIsRecording(true);
//       return true;
//     } catch (e) {
//       console.warn("Recording failed:", e);
//       return false;
//     }
//   }
//   function stop() {
//     if (mrRef.current?.state !== "inactive") mrRef.current?.stop();
//     setIsRecording(false);
//   }
//   function download(fname = "debatearena.webm") {
//     if (!blob) return;
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = fname;
//     a.click();
//     URL.revokeObjectURL(url);
//   }
//   return { isRecording, blob, start, stop, download };
// }
// function useScreenShare() {
//   const [isSharing, setIsSharing] = useState(false);
//   const [shareStream, setShareStream] = useState(null);
//   async function start() {
//     try {
//       const s = await navigator.mediaDevices.getDisplayMedia({
//         video: true,
//         audio: false,
//       });
//       s.getVideoTracks()[0].addEventListener("ended", () => stop());
//       setShareStream(s);
//       setIsSharing(true);
//       return true;
//     } catch {
//       return false;
//     }
//   }
//   function stop() {
//     shareStream?.getTracks().forEach((t) => t.stop());
//     setShareStream(null);
//     setIsSharing(false);
//   }
//   return { isSharing, shareStream, start, stop };
// }

// // ─── Toast ────────────────────────────────────────────────────────────────────
// function Toast({ msg, type, onDone }) {
//   useEffect(() => {
//     const t = setTimeout(onDone, 3200);
//     return () => clearTimeout(t);
//   }, []);
//   const ico =
//     { success: "✅", error: "❌", warn: "⚠️", info: "ℹ️" }[type] || "ℹ️";
//   return (
//     <div className={`toast ${type}`}>
//       {ico} {msg}
//     </div>
//   );
// }

// // ─── Mic-only preview ─────────────────────────────────────────────────────────
// function MicPreview({
//   permState,
//   stream,
//   name,
//   onRequest,
//   micOn,
//   onToggleMic,
// }) {
//   return (
//     <div className="mic-preview">
//       <div className="mic-av">{name ? name[0].toUpperCase() : "?"}</div>
//       <div className="mic-info">
//         <div className="mic-name">{name || "Your Name"}</div>
//         <div className="mic-sub">Debate mode — audio only</div>
//         <div
//           style={{ marginTop: 7, display: "flex", gap: 7, flexWrap: "wrap" }}
//         >
//           {permState === "idle" && (
//             <button className="perm-btn req" onClick={onRequest}>
//               🎤 Allow Microphone
//             </button>
//           )}
//           {permState === "requesting" && (
//             <button className="perm-btn req" disabled>
//               ⏳ Requesting…
//             </button>
//           )}
//           {permState === "denied" && (
//             <button className="perm-btn denied" onClick={onRequest}>
//               🔄 Retry Mic
//             </button>
//           )}
//           {permState === "granted" && (
//             <>
//               <button
//                 className={`perm-btn ${micOn ? "granted" : "denied"}`}
//                 onClick={onToggleMic}
//               >
//                 {micOn ? "🎤 Mic On" : "🔇 Mic Off"}
//               </button>
//               <span
//                 style={{
//                   padding: "7px 11px",
//                   borderRadius: 9,
//                   background: "rgba(16,185,129,.08)",
//                   border: "1px solid rgba(16,185,129,.2)",
//                   fontSize: 11.5,
//                   fontWeight: 700,
//                   color: "var(--em)",
//                   display: "flex",
//                   alignItems: "center",
//                   gap: 4,
//                 }}
//               >
//                 ✓ Ready
//               </span>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Cam preview ──────────────────────────────────────────────────────────────
// function CamPreview({
//   stream,
//   camOn,
//   micOn,
//   name,
//   permState,
//   onRequest,
//   onToggleMic,
//   onToggleCam,
// }) {
//   const vRef = useRef(null);
//   useEffect(() => {
//     if (vRef.current) vRef.current.srcObject = stream && camOn ? stream : null;
//   }, [stream, camOn]);
//   return (
//     <>
//       <div className="cam-preview">
//         <video
//           ref={vRef}
//           autoPlay
//           playsInline
//           muted
//           style={{ display: stream && camOn ? "block" : "none" }}
//         />
//         {(!stream || !camOn) && (
//           <div className="cam-off">
//             <div className="cam-off-av">
//               {name ? name[0].toUpperCase() : "?"}
//             </div>
//             <span
//               style={{ fontSize: 11.5, fontWeight: 600, color: "var(--t3)" }}
//             >
//               {!stream ? "Enable camera to preview" : "Camera off"}
//             </span>
//           </div>
//         )}
//         {name && <div className="cam-name-tag">📍 {name}</div>}
//       </div>
//       <div className="perm-bar">
//         {permState === "idle" && (
//           <button
//             className="perm-btn req"
//             style={{ flex: 1 }}
//             onClick={onRequest}
//           >
//             🔐 Allow Camera & Mic
//           </button>
//         )}
//         {permState === "requesting" && (
//           <button className="perm-btn req" style={{ flex: 1 }} disabled>
//             ⏳ Requesting…
//           </button>
//         )}
//         {permState === "denied" && (
//           <button
//             className="perm-btn denied"
//             style={{ flex: 1 }}
//             onClick={onRequest}
//           >
//             🔄 Retry Permissions
//           </button>
//         )}
//         {permState === "granted" && (
//           <>
//             <button
//               className={`perm-btn ${micOn ? "granted" : "denied"}`}
//               onClick={onToggleMic}
//             >
//               {micOn ? "🎤" : "🔇"} {micOn ? "Mic On" : "Mic Off"}
//             </button>
//             <button
//               className={`perm-btn ${camOn ? "granted" : "denied"}`}
//               onClick={onToggleCam}
//             >
//               {camOn ? "📹" : "🚫"} {camOn ? "Cam On" : "Cam Off"}
//             </button>
//             <span
//               style={{
//                 padding: "7px 11px",
//                 borderRadius: 9,
//                 background: "rgba(16,185,129,.08)",
//                 border: "1px solid rgba(16,185,129,.2)",
//                 fontSize: 11.5,
//                 fontWeight: 700,
//                 color: "var(--em)",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 4,
//               }}
//             >
//               ✓ Ready
//             </span>
//           </>
//         )}
//       </div>
//       {permState === "denied" && (
//         <div className="perm-warn">
//           ⚠️ Access denied. Allow camera & mic in your browser settings and
//           retry.
//         </div>
//       )}
//     </>
//   );
// }

// // ─── Cal Sync Toggle ──────────────────────────────────────────────────────────
// function CalSyncToggle({ enabled, onChange }) {
//   return (
//     <div className="cal-sync-banner">
//       <span className="cal-sync-ico">📅</span>
//       <div className="cal-sync-text">
//         <strong>Sync to Calendar</strong>
//         <span>Auto-save this session to your Calendar with notifications</span>
//       </div>
//       <button
//         className="toggle-sw"
//         style={{ background: enabled ? "var(--em)" : "rgba(0,0,0,.15)" }}
//         onClick={() => onChange(!enabled)}
//       >
//         <span className="toggle-thumb" style={{ left: enabled ? 21 : 2 }} />
//       </button>
//     </div>
//   );
// }

// // ─── AI Analysis Report ───────────────────────────────────────────────────────
// function AnalysisReport({
//   mode,
//   subMode,
//   topic,
//   participants,
//   scores,
//   timer,
//   onClose,
//   onDownload,
// }) {
//   const isAIDebate = mode === "debate" && subMode === "ai";
//   const isMulti = mode === "debate" && subMode === "multi";
//   const isSeminar = mode === "seminar";

//   const generateAnalysis = () => {
//     if (isAIDebate) {
//       const you = scores?.you || 65;
//       const ai = scores?.ai || 52;
//       return {
//         winner: you > ai ? participants[0]?.name || "You" : "AI Debater",
//         winnerScore: Math.max(you, ai),
//         categories: [
//           {
//             label: "Argument Strength",
//             you: Math.min(100, you + 10),
//             ai: Math.min(100, ai + 8),
//             color: "#6366f1",
//           },
//           {
//             label: "Evidence Quality",
//             you: Math.min(100, you + 5),
//             ai: Math.min(100, ai + 12),
//             color: "#10b981",
//           },
//           {
//             label: "Rebuttal Skill",
//             you: Math.min(100, you - 5),
//             ai: Math.min(100, ai + 3),
//             color: "#f59e0b",
//           },
//           {
//             label: "Clarity & Structure",
//             you: Math.min(100, you + 8),
//             ai: Math.min(100, ai - 2),
//             color: "#38bdf8",
//           },
//         ],
//         strengths: [
//           {
//             ico: "🎯",
//             text: (
//               <>
//                 <strong>Clear Position:</strong> You maintained a consistent
//                 stance throughout, which is vital in competitive debate.
//               </>
//             ),
//           },
//           {
//             ico: "💡",
//             text: (
//               <>
//                 <strong>Evidence Use:</strong> You cited relevant examples.
//                 Incorporate more statistics to strengthen credibility.
//               </>
//             ),
//           },
//           {
//             ico: "🔄",
//             text: (
//               <>
//                 <strong>Rebuttal Timing:</strong> Improve response speed to
//                 counter AI arguments more effectively in real-time.
//               </>
//             ),
//           },
//           {
//             ico: "📢",
//             text: (
//               <>
//                 <strong>Opening Statement:</strong> Strong opening — set the
//                 framework early and your opponent was on the defensive.
//               </>
//             ),
//           },
//         ],
//         improvement:
//           "Focus on acknowledging your opponent's strongest point before dismantling it. Use the 'PEEL' method consistently: Point, Evidence, Explanation, Link.",
//       };
//     }
//     if (isMulti || isSeminar) {
//       return {
//         mediatorSummary: `The ${isSeminar ? "seminar" : "debate"} on "${topic}" was well-structured with ${participants.length} participant(s). All sides presented substantive arguments. The discourse remained respectful and academically rigorous.`,
//         participantScores: participants
//           .filter((p) => !p.isAI)
//           .map((p, i) => ({
//             name: p.name,
//             score: 60 + Math.floor(Math.random() * 30),
//             engagement: 55 + Math.floor(Math.random() * 35),
//             clarity: 60 + Math.floor(Math.random() * 30),
//             depth: 50 + Math.floor(Math.random() * 40),
//           })),
//         keyThemes: [
//           "Socioeconomic impact",
//           "Technological feasibility",
//           "Ethical considerations",
//           "Long-term sustainability",
//         ],
//         mediatorVerdict: isSeminar
//           ? "The seminar produced rich multi-perspective insights. Participants demonstrated strong analytical skills."
//           : "After careful analysis, arguments were balanced. The discussion advanced understanding of the topic significantly.",
//       };
//     }
//     return {};
//   };
//   const data = generateAnalysis();

//   return (
//     <div className="analysis-overlay" onClick={onClose}>
//       <div className="analysis-modal" onClick={(e) => e.stopPropagation()}>
//         <div className="analysis-header">
//           <div className="analysis-title">
//             {isAIDebate
//               ? "🏆 Debate Analysis"
//               : isSeminar
//                 ? "📋 Seminar Report"
//                 : "📊 Multi-User Debate Analysis"}
//           </div>
//           <button
//             onClick={onClose}
//             style={{
//               width: 28,
//               height: 28,
//               borderRadius: 8,
//               border: "1px solid rgba(255,255,255,.12)",
//               background: "rgba(255,255,255,.07)",
//               cursor: "pointer",
//               color: "rgba(255,255,255,.6)",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               fontSize: 13,
//               transition: ".15s",
//             }}
//           >
//             ✕
//           </button>
//         </div>

//         <div className="analysis-body">
//           {/* Topic */}
//           <div className="analysis-section" style={{ animationDelay: ".05s" }}>
//             <div className="analysis-sec-title">📌 Session Details</div>
//             <div
//               style={{
//                 padding: "11px 14px",
//                 borderRadius: 11,
//                 background: "rgba(99,102,241,.08)",
//                 border: "1px solid rgba(99,102,241,.18)",
//                 fontSize: 13.5,
//                 fontWeight: 700,
//                 color: "#fff",
//                 marginBottom: 7,
//               }}
//             >
//               "{topic}"
//             </div>
//             <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//               {[
//                 `⏱ ${timer}`,
//                 `👥 ${participants.length} participant(s)`,
//                 `📋 ${PHASES.length} phases`,
//               ].map((t) => (
//                 <span
//                   key={t}
//                   style={{
//                     padding: "4px 11px",
//                     borderRadius: 20,
//                     background: "rgba(255,255,255,.06)",
//                     border: "1px solid rgba(255,255,255,.1)",
//                     fontSize: 11.5,
//                     fontWeight: 700,
//                     color: "rgba(255,255,255,.6)",
//                   }}
//                 >
//                   {t}
//                 </span>
//               ))}
//             </div>
//           </div>

//           {/* AI vs You analysis */}
//           {isAIDebate && (
//             <>
//               <div
//                 className="analysis-section"
//                 style={{ animationDelay: ".1s" }}
//               >
//                 <div className="analysis-sec-title">📊 Score Breakdown</div>
//                 <div className="score-grid">
//                   <div className="score-item">
//                     <div
//                       className="score-item-val"
//                       style={{ color: "var(--sky)" }}
//                     >
//                       {scores?.you || 65}
//                     </div>
//                     <div className="score-item-lbl">Your Score</div>
//                   </div>
//                   <div className="score-item">
//                     <div
//                       className="score-item-val"
//                       style={{ color: "var(--vio)" }}
//                     >
//                       {scores?.ai || 52}
//                     </div>
//                     <div className="score-item-lbl">AI Score</div>
//                   </div>
//                   <div className="score-item">
//                     <div
//                       className="score-item-val"
//                       style={{ color: "var(--em)" }}
//                     >
//                       {(scores?.you || 65) > (scores?.ai || 52)
//                         ? "+" + ((scores?.you || 65) - (scores?.ai || 52))
//                         : "−" + ((scores?.ai || 52) - (scores?.you || 65))}
//                     </div>
//                     <div className="score-item-lbl">Margin</div>
//                   </div>
//                 </div>
//                 {data.categories?.map((c, i) => (
//                   <div className="progress-bar-wrap" key={i}>
//                     <div className="progress-bar-label">
//                       <span>{c.label}</span>
//                       <span style={{ color: "rgba(255,255,255,.7)" }}>
//                         You {c.you}% · AI {c.ai}%
//                       </span>
//                     </div>
//                     <div className="progress-bar">
//                       <div
//                         className="progress-fill"
//                         style={{ width: `${c.you}%`, background: c.color }}
//                       />
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               <div
//                 className="analysis-section"
//                 style={{ animationDelay: ".15s" }}
//               >
//                 <div className="analysis-sec-title">
//                   💪 Key Strengths & Gaps
//                 </div>
//                 <div className="strength-list">
//                   {data.strengths?.map((s, i) => (
//                     <div key={i} className="strength-item">
//                       <div className="strength-ico">{s.ico}</div>
//                       <div className="strength-text">{s.text}</div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//               <div
//                 className="analysis-section"
//                 style={{ animationDelay: ".2s" }}
//               >
//                 <div className="analysis-sec-title">🚀 Improvement Tip</div>
//                 <div
//                   style={{
//                     padding: "12px 14px",
//                     borderRadius: 11,
//                     background: "rgba(245,158,11,.08)",
//                     border: "1px solid rgba(245,158,11,.2)",
//                     fontSize: 12.5,
//                     color: "rgba(255,255,255,.65)",
//                     lineHeight: 1.7,
//                   }}
//                 >
//                   {data.improvement}
//                 </div>
//               </div>
//               <div
//                 className="analysis-section"
//                 style={{ animationDelay: ".25s" }}
//               >
//                 <div className="analysis-sec-title">🏆 Verdict</div>
//                 <div
//                   className="verdict-box"
//                   style={{
//                     borderColor:
//                       (scores?.you || 65) > (scores?.ai || 52)
//                         ? "rgba(16,185,129,.4)"
//                         : "rgba(99,102,241,.4)",
//                     background:
//                       (scores?.you || 65) > (scores?.ai || 52)
//                         ? "rgba(16,185,129,.07)"
//                         : "rgba(99,102,241,.07)",
//                   }}
//                 >
//                   <div
//                     className="verdict-winner"
//                     style={{
//                       color:
//                         (scores?.you || 65) > (scores?.ai || 52)
//                           ? "var(--em)"
//                           : "var(--ind3)",
//                     }}
//                   >
//                     {(scores?.you || 65) > (scores?.ai || 52)
//                       ? "🥇 You Win!"
//                       : "🤖 AI Wins"}
//                   </div>
//                   <div
//                     className="verdict-label"
//                     style={{ color: "rgba(255,255,255,.5)" }}
//                   >
//                     {data.winner} scored {data.winnerScore} points
//                   </div>
//                 </div>
//               </div>
//             </>
//           )}

//           {/* Multi / Seminar */}
//           {(isMulti || isSeminar) && (
//             <>
//               <div
//                 className="analysis-section"
//                 style={{ animationDelay: ".1s" }}
//               >
//                 <div className="analysis-sec-title">
//                   {isSeminar ? "📝 Mediator Summary" : "⚖️ AI Mediator Summary"}
//                 </div>
//                 <div
//                   style={{
//                     padding: "12px 14px",
//                     borderRadius: 11,
//                     background: "rgba(56,189,248,.07)",
//                     border: "1px solid rgba(56,189,248,.18)",
//                     fontSize: 12.5,
//                     color: "rgba(255,255,255,.7)",
//                     lineHeight: 1.7,
//                   }}
//                 >
//                   {data.mediatorSummary}
//                 </div>
//               </div>
//               {data.participantScores?.length > 0 && (
//                 <div
//                   className="analysis-section"
//                   style={{ animationDelay: ".15s" }}
//                 >
//                   <div className="analysis-sec-title">
//                     👥 Individual Analysis
//                   </div>
//                   <div className="participant-analysis">
//                     {data.participantScores.map((p, i) => (
//                       <div key={i} className="pa-row">
//                         <div className="pa-name">
//                           <div
//                             style={{
//                               width: 24,
//                               height: 24,
//                               borderRadius: 50,
//                               background:
//                                 COLORS_ARR[i % COLORS_ARR.length] + "33",
//                               color: COLORS_ARR[i % COLORS_ARR.length],
//                               display: "flex",
//                               alignItems: "center",
//                               justifyContent: "center",
//                               fontSize: 10,
//                               fontWeight: 800,
//                             }}
//                           >
//                             {p.name[0]}
//                           </div>
//                           {p.name}
//                           <span
//                             style={{
//                               marginLeft: "auto",
//                               fontSize: 20,
//                               fontWeight: 900,
//                               color: "var(--sky)",
//                             }}
//                           >
//                             {p.score}
//                           </span>
//                         </div>
//                         <div className="pa-bars">
//                           {[
//                             { l: "Engagement", v: p.engagement, c: "#6366f1" },
//                             { l: "Clarity", v: p.clarity, c: "#10b981" },
//                             { l: "Depth", v: p.depth, c: "#f59e0b" },
//                           ].map((b) => (
//                             <div className="progress-bar-wrap" key={b.l}>
//                               <div className="progress-bar-label">
//                                 <span style={{ fontSize: 11 }}>{b.l}</span>
//                                 <span
//                                   style={{
//                                     fontSize: 11,
//                                     color: "rgba(255,255,255,.5)",
//                                   }}
//                                 >
//                                   {b.v}%
//                                 </span>
//                               </div>
//                               <div className="progress-bar">
//                                 <div
//                                   className="progress-fill"
//                                   style={{ width: `${b.v}%`, background: b.c }}
//                                 />
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//               {data.keyThemes && (
//                 <div
//                   className="analysis-section"
//                   style={{ animationDelay: ".2s" }}
//                 >
//                   <div className="analysis-sec-title">
//                     💡 Key Themes Discussed
//                   </div>
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
//                     {data.keyThemes.map((t) => (
//                       <span
//                         key={t}
//                         style={{
//                           padding: "5px 13px",
//                           borderRadius: 20,
//                           background: "rgba(99,102,241,.1)",
//                           border: "1px solid rgba(99,102,241,.2)",
//                           fontSize: 12,
//                           fontWeight: 700,
//                           color: "var(--ind3)",
//                         }}
//                       >
//                         {t}
//                       </span>
//                     ))}
//                   </div>
//                 </div>
//               )}
//               <div
//                 className="analysis-section"
//                 style={{ animationDelay: ".25s" }}
//               >
//                 <div className="analysis-sec-title">
//                   📌 {isSeminar ? "Facilitator" : "Mediator"} Verdict
//                 </div>
//                 <div
//                   style={{
//                     padding: "12px 14px",
//                     borderRadius: 11,
//                     background: "rgba(139,92,246,.08)",
//                     border: "1px solid rgba(139,92,246,.25)",
//                     fontSize: 12.5,
//                     color: "rgba(255,255,255,.7)",
//                     lineHeight: 1.7,
//                   }}
//                 >
//                   {data.mediatorVerdict}
//                 </div>
//               </div>
//             </>
//           )}
//         </div>

//         <div className="analysis-footer">
//           <button
//             className="btn-s"
//             style={{
//               background: "rgba(255,255,255,.06)",
//               borderColor: "rgba(255,255,255,.12)",
//               color: "rgba(255,255,255,.6)",
//             }}
//             onClick={onClose}
//           >
//             Close
//           </button>
//           <button
//             className="btn-p"
//             style={{ width: "auto", padding: "10px 20px", fontSize: 13 }}
//             onClick={onDownload}
//           >
//             📥 Download Report
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Video Tile ───────────────────────────────────────────────────────────────
// function Tile({ p, reaction }) {
//   const vRef = useRef(null);
//   useEffect(() => {
//     if (vRef.current && p.stream) vRef.current.srcObject = p.stream;
//   }, [p.stream]);
//   const color = COLORS_ARR[p.id % COLORS_ARR.length];
//   const init = p.name
//     .split(" ")
//     .map((w) => w[0])
//     .join("")
//     .toUpperCase()
//     .slice(0, 2);
//   return (
//     <div className={`tile ${p.isSpeaking ? "speaking" : ""}`}>
//       {p.isSpeaking && <div className="tile-ring" />}
//       {p.stream && p.camOn ? (
//         <video
//           ref={vRef}
//           autoPlay
//           playsInline
//           muted={p.isLocal}
//           style={{ width: "100%", height: "100%", objectFit: "cover" }}
//         />
//       ) : (
//         <div className="tile-av" style={{ background: color + "28", color }}>
//           {p.isAI ? "🤖" : p.isMed ? "🎙️" : init}
//         </div>
//       )}
//       {p.handRaised && <div className="tile-hand-tag">✋ Hand Raised</div>}
//       {reaction && (
//         <div key={reaction.key} className="tile-reaction">
//           {reaction.emoji}
//         </div>
//       )}
//       <div className="tile-ov">
//         <div className="tile-name">
//           {p.name}
//           {p.isHost && <span className="t-badge host">HOST</span>}
//           {p.isAI && <span className="t-badge ai">AI</span>}
//           {p.isMed && <span className="t-badge med">MEDIATOR</span>}
//           {p.isLocal && !p.isHost && <span className="t-badge you">You</span>}
//         </div>
//         {p.micMuted && <div className="tile-muted">🔇</div>}
//       </div>
//     </div>
//   );
// }

// // ─── ROOM ─────────────────────────────────────────────────────────────────────
// function Room({ config, onEnd }) {
//   const mode = config.mode; // "debate"|"meeting"|"seminar"
//   const subMode = config.subMode; // "ai"|"multi"|undefined

//   const [participants, setParticipants] = useState(() => {
//     const me = {
//       id: 0,
//       name: config.name,
//       stream: config.stream,
//       isLocal: true,
//       isHost: true,
//       micMuted: !config.micOn,
//       camOn: config.camOn || false,
//       isSpeaking: false,
//       handRaised: false,
//     };
//     const base = [me];
//     if (mode === "debate" && subMode === "ai")
//       base.push({
//         id: 1,
//         name: "AI Debater",
//         isAI: true,
//         micMuted: false,
//         camOn: false,
//         isSpeaking: true,
//         stream: null,
//         handRaised: false,
//       });
//     if ((mode === "debate" && subMode === "multi") || mode === "seminar")
//       base.push({
//         id: 99,
//         name: "AI Mediator",
//         isAI: true,
//         isMed: true,
//         micMuted: false,
//         camOn: false,
//         isSpeaking: false,
//         stream: null,
//         handRaised: false,
//       });
//     config.invitees?.forEach((n, i) =>
//       base.push({
//         id: i + 2,
//         name: typeof n === "string" ? n : n.value,
//         micMuted: false,
//         camOn: false,
//         isSpeaking: false,
//         stream: null,
//         handRaised: false,
//       }),
//     );
//     return base;
//   });

//   const [micOn, setMicOn] = useState(config.micOn);
//   const [camOn, setCamOn] = useState(config.camOn || false);
//   const [panelTab, setPanelTab] = useState(null);
//   const [messages, setMessages] = useState([
//     {
//       sender: "System",
//       senderId: 99,
//       text:
//         mode === "debate"
//           ? subMode === "ai"
//             ? "Welcome! Debate begins. Make your opening statement! ⚔️"
//             : "Debate room open. All participants can now speak and argue! ⚔️"
//           : mode === "seminar"
//             ? "Seminar started. All participants are welcome to contribute! 🎓"
//             : "Meeting started. Say hello! 👋",
//       time: Date.now(),
//     },
//   ]);
//   const [showEnd, setShowEnd] = useState(false);
//   const [showReactions, setShowReactions] = useState(false);
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showAnalysis, setShowAnalysis] = useState(false);
//   const [scores, setScores] = useState({ you: 42, ai: 38 });
//   const [phaseIdx, setPhaseIdx] = useState(0);
//   const [toast, setToast] = useState(null);
//   const [tileReactions, setTileReactions] = useState({});
//   const [addInput, setAddInput] = useState("");
//   const [chatInput, setChatInput] = useState("");
//   const chatEndRef = useRef(null);
//   const [timer] = useTimer(true);
//   const recorder = useScreenRecorder();
//   const screenShare = useScreenShare();
//   const me = participants.find((p) => p.isLocal);

//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);
//   const toast$ = (msg, type = "success") => setToast({ msg, type });

//   const toggleMic = () => {
//     const n = !micOn;
//     setMicOn(n);
//     config.stream?.getAudioTracks().forEach((t) => (t.enabled = n));
//     setParticipants((ps) =>
//       ps.map((p) => (p.isLocal ? { ...p, micMuted: !n } : p)),
//     );
//   };
//   const toggleCam = () => {
//     if (!config.stream) return;
//     const n = !camOn;
//     setCamOn(n);
//     config.stream?.getVideoTracks().forEach((t) => (t.enabled = n));
//     setParticipants((ps) =>
//       ps.map((p) => (p.isLocal ? { ...p, camOn: n } : p)),
//     );
//   };
//   const toggleHand = () => {
//     const n = !me?.handRaised;
//     setParticipants((ps) =>
//       ps.map((p) => (p.isLocal ? { ...p, handRaised: n } : p)),
//     );
//     if (n) toast$("✋ Hand raised!", "warn");
//   };
//   const togglePanel = (tab) => setPanelTab(panelTab === tab ? null : tab);

//   async function handleShareScreen() {
//     if (screenShare.isSharing) {
//       screenShare.stop();
//       toast$("Screen sharing stopped", "warn");
//     } else {
//       const ok = await screenShare.start();
//       if (ok) toast$("🖥 Screen sharing started", "info");
//       else toast$("Screen share cancelled or denied", "error");
//     }
//   }

//   function sendMessage(text) {
//     if (!text.trim()) return;
//     setMessages((ms) => [
//       ...ms,
//       { sender: config.name, senderId: 0, text, time: Date.now() },
//     ]);
//     setChatInput("");
//     if (mode === "debate" && subMode === "ai") {
//       setTimeout(() => {
//         setMessages((ms) => [
//           ...ms,
//           {
//             sender: "AI Debater",
//             senderId: 1,
//             text: AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)],
//             time: Date.now(),
//           },
//         ]);
//         if (Math.random() > 0.55)
//           setScores((s) => ({ ...s, you: Math.min(s.you + 3, 100) }));
//         else setScores((s) => ({ ...s, ai: Math.min(s.ai + 2, 100) }));
//       }, 1400);
//     }
//     if ((mode === "debate" && subMode === "multi") || mode === "seminar") {
//       if (Math.random() > 0.6) {
//         setTimeout(() => {
//           setMessages((ms) => [
//             ...ms,
//             {
//               sender: "AI Mediator",
//               senderId: 99,
//               text: "Interesting point. Would other participants like to respond to this argument?",
//               time: Date.now(),
//             },
//           ]);
//         }, 2000);
//       }
//     }
//   }

//   function sendReaction(emoji) {
//     setShowReactions(false);
//     const key = Date.now();
//     setTileReactions((tr) => ({ ...tr, 0: { emoji, key } }));
//     setTimeout(
//       () =>
//         setTileReactions((tr) => {
//           const n = { ...tr };
//           delete n[0];
//           return n;
//         }),
//       2300,
//     );
//   }

//   function addParticipant() {
//     const v = addInput.trim();
//     if (!v) return;
//     const id = participants.length;
//     setParticipants((ps) => [
//       ...ps,
//       {
//         id,
//         name: v,
//         micMuted: false,
//         camOn: false,
//         isSpeaking: false,
//         stream: null,
//         handRaised: false,
//       },
//     ]);
//     toast$(`${v} added!`);
//     setAddInput("");
//     setShowAddModal(false);
//   }

//   function handleEndConfirm() {
//     config.stream?.getTracks().forEach((t) => t.stop());
//     screenShare.stop();
//     pushNotification({
//       title: `${mode === "debate" ? "⚔️ Debate" : mode === "seminar" ? "🎓 Seminar" : "📹 Meeting"} ended: "${config.topic}"`,
//       body: `Duration: ${timer}. ${participants.length} participant(s).`,
//       eventType: mode,
//       category: "grade",
//     });
//     onEnd({
//       timer,
//       participants: participants.length,
//       mode,
//       subMode,
//       topic: config.topic,
//       scores,
//       syncedToCalendar: !!config.syncedToCalendar,
//       recorder,
//       hasRecording: !!recorder.blob,
//       participantsList: participants,
//     });
//   }

//   function handleDownloadRec() {
//     const fname = `debatearena-${(config.topic || "session").slice(0, 20).replace(/\s+/g, "-")}.webm`;
//     recorder.download(fname);
//     toast$("📥 Recording downloaded!", "success");
//   }

//   const n = participants.length;
//   const gc =
//     n <= 1 ? "g1" : n === 2 ? "g2" : n === 3 ? "g3" : n === 4 ? "g4" : "g5";
//   const fmt = (d) =>
//     new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//   const isMeetingMode = mode === "meeting";

//   return (
//     <div className="room-root">
//       {recorder.isRecording && <div className="rec-overlay">⏺ REC {timer}</div>}
//       {screenShare.isSharing && (
//         <div className="share-overlay">🖥 Sharing Screen</div>
//       )}

//       {/* Topbar */}
//       <div className="room-topbar">
//         <div className="room-logo">
//           <div className="room-logo-ico">
//             {mode === "debate" ? "⚔️" : mode === "seminar" ? "🎓" : "📹"}
//           </div>
//           DebateArena
//         </div>
//         <div className="tb-div" />
//         <div className="tb-topic">
//           <strong>{config.topic || "Session"}</strong>
//         </div>
//         <div className="tb-pill tb-timer">{timer}</div>
//         {recorder.isRecording && (
//           <div className="tb-pill tb-rec">
//             <div className="tb-rec-dot" />
//             REC
//           </div>
//         )}
//         {screenShare.isSharing && (
//           <div className="tb-pill tb-sharing">🖥 Sharing</div>
//         )}
//         <button className="tb-back-btn" onClick={() => setShowEnd(true)}>
//           ✕ End
//         </button>
//       </div>

//       {/* Body */}
//       <div className="room-body">
//         <div className="grid-wrap">
//           <div className={`vid-grid ${gc}`}>
//             {participants.map((p) => (
//               <Tile key={p.id} p={p} reaction={tileReactions[p.id]} />
//             ))}
//           </div>

//           {/* Controls */}
//           <div className="controls">
//             <div className="cg">
//               <button
//                 className={`cbtn ${micOn ? "on" : "off"}`}
//                 onClick={toggleMic}
//               >
//                 <span style={{ fontSize: 15 }}>{micOn ? "🎤" : "🔇"}</span>
//                 <span>{micOn ? "Mute" : "Unmute"}</span>
//               </button>
//               {/* Camera only for meeting/seminar */}
//               {!isMeetingMode || true ? null : null}
//               {(mode === "meeting" || mode === "seminar") && (
//                 <button
//                   className={`cbtn ${camOn ? "on" : "off"}`}
//                   onClick={toggleCam}
//                 >
//                   <span style={{ fontSize: 15 }}>{camOn ? "📹" : "🚫"}</span>
//                   <span>{camOn ? "Stop Cam" : "Start Cam"}</span>
//                 </button>
//               )}
//               {/* Screen share: only meeting */}
//               {mode === "meeting" && (
//                 <button
//                   className={`cbtn ${screenShare.isSharing ? "sky" : ""}`}
//                   onClick={handleShareScreen}
//                 >
//                   <span style={{ fontSize: 15 }}>🖥</span>
//                   <span>
//                     {screenShare.isSharing ? "Stop Share" : "Share Screen"}
//                   </span>
//                 </button>
//               )}
//               <div style={{ position: "relative" }}>
//                 <button
//                   className={`cbtn ${showReactions ? "hi" : ""}`}
//                   onClick={() => setShowReactions((r) => !r)}
//                 >
//                   <span style={{ fontSize: 15 }}>😊</span>
//                   <span>React</span>
//                 </button>
//                 {showReactions && (
//                   <div className="react-popup">
//                     {REACTIONS.map((r) => (
//                       <button
//                         key={r}
//                         className="react-btn"
//                         onClick={() => sendReaction(r)}
//                       >
//                         {r}
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </div>
//               <button
//                 className={`cbtn ${me?.handRaised ? "amb" : ""}`}
//                 onClick={toggleHand}
//               >
//                 <span style={{ fontSize: 15 }}>✋</span>
//                 <span>{me?.handRaised ? "Lower" : "Raise Hand"}</span>
//               </button>
//             </div>

//             <div className="cg">
//               <button
//                 className={`cbtn ${recorder.isRecording ? "rec-active" : ""}`}
//                 onClick={() =>
//                   recorder.isRecording
//                     ? recorder.stop() && toast$("⏹ Stopped", "warn")
//                     : recorder
//                         .start(config.stream)
//                         .then((ok) =>
//                           ok
//                             ? toast$("🔴 Recording started", "info")
//                             : toast$("Screen share permission needed", "error"),
//                         )
//                 }
//               >
//                 <span style={{ fontSize: 15 }}>⏺</span>
//                 <span>{recorder.isRecording ? "Stop Rec" : "Record"}</span>
//               </button>
//               <button className="cbtn" onClick={() => setShowAddModal(true)}>
//                 <span style={{ fontSize: 15 }}>➕</span>
//                 <span>Add</span>
//               </button>
//               {(mode === "debate" || mode === "seminar") && (
//                 <button
//                   className="cbtn em"
//                   onClick={() => setShowAnalysis(true)}
//                 >
//                   <span style={{ fontSize: 15 }}>📊</span>
//                   <span>Analysis</span>
//                 </button>
//               )}
//             </div>

//             <div className="cg">
//               <button
//                 className={`cbtn ${panelTab === "people" ? "hi" : ""}`}
//                 onClick={() => togglePanel("people")}
//               >
//                 <span style={{ fontSize: 15 }}>👥</span>
//                 <span>People ({n})</span>
//               </button>
//               <button
//                 className={`cbtn ${panelTab === "chat" ? "hi" : ""}`}
//                 onClick={() => togglePanel("chat")}
//               >
//                 <span style={{ fontSize: 15 }}>💬</span>
//                 <span>Chat</span>
//               </button>
//               {mode === "debate" && subMode === "ai" && (
//                 <button
//                   className={`cbtn ${panelTab === "debate" ? "hi" : ""}`}
//                   onClick={() => togglePanel("debate")}
//                 >
//                   <span style={{ fontSize: 15 }}>🏆</span>
//                   <span>Debate</span>
//                 </button>
//               )}
//               <button className="end-btn" onClick={() => setShowEnd(true)}>
//                 End
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Side panel */}
//         {panelTab && (
//           <div className="side-panel">
//             <div className="panel-tabs">
//               {[
//                 { id: "people", ico: "👥", label: "People" },
//                 { id: "chat", ico: "💬", label: "Chat" },
//                 ...(mode === "debate" && subMode === "ai"
//                   ? [{ id: "debate", ico: "🏆", label: "Debate" }]
//                   : []),
//               ].map((t) => (
//                 <button
//                   key={t.id}
//                   className={`ptab ${panelTab === t.id ? "active" : ""}`}
//                   onClick={() => setPanelTab(t.id)}
//                 >
//                   {t.ico}
//                   <span style={{ fontSize: 9, display: "block" }}>
//                     {t.label}
//                   </span>
//                 </button>
//               ))}
//               <button className="ptab cls" onClick={() => setPanelTab(null)}>
//                 ✕
//               </button>
//             </div>

//             {panelTab === "people" && (
//               <div className="pscroll">
//                 <div
//                   style={{
//                     padding: "9px 11px 3px",
//                     fontSize: 10.5,
//                     fontWeight: 800,
//                     textTransform: "uppercase",
//                     letterSpacing: ".07em",
//                     color: "rgba(255,255,255,.25)",
//                   }}
//                 >
//                   {n} in room
//                 </div>
//                 <div className="p-list">
//                   {participants.map((p) => {
//                     const color = COLORS_ARR[p.id % COLORS_ARR.length];
//                     const init = p.name
//                       .split(" ")
//                       .map((w) => w[0])
//                       .join("")
//                       .toUpperCase()
//                       .slice(0, 2);
//                     return (
//                       <div key={p.id} className="p-row">
//                         <div
//                           className="p-av"
//                           style={{ background: color + "28", color }}
//                         >
//                           {p.isAI ? "🤖" : p.isMed ? "🎙️" : init}
//                         </div>
//                         <div className="p-info">
//                           <div className="p-name">
//                             {p.name}
//                             {p.isLocal ? " (You)" : ""}
//                             {p.handRaised ? " ✋" : ""}
//                           </div>
//                           <div className="p-role">
//                             {p.isHost
//                               ? "👑 Host"
//                               : p.isMed
//                                 ? "🎙️ AI Mediator"
//                                 : p.isAI
//                                   ? "🤖 AI"
//                                   : "👤 Participant"}
//                           </div>
//                         </div>
//                         <div style={{ display: "flex", gap: 4, fontSize: 13 }}>
//                           <span
//                             style={{
//                               color: p.micMuted ? "var(--red)" : "var(--em)",
//                             }}
//                           >
//                             {p.micMuted ? "🔇" : "🎤"}
//                           </span>
//                           <span
//                             style={{
//                               color: p.camOn
//                                 ? "var(--sky)"
//                                 : "rgba(255,255,255,.2)",
//                             }}
//                           >
//                             {p.camOn ? "📹" : "🚫"}
//                           </span>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             )}

//             {panelTab === "chat" && (
//               <div
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   height: "100%",
//                   minHeight: 0,
//                 }}
//               >
//                 <div className="pscroll" style={{ flex: 1 }}>
//                   <div className="chat-msgs">
//                     {messages.length === 0 && (
//                       <div className="chat-empty">
//                         No messages yet.
//                         <br />
//                         Start the conversation!
//                       </div>
//                     )}
//                     {messages.map((m, i) => {
//                       const isOwn = m.sender === config.name;
//                       const color = COLORS_ARR[m.senderId % COLORS_ARR.length];
//                       return (
//                         <div
//                           key={i}
//                           className={`chat-msg ${isOwn ? "own" : ""}`}
//                         >
//                           {!isOwn && (
//                             <div
//                               className="chat-av-sm"
//                               style={{ background: color + "28", color }}
//                             >
//                               {m.sender[0]?.toUpperCase()}
//                             </div>
//                           )}
//                           <div className="chat-bwrap">
//                             {!isOwn && (
//                               <span className="chat-sender">{m.sender}</span>
//                             )}
//                             <div
//                               className={`chat-bubble ${isOwn ? "own" : "other"}`}
//                             >
//                               {m.text}
//                             </div>
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
//                     className="chat-input"
//                     placeholder="Send a message…"
//                     value={chatInput}
//                     onChange={(e) => setChatInput(e.target.value)}
//                     onKeyDown={(e) => {
//                       if (e.key === "Enter" && !e.shiftKey) {
//                         e.preventDefault();
//                         sendMessage(chatInput);
//                       }
//                     }}
//                     rows={1}
//                   />
//                   <button
//                     className="chat-send"
//                     onClick={() => sendMessage(chatInput)}
//                   >
//                     ➤
//                   </button>
//                 </div>
//               </div>
//             )}

//             {panelTab === "debate" && (
//               <div className="pscroll">
//                 <div className="dp-wrap">
//                   <div className="score-card">
//                     <div className="sc-title">📊 Live Score</div>
//                     <div className="sc-row">
//                       <div className="sc-item">
//                         <div className="sc-val u">{scores.you}</div>
//                         <div className="sc-lbl">You</div>
//                       </div>
//                       <div className="sc-vs">VS</div>
//                       <div className="sc-item">
//                         <div className="sc-val a">{scores.ai}</div>
//                         <div className="sc-lbl">AI</div>
//                       </div>
//                     </div>
//                     <div className="sc-bar">
//                       <div
//                         className="sc-fill"
//                         style={{
//                           width: `${(scores.you / (scores.you + scores.ai || 1)) * 100}%`,
//                         }}
//                       />
//                     </div>
//                   </div>
//                   <div className="phase-card">
//                     <div className="sc-title" style={{ marginBottom: 7 }}>
//                       📋 Phases
//                     </div>
//                     {PHASES.map((ph, i) => (
//                       <div
//                         key={i}
//                         className={`ph-step ${i === phaseIdx ? "act" : ""}`}
//                       >
//                         <div
//                           className={`ph-num ${i < phaseIdx ? "done" : i === phaseIdx ? "act" : "pend"}`}
//                         >
//                           {i < phaseIdx ? "✓" : i + 1}
//                         </div>
//                         <span className="ph-lbl">{ph}</span>
//                       </div>
//                     ))}
//                     {phaseIdx < PHASES.length - 1 && (
//                       <button
//                         className="btn-p"
//                         style={{ marginTop: 9, fontSize: 12, padding: "7px" }}
//                         onClick={() =>
//                           setPhaseIdx((i) => Math.min(i + 1, PHASES.length - 1))
//                         }
//                       >
//                         Next Phase →
//                       </button>
//                     )}
//                   </div>
//                   <div
//                     style={{
//                       background: "rgba(255,255,255,.04)",
//                       border: "1px solid rgba(255,255,255,.07)",
//                       borderRadius: 11,
//                       padding: "11px 13px",
//                     }}
//                   >
//                     <div className="sc-title" style={{ marginBottom: 7 }}>
//                       💡 Coach Tips
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 12,
//                         color: "rgba(255,255,255,.45)",
//                         lineHeight: 1.7,
//                       }}
//                     >
//                       Use <strong style={{ color: "#fff" }}>PEEL</strong>: Point
//                       → Evidence → Explanation → Link.
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Analysis Modal */}
//       {showAnalysis && (
//         <AnalysisReport
//           mode={mode}
//           subMode={subMode}
//           topic={config.topic}
//           participants={participants}
//           scores={scores}
//           timer={timer}
//           onClose={() => setShowAnalysis(false)}
//           onDownload={() => {
//             const rpt = `DebateArena Analysis Report\n\nTopic: ${config.topic}\nDuration: ${timer}\nParticipants: ${participants.length}\n\nGenerated by DebateArena`;
//             const b = new Blob([rpt], { type: "text/plain" });
//             const u = URL.createObjectURL(b);
//             const a = document.createElement("a");
//             a.href = u;
//             a.download = "debatearena-analysis.txt";
//             a.click();
//             URL.revokeObjectURL(u);
//             toast$("📥 Report downloaded!", "success");
//           }}
//         />
//       )}

//       {/* Add participant modal */}
//       {showAddModal && (
//         <div className="overlay" onClick={() => setShowAddModal(false)}>
//           <div
//             className="modal dark"
//             style={{ maxWidth: 360 }}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="mh">
//               <span className="mh-title">➕ Add Participant</span>
//               <button
//                 className="mh-close"
//                 onClick={() => setShowAddModal(false)}
//               >
//                 ✕
//               </button>
//             </div>
//             <div className="mb">
//               <div className="fi">
//                 <label className="fl">Name or Email</label>
//                 <input
//                   className="finput"
//                   placeholder="john@email.com or John Smith"
//                   value={addInput}
//                   onChange={(e) => setAddInput(e.target.value)}
//                   onKeyDown={(e) => e.key === "Enter" && addParticipant()}
//                   style={{
//                     background: "rgba(255,255,255,.07)",
//                     borderColor: "rgba(255,255,255,.12)",
//                     color: "#fff",
//                   }}
//                   autoFocus
//                 />
//               </div>
//               <div
//                 style={{
//                   padding: "10px 12px",
//                   borderRadius: 10,
//                   background: "rgba(99,102,241,.08)",
//                   border: "1px solid rgba(99,102,241,.2)",
//                   fontSize: 12,
//                   color: "rgba(255,255,255,.45)",
//                   lineHeight: 1.6,
//                 }}
//               >
//                 📧 Email → send invite
//                 <br />
//                 👤 Name → copy link to clipboard
//               </div>
//             </div>
//             <div className="mf">
//               <button
//                 className="btn-s"
//                 style={{
//                   background: "rgba(255,255,255,.04)",
//                   borderColor: "rgba(255,255,255,.1)",
//                   color: "rgba(255,255,255,.5)",
//                 }}
//                 onClick={() => setShowAddModal(false)}
//               >
//                 Cancel
//               </button>
//               <button
//                 className="btn-p"
//                 style={{ width: "auto", padding: "10px 20px" }}
//                 disabled={!addInput.trim()}
//                 onClick={addParticipant}
//               >
//                 {addInput.includes("@") ? "📧 Send Invite" : "🔗 Add & Copy"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* End session modal */}
//       {showEnd && (
//         <div className="overlay" onClick={() => setShowEnd(false)}>
//           <div
//             className="modal dark"
//             style={{ maxWidth: 380 }}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="mh">
//               <span className="mh-title">End Session?</span>
//               <button className="mh-close" onClick={() => setShowEnd(false)}>
//                 ✕
//               </button>
//             </div>
//             <div
//               className="mb"
//               style={{ textAlign: "center", padding: "22px" }}
//             >
//               <div style={{ fontSize: 44, marginBottom: 11 }}>🏁</div>
//               <div
//                 style={{
//                   fontSize: 14.5,
//                   fontWeight: 800,
//                   color: "#fff",
//                   marginBottom: 7,
//                 }}
//               >
//                 End this session?
//               </div>
//               <div
//                 style={{
//                   fontSize: 12.5,
//                   color: "rgba(255,255,255,.4)",
//                   lineHeight: 1.7,
//                   marginBottom: 14,
//                 }}
//               >
//                 Duration:{" "}
//                 <strong style={{ color: "var(--ind3)" }}>{timer}</strong>
//                 <br />
//                 Camera & mic will be released.
//                 {recorder.isRecording && (
//                   <>
//                     <br />
//                     <span style={{ color: "var(--em)" }}>
//                       ✅ Recording will auto-stop
//                     </span>
//                   </>
//                 )}
//               </div>
//               {recorder.blob && !recorder.isRecording && (
//                 <button
//                   className="btn-s"
//                   style={{
//                     width: "100%",
//                     marginBottom: 10,
//                     fontSize: 12,
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     gap: 7,
//                   }}
//                   onClick={handleDownloadRec}
//                 >
//                   📥 Download Recording Before Ending
//                 </button>
//               )}
//               {(mode === "debate" || mode === "seminar") && (
//                 <button
//                   className="btn-s"
//                   style={{
//                     width: "100%",
//                     marginBottom: 10,
//                     fontSize: 12,
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     gap: 7,
//                     borderColor: "rgba(99,102,241,.3)",
//                     color: "var(--ind)",
//                   }}
//                   onClick={() => {
//                     setShowEnd(false);
//                     setShowAnalysis(true);
//                   }}
//                 >
//                   📊 View Analysis Report First
//                 </button>
//               )}
//             </div>
//             <div className="mf">
//               <button
//                 className="btn-s"
//                 style={{
//                   background: "rgba(255,255,255,.04)",
//                   borderColor: "rgba(255,255,255,.1)",
//                   color: "rgba(255,255,255,.5)",
//                 }}
//                 onClick={() => setShowEnd(false)}
//               >
//                 Keep Going
//               </button>
//               <button className="btn-d" onClick={handleEndConfirm}>
//                 End Session
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {toast && (
//         <Toast
//           msg={toast.msg}
//           type={toast.type}
//           onDone={() => setToast(null)}
//         />
//       )}
//     </div>
//   );
// }

// // ─── Setup (Debate/Seminar) ───────────────────────────────────────────────────
// function DebateSeminarSetup({ mode, onBack, onLaunch }) {
//   // mode = "debate" | "seminar"
//   const [name, setName] = useState("");
//   const [subMode, setSubMode] = useState(""); // "ai" | "multi"
//   const [topic, setTopic] = useState("");
//   const [customTopic, setCustomTopic] = useState("");
//   const [micOn, setMicOn] = useState(true);
//   const [invitees, setInvitees] = useState([]);
//   const [addInput, setAddInput] = useState("");
//   const [schedDate, setSchedDate] = useState("");
//   const [schedTime, setSchedTime] = useState("10:00");
//   const [syncCal, setSyncCal] = useState(true);
//   const [copied, setCopied] = useState(false);
//   const [link] = useState(genLink);
//   const {
//     state: permState,
//     stream,
//     request: requestMic,
//     stop: stopStream,
//   } = useMicPerm();
//   const toggleMic = () => {
//     const n = !micOn;
//     setMicOn(n);
//     stream?.getAudioTracks().forEach((t) => (t.enabled = n));
//   };
//   const finalTopic = topic === "__custom__" ? customTopic : topic;
//   const addInvitee = () => {
//     const v = addInput.trim();
//     if (v && !invitees.find((x) => x.value === v)) {
//       setInvitees((i) => [
//         ...i,
//         { value: v, type: v.includes("@") ? "email" : "name" },
//       ]);
//       setAddInput("");
//     }
//   };
//   const copyLink = () => {
//     navigator.clipboard.writeText(link);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2200);
//   };
//   const needsInvitees = subMode === "multi" || mode === "seminar";
//   const steps = [
//     { label: "Enter your name", done: name.trim().length > 0 },
//     { label: "Allow microphone", done: permState === "granted" },
//     {
//       label: `Select ${mode === "seminar" ? "seminar" : "debate"} topic`,
//       done: !!finalTopic,
//     },
//     ...(mode === "debate"
//       ? [{ label: "Choose debate type", done: !!subMode }]
//       : []),
//   ];
//   const stepState = (i) =>
//     steps[i].done
//       ? "done"
//       : steps.slice(0, i).every((s) => s.done)
//         ? "active"
//         : "pending";
//   const canLaunch = steps.every((s) => s.done);
//   const isDebateAI = mode === "debate" && subMode === "ai";
//   const leftGrad =
//     mode === "seminar"
//       ? "linear-gradient(135deg,#f59e0b,#ef4444)"
//       : "var(--grad)";

//   function handleLaunch() {
//     if (syncCal) {
//       syncToCalendar({
//         type: mode,
//         title: finalTopic,
//         date: schedDate ? new Date(schedDate + "T12:00:00") : new Date(),
//         time: schedTime,
//         attendees: invitees,
//         link,
//         description: `${mode}: "${finalTopic}". Host: ${name}.`,
//       });
//     }
//     pushNotification({
//       title: `${mode === "debate" ? "⚔️" : "🎓"} ${mode === "debate" ? "Debate" : "Seminar"} Scheduled: "${finalTopic.slice(0, 40)}"`,
//       body: `By ${name}${schedDate ? ` for ${schedDate}` : ""}.`,
//       eventType: mode,
//       category: "assignment",
//     });
//     setTimeout(() => {
//       onLaunch({
//         name,
//         mode,
//         subMode: subMode || (mode === "seminar" ? "multi" : undefined),
//         topic: finalTopic,
//         stream,
//         micOn,
//         camOn: false,
//         invitees,
//         link,
//         syncedToCalendar: syncCal,
//       });
//     }, 100);
//   }

//   return (
//     <div className="setup-full">
//       <div className="setup-left">
//         <div
//           style={{
//             position: "absolute",
//             inset: 0,
//             backgroundImage:
//               "linear-gradient(rgba(99,102,241,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.05) 1px,transparent 1px)",
//             backgroundSize: "44px 44px",
//             pointerEvents: "none",
//           }}
//         />
//         <div
//           style={{
//             position: "absolute",
//             width: 450,
//             height: 450,
//             borderRadius: "50%",
//             background:
//               "radial-gradient(circle,rgba(99,102,241,.14) 0%,transparent 70%)",
//             top: -120,
//             left: -90,
//             pointerEvents: "none",
//             animation: "orbFloat 8s ease-in-out infinite",
//           }}
//         />
//         <div
//           style={{
//             position: "relative",
//             zIndex: 1,
//             animation: "pageIn .55s ease",
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 9,
//               marginBottom: 26,
//             }}
//           >
//             <div
//               style={{
//                 width: 34,
//                 height: 34,
//                 background: leftGrad,
//                 borderRadius: 10,
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 fontSize: 17,
//               }}
//             >
//               {mode === "debate" ? "⚔️" : "🎓"}
//             </div>
//             <span
//               style={{
//                 fontSize: 15,
//                 fontWeight: 800,
//                 background: "linear-gradient(90deg,#fff,var(--ind3))",
//                 WebkitBackgroundClip: "text",
//                 WebkitTextFillColor: "transparent",
//               }}
//             >
//               DebateArena
//             </span>
//           </div>
//           <div className="land-badge">
//             <div className="land-badge-dot" />
//             {mode === "debate" ? "Debate Setup" : "Seminar Setup"}
//           </div>
//           <h2
//             style={{
//               fontSize: "clamp(22px,3vw,40px)",
//               fontWeight: 900,
//               lineHeight: 1.05,
//               letterSpacing: -1.5,
//               color: "#fff",
//               marginBottom: 13,
//             }}
//           >
//             Set up your
//             <br />
//             <span
//               style={{
//                 background: leftGrad,
//                 WebkitBackgroundClip: "text",
//                 WebkitTextFillColor: "transparent",
//               }}
//             >
//               {mode === "debate" ? "Debate Room" : "Seminar Room"}
//             </span>
//           </h2>
//           <p
//             style={{
//               fontSize: 13,
//               color: "rgba(255,255,255,.45)",
//               lineHeight: 1.8,
//               marginBottom: 28,
//             }}
//           >
//             {mode === "debate"
//               ? "Choose topic, invite participants, select debate style and launch. AI generates live analysis."
//               : "Host a multi-participant seminar. AI acts as mediator and generates full analysis report."}
//           </p>
//           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//             {(mode === "debate"
//               ? [
//                   {
//                     ico: "🎯",
//                     t: "2 Debate Styles",
//                     d: "1-on-1 vs AI · Multi-user with AI mediator",
//                   },
//                   {
//                     ico: "🤖",
//                     t: "AI Opponent/Mediator",
//                     d: "Real-time rebuttals and analysis",
//                   },
//                   {
//                     ico: "📊",
//                     t: "Analysis Report",
//                     d: "Full scoring, strengths & improvement tips",
//                   },
//                   {
//                     ico: "📅",
//                     t: "Calendar Sync",
//                     d: "Sessions & notifications auto-saved",
//                   },
//                 ]
//               : [
//                   {
//                     ico: "🎙️",
//                     t: "AI Mediator",
//                     d: "Guides discussion and analyses all participants",
//                   },
//                   {
//                     ico: "👥",
//                     t: "Multi-participant",
//                     d: "Invite attendees via name or email",
//                   },
//                   {
//                     ico: "📋",
//                     t: "Full Analysis",
//                     d: "Individual scores, themes & facilitator verdict",
//                   },
//                   {
//                     ico: "📅",
//                     t: "Calendar Sync",
//                     d: "Sessions auto-saved with notifications",
//                   },
//                 ]
//             ).map((f, i) => (
//               <div
//                 key={f.t}
//                 className="land-feat"
//                 style={{ animationDelay: `${i * 0.08}s` }}
//               >
//                 <div className="land-feat-ico">{f.ico}</div>
//                 <div className="land-feat-txt">
//                   <strong>{f.t}</strong>
//                   <span>{f.d}</span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       <div className="setup-right">
//         <div className="setup-right-inner">
//           <button
//             className="setup-back"
//             onClick={() => {
//               stopStream();
//               onBack();
//             }}
//           >
//             ← Back to Home
//           </button>
//           <h2 className="setup-title">
//             {mode === "debate" ? "⚔️ Debate Setup" : "🎓 Seminar Setup"}
//           </h2>
//           <p className="setup-sub">
//             Complete all steps to launch your{" "}
//             {mode === "debate" ? "debate" : "seminar"} room.
//           </p>

//           <MicPreview
//             permState={permState}
//             stream={stream}
//             name={name}
//             onRequest={requestMic}
//             micOn={micOn}
//             onToggleMic={toggleMic}
//           />

//           <div className="fi">
//             <label className="fl">Your Name</label>
//             <input
//               className="finput"
//               placeholder="e.g. Alex Chen"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               maxLength={40}
//             />
//           </div>
//           <div className="fi">
//             <label className="fl">
//               {mode === "debate" ? "Debate" : "Seminar"} Topic
//             </label>
//             <select
//               className="finput"
//               value={topic}
//               onChange={(e) => setTopic(e.target.value)}
//             >
//               <option value="">Select a topic…</option>
//               {TOPICS.map((t) => (
//                 <option key={t} value={t}>
//                   {t}
//                 </option>
//               ))}
//               <option value="__custom__">✏️ Custom topic…</option>
//             </select>
//           </div>
//           {topic === "__custom__" && (
//             <div className="fi">
//               <label className="fl">Custom Topic</label>
//               <input
//                 className="finput"
//                 placeholder="Enter your topic…"
//                 value={customTopic}
//                 onChange={(e) => setCustomTopic(e.target.value)}
//               />
//             </div>
//           )}

//           {mode === "debate" && (
//             <div className="fi">
//               <label className="fl">Debate Type</label>
//               <div className="submode-section" style={{ padding: "12px 14px" }}>
//                 <div className="submode-opts">
//                   {[
//                     {
//                       id: "ai",
//                       ico: "🤖",
//                       title: "Debate with AI",
//                       desc: "1-on-1. AI takes the opposing view. Get a personal analysis report at the end.",
//                     },
//                     {
//                       id: "multi",
//                       ico: "👥",
//                       title: "Multi-User Debate",
//                       desc: "Invite real participants. AI acts as mediator and analyses all users.",
//                     },
//                   ].map((o) => (
//                     <div
//                       key={o.id}
//                       className={`submode-opt ${subMode === o.id ? "sel" : ""}`}
//                       onClick={() => setSubMode(o.id)}
//                     >
//                       <div className="submode-opt-ico">{o.ico}</div>
//                       <div>
//                         <div className="submode-opt-title">{o.title}</div>
//                         <div className="submode-opt-desc">{o.desc}</div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           )}

//           {needsInvitees && (
//             <div className="fi">
//               <label className="fl">Invite Participants</label>
//               <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
//                 <input
//                   className="finput"
//                   placeholder="Name or email…"
//                   value={addInput}
//                   onChange={(e) => setAddInput(e.target.value)}
//                   onKeyDown={(e) => e.key === "Enter" && addInvitee()}
//                   style={{ flex: 1 }}
//                 />
//                 <button
//                   className="btn-s"
//                   style={{ padding: "9px 13px", whiteSpace: "nowrap" }}
//                   onClick={addInvitee}
//                 >
//                   + Add
//                 </button>
//               </div>
//               {invitees.length > 0 && (
//                 <div className="user-chips">
//                   {invitees.map((n, i) => (
//                     <div key={i} className="user-chip">
//                       {n.type === "email" ? "📧" : "👤"} {n.value}
//                       <button
//                         className="chip-rm"
//                         onClick={() =>
//                           setInvitees((inv) => inv.filter((_, j) => j !== i))
//                         }
//                       >
//                         ×
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           )}

//           <div className="fi-row fi">
//             <div>
//               <label className="fl">Date (optional)</label>
//               <input
//                 className="finput"
//                 type="date"
//                 value={schedDate}
//                 onChange={(e) => setSchedDate(e.target.value)}
//                 style={{ colorScheme: "light" }}
//               />
//             </div>
//             <div>
//               <label className="fl">Time</label>
//               <input
//                 className="finput"
//                 type="time"
//                 value={schedTime}
//                 onChange={(e) => setSchedTime(e.target.value)}
//                 style={{ colorScheme: "light" }}
//               />
//             </div>
//           </div>

//           <div className="fi">
//             <label className="fl">Room Link</label>
//             <div className="link-row">
//               <span className="link-val">{link}</span>
//               <button className="copy-btn" onClick={copyLink}>
//                 {copied ? "✓ Copied!" : "Copy"}
//               </button>
//             </div>
//           </div>
//           <CalSyncToggle enabled={syncCal} onChange={setSyncCal} />
//           <div className="steps">
//             {steps.map((s, i) => (
//               <div key={i} className={`step-item ${stepState(i)}`}>
//                 <div className="step-num">{s.done ? "✓" : i + 1}</div>
//                 <div className="step-label">{s.label}</div>
//               </div>
//             ))}
//           </div>
//           <button
//             className="btn-p"
//             onClick={handleLaunch}
//             disabled={!canLaunch}
//           >
//             🚀 Launch {mode === "debate" ? "Debate" : "Seminar"} Room
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Meeting Setup ────────────────────────────────────────────────────────────
// function MeetingSetup({ onBack, onLaunch }) {
//   const [name, setName] = useState("");
//   const [mtgType, setMtgType] = useState("");
//   const [title, setTitle] = useState("");
//   const [micOn, setMicOn] = useState(true);
//   const [camOn, setCamOn] = useState(true);
//   const [invitees, setInvitees] = useState([]);
//   const [addInput, setAddInput] = useState("");
//   const [schedDate, setSchedDate] = useState("");
//   const [schedTime, setSchedTime] = useState("10:00");
//   const [syncCal, setSyncCal] = useState(true);
//   const [copied, setCopied] = useState(false);
//   const [mailSent, setMailSent] = useState(false);
//   const [link] = useState(genLink);
//   const {
//     state: permState,
//     stream,
//     request: requestPerm,
//     stop: stopStream,
//   } = useMediaPerm();
//   const toggleMic = () => {
//     const n = !micOn;
//     setMicOn(n);
//     stream?.getAudioTracks().forEach((t) => (t.enabled = n));
//   };
//   const toggleCam = () => {
//     const n = !camOn;
//     setCamOn(n);
//     stream?.getVideoTracks().forEach((t) => (t.enabled = n));
//   };
//   const addInvitee = () => {
//     const v = addInput.trim();
//     if (v && !invitees.find((x) => x.value === v)) {
//       setInvitees((i) => [
//         ...i,
//         { value: v, type: v.includes("@") ? "email" : "name" },
//       ]);
//       setAddInput("");
//     }
//   };
//   const copyLink = () => {
//     navigator.clipboard.writeText(link);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2200);
//   };
//   const canJoin = name.trim() && permState === "granted" && mtgType;

//   function handleLaunch() {
//     const evtTitle = title || "Team Meeting";
//     if (syncCal) {
//       syncToCalendar({
//         type: "meeting",
//         title: evtTitle,
//         date: schedDate ? new Date(schedDate + "T12:00:00") : new Date(),
//         time: schedTime,
//         attendees: invitees,
//         link,
//         description: `Meeting: "${evtTitle}". Host: ${name}.`,
//       });
//     }
//     pushNotification({
//       title: `📹 ${mtgType === "schedule" ? "Meeting Scheduled" : "Meeting Started"}: "${evtTitle}"`,
//       body: `Host: ${name}${schedDate ? `. Scheduled for ${schedDate}` : ""}.`,
//       eventType: "meeting",
//       category: "assignment",
//     });
//     if (mtgType === "schedule") {
//       setMailSent(true);
//       navigator.clipboard.writeText(link);
//       return;
//     }
//     onLaunch({
//       name,
//       stream,
//       micOn,
//       camOn,
//       topic: evtTitle,
//       invitees,
//       mode: "meeting",
//       link,
//       syncedToCalendar: syncCal,
//     });
//   }

//   return (
//     <div className="setup-full">
//       <div className="setup-left">
//         <div
//           style={{
//             position: "absolute",
//             inset: 0,
//             backgroundImage:
//               "linear-gradient(rgba(56,189,248,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.04) 1px,transparent 1px)",
//             backgroundSize: "44px 44px",
//             pointerEvents: "none",
//           }}
//         />
//         <div
//           style={{
//             position: "absolute",
//             width: 450,
//             height: 450,
//             borderRadius: "50%",
//             background:
//               "radial-gradient(circle,rgba(56,189,248,.11) 0%,transparent 70%)",
//             top: -120,
//             right: -80,
//             pointerEvents: "none",
//             animation: "orbFloat 9s ease-in-out infinite",
//           }}
//         />
//         <div
//           style={{
//             position: "relative",
//             zIndex: 1,
//             animation: "pageIn .55s ease",
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 9,
//               marginBottom: 26,
//             }}
//           >
//             <div
//               style={{
//                 width: 34,
//                 height: 34,
//                 background: "var(--grad2)",
//                 borderRadius: 10,
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 fontSize: 17,
//               }}
//             >
//               📹
//             </div>
//             <span
//               style={{
//                 fontSize: 15,
//                 fontWeight: 800,
//                 background: "linear-gradient(90deg,#fff,var(--sky))",
//                 WebkitBackgroundClip: "text",
//                 WebkitTextFillColor: "transparent",
//               }}
//             >
//               DebateArena
//             </span>
//           </div>
//           <div
//             className="land-badge"
//             style={{
//               background: "rgba(56,189,248,.14)",
//               borderColor: "rgba(56,189,248,.28)",
//               color: "var(--sky)",
//             }}
//           >
//             <div
//               className="land-badge-dot"
//               style={{ background: "var(--sky)" }}
//             />
//             Meeting Setup
//           </div>
//           <h2
//             style={{
//               fontSize: "clamp(22px,3vw,40px)",
//               fontWeight: 900,
//               lineHeight: 1.05,
//               letterSpacing: -1.5,
//               color: "#fff",
//               marginBottom: 13,
//             }}
//           >
//             Set up your
//             <br />
//             <span
//               style={{
//                 background: "var(--grad2)",
//                 WebkitBackgroundClip: "text",
//                 WebkitTextFillColor: "transparent",
//               }}
//             >
//               Meeting Room
//             </span>
//           </h2>
//           <p
//             style={{
//               fontSize: 13,
//               color: "rgba(255,255,255,.45)",
//               lineHeight: 1.8,
//               marginBottom: 28,
//             }}
//           >
//             Video call with camera, screen sharing, recording and calendar sync.
//           </p>
//           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//             {[
//               {
//                 ico: "⚡",
//                 t: "Instant Meetings",
//                 d: "Start a video call in seconds",
//               },
//               {
//                 ico: "📅",
//                 t: "Scheduled Meetings",
//                 d: "Plan ahead with full calendar invite",
//               },
//               {
//                 ico: "🖥",
//                 t: "Screen Sharing",
//                 d: "Share your screen with all participants",
//               },
//               {
//                 ico: "🎬",
//                 t: "Session Recording",
//                 d: "Record & download after the meeting",
//               },
//             ].map((f, i) => (
//               <div
//                 key={f.t}
//                 className="land-feat"
//                 style={{ animationDelay: `${i * 0.08}s` }}
//               >
//                 <div className="land-feat-ico">{f.ico}</div>
//                 <div className="land-feat-txt">
//                   <strong>{f.t}</strong>
//                   <span>{f.d}</span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//       <div className="setup-right">
//         <div className="setup-right-inner">
//           <button
//             className="setup-back"
//             onClick={() => {
//               stopStream();
//               onBack();
//             }}
//           >
//             ← Back to Home
//           </button>
//           <h2 className="setup-title">📹 Meeting Setup</h2>
//           <p className="setup-sub">Start now or schedule for later.</p>
//           <CamPreview
//             stream={stream}
//             camOn={camOn}
//             micOn={micOn}
//             name={name}
//             permState={permState}
//             onRequest={requestPerm}
//             onToggleMic={toggleMic}
//             onToggleCam={toggleCam}
//           />
//           <div className="fi">
//             <label className="fl">Your Name</label>
//             <input
//               className="finput"
//               placeholder="e.g. Alex Chen"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               maxLength={40}
//             />
//           </div>
//           <div className="fi">
//             <label className="fl">Meeting Type</label>
//             <div style={{ display: "flex", gap: 8 }}>
//               {[
//                 { id: "instant", ico: "⚡", label: "Quick Meeting" },
//                 { id: "schedule", ico: "📅", label: "Schedule" },
//               ].map((o) => (
//                 <div
//                   key={o.id}
//                   onClick={() => setMtgType(o.id)}
//                   style={{
//                     flex: 1,
//                     padding: "12px 14px",
//                     borderRadius: 11,
//                     border: `1.5px solid ${mtgType === o.id ? "var(--ind)" : "var(--border)"}`,
//                     background:
//                       mtgType === o.id
//                         ? "rgba(99,102,241,.06)"
//                         : "var(--surface2)",
//                     cursor: "pointer",
//                     transition: ".2s",
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 8,
//                     fontWeight: 700,
//                     fontSize: 13,
//                   }}
//                 >
//                   <span style={{ fontSize: 18 }}>{o.ico}</span>
//                   {o.label}
//                 </div>
//               ))}
//             </div>
//           </div>
//           {mtgType === "schedule" && (
//             <>
//               <div className="fi">
//                 <label className="fl">Meeting Title</label>
//                 <input
//                   className="finput"
//                   placeholder="e.g. Weekly Standup"
//                   value={title}
//                   onChange={(e) => setTitle(e.target.value)}
//                 />
//               </div>
//               <div className="fi-row fi">
//                 <div>
//                   <label className="fl">Date</label>
//                   <input
//                     className="finput"
//                     type="date"
//                     value={schedDate}
//                     onChange={(e) => setSchedDate(e.target.value)}
//                     style={{ colorScheme: "light" }}
//                   />
//                 </div>
//                 <div>
//                   <label className="fl">Time</label>
//                   <input
//                     className="finput"
//                     type="time"
//                     value={schedTime}
//                     onChange={(e) => setSchedTime(e.target.value)}
//                     style={{ colorScheme: "light" }}
//                   />
//                 </div>
//               </div>
//             </>
//           )}
//           <div className="fi">
//             <label className="fl">Add Participants</label>
//             <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
//               <input
//                 className="finput"
//                 placeholder="Name or email…"
//                 value={addInput}
//                 onChange={(e) => setAddInput(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && addInvitee()}
//                 style={{ flex: 1 }}
//               />
//               <button
//                 className="btn-s"
//                 style={{ padding: "9px 13px", whiteSpace: "nowrap" }}
//                 onClick={addInvitee}
//               >
//                 + Add
//               </button>
//             </div>
//             {invitees.length > 0 && (
//               <div className="user-chips">
//                 {invitees.map((n, i) => (
//                   <div key={i} className="user-chip">
//                     {n.type === "email" ? "📧" : "👤"} {n.value}
//                     <button
//                       className="chip-rm"
//                       onClick={() =>
//                         setInvitees((inv) => inv.filter((_, j) => j !== i))
//                       }
//                     >
//                       ×
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//           <div className="fi">
//             <label className="fl">Meeting Link</label>
//             <div className="link-row">
//               <span className="link-val">{link}</span>
//               <button className="copy-btn" onClick={copyLink}>
//                 {copied ? "✓ Copied!" : "Copy"}
//               </button>
//             </div>
//           </div>
//           <CalSyncToggle enabled={syncCal} onChange={setSyncCal} />
//           {mailSent && (
//             <div className="sync-success" style={{ marginBottom: 12 }}>
//               <div className="sync-success-ico">📅✅</div>
//               <div className="sync-success-title">Meeting Scheduled!</div>
//               <div className="sync-success-sub">
//                 Link copied. Invitees notified. Saved to calendar.
//               </div>
//             </div>
//           )}
//           <button className="btn-p" onClick={handleLaunch} disabled={!canJoin}>
//             {mtgType === "schedule"
//               ? "📅 Schedule Meeting"
//               : "🚀 Start Meeting Now"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Results Screen ───────────────────────────────────────────────────────────
// function ResultsScreen({ result, onNew }) {
//   const [showAnalysis, setShowAnalysis] = useState(false);
//   function handleDownloadRec() {
//     const fname = `debatearena-${(result.topic || "session").slice(0, 20)}.webm`;
//     result.recorder?.download(fname);
//   }
//   function downloadAnalysisTxt() {
//     const rpt = `DebateArena Analysis\n\nTopic: ${result.topic}\nDuration: ${result.timer}\nParticipants: ${result.participants}\n\n— Generated by DebateArena`;
//     const b = new Blob([rpt], { type: "text/plain" });
//     const u = URL.createObjectURL(b);
//     const a = document.createElement("a");
//     a.href = u;
//     a.download = "debatearena-analysis.txt";
//     a.click();
//     URL.revokeObjectURL(u);
//   }
//   const modeEmoji =
//     result.mode === "debate" ? "⚔️" : result.mode === "seminar" ? "🎓" : "📹";
//   return (
//     <div className="results">
//       <div className="res-trophy">🏆</div>
//       <div className="res-title">
//         {result.mode === "debate"
//           ? "Debate Complete!"
//           : result.mode === "seminar"
//             ? "Seminar Complete!"
//             : "Meeting Ended!"}
//       </div>
//       <p className="res-sub">
//         {modeEmoji} Session lasted{" "}
//         <strong style={{ color: "var(--ind)" }}>{result.timer}</strong> with{" "}
//         <strong>{result.participants}</strong> participant(s).
//       </p>
//       <div className="res-stats">
//         {[
//           { l: "Duration", v: result.timer, i: "⏱️" },
//           { l: "Participants", v: result.participants, i: "👥" },
//           { l: "Exchanges", v: 14, i: "💬" },
//         ].map((s, i) => (
//           <div
//             key={s.l}
//             className="res-stat"
//             style={{ animationDelay: `${i * 0.1}s` }}
//           >
//             <div className="res-stat-ico">{s.i}</div>
//             <div className="res-stat-val">{s.v}</div>
//             <div className="res-stat-lbl">{s.l}</div>
//           </div>
//         ))}
//       </div>
//       <div
//         style={{
//           display: "flex",
//           gap: 10,
//           flexWrap: "wrap",
//           justifyContent: "center",
//           marginBottom: 14,
//         }}
//       >
//         {result.hasRecording && (
//           <button
//             className="btn-s"
//             style={{ display: "flex", alignItems: "center", gap: 7 }}
//             onClick={handleDownloadRec}
//           >
//             📥 Download Recording
//           </button>
//         )}
//         {(result.mode === "debate" || result.mode === "seminar") && (
//           <button
//             className="btn-s"
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 7,
//               borderColor: "rgba(99,102,241,.3)",
//               color: "var(--ind)",
//             }}
//             onClick={() => setShowAnalysis(true)}
//           >
//             📊 View Analysis Report
//           </button>
//         )}
//       </div>
//       <button
//         className="btn-p"
//         style={{ width: "auto", padding: "12px 28px", fontSize: 14 }}
//         onClick={onNew}
//       >
//         Start New Session
//       </button>
//       {showAnalysis && (
//         <AnalysisReport
//           mode={result.mode}
//           subMode={result.subMode}
//           topic={result.topic}
//           participants={
//             result.participantsList || [
//               { id: 0, name: "You" },
//               { id: 1, name: "Participant" },
//             ]
//           }
//           scores={result.scores || { you: 65, ai: 52 }}
//           timer={result.timer}
//           onClose={() => setShowAnalysis(false)}
//           onDownload={downloadAnalysisTxt}
//         />
//       )}
//     </div>
//   );
// }

// // ─── Landing ──────────────────────────────────────────────────────────────────
// function Landing({ onSelect }) {
//   const [sel, setSel] = useState(null);
//   const [joinLink, setJoinLink] = useState("");
//   const [showJoin, setShowJoin] = useState(false);
//   const [joinName, setJoinName] = useState("");
//   const [toast, setToast] = useState(null);

//   function handleJoin() {
//     if (!joinLink.trim()) return;
//     if (!joinName.trim()) {
//       setToast({ msg: "Please enter your name to join", type: "warn" });
//       return;
//     }
//     setToast({ msg: `🔗 Joining session as "${joinName}"…`, type: "info" });
//     setTimeout(() => {
//       setToast({
//         msg: "Joined! (In a real app, this would connect to the live room)",
//         type: "success",
//       });
//     }, 1800);
//   }

//   return (
//     <div className="land page-enter">
//       <div className="land-left">
//         <div className="land-orb1" />
//         <div className="land-orb2" />
//         <div className="land-grid-bg" />
//         <div className="land-content">
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 9,
//               marginBottom: 28,
//             }}
//           >
//             <div
//               style={{
//                 width: 38,
//                 height: 38,
//                 background: "var(--grad)",
//                 borderRadius: 11,
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 fontSize: 18,
//                 boxShadow: "0 8px 20px rgba(99,102,241,.4)",
//               }}
//             >
//               ⚔️
//             </div>
//             <span
//               style={{
//                 fontSize: 17,
//                 fontWeight: 900,
//                 background: "linear-gradient(90deg,#fff,var(--ind3))",
//                 WebkitBackgroundClip: "text",
//                 WebkitTextFillColor: "transparent",
//               }}
//             >
//               DebateArena
//             </span>
//           </div>
//           <div className="land-badge">
//             <div className="land-badge-dot" />
//             Live Platform
//           </div>
//           <h1 className="land-h1">
//             Sharpen Your <span className="grad">Arguments.</span>
//             <br />
//             Win Every <span className="grad">Debate.</span>
//           </h1>
//           <p className="land-p">
//             Professional debate rooms with AI opponents, live scoring,
//             structured phases, full recording, and calendar integration.
//           </p>
//           <div className="land-feats">
//             {[
//               {
//                 ico: "⚔️",
//                 t: "AI Debate Partner",
//                 d: "Intelligent real-time rebuttals",
//               },
//               {
//                 ico: "📹",
//                 t: "Video Meetings",
//                 d: "Instant or scheduled with screen sharing",
//               },
//               {
//                 ico: "🎓",
//                 t: "Seminar Sessions",
//                 d: "AI-mediated multi-participant seminars",
//               },
//               {
//                 ico: "📊",
//                 t: "Analysis Reports",
//                 d: "Full AI-generated debate analysis",
//               },
//             ].map((f, i) => (
//               <div
//                 key={f.t}
//                 className="land-feat"
//                 style={{ animationDelay: `${0.1 + i * 0.08}s` }}
//               >
//                 <div className="land-feat-ico">{f.ico}</div>
//                 <div className="land-feat-txt">
//                   <strong>{f.t}</strong>
//                   <span>{f.d}</span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       <div className="land-right">
//         <div className="mode-wrap">
//           <h2 className="mode-title">What would you like to do?</h2>
//           <p className="mode-sub">Choose a session type to get started.</p>
//           <div className="mode-cards">
//             {[
//               {
//                 id: "debate",
//                 ico: "⚔️",
//                 title: "Debate Session",
//                 desc: "AI opponent or multi-user with AI mediator. Get analysis report.",
//               },
//               {
//                 id: "meeting",
//                 ico: "📹",
//                 title: "Video Meeting",
//                 desc: "Instant or scheduled. Camera, mic & screen sharing.",
//               },
//               {
//                 id: "seminar",
//                 ico: "🎓",
//                 title: "Seminar",
//                 desc: "Multi-user discussion with AI mediator and full analysis.",
//               },
//             ].map((m) => (
//               <div
//                 key={m.id}
//                 className={`mode-card ${sel === m.id ? "sel" : ""}`}
//                 onClick={() => setSel(m.id)}
//               >
//                 <div className="mode-card-ck">✓</div>
//                 <span className="mode-card-ico">{m.ico}</span>
//                 <div className="mode-card-title">{m.title}</div>
//                 <div className="mode-card-desc">{m.desc}</div>
//               </div>
//             ))}
//           </div>
//           <button
//             className="btn-p"
//             style={{ marginBottom: 12 }}
//             disabled={!sel}
//             onClick={() => onSelect(sel)}
//           >
//             {sel
//               ? sel === "debate"
//                 ? "⚔️ Setup Debate Room"
//                 : sel === "meeting"
//                   ? "📹 Setup Meeting Room"
//                   : "🎓 Setup Seminar Room"
//               : "Select a mode to continue"}
//           </button>

//           {/* Join by link */}
//           <div className="join-section">
//             <div className="join-title">🔗 Join with Link</div>
//             {!showJoin ? (
//               <button
//                 className="btn-s"
//                 style={{ width: "100%", fontSize: 12.5 }}
//                 onClick={() => setShowJoin(true)}
//               >
//                 Enter Room Link to Join →
//               </button>
//             ) : (
//               <>
//                 <div className="fi" style={{ marginBottom: 8 }}>
//                   <input
//                     className="finput"
//                     placeholder="Your name"
//                     value={joinName}
//                     onChange={(e) => setJoinName(e.target.value)}
//                     style={{ marginBottom: 6 }}
//                   />
//                   <input
//                     className="finput"
//                     placeholder="Paste room link… https://debatearena.app/join?room=…"
//                     value={joinLink}
//                     onChange={(e) => setJoinLink(e.target.value)}
//                   />
//                 </div>
//                 <div style={{ display: "flex", gap: 7 }}>
//                   <button
//                     className="btn-s"
//                     style={{ flex: "0 0 auto" }}
//                     onClick={() => setShowJoin(false)}
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     className="btn-p"
//                     style={{ flex: 1, fontSize: 13 }}
//                     onClick={handleJoin}
//                     disabled={!joinLink.trim() || !joinName.trim()}
//                   >
//                     🔗 Join Session
//                   </button>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//       {toast && (
//         <Toast
//           msg={toast.msg}
//           type={toast.type}
//           onDone={() => setToast(null)}
//         />
//       )}
//     </div>
//   );
// }

// // ─── Root ─────────────────────────────────────────────────────────────────────
// export default function DebateArenaPage({
//   onOpenCalendar,
//   onOpenNotifications,
// }) {
//   const [screen, setScreen] = useState("landing");
//   const [roomConfig, setRoomConfig] = useState(null);
//   const [result, setResult] = useState(null);
//   const [currentRole, setCurrentRole] = useState("student");

//   function navigate(mode) {
//     if (mode === "debate") setScreen("debate-setup");
//     if (mode === "meeting") setScreen("meeting-setup");
//     if (mode === "seminar") setScreen("seminar-setup");
//   }

//   const isRoom = screen.endsWith("-room");

//   return (
//     <>
//       <style>{GLOBAL_CSS}</style>
//       <div className="da-app">
//         <Navigation currentRole={currentRole} onRoleChange={setCurrentRole} />
//         <div className="da-main">
//           {screen === "landing" && <Landing onSelect={navigate} />}
//           {screen === "debate-setup" && (
//             <DebateSeminarSetup
//               mode="debate"
//               onBack={() => setScreen("landing")}
//               onLaunch={(cfg) => {
//                 setRoomConfig(cfg);
//                 setScreen("debate-room");
//               }}
//             />
//           )}
//           {screen === "seminar-setup" && (
//             <DebateSeminarSetup
//               mode="seminar"
//               onBack={() => setScreen("landing")}
//               onLaunch={(cfg) => {
//                 setRoomConfig(cfg);
//                 setScreen("seminar-room");
//               }}
//             />
//           )}
//           {screen === "meeting-setup" && (
//             <MeetingSetup
//               onBack={() => setScreen("landing")}
//               onLaunch={(cfg) => {
//                 setRoomConfig(cfg);
//                 setScreen("meeting-room");
//               }}
//             />
//           )}
//           {(screen === "debate-room" ||
//             screen === "seminar-room" ||
//             screen === "meeting-room") &&
//             roomConfig && (
//               <Room
//                 config={roomConfig}
//                 onEnd={(res) => {
//                   setResult({ ...res, scores: roomConfig.scores });
//                   setScreen("results");
//                 }}
//               />
//             )}
//           {screen === "results" && result && (
//             <ResultsScreen
//               result={result}
//               onNew={() => {
//                 setScreen("landing");
//                 setResult(null);
//                 setRoomConfig(null);
//               }}
//             />
//           )}
//         </div>
//       </div>
//     </>
//   );
// }

import { useState, useEffect } from "react";
import Navigation from "../components/navigation";
import { CSS } from "./debate/styles";
import { saveSession, loadSession, clearSession } from "./debate/shared";
import { Landing, DebateSetup, SeminarSetup, MeetingSetup, ResultsScreen } from "./debate/Pages";
import { Room } from "./debate/Room";

type Screen = "landing" | "debate-setup" | "seminar-setup" | "meeting-setup" | "room" | "results";

const ROOM_CONFIG_KEY = "da_community_room_config";

export default function DebateArenaPage({ onOpenCalendar, onOpenNotifications }: any) {

  // ── 1. Read pending community config ONCE before any state ──────────────
  const pendingCommunityConfig = (() => {
    try {
      const raw = localStorage.getItem(ROOM_CONFIG_KEY);
      if (!raw) return null;
      const cfg = JSON.parse(raw);
      if (cfg?.fromCommunity) {
        localStorage.removeItem(ROOM_CONFIG_KEY); // consume immediately
        return cfg;
      }
      return null;
    } catch { return null; }
  })();

  // ── 2. State — skip session restore if community join ───────────────────
  const fromCommunity = !!pendingCommunityConfig;

  const [screen, setScreen] = useState<Screen>(fromCommunity ? "room" : "landing");
  const [config, setConfig] = useState<any>(fromCommunity ? pendingCommunityConfig : null);
  const [result, setResult] = useState<any>(null);
  const [role, setRole] = useState("student");

  // ── 3. Session restore — SKIPPED entirely if community join ─────────────
  useEffect(() => {
    if (fromCommunity) return; // ← KEY FIX: don't let session restore fight community config

    const s = loadSession();
    if (!s) return;
    const setupScreens: Screen[] = ["debate-setup", "seminar-setup", "meeting-setup", "landing"];
    if (setupScreens.includes(s.screen as Screen)) {
      setScreen(s.screen as Screen);
      return;
    }
    if (s.screen === "room" && s.extra?.mode) {
      const mode = s.extra.mode;
      setScreen(
        mode === "debate"  ? "debate-setup"  :
        mode === "seminar" ? "seminar-setup" : "meeting-setup"
      );
      return;
    }
    if (s.screen === "results" && s.extra) {
      setResult(s.extra);
      setScreen("results");
    }
  }, []); // eslint-disable-line

  // ── 4. Persist screen on change (skip for community-initiated room) ─────
  useEffect(() => {
    if (fromCommunity && screen === "room") return; // don't overwrite community session
    if (screen === "room")         saveSession(screen, config ? { mode: config.mode, subMode: config.subMode } : null);
    else if (screen === "results") saveSession(screen, result);
    else                           saveSession(screen);
  }, [screen]); // eslint-disable-line

  // ── 5. Nav helpers ───────────────────────────────────────────────────────
  function nav(mode: string) {
    if (mode === "debate")  setScreen("debate-setup");
    if (mode === "meeting") setScreen("meeting-setup");
    if (mode === "seminar") setScreen("seminar-setup");
  }

  function launch(cfg: any)  { setConfig(cfg); setScreen("room"); }
  function end(res: any)     { setResult(res);  setScreen("results"); }
  function fresh()           { setScreen("landing"); setResult(null); setConfig(null); clearSession(); }

  // ── 6. Build the final Room config from community payload ────────────────
  //    Room.tsx expects: mode, subMode, name, topic, stream, micOn, camOn,
  //                      invitees, roomId, roomLink
  //    Community payload has: mode, subMode, name, micOn, camOn, topic,
  //                           roomId, roomLink, fromCommunity
  //    stream is null here — Room.tsx will request media itself when needed.
  const roomConfig = screen === "room" && config
    ? {
        ...config,
        // Ensure subMode is set correctly per mode
        subMode: config.subMode
          ?? (config.mode === "debate"  ? "ai"    :
              config.mode === "seminar" ? "multi"  : "quick"),
        // stream is null; Room.tsx acquires media on mount via its own useEffect
        stream:   config.stream ?? null,
        // invitees array required by Room
        invitees: config.invitees ?? [],
      }
    : config;

  return (
    <>
      <style>{CSS}</style>
      <div className="da-app">
        <Navigation currentRole={role} onRoleChange={setRole} />
        <div className="da-main">
          {screen === "landing"       && <Landing       onSelect={nav} />}
          {screen === "debate-setup"  && <DebateSetup   onBack={() => setScreen("landing")} onLaunch={launch} />}
          {screen === "seminar-setup" && <SeminarSetup  onBack={() => setScreen("landing")} onLaunch={launch} />}
          {screen === "meeting-setup" && <MeetingSetup  onBack={() => setScreen("landing")} onLaunch={launch} />}

          {screen === "room" && roomConfig && (
            <Room
              config={roomConfig}
              onEnd={(res: any) => {
                setConfig(null);
                end(res);
              }}
            />
          )}

          {screen === "results" && result && (
            <ResultsScreen result={result} onNew={fresh} />
          )}
        </div>
      </div>
    </>
  );
}