import { useState, useRef } from "react";
import { TOPICS, COLORS, generateRoomId, generateRoomLink, createInvitee, sendInviteEmail, registerRoom, lookupRoom, parseRoomLink, Invitee, syncCal, pushNotif } from "./shared";
import { useMicPerm, useMediaPerm, useLoader } from "./hooks";
import { MicPreview, CamPreview, Steps, CalSync, LoadingOverlay, JoinConfirmModal, useToast, AnalysisReport } from "./UIComponents";



// ── LANDING ───────────────────────────────────────────────────────────────────
export function Landing({ onSelect }: { onSelect:(m:string)=>void }) {
  const [sel, setSel]       = useState<string|null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const { show: toast$, node: toastNode } = useToast();

  async function handleJoin() {
    if (!joinName.trim()||!joinLink.trim()) { toast$("Enter your name and a room link","warn"); return; }
    const parsed = parseRoomLink(joinLink);
    if (!parsed) { toast$("Invalid room link","error"); return; }
    setJoinLoading(true);
    const room = lookupRoom(parsed.roomId);
    await new Promise(r=>setTimeout(r,1500));
    setJoinLoading(false);
    if (room) { toast$(`✅ Joined "${room.topic}"!`,"success"); }
    else { toast$("Room not found — the host may not have started yet","warn"); }
  }

  const scenes = [
    { ico:"⚔️", bg:"linear-gradient(135deg,#6366f1,#8b5cf6)", title:"1-on-1 Debate with AI", sub:"Voice responses · Live score · Analysis", badge:"AI",   badgeCls:"ai"   },
    { ico:"👥", bg:"linear-gradient(135deg,#10b981,#0ea5e9)", title:"Multi-User Debate",      sub:"AI mediates · Group analysis",          badge:"LIVE", badgeCls:"live" },
    { ico:"🎓", bg:"linear-gradient(135deg,#f59e0b,#ef4444)", title:"Seminar Session",         sub:"AI facilitates · Individual reports",   badge:"NEW",  badgeCls:"new"  },
    { ico:"📹", bg:"linear-gradient(135deg,#0ea5e9,#6366f1)", title:"Video Meeting",           sub:"Camera · Mic · Screen share · Record",  badge:"",     badgeCls:""     },
  ];

  return (
    <div className="land-shell">
      {/* Left */}
      <div className="land-left">
        <div className="land-orbs"><div className="orb orb1"/><div className="orb orb2"/><div className="orb orb3"/></div>
        <div className="land-grid"/>
        <div className="land-left-inner">
          <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:22,animation:"fadeUp .5s ease .05s both" }}>
            <div style={{ width:34,height:34,background:"var(--grad)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 6px 18px rgba(99,102,241,.38)" }}>⚔️</div>
            <span style={{ fontSize:15,fontWeight:800,background:"linear-gradient(90deg,#fff,var(--ind3))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>DebateArena</span>
          </div>
          <div className="land-tag"><div className="land-tag-dot"/>Live Platform · v3</div>
          <h1 className="land-h1">Sharpen Your<br/><span className="gt">Arguments.</span><br/>Win Every <span className="gt">Debate.</span></h1>
          <p className="land-p">Professional rooms with AI voice opponents, live scoring, group sessions, recording and full analysis reports.</p>
          <div className="land-scenes">
            {scenes.map((s,i)=>(
              <div key={i} className="land-scene" style={{ animationDelay:`${.18+i*.07}s` }}>
                <div className="land-scene-ico" style={{ background:s.bg }}>{s.ico}</div>
                <div style={{ flex:1 }}><div className="sc-label">{s.title}</div><div className="sc-sub">{s.sub}</div></div>
                {s.badge && <span className={`sc-badge ${s.badgeCls}`}>{s.badge}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="land-right">
        <div className="land-right-inner">
          <div className="mode-wrap">
            <h2 className="mode-title" style={{ animation:"slideRight .45s ease .1s both" }}>What would you like to do?</h2>
            <p className="mode-sub" style={{ animation:"slideRight .45s ease .16s both" }}>Select a session type to get started.</p>
            <div className="mode-cards" style={{ animation:"slideRight .45s ease .22s both" }}>
              {[
                { id:"debate",  ico:"⚔️", title:"Debate",  desc:"AI duel or multi-user debate", cls:"m-debate"  },
                { id:"meeting", ico:"📹", title:"Meeting",  desc:"Video call + screen share",     cls:"m-meeting" },
                { id:"seminar", ico:"🎓", title:"Seminar",  desc:"AI-facilitated discussion",     cls:"m-seminar" },
              ].map(m=>(
                <div key={m.id} className={`mode-card ${m.cls} ${sel===m.id?"sel":""}`} onClick={()=>setSel(m.id)}>
                  <div className="mode-card-ck">✓</div>
                  <span className="mode-card-ico">{m.ico}</span>
                  <div className="mode-card-title">{m.title}</div>
                  <div className="mode-card-desc">{m.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ animation:"slideRight .45s ease .28s both" }}>
              <button className="btn-p" style={{ marginBottom:11 }} disabled={!sel} onClick={()=>sel&&onSelect(sel)}>
                {sel?(sel==="debate"?"⚔️ Setup Debate":sel==="meeting"?"📹 Setup Meeting":"🎓 Setup Seminar"):"Select a mode to continue →"}
              </button>
            </div>

            {/* Join by link */}
            <div className="join-box" style={{ animation:"slideRight .45s ease .33s both" }}>
              <div className="join-box-title">🔗 Join with a room link</div>
              {!showJoin ? (
                <button className="btn-s" style={{ width:"100%",justifyContent:"center",fontSize:12.5 }} onClick={()=>setShowJoin(true)}>
                  Have a room link? Join here →
                </button>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  <input className="finput" placeholder="Your name" value={joinName} onChange={e=>setJoinName(e.target.value)}/>
                  <input className="finput" placeholder="https://debatearena.app/join?room=…" value={joinLink} onChange={e=>setJoinLink(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleJoin()}/>
                  <div style={{ display:"flex",gap:7 }}>
                    <button className="btn-s" style={{ flex:"0 0 auto" }} onClick={()=>setShowJoin(false)}>Cancel</button>
                    <button className="btn-p" style={{ flex:1,fontSize:12.5 }} onClick={handleJoin} disabled={joinLoading||!joinLink.trim()||!joinName.trim()}>
                      {joinLoading?<><span className="loader-spin" style={{ width:16,height:16 }}/>Joining…</>:"🔗 Join Session"}
                    </button>
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

// ── INVITE MANAGER (reusable) ─────────────────────────────────────────────────
function InviteManager({ invitees, setInvitees, roomLink, mode }: {
  invitees: Invitee[]; setInvitees: (fn:(prev:Invitee[])=>Invitee[])=>void;
  roomLink: string; mode: string;
}) {
  const [input, setInput]  = useState("");
  const { show: toast$, node: toastNode } = useToast();

  function add() {
    const v = input.trim(); if (!v) return;
    if (invitees.find(i=>i.value===v)) { toast$("Already added","warn"); return; }
    const inv = createInvitee(v);
    setInvitees(prev => [...prev, inv]);
    if (inv.type === "email") {
      // Simulate sending invite email
      sendInviteEmail(v, roomLink, mode, "Host");
      toast$(`📧 Invite sent to ${v}`,"info");
    } else {
      navigator.clipboard.writeText(roomLink).catch(()=>{});
      toast$(`🔗 ${v} added · Link copied`,"success");
    }
    setInput("");
  }

  return (
    <div className="fi">
      <label className="fl">Invite Participants</label>
      <div style={{ display:"flex",gap:7,marginBottom:7 }}>
        <input className="finput" placeholder="Name or email address…" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} style={{ flex:1 }}/>
        <button className="btn-s" style={{ padding:"9px 13px",whiteSpace:"nowrap" }} onClick={add}>+ Invite</button>
      </div>
      {invitees.length > 0 && (
        <div style={{ display:"flex",flexDirection:"column",gap:5,marginBottom:5 }}>
          {invitees.map(inv=>(
            <div key={inv.id} className="invite-row">
              <div className="invite-avatar" style={{ background:inv.avatarColor }}>{inv.value[0]?.toUpperCase()}</div>
              <div className="invite-info">
                <div className="invite-name">{inv.value}</div>
                <div className="invite-email">{inv.type==="email"?"📧 Email invite":"👤 Name — link copied"}</div>
              </div>
              <span className={`invite-status inv-${inv.status}`}>{inv.status==="sent"?"Sent":inv.status==="pending"?"Pending":inv.status}</span>
              <button className="invite-rm" onClick={()=>setInvitees(prev=>prev.filter(i=>i.id!==inv.id))}>✕</button>
            </div>
          ))}
        </div>
      )}
      {toastNode}
    </div>
  );
}

// ── DEBATE SETUP ──────────────────────────────────────────────────────────────
export function DebateSetup({ onBack, onLaunch }: { onBack:()=>void; onLaunch:(c:any)=>void }) {
  const [name, setName]         = useState("");
  const [subMode, setSubMode]   = useState<"ai"|"multi"|"">("");
  const [topic, setTopic]       = useState("");
  const [custom, setCustom]     = useState("");
  const [micOn, setMicOn]       = useState(true);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [date, setDate]         = useState("");
  const [time, setTime]         = useState("10:00");
  const [syncOn, setSyncOn]     = useState(true);
  const [copied, setCopied]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [joining, setJoining]   = useState(false);
  const [joinProgress, setJoinProgress] = useState(0);

  const roomId   = useRef(generateRoomId());
  const roomLink = generateRoomLink(roomId.current, "debate");

  const { state:perm, stream, request, stop } = useMicPerm();
  const { show: toast$, node: toastNode } = useToast();

  const finalTopic = topic==="__custom__"?custom:topic;
  const copyLink = ()=>{ navigator.clipboard.writeText(roomLink); setCopied(true); setTimeout(()=>setCopied(false),2200); };

  const steps = [
    { label:"Enter your name",    done:name.trim().length>0 },
    { label:"Allow microphone",   done:perm==="granted" },
    { label:"Select topic",       done:!!finalTopic },
    { label:"Choose debate type", done:!!subMode },
  ];
  const canLaunch = steps.every(s=>s.done);

  async function handleJoin() {
    setJoining(true);
    // Simulated loading stages
    for (let p=0;p<=100;p+=20) {
      await new Promise(r=>setTimeout(r,200));
      setJoinProgress(p);
    }
    setJoining(false); setShowConfirm(false); setJoinProgress(0);

    if (syncOn) { syncCal({ type:"debate",title:finalTopic,date:date?new Date(date+"T12:00:00"):new Date(),time,attendees:invitees,link:roomLink }); }
    pushNotif(`⚔️ Debate: "${finalTopic.slice(0,38)}"`,`By ${name}.`);

    registerRoom({ roomId:roomId.current, mode:"debate", topic:finalTopic, hostName:name, link:roomLink, createdAt:Date.now(), invitees });
    onLaunch({ name,mode:"debate",subMode,topic:finalTopic,stream,micOn,camOn:false,invitees,roomId:roomId.current,roomLink,syncedToCalendar:syncOn });
  }

  const art = [
    { ico:"🤖",t:"AI Voice Opponent",d:"Real-time rebuttals spoken aloud", badge:"AI",   bc:"ai"   },
    { ico:"🔄",t:"Turn-based Debate",d:"AI waits, then responds automatically", badge:"",bc:""     },
    { ico:"📊",t:"Analysis Report",  d:"Score breakdown at session end",     badge:"NEW", bc:"new"  },
    { ico:"🔗",t:"Share & Invite",   d:"Email or link-based participant invite",badge:"",bc:""      },
  ];

  return (
    <div className="setup-shell">
      {/* Left */}
      <div className="setup-left">
        <div className="land-orbs" style={{ zIndex:1 }}><div className="orb orb1"/><div className="orb orb2"/></div>
        <div className="land-grid"/>
        <div className="setup-left-inner">
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:18,animation:"slideLeft .4s ease" }}>
            <div style={{ width:30,height:30,background:"var(--grad)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>⚔️</div>
            <span style={{ fontSize:13,fontWeight:800,background:"linear-gradient(90deg,#fff,var(--ind3))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>DebateArena</span>
          </div>
          <div className="land-tag" style={{ marginBottom:12,animation:"slideLeft .4s ease .08s both" }}><div className="land-tag-dot"/>Debate Setup</div>
          <h2 style={{ fontSize:"clamp(18px,2.2vw,34px)",fontWeight:900,lineHeight:1.06,letterSpacing:-1,color:"#fff",marginBottom:10,animation:"slideLeft .4s ease .14s both" }}>
            Launch your<br/><span style={{ background:"var(--grad)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>Debate Room</span>
          </h2>
          <p style={{ fontSize:12,color:"rgba(255,255,255,.42)",lineHeight:1.85,marginBottom:18,animation:"slideLeft .4s ease .2s both" }}>
            {subMode==="ai"?"1-on-1 · AI speaks via voice · Auto turn-based":subMode==="multi"?"Multi-user · AI mediates & analyses all":"Choose debate type — AI duel or group"}
          </p>
          <div className="scenario-art">
            {art.map((s,i)=>(
              <div key={i} className="scenario-card" style={{ animationDelay:`${.24+i*.07}s` }}>
                <span className="sc-icon">{s.ico}</span>
                <div style={{ flex:1 }}><div style={{ fontSize:12,fontWeight:700,color:"#fff",marginBottom:1 }}>{s.t}</div><div style={{ fontSize:10.5,color:"rgba(255,255,255,.38)" }}>{s.d}</div></div>
                {s.badge&&<span className={`sc-badge ${s.bc}`}>{s.badge}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="setup-right">
        <div className="setup-right-inner-scroll">
          <div className="setup-right-inner">
            <button className="setup-back" onClick={()=>{stop();onBack();}}>← Back</button>
            <h2 className="setup-title">⚔️ Debate Setup</h2>
            <p className="setup-sub">Complete all steps to launch your debate room.</p>

            <MicPreview perm={perm} name={name} onReq={request} micOn={micOn} onToggle={()=>{const n=!micOn;setMicOn(n);stream?.getAudioTracks().forEach(t=>t.enabled=n);}}/>

            <div className="fi"><label className="fl">Your Name</label><input className="finput" placeholder="e.g. Alex Chen" value={name} onChange={e=>setName(e.target.value)} maxLength={40}/></div>

            <div className="fi"><label className="fl">Debate Topic</label>
              <select className="finput" value={topic} onChange={e=>setTopic(e.target.value)}>
                <option value="">Select a topic…</option>
                {TOPICS.map(t=><option key={t} value={t}>{t}</option>)}
                <option value="__custom__">✏️ Custom topic…</option>
              </select>
            </div>
            {topic==="__custom__"&&<div className="fi"><label className="fl">Custom Topic</label><input className="finput" placeholder="Your debate topic…" value={custom} onChange={e=>setCustom(e.target.value)}/></div>}

            <div className="fi">
              <label className="fl">Debate Type</label>
              <div className="submode-grid">
                {[{id:"ai",ico:"🤖",t:"Debate with AI",d:"1-on-1 · AI voice · Personal analysis"},{id:"multi",ico:"👥",t:"Multi-User Debate",d:"Invite participants · AI mediates"}].map(o=>(
                  <div key={o.id} className={`submode-card ${subMode===o.id?"sel":""}`} onClick={()=>setSubMode(o.id as any)}>
                    <div className="submode-ico">{o.ico}</div><div><div className="submode-title">{o.t}</div><div className="submode-desc">{o.d}</div></div>
                  </div>
                ))}
              </div>
            </div>

            {subMode==="multi" && <InviteManager invitees={invitees} setInvitees={setInvitees} roomLink={roomLink} mode="debate"/>}

            <div className="fi-row fi">
              <div><label className="fl">Date (opt)</label><input className="finput" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ colorScheme:"light" }}/></div>
              <div><label className="fl">Time</label><input className="finput" type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ colorScheme:"light" }}/></div>
            </div>

            {/* Link share box */}
            <div className="link-box">
              <div className="link-box-title">🔗 Room Link</div>
              <div className="link-row"><span className="link-val">{roomLink}</span><button className="copy-btn" onClick={copyLink}>{copied?"✓ Copied!":"Copy"}</button></div>
              <div className="share-actions">
                <button className="share-btn" onClick={()=>{navigator.clipboard.writeText(roomLink);toast$("📋 Link copied — paste in email","info");}}>📧 Email</button>
                <button className="share-btn" onClick={()=>{if(navigator.share)navigator.share({title:"Join my debate",url:roomLink});}}>↗ Share</button>
              </div>
            </div>

            <CalSync on={syncOn} set={setSyncOn}/>
            <Steps steps={steps}/>
            <button className="btn-p" onClick={()=>setShowConfirm(true)} disabled={!canLaunch}>🚀 Launch Debate Room</button>
          </div>
        </div>
      </div>

      {/* Join confirm modal */}
      {showConfirm && (
        <JoinConfirmModal
          config={{ name,topic:finalTopic,mode:"debate",subMode,roomId:roomId.current,invitees,micOn,camOn:false }}
          micOn={micOn} camOn={false}
          onToggleMic={()=>setMicOn(m=>!m)}
          onToggleCam={()=>{}}
          onJoin={handleJoin}
          onCancel={()=>setShowConfirm(false)}
          joining={joining} joinProgress={joinProgress}
        />
      )}

      {toastNode}
    </div>
  );
}

// ── SEMINAR SETUP ─────────────────────────────────────────────────────────────
export function SeminarSetup({ onBack, onLaunch }: { onBack:()=>void; onLaunch:(c:any)=>void }) {
  const [name, setName]         = useState("");
  const [topic, setTopic]       = useState("");
  const [custom, setCustom]     = useState("");
  const [micOn, setMicOn]       = useState(true);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [date, setDate]         = useState("");
  const [time, setTime]         = useState("10:00");
  const [syncOn, setSyncOn]     = useState(true);
  const [copied, setCopied]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [joining, setJoining]   = useState(false);
  const [joinProgress, setJoinProgress] = useState(0);

  const roomId   = useRef(generateRoomId());
  const roomLink = generateRoomLink(roomId.current, "seminar");

  const { state:perm, stream, request, stop } = useMicPerm();
  const { show: toast$, node: toastNode } = useToast();

  const finalTopic = topic==="__custom__"?custom:topic;
  const copyLink = ()=>{ navigator.clipboard.writeText(roomLink); setCopied(true); setTimeout(()=>setCopied(false),2200); };
  const steps = [{ label:"Enter name",done:name.trim().length>0 },{ label:"Allow mic",done:perm==="granted" },{ label:"Select topic",done:!!finalTopic }];
  const canLaunch = steps.every(s=>s.done);

  async function handleJoin() {
    setJoining(true);
    for(let p=0;p<=100;p+=25){await new Promise(r=>setTimeout(r,180));setJoinProgress(p);}
    setJoining(false); setShowConfirm(false); setJoinProgress(0);
    if(syncOn) syncCal({type:"seminar",title:finalTopic,date:date?new Date(date+"T12:00:00"):new Date(),time,attendees:invitees,link:roomLink});
    registerRoom({roomId:roomId.current,mode:"seminar",topic:finalTopic,hostName:name,link:roomLink,createdAt:Date.now(),invitees});
    onLaunch({name,mode:"seminar",subMode:"multi",topic:finalTopic,stream,micOn,camOn:false,invitees,roomId:roomId.current,roomLink,syncedToCalendar:syncOn});
  }

  return (
    <div className="setup-shell">
      <div className="setup-left">
        <div className="land-orbs" style={{ zIndex:1 }}><div className="orb orb1" style={{ background:"radial-gradient(circle,rgba(245,158,11,.18) 0%,transparent 70%)" }}/><div className="orb orb2" style={{ background:"radial-gradient(circle,rgba(239,68,68,.12) 0%,transparent 70%)" }}/></div>
        <div className="land-grid"/>
        <div className="setup-left-inner">
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:18,animation:"slideLeft .4s ease" }}>
            <div style={{ width:30,height:30,background:"linear-gradient(135deg,#f59e0b,#ef4444)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>🎓</div>
            <span style={{ fontSize:13,fontWeight:800,background:"linear-gradient(90deg,#fff,#fcd34d)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>DebateArena</span>
          </div>
          <div className="land-tag" style={{ marginBottom:12,background:"rgba(245,158,11,.15)",borderColor:"rgba(245,158,11,.3)",color:"#fcd34d",animation:"slideLeft .4s ease .08s both" }}><div className="land-tag-dot" style={{ background:"var(--amb)" }}/>Seminar Setup</div>
          <h2 style={{ fontSize:"clamp(18px,2.2vw,34px)",fontWeight:900,lineHeight:1.06,letterSpacing:-1,color:"#fff",marginBottom:10,animation:"slideLeft .4s ease .14s both" }}>
            Launch your<br/><span style={{ background:"linear-gradient(135deg,#f59e0b,#ef4444)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>Seminar Room</span>
          </h2>
          <p style={{ fontSize:12,color:"rgba(255,255,255,.42)",lineHeight:1.85,marginBottom:18,animation:"slideLeft .4s ease .2s both" }}>AI facilitates the discussion and generates individual analysis reports for every participant.</p>
          <div className="scenario-art">
            {[{ico:"🎙️",t:"AI Facilitator",d:"Guides discussion, keeps everyone engaged",badge:"AI",bc:"ai"},{ico:"📧",t:"Email Invites",d:"Send direct invites with room link",badge:"",bc:""},{ico:"📋",t:"Individual Analysis",d:"Scores & feedback for each participant",badge:"NEW",bc:"new"},{ico:"📅",t:"Calendar Sync",d:"Auto-save with notifications",badge:"",bc:""}].map((s,i)=>(
              <div key={i} className="scenario-card" style={{ animationDelay:`${.24+i*.07}s` }}>
                <span className="sc-icon">{s.ico}</span>
                <div style={{ flex:1 }}><div style={{ fontSize:12,fontWeight:700,color:"#fff",marginBottom:1 }}>{s.t}</div><div style={{ fontSize:10.5,color:"rgba(255,255,255,.38)" }}>{s.d}</div></div>
                {s.badge&&<span className={`sc-badge ${s.bc}`}>{s.badge}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="setup-right">
        <div className="setup-right-inner-scroll">
          <div className="setup-right-inner">
            <button className="setup-back" onClick={()=>{stop();onBack();}}>← Back</button>
            <h2 className="setup-title">🎓 Seminar Setup</h2>
            <p className="setup-sub">AI-facilitated with full analysis reports.</p>
            <MicPreview perm={perm} name={name} onReq={request} micOn={micOn} onToggle={()=>{const n=!micOn;setMicOn(n);stream?.getAudioTracks().forEach(t=>t.enabled=n);}}/>
            <div className="fi"><label className="fl">Your Name</label><input className="finput" placeholder="e.g. Dr. Sarah Chen" value={name} onChange={e=>setName(e.target.value)} maxLength={40}/></div>
            <div className="fi"><label className="fl">Seminar Topic</label>
              <select className="finput" value={topic} onChange={e=>setTopic(e.target.value)}>
                <option value="">Select a topic…</option>
                {TOPICS.map(t=><option key={t} value={t}>{t}</option>)}
                <option value="__custom__">✏️ Custom…</option>
              </select>
            </div>
            {topic==="__custom__"&&<div className="fi"><label className="fl">Custom</label><input className="finput" placeholder="Seminar topic…" value={custom} onChange={e=>setCustom(e.target.value)}/></div>}
            <InviteManager invitees={invitees} setInvitees={setInvitees} roomLink={roomLink} mode="seminar"/>
            <div className="fi-row fi">
              <div><label className="fl">Date (opt)</label><input className="finput" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ colorScheme:"light" }}/></div>
              <div><label className="fl">Time</label><input className="finput" type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ colorScheme:"light" }}/></div>
            </div>
            <div className="link-box">
              <div className="link-box-title">🔗 Room Link</div>
              <div className="link-row"><span className="link-val">{roomLink}</span><button className="copy-btn" onClick={copyLink}>{copied?"✓ Copied!":"Copy"}</button></div>
            </div>
            <CalSync on={syncOn} set={setSyncOn}/>
            <Steps steps={steps}/>
            <button className="btn-p" onClick={()=>setShowConfirm(true)} disabled={!canLaunch}>🚀 Launch Seminar Room</button>
          </div>
        </div>
      </div>
      {showConfirm&&<JoinConfirmModal config={{name,topic:finalTopic,mode:"seminar",roomId:roomId.current,invitees,micOn,camOn:false}} micOn={micOn} camOn={false} onToggleMic={()=>setMicOn(m=>!m)} onToggleCam={()=>{}} onJoin={handleJoin} onCancel={()=>setShowConfirm(false)} joining={joining} joinProgress={joinProgress}/>}
      {toastNode}
    </div>
  );
}

// ── MEETING SETUP ─────────────────────────────────────────────────────────────
export function MeetingSetup({ onBack, onLaunch }: { onBack:()=>void; onLaunch:(c:any)=>void }) {
  const [name, setName]         = useState("");
  const [mtgType, setMtgType]   = useState<"instant"|"schedule"|"">("");
  const [title, setTitle]       = useState("");
  const [micOn, setMicOn]       = useState(true);
  const [camOn, setCamOn]       = useState(true);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [date, setDate]         = useState("");
  const [time, setTime]         = useState("10:00");
  const [syncOn, setSyncOn]     = useState(true);
  const [copied, setCopied]     = useState(false);
  const [scheduled, setScheduled]=useState(false);
  const [showConfirm, setShowConfirm]=useState(false);
  const [joining, setJoining]   = useState(false);
  const [joinProgress, setJoinProgress]=useState(0);

  const roomId   = useRef(generateRoomId());
  const roomLink = generateRoomLink(roomId.current, "meeting");

  const { state:perm, stream, request, stop } = useMediaPerm();
  const { show: toast$, node: toastNode } = useToast();

  const copyLink = ()=>{ navigator.clipboard.writeText(roomLink); setCopied(true); setTimeout(()=>setCopied(false),2200); };
  const steps = [{ label:"Enter name",done:name.trim().length>0 },{ label:"Allow camera & mic",done:perm==="granted" },{ label:"Choose meeting type",done:!!mtgType }];
  const canJoin = steps.every(s=>s.done);

  async function handleJoin() {
    const evtTitle = title||"Team Meeting";
    if(syncOn) syncCal({type:"meeting",title:evtTitle,date:date?new Date(date+"T12:00:00"):new Date(),time,attendees:invitees,link:roomLink});
    pushNotif(`📹 ${mtgType==="schedule"?"Meeting Scheduled":"Meeting Started"}: "${evtTitle}"`,`Host: ${name}.`);
    if(mtgType==="schedule"){ navigator.clipboard.writeText(roomLink); setScheduled(true); toast$("📅 Scheduled! Link copied.","success"); return; }
    setJoining(true);
    for(let p=0;p<=100;p+=20){await new Promise(r=>setTimeout(r,180));setJoinProgress(p);}
    setJoining(false); setShowConfirm(false); setJoinProgress(0);
    registerRoom({roomId:roomId.current,mode:"meeting",topic:evtTitle,hostName:name,link:roomLink,createdAt:Date.now(),invitees});
    onLaunch({name,mode:"meeting",topic:evtTitle,stream,micOn,camOn,invitees,roomId:roomId.current,roomLink,syncedToCalendar:syncOn});
  }

  return (
    <div className="setup-shell">
      <div className="setup-left">
        <div className="land-orbs" style={{ zIndex:1 }}><div className="orb orb1" style={{ background:"radial-gradient(circle,rgba(56,189,248,.15) 0%,transparent 70%)",top:"-80px",right:"-60px",left:"auto" }}/><div className="orb orb2" style={{ background:"radial-gradient(circle,rgba(99,102,241,.1) 0%,transparent 70%)" }}/></div>
        <div className="land-grid"/>
        <div className="setup-left-inner">
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:18,animation:"slideLeft .4s ease" }}>
            <div style={{ width:30,height:30,background:"var(--grad2)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>📹</div>
            <span style={{ fontSize:13,fontWeight:800,background:"linear-gradient(90deg,#fff,var(--sky))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>DebateArena</span>
          </div>
          <div className="land-tag" style={{ marginBottom:12,background:"rgba(56,189,248,.14)",borderColor:"rgba(56,189,248,.28)",color:"var(--sky)",animation:"slideLeft .4s ease .08s both" }}><div className="land-tag-dot" style={{ background:"var(--sky)" }}/>Meeting Setup</div>
          <h2 style={{ fontSize:"clamp(18px,2.2vw,34px)",fontWeight:900,lineHeight:1.06,letterSpacing:-1,color:"#fff",marginBottom:10,animation:"slideLeft .4s ease .14s both" }}>
            Launch your<br/><span style={{ background:"var(--grad2)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>Meeting Room</span>
          </h2>
          <p style={{ fontSize:12,color:"rgba(255,255,255,.42)",lineHeight:1.85,marginBottom:18,animation:"slideLeft .4s ease .2s both" }}>Video call with camera, mic, screen sharing and recording.</p>
          <div className="scenario-art">
            {[{ico:"⚡",t:"Instant Meeting",d:"Start a video call in seconds",badge:"",bc:""},{ico:"📅",t:"Scheduled Meeting",d:"Plan ahead with calendar invite",badge:"",bc:""},{ico:"🖥",t:"Screen Sharing",d:"Share your screen in real time",badge:"LIVE",bc:"live"},{ico:"🎬",t:"Recording",d:"Download session as video",badge:"",bc:""}].map((s,i)=>(
              <div key={i} className="scenario-card" style={{ animationDelay:`${.24+i*.07}s` }}>
                <span className="sc-icon">{s.ico}</span>
                <div style={{ flex:1 }}><div style={{ fontSize:12,fontWeight:700,color:"#fff",marginBottom:1 }}>{s.t}</div><div style={{ fontSize:10.5,color:"rgba(255,255,255,.38)" }}>{s.d}</div></div>
                {s.badge&&<span className={`sc-badge ${s.bc}`}>{s.badge}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="setup-right">
        <div className="setup-right-inner-scroll">
          <div className="setup-right-inner">
            <button className="setup-back" onClick={()=>{stop();onBack();}}>← Back</button>
            <h2 className="setup-title">📹 Meeting Setup</h2>
            <p className="setup-sub">Start instantly or schedule.</p>
            <CamPreview stream={stream} camOn={camOn} micOn={micOn} name={name} perm={perm} onReq={request} onToggleMic={()=>{const n=!micOn;setMicOn(n);stream?.getAudioTracks().forEach(t=>t.enabled=n);}} onToggleCam={()=>{const n=!camOn;setCamOn(n);stream?.getVideoTracks().forEach(t=>t.enabled=n);}}/>
            <div className="fi"><label className="fl">Your Name</label><input className="finput" placeholder="e.g. Alex Chen" value={name} onChange={e=>setName(e.target.value)} maxLength={40}/></div>
            <div className="fi"><label className="fl">Meeting Type</label>
              <div style={{ display:"flex",gap:8 }}>
                {[{id:"instant",ico:"⚡",label:"Quick Meeting"},{id:"schedule",ico:"📅",label:"Schedule"}].map(o=>(
                  <div key={o.id} onClick={()=>setMtgType(o.id as any)} style={{ flex:1,padding:"10px 12px",borderRadius:11,border:`1.5px solid ${mtgType===o.id?"var(--ind)":"var(--bdr)"}`,background:mtgType===o.id?"rgba(99,102,241,.06)":"var(--surf2)",cursor:"pointer",transition:".2s",display:"flex",alignItems:"center",gap:7,fontWeight:700,fontSize:12 }}>
                    <span style={{ fontSize:16 }}>{o.ico}</span>{o.label}
                  </div>
                ))}
              </div>
            </div>
            {mtgType==="schedule"&&(<>
              <div className="fi"><label className="fl">Title</label><input className="finput" placeholder="e.g. Weekly Standup" value={title} onChange={e=>setTitle(e.target.value)}/></div>
              <div className="fi-row fi">
                <div><label className="fl">Date</label><input className="finput" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ colorScheme:"light" }}/></div>
                <div><label className="fl">Time</label><input className="finput" type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ colorScheme:"light" }}/></div>
              </div>
            </>)}
            <InviteManager invitees={invitees} setInvitees={setInvitees} roomLink={roomLink} mode="meeting"/>
            <div className="link-box">
              <div className="link-box-title">🔗 Room Link</div>
              <div className="link-row"><span className="link-val">{roomLink}</span><button className="copy-btn" onClick={copyLink}>{copied?"✓ Copied!":"Copy"}</button></div>
              <div className="share-actions">
                <button className="share-btn" onClick={()=>{navigator.clipboard.writeText(roomLink);toast$("📋 Link copied — paste in email","info");}}>📧 Email</button>
                <button className="share-btn" onClick={()=>{if(navigator.share)navigator.share({title:"Join my meeting",url:roomLink});}}>↗ Share</button>
              </div>
            </div>
            <CalSync on={syncOn} set={setSyncOn}/>
            {scheduled&&<div style={{ padding:"11px 13px",borderRadius:12,background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.2)",marginBottom:11,textAlign:"center",fontSize:12.5,fontWeight:700,color:"var(--em)" }}>📅✅ Meeting scheduled! Link copied.</div>}
            <Steps steps={steps}/>
            <button className="btn-p" onClick={()=>mtgType==="schedule"?handleJoin():setShowConfirm(true)} disabled={!canJoin}>
              {mtgType==="schedule"?"📅 Schedule Meeting":"🚀 Start Meeting Now"}
            </button>
          </div>
        </div>
      </div>
      {showConfirm&&<JoinConfirmModal config={{name,topic:title||"Team Meeting",mode:"meeting",roomId:roomId.current,invitees,micOn,camOn}} micOn={micOn} camOn={camOn} onToggleMic={()=>setMicOn(m=>!m)} onToggleCam={()=>setCamOn(c=>!c)} onJoin={handleJoin} onCancel={()=>setShowConfirm(false)} joining={joining} joinProgress={joinProgress}/>}
      {toastNode}
    </div>
  );
}

// ── RESULTS SCREEN ─────────────────────────────────────────────────────────────
export function ResultsScreen({ result, onNew }: { result:any; onNew:()=>void }) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  function dlAnalysis() {
    const t=`DebateArena Report\n\nTopic: ${result.topic}\nDuration: ${result.timer}\nParticipants: ${result.participants}`;
    const b=new Blob([t],{type:"text/plain"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="report.txt";a.click();URL.revokeObjectURL(u);
  }

  const emoji = result.mode==="debate"?"⚔️":result.mode==="seminar"?"🎓":"📹";
  return (
    <div className="results-page">
      <div className="res-trophy">{result.mode==="debate"?"🏆":result.mode==="seminar"?"🎓":"✅"}</div>
      <h2 className="res-title">{result.mode==="debate"?"Debate Complete!":result.mode==="seminar"?"Seminar Complete!":"Meeting Ended!"}</h2>
      <p className="res-sub">
        {emoji} <strong style={{ color:"var(--ind)" }}>{result.timer}</strong> · <strong>{result.participants}</strong> participant{result.participants!==1?"s":""}
        {result.syncedToCalendar&&<> · <span style={{ color:"var(--em)" }}>📅 Saved</span></>}
      </p>
      <div className="res-stats">
        {[{l:"Duration",v:result.timer,i:"⏱️"},{l:"Participants",v:result.participants,i:"👥"},{l:"Exchanges",v:result.transcript?.length||14,i:"💬"}].map((s,i)=>(
          <div key={s.l} className="res-stat" style={{ animationDelay:`${i*.1}s` }}>
            <div className="res-stat-ico">{s.i}</div>
            <div className="res-stat-val">{s.v}</div>
            <div className="res-stat-lbl">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="res-actions">
        {result.hasRecording&&<button className="btn-s" onClick={()=>result.recorder?.download(`debatearena-${result.mode}.webm`)}>📥 Download Recording</button>}
        {(result.mode==="debate"||result.mode==="seminar")&&<button className="btn-s" style={{ borderColor:"rgba(99,102,241,.3)",color:"var(--ind)" }} onClick={()=>setShowAnalysis(true)}>📊 View Analysis</button>}
        <button className="btn-p" style={{ fontSize:13 }} onClick={onNew}>Start New Session</button>
      </div>
      {showAnalysis&&<AnalysisReport mode={result.mode} subMode={result.subMode} topic={result.topic} participants={result.participantsList||[]} scores={result.scores||{you:65,ai:52}} timer={result.timer} transcript={result.transcript||[]} onClose={()=>setShowAnalysis(false)} onDl={dlAnalysis}/>}
    </div>
  );
}