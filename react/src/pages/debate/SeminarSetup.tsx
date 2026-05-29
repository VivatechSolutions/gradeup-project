import { useState } from "react";
import { TOPICS, genLink, syncToCalendar, pushNotification } from "./shared";
import { useMicPerm } from "./hooks";
import { MicPreview, StepsBar, CalSyncToggle, useToast } from "./UIComponents";

interface SeminarSetupProps { onBack: () => void; onLaunch: (config: any) => void; }

export function SeminarSetup({ onBack, onLaunch }: SeminarSetupProps) {
  const [name, setName]           = useState("");
  const [topic, setTopic]         = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [micOn, setMicOn]         = useState(true);
  const [invitees, setInvitees]   = useState<any[]>([]);
  const [addInput, setAddInput]   = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("10:00");
  const [syncCal, setSyncCal]     = useState(true);
  const [copied, setCopied]       = useState(false);
  const [link]                    = useState(genLink);
  const { state: permState, stream, request: requestMic, stop: stopStream } = useMicPerm();
  const { show: toast$, node: toastNode } = useToast();

  const toggleMic = () => { const n = !micOn; setMicOn(n); stream?.getAudioTracks().forEach(t => t.enabled = n); };
  const finalTopic = topic === "__custom__" ? customTopic : topic;
  const addInvitee = () => {
    const v = addInput.trim();
    if (v && !invitees.find(x => x.value === v)) { setInvitees(i => [...i, { value: v, type: v.includes("@") ? "email" : "name" }]); setAddInput(""); }
  };
  const copyLink = () => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  const steps = [
    { label: "Enter your name",   done: name.trim().length > 0 },
    { label: "Allow microphone",  done: permState === "granted" },
    { label: "Select topic",      done: !!finalTopic },
  ];
  const canLaunch = steps.every(s => s.done);

  function handleLaunch() {
    if (syncCal) { syncToCalendar({ type: "seminar", title: finalTopic, date: schedDate ? new Date(schedDate + "T12:00:00") : new Date(), time: schedTime, attendees: invitees, link, description: `Seminar: "${finalTopic}". Host: ${name}.` }); }
    pushNotification({ title: `🎓 Seminar: "${finalTopic.slice(0, 38)}"`, body: `By ${name}${schedDate ? ` for ${schedDate}` : " (now)"}.`, eventType: "seminar" as any, category: "assignment" });
    onLaunch({ name, mode: "seminar", subMode: "multi", topic: finalTopic, stream, micOn, camOn: false, invitees, link, syncedToCalendar: syncCal });
  }

  return (
    <div className="setup-shell">
      {/* Left */}
      <div className="setup-left">
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(245,166,35,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(245,166,35,.04) 1px,transparent 1px)", backgroundSize: "38px 38px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,166,35,.14) 0%,transparent 70%)", top: -80, left: -60, pointerEvents: "none", animation: "orbFloat 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(240,69,69,.1) 0%,transparent 70%)", bottom: -40, right: -20, pointerEvents: "none", animation: "orbFloat 11s ease-in-out infinite reverse" }} />
        <div className="setup-left-scroll">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, animation: "slideLeft .4s ease" }}>
            <div style={{ width: 32, height: 32, background: "var(--grad3)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🎓</div>
            <span style={{ fontFamily: "var(--head)", fontSize: 14, fontWeight: 800, background: "linear-gradient(90deg,#fff,#fcd34d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DebateArena</span>
          </div>
          <div className="land-tag" style={{ marginBottom: 14, background: "rgba(245,166,35,.15)", borderColor: "rgba(245,166,35,.3)", color: "#fcd34d", animation: "slideLeft .4s ease .08s both" }}>
            <div className="land-tag-dot" style={{ background: "var(--amb)" }} />Seminar Setup
          </div>
          <h2 style={{ fontFamily: "var(--head)", fontSize: "clamp(20px,2.5vw,38px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: -1, color: "#fff", marginBottom: 12, animation: "slideLeft .4s ease .12s both" }}>
            Set up your<br /><span style={{ background: "var(--grad3)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Seminar Room</span>
          </h2>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.42)", lineHeight: 1.85, marginBottom: 24, animation: "slideLeft .4s ease .16s both" }}>
            Host a multi-participant seminar. AI acts as facilitator and generates a full individual analysis report for every participant.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              { ico: "🎙️", t: "AI Facilitator",       d: "Guides discussion & encourages all voices", delay: ".2s" },
              { ico: "👥", t: "Multi-participant",     d: "Invite attendees via name or email", delay: ".26s" },
              { ico: "📋", t: "Full Analysis Report",  d: "Individual scores, themes & verdict", delay: ".32s" },
              { ico: "📅", t: "Calendar Sync",         d: "Sessions auto-saved with notifications", delay: ".38s" },
            ].map(f => (
              <div key={f.t} className="land-feat" style={{ animation: `slideLeft .4s ease ${f.delay} both` }}>
                <div className="land-feat-ico">{f.ico}</div>
                <div className="land-feat-txt"><strong>{f.t}</strong><span>{f.d}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="setup-right">
        <div className="setup-right-scroll">
          <div className="setup-right-inner">
            <button className="setup-back" onClick={() => { stopStream(); onBack(); }}>← Back to Home</button>
            <h2 className="setup-title">🎓 Seminar Setup</h2>
            <p className="setup-sub">Launch a structured seminar with AI facilitation.</p>

            <MicPreview permState={permState} name={name} onRequest={requestMic} micOn={micOn} onToggleMic={toggleMic} />

            <div className="fi">
              <label className="fl">Your Name</label>
              <input className="finput" placeholder="e.g. Dr. Sarah Chen" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
            </div>

            <div className="fi">
              <label className="fl">Seminar Topic</label>
              <select className="finput" value={topic} onChange={e => setTopic(e.target.value)}>
                <option value="">Select a topic…</option>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="__custom__">✏️ Custom topic…</option>
              </select>
            </div>
            {topic === "__custom__" && (
              <div className="fi"><label className="fl">Custom Topic</label><input className="finput" placeholder="Enter seminar topic…" value={customTopic} onChange={e => setCustomTopic(e.target.value)} /></div>
            )}

            <div className="fi">
              <label className="fl">Invite Participants</label>
              <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
                <input className="finput" placeholder="Name or email…" value={addInput} onChange={e => setAddInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addInvitee()} style={{ flex: 1 }} />
                <button className="btn-s" style={{ padding: "9px 12px", whiteSpace: "nowrap" }} onClick={addInvitee}>+ Add</button>
              </div>
              {invitees.length > 0 && (
                <div className="user-chips">
                  {invitees.map((n, i) => (
                    <div key={i} className="user-chip">{n.type === "email" ? "📧" : "👤"} {n.value}
                      <button className="chip-rm" onClick={() => setInvitees(inv => inv.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="fi-row fi">
              <div><label className="fl">Date (optional)</label><input className="finput" type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={{ colorScheme: "light" }} /></div>
              <div><label className="fl">Time</label><input className="finput" type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} style={{ colorScheme: "light" }} /></div>
            </div>

            <div className="fi">
              <label className="fl">Room Link</label>
              <div className="link-row"><span className="link-val">{link}</span><button className="copy-btn" onClick={copyLink}>{copied ? "✓ Copied!" : "Copy"}</button></div>
            </div>

            <CalSyncToggle enabled={syncCal} onChange={setSyncCal} />
            <StepsBar steps={steps} />
            <button className="btn-p" onClick={handleLaunch} disabled={!canLaunch}>🚀 Launch Seminar Room</button>
          </div>
        </div>
      </div>
      {toastNode}
    </div>
  );
}