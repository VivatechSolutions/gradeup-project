import { useState, useEffect, useRef } from "react";
import { COLORS, PHASES, Participant } from "./shared";

// ── Toast ──────────────────────────────────────────────────────────────────
export function Toast({ msg, type, onDone }: { msg:string; type:string; onDone:()=>void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  const ic: Record<string,string> = { success:"✅", error:"❌", warn:"⚠️", info:"ℹ️" };
  return <div className={`toast ${type}`}>{ic[type]||"ℹ️"} {msg}</div>;
}

export function useToast() {
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const show = (msg:string, type="success") => setToast({msg, type});
  const node = toast ? <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/> : null;
  return { show, node };
}

// ── Loading overlay ────────────────────────────────────────────────────────
export function LoadingOverlay({ text, sub, progress }: { text:string; sub?:string; progress?:number }) {
  return (
    <div className="loading-overlay">
      <div className="lo-spinner"><div className="lo-ring1"/><div className="lo-ring2"/></div>
      <div className="lo-text">{text}</div>
      {sub && <div className="lo-sub">{sub}</div>}
      {progress !== undefined && (
        <div className="lo-progress"><div className="lo-progress-fill" style={{ width:`${progress}%` }}/></div>
      )}
    </div>
  );
}

// ── Cal Sync ──────────────────────────────────────────────────────────────
export function CalSync({ on, set }: { on:boolean; set:(v:boolean)=>void }) {
  return (
    <div className="cal-banner" onClick={() => set(!on)}>
      <span style={{ fontSize:18 }}>📅</span>
      <div className="cal-t"><strong>Sync to Calendar</strong><span>Auto-save with notifications</span></div>
      <button className="toggle" style={{ background:on?"var(--em)":"rgba(0,0,0,.14)" }} onClick={e=>{e.stopPropagation();set(!on);}}>
        <span className="toggle-thumb" style={{ left:on?20:2 }}/>
      </button>
    </div>
  );
}

// ── Steps progress ─────────────────────────────────────────────────────────
export function Steps({ steps }: { steps:{label:string;done:boolean}[] }) {
  const st = (i:number) => steps[i].done ? "done" : steps.slice(0,i).every(s=>s.done) ? "act" : "pend";
  return (
    <div className="steps">
      {steps.map((s,i)=>(
        <div key={i} className={`step-row ${st(i)}`}>
          <div className="step-num">{s.done?"✓":i+1}</div>
          <div className="step-lbl">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Mic preview ────────────────────────────────────────────────────────────
export function MicPreview({ perm, name, onReq, micOn, onToggle, isSpeaking }: any) {
  return (
    <div className="mic-preview">
      <div className={`mic-av ${isSpeaking?"spk":""}`}>{name?name[0].toUpperCase():"?"}</div>
      <div className="mic-info">
        <div className="mic-name">{name||"Your Name"}</div>
        <div className="mic-sub">🎙 Audio-only mode</div>
        <div className="perm-row">
          {perm==="idle"       && <button className="perm-btn req" onClick={onReq}>🎤 Allow Mic</button>}
          {perm==="requesting" && <button className="perm-btn req" disabled><span className="loader-spin dark" style={{ width:14,height:14,borderWidth:2 }}/>Requesting…</button>}
          {perm==="denied"     && <button className="perm-btn denied" onClick={onReq}>🔄 Retry</button>}
          {perm==="granted"    && (
            <>
              <button className={`perm-btn ${micOn?"granted":"denied"}`} onClick={onToggle}>{micOn?"🎤 Mic On":"🔇 Off"}</button>
              <span style={{ padding:"5px 10px",borderRadius:7,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",fontSize:11,fontWeight:700,color:"var(--em)" }}>✓ Ready</span>
            </>
          )}
        </div>
        {perm==="denied" && <div className="perm-warn">⚠️ Allow mic in browser settings and retry.</div>}
      </div>
    </div>
  );
}

// ── Cam preview ────────────────────────────────────────────────────────────
export function CamPreview({ stream, camOn, micOn, name, perm, onReq, onToggleMic, onToggleCam }: any) {
  const vRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (vRef.current) vRef.current.srcObject = stream&&camOn ? stream : null; }, [stream,camOn]);
  return (
    <>
      <div className="cam-wrap">
        <video ref={vRef} autoPlay playsInline muted style={{ display:stream&&camOn?"block":"none" }}/>
        {(!stream||!camOn) && (
          <div className="cam-off">
            <div className="cam-av">{name?name[0].toUpperCase():"?"}</div>
            <span style={{ fontSize:11,fontWeight:600,color:"var(--t3)" }}>{!stream?"Enable camera to preview":"Camera off"}</span>
          </div>
        )}
        {name && <div className="cam-nametag">📍 {name}</div>}
      </div>
      <div className="cam-perm-bar">
        {perm==="idle"       && <button className="cam-perm-btn req" style={{ flex:1 }} onClick={onReq}>🔐 Allow Camera & Mic</button>}
        {perm==="requesting" && <button className="cam-perm-btn req" style={{ flex:1 }} disabled><span className="loader-spin dark" style={{ width:14,height:14,borderWidth:2 }}/>Requesting…</button>}
        {perm==="denied"     && <button className="cam-perm-btn denied" style={{ flex:1 }} onClick={onReq}>🔄 Retry Permissions</button>}
        {perm==="granted"    && (
          <>
            <button className={`cam-perm-btn ${micOn?"granted":"denied"}`} onClick={onToggleMic}>{micOn?"🎤":"🔇"} {micOn?"Mic On":"Mic Off"}</button>
            <button className={`cam-perm-btn ${camOn?"granted":"denied"}`} onClick={onToggleCam}>{camOn?"📹":"🚫"} {camOn?"Cam On":"Cam Off"}</button>
            <span style={{ padding:"7px 10px",borderRadius:8,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",fontSize:11,fontWeight:700,color:"var(--em)",display:"flex",alignItems:"center",gap:4 }}>✓ Ready</span>
          </>
        )}
      </div>
      {perm==="denied" && <div className="perm-warn">⚠️ Camera & mic access denied. Allow in browser settings.</div>}
    </>
  );
}

// ── Speaking wave bars ─────────────────────────────────────────────────────
export function WaveBars({ color="#10b981" }: { color?:string }) {
  return (
    <div className="tile-wave">
      {[0,1,2,3,4].map(i=>(
        <div key={i} className="tile-wave-bar" style={{ background:color, animationDelay:`${i*0.11}s` }}/>
      ))}
    </div>
  );
}

// ── Video Tile ─────────────────────────────────────────────────────────────
export function Tile({ p, reaction, nudge }: { p:Participant&{isMyTurn?:boolean;isAITyping?:boolean}; reaction?:any; nudge?:string }) {
  const vRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (vRef.current && p.stream) vRef.current.srcObject = p.stream; }, [p.stream]);
  const color = p.avatarColor || COLORS[p.id % COLORS.length];
  const init  = p.name.split(" ").map((w:string)=>w[0]).join("").toUpperCase().slice(0,2);
  return (
    <div className={`tile ${p.isSpeaking?"spk":""}`}>
      {p.stream && p.camOn
        ? <video ref={vRef} autoPlay playsInline muted={p.isLocal}/>
        : <div className="tile-av" style={{ background:color+"28", color }}>{p.isAI?"🤖":p.isMed?"🎙️":init}</div>
      }
      {p.isSpeaking && <WaveBars color={p.isAI?"#8b5cf6":"#10b981"}/>}
      {p.isMyTurn   && <div className="tile-turn">🎤 Your Turn</div>}
      {p.isAITyping && (
        <div className="ai-typing-wrap">
          {[0,1,2].map(i=><div key={i} className="ai-dot" style={{ animationDelay:`${i*0.22}s` }}/>)}
        </div>
      )}
      {nudge && <div className="tile-nudge">{nudge}</div>}
      {p.handRaised && <div className="tile-hand">✋ Hand Raised</div>}
      {reaction && <div key={reaction.key} className="tile-react">{reaction.emoji}</div>}
      <div className="tile-ov">
        <div className="tile-name">
          {p.name}
          {p.isHost  && <span className="t-badge t-host">HOST</span>}
          {p.isAI && !p.isMed && <span className="t-badge t-ai">AI</span>}
          {p.isMed   && <span className="t-badge t-med">MEDIATOR</span>}
          {p.isLocal && !p.isHost && <span className="t-badge t-you">You</span>}
        </div>
        {p.micMuted && <div className="tile-muted">🔇</div>}
      </div>
    </div>
  );
}

// ── Join Confirm Modal (Google Meet-style) ─────────────────────────────────
interface JoinConfirmProps {
  config: any;
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onJoin: () => void;
  onCancel: () => void;
  joining: boolean;
  joinProgress: number;
}

export function JoinConfirmModal({ config, micOn, camOn, onToggleMic, onToggleCam, onJoin, onCancel, joining, joinProgress }: JoinConfirmProps) {
  const name    = config.name || "You";
  const topic   = config.topic || "Session";
  const mode    = config.mode;
  const invCount= (config.invitees || []).filter((i:any) => i.status === "joined").length;
  const emoji   = mode==="debate"?"⚔️":mode==="seminar"?"🎓":"📹";
  const modeLabel = mode==="debate"?"Debate Room":mode==="seminar"?"Seminar Room":"Meeting Room";

  return (
    <div className="overlay">
      <div className="modal join-confirm" style={{ maxWidth:420 }}>
        {/* Camera/Avatar preview */}
        <div className="jc-preview">
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#0d1428,#1a2040)" }}/>
          <div style={{ position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center" }}>
            <div className="jc-avatar">{name[0]?.toUpperCase()}</div>
            <div className="jc-name">{name}</div>
            <div className="jc-meta">{emoji} {modeLabel}</div>
          </div>
          {/* Ambient particles */}
          <div style={{ position:"absolute",inset:0,background:"radial-gradient(circle at 30% 70%,rgba(99,102,241,.1) 0%,transparent 50%)",pointerEvents:"none" }}/>
        </div>

        <div className="mb">
          {/* Room info */}
          <div className="jc-room-info">
            <div className="jc-room-ico">{emoji}</div>
            <div>
              <div className="jc-room-title">{topic}</div>
              <div className="jc-room-sub">{modeLabel} · Room ID: {config.roomId?.slice(0,8) || "da-room"}</div>
            </div>
          </div>

          {/* Mic / Cam toggles */}
          <div className="jc-mic-cam">
            {/* Mic always shown */}
            <button className={`jc-device-btn ${micOn?"on":"off"}`} onClick={onToggleMic}>
              <span style={{ fontSize:18 }}>{micOn?"🎤":"🔇"}</span>
              {micOn ? "Microphone On" : "Microphone Off"}
            </button>
            {/* Camera only for meeting */}
            {mode === "meeting" && (
              <button className={`jc-device-btn ${camOn?"on":"off"}`} onClick={onToggleCam}>
                <span style={{ fontSize:18 }}>{camOn?"📹":"🚫"}</span>
                {camOn ? "Camera On" : "Camera Off"}
              </button>
            )}
          </div>

          {/* Who's in the room */}
          {invCount > 0 && (
            <div className="jc-participants">
              <div className="jc-av-stack">
                {(config.invitees||[]).filter((i:any)=>i.status==="joined").slice(0,3).map((inv:any,idx:number)=>(
                  <div key={idx} className="jc-av-sm" style={{ background:inv.avatarColor||COLORS[idx%COLORS.length], zIndex:10-idx }}>
                    {inv.value[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
              <span>{invCount} participant{invCount>1?"s":""} already in room</span>
            </div>
          )}

          {/* Already invited notice */}
          {(config.invitees||[]).filter((i:any)=>i.type==="email").length > 0 && (
            <div style={{ fontSize:12,color:"var(--t3)",textAlign:"center",marginBottom:4 }}>
              📧 Invites sent to {(config.invitees||[]).filter((i:any)=>i.type==="email").length} email(s)
            </div>
          )}
        </div>

        <div className="mf" style={{ flexDirection:"column",gap:8 }}>
          <button className="btn-p" onClick={onJoin} disabled={joining} style={{ fontSize:14 }}>
            {joining ? (
              <><span className="loader-spin"/>Joining{joinProgress>0?` ${joinProgress}%`:"…"}</>
            ) : `${emoji} Join ${modeLabel}`}
          </button>
          {joinProgress>0 && <div className="lo-progress" style={{ width:"100%" }}><div className="lo-progress-fill" style={{ width:`${joinProgress}%` }}/></div>}
          <button className="btn-s" onClick={onCancel} disabled={joining} style={{ width:"100%",justifyContent:"center" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Analysis Report ────────────────────────────────────────────────────────
export function AnalysisReport({ mode, subMode, topic, participants, scores, timer, transcript, onClose, onDl }: any) {
  const isAI   = mode==="debate" && subMode==="ai";
  const isMulti= (mode==="debate" && subMode==="multi") || mode==="seminar";
  const youWon = (scores?.you||65) > (scores?.ai||52);
  const humanPs= (participants||[]).filter((p:any)=>!p.isAI&&!p.isMed);
  const exchCount = transcript?.length || 14;

  return (
    <div className="analysis-bg" onClick={onClose}>
      <div className="analysis-box" onClick={e=>e.stopPropagation()}>
        <div className="analysis-head">
          <div className="analysis-title">{isAI?"🏆 Debate Analysis":mode==="seminar"?"📋 Seminar Report":"📊 Multi-User Analysis"}</div>
          <button style={{ width:26,height:26,borderRadius:7,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",cursor:"pointer",color:"rgba(255,255,255,.55)",fontSize:12 }} onClick={onClose}>✕</button>
        </div>
        <div className="analysis-body">
          {/* Session meta */}
          <div className="a-sec" style={{ animationDelay:".04s" }}>
            <div className="a-sec-title">📌 Session Details</div>
            <div style={{ padding:"9px 12px",borderRadius:10,background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.18)",fontSize:13,fontWeight:700,color:"#fff",marginBottom:7 }}>"{topic}"</div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {[`⏱ ${timer}`,`👥 ${humanPs.length} human participant${humanPs.length!==1?"s":""}`,`💬 ${exchCount} exchanges`,`📋 4 phases`].map(t=>(
                <span key={t} style={{ padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.55)" }}>{t}</span>
              ))}
            </div>
          </div>

          {/* AI 1v1 analysis */}
          {isAI && (
            <>
              <div className="a-sec" style={{ animationDelay:".09s" }}>
                <div className="a-sec-title">📊 Score Breakdown</div>
                <div className="score-grid-3">
                  <div className="score-box"><div className="score-box-val" style={{ color:"var(--sky)" }}>{scores?.you||65}</div><div className="score-box-lbl">Your Score</div></div>
                  <div className="score-box"><div className="score-box-val" style={{ color:"var(--vio)" }}>{scores?.ai||52}</div><div className="score-box-lbl">AI Score</div></div>
                  <div className="score-box"><div className="score-box-val" style={{ color:"var(--em)" }}>{Math.abs((scores?.you||65)-(scores?.ai||52))}</div><div className="score-box-lbl">Margin</div></div>
                </div>
                {[{l:"Argument Strength",y:73,a:65,c:"#6366f1"},{l:"Evidence Quality",y:68,a:78,c:"#10b981"},{l:"Rebuttal Skill",y:61,a:70,c:"#f59e0b"},{l:"Clarity & Structure",y:80,a:62,c:"#38bdf8"}].map((c,i)=>(
                  <div className="prog-wrap" key={i}>
                    <div className="prog-label"><span>{c.l}</span><span style={{ color:"rgba(255,255,255,.6)" }}>You {c.y}% · AI {c.a}%</span></div>
                    <div className="prog-track"><div className="prog-fill" style={{ width:`${c.y}%`,background:c.c }}/></div>
                  </div>
                ))}
              </div>
              <div className="a-sec" style={{ animationDelay:".15s" }}>
                <div className="a-sec-title">💪 Key Strengths & Gaps</div>
                <div className="str-list">
                  {[{i:"🎯",t:<><strong>Clear Position:</strong> Maintained consistent stance throughout the debate.</>},
                    {i:"💡",t:<><strong>Evidence:</strong> Good examples used. Add more statistics for stronger credibility.</>},
                    {i:"🔄",t:<><strong>Rebuttals:</strong> Improve speed when countering AI arguments in real time.</>},
                    {i:"📢",t:<><strong>Opening:</strong> Strong framework — kept AI on the defensive from the start.</>}
                  ].map((s,i)=>(
                    <div key={i} className="str-item"><div className="str-ico">{s.i}</div><div className="str-text">{s.t}</div></div>
                  ))}
                </div>
              </div>
              <div className="a-sec" style={{ animationDelay:".21s" }}>
                <div className="a-sec-title">🚀 AI Coach Recommendation</div>
                <div style={{ padding:"10px 12px",borderRadius:10,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.7 }}>
                  Acknowledge your opponent's strongest point before dismantling it. Use the <strong style={{ color:"#fff" }}>PEEL</strong> framework: Point → Evidence → Explanation → Link back to the motion.
                </div>
              </div>
              <div className="a-sec" style={{ animationDelay:".27s" }}>
                <div className="a-sec-title">🏆 Verdict</div>
                <div className="verdict-box" style={{ borderColor:youWon?"rgba(16,185,129,.4)":"rgba(99,102,241,.4)",background:youWon?"rgba(16,185,129,.07)":"rgba(99,102,241,.07)" }}>
                  <div className="verdict-win" style={{ color:youWon?"var(--em)":"var(--ind3)" }}>{youWon?"🥇 You Win!":"🤖 AI Wins"}</div>
                  <div className="verdict-lbl" style={{ color:"rgba(255,255,255,.5)" }}>{youWon?"You":"AI"} scored {Math.max(scores?.you||65,scores?.ai||52)} pts · {exchCount} rounds</div>
                </div>
              </div>
            </>
          )}

          {/* Multi/Seminar */}
          {isMulti && (
            <>
              <div className="a-sec" style={{ animationDelay:".09s" }}>
                <div className="a-sec-title">{mode==="seminar"?"📝 Facilitator Summary":"⚖️ AI Mediator Summary"}</div>
                <div style={{ padding:"10px 12px",borderRadius:10,background:"rgba(56,189,248,.07)",border:"1px solid rgba(56,189,248,.18)",fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.75 }}>
                  The {mode==="seminar"?"seminar":"debate"} on "{topic}" engaged {humanPs.length} participant{humanPs.length!==1?"s":""} in rigorous, substantive discussion. All sides presented well-reasoned arguments with academic depth and mutual respect.
                </div>
              </div>
              {humanPs.length > 0 && (
                <div className="a-sec" style={{ animationDelay:".15s" }}>
                  <div className="a-sec-title">👥 Individual Performance</div>
                  <div className="pa-list">
                    {humanPs.map((p:any,i:number)=>{
                      const sc = 58+Math.floor(Math.random()*32);
                      const eng= 55+Math.floor(Math.random()*36);
                      const cla= 60+Math.floor(Math.random()*30);
                      const dep= 50+Math.floor(Math.random()*40);
                      return (
                        <div key={i} className="pa-row">
                          <div className="pa-name-row">
                            <div style={{ width:20,height:20,borderRadius:"50%",background:(p.avatarColor||COLORS[i%COLORS.length])+"33",color:p.avatarColor||COLORS[i%COLORS.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800 }}>{p.name[0]}</div>
                            {p.name}{p.isLocal?" (You)":""}
                            <span style={{ marginLeft:"auto",fontSize:17,fontWeight:900,color:"var(--sky)" }}>{sc}</span>
                          </div>
                          {[{l:"Engagement",v:eng,c:"#6366f1"},{l:"Clarity",v:cla,c:"#10b981"},{l:"Depth",v:dep,c:"#f59e0b"}].map(b=>(
                            <div className="prog-wrap" key={b.l}>
                              <div className="prog-label"><span style={{ fontSize:10.5 }}>{b.l}</span><span style={{ fontSize:10.5,color:"rgba(255,255,255,.45)" }}>{b.v}%</span></div>
                              <div className="prog-track"><div className="prog-fill" style={{ width:`${b.v}%`,background:b.c }}/></div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="a-sec" style={{ animationDelay:".21s" }}>
                <div className="a-sec-title">💡 Key Themes Discussed</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                  {["Socioeconomic impact","Ethical considerations","Feasibility","Long-term sustainability","Policy implications"].map(t=>(
                    <span key={t} style={{ padding:"4px 11px",borderRadius:20,background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",fontSize:11.5,fontWeight:700,color:"var(--ind3)" }}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="a-sec" style={{ animationDelay:".27s" }}>
                <div className="a-sec-title">📌 {mode==="seminar"?"Facilitator":"Mediator"} Verdict</div>
                <div style={{ padding:"10px 12px",borderRadius:10,background:"rgba(139,92,246,.08)",border:"1px solid rgba(139,92,246,.24)",fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.75 }}>
                  {mode==="seminar"?"The seminar produced rich, multi-perspective insights. Participants demonstrated exceptional analytical skills and constructive dialogue.":"After thorough analysis, arguments were well-balanced across all participants. The discussion meaningfully advanced collective understanding of this complex topic."}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="analysis-foot">
          <button className="btn-s" style={{ background:"rgba(255,255,255,.05)",borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.55)" }} onClick={onClose}>Close</button>
          <button className="btn-p" style={{ width:"auto",padding:"9px 18px",fontSize:12.5 }} onClick={onDl}>📥 Download Report</button>
        </div>
      </div>
    </div>
  );
}