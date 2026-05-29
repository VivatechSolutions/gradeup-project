import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import Navigation from "../components/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Settings, Bell, Shield, Palette, Globe, Key, AlertTriangle,
  Save, ArrowLeft, Trophy, Users, Bot, Sun, Moon, Monitor,
  Eye, EyeOff, Check, ChevronRight, Lock, Trash2, Zap,
} from "lucide-react";

// ── Design tokens — exact match to notification / progress pages ──────────────
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

/* ── THEME VARIABLES ── */
:root {
  --sp-bg:         #f8fafc;
  --sp-surface:    #ffffff;
  --sp-surface2:   #f8fafc;
  --sp-text:       #0f172a;
  --sp-text2:      #374151;
  --sp-muted:      #64748b;
  --sp-subtle:     #94a3b8;
  --sp-border:     rgba(0,0,0,.06);
  --sp-border2:    rgba(0,0,0,.08);
  --sp-shadow:     0 2px 12px rgba(0,0,0,.05);
  --sp-input-bg:   #ffffff;
  --sp-toggle-bg:  rgba(248,250,252,.8);
  --sp-toggle-hov: rgba(99,102,241,.03);
  --sp-toggle-bdr: rgba(0,0,0,.05);
}

[data-theme="dark"] {
  --sp-bg:         #0b1120;
  --sp-surface:    #1e293b;
  --sp-surface2:   #0f172a;
  --sp-text:       #f1f5f9;
  --sp-text2:      #cbd5e1;
  --sp-muted:      #94a3b8;
  --sp-subtle:     #64748b;
  --sp-border:     rgba(255,255,255,.07);
  --sp-border2:    rgba(255,255,255,.10);
  --sp-shadow:     0 2px 12px rgba(0,0,0,.35);
  --sp-input-bg:   #0f172a;
  --sp-toggle-bg:  rgba(255,255,255,.03);
  --sp-toggle-hov: rgba(99,102,241,.07);
  --sp-toggle-bdr: rgba(255,255,255,.06);
}

.sp-root{
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  background:var(--sp-bg);
  min-height:100vh;
  color:var(--sp-text);
  transition:background .3s,color .3s;
}

/* ── Hero ── */
.sp-hero{margin:24px 28px 0;border-radius:24px;padding:32px 40px;
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  position:relative;overflow:hidden;color:#fff;
  box-shadow:0 8px 32px rgba(99,102,241,.28);
  animation:heroIn .55s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes heroIn{from{opacity:0;transform:translateY(-16px) scale(.97)}to{opacity:1;transform:none}}
.sp-hero::before{content:'';position:absolute;top:-80px;right:-80px;width:280px;height:280px;border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none;}
.sp-hero::after{content:'';position:absolute;bottom:-60px;left:25%;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none;}
.sp-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.sp-hero-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:20px;margin-bottom:10px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);font-size:12px;font-weight:700;color:#fff;}
.sp-hero-title{font-size:clamp(22px,3vw,32px);font-weight:800;color:#fff;margin-bottom:6px;letter-spacing:-.3px;}
.sp-hero-sub{font-size:13.5px;color:rgba(255,255,255,.72);line-height:1.6;}
.sp-hero-user{display:flex;align-items:center;gap:14px;flex-shrink:0;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);padding:12px 18px;border-radius:16px;}
.sp-hero-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,rgba(255,255,255,.4),rgba(255,255,255,.2));border:2px solid rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;}
.sp-hero-uname{font-size:14px;font-weight:800;color:#fff;}
.sp-hero-urole{font-size:11px;color:rgba(255,255,255,.65);margin-top:1px;text-transform:capitalize;}

/* ── Body layout ── */
.sp-body{padding:20px 28px 60px;}
.sp-layout{display:grid;grid-template-columns:240px 1fr;gap:20px;align-items:start;}

/* ── Sidebar nav ── */
.sp-sidebar{position:sticky;top:88px;}
.sp-sidenav{
  background:var(--sp-surface);border-radius:20px;border:1px solid var(--sp-border);
  box-shadow:var(--sp-shadow);overflow:hidden;
  animation:scardIn .5s cubic-bezier(.34,1.56,.64,1) both;
  transition:background .3s,border-color .3s;
}
@keyframes scardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.sp-sidenav-head{padding:16px 18px 12px;border-bottom:1px solid var(--sp-border);}
.sp-sidenav-label{font-size:10.5px;font-weight:800;color:var(--sp-subtle);text-transform:uppercase;letter-spacing:.08em;}
.sp-navlist{padding:6px;}
.sp-navitem{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:12px;border:none;background:transparent;font-family:inherit;font-size:13px;font-weight:600;color:var(--sp-muted);cursor:pointer;text-align:left;transition:all .18s;position:relative;}
.sp-navitem:hover{background:rgba(99,102,241,.06);color:#6366f1;}
[data-theme="dark"] .sp-navitem:hover{background:rgba(99,102,241,.15);color:#a5b4fc;}
.sp-navitem.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 4px 12px rgba(99,102,241,.28);}
.sp-navitem-icon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .18s;}
.sp-navitem:not(.on) .sp-navitem-icon{background:rgba(0,0,0,.05);}
[data-theme="dark"] .sp-navitem:not(.on) .sp-navitem-icon{background:rgba(255,255,255,.07);}
.sp-navitem.on .sp-navitem-icon{background:rgba(255,255,255,.2);}
.sp-navitem-chevron{margin-left:auto;opacity:.4;}
.sp-navitem.on .sp-navitem-chevron{opacity:.7;}
.sp-back-btn{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;border:1.5px solid var(--sp-border2);background:var(--sp-surface);font-family:inherit;font-size:12.5px;font-weight:600;color:var(--sp-muted);cursor:pointer;transition:all .18s;margin-bottom:12px;width:100%;}
.sp-back-btn:hover{border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,.05);}

/* ── Main panel ── */
.sp-panel{
  background:var(--sp-surface);border-radius:20px;border:1px solid var(--sp-border);
  box-shadow:var(--sp-shadow);overflow:hidden;
  animation:scardIn .5s cubic-bezier(.34,1.56,.64,1) .05s both;
  transition:background .3s,border-color .3s;
}
.sp-panel-head{padding:22px 26px 18px;border-bottom:1px solid var(--sp-border);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.sp-panel-htitle{font-size:16px;font-weight:800;color:var(--sp-text);display:flex;align-items:center;gap:10px;}
.sp-panel-hsub{font-size:12.5px;color:var(--sp-muted);margin-top:3px;}
.sp-panel-body{padding:24px 26px;}

/* ── Section dividers ── */
.sp-section{margin-bottom:28px;}
.sp-section:last-child{margin-bottom:0;}
.sp-section-title{font-size:13px;font-weight:800;color:var(--sp-subtle);text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
.sp-section-title::after{content:'';flex:1;height:1px;background:var(--sp-border);}

/* ── Toggle rows ── */
.sp-toggle-row{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:14px 16px;border-radius:14px;border:1px solid var(--sp-toggle-bdr);
  margin-bottom:8px;background:var(--sp-toggle-bg);transition:all .15s;
}
.sp-toggle-row:hover{background:var(--sp-toggle-hov);border-color:rgba(99,102,241,.12);}
.sp-toggle-left{display:flex;align-items:center;gap:12px;min-width:0;}
.sp-toggle-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;}
.sp-toggle-label{font-size:13.5px;font-weight:600;color:var(--sp-text);line-height:1.3;}
.sp-toggle-desc{font-size:12px;color:var(--sp-subtle);margin-top:2px;font-weight:400;}

/* ── Custom Switch ── */
.sp-switch{position:relative;width:44px;height:24px;flex-shrink:0;cursor:pointer;}
.sp-switch input{opacity:0;width:0;height:0;position:absolute;}
.sp-switch-track{width:44px;height:24px;border-radius:12px;background:#e2e8f0;transition:background .2s;display:block;}
[data-theme="dark"] .sp-switch-track{background:#334155;}
.sp-switch input:checked+.sp-switch-track{background:linear-gradient(90deg,#6366f1,#8b5cf6);}
.sp-switch-thumb{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:transform .2s cubic-bezier(.34,1.56,.64,1);}
.sp-switch input:checked~.sp-switch-thumb{transform:translateX(20px);}

/* ── Select / Input fields ── */
.sp-field{margin-bottom:16px;}
.sp-field-label{font-size:12.5px;font-weight:700;color:var(--sp-text2);margin-bottom:6px;display:block;}
.sp-select,.sp-input{
  width:100%;padding:10px 14px;border-radius:12px;
  border:1.5px solid var(--sp-border2);background:var(--sp-input-bg);font-family:inherit;
  font-size:13.5px;color:var(--sp-text);transition:border-color .18s,box-shadow .18s,background .3s;
  appearance:none;outline:none;
}
.sp-select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px;cursor:pointer;}
.sp-select:focus,.sp-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1);}
.sp-input-wrap{position:relative;}
.sp-input-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--sp-subtle);padding:2px;display:flex;}
.sp-input-eye:hover{color:#6366f1;}
.sp-field-error{font-size:11.5px;color:#ef4444;margin-top:4px;display:flex;align-items:center;gap:4px;}

/* ── Theme picker ── */
.sp-theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;}
.sp-theme-opt{border-radius:14px;border:2px solid var(--sp-border2);padding:14px 10px;text-align:center;cursor:pointer;transition:all .18s;background:var(--sp-surface);}
.sp-theme-opt:hover{border-color:#a5b4fc;background:rgba(99,102,241,.04);}
[data-theme="dark"] .sp-theme-opt:hover{background:rgba(99,102,241,.08);}
.sp-theme-opt.on{border-color:#6366f1;background:rgba(99,102,241,.06);}
[data-theme="dark"] .sp-theme-opt.on{background:rgba(99,102,241,.12);}
.sp-theme-icon{font-size:24px;display:block;margin-bottom:6px;}
.sp-theme-label{font-size:12px;font-weight:700;color:var(--sp-text2);}
.sp-theme-opt.on .sp-theme-label{color:#6366f1;}

/* ── Save button ── */
.sp-save-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 4px 14px rgba(99,102,241,.3);}
.sp-save-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(99,102,241,.4);}
.sp-save-btn:active{transform:translateY(0);}
.sp-save-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
.sp-save-row{display:flex;align-items:center;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid var(--sp-border);}
.sp-saved-pill{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border-radius:20px;background:rgba(16,185,129,.1);color:#059669;font-size:12px;font-weight:700;animation:fadeInPill .3s ease;}
@keyframes fadeInPill{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}

/* ── Danger zone ── */
.sp-danger{border-radius:16px;border:1.5px solid rgba(239,68,68,.2);background:rgba(239,68,68,.04);padding:20px;margin-top:24px;}
.sp-danger-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.sp-danger-title{font-size:14px;font-weight:800;color:#dc2626;}
.sp-danger-desc{font-size:13px;color:var(--sp-muted);line-height:1.6;margin-bottom:16px;}
.sp-danger-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;border:1.5px solid rgba(239,68,68,.3);background:rgba(239,68,68,.06);font-family:inherit;font-size:13px;font-weight:700;color:#dc2626;cursor:pointer;transition:all .18s;}
.sp-danger-btn:hover{background:rgba(239,68,68,.12);border-color:#ef4444;}

/* ── Password strength ── */
.sp-pw-strength{margin-top:8px;display:flex;align-items:center;gap:8px;}
.sp-pw-bars{display:flex;gap:4px;}
.sp-pw-bar{height:4px;width:32px;border-radius:4px;background:var(--sp-border2);transition:background .3s;}
.sp-pw-bar.weak{background:#ef4444;}
.sp-pw-bar.fair{background:#f59e0b;}
.sp-pw-bar.good{background:#10b981;}
.sp-pw-bar.strong{background:#6366f1;}
.sp-pw-label{font-size:11.5px;font-weight:700;}
.sp-pw-label.weak{color:#ef4444;}
.sp-pw-label.fair{color:#f59e0b;}
.sp-pw-label.good{color:#10b981;}
.sp-pw-label.strong{color:#6366f1;}

/* ── Mobile select tab bar ── */
.sp-mob-tabs{display:none;gap:4px;background:var(--sp-surface);border-radius:16px;padding:5px;border:1px solid var(--sp-border);box-shadow:0 2px 8px rgba(0,0,0,.04);margin-bottom:20px;overflow-x:auto;scrollbar-width:none;transition:background .3s;}
.sp-mob-tabs::-webkit-scrollbar{display:none;}
.sp-mob-tab{flex:1;min-width:fit-content;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;border-radius:12px;border:none;background:transparent;font-family:inherit;font-size:12.5px;font-weight:600;color:var(--sp-muted);cursor:pointer;transition:all .2s;white-space:nowrap;}
.sp-mob-tab:hover{background:rgba(99,102,241,.06);color:#6366f1;}
[data-theme="dark"] .sp-mob-tab:hover{background:rgba(99,102,241,.15);color:#a5b4fc;}
.sp-mob-tab.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 4px 12px rgba(99,102,241,.32);}
.sp-mob-tab-label{display:inline;}

/* ── Responsive ── */
@media(max-width:1100px){.sp-layout{grid-template-columns:200px 1fr;}}
@media(max-width:900px){
  .sp-hero{margin:14px 16px 0;padding:26px 24px;}
  .sp-hero-user{display:none;}
  .sp-body{padding:16px 16px 56px;}
  .sp-layout{grid-template-columns:180px 1fr;gap:14px;}
}
@media(max-width:768px){
  .sp-hero{margin:12px 12px 0;padding:20px 18px;border-radius:18px;}
  .sp-hero-title{font-size:20px;}
  .sp-body{padding:14px 12px 56px;}
  .sp-layout{grid-template-columns:1fr;}
  .sp-sidebar{display:none;}
  .sp-mob-tabs{display:flex;}
  .sp-panel-body{padding:18px 18px;}
  .sp-panel-head{padding:18px 18px 14px;}
  .sp-theme-grid{grid-template-columns:repeat(3,1fr);}
}
@media(max-width:600px){
  .sp-hero{margin:10px 10px 0;padding:18px 16px;border-radius:16px;}
  .sp-hero-title{font-size:18px;}
  .sp-hero-sub{font-size:12.5px;}
  .sp-body{padding:12px 10px 56px;}
  .sp-mob-tab-label{display:none;}
  .sp-mob-tab{padding:10px 12px;}
  .sp-toggle-row{padding:12px 13px;}
  .sp-toggle-icon{width:32px;height:32px;font-size:14px;}
  .sp-panel-body{padding:16px 14px;}
}
@media(max-width:480px){
  .sp-hero{margin:10px 10px 0;padding:16px 14px;border-radius:16px;}
  .sp-hero-title{font-size:17px;}
  .sp-body{padding:12px 10px 56px;}
  .sp-theme-grid{grid-template-columns:repeat(3,1fr);gap:7px;}
  .sp-theme-opt{padding:11px 8px;}
  .sp-theme-icon{font-size:20px;}
  .sp-theme-label{font-size:11px;}
  .sp-save-btn{width:100%;justify-content:center;}
  .sp-pw-bars .sp-pw-bar{width:22px;}
}
@media(max-width:360px){
  .sp-hero-title{font-size:15px;}
  .sp-toggle-label{font-size:12.5px;}
  .sp-toggle-desc{font-size:11px;}
}
`;

// ── Schemas ───────────────────────────────────────────────────────────────────
const settingsSchema = z.object({
  notifications: z.object({
    email: z.boolean(), push: z.boolean(),
    assignments: z.boolean(), grades: z.boolean(), messages: z.boolean(),
    community: z.object({ newPost:z.boolean(), newComment:z.boolean(), privateMessage:z.boolean(), groupMessage:z.boolean() }),
    achievements: z.object({ unlocked:z.boolean() }),
  }),
  privacy: z.object({ profileVisible:z.boolean(), showOnlineStatus:z.boolean() }),
  preferences: z.object({
    theme: z.enum(["light","dark","system"]),
    language: z.string(), timezone: z.string(),
    aiTutor: z.object({ voice:z.string(), autoPlay:z.boolean() }),
  }),
  gamification: z.object({ levelUpNotifications:z.boolean(), pointsDisplay:z.boolean() }),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1,"Required"),
  newPassword: z.string().min(6,"At least 6 characters"),
  confirmPassword: z.string().min(6,"Please confirm"),
}).refine(d=>d.newPassword===d.confirmPassword,{message:"Passwords don't match",path:["confirmPassword"]});

type SettingsValues  = z.infer<typeof settingsSchema>;
type PasswordValues  = z.infer<typeof passwordSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked:boolean; onChange:(v:boolean)=>void }) {
  return (
    <label className="sp-switch" onClick={e=>e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>
      <span className="sp-switch-track"/>
      <span className="sp-switch-thumb"/>
    </label>
  );
}

function ToggleRow({ icon, iconBg, label, desc, checked, onChange }:
  { icon:string; iconBg:string; label:string; desc:string; checked:boolean; onChange:(v:boolean)=>void }) {
  return (
    <div className="sp-toggle-row" onClick={()=>onChange(!checked)} style={{cursor:"pointer"}}>
      <div className="sp-toggle-left">
        <div className="sp-toggle-icon" style={{background:iconBg}}>{icon}</div>
        <div className="sp-toggle-text">
          <div className="sp-toggle-label">{label}</div>
          <div className="sp-toggle-desc">{desc}</div>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange}/>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="sp-section-title">{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="sp-field-label">{children}</label>;
}

function getPasswordStrength(pw: string) {
  if (!pw) return null;
  if (pw.length < 6)  return { level:1, label:"Weak",   cls:"weak"   };
  if (pw.length < 10) return { level:2, label:"Fair",   cls:"fair"   };
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw) && pw.length >= 12)
                      return { level:4, label:"Strong", cls:"strong" };
  return              { level:3, label:"Good",   cls:"good"   };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("notifications");
  const [savedSection, setSavedSection]   = useState<string|null>(null);
  const [showPw, setShowPw]               = useState({ cur:false, nw:false, conf:false });
  const [role, setRole]                   = useState(user?.role || "student");

  const settingsForm = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      notifications: {
        email:true, push:true, assignments:true, grades:true, messages:true,
        community:{ newPost:true, newComment:true, privateMessage:true, groupMessage:true },
        achievements:{ unlocked:true },
      },
      privacy:{ profileVisible:true, showOnlineStatus:false },
      preferences:{ theme:"system", language:"en", timezone:"UTC", aiTutor:{ voice:"default", autoPlay:true } },
      gamification:{ levelUpNotifications:true, pointsDisplay:true },
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword:"", newPassword:"", confirmPassword:"" },
  });

  const newPwValue = passwordForm.watch("newPassword");
  const pwStrength = getPasswordStrength(newPwValue);

  const updateMutation = useMutation({
    mutationFn: (data: SettingsValues) => apiRequest("/api/user/settings","PUT",data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey:["/api/user"] });
      setSavedSection(activeSection);
      setTimeout(()=>setSavedSection(null), 2500);
    },
    onError: (e:Error) => toast({ title:"Failed to save", description:e.message, variant:"destructive" }),
  });

  const pwMutation = useMutation({
    mutationFn: (data: PasswordValues) =>
      apiRequest("/api/user/change-password","POST",{ currentPassword:data.currentPassword, newPassword:data.newPassword }),
    onSuccess: () => { passwordForm.reset(); toast({ title:"Password changed successfully ✓" }); },
    onError: (e:Error) => toast({ title:"Failed to change password", description:e.message, variant:"destructive" }),
  });

  const sf = settingsForm.watch();
  const set = <T extends unknown>(path: string[], value: T) => {
    // helper to set nested form value
    const key = path.join(".") as any;
    settingsForm.setValue(key, value as any);
  };

  const SECTIONS = [
    { id:"notifications", icon:<Bell size={15}/>,    label:"Notifications", emoji:"🔔" },
    { id:"privacy",       icon:<Shield size={15}/>,  label:"Privacy",       emoji:"🛡️" },
    { id:"preferences",   icon:<Palette size={15}/>, label:"Preferences",   emoji:"🎨" },
    { id:"security",      icon:<Key size={15}/>,     label:"Security",      emoji:"🔐" },
    { id:"gamification",  icon:<Trophy size={15}/>,  label:"Gamification",  emoji:"🏆" },
  ];

  const currentSection = SECTIONS.find(s=>s.id===activeSection);

  // ── Save footer
  const SaveRow = ({ onSave, pending }: { onSave:()=>void; pending:boolean }) => (
    <div className="sp-save-row">
      <button className="sp-save-btn" onClick={onSave} disabled={pending}>
        <Save size={15}/>
        {pending ? "Saving…" : "Save Changes"}
      </button>
      {savedSection===activeSection && (
        <div className="sp-saved-pill"><Check size={13}/> Saved!</div>
      )}
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="sp-root">
        <Navigation currentRole={role} onRoleChange={setRole}/>

        {/* Hero */}
        <div className="sp-hero">
          <div className="sp-hero-inner">
            <div>
              <div className="sp-hero-pill"><Settings size={12}/> Account</div>
              <div className="sp-hero-title">⚙️ Settings</div>
              <div className="sp-hero-sub">
                Manage your preferences, privacy &amp; security<br/>
                {user?.username || "Your account"} · {role} account
              </div>
            </div>
            <div className="sp-hero-user">
              <div className="sp-hero-avatar">
                {(user?.username?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <div className="sp-hero-uname">{user?.username || "User"}</div>
                <div className="sp-hero-urole">{role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="sp-body">

          {/* Mobile tab bar */}
          <div className="sp-mob-tabs">
            {SECTIONS.map(s=>(
              <button key={s.id} className={`sp-mob-tab${activeSection===s.id?" on":""}`}
                onClick={()=>setActiveSection(s.id)}>
                <span>{s.emoji}</span>
                <span className="sp-mob-tab-label">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="sp-layout">

            {/* Sidebar */}
            <div className="sp-sidebar">
              <Link href="/">
                <button className="sp-back-btn"><ArrowLeft size={14}/> Back to Dashboard</button>
              </Link>
              <div className="sp-sidenav">
                <div className="sp-sidenav-head">
                  <div className="sp-sidenav-label">Settings</div>
                </div>
                <div className="sp-navlist">
                  {SECTIONS.map(s=>(
                    <button key={s.id} className={`sp-navitem${activeSection===s.id?" on":""}`}
                      onClick={()=>setActiveSection(s.id)}>
                      <div className="sp-navitem-icon">{s.icon}</div>
                      {s.label}
                      <ChevronRight size={13} className="sp-navitem-chevron"/>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Panel */}
            <div className="sp-panel">
              <div className="sp-panel-head">
                <div>
                  <div className="sp-panel-htitle">
                    {currentSection?.emoji} {currentSection?.label}
                  </div>
                  <div className="sp-panel-hsub">
                    {activeSection==="notifications" && "Choose what you want to be notified about"}
                    {activeSection==="privacy"       && "Control your visibility and data sharing"}
                    {activeSection==="preferences"   && "Customise your app experience"}
                    {activeSection==="security"      && "Keep your account safe and secure"}
                    {activeSection==="gamification"  && "Manage XP, levels and achievement settings"}
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeSection}
                  initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                  transition={{duration:.18}}>

                  <div className="sp-panel-body">

                    {/* ── NOTIFICATIONS ── */}
                    {activeSection==="notifications" && (
                      <div>
                        <div className="sp-section">
                          <SectionTitle>Delivery</SectionTitle>
                          <ToggleRow icon="📧" iconBg="rgba(99,102,241,.1)"  label="Email Notifications"   desc="Receive updates via email"          checked={sf.notifications.email}      onChange={v=>set(["notifications","email"],v)}/>
                          <ToggleRow icon="📲" iconBg="rgba(139,92,246,.1)"  label="Push Notifications"    desc="Browser push alerts"                checked={sf.notifications.push}       onChange={v=>set(["notifications","push"],v)}/>
                        </div>
                        <div className="sp-section">
                          <SectionTitle>Activity</SectionTitle>
                          <ToggleRow icon="📝" iconBg="rgba(99,102,241,.1)"  label="Assignment Updates"    desc="New assignments & due date reminders" checked={sf.notifications.assignments} onChange={v=>set(["notifications","assignments"],v)}/>
                          <ToggleRow icon="⭐" iconBg="rgba(16,185,129,.1)"  label="Grade Updates"         desc="When grades are posted or changed"   checked={sf.notifications.grades}     onChange={v=>set(["notifications","grades"],v)}/>
                          <ToggleRow icon="💬" iconBg="rgba(14,165,233,.1)"  label="Messages"              desc="New messages and announcements"       checked={sf.notifications.messages}   onChange={v=>set(["notifications","messages"],v)}/>
                        </div>
                        <div className="sp-section">
                          <SectionTitle>Community</SectionTitle>
                          <ToggleRow icon="📣" iconBg="rgba(245,158,11,.1)"  label="New Posts"             desc="Posts in community feed"            checked={sf.notifications.community.newPost}       onChange={v=>set(["notifications","community","newPost"],v)}/>
                          <ToggleRow icon="💭" iconBg="rgba(99,102,241,.1)"  label="New Comments"          desc="Comments on your posts"             checked={sf.notifications.community.newComment}    onChange={v=>set(["notifications","community","newComment"],v)}/>
                          <ToggleRow icon="🔒" iconBg="rgba(139,92,246,.1)"  label="Private Messages"      desc="Direct messages from others"        checked={sf.notifications.community.privateMessage} onChange={v=>set(["notifications","community","privateMessage"],v)}/>
                          <ToggleRow icon="👥" iconBg="rgba(14,165,233,.1)"  label="Group Messages"        desc="New messages in your groups"        checked={sf.notifications.community.groupMessage}  onChange={v=>set(["notifications","community","groupMessage"],v)}/>
                        </div>
                        <div className="sp-section">
                          <SectionTitle>Achievements</SectionTitle>
                          <ToggleRow icon="🏆" iconBg="rgba(245,158,11,.1)"  label="Achievement Unlocked"  desc="Celebrate when you earn a badge"    checked={sf.notifications.achievements.unlocked} onChange={v=>set(["notifications","achievements","unlocked"],v)}/>
                        </div>
                        <SaveRow onSave={settingsForm.handleSubmit(d=>updateMutation.mutate(d))} pending={updateMutation.isPending}/>
                      </div>
                    )}

                    {/* ── PRIVACY ── */}
                    {activeSection==="privacy" && (
                      <div>
                        <div className="sp-section">
                          <SectionTitle>Profile</SectionTitle>
                          <ToggleRow icon="👁️" iconBg="rgba(99,102,241,.1)"  label="Public Profile"        desc="Make your profile visible to others" checked={sf.privacy.profileVisible}   onChange={v=>set(["privacy","profileVisible"],v)}/>
                          <ToggleRow icon="🟢" iconBg="rgba(16,185,129,.1)"  label="Show Online Status"    desc="Let others see when you're active"   checked={sf.privacy.showOnlineStatus} onChange={v=>set(["privacy","showOnlineStatus"],v)}/>
                        </div>
                        <SaveRow onSave={settingsForm.handleSubmit(d=>updateMutation.mutate(d))} pending={updateMutation.isPending}/>
                      </div>
                    )}

                    {/* ── PREFERENCES ── */}
                    {activeSection==="preferences" && (
                      <div>
                        <div className="sp-section">
                          <SectionTitle>Theme</SectionTitle>
                          <div className="sp-theme-grid">
                            {([
                              {val:"light",  icon:"☀️",  label:"Light"},
                              {val:"dark",   icon:"🌙",  label:"Dark"},
                              {val:"system", icon:"💻",  label:"System"},
                            ] as const).map(t=>(
                              <div key={t.val} className={`sp-theme-opt${sf.preferences.theme===t.val?" on":""}`}
                                onClick={()=>set(["preferences","theme"],t.val)}>
                                <span className="sp-theme-icon">{t.icon}</span>
                                <div className="sp-theme-label">{t.label}</div>
                                {sf.preferences.theme===t.val && (
                                  <div style={{marginTop:6,display:"flex",justifyContent:"center"}}>
                                    <div style={{width:18,height:18,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                      <Check size={11} color="#fff"/>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="sp-section">
                          <SectionTitle>Language & Region</SectionTitle>
                          <div className="sp-field">
                            <FieldLabel>Language</FieldLabel>
                            <select className="sp-select" value={sf.preferences.language}
                              onChange={e=>set(["preferences","language"],e.target.value)}>
                              <option value="en">🇬🇧 English</option>
                              <option value="es">🇪🇸 Spanish</option>
                              <option value="fr">🇫🇷 French</option>
                              <option value="de">🇩🇪 German</option>
                              <option value="hi">🇮🇳 Hindi</option>
                              <option value="ta">🇮🇳 Tamil</option>
                            </select>
                          </div>
                          <div className="sp-field">
                            <FieldLabel>Timezone</FieldLabel>
                            <select className="sp-select" value={sf.preferences.timezone}
                              onChange={e=>set(["preferences","timezone"],e.target.value)}>
                              <option value="UTC">UTC</option>
                              <option value="IST">India Standard Time (IST)</option>
                              <option value="EST">Eastern (EST)</option>
                              <option value="CST">Central (CST)</option>
                              <option value="MST">Mountain (MST)</option>
                              <option value="PST">Pacific (PST)</option>
                              <option value="GMT">GMT</option>
                            </select>
                          </div>
                        </div>
                        <div className="sp-section">
                          <SectionTitle>AI Tutor</SectionTitle>
                          <div className="sp-field">
                            <FieldLabel>Tutor Voice</FieldLabel>
                            <select className="sp-select" value={sf.preferences.aiTutor.voice}
                              onChange={e=>set(["preferences","aiTutor","voice"],e.target.value)}>
                              <option value="default">Default</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          </div>
                          <ToggleRow icon="🤖" iconBg="rgba(99,102,241,.1)" label="Auto-play Questions" desc="Automatically advance to the next question" checked={sf.preferences.aiTutor.autoPlay} onChange={v=>set(["preferences","aiTutor","autoPlay"],v)}/>
                        </div>
                        <SaveRow onSave={settingsForm.handleSubmit(d=>updateMutation.mutate(d))} pending={updateMutation.isPending}/>
                      </div>
                    )}

                    {/* ── SECURITY ── */}
                    {activeSection==="security" && (
                      <div>
                        <div className="sp-section">
                          <SectionTitle>Change Password</SectionTitle>

                          <div className="sp-field">
                            <FieldLabel>Current Password</FieldLabel>
                            <div className="sp-input-wrap">
                              <input className="sp-input" type={showPw.cur?"text":"password"}
                                placeholder="Enter current password"
                                {...passwordForm.register("currentPassword")}
                                style={{paddingRight:40}}/>
                              <button className="sp-input-eye" type="button"
                                onClick={()=>setShowPw(p=>({...p,cur:!p.cur}))}>
                                {showPw.cur ? <EyeOff size={15}/> : <Eye size={15}/>}
                              </button>
                            </div>
                            {passwordForm.formState.errors.currentPassword && (
                              <div className="sp-field-error">
                                <AlertTriangle size={12}/>{passwordForm.formState.errors.currentPassword.message}
                              </div>
                            )}
                          </div>

                          <div className="sp-field">
                            <FieldLabel>New Password</FieldLabel>
                            <div className="sp-input-wrap">
                              <input className="sp-input" type={showPw.nw?"text":"password"}
                                placeholder="Minimum 6 characters"
                                {...passwordForm.register("newPassword")}
                                style={{paddingRight:40}}/>
                              <button className="sp-input-eye" type="button"
                                onClick={()=>setShowPw(p=>({...p,nw:!p.nw}))}>
                                {showPw.nw ? <EyeOff size={15}/> : <Eye size={15}/>}
                              </button>
                            </div>
                            {pwStrength && (
                              <div className="sp-pw-strength">
                                <div className="sp-pw-bars">
                                  {[1,2,3,4].map(i=>(
                                    <div key={i} className={`sp-pw-bar${i<=pwStrength.level?" "+pwStrength.cls:""}`}/>
                                  ))}
                                </div>
                                <span className={`sp-pw-label ${pwStrength.cls}`}>{pwStrength.label}</span>
                              </div>
                            )}
                            {passwordForm.formState.errors.newPassword && (
                              <div className="sp-field-error">
                                <AlertTriangle size={12}/>{passwordForm.formState.errors.newPassword.message}
                              </div>
                            )}
                          </div>

                          <div className="sp-field">
                            <FieldLabel>Confirm New Password</FieldLabel>
                            <div className="sp-input-wrap">
                              <input className="sp-input" type={showPw.conf?"text":"password"}
                                placeholder="Re-enter new password"
                                {...passwordForm.register("confirmPassword")}
                                style={{paddingRight:40}}/>
                              <button className="sp-input-eye" type="button"
                                onClick={()=>setShowPw(p=>({...p,conf:!p.conf}))}>
                                {showPw.conf ? <EyeOff size={15}/> : <Eye size={15}/>}
                              </button>
                            </div>
                            {passwordForm.formState.errors.confirmPassword && (
                              <div className="sp-field-error">
                                <AlertTriangle size={12}/>{passwordForm.formState.errors.confirmPassword.message}
                              </div>
                            )}
                          </div>

                          <div className="sp-save-row">
                            <button className="sp-save-btn"
                              onClick={passwordForm.handleSubmit(d=>pwMutation.mutate(d))}
                              disabled={pwMutation.isPending}>
                              <Lock size={15}/>
                              {pwMutation.isPending ? "Changing…" : "Change Password"}
                            </button>
                          </div>
                        </div>

                        {/* Danger zone */}
                        <div className="sp-danger">
                          <div className="sp-danger-head">
                            <AlertTriangle size={18} color="#dc2626"/>
                            <div className="sp-danger-title">Danger Zone</div>
                          </div>
                          <p className="sp-danger-desc">
                            Permanently delete your account and all associated data.
                            This action cannot be undone.
                          </p>
                          <button className="sp-danger-btn">
                            <Trash2 size={14}/> Delete Account
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── GAMIFICATION ── */}
                    {activeSection==="gamification" && (
                      <div>
                        <div className="sp-section">
                          <SectionTitle>XP & Levels</SectionTitle>
                          <ToggleRow icon="👑" iconBg="rgba(245,158,11,.1)"  label="Level Up Notifications" desc="Celebrate when you level up"         checked={sf.gamification.levelUpNotifications} onChange={v=>set(["gamification","levelUpNotifications"],v)}/>
                          <ToggleRow icon="⭐" iconBg="rgba(99,102,241,.1)"  label="Points Display"         desc="Show XP and points in the UI"        checked={sf.gamification.pointsDisplay}        onChange={v=>set(["gamification","pointsDisplay"],v)}/>
                        </div>
                        <SaveRow onSave={settingsForm.handleSubmit(d=>updateMutation.mutate(d))} pending={updateMutation.isPending}/>
                      </div>
                    )}

                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}