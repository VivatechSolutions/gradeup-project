import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Shield, RefreshCw, Eye, EyeOff, Lock,
  Loader2, AlertTriangle, ChevronLeft, Check,
  GraduationCap, KeyRound, ArrowRight, Sparkles,
} from "lucide-react";

// ── Design tokens — exact match to all dashboard pages ───────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

.fp-root{font-family:'Plus Jakarta Sans',system-ui,sans-serif;min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  background:var(--bg-app,#f8fafc);padding:24px 16px;}

/* ── Background decoration ── */
.fp-bg{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0;}
.fp-bg-blob1{position:absolute;top:-120px;right:-120px;width:400px;height:400px;
  border-radius:50%;background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.08));}
.fp-bg-blob2{position:absolute;bottom:-80px;left:-80px;width:280px;height:280px;
  border-radius:50%;background:linear-gradient(135deg,rgba(236,72,153,.08),rgba(99,102,241,.06));}

/* ── Container ── */
.fp-wrap{position:relative;z-index:1;width:100%;max-width:480px;}

/* ── Logo row ── */
.fp-logo{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:28px;}
.fp-logo-icon{width:48px;height:48px;border-radius:15px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 6px 20px rgba(99,102,241,.35);}
.fp-logo-text{font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-.3px;}
[data-theme="dark"] .fp-logo-text{color:#f1f5f9;}

/* ── Card ── */
.fp-card{background:#fff;border-radius:24px;border:1px solid rgba(0,0,0,.06);
  box-shadow:0 4px 28px rgba(0,0,0,.08);overflow:hidden;
  animation:cardIn .45s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes cardIn{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
[data-theme="dark"] .fp-card{background:#1e293b;border-color:rgba(255,255,255,.08);}

/* ── Step progress bar ── */
.fp-progress{height:4px;background:rgba(0,0,0,.06);position:relative;}
[data-theme="dark"] .fp-progress{background:rgba(255,255,255,.07);}
.fp-progress-fill{height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899);
  transition:width .5s cubic-bezier(.4,0,.2,1);border-radius:0 4px 4px 0;}

/* ── Card head ── */
.fp-card-head{padding:26px 28px 20px;}
.fp-head-icon{width:52px;height:52px;border-radius:16px;margin-bottom:14px;
  display:flex;align-items:center;justify-content:center;}
.fp-head-icon.blue  {background:rgba(99,102,241,.1);}
.fp-head-icon.green {background:rgba(16,185,129,.1);}
.fp-head-icon.amber {background:rgba(245,158,11,.1);}
.fp-card-title{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:5px;letter-spacing:-.2px;}
[data-theme="dark"] .fp-card-title{color:#f1f5f9;}
.fp-card-sub{font-size:13px;color:#64748b;line-height:1.6;}
[data-theme="dark"] .fp-card-sub{color:#94a3b8;}

/* ── Divider ── */
.fp-divider{height:1px;background:rgba(0,0,0,.06);margin:0;}
[data-theme="dark"] .fp-divider{background:rgba(255,255,255,.06);}

/* ── Card body ── */
.fp-card-body{padding:24px 28px;}

/* ── Step breadcrumb ── */
.fp-breadcrumb{display:flex;align-items:center;gap:6px;margin-bottom:20px;}
.fp-crumb{font-size:11.5px;font-weight:700;padding:4px 12px;border-radius:20px;
  display:flex;align-items:center;gap:5px;}
.fp-crumb.done{background:rgba(16,185,129,.1);color:#059669;}
.fp-crumb.active{background:rgba(99,102,241,.1);color:#6366f1;}
.fp-crumb.pending{background:rgba(0,0,0,.05);color:#94a3b8;}
[data-theme="dark"] .fp-crumb.pending{background:rgba(255,255,255,.06);}
.fp-crumb-sep{color:#cbd5e1;font-size:12px;}

/* ── Fields ── */
.fp-field{margin-bottom:16px;}
.fp-field-label{font-size:12.5px;font-weight:700;color:#374151;margin-bottom:6px;display:block;}
[data-theme="dark"] .fp-field-label{color:#94a3b8;}
.fp-input-wrap{position:relative;}
.fp-input-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);
  color:#94a3b8;display:flex;pointer-events:none;}
.fp-input{width:100%;padding:11px 14px;border-radius:12px;
  border:1.5px solid rgba(0,0,0,.08);background:#fff;font-family:inherit;
  font-size:13.5px;color:#0f172a;transition:border-color .18s,box-shadow .18s;outline:none;}
.fp-input.with-icon{padding-left:40px;}
.fp-input.with-eye{padding-right:40px;}
.fp-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1);}
.fp-input::placeholder{color:#cbd5e1;}
.fp-input.code{text-align:center;letter-spacing:.25em;font-size:20px;font-weight:800;
  color:#0f172a;padding:14px;}
[data-theme="dark"] .fp-input{background:#0f172a;border-color:rgba(255,255,255,.1);color:#f1f5f9;}
[data-theme="dark"] .fp-input.code{color:#f1f5f9;}
.fp-input-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);
  background:none;border:none;cursor:pointer;color:#94a3b8;padding:2px;display:flex;}
.fp-input-eye:hover{color:#6366f1;}
.fp-field-error{font-size:11.5px;color:#ef4444;margin-top:4px;display:flex;align-items:center;gap:4px;}
.fp-field-hint{font-size:11.5px;color:#94a3b8;margin-top:4px;}

/* ── Password strength ── */
.fp-pw-strength{display:flex;align-items:center;gap:8px;margin-top:8px;}
.fp-pw-bars{display:flex;gap:4px;}
.fp-pw-bar{height:4px;width:30px;border-radius:4px;background:#e2e8f0;transition:background .3s;}
.fp-pw-bar.weak  {background:#ef4444;}
.fp-pw-bar.fair  {background:#f59e0b;}
.fp-pw-bar.good  {background:#10b981;}
.fp-pw-bar.strong{background:#6366f1;}
.fp-pw-label{font-size:11px;font-weight:700;}
.fp-pw-label.weak  {color:#ef4444;}
.fp-pw-label.fair  {color:#f59e0b;}
.fp-pw-label.good  {color:#10b981;}
.fp-pw-label.strong{color:#6366f1;}

/* ── CAPTCHA ── */
.fp-captcha{border-radius:14px;border:1.5px solid rgba(0,0,0,.07);
  background:rgba(248,250,252,.8);padding:16px;}
[data-theme="dark"] .fp-captcha{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.07);}
.fp-captcha-img{display:flex;justify-content:center;margin-bottom:12px;
  background:#fff;border-radius:10px;padding:8px;border:1px solid rgba(0,0,0,.06);}
.fp-captcha-row{display:flex;gap:8px;align-items:center;}
.fp-captcha-refresh{width:42px;height:42px;border-radius:10px;
  border:1.5px solid rgba(0,0,0,.08);background:#fff;cursor:pointer;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  transition:all .18s;color:#64748b;}
.fp-captcha-refresh:hover{border-color:#6366f1;color:#6366f1;}
[data-theme="dark"] .fp-captcha-refresh{background:#0f172a;border-color:rgba(255,255,255,.1);}

/* ── Alert ── */
.fp-alert{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;
  border-radius:12px;margin-bottom:16px;}
.fp-alert.info{border:1.5px solid rgba(99,102,241,.2);background:rgba(99,102,241,.05);}
.fp-alert.danger{border:1.5px solid rgba(239,68,68,.2);background:rgba(239,68,68,.05);}
.fp-alert.success{border:1.5px solid rgba(16,185,129,.2);background:rgba(16,185,129,.05);}
.fp-alert-text{font-size:12.5px;line-height:1.5;}
.fp-alert.info    .fp-alert-text{color:#4f46e5;}
.fp-alert.danger  .fp-alert-text{color:#dc2626;}
.fp-alert.success .fp-alert-text{color:#059669;}

/* ── Primary button ── */
.fp-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;
  padding:13px 24px;border-radius:14px;border:none;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;
  transition:all .2s;box-shadow:0 4px 16px rgba(99,102,241,.32);}
.fp-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(99,102,241,.42);}
.fp-btn:active{transform:translateY(0);}
.fp-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
.fp-btn-row{display:flex;gap:10px;margin-top:6px;}
.fp-btn-row .fp-btn{flex:1;}
.fp-btn-outline{background:transparent;color:#6366f1;border:1.5px solid #a5b4fc;box-shadow:none;}
.fp-btn-outline:hover{background:rgba(99,102,241,.06);box-shadow:none;}

/* ── Success state ── */
.fp-success{text-align:center;padding:12px 0 4px;}
.fp-success-ring{width:80px;height:80px;border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex;align-items:center;justify-content:center;margin:0 auto 18px;
  box-shadow:0 8px 32px rgba(99,102,241,.4);
  animation:popIn .5s cubic-bezier(.34,1.56,.64,1);}
@keyframes popIn{from{scale:.5;opacity:0}to{scale:1;opacity:1}}
.fp-success-title{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:8px;}
[data-theme="dark"] .fp-success-title{color:#f1f5f9;}
.fp-success-sub{font-size:13.5px;color:#64748b;line-height:1.7;margin-bottom:20px;}

/* ── Invalid token ── */
.fp-invalid{text-align:center;padding:8px 0 4px;}
.fp-invalid-icon{width:68px;height:68px;border-radius:50%;
  background:rgba(239,68,68,.1);display:flex;align-items:center;
  justify-content:center;margin:0 auto 16px;}
.fp-invalid-title{font-size:18px;font-weight:800;color:#dc2626;margin-bottom:8px;}
.fp-invalid-sub{font-size:13px;color:#64748b;line-height:1.6;margin-bottom:20px;}

/* ── Footer ── */
.fp-footer{text-align:center;font-size:12.5px;color:#94a3b8;margin-top:20px;}
.fp-footer a{color:#6366f1;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;}
.fp-footer a:hover{text-decoration:underline;}

/* ── Security note ── */
.fp-security-note{display:flex;align-items:flex-start;gap:8px;padding:12px 14px;
  border-radius:12px;background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.06);
  margin-top:16px;}
[data-theme="dark"] .fp-security-note{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.06);}
.fp-security-text{font-size:11.5px;color:#94a3b8;line-height:1.5;}

/* ── Responsive ── */
@media(max-width:600px){
  .fp-root{padding:16px 12px;}
  .fp-card-body{padding:20px 18px;}
  .fp-card-head{padding:20px 18px 16px;}
  .fp-input.code{font-size:17px;letter-spacing:.18em;}
}
@media(max-width:400px){
  .fp-card-body{padding:18px 14px;}
  .fp-btn{font-size:13.5px;}
  .fp-pw-bar{width:22px;}
}
`;

// ── Schemas ───────────────────────────────────────────────────────────────────
const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  captchaAnswer: z.string().min(1,"Please solve the CAPTCHA"),
});

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  verificationCode: z.string().length(6,"Must be 6 digits"),
  newPassword: z.string().min(8,"At least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,"Must include uppercase, lowercase & number"),
  confirmPassword: z.string(),
  captchaAnswer: z.string().min(1,"Please solve the CAPTCHA"),
}).refine(d=>d.newPassword===d.confirmPassword,{ message:"Passwords don't match", path:["confirmPassword"] });

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPasswordStrength(pw: string) {
  if (!pw) return null;
  if (pw.length < 6)  return { level:1, label:"Weak",   cls:"weak"   };
  if (pw.length < 10) return { level:2, label:"Fair",   cls:"fair"   };
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw) && pw.length >= 12)
                      return { level:4, label:"Strong", cls:"strong" };
  return              { level:3, label:"Good",   cls:"good"   };
}

type FP = z.infer<typeof forgotSchema>;
type RP = z.infer<typeof resetSchema>;

// ── Main component ─────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const [location] = useLocation();
  const { toast }  = useToast();

  const urlParams  = new URLSearchParams(location.split("?")[1] || "");
  const tokenFromUrl = urlParams.get("token");

  // Which phase: 'forgot' | 'reset' | 'done'
  const [phase, setPhase] = useState<"forgot"|"reset"|"done">(tokenFromUrl ? "reset" : "forgot");

  // Shared state
  const [captchaData,   setCaptchaData]   = useState<{svg:string;sessionId:string}|null>(null);
  const [captchaLoading,setCaptchaLoading]= useState(false);

  // Forgot form
  const [fEmail,   setFEmail]   = useState("");
  const [fCaptcha, setFCaptcha] = useState("");
  const [fErrors,  setFErrors]  = useState<Record<string,string>>({});

  // Reset form
  const [rEmail, setREmail]     = useState("");
  const [rCode,  setRCode]      = useState("");
  const [rPw,    setRPw]        = useState("");
  const [rConf,  setRConf]      = useState("");
  const [rCaptcha,setRCaptcha]  = useState("");
  const [rErrors, setRErrors]   = useState<Record<string,string>>({});
  const [showPw,  setShowPw]    = useState(false);
  const [showConf,setShowConf]  = useState(false);

  const pwStrength = getPasswordStrength(rPw);

  // Token verification
  const { data: tokenVerification, isLoading: verifyingToken } = useQuery({
    queryKey: ["/api/reset-password/verify", tokenFromUrl],
    enabled: !!tokenFromUrl,
    queryFn: async () => {
      await new Promise(r=>setTimeout(r,500));
      return { valid: tokenFromUrl === "mock-reset-token-123" };
    },
  });

  // Load captcha
  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    await new Promise(r=>setTimeout(r,400));
    setCaptchaData({
      svg:`<svg width="150" height="50" viewBox="0 0 150 50" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="50" fill="#F3F4F6"/><text x="75" y="30" font-family="Arial" font-size="20" fill="#1F2937" text-anchor="middle" dominant-baseline="middle">GRADEUP</text><line x1="10" y1="15" x2="140" y2="35" stroke="#9CA3AF" stroke-width="1"/></svg>`,
      sessionId:"mock-session-123",
    });
    setCaptchaLoading(false);
  };

  useEffect(() => { loadCaptcha(); }, []);

  // Progress %
  const progressPct = phase==="forgot" ? 33 : phase==="reset" ? 66 : 100;

  // ── Forgot submit ──
  const forgotMutation = useMutation({
    mutationFn: async () => {
      await new Promise(r=>setTimeout(r,600));
      if (fCaptcha !== "GRADEUP") throw new Error("Incorrect security verification.");
      const known = ["student@example.com","teacher@example.com","admin@example.com"];
      if (!known.includes(fEmail)) throw new Error("No account found with that email. (Mock)");
    },
    onSuccess: () => {
      toast({ title:"Email sent!", description:"Use token: mock-reset-token-123 and code: 123456" });
      setPhase("reset");
      setCaptchaData(null);
      loadCaptcha();
    },
    onError: (e:Error) => {
      toast({ title:"Error", description:e.message, variant:"destructive" });
      loadCaptcha();
      setFCaptcha("");
    },
  });

  const handleForgotSubmit = () => {
    const errs: Record<string,string> = {};
    if (!fEmail) errs.email = "Required";
    else if (!/\S+@\S+\.\S+/.test(fEmail)) errs.email = "Invalid email";
    if (!fCaptcha) errs.captcha = "Required";
    setFErrors(errs);
    if (Object.keys(errs).length === 0) forgotMutation.mutate();
  };

  // ── Reset submit ──
  const resetMutation = useMutation({
    mutationFn: async () => {
      await new Promise(r=>setTimeout(r,600));
      if (rCaptcha !== "GRADEUP") throw new Error("Incorrect security verification.");
      if ((tokenFromUrl || "reset") !== "mock-reset-token-123") throw new Error("Invalid or expired token.");
      if (rCode !== "123456") throw new Error("Incorrect verification code.");
    },
    onSuccess: () => {
      setPhase("done");
    },
    onError: (e:Error) => {
      toast({ title:"Error", description:e.message, variant:"destructive" });
      loadCaptcha();
      setRCaptcha("");
    },
  });

  const handleResetSubmit = () => {
    const errs: Record<string,string> = {};
    if (!rEmail) errs.email = "Required";
    if (!rCode || rCode.length !== 6) errs.code = "Must be 6 digits";
    if (!rPw || rPw.length < 8) errs.pw = "At least 8 characters";
    if (rPw !== rConf) errs.conf = "Passwords don't match";
    if (!rCaptcha) errs.captcha = "Required";
    setRErrors(errs);
    if (Object.keys(errs).length === 0) resetMutation.mutate();
  };

  // Token loading / invalid states
  if (phase==="reset" && tokenFromUrl && verifyingToken) {
    return (
      <>
        <style>{CSS}</style>
        <div className="fp-root">
          <div className="fp-wrap">
            <div className="fp-logo">
              <div className="fp-logo-icon"><GraduationCap size={24} color="#fff"/></div>
              <span className="fp-logo-text">GradeUp!</span>
            </div>
            <div className="fp-card">
              <div className="fp-card-body" style={{textAlign:"center",padding:"40px 28px"}}>
                <Loader2 size={32} color="#6366f1" style={{animation:"spin 1s linear infinite",margin:"0 auto 14px"}}/>
                <div style={{fontSize:14,color:"#64748b"}}>Verifying reset link…</div>
              </div>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </>
    );
  }

  if (phase==="reset" && tokenFromUrl && tokenVerification && !tokenVerification.valid) {
    return (
      <>
        <style>{CSS}</style>
        <div className="fp-root">
          <div className="fp-bg"><div className="fp-bg-blob1"/><div className="fp-bg-blob2"/></div>
          <div className="fp-wrap">
            <div className="fp-logo">
              <div className="fp-logo-icon"><GraduationCap size={24} color="#fff"/></div>
              <span className="fp-logo-text">GradeUp!</span>
            </div>
            <div className="fp-card">
              <div className="fp-card-body">
                <div className="fp-invalid">
                  <div className="fp-invalid-icon"><AlertTriangle size={30} color="#dc2626"/></div>
                  <div className="fp-invalid-title">Invalid Reset Link</div>
                  <div className="fp-invalid-sub">This password reset link is invalid or has expired. Please request a new one.</div>
                  <Link href="/forgot-password">
                    <button className="fp-btn">Request New Link <ArrowRight size={16}/></button>
                  </Link>
                </div>
              </div>
            </div>
            <div className="fp-footer">
              <Link href="/login"><ChevronLeft size={13}/> Back to sign in</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="fp-root">
        <div className="fp-bg"><div className="fp-bg-blob1"/><div className="fp-bg-blob2"/></div>

        <div className="fp-wrap">
          <div className="fp-logo">
            <div className="fp-logo-icon"><GraduationCap size={24} color="#fff"/></div>
            <span className="fp-logo-text">GradeUp!</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={phase}
              initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.2}}>

              <div className="fp-card">
                {/* Progress bar */}
                <div className="fp-progress">
                  <div className="fp-progress-fill" style={{width:`${progressPct}%`}}/>
                </div>

                {/* ── FORGOT phase ── */}
                {phase==="forgot" && (
                  <>
                    <div className="fp-card-head">
                      <div className="fp-head-icon blue"><KeyRound size={24} color="#6366f1"/></div>
                      <div className="fp-card-title">Forgot Password?</div>
                      <div className="fp-card-sub">Enter your email and we'll send you reset instructions.</div>
                    </div>
                    <div className="fp-divider"/>
                    <div className="fp-card-body">

                      {/* Step breadcrumb */}
                      <div className="fp-breadcrumb">
                        <div className="fp-crumb active"><span>1</span> Email</div>
                        <span className="fp-crumb-sep">›</span>
                        <div className="fp-crumb pending"><span>2</span> Reset</div>
                        <span className="fp-crumb-sep">›</span>
                        <div className="fp-crumb pending"><span>3</span> Done</div>
                      </div>

                      <div className="fp-field">
                        <label className="fp-field-label">Email Address</label>
                        <div className="fp-input-wrap">
                          <span className="fp-input-icon"><Mail size={15}/></span>
                          <input className="fp-input with-icon" type="email" placeholder="you@example.com"
                            value={fEmail} onChange={e=>setFEmail(e.target.value)}/>
                        </div>
                        {fErrors.email && <div className="fp-field-error"><AlertTriangle size={11}/>{fErrors.email}</div>}
                      </div>

                      <div className="fp-field">
                        <label className="fp-field-label">Security Verification</label>
                        <div className="fp-captcha">
                          {captchaData ? (
                            <>
                              <div className="fp-captcha-img" dangerouslySetInnerHTML={{__html:captchaData.svg}}/>
                              <div className="fp-captcha-row">
                                <input className="fp-input" style={{flex:1,textAlign:"center"}}
                                  placeholder="Enter the text above"
                                  value={fCaptcha} onChange={e=>setFCaptcha(e.target.value)}/>
                                <button className="fp-captcha-refresh" type="button" onClick={loadCaptcha} disabled={captchaLoading}>
                                  <RefreshCw size={15} style={{animation:captchaLoading?"spin 1s linear infinite":"none"}}/>
                                </button>
                              </div>
                            </>
                          ) : (
                            <button className="fp-btn fp-btn-outline" type="button" onClick={loadCaptcha} style={{marginTop:0}}>
                              {captchaLoading ? <><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Loading…</> : <><Shield size={14}/> Load Verification</>}
                            </button>
                          )}
                        </div>
                        {fErrors.captcha && <div className="fp-field-error"><AlertTriangle size={11}/>{fErrors.captcha}</div>}
                      </div>

                      <button className="fp-btn" onClick={handleForgotSubmit} disabled={forgotMutation.isPending}>
                        {forgotMutation.isPending
                          ? <><Loader2 size={15} style={{animation:"spin 1s linear infinite"}}/> Sending…</>
                          : <>Send Reset Instructions <ArrowRight size={16}/></>}
                      </button>

                      <div className="fp-security-note">
                        <Shield size={14} color="#94a3b8" style={{flexShrink:0,marginTop:1}}/>
                        <div className="fp-security-text">Protected by CAPTCHA verification and rate limiting. Resets expire after 15 minutes.</div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── RESET phase ── */}
                {phase==="reset" && (
                  <>
                    <div className="fp-card-head">
                      <div className="fp-head-icon blue"><Lock size={24} color="#6366f1"/></div>
                      <div className="fp-card-title">Reset Password</div>
                      <div className="fp-card-sub">Enter the verification code from your email and create a new password.</div>
                    </div>
                    <div className="fp-divider"/>
                    <div className="fp-card-body">

                      <div className="fp-breadcrumb">
                        <div className="fp-crumb done"><Check size={11}/> Email</div>
                        <span className="fp-crumb-sep">›</span>
                        <div className="fp-crumb active"><span>2</span> Reset</div>
                        <span className="fp-crumb-sep">›</span>
                        <div className="fp-crumb pending"><span>3</span> Done</div>
                      </div>

                      <div className="fp-alert info">
                        <Sparkles size={14} color="#4f46e5" style={{flexShrink:0,marginTop:1}}/>
                        <div className="fp-alert-text"><strong>Demo hint:</strong> Use token <code>mock-reset-token-123</code> and code <code>123456</code></div>
                      </div>

                      <div className="fp-field">
                        <label className="fp-field-label">Email Address</label>
                        <div className="fp-input-wrap">
                          <span className="fp-input-icon"><Mail size={15}/></span>
                          <input className="fp-input with-icon" type="email" placeholder="you@example.com"
                            value={rEmail} onChange={e=>setREmail(e.target.value)}/>
                        </div>
                        {rErrors.email && <div className="fp-field-error"><AlertTriangle size={11}/>{rErrors.email}</div>}
                      </div>

                      <div className="fp-field">
                        <label className="fp-field-label">6-Digit Verification Code</label>
                        <input className="fp-input code" type="text" maxLength={6} placeholder="· · · · · ·"
                          value={rCode} onChange={e=>setRCode(e.target.value.replace(/\D/g,"").slice(0,6))}/>
                        {rErrors.code && <div className="fp-field-error"><AlertTriangle size={11}/>{rErrors.code}</div>}
                        <div className="fp-field-hint">Check your email inbox for the verification code.</div>
                      </div>

                      <div className="fp-field">
                        <label className="fp-field-label">New Password</label>
                        <div className="fp-input-wrap">
                          <input className="fp-input with-eye" type={showPw?"text":"password"}
                            placeholder="Min 8 chars with upper, lower & number"
                            value={rPw} onChange={e=>setRPw(e.target.value)}/>
                          <button type="button" className="fp-input-eye" onClick={()=>setShowPw(!showPw)}>
                            {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                          </button>
                        </div>
                        {pwStrength && (
                          <div className="fp-pw-strength">
                            <div className="fp-pw-bars">
                              {[1,2,3,4].map(i=>(
                                <div key={i} className={`fp-pw-bar${i<=pwStrength.level?" "+pwStrength.cls:""}`}/>
                              ))}
                            </div>
                            <span className={`fp-pw-label ${pwStrength.cls}`}>{pwStrength.label}</span>
                          </div>
                        )}
                        {rErrors.pw && <div className="fp-field-error"><AlertTriangle size={11}/>{rErrors.pw}</div>}
                      </div>

                      <div className="fp-field">
                        <label className="fp-field-label">Confirm New Password</label>
                        <div className="fp-input-wrap">
                          <input className="fp-input with-eye" type={showConf?"text":"password"}
                            placeholder="Re-enter password"
                            value={rConf} onChange={e=>setRConf(e.target.value)}/>
                          <button type="button" className="fp-input-eye" onClick={()=>setShowConf(!showConf)}>
                            {showConf?<EyeOff size={15}/>:<Eye size={15}/>}
                          </button>
                        </div>
                        {rErrors.conf && <div className="fp-field-error"><AlertTriangle size={11}/>{rErrors.conf}</div>}
                      </div>

                      <div className="fp-field">
                        <label className="fp-field-label">Security Verification</label>
                        <div className="fp-captcha">
                          {captchaData ? (
                            <>
                              <div className="fp-captcha-img" dangerouslySetInnerHTML={{__html:captchaData.svg}}/>
                              <div className="fp-captcha-row">
                                <input className="fp-input" style={{flex:1,textAlign:"center"}}
                                  placeholder="Enter the text above"
                                  value={rCaptcha} onChange={e=>setRCaptcha(e.target.value)}/>
                                <button className="fp-captcha-refresh" type="button" onClick={loadCaptcha} disabled={captchaLoading}>
                                  <RefreshCw size={15} style={{animation:captchaLoading?"spin 1s linear infinite":"none"}}/>
                                </button>
                              </div>
                            </>
                          ) : (
                            <button className="fp-btn fp-btn-outline" type="button" onClick={loadCaptcha} style={{marginTop:0}}>
                              {captchaLoading ? <><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Loading…</> : <><Shield size={14}/> Load Verification</>}
                            </button>
                          )}
                        </div>
                        {rErrors.captcha && <div className="fp-field-error"><AlertTriangle size={11}/>{rErrors.captcha}</div>}
                      </div>

                      <div className="fp-btn-row">
                        <button className="fp-btn fp-btn-outline" onClick={()=>{ setPhase("forgot"); loadCaptcha(); }}>
                          <ChevronLeft size={15}/> Back
                        </button>
                        <button className="fp-btn" onClick={handleResetSubmit} disabled={resetMutation.isPending}>
                          {resetMutation.isPending
                            ? <><Loader2 size={15} style={{animation:"spin 1s linear infinite"}}/> Resetting…</>
                            : <>Reset Password <Check size={16}/></>}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── DONE phase ── */}
                {phase==="done" && (
                  <>
                    <div className="fp-card-head">
                      <div className="fp-head-icon green" style={{background:"rgba(16,185,129,.1)"}}>
                        <Check size={24} color="#10b981"/>
                      </div>
                      <div className="fp-card-title">Password Reset!</div>
                      <div className="fp-card-sub">Your password has been updated successfully.</div>
                    </div>
                    <div className="fp-divider"/>
                    <div className="fp-card-body">

                      <div className="fp-breadcrumb">
                        <div className="fp-crumb done"><Check size={11}/> Email</div>
                        <span className="fp-crumb-sep">›</span>
                        <div className="fp-crumb done"><Check size={11}/> Reset</div>
                        <span className="fp-crumb-sep">›</span>
                        <div className="fp-crumb active"><Check size={11}/> Done</div>
                      </div>

                      <div className="fp-success">
                        <div className="fp-success-ring"><Check size={36} color="#fff"/></div>
                        <div className="fp-success-title">All done! 🎉</div>
                        <div className="fp-success-sub">Your account password has been updated. Sign in with your new password to continue learning.</div>
                        <Link href="/login">
                          <button className="fp-btn">Go to Sign In <ArrowRight size={16}/></button>
                        </Link>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </motion.div>
          </AnimatePresence>

          <div className="fp-footer">
            <Link href="/login"><ChevronLeft size={13}/> Back to sign in</Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </>
  );
}