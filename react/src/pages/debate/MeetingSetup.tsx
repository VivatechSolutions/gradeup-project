import { useState } from "react";
import { genLink, syncToCalendar, pushNotification } from "./shared";
import { useMediaPerm } from "./hooks";
import { CamPreview, StepsBar, CalSyncToggle, useToast } from "./UIComponents";

interface MeetingSetupProps { onBack: () => void; onLaunch: (config: any) => void; }

export function MeetingSetup({ onBack, onLaunch }: MeetingSetupProps) {
  const [name, setName]           = useState("");
  const [mtgType, setMtgType]     = useState<"instant"|"schedule"|"">("");
  const [title, setTitle]         = useState("");
  const [micOn, setMicOn]         = useState(true);
  const [camOn, setCamOn]         = useState(true);
  const [invitees, setInvitees]   = useState<any[]>([]);
  const [addInput, setAddInput]   = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("10:00");
  const [syncCal, setSyncCal]     = useState(true);
  const [copied, setCopied]       = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [link]                    = useState(genLink);
  const { state: permState, stream, request: requestPerm, stop: stopStream } = useMediaPerm();
  const { show: toast$, node: toastNode } = useToast();

  const toggleMic = () => { const n = !micOn; setMicOn(n); stream?.getAudioTracks().forEach(t => t.enabled = n); };
  const toggleCam = () => { const n = !camOn; setCamOn(n); stream?.getVideoTracks().forEach(t => t.enabled = n); };
  const addInvitee = () => {
    const v = addInput.trim();
    if (v && !invitees.find(x => x.value === v)) { setInvitees(i => [...i, { value: v, type: v.includes("@") ? "email" : "name" }]); setAddInput(""); }
  };
  const copyLink = () => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  const steps = [
    { label: "Enter your name",  done: name.trim().length > 0 },
    { label: "Allow camera & mic",done: permState === "granted" },
    { label: "Choose meeting type",done: !!mtgType },
  ];
  const canJoin = steps.every(s => s.done);

  function handleLaunch() {
    const evtTitle = title || "Team Meeting";
    if (syncCal) { syncToCalendar({ type: "meeting", title: evtTitle, date: schedDate ? new Date(schedDate + "T12:00:00") : new Date(), time: schedTime, attendees: invitees, link, description: `Meeting: "${evtTitle}". Host: ${name}.` }); }
    pushNotification({ title: `📹 ${mtgType === "schedule" ? "Meeting Scheduled" : "Meeting Started"}: "${evtTitle}"`, body: `Host: ${name}${schedDate ? `. For ${schedDate}` : ""}. ${invitees.length} invite(s).`, eventType: "meeting", category: "assignment" });
    if (mtgType === "schedule") {
      navigator.clipboard.writeText(link);
      setScheduled(true);
      toast$("📅 Meeting scheduled! Link copied.", "success");
      return;
    }
    onLaunch({ name, mode: "meeting", topic: evtTitle, stream, micOn, camOn, invitees, link, syncedToCalendar: syncCal });
  }

  return (
    <div className="setup-shell">
      {/* Left */}
      <div className="setup-left">
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(54,194,245,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(54,194,245,.04) 1px,transparent 1px)", backgroundSize: "38px 38px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(54,194,245,.13) 0%,transparent 70%)", top: -80, right: -60, pointerEvents: "none", animation: "orbFloat 9s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(91,94,244,.1) 0%,transparent 70%)", bottom: -40, left: -20, pointerEvents: "none", animation: "orbFloat 12s ease-in-out infinite reverse" }} />
        <div className="setup-left-scroll">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, animation: "slideLeft .4s ease" }}>
            <div style={{ width: 32, height: 32, background: "var(--grad2)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📹</div>
            <span style={{ fontFamily: "var(--head)", fontSize: 14, fontWeight: 800, background: "linear-gradient(90deg,#fff,var(--sky))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DebateArena</span>
          </div>
          <div className="land-tag" style={{ marginBottom: 14, background: "rgba(54,194,245,.14)", borderColor: "rgba(54,194,245,.28)", color: "var(--sky)", animation: "slideLeft .4s ease .08s both" }}>
            <div className="land-tag-dot" style={{ background: "var(--sky)" }} />Meeting Setup
          </div>
          <h2 style={{ fontFamily: "var(--head)", fontSize: "clamp(20px,2.5vw,38px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: -1, color: "#fff", marginBottom: 12, animation: "slideLeft .4s ease .12s both" }}>
            Set up your<br /><span style={{ background: "var(--grad2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Meeting Room</span>
          </h2>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.42)", lineHeight: 1.85, marginBottom: 24, animation: "slideLeft .4s ease .16s both" }}>
            Video call with camera, microphone, screen sharing and session recording. Start instantly or schedule ahead.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              { ico: "⚡", t: "Instant Meetings",   d: "Start a video call in seconds", delay: ".2s" },
              { ico: "📅", t: "Scheduled Meetings", d: "Plan ahead with full calendar invite", delay: ".26s" },
              { ico: "🖥",  t: "Screen Sharing",    d: "Share your screen in real time", delay: ".32s" },
              { ico: "🎬", t: "Recording",          d: "Record & download as a video file", delay: ".38s" },
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
            <h2 className="setup-title">📹 Meeting Setup</h2>
            <p className="setup-sub">Start instantly or schedule for later.</p>

            <CamPreview stream={stream} camOn={camOn} micOn={micOn} name={name} permState={permState} onRequest={requestPerm} onToggleMic={toggleMic} onToggleCam={toggleCam} />

            <div className="fi">
              <label className="fl">Your Name</label>
              <input className="finput" placeholder="e.g. Alex Chen" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
            </div>

            {/* Meeting type */}
            <div className="fi">
              <label className="fl">Meeting Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ id: "instant", ico: "⚡", label: "Quick Meeting" }, { id: "schedule", ico: "📅", label: "Schedule" }].map(o => (
                  <div key={o.id} onClick={() => setMtgType(o.id as any)}
                    style={{ flex: 1, padding: "11px 13px", borderRadius: 11, border: `1.5px solid ${mtgType === o.id ? "var(--ind)" : "var(--bdr)"}`, background: mtgType === o.id ? "rgba(91,94,244,.06)" : "var(--surf2)", cursor: "pointer", transition: ".2s", display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 12.5 }}>
                    <span style={{ fontSize: 17 }}>{o.ico}</span>{o.label}
                  </div>
                ))}
              </div>
            </div>

            {mtgType === "schedule" && (
              <>
                <div className="fi"><label className="fl">Meeting Title</label><input className="finput" placeholder="e.g. Weekly Standup" value={title} onChange={e => setTitle(e.target.value)} /></div>
                <div className="fi-row fi">
                  <div><label className="fl">Date</label><input className="finput" type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={{ colorScheme: "light" }} /></div>
                  <div><label className="fl">Time</label><input className="finput" type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} style={{ colorScheme: "light" }} /></div>
                </div>
              </>
            )}

            <div className="fi">
              <label className="fl">Add Participants</label>
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

            <div className="fi">
              <label className="fl">Meeting Link</label>
              <div className="link-row"><span className="link-val">{link}</span><button className="copy-btn" onClick={copyLink}>{copied ? "✓ Copied!" : "Copy"}</button></div>
            </div>

            <CalSyncToggle enabled={syncCal} onChange={setSyncCal} />

            {scheduled && (
              <div className="sync-ok" style={{ marginBottom: 11 }}>
                <div style={{ fontSize: 26 }}>📅✅</div>
                <div className="sync-ok-title">Meeting Scheduled!</div>
                <div className="sync-ok-sub">Link copied to clipboard. Invitees notified. Saved to calendar.</div>
              </div>
            )}

            <StepsBar steps={steps} />
            <button className="btn-p" onClick={handleLaunch} disabled={!canJoin}>
              {mtgType === "schedule" ? "📅 Schedule Meeting" : "🚀 Start Meeting Now"}
            </button>
          </div>
        </div>
      </div>
      {toastNode}
    </div>
  );
}