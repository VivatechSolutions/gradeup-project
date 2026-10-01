import { useEffect, useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "../lib/queryClient";
import GoogleRecaptcha from "../components/GoogleRecaptcha";
import logo from "../assets/logo-dark.png";

const verificationRequests = new Map<string, Promise<{ state: string; message: string }>>();

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Verifying your email…");
  const [success, setSuccess] = useState(false);
  const [state, setState] = useState("loading");
  const [email, setEmail] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setState("invalid"); setMessage("Verification link is missing. Request a new one below."); return; }
    let active = true;
    if (!verificationRequests.has(token)) {
      verificationRequests.set(token, apiRequest("POST", "/api/v1/auth/student/verification/verify", { token })
        .then(response => response.json()));
    }
    verificationRequests.get(token)!
      .then(result => { if (active) { setMessage(result.message); setState(result.state); setSuccess(result.state === "verified" || result.state === "already_verified"); } })
      .catch(() => { if (active) { setState("error"); setMessage("We could not check this link. Please try again later."); } });
    return () => { active = false; };
  }, []);
  async function resend(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !captcha) { setMessage("Enter your email and complete Google reCAPTCHA."); return; }
    setSending(true);
    try {
      const response = await apiRequest("POST", "/api/v1/auth/student/verification/resend", { email, recaptchaToken: captcha });
      setMessage((await response.json()).message);
    } catch { setMessage("We could not send a new link. Please try again later."); }
    finally { setSending(false); setCaptcha(""); setCaptchaKey(key => key + 1); }
  }
  const canResend = state === "expired" || state === "invalid";
  return <main className="verify-page">
    <style>{`.verify-page{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 85% 0%,#e8efff,#f7faff 55%);font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#14213d}.verify-wrap{width:min(100%,480px);text-align:center}.verify-logo{max-width:170px;max-height:56px;object-fit:contain;margin:0 auto 25px;display:block}.verify-card{background:#fff;border:1px solid #e2e8f0;border-top:4px solid #2563eb;border-radius:22px;padding:34px;box-shadow:0 18px 48px #10244a16;text-align:left}.verify-card h1{font-size:25px;margin:0 0 10px}.verify-card p{color:#64748b;line-height:1.6;margin:0 0 24px}.verify-card label{display:block;font-size:13px;font-weight:700;margin:0 0 7px}.verify-input{width:100%;border:1px solid #cbd5e1;border-radius:11px;padding:13px;font:inherit;margin-bottom:17px}.verify-button{display:block;width:100%;border:0;border-radius:11px;background:linear-gradient(100deg,#2563eb,#0ea5e9);color:white;text-align:center;text-decoration:none;font:inherit;font-weight:700;padding:14px;cursor:pointer;margin-top:16px}.verify-button:disabled{opacity:.55;cursor:not-allowed}.verify-back{display:block;text-align:center;margin-top:18px;color:#2563eb;font-weight:700;text-decoration:none}`}</style>
    <div className="verify-wrap"><img className="verify-logo" src={logo} alt="GradeUp" />
      <section className="verify-card" aria-live="polite">
        <h1>{state === "verified" ? "Email verified" : state === "already_verified" ? "Already verified" : state === "expired" ? "Link expired" : state === "loading" ? "Verifying email" : "Verify your email"}</h1>
        <p role="status">{message}</p>
        {canResend ? <form onSubmit={resend} noValidate>
          <label htmlFor="verify-resend-email">Email address</label>
          <input className="verify-input" id="verify-resend-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
          <GoogleRecaptcha onChange={setCaptcha} resetKey={captchaKey} />
          <button className="verify-button" type="submit" disabled={sending || !captcha}>{sending ? "Sending…" : "Resend verification email"}</button>
        </form> : <Link href="/auth" className="verify-button">{success ? "Continue to sign in" : "Back to sign in"}</Link>}
        <Link href="/auth" className="verify-back">Back to sign in</Link>
      </section></div>
  </main>;
}
