export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}

:root{
  --bg:#f8fafc; --surf:#fff; --surf2:#f8fafc; --surf3:#f1f5f9;
  --bdr:rgba(0,0,0,.06); --bdr2:rgba(0,0,0,.1);
  --ind:#6366f1; --ind2:#818cf8; --ind3:#a5b4fc;
  --vio:#8b5cf6; --pnk:#ec4899; --em:#10b981; --amb:#f59e0b;
  --sky:#38bdf8; --red:#ef4444;
  --t1:#0f172a; --t2:#475569; --t3:#94a3b8; --t4:#e2e8f0;
  --font:'Plus Jakarta Sans',system-ui,sans-serif;
  --sh:0 2px 12px rgba(0,0,0,.05);
  --sh2:0 8px 32px rgba(0,0,0,.12);
  --sh3:0 24px 64px rgba(0,0,0,.18);
  --grad:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  --grad2:linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%);
  --grad3:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);
  --r:20px;
}

body{font-family:var(--font);background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:rgba(99,102,241,.2);border-radius:4px}
button,input,select,textarea{font-family:var(--font)}

/* ── App shell ── */
.da-app{height:100dvh;display:flex;flex-direction:column;overflow:hidden}
.da-main{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.scroll-y{overflow-y:auto;overflow-x:hidden}

/* ── Keyframes ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
@keyframes slideLeft{from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:none}}
@keyframes slideRight{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:none}}
@keyframes heroIn{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}
@keyframes orbFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-16px) scale(1.02)}}
@keyframes orbPulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes modalUp{from{opacity:0;transform:translateY(22px) scale(.96)}to{opacity:1;transform:none}}
@keyframes recBlink{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes tileIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
@keyframes speakRing{0%,100%{box-shadow:0 0 0 2.5px #10b981,0 0 0 6px rgba(16,185,129,.12)}50%{box-shadow:0 0 0 3.5px #10b981,0 0 0 10px rgba(16,185,129,.05)}}
@keyframes waveBar{0%,100%{height:3px;opacity:.5}50%{height:20px;opacity:1}}
@keyframes chipIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
@keyframes tIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes rPop{0%{opacity:0;transform:translate(-50%,-70%) scale(.3)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.3)}65%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-120%) scale(.7)}}
@keyframes dotPulse{0%,80%,100%{transform:scale(.5);opacity:.4}40%{transform:scale(1);opacity:1}}
@keyframes turnBlink{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes spinReverse{to{transform:rotate(-360deg)}}
@keyframes sceneFly{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
@keyframes badgeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}

/* ── Hero (matched to dashboard) ── */
.hero{margin:18px 24px 0;border-radius:var(--r);padding:18px 26px;
  background:var(--grad);position:relative;overflow:hidden;color:#fff;
  box-shadow:0 6px 24px rgba(99,102,241,.28);
  animation:heroIn .5s cubic-bezier(.34,1.56,.64,1) both}
.hero::before,.hero::after{content:'';position:absolute;border-radius:50%;pointer-events:none}
.hero::before{width:190px;height:190px;background:rgba(255,255,255,.1);top:-55px;right:-55px}
.hero::after{width:140px;height:140px;background:rgba(255,255,255,.06);bottom:-45px;left:28%}
.hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.hero-left{display:flex;align-items:center;gap:12px}
.hero-icon{width:42px;height:42px;border-radius:13px;background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px}
.hero-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;margin-bottom:5px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);font-size:10.5px;font-weight:700;color:#fff}
.hero-title{font-size:clamp(15px,2vw,21px);font-weight:800;color:#fff;margin-bottom:2px;letter-spacing:-.2px;line-height:1.2}
.hero-sub{font-size:12px;color:rgba(255,255,255,.68)}

/* ── Dashboard-matched panel card ── */
.panel{background:var(--surf);border-radius:var(--r);border:1px solid var(--bdr);box-shadow:var(--sh);overflow:hidden}
.panel-head{padding:16px 20px 13px;border-bottom:1px solid var(--surf3);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.panel-title{font-size:14.5px;font-weight:800;color:var(--t1);display:flex;align-items:center;gap:7px}
.panel-sub{font-size:12px;color:var(--t2);margin-top:2px}
.panel-body{padding:18px 20px}

/* ── Stat card (dashboard style) ── */
.scard{background:var(--surf);border-radius:var(--r);padding:18px;border:1px solid var(--bdr);box-shadow:var(--sh);transition:all .28s;animation:fadeUp .5s cubic-bezier(.34,1.56,.64,1) both;cursor:default}
.scard:hover{transform:translateY(-5px) scale(1.01);box-shadow:0 12px 32px rgba(0,0,0,.1)}
.scard.blue{border-top:3px solid var(--ind)}.scard.green{border-top:3px solid var(--em)}.scard.amber{border-top:3px solid var(--amb)}.scard.purple{border-top:3px solid var(--vio)}
.scard-icon{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:11px;font-size:18px}
.scard.blue .scard-icon{background:rgba(99,102,241,.1)}.scard.green .scard-icon{background:rgba(16,185,129,.1)}.scard.amber .scard-icon{background:rgba(245,158,11,.1)}.scard.purple .scard-icon{background:rgba(139,92,246,.1)}
.scard-n{font-size:28px;font-weight:800;color:var(--t1);letter-spacing:-1px;line-height:1}
.scard-l{font-size:12px;color:var(--t2);margin-top:3px}
.scard-sub{font-size:11px;color:var(--em);margin-top:5px;font-weight:600}

/* ── Form ── */
.fi{margin-bottom:10px}
.fl{display:block;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--t3);margin-bottom:5px}
.finput{width:100%;padding:10px 12px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);color:var(--t1);font-size:13px;outline:none;transition:all .18s}
.finput:focus{border-color:var(--ind);background:var(--surf);box-shadow:0 0 0 3px rgba(99,102,241,.1)}
.finput::placeholder{color:var(--t3)}
select.finput{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}
.fi-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}
textarea.finput{resize:none;min-height:38px}

/* ── Invite row (like Google Meet) ── */
.invite-row{display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:12px;border:1.5px solid var(--bdr);background:var(--surf2);margin-bottom:6px;transition:all .2s;animation:chipIn .22s ease}
.invite-row:hover{border-color:rgba(99,102,241,.25);background:rgba(99,102,241,.025)}
.invite-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0}
.invite-info{flex:1;min-width:0}
.invite-name{font-size:13px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invite-email{font-size:11px;color:var(--t3);margin-top:1px}
.invite-status{font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;flex-shrink:0}
.inv-pending{background:rgba(245,158,11,.1);color:var(--amb)}
.inv-sent   {background:rgba(56,189,248,.1);color:var(--sky)}
.inv-joined {background:rgba(16,185,129,.1);color:var(--em)}
.inv-declined{background:rgba(239,68,68,.08);color:var(--red)}
.invite-rm{width:24px;height:24px;border-radius:7px;border:1.5px solid var(--bdr);background:var(--surf3);cursor:pointer;color:var(--t3);display:flex;align-items:center;justify-content:center;font-size:11px;transition:.15s;flex-shrink:0}
.invite-rm:hover{background:rgba(239,68,68,.1);color:var(--red);border-color:rgba(239,68,68,.25);transform:scale(1.1)}

/* ── Link share box ── */
.link-box{border-radius:14px;background:rgba(99,102,241,.04);border:1.5px solid rgba(99,102,241,.16);padding:12px 14px;margin-bottom:10px}
.link-box-title{font-size:10px;font-weight:800;color:var(--ind);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;display:flex;align-items:center;gap:5px}
.link-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:10px;background:var(--surf);border:1.5px solid var(--bdr)}
.link-val{flex:1;font-family:monospace;font-size:10.5px;color:var(--ind);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.copy-btn{padding:5px 11px;border-radius:7px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:11.5px;font-weight:800;transition:.18s;flex-shrink:0}
.copy-btn:hover{transform:scale(1.05)}
.share-actions{display:flex;gap:6px;margin-top:7px}
.share-btn{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:11.5px;font-weight:700;color:var(--t2);transition:.2s;display:flex;align-items:center;justify-content:center;gap:5px}
.share-btn:hover{border-color:rgba(99,102,241,.3);color:var(--ind);background:rgba(99,102,241,.04)}

/* ── Buttons ── */
.btn-p{padding:11px 20px;border-radius:13px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:13px;font-weight:700;transition:all .22s;box-shadow:0 5px 18px rgba(99,102,241,.28);display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font);width:100%}
.btn-p:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 9px 26px rgba(99,102,241,.38)}
.btn-p:disabled{opacity:.38;cursor:not-allowed;transform:none;box-shadow:none}
.btn-s{padding:9px 16px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn-s:hover{border-color:rgba(99,102,241,.32);color:var(--t1);background:rgba(99,102,241,.04)}
.btn-d{padding:9px 16px;border-radius:11px;border:1.5px solid rgba(239,68,68,.25);background:rgba(239,68,68,.06);cursor:pointer;color:var(--red);font-size:12.5px;font-weight:700;transition:.2s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn-d:hover{background:rgba(239,68,68,.12)}

/* ── Steps ── */
.steps{display:flex;flex-direction:column;gap:5px;margin-bottom:13px}
.step-row{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf2);transition:.22s}
.step-row.done{border-color:rgba(16,185,129,.32);background:rgba(16,185,129,.05)}
.step-row.act {border-color:rgba(99,102,241,.32);background:rgba(99,102,241,.05)}
.step-row.pend{opacity:.45}
.step-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;flex-shrink:0}
.step-row.done .step-num{background:var(--em);color:#fff}
.step-row.act  .step-num{background:var(--ind);color:#fff}
.step-row.pend .step-num{background:var(--surf3);color:var(--t3)}
.step-lbl{font-size:12px;font-weight:700}
.step-row.done .step-lbl{color:var(--em)}.step-row.act .step-lbl{color:var(--t1)}.step-row.pend .step-lbl{color:var(--t3)}

/* ── Cal sync ── */
.cal-banner{display:flex;align-items:center;gap:9px;padding:11px 13px;border-radius:12px;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.22);margin-bottom:11px;cursor:pointer;transition:.2s}
.cal-banner:hover{background:rgba(16,185,129,.11)}
.cal-t strong{display:block;font-size:12px;font-weight:800;color:var(--em);margin-bottom:1px}
.cal-t span{font-size:11px;color:var(--t2)}
.toggle{width:38px;height:20px;border-radius:10px;border:none;cursor:pointer;position:relative;transition:.2s;flex-shrink:0;margin-left:auto}
.toggle-thumb{position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 4px rgba(0,0,0,.2)}

/* ── Toast ── */
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--surf);border:1.5px solid var(--bdr);border-radius:13px;padding:10px 17px;font-size:12.5px;font-weight:700;color:var(--t1);box-shadow:var(--sh2);z-index:9999;display:flex;align-items:center;gap:7px;animation:tIn .32s cubic-bezier(.34,1.2,.64,1);white-space:nowrap;max-width:calc(100vw - 28px)}
.toast.success{border-color:rgba(16,185,129,.4)}.toast.error{border-color:rgba(239,68,68,.4)}.toast.warn{border-color:rgba(245,158,11,.4)}.toast.info{border-color:rgba(99,102,241,.36)}

/* ── Loader spinner ── */
.loader-spin{width:22px;height:22px;border-radius:50%;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .7s linear infinite;flex-shrink:0}
.loader-spin.dark{border-color:rgba(99,102,241,.2);border-top-color:var(--ind)}
.loader-dots{display:flex;gap:4px;align-items:center}
.loader-dot{width:7px;height:7px;border-radius:50%;background:var(--ind);animation:dotPulse .9s ease-in-out infinite}

/* ── Overlay / Modal ── */
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);backdrop-filter:blur(10px);z-index:700;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease}
.modal{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);width:100%;box-shadow:var(--sh3);overflow:hidden;animation:modalUp .28s cubic-bezier(.34,1.2,.64,1);max-height:calc(100dvh - 30px);display:flex;flex-direction:column}
.modal.dark{background:#0c1220;border-color:rgba(255,255,255,.1)}
.mh{padding:16px 20px 13px;border-bottom:1px solid var(--surf3);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:10px}
.modal.dark .mh{border-color:rgba(255,255,255,.08)}
.mh-title{font-size:15.5px;font-weight:800;color:var(--t1)}
.modal.dark .mh-title{color:#fff}
.mh-close{width:27px;height:27px;border-radius:8px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center;transition:.15s;font-size:12.5px;flex-shrink:0}
.mh-close:hover{transform:rotate(90deg);color:var(--t1)}
.mb{padding:18px 20px;overflow-y:auto;flex:1}
.mf{padding:13px 20px;border-top:1px solid var(--surf3);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0;flex-wrap:wrap}
.modal.dark .mf{border-color:rgba(255,255,255,.08)}

/* ─── JOIN CONFIRM MODAL (like Google Meet) ─── */
.join-confirm{max-width:440px}
.jc-preview{width:100%;aspect-ratio:4/3;background:#0d1428;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;margin-bottom:18px}
.jc-avatar{width:80px;height:80px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:#fff;box-shadow:0 8px 24px rgba(99,102,241,.4);margin-bottom:14px}
.jc-name{font-size:16px;font-weight:800;color:#fff;margin-bottom:4px}
.jc-meta{font-size:12px;color:rgba(255,255,255,.5)}
.jc-room-info{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.18);margin-bottom:14px}
.jc-room-ico{font-size:22px;flex-shrink:0}
.jc-room-title{font-size:13.5px;font-weight:800;color:var(--t1);margin-bottom:2px}
.jc-room-sub{font-size:11.5px;color:var(--t2)}
.jc-mic-cam{display:flex;gap:8px;margin-bottom:16px}
.jc-device-btn{flex:1;padding:10px 12px;border-radius:12px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;font-size:12.5px;font-weight:700;transition:.2s;display:flex;align-items:center;justify-content:center;gap:7px;color:var(--t2)}
.jc-device-btn.on{background:rgba(16,185,129,.07);border-color:rgba(16,185,129,.3);color:var(--em)}
.jc-device-btn.off{background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.25);color:var(--red)}
.jc-participants{font-size:12px;color:var(--t3);text-align:center;margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:5px}
.jc-av-stack{display:flex}
.jc-av-sm{width:22px;height:22px;border-radius:50%;border:2px solid #fff;margin-left:-6px;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;color:#fff}

/* ─── Loading overlay ─── */
.loading-overlay{position:fixed;inset:0;background:rgba(15,23,42,.72);backdrop-filter:blur(16px);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;animation:fadeIn .2s ease}
.lo-spinner{width:56px;height:56px;position:relative}
.lo-ring1{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(99,102,241,.2);border-top-color:var(--ind);animation:spin .9s linear infinite}
.lo-ring2{position:absolute;inset:6px;border-radius:50%;border:3px solid rgba(139,92,246,.15);border-bottom-color:var(--vio);animation:spinReverse 1.2s linear infinite}
.lo-text{font-size:15px;font-weight:700;color:#fff;text-align:center}
.lo-sub{font-size:12.5px;color:rgba(255,255,255,.5);text-align:center}
.lo-progress{width:200px;height:4px;background:rgba(255,255,255,.1);border-radius:4px;overflow:hidden;margin-top:4px}
.lo-progress-fill{height:100%;background:var(--grad);border-radius:4px;transition:width .4s ease}

/* ── LANDING ── */
.land-shell{height:100%;display:grid;grid-template-columns:1fr 1fr;overflow:hidden}
.land-left{background:#060c1a;display:flex;flex-direction:column;overflow:hidden;border-right:1px solid rgba(255,255,255,.07);position:relative}
.land-left-inner{overflow-y:auto;flex:1;padding:clamp(20px,3.5vw,52px);display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2}
.land-orbs{position:absolute;inset:0;pointer-events:none}
.orb{position:absolute;border-radius:50%}
.orb1{width:380px;height:380px;background:radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%);top:-90px;left:-80px;animation:orbFloat 9s ease-in-out infinite}
.orb2{width:260px;height:260px;background:radial-gradient(circle,rgba(139,92,246,.13) 0%,transparent 70%);bottom:-50px;right:-40px;animation:orbFloat 11s ease-in-out infinite reverse}
.orb3{width:180px;height:180px;background:radial-gradient(circle,rgba(236,72,153,.1) 0%,transparent 70%);top:42%;right:10%;animation:orbPulse 7s ease-in-out infinite 2s}
.land-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(99,102,241,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.06) 1px,transparent 1px);background-size:38px 38px;pointer-events:none}
.land-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);font-size:10px;font-weight:800;color:var(--ind3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;animation:fadeUp .5s ease .1s both}
.land-tag-dot{width:5px;height:5px;border-radius:50%;background:var(--em);animation:pulse 2s infinite}
.land-h1{font-size:clamp(20px,2.6vw,40px);font-weight:900;line-height:1.06;letter-spacing:-1px;color:#fff;margin-bottom:12px;animation:fadeUp .5s ease .18s both}
.land-h1 .gt{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.land-p{font-size:12.5px;color:rgba(255,255,255,.42);line-height:1.85;max-width:360px;margin-bottom:22px;animation:fadeUp .5s ease .26s both}
.land-scenes{display:flex;flex-direction:column;gap:7px}
.land-scene{display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:13px;transition:all .3s cubic-bezier(.4,0,.2,1);animation:slideLeft .45s ease both;cursor:default}
.land-scene:hover{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.28);transform:translateX(7px)}
.land-scene-ico{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;transition:transform .3s}
.land-scene:hover .land-scene-ico{transform:scale(1.2) rotate(-6deg)}
.sc-label{font-size:12.5px;font-weight:700;color:#fff;margin-bottom:1px}
.sc-sub{font-size:10.5px;color:rgba(255,255,255,.38)}
.sc-badge{font-size:9px;font-weight:800;padding:2px 7px;border-radius:20px;color:#fff;margin-left:auto;flex-shrink:0;animation:badgeFloat 2s ease-in-out infinite}
.sc-badge.ai  {background:linear-gradient(90deg,var(--ind),var(--vio))}
.sc-badge.live{background:var(--red);animation:pulse 1.5s infinite}
.sc-badge.new {background:var(--em)}
.land-right{background:var(--surf);display:flex;overflow:hidden}
.land-right-inner{width:100%;overflow-y:auto;display:flex;align-items:center;justify-content:center;padding:clamp(20px,3.5vw,52px)}
.mode-wrap{width:100%;max-width:440px;animation:slideRight .5s ease both}
.mode-title{font-size:clamp(17px,2vw,24px);font-weight:900;letter-spacing:-.4px;margin-bottom:5px;color:var(--t1)}
.mode-sub{font-size:12.5px;color:var(--t2);margin-bottom:18px;line-height:1.65}
.mode-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:15px}
.mode-card{padding:15px 12px;border-radius:16px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;text-align:center;transition:all .26s cubic-bezier(.34,1.1,.64,1);position:relative;overflow:hidden}
.mode-card::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:16px 16px 0 0;opacity:0;transition:opacity .22s}
.mode-card.m-debate::after{background:var(--grad)}
.mode-card.m-meeting::after{background:var(--grad2)}
.mode-card.m-seminar::after{background:var(--grad3)}
.mode-card:hover,.mode-card:hover::after,.mode-card.sel::after{transform:translateY(-5px) scale(1.02);box-shadow:0 12px 30px rgba(99,102,241,.14);opacity:1}
.mode-card:hover{transform:translateY(-5px) scale(1.02)}
.mode-card.sel{border-color:var(--ind);background:rgba(99,102,241,.04);transform:translateY(-3px)}
.mode-card-ck{position:absolute;top:8px;right:8px;width:18px;height:18px;border-radius:50%;background:var(--ind);display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;opacity:0;transform:scale(0);transition:.2s}
.mode-card.sel .mode-card-ck{opacity:1;transform:scale(1)}
.mode-card-ico{font-size:24px;margin-bottom:8px;display:block;transition:transform .28s}
.mode-card:hover .mode-card-ico{transform:scale(1.18) rotate(-4deg)}
.mode-card-title{font-size:12px;font-weight:800;margin-bottom:3px;color:var(--t1)}
.mode-card-desc{font-size:10px;color:var(--t2);line-height:1.5}
.join-box{border:1.5px dashed rgba(99,102,241,.2);border-radius:14px;padding:12px 14px;background:rgba(99,102,241,.025);margin-top:10px;transition:border-color .2s}
.join-box:hover{border-color:rgba(99,102,241,.38)}
.join-box-title{font-size:10px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}

/* ── SETUP ── */
.setup-shell{height:100%;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;animation:fadeIn .3s ease}
.setup-left{background:#060c1a;overflow:hidden;position:relative;display:flex;flex-direction:column}
.setup-left-inner{overflow-y:auto;flex:1;padding:clamp(18px,3vw,46px);display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2}
.setup-right{background:var(--surf);overflow:hidden;display:flex;flex-direction:column}
.setup-right-inner-scroll{overflow-y:auto;flex:1;padding:clamp(16px,2.8vw,40px)}
.setup-right-inner{max-width:470px;width:100%;margin:auto}
.setup-back{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--t3);background:none;border:none;cursor:pointer;padding:0 0 16px;transition:.2s}
.setup-back:hover{color:var(--ind);transform:translateX(-4px)}
.setup-title{font-size:19px;font-weight:900;letter-spacing:-.3px;margin-bottom:3px;color:var(--t1)}
.setup-sub{font-size:12px;color:var(--t2);margin-bottom:13px;line-height:1.6}
.scenario-art{display:flex;flex-direction:column;gap:7px}
.scenario-card{display:flex;align-items:center;gap:11px;padding:10px 13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;animation:slideLeft .4s ease both;transition:all .28s;cursor:default}
.scenario-card:hover{background:rgba(99,102,241,.09);border-color:rgba(99,102,241,.28);transform:translateX(6px)}
.sc-icon{font-size:18px;flex-shrink:0;transition:transform .28s}
.scenario-card:hover .sc-icon{transform:scale(1.25) rotate(-6deg)}
.submode-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.submode-card{padding:11px 12px;border-radius:11px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;transition:all .22s cubic-bezier(.34,1.1,.64,1);display:flex;align-items:flex-start;gap:8px}
.submode-card:hover{border-color:rgba(99,102,241,.32);background:rgba(99,102,241,.03);transform:translateY(-2px)}
.submode-card.sel{border-color:var(--ind);background:rgba(99,102,241,.06)}
.submode-ico{font-size:18px;flex-shrink:0;transition:transform .25s}
.submode-card:hover .submode-ico{transform:scale(1.22) rotate(-5deg)}
.submode-title{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:2px}
.submode-desc{font-size:10.5px;color:var(--t2);line-height:1.5}

/* ── Mic preview ── */
.mic-preview{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;background:rgba(99,102,241,.05);border:1.5px solid rgba(99,102,241,.14);margin-bottom:11px}
.mic-av{width:46px;height:46px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;color:#fff;box-shadow:0 6px 18px rgba(99,102,241,.32);flex-shrink:0;transition:box-shadow .3s}
.mic-av.spk{animation:speakRing 1.2s ease-in-out infinite}
.mic-info{flex:1}
.mic-name{font-size:14px;font-weight:800;color:var(--t1);margin-bottom:1px}
.mic-sub{font-size:11px;color:var(--t2)}
.perm-row{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}
.perm-btn{display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:8px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:11.5px;font-weight:700;transition:.18s}
.perm-btn:hover:not(:disabled){border-color:rgba(99,102,241,.3);color:var(--t1)}
.perm-btn.granted{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.32);color:var(--em)}
.perm-btn.denied {background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.28);color:var(--red)}
.perm-btn.req    {background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.28);color:var(--ind)}
.perm-btn:disabled{opacity:.42;cursor:not-allowed}
.perm-warn{font-size:11.5px;color:#fca5a5;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);border-radius:9px;padding:8px 11px;margin-top:7px;line-height:1.6}

/* ── Cam preview ── */
.cam-wrap{width:100%;aspect-ratio:16/9;border-radius:12px;background:var(--surf3);border:1.5px solid var(--bdr);overflow:hidden;position:relative;margin-bottom:10px}
.cam-wrap video{width:100%;height:100%;object-fit:cover}
.cam-off{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;background:linear-gradient(135deg,rgba(99,102,241,.05),rgba(139,92,246,.03))}
.cam-av{width:52px;height:52px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;box-shadow:0 8px 22px rgba(99,102,241,.36);animation:scaleIn .4s ease}
.cam-nametag{position:absolute;bottom:9px;left:9px;background:rgba(0,0,0,.68);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:3px 8px;font-size:10.5px;font-weight:700;color:#fff}
.cam-perm-bar{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
.cam-perm-btn{flex:1;min-width:88px;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 10px;border-radius:9px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;font-size:11.5px;font-weight:700;transition:.18s}
.cam-perm-btn.granted{background:rgba(16,185,129,.07);border-color:rgba(16,185,129,.3);color:var(--em)}
.cam-perm-btn.denied {background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.25);color:var(--red)}
.cam-perm-btn.req    {background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.25);color:var(--ind)}

/* ── ROOM ── */
.room-root{height:calc(100dvh - 60px);display:flex;flex-direction:column;overflow:hidden;background:#060c1a;animation:fadeIn .35s ease}
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
.pill-share{background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.22);color:var(--sky)}
.pill-turn-you{background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.28);color:#6ee7b7}
.pill-turn-ai {background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.28);color:#c4b5fd;animation:turnBlink 1.2s infinite}
.rbar-end{padding:4px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);cursor:pointer;font-size:11px;font-weight:700;transition:.15s;flex-shrink:0;font-family:var(--font)}
.rbar-end:hover{background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.35);color:var(--red)}

/* ── Video grid — PERFECT EQUAL SPLIT ── */
.room-body{flex:1;display:flex;min-height:0;overflow:hidden}
.grid-area{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.vid-grid{flex:1;display:grid;gap:4px;padding:7px;min-height:0;overflow:hidden}
.vg-1{grid-template-columns:1fr}
.vg-2{grid-template-columns:1fr 1fr}
.vg-3{grid-template-columns:1fr 1fr 1fr}
.vg-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.vg-5{grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr}
.vg-6{grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr}
.vg-7,.vg-8{grid-template-columns:repeat(4,1fr);grid-template-rows:1fr 1fr}

/* Tile */
.tile{border-radius:12px;background:#0d1428;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;transition:box-shadow .28s;min-height:0;animation:tileIn .32s ease}
.tile.spk{box-shadow:0 0 0 2.5px var(--em),0 0 24px rgba(16,185,129,.2);animation:speakRing 1.2s ease-in-out infinite,tileIn .32s ease}
.tile video{width:100%;height:100%;object-fit:cover;display:block}
.tile-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;width:clamp(44px,6vw,78px);height:clamp(44px,6vw,78px);font-size:clamp(17px,2.4vw,30px)}
.tile-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.83));padding:20px 9px 8px;display:flex;align-items:flex-end;justify-content:space-between;gap:4px}
.tile-name{font-size:clamp(9.5px,1.1vw,12px);font-weight:700;color:#fff;display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.t-badge{font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px;color:#fff;white-space:nowrap}
.t-host{background:var(--amb);color:#000}.t-ai{background:var(--grad)}.t-you{background:rgba(255,255,255,.17)}.t-med{background:rgba(56,189,248,.82);color:#000}
.tile-muted{width:20px;height:20px;border-radius:50%;background:rgba(239,68,68,.85);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9.5px}
.tile-hand{position:absolute;top:8px;left:8px;background:rgba(245,166,35,.92);border-radius:7px;padding:3px 8px;font-size:11px;font-weight:800;color:#000;animation:scaleIn .3s ease}
.tile-react{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:42px;animation:rPop 2.2s forwards;pointer-events:none;z-index:5}
.tile-wave{position:absolute;top:9px;right:9px;display:flex;align-items:center;gap:2px;height:22px}
.tile-wave-bar{width:2.5px;border-radius:2px;animation:waveBar .65s ease-in-out infinite}
.tile-turn{position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(16,185,129,.85);backdrop-filter:blur(6px);border:1px solid rgba(16,185,129,.4);border-radius:100px;padding:3px 10px;font-size:10px;font-weight:800;color:#fff;white-space:nowrap;animation:turnBlink 1.2s infinite}
.ai-typing-wrap{position:absolute;top:9px;right:9px;display:flex;gap:3px;align-items:center}
.ai-dot{width:5px;height:5px;border-radius:50%;background:var(--vio);animation:dotPulse .9s ease-in-out infinite}
.tile-nudge{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(245,158,11,.92);backdrop-filter:blur(8px);border-radius:12px;padding:9px 15px;font-size:12.5px;font-weight:700;color:#000;text-align:center;animation:scaleIn .3s ease;white-space:nowrap;border:1px solid rgba(245,158,11,.4);max-width:80%}

/* ── Controls ── */
.ctrl-bar{min-height:62px;padding:7px 11px;background:rgba(6,12,26,.98);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:5px;flex-wrap:wrap}
.cg{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.cbtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 7px;border-radius:9px;border:1px solid rgba(255,255,255,.09);cursor:pointer;background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);font-size:9px;font-weight:700;transition:all .18s;min-width:42px;font-family:var(--font)}
.cbtn-ico{font-size:14px;transition:transform .2s}
.cbtn:hover{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2);transform:translateY(-2px)}
.cbtn:hover .cbtn-ico{transform:scale(1.2)}
.cbtn.on {background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.36);color:var(--em)}
.cbtn.off{background:rgba(239,68,68,.09);border-color:rgba(239,68,68,.3);color:var(--red)}
.cbtn.hi {background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.36);color:var(--ind3)}
.cbtn.amb{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:var(--amb)}
.cbtn.sky{background:rgba(56,189,248,.1);border-color:rgba(56,189,248,.3);color:var(--sky)}
.cbtn.em {background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.28);color:var(--em)}
.cbtn.rec{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.46);color:var(--red);animation:recBlink 1.5s infinite}
.end-btn{padding:8px 16px;border-radius:9px;border:none;cursor:pointer;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:12px;font-weight:800;font-family:var(--font);box-shadow:0 3px 12px rgba(239,68,68,.28);transition:.2s;white-space:nowrap}
.end-btn:hover{transform:translateY(-2px);box-shadow:0 7px 20px rgba(239,68,68,.42)}
.react-pop{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#141e36;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 10px;display:flex;gap:6px;box-shadow:var(--sh2);z-index:200;animation:scaleIn .2s ease}
.react-emoji{font-size:20px;cursor:pointer;padding:4px;border-radius:7px;border:none;background:none;transition:.15s}
.react-emoji:hover{transform:scale(1.45)}
.rec-overlay{position:fixed;top:63px;right:12px;background:rgba(239,68,68,.92);border-radius:8px;padding:4px 11px;display:flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:#fff;z-index:200;animation:recBlink 1.5s infinite}
.share-overlay{position:fixed;top:63px;left:12px;background:rgba(56,189,248,.88);border-radius:8px;padding:4px 11px;display:flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:#000;z-index:200}

/* ── Side panel ── */
.side-panel{width:280px;min-width:280px;background:rgba(6,12,26,.98);border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden}
.panel-tabs-dark{display:flex;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.ptab{flex:1;padding:10px 4px;background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,.3);font-size:9px;font-weight:700;cursor:pointer;transition:.18s;display:flex;flex-direction:column;align-items:center;gap:3px;font-family:var(--font)}
.ptab:hover{color:rgba(255,255,255,.65)}
.ptab.active{color:var(--ind3);border-bottom-color:var(--ind)}
.ptab-cls{flex:0;padding:10px 8px;color:rgba(255,255,255,.22)}
.ptab-cls:hover{color:#fff}
.pscroll{flex:1;overflow-y:auto;min-height:0}
.pscroll::-webkit-scrollbar{width:3px}
.p-list{padding:8px;display:flex;flex-direction:column;gap:5px}
.p-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:.18s}
.p-row:hover{border-color:rgba(99,102,241,.28);background:rgba(99,102,241,.07)}
.p-row.spk{border-color:rgba(16,185,129,.4);background:rgba(16,185,129,.06)}
.p-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:800;flex-shrink:0}
.p-info{flex:1;min-width:0}
.p-name{font-size:12px;font-weight:700;color:#fff;display:flex;align-items:center;gap:3px}
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

/* ── Analysis modal ── */
.analysis-bg{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(14px);z-index:800;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .22s ease}
.analysis-box{background:#0c1220;border:1px solid rgba(99,102,241,.24);border-radius:var(--r);width:100%;max-width:650px;max-height:88dvh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh3);animation:modalUp .3s ease}
.analysis-head{padding:16px 20px 13px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;display:flex;align-items:center;justify-content:space-between}
.analysis-title{font-size:15.5px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px}
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
.str-list{display:flex;flex-direction:column;gap:5px}
.str-item{display:flex;align-items:flex-start;gap:8px;padding:9px 11px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}
.str-ico{font-size:14px;flex-shrink:0;margin-top:1px}
.str-text{font-size:11.5px;color:rgba(255,255,255,.6);line-height:1.6}
.str-text strong{color:#fff}
.pa-list{display:flex;flex-direction:column;gap:7px}
.pa-row{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px}
.pa-name-row{font-size:12.5px;font-weight:800;color:#fff;margin-bottom:5px;display:flex;align-items:center;gap:6px}
.verdict-box{padding:13px 15px;border-radius:12px;border:1.5px solid;text-align:center}
.verdict-win{font-size:21px;font-weight:900;margin-bottom:3px}
.verdict-lbl{font-size:11.5px;font-weight:700;opacity:.6}
.analysis-foot{padding:12px 20px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;display:flex;justify-content:flex-end;gap:8px}

/* ── Results ── */
.results-page{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:clamp(20px,4vw,52px);text-align:center;overflow-y:auto;background:radial-gradient(ellipse at 50% 25%,rgba(99,102,241,.07) 0%,transparent 65%);animation:fadeUp .45s ease}
.res-trophy{font-size:62px;margin-bottom:12px;animation:scaleIn .6s cubic-bezier(.34,1.56,.64,1) .2s both}
.res-title{font-size:clamp(20px,3.2vw,34px);font-weight:900;letter-spacing:-.6px;margin-bottom:6px;color:var(--t1)}
.res-sub{font-size:13px;color:var(--t2);max-width:340px;line-height:1.75;margin-bottom:18px}
.res-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;max-width:340px;margin-bottom:16px}
.res-stat{background:var(--surf);border:1px solid var(--bdr);border-radius:14px;padding:12px 10px;box-shadow:var(--sh);animation:fadeUp .4s ease both;text-align:center;transition:all .25s}
.res-stat:hover{transform:translateY(-4px);box-shadow:0 10px 28px rgba(99,102,241,.12)}
.res-stat-ico{font-size:19px;margin-bottom:4px}
.res-stat-val{font-size:clamp(16px,2.2vw,24px);font-weight:900;color:var(--ind)}
.res-stat-lbl{font-size:10px;color:var(--t3);margin-top:2px}
.res-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:center}

/* ── Responsive ── */
@media(max-width:1100px){.side-panel{width:260px;min-width:260px}}
@media(max-width:960px){
  .land-shell,.setup-shell{grid-template-columns:1fr;overflow-y:auto;height:auto;min-height:100%}
  .land-left,.setup-left{min-height:280px}
  .land-scenes,.scenario-art{display:none}
  .land-left-inner,.setup-left-inner{justify-content:flex-start;padding:clamp(16px,4vw,30px)}
  .land-right-inner,.setup-right-inner-scroll{padding:clamp(14px,4vw,30px)}
}
@media(max-width:768px){
  .mode-cards{grid-template-columns:1fr 1fr}
  .submode-grid{grid-template-columns:1fr}
  .ctrl-bar{padding:6px 8px}
  .cg{gap:2px;justify-content:center}
  .cbtn{padding:5px 6px;min-width:38px;font-size:8.5px}
  .side-panel{display:none}
  .side-panel.mob-show{display:flex;position:fixed;inset:0;z-index:300;width:100vw;min-width:unset;border-left:none}
  .rbar-topic{display:none}
  .fi-row{grid-template-columns:1fr}
  .analysis-bg{align-items:flex-end;padding:0}
  .analysis-box{border-radius:16px 16px 0 0;max-height:92dvh}
  .overlay{align-items:flex-end;padding:0}
  .modal{border-radius:16px 16px 0 0;max-height:90dvh}
  .vg-3{grid-template-columns:1fr 1fr;grid-template-rows:auto auto}
  .vg-5,.vg-6{grid-template-columns:1fr 1fr}
}
@media(max-width:640px){
  .land-left-inner,.setup-left-inner{padding:14px}
  .land-right-inner,.setup-right-inner-scroll{padding:13px}
  .mode-cards{grid-template-columns:1fr 1fr}
  .res-stats{grid-template-columns:repeat(3,1fr)}
  .res-actions{flex-direction:column;align-items:stretch}
  .jc-mic-cam{flex-direction:column}
  .vg-2{grid-template-columns:1fr;grid-template-rows:1fr 1fr}
}
@media(max-width:440px){
  .mode-cards{grid-template-columns:1fr}
  .cbtn span:last-child{display:none}
  .cbtn{min-width:32px}
}
`;