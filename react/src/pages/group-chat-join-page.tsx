import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Navigation from "../components/navigation";
import { buildApiUrl } from "../lib/apiBase";

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(buildApiUrl(path), {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.message || "Request failed");
  return payload?.data ?? payload;
}

export default function GroupChatJoinPage({ token }: { token: string }) {
  const [, setLocation] = useLocation();
  const [invite, setInvite] = useState<any>(null);
  const [message, setMessage] = useState("Loading invite...");

  useEffect(() => {
    api(`/api/v1/group-chat/invites/${token}`)
      .then((data) => {
        setInvite(data);
        setMessage("");
      })
      .catch((error) => setMessage(error.message));
  }, [token]);

  async function accept() {
    try {
      await api(`/api/v1/group-chat/invites/${token}/accept`, { method: "POST" });
      setLocation("/communityNew");
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Plus Jakarta Sans,system-ui,sans-serif" }}>
      <Navigation />
      <div style={{ maxWidth: 520, margin: "80px auto", background: "#fff", border: "1px solid rgba(0,0,0,.08)", borderRadius: 18, padding: 28, boxShadow: "0 2px 16px rgba(0,0,0,.06)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Join Group Chat</h1>
        {invite ? (
          <>
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>You were invited to join <strong>{invite.group.name}</strong>.</p>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>Invite email: {invite.email}</p>
            <button onClick={accept} style={{ marginTop: 22, border: "none", borderRadius: 12, padding: "12px 18px", background: "#6366f1", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
              Accept invite
            </button>
          </>
        ) : (
          <p style={{ color: "#64748b" }}>{message}</p>
        )}
        {message && invite && <p style={{ marginTop: 12, color: "#ef4444", fontSize: 13 }}>{message}</p>}
      </div>
    </div>
  );
}
