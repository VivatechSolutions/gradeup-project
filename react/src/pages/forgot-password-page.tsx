import { useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "../lib/queryClient";
import GoogleRecaptcha from "../components/GoogleRecaptcha";
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

.fp-root{font-family:'Plus Jakarta Sans',system-ui,sans-serif;min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  background:var(--bg-app,#f8fafc);padding:24px 16px;}
.dark .fp-root, [data-theme="dark"] .fp-root{background:#0f172a;}

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
.dark, [data-theme="dark"] .fp-logo-text{color:#f1f5f9;}

/* ── Card ── */
.fp-card{background:#fff;border-radius:24px;border:1px solid rgba(0,0,0,.06);
  box-shadow:0 4px 28px rgba(0,0,0,.08);overflow:hidden;
  animation:cardIn .45s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes cardIn{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
.dark, [data-theme="dark"] .fp-card{background:#1e293b;border-color:rgba(255,255,255,.08);}

/* ── Step progress bar ── */
.fp-progress{height:4px;background:rgba(0,0,0,.06);position:relative;}
.dark, [data-theme="dark"] .fp-progress{background:rgba(255,255,255,.07);}
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
.dark, [data-theme="dark"] .fp-card-title{color:#f1f5f9;}
.fp-card-sub{font-size:13px;color:#64748b;line-height:1.6;}
.dark, [data-theme="dark"] .fp-card-sub{color:#94a3b8;}

/* ── Divider ── */
.fp-divider{height:1px;background:rgba(0,0,0,.06);margin:0;}
.dark, [data-theme="dark"] .fp-divider{background:rgba(255,255,255,.06);}

/* ── Card body ── */
.fp-card-body{padding:24px 28px;}

/* ── Step breadcrumb ── */
.fp-breadcrumb{display:flex;align-items:center;gap:6px;margin-bottom:20px;}
.fp-crumb{font-size:11.5px;font-weight:700;padding:4px 12px;border-radius:20px;
  display:flex;align-items:center;gap:5px;}
.fp-crumb.done{background:rgba(16,185,129,.1);color:#059669;}
.fp-crumb.active{background:rgba(99,102,241,.1);color:#6366f1;}
.fp-crumb.pending{background:rgba(0,0,0,.05);color:#94a3b8;}
.dark, [data-theme="dark"] .fp-crumb.pending{background:rgba(255,255,255,.06);}
.fp-crumb-sep{color:#cbd5e1;font-size:12px;}

/* ── Fields ── */
.fp-field{margin-bottom:16px;}
.fp-field-label{font-size:12.5px;font-weight:700;color:#374151;margin-bottom:6px;display:block;}
.dark, [data-theme="dark"] .fp-field-label{color:#94a3b8;}
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
.dark, [data-theme="dark"] .fp-input{background:#0f172a;border-color:rgba(255,255,255,.1);color:#f1f5f9;}
.dark, [data-theme="dark"] .fp-input.code{color:#f1f5f9;}
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
.dark, [data-theme="dark"] .fp-captcha{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.07);}
.fp-captcha-img{display:flex;justify-content:center;margin-bottom:12px;
  background:#fff;border-radius:10px;padding:8px;border:1px solid rgba(0,0,0,.06);}
.fp-captcha-row{display:flex;gap:8px;align-items:center;}
.fp-captcha-refresh{width:42px;height:42px;border-radius:10px;
  border:1.5px solid rgba(0,0,0,.08);background:#fff;cursor:pointer;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  transition:all .18s;color:#64748b;}
.fp-captcha-refresh:hover{border-color:#6366f1;color:#6366f1;}
.dark, [data-theme="dark"] .fp-captcha-refresh{background:#0f172a;border-color:rgba(255,255,255,.1);}

/* ── Alert ── */
.fp-alert{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;
  border-radius:12px;margin-bottom:16px;color: white;}
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
.dark, [data-theme="dark"] .fp-success-title{color:#f1f5f9;}
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
  margin-top:16px;color:#ffff}
.dark, [data-theme="dark"] .fp-security-note{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.06);}
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

export default function ForgotPasswordPage() {
  const token = new URLSearchParams(window.location.search).get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!token && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    if (
      token &&
      (password.length < 8 || new TextEncoder().encode(password).length > 72)
    ) {
      setError("Use a password of at least 8 characters and at most 72 bytes");
      return;
    }
    if (token && password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (!recaptchaToken) {
      setError("Please complete Google reCAPTCHA");
      return;
    }
    setBusy(true);
    try {
      const response = await apiRequest(
        "POST",
        token ? "/api/v1/auth/reset-password" : "/api/v1/auth/forgot-password",
        token
          ? { token, newPassword: password, recaptchaToken }
          : { email: email.trim().toLowerCase(), recaptchaToken },
      );
      const result = await response.json();
      setMessage(result.message);
      if (token) setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setRecaptchaToken("");
      setResetKey((k) => k + 1);
    }
  }
  return (
    <>
      <style>{CSS}</style>
      <main className="fp-root">
        <div className="fp-wrap">
          <div className="fp-logo">
            <span className="fp-logo-text">GradeUp!</span>
          </div>
          <div className="fp-card">
            <div className="fp-card-head">
              <h1 className="fp-card-title">
                {done
                  ? "Password updated"
                  : token
                    ? "Reset Password"
                    : "Forgot Password?"}
              </h1>
              <p className="fp-card-sub">
                {token
                  ? "Choose your new account password."
                  : "Enter your email and we'll send you a reset link."}
              </p>
            </div>
            <form className="fp-card-body" onSubmit={submit}>
              {error && (
                <p className="fp-alert danger" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p className="fp-alert success" role="status">
                  {message}
                </p>
              )}
              {!done && (
                <>
                  {!token ? (
                    <div className="fp-field">
                      <label htmlFor="reset-email" className="fp-field-label">
                        Email Address
                      </label>
                      <input
                        id="reset-email"
                        className="fp-input"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="fp-field">
                        <label
                          htmlFor="reset-password"
                          className="fp-field-label"
                        >
                          New password
                        </label>
                        <input
                          id="reset-password"
                          className="fp-input"
                          type="password"
                          autoComplete="new-password"
                          required
                          minLength={8}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <div className="fp-field">
                        <label
                          htmlFor="reset-confirm"
                          className="fp-field-label"
                        >
                          Confirm password
                        </label>
                        <input
                          id="reset-confirm"
                          className="fp-input"
                          type="password"
                          autoComplete="new-password"
                          required
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <div className="fp-field">
                    <GoogleRecaptcha
                      onChange={setRecaptchaToken}
                      resetKey={resetKey}
                    />
                  </div>
                  <button
                    className="fp-btn"
                    disabled={busy || !recaptchaToken}
                    type="submit"
                  >
                    {busy
                      ? "Please wait…"
                      : token
                        ? "Reset Password"
                        : "Send Reset Instructions"}
                  </button>
                  <p className="fp-security-note">
                    Protected by Google reCAPTCHA. Reset links expire after 15
                    minutes.
                  </p>
                </>
              )}
            </form>
          </div>
          <div className="fp-footer">
            <Link href="/auth">Back to sign in</Link>
            {token && !done && (
              <p>
                <a href="/forgot-password">Request a new reset link</a>
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
