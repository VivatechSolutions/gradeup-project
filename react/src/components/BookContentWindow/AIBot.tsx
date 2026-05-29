import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
type Action = "highlight" | "explain" | "summarize" | "ask";
type View   = "menu" | "chat";

interface Message {
  role: "user" | "ai";
  text: string;
  isLoading?: boolean;
}

interface AIBotProps {
  selectedText: string;
  onAction: (action: Action, text: string) => void;
  accentColor?: string;
  /** Provide a live AI response function for production flows. */
  onAskAI?: (query: string) => Promise<string>;
}

// ─── AIBot ────────────────────────────────────────────────────────────────────
const AIBot: React.FC<AIBotProps> = ({
  selectedText,
  onAction,
  accentColor = "#6366f1",
  onAskAI,
}) => {
  const [open,    setOpen]    = useState(false);
  const [view,    setView]    = useState<View>("menu");
  const [pulse,   setPulse]   = useState(false);
  const [input,   setInput]   = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hello! Select text on either page and I'll help you understand, summarise, or highlight it. You can also ask me anything about this chapter." },
  ]);

  const prevText  = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pulse + auto-open when new text selected
  useEffect(() => {
    if (selectedText && selectedText !== prevText.current) {
      prevText.current = selectedText;
      setPulse(true);
      setOpen(true);
      const t = setTimeout(() => setPulse(false), 900);
      return () => clearTimeout(t);
    }
    if (!selectedText && !open) {
      // don't force-close if panel already open
    }
  }, [selectedText]);

  // When switching to chat and there's selected text, pre-fill the input
  const openChat = (prefill?: string) => {
    setView("chat");
    if (prefill) {
      setTimeout(() => {
        setInput(prefill);
        inputRef.current?.focus();
      }, 80);
    } else {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  // ── AI call ─────────────────────────────────────────────────────────────
  const callAI = async (userMsg: string) => {
    if (isSubmitting) return;

    // Add user message + loading placeholder
    setMessages(prev => [...prev,
      { role: "user", text: userMsg },
      { role: "ai",   text: "", isLoading: true },
    ]);
    setIsSubmitting(true);

    let reply = "";
    try {
      if (!onAskAI) {
        throw new Error("AI assistance is unavailable for this view right now.");
      }
      reply = await onAskAI(userMsg);
    } catch (error: any) {
      reply = error?.message || "Sorry, I couldn't get a response. Please try again.";
    } finally {
      setIsSubmitting(false);
    }

    // Replace loading placeholder with real reply
    setMessages(prev => prev.map((m, i) =>
      i === prev.length - 1 ? { role: "ai", text: reply, isLoading: false } : m
    ));
  };

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    callAI(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Quick action from menu ───────────────────────────────────────────────
  const handleMenuAction = (action: Action) => {
    const t = selectedText;
    if (action === "highlight") {
      onAction("highlight", t);
      return;
    }
    if (action === "explain") {
      const q = t ? `Explain this in detail: "${t.substring(0, 120)}"` : "Explain the main concept of this page.";
      openChat(q);
      callAI(q);
      return;
    }
    if (action === "summarize") {
      const q = t ? `Summarize this passage: "${t.substring(0, 120)}"` : "Summarize the current page content.";
      openChat(q);
      callAI(q);
      return;
    }
    if (action === "ask") {
      // pre-fill input with selected text if any
      openChat(t ? `"${t.substring(0, 100)}" — ` : "");
    }
  };

  const isGold       = accentColor === "#c9a227";
  const panelBg      = isGold ? "linear-gradient(145deg,#1a1208,#2c1a0e)" : "linear-gradient(145deg,#0f172a,#1e1b4b)";
  const labelColor   = isGold ? "#e8c547" : "#c7d2fe";
  const userBubble   = isGold ? "#c9a227" : "#6366f1";
  const aiBubbleBg   = isGold ? "rgba(201,162,39,0.12)" : "rgba(99,102,241,0.12)";
  const aiBubbleBdr  = isGold ? "rgba(201,162,39,0.2)"  : "rgba(99,102,241,0.2)";

  const ACTIONS = [
    { id: "highlight"  as Action, icon: "🖊", label: "Highlight",  sub: "Save to insights"     },
    { id: "explain"    as Action, icon: "🔍", label: "Explain",    sub: "Deep AI breakdown"    },
    { id: "summarize"  as Action, icon: "📝", label: "Summarize",  sub: "Quick AI summary"     },
    { id: "ask"        as Action, icon: "💬", label: "Chat AI",    sub: "Free chat about page" },
  ];

  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 8000, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>

      {/* ── Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.88 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            style={{
              width: 280, borderRadius: 18,
              background: panelBg,
              border: `1px solid ${accentColor}33`,
              boxShadow: "0 28px 64px rgba(0,0,0,0.6)",
              backdropFilter: "blur(24px)",
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 13px 9px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {view === "chat" && (
                  <button onClick={() => setView("menu")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 14, padding: "0 4px 0 0", lineHeight: 1 }}>
                    ‹
                  </button>
                )}
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: 7, height: 7, borderRadius: "50%", background: accentColor, boxShadow: `0 0 6px ${accentColor}`, flexShrink: 0 }}
                />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: accentColor, textTransform: "uppercase" as const }}>
                  {view === "chat" ? "AI Chat" : "AI Study Bot"}
                </span>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.28)", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>

            {/* ── MENU VIEW ── */}
            {view === "menu" && (
              <>
                {/* Selected text preview */}
                {selectedText ? (
                  <div style={{ margin: "8px 10px 4px", padding: "8px 10px", borderRadius: 8, borderLeft: `2px solid ${accentColor}`, background: `${accentColor}0d` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: `${accentColor}99`, textTransform: "uppercase" as const, display: "block", marginBottom: 3 }}>
                      Selected text
                    </span>
                    <p style={{ margin: 0, fontSize: 11, fontStyle: "italic", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                      "{selectedText.length > 80 ? selectedText.slice(0, 80) + "…" : selectedText}"
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: "8px 12px 4px" }}>
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
                      Select text on either page to use AI tools
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div style={{ padding: "4px 6px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
                  {ACTIONS.map((a, i) => {
                    const disabled = !selectedText && a.id !== "ask";
                    return (
                      <motion.button key={a.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        whileHover={!disabled ? { x: 3, backgroundColor: `${accentColor}18` } : {}}
                        whileTap={!disabled ? { scale: 0.97 } : {}}
                        onClick={() => !disabled && handleMenuAction(a.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10,
                          background: "transparent", border: "none", width: "100%", textAlign: "left" as const,
                          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.35 : 1, transition: "all 0.15s",
                        }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${accentColor}18`, border: `1px solid ${accentColor}28` }}>
                          <span style={{ fontSize: 14 }}>{a.icon}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: labelColor, lineHeight: 1.2 }}>{a.label}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.2 }}>{a.sub}</div>
                        </div>
                        <span style={{ color: "rgba(255,255,255,0.18)", fontSize: 14 }}>›</span>
                      </motion.button>
                    );
                  })}
                </div>

                <div style={{ padding: "2px 12px 10px", textAlign: "center" }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.16)", letterSpacing: "0.04em" }}>Works on text from both pages</span>
                </div>
              </>
            )}

            {/* ── CHAT VIEW ── */}
            {view === "chat" && (
              <>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 6px", display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, minHeight: 200 }}>
                  {messages.map((msg, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                      style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "82%", padding: "8px 11px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: msg.role === "user" ? userBubble : aiBubbleBg,
                        border: msg.role === "user" ? "none" : `1px solid ${aiBubbleBdr}`,
                        fontSize: 12, lineHeight: 1.55, color: msg.role === "user" ? "#fff" : "rgba(255,255,255,0.8)",
                      }}>
                        {msg.isLoading ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
                            {[0,1,2].map(j => (
                              <motion.div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: accentColor }}
                                animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 0.9, repeat: Infinity, delay: j * 0.18 }} />
                            ))}
                          </div>
                        ) : msg.text}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 10px", display: "flex", gap: 7, flexShrink: 0 }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about this chapter…"
                    style={{
                      flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, padding: "7px 11px", color: "rgba(255,255,255,0.85)",
                      fontSize: 12, outline: "none", fontFamily: "inherit",
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    onClick={handleSend}
                    disabled={!input.trim() || isSubmitting}
                    style={{
                      width: 32, height: 32, borderRadius: 10, border: "none", cursor: input.trim() && !isSubmitting ? "pointer" : "not-allowed",
                      background: input.trim() && !isSubmitting ? accentColor : "rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      transition: "background 0.2s",
                    }}>
                    <span style={{ fontSize: 14, color: input.trim() && !isSubmitting ? (isGold ? "#1a0f00" : "#fff") : "rgba(255,255,255,0.3)" }}>
                      {isSubmitting ? "…" : "↑"}
                    </span>
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating button ── */}
      <div style={{ position: "relative", alignSelf: "flex-end" }}>
        {/* Pulse ring */}
        <AnimatePresence>
          {pulse && (
            <motion.div initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 2.4, opacity: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.85 }}
              style={{ position: "absolute", inset: -8, borderRadius: "50%", border: `2px solid ${accentColor}`, pointerEvents: "none" }} />
          )}
        </AnimatePresence>
        {/* Selection badge */}
        <AnimatePresence>
          {selectedText && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: isGold ? "#1a0f00" : "#fff", fontWeight: 700, zIndex: 2 }}>
              ✓
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
          onClick={() => {
            if (!open) { setOpen(true); }
            else { setOpen(false); }
          }}
          style={{
            width: 50, height: 50, borderRadius: "50%", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
            background: isGold ? "linear-gradient(135deg,#1a1208,#2c1a0e)" : "linear-gradient(135deg,#1e1b4b,#312e81)",
            border: `2px solid ${accentColor}66`, boxShadow: `0 8px 28px ${accentColor}44`,
          }}>
          <span style={{ fontSize: open ? 18 : 22, lineHeight: 1, transition: "font-size 0.2s" }}>
            {open ? "✕" : "✨"}
          </span>
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", color: accentColor, marginTop: 1 }}>AI</span>
        </motion.button>
      </div>
    </div>
  );
};

export default AIBot;
