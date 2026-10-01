import { useEffect, useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "../lib/queryClient";

const verificationRequests = new Map<string, Promise<string>>();

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Verifying your email…");
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setMessage("Verification link is missing or invalid."); return; }
    let active = true;
    if (!verificationRequests.has(token)) {
      verificationRequests.set(token, apiRequest("POST", "/api/v1/auth/student/verification/verify", { token })
        .then(response => response.json()).then(result => result.message as string));
    }
    verificationRequests.get(token)!
      .then(result => { if (active) { setMessage(result); setSuccess(true); } })
      .catch(() => { if (active) setMessage("Verification link is invalid or expired. Sign in to request a new one."); });
    return () => { active = false; };
  }, []);
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f7ff", padding: 24 }}>
    <section style={{ maxWidth: 480, width: "100%", background: "white", borderRadius: 20, padding: 32, boxShadow: "0 12px 40px #11224416" }}>
      <h1 style={{ marginBottom: 12 }}>GradeUp email verification</h1>
      <p role="status" style={{ marginBottom: 24 }}>{message}</p>
      <Link href="/auth">{success ? "Continue to sign in" : "Back to sign in"}</Link>
    </section>
  </main>;
}
