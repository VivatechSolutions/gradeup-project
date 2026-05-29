import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Bot, School, Sparkles, Star, BookOpen, BrainCircuit,
  Loader2, Send, ChevronDown, X, MessageCircle, Minimize2, Menu
} from 'lucide-react';
import { useTheme } from '../hooks/use-theme';
import { useAuth } from '../hooks/use-auth';
import Navigation from '../components/navigation';
import { cn } from '../lib/utils';
import { useMediaQuery } from '../hooks/use-media-query';

/* ─── Dashboard CSS ─── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.sem-root * { box-sizing: border-box; }
.sem-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  height: 100dvh; display: flex; flex-direction: column;
  background: #f8fafc; overflow: hidden;
}

/* ── HERO HEADER ── */
.sem-hero {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%);
  padding: 20px 28px; position: relative; overflow: hidden; flex-shrink: 0;
}
.sem-hero::before { content:''; position:absolute; top:-40px; right:-40px; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,.08); pointer-events:none; }
.sem-hero-inner { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.sem-hero-left  { display:flex; align-items:center; gap:12px; }
.sem-hero-icon  { width:40px; height:40px; border-radius:11px; background:rgba(255,255,255,.18); display:flex; align-items:center; justify-content:center; border:1.5px solid rgba(255,255,255,.25); flex-shrink:0; }
.sem-hero-title { font-size:clamp(16px,2.5vw,22px); font-weight:800; color:#fff; letter-spacing:-.4px; }
.sem-hero-sub   { font-size:12.5px; color:rgba(255,255,255,.7); margin-top:2px; }
.sem-mob-menu-btn {
  display:none; align-items:center; gap:6px;
  padding:7px 14px; border-radius:10px; border:none; cursor:pointer;
  background:rgba(255,255,255,.18); color:#fff; font-size:12px; font-weight:600; font-family:inherit;
}
.sem-mob-menu-btn svg { width:15px; height:15px; }
.sem-active-badge {
  display:none; padding:5px 14px; border-radius:20px;
  background:rgba(255,255,255,.2); color:#fff; font-size:12px; font-weight:600; max-width:200px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* ── BODY ── */
.sem-body { flex:1; display:flex; min-height:0; overflow:hidden; }

/* ── LEFT SIDEBAR ── */
.sem-sidebar {
  width:280px; min-width:280px; background:#0f172a; display:flex; flex-direction:column;
  border-right:1px solid rgba(255,255,255,.05); flex-shrink:0; overflow-y:auto;
}
.sem-sidebar::-webkit-scrollbar { width:3px; }
.sem-sidebar::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08); border-radius:3px; }
.sem-sidebar-inner { padding:18px 16px; display:flex; flex-direction:column; gap:14px; }

/* Section card inside sidebar */
.sem-side-card {
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
  border-radius:14px; padding:16px;
}
.sem-side-card-title { font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#64748b; margin-bottom:12px; display:flex; align-items:center; gap:7px; }
.sem-side-card-title svg { width:13px; height:13px; color:#8b5cf6; }

/* Inputs */
.sem-label { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#64748b; margin-bottom:6px; display:block; }
.sem-input-wrap { margin-bottom:10px; }
.sem-divider { display:flex; align-items:center; gap:8px; margin:10px 0; }
.sem-divider-line { flex:1; height:1px; background:rgba(255,255,255,.07); }
.sem-divider-text { font-size:11px; font-weight:600; color:#475569; }
.sem-start-btn {
  width:100%; padding:11px 0; border-radius:12px; border:none; cursor:pointer;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  font-size:13.5px; font-weight:700; font-family:inherit;
  box-shadow:0 4px 14px rgba(99,102,241,.35); transition:all .2s;
}
.sem-start-btn:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(99,102,241,.45); }
.sem-start-btn:disabled { opacity:.4; cursor:not-allowed; transform:none; box-shadow:none; }

/* Action buttons */
.sem-action-btn {
  width:100%; display:flex; align-items:center; gap:11px;
  padding:12px 14px; border-radius:12px;
  border:1.5px solid rgba(255,255,255,.07); background:rgba(255,255,255,.03);
  cursor:pointer; font-family:inherit; transition:all .2s; text-align:left; margin-bottom:8px;
}
.sem-action-btn:hover:not(:disabled) { border-color:rgba(99,102,241,.4); background:rgba(99,102,241,.08); }
.sem-action-btn:disabled { opacity:.35; cursor:not-allowed; }
.sem-action-btn-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sem-action-btn-title { font-size:13px; font-weight:700; color:#f1f5f9; }
.sem-action-btn-sub   { font-size:11px; color:#64748b; margin-top:1px; }

.sem-active-topic-card { background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.2); border-radius:12px; padding:12px 14px; }
.sem-active-topic-label { font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#8b5cf6; margin-bottom:4px; }
.sem-active-topic-text  { font-size:13px; font-weight:600; color:#e2e8f0; line-height:1.4; }
.sem-reset-btn { width:100%; background:none; border:none; color:#64748b; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; padding:6px 0; transition:color .15s; }
.sem-reset-btn:hover { color:#94a3b8; }

/* ── MAIN CONTENT ── */
.sem-main { flex:1; display:flex; flex-direction:column; min-width:0; min-height:0; overflow:hidden; padding:20px; }
.sem-main-card {
  flex:1; display:flex; flex-direction:column; min-height:0; overflow:hidden;
  background:#fff; border-radius:20px; border:1px solid #f3f4f6;
  box-shadow:0 2px 12px rgba(0,0,0,.05);
}

/* Chat area */
.sem-chat-area { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:14px; }
.sem-chat-area::-webkit-scrollbar { width:3px; }
.sem-chat-area::-webkit-scrollbar-thumb { background:#e0e7ff; border-radius:3px; }
.sem-empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:40px; }
.sem-empty-icon  { font-size:64px; margin-bottom:14px; opacity:.4; }
.sem-empty-title { font-size:20px; font-weight:800; color:#0f172a; margin-bottom:6px; }
.sem-empty-sub   { font-size:14px; color:#94a3b8; max-width:300px; line-height:1.6; }

/* Message row */
.sem-msg-row { display:flex; align-items:flex-end; gap:10px; }
.sem-msg-row.user { flex-direction:row-reverse; }
.sem-msg-avatar { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sem-msg-avatar.ai   { background:linear-gradient(135deg,#6366f1,#8b5cf6); }
.sem-msg-avatar.user { background:linear-gradient(135deg,#0ea5e9,#6366f1); }
.sem-msg-avatar svg  { width:14px; height:14px; color:#fff; }
.sem-bubble { max-width:72%; padding:11px 15px; border-radius:16px; font-size:13.5px; line-height:1.65; }
.sem-bubble.ai   { background:#f8fafc; border:1px solid #e0e7ff; color:#1e293b; border-radius:4px 16px 16px 16px; }
.sem-bubble.user { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border-radius:16px 4px 16px 16px; }

/* Recording bar */
.sem-recording-bar {
  margin:0 20px; padding:10px 14px; background:#fef2f2; border:1px solid #fecaca;
  border-radius:12px; display:flex; align-items:center; gap:10px; flex-shrink:0;
}
.sem-rec-dot { width:9px; height:9px; border-radius:50%; background:#ef4444; animation:recPulse 1s infinite; }
@keyframes recPulse{0%,100%{opacity:1}50%{opacity:.35}}
.sem-rec-label { flex:1; font-size:13px; font-weight:600; color:#dc2626; }
.sem-rec-finish-btn {
  padding:7px 16px; border-radius:9px; background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff; border:none; cursor:pointer; font-size:12.5px; font-weight:700; font-family:inherit;
  box-shadow:0 3px 10px rgba(99,102,241,.3); transition:all .18s;
}
.sem-rec-finish-btn:hover { transform:translateY(-1px); }

/* Input row */
.sem-input-row { padding:12px 16px 14px; border-top:1px solid #f3f4f6; display:flex; gap:8px; align-items:flex-end; flex-shrink:0; background:#fff; }
.sem-textarea {
  flex:1; resize:none; border-radius:12px; border:1.5px solid #e0e7ff; background:#fafbff;
  color:#1e293b; font-size:13.5px; padding:10px 14px; outline:none; min-height:44px; max-height:120px;
  transition:border .18s; font-family:inherit;
}
.sem-textarea:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.sem-textarea::placeholder { color:#94a3b8; }
.sem-send-btn {
  width:36px; height:36px; border-radius:10px; border:none; cursor:pointer;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
  box-shadow:0 3px 10px rgba(99,102,241,.3); transition:all .18s;
}
.sem-send-btn:hover { transform:scale(1.07); }
.sem-send-btn svg { width:15px; height:15px; }

/* Feedback screen */
.sem-feedback-wrap { flex:1; overflow-y:auto; padding:24px; }
.sem-feedback-hero { text-align:center; margin-bottom:24px; }
.sem-score-number  { font-size:64px; font-weight:900; color:#0f172a; line-height:1; }
.sem-score-sub     { font-size:16px; color:#94a3b8; margin-top:4px; }
.sem-feedback-quote{ font-size:14px; color:#64748b; font-style:italic; text-align:center; margin-bottom:20px; padding:0 24px; }
.sem-feedback-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
.sem-feedback-card {
  background:#f8fafc; border-radius:14px; padding:16px; border:1px solid #f3f4f6;
}
.sem-feedback-card-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
.sem-feedback-card-label { font-size:13px; font-weight:700; color:#0f172a; }
.sem-grade-badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:800; background:rgba(99,102,241,.1); color:#6366f1; }
.sem-feedback-card-text { font-size:12.5px; color:#64748b; line-height:1.55; }
.sem-again-btn {
  width:100%; padding:14px; border-radius:14px; border:none; cursor:pointer;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  font-size:14px; font-weight:800; font-family:inherit;
  box-shadow:0 6px 20px rgba(99,102,241,.35); transition:all .2s;
}
.sem-again-btn:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(99,102,241,.45); }

/* Floating coach */
.sem-float-wrap { position:fixed; bottom:24px; right:24px; z-index:50; display:flex; flex-direction:column; align-items:flex-end; gap:12px; }
.sem-chat-window {
  width:340px; border-radius:20px; overflow:hidden;
  border:1px solid #e0e7ff; box-shadow:0 20px 50px rgba(99,102,241,.15); background:#fff;
  transform-origin:bottom right;
}
.sem-chat-head { background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:12px 16px; display:flex; align-items:center; gap:10px; }
.sem-chat-head-avatar { width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; }
.sem-chat-head-avatar svg { width:18px; height:18px; color:#fff; }
.sem-chat-head-name { font-size:13.5px; font-weight:700; color:#fff; }
.sem-chat-head-sub  { font-size:11px; color:rgba(255,255,255,.7); }
.sem-chat-minimize  { background:none; border:none; cursor:pointer; color:rgba(255,255,255,.7); display:flex; align-items:center; margin-left:auto; }
.sem-chat-minimize svg { width:16px; height:16px; }
.sem-chat-msgs { height:220px; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; background:#fff; }
.sem-chat-msgs::-webkit-scrollbar { width:3px; }
.sem-chat-msgs::-webkit-scrollbar-thumb { background:#e0e7ff; border-radius:3px; }
.sem-coach-bubble { max-width:82%; padding:9px 12px; border-radius:14px; font-size:12.5px; line-height:1.6; }
.sem-coach-bubble.ai   { background:#f8fafc; border:1px solid #e0e7ff; color:#374151; border-radius:4px 14px 14px 14px; align-self:flex-start; }
.sem-coach-bubble.user { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border-radius:14px 4px 14px 14px; align-self:flex-end; }
.sem-coach-typing { display:flex; gap:3px; padding:10px 12px; background:#f8fafc; border:1px solid #e0e7ff; border-radius:4px 14px 14px 14px; align-self:flex-start; }
.sem-coach-dot { width:6px; height:6px; border-radius:50%; background:#8b5cf6; animation:coachBounce .9s infinite; }
.sem-coach-dot:nth-child(2){animation-delay:.15s} .sem-coach-dot:nth-child(3){animation-delay:.3s}
@keyframes coachBounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}
.sem-chat-input-row { padding:8px; border-top:1px solid #f3f4f6; background:#fff; display:flex; gap:8px; }
.sem-coach-input { flex:1; padding:8px 12px; border-radius:10px; border:1.5px solid #e0e7ff; background:#fafbff; font-size:12.5px; font-family:inherit; outline:none; color:#1e293b; }
.sem-coach-input:focus { border-color:#6366f1; }
.sem-coach-send { width:34px; height:34px; border-radius:9px; border:none; cursor:pointer; background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sem-coach-send svg { width:14px; height:14px; color:#fff; }
.sem-float-btn {
  width:52px; height:52px; border-radius:50%; border:none; cursor:pointer;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center;
  box-shadow:0 8px 24px rgba(99,102,241,.45); position:relative;
}
.sem-float-btn svg { width:24px; height:24px; color:#fff; }
.sem-float-dot { position:absolute; top:-3px; right:-3px; width:14px; height:14px; background:#10b981; border-radius:50%; border:2px solid #fff; }

/* Custom select */
.sem-select-wrap { position:relative; width:100%; }
.sem-select-btn {
  width:100%; display:flex; align-items:center; justify-content:space-between;
  padding:10px 12px; border-radius:10px; font-size:13px; font-weight:500;
  background:rgba(255,255,255,.07); border:1.5px solid rgba(255,255,255,.1);
  color:#f1f5f9; font-family:inherit; cursor:pointer; text-align:left; transition:all .18s;
}
.sem-select-btn:hover:not(:disabled) { border-color:rgba(99,102,241,.5); background:rgba(255,255,255,.1); }
.sem-select-btn:disabled { opacity:.4; cursor:not-allowed; }
.sem-select-btn.open { border-color:rgba(99,102,241,.6); background:rgba(99,102,241,.1); }
.sem-select-placeholder { color:#64748b; }
.sem-select-value { display:flex; align-items:center; gap:7px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.sem-select-dropdown {
  position:absolute; z-index:100; width:100%; margin-top:4px;
  background:#1e293b; border:1px solid rgba(255,255,255,.1); border-radius:12px;
  overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,.3);
}
.sem-select-list { max-height:200px; overflow-y:auto; padding:4px; }
.sem-select-option {
  display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:8px;
  cursor:pointer; font-size:13px; font-weight:500; color:#cbd5e1;
  transition:all .15s; font-family:inherit; background:none; border:none; width:100%; text-align:left;
}
.sem-select-option:hover { background:rgba(99,102,241,.15); color:#f1f5f9; }
.sem-select-option.selected { background:rgba(99,102,241,.2); color:#a5b4fc; font-weight:700; }
.sem-select-chevron { width:14px; height:14px; color:#64748b; transition:transform .2s; flex-shrink:0; }
.sem-select-chevron.open { transform:rotate(180deg); }

/* Mobile sidebar overlay */
.sem-mob-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:3000; }
.sem-mob-sidebar { position:fixed; top:0; left:0; bottom:0; width:300px; background:#0f172a; z-index:3001; overflow-y:auto; transform:translateX(-100%); transition:transform .3s; box-shadow:10px 0 40px rgba(0,0,0,.3); }
.sem-mob-sidebar.open { transform:translateX(0); }
.sem-mob-sidebar-head { padding:14px 16px; border-bottom:1px solid rgba(255,255,255,.07); display:flex; align-items:center; justify-content:space-between; }
.sem-mob-sidebar-title { font-size:13.5px; font-weight:700; color:#f1f5f9; }
.sem-mob-close-btn { width:28px; height:28px; border-radius:7px; border:none; background:rgba(255,255,255,.07); cursor:pointer; display:flex; align-items:center; justify-content:center; color:#94a3b8; }
.sem-mob-close-btn svg { width:14px; height:14px; }

/* Responsive */
@media (max-width:1024px) {
  .sem-sidebar { display:none; }
  .sem-mob-overlay.active { display:block; }
  .sem-mob-sidebar.open { transform:translateX(0); }
  .sem-mob-menu-btn { display:flex; }
  .sem-active-badge { display:block; }
}
@media (max-width:768px) {
  .sem-hero { padding:14px 16px; }
  .sem-main { padding:12px; }
  .sem-feedback-grid { grid-template-columns:1fr; }
  .sem-chat-window { width:calc(100vw - 32px); }
}
@media (max-width:480px) {
  .sem-bubble { max-width:88%; }
  .sem-score-number { font-size:52px; }
}
`;

const SEMINAR_TOPICS = [
  { value: 'history-of-ai',     label: 'The History of Artificial Intelligence', icon: '🧠' },
  { value: 'quantum-computing', label: 'The Basics of Quantum Computing',         icon: '⚛️' },
  { value: 'climate-change',    label: 'Impact of Climate Change on Biodiversity',icon: '🌍' },
  { value: 'blockchain',        label: 'Blockchain Technology and Its Applications',icon: '🔗' },
  { value: 'neuroscience',      label: 'Neuroscience of Learning',                icon: '🔬' },
  { value: 'space',             label: 'The Future of Space Exploration',         icon: '🚀' },
  { value: 'renewable-energy',  label: 'Renewable Energy & Sustainability',       icon: '♻️' },
  { value: 'philosophy-mind',   label: 'Philosophy of Mind & Consciousness',      icon: '💭' },
];

const getDemoLines = (topic: string) => [
  `Excellent choice! Let's begin the AI demo on "${topic}". Watch the structure, tone and transitions carefully.`,
  `*(clears throat)* Good morning everyone! Today we explore a fascinating topic that touches all of us...`,
  `Notice how I opened with relevance. For key point #1 — always use concrete, simple language paired with data.`,
  `An analogy works wonders here: think of it like a GPS for complex ideas — it shows the route clearly, step by step.`,
  `Let me address a common misconception. Many people believe this is simple, but the evidence shows otherwise.`,
  `And to conclude — we covered core concepts, examined evidence, and explored real-world implications. Thank you!`,
  `Demo complete! That's the structure I recommend. Ready to take the stage yourself?`,
];

const COACH_TIPS = [
  "Start with a hook — a surprising fact, a question, or a short story grabs attention instantly.",
  "Use the rule of three: present exactly 3 main points. It's memorable and feels complete.",
  "Make eye contact with different sections of the room every 15–20 seconds.",
  "Pause for 2 seconds after key points — silence is a powerful emphasis tool.",
  "Summarise at the end: 'In conclusion, we've learned X, Y, and Z.'",
  "Use transition phrases: 'Moving on to...', 'Building on that...', 'Let's now explore...'",
];

/* ─── Custom Select ─── */
interface SelectOption { value:string; label:string; icon?:string; }
const CustomSelect = ({ value, onChange, options, placeholder, disabled=false }: { value:string; onChange:(v:string)=>void; options:SelectOption[]; placeholder:string; disabled?:boolean }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = options.find(o => o.value === value);
  useEffect(() => {
    const h = (e:MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="sem-select-wrap">
      <button type="button" onClick={()=>!disabled&&setOpen(o=>!o)} disabled={disabled}
        className={`sem-select-btn${open?" open":""}`}>
        <span className={sel?"sem-select-value":"sem-select-placeholder"}>
          {sel ? <>{sel.icon&&<span>{sel.icon}</span>}{sel.label}</> : placeholder}
        </span>
        <svg className={`sem-select-chevron${open?" open":""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,y:-6,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:.97}} transition={{duration:.14}} className="sem-select-dropdown">
            <div className="sem-select-list">
              {options.map((opt,i) => (
                <motion.button key={opt.value} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={{delay:i*.025}}
                  className={`sem-select-option${value===opt.value?" selected":""}`}
                  onClick={()=>{ onChange(opt.value); setOpen(false); }}>
                  {opt.icon && <span>{opt.icon}</span>}{opt.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Floating Coach ─── */
const FloatingCoach = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from:"ai", text:"Hi! I'm your Seminar Coach 🎓 Ask me anything about presenting, structuring, or engaging your audience!" }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs, typing]);
  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMsgs(m => [...m, { from:"user", text:q }]); setInput(""); setTyping(true);
    setTimeout(() => {
      let r = COACH_TIPS[Math.floor(Math.random()*COACH_TIPS.length)];
      const low = q.toLowerCase();
      if (low.includes("nerv")) r = "Nervousness is normal! Channel it as energy. Practise 3× out loud and take slow breaths.";
      else if (low.includes("start")||low.includes("open")) r = "Open strong: a surprising stat, bold question, or a 15-second story. You have 30 seconds to win them.";
      else if (low.includes("structur")) r = "Introduction (hook + overview) → Body (3 key points) → Conclusion (summary + call to action).";
      else if (low.includes("engag")) r = "Ask rhetorical questions, use relatable analogies, and vary your tone. A well-timed pause beats more words.";
      setMsgs(m => [...m, { from:"ai", text:r }]); setTyping(false);
    }, 1100);
  };
  return (
    <motion.div className="sem-float-wrap" drag={isMobile} dragMomentum={false}>
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,scale:.85,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.85,y:16}} transition={{type:"spring",stiffness:300,damping:25}} className="sem-chat-window">
            <div className="sem-chat-head">
              <div className="sem-chat-head-avatar"><Bot className="animate-pulse" style={{width:18,height:18,color:"#fff"}}/></div>
              <div><div className="sem-chat-head-name">Seminar Coach</div><div className="sem-chat-head-sub">Always here to help</div></div>
              <button className="sem-chat-minimize" onClick={()=>setOpen(false)}><Minimize2 style={{width:15,height:15}}/></button>
            </div>
            <div className="sem-chat-msgs">
              {msgs.map((m,i) => <div key={i} className={`sem-coach-bubble ${m.from}`}>{m.text}</div>)}
              {typing && <div className="sem-coach-typing"><div className="sem-coach-dot"/><div className="sem-coach-dot"/><div className="sem-coach-dot"/></div>}
              <div ref={endRef}/>
            </div>
            <div className="sem-chat-input-row">
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask for tips…" className="sem-coach-input"/>
              <button onClick={send} className="sem-coach-send"><Send style={{width:14,height:14}}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button className="sem-float-btn" onClick={()=>setOpen(o=>!o)}
        animate={{y:[0,-5,0]}} transition={{duration:2.5,repeat:Infinity,ease:"easeInOut"}}
        whileHover={{scale:1.1}} whileTap={{scale:.95}}>
        {open ? <X style={{width:22,height:22}}/> : <MessageCircle style={{width:22,height:22}}/>}
        {!open && <motion.span className="sem-float-dot" animate={{scale:[1,1.3,1]}} transition={{duration:1.5,repeat:Infinity}}/>}
      </motion.button>
    </motion.div>
  );
};

/* ─── Sidebar Content ─── */
interface SidebarContentProps {
  selectedTopic:string; setSelectedTopic:(v:string)=>void;
  customTopic:string; setCustomTopic:(v:string)=>void;
  seminarState:string; activeTopic:string;
  canStart:boolean; onStart:()=>void;
  onWatchDemo:()=>void; onPresent:()=>void; onReset:()=>void;
  onClose?:()=>void;
}
const SidebarContent = ({ selectedTopic, setSelectedTopic, customTopic, setCustomTopic, seminarState, activeTopic, canStart, onStart, onWatchDemo, onPresent, onReset, onClose }: SidebarContentProps) => (
  <div className="sem-sidebar-inner">
    {/* Setup card */}
    <div className="sem-side-card">
      <div className="sem-side-card-title"><Sparkles/>Seminar Setup</div>
      <p style={{fontSize:12.5,color:"#64748b",marginBottom:12}}>Choose a topic to begin your practice session.</p>
      <label className="sem-label">Select a Topic</label>
      <div className="sem-input-wrap">
        <CustomSelect value={selectedTopic} onChange={v=>{ setSelectedTopic(v); setCustomTopic(""); }}
          options={SEMINAR_TOPICS} placeholder="Choose a seminar topic…" disabled={seminarState!=="idle"}/>
      </div>
      <div className="sem-divider"><div className="sem-divider-line"/><span className="sem-divider-text">OR</span><div className="sem-divider-line"/></div>
      <label className="sem-label">Write Your Own Topic</label>
      <input value={customTopic} onChange={e=>{ setCustomTopic(e.target.value); if(e.target.value) setSelectedTopic(""); }}
        placeholder="e.g. Ethics of AI in healthcare"
        disabled={seminarState!=="idle"}
        style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:"1.5px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.07)", color:"#f1f5f9", fontSize:13, fontFamily:"inherit", outline:"none", marginBottom:10, transition:"border .18s" }}
        onFocus={e=>{e.currentTarget.style.borderColor="rgba(99,102,241,.6)";}}
        onBlur={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.1)";}}
      />
      <button className="sem-start-btn" onClick={()=>{ onStart(); onClose?.(); }} disabled={!canStart||seminarState!=="idle"}>
        <BookOpen style={{width:15,height:15,display:"inline",marginRight:7}}/>Set Up Seminar
      </button>
    </div>

    {/* Steps card */}
    <AnimatePresence>
      {(seminarState==="topic_selected"||seminarState==="ai_demo") && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}>
          <div className="sem-side-card">
            <div className="sem-side-card-title">Choose Next Step</div>
            <button className="sem-action-btn" onClick={()=>{ onWatchDemo(); onClose?.(); }} disabled={seminarState==="ai_demo"}>
              <div className="sem-action-btn-icon" style={{background:"rgba(139,92,246,.2)"}}><Bot className="animate-pulse" style={{width:17,height:17,color:"#8b5cf6"}}/></div>
              <div><div className="sem-action-btn-title">Watch AI Demo</div><div className="sem-action-btn-sub">See an example first</div></div>
            </button>
            <button className="sem-action-btn" onClick={()=>{ onPresent(); onClose?.(); }} disabled={seminarState==="ai_demo"}>
              <div className="sem-action-btn-icon" style={{background:"rgba(14,165,233,.2)"}}><School style={{width:17,height:17,color:"#0ea5e9"}}/></div>
              <div><div className="sem-action-btn-title">I'm Ready to Present</div><div className="sem-action-btn-sub">Jump straight into practice</div></div>
            </button>
            <button className="sem-reset-btn" onClick={onReset}>← Choose a different topic</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Active topic */}
    <AnimatePresence>
      {activeTopic && (
        <motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.95}} className="sem-active-topic-card">
          <div className="sem-active-topic-label">Active Topic</div>
          <div className="sem-active-topic-text">{activeTopic}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

/* ─── Main Page ─── */
const SeminarToolPage = () => {
  const { userHeader } = useAuth();
  const [currentRole, setCurrentRole] = useState("student");
  const [seminarState, setSeminarState] = useState("idle");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [conversation, setConversation] = useState<{sender:string;text:string}[]>([]);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [mobSidebarOpen, setMobSidebarOpen] = useState(false);
  const convEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (userHeader?.role) setCurrentRole(userHeader.role); }, [userHeader]);
  useEffect(() => { convEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [conversation]);

  const canStart = !!(selectedTopic || customTopic.trim());

  const handleStart = () => {
    const topicObj = SEMINAR_TOPICS.find(t => t.value === selectedTopic);
    const topic = customTopic.trim() || (topicObj ? topicObj.label : "");
    if (!topic) return;
    setActiveTopic(topic);
    setConversation([
      { sender:"ai", text:`Excellent choice! We'll focus on "${topic}". This is a fascinating subject with a lot to explore.` },
      { sender:"ai", text:`You can either watch me deliver a demo seminar, or step up and present yourself. Ask me for tips anytime below.` },
    ]);
    setSeminarState("topic_selected");
  };

  const handleSend = () => {
    if (!userInput.trim()) return;
    const q = userInput.trim();
    setConversation(prev => [...prev, { sender:"user", text:q }]); setUserInput("");
    setTimeout(() => {
      let r = "Great question! Can you elaborate so I can give you the best advice?";
      const low = q.toLowerCase();
      if (low.includes("structur")) r = "Use: Introduction (hook + overview) → Body (3 key points) → Conclusion (summary + CTA).";
      else if (low.includes("engag")) r = "Keep them engaged: rhetorical questions, relatable analogies, and varying your tone.";
      else if (low.includes("nerv")) r = "Nervousness is normal! Channel it as energy. Practise 3 times out loud.";
      else if (low.includes("start")||low.includes("open")) r = "Open strong: a surprising stat, a bold question, or a 15-second story.";
      else if (low.includes("conclu")) r = "End strong: summarise your 3 key points, then close with a memorable statement.";
      setConversation(prev => [...prev, { sender:"ai", text:r }]);
    }, 1100);
  };

  const startAIDemo = () => {
    setSeminarState("ai_demo");
    const lines = getDemoLines(activeTopic); let i = 0;
    const addNext = () => { if (i < lines.length) { setConversation(prev => [...prev, { sender:"ai", text:lines[i++] }]); setTimeout(addNext, 2400); } else setSeminarState("topic_selected"); };
    addNext();
  };

  const startStudentPractice = () => {
    setSeminarState("student_practice");
    setConversation(prev => [...prev, { sender:"ai", text:"The stage is yours! 🔴 Recording has started. Take a deep breath and begin whenever you're ready." }]);
  };

  const finishStudentPractice = () => {
    setSeminarState("evaluating");
    setConversation(prev => [...prev,
      { sender:"user", text:"[You delivered your presentation with confidence!]" },
      { sender:"ai", text:"Thank you! Let me analyse your performance and prepare your personalised feedback report…" },
    ]);
    setTimeout(() => {
      setFeedback({
        score: Math.floor(Math.random()*12)+86,
        clarity:    { grade:"A",  text:"Your points were exceptionally clear and well-articulated throughout." },
        engagement: { grade:"A−", text:"Great energy! Incorporate more deliberate pauses to let key ideas sink in." },
        structure:  { grade:"A+", text:"Textbook structure. The logical flow from introduction to conclusion was seamless." },
        overall: "Truly fantastic performance! You have a natural talent for this. Keep practising!",
      });
      setSeminarState("feedback");
    }, 4000);
  };

  const reset = () => {
    setSeminarState("idle"); setSelectedTopic(""); setCustomTopic(""); setActiveTopic(""); setConversation([]); setFeedback(null);
  };

  const sidebarProps = { selectedTopic, setSelectedTopic, customTopic, setCustomTopic, seminarState, activeTopic, canStart, onStart:handleStart, onWatchDemo:startAIDemo, onPresent:startStudentPractice, onReset:reset };

  const renderMain = () => {
    if (seminarState === "evaluating") {
      return (
        <div className="sem-empty-state">
          <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:2,ease:"linear"}}>
            <BrainCircuit style={{width:56,height:56,color:"#8b5cf6"}}/>
          </motion.div>
          <div className="sem-empty-title" style={{marginTop:16}}>Analysing your performance…</div>
          <Loader2 style={{width:18,height:18,color:"#94a3b8",marginTop:8,animation:"spin 1s linear infinite"}}/>
        </div>
      );
    }
    if (seminarState === "feedback" && feedback) {
      return (
        <div className="sem-feedback-wrap">
          <div className="sem-feedback-hero">
            <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",delay:.1}}>
              <Star style={{width:48,height:48,color:"#f59e0b",fill:"#f59e0b",margin:"0 auto 12px"}}/>
            </motion.div>
            <div className="sem-score-number">{feedback.score}<span style={{fontSize:24,color:"#94a3b8"}}>/100</span></div>
            <div className="sem-score-sub">Your Performance Score</div>
          </div>
          <p className="sem-feedback-quote">"{feedback.overall}"</p>
          <div className="sem-feedback-grid">
            {[{label:"Clarity",g:feedback.clarity},{label:"Engagement",g:feedback.engagement},{label:"Structure",g:feedback.structure}].map((item,i)=>(
              <motion.div key={item.label} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.2+i*.1}} className="sem-feedback-card">
                <div className="sem-feedback-card-head">
                  <div className="sem-feedback-card-label">{item.label}</div>
                  <div className="sem-grade-badge">{item.g.grade}</div>
                </div>
                <div className="sem-feedback-card-text">{item.g.text}</div>
              </motion.div>
            ))}
          </div>
          <button className="sem-again-btn" onClick={reset}><Sparkles style={{width:16,height:16,display:"inline",marginRight:8}}/>Practice Another Topic</button>
        </div>
      );
    }
    return (
      <>
        <div className="sem-chat-area">
          {conversation.length === 0 ? (
            <div className="sem-empty-state">
              <div className="sem-empty-icon"><School/></div>
              <div className="sem-empty-title">Welcome to Seminar Stage</div>
              <p className="sem-empty-sub">Select a topic from the panel, or write your own to begin your session.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {conversation.map((msg,idx) => (
                <motion.div key={idx} layout initial={{opacity:0,y:12,scale:.96}} animate={{opacity:1,y:0,scale:1}} transition={{type:"spring",stiffness:260,damping:22}}
                  className={`sem-msg-row${msg.sender==="user"?" user":""}`}>
                  <div className={`sem-msg-avatar ${msg.sender}`}>
                    {msg.sender==="ai" ? <Bot className="animate-pulse" style={{width:14,height:14}}/> : <School style={{width:14,height:14}}/>}
                  </div>
                  <div className={`sem-bubble ${msg.sender}`}>{msg.text}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={convEndRef}/>
        </div>

        {seminarState === "student_practice" && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="sem-recording-bar">
            <div className="sem-rec-dot"/>
            <span className="sem-rec-label">Recording in progress…</span>
            <button className="sem-rec-finish-btn" onClick={finishStudentPractice}>Finish Presentation</button>
          </motion.div>
        )}

        <div className="sem-input-row">
          <textarea value={userInput} onChange={e=>setUserInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();} }}
            placeholder="Ask the AI coach for presentation tips…"
            className="sem-textarea" rows={1}/>
          <button className="sem-send-btn" onClick={handleSend}><Send style={{width:15,height:15}}/></button>
        </div>
      </>
    );
  };

  return (
    <>
      <style>{css}</style>
      <div className="sem-root">
        <Navigation currentRole={currentRole as "student"|"teacher"} onRoleChange={setCurrentRole}/>

        {/* Hero */}
        {/* <div className="sem-hero">
          <div className="sem-hero-inner">
            <div className="sem-hero-left">
              <button className="sem-mob-menu-btn" onClick={()=>setMobSidebarOpen(true)}>
                <Menu/>Setup
              </button>
              <div className="sem-hero-icon"><School style={{width:22,height:22,color:"#fff"}}/></div>
              <div>
                <div className="sem-hero-title">Seminar Practice</div>
                <div className="sem-hero-sub">AI-powered presentation coaching</div>
              </div>
            </div>
            {activeTopic && <div className="sem-active-badge">{activeTopic}</div>}
          </div>
        </div> */}

        {/* Body */}
        <div className="sem-body">
          {/* Desktop sidebar */}
          <div className="sem-sidebar">
            <SidebarContent {...sidebarProps}/>
          </div>

          {/* Main */}
          <div className="sem-main">
            <div className="sem-main-card">
              <AnimatePresence mode="wait">
                <motion.div key={seminarState} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.22}}
                  style={{display:"flex",flexDirection:"column",flex:1,minHeight:0,overflow:"hidden"}}>
                  {renderMain()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile sidebar */}
        {mobSidebarOpen && <div className="sem-mob-overlay active" onClick={()=>setMobSidebarOpen(false)}/>}
        <div className={`sem-mob-sidebar${mobSidebarOpen?" open":""}`}>
          <div className="sem-mob-sidebar-head">
            <span className="sem-mob-sidebar-title">Seminar Setup</span>
            <button className="sem-mob-close-btn" onClick={()=>setMobSidebarOpen(false)}><X style={{width:14,height:14}}/></button>
          </div>
          <SidebarContent {...sidebarProps} onClose={()=>setMobSidebarOpen(false)}/>
        </div>

        <FloatingCoach/>
      </div>
    </>
  );
};

export default SeminarToolPage;