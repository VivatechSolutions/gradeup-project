import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast";
import { useTheme } from "../hooks/use-theme";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Brain, Target, Sparkles, Users, Eye, EyeOff,
  Mail, Lock, Shield, RefreshCw, Loader2, AlertTriangle,
  ChevronRight, ChevronLeft, Check,
} from "lucide-react";
import { FaGoogle, FaMicrosoft } from "react-icons/fa";

// ─── CSS — full dark/light theme via [data-theme="dark"] on <html> ────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

:root {
  --ap-bg:          #f8fafc;
  --ap-bg2:         #ffffff;
  --ap-bg3:         #f1f5f9;
  --ap-card:        #ffffff;
  --ap-card-head:   #ffffff;
  --ap-border:      rgba(0,0,0,0.07);
  --ap-border2:     rgba(0,0,0,0.06);
  --ap-shadow:      0 4px 24px rgba(0,0,0,.07);
  --ap-text:        #0f172a;
  --ap-text2:       #374151;
  --ap-text3:       #64748b;
  --ap-text4:       #94a3b8;
  --ap-input-bg:    #ffffff;
  --ap-input-bdr:   rgba(0,0,0,0.08);
  --ap-select-bg:   #ffffff;
  --ap-tab-bg:      #ffffff;
  --ap-tab-bdr:     rgba(0,0,0,0.06);
  --ap-tab-shadow:  0 2px 8px rgba(0,0,0,.04);
  --ap-oauth-bg:    #ffffff;
  --ap-oauth-bdr:   rgba(0,0,0,0.08);
  --ap-oauth-text:  #374151;
  --ap-divider:     rgba(0,0,0,0.07);
  --ap-captcha-bg:  rgba(248,250,252,0.8);
  --ap-captcha-bdr: rgba(0,0,0,0.07);
  --ap-captcha-img: #ffffff;
  --ap-chip-bg:     #ffffff;
  --ap-chip-bdr:    rgba(0,0,0,0.08);
  --ap-chip-text:   #64748b;
  --ap-role-bg:     #ffffff;
  --ap-role-bdr:    rgba(0,0,0,0.07);
  --ap-step-pend:   #f1f5f9;
  --ap-step-bdr:    rgba(0,0,0,0.08);
  --ap-step-line:   #f1f5f9;
  --ap-summary-bg:  rgba(99,102,241,0.04);
  --ap-summary-bdr: rgba(99,102,241,0.15);
  --ap-summary-key: #94a3b8;
  --ap-summary-val: #0f172a;
  --ap-footer-text: #94a3b8;
  --ap-alert-bg:    rgba(239,68,68,0.05);
  --ap-alert-bdr:   rgba(239,68,68,0.2);
  --ap-success-ttl: #0f172a;
  --ap-mob-ttl:     #0f172a;
  --ap-capt-ref-bg: #ffffff;
  --ap-capt-ref-bdr:rgba(0,0,0,0.08);
}

[data-theme="dark"] {
  --ap-bg:          #0b1120;
  --ap-bg2:         #141f35;
  --ap-bg3:         #1a2540;
  --ap-card:        #141f35;
  --ap-card-head:   #141f35;
  --ap-border:      rgba(255,255,255,0.08);
  --ap-border2:     rgba(255,255,255,0.06);
  --ap-shadow:      0 4px 24px rgba(0,0,0,.35);
  --ap-text:        #f1f5f9;
  --ap-text2:       #cbd5e1;
  --ap-text3:       #94a3b8;
  --ap-text4:       #64748b;
  --ap-input-bg:    #0b1120;
  --ap-input-bdr:   rgba(255,255,255,0.10);
  --ap-select-bg:   #0b1120;
  --ap-tab-bg:      #1a2540;
  --ap-tab-bdr:     rgba(255,255,255,0.07);
  --ap-tab-shadow:  0 2px 8px rgba(0,0,0,.25);
  --ap-oauth-bg:    #0b1120;
  --ap-oauth-bdr:   rgba(255,255,255,0.10);
  --ap-oauth-text:  #94a3b8;
  --ap-divider:     rgba(255,255,255,0.07);
  --ap-captcha-bg:  rgba(255,255,255,0.03);
  --ap-captcha-bdr: rgba(255,255,255,0.07);
  --ap-captcha-img: #0b1120;
  --ap-chip-bg:     #0b1120;
  --ap-chip-bdr:    rgba(255,255,255,0.10);
  --ap-chip-text:   #94a3b8;
  --ap-role-bg:     #0b1120;
  --ap-role-bdr:    rgba(255,255,255,0.08);
  --ap-step-pend:   #1e3a5f;
  --ap-step-bdr:    rgba(255,255,255,0.10);
  --ap-step-line:   #1e3a5f;
  --ap-summary-bg:  rgba(99,102,241,0.10);
  --ap-summary-bdr: rgba(99,102,241,0.25);
  --ap-summary-key: #64748b;
  --ap-summary-val: #f1f5f9;
  --ap-footer-text: #64748b;
  --ap-alert-bg:    rgba(239,68,68,0.10);
  --ap-alert-bdr:   rgba(239,68,68,0.28);
  --ap-success-ttl: #f1f5f9;
  --ap-mob-ttl:     #f1f5f9;
  --ap-capt-ref-bg: #0b1120;
  --ap-capt-ref-bdr:rgba(255,255,255,0.10);
}

.ap-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  min-height: 100vh; display: flex;
  background: var(--ap-bg);
  color: var(--ap-text);
  transition: background .3s ease, color .3s ease;
}

.ap-hero {
  flex:1; background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  display:flex; align-items:center; justify-content:center;
  padding:48px 40px; position:relative; overflow:hidden;
}
.ap-hero::before { content:''; position:absolute; top:-100px; right:-100px; width:360px; height:360px; border-radius:50%; background:rgba(255,255,255,.08); pointer-events:none; }
.ap-hero::after  { content:''; position:absolute; bottom:-80px; left:-60px; width:260px; height:260px; border-radius:50%; background:rgba(255,255,255,.06); pointer-events:none; }
.ap-hero-blob    { position:absolute; top:40%; left:10%; width:120px; height:120px; border-radius:50%; background:rgba(255,255,255,.05); }
.ap-hero-inner   { position:relative; z-index:1; max-width:420px; width:100%; }
.ap-hero-logo    { display:inline-flex; align-items:center; gap:12px; margin-bottom:36px; }
.ap-hero-logo-icon { width:52px; height:52px; border-radius:16px; background:rgba(255,255,255,.2); border:1.5px solid rgba(255,255,255,.35); display:flex; align-items:center; justify-content:center; }
.ap-hero-logo-text { font-size:26px; font-weight:800; color:#fff; letter-spacing:-.3px; }
.ap-hero-heading { font-size:clamp(26px,3.5vw,38px); font-weight:800; color:#fff; line-height:1.2; letter-spacing:-.5px; margin-bottom:14px; }
.ap-hero-sub     { font-size:15px; color:rgba(255,255,255,.72); line-height:1.7; margin-bottom:36px; }
.ap-hero-features { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.ap-feat { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.18); border-radius:16px; padding:16px 14px; backdrop-filter:blur(8px); transition:background .2s; }
.ap-feat:hover { background:rgba(255,255,255,.18); }
.ap-feat-icon  { width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; margin-bottom:10px; }
.ap-feat-title { font-size:13px; font-weight:700; color:#fff; margin-bottom:3px; }
.ap-feat-desc  { font-size:11.5px; color:rgba(255,255,255,.65); line-height:1.5; }
.ap-hero-stats { display:flex; gap:20px; margin-top:32px; }
.ap-stat   { text-align:center; }
.ap-stat-n { font-size:24px; font-weight:800; color:#fff; line-height:1; }
.ap-stat-l { font-size:11px; color:rgba(255,255,255,.6); margin-top:2px; }

.ap-form-panel {
  flex:1; display:flex; align-items:center; justify-content:center;
  padding:32px 28px; overflow-y:auto;
  background: var(--ap-bg);
  transition: background .3s ease;
}
.ap-form-wrap { width:100%; max-width:460px; }

.ap-tabs {
  display:flex; gap:4px;
  background: var(--ap-tab-bg);
  border-radius:16px; padding:5px;
  border:1px solid var(--ap-tab-bdr);
  box-shadow: var(--ap-tab-shadow);
  margin-bottom:24px;
  transition: background .3s ease, border-color .3s ease;
}
.ap-tab {
  flex:1; padding:11px 20px; border-radius:12px; border:none;
  background:transparent; font-family:inherit; font-size:13.5px;
  font-weight:600; color: var(--ap-text3); cursor:pointer; transition:all .2s;
}
.ap-tab:hover { background:rgba(99,102,241,.08); color:#6366f1; }
.ap-tab.on {
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  box-shadow:0 4px 12px rgba(99,102,241,.32);
}

.ap-card {
  background: var(--ap-card);
  border-radius:24px;
  border:1px solid var(--ap-border2);
  box-shadow: var(--ap-shadow);
  overflow:hidden;
  animation:cardIn .4s cubic-bezier(.34,1.56,.64,1) both;
  transition: background .3s ease, border-color .3s ease, box-shadow .3s ease;
}
@keyframes cardIn { from{opacity:0;transform:translateY(16px) scale(.98)} to{opacity:1;transform:none} }
.ap-card-head {
  padding:26px 28px 20px;
  border-bottom:1px solid var(--ap-border2);
  background: var(--ap-card-head);
  transition: background .3s ease, border-color .3s ease;
}
.ap-card-title { font-size:20px; font-weight:800; color: var(--ap-text); margin-bottom:4px; }
.ap-card-sub   { font-size:13px; color: var(--ap-text3); }
.ap-card-body  { padding:24px 28px; }

.ap-oauth { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
.ap-oauth-btn {
  display:flex; align-items:center; justify-content:center; gap:8px;
  padding:11px 16px; border-radius:12px;
  border:1.5px solid var(--ap-oauth-bdr);
  background: var(--ap-oauth-bg);
  font-family:inherit; font-size:13px; font-weight:600;
  color: var(--ap-oauth-text);
  cursor:pointer; transition:all .18s;
}
.ap-oauth-btn:hover { border-color:#6366f1; background:rgba(99,102,241,.06); color:#6366f1; }
.ap-oauth-btn:disabled { opacity:.5; cursor:not-allowed; }

.ap-divider { display:flex; align-items:center; gap:12px; margin:18px 0; }
.ap-divider-line { flex:1; height:1px; background: var(--ap-divider); }
.ap-divider-text { font-size:11.5px; font-weight:600; color: var(--ap-text4); text-transform:uppercase; letter-spacing:.06em; }

.ap-field       { margin-bottom:14px; }
.ap-field-label { font-size:12.5px; font-weight:700; color: var(--ap-text2); margin-bottom:6px; display:block; }
.ap-field-row   { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.ap-input-wrap  { position:relative; }
.ap-input-icon  { position:absolute; left:13px; top:50%; transform:translateY(-50%); color: var(--ap-text4); display:flex; pointer-events:none; }
.ap-input {
  width:100%; padding:11px 14px; border-radius:12px;
  border:1.5px solid var(--ap-input-bdr);
  background: var(--ap-input-bg);
  font-family:inherit; font-size:13.5px;
  color: var(--ap-text);
  transition: border-color .18s, box-shadow .18s, background .3s ease; outline:none;
}
.ap-input.with-icon { padding-left:40px; }
.ap-input.with-eye  { padding-right:40px; }
.ap-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.ap-input.is-error { border-color:#ef4444; }
.ap-input.is-error:focus { box-shadow:0 0 0 3px rgba(239,68,68,.12); }
.ap-input::placeholder { color: var(--ap-text4); }
.ap-input-eye {
  position:absolute; right:12px; top:50%; transform:translateY(-50%);
  background:none; border:none; cursor:pointer; color: var(--ap-text4); padding:2px; display:flex;
}
.ap-input-eye:hover { color:#6366f1; }
.ap-field-error { font-size:11.5px; color:#ef4444; margin-top:4px; display:flex; align-items:center; gap:4px; }
.ap-select {
  width:100%; padding:11px 36px 11px 14px; border-radius:12px;
  border:1.5px solid var(--ap-input-bdr);
  background: var(--ap-select-bg);
  font-family:inherit; font-size:13.5px;
  color: var(--ap-text);
  transition: border-color .18s, background .3s ease; outline:none;
  appearance:none; cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 14px center;
}
.ap-select:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }

.ap-steps { display:flex; align-items:center; gap:0; margin-bottom:24px; }
.ap-step  { display:flex; align-items:center; flex:1; }
.ap-step-circle {
  width:32px; height:32px; border-radius:50%; display:flex; align-items:center;
  justify-content:center; font-size:12px; font-weight:800; flex-shrink:0; transition:all .3s;
}
.ap-step-circle.done {
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  box-shadow:0 3px 10px rgba(99,102,241,.35);
}
.ap-step-circle.active {
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  box-shadow:0 3px 10px rgba(99,102,241,.35);
  outline:3px solid rgba(99,102,241,.2); outline-offset:2px;
}
.ap-step-circle.pending {
  background: var(--ap-step-pend); color: var(--ap-text4);
  border:1.5px solid var(--ap-step-bdr);
}
.ap-step-label { font-size:10.5px; font-weight:700; margin-top:5px; text-align:center; white-space:nowrap; }
.ap-step-label.done,.ap-step-label.active { color:#6366f1; }
.ap-step-label.pending { color: var(--ap-text4); }
.ap-step-inner { display:flex; flex-direction:column; align-items:center; gap:0; }
.ap-step-line  { flex:1; height:2px; background: var(--ap-step-line); margin:0 6px; margin-bottom:18px; transition:background .3s; }
.ap-step-line.filled { background:linear-gradient(90deg,#6366f1,#8b5cf6); }

.ap-role-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
.ap-role-card {
  border-radius:16px; border:2px solid var(--ap-role-bdr);
  padding:18px 14px; text-align:center; cursor:pointer;
  transition:all .2s;
  background: var(--ap-role-bg);
  position:relative;
}
.ap-role-card:hover { border-color:#a5b4fc; background:rgba(99,102,241,.05); }
.ap-role-card.on    { border-color:#6366f1; background:rgba(99,102,241,.08); }
.ap-role-icon  { font-size:32px; display:block; margin-bottom:10px; }
.ap-role-name  { font-size:14px; font-weight:700; color: var(--ap-text); margin-bottom:3px; }
.ap-role-desc  { font-size:11.5px; color: var(--ap-text4); line-height:1.4; }
.ap-role-check {
  position:absolute; top:10px; right:10px; width:20px; height:20px; border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex; align-items:center; justify-content:center;
}

.ap-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
.ap-chip {
  padding:8px 16px; border-radius:20px;
  border:1.5px solid var(--ap-chip-bdr);
  background: var(--ap-chip-bg);
  font-family:inherit; font-size:13px; font-weight:600;
  color: var(--ap-chip-text);
  cursor:pointer; transition:all .18s;
}
.ap-chip:hover { border-color:#a5b4fc; color:#6366f1; background:rgba(99,102,241,.06); }
.ap-chip.on {
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  border-color:transparent; box-shadow:0 3px 10px rgba(99,102,241,.3);
}

.ap-btn {
  display:flex; align-items:center; justify-content:center; gap:8px; width:100%;
  padding:13px 24px; border-radius:14px; border:none;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer;
  transition:all .2s; box-shadow:0 4px 16px rgba(99,102,241,.32); margin-top:6px;
}
.ap-btn:hover    { transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,.42); }
.ap-btn:active   { transform:translateY(0); }
.ap-btn:disabled { opacity:.6; cursor:not-allowed; transform:none; }
.ap-btn-outline  {
  background:transparent; color:#6366f1;
  border:1.5px solid #a5b4fc; box-shadow:none; margin-top:0;
}
.ap-btn-outline:hover { background:rgba(99,102,241,.08); box-shadow:none; }
[data-theme="dark"] .ap-btn-outline { border-color:rgba(99,102,241,.45); color:#a5b4fc; }
[data-theme="dark"] .ap-btn-outline:hover { background:rgba(99,102,241,.15); }

.ap-step-nav { display:flex; gap:10px; margin-top:20px; }
.ap-step-nav .ap-btn { flex:1; margin-top:0; }

.ap-captcha-box {
  border-radius:14px;
  border:1.5px solid var(--ap-captcha-bdr);
  background: var(--ap-captcha-bg);
  padding:16px; margin-bottom:14px;
  transition: background .3s ease, border-color .3s ease;
}
.ap-captcha-img {
  display:flex; justify-content:center; margin-bottom:12px;
  background: var(--ap-captcha-img);
  border-radius:10px; padding:8px;
  border:1px solid var(--ap-border);
  transition: background .3s ease;
}
.ap-captcha-row { display:flex; gap:8px; align-items:center; }
.ap-captcha-refresh {
  width:40px; height:40px; border-radius:10px;
  border:1.5px solid var(--ap-capt-ref-bdr);
  background: var(--ap-capt-ref-bg);
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition:all .18s; color: var(--ap-text3);
}
.ap-captcha-refresh:hover { border-color:#6366f1; color:#6366f1; }

.ap-alert {
  display:flex; align-items:flex-start; gap:10px; padding:12px 14px;
  border-radius:12px;
  border:1.5px solid var(--ap-alert-bdr);
  background: var(--ap-alert-bg);
  margin-bottom:14px;
  transition: background .3s ease, border-color .3s ease;
}
.ap-alert-text { font-size:12.5px; color:#dc2626; line-height:1.5; }
[data-theme="dark"] .ap-alert-text { color:#fca5a5; }

.ap-summary {
  border-radius:14px;
  border:1.5px solid var(--ap-summary-bdr);
  background: var(--ap-summary-bg);
  padding:14px 16px; margin-bottom:14px;
  transition: background .3s ease, border-color .3s ease;
}
.ap-summary-label { font-size:11.5px; font-weight:800; color:#6366f1; margin-bottom:8px; text-transform:uppercase; letter-spacing:.06em; }
.ap-summary-row   { display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:4px; }
.ap-summary-key   { color: var(--ap-summary-key); font-weight:500; }
.ap-summary-val   { color: var(--ap-summary-val); font-weight:600; }

.ap-footer { text-align:center; font-size:12px; color: var(--ap-footer-text); margin-top:16px; line-height:1.6; }
.ap-footer a { color:#6366f1; font-weight:600; text-decoration:none; }
.ap-footer a:hover { text-decoration:underline; }
[data-theme="dark"] .ap-footer a { color:#a5b4fc; }

.ap-mobile-logo { display:none; align-items:center; justify-content:center; gap:10px; margin-bottom:20px; }
.ap-mobile-logo-icon {
  width:44px; height:44px; border-radius:14px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex; align-items:center; justify-content:center;
}
.ap-mobile-logo-text { font-size:22px; font-weight:800; color: var(--ap-mob-ttl); }

@media(max-width:1024px) {
  .ap-hero { display:none; }
  .ap-form-panel { flex:1; }
  .ap-mobile-logo { display:flex; }
}
@media(max-width:600px) {
  .ap-form-panel { padding:20px 16px; }
  .ap-form-wrap  { max-width:100%; }
  .ap-card-body  { padding:20px 18px; }
  .ap-card-head  { padding:20px 18px 16px; }
  .ap-field-row  { grid-template-columns:1fr; }
  .ap-oauth      { grid-template-columns:1fr 1fr; }
  .ap-step-label { display:none; }
}
@media(max-width:380px) {
  .ap-form-panel { padding:16px 12px; }
  .ap-card-body  { padding:16px 14px; }
  .ap-role-grid  { grid-template-columns:1fr; }
  .ap-chip       { font-size:12px; padding:7px 13px; }
}
@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
`;

// ── Constants ─────────────────────────────────────────────────────────────────
const LOGIN_STEPS = [
  { id:1, label:"Role"        },
  { id:2, label:"Credentials" },
  { id:3, label:"Verify"      },
];
const REGISTER_STEPS = [
  { id:1, label:"Role"     },
  { id:2, label:"Profile"  },
  { id:3, label:"Details"  },
  { id:4, label:"Password" },
];
const BOARDS   = ["CBSE","ICSE","State Board","IB","Cambridge"];
const GRADES   = ["Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const SUBJECTS = ["Mathematics","Science","English","History","Geography","Computer Science","Physics","Chemistry","Biology"];

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current, steps }: { current:number; steps:typeof REGISTER_STEPS }) {
  return (
    <div className="ap-steps">
      {steps.map((s, i) => {
        const state = current > s.id ? "done" : current === s.id ? "active" : "pending";
        return (
          <div key={s.id} className="ap-step" style={{ flex: i < steps.length - 1 ? "1" : "0" }}>
            <div className="ap-step-inner">
              <div className={`ap-step-circle ${state}`}>
                {state === "done" ? <Check size={14}/> : s.id}
              </div>
              <div className={`ap-step-label ${state}`}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={`ap-step-line${state === "done" ? " filled" : ""}`}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AuthPage() {
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  // Theme
  const { isDark } = useTheme();

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<"login"|"register">("login");

  // ── Login state ──
  const [loginStep, setLoginStep]             = useState(1);
  const [loginRole, setLoginRole]             = useState<"student"|"teacher"|"">("");
  const [loginForm, setLoginForm]             = useState({ email:"", password:"", captchaAnswer:"" });
  const [showPw, setShowPw]                   = useState(false);
  const [captchaData, setCaptchaData]         = useState<{svg:string;sessionId:string}|null>(null);
  const [captchaLoading, setCaptchaLoading]   = useState(false);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [loginErrors, setLoginErrors]         = useState<Record<string,string>>({});

  // ── Register state ──
  const [step, setStep]               = useState(1);
  const [regRole, setRegRole]         = useState<"student"|"teacher">("student");
  const [regBoard, setRegBoard]       = useState("");
  const [regGrade, setRegGrade]       = useState("");
  const [regSubjects, setRegSubjects] = useState<string[]>([]);
  const [regForm, setRegForm]         = useState({
    firstName:"", lastName:"", username:"", email:"", password:"", confirmPassword:"",
  });
  const [showRegPw,   setShowRegPw]   = useState(false);
  const [showRegConf, setShowRegConf] = useState(false);
  const [regErrors,   setRegErrors]   = useState<Record<string,string>>({});

  // ── Handle login error (captcha trigger) ──
  // Single focused effect — only watches error state, no navigation
  useEffect(() => {
    if (loginMutation.isError && loginMutation.error) {
      const err = loginMutation.error as any;
      if (err?.requiresCaptcha) {
        setRequiresCaptcha(true);
        loadCaptcha();
        setLoginStep(3);
        setLoginErrors({ captcha: "Security verification required. Please complete the CAPTCHA below." });
      } else {
        setLoginErrors({ form: err?.message || "Invalid credentials. Please try again." });
      }
    }
  }, [loginMutation.isError, loginMutation.error]);

  // ── CAPTCHA loader ──
  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    await new Promise(r => setTimeout(r, 400));
    setCaptchaData({
      svg: `<svg width="150" height="50" viewBox="0 0 150 50" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="50" fill="#F3F4F6"/><text x="75" y="30" font-family="Arial" font-size="20" fill="#1F2937" text-anchor="middle" dominant-baseline="middle">GRADEUP</text><line x1="10" y1="15" x2="140" y2="35" stroke="#9CA3AF" stroke-width="1"/></svg>`,
      sessionId: "mock-session-123",
    });
    setCaptchaLoading(false);
  };

  // ── Login validation ──
  const validateLoginStep = (): boolean => {
    const errs: Record<string,string> = {};

    if (loginStep === 1) {
      if (!loginRole) errs.role = "Please select whether you are a student or teacher";
    } else if (loginStep === 2) {
      if (!loginForm.email.trim()) {
        errs.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(loginForm.email)) {
        errs.email = "Please enter a valid email address";
      }
      if (!loginForm.password) {
        errs.password = "Password is required";
      } else if (loginForm.password.length < 6) {
        errs.password = "Password must be at least 6 characters";
      }
    } else if (loginStep === 3 && requiresCaptcha) {
      if (!loginForm.captchaAnswer.trim()) errs.captcha = "Please complete the security verification";
    }

    setLoginErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLoginNext = () => {
    if (!validateLoginStep()) return;

    if (loginStep === 1) {
      setLoginStep(2);
    } else if (loginStep === 2) {
      // Fire mutation — navigation happens in onSuccess inside use-auth.tsx
      loginMutation.mutate({
        email: loginForm.email,
        password: loginForm.password,
        role: loginRole,
      });
    } else if (loginStep === 3 && requiresCaptcha) {
      loginMutation.mutate({
        email: loginForm.email,
        password: loginForm.password,
        role: loginRole,
        captchaAnswer: loginForm.captchaAnswer,
        captchaSessionId: captchaData?.sessionId,
      });
    }
  };

  const handleLoginBack = () => {
    if (loginStep > 1) {
      setLoginStep(s => s - 1);
      setLoginErrors({});
    }
  };

  const resetLoginForm = () => {
    setLoginStep(1);
    setLoginRole("");
    setLoginForm({ email:"", password:"", captchaAnswer:"" });
    setLoginErrors({});
    setRequiresCaptcha(false);
    setCaptchaData(null);
    setShowPw(false);
  };

  // ── Register validation ──
  const validateStep = (): boolean => {
    const errs: Record<string,string> = {};

    if (step === 2) {
      if (!regForm.firstName.trim()) errs.firstName = "First name is required";
      if (!regForm.lastName.trim())  errs.lastName  = "Last name is required";
      if (!regForm.username.trim())  errs.username  = "Username is required";
      if (!regForm.email.trim())     errs.email     = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(regForm.email)) errs.email = "Invalid email address";
    }

    if (step === 3) {
      if (regRole === "student") {
        if (!regBoard) errs.board = "Please select a board";
        if (!regGrade) errs.grade = "Please select a grade";
      }
      if (regSubjects.length === 0) errs.subjects = "Please select at least one subject";
    }

    if (step === 4) {
      if (!regForm.password)                errs.password        = "Password is required";
      else if (regForm.password.length < 6) errs.password        = "Password must be at least 6 characters";
      if (!regForm.confirmPassword)         errs.confirmPassword = "Please confirm your password";
      else if (regForm.password !== regForm.confirmPassword) errs.confirmPassword = "Passwords don't match";
    }

    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterSubmit = () => {
    if (!validateStep()) return;

    registerMutation.mutate({
      email:     regForm.email,
      username:  regForm.username,
      password:  regForm.password,
      firstName: regForm.firstName,
      lastName:  regForm.lastName,
      role:      regRole,
      grade:     regRole === "student" && regGrade
        ? parseInt(regGrade.replace(/\D/g, ""))
        : undefined,
    });
  };

  const features = [
    { icon:<Brain    size={18} color="#fff"/>, title:"AI-Powered Learning", desc:"Personalised tutoring with advanced AI"   },
    { icon:<Target   size={18} color="#fff"/>, title:"Track Progress",      desc:"Detailed analytics & insights"            },
    { icon:<Sparkles size={18} color="#fff"/>, title:"Gamified XP",         desc:"Earn badges & climb leaderboards"         },
    { icon:<Users    size={18} color="#fff"/>, title:"Community",           desc:"Learn with students worldwide"            },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="ap-root">

        {/* ── Hero panel ── */}
        <div className="ap-hero">
          <div className="ap-hero-blob"/>
          <div className="ap-hero-inner">
            <div className="ap-hero-logo">
              <div className="ap-hero-logo-icon"><GraduationCap size={26} color="#fff"/></div>
              <span className="ap-hero-logo-text">GradeUp!</span>
            </div>
            <h2 className="ap-hero-heading">Transform Your Learning Experience</h2>
            <p className="ap-hero-sub">Join thousands of students and teachers achieving academic excellence together.</p>
            <div className="ap-hero-features">
              {features.map((f, i) => (
                <motion.div key={i} className="ap-feat"
                  initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.08}}>
                  <div className="ap-feat-icon">{f.icon}</div>
                  <div className="ap-feat-title">{f.title}</div>
                  <div className="ap-feat-desc">{f.desc}</div>
                </motion.div>
              ))}
            </div>
            <div className="ap-hero-stats">
              {[{n:"10K+",l:"Students"},{n:"500+",l:"Courses"},{n:"4.9★",l:"Rating"}].map((s,i)=>(
                <div key={i} className="ap-stat">
                  <div className="ap-stat-n">{s.n}</div>
                  <div className="ap-stat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="ap-form-panel">
          <div className="ap-form-wrap">

            {/* Mobile logo */}
            <div className="ap-mobile-logo">
              <div className="ap-mobile-logo-icon"><GraduationCap size={22} color="#fff"/></div>
              <span className="ap-mobile-logo-text">GradeUp!</span>
            </div>

            {/* Tab switcher */}
            <div className="ap-tabs">
              <button
                className={`ap-tab${activeTab==="login"?" on":""}`}
                onClick={() => { setActiveTab("login"); resetLoginForm(); }}
              >Sign In</button>
              <button
                className={`ap-tab${activeTab==="register"?" on":""}`}
                onClick={() => { setActiveTab("register"); setRegErrors({}); }}
              >Create Account</button>
            </div>

            <AnimatePresence mode="wait">

              {/* ────────── LOGIN ────────── */}
              {activeTab==="login" && (
                <motion.div key="login"
                  initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.2}}>
                  <div className="ap-card">
                    <div className="ap-card-head">
                      <div className="ap-card-title">
                        {loginStep===1 && "I am a…"}
                        {loginStep===2 && "Enter Credentials"}
                        {loginStep===3 && "Security Verification"}
                      </div>
                      <div className="ap-card-sub">
                        {loginStep===1 && "Tell us who you are to personalize your experience"}
                        {loginStep===2 && "Sign in to continue your learning journey"}
                        {loginStep===3 && "Please verify your identity"}
                      </div>
                    </div>
                    <div className="ap-card-body">

                      <StepIndicator current={loginStep} steps={LOGIN_STEPS}/>

                      {/* Form-level error */}
                      {loginErrors.form && (
                        <div className="ap-alert">
                          <AlertTriangle size={15} color="#dc2626" style={{flexShrink:0,marginTop:1}}/>
                          <div className="ap-alert-text">{loginErrors.form}</div>
                        </div>
                      )}

                      <AnimatePresence mode="wait">
                        <motion.div key={loginStep}
                          initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:.18}}>

                          {/* Step 1 — Role selection */}
                          {loginStep===1 && (
                            <div>
                              <div className="ap-divider">
                                <div className="ap-divider-line"/>
                                <span className="ap-divider-text">Select your role</span>
                                <div className="ap-divider-line"/>
                              </div>
                              <div className="ap-role-grid">
                                {([
                                  {val:"student",icon:"🎓",name:"Student",desc:"I'm here to learn"},
                                  {val:"teacher",icon:"👨‍🏫",name:"Teacher",desc:"I guide students"},
                                ] as const).map(r => (
                                  <div key={r.val}
                                    className={`ap-role-card${loginRole===r.val?" on":""}`}
                                    onClick={() => { setLoginRole(r.val); setLoginErrors(p=>({...p,role:""})); }}
                                  >
                                    {loginRole===r.val && (
                                      <div className="ap-role-check"><Check size={11} color="#fff"/></div>
                                    )}
                                    <span className="ap-role-icon">{r.icon}</span>
                                    <div className="ap-role-name">{r.name}</div>
                                    <div className="ap-role-desc">{r.desc}</div>
                                  </div>
                                ))}
                              </div>
                              {loginErrors.role && (
                                <div className="ap-field-error" style={{marginTop:12}}>
                                  <AlertTriangle size={11}/>{loginErrors.role}
                                </div>
                              )}
                              <button className="ap-btn" onClick={handleLoginNext} style={{marginTop:20}}>
                                Continue <ChevronRight size={16}/>
                              </button>
                            </div>
                          )}

                          {/* Step 2 — Credentials */}
                          {loginStep===2 && (
                            <div>
                              {/* OAuth quick-login buttons */}
                              <div className="ap-oauth">
                                <button
                                  className="ap-oauth-btn"
                                  type="button"
                                  disabled={loginMutation.isPending}
                                  title="Quick login as Student"
                                  onClick={() => loginMutation.mutate({
                                    email:"student@gradeup.com", password:"password123", role:"student"
                                  })}
                                >
                                  <FaGoogle style={{color:"#ea4335",fontSize:15}}/> Google
                                </button>
                                <button
                                  className="ap-oauth-btn"
                                  type="button"
                                  disabled={loginMutation.isPending}
                                  title="Quick login as Teacher"
                                  onClick={() => loginMutation.mutate({
                                    email:"teacher@gradeup.com", password:"password123", role:"teacher"
                                  })}
                                >
                                  <FaMicrosoft style={{color:"#00a4ef",fontSize:15}}/> Microsoft
                                </button>
                              </div>

                              <div className="ap-divider">
                                <div className="ap-divider-line"/>
                                <span className="ap-divider-text">Or with email</span>
                                <div className="ap-divider-line"/>
                              </div>

                              <div className="ap-field">
                                <label className="ap-field-label">Email address</label>
                                <div className="ap-input-wrap">
                                  <span className="ap-input-icon"><Mail size={15}/></span>
                                  <input
                                    className={`ap-input with-icon${loginErrors.email?" is-error":""}`}
                                    type="email"
                                    placeholder="you@example.com"
                                    value={loginForm.email}
                                    onChange={e => { setLoginForm(f=>({...f,email:e.target.value})); setLoginErrors(p=>({...p,email:""})); }}
                                    data-testid="input-email"
                                  />
                                </div>
                                {loginErrors.email && <div className="ap-field-error"><AlertTriangle size={11}/>{loginErrors.email}</div>}
                              </div>

                              <div className="ap-field">
                                <label className="ap-field-label">Password</label>
                                <div className="ap-input-wrap">
                                  <span className="ap-input-icon"><Lock size={15}/></span>
                                  <input
                                    className={`ap-input with-icon with-eye${loginErrors.password?" is-error":""}`}
                                    type={showPw?"text":"password"}
                                    placeholder="Enter your password"
                                    value={loginForm.password}
                                    onChange={e => { setLoginForm(f=>({...f,password:e.target.value})); setLoginErrors(p=>({...p,password:""})); }}
                                    data-testid="input-password"
                                  />
                                  <button type="button" className="ap-input-eye" onClick={() => setShowPw(v=>!v)}>
                                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                                  </button>
                                </div>
                                {loginErrors.password && <div className="ap-field-error"><AlertTriangle size={11}/>{loginErrors.password}</div>}
                              </div>

                              <div className="ap-footer" style={{marginTop:14,marginBottom:20}}>
                                <Link href="/forgot-password">Forgot password?</Link>
                              </div>

                              <div className="ap-step-nav">
                                <button className="ap-btn ap-btn-outline" onClick={handleLoginBack}>
                                  <ChevronLeft size={16}/> Back
                                </button>
                                <button
                                  className="ap-btn"
                                  onClick={handleLoginNext}
                                  disabled={loginMutation.isPending}
                                  data-testid="button-login"
                                >
                                  {loginMutation.isPending
                                    ? <><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Signing In…</>
                                    : <>Continue <ChevronRight size={16}/></>}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Step 3 — CAPTCHA */}
                          {loginStep===3 && (
                            <div>
                              {loginErrors.captcha && (
                                <div className="ap-alert">
                                  <AlertTriangle size={15} color="#dc2626" style={{flexShrink:0,marginTop:1}}/>
                                  <div className="ap-alert-text">{loginErrors.captcha}</div>
                                </div>
                              )}
                              <div className="ap-field">
                                <label className="ap-field-label">Security Verification</label>
                                <div className="ap-captcha-box">
                                  {captchaData ? (
                                    <>
                                      <div className="ap-captcha-img" dangerouslySetInnerHTML={{__html:captchaData.svg}}/>
                                      <div className="ap-captcha-row">
                                        <input
                                          className={`ap-input${loginErrors.captcha?" is-error":""}`}
                                          style={{flex:1,textAlign:"center"}}
                                          placeholder="Enter text above"
                                          value={loginForm.captchaAnswer}
                                          onChange={e => { setLoginForm(f=>({...f,captchaAnswer:e.target.value})); setLoginErrors(p=>({...p,captcha:""})); }}
                                        />
                                        <button type="button" className="ap-captcha-refresh" onClick={loadCaptcha} disabled={captchaLoading}>
                                          <RefreshCw size={15} style={{animation:captchaLoading?"spin 1s linear infinite":"none"}}/>
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <button type="button" className="ap-btn ap-btn-outline" onClick={loadCaptcha} disabled={captchaLoading}>
                                      {captchaLoading
                                        ? <><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Loading…</>
                                        : <><Shield size={14}/> Load Verification</>}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="ap-step-nav">
                                <button className="ap-btn ap-btn-outline" onClick={handleLoginBack}>
                                  <ChevronLeft size={16}/> Back
                                </button>
                                <button className="ap-btn" onClick={handleLoginNext} disabled={loginMutation.isPending}>
                                  {loginMutation.isPending
                                    ? <><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Verifying…</>
                                    : <>Verify <ChevronRight size={16}/></>}
                                </button>
                              </div>
                            </div>
                          )}

                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ────────── REGISTER ────────── */}
              {activeTab==="register" && (
                <motion.div key="register"
                  initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.2}}>
                  <div className="ap-card">
                    <div className="ap-card-head">
                      <div className="ap-card-title">
                        {step===1 && "I am a…"}
                        {step===2 && "Your Profile"}
                        {step===3 && "Your Details"}
                        {step===4 && "Set Password"}
                      </div>
                      <div className="ap-card-sub">
                        {step===1 && "Tell us who you are to personalise your experience"}
                        {step===2 && "Let's get to know you"}
                        {step===3 && (regRole==="student" ? "Choose your board, grade & subjects" : "What subjects do you teach?")}
                        {step===4 && "Create a secure password for your account"}
                      </div>
                    </div>
                    <div className="ap-card-body">

                      <StepIndicator current={step} steps={REGISTER_STEPS}/>

                      {regErrors.form && (
                        <div className="ap-alert">
                          <AlertTriangle size={15} color="#dc2626" style={{flexShrink:0,marginTop:1}}/>
                          <div className="ap-alert-text">{regErrors.form}</div>
                        </div>
                      )}

                      <AnimatePresence mode="wait">
                        <motion.div key={step}
                          initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:.18}}>

                          {/* Step 1 — Role */}
                          {step===1 && (
                            <div>
                              <div className="ap-role-grid">
                                {([
                                  {val:"student",icon:"🎓",name:"Student",desc:"I'm here to learn & grow"},
                                  {val:"teacher",icon:"👨‍🏫",name:"Teacher",desc:"I teach and guide students"},
                                ] as const).map(r => (
                                  <div key={r.val}
                                    className={`ap-role-card${regRole===r.val?" on":""}`}
                                    onClick={() => setRegRole(r.val)}
                                  >
                                    {regRole===r.val && <div className="ap-role-check"><Check size={11} color="#fff"/></div>}
                                    <span className="ap-role-icon">{r.icon}</span>
                                    <div className="ap-role-name">{r.name}</div>
                                    <div className="ap-role-desc">{r.desc}</div>
                                  </div>
                                ))}
                              </div>
                              <button className="ap-btn" onClick={() => setStep(2)}>
                                Continue <ChevronRight size={16}/>
                              </button>
                            </div>
                          )}

                          {/* Step 2 — Profile */}
                          {step===2 && (
                            <div>
                              <div className="ap-field-row ap-field">
                                <div>
                                  <label className="ap-field-label">First Name</label>
                                  <input
                                    className={`ap-input${regErrors.firstName?" is-error":""}`}
                                    placeholder="John"
                                    value={regForm.firstName}
                                    onChange={e => setRegForm(f=>({...f,firstName:e.target.value}))}
                                    data-testid="input-firstname"
                                  />
                                  {regErrors.firstName && <div className="ap-field-error"><AlertTriangle size={11}/>{regErrors.firstName}</div>}
                                </div>
                                <div>
                                  <label className="ap-field-label">Last Name</label>
                                  <input
                                    className={`ap-input${regErrors.lastName?" is-error":""}`}
                                    placeholder="Doe"
                                    value={regForm.lastName}
                                    onChange={e => setRegForm(f=>({...f,lastName:e.target.value}))}
                                    data-testid="input-lastname"
                                  />
                                  {regErrors.lastName && <div className="ap-field-error"><AlertTriangle size={11}/>{regErrors.lastName}</div>}
                                </div>
                              </div>
                              <div className="ap-field">
                                <label className="ap-field-label">Username</label>
                                <input
                                  className={`ap-input${regErrors.username?" is-error":""}`}
                                  placeholder="johndoe123"
                                  value={regForm.username}
                                  onChange={e => setRegForm(f=>({...f,username:e.target.value}))}
                                  data-testid="input-username"
                                />
                                {regErrors.username && <div className="ap-field-error"><AlertTriangle size={11}/>{regErrors.username}</div>}
                              </div>
                              <div className="ap-field">
                                <label className="ap-field-label">Email Address</label>
                                <div className="ap-input-wrap">
                                  <span className="ap-input-icon"><Mail size={15}/></span>
                                  <input
                                    className={`ap-input with-icon${regErrors.email?" is-error":""}`}
                                    type="email"
                                    placeholder="john@example.com"
                                    value={regForm.email}
                                    onChange={e => setRegForm(f=>({...f,email:e.target.value}))}
                                    data-testid="input-reg-email"
                                  />
                                </div>
                                {regErrors.email && <div className="ap-field-error"><AlertTriangle size={11}/>{regErrors.email}</div>}
                              </div>
                              <div className="ap-step-nav">
                                <button className="ap-btn ap-btn-outline" onClick={() => setStep(1)}>
                                  <ChevronLeft size={16}/> Back
                                </button>
                                <button className="ap-btn" onClick={() => { if(validateStep()) setStep(3); }}>
                                  Continue <ChevronRight size={16}/>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Step 3 — Board / Grade / Subjects */}
                          {step===3 && (
                            <div>
                              {regRole==="student" && (
                                <>
                                  <div className="ap-field">
                                    <label className="ap-field-label">📋 Board / Curriculum</label>
                                    <div className="ap-chips">
                                      {BOARDS.map(b => (
                                        <button key={b} type="button"
                                          className={`ap-chip${regBoard===b?" on":""}`}
                                          onClick={() => { setRegBoard(b); setRegErrors(p=>({...p,board:""})); }}>
                                          {b}
                                        </button>
                                      ))}
                                    </div>
                                    {regErrors.board && <div className="ap-field-error"><AlertTriangle size={11}/>{regErrors.board}</div>}
                                  </div>
                                  <div className="ap-field">
                                    <label className="ap-field-label">🎓 Grade / Class</label>
                                    <div className="ap-chips">
                                      {GRADES.map(g => (
                                        <button key={g} type="button"
                                          className={`ap-chip${regGrade===g?" on":""}`}
                                          onClick={() => { setRegGrade(g); setRegErrors(p=>({...p,grade:""})); }}>
                                          {g}
                                        </button>
                                      ))}
                                    </div>
                                    {regErrors.grade && <div className="ap-field-error"><AlertTriangle size={11}/>{regErrors.grade}</div>}
                                  </div>
                                </>
                              )}
                              <div className="ap-field">
                                <label className="ap-field-label">
                                  📚 {regRole==="student" ? "Subjects (select all that apply)" : "Subjects you teach"}
                                </label>
                                <div className="ap-chips">
                                  {SUBJECTS.map(s => (
                                    <button key={s} type="button"
                                      className={`ap-chip${regSubjects.includes(s)?" on":""}`}
                                      onClick={() => {
                                        setRegSubjects(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);
                                        setRegErrors(p=>({...p,subjects:""}));
                                      }}>
                                      {s}
                                    </button>
                                  ))}
                                </div>
                                {regErrors.subjects && <div className="ap-field-error"><AlertTriangle size={11}/>{regErrors.subjects}</div>}
                              </div>
                              <div className="ap-step-nav">
                                <button className="ap-btn ap-btn-outline" onClick={() => setStep(2)}>
                                  <ChevronLeft size={16}/> Back
                                </button>
                                <button className="ap-btn" onClick={() => { if(validateStep()) setStep(4); }}>
                                  Continue <ChevronRight size={16}/>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Step 4 — Password + summary */}
                          {step===4 && (
                            <div>
                              <div className="ap-field">
                                <label className="ap-field-label">Password</label>
                                <div className="ap-input-wrap">
                                  <span className="ap-input-icon"><Lock size={15}/></span>
                                  <input
                                    className={`ap-input with-icon with-eye${regErrors.password?" is-error":""}`}
                                    type={showRegPw?"text":"password"}
                                    placeholder="Create a strong password"
                                    value={regForm.password}
                                    onChange={e => setRegForm(f=>({...f,password:e.target.value}))}
                                    data-testid="input-reg-password"
                                  />
                                  <button type="button" className="ap-input-eye" onClick={() => setShowRegPw(v=>!v)}>
                                    {showRegPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                                  </button>
                                </div>
                                {regErrors.password && <div className="ap-field-error"><AlertTriangle size={11}/>{regErrors.password}</div>}
                              </div>
                              <div className="ap-field">
                                <label className="ap-field-label">Confirm Password</label>
                                <div className="ap-input-wrap">
                                  <span className="ap-input-icon"><Lock size={15}/></span>
                                  <input
                                    className={`ap-input with-icon with-eye${regErrors.confirmPassword?" is-error":""}`}
                                    type={showRegConf?"text":"password"}
                                    placeholder="Re-enter password"
                                    value={regForm.confirmPassword}
                                    onChange={e => setRegForm(f=>({...f,confirmPassword:e.target.value}))}
                                  />
                                  <button type="button" className="ap-input-eye" onClick={() => setShowRegConf(v=>!v)}>
                                    {showRegConf ? <EyeOff size={15}/> : <Eye size={15}/>}
                                  </button>
                                </div>
                                {regErrors.confirmPassword && <div className="ap-field-error"><AlertTriangle size={11}/>{regErrors.confirmPassword}</div>}
                              </div>

                              {/* Account summary */}
                              <div className="ap-summary">
                                <div className="ap-summary-label">Account Summary</div>
                                {([
                                  ["Role",  regRole==="student"?"🎓 Student":"👨‍🏫 Teacher"],
                                  ["Name",  `${regForm.firstName} ${regForm.lastName}`.trim()||"—"],
                                  ["Email", regForm.email||"—"],
                                  ...(regRole==="student"
                                    ? [["Board",regBoard||"—"],["Grade",regGrade||"—"]]
                                    : [] as any),
                                ] as [string,string][]).map(([k,v]) => (
                                  <div key={k} className="ap-summary-row">
                                    <span className="ap-summary-key">{k}</span>
                                    <span className="ap-summary-val">{v}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="ap-step-nav">
                                <button className="ap-btn ap-btn-outline" onClick={() => setStep(3)}>
                                  <ChevronLeft size={16}/> Back
                                </button>
                                <button className="ap-btn" onClick={handleRegisterSubmit} disabled={registerMutation.isPending}>
                                  {registerMutation.isPending
                                    ? <><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Creating…</>
                                    : <>Create Account <Check size={16}/></>}
                                </button>
                              </div>
                            </div>
                          )}

                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            <p className="ap-footer">
              By continuing, you agree to our{" "}
              <a href="#">Terms of Service</a> &amp; <a href="#">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}