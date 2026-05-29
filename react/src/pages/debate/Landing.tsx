import { useState } from "react";
import { useToast } from "./UIComponents";

interface LandingProps { onSelect: (mode: string) => void; }

export function Landing({ onSelect }: LandingProps) {
  const [sel, setSel] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [joinName, setJoinName] = useState("");
  const { show: toast$, node: toastNode } = useToast();

  function handleJoin() {
    if (!joinLink.trim() || !joinName.trim()) { toast$("Enter your name and a room link", "warn"); return; }
    toast$(`🔗 Joining as "${joinName}"…`, "info");
    setTimeout(() => toast$("✅ Joined! (Connect to a live room in production)", "success"), 1800);
  }

  const features = [
    { ico: "⚔️", t: "AI Debate Partner",    d: "Real-time rebuttals + score tracking" },
    { ico: "👥", t: "Multi-User Debate",     d: "AI mediator for group debates" },
    { ico: "🎓", t: "Seminar Sessions",      d: "AI-facilitated group discussions" },
    { ico: "📹", t: "Video Meetings",        d: "Camera, mic & screen sharing" },
    { ico: "📊", t: "Analysis Reports",      d: "Full AI-generated debate feedback" },
    { ico: "📅", t: "Calendar Sync",         d: "Auto-save with notifications" },
  ];

  const modes = [
    { id: "debate",  ico: "⚔️", title: "Debate",      desc: "AI 1-on-1 or multi-user with AI mediator" },
    { id: "meeting", ico: "📹", title: "Meeting",      desc: "Video call with screen sharing & recording" },
    { id: "seminar", ico: "🎓", title: "Seminar",      desc: "AI-mediated group discussion & analysis" },
  ];

  return (
    <div className="land-shell">
      {/* Left */}
      <div className="land-left">
        <div className="land-orb land-orb1" />
        <div className="land-orb land-orb2" />
        <div className="land-orb land-orb3" />
        <div className="land-grid" />
        <div className="land-left-scroll">
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 26, animation: "fadeUp .5s ease .05s both" }}>
            <div style={{ width: 36, height: 36, background: "var(--grad)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 6px 18px rgba(91,94,244,.38)", animation: "glow 3s ease-in-out infinite" }}>⚔️</div>
            <span style={{ fontFamily: "var(--head)", fontSize: 16, fontWeight: 800, background: "linear-gradient(90deg,#fff,var(--ind3))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DebateArena</span>
          </div>
          <div className="land-tag" style={{ animation: "fadeUp .5s ease .1s both" }}><div className="land-tag-dot" />Live Platform · v2.0</div>
          <h1 className="land-h1">
            Sharpen Your<br /><span className="grad-t">Arguments.</span><br />Win Every <span className="grad-t">Debate.</span>
          </h1>
          <p className="land-p">Professional debate rooms with AI opponents, live scoring, structured phases, full recording, and calendar integration — all in one platform.</p>
          <div className="land-feats">
            {features.map((f, i) => (
              <div key={f.t} className="land-feat" style={{ animationDelay: `${0.15 + i * 0.07}s` }}>
                <div className="land-feat-ico">{f.ico}</div>
                <div className="land-feat-txt"><strong>{f.t}</strong><span>{f.d}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="land-right">
        <div className="land-right-scroll">
          <div className="mode-wrap">
            <h2 className="mode-title" style={{ animation: "slideRight .45s ease .1s both" }}>What would you like to do?</h2>
            <p className="mode-sub" style={{ animation: "slideRight .45s ease .15s both" }}>Choose a session type below. All modes sync with your calendar and notifications.</p>

            <div className="mode-cards" style={{ animation: "slideRight .45s ease .2s both" }}>
              {modes.map(m => (
                <div key={m.id} className={`mode-card ${sel === m.id ? "sel" : ""}`} onClick={() => setSel(m.id)}>
                  <div className="mode-card-ck">✓</div>
                  <span className="mode-card-ico">{m.ico}</span>
                  <div className="mode-card-title">{m.title}</div>
                  <div className="mode-card-desc">{m.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ animation: "slideRight .45s ease .25s both" }}>
              <button className="btn-p" style={{ marginBottom: 12 }} disabled={!sel} onClick={() => sel && onSelect(sel)}>
                {sel ? (sel === "debate" ? "⚔️ Setup Debate Room" : sel === "meeting" ? "📹 Setup Meeting Room" : "🎓 Setup Seminar Room") : "Select a mode to continue →"}
              </button>
            </div>

            {/* Join by link */}
            <div className="join-box" style={{ animation: "slideRight .45s ease .3s both" }}>
              <div className="join-box-title">🔗 Join with Link</div>
              {!showJoin ? (
                <button className="btn-s" style={{ width: "100%", fontSize: 12.5, justifyContent: "center", display: "flex", gap: 6 }} onClick={() => setShowJoin(true)}>
                  Have a room link? Join here →
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <input className="finput" placeholder="Your name" value={joinName} onChange={e => setJoinName(e.target.value)} />
                  <input className="finput" placeholder="Paste room link… https://debatearena.app/join?room=…" value={joinLink} onChange={e => setJoinLink(e.target.value)} onKeyDown={e => e.key === "Enter" && handleJoin()} />
                  <div style={{ display: "flex", gap: 7 }}>
                    <button className="btn-s" style={{ flex: "0 0 auto" }} onClick={() => { setShowJoin(false); setJoinLink(""); setJoinName(""); }}>Cancel</button>
                    <button className="btn-p" style={{ flex: 1, fontSize: 12.5 }} onClick={handleJoin} disabled={!joinLink.trim() || !joinName.trim()}>🔗 Join Session</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {toastNode}
    </div>
  );
}