import { useState, useRef, useEffect, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const SUBJECTS = {
  General:    { emoji: "✦", accent: "#6366f1", light: "#eef2ff", label: "General" },
  Mathematics:{ emoji: "∑", accent: "#0ea5e9", light: "#e0f2fe", label: "Mathematics" },
  Science:    { emoji: "⚗", accent: "#10b981", light: "#d1fae5", label: "Science" },
  Literature: { emoji: "✍", accent: "#8b5cf6", light: "#ede9fe", label: "Literature" },
  History:    { emoji: "⏳", accent: "#f59e0b", light: "#fef3c7", label: "History" },
  Coding:     { emoji: "</>", accent: "#ef4444", light: "#fee2e2", label: "Coding" },
};

const SYSTEM_PROMPTS = {
  General: `You are GradeUp, a warm, knowledgeable academic tutor. Guide students with Socratic hints rather than giving direct answers. Be encouraging, use clear structure, and adapt to the student's level. Keep responses concise and actionable.`,
  Mathematics: `You are GradeUp Math Tutor. Break down math problems step-by-step with clear logical reasoning. Show working, explain formulas, and encourage the student to try each step. Use LaTeX-style notation when helpful. Never just give the final answer.`,
  Science: `You are GradeUp Science Tutor. Explain scientific concepts clearly with real-world analogies. Guide students to reason from first principles. Encourage hypothesis-forming and critical thinking.`,
  Literature: `You are GradeUp Literature Tutor. Help students analyze texts, identify themes, literary devices, and develop strong arguments. Ask probing questions. Help structure essays with clear thesis and evidence.`,
  History: `You are GradeUp History Tutor. Provide historical context, cause-and-effect analysis, and multiple perspectives. Help students build arguments with evidence. Never just list facts — connect them meaningfully.`,
  Coding: `You are GradeUp Coding Tutor. Explain programming concepts clearly. Guide students to debug their own code through questions. Provide pseudocode or partial examples. Emphasize understanding over copy-pasting.`,
};

const WELCOME_MSGS = {
  General: "Ask me anything — I'll guide you through it step by step.",
  Mathematics: "Share a problem and we'll break it down together.",
  Science: "What concept or question shall we explore today?",
  Literature: "Share a text, question, or essay prompt to get started.",
  History: "Which event, era, or question would you like to dive into?",
  Coding: "Paste your code or describe what you're trying to build.",
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HomeworkHelper() {
  const [sessions, setSessions] = useState([{ id: "1", subject: "General", title: "New Session", messages: [] }]);
  const [activeId, setActiveId] = useState("1");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notepad, setNotepad] = useState("");
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const subjectMenuRef = useRef(null);

  const active = sessions.find(s => s.id === activeId);
  const subject = active?.subject || "General";
  const theme = SUBJECTS[subject];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  useEffect(() => {
    const handler = (e) => { if (subjectMenuRef.current && !subjectMenuRef.current.contains(e.target)) setSubjectMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const updateSession = useCallback((id, updater) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updater(s) } : s));
  }, []);

  const newSession = () => {
    const id = Date.now().toString();
    setSessions(prev => [{ id, subject: "General", title: "New Session", messages: [] }, ...prev]);
    setActiveId(id);
    setSidebarOpen(false);
  };

  const changeSubject = (sub) => {
    updateSession(activeId, s => ({ subject: sub }));
    setSubjectMenuOpen(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");

    const userMsg = { id: Date.now().toString(), role: "user", content: userText };
    const sessionTitle = userText.length > 32 ? userText.slice(0, 32) + "…" : userText;

    updateSession(activeId, s => ({
      title: s.messages.length === 0 ? sessionTitle : s.title,
      messages: [...s.messages, userMsg],
    }));

    setLoading(true);

    try {
      const currentSession = sessions.find(s => s.id === activeId);
      const history = [...(currentSession?.messages || []), userMsg];

      const apiMessages = history.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPTS[subject] || SYSTEM_PROMPTS.General,
          messages: apiMessages,
        }),
      });

      const data = await res.json();
      const aiText = data.content?.map(b => b.text || "").join("") || "I couldn't process that. Please try again.";
      const aiMsg = { id: (Date.now() + 1).toString(), role: "ai", content: aiText };

      updateSession(activeId, s => ({ messages: [...s.messages, aiMsg] }));
    } catch (err) {
      const errMsg = { id: (Date.now() + 1).toString(), role: "ai", content: "Connection error. Please check your network and try again.", isError: true };
      updateSession(activeId, s => ({ messages: [...s.messages, errMsg] }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => updateSession(activeId, () => ({ messages: [], title: "New Session" }));

  const exportChat = () => {
    const msgs = active?.messages || [];
    if (!msgs.length) return;
    const text = msgs.map(m => `${m.role === "user" ? "You" : "GradeUp"}: ${m.content}`).join("\n\n");
    const blob = new Blob([`GradeUp — ${subject} Session\n${"─".repeat(40)}\n\n${text}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gradeup-${subject.toLowerCase()}-session.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const renderMessage = (msg) => {
    const isUser = msg.role === "user";
    return (
      <div key={msg.id} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 20, animation: "fadeUp 0.25s ease" }}>
        {!isUser && (
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0, marginRight: 10, marginTop: 2, fontFamily: "'DM Serif Display', Georgia, serif" }}>
            G
          </div>
        )}
        <div style={{
          maxWidth: "75%",
          padding: isUser ? "12px 18px" : "14px 18px",
          borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
          background: isUser ? theme.accent : "var(--msg-bg, #f8f9fa)",
          color: isUser ? "#fff" : "inherit",
          fontSize: 15,
          lineHeight: 1.7,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          border: isUser ? "none" : "1px solid var(--border-color, #e5e7eb)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {msg.content}
        </div>
        {isUser && (
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginLeft: 10, marginTop: 2, color: "#6b7280" }}>
            U
          </div>
        )}
      </div>
    );
  };

  const TypingDots = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "'DM Serif Display', Georgia, serif" }}>G</div>
      <div style={{ display: "flex", gap: 5, padding: "12px 16px", background: "var(--msg-bg, #f8f9fa)", border: "1px solid var(--border-color, #e5e7eb)", borderRadius: "20px 20px 20px 4px" }}>
        {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: theme.accent, display: "block", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
      </div>
    </div>
  );

  const messages = active?.messages || [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #ffffff; --sidebar-bg: #fafafa; --border: #e5e7eb;
          --text: #111827; --text-muted: #6b7280; --input-bg: #f9fafb;
          --msg-bg: #f3f4f6; --border-color: #e5e7eb;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #0f1117; --sidebar-bg: #161b27; --border: #1f2937;
            --text: #f9fafb; --text-muted: #9ca3af; --input-bg: #1f2937;
            --msg-bg: #1f2937; --border-color: #374151;
          }
        }
        body { font-family: 'DM Sans', system-ui, sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-6px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .hw-root { display:flex; height:100vh; background:var(--bg); color:var(--text); overflow:hidden; }
        .sidebar { width:260px; background:var(--sidebar-bg); border-right:1px solid var(--border); display:flex; flex-direction:column; flex-shrink:0; transition:transform 0.3s ease; }
        .sidebar-header { padding:20px 16px 12px; border-bottom:1px solid var(--border); }
        .brand { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .brand-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-family:'DM Serif Display',Georgia,serif; font-size:16px; color:#fff; flex-shrink:0; }
        .brand-name { font-family:'DM Serif Display',Georgia,serif; font-size:18px; letter-spacing:-0.3px; color:var(--text); }
        .brand-name span { font-style:italic; }
        .new-btn { width:100%; padding:9px; border-radius:10px; border:1px solid var(--border); background:transparent; color:var(--text); font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:background 0.15s, border-color 0.15s; }
        .new-btn:hover { background:var(--msg-bg); border-color:var(--text-muted); }
        .sessions-list { flex:1; overflow-y:auto; padding:12px 8px; }
        .sessions-list::-webkit-scrollbar { width:4px; } .sessions-list::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
        .session-item { padding:10px 10px; border-radius:8px; cursor:pointer; transition:background 0.15s; margin-bottom:2px; }
        .session-item:hover { background:var(--msg-bg); }
        .session-item.active { background:var(--msg-bg); }
        .session-title { font-size:13px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .session-sub { font-size:11px; color:var(--text-muted); margin-top:2px; }
        .sidebar-footer { padding:14px 16px; border-top:1px solid var(--border); }
        .main { flex:1; display:flex; flex-direction:column; min-width:0; }
        .topbar { display:flex; align-items:center; gap:10px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; background:var(--bg); }
        .menu-btn { display:none; width:36px; height:36px; border:1px solid var(--border); border-radius:8px; background:transparent; cursor:pointer; color:var(--text-muted); align-items:center; justify-content:center; flex-shrink:0; }
        .subject-btn { display:flex; align-items:center; gap:8px; padding:7px 14px; border:1px solid var(--border); border-radius:20px; background:transparent; cursor:pointer; transition:all 0.15s; color:var(--text); font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; }
        .subject-btn:hover { border-color:var(--text-muted); background:var(--msg-bg); }
        .subject-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .topbar-actions { margin-left:auto; display:flex; align-items:center; gap:8px; }
        .icon-btn { width:34px; height:34px; border:1px solid var(--border); border-radius:8px; background:transparent; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
        .icon-btn:hover { background:var(--msg-bg); color:var(--text); border-color:var(--text-muted); }
        .notepad-btn { padding:7px 14px; border:1px solid var(--border); border-radius:20px; background:transparent; cursor:pointer; color:var(--text-muted); font-family:'DM Sans',sans-serif; font-size:13px; display:flex; align-items:center; gap:6px; transition:all 0.15s; }
        .notepad-btn:hover { background:var(--msg-bg); color:var(--text); }
        .chat-area { flex:1; overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; }
        .chat-area::-webkit-scrollbar { width:4px; } .chat-area::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
        .welcome { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:40px 20px; }
        .welcome-icon { width:64px; height:64px; border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 20px; font-family:'DM Serif Display',Georgia,serif; }
        .welcome-title { font-family:'DM Serif Display',Georgia,serif; font-size:28px; letter-spacing:-0.5px; color:var(--text); margin-bottom:8px; }
        .welcome-sub { font-size:15px; color:var(--text-muted); line-height:1.6; max-width:360px; }
        .quick-pills { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:24px; }
        .pill { padding:8px 16px; border:1px solid var(--border); border-radius:20px; font-size:13px; cursor:pointer; color:var(--text); background:transparent; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .pill:hover { background:var(--msg-bg); border-color:var(--text-muted); }
        .input-area { padding:16px 20px; border-top:1px solid var(--border); background:var(--bg); flex-shrink:0; }
        .input-wrap { display:flex; gap:10px; align-items:flex-end; max-width:780px; margin:0 auto; }
        .textarea-wrap { flex:1; border:1.5px solid var(--border); border-radius:16px; background:var(--input-bg); overflow:hidden; display:flex; align-items:flex-end; transition:border-color 0.2s; }
        .textarea-wrap:focus-within { border-color: #6366f1; }
        textarea { width:100%; resize:none; border:none; background:transparent; padding:12px 14px; font-family:'DM Sans',sans-serif; font-size:15px; color:var(--text); line-height:1.6; outline:none; min-height:46px; max-height:160px; }
        textarea::placeholder { color:var(--text-muted); }
        .send-btn { width:44px; height:44px; border-radius:12px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.15s; }
        .send-btn:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); }
        .send-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .subject-dropdown { position:absolute; top:calc(100% + 6px); left:0; background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:6px; z-index:100; min-width:180px; box-shadow:0 8px 24px rgba(0,0,0,0.12); animation:fadeUp 0.15s ease; }
        .subject-opt { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:var(--text); transition:background 0.1s; }
        .subject-opt:hover { background:var(--msg-bg); }
        .overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:40; }
        .notepad-panel { position:fixed; right:0; top:0; bottom:0; width:360px; background:var(--bg); border-left:1px solid var(--border); display:flex; flex-direction:column; z-index:50; transform:translateX(100%); transition:transform 0.3s ease; }
        .notepad-panel.open { transform:translateX(0); }
        .notepad-header { padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .notepad-title { font-family:'DM Serif Display',Georgia,serif; font-size:16px; }
        .notepad-body { flex:1; padding:16px; }
        .notepad-textarea { width:100%; height:100%; resize:none; border:none; background:transparent; font-family:'DM Sans',sans-serif; font-size:14px; color:var(--text); line-height:1.8; outline:none; }
        .notepad-textarea::placeholder { color:var(--text-muted); }
        @media (max-width: 768px) {
          .sidebar { position:fixed; left:0; top:0; bottom:0; z-index:50; transform:translateX(-100%); }
          .sidebar.open { transform:translateX(0); }
          .menu-btn { display:flex !important; }
          .overlay.show { display:block; }
          .notepad-panel { width:100%; }
          .notepad-btn span { display:none; }
          .chat-area { padding:16px 12px; }
          .input-area { padding:12px; }
          .welcome-title { font-size:22px; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar { width:220px; }
          .chat-area { padding:20px 16px; }
        }
        .hint-text { font-size:12px; color:var(--text-muted); text-align:center; margin-top:8px; }
      `}</style>

      <div className="hw-root">
        {/* Overlay for mobile */}
        <div className={`overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <div className="brand">
              <div className="brand-icon" style={{ background: theme.accent }}>G</div>
              <div className="brand-name">Grade<span>Up</span></div>
            </div>
            <button className="new-btn" onClick={newSession}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Session
            </button>
          </div>

          <div className="sessions-list">
            {sessions.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 10px" }}>No sessions yet</p>
            ) : sessions.map(s => (
              <div key={s.id} className={`session-item ${s.id === activeId ? "active" : ""}`} onClick={() => { setActiveId(s.id); setSidebarOpen(false); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: SUBJECTS[s.subject]?.accent }}>{SUBJECTS[s.subject]?.emoji}</span>
                  <span className="session-title">{s.title}</span>
                </div>
                <div className="session-sub">{s.subject} · {s.messages.length} msg{s.messages.length !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text)", fontWeight: 600 }}>GradeUp</strong> — Your AI study companion.<br />
              Hints, not answers. Always.
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="main">
          {/* Top bar */}
          <div className="topbar">
            <button className="menu-btn" style={{ display: "flex" }} onClick={() => setSidebarOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>

            {/* Subject selector */}
            <div style={{ position: "relative" }} ref={subjectMenuRef}>
              <button className="subject-btn" onClick={() => setSubjectMenuOpen(v => !v)}>
                <span className="subject-dot" style={{ background: theme.accent }} />
                <span style={{ fontFamily: "'DM Serif Display',Georgia,serif", fontSize: 14 }}>{theme.emoji}</span>
                {theme.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 2 }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {subjectMenuOpen && (
                <div className="subject-dropdown">
                  {Object.entries(SUBJECTS).map(([key, val]) => (
                    <div key={key} className="subject-opt" onClick={() => changeSubject(key)}>
                      <span className="subject-dot" style={{ background: val.accent }} />
                      <span style={{ fontFamily: "'DM Serif Display',Georgia,serif" }}>{val.emoji}</span>
                      {val.label}
                      {subject === key && <svg style={{ marginLeft: "auto" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="topbar-actions">
              <button className="notepad-btn" onClick={() => setNotepadOpen(v => !v)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>Notes</span>
              </button>
              <button className="icon-btn" title="Export chat" onClick={exportChat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button className="icon-btn" title="Clear chat" onClick={clearChat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>

          {/* Chat area */}
          <div className="chat-area">
            {messages.length === 0 ? (
              <div className="welcome">
                <div className="welcome-icon" style={{ background: theme.light, color: theme.accent }}>
                  <span style={{ fontFamily: "'DM Serif Display',Georgia,serif" }}>{theme.emoji}</span>
                </div>
                <h2 className="welcome-title">{theme.label} Tutor</h2>
                <p className="welcome-sub">{WELCOME_MSGS[subject]}</p>
                <div className="quick-pills">
                  {subject === "Mathematics" && ["Explain quadratic formula", "Help with calculus", "Geometry problem"].map(t => (
                    <button key={t} className="pill" onClick={() => setInput(t)}>{t}</button>
                  ))}
                  {subject === "Science" && ["Explain photosynthesis", "Newton's laws", "Chemical bonding"].map(t => (
                    <button key={t} className="pill" onClick={() => setInput(t)}>{t}</button>
                  ))}
                  {subject === "Literature" && ["Analyze a poem", "Essay structure help", "Literary devices"].map(t => (
                    <button key={t} className="pill" onClick={() => setInput(t)}>{t}</button>
                  ))}
                  {subject === "History" && ["Causes of WW1", "Industrial Revolution", "Cold War summary"].map(t => (
                    <button key={t} className="pill" onClick={() => setInput(t)}>{t}</button>
                  ))}
                  {subject === "Coding" && ["Debug my code", "Explain recursion", "Sort algorithms"].map(t => (
                    <button key={t} className="pill" onClick={() => setInput(t)}>{t}</button>
                  ))}
                  {subject === "General" && ["Help me study", "Explain a concept", "Essay help"].map(t => (
                    <button key={t} className="pill" onClick={() => setInput(t)}>{t}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 780, width: "100%", margin: "0 auto" }}>
                {messages.map(renderMessage)}
                {loading && <TypingDots />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="input-area">
            <div className="input-wrap">
              <div className="textarea-wrap">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask your ${theme.label} question…`}
                  rows={1}
                />
              </div>
              <button
                className="send-btn"
                style={{ background: input.trim() ? theme.accent : "var(--border)", color: input.trim() ? "#fff" : "var(--text-muted)" }}
                onClick={sendMessage}
                disabled={!input.trim() || loading}
              >
                {loading ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                )}
              </button>
            </div>
            <p className="hint-text">GradeUp guides you — it won't just give you answers. Press Enter to send, Shift+Enter for new line.</p>
          </div>
        </div>

        {/* ── Notepad panel ── */}
        <div className={`notepad-panel ${notepadOpen ? "open" : ""}`}>
          <div className="notepad-header">
            <span className="notepad-title">My Notes</span>
            <button className="icon-btn" onClick={() => setNotepadOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="notepad-body">
            <textarea
              className="notepad-textarea"
              value={notepad}
              onChange={e => setNotepad(e.target.value)}
              placeholder="Jot down key points, formulas, ideas…"
            />
          </div>
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <button
              style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--text-muted)", fontFamily: "'DM Sans',sans-serif" }}
              onClick={() => setNotepad("")}
            >Clear</button>
            <button
              style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none", background: theme.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans',sans-serif" }}
              onClick={() => {
                if (!notepad.trim()) return;
                const blob = new Blob([notepad], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "my-notes.txt"; a.click();
                URL.revokeObjectURL(url);
              }}
            >Export</button>
          </div>
        </div>
      </div>
    </>
  );
}

// import React, { useState, useRef, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   Send,
//   Sparkles,
//   GraduationCap,
//   AlertCircle,
//   RotateCcw,
//   Download,
//   BookOpen,
//   Rocket,
//   Paperclip,
//   Calculator,
//   PenTool,
//   HelpCircle,
//   Info,
//   Pencil,
//   Layout,
//   CheckCircle,
//   Search,
//   Target,
//   X,
//   History as HistoryIcon,
//   BrainCircuit,
//   Coffee,
//   Laugh,
//   Star,
//   ChevronRight,
//   Quote,
//   Lightbulb,
//   Menu,
//   Mic,
//   MicOff,
//   Plus,
//   FileText,
//   Image as ImageIcon,
// } from "lucide-react";
// import { jsPDF } from "jspdf";

// // --- Types & Configuration ---
// type SubjectMode =
//   | "General"
//   | "Math"
//   | "Science"
//   | "Literature"
//   | "History"
//   | "Coding";
// type Mood = "Neutral" | "Thinking" | "Excited" | "Serious";

// interface Attachment {
//   name: string;
//   type: string;
//   size: string;
// }
// interface ChatSession {
//   id: string;
//   title: string;
//   subject: SubjectMode;
//   messages: Message[];
//   draft: string;
// }

// const SUBJECTS: Record<
//   SubjectMode,
//   { name: string; avatar: string; color: string; bg: string; icon: any }
// > = {
//   General: {
//     name: "General",
//     avatar: "🧑‍🎓",
//     color: "bg-indigo-600",
//     bg: "bg-indigo-50",
//     icon: <Sparkles size={18} />,
//   },
//   Science: {
//     name: "Science",
//     avatar: "🧑‍🚀",
//     color: "bg-blue-500",
//     bg: "bg-blue-50",
//     icon: <Star size={18} />,
//   },
//   Math: {
//     name: "Math",
//     avatar: "🤖",
//     color: "bg-emerald-500",
//     bg: "bg-emerald-50",
//     icon: <Calculator size={18} />,
//   },
//   History: {
//     name: "History",
//     avatar: "🛡️",
//     color: "bg-amber-500",
//     bg: "bg-amber-50",
//     icon: <HistoryIcon size={18} />,
//   },
//   Literature: {
//     name: "Literature",
//     avatar: "🦉",
//     color: "bg-purple-500",
//     bg: "bg-purple-50",
//     icon: <PenTool size={18} />,
//   },
//   Coding: {
//     name: "Coding",
//     avatar: "💻",
//     color: "bg-slate-800",
//     bg: "bg-slate-50",
//     icon: <BrainCircuit size={18} />,
//   },
// };

// const QUOTES = [
//   "Your potential is endless. Go find it! ✨",
//   "Success is the sum of small efforts, repeated day in and day out.",
//   "Don't study to survive, study to thrive! 🚀",
//   "Mistakes are proof that you are trying.",
// ];

// const JOKES = [
//   "Why was the math book sad? Because it had too many problems! 😂",
//   "Atoms are so untrustworthy... they make up everything! ⚛️",
//   "Parallel lines have so much in common. It’s a shame they’ll never meet. 😭",
// ];

// interface Message {
//   id: string;
//   role: "user" | "ai";
//   content: string;
//   isWarning?: boolean;
//   attachment?: Attachment;
//   explanation?: {
//     summary: string;
//     instructorNote?: string;
//     hints: string[];
//     structure: string[];
//     keywords: string[];
//     formula?: string;
//     joke?: string;
//     quote: string;
//   };
// }

// const HomeworkHelperMaster = () => {
//   // --- State ---
//   const [currentSessionId, setCurrentSessionId] = useState<string>(
//     Date.now().toString(),
//   );
//   const [sessions, setSessions] = useState<ChatSession[]>([]);
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState("");
//   const [isTyping, setIsTyping] = useState(false);
//   const [subject, setSubject] = useState<SubjectMode>("General");
//   const [mood, setMood] = useState<Mood>("Neutral");
//   const [draft, setDraft] = useState("");
//   const [showDraftPad, setShowDraftPad] = useState(false);
//   const [showMobileHistory, setShowMobileHistory] = useState(false);
//   const [logicScore, setLogicScore] = useState<{
//     score: number;
//     missing: string[];
//   } | null>(null);
//   const [isListening, setIsListening] = useState(false);
//   const [attachedFile, setAttachedFile] = useState<Attachment | null>(null);

//   const scrollRef = useRef<HTMLDivElement>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const theme = SUBJECTS[subject];

//   // --- Auto-Scroll ---
//   useEffect(() => {
//     if (scrollRef.current)
//       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
//   }, [messages, isTyping]);

//   // --- History & Session Logic ---
//   const startNewChat = () => {
//     setMessages([]);
//     setDraft("");
//     setLogicScore(null);
//     setAttachedFile(null);
//     setCurrentSessionId(Date.now().toString());
//     setSubject("General");
//     setShowMobileHistory(false);
//   };

//   const loadSession = (s: ChatSession) => {
//     setCurrentSessionId(s.id);
//     setMessages(s.messages);
//     setDraft(s.draft);
//     setSubject(s.subject);
//     setShowMobileHistory(false);
//   };

//   useEffect(() => {
//     if (messages.length > 0) {
//       const firstUserMsg =
//         messages.find((m) => m.role === "user")?.content || "New Mission";
//       const title =
//         firstUserMsg.length > 20
//           ? firstUserMsg.substring(0, 20) + "..."
//           : firstUserMsg;

//       const sessionData: ChatSession = {
//         id: currentSessionId,
//         title,
//         subject,
//         messages,
//         draft,
//       };
//       setSessions((prev) => {
//         const idx = prev.findIndex((s) => s.id === currentSessionId);
//         if (idx > -1) {
//           const updated = [...prev];
//           updated[idx] = sessionData;
//           return updated;
//         }
//         return [sessionData, ...prev];
//       });
//     }
//   }, [messages, draft, subject]);

//   // --- Voice Input ---
//   const handleVoiceInput = () => {
//     const SpeechRecognition =
//       (window as any).SpeechRecognition ||
//       (window as any).webkitSpeechRecognition;
//     if (!SpeechRecognition)
//       return alert("Your browser doesn't support voice input. Try Chrome!");
//     const recognition = new SpeechRecognition();
//     recognition.onstart = () => setIsListening(true);
//     recognition.onend = () => setIsListening(false);
//     recognition.onresult = (event: any) =>
//       setInput(event.results[0][0].transcript);
//     recognition.start();
//   };

//   const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       setAttachedFile({
//         name: file.name,
//         type: file.type,
//         size: (file.size / 1024).toFixed(1) + " KB",
//       });
//     }
//   };
//   // --- AI Core Logic ---
//   const processAI = (query: string) => {
//     const q = query.toLowerCase();
//     const isLazy = q.includes("answer") || q.includes("solve for me");
//     const isFiveMark = q.includes("5 mark") || q.includes("long");
//     const isTwoMark = q.includes("2 mark") || q.includes("short");

//     setMood("Thinking");
//     setIsTyping(true);

//     setTimeout(() => {
//       let analysis: Message["explanation"] = {
//         summary: `Breaking down the core logic of ${subject} for this specific question.`,
//         instructorNote: isFiveMark
//           ? "Buddy, for 5 marks you need: Intro + 3 Evidence Points + Wrap-up!"
//           : isTwoMark
//             ? "Short & Sweet: Direct definition + 1 example is perfect for 2 marks."
//             : "Focus on the fundamental logic.",
//         hints: [
//           "Think about the very first step in this process.",
//           "How do these two variables interact?",
//         ],
//         structure: isFiveMark
//           ? ["Intro", "Point 1", "Point 2", "Point 3", "Final Thoughts"]
//           : ["Definition", "Context", "Example"],
//         keywords: ["analysis", "context", "process", "result"],
//         quote: QUOTES[Math.floor(Math.random() * QUOTES.length)],
//         joke: isLazy
//           ? JOKES[Math.floor(Math.random() * JOKES.length)]
//           : undefined,
//       };

//       if (subject === "Math" || q.includes("solve")) {
//         analysis.formula = "x = [-b ± sqrt(b^2 - 4ac)] / 2a";
//       }

//       const aiResponse: Message = {
//         id: Date.now().toString(),
//         role: "ai",
//         isWarning: isLazy,
//         content: isLazy
//           ? "Nice try, Bestie! 😉 But if I give you the answer, your brain stays in the dugout. Let's get you at bat with this strategy:"
//           : `I've analyzed your ${subject} task. Let's work through this roadmap together!`,
//         explanation: analysis,
//       };

//       setMessages((prev) => [...prev, aiResponse]);
//       setMood(isLazy ? "Serious" : "Excited");
//       setIsTyping(false);
//       setAttachedFile(null);
//       setTimeout(() => setMood("Neutral"), 3000);
//     }, 1800);
//   };

//   const handleSend = (e: React.FormEvent) => {
//   e.preventDefault();
//   if (!input.trim() && !attachedFile) return;


//   const userMsg: Message = {
//     id: Date.now().toString(),
//     role: "user",
//     content: input,
//     attachment: attachedFile || undefined,
//   };

  
//   const userQuery = input;

  
//   setMessages((prev) => [...prev, userMsg]);

 
//   setInput("");
//   processAI(userQuery);
// };

//   return (
//     <div
//       className={`h-screen w-full ${theme.bg} flex font-sans text-slate-800 transition-colors duration-700 overflow-hidden`}
//     >
//       {/* 1. SIDEBAR: PERSISTENT HISTORY */}
//       <aside className="hidden xl:flex w-72 bg-white border-r flex-col h-full shrink-0">
//         <div className="p-6 border-b">
//           <button
//             onClick={startNewChat}
//             className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-100 hover:scale-105 transition-all"
//           >
//             <Plus size={16} /> New Session
//           </button>
//         </div>
//         <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
//             Discovery History
//           </p>
//           {sessions.map((s) => (
//             <button
//               key={s.id}
//               onClick={() => loadSession(s)}
//               className={`w-full text-left p-4 rounded-2xl border transition-all ${currentSessionId === s.id ? "bg-indigo-50 border-indigo-200" : "bg-transparent border-transparent hover:bg-slate-50"}`}
//             >
//               <p className="text-[11px] font-bold text-slate-600 truncate">
//                 {s.title}
//               </p>
//               <span className="text-[9px] font-black text-indigo-400 uppercase">
//                 {s.subject}
//               </span>
//             </button>
//           ))}
//           {sessions.length === 0 && (
//             <p className="text-[10px] text-slate-300 italic p-4 text-center">
//               Your learning journey starts here!
//             </p>
//           )}
//         </div>
//         <div className="p-6 bg-slate-50 border-t">
//           <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl flex flex-col gap-2">
//             <Rocket size={20} className="text-yellow-300" />
//             <h4 className="text-xs font-black uppercase tracking-widest">
//               Scholar Level 12
//             </h4>
//             <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
//               <div className="h-full bg-yellow-300 w-2/3 shadow-[0_0_10px_#fde047]" />
//             </div>
//           </div>
//         </div>
//       </aside>

//       {/* 2. CHAT & DRAFTING AREA */}
//       <div className="flex-1 flex overflow-hidden relative h-full">
//         <main
//           className={`${showDraftPad ? "hidden md:flex md:w-1/2" : "w-full"} flex flex-col h-full transition-all duration-500 bg-white/30 backdrop-blur-sm border-r border-white/20`}
//         >
//           <header className="px-6 py-4 border-b bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0 z-50">
//             <div className="flex items-center gap-3">
//               <button
//                 className="xl:hidden p-2"
//                 onClick={() => setShowMobileHistory(true)}
//               >
//                 <Menu size={20} />
//               </button>
//               <motion.div
//                 animate={{ rotate: isTyping ? [0, 10, -10, 0] : 0 }}
//                 className="text-4xl md:text-5xl"
//               >
//                 {mood === "Neutral"
//                   ? theme.avatar
//                   : mood === "Thinking"
//                     ? "🤔"
//                     : mood === "Excited"
//                       ? "✨"
//                       : "🧐"}
//               </motion.div>


              
//               <div>
//                 <h1 className="text-sm md:text-xl font-black uppercase italic tracking-tighter">
//                   GradeUp{" "}
//                   <span className={theme.color.replace("bg-", "text-")}>
//                     {subject}
//                   </span>
//                 </h1>
//                 <p className="text-[8px] md:text-[10px] font-black text-green-500 uppercase">
//                   Friend Mode Active
//                 </p>
//               </div>
//             </div>
//             <div className="flex gap-2">
//               <button
//                 onClick={() => setShowDraftPad(!showDraftPad)}
//                 className={`p-2.5 rounded-xl transition-all ${showDraftPad ? "bg-indigo-600 text-white shadow-lg" : "bg-white border text-slate-300"}`}
//               >
//                 <Layout size={18} />
//               </button>
//               <button
//                 onClick={() => setMessages([])}
//                 className="p-2.5 bg-white border text-slate-300 rounded-xl hover:text-red-400"
//               >
//                 <RotateCcw size={18} />
//               </button>
//             </div>
//           </header>

//           <div
//             ref={scrollRef}
//             className="flex-1 overflow-y-auto p-4 md:p-8 space-y-12 custom-scrollbar scroll-smooth"
//           >
//             {messages.length === 0 && (
//               <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6">
//                 <div className="text-9xl mb-4 animate-bounce">👋</div>
//                 <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter">
//                   Ready to Crush Your Lessons?
//                 </h2>
//                 <div className="flex flex-wrap gap-2 justify-center">
//                   {(Object.keys(SUBJECTS) as SubjectMode[]).map((s) => (
//                     <button
//                       key={s}
//                       onClick={() => setSubject(s)}
//                       className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${subject === s ? "bg-indigo-600 text-white" : "bg-white border text-slate-400"}`}
//                     >
//                       {s}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             )}

//             <AnimatePresence>
//               {messages.map((m) => (
//                 <motion.div
//                   key={m.id}
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
//                 >
//                   <div
//                     className={`max-w-[95%] md:max-w-[85%] ${m.role === "user" ? `${theme.color} text-white rounded-[2.5rem] rounded-tr-none p-5 shadow-xl` : "space-y-6"}`}
//                   >
//                     {m.attachment && (
//                       <div className="flex items-center gap-2 mb-2 p-2 bg-black/10 rounded-xl text-[10px] font-black border border-white/20">
//                         {m.attachment.type.includes("image") ? (
//                           <ImageIcon size={14} />
//                         ) : (
//                           <FileText size={14} />
//                         )}{" "}
//                         {m.attachment.name}
//                       </div>
//                     )}
//                     <p className="text-sm font-bold leading-relaxed">
//                       {m.content}
//                     </p>

//                     {m.explanation && (
//                       <motion.div
//                         initial={{ scale: 0.95 }}
//                         animate={{ scale: 1 }}
//                         className="bg-white border-8 border-slate-50 rounded-[3.5rem] p-6 md:p-8 shadow-2xl space-y-8 relative"
//                       >
//                         <div className="flex flex-col md:flex-row gap-6">
//                           <div className="bg-slate-50 p-6 rounded-[2rem] flex-1">
//                             <Quote size={20} className="text-indigo-200 mb-2" />
//                             <p className="text-[10px] font-black italic text-indigo-400 mb-2">
//                               "{m.explanation.quote}"
//                             </p>
//                             <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
//                               "{m.explanation.summary}"
//                             </p>
//                           </div>
//                           <div className="bg-amber-50 p-6 rounded-[2rem] flex-1 border-2 border-dashed border-amber-200">
//                             <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-2">
//                               Mentor Nudge
//                             </span>
//                             <p className="text-xs font-black text-amber-700">
//                               {m.explanation.instructorNote}
//                             </p>
//                           </div>
//                         </div>

//                         {m.explanation.joke && (
//                           <div className="p-4 bg-yellow-50 rounded-[2rem] flex gap-3 items-center border-2 border-yellow-100">
//                             <Laugh size={24} className="text-yellow-600" />
//                             <p className="text-xs font-black italic text-yellow-800">
//                               {m.explanation.joke}
//                             </p>
//                           </div>
//                         )}

//                         {m.explanation.formula && (
//                           <div
//                             className={`p-8 rounded-[2rem] text-white text-center font-mono text-xl italic shadow-xl ${theme.color}`}
//                           >
//                             {m.explanation.formula}
//                           </div>
//                         )}

//                         <div className="space-y-4">
//                           <h4 className="text-[11px] font-black text-indigo-600 uppercase flex items-center gap-2">
//                             <Lightbulb className="text-yellow-400" /> Friendly
//                             Hints
//                           </h4>
//                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             {m.explanation.hints.map((h, i) => (
//                               <div
//                                 key={i}
//                                 className="group relative bg-slate-100 p-5 rounded-3xl border border-slate-200 overflow-hidden cursor-help hover:bg-white transition-all"
//                               >
//                                 <p className="text-xs font-bold text-slate-600 blur-[6px] group-hover:blur-0 transition-all duration-300">
//                                   {h}
//                                 </p>
//                                 <div className="absolute inset-0 flex items-center justify-center bg-slate-50 group-hover:opacity-0 transition-opacity">
//                                   <span className="text-[10px] font-black text-indigo-400">
//                                     Peek Hint
//                                   </span>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         </div>

//                         <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-50">
//                           {m.explanation.structure.map((s, i) => (
//                             <span
//                               key={i}
//                               className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-400"
//                             >
//                               {i + 1}. {s}
//                             </span>
//                           ))}
//                         </div>
//                       </motion.div>
//                     )}
//                   </div>
//                 </motion.div>
//               ))}
//             </AnimatePresence>

//             {isTyping && (
//               <div className="flex gap-2 p-4 bg-white rounded-full w-24 justify-center shadow-inner">
//                 {[1, 2, 3].map((i) => (
//                   <motion.div
//                     key={i}
//                     animate={{ y: [0, -10, 0] }}
//                     transition={{
//                       repeat: Infinity,
//                       duration: 0.8,
//                       delay: i * 0.2,
//                     }}
//                     className={`w-2 h-2 rounded-full ${theme.color}`}
//                   />
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Unified Input Bar */}
//          <div className="p-6 md:p-8 bg-white border-t shrink-0 sticky bottom-0">
//              {attachedFile && (
//                 <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-3 p-2 bg-indigo-50 rounded-xl flex items-center justify-between max-w-xs border border-indigo-100 ml-auto">
//                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 truncate"><FileText size={14}/> {attachedFile.name}</div>
//                    <button onClick={() => setAttachedFile(null)} className="text-indigo-400 hover:text-red-500"><X size={14}/></button>
//                 </motion.div>
//              )}

//             <form onSubmit={handleSend} className="relative flex items-center group max-w-4xl mx-auto gap-3">
//               <div className="relative flex-1">
//                 {/* ATTACH ON LEFT */}
//                 <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
//                   <button type="button" onClick={() => fileInputRef.current?.click()} className="peer text-slate-300 hover:text-indigo-600 transition-colors"><Paperclip size={22}/></button>
//                   <span className="absolute bottom-full mb-2 hidden peer-hover:block bg-slate-800 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest whitespace-nowrap shadow-xl">Attach File</span>
//                 </div>
//                 <input type="file" ref={fileInputRef} hidden onChange={handleFileAttach} accept="image/*,.pdf,.doc,.docx" />

//                 <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Buddy is thinking in ${subject} mode...`} className={`w-full bg-slate-50 border-4 border-transparent focus:bg-white rounded-[2.5rem] py-5 pl-16 pr-16 outline-none transition-all font-bold text-slate-700 shadow-inner ${theme.color.replace('bg-', 'focus:border-')}`} />

//                 {/* MIC ON RIGHT */}
//                 <div className="absolute right-5 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
//                   <button type="button" onClick={handleVoiceInput} className={`peer transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-300 hover:text-indigo-600'}`}>
//                     {isListening ? <MicOff size={22}/> : <Mic size={22} />}
//                   </button>
//                   <span className="absolute bottom-full mb-2 hidden peer-hover:block bg-slate-800 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest whitespace-nowrap shadow-xl">{isListening ? 'Listening...' : 'Voice Input'}</span>
//                 </div>
//               </div>
//               <motion.button type="submit" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`p-5 text-white rounded-full shadow-xl shrink-0 ${theme.color}`}><Send size={22} /></motion.button>
//             </form>
//           </div>
//         </main>

//         {/* 3. DRAFTING PAD: THE WORKSPACE */}
//         <AnimatePresence>
//           {showDraftPad && (
//             <motion.div
//               initial={{ x: 600 }}
//               animate={{ x: 0 }}
//               exit={{ x: 600 }}
//               className="absolute inset-0 md:relative md:inset-auto md:w-1/2 bg-white md:rounded-l-[4rem] shadow-2xl border-l-4 border-white flex flex-col overflow-hidden h-full z-[100]"
//             >
//               <div
//                 className={`p-8 text-white flex justify-between items-center shrink-0 ${theme.color}`}
//               >
//                 <div className="flex items-center gap-3">
//                   <Pencil size={20} />
//                   <h3 className="text-xs font-black uppercase tracking-widest">
//                     Drafting Pad
//                   </h3>
//                 </div>
//                 <button
//                   onClick={() => setShowDraftPad(false)}
//                   className="hover:rotate-90 transition-transform"
//                 >
//                   <X size={24} />
//                 </button>
//               </div>

//               <div className="flex-1 p-6 md:p-10 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] flex flex-col overflow-hidden">
//                 <textarea
//                   value={draft}
//                   onChange={(e) => setDraft(e.target.value)}
//                   placeholder="Start your own work here using the mentor hints..."
//                   className="flex-1 w-full resize-none outline-none font-bold text-sm text-slate-600 leading-relaxed bg-transparent custom-scrollbar"
//                 />

//                 {logicScore && (
//                   <motion.div
//                     initial={{ y: 50 }}
//                     animate={{ y: 0 }}
//                     className="mt-4 bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl relative"
//                   >
//                     <div className="flex justify-between items-center mb-4">
//                       <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">
//                         Logic Accuracy
//                       </span>
//                       <span className="text-2xl font-black text-indigo-400">
//                         {logicScore.score}%
//                       </span>
//                     </div>
//                     <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
//                       <motion.div
//                         initial={{ width: 0 }}
//                         animate={{ width: `${logicScore.score}%` }}
//                         className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"
//                       />
//                     </div>
//                     <p className="text-[10px] font-bold text-slate-400">
//                       💡 Tip: Try making your point about the root cause
//                       clearer!
//                     </p>
//                     <button
//                       onClick={() => setLogicScore(null)}
//                       className="absolute top-4 right-4 text-white/30 hover:text-white"
//                     >
//                       <X size={16} />
//                     </button>
//                   </motion.div>
//                 )}
//               </div>

//               <div className="p-6 md:p-8 bg-slate-50 border-t space-y-4 shrink-0">
//                 <button
//                   onClick={() =>
//                     setLogicScore({
//                       score: Math.floor(Math.random() * 30) + 70,
//                       missing: [],
//                     })
//                   }
//                   className="w-full bg-white border-4 border-indigo-600 text-indigo-600 py-4 rounded-[2rem] text-xs font-black flex items-center justify-center gap-3 hover:bg-indigo-600 hover:text-white transition-all shadow-xl"
//                 >
//                   <Target size={18} /> AI LOGIC CHECK
//                 </button>
//                 <button
//                   onClick={() => {
//                     const doc = new jsPDF();
//                     doc.setFontSize(22);
//                     doc.text("My Masterpiece", 20, 25);
//                     doc.setFontSize(12);
//                     doc.text(doc.splitTextToSize(draft, 170), 20, 45);
//                     doc.save("Discovery_Session.pdf");
//                   }}
//                   className="w-full bg-slate-900 text-white py-4 rounded-[2rem] text-xs font-black flex items-center justify-center gap-3 active:scale-95 transition-transform"
//                 >
//                   <Download size={18} /> EXPORT MY WORK
//                 </button>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>

//       {/* MOBILE HISTORY OVERLAY */}
//       <AnimatePresence>
//         {showMobileHistory && (
//           <motion.div
//             initial={{ x: -300 }}
//             animate={{ x: 0 }}
//             exit={{ x: -300 }}
//             className="fixed inset-y-0 left-0 w-3/4 bg-white z-[100] shadow-2xl p-8 flex flex-col xl:hidden"
//           >
//             <div className="flex justify-between items-center mb-8">
//               <BrainCircuit className="text-indigo-600" size={24} />
//               <button onClick={() => setShowMobileHistory(false)}>
//                 <X size={24} />
//               </button>
//             </div>
//             <div className="flex-1 overflow-y-auto space-y-4">
//               {sessions.map((s) => (
//                 <div
//                   key={s.id}
//                   className="p-4 bg-slate-50 rounded-2xl border"
//                   onClick={() => loadSession(s)}
//                 >
//                   <p className="text-[11px] font-bold text-slate-600 truncate">
//                     {s.title}
//                   </p>
//                   <span className="text-[9px] font-black text-indigo-400 uppercase">
//                     {s.subject}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       <style
//         dangerouslySetInnerHTML={{
//           __html: `
//         .custom-scrollbar::-webkit-scrollbar { width: 6px; }
//         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
//         .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
//         .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
//       `,
//         }}
//       />
//     </div>
//   );
// };

// export default HomeworkHelperMaster;
