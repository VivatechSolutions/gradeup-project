import { useState, useEffect, useRef, useCallback } from "react";
import {
  COLORS, PHASES, REACTIONS,
  AI_DEBATE_LINES, AI_SEMINAR_LINES, AI_MEDIATOR_INTROS,
  Participant, makeParticipant, pushNotif
} from "./shared";
import { useTimer, useRecorder, useScreenShare, useAIVoice, useSilenceDetector } from "./hooks";
import { Tile, AnalysisReport, useToast } from "./UIComponents";

interface RoomProps {
  config: any;
  onEnd: (result: any) => void;
}

export function Room({ config, onEnd }: RoomProps) {
  const { mode, subMode } = config;
  const isAI1v1   = mode === "debate" && subMode === "ai";
  const isMulti   = (mode === "debate" && subMode === "multi") || mode === "seminar";
  const isMeeting = mode === "meeting";

  // ── Build initial participants ──────────────────────────────────────────
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const list: Participant[] = [];

    list.push(makeParticipant({
      id: 0, name: config.name, stream: config.stream ?? null,
      isLocal: true, isHost: true,
      micMuted: !config.micOn, camOn: config.camOn || false,
      isSpeaking: false, isMyTurn: isAI1v1,
      avatarColor: COLORS[0],
    }));

    if (isAI1v1) {
      list.push(makeParticipant({ id: 1, name: "AI Debater", isAI: true, isSpeaking: false, avatarColor: "#8b5cf6" }));
    }

    if (isMulti) {
      list.push(makeParticipant({ id: 99, name: "AI Mediator", isAI: true, isMed: true, isSpeaking: false, avatarColor: "#38bdf8" }));
    }

    (config.invitees || []).forEach((inv: any, i: number) => {
      list.push(makeParticipant({
        id: i + 2,
        name: inv.value || inv,
        micMuted: Math.random() > 0.5,
        camOn: mode === "meeting" ? Math.random() > 0.4 : false,
        isSpeaking: false,
        avatarColor: inv.avatarColor || COLORS[(i + 2) % COLORS.length],
        inviteeId: inv.id,
      }));
    });

    return list;
  });

  // ── Acquire media when launched from community (stream is null) ─────────
  useEffect(() => {
    if (config.stream) return; // setup-flow already has a stream

    const constraints: MediaStreamConstraints = {
      audio: config.micOn !== false,
      video: isMeeting && config.camOn ? true : false,
    };

    navigator.mediaDevices
      ?.getUserMedia(constraints)
      .then(stream => {
        if (!config.micOn) stream.getAudioTracks().forEach(t => (t.enabled = false));
        if (!config.camOn) stream.getVideoTracks().forEach(t => (t.enabled = false));

        setParticipants(ps =>
          ps.map(p =>
            p.isLocal
              ? { ...p, stream, micMuted: !config.micOn, camOn: !!config.camOn }
              : p
          )
        );
      })
      .catch(err => {
        console.warn("Room: media acquisition failed:", err);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── State ───────────────────────────────────────────────────────────────
  const [micOn, setMicOn]         = useState(config.micOn !== false);
  const [camOn, setCamOn]         = useState(config.camOn || false);
  const [panelTab, setPanelTab]   = useState<string | null>(null);
  const [messages, setMessages]   = useState<any[]>([]);
  const [showEnd, setShowEnd]     = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [scores, setScores]       = useState({ you: 40, ai: 38 });
  const [phaseIdx, setPhaseIdx]   = useState(0);
  const [whoTurn, setWhoTurn]     = useState<"you" | "ai">("you");
  const [aiLocked, setAiLocked]   = useState(false);
  const [nudge, setNudge]         = useState<string | null>(null);
  const [tileReacts, setTileReacts] = useState<Record<number, any>>({});
  const [addInput, setAddInput]   = useState("");
  const [addEmail, setAddEmail]   = useState("");
  const [chatInput, setChatInput] = useState("");
  const [transcript, setTranscript] = useState<any[]>([]);

  const chatEndRef    = useRef<HTMLDivElement>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer         = useTimer(true);
  const recorder      = useRecorder();
  const screenShare   = useScreenShare();
  const aiVoice       = useAIVoice();
  const { show: toast$, node: toastNode } = useToast();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const updateP = useCallback((id: number, patch: Partial<Participant>) => {
    setParticipants(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  function addMsg(sender: string, senderId: number, text: string) {
    const entry = { sender, senderId, text, time: Date.now() };
    setMessages(ms => [...ms, entry]);
    setTranscript(t => [...t, entry]);
  }

  // ── Initial AI greetings ────────────────────────────────────────────────
  useEffect(() => {
    if (isAI1v1) {
      const greeting = `Welcome ${config.name}! I'll argue the opposing position on the topic: "${config.topic}". You have the floor first — please begin with your opening statement.`;
      setTimeout(() => {
        addMsg("AI Debater", 1, greeting);
        updateP(1, { isAITyping: true });
        setTimeout(() => {
          updateP(1, { isAITyping: false, isSpeaking: true });
          aiVoice.speak(greeting, () => {
            updateP(1, { isSpeaking: false });
            setWhoTurn("you");
            updateP(0, { isMyTurn: true });
            startNudgeTimer();
          });
        }, 900);
      }, 1200);
    }

    if (isMulti) {
      const intro = `${AI_MEDIATOR_INTROS[Math.floor(Math.random() * AI_MEDIATOR_INTROS.length)]} "${config.topic}". I'll be facilitating and will provide a full analysis at the end. Please introduce yourselves and we'll begin.`;
      setTimeout(() => {
        addMsg("AI Mediator", 99, intro);
        updateP(99, { isSpeaking: true });
        aiVoice.speak(intro, () => updateP(99, { isSpeaking: false }));
      }, 1200);

      const mediatorInterval = setInterval(() => {
        if (Math.random() > 0.65 && !aiVoice.isSpeaking) {
          const line = AI_SEMINAR_LINES[Math.floor(Math.random() * AI_SEMINAR_LINES.length)];
          addMsg("AI Mediator", 99, line);
          updateP(99, { isSpeaking: true });
          aiVoice.speak(line, () => updateP(99, { isSpeaking: false }));
        }
      }, 25000);
      return () => clearInterval(mediatorInterval);
    }

    if (isMeeting) {
      addMsg("System", 99, "Meeting started. Everyone is connected! 👋");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Nudge timer ─────────────────────────────────────────────────────────
  function startNudgeTimer() {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => {
      if (whoTurn === "you") {
        setNudge("💬 Your turn — type or speak your argument!");
        setTimeout(() => setNudge(null), 5000);
      }
    }, 8000);
  }

  function clearNudge() {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    setNudge(null);
  }

  // ── Silence detector ────────────────────────────────────────────────────
  // Get the live stream from the local participant (works for both setup & community flows)
  const localStream = participants.find(p => p.isLocal)?.stream ?? config.stream ?? null;

  useSilenceDetector(
    isAI1v1 && micOn && localStream ? localStream : null,
    isAI1v1 && whoTurn === "you",
    () => {
      if (!aiLocked && whoTurn === "you") {
        setNudge("🎤 No input detected — AI will respond now");
        setTimeout(() => { setNudge(null); triggerAIResponse(); }, 2000);
      }
    },
    7000,
  );

  // ── AI responds ─────────────────────────────────────────────────────────
  const triggerAIResponse = useCallback(() => {
    if (aiLocked) return;
    setAiLocked(true);
    clearNudge();
    setWhoTurn("ai");
    updateP(0, { isMyTurn: false });
    updateP(1, { isAITyping: true, isSpeaking: false });

    const thinkDelay = 1000 + Math.random() * 1200;
    aiTimerRef.current = setTimeout(() => {
      const reply = AI_DEBATE_LINES[Math.floor(Math.random() * AI_DEBATE_LINES.length)];
      updateP(1, { isAITyping: false, isSpeaking: true });
      addMsg("AI Debater", 1, reply);

      setScores(s => {
        const youGain = Math.floor(Math.random() * 5);
        const aiGain  = Math.floor(Math.random() * 4);
        return { you: Math.min(s.you + youGain, 100), ai: Math.min(s.ai + aiGain, 100) };
      });

      if (transcript.length > 0 && transcript.length % 4 === 0) {
        setPhaseIdx(i => Math.min(i + 1, PHASES.length - 1));
      }

      aiVoice.speak(reply, () => {
        updateP(1, { isSpeaking: false });
        setWhoTurn("you");
        updateP(0, { isMyTurn: true });
        setAiLocked(false);
        startNudgeTimer();
      });
    }, thinkDelay);
  }, [aiLocked, transcript.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ────────────────────────────────────────────────────────────
  const getLocalStream = () => participants.find(p => p.isLocal)?.stream ?? config.stream ?? null;

  const toggleMic = () => {
    const n = !micOn;
    setMicOn(n);
    const stream = getLocalStream();
    stream?.getAudioTracks().forEach((t: MediaStreamTrack) => (t.enabled = n));
    updateP(0, { micMuted: !n });
    if (isAI1v1 && whoTurn === "you" && !n && !aiLocked) {
      setTimeout(() => triggerAIResponse(), 800);
    }
  };

  const toggleCam = () => {
    const stream = getLocalStream();
    if (!stream) return;
    const n = !camOn;
    setCamOn(n);
    stream.getVideoTracks().forEach((t: MediaStreamTrack) => (t.enabled = n));
    updateP(0, { camOn: n });
  };

  const toggleHand = () => {
    const me = participants.find(p => p.isLocal);
    const n = !me?.handRaised;
    updateP(0, { handRaised: n });
    if (n) toast$("✋ Hand raised!", "warn");
  };

  async function handleShare() {
    if (screenShare.isSharing) {
      screenShare.stop();
      toast$("Screen sharing stopped", "warn");
    } else {
      const ok = await screenShare.start();
      ok ? toast$("🖥 Sharing started", "info") : toast$("Share cancelled", "error");
    }
  }

  // ── Send chat message ────────────────────────────────────────────────────
  function sendMessage(text: string) {
    if (!text.trim()) return;
    addMsg(config.name, 0, text.trim());
    setChatInput("");
    updateP(0, { isSpeaking: true });
    setTimeout(() => updateP(0, { isSpeaking: false }), 1200);

    if (isAI1v1) {
      clearNudge();
      if (!aiLocked) setTimeout(() => triggerAIResponse(), 500);
    }

    if (isMulti && Math.random() > 0.6) {
      const mediatorLine = AI_SEMINAR_LINES[Math.floor(Math.random() * AI_SEMINAR_LINES.length)];
      setTimeout(() => {
        addMsg("AI Mediator", 99, mediatorLine);
        updateP(99, { isSpeaking: true });
        aiVoice.speak(mediatorLine, () => updateP(99, { isSpeaking: false }));
      }, 2500);
    }
  }

  // ── Add participant ──────────────────────────────────────────────────────
  function addParticipant() {
    const nameVal  = addInput.trim();
    const emailVal = addEmail.trim();
    if (!nameVal && !emailVal) return;

    const value   = emailVal || nameVal;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const newId   = Date.now();
    const color   = COLORS[participants.length % COLORS.length];

    setParticipants(ps => [...ps, makeParticipant({
      id: newId, name: isEmail ? value.split("@")[0] : value,
      micMuted: true, camOn: false, isSpeaking: false, avatarColor: color,
    })]);

    if (isEmail) {
      const link = config.roomLink || `https://debatearena.app/join?room=${config.roomId}`;
      toast$(`📧 Invite sent to ${value}`, "info");
      addMsg("System", 99, `📧 Invite sent to ${value} · Link: ${link}`);
    } else {
      const link = config.roomLink || `https://debatearena.app/join?room=${config.roomId}`;
      navigator.clipboard.writeText(link).catch(() => {});
      toast$(`🔗 ${value} added · Link copied to clipboard`, "success");
    }

    setAddInput(""); setAddEmail(""); setShowAdd(false);
  }

  // ── Reactions ────────────────────────────────────────────────────────────
  function sendReaction(emoji: string) {
    setShowReactions(false);
    const key = Date.now();
    setTileReacts(tr => ({ ...tr, 0: { emoji, key } }));
    setTimeout(() => setTileReacts(tr => { const n = { ...tr }; delete n[0]; return n; }), 2400);
  }

  // ── End session ──────────────────────────────────────────────────────────
  function handleEnd() {
    aiVoice.cancel();
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);

    // Stop tracks from all local participant streams (handles both setup-flow & community-join)
    participants
      .filter(p => p.isLocal && p.stream)
      .forEach(p => p.stream!.getTracks().forEach((t: MediaStreamTrack) => t.stop()));

    // Also stop config.stream if present (setup flow)
    if (config.stream) {
      config.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    }

    screenShare.stop();
    if (recorder.isRecording) recorder.stop();

    pushNotif(
      `${mode === "debate" ? "⚔️ Debate" : mode === "seminar" ? "🎓 Seminar" : "📹 Meeting"} ended: "${config.topic}"`,
      `Duration: ${timer}. ${participants.length} participants.`,
    );

    onEnd({
      timer, mode, subMode, topic: config.topic,
      participants: participants.filter(p => !p.isAI && !p.isMed).length,
      scores, recorder, hasRecording: !!recorder.blob,
      participantsList: participants, transcript,
      syncedToCalendar: config.syncedToCalendar,
    });
  }

  function dlAnalysis() {
    const lines = [
      `DebateArena ${mode.toUpperCase()} ANALYSIS REPORT`,
      `${"─".repeat(50)}`,
      `Topic:        ${config.topic}`,
      `Mode:         ${mode}${subMode ? ` (${subMode})` : ""}`,
      `Duration:     ${timer}`,
      `Participants: ${participants.filter(p => !p.isAI && !p.isMed).length}`,
      `Exchanges:    ${transcript.length}`,
      ``,
      ...(isAI1v1 ? [
        `SCORES`,
        `Your Score: ${scores.you} pts`,
        `AI Score:   ${scores.ai} pts`,
        `Result:     ${scores.you > scores.ai ? "YOU WIN" : "AI WINS"}`,
        ``,
      ] : []),
      `TRANSCRIPT`,
      ...transcript.map(t => `[${new Date(t.time).toLocaleTimeString()}] ${t.sender}: ${t.text}`),
    ].join("\n");

    const b = new Blob([lines], { type: "text/plain" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u; a.download = `debatearena-analysis-${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(u);
    toast$("📥 Report downloaded!", "success");
  }

  // ── Grid class ────────────────────────────────────────────────────────────
  const n  = participants.length;
  const gc = n <= 1 ? "vg-1" : n === 2 ? "vg-2" : n === 3 ? "vg-3" : n === 4 ? "vg-4" : n <= 6 ? "vg-6" : "vg-8";

  const fmt = (d: number) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const me  = participants.find(p => p.isLocal);

  return (
    <div className="room-root">
      {recorder.isRecording && <div className="rec-overlay">⏺ REC {timer}</div>}
      {screenShare.isSharing && <div className="share-overlay">🖥 Sharing</div>}

      {/* Top bar */}
      <div className="room-bar">
        <button className="room-logo">
          <div className="room-logo-ico">{mode === "debate" ? "⚔️" : mode === "seminar" ? "🎓" : "📹"}</div>
          DebateArena
        </button>
        <div className="rbar-div" />
        <div className="rbar-topic"><strong>{config.topic || "Session"}</strong></div>
        <div className="rbar-pill pill-timer">{timer}</div>
        {recorder.isRecording && (
          <div className="rbar-pill pill-rec"><div className="pill-rec-dot" />REC</div>
        )}
        {screenShare.isSharing && <div className="rbar-pill pill-share">🖥</div>}
        {isAI1v1 && (
          <div className={`rbar-pill ${whoTurn === "you" ? "pill-turn-you" : "pill-turn-ai"}`}>
            {whoTurn === "you" ? "🎤 Your Turn" : "🤖 AI Speaking…"}
          </div>
        )}
        {isMulti && (
          <div className="rbar-pill" style={{ background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.22)", color: "var(--ind3)", fontSize: 10.5, fontWeight: 700 }}>
            🎙 AI Mediating
          </div>
        )}
        <button className="rbar-end" onClick={() => setShowEnd(true)}>✕ End</button>
      </div>

      {/* Body */}
      <div className="room-body">
        <div className="grid-area">
          <div className={`vid-grid ${gc}`}>
            {participants.map(p => (
              <Tile
                key={p.id} p={p}
                reaction={tileReacts[p.id]}
                nudge={p.isLocal && nudge ? nudge : undefined}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="ctrl-bar">
            <div className="cg">
              <button className={`cbtn ${micOn ? "on" : "off"}`} onClick={toggleMic}>
                <span className="cbtn-ico">{micOn ? "🎤" : "🔇"}</span>
                <span>{micOn ? "Mute" : "Unmute"}</span>
              </button>
              {isMeeting && (
                <button className={`cbtn ${camOn ? "on" : "off"}`} onClick={toggleCam}>
                  <span className="cbtn-ico">{camOn ? "📹" : "🚫"}</span>
                  <span>{camOn ? "Stop Cam" : "Camera"}</span>
                </button>
              )}
              {isMeeting && (
                <button className={`cbtn ${screenShare.isSharing ? "sky" : ""}`} onClick={handleShare}>
                  <span className="cbtn-ico">🖥</span>
                  <span>{screenShare.isSharing ? "Stop Share" : "Share"}</span>
                </button>
              )}
              <div style={{ position: "relative" }}>
                <button className={`cbtn ${showReactions ? "hi" : ""}`} onClick={() => setShowReactions(r => !r)}>
                  <span className="cbtn-ico">😊</span><span>React</span>
                </button>
                {showReactions && (
                  <div className="react-pop">
                    {REACTIONS.map(r => (
                      <button key={r} className="react-emoji" onClick={() => sendReaction(r)}>{r}</button>
                    ))}
                  </div>
                )}
              </div>
              <button className={`cbtn ${me?.handRaised ? "amb" : ""}`} onClick={toggleHand}>
                <span className="cbtn-ico">✋</span>
                <span>{me?.handRaised ? "Lower" : "Raise"}</span>
              </button>
            </div>

            <div className="cg">
              <button
                className={`cbtn ${recorder.isRecording ? "rec" : ""}`}
                onClick={() =>
                  recorder.isRecording
                    ? (recorder.stop(), toast$("⏹ Recording stopped", "warn"))
                    : recorder.start(getLocalStream()).then((ok: boolean) =>
                        ok ? toast$("🔴 Recording started", "info") : toast$("Screen share needed", "error")
                      )
                }
              >
                <span className="cbtn-ico">⏺</span>
                <span>{recorder.isRecording ? "Stop" : "Record"}</span>
              </button>

              {!isAI1v1 && (
                <button className="cbtn" onClick={() => setShowAdd(true)}>
                  <span className="cbtn-ico">➕</span><span>Add</span>
                </button>
              )}

              {(mode === "debate" || mode === "seminar") && (
                <button className="cbtn em" onClick={() => setShowAnalysis(true)}>
                  <span className="cbtn-ico">📊</span><span>Analysis</span>
                </button>
              )}
            </div>

            <div className="cg">
              <button className={`cbtn ${panelTab === "people" ? "hi" : ""}`} onClick={() => setPanelTab(p => p === "people" ? null : "people")}>
                <span className="cbtn-ico">👥</span><span>People ({n})</span>
              </button>
              <button className={`cbtn ${panelTab === "chat" ? "hi" : ""}`} onClick={() => setPanelTab(p => p === "chat" ? null : "chat")}>
                <span className="cbtn-ico">💬</span><span>Chat</span>
              </button>
              {isAI1v1 && (
                <button className={`cbtn ${panelTab === "score" ? "hi" : ""}`} onClick={() => setPanelTab(p => p === "score" ? null : "score")}>
                  <span className="cbtn-ico">🏆</span><span>Score</span>
                </button>
              )}
              <button className="end-btn" onClick={() => setShowEnd(true)}>End</button>
            </div>
          </div>
        </div>

        {/* Side panel */}
        {panelTab && (
          <div className="side-panel">
            <div className="panel-tabs-dark">
              {[
                { id: "people", ico: "👥", lbl: "People" },
                { id: "chat",   ico: "💬", lbl: "Chat"   },
                ...(isAI1v1 ? [{ id: "score", ico: "🏆", lbl: "Score" }] : []),
              ].map(t => (
                <button key={t.id} className={`ptab ${panelTab === t.id ? "active" : ""}`} onClick={() => setPanelTab(t.id)}>
                  {t.ico}<span style={{ fontSize: 8.5, display: "block" }}>{t.lbl}</span>
                </button>
              ))}
              <button className="ptab ptab-cls" onClick={() => setPanelTab(null)}>✕</button>
            </div>

            {/* People list */}
            {panelTab === "people" && (
              <div className="pscroll">
                <div style={{ padding: "8px 10px 3px", fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.22)" }}>
                  {n} in room
                </div>
                <div className="p-list">
                  {participants.map(p => {
                    const color = p.avatarColor || COLORS[p.id % COLORS.length];
                    const init  = p.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <div key={p.id} className={`p-row ${p.isSpeaking ? "spk" : ""}`}>
                        <div className="p-av" style={{ background: color + "28", color }}>{p.isAI ? "🤖" : p.isMed ? "🎙️" : init}</div>
                        <div className="p-info">
                          <div className="p-name">
                            {p.name}{p.isLocal ? " (You)" : ""}{p.isSpeaking ? " 🔊" : ""}{p.handRaised ? " ✋" : ""}
                          </div>
                          <div className="p-role">{p.isHost ? "👑 Host" : p.isMed ? "🎙️ Mediator" : p.isAI ? "🤖 AI" : "👤 Participant"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 4, fontSize: 12 }}>
                          <span style={{ color: p.micMuted ? "var(--red)" : "var(--em)" }}>{p.micMuted ? "🔇" : "🎤"}</span>
                          {isMeeting && <span style={{ color: p.camOn ? "var(--sky)" : "rgba(255,255,255,.18)" }}>{p.camOn ? "📹" : "🚫"}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat */}
            {panelTab === "chat" && (
              <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
                <div className="pscroll" style={{ flex: 1 }}>
                  <div className="chat-msgs">
                    {messages.length === 0 && (
                      <div className="chat-empty">
                        No messages yet.<br />
                        {isAI1v1 ? "Type your argument — AI will respond!" : "Start the conversation!"}
                      </div>
                    )}
                    {messages.map((m, i) => {
                      const isOwn = m.sender === config.name;
                      const color = COLORS[m.senderId % COLORS.length];
                      return (
                        <div key={i} className={`chat-msg ${isOwn ? "own" : ""}`}>
                          {!isOwn && (
                            <div className="chat-av-sm" style={{ background: color + "28", color }}>
                              {m.sender[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="chat-bwrap">
                            {!isOwn && <span className="chat-sender">{m.sender}</span>}
                            <div className={`chat-bubble ${isOwn ? "bubble-own" : "bubble-o"}`}>{m.text}</div>
                            <span className="chat-time">{fmt(m.time)}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                </div>
                <div className="chat-ia">
                  <textarea
                    className="chat-inp"
                    placeholder={
                      isAI1v1
                        ? whoTurn === "you"
                          ? "Type your argument (AI responds via voice + text)…"
                          : "AI is responding, please wait…"
                        : "Send a message…"
                    }
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                    rows={1}
                    disabled={isAI1v1 && whoTurn === "ai"}
                  />
                  <button className="chat-send" onClick={() => sendMessage(chatInput)} disabled={isAI1v1 && whoTurn === "ai"}>➤</button>
                </div>
              </div>
            )}

            {/* Score + turn (AI 1v1) */}
            {panelTab === "score" && isAI1v1 && (
              <div className="pscroll">
                <div className="dp-wrap">
                  <div className="turn-box">
                    <div className="turn-label">Current Turn</div>
                    <div className={`turn-ind ${whoTurn === "you" ? "your" : "ai"}`}>
                      <div className="turn-dot" style={{ background: whoTurn === "you" ? "var(--em)" : "var(--vio)" }} />
                      <div>
                        <div className="turn-name">{whoTurn === "you" ? "Your Turn" : "AI Debater"}</div>
                        <div className="turn-hint">{whoTurn === "you" ? "Type in chat or speak your argument" : "AI is formulating its response…"}</div>
                      </div>
                    </div>
                    {whoTurn === "you" && (
                      <div style={{ marginTop: 7, padding: "8px 10px", borderRadius: 9, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.18)", fontSize: 11, color: "rgba(255,255,255,.5)", lineHeight: 1.6 }}>
                        💡 Tip: Turn off mic OR type your argument to pass the turn to AI.
                      </div>
                    )}
                  </div>

                  <div className="score-card">
                    <div className="sc-title">📊 Live Score</div>
                    <div className="sc-row">
                      <div className="sc-item"><div className="sc-val sc-u">{scores.you}</div><div className="sc-lbl">You</div></div>
                      <div className="sc-vs">VS</div>
                      <div className="sc-item"><div className="sc-val sc-a">{scores.ai}</div><div className="sc-lbl">AI</div></div>
                    </div>
                    <div className="sc-bar"><div className="sc-fill" style={{ width: `${(scores.you / (scores.you + scores.ai || 1)) * 100}%` }} /></div>
                  </div>

                  <div className="phase-card">
                    <div className="sc-title" style={{ marginBottom: 6 }}>📋 Debate Phases</div>
                    {PHASES.map((ph, i) => (
                      <div key={i} className={`ph-step ${i === phaseIdx ? "act" : ""}`}>
                        <div className={`ph-num ${i < phaseIdx ? "ph-done" : i === phaseIdx ? "ph-act" : "ph-pend"}`}>{i < phaseIdx ? "✓" : i + 1}</div>
                        <span className="ph-lbl">{ph}</span>
                      </div>
                    ))}
                    {phaseIdx < PHASES.length - 1 && (
                      <button className="btn-p" style={{ marginTop: 9, fontSize: 11, padding: "7px" }} onClick={() => setPhaseIdx(i => Math.min(i + 1, PHASES.length - 1))}>
                        Next Phase →
                      </button>
                    )}
                  </div>

                  <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: "10px 12px" }}>
                    <div className="sc-title" style={{ marginBottom: 5 }}>💡 Coach Tip</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.42)", lineHeight: 1.7 }}>
                      Use <strong style={{ color: "#fff" }}>PEEL</strong>: Point → Evidence → Explanation → Link back to the motion. Address your opponent's strongest argument directly before rebutting it.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis modal */}
      {showAnalysis && (
        <AnalysisReport
          mode={mode} subMode={subMode} topic={config.topic}
          participants={participants} scores={scores}
          timer={timer} transcript={transcript}
          onClose={() => setShowAnalysis(false)} onDl={dlAnalysis}
        />
      )}

      {/* Add participant modal */}
      {showAdd && (
        <div className="overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="mh">
              <span className="mh-title">➕ Add Participant</span>
              <button className="mh-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="link-box">
                <div className="link-box-title">🔗 Room Link — share with participants</div>
                <div className="link-row">
                  <span className="link-val">{config.roomLink || `https://debatearena.app/join?room=${config.roomId}`}</span>
                  <button className="copy-btn" onClick={() => {
                    navigator.clipboard.writeText(config.roomLink || `https://debatearena.app/join?room=${config.roomId}`);
                    toast$("🔗 Link copied!", "success");
                  }}>Copy</button>
                </div>
                <div className="share-actions">
                  <button className="share-btn" onClick={() => toast$("📧 Share via email — use the link above", "info")}>📧 Email</button>
                  <button className="share-btn" onClick={() => { navigator.clipboard.writeText(config.roomLink || ""); toast$("🔗 Link copied — share via WhatsApp", "info"); }}>💬 WhatsApp</button>
                  <button className="share-btn" onClick={() => { if (navigator.share) navigator.share({ title: "Join my session", url: config.roomLink || "" }); }}>↗ Share</button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0", color: "var(--t3)", fontSize: 11.5, fontWeight: 700 }}>
                <div style={{ flex: 1, height: 1, background: "var(--bdr)" }} /> OR ADD DIRECTLY <div style={{ flex: 1, height: 1, background: "var(--bdr)" }} />
              </div>

              <div className="fi">
                <label className="fl">Name</label>
                <input className="finput" placeholder="John Smith" value={addInput} onChange={e => setAddInput(e.target.value)} />
              </div>
              <div className="fi" style={{ marginBottom: 14 }}>
                <label className="fl">Email address (optional — to send invite)</label>
                <input className="finput" placeholder="john@email.com" value={addEmail} onChange={e => setAddEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addParticipant()} />
              </div>
              <div style={{ fontSize: 11.5, color: "var(--t3)", lineHeight: 1.6, marginBottom: 4 }}>
                • Enter <strong>email</strong> → invite sent automatically<br />
                • Enter <strong>name only</strong> → room link copied to clipboard
              </div>
            </div>
            <div className="mf">
              <button className="btn-s" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-p" style={{ width: "auto", padding: "9px 18px" }}
                disabled={!addInput.trim() && !addEmail.trim()} onClick={addParticipant}>
                {addEmail.trim() ? "📧 Send Invite" : "🔗 Add & Copy Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End session modal */}
      {showEnd && (
        <div className="overlay" onClick={() => setShowEnd(false)}>
          <div className="modal dark" style={{ maxWidth: 370 }} onClick={e => e.stopPropagation()}>
            <div className="mh">
              <span className="mh-title">End Session?</span>
              <button className="mh-close" onClick={() => setShowEnd(false)}>✕</button>
            </div>
            <div className="mb" style={{ textAlign: "center", padding: "20px" }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🏁</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 6 }}>End this session?</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", lineHeight: 1.75, marginBottom: 13 }}>
                Duration: <strong style={{ color: "var(--ind3)" }}>{timer}</strong> · {participants.filter(p => !p.isAI && !p.isMed).length} participants
                {recorder.isRecording && <><br /><span style={{ color: "var(--em)" }}>✅ Recording will be saved</span></>}
              </div>
              {recorder.blob && !recorder.isRecording && (
                <button className="btn-s" style={{ width: "100%", marginBottom: 8, fontSize: 12 }} onClick={() => recorder.download(`debatearena-${mode}.webm`)}>
                  📥 Download Recording First
                </button>
              )}
              {(mode === "debate" || mode === "seminar") && (
                <button className="btn-s" style={{ width: "100%", marginBottom: 8, fontSize: 12, borderColor: "rgba(99,102,241,.3)", color: "var(--ind)" }} onClick={() => { setShowEnd(false); setShowAnalysis(true); }}>
                  📊 View Analysis Report First
                </button>
              )}
            </div>
            <div className="mf">
              <button className="btn-s" style={{ background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)" }} onClick={() => setShowEnd(false)}>
                Keep Going
              </button>
              <button className="btn-d" onClick={handleEnd}>End Session</button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  );
}