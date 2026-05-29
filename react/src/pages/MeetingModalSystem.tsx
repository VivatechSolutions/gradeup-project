import { useState, useEffect, useRef, useCallback } from "react";


/* ── tiny helpers ── */
const genRoomCode = () =>
  Math.random().toString(36).slice(2, 5).toUpperCase() + "-" +
  Math.random().toString(36).slice(2, 5).toUpperCase();

const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const AV_COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f43f5e", "#f59e0b"];
const avColor = (n: string) => AV_COLORS[(n || "U").charCodeAt(0) % AV_COLORS.length];
const avInit  = (n: string) => (n || "U").split(/[_\s]/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

const ROOM_CONFIG_KEY = "da_community_room_config";

/* ── per-type config ── */
const TYPE_META: Record<string, { grad: string; icon: string; label: string; iconBg: string; iconColor: string }> = {
  meeting: { grad: "linear-gradient(135deg,#0ea5e9,#6366f1)", icon: "📹", label: "Meeting",  iconBg: "rgba(14,165,233,.12)",  iconColor: "#0ea5e9" },
  debate:  { grad: "linear-gradient(135deg,#f59e0b,#ef4444)", icon: "🎤", label: "Debate",   iconBg: "rgba(245,158,11,.12)",  iconColor: "#f59e0b" },
  seminar: { grad: "linear-gradient(135deg,#10b981,#8b5cf6)", icon: "📚", label: "Seminar",  iconBg: "rgba(16,185,129,.12)",  iconColor: "#10b981" },
};

/* ═══════════════════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════════════════ */
export const MEETING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
@keyframes mtg-in   {from{opacity:0;transform:scale(.93) translateY(18px)}to{opacity:1;transform:none}}
@keyframes mtg-up   {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes mtg-blink{0%,100%{background:#ef4444}50%{background:#f87171}}
@keyframes mtg-spin {to{transform:rotate(360deg)}}
.mtg-ov{position:fixed;inset:0;z-index:9000;background:rgba(10,14,26,.72);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;}
.mtg-modal{background:#fff;border-radius:24px;width:100%;max-width:480px;box-shadow:0 28px 72px rgba(0,0,0,.22);overflow:hidden;animation:mtg-in .32s cubic-bezier(.34,1.42,.64,1) both;}
.mtg-modal.dark,.mtg-jmodal.dark{background:#1e293b;}
.mtg-jmodal{background:#fff;border-radius:24px;width:100%;max-width:460px;box-shadow:0 28px 72px rgba(0,0,0,.22);overflow:hidden;animation:mtg-in .32s cubic-bezier(.34,1.42,.64,1) both;}
.mtg-head{padding:22px 24px 18px;position:relative;overflow:hidden;}
.mtg-head::before{content:'';position:absolute;inset:0;opacity:.1;background:repeating-linear-gradient(45deg,rgba(255,255,255,.35) 0,rgba(255,255,255,.35) 1px,transparent 1px,transparent 12px);}
.mtg-hc{position:relative;z-index:1;display:flex;align-items:flex-start;gap:12px;}
.mtg-back{width:32px;height:32px;border-radius:10px;flex-shrink:0;margin-top:2px;background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.3);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:background .15s;}
.mtg-back:hover{background:rgba(255,255,255,.32);}
.mtg-close{width:30px;height:30px;border-radius:9px;margin-left:auto;flex-shrink:0;background:rgba(255,255,255,.18);border:1.5px solid rgba(255,255,255,.28);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:background .15s;}
.mtg-close:hover{background:rgba(255,255,255,.32);}
.mtg-hico{font-size:28px;line-height:1;margin-bottom:6px;}
.mtg-htitle{font-size:17px;font-weight:800;color:#fff;letter-spacing:-.2px;}
.mtg-hsub{font-size:12px;color:rgba(255,255,255,.72);margin-top:3px;}
.mtg-body{padding:20px 24px 24px;max-height:72vh;overflow-y:auto;}
.mtg-body::-webkit-scrollbar{width:4px;}
.mtg-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.1);border-radius:4px;}
.mtg-opt{width:100%;display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;border:1.5px solid rgba(0,0,0,.07);background:#fff;cursor:pointer;font-family:inherit;text-align:left;transition:all .2s;margin-bottom:9px;}
.mtg-modal.dark .mtg-opt{border-color:rgba(255,255,255,.09);background:#283447;}
.mtg-opt:last-child{margin-bottom:0;}
.mtg-opt:hover{border-color:#6366f1;transform:translateX(4px);background:rgba(99,102,241,.04);}
.mtg-opt-ico{width:46px;height:46px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;}
.mtg-opt-label{font-size:14px;font-weight:800;color:#0f172a;}
.mtg-modal.dark .mtg-opt-label{color:#f1f5f9;}
.mtg-opt-desc{font-size:12px;color:#64748b;margin-top:2px;line-height:1.45;}
.mtg-modal.dark .mtg-opt-desc{color:#94a3b8;}
.mtg-opt-arr{margin-left:auto;font-size:18px;color:#94a3b8;flex-shrink:0;}
.mtg-badge{font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0;}
.mtg-field{margin-bottom:14px;}
.mtg-field label{display:block;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:5px;}
.mtg-finput{width:100%;height:42px;border-radius:12px;border:1.5px solid rgba(0,0,0,.09);background:#f8fafc;padding:0 13px;font-size:13.5px;color:#0f172a;outline:none;font-family:inherit;transition:all .2s;box-sizing:border-box;}
.mtg-finput:focus{border-color:#6366f1;background:#fff;box-shadow:0 0 0 3px rgba(99,102,241,.1);}
.mtg-frow{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.mtg-brow{display:flex;gap:10px;margin-top:20px;}
.mtg-cancel{flex:1;padding:11px;border-radius:13px;border:1.5px solid rgba(0,0,0,.09);background:#fff;font-family:inherit;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;transition:all .18s;}
.mtg-cancel:hover{border-color:#6366f1;color:#4f46e5;}
.mtg-primary{flex:2;padding:11px;border-radius:13px;border:none;font-family:inherit;font-size:13px;font-weight:700;color:#fff;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:7px;}
.mtg-primary:hover{transform:translateY(-1px);filter:brightness(1.07);}
.mtg-primary:disabled{opacity:.45;cursor:not-allowed;transform:none;}
.mtg-link{padding:10px 13px;border-radius:11px;background:rgba(99,102,241,.06);border:1px dashed rgba(99,102,241,.25);font-size:12px;color:#4f46e5;word-break:break-all;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px;}
.mtg-copy{flex-shrink:0;padding:4px 10px;border-radius:7px;border:none;background:rgba(99,102,241,.15);color:#4f46e5;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;}
.mtg-copy:hover{background:rgba(99,102,241,.25);}
.mtg-card{border-radius:18px;overflow:hidden;border:1.5px solid rgba(0,0,0,.07);box-shadow:0 4px 18px rgba(0,0,0,.08);max-width:380px;width:100%;animation:mtg-up .35s cubic-bezier(.34,1.56,.64,1) both;font-family:'Plus Jakarta Sans',system-ui,sans-serif;}
.mtg-card-head{padding:14px 16px 12px;display:flex;align-items:center;gap:11px;position:relative;overflow:hidden;}
.mtg-card-head::before{content:'';position:absolute;inset:0;opacity:.08;background:repeating-linear-gradient(45deg,rgba(255,255,255,.4) 0,rgba(255,255,255,.4) 1px,transparent 1px,transparent 10px);}
.mtg-card-hico{width:40px;height:40px;border-radius:12px;flex-shrink:0;position:relative;z-index:1;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;}
.mtg-card-htxt{position:relative;z-index:1;flex:1;min-width:0;}
.mtg-card-title{font-size:14px;font-weight:800;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mtg-card-sub{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;}
.mtg-card-live{position:relative;z-index:1;flex-shrink:0;display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.3);}
.mtg-card-live-dot{width:6px;height:6px;border-radius:50%;animation:mtg-blink 1.2s ease infinite;background:#ef4444;}
.mtg-card-live-lbl{font-size:10px;font-weight:800;color:#fca5a5;letter-spacing:.04em;}
.mtg-card-body{padding:12px 16px 14px;background:#fff;}
.mtg-card.dark .mtg-card-body{background:#1e293b;}
.mtg-card-row{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12.5px;border-bottom:1px solid rgba(0,0,0,.05);}
.mtg-card.dark .mtg-card-row{border-color:rgba(255,255,255,.06);}
.mtg-card-row:last-of-type{border-bottom:none;}
.mtg-card-key{color:#64748b;width:76px;flex-shrink:0;font-weight:500;}
.mtg-card.dark .mtg-card-key{color:#94a3b8;}
.mtg-card-val{color:#0f172a;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mtg-card.dark .mtg-card-val{color:#f1f5f9;}
.mtg-card-timer{font-size:11.5px;font-weight:700;color:#6366f1;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.18);border-radius:8px;padding:2px 9px;}
.mtg-card-foot{padding:10px 16px 12px;display:flex;align-items:center;gap:8px;background:#f8fafc;border-top:1px solid rgba(0,0,0,.05);}
.mtg-card.dark .mtg-card-foot{background:#162032;border-color:rgba(255,255,255,.06);}
.mtg-join-btn{flex:1;padding:9px 0;border-radius:11px;border:none;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:13px;font-weight:700;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s;box-shadow:0 3px 10px rgba(0,0,0,.18);}
.mtg-join-btn:hover{transform:translateY(-1px);filter:brightness(1.08);}
.mtg-join-btn.ended{background:#f1f5f9 !important;color:#94a3b8;cursor:default;box-shadow:none;transform:none;filter:none;}
.mtg-pav{width:22px;height:22px;border-radius:50%;border:2px solid #f8fafc;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;color:#fff;margin-left:-4px;flex-shrink:0;}
.mtg-pav:first-child{margin-left:0;}
.mtg-perm-row{display:flex;gap:10px;margin-bottom:16px;}
.mtg-perm-btn{flex:1;padding:12px 10px;border-radius:14px;border:1.5px solid rgba(0,0,0,.08);background:#f8fafc;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:all .2s;font-family:inherit;}
.mtg-perm-btn.on{border-color:#6366f1;background:rgba(99,102,241,.07);box-shadow:0 0 0 3px rgba(99,102,241,.1);}
.mtg-perm-ico{font-size:22px;line-height:1;}
.mtg-perm-lbl{font-size:11px;font-weight:700;color:#64748b;}
.mtg-perm-btn.on .mtg-perm-lbl{color:#4f46e5;}
.mtg-preview{width:100%;height:120px;border-radius:14px;background:linear-gradient(145deg,#1e293b,#0f172a);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;margin-bottom:16px;position:relative;overflow:hidden;border:1.5px solid rgba(99,102,241,.18);}
.mtg-preview-av{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;}
.mtg-preview-name{font-size:12px;font-weight:700;color:rgba(255,255,255,.8);}
.mtg-preview-muted{position:absolute;bottom:8px;right:8px;background:rgba(239,68,68,.7);border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;color:#fff;}
.mtg-mini-cal{border-radius:14px;border:1.5px solid rgba(0,0,0,.07);padding:12px 14px;margin-bottom:14px;}
.mtg-mini-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
.mtg-mini-cell{height:26px;border-radius:7px;font-size:10.5px;font-weight:500;display:flex;align-items:center;justify-content:center;color:#374151;}
.mtg-mini-cell.target{color:#fff !important;font-weight:800;box-shadow:0 3px 8px rgba(0,0,0,.2);}
.mtg-mini-dlbl{font-size:9px;font-weight:700;text-align:center;color:#94a3b8;height:18px;display:flex;align-items:center;justify-content:center;}
@media(max-width:560px){
  .mtg-ov{padding:0;align-items:flex-end;}
  .mtg-modal,.mtg-jmodal{border-radius:24px 24px 0 0;max-height:92dvh;}
  .mtg-body{padding:16px 18px 28px;}
  .mtg-frow{grid-template-columns:1fr;}
  .mtg-card{max-width:100%;}
}
`;

/* ═══════════════════════════════════════════════════════════════════
   1. TYPE PICKER
═══════════════════════════════════════════════════════════════════ */
function MeetingTypeModal({ isDark, onClose, onSelect }: {
  isDark: boolean; onClose: () => void; onSelect: (t: string) => void;
}) {
  const opts = [
    { key: "meeting", ...TYPE_META.meeting, desc: "Video call for team discussions & check-ins",     badge: null },
    { key: "debate",  ...TYPE_META.debate,  desc: "Structured argument with speaking turns & rounds", badge: { text: "Live", bg: "rgba(245,158,11,.12)", color: "#d97706" } },
    { key: "seminar", ...TYPE_META.seminar, desc: "Host-led educational session with Q&A",            badge: null },
  ];
  return (
    <div className="mtg-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`mtg-modal${isDark ? " dark" : ""}`}>
        <div className="mtg-head" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)" }}>
          <div className="mtg-hc">
            <div style={{ flex: 1 }}>
              <div className="mtg-hico">🎯</div>
              <div className="mtg-htitle">Start a Session</div>
              <div className="mtg-hsub">Choose your session type</div>
            </div>
            <button className="mtg-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="mtg-body">
          {opts.map(o => (
            <button key={o.key} className="mtg-opt" onClick={() => onSelect(o.key)}>
              <div className="mtg-opt-ico" style={{ background: o.iconBg }}>{o.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="mtg-opt-label">{o.label}</div>
                  {o.badge && <span className="mtg-badge" style={{ background: o.badge.bg, color: o.badge.color }}>{o.badge.text}</span>}
                </div>
                <div className="mtg-opt-desc">{o.desc}</div>
              </div>
              <div className="mtg-opt-arr">›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. SUB-OPTION MODAL
═══════════════════════════════════════════════════════════════════ */
function SubModal({ isDark, type, onBack, onClose, onQuick, onSchedule }: {
  isDark: boolean; type: string; onBack: () => void; onClose: () => void;
  onQuick: (type: string, subKey: string) => void; onSchedule: (type: string) => void;
}) {
  const meta = TYPE_META[type];
  const sets: Record<string, any[]> = {
    meeting: [
      // { key: "quick",    icon: "⚡", label: "Quick Meeting",    desc: "Start instantly — anyone joins via link",             badge: { text: "Instant", bg: "rgba(14,165,233,.12)", color: "#0ea5e9" } },
      { key: "schedule", icon: "📅", label: "Schedule Meeting", desc: "Pick a date & time — lands on calendar tile",         badge: null },
    ],
    debate: [
      // { key: "quick",    icon: "⚡", label: "Quick Debate",      desc: "1v1 AI debate room — start right now",               badge: { text: "1v1",    bg: "rgba(245,158,11,.12)", color: "#d97706" } },
      // { key: "multi",    icon: "👥", label: "Multi-User Debate", desc: "Up to 8 speakers — AI mediates",                     badge: { text: "Up to 8", bg: "rgba(239,68,68,.1)",   color: "#dc2626" } },
      { key: "schedule", icon: "📅", label: "Schedule Debate",   desc: "Plan ahead — adds to calendar tile for chosen date",  badge: null },
    ],
    seminar: [
      // { key: "quick",    icon: "⚡", label: "Quick Seminar",     desc: "Launch instantly as host — students join via link",   badge: { text: "Live", bg: "rgba(16,185,129,.12)", color: "#059669" } },
      { key: "schedule", icon: "📅", label: "Schedule Seminar",  desc: "Set a future date — added to calendar tile",          badge: null },
    ],
  };
  return (
    <div className="mtg-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`mtg-modal${isDark ? " dark" : ""}`}>
        <div className="mtg-head" style={{ background: meta.grad }}>
          <div className="mtg-hc">
            <button className="mtg-back" onClick={onBack}>←</button>
            <div style={{ flex: 1 }}>
              <div className="mtg-hico">{meta.icon}</div>
              <div className="mtg-htitle">{meta.label}</div>
              <div className="mtg-hsub">Choose how to start</div>
            </div>
            <button className="mtg-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="mtg-body">
          {sets[type].map(o => (
            <button key={o.key} className="mtg-opt"
              onClick={() => o.key === "schedule" ? onSchedule(type) : onQuick(type, o.key)}>
              <div className="mtg-opt-ico" style={{
                background: o.key === "quick" ? `${meta.iconColor}18` :
                            o.key === "multi" ? "rgba(239,68,68,.1)"   : "rgba(99,102,241,.1)"
              }}>{o.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="mtg-opt-label">{o.label}</div>
                  {o.badge && <span className="mtg-badge" style={{ background: o.badge.bg, color: o.badge.color }}>{o.badge.text}</span>}
                </div>
                <div className="mtg-opt-desc">{o.desc}</div>
              </div>
              <div className="mtg-opt-arr">›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3a. SCHEDULE FORM
═══════════════════════════════════════════════════════════════════ */
function ScheduleModal({ isDark, type, onBack, onClose, onScheduled }: {
  isDark: boolean; type: string; onBack: () => void; onClose: () => void; onScheduled: (ev: any) => void;
}) {
  const meta = TYPE_META[type];
  const [title,  setTitle]  = useState("");
  const [date,   setDate]   = useState(todayStr());
  const [time,   setTime]   = useState("10:00");
  const [dur,    setDur]    = useState("60");
  const [topic,  setTopic]  = useState("");
  const [copied, setCopied] = useState(false);
  const roomCode = useRef(genRoomCode()).current;
  const link = `https://gradeup.live/room/${roomCode.replace("-", "").toLowerCase()}`;

  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScheduled = () => {
    if (!title.trim()) return;
    try {
      const CAL_KEY  = "gradeup_cal_events_v3";
      const existing = JSON.parse(localStorage.getItem(CAL_KEY) || "[]");
      const startDate = new Date(date + "T" + time + ":00");
      const endDate   = new Date(startDate.getTime() + parseInt(dur) * 60 * 1000);
      const endTime   = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
      const newEvent  = {
        id: `mtg-${Date.now()}`, title, type, date,
        startTime: time, endTime,
        color:       type === "meeting" ? "#0ea5e9" : type === "debate" ? "#f59e0b" : "#10b981",
        location:    "Online",
        description: `${TYPE_META[type].label}: ${title}${topic ? ` — ${topic}` : ""} · Link: ${link}`,
        attendees: "", important: false, markExam: false, notifyEmail: false, emailId: "",
        fromMeetingSystem: true,
      };
      localStorage.setItem(CAL_KEY, JSON.stringify([...existing, newEvent]));
      window.dispatchEvent(new StorageEvent("storage", { key: CAL_KEY }));
    } catch (e) {}
    onScheduled({ type, title, date, time, duration: dur, topic, roomCode, meetLink: link });
  };

  return (
    <div className="mtg-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`mtg-modal${isDark ? " dark" : ""}`} style={{ maxWidth: 520 }}>
        <div className="mtg-head" style={{ background: meta.grad }}>
          <div className="mtg-hc">
            <button className="mtg-back" onClick={onBack}>←</button>
            <div style={{ flex: 1 }}>
              <div className="mtg-hico">📅</div>
              <div className="mtg-htitle">Schedule {meta.label}</div>
              <div className="mtg-hsub">Added to your calendar tile for the chosen date</div>
            </div>
            <button className="mtg-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="mtg-body">
          <div className="mtg-field">
            <label>Title *</label>
            <input className="mtg-finput" value={title} autoFocus onChange={e => setTitle(e.target.value)}
              placeholder={type === "meeting" ? "e.g. Weekly Standup" : type === "debate" ? "e.g. Climate Debate" : "e.g. Physics Seminar"} />
          </div>
          {(type === "debate" || type === "seminar") && (
            <div className="mtg-field">
              <label>{type === "debate" ? "Topic / Motion" : "Subject / Agenda"}</label>
              <input className="mtg-finput" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder={type === "debate" ? "e.g. AI will replace jobs in 20 yrs" : "e.g. Quantum Entanglement Ch.5"} />
            </div>
          )}
          <div className="mtg-frow">
            <div className="mtg-field">
              <label>Date</label>
              <input className="mtg-finput" type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="mtg-field">
              <label>Time</label>
              <input className="mtg-finput" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="mtg-field">
            <label>Duration</label>
            <select className="mtg-finput" value={dur} onChange={e => setDur(e.target.value)} style={{ cursor: "pointer" }}>
              {["30", "45", "60", "90", "120"].map(d => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#64748b", marginBottom: 5 }}>
            Room Link (auto-generated)
          </div>
          <div className="mtg-link">
            <span style={{ flex: 1, fontSize: 11.5 }}>{link}</span>
            <button className="mtg-copy" onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button>
          </div>
          {title && (
            <div style={{ padding: "11px 14px", borderRadius: 14, background: meta.grad, display: "flex", alignItems: "center", gap: 11, marginBottom: 4 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                {meta.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{title}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)", marginTop: 1 }}>{date} · {fmtTime(time)} · {dur} min</div>
              </div>
            </div>
          )}
          <div className="mtg-brow">
            <button className="mtg-cancel" onClick={onBack}>Back</button>
            <button className="mtg-primary" style={{ background: meta.grad }} disabled={!title.trim()} onClick={handleScheduled}>
              📅 Add to Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3b. CALENDAR TILE PREVIEW
═══════════════════════════════════════════════════════════════════ */
function CalendarTilePreview({ isDark, event, onClose }: { isDark: boolean; event: any; onClose: () => void }) {
  const meta   = TYPE_META[event.type];
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS   = ["S","M","T","W","T","F","S"];
  const d      = new Date(event.date);
  const year   = d.getFullYear(), month = d.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells   = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  return (
    <div className="mtg-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`mtg-modal${isDark ? " dark" : ""}`} style={{ maxWidth: 440 }}>
        <div className="mtg-head" style={{ background: meta.grad }}>
          <div className="mtg-hc">
            <div style={{ flex: 1 }}>
              <div className="mtg-hico">✅</div>
              <div className="mtg-htitle">Added to Calendar!</div>
              <div className="mtg-hsub">{MONTHS[month]} {d.getDate()}, {year} · {fmtTime(event.time)}</div>
            </div>
            <button className="mtg-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="mtg-body">
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1.5px solid ${isDark ? "rgba(255,255,255,.09)" : "rgba(0,0,0,.07)"}`, marginBottom: 14 }}>
            <div style={{ padding: "12px 16px", background: meta.grad, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 22 }}>{meta.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{event.title}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.75)", marginTop: 1 }}>{meta.label} · Room {event.roomCode}</div>
              </div>
            </div>
            <div style={{ padding: "12px 16px", background: isDark ? "#162032" : "#f8fafc" }}>
              {[
                { ico: "📅", k: "Date",     v: event.date },
                { ico: "🕐", k: "Time",     v: fmtTime(event.time) },
                { ico: "⏱",  k: "Duration", v: `${event.duration} min` },
                { ico: "🔗", k: "Link",     v: event.meetLink, isLink: true },
              ].map(r => (
                <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", fontSize: 12.5, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)"}` }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{r.ico}</span>
                  <span style={{ color: isDark ? "#94a3b8" : "#64748b", width: 60, flexShrink: 0 }}>{r.k}</span>
                  {r.isLink
                    ? <span style={{ color: "#6366f1", fontWeight: 600, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.v}</span>
                    : <span style={{ fontWeight: 700, color: isDark ? "#f1f5f9" : "#0f172a" }}>{r.v}</span>
                  }
                </div>
              ))}
            </div>
          </div>
          <div className="mtg-mini-cal" style={{ background: isDark ? "#162032" : "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: isDark ? "#f1f5f9" : "#0f172a" }}>{MONTHS[month]} {year}</span>
              <span className="mtg-badge" style={{ background: meta.iconBg, color: meta.iconColor }}>{meta.label}</span>
            </div>
            <div className="mtg-mini-grid" style={{ marginBottom: 3 }}>
              {DAYS.map((day, i) => <div key={i} className="mtg-mini-dlbl">{day}</div>)}
            </div>
            <div className="mtg-mini-grid">
              {cells.map((day, i) => {
                const isTarget = day === d.getDate();
                return (
                  <div key={i} className={`mtg-mini-cell${isTarget ? " target" : ""}`}
                    style={isTarget ? { background: meta.grad } : {}}>
                    {day || ""}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 10, background: isDark ? "rgba(99,102,241,.1)" : "rgba(99,102,241,.05)", border: `1px solid ${isDark ? "rgba(99,102,241,.2)" : "rgba(99,102,241,.15)"}` }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: meta.grad }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#818cf8" : "#4f46e5" }}>
                {event.title} — {MONTHS[month].slice(0, 3)} {d.getDate()}
              </span>
            </div>
          </div>
          <div className="mtg-brow">
            <button className="mtg-cancel" onClick={onClose}>Close</button>
            <button className="mtg-primary" style={{ background: meta.grad }}
              onClick={() => { onClose(); window.location.href = "/calendar"; }}>
              Open Calendar →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MEETING CARD — rendered inside chat feed
═══════════════════════════════════════════════════════════════════ */
export function MeetingCard({ card, isDark, currentUser, onJoinClick }: {
  card: any; isDark: boolean; currentUser: string; onJoinClick: (card: any) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const meta = TYPE_META[card.type];

  useEffect(() => {
    if (card.ended) return;
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [card.ended]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const alreadyJoined = (card.joined || []).includes(currentUser);

  return (
    <div className={`mtg-card${isDark ? " dark" : ""}`}>
      <style>{MEETING_CSS}</style>
      <div className="mtg-card-head" style={{ background: meta.grad }}>
        <div className="mtg-card-hico">{meta.icon}</div>
        <div className="mtg-card-htxt">
          <div className="mtg-card-title">{card.title}</div>
          <div className="mtg-card-sub">Started by {card.host} · {meta.label}</div>
        </div>
        {!card.ended && (
          <div className="mtg-card-live">
            <div className="mtg-card-live-dot" />
            <div className="mtg-card-live-lbl">LIVE</div>
          </div>
        )}
      </div>
      <div className="mtg-card-body">
        <div className="mtg-card-row">
          <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>🔑</span>
          <span className="mtg-card-key">Room ID</span>
          <span className="mtg-card-val">{card.roomCode}</span>
        </div>
        <div className="mtg-card-row">
          <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>🔗</span>
          <span className="mtg-card-key">Link</span>
          <span className="mtg-card-val" style={{ color: "#6366f1", cursor: "pointer" }}
            onClick={() => navigator.clipboard?.writeText(card.meetLink).catch(() => {})}>
            {card.meetLink}
          </span>
        </div>
        <div className="mtg-card-row">
          <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>⏱</span>
          <span className="mtg-card-key">Duration</span>
          <span className="mtg-card-timer">{card.ended ? "Ended" : fmt(elapsed)}</span>
        </div>
        <div className="mtg-card-row" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>👥</span>
          <span className="mtg-card-key">Joined</span>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {(card.joined || []).slice(0, 4).map((name: string, i: number) => (
              <div key={i} className="mtg-pav" style={{ background: avColor(name), zIndex: 4 - i }}>{avInit(name)}</div>
            ))}
            {(card.joined || []).length > 4 && (
              <div className="mtg-pav" style={{ background: "#94a3b8" }}>+{(card.joined || []).length - 4}</div>
            )}
            <span style={{ fontSize: 11.5, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b", marginLeft: 6 }}>
              {(card.joined || []).length} joined
            </span>
          </div>
        </div>
      </div>
      <div className="mtg-card-foot">
        <button
          className={`mtg-join-btn${card.ended ? " ended" : ""}`}
          style={card.ended ? {} : { background: meta.grad }}
          onClick={() => !card.ended && onJoinClick(card)}
          disabled={card.ended}>
          {card.ended
            ? "Session Ended"
            : alreadyJoined
              ? `↩ Rejoin ${meta.label}`
              : `${meta.icon} Join ${meta.label}`
          }
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   JOIN DETAILS MODAL
═══════════════════════════════════════════════════════════════════ */
function JoinDetailsModal({ isDark, card, currentUser, onClose, onJoin }: {
  isDark: boolean; card: any; currentUser: string; onClose: () => void;
  onJoin: (payload: { card: any; name: string; micOn: boolean; camOn: boolean; stream: MediaStream | null }) => void;
}) {
  const meta = TYPE_META[card.type];
  const [micOn,   setMicOn]   = useState(true);
  const [camOn,   setCamOn]   = useState(false);
  const [name,    setName]    = useState(currentUser || "");
  const [joining, setJoining] = useState(false);
  const [stream,  setStream]  = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!camOn) {
      stream?.getTracks().forEach(t => t.stop());
      setStream(null);
      return;
    }
    navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
      .then(s => { setStream(s); if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setCamOn(false));
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, [camOn]); // eslint-disable-line

  const handleJoin = async () => {
    if (!name.trim()) return;
    setJoining(true);
    // Stop preview stream — Room.tsx will acquire its own stream on mount
    stream?.getTracks().forEach(t => t.stop());
    onJoin({ card, name: name.trim(), micOn, camOn, stream: null });
  };

  return (
    <div className="mtg-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`mtg-jmodal${isDark ? " dark" : ""}`}>
        <div className="mtg-head" style={{ background: meta.grad }}>
          <div className="mtg-hc">
            <div style={{ flex: 1 }}>
              <div className="mtg-hico">{meta.icon}</div>
              <div className="mtg-htitle">Join {meta.label}</div>
              <div className="mtg-hsub">Set up before joining · Room {card.roomCode}</div>
            </div>
            <button className="mtg-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="mtg-body">
          <div className="mtg-field">
            <label>Your Display Name</label>
            <input className="mtg-finput" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
          </div>
          <div className="mtg-preview">
            {camOn && stream
              ? <video ref={videoRef} autoPlay muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
              : <>
                  <div className="mtg-preview-av" style={{ background: avColor(name || "U") }}>{avInit(name || "User")}</div>
                  <div className="mtg-preview-name">{name || "Your Name"}</div>
                </>
            }
            {!micOn && <div className="mtg-preview-muted">🔇 Muted</div>}
          </div>
          <div className="mtg-perm-row">
            <button className={`mtg-perm-btn${micOn ? " on" : ""}`} onClick={() => setMicOn(m => !m)}>
              <div className="mtg-perm-ico">{micOn ? "🎤" : "🔇"}</div>
              <div className="mtg-perm-lbl">{micOn ? "Mic On" : "Mic Off"}</div>
            </button>
            <button className={`mtg-perm-btn${camOn ? " on" : ""}`} onClick={() => setCamOn(c => !c)}>
              <div className="mtg-perm-ico">{camOn ? "📹" : "📷"}</div>
              <div className="mtg-perm-lbl">{camOn ? "Cam On" : "Cam Off"}</div>
            </button>
          </div>
          <div style={{ background: isDark ? "#162032" : "#f8fafc", borderRadius: 14, padding: "11px 14px", border: `1.5px solid ${isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)"}`, marginBottom: 4 }}>
            {[
              { ico: meta.icon, k: "Session", v: `${meta.label} · Room ${card.roomCode}` },
              { ico: "👤",      k: "Host",    v: card.host },
              { ico: "👥",      k: "Joined",  v: `${(card.joined || []).length} participant${(card.joined || []).length !== 1 ? "s" : ""}` },
              { ico: "🔗",      k: "Link",    v: card.meetLink },
            ].map(r => (
              <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", fontSize: 12.5, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)"}` }}>
                <span style={{ width: 20, textAlign: "center", fontSize: 14 }}>{r.ico}</span>
                <span style={{ color: isDark ? "#94a3b8" : "#64748b", width: 58, flexShrink: 0 }}>{r.k}</span>
                <span style={{ fontWeight: 600, color: isDark ? "#f1f5f9" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontSize: 12 }}>{r.v}</span>
              </div>
            ))}
          </div>
          <div className="mtg-brow">
            <button className="mtg-cancel" onClick={onClose}>Cancel</button>
            <button className="mtg-primary" style={{ background: meta.grad }} disabled={!name.trim() || joining} onClick={handleJoin}>
              {joining
                ? <><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "mtg-spin .7s linear infinite", display: "inline-block" }} /> Joining...</>
                : <>{meta.icon} Join {meta.label} Now</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MASTER HOOK — useMeetingSystem
═══════════════════════════════════════════════════════════════════ */
export function useMeetingSystem({
  isDark = false,
  members = [],
  currentUser = "You",
  onPostCard,
}: {
  isDark?: boolean;
  members?: any[];
  currentUser?: string;
  onPostCard?: (card: any) => void;
} = {}) {
  const [step,        setStep]        = useState<string | null>(null);
  const [type,        setType]        = useState<string | null>(null);
  const [scheduledEv, setScheduledEv] = useState<any>(null);
  const [calEvents,   setCalEvents]   = useState<any[]>([]);
  const [joiningCard, setJoiningCard] = useState<any>(null);
  const [cards,       setCards]       = useState<Record<string, any>>({});

  const open  = useCallback(() => setStep("type"), []);
  const close = useCallback(() => { setStep(null); setType(null); }, []);

  const handleTypeSelect = (t: string) => { setType(t); setStep("sub"); };
  const handleSchedule   = (t: string) => { setType(t); setStep("schedule"); };

  /* ── Post a quick-session card into the chat feed ─────────────────── */
  const handleQuick = useCallback((t: string, subKey = "quick") => {
    const roomCode = genRoomCode();
    const meetLink = `https://gradeup.live/room/${roomCode.replace("-", "").toLowerCase()}`;

    // Map picker sub-key → Room-compatible subMode stored on card
    //   debate/quick  → "ai"    (1v1 vs AI)
    //   debate/multi  → "multi" (group debate)
    //   meeting/quick → "quick"
    //   seminar/quick → "multi" (AI-facilitated)
    const subModeMap: Record<string, Record<string, string>> = {
      meeting: { quick: "quick"              },
      debate:  { quick: "ai",   multi: "multi" },
      seminar: { quick: "multi"              },
    };
    const resolvedSubMode = subModeMap[t]?.[subKey] ?? subKey;

    const card = {
      id:        `card-${Date.now()}`,
      type:      t,
      subMode:   resolvedSubMode,   // ← Room reads this on join
      title:     `${TYPE_META[t].label} — ${roomCode}`,
      host:      currentUser,
      roomCode,
      meetLink,
      joined:    [currentUser],
      ended:     false,
      startedAt: Date.now(),
    };

    setCards(c => ({ ...c, [card.id]: card }));
    onPostCard?.(card);
    close();
  }, [currentUser, onPostCard, close]);

  const handleScheduled = (ev: any) => {
    setCalEvents(p => [...p, ev]);
    setScheduledEv(ev);
    setStep("calPreview");
  };

  /* ── User clicks Join on a card ───────────────────────────────────── */
  const handleCardJoinClick = useCallback((card: any) => setJoiningCard(card), []);
  const openJoinCard = useCallback((card: any) => setJoiningCard(card), []);

  /* ── User confirms in JoinDetailsModal ────────────────────────────── */
  const handleConfirmJoin = useCallback(({ card, name, micOn, camOn, stream }: {
    card: any; name: string; micOn: boolean; camOn: boolean; stream: MediaStream | null;
  }) => {
    // Update the joined list on the live card
    setCards(prev => {
      const updated = {
        ...prev[card.id],
        joined: [...new Set([...(prev[card.id]?.joined || []), name])],
      };
      onPostCard?.({ ...updated, _update: true });
      return { ...prev, [card.id]: updated };
    });
    setJoiningCard(null);

    // Map card.type + card.subMode → Room-compatible mode/subMode
    //
    //  card.type   card.subMode   →   mode      subMode
    //  ─────────   ────────────       ────────  ───────
    //  meeting     quick          →   meeting   quick
    //  debate      ai             →   debate    ai       (1v1 vs AI)
    //  debate      multi          →   debate    multi    (group debate with AI mediator)
    //  seminar     multi          →   seminar   multi    (AI-facilitated)
    //
    const modeMap: Record<string, { mode: string; subMode: string }> = {
      meeting: { mode: "meeting", subMode: "quick"                                   },
      debate:  { mode: "debate",  subMode: card.subMode === "multi" ? "multi" : "ai" },
      seminar: { mode: "seminar", subMode: "multi"                                   },
    };
    const { mode, subMode } = modeMap[card.type] ?? { mode: "meeting", subMode: "quick" };

    // Build the Room config written to localStorage
    // stream is null — Room.tsx calls getUserMedia itself on mount
    const roomConfig = {
      name,
      mode,
      subMode,
      fromCommunity:    true,     // ← tells DebateArenaPage to skip session restore
      topic:            card.title,
      roomId:           card.roomCode,
      roomLink:         card.meetLink,
      cardId:           card.id,
      micOn,
      camOn,
      stream:           null,
      invitees:         [],
      syncedToCalendar: false,
    };

    try {
      localStorage.setItem(ROOM_CONFIG_KEY, JSON.stringify(roomConfig));
    } catch (e) {
      console.error("Failed to save room config:", e);
    }

    // Stop preview stream — Room.tsx will request its own
    stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());

    // Navigate to the debate tool page
    window.location.href = "/debate-tool";
  }, [onPostCard]);

  /* ── Render a meeting card inline in the chat feed ────────────────── */
  const renderMeetingCard = useCallback((cardFromMsg: any) => {
    const live = cards[cardFromMsg.id] || cardFromMsg;
    return (
      <MeetingCard
        key={live.id}
        card={live}
        isDark={isDark}
        currentUser={currentUser}
        onJoinClick={handleCardJoinClick}
      />
    );
  }, [cards, isDark, currentUser, handleCardJoinClick]);

  const meetingUI = (
    <>
      <style>{MEETING_CSS}</style>

      {step === "type" && (
        <MeetingTypeModal isDark={isDark} onClose={close} onSelect={handleTypeSelect} />
      )}
      {step === "sub" && type && (
        <SubModal
          isDark={isDark} type={type}
          onBack={() => setStep("type")} onClose={close}
          onQuick={handleQuick} onSchedule={handleSchedule}
        />
      )}
      {step === "schedule" && type && (
        <ScheduleModal
          isDark={isDark} type={type}
          onBack={() => setStep("sub")} onClose={close}
          onScheduled={handleScheduled}
        />
      )}
      {step === "calPreview" && scheduledEv && (
        <CalendarTilePreview isDark={isDark} event={scheduledEv} onClose={close} />
      )}
      {joiningCard && (
        <JoinDetailsModal
          isDark={isDark} card={joiningCard} currentUser={currentUser}
          onClose={() => setJoiningCard(null)} onJoin={handleConfirmJoin}
        />
      )}
    </>
  );

  return { meetingUI, openMeeting: open, openJoinCard, renderMeetingCard, calendarEvents: calEvents };
}
